/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope public
 */
define(['N/currentRecord', 'N/format', 'N/url'], function (currentRecord, format, urls) {

    function pageInit(scriptContext) {
        try {
            var rec = scriptContext.currentRecord;
            if (!rec) return;

            var sublistId = 'recmachcustrecord_swc_wl_po_fee_wl';
            var fieldId = 'custrecord_swc_wl_po_fee_fpo_type';
            var targetFieldId = 'custrecord_swc_wl_plan_status';

            var lineCount = 0;
            try {
                lineCount = rec.getLineCount({ sublistId: sublistId }) || 0;
            } catch (e1) {
                return;
            }

            if (lineCount === 0) return;

            var allIs2 = true;

            for (var i = 0; i < lineCount; i++) {
                var v = rec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: fieldId,
                    line: i
                });

                // 统一按字符串/数字判断
                if (String(v) != '4') {
                    allIs2 = false;
                    break;
                }
            }

            if (allIs2) {
                var cur = rec.getValue({ fieldId: targetFieldId });
                if (String(cur) !== '2') {
                    rec.setValue({
                        fieldId: targetFieldId,
                        value: '2',
                        ignoreFieldChange: true
                    });
                }
            }

        } catch (e) {
            try { console.log('pageInit error', e); } catch (_) {}
        }
    }

    function fieldChanged(scriptContext) {
        return true;
    }

    function saveRecord(scriptContext) {
        return true;
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
});
