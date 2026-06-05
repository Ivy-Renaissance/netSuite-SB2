/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope public
 */
define(['N/currentRecord', 'N/format', 'N/url'],
    /**
     * @param {currency} currency
     */
    function (currentRecord, format, urls) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
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
            var now_rec = scriptContext.currentRecord, field_id = scriptContext.fieldId;

            log.debug('field_id', field_id);
                return true;
        }




        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
        };

    });