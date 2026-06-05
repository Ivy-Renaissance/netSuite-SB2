/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', '../common/SWC_CONFIG_DATA'],
    (record, search,SWC_CONFIG_DATA) => {
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
            if (scriptContext.type == "create") {
                let newRec = scriptContext.newRecord;
                let rec = record.load({
                    type: newRec.type,
                    id: newRec.id,
                    isDynamic: true
                });
                let type = rec.getValue({fieldId: 'custbody_swc_order_type2'});
                if (type == SWC_CONFIG_DATA.configData().s_po_type_cgzf_y || type == SWC_CONFIG_DATA.configData().s_po_type_cgzf_s || type == SWC_CONFIG_DATA.configData().s_po_type_cgdbf_y || type == SWC_CONFIG_DATA.configData().s_po_type_cgdbf_s) {

                    let count = rec.getLineCount({sublistId: 'item'});
                    for (let i = 0;i < count;i++) {
                        rec.selectLine({
                            sublistId: 'item',
                            line: i
                        });
                        //含税金额
                        let grossamt = 0;
                        grossamt = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'grossamt'
                        });
                        if (!grossamt) {
                            grossamt = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount'
                            });
                        }

                        if (grossamt) {
                            //第一次整单预付-摊销金额 custcol_swc_prepay_whole1_spare 默认0
                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_swc_prepay_whole1_spare',
                                value: 0
                            });
                            //发货前预付金额 custcol_swc_prepay_beforearrived 默认0
                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_swc_prepay_beforearrived',
                                value: 0
                            });
                            //已预付总金额 custcol_swc_bill_writeoff_amount 默认0
                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_swc_bill_writeoff_amount',
                                value: 0
                            });
                            //待支付金额（应付-预付总和） custcol_swc_bill_unsettled_amount 总金额
                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_swc_bill_unsettled_amount',
                                value: grossamt
                            });
                            //已支付金额 custcol_swc_alreadyused 默认0
                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_swc_alreadyused',
                                value: 0
                            });
                            //剩余金额 custcol_swc_notnotused 总金额
                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_swc_notnotused',
                                value: grossamt
                            });
                        }
                        rec.commitLine({sublistId: 'item'});
                    }

                    let recId = rec.save({ignoreMandatoryFields:true});
                    log.audit('核销处理成功',recId);
                }
            }
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
