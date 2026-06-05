/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *@description CG子单信息按钮，处理费用预估、分摊、实际费用分摊、费用采购等业务
 */
define(['../common/moment', "N/search", "N/record", "N/currency", '../common/SWC_CONFIG_DATA'], function (moment, search, record, NScurrency, SWC_CONFIG_DATA) {
    // 记录类型常量：集中维护常用自定义记录与标准单据类型。
    const RECORD_TYPE_CG_PLAN_ORDER = 'customrecord_swc_cg_sub_order';
    const RECORD_TYPE_CG_FIRST_LEG_COST = 'customrecord_swc_cg_first_leg_cost';
    const RECORD_TYPE_SERVICE_QUOTATION_DETAIL = 'customrecord_swc_service_quotation_detai';
    const RECORD_TYPE_COST_QUOTATION_VALUE_RULE = 'customrecord_swc_cost_quotation_value_ru';
    const RECORD_TYPE_RULE_MAPPING_TABLE = 'customrecord_swc_rule_mapping_table';
    const RECORD_TYPE_WL_PLAN_DETAIL = 'customrecord_swc_wl_plan_detail';
    const RECORD_TYPE_ACTUAL_CABINET = 'customrecord_swc_actual_cabinet';
    const RECORD_TYPE_PURCHASE_ORDER = 'purchaseorder';
    const RECORD_TYPE_TRANSFER_ORDER = 'transferorder';

    // 子列表常量：常用子列表 id 统一从这里取，避免手写字符串。
    const SUBLIST_CG_PLAN_DETAIL = 'recmachcustrecord_swc_out_sub_order';
    const SUBLIST_WL_FIRST_LEG_COST = 'recmachcustrecord_swc_cg_first_leg_cost_id';
    const SUBLIST_WL_PO_FEE = 'recmachcustrecord_swc_wl_po_fee_wl';
    const SUBLIST_TRNFRORD_LINK = 'recmachcustrecord_swc_trnfrord_link';
    const SUBLIST_HW_TRNFRORD_LINK = 'recmachcustrecord_swc_hw_trnfrord_link';
    const SUBLIST_ACTUAL_CABINET_DETAIL = 'recmachcustrecord_swc_acd_actual_cabinet';
    const SUBLIST_ITEM = 'item';
    const SUBLIST_LANDED_COST_DATA = 'landedcostdata';


    // 字段常量：优先提取高频、语义稳定、跨函数重复使用的字段。
    const FIELD_CG_TOTAL_VOLUME = 'custrecord_swc_cos_total_volume';
    const FIELD_FLC_FEE_TYPE_Z = 'custrecord_swc_cflc_fee_type_z';
    const FIELD_WL_FLC_PO_TYPE = 'custrecord_swc_wl_cflc_po_type';
    const FIELD_WL_FLC_PO = 'custrecord_swc_wl_cflc_po';
    const FIELD_WL_FLC_LOCATION = 'custrecord_swc_wl_cflc_location';
    const FIELD_WL_FLC_YG_FEE = 'custrecord_swc_wl_cflc_yg_fee';
    const FIELD_WL_FLC_YG_CURRENCY = 'custrecord_swc_wl_cflc_yg_currency';
    const FIELD_WL_FLC_SJ_FEE = 'custrecord_swc_wl_cflc_sj_fee';
    const FIELD_WL_FLC_SJ_CURRENCY = 'custrecord_swc_wl_cflc_sj_currency';

    const FIELD_AMOUNT = 'amount';
    const FIELD_BODY_FEE_AR_TYPE = 'custbody_swc_fee_ar_type';
    const FIELD_BODY_PO_DB_TYPE = 'custbody_swc_po_db_type';
    const FIELD_ORDER_STATUS = 'orderstatus';
    const FIELD_QUANTITY = 'quantity';
    const FIELD_QUANTITY_REMAINING = 'quantityremaining';
    const FIELD_ITEM_RECEIVE = 'itemreceive';
    const FIELD_COST_CATEGORY = 'costcategory';
    const FIELD_WL_PLAN_STATUS = 'custrecord_swc_cso_status';
    const FIELD_WL_TOTAL_VOLUME = 'custrecord_swc_wl_total_volume';
    const FIELD_WL_AMOUNT_TOTAL = 'custrecord_swc_wl_amount_total';
    const FIELD_WL_TC_FT_FLAG = 'custrecord_swc_wl_tc_ft_flag';
    const FIELD_WL_ACTUAL_CABINET = 'custrecord_swc_wl_actual_cabinet';
    const FIELD_MD_LOCATION = 'custrecord_swc_md_location';
    const FIELD_WL_TERMS_OF_TRADE = 'custrecord_swc_cos_terms_of_trade';
    const FIELD_WL_PO_ZT = 'custrecord_swc_cos_po_zt';
    const FIELD_WL_D_TOTAL_VOLUME = 'custrecord_swc_out_hwti';
    const FIELD_WL_D_PO_NUM = 'custrecord_swc_wl_d_po_num';
    const FIELD_WL_D_SKU = 'custrecord_swc_wl_d_sku';
    const FIELD_WL_D_CUSTOMER = 'custrecord_swc_out_store';
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


    function _get(context) {

    }

    function _post(context) {
        var request = context.request;
        var result;
        try {

            var po_id = context.bill_id;
            var action = context.action;

            if (!action) {
                throw new Error('缺少 action 参数');
            }
            if (!po_id && po_id !== 0) {
                throw new Error('缺少 bill_id 参数');
            }

            var handlers = getActionHandlers();
            var handler = handlers[action];

            if (typeof handler !== 'function') {
                throw new Error('不支持的 action：' + action);
            }

            result = handler(po_id);
            return result
        } catch (error) {
            log.error('onRequest error', error);
            return {
                code: '500',
                msg: '请求失败' + error.message
            }
        }

    }
    function getActionHandlers() {
        return {
            feeEstimatedCos: feeEstimatedCos,                // 获取头程费用
            tcFeePoCreate: tcFeePoCreate,                    // 费用类型采购订单生成
            feeApportion: feeApportion,                      // 头程预估费用分摊
            fee_ar_to: fee_ar_to,                            // 费用采购订单审批
            fee_po_sp_tc: fee_po_sp_tc,                      // 重新审批
            feeApportionSj: feeApportionSj                   // 实际头程费用分摊
        };
    }

    /**
     * 预估费用做成（按钮：只处理当前物流发运单）
     * 需求实现点：
     * 1) 同一真实排柜单号（wl_actual_cabinet）下可能有多个物流发运单（customrecord_swc_cg_sub_order）
     * 2) 每次点击按钮只分摊“当前单”，按“当前单体积 / 同柜总体积”占比分摊
     * 3) 最后一个未处理的物流发运单：用“总额 - 其它已处理单的分摊合计”做尾差闭合
     * 4) 分摊成功后不允许点击第二次：如果当前单 estimated_cost_status=1 则直接返回，不做任何事
     */
    function feeEstimatedCos(id) {
        log.debug('预估费用做成开始', id);
        var result_str = {};

        try {
            var rec = record.load({
                type: 'customrecord_swc_cg_sub_order',
                id: id,
                isDynamic: false
            });

            // var wl_actual_cabinet = rec.getValue({ fieldId: 'custrecord_swc_wl_actual_cabinet' });
            // if (!wl_actual_cabinet) {
            //     result_str.data = '请正确填写【真实排柜单号】！';
            //     return result_str;
            // }

            var md_location = rec.getValue({ fieldId: 'custrecordcustrecord_swc_cso_md_location' });
            if (!md_location) {
                result_str.data = '请正确填写【目的仓】！';
                return result_str;
            }

            // 读取合约柜/非合约柜。
            var cabinet = rec.getValue({ fieldId: 'custrecord_swc_cos_contract_cabinet1' });
            if (!cabinet) {
                result_str.data = '请正确填写【合约柜/非合约柜】！';
                return result_str;
            }

            // 读取全链路/到港。
            var full_link = rec.getValue({ fieldId: 'custrecord_swc_cos_fy_full_link' });
            if (!full_link) {
                result_str.data = '请正确填写【全链路/到港】！';
                return result_str;
            }

            // 读取货柜尺寸。
            var zg_size = rec.getValue({ fieldId: 'custrecord_swc_cos_zg_size' });
            if (!zg_size) {
                result_str.data = '请正确填写【货柜尺寸】！';
                return result_str;
            }

            // 读取起运港。
            var sta_gk = rec.getValue({ fieldId: 'custrecord_swc_cos_rm_sta_gk' });
            if (!sta_gk) {
                result_str.data = '请正确填写【起运港】！';
                return result_str;
            }

            // 读取目的港。
            var md_lc = rec.getValue({ fieldId: 'custrecord_swc_cos_md_lc' });
            if (!md_lc) {
                result_str.data = '请正确填写【目的港】！';
                return result_str;
            }

            var transferWay = rec.getValue({ fieldId: 'custrecord_swc_cos_trasfer_way' });
            var onlyDomesticFobPortFees = /*String(md_location || '') === '41'*/
                String(transferWay || '') !== '4'
                && String(transferWay || '') !== '5';
            var domesticFobAllowedFeeTypes = { '1': true, '2': true, '3': true };
            var destination_country = rec.getValue({ fieldId: 'custrecord_swc_cos_county_lsit' }) || '';
            var loading_city = rec.getValue({ fieldId: 'custrecord_swc_cos_loading_city' }) || '';

            var toltalVolume = getToltalVolume(id)
            rec.setValue({ fieldId: FIELD_CG_TOTAL_VOLUME, value: toltalVolume });
            // 当前单体积占比
            var ratio = toltalVolume / 65;

            // 2) 当前单明细承运商列表（去重）
            var eg_cost_id_sub_id = 'recmachcustrecord_swc_cg_first_leg_cost_id';
            var lineCount = rec.getLineCount({ sublistId: eg_cost_id_sub_id });

            var _ztdh = '';//主提单号

            var vendorSet = {};
            for (var x = 0; x < lineCount; x++) {
                var flc_location = rec.getSublistValue({//承运商
                    sublistId: eg_cost_id_sub_id,
                    fieldId: 'custrecord_swc_wl_cflc_location',
                    line: x
                });
                _ztdh = rec.getSublistValue({
                    sublistId: eg_cost_id_sub_id,
                    fieldId: 'custrecord_swc_out_ztdh',
                    line: x
                });
                if (flc_location) vendorSet[String(flc_location)] = true;
            }
            var vendorList = Object.keys(vendorSet);
            if (vendorList.length === 0) {
                result_str.data = '请正确填写明细【承运商】！';
                return result_str;
            }

            var tatalMapJson = {
                cabinet: cabinet,
                full_link: full_link,
                zg_size: zg_size,
                loading_city: loading_city,
                sta_gk: sta_gk,
                md_lc: md_lc,
                md_location: md_location,
                destination_country: destination_country,
                feeTypeIds: collectActiveFeeTypeIds(rec, eg_cost_id_sub_id, onlyDomesticFobPortFees, domesticFobAllowedFeeTypes),
                vendorList: vendorList
            }

            // 3) 取“整柜报价总额”（按 中类/小类/承运商 维度）
            var quoteTotalMap = getQuotationTotalMap(tatalMapJson);
            log.debug('quoteTotalMap', quoteTotalMap)
            if (!quoteTotalMap || Object.keys(quoteTotalMap).length === 0 /*|| Object.keys(quoteTotalMap).length < 3*/) {
                result_str.data = '物流商服务报价当前无匹配数据，请确认！';
                return result_str;
            }

            // 4) 取“同柜其它已处理单”的已分摊合计（排除当前单），用于最后一单尾差
            // var allocatedMap = getAllocatedEstimatedMapByCabinetExcludeCurrent(wl_actual_cabinet, String(id));

            // 5) 回写当前单：非最后=总额*ratio；最后=总额-已分摊
            for (var i = 0; i < lineCount; i++) {
                var fee_type_z = rec.getSublistValue({
                    sublistId: eg_cost_id_sub_id,
                    fieldId: 'custrecord_swc_cflc_fee_type_z',
                    line: i
                });
                var fee_type_x = rec.getSublistValue({
                    sublistId: eg_cost_id_sub_id,
                    fieldId: 'custrecord_swc_wl_cflc_fee_type_x',
                    line: i
                });
                var flc_location2 = rec.getSublistValue({
                    sublistId: eg_cost_id_sub_id,
                    fieldId: 'custrecord_swc_wl_cflc_location',
                    line: i
                });

                if (String(fee_type_z) === SWC_CONFIG_DATA.configData().FEE_TYPE_BXF) {//海运保险费
                    continue;
                } else if (String(fee_type_z) === SWC_CONFIG_DATA.configData().FEE_TYPE_JKGS && String(fee_type_x) === SWC_CONFIG_DATA.configData().FEE_TYPE_GS) {//目的国进口关税
                    continue;
                } else if (String(fee_type_z) === SWC_CONFIG_DATA.configData().FEE_TYPE_MDGQGF && String(fee_type_x) === SWC_CONFIG_DATA.configData().FEE_TYPE_MDGQGDLF) { //目的港清关代理费
                    // CG散货的清关代理费是固定费率---需系统自动带出
                    // 美国： 同一个HBL项下的子单体积求和*2 ，且最小值为25USD；
                    // 加拿大： 同一个HBL项下的子单体积求和*2*汇率+3CAD，且最小值为25USD*汇率+3CAD；
                    getDestinationCustomsClearanceAgencyFee(rec, i, toltalVolume, _ztdh)

                    continue;
                }


                var key = String(fee_type_z) + '_' + String(fee_type_x) + '_' + String(flc_location2);

                // log.debug('key', key)

                if (!quoteTotalMap.hasOwnProperty(key)) continue;
                // log.debug('quoteTotalMap[key]', quoteTotalMap[key])
                var totalPirca = toNumber(quoteTotalMap[key].pircaTotal);
                // log.debug('totalPirca', totalPirca)
                var toSet = 0;

                // if (isLast) {
                //     var already = toNumber(allocatedMap[key]);
                //     toSet = round2(totalPirca - already);
                //     if (toSet < 0) toSet = 0; // 防止被手工改坏导致负数
                // } else {
                //     toSet = round2(totalPirca * ratio);
                // }
                toSet = round2(totalPirca * ratio);
                var _currency = quoteTotalMap[key].currency || null;
                if (String(fee_type_z) === '9') { //目的港拖车费
                    //CG散货的拖车费为：整柜价格/65*单票子单体积+（整柜价格/65*单票子单体积）*0.4
                    toSet = round2(totalPirca * ratio * 1.4);
                } else if (String(fee_type_z) === SWC_CONFIG_DATA.configData().FEE_TYPE_MDGHDF && destination_country != '230') { //目的港货代费用
                    // 如果是CA，则需要将币别设置为CAD， 金额需要乘以汇率
                    var rate = NScurrency.exchangeRate({
                        source: quoteTotalMap[key].currency,
                        target: 'CAD'
                    });
                    toSet = round2(totalPirca * ratio * rate);
                    _currency = '3'
                }
                // log.debug('toSet', toSet)
                rec.setSublistValue({
                    sublistId: eg_cost_id_sub_id,
                    fieldId: 'custrecord_swc_wl_cflc_yg_fee',
                    value: toSet,
                    line: i
                });
                rec.setSublistValue({
                    sublistId: eg_cost_id_sub_id,
                    fieldId: 'custrecord_swc_wl_cflc_yg_currency',
                    value: _currency,
                    line: i
                });
                rec.setSublistValue({
                    sublistId: eg_cost_id_sub_id,
                    fieldId: 'custrecord_swc_wl_cflc_allocation_rules',
                    value: quoteTotalMap[key].allocation_rules || null,
                    line: i
                });
            }

            // 6) 处理完成后：状态置 1，禁止再次点击
            // rec.setValue({ fieldId: 'custrecord_swc_wl_tc_ft_flag', value: 1 });
            rec.setValue({ fieldId: 'custrecord_swc_cso_status', value: 2 });

            //预估海运保险费和关税
            var wlPlanOrderId = rec.getValue('custrecord_swc_cso_wl_plan_order');
            if (!wlPlanOrderId) {
                result_str.data = '没关联物流发运单，请先关联物流发运单';
                return result_str;
            } else {
                syncInitialEstimatedFeeForInsuranceAndDuty(wlPlanOrderId, rec);
            }

            // rec.save({ ignoreMandatoryFields: false });

            result_str.data = '预估费用成功';
            return result_str;

        } catch (e) {
            log.error('预估费用异常', e);
            result_str.data = '预估费用失败,请联系管理人员1';
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
                type: RECORD_TYPE_CG_PLAN_ORDER,
                id: id
            });

            // 第一步：先读取总体积。
            var total_volume = Number(rec.getValue(FIELD_CG_TOTAL_VOLUME)) || 0;

            // 第二步：金额分摊总额改为按对应 PO 明细行的含税单价汇总。
            var total_amount = 0;

            // 校验：体积分摊需要总体积
            // 金额分摊需要总金额

            // 费用类型配置：zhonglei -> 明细金额字段、币种字段
            var FEE_CFG = SWC_CONFIG_DATA.configData().FEE_CFG;

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
                if (String(zhonglei) === SWC_CONFIG_DATA.configData().FEE_TYPE_BXF || String(zhonglei) === SWC_CONFIG_DATA.configData().FEE_TYPE_JKGS) continue;

                // 分摊规则：1=体积，2=金额
                var allocationRule = rec.getSublistValue({
                    sublistId: legSubId,
                    fieldId: 'custrecord_swc_wl_cflc_allocation_rules',
                    line: i
                }) || '';

                //历史差异
                var yg_fee_cy = Number(rec.getSublistValue({
                    sublistId: legSubId,
                    fieldId: 'custrecord_swc_wl_cflc_sj_fee_cy_ls',
                    line: i
                })) || 0;

                //预估费用
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
                // if (type_fee != 4) continue;

                if (!FEE_CFG[zhonglei]) continue;
                if (allocationRule != 1 && allocationRule != 2) continue;

                var poolKey = zhonglei + '_' + allocationRule;
                var lineAmount = round2(yg_fee + yg_fee_cy);

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

                feePoolMap[poolKey].sumAmt = round2(feePoolMap[poolKey].sumAmt + lineAmount);
                if (!feePoolMap[poolKey].currency && yg_currency) {
                    feePoolMap[poolKey].currency = yg_currency;
                }

                // 处理完成后，将 po_type 更新为 5。
                rec.setSublistValue({
                    sublistId: legSubId,
                    fieldId: FIELD_WL_FLC_PO_TYPE,
                    value: 5,
                    line: i
                });
            }

            // 第四步：读取明细行数量。
            var planSubID = SUBLIST_CG_PLAN_DETAIL;
            var lineCount = rec.getLineCount({ sublistId: planSubID });
            var detailAmountMap = {};
            var poAmountIndexCache = {};

            if (lineCount <= 0) {
                result_str.data = '费用分摊失败：没有明细行';
                return result_str;
            }

            for (var detailLine = 0; detailLine < lineCount; detailLine++) {
                var line_amount = rec.getSublistValue({
                    sublistId: planSubID,
                    fieldId: 'custrecord_swc_cg_toltal_amount',
                    line: detailLine
                }) || 0;
                total_amount = round2(total_amount + line_amount);
                detailAmountMap[detailLine] = line_amount;
            }

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
                //先将历史以分配的数据清空
                var FEE_CFG_KEYS = Object.keys(FEE_CFG);
                for (let mm = 0; mm < FEE_CFG_KEYS.length; mm++) {
                    if (FEE_CFG_KEYS[mm] != 4 && FEE_CFG_KEYS[mm] != 7) {
                        rec.setSublistValue({
                            sublistId: planSubID,
                            fieldId: FEE_CFG[FEE_CFG_KEYS[mm]].amtField,
                            value: 0,
                            line: line
                        });
                    }

                }



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
                }
            }

            rec.setValue({
                fieldId: FIELD_WL_PLAN_STATUS,
                value: 6
            });

            rec.save();

            result_str.data = '费用分摊成功';

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
     * - custrecord_swc_wl_cflc_sj_fee_bill 已是多选：按行追加 vb/vc id
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

            //TODO:生产环境ID
            // 初始化费用 Item 映射。
            var feeItemByName = SWC_CONFIG_DATA.configData().feeItemByName;

            var rec = record.load({
                type: RECORD_TYPE_CG_PLAN_ORDER,
                id: id
            });

            // 防止按钮重复点击。
            var already = rec.getValue('custrecord_swc_wl_tc_zf_check_btn');
            if (already === true || already === 'T') {
                result_str.data = '已分摊/已生成差异账单，请勿重复点击。';
                return result_str;
            }

            // 读取总体积。
            var total_volume = toNumber(rec.getValue(FIELD_CG_TOTAL_VOLUME));
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
                result_str.data = '费用分摊失败：未识别成交方式(custrecord_swc_cos_terms_of_trade)';
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
            var planSubID = SUBLIST_CG_PLAN_DETAIL;
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
            log.debug('subVolMap', subVolMap)

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

            //=======================================================================================
            //添加分摊实际费用到明细行代码

            // 金额分摊总额改为按对应 PO 明细行的含税单价汇总。
            var total_amount = 0;

            var FEE_CFG = SWC_CONFIG_DATA.configData().FEE_CFG;
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
                // if (String(zhonglei) === SWC_CONFIG_DATA.configData().FEE_TYPE_BXF || String(zhonglei) === SWC_CONFIG_DATA.configData().FEE_TYPE_JKGS) continue;

                // 分摊规则：1=体积，2=金额
                var allocationRule = rec.getSublistValue({
                    sublistId: legSubId,
                    fieldId: 'custrecord_swc_wl_cflc_allocation_rules',
                    line: i
                }) || '';


                //实际费用
                var sj_fee = Number(rec.getSublistValue({
                    sublistId: legSubId,
                    fieldId: FIELD_WL_FLC_SJ_FEE,
                    line: i
                })) || 0;

                var type_fee = rec.getSublistValue({
                    sublistId: legSubId,
                    fieldId: FIELD_WL_FLC_PO_TYPE,
                    line: i
                }) || '';

                // 只处理 type_fee == 4 的数据
                // if (type_fee != 4) continue;

                if (!FEE_CFG[zhonglei]) continue;
                if (allocationRule != 1 && allocationRule != 2) continue;

                var poolKey = zhonglei + '_' + allocationRule;
                var lineAmount = round2(sj_fee);

                if (!feePoolMap[poolKey]) {
                    feePoolMap[poolKey] = {
                        zhonglei: zhonglei,
                        allocationRule: Number(allocationRule),
                        sumAmt: 0,
                        currency: '',
                        allocatedSum: 0
                    };
                }

                var sj_currency = rec.getSublistValue({
                    sublistId: legSubId,
                    fieldId: FIELD_WL_FLC_SJ_CURRENCY,
                    line: i
                }) || '';

                feePoolMap[poolKey].sumAmt = round2(feePoolMap[poolKey].sumAmt + lineAmount);
                if (!feePoolMap[poolKey].currency && sj_currency) {
                    feePoolMap[poolKey].currency = sj_currency;
                }

                // 处理完成后，将 po_type 更新为 5。
                rec.setSublistValue({
                    sublistId: legSubId,
                    fieldId: FIELD_WL_FLC_PO_TYPE,
                    value: 5,
                    line: i
                });
            }

            // 第四步：读取明细行数量。
            var planSubID = SUBLIST_CG_PLAN_DETAIL;
            var lineCount = rec.getLineCount({ sublistId: planSubID });
            var detailAmountMap = {};
            var poAmountIndexCache = {};

            if (lineCount <= 0) {
                result_str.data = '费用分摊失败：没有明细行';
                return result_str;
            }

            for (var detailLine = 0; detailLine < lineCount; detailLine++) {
                var line_amount = rec.getSublistValue({
                    sublistId: planSubID,
                    fieldId: 'custrecord_swc_cg_toltal_amount',
                    line: detailLine
                }) || 0;
                total_amount = round2(total_amount + line_amount);
                detailAmountMap[detailLine] = line_amount;
            }

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
                //先将历史以分配的数据清空
                var FEE_CFG_KEYS = Object.keys(FEE_CFG);
                for (let mm = 0; mm < FEE_CFG_KEYS.length; mm++) {
                    if (FEE_CFG_KEYS[mm] != 4 && FEE_CFG_KEYS[mm] != 7) {
                        rec.setSublistValue({
                            sublistId: planSubID,
                            fieldId: FEE_CFG[FEE_CFG_KEYS[mm]].amtField,
                            value: 0,
                            line: line
                        });
                    }

                }



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
                }
            }
            //=======================================================================================

            for (var i = 0; i < legLineCount; i++) {
                var zhonglei = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_FLC_FEE_TYPE_Z, line: i });
                var type_fee = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_PO_TYPE, line: i }) || '';
                var carrierId = rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_LOCATION, line: i }) || '';

                if (!carrierId || !zhonglei) continue;
                // if (String(type_fee) !== '5') continue;

                var sj = toNumber(rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_cflc_sj_fee', line: i }));
                var yg = toNumber(rec.getSublistValue({ sublistId: legSubId, fieldId: FIELD_WL_FLC_YG_FEE, line: i }));

                // 差异金额按“实际 - 预估”计算。
                var cy = round2(sj - yg);

                // 回写差异金额
                rec.setSublistValue({
                    sublistId: legSubId,
                    fieldId: 'custrecord_swc_wl_cflc_sj_fee_cy',
                    value: cy,
                    line: i
                });

                if (cy === 0) continue;

                // 承担方判定（terms_of_trade映射出来的值）
                var bearer = cdMap[String(zhonglei)]; // '2'/'3'/...
                var itemId = feeItemByName[String(zhonglei)];
                if (!itemId) continue;

                var carrierKey = String(carrierId);
                var orderType2 = (String(zhonglei) === SWC_CONFIG_DATA.configData().FEE_TYPE_RKF) ? 8 : 10;//TODO:生产环境ID
                if (!billJson[carrierKey]) billJson[carrierKey] = {};

                // === 国内承担：不按店铺拆分，全部进 domesticSub（如果没有 domesticSub，就用 '__NO_SUB__'） ===
                if (String(bearer) === '3') {
                    var subKey = (domesticSub ? String(domesticSub) : '__NO_SUB__') + '|' + String(orderType2);
                    if (!billJson[carrierKey][subKey]) {
                        billJson[carrierKey][subKey] = { VendorBill: [], VendorCredit: [], lineIds: [], subsidiaryId: domesticSub ? Number(domesticSub) : null, orderType2: orderType2 };
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

                        var groupKey = String(subIdKey) + '|' + String(orderType2);
                        if (!billJson[carrierKey][groupKey]) {
                            billJson[carrierKey][groupKey] = { VendorBill: [], VendorCredit: [], lineIds: [], subsidiaryId: Number(subIdKey) || null, orderType2: orderType2 };
                        }
                        if (part > 0) billJson[carrierKey][groupKey].VendorBill.push({ item: itemId, amount: part, lineId: i, orderType2: orderType2 });
                        else billJson[carrierKey][groupKey].VendorCredit.push({ item: itemId, amount: part, lineId: i, orderType2: orderType2 });
                        billJson[carrierKey][groupKey].lineIds.push(i);
                    }
                } else {
                    // 其他承担方：同样退化为单组
                    var subKey2 = '__NO_SUB__|' + String(orderType2);
                    if (!billJson[carrierKey][subKey2]) {
                        billJson[carrierKey][subKey2] = { VendorBill: [], VendorCredit: [], lineIds: [], subsidiaryId: null, orderType2: orderType2 };
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

                    // 创建供应商账单。
                    if (group.VendorBill && group.VendorBill.length > 0) {
                        var vbId = createVendorBill3(vendorId, group.VendorBill, subsidiaryId, orderType2);
                        if (vbId) {
                            createdBillIds.push(String(vbId));
                            writeBackBillsToLines(
                                rec,
                                SUBLIST_WL_FIRST_LEG_COST,
                                'custrecord_swc_wl_cflc_sj_fee_bill',   // 多选字段
                                vbId,
                                group.VendorBill
                            );
                        }
                    }

                    // 创建供应商贷项通知单。
                    if (group.VendorCredit && group.VendorCredit.length > 0) {
                        var vcId = createVendorCredit3(vendorId, group.VendorCredit, subsidiaryId, orderType2);
                        if (vcId) {
                            createdCreditIds.push(String(vcId));
                            writeBackCreditsToLines(
                                rec,
                                SUBLIST_WL_FIRST_LEG_COST,
                                'custrecord_swc_wl_cflc_sj_fee_bill',   // 多选字段
                                vcId,
                                group.VendorCredit
                            );

                        }
                    }
                }
            }

            rec.setValue({ fieldId: 'custrecord_swc_cso_status', value: 8 });
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
     * 下面两个方法延续现有的 createVendorBill3 / createVendorCredit3 创建逻辑。
     * 当前实现支持可选 subsidiaryId 参数，内部核心处理保持兼容。
     * data: [{item:xxx, amount:yyy, lineId:i}, ...]
     */
    function createVendorBill3(vendorId, data, subsidiaryId, orderType2) {
        var vendorbillRecord = record.create({ type: 'vendorbill', isDynamic: true });
        vendorbillRecord.setValue({ fieldId: 'entity', value: vendorId });
        applyVendorPaymentTerms(vendorbillRecord, vendorId);
        if (orderType2) {
            vendorbillRecord.setValue({ fieldId: 'custbody_swc_order_type2', value: orderType2 });
        }

        for (var i = 0; i < data.length; i++) {
            var linejson = data[i];
            var amt = Number(linejson.amount) || 0;
            if (!linejson.item || amt <= 0) continue;

            vendorbillRecord.selectNewLine({ sublistId: SUBLIST_ITEM });
            vendorbillRecord.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: SUBLIST_ITEM, value: linejson.item });
            vendorbillRecord.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'quantity', value: 1 });
            vendorbillRecord.setCurrentSublistValue({ sublistId: SUBLIST_ITEM, fieldId: 'rate', value: amt });
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_bill_writeoff_amount', value: 0 }); //已预付总金额
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_bill_unsettled_amount', value: amt });//待支付金额
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_notnotused', value: amt });//剩余金额
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_alreadyused', value: 0 });//已支付金额
            vendorbillRecord.commitLine({ sublistId: SUBLIST_ITEM });
        }

        return vendorbillRecord.save({ ignoreMandatoryFields: false });
    }

    /**
     * 根据费用明细创建供应商贷项通知单。
     */
    function createVendorCredit3(vendorId, data, subsidiaryId, orderType2) {
        var vendorcreditRecord = record.create({ type: 'vendorcredit', isDynamic: true });
        vendorcreditRecord.setValue({ fieldId: 'entity', value: vendorId });
        applyVendorPaymentTerms(vendorcreditRecord, vendorId);
        if (orderType2) {
            vendorcreditRecord.setValue({ fieldId: 'custbody_swc_order_type2', value: orderType2 });
        }

        if (subsidiaryId && vendorcreditRecord.getField({ fieldId: 'subsidiary' })) {
            vendorcreditRecord.setValue({ fieldId: 'subsidiary', value: subsidiaryId });
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
            var wlID = poRec.getValue('custbody_swc_cg_sub_order_no'); // 物流发运单
            var fee_po_no = poRec.getValue('custbody_swc_fee_po_no'); // 费用信息记录ID（feeType=2用）

            // 通过
            if (type === 2) {

                if (feeType == 2) {
                    record.transform({
                        fromType: record.Type.PURCHASE_ORDER,
                        fromId: poId,
                        toType: record.Type.VENDOR_BILL,
                        isDynamic: true
                    }).save({ ignoreMandatoryFields: true });

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
                            type: RECORD_TYPE_CG_PLAN_ORDER,
                            id: wlID,
                            isDynamic: false
                        });

                        var leg_cost_id = SUBLIST_WL_FIRST_LEG_COST;
                        var line = wlrec.getLineCount({ sublistId: leg_cost_id });
                        var fpo_typeChecks = true;

                        for (var r = 0; r < line; r++) {
                            var wl_cflc_po = wlrec.getSublistValue({ sublistId: leg_cost_id, fieldId: FIELD_WL_FLC_PO, line: r });
                            var fpo_types = wlrec.getSublistValue({ sublistId: leg_cost_id, fieldId: FIELD_WL_FLC_PO_TYPE, line: r });

                            log.debug('wl_cflc_po', wl_cflc_po)
                            if (wl_cflc_po.indexOf(poId) != -1) {
                                wlrec.setSublistValue({ sublistId: leg_cost_id, fieldId: FIELD_WL_FLC_PO_TYPE, value: 4, line: r });
                            } else if (fpo_types && Number(fpo_types) !== 4) {
                                fpo_typeChecks = false;
                            }
                        }

                        if (fpo_typeChecks) {
                            wlrec.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 4 });
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
                            type: RECORD_TYPE_CG_PLAN_ORDER,
                            id: wlID,
                            isDynamic: false
                        });

                        var leg_cost_id2 = SUBLIST_WL_FIRST_LEG_COST;
                        var line2 = wlrec2.getLineCount({ sublistId: leg_cost_id2 });

                        for (var r2 = 0; r2 < line2; r2++) {
                            var wl_cflc_po2 = wlrec2.getSublistValue({ sublistId: leg_cost_id2, fieldId: FIELD_WL_FLC_PO, line: r2 });
                            if (String(wl_cflc_po2) === String(poId)) {
                                wlrec2.setSublistValue({ sublistId: leg_cost_id2, fieldId: FIELD_WL_FLC_PO_TYPE, value: 3, line: r2 });
                            }
                        }

                        wlrec2.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 5 });
                        wlrec2.save({ enableSourcing: false, ignoreMandatoryFields: true });
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
     * 头程费用类型采购订单，重新审批
     * @param id
     */
    function fee_po_sp_tc(id) {
        var result_str = {};
        //TODO:生产环境ID
        // 费用中类 -> 费用Item internalId
        var feeItemByName = SWC_CONFIG_DATA.configData().feeItemByName;

        var po_fee_wl_sub_id = 'recmachcustrecord_swc_cg_first_leg_cost_id';
        var itemSublistId = 'item';

        function toNumber(v) {
            var n = Number(v);
            return isNaN(n) ? 0 : n;
        }

        try {
            var rec = record.load({
                type: 'customrecord_swc_cg_sub_order',
                id: id
            });

            var lineCount = rec.getLineCount(po_fee_wl_sub_id);

            var poSpTcJson = {};

            for (var x = 0; x < lineCount; x++) {

                var fee_fpo_type = rec.getSublistValue({
                    sublistId: po_fee_wl_sub_id,
                    fieldId: 'custrecord_swc_wl_cflc_po_type',
                    line: x
                });

                if (String(fee_fpo_type) !== '3') continue;

                var fee_fpo_id = rec.getSublistValue({
                    sublistId: po_fee_wl_sub_id,
                    fieldId: 'custrecord_swc_wl_cflc_po',
                    line: x
                });

                var fee_type_z = rec.getSublistValue({
                    sublistId: po_fee_wl_sub_id,
                    fieldId: 'custrecord_swc_cflc_fee_type_z',
                    line: x
                });

                var po_fee_yg = rec.getSublistValue({
                    sublistId: po_fee_wl_sub_id,
                    fieldId: 'custrecord_swc_wl_cflc_yg_fee',
                    line: x
                });

                if (!fee_fpo_id || !fee_type_z) continue;

                if (!poSpTcJson[fee_fpo_id]) poSpTcJson[fee_fpo_id] = {};

                //需要累加
                poSpTcJson[fee_fpo_id][String(fee_type_z)] = round2(toNumber(poSpTcJson[fee_fpo_id][String(fee_type_z)]) + toNumber(po_fee_yg));

                rec.setSublistValue({
                    sublistId: po_fee_wl_sub_id,
                    fieldId: 'custrecord_swc_wl_cflc_po_type',
                    value: 1,
                    line: x
                });
            }

            if (Object.keys(poSpTcJson).length === 0) {
                result_str.data = '当前数据中，没有需要重新审核的数据！请确认！';
                return result_str;
            }

            log.debug('poSpTcJson', poSpTcJson);
            for (var poIds in poSpTcJson) {
                if (!poSpTcJson.hasOwnProperty(poIds)) continue;
                log.debug('poIds', poIds);
                var poIdArray = poIds.split(',')
                for (var m = 0; m < poIdArray.length; m++) {
                    var poId = poIdArray[m];
                    var poRec = record.load({
                        type: 'purchaseorder',
                        id: poId,
                        isDynamic: false
                    });

                    var cnt = poRec.getLineCount({ sublistId: itemSublistId });

                    var itemLineMap = {};
                    for (var i = 0; i < cnt; i++) {
                        var itemId = poRec.getSublistValue({
                            sublistId: itemSublistId,
                            fieldId: 'item',
                            line: i
                        });
                        if (itemId && itemLineMap[itemId] === undefined) {
                            itemLineMap[itemId] = i;
                        }
                    }

                    var itemLineData = poSpTcJson[poIds];

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
                            fieldId: 'amount',
                            line: lineIdx,
                            value: toNumber(itemLineData[feeType])
                        });
                    }
                    //TODO:这里需不需要考虑，部分采购单已经审批通过的情况，审批通过的不再修改状态
                    poRec.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: 1 });
                    poRec.save({ enableSourcing: true, ignoreMandatoryFields: false });

                }


            }

            rec.setValue({ fieldId: 'custrecord_swc_cso_status', value: 3 });
            rec.save();

            result_str.data = '重新审批提交成功！';
            return result_str;

        } catch (e) {
            log.error('重新审批提交异常', e);
            result_str.data = '重新审批提交异常,请联系管理人员';
            return result_str;
        }
    }

    function getDestinationCustomsClearanceAgencyFee(rec, i, v, ztdh) {
        var toltalVolume = 0;
        if (ztdh) {//如果有主提单号，则搜索该主提单号下所有保税仓出库明细货品的总体积
            search.create({
                type: "customrecord_swc_platform_loc_out_info",
                filters: [
                    ["custrecord_swc_out_ztdh", "is", ztdh]
                ],
                columns: [
                    { name: 'formulanumeric', formula: "NVL({custrecord_swc_out_sku.custitem_swc_total_volume},0)*{custrecord_swc_out_quantity}", summary: 'SUM' }
                ]
            }).run().each(function (result) {
                log.debug('主提单号总体积' + ztdh, result)
                toltalVolume = result.getValue(result.columns[0])
                return false;
            })
        } else {//否则总体积等于本子单号的体积
            toltalVolume = v;
        }
        // CG散货的清关代理费是固定费率---需系统自动带出
        // 美国： 同一个HBL项下的子单体积求和*2 ，且最小值为25USD；
        // 加拿大： 同一个HBL项下的子单体积求和*2*汇率+3CAD，且最小值为25USD*汇率+3CAD；
        var countyLsit = rec.getValue('custrecord_swc_cos_county_lsit');
        var countyLsitText = rec.getText({ fieldId: 'custrecord_swc_cos_county_lsit' });
        var countryCode = normalizeCountryCode(countyLsit, countyLsitText);
        log.debug('countryCode', countryCode)
        var _currency = getDutyCurrencyInternalIdByCountryCode(countryCode);

        var toltalAmount = toltalVolume * 2 > 25 ? toltalVolume * 2 : 25;
        if (countyLsit != '230') {
            var rate = NScurrency.exchangeRate({
                source: 'USD',
                target: _currency
            });
            toltalAmount = toltalAmount * rate;
        }
        var eg_cost_id_sub_id = 'recmachcustrecord_swc_cg_first_leg_cost_id';
        var setAmount = toltalVolume > 0 ? round2(toltalAmount * v / toltalVolume) : 0;
        rec.setSublistValue({
            sublistId: eg_cost_id_sub_id,
            fieldId: 'custrecord_swc_wl_cflc_yg_fee',
            value: setAmount,
            line: i
        });
        rec.setSublistValue({
            sublistId: eg_cost_id_sub_id,
            fieldId: 'custrecord_swc_wl_cflc_yg_currency',
            value: _currency,
            line: i
        });
        rec.setSublistValue({
            sublistId: eg_cost_id_sub_id,
            fieldId: 'custrecord_swc_wl_cflc_allocation_rules',
            value: '1',
            line: i
        });
    }

    function collectActiveFeeTypeIds(rec, sublistId, onlyDomesticFobPortFees, domesticFobAllowedFeeTypes) {
        log.debug('onlyDomesticFobPortFees', onlyDomesticFobPortFees)
        log.debug('domesticFobAllowedFeeTypes', domesticFobAllowedFeeTypes)
        var feeTypeMap = {};
        var lineCount = rec.getLineCount({ sublistId: sublistId }) || 0;
        for (var i = 0; i < lineCount; i++) {
            var feeTypeId = rec.getSublistValue({
                sublistId: sublistId,
                fieldId: FIELD_FLC_FEE_TYPE_Z,
                line: i
            }) || '';
            feeTypeId = String(feeTypeId);
            if (!feeTypeId || feeTypeId === SWC_CONFIG_DATA.configData().FEE_TYPE_BXF || feeTypeId === SWC_CONFIG_DATA.configData().FEE_TYPE_JKGS) continue;
            if (onlyDomesticFobPortFees && domesticFobAllowedFeeTypes[feeTypeId]) continue;
            feeTypeMap[feeTypeId] = true;
        }
        return Object.keys(feeTypeMap);
    }

    /**
     * 报价总额 Map：按 中类/小类/承运商 维度
     * key = cost_medium + '_' + rm_cost_s + '_' + logistics_provider
     * 注意：这里返回的是“整柜总额 pircaTotal”，不乘占比
     */
    function getQuotationTotalMap(tatalMapJson) {
        log.debug('tatalMapJson', tatalMapJson)

        var cabinet = tatalMapJson.cabinet;
        var full_link = tatalMapJson.full_link;
        var zg_size = tatalMapJson.zg_size;
        var loading_city = tatalMapJson.loading_city;
        var sta_gk = tatalMapJson.sta_gk;
        var md_lc = tatalMapJson.md_lc;
        var md_location = tatalMapJson.md_location;
        var destination_country = tatalMapJson.destination_country;
        var feeTypeIds = tatalMapJson.feeTypeIds || [];
        var vendorList = tatalMapJson.vendorList;
        log.debug('feeTypeIds', feeTypeIds)

        var map = {};

        /**
         * 统一处理检索结果，保证原有输出逻辑不变
         * @param rs
         */
        function handleResults(rs) {
            rs = rs || [];
            for (var i = 0; i < rs.length; i++) {
                log.debug('rs' + i, rs)
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

        // 旧版本获取预估费用代码
        // // 第一步：执行常规报价检索，排除费用中类 101。
        // var s = search.create({
        //     type: RECORD_TYPE_SERVICE_QUOTATION_DETAIL,
        //     filters: [
        //         ["custrecord_swc_lpd_lp.custrecord_swc_lp_start_date", "onorbefore", "today"],
        //         "AND",
        //         ["custrecord_swc_lpd_lp.custrecord_swc_lp_end_date", "onorafter", "today"],
        //         "AND",
        //         ["custrecord_swc_lpd_lp.custrecord_swc_lp_logistics_provider", "anyof", vendorList],
        //         "AND",
        //         ["custrecord_swc_lpd_lp.custrecord_swc_lp_to_location", "anyof", md_location],
        //         "AND",
        //         ["custrecord_swc_lpd_lp.custrecord_swc_container_size", "anyof", zg_size],
        //         "AND",
        //         ["custrecord_swc_lpd_lp.custrecord_swc_destination_port", "anyof", md_lc],
        //         "AND",
        //         ["custrecord_swc_lpd_lp.custrecord_swc_contract_cabinet", "anyof", cabinet],
        //         "AND",
        //         ["custrecord_swc_lpd_lp.custrecord_swc_full_link", "anyof", full_link],
        //         "AND",
        //         ["custrecord_swc_lpd_lp.custrecord_swc_port_of_loading", "anyof", sta_gk],
        //         "AND",
        //         ["custrecord_swc_lp_cost_medium", "noneof", "101"], // 排除 101
        //         "AND",
        //         ["custrecord_swc_lp_cost_medium.custrecord_swc_cost_cn_fob", "anyof", "2"] // 海外公司承担的
        //     ],
        //     columns: [
        //         search.createColumn({ name: "custrecord_swc_lp_cost_medium" }),
        //         search.createColumn({ name: "custrecord_swc_lp_rm_cost_s" }),
        //         search.createColumn({ name: "custrecord_swc_lp_allocation_rules" }),
        //         search.createColumn({ name: "custrecord_swc_lp_pirca" }),
        //         search.createColumn({ name: "custrecord_swc_lp_currency" }),
        //         search.createColumn({
        //             name: "custrecord_swc_lp_logistics_provider",
        //             join: "CUSTRECORD_SWC_LPD_LP"
        //         })
        //     ]
        // });

        // var rs = getAllResults(s) || [];
        // handleResults(rs);
        // //如果第一步没搜索到报价，直接返回报错
        // if (rs.length == 0) {
        //     return map;
        // }

        // // 第二步：补充检索费用中类 101，仅按目的仓和柜型匹配。
        // var s101 = search.create({
        //     type: RECORD_TYPE_SERVICE_QUOTATION_DETAIL,
        //     filters: [
        //         ["custrecord_swc_lpd_lp.custrecord_swc_lp_to_location", "anyof", md_location],
        //         "AND",
        //         ["custrecord_swc_lpd_lp.custrecord_swc_contract_cabinet", "anyof", cabinet],
        //         "AND",
        //         ["custrecord_swc_lp_cost_medium", "anyof", "101"]
        //     ],
        //     columns: [
        //         search.createColumn({ name: "custrecord_swc_lp_cost_medium" }),
        //         search.createColumn({ name: "custrecord_swc_lp_rm_cost_s" }),
        //         search.createColumn({ name: "custrecord_swc_lp_allocation_rules" }),
        //         search.createColumn({ name: "custrecord_swc_lp_pirca" }),
        //         search.createColumn({ name: "custrecord_swc_lp_currency" }),
        //         search.createColumn({
        //             name: "custrecord_swc_lp_logistics_provider",
        //             join: "CUSTRECORD_SWC_LPD_LP"
        //         })
        //     ]
        // });

        // var rs101 = getAllResults(s101) || [];
        // handleResults(rs101);
        // log.debug('map', map)

        if (!vendorList || vendorList.length === 0 || !feeTypeIds || feeTypeIds.length === 0) {
            return map;
        }

        var ruleConfigMap = getQuotationRuleConfigMap(feeTypeIds);
        feeTypeIds.forEach(function (feeTypeId) {
            var ruleConfig = ruleConfigMap[String(feeTypeId)];
            if (!ruleConfig) return;
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

            var quotationSearch = search.create({
                type: RECORD_TYPE_SERVICE_QUOTATION_DETAIL,
                filters: buildQuotationFiltersByRule({
                    feeTypeId: feeTypeId,
                    vendorList: vendorList,
                    cabinet: cabinet,
                    full_link: full_link,
                    zg_size: zg_size,
                    loading_city: loading_city,
                    sta_gk: sta_gk,
                    md_lc: md_lc,
                    md_location: md_location,
                    destination_country: destination_country
                }, ruleConfig),
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
            handleResults(getAllResults(quotationSearch) || []);
        });

        return map;
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

    function toCheckboxBool(value) {
        return value === true || value === 'T' || value === 'true';
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

    function buildQuotationFiltersByRule(context, ruleConfig) {
        var filters = [
            ["custrecord_swc_lpd_lp.custrecord_swc_lp_start_date", "onorbefore", "today"],
            "AND",
            ["custrecord_swc_lpd_lp.custrecord_swc_lp_end_date", "onorafter", "today"],
            "AND",
            ["custrecord_swc_lpd_lp.custrecord_swc_lp_logistics_provider", "anyof", context.vendorList],
            "AND",
            ["custrecord_swc_lp_cost_medium", "anyof", context.feeTypeId]
        ];

        appendDynamicQuotationFilter(filters, ruleConfig.destinationWarehouse, "custrecord_swc_lpd_lp.custrecord_swc_lp_to_location", context.md_location);
        appendDynamicQuotationFilter(filters, ruleConfig.containerSize, "custrecord_swc_lpd_lp.custrecord_swc_container_size", context.zg_size);
        appendDynamicQuotationFilter(filters, ruleConfig.portOfDestination, "custrecord_swc_lpd_lp.custrecord_swc_destination_port", context.md_lc);
        appendDynamicQuotationFilter(filters, ruleConfig.contractCabinet, "custrecord_swc_lpd_lp.custrecord_swc_contract_cabinet", context.cabinet);
        appendDynamicQuotationFilter(filters, ruleConfig.fullLink, "custrecord_swc_lpd_lp.custrecord_swc_full_link", context.full_link);
        appendDynamicQuotationFilter(filters, ruleConfig.portOfLoading, "custrecord_swc_lpd_lp.custrecord_swc_port_of_loading", context.sta_gk);
        appendDynamicQuotationFilter(filters, ruleConfig.loadingCity, "custrecord_swc_lpd_lp.custrecord_swc_bj_loading_city", context.loading_city);
        // 国家维度后续补充：当前 customrecord_swc_service_quotation 上暂无对应国家字段。
        // appendDynamicQuotationFilter(filters, ruleConfig.country, "custrecord_swc_lpd_lp.custrecord_swc_country", context.destination_country);

        return filters;
    }

    function appendDynamicQuotationFilter(filters, enabled, fieldId, value) {
        if (!enabled) return;
        filters.push("AND");
        filters.push([fieldId, "anyof", value]);
    }

    /**
     * 获取CG子单总体积
     * @param id CG子单信息ID
     */
    function getToltalVolume(id) {
        var toltalVolume = 0;
        search.create({
            type: "customrecord_swc_platform_loc_out_info",
            filters: [
                ["custrecord_swc_out_sub_order", "is", id]
            ],
            columns: [
                { name: 'formulanumeric', formula: "NVL({custrecord_swc_out_sku.custitem_swc_total_volume},0)*{custrecord_swc_out_quantity}", summary: 'SUM' }
            ]
        }).run().each(function (result) {
            log.debug('总体积', result)
            toltalVolume = result.getValue(result.columns[0])
            return false;
        })
        return toltalVolume
    }

    /**
     * 预估费用生成采购账单
     * @param {number} id CG子单ID
     * @returns 
     */
    function tcFeePoCreate(id) {
        var result_str = {};

        try {
            var rec = record.load({
                type: 'customrecord_swc_cg_sub_order',
                id: id,
                isDynamic: false
            });

            // ------------------------
            // 工具函数
            // ------------------------
            function toNumber(v) {
                if (v === null || v === undefined || v === '') return 0;
                var n = Number(v);
                return isFinite(n) ? n : 0;
            }
            function round2(n) {
                n = toNumber(n);
                return Math.round((n + Number.EPSILON) * 100) / 100;
            }
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
            var totFieldId = 'custrecord_swc_cost_cn_fob';
            if (terms_of_trade == 1) totFieldId = 'custrecord_swc_cost_exw';          // EXW
            else if (terms_of_trade == 2) totFieldId = 'custrecord_swc_cost_cn_fob';  // 国内FOB
            else if (terms_of_trade == 3) totFieldId = 'custrecord_swc_cost_ddp';     // DDP
            else if (terms_of_trade == 4) totFieldId = 'custrecord_swc_cost_ddu';     // DDU
            else if (terms_of_trade == 5) totFieldId = 'custrecord_swc_cost_hw_fob';  // 海外FOB

            if (!totFieldId) {
                result_str.data = '未识别的成交方式（terms_of_trade），请确认。';
                return result_str;
            }

            //TODO:生产环境ID，这应该取配置表里的
            // 成本类别 -> 费用Item
            var feeItemByName = SWC_CONFIG_DATA.configData().feeItemByName;

            // ------------------------
            // 2) 规则表：中类 -> 承担方(2海外/3国内)
            // ------------------------
            var cdMap = {}; // feeTypeZ -> '2'/'3'
            var ruleSearch = search.create({
                type: "customrecord_swc_rule_mapping_table",
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

            log.debug('cdMap', cdMap);

            // ------------------------
            // 3) 汇总 first leg cost：按承运商 + 中类 汇总金额
            //    同时记录需要回写PO的行（以及按承运商分组回写）
            // ------------------------
            var legSubId = 'recmachcustrecord_swc_cg_first_leg_cost_id';
            var legLineCount = rec.getLineCount({ sublistId: legSubId });

            var cnPoJson = {}; // { carrierId: { feeTypeZ: sumAmt } }
            var hwPoJson = {}; // { carrierId: { feeTypeZ: sumAmt } }

            // carrier -> [lineIndex,...] （用于更精确回写）
            var carrierLegLinesMap = {};

            for (var i = 0; i < legLineCount; i++) {
                var carrierId = rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_cflc_location', line: i });
                var feeTypeZ = rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_cflc_fee_type_z', line: i });
                var ygFee = toNumber(rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_cflc_yg_fee', line: i }));

                if (!carrierId || !feeTypeZ || ygFee === 0) continue;

                var bearer = cdMap[String(feeTypeZ)]; // '2'海外 or '3'国内
                if (bearer !== '2' && bearer !== '3') continue;

                carrierId = String(carrierId);
                feeTypeZ = String(feeTypeZ);

                if (!carrierLegLinesMap[carrierId]) carrierLegLinesMap[carrierId] = [];
                carrierLegLinesMap[carrierId].push(i);

                if (bearer === '2') {
                    if (!hwPoJson[carrierId]) hwPoJson[carrierId] = {};
                    hwPoJson[carrierId][feeTypeZ] = round2(toNumber(hwPoJson[carrierId][feeTypeZ]) + ygFee);
                } else {
                    //CG子单没有国内承担费用，不用创建国内费用PO
                    // if (!cnPoJson[carrierId]) cnPoJson[carrierId] = {};
                    // cnPoJson[carrierId][feeTypeZ] = round2(toNumber(cnPoJson[carrierId][feeTypeZ]) + ygFee);
                }
            }

            // ------------------------
            // 4) 创建PO通用函数
            // ------------------------
            function createFeePO(vendorId, subsidiaryId, feeMap, wlPlanId) {
                var poRec = record.create({ type: record.Type.PURCHASE_ORDER, isDynamic: true });
                //TODO:生产环境ID
                poRec.setValue({ fieldId: 'customform', value: SWC_CONFIG_DATA.configData().FORM_PO_FEE });              // 采购订单_费用类
                poRec.setValue({ fieldId: 'entity', value: vendorId });             // 供应商=承运商
                poRec.setValue({ fieldId: 'subsidiary', value: subsidiaryId });     // 子公司
                poRec.setValue({ fieldId: 'custbody_swc_cqdd_zq', value: 1 });       // 账期TODO
                poRec.setValue({ fieldId: 'custbody_swc_cg_sub_order_no', value: wlPlanId });  // 关联物流发运单
                poRec.setValue({ fieldId: 'custbody_swc_po_fee', value: 3 });           // 费用标识
                poRec.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: 1 });  // 等待审批
                poRec.setValue({ fieldId: 'custbody_swc_order_type2', value: 3 });
                //搜索供应商付款条件
                search.create({
                    type: "vendor",
                    filters:
                        [
                            ["internalid", "is", vendorId]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "custentity_swc_payment_terms", label: "Terms" })
                        ]
                }).run().each(function (a) {
                    var terms = a.getValue('custentity_swc_payment_terms');
                    if (terms) {
                        var termsArray = terms.split(',');
                        log.debug('termsArray', termsArray)
                        poRec.setValue({ fieldId: 'custbody_swc_vendor_payment_terms', value: termsArray[0] });
                    } else {
                        log.debug('没有terms')
                    }
                    return false
                });

                var feeKeys = Object.keys(feeMap || {});
                for (var k = 0; k < feeKeys.length; k++) {
                    var feeType = feeKeys[k];
                    var amt = round2(toNumber(feeMap[feeType]));
                    if (amt === 0) continue;

                    var itemId = feeItemByName[String(feeType)];
                    if (!itemId) continue;

                    poRec.selectNewLine({ sublistId: 'item' });
                    poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemId });
                    poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                    poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: amt });
                    poRec.commitLine({ sublistId: 'item' });
                }

                return poRec.save({ ignoreMandatoryFields: true });
            }

            // ------------------------
            // 5) 国内承担：每个承运商1张PO（子公司来自头字段）
            // ------------------------
            if (Object.keys(cnPoJson).length > 0) {
                var cnSub = rec.getValue('custrecord_swc_wl_po_zt');//TODO:物流发运单上的采购主体
                var cnCarriers = Object.keys(cnPoJson);

                for (var c = 0; c < cnCarriers.length; c++) {
                    var carrierCn = cnCarriers[c];
                    var poIdCn = createFeePO(carrierCn, cnSub, cnPoJson[carrierCn], id);
                    createdPoIds.push(String(poIdCn));
                }
            }

            // ------------------------
            // 6) 海外承担
            //   - 美国(230)：每个承运商1张PO（子公司固定77）
            //   - 非美国：按店铺(customer)所属子公司聚合体积
            //       * 子公司只有1个 -> 1张PO（不分摊）
            //       * 子公司多个   -> 多张PO按体积占比分摊，最后一张吃尾差（按每个费用项独立尾差）
            // ------------------------
            if (Object.keys(hwPoJson).length > 0) {
                var county_lsit = rec.getValue('custrecord_swc_cos_county_lsit'); // 运抵国
                var wlDId = SUBLIST_CG_PLAN_DETAIL;
                var wlDCount = rec.getLineCount({ sublistId: wlDId }) || 0;

                // customer->subsidiary lookup缓存
                var custSubCache = {};
                function getCustomerSubsidiary(customerId) {
                    var key = String(customerId || '');
                    if (!key) return 77;
                    if (custSubCache.hasOwnProperty(key)) return custSubCache[key];

                    var customerS = search.lookupFields({
                        type: 'customer',
                        id: customerId,
                        columns: ['subsidiary']
                    });

                    var sub = 77;
                    if (customerS && customerS['subsidiary'] && customerS['subsidiary'][0]) {
                        sub = customerS['subsidiary'][0].value;
                    }
                    custSubCache[key] = sub;
                    return sub;
                }

                var hwCarriers = Object.keys(hwPoJson);
                log.debug('hwCarriers', hwCarriers)
                log.debug('county_lsit', county_lsit)

                // 美国：固定子公司77，承运商一张
                if (String(county_lsit) === '230') {
                    for (var h = 0; h < hwCarriers.length; h++) {
                        var carrierHw = hwCarriers[h];
                        var poIdUs = createFeePO(carrierHw, 77, hwPoJson[carrierHw], id);
                        createdPoIds.push(String(poIdUs));
                    }
                } else {
                    // 非美国：按子公司体积聚合
                    for (var h2 = 0; h2 < hwCarriers.length; h2++) {
                        var carrierHw2 = hwCarriers[h2];
                        var feeMapHw = hwPoJson[carrierHw2];

                        // subVolMap: { subId: volumeSum }
                        var subVolMap = {};
                        var totalVol = 0;

                        for (var d = 0; d < wlDCount; d++) {
                            var shopId = rec.getSublistValue({ sublistId: wlDId, fieldId: 'custrecord_swc_out_store', line: d });
                            var vol = toNumber(rec.getSublistValue({ sublistId: wlDId, fieldId: 'custrecord_swc_out_hwti', line: d }));
                            log.debug('shopId', shopId)
                            log.debug('vol', vol)
                            if (!shopId || vol <= 0) continue;

                            var subId = getCustomerSubsidiary(shopId);
                            totalVol += vol;
                            subVolMap[String(subId)] = toNumber(subVolMap[String(subId)]) + vol;
                        }

                        var subKeys = Object.keys(subVolMap);

                        // 没体积：退化1张
                        if (subKeys.length === 0 || totalVol <= 0) {
                            var poIdFallback = createFeePO(carrierHw2, 77, feeMapHw, id);
                            createdPoIds.push(String(poIdFallback));
                            continue;
                        }

                        // 只有一个子公司：不分摊，1张PO
                        if (subKeys.length === 1) {
                            var onlySub = Number(subKeys[0]) || 77;
                            var poIdOne = createFeePO(carrierHw2, onlySub, feeMapHw, id);
                            createdPoIds.push(String(poIdOne));
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

                            var poRec = record.create({ type: record.Type.PURCHASE_ORDER, isDynamic: true });
                            poRec.setValue({ fieldId: 'customform', value: 102 });
                            poRec.setValue({ fieldId: 'entity', value: carrierHw2 });
                            poRec.setValue({ fieldId: 'subsidiary', value: Number(subIdKey) || 77 });
                            poRec.setValue({ fieldId: 'custbody_swc_cqdd_zq', value: 1 });
                            poRec.setValue({ fieldId: 'custbody_swc_cg_sub_order_no', value: id });
                            poRec.setValue({ fieldId: 'custbody_swc_po_fee', value: 3 });
                            poRec.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: 1 });
                            poRec.setValue({ fieldId: 'custbody_swc_order_type2', value: 3 });
                            //搜索供应商付款条件
                            search.create({
                                type: "vendor",
                                filters:
                                    [
                                        ["internalid", "is", vendorId]
                                    ],
                                columns:
                                    [
                                        search.createColumn({ name: "custentity_swc_payment_terms", label: "Terms" })
                                    ]
                            }).run().each(function (a) {
                                var terms = a.getValue('custentity_swc_payment_terms');
                                if (terms) {
                                    var termsArray = terms.split(',');
                                    log.debug('termsArray', termsArray)
                                    poRec.setValue({ fieldId: 'custbody_swc_vendor_payment_terms', value: termsArray[0] });
                                } else {
                                    log.debug('没有terms')
                                }
                                return false
                            });

                            var feeKeysHw = Object.keys(feeMapHw || {});
                            for (var fk = 0; fk < feeKeysHw.length; fk++) {
                                var feeTypeZ = feeKeysHw[fk];
                                var itemId = feeItemByName[String(feeTypeZ)];
                                if (!itemId) continue;

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

                                poRec.selectNewLine({ sublistId: 'item' });
                                poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemId });
                                poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                                poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: lineAmt });
                                poRec.commitLine({ sublistId: 'item' });
                            }

                            var poIdSplit = poRec.save({ ignoreMandatoryFields: true });
                            createdPoIds.push(String(poIdSplit));
                        }
                    }
                }
            }

            createdPoIds = uniq(createdPoIds);

            // ------------------------
            // 7) 回写PO到 first leg cost 子表多选字段 custrecord_swc_wl_cflc_po
            //    按承运商精确回写：该承运商生成的所有PO写到该承运商相关行
            // ------------------------
            if (createdPoIds.length > 0) {
                // 这里按您的需求：把“本次生成的多个PO单据”写到子表行中
                // 若您希望只回写对应承运商的PO，可改成 carrier->poIds 的映射；当前为了简单按“全部PO都回写到参与行”处理也可。
                // 我这里做更严谨：按承运商回写本次创建的PO（但由于我们未分别记录carrier->poIds，默认全部回写）。
                var carriersTouched = Object.keys(carrierLegLinesMap);
                for (var ct = 0; ct < carriersTouched.length; ct++) {
                    var carrierKey = carriersTouched[ct];
                    var lineIdxArr = carrierLegLinesMap[carrierKey] || [];

                    for (var li = 0; li < lineIdxArr.length; li++) {
                        var lineIndex = lineIdxArr[li];

                        var oldVal = rec.getSublistValue({
                            sublistId: legSubId,
                            fieldId: 'custrecord_swc_wl_cflc_po',
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

                        var merged = uniq(oldArr.concat(createdPoIds));

                        rec.setSublistValue({
                            sublistId: legSubId,
                            fieldId: 'custrecord_swc_wl_cflc_po',
                            line: lineIndex,
                            value: merged
                        });
                    }
                }
            }

            // ------------------------
            // 8) 保存状态
            // ------------------------
            rec.setValue({ fieldId: 'custrecord_swc_cso_status', value: 3 });
            rec.save({ ignoreMandatoryFields: true });

            result_str.data = '生成头程费用类采购订单成功（共生成 ' + createdPoIds.length + ' 张PO）';
            return result_str;

        } catch (e) {
            log.error('生成头程费用类采购订单失败', e);
            result_str.data = '生成头程费用类采购订单失败,请联系管理人员';
            return result_str;
        }
    }

    /**
     * 我在物流发运单创建完成后，只对海运保险费(4)和目的国进口关税(7)预填预估费用。
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
     * @param {string|number} CG_rec CG子单记录
     */
    function syncInitialEstimatedFeeForInsuranceAndDuty(wlPlanOrderId, CG_rec) {
        if (!wlPlanOrderId) return;

        var planRec = record.load({
            type: 'customrecord_swc_wl_plan_order',
            id: wlPlanOrderId,
            isDynamic: false
        });

        var countyLsit = planRec.getValue({ fieldId: 'custrecord_swc_wl_county_lsit' });
        var countyLsitText = planRec.getText({ fieldId: 'custrecord_swc_wl_county_lsit' });
        var mainStore = planRec.getValue({ fieldId: 'custrecord_swc_wl_po_zt' });
        log.debug('countyLsit', countyLsit)
        log.debug('countyLsitText', countyLsitText)

        var countryCode = normalizeCountryCode(countyLsit, countyLsitText);
        log.debug('countryCode', countryCode)
        var termsOfTrade = planRec.getValue({ fieldId: 'custrecord_swc_wl_terms_of_trade' });
        var clearancePriceFieldId = getClearancePriceFieldIdByCountry(countryCode);
        var dutyCurrency = getDutyCurrencyInternalIdByCountryCode(countryCode);
        var isUsCountry = String(countryCode || '').toUpperCase() === 'US';
        var detailLineList = getPlanDetailLineList(planRec);
        if (!detailLineList.length) {
            return;
        }

        var feeLineList = getInsuranceAndDutyFeeLines(CG_rec.id);
        if (!feeLineList.length) {
            return;
        }

        var poCurrencyMap = getPurchaseOrderCurrencyMap(detailLineList);
        log.debug('detailLineList',detailLineList)
        log.debug('poCurrencyMap',poCurrencyMap)
        log.debug('termsOfTrade',termsOfTrade)
        var insuranceResult = calculateInsuranceEstimatedFee(detailLineList, poCurrencyMap, termsOfTrade);
        log.debug('insuranceResult', insuranceResult)

        var dutyResult = calculateImportDutyEstimatedFee(detailLineList, countryCode, countyLsit, clearancePriceFieldId, isUsCountry, poCurrencyMap, mainStore);
        log.debug('dutyResult', dutyResult)
        log.debug('feeLineList', feeLineList)



        // insuranceResult.lineAmountMap = rebalanceLineAmountMap(insuranceResult.lineAmountMap, insuranceResult.total);
        // dutyResult.lineAmountMap = rebalanceLineAmountMap(dutyResult.lineAmountMap, dutyResult.total);

        applyInsuranceAndDutyToPlanDetail(CG_rec, insuranceResult.SKUAmountMap, dutyResult.SKUAmountMap, countryCode, feeLineList);
    }

    function getInsuranceAndDutyFeeLines(wlPlanOrderId) {
        var lineList = [];
        var feeSearch = search.create({
            type: 'customrecord_swc_cg_first_leg_cost',
            filters: [
                ['custrecord_swc_cg_first_leg_cost_id', 'anyof', String(wlPlanOrderId)],
                'AND',
                ['custrecord_swc_cflc_fee_type_z', 'anyof', [SWC_CONFIG_DATA.configData().FEE_TYPE_BXF, SWC_CONFIG_DATA.configData().FEE_TYPE_JKGS]]
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'custrecord_swc_cflc_fee_type_z' }),
                search.createColumn({ name: 'custrecord_swc_wl_cflc_fee_type_x' }),
                search.createColumn({ name: 'custrecord_swc_wl_cflc_location' })
            ]
        });

        feeSearch.run().each(function (result) {
            lineList.push({
                id: result.getValue({ name: 'internalid' }),
                feeTypeZ: result.getValue({ name: 'custrecord_swc_cflc_fee_type_z' }),
                feeTypeX: result.getValue({ name: 'custrecord_swc_wl_cflc_fee_type_x' }),
                carrierId: result.getValue({ name: 'custrecord_swc_wl_cflc_location' })
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
     * custrecord_swc_wl_d_amount_total * 数量 * 1.1 * 0.0005
     * 然后再按成交方式对应的默认币种，与 PO 币种做人民币/美元换算。
     */
    function calculateInsuranceEstimatedFee(detailLineList, poCurrencyMap, termsOfTrade) {
        var total = 0;
        var lineAmountMap = {};
        var SKUAmountMap = {};//按SKU分组汇总
        for (var i = 0; i < detailLineList.length; i++) {
            var line = detailLineList[i];
            var qty = getPlanDetailLineQty(line);
            if (qty <= 0 || line.amountTotal <= 0) {
                lineAmountMap[String(line.line)] = 0;
                continue;
            }

            log.debug('line',line)

            var lineAmount = line.amountTotal * qty * 1.1 * 0.0005;
            log.debug('lineAmount',lineAmount)
            var poCurrencyInfo = poCurrencyMap[String(line.poId)] || {};
            var defaultCurrency = 1;//海运保险费币别默认为人民币 getDefaultCurrencyByFeeTypeAndTerms(SWC_CONFIG_DATA.configData().FEE_TYPE_BXF, termsOfTrade);

            lineAmount = convertAmountByDefaultCurrency(lineAmount, defaultCurrency, poCurrencyInfo);
            lineAmountMap[String(line.line)] = lineAmount;
            log.debug('lineAmount1',lineAmount)

            if (SKUAmountMap[String(line.itemId)]) {
                SKUAmountMap[String(line.itemId)]['qty'] = SKUAmountMap[String(line.itemId)]['qty'] + qty;
                SKUAmountMap[String(line.itemId)]['amount'] = round2(SKUAmountMap[String(line.itemId)]['amount'] + lineAmount);
                SKUAmountMap[String(line.itemId)]['amountTotal'] = round2(SKUAmountMap[String(line.itemId)]['amountTotal'] + line.amountTotal * qty);
            } else {
                SKUAmountMap[String(line.itemId)] = {
                    'qty': qty,
                    'amount': lineAmount,
                    'amountTotal': line.amountTotal * qty
                }
            }


            total = round2(total + lineAmount);
            log.debug('total'+i,total)
        }
        return {
            total: total,
            lineAmountMap: lineAmountMap,
            SKUAmountMap: SKUAmountMap
        };
    }

    /**
     * 我把目的国进口关税按物流发运明细逐行汇总。
     * 计算公式是：
     * 税率有值时：清关价单价 * 数量 * 税率
     * 税率为空或 0 时：清关价单价 * 数量
     * 不做币种转换，直接按清关价字段原币种汇总。
     * 其中清关价字段由运抵国决定，美国(US)场合最后总额再加 40。
     */
    function calculateImportDutyEstimatedFee(detailLineList, countryCode, countryID, clearancePriceFieldId, isUsCountry, poCurrencyMap, mainStore) {
        var skuMap = {};
        for (var i = 0; i < detailLineList.length; i++) {
            if (detailLineList[i].itemId) {
                skuMap[String(detailLineList[i].itemId)] = true;
            }
        }

        var skuIds = Object.keys(skuMap);
        if (!skuIds.length || !countryCode || !clearancePriceFieldId) {
            return 0;
        }

        var clearancePriceMap = getClearancePriceMap(skuIds, clearancePriceFieldId, mainStore);
        log.debug('clearancePriceMap11', clearancePriceMap)
        log.debug('1', countryCode)
        var taxRateMap = getSkuTaxRateMap(skuIds, countryID);
        log.debug('2', 3)
        var dutyCurrencyCode = getDutyCurrencyCodeByCountry(countryCode);
        log.debug('2', 4)
        var total = 0;
        var lineAmountMap = {};
        var SKUAmountMap = {};//按SKU分组汇总
        log.debug('2', 2)
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

            var baseAmount = unitPrice * qty;
            var lineAmount = taxRate > 0 ? (unitPrice * qty * taxRate) : baseAmount;
            var poCurrencyInfo = poCurrencyMap[String(line.poId)] || {};
            if (!isUsCountry) {
                lineAmount = round2(lineAmount * getCurrencyRateBySourceCurrencyCode(dutyCurrencyCode, poCurrencyInfo.id, poCurrencyInfo.trandate));
            }
            lineAmountMap[String(line.line)] = lineAmount;
            if (SKUAmountMap[String(line.itemId)]) {
                SKUAmountMap[String(line.itemId)]['qty'] = SKUAmountMap[String(line.itemId)]['qty'] + qty;
                SKUAmountMap[String(line.itemId)]['amount'] = round2(SKUAmountMap[String(line.itemId)]['amount'] + lineAmount);
            } else {
                SKUAmountMap[String(line.itemId)] = {
                    'qty': qty,
                    'amount': lineAmount
                }
            }

            total = round2(total + lineAmount);
        }

        if (isUsCountry) {
            total = round2(total + 40);
        }

        return {
            total: total,
            lineAmountMap: lineAmountMap,
            SKUAmountMap: SKUAmountMap
        };
    }

    function applyInsuranceAndDutyToPlanDetail(planRec, insuranceSKUAmountMap, dutySKUAmountMap, countryCode, feeLineList) {
        var sublistId = SUBLIST_CG_PLAN_DETAIL;
        var lineCount = planRec.getLineCount({ sublistId: sublistId }) || 0;
        // 海运保险费明细币种固定回写人民币
        var insuranceCurrency = 1;
        var dutyCurrency = getDutyCurrencyInternalIdByCountryCode(countryCode);
        log.debug('dutyCurrency', dutyCurrency)
        var insuranceAmountToltal = 0;
        var dutyAmountToltal = 0;
        for (var i = 0; i < lineCount; i++) {
            var sku = planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_out_sku', line: i })
            var qty = planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_out_quantity', line: i })
            //  SKUAmountMap[String(line.itemId)] = {
            //         'qty': qty,
            //         'amount': lineAmount,
            //         'amountTotal': line.amountTotal * qty
            //     }
            var insuranceAmountObj = (insuranceSKUAmountMap || {})[String(sku)];
            var insuranceAmountOrigin = round2(toNumber((insuranceAmountObj || {})['amount']));
            var insuranceQtyOrigin = round2(toNumber((insuranceAmountObj || {})['qty']));
            var insuranceAmountToltalOrigin = round2(toNumber((insuranceAmountObj || {})['amountTotal']));

            var lineAmountToltal = 0; //行总货值
            var insuranceAmount = 0; //行预估保险费
            if (insuranceQtyOrigin > 0) {
                lineAmountToltal = round2(insuranceAmountToltalOrigin * qty / insuranceQtyOrigin)
                insuranceAmount = round2(insuranceAmountOrigin * qty / insuranceQtyOrigin)
            }
            insuranceAmountToltal = insuranceAmountToltal * 1 + insuranceAmount * 1;
            log.debug('insuranceAmountToltal', insuranceAmountToltal)

            var dutyAmountObj = (dutySKUAmountMap || {})[String(sku)];
            var dutyAmountOrigin = round2(toNumber((dutyAmountObj || {})['amount']));
            var dutyQtyOrigin = round2(toNumber((dutyAmountObj || {})['qty']));
            var dutyAmount = 0;
            if (dutyQtyOrigin > 0) {
                dutyAmount = round2(dutyAmountOrigin * qty / dutyQtyOrigin)
            }

            dutyAmountToltal = dutyAmountToltal * 1 + dutyAmount * 1;
            log.debug('dutyAmountToltal', dutyAmountToltal)
            log.debug('insuranceAmount', insuranceAmount)
            log.debug('dutyAmount', dutyAmount)

            planRec.setSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_swc_cg_d_em_bxf_fee',
                line: i,
                value: insuranceAmount
            });
            if (insuranceCurrency) {
                planRec.setSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_swc_cg_d_em_bxf_fee_c',
                    line: i,
                    value: insuranceCurrency
                });
            }

            planRec.setSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_swc_cg_d_em_jkgs_fee',
                line: i,
                value: dutyAmount
            });
            if (dutyCurrency) {
                planRec.setSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_swc_cg_d_em_jkgs_fee_c',
                    line: i,
                    value: dutyCurrency
                });
            }

            planRec.setSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_swc_cg_toltal_amount',
                line: i,
                value: lineAmountToltal
            });

        }
        planRec.save({
            enableSourcing: false,
            ignoreMandatoryFields: true
        });
        // [{ "id": "20", "feeTypeZ": "7", "feeTypeX": "27", "carrierId": "" },
        // { "id": "22", "feeTypeZ": "7", "feeTypeX": "25", "carrierId": "2954" },
        // { "id": "29", "feeTypeZ": "7", "feeTypeX": "26", "carrierId": "" },
        // { "id": "42", "feeTypeZ": "4", "feeTypeX": "16", "carrierId": "2952" }]

        for (var i = 0; i < feeLineList.length; i++) {
            var feeLine = feeLineList[i];
            var values = {};
            log.debug('feeLine',feeLine)
            if (String(feeLine.feeTypeZ) === SWC_CONFIG_DATA.configData().FEE_TYPE_BXF) {
                values.custrecord_swc_wl_cflc_yg_fee = round2(insuranceAmountToltal);
                values.custrecord_swc_wl_cflc_yg_currency = 1;
            } else if (String(feeLine.feeTypeZ) === SWC_CONFIG_DATA.configData().FEE_TYPE_JKGS && String(feeLine.feeTypeX) === SWC_CONFIG_DATA.configData().FEE_TYPE_GS) {
                values.custrecord_swc_wl_cflc_yg_fee = round2(dutyAmountToltal);
                if (dutyCurrency) {
                    values.custrecord_swc_wl_cflc_yg_currency = dutyCurrency;
                }
            } else {
                continue;
            }

            log.debug('feeLine', feeLine)
            log.debug('values', values)
            record.submitFields({
                type: RECORD_TYPE_CG_FIRST_LEG_COST,
                id: feeLine.id,
                values: values,
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
        }


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
    function getClearancePriceMap(skuIds, priceFieldId, mainStore) {
        var priceMap = {};
        if (!skuIds || !skuIds.length || !priceFieldId) {
            return priceMap;
        }
        var parentIds = getClearancePriceParentIdsByMainStore(mainStore);
        var filters = [
            search.createFilter({
                name: 'isinactive',
                operator: search.Operator.IS,
                values: 'F'
            }),
            search.createFilter({
                name: 'custrecord_clearance_price_detail_sku',
                operator: search.Operator.ANYOF,
                values: skuIds
            })
        ];
        if (mainStore) {
            // if (!parentIds.length) {
            //     return priceMap;
            // }
            // filters.push(search.createFilter({
            //     name: 'custrecord_clearance_price_detail_main',
            //     operator: search.Operator.ANYOF,
            //     values: parentIds
            // }));
            //TODO:确认是不是要返回
            if (parentIds.length) {
                filters.push(search.createFilter({
                    name: 'custrecord_clearance_price_detail_main',
                    operator: search.Operator.ANYOF,
                    values: parentIds
                }));
            }

        }
        var priceSearch = search.create({
            type: 'customrecord_swc_clearance_price_detail',
            filters: filters,
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

    function getClearancePriceParentIdsByMainStore(mainStore) {
        if (!mainStore) return [];

        var parentIds = [];
        var parentSearch = search.create({
            type: 'customrecord_swc_clearance_price_maintai',
            filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                ['custrecord_clearance_price_subsidiary', 'anyof', String(mainStore)]
            ],
            columns: [
                search.createColumn({ name: 'internalid' })
            ]
        });

        parentSearch.run().each(function (result) {
            var parentId = result.getValue({ name: 'internalid' });
            if (parentId) {
                parentIds.push(parentId);
            }
            return true;
        });

        return parentIds;
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

    function getDutyCurrencyCodeByCountry(countryId) {
        var countryCode = String(countryId || '').toUpperCase();
        if (countryCode === 'US') return 'USD';
        if (countryCode === 'CA') return 'CAD';
        if (countryCode === 'DE' || countryCode === 'FR' || countryCode === 'IT' || countryCode === 'ES' || countryCode === 'NL') {
            return 'EUR';
        }
        if (countryCode === 'GB' || countryCode === 'UK') return 'GBP';
        return '';
    }

    function getDutyCurrencyInternalIdByCountryCode(countryCode) {
        var dutyCurrencyCode = getDutyCurrencyCodeByCountry(countryCode);
        return getCurrencyIdByCurrencyCode(dutyCurrencyCode);
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
            taxRateMap[String(skuId)] = parsePercentRate(result.getValue({ name: 'custrecord_swc_tax_rate' }));
            return true;
        });

        return taxRateMap;
    }

    function getPlanDetailLineQty(line) {
        if (toNumber(line.superiorQty) > 0) return toNumber(line.superiorQty);
        if (toNumber(line.goodQty) > 0) return toNumber(line.goodQty);
        return toNumber(line.shippedQty);
    }

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
            return Number(NScurrency.exchangeRate({
                source: Number(sourceCurrencyId),
                target: Number(targetCurrencyId),
                date: tranDate ? new Date(tranDate) : new Date()
            })) || 1;
        } catch (e) {
            log.error('getStandardCurrencyRate error', e);
            return 1;
        }
    }

    var currencyIdCache = {};
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

    function getCurrencyIdByCurrencyCode(currencyCode) {
        currencyCode = String(currencyCode || '').toUpperCase();
        if (!currencyCode) return '';
        if (currencyIdCache[currencyCode]) return currencyIdCache[currencyCode];

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
            if (name.indexOf(currencyCode) !== -1 || symbol.indexOf(currencyCode) !== -1) {
                currencyId = result.getValue({ name: 'internalid' }) || '';
                return false;
            }
            return true;
        });

        currencyIdCache[currencyCode] = currencyId;
        return currencyId;
    }

    function getCurrencyRateBySourceCurrencyCode(sourceCurrencyCode, targetCurrencyId, tranDate) {
        sourceCurrencyCode = String(sourceCurrencyCode || '').toUpperCase();
        targetCurrencyId = String(targetCurrencyId || '');
        if (!sourceCurrencyCode || !targetCurrencyId) {
            return 1;
        }

        var sourceCurrencyId = getCurrencyIdByCurrencyCode(sourceCurrencyCode);
        if (!sourceCurrencyId || String(sourceCurrencyId) === targetCurrencyId) {
            return 1;
        }

        try {
            return Number(NScurrency.exchangeRate({
                source: Number(sourceCurrencyId),
                target: Number(targetCurrencyId),
                date: tranDate ? new Date(tranDate) : new Date()
            })) || 1;
        } catch (e) {
            log.error('getCurrencyRateBySourceCurrencyCode error', e);
            return 1;
        }
    }

    function getDefaultCurrencyByFeeTypeAndTerms(feeTypeZ, termsOfTrade) {
        feeTypeZ = String(feeTypeZ || '');
        termsOfTrade = String(termsOfTrade || '');

        if (feeTypeZ === SWC_CONFIG_DATA.configData().FEE_TYPE_BXF) {
            if (termsOfTrade === '3' || termsOfTrade === '4') return 'RMB';
            if (termsOfTrade === '1' || termsOfTrade === '2' || termsOfTrade === '5') return 'USD';
        }

        if (feeTypeZ === SWC_CONFIG_DATA.configData().FEE_TYPE_JKGS) {
            if (termsOfTrade === '3') return 'RMB';
            if (termsOfTrade === '1' || termsOfTrade === '2' || termsOfTrade === '4' || termsOfTrade === '5') return 'USD';
        }

        return '';
    }

    function parsePercentRate(rateValue) {
        var rateText = String(rateValue || '').replace('%', '').trim();
        if (!rateText) return 0;

        var rate = Number(rateText);
        if (!isFinite(rate)) return 0;

        return rate > 1 ? rate / 100 : rate;
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
    function toNumber(v) {
        var n = Number(v);
        return isFinite(n) ? n : 0;
    }

    function round2(n) {
        n = toNumber(n);
        return Math.round((n + Number.EPSILON) * 100) / 100;
    }
    /**
     * 根据异常类型返回对用户更安全的提示语。
     */
    function getSafeActionErrorMessage(e, defaultMessage) {
        if (isRecordChangedError(e)) {
            // 这里返回并发冲突提示，避免将“已创建成功但回写失败”误判为“未执行任何操作”。
            return '当前物流发运单刚被其他人或其他流程更新，请先刷新页面确认结果后再决定是否继续操作。';
        }
        return defaultMessage;
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
     * 统一提取异常文本，便于后续错误信息判断。
     */
    function getErrorText(e) {
        if (!e) return '';
        return String(e.message || e.name || e);
    }
    function _put(context) {

    }

    function _delete(context) {

    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
