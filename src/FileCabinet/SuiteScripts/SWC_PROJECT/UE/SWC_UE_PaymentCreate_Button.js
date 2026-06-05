/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search','../common/SWC_CONFIG_DATA', 'N/task'],
    (record, search,SWC_CONFIG_DATA,task) => {
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
            try {
                // 仅在查看或编辑模式下添加按钮
                if (scriptContext.type === "view"|| scriptContext.type === "edit") {
                    var form = scriptContext.form;
                    var rec = scriptContext.newRecord;
                    var type = rec.type;
                    var id = rec.id;
                    log.error('id',id);
                    var buttonFlag = false;
                    var state = rec.getValue('custrecord_swc_pay_state');
                    var mode = rec.getValue('custrecord_swc_pay_mode');
                    var errorMessage = rec.getValue('custrecord_swc_pay_mistakememo');
                    var paymentMain = rec.getValue('custrecord_swc_pay_payment');
                    log.error('error',{
                        state: state,
                        mode: mode,
                        errorMessage: errorMessage,
                        paymentMain: paymentMain.length
                    })

                    var cashierFlag = false;
                    if (mode == '2') {
                        var curRec = record.load({
                            type: type,
                            id: id
                        })
                        var lineCount = curRec.getLineCount({sublistId: 'recmachcustrecord_swc_pay_line_main'});
                        log.error('lineCount',lineCount);
                        if (lineCount) {
                            for (let i = 0; i < lineCount; i++) {

                                var cashier = curRec.getSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pay_line_main',
                                    fieldId: 'custrecord_swc_pay_line_cashier',
                                    line: i
                                });
                                log.error('cashier',cashier);
                                if (cashier) {
                                    cashierFlag = true;
                                    break
                                }
                            }
                        }
                    }


                    //模式为全部支付
                    if (mode == '1'  && !errorMessage && state == '1' && paymentMain.length == 0) {
                        buttonFlag = true;
                    }
                    //模式为部分支付
                    if (mode == '2' && !errorMessage && (state == '1' || state == '9') && cashierFlag) {
                        buttonFlag = true;
                    }

                    log.audit('state ',state);
                    if (buttonFlag) {
                        // 添加一个按钮到表单
                        form.addButton({
                            id: 'custpage_create_payment',
                            label: '生成付款单',
                            functionName: 'createPayment'
                        });

                        // 同时，我们也可以添加一个客户端脚本到表单
                        form.clientScriptModulePath = '../CS/SWC_CS_PaymentCreate'; // 替换为你的客户端脚本路径
                    }
                }
            } catch (e) {
                log.error('error',e.message);
            }

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
            if (scriptContext.type === "edit") {
                let newRecord = scriptContext.newRecord;
                let id = newRecord.id;
                let recType = newRecord.type;
                let rec = record.load({type: recType, id: id,isDynamic: true});
                let status = rec.getValue({fieldId: 'custrecord_swc_pay_state'});
                log.audit('status',status);

                //状态是已关闭或已作废
                if (status == SWC_CONFIG_DATA.configData().s_pr_status_yzf || status == SWC_CONFIG_DATA.configData().s_pr_status_yjj) {
                    try {

                        var returnObj = {};
                        var count = rec.getLineCount({sublistId: 'recmachcustrecord_swc_pay_line_main'});
                        for (let i = 0; i< count;i++) {
                            rec.selectLine({
                                sublistId: 'recmachcustrecord_swc_pay_line_main',
                                line: i
                            });
                            var returnId = rec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pay_line_main',
                                fieldId: 'custrecord_swc_pay_bill'
                            });
                            var type = rec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pay_line_main',
                                fieldId: 'custrecord_swc_pay_line_type'
                            });
                            var lineId = rec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pay_line_main',
                                fieldId: 'custrecord_swc_pay_line_number'
                            });

                            var key = returnId + '_' + type;
                            returnObj[key] = returnObj[key] || {};
                            returnObj[key].lineData = returnObj[key].lineData || [];
                            returnObj[key].lineData.push(lineId);
                        }
                        // 创建 Map/Reduce 任务
                        const mapReduceTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: 'customscript_swc_mr_paymentreturn',      // MR脚本的脚本ID
                            deploymentId: 'customdeploy_swc_mr_paymentreturn', // MR部署ID
                            params: {
                                custscript_swc_paymentreturn_obj: JSON.stringify(returnObj),
                            }
                        });

                        // 提交任务，返回任务ID（可用于监控）
                        const taskId = mapReduceTask.submit();
                        log.debug('MR任务已提交', '任务ID: ' + taskId);

                    } catch (e) {
                        log.error('提交MR任务失败', e.message);
                    }

                }
            }
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });