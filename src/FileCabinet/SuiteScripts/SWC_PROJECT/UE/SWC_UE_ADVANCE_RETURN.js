/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search','../common/SWC_CONFIG_DATA'],
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

            if (scriptContext.type === "edit") {
                let newRecord = scriptContext.newRecord;
                let id = newRecord.id;
                let recType = newRecord.type;
                let rec = record.load({type: recType, id: id,isDynamic: true});
                let status = rec.getValue({fieldId: 'custrecord_swc_advancepay_state'});

                //状态是已关闭或已作废
                if (status == SWC_CONFIG_DATA.configData().s_pr_status_yzf || status == SWC_CONFIG_DATA.configData().s_pr_status_yjj) {
                    let soId = rec.getValue({fieldId: 'custrecord_swc_advancepay_po'});

                    let soRec = record.load({type: "purchaseorder", id: soId,isDynamic: true});
                    var main_yf = soRec.getValue({
                        fieldId: 'custbody_swc_whole_flag',
                    });
                    if (main_yf == id) {
                        soRec.setValue({
                            fieldId: 'custbody_swc_whole_flag',
                            value: ''
                        });
                    }

                    var count = soRec.getLineCount({sublistId: 'item'});
                    for (let i = 0; i< count;i++) {
                        soRec.selectLine({
                            sublistId: 'item',
                            line: i
                        });
                        var line_yf = soRec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_swc_whole_flag'
                        });
                        if (line_yf == id) {
                            soRec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_swc_whole_flag',
                                value: ''
                            });
                        }
                        soRec.commitLine({sublistId: 'item'});
                    }
                    var newSoId = soRec.save();
                    log.debug('反写成功',newSoId);
                }
            }
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });