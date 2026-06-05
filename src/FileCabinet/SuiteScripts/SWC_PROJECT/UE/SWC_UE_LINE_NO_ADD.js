/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record'],

    function (record) {

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
                var rec = scriptContext.newRecord;
                var type = scriptContext.type;
                if (type == 'delete') {
                    return
                }
                var sublistId = 'item';
                if (rec.type == 'journalentry') {
                    sublistId = 'line'
                } else if (rec.type == 'inventoryadjustment' || rec.type == 'inventorytransfer') {
                    sublistId = 'inventory'
                }
                var transaction_rec = record.load({ type: rec.type, id: rec.id })
                var line = transaction_rec.getLineCount({ sublistId: sublistId });
                var status = true;
                for (var i = 0; i < line; i++) {
                    var line_no = transaction_rec.getSublistValue({ sublistId: sublistId, fieldId: 'line', line: i });
                    var dps_line_no = transaction_rec.getSublistValue({ sublistId: sublistId, fieldId: 'custcol_swc_line_no', line: i });
                    if (line_no != dps_line_no) {
                        transaction_rec.setSublistValue({ sublistId: sublistId, fieldId: 'custcol_swc_line_no', value: line_no, line: i });
                        status = false;
                    }
                }
                if (status) {
                    log.audit('已存在行号，直接返回', rec.id);
                    return
                }
                transaction_rec.save({ ignoreMandatoryFields: true });
                log.audit('设置行成功', rec.id);
            } catch (error) {
                log.error('error', error);
            }
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });
