/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/runtime', 'N/task', 'N/search'], function (runtime, task, search) {
    var FIELD_PARENT = 'custrecord_swc_wl_first_leg_cost_id';
    var FIELD_FINANCE_CONFIRMED = 'custrecord_swc_finance_has_confirmed';
    var FIELD_FINANCE_REJECTED = 'custrecord_swc_finance_has_rejected';
    var FIELD_ACTUAL_FEE = 'custrecord_swc_wl_flc_sj_fee';
    var FIELD_DIFF_BILL = 'custrecord_swc_wl_flc_sj_fee_bill';

    var TARGET_SCRIPT_ID = 'customscript_swc_mr_finance_first_leg';
    var TARGET_DEPLOYMENT_ID = 'customdeploy_swc_mr_finance_first_leg';
    var TARGET_PARAM_WL_IDS = 'custscript_swc_finance_confirm_wl_ids';

    function beforeSubmit(context) {
        try {
            var rec = context.newRecord;
            if (!rec) return;

            var confirmed = isTruthy(rec.getValue({ fieldId: FIELD_FINANCE_CONFIRMED }));
            var rejected = isTruthy(rec.getValue({ fieldId: FIELD_FINANCE_REJECTED }));

            if (confirmed) {
                rec.setValue({ fieldId: FIELD_FINANCE_REJECTED, value: false });
            } else if (rejected) {
                rec.setValue({ fieldId: FIELD_FINANCE_CONFIRMED, value: false });
            }
        } catch (e) {
            log.error('first leg finance beforeSubmit error', e);
        }
    }

    function afterSubmit(context) {
        try {
            if (runtime.executionContext !== runtime.ContextType.CSV_IMPORT) {
                return;
            }

            var rec = context.newRecord;
            if (!rec) return;

            var wlId = rec.getValue({ fieldId: FIELD_PARENT });
            if (!wlId) return;

            if (!hasPendingFinanceLine(wlId)) {
                return;
            }

            if (hasRunningFinanceMr()) {
                log.audit('first leg finance mr already queued', { wlId: String(wlId || '') });
                return;
            }

            var mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: TARGET_SCRIPT_ID,
                deploymentId: TARGET_DEPLOYMENT_ID,
                params: (function () {
                    var obj = {};
                    obj[TARGET_PARAM_WL_IDS] = String(wlId || '');
                    return obj;
                })()
            });
            var taskId = mrTask.submit();

            log.audit('first leg finance mr submitted', {
                wlId: String(wlId || ''),
                taskId: String(taskId || '')
            });
        } catch (e) {
            log.error('first leg finance afterSubmit error', e);
        }
    }

    function hasPendingFinanceLine(wlId) {
        var lineSearch = search.create({
            type: 'customrecord_swc_wl_first_leg_cost',
            filters: [
                ['custrecord_swc_wl_first_leg_cost_id', 'anyof', String(wlId)],
                'AND',
                [FIELD_FINANCE_CONFIRMED, 'is', 'T']
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: FIELD_FINANCE_REJECTED }),
                search.createColumn({ name: FIELD_ACTUAL_FEE }),
                search.createColumn({ name: FIELD_DIFF_BILL })
            ]
        });

        var rs = lineSearch.run().getRange({ start: 0, end: 100 }) || [];
        for (var i = 0; i < rs.length; i++) {
            var rejected = rs[i].getValue({ name: FIELD_FINANCE_REJECTED });
            var actualRaw = rs[i].getValue({ name: FIELD_ACTUAL_FEE });
            var billRaw = rs[i].getValue({ name: FIELD_DIFF_BILL });

            if (isTruthy(rejected)) continue;
            if (billRaw !== null && billRaw !== undefined && String(billRaw) !== '') continue;
            if (actualRaw === null || actualRaw === undefined || String(actualRaw) === '') continue;

            var actualFee = Number(actualRaw);
            if (!isFinite(actualFee) || actualFee < 0) continue;

            return true;
        }
        return false;
    }

    function hasRunningFinanceMr() {
        var insSearchObj = search.create({
            type: 'scheduledscriptinstance',
            filters: [
                ['status', 'anyof', 'PENDING', 'PROCESSING', 'RESTART', 'RETRY'],
                'AND',
                ['script.scriptid', 'startswith', TARGET_SCRIPT_ID]
            ],
            columns: [
                search.createColumn({ name: 'internalid', join: 'scriptDeployment' })
            ]
        });
        var rs = insSearchObj.run().getRange({ start: 0, end: 1 }) || [];
        return rs.length > 0;
    }

    function isTruthy(value) {
        return value === true || value === 'T' || value === 'true' || value === '1' || value === 1;
    }

    return {
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});
