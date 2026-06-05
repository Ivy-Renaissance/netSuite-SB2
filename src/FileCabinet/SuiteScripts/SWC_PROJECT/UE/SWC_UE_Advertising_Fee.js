/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(["N/record", "N/runtime", "N/search", "../common/SWC_Utils.js", "N/task"],

    (record, runtime, search, SWC_Utils,task) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            let type = scriptContext.type;
            log.audit("type", type);
            // 只编辑触发
            if (type != scriptContext.UserEventType.EDIT) return;

            let newRecord = scriptContext.newRecord;
            let oldRecord = scriptContext.oldRecord;
            let poId = newRecord.id;
            let scriptObj = runtime.getCurrentScript();
            let feeType = scriptObj.getParameter({name: "custscript_swc_ue_po_fee"}); // 费用类型采购订单 广告费用
            let purchaseFeeType = newRecord.getValue({fieldId: "custbody_swc_order_type2"}); // 采购订单类型(手工单用)
            log.audit("typeJson", {feeType, purchaseFeeType});
            // 只有 费用类型采购订单 为 广告费用 时触发
            if (feeType != purchaseFeeType) return;

            let oldStatus = oldRecord.getValue({fieldId: "custbody_swc_po_approal_fix"}); // 采购订单审批状态
            let newStatus = newRecord.getValue({fieldId: "custbody_swc_po_approal_fix"}); // 采购订单审批状态
            let oldAppStatus = oldRecord.getValue({fieldId: "approvalstatus"}); // 审批状态
            let newAppStatus = newRecord.getValue({fieldId: "approvalstatus"}); // 审批状态
            let memo = newRecord.getValue({fieldId: "memo"}); // 备注
            log.audit("statusJson", {oldStatus, newStatus, oldAppStatus, newAppStatus});
            // 编辑保存 前后 采购订单审批状态 和 审批状态 未改变 不触发
            if (oldStatus == newStatus && oldAppStatus == newAppStatus) return;
            let appliedStatus = scriptObj.getParameter({name: "custscript_swc_ue_applied"}); // 采购订单审批状态 已批准
            let approvalAppliedStatus = scriptObj.getParameter({name: "custscript_swc_ue_approval_applied"}); // 审批状态 已批准
            log.audit("statusJson", {oldStatus, newStatus, oldAppStatus, newAppStatus, appliedStatus, approvalAppliedStatus});
            // 审批状态未更新为 已批准 或 采购订单审批状态未更新为 已批准 不触发
            if (newStatus != appliedStatus /*|| newAppStatus != approvalAppliedStatus*/) return;
            let sourceRec = "customrecord_swc_jj_advertisement_report"; // 积加 广告报告
            if (memo.includes("其他平台广告数据")) sourceRec = "customrecord_swc_op_advertisement"; // 其他平台广告数据
            try {
                log.audit("poId", poId);
                let billId = createBill(poId);
                if (!SWC_Utils.isEmpty(billId)){
                    rewriteAdvertisementRec(sourceRec, poId);
                }
            }catch (e) {
                log.audit("创建账单 或 回写 发生错误", e);
            }
        }

        /**
         * 审批通过 创建账单
         * @param poId
         */
        function createBill(poId) {
            // 直接转换记录（po单-账单）
            var vendorBillRec = record.transform({fromType: "purchaseorder", fromId: poId, toType: "vendorbill", isDynamic: true});
            var recId = vendorBillRec.save();
            log.audit("账单创建成功", recId);
            return recId;
        }

        /**
         * 回写 积加 广告报告 或 其他平台广告数据
         * 有sku 的原记录 回写 是否同步” 为是 “ 是否分摊”字段为是
         * 没有sku的 原记录 回写 是否同步” 为是；创建的新记录 是否同步” 为是；“ 是否分摊”字段为是
         * @param sourceRec
         * @param poId
         */
        function rewriteAdvertisementRec(sourceRec, poId){
            if (SWC_Utils.isEmpty(sourceRec) || SWC_Utils.isEmpty(poId)) return;
            let recJson = getRewriteIds(sourceRec, poId);
            if (SWC_Utils.isEmpty(recJson)) return;
            log.audit("recJson", recJson);

            task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: "customscript_swc_mr_advertising_fee",
                // deploymentId: "customdeploy_swc_mr_promotion_import",
                params: {
                    custscript_swc_mr_advertising_fee: JSON.stringify(recJson)
                }
            }).submit();

            // for (let recId in recJson){
            //     record.submitFields({type: sourceRec, id: recId, values: recJson[recId].values});
            // }
        }

        /**
         * 根据采购单id 检索 积加 广告报告 或 其他平台广告数据
         * 有sku 的原记录 回写 是否同步” 为是 “ 是否分摊”字段为是
         * 没有sku的 原记录 回写 是否同步” 为是；创建的新记录 是否同步” 为是；“ 是否分摊”字段为是
         * @param sourceRec
         * @param poId
         * @returns {}
         */
        function getRewriteIds(sourceRec, poId){
            let recJson = {};
            let poFieldId = "custrecordcustrecord_swc_jj_adv_ponumber"; // 积加 广告报告.采购订单号
            let skuFieldId = "custrecord_swc_jj_adv_msku"; // 积加 广告报告.msku
            let flagFieldId = "custrecordcustrecord_swc_jj_adv_flag" // 积加 广告报告.是否同步
            let shareFieldId = "custrecordcustrecord_swc_jj_adv_share" // 积加 广告报告.是否分摊

            if (sourceRec == "customrecord_swc_op_advertisement") {
                poFieldId = "custrecordcustrecord_swc_op_po_number_"; // 其他平台广告数据.采购订单号
                skuFieldId = "custrecord_swc_sku"; // 其他平台广告数据.SKU
                flagFieldId = "custrecordcustrecord_swc_op_po_flag_" // 其他平台广告数据.是否同步
                shareFieldId = "custrecordcustrecord_swc_op_order_share" // 其他平台广告数据.是否分摊
            }
            let searchObj = search.create({
                type: sourceRec,
                filters:
                    [
                        ["isinactive","is","F"],
                        "AND",
                        [poFieldId,"anyof",poId]
                    ],
                columns: [
                    search.createColumn({name: skuFieldId})
                ]
            });
            let results = getAllResults(searchObj);
            log.audit('results.length',results.length);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return recJson;
            for (let i = 0; i < results.length; i++){
                let result = results[i]
                let recId = result.id;
                let sku = result.getValue({name: skuFieldId});
                let values = {};
                values[flagFieldId] = "1"; // 是否同步字段 回写 1
                if (!SWC_Utils.isEmpty(sku)) {
                    let value = true;
                    // if (sourceRec == "customrecord_swc_op_advertisement") value = "Y";
                    // 没有sku的 原记录 sku 为空; 创建出来的新记录 sku 有值
                    // sku 存在的记录 是否分摊 回写 Y
                    values[shareFieldId] = value;
                }
                // let key = recId + '_' + sourceRec;
                let recDetailJson = recJson[recId] = recJson[recId] || {};
                recDetailJson.values = values;
                recDetailJson.type = sourceRec;
            }
            return recJson;
        }

        function getAllResults(srch) {
            let results = srch.run();
            let searchResults = [];
            let searchid = 0;
            let resultslice;
            do {
                resultslice = results.getRange({
                    start: searchid,
                    end: searchid + 1000
                });
                resultslice.forEach(function (slice) {
                    searchResults.push(slice);
                    searchid++;
                });

            } while (resultslice.length >= 1000);
            return searchResults;
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });