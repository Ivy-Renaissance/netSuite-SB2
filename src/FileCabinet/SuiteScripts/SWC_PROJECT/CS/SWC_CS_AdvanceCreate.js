/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

MODE = '';
LINEOBJ = {};
SUMAMOUNT = 0;
PREAMOUNT = 0;
define(['N/currentRecord', 'N/url','N/record','N/https','./commonTool', 'N/ui/dialog', '../common/MatchTool'],
    function(currentRecord, url,record,https,commonTool,dialog,MatchTool) {

        // 页面初始化时执行
        function pageInit(scriptContext) {
            MODE = scriptContext.mode;
            console.log('p-mode',MODE);
            console.log('触发CS');
            // 检查是否已经存在遮罩层，如果不存在则创建

            if (MODE == 'create' || MODE == 'edit') {
                let rec = scriptContext.currentRecord;
                var wholeFlag = rec.getValue({
                    fieldId: 'custrecord_swc_advancepay_whole_yes',
                })
                let lineCount = rec.getLineCount({sublistId: 'recmachcustrecord_swc_advancepay_main'});
                for (let i = 0;i < lineCount;i++) {
                    rec.selectLine({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        line: i
                    });
                    var line = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_number'
                    });
                    var nowAmount = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_amount_now'
                    });
                    var lineAmount = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_amount'
                    });
                    SUMAMOUNT = SUMAMOUNT + lineAmount;
                    PREAMOUNT = PREAMOUNT + nowAmount;
                    LINEOBJ[line] = {
                        "nowAmount": nowAmount
                    }
                }
                var radio = MatchTool.mulN(MatchTool.fixed(MatchTool.divN(PREAMOUNT,SUMAMOUNT),2),100);
                console.log('radio',radio)
                if (wholeFlag) {
                    rec.setValue({
                        fieldId: "custrecord_swc_advancepay_sum_percent1",
                        value: radio
                    });
                }
                // rec.save();
            }
            return true;
        }

        function createAdvance() {
            try {
                var currentRec = currentRecord.get();
                console.log('currentRec.type',currentRec.type);
                console.log('currentRec.type',currentRec.id);
                var type = currentRec.type;
                var id = currentRec.id;

                let error = '';

                var cur = record.load({
                    type: type,
                    id: id
                });

                let account = cur.getValue({fieldId: "custrecord_swc_advancepay_bankaccount"});
                let date = cur.getValue({fieldId: "custrecord_swc_advancepay_paydate"});
                let memo = cur.getValue({fieldId: "custrecord_swc_advancepay_memo"});

                console.log('account',account);
                console.log('date',date);


                if (memo) {
                    if (account && date) {
                        error = '';
                    }
                } else {
                    if (!account)
                        error += '无法进行预付，请补充银行账户。';
                    if (!date)
                        error += '无法进行预付，请补充预付款日期。';
                }

                console.log('error',error);
                if (error != '') {
                    record.submitFields({
                        type: type,
                        id: id,
                        values: {
                            "custrecord_swc_advancepay_mistakememo":error
                        }
                    });
                    alert('出现错误: ' + error);
                    window.location.reload();
                } else {

                    record.submitFields({
                        type: type,
                        id: id,
                        values: {
                            "custrecord_swc_advancepay_mistakememo":error
                        }
                    });

                    let reqUrl = url.resolveScript({
                        scriptId: "customscript_swc_sl_advancecreate",
                        deploymentId: "customdeploy_swc_sl_advancecreate",
                        params: {
                            flag: "create",
                        }
                    });

                    var adData = {
                        type: type,
                        id: id
                    }
                    // let createPoResult = await https.post.promise({
                    //     url: reqUrl,
                    //     body:{
                    //         "adData": JSON.stringify(adData),
                    //     }
                    // });
                    // let data = createPoResult.body && JSON.parse(createPoResult.body);
                    // console.log('接口1返回数据',data);

                    commonTool.startMask('正在生成系统预付款单，请耐心等待');
                    https.post.promise({
                        url: reqUrl,
                        body: {
                            "adData": JSON.stringify(adData),
                        },
                    }).then(function(resp) {
                        resp = JSON.parse(resp.body);
                        pollTaskStatus(resp.data.taskId,currentRec);
                        // commonTool.endMask();
                        // dialog.alert({
                        //     title: resp.code,
                        //     message: resp.msg
                        // }).then(success1).catch(failure);
                    });

                    // if (data.code == 200) {
                    //     // let orderUrl = url.resolveRecord({
                    //     //     recordType: "vendorprepayment",
                    //     //     recordId: data["data"].vprepId,
                    //     //     isEditMode: false
                    //     // });
                    //     // window.open(orderUrl);
                    //     window.location.reload();
                    // }
                    // if (data.code == 500) {
                    //     alert(data["msg"]);
                    //     window.location.reload();
                    // }
                    //
                    // setTimeout(function() {
                    //     location.reload();
                    // }, 1000);
                }

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
                    scriptId: "customscript_swc_sl_advancecreate",
                    deploymentId: "customdeploy_swc_sl_advancecreate",
                    params: {
                        flag: "check", // 请求区分创建采购订单
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
                        var newRec = record.load({
                            type: currentRec.type ,
                            id: currentRec.id,
                        });
                        var errorMessage2 =newRec.getValue('custrecord_swc_advancepay_mistakememo');
                        if (errorMessage2) {
                            clearInterval(poll);
                            alert("任务执行失败：" + errorMessage2);
                            commonTool.endMask();
                        } else {
                            clearInterval(poll);
                            alert("预付申请单生成成功！");
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
            let curRec = scriptContext.currentRecord;
            let sublistId = scriptContext.sublistId;
            let fieldId = scriptContext.fieldId;
            log.audit('MODE',MODE);

            if (MODE == 'edit') {
                // if (sublistId == "recmachcustrecord_swc_advancepay_main") {

                    // if (fieldId == "custrecord_swc_advancepay_amount_now") {
                    //     var sumAmount = 0;
                    //     var totalAmount = curRec.getValue({
                    //         fieldId: 'custrecord_swc_advancepay_total_amount',
                    //     });
                    //     var wholeFlag = curRec.getValue({
                    //         fieldId: 'custrecord_swc_advancepay_whole_yes',
                    //     })
                    //     var line = curRec.getCurrentSublistValue({
                    //         sublistId: 'recmachcustrecord_swc_advancepay_main',
                    //         fieldId: 'custrecord_swc_advancepay_line_number'
                    //     });
                    //     var curPrepaidAmount = curRec.getCurrentSublistValue({
                    //         sublistId: 'recmachcustrecord_swc_advancepay_main',
                    //         fieldId: 'custrecord_swc_advancepay_amount_now'
                    //     });
                    //     var nowAmount = 0;
                    //     if (line in LINEOBJ) {
                    //         nowAmount = LINEOBJ[line].nowAmount
                    //     }
                    //     var otherLineAmount = 0;
                    //     for (let key in LINEOBJ) {
                    //         if (key != line) {
                    //             otherLineAmount = otherLineAmount + LINEOBJ[line].nowAmount;
                    //         }
                    //     }
                    //     // if (curPrepaidAmount < nowAmount) {
                    //     //     curPrepaidAmount = nowAmount;
                    //     //     alert('不可更改小于当前值');
                    //     //     curRec.setCurrentSublistValue({
                    //     //         sublistId: sublistId,
                    //     //         fieldId: "custrecord_swc_advancepay_amount_now",
                    //     //         value: curPrepaidAmount,
                    //     //         ignoreFieldChange: true
                    //     //     });
                    //     // }
                    //     sumAmount = otherLineAmount + curPrepaidAmount;
                    //     curRec.setValue({
                    //         fieldId: 'custrecord_swc_advancepay_total_amount',
                    //         value: sumAmount
                    //     });
                    //     console.log('nowAmount',nowAmount)
                    //     console.log('sumAmount',sumAmount)
                    //     console.log('SUMAMOUNT',SUMAMOUNT)
                    //     console.log('wholeFlag',wholeFlag)
                    //     var radio = MatchTool.mulN(MatchTool.fixed(MatchTool.divN(sumAmount,SUMAMOUNT),2),100);
                    //     console.log('radio',radio)
                    //     if (wholeFlag) {
                    //         curRec.setValue({
                    //             fieldId: "custrecord_swc_advancepay_sum_percent1",
                    //             value: radio
                    //         });
                    //     }

                //     }
                // }
            }
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            createAdvance: createAdvance
        };
    });