/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
const SUBMIST_STATUS = "1";
const SUBMIST_STATUS_2 = "2";
define(['N/currentRecord', 'N/https', 'N/record', 'N/search', 'N/url',"../APP/SWC_APP_ReconciliationPlatform",'../common/MatchTool','N/ui/dialog'],

    function(currentRecord, https, record, search, url,app,MatchTool,dialog) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            let curRec = scriptContext.currentRecord;
            // var sublistId = scriptContext.sublistId;
            // let fieldId = scriptContext.fieldId;
            curRec.setValue({
                fieldId: 'custpage_reconciliation_date',
                value: new Date()
            })
            let selected = curRec.getValue({fieldId: "custpage_selected"});
            console.log('开始',selected);
            init();
            log.audit('scriptContext.mode',scriptContext.mode);
            let oDiv = document.getElementById("timeoutblocker");
            oDiv.style.display = "none";

            var labelSpan = document.querySelector('#custpage_return_location_fs_lbl');
            if (labelSpan) {
                var aTag = labelSpan.querySelector('a');
                if (aTag) {
                    aTag.innerHTML = aTag.innerHTML.replace(/\*/g, '<span style="color:red;">*</span>');
                }
            }

            var labelSpan = document.querySelector('#custpage_purpose_location_fs_lbl');
            if (labelSpan) {
                var aTag = labelSpan.querySelector('a');
                if (aTag) {
                    aTag.innerHTML = aTag.innerHTML.replace(/\*/g, '<span style="color:red;">*</span>');
                }
            }

            var labelSpan = document.querySelector('#custpage_flag_fs_lbl');
            if (labelSpan) {
                var aTag = labelSpan.querySelector('a');
                if (aTag) {
                    aTag.innerHTML = aTag.innerHTML.replace(/\*/g, '<span style="color:red;">*</span>');
                }
            }

            // if (scriptContext.mode == 'POST') {
            //     var reLocation = curRec.getValue({fieldId: 'custpage_return_location'});
            //     if (!reLocation) {
            //         alert('退货地点不能为空');
            //     }
            // }

            //选择框 设置已选择
            // let sublistId = "custpage_sublist_detail";
            // let count = curRec.getLineCount(sublistId);
            // if (selected != '' && selected != undefined) {
            //     selected = JSON.parse(selected);
            //     if (Object.keys(selected).length > 0) {
            //         for (let i = 0;i < count;i++) {
            //             curRec.selectLine({sublistId, line: i});
            //             var invoice = curRec.getCurrentSublistValue(
            //                 {sublistId, fieldId: "custpage_sublist_invoice_number_hide"})
            //             var endKey = curRec.getCurrentSublistValue(
            //                 {sublistId, fieldId: "custpage_sublist_orderkey_end_hide"}) || '';
            //             var uniqueKey = invoice + '_' + endKey;
            //             console.log('uniqueKey',uniqueKey);
            //             if (uniqueKey in selected)
            //                 curRec.setCurrentSublistValue({sublistId, fieldId: "custpage_sublist_checkbox",value:true});
            //         }
            //     }
            // }
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
            var sublistId = scriptContext.sublistId;
            let fieldId = scriptContext.fieldId;
            let selected = curRec.getValue({fieldId: "custpage_selected"});
            let selectedObj = selected ? JSON.parse(selected) : {};
            let dataLength = Object.keys(selectedObj).length;

            if (fieldId == 'custpage_return_location') {
                var reLocation = curRec.getValue('custpage_return_location');

                if (reLocation) {
                    var locRec = record.load({
                        type: 'location',
                        id: reLocation
                    });
                    let sub = locRec.getValue({fieldId: 'subsidiary'});

                    if (sub) {
                        curRec.setValue({fieldId:'custpage_sub',value: sub })
                    }
                } else {
                    curRec.setValue({fieldId:'custpage_sub',value: '' });
                }
            }

            //转移数量
            if (fieldId == 'custpage_sublist_tran_quantity') {
                var tranQuantity = curRec.getCurrentSublistValue({sublistId: sublistId, fieldId: 'custpage_sublist_tran_quantity'});
                var availableQuantity = curRec.getCurrentSublistValue({sublistId: sublistId, fieldId: 'custpage_sublist_available_quantity_hide'});
                console.log('tranQuantity',tranQuantity);
                console.log('availableQuantity',availableQuantity);
                var checkFlag = curRec.getCurrentSublistValue({sublistId: sublistId, fieldId: 'custpage_sublist_checkbox'});

                if (tranQuantity > availableQuantity) {
                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: 'custpage_sublist_tran_quantity',value: availableQuantity,ignoreFieldChange: true});
                    alert('不可填写！需转移数量不可 大于 可用数量');
                    return;
                }

                if (tranQuantity <= 0) {
                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: 'custpage_sublist_tran_quantity',value: availableQuantity,ignoreFieldChange: true});
                    alert('不可填写！需转移数量不可 小于 0');
                    return;
                }

                if (checkFlag) {
                    curRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custpage_sublist_checkbox',
                        value: false
                    });
                    curRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custpage_sublist_checkbox',
                        value: true
                    });
                }
            }

            //选择
            if (fieldId == "custpage_sublist_checkbox") {
                var checkbox = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_checkbox"});
                // var uniqueKey = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_ship_location_hide"});//发货地点
                var lineKey =  curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_indextext"});//序号
                console.log('checkbox',checkbox);
                console.log('lineKey',lineKey);
                if (checkbox) {
                    //   - 翻页勾选使用
                    let lineDataObj = {};

                    selectedObj[lineKey] = {};
                    selectedObj[lineKey]["on"] = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_indextext"});   //序号
                    selectedObj[lineKey]["item"] = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_item_hide"});//货品
                    selectedObj[lineKey]["quantity"] = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_tran_quantity"});//待转移数量
                    selectedObj[lineKey]["shiplocation"] = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_customer_hide"});//发货店铺
                    selectedObj[lineKey]["sono"] = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_sono_hide"});//原销售单号
                    selectedObj[lineKey]["bactch"] = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_batch_hide"});//序列号/批号

                    // selectedObj[lineKey] = lineDataObj;

                } else {
                    // 删除取消勾选已选择的数据    - 翻页勾选使用
                    if (selectedObj.hasOwnProperty(lineKey)) {
                        if (lineKey in selectedObj)
                            delete selectedObj[lineKey];
                    }
                }
                // 更新已选择数据   - 翻页勾选使用
                console.log('selectedObj',selectedObj);
                curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});
            }
        }

        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(scriptContext) {

        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {

        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(scriptContext) {

        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is inserted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateInsert(scriptContext) {

        }

        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {

        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {
            var curRec = scriptContext.currentRecord;
            var reLocation = curRec.getValue({fieldId: 'custpage_return_location'});
            if (!reLocation) {
                alert('退货地点不能为空');
                return false;
            } else {
                return true;
            }

        }


        /**
         * 当前页面全选
         */

        function selectAll() {
            let curRec = currentRecord.get();
            let sublistId = "custpage_sublist_detail";
            let count = curRec.getLineCount(sublistId);
            if (!count) return;

            let selected = curRec.getValue({fieldId: "custpage_selected"});
            let selectedObj = selected ? JSON.parse(selected) : {};

            if (count > 0) {
                for (let i = 0; i < count; i++) {
                    curRec.selectLine({sublistId, line: i});
                    var checkbox = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_checkbox"});
                    var lineKey =  curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_indextext"});//序号
                    console.log('lineKey',lineKey);
                    if (!checkbox) {
                        console.log('lineKey',lineKey);
                        selectedObj[lineKey] = {};
                        selectedObj[lineKey]["on"] = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_indextext"});   //序号
                        selectedObj[lineKey]["item"] = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_item_hide"});//货品
                        selectedObj[lineKey]["quantity"] = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_tran_quantity"});//待转移数量
                        selectedObj[lineKey]["shiplocation"] = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_customer_hide"});//发货店铺
                        selectedObj[lineKey]["sono"] = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_sono_hide"});//原销售单号
                        selectedObj[lineKey]["bactch"] = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_batch_hide"});//序列号/批号
                        // selectedObj[lineKey] = lineDataObj;
                    }

                    // 设置复选框为选中，注意使用ignoreFieldChange避免触发fieldChanged
                    curRec.setCurrentSublistValue({sublistId, fieldId: "custpage_sublist_checkbox", value: true, ignoreFieldChange: true});

                }
            }
            // 可以添加提示信息
            let selectedCount = Object.keys(selectedObj).length || 0;

            alert(`已选中 ${selectedCount} 行数据`);

            // 更新已选择数据到隐藏字段
            curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});
        }

        /**
         * 当前页面取消全选
         */
        // function deselectAll() {
        //     let curRec = currentRecord.get();
        //     let sublistId = "custpage_sublist_detail";
        //     let count = curRec.getLineCount({sublistId: "custpage_sublist_detail"});
        //     if (!count) return;
        //     var selected = curRec.getValue({fieldId: "custpage_selected"});
        //     for (var i = 0; i < count; i++) {
        //         curRec.selectLine({sublistId, line: i});
        //         curRec.setCurrentSublistValue({sublistId, fieldId: "custpage_sublist_checkbox", value: false});
        //     }
        // }
        function deselectAll() {
            let curRec = currentRecord.get();
            let sublistId = "custpage_sublist_detail";
            let count = curRec.getLineCount(sublistId);
            if (!count) return;

            let selected = curRec.getValue({fieldId: "custpage_selected"});
            let selectedObj = selected ? JSON.parse(selected) : {};

            console.log('取消全选：selectedObj',selectedObj);
            console.log('取消全选：count',count);

            for (let i = 0; i < count; i++) {
                curRec.selectLine({sublistId, line: i});
                var lineKey =  curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_indextext"});//序号
                // 从selectedObj中移除
                if (selectedObj.hasOwnProperty(lineKey)) {
                    console.log('取消全选：selectedObj[uniqueKey]',selectedObj[lineKey]);
                    delete selectedObj[lineKey];
                }

                // 设置复选框为未选中，注意使用ignoreFieldChange避免触发fieldChanged
                curRec.setCurrentSublistValue({sublistId, fieldId: "custpage_sublist_checkbox", value: false, ignoreFieldChange: true});

            }
            console.log('取消全选：更新后selectedObj',selectedObj);

            // 更新已选择数据到隐藏字段
            curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});
        }

        /**
         * 客户对账单【提交】按钮执行函数
         */
        async function createOrder() {
            // 弹出弹框
            var options = {
                title: "提醒",
                message: "确定生成库存转移单"
            };

            try {
                const result = await dialog.confirm(options);
                console.log('result', result);
                if (result) {
                    let curRec = currentRecord.get();
                    let selected = curRec.getValue({fieldId: "custpage_selected"});
                    let selectedObj = selected ? JSON.parse(selected) : {};
                    let dataLength = Object.keys(selectedObj).length;
                    let dataValue = Object.values(selectedObj);//已勾选的数据
                    console.log('dataValue', dataValue);

                    //退货地点
                    let returnLocation = curRec.getValue(
                        {fieldId: "custpage_return_location"}) || '';
                    //目的仓库
                    let purLocation = curRec.getValue(
                        {fieldId: "custpage_purpose_location"}) || '';
                    //子公司
                    let sub = curRec.getValue({fieldId: "custpage_sub"}) || '';
                    //备注
                    let memo = curRec.getValue({fieldId: "custpage_memo"});

                    let flag = curRec.getValue({fieldId: "custpage_flag"});

                    if (!flag) {
                        alert("【转移/销毁】不能为空");
                        return;
                    }

                    if (flag == 1 && !purLocation) {
                        alert("目的仓库不能为空");
                        return;
                    }
                    if (!returnLocation) {
                        alert("退货地点不能为空");
                        return;
                    }


                    if (flag == 1) {
                        var locRec = record.load({
                            type: 'location',
                            id: purLocation
                        });
                        let purSub = locRec.getValue({fieldId: 'subsidiary'});
                        if (purSub != sub) {
                            alert("目的仓库和退货地点对应的子公司不一致");
                            return;
                        }

                        let poData = {};
                        poData["returnLocation"] = returnLocation; //退货地点
                        poData["purLocation"] = purLocation; //目的仓库
                        poData["sub"] = sub;//子公司
                        poData["memo"] = memo;//备注
                        poData['flag'] = flag;

                        poData["lineData"] = [];
                        for (let i in dataValue) {
                            var obj = dataValue[i];
                            console.log('obj', obj);
                            poData["lineData"].push(obj);
                        }

                        if (poData["lineData"].length <= 0) {
                            alert("无勾选数据");
                        } else {

                            // 显示弹窗
                            let timeoutblockerDiv = document.getElementById("timeoutblocker");
                            timeoutblockerDiv.style.display = "block";
                            let startDate = new Date().getTime();
                            try {
                                let reqUrl = url.resolveScript({
                                    scriptId: "customscript_swc_sl_returnrestock",
                                    deploymentId: "customdeploy_swc_sl_returnrestock",
                                    params: {
                                        flag: SUBMIST_STATUS, // 请求区分创建库存转移
                                    }
                                });
                                //生成PO 选择用异步的原因：同步遮罩无法使用
                                let createPoResult = await https.post.promise({
                                    url: reqUrl,
                                    body: {
                                        "poData": JSON.stringify(poData),
                                    }
                                })
                                let data = createPoResult.body && JSON.parse(createPoResult.body);
                                console.log('接口1返回数据', data);

                                let poEndDate = new Date().getTime();
                                console.log("执行时间", ((poEndDate - startDate) / 1000) + "秒")
                                // window.onbeforeunload = null;
                                // window.location.reload();

                                if (data.code == 200 && data.data.taskId) {
                                    // 开始轮询任务状态
                                    let orderUrl = url.resolveRecord({
                                        recordType: "inventorytransfer",
                                        recordId: data.data.taskId,
                                        isEditMode: false
                                    });

                                    window.onbeforeunload = null;
                                    window.open(orderUrl);
                                    window.location.reload();
                                }
                                if (data.code == 500) {
                                    alert(data["msg"]);
                                    let endDate = new Date().getTime();
                                    console.log("共计执行时间", ((endDate - startDate) / 1000) + "秒")
                                    window.onbeforeunload = null;
                                    window.location.reload();
                                }

                            } catch (e) {
                                console.log(e)
                                alert(e.message)
                            }
                        }
                    }

                    if (flag == 2) {
                        let poData = {};
                        poData["returnLocation"] = returnLocation; //退货地点
                        // poData["purLocation"] = purLocation; //目的仓库
                        poData["sub"] = sub;//子公司
                        poData["memo"] = memo;//备注
                        poData['flag'] = flag;

                        poData["lineData"] = [];
                        for (let i in dataValue) {
                            var obj = dataValue[i];
                            console.log('obj', obj);
                            poData["lineData"].push(obj);
                        }

                        if (poData["lineData"].length <= 0) {
                            alert("无勾选数据");
                        } else {

                            // 显示弹窗
                            let timeoutblockerDiv = document.getElementById("timeoutblocker");
                            timeoutblockerDiv.style.display = "block";
                            let startDate = new Date().getTime();
                            try {
                                let reqUrl = url.resolveScript({
                                    scriptId: "customscript_swc_sl_returnrestock",
                                    deploymentId: "customdeploy_swc_sl_returnrestock",
                                    params: {
                                        flag: SUBMIST_STATUS, // 请求区分创建库存转移
                                    }
                                });
                                //生成PO 选择用异步的原因：同步遮罩无法使用
                                let createPoResult = await https.post.promise({
                                    url: reqUrl,
                                    body: {
                                        "poData": JSON.stringify(poData),
                                    }
                                })
                                let data = createPoResult.body && JSON.parse(createPoResult.body);
                                console.log('接口1返回数据', data);

                                let poEndDate = new Date().getTime();
                                console.log("执行时间", ((poEndDate - startDate) / 1000) + "秒")
                                // window.onbeforeunload = null;
                                // window.location.reload();

                                if (data.code == 200 && data.data.taskId) {
                                    // 开始轮询任务状态
                                    let orderUrl = url.resolveRecord({
                                        recordType: "inventoryadjustment",
                                        recordId: data.data.taskId,
                                        isEditMode: false
                                    });
                                    window.onbeforeunload = null;
                                    window.open(orderUrl);
                                    window.location.reload();
                                }
                                if (data.code == 500) {
                                    alert(data["msg"]);
                                    let endDate = new Date().getTime();
                                    console.log("共计执行时间", ((endDate - startDate) / 1000) + "秒")
                                    window.onbeforeunload = null;
                                    window.location.reload();
                                }

                            } catch (e) {
                                console.log(e)
                                alert(e.message)
                            }
                        }
                    }
                } else {
                    // 用户点击了取消
                    console.log("用户取消提交");
                }
            } catch (e) {
                // 弹窗出现错误
                console.log("弹窗错误: " + error);
            }
        }

        function pollTaskStatus(taskId) {
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
                    scriptId: "customscript_swc_sl_reconciliationplat",
                    deploymentId: "customdeploy_swc_sl_reconciliationplat",
                    params: {
                        flag: SUBMIST_STATUS_2, // 请求区分创建对账客户单
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
                // var taskStatus = task.checkStatus(taskId);
                console.log('checkResult',checkResult);
                let data2 = checkResult.body && JSON.parse(checkResult.body);
                console.log('接口2返回数据',data2);


                if (data2.code === 200) {
                    var status = data2.data.status;
                    console.log('status',status);

                    if (status === "COMPLETE") {
                        clearInterval(poll);
                        alert("客户对账单生成成功！");
                        document.getElementById('timeoutblocker').style.display = 'none';
                        // 刷新页面或跳转
                        var newId = app.getNewOrder();
                        console.log('newId',newId);
                        let orderUrl = url.resolveRecord({
                            recordType: "customrecord_swc_account_statement",
                            recordId: newId,
                            isEditMode: false
                        });
                        window.onbeforeunload = null;
                        window.open(orderUrl);
                        window.location.reload();
                    } else if (status === "FAILED") {
                        clearInterval(poll);
                        alert("任务执行失败：" + data.data.error);
                        document.getElementById('timeoutblocker').style.display = 'none';
                    }
                    // 其他状态（PENDING, PROCESSING）继续轮询
                }
            }, checkInterval);
        }

        function init() {
            var $ = jQuery;
            //分页下拉选
            $('.tdt_paged_index').change(function () {
                var fieldId = $(this).attr('id').replace('tdt', 'custpage');
                var currRecord = currentRecord.get();
                currRecord.setValue({
                    fieldId: fieldId,
                    value: $(this).val(),
                });
                // // 设置为true，不清空已选数据
                currRecord.setValue({fieldId: "custpage_commit_flag", value: true});//跨页提交用

                $('#submitter').click();
            });
            // //明细行固定高度,变为滚动
            // $('#custpage_sublist_detail_div').css("height",'500px');
            //固定明细行列头
            $('#custpage_sublist_detailheader').css({
                "position":'sticky',
                "top":0,
                "z-index": 1
            })

            // let count = $("tr[id^='custpage_sublist_detailrow']").length;
            // for (var i = 0; i < count; i++) {
            //     $(`input[name=inpt_custpage_sublist_vendor${i+1}]`).css("width",'150px')
            // }


        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            // validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            saveRecord: saveRecord,
            selectAll: selectAll,
            deselectAll: deselectAll,
            createOrder: createOrder
        };

    });
