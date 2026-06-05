/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/search', 'N/ui/dialog'], function (search, dialog) {

    function pageInit(context) {

    }

    function saveRecord(context) {
        return true;
        // try {
        //     var now_rec = context.currentRecord, sublist_id = 'recmachcustrecord_swc_sku_price_main_list';
        //     var multiple_prices = now_rec.getValue('custrecord_swc_multiple_prices'), is_error = false, error_message;
        //     if (multiple_prices) {
        //         var line_count = now_rec.getLineCount(sublist_id);
        //         if (line_count > 0) {
        //             for (var i = 0; i < line_count; i++) {
        //                 var unit_price = now_rec.getSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_premium_unit_price', line: i });
        //                 var good_unit_price = now_rec.getSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_good_unit_price', line: i });
        //                 if (!unit_price || !good_unit_price) {
        //                     is_error = true;
        //                     error_message = '勾选了【是否有多重价格】字段，请检查每行的【优等品含税单价】【良品含税单价】是否都已经维护！'
        //                 }
        //             }
        //         }
        //     }
        //     if (is_error) {
        //         dialog.alert({
        //             title: '提示',
        //             message: error_message
        //         });
        //         return false;
        //     }
        //     return true;
        // } catch (e) {
        //     log.debug('e', e);
        // }
    }

    function validateField(context) {

    }

    function fieldChanged(context) {
        try {
            var now_rec = context.currentRecord, field_id = context.fieldId, sublist_id = 'recmachcustrecord_swc_sku_price_main_list';
            if (field_id == 'custrecord_swc_premium_unit_price') {
                var tax_code = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_tax_code' });
                var tax_rate = getTaxRate(tax_code);
                var unit_price = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_premium_unit_price' }) || 0;
                var excluding_tax_amt = unit_price / (1 + Number(tax_rate));
                now_rec.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_premium_excluding_tax', value: excluding_tax_amt.toFixed(8) });
            } else if (field_id == 'custrecord_swc_good_unit_price') {
                var tax_code = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_tax_code' });
                var tax_rate = getTaxRate(tax_code);
                var unit_price = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_good_unit_price' }) || 0;
                var excluding_tax_amt = unit_price / (1 + Number(tax_rate));
                now_rec.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_good_excluding_tax', value: excluding_tax_amt.toFixed(8) });
            } else if (field_id == 'custrecord_swc_tax_code') {
                var tax_code = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_tax_code' });
                var tax_rate = getTaxRate(tax_code);
                var unit_price = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_premium_unit_price' }) || 0;
                var excluding_tax_amt = unit_price / (1 + Number(tax_rate));
                now_rec.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_premium_excluding_tax', value: excluding_tax_amt.toFixed(8) });
                var good_unit_price = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_good_unit_price' }) || 0;
                var good_excluding_tax_amt = good_unit_price / (1 + Number(tax_rate));
                now_rec.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_good_excluding_tax', value: good_excluding_tax_amt.toFixed(8) });
            } else if (field_id == 'custrecord_swc_premium_unit_price_usd') {
                var tax_code = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_tax_code_usd' });
                var tax_rate = getTaxRate(tax_code);
                var unit_price = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_premium_unit_price_usd' }) || 0;
                var excluding_tax_amt = unit_price / (1 + Number(tax_rate));
                now_rec.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_premium_excluding_tax_usd', value: excluding_tax_amt.toFixed(8) });
            } else if (field_id == 'custrecord_swc_good_unit_price_usd') {
                var tax_code = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_tax_code_usd' });
                var tax_rate = getTaxRate(tax_code);
                var unit_price = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_good_unit_price_usd' }) || 0;
                var excluding_tax_amt = unit_price / (1 + Number(tax_rate));
                now_rec.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_good_excluding_tax_usd', value: excluding_tax_amt.toFixed(8) });
            } else if (field_id == 'custrecord_swc_tax_code_usd') {
                var tax_code = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_tax_code_usd' });
                var tax_rate = getTaxRate(tax_code);
                var unit_price = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_premium_unit_price_usd' }) || 0;
                var excluding_tax_amt = unit_price / (1 + Number(tax_rate));
                now_rec.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_premium_excluding_tax_usd', value: excluding_tax_amt.toFixed(8) });
                var good_unit_price = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_good_unit_price_usd' }) || 0;
                var good_excluding_tax_amt = good_unit_price / (1 + Number(tax_rate));
                now_rec.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_good_excluding_tax_usd', value: good_excluding_tax_amt.toFixed(8) });
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getTaxRate(tax_code) {
        var tax_rate = 0;
        if (tax_code) {
            search.create({
                type: 'salestaxitem',
                filters: [
                    ['internalid', 'anyof', tax_code],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    'rate'
                ]
            }).run().each(function (result) {
                tax_rate = result.getValue(result.columns[0]) ? result.getValue(result.columns[0]).replace('%', '') / 100 : 0;
                return false;
            });
        }
        return tax_rate;
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
        pageInit: pageInit,
        saveRecord: saveRecord,
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
