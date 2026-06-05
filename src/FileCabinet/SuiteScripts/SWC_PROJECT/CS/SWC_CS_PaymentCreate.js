/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/url','N/record','N/https','../common/commonTool', 'N/ui/dialog'],
    function(currentRecord, url,record,https,commonTool,dialog) {

        // 页面初始化时执行
        function pageInit(scriptContext) {
            console.log('触发CS');
            // 检查是否已经存在遮罩层，如果不存在则创建
            return true;
        }

        function createPayment() {
            try {
                var currentRec = currentRecord.get();
                console.log('currentRec.type',currentRec.type);
                console.log('currentRec.type',currentRec.id);
                var type = currentRec.type;
                var id = currentRec.id;
                let reqUrl = url.resolveScript({
                    scriptId: "customscript_swc_sl_paymentcreate",
                    deploymentId: "customdeploy_swc_sl_paymentcreate",
                    params: {
                        flag: "create",
                    }
                });

                var adData = {
                    type: type,
                    id: id
                }

                commonTool.startMask('正在生成系统付款单，请耐心等待');

                https.post.promise({
                    url: reqUrl,
                    body:{
                        "adData": JSON.stringify(adData),
                    },
                }).then(function (resp) {
                    resp = JSON.parse(resp.body);
                    pollTaskStatus(resp.data.taskId,currentRec);
                });

            } catch (error) {
                console.error('Error:', error);
            }
        }

        function success1(reason) {
            window.location.reload(true);
        }
        function failure(reason) {
            console.log('Failure: ' + reason);
        }

        function pollTaskStatus(taskId,currentRec) {
            var checkInterval = 2000; // 2秒检查一次
            var maxAttempts = 60; // 最多尝试60次（2分钟）
            var attempts = 0;

            var poll = setInterval(async function() {
                attempts++;

                if (attempts > maxAttempts) {
                    clearInterval(poll);
                    alert("任务处理超时");
                    document.getElementById('timeoutblocker').style.display = 'none';
                    return;
                }

                // 调用检查状态接口
                // var checkUrl = getRequestUrl({
                //     action: "checkTaskStatus",
                //     taskId: taskId
                // });
                let checkUrl = url.resolveScript({
                    scriptId: "customscript_swc_sl_paymentcreate",
                    deploymentId: "customdeploy_swc_sl_paymentcreate",
                    params: {
                        flag: "check", //检查付款申请单生成情况
                    }
                });

                let adData2 = {
                    taskId: taskId
                }
                let checkResult = await https.post.promise({
                    url: checkUrl,
                    body:{
                        "adData": JSON.stringify(adData2),
                    }
                });
                console.log('checkResult.body',checkResult.body);
                let data2 = JSON.parse(checkResult.body);
                console.log('接口2返回数据',data2);


                if (data2.code === 200) {
                    var status = data2.data.status;
                    console.log('status',status);

                    if (status === "COMPLETE") {
                        // var errorMessage = currentRec.getValue('custrecord_swc_pay_mistakememo');
                        var newRec = record.load({
                            type: currentRec.type ,
                            id: currentRec.id,
                        });
                        var errorMessage2 =newRec.getValue('custrecord_swc_pay_mistakememo');
                        // console.log('errorMessage',errorMessage);
                        console.log('errorMessage2',errorMessage2);
                        if (errorMessage2) {
                            clearInterval(poll);
                            alert("任务执行失败：" + errorMessage2);
                            commonTool.endMask();
                        } else {
                            clearInterval(poll);
                            alert("任务执行完成！");
                            commonTool.endMask();
                            // 刷新页面或跳转
                            window.location.reload();
                        }
                    } else if (status === "FAILED") {
                        clearInterval(poll);
                        alert("任务执行失败：" + data.data.error);
                        commonTool.endMask();
                    }
                    // 其他状态（PENDING, PROCESSING）继续轮询
                }
            }, checkInterval);
        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            createPayment: createPayment
        };
    });