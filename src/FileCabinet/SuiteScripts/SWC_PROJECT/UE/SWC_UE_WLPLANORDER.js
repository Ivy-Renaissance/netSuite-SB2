/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record'],

    (record) => {
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

        };

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        };

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            try {
                if (scriptContext.type == 'edit') {
                    var newRecord = scriptContext.newRecord;
                    var flag = newRecord.getValue({fieldId: 'custrecord_swc_wl_noaddfee_flag'}) || '';
                    var plan_status = newRecord.getValue({fieldId: 'custrecord_swc_wl_plan_status'}) || '';

                    //如果采购杂费为选中状态 则更改物流发运单状态为2
                    if (flag && plan_status == '') {
                        record.submitFields({
                            type: 'customrecord_swc_wl_plan_order',
                            id: newRecord.id,
                            values: {
                                'custrecord_swc_wl_plan_status': 2,
                            },
                        });
                    }
                }
            } catch (e) {
                log.error('afterSubmit 中错误', e);
            }
        };

        return {beforeLoad, beforeSubmit, afterSubmit};

    });
