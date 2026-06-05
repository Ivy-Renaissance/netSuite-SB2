/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@description CG子单信息按钮，处理费用预估、分摊、实际费用分摊、费用采购等业务
 */
define(['N/search', 'N/record', 'N/currency', 'N/format'], function (search, record, currency, format) {

    function beforeLoad(context) {
        try {
            var newRecord = context.newRecord;
            var form = context.form;

            form.clientScriptModulePath = 'SuiteScripts/SWC_PROJECT/CS/SWC_CS_CG_SUB_ORDER.js';

            // ===== 基础状态 =====
            var recordId = newRecord.id;

            // 非活动
            var inactive = (newRecord.getValue({ fieldId: 'isinactive' }) === true
                || newRecord.getValue({ fieldId: 'isinactive' }) === 'T');

            // // 采购杂费录入完成
            // var cgZfCheck = newRecord.getValue({ fieldId: 'custrecord_swc_wl_cg_zf_check' }) === true
            //     || newRecord.getValue({ fieldId: 'custrecord_swc_wl_cg_zf_check' }) === 'T';

            // // 真实头程录入完成
            // var tcZfCheck = newRecord.getValue({ fieldId: 'custrecord_swc_wl_tc_zf_check' }) === true
            //     || newRecord.getValue({ fieldId: 'custrecord_swc_wl_tc_zf_check' }) === 'T';

            // // 真实头程录入完成
            // var wcZfCheck = newRecord.getValue({ fieldId: 'custrecord_swc_wl_wc_zf_check' }) === true
            //     || newRecord.getValue({ fieldId: 'custrecord_swc_wl_wc_zf_check' }) === 'T';

            // // 头程分摊按钮
            // var tcZfCheckBtn = newRecord.getValue({ fieldId: 'custrecord_swc_wl_tc_zf_check_btn' }) === true
            //     || newRecord.getValue({ fieldId: 'custrecord_swc_wl_tc_zf_check_btn' }) === 'T';

            // var wcZfCheckBtn = newRecord.getValue({ fieldId: 'custrecord_swc_wl_wc_zf_check_btn' }) === true
            //     || newRecord.getValue({ fieldId: 'custrecord_swc_wl_wc_zf_check_btn' }) === 'T';


            // var lc_number = newRecord.getValue({ fieldId: 'custrecord_swc_hw_lc_number' });
            // var shipment_id = newRecord.getValue({ fieldId: 'custrecord_swc_shipment_id' });
            // var cg_main_order_number = newRecord.getValue({ fieldId: 'custrecord_swc_cg_main_order_number' });
            // var tk_status = newRecord.getValue({ fieldId: 'custrecord_swc_wl_tk_status' });

            // var tot = newRecord.getValue({ fieldId: 'custrecord_swc_wl_terms_of_trade' });


            // 物流发运单状态（先取当前值）
            var wlPlanStatus = newRecord.getValue({ fieldId: 'custrecord_swc_cso_status' }) || '0';

            // // ===== 隐藏子表 =====
            // if (wlPlanStatus != 0 && wlPlanStatus != 1 && wlPlanStatus != 2 && wlPlanStatus != 3) {
            //     injectRequireAndCall(
            //         form,
            //         'SuiteScripts/SWC_PROJECT/CS/SWC_CS_ESTIMATED_CABINET',
            //         'hideRecmachSublistUI_SAFE',
            //         ['recmachcustrecord_swc_wl_plan_order_id'],
            //         '#recmachcustrecord_swc_wl_plan_order_id_layer'
            //     );
            // }

            // var PoCyVendBillFlage = isAllPoCyVendBillFilled(recordId);

            // ===== 仅 view 且非 inactive 才处理 =====
            if (context.type !== 'view' || inactive) {
                return;
            }

            // view 模式下：如果 fee 子记录全部 fpo_type=2，则把父状态更新为 2
            // 只在当前不是2时才判断/更新，避免每次打开都跑一遍
            // if (String(wlPlanStatus) == '1') {
            //     var shouldSetStatus = isAllFeeFpoType(recordId);

            //     if (shouldSetStatus != 1) {
            //         record.submitFields({
            //             type: newRecord.type, // 父记录类型
            //             id: recordId,
            //             values: { custrecord_swc_wl_plan_status: shouldSetStatus },
            //             options: { enableSourcing: false, ignoreMandatoryFields: true }
            //         });

            //         wlPlanStatus = '2';

            //         try {
            //             newRecord.setValue({ fieldId: 'custrecord_swc_wl_plan_status', value: 2 });
            //         } catch (eSet) { }
            //     }
            // }

            function addBtn(id, label, fn) {
                form.addButton({
                    id: id,
                    label: label,
                    functionName: fn + '(' + recordId + ')'
                });
            }

            // // ====== 子列表删除处理 ======
            // var inline = form.addField({
            //     id: 'custpage_confirm_delete_js',
            //     type: 'inlinehtml',
            //     label: ' '
            // });
            // inline.defaultValue = deleteCss();

            // // ===== 采购杂费差异账单 =====
            // if (cgZfCheck && !PoCyVendBillFlage) {
            //     addBtn('custpage_fee_po', '采购杂费差异账单做成', 'poZfCy');
            // }

            // // ===== 采购杂费差异账单 =====
            // if (tcZfCheck && !tcZfCheckBtn) {
            //     addBtn('custpage_fee_po_apportion_sj', '实际头程费用分摊', 'feeApportionSj');
            // }

            // // ===== 采购杂费差异账单 =====
            // if (wcZfCheck && !wcZfCheckBtn) {
            //     addBtn('custpage_fee_po_apportion_sj_wc', '实际尾程费用分摊', 'feeApportionSjWc');
            // }


            // // 测试用
            // addBtn('custpage_tests', '采购订单明细行更新', 'upDataPoSubListLine');
            // addBtn('custpage_fee_po_apportion', '头程预估费用分摊', 'feeApportion');

            // ===== 按状态显示按钮（会用上我们更新后的 wlPlanStatus）=====
            switch (String(wlPlanStatus)) {
                case '0':
                case '1':
                    addBtn('custpage_estimated_cost', '获取头程费用', 'feeEstimatedCos');
                    break;
                case '2':
                    addBtn('custpage_fee_po', '头程费用类型采购订单做成', 'tcFeePoCreate');
                    break;
                case '4':
                    addBtn('custpage_fee_po_apportion', '头程预估费用分摊', 'feeApportion');
                    break;
                case '5':
                    addBtn('custpage_fee_sp_tc', '重新审批', 'fee_po_sp_tc');
                    break;
                case '7':
                    addBtn('custpage_fee_po_apportion_sj', '实际头程费用分摊', 'feeApportionSj');
                    break;
            }

        } catch (e) {
            log.debug('beforeLoad error', e);
        }
    }

    /**
     * fee 子记录至少存在1行，且所有 custrecord_swc_wl_po_fee_fpo_type 都等于 2，则返回 true
     * 没有任何 fee 行时返回 false（避免把空当成“全部满足”）
     */
    function isAllFeeFpoType(parentId) {
        var CHILD_TYPE = 'customrecord_swc_wl_po_fee';
        var CHILD_PARENT_FLD = 'custrecord_swc_wl_po_fee_wl';
        var CHILD_TYPE_FLD = 'custrecord_swc_wl_po_fee_fpo_type';

        var total = 0;
        var allIs4 = true;
        var has3 = false;

        var s = search.create({
            type: CHILD_TYPE,
            filters: [[CHILD_PARENT_FLD, 'anyof', String(parentId)]],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: CHILD_TYPE_FLD })
            ]
        });

        s.run().each(function (r) {
            total++;

            var v = String(r.getValue({ name: CHILD_TYPE_FLD }) || '');

            if (v === '3') {
                has3 = true;
                // 不提前结束：后面可能还有不是4的情况，但规则里“有3就返回3”优先级最高
                return true;
            }

            if (v !== '4') {
                allIs4 = false;
                // 仍然继续，避免后面出现3却漏掉
                return true;
            }

            return true;
        });

        // 必须至少有一行；没有行按“其余”处理 => 1
        if (total === 0) return 1;

        // 有一个等于3 => 3（优先）
        if (has3) return 3;

        // 全部等于4 => 2
        if (allIs4) return 2;

        // 其余 => 1
        return 1;
    }


    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
        // try {
        //     // 我只在物流发运单编辑保存后补这层同步，避免去碰现有创建链路。
        //     // 这里统一兼容 EDIT / XEDIT，两种保存入口都需要触发重算。
        //     if (context.type !== context.UserEventType.EDIT
        //         && context.type !== context.UserEventType.XEDIT) {
        //         return;
        //     }

        //     syncInboundOperationFeeLocation(context.newRecord.id);
        //     syncEstimatedFeeForInsuranceAndDuty(context.newRecord.id);
        // } catch (e) {
        //     log.debug('afterSubmit error', e);
        // }
    }

    /**
     * 我在编辑保存后，把“入库操作费(101)”对应的 location 按最新表头信息同步到头程费用子记录。
     * 处理规则与创建时保持一致：
     * 1. 只有物流发运单上存在运抵国时才处理
     * 2. 只处理 fee_type_z = 101 的子记录
     * 3. 用 运抵国 + 目的仓 去供应商里匹配，多个结果只取第一条
     * 4. 查到供应商后，回写 custrecord_swc_wl_flc_location
     * @param {string|number} wlPlanOrderId
     */
    function syncInboundOperationFeeLocation(wlPlanOrderId) {
        if (!wlPlanOrderId) return;

        var wlPlanRecord = record.load({
            type: 'customrecord_swc_wl_plan_order',
            id: wlPlanOrderId,
            isDynamic: false
        });

        var countyLsit = wlPlanRecord.getValue({ fieldId: 'custrecord_swc_wl_county_lsit' });
        var mdLocation = wlPlanRecord.getValue({ fieldId: 'custrecord_swc_md_location' });

        // 我只在运抵国存在时才做这次补偿处理，保持和当前创建逻辑一致。
        if (!countyLsit || !mdLocation) {
            return;
        }

        var matchedVendorId = getFirstVendorByCountryAndLocation(countyLsit, mdLocation);
        if (!matchedVendorId) {
            return;
        }

        var firstLegCostSearch = search.create({
            type: 'customrecord_swc_wl_first_leg_cost',
            filters: [
                ['custrecord_swc_wl_first_leg_cost_id', 'anyof', String(wlPlanOrderId)],
                'AND',
                ['custrecord_swc_flc_fee_type_z', 'anyof', '101']
            ],
            columns: [
                search.createColumn({ name: 'internalid' })
            ]
        });

        firstLegCostSearch.run().each(function (result) {
            var lineId = result.getValue({ name: 'internalid' });
            if (!lineId) {
                return true;
            }

            record.submitFields({
                type: 'customrecord_swc_wl_first_leg_cost',
                id: lineId,
                values: {
                    custrecord_swc_wl_flc_location: matchedVendorId
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            return true;
        });
    }

    /**
     * 我在编辑保存后，把海运保险费(4)和目的国进口关税(7)的预估费用按最新表头/明细重新同步。
     * 这里主要覆盖“运抵国后补录”的场景，避免创建时因为国家为空导致 7 没法计算。
     * 4 的口径：
     * 1. 取物流发运明细金额 custrecord_swc_wl_d_amount_total
     * 2. 乘对应数量（优品/良品，有值取对应值，否则回退 shipped qty）
     * 3. 再乘 1.1 和 0.005
     * 4. 如果对应 PO 币种是美元，再乘 7
     * 7 的口径：
     * 1. 按运抵国决定清关价字段
     *    US -> USD
     *    CA -> CAD
     *    DE/FR/IT/ES/NL -> EUR
     *    GB/UK -> GBP
     * 2. 按 SKU 去清关价明细和 SKU-HS 映射里取单价与税率
     * 3. 单价 * 数量 * 税率
     * 4. 美国(US)场合在总额基础上再加 40
     * @param {string|number} wlPlanOrderId
     */
    function syncEstimatedFeeForInsuranceAndDuty(wlPlanOrderId) {
        if (!wlPlanOrderId) return;

        var wlPlanRecord = record.load({
            type: 'customrecord_swc_wl_plan_order',
            id: wlPlanOrderId,
            isDynamic: false
        });

        var countyLsit = wlPlanRecord.getValue({ fieldId: 'custrecord_swc_wl_county_lsit' });
        var countyLsitText = wlPlanRecord.getText({ fieldId: 'custrecord_swc_wl_county_lsit' });
        var countryCode = normalizeCountryCode(countyLsit, countyLsitText);
        var termsOfTrade = wlPlanRecord.getValue({ fieldId: 'custrecord_swc_wl_terms_of_trade' });
        var clearancePriceFieldId = getClearancePriceFieldIdByCountry(countryCode);
        var isUsCountry = String(countryCode || '').toUpperCase() === 'US';
        var detailLineList = getPlanDetailLineList(wlPlanRecord);
        if (!detailLineList.length) {
            return;
        }

        var feeLineList = getInsuranceAndDutyFeeLines(wlPlanOrderId);
        if (!feeLineList.length) {
            return;
        }

        var poCurrencyMap = getPurchaseOrderCurrencyMap(detailLineList);
        var insuranceResult = calculateInsuranceEstimatedFee(detailLineList, poCurrencyMap, termsOfTrade);
        var dutyResult = calculateImportDutyEstimatedFee(detailLineList, countyLsit, clearancePriceFieldId, isUsCountry, poCurrencyMap, termsOfTrade);

        for (var i = 0; i < feeLineList.length; i++) {
            var feeLine = feeLineList[i];
            var values = {};

            if (String(feeLine.feeTypeZ) === '4') {
                values.custrecord_swc_wl_flc_yg_fee = insuranceResult.total;
                values.custrecord_swc_wl_flc_yg_currency = 1;
            } else if (String(feeLine.feeTypeZ) === '7' && String(feeLine.feeTypeX) === '25') {
                values.custrecord_swc_wl_flc_yg_fee = dutyResult.total;
            } else {
                continue;
            }
            record.submitFields({
                type: 'customrecord_swc_wl_first_leg_cost',
                id: feeLine.id,
                values: values,
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
        }

        insuranceResult.lineAmountMap = rebalanceLineAmountMap(insuranceResult.lineAmountMap, insuranceResult.total);
        dutyResult.lineAmountMap = rebalanceLineAmountMap(dutyResult.lineAmountMap, dutyResult.total);
        applyInsuranceAndDutyToPlanDetail(wlPlanRecord, insuranceResult.lineAmountMap, dutyResult.lineAmountMap, termsOfTrade);
    }

    function getInsuranceAndDutyFeeLines(wlPlanOrderId) {
        var lineList = [];
        var feeSearch = search.create({
            type: 'customrecord_swc_wl_first_leg_cost',
            filters: [
                ['custrecord_swc_wl_first_leg_cost_id', 'anyof', String(wlPlanOrderId)],
                'AND',
                ['custrecord_swc_flc_fee_type_z', 'anyof', ['4', '7']]
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'custrecord_swc_flc_fee_type_z' }),
                search.createColumn({ name: 'custrecord_swc_wl_flc_fee_type_x' })
            ]
        });

        feeSearch.run().each(function (result) {
            lineList.push({
                id: result.getValue({ name: 'internalid' }),
                feeTypeZ: result.getValue({ name: 'custrecord_swc_flc_fee_type_z' }),
                feeTypeX: result.getValue({ name: 'custrecord_swc_wl_flc_fee_type_x' })
            });
            return true;
        });

        return lineList;
    }

    function getPlanDetailLineList(planRec) {
        var lineList = [];
        var sublistId = 'recmachcustrecord_swc_wl_plan_order_id';
        var lineCount = planRec.getLineCount({ sublistId: sublistId }) || 0;

        for (var i = 0; i < lineCount; i++) {
            lineList.push({
                line: i,
                poId: planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_po_num', line: i }),
                itemId: planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_sku', line: i }),
                amountTotal: toNumber(planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_amount_total', line: i })),
                superiorQty: toNumber(planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: i })),
                goodQty: toNumber(planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: i })),
                shippedQty: toNumber(planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_shipped_qty', line: i }))
            });
        }

        return lineList;
    }

    function getPurchaseOrderCurrencyMap(detailLineList) {
        var poIdMap = {};
        for (var i = 0; i < detailLineList.length; i++) {
            if (detailLineList[i].poId) {
                poIdMap[String(detailLineList[i].poId)] = true;
            }
        }

        var poIds = Object.keys(poIdMap);
        var currencyMap = {};
        if (!poIds.length) {
            return currencyMap;
        }

        var poSearch = search.create({
            type: 'purchaseorder',
            filters: [
                ['internalid', 'anyof', poIds],
                'AND',
                ['mainline', 'is', 'T']
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'currency' }),
                search.createColumn({ name: 'trandate' })
            ]
        });

        poSearch.run().each(function (result) {
            var poId = result.getValue({ name: 'internalid' });
            currencyMap[String(poId)] = {
                id: result.getValue({ name: 'currency' }) || '',
                text: result.getText({ name: 'currency' }) || '',
                trandate: result.getValue({ name: 'trandate' }) || ''
            };
            return true;
        });

        return currencyMap;
    }

    /**
     * 我把海运保险费按物流发运明细逐行汇总。
     * 每一行的公式是：
     * custrecord_swc_wl_d_amount_total * 数量 * 1.1 * 0.005
     * 如果 PO 币种是美元，再乘 7。
     */
    function calculateInsuranceEstimatedFee(detailLineList, poCurrencyMap, termsOfTrade) {
        var total = 0;
        var lineAmountMap = {};
        for (var i = 0; i < detailLineList.length; i++) {
            var line = detailLineList[i];
            var qty = getPlanDetailLineQty(line);
            if (qty <= 0 || line.amountTotal <= 0) {
                lineAmountMap[String(line.line)] = 0;
                continue;
            }

            var lineAmount = line.amountTotal * qty * 1.1 * 0.005;
            var poCurrencyInfo = poCurrencyMap[String(line.poId)] || {};
            var defaultCurrency = getDefaultCurrencyByFeeTypeAndTerms('4', termsOfTrade);
            lineAmount = convertAmountByDefaultCurrency(lineAmount, defaultCurrency, poCurrencyInfo);
            lineAmountMap[String(line.line)] = lineAmount;

            total = round2(total + lineAmount);
        }
        return {
            total: total,
            lineAmountMap: lineAmountMap
        };
    }

    /**
     * 我把目的国进口关税按物流发运明细逐行汇总。
     * 计算公式是：
     * 清关价单价 * 数量 * 税率
     * 其中清关价字段由运抵国决定，美国(US)场合最后总额再加 40。
     */
    function calculateImportDutyEstimatedFee(detailLineList, countryId, clearancePriceFieldId, isUsCountry, poCurrencyMap, termsOfTrade) {
        var skuMap = {};
        for (var i = 0; i < detailLineList.length; i++) {
            if (detailLineList[i].itemId) {
                skuMap[String(detailLineList[i].itemId)] = true;
            }
        }

        var skuIds = Object.keys(skuMap);
        if (!skuIds.length || !countryId || !clearancePriceFieldId) {
            return 0;
        }

        var clearancePriceMap = getClearancePriceMap(skuIds, clearancePriceFieldId);
        var taxRateMap = getSkuTaxRateMap(skuIds, countryId);
        var total = 0;
        var lineAmountMap = {};

        for (var j = 0; j < detailLineList.length; j++) {
            var line = detailLineList[j];
            var qty = getPlanDetailLineQty(line);
            if (qty <= 0 || !line.itemId) {
                lineAmountMap[String(line.line)] = 0;
                continue;
            }

            var unitPrice = toNumber(clearancePriceMap[String(line.itemId)]);
            var taxRate = toNumber(taxRateMap[String(line.itemId)]);
            if (unitPrice <= 0) {
                lineAmountMap[String(line.line)] = 0;
                continue;
            }

            var lineAmount = unitPrice * qty;
            if (taxRate > 0) {
                lineAmount = lineAmount + (unitPrice * qty * taxRate);
            }
            var poCurrencyInfo = poCurrencyMap[String(line.poId)] || {};
            var defaultCurrency = getDefaultCurrencyByFeeTypeAndTerms('7', termsOfTrade);
            lineAmount = convertAmountByDefaultCurrency(lineAmount, defaultCurrency, poCurrencyInfo);
            lineAmountMap[String(line.line)] = lineAmount;

            total = round2(total + lineAmount);
        }

        if (isUsCountry) {
            total = round2(total + 40);
        }
        return {
            total: total,
            lineAmountMap: lineAmountMap
        };
    }

    function applyInsuranceAndDutyToPlanDetail(planRec, insuranceLineAmountMap, dutyLineAmountMap, termsOfTrade) {
        var sublistId = 'recmachcustrecord_swc_wl_plan_order_id';
        var lineCount = planRec.getLineCount({ sublistId: sublistId }) || 0;
        var insuranceCurrency = 1;
        var dutyCurrency = getDefaultCurrencyInternalIdByFeeTypeAndTerms('7', termsOfTrade);

        for (var i = 0; i < lineCount; i++) {
            var insuranceAmount = round2(toNumber((insuranceLineAmountMap || {})[String(i)]));
            var dutyAmount = round2(toNumber((dutyLineAmountMap || {})[String(i)]));

            planRec.setSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_swc_wl_d_em_bxf_fee',
                line: i,
                value: insuranceAmount
            });
            if (insuranceCurrency) {
                planRec.setSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_swc_wl_d_em_bxf_fee_c',
                    line: i,
                    value: insuranceCurrency
                });
            }

            planRec.setSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_swc_wl_d_em_jkgs_fee',
                line: i,
                value: dutyAmount
            });
            if (dutyCurrency) {
                planRec.setSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_swc_wl_d_em_jkgs_fee_c',
                    line: i,
                    value: dutyCurrency
                });
            }
        }

        planRec.save({
            enableSourcing: false,
            ignoreMandatoryFields: true
        });
    }

    function rebalanceLineAmountMap(lineAmountMap, targetTotal) {
        lineAmountMap = lineAmountMap || {};
        targetTotal = round2(toNumber(targetTotal));

        var keys = Object.keys(lineAmountMap);
        if (!keys.length) {
            return lineAmountMap;
        }

        var currentTotal = 0;
        var positiveKeys = [];
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = round2(toNumber(lineAmountMap[key]));
            lineAmountMap[key] = value;
            currentTotal = round2(currentTotal + value);
            if (value > 0) {
                positiveKeys.push(key);
            }
        }

        var diffCents = Math.round((targetTotal - currentTotal) * 100);
        if (diffCents === 0) {
            return lineAmountMap;
        }

        var allocKeys = positiveKeys.length ? positiveKeys : keys;
        var weightTotal = 0;
        var weights = [];
        for (var j = 0; j < allocKeys.length; j++) {
            var weight = round2(toNumber(lineAmountMap[allocKeys[j]]));
            if (weight <= 0) weight = 1;
            weights.push(weight);
            weightTotal += weight;
        }

        var allocated = new Array(allocKeys.length);
        var allocatedSum = 0;
        var sign = diffCents >= 0 ? 1 : -1;
        var absDiff = Math.abs(diffCents);
        var decimals = [];
        for (var k = 0; k < allocKeys.length; k++) {
            var raw = weights[k] * (absDiff / weightTotal);
            var base = Math.floor(raw);
            allocated[k] = base;
            allocatedSum += base;
            decimals[k] = raw - base;
        }

        var rest = absDiff - allocatedSum;
        while (rest > 0) {
            var maxIndex = 0;
            for (var m = 1; m < decimals.length; m++) {
                if (decimals[m] > decimals[maxIndex]) {
                    maxIndex = m;
                }
            }
            allocated[maxIndex] += 1;
            decimals[maxIndex] = -1;
            rest--;
        }

        for (var n = 0; n < allocKeys.length; n++) {
            var lineKey = allocKeys[n];
            lineAmountMap[lineKey] = round2(toNumber(lineAmountMap[lineKey]) + sign * allocated[n] / 100);
        }

        return lineAmountMap;
    }

    /**
     * 我按传入的清关价字段去取 SKU 对应单价。
     * 这个字段已经在外层根据运抵国换算好了，不在这里再做国家判断。
     */
    function getClearancePriceMap(skuIds, priceFieldId) {
        var priceMap = {};
        if (!skuIds || !skuIds.length || !priceFieldId) {
            return priceMap;
        }

        var priceSearch = search.create({
            type: 'customrecord_swc_clearance_price_detail',
            filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                ['custrecord_clearance_price_detail_sku', 'anyof', skuIds]
            ],
            columns: [
                search.createColumn({ name: 'custrecord_clearance_price_detail_sku' }),
                search.createColumn({ name: priceFieldId })
            ]
        });

        priceSearch.run().each(function (result) {
            var skuId = result.getValue({ name: 'custrecord_clearance_price_detail_sku' });
            priceMap[String(skuId)] = toNumber(result.getValue({ name: priceFieldId }));
            return true;
        });

        return priceMap;
    }

    /**
     * 我把运抵国代码映射成清关价维护单的价格字段。
     * 支持的国家代码：
     * US -> USD
     * CA -> CAD
     * DE/FR/IT/ES/NL -> EUR
     * GB/UK -> GBP
     * 其余国家返回空，后续按 0 处理，不抛异常。
     */
    function getClearancePriceFieldIdByCountry(countryId) {
        var countryCode = String(countryId || '').toUpperCase();
        if (countryCode === 'US') return 'custrecord_clearance_price_detail_usd';
        if (countryCode === 'CA') return 'custrecord_clearance_price_detail_cad';
        if (countryCode === 'DE' || countryCode === 'FR' || countryCode === 'IT' || countryCode === 'ES' || countryCode === 'NL') {
            return 'custrecord_clearance_price_detail_eur';
        }
        if (countryCode === 'GB' || countryCode === 'UK') return 'custrecord_clearance_price_detail_gbp';
        return '';
    }

    function normalizeCountryCode(countryValue, countryText) {
        var rawValue = String(countryValue || '').trim();
        var rawText = String(countryText || '').trim();
        var upperValue = rawValue.toUpperCase();
        var upperText = rawText.toUpperCase();

        if (upperValue === 'US' || upperValue === 'CA' || upperValue === 'DE' || upperValue === 'FR'
            || upperValue === 'IT' || upperValue === 'ES' || upperValue === 'NL'
            || upperValue === 'GB' || upperValue === 'UK') {
            return upperValue;
        }

        if (upperText === 'US' || upperText === 'CA' || upperText === 'DE' || upperText === 'FR'
            || upperText === 'IT' || upperText === 'ES' || upperText === 'NL'
            || upperText === 'GB' || upperText === 'UK') {
            return upperText;
        }

        if (rawValue === '230' || rawText.indexOf('美国') !== -1 || rawText.indexOf('美利坚') !== -1) return 'US';
        if (rawText.indexOf('加拿大') !== -1) return 'CA';
        if (rawText.indexOf('德国') !== -1) return 'DE';
        if (rawText.indexOf('法国') !== -1) return 'FR';
        if (rawText.indexOf('意大利') !== -1) return 'IT';
        if (rawText.indexOf('西班牙') !== -1) return 'ES';
        if (rawText.indexOf('荷兰') !== -1) return 'NL';
        if (rawText.indexOf('英国') !== -1) return 'GB';

        return upperValue;
    }

    function getSkuTaxRateMap(skuIds, countryId) {
        var taxRateMap = {};
        if (!skuIds || !skuIds.length || !countryId) {
            return taxRateMap;
        }

        var taxSearch = search.create({
            type: 'customrecord_swc_sku_hscode_ys',
            filters: [
                ['custrecord_swc_ys_country', 'anyof', countryId],
                'AND',
                ['custrecord_swc_ys_item', 'anyof', skuIds],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'custrecord_swc_ys_item' }),
                search.createColumn({ name: 'custrecord_swc_tax_rate' })
            ]
        });

        taxSearch.run().each(function (result) {
            var skuId = result.getValue({ name: 'custrecord_swc_ys_item' });
            var rawTaxRate = result.getValue({ name: 'custrecord_swc_tax_rate' });
            taxRateMap[String(skuId)] = parsePercentRate(rawTaxRate);
            return true;
        });

        return taxRateMap;
    }

    function getPlanDetailLineQty(line) {
        if (toNumber(line.superiorQty) > 0) return toNumber(line.superiorQty);
        if (toNumber(line.goodQty) > 0) return toNumber(line.goodQty);
        return toNumber(line.shippedQty);
    }

    function isUsdCurrency(currencyText) {
        currencyText = String(currencyText || '').toUpperCase();
        return currencyText.indexOf('USD') !== -1 || currencyText.indexOf('美元') !== -1;
    }

    function isRmbCurrency(currencyText) {
        currencyText = String(currencyText || '').toUpperCase();
        return currencyText.indexOf('CNY') !== -1
            || currencyText.indexOf('RMB') !== -1
            || currencyText.indexOf('人民币') !== -1;
    }

    function getDefaultCurrencyByFeeTypeAndTerms(feeTypeZ, termsOfTrade) {
        feeTypeZ = String(feeTypeZ || '');
        termsOfTrade = String(termsOfTrade || '');

        if (feeTypeZ === '4') {
            if (termsOfTrade === '3' || termsOfTrade === '4') return 'RMB';
            if (termsOfTrade === '1' || termsOfTrade === '2' || termsOfTrade === '5') return 'USD';
        }

        if (feeTypeZ === '7') {
            if (termsOfTrade === '3') return 'RMB';
            if (termsOfTrade === '1' || termsOfTrade === '2' || termsOfTrade === '4' || termsOfTrade === '5') return 'USD';
        }

        return '';
    }

    function getDefaultCurrencyInternalIdByFeeTypeAndTerms(feeTypeZ, termsOfTrade) {
        var defaultCurrency = getDefaultCurrencyByFeeTypeAndTerms(feeTypeZ, termsOfTrade);
        var currencyId = getCurrencyIdByDefaultCode(defaultCurrency);
        return currencyId ? Number(currencyId) : '';
    }

    var currencyIdCache = {};

    function convertAmountByDefaultCurrency(amount, defaultCurrency, poCurrencyInfo) {
        amount = round2(amount);
        defaultCurrency = String(defaultCurrency || '').toUpperCase();
        poCurrencyInfo = poCurrencyInfo || {};
        var poCurrencyText = poCurrencyInfo.text || '';
        var poCurrencyId = poCurrencyInfo.id || '';
        var poTranDate = poCurrencyInfo.trandate || '';
        if (amount <= 0 || !defaultCurrency) {
            return amount;
        }

        if (defaultCurrency === 'RMB') {
            if (isUsdCurrency(poCurrencyText)) {
                return round2(amount * getStandardCurrencyRate('RMB', poCurrencyId, poTranDate));
            }
            return amount;
        }

        if (defaultCurrency === 'USD') {
            if (isRmbCurrency(poCurrencyText)) {
                return round2(amount / getStandardCurrencyRate('USD', poCurrencyId, poTranDate));
            }
            return amount;
        }

        return amount;
    }

    function getStandardCurrencyRate(defaultCurrency, targetCurrencyId, tranDate) {
        defaultCurrency = String(defaultCurrency || '').toUpperCase();
        targetCurrencyId = String(targetCurrencyId || '');
        if (!defaultCurrency || !targetCurrencyId) {
            return 1;
        }

        var sourceCurrencyId = getCurrencyIdByDefaultCode(defaultCurrency);
        if (!sourceCurrencyId || sourceCurrencyId === targetCurrencyId) {
            return 1;
        }

        try {
            var exchangeDate = toDateValue(tranDate) || new Date();
            return Number(currency.exchangeRate({
                source: Number(sourceCurrencyId),
                target: Number(targetCurrencyId),
                date: exchangeDate
            })) || 1;
        } catch (e) {
            log.error('getStandardCurrencyRate error', e);
            return 1;
        }
    }

    function getCurrencyIdByDefaultCode(currencyCode) {
        currencyCode = String(currencyCode || '').toUpperCase();
        if (!currencyCode) return '';
        if (currencyIdCache[currencyCode]) return currencyIdCache[currencyCode];

        var keywordList = [];
        if (currencyCode === 'USD') {
            keywordList = ['USD', '美元'];
        } else if (currencyCode === 'RMB') {
            keywordList = ['CNY', 'RMB', '人民币'];
        }

        if (!keywordList.length) return '';

        var currencySearch = search.create({
            type: 'currency',
            filters: [
                ['isinactive', 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'name' }),
                search.createColumn({ name: 'symbol' })
            ]
        });

        var currencyId = '';
        currencySearch.run().each(function (result) {
            var name = String(result.getValue({ name: 'name' }) || '').toUpperCase();
            var symbol = String(result.getValue({ name: 'symbol' }) || '').toUpperCase();
            for (var i = 0; i < keywordList.length; i++) {
                var keyword = String(keywordList[i] || '').toUpperCase();
                if (name.indexOf(keyword) !== -1 || symbol.indexOf(keyword) !== -1) {
                    currencyId = result.getValue({ name: 'internalid' }) || '';
                    return false;
                }
            }
            return true;
        });

        currencyIdCache[currencyCode] = currencyId;
        return currencyId;
    }

    function toDateValue(value) {
        if (!value) return null;
        if (Object.prototype.toString.call(value) === '[object Date]') {
            return isNaN(value.getTime()) ? null : value;
        }

        try {
            var parsedByFormat = format.parse({
                value: value,
                type: format.Type.DATE
            });
            if (parsedByFormat && !isNaN(parsedByFormat.getTime())) {
                return parsedByFormat;
            }
        } catch (e) {
            log.debug('toDateValue format.parse failed', {
                value: value,
                message: e && e.message
            });
        }

        var parsedByNative = new Date(value);
        if (!isNaN(parsedByNative.getTime())) {
            return parsedByNative;
        }

        return null;
    }

    function parsePercentRate(rateValue) {
        var rateText = String(rateValue || '').replace('%', '').trim();
        if (!rateText) return 0;

        var rate = Number(rateText);
        if (!isFinite(rate)) return 0;

        return rate > 1 ? rate / 100 : rate;
    }

    function toNumber(value) {
        var n = Number(value);
        return isFinite(n) ? n : 0;
    }

    function round2(n) {
        n = toNumber(n);
        return Math.round((n + Number.EPSILON) * 100) / 100;
    }

    /**
     * 我这里复用创建时的匹配规则，用运抵国 + 目的仓取第一个供应商。
     * @param {string|number} countyLsit
     * @param {string|number} mdLocation
     * @returns {string}
     */
    function getFirstVendorByCountryAndLocation(countyLsit, mdLocation) {
        if (!countyLsit || !mdLocation) return '';

        var vendorSearchObj = search.create({
            type: search.Type.VENDOR,
            filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                ['custentity_swc_destination_country', 'anyof', countyLsit],
                'AND',
                ['custentity_swc_destination_arehouse_cod', 'anyof', mdLocation]
            ],
            columns: [
                search.createColumn({ name: 'internalid', sort: search.Sort.ASC })
            ]
        });

        var result = vendorSearchObj.run().getRange({ start: 0, end: 1 });
        if (result && result.length > 0) {
            return result[0].getValue({ name: 'internalid' }) || '';
        }
        return '';
    }

    function isAllPoCyVendBillFilled(billId) {
        if (!billId) return false;

        var CHILD_RECORD_TYPE = 'customrecord_swc_wl_po_fee';
        var LINK_FIELD_ID = 'custrecord_swc_wl_po_fee_wl';
        var TARGET_FIELD_ID = 'custrecord_swc_wl_po_cy_vendbill';

        var hasAnyLine = false;
        var allFilled = true;

        var s = search.create({
            type: CHILD_RECORD_TYPE,
            filters: [
                [LINK_FIELD_ID, 'anyof', String(billId)]
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: TARGET_FIELD_ID })
            ]
        });

        s.run().each(function (r) {
            hasAnyLine = true;

            var v = r.getValue({ name: TARGET_FIELD_ID });
            if (v === null || v === '' || typeof v === 'undefined') {
                allFilled = false;
                return false;
            }
            return true;
        });

        if (!hasAnyLine) return false;

        return allFilled;
    }

    function deleteCss() {
        var cssDelete =
            '<script>' +
            '(function(){' +

            '  function findClosestA(el){' +
            '    while(el && el.tagName!=="A"){ el = el.parentElement; }' +
            '    return el;' +
            '  }' +

            '  function isDeleteLink(a){' +
            '    if(!a) return false;' +
            '    var text=(a.textContent||"").trim();' +
            '    var title=(a.getAttribute("title")||"").trim();' +
            '    var aria=(a.getAttribute("aria-label")||"").trim();' +
            '    var hit=(' +
            '      text==="删除"||title==="删除"||aria==="删除"||' +
            '      text==="Delete"||title==="Delete"||aria==="Delete"' +
            '    );' +
            '    if(!hit) return false;' +
            '    var href=a.getAttribute("href")||"";' +
            '    if(!href||href==="#") return false;' +
            '    return true;' +
            '  }' +

            '  function bindDeleteIntercept(doc){' +
            '    if(!doc) return;' +
            '    if(doc.__swc_delete_confirm_bound__) return;' +
            '    doc.__swc_delete_confirm_bound__=true;' +

            '    doc.addEventListener("click", function(e){' +
            '      var a = findClosestA(e.target);' +
            '      if(!isDeleteLink(a)) return;' +

            '      if(a.__swc_skip_once__){' +
            '        a.__swc_skip_once__=false;' +
            '        return;' +
            '      }' +

            '      e.preventDefault();' +
            '      e.stopPropagation();' +
            '      if(e.stopImmediatePropagation) e.stopImmediatePropagation();' +

            '      var win = doc.defaultView || window;' +
            '      var req = (win && win.require) ? win.require : (window && window.require ? window.require : null);' +

            '      if(req){' +
            '        req(["N/ui/dialog"], function(dialog){' +
            '          dialog.confirm({' +
            '            title: "确认",' +
            '            message: "确定要删除这一行吗？<br/>点击“确定”将删除，点击“取消”将保留。"' +
            '          })' +
            '          .then(function(result){' +
            '            if(result===false) return;' +
            '            try{' +
            '              a.__swc_skip_once__=true;' +
            '              a.click();' +
            '            }catch(err){' +
            '              try{' +
            '                var href=a.getAttribute("href")||"";' +
            '                if(/^javascript:/i.test(href)){' +
            '                  (new Function(href.replace(/^javascript:/i,"")))();' +
            '                }else if(href){' +
            '                  window.location.href=href;' +
            '                }' +
            '              }catch(e2){}' +
            '            }' +
            '          })' +
            '          .catch(function(){});' +
            '        });' +
            '      } else {' +
            '        var ok = window.confirm("确定要删除这一行吗？\\n删除后无法追回。");' +
            '        if(!ok) return;' +

            '        try{' +
            '          a.__swc_skip_once__=true;' +
            '          a.click();' +
            '        }catch(err2){' +
            '          try{' +
            '            var href2=a.getAttribute("href")||"";' +
            '            if(/^javascript:/i.test(href2)){' +
            '              (new Function(href2.replace(/^javascript:/i,"")))();' +
            '            }else if(href2){' +
            '              window.location.href=href2;' +
            '            }' +
            '          }catch(e3){}' +
            '        }' +
            '      }' +

            '      return false;' +
            '    }, true);' +
            '  }' +

            '  function bindMainAndIframe(){' +
            '    bindDeleteIntercept(document);' +

            '    var layer = document.querySelector("#recmachcustrecord_swc_wl_plan_order_id_layer");' +
            '    if(!layer) return;' +

            '    function tryBindIframe(){' +
            '      var ifr = layer.querySelector("iframe");' +
            '      if(!ifr) return;' +
            '      try{' +
            '        var idoc = ifr.contentDocument || (ifr.contentWindow && ifr.contentWindow.document);' +
            '        if(idoc) bindDeleteIntercept(idoc);' +
            '      }catch(e){}' +
            '    }' +

            '    tryBindIframe();' +

            '    var ifr2 = layer.querySelector("iframe");' +
            '    if(ifr2){' +
            '      ifr2.addEventListener("load", function(){ setTimeout(tryBindIframe, 50); });' +
            '    }' +

            '    var tries=0;' +
            '    var t=setInterval(function(){' +
            '      tries++;' +
            '      tryBindIframe();' +
            '      if(tries>=40) clearInterval(t);' +
            '    }, 250);' +
            '  }' +

            '  if(document.readyState==="loading"){' +
            '    document.addEventListener("DOMContentLoaded", bindMainAndIframe);' +
            '  }else{' +
            '    bindMainAndIframe();' +
            '  }' +

            '})();' +
            '</script>';

        return cssDelete;
    }

    function injectRequireAndCall(form, modulePath, fnName, fnArgs, readySelector) {
        modulePath = (modulePath || '').replace(/\.js$/i, '');

        var argsJson = JSON.stringify(fnArgs || []);
        var safeSelector = readySelector ? String(readySelector).replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';

        var code =
            "(function(){" +
            "  try{" +
            "    var modulePath='" + modulePath + "';" +
            "    var fnName='" + fnName + "';" +
            "    var args=" + argsJson + ";" +
            "    var readySel='" + safeSelector + "';" +
            "    function callIt(mod){" +
            "      try{" +
            "        if(!mod){console.log('[inject] module null:', modulePath);return;}" +
            "        var fn = mod[fnName];" +
            "        if(typeof fn !== 'function'){console.log('[inject] function not exported:', fnName, mod);return;}" +
            "        fn.apply(mod, args);" +
            "      }catch(e){console.log('[inject] call error', e);}" +
            "    }" +
            "    function waitDomThenCall(mod){" +
            "      if(!readySel){callIt(mod);return;}" +
            "      var tries=0;" +
            "      var t=setInterval(function(){" +
            "        tries++;" +
            "        if(document.querySelector(readySel)){" +
            "          clearInterval(t);" +
            "          callIt(mod);" +
            "          return;" +
            "        }" +
            "        if(tries>=30){clearInterval(t);console.log('[inject] DOM not ready:', readySel);}" +
            "      },300);" +
            "    }" +
            "    require([modulePath], function(mod){ waitDomThenCall(mod); }, function(err){ console.log('[inject] require failed', modulePath, err); });" +
            "  }catch(e){console.log('[inject] fatal', e);}" +
            "})();";

        var field = form.addField({
            id: 'custpage_inject_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
            label: ' ',
            type: 'INLINEHTML'
        });
        field.defaultValue = '<script>' + code + '</script>';
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
