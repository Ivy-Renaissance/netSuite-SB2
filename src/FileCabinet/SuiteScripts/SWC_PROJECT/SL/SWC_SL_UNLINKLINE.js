/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/runtime', 'N/log'], function (record, runtime, log) {

    // ===== 必须替换：子记录类型、子记录上的“父字段”ID =====
    const CHILD_RECORD_TYPE = 'customrecord_swc_wl_plan_detail';
    const CHILD_PARENT_FIELD = 'custrecord_swc_wl_plan_order_id'; // 子记录上指向父记录的字段
    // ======================================================

    // 子记录字段（您之前给的）
    const FLD_ACTUAL_CABINET = 'custrecord_swc_wl_d_actual_cabinet';
    const FLD_SUPERIOR_QTY_Z = 'custrecord_swc_wl_d_superior_qty_z';
    const FLD_GOOD_QTY_Z     = 'custrecord_swc_wl_d_good_qty_z';

    // 汇总记录
    const CABINET_DETAIL_TYPE = 'customrecord_swc_actual_cabinet_detail';
    const FLD_QTY_EXCELLENT   = 'custrecord_swc_acd_quantity_excellent';
    const FLD_QTY_FINE        = 'custrecord_swc_ecd_quantity_fine';

    function onRequest(ctx) {
        try {
            var req = ctx.request;
            var res = ctx.response;

            // 只做 POST（防止被随便 GET 触发）
            if (req.method !== 'POST') {
                return writeJson(res, { ok: false, message: 'POST only' }, 405);
            }

            var body = {};
            try { body = JSON.parse(req.body || '{}'); } catch (e) {}

            var childId  = body.childId;
            var parentId = body.parentId; // 用于校验，防止串改

            if (!childId || !parentId) {
                return writeJson(res, { ok: false, message: 'missing childId/parentId' }, 400);
            }

            // 1) load 子记录，确认它当前确实挂在这个 parentId 下
            var child = record.load({ type: CHILD_RECORD_TYPE, id: childId });

            var linkedParent = child.getValue({ fieldId: CHILD_PARENT_FIELD });
            if (String(linkedParent || '') !== String(parentId)) {
                return writeJson(res, {
                    ok: false,
                    message: 'child not linked to this parent (maybe already unlinked)',
                    linkedParent: linkedParent
                }, 409);
            }

            var cabinetId = child.getValue({ fieldId: FLD_ACTUAL_CABINET });
            var superior  = Number(child.getValue({ fieldId: FLD_SUPERIOR_QTY_Z }) || 0);
            var good      = Number(child.getValue({ fieldId: FLD_GOOD_QTY_Z }) || 0);

            // 2) 更新汇总（如果没有cabinetId就只解绑，不做减算）
            var cabinetResult = null;
            if (cabinetId) {
                var cabRec = record.load({ type: CABINET_DETAIL_TYPE, id: cabinetId });

                var curExcellent = Number(cabRec.getValue({ fieldId: FLD_QTY_EXCELLENT }) || 0);
                var curFine      = Number(cabRec.getValue({ fieldId: FLD_QTY_FINE }) || 0);

                cabRec.setValue({ fieldId: FLD_QTY_EXCELLENT, value: curExcellent - superior });
                cabRec.setValue({ fieldId: FLD_QTY_FINE,      value: curFine - good });

                var savedCabId = cabRec.save();
                cabinetResult = { cabinetId: cabinetId, savedId: savedCabId, delta: { superior: superior, good: good } };
            }

            // 3) 解绑：清空子记录的父字段（或按您系统逻辑改成别的状态字段也可以）
            child.setValue({ fieldId: CHILD_PARENT_FIELD, value: '' });
            var savedChildId = child.save();

            log.audit({
                title: 'Unlinked child line',
                details: { childId: childId, parentId: parentId, cabinetResult: cabinetResult }
            });

            return writeJson(res, {
                ok: true,
                childId: childId,
                parentId: parentId,
                cabinetResult: cabinetResult,
                savedChildId: savedChildId
            }, 200);

        } catch (e) {
            log.error({ title: 'Suitelet failed', details: e });
            return writeJson(ctx.response, { ok: false, message: String(e && e.message || e), error: e }, 500);
        }
    }

    function writeJson(response, obj, statusCode) {
        try { response.statusCode = statusCode; } catch (e) {}
        response.setHeader({ name: 'Content-Type', value: 'application/json; charset=utf-8' });
        response.write(JSON.stringify(obj));
    }

    return { onRequest: onRequest };
});
