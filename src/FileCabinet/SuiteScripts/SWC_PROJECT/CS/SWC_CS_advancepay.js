/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/url','N/record','N/https','./commonTool', 'N/ui/dialog'],
    function(currentRecord, url,record,https,commonTool,dialog) {

        // 页面初始化时执行
        function pageInit(scriptContext) {
            log.audit('触发CS');
        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            let curRec = scriptContext.currentRecord;
            let sublistId = scriptContext.sublistId;
            let fieldId = scriptContext.fieldId;

            if (fieldId == "custrecord_swc_advancepay_receive_now") {
                // var maxNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_estimated_max"});
                let curNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custrecord_swc_advancepay_receive_now"});
                // console.log('maxNumber',maxNumber);
                // console.log('curNumber',curNumber);
                // if (curNumber > maxNumber || curNumber < 0) {
                //     if (curNumber > maxNumber)
                //         alert(`超过剩余履行数量${maxNumber}，请重新输入`);
                //     if (curNumber < 0)
                //         alert(`输入数量不能小于0`);
                //     curRec.setCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_estimated", value: 0});
                //     curRec.setCurrentSublistValue({
                //         sublistId: sublistId,
                //         fieldId: 'custpage_sublist_preamount_line',
                //         value: 0
                //     });
                //     curRec.setCurrentSublistValue({
                //         sublistId: sublistId,
                //         fieldId: 'custpage_sublist_prepaid_amount',
                //         value: 0
                //     });
                // } else {
                //     let curNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_hide"});
                let curTaxPrice = curRec.getCurrentSublistValue({sublistId, fieldId: "custrecord_swc_advancepay_line_taxprice"});
                let ratio = curRec.getCurrentSublistValue({sublistId, fieldId: "custrecord_swc_advancepay_sum_percent"});
                // if (curRadio) {
                //     curRadio = JSON.parse(curRadio)/100;
                // } else {
                //     curRadio = 0;
                // }
                // curRec.setCurrentSublistValue({
                //     sublistId,
                //     fieldId: "custpage_sublist_prepaid_amount",
                //     value: app.accMul(app.accMul(curNumber,curPrice),curRadio)
                // })

                let prepaidAmount = 0;
                //整单预付分摊到行
                let linePreAmount = curRec.getCurrentSublistValue({sublistId, fieldId: "custrecord_swc_advancepay_sum_share"});
                //若【整单已预付金额分摊到该行】=0  含税单价*订单数量*申请预付比例
                if (linePreAmount == 0) {
                    prepaidAmount = curNumber*curTaxPrice*ratio/100;
                } else {
                    //预计本次入库数量*含税单价-【整单预付金额分摊到该行】
                    prepaidAmount = curNumber*curTaxPrice - linePreAmount;
                }
                curRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_swc_advancepay_amount_now',
                    value: prepaidAmount
                });
                // }

            }

            if (fieldId == "custrecord_swc_advancepay_amount_now") {
                let curNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custrecord_swc_advancepay_receive_now"});
                let curTaxPrice = curRec.getCurrentSublistValue({sublistId, fieldId: "custrecord_swc_advancepay_line_taxprice"});
                let ratio = curRec.getCurrentSublistValue({sublistId, fieldId: "custrecord_swc_advancepay_sum_percent"});

                let linePreAmount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custrecord_swc_advancepay_sum_share"}));
                let prepaidAmount = 0;
                if (linePreAmount == 0) {
                    prepaidAmount = curNumber*curTaxPrice*ratio/100;
                } else {
                    //预计本次入库数量*含税单价-【整单预付金额分摊到该行】
                    prepaidAmount = curNumber*curTaxPrice - linePreAmount;
                }

                //当前预付款金额
                let curPrepaidAmount = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_prepaid_amount"});
                if (curPrepaidAmount > prepaidAmount) {
                    alert('超过本次最高申请金额');
                    curRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: "custpage_sublist_prepaid_amount",
                        value: prepaidAmount
                    });
                }
            }
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
        };
    });