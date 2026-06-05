/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@description 一键接收配件类型采购订单
 */
define(['N/search', 'N/record'], function (search, record) {

    function beforeLoad(context) {
        try {
            var newRecord = context.newRecord, form = context.form;
            form.clientScriptModulePath = '../CS/SWC_CS_PO_RECEIPT.js';
            if (context.type == 'view') {
                var po_transfer = newRecord.getValue({ fieldId: 'custbody_swc_po_transfer' }) === true
                    || newRecord.getValue({ fieldId: 'custbody_swc_po_transfer' }) === 'T';
                var status = newRecord.getValue('status');
                log.debug('status', status)
                var orderstatus = newRecord.getValue('orderstatus');
                var app_status = newRecord.getValue('custbody_swc_purord_status');//采购/物流-订单审批状态
                log.debug('orderstatus', orderstatus)
                if ((orderstatus == 'B' || orderstatus == 'D' || orderstatus == 'E') && app_status == 9 && !po_transfer) {
                    var sublistcount = newRecord.getLineCount({ sublistId: 'item' });
                    log.debug('sublistcount', sublistcount)
                    for (let i = 0; i < sublistcount; i++) {
                        var isMain = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_main_sku', line: i }) || 0;
                        if (!isMain) {
                            form.addButton({
                                id: 'custpage_receipt',
                                label: '一键接收',
                                functionName: 'batchReceive("' + newRecord.id + '")',
                            });
                            break;
                        }

                    }
                }
                const linkId = String(newRecord.id || '');
                // 调拨费状态
                var db_type = newRecord.getValue({ fieldId: 'custbody_swc_po_db_type' })



                var no_transfer = newRecord.getValue({ fieldId: 'custbody_swc_notransferfee_check' }) === true
                    || newRecord.getValue({ fieldId: 'custbody_swc_notransferfee_check' }) === 'T';

                if (po_transfer) {
                    log.debug('po_transfer', po_transfer)
                    if (no_transfer && db_type < 5) {
                        form.addButton({
                            id: 'custpage_btn_inout_order',
                            label: '采购入库调拨',
                            functionName: 'onClickInOutCreate("' + newRecord.id + '")'//`onClickInOutCreate("${linkId}")`
                        });
                    } else {
                        if (db_type == '') {
                            form.addButton({
                                id: 'custpage_btn_fee_po_create',
                                label: '费用类型采购订单做成',
                                functionName: 'onClickFeePoCreate("' + newRecord.id + '")'//`onClickFeePoCreate("${linkId}")`
                            });
                        } else if (db_type == 4) {
                            form.addButton({
                                id: 'custpage_btn_approve_ok',
                                label: '调拨费入库分摊',
                                functionName: 'onClickApproveOk("' + newRecord.id + '")'//`onClickApproveOk("${linkId}")`
                            });
                        } else if (db_type == 3) {
                            form.addButton({
                                id: 'custpage_btn_reapply',
                                label: '重新审核',
                                functionName: 'onClickReapply("' + newRecord.id + '")'//`onClickReapply("${linkId}")`
                            });
                        }
                    }
                }


            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {

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
