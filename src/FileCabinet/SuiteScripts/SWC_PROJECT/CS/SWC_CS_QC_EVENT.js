/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/ui/dialog', 'N/search'], function (dialog, search) {

    function pageInit(context) {

    }

    function saveRecord(context) {

    }

    function validateField(context) {

    }

    function fieldChanged(context) {
        try {
            var now_rec = context.currentRecord, field_id = context.fieldId, sublist_id = 'recmachcustrecord_swc_related_main_qc';
            if (field_id == 'custrecord_swc_qc_premium_qty' || field_id == 'custrecord_swc_qc_good_qty' || field_id == 'custrecord_swc_qc_defective_qty') {
                var qc_premium_qty = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_qc_premium_qty' }) || 0;
                var qc_good_qty = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_qc_good_qty' }) || 0;
                var qc_defective_qty = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_qc_defective_qty' }) || 0;
                var qc_item_qty = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_qc_item_qty' }) || 0;
                var total_qty = Number(qc_premium_qty) + Number(qc_good_qty) + Number(qc_defective_qty);
                if (Number(total_qty) > Number(qc_item_qty)) {
                    dialog.alert({
                        title: '提示',
                        message: '优等品数量、良品数量、不合格数量总和不能大于质检数量'
                    });
                    now_rec.setCurrentSublistValue({ sublistId: sublist_id, fieldId: field_id, value: 0 });
                }
            } else if (field_id == 'custrecord_swc_qc_details_item') {
                var ven_id = now_rec.getValue('custrecord_swc_qc_vendor');
                var item_id = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_qc_details_item' });
                if (item_id) {
                    var is_qc = getIsQc(item_id, ven_id);
                    now_rec.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_qc_is_check', value: is_qc });
                } else {
                    now_rec.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_qc_is_check', value: false });
                }
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getIsQc(item_id, ven_id) {
        var need_data = false;
        search.create({
            type: 'customrecord_swc_comparison_table',
            filters: [
                ['custrecord_swc_qc_item', 'anyof', item_id],
                'AND',
                ['isinactive', 'is', 'F'],
                'AND',
                ['custrecord_swc_qc_supplier', 'anyof', ven_id]
            ],
            columns: [
                'custrecord_swc_is_qc'
            ]
        }).run().each(function (result) {
            need_data = result.getValue(result.columns[0]);
            return false;
        });
        return need_data;
    }

    function postSourcing(context) {

    }

    function lineInit(context) {

    }

    function validateDelete(context) {

    }

    function validateInsert(context) {

    }

    function validateLine(context) {

    }

    function sublistChanged(context) {

    }

    return {
        // pageInit: pageInit,
        // saveRecord: saveRecord,
        // validateField: validateField,
        fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // lineInit: lineInit,
        // validateDelete: validateDelete,
        // validateInsert: validateInsert,
        // validateLine: validateLine,
        // sublistChanged: sublistChanged
    }
});
