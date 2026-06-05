/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 *@description 拆分采购汇总表
 */
define(['N/search', 'N/record'], function (search, record) {

    function beforeLoad(context) {
        try {
            var newRecord = context.newRecord, form = context.form;
            form.clientScriptModulePath = '../CS/SWC_CS_SPLIT_PURCHASE_DEMAND.js';
            if (context.type == 'edit') {
                form.addButton({
                    id: 'custpage_split_pdd',
                    label: '拆分供应商',
                    functionName: 'onSplitButtonClick("' + newRecord.id + '")',
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
