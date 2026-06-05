/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record'], function (search, record) {

    function beforeLoad(context) {
        try {
            var newRecord = context.newRecord, form = context.form;
            form.clientScriptModulePath = '../CS/SWC_CS_PO_MATCH_PRICE.js';
            if (context.type == 'view') {
                form.addButton({
                    id: 'custpage_update_price',
                    label: '更新价格',
                    functionName: 'updatePrice("' + newRecord.id + '")',
                });
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
        try {
            //数量回写请购订单
            var rec_record, sublist_id = 'item', delete_info = {};
            if (context.type == 'delete') {
                rec_record = context.oldRecord;
                var po_line = rec_record.getLineCount(sublist_id), pr_arr = [];
                for (var i = 0; i < po_line; i++) {
                    var pr_id = rec_record.getSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_pr_bill', line: i });
                    if (pr_id && pr_arr.indexOf(pr_id) == -1) {
                        delete_info[pr_id] = 0;
                        pr_arr.push(pr_id);
                    }
                }
            } else {
                rec_record = context.newRecord;
                var po_line = rec_record.getLineCount(sublist_id), pr_arr = [];
                for (var i = 0; i < po_line; i++) {
                    var pr_id = rec_record.getSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_pr_bill', line: i });
                    if (pr_id && pr_arr.indexOf(pr_id) == -1) {
                        pr_arr.push(pr_id);
                    }
                }
            }
            if (pr_arr.length > 0) {
                var need_pr_qty_info = {};
                var pr_qty_info = getQtyInfo(pr_arr);
                log.debug('pr_qty_info', pr_qty_info);
                log.debug('delete_info', delete_info);
                if (Object.keys(pr_qty_info).length > 0) {
                    need_pr_qty_info = pr_qty_info;
                } else {
                    need_pr_qty_info = delete_info;
                }
                if (Object.keys(need_pr_qty_info).length > 0) {
                    for (var i in need_pr_qty_info) {
                        var pr_data_id = record.submitFields({
                            type: 'customrecord_swc_purchase_request',
                            id: i,
                            values: {
                                custrecord_swc_pr_quantity_purchased: need_pr_qty_info[i]
                            }
                        });
                        if (pr_data_id) {
                            log.debug('success', '数量回写请购订单成功' + pr_data_id);
                        }
                    }
                }
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getQtyInfo(pr_arr) {
        var need_info = {};
        search.create({
            type: 'purchaseorder',
            filters:
                [
                    ['type', 'anyof', 'PurchOrd'],
                    'AND',
                    ['mainline', 'is', 'F'],
                    'AND',
                    ['custcol_swc_pr_bill', 'anyof', pr_arr],
                    'AND',
                    ['custcol_swc_pr_bill', 'noneof', '@NONE@'],
                    'AND',
                    ['closed', 'is', 'F']
                ],
            columns:
                [
                    search.createColumn({ name: 'custcol_swc_pr_bill', summary: 'GROUP', label: '请购单' }),
                    search.createColumn({ name: 'quantity', summary: 'SUM', label: '数量' })
                ]
        }).run().each(function (result) {
            need_info[result.getValue(result.columns[0])] = result.getValue(result.columns[1]);
            return true;
        });
        return need_info;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
