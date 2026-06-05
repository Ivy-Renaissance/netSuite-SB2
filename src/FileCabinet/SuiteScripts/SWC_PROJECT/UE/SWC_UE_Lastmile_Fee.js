/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(["N/runtime", "N/search", "N/format", "N/task", "../common/SWC_Utils.js"],

    (runtime, search, format, task, SWC_Utils) => {
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
            log.audit("beforeSubmit", "start");
            let handleFlag = getHandleFlag(scriptContext, "beforeSubmit");
            if (!handleFlag) return;
            updateRec(scriptContext.newRecord);
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
            log.audit("afterSubmit", "start");
            let handleFlag = getHandleFlag(scriptContext, "afterSubmit");
            if (!handleFlag) return;

            task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: "customscript_swc_mr_lastfeematchbills",
                // deploymentId: "customdeploy_swc_mr_promotion_import",
                params: {
                    custscript_swc_mr_last_mile_fees_id: scriptContext.newRecord.id
                }
            }).submit();
        }

        /**
         * 判断是否符合处理条件
         * @param scriptContext
         * @param entryPoint
         * @returns {boolean}
         */
        function getHandleFlag(scriptContext, entryPoint){
            let handleFlag = false;
            let type = scriptContext.type;
            // 只编辑触发
            if (type != scriptContext.UserEventType.EDIT) return handleFlag;
            let newRecord = scriptContext.newRecord;
            let oldRecord = scriptContext.oldRecord;
            // let bills = newRecord.getValue({fieldId: "custrecord_swc_lastmile_journal"});
            // // 已生成账单 或 贷项的 不触发
            // if (!SWC_Utils.isEmpty(bills)) return;
            let scriptObj = runtime.getCurrentScript();
            let matched = scriptObj.getParameter({name: "custscript_swc_ue_status_matched"}); // 状态 已匹配
            let confirmed = scriptObj.getParameter({name: "custscript_swc_ue_status_confirmed"}); // 状态 已确认
            let feeType = scriptObj.getParameter({name: "custscript_swc_ue_fee_type"}); // 尾程费用类型 其他费用（实际）
            let oldStatus = oldRecord.getValue({fieldId: "custrecord_swc_lastmile_status"}); // 状态
            let newStatus = newRecord.getValue({fieldId: "custrecord_swc_lastmile_status"}); // 状态
            log.audit("statusJson", JSON.stringify({oldStatus, newStatus, matched, confirmed}));
            // 若 保存前后 状态相同  或 保存后状态不为 已确认 不触发
            if (oldStatus == newStatus || newStatus != confirmed) return handleFlag;
            let sublistId = "recmachcustrecord_swc_lastmile_main"; // 入库费用明细
            let lineCount = newRecord.getLineCount({sublistId: sublistId});
            // 没有行不触发
            if (lineCount <= 0) return handleFlag;
            let recFeeType = newRecord.getValue({fieldId: "custrecord_swc_lastmile_feetypes"}); // 尾程费用类型
            log.audit("尾程费用类型 检验Json", JSON.stringify({entryPoint, recFeeType, feeType}));
            // 尾程费用类型 为 其他费用（实际） 时 直接在 beforeSubmit 进行处理 将 尾程费用_入账金额 赋值 尾程费用_实际金额 的值 不需要在 afterSubmit中 调用MR处理
            if (entryPoint == "beforeSubmit") {
                if (recFeeType == feeType){
                    handleFlag = true;
                }else {
                    handleFlag = false;
                }
                return handleFlag;
            }
            handleFlag = true;
            return handleFlag;
        }

        /**
         * 更新 状态为 已匹配
         * 更新明细行 入库费用明细.尾程费用_预估金额为 0; 入库费用明细.尾程费用_金额 为 入库费用明细.尾程费用_实际金额 的值
         * @param recObj
         */
        function updateRec(recObj){
            if (SWC_Utils.isEmpty(recObj)) return;
            let scriptObj = runtime.getCurrentScript();
            let matched = scriptObj.getParameter({name: "custscript_swc_ue_status_matched"}); // 状态 已匹配
            recObj.setValue({fieldId: "custrecord_swc_lastmile_status", value: matched}); // 状态
            let sublistId = "recmachcustrecord_swc_lastmile_main"; // 入库费用明细
            let lineCount = recObj.getLineCount({sublistId: sublistId});
            if (lineCount <= 0) return;
            for (let i = 0; i < lineCount; i++){
                let amount = recObj.getSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_lastmile_amount2", line: i}); // 入库费用明细.尾程费用_实际金额
                recObj.setSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_lastmile_estimate", value: 0, line: i}); // 入库费用明细.尾程费用_预估金额
                recObj.setSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_lastmile_amount", value: amount, line: i}); // 入库费用明细.尾程费用_金额
            }
        }

        return {
            // beforeLoad,
            beforeSubmit,
            afterSubmit
        }

    });
