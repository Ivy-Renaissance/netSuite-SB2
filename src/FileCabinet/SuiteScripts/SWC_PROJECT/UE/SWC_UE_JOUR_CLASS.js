/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @name SWC_UE_JOUR_CLASS.js
 * @author ZJG
 * @description 日记账行类别设值
 */
define(['N/record', 'N/search', '../common/moment', '../common/interface', 'N/runtime', 'N/error', 'N/currency'],

    function (record, search, moment, interface, runtime, error, currency) {

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        function beforeLoad(scriptContext) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {
            try {
                let newRecord = scriptContext.newRecord;
                if (scriptContext.type != 'delete') {
                    log.audit('beforeSubmit type', scriptContext.type);
                    var rec = record.load({ type: newRecord.type, id: newRecord.id });

                    let sku_names = [];
                    let jour_line = rec.getLineCount({ sublistId: 'line' });
                    for (let i = 0; i < jour_line; i++) {
                        let sku_name = rec.getSublistText({ sublistId: 'line', fieldId: 'custcol_swc_main_sku', line: i });
                        let class_id = rec.getSublistValue({ sublistId: 'line', fieldId: 'class', line: i });
                        if (!class_id) {
                            if (sku_name) {
                                sku_names.push(sku_name);
                            }
                        }
                    }
                    if (sku_names.length) {
                        sku_names = [...new Set(sku_names)];
                        log.audit('sku_names', sku_names);

                        let sku_class_info = interface.SearchClassInfo(sku_names);
                        log.audit('sku_class_info', sku_class_info);

                        for (let i = 0; i < jour_line; i++) {
                            let sku_name = rec.getSublistText({ sublistId: 'line', fieldId: 'custcol_swc_main_sku', line: i });
                            for (let j = 0; j < sku_class_info.length; j++) {
                                if (sku_name == sku_class_info[j].name) {
                                    rec.setSublistValue({ sublistId: 'line', fieldId: 'class', value: sku_class_info[j].id, line: i });
                                }
                            }
                        }
                        rec.save({ ignoreMandatoryFields: true });
                    }
                }
            } catch (error) {
                log.error('beforeSubmit error', error);
            }
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });