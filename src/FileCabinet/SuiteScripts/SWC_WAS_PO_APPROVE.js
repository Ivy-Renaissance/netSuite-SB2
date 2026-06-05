/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/action', 'N/record', 'N/search'],
    /**
 * @param{action} action
 * @param{record} record
 * @param{search} search
 */
    (action, record, search) => {
        /**
         * Defines the WorkflowAction script trigger point.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
         * @param {string} scriptContext.type - Event type
         * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
         * @since 2016.1
         */
        const onAction = (scriptContext) => {
            log.debug('scriptContext.newRecord',scriptContext.newRecord)
            log.debug('scriptContext.workflowId',scriptContext.workflowId)
            log.debug('scriptContext.type',scriptContext.type)
            return 4;

        }

        return {onAction};
    });
