/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/search', 'N/ui/dialog'], function (search, dialog) {

    function pageInit(context) {

    }

    function saveRecord(context) {
        try {
            var now_rec = context.currentRecord;
            var now_rec_id = now_rec.id;
            var vendor_list = now_rec.getValue('custrecord_swc_vendor_list');
            var effective_time = now_rec.getText('custrecord_swc_effective_time');
            if (vendor_list && effective_time) {
                //查询是否存在相同的记录
                var bill_id = getBillId(vendor_list, effective_time, now_rec_id);
                log.debug('bill_id', bill_id);
                if (bill_id) {
                    dialog.alert({
                        title: '提示',
                        message: '已经存在相同日期、供应商的记录!'
                    });
                } else {
                    return true;
                }
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getBillId(vendor_list, effective_time, now_rec_id) {
        var bill_id;
        var filters_arr = [
            ['custrecord_swc_vendor_list', 'anyof', vendor_list],
            'AND',
            ['custrecord_swc_effective_time', 'on', effective_time],
            'AND',
            ['isinactive', 'is', false]
        ];
        if (now_rec_id) {
            filters_arr.push('AND', ['internalid', 'noneof', now_rec_id]);
        }
        search.create({
            type: 'customrecord_swc_vendor_subsidiary_list',
            filters: filters_arr
        }).run().each(function (result) {
            bill_id = result.id;
            return false;
        });
        return bill_id;
    }

    function validateField(context) {

    }

    function fieldChanged(context) {

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
        saveRecord: saveRecord,
        // validateField: validateField,
        // fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // lineInit: lineInit,
        // validateDelete: validateDelete,
        // validateInsert: validateInsert,
        // validateLine: validateLine,
        // sublistChanged: sublistChanged
    }
});
