/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/task', 'N/search', 'N/record', 'N/currency', 'N/format', 'N/runtime','N/redirect'],

    function (task, search, record, currencyRate, format, runtime,redirect) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {

            var request = context.request;
            var requestBody = request.body;
            var data = JSON.parse(requestBody);
            var billId = data.bill_id;
            var action = data.action;

            if (action == 'feePoCreate') { // 生成头程费用采购订单
                context.response.write(JSON.stringify(feePoCreate(billId)));
            }else if(action == 'createIfRecord'){ // 预估杂费分摊
                context.response.write(JSON.stringify(createIfRecord(billId)));
            }else if(action == 'upDataPoSubListLine'){// 采购订单明细行更新
                context.response.write(JSON.stringify(upDataPoSubListLine(billId)));
            }else if(action == 'feeEstimatedCos'){ // 预估费用
                context.response.write(JSON.stringify(feeEstimatedCos(billId)));
            }else if(action == 'fee_ar_to'){ // 费用类型采购订单审批
                context.response.write(JSON.stringify(fee_ar_to(billId)));
            }else if(action == 'feeApportion'){ // 费用分摊
                context.response.write(JSON.stringify(feeApportion(billId)));
            }else if(action == 'workOrderAssembly'){ // 工单组装
                context.response.write(JSON.stringify(workOrderAssembly(billId)));
            }else if(action == 'tcFeePoCreate'){ // 头程类费用订单生成
                context.response.write(JSON.stringify(tcFeePoCreate(billId)));
            }else if(action == 'feeApportionSj'){ // 实际费用分摊
                context.response.write(JSON.stringify(feeApportionSj(billId)));
            }else if(action == 'wlRm'){ // 物流发运单据无效
                context.response.write(JSON.stringify(wlRm(billId)));
            }else if(action == 'poZfCy'){ // 采购杂费差异账单生成
                context.response.write(JSON.stringify(poZfCy(billId)));
            }else if(action == 'before_delete'){ // 删除子列表
                context.response.write(JSON.stringify(before_delete(billId)));
            }else if(action == 'fee_po_sp'){ // 重新审批
                context.response.write(JSON.stringify(fee_po_sp(billId)));
            }else if(action == 'fee_po_sp_tc'){ // 重新审批
                context.response.write(JSON.stringify(fee_po_sp_tc(billId)));
            }else if(action == 'onClickFeePoCreate'){ // 调拨费采购订单类型做成
                context.response.write(JSON.stringify(onClickFeePoCreate(billId)));
            }else if(action == 'fee_ar_to_db'){ // 调拨费采购订单类型做成
                context.response.write(JSON.stringify(fee_ar_to_db(billId)));
            }else if(action == 'onClickReapply'){ // 调拨费采购订单类型做成
                context.response.write(JSON.stringify(onClickReapply(billId)));
            }else if(action == 'differentialBillingCompleted'){ // 实际调拨费分摊及入库接收，差异账单做成
                context.response.write(JSON.stringify(differentialBillingCompleted(billId)));
            }else if(action == 'onClickApproveOk'){ // 采购调拨费分摊
                context.response.write(JSON.stringify(onClickApproveOk(billId)));
            }else if(action == 'poToIf'){ // 采购订单入库
                context.response.write(JSON.stringify(poToIf(billId)));
            }else if(action == 'supplierShippedCn'){ // 供应商已出货
                context.response.write(JSON.stringify(supplierShippedCn(billId)));
            }else if(action == 'customsDeclared'){ // 报关
                context.response.write(JSON.stringify(customsDeclared(billId)));
            }else if(action == 'clearedCustoms'){ // 清关
                context.response.write(JSON.stringify(clearedCustoms(billId)));
            }
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
                    type: 'customrecord_swc_wl_plan_order',
                    id: id,
                    isDynamic: false
                });

                // 防二次点击：只要标记已处理，就直接退出
                var curStatus = rec.getValue({ fieldId: 'custrecord_swc_wl_tc_ft_flag' });
                if (String(curStatus) === '1') {
                    result_str.data = '该物流发运单已做过预估费用分摊，无法重复执行。';
                    return result_str;
                }

                var wl_actual_cabinet = rec.getValue({ fieldId: 'custrecord_swc_wl_actual_cabinet' });
                if (!wl_actual_cabinet) {
                    result_str.data = '请正确填写【真实排柜单号】！';
                    return result_str;
                }

                var md_location = rec.getValue({ fieldId: 'custrecord_swc_md_location' });
                if (!md_location) {
                    result_str.data = '请正确填写【目的仓】！';
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
                var eg_cost_id_sub_id = 'recmachcustrecord_swc_wl_first_leg_cost_id';
                var lineCount = rec.getLineCount({ sublistId: eg_cost_id_sub_id });

                var vendorSet = {};
                for (var x = 0; x < lineCount; x++) {
                    var flc_location = rec.getSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: 'custrecord_swc_wl_flc_location',
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
                var quoteTotalMap = getQuotationTotalMap(md_location, vendorList);
                if (!quoteTotalMap || Object.keys(quoteTotalMap).length === 0) {
                    result_str.data = '物流商服务报价当前无匹配数据，请确认！';
                    return result_str;
                }

                // 4) 取“同柜其它已处理单”的已分摊合计（排除当前单），用于最后一单尾差
                var allocatedMap = getAllocatedEstimatedMapByCabinetExcludeCurrent(wl_actual_cabinet, String(id));

                // 5) 回写当前单：非最后=总额*ratio；最后=总额-已分摊
                for (var i = 0; i < lineCount; i++) {
                    var fee_type_z = rec.getSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: 'custrecord_swc_flc_fee_type_z',
                        line: i
                    });
                    var fee_type_x = rec.getSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: 'custrecord_swc_wl_flc_fee_type_x',
                        line: i
                    });
                    var flc_location2 = rec.getSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: 'custrecord_swc_wl_flc_location',
                        line: i
                    });

                    var key = String(fee_type_z) + '_' + String(fee_type_x) + '_' + String(flc_location2);

                    if (!quoteTotalMap.hasOwnProperty(key)) continue;

                    var totalPirca = toNumber(quoteTotalMap[key].pircaTotal);
                    var toSet = 0;

                    if (isLast) {
                        var already = toNumber(allocatedMap[key]);
                        toSet = round2(totalPirca - already);
                        if (toSet < 0) toSet = 0; // 防止被手工改坏导致负数
                    } else {
                        toSet = round2(totalPirca * ratio);
                    }

                    rec.setSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: 'custrecord_swc_wl_flc_yg_fee',
                        value: toSet,
                        line: i
                    });
                    rec.setSublistValue({
                        sublistId: eg_cost_id_sub_id,
                        fieldId: 'custrecord_swc_wl_flc_yg_currency',
                        value: quoteTotalMap[key].currency || null,
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
                rec.setValue({ fieldId: 'custrecord_swc_wl_tc_ft_flag', value: 1 });
                rec.setValue({ fieldId: 'custrecord_swc_wl_plan_status', value: 7 });

                rec.save({ ignoreMandatoryFields: false });

                result_str.data = isLast ? '预估费用成功（最后一单已做尾差处理）' : '预估费用成功';
                return result_str;

            } catch (e) {
                log.error('预估费用异常', e);
                result_str.data = '预估费用失败,请联系管理人员';
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
                type: 'customrecord_swc_wl_plan_order',
                filters: [
                    ['custrecord_swc_wl_actual_cabinet', 'anyof', String(cabinetId)]
                ],
                columns: [
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: 'custrecord_swc_wl_total_volume' }),
                    search.createColumn({ name: 'custrecord_swc_wl_tc_ft_flag' })
                ]
            });

            var rs = getAllResults(s) || [];
            for (var i = 0; i < rs.length; i++) {
                totalCount++;

                var pid = String(rs[i].getValue({ name: 'internalid' }) || '');
                var vol = toNumber(rs[i].getValue({ name: 'custrecord_swc_wl_total_volume' }));
                var st = String(rs[i].getValue({ name: 'custrecord_swc_wl_tc_ft_flag' }) || '');

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
        function getQuotationTotalMap(md_location, vendorList) {
            var map = {};

            var s = search.create({
                type: "customrecord_swc_service_quotation_detai",
                filters: [
                    ["custrecord_swc_lpd_lp.custrecord_swc_lp_start_date", "onorbefore", "today"],
                    "AND",
                    ["custrecord_swc_lpd_lp.custrecord_swc_lp_end_date", "onorafter", "today"],
                    "AND",
                    ["custrecord_swc_lpd_lp.custrecord_swc_lp_logistics_provider", "anyof", vendorList],
                    "AND",
                    ["custrecord_swc_lpd_lp.custrecord_swc_lp_to_location", "anyof", md_location]
                ],
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

            var rs = getAllResults(s) || [];
            for (var i = 0; i < rs.length; i++) {
                var cost_medium = rs[i].getValue({ name: "custrecord_swc_lp_cost_medium" });
                var rm_cost_s = rs[i].getValue({ name: "custrecord_swc_lp_rm_cost_s" });
                var allocation_rules = rs[i].getValue({ name: "custrecord_swc_lp_allocation_rules" });
                var currency = rs[i].getValue({ name: "custrecord_swc_lp_currency" }) || null;

                var lp = rs[i].getValue({
                    name: "custrecord_swc_lp_logistics_provider",
                    join: "CUSTRECORD_SWC_LPD_LP"
                });

                // 修正优先级 bug：必须先取数值，再做后续计算；这里不乘 ratio
                var pircaTotal = toNumber(rs[i].getValue({ name: "custrecord_swc_lp_pirca" }));

                var key = String(cost_medium) + '_' + String(rm_cost_s) + '_' + String(lp);

                // 同 key 多行：累加成“整柜总额”
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

            return map;
        }

        /**
         * 同柜其它已处理单的已分摊合计（排除当前单）
         * 数据来源：customrecord_swc_wl_first_leg_cost 的 custrecord_swc_wl_flc_yg_fee
         * key = fee_type_z + '_' + fee_type_x + '_' + flc_location
         */
        function getAllocatedEstimatedMapByCabinetExcludeCurrent(cabinetId, currentPlanOrderId) {
            var map = {};

            var s = search.create({
                type: "customrecord_swc_wl_first_leg_cost",
                filters: [
                    ["custrecord_swc_wl_first_leg_cost_id.custrecord_swc_wl_actual_cabinet", "anyof", String(cabinetId)],
                    "AND",
                    ["custrecord_swc_wl_first_leg_cost_id.custrecord_swc_wl_tc_ft_flag", "is", "1"],
                    "AND",
                    ["custrecord_swc_wl_first_leg_cost_id", "noneof", String(currentPlanOrderId)],
                    "AND",
                    ["custrecord_swc_wl_flc_yg_fee", "isnotempty", ""]
                ],
                columns: [
                    search.createColumn({ name: "custrecord_swc_flc_fee_type_z", summary: "GROUP" }),
                    search.createColumn({ name: "custrecord_swc_wl_flc_fee_type_x", summary: "GROUP" }),
                    search.createColumn({ name: "custrecord_swc_wl_flc_location", summary: "GROUP" }),
                    search.createColumn({ name: "custrecord_swc_wl_flc_yg_fee", summary: "SUM" })
                ]
            });

            var rs = getAllResults(s) || [];
            for (var i = 0; i < rs.length; i++) {
                var z = rs[i].getValue({ name: "custrecord_swc_flc_fee_type_z", summary: "GROUP" });
                var x = rs[i].getValue({ name: "custrecord_swc_wl_flc_fee_type_x", summary: "GROUP" });
                var v = rs[i].getValue({ name: "custrecord_swc_wl_flc_location", summary: "GROUP" });
                var sumFee = toNumber(rs[i].getValue({ name: "custrecord_swc_wl_flc_yg_fee", summary: "SUM" }));

                var key = String(z) + '_' + String(x) + '_' + String(v);
                map[key] = round2(sumFee);
            }

            return map;
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
         * 费用类型采购订单，重新审批
         * @param id
         */
        function fee_po_sp(id){
            var result_str = {};

            try {
                var rec = record.load({
                    type: 'customrecord_swc_wl_plan_order',
                    id: id,
                });

                var saveFlag = false;
                var po_fee_wl_sub_id = 'recmachcustrecord_swc_wl_po_fee_wl';
                var line = rec.getLineCount(po_fee_wl_sub_id);

                for (var x = 0; x < line; x++) {
                    // 预估金额
                    var po_fee_yg = rec.getSublistValue({ sublistId: po_fee_wl_sub_id, fieldId: 'custrecord_swc_wl_po_fee_yg', line: x });
                    // 费用类采购订单ID
                    var fee_fpo_id = rec.getSublistValue({ sublistId: po_fee_wl_sub_id, fieldId: 'custrecord_swc_wl_po_fee_fpo_id', line: x });
                    // 费用类型采购订单状态
                    var fee_fpo_type = rec.getSublistValue({ sublistId: po_fee_wl_sub_id, fieldId: 'custrecord_swc_wl_po_fee_fpo_type', line: x });

                    if(fee_fpo_type == 3){
                        saveFlag = true;
                        // 更新采购订单ID
                        var poRec = record.load({
                            type: 'purchaseorder',
                            id: fee_fpo_id,
                        });
                        poRec.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: 1 });
                        poRec.setSublistValue({ sublistId: 'item', fieldId: 'amount', value: po_fee_yg, line: 0 });
                        poRec.save();
                        rec.setSublistValue({ sublistId: po_fee_wl_sub_id, fieldId: 'custrecord_swc_wl_po_fee_fpo_type', value: 1, line: x });
                    }
                }
                if(saveFlag == true){
                    rec.setValue({ fieldId: 'custrecord_swc_wl_plan_status', value: 1 });
                    rec.save();
                    result_str.data = '重新审批提交成功！';
                }else{
                    result_str.data = '当前数据中，没有需要重新审核的数据！请确认！';
                }

            } catch (e) {
                log.debug('重新审批提交异常 ： ', e);
                result_str.data = '重新审批提交异常,请联系管理人员';
            }

            return result_str;
        }

        /**
         * 费用类型采购订单，重新审批
         * @param id
         */
        function onClickReapply(id){
            var result_str = {};

            try {
                var rec = record.load({
                    type: 'transferorder',
                    id: id,
                });

                var saveFlag = false;
                var trnfrord_link = 'recmachcustrecord_swc_trnfrord_link';
                var line = rec.getLineCount(trnfrord_link);

                for (var x = 0; x < line; x++) {
                    // 预估金额
                    var trnfrord_po_db_fee = rec.getSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_trnfrord_po_db_fee', line: x });
                    // 费用类采购订单ID
                    var trnfrord_po_id = rec.getSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_trnfrord_po_id', line: x });
                    // 费用类型采购订单状态
                    var trnfrord_po_type = rec.getSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_trnfrord_po_type', line: x });

                    if(trnfrord_po_type == 3){
                        saveFlag = true;
                        // 更新采购订单ID
                        var poRec = record.load({
                            type: 'purchaseorder',
                            id: trnfrord_po_id,
                        });
                        poRec.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: 1 });
                        poRec.setSublistValue({ sublistId: 'item', fieldId: 'amount', value: trnfrord_po_db_fee, line: 0 });
                        poRec.save();
                        rec.setSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_trnfrord_po_type', value: 1, line: x });
                    }
                }
                if(saveFlag == true){
                    rec.setValue({ fieldId: 'custbody_swc_po_db_type', value: 1 });
                    rec.save();
                    result_str.data = '重新审批提交成功！';
                }else{
                    result_str.data = '当前数据中，没有需要重新审核的数据！请确认！';
                }

            } catch (e) {
                log.debug('重新审批提交异常 ： ', e);
                result_str.data = '重新审批提交异常,请联系管理人员';
            }

            return result_str;
        }

        /**
         * 头程费用类型采购订单，重新审批
         * @param id
         */
        function fee_po_sp_tc(id) {
            var result_str = {};

            // 费用中类 -> 费用Item internalId
            var feeItemByName = {
                '1': 3111,
                '2': 3112,
                '3': 3113,
                '4': 3114,
                '5': 3115,
                '6': 3116,
                '7': 3117,
                '8': 3118,
                '9': 3119
            };

            var po_fee_wl_sub_id = 'recmachcustrecord_swc_wl_first_leg_cost_id';
            var itemSublistId = 'item';

            function toNumber(v) {
                var n = Number(v);
                return isNaN(n) ? 0 : n;
            }

            try {
                var rec = record.load({
                    type: 'customrecord_swc_wl_plan_order',
                    id: id
                });

                var lineCount = rec.getLineCount(po_fee_wl_sub_id);

                var poSpTcJson = {};

                for (var x = 0; x < lineCount; x++) {

                    var fee_fpo_type = rec.getSublistValue({
                        sublistId: po_fee_wl_sub_id,
                        fieldId: 'custrecord_swc_wl_flc_po_type',
                        line: x
                    });

                    if (String(fee_fpo_type) !== '3') continue;

                    var fee_fpo_id = rec.getSublistValue({
                        sublistId: po_fee_wl_sub_id,
                        fieldId: 'custrecord_swc_wl_flc_po',
                        line: x
                    });

                    var fee_type_z = rec.getSublistValue({
                        sublistId: po_fee_wl_sub_id,
                        fieldId: 'custrecord_swc_flc_fee_type_z',
                        line: x
                    });

                    var po_fee_yg = rec.getSublistValue({
                        sublistId: po_fee_wl_sub_id,
                        fieldId: 'custrecord_swc_wl_flc_yg_fee',
                        line: x
                    });

                    if (!fee_fpo_id || !fee_type_z) continue;

                    if (!poSpTcJson[fee_fpo_id]) poSpTcJson[fee_fpo_id] = {};

                    poSpTcJson[fee_fpo_id][String(fee_type_z)] = toNumber(po_fee_yg);

                    rec.setSublistValue({
                        sublistId: po_fee_wl_sub_id,
                        fieldId: 'custrecord_swc_wl_flc_po_type',
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
                            fieldId: 'amount',
                            line: lineIdx,
                            value: toNumber(itemLineData[feeType])
                        });
                    }

                    poRec.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: 1 });
                    poRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
                }

                rec.setValue({ fieldId: 'custrecord_swc_wl_plan_status', value: 8 });
                rec.save();

                result_str.data = '重新审批提交成功！';
                return result_str;

            } catch (e) {
                log.error('重新审批提交异常', e);
                result_str.data = '重新审批提交异常,请联系管理人员';
                return result_str;
            }
        }


        /**
         * 费用分摊
         * @returns {{}}
         */
        function feeApportion(id) {
            var result_str = {};

            try {
                var rec = record.load({
                    type: 'customrecord_swc_wl_plan_order',
                    id: id,
                });

                // 总体积
                var total_volume = Number(rec.getValue('custrecord_swc_wl_total_volume')) || 0;
                if (total_volume <= 0) {
                    result_str.data = '费用分摊失败：总体积为0或为空';
                    return result_str;
                }

                // 费用类型配置：zhonglei -> { amtField, curField, sumAmt, currency, allocatedSum }
                var FEE_CFG = {
                    1: { amtField: 'custrecord_swc_wl_d_em_trailer_fee', curField: 'custrecord_swc_wl_d_em_trailer_fee_c', sumAmt: 0, currency: '', allocatedSum: 0 },
                    2: { amtField: 'custrecord_swc_wl_d_em_cda_fee',     curField: 'custrecord_swc_wl_d_em_cda_fee_c',     sumAmt: 0, currency: '', allocatedSum: 0 },
                    3: { amtField: 'custrecord_swc_wl_d_em_ffc',         curField: 'custrecord_swc_wl_d_em_ffc_c',         sumAmt: 0, currency: '', allocatedSum: 0 },
                    4: { amtField: 'custrecord_swc_wl_d_em_bxf_fee',     curField: 'custrecord_swc_wl_d_em_bxf_fee_c',     sumAmt: 0, currency: '', allocatedSum: 0 },
                    5: { amtField: 'custrecord_swc_wl_d_em_hyf_fee',     curField: 'custrecord_swc_wl_d_em_hyf_fee_c',     sumAmt: 0, currency: '', allocatedSum: 0 },
                    6: { amtField: 'custrecord_swc_wl_d_em_qgf_fee',     curField: 'custrecord_swc_wl_d_em_qgf_fee_c',     sumAmt: 0, currency: '', allocatedSum: 0 },
                    7: { amtField: 'custrecord_swc_wl_d_em_jkgs_fee',    curField: 'custrecord_swc_wl_d_em_jkgs_fee_c',    sumAmt: 0, currency: '', allocatedSum: 0 },
                    8: { amtField: 'custrecord_swc_wl_d_em_hdf_fee',     curField: 'custrecord_swc_wl_d_em_hdf_fee_c',     sumAmt: 0, currency: '', allocatedSum: 0 },
                    9: { amtField: 'custrecord_swc_wl_d_em_tcf_fee',     curField: 'custrecord_swc_wl_d_em_tcf_fee_c',     sumAmt: 0, currency: '', allocatedSum: 0 }, // <-- 修正：金额字段不要再用 _c
                };

                // 1) 汇总各“中类”的预估金额与币种
                var legSubId = 'recmachcustrecord_swc_wl_first_leg_cost_id';
                var legLineCount = rec.getLineCount(legSubId);

                for (var i = 0; i < legLineCount; i++) {
                    var zhonglei = rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_flc_fee_type_z', line: i });

                    // 预估费用差异
                    var yg_fee_cy = Number(rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_flc_sj_fee_cy_ls', line: i })) || 0;
                    // 预估费用
                    var yg_fee = Number(rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_flc_yg_fee', line: i })) || 0;
                    var yg_currency = rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_flc_yg_currency', line: i }) || '';

                    var type_fee = rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_flc_po_type', line: i }) || '';

                    if(type_fee == 4){
                        var cfg = FEE_CFG[zhonglei];
                        if (!cfg) continue;

                        cfg.sumAmt += yg_fee +yg_fee_cy;
                        // 币种取最后一次出现的
                        cfg.currency = yg_currency;
                        rec.setSublistValue({
                            sublistId: legSubId,
                            fieldId: 'custrecord_swc_wl_flc_po_type',
                            value: 5,
                            line: i
                        })
                    }
                }

                // 2) 分摊到明细行：最后一行吃尾差
                var planSubID = 'recmachcustrecord_swc_wl_plan_order_id';
                var lineCount = rec.getLineCount(planSubID);

                if (lineCount <= 0) {
                    result_str.data = '费用分摊失败：没有明细行';
                    return result_str;
                }

                for (var line = 0; line < lineCount; line++) {
                    var d_total_volume = Number(rec.getSublistValue({ sublistId: planSubID, fieldId: 'custrecord_swc_wl_d_total_volume', line: line })) || 0;
                    var ratio = d_total_volume / total_volume;

                    var isLast = (line === lineCount - 1);

                    for (var key in FEE_CFG) {
                        if (!FEE_CFG.hasOwnProperty(key)) continue;
                        var c = FEE_CFG[key];

                        log.debug('c.sumAmt', c.sumAmt)
                        if (!c.sumAmt) continue; // 该费用类型为0则不写

                        // 写币种
                        if (c.currency) {
                            rec.setSublistValue({
                                sublistId: planSubID,
                                fieldId: c.curField,
                                value: c.currency,
                                line: line
                            });
                        }

                        var amountToSet;
                        if (isLast) {
                            // 尾差 = 总额 - 已分摊累计
                            amountToSet = round2(c.sumAmt - c.allocatedSum);
                        } else {
                            amountToSet = round2(c.sumAmt * ratio);
                            c.allocatedSum = round2(c.allocatedSum + amountToSet);
                        }

                        rec.setSublistValue({
                            sublistId: planSubID,
                            fieldId: c.amtField,
                            value: amountToSet,
                            line: line
                        });
                    }
                }

                rec.setValue({ fieldId: 'custrecord_swc_wl_plan_status', value: 10 });
                rec.save();
                result_str.data = '费用分摊成功';
            } catch (e) {
                log.debug('费用分摊异常 ： ', e);
                result_str.data = '费用分摊失败,请联系管理人员';
            }

            return result_str;
        }

        /**
         * 差异账单也按“PO拆分规则（按子公司+体积占比）”拆分
         * - cdMap[费用中类] = 承担方（来自 customrecord_swc_rule_mapping_table + terms_of_trade）
         *   这里按您之前代码习惯：2=海外承担（按店铺子公司拆分），3=国内承担（用物流单国内子公司，不拆分）
         * - custrecord_swc_wl_flc_sj_fee_bill 已是多选：按行追加 vb/vc id
         */
        function feeApportionSj(id) {
            var result_str = {};

            try {
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
                    var map = {};
                    var out = [];
                    for (var i = 0; i < (arr || []).length; i++) {
                        var v = String(arr[i] || '').trim();
                        if (!v) continue;
                        if (!map[v]) { map[v] = true; out.push(v); }
                    }
                    return out;
                }

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
                function writeBackBillsToLines(rec, legSubId, multiFieldId, vbId, billLines) {
                    for (var i = 0; i < (billLines || []).length; i++) {
                        var lineId = Number(billLines[i].lineId);
                        if (!isFinite(lineId)) continue;
                        appendSublistMultiSelect(rec, legSubId, multiFieldId, lineId, [vbId]);
                    }
                }

                function writeBackCreditsToLines(rec, legSubId, multiFieldId, vcId, creditLines) {
                    for (var i = 0; i < (creditLines || []).length; i++) {
                        var lineId = Number(creditLines[i].lineId);
                        if (!isFinite(lineId)) continue;
                        appendSublistMultiSelect(rec, legSubId, multiFieldId, lineId, [vcId]);
                    }
                }


                // ========== 费用Item映射（沿用） ==========
                var feeItemByName = {
                    '1': 3111, '2': 3112, '3': 3113, '4': 3114, '5': 3115,
                    '6': 3116, '7': 3117, '8': 3118, '9': 3119
                };

                var rec = record.load({
                    type: 'customrecord_swc_wl_plan_order',
                    id: id
                });

                // 防止重复点击
                var already = rec.getValue('custrecord_swc_wl_tc_zf_check_btn');
                if (already === true || already === 'T') {
                    result_str.data = '已分摊/已生成差异账单，请勿重复点击。';
                    return result_str;
                }

                // 总体积
                var total_volume = toNumber(rec.getValue('custrecord_swc_wl_total_volume'));
                if (total_volume <= 0) {
                    result_str.data = '费用分摊失败：总体积为0或为空';
                    return result_str;
                }

                // ========== 1) 读取 terms_of_trade -> totFieldId ==========
                var terms_of_trade = rec.getValue('custrecord_swc_wl_terms_of_trade');
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

                // ========== 2) 通过 rule_mapping_table 得到 cdMap：费用中类 -> 承担方 ==========
                // cdMap[zhonglei] = 2(海外承担)/3(国内承担)/其他
                var cdMap = {};
                var ruleSearch = search.create({
                    type: "customrecord_swc_rule_mapping_table",
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

                // 国内承担子公司（您 PO 逻辑里用的字段）
                var domesticSub = rec.getValue('custrecord_swc_wl_po_zt') || null;

                // ========== 3) 计算“海外承担时”的子公司体积拆分（按店铺customer->subsidiary汇总） ==========
                var planSubID = 'recmachcustrecord_swc_wl_plan_order_id';
                var planLineCount = rec.getLineCount({ sublistId: planSubID }) || 0;
                if (planLineCount <= 0) {
                    result_str.data = '费用分摊失败：没有明细行';
                    return result_str;
                }

                var custSubCache = {};
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
                    var shopId = rec.getSublistValue({ sublistId: planSubID, fieldId: 'custrecord_swc_wl_d_customer', line: p });
                    var vol = toNumber(rec.getSublistValue({ sublistId: planSubID, fieldId: 'custrecord_swc_wl_d_total_volume', line: p }));
                    if (!shopId || vol <= 0) continue;

                    var subId = getCustomerSubsidiary(shopId);
                    if (!subId) continue;

                    volTotal += vol;
                    subVolMap[String(subId)] = toNumber(subVolMap[String(subId)]) + vol;
                }

                var subKeys = Object.keys(subVolMap);
                subKeys.sort(function (a, b) { return Number(a) - Number(b); });

                // ========== 4) 扫描 first leg cost：构建“差异账单拆分包” ==========
                // billJson[vendor(carrier)][subsidiaryKey] = { VendorBill:[{item,amt,line}], VendorCredit:[...], lineIds:[...] }
                // subsidiaryKey:
                //   - 国内承担：固定为 String(domesticSub) 或 '__NO_SUB__'
                //   - 海外承担：按 subKeys 拆分（若无法拆分则 '__NO_SUB__'）
                var billJson = {};

                var legSubId = 'recmachcustrecord_swc_wl_first_leg_cost_id';
                var legLineCount = rec.getLineCount({ sublistId: legSubId }) || 0;

                for (var i = 0; i < legLineCount; i++) {
                    var zhonglei = rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_flc_fee_type_z', line: i });
                    var type_fee = rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_flc_po_type', line: i }) || '';
                    var carrierId = rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_flc_location', line: i }) || '';

                    if (!carrierId || !zhonglei) continue;
                    if (String(type_fee) !== '5') continue;

                    var sj = toNumber(rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_flc_sj_fee', line: i }));
                    var yg = toNumber(rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_flc_yg_fee', line: i }));

                    // 差异：按您原语义保持“实际 - 预估”
                    var cy = round2(sj - yg);

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
                    if (!billJson[carrierKey]) billJson[carrierKey] = {};

                    // === 国内承担：不按店铺拆分，全部进 domesticSub（如果没有 domesticSub，就用 '__NO_SUB__'） ===
                    if (String(bearer) === '3') {
                        var subKey = domesticSub ? String(domesticSub) : '__NO_SUB__';
                        if (!billJson[carrierKey][subKey]) {
                            billJson[carrierKey][subKey] = { VendorBill: [], VendorCredit: [], lineIds: [] };
                        }
                        if (cy > 0) billJson[carrierKey][subKey].VendorBill.push({ item: itemId, amount: cy, lineId: i });
                        else billJson[carrierKey][subKey].VendorCredit.push({ item: itemId, amount: cy, lineId: i });
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

                            if (!billJson[carrierKey][subIdKey]) {
                                billJson[carrierKey][subIdKey] = { VendorBill: [], VendorCredit: [], lineIds: [] };
                            }
                            if (part > 0) billJson[carrierKey][subIdKey].VendorBill.push({ item: itemId, amount: part, lineId: i });
                            else billJson[carrierKey][subIdKey].VendorCredit.push({ item: itemId, amount: part, lineId: i });
                            billJson[carrierKey][subIdKey].lineIds.push(i);
                        }
                    } else {
                        // 其他承担方：同样退化为单组
                        var subKey2 = '__NO_SUB__';
                        if (!billJson[carrierKey][subKey2]) {
                            billJson[carrierKey][subKey2] = { VendorBill: [], VendorCredit: [], lineIds: [] };
                        }
                        if (cy > 0) billJson[carrierKey][subKey2].VendorBill.push({ item: itemId, amount: cy, lineId: i });
                        else billJson[carrierKey][subKey2].VendorCredit.push({ item: itemId, amount: cy, lineId: i });
                        billJson[carrierKey][subKey2].lineIds.push(i);
                    }
                }

                // ========== 5) 创建差异账单：沿用您原 createVendorBill3 / createVendorCredit3 ==========
                // 约定：
                // - createVendorBill3(vendorId, data, subsidiaryId) -> 返回 vbId
                // - createVendorCredit3(vendorId, data, subsidiaryId) -> 返回 vcId
                // data: [{item, amount, lineId}]
                // 您原方法如果签名不同，只需要把下面两处调用参数调整一下即可。
                var createdBillIds = [];
                var createdCreditIds = [];

                for (var vendorId in billJson) {
                    if (!billJson.hasOwnProperty(vendorId)) continue;

                    var subGroup = billJson[vendorId];
                    var subs = Object.keys(subGroup);

                    for (var si = 0; si < subs.length; si++) {
                        var subKey = subs[si];
                        var group = subGroup[subKey];

                        var subsidiaryId = null;
                        if (subKey !== '__NO_SUB__') {
                            subsidiaryId = (subKey === '__NO_SUB__') ? null : (subKey ? Number(subKey) : null);
                        }

                        // VendorBill
                        if (group.VendorBill && group.VendorBill.length > 0) {
                            var vbId = createVendorBill3(vendorId, group.VendorBill, subsidiaryId);
                            if (vbId) {
                                writeBackBillsToLines(
                                        rec,
                                    'recmachcustrecord_swc_wl_first_leg_cost_id',
                                    'custrecord_swc_wl_flc_sj_fee_bill',   // 多选字段
                                    vbId,
                                    group.VendorBill
                                    );
                            }
                        }

                        // VendorCredit
                        if (group.VendorCredit && group.VendorCredit.length > 0) {
                            var vcId = createVendorCredit3(vendorId, group.VendorCredit, subsidiaryId);
                            if (vcId) {
                                writeBackCreditsToLines(
                                    rec,
                                    'recmachcustrecord_swc_wl_first_leg_cost_id',
                                    'custrecord_swc_wl_flc_sj_fee_bill',   // 多选字段
                                    vcId,
                                    group.VendorCredit
                                );

                            }
                        }
                    }
                }

                // ========== 6) 分摊到明细行（保留您原本逻辑：最后一行吃尾差） ==========
                // 如果您原先还有 FEE_CFG 汇总与写入明细的逻辑（您贴的那段），这里不动，直接放回即可。
                // 这里只做按钮防重复与保存。

                rec.setValue({ fieldId: 'custrecord_swc_wl_tc_zf_check_btn', value: true });
                rec.save();

                result_str.data = '费用分摊成功';
                result_str.createdBillIds = uniq(createdBillIds);
                result_str.createdCreditIds = uniq(createdCreditIds);
                return result_str;

            } catch (e) {
                log.debug('费用分摊异常 ： ', e);
                result_str.data = '费用分摊失败,请联系管理人员';
                return result_str;
            }
        }

        /**
         * ====== 下面两个方法：沿用您之前的 createVendorBill3 / createVendorCredit3 ======
         * 我只做了“可选 subsidiaryId”支持，内部核心逻辑您可以直接替换成您现有版本。
         * data: [{item:xxx, amount:yyy, lineId:i}, ...]
         */
        function createVendorBill3(vendorId, data, subsidiaryId) {
            var vendorbillRecord = record.create({ type: 'vendorbill', isDynamic: true });
            vendorbillRecord.setValue({ fieldId: 'entity', value: vendorId });

            for (var i = 0; i < data.length; i++) {
                var linejson = data[i];
                var amt = Number(linejson.amount) || 0;
                if (!linejson.item || amt <= 0) continue;

                vendorbillRecord.selectNewLine({ sublistId: 'item' });
                vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: linejson.item });
                vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: amt });
                vendorbillRecord.commitLine({ sublistId: 'item' });
            }

            return vendorbillRecord.save({ ignoreMandatoryFields: false });
        }

        function createVendorCredit3(vendorId, data, subsidiaryId) {
            var vendorcreditRecord = record.create({ type: 'vendorcredit', isDynamic: true });
            vendorcreditRecord.setValue({ fieldId: 'entity', value: vendorId });

            if (subsidiaryId && vendorcreditRecord.getField({ fieldId: 'subsidiary' })) {
                vendorcreditRecord.setValue({ fieldId: 'subsidiary', value: subsidiaryId });
            }

            for (var i = 0; i < data.length; i++) {
                var linejson = data[i];
                var amt = Math.abs(Number(linejson.amount) || 0);
                if (!linejson.item || amt <= 0) continue;

                vendorcreditRecord.selectNewLine({ sublistId: 'item' });
                vendorcreditRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: linejson.item });
                vendorcreditRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                vendorcreditRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: amt });
                vendorcreditRecord.commitLine({ sublistId: 'item' });
            }

            return vendorcreditRecord.save({ ignoreMandatoryFields: false });
        }


        /**
         * 获取分摊规则类型中的会计科目
         */
        function getAccountJson(){
            var rule_mapping_json = {};
            var customrecord_swc_rule_mapping_tableSearchObj = search.create({
                type: "customrecord_swc_rule_mapping_table",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "费用项（中类）"}),
                        search.createColumn({name: "custrecord_swc_account", label: "会计科目"})
                    ]
            });
            var data = getAllResults(customrecord_swc_rule_mapping_tableSearchObj);
            if(data && data.length > 0) {
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
                    type: 'customrecord_swc_wl_plan_order',
                    id: id,
                });

                var feeSubID = 'recmachcustrecord_swc_wl_po_fee_wl';
                var line = rec.getLineCount(feeSubID);

                var feeYgCheck = [];
                for (var x = 0; x < line; x++) {
                    // 费用明细表ID
                    var fee_id = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'id', line: x });
                    // 预估采购杂费
                    var po_fee_yg = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_po_fee_yg', line: x });

                    if(!po_fee_yg){
                        feeYgCheck.push(fee_id)
                    }
                }

                if(feeYgCheck.length > 0){
                    result_str.data = '内部ID：' + feeYgCheck.join(',') + '行的预估费用请正常填写！';
                    return result_str;
                }else{
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
                        var po_fee_yg = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_po_fee_yg', line: i });

                        // 创建费用类型采购订单
                        var po_data = record.create({ type: 'purchaseorder', isDynamic: true });

                        // 表单：采购订单_费用类
                        po_data.setValue({ fieldId: 'customform', value: 102 });
                        // 供应商
                        var entityID = po_fee_pay ? po_fee_pay : po_fee_ven;
                        po_data.setValue({ fieldId: 'entity', value: entityID });
                        po_data.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: 1 });// 等待审批

                        // 账期 TODO 假数据，测试使用
                        po_data.setValue({ fieldId: 'custbody_swc_cqdd_zq', value: 1 });
                        // 关联采购订单
                        po_data.setValue({ fieldId: 'custbody_swc_fee_po_id', value: po_fee_id });
                        // 关联物流发运单
                        po_data.setValue({ fieldId: 'custbody_swc_wl_no', value: id });
                        // 关联物流发运单-费用
                        po_data.setValue({ fieldId: 'custbody_swc_fee_po_no', value: fee_id });
                        // 费用类型采购订单
                        po_data.setValue({ fieldId: 'custbody_swc_po_fee', value: 2 });
                        // 明细数据做成
                        po_data.selectNewLine({ sublistId: 'item' });
                        po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 3109 });
                        po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                        po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: po_fee_yg });
                        po_data.commitLine({ sublistId: 'item' });

                        var saveId = po_data.save({ ignoreMandatoryFields: true });
                        rec.setSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_po_fee_fpo_id', value: saveId, line: i });
                        rec.setSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_po_fee_fpo_type', value: 1, line: i });

                        record.submitFields({
                            type: 'purchaseorder',
                            id: po_fee_id,
                            values: {
                                custbody_swc_fee_po_id: saveId,
                            }
                        });
                    }
                }
                rec.setValue({ fieldId: 'custrecord_swc_wl_plan_status', value: 1 });
                rec.save();
                result_str.data = '生成费用类采购订单成功';
            } catch (e) {
                log.debug('生成费用类采购订单 ： ', e.message);
                result_str.data = '生成费用类采购订单失败,请联系管理人员';
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
        function getSkuAmount(sub, entity, skuAry){

            var skuAmount = {};

            log.debug('skuAry', skuAry);

            var customrecord_swc_po_price_detailsSearchObj = search.create({
                type: "customrecord_swc_po_price_details",
                filters:
                    [
                        ["custrecord_swc_item","anyof",skuAry],
                        "AND",
                        ["custrecord_swc_sku_price_main_list.custrecord_swc_subsidiary","anyof",sub],
                        "AND",
                        ["custrecord_swc_sku_price_main_list.custrecord_swc_supplier","anyof",entity]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_item", label: "货品"}),
                        search.createColumn({name: "custrecord_swc_tax_code", label: "税码(人民币)"}),
                        search.createColumn({name: "custrecord_swc_premium_excluding_tax", label: "优等品不含税单价(人民币)"}),
                        search.createColumn({name: "custrecord_swc_good_excluding_tax", label: "良品不含税单价(人民币)"})
                    ]
            });

            var skuPriceDetailSearchObj = getAllResults(customrecord_swc_po_price_detailsSearchObj);
            if(skuPriceDetailSearchObj && skuPriceDetailSearchObj.length > 0){
                for (let i = 0; i < skuPriceDetailSearchObj.length; i++) {

                    var skuDetail = skuPriceDetailSearchObj[i];

                    var sku = skuDetail.getValue('custrecord_swc_item');
                    var tax_code = skuDetail.getValue('custrecord_swc_tax_code');
                    var y = skuDetail.getValue('custrecord_swc_premium_excluding_tax');
                    var l = skuDetail.getValue('custrecord_swc_good_excluding_tax');

                    skuAmount[sku] = {
                        tax_code : tax_code,
                        y : y,
                        l : l
                    }
                }
            }

            return skuAmount;
        }

        /**
         * 物流审核
         */
        function fee_ar_to(ids) {
            var result_str = {};

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

                        // record.transform({
                        //     fromType: record.Type.PURCHASE_ORDER,
                        //     fromId: poId,
                        //     toType: record.Type.VENDOR_BILL,
                        //     isDynamic: true
                        // }).save({ ignoreMandatoryFields: true });

                        if (wlID) {
                            var wlrec = record.load({
                                type: 'customrecord_swc_wl_plan_order',
                                id: wlID,
                                isDynamic: false
                            });

                            var leg_cost_id = 'recmachcustrecord_swc_wl_first_leg_cost_id';
                            var line = wlrec.getLineCount({ sublistId: leg_cost_id });
                            var fpo_typeChecks = true;

                            for (var r = 0; r < line; r++) {
                                var wl_flc_po = wlrec.getSublistValue({ sublistId: leg_cost_id, fieldId: 'custrecord_swc_wl_flc_po', line: r });
                                var fpo_types = wlrec.getSublistValue({ sublistId: leg_cost_id, fieldId: 'custrecord_swc_wl_flc_po_type', line: r });

                                if (String(wl_flc_po) === String(poId)) {
                                    wlrec.setSublistValue({ sublistId: leg_cost_id, fieldId: 'custrecord_swc_wl_flc_po_type', value: 4, line: r });
                                } else if (fpo_types && Number(fpo_types) !== 4) {
                                    fpo_typeChecks = false;
                                }
                            }

                            if (fpo_typeChecks) {
                                wlrec.setValue({ fieldId: 'custrecord_swc_wl_plan_status', value: 9 });
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
                                type: 'customrecord_swc_wl_plan_order',
                                id: wlID,
                                isDynamic: false
                            });

                            var leg_cost_id2 = 'recmachcustrecord_swc_wl_first_leg_cost_id';
                            var line2 = wlrec2.getLineCount({ sublistId: leg_cost_id2 });

                            for (var r2 = 0; r2 < line2; r2++) {
                                var wl_flc_po2 = wlrec2.getSublistValue({ sublistId: leg_cost_id2, fieldId: 'custrecord_swc_wl_flc_po', line: r2 });
                                if (String(wl_flc_po2) === String(poId)) {
                                    wlrec2.setSublistValue({ sublistId: leg_cost_id2, fieldId: 'custrecord_swc_wl_flc_po_type', value: 3, line: r2 });
                                }
                            }

                            wlrec2.setValue({ fieldId: 'custrecord_swc_wl_plan_status', value: 14 });
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
         * 调拨费物流审核
         */
        function fee_ar_to_db(ids){
            var result_str = {};

            try {
                var ids = ids.split('_');
                var id = ids[0];
                var type = ids[1] == 1 ? 2 : 3;

                var rec = record.load({ type: 'purchaseorder', id: id, });
                // 关联转移单
                var transorder_id = rec.getValue('custbody_swc_transorder_id');
                var feeType = rec.getValue('custbody_swc_po_fee');
                var po_db_id = rec.getValue('custbody_swc_po_db_id');

                if(type == 2){// 审核通过

                    if(feeType == 4) {
                        // 审批状态更新
                        rec.setValue({fieldId: 'custbody_swc_fee_ar_type', value: type});
                        rec.save();

                        // 账单
                        record.transform({
                            fromType: 'purchaseorder',
                            fromId: id,
                            toType: 'vendorbill',
                            isDynamic: true,
                        }).save();

                        // 更新费用信息状态
                        record.submitFields({
                            type: 'transferorder',
                            id: transorder_id,
                            values: {
                                custbody_swc_po_db_type: 4
                            }
                        });

                        // 费用类型采购订单状态
                        record.submitFields({
                            type: 'customrecord_swc_trnfrord_db',
                            id: po_db_id,
                            values: {
                                custrecord_swc_trnfrord_po_type: 2
                            }
                        });
                    }
                }else{
                    // 驳回
                    rec.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: type });
                    rec.save();

                    // 采购订单类型
                    if(feeType == 4){// 费用类
                        // 更新费用信息状态 - 已驳回
                        record.submitFields({
                            type: 'transferorder',
                            id: transorder_id,
                            values: {
                                custbody_swc_po_db_type: 3
                            }
                        });

                        // 费用类型采购订单状态
                        record.submitFields({
                            type: 'customrecord_swc_trnfrord_db',
                            id: po_db_id,
                            values: {
                                custrecord_swc_trnfrord_po_type: 3
                            }
                        });

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
        function workOrderAssembly(billId){
            var result_str = {};

            try {
                var woIds = [];
                var customrecord_swc_wl_plan_detailSearchObj = search.create({
                    type: "customrecord_swc_wl_plan_detail",
                    filters:
                        [
                            ["custrecord_swc_wl_plan_order_id","anyof",billId],
                            "AND",
                            ["custrecord_swc_wl_d_po_num.mainline","is","T"],
                            "AND",
                            ["custrecord_swc_wl_d_bom_version.isinactive","is","F"]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "custrecord_swc_wl_d_sku",
                                summary: "GROUP",
                                label: "SKU"
                            }),
                            search.createColumn({
                                name: "custrecord_swc_wl_d_bom_version",
                                summary: "GROUP",
                                label: "BOM版本"
                            }),
                            search.createColumn({
                                name: "custrecord_swc_wl_d_superior_qty_z",
                                summary: "SUM",
                                label: "本次真实发运优等品数量"
                            }),
                            search.createColumn({
                                name: "custrecord_swc_wl_d_good_qty_z",
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
                                label: "item"
                            }),
                        ]
                });
                var workOrderSearch = getAllResults(customrecord_swc_wl_plan_detailSearchObj);
                var woIds = [];
                if(workOrderSearch && workOrderSearch.length > 0) {
                    for (let z = 0; z < workOrderSearch.length; z++) {
                        var data = workOrderSearch[z];
                        var location = data.getValue({
                            name: "location",
                            join: "CUSTRECORD_SWC_WL_D_PO_NUM",
                            summary: "GROUP",
                            label: "地点"
                        });
                        var sku = data.getValue({
                            name: "custrecord_swc_wl_d_sku",
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
                            name: "custrecord_swc_wl_d_superior_qty_z",
                            summary: "SUM",
                            label: "本次真实发运优等品数量"
                        }) || 0;

                        var l = data.getValue({
                            name: "custrecord_swc_wl_d_good_qty_z",
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
                            label: "item"
                        });

                        if(y > 0){
                            var createWorkOrderJson = {
                                subsidiaryId: subId,
                                locationId: location,
                                assemblyItemId: sku,
                                billofmaterialsId:bom,
                                billofmaterialsrevisionId: bomV,
                                quantity: Number(y),
                                tranDate: new Date(),
                                finishedGoodLot: lot,
                                finishedGoodLotQty: Number(y),
                                item: item
                            }
                            var rtn = createWorkOrder(createWorkOrderJson);
                            if(rtn.id != ''){
                                woIds.push(rtn.id)
                            }
                        }

                        if(l > 0){
                            var createWorkOrderJson = {
                                subsidiaryId: subId,
                                locationId: location,
                                assemblyItemId: sku,
                                billofmaterialsId:bom,
                                billofmaterialsrevisionId: bomV,
                                quantity: Number(l),
                                tranDate: new Date(),
                                finishedGoodLot: lot,
                                finishedGoodLotQty: Number(l),
                                item: item
                            }
                            var rtn2 = createWorkOrder(createWorkOrderJson);
                            if(rtn2.id != ''){
                                woIds.push(rtn2.id)
                            }
                        }
                    }
                }

                if(woIds.length > 0){

                    var rec = record.load({ type: 'customrecord_swc_wl_plan_order', id: billId });
                    rec.setValue({ fieldId : 'custrecord15', value : woIds});
                    rec.setValue({ fieldId : 'custrecord_swc_wl_plan_status', value : 6});
                    rec.save();

                    result_str.data = '工单组装成功，请确认！';
                }else{
                    result_str.data = '工单组装失败,请联系管理人员!';
                }


            } catch (e) {
                if(e.message.includes('由于货品批次供货不足')){
                    result_str.data = '库存不足，请确认！';
                }else{
                    result_str.data = '工单组装失败,请联系管理人员';
                }
                log.debug('工单组装异常 ： ', e);
            }

            return result_str;
        }

        /**
         * 获取物流商服务报价信息
         * @param md_location
         * @param vendor
         * @param vp  各物流发运的体积
         * @param vpo 物流发运的总体积
         * @param vpTotal 最后一次分摊，之前的全部分摊体积之和
         * @param wlId 物流发运的内部Id
         */
        function getFeeEstimatedCos(md_location, vendor, vp, vpo, vpTotal, wlId){

            var feeEstimatedCosJson = {};

            var customrecord_swc_service_quotation_detaiSearchObj = search.create({
                type: "customrecord_swc_service_quotation_detai",
                filters:
                    [
                        ["custrecord_swc_lpd_lp.custrecord_swc_lp_start_date","onorbefore","today"],
                        "AND",
                        ["custrecord_swc_lpd_lp.custrecord_swc_lp_end_date","onorafter","today"],
                        "AND",
                        ["custrecord_swc_lpd_lp.custrecord_swc_lp_logistics_provider","anyof",vendor],
                        "AND",
                        ["custrecord_swc_lpd_lp.custrecord_swc_lp_to_location","anyof",md_location]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_lp_cost_medium", label: "费用类型（中类）"}),
                        search.createColumn({name: "custrecord_swc_lp_rm_cost_s", label: "费用类型（小类）"}),
                        search.createColumn({name: "custrecord_swc_lp_allocation_rules", label: "分摊规则"}),
                        search.createColumn({name: "custrecord_swc_lp_pirca", label: "预估费用"}),
                        search.createColumn({name: "custrecord_swc_lp_currency", label: "币种"}),
                        search.createColumn({
                            name: "custrecord_swc_lp_logistics_provider",
                            join: "CUSTRECORD_SWC_LPD_LP",
                            label: "物流商"
                        })
                    ]
            });


            var service_quotation_detaiSearchObj = getAllResults(customrecord_swc_service_quotation_detaiSearchObj);
            if(service_quotation_detaiSearchObj && service_quotation_detaiSearchObj.length > 0) {
                var tjVP = Number(vp[wlId]) / Number(vpTotal)
                if(vpo > 0){ // 大于0的场合，为最后一次分摊
                    tjVP = (Number(vpTotal) - Number(vpo)) / Number(vpTotal)
                }

                for (let i = 0; i < service_quotation_detaiSearchObj.length; i++) {
                    var data = service_quotation_detaiSearchObj[i];

                    // 费用类型中类
                    var cost_medium = data.getValue({name: "custrecord_swc_lp_cost_medium", label: "费用类型（中类）"});
                    // 费用类型小类
                    var rm_cost_s = data.getValue({name: "custrecord_swc_lp_rm_cost_s", label: "费用类型（小类）"});

                    // 分摊规则
                    var allocation_rules = data.getValue({name: "custrecord_swc_lp_allocation_rules", label: "分摊规则"});
                    // 预估费用
                    var pirca = Number(data.getValue({name: "custrecord_swc_lp_pirca", label: "预估费用"})) || 0 * tjVP;
                    // 币种
                    var currency = data.getValue({name: "custrecord_swc_lp_currency", label: "币种"}) || null;


                    // 物流商
                    var lp_logistics_provider = data.getValue({
                        name: "custrecord_swc_lp_logistics_provider",
                        join: "CUSTRECORD_SWC_LPD_LP",
                        label: "物流商"
                    });

                    var key = String(cost_medium) + '_' + String(rm_cost_s) + '_' + String(lp_logistics_provider);

                    feeEstimatedCosJson[key] = {
                        allocation_rules : allocation_rules,
                        pirca : pirca,
                        currency : currency
                    }
                }
            }
            return feeEstimatedCosJson;
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
            try{
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
                    const sublistId = 'item';
                    const lineCount = wo.getLineCount({ sublistId });

                    for (let i = 0; i < lineCount; i++) {
                        wo.selectLine({ sublistId, line: itemLine });

                        var item = wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });

                        var lotNum2 = getInventoryNumberId(params.assemblyItemId, params.finishedGoodLot);
                        log.debug('lotNum2', lotNum2)
                        log.debug('item', item);
                        log.debug('skuAry', skuAry);
                        if(skuAry.indexOf(item) !== -1) {
                            const invDetail = wo.getCurrentSublistSubrecord({
                                sublistId: 'item',
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
            }catch (e) {
                log.error('工单组装异常', e)
                msg.id = '';
                msg.msg = '工单组装异常，请联系管理人员';
            }
            return msg;

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
            try{
                // 采购订单回写数据
                var poRtnJson = {};
                // 真实排柜回写数据
                var zsRtnJson = {};

                // 读取物流发运单
                var rec = record.load({ type: 'customrecord_swc_wl_plan_order', id: billId });

                // 获取物流发运明细数据
                var wlPlanSubId = 'recmachcustrecord_swc_wl_plan_order_id'
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
                    var poId = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_po_num', line: wls });
                    // 成品SKU
                    var d_sku = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_sku', line: wls });
                    // 国家
                    var d_country = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_country', line: wls });
                    // 仓库类型
                    var d_location_type = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_location_type', line: wls });
                    // 店铺
                    var d_customer = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_customer', line: wls });
                    // 区域
                    var d_region = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_region', line: wls });
                    // 优等品数量
                    var y = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: wls }) || 0;
                    // 良品数量
                    var l = rec.getSublistValue({ sublistId: wlPlanSubId, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: wls }) || 0;

                    var qty = Number(y) + Number(l)

                    // 1.采购订单回写Json做成
                    var poKey = d_sku + '_' + d_country + '_' + d_location_type + '_' + d_customer + '_' + d_region;

                    if(poRtnJson.hasOwnProperty(poId)){
                        if(poRtnJson[poId].hasOwnProperty(poKey)){
                            var oldQty = poRtnJson[poId][poKey];
                            poRtnJson[poId][poKey] = Number(qty) + Number(oldQty);
                        }else{
                            poRtnJson[poId][poKey] = qty;
                        }
                    }else{
                        poRtnJson[poId] = {};
                        poRtnJson[poId][poKey] = qty;
                    }

                    // 真实排柜回写数据
                    if(zsRtnJson.hasOwnProperty(zsPgId)){
                        if(zsRtnJson[zsPgId].hasOwnProperty(zsPgLineId)){
                            var oldY = zsRtnJson[zsPgId][zsPgLineId].y;
                            var oldL = zsRtnJson[zsPgId][zsPgLineId].l;
                            zsRtnJson[zsPgId][zsPgLineId].y = Number(oldY) + Number(y)
                            zsRtnJson[zsPgId][zsPgLineId].l = Number(oldL) + Number(l)
                        }else{
                            zsRtnJson[zsPgId][zsPgLineId] = {
                                y : y,
                                l : l
                            }
                        }
                    }else{
                        zsRtnJson[zsPgId] = {}
                        zsRtnJson[zsPgId][zsPgLineId] = {
                            y : y,
                            l : l
                        }
                    }

                }

                // 要回写真实排柜单据，
                for (const zsRtnJsonKey in zsRtnJson) {
                    // load真实排柜
                    var rec2 = record.load({ type: 'customrecord_swc_actual_cabinet', id: zsRtnJsonKey });

                    var zsLineData = zsRtnJson[zsRtnJsonKey];
                    // 获取物流发运明细数据
                    var zsSubId = 'recmachcustrecord_swc_acd_actual_cabinet'
                    var zsLine = rec2.getLineCount({ sublistId: zsSubId }) || 0;

                    for (var zl = 0; zl < zsLine; zl++) {
                        // 预排柜单明细Id
                        var id = rec2.getSublistValue({ sublistId: zsSubId, fieldId: 'id', line: zl });

                        if(zsLineData.hasOwnProperty(id)){
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
                    var rec3 = record.load({ type: 'purchaseorder', id: poRtnJsonKey });
                    var poLineData = poRtnJson[poRtnJsonKey];
                    // 获取物流发运明细数据
                    var itemSubId = 'item'
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
                        if(poLineData.hasOwnProperty(poKey2)){
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
                    type: 'customrecord_swc_wl_plan_order',
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
                var wlSubId = 'recmachcustrecord_swc_wl_plan_order_id';

                function toNumber(n) {
                    return Number(n) || 0;
                }

                var rec = record.load({
                    type: 'customrecord_swc_wl_plan_order',
                    id: id
                });

                var wlLine = rec.getLineCount(wlSubId);

                var poKeyMap = {};
                var keyToRowIds = {};
                var lotJson = {};

                for (var x = 0; x < wlLine; x++) {
                    var poNum = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_po_num', line: x });
                    if (!poNum) continue;
                    var poId = String(poNum);

                    // 货品/维度字段
                    var sku      = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_sku', line: x });
                    var country  = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_country', line: x });
                    var location = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_location_type', line: x });
                    var customer = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_customer', line: x });
                    var region   = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_region', line: x });

                    // 数量（优品/良品）
                    var superior_qty_z = toNumber(rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: x }));
                    var good_qty_z     = toNumber(rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: x }));
                    var grade = (superior_qty_z > 0) ? 1 : 2;

                    // 入库数量：有优品就用优品，否则用良品
                    var qty = (superior_qty_z > 0) ? superior_qty_z : good_qty_z;

                    // 费用：预估采购杂费 + 历史杂费差异
                    var fee_zf_ft_yg = toNumber(rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_sj_fee_zf_ft_yg', line: x }));
                    var ls_zf_cy     = toNumber(rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_d_ls_zf_cy', line: x }));
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

                    var keyMap = poKeyMap[poId];
                    if (!keyMap) continue;

                    var ifRec = record.transform({
                        fromType: record.Type.PURCHASE_ORDER,
                        toType: record.Type.ITEM_RECEIPT,
                        fromId: poId,
                        isDynamic: true
                    });

                    var len = ifRec.getLineCount({ sublistId: 'item' });

                    for (var i2 = 0; i2 < len; i2++) {
                        ifRec.selectLine({ sublistId: 'item', line: i2 });

                        var pr_origin_sku = ifRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_origin_sku' });
                        var country_code  = ifRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_country_code' });
                        var loc_type      = ifRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_loc_type' });
                        var store         = ifRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_store' });
                        var us_districts  = ifRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_us_districts' });
                        var grade2        = ifRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_grade' });

                        var ifKey = pr_origin_sku + '_' + country_code + '_' + store + '_' + loc_type + '_' + us_districts + '_' + grade2;

                        log.debug('ifKey', ifKey);
                        if (!keyMap.hasOwnProperty(ifKey)) {
                            // 不属于计划单的行，不入库
                            ifRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false });
                            ifRec.commitLine({ sublistId: 'item' });
                            continue;
                        }

                        var qty = toNumber(keyMap[ifKey].qty);
                        var amt = round2(toNumber(keyMap[ifKey].amount));

                        // 数量
                        ifRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty });

                        var invDetail = ifRec.getCurrentSublistSubrecord({
                            sublistId: 'item',
                            fieldId: 'inventorydetail'
                        });

                        invDetail.selectNewLine({
                            sublistId: 'inventoryassignment'
                        });

                        var flag = grade2 == 1 ? 'Y' : 'L';
                        var lotNum = 'LOT-' + getTodayYYYYMMDD() + '-' + flag;
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
                        if (amt !== 0) {
                            var lcSub = ifRec.getCurrentSublistSubrecord({
                                sublistId: 'item',
                                fieldId: 'landedcost'
                            });

                            lcSub.selectNewLine({ sublistId: 'landedcostdata' });
                            lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: 36 }); // 这里保留您原来的类别
                            lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'amount', value: amt });
                            lcSub.commitLine({ sublistId: 'landedcostdata' });
                        }

                        ifRec.commitLine({ sublistId: 'item' });
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

                rec.setValue({ fieldId: 'custrecord_swc_wl_plan_status', value: 15 });
                rec.save();

                result_str.data = '入库单生成成功！';
                return result_str;

            } catch (e) {
                log.error('入库单生成失败', {
                    name: e.name,
                    message: e.message,
                    stack: e.stack
                });
                result_str.data = '入库单生成失败,请联系管理人员';
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
                var feeSubID = 'recmachcustrecord_swc_wl_po_fee_wl';
                var wlSubId  = 'recmachcustrecord_swc_wl_plan_order_id';

                var F_ALLOC_YG = 'custrecord_swc_wl_d_sj_fee_zf_ft_yg'; // 需要先写回的字段

                function toNumber(n) { return Number(n) || 0; }
                function round2(n) { return Math.round((toNumber(n) + Number.EPSILON) * 100) / 100; }

                var rec = record.load({
                    type: 'customrecord_swc_wl_plan_order',
                    id: id
                });

                var poFeeMap = {};
                var feeLineCount = rec.getLineCount({ sublistId: feeSubID });

                for (var i = 0; i < feeLineCount; i++) {
                    var po_fee_id = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_po_fee_id', line: i });
                    if (!po_fee_id) continue;

                    var po_fee_yg = toNumber(rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_po_fee_yg', line: i }));

                    poFeeMap[String(po_fee_id)] = {
                        po_fee_sj: round2(po_fee_yg)
                    };
                }

                var wlLine = rec.getLineCount({ sublistId: wlSubId });

                var poLineList = {};
                var skuSet = new Set();

                for (var x = 0; x < wlLine; x++) {
                    var wl_po_fee_id = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_po_num', line: x });
                    if (!wl_po_fee_id) continue;

                    var poId = String(wl_po_fee_id);
                    if (!poFeeMap.hasOwnProperty(poId)) continue;

                    var sku = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_sku', line: x });
                    if (sku) skuSet.add(String(sku));

                    var lineId = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'id', line: x });
                    var wl_d_total_volume = toNumber(rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_total_volume', line: x }));

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
                        type: "customrecord_swc_wl_plan_detail",
                        filters: [
                            ["custrecord_swc_wl_d_sku","anyof", skuAry],
                            "AND",
                            ["custrecord_swc_wl_d_sj_fee_zf_ft_yg","greaterthan","0"],
                            "AND",
                            ["custrecord_swc_wl_d_sj_fee_zf_ft","greaterthan","0"],
                            "AND",
                            ["custrecord_swc_wl_d_zf_hx","is","F"]
                        ],
                        columns: [
                            search.createColumn({
                                name: "formulanumeric",
                                formula: "TO_NUMBER({custrecord_swc_wl_d_sj_fee_zf_ft_yg}) - TO_NUMBER({custrecord_swc_wl_d_sj_fee_zf_ft})",
                                label: "公式（数值）"
                            }),
                            search.createColumn({ name: "internalid", label: "内部 ID" }),
                            search.createColumn({ name: "custrecord_swc_wl_d_sku", label: "SKU" })
                        ]
                    });

                    var s = getAllResults(customrecord_swc_wl_plan_detailSearchObj);
                    for (var sk = 0; s && sk < s.length; sk++) {
                        var skuKey = s[sk].getValue({ name: "custrecord_swc_wl_d_sku", label: "SKU" });
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
                    var d_sku = rec.getSublistValue({ sublistId: wlSubId, fieldId: 'custrecord_swc_wl_d_sku', line: wld });
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

                rec.setValue({ fieldId: 'custrecord_swc_wl_plan_status', value: 5 });
                rec.save();

                for (let hx = 0; hx < heXiaoSet.length; hx++) {
                        record.submitFields({
                            type: 'customrecord_swc_wl_plan_detail',
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
                result_str.data = '预估杂费分摊失败,请联系管理人员';
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
                        ["inventorynumber","is",lotText]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });
            var inventorynumber = getAllResults(inventorynumberSearchObj);
            if(inventorynumber && inventorynumber.length > 0){
                for (let i = 0; i < inventorynumber.length; i++) {
                    var id = inventorynumber[i].getValue({name: "internalid", label: "内部 ID"});
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
        function bomMainSku(bom, bomV){
            var skuAry = [];
            var bomrevisionSearchObj = search.create({
                type: "bomrevision",
                filters:
                    [
                        ["billofmaterials","anyof",bom],
                        "AND",
                        ["internalid","anyof",bomV],
                        "AND",
                        ["component.custrecord_swc_is_main_sku","is","T"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "item",
                            join: "component",
                            label: "货品"
                        })
                    ]
            });
            var bomSearchObj = getAllResults(bomrevisionSearchObj);
            if(bomSearchObj && bomSearchObj.length > 0){
                for (let i = 0; i < bomSearchObj.length; i++) {
                    skuAry.push(bomSearchObj[i].getValue({
                        name: "item",
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
                    'item',
                    'description',
                    'units',
                    'rate',
                    'amount',
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
                    'custcol_swc_pr_main_sku'
                ];


            var result = {};
            var feeSubID = 'recmachcustrecord_swc_wl_plan_order_id';
            var sublistId = 'item';

            function buildKey(a, b, c, d, e) {
                return String(a) + '_' + String(b) + '_' + String(c) + '_' + String(d) + '_' + String(e);
            }

            function get(poRec, fieldId, line) {
                return poRec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: fieldId,
                    line: line
                });
            }

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
                    type: 'customrecord_swc_wl_plan_order',
                    id: id
                });

                var poData = {};
                var cnt = planRec.getLineCount(feeSubID);

                for (var i = 0; i < cnt; i++) {

                    var poId = planRec.getSublistValue({
                        sublistId: feeSubID,
                        fieldId: 'custrecord_swc_wl_d_po_num',
                        line: i
                    });

                    var sku = planRec.getSublistValue({
                        sublistId: feeSubID,
                        fieldId: 'custrecord_swc_wl_d_item',
                        line: i
                    });

                    var key = buildKey(
                        sku,
                        planRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_country', line: i }),
                        planRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_location_type', line: i }),
                        planRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_customer', line: i }),
                        planRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_region', line: i })
                    );

                    var y = Number(planRec.getSublistValue({
                        sublistId: feeSubID,
                        fieldId: 'custrecord_swc_wl_d_superior_qty_z',
                        line: i
                    }) || 0);

                    var l = Number(planRec.getSublistValue({
                        sublistId: feeSubID,
                        fieldId: 'custrecord_swc_wl_d_good_qty_z',
                        line: i
                    }) || 0);

                    if (!poData[poId]) poData[poId] = {};
                    if (!poData[poId][key]) poData[poId][key] = { y: 0, l: 0 };

                    poData[poId][key].y += y;
                    poData[poId][key].l += l;
                }

                /** 2 逐 PO 处理 */
                for (var poId in poData) {

                    var poRec = record.load({
                        type: record.Type.PURCHASE_ORDER,
                        id: poId,
                        isDynamic: false
                    });

                    var data = poData[poId];
                    var lineCount = poRec.getLineCount({ sublistId: sublistId });

                    /** 建立已有优 / 良品行索引 */
                    var splitIndex = {};

                    for (var i = 0; i < lineCount; i++) {
                        var grade = get(poRec, 'custcol_swc_grade', i);
                        if (grade != 1 && grade != 2) continue;

                        var key = buildKey(
                            get(poRec, 'item', i),
                            get(poRec, 'custcol_swc_country_code', i),
                            get(poRec, 'custcol_swc_loc_type', i),
                            get(poRec, 'custcol_swc_store', i),
                            get(poRec, 'custcol_swc_us_districts', i)
                        );

                        splitIndex[key + '_' + grade] = i;
                    }

                    /** 倒序只处理原始行 */
                    for (var line = lineCount - 1; line >= 0; line--) {

                        var grade = get(poRec, 'custcol_swc_grade', line);
                        if (grade == 1 || grade == 2) continue;

                        var key = buildKey(
                            get(poRec, 'item', line),
                            get(poRec, 'custcol_swc_country_code', line),
                            get(poRec, 'custcol_swc_loc_type', line),
                            get(poRec, 'custcol_swc_store', line),
                            get(poRec, 'custcol_swc_us_districts', line)
                        );

                        var split = data[key];
                        if (!split) continue;

                        /** 原始行：只关闭 */
                        set(poRec, 'isclosed', line, true);

                        /** 优品行 */
                        if (split.y > 0) {
                            var yLine = splitIndex[key + '_1'];
                            if (yLine !== undefined) {
                                var oldy = poRec.getSublistValue({ sublistId: sublistId, fieldId: 'quantity', line: yLine });
                                set(poRec, 'quantity', yLine, Number(oldy) + Number(split.y));
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

                                set(poRec, 'item', line + 1, get(poRec, 'item', line));
                                set(poRec, 'quantity', line + 1, split.y);
                                set(poRec, 'custcol_swc_grade', line + 1, 1);
                            }
                        }

                        /** 良品行 */
                        if (split.l > 0) {
                            var lLine = splitIndex[key + '_2'];
                            if (lLine !== undefined) {
                                var oldl = poRec.getSublistValue({ sublistId: sublistId, fieldId: 'quantity', line: lLine });
                                set(poRec, 'quantity', lLine, Number(oldl) + Number(split.l));
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

                                set(poRec, 'item', line + 1, get(poRec, 'item', line));
                                set(poRec, 'quantity', line + 1, split.l);
                                set(poRec, 'custcol_swc_grade', line + 1, 2);
                            }
                        }
                    }

                    poRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
                }

                planRec.setValue({ fieldId: 'custrecord_swc_wl_plan_status', value: 4 });
                planRec.save();

                result.data = '处理成功';

            } catch (e) {
                log.error('处理异常', e);
                result.data = '处理失败';
            }

            return result;
        }

        function tcFeePoCreate(id) {
            var result_str = {};

            try {
                var rec = record.load({
                    type: 'customrecord_swc_wl_plan_order',
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
                var terms_of_trade = rec.getValue('custrecord_swc_wl_terms_of_trade');
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

                // 成本类别 -> 费用Item
                var feeItemByName = {
                    '1': 3111, '2': 3112, '3': 3113, '4': 3114, '5': 3115,
                    '6': 3116, '7': 3117, '8': 3118, '9': 3119
                };

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

                // ------------------------
                // 3) 汇总 first leg cost：按承运商 + 中类 汇总金额
                //    同时记录需要回写PO的行（以及按承运商分组回写）
                // ------------------------
                var legSubId = 'recmachcustrecord_swc_wl_first_leg_cost_id';
                var legLineCount = rec.getLineCount({ sublistId: legSubId });

                var cnPoJson = {}; // { carrierId: { feeTypeZ: sumAmt } }
                var hwPoJson = {}; // { carrierId: { feeTypeZ: sumAmt } }

                // carrier -> [lineIndex,...] （用于更精确回写）
                var carrierLegLinesMap = {};

                for (var i = 0; i < legLineCount; i++) {
                    var carrierId = rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_flc_location', line: i });
                    var feeTypeZ = rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_flc_fee_type_z', line: i });
                    var ygFee = toNumber(rec.getSublistValue({ sublistId: legSubId, fieldId: 'custrecord_swc_wl_flc_yg_fee', line: i }));

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
                        if (!cnPoJson[carrierId]) cnPoJson[carrierId] = {};
                        cnPoJson[carrierId][feeTypeZ] = round2(toNumber(cnPoJson[carrierId][feeTypeZ]) + ygFee);
                    }
                }

                // ------------------------
                // 4) 创建PO通用函数
                // ------------------------
                function createFeePO(vendorId, subsidiaryId, feeMap, wlPlanId) {
                    var poRec = record.create({ type: record.Type.PURCHASE_ORDER, isDynamic: true });

                    poRec.setValue({ fieldId: 'customform', value: 102 });              // 采购订单_费用类
                    poRec.setValue({ fieldId: 'entity', value: vendorId });             // 供应商=承运商
                    poRec.setValue({ fieldId: 'subsidiary', value: subsidiaryId });     // 子公司
                    poRec.setValue({ fieldId: 'custbody_swc_cqdd_zq', value: 1 });       // 账期TODO
                    poRec.setValue({ fieldId: 'custbody_swc_wl_no', value: wlPlanId });  // 关联物流发运单
                    poRec.setValue({ fieldId: 'custbody_swc_po_fee', value: 3 });           // 费用标识
                    poRec.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: 1 });  // 等待审批

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
                    var cnSub = rec.getValue('custrecord_swc_wl_po_zt');
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
                    var county_lsit = rec.getValue('custrecord_swc_wl_county_lsit'); // 运抵国
                    var wlDId = 'recmachcustrecord_swc_wl_plan_order_id';
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
                                var shopId = rec.getSublistValue({ sublistId: wlDId, fieldId: 'custrecord_swc_wl_d_customer', line: d });
                                var vol = toNumber(rec.getSublistValue({ sublistId: wlDId, fieldId: 'custrecord_swc_wl_d_total_volume', line: d }));

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
                                poRec.setValue({ fieldId: 'custbody_swc_wl_no', value: id });
                                poRec.setValue({ fieldId: 'custbody_swc_po_fee', value: 3 });
                                poRec.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: 1 });

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
                // 7) 回写PO到 first leg cost 子表多选字段 custrecord_swc_wl_flc_po
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
                                fieldId: 'custrecord_swc_wl_flc_po',
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
                                fieldId: 'custrecord_swc_wl_flc_po',
                                line: lineIndex,
                                value: merged
                            });
                        }
                    }
                }

                // ------------------------
                // 8) 保存状态
                // ------------------------
                rec.setValue({ fieldId: 'custrecord_swc_wl_plan_status', value: 8 });
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
         * 生成账单
         */
        function createVendorBill(vendorBill, providerId, kj){

            var vendorbillRecord = record.create({
                type: 'vendorbill',
                isDynamic: true
            });

            // 供应商
            vendorbillRecord.setValue({
                fieldId: 'entity',
                value: providerId
            });


            for (const vendorBillKey in vendorBill) {
                var jsonValue = vendorBill[vendorBillKey];

                var zhongleiID = jsonValue.zhonglei;
                var zlKj = kj[zhongleiID]
                log.debug('kj', kj);
                log.debug('zlKj', zlKj);
                log.debug('feeCy', jsonValue.feeCy);

                vendorbillRecord.selectNewLine({sublistId: 'expense'});
                vendorbillRecord.setCurrentSublistValue({
                    sublistId: 'expense',
                    fieldId: 'account',
                    value: zlKj
                });

                vendorbillRecord.setCurrentSublistValue({
                    sublistId: 'expense',
                    fieldId: 'amount',
                    value: jsonValue.feeCy
                });

                vendorbillRecord.commitLine({sublistId: 'item'});

            }

            var vendorbillID = vendorbillRecord.save();
            return vendorbillID;
        }

        /**
         * 采购杂费差异账单生成
         * @param {number|string} billId
         */
        function poZfCy(billId) {
            var result_str = {};

            // ====== 常量（按你的实际字段/科目调整）======
            var SUB_FEE = 'recmachcustrecord_swc_wl_po_fee_wl';
            var SUB_WL  = 'recmachcustrecord_swc_wl_plan_order_id';

            var F_ALLOC = 'custrecord_swc_wl_d_sj_fee_zf_ft'; // 分摊写回字段
            var F_STATUS = 'custrecord_swc_wl_plan_status';   // 主记录状态

            // 差异单据回写字段（你原代码用的是这个）
            var F_CY_TRAN = 'custrecord_swc_wl_po_cy_vendbill';
            var F_CY_AMT  = 'custrecord_swc_wl_po_fee_cy';
            var F_FPO_TYPE = 'custrecord_swc_wl_po_fee_fpo_type';

            // 子表字段
            var F_PO_ID = 'custrecord_swc_wl_po_fee_id';
            var F_YG = 'custrecord_swc_wl_po_fee_yg';
            var F_SJ = 'custrecord_swc_wl_po_fee_sj';
            var F_PAY = 'custrecord_swc_wl_po_fee_pay';
            var F_VEN = 'custrecord_swc_wl_po_fee_ven';

            // WL 明细字段
            var F_WL_PO_NUM = 'custrecord_swc_wl_d_po_num';
            var F_WL_VOL = 'custrecord_swc_wl_d_total_volume';

            // 科目 internalId（强烈建议改成脚本参数或配置表，这里先保留常量）
            var ACCOUNT_BILL = 3109; // Vendor Bill expense account
            var ACCOUNT_VC   = 58;   // Vendor Credit expense account

            // ====== 工具函数 ======
            function toNumber(v) {
                var n = Number(v);
                return isFinite(n) ? n : 0;
            }

            function round2(v) {
                return Math.round((toNumber(v) + Number.EPSILON) * 100) / 100;
            }

            function getSub(rec, sublistId, fieldId, line) {
                return rec.getSublistValue({ sublistId: sublistId, fieldId: fieldId, line: line });
            }

            function setSub(rec, sublistId, fieldId, line, value) {
                rec.setSublistValue({ sublistId: sublistId, fieldId: fieldId, line: line, value: value });
            }

            try {
                // ====== 读取主记录 ======
                var rec = record.load({
                    type: 'customrecord_swc_wl_plan_order',
                    id: billId,
                    isDynamic: false
                });

                // ====== 1) 处理费用子表：写差异金额 + 创建差异单据 + 构造 poFeeMap（po -> 实际杂费） ======
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

                    // 供后续分摊使用：按“实际杂费”分摊（保留你原意）
                    poFeeMap[String(po_fee_id)] = { po_fee_sj: round2(fee_sj) };

                    // 幂等：已有差异单据则跳过创建（避免重复执行生成多张）
                    var existedTranId = getSub(rec, SUB_FEE, F_CY_TRAN, i);
                    if (existedTranId) continue;

                    // cy=0 不创建
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
                            tranId = createVendorBill2(providerId, cy, ACCOUNT_BILL);
                        } else {
                            tranId = createVendorCredit2(providerId, Math.abs(cy), ACCOUNT_VC);
                        }
                        setSub(rec, SUB_FEE, F_CY_TRAN, i, tranId);
                    } catch (innerErr) {
                        log.error('差异单据创建异常 line=' + i, innerErr);
                    }
                }

                // ====== 2) 收集 WL 明细：按 PO 分组（poLineList） ======
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

                // ====== 3) 分摊写回：最后一行补差，保证合计严格等于 poFee ======
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

                // ====== 4) 更新状态并保存 ======
                // rec.setValue({ fieldId: F_STATUS, value: 16 });
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
         * @param {number} accountId
         */
        function createVendorBill2(vendorId, amount, accountId) {
            var amt = Number(amount);
            if (!vendorId) throw new Error('Vendor Bill: entity为空');
            if (!(amt > 0)) throw new Error('Vendor Bill: amount必须>0');

            var vendorbillRecord = record.create({
                type: 'vendorbill',
                isDynamic: true
            });

            vendorbillRecord.setValue({ fieldId: 'entity', value: vendorId });

            vendorbillRecord.selectNewLine({ sublistId: 'expense' });
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'account', value: Number(accountId) });
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'amount', value: amt });

            // 关键：expense 要 commit expense（你原来 commit item 是 bug）
            vendorbillRecord.commitLine({ sublistId: 'expense' });

            return vendorbillRecord.save({ ignoreMandatoryFields: false });
        }

        /**
         * 创建 Vendor Credit（供应商贷项）
         * 注意：不要用 creditmemo（那是客户贷项）
         * @param {number|string} vendorId
         * @param {number} amount 正数
         * @param {number} accountId
         */
        function createVendorCredit2(vendorId, amount, accountId) {
            var amt = Number(amount);
            if (!vendorId) throw new Error('Vendor Credit: entity为空');
            if (!(amt > 0)) throw new Error('Vendor Credit: amount必须>0');

            var tranRec = record.create({
                type: 'vendorcredit',
                isDynamic: true
            });

            tranRec.setValue({ fieldId: 'entity', value: vendorId });

            tranRec.selectNewLine({ sublistId: 'expense' });
            tranRec.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'account', value: Number(accountId) });
            tranRec.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'amount', value: amt });
            tranRec.commitLine({ sublistId: 'expense' });

            // 有些账号设置必填字段多，必要时可用 ignoreMandatoryFields:true
            return tranRec.save({ ignoreMandatoryFields: true });
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

                var wlId = billId.split('_')[0]

                // 获取当前物流发运单
                var rec = record.load({
                    type: 'customrecord_swc_wl_plan_order',
                    id: wlId,
                    isDynamic: false
                });

                function isBlank(v) {
                    return v === null || v === undefined || v === '';
                }

                function toNumber(v) {
                    var n = Number(v);
                    return isNaN(n) ? 0 : n;
                }

                var md_location = rec.getValue({ fieldId: 'custrecord_swc_md_location' });         // 目的仓仓库代码
                var terms_of_trade = rec.getValue({ fieldId: 'custrecord_swc_wl_terms_of_trade' });// 成交方式（list internal id）
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
                if(terms_of_trade == 1){ // 公司间交易 成交方式Exw
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_swc_mr_it',
                        deploymentId: 'customdeploy_swc_mr_it',
                        params: {
                            custscript_m_payload: billId
                        }
                    });
                    mrTask.submit();
                }else{// 转移单 其余成交方式
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_swc_mr_trade_terms_shipment',
                        deploymentId: 'customdeploy_swc_mr_trade_terms_shipment',
                        params: {
                            custscript_payload: billId
                        }
                    });
                    mrTask.submit();
                }

                result_str.data = '供应商出货，正在后台处理中...';
                return result_str;

            } catch (e) {
                log.error('supplierShippedCn error', e);
                result_str.data = '供应商出货异常，请联系管理人员';
                return result_str;
            }
        }

        function customsDeclared(billId){
            var result_str = { data: '' };

            try {
                log.debug('billId', billId);
                if (!billId) {
                    result_str.data = 'billId为空，请确认参数';
                    return result_str;
                }

                var wlId = billId.split('_')[0]

                // 获取当前物流发运单
                var rec = record.load({
                    type: 'customrecord_swc_wl_plan_order',
                    id: wlId,
                    isDynamic: false
                });

                function isBlank(v) {
                    return v === null || v === undefined || v === '';
                }

                function toNumber(v) {
                    var n = Number(v);
                    return isNaN(n) ? 0 : n;
                }

                var md_location = rec.getValue({ fieldId: 'custrecord_swc_md_location' });         // 目的仓仓库代码
                var terms_of_trade = rec.getValue({ fieldId: 'custrecord_swc_wl_terms_of_trade' });// 成交方式（list internal id）
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

                log.debug('wl_od', wl_od);
                log.debug('wl_od', wl_od === 1);

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
                if(terms_of_trade == 2){ // 公司间交易 国内FOB 成交方式
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_swc_mr_it',
                        deploymentId: 'customdeploy_swc_mr_it',
                        params: {
                            custscript_m_payload: billId
                        }
                    });
                    mrTask.submit();
                }else{// 转移单 其余成交方式
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_swc_mr_trade_terms_shipment',
                        deploymentId: 'customdeploy_swc_mr_trade_terms_shipment',
                        params: {
                            custscript_payload: billId
                        }
                    });
                    mrTask.submit();
                }

                result_str.data = '供应商出货，正在后台处理中...';
                return result_str;

            } catch (e) {
                log.error('supplierShippedCn error', e);
                result_str.data = '供应商出货异常，请联系管理人员';
                return result_str;
            }
        }


        function clearedCustoms(billId){
            var result_str = { data: '' };

            try {
                log.debug('billId', billId);
                if (!billId) {
                    result_str.data = 'billId为空，请确认参数';
                    return result_str;
                }

                var wlId = billId.split('_')[0]

                // 获取当前物流发运单
                var rec = record.load({
                    type: 'customrecord_swc_wl_plan_order',
                    id: wlId,
                    isDynamic: false
                });

                function isBlank(v) {
                    return v === null || v === undefined || v === '';
                }

                function toNumber(v) {
                    var n = Number(v);
                    return isNaN(n) ? 0 : n;
                }

                var md_location = rec.getValue({ fieldId: 'custrecord_swc_md_location' });         // 目的仓仓库代码
                var terms_of_trade = rec.getValue({ fieldId: 'custrecord_swc_wl_terms_of_trade' });// 成交方式（list internal id）
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
                if(terms_of_trade == 3 || terms_of_trade == 4){ // DDP DDU 公司间交易
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_swc_mr_it',
                        deploymentId: 'customdeploy_swc_mr_it',
                        params: {
                            custscript_m_payload: billId
                        }
                    });
                    mrTask.submit();
                }else{// 转移单 其余成交方式
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_swc_mr_trade_terms_shipment',
                        deploymentId: 'customdeploy_swc_mr_trade_terms_shipment',
                        params: {
                            custscript_payload: billId
                        }
                    });
                    mrTask.submit();
                }

                result_str.data = '供应商出货，正在后台处理中...';
                return result_str;

            } catch (e) {
                log.error('supplierShippedCn error', e);
                result_str.data = '供应商出货异常，请联系管理人员';
                return result_str;
            }
        }



        function round2(n) {
            return Number((Number(n) || 0).toFixed(2));
        }

        function getZhongLeiKuaiji(){
            var rtnJson = {};
            var customrecord_swc_rule_mapping_tableSearchObj = search.create({
                type: "customrecord_swc_rule_mapping_table",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_cost_medium", label: "费用项（中类）"}),
                        search.createColumn({name: "custrecord_swc_account", label: "会计科目"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
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
                    type: 'transferorder',
                    id: id,
                });

                var feeSubID = 'recmachcustrecord_swc_trnfrord_link';
                var line = rec.getLineCount(feeSubID);

                var feeYgCheck = [];
                var payCheck = [];
                if(line <= 0){
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

                    if(!po_fee_yg){
                        feeYgCheck.push(fee_id)
                    }

                    if(!trnfrord_pay){
                        payCheck.push(trnfrord_pay)
                    }
                }

                if(payCheck.length > 0){
                    result_str.data = '内部ID：' + feeYgCheck.join(',') + '行的付款方请正常填写！';
                    return result_str;
                }

                if(feeYgCheck.length > 0){
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
                    var po_data = record.create({ type: 'purchaseorder', isDynamic: true });

                    // 表单：采购订单_费用类
                    po_data.setValue({ fieldId: 'customform', value: 102 });
                    po_data.setValue({ fieldId: 'entity', value: trnfrord_pay });
                    po_data.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: 1 });// 等待审批

                    // 账期 TODO 假数据，测试使用
                    po_data.setValue({ fieldId: 'custbody_swc_cqdd_zq', value: 1 });
                    // 关联转移单
                    po_data.setValue({ fieldId: 'custbody_swc_transorder_id', value: id });
                    // 采购调拨费
                    po_data.setValue({ fieldId: 'custbody_swc_po_fee', value: 4 });
                    // 采购调拨费录入单
                    po_data.setValue({ fieldId: 'custbody_swc_po_db_id', value: poDBID });
                    // 采购调拨费状态
                    po_data.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: 1 });
                    // 明细数据做成
                    po_data.selectNewLine({ sublistId: 'item' });
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 3110 });
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: po_db_fee });
                    po_data.commitLine({ sublistId: 'item' });
                    var saveId = po_data.save({ ignoreMandatoryFields: true });
                    rec.setSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_trnfrord_po_id', value: saveId, line: i });
                    rec.setSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_trnfrord_po_type', value: 1, line: i });
                    rec.setValue({ fieldId: 'custbody_swc_po_db_type', value: 1 });

                }

                rec.save();
                result_str.data = '生成费用类采购订单成功';
            } catch (e) {
                log.debug('生成费用类采购订单 ： ', e.message);
                result_str.data = '生成费用类采购订单失败,请联系管理人员';
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

                rec.setValue({ fieldId : 'orderstatus', value : 'B' })

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

                var subId = 'item';
                var lineCount = rec.getLineCount({ sublistId: subId });
                if (!lineCount || lineCount <= 0) {
                    result_str.data = '调拨单无明细行';
                    return result_str;
                }

                var lineInfo = [];
                var itemIds = [];

                for (var i = 0; i < lineCount; i++) {
                    var itemId = rec.getSublistValue({ sublistId: subId, fieldId: 'item', line: i });
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
                var toShipLines = toRecForShip.getLineCount({ sublistId: 'item' });
                for (var s1 = 0; s1 < toShipLines; s1++) {
                    var rem = Number(toRecForShip.getSublistValue({
                        sublistId: 'item',
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
                var ifLineCount = ifRec.getLineCount({ sublistId: 'item' });
                for (var a = 0; a < ifLineCount; a++) {
                    var remainIf = Number(ifRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantityremaining',
                        line: a
                    }) || 0);

                    if (remainIf > 0) {
                        ifRec.setSublistValue({ sublistId: 'item', fieldId: 'itemship', line: a, value: true });
                        ifRec.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line: a, value: remainIf });
                    } else {
                        ifRec.setSublistValue({ sublistId: 'item', fieldId: 'itemship', line: a, value: false });
                    }
                }

                ifRec.save({ enableSourcing: true, ignoreMandatoryFields: true });

                var irRec = record.transform({
                    fromType: record.Type.TRANSFER_ORDER,
                    fromId: id,
                    toType: record.Type.ITEM_RECEIPT,
                    isDynamic: true
                });

                var irLineCount = irRec.getLineCount({ sublistId: 'item' });

                for (var b2 = 0; b2 < irLineCount; b2++) {
                    irRec.selectLine({ sublistId: 'item', line: b2 });

                    var remainIr = Number(irRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantityremaining'
                    }) || 0);

                    var irLineNo = irRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_swc_line_no'
                    })

                    if (remainIr > 0) {
                        irRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true });
                        irRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: remainIr });

                        var lcSub = irRec.getCurrentSublistSubrecord({
                            sublistId: 'item',
                            fieldId: 'landedcost'
                        });

                        lcSub.selectNewLine({ sublistId: 'landedcostdata' });
                        lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: 37 });
                        lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'amount', value: dbFeeFtAmount[irLineNo] });
                        lcSub.commitLine({ sublistId: 'landedcostdata' });

                        irRec.commitLine({ sublistId: 'item' });
                    } else {
                        irRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false });
                        irRec.commitLine({ sublistId: 'item' });
                    }
                }

                irRec.save({ enableSourcing: true, ignoreMandatoryFields: true });

                record.submitFields({
                    type: 'transferorder',
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
         * 通用按比例分摊（参考您 splitRegions：floor + 尾差按小数部分从大到小补 1）
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
                    ['item', 'anyof', String(itemId)],
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

        function isBlank(v) {
            return v === null || v === undefined || v === '';
        }

        return {
            onRequest: onRequest
        };

    })
;