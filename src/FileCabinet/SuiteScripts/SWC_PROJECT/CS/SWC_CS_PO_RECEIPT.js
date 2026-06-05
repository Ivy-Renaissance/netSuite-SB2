/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *@description 一键接收配件类型采购订单
 */
define(['N/search', 'N/ui/dialog', 'N/runtime', '../common/moment', 'N/https', 'N/url', '../common/commonTool', 'N/currentRecord'], function (search, dialog, runtime, moment, https, url, commonTool, currentRecord) {
    //固定值
    var system_price_type = 2, curr_cny_id = 5, curr_usd_id = 2;
    function pageInit(context) {

    }

    function saveRecord(context) {

    }

    function validateField(context) {

    }

    function fieldChanged(context) {
    }

    function postSourcing(context) {

    }

    function lineInit(context) {

    }

    function validateDelete(context) {

    }

    function validateInsert(context) {

    }

    function validateLine(context) {

    }

    function sublistChanged(context) {

    }

    // function batchReceive(po_id) {
    //     try {
    //         var options = { title: '提示', message: '是否进行一键收货?' };
    //         function success(result) {
    //             if (result) {
    //                 commonTool.startMask('请稍后, 正在处理!');
    //                 var link = url.resolveScript({
    //                     scriptId: 'customscript_swc_rl_po_receipt',
    //                     deploymentId: 'customdeploy_swc_rl_po_receipt'
    //                 });
    //                 var header = {
    //                     'Content-Type': 'application/json;charset=utf-8',
    //                     'Accept': 'application/json'
    //                 }
    //                 https.post.promise({
    //                     url: link,
    //                     body: { id: po_id },
    //                     headers: header
    //                 }).then(function (resp) {
    //                     var resultData = JSON.parse(resp.body);
    //                     if (resultData) {
    //                         commonTool.endMask();
    //                         dialog.alert({ title: '提示', message: resultData.msg }).then(function () {
    //                             window.location.reload();
    //                         });
    //                     }
    //                 });
    //             }
    //         }
    //         function failure(reason) { }
    //         dialog.confirm(options).then(success).catch(failure);
    //     } catch (e) {
    //         dialog.alert({
    //             title: '提示',
    //             message: e.message
    //         });
    //     }
    // }

    // ========== 常量：Suitelet 入口与 headers ==========
    var SUITELET_INFO = {
        scriptId: 'customscript_swc_rl_po_receipt',
        deploymentId: 'customdeploy_swc_rl_po_receipt'
    };

    var JSON_HEADERS = {
        'Content-Type': 'application/json;charset=utf-8',
        'Accept': 'application/json'
    };

    function getSuiteletLink() {
        return url.resolveScript(SUITELET_INFO);
    }

    // ========== 通用调用 ==========
    function confirmAndPost(params) {
        // params:
        // - title
        // - message
        // - maskMessage
        // - action
        // - billId  (最终写入 requestData.bill_id 的值)
        // - onSuccessBeforeAlert (可选)
        var options = {
            title: params.title,
            message: params.message
        };

        function success(result) {
            try {
                if (!result) return;

                commonTool.startMask(params.maskMessage);

                var link = getSuiteletLink();
                var requestData = {
                    bill_id: params.billId,
                    action: params.action
                };

                https.post.promise({
                    url: link,
                    body: JSON.stringify(requestData),
                    headers: JSON_HEADERS
                }).then(function (resp) {
                    var resultData = {};
                    try {
                        resultData = JSON.parse(resp.body);
                    } catch (e) {
                        // 保持“能跑”为先：解析失败也给提示
                        resultData = { msg: '返回数据解析失败' };
                    }

                    if (resultData) {
                        commonTool.endMask();
                        dialog.alert({
                            title: '提示',
                            message: resultData.msg
                        }).then(function () {
                            if (resultData.url) {
                                window.open(resultData.url);
                            }
                            window.location.reload();
                        });
                    }
                });

            } catch (e) {
                alert('异常 : ' + e);
                commonTool.endMask();
            }
        }

        function failure(reason) { }

        dialog.confirm(options).then(success).catch(failure);
    }

    // ========== 具体业务按钮函数 ==========

    function batchReceive(poId) {
        confirmAndPost({
            title: '一键接收',
            message: '是否进行一键收货?',
            maskMessage: '正在进行一键收货，请耐心等待！',
            action: 'batchReceive',
            billId: poId
        });
    }

    function onClickInOutCreate(poId) {
        confirmAndPost({
            title: '采购入库调拨',
            message: '是否生成出库单据和入库单据',
            maskMessage: '货品履行和货品收据生成中，请耐心等待！',
            action: 'onClickInOutCreate',
            billId: poId
        });
    }

    function onClickFeePoCreate(poId) {
        confirmAndPost({
            title: '费用类型采购订单做成',
            message: '是否进行费用类型采购订单做成？',
            maskMessage: '提交中，请耐心等待！',
            action: 'onClickFeePoCreate',
            billId: poId
        });
    }

    function onClickApproveOk(poId) {
        confirmAndPost({
            title: '调拨费入库分摊',
            message: '是否进行采购调拨费入库分摊？',
            maskMessage: '差异账单生成中，请耐心等待！',
            action: 'onClickApproveOk',
            billId: poId
        });
    }

    function onClickReapply(poId) {
        confirmAndPost({
            title: '重新审核',
            message: '是否进行重新审核？',
            maskMessage: '重新审核中，请耐心等待！',
            action: 'onClickReapply',
            billId: poId
        });
    }

    return {
        // pageInit: pageInit,
        // saveRecord: saveRecord,
        // validateField: validateField,
        fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // lineInit: lineInit,
        // validateDelete: validateDelete,
        // validateInsert: validateInsert,
        // validateLine: validateLine,
        // sublistChanged: sublistChanged,
        batchReceive: batchReceive,
        onClickInOutCreate:onClickInOutCreate,
        onClickFeePoCreate:onClickFeePoCreate,
        onClickApproveOk:onClickApproveOk,
        onClickReapply:onClickReapply
    }
});
