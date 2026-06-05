/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/ui/dialog', 'N/https', 'N/url', '../common/commonTool'], function (dialog, https, url, commonTool) {

    function pageInit(context) {
        window.onbeforeunload = null;
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

    function pushInfoToJijia(bill_id) {
        try {
            var options = { title: '提示', message: '是否进行推送?' };
            function success(result) {
                if (result) {
                    commonTool.startMask('请稍后, 正在处理!');
                    var link = url.resolveScript({
                        scriptId: 'customscript_swc_rl_logistics_push_jijia',
                        deploymentId: 'customdeploy_swc_rl_logistics_push_jijia'
                    });
                    var header = {
                        'Content-Type': 'application/json;charset=utf-8',
                        'Accept': 'application/json'
                    }
                    https.post.promise({
                        url: link,
                        body: bill_id,
                        headers: header
                    }).then(function (resp) {
                        var resultData = JSON.parse(resp.body);
                        if (resultData) {
                            commonTool.endMask();
                            dialog.alert({ title: '提示', message: resultData.data }).then(function () {
                                window.location.reload();
                            });
                        }
                    });
                }
            }
            function failure(reason) { }
            dialog.confirm(options).then(success).catch(failure);
        } catch (e) {
            dialog.alert({
                title: '提示',
                message: e.message
            });
        }
    }

    return {
        pageInit: pageInit,
        // saveRecord: saveRecord,
        // validateField: validateField,
        // fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // lineInit: lineInit,
        // validateDelete: validateDelete,
        // validateInsert: validateInsert,
        // validateLine: validateLine,
        // sublistChanged: sublistChanged,
        pushInfoToJijia: pushInfoToJijia
    }
});
