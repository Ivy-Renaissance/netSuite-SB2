/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime', '../common/SWC_CONFIG_DATA'], function (record, search, runtime, SWC_CONFIG_DATA) {
    var CONFIG = SWC_CONFIG_DATA.configData();

    const PARAM_ACTION = 'custscript_swc_fee_po_wf_action';

    const RECORD_TYPE_WL_PLAN_ORDER = 'customrecord_swc_wl_plan_order';
    const RECORD_TYPE_PURCHASE_ORDER = 'purchaseorder';//record.Type.PURCHASE_ORDER;
    const RECORD_TYPE_TRANSFER_ORDER = 'transferorder';

    const SUBLIST_WL_FIRST_LEG_COST = 'recmachcustrecord_swc_wl_first_leg_cost_id';
    const FIELD_BODY_FEE_AR_TYPE = 'custbody_swc_fee_ar_type';
    const FIELD_WL_PLAN_STATUS = 'custrecord_swc_wl_plan_status';
    const FIELD_WL_FLC_PO = 'custrecord_swc_wl_flc_po';
    const FIELD_WL_FLC_PO_TYPE = 'custrecord_swc_wl_flc_po_type';

    function onAction(scriptContext) {
        var currentRecord = scriptContext.newRecord;
        var poId = String(currentRecord && currentRecord.id || '');
        if (!poId) {
            throw new Error('工作流动作执行失败：缺少采购订单ID');
        }

        var action = normalizeAction(runtime.getCurrentScript().getParameter({ name: PARAM_ACTION }));
        if (!action) {
            throw new Error('工作流动作执行失败：脚本参数 ' + PARAM_ACTION + ' 未配置，需传 approve 或 reject');
        }

        processApproval(poId, action);
        return 'success';
    }

    function normalizeAction(action) {
        var value = String(action || '').trim().toLowerCase();
        if (value === 'approve' || value === 'pass' || value === '1' || value === '2') {
            return 'approve';
        }
        if (value === 'reject' || value === 'return' || value === '3') {
            return 'reject';
        }
        return '';
    }

    function processApproval(poId, action) {
        var poRec = record.load({
            type: RECORD_TYPE_PURCHASE_ORDER,
            id: poId,
            isDynamic: false
        });

        var feeType = poRec.getValue('custbody_swc_po_fee');
        var wlId = poRec.getValue('custbody_swc_wl_no');
        var cgId = poRec.getValue('custbody_swc_cg_sub_order_no');
        var feePoNo = poRec.getValue('custbody_swc_fee_po_no');
        var transorderId = poRec.getValue('custbody_swc_transorder_id');
        var poDbId = poRec.getValue('custbody_swc_po_db_id');
        log.debug('审批信息', {
            'poId': poId,
            'action': action,
            'feeType': feeType,
            'wlId': wlId,
            'cgId': cgId,
            'feePoNo': feePoNo,
            'transorderId': transorderId,
            'poDbId': poDbId
        })

        if (action === 'approve') {
            setPoArType(poId, 2);
            submitPoApproveStatus(poId);

            if (feeType == 2) {
                createVendorBillFromPo(poId, poRec.getValue('entity'), poRec);
                if (feePoNo) {
                    record.submitFields({
                        type: 'customrecord_swc_wl_po_fee',
                        id: feePoNo,
                        values: {
                            custrecord_swc_wl_po_fee_fpo_type: 4
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                }
                return;
            }

            if (feeType == 3) {
                createVendorBillFromPo(poId, poRec.getValue('entity'), poRec);

                if (wlId) {
                    updateWlFirstLegCostStatus(wlId, poId, 4, 9);
                }
                if (cgId) {
                    updateCgFirstLegCostStatus(cgId, poId, 4, 4);
                }
                return;
            }

            if (feeType == 4) {
                createVendorBillFromPo(poId, poRec.getValue('entity'), poRec);
                submitTransferDbType(transorderId, 4);
                submitTransferFeeRecordType(poDbId, poRec.getValue('custbody_swc_hw_po_db_id'), 2, 2);
                return;
            }

            if (feeType == 6) {
                var vendorBillRec = record.transform({
                    fromType: RECORD_TYPE_PURCHASE_ORDER,
                    fromId: poId,
                    toType: record.Type.VENDOR_BILL,
                    isDynamic: true
                });
                vendorBillRec.save({ ignoreMandatoryFields: true });
                return;
            }

            throw new Error('当前采购订单费用类型不支持审批通过：' + feeType);
        }

        if (action === 'reject') {
            setPoArType(poId, 3);
            submitPoRejectStatus(poId)

            if (feeType == 2) {
                if (feePoNo) {
                    record.submitFields({
                        type: 'customrecord_swc_wl_po_fee',
                        id: feePoNo,
                        values: {
                            custrecord_swc_wl_po_fee_fpo_type: 3
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                }
                return;
            }

            if (feeType == 3) {
                if (wlId) {
                    updateWlRejectStatus(wlId, poId);
                }
                if (cgId) {
                    updateCgRejectStatus(cgId, poId);
                }
                return;
            }

            if (feeType == 4) {
                submitTransferDbType(transorderId, 3);
                submitTransferFeeRecordType(poDbId, poRec.getValue('custbody_swc_hw_po_db_id'), 3, 2);
                return;
            }

            throw new Error('当前采购订单费用类型不支持审批驳回：' + feeType);
        }
    }

    function setPoArType(poId, arType) {
        record.submitFields({
            type: RECORD_TYPE_PURCHASE_ORDER,
            id: poId,
            values: {
                custbody_swc_fee_ar_type: arType
            },
            options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
            }
        });
    }

    function submitPoRejectStatus(poId) {
        record.submitFields({
            type: RECORD_TYPE_PURCHASE_ORDER,
            id: poId,
            values: {
                custbody_swc_purord_status: CONFIG.PO_STATUS_REJECTED,
                approvalstatus: CONFIG.PO_APPROVALSTATUS_PENDING
            },
            options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
            }
        });
    }

    function submitPoApproveStatus(poId) {
        record.submitFields({
            type: RECORD_TYPE_PURCHASE_ORDER,
            id: poId,
            values: {
                custbody_swc_purord_status: CONFIG.PO_STATUS_APPROVED,
                approvalstatus: CONFIG.PO_APPROVALSTATUS_APPROVED
            },
            options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
            }
        });
    }

    function getFirstVendorPaymentTerms(vendorId) {
        if (!vendorId) return '';

        var vendorInfo = search.lookupFields({
            type: search.Type.VENDOR,
            id: vendorId,
            columns: ['custentity_swc_payment_terms']
        });

        var termsValue = vendorInfo && vendorInfo.custentity_swc_payment_terms;
        if (!termsValue) return '';

        if (Array.isArray(termsValue) && termsValue.length > 0) {
            return termsValue[0] && termsValue[0].value ? termsValue[0].value : '';
        }

        if (typeof termsValue === 'string') {
            var ids = termsValue.split(',').map(function (id) {
                return String(id || '').trim();
            }).filter(function (id) {
                return !!id;
            });
            return ids.length > 0 ? ids[0] : '';
        }

        return '';
    }

    function applyVendorPaymentTerms(tranRec, vendorId) {
        if (!tranRec || !vendorId) return;
        if (!tranRec.getField({ fieldId: 'custbody_swc_vendor_payment_terms' })) return;

        var paymentTerms = getFirstVendorPaymentTerms(vendorId);
        if (paymentTerms) {
            tranRec.setValue({
                fieldId: 'custbody_swc_vendor_payment_terms',
                value: paymentTerms
            });
        }
    }

    function createVendorBillFromPo(poId, vendorId, poRec) {
        var existingVendorBillId = findVendorBillByPo(poId);
        if (existingVendorBillId) {
            log.audit('FEE_PO_APPROVAL_VENDOR_BILL_EXISTS', {
                poId: poId,
                vendorBillId: existingVendorBillId,
                stage: 'before_transform'
            });
            return existingVendorBillId;
        }

        poRec = poRec || record.load({
            type: RECORD_TYPE_PURCHASE_ORDER,
            id: poId,
            isDynamic: false
        });

        var receiptInfo = getPoReceiptRequirement(poRec);
        var receiptId = '';

        log.audit('FEE_PO_APPROVAL_BILL_ROUTE', {
            poId: poId,
            vendorId: vendorId,
            needItemReceipt: receiptInfo.needItemReceipt,
            fulfillableItemIds: receiptInfo.fulfillableItemIds,
            receiptLines: receiptInfo.receiptLines,
            route: receiptInfo.needItemReceipt
                ? 'purchaseorder_to_itemreceipt_to_vendorbill'
                : 'purchaseorder_to_vendorbill'
        });

        if (receiptInfo.needItemReceipt) {
            receiptId = createItemReceiptFromPo(poId);
        }

        var vendorBillId = '';
        try {
            var vendorBillRec = record.transform({
                fromType: RECORD_TYPE_PURCHASE_ORDER,
                fromId: poId,
                toType: record.Type.VENDOR_BILL,
                isDynamic: true
            });
            applyVendorPaymentTerms(vendorBillRec, vendorId);
            vendorBillId = vendorBillRec.save({ ignoreMandatoryFields: true });
        } catch (e) {
            existingVendorBillId = findVendorBillByPo(poId);
            if (existingVendorBillId) {
                log.audit('FEE_PO_APPROVAL_VENDOR_BILL_EXISTS', {
                    poId: poId,
                    vendorBillId: existingVendorBillId,
                    receiptId: receiptId,
                    stage: 'after_transform_error',
                    errorName: e.name,
                    errorMessage: e.message
                });
                return existingVendorBillId;
            }
            throw e;
        }

        log.audit('FEE_PO_APPROVAL_VENDOR_BILL_CREATED', {
            poId: poId,
            receiptId: receiptId,
            vendorBillId: vendorBillId
        });
        return vendorBillId;
    }

    function findVendorBillByPo(poId) {
        if (!poId) return '';

        var billId = '';
        search.create({
            type: 'vendorbill',
            filters: [
                ['mainline', 'is', 'T'],
                'AND',
                ['createdfrom', 'anyof', poId],
                'AND',
                ['voided', 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'internalid', sort: search.Sort.DESC })
            ]
        }).run().each(function (result) {
            billId = result.getValue({ name: 'internalid' }) || '';
            return false;
        });

        return billId;
    }

    function createItemReceiptFromPo(poId) {
        var receiptRec = record.transform({
            fromType: RECORD_TYPE_PURCHASE_ORDER,
            fromId: poId,
            toType: record.Type.ITEM_RECEIPT,
            isDynamic: true
        });
        var receiptId = receiptRec.save({ ignoreMandatoryFields: true });
        log.audit('FEE_PO_APPROVAL_ITEM_RECEIPT_CREATED', {
            poId: poId,
            receiptId: receiptId
        });
        return receiptId;
    }

    function getPoReceiptRequirement(poRec) {
        var lineCount = poRec.getLineCount({ sublistId: 'item' }) || 0;
        var itemIds = [];
        var itemIdMap = {};

        for (var i = 0; i < lineCount; i++) {
            var itemId = poRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
            if (!itemId || itemIdMap[String(itemId)]) continue;
            itemIdMap[String(itemId)] = true;
            itemIds.push(String(itemId));
        }

        var fulfillableItemMap = getFulfillableItemMap(itemIds);
        var receiptLines = [];
        var fulfillableItemIds = [];

        for (var line = 0; line < lineCount; line++) {
            var lineItemId = poRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: line });
            if (!lineItemId || !fulfillableItemMap[String(lineItemId)]) continue;

            var quantity = toNumber(poRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: line }));
            var quantityReceived = toNumber(poRec.getSublistValue({ sublistId: 'item', fieldId: 'quantityreceived', line: line }));
            var quantityRemaining = round2(quantity - quantityReceived);
            if (quantityRemaining <= 0) continue;

            fulfillableItemIds.push(String(lineItemId));
            receiptLines.push({
                line: line,
                item: String(lineItemId),
                quantity: quantity,
                quantityReceived: quantityReceived,
                quantityRemaining: quantityRemaining
            });
        }

        return {
            needItemReceipt: receiptLines.length > 0,
            fulfillableItemIds: uniqueIds(fulfillableItemIds),
            receiptLines: receiptLines
        };
    }

    function getFulfillableItemMap(itemIds) {
        var map = {};
        itemIds = uniqueIds(itemIds || []);
        if (itemIds.length === 0) return map;

        var itemSearch = search.create({
            type: search.Type.ITEM,
            filters: [
                ['internalid', 'anyof', itemIds]
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'isfulfillable' })
            ]
        });

        itemSearch.run().each(function (result) {
            var itemId = String(result.getValue({ name: 'internalid' }) || '');
            if (!itemId) return true;
            map[itemId] = toBool(result.getValue({ name: 'isfulfillable' }));
            return true;
        });

        return map;
    }

    function uniqueIds(ids) {
        var map = {};
        var list = [];
        (ids || []).forEach(function (id) {
            id = String(id || '');
            if (!id || map[id]) return;
            map[id] = true;
            list.push(id);
        });
        return list;
    }

    function toBool(value) {
        return value === true || value === 'T' || value === 'true';
    }

    function toNumber(value) {
        var num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    }

    function round2(num) {
        return Math.round(toNumber(num) * 100) / 100;
    }

    function updateWlFirstLegCostStatus(wlId, poId, targetPoType, completedStatus) {
        var wlRec = record.load({
            type: RECORD_TYPE_WL_PLAN_ORDER,
            id: wlId,
            isDynamic: false
        });

        var lineCount = wlRec.getLineCount({ sublistId: SUBLIST_WL_FIRST_LEG_COST }) || 0;
        var allCompleted = true;

        for (var i = 0; i < lineCount; i++) {
            var wlFlcPo = wlRec.getSublistValue({ sublistId: SUBLIST_WL_FIRST_LEG_COST, fieldId: FIELD_WL_FLC_PO, line: i }) || '';
            var fpoType = wlRec.getSublistValue({ sublistId: SUBLIST_WL_FIRST_LEG_COST, fieldId: FIELD_WL_FLC_PO_TYPE, line: i });
            var poIds = normalizeMultiSelectIds(wlFlcPo);

            if (containsMultiSelectId(poIds, poId)) {
                wlRec.setSublistValue({
                    sublistId: SUBLIST_WL_FIRST_LEG_COST,
                    fieldId: FIELD_WL_FLC_PO_TYPE,
                    value: targetPoType,
                    line: i
                });
                fpoType = targetPoType;
            }

            if (poIds.length > 0 && Number(fpoType) !== 4) {
                allCompleted = false;
            }
        }

        if (allCompleted) {
            wlRec.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: completedStatus });
        }

        wlRec.save({ enableSourcing: false, ignoreMandatoryFields: true });
    }

    function updateWlRejectStatus(wlId, poId) {
        var wlRec = record.load({
            type: RECORD_TYPE_WL_PLAN_ORDER,
            id: wlId,
            isDynamic: false
        });

        var lineCount = wlRec.getLineCount({ sublistId: SUBLIST_WL_FIRST_LEG_COST }) || 0;
        for (var i = 0; i < lineCount; i++) {
            var wlFlcPo = wlRec.getSublistValue({ sublistId: SUBLIST_WL_FIRST_LEG_COST, fieldId: FIELD_WL_FLC_PO, line: i }) || '';
            if (containsMultiSelectId(normalizeMultiSelectIds(wlFlcPo), poId)) {
                wlRec.setSublistValue({
                    sublistId: SUBLIST_WL_FIRST_LEG_COST,
                    fieldId: FIELD_WL_FLC_PO_TYPE,
                    value: 3,
                    line: i
                });
            }
        }
        wlRec.setValue({ fieldId: FIELD_WL_PLAN_STATUS, value: 14 });
        wlRec.save({ enableSourcing: false, ignoreMandatoryFields: true });
    }

    function updateCgFirstLegCostStatus(cgId, poId, targetPoType, completedStatus) {
        var cgRec = record.load({
            type: 'customrecord_swc_cg_sub_order',
            id: cgId,
            isDynamic: false
        });

        var sublistId = 'recmachcustrecord_swc_cg_first_leg_cost_id';
        var lineCount = cgRec.getLineCount({ sublistId: sublistId }) || 0;
        var allCompleted = true;

        for (var i = 0; i < lineCount; i++) {
            var wlFlcPo = cgRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_cflc_po', line: i }) || '';
            var fpoType = cgRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_cflc_po_type', line: i });
            var poIds = normalizeMultiSelectIds(wlFlcPo);

            if (containsMultiSelectId(poIds, poId)) {
                cgRec.setSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_swc_wl_cflc_po_type',
                    value: targetPoType,
                    line: i
                });
                fpoType = targetPoType;
            }

            if (poIds.length > 0 && Number(fpoType) !== 4) {
                allCompleted = false;
            }
        }

        if (allCompleted) {
            cgRec.setValue({ fieldId: 'custrecord_swc_cso_status', value: completedStatus });
        }

        cgRec.save({ enableSourcing: false, ignoreMandatoryFields: true });
    }

    function updateCgRejectStatus(cgId, poId) {
        var cgRec = record.load({
            type: 'customrecord_swc_cg_sub_order',
            id: cgId,
            isDynamic: false
        });

        var sublistId = 'recmachcustrecord_swc_cg_first_leg_cost_id';
        var lineCount = cgRec.getLineCount({ sublistId: sublistId }) || 0;
        for (var i = 0; i < lineCount; i++) {
            var wlFlcPo = cgRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_cflc_po', line: i }) || '';
            if (containsMultiSelectId(normalizeMultiSelectIds(wlFlcPo), poId)) {
                cgRec.setSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_swc_wl_cflc_po_type',
                    value: 3,
                    line: i
                });
            }
        }
        cgRec.setValue({ fieldId: 'custrecord_swc_cso_status', value: 5 });
        cgRec.save({ enableSourcing: false, ignoreMandatoryFields: true });
    }

    function normalizeMultiSelectIds(value) {
        if (value === null || value === undefined || value === '') return [];

        if (Array.isArray(value)) {
            return value.map(function (item) {
                if (item && typeof item === 'object' && item.value !== undefined && item.value !== null) {
                    return String(item.value).trim();
                }
                return String(item || '').trim();
            }).filter(function (item) {
                return !!item;
            });
        }

        return String(value).split(',').map(function (item) {
            return String(item || '').trim();
        }).filter(function (item) {
            return !!item;
        });
    }

    function containsMultiSelectId(idList, targetId) {
        var target = String(targetId || '').trim();
        if (!target || !idList || !idList.length) return false;
        for (var i = 0; i < idList.length; i++) {
            if (String(idList[i]) === target) {
                return true;
            }
        }
        return false;
    }

    function submitTransferDbType(transorderId, statusValue) {
        if (!transorderId) return;
        try {
            record.submitFields({
                type: RECORD_TYPE_TRANSFER_ORDER,
                id: transorderId,
                values: {
                    custbody_swc_po_db_type: statusValue
                }
            });
        } catch (error) {
            record.submitFields({
                type: RECORD_TYPE_PURCHASE_ORDER,
                id: transorderId,
                values: {
                    custbody_swc_po_db_type: statusValue
                }
            });
        }
    }

    function submitTransferFeeRecordType(poDbId, poDbIdHw, normalValue, hwValue) {
        try {
            record.submitFields({
                type: 'customrecord_swc_trnfrord_db',
                id: poDbId,
                values: {
                    custrecord_swc_trnfrord_po_type: normalValue
                }
            });
        } catch (e) {
            record.submitFields({
                type: 'customrecord_swc_trnfrord_db_hw',
                id: poDbIdHw,
                values: {
                    custrecord_swc_hw_trnfrord_po_type: hwValue
                }
            });
        }
    }

    return {
        onAction: onAction
    };
});
