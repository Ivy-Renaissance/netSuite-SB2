/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * 贸易条款 V2 客户端脚本
 */
define(['N/url', 'N/https', 'N/ui/message', '../common/SWC_CONFIG_DATA'], function (url, https, message, SWC_CONFIG_DATA) {
    var CONFIG = SWC_CONFIG_DATA.configData();

    const SUITELET_SCRIPT_ID = CONFIG.SCRIPT_ID_SL_TRADE_TERMS_V2;
    const SUITELET_DEPLOYMENT_ID = CONFIG.DEPLOY_ID_SL_TRADE_TERMS_V2;
    let autoExecuted = false;

    function pageInit(context) {
        return true;
    }

    function triggerTradeTermsV2Button() {
        submitTradeTermsV2(getContext(), false);
    }

    function autoExecuteTradeTermsV2() {
        if (autoExecuted) return;
        const ctx = getContext();
        if (!ctx || ctx.mode !== 'auto' || !ctx.currentStepRows || !ctx.currentStepRows.length) return;
        autoExecuted = true;
        submitTradeTermsV2(ctx, true);
    }

    function submitTradeTermsV2(ctx, isAuto) {
        if (!ctx || !ctx.recId) {
            showMessage('error', '未取到贸易条款上下文');
            return;
        }

        try {
            const slUrl = url.resolveScript({
                scriptId: SUITELET_SCRIPT_ID,
                deploymentId: SUITELET_DEPLOYMENT_ID,
                returnExternalUrl: false
            });

            const resp = https.post({
                url: slUrl,
                body: {
                    action: 'submit',
                    payload: JSON.stringify({
                        recId: String(ctx.recId),
                        currentStep: String(ctx.currentStep || ''),
                        flowType: String(ctx.flowType || ''),
                        mode: isAuto ? 'auto' : 'manual',
                        documentTypeText: String(ctx.documentTypeText || ''),
                        matchedConfigIds: ctx.matchedConfigIds || [],
                        currentStepRows: ctx.currentStepRows || [],
                        storeIds: ctx.storeIds || [],
                        warehouseType: String(ctx.warehouseType || ''),
                        termsOfTrade: String(ctx.termsOfTrade || ''),
                        destinationCountry: String(ctx.destinationCountry || ''),
                        purchasingEntity: String(ctx.purchasingEntity || '')
                    })
                }
            });

            let body = {};
            try {
                body = JSON.parse(resp.body || '{}');
            } catch (e) {
                body = { success: false, message: resp.body || '返回结果解析失败' };
            }

            showMessage(body.success ? 'confirmation' : 'error', body.message || '执行完成');
        } catch (e) {
            showMessage('error', e.message || '提交失败');
        }
    }

    function getContext() {
        return window.SWC_TRADE_TERMS_V2_CONTEXT || {};
    }

    function showMessage(type, text) {
        message.create({
            type: message.Type[(type || 'information').toUpperCase()] || message.Type.INFORMATION,
            title: '贸易条款',
            message: String(text || '')
        }).show({ duration: 5000 });
    }

    return {
        pageInit: pageInit,
        triggerTradeTermsV2Button: triggerTradeTermsV2Button,
        autoExecuteTradeTermsV2: autoExecuteTradeTermsV2
    };
});
