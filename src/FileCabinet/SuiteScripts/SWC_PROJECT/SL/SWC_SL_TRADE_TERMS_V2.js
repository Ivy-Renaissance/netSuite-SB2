/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * 贸易条款 V2 调度脚本
 */
define(['N/task', 'N/log', '../common/SWC_CONFIG_DATA'], function (task, log, SWC_CONFIG_DATA) {
    var CONFIG = SWC_CONFIG_DATA.configData();

    const ACTION_SUBMIT = 'submit';
    const ACTION_QUERY_STATUS = 'queryStatus';
    const ROUTE_BRANCH_V2 = 'v2';
    const ROUTE_BRANCH_CG = 'cg';
    const FLOW_TRANSFER = 'transfer';
    const FLOW_INTERCOMPANY = 'intercompany';
    const MR_PARAM_PAYLOAD_TRANSFER = 'custscript_swc_trade_terms_v2_payload';
    const MR_PARAM_PAYLOAD_INTERCOMPANY = 'custscript_swc_int_tra_v2_payload';
    const MR_CG_TRANSFER = 'custscript_swc_cg_shipment_payload';
    const MR_CG_INTERCOMPANY = 'custscript_swc_cg_ic_payload';
    const ROUTE_CONFIG = CONFIG.TRADE_TERMS_ROUTE_CONFIG;

    function onRequest(context) {
        var request = context.request;
        var result;

        try {
            if (!request || !request.body) {
                throw new Error('request.body 为空，无法解析参数');
            }

            var data = JSON.parse(request.body);
            var billId = data.bill_id;
            var action = data.action;
            var taskId = data.task_id;

            if (!action) {
                throw new Error('缺少 action 参数');
            }
            if (action !== ACTION_QUERY_STATUS && !billId && billId !== 0) {
                throw new Error('缺少 bill_id 参数');
            }

            var handlers = getActionHandlers();
            var handler = handlers[action];
            if (typeof handler !== 'function') {
                throw new Error('不支持的 action：' + action);
            }

            result = handler(action === ACTION_QUERY_STATUS ? taskId : billId, data);
            context.response.write(JSON.stringify(result || {}));
        } catch (e) {
            log.error('SWC_SL_TRADE_TERMS_V2 onRequest error', e);
            context.response.write(JSON.stringify({
                success: false,
                data: e.message || '任务提交失败',
                message: e.message || '任务提交失败'
            }));
        }
    }

    function getActionHandlers() {
        return {
            submit: submitTradeTermsV2,
            queryStatus: queryTradeTermsV2TaskStatus
        };
    }

    function submitTradeTermsV2(billId, data) {
        var payload = normalizePayload(data && data.payload, billId);
        var mrParams = buildMrParams(payload.flowType || '', payload, payload.routeBranch || ROUTE_BRANCH_V2);
        log.error('trade terms v2 sl payload', {
            recId: String(payload.recId || ''),
            currentStep: String(payload.currentStep || ''),
            configId: String(payload.configId || ''),
            configName: String(payload.configName || ''),
            buttonText: String(payload.buttonText || payload.buttonLabel || ''),
            flowType: String(payload.flowType || ''),
            routeBranch: String(payload.routeBranch || '')
        });
        log.error('trade terms v2 sl mrParams', mrParams);
        log.audit('payload', payload);
        var flowType = payload.flowType || '';
        var routeBranch = payload.routeBranch || ROUTE_BRANCH_V2;
        var routeInfo = getRouteInfo(routeBranch, flowType, payload.selectedRoute);

        if (!payload.recId) {
            return {
                success: false,
                data: '缺少 recId',
                message: '缺少 recId'
            };
        }
        if (!routeInfo) {
            return {
                success: false,
                data: '不支持的贸易条款路由配置',
                message: '不支持的贸易条款路由配置'
            };
        }

        log.audit('SWC_SL_TRADE_TERMS_V2 submit', {
            recId: payload.recId,
            flowType: flowType,
            routeBranch: routeBranch,
            scriptId: routeInfo.scriptId,
            deploymentId: routeInfo.deploymentId
        });
        var mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: routeInfo.scriptId,
            deploymentId: routeInfo.deploymentId,
            params: mrParams
        });

        return {
            success: true,
            data: '后台处理中，请稍后刷新页面确认结果。',
            message: '后台处理中，请稍后刷新页面确认结果。',
            taskId: mrTask.submit(),
            flowType: flowType,
            routeBranch: routeBranch
        };
    }

    function getRouteInfo(routeBranch, flowType, selectedRoute) {
        if (selectedRoute && selectedRoute.scriptId && selectedRoute.deploymentId) {
            return {
                scriptId: selectedRoute.scriptId,
                deploymentId: selectedRoute.deploymentId
            };
        }

        if (!ROUTE_CONFIG[routeBranch] || !ROUTE_CONFIG[routeBranch][flowType]) {
            return null;
        }

        return ROUTE_CONFIG[routeBranch][flowType];
    }

    function normalizePayload(payload, recId) {
        if (!payload) {
            return { recId: String(recId || '') };
        }
        if (typeof payload === 'string') {
            try {
                payload = JSON.parse(payload);
            } catch (e) {
                payload = {};
            }
        }

        payload = payload || {};
        if (!payload.recId && recId) {
            payload.recId = String(recId);
        }
        return payload;
    }

    function getMrPayloadParam(flowType, routeBranch) {
        return routeBranch === ROUTE_BRANCH_V2 ? flowType === FLOW_INTERCOMPANY ? MR_PARAM_PAYLOAD_INTERCOMPANY : MR_PARAM_PAYLOAD_TRANSFER : flowType === FLOW_INTERCOMPANY ? MR_CG_INTERCOMPANY : MR_CG_TRANSFER;
    }

    function buildMrParams(flowType, payload, routeBranch) {
        var params = {};
        params[getMrPayloadParam(flowType, routeBranch)] = JSON.stringify(
            routeBranch === ROUTE_BRANCH_V2 ? buildMrRuntimePayload(payload) : (payload || {})
        );
        return params;
    }

    function buildMrRuntimePayload(payload) {
        payload = payload || {};
        return {
            recId: String(payload.recId || ''),
            currentStep: String(payload.currentStep || ''),
            configId: String(payload.configId || ''),
            configName: String(payload.configName || ''),
            buttonId: String(payload.buttonId || ''),
            buttonText: String(payload.buttonText || payload.buttonLabel || ''),
            documentTypeId: String(payload.documentTypeId || ''),
            documentTypeText: String(payload.documentTypeText || ''),
            flowType: String(payload.flowType || ''),
            routeBranch: String(payload.routeBranch || ''),
            startingWarehouseAttribute: String(payload.startingWarehouseAttribute || ''),
            warehouseAttribute: String(payload.warehouseAttribute || ''),
            currentStepRows: (payload.currentStepRows || []).map(function (row) {
                row = row || {};
                return {
                    configId: String(row.configId || ''),
                    shopSubId: String(row.shopSubId || ''),
                    buttonId: String(row.buttonId || '')
                };
            })
        };
    }

    function queryTradeTermsV2TaskStatus(taskId) {
        if (!taskId) {
            return {
                success: false,
                data: '缺少 task_id',
                message: '缺少 task_id'
            };
        }

        var statusObj = task.checkStatus({
            taskId: String(taskId)
        });
        var status = String(statusObj && statusObj.status || '');

        return {
            success: true,
            taskId: String(taskId),
            status: status,
            isDone: status === 'COMPLETE',
            isFailed: status === 'FAILED' || status === 'CANCELED',
            message: status
        };
    }

    return {
        onRequest: onRequest
    };
});
