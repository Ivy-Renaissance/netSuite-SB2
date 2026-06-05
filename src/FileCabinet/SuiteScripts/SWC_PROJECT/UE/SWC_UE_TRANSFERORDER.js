/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/log', 'N/record', '../common/SWC_CONFIG_DATA'], (search, log, record, SWC_CONFIG_DATA) => {
    const CONFIG = SWC_CONFIG_DATA.configData();

    const CS_PATH = CONFIG.CLIENT_SCRIPT_PATH_ESTIMATED_CABINET;
    const SUBLIST_HW = 'recmachcustrecord_swc_hw_trnfrord_link';
    const FIELD_HW_YG = 'custrecord_swc_hw_trnfrord_po_db_fee';
    const FIELD_HW_SJ = 'custrecord_swc_hw_trnfrord_po_db_fee_sj';
    const FIELD_HW_BILL = 'custrecord_swc_difference_bill';
    const FIELD_HW_ACTUAL_FLAG = 'custbody_swc_the_actual_overseas_wareh';

    function isEmptyBillValue(v) {
        if (v === null || v === undefined || v === '') return true;
        if (Array.isArray(v)) return v.length === 0;
        return false;
    }

    function hasHwActualDifferenceCandidate(rec) {
        var lineCount = rec.getLineCount({ sublistId: SUBLIST_HW }) || 0;
        log.debug('hasHwActualDifferenceCandidate lineCount', lineCount);
        for (var i = 0; i < lineCount; i++) {
            var feeYg = rec.getSublistValue({ sublistId: SUBLIST_HW, fieldId: FIELD_HW_YG, line: i });
            var feeSj = rec.getSublistValue({ sublistId: SUBLIST_HW, fieldId: FIELD_HW_SJ, line: i });
            var billId = rec.getSublistValue({ sublistId: SUBLIST_HW, fieldId: FIELD_HW_BILL, line: i });

            var hasYg = feeYg !== null && feeYg !== undefined && feeYg !== '';
            var hasSj = feeSj !== null && feeSj !== undefined && feeSj !== '';
            var isEmptyBill = isEmptyBillValue(billId);
            var diff = Number(feeYg || 0) - Number(feeSj || 0);
            var hasDiff = Number(diff || 0) !== 0;
            log.debug('hasHwActualDifferenceCandidate line', {
                line: i,
                feeYg: feeYg,
                feeSj: feeSj,
                billId: billId,
                hasYg: hasYg,
                hasSj: hasSj,
                isEmptyBill: isEmptyBill,
                diff: diff,
                hasDiff: hasDiff
            });
            if (hasYg && hasSj && isEmptyBill && hasDiff) {
                log.debug('hasHwActualDifferenceCandidate matched', { line: i });
                return true;
            }
        }
        log.debug('hasHwActualDifferenceCandidate matched', false);
        return false;
    }

    function beforeLoad(context) {
        try {
            // if (context.type == context.UserEventType.VIEW){
                const form = context.form;
                const rec = context.newRecord;
                const linkId = String(rec.id || '');
                form.clientScriptModulePath = CS_PATH;
                var loadedRec = linkId ? record.load({
                    type: record.Type.TRANSFER_ORDER,
                    id: linkId,
                    isDynamic: false
                }) : null;
                // 调拨费状态
                var db_type = rec.getValue({ fieldId: 'custbody_swc_po_db_type' })

                var po_transfer = rec.getValue({ fieldId: 'custbody_swc_po_transfer' }) === true
                    || rec.getValue({ fieldId: 'custbody_swc_po_transfer' }) === 'T';

                // 海外仓入库调拨费
                var transfer_hw = rec.getValue({ fieldId: 'custbody_swc_po_transfer_hw' }) === true
                    || rec.getValue({ fieldId: 'custbody_swc_po_transfer_hw' }) === 'T';
                var actual_hw_fee_filled = rec.getValue({ fieldId: FIELD_HW_ACTUAL_FLAG }) === true
                    || rec.getValue({ fieldId: FIELD_HW_ACTUAL_FLAG }) === 'T';

                var no_transfer = rec.getValue({ fieldId: 'custbody_swc_notransferfee_check' }) === true
                    || rec.getValue({ fieldId: 'custbody_swc_notransferfee_check' }) === 'T';

                log.debug('UE_TRANSFERORDER header flags', {
                    linkId: linkId,
                    db_type: db_type,
                    po_transfer: po_transfer,
                    transfer_hw: transfer_hw,
                    actual_hw_fee_filled: actual_hw_fee_filled,
                    no_transfer: no_transfer
                });


                if(no_transfer && db_type != 5){
                    form.addButton({
                        id: 'custpage_btn_inout_order',
                        label: '采购入库调拨',
                        functionName: `onClickInOutCreate("${linkId}")`
                    });
                }

                if(po_transfer){
                    log.debug('po_transfer', po_transfer)
                    if (db_type == '') {
                        form.addButton({
                            id: 'custpage_btn_fee_po_create',
                            label: '费用类型采购订单做成',
                            functionName: `onClickFeePoCreate("${linkId}")`
                        });
                    } else if (db_type == 4) {
                        form.addButton({
                            id: 'custpage_btn_approve_ok',
                            label: '调拨费入库分摊',
                            functionName: `onClickApproveOk("${linkId}")`
                        });
                    } else if (db_type == 3) {
                        form.addButton({
                            id: 'custpage_btn_reapply',
                            label: '重新审核',
                            functionName: `onClickReapply("${linkId}")`
                        });
                    }
                }

                if(transfer_hw){
                    if (db_type == '') {
                        form.addButton({
                            id: 'custpage_btn_fee_po_create_hw',
                            label: '费用类型采购订单做成',
                            functionName: `onClickFeePoCreate_hw("${linkId}")`
                        });
                    } else if (db_type == 4) {
                        form.addButton({
                            id: 'custpage_btn_approve_ok_hw',
                            label: '调拨费入库分摊',
                            functionName: `onClickApproveOk_hw("${linkId}")`
                        });
                    } else if (db_type == 3) {
                        form.addButton({
                            id: 'custpage_btn_reapply_hw',
                            label: '重新审核',
                            functionName: `onClickReapply_hw("${linkId}")`
                        });
                    } else if (db_type == 5) {
                        var canShowActualDiffBtn = actual_hw_fee_filled && loadedRec && hasHwActualDifferenceCandidate(loadedRec);
                        log.debug('UE_TRANSFERORDER actual diff button check', {
                            db_type: db_type,
                            transfer_hw: transfer_hw,
                            actual_hw_fee_filled: actual_hw_fee_filled,
                            canShowActualDiffBtn: canShowActualDiffBtn
                        });
                        if (canShowActualDiffBtn) {
                            form.addButton({
                                id: 'custpage_btn_difference_bill_hw_actual',
                                label: '实际差异账单做成',
                                functionName: `differentialBillingCompleted_hw_actual("${linkId}")`
                            });
                        }
                    }
                }
            // }

        } catch (e) {
            log.error('beforeLoad error', e);
        }
    }

    return { beforeLoad };
});
