/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log', 'N/search', 'N/error', 'N/runtime'], (record, log, search, error, runtime) => {

    const CHILD_REC_TYPE = 'customrecord_swc_actual_cabinet_detail';

    // 子表字段
    const F_PARENT = 'custrecord_swc_acd_actual_cabinet';
    const F_MEMO = 'custrecord_swc_zs_po_memo';
    const F_AECN = 'custrecord_swc_acd_estimated_cabine_no';
    const F_ACD_QTY = 'custrecord_swc_acd_zs_qty';
    const F_VOLUME = 'custrecord_swc_acd_volume';

    // 父表头字段
    const F_PARENT_TOTAL_QTY = 'custrecord_swc_pg_zxs';
    const F_PARENT_TOTAL_VOL = 'custrecord_swc_pg_zyj';

    // Estimated Detail
    const EST_DETAIL_TYPE = 'customrecord_swc_estimated_cabine_detail';
    const F_EST_ZS_QTY = 'custrecord_swc_ecd_zs_qty';

    // PO 行字段
    const PO_LINE_NO_FIELD = 'custcol_swc_line_no';
    const PO_AC_QTY_FIELD = 'custcol_swc_ac_qty';

    function toNumber(v) {
        if (v === null || v === undefined || v === '') return 0;
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }

    /**
     * 解析 memo，生成 rollbackMap
     * { [poId]: { [lineNo]: qty } }
     */
    function buildRollbackMapFromMemo(memoStr) {
        const rollbackMap = {};

        if (!memoStr) return rollbackMap;

        let obj;
        try {
            obj = JSON.parse(memoStr);
        } catch (e) {
            throw error.create({
                name: 'INVALID_MEMO_JSON',
                message: '删除被阻止：custrecord_swc_zs_po_memo 不是合法 JSON。',
                notifyOff: false
            });
        }

        const poId = obj && obj.poId ? String(obj.poId) : '';
        const allocations = obj && Array.isArray(obj.allocations) ? obj.allocations : [];

        if (!poId || allocations.length === 0) return rollbackMap;

        rollbackMap[poId] = {};

        for (let i = 0; i < allocations.length; i++) {
            const lineNo = allocations[i] && allocations[i].lineNo !== undefined ? String(allocations[i].lineNo) : '';
            const qty = toNumber(allocations[i] && allocations[i].qty);

            if (!lineNo || qty === 0) continue;
            rollbackMap[poId][lineNo] = toNumber(rollbackMap[poId][lineNo]) + qty;
        }

        return rollbackMap;
    }

    /**
     * 回滚 Estimated Detail 的已装数量
     */
    function rollbackEstimatedDetail(oldRec) {
        const estDetailId = oldRec.getValue({ fieldId: F_AECN });
        const qty = toNumber(oldRec.getValue({ fieldId: F_ACD_QTY }));

        if (!estDetailId || qty === 0) return;

        const estRec = record.load({
            type: EST_DETAIL_TYPE,
            id: estDetailId,
            isDynamic: false
        });

        const oldQty = toNumber(estRec.getValue({ fieldId: F_EST_ZS_QTY }));
        const newQty = oldQty - qty;

        if (newQty < 0) {
            throw error.create({
                name: 'EST_ROLLBACK_NEGATIVE',
                message: `删除被阻止：预计排柜明细(${estDetailId}) 回滚后数量为负数。当前=${oldQty}，回滚=${qty}。`,
                notifyOff: false
            });
        }

        estRec.setValue({
            fieldId: F_EST_ZS_QTY,
            value: newQty
        });

        estRec.save({ ignoreMandatoryFields: true });

        log.debug('rollbackEstimatedDetail success', {
            estDetailId: estDetailId,
            oldQty: oldQty,
            rollbackQty: qty,
            newQty: newQty
        });
    }

    /**
     * 回滚 PO 行的 custcol_swc_ac_qty
     */
    function rollbackPOByMemo(oldRec) {
        const memoStr = oldRec.getValue({ fieldId: F_MEMO });
        if (!memoStr) return;

        const rollbackMap = buildRollbackMapFromMemo(memoStr);
        log.debug('rollbackMap', rollbackMap);

        for (const poId in rollbackMap) {
            if (!Object.prototype.hasOwnProperty.call(rollbackMap, poId)) continue;

            const lineNoQtyMap = rollbackMap[poId];

            const poRec = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: poId,
                isDynamic: false
            });

            const poLineCount = poRec.getLineCount({ sublistId: 'item' }) || 0;

            // lineNo -> lineIndex
            const idx = {};
            for (let i = 0; i < poLineCount; i++) {
                const lineNo = poRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: PO_LINE_NO_FIELD,
                    line: i
                });

                if (lineNo !== null && lineNo !== undefined && lineNo !== '') {
                    idx[String(lineNo)] = i;
                }
            }

            const lineNos = Object.keys(lineNoQtyMap || {});
            for (let j = 0; j < lineNos.length; j++) {
                const lineNo = String(lineNos[j]);
                const rollbackQty = toNumber(lineNoQtyMap[lineNo]);
                if (rollbackQty === 0) continue;

                const lineIndex = idx[lineNo];
                if (lineIndex === undefined) {
                    throw error.create({
                        name: 'PO_LINE_NOT_FOUND',
                        message: `删除被阻止：PO(${poId}) 找不到行号 ${PO_LINE_NO_FIELD}=${lineNo}，无法回滚。`,
                        notifyOff: false
                    });
                }

                const currentQty = toNumber(poRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: PO_AC_QTY_FIELD,
                    line: lineIndex
                }));

                const newQty = currentQty - rollbackQty;
                if (newQty < 0) {
                    throw error.create({
                        name: 'ROLLBACK_NEGATIVE',
                        message: `删除被阻止：PO(${poId}) 行(${lineNo}) 回滚后为负数。当前=${currentQty}，回滚=${rollbackQty}。`,
                        notifyOff: false
                    });
                }

                poRec.setSublistValue({
                    sublistId: 'item',
                    fieldId: PO_AC_QTY_FIELD,
                    line: lineIndex,
                    value: newQty
                });
            }

            poRec.save({ enableSourcing: true, ignoreMandatoryFields: true });
        }
    }

    /**
     * 重算父表头合计
     * 注意：这里按“剩余明细”重算，且排除当前即将删除的这一条
     * 保持和您父表 afterSubmit 里的算法一致：
     * - 总真实排柜数量：sum(custrecord_swc_acd_zs_qty)
     * - 总体积：sum(custrecord_swc_acd_volume)
     */
    function recalcParentSummary(oldRec) {
        const parentId = oldRec.getValue({ fieldId: F_PARENT });
        const currentChildId = oldRec.id;

        if (!parentId) return;

        const childSearch = search.create({
            type: CHILD_REC_TYPE,
            filters: [
                [F_PARENT, 'anyof', String(parentId)],
                'AND',
                ['internalid', 'noneof', String(currentChildId)]
            ],
            columns: [
                search.createColumn({ name: F_ACD_QTY }),
                search.createColumn({ name: F_VOLUME })
            ]
        });

        const rs = childSearch.run().getRange({ start: 0, end: 1000 }) || [];

        let qtySum = 0;
        let volSum = 0;

        for (let i = 0; i < rs.length; i++) {
            qtySum += toNumber(rs[i].getValue({ name: F_ACD_QTY }));
            volSum += toNumber(rs[i].getValue({ name: F_VOLUME }));
        }

        record.submitFields({
            type: 'customrecord_swc_actual_cabinet',
            id: parentId,
            values: {
                [F_PARENT_TOTAL_QTY]: qtySum,
                [F_PARENT_TOTAL_VOL]: volSum
            },
            options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
            }
        });

        log.debug('recalcParentSummary success', {
            parentId: parentId,
            qtySum: qtySum,
            volSum: volSum
        });
    }

    function beforeSubmit(context) {
        try {
            if (context.type !== context.UserEventType.DELETE) return;

            // 关键：避免父表整单删除时，父表 UE 已经做过回滚，这里再次回滚
            // 父表 UE 里 record.delete(child) 时，子表 UE 会在 USEREVENT 上下文触发
            if (runtime.executionContext === runtime.ContextType.USEREVENT) {
                log.debug('skip child delete rollback in USEREVENT context', runtime.executionContext);
                return;
            }

            const oldRec = context.oldRecord;
            if (!oldRec) return;

            rollbackEstimatedDetail(oldRec);
            rollbackPOByMemo(oldRec);
            recalcParentSummary(oldRec);

        } catch (err) {
            log.error('child beforeSubmit DELETE rollback error', err);
            throw err;
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };
});