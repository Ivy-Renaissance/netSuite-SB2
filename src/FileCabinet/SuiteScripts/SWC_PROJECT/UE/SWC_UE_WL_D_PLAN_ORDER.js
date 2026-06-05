/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log', 'N/search'], function(record, log, search){

    const CHILD_PARENT_FIELD = 'custrecord_swc_wl_plan_order_id';

    const FLD_ACTUAL_CABINET = 'custrecord_swc_wl_d_actual_cabinet';
    const FLD_SUPERIOR_QTY_Z = 'custrecord_swc_wl_d_superior_qty_z';
    const FLD_GOOD_QTY_Z     = 'custrecord_swc_wl_d_good_qty_z';

    const CABINET_DETAIL_TYPE = 'customrecord_swc_actual_cabinet_detail';
    const FLD_QTY_EXCELLENT   = 'custrecord_swc_acd_quantity_excellent';
    const FLD_QTY_FINE        = 'custrecord_swc_ecd_quantity_fine';

    function afterSubmit(context){
        if (context.type !== context.UserEventType.EDIT &&
            context.type !== context.UserEventType.XEDIT) {
            return;
        }

        var oldRec = context.oldRecord;
        var newRec = context.newRecord;
        if (!oldRec || !newRec) return;

        var oldParent = oldRec.getValue({ fieldId: CHILD_PARENT_FIELD });

        var newParent = newRec.getValue({ fieldId: CHILD_PARENT_FIELD });

        if (context.type === context.UserEventType.XEDIT) {
            var look = search.lookupFields({
                type: newRec.type,
                id: newRec.id,
                columns: [CHILD_PARENT_FIELD]
            });
            newParent = look[CHILD_PARENT_FIELD];
        }

        var removed = (oldParent && String(oldParent).length > 0) &&
            (!newParent || String(newParent).length === 0);

        if (!removed) return;

        var cabinetId = oldRec.getValue({ fieldId: FLD_ACTUAL_CABINET });
        var superior  = Number(oldRec.getValue({ fieldId: FLD_SUPERIOR_QTY_Z }) || 0);
        var good      = Number(oldRec.getValue({ fieldId: FLD_GOOD_QTY_Z }) || 0);

        if (!cabinetId) return;

        var cabRec = record.load({ type: CABINET_DETAIL_TYPE, id: cabinetId });

        var curExcellent = Number(cabRec.getValue({ fieldId: FLD_QTY_EXCELLENT }) || 0);
        var curFine      = Number(cabRec.getValue({ fieldId: FLD_QTY_FINE }) || 0);

        cabRec.setValue({ fieldId: FLD_QTY_EXCELLENT, value: curExcellent - superior });
        cabRec.setValue({ fieldId: FLD_QTY_FINE,      value: curFine - good });
        cabRec.save();

        record.delete({
            type: newRec.type,
            id: newRec.id
        });

        log.audit({
            title: 'Child unlinked -> cabinet updated',
            details: { childId: newRec.id, oldParent: oldParent, cabinetId: cabinetId, superior: superior, good: good }
        });
    }

    return { afterSubmit: afterSubmit };
});
