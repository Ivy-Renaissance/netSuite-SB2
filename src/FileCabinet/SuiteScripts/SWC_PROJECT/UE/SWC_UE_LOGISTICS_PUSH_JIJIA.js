/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function () {

    function beforeLoad(context) {
        try {
            var newRecord = context.newRecord, form = context.form;
            var confirm_push = newRecord.getValue('custrecord_swc_confirm_push');
            var accumulation_uccess = newRecord.getValue('custrecord_swc_push_accumulation_uccess');
            form.clientScriptModulePath = '../CS/SWC_CS_LOGISTICS_PUSH_JIJIA.js';
            if (context.type == 'view' && confirm_push && !accumulation_uccess) {
                form.addButton({
                    id: 'custpage_push_jijia',
                    label: '推送积加',
                    functionName: 'pushInfoToJijia("' + newRecord.id + '")',
                });
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
