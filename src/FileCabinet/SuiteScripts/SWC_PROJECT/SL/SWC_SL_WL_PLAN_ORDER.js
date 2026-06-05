/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/task', 'N/search', 'N/record', 'N/currency', 'N/format', 'N/runtime', 'N/redirect', '../common/SWC_CONFIG_DATA'],

    function (task, search, record, currencyRate, format, runtime, redirect, SWC_CONFIG_DATA) {
        var CONFIG = SWC_CONFIG_DATA.configData();

        // 测试环境费用类别，保留现有 internal id，避免影响已上线配置。
        const CKMTS = CONFIG.COST_CATEGORY_CKMTS; // 测试环境。
        // 出口免退税测试环境。
        const CKMTS_2 = CONFIG.COST_CATEGORY_CKMTS_2;

        // 记录类型常量：集中维护常用自定义记录与标准单据类型。
        const RECORD_TYPE_WL_PLAN_ORDER = 'customrecord_swc_wl_plan_order';
        const RECORD_TYPE_WL_FIRST_LEG_COST = 'customrecord_swc_wl_first_leg_cost';
        const RECORD_TYPE_SERVICE_QUOTATION = 'customrecord_swc_service_quotation';
        const RECORD_TYPE_SERVICE_QUOTATION_DETAIL = 'customrecord_swc_service_quotation_detai';
        const RECORD_TYPE_COST_QUOTATION_VALUE_RULE = 'customrecord_swc_cost_quotation_value_ru';
        const RECORD_TYPE_RULE_MAPPING_TABLE = 'customrecord_swc_rule_mapping_table';
        const RECORD_TYPE_WL_PLAN_DETAIL = 'customrecord_swc_wl_plan_detail';
        const RECORD_TYPE_ACTUAL_CABINET = 'customrecord_swc_actual_cabinet';
        const RECORD_TYPE_PURCHASE_ORDER = 'purchaseorder';
        const RECORD_TYPE_TRANSFER_ORDER = 'transferorder';

        // 子列表常量：常用子列表 id 统一从这里取，避免手写字符串。
        const SUBLIST_WL_PLAN_DETAIL = 'recmachcustrecord_swc_wl_plan_order_id';
        const SUBLIST_WL_FIRST_LEG_COST = 'recmachcustrecord_swc_wl_first_leg_cost_id';
        const SUBLIST_WL_PO_FEE = 'recmachcustrecord_swc_wl_po_fee_wl';
        const SUBLIST_TRNFRORD_LINK = 'recmachcustrecord_swc_trnfrord_link';
        const SUBLIST_HW_TRNFRORD_LINK = 'recmachcustrecord_swc_hw_trnfrord_link';
        const SUBLIST_ACTUAL_CABINET_DETAIL = 'recmachcustrecord_swc_acd_actual_cabinet';
        const SUBLIST_ITEM = 'item';
        const SUBLIST_LANDED_COST_DATA = 'landedcostdata';

        // 字段常量：优先提取高频、语义稳定、跨函数重复使用的字段。
        const FIELD_AMOUNT = 'amount';
        const FIELD_BODY_FEE_AR_TYPE = 'custbody_swc_fee_ar_type';
        const FIELD_BODY_PO_DB_TYPE = 'custbody_swc_po_db_type';
        const FIELD_ORDER_STATUS = 'orderstatus';
        const FIELD_QUANTITY = 'quantity';
        const FIELD_QUANTITY_REMAINING = 'quantityremaining';
        const FIELD_ITEM_RECEIVE = 'itemreceive';
        const FIELD_COST_CATEGORY = 'costcategory';
        const FIELD_WL_PLAN_STATUS = 'custrecord_swc_wl_plan_status';
        const FIELD_WL_TOTAL_VOLUME = 'custrecord_swc_wl_total_volume';
        const FIELD_WL_AMOUNT_TOTAL = 'custrecord_swc_wl_amount_total';
        const FIELD_WL_TC_FT_FLAG = 'custrecord_swc_wl_tc_ft_flag';
        const FIELD_WL_ACTUAL_CABINET = 'custrecord_swc_wl_actual_cabinet';
        const FIELD_MD_LOCATION = 'custrecord_swc_md_location';
        const FIELD_WL_DESTINATION_COUNTRY = 'custrecord_swc_wl_county_lsit';
        const FIELD_WL_TERMS_OF_TRADE = 'custrecord_swc_wl_terms_of_trade';
        const FIELD_WL_PO_ZT = 'custrecord_swc_wl_po_zt';
        const FIELD_WL_LOADING_CITY = 'custrecord_swc_fy_loading_city';
        const FIELD_FLC_FEE_TYPE_Z = 'custrecord_swc_flc_fee_type_z';
        const FIELD_WL_FLC_PO_TYPE = 'custrecord_swc_wl_flc_po_type';
        const FIELD_WL_FLC_PO = 'custrecord_swc_wl_flc_po';
        const FIELD_WL_FLC_LOCATION = 'custrecord_swc_wl_flc_location';
        const FIELD_WL_FLC_YG_FEE = 'custrecord_swc_wl_flc_yg_fee';
        const FIELD_WL_FLC_YG_CURRENCY = 'custrecord_swc_wl_flc_yg_currency';
        const FIELD_WL_FLC_SJ_CURRENCY = 'custrecord_swc_wl_flc_sj_currency';
        const FIELD_WL_FLC_HISTORY_DIFF = 'custrecord_swc_wl_flc_sj_fee_cy_ls';
        const FIELD_WL_FLC_HISTORY_HANDLED = 'custrecord_swc_tc_historical_difference';
        const FIELD_WL_D_TOTAL_VOLUME = 'custrecord_swc_wl_d_total_volume';
        const FIELD_WL_D_PO_NUM = 'custrecord_swc_wl_d_po_num';
        const FIELD_WL_D_SKU = 'custrecord_swc_wl_d_sku';
        const FIELD_WL_D_CUSTOMER = 'custrecord_swc_wl_d_customer';
        const FIELD_WL_D_SUPERIOR_QTY_Z = 'custrecord_swc_wl_d_superior_qty_z';
        const FIELD_WL_D_GOOD_QTY_Z = 'custrecord_swc_wl_d_good_qty_z';
        const FIELD_WL_PO_FEE_YG = 'custrecord_swc_wl_po_fee_yg';
        const FIELD_WL_PO_FEE_FPO_ID = 'custrecord_swc_wl_po_fee_fpo_id';
        const FIELD_WL_PO_FEE_FPO_TYPE = 'custrecord_swc_wl_po_fee_fpo_type';
        const FIELD_HW_TRNFRORD_PO_DB_FEE = 'custrecord_swc_hw_trnfrord_po_db_fee';
        const FIELD_HW_TRNFRORD_PO_DB_FEE_SJ = 'custrecord_swc_hw_trnfrord_po_db_fee_sj';
        const FIELD_HW_TRNFRORD_PAY_QS = 'custrecord_swc_hw_trnfrord_pay_qs';
        const FIELD_HW_TRNFRORD_LO_TYPE = 'custrecord_swc_hw_trnfrord_lo_type';
        const FIELD_HW_HISTORY_DIFF = 'custrecord_swc_historical_differences';
        const FIELD_HW_HISTORY_HANDLED = 'custrecord_swc_historical_difference_han';
        const FIELD_COST_DIFFERENCE = 'custrecord_swc_cost_difference';
        const FIELD_DIFFERENCE_BILL = 'custrecord_swc_difference_bill';
        const STATUS_TRANSFER_ORDER_APPROVED = 'B';
        /**
         * Suitelet 入口方法，负责解析前端请求并分发到对应业务动作。
         */
        function onRequest(context) {

            // 统一从请求体中解析 bill_id 与 action。
            var request = context.request;
            var result;

            try {
                if (!request || !request.body) {
                    throw new Error('request.body 为空，无法解析参数');
                }

                var data = JSON.parse(request.body);
                var billId = data.bill_id;
                var action = data.action;

                if (!action) {
                    throw new Error('缺少 action 参数');
                }
                if (!billId && billId !== 0) {
                    throw new Error('缺少 bill_id 参数');
                }

                // 通过动作路由表找到对应处理方法。
                var handlers = getActionHandlers();
                var handler = handlers[action];

                if (typeof handler !== 'function') {
                    throw new Error('不支持的 action：' + action);
                }

                result = handler(billId, data);
                context.response.write(JSON.stringify(result || {}));
            } catch (e) {
                log.error('Suitelet onRequest error', e);
                var errorMessage = getSafeActionErrorMessage(e, '处理失败，请刷新页面后重试。');
                context.response.write(JSON.stringify({
                    success: false,
                    data: errorMessage,
                    message: errorMessage
                }));
            }
        }

        /**
         * 统一提取异常文本，便于后续错误信息判断。
         */
        function getErrorText(e) {
            if (!e) return '';
            return String(e.message || e.name || e);
        }

        /**
         * 判断当前异常是否属于单据被并发修改的场景。
         */
        function isRecordChangedError(e) {
            var text = getErrorText(e).toLowerCase();
            return text.indexOf('record has been changed') !== -1
                || text.indexOf('rcrd_has_been_changed') !== -1
                || text.indexOf('单据已被改修') !== -1
                || text.indexOf('记录已被修改') !== -1;
        }

        /**
         * 根据异常类型返回对用户更安全的提示语。
         */
        function getSafeActionErrorMessage(e, defaultMessage) {
            if (isRecordChangedError(e)) {
                // 这里返回并发冲突提示，避免将“已创建成功但回写失败”误判为“未执行任何操作”。
                return '当前物流发运单刚被其他人或其他流程更新，请先刷新页面确认结果后再决定是否继续操作。';
            }
            var text = getErrorText(e);
            if (text.indexOf('USER_MESSAGE:') === 0) {
                return text.replace('USER_MESSAGE:', '');
            }
            return defaultMessage;
        }

        /**
         * 历史差异按“费用中类 + 承运商 + 预估币种”做同 key 匹配。
         * 这里的 key 只用于当前物流发运单本次执行过程中的余额缓存。
         */
        function buildFirstLegHistoricalDiffKey(feeTypeZ, vendorId, currencyId) {
            return [
                String(feeTypeZ || ''),
                String(vendorId || ''),
                String(currencyId || '')
            ].join('_');
        }

        function buildFirstLegHistoricalDiffMatchFilter(fieldId, value) {
            if (value || value === 0) {
                return [fieldId, 'anyof', String(value)];
            }
            return [fieldId, 'anyof', '@NONE@'];
        }

        /**
         * 读取历史头程费用行。
         * 待处理差异 = 历史差异 - 已处理差异
         * 其中已处理差异为空按 0，结果允许出现负数，保持原值参与后续计算。
         */
        function getHistoricalDiffSourceRows(currentWlPlanId, feeTypeZ, vendorId, currencyId) {
            var sourceRows = [];
            var filters = [
                ['isinactive', 'is', 'F'],
                'AND',
                ['custrecord_swc_wl_first_leg_cost_id', 'noneof', String(currentWlPlanId || '')],
                'AND',
                [FIELD_FLC_FEE_TYPE_Z, 'anyof', String(feeTypeZ || '')],
                'AND',
                buildFirstLegHistoricalDiffMatchFilter(FIELD_WL_FLC_LOCATION, vendorId),
                'AND',
                buildFirstLegHistoricalDiffMatchFilter(FIELD_WL_FLC_YG_CURRENCY, currencyId)
            ];

            var historicalSearch = search.create({
                type: RECORD_TYPE_WL_FIRST_LEG_COST,
                filters: filters,
                columns: [
                    search.createColumn({ name: 'datecreated', sort: search.Sort.ASC }),
                    search.createColumn({ name: 'internalid', sort: search.Sort.ASC }),
                    search.createColumn({ name: FIELD_WL_FLC_HISTORY_DIFF }),
                    search.createColumn({ name: FIELD_WL_FLC_HISTORY_HANDLED })
                ]
            });

            historicalSearch.run().each(function (result) {
                var historicalDiff = round2(toNumber(result.getValue({ name: FIELD_WL_FLC_HISTORY_DIFF })));
                var handledDiff = round2(toNumber(result.getValue({ name: FIELD_WL_FLC_HISTORY_HANDLED })));
                sourceRows.push({
                    id: result.getValue({ name: 'internalid' }),
                    historicalDiff: historicalDiff,
                    handledDiff: handledDiff,
                    remainingPending: round2(historicalDiff - handledDiff),
                    handledDelta: 0
                });
                return true;
            });

            return sourceRows;
        }

        function getHistoricalDiffTotal(sourceRows) {
            var total = 0;
            for (var i = 0; i < sourceRows.length; i++) {
                total = round2(total + toNumber(sourceRows[i].remainingPending));
            }
            return round2(total);
        }

        /**
         * 正数只消费正向待处理差异，负数只消费负向待处理差异。
         * 这样可以避免同 key 下正负历史差异互相覆盖。
         */
        function consumeHistoricalDiffRows(sourceRows, amount, collectHandledDelta) {
            amount = round2(toNumber(amount));
            if (!amount) {
                return 0;
            }

            var remainingAmount = amount;
            for (var i = 0; i < sourceRows.length; i++) {
                var row = sourceRows[i];
                var pending = round2(toNumber(row.remainingPending));
                var usedAmount = 0;

                if (remainingAmount > 0) {
                    if (pending <= 0) continue;
                    usedAmount = round2(Math.min(remainingAmount, pending));
                } else {
                    if (pending >= 0) continue;
                    usedAmount = round2(Math.max(remainingAmount, pending));
                }

                if (!usedAmount) {
                    continue;
                }

                row.remainingPending = round2(pending - usedAmount);
                if (collectHandledDelta) {
                    row.handledDelta = round2(toNumber(row.handledDelta) + usedAmount);
                }
                remainingAmount = round2(remainingAmount - usedAmount);

                if (!remainingAmount) {
                    break;
                }
            }

            return round2(amount - remainingAmount);
        }

        function getHistoricalDiffCacheEntry(cacheMap, currentWlPlanId, feeTypeZ, vendorId, currencyId) {
            var cacheKey = buildFirstLegHistoricalDiffKey(feeTypeZ, vendorId, currencyId);
            if (!cacheMap[cacheKey]) {
                cacheMap[cacheKey] = {
                    cacheKey: cacheKey,
                    feeTypeZ: String(feeTypeZ || ''),
                    vendorId: String(vendorId || ''),
                    currencyId: String(currencyId || ''),
                    sourceRows: getHistoricalDiffSourceRows(currentWlPlanId, feeTypeZ, vendorId, currencyId)
                };
            }
            return cacheMap[cacheKey];
        }

        /**
         * 当前行历史差异口径：
         * 1. 先取同 key 历史待处理差异净额
         * 2. 历史差异字段金额不能大于本次预估金额
         * 3. 负数历史差异保留负值参与计算
         */
        function reserveHistoricalDiffAmount(cacheEntry, estimateFee) {
            var availableAmount = getHistoricalDiffTotal(cacheEntry.sourceRows);
            var reservedAmount = round2(Math.min(toNumber(estimateFee), availableAmount));
            consumeHistoricalDiffRows(cacheEntry.sourceRows, reservedAmount, false);
            return reservedAmount;
        }

        function applyHistoricalDiffHandledAmount(cacheEntry, historicalDiffAmount) {
            return consumeHistoricalDiffRows(cacheEntry.sourceRows, historicalDiffAmount, true);
        }

        function writeHistoricalDiffHandledChanges(cacheMap) {
            var summaryList = [];
            var keyList = Object.keys(cacheMap || {});
            for (var i = 0; i < keyList.length; i++) {
                var entry = cacheMap[keyList[i]];
                if (!entry || !entry.sourceRows || !entry.sourceRows.length) continue;

                for (var j = 0; j < entry.sourceRows.length; j++) {
                    var row = entry.sourceRows[j];
                    if (!toNumber(row.handledDelta)) continue;

                    var newHandledAmount = round2(toNumber(row.handledDiff) + toNumber(row.handledDelta));
                    var values = {};
                    values[FIELD_WL_FLC_HISTORY_HANDLED] = newHandledAmount;

                    record.submitFields({
                        type: RECORD_TYPE_WL_FIRST_LEG_COST,
                        id: row.id,
                        values: values,
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });

                    summaryList.push({
                        feeTypeZ: entry.feeTypeZ,
                        vendorId: entry.vendorId,
                        currencyId: entry.currencyId,
                        sourceLineId: row.id,
                        historicalDiff: row.historicalDiff,
                        originalHandled: row.handledDiff,
                        handledDelta: row.handledDelta,
                        newHandled: newHandledAmount
                    });
                }
            }
            return summaryList;
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
                }).filter(function (id) {
                    return !!id;
                });
                return ids.length > 0 ? ids[0] : '';
            }

            return '';
        }

        function applyVendorPaymentTerms(tranRec, vendorId) {
            if (!tranRec || !vendorId) return;
            if (!tranRec.getField({ fieldId: 'custbody_swc_vendor_payment_terms' })) return;

            var paymentTerms = getFirstVendorPaymentTerms(vendorId);
            if (paymentTerms) {
                tranRec.setValue({
                    fieldId: 'custbody_swc_vendor_payment_terms',
                    value: paymentTerms
                });
            }
        }


        /**
         * 注册所有可调用动作与处理方法的映射关系。
         */
        function getActionHandlers() {
            return {
                feePoCreate: feePoCreate,                         // 生成头程费用采购订单
                createIfRecord: createIfRecord,                   // 预估杂费分摊
                upDataPoSubListLine: upDataPoSubListLine,         // 采购订单明细行更新
                feeEstimatedCos: feeEstimatedCos,                 // 预估费用
                fee_ar_to: fee_ar_to,                             // 费用类型采购订单审批
                feeApportion: feeApportion,                       // 费用分摊
                workOrderAssembly: workOrderAssembly,             // 工单组装
                tcFeePoCreate: tcFeePoCreate,                     // 头程类费用订单生成
                feeApportionSj: feeApportionSj,                   // 实际费用分摊
                wlRm: wlRm,                                       // 物流发运单据无效
                poZfCy: poZfCy,                                   // 采购杂费差异账单生成
                fee_po_sp: fee_po_sp,                             // 费用类型采购订单重新审批
                fee_po_sp_tc: fee_po_sp_tc,                       // 头程采购订单重新审批
                onClickFeePoCreate: onClickFeePoCreate,           // 调拨费采购订单类型做成
                fee_ar_to_db: fee_ar_to_db,                       // 调拨费采购订单类型做成
                onClickReapply: onClickReapply,                   // 调拨费重新提交
                onClickApproveOk: onClickApproveOk,               // 采购调拨费分摊
                poToIf: poToIf,                                   // 采购订单入库
                supplierShippedCn: supplierShippedCn,             // 供应商已出货
                customsDeclared: customsDeclared,                 // 报关
                clearedCustoms: clearedCustoms,                   // 清关
                onClickInOutCreate: onClickInOutCreate,           // 采购入库调拨

                onClickInOutCreate_hw: onClickInOutCreate_hw,
                onClickFeePoCreate_hw: onClickFeePoCreate_hw,
                onClickApproveOk_hw: onClickApproveOk_hw,
                onClickReapply_hw: onClickReapply_hw,
                differentialBillingCompleted_hw: differentialBillingCompletedHw,
                differentialBillingCompleted_hw_actual: differentialBillingCompletedHw,

                feeApportionSjWc: feeApportionSjWc


            };
        }

        /**
         * 预估费用做成（按钮：只处理当前物流发运单）
         * 需求实现点：
         * 1) 同一真实排柜单号（wl_actual_cabinet）下可能有多个物流发运单（customrecord_swc_wl_plan_order）
         * 2) 每次点击按钮只分摊“当前单”，按“当前单体积 / 同柜总体积”占比分摊
         * 3) 最后一个未处理的物流发运单：用“总额 - 其它已处理单的分摊合计”做尾差闭合
         * 4) 分摊成功后不允许点击第二次：如果当前单 estimated_cost_status=1 则直接返回，不做任何事
         */
        function feeEstimatedCos(id) {
            log.debug('预估费用做成开始', id);
            var result_str = {};

            try {
                var rec = record.load({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: id,
                    isDynamic: false
                });

                // 防止重复点击，已处理单据直接返回。
                var curStatus = rec.getValue({ fieldId: FIELD_WL_TC_FT_FLAG });
                if (String(curStatus) === '1') {
                    result_str.data = '该物流发运单已做过预估费用分摊，无法重复执行。';
                    return result_str;
                }

                var wl_actual_cabinet = rec.getValue({ fieldId: FIELD_WL_ACTUAL_CABINET });
                if (!wl_actual_cabinet) {
                    result_str.data = '请正确填写【真实排柜单号】！';
                    return result_str;
                }

                var md_location = rec.getValue({ fieldId: FIELD_MD_LOCATION });
                var transferWay = rec.getValue({ fieldId: 'custrecord_swc_wl_trasfer_way' });
                var termsOfTrade = rec.getValue({ fieldId: FIELD_WL_TERMS_OF_TRADE });
                var cgSubWarehouse = rec.getValue({ fieldId: 'custrecord_swc_cg_sub_warehouse' });
                var isOverseasFob = String(termsOfTrade || '') === '5';
                var onlyDomesticFobPortFees = String(md_location || '') === '41'
                    && String(transferWay || '') !== '4'
                    && String(transferWay || '') !== '5';
                var shouldRestrictDestinationPortTruckingFee = String(md_location || '') === '41';
                var canProcessDestinationPortTruckingFee = !shouldRestrictDestinationPortTruckingFee
                    || (
                        (String(transferWay || '') === '4' || String(transferWay || '') === '5')
                        && !!cgSubWarehouse
                    );
                var domesticFobAllowedFeeTypes = { '1': true, '2': true, '3': true };
                var overseasFobSkippedFeeTypes = { '1': true, '2': true, '3': true };
                var domesticForwarderPortDivisorMap = {
                    '1': 58.65,
                    '2': 65,
                    '3': 65,
                    '6': 73.1,
                    '9': 77.58
                };

                // 读取合约柜/非合约柜。
                var cabinet = rec.getValue({ fieldId: 'custrecord_swc_contract_cabinet1' });

                // 读取全链路/到港。
                var full_link = rec.getValue({ fieldId: 'custrecord_swc_fy_full_link' });

                // 读取货柜尺寸。
                var zg_size = rec.getValue({ fieldId: 'custrecord_swc_wl_zg_size' });

                // 读取起运港。
                var sta_gk = rec.getValue({ fieldId: 'custrecord_swc_wl_rm_sta_gk' });

                var loading_city = rec.getValue({ fieldId: FIELD_WL_LOADING_CITY }) || '';

                // 读取目的港。
                var md_lc = rec.getValue({ fieldId: 'custrecord_swc_wl_md_lc' });

                var destination_country = rec.getValue({ fieldId: FIELD_WL_DESTINATION_COUNTRY }) || '';
                var createDate = formatSearchDate(rec.getValue({ fieldId: 'custrecord_swc_create_date' })) || 'today';
                var eg_cost_id_sub_id = SUBLIST_WL_FIRST_LEG_COST;
                var lineCount = rec.getLineCount({ sublistId: eg_cost_id_sub_id });
                var activeFeeTypeIds = collectActiveFeeTypeIds(rec, eg_cost_id_sub_id, onlyDomesticFobPortFees, domesticFobAllowedFeeTypes, isOverseasFob, overseasFobSkippedFeeTypes, canProcessDestinationPortTruckingFee);
                var feeLineDecisionList = getFeeEstimatedLineDecisionList(rec, eg_cost_id_sub_id, onlyDomesticFobPortFees, domesticFobAllowedFeeTypes, isOverseasFob, overseasFobSkippedFeeTypes, canProcessDestinationPortTruckingFee);
                log.audit('FEE_EST_PROCESS_DECISION', {
                    wlPlanId: id,
                    destinationWarehouseId: md_location,
                    destinationWarehouseName: rec.getText({ fieldId: FIELD_MD_LOCATION }) || '',
                    cgSubWarehouseId: cgSubWarehouse || '',
                    cgSubWarehouseName: cgSubWarehouse ? (rec.getText({ fieldId: 'custrecord_swc_cg_sub_warehouse' }) || '') : '',
                    termsOfTradeId: termsOfTrade || '',
                    termsOfTradeName: rec.getText({ fieldId: FIELD_WL_TERMS_OF_TRADE }) || '',
                    transferWayId: transferWay,
                    transferWayName: rec.getText({ fieldId: 'custrecord_swc_wl_trasfer_way' }) || '',
                    onlyDomesticFobPortFees: onlyDomesticFobPortFees,
                    canProcessDestinationPortTruckingFee: canProcessDestinationPortTruckingFee,
                    domesticFobAllowedFeeTypes: Object.keys(domesticFobAllowedFeeTypes),
                    isOverseasFob: isOverseasFob,
                    overseasFobSkippedFeeTypes: Object.keys(overseasFobSkippedFeeTypes),
                    skippedFeeTypesAlways: ['4', '7'],
                    activeFeeTypeIds: activeFeeTypeIds,
                    feeLineDecisionList: feeLineDecisionList
                });
                var requiredQuotationFields = getQuotationRequiredFields(getQuotationRuleConfigMap(activeFeeTypeIds), activeFeeTypeIds);
                if (requiredQuotationFields.destinationWarehouse && !md_location) {
                    result_str.data = '请正确填写【目的仓】！';
                    return result_str;
                }
                if (requiredQuotationFields.contractCabinet && !cabinet) {
                    result_str.data = '请正确填写【合约柜/非合约柜】！';
                    return result_str;
                }
                if (requiredQuotationFields.fullLink && !full_link) {
                    result_str.data = '请正确填写【全链路/到港】！';
                    return result_str;
                }
                if (requiredQuotationFields.containerSize && !zg_size) {
                    result_str.data = '请正确填写【货柜尺寸】！';
                    return result_str;
                }
                if (requiredQuotationFields.portOfLoading && !sta_gk) {
                    result_str.data = '请正确填写【起运港】！';
                    return result_str;
                }
                if (requiredQuotationFields.loadingCity && !loading_city) {
                    result_str.data = '请正确填写【装货城市】！';
                    return result_str;
                }
                if (requiredQuotationFields.portOfDestination && !md_lc) {
                    result_str.data = '请正确填写【目的港】！';
                    return result_str;
                }
                if (requiredQuotationFields.country && !destination_country) {
                    result_str.data = '请正确填写【运抵国】！';
                    return result_str;
                }

                // 1) 取同柜下所有物流发运单体积与“已处理数量”
                var cabInfo = getCabinetPlanInfo(wl_actual_cabinet, String(id));
                if (!cabInfo || cabInfo.totalCount <= 0) {
                    result_str.data = '未找到该真实排柜单号下的物流发运单，请确认！';
                    return result_str;
                }
                if (cabInfo.totalVol <= 0 || cabInfo.curVol <= 0) {
                    result_str.data = '费用分摊失败：总体积或当前单体积为0，请确认体积字段（custrecord_swc_wl_total_volume）。';
                    return result_str;
                }

                // 是否最后一个未处理单：已处理数 == 总数-1 且当前未处理
                var isLast = (cabInfo.processedCount === cabInfo.totalCount - 1);

                // 当前单体积占比
                var ratio = cabInfo.curVol / cabInfo.totalVol;

                // 2) 当前单明细承运商列表（去重）
                var vendorSet = {};
                for (var x = 0; x < lineCount; x++) {
                    var lineFeeTypeZForVendor = rec.getSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: FIELD_FLC_FEE_TYPE_Z,
                        line: x
                    });
                    if (onlyDomesticFobPortFees && !domesticFobAllowedFeeTypes[String(lineFeeTypeZForVendor || '')]) {
                        continue;
                    }
                    if (isOverseasFob && overseasFobSkippedFeeTypes[String(lineFeeTypeZForVendor || '')]) {
                        continue;
                    }
                    if (String(lineFeeTypeZForVendor || '') === '9' && !canProcessDestinationPortTruckingFee) {
                        continue;
                    }

                    var flc_location = rec.getSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: FIELD_WL_FLC_LOCATION,
                        line: x
                    });
                    if (flc_location) vendorSet[String(flc_location)] = true;
                }
                var vendorList = Object.keys(vendorSet);
                if (vendorList.length === 0) {
                    result_str.data = '请正确填写明细【承运商】！';
                    return result_str;
                }

                // 3) 取“整柜报价总额”（按 中类/小类/承运商 维度）


                var tatalMapJson = {
                    cabinet: cabinet,
                    full_link: full_link,
                    zg_size: zg_size,
                    loading_city: loading_city,
                    sta_gk: sta_gk,
                    md_lc: md_lc,
                    md_location: md_location,
                    destination_country: destination_country,
                    createDate: createDate,
                    feeTypeIds: activeFeeTypeIds,
                    vendorList: vendorList
                }

                var quoteTotalMap = getQuotationTotalMap(tatalMapJson);
                log.audit('FEE_EST_QUOTATION_TOTAL_MAP', {
                    wlPlanId: id,
                    activeFeeTypeIds: activeFeeTypeIds,
                    quoteTotalMapKeys: Object.keys(quoteTotalMap || {}),
                    quoteTotalMap: quoteTotalMap
                });
                if (!quoteTotalMap || Object.keys(quoteTotalMap).length === 0) {
                    result_str.data = '物流商服务报价当前无匹配数据，请确认！';
                    return result_str;
                }

                // 4) 取“同柜其它已处理单”的已分摊合计（排除当前单），用于最后一单尾差
                var allocatedMap = getAllocatedEstimatedMapByCabinetExcludeCurrent(wl_actual_cabinet, String(id));
                var historicalDiffCacheMap = {};

                // 5) 回写当前单：非最后=总额*ratio；最后=总额-已分摊
                for (var i = 0; i < lineCount; i++) {
                    var fee_type_z = rec.getSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: FIELD_FLC_FEE_TYPE_Z,
                        line: i
                    });
                    if (String(fee_type_z) === '4' || String(fee_type_z) === '7') continue;
                    if (onlyDomesticFobPortFees && !domesticFobAllowedFeeTypes[String(fee_type_z || '')]) continue;
                    if (isOverseasFob && overseasFobSkippedFeeTypes[String(fee_type_z || '')]) continue;
                    if (String(fee_type_z || '') === '9' && !canProcessDestinationPortTruckingFee) continue;

                    var fee_type_x = rec.getSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: 'custrecord_swc_wl_flc_fee_type_x',
                        line: i
                    });
                    var flc_location2 = rec.getSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: FIELD_WL_FLC_LOCATION,
                        line: i
                    });

                    var key = String(fee_type_z) + '_' + String(fee_type_x) + '_' + String(flc_location2);

                    if (!quoteTotalMap.hasOwnProperty(key)) {
                        log.audit('FEE_EST_LINE_NO_QUOTATION_MATCH', {
                            wlPlanId: id,
                            line: i,
                            feeTypeZ: fee_type_z,
                            feeTypeZText: rec.getSublistText({ sublistId: eg_cost_id_sub_id, fieldId: FIELD_FLC_FEE_TYPE_Z, line: i }) || '',
                            feeTypeX: fee_type_x,
                            feeTypeXText: rec.getSublistText({ sublistId: eg_cost_id_sub_id, fieldId: 'custrecord_swc_wl_flc_fee_type_x', line: i }) || '',
                            carrierId: flc_location2,
                            carrierName: rec.getSublistText({ sublistId: eg_cost_id_sub_id, fieldId: FIELD_WL_FLC_LOCATION, line: i }) || '',
                            expectedKey: key,
                            quoteTotalMapKeys: Object.keys(quoteTotalMap || {})
                        });
                        continue;
                    }

                    var totalPirca = toNumber(quoteTotalMap[key].pircaTotal);
                    var toSet = 0;
                    var domesticForwarderDivisor = onlyDomesticFobPortFees && String(fee_type_z || '') === '3'
                        ? domesticForwarderPortDivisorMap[String(sta_gk || '')]
                        : null;

                    if (domesticForwarderDivisor) {
                        toSet = round2(totalPirca / domesticForwarderDivisor * cabInfo.curVol);
                    } else if (isLast) {
                        var already = toNumber(allocatedMap[key]);
                        toSet = round2(totalPirca - already);
                        if (toSet < 0) toSet = 0; // 防止被手工改坏导致负数
                    } else {
                        toSet = round2(totalPirca * ratio);
                    }

                    rec.setSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: FIELD_WL_FLC_YG_FEE,
                        value: toSet,
                        line: i
                    });
                    rec.setSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: FIELD_WL_FLC_YG_CURRENCY,
                        value: quoteTotalMap[key].currency || null,
                        line: i
                    });
                    // 同步带出历史差异，后续头程预估费用分摊直接使用“预估金额 - 历史差异金额”的口径。
                    var historicalDiffEntry = getHistoricalDiffCacheEntry(
                        historicalDiffCacheMap,
                        id,
                        fee_type_z,
                        flc_location2,
                        quoteTotalMap[key].currency || ''
                    );
                    var historicalDiffAmount = reserveHistoricalDiffAmount(historicalDiffEntry, toSet);
                    rec.setSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: FIELD_WL_FLC_HISTORY_DIFF,
                        value: historicalDiffAmount,
                        line: i
                    });
                    rec.setSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: 'custrecord_swc_wl_flc_allocation_rules',
                        value: quoteTotalMap[key].allocation_rules || null,
                        line: i
                    });
                }

                // 6) 处理完成后：状态置 1，禁止再次点击
                rec.setValue({ fieldId: FIELD_WL_TC_FT_FLAG, value: 1 });
                rec.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 7 });

                rec.save({ ignoreMandatoryFields: false });

                result_str.data = isLast ? '预估费用成功（最后一单已做尾差处理）' : '预估费用成功';
                return result_str;

            } catch (e) {
                log.error('预估费用异常', e);
                result_str.data = getSafeActionErrorMessage(e, '预估费用失败,请联系管理人员');
                return result_str;
            }
        }

        /**
         * 同柜物流发运单信息：总数、已处理数、总体积、当前体积
         * 处理判定：custrecord_swc_wl_estimated_cost_status == 1 视为已处理
         */
        function getCabinetPlanInfo(cabinetId, currentPlanId) {
            var totalCount = 0;
            var processedCount = 0;
            var totalVol = 0;
            var curVol = 0;

            var s = search.create({
                type: RECORD_TYPE_WL_PLAN_ORDER,
                filters: [
                    [FIELD_WL_ACTUAL_CABINET, 'anyof', String(cabinetId)]
                ],
                columns: [
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: FIELD_WL_TOTAL_VOLUME }),
                    search.createColumn({ name: FIELD_WL_TC_FT_FLAG })
                ]
            });

            // 拉取完整搜索结果，避免标准 search 结果数量上限影响分摊计算。
            var rs = getAllResults(s) || [];
            for (var i = 0; i < rs.length; i++) {
                totalCount++;

                var pid = String(rs[i].getValue({ name: 'internalid' }) || '');
                var vol = toNumber(rs[i].getValue({ name: FIELD_WL_TOTAL_VOLUME }));
                var st = String(rs[i].getValue({ name: FIELD_WL_TC_FT_FLAG }) || '');

                totalVol += vol;

                if (st === '1') processedCount++;

                if (pid === String(currentPlanId)) {
                    curVol = vol;
                }
            }

            return {
                totalCount: totalCount,
                processedCount: processedCount,
                totalVol: totalVol,
                curVol: curVol
            };
        }

        /**
         * 报价总额 Map：按 中类/小类/承运商 维度
         * key = cost_medium + '_' + rm_cost_s + '_' + logistics_provider
         * 注意：这里返回的是“整柜总额 pircaTotal”，不乘占比
         */
        function getQuotationTotalMap(tatalMapJson) {

            var cabinet = tatalMapJson.cabinet;
            var full_link = tatalMapJson.full_link;
            var zg_size = tatalMapJson.zg_size;
            var loading_city = tatalMapJson.loading_city;
            var sta_gk = tatalMapJson.sta_gk;
            var md_lc = tatalMapJson.md_lc;
            var md_location = tatalMapJson.md_location;
            var destination_country = tatalMapJson.destination_country;
            var createDate = tatalMapJson.createDate || 'today';
            var feeTypeIds = tatalMapJson.feeTypeIds || [];
            var vendorList = tatalMapJson.vendorList;

            var map = {};

            /**
             * 统一处理检索结果，保证原有输出逻辑不变
             * @param rs
             */
            function handleResults(rs) {
                rs = rs || [];
                for (var i = 0; i < rs.length; i++) {
                    var cost_medium = rs[i].getValue({ name: "custrecord_swc_lp_cost_medium" });
                    var rm_cost_s = rs[i].getValue({ name: "custrecord_swc_lp_rm_cost_s" });
                    var allocation_rules = rs[i].getValue({ name: "custrecord_swc_lp_allocation_rules" });
                    var currency = rs[i].getValue({ name: "custrecord_swc_lp_currency" }) || null;

                    var lp = rs[i].getValue({
                        name: "custrecord_swc_lp_logistics_provider",
                        join: "CUSTRECORD_SWC_LPD_LP"
                    });

                    // 先取数值，再进行后续计算
                    var pircaTotal = toNumber(rs[i].getValue({ name: "custrecord_swc_lp_pirca" }));

                    var key = String(cost_medium) + '_' + String(rm_cost_s) + '_' + String(lp);

                    // 同 key 多行时累加
                    if (!map[key]) {
                        map[key] = {
                            allocation_rules: allocation_rules,
                            pircaTotal: pircaTotal,
                            currency: currency
                        };
                    } else {
                        map[key].pircaTotal = round2(toNumber(map[key].pircaTotal) + pircaTotal);
                        map[key].allocation_rules = allocation_rules;
                        map[key].currency = currency;
                    }
                }
            }

            /*
             * 旧版本获取头程费用
             *
             * // 第一步：执行常规报价检索，排除费用中类 101。
             * var s = search.create({
             *     type: RECORD_TYPE_SERVICE_QUOTATION_DETAIL,
             *     filters: [
             *         ["custrecord_swc_lpd_lp.custrecord_swc_lp_start_date", "onorbefore", "today"],
             *         "AND",
             *         ["custrecord_swc_lpd_lp.custrecord_swc_lp_end_date", "onorafter", "today"],
             *         "AND",
             *         ["custrecord_swc_lpd_lp.custrecord_swc_lp_logistics_provider", "anyof", vendorList],
             *         "AND",
             *         ["custrecord_swc_lpd_lp.custrecord_swc_lp_to_location", "anyof", md_location],
             *         "AND",
             *         ["custrecord_swc_lpd_lp.custrecord_swc_container_size", "anyof", zg_size],
             *         "AND",
             *         ["custrecord_swc_lpd_lp.custrecord_swc_destination_port", "anyof", md_lc],
             *         "AND",
             *         ["custrecord_swc_lpd_lp.custrecord_swc_contract_cabinet", "anyof", cabinet],
             *         "AND",
             *         ["custrecord_swc_lpd_lp.custrecord_swc_full_link", "anyof", full_link],
             *         "AND",
             *         ["custrecord_swc_lpd_lp.custrecord_swc_port_of_loading", "anyof", sta_gk],
             *         "AND",
             *         ["custrecord_swc_lp_cost_medium", "noneof", "101"]
             *     ],
             *     columns: [
             *         search.createColumn({ name: "custrecord_swc_lp_cost_medium" }),
             *         search.createColumn({ name: "custrecord_swc_lp_rm_cost_s" }),
             *         search.createColumn({ name: "custrecord_swc_lp_allocation_rules" }),
             *         search.createColumn({ name: "custrecord_swc_lp_pirca" }),
             *         search.createColumn({ name: "custrecord_swc_lp_currency" }),
             *         search.createColumn({
             *             name: "custrecord_swc_lp_logistics_provider",
             *             join: "CUSTRECORD_SWC_LPD_LP"
             *         })
             *     ]
             * });
             *
             * var rs = getAllResults(s) || [];
             * handleResults(rs);
             *
             * // 第二步：补充检索费用中类 101，仅按目的仓和柜型匹配。
             * var s101 = search.create({
             *     type: RECORD_TYPE_SERVICE_QUOTATION_DETAIL,
             *     filters: [
             *         ["custrecord_swc_lpd_lp.custrecord_swc_lp_to_location", "anyof", md_location],
             *         "AND",
             *         ["custrecord_swc_lpd_lp.custrecord_swc_contract_cabinet", "anyof", cabinet],
             *         "AND",
             *         ["custrecord_swc_lp_cost_medium", "anyof", "101"]
             *     ],
             *     columns: [
             *         search.createColumn({ name: "custrecord_swc_lp_cost_medium" }),
             *         search.createColumn({ name: "custrecord_swc_lp_rm_cost_s" }),
             *         search.createColumn({ name: "custrecord_swc_lp_allocation_rules" }),
             *         search.createColumn({ name: "custrecord_swc_lp_pirca" }),
             *         search.createColumn({ name: "custrecord_swc_lp_currency" }),
             *         search.createColumn({
             *             name: "custrecord_swc_lp_logistics_provider",
             *             join: "CUSTRECORD_SWC_LPD_LP"
             *         })
             *     ]
             * });
             *
             * var rs101 = getAllResults(s101) || [];
             * handleResults(rs101);
             */

            if (!vendorList || vendorList.length === 0 || !feeTypeIds || feeTypeIds.length === 0) {
                return map;
            }

            var ruleConfigMap = getQuotationRuleConfigMap(feeTypeIds);
            feeTypeIds.forEach(function (feeTypeId) {
                var ruleConfig = ruleConfigMap[String(feeTypeId)] || getEmptyQuotationRuleConfig();
                if (!hasRequiredQuotationContext(ruleConfig, {
                    cabinet: cabinet,
                    full_link: full_link,
                    zg_size: zg_size,
                    loading_city: loading_city,
                    sta_gk: sta_gk,
                    md_lc: md_lc,
                    md_location: md_location,
                    destination_country: destination_country
                })) {
                    return;
                }

                var quotationContext = {
                    feeTypeId: feeTypeId,
                    vendorList: vendorList,
                    cabinet: cabinet,
                    full_link: full_link,
                    zg_size: zg_size,
                    loading_city: loading_city,
                    sta_gk: sta_gk,
                    md_lc: md_lc,
                    md_location: md_location,
                    destination_country: destination_country,
                    createDate: createDate
                };
                var quotationParentFilters = buildQuotationParentFiltersByRule(quotationContext, ruleConfig);
                var quotationParentIds = getQuotationParentIds(quotationParentFilters, feeTypeId, ruleConfig, quotationContext);
                if (!quotationParentIds || quotationParentIds.length === 0) return;
                var quotationFilters = buildQuotationDetailFilters(quotationParentIds, feeTypeId);

                log.audit('FEE_EST_QUOTATION_SEARCH_FILTERS', {
                    feeTypeId: feeTypeId,
                    ruleConfig: ruleConfig,
                    context: quotationContext,
                    parentFilters: quotationParentFilters,
                    parentIds: quotationParentIds,
                    filters: quotationFilters
                });

                var quotationSearch = search.create({
                    type: RECORD_TYPE_SERVICE_QUOTATION_DETAIL,
                    filters: quotationFilters,
                    columns: [
                        search.createColumn({ name: "custrecord_swc_lp_cost_medium" }),
                        search.createColumn({ name: "custrecord_swc_lp_rm_cost_s" }),
                        search.createColumn({ name: "custrecord_swc_lp_allocation_rules" }),
                        search.createColumn({ name: "custrecord_swc_lp_pirca" }),
                        search.createColumn({ name: "custrecord_swc_lp_currency" }),
                        search.createColumn({
                            name: "custrecord_swc_lp_logistics_provider",
                            join: "CUSTRECORD_SWC_LPD_LP"
                        })
                    ]
                });
                try {
                    handleResults(getAllResults(quotationSearch) || []);
                } catch (e) {
                    log.error('FEE_EST_QUOTATION_SEARCH_ERROR', {
                        feeTypeId: feeTypeId,
                        ruleConfig: ruleConfig,
                        context: quotationContext,
                        parentFilters: quotationParentFilters,
                        parentIds: quotationParentIds,
                        filters: quotationFilters,
                        errorName: e.name,
                        errorMessage: e.message,
                        errorStack: e.stack
                    });
                    throw e;
                }
            });

            return map;
        }

        function collectActiveFeeTypeIds(rec, sublistId, onlyDomesticFobPortFees, domesticFobAllowedFeeTypes, isOverseasFob, overseasFobSkippedFeeTypes, canProcessDestinationPortTruckingFee) {
            var feeTypeMap = {};
            var lineCount = rec.getLineCount({ sublistId: sublistId }) || 0;
            for (var i = 0; i < lineCount; i++) {
                var feeTypeId = rec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: FIELD_FLC_FEE_TYPE_Z,
                    line: i
                }) || '';
                feeTypeId = String(feeTypeId);
                if (!feeTypeId || feeTypeId === '4' || feeTypeId === '7') continue;
                if (onlyDomesticFobPortFees && !domesticFobAllowedFeeTypes[feeTypeId]) continue;
                if (isOverseasFob && overseasFobSkippedFeeTypes && overseasFobSkippedFeeTypes[feeTypeId]) continue;
                if (feeTypeId === '9' && !canProcessDestinationPortTruckingFee) continue;
                feeTypeMap[feeTypeId] = true;
            }
            return Object.keys(feeTypeMap);
        }

        function getFeeEstimatedLineDecisionList(rec, sublistId, onlyDomesticFobPortFees, domesticFobAllowedFeeTypes, isOverseasFob, overseasFobSkippedFeeTypes, canProcessDestinationPortTruckingFee) {
            var lineCount = rec.getLineCount({ sublistId: sublistId }) || 0;
            var list = [];
            for (var i = 0; i < lineCount; i++) {
                var feeTypeId = String(rec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: FIELD_FLC_FEE_TYPE_Z,
                    line: i
                }) || '');
                var reason = '';
                if (!feeTypeId) {
                    reason = '费用中类为空';
                } else if (feeTypeId === '4' || feeTypeId === '7') {
                    reason = '固定跳过费用中类4/7';
                } else if (onlyDomesticFobPortFees && !domesticFobAllowedFeeTypes[feeTypeId]) {
                    reason = '目的仓41且运输方式不是4/5时，只处理1/2/3';
                } else if (isOverseasFob && overseasFobSkippedFeeTypes && overseasFobSkippedFeeTypes[feeTypeId]) {
                    reason = '海外FOB跳过1/2/3';
                } else if (feeTypeId === '9' && !canProcessDestinationPortTruckingFee) {
                    reason = '中类9在目的仓41时需要运输方式4/5且采购子仓不为空';
                }

                list.push({
                    line: i,
                    feeTypeId: feeTypeId,
                    feeTypeName: feeTypeId ? (rec.getSublistText({ sublistId: sublistId, fieldId: FIELD_FLC_FEE_TYPE_Z, line: i }) || '') : '',
                    feeTypeX: rec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_flc_fee_type_x', line: i }) || '',
                    feeTypeXName: rec.getSublistText({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_flc_fee_type_x', line: i }) || '',
                    carrierId: rec.getSublistValue({ sublistId: sublistId, fieldId: FIELD_WL_FLC_LOCATION, line: i }) || '',
                    carrierName: rec.getSublistText({ sublistId: sublistId, fieldId: FIELD_WL_FLC_LOCATION, line: i }) || '',
                    willProcess: reason === '',
                    skippedReason: reason
                });
            }
            return list;
        }

        function getQuotationRuleConfigMap(feeTypeIds) {
            var configMap = {};
            if (!feeTypeIds || feeTypeIds.length === 0) return configMap;

            var ruleSearch = search.create({
                type: RECORD_TYPE_COST_QUOTATION_VALUE_RULE,
                filters: [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['custrecord_swc_expense_item_mediu_cate', 'anyof', feeTypeIds]
                ],
                columns: [
                    search.createColumn({ name: 'custrecord_swc_expense_item_mediu_cate' }),
                    search.createColumn({ name: 'custrecord_swc_gz_container_size' }),
                    search.createColumn({ name: 'custrecord_swc_gz_loading_city' }),
                    search.createColumn({ name: 'custrecord_swc_gz_port_of_loading' }),
                    search.createColumn({ name: 'custrecord_swc_gz_port_of_destination' }),
                    search.createColumn({ name: 'custrecord_swc_gz_destination_warehouse' }),
                    search.createColumn({ name: 'custrecord_swc_contract_counter_non_co' }),
                    search.createColumn({ name: 'custrecord_swc_full_link_arrival_at_po' }),
                    search.createColumn({ name: 'custrecord_swc_gz_country' })
                ]
            });

            (getAllResults(ruleSearch) || []).forEach(function (result) {
                var feeTypeId = String(result.getValue({ name: 'custrecord_swc_expense_item_mediu_cate' }) || '');
                if (!feeTypeId) return;
                configMap[feeTypeId] = {
                    containerSize: toCheckboxBool(result.getValue({ name: 'custrecord_swc_gz_container_size' })),
                    loadingCity: toCheckboxBool(result.getValue({ name: 'custrecord_swc_gz_loading_city' })),
                    portOfLoading: toCheckboxBool(result.getValue({ name: 'custrecord_swc_gz_port_of_loading' })),
                    portOfDestination: toCheckboxBool(result.getValue({ name: 'custrecord_swc_gz_port_of_destination' })),
                    destinationWarehouse: toCheckboxBool(result.getValue({ name: 'custrecord_swc_gz_destination_warehouse' })),
                    contractCabinet: toCheckboxBool(result.getValue({ name: 'custrecord_swc_contract_counter_non_co' })),
                    fullLink: toCheckboxBool(result.getValue({ name: 'custrecord_swc_full_link_arrival_at_po' })),
                    country: toCheckboxBool(result.getValue({ name: 'custrecord_swc_gz_country' }))
                };
            });

            return configMap;
        }

        function getEmptyQuotationRuleConfig() {
            return {
                containerSize: false,
                loadingCity: false,
                portOfLoading: false,
                portOfDestination: false,
                destinationWarehouse: false,
                contractCabinet: false,
                fullLink: false,
                country: false
            };
        }

        function getQuotationRequiredFields(ruleConfigMap, feeTypeIds) {
            var requiredFields = getEmptyQuotationRuleConfig();
            feeTypeIds = feeTypeIds || [];

            feeTypeIds.forEach(function (feeTypeId) {
                var ruleConfig = ruleConfigMap[String(feeTypeId)] || getEmptyQuotationRuleConfig();
                requiredFields.containerSize = requiredFields.containerSize || ruleConfig.containerSize;
                requiredFields.loadingCity = requiredFields.loadingCity || ruleConfig.loadingCity;
                requiredFields.portOfLoading = requiredFields.portOfLoading || ruleConfig.portOfLoading;
                requiredFields.portOfDestination = requiredFields.portOfDestination || ruleConfig.portOfDestination;
                requiredFields.destinationWarehouse = requiredFields.destinationWarehouse || ruleConfig.destinationWarehouse;
                requiredFields.contractCabinet = requiredFields.contractCabinet || ruleConfig.contractCabinet;
                requiredFields.fullLink = requiredFields.fullLink || ruleConfig.fullLink;
                requiredFields.country = requiredFields.country || ruleConfig.country;
            });

            return requiredFields;
        }

        function getQuotationParentIds(filters, feeTypeId, ruleConfig, context) {
            var parentSearch = search.create({
                type: RECORD_TYPE_SERVICE_QUOTATION,
                filters: filters,
                columns: [
                    search.createColumn({ name: 'internalid' })
                ]
            });
            try {
                return (getAllResults(parentSearch) || []).map(function (result) {
                    return result.getValue({ name: 'internalid' });
                }).filter(function (id) {
                    return !!id;
                });
            } catch (e) {
                log.error('FEE_EST_QUOTATION_PARENT_SEARCH_ERROR', {
                    feeTypeId: feeTypeId,
                    ruleConfig: ruleConfig,
                    context: context,
                    parentFilters: filters,
                    errorName: e.name,
                    errorMessage: e.message,
                    errorStack: e.stack
                });
                throw e;
            }
        }

        function buildQuotationDetailFilters(parentIds, feeTypeId) {
            return [
                ["custrecord_swc_lpd_lp", "anyof", parentIds],
                "AND",
                ["custrecord_swc_lp_cost_medium", "anyof", feeTypeId]
            ];
        }

        function buildQuotationParentFiltersByRule(context, ruleConfig) {
            var quotationDate = context.createDate || 'today';
            var filters = [
                ["custrecord_swc_lp_start_date", "onorbefore", quotationDate],
                "AND",
                ["custrecord_swc_lp_end_date", "onorafter", quotationDate],
                "AND",
                ["custrecord_swc_lp_logistics_provider", "anyof", context.vendorList]
            ];

            appendDynamicQuotationFilter(filters, ruleConfig.destinationWarehouse, "custrecord_swc_lp_to_location", context.md_location);
            appendDynamicQuotationFilter(filters, ruleConfig.containerSize, "custrecord_swc_container_size", context.zg_size);
            appendDynamicQuotationFilter(filters, ruleConfig.portOfDestination, "custrecord_swc_destination_port", context.md_lc);
            appendDynamicQuotationFilter(filters, ruleConfig.contractCabinet, "custrecord_swc_contract_cabinet", context.cabinet);
            appendDynamicQuotationFilter(filters, ruleConfig.fullLink, "custrecord_swc_full_link", context.full_link);
            appendDynamicQuotationFilter(filters, ruleConfig.portOfLoading, "custrecord_swc_port_of_loading", context.sta_gk);
            appendDynamicQuotationFilter(filters, ruleConfig.loadingCity, "custrecord_swc_bj_loading_city", context.loading_city);
            // 国家维度后续补充：当前 customrecord_swc_service_quotation 上暂无对应国家字段。
            // appendDynamicQuotationFilter(filters, ruleConfig.country, "custrecord_swc_country", context.destination_country);

            return filters;
        }

        function appendDynamicQuotationFilter(filters, enabled, fieldId, value) {
            filters.push("AND");
            if (enabled) {
                filters.push([fieldId, "anyof", value]);
            } else {
                filters.push([fieldId, "anyof", "@NONE@"]);
            }
        }

        function hasRequiredQuotationContext(ruleConfig, context) {
            if (ruleConfig.containerSize && !context.zg_size) return false;
            if (ruleConfig.loadingCity && !context.loading_city) return false;
            if (ruleConfig.portOfLoading && !context.sta_gk) return false;
            if (ruleConfig.portOfDestination && !context.md_lc) return false;
            if (ruleConfig.destinationWarehouse && !context.md_location) return false;
            if (ruleConfig.contractCabinet && !context.cabinet) return false;
            if (ruleConfig.fullLink && !context.full_link) return false;
            if (ruleConfig.country && !context.destination_country) return false;
            return true;
        }

        function toCheckboxBool(value) {
            return value === true || value === 'T' || value === 'true';
        }

        function formatSearchDate(value) {
            if (!value) return '';
            try {
                if (value instanceof Date) {
                    return format.format({
                        value: value,
                        type: format.Type.DATE
                    });
                }
                return value;
            } catch (e) {
                log.error('FORMAT_SEARCH_DATE_ERROR', {
                    value: value,
                    errorName: e.name,
                    errorMessage: e.message
                });
                return value;
            }
        }

        /**
         * 同柜其它已处理单的已分摊合计（排除当前单）
         * 数据来源：customrecord_swc_wl_first_leg_cost 的 custrecord_swc_wl_flc_yg_fee
         * key = fee_type_z + '_' + fee_type_x + '_' + flc_location
         */
        function getAllocatedEstimatedMapByCabinetExcludeCurrent(cabinetId, currentPlanOrderId) {
            var map = {};

            var s = search.create({
                type: RECORD_TYPE_WL_FIRST_LEG_COST,
                filters: [
                    ["custrecord_swc_wl_first_leg_cost_id.custrecord_swc_wl_actual_cabinet", "anyof", String(cabinetId)],
                    "AND",
                    ["custrecord_swc_wl_first_leg_cost_id.custrecord_swc_wl_tc_ft_flag", "is", "1"],
                    "AND",
                    ["custrecord_swc_wl_first_leg_cost_id", "noneof", String(currentPlanOrderId)],
                    "AND",
                    [FIELD_WL_FLC_YG_FEE, "isnotempty", ""]
                ],
                columns: [
                    search.createColumn({ name: FIELD_FLC_FEE_TYPE_Z, summary: "GROUP" }),
                    search.createColumn({ name: "custrecord_swc_wl_flc_fee_type_x", summary: "GROUP" }),
                    search.createColumn({ name: FIELD_WL_FLC_LOCATION, summary: "GROUP" }),
                    search.createColumn({ name: FIELD_WL_FLC_YG_FEE, summary: "SUM" })
                ]
            });

            var rs = getAllResults(s) || [];
            for (var i = 0; i < rs.length; i++) {
                var z = rs[i].getValue({ name: FIELD_FLC_FEE_TYPE_Z, summary: "GROUP" });
                var x = rs[i].getValue({ name: "custrecord_swc_wl_flc_fee_type_x", summary: "GROUP" });
                var v = rs[i].getValue({ name: FIELD_WL_FLC_LOCATION, summary: "GROUP" });
                var sumFee = toNumber(rs[i].getValue({ name: FIELD_WL_FLC_YG_FEE, summary: "SUM" }));

                var key = String(z) + '_' + String(x) + '_' + String(v);
                map[key] = round2(sumFee);
            }

            return map;
        }

        /**
         * 将任意值安全转换为数字，无法转换时返回 0。
         */
        function toNumber(v) {
            var n = Number(v);
            return isFinite(n) ? n : 0;
        }

        // 统一保留两位小数，避免各处重复手写 round 逻辑。
        /**
         * 对金额或数量统一保留两位小数。
         */
        function round2(n) {
            n = toNumber(n);
            return Math.round((n + Number.EPSILON) * 100) / 100;
        }


        /**
         * 通用按比例分摊（含尾差闭合）
         * - isLast=true 时返回 total - alreadyAllocated（做尾差）
         * - 其它情况返回 total * ratio
         * - 最终结果保留 2 位小数，且不允许为负数
         */
        function allocateByRatio(total, ratio, isLast, alreadyAllocated) {
            total = toNumber(total);
            ratio = toNumber(ratio);
            alreadyAllocated = toNumber(alreadyAllocated);

            var v = isLast ? (total - alreadyAllocated) : (total * ratio);
            v = round2(v);
            return v < 0 ? 0 : v;
        }

        /**
         * 获取子公司本位币。
         */
        function getSubsidiaryCurrencyId(subsidiaryId, cache) {
            var key = String(subsidiaryId || '');
            if (!key) return '';
            cache = cache || {};
            if (cache.hasOwnProperty(key)) return cache[key];

            var result = search.lookupFields({
                type: 'subsidiary',
                id: subsidiaryId,
                columns: ['currency']
            });

            var currencyId = '';
            if (result && result.currency && result.currency[0]) {
                currencyId = result.currency[0].value || '';
            }

            cache[key] = currencyId;
            return currencyId;
        }

        /**
         * 将金额从源币种转换到目标币种。
         */
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
                diffAmountActualMinusEstimate: round2(actualInTarget - estimateInTarget)
            };
        }


        /**
         * 费用类型采购订单，重新审批
         * @param id
         */
        function fee_po_sp(id) {
            var result_str = {};

            try {
                var rec = record.load({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: id,
                });

                var saveFlag = false;
                var po_fee_wl_sub_id = SUBLIST_WL_PO_FEE;
                var line = rec.getLineCount(po_fee_wl_sub_id);

                for (var x = 0; x < line; x++) {
                    // 读取预估金额。
                    var po_fee_yg = rec.getSublistValue({ sublistId: po_fee_wl_sub_id, fieldId: FIELD_WL_PO_FEE_YG, line: x });
                    // 读取费用类采购订单 ID。
                    var fee_fpo_id = rec.getSublistValue({ sublistId: po_fee_wl_sub_id, fieldId: FIELD_WL_PO_FEE_FPO_ID, line: x });
                    // 读取费用类采购订单状态。
                    var fee_fpo_type = rec.getSublistValue({ sublistId: po_fee_wl_sub_id, fieldId: FIELD_WL_PO_FEE_FPO_TYPE, line: x });

                    if (fee_fpo_type == 3) {
                        saveFlag = true;
                        // 回写采购订单状态与金额。
                        var poRec = record.load({
                            type: RECORD_TYPE_PURCHASE_ORDER,
                            id: fee_fpo_id,
                        });
                        poRec.setValue({ fieldId: FIELD_BODY_FEE_AR_TYPE, value: 1 });
                        poRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: FIELD_AMOUNT, value: po_fee_yg, line: 0 });
                        poRec.save();
                        rec.setSublistValue({ sublistId: po_fee_wl_sub_id, fieldId: FIELD_WL_PO_FEE_FPO_TYPE, value: 1, line: x });
                    }
                }
                if (saveFlag == true) {
                    rec.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 1 });
                    rec.save();
                    result_str.data = '重新审批提交成功！';
                } else {
                    result_str.data = '当前数据中，没有需要重新审核的数据！请确认！';
                }

            } catch (e) {
                log.debug('重新审批提交异常 ： ', e);
                result_str.data = getSafeActionErrorMessage(e, '重新审批提交异常,请联系管理人员');
            }

            return result_str;
        }

        /**
         * 费用类型采购订单，重新审批
         * @param id
         */
        function onClickReapply(id) {
            var result_str = {};

            try {
                var rec = record.load({
                    type: RECORD_TYPE_TRANSFER_ORDER,
                    id: id,
                });

                var saveFlag = false;
                var trnfrord_link = SUBLIST_TRNFRORD_LINK;
                var line = rec.getLineCount(trnfrord_link);

                for (var x = 0; x < line; x++) {
                    // 读取预估金额。
                    var trnfrord_po_db_fee = rec.getSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_trnfrord_po_db_fee', line: x });
                    // 读取费用类采购订单 ID。
                    var trnfrord_po_id = rec.getSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_trnfrord_po_id', line: x });
                    // 读取费用类采购订单状态。
                    var trnfrord_po_type = rec.getSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_trnfrord_po_type', line: x });

                    if (trnfrord_po_type == 3) {
                        saveFlag = true;
                        // 回写采购订单状态与金额。
                        var poRec = record.load({
                            type: RECORD_TYPE_PURCHASE_ORDER,
                            id: trnfrord_po_id,
                        });
                        poRec.setValue({ fieldId: FIELD_BODY_FEE_AR_TYPE, value: 1 });
                        poRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: FIELD_AMOUNT, value: trnfrord_po_db_fee, line: 0 });
                        poRec.save();
                        rec.setSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_trnfrord_po_type', value: 1, line: x });
                    }
                }
                if (saveFlag == true) {
                    rec.setValue({ fieldId: FIELD_BODY_PO_DB_TYPE, value: 1 });
                    rec.save();
                    result_str.data = '重新审批提交成功！';
                } else {
                    result_str.data = '当前数据中，没有需要重新审核的数据！请确认！';
                }

            } catch (e) {
                log.debug('重新审批提交异常 ： ', e);
                result_str.data = getSafeActionErrorMessage(e, '重新审批提交异常,请联系管理人员');
            }

            return result_str;
        }

        /**
         * 费用类型采购订单，重新审批
         * @param id
         */
        function onClickReapply_hw(id) {
            var result_str = {};

            try {
                var rec = record.load({
                    type: RECORD_TYPE_TRANSFER_ORDER,
                    id: id,
                });

                var saveFlag = false;
                var trnfrord_link = SUBLIST_HW_TRNFRORD_LINK;
                var line = rec.getLineCount(trnfrord_link);

                for (var x = 0; x < line; x++) {
                    // 读取预估金额。
                    var trnfrord_po_db_fee = rec.getSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_hw_trnfrord_po_db_fee', line: x });
                    // 读取费用类采购订单 ID。
                    var trnfrord_po_id = rec.getSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_hw_trnfrord_po_id', line: x });
                    // 读取费用类采购订单状态。
                    var trnfrord_po_type = rec.getSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_hw_trnfrord_po_type', line: x });

                    if (trnfrord_po_type == 3) {
                        saveFlag = true;
                        // 回写采购订单状态与金额。
                        var poRec = record.load({
                            type: RECORD_TYPE_PURCHASE_ORDER,
                            id: trnfrord_po_id,
                        });
                        poRec.setValue({ fieldId: FIELD_BODY_FEE_AR_TYPE, value: 1 });
                        poRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: FIELD_AMOUNT, value: trnfrord_po_db_fee, line: 0 });
                        poRec.save();
                        rec.setSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_hw_trnfrord_po_type', value: 1, line: x });
                    }
                }
                if (saveFlag == true) {
                    rec.setValue({ fieldId: FIELD_BODY_PO_DB_TYPE, value: 1 });
                    rec.save();
                    result_str.data = '重新审批提交成功！';
                } else {
                    result_str.data = '当前数据中，没有需要重新审核的数据！请确认！';
                }

            } catch (e) {
                log.debug('重新审批提交异常 ： ', e);
                result_str.data = getSafeActionErrorMessage(e, '重新审批提交异常,请联系管理人员');
            }

            return result_str;
        }

        /**
         * 头程费用类型采购订单，重新审批
         * @param id
         */
        function fee_po_sp_tc(id) {
            var result_str = {};

            // 费用中类与费用 Item 的映射。
            var feeItemByName = CONFIG.feeItemByNameWlEstimate;

            var po_fee_wl_sub_id = SUBLIST_WL_FIRST_LEG_COST;
            var itemSublistId = SUBLIST_ITEM;

            try {
                var rec = record.load({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: id
                });

                var lineCount = rec.getLineCount(po_fee_wl_sub_id);

                var poSpTcJson = {};

                for (var x = 0; x < lineCount; x++) {

                    var fee_fpo_type = rec.getSublistValue({
                        sublistId: po_fee_wl_sub_id,
                        fieldId: FIELD_WL_FLC_PO_TYPE,
                        line: x
                    });

                    if (String(fee_fpo_type) !== '3') continue;

                    var fee_fpo_id = rec.getSublistValue({
                        sublistId: po_fee_wl_sub_id,
                        fieldId: FIELD_WL_FLC_PO,
                        line: x
                    });

                    var fee_type_z = rec.getSublistValue({
                        sublistId: po_fee_wl_sub_id,
                        fieldId: FIELD_FLC_FEE_TYPE_Z,
                        line: x
                    });

                    var po_fee_yg = rec.getSublistValue({
                        sublistId: po_fee_wl_sub_id,
                        fieldId: FIELD_WL_FLC_YG_FEE,
                        line: x
                    });

                    if (!fee_fpo_id || !fee_type_z) continue;

                    if (!poSpTcJson[fee_fpo_id]) poSpTcJson[fee_fpo_id] = {};

                    poSpTcJson[fee_fpo_id][String(fee_type_z)] = toNumber(po_fee_yg);

                    rec.setSublistValue({
                        sublistId: po_fee_wl_sub_id,
                        fieldId: FIELD_WL_FLC_PO_TYPE,
                        value: 1,
                        line: x
                    });
                }

                if (Object.keys(poSpTcJson).length === 0) {
                    result_str.data = '当前数据中，没有需要重新审核的数据！请确认！';
                    return result_str;
                }

                log.debug('poSpTcJson', poSpTcJson);
                for (var poId in poSpTcJson) {
                    if (!poSpTcJson.hasOwnProperty(poId)) continue;

                    var poRec = record.load({
                        type: RECORD_TYPE_PURCHASE_ORDER,
                        id: poId,
                        isDynamic: false
                    });

                    var cnt = poRec.getLineCount({ sublistId: itemSublistId });

                    var itemLineMap = {};
                    for (var i = 0; i < cnt; i++) {
                        var itemId = poRec.getSublistValue({
                            sublistId: itemSublistId,
                            fieldId: SUBLIST_ITEM,
                            line: i
                        });
                        if (itemId && itemLineMap[itemId] === undefined) {
                            itemLineMap[itemId] = i;
                        }
                    }

                    var itemLineData = poSpTcJson[poId];

                    for (var feeType in itemLineData) {
                        var targetItemId = feeItemByName[String(feeType)];
                        if (!targetItemId) {
                            log.debug('未知费用中类，跳过', { poId: poId, feeType: feeType });
                            continue;
                        }
                        var lineIdx = itemLineMap[targetItemId];
                        if (lineIdx === undefined) {
                            log.debug('PO缺少对应费用Item行，跳过', { poId: poId, feeType: feeType, itemId: targetItemId });
                            continue;
                        }

                        poRec.setSublistValue({
                            sublistId: itemSublistId,
                            fieldId: FIELD_AMOUNT,
                            line: lineIdx,
                            value: toNumber(itemLineData[feeType])
                        });
                    }

                    poRec.setValue({ fieldId: FIELD_BODY_FEE_AR_TYPE, value: 1 });
                    poRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
                }

                rec.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 8 });
                rec.save();

                result_str.data = '重新审批提交成功！';
                return result_str;

            } catch (e) {
                log.error('重新审批提交异常', e);
                result_str.data = getSafeActionErrorMessage(e, '重新审批提交异常,请联系管理人员');
                return result_str;
            }
        }
        /**
         * 费用分摊
         * 分摊规则：
         * 1 = 按体积占比分摊
         * 2 = 按金额占比分摊
         *
         * @returns {{}}
         */
        function feeApportion(id) {
            var result_str = {};

            try {
                log.audit('feeApportion start', { id: id });
                function buildPoAmountKey(itemId, country, locationType, customer, region) {
                    return [
                        String(itemId || ''),
                        String(country || ''),
                        String(locationType || ''),
                        String(customer || ''),
                        String(region || '')
                    ].join('_');
                }

                function buildPoAmountIndex(poRec) {
                    var index = {};
                    var poLineCount = poRec.getLineCount({ sublistId: SUBLIST_ITEM }) || 0;
                    for (var p = 0; p < poLineCount; p++) {
                        var grade = poRec.getSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_grade', line: p });
                        if (grade != 1 && grade != 2) continue;

                        var key = buildPoAmountKey(
                            poRec.getSublistValue({ sublistId: SUBLIST_ITEM, fieldId: SUBLIST_ITEM, line: p }),
                            poRec.getSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_country_code', line: p }),
                            poRec.getSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_loc_type', line: p }),
                            poRec.getSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_store', line: p }),
                            poRec.getSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_us_districts', line: p })
                        );

                        index[key + '_' + String(grade)] = Number(poRec.getSublistValue({
                            sublistId: SUBLIST_ITEM,
                            fieldId: 'custcol_swc_including_tax_amt',
                            line: p
                        })) || 0;
                    }
                    return index;
                }

                var rec = record.load({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: id
                });

                // 第一步：先读取总体积。
                var total_volume = Number(rec.getValue(FIELD_WL_TOTAL_VOLUME)) || 0;

                // 第二步：金额分摊总额改为按对应 PO 明细行的含税单价汇总。
                var total_amount = 0;

                // 校验：体积分摊需要总体积
                // 金额分摊需要总金额

                // 费用类型配置：zhonglei -> 明细金额字段、币种字段
                var FEE_CFG = {
                    1: { amtField: 'custrecord_swc_wl_d_em_trailer_fee', curField: 'custrecord_swc_wl_d_em_trailer_fee_c' },
                    2: { amtField: 'custrecord_swc_wl_d_em_cda_fee', curField: 'custrecord_swc_wl_d_em_cda_fee_c' },
                    3: { amtField: 'custrecord_swc_wl_d_em_ffc', curField: 'custrecord_swc_wl_d_em_ffc_c' },
                    4: { amtField: 'custrecord_swc_wl_d_em_bxf_fee', curField: 'custrecord_swc_wl_d_em_bxf_fee_c' },
                    5: { amtField: 'custrecord_swc_wl_d_em_hyf_fee', curField: 'custrecord_swc_wl_d_em_hyf_fee_c' },
                    6: { amtField: 'custrecord_swc_wl_d_em_qgf_fee', curField: 'custrecord_swc_wl_d_em_qgf_fee_c' },
                    7: { amtField: 'custrecord_swc_wl_d_em_jkgs_fee', curField: 'custrecord_swc_wl_d_em_jkgs_fee_c' },
                    8: { amtField: 'custrecord_swc_wl_d_em_hdf_fee', curField: 'custrecord_swc_wl_d_em_hdf_fee_c' },
                    9: { amtField: 'custrecord_swc_wl_d_em_tcf_fee', curField: 'custrecord_swc_wl_d_em_tcf_fee_c' },
                    101: { amtField: 'custrecord_swc_wl_d_em_rkcz_fee', curField: 'custrecord_swc_wl_d_em_rkcz_fee_c' }
                };

                /**
                 * 汇总对象：
                 * key = zhonglei + '_' + allocationRule
                 * 例如：
                 * 1_1 = 中类1 + 按体积分摊
                 * 1_2 = 中类1 + 按金额分摊
                 *
                 * 这样可以避免同一个中类下，不同分摊规则的数据被混到一起
                 */
                var feePoolMap = {};
                var historicalWritebackCacheMap = {};
                var historicalUsageList = [];

                var legSubId = SUBLIST_WL_FIRST_LEG_COST;
                var legLineCount = rec.getLineCount({ sublistId: legSubId });

                // 第三步：汇总 first leg cost 子列表中的费用。
                for (var i = 0; i < legLineCount; i++) {
                    var zhonglei = rec.getSublistValue({
                        sublistId: legSubId,
                        fieldId: FIELD_FLC_FEE_TYPE_Z,
                        line: i
                    });

                    // 海运保险费(4)和目的国进口关税(7)不参与 feeApportion 分摊。
                    if (String(zhonglei) === '4' || String(zhonglei) === '7') {
                        log.debug('feeApportion skip by fee type', {
                            line: i,
                            zhonglei: zhonglei
                        });
                        continue;
                    }

                    // 分摊规则：1=体积，2=金额
                    var allocationRule = rec.getSublistValue({
                        sublistId: legSubId,
                        fieldId: 'custrecord_swc_wl_flc_allocation_rules',
                        line: i
                    }) || '';

                    var yg_fee_cy = Number(rec.getSublistValue({
                        sublistId: legSubId,
                        fieldId: FIELD_WL_FLC_HISTORY_DIFF,
                        line: i
                    })) || 0;

                    var yg_fee = Number(rec.getSublistValue({
                        sublistId: legSubId,
                        fieldId: FIELD_WL_FLC_YG_FEE,
                        line: i
                    })) || 0;

                    var type_fee = rec.getSublistValue({
                        sublistId: legSubId,
                        fieldId: FIELD_WL_FLC_PO_TYPE,
                        line: i
                    }) || '';

                    // 只处理 type_fee == 4 的数据
                    if (type_fee != 4) {
                        log.debug('feeApportion skip by po type', {
                            line: i,
                            zhonglei: zhonglei,
                            type_fee: type_fee
                        });
                        continue;
                    }

                    if (!FEE_CFG[zhonglei]) {
                        log.debug('feeApportion skip by missing config', {
                            line: i,
                            zhonglei: zhonglei
                        });
                        continue;
                    }
                    if (allocationRule != 1 && allocationRule != 2) {
                        log.debug('feeApportion skip by allocation rule', {
                            line: i,
                            zhonglei: zhonglei,
                            allocationRule: allocationRule
                        });
                        continue;
                    }

                    var poolKey = zhonglei + '_' + allocationRule;
                    // 新规则：头程预估费用分摊金额 = 本次预估金额 - 历史差异金额。
                    var lineAmount = round2(yg_fee - yg_fee_cy);

                    if (!feePoolMap[poolKey]) {
                        feePoolMap[poolKey] = {
                            zhonglei: zhonglei,
                            allocationRule: Number(allocationRule),
                            sumAmt: 0,
                            currency: '',
                            allocatedSum: 0
                        };
                    }

                    var yg_currency = rec.getSublistValue({
                        sublistId: legSubId,
                        fieldId: FIELD_WL_FLC_YG_CURRENCY,
                        line: i
                    }) || '';
                    var vendorId = rec.getSublistValue({
                        sublistId: legSubId,
                        fieldId: FIELD_WL_FLC_LOCATION,
                        line: i
                    }) || '';

                    feePoolMap[poolKey].sumAmt = round2(feePoolMap[poolKey].sumAmt + lineAmount);
                    if (!feePoolMap[poolKey].currency && yg_currency) {
                        feePoolMap[poolKey].currency = yg_currency;
                    }

                    if (yg_fee_cy) {
                        historicalUsageList.push({
                            line: i,
                            feeTypeZ: zhonglei,
                            vendorId: vendorId,
                            currencyId: yg_currency,
                            historicalDiffAmount: yg_fee_cy
                        });
                    }

                    // 处理完成后，将 po_type 更新为 5。
                    rec.setSublistValue({
                        sublistId: legSubId,
                        fieldId: FIELD_WL_FLC_PO_TYPE,
                        value: 5,
                        line: i
                    });
                }
                log.audit('feeApportion pool summary', {
                    id: id,
                    feePoolMap: feePoolMap
                });

                // 第四步：读取明细行数量。
                var planSubID = SUBLIST_WL_PLAN_DETAIL;
                var lineCount = rec.getLineCount({ sublistId: planSubID });
                var detailAmountMap = {};
                var poAmountIndexCache = {};

                if (lineCount <= 0) {
                    result_str.data = '费用分摊失败：没有明细行';
                    return result_str;
                }

                for (var detailLine = 0; detailLine < lineCount; detailLine++) {
                    var poId = rec.getSublistValue({
                        sublistId: planSubID,
                        fieldId: FIELD_WL_D_PO_NUM,
                        line: detailLine
                    }) || '';

                    var superiorQty = Number(rec.getSublistValue({
                        sublistId: planSubID,
                        fieldId: FIELD_WL_D_SUPERIOR_QTY_Z,
                        line: detailLine
                    })) || 0;

                    var goodQty = Number(rec.getSublistValue({
                        sublistId: planSubID,
                        fieldId: FIELD_WL_D_GOOD_QTY_Z,
                        line: detailLine
                    })) || 0;

                    var grade = superiorQty > 0 ? 1 : (goodQty > 0 ? 2 : '');
                    if (!poId || !grade) {
                        detailAmountMap[detailLine] = 0;
                        continue;
                    }

                    var amountKey = buildPoAmountKey(
                        rec.getSublistValue({ sublistId: planSubID, fieldId: 'custrecord_swc_wl_d_item', line: detailLine }),
                        rec.getSublistValue({ sublistId: planSubID, fieldId: 'custrecord_swc_wl_d_country', line: detailLine }),
                        rec.getSublistValue({ sublistId: planSubID, fieldId: 'custrecord_swc_wl_d_location_type', line: detailLine }),
                        rec.getSublistValue({ sublistId: planSubID, fieldId: FIELD_WL_D_CUSTOMER, line: detailLine }),
                        rec.getSublistValue({ sublistId: planSubID, fieldId: 'custrecord_swc_wl_d_region', line: detailLine })
                    ) + '_' + String(grade);

                    if (!poAmountIndexCache[poId]) {
                        var poRec = record.load({
                            type: record.Type.PURCHASE_ORDER,
                            id: poId,
                            isDynamic: false
                        });
                        poAmountIndexCache[poId] = buildPoAmountIndex(poRec);
                    }

                    var poLineAmount = Number(poAmountIndexCache[poId][amountKey]) || 0;
                    detailAmountMap[detailLine] = poLineAmount;
                    total_amount = round2(total_amount + poLineAmount);
                }
                log.audit('feeApportion detail basis', {
                    id: id,
                    lineCount: lineCount,
                    total_volume: total_volume,
                    total_amount: total_amount,
                    detailAmountMap: detailAmountMap
                });

                // 如果存在体积分摊，但总体积为0，则报错
                var hasVolumeRule = false;
                var hasAmountRule = false;

                for (var poolKeyCheck in feePoolMap) {
                    if (!Object.prototype.hasOwnProperty.call(feePoolMap, poolKeyCheck)) continue;
                    if (feePoolMap[poolKeyCheck].allocationRule === 1) hasVolumeRule = true;
                    if (feePoolMap[poolKeyCheck].allocationRule === 2) hasAmountRule = true;
                }

                if (hasVolumeRule && total_volume <= 0) {
                    result_str.data = '费用分摊失败：存在按体积分摊的数据，但总体积为0或为空';
                    return result_str;
                }

                if (hasAmountRule && total_amount <= 0) {
                    result_str.data = '费用分摊失败：存在按金额分摊的数据，但总金额为0或为空';
                    return result_str;
                }

                // 第五步：逐行执行费用分摊。
                for (var line = 0; line < lineCount; line++) {
                    // 读取明细体积。
                    var d_total_volume = Number(rec.getSublistValue({
                        sublistId: planSubID,
                        fieldId: FIELD_WL_D_TOTAL_VOLUME,
                        line: line
                    })) || 0;

                    // 读取明细金额。
                    var d_amount = Number(detailAmountMap[line]) || 0;

                    var isLast = (line === lineCount - 1);

                    for (var poolKey2 in feePoolMap) {
                        if (!Object.prototype.hasOwnProperty.call(feePoolMap, poolKey2)) continue;

                        var pool = feePoolMap[poolKey2];
                        if (!pool.sumAmt) continue;

                        var cfg = FEE_CFG[pool.zhonglei];
                        if (!cfg) continue;

                        var ratio = 0;

                        // 根据分摊规则计算分摊比例。
                        if (pool.allocationRule === 1) {
                            // 按体积占比计算。
                            ratio = total_volume ? (d_total_volume / total_volume) : 0;
                        } else if (pool.allocationRule === 2) {
                            // 按金额占比计算。
                            ratio = total_amount ? (d_amount / total_amount) : 0;
                        }

                        // 回写币种。
                        if (pool.currency) {
                            rec.setSublistValue({
                                sublistId: planSubID,
                                fieldId: cfg.curField,
                                value: pool.currency,
                                line: line
                            });
                        }

                        var amountToSet = 0;

                        if (isLast) {
                            // 最后一行负责补齐尾差。
                            amountToSet = round2(pool.sumAmt - pool.allocatedSum);
                        } else {
                            amountToSet = round2(pool.sumAmt * ratio);
                            pool.allocatedSum = round2(pool.allocatedSum + amountToSet);
                        }

                        /**
                         * 注意：
                         * 如果同一个费用字段（例如 trailer_fee）同时存在“体积分摊”和“金额分摊”，
                         * 那么本行会被 setSublistValue 覆盖，导致前一笔丢失。
                         *
                         * 因此不能直接覆盖写入，需要先读取原值再累加。
                         */
                        var oldAmt = Number(rec.getSublistValue({
                            sublistId: planSubID,
                            fieldId: cfg.amtField,
                            line: line
                        })) || 0;

                        rec.setSublistValue({
                            sublistId: planSubID,
                            fieldId: cfg.amtField,
                            value: round2(oldAmt + amountToSet),
                            line: line
                        });
                        log.debug('feeApportion detail write', {
                            id: id,
                            line: line,
                            zhonglei: pool.zhonglei,
                            allocationRule: pool.allocationRule,
                            ratio: ratio,
                            amountToSet: amountToSet,
                            targetField: cfg.amtField,
                            currencyField: cfg.curField,
                            currency: pool.currency || ''
                        });
                    }
                }

                rec.setValue({
                    fieldId: FIELD_WL_PLAN_STATUS,
                    value: 10
                });

                rec.save();
                log.audit('feeApportion end', {
                    id: id,
                    status: 10
                });

                try {
                    for (var usageIndex = 0; usageIndex < historicalUsageList.length; usageIndex++) {
                        var historicalUsage = historicalUsageList[usageIndex];
                        var historicalWritebackEntry = getHistoricalDiffCacheEntry(
                            historicalWritebackCacheMap,
                            id,
                            historicalUsage.feeTypeZ,
                            historicalUsage.vendorId,
                            historicalUsage.currencyId
                        );
                        applyHistoricalDiffHandledAmount(historicalWritebackEntry, historicalUsage.historicalDiffAmount);
                    }

                    log.audit('feeApportion historical diff writeback', {
                        id: id,
                        historicalUsageList: historicalUsageList,
                        writebackSummary: writeHistoricalDiffHandledChanges(historicalWritebackCacheMap)
                    });
                    result_str.data = '费用分摊成功';
                } catch (writebackError) {
                    log.error('feeApportion historical diff writeback error', {
                        id: id,
                        errorName: writebackError && writebackError.name,
                        errorMessage: writebackError && writebackError.message,
                        errorStack: writebackError && writebackError.stack
                    });
                    result_str.data = '费用分摊成功，历史差异回写失败，请联系管理员处理。';
                }

            } catch (e) {
                log.debug('费用分摊异常：', e);
                result_str.data = getSafeActionErrorMessage(e, '费用分摊失败,请联系管理人员');
            }

            return result_str;
        }

        /**
         * 差异账单也按“PO拆分规则（按子公司+体积占比）”拆分
         * - cdMap[费用中类] = 承担方（来自 customrecord_swc_rule_mapping_table + terms_of_trade）
         *   其中 2 表示海外承担（按店铺子公司拆分），3 表示国内承担（使用物流单国内子公司，不拆分）
         * - custrecord_swc_wl_flc_sj_fee_bill 已是多选：按行追加 vb/vc id
         */
        function feeApportionSj(id) {
            var result_str = {};

            try {
                /**
                 * 将任意值安全转换为数字，无法转换时返回 0。
                 */
                function toNumber(v) {
                    if (v === null || v === undefined || v === '') return 0;
                    var n = Number(v);
                    return isFinite(n) ? n : 0;
                }
                /**
                 * 对金额或数量统一保留两位小数。
                 */
                function round2(n) {
                    n = toNumber(n);
                    return Math.round((n + Number.EPSILON) * 100) / 100;
                }
                /**
                 * 对数组做去重处理。
                 */
                function uniq(arr) {
                    var map = {};
                    var out = [];
                    for (var i = 0; i < (arr || []).length; i++) {
                        var v = String(arr[i] || '').trim();
                        if (!v) continue;
                        if (!map[v]) { map[v] = true; out.push(v); }
                    }
                    return out;
                }

                /**
                 * 规范化多选字段返回值，统一转成数组。
                 */
                function normalizeMultiSelectValue(v) {
                    if (v === null || v === undefined || v === '') return [];

                    if (Array.isArray(v)) {
                        return v.map(function (x) { return String(x); }).filter(Boolean);
                    }

                    if (typeof v === 'string') {
                        if (v.indexOf('\u0005') !== -1) {
                            return v.split('\u0005').map(function (x) { return String(x).trim(); }).filter(Boolean);
                        }
                        if (v.indexOf(',') !== -1) {
                            return v.split(',').map(function (x) { return String(x).trim(); }).filter(Boolean);
                        }
                        return [v.trim()].filter(Boolean);
                    }

                    return [String(v)].filter(Boolean);
                }

                /**
                 * 向子列表多选字段追加值，同时避免重复。
                 */
                function appendSublistMultiSelect(rec, sublistId, fieldId, line, addIds) {
                    var currentRaw = rec.getSublistValue({ sublistId: sublistId, fieldId: fieldId, line: line });
                    var current = normalizeMultiSelectValue(currentRaw);

                    var add = (addIds || []).map(function (x) { return String(x).trim(); }).filter(Boolean);

                    var merged = uniq(current.concat(add));
                    if (merged.length === 0) return;

                    rec.setSublistValue({
                        sublistId: sublistId,
                        fieldId: fieldId,
                        line: line,
                        value: merged
                    });
                }
                /**
                 * 将生成的应付账单回写到对应费用行。
                 */
                function writeBackBillsToLines(rec, legSubId, multiFieldId, vbId, billLines) {
                    for (var i = 0; i < (billLines || []).length; i++) {
                        var lineId = Number(billLines[i].lineId);
                        if (!isFinite(lineId)) continue;
                        appendSublistMultiSelect(rec, legSubId, multiFieldId, lineId, [vbId]);
                    }
                }

                /**
                 * 将生成的应付贷项通知单回写到对应费用行。
                 */
                function writeBackCreditsToLines(rec, legSubId, multiFieldId, vcId, creditLines) {
                    for (var i = 0; i < (creditLines || []).length; i++) {
                        var lineId = Number(creditLines[i].lineId);
                        if (!isFinite(lineId)) continue;
                        appendSublistMultiSelect(rec, legSubId, multiFieldId, lineId, [vcId]);
                    }
                }


                // 初始化费用 Item 映射。
                var feeItemByName = CONFIG.feeItemByNameWlEstimate;
                var diffTranDate = new Date();
                var diffRateCache = {};
                var diffCurrencyIdCache = {};

                var rec = record.load({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: id
                });

                // 防止按钮重复点击。
                var already = rec.getValue('custrecord_swc_wl_tc_zf_check_btn');
                if (already === true || already === 'T') {
                    result_str.data = '已分摊/已生成差异账单，请勿重复点击。';
                    return result_str;
                }

                // 读取总体积。
                var total_volume = toNumber(rec.getValue(FIELD_WL_TOTAL_VOLUME));
                if (total_volume <= 0) {
                    result_str.data = '费用分摊失败：总体积为0或为空';
                    return result_str;
                }

                // 第一步：根据成交方式确定承担方字段。
                var terms_of_trade = rec.getValue(FIELD_WL_TERMS_OF_TRADE);
                var totFieldId = '';
                if (terms_of_trade == 1) totFieldId = 'custrecord_swc_cost_exw';
                else if (terms_of_trade == 2) totFieldId = 'custrecord_swc_cost_cn_fob';
                else if (terms_of_trade == 3) totFieldId = 'custrecord_swc_cost_ddp';
                else if (terms_of_trade == 4) totFieldId = 'custrecord_swc_cost_ddu';
                else if (terms_of_trade == 5) totFieldId = 'custrecord_swc_cost_hw_fob';

                if (!totFieldId) {
                    result_str.data = '费用分摊失败：未识别成交方式(custrecord_swc_wl_terms_of_trade)';
                    return result_str;
                }

                // 第二步：通过映射表整理费用中类与承担方关系。
                // cdMap[zhonglei] = 2 表示海外承担，3 表示国内承担，其它值按兜底逻辑处理。
                var cdMap = {};
                var ruleSearch = search.create({
                    type: RECORD_TYPE_RULE_MAPPING_TABLE,
                    filters: [],
                    columns: [
                        search.createColumn({ name: "internalid" }),
                        search.createColumn({ name: "formulatext", formula: "{" + totFieldId + ".id}" })
                    ]
                });
                var ruleRows = getAllResults(ruleSearch) || [];
                for (var r = 0; r < ruleRows.length; r++) {
                    var cm = ruleRows[r].getValue({ name: "internalid" });
                    var gy = ruleRows[r].getValue({ name: "formulatext", formula: "{" + totFieldId + ".id}" });
                    if (cm) cdMap[String(cm)] = gy; // gy 可能是 '2'/'3'
                }

                // 读取国内承担子公司。
                var domesticSub = rec.getValue(FIELD_WL_PO_ZT) || null;

                // 第三步：计算海外承担场景下的子公司体积占比。
                var planSubID = SUBLIST_WL_PLAN_DETAIL;
                var planLineCount = rec.getLineCount({ sublistId: planSubID }) || 0;
                if (planLineCount <= 0) {
                    result_str.data = '费用分摊失败：没有明细行';
                    return result_str;
                }

                var custSubCache = {};
                /**
                 * 获取客户对应的子公司信息。
                 */
                function getCustomerSubsidiary(customerId) {
                    var key = String(customerId || '');
                    if (!key) return null;
                    if (custSubCache.hasOwnProperty(key)) return custSubCache[key];

                    var customerS = search.lookupFields({
                        type: 'customer',
                        id: customerId,
                        columns: ['subsidiary']
                    });
                    var sub = null;
                    if (customerS && customerS.subsidiary && customerS.subsidiary[0]) {
                        sub = customerS.subsidiary[0].value;
                    }
                    custSubCache[key] = sub;
                    return sub;
                }

                var subVolMap = {}; // { subId: volSum }
                var volTotal = 0;

                for (var p = 0; p < planLineCount; p++) {
                    var shopId = rec.getSublistValue({ sublistId: planSubID, fieldId: FIELD_WL_D_CUSTOMER, line: p });
                    var vol = toNumber(rec.getSublistValue({ sublistId: planSubID, fieldId: FIELD_WL_D_TOTAL_VOLUME, line: p }));
                    if (!shopId || vol <= 0) continue;

                    var subId = getCustomerSubsidiary(shopId);
                    if (!subId) continue;

                    volTotal += vol;
                    subVolMap[String(subId)] = toNumber(subVolMap[String(subId)]) + vol;
                }

                var subKeys = Object.keys(subVolMap);
                subKeys.sort(function (a, b) { return Number(a) - Number(b); });

                // 第四步：扫描 first leg cost，构造差异账单拆分数据。
                // billJson[vendor(carrier)][subsidiaryKey] = { VendorBill:[{item,amt,line}], VendorCredit:[...], lineIds:[...] }
                // subsidiaryKey:
                //   - 国内承担：固定为 String(domesticSub) 或 '__NO_SUB__'
                //   - 海外承担：按 subKeys 拆分（若无法拆分则 '__NO_SUB__'）
                var billJson = {};

                var legSubId = SUBLIST_WL_FIRST_LEG_COST;
                var legLineCount = rec.getLineCount({ sublistId: legSubId }) || 0;

                for (var i = 0; i < legLineCount; i++) {
                    var zhonglei = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_FLC_FEE_TYPE_Z, line: i });
                    var type_fee = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_PO_TYPE, line: i }) || '';
                    var carrierId = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_LOCATION, line: i }) || '';

                    if (!carrierId || !zhonglei) continue;
                    if (String(type_fee) !== '5') continue;

                    var sj = toNumber(rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_flc_sj_fee', line: i }));
                    var yg = toNumber(rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_YG_FEE, line: i }));
                    var ygCurrencyId = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_YG_CURRENCY, line: i }) || '';
                    var sjCurrencyId = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_SJ_CURRENCY, line: i }) || '';
                    var sjCurrencyText = rec.getSublistText({ sublistId: legSubId, fieldId: FIELD_WL_FLC_SJ_CURRENCY, line: i }) || '';
                    var diffContext = getConvertedFirstLegDiffAmount(yg, ygCurrencyId, sj, sjCurrencyId, sjCurrencyText, diffTranDate, diffRateCache, diffCurrencyIdCache);

                    // 差异金额统一按目标账单币种计算：实际 - 预估。
                    var cy = diffContext.diffAmountActualMinusEstimate;

                    // 回写差异金额
                    rec.setSublistValue({
                        sublistId: legSubId,
                        fieldId: 'custrecord_swc_wl_flc_sj_fee_cy',
                        value: cy,
                        line: i
                    });

                    if (cy === 0) continue;

                    // 承担方判定（terms_of_trade映射出来的值）
                    var bearer = cdMap[String(zhonglei)]; // '2'/'3'/...
                    var itemId = feeItemByName[String(zhonglei)];
                    if (!itemId) continue;

                    var carrierKey = String(carrierId);
                    var orderType2 = (String(zhonglei) === '101') ? 8 : 10;
                    if (!billJson[carrierKey]) billJson[carrierKey] = {};

                    // === 国内承担：不按店铺拆分，全部进 domesticSub（如果没有 domesticSub，就用 '__NO_SUB__'） ===
                    if (String(bearer) === '3') {
                        var subKey = (domesticSub ? String(domesticSub) : '__NO_SUB__') + '|' + String(orderType2) + '|' + String(diffContext.currencyId || '');
                        if (!billJson[carrierKey][subKey]) {
                            billJson[carrierKey][subKey] = {
                                VendorBill: [],
                                VendorCredit: [],
                                lineIds: [],
                                subsidiaryId: domesticSub ? Number(domesticSub) : null,
                                orderType2: orderType2,
                                currencyId: diffContext.currencyId,
                                tranDate: diffTranDate
                            };
                        }
                        if (cy > 0) billJson[carrierKey][subKey].VendorBill.push({ item: itemId, amount: cy, lineId: i, orderType2: orderType2 });
                        else billJson[carrierKey][subKey].VendorCredit.push({ item: itemId, amount: cy, lineId: i, orderType2: orderType2 });
                        billJson[carrierKey][subKey].lineIds.push(i);
                        continue;
                    }

                    // === 海外承担：按“上一步PO拆分方法”拆分（按子公司体积占比），最后一个子公司吃尾差 ===
                    // 如果没有可拆分数据：退化成单组 '__NO_SUB__'
                    if (String(bearer) === '2' && subKeys.length > 0 && volTotal > 0) {
                        var allocated = 0;
                        for (var sIdx = 0; sIdx < subKeys.length; sIdx++) {
                            var subIdKey = subKeys[sIdx];
                            var isLast = (sIdx === subKeys.length - 1);
                            var ratio = toNumber(subVolMap[subIdKey]) / volTotal;

                            var part;
                            if (isLast) part = round2(cy - allocated);
                            else {
                                part = round2(cy * ratio);
                                allocated = round2(allocated + part);
                            }
                            if (part === 0) continue;

                            var groupKey = String(subIdKey) + '|' + String(orderType2) + '|' + String(diffContext.currencyId || '');
                            if (!billJson[carrierKey][groupKey]) {
                                billJson[carrierKey][groupKey] = {
                                    VendorBill: [],
                                    VendorCredit: [],
                                    lineIds: [],
                                    subsidiaryId: Number(subIdKey) || null,
                                    orderType2: orderType2,
                                    currencyId: diffContext.currencyId,
                                    tranDate: diffTranDate
                                };
                            }
                            if (part > 0) billJson[carrierKey][groupKey].VendorBill.push({ item: itemId, amount: part, lineId: i, orderType2: orderType2 });
                            else billJson[carrierKey][groupKey].VendorCredit.push({ item: itemId, amount: part, lineId: i, orderType2: orderType2 });
                            billJson[carrierKey][groupKey].lineIds.push(i);
                        }
                    } else {
                        // 其他承担方：同样退化为单组
                        var subKey2 = '__NO_SUB__|' + String(orderType2) + '|' + String(diffContext.currencyId || '');
                        if (!billJson[carrierKey][subKey2]) {
                            billJson[carrierKey][subKey2] = {
                                VendorBill: [],
                                VendorCredit: [],
                                lineIds: [],
                                subsidiaryId: null,
                                orderType2: orderType2,
                                currencyId: diffContext.currencyId,
                                tranDate: diffTranDate
                            };
                        }
                        if (cy > 0) billJson[carrierKey][subKey2].VendorBill.push({ item: itemId, amount: cy, lineId: i, orderType2: orderType2 });
                        else billJson[carrierKey][subKey2].VendorCredit.push({ item: itemId, amount: cy, lineId: i, orderType2: orderType2 });
                        billJson[carrierKey][subKey2].lineIds.push(i);
                    }
                }

                // 第五步：创建差异账单与贷项通知单。
                // 约定：createVendorBill3 返回账单 ID，createVendorCredit3 返回贷项通知单 ID。
                var createdBillIds = [];
                var createdCreditIds = [];

                for (var vendorId in billJson) {
                    if (!billJson.hasOwnProperty(vendorId)) continue;

                    var subGroup = billJson[vendorId];
                    var subs = Object.keys(subGroup);

                    for (var si = 0; si < subs.length; si++) {
                        var subKey = subs[si];
                        var group = subGroup[subKey];

                        var subsidiaryId = group.subsidiaryId;
                        var orderType2 = group.orderType2;
                        var currencyId = group.currencyId;
                        var tranDate = group.tranDate || diffTranDate;

                        // 创建供应商账单。
                        if (group.VendorBill && group.VendorBill.length > 0) {
                            var vbId = createVendorBill3(vendorId, group.VendorBill, subsidiaryId, orderType2, currencyId, tranDate);
                            if (vbId) {
                                createdBillIds.push(String(vbId));
                                writeBackBillsToLines(
                                    rec,
                                    SUBLIST_WL_FIRST_LEG_COST,
                                    'custrecord_swc_wl_flc_sj_fee_bill',   // 多选字段
                                    vbId,
                                    group.VendorBill
                                );
                            }
                        }

                        // 创建供应商贷项通知单。
                        if (group.VendorCredit && group.VendorCredit.length > 0) {
                            var vcId = createVendorCredit3(vendorId, group.VendorCredit, subsidiaryId, orderType2, currencyId, tranDate);
                            if (vcId) {
                                createdCreditIds.push(String(vcId));
                                writeBackCreditsToLines(
                                    rec,
                                    SUBLIST_WL_FIRST_LEG_COST,
                                    'custrecord_swc_wl_flc_sj_fee_bill',   // 多选字段
                                    vcId,
                                    group.VendorCredit
                                );

                            }
                        }
                    }
                }

                rec.setValue({ fieldId: 'custrecord_swc_wl_tc_zf_check_btn', value: true });
                rec.save();

                result_str.data = '费用分摊成功';
                result_str.createdBillIds = uniq(createdBillIds);
                result_str.createdCreditIds = uniq(createdCreditIds);
                return result_str;

            } catch (e) {
                log.debug('费用分摊异常 ： ', e);
                result_str.data = getSafeActionErrorMessage(e, '费用分摊失败,请联系管理人员');
                return result_str;
            }
        }

        /**
         * 差异账单也按“PO拆分规则（按子公司+体积占比）”拆分
         * - cdMap[费用中类] = 承担方（来自 customrecord_swc_rule_mapping_table + terms_of_trade）
         *   其中 2 表示海外承担（按店铺子公司拆分），3 表示国内承担（使用物流单国内子公司，不拆分）
         * - custrecord_swc_wl_flc_sj_fee_bill 已是多选：按行追加 vb/vc id
         */
        function feeApportionSjWc(id) {
            var result_str = {};

            try {
                /**
                 * 将任意值安全转换为数字，无法转换时返回 0。
                 */
                function toNumber(v) {
                    if (v === null || v === undefined || v === '') return 0;
                    var n = Number(v);
                    return isFinite(n) ? n : 0;
                }
                /**
                 * 对金额或数量统一保留两位小数。
                 */
                function round2(n) {
                    n = toNumber(n);
                    return Math.round((n + Number.EPSILON) * 100) / 100;
                }
                /**
                 * 对数组做去重处理。
                 */
                function uniq(arr) {
                    var map = {};
                    var out = [];
                    for (var i = 0; i < (arr || []).length; i++) {
                        var v = String(arr[i] || '').trim();
                        if (!v) continue;
                        if (!map[v]) { map[v] = true; out.push(v); }
                    }
                    return out;
                }

                /**
                 * 规范化多选字段返回值，统一转成数组。
                 */
                function normalizeMultiSelectValue(v) {
                    if (v === null || v === undefined || v === '') return [];

                    if (Array.isArray(v)) {
                        return v.map(function (x) { return String(x); }).filter(Boolean);
                    }

                    if (typeof v === 'string') {
                        if (v.indexOf('\u0005') !== -1) {
                            return v.split('\u0005').map(function (x) { return String(x).trim(); }).filter(Boolean);
                        }
                        if (v.indexOf(',') !== -1) {
                            return v.split(',').map(function (x) { return String(x).trim(); }).filter(Boolean);
                        }
                        return [v.trim()].filter(Boolean);
                    }

                    return [String(v)].filter(Boolean);
                }

                /**
                 * 向子列表多选字段追加值，同时避免重复。
                 */
                function appendSublistMultiSelect(rec, sublistId, fieldId, line, addIds) {
                    var currentRaw = rec.getSublistValue({ sublistId: sublistId, fieldId: fieldId, line: line });
                    var current = normalizeMultiSelectValue(currentRaw);

                    var add = (addIds || []).map(function (x) { return String(x).trim(); }).filter(Boolean);

                    var merged = uniq(current.concat(add));
                    if (merged.length === 0) return;

                    rec.setSublistValue({
                        sublistId: sublistId,
                        fieldId: fieldId,
                        line: line,
                        value: merged
                    });
                }
                /**
                 * 将生成的应付账单回写到对应费用行。
                 */
                function writeBackBillsToLines(rec, legSubId, multiFieldId, vbId, billLines) {
                    for (var i = 0; i < (billLines || []).length; i++) {
                        var lineId = Number(billLines[i].lineId);
                        if (!isFinite(lineId)) continue;
                        appendSublistMultiSelect(rec, legSubId, multiFieldId, lineId, [vbId]);
                    }
                }

                /**
                 * 将生成的应付贷项通知单回写到对应费用行。
                 */
                function writeBackCreditsToLines(rec, legSubId, multiFieldId, vcId, creditLines) {
                    for (var i = 0; i < (creditLines || []).length; i++) {
                        var lineId = Number(creditLines[i].lineId);
                        if (!isFinite(lineId)) continue;
                        appendSublistMultiSelect(rec, legSubId, multiFieldId, lineId, [vcId]);
                    }
                }


                // 初始化费用 Item 映射。
                var feeItemByName = {
                    '101': CONFIG.ITEM_ID_WL_STORAGE_FEE_ESTIMATE
                };
                var diffTranDate = new Date();
                var diffRateCache = {};
                var diffCurrencyIdCache = {};

                var rec = record.load({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: id
                });

                // 防止按钮重复点击。
                var already = rec.getValue('custrecord_swc_wl_wc_zf_check_btn');
                if (already === true || already === 'T') {
                    result_str.data = '已分摊/已生成差异账单，请勿重复点击。';
                    return result_str;
                }

                // 读取总体积。
                var total_volume = toNumber(rec.getValue(FIELD_WL_TOTAL_VOLUME));
                if (total_volume <= 0) {
                    result_str.data = '费用分摊失败：总体积为0或为空';
                    return result_str;
                }

                // 第一步：根据成交方式确定承担方字段。
                var terms_of_trade = rec.getValue(FIELD_WL_TERMS_OF_TRADE);
                var totFieldId = '';
                if (terms_of_trade == 1) totFieldId = 'custrecord_swc_cost_exw';
                else if (terms_of_trade == 2) totFieldId = 'custrecord_swc_cost_cn_fob';
                else if (terms_of_trade == 3) totFieldId = 'custrecord_swc_cost_ddp';
                else if (terms_of_trade == 4) totFieldId = 'custrecord_swc_cost_ddu';
                else if (terms_of_trade == 5) totFieldId = 'custrecord_swc_cost_hw_fob';

                if (!totFieldId) {
                    result_str.data = '费用分摊失败：未识别成交方式(custrecord_swc_wl_terms_of_trade)';
                    return result_str;
                }

                // 第二步：通过映射表整理费用中类与承担方关系。
                // cdMap[zhonglei] = 2 表示海外承担，3 表示国内承担，其它值按兜底逻辑处理。
                var cdMap = {};
                var ruleSearch = search.create({
                    type: RECORD_TYPE_RULE_MAPPING_TABLE,
                    filters: [],
                    columns: [
                        search.createColumn({ name: "internalid" }),
                        search.createColumn({ name: "formulatext", formula: "{" + totFieldId + ".id}" })
                    ]
                });
                var ruleRows = getAllResults(ruleSearch) || [];
                for (var r = 0; r < ruleRows.length; r++) {
                    var cm = ruleRows[r].getValue({ name: "internalid" });
                    var gy = ruleRows[r].getValue({ name: "formulatext", formula: "{" + totFieldId + ".id}" });
                    if (cm) cdMap[String(cm)] = gy; // gy 可能是 '2'/'3'
                }

                // 读取国内承担子公司。
                var domesticSub = rec.getValue(FIELD_WL_PO_ZT) || null;

                // 第三步：计算海外承担场景下的子公司体积占比。
                var planSubID = SUBLIST_WL_PLAN_DETAIL;
                var planLineCount = rec.getLineCount({ sublistId: planSubID }) || 0;
                if (planLineCount <= 0) {
                    result_str.data = '费用分摊失败：没有明细行';
                    return result_str;
                }

                var custSubCache = {};
                /**
                 * 获取客户对应的子公司信息。
                 */
                function getCustomerSubsidiary(customerId) {
                    var key = String(customerId || '');
                    if (!key) return null;
                    if (custSubCache.hasOwnProperty(key)) return custSubCache[key];

                    var customerS = search.lookupFields({
                        type: 'customer',
                        id: customerId,
                        columns: ['subsidiary']
                    });
                    var sub = null;
                    if (customerS && customerS.subsidiary && customerS.subsidiary[0]) {
                        sub = customerS.subsidiary[0].value;
                    }
                    custSubCache[key] = sub;
                    return sub;
                }

                var subVolMap = {}; // { subId: volSum }
                var volTotal = 0;

                for (var p = 0; p < planLineCount; p++) {
                    var shopId = rec.getSublistValue({ sublistId: planSubID, fieldId: FIELD_WL_D_CUSTOMER, line: p });
                    var vol = toNumber(rec.getSublistValue({ sublistId: planSubID, fieldId: FIELD_WL_D_TOTAL_VOLUME, line: p }));
                    if (!shopId || vol <= 0) continue;

                    var subId = getCustomerSubsidiary(shopId);
                    if (!subId) continue;

                    volTotal += vol;
                    subVolMap[String(subId)] = toNumber(subVolMap[String(subId)]) + vol;
                }

                var subKeys = Object.keys(subVolMap);
                subKeys.sort(function (a, b) { return Number(a) - Number(b); });

                // 第四步：扫描 first leg cost，构造差异账单拆分数据。
                // billJson[vendor(carrier)][subsidiaryKey] = { VendorBill:[{item,amt,line}], VendorCredit:[...], lineIds:[...] }
                // subsidiaryKey:
                //   - 国内承担：固定为 String(domesticSub) 或 '__NO_SUB__'
                //   - 海外承担：按 subKeys 拆分（若无法拆分则 '__NO_SUB__'）
                var billJson = {};

                var legSubId = SUBLIST_WL_FIRST_LEG_COST;
                var legLineCount = rec.getLineCount({ sublistId: legSubId }) || 0;

                for (var i = 0; i < legLineCount; i++) {
                    var zhonglei = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_FLC_FEE_TYPE_Z, line: i });
                    var type_fee = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_PO_TYPE, line: i }) || '';
                    var carrierId = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_LOCATION, line: i }) || '';

                    if (!carrierId || !zhonglei) continue;
                    if (String(type_fee) !== '5') continue;

                    var sj = toNumber(rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_flc_sj_fee', line: i }));
                    var yg = toNumber(rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_YG_FEE, line: i }));
                    var ygCurrencyId = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_YG_CURRENCY, line: i }) || '';
                    var sjCurrencyId = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_SJ_CURRENCY, line: i }) || '';
                    var sjCurrencyText = rec.getSublistText({ sublistId: legSubId, fieldId: FIELD_WL_FLC_SJ_CURRENCY, line: i }) || '';
                    var diffContext = getConvertedFirstLegDiffAmount(yg, ygCurrencyId, sj, sjCurrencyId, sjCurrencyText, diffTranDate, diffRateCache, diffCurrencyIdCache);

                    // 差异金额统一按目标账单币种计算：实际 - 预估。
                    var cy = diffContext.diffAmountActualMinusEstimate;

                    // 回写差异金额
                    rec.setSublistValue({
                        sublistId: legSubId,
                        fieldId: 'custrecord_swc_wl_flc_sj_fee_cy',
                        value: cy,
                        line: i
                    });

                    if (cy === 0) continue;

                    // 承担方判定（terms_of_trade映射出来的值）
                    var bearer = cdMap[String(zhonglei)]; // '2'/'3'/...
                    var itemId = feeItemByName[String(zhonglei)];
                    if (!itemId) continue;

                    var carrierKey = String(carrierId);
                    var orderType2 = (String(zhonglei) === '101') ? 8 : 10;
                    if (!billJson[carrierKey]) billJson[carrierKey] = {};

                    // === 国内承担：不按店铺拆分，全部进 domesticSub（如果没有 domesticSub，就用 '__NO_SUB__'） ===
                    if (String(bearer) === '3') {
                        var subKey = (domesticSub ? String(domesticSub) : '__NO_SUB__') + '|' + String(orderType2) + '|' + String(diffContext.currencyId || '');
                        if (!billJson[carrierKey][subKey]) {
                            billJson[carrierKey][subKey] = {
                                VendorBill: [],
                                VendorCredit: [],
                                lineIds: [],
                                subsidiaryId: domesticSub ? Number(domesticSub) : null,
                                orderType2: orderType2,
                                currencyId: diffContext.currencyId,
                                tranDate: diffTranDate
                            };
                        }
                        if (cy > 0) billJson[carrierKey][subKey].VendorBill.push({ item: itemId, amount: cy, lineId: i, orderType2: orderType2 });
                        else billJson[carrierKey][subKey].VendorCredit.push({ item: itemId, amount: cy, lineId: i, orderType2: orderType2 });
                        billJson[carrierKey][subKey].lineIds.push(i);
                        continue;
                    }

                    // === 海外承担：按“上一步PO拆分方法”拆分（按子公司体积占比），最后一个子公司吃尾差 ===
                    // 如果没有可拆分数据：退化成单组 '__NO_SUB__'
                    if (String(bearer) === '2' && subKeys.length > 0 && volTotal > 0) {
                        var allocated = 0;
                        for (var sIdx = 0; sIdx < subKeys.length; sIdx++) {
                            var subIdKey = subKeys[sIdx];
                            var isLast = (sIdx === subKeys.length - 1);
                            var ratio = toNumber(subVolMap[subIdKey]) / volTotal;

                            var part;
                            if (isLast) part = round2(cy - allocated);
                            else {
                                part = round2(cy * ratio);
                                allocated = round2(allocated + part);
                            }
                            if (part === 0) continue;

                            var groupKey = String(subIdKey) + '|' + String(orderType2) + '|' + String(diffContext.currencyId || '');
                            if (!billJson[carrierKey][groupKey]) {
                                billJson[carrierKey][groupKey] = {
                                    VendorBill: [],
                                    VendorCredit: [],
                                    lineIds: [],
                                    subsidiaryId: Number(subIdKey) || null,
                                    orderType2: orderType2,
                                    currencyId: diffContext.currencyId,
                                    tranDate: diffTranDate
                                };
                            }
                            if (part > 0) billJson[carrierKey][groupKey].VendorBill.push({ item: itemId, amount: part, lineId: i, orderType2: orderType2 });
                            else billJson[carrierKey][groupKey].VendorCredit.push({ item: itemId, amount: part, lineId: i, orderType2: orderType2 });
                            billJson[carrierKey][groupKey].lineIds.push(i);
                        }
                    } else {
                        // 其他承担方：同样退化为单组
                        var subKey2 = '__NO_SUB__|' + String(orderType2) + '|' + String(diffContext.currencyId || '');
                        if (!billJson[carrierKey][subKey2]) {
                            billJson[carrierKey][subKey2] = {
                                VendorBill: [],
                                VendorCredit: [],
                                lineIds: [],
                                subsidiaryId: null,
                                orderType2: orderType2,
                                currencyId: diffContext.currencyId,
                                tranDate: diffTranDate
                            };
                        }
                        if (cy > 0) billJson[carrierKey][subKey2].VendorBill.push({ item: itemId, amount: cy, lineId: i, orderType2: orderType2 });
                        else billJson[carrierKey][subKey2].VendorCredit.push({ item: itemId, amount: cy, lineId: i, orderType2: orderType2 });
                        billJson[carrierKey][subKey2].lineIds.push(i);
                    }
                }

                // 第五步：创建差异账单与贷项通知单。
                // 约定：createVendorBill3 返回账单 ID，createVendorCredit3 返回贷项通知单 ID。
                var createdBillIds = [];
                var createdCreditIds = [];

                for (var vendorId in billJson) {
                    if (!billJson.hasOwnProperty(vendorId)) continue;

                    var subGroup = billJson[vendorId];
                    var subs = Object.keys(subGroup);

                    for (var si = 0; si < subs.length; si++) {
                        var subKey = subs[si];
                        var group = subGroup[subKey];

                        var subsidiaryId = group.subsidiaryId;
                        var orderType2 = group.orderType2;
                        var currencyId = group.currencyId;
                        var tranDate = group.tranDate || diffTranDate;

                        // 创建供应商账单。
                        if (group.VendorBill && group.VendorBill.length > 0) {
                            var vbId = createVendorBill3(vendorId, group.VendorBill, subsidiaryId, orderType2, currencyId, tranDate);
                            if (vbId) {
                                createdBillIds.push(String(vbId));
                                writeBackBillsToLines(
                                    rec,
                                    SUBLIST_WL_FIRST_LEG_COST,
                                    'custrecord_swc_wl_flc_sj_fee_bill',   // 多选字段
                                    vbId,
                                    group.VendorBill
                                );
                            }
                        }

                        // 创建供应商贷项通知单。
                        if (group.VendorCredit && group.VendorCredit.length > 0) {
                            var vcId = createVendorCredit3(vendorId, group.VendorCredit, subsidiaryId, orderType2, currencyId, tranDate);
                            if (vcId) {
                                createdCreditIds.push(String(vcId));
                                writeBackCreditsToLines(
                                    rec,
                                    SUBLIST_WL_FIRST_LEG_COST,
                                    'custrecord_swc_wl_flc_sj_fee_bill',   // 多选字段
                                    vcId,
                                    group.VendorCredit
                                );

                            }
                        }
                    }
                }

                rec.setValue({ fieldId: 'custrecord_swc_wl_wc_zf_check_btn', value: true });
                rec.save();

                result_str.data = '费用分摊成功';
                result_str.createdBillIds = uniq(createdBillIds);
                result_str.createdCreditIds = uniq(createdCreditIds);
                return result_str;

            } catch (e) {
                log.debug('费用分摊异常 ： ', e);
                result_str.data = getSafeActionErrorMessage(e, '费用分摊失败,请联系管理人员');
                return result_str;
            }
        }

        /**
         * 下面两个方法延续现有的 createVendorBill3 / createVendorCredit3 创建逻辑。
         * 当前实现支持可选 subsidiaryId 参数，内部核心处理保持兼容。
         * data: [{item:xxx, amount:yyy, lineId:i}, ...]
         */
        function createVendorBill3(vendorId, data, subsidiaryId, orderType2, currencyId, tranDate) {
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
                var amt = Number(linejson.amount) || 0;
                if (!linejson.item || amt <= 0) continue;

                vendorbillRecord.selectNewLine({ sublistId: SUBLIST_ITEM });
                vendorbillRecord.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: SUBLIST_ITEM, value: linejson.item });
                vendorbillRecord.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'quantity', value: 1 });
                vendorbillRecord.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'rate', value: amt });
                vendorbillRecord.commitLine({ sublistId: SUBLIST_ITEM });
            }

            return vendorbillRecord.save({ ignoreMandatoryFields: false });
        }

        /**
         * 根据费用明细创建供应商贷项通知单。
         */
        function createVendorCredit3(vendorId, data, subsidiaryId, orderType2, currencyId, tranDate) {
            var vendorcreditRecord = record.create({ type: 'vendorcredit', isDynamic: true });
            vendorcreditRecord.setValue({ fieldId: 'entity', value: vendorId });
            applyVendorPaymentTerms(vendorcreditRecord, vendorId);
            if (orderType2) {
                vendorcreditRecord.setValue({ fieldId: 'custbody_swc_order_type2', value: orderType2 });
            }

            if (subsidiaryId && vendorcreditRecord.getField({ fieldId: 'subsidiary' })) {
                vendorcreditRecord.setValue({ fieldId: 'subsidiary', value: subsidiaryId });
            }
            if (tranDate) {
                vendorcreditRecord.setValue({ fieldId: 'trandate', value: tranDate });
            }
            if (currencyId) {
                vendorcreditRecord.setValue({ fieldId: 'currency', value: currencyId });
            }

            for (var i = 0; i < data.length; i++) {
                var linejson = data[i];
                var amt = Math.abs(Number(linejson.amount) || 0);
                if (!linejson.item || amt <= 0) continue;

                vendorcreditRecord.selectNewLine({ sublistId: SUBLIST_ITEM });
                vendorcreditRecord.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: SUBLIST_ITEM, value: linejson.item });
                vendorcreditRecord.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'quantity', value: 1 });
                vendorcreditRecord.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'rate', value: amt });
                vendorcreditRecord.commitLine({ sublistId: SUBLIST_ITEM });
            }

            return vendorcreditRecord.save({ ignoreMandatoryFields: false });
        }


        /**
         * 获取分摊规则类型中的会计科目
         */
        function getAccountJson() {
            var rule_mapping_json = {};
            var customrecord_swc_rule_mapping_tableSearchObj = search.create({
                type: RECORD_TYPE_RULE_MAPPING_TABLE,
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "费用项（中类）" }),
                        search.createColumn({ name: "custrecord_swc_account", label: "会计科目" })
                    ]
            });
            var data = getAllResults(customrecord_swc_rule_mapping_tableSearchObj);
            if (data && data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    var zhonglei = data[i].getValue('internalid');
                    var account = data[i].getValue('custrecord_swc_account');
                    rule_mapping_json[zhonglei] = account;
                }
            }
            return rule_mapping_json;
        }

        /**
         * 费用类型采购订单做成
         * @param id
         * @returns {{}}
         */
        function feePoCreate(id) {

            var result_str = {};

            try {

                // 获取物流发运的数据，取得对应的采购费用信息内容。生成对应的费用类型采购订单。
                var rec = record.load({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: id,
                });

                var feeSubID = SUBLIST_WL_PO_FEE;
                var line = rec.getLineCount(feeSubID);

                var feeYgCheck = [];
                for (var x = 0; x < line; x++) {
                    // 费用明细表ID
                    var fee_id = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'id', line: x });
                    // 预估采购杂费
                    var po_fee_yg = rec.getSublistValue({ sublistId: feeSubID, fieldId: FIELD_WL_PO_FEE_YG, line: x });

                    if (!po_fee_yg) {
                        feeYgCheck.push(fee_id)
                    }
                }

                if (feeYgCheck.length > 0) {
                    result_str.data = '内部ID：' + feeYgCheck.join(',') + '行的预估费用请正常填写！';
                    return result_str;
                } else {
                    for (var i = 0; i < line; i++) {
                        // 费用明细表ID
                        var fee_id = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'id', line: i });
                        // 采购订单ID
                        var po_fee_id = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_po_fee_id', line: i });
                        // 供应商
                        var po_fee_ven = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_po_fee_ven', line: i });
                        // 付款方
                        var po_fee_pay = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_po_fee_pay', line: i });
                        // 预估采购杂费
                        var po_fee_yg = rec.getSublistValue({ sublistId: feeSubID, fieldId: FIELD_WL_PO_FEE_YG, line: i });

                        // 创建费用类型采购订单
                        var po_data = record.create({ type: RECORD_TYPE_PURCHASE_ORDER, isDynamic: true });
                        1
                        // 表单：采购订单_费用类
                        po_data.setValue({ fieldId: 'customform', value: CONFIG.FORM_PO_FEE });
                        // 供应商
                        var entityID = po_fee_pay ? po_fee_pay : po_fee_ven;
                        po_data.setValue({ fieldId: 'entity', value: entityID });
                        po_data.setValue({ fieldId: FIELD_BODY_FEE_AR_TYPE, value: 1 });// 等待审批

                        // 账期 TODO 假数据，测试使用
                        // po_data.setValue({ fieldId: 'custbody_swc_cqdd_zq', value: 1 });
                        // 关联采购订单
                        po_data.setValue({ fieldId: 'custbody_swc_fee_po_id', value: po_fee_id });
                        // 关联物流发运单
                        po_data.setValue({ fieldId: 'custbody_swc_wl_no', value: id });
                        // 关联物流发运单-费用
                        po_data.setValue({ fieldId: 'custbody_swc_fee_po_no', value: fee_id });
                        // 费用类型采购订单
                        po_data.setValue({ fieldId: 'custbody_swc_po_fee', value: 2 });
                        // 采购订单类型(手工单用)
                        po_data.setValue({ fieldId: 'custbody_swc_order_type2', value: 2 });
                        // 明细数据做成
                        po_data.selectNewLine({ sublistId: SUBLIST_ITEM });
                        po_data.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: SUBLIST_ITEM, value: 3109 });
                        po_data.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'quantity', value: 1 });
                        po_data.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'rate', value: po_fee_yg });
                        po_data.commitLine({ sublistId: SUBLIST_ITEM });

                        var saveId = po_data.save({ ignoreMandatoryFields: true });
                        rec.setSublistValue({ sublistId: feeSubID, fieldId: FIELD_WL_PO_FEE_FPO_ID, value: saveId, line: i });
                        rec.setSublistValue({ sublistId: feeSubID, fieldId: FIELD_WL_PO_FEE_FPO_TYPE, value: 1, line: i });

                        record.submitFields({
                            type: RECORD_TYPE_PURCHASE_ORDER,
                            id: po_fee_id,
                            values: {
                                custbody_swc_fee_po_id: saveId,
                            }
                        });
                    }
                }
                rec.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 1 });
                rec.save();
                result_str.data = '生成费用类采购订单成功';
            } catch (e) {
                log.debug('生成费用类采购订单 ： ', e.message);
                result_str.data = getSafeActionErrorMessage(e, '生成费用类采购订单失败,请联系管理人员');
            }

            return result_str;
        }

        /**
         * 品级价格获取 。获取税码(人民币)， 不含税单价(人民币)
         * @param sub
         * @param entity
         * @param skuAry
         * @returns {{}}
         */
        function getSkuAmount(sub_id, entity_id, skuAry, tran_date, currency) {

            log.debug('sub_id', sub_id);
            log.debug('entity_id', entity_id);
            log.debug('skuAry', skuAry);
            log.debug('tran_date', tran_date);

            // 兜底处理：skuAry 为空时直接返回。
            if (!skuAry || !skuAry.length) return {};

            // currency: 1 表示 RMB，其它值表示 USD。
            var isRmb = (Number(currency) === 1);

            var rec_search_obj = search.create({
                type: 'customrecord_swc_po_price_details',
                filters: [
                    ['custrecord_swc_sku_price_main_list.custrecord_swc_supplier', 'anyof', entity_id],
                    'AND',
                    ['custrecord_swc_sku_price_main_list.custrecord_swc_subsidiary', 'anyof', sub_id],
                    'AND',
                    ['custrecord_swc_item', 'anyof', skuAry],
                    'AND',
                    // 改为：生效日期 <= tran_date
                    ['custrecord_swc_effective_date', 'onorbefore', tran_date],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    // 先按生效日期倒序，再按 internalid 倒序
                    search.createColumn({ name: 'custrecord_swc_effective_date', sort: search.Sort.DESC }),
                    search.createColumn({ name: 'internalid', sort: search.Sort.DESC }),

                    search.createColumn({ name: 'custrecord_swc_item' }),

                    search.createColumn({ name: 'custrecord_swc_price_type', join: 'custrecord_swc_sku_price_main_list' }),
                    search.createColumn({ name: 'custrecord_swc_initial_quantity' }),
                    search.createColumn({ name: 'custrecord_swc_end_quantity' }),

                    // RMB
                    search.createColumn({ name: 'custrecord_swc_tax_code' }),
                    search.createColumn({ name: 'custrecord_swc_premium_unit_price' }),
                    search.createColumn({ name: 'custrecord_swc_premium_excluding_tax' }),
                    search.createColumn({ name: 'custrecord_swc_good_unit_price' }),
                    search.createColumn({ name: 'custrecord_swc_good_excluding_tax' }),

                    // USD
                    search.createColumn({ name: 'custrecord_swc_tax_code_usd' }),
                    search.createColumn({ name: 'custrecord_swc_premium_unit_price_usd' }),
                    search.createColumn({ name: 'custrecord_swc_premium_excluding_tax_usd' }),
                    search.createColumn({ name: 'custrecord_swc_good_unit_price_usd' }),
                    search.createColumn({ name: 'custrecord_swc_good_excluding_tax_usd' }),
                    search.createColumn({ name: 'custrecord_swc_support' }),//打托
                    search.createColumn({ name: 'custrecord_swc_exw' })//结算方式
                ]
            });

            // 只要“每个 SKU 生效日期最大的一条”，不需要 getAllResults 全拉，paged 逐页扫一遍即可
            var skuAmount = {};
            var paged = rec_search_obj.runPaged({ pageSize: 1000 });

            paged.pageRanges.forEach(function (pageRange) {
                var page = paged.fetch({ index: pageRange.index });
                page.data.forEach(function (skuDetail) {

                    var sku = skuDetail.getValue({ name: 'custrecord_swc_item' });
                    if (!sku) return;
                    var support = skuDetail.getValue({ name: 'custrecord_swc_support' });
                    var mode = skuDetail.getValue({ name: 'custrecord_swc_exw' });

                    // 已经拿到该 SKU 的最新一条了，后面同 SKU 的都跳过
                    if (skuAmount[sku + '_' + support + '_' + mode]) return;

                    if (isRmb) {
                        skuAmount[sku + '_' + support + '_' + mode] = {
                            tax_code: skuDetail.getValue({ name: 'custrecord_swc_tax_code' }) || '',
                            yh: skuDetail.getValue({ name: 'custrecord_swc_premium_unit_price' }) || '',
                            yw: skuDetail.getValue({ name: 'custrecord_swc_premium_excluding_tax' }) || '',
                            lh: skuDetail.getValue({ name: 'custrecord_swc_good_unit_price' }) || '',
                            lw: skuDetail.getValue({ name: 'custrecord_swc_good_excluding_tax' }) || ''
                        };
                    } else {
                        skuAmount[sku + '_' + support + '_' + mode] = {
                            tax_code: skuDetail.getValue({ name: 'custrecord_swc_tax_code_usd' }) || '',
                            yh: skuDetail.getValue({ name: 'custrecord_swc_premium_unit_price_usd' }) || '',
                            yw: skuDetail.getValue({ name: 'custrecord_swc_premium_excluding_tax_usd' }) || '',
                            lh: skuDetail.getValue({ name: 'custrecord_swc_good_unit_price_usd' }) || '',
                            lw: skuDetail.getValue({ name: 'custrecord_swc_good_excluding_tax_usd' }) || ''
                        };
                    }
                });
            });

            log.debug('SKU价目表(去重后).length', skuAmount);
            return skuAmount;
        }

        /**
         * 物流审核
         */
        function fee_ar_to(ids) {
            var result_str = {};

            /**
             * 更新采购订单的费用审批状态。
             */
            function setPoArType(poId, arType) {
                record.submitFields({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    values: {
                        custbody_swc_fee_ar_type: arType
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
            }

            try {
                var parts = String(ids || '').split('_');
                var poId = parts[0];
                var approveFlag = parts[1]; // 1=通过，其他=驳回
                var type = (String(approveFlag) === '1') ? 2 : 3; // 2通过，3驳回

                if (!poId) {
                    result_str.data = '参数异常：缺少PO ID';
                    return result_str;
                }

                var poRec = record.load({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    isDynamic: false
                });

                var feeType = poRec.getValue('custbody_swc_po_fee'); // 2费用类，3头程费用类？
                var wlID = poRec.getValue('custbody_swc_wl_no'); // 物流发运单
                var cgID = poRec.getValue('custbody_swc_cg_sub_order_no'); // CG子单信息
                var fee_po_no = poRec.getValue('custbody_swc_fee_po_no'); // 费用信息记录ID（feeType=2用）

                // 通过
                if (type === 2) {

                    if (feeType == 2) {
                        var vendorBillRec = record.transform({
                            fromType: record.Type.PURCHASE_ORDER,
                            fromId: poId,
                            toType: record.Type.VENDOR_BILL,
                            isDynamic: true
                        });
                        applyVendorPaymentTerms(vendorBillRec, poRec.getValue('entity'));
                        vendorBillRec.save({ ignoreMandatoryFields: true });

                        if (fee_po_no) {
                            record.submitFields({
                                type: 'customrecord_swc_wl_po_fee',
                                id: fee_po_no,
                                values: {
                                    custrecord_swc_wl_po_fee_fpo_type: 4
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });
                        }

                        setPoArType(poId, type);

                    } else if (feeType == 3) {

                        log.debug('feeType', feeType)
                        record.transform({
                            fromType: record.Type.PURCHASE_ORDER,
                            fromId: poId,
                            toType: record.Type.ITEM_RECEIPT,
                            isDynamic: true
                        }).save({ ignoreMandatoryFields: true });

                        //     fromType: record.Type.PURCHASE_ORDER,
                        //     fromId: poId,
                        //     toType: record.Type.VENDOR_BILL,
                        //     isDynamic: true

                        if (wlID) {
                            var wlrec = record.load({
                                type: RECORD_TYPE_WL_PLAN_ORDER,
                                id: wlID,
                                isDynamic: false
                            });

                            var leg_cost_id = SUBLIST_WL_FIRST_LEG_COST;
                            var line = wlrec.getLineCount({ sublistId: leg_cost_id });
                            var fpo_typeChecks = true;

                            for (var r = 0; r < line; r++) {
                                var wl_flc_po = wlrec.getSublistValue({ sublistId: leg_cost_id, fieldId: FIELD_WL_FLC_PO, line: r });
                                var fpo_types = wlrec.getSublistValue({ sublistId: leg_cost_id, fieldId: FIELD_WL_FLC_PO_TYPE, line: r });

                                log.debug('wl_flc_po', wl_flc_po)
                                if (wl_flc_po.indexOf(poId) != -1) {
                                    wlrec.setSublistValue({ sublistId: leg_cost_id, fieldId: FIELD_WL_FLC_PO_TYPE, value: 4, line: r });
                                } else if (fpo_types && Number(fpo_types) !== 4) {
                                    fpo_typeChecks = false;
                                }
                            }

                            if (fpo_typeChecks) {
                                wlrec.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 9 });
                            }

                            wlrec.save({ enableSourcing: false, ignoreMandatoryFields: true });
                        }
                        if (cgID) {
                            var wlrec = record.load({
                                type: 'customrecord_swc_cg_sub_order',
                                id: cgID,
                                isDynamic: false
                            });

                            var leg_cost_id = 'recmachcustrecord_swc_cg_first_leg_cost_id';
                            var line = wlrec.getLineCount({ sublistId: leg_cost_id });
                            var fpo_typeChecks = true;

                            for (var r = 0; r < line; r++) {
                                var wl_flc_po = wlrec.getSublistValue({ sublistId: leg_cost_id, fieldId: 'custrecord_swc_wl_cflc_po', line: r });
                                var fpo_types = wlrec.getSublistValue({ sublistId: leg_cost_id, fieldId: 'custrecord_swc_wl_cflc_po_type', line: r });

                                log.debug('wl_flc_po', wl_flc_po)
                                if (wl_flc_po.indexOf(poId) != -1) {
                                    wlrec.setSublistValue({ sublistId: leg_cost_id, fieldId: 'custrecord_swc_wl_cflc_po_type', value: 4, line: r });
                                } else if (wl_flc_po && wl_flc_po.length > 0 && fpo_types && Number(fpo_types) !== 4) {
                                    fpo_typeChecks = false;
                                }
                            }
                            log.debug('fpo_typeChecks', fpo_typeChecks)
                            if (fpo_typeChecks) {
                                wlrec.setValue({ fieldId: 'custrecord_swc_cso_status', value: 4 });
                            }

                            wlrec.save({ enableSourcing: false, ignoreMandatoryFields: true });
                        }
                        setPoArType(poId, type);
                    }

                } else {
                    setPoArType(poId, type);

                    if (feeType == 2) {
                        if (fee_po_no) {
                            record.submitFields({
                                type: 'customrecord_swc_wl_po_fee',
                                id: fee_po_no,
                                values: {
                                    custrecord_swc_wl_po_fee_fpo_type: 3
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });
                        }

                    } else if (feeType == 3) {

                        if (wlID) {
                            var wlrec2 = record.load({
                                type: RECORD_TYPE_WL_PLAN_ORDER,
                                id: wlID,
                                isDynamic: false
                            });

                            var leg_cost_id2 = SUBLIST_WL_FIRST_LEG_COST;
                            var line2 = wlrec2.getLineCount({ sublistId: leg_cost_id2 });

                            for (var r2 = 0; r2 < line2; r2++) {
                                var wl_flc_po2 = wlrec2.getSublistValue({ sublistId: leg_cost_id2, fieldId: FIELD_WL_FLC_PO, line: r2 });
                                if (String(wl_flc_po2) === String(poId)) {
                                    wlrec2.setSublistValue({ sublistId: leg_cost_id2, fieldId: FIELD_WL_FLC_PO_TYPE, value: 3, line: r2 });
                                }
                            }

                            wlrec2.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 14 });
                            wlrec2.save({ enableSourcing: false, ignoreMandatoryFields: true });
                        }
                        if (cgID) {
                            var wlrec = record.load({
                                type: 'customrecord_swc_cg_sub_order',
                                id: cgID,
                                isDynamic: false
                            });

                            var leg_cost_id = 'recmachcustrecord_swc_cg_first_leg_cost_id';
                            var line = wlrec.getLineCount({ sublistId: leg_cost_id });

                            for (var r = 0; r < line; r++) {
                                var wl_flc_po = wlrec.getSublistValue({ sublistId: leg_cost_id, fieldId: 'custrecord_swc_wl_cflc_po', line: r });
                                var fpo_types = wlrec.getSublistValue({ sublistId: leg_cost_id, fieldId: 'custrecord_swc_wl_cflc_po_type', line: r });

                                log.debug('wl_flc_po', wl_flc_po)
                                if (wl_flc_po.indexOf(poId) != -1) {
                                    wlrec.setSublistValue({ sublistId: leg_cost_id, fieldId: 'custrecord_swc_wl_cflc_po_type', value: 3, line: r });
                                }
                            }
                            wlrec.setValue({ fieldId: 'custrecord_swc_cso_status', value: 5 });

                            wlrec.save({ enableSourcing: false, ignoreMandatoryFields: true });
                        }
                    }
                }

                result_str.data = '提交成功';
                return result_str;

            } catch (e) {
                log.error('物流审核异常', {
                    name: e.name,
                    message: e.message,
                    stack: e.stack
                });
                result_str.data = '物流审核失败,请联系管理人员';
                return result_str;
            }
        }


        /**
         * 调拨费物流审核
         */
        function fee_ar_to_db(ids) {
            var result_str = {};

            try {
                var ids = ids.split('_');
                var id = ids[0];
                var type = ids[1] == 1 ? 2 : 3;

                var rec = record.load({ type: RECORD_TYPE_PURCHASE_ORDER, id: id, });
                // 关联转移单
                var transorder_id = rec.getValue('custbody_swc_transorder_id');
                var feeType = rec.getValue('custbody_swc_po_fee');
                var po_db_id = rec.getValue('custbody_swc_po_db_id');

                if (type == 2) {// 审核通过

                    if (feeType == 4) {
                        // 审批状态更新
                        rec.setValue({ fieldId: FIELD_BODY_FEE_AR_TYPE, value: type });
                        rec.save();

                        // 账单
                        var vendorBillDbRec = record.transform({
                            fromType: RECORD_TYPE_PURCHASE_ORDER,
                            fromId: id,
                            toType: 'vendorbill',
                            isDynamic: true,
                        });
                        applyVendorPaymentTerms(vendorBillDbRec, rec.getValue('entity'));
                        vendorBillDbRec.save();

                        // 更新费用信息状态
                        try {
                            record.submitFields({
                                type: RECORD_TYPE_TRANSFER_ORDER,
                                id: transorder_id,
                                values: {
                                    custbody_swc_po_db_type: 4
                                }
                            });
                        } catch (error) {
                            record.submitFields({
                                type: RECORD_TYPE_PURCHASE_ORDER,
                                id: transorder_id,
                                values: {
                                    custbody_swc_po_db_type: 4
                                }
                            });
                        }


                        // 读取费用类采购订单状态。
                        try {
                            record.submitFields({
                                type: 'customrecord_swc_trnfrord_db',
                                id: po_db_id,
                                values: {
                                    custrecord_swc_trnfrord_po_type: 2
                                }
                            });
                        } catch (e) {
                            var po_db_id_hw = rec.getValue('custbody_swc_hw_po_db_id');
                            record.submitFields({
                                type: 'customrecord_swc_trnfrord_db_hw',
                                id: po_db_id_hw,
                                values: {
                                    custrecord_swc_hw_trnfrord_po_type: 2
                                }
                            });
                        }
                    }
                } else {
                    // 驳回
                    rec.setValue({ fieldId: FIELD_BODY_FEE_AR_TYPE, value: type });
                    rec.save();

                    // 采购订单类型
                    if (feeType == 4) {// 费用类
                        // 更新费用信息状态 - 已驳回
                        try {
                            record.submitFields({
                                type: RECORD_TYPE_TRANSFER_ORDER,
                                id: transorder_id,
                                values: {
                                    custbody_swc_po_db_type: 3
                                }
                            });
                        } catch (error) {
                            record.submitFields({
                                type: RECORD_TYPE_PURCHASE_ORDER,
                                id: transorder_id,
                                values: {
                                    custbody_swc_po_db_type: 3
                                }
                            });
                        }


                        // 读取费用类采购订单状态。
                        //     type: 'customrecord_swc_trnfrord_db',
                        //     id: po_db_id,
                        //     values: {
                        //         custrecord_swc_trnfrord_po_type: 3

                        try {
                            record.submitFields({
                                type: 'customrecord_swc_trnfrord_db',
                                id: po_db_id,
                                values: {
                                    custrecord_swc_trnfrord_po_type: 3
                                }
                            });
                        } catch (e) {
                            var po_db_id_hw = rec.getValue('custbody_swc_hw_po_db_id');
                            record.submitFields({
                                type: 'customrecord_swc_trnfrord_db_hw',
                                id: po_db_id_hw,
                                values: {
                                    custrecord_swc_hw_trnfrord_po_type: 2
                                }
                            });
                        }

                    }
                }
                result_str.data = '提交成功';
            } catch (e) {
                log.debug('物流审核异常 ： ', e);
                result_str.data = '物流审核失败,请联系管理人员';
            }
            return result_str;
        }

        /**
         * 工单组装
         * @param billId
         */
        function workOrderAssembly(billId) {
            var result_str = {};

            try {
                var woIds = [];
                log.audit('billId', billId);
                var customrecord_swc_wl_plan_detailSearchObj = search.create({
                    type: RECORD_TYPE_WL_PLAN_DETAIL,
                    filters:
                        [
                            ["custrecord_swc_wl_plan_order_id", "anyof", billId],
                            "AND",
                            ["custrecord_swc_wl_d_po_num.mainline", "is", "T"],
                            "AND",
                            ["custrecord_swc_wl_d_bom_version.isinactive", "is", "F"]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: FIELD_WL_D_SKU,
                                summary: "GROUP",
                                label: "SKU"
                            }),
                            search.createColumn({
                                name: "custrecord_swc_wl_d_bom_version",
                                summary: "GROUP",
                                label: "BOM版本"
                            }),
                            search.createColumn({
                                name: FIELD_WL_D_SUPERIOR_QTY_Z,
                                summary: "SUM",
                                label: "本次真实发运优等品数量"
                            }),
                            search.createColumn({
                                name: FIELD_WL_D_GOOD_QTY_Z,
                                summary: "SUM",
                                label: "本次真实发运良品数量"
                            }),
                            search.createColumn({
                                name: "location",
                                join: "CUSTRECORD_SWC_WL_D_PO_NUM",
                                summary: "GROUP",
                                label: "地点"
                            }),
                            search.createColumn({
                                name: "internalid",
                                join: "CUSTRECORD_SWC_WL_D_BOM_VERSION",
                                summary: "GROUP",
                                label: "内部 ID"
                            }),
                            search.createColumn({
                                name: "subsidiary",
                                join: "CUSTRECORD_SWC_WL_D_PO_NUM",
                                summary: "GROUP",
                                label: "子公司"
                            }),
                            search.createColumn({
                                name: "custrecord_swc_wl_d_lot",
                                summary: "GROUP",
                                label: "批次号"
                            }),
                            search.createColumn({
                                name: "custrecord_swc_wl_d_item",
                                summary: "GROUP",
                                label: SUBLIST_ITEM
                            }),
                            search.createColumn({
                                name: "custrecord_swc_wl_transfer",
                                join: "custrecord_swc_wl_plan_order_id",
                                summary: "GROUP",
                                label: "关联原材料仓调拨半成品仓转移单号"
                            }),
                            search.createColumn({
                                name: "type",
                                join: "CUSTRECORD_SWC_WL_D_SKU",
                                summary: "GROUP",
                                label: "类型"
                            })
                        ]
                });
                var workOrderSearch = getAllResults(customrecord_swc_wl_plan_detailSearchObj);
                var woIds = [];
                var gdflag = false;
                var skuDate = {};
                if (workOrderSearch && workOrderSearch.length > 0) {
                    var yypcObj = {};
                    for (let z = 0; z < workOrderSearch.length; z++) {
                        var data = workOrderSearch[z];
                        var location = data.getValue({
                            name: "location",
                            join: "CUSTRECORD_SWC_WL_D_PO_NUM",
                            summary: "GROUP",
                            label: "地点"
                        });
                        var sku = data.getValue({
                            name: FIELD_WL_D_SKU,
                            summary: "GROUP",
                            label: "SKU"
                        });
                        var bom = data.getValue({
                            name: "custrecord_swc_wl_d_bom_version",
                            summary: "GROUP",
                            label: "BOM版本"
                        });
                        var bomV = data.getValue({
                            name: "internalid",
                            join: "CUSTRECORD_SWC_WL_D_BOM_VERSION",
                            summary: "GROUP",
                            label: "内部 ID"
                        });

                        var subId = data.getValue({
                            name: "subsidiary",
                            join: "CUSTRECORD_SWC_WL_D_PO_NUM",
                            summary: "GROUP",
                            label: "子公司"
                        });

                        var y = data.getValue({
                            name: FIELD_WL_D_SUPERIOR_QTY_Z,
                            summary: "SUM",
                            label: "本次真实发运优等品数量"
                        }) || 0;

                        var l = data.getValue({
                            name: FIELD_WL_D_GOOD_QTY_Z,
                            summary: "SUM",
                            label: "本次真实发运良品数量"
                        }) || 0;

                        var lot = data.getValue({
                            name: "custrecord_swc_wl_d_lot",
                            summary: "GROUP",
                            label: "批次号"
                        });

                        var item = data.getValue({
                            name: "custrecord_swc_wl_d_item",
                            summary: "GROUP",
                            label: SUBLIST_ITEM
                        });

                        var transferId = data.getValue({
                            name: "custrecord_swc_wl_transfer",
                            join: "custrecord_swc_wl_plan_order_id",
                            summary: "GROUP",
                            label: "关联原材料仓调拨半成品仓转移单号"
                        });

                        var itemType = data.getValue({
                            name: "type",
                            join: "CUSTRECORD_SWC_WL_D_SKU",
                            summary: "GROUP",
                            label: "类型"
                        });

                        var newRtn = '';
                        log.error('itemType', itemType);
                        skuDate[sku] = '1';
                        if (itemType == 'Assembly') {
                            gdflag = true;
                            skuDate[sku] = '2';

                            if (y > 0) {
                                var createWorkOrderJson = {
                                    subsidiaryId: subId,
                                    locationId: location,
                                    assemblyItemId: sku,
                                    billofmaterialsId: bom,
                                    billofmaterialsrevisionId: bomV,
                                    quantity: Number(y),
                                    tranDate: new Date(),
                                    finishedGoodLot: lot,
                                    finishedGoodLotQty: Number(y),
                                    item: item,
                                    transferId: transferId,
                                    billId: billId
                                }
                                var rtn = createAssemblyBuild(createWorkOrderJson, yypcObj);
                                if (rtn.id != '') {
                                    woIds.push(rtn.id)
                                }
                            }

                            if (l > 0) {
                                var createWorkOrderJson = {
                                    subsidiaryId: subId,
                                    locationId: location,
                                    assemblyItemId: sku,
                                    billofmaterialsId: bom,
                                    billofmaterialsrevisionId: bomV,
                                    quantity: Number(l),
                                    tranDate: new Date(),
                                    finishedGoodLot: lot,
                                    finishedGoodLotQty: Number(l),
                                    item: item,
                                    transferId: transferId,
                                    billId: billId
                                }
                                var rtn2 = createAssemblyBuild(createWorkOrderJson, yypcObj);
                                if (rtn2.id != '') {
                                    woIds.push(rtn2.id)
                                }
                            }

                        }
                    }
                }

                if (woIds.length > 0) {

                    var rec = record.load({ type: RECORD_TYPE_WL_PLAN_ORDER, id: billId, isDynamic: true });
                    rec.setValue({ fieldId: 'custrecord_swc_wl_plan_wos', value: woIds });
                    rec.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 6 });

                    if (Object.keys(skuDate).length > 0) {
                        var lineCount = rec.getLineCount({
                            sublistId: SUBLIST_WL_PLAN_DETAIL
                        });
                        for (let i = 0; i < lineCount; i++) {
                            rec.selectLine({
                                sublistId: SUBLIST_WL_PLAN_DETAIL,
                                line: i
                            });
                            var lineSku = rec.getCurrentSublistValue({
                                sublistId: SUBLIST_WL_PLAN_DETAIL,
                                fieldId: FIELD_WL_D_SKU
                            })
                            if (lineSku in skuDate) {
                                if (skuDate[lineSku] == '1')
                                    rec.setCurrentSublistValue({
                                        sublistId: SUBLIST_WL_PLAN_DETAIL,
                                        fieldId: 'custrecord_swc_wl_d_if_assembly',
                                        value: true
                                    })
                            }
                            rec.commitLine({ sublistId: SUBLIST_WL_PLAN_DETAIL })
                        }
                    }
                    rec.save();

                    result_str.data = '工单组装成功，请确认！';
                } else if (!gdflag) {
                    var rec = record.load({ type: RECORD_TYPE_WL_PLAN_ORDER, id: billId, isDynamic: true });
                    rec.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 6 });

                    if (Object.keys(skuDate).length > 0) {
                        var lineCount = rec.getLineCount({
                            sublistId: SUBLIST_WL_PLAN_DETAIL
                        });
                        for (let i = 0; i < lineCount; i++) {
                            rec.selectLine({
                                sublistId: SUBLIST_WL_PLAN_DETAIL,
                                line: i
                            });
                            var lineSku = rec.getCurrentSublistValue({
                                sublistId: SUBLIST_WL_PLAN_DETAIL,
                                fieldId: FIELD_WL_D_SKU
                            })
                            if (lineSku in skuDate) {
                                if (skuDate[lineSku] == '1')
                                    rec.setCurrentSublistValue({
                                        sublistId: SUBLIST_WL_PLAN_DETAIL,
                                        fieldId: 'custrecord_swc_wl_d_if_assembly',
                                        value: true
                                    })
                            }
                            rec.commitLine({ sublistId: SUBLIST_WL_PLAN_DETAIL })
                        }
                    }
                    rec.save();

                    result_str.data = '该工单无需组装!';
                } else {
                    result_str.data = '工单组装失败,请联系管理人员!';
                }


            } catch (e) {
                if (e.message.includes('由于货品批次供货不足')) {
                    result_str.data = '库存不足，请确认！';
                } else {
                    result_str.data = '工单组装失败,请联系管理人员';
                }
                log.debug('工单组装异常 ： ', e);
            }

            return result_str;
        }

        /**
         * 检索共通方法
         * @param mySearch
         * @returns {*[]}
         */
        function getAllResults(mySearch) {
            var resultSet = mySearch.run();
            var resultArr = [];
            var start = 0;
            var step = 1000;
            var results = resultSet.getRange({
                start: start,
                end: step
            });
            while (results && results.length > 0) {
                resultArr = resultArr.concat(results);
                start = Number(start) + Number(step);
                results = resultSet.getRange({
                    start: start,
                    end: Number(start) + Number(step)
                });
            }
            return resultArr;
        }

        /**
         * 四舍五入
         * @param num
         * @param len
         * @returns {number}
         */
        function fixed(num, len) {
            return Math.round(num * Math.pow(10, len)) / Math.pow(10, len);
        }

        /**
         * 创建 Work Order
         * @param {Object} params
         * @param {number|string} params.subsidiaryId   子公司 internalId（OneWorld 才需要；非 OneWorld 可不传）
         * @param {number|string} params.locationId     地点 internalId（强烈建议传）
         * @param {number|string} params.assemblyItemId 装配件（Assembly Item）internalId（必传）
         * @param {number} params.quantity              生产数量（必传）
         * @param {string|Date} [params.tranDate]       交易日期（可不传，默认今天）
         * @param {string} [params.memo]                备注
         * @param {Array<Object>} [params.components]   可选：覆盖/写入组件行（不传则走系统自动带出）
         components: [{ itemId, quantity, unitsId, lineLocationId, inventoryDetail }]
         inventoryDetail: [{ inventoryNumberId, quantity }]  // 仅在需要分配批次/序列号时使用
         */
        function createWorkOrder(params) {
            var msg = {};
            try {
                log.debug('params', params);
                if (!params || !params.assemblyItemId || !params.quantity) {
                    msg.id = '';
                    msg.msg = 'assemblyItemId 与 quantity 为必填。';
                }

                const wo = record.create({
                    type: record.Type.WORK_ORDER,
                    isDynamic: true
                });

                // 子公司
                safeSetValue(wo, 'subsidiary', params.subsidiaryId);
                // 装配件
                safeSetValue(wo, 'assemblyitem', params.assemblyItemId);
                // 地点
                safeSetValue(wo, 'location', params.locationId);
                // 物料清单
                safeSetValue(wo, 'billofmaterials', params.billofmaterialsId);
                // 物料清单版本
                // safeSetValue(wo, 'billofmaterialsrevision', params.billofmaterialsrevisionId);
                // 数量
                safeSetValue(wo, 'quantity', params.quantity);

                var skuAry = bomMainSku(params.billofmaterialsId, wo.getValue('billofmaterialsrevision'));

                var itemLine = 0;
                if (params.finishedGoodLot) {
                    const sublistId = SUBLIST_ITEM;
                    const lineCount = wo.getLineCount({ sublistId });

                    for (let i = 0; i < lineCount; i++) {
                        wo.selectLine({ sublistId, line: itemLine });

                        var item = wo.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: SUBLIST_ITEM });

                        var lotNum2 = getInventoryNumberId(params.assemblyItemId, params.finishedGoodLot);
                        log.debug('lotNum2', lotNum2)
                        log.debug(SUBLIST_ITEM, item);
                        log.debug('skuAry', skuAry);
                        if (skuAry.indexOf(item) !== -1) {
                            const invDetail = wo.getCurrentSublistSubrecord({
                                sublistId: SUBLIST_ITEM,
                                fieldId: 'inventorydetail'
                            });
                            invDetail.selectNewLine({ sublistId: 'inventoryassignment' });

                            var lotNum = findInventoryNumberIdByText(params.finishedGoodLot);
                            log.debug('lotNum', lotNum);

                            invDetail.setCurrentSublistText({
                                sublistId: 'inventoryassignment',
                                fieldId: 'receiptinventorynumber',
                                text: String(params.finishedGoodLot)
                                // value: lotNum
                            });
                            invDetail.setCurrentSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'quantity',
                                value: params.finishedGoodLotQty
                            });

                            invDetail.commitLine({ sublistId: 'inventoryassignment' });
                        }
                        wo.commitLine({ sublistId: sublistId });
                        itemLine++;
                    }
                }

                var woId = wo.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: false
                });
                msg.id = woId;
                msg.msg = '';
            } catch (e) {
                log.error('工单组装异常', e)
                msg.id = '';
                msg.msg = '工单组装异常，请联系管理人员';
            }
            return msg;

        }

        /**
         * 创建装配件构建（Assembly Build）
         * @param {Object} yypcObj
         * @param {Object} params
         * @param {number|string} params.subsidiaryId   子公司 internalId（OneWorld 才需要；非 OneWorld 可不传）
         * @param {number|string} params.locationId     地点 internalId（强烈建议传）
         * @param {number|string} params.assemblyItemId 装配件（Assembly Item）internalId（必传）
         * @param {number} params.quantity              构建数量（必传）
         * @param {string|Date} [params.tranDate]       交易日期（可不传，默认今天）
         * @param {string} [params.memo]                备注
         * @param {Array<Object>} [params.components]   可选：覆盖/写入组件行（不传则走系统自动带出）
         * components: [{ itemId, quantity, unitsId, lineLocationId, inventoryDetail }]
         * inventoryDetail: [{ inventoryNumberId, quantity }]  // 仅在需要分配批次/序列号时使用
         */
        function createAssemblyBuild(params, yypcObj) {
            var msg = {};
            try {
                log.debug('params', params);
                if (!params || !params.assemblyItemId || !params.quantity) {
                    msg.id = '';
                    msg.msg = 'assemblyItemId 与 quantity 为必填。';
                    return msg;
                }

                let otherItemPC = {};

                log.audit('otherItemPC', otherItemPC);

                //     msg.id = '';
                //     msg.msg = '装配件构建创建时原料批次取值异常，请联系管理人员';

                const assemblyBuild = record.create({
                    type: record.Type.ASSEMBLY_BUILD,
                    isDynamic: true
                });

                // 设置基本字段
                // 子公司
                safeSetValue(assemblyBuild, 'subsidiary', params.subsidiaryId);
                // 装配件
                safeSetValue(assemblyBuild, SUBLIST_ITEM, params.assemblyItemId);
                // 地点
                safeSetValue(assemblyBuild, 'location', params.locationId);

                // // 日期
                //         ? params.tranDate
                //         : format.parse({ value: params.tranDate, type: format.Type.DATE });
                //     safeSetValue(assemblyBuild, 'trandate', d);

                // 备注
                if (params.memo) {
                    safeSetValue(assemblyBuild, 'memo', params.memo);
                }
                // 数量
                safeSetValue(assemblyBuild, 'quantity', params.quantity);
                log.error('params.finishedGoodLot', params.finishedGoodLot);

                //关联物流发运
                if (params.billId)
                    safeSetValue(assemblyBuild, 'custbody_swc_assembly_ship', params.billId);
                // 设置成品批次号
                if (params.finishedGoodLot) {
                    // 创建成品的 inventoryDetail 子记录
                    const mainInvDetail = assemblyBuild.getSubrecord({
                        fieldId: 'inventorydetail'
                    });

                    log.audit('mainInvDetail', mainInvDetail);
                    mainInvDetail.selectNewLine({ sublistId: 'inventoryassignment' });

                    // 根据批次号文本查找 inventoryNumberId

                    log.error('设置序列号');
                    mainInvDetail.setCurrentSublistText({
                        sublistId: 'inventoryassignment',
                        fieldId: 'receiptinventorynumber',
                        text: params.finishedGoodLot
                    });

                    // else {
                    //     // 如果找不到，尝试设置文本
                    //     mainInvDetail.setCurrentSublistText({
                    //         sublistId: 'inventoryassignment',
                    //         fieldId: 'receiptinventorynumber',
                    //         text: String(params.finishedGoodLot)

                    log.error('设置数量');
                    mainInvDetail.setCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'quantity',
                        value: params.quantity
                    });

                    mainInvDetail.commitLine({ sublistId: 'inventoryassignment' });
                }
                if (params.billofmaterialsId) {
                    safeSetValue(assemblyBuild, 'billofmaterials', params.billofmaterialsId);
                }

                var skuAry = bomMainSku(params.billofmaterialsId, assemblyBuild.getValue('billofmaterialsrevision'));

                log.debug('skuAry', skuAry);

                //获取批次号 以及每个批次号的数量
                var lotObj = getLotData(skuAry, params.locationId, otherItemPC, yypcObj);
                log.error('lotObj', lotObj);
                // 如果传入了 components，则覆盖组件行
                const sublistId = 'component';
                const lineCount = assemblyBuild.getLineCount({ sublistId });

                log.debug('子列表数量', lineCount);
                for (let i = 0; i < lineCount; i++) {
                    assemblyBuild.selectLine({ sublistId, line: i });

                    var item = assemblyBuild.getCurrentSublistValue({ sublistId: 'component', fieldId: SUBLIST_ITEM });
                    var remainingQuantity = assemblyBuild.getCurrentSublistValue({ sublistId: 'component', fieldId: 'quantity' });


                    log.error('子列表货品', {
                        item: item,
                        remainingQuantity: remainingQuantity
                    });
                    const invDetail = assemblyBuild.getCurrentSublistSubrecord({
                        sublistId: 'component',
                        fieldId: 'componentinventorydetail'
                    });
                    if (item == params.item) {
                        log.error('主要货品')
                        invDetail.selectNewLine({ sublistId: 'inventoryassignment' });


                        invDetail.setCurrentSublistText({
                            sublistId: 'inventoryassignment',
                            fieldId: 'receiptinventorynumber',
                            text: String(params.finishedGoodLot)
                            // value: lotNum
                        });
                        var pch = invDetail.getCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'receiptinventorynumber',
                        });
                        log.error('pch', pch);
                        invDetail.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            value: params.finishedGoodLotQty
                        });

                        invDetail.commitLine({ sublistId: 'inventoryassignment' });
                    } else {
                        log.error('其它货品')
                        // 获取对应item的批次数组
                        if (item in lotObj) {
                            var lots = lotObj[item];
                            var lotResult = [];
                            // 循环处理每个批次
                            for (var j = 0; j < lots.length && remainingQuantity > 0; j++) {
                                var lot = lots[j];

                                // 判断当前批次能提供多少数量
                                if (lot.quantity >= remainingQuantity) {
                                    // 当前批次足够满足剩余需求
                                    lotResult.push({
                                        lotText: lot.lotText,
                                        lotId: lot.lotId,
                                        quantity: remainingQuantity
                                    });
                                    remainingQuantity = 0;
                                } else {
                                    // 当前批次全部用上，但还不够
                                    if (lot.quantity > 0) {
                                        lotResult.push({
                                            lotText: lot.lotText,
                                            lotId: lot.lotId,
                                            quantity: lot.quantity
                                        });
                                        remainingQuantity -= lot.quantity;
                                    }
                                }
                            }

                            log.error('lotResult', lotResult);
                            if (lotResult.length > 0) {

                                for (let y = 0; y < lotResult.length; y++) {
                                    var subLine = lotResult[y];

                                    invDetail.selectNewLine({ sublistId: 'inventoryassignment' });

                                    log.error('subLine', subLine)
                                    invDetail.setCurrentSublistText({
                                        sublistId: 'inventoryassignment',
                                        fieldId: 'receiptinventorynumber',
                                        text: subLine.lotText
                                        // value: lotNum
                                    });
                                    var pch = invDetail.getCurrentSublistValue({
                                        sublistId: 'inventoryassignment',
                                        fieldId: 'receiptinventorynumber',
                                    });
                                    log.error('pch', pch);
                                    // //状态
                                    // invDetail.setCurrentSublistText({
                                    //     sublistId: 'inventoryassignment',
                                    //     fieldId: 'status',
                                    //     text: subLine.lotText
                                    //     // value: lotNum
                                    invDetail.setCurrentSublistValue({
                                        sublistId: 'inventoryassignment',
                                        fieldId: 'quantity',
                                        value: subLine.quantity
                                    });

                                    log.audit('yypcObj', yypcObj);
                                    if (!(subLine.lotId in yypcObj)) {
                                        yypcObj[subLine.lotId] = 0;
                                    }

                                    yypcObj[subLine.lotId] = yypcObj[subLine.lotId] + Number(subLine.quantity);

                                    invDetail.commitLine({ sublistId: 'inventoryassignment' });
                                }
                            }
                        }
                    }
                    assemblyBuild.commitLine({ sublistId: sublistId });
                }



                // 保存装配件构建
                var assemblyBuildId = assemblyBuild.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: false
                });

                msg.id = assemblyBuildId;
                // msg.id = '';
                msg.msg = '';

            } catch (e) {
                log.error('装配件构建创建异常', e);
                msg.id = '';
                msg.msg = '装配件构建创建异常，请联系管理人员';
            }
            return msg;
        }

        /**
         * 查询调拨单相关数据。
         */
        function searchTransferData(transferId) {

            log.audit('transferId', transferId);

            const ids = transferId ? transferId.split(',') : [];
            log.audit('ids', ids);
            const transferorderSearchObj = search.create({
                type: "itemreceipt",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }, { "name": "includeperiodendtransactions", "value": "F" }],
                filters:
                    [
                        ["inventorydetail.inventorynumber", "noneof", "@NONE@"],
                        "AND",
                        ["type", "anyof", "ItemRcpt"],
                        "AND",
                        ["createdfrom.type", "anyof", "PurchOrd", "TrnfrOrd"],
                        "AND",
                        ["createdfrom.internalid", "anyof", ids]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: SUBLIST_ITEM,
                            summary: "GROUP",
                            label: "货品"
                        }),
                        search.createColumn({
                            name: "inventorynumber",
                            join: "inventoryDetail",
                            summary: "GROUP",
                            label: " 编号"
                        })
                    ]
            });

            var obj = {};
            var pcData = [];
            var results = getAllResults(transferorderSearchObj);
            for (var i = 0; i < results.length; i++) {
                let result = results[i];

                let item = result.getValue({
                    name: SUBLIST_ITEM,
                    summary: "GROUP",
                    label: "货品"
                });
                let inventorynumber = result.getValue({
                    name: "inventorynumber",
                    join: "inventoryDetail",
                    summary: "GROUP",
                    label: " 编号"
                });

                if (item && inventorynumber) {
                    pcData.push(inventorynumber);
                    //     obj[item] = {
                    //         'pcdata': []
                    //
                    // obj[item].pcdata.push(inventorynumber);
                }
            }

            return pcData;
        }

        /**
         * 获取批次数据
         * searchName:各仓库货品信息_sht
         * @param itemArr
         * @param locationArr
         * @param otherItemPC
         * @param yypcObj
         * @return {{}}
         */
        function getLotData(itemArr, locationArr, otherItemPC, yypcObj) {

            //         itemData.push(i);
            //                 pcData.push(j);
            log.audit('otherItemPC', otherItemPC);
            var inventorydetailSearchObj = search.create({
                type: "inventorynumber",
                filters:
                    [
                        [SUBLIST_ITEM, "anyof", itemArr],
                        "AND",
                        ["location", "anyof", locationArr],
                        "AND",
                        // ["status","anyof","1"],
                        // 'AND',
                        ["quantityavailable", "notequalto", "0"],

                    ],
                columns:
                    [
                        search.createColumn({
                            name: "inventorynumber",
                            label: " 编号"
                        }),
                        //     name: "status",
                        //     label: "状态"
                        search.createColumn({
                            name: "quantityavailable",
                            label: "货品计数"
                        }),
                        search.createColumn({
                            name: "internalid",
                            label: "内部 ID"
                        }),
                        search.createColumn({
                            name: SUBLIST_ITEM,
                            label: "货品"
                        })
                    ]
            });
            var data = {};
            var results = getAllResults(inventorydetailSearchObj);
            for (var i = 0; i < results.length; i++) {
                var lotId = results[i].getValue({ name: "internalid", label: "内部ID" });
                var lotText = results[i].getValue({ name: "inventorynumber", label: "批次号" });
                var quantity = results[i].getValue({ name: "quantityavailable", label: "数量" });
                var item = results[i].getValue({ name: SUBLIST_ITEM, label: "货品" });
                var key = item;
                var yypcquantity = 0;
                if (lotId in yypcObj)
                    yypcquantity = yypcObj[lotId];
                data[key] = data[key] || [];
                data[key].push({
                    lotId: lotId,
                    lotText: lotText,
                    quantity: quantity,
                })
            }
            return data;
        }

        /**
         * 获取批次数据
         * searchName:各仓库货品信息_sht
         * @param itemArr
         * @param locationArr
         * @param otherItemPC
         * @param yypcObj
         * @return {{}}
         */
        function getLotData2(itemArr, locationArr, otherItemPC, yypcObj) {

            //         itemData.push(i);
            //                 pcData.push(j);
            log.audit('otherItemPC', otherItemPC);
            var inventorydetailSearchObj = search.create({
                type: "inventorydetail",
                filters:
                    [
                        // [SUBLIST_ITEM,"anyof",itemData],
                        // "AND",
                        ["inventorynumber", "anyof", otherItemPC],
                        "AND",
                        ["status", "anyof", "1"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "inventorynumber",
                            summary: "GROUP",
                            label: " 编号"
                        }),
                        search.createColumn({
                            name: "status",
                            summary: "GROUP",
                            label: "状态"
                        }),
                        search.createColumn({
                            name: "itemcount",
                            summary: "SUM",
                            label: "货品计数"
                        }),
                        search.createColumn({
                            name: "internalid",
                            join: "inventoryNumber",
                            summary: "GROUP",
                            label: "内部 ID"
                        }),
                        search.createColumn({
                            name: SUBLIST_ITEM,
                            summary: "GROUP",
                            label: "货品"
                        })
                    ]
            });
            var data = {};
            var results = getAllResults(inventorydetailSearchObj);
            for (var i = 0; i < results.length; i++) {
                var lotId = results[i].getValue({ name: "internalid", join: "inventoryNumber", summary: "GROUP", label: "内部ID" });
                var lotText = results[i].getText({ name: "inventorynumber", summary: "GROUP", label: "批次号" });
                var quantity = results[i].getValue({ name: "itemcount", summary: "SUM", label: "数量" });
                var item = results[i].getValue({ name: SUBLIST_ITEM, summary: "GROUP", label: "货品" });
                var key = item;
                var yypcquantity = 0;
                if (lotId in yypcObj)
                    yypcquantity = yypcObj[lotId];
                data[key] = data[key] || [];
                data[key].push({
                    lotId: lotId,
                    lotText: lotText,
                    quantity: quantity,
                })
            }
            return data;
        }

        /**
         * 设置字段值共通方法
         * @param rec
         * @param fieldId
         * @param value
         */
        function safeSetValue(rec, fieldId, value) {
            try {
                rec.setValue({ fieldId, value });
            } catch (e) {
                log.debug('safeSetValue skipped', `${fieldId} not set. reason=${e.message}`);
            }
        }

        /**
         * 物流发运单无效处理
         * @param billId
         * @returns {{}}
         */
        function wlRm(billId) {
            var result_str = {};
            try {
                // 采购订单回写数据
                var poRtnJson = {};
                // 真实排柜回写数据
                var zsRtnJson = {};

                // 读取物流发运单
                var rec = record.load({ type: RECORD_TYPE_WL_PLAN_ORDER, id: billId });

                // 获取物流发运明细数据
                var wlPlanSubId = SUBLIST_WL_PLAN_DETAIL
                var wlSubList = rec.getLineCount({ sublistId: wlPlanSubId }) || 0;

                for (var wls = 0; wls < wlSubList; wls++) {
                    // 预排柜单Id
                    var yPgId = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_ca_num_o', line: wls });
                    // 预排柜单明细Id
                    var yPgLineId = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_ca_num', line: wls });
                    // 真实排柜单Id
                    var zsPgId = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_actual_cabinet_zs', line: wls });
                    // 真实排柜单明细Id
                    var zsPgLineId = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_actual_cabinet', line: wls });

                    // 采购订单Id
                    var poId = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: FIELD_WL_D_PO_NUM, line: wls });
                    // 成品SKU
                    var d_sku = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: FIELD_WL_D_SKU, line: wls });
                    // 国家
                    var d_country = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_country', line: wls });
                    // 仓库类型
                    var d_location_type = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_location_type', line: wls });
                    // 店铺
                    var d_customer = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: FIELD_WL_D_CUSTOMER, line: wls });
                    // 区域
                    var d_region = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_region', line: wls });
                    // 优等品数量
                    var y = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: FIELD_WL_D_SUPERIOR_QTY_Z, line: wls }) || 0;
                    // 良品数量
                    var l = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: FIELD_WL_D_GOOD_QTY_Z, line: wls }) || 0;

                    var qty = Number(y) + Number(l)

                    // 1.采购订单回写Json做成
                    var poKey = d_sku + '_' + d_country + '_' + d_location_type + '_' + d_customer + '_' + d_region;

                    if (poRtnJson.hasOwnProperty(poId)) {
                        if (poRtnJson[poId].hasOwnProperty(poKey)) {
                            var oldQty = poRtnJson[poId][poKey];
                            poRtnJson[poId][poKey] = Number(qty) + Number(oldQty);
                        } else {
                            poRtnJson[poId][poKey] = qty;
                        }
                    } else {
                        poRtnJson[poId] = {};
                        poRtnJson[poId][poKey] = qty;
                    }

                    // 真实排柜回写数据
                    if (zsRtnJson.hasOwnProperty(zsPgId)) {
                        if (zsRtnJson[zsPgId].hasOwnProperty(zsPgLineId)) {
                            var oldY = zsRtnJson[zsPgId][zsPgLineId].y;
                            var oldL = zsRtnJson[zsPgId][zsPgLineId].l;
                            zsRtnJson[zsPgId][zsPgLineId].y = Number(oldY) + Number(y)
                            zsRtnJson[zsPgId][zsPgLineId].l = Number(oldL) + Number(l)
                        } else {
                            zsRtnJson[zsPgId][zsPgLineId] = {
                                y: y,
                                l: l
                            }
                        }
                    } else {
                        zsRtnJson[zsPgId] = {}
                        zsRtnJson[zsPgId][zsPgLineId] = {
                            y: y,
                            l: l
                        }
                    }

                }

                // 要回写真实排柜单据，
                for (const zsRtnJsonKey in zsRtnJson) {
                    // load真实排柜
                    var rec2 = record.load({ type: RECORD_TYPE_ACTUAL_CABINET, id: zsRtnJsonKey });

                    var zsLineData = zsRtnJson[zsRtnJsonKey];
                    // 获取物流发运明细数据
                    var zsSubId = SUBLIST_ACTUAL_CABINET_DETAIL
                    var zsLine = rec2.getLineCount({ sublistId: zsSubId }) || 0;

                    for (var zl = 0; zl < zsLine; zl++) {
                        // 预排柜单明细Id
                        var id = rec2.getSublistValue({ sublistId: zsSubId, fieldId: 'id', line: zl });

                        if (zsLineData.hasOwnProperty(id)) {
                            // y
                            var totalY = rec2.getSublistValue({ sublistId: zsSubId, fieldId: 'custrecord_swc_acd_quantity_excellent', line: zl });
                            // l
                            var totalL = rec2.getSublistValue({ sublistId: zsSubId, fieldId: 'custrecord_swc_ecd_quantity_fine', line: zl });

                            rec2.setSublistValue({
                                sublistId: zsSubId,
                                fieldId: 'custrecord_swc_acd_quantity_excellent',
                                line: zl,
                                value: Number(totalY) - Number(zsLineData[id].y)
                            });
                            rec2.setSublistValue({
                                sublistId: zsSubId,
                                fieldId: 'custrecord_swc_ecd_quantity_fine',
                                line: zl,
                                value: Number(totalL) - Number(zsLineData[id].l)
                            });

                        }
                    }
                    rec2.save();
                }

                // 回写采购订单
                log.debug('poRtnJson', poRtnJson)
                for (const poRtnJsonKey in poRtnJson) {
                    var rec3 = record.load({ type: RECORD_TYPE_PURCHASE_ORDER, id: poRtnJsonKey });
                    var poLineData = poRtnJson[poRtnJsonKey];
                    // 获取物流发运明细数据
                    var itemSubId = SUBLIST_ITEM
                    var poLine = rec3.getLineCount({ sublistId: itemSubId }) || 0;

                    for (var pl = 0; pl < poLine; pl++) {


                        // 成品SKU
                        var origin_sku = rec3.getSublistValue({ sublistId: itemSubId, fieldId: 'custcol_swc_pr_origin_sku', line: pl });
                        // 国家
                        var country_code = rec3.getSublistValue({ sublistId: itemSubId, fieldId: 'custcol_swc_country_code', line: pl });
                        // 仓库类型
                        var loc_type = rec3.getSublistValue({ sublistId: itemSubId, fieldId: 'custcol_swc_loc_type', line: pl });
                        // 店铺
                        var store = rec3.getSublistValue({ sublistId: itemSubId, fieldId: 'custcol_swc_store', line: pl });
                        // 区域
                        var us_districts = rec3.getSublistValue({ sublistId: itemSubId, fieldId: 'custcol_swc_us_districts', line: pl });

                        var poKey2 = origin_sku + '_' + country_code + '_' + loc_type + '_' + store + '_' + us_districts;
                        log.debug('poKey2', poKey2)
                        if (poLineData.hasOwnProperty(poKey2)) {
                            var wl_qty = rec3.getSublistValue({ sublistId: itemSubId, fieldId: 'custcol_swc_wl_qty', line: pl });
                            rec3.setSublistValue({
                                sublistId: itemSubId,
                                fieldId: 'custcol_swc_wl_qty',
                                line: pl,
                                value: Number(wl_qty) - Number(poLineData[poKey2])
                            });
                        }
                    }
                    rec3.save();
                }

                // 物流发运单和物流发运单明细无效化
                record.submitFields({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: billId,
                    values: {
                        isinactive: true,
                        custrecord_swc_wl_plan_status: 13
                    }
                });

                result_str.data = '当前物流发运单已无效！';
                return result_str;

            } catch (e) {
                log.debug('物流无效异常 ： ', e);
                result_str.data = '物流无效异常，请联系管理人员！';
                return result_str;
            }
        }

        /**
         * 入库
         * @param id
         * @returns {{}}
         */
        function poToIf(id) {
            var result_str = {};

            try {
                var wlSubId = SUBLIST_WL_PLAN_DETAIL;

                /**
                 * 将任意值安全转换为数字，无法转换时返回 0。
                 */
                function toNumber(n) {
                    return Number(n) || 0;
                }

                var rec = record.load({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: id
                });

                var wlName = rec.getValue('name');

                var wlLine = rec.getLineCount(wlSubId);

                // 预计到岸日期ETA
                var wl_eta = rec.getText('custrecord_swc_wl_eta');
                // 真实排柜时间
                var wl_itemno = rec.getText('custrecord_swc_wl_itemno');

                var poKeyMap = {};
                var keyToRowIds = {};
                var lotJson = {};

                for (var x = 0; x < wlLine; x++) {
                    var poNum = rec.getSublistValue({ sublistId: wlSubId, fieldId: FIELD_WL_D_PO_NUM, line: x });
                    if (!poNum) continue;
                    var poId = String(poNum);

                    // 货品/维度字段
                    var sku = rec.getSublistValue({ sublistId: wlSubId, fieldId: FIELD_WL_D_SKU, line: x });
                    var country = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_country', line: x });
                    var location = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_location_type', line: x });
                    var customer = rec.getSublistValue({ sublistId: wlSubId, fieldId: FIELD_WL_D_CUSTOMER, line: x });
                    var region = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_region', line: x });

                    // 数量（优品/良品）
                    var superior_qty_z = toNumber(rec.getSublistValue({ sublistId: wlSubId, fieldId: FIELD_WL_D_SUPERIOR_QTY_Z, line: x }));
                    var good_qty_z = toNumber(rec.getSublistValue({ sublistId: wlSubId, fieldId: FIELD_WL_D_GOOD_QTY_Z, line: x }));
                    var grade = (superior_qty_z > 0) ? 1 : 2;

                    // 入库数量：有优品就用优品，否则用良品
                    var qty = (superior_qty_z > 0) ? superior_qty_z : good_qty_z;

                    // 费用：预估采购杂费 + 历史杂费差异
                    var fee_zf_ft_yg = toNumber(rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_sj_fee_zf_ft_yg', line: x }));
                    var ls_zf_cy = toNumber(rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_d_ls_zf_cy', line: x }));
                    var amount = round2(fee_zf_ft_yg + ls_zf_cy);

                    var ifKey = sku + '_' + country + '_' + customer + '_' + location + '_' + region + '_' + grade;

                    var rowId = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'id', line: x });
                    rowId = rowId ? String(rowId) : null;

                    if (!poKeyMap[poId]) poKeyMap[poId] = {};
                    if (!poKeyMap[poId][ifKey]) poKeyMap[poId][ifKey] = { qty: 0, amount: 0 };

                    // 聚合 qty/amount（同 ifKey 可能多行）
                    poKeyMap[poId][ifKey].qty = round2(toNumber(poKeyMap[poId][ifKey].qty) + qty);
                    poKeyMap[poId][ifKey].amount = round2(toNumber(poKeyMap[poId][ifKey].amount) + amount);

                    if (rowId) {
                        if (!keyToRowIds[poId]) keyToRowIds[poId] = {};
                        if (!keyToRowIds[poId][ifKey]) keyToRowIds[poId][ifKey] = [];
                        keyToRowIds[poId][ifKey].push(rowId);
                    }
                }

                // 逐 PO 生成 Item Receipt
                log.debug('poKeyMap', poKeyMap)
                var lotJson = {};
                for (var poId in poKeyMap) {
                    if (!poKeyMap.hasOwnProperty(poId)) continue;

                    var tranid_num = search.lookupFields({ type: RECORD_TYPE_PURCHASE_ORDER, id: poId, columns: ['tranid'] });

                    var keyMap = poKeyMap[poId];
                    if (!keyMap) continue;

                    var skuData = [];
                    var taxObj = {};
                    var poRec = record.load({
                        type: RECORD_TYPE_PURCHASE_ORDER,
                        id: poId,
                        isDynamic: true
                    });
                    var poCount = poRec.getLineCount({ sublistId: SUBLIST_ITEM });
                    for (let i = 0; i < poCount; i++) {
                        poRec.selectLine({
                            sublistId: SUBLIST_ITEM,
                            line: i
                        });
                        var poSku = poRec.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: SUBLIST_ITEM });
                        if (skuData.indexOf(poSku) == -1) {
                            skuData.push(poSku);
                        }

                        var poLine = poRec.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_line_no' });
                        var poRate = poRec.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'rate' });
                        taxObj[poLine] = {
                            poRate: poRate,
                            tax: poRec.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'taxrate1' })
                        }
                    }

                    var ifRec = record.transform({
                        fromType: record.Type.PURCHASE_ORDER,
                        toType: record.Type.ITEM_RECEIPT,
                        fromId: poId,
                        isDynamic: true
                    });

                    var len = ifRec.getLineCount({ sublistId: SUBLIST_ITEM });

                    var itemObj = getItemObj(skuData);
                    log.audit('itemObj', itemObj);
                    log.audit('taxObj', taxObj);

                    // 预计到港日期 - 预计到港日期 custrecord_swc_wl_eta
                    ifRec.setText({ fieldId: 'custbody_swc_ideal_dg_date', text: wl_eta })

                    // 真实排柜-出货日期 - 真实排柜时间 。custrecord_swc_wl_itemno
                    ifRec.setText({ fieldId: 'custbody_swc_actual_cg_date', text: wl_itemno })

                    for (var i2 = 0; i2 < len; i2++) {
                        ifRec.selectLine({ sublistId: SUBLIST_ITEM, line: i2 });

                        var pr_origin_sku = ifRec.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_pr_origin_sku' });
                        var country_code = ifRec.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_country_code' });
                        var loc_type = ifRec.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_loc_type' });
                        var store = ifRec.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_store' });
                        var us_districts = ifRec.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_us_districts' });
                        var grade2 = ifRec.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_grade' });

                        var ifKey = pr_origin_sku + '_' + country_code + '_' + store + '_' + loc_type + '_' + us_districts + '_' + grade2;
                        log.debug('ifKey', ifKey);

                        var line_close = ifRec.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_line_close' }) === true
                            || ifRec.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_line_close' }) === 'T';
                        log.debug('line_close', line_close);
                        if (line_close) {
                            // 行关闭，不入库
                            ifRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'itemreceive', value: false });
                            ifRec.commitLine({ sublistId: SUBLIST_ITEM });
                            continue;
                        }

                        if (!keyMap.hasOwnProperty(ifKey)) {
                            // 不属于计划单的行，不入库
                            ifRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'itemreceive', value: false });
                            ifRec.commitLine({ sublistId: SUBLIST_ITEM });
                            continue;
                        }

                        var qty = toNumber(keyMap[ifKey].qty);
                        var amt = round2(toNumber(keyMap[ifKey].amount));

                        // 数量
                        ifRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'quantity', value: qty });

                        var invDetail = ifRec.getCurrentSublistSubrecord({
                            sublistId: SUBLIST_ITEM,
                            fieldId: 'inventorydetail'
                        });

                        invDetail.selectNewLine({
                            sublistId: 'inventoryassignment'
                        });

                        var flag = grade2 == 1 ? 'Y' : 'L';
                        var lotNum = 'LOT-' + wlName + '-' + tranid_num.tranid + '-' + getTodayYYYYMMDD() + '-' + flag;
                        invDetail.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'receiptinventorynumber',
                            value: lotNum
                        });

                        invDetail.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            value: qty
                        });

                        invDetail.commitLine({
                            sublistId: 'inventoryassignment'
                        });

                        var rowIds = (keyToRowIds[poId] && keyToRowIds[poId][ifKey]) ? keyToRowIds[poId][ifKey] : [];
                        for (var rr = 0; rr < rowIds.length; rr++) {
                            lotJson[String(rowIds[rr])] = lotNum;
                        }

                        // 到岸成本（不分摊，直接写该 ifKey 的合计金额）
                        if (amt > 0) {
                            var lcSub = ifRec.getCurrentSublistSubrecord({
                                sublistId: SUBLIST_ITEM,
                                fieldId: 'landedcost'
                            });

                            lcSub.selectNewLine({ sublistId: 'landedcostdata' });
                            lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: CKMTS }); // 使用现有费用类别。
                            lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: FIELD_AMOUNT, value: amt });
                            lcSub.commitLine({ sublistId: 'landedcostdata' });
                        }

                        var returnAmount = 0;
                        var item = ifRec.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: SUBLIST_ITEM });
                        var ifLine = ifRec.getCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'custcol_swc_line_no' });
                        var returnTax = 0;
                        var poTax = 0;
                        var ifRate = 0;

                        if (item in itemObj) {
                            returnTax = parseTaxRate(itemObj[item].rate);
                        }
                        if (ifLine in taxObj) {
                            poTax = parseTaxRate(taxObj[ifLine].tax);
                            ifRate = taxObj[ifLine].poRate;
                        }

                        if (poTax && returnTax) {
                            if ((Number(poTax) - Number(returnTax)) > 0) {
                                returnAmount = round2(Number(ifRate) * Number(qty) * (Number(poTax) - Number(returnTax)));
                            }
                        }

                        if (returnAmount > 0) {
                            var lcSub = ifRec.getCurrentSublistSubrecord({
                                sublistId: SUBLIST_ITEM,
                                fieldId: 'landedcost'
                            });

                            lcSub.selectNewLine({ sublistId: 'landedcostdata' });
                            lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: CKMTS_2 }); // 使用现有费用类别。
                            lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: FIELD_AMOUNT, value: returnAmount });
                            lcSub.commitLine({ sublistId: 'landedcostdata' });
                            ifRec.setCurrentSublistValue({
                                sublistId: SUBLIST_ITEM,
                                fieldId: 'custcol_swc_po_sk_',
                                value: returnAmount
                            });
                            if (returnTax) {
                                returnTax = returnTax * 100;
                                ifRec.setCurrentSublistValue({
                                    sublistId: SUBLIST_ITEM,
                                    fieldId: 'custcol_swc_line_return_tax',
                                    value: returnTax
                                });
                            }
                        }


                        ifRec.commitLine({ sublistId: SUBLIST_ITEM });
                    }

                    ifRec.save({ ignoreMandatoryFields: true });
                }

                for (var wld = 0; wld < wlLine; wld++) {
                    var rowId2 = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'id', line: wld });
                    rowId2 = rowId2 ? String(rowId2) : null;

                    if (rowId2 && lotJson.hasOwnProperty(rowId2)) {
                        rec.setSublistValue({
                            sublistId: wlSubId,
                            fieldId: 'custrecord_swc_wl_d_lot',
                            value: lotJson[rowId2],
                            line: wld
                        });
                    }
                }

                rec.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 15 });
                rec.save();

                result_str.data = '入库单生成成功！';
                return result_str;

            } catch (e) {
                log.error('入库单生成失败', {
                    name: e.name,
                    message: e.message,
                    stack: e.stack
                });
                result_str.data = getSafeActionErrorMessage(e, '入库单生成失败,请联系管理人员');
                return result_str;
            }
        }

        /**
         * 采购杂费分摊处理
         * @param id
         * @returns {{}}
         */
        function createIfRecord(id) {
            var result_str = {};

            try {
                var feeSubID = SUBLIST_WL_PO_FEE;
                var wlSubId = SUBLIST_WL_PLAN_DETAIL;

                var F_ALLOC_YG = 'custrecord_swc_wl_d_sj_fee_zf_ft_yg'; // 需要先写回的字段

                /**
                 * 将任意值安全转换为数字，无法转换时返回 0。
                 */
                function toNumber(n) { return Number(n) || 0; }
                /**
                 * 对金额或数量统一保留两位小数。
                 */
                function round2(n) { return Math.round((toNumber(n) + Number.EPSILON) * 100) / 100; }

                var rec = record.load({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: id
                });

                var poFeeMap = {};
                var feeLineCount = rec.getLineCount({ sublistId: feeSubID });

                for (var i = 0; i < feeLineCount; i++) {
                    var po_fee_id = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_po_fee_id', line: i });
                    if (!po_fee_id) continue;

                    var po_fee_yg = toNumber(rec.getSublistValue({ sublistId: feeSubID, fieldId: FIELD_WL_PO_FEE_YG, line: i }));

                    rec.setSublistValue({ sublistId: feeSubID, fieldId: FIELD_WL_PO_FEE_FPO_TYPE, line: i, value: 5 });


                    poFeeMap[String(po_fee_id)] = {
                        po_fee_sj: round2(po_fee_yg)
                    };
                }

                var wlLine = rec.getLineCount({ sublistId: wlSubId });

                var poLineList = {};
                var skuSet = new Set();

                for (var x = 0; x < wlLine; x++) {
                    var wl_po_fee_id = rec.getSublistValue({ sublistId: wlSubId, fieldId: FIELD_WL_D_PO_NUM, line: x });
                    if (!wl_po_fee_id) continue;

                    var poId = String(wl_po_fee_id);
                    if (!poFeeMap.hasOwnProperty(poId)) continue;

                    var sku = rec.getSublistValue({ sublistId: wlSubId, fieldId: FIELD_WL_D_SKU, line: x });
                    if (sku) skuSet.add(String(sku));

                    var lineId = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'id', line: x });
                    var wl_d_total_volume = toNumber(rec.getSublistValue({ sublistId: wlSubId, fieldId: FIELD_WL_D_TOTAL_VOLUME, line: x }));

                    if (!poLineList[poId]) poLineList[poId] = [];
                    poLineList[poId].push({
                        lineIndex: x,
                        lineId: String(lineId || ''),
                        vol: wl_d_total_volume
                    });
                }

                for (var poIdKey in poLineList) {
                    if (!poLineList.hasOwnProperty(poIdKey)) continue;

                    var list = poLineList[poIdKey];
                    if (!list || list.length === 0) continue;

                    var poFee = round2(toNumber(poFeeMap[poIdKey].po_fee_sj));
                    if (poFee === 0) continue;

                    var totalVol = 0;
                    for (var a = 0; a < list.length; a++) totalVol += toNumber(list[a].vol);

                    if (totalVol <= 0) {
                        log.error('分摊失败：总体积为0', 'po=' + poIdKey);
                        continue;
                    }

                    var lastIdx = -1;
                    for (var b = list.length - 1; b >= 0; b--) {
                        if (toNumber(list[b].vol) > 0) { lastIdx = b; break; }
                    }
                    if (lastIdx === -1) lastIdx = list.length - 1;

                    var applied = 0;
                    for (var c = 0; c < list.length; c++) {
                        var amt;
                        if (c === lastIdx) {
                            amt = round2(poFee - applied);
                        } else {
                            amt = round2((toNumber(list[c].vol) / totalVol) * poFee);
                            applied = round2(applied + amt);
                        }

                        rec.setSublistValue({
                            sublistId: wlSubId,
                            fieldId: F_ALLOC_YG,
                            line: list[c].lineIndex,
                            value: amt
                        });
                    }
                }

                var skuAry = Array.from(skuSet);
                var skuAmounts = {};
                var heXiaoSet = [];

                if (skuAry.length > 0) {
                    var customrecord_swc_wl_plan_detailSearchObj = search.create({
                        type: RECORD_TYPE_WL_PLAN_DETAIL,
                        filters: [
                            [FIELD_WL_D_SKU, "anyof", skuAry],
                            "AND",
                            ["custrecord_swc_wl_d_sj_fee_zf_ft_yg", "greaterthan", "0"],
                            "AND",
                            ["custrecord_swc_wl_d_sj_fee_zf_ft", "greaterthan", "0"],
                            "AND",
                            ["custrecord_swc_wl_d_zf_hx", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({
                                name: "formulanumeric",
                                formula: "TO_NUMBER({custrecord_swc_wl_d_sj_fee_zf_ft_yg}) - TO_NUMBER({custrecord_swc_wl_d_sj_fee_zf_ft})",
                                label: "公式（数值）"
                            }),
                            search.createColumn({ name: "internalid", label: "内部 ID" }),
                            search.createColumn({ name: FIELD_WL_D_SKU, label: "SKU" })
                        ]
                    });

                    var s = getAllResults(customrecord_swc_wl_plan_detailSearchObj);
                    for (var sk = 0; s && sk < s.length; sk++) {
                        var skuKey = s[sk].getValue({ name: FIELD_WL_D_SKU, label: "SKU" });
                        var rid = s[sk].getValue({ name: "internalid", label: "内部 ID" });
                        heXiaoSet.push(rid)

                        var amount = toNumber(s[sk].getValue({
                            name: "formulanumeric",
                            formula: "TO_NUMBER({custrecord_swc_wl_d_sj_fee_zf_ft_yg}) - TO_NUMBER({custrecord_swc_wl_d_sj_fee_zf_ft})",
                            label: "公式（数值）"
                        }));

                        if (skuKey) {
                            var k = String(skuKey);
                            skuAmounts[k] = round2(toNumber(skuAmounts[k]) + amount);
                        }
                    }
                }

                var writtenSku = new Set();
                var wlLine2 = rec.getLineCount({ sublistId: wlSubId });

                for (var wld = 0; wld < wlLine2; wld++) {
                    var d_sku = rec.getSublistValue({ sublistId: wlSubId, fieldId: FIELD_WL_D_SKU, line: wld });
                    if (!d_sku) continue;

                    var skuStr = String(d_sku);
                    if (writtenSku.has(skuStr)) continue;

                    rec.setSublistValue({
                        sublistId: wlSubId,
                        fieldId: 'custrecord_swc_d_ls_zf_cy',
                        value: toNumber(skuAmounts[skuStr]), // 没有就写 0
                        line: wld
                    });

                    writtenSku.add(skuStr);
                }

                rec.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 5 });
                rec.save();

                for (let hx = 0; hx < heXiaoSet.length; hx++) {
                    record.submitFields({
                        type: RECORD_TYPE_WL_PLAN_DETAIL,
                        id: heXiaoSet[hx],
                        values: {
                            custrecord_swc_wl_d_zf_hx: true
                        }
                    });
                }
                result_str.data = '预估杂费分摊成功！';
                return result_str;

            } catch (e) {
                log.error('预估杂费分摊失败', {
                    name: e.name,
                    message: e.message,
                    stack: e.stack
                });
                result_str.data = getSafeActionErrorMessage(e, '预估杂费分摊失败,请联系管理人员');
                return result_str;
            }
        }


        /**
         * 返回纯日期类型字符串
         * @returns {string}
         */
        function getTodayYYYYMMDD() {
            const parts = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).formatToParts(new Date());

            const y = parts.find(p => p.type === 'year').value;
            const m = parts.find(p => p.type === 'month').value;
            const d = parts.find(p => p.type === 'day').value;
            return `${y}${m}${d}`;
        }

        /**
         * 查询批次号内部ID
         * @param itemId
         * @param lotText
         * @returns {number|null}
         */
        function findInventoryNumberIdByText(lotText) {
            log.debug('findInventoryNumberIdByText', lotText);
            var inventorynumberSearchObj = search.create({
                type: "inventorynumber",
                filters:
                    [
                        ["inventorynumber", "is", lotText]
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "内部 ID" })
                    ]
            });
            var inventorynumber = getAllResults(inventorynumberSearchObj);
            if (inventorynumber && inventorynumber.length > 0) {
                for (let i = 0; i < inventorynumber.length; i++) {
                    var id = inventorynumber[i].getValue({ name: "internalid", label: "内部 ID" });
                    log.debug('findInventoryNumberIdByText-id', id);
                    return id
                }
            }
        }

        /**
         * 获取Bom对应版本的主SKU
         * @param bom
         * @param bomV
         * @returns {*[]}
         */
        function bomMainSku(bom, bomV) {
            var skuAry = [];
            var bomrevisionSearchObj = search.create({
                type: "bomrevision",
                filters:
                    [
                        ["billofmaterials", "anyof", bom],
                        "AND",
                        ["internalid", "anyof", bomV],
                        // "AND",
                        // ["component.custrecord_swc_is_main_sku","is","T"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: SUBLIST_ITEM,
                            join: "component",
                            label: "货品"
                        })
                    ]
            });
            var bomSearchObj = getAllResults(bomrevisionSearchObj);
            if (bomSearchObj && bomSearchObj.length > 0) {
                for (let i = 0; i < bomSearchObj.length; i++) {
                    skuAry.push(bomSearchObj[i].getValue({
                        name: SUBLIST_ITEM,
                        join: "component",
                        label: "货品"
                    }));
                }
            }
            return skuAry;
        }

        /**
         * 采购订单明细行拆行
         * 原始行：只关闭
         * 优品 / 良品行：新增或更新
         */
        function upDataPoSubListLine(id) {

            var COPY_FIELD_IDS = [
                SUBLIST_ITEM,
                'description',
                'units',
                'rate',
                // FIELD_AMOUNT,
                'taxcode',
                'department',
                'class',
                'location',
                'custcol_swc_main_sku',
                'custcol_swc_including_tax_amt',
                'custcol_swc_old_unit_price',
                'custcol_swc_old_unit_price_tax',
                'custcol_swc_old_tax_code',
                'custcol_swc_po_line_test',
                'custcol_swc_msku',
                'custcol_swc_line_no',
                'custcol_swc_beihuo_plan',
                'custcol_swc_loc_type',
                'custcol_swc_country_code',
                'custcol_swc_us_districts',
                'custcol_swc_store',
                'custcol_swc_sku_yjlm',
                'custcol_swc_pr_bill',
                'custcol_swc_bom_list',
                'custcol_swc_pr_origin_sku',
                'custcol_swc_pr_main_sku',
                'custcol_swc_po_support',//打托
                'custcol_swc_po_exw'//结算方式
            ];


            var result = {};
            var feeSubID = SUBLIST_WL_PLAN_DETAIL;
            var sublistId = SUBLIST_ITEM;

            /**
             * 构造用于匹配分组的组合键。
             */
            function buildKey(a, b, c, d, e, f) {
                return String(a) + '_' + String(b) + '_' + String(c) + '_' + String(d) + '_' + String(e) + '_' + String(f);
            }

            /**
             * 安全读取子列表字段值。
             */
            function get(poRec, fieldId, line) {
                return poRec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: fieldId,
                    line: line
                });
            }

            /**
             * 安全写入子列表字段值。
             */
            function set(poRec, fieldId, line, value) {
                poRec.setSublistValue({
                    sublistId: sublistId,
                    fieldId: fieldId,
                    line: line,
                    value: value
                });
            }

            try {

                /** 1 汇总物流计划中的优 / 良品数量 */
                var planRec = record.load({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: id
                });

                var poData = {};
                var cnt = planRec.getLineCount(feeSubID);

                for (var i = 0; i < cnt; i++) {

                    var poId = planRec.getSublistValue({
                        sublistId: feeSubID,
                        fieldId: FIELD_WL_D_PO_NUM,
                        line: i
                    });

                    var sku = planRec.getSublistValue({
                        sublistId: feeSubID,
                        fieldId: 'custrecord_swc_wl_d_item',
                        line: i
                    });

                    var key = buildKey(
                        sku,
                        planRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_sku', line: i }),
                        planRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_country', line: i }),
                        planRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_location_type', line: i }),
                        planRec.getSublistValue({ sublistId: feeSubID, fieldId: FIELD_WL_D_CUSTOMER, line: i }),
                        planRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_region', line: i })
                    );

                    var y = Number(planRec.getSublistValue({
                        sublistId: feeSubID,
                        fieldId: FIELD_WL_D_SUPERIOR_QTY_Z,
                        line: i
                    }) || 0);

                    var l = Number(planRec.getSublistValue({
                        sublistId: feeSubID,
                        fieldId: FIELD_WL_D_GOOD_QTY_Z,
                        line: i
                    }) || 0);

                    if (!poData[poId]) poData[poId] = {};
                    if (!poData[poId][key]) poData[poId][key] = { y: 0, l: 0 };

                    poData[poId][key].y += y;
                    poData[poId][key].l += l;
                }

                //TODO:逐 PO 处理,半途报错咋办
                /** 2 逐 PO 处理 */
                for (var poId in poData) {

                    var poRec = record.load({
                        type: record.Type.PURCHASE_ORDER,
                        id: poId,
                        isDynamic: false
                    });
                    log.debug('poId', poId);

                    var data = poData[poId];
                    log.debug('data', data)
                    var lineCount = poRec.getLineCount({ sublistId: sublistId });
                    log.debug('sublistId', sublistId);
                    log.debug('lineCount', lineCount);
                    /** 建立已有优 / 良品行索引 */
                    var splitIndex = {};

                    var itemIds = []

                    for (var i = 0; i < lineCount; i++) {
                        log.debug(SUBLIST_ITEM, get(poRec, SUBLIST_ITEM, i));
                        itemIds.push(get(poRec, SUBLIST_ITEM, i));
                        var grade = get(poRec, 'custcol_swc_grade', i);
                        if (grade != 1 && grade != 2) continue;

                        var key = buildKey(
                            get(poRec, SUBLIST_ITEM, i),
                            get(poRec, 'custcol_swc_pr_origin_sku', i),
                            get(poRec, 'custcol_swc_country_code', i),
                            get(poRec, 'custcol_swc_loc_type', i),
                            get(poRec, 'custcol_swc_store', i),
                            get(poRec, 'custcol_swc_us_districts', i)
                        );
                        splitIndex[key + '_' + grade] = i;
                    }

                    log.audit('splitIndex', splitIndex);

                    var sub_id = poRec.getValue('subsidiary');
                    var entity_id = poRec.getValue('entity');
                    var tran_date = poRec.getText('trandate');
                    var currencyid = poRec.getValue('currency');

                    var upAmounts = getSkuAmount(sub_id, entity_id, itemIds, tran_date, currencyid)
                    log.debug('upAmounts', Object.keys(upAmounts).length);


                    if (Object.keys(upAmounts).length == 0) {
                        result.data = '请维护SKU价目表';
                        return result
                    }

                    /** 倒序只处理原始行 */
                    for (var line = lineCount - 1; line >= 0; line--) {

                        log.debug(SUBLIST_ITEM, get(poRec, SUBLIST_ITEM, line));
                        var obj = {};
                        var support = get(poRec, 'custcol_swc_po_support', line);
                        var exw = get(poRec, 'custcol_swc_po_exw', line);
                        if (Object.keys(upAmounts).length > 0) obj = upAmounts[get(poRec, SUBLIST_ITEM, line) + '_' + support + '_' + exw];
                        log.debug('obj', obj);
                        if (!obj) {
                            var po_item_name = poRec.getSublistText({ sublistId: sublistId, fieldId: SUBLIST_ITEM, line: line });
                            result.data = '请维护SKU ' + po_item_name + ' 价目表金额';
                            return result
                        }

                        var grade = get(poRec, 'custcol_swc_grade', line);
                        if (grade == 1 || grade == 2) continue;

                        var key = buildKey(
                            get(poRec, SUBLIST_ITEM, line),
                            get(poRec, 'custcol_swc_pr_origin_sku', line),
                            get(poRec, 'custcol_swc_country_code', line),
                            get(poRec, 'custcol_swc_loc_type', line),
                            get(poRec, 'custcol_swc_store', line),
                            get(poRec, 'custcol_swc_us_districts', line)
                        );

                        var split = data[key];
                        if (!split) continue;

                        /** 原始行：只关闭 */
                        // set(poRec, 'isclosed', line, true);
                        var oldLineId = get(poRec, 'custcol_swc_poline_initial_key', line)
                        // 获取原始数量字段是否有值，有值的场合，不进行更新
                        var oldQuantity = get(poRec, 'custcol_swc_old_quantity', line) || 0

                        // 更新原行的数量
                        var oldQty = get(poRec, 'quantity', line);
                        if (Number(oldQuantity) == 0) {
                            set(poRec, 'custcol_swc_old_quantity', line, Number(oldQty));
                        }
                        set(poRec, 'quantity', line, Number(oldQty) - Number(split.y) - Number(split.l));

                        set(poRec, 'custcol_swc_line_close', line, true);

                        /** 优品行 */
                        if (split.y > 0) {
                            if (Number(obj.yw) > 0) {
                                log.audit('key', key + '_1');
                                var yLine = splitIndex[key + '_1'];
                                log.audit('yLine', yLine);
                                if (yLine !== undefined) {
                                    var oldy = poRec.getSublistValue({ sublistId: sublistId, fieldId: 'quantity', line: yLine });
                                    set(poRec, 'quantity', yLine, Number(oldy) + Number(split.y));

                                    if (Object.keys(obj).length > 0) {
                                        set(poRec, 'custcol_swc_including_tax_amt', yLine, obj.yh);
                                        set(poRec, 'rate', yLine, obj.yw);
                                        set(poRec, 'taxcode', yLine, obj.tax_code);
                                    }
                                } else {
                                    poRec.insertLine({ sublistId: sublistId, line: line + 1 });

                                    // 批量复制字段
                                    for (var f = 0; f < COPY_FIELD_IDS.length; f++) {
                                        var fid = COPY_FIELD_IDS[f];
                                        try {
                                            var v = poRec.getSublistValue({ sublistId: sublistId, fieldId: fid, line: line });
                                            if (v !== null && v !== undefined && v !== '') {
                                                poRec.setSublistValue({ sublistId: sublistId, fieldId: fid, line: line + 1, value: v });
                                            }
                                        } catch (e) {
                                            log.error('COPY行异常', fid + ' :: ' + e.message);
                                        }
                                    }

                                    set(poRec, SUBLIST_ITEM, line + 1, get(poRec, SUBLIST_ITEM, line));
                                    set(poRec, 'quantity', line + 1, split.y);
                                    set(poRec, 'custcol_swc_grade', line + 1, 1);

                                    set(poRec, 'custcol_swc_link_line_id', line + 1, oldLineId);

                                    set(poRec, 'custcol_swc_poline_initial_key', line + 1, oldLineId);

                                    if (Object.keys(obj).length > 0) {
                                        set(poRec, 'custcol_swc_including_tax_amt', line + 1, obj.yh);
                                        set(poRec, 'rate', line + 1, obj.yw);
                                        set(poRec, 'taxcode', line + 1, obj.tax_code);
                                    }
                                }
                            } else {
                                result.data = '请维护SKU价目表中的优品金额';
                                return result
                            }
                        }

                        /** 良品行 */
                        if (split.l > 0) {
                            if (Number(obj.lw) > 0) {
                                var lLine = splitIndex[key + '_2'];
                                if (lLine !== undefined) {
                                    var oldl = poRec.getSublistValue({ sublistId: sublistId, fieldId: 'quantity', line: lLine });
                                    set(poRec, 'quantity', lLine, Number(oldl) + Number(split.l));

                                    if (Object.keys(obj).length > 0) {
                                        set(poRec, 'custcol_swc_including_tax_amt', lLine, obj.lh);
                                        set(poRec, 'rate', lLine, obj.lw);
                                        set(poRec, 'taxcode', lLine, obj.tax_code);
                                    }
                                } else {
                                    poRec.insertLine({ sublistId: sublistId, line: line + 1 });

                                    // 批量复制字段
                                    for (var f = 0; f < COPY_FIELD_IDS.length; f++) {
                                        var fid = COPY_FIELD_IDS[f];
                                        try {
                                            var v = poRec.getSublistValue({ sublistId: sublistId, fieldId: fid, line: line });
                                            if (v !== null && v !== undefined && v !== '') {
                                                poRec.setSublistValue({ sublistId: sublistId, fieldId: fid, line: line + 1, value: v });
                                            }
                                        } catch (e) {
                                            log.error('COPY行异常', fid + ' :: ' + e.message);
                                        }
                                    }

                                    set(poRec, SUBLIST_ITEM, line + 1, get(poRec, SUBLIST_ITEM, line));
                                    set(poRec, 'quantity', line + 1, split.l);
                                    set(poRec, 'custcol_swc_grade', line + 1, 2);

                                    set(poRec, 'custcol_swc_link_line_id', line + 1, oldLineId);

                                    set(poRec, 'custcol_swc_poline_initial_key', line + 1, oldLineId);

                                    if (Object.keys(obj).length > 0) {
                                        set(poRec, 'custcol_swc_including_tax_amt', line + 1, obj.lh);
                                        set(poRec, 'rate', line + 1, obj.lw);
                                        set(poRec, 'taxcode', line + 1, obj.tax_code);
                                    }
                                }
                            } else {
                                result.data = '请维护SKU价目表中的良品金额';
                                return result
                            }
                        }
                    }

                    poRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
                }

                log.debug('setValue', '成功');
                planRec.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 4 });
                planRec.save();

                result.data = '处理成功';

            } catch (e) {
                log.error('处理异常', e);
                result.data = '处理失败';
            }

            return result;
        }

        /**
         * 生成头程费用采购订单。
         */
        function tcFeePoCreate(id) {
            var result_str = {};

            try {
                var rec = record.load({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: id,
                    isDynamic: false
                });

                // ------------------------
                // 工具函数
                // ------------------------
                /**
                 * 将任意值安全转换为数字，无法转换时返回 0。
                 */
                function toNumber(v) {
                    if (v === null || v === undefined || v === '') return 0;
                    var n = Number(v);
                    return isFinite(n) ? n : 0;
                }
                /**
                 * 对金额或数量统一保留两位小数。
                 */
                function round2(n) {
                    n = toNumber(n);
                    return Math.round((n + Number.EPSILON) * 100) / 100;
                }
                /**
                 * 对数组做去重处理。
                 */
                function uniq(arr) {
                    var m = {};
                    var out = [];
                    for (var i = 0; i < (arr || []).length; i++) {
                        var k = String(arr[i]);
                        if (!k) continue;
                        if (!m[k]) { m[k] = true; out.push(arr[i]); }
                    }
                    return out;
                }

                // 本次生成的PO集合（用于回写多选字段）
                var createdPoIds = [];

                // ------------------------
                // 1) 成交方式 -> totFieldId
                // ------------------------
                var terms_of_trade = rec.getValue(FIELD_WL_TERMS_OF_TRADE);

                var main_order_number = rec.getValue('custrecord_swc_cg_main_order_number');

                var totFieldId = '';
                if (terms_of_trade == 1) totFieldId = 'custrecord_swc_cost_exw';          // EXW
                else if (terms_of_trade == 2) totFieldId = 'custrecord_swc_cost_cn_fob';  // 国内FOB
                else if (terms_of_trade == 3) totFieldId = 'custrecord_swc_cost_ddp';     // DDP
                else if (terms_of_trade == 4) totFieldId = 'custrecord_swc_cost_ddu';     // DDU
                else if (terms_of_trade == 5) totFieldId = 'custrecord_swc_cost_hw_fob';  // 海外FOB

                if (!totFieldId) {
                    result_str.data = '未识别的成交方式（terms_of_trade），请确认。';
                    return result_str;
                }

                // 统一转数字，避免 list 值是字符串时比较失败
                var wl_od = Number(rec.getValue('custrecord_swc_wl_od'));

                // 成交方式支持范围
                // wl_od: 1=国内, 2=海外
                // terms_of_trade: 1~4 国内(EXW/国内FOB/DDP/DDU), 5 海外FOB
                var cnZt = { 1: true, 2: true, 3: true, 4: true };
                var hwZt = { 5: true };
                var cgZt = { 2: true, 5: true };

                if (wl_od === 1) {
                    if (!cnZt[terms_of_trade]) {
                        result_str.data = '当前单据主体为【国内】，当前成交方式不支持，请重新确认数据！';
                        return result_str;
                    }
                } else if (wl_od === 2) {
                    if (main_order_number) {
                        if (!cgZt[terms_of_trade]) {
                            result_str.data = '当前单据主体为【海外】，当前成交方式不支持，请重新确认数据！';
                            return result_str;
                        }
                    } else {
                        if (!hwZt[terms_of_trade]) {
                            result_str.data = '当前单据主体为【海外】，当前成交方式不支持，请重新确认数据！';
                            return result_str;
                        }
                    }
                } else {
                    result_str.data = '【海外/国内】字段值不合法，请确认数据';
                    return result_str;
                }

                var currentCarrierId = '';
                var currentCarrierName = '';
                var currentFeePoContext = null;
                var carrierNameMap = {};
                var feePoCustomerSubsidiaryCache = {};
                function setCurrentCarrier(carrierId) {
                    currentCarrierId = carrierId ? String(carrierId) : '';
                    currentCarrierName = currentCarrierId ? (carrierNameMap[currentCarrierId] || '') : '';
                }

                function normalizeLookupList(value) {
                    if (!value) return [];
                    if (!Array.isArray(value)) value = [value];
                    return value.map(function (item) {
                        if (!item) return '';
                        if (typeof item === 'object') {
                            return {
                                value: item.value || '',
                                text: item.text || ''
                            };
                        }
                        return String(item);
                    }).filter(function (item) {
                        return item && (typeof item !== 'object' || item.value || item.text);
                    });
                }

                function lookupName(type, recId, columnId) {
                    if (!recId) return '';
                    try {
                        var info = search.lookupFields({
                            type: type,
                            id: recId,
                            columns: [columnId]
                        });
                        var value = info && info[columnId];
                        if (Array.isArray(value) && value[0]) return value[0].text || value[0].value || '';
                        return value || '';
                    } catch (e) {
                        return '';
                    }
                }

                function getCustomerSubsidiaryForFeePo(customerId) {
                    var key = String(customerId || '');
                    if (!key) return String(CONFIG.SUBSIDIARY_ID_US_DEFAULT);
                    if (feePoCustomerSubsidiaryCache.hasOwnProperty(key)) {
                        return feePoCustomerSubsidiaryCache[key];
                    }
                    var customerS = {};
                    try {
                        customerS = search.lookupFields({
                            type: 'customer',
                            id: customerId,
                            columns: ['subsidiary']
                        }) || {};
                    } catch (e) {
                        customerS = {};
                    }
                    var sub = String(CONFIG.SUBSIDIARY_ID_US_DEFAULT);
                    if (customerS && customerS['subsidiary'] && customerS['subsidiary'][0]) {
                        sub = String(customerS['subsidiary'][0].value || String(CONFIG.SUBSIDIARY_ID_US_DEFAULT));
                    }
                    feePoCustomerSubsidiaryCache[key] = sub;
                    return sub;
                }

                function getAllPlanDetailPoIds() {
                    var poIds = [];
                    var lineCount = rec.getLineCount({ sublistId: SUBLIST_WL_PLAN_DETAIL }) || 0;
                    for (var i = 0; i < lineCount; i++) {
                        var poId = rec.getSublistValue({ sublistId: SUBLIST_WL_PLAN_DETAIL, fieldId: FIELD_WL_D_PO_NUM, line: i });
                        if (poId) poIds.push(String(poId));
                    }
                    return uniq(poIds);
                }

                function getPlanDetailPoIdsBySubsidiary(targetSubId) {
                    var poIds = [];
                    var subId = String(targetSubId || '');
                    var lineCount = rec.getLineCount({ sublistId: SUBLIST_WL_PLAN_DETAIL }) || 0;
                    for (var i = 0; i < lineCount; i++) {
                        var poId = rec.getSublistValue({ sublistId: SUBLIST_WL_PLAN_DETAIL, fieldId: FIELD_WL_D_PO_NUM, line: i });
                        var customerId = rec.getSublistValue({ sublistId: SUBLIST_WL_PLAN_DETAIL, fieldId: FIELD_WL_D_CUSTOMER, line: i });
                        if (!poId || !customerId) continue;
                        if (String(getCustomerSubsidiaryForFeePo(customerId)) === subId) {
                            poIds.push(String(poId));
                        }
                    }
                    return uniq(poIds);
                }

                function logFeePoSubsidiaryContext(vendorId, subsidiaryId, feeMap, wlPlanId, orderType2, currencyId, originalSubsidiaryId, sourcePoIds) {
                    var vendorInfo = {};
                    try {
                        vendorInfo = search.lookupFields({
                            type: 'vendor',
                            id: vendorId,
                            columns: ['entityid', 'companyname', 'subsidiary', 'representingsubsidiary']
                        }) || {};
                    } catch (e) {
                        vendorInfo.lookupError = e && (e.message || e.name) || String(e);
                    }

                    currentFeePoContext = {
                        wlPlanId: wlPlanId,
                        vendorId: String(vendorId || ''),
                        vendorName: carrierNameMap[String(vendorId || '')] || vendorInfo.companyname || vendorInfo.entityid || String(vendorId || ''),
                        originalTargetSubsidiaryId: String(originalSubsidiaryId || subsidiaryId || ''),
                        originalTargetSubsidiaryName: lookupName('subsidiary', originalSubsidiaryId || subsidiaryId, 'name'),
                        targetSubsidiaryId: String(subsidiaryId || ''),
                        targetSubsidiaryName: lookupName('subsidiary', subsidiaryId, 'name'),
                        orderType2: String(orderType2 || ''),
                        currencyId: String(currencyId || ''),
                        currencyName: lookupName('currency', currencyId, 'name'),
                        sourcePoIds: uniq((sourcePoIds || []).map(function (x) { return String(x || ''); }).filter(Boolean)),
                        feeTypeAmountMap: feeMap || {}
                    };

                    log.error('TC_FEE_PO_SUBSIDIARY_CHECK', {
                        wlPlanId: wlPlanId,
                        vendorId: vendorId,
                        vendorNameFromLine: carrierNameMap[String(vendorId || '')] || '',
                        vendorEntityId: vendorInfo.entityid || '',
                        vendorCompanyName: vendorInfo.companyname || '',
                        vendorSubsidiaryField: normalizeLookupList(vendorInfo.subsidiary),
                        vendorRepresentingSubsidiary: normalizeLookupList(vendorInfo.representingsubsidiary),
                        originalTargetSubsidiaryId: originalSubsidiaryId || subsidiaryId,
                        originalTargetSubsidiaryName: lookupName('subsidiary', originalSubsidiaryId || subsidiaryId, 'name'),
                        targetSubsidiaryId: subsidiaryId,
                        targetSubsidiaryName: lookupName('subsidiary', subsidiaryId, 'name'),
                        orderType2: orderType2,
                        currencyId: currencyId || '',
                        currencyName: lookupName('currency', currencyId, 'name'),
                        sourcePoIds: uniq((sourcePoIds || []).map(function (x) { return String(x || ''); }).filter(Boolean)),
                        feeTypeAmountMap: feeMap || {}
                    });
                }

                function logPurchaseOrderSubsidiaryFieldOptions(poRec, subsidiaryId) {
                    var currentUser = runtime.getCurrentUser();
                    var subsidiaryInfo = {};
                    var fieldOptions = [];
                    try {
                        subsidiaryInfo = search.lookupFields({
                            type: 'subsidiary',
                            id: subsidiaryId,
                            columns: ['name', 'isinactive']
                        }) || {};
                    } catch (e) {
                        subsidiaryInfo.lookupError = e && (e.message || e.name) || String(e);
                    }

                    try {
                        var subsidiaryField = poRec.getField({ fieldId: 'subsidiary' });
                        if (subsidiaryField && subsidiaryField.getSelectOptions) {
                            fieldOptions = subsidiaryField.getSelectOptions({ filter: '', operator: 'contains' }) || [];
                            fieldOptions = fieldOptions.slice(0, 200).map(function (option) {
                                return {
                                    value: option.value || '',
                                    text: option.text || ''
                                };
                            });
                        }
                    } catch (e2) {
                        fieldOptions = [{
                            value: 'FIELD_OPTIONS_ERROR',
                            text: e2 && (e2.message || e2.name) || String(e2)
                        }];
                    }

                    log.error('TC_FEE_PO_SUBSIDIARY_FIELD_OPTIONS', {
                        targetSubsidiaryId: subsidiaryId,
                        targetSubsidiaryLookup: subsidiaryInfo,
                        currentUserId: currentUser && currentUser.id,
                        currentUserName: currentUser && currentUser.name,
                        currentRoleId: currentUser && currentUser.role,
                        currentRoleName: currentUser && currentUser.roleCenter,
                        availableSubsidiaryOptionsSample: fieldOptions
                    });
                }

                function getFeePoSubsidiaryId(subsidiaryId) {
                    return String(subsidiaryId || '') === String(CONFIG.SUBSIDIARY_ID_US_OLD) ? CONFIG.SUBSIDIARY_ID_US_DEFAULT : subsidiaryId;
                }

                // 成本类别 -> 费用Item
                var feeItemByName = JSON.parse(JSON.stringify(CONFIG.feeItemByNameWlEstimate));
                feeItemByName['101'] = CONFIG.ITEM_ID_WL_STORAGE_FEE_PO;

                var fobAllowedFeeTypes = { '1': true, '2': true, '3': true };
                var overseasFobSkippedFeeTypes = { '1': true, '2': true, '3': true };
                var insuranceAndDutyFeeTypes = { '4': true, '7': true };
                var mdLocation = rec.getValue({ fieldId: FIELD_MD_LOCATION });
                var transferWay = rec.getValue({ fieldId: 'custrecord_swc_wl_trasfer_way' });
                var cgSubWarehouse = rec.getValue({ fieldId: 'custrecord_swc_cg_sub_warehouse' });
                var skipInsuranceAndDutyFee = String(mdLocation || '') === '41'
                    && ['1', '2', '3', '6'].indexOf(String(transferWay || '')) !== -1;
                var onlyDomesticFobPortFees = String(mdLocation || '') === '41'
                    && String(transferWay || '') !== '4'
                    && String(transferWay || '') !== '5';
                var shouldRestrictDestinationPortTruckingFee = String(mdLocation || '') === '41';
                var canProcessDestinationPortTruckingFee = !shouldRestrictDestinationPortTruckingFee
                    || (
                        (String(transferWay || '') === '4' || String(transferWay || '') === '5')
                        && !!cgSubWarehouse
                    );

                // ------------------------
                // 2) 规则表：中类 -> 承担方(2海外/3国内)
                // ------------------------
                var cdMap = {}; // feeTypeZ -> '2'/'3'
                var ruleSearch = search.create({
                    type: RECORD_TYPE_RULE_MAPPING_TABLE,
                    filters: [],
                    columns: [
                        search.createColumn({ name: "internalid" }),
                        search.createColumn({ name: "formulatext", formula: "{" + totFieldId + ".id}" })
                    ]
                });

                var ruleRs = getAllResults(ruleSearch) || [];
                for (var r = 0; r < ruleRs.length; r++) {
                    var cm = ruleRs[r].getValue({ name: "internalid" });
                    var gy = ruleRs[r].getValue({ name: "formulatext", formula: "{" + totFieldId + ".id}" });
                    if (cm) cdMap[String(cm)] = String(gy || '');
                }

                // ------------------------
                // 3) 汇总 first leg cost：按承运商 + 预估币种 + 中类 汇总金额
                //    同时记录每一行最终应回写的 PO 分组键，避免不同币种 PO 误回写到同一行。
                // ------------------------
                var legSubId = SUBLIST_WL_FIRST_LEG_COST;
                var legLineCount = rec.getLineCount({ sublistId: legSubId });

                var cnPoJson = {}; // { carrierId: { currencyId: { feeTypeZ: sumAmt } } }
                var hwPoJson = {}; // { carrierId: { currencyId: { feeTypeZ: sumAmt } } }

                // lineIndex -> { bucketKey, orderType2 }
                var linePoBucketMeta = {};
                // bucketKey -> [poId,...]
                var poIdsByBucket = {};

                function buildLinePoBucketKey(carrierId, bearer, currencyId, orderType2) {
                    return [
                        String(carrierId || ''),
                        String(bearer || ''),
                        String(currencyId || ''),
                        String(orderType2 || '')
                    ].join('|');
                }

                function addFeeToCarrierCurrencyMap(targetMap, carrierId, currencyId, feeTypeZ, amount) {
                    if (!targetMap[carrierId]) targetMap[carrierId] = {};
                    if (!targetMap[carrierId][currencyId]) targetMap[carrierId][currencyId] = {};
                    targetMap[carrierId][currencyId][feeTypeZ] = round2(toNumber(targetMap[carrierId][currencyId][feeTypeZ]) + amount);
                }

                function appendPoIdsToBucket(bucketKey, poIds) {
                    if (!bucketKey || !poIds || poIds.length === 0) return;
                    if (!poIdsByBucket[bucketKey]) poIdsByBucket[bucketKey] = [];
                    poIdsByBucket[bucketKey] = uniq(poIdsByBucket[bucketKey].concat(poIds.map(function (x) { return String(x || ''); }).filter(Boolean)));
                }

                for (var i = 0; i < legLineCount; i++) {
                    var carrierId = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_LOCATION, line: i });
                    var carrierName = rec.getSublistText({ sublistId: legSubId, fieldId: FIELD_WL_FLC_LOCATION, line: i }) || '';
                    var feeTypeZ = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_FLC_FEE_TYPE_Z, line: i });
	                    var ygFee = toNumber(rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_YG_FEE, line: i }));
	                    var ygCurrency = String(rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_YG_CURRENCY, line: i }) || '');
	
	                    if (!carrierId || !feeTypeZ || ygFee === 0) continue;
	                    feeTypeZ = String(feeTypeZ);
	                    var isInsuranceOrDutyFee = insuranceAndDutyFeeTypes[feeTypeZ] === true;
	                    if (isInsuranceOrDutyFee && skipInsuranceAndDutyFee) continue;
	                    if (onlyDomesticFobPortFees && !fobAllowedFeeTypes[feeTypeZ] && !isInsuranceOrDutyFee) continue;
	                    if (String(terms_of_trade) === '5' && overseasFobSkippedFeeTypes[feeTypeZ]) continue;
	                    if (feeTypeZ === '9' && !canProcessDestinationPortTruckingFee) continue;
	
	                    var bearer = cdMap[String(feeTypeZ)]; // '2'海外 or '3'国内
	                    if (bearer !== '2' && bearer !== '3') continue;
	                    if (String(terms_of_trade) === '2' && bearer === '3' && !fobAllowedFeeTypes[String(feeTypeZ)] && !isInsuranceOrDutyFee) continue;
	
	                    carrierId = String(carrierId);
	                    if (carrierName) carrierNameMap[carrierId] = carrierName;
                    var orderType2 = (feeTypeZ === '101') ? 6 : 3;
                    linePoBucketMeta[i] = {
                        bucketKey: buildLinePoBucketKey(carrierId, bearer, ygCurrency, orderType2),
                        orderType2: orderType2
                    };

                    if (bearer === '2') {
                        addFeeToCarrierCurrencyMap(hwPoJson, carrierId, ygCurrency, feeTypeZ, ygFee);
                    } else {
                        addFeeToCarrierCurrencyMap(cnPoJson, carrierId, ygCurrency, feeTypeZ, ygFee);
                    }
                }

                // ------------------------
                // 4) 创建PO通用函数
                // ------------------------
                /**
                 * 按供应商和子公司创建费用采购订单。
                 */
                function splitFeeMapByOrderType(feeMap) {
                    var storageFeeMap = {};
                    var normalFeeMap = {};
                    var feeKeys = Object.keys(feeMap || {});

                    for (var k = 0; k < feeKeys.length; k++) {
                        var feeType = String(feeKeys[k] || '');
                        var amt = round2(toNumber(feeMap[feeType]));
                        if (amt === 0) continue;

                        if (feeType === '101') {
                            storageFeeMap[feeType] = amt;
                        } else {
                            normalFeeMap[feeType] = amt;
                        }
                    }

                    var result = [];
                    if (Object.keys(storageFeeMap).length > 0) {
                        result.push({
                            orderType2: 6,
                            feeMap: storageFeeMap
                        });
                    }
                    if (Object.keys(normalFeeMap).length > 0) {
                        result.push({
                            orderType2: 3,
                            feeMap: normalFeeMap
                        });
                    }
                    return result;
                }

                function createSingleFeePO(vendorId, subsidiaryId, feeMap, wlPlanId, orderType2, currencyId, sourcePoIds) {
                    var originalSubsidiaryId = subsidiaryId;
                    subsidiaryId = getFeePoSubsidiaryId(subsidiaryId);
                    setCurrentCarrier(vendorId);
                    logFeePoSubsidiaryContext(vendorId, subsidiaryId, feeMap, wlPlanId, orderType2, currencyId, originalSubsidiaryId, sourcePoIds);
                    var poRec = record.create({ type: record.Type.PURCHASE_ORDER, isDynamic: true });

                    log.debug('vendorId', vendorId);
                    log.debug('subsidiaryId', subsidiaryId);
                    log.debug('originalSubsidiaryId', originalSubsidiaryId);

                    logPurchaseOrderSubsidiaryFieldOptions(poRec, subsidiaryId);
                    poRec.setValue({ fieldId: 'customform', value: CONFIG.FORM_PO_FEE });              // 采购订单_费用类
                    poRec.setValue({ fieldId: 'entity', value: vendorId });             // 供应商=承运商
                    poRec.setValue({ fieldId: 'subsidiary', value: subsidiaryId });     // 子公司
                    if (currencyId) {
                        try {
                            poRec.setValue({ fieldId: 'currency', value: currencyId });  // 币种=预估币种
                        } catch (currencyError) {
                            var currencyName = lookupName('currency', currencyId, 'name') || currencyId;
                            var vendorName = carrierNameMap[String(vendorId || '')] || lookupName('vendor', vendorId, 'entityid') || vendorId;
                            var subsidiaryName = lookupName('subsidiary', subsidiaryId, 'name') || subsidiaryId;
                            log.error('TC_FEE_PO_INVALID_CURRENCY', {
                                wlPlanId: wlPlanId,
                                vendorId: vendorId,
                                vendorName: vendorName,
                                subsidiaryId: subsidiaryId,
                                subsidiaryName: subsidiaryName,
                                originalSubsidiaryId: originalSubsidiaryId,
                                currencyId: currencyId,
                                currencyName: currencyName,
                                orderType2: orderType2,
                                feeTypeAmountMap: feeMap || {},
                                errorName: currencyError && currencyError.name,
                                errorMessage: currencyError && currencyError.message
                            });
                            throw new Error('USER_MESSAGE:头程费用类型采购订单做成失败：承运商【'
                                + vendorName
                                + '】在子公司【'
                                + subsidiaryName
                                + '】下不能使用币种【'
                                + currencyName
                                + '】。请确认头程费用信息录入中的预估币种，或检查该承运商供应商档案是否已启用该币种。');
                        }
                    }
                    // poRec.setValue({ fieldId: 'custbody_swc_cqdd_zq', value: CONFIG.DEFAULT_PAYMENT_CYCLE });       // 账期TODO
                    poRec.setValue({ fieldId: 'custbody_swc_wl_no', value: wlPlanId });  // 关联物流发运单
                    poRec.setValue({ fieldId: 'custbody_swc_po_fee', value: 3 });           // 费用标识
                    poRec.setValue({ fieldId: 'custbody_swc_order_type2', value: orderType2 });
                    poRec.setValue({ fieldId: FIELD_BODY_FEE_AR_TYPE, value: 1 });      // 等待审批

                    var feeKeys = Object.keys(feeMap || {});
                    for (var k = 0; k < feeKeys.length; k++) {
                        var feeType = feeKeys[k];
                        var amt = round2(toNumber(feeMap[feeType]));
                        if (amt === 0) continue;

                        var itemId = feeItemByName[String(feeType)];
                        if (!itemId) continue;

                        poRec.selectNewLine({ sublistId: SUBLIST_ITEM });
                        poRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: SUBLIST_ITEM, value: itemId });
                        poRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'quantity', value: 1 });
                        poRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'rate', value: amt });
                        poRec.commitLine({ sublistId: SUBLIST_ITEM });
                    }

                    return poRec.save({ ignoreMandatoryFields: true });
                }

                function createFeePO(vendorId, subsidiaryId, feeMap, wlPlanId, currencyId, sourcePoIds) {
                    var result = {
                        allPoIds: [],
                        byOrderType: {}
                    };
                    var splitFeeMaps = splitFeeMapByOrderType(feeMap);

                    for (var i = 0; i < splitFeeMaps.length; i++) {
                        var poId = String(createSingleFeePO(
                            vendorId,
                            subsidiaryId,
                            splitFeeMaps[i].feeMap,
                            wlPlanId,
                            splitFeeMaps[i].orderType2,
                            currencyId,
                            sourcePoIds
                        ));
                        if (!poId) continue;
                        result.allPoIds.push(poId);
                        var orderTypeKey = String(splitFeeMaps[i].orderType2 || '');
                        if (!result.byOrderType[orderTypeKey]) result.byOrderType[orderTypeKey] = [];
                        result.byOrderType[orderTypeKey].push(poId);
                    }

                    result.allPoIds = uniq(result.allPoIds);
                    return result;
                }

                // ------------------------
                // 5) 国内承担：每个承运商1张PO（子公司来自头字段）
                // ------------------------
                log.debug('cnPoJson', cnPoJson)
                if (Object.keys(cnPoJson).length > 0) {
                    var cnSub = rec.getValue(FIELD_WL_PO_ZT);
                    var cnSourcePoIds = getAllPlanDetailPoIds();
                    var cnCarriers = Object.keys(cnPoJson);

                    for (var c = 0; c < cnCarriers.length; c++) {
                        var carrierCn = cnCarriers[c];
                        var cnCurrencyKeys = Object.keys(cnPoJson[carrierCn] || {});
                        for (var cc = 0; cc < cnCurrencyKeys.length; cc++) {
                            var cnCurrency = cnCurrencyKeys[cc];
                            var cnCreateResult = createFeePO(carrierCn, cnSub, cnPoJson[carrierCn][cnCurrency], id, cnCurrency, cnSourcePoIds);
                            createdPoIds = createdPoIds.concat(cnCreateResult.allPoIds);
                            var cnOrderTypeKeys = Object.keys(cnCreateResult.byOrderType || {});
                            for (var cot = 0; cot < cnOrderTypeKeys.length; cot++) {
                                appendPoIdsToBucket(
                                    buildLinePoBucketKey(carrierCn, '3', cnCurrency, cnOrderTypeKeys[cot]),
                                    cnCreateResult.byOrderType[cnOrderTypeKeys[cot]]
                                );
                            }
                        }
                    }
                }

                // ------------------------
                // 6) 海外承担
                //   - 美国(230)：每个承运商1张PO（子公司固定77）
                //   - 非美国：按店铺(customer)所属子公司聚合体积
                //       * 子公司只有1个 -> 1张PO（不分摊）
                //       * 子公司多个   -> 多张PO按体积占比分摊，最后一张吃尾差（按每个费用项独立尾差）
                // ------------------------
                log.debug('hwPoJson', hwPoJson)
                if (Object.keys(hwPoJson).length > 0) {
                    var county_lsit = rec.getValue('custrecord_swc_wl_county_lsit'); // 运抵国
                    var wlDId = SUBLIST_WL_PLAN_DETAIL;
                    var wlDCount = rec.getLineCount({ sublistId: wlDId }) || 0;

                    // customer->subsidiary lookup缓存
                    var custSubCache = {};
                    /**
                     * 获取客户对应的子公司信息。
                     */
                    function getCustomerSubsidiary(customerId) {
                        var key = String(customerId || '');
                        if (!key) return CONFIG.SUBSIDIARY_ID_US_DEFAULT;
                        if (custSubCache.hasOwnProperty(key)) return custSubCache[key];

                        var customerS = search.lookupFields({
                            type: 'customer',
                            id: customerId,
                            columns: ['subsidiary']
                        });

                        var sub = CONFIG.SUBSIDIARY_ID_US_DEFAULT;
                        if (customerS && customerS['subsidiary'] && customerS['subsidiary'][0]) {
                            sub = customerS['subsidiary'][0].value;
                        }
                        custSubCache[key] = sub;
                        return sub;
                    }

                    var hwCarriers = Object.keys(hwPoJson);

                    // 美国：固定子公司77，承运商一张
                    if (String(county_lsit) === String(CONFIG.COUNTRY_ID_US)) {
                        var hwUsSourcePoIds = getAllPlanDetailPoIds();
                        for (var h = 0; h < hwCarriers.length; h++) {
                            var carrierHw = hwCarriers[h];
                            var hwUsCurrencyKeys = Object.keys(hwPoJson[carrierHw] || {});
                            for (var hc = 0; hc < hwUsCurrencyKeys.length; hc++) {
                                var hwUsCurrency = hwUsCurrencyKeys[hc];
                                var hwUsCreateResult = createFeePO(carrierHw, CONFIG.SUBSIDIARY_ID_US_DEFAULT, hwPoJson[carrierHw][hwUsCurrency], id, hwUsCurrency, hwUsSourcePoIds);
                                createdPoIds = createdPoIds.concat(hwUsCreateResult.allPoIds);
                                var hwUsOrderTypeKeys = Object.keys(hwUsCreateResult.byOrderType || {});
                                for (var huot = 0; huot < hwUsOrderTypeKeys.length; huot++) {
                                    appendPoIdsToBucket(
                                        buildLinePoBucketKey(carrierHw, '2', hwUsCurrency, hwUsOrderTypeKeys[huot]),
                                        hwUsCreateResult.byOrderType[hwUsOrderTypeKeys[huot]]
                                    );
                                }
                            }
                        }
                    } else {
                        // 非美国：按子公司体积聚合
                        for (var h2 = 0; h2 < hwCarriers.length; h2++) {
                            var carrierHw2 = hwCarriers[h2];
                            var hwCurrencyKeys = Object.keys(hwPoJson[carrierHw2] || {});

                            for (var hck = 0; hck < hwCurrencyKeys.length; hck++) {
                                var hwCurrency = hwCurrencyKeys[hck];
                                var feeMapHw = hwPoJson[carrierHw2][hwCurrency];

                                // subVolMap: { subId: volumeSum }
                                var subVolMap = {};
                                var totalVol = 0;

                                for (var d = 0; d < wlDCount; d++) {
                                    var shopId = rec.getSublistValue({ sublistId: wlDId, fieldId: FIELD_WL_D_CUSTOMER, line: d });
                                    var vol = toNumber(rec.getSublistValue({ sublistId: wlDId, fieldId: FIELD_WL_D_TOTAL_VOLUME, line: d }));

                                    if (!shopId || vol <= 0) continue;

                                    var subId = getCustomerSubsidiary(shopId);
                                    totalVol += vol;
                                    subVolMap[String(subId)] = toNumber(subVolMap[String(subId)]) + vol;
                                }

                                var subKeys = Object.keys(subVolMap);

                                // 没体积：退化1张
                                if (subKeys.length === 0 || totalVol <= 0) {
                                    var hwFallbackResult = createFeePO(carrierHw2, CONFIG.SUBSIDIARY_ID_US_DEFAULT, feeMapHw, id, hwCurrency, getAllPlanDetailPoIds());
                                    createdPoIds = createdPoIds.concat(hwFallbackResult.allPoIds);
                                    var hwFallbackOrderTypeKeys = Object.keys(hwFallbackResult.byOrderType || {});
                                    for (var hfot = 0; hfot < hwFallbackOrderTypeKeys.length; hfot++) {
                                        appendPoIdsToBucket(
                                            buildLinePoBucketKey(carrierHw2, '2', hwCurrency, hwFallbackOrderTypeKeys[hfot]),
                                            hwFallbackResult.byOrderType[hwFallbackOrderTypeKeys[hfot]]
                                        );
                                    }
                                    continue;
                                }

                                // 只有一个子公司：不分摊，1张PO
                                if (subKeys.length === 1) {
                                    var onlySub = Number(subKeys[0]) || CONFIG.SUBSIDIARY_ID_US_DEFAULT;
                                    var hwSingleResult = createFeePO(carrierHw2, onlySub, feeMapHw, id, hwCurrency, getPlanDetailPoIdsBySubsidiary(onlySub));
                                    createdPoIds = createdPoIds.concat(hwSingleResult.allPoIds);
                                    var hwSingleOrderTypeKeys = Object.keys(hwSingleResult.byOrderType || {});
                                    for (var hsot = 0; hsot < hwSingleOrderTypeKeys.length; hsot++) {
                                        appendPoIdsToBucket(
                                            buildLinePoBucketKey(carrierHw2, '2', hwCurrency, hwSingleOrderTypeKeys[hsot]),
                                            hwSingleResult.byOrderType[hwSingleOrderTypeKeys[hsot]]
                                        );
                                    }
                                    continue;
                                }

                                // 多子公司：建议排序，确保尾差归属稳定
                                subKeys.sort(function (a, b) { return Number(a) - Number(b); });

                                // allocatedSumByFee: { feeTypeZ: allocatedSum }
                                var allocatedSumByFee = {};

                                for (var sIdx = 0; sIdx < subKeys.length; sIdx++) {
                                    var subIdKey = subKeys[sIdx];
                                    var isLast = (sIdx === subKeys.length - 1);
                                    var ratio = toNumber(subVolMap[subIdKey]) / totalVol;
                                    var allocatedFeeMap = {};

                                    var feeKeysHw = Object.keys(feeMapHw || {});
                                    for (var fk = 0; fk < feeKeysHw.length; fk++) {
                                        var feeTypeZ = feeKeysHw[fk];
                                        var totalAmt = round2(toNumber(feeMapHw[feeTypeZ]));
                                        if (totalAmt === 0) continue;

                                        var lineAmt;
                                        if (isLast) {
                                            lineAmt = round2(totalAmt - toNumber(allocatedSumByFee[feeTypeZ]));
                                            if (lineAmt < 0) lineAmt = 0;
                                        } else {
                                            lineAmt = round2(totalAmt * ratio);
                                            allocatedSumByFee[feeTypeZ] = round2(toNumber(allocatedSumByFee[feeTypeZ]) + lineAmt);
                                        }

                                        if (toNumber(lineAmt) === 0) continue;
                                        allocatedFeeMap[feeTypeZ] = lineAmt;
                                    }

                                    var hwSplitResult = createFeePO(
                                        carrierHw2,
                                        Number(subIdKey) || CONFIG.SUBSIDIARY_ID_US_DEFAULT,
                                        allocatedFeeMap,
                                        id,
                                        hwCurrency,
                                        getPlanDetailPoIdsBySubsidiary(subIdKey)
                                    );
                                    createdPoIds = createdPoIds.concat(hwSplitResult.allPoIds);
                                    var hwSplitOrderTypeKeys = Object.keys(hwSplitResult.byOrderType || {});
                                    for (var hspt = 0; hspt < hwSplitOrderTypeKeys.length; hspt++) {
                                        appendPoIdsToBucket(
                                            buildLinePoBucketKey(carrierHw2, '2', hwCurrency, hwSplitOrderTypeKeys[hspt]),
                                            hwSplitResult.byOrderType[hwSplitOrderTypeKeys[hspt]]
                                        );
                                    }
                                }
                            }
                        }
                    }
                }

                createdPoIds = uniq(createdPoIds);

                // ------------------------
                // 7) 回写PO到 first leg cost 子表多选字段 custrecord_swc_wl_flc_po
                //    按“承运商 + 承担方 + 预估币种 + orderType2”精确回写，避免不同币种 PO 误挂到同一行
                // ------------------------
                if (createdPoIds.length > 0 && Object.keys(linePoBucketMeta).length > 0) {
                    var lineIndexes = Object.keys(linePoBucketMeta);
                    for (var lpm = 0; lpm < lineIndexes.length; lpm++) {
                        var lineIndex = Number(lineIndexes[lpm]);
                        if (!isFinite(lineIndex)) continue;
                        var bucketKey = linePoBucketMeta[lineIndex] && linePoBucketMeta[lineIndex].bucketKey;
                        var targetPoIds = uniq(poIdsByBucket[bucketKey] || []);
                        if (targetPoIds.length === 0) continue;

                        var oldVal = rec.getSublistValue({
                            sublistId: legSubId,
                            fieldId: FIELD_WL_FLC_PO,
                            line: lineIndex
                        });

                        var oldArr = [];
                        if (Array.isArray(oldVal)) {
                            oldArr = oldVal.map(function (x) { return String(x); });
                        } else if (oldVal) {
                            var sOld = String(oldVal);
                            oldArr = (sOld.indexOf('\u0005') >= 0) ? sOld.split('\u0005') : [sOld];
                            oldArr = oldArr.map(function (x) { return String(x); });
                        }

                        var merged = uniq(oldArr.concat(targetPoIds));

                        rec.setSublistValue({
                            sublistId: legSubId,
                            fieldId: FIELD_WL_FLC_PO,
                            line: lineIndex,
                            value: merged
                        });
                    }
                }

                // ------------------------
                // 8) 保存状态
                // ------------------------
                rec.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 8 });
                rec.save({ ignoreMandatoryFields: true });

                result_str.data = '生成头程费用类采购订单成功（共生成 ' + createdPoIds.length + ' 张PO）';
                return result_str;

            } catch (e) {
                log.error('生成头程费用类采购订单失败', e);

                if (e.message.includes('subsidiary')) {
                    var ctx1 = currentFeePoContext || {};
                    var carrierMsg = ctx1.vendorName || currentCarrierName || '名称未取到';
                    var subMsg = (ctx1.targetSubsidiaryName || ctx1.targetSubsidiaryId)
                        ? '，目标子公司：' + (ctx1.targetSubsidiaryName || ctx1.targetSubsidiaryId)
                        : '';
                    var orgSubMsg = (ctx1.originalTargetSubsidiaryName || ctx1.originalTargetSubsidiaryId)
                        ? '，原始子公司：' + (ctx1.originalTargetSubsidiaryName || ctx1.originalTargetSubsidiaryId)
                        : '';
                    var currencyMsg = ctx1.currencyName ? '，币种：' + ctx1.currencyName : '';
                    var feeTypeMsg = ctx1.feeTypeAmountMap ? '，费用中类：' + Object.keys(ctx1.feeTypeAmountMap).join('/') : '';
                    var sourcePoMsg = ctx1.sourcePoIds && ctx1.sourcePoIds.length ? '，关联来源PO：' + ctx1.sourcePoIds.join('/') : '';
                    result_str.data = '【头程费用信息录入】中的【承运商】对应子公司不符合要求，请重新填写。承运商：'
                        + carrierMsg + subMsg + orgSubMsg + currencyMsg + feeTypeMsg + sourcePoMsg;
                    return result_str;
                }

                if (e.message.includes('entity')) {
                    var ctx2 = currentFeePoContext || {};
                    var carrierMsg2 = ctx2.vendorName || currentCarrierName || '名称未取到';
                    var subMsg2 = (ctx2.targetSubsidiaryName || ctx2.targetSubsidiaryId)
                        ? '，目标子公司：' + (ctx2.targetSubsidiaryName || ctx2.targetSubsidiaryId)
                        : '';
                    var orgSubMsg2 = (ctx2.originalTargetSubsidiaryName || ctx2.originalTargetSubsidiaryId)
                        ? '，原始子公司：' + (ctx2.originalTargetSubsidiaryName || ctx2.originalTargetSubsidiaryId)
                        : '';
                    var currencyMsg2 = ctx2.currencyName ? '，币种：' + ctx2.currencyName : '';
                    var feeTypeMsg2 = ctx2.feeTypeAmountMap ? '，费用中类：' + Object.keys(ctx2.feeTypeAmountMap).join('/') : '';
                    var sourcePoMsg2 = ctx2.sourcePoIds && ctx2.sourcePoIds.length ? '，关联来源PO：' + ctx2.sourcePoIds.join('/') : '';
                    result_str.data = '【头程费用信息录入】中的【承运商】无法用于当前采购订单子公司，请重新填写。承运商：'
                        + carrierMsg2 + subMsg2 + orgSubMsg2 + currencyMsg2 + feeTypeMsg2 + sourcePoMsg2;
                    return result_str;
                }

                result_str.data = getSafeActionErrorMessage(e, '生成头程费用类采购订单失败,请联系管理人员');
                return result_str;
            }
        }


        /**
         * 生成账单
         */
        function createVendorBill(vendorBill, providerId, kj) {

            var vendorbillRecord = record.create({
                type: 'vendorbill',
                isDynamic: true
            });

            // 供应商
            vendorbillRecord.setValue({
                fieldId: 'entity',
                value: providerId
            });
            applyVendorPaymentTerms(vendorbillRecord, providerId);


            for (const vendorBillKey in vendorBill) {
                var jsonValue = vendorBill[vendorBillKey];

                var zhongleiID = jsonValue.zhonglei;
                var zlKj = kj[zhongleiID]
                log.debug('kj', kj);
                log.debug('zlKj', zlKj);
                log.debug('feeCy', jsonValue.feeCy);

                vendorbillRecord.selectNewLine({ sublistId: 'expense' });
                vendorbillRecord.setCurrentSublistValue({
                    sublistId: 'expense',
                    fieldId: 'account',
                    value: zlKj
                });

                vendorbillRecord.setCurrentSublistValue({
                    sublistId: 'expense',
                    fieldId: FIELD_AMOUNT,
                    value: jsonValue.feeCy
                });

                vendorbillRecord.commitLine({ sublistId: SUBLIST_ITEM });

            }

            var vendorbillID = vendorbillRecord.save();
            return vendorbillID;
        }

        /**
         * 追加行
         */
        function addLines(order, item, rate, quantity, taxcode, memo, itemId, lineNumber) {
            order.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: SUBLIST_ITEM, value: item, line: lineNumber });//货品 其他
            order.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: "rate", value: rate, line: lineNumber });//单价
            order.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: "quantity", value: quantity, line: lineNumber });//数量
            order.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: "taxcode", value: taxcode, line: lineNumber });//税率
            order.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: "custcol_swc_so_platform_sku", value: memo, line: lineNumber });//销售平台sku
            order.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: "custcol_swc_systemitem", value: itemId, line: lineNumber });//系统SKU

        }

        /**
         * 根据来源单据查找关联生成单据。
         */
        function getIdsByCreatedFrom(type, poId) {
            var ids = [];
            var s = search.create({
                type: type,
                filters: [['createdfrom', 'anyof', String(poId)]],
                columns: ['internalid']
            });

            s.run().each(function (r) {
                ids.push(r.getValue({ name: 'internalid' }));
                return true;
            });

            return ids;
        }

        /**
         * 删除时“记录不存在”视为成功（幂等）
         */
        function safeDeleteIdempotent(type, id) {
            try {
                record.submitFields({
                    type: type,
                    id: String(id),
                    values: {
                        isinactive: true
                    }
                });
                return { ok: true, type: type, id: String(id) };
            } catch (e) {
                var name = e && e.name ? e.name : '';
                var msg = e && e.message ? e.message : String(e);

                // 常见：记录已经被删除/不存在
                // 不同账号或语言环境下错误码可能存在差异，这里使用多条件兜底。
                var notFound =
                    name === 'RCRD_DSNT_EXIST' ||
                    name === 'RCRD_NOT_FOUND' ||
                    /does not exist/i.test(msg) ||
                    /不存在/.test(msg);

                if (notFound) {
                    return { ok: true, type: type, id: String(id), skipped: true };
                }

                return { ok: false, type: type, id: String(id), error: name + ': ' + msg };
            }
        }


        /**
         * 采购杂费差异账单生成
         * @param {number|string} billId
         */
        function poZfCy(billId) {
            var result_str = {};

            // 常量定义，按实际字段和科目配置使用。
            var SUB_FEE = SUBLIST_WL_PO_FEE;
            var SUB_WL = SUBLIST_WL_PLAN_DETAIL;

            var F_ALLOC = 'custrecord_swc_wl_d_sj_fee_zf_ft'; // 分摊写回字段
            var F_STATUS = FIELD_WL_PLAN_STATUS;   // 主记录状态

            // 差异单据回写字段。
            var F_CY_TRAN = 'custrecord_swc_wl_po_cy_vendbill';
            var F_CY_AMT = 'custrecord_swc_wl_po_fee_cy';
            var F_FPO_TYPE = FIELD_WL_PO_FEE_FPO_TYPE;

            // 子表字段
            var F_PO_ID = 'custrecord_swc_wl_po_fee_id';
            var F_YG = FIELD_WL_PO_FEE_YG;
            var F_SJ = 'custrecord_swc_wl_po_fee_sj';
            var F_PAY = 'custrecord_swc_wl_po_fee_pay';
            var F_VEN = 'custrecord_swc_wl_po_fee_ven';

            // WL 明细字段
            var F_WL_PO_NUM = FIELD_WL_D_PO_NUM;
            var F_WL_VOL = FIELD_WL_D_TOTAL_VOLUME;

            // 科目 internalId 当前保留为常量，后续可改为脚本参数或配置表。
            var ACCOUNT_BILL = 3109; // Vendor Bill expense account
            var ACCOUNT_VC = 58;   // Vendor Credit expense account
            //20260228 罗亚宇  默认货品设值为 采购杂费
            // 账单、贷项用货品（采购杂费）设值，不用费用设值。。
            var ITEM_ID = 3109; // 3109 测试环境货品内部id

            // 工具方法。
            /**
             * 将任意值安全转换为数字，无法转换时返回 0。
             */
            function toNumber(v) {
                var n = Number(v);
                return isFinite(n) ? n : 0;
            }

            /**
             * 对金额或数量统一保留两位小数。
             */
            function round2(v) {
                return Math.round((toNumber(v) + Number.EPSILON) * 100) / 100;
            }

            /**
             * 读取子列表字段值的简化方法。
             */
            function getSub(rec, sublistId, fieldId, line) {
                return rec.getSublistValue({ sublistId: sublistId, fieldId: fieldId, line: line });
            }

            /**
             * 写入子列表字段值的简化方法。
             */
            function setSub(rec, sublistId, fieldId, line, value) {
                rec.setSublistValue({ sublistId: sublistId, fieldId: fieldId, line: line, value: value });
            }

            try {
                // 第一步：读取主记录。
                var rec = record.load({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: billId,
                    isDynamic: false
                });

                // 第二步：处理费用子表，写入差异金额并构造 PO 费用汇总。
                var poFeeMap = {}; // key: po_fee_id, value: { po_fee_sj: number }

                var feeLineCount = rec.getLineCount({ sublistId: SUB_FEE });
                for (var i = 0; i < feeLineCount; i++) {
                    var po_fee_id = getSub(rec, SUB_FEE, F_PO_ID, i);
                    if (!po_fee_id) continue;

                    var fee_yg = toNumber(getSub(rec, SUB_FEE, F_YG, i));
                    var fee_sj = toNumber(getSub(rec, SUB_FEE, F_SJ, i));
                    var cy = round2(fee_yg - fee_sj);

                    // 回写差异金额 & 类型
                    setSub(rec, SUB_FEE, F_CY_AMT, i, cy);
                    setSub(rec, SUB_FEE, F_FPO_TYPE, i, 6);

                    // 供后续分摊使用，分摊口径为“实际杂费”。
                    poFeeMap[String(po_fee_id)] = { po_fee_sj: round2(fee_sj) };

                    // 幂等：已有差异单据则跳过创建（避免重复执行生成多张）
                    var existedTranId = getSub(rec, SUB_FEE, F_CY_TRAN, i);
                    if (existedTranId) continue;

                    if (cy === 0) continue;

                    // 供应商实体：fee_pay 优先，否则 ven（避免 entity 为空）
                    var fee_pay = getSub(rec, SUB_FEE, F_PAY, i);
                    var providerId = fee_pay || getSub(rec, SUB_FEE, F_VEN, i);
                    if (!providerId) {
                        log.error('差异单据创建失败：entity为空', 'line=' + i + ', po_fee_id=' + po_fee_id);
                        continue;
                    }

                    // 创建差异单据：单行失败不影响整体分摊写回
                    try {
                        var tranId;
                        if (cy > 0) {
                            //预估采购杂费比实际费用多  需要生成贷项  20260228 罗亚宇 问题清单76
                            tranId = createVendorCredit2(providerId, Math.abs(cy), ITEM_ID, 11);
                        } else {
                            //预估采购杂费比实际费用少  需要生成账单  20260228 罗亚宇 问题清单77
                            tranId = createVendorBill2(providerId, Math.abs(cy), ITEM_ID, 11);
                        }
                        setSub(rec, SUB_FEE, F_CY_TRAN, i, tranId);
                    } catch (innerErr) {
                        throw innerErr;
                        log.error('差异单据创建异常 line=' + i, innerErr);
                    }
                }

                // 第三步：收集物流明细，并按 PO 分组。
                var wlLineCount = rec.getLineCount({ sublistId: SUB_WL });
                var poLineList = {}; // { poId: [{ lineIndex, vol }, ...] }

                for (var x = 0; x < wlLineCount; x++) {
                    var wl_po_id = getSub(rec, SUB_WL, F_WL_PO_NUM, x);
                    if (!wl_po_id) continue;

                    var poId = String(wl_po_id);
                    if (!poFeeMap.hasOwnProperty(poId)) continue;

                    var vol = toNumber(getSub(rec, SUB_WL, F_WL_VOL, x));

                    if (!poLineList[poId]) poLineList[poId] = [];
                    poLineList[poId].push({
                        lineIndex: x,
                        vol: vol
                    });
                }

                // 第四步：执行分摊回写，并在最后一行补齐尾差。
                for (var poIdKey in poLineList) {
                    if (!poLineList.hasOwnProperty(poIdKey)) continue;

                    var list = poLineList[poIdKey];
                    if (!list || list.length === 0) continue;

                    var poFee = round2(toNumber(poFeeMap[poIdKey].po_fee_sj));
                    if (poFee === 0) continue;

                    var totalVol = 0;
                    for (var a = 0; a < list.length; a++) totalVol += toNumber(list[a].vol);

                    if (totalVol <= 0) {
                        log.error('分摊失败：总体积为0', 'po=' + poIdKey);
                        continue;
                    }

                    // 找到最后一个 vol>0 的行作为“补差行”，否则用最后一行
                    var lastIdx = -1;
                    for (var b = list.length - 1; b >= 0; b--) {
                        if (toNumber(list[b].vol) > 0) { lastIdx = b; break; }
                    }
                    if (lastIdx === -1) lastIdx = list.length - 1;

                    var applied = 0;
                    for (var c = 0; c < list.length; c++) {
                        var amt;
                        if (c === lastIdx) {
                            amt = round2(poFee - applied);
                        } else {
                            amt = round2((toNumber(list[c].vol) / totalVol) * poFee);
                            applied = round2(applied + amt);
                        }

                        setSub(rec, SUB_WL, F_ALLOC, list[c].lineIndex, amt);
                    }
                }

                // 第五步：更新状态并保存。
                rec.save({ ignoreMandatoryFields: false });

                result_str.data = '预估杂费分摊成功！';
                return result_str;

            } catch (e) {
                log.error('采购杂费差异账单创建异常', e);
                result_str.data = '采购杂费差异账单创建异常,请联系管理人员';
                return result_str;
            }
        }

        /**
         * 创建 Vendor Bill（供应商账单）
         * @param {number|string} vendorId
         * @param {number} amount 正数
         */
        function createVendorBill2(vendorId, amount, ITEM_ID, orderType2) {
            var amt = Number(amount);
            if (!vendorId) throw new Error('Vendor Bill: entity为空');
            if (!(amt > 0)) throw new Error('Vendor Bill: amount必须>0');

            var vendorbillRecord = record.create({
                type: 'vendorbill',
                isDynamic: true
            });

            vendorbillRecord.setValue({ fieldId: 'entity', value: vendorId });
            applyVendorPaymentTerms(vendorbillRecord, vendorId);
            if (orderType2) {
                vendorbillRecord.setValue({ fieldId: 'custbody_swc_order_type2', value: orderType2 });
            }

            vendorbillRecord.selectNewLine({ sublistId: SUBLIST_ITEM });
            vendorbillRecord.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: SUBLIST_ITEM, value: ITEM_ID });
            vendorbillRecord.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'quantity', value: '1' });
            vendorbillRecord.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'rate', value: amt });
            vendorbillRecord.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: FIELD_AMOUNT, value: amt });
            vendorbillRecord.commitLine({ sublistId: SUBLIST_ITEM });



            // // 关键点：expense 子列表需要 commit expense。

            return vendorbillRecord.save({ ignoreMandatoryFields: false });
        }

        /**
         * 创建 Vendor Credit（供应商贷项）
         * 注意：不要用 creditmemo（那是客户贷项）
         * @param {number|string} vendorId
         * @param {number} amount 正数
         */
        function createVendorCredit2(vendorId, amount, ITEM_ID, orderType2) {
            var amt = Number(amount);
            if (!vendorId) throw new Error('Vendor Credit: entity为空');
            if (!(amt > 0)) throw new Error('Vendor Credit: amount必须>0');

            var tranRec = record.create({
                type: 'vendorcredit',
                isDynamic: true
            });

            tranRec.setValue({ fieldId: 'entity', value: vendorId });
            applyVendorPaymentTerms(tranRec, vendorId);
            if (orderType2) {
                tranRec.setValue({ fieldId: 'custbody_swc_order_type2', value: orderType2 });
            }

            tranRec.selectNewLine({ sublistId: SUBLIST_ITEM });
            tranRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: SUBLIST_ITEM, value: ITEM_ID });
            tranRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'quantity', value: '1' });
            tranRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'rate', value: amt });
            tranRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: FIELD_AMOUNT, value: amt });
            tranRec.commitLine({ sublistId: SUBLIST_ITEM });

            // tranRec.selectNewLine({ sublistId: 'expense' });
            // tranRec.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'account', value: Number(accountId) });
            // tranRec.setCurrentSublistValue({ sublistId: 'expense', fieldId: FIELD_AMOUNT, value: amt });
            // tranRec.commitLine({ sublistId: 'expense' });

            // 有些账号设置必填字段多，必要时可用 ignoreMandatoryFields:true
            return tranRec.save({ ignoreMandatoryFields: true });
        }

        /**
         * 海外仓调拨费对应的差异账单货品沿用历史费用类 PO 做成时的同一套映射。
         */
        function getHwTransferDiffItemId(loType) {
            if (loType == '出仓费') return 4596;
            if (loType == '入仓费') return CONFIG.ITEM_ID_WL_STORAGE_FEE_PO;
            if (loType == '卡车费') return 4597;
            return '';
        }

        /**
         * 海外仓调拨费差异账单做成。
         * 口径：
         * 1. 只处理海外子表。
         * 2. 差异 = 预估 - 实际。
         * 3. 正数生成 Vendor Credit，负数生成 Vendor Bill。
         * 4. 一条明细只回写一张差异单据。
         */
        function differentialBillingCompletedHw(id) {
            var result_str = {};

            try {
                function isEmptyBillValue(v) {
                    if (v === null || v === undefined || v === '') return true;
                    if (Array.isArray(v)) return v.length === 0;
                    return false;
                }

                /**
                 * 处理方法：normalizeLoType。
                 * 统一清洗海外仓调拨费类型文本，避免因为空格导致匹配失败。
                 */
                function normalizeLoType(v) {
                    if (v === null || v === undefined) return '';
                    return String(v).replace(/\s/g, '');
                }

                /**
                 * 实际差异账单做成时，同步将“真实海外仓调拨费”分摊回 TO 货品行真实费用字段。
                 * 口径沿用 onClickApproveOk_hw：
                 * 1. 出仓费按数量分摊；
                 * 2. 卡车费、入仓费按体积分摊；
                 * 3. 只取已经填写实际费用的海外仓调拨费子表行；
                 * 4. 只回写真实费用字段，不动预估费用字段。
                 */
                function applyHwActualFeeToItemLines(rec) {
                    var feeSubID = SUBLIST_HW_TRNFRORD_LINK;
                    var feeLineCount = rec.getLineCount({ sublistId: feeSubID }) || 0;
                    if (feeLineCount <= 0) {
                        return;
                    }

                    var feeLines = [];
                    for (var f = 0; f < feeLineCount; f++) {
                        var feeSjRaw = rec.getSublistValue({
                            sublistId: feeSubID,
                            fieldId: FIELD_HW_TRNFRORD_PO_DB_FEE_SJ,
                            line: f
                        });
                        var hasFeeSj = !(feeSjRaw === null || feeSjRaw === undefined || feeSjRaw === '');
                        if (!hasFeeSj) continue;

                        var feeAmount = Number(feeSjRaw || 0);
                        if (!feeAmount) continue;

                        var loType = normalizeLoType(rec.getSublistText({
                            sublistId: feeSubID,
                            fieldId: FIELD_HW_TRNFRORD_LO_TYPE,
                            line: f
                        }) || rec.getSublistValue({
                            sublistId: feeSubID,
                            fieldId: FIELD_HW_TRNFRORD_LO_TYPE,
                            line: f
                        }));

                        feeLines.push({
                            feeAmount: feeAmount,
                            loType: loType
                        });
                    }

                    if (!feeLines.length) {
                        return;
                    }

                    var itemSubId = SUBLIST_ITEM;
                    var itemLineCount = rec.getLineCount({ sublistId: itemSubId }) || 0;
                    if (itemLineCount <= 0) {
                        return;
                    }

                    var lineInfo = [];
                    var itemIds = [];
                    var truckFeeMap = {};
                    var inFeeMap = {};
                    var outFeeMap = {};

                    for (var i = 0; i < itemLineCount; i++) {
                        var itemId = rec.getSublistValue({
                            sublistId: itemSubId,
                            fieldId: SUBLIST_ITEM,
                            line: i
                        });
                        if (!itemId) continue;

                        var qty = Number(rec.getSublistValue({
                            sublistId: itemSubId,
                            fieldId: FIELD_QUANTITY,
                            line: i
                        }) || 0);
                        if (qty < 0) qty = 0;

                        var lineNo = rec.getSublistValue({
                            sublistId: itemSubId,
                            fieldId: 'custcol_swc_line_no',
                            line: i
                        });

                        var itemIdStr = String(itemId);
                        itemIds.push(itemIdStr);
                        lineInfo.push({
                            line: i,
                            itemId: itemIdStr,
                            qty: qty,
                            lineNo: lineNo
                        });

                        truckFeeMap[lineNo] = 0;
                        inFeeMap[lineNo] = 0;
                        outFeeMap[lineNo] = 0;
                    }

                    if (!lineInfo.length) {
                        return;
                    }

                    var uniqItemIds = Array.from(new Set(itemIds));
                    if (!uniqItemIds.length) {
                        return;
                    }

                    var inventoryitemSearchObj = search.create({
                        type: SUBLIST_ITEM,
                        filters: [
                            ["type", "anyof", "Payment", "OthCharge", "Markup", "Kit", "Subtotal", "InvtPart", "Discount", "Service", "Assembly", "Description", "Group", "NonInvtPart"],
                            "AND",
                            ["internalid", "anyof", uniqItemIds]
                        ],
                        columns: [
                            search.createColumn({ name: "custitem_swc_total_volume" }),
                            search.createColumn({ name: "internalid" })
                        ]
                    });

                    var itemSearchResults = getAllResults(inventoryitemSearchObj) || [];
                    var volMap = {};
                    for (var r = 0; r < itemSearchResults.length; r++) {
                        var iid = String(itemSearchResults[r].getValue({ name: 'internalid' }));
                        var vpu = Number(itemSearchResults[r].getValue({ name: 'custitem_swc_total_volume' }) || 0);
                        volMap[iid] = vpu;
                    }

                    var totalVol = 0;
                    var totalQty = 0;
                    for (var j = 0; j < lineInfo.length; j++) {
                        var vpu2 = Number(volMap[lineInfo[j].itemId] || 0);
                        var qty2 = Number(lineInfo[j].qty || 0);
                        var volQty = vpu2 * qty2;
                        lineInfo[j].volPerUnit = vpu2;
                        lineInfo[j].volQty = volQty;
                        totalVol += volQty;
                        totalQty += qty2;
                    }

                    for (var x = 0; x < feeLines.length; x++) {
                        var currentFee = Number(feeLines[x].feeAmount || 0);
                        var currentLoType = normalizeLoType(feeLines[x].loType);

                        var targetMap = null;
                        if (currentLoType === '卡车费') {
                            targetMap = truckFeeMap;
                        } else if (currentLoType === '入仓费') {
                            targetMap = inFeeMap;
                        } else if (currentLoType === '出仓费') {
                            targetMap = outFeeMap;
                        } else {
                            continue;
                        }

                        var useQty = (currentLoType === '出仓费');
                        if (useQty && totalQty <= 0) continue;
                        if (!useQty && totalVol <= 0) continue;

                        var allocated = 0;
                        var lastIdx = -1;
                        for (var k = lineInfo.length - 1; k >= 0; k--) {
                            var basisVal = useQty
                                ? Number(lineInfo[k].qty || 0)
                                : Number(lineInfo[k].volQty || 0);
                            if (basisVal > 0) {
                                lastIdx = k;
                                break;
                            }
                        }
                        if (lastIdx === -1) lastIdx = lineInfo.length - 1;

                        for (var m = 0; m < lineInfo.length; m++) {
                            var ratioBase = useQty
                                ? Number(lineInfo[m].qty || 0)
                                : Number(lineInfo[m].volQty || 0);
                            var totalBase = useQty ? totalQty : totalVol;
                            var share = 0;

                            if (m === lastIdx) {
                                share = round2(currentFee - allocated);
                            } else {
                                share = round2((ratioBase / totalBase) * currentFee);
                                allocated = round2(allocated + share);
                            }

                            targetMap[lineInfo[m].lineNo] = round2(
                                Number(targetMap[lineInfo[m].lineNo] || 0) + Number(share || 0)
                            );
                        }
                    }

                    for (var z = 0; z < lineInfo.length; z++) {
                        var lineNo2 = lineInfo[z].lineNo;
                        var truckShare = round2(Number(truckFeeMap[lineNo2] || 0));
                        var inShare = round2(Number(inFeeMap[lineNo2] || 0));
                        var outShare = round2(Number(outFeeMap[lineNo2] || 0));

                        rec.setSublistValue({
                            sublistId: itemSubId,
                            fieldId: 'custcol_swc_hw_aptf',
                            line: lineInfo[z].line,
                            value: truckShare
                        });

                        rec.setSublistValue({
                            sublistId: itemSubId,
                            fieldId: 'custcol_swc_hw_to_location_sj',
                            line: lineInfo[z].line,
                            value: inShare
                        });

                        rec.setSublistValue({
                            sublistId: itemSubId,
                            fieldId: 'custcol_swc_hw_fo_location_sj',
                            line: lineInfo[z].line,
                            value: outShare
                        });
                    }
                }

                var rec = record.load({
                    type: RECORD_TYPE_TRANSFER_ORDER,
                    id: id,
                    isDynamic: false
                });

                var feeSubID = SUBLIST_HW_TRNFRORD_LINK;
                var lineCount = rec.getLineCount({ sublistId: feeSubID }) || 0;
                if (lineCount <= 0) {
                    result_str.data = '未找到海外仓调拨费明细';
                    return result_str;
                }

                // 先按真实费用将海外仓调拨费分摊回货品行真实费用字段，
                // 再继续做差异金额及差异账单。
                applyHwActualFeeToItemLines(rec);

                var hasAnyLine = false;
                var hasNewTran = false;

                for (var i = 0; i < lineCount; i++) {
                    var feeYgRaw = rec.getSublistValue({
                        sublistId: feeSubID,
                        fieldId: FIELD_HW_TRNFRORD_PO_DB_FEE,
                        line: i
                    });

                    var feeSjRaw = rec.getSublistValue({
                        sublistId: feeSubID,
                        fieldId: FIELD_HW_TRNFRORD_PO_DB_FEE_SJ,
                        line: i
                    });

                    var hasFeeYg = !(feeYgRaw === null || feeYgRaw === undefined || feeYgRaw === '');
                    var hasFeeSj = !(feeSjRaw === null || feeSjRaw === undefined || feeSjRaw === '');

                    var feeYg = Number(feeYgRaw || 0);
                    var feeSj = Number(feeSjRaw || 0);

                    var providerId = rec.getSublistValue({
                        sublistId: feeSubID,
                        fieldId: FIELD_HW_TRNFRORD_PAY_QS,
                        line: i
                    });

                    var loType = rec.getSublistValue({
                        sublistId: feeSubID,
                        fieldId: FIELD_HW_TRNFRORD_LO_TYPE,
                        line: i
                    });

                    var cyBillId = rec.getSublistValue({
                        sublistId: feeSubID,
                        fieldId: FIELD_DIFFERENCE_BILL,
                        line: i
                    });

                    if (!providerId && !hasFeeYg && !hasFeeSj) {
                        continue;
                    }

                    // 只有预估和实际都填写的场合，才进入“实际差异账单”处理。
                    if (!hasFeeYg || !hasFeeSj) {
                        continue;
                    }

                    hasAnyLine = true;

                    var cy = round2(feeYg - feeSj);
                    rec.setSublistValue({
                        sublistId: feeSubID,
                        fieldId: FIELD_COST_DIFFERENCE,
                        line: i,
                        value: cy
                    });

                    if (!isEmptyBillValue(cyBillId) || cy === 0) {
                        continue;
                    }

                    if (!providerId) {
                        result_str.data = '请正确填写海外仓调拨费付款方。';
                        return result_str;
                    }

                    var itemId = getHwTransferDiffItemId(loType);
                    if (!itemId) {
                        result_str.data = '海外仓调拨费类型异常，无法识别：' + (loType || '');
                        return result_str;
                    }

                    var tranId;
                    if (cy > 0) {
                        tranId = createVendorCredit2(providerId, Math.abs(cy), itemId, 8);
                    } else {
                        tranId = createVendorBill2(providerId, Math.abs(cy), itemId, 8);
                    }

                    rec.setSublistValue({
                        sublistId: feeSubID,
                        fieldId: FIELD_DIFFERENCE_BILL,
                        line: i,
                        value: tranId
                    });
                    hasNewTran = true;
                }

                if (!hasAnyLine) {
                    result_str.data = '未找到可处理的海外仓调拨费明细';
                    return result_str;
                }

                rec.save({ enableSourcing: true, ignoreMandatoryFields: true });

                if (!hasNewTran) {
                    result_str.data = '已生成差异账单或当前无差异，无需重复处理。';
                    return result_str;
                }

                result_str.data = '差异账单生成成功';
                return result_str;
            } catch (e) {
                log.error('海外仓调拨费差异账单创建异常', e);
                result_str.data = getSafeActionErrorMessage(e, '海外仓调拨费差异账单创建异常,请联系管理人员');
                return result_str;
            }
        }


        /**
         * 供应商已出货 国内
         */
        function supplierShippedCn(billId) {
            var result_str = { data: '' };

            try {
                log.debug('billId', billId);
                if (!billId) {
                    result_str.data = 'billId为空，请确认参数';
                    return result_str;
                }

                var wlId = billId.split('_')[0];
                var wlId_type = billId.split('_')[1];
                if (wlId_type == 'cgwl') {
                    //CG上架到保税仓、保税仓调拨发运、上架到海外仓
                    //创建转移单
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: CONFIG.SCRIPT_ID_MR_TRADE_TERMS_SHIPMENT_LEGACY,
                        deploymentId: CONFIG.DEPLOY_ID_MR_TRADE_TERMS_SHIPMENT_LEGACY,
                        params: {
                            custscript_payload: billId
                        }
                    });
                    mrTask.submit();
                } else {
                    //贸易条款
                    // 读取当前物流发运单。
                    var rec = record.load({
                        type: RECORD_TYPE_WL_PLAN_ORDER,
                        id: wlId,
                        isDynamic: false
                    });

                    /**
                     * 判断值是否为 null、undefined 或空字符串。
                     */
                    function isBlank(v) {
                        return v === null || v === undefined || v === '';
                    }

                    /**
                     * 将任意值安全转换为数字，无法转换时返回 0。
                     */
                    function toNumber(v) {
                        var n = Number(v);
                        return isNaN(n) ? 0 : n;
                    }

                    var md_location = rec.getValue({ fieldId: FIELD_MD_LOCATION });         // 目的仓仓库代码
                    var terms_of_trade = rec.getValue({ fieldId: FIELD_WL_TERMS_OF_TRADE });// 成交方式（list internal id）
                    var wl_od = rec.getValue({ fieldId: 'custrecord_swc_wl_od' });                     // 国内/海外（list internal id）

                    // 校验必填
                    if (isBlank(wl_od)) {
                        result_str.data = '【海外/国内】字段值为空，请确认数据';
                        return result_str;
                    }
                    if (isBlank(terms_of_trade)) {
                        result_str.data = '【成交方式】字段值为空，请确认数据';
                        return result_str;
                    }
                    if (isBlank(md_location)) {
                        result_str.data = '【目的仓仓库代码】字段值为空，请确认数据';
                        return result_str;
                    }

                    // 统一转数字，避免 list 值是字符串时比较失败
                    wl_od = Number(wl_od);
                    terms_of_trade = Number(terms_of_trade);

                    // 成交方式支持范围
                    // wl_od: 1=国内, 2=海外
                    // terms_of_trade: 1~4 国内(EXW/国内FOB/DDP/DDU), 5 海外FOB
                    var cnZt = { 1: true, 2: true, 3: true, 4: true };
                    var hwZt = { 5: true };

                    if (wl_od === 1) {
                        if (!cnZt[terms_of_trade]) {
                            result_str.data = '当前单据主体为【国内】，当前成交方式不支持，请重新确认数据！';
                            return result_str;
                        }
                    } else if (wl_od === 2) {
                        if (!hwZt[terms_of_trade]) {
                            result_str.data = '当前单据主体为【海外】，当前成交方式不支持，请重新确认数据！';
                            return result_str;
                        }
                    } else {
                        result_str.data = '【海外/国内】字段值不合法，请确认数据';
                        return result_str;
                    }

                    // 调用MpReduce
                    // 传递参数 1 - 物流发运内部ID
                    // 传递参数 2 - 启用方式（按钮）
                    if (terms_of_trade == 1) { // 公司间交易 成交方式 Exw
                        var mrTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: CONFIG.SCRIPT_ID_MR_INTERCOMPANY_LEGACY,
                            deploymentId: CONFIG.DEPLOY_ID_MR_INTERCOMPANY_LEGACY,
                            params: {
                                custscript_m_payload: billId
                            }
                        });
                        mrTask.submit();
                    } else {// 转移单 其余成交方式
                        var mrTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: CONFIG.SCRIPT_ID_MR_TRADE_TERMS_SHIPMENT_LEGACY,
                            deploymentId: CONFIG.DEPLOY_ID_MR_TRADE_TERMS_SHIPMENT_LEGACY,
                            params: {
                                custscript_payload: billId
                            }
                        });
                        mrTask.submit();
                    }
                }
                result_str.data = '供应商出货，正在后台处理中...';
                return result_str;
            } catch (e) {
                log.error('supplierShippedCn error', e);
                result_str.data = '供应商出货异常，请联系管理人员';
                return result_str;
            }
        }

        /**
         * 执行报关节点处理。
         */
        function customsDeclared(billId) {
            var result_str = { data: '' };

            try {
                log.debug('billId', billId);
                if (!billId) {
                    result_str.data = 'billId为空，请确认参数';
                    return result_str;
                }

                var wlId = billId.split('_')[0];
                var wlId_type = billId.split('_')[1];
                if (wlId_type == 'cgbg') {
                    //CG上架到保税仓、保税仓调拨发运、上架到海外仓
                    //创建公司间交易
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: CONFIG.SCRIPT_ID_MR_INTERCOMPANY_LEGACY,
                        deploymentId: CONFIG.DEPLOY_ID_MR_INTERCOMPANY_LEGACY,
                        params: {
                            custscript_m_payload: billId
                        }
                    });
                    mrTask.submit();
                } else {
                    //贸易条款
                    // 读取当前物流发运单。
                    var rec = record.load({
                        type: RECORD_TYPE_WL_PLAN_ORDER,
                        id: wlId,
                        isDynamic: false
                    });

                    /**
                     * 判断值是否为 null、undefined 或空字符串。
                     */
                    function isBlank(v) {
                        return v === null || v === undefined || v === '';
                    }

                    /**
                     * 将任意值安全转换为数字，无法转换时返回 0。
                     */
                    function toNumber(v) {
                        var n = Number(v);
                        return isNaN(n) ? 0 : n;
                    }

                    var md_location = rec.getValue({ fieldId: FIELD_MD_LOCATION });         // 目的仓仓库代码
                    var terms_of_trade = rec.getValue({ fieldId: FIELD_WL_TERMS_OF_TRADE });// 成交方式（list internal id）
                    var wl_od = rec.getValue({ fieldId: 'custrecord_swc_wl_od' });                     // 国内/海外（list internal id）

                    // 校验必填
                    if (isBlank(wl_od)) {
                        result_str.data = '【海外/国内】字段值为空，请确认数据';
                        return result_str;
                    }
                    if (isBlank(terms_of_trade)) {
                        result_str.data = '【成交方式】字段值为空，请确认数据';
                        return result_str;
                    }
                    if (isBlank(md_location)) {
                        result_str.data = '【目的仓仓库代码】字段值为空，请确认数据';
                        return result_str;
                    }

                    // 统一转数字，避免 list 值是字符串时比较失败
                    wl_od = Number(wl_od);
                    terms_of_trade = Number(terms_of_trade);

                    // 成交方式支持范围
                    // wl_od: 1=国内, 2=海外
                    // terms_of_trade: 1~4 国内(EXW/国内FOB/DDP/DDU), 5 海外FOB
                    var cnZt = { 1: true, 2: true, 3: true, 4: true };
                    var hwZt = { 5: true };

                    if (wl_od === 1) {
                        if (!cnZt[terms_of_trade]) {
                            result_str.data = '当前单据主体为【国内】，当前成交方式不支持，请重新确认数据！';
                            return result_str;
                        }
                    } else if (wl_od === 2) {
                        if (!hwZt[terms_of_trade]) {
                            result_str.data = '当前单据主体为【海外】，当前成交方式不支持，请重新确认数据！';
                            return result_str;
                        }
                    } else {
                        result_str.data = '【海外/国内】字段值不合法，请确认数据';
                        return result_str;
                    }

                    // 调用MpReduce
                    // 传递参数 1 - 物流发运内部ID
                    // 传递参数 2 - 启用方式（按钮）
                    if (terms_of_trade == 2) { // 公司间交易 国内FOB 成交方式
                        var mrTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: CONFIG.SCRIPT_ID_MR_INTERCOMPANY_LEGACY,
                            deploymentId: CONFIG.DEPLOY_ID_MR_INTERCOMPANY_LEGACY,
                            params: {
                                custscript_m_payload: billId
                            }
                        });
                        mrTask.submit();
                    } else {// 转移单 其余成交方式
                        var mrTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: CONFIG.SCRIPT_ID_MR_TRADE_TERMS_SHIPMENT_LEGACY,
                            deploymentId: CONFIG.DEPLOY_ID_MR_TRADE_TERMS_SHIPMENT_LEGACY,
                            params: {
                                custscript_payload: billId
                            }
                        });
                        mrTask.submit();
                    }
                }
                result_str.data = '报关，正在后台处理中...';
                return result_str;
            } catch (e) {
                log.error('customsDeclared error', e);
                result_str.data = '报关异常，请联系管理人员';
                return result_str;
            }
        }


        /**
         * 执行清关节点处理。
         */
        function clearedCustoms(billId) {
            var result_str = { data: '' };

            try {
                log.debug('billId', billId);
                if (!billId) {
                    result_str.data = 'billId为空，请确认参数';
                    return result_str;
                }

                var wlId = billId.split('_')[0];
                var wlId_type = billId.split('_')[1];
                if (wlId_type == 'cgqg') {
                    //CG上架到保税仓、保税仓调拨发运、上架到海外仓
                    //生成转移单
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: CONFIG.SCRIPT_ID_MR_TRADE_TERMS_SHIPMENT_LEGACY,
                        deploymentId: CONFIG.DEPLOY_ID_MR_TRADE_TERMS_SHIPMENT_LEGACY,
                        params: {
                            custscript_payload: billId
                        }
                    });
                    mrTask.submit();
                } else {
                    //贸易条款
                    // 读取当前物流发运单。
                    var rec = record.load({
                        type: RECORD_TYPE_WL_PLAN_ORDER,
                        id: wlId,
                        isDynamic: false
                    });

                    /**
                     * 判断值是否为 null、undefined 或空字符串。
                     */
                    function isBlank(v) {
                        return v === null || v === undefined || v === '';
                    }

                    /**
                     * 将任意值安全转换为数字，无法转换时返回 0。
                     */
                    function toNumber(v) {
                        var n = Number(v);
                        return isNaN(n) ? 0 : n;
                    }

                    var md_location = rec.getValue({ fieldId: FIELD_MD_LOCATION });         // 目的仓仓库代码
                    var terms_of_trade = rec.getValue({ fieldId: FIELD_WL_TERMS_OF_TRADE });// 成交方式（list internal id）
                    var wl_od = rec.getValue({ fieldId: 'custrecord_swc_wl_od' });                     // 国内/海外（list internal id）

                    // 校验必填
                    if (isBlank(wl_od)) {
                        result_str.data = '【海外/国内】字段值为空，请确认数据';
                        return result_str;
                    }
                    if (isBlank(terms_of_trade)) {
                        result_str.data = '【成交方式】字段值为空，请确认数据';
                        return result_str;
                    }
                    if (isBlank(md_location)) {
                        result_str.data = '【目的仓仓库代码】字段值为空，请确认数据';
                        return result_str;
                    }

                    // 统一转数字，避免 list 值是字符串时比较失败
                    wl_od = Number(wl_od);
                    terms_of_trade = Number(terms_of_trade);

                    // 成交方式支持范围
                    // wl_od: 1=国内, 2=海外
                    // terms_of_trade: 1~4 国内(EXW/国内FOB/DDP/DDU), 5 海外FOB
                    var cnZt = { 1: true, 2: true, 3: true, 4: true };
                    var hwZt = { 5: true };

                    if (wl_od === 1) {
                        if (!cnZt[terms_of_trade]) {
                            result_str.data = '当前单据主体为【国内】，当前成交方式不支持，请重新确认数据！';
                            return result_str;
                        }
                    } else if (wl_od === 2) {
                        if (!hwZt[terms_of_trade]) {
                            result_str.data = '当前单据主体为【海外】，当前成交方式不支持，请重新确认数据！';
                            return result_str;
                        }
                    } else {
                        result_str.data = '【海外/国内】字段值不合法，请确认数据';
                        return result_str;
                    }

                    // 调用MpReduce
                    // 传递参数 1 - 物流发运内部ID
                    // 传递参数 2 - 启用方式（按钮）
                    if (terms_of_trade == 3 || terms_of_trade == 4) { // DDP DDU 公司间交易
                        var mrTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: CONFIG.SCRIPT_ID_MR_INTERCOMPANY_LEGACY,
                            deploymentId: CONFIG.DEPLOY_ID_MR_INTERCOMPANY_LEGACY,
                            params: {
                                custscript_m_payload: billId
                            }
                        });
                        mrTask.submit();
                    } else {// 转移单 其余成交方式
                        var mrTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: CONFIG.SCRIPT_ID_MR_TRADE_TERMS_SHIPMENT_LEGACY,
                            deploymentId: CONFIG.DEPLOY_ID_MR_TRADE_TERMS_SHIPMENT_LEGACY,
                            params: {
                                custscript_payload: billId
                            }
                        });
                        mrTask.submit();
                    }
                }
                result_str.data = '清关，正在后台处理中...';
                return result_str;
            } catch (e) {
                log.error('supplierShippedCn error', e);
                result_str.data = '清关异常，请联系管理人员';
                return result_str;
            }
        }




        /**
         * 对金额或数量统一保留两位小数。
         */
        function round2(n) {
            return Number((Number(n) || 0).toFixed(2));
        }

        /**
         * 获取费用中类与会计科目的映射。
         */
        function getZhongLeiKuaiji() {
            var rtnJson = {};
            var customrecord_swc_rule_mapping_tableSearchObj = search.create({
                type: RECORD_TYPE_RULE_MAPPING_TABLE,
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_swc_cost_medium", label: "费用项（中类）" }),
                        search.createColumn({ name: "custrecord_swc_account", label: "会计科目" }),
                        search.createColumn({ name: "internalid", label: "内部 ID" })
                    ]
            });
            var s = getAllResults(customrecord_swc_rule_mapping_tableSearchObj);
            for (let i = 0; i < s.length; i++) {
                var sData = s[i];
                rtnJson[sData.getValue('internalid')] = sData.getValue('custrecord_swc_account');
            }
            return rtnJson;
        }


        /**
         * 调拨费费用类型采购订单做成
         * @param id
         * @returns {{}}
         */
        function onClickFeePoCreate(id) {

            var result_str = {};

            try {

                var rec = record.load({
                    type: RECORD_TYPE_TRANSFER_ORDER,
                    id: id,
                });

                var feeSubID = SUBLIST_TRNFRORD_LINK;
                var line = rec.getLineCount(feeSubID);

                var feeYgCheck = [];
                var payCheck = [];
                if (line <= 0) {
                    result_str.data = '请正确填写采购调拨费录入信息！';
                    return result_str;
                }
                for (var x = 0; x < line; x++) {
                    // 费用明细表ID
                    var fee_id = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'id', line: x });
                    // 预估采购杂费
                    var po_fee_yg = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_trnfrord_po_db_fee', line: x });
                    // 付款方
                    var trnfrord_pay = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_trnfrord_pay', line: x });

                    if (!po_fee_yg) {
                        feeYgCheck.push(fee_id)
                    }

                    if (!trnfrord_pay) {
                        payCheck.push(trnfrord_pay)
                    }
                }

                if (payCheck.length > 0) {
                    result_str.data = '内部ID：' + feeYgCheck.join(',') + '行的付款方请正常填写！';
                    return result_str;
                }

                if (feeYgCheck.length > 0) {
                    result_str.data = '内部ID：' + feeYgCheck.join(',') + '行的预估采购调拨费请正常填写！';
                    return result_str;
                }

                for (var i = 0; i < line; i++) {
                    var poDBID = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'id', line: i });
                    // 付款方
                    var trnfrord_pay = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_trnfrord_pay', line: i });
                    // 预估采购杂费
                    var po_db_fee = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_trnfrord_po_db_fee', line: i });

                    // 创建费用类型采购订单
                    var po_data = record.create({ type: RECORD_TYPE_PURCHASE_ORDER, isDynamic: true });

                    // 表单：采购订单_费用类
                    po_data.setValue({ fieldId: 'customform', value: CONFIG.FORM_PO_FEE });
                    po_data.setValue({ fieldId: 'entity', value: trnfrord_pay });
                    po_data.setValue({ fieldId: FIELD_BODY_FEE_AR_TYPE, value: 1 });// 等待审批

                    // 账期 TODO 假数据，测试使用
                    // po_data.setValue({ fieldId: 'custbody_swc_cqdd_zq', value: 1 });
                    // 关联转移单
                    po_data.setValue({ fieldId: 'custbody_swc_transorder_id', value: id });
                    // 采购调拨费
                    po_data.setValue({ fieldId: 'custbody_swc_po_fee', value: 4 });
                    // 采购订单类型(手工单用)
                    po_data.setValue({ fieldId: 'custbody_swc_order_type2', value: 4 });
                    // 采购调拨费录入单
                    po_data.setValue({ fieldId: 'custbody_swc_po_db_id', value: poDBID });
                    // 采购调拨费状态
                    po_data.setValue({ fieldId: FIELD_BODY_FEE_AR_TYPE, value: 1 });
                    // 明细数据做成
                    po_data.selectNewLine({ sublistId: SUBLIST_ITEM });
                    po_data.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: SUBLIST_ITEM, value: 3110 });
                    po_data.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'quantity', value: 1 });
                    po_data.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'rate', value: po_db_fee });
                    po_data.commitLine({ sublistId: SUBLIST_ITEM });
                    var saveId = po_data.save({ ignoreMandatoryFields: true });
                    rec.setSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_trnfrord_po_id', value: saveId, line: i });
                    rec.setSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_trnfrord_po_type', value: 1, line: i });
                    rec.setValue({ fieldId: FIELD_BODY_PO_DB_TYPE, value: 1 });

                }

                rec.save();
                result_str.data = '生成费用类采购订单成功';
            } catch (e) {
                log.debug('生成费用类采购订单 ： ', e.message);
                result_str.data = getSafeActionErrorMessage(e, '生成费用类采购订单失败,请联系管理人员');
            }

            return result_str;
        }

        /**
         * 调拨费费用类型采购订单做成
         * @param id
         * @returns {{}}
         */
        function onClickFeePoCreate_hw(id) {

            var result_str = {};

            try {

                var rec = record.load({
                    type: RECORD_TYPE_TRANSFER_ORDER,
                    id: id,
                });

                var feeSubID = SUBLIST_HW_TRNFRORD_LINK;
                var line = rec.getLineCount(feeSubID);

                var feeYgCheck = [];
                var payCheck = [];
                if (line <= 0) {
                    result_str.data = '请正确填写采购调拨费录入信息！';
                    return result_str;
                }
                for (var x = 0; x < line; x++) {
                    // 费用明细表ID
                    var fee_id = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'id', line: x });
                    // 预估采购杂费
                    var po_fee_yg = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_hw_trnfrord_po_db_fee', line: x });
                    // 付款方
                    var trnfrord_pay = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_hw_trnfrord_pay_qs', line: x });

                    if (trnfrord_pay) {
                        if (!po_fee_yg) {
                            feeYgCheck.push(fee_id)
                        }
                        payCheck.push(trnfrord_pay)
                    }
                }

                if (payCheck.length == 0) {
                    result_str.data = '请正确填写付款方！';
                    return result_str;
                }

                if (feeYgCheck.length > 0) {
                    result_str.data = '请正确填写预估海外仓调拨费！';
                    return result_str;
                }

                for (var i = 0; i < line; i++) {
                    var poDBID = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'id', line: i });
                    // 付款方
                    var trnfrord_pay = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_hw_trnfrord_pay_qs', line: i });
                    // 预估采购杂费
                    var po_db_fee = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_hw_trnfrord_po_db_fee', line: i });

                    if (trnfrord_pay && Number(po_db_fee) > 0) {

                        // 获取仓库信息
                        var lo_type = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_hw_trnfrord_lo_type', line: i });

                        var feeId = '';
                        if (lo_type == '出仓费') {
                            feeId = 4596
                        } else if (lo_type == '入仓费') {
                            feeId = CONFIG.ITEM_ID_WL_STORAGE_FEE_PO
                        } else if (lo_type == '卡车费') {
                            feeId = 4597
                        }

                        log.debug('onClickFeePoCreate_hw line mapping', {
                            transferOrderId: id,
                            line: i,
                            poDBID: poDBID,
                            payEntity: trnfrord_pay,
                            poDbFee: po_db_fee,
                            loType: lo_type,
                            feeId: feeId,
                            storageFeeItemConfig: CONFIG.ITEM_ID_WL_STORAGE_FEE_PO
                        });


                        // 创建费用类型采购订单
                        var po_data = record.create({ type: RECORD_TYPE_PURCHASE_ORDER, isDynamic: true });

                        // 表单：采购订单_费用类
                        po_data.setValue({ fieldId: 'customform', value: CONFIG.FORM_PO_FEE });
                        po_data.setValue({ fieldId: 'entity', value: trnfrord_pay });
                        po_data.setValue({ fieldId: FIELD_BODY_FEE_AR_TYPE, value: 1 });// 等待审批

                        // 账期 TODO 假数据，测试使用
                        // po_data.setValue({ fieldId: 'custbody_swc_cqdd_zq', value: 1 });
                        // 关联转移单
                        po_data.setValue({ fieldId: 'custbody_swc_transorder_id', value: id });
                        // 采购调拨费
                        po_data.setValue({ fieldId: 'custbody_swc_po_fee', value: 4 });
                        // 采购订单类型(手工单用)
                        po_data.setValue({ fieldId: 'custbody_swc_order_type2', value: 6 });
                        // 采购调拨费录入单
                        po_data.setValue({ fieldId: 'custbody_swc_hw_po_db_id', value: poDBID });
                        // 采购调拨费状态
                        po_data.setValue({ fieldId: FIELD_BODY_FEE_AR_TYPE, value: 1 });
                        // 明细数据做成
                        po_data.selectNewLine({ sublistId: SUBLIST_ITEM });
                        log.debug('onClickFeePoCreate_hw before set item', {
                            transferOrderId: id,
                            line: i,
                            poDBID: poDBID,
                            loType: lo_type,
                            feeId: feeId
                        });
                        po_data.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: SUBLIST_ITEM, value: feeId });
                        po_data.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'quantity', value: 1 });
                        po_data.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'rate', value: po_db_fee });
                        po_data.commitLine({ sublistId: SUBLIST_ITEM });
                        var saveId = po_data.save({ ignoreMandatoryFields: true });
                        log.debug('onClickFeePoCreate_hw po created', {
                            transferOrderId: id,
                            line: i,
                            poDBID: poDBID,
                            poId: saveId
                        });
                        rec.setSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_hw_trnfrord_po_id', value: saveId, line: i });
                        rec.setSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_hw_trnfrord_po_type', value: 1, line: i });
                        rec.setValue({ fieldId: FIELD_BODY_PO_DB_TYPE, value: 1 });
                    }

                }

                rec.save();
                result_str.data = '生成费用类采购订单成功';
            } catch (e) {
                log.error('onClickFeePoCreate_hw error', {
                    transferOrderId: id,
                    errorName: e && e.name,
                    errorMessage: e && e.message,
                    errorStack: e && e.stack
                });
                result_str.data = getSafeActionErrorMessage(e, '生成费用类采购订单失败,请联系管理人员');
            }

            return result_str;
        }

        /**
         * 调拨费用分摊
         */
        function onClickApproveOk(id) {
            var result_str = {};

            try {

                // 调拨费分摊金额
                var dbFeeFtAmount = {};

                var rec = record.load({
                    type: record.Type.TRANSFER_ORDER,
                    id: id,
                    isDynamic: false
                });

                rec.setValue({ fieldId: 'orderstatus', value: 'B' })

                var feeSearch = search.create({
                    type: "customrecord_swc_trnfrord_db",
                    filters: [
                        ["custrecord_swc_trnfrord_link", "anyof", String(id)]
                    ],
                    columns: [
                        search.createColumn({ name: "custrecord_swc_trnfrord_po_db_fee" }),
                        search.createColumn({ name: "custrecord_swc_trnfrord_pay" })
                    ]
                });

                var rs = feeSearch.run().getRange({ start: 0, end: 1 });
                if (!rs || rs.length === 0) {
                    result_str.data = '未找到调拨费数据';
                    return result_str;
                }

                var po_db_fee = Number(rs[0].getValue({ name: 'custrecord_swc_trnfrord_po_db_fee' }) || 0);
                if (!po_db_fee || po_db_fee === 0) {
                    result_str.data = '预估采购调拨费为0，无需分摊';
                    return result_str;
                }

                var subId = SUBLIST_ITEM;
                var lineCount = rec.getLineCount({ sublistId: subId });
                if (!lineCount || lineCount <= 0) {
                    result_str.data = '调拨单无明细行';
                    return result_str;
                }

                var lineInfo = [];
                var itemIds = [];

                for (var i = 0; i < lineCount; i++) {
                    var itemId = rec.getSublistValue({ sublistId: subId, fieldId: SUBLIST_ITEM, line: i });
                    if (!itemId) continue;

                    var qty = Number(rec.getSublistValue({ sublistId: subId, fieldId: 'quantity', line: i }) || 0);
                    if (qty < 0) qty = 0;

                    var itemIdStr = String(itemId);
                    itemIds.push(itemIdStr);
                    lineInfo.push({ line: i, itemId: itemIdStr, qty: qty });
                }

                if (lineInfo.length === 0) {
                    result_str.data = '未取得有效商品行';
                    return result_str;
                }

                var uniqItemIds = Array.from(new Set(itemIds));
                if (uniqItemIds.length === 0) {
                    result_str.data = '未取得有效商品行';
                    return result_str;
                }

                var inventoryitemSearchObj = search.create({
                    type: "inventoryitem",
                    filters: [
                        ["type", "anyof", "InvtPart"],
                        "AND",
                        ["internalid", "anyof", uniqItemIds]
                    ],
                    columns: [
                        search.createColumn({ name: "custitem_swc_total_volume" }),
                        search.createColumn({ name: "internalid" })
                    ]
                });

                var itemSearchResults = getAllResults(inventoryitemSearchObj);
                var volMap = {};
                for (var r = 0; r < itemSearchResults.length; r++) {
                    var iid = String(itemSearchResults[r].getValue({ name: 'internalid' }));
                    var vpu = Number(itemSearchResults[r].getValue({ name: 'custitem_swc_total_volume' }) || 0);
                    volMap[iid] = vpu;
                }

                var totalVol = 0;
                for (var j = 0; j < lineInfo.length; j++) {
                    var vpu2 = Number(volMap[lineInfo[j].itemId] || 0);
                    var volQty = vpu2 * Number(lineInfo[j].qty || 0);
                    lineInfo[j].volPerUnit = vpu2;
                    lineInfo[j].volQty = volQty;
                    totalVol += volQty;
                }

                if (totalVol <= 0) {
                    result_str.data = '总体积为0，无法分摊';
                    return result_str;
                }

                var allocated = 0;

                var lastIdx = -1;
                for (var k = lineInfo.length - 1; k >= 0; k--) {
                    if (Number(lineInfo[k].volQty || 0) > 0) {
                        lastIdx = k;
                        break;
                    }
                }
                if (lastIdx === -1) lastIdx = lineInfo.length - 1;
                var share;
                for (var m = 0; m < lineInfo.length; m++) {

                    if (m === lastIdx) {
                        share = round2(po_db_fee - allocated);
                    } else {
                        share = round2((lineInfo[m].volQty / totalVol) * po_db_fee);
                        allocated = round2(allocated + share);
                    }

                    var lineNo = rec.getSublistValue({
                        sublistId: subId,
                        fieldId: 'custcol_swc_line_no',
                        line: lineInfo[m].line
                    });

                    rec.setSublistValue({
                        sublistId: subId,
                        fieldId: 'custcol_swc_epac',
                        line: lineInfo[m].line,
                        value: share
                    });

                    rec.setSublistValue({
                        sublistId: subId,
                        fieldId: 'custcol_swc_aptf',
                        line: lineInfo[m].line,
                        value: share
                    });

                    dbFeeFtAmount[lineNo] = share;

                }
                rec.save({ enableSourcing: true, ignoreMandatoryFields: true });

                log.debug('dbFeeFtAmount', dbFeeFtAmount);

                var toRecForShip = record.load({
                    type: record.Type.TRANSFER_ORDER,
                    id: id,
                    isDynamic: false
                });

                var remainShipTotal = 0;
                var toShipLines = toRecForShip.getLineCount({ sublistId: SUBLIST_ITEM });
                for (var s1 = 0; s1 < toShipLines; s1++) {
                    var rem = Number(toRecForShip.getSublistValue({
                        sublistId: SUBLIST_ITEM,
                        fieldId: 'quantityremaining',
                        line: s1
                    }) || 0);
                    remainShipTotal += rem;
                }

                var ifRec = record.transform({
                    fromType: record.Type.TRANSFER_ORDER,
                    fromId: id,
                    toType: record.Type.ITEM_FULFILLMENT,
                    isDynamic: false
                });

                ifRec.setValue({ fieldId: 'shipstatus', value: 'C' });
                var ifLineCount = ifRec.getLineCount({ sublistId: SUBLIST_ITEM });
                for (var a = 0; a < ifLineCount; a++) {
                    var remainIf = Number(ifRec.getSublistValue({
                        sublistId: SUBLIST_ITEM,
                        fieldId: 'quantityremaining',
                        line: a
                    }) || 0);

                    if (remainIf > 0) {
                        ifRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'itemship', line: a, value: true });
                        ifRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'quantity', line: a, value: remainIf });
                    } else {
                        ifRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'itemship', line: a, value: false });
                    }
                }

                ifRec.save({ enableSourcing: true, ignoreMandatoryFields: true });

                var irRec = record.transform({
                    fromType: record.Type.TRANSFER_ORDER,
                    fromId: id,
                    toType: record.Type.ITEM_RECEIPT,
                    isDynamic: true
                });

                var irLineCount = irRec.getLineCount({ sublistId: SUBLIST_ITEM });

                for (var b2 = 0; b2 < irLineCount; b2++) {
                    irRec.selectLine({ sublistId: SUBLIST_ITEM, line: b2 });

                    var remainIr = Number(irRec.getCurrentSublistValue({
                        sublistId: SUBLIST_ITEM,
                        fieldId: 'quantityremaining'
                    }) || 0);

                    var irLineNo = irRec.getCurrentSublistValue({
                        sublistId: SUBLIST_ITEM,
                        fieldId: 'custcol_swc_line_no'
                    })

                    if (remainIr > 0) {
                        irRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: FIELD_ITEM_RECEIVE, value: true });
                        irRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: FIELD_QUANTITY, value: remainIr });

                        var lcSub = irRec.getCurrentSublistSubrecord({
                            sublistId: SUBLIST_ITEM,
                            fieldId: 'landedcost'
                        });
                        lcSub.selectNewLine({ sublistId: SUBLIST_LANDED_COST_DATA });
                        lcSub.setCurrentSublistValue({ sublistId: SUBLIST_LANDED_COST_DATA, fieldId: FIELD_COST_CATEGORY, value: 37 });
                        lcSub.setCurrentSublistValue({ sublistId: SUBLIST_LANDED_COST_DATA, fieldId: FIELD_AMOUNT, value: dbFeeFtAmount[irLineNo] });
                        lcSub.commitLine({ sublistId: SUBLIST_LANDED_COST_DATA });

                        irRec.commitLine({ sublistId: SUBLIST_ITEM });
                    } else {
                        irRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: FIELD_ITEM_RECEIVE, value: false });
                        irRec.commitLine({ sublistId: SUBLIST_ITEM });
                    }
                }

                irRec.save({ enableSourcing: true, ignoreMandatoryFields: true });

                record.submitFields({
                    type: RECORD_TYPE_TRANSFER_ORDER,
                    id: id,
                    values: {
                        custbody_swc_po_db_type: 5,
                    }
                });

                result_str.data = '调拨费用分摊完成，并已生成出库单及接收单';
                return result_str;

            } catch (e) {
                log.debug('调拨费用分摊及入库失败：', e);
                result_str.data = '调拨费用分摊及入库失败,请联系管理人员';
                return result_str;
            }
        }

        /**
         * 调拨费用分摊
         */
        function onClickApproveOk_hw(id) {
            var result_str = {};

            try {

                // 分费用类型累计分摊金额
                var truckFeeMap = {}; // 卡车费
                var inFeeMap = {};    // 入仓费
                var outFeeMap = {};   // 出仓费

                var rec = record.load({
                    type: record.Type.TRANSFER_ORDER,
                    id: id,
                    isDynamic: false
                });

                rec.setValue({ fieldId: FIELD_ORDER_STATUS, value: STATUS_TRANSFER_ORDER_APPROVED });

                var feeLineCount = rec.getLineCount({ sublistId: SUBLIST_HW_TRNFRORD_LINK }) || 0;
                if (feeLineCount <= 0) {
                    result_str.data = '未找到调拨费数据';
                    return result_str;
                }

                // 历史差异逻辑按最新业务已停用，代码保留便于后续恢复。
                // function getHwHistoricalDiffMap(rec) {
                //     var loTypes = [];
                //     for (var h = 0; h < feeLineCount; h++) {
                //         var loTypeValue = rec.getSublistValue({
                //             sublistId: SUBLIST_HW_TRNFRORD_LINK,
                //             fieldId: FIELD_HW_TRNFRORD_LO_TYPE,
                //             line: h
                //         });
                //         if (loTypeValue) {
                //             loTypes.push(normalizeLoType(loTypeValue));
                //         }
                //     }
                //
                //     loTypes = Array.from(new Set(loTypes));
                //     if (!loTypes.length) return {};
                //
                //     var historySearch = search.create({
                //         type: "customrecord_swc_trnfrord_db_hw",
                //         filters: [
                //             [FIELD_HW_HISTORY_HANDLED, "is", "F"],
                //             "AND",
                //             [FIELD_COST_DIFFERENCE, "isnotempty", ""]
                //         ],
                //         columns: [
                //             search.createColumn({ name: "internalid" }),
                //             search.createColumn({ name: FIELD_HW_TRNFRORD_PAY_QS }),
                //             search.createColumn({ name: FIELD_HW_TRNFRORD_LO_TYPE }),
                //             search.createColumn({ name: FIELD_COST_DIFFERENCE })
                //         ]
                //     });
                //
                //     var historyRs = getAllResults(historySearch) || [];
                //     var historyMap = {};
                //
                //     for (var y = 0; y < historyRs.length; y++) {
                //         var historyId = historyRs[y].getValue({ name: 'internalid' });
                //         var historyLoType = normalizeLoType(historyRs[y].getText({ name: FIELD_HW_TRNFRORD_LO_TYPE }) || historyRs[y].getValue({ name: FIELD_HW_TRNFRORD_LO_TYPE }) || '');
                //         var diffAmount = round2(historyRs[y].getValue({ name: FIELD_COST_DIFFERENCE }) || 0);
                //         var historyKey = historyLoType;
                //         if (!historyLoType || loTypes.indexOf(historyKey) === -1) continue;
                //
                //         if (!historyMap[historyKey]) {
                //             historyMap[historyKey] = {
                //                 amount: 0,
                //                 ids: []
                //             };
                //         }
                //
                //         historyMap[historyKey].amount = round2(Number(historyMap[historyKey].amount || 0) + diffAmount);
                //         historyMap[historyKey].ids.push(historyId);
                //     }
                //
                //     return historyMap;
                // }

                /**
                 * 处理方法：normalizeLoType。
                 */
                function normalizeLoType(v) {
                    if (v === null || v === undefined) return '';
                    return String(v).replace(/\s/g, '');
                }

                var feeLines = [];
                var totalFee = 0;
                // 历史差异逻辑按最新业务已停用。
                // var historicalDiffMap = getHwHistoricalDiffMap(rec);
                // var historicalAppliedTypeMap = {};

                for (var f = 0; f < feeLineCount; f++) {
                    var loType = normalizeLoType(rec.getSublistText({
                        sublistId: SUBLIST_HW_TRNFRORD_LINK,
                        fieldId: FIELD_HW_TRNFRORD_LO_TYPE,
                        line: f
                    }) || rec.getSublistValue({
                        sublistId: SUBLIST_HW_TRNFRORD_LINK,
                        fieldId: FIELD_HW_TRNFRORD_LO_TYPE,
                        line: f
                    }) || '');
                    var feeAmount = round2(rec.getSublistValue({
                        sublistId: SUBLIST_HW_TRNFRORD_LINK,
                        fieldId: FIELD_HW_TRNFRORD_PO_DB_FEE,
                        line: f
                    }) || 0);
                    // 历史差异逻辑按最新业务已停用。
                    // var historicalAmount = round2(rec.getSublistValue({
                    //     sublistId: SUBLIST_HW_TRNFRORD_LINK,
                    //     fieldId: FIELD_HW_HISTORY_DIFF,
                    //     line: f
                    // }) || 0);
                    var historicalAmount = 0;
                    var historyKey = loType;

                    if (!loType) continue;

                    // 历史差异逻辑按最新业务已停用。
                    // if (historicalAmount !== 0 && historicalDiffMap[historyKey]) {
                    //     historicalAppliedTypeMap[historyKey] = true;
                    // }

                    // 子表显示值与后台口径需要一致：预估金额 + 当前行历史差异。
                    feeAmount = round2(feeAmount + historicalAmount);

                    if (!feeAmount || feeAmount === 0) continue;

                    feeLines.push({
                        feeAmount: feeAmount,
                        loType: loType,
                        historicalAmount: historicalAmount
                    });

                    totalFee += feeAmount;
                }

                if (!feeLines.length || totalFee === 0) {
                    result_str.data = '预估采购调拨费为0，无需分摊';
                    return result_str;
                }

                var subId = SUBLIST_ITEM;
                var lineCount = rec.getLineCount({ sublistId: subId });
                if (!lineCount || lineCount <= 0) {
                    result_str.data = '调拨单无明细行';
                    return result_str;
                }

                var lineInfo = [];
                var itemIds = [];

                for (var i = 0; i < lineCount; i++) {
                    var itemId = rec.getSublistValue({ sublistId: subId, fieldId: SUBLIST_ITEM, line: i });
                    if (!itemId) continue;

                    var qty = Number(rec.getSublistValue({ sublistId: subId, fieldId: FIELD_QUANTITY, line: i }) || 0);
                    if (qty < 0) qty = 0;

                    var lineNo = rec.getSublistValue({
                        sublistId: subId,
                        fieldId: 'custcol_swc_line_no',
                        line: i
                    });

                    var itemIdStr = String(itemId);
                    itemIds.push(itemIdStr);
                    lineInfo.push({
                        line: i,
                        itemId: itemIdStr,
                        qty: qty,
                        lineNo: lineNo
                    });

                    // 初始化三个 map
                    truckFeeMap[lineNo] = 0;
                    inFeeMap[lineNo] = 0;
                    outFeeMap[lineNo] = 0;
                }

                if (lineInfo.length === 0) {
                    result_str.data = '未取得有效商品行';
                    return result_str;
                }

                var uniqItemIds = Array.from(new Set(itemIds));
                if (uniqItemIds.length === 0) {
                    result_str.data = '未取得有效商品行';
                    return result_str;
                }

                log.debug('uniqItemIds', uniqItemIds);

                var inventoryitemSearchObj = search.create({
                    type: SUBLIST_ITEM,
                    filters: [
                        ["type", "anyof", "Payment", "OthCharge", "Markup", "Kit", "Subtotal", "InvtPart", "Discount", "Service", "Assembly", "Description", "Group", "NonInvtPart"],
                        "AND",
                        ["internalid", "anyof", uniqItemIds]
                    ],
                    columns: [
                        search.createColumn({ name: "custitem_swc_total_volume" }),
                        search.createColumn({ name: "internalid" })
                    ]
                });

                var itemSearchResults = getAllResults(inventoryitemSearchObj);
                var volMap = {};
                for (var r = 0; r < itemSearchResults.length; r++) {
                    var iid = String(itemSearchResults[r].getValue({ name: 'internalid' }));
                    var vpu = Number(itemSearchResults[r].getValue({ name: 'custitem_swc_total_volume' }) || 0);
                    volMap[iid] = vpu;
                }

                var totalVol = 0;
                var totalQty = 0;

                log.debug('lineInfo', lineInfo);
                log.debug('volMap', volMap);

                for (var j = 0; j < lineInfo.length; j++) {
                    var vpu2 = Number(volMap[lineInfo[j].itemId] || 0);
                    var qty2 = Number(lineInfo[j].qty || 0);
                    var volQty = vpu2 * qty2;

                    lineInfo[j].volPerUnit = vpu2;
                    lineInfo[j].volQty = volQty;

                    totalVol += volQty;
                    totalQty += qty2;
                }

                log.debug('totalVol', totalVol);
                log.debug('totalQty', totalQty);
                log.debug('feeLines', feeLines);

                /**
                 * 每条费用单独分摊
                 * FT = 2 → 按数量分摊
                 * 其他   → 按体积分摊
                 * 然后按 loType 分别累计到不同 map
                 */
                for (var x = 0; x < feeLines.length; x++) {
                    var currentFee = Number(feeLines[x].feeAmount || 0);
                    var currentLoType = normalizeLoType(feeLines[x].loType);

                    var targetMap = null;
                    if (currentLoType === '卡车费') {
                        targetMap = truckFeeMap;
                    } else if (currentLoType === '入仓费') {
                        targetMap = inFeeMap;
                    } else if (currentLoType === '出仓费') {
                        targetMap = outFeeMap;
                    } else {
                        result_str.data = '费用类型异常，无法识别：' + currentLoType;
                        return result_str;
                    }

                    // 关键点：此处不再依赖 FT，直接按费用类型判断。
                    var useQty = (currentLoType === '出仓费');

                    var allocated = 0;
                    var lastIdx = -1;

                    // 找最后一个有效分摊行，用于补差额
                    for (var k = lineInfo.length - 1; k >= 0; k--) {
                        var basisVal = useQty
                            ? Number(lineInfo[k].qty || 0)
                            : Number(lineInfo[k].volQty || 0);

                        if (basisVal > 0) {
                            lastIdx = k;
                            break;
                        }
                    }
                    if (lastIdx === -1) lastIdx = lineInfo.length - 1;

                    // 校验分摊基础
                    if (useQty) {
                        if (totalQty <= 0) {
                            result_str.data = '出仓费按数量分摊时，明细数量合计为0，无法分摊';
                            return result_str;
                        }
                    } else {
                        if (totalVol <= 0) {
                            result_str.data = '总体积为0，无法分摊';
                            return result_str;
                        }
                    }

                    for (var m = 0; m < lineInfo.length; m++) {
                        var share = 0;
                        var ratioBase = useQty
                            ? Number(lineInfo[m].qty || 0)
                            : Number(lineInfo[m].volQty || 0);
                        var totalBase = useQty ? totalQty : totalVol;

                        if (m === lastIdx) {
                            share = round2(currentFee - allocated);
                        } else {
                            share = round2((ratioBase / totalBase) * currentFee);
                            allocated = round2(allocated + share);
                        }

                        if (!share) share = 0;

                        targetMap[lineInfo[m].lineNo] = round2(
                            Number(targetMap[lineInfo[m].lineNo] || 0) + share
                        );
                    }
                }

                // 将最终累计后的分摊金额分别回写到 TO 行
                for (var z = 0; z < lineInfo.length; z++) {
                    var lineNo2 = lineInfo[z].lineNo;

                    var truckShare = round2(Number(truckFeeMap[lineNo2] || 0));
                    var inShare = round2(Number(inFeeMap[lineNo2] || 0));
                    var outShare = round2(Number(outFeeMap[lineNo2] || 0));

                    // 卡车费：当前海外仓只回写预估费用，不回写实际费用
                    rec.setSublistValue({
                        sublistId: subId,
                        fieldId: 'custcol_swc_hw_epac',
                        line: lineInfo[z].line,
                        value: truckShare
                    });

                    // 入仓费：当前海外仓只回写预估费用，不回写实际费用
                    rec.setSublistValue({
                        sublistId: subId,
                        fieldId: 'custcol_swc_hw_to_location_yg',
                        line: lineInfo[z].line,
                        value: inShare
                    });

                    // 出仓费：当前海外仓只回写预估费用，不回写实际费用
                    rec.setSublistValue({
                        sublistId: subId,
                        fieldId: 'custcol_swc_hw_fo_location_yg',
                        line: lineInfo[z].line,
                        value: outShare
                    });
                }

                rec.save({ enableSourcing: true, ignoreMandatoryFields: true });

                // 历史差异处理回写按最新业务已停用，代码保留便于后续恢复。
                // var historyValues = {};
                // historyValues[FIELD_HW_HISTORY_HANDLED] = true;
                // var allHandledIds = [];
                //
                // for (var payKey in historicalAppliedTypeMap) {
                //     if (!historicalAppliedTypeMap[payKey]) continue;
                //
                //     var handledLoType = String(payKey || '');
                //     if (!handledLoType) continue;
                //
                //     var handledSearch = search.create({
                //         type: 'customrecord_swc_trnfrord_db_hw',
                //         filters: [
                //             [FIELD_HW_HISTORY_HANDLED, 'is', 'F'],
                //             'AND',
                //             [FIELD_COST_DIFFERENCE, 'isnotempty', '']
                //         ],
                //         columns: [
                //             search.createColumn({ name: 'internalid' }),
                //             search.createColumn({ name: FIELD_HW_TRNFRORD_LO_TYPE })
                //         ]
                //     });
                //
                //     var handledRs = getAllResults(handledSearch) || [];
                //     for (var hr = 0; hr < handledRs.length; hr++) {
                //         var handledId = handledRs[hr].getValue({ name: 'internalid' });
                //         var handledRowLoType = normalizeLoType(
                //             handledRs[hr].getText({ name: FIELD_HW_TRNFRORD_LO_TYPE }) ||
                //             handledRs[hr].getValue({ name: FIELD_HW_TRNFRORD_LO_TYPE }) ||
                //             ''
                //         );
                //
                //         if (handledRowLoType === handledLoType && handledId) {
                //             allHandledIds.push(String(handledId));
                //         }
                //     }
                // }
                //
                // allHandledIds = Array.from(new Set(allHandledIds));
                // for (var hid = 0; hid < allHandledIds.length; hid++) {
                //     record.submitFields({
                //         type: 'customrecord_swc_trnfrord_db_hw',
                //         id: allHandledIds[hid],
                //         values: historyValues
                //     });
                // }

                log.debug('truckFeeMap', truckFeeMap);
                log.debug('inFeeMap', inFeeMap);
                log.debug('outFeeMap', outFeeMap);

                var toRecForShip = record.load({
                    type: record.Type.TRANSFER_ORDER,
                    id: id,
                    isDynamic: false
                });

                var remainShipTotal = 0;
                var toShipLines = toRecForShip.getLineCount({ sublistId: SUBLIST_ITEM });
                for (var s1 = 0; s1 < toShipLines; s1++) {
                    var rem = Number(toRecForShip.getSublistValue({
                        sublistId: SUBLIST_ITEM,
                        fieldId: FIELD_QUANTITY_REMAINING,
                        line: s1
                    }) || 0);
                    remainShipTotal += rem;
                }

                // IR 使用的 landed cost 金额按全部费用合计处理。
                var dbFeeFtAmount = {};
                for (var d = 0; d < lineInfo.length; d++) {
                    var ln = lineInfo[d].lineNo;
                    dbFeeFtAmount[ln] = round2(
                        Number(truckFeeMap[ln] || 0) +
                        Number(inFeeMap[ln] || 0) +
                        Number(outFeeMap[ln] || 0)
                    );
                }

                var ifRec = record.transform({
                    fromType: record.Type.TRANSFER_ORDER,
                    fromId: id,
                    toType: record.Type.ITEM_FULFILLMENT,
                    isDynamic: false
                });

                ifRec.setValue({ fieldId: 'shipstatus', value: 'C' });
                var ifLineCount = ifRec.getLineCount({ sublistId: SUBLIST_ITEM });
                log.debug('ifLineCount', ifLineCount);

                for (var a = 0; a < ifLineCount; a++) {
                    var remainIf = Number(ifRec.getSublistValue({
                        sublistId: SUBLIST_ITEM,
                        fieldId: 'quantityremaining',
                        line: a
                    }) || 0);

                    log.debug('remainIf', remainIf);

                    if (remainIf > 0) {
                        ifRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'itemship', line: a, value: true });
                        ifRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'quantity', line: a, value: remainIf });
                    } else {
                        ifRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'itemship', line: a, value: false });
                    }
                }

                ifRec.save({ enableSourcing: true, ignoreMandatoryFields: true });

                var irRec = record.transform({
                    fromType: record.Type.TRANSFER_ORDER,
                    fromId: id,
                    toType: record.Type.ITEM_RECEIPT,
                    isDynamic: true
                });

                var irLineCount = irRec.getLineCount({ sublistId: SUBLIST_ITEM });
                log.debug('irLineCount', irLineCount);

                for (var b2 = 0; b2 < irLineCount; b2++) {
                    irRec.selectLine({ sublistId: SUBLIST_ITEM, line: b2 });

                    var remainIr = Number(irRec.getCurrentSublistValue({
                        sublistId: SUBLIST_ITEM,
                        fieldId: 'quantityremaining'
                    }) || 0);

                    var irLineNo = irRec.getCurrentSublistValue({
                        sublistId: SUBLIST_ITEM,
                        fieldId: 'custcol_swc_line_no'
                    });

                    log.debug('remainIr', remainIr);
                    log.debug('irLineNo', irLineNo);

                    if (remainIr > 0) {
                        irRec.setCurrentSublistValue({
                            sublistId: SUBLIST_ITEM,
                            fieldId: FIELD_ITEM_RECEIVE,
                            value: true
                        });
                        irRec.setCurrentSublistValue({
                            sublistId: SUBLIST_ITEM,
                            fieldId: FIELD_QUANTITY,
                            value: remainIr
                        });

                        var lcSub = irRec.getCurrentSublistSubrecord({
                            sublistId: SUBLIST_ITEM,
                            fieldId: 'landedcost'
                        });

                        var truckAmt = round2(Number(truckFeeMap[irLineNo] || 0)); // 卡车费
                        var inAmt = round2(Number(inFeeMap[irLineNo] || 0));       // 入仓费
                        var outAmt = round2(Number(outFeeMap[irLineNo] || 0));     // 出仓费

                        // 卡车费：49
                        if (truckAmt !== 0) {
                            lcSub.selectNewLine({ sublistId: SUBLIST_LANDED_COST_DATA });
                            lcSub.setCurrentSublistValue({
                                sublistId: SUBLIST_LANDED_COST_DATA,
                                fieldId: FIELD_COST_CATEGORY,
                                value: 49
                            });
                            lcSub.setCurrentSublistValue({
                                sublistId: SUBLIST_LANDED_COST_DATA,
                                fieldId: FIELD_AMOUNT,
                                value: truckAmt
                            });
                            lcSub.commitLine({ sublistId: SUBLIST_LANDED_COST_DATA });
                        }

                        // 入仓费：47
                        if (inAmt !== 0) {
                            lcSub.selectNewLine({ sublistId: SUBLIST_LANDED_COST_DATA });
                            lcSub.setCurrentSublistValue({
                                sublistId: SUBLIST_LANDED_COST_DATA,
                                fieldId: FIELD_COST_CATEGORY,
                                value: 47
                            });
                            lcSub.setCurrentSublistValue({
                                sublistId: SUBLIST_LANDED_COST_DATA,
                                fieldId: FIELD_AMOUNT,
                                value: inAmt
                            });
                            lcSub.commitLine({ sublistId: SUBLIST_LANDED_COST_DATA });
                        }

                        // 出仓费：48
                        if (outAmt !== 0) {
                            lcSub.selectNewLine({ sublistId: SUBLIST_LANDED_COST_DATA });
                            lcSub.setCurrentSublistValue({
                                sublistId: SUBLIST_LANDED_COST_DATA,
                                fieldId: FIELD_COST_CATEGORY,
                                value: 48
                            });
                            lcSub.setCurrentSublistValue({
                                sublistId: SUBLIST_LANDED_COST_DATA,
                                fieldId: FIELD_AMOUNT,
                                value: outAmt
                            });
                            lcSub.commitLine({ sublistId: SUBLIST_LANDED_COST_DATA });
                        }

                        irRec.commitLine({ sublistId: SUBLIST_ITEM });
                    } else {
                        irRec.setCurrentSublistValue({
                            sublistId: SUBLIST_ITEM,
                            fieldId: FIELD_ITEM_RECEIVE,
                            value: false
                        });
                        irRec.commitLine({ sublistId: SUBLIST_ITEM });
                    }
                }

                irRec.save({ enableSourcing: true, ignoreMandatoryFields: true });

                record.submitFields({
                    type: RECORD_TYPE_TRANSFER_ORDER,
                    id: id,
                    values: {
                        custbody_swc_po_db_type: 5,
                    }
                });

                result_str.data = '调拨费用分摊完成，并已生成出库单及接收单';
                return result_str;

            } catch (e) {
                log.debug('调拨费用分摊及入库失败：', e);
                result_str.data = '调拨费用分摊及入库失败,请联系管理人员';
                return result_str;
            }
        }

        /**
         * 采购入库调拨
         */
        function onClickInOutCreate(id) {
            var result_str = {};

            try {

                var ifRec = record.transform({
                    fromType: record.Type.TRANSFER_ORDER,
                    fromId: id,
                    toType: record.Type.ITEM_FULFILLMENT,
                    isDynamic: false
                });

                ifRec.setValue({ fieldId: 'shipstatus', value: 'C' });
                var ifLineCount = ifRec.getLineCount({ sublistId: SUBLIST_ITEM });
                for (var a = 0; a < ifLineCount; a++) {
                    var remainIf = Number(ifRec.getSublistValue({
                        sublistId: SUBLIST_ITEM,
                        fieldId: 'quantityremaining',
                        line: a
                    }) || 0);

                    if (remainIf > 0) {
                        ifRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'itemship', line: a, value: true });
                        ifRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'quantity', line: a, value: remainIf });
                    } else {
                        ifRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'itemship', line: a, value: false });
                    }
                }

                ifRec.save({ enableSourcing: true, ignoreMandatoryFields: true });
                log.debug('货品履行', ifRec);

                var irRec = record.transform({
                    fromType: record.Type.TRANSFER_ORDER,
                    fromId: id,
                    toType: record.Type.ITEM_RECEIPT,
                    isDynamic: true
                });

                var irLineCount = irRec.getLineCount({ sublistId: SUBLIST_ITEM });

                for (var b2 = 0; b2 < irLineCount; b2++) {
                    irRec.selectLine({ sublistId: SUBLIST_ITEM, line: b2 });

                    var remainIr = Number(irRec.getCurrentSublistValue({
                        sublistId: SUBLIST_ITEM,
                        fieldId: FIELD_QUANTITY_REMAINING
                    }) || 0);

                    if (remainIr > 0) {
                        irRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: FIELD_ITEM_RECEIVE, value: true });
                        irRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: FIELD_QUANTITY, value: remainIr });

                        irRec.commitLine({ sublistId: SUBLIST_ITEM });
                    } else {
                        irRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: FIELD_ITEM_RECEIVE, value: false });
                        irRec.commitLine({ sublistId: SUBLIST_ITEM });
                    }
                }

                irRec.save({ enableSourcing: true, ignoreMandatoryFields: true });
                log.debug('货品收据', irRec);
                record.submitFields({
                    type: RECORD_TYPE_TRANSFER_ORDER,
                    id: id,
                    values: {
                        custbody_swc_po_db_type: 5,
                    }
                });

                result_str.data = '已生成出库单及接收单';
                return result_str;

            } catch (e) {
                log.debug('入库失败：', e);
                result_str.data = '入库失败,请联系管理人员';
                return result_str;
            }
        }

        /**
         * 采购入库调拨
         */
        function onClickInOutCreate_hw(id) {
            var result_str = {};

            try {

                var ifRec = record.transform({
                    fromType: record.Type.TRANSFER_ORDER,
                    fromId: id,
                    toType: record.Type.ITEM_FULFILLMENT,
                    isDynamic: false
                });

                ifRec.setValue({ fieldId: 'shipstatus', value: 'C' });
                var ifLineCount = ifRec.getLineCount({ sublistId: SUBLIST_ITEM });
                for (var a = 0; a < ifLineCount; a++) {
                    var remainIf = Number(ifRec.getSublistValue({
                        sublistId: SUBLIST_ITEM,
                        fieldId: 'quantityremaining',
                        line: a
                    }) || 0);

                    if (remainIf > 0) {
                        ifRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'itemship', line: a, value: true });
                        ifRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'quantity', line: a, value: remainIf });
                    } else {
                        ifRec.setSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'itemship', line: a, value: false });
                    }
                }

                ifRec.save({ enableSourcing: true, ignoreMandatoryFields: true });
                log.debug('货品履行', ifRec);

                var irRec = record.transform({
                    fromType: record.Type.TRANSFER_ORDER,
                    fromId: id,
                    toType: record.Type.ITEM_RECEIPT,
                    isDynamic: true
                });

                var irLineCount = irRec.getLineCount({ sublistId: SUBLIST_ITEM });

                for (var b2 = 0; b2 < irLineCount; b2++) {
                    irRec.selectLine({ sublistId: SUBLIST_ITEM, line: b2 });

                    var remainIr = Number(irRec.getCurrentSublistValue({
                        sublistId: SUBLIST_ITEM,
                        fieldId: FIELD_QUANTITY_REMAINING
                    }) || 0);

                    if (remainIr > 0) {
                        irRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: FIELD_ITEM_RECEIVE, value: true });
                        irRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: FIELD_QUANTITY, value: remainIr });

                        irRec.commitLine({ sublistId: SUBLIST_ITEM });
                    } else {
                        irRec.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: FIELD_ITEM_RECEIVE, value: false });
                        irRec.commitLine({ sublistId: SUBLIST_ITEM });
                    }
                }

                irRec.save({ enableSourcing: true, ignoreMandatoryFields: true });
                log.debug('货品收据', irRec);
                record.submitFields({
                    type: RECORD_TYPE_TRANSFER_ORDER,
                    id: id,
                    values: {
                        custbody_swc_po_db_type: 5,
                    }
                });

                result_str.data = '已生成出库单及接收单';
                return result_str;

            } catch (e) {
                log.debug('入库失败：', e);
                result_str.data = '入库失败,请联系管理人员';
                return result_str;
            }
        }

        /**
         * 通用按比例分摊，采用 floor + 按小数部分从大到小补尾差的方式。
         * @param {number[]} regions  每一行剩余可分摊数量
         * @param {number} newSum     这次要分摊的总数量
         * @param {number} totalRegion 第一个数组数量之和
         * @returns {number[]}        分摊后的各行数量（整数，和为 newSum）
         */
        function splitByProportion(regions, newSum, totalRegion) {
            // 计算每个区域按比例拆分的基础值
            var baseValues = [];
            var regionSum = 0;
            for (var j = 0; j < regions.length; j++) {
                // 如果该区域的原始数量为0，则基础值为0，不参与尾差分配
                if (regions[j] === 0) {
                    baseValues[j] = 0;
                } else {
                    // 按比例计算，向下取整
                    baseValues[j] = Math.floor(regions[j] * (newSum / totalRegion));
                }
                regionSum += baseValues[j];
            }

            var diff = newSum - regionSum; // 尾差

            // 创建一个数组，包含所有非零区域的索引，并按照小数部分从大到小排序
            var indices = [];
            for (var j = 0; j < regions.length; j++) {
                if (regions[j] !== 0) {
                    indices.push(j);
                }
            }

            // 计算每个区域比例的小数部分
            var decimals = [];
            for (var j = 0; j < indices.length; j++) {
                var idx = indices[j];
                decimals.push(regions[idx] * (newSum / totalRegion) - baseValues[idx]);
            }

            // 按照小数部分从大到小排序索引数组（仅非零区域）
            for (var j = 0; j < indices.length - 1; j++) {
                for (var k = j + 1; k < indices.length; k++) {
                    if (decimals[j] < decimals[k]) {
                        var temp = indices[j];
                        indices[j] = indices[k];
                        indices[k] = temp;
                        var tempDec = decimals[j];
                        decimals[j] = decimals[k];
                        decimals[k] = tempDec;
                    }
                }
            }

            // 将尾差分配给前diff个区域（每个区域加1）
            for (var j = 0; j < diff; j++) {
                var idx = indices[j];
                baseValues[idx] += 1;
            }

            return baseValues;
        }

        /**
         * 根据 item + lot/serial number 文本，找 inventorynumber internalid
         */
        function getInventoryNumberId(itemId, lotText) {
            if (isBlank(itemId) || isBlank(lotText)) return null;

            const s = search.create({
                type: 'inventorynumber',
                filters: [
                    [SUBLIST_ITEM, 'anyof', String(itemId)],
                    'AND',
                    ['inventorynumber', 'is', String(lotText)]
                ],
                columns: ['internalid']
            });

            const r = s.run().getRange({ start: 0, end: 1 });
            if (r && r.length > 0) {
                return r[0].getValue({ name: 'internalid' });
            }
            return null;
        }

        /**
         * 查询商品退税率等基础信息。
         */
        function getItemObj(items) {
            const itemSearchObj = search.create({
                type: SUBLIST_ITEM,
                filters:
                    [
                        ["internalid", "anyof", items],
                        "AND",
                        ["custitem_swc_tax_refund_rate1", "isnotempty", ""]
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "内部 ID" }),
                        search.createColumn({ name: "custitem_swc_tax_refund_rate1", label: "退税率1" }),
                    ]
            });

            var obj = {};
            var taxData = [];
            itemSearchObj.run().each(function (result) {
                obj[result.id] = {
                    rate: result.getValue({ name: "custitem_swc_tax_refund_rate1", label: "退税率1" }),
                }
                return true;
            });

            return obj
        }

        /**
         * 通用非空判断
         * @param obj
         * @returns {boolean}
         */
        function isEmpty(v) {
            switch (typeof v) {
                case 'undefined':
                    return true;
                case 'string':
                    if (v.replace(/(^[ \t\n\r]*)|([ \t\n\r]*$)/g, '').length == 0)
                        return true;
                    break;
                case 'boolean':
                    if (v.toString() == '')
                        return true;
                    break;
                case 'number':
                    if (v == 0) {
                        return true;
                    } else {
                        return false;
                    }
                    break;
                case 'object':
                    if (null === v || v.length === 0)
                        return true;
                    for (var i in v) {
                        return false;
                    }
                    return true;
            }
            return false;
        }

        /**
         * 判断值是否为 null、undefined 或空字符串。
         */
        function isBlank(v) {
            return v === null || v === undefined || v === '';
        }

        /**
         * 将税率文本或数字统一转换为可计算的小数。
         */
        function parseTaxRate(value) {
            if (typeof value === 'string' && value.endsWith('%')) {
                // 去掉百分号，转为数字并除以 100
                return parseFloat(value.slice(0, -1)) / 100;
            }
            // 如果是数字，判断是否大于 1（视为百分比整数，如 13 → 0.13）
            if (typeof value === 'number' && value > 1) {
                return value / 100;
            }
            // 其它情况（如 0.13、0 等）直接转换为数字。
            return parseFloat(value);
        }

        return {
            onRequest: onRequest
        };

    })
    ;
