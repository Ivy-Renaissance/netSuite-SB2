/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/runtime', 'N/record', 'N/search', 'N/task', 'N/currency', '../common/SWC_CONFIG_DATA'], function (runtime, record, search, task, currencyRate, SWC_CONFIG_DATA) {
    var CONFIG = SWC_CONFIG_DATA.configData();
    var PARAM_WL_IDS = 'custscript_swc_finance_confirm_wl_ids';

    var FIRST_LEG_SUBLIST_ID = 'recmachcustrecord_swc_wl_first_leg_cost_id';
    var PLAN_DETAIL_SUBLIST_ID = 'recmachcustrecord_swc_wl_plan_order_id';
    var FIELD_FINANCE_CONFIRMED = 'custrecord_swc_finance_has_confirmed';
    var FIELD_FINANCE_REJECTED = 'custrecord_swc_finance_has_rejected';
    var FIELD_ACTUAL_PROCESSED = 'custrecord_swc_actual_cy';
    var FIELD_FIRST_LEG_ACTUAL_FEE = 'custrecord_swc_wl_flc_sj_fee';
    var FIELD_FIRST_LEG_ACTUAL_CURRENCY = 'custrecord_swc_wl_flc_sj_currency';
    var FIELD_FIRST_LEG_DIFF = 'custrecord_swc_wl_flc_sj_fee_cy';
    var FIELD_FIRST_LEG_BILL = 'custrecord_swc_wl_flc_sj_fee_bill';
    var FIELD_FIRST_LEG_FEE_TYPE_Z = 'custrecord_swc_flc_fee_type_z';
    var FIELD_FIRST_LEG_ALLOCATION_RULE = 'custrecord_swc_wl_flc_allocation_rules';
    var FIELD_FIRST_LEG_VENDOR = 'custrecord_swc_wl_flc_location';
    var FIELD_FIRST_LEG_YG_FEE = 'custrecord_swc_wl_flc_yg_fee';
    var FIELD_FIRST_LEG_YG_CURRENCY = 'custrecord_swc_wl_flc_yg_currency';
    var FIELD_WL_TERMS_OF_TRADE = 'custrecord_swc_wl_terms_of_trade';
    var FIELD_WL_TOTAL_VOLUME = 'custrecord_swc_wl_total_volume';
    var FIELD_WL_PO_ZT = 'custrecord_swc_wl_po_zt';
    var FIELD_WL_COUNTY_LIST = 'custrecord_swc_wl_county_lsit';

    function getInputData() {
        var wlIds = parseWlIds(runtime.getCurrentScript().getParameter({ name: PARAM_WL_IDS }));
        log.error('finance mr getInputData param', {
            rawParam: runtime.getCurrentScript().getParameter({ name: PARAM_WL_IDS }) || '',
            wlIds: wlIds
        });
        if (wlIds.length > 0) {
            return wlIds;
        }
        var searchIds = searchPendingWlIds();
        log.error('finance mr getInputData search result', {
            wlIds: searchIds
        });
        return searchIds;
    }

    function map(context) {
        var wlId = String(context.value || '');
        if (!wlId) return;

        try {
            var pendingLineIds = getPendingFinanceConfirmationLineIdsBySearch(wlId);
            log.error('finance mr map pending lines', {
                wlId: wlId,
                pendingLineIds: pendingLineIds
            });
            if (pendingLineIds.length === 0) {
                return;
            }

            processFinanceConfirmedFirstLegCostById(wlId, pendingLineIds);
            context.write({ key: 'processed', value: wlId });
        } catch (e) {
            log.error('finance mr map error', {
                wlId: wlId,
                error: e
            });
            throw e;
        }
    }

    function summarize(summary) {
        try {
            summary.mapSummary.errors.iterator().each(function (key, error) {
                return true;
            });
        } catch (e) { }
    }

    function parseWlIds(raw) {
        if (!raw) return [];
        return uniq(String(raw).split(',').map(function (id) {
            return String(id || '').trim();
        }).filter(Boolean));
    }

    function searchPendingWlIds() {
        var parentMap = {};
        var lineSearch = search.create({
            type: 'customrecord_swc_wl_first_leg_cost',
            filters: [
                [FIELD_FINANCE_CONFIRMED, 'is', 'T'],
                'AND',
                [FIELD_ACTUAL_PROCESSED, 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'custrecord_swc_wl_first_leg_cost_id' }),
                search.createColumn({ name: FIELD_FINANCE_REJECTED }),
                search.createColumn({ name: FIELD_FIRST_LEG_ACTUAL_FEE })
            ]
        });
        var rs = getAllResults(lineSearch);
        for (var i = 0; i < rs.length; i++) {
            var wlId = rs[i].getValue({ name: 'custrecord_swc_wl_first_leg_cost_id' });
            var rejected = rs[i].getValue({ name: FIELD_FINANCE_REJECTED });
            var actualRaw = rs[i].getValue({ name: FIELD_FIRST_LEG_ACTUAL_FEE });
            log.error('finance mr search candidate', {
                wlId: wlId || '',
                rejected: rejected || '',
                actualRaw: actualRaw || ''
            });

            if (!wlId || isTruthy(rejected)) continue;
            if (actualRaw === null || actualRaw === undefined || String(actualRaw) === '') continue;

            var actualFee = Number(actualRaw);
            if (!isFinite(actualFee) || actualFee < 0) continue;

            parentMap[String(wlId)] = true;
        }
        return Object.keys(parentMap);
    }

    function getPendingFinanceConfirmationLineIdsBySearch(wlPlanOrderId) {
        var pending = [];
        if (!wlPlanOrderId) return pending;

        var lineSearch = search.create({
            type: 'customrecord_swc_wl_first_leg_cost',
            filters: [
                ['custrecord_swc_wl_first_leg_cost_id', 'anyof', String(wlPlanOrderId)],
                'AND',
                [FIELD_FINANCE_CONFIRMED, 'is', 'T'],
                'AND',
                [FIELD_ACTUAL_PROCESSED, 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: FIELD_FINANCE_REJECTED }),
                search.createColumn({ name: FIELD_FIRST_LEG_ACTUAL_FEE })
            ]
        });

        var results = getAllResults(lineSearch);
        for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var lineId = result.getValue({ name: 'internalid' });
            var rejected = result.getValue({ name: FIELD_FINANCE_REJECTED });
            var actualRaw = result.getValue({ name: FIELD_FIRST_LEG_ACTUAL_FEE });
            log.error('finance mr line candidate', {
                wlId: String(wlPlanOrderId || ''),
                lineId: lineId || '',
                rejected: rejected || '',
                actualRaw: actualRaw || ''
            });

            if (!lineId || isTruthy(rejected)) continue;
            if (actualRaw === null || actualRaw === undefined || String(actualRaw) === '') continue;

            var actualFee = Number(actualRaw);
            if (!isFinite(actualFee) || actualFee < 0) continue;

            pending.push(String(lineId));
        }

        return pending;
    }

    function processFinanceConfirmedFirstLegCostById(wlPlanOrderId, pendingLineIds) {
        var pendingLineIdMap = {};
        for (var i = 0; i < pendingLineIds.length; i++) {
            pendingLineIdMap[String(pendingLineIds[i] || '')] = true;
        }

        var rec = record.load({
            type: 'customrecord_swc_wl_plan_order',
            id: wlPlanOrderId,
            isDynamic: false
        });

        var termsOfTrade = rec.getValue({ fieldId: FIELD_WL_TERMS_OF_TRADE });
        var totalVolume = toNumber(rec.getValue({ fieldId: FIELD_WL_TOTAL_VOLUME }));
        var domesticSub = rec.getValue({ fieldId: FIELD_WL_PO_ZT }) || null;
        var destinationCountry = String(rec.getValue({ fieldId: FIELD_WL_COUNTY_LIST }) || '');

        var feeItemByName = {
            '1': 3111, '2': 3112, '3': 3113, '4': 3114, '5': 3115,
            '6': 3116, '7': 3117, '8': 3118, '9': 3119, '101': 3447
        };

        var actualFeeCfg = {
            '1': { amtField: 'custrecord_swc_wl_d_sj_trailer_fee', curField: 'custrecord_swc_wl_d_sj_trailer_fee_c' },
            '2': { amtField: 'custrecord_swc_wl_d_sj_cda_fee', curField: 'custrecord_swc_wl_d_sj_cda_fee_c' },
            '3': { amtField: 'custrecord_swc_wl_d_sj_ffc', curField: 'custrecord_swc_wl_d_sj_ffc_c' },
            '4': { amtField: 'custrecord_swc_wl_d_sj_bxf_fee', curField: 'custrecord_swc_wl_d_sj_bxf_fee_c' },
            '5': { amtField: 'custrecord_swc_actual_first_leg_cost', curField: 'custrecord_swc_actual_firs_leg_cost' },
            '6': { amtField: 'custrecord_swc_wl_d_sj_qgf_fee', curField: 'custrecord_swc_wl_d_sj_qgf_fee_c' },
            '7': { amtField: 'custrecord_swc_wl_d_sj_jkgs_fee', curField: 'custrecord_swc_wl_d_sj_jkgs_fee_c' },
            '8': { amtField: 'custrecord_swc_wl_d_sj_hdf_fee', curField: 'custrecord_swc_wl_d_sj_hdf_fee_c' },
            '9': { amtField: 'custrecord_swc_wl_d_sj_tcf_fee', curField: 'custrecord_swc_wl_d_sj_tcf_fee_c' },
            '101': { amtField: 'custrecord_swc_wl_d_sj_rkcz_fee', curField: 'custrecord_swc_wl_d_sj_rkcz_fee_c' }
        };

        var cdMap = getFinanceBearerMapByTerms(termsOfTrade);
        var detailAmountContext = buildFinanceDetailAmountContext(rec);
        var pendingDocGroups = {};
        var allFeePoolMap = {};
        var legLineCount = rec.getLineCount({ sublistId: FIRST_LEG_SUBLIST_ID }) || 0;
        var diffTranDate = new Date();
        var diffRateCache = {};
        var diffCurrencyIdCache = {};

        for (var line = 0; line < legLineCount; line++) {
            var lineId = String(rec.getSublistValue({ sublistId: FIRST_LEG_SUBLIST_ID, fieldId: 'id', line: line }) || '');
            var confirmed = isTruthy(rec.getSublistValue({ sublistId: FIRST_LEG_SUBLIST_ID, fieldId: FIELD_FINANCE_CONFIRMED, line: line }));
            var rejected = isTruthy(rec.getSublistValue({ sublistId: FIRST_LEG_SUBLIST_ID, fieldId: FIELD_FINANCE_REJECTED, line: line }));
            var actualRaw = rec.getSublistValue({ sublistId: FIRST_LEG_SUBLIST_ID, fieldId: FIELD_FIRST_LEG_ACTUAL_FEE, line: line });
            if (!confirmed || rejected || actualRaw === null || actualRaw === '' || actualRaw === undefined) continue;

            var actualFee = Number(actualRaw);
            if (!isFinite(actualFee) || actualFee < 0) continue;

            var feeTypeZ = String(rec.getSublistValue({ sublistId: FIRST_LEG_SUBLIST_ID, fieldId: FIELD_FIRST_LEG_FEE_TYPE_Z, line: line }) || '');
            var allocationRule = String(rec.getSublistValue({ sublistId: FIRST_LEG_SUBLIST_ID, fieldId: FIELD_FIRST_LEG_ALLOCATION_RULE, line: line }) || '');
            var actualCurrency = String(rec.getSublistValue({ sublistId: FIRST_LEG_SUBLIST_ID, fieldId: FIELD_FIRST_LEG_ACTUAL_CURRENCY, line: line }) || '');
            var actualCurrencyText = rec.getSublistText({ sublistId: FIRST_LEG_SUBLIST_ID, fieldId: FIELD_FIRST_LEG_ACTUAL_CURRENCY, line: line }) || '';
            var estimateFee = toNumber(rec.getSublistValue({ sublistId: FIRST_LEG_SUBLIST_ID, fieldId: FIELD_FIRST_LEG_YG_FEE, line: line }));
            var estimateCurrency = String(rec.getSublistValue({ sublistId: FIRST_LEG_SUBLIST_ID, fieldId: FIELD_FIRST_LEG_YG_CURRENCY, line: line }) || '');
            var vendorId = rec.getSublistValue({ sublistId: FIRST_LEG_SUBLIST_ID, fieldId: FIELD_FIRST_LEG_VENDOR, line: line }) || '';
            if (!vendorId) continue;

            var diffContext = getConvertedFirstLegDiffAmount(estimateFee, estimateCurrency, actualFee, actualCurrency, actualCurrencyText, diffTranDate, diffRateCache, diffCurrencyIdCache);
            var diffAmt = diffContext.diffAmountEstimateMinusActual;

            rec.setSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FIRST_LEG_DIFF,
                line: line,
                value: diffAmt
            });

            if (actualFeeCfg[feeTypeZ] && (allocationRule === '1' || allocationRule === '2')) {
                var poolKey = feeTypeZ + '_' + allocationRule;
                if (!allFeePoolMap[poolKey]) {
                    allFeePoolMap[poolKey] = {
                        feeTypeZ: feeTypeZ,
                        allocationRule: Number(allocationRule),
                        sumAmt: 0,
                        currency: '',
                        allocatedSum: 0
                    };
                }
                allFeePoolMap[poolKey].sumAmt = round2(allFeePoolMap[poolKey].sumAmt + actualFee);
                if (actualCurrency) {
                    if (allFeePoolMap[poolKey].currency && allFeePoolMap[poolKey].currency !== actualCurrency) {
                        throw new Error('同一费用中类存在多个实际费用币种，无法自动分摊。费用中类:' + feeTypeZ);
                    }
                    allFeePoolMap[poolKey].currency = actualCurrency;
                }
            }

            if (!pendingLineIdMap[lineId]) continue;
            if (!feeItemByName[feeTypeZ] || diffAmt === 0) continue;

            var bearer = String(cdMap[feeTypeZ] || '');
            var orderType2 = (feeTypeZ === '101') ? 8 : 10;
            var entries = buildFinanceDocEntries({
                diffAmt: diffAmt,
                bearer: bearer,
                vendorId: vendorId,
                orderType2: orderType2,
                itemId: feeItemByName[feeTypeZ],
                feeTypeZ: feeTypeZ,
                currencyId: diffContext.currencyId,
                domesticSub: domesticSub,
                destinationCountry: destinationCountry,
                subVolMap: detailAmountContext.subVolMap,
                volTotal: detailAmountContext.volTotal
            });
            for (var e = 0; e < entries.length; e++) {
                var entry = entries[e];
                if (!pendingDocGroups[entry.groupKey]) {
                    pendingDocGroups[entry.groupKey] = {
                        vendorId: entry.vendorId,
                        subsidiaryId: entry.subsidiaryId,
                        orderType2: entry.orderType2,
                        currencyId: entry.currencyId,
                        tranDate: diffTranDate,
                        VendorBill: [],
                        VendorCredit: []
                    };
                }
                if (entry.docType === 'bill') {
                    pendingDocGroups[entry.groupKey].VendorBill.push({ item: entry.itemId, amount: entry.amount, lineId: line });
                } else if (entry.docType === 'credit') {
                    pendingDocGroups[entry.groupKey].VendorCredit.push({ item: entry.itemId, amount: entry.amount, lineId: line });
                }
            }
        }

        log.error('finance mr process summary', {
            wlId: String(wlPlanOrderId || ''),
            pendingLineIds: pendingLineIds,
            pendingDocGroupKeys: Object.keys(pendingDocGroups || {}),
            feePoolKeys: Object.keys(allFeePoolMap || {})
        });

        var pendingGroupKeys = Object.keys(pendingDocGroups);
        for (var g = 0; g < pendingGroupKeys.length; g++) {
            var group = pendingDocGroups[pendingGroupKeys[g]];
            log.error('finance mr create group', {
                wlId: String(wlPlanOrderId || ''),
                groupKey: pendingGroupKeys[g],
                vendorId: String(group.vendorId || ''),
                subsidiaryId: String(group.subsidiaryId || ''),
                orderType2: String(group.orderType2 || ''),
                vendorBillCount: (group.VendorBill || []).length,
                vendorCreditCount: (group.VendorCredit || []).length
            });
            if (group.VendorBill.length > 0) {
                var vbId = createFinanceVendorBill(group.vendorId, group.VendorBill, group.subsidiaryId, group.orderType2, group.currencyId, group.tranDate, wlPlanOrderId);
                if (vbId) {
                    log.error('finance mr vendor bill created', {
                        wlId: String(wlPlanOrderId || ''),
                        groupKey: pendingGroupKeys[g],
                        billId: String(vbId || '')
                    });
                    writeBackFinanceTranToLines(rec, vbId, group.VendorBill);
                }
            }
            if (group.VendorCredit.length > 0) {
                var vcId = createFinanceVendorCredit(group.vendorId, group.VendorCredit, group.subsidiaryId, group.orderType2, group.currencyId, group.tranDate, wlPlanOrderId);
                if (vcId) {
                    log.error('finance mr vendor credit created', {
                        wlId: String(wlPlanOrderId || ''),
                        groupKey: pendingGroupKeys[g],
                        creditId: String(vcId || '')
                    });
                    writeBackFinanceTranToLines(rec, vcId, group.VendorCredit);
                }
            }
        }

        applyFinanceActualAllocation(rec, allFeePoolMap, actualFeeCfg, detailAmountContext, totalVolume);
        markFinanceLinesProcessed(rec, pendingLineIdMap);
        rec.save({ ignoreMandatoryFields: true });
    }

    function markFinanceLinesProcessed(rec, pendingLineIdMap) {
        var legLineCount = rec.getLineCount({ sublistId: FIRST_LEG_SUBLIST_ID }) || 0;
        for (var line = 0; line < legLineCount; line++) {
            var lineId = String(rec.getSublistValue({ sublistId: FIRST_LEG_SUBLIST_ID, fieldId: 'id', line: line }) || '');
            if (!lineId || !pendingLineIdMap[lineId]) continue;
            rec.setSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_ACTUAL_PROCESSED,
                line: line,
                value: true
            });
        }
    }

    function buildFinanceDocEntries(options) {
        var entries = [];
        var diffAmt = round2(options.diffAmt);
        if (!diffAmt) return entries;

        var vendorId = String(options.vendorId || '');
        var orderType2 = options.orderType2;
        var itemId = options.itemId;
        var feeTypeZ = String(options.feeTypeZ || '');
        var currencyId = String(options.currencyId || '');
        var bearer = String(options.bearer || '');
        var domesticSub = options.domesticSub;
        var destinationCountry = String(options.destinationCountry || '');
        var subVolMap = options.subVolMap || {};
        var volTotal = toNumber(options.volTotal);
        var docType = diffAmt < 0 ? 'bill' : 'credit';
        var absAmt = Math.abs(diffAmt);

        if (bearer === '3') {
            var domesticKey = String(domesticSub || '__NO_SUB__');
            entries.push({
                groupKey: vendorId + '|' + domesticKey + '|' + String(orderType2 || '') + '|' + feeTypeZ + '|' + currencyId,
                vendorId: vendorId,
                subsidiaryId: domesticSub ? Number(domesticSub) : null,
                orderType2: orderType2,
                currencyId: currencyId,
                itemId: itemId,
                amount: absAmt,
                docType: docType
            });
            return entries;
        }

        if (bearer === '2' && destinationCountry === '230') {
            entries.push({
                groupKey: vendorId + '|77|' + String(orderType2 || '') + '|' + feeTypeZ + '|' + currencyId,
                vendorId: vendorId,
                subsidiaryId: 77,
                orderType2: orderType2,
                currencyId: currencyId,
                itemId: itemId,
                amount: absAmt,
                docType: docType
            });
            return entries;
        }

        var subKeys = Object.keys(subVolMap || {});
        if (bearer === '2' && subKeys.length > 0 && volTotal > 0) {
            subKeys.sort(function (a, b) { return Number(a) - Number(b); });
            var allocated = 0;
            for (var i = 0; i < subKeys.length; i++) {
                var subIdKey = subKeys[i];
                var isLast = (i === subKeys.length - 1);
                var ratio = toNumber(subVolMap[subIdKey]) / volTotal;
                var part = isLast ? round2(absAmt - allocated) : round2(absAmt * ratio);
                if (!isLast) {
                    allocated = round2(allocated + part);
                }
                if (part === 0) continue;
                entries.push({
                    groupKey: vendorId + '|' + String(subIdKey || '') + '|' + String(orderType2 || '') + '|' + feeTypeZ + '|' + currencyId,
                    vendorId: vendorId,
                    subsidiaryId: Number(subIdKey) || null,
                    orderType2: orderType2,
                    currencyId: currencyId,
                    itemId: itemId,
                    amount: part,
                    docType: docType
                });
            }
            return entries;
        }

        entries.push({
            groupKey: vendorId + '|__NO_SUB__|' + String(orderType2 || '') + '|' + feeTypeZ + '|' + currencyId,
            vendorId: vendorId,
            subsidiaryId: null,
            orderType2: orderType2,
            currencyId: currencyId,
            itemId: itemId,
            amount: absAmt,
            docType: docType
        });
        return entries;
    }

    function applyFinanceActualAllocation(rec, feePoolMap, actualFeeCfg, detailAmountContext, totalVolume) {
        var planLineCount = rec.getLineCount({ sublistId: PLAN_DETAIL_SUBLIST_ID }) || 0;
        if (planLineCount <= 0) {
            throw new Error('实际费用分摊失败：没有物流发运明细行');
        }

        var hasVolumeRule = false;
        var hasAmountRule = false;
        var poolKeys = Object.keys(feePoolMap || {});
        for (var p = 0; p < poolKeys.length; p++) {
            var pool = feePoolMap[poolKeys[p]];
            if (!pool || !pool.sumAmt) continue;
            if (pool.allocationRule === 1) hasVolumeRule = true;
            if (pool.allocationRule === 2) hasAmountRule = true;
        }

        if (hasVolumeRule && totalVolume <= 0) {
            throw new Error('实际费用分摊失败：存在按体积分摊的数据，但总体积为0或为空');
        }
        if (hasAmountRule && detailAmountContext.totalAmount <= 0) {
            throw new Error('实际费用分摊失败：存在按金额分摊的数据，但总金额为0或为空');
        }

        clearFinanceActualDetailFields(rec, actualFeeCfg, planLineCount);

        for (var line = 0; line < planLineCount; line++) {
            var detailVolume = toNumber(rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_total_volume', line: line }));
            var detailAmount = toNumber(detailAmountContext.detailAmountMap[line]);
            var isLast = (line === planLineCount - 1);

            for (var k = 0; k < poolKeys.length; k++) {
                var poolKey = poolKeys[k];
                var feePool = feePoolMap[poolKey];
                if (!feePool || !feePool.sumAmt) continue;

                var cfg = actualFeeCfg[String(feePool.feeTypeZ || '')];
                if (!cfg) continue;

                var ratio = 0;
                if (feePool.allocationRule === 1) {
                    ratio = totalVolume ? (detailVolume / totalVolume) : 0;
                } else if (feePool.allocationRule === 2) {
                    ratio = detailAmountContext.totalAmount ? (detailAmount / detailAmountContext.totalAmount) : 0;
                }

                if (feePool.currency) {
                    rec.setSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: cfg.curField, line: line, value: feePool.currency });
                }

                var amountToSet = 0;
                if (isLast) {
                    amountToSet = round2(feePool.sumAmt - feePool.allocatedSum);
                } else {
                    amountToSet = round2(feePool.sumAmt * ratio);
                    feePool.allocatedSum = round2(feePool.allocatedSum + amountToSet);
                }

                var oldAmt = toNumber(rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: cfg.amtField, line: line }));
                rec.setSublistValue({
                    sublistId: PLAN_DETAIL_SUBLIST_ID,
                    fieldId: cfg.amtField,
                    line: line,
                    value: round2(oldAmt + amountToSet)
                });
            }
        }
    }

    function clearFinanceActualDetailFields(rec, actualFeeCfg, planLineCount) {
        var feeKeys = Object.keys(actualFeeCfg || {});
        for (var line = 0; line < planLineCount; line++) {
            for (var i = 0; i < feeKeys.length; i++) {
                var cfg = actualFeeCfg[feeKeys[i]];
                rec.setSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: cfg.amtField, line: line, value: 0 });
                try {
                    rec.setSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: cfg.curField, line: line, value: '' });
                } catch (e) { }
            }
        }
    }

    function buildFinanceDetailAmountContext(rec) {
        var detailAmountMap = {};
        var totalAmount = 0;
        var volTotal = 0;
        var subVolMap = {};
        var poAmountIndexCache = {};
        var lineCount = rec.getLineCount({ sublistId: PLAN_DETAIL_SUBLIST_ID }) || 0;

        for (var line = 0; line < lineCount; line++) {
            var shopId = rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_customer', line: line });
            var lineVolume = toNumber(rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_total_volume', line: line }));
            var subId = getCustomerSubsidiary(shopId);
            if (subId && lineVolume > 0) {
                volTotal = round2(volTotal + lineVolume);
                subVolMap[String(subId)] = round2(toNumber(subVolMap[String(subId)]) + lineVolume);
            }

            var poId = rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_po_num', line: line }) || '';
            var superiorQty = toNumber(rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: line }));
            var goodQty = toNumber(rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: line }));
            var grade = superiorQty > 0 ? 1 : (goodQty > 0 ? 2 : '');
            if (!poId || !grade) {
                detailAmountMap[line] = 0;
                continue;
            }

            var amountKey = buildFinancePoAmountKey(
                rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_item', line: line }),
                rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_country', line: line }),
                rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_location_type', line: line }),
                rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_customer', line: line }),
                rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_region', line: line })
            ) + '_' + String(grade);

            if (!poAmountIndexCache[poId]) {
                var poRec = record.load({ type: record.Type.PURCHASE_ORDER, id: poId, isDynamic: false });
                poAmountIndexCache[poId] = buildFinancePoAmountIndex(poRec);
            }

            var poLineAmount = toNumber(poAmountIndexCache[poId][amountKey]);
            detailAmountMap[line] = poLineAmount;
            totalAmount = round2(totalAmount + poLineAmount);
        }

        return {
            detailAmountMap: detailAmountMap,
            totalAmount: totalAmount,
            volTotal: volTotal,
            subVolMap: subVolMap
        };
    }

    function buildFinancePoAmountKey(itemId, country, locationType, customer, region) {
        return [String(itemId || ''), String(country || ''), String(locationType || ''), String(customer || ''), String(region || '')].join('_');
    }

    function buildFinancePoAmountIndex(poRec) {
        var index = {};
        var poLineCount = poRec.getLineCount({ sublistId: 'item' }) || 0;
        for (var i = 0; i < poLineCount; i++) {
            var grade = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_grade', line: i });
            if (grade != 1 && grade != 2) continue;

            var key = buildFinancePoAmountKey(
                poRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }),
                poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_country_code', line: i }),
                poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_loc_type', line: i }),
                poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_store', line: i }),
                poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_us_districts', line: i })
            );
            index[key + '_' + String(grade)] = toNumber(poRec.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_swc_including_tax_amt',
                line: i
            }));
        }
        return index;
    }

    function getFinanceBearerMapByTerms(termsOfTrade) {
        var totFieldId = '';
        if (termsOfTrade == 1) totFieldId = 'custrecord_swc_cost_exw';
        else if (termsOfTrade == 2) totFieldId = 'custrecord_swc_cost_cn_fob';
        else if (termsOfTrade == 3) totFieldId = 'custrecord_swc_cost_ddp';
        else if (termsOfTrade == 4) totFieldId = 'custrecord_swc_cost_ddu';
        else if (termsOfTrade == 5) totFieldId = 'custrecord_swc_cost_hw_fob';

        var cdMap = {};
        if (!totFieldId) return cdMap;

        var ruleSearch = search.create({
            type: 'customrecord_swc_rule_mapping_table',
            filters: [],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'formulatext', formula: '{' + totFieldId + '.id}' })
            ]
        });
        var ruleRows = getAllResults(ruleSearch);
        for (var i = 0; i < ruleRows.length; i++) {
            var cm = ruleRows[i].getValue({ name: 'internalid' });
            var gy = ruleRows[i].getValue({ name: 'formulatext', formula: '{' + totFieldId + '.id}' });
            if (cm) cdMap[String(cm)] = String(gy || '');
        }
        return cdMap;
    }

    function createFinanceVendorBill(vendorId, data, subsidiaryId, orderType2, currencyId, tranDate, wlPlanOrderId) {
        var vendorbillRecord = record.create({ type: 'vendorbill', isDynamic: true });
        vendorbillRecord.setValue({ fieldId: 'entity', value: vendorId });
        applyVendorPaymentTerms(vendorbillRecord, vendorId);
        if (subsidiaryId && vendorbillRecord.getField({ fieldId: 'subsidiary' })) {
            vendorbillRecord.setValue({ fieldId: 'subsidiary', value: subsidiaryId });
        }
        if (orderType2) {
            vendorbillRecord.setValue({ fieldId: 'custbody_swc_order_type2', value: orderType2 });
        }
        if (tranDate) {
            vendorbillRecord.setValue({ fieldId: 'trandate', value: tranDate });
        }
        if (currencyId) {
            vendorbillRecord.setValue({ fieldId: 'currency', value: currencyId });
        }
        for (var i = 0; i < data.length; i++) {
            var linejson = data[i];
            var amt = toNumber(linejson.amount);
            if (!linejson.item || amt <= 0) continue;
            vendorbillRecord.selectNewLine({ sublistId: 'item' });
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: linejson.item });
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: amt });
            vendorbillRecord.commitLine({ sublistId: 'item' });
        }
        return vendorbillRecord.save({ ignoreMandatoryFields: false });
    }

    function createFinanceVendorCredit(vendorId, data, subsidiaryId, orderType2, currencyId, tranDate, wlPlanOrderId) {
        var vendorcreditRecord = record.create({ type: 'vendorcredit', isDynamic: true });
        vendorcreditRecord.setValue({ fieldId: 'entity', value: vendorId });
        applyVendorPaymentTerms(vendorcreditRecord, vendorId);
        if (subsidiaryId && vendorcreditRecord.getField({ fieldId: 'subsidiary' })) {
            vendorcreditRecord.setValue({ fieldId: 'subsidiary', value: subsidiaryId });
        }
        if (orderType2) {
            vendorcreditRecord.setValue({ fieldId: 'custbody_swc_order_type2', value: orderType2 });
        }
        if (tranDate) {
            vendorcreditRecord.setValue({ fieldId: 'trandate', value: tranDate });
        }
        if (currencyId) {
            vendorcreditRecord.setValue({ fieldId: 'currency', value: currencyId });
        }
        for (var i = 0; i < data.length; i++) {
            var linejson = data[i];
            var amt = Math.abs(toNumber(linejson.amount));
            if (!linejson.item || amt <= 0) continue;
            vendorcreditRecord.selectNewLine({ sublistId: 'item' });
            vendorcreditRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: linejson.item });
            vendorcreditRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
            vendorcreditRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: amt });
            vendorcreditRecord.commitLine({ sublistId: 'item' });
        }
        return vendorcreditRecord.save({ ignoreMandatoryFields: false });
    }

    function writeBackFinanceTranToLines(rec, tranId, lines) {
        for (var i = 0; i < (lines || []).length; i++) {
            var lineId = Number(lines[i].lineId);
            if (!isFinite(lineId)) continue;
            appendFinanceSublistMultiSelect(rec, FIRST_LEG_SUBLIST_ID, FIELD_FIRST_LEG_BILL, lineId, [tranId]);
        }
    }

    function appendFinanceSublistMultiSelect(rec, sublistId, fieldId, line, addIds) {
        var currentRaw = rec.getSublistValue({ sublistId: sublistId, fieldId: fieldId, line: line });
        var current = normalizeFinanceMultiSelectValue(currentRaw);
        var add = (addIds || []).map(function (x) { return String(x || '').trim(); }).filter(Boolean);
        var merged = uniq(current.concat(add));
        if (merged.length === 0) return;
        rec.setSublistValue({ sublistId: sublistId, fieldId: fieldId, line: line, value: merged });
    }

    function normalizeFinanceMultiSelectValue(v) {
        if (v === null || v === undefined || v === '') return [];
        if (Array.isArray(v)) {
            return v.map(function (x) { return String(x || '').trim(); }).filter(Boolean);
        }
        if (typeof v === 'string') {
            if (v.indexOf('\u0005') !== -1) {
                return v.split('\u0005').map(function (x) { return String(x || '').trim(); }).filter(Boolean);
            }
            if (v.indexOf(',') !== -1) {
                return v.split(',').map(function (x) { return String(x || '').trim(); }).filter(Boolean);
            }
            return [v.trim()].filter(Boolean);
        }
        return [String(v)].filter(Boolean);
    }

    function getCustomerSubsidiary(customerId) {
        if (!customerId) return '';
        var customerInfo = search.lookupFields({
            type: 'customer',
            id: customerId,
            columns: ['subsidiary']
        }) || {};
        var arr = customerInfo.subsidiary || [];
        return (arr[0] && arr[0].value) ? arr[0].value : '';
    }

    function getFirstVendorPaymentTerms(vendorId) {
        if (!vendorId) return '';
        var vendorInfo = search.lookupFields({
            type: search.Type.VENDOR,
            id: vendorId,
            columns: ['custentity_swc_payment_terms']
        });
        var termsValue = vendorInfo && vendorInfo.custentity_swc_payment_terms;
        if (!termsValue) return '';
        if (Array.isArray(termsValue) && termsValue.length > 0) {
            return termsValue[0] && termsValue[0].value ? termsValue[0].value : '';
        }
        if (typeof termsValue === 'string') {
            var ids = termsValue.split(',').map(function (id) {
                return String(id || '').trim();
            }).filter(Boolean);
            return ids.length > 0 ? ids[0] : '';
        }
        return '';
    }

    function applyVendorPaymentTerms(tranRec, vendorId) {
        if (!tranRec || !vendorId) return;
        if (!tranRec.getField({ fieldId: 'custbody_swc_vendor_payment_terms' })) return;
        var paymentTerms = getFirstVendorPaymentTerms(vendorId);
        if (paymentTerms) {
            tranRec.setValue({ fieldId: 'custbody_swc_vendor_payment_terms', value: paymentTerms });
        }
    }

    function getAllResults(searchObj) {
        var out = [];
        var pagedData = searchObj.runPaged({ pageSize: 1000 });
        for (var p = 0; p < pagedData.pageRanges.length; p++) {
            var page = pagedData.fetch({ index: pagedData.pageRanges[p].index });
            for (var i = 0; i < page.data.length; i++) {
                out.push(page.data[i]);
            }
        }
        return out;
    }

    function toNumber(value) {
        if (value === null || value === undefined || value === '') return 0;
        var n = Number(value);
        return isFinite(n) ? n : 0;
    }

    function round2(value) {
        return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
    }

    function getCurrencySearchKeywords(currencyCode) {
        var normalizedCode = String(currencyCode || '').toUpperCase();
        if (normalizedCode === String(CONFIG.CURRENCY_CODE_CNY || 'CNY').toUpperCase()) {
            return ['CNY', 'RMB', '人民币'];
        }
        if (normalizedCode === String(CONFIG.CURRENCY_CODE_USD || 'USD').toUpperCase()) {
            return ['USD', '美元'];
        }
        return [normalizedCode].filter(Boolean);
    }

    function resolveCurrencyIdByCode(currencyCode, cache) {
        var normalizedCode = String(currencyCode || '').toUpperCase();
        if (!normalizedCode) return '';

        cache = cache || {};
        if (cache.hasOwnProperty(normalizedCode)) {
            return cache[normalizedCode];
        }

        var keywordList = getCurrencySearchKeywords(normalizedCode);
        var orFilters = [];
        for (var i = 0; i < keywordList.length; i++) {
            var keyword = String(keywordList[i] || '').trim();
            if (!keyword) continue;
            if (orFilters.length > 0) orFilters.push('OR');
            orFilters.push(['symbol', 'is', keyword]);
            orFilters.push('OR');
            orFilters.push(['name', 'contains', keyword]);
        }

        if (!orFilters.length) {
            cache[normalizedCode] = '';
            return '';
        }

        var currencySearch = search.create({
            type: 'currency',
            filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                orFilters
            ],
            columns: [
                search.createColumn({ name: 'internalid', sort: search.Sort.ASC })
            ]
        });

        var currencyId = '';
        currencySearch.run().each(function (result) {
            currencyId = result.getValue({ name: 'internalid' }) || '';
            return false;
        });

        cache[normalizedCode] = currencyId;
        return currencyId;
    }

    function getCurrencyCodeByValueOrText(currencyValue, currencyText, currencyIdCache) {
        var text = String(currencyText || '').toUpperCase();
        if (text.indexOf('CNY') !== -1 || text.indexOf('RMB') !== -1 || text.indexOf('人民币') !== -1) {
            return String(CONFIG.CURRENCY_CODE_CNY || 'CNY').toUpperCase();
        }
        if (text.indexOf('USD') !== -1 || text.indexOf('美元') !== -1) {
            return String(CONFIG.CURRENCY_CODE_USD || 'USD').toUpperCase();
        }

        var value = String(currencyValue || '');
        if (value) {
            var cnyId = String(resolveCurrencyIdByCode(CONFIG.CURRENCY_CODE_CNY || 'CNY', currencyIdCache) || '');
            if (cnyId && value === cnyId) {
                return String(CONFIG.CURRENCY_CODE_CNY || 'CNY').toUpperCase();
            }
            var usdId = String(resolveCurrencyIdByCode(CONFIG.CURRENCY_CODE_USD || 'USD', currencyIdCache) || '');
            if (usdId && value === usdId) {
                return String(CONFIG.CURRENCY_CODE_USD || 'USD').toUpperCase();
            }
        }

        return '';
    }

    function getFirstLegDiffCurrencyContext(actualCurrencyValue, actualCurrencyText, currencyIdCache) {
        var usdCode = String(CONFIG.CURRENCY_CODE_USD || 'USD').toUpperCase();
        var cnyCode = String(CONFIG.CURRENCY_CODE_CNY || 'CNY').toUpperCase();
        var actualCode = getCurrencyCodeByValueOrText(actualCurrencyValue, actualCurrencyText, currencyIdCache);
        var targetCode = actualCode === cnyCode ? cnyCode : usdCode;

        return {
            actualCode: actualCode,
            targetCode: targetCode,
            targetCurrencyId: resolveCurrencyIdByCode(targetCode, currencyIdCache)
        };
    }

    function convertAmountToTargetCurrency(amount, sourceCurrencyId, targetCurrencyId, exchangeDate, rateCache) {
        amount = toNumber(amount);
        sourceCurrencyId = String(sourceCurrencyId || '');
        targetCurrencyId = String(targetCurrencyId || '');

        if (!amount || !sourceCurrencyId || !targetCurrencyId || sourceCurrencyId === targetCurrencyId) {
            return round2(amount);
        }

        rateCache = rateCache || {};
        var dateKey = '';
        if (exchangeDate instanceof Date && !isNaN(exchangeDate.getTime())) {
            dateKey = exchangeDate.getFullYear() + '-'
                + ('0' + (exchangeDate.getMonth() + 1)).slice(-2) + '-'
                + ('0' + exchangeDate.getDate()).slice(-2);
        }

        var cacheKey = sourceCurrencyId + '_' + targetCurrencyId + '_' + dateKey;
        var rate = rateCache[cacheKey];
        if (!rate) {
            rate = currencyRate.exchangeRate({
                source: Number(sourceCurrencyId),
                target: Number(targetCurrencyId),
                date: exchangeDate
            });
            rate = toNumber(rate);
            if (!rate) {
                throw new Error('未取到汇率：' + sourceCurrencyId + ' -> ' + targetCurrencyId);
            }
            rateCache[cacheKey] = rate;
        }

        return round2(amount * rate);
    }

    function getConvertedFirstLegDiffAmount(estimateAmount, estimateCurrencyId, actualAmount, actualCurrencyId, actualCurrencyText, tranDate, rateCache, currencyIdCache) {
        var diffCurrencyContext = getFirstLegDiffCurrencyContext(actualCurrencyId, actualCurrencyText, currencyIdCache);
        var targetCurrencyId = String(diffCurrencyContext.targetCurrencyId || '');
        if (!targetCurrencyId) {
            throw new Error('未找到差异账单目标币种：' + diffCurrencyContext.targetCode);
        }

        var estimateSourceCurrencyId = String(estimateCurrencyId || resolveCurrencyIdByCode(CONFIG.CURRENCY_CODE_USD || 'USD', currencyIdCache) || '');
        var actualSourceCurrencyId = String(actualCurrencyId || resolveCurrencyIdByCode(CONFIG.CURRENCY_CODE_USD || 'USD', currencyIdCache) || '');

        var estimateInTarget = convertAmountToTargetCurrency(estimateAmount, estimateSourceCurrencyId, targetCurrencyId, tranDate, rateCache);
        var actualInTarget = convertAmountToTargetCurrency(actualAmount, actualSourceCurrencyId, targetCurrencyId, tranDate, rateCache);

        return {
            currencyCode: diffCurrencyContext.targetCode,
            currencyId: targetCurrencyId,
            estimateAmount: estimateInTarget,
            actualAmount: actualInTarget,
            diffAmountEstimateMinusActual: round2(estimateInTarget - actualInTarget)
        };
    }

    function uniq(arr) {
        var seen = {};
        var out = [];
        for (var i = 0; i < (arr || []).length; i++) {
            var key = String(arr[i] || '').trim();
            if (!key || seen[key]) continue;
            seen[key] = true;
            out.push(key);
        }
        return out;
    }

    function isTruthy(value) {
        return value === true || value === 'T' || value === 'true' || value === '1' || value === 1;
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
});
