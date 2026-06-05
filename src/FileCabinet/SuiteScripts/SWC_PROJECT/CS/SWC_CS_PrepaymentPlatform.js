/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
const SUBMIST_STATUS = "1";//平台生成预付申请单
const SUBMIST_STATUS_2 = "2";
define(["N/currentRecord",'N/record', 'N/search', '../APP/SWC_APP_PrepaymentPlatform','N/url','N/https','N/ui/dialog','../common/MatchTool'],
    function(currentRecord,record, search,app,url,https,dialog,MatchTool) {

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
            let currentRec = scriptContext.currentRecord;
            init();

            let oDiv = document.getElementById("timeoutblocker");
            oDiv.style.display = "none";

            // 恢复已保存的数据
            setTimeout(function() {
                restoreSavedData(currentRec);
            }, 100); // 延迟一点时间确保页面完全加载

            var labelSpan = document.querySelector('#custpage_vendor_fs_lbl');
            if (labelSpan) {
                var aTag = labelSpan.querySelector('a');
                if (aTag) {
                    aTag.innerHTML = aTag.innerHTML.replace(/\*/g, '<span style="color:red;">*</span>');
                }
            }

            var labelSpan = document.querySelector('#custpage_account_fs_lbl');
            if (labelSpan) {
                var aTag = labelSpan.querySelector('a');
                if (aTag) {
                    aTag.innerHTML = aTag.innerHTML.replace(/\*/g, '<span style="color:red;">*</span>');
                }
            }

            var labelSpan = document.querySelector('#custpage_terms_fs_lbl');
            if (labelSpan) {
                var aTag = labelSpan.querySelector('a');
                if (aTag) {
                    aTag.innerHTML = aTag.innerHTML.replace(/\*/g, '<span style="color:red;">*</span>');
                }
            }

            var labelSpan = document.querySelector('#custpage_whole_payment_fs_lbl');
            if (labelSpan) {
                var aTag = labelSpan.querySelector('a');
                if (aTag) {
                    aTag.innerHTML = aTag.innerHTML.replace(/\*/g, '<span style="color:red;">*</span>');
                }
            }

            var labelSpan = document.querySelector('#custpage_order_date_fs_lbl');
            if (labelSpan) {
                var aTag = labelSpan.querySelector('a');
                if (aTag) {
                    aTag.innerHTML = aTag.innerHTML.replace(/\*/g, '<span style="color:red;">*</span>');
                }
            }

            var labelSpan = document.querySelector('#custpage_bussiness_fs_lbl');
            if (labelSpan) {
                var aTag = labelSpan.querySelector('a');
                if (aTag) {
                    aTag.innerHTML = aTag.innerHTML.replace(/\*/g, '<span style="color:red;">*</span>');
                }
            }

            var labelSpan = document.querySelector('#custpage_type_fs_lbl');
            if (labelSpan) {
                var aTag = labelSpan.querySelector('a');
                if (aTag) {
                    aTag.innerHTML = aTag.innerHTML.replace(/\*/g, '<span style="color:red;">*</span>');
                }
            }
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
            let vendorId = curRec.getValue({fieldId:"custpage_vendor"}) || ""; //供应商
            let subsidiaryId = curRec.getValue('custpage_subsidiary') || "";
            let selected = curRec.getValue({fieldId: "custpage_selected"});
            let selectedObj = selected ? JSON.parse(selected) : {};
            let dataLength = Object.keys(selectedObj).length;

            //选择是否为整单预付
            if (fieldId == "custpage_whole_payment") {
                let wholeFlag = curRec.getValue('custpage_whole_payment') || "";

                if(wholeFlag) {
                    let sublistId = "custpage_sublist_detail";
                    let count = curRec.getLineCount({sublistId: sublistId});
                    if (count) {

                        let selected = curRec.getValue({fieldId: "custpage_selected"});
                        let selectedObj = selected ? JSON.parse(selected) : {};

                        for (let i = 0; i < count; i++) {
                            curRec.selectLine({sublistId, line: i});

                            // 获取唯一键
                            let subsidiary = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_subsidiary_hide"});
                            let vendor = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_vendor_hide"});
                            let orderId = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_order_hide"});
                            let flag = curRec.getValue({fieldId: "custpage_whole_payment"});
                            let radio = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_ratio"});
                            // var wholeFlag = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_whole_payment"});
                            let date = curRec.getValue({fieldId: "custpage_order_date"});
                            let currency = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_currency_hide"});

                            // var uniqueKey = subsidiary+ '_' + vendor + '_' + orderId + '_' + estimatedDate + '_' + account;
                            if (flag == 'true') {
                                flag = 'false'
                            } else {
                                flag = 'true'
                            }
                            let uniqueKey = subsidiary + '_' + vendor + '_' + orderId + '_' + flag + '_' + radio + '_' + currency;

                            let key_end = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_orderkey_start_hide"});
                            let key_line = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_orderline_hide"});
                            let key_start = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_orderkey_end_hide"});
                            let lineKey = key_line + '_' + key_start + '_' + key_end;

                            // 从 selectedObj 中删除对应的数据
                            if (selectedObj.hasOwnProperty(uniqueKey) &&
                                selectedObj[uniqueKey].hasOwnProperty(lineKey)) {
                                delete selectedObj[uniqueKey][lineKey];

                                // 如果 uniqueKey 下没有数据了，删除 uniqueKey
                                if (Object.keys(selectedObj[uniqueKey]).length === 0) {
                                    delete selectedObj[uniqueKey];
                                }
                            }

                            // 设置复选框为未选中
                            curRec.setCurrentSublistValue({
                                sublistId,
                                fieldId: "custpage_sublist_checkbox",
                                value: false,
                                ignoreFieldChange: true
                            });
                        }

                        // 更新已选择数据
                        curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});
                        curRec.setValue({fieldId: "custpage_all_payment", value: 0});
                        curRec.setValue({fieldId: "custpage_all_quantity", value: 0});
                        curRec.setValue({fieldId: "custpage_all_prequantity", value: 0});
                    }
                }
            }
            //查询条件-子公司
            if (fieldId == "custpage_subsidiary" || fieldId == "custpage_vendor"
                || fieldId == "custpage_order_startdate" || fieldId == "custpage_order_enddate") {
                let subsidiaryId = curRec.getValue('custpage_subsidiary') || "";
                let vendorId = curRec.getValue({fieldId:"custpage_vendor"}) || "";
                let startDate = curRec.getValue({fieldId:"custpage_order_startdate"}) || "";
                let endDate = curRec.getValue({fieldId:"custpage_order_enddate"}) || "";

                if (startDate)
                    startDate = `${startDate.getFullYear()}-${startDate.getMonth() + 1}-${startDate.getDate()}`;

                if (endDate)
                    endDate = `${endDate.getFullYear()}-${endDate.getMonth() + 1}-${endDate.getDate()}`;

                if (vendorId) {
                    let purData = app.srcPurchOrd(subsidiaryId, vendorId, startDate, endDate);
                    var purField = curRec.getField({
                        fieldId: 'custpage_poreqorder'
                    });
                    purField.removeSelectOption({
                        value: null,
                    });
                    purData.forEach(function(value) {
                        purField.insertSelectOption({
                            value: value.value,
                            text: value.text
                        })
                    });
                }
            }


            if (fieldId == "custpage_sublist_checkbox") {
                // 获取单选框状态
                let checkbox = curRec.getCurrentSublistValue({sublistId, fieldId: fieldId});

                var wholeFlag = curRec.getValue({fieldId: 'custpage_whole_payment'});
                var wholeAmount = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_preamount_hide"});
                var noWholeAmount = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_nopreamount_line_hide"});

                if (wholeFlag) {

                    if (checkbox) {
                        if (wholeFlag == 'true' && wholeAmount && noWholeAmount) {
                            curRec.setCurrentSublistValue({
                                sublistId,
                                fieldId: fieldId,
                                value: false
                            });
                            alert('整单预付模式不可选择已预付数据');
                        }
                        // if (!input3) {
                        //     curRec.setCurrentSublistValue({
                        //         sublistId,
                        //         fieldId: fieldId,
                        //         value: false
                        //     });
                        //     alert('预计申请金额不可为零');
                        // }
                    }
                    // var itemKey = orderLine + '_' + startKey + '_' + endKey;

                    let estimatedDate = curRec.getValue('custpage_order_date');
                    let account = curRec.getValue('custpage_account');
                    var subsidiary = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_subsidiary_hide"});
                    var vendor = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_vendor_hide"});
                    var orderId = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_order_hide"});
                    var flag = curRec.getValue({fieldId: "custpage_whole_payment"});
                    var radio = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_ratio"});
                    // var wholeFlag = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_whole_payment"});
                    var date = curRec.getValue({fieldId: "custpage_order_date"});
                    let currency = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_currency_hide"});


                    // var uniqueKey = subsidiary+ '_' + vendor + '_' + orderId + '_' + estimatedDate + '_' + account;
                    var uniqueKey = subsidiary + '_' + vendor + '_' + orderId + '_' + flag + '_' + radio + '_' + currency;

                    var key_end = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_orderkey_start_hide"});
                    var key_line = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_orderline_hide"});
                    var key_start = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_orderkey_end_hide"});
                    var lineKey = key_line + '_' + key_start + '_' + key_end;

                    let allAmount = curRec.getValue({fieldId: "custpage_all_payment"}) || 0;
                    let allQuantity = curRec.getValue({fieldId: "custpage_all_quantity"}) || 0;
                    let allPreQuantity = curRec.getValue({fieldId: "custpage_all_prequantity"}) || 0;

                    if (checkbox) {
                        //   - 翻页勾选使用
                        let lineDataObj = {};

                        selectedObj[uniqueKey] = selectedObj[uniqueKey] || {};
                        lineDataObj["on"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_indextext"});   //序号
                        lineDataObj["type2"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_type_2_hide"});
                        lineDataObj["orderId"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_order_hide"});   //订单号
                        lineDataObj["subsidiaryId"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_subsidiary_hide"});   //子公司
                        lineDataObj["vendorId"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_vendor_hide"});   //供应商
                        lineDataObj["orderline"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_orderline_hide"});   //订单行号
                        lineDataObj["startKey"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_orderkey_start_hide"});   //订单初始唯一键
                        lineDataObj["endKey"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_orderkey_end_hide"});   //订单后续唯一键
                        lineDataObj["item"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_item_code_hide"});   //货品编码
                        lineDataObj["itemName"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_item_name_hide"});   //货品名称
                        lineDataObj["rate"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_item_price_hide"});   //未税单价
                        lineDataObj["tax"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_tax_hide"});   //税率
                        lineDataObj["taxprice"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_tax_price_hide"});   //含税单价
                        lineDataObj["quantity"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_number_hide"});   //订单行数量

                        allQuantity = allQuantity + Number(lineDataObj["quantity"]);

                        lineDataObj["goodnumber"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_number_good"});   //良品数量
                        lineDataObj["goodprice"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_price_good_hide"});   //良品价格
                        lineDataObj["grossamount"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_all_amount_hide"});   //订单行含税总金额
                        lineDataObj["preamount"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_preamount_hide"});   //整单预付金额
                        lineDataObj["preamountline"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_preamount_line"});   //整单预付金额分摊到该行核销金额
                        lineDataObj["estimatedNumber"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_number_estimated"});   //预计本次入库数量

                        allPreQuantity = allPreQuantity + Number(lineDataObj["estimatedNumber"]) + Number(lineDataObj["goodnumber"]);

                        lineDataObj["ratio"] = curRec.getCurrentSublistText(
                            {sublistId, fieldId: "custpage_sublist_ratio"});   //整单预付比例
                        lineDataObj["prepaidAmount"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_prepaid_amount"});   //本次申请预付金额

                        lineDataObj["yjjsrq"] = curRec.getCurrentSublistText(
                            {sublistId, fieldId: "custpage_sublist_expectedreceiptdate_line_hide"});   //预计接收日期

                        lineDataObj["bhjh"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_demand_line_hide"});   //备货计划

                        allAmount = allAmount + lineDataObj["prepaidAmount"];
                        lineDataObj["linememo"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_line_memo"});   //行备注
                        // lineDataObj["wholeflag"] = curRec.getCurrentSublistValue(
                        //     {sublistId, fieldId: "custpage_sublist_whole_flag_hide"});   //整张订单预付

                        selectedObj[uniqueKey][lineKey] = lineDataObj;

                    } else {
                        // 删除取消勾选已选择的数据    - 翻页勾选使用
                        if (selectedObj.hasOwnProperty(uniqueKey)) {
                            if (lineKey in selectedObj[uniqueKey]) {
                                allAmount = allAmount - selectedObj[uniqueKey][lineKey].prepaidAmount;
                                allQuantity = allQuantity - selectedObj[uniqueKey][lineKey].quantity;
                                allPreQuantity = allPreQuantity - selectedObj[uniqueKey][lineKey].estimatedNumber - selectedObj[uniqueKey][lineKey].goodnumber;
                                delete selectedObj[uniqueKey][lineKey];
                            }
                            if (Object.keys(selectedObj[uniqueKey]).length == 0) {
                                delete selectedObj[uniqueKey];
                            }
                        }
                    }

                    // 更新已选择数据   - 翻页勾选使用
                    curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});
                    curRec.setValue({fieldId: "custpage_all_payment", value: allAmount});
                    curRec.setValue({fieldId: "custpage_all_quantity", value: allQuantity});
                    curRec.setValue({fieldId: "custpage_all_prequantity", value: allPreQuantity});
                } else {
                    alert('请选择是否为整单预付');
                    curRec.setCurrentSublistValue({
                        sublistId,
                        fieldId: fieldId,
                        value: false,
                        ignoreFieldChange: true
                    });
                }
            }

            if (fieldId == "custpage_sublist_number_estimated") {
                let checkFlag = curRec.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custpage_sublist_checkbox',
                });
                let wholeFlag = curRec.getValue({
                    fieldId: 'custpage_whole_payment',
                });
                let precentObj = app.getPrecentObj();
                var maxNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_estimated_max"});
                var curNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_estimated"});
                var goodNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_good"}) || 0;

                //行总数量
                let allNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_preamount_line_hide"});
                //该初始行已提交预付申请的预计入库数量合计
                let preNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_prenumber_line_hide"});

                if (curNumber > maxNumber || curNumber < 0 || (curNumber + preNumber + goodNumber) > allNumber) {
                    if (curNumber > maxNumber)
                        alert(`超过剩余履行数量${maxNumber}，请重新输入`);
                    if (curNumber < 0)
                        alert(`输入数量不能小于0`);

                    if ((curNumber + preNumber + goodNumber) > allNumber) {
                        alert(`超出行最大数量${allNumber}-${preNumber}`);
                    }
                    curRec.setCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_estimated", value: 0,ignoreFieldChange: true});
                    curRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custpage_sublist_preamount_line',
                        value: 0,
                        ignoreFieldChange: true
                    });
                    if (wholeFlag == 'false') {
                        curRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custpage_sublist_prepaid_amount',
                            value: 0,
                            ignoreFieldChange: true
                        });
                    }
                } else {
                    let curNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_estimated"});
                    let curTaxPrice = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_tax_price_hide"});
                    let ratio = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_ratio"});
                    if (ratio) {
                        ratio = precentObj[ratio].name;
                    }

                    //整单预付分摊到行
                    let estimatedNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_estimated"});
                    let preAmount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_preamount_hide"}));
                    let lineCount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_preamount_line_hide"}));
                    let goodCount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_good"})) || 0;
                    let noAmount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_nopreamount_line_hide"})) || 0;

                    let linePreAmount = MatchTool.mulN(MatchTool.divN(preAmount,lineCount),(estimatedNumber + goodCount));
                    linePreAmount = MatchTool.fixed(linePreAmount,2);
                    curRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custpage_sublist_preamount_line',
                        value: linePreAmount,
                        ignoreFieldChange: true
                    });

                    //整单预付金额
                    let wholeAmount = curRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custpage_sublist_preamount_hide',
                    }) || 0;
                    //良品数量
                    let goodNumber = curRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custpage_sublist_number_good',
                    });
                    //良品价格
                    let goodPrice = curRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custpage_sublist_price_good_hide',
                    });
                    let allAmount = curRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custpage_sublist_all_amount_hide',
                    });
                    // //整单预付标志
                    // let wholeFlag = curRec.getValue({
                    //     fieldId: 'custpage_whole_payment'
                    // });

                    let prepaidAmount = 0;
                    //若【整单已预付金额分摊到该行】=0  含税单价*订单数量*申请预付比例
                    if (wholeFlag == 'true') {
                        console.log('方式1')
                        prepaidAmount = MatchTool.fixed(MatchTool.mulN(MatchTool.mulN(curNumber,curTaxPrice),MatchTool.divN(parseInt(ratio),100)),2);
                    } else if (wholeFlag == 'false' && !goodNumber) {
                        console.log('方式2')
                        //预计本次入库数量*含税单价-（【整单预付金额分摊到该行】+【非整单预付金额】）
                        prepaidAmount = MatchTool.fixed(MatchTool.subN(MatchTool.mulN(curNumber,curTaxPrice),linePreAmount),2);
                    } else if (wholeFlag == 'false' && goodNumber && goodPrice) {
                        console.log('方式3')
                        //预计本次入库数量*含税单价+良品数量*良品单价- （【整单预付金额分摊到该行】+【非整单预付金额】）
                        prepaidAmount = MatchTool.fixed((MatchTool.mulN(curNumber,curTaxPrice) + MatchTool.mulN(goodNumber,goodPrice) - linePreAmount),2);
                    }
                    console.log('预计申请金额：prepaidAmount',prepaidAmount);

                    if (wholeFlag == 'false') {

                        if (prepaidAmount > MatchTool.fixed(allAmount - (wholeAmount + noAmount),2)) {
                            curRec.setCurrentSublistValue({
                                sublistId: sublistId,
                                fieldId: 'custpage_sublist_prepaid_amount',
                                value: 0,
                                ignoreFieldChange: true
                            });
                            alert('本次预付金额大于剩余可预付金额');
                        } else {
                            curRec.setCurrentSublistValue({
                                sublistId: sublistId,
                                fieldId: 'custpage_sublist_prepaid_amount',
                                value: prepaidAmount,
                                ignoreFieldChange: true
                            });
                        }
                    }
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

            //预计入库良品数量
            if (fieldId == "custpage_sublist_number_good") {
                let checkFlag = curRec.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custpage_sublist_checkbox',
                });
                let wholeFlag = curRec.getValue({
                    fieldId: 'custpage_whole_payment',
                });
                //良品价格
                let goodPrice = curRec.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custpage_sublist_price_good_hide',
                });
                if (goodPrice) {
                    //良品数量
                    let goodNumber = curRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custpage_sublist_number_good',
                    });
                    //预计入库数量
                    let curNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_estimated"}) || 0;
                    //行总数量
                    var allNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_preamount_line_hide"}) || 0;
                    //该初始行已提交预付申请的预计入库数量合计
                    var preNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_prenumber_line_hide"}) || 0;
                    let allAmount = curRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custpage_sublist_all_amount_hide',
                    });
                    console.log('良品:curNumber',curNumber)
                    console.log('良品:allNumber',allNumber)
                    console.log('良品:preNumber',preNumber)
                    if ((curNumber + preNumber + goodNumber) > allNumber) {
                        alert(`超出行最大数量${allNumber}`);
                        curRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custpage_sublist_number_good',
                            value: 0,
                            ignoreFieldChange: true
                        });

                        if (wholeFlag == 'false') {
                            curRec.setCurrentSublistValue({
                                sublistId: sublistId,
                                fieldId: 'custpage_sublist_prepaid_amount',
                                value: 0,
                                ignoreFieldChange: true
                            });
                        }
                    } else {
                        let curTaxPrice = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_tax_price_hide"});
                        let preAmount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_preamount_hide"}));
                        let lineCount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_preamount_line_hide"}));
                        let goodCount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_good"})) || 0;
                        let estimatedNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_estimated"});

                        let linePreAmount = MatchTool.mulN(MatchTool.divN(preAmount,lineCount),(estimatedNumber + goodCount));
                        linePreAmount = MatchTool.fixed(linePreAmount,2);
                        //行分摊金额
                        curRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custpage_sublist_preamount_line',
                            value: linePreAmount
                        });
                        if (wholeFlag == 'false') {
                            let prepaidAmount = MatchTool.fixed((MatchTool.mulN(curNumber,curTaxPrice) + MatchTool.mulN(goodNumber,goodPrice) - linePreAmount),2);
                            let noAmount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_nopreamount_line_hide"})) || 0;

                            if (prepaidAmount > (allAmount - (wholeAmount + noAmount))) {
                                curRec.setCurrentSublistValue({
                                    sublistId: sublistId,
                                    fieldId: 'custpage_sublist_prepaid_amount',
                                    value: 0,
                                    ignoreFieldChange: true
                                });
                                alert('本次预付金额大于剩余可预付金额');
                            } else {
                                curRec.setCurrentSublistValue({
                                    sublistId: sublistId,
                                    fieldId: 'custpage_sublist_prepaid_amount',
                                    value: prepaidAmount,
                                    ignoreFieldChange: true
                                });
                            }
                        }
                    }
                } else {
                    curRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custpage_sublist_number_good',
                        value: 0,
                        ignoreFieldChange: true
                    });

                    alert("此货品无有效的价格记录在供应商价格档案，请检查")
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

            if (fieldId == "custpage_sublist_prepaid_amount") {
                let precentObj = app.getPrecentObj();
                let curNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_hide"});
                let curTaxPrice = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_tax_price_hide"});
                let ratio = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_ratio"});
                if (ratio) {
                    ratio = precentObj[ratio].name;
                }

                let estimatedNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_estimated"});
                let preAmount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_preamount_hide"}));//整单预付金额
                let lineCount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_preamount_line_hide"}));
                let goodCount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_good"})) || 0;
                let noAmount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_nopreamount_line_hide"})) || 0;
                // let noAmount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_preamount_hide"})) || 0;
                let allAmount = Number(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_all_amount_hide"})) || 0;

                let linePreAmount = preAmount/lineCount*(estimatedNumber + goodCount);
                let prepaidAmount = 0;
                //整单预付标志
                let wholeFlag = curRec.getValue({
                    fieldId: 'custpage_whole_payment'
                })
                //当前预付款金额
                let curPrepaidAmount = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_prepaid_amount"});

                if (wholeFlag == 'true') {
                    prepaidAmount = MatchTool.fixed(MatchTool.mulN(MatchTool.mulN(curNumber,curTaxPrice),MatchTool.divN(parseInt(ratio),100)),2);
                } else if (wholeFlag == 'false') {
                    //预计本次入库数量*含税单价-【整单预付金额分摊到该行】
                    prepaidAmount = MatchTool.fixed(MatchTool.subN(MatchTool.mulN((estimatedNumber + goodCount),curTaxPrice),linePreAmount),2);

                    if (curPrepaidAmount > MatchTool.fixed(allAmount -(preAmount + noAmount),2)) {
                        alert('超过未预付金额');
                        curRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: "custpage_sublist_prepaid_amount",
                            value: prepaidAmount
                        });
                    }
                }

                if (curPrepaidAmount > prepaidAmount) {
                    alert('超过本次最高申请金额');
                    curRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: "custpage_sublist_prepaid_amount",
                        value: prepaidAmount
                    });
                }

                let checkFlag = curRec.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custpage_sublist_checkbox',
                });
                console.log('本次预付金额checkFlag',checkFlag);
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

            if (fieldId == "custpage_sublist_ratio") {
                let precentObj = app.getPrecentObj();
                let ratio = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_ratio"});
                let ratioList = JSON.parse(curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_line_whole_ratio_hide"}));
                let curNumber = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_hide"});
                let curTaxPrice = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_tax_price_hide"});
                //整单预付标志
                let wholeFlag = curRec.getValue({
                    fieldId: 'custpage_whole_payment'
                })
                console.log('ratio',ratio);
                console.log('ratioList',ratioList);
                if (ratioList.indexOf(String(ratio)) == -1) {
                    alert("本次选择预付款比例与供应商不匹配请重新选择");
                    curRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custpage_sublist_ratio',
                        value: ratioList[0],
                        ignoreFieldChange: true
                    })
                } else {
                    if (wholeFlag == 'true') {
                        if (ratio) {
                            ratio = precentObj[ratio].name;
                        }
                        let prepaidAmount = MatchTool.fixed(MatchTool.mulN(MatchTool.mulN(curNumber, curTaxPrice),
                            MatchTool.divN(parseInt(ratio), 100)), 2);
                        curRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: "custpage_sublist_prepaid_amount",
                            value: prepaidAmount,
                            ignoreFieldChange: true
                        });
                    }
                }

                let checkFlag = curRec.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custpage_sublist_checkbox',
                });
                if (checkFlag) {
                    var subsidiary = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_subsidiary_hide"});
                    var vendor = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_vendor_hide"});
                    var orderId = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_order_hide"});
                    var flag = curRec.getValue({fieldId: "custpage_whole_payment"});
                    var radio = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_ratio"});
                    let currency = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_currency_hide"});


                    // var uniqueKey = subsidiary+ '_' + vendor + '_' + orderId + '_' + estimatedDate + '_' + account;
                    var uniqueKey = subsidiary + '_' + vendor + '_' + orderId + '_' + flag + '_' + radio + '_' + currency;

                    var key_end = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_orderkey_start_hide"});
                    var key_line = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_orderline_hide"});
                    var key_start = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_orderkey_end_hide"});
                    var lineKey = key_line + '_' + key_start + '_' + key_end;

                    for (let i = 0;i < ratioList.length;i++) {
                        uniqueKey = subsidiary + '_' + vendor + '_' + orderId + '_' + flag + '_' + ratioList[i] + '_' + currency;
                        if (selectedObj.hasOwnProperty(uniqueKey)) {

                            if (selectedObj[uniqueKey].hasOwnProperty(lineKey)) {
                                let allAmount = curRec.getValue({fieldId: "custpage_all_payment"}) || 0;
                                allAmount = allAmount - selectedObj[uniqueKey][lineKey].prepaidAmount;
                                console.log('allAmount',allAmount);
                                curRec.setValue({fieldId: "custpage_all_payment", value: allAmount});
                                delete selectedObj[uniqueKey][lineKey];
                                // curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});
                                if (Object.keys(selectedObj[uniqueKey]).length === 0) {
                                    delete selectedObj[uniqueKey];
                                }
                                curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});
                            }
                        }
                    }

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

            if (fieldId == "custpage_sublist_line_memo") {
                let checkFlag = curRec.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custpage_sublist_checkbox',
                });
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

            // if (fieldId == "custpage_vendor") {//custpage_account
            // var vedor = curRec.getValue({
            //     fieldId: 'custpage_vendor'
            // });
            //
            // if (vedor) {
            //     var vendorRec = record.load({
            //         type: 'vendor',
            //         id: vedor
            //     });
            //     var terms = vendorRec.getValue({fieldId: 'custentity_swc_payment_terms'});
            //     var accountArr = vendorRec.getValue({fieldId: 'custentity_swc_vendor_banknumber'});
            //
            //     console.log('terms',terms);
            //     if (terms) {
            //         curRec.setValue({
            //             fieldId: 'custpage_terms',
            //             value: terms
            //         });
            //     }
            //     if (accountArr.length > 0) {
            //         console.log('accountArr',accountArr);
            //         var accountData = [];
            //         if (typeof accountArr === 'string' && accountArr.trim() !== '') {
            //             var ids = accountArr.split(',').map(function(id) {
            //                 return id.trim();
            //             }).filter(function(id) {
            //                 return id !== '';
            //             });
            //
            //             ids.forEach(function(id) {
            //                 accountData.push(id);
            //             });
            //         } else if (Array.isArray(accountArr)) {
            //             accountArr.forEach(function(item) {
            //                 accountData.push(item);
            //             });
            //         } else if (accountArr != null) {
            //             accountData.push(accountArr);
            //         }
            //
            //         let accountData2 = app.srcAccount(accountData);
            //         console.log('accountData2',accountData2);
            //         var accountField = curRec.getField({
            //             fieldId: 'custpage_account'
            //         });
            //         accountField.removeSelectOption({
            //             value: null,
            //         });
            //         accountData2.forEach(function(value) {
            //             accountField.insertSelectOption({
            //                 value: value.value,
            //                 text: value.text
            //             })
            //         });
            //
            //         curRec.setValue({
            //             fieldId: 'custpage_account',
            //             value: accountData2[0]
            //         });
            //         curRec.setValue({
            //             fieldId: 'custpage_account_hide',
            //             value: accountData2
            //         });
            //     }
            // }  else {
            //     curRec.setValue({
            //         fieldId: 'custpage_terms',
            //         value: ''
            //     });
            //     let accountData2 = app.srcAccount();
            //     var accountField = curRec.getField({
            //         fieldId: 'custpage_account'
            //     });
            //     accountField.removeSelectOption({
            //         value: null,
            //     });
            //     accountField.insertSelectOption({
            //         value: "",
            //         text: ""
            //     });
            //     accountData2.forEach(function(value) {
            //         accountField.insertSelectOption({
            //             value: value.value,
            //             text: value.text
            //         })
            //     });
            //
            //     curRec.setValue({
            //         fieldId: 'custpage_account',
            //         value: ''
            //     });
            // }
            // }

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
            // console.log('初始化测试')
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
            var rec = scriptContext.currentRecord;
            var vendor = rec.getValue({
                fieldId: 'custpage_vendor',
            });

            var type = rec.getValue({
                fieldId: 'custpage_type',
            });
            let isEmptyArray = Array.isArray(type) && (type.length === 0 || (type.length === 1 && type[0] === ''));

            if (!vendor) {
                alert('供应商不能为空');
                return false;
            }
            if (isEmptyArray) {
                alert('订单类型不能为空');
                return false;
            }
            if (vendor && !isEmptyArray) {
                return true;
            }
            // return true
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

        /**
         * 当前页面全选
         */
        // function selectAll() {
        //     let curRec = currentRecord.get();
        //     let sublistId = "custpage_sublist_detail";
        //     let count = curRec.getLineCount(sublistId);
        //     if (!count) return;
        //     // var errMsg = "";
        //     let selected = curRec.getValue({fieldId: "custpage_selected"});
        //     // let vendorId = curRec.getValue({fieldId:"custpage_vendor"}) || ""; //供应商
        //
        //     let selectedObj = selected ? JSON.parse(selected) : {};
        //     for (var i = 0; i < count; i++) {
        //         curRec.selectLine({sublistId, line: i});
        //         let checkbox = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_checkbox"});
        //         if (checkbox) continue;
        //
        //         // 当前行设置为勾选
        //         curRec.setCurrentSublistValue({sublistId: "custpage_sublist_detail", fieldId: "custpage_sublist_checkbox", value: true, ignoreFieldChange: true});
        //     }
        //     // 更新已选择数据
        //     curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});
        //     // // 提示错误信息
        //     // if (errMsg) alert(errMsg);
        // }
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

            //整单预付
            let wholeFlag = curRec.getValue({fieldId: "custpage_whole_payment"});
            if (!wholeFlag) {
                alert("请选择是否为整单预付");
            } else {

                let allAmount = curRec.getValue({fieldId: "custpage_all_payment"}) || 0;
                let allQuantity = curRec.getValue({fieldId: "custpage_all_quantity"}) || 0;
                let allPreQuantity = curRec.getValue({fieldId: "custpage_all_prequantity"}) || 0;
                for (let i = 0; i < count; i++) {
                    curRec.selectLine({sublistId, line: i});
                    let checkbox = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_checkbox"});

                    if (checkbox) continue; // 如果已经选中，跳过

                    // 获取三个必填字段的值
                    var input1 = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_number_estimated"});   //预计本次入库数量
                    // var input2 = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_ratio"});   //申请预付比例
                    var input3 = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_prepaid_amount"});   //申请预付金额
                    var wholeAmount = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_preamount_hide"});
                    // 检查必填字段
                    if ((!wholeFlag && !input1) || (wholeFlag == 'true' && wholeAmount)) {
                        // 如果不满足条件，跳过这一行
                        continue;
                    }

                    // 获取唯一键
                    var subsidiary = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_subsidiary_hide"});
                    var vendor = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_vendor_hide"});
                    var orderId = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_order_hide"});
                    var flag = curRec.getValue({fieldId: "custpage_whole_payment"});
                    var radio = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_ratio"});
                    // var wholeFlag = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_whole_payment"});
                    var date = curRec.getValue({fieldId: "custpage_order_date"});
                    let currency = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_currency_hide"});

                    // var uniqueKey = subsidiary+ '_' + vendor + '_' + orderId + '_' + estimatedDate + '_' + account;
                    var uniqueKey = subsidiary + '_' + vendor + '_' + orderId + '_' + flag + '_' + radio + '_' + currency;

                    var key_end = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_orderkey_start_hide"});
                    var key_line = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_orderline_hide"});
                    var key_start = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_orderkey_end_hide"});
                    var lineKey = key_line + '_' + key_start + '_' + key_end;

                    // 如果已存在，跳过
                    if (selectedObj.hasOwnProperty(uniqueKey) && selectedObj[uniqueKey].hasOwnProperty(lineKey)) {
                        continue;
                    }

                    // 手动构建 lineDataObj（复制自 fieldChanged 逻辑）
                    let lineDataObj = {};
                    lineDataObj["on"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_indextext"});   //序号
                    lineDataObj["type2"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_type_2_hide"});
                    lineDataObj["orderId"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_order_hide"});   //订单号
                    lineDataObj["subsidiaryId"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_subsidiary_hide"});   //子公司
                    lineDataObj["vendorId"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_vendor_hide"});   //供应商
                    lineDataObj["orderline"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_orderline_hide"});   //订单行号
                    lineDataObj["startKey"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_orderkey_start_hide"});   //订单初始唯一键
                    lineDataObj["endKey"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_orderkey_end_hide"});   //订单后续唯一键
                    lineDataObj["item"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_item_code_hide"});   //货品编码
                    lineDataObj["itemName"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_item_name_hide"});   //货品名称
                    lineDataObj["rate"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_item_price_hide"});   //未税单价
                    lineDataObj["tax"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_tax_hide"});   //税率
                    lineDataObj["taxprice"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_tax_price_hide"});   //含税单价
                    lineDataObj["quantity"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_number_hide"});   //订单行数量
                    lineDataObj["grossamount"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_all_amount_hide"});   //订单行含税总金额
                    lineDataObj["preamount"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_preamount_hide"});   //整单预付金额
                    lineDataObj["preamountline"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_preamount_line"});   //整单预付金额分摊到该行核销金额
                    lineDataObj["goodnumber"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_number_good"});   //良品数量
                    lineDataObj["goodprice"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_price_good_hide"});   //良品价格
                    lineDataObj["estimatedNumber"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_number_estimated"});   //预计本次入库数量
                    lineDataObj["ratio"] = curRec.getCurrentSublistText(
                        {sublistId, fieldId: "custpage_sublist_ratio"});   //整单预付比例
                    lineDataObj["prepaidAmount"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_prepaid_amount"});   //本次申请预付金额

                    lineDataObj["yjjsrq"] = curRec.getCurrentSublistText(
                        {sublistId, fieldId: "custpage_sublist_expectedreceiptdate_line_hide"});   //预计接收日期

                    lineDataObj["bhjh"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_demand_line_hide"});   //备货计划

                    allAmount = allAmount + lineDataObj["prepaidAmount"];
                    lineDataObj["linememo"] = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_line_memo"});   //行备注

                    allQuantity = allQuantity + Number(lineDataObj["quantity"]);
                    allPreQuantity = allPreQuantity + Number(lineDataObj["estimatedNumber"]) + Number(lineDataObj["goodnumber"]);

                    // 初始化 uniqueKey 对象如果不存在
                    if (!selectedObj[uniqueKey]) {
                        selectedObj[uniqueKey] = {};
                    }

                    selectedObj[uniqueKey][lineKey] = lineDataObj;

                    // 设置复选框，但仍然使用 ignoreFieldChange: true 避免重复触发
                    curRec.setCurrentSublistValue({
                        sublistId,
                        fieldId: "custpage_sublist_checkbox",
                        value: true,
                        ignoreFieldChange: true
                    });
                }

                // 更新已选择数据
                curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});
                curRec.setValue({fieldId: "custpage_all_payment", value: allAmount});
                curRec.setValue({fieldId: "custpage_all_quantity", value: allQuantity});
                curRec.setValue({fieldId: "custpage_all_prequantity", value: allPreQuantity});
                // 可以添加提示信息
                let selectedCount = 0;
                for (let key in selectedObj) {
                    selectedCount += Object.keys(selectedObj[key]).length;
                }
                alert(`已选中 ${selectedCount} 行数据`);
            }
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
        /**
         * 当前页面取消全选
         */
        function deselectAll() {
            let curRec = currentRecord.get();
            let sublistId = "custpage_sublist_detail";
            let count = curRec.getLineCount({sublistId: "custpage_sublist_detail"});
            if (!count) return;

            let selected = curRec.getValue({fieldId: "custpage_selected"});
            let selectedObj = selected ? JSON.parse(selected) : {};

            for (let i = 0; i < count; i++) {
                curRec.selectLine({sublistId, line: i});

                // 获取唯一键
                var subsidiary = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_subsidiary_hide"});
                var vendor = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_vendor_hide"});
                var orderId = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_order_hide"});
                var flag = curRec.getValue({fieldId: "custpage_whole_payment"});
                var radio = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_ratio"});
                // var wholeFlag = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_whole_payment"});
                var date = curRec.getValue({fieldId: "custpage_order_date"});
                let currency = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_currency_hide"});

                // var uniqueKey = subsidiary+ '_' + vendor + '_' + orderId + '_' + estimatedDate + '_' + account;
                var uniqueKey = subsidiary + '_' + vendor + '_' + orderId + '_' + flag + '_' + radio + '_' + currency;

                var key_end = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_orderkey_start_hide"});
                var key_line = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_orderline_hide"});
                var key_start = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_orderkey_end_hide"});
                var lineKey = key_line + '_' + key_start + '_' + key_end;

                // 从 selectedObj 中删除对应的数据
                if (selectedObj.hasOwnProperty(uniqueKey) && selectedObj[uniqueKey].hasOwnProperty(lineKey)) {
                    delete selectedObj[uniqueKey][lineKey];

                    // 如果 uniqueKey 下没有数据了，删除 uniqueKey
                    if (Object.keys(selectedObj[uniqueKey]).length === 0) {
                        delete selectedObj[uniqueKey];
                    }
                }

                // 设置复选框为未选中
                curRec.setCurrentSublistValue({
                    sublistId,
                    fieldId: "custpage_sublist_checkbox",
                    value: false,
                    ignoreFieldChange: true
                });
            }

            // 更新已选择数据
            curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});
            curRec.setValue({fieldId: "custpage_all_payment", value: 0});
            curRec.setValue({fieldId: "custpage_all_quantity", value: 0});
            curRec.setValue({fieldId: "custpage_all_prequantity", value: 0});

            alert("已取消全选");
        }

        /**
         * 预付款平台【提交】按钮执行函数
         */
        async function createOrder() {
            // 弹出弹框
            var options = {
                title: "提醒",
                message: "确定生成预付款申请"
            };

            // 使用 Promise 包装弹窗确认逻辑
            try {
                let curRec = currentRecord.get();
                let flag = curRec.getValue({fieldId: "custpage_whole_payment"});
                if (flag) {
                    const result = await dialog.confirm(options);

                    // 用户点击了确定
                    if (result) {
                        console.log("用户确认提交");
                        let selected = curRec.getValue({fieldId: "custpage_selected"});
                        let selectedObj = selected ? JSON.parse(selected) : {};
                        let dataLength = Object.keys(selectedObj).length;
                        let dataValue = Object.values(selectedObj);//已勾选的数据

                        // //预付款日期
                        let orderDate = curRec.getText({fieldId: "custpage_order_date"});
                        let wholeFlag = curRec.getValue({fieldId: "custpage_whole_payment"});
                        // 付款条件
                        let terms = curRec.getValue({fieldId: "custpage_terms"});
                        //银行科目
                        let account = curRec.getValue({fieldId: "custpage_account"});
                        //备注
                        let memo = curRec.getValue({fieldId: "custpage_memo"});
                        let errorNo = [];
                        let errorNumber = [];

                        //必填判断
                        let vendor = curRec.getValue({fieldId: "custpage_vendor"});
                        let whole = curRec.getValue({fieldId: "custpage_whole_payment"});

                        let bussiness = curRec.getValue({fieldId: "custpage_bussiness"});
                        if (!vendor) {
                            alert("供应商不能为空");
                            return;
                        }
                        if (!terms) {
                            alert("付款条件不能为空");
                            return;
                        }
                        if (!account) {
                            alert("银行科目不能为空");
                            return;
                        }
                        if (!orderDate) {
                            alert("预付款日期不能为空");
                            return;
                        }
                        if (!whole) {
                            alert("整单预付不能为空");
                            return;
                        }
                        if (!bussiness) {
                            alert("提出部门不能为空");
                            return;
                        }

                        var allQuantity = curRec.getValue({fieldId: "custpage_all_quantity"});
                        var allPreQuantity = curRec.getValue({fieldId: "custpage_all_prequantity"});

                        for (let i in selectedObj) {
                            for (let j in selectedObj[i]) {
                                selectedObj[i].basicObj = {
                                    orderDate: orderDate,
                                    account: account,
                                    memo: memo,
                                    terms: terms,
                                    allQuantity: allQuantity,
                                    allPreQuantity: allPreQuantity,
                                    bussiness: bussiness
                                }

                                if (selectedObj[i][j].prepaidAmount == 0) {
                                    errorNo.push(selectedObj[i][j].on)
                                }
                                if (wholeFlag == 'false') {
                                    let number = Number(selectedObj[i][j].goodnumber) + Number(selectedObj[i][j].estimatedNumber)
                                    if (number == 0) {
                                        errorNumber.push(selectedObj[i][j].on)
                                    }
                                }
                            }
                        }

                        if (errorNo.length == 0 && errorNumber.length == 0) {
                            let adData = selectedObj;
                            let timeoutblockerDiv = document.getElementById("timeoutblocker");
                            timeoutblockerDiv.style.display = "block";
                            let startDate = new Date().getTime();
                            let reqUrl = url.resolveScript({
                                scriptId: "customscript_swc_sl_prepaymentplatform",
                                deploymentId: "customdeploy_swc_sl_prepaymentplatform",
                                params: {
                                    flag: SUBMIST_STATUS, // 请求区分创建采购订单
                                }
                            });

                            let createPoResult = await https.post.promise({
                                url: reqUrl,
                                body: {
                                    "adData": JSON.stringify(adData),
                                }
                            });
                            let data = createPoResult.body && JSON.parse(createPoResult.body);
                            console.log('接口1返回数据', data);

                            let poEndDate = new Date().getTime();
                            console.log("执行时间", ((poEndDate - startDate) / 1000) + "秒")

                            if (data.code == 200) {
                                // curRec.setValue({fieldId: "custpage_selected",value:''});
                                // 开始轮询任务状态
                                pollTaskStatus(data.data.taskId);
                            }
                            if (data.code == 500) {
                                alert(data["msg"]);
                                let endDate = new Date().getTime();
                                console.log("共计执行时间", ((endDate - startDate) / 1000) + "秒")
                                window.onbeforeunload = null;

                                window.location.reload();
                                // window.location.href = window.location.href;
                            }
                        } else {
                            var error = '';
                            if (errorNo.length > 0) {
                                errorNo = errorNo.join(",");
                                error = `以下已选择预付申请金额为0：${errorNo}。`
                            }
                            if (wholeFlag == 'false') {
                                if (errorNumber.length > 0) {
                                    errorNumber = errorNumber.join(",");
                                    error = error + `以下已选择预付数量为0：${errorNumber}。`
                                }
                            }


                            alert(`${error}`);
                        }
                    } else {
                        // 用户点击了取消
                        console.log("用户取消提交");
                    }
                } else {
                    alert('未选择是否为整单预付')
                }
            } catch (error) {
                // 弹窗出现错误
                console.log("弹窗错误: " + error);
            }
        }

        function pollTaskStatus(taskId) {
            var checkInterval = 4000; // 2秒检查一次
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
                    scriptId: "customscript_swc_sl_prepaymentplatform",
                    deploymentId: "customdeploy_swc_sl_prepaymentplatform",
                    params: {
                        flag: SUBMIST_STATUS_2, // 请求区分创建采购订单
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
                        var errorRec = record.load({
                            type: 'customrecord_swc_script_error',
                            id: 1//后续需调整
                        });
                        var error = errorRec.getValue({fieldId: 'custrecord_swc_script_error_message'});
                        if (error) {
                            // errorRec.setValue({fieldId: 'custrecord_swc_script_error_message',value: ''});
                            // errorRec.save();
                            clearInterval(poll);
                            alert(`预付申请单生成失败,请联系管理员: ${error}`);
                            document.getElementById('timeoutblocker').style.display = 'none';
                            // 刷新页面或跳转
                            window.onbeforeunload = null;
                            window.location.reload();
                        } else {
                            clearInterval(poll);
                            alert("预付申请单生成成功！");
                            document.getElementById('timeoutblocker').style.display = 'none';
                            // 刷新页面或跳转
                            var newId = getNewOrder();
                            let orderUrl = url.resolveRecord({
                                recordType: "customrecord_swc_advancepay_plateform",
                                recordId: newId,
                                isEditMode: false
                            });
                            // 刷新页面或跳转
                            window.onbeforeunload = null;
                            window.open(orderUrl);
                            window.location.reload();
                        }
                    } else if (status === "FAILED") {
                        clearInterval(poll);
                        alert("任务执行失败");
                        document.getElementById('timeoutblocker').style.display = 'none';
                    }
                    // 其他状态（PENDING, PROCESSING）继续轮询
                }
            }, checkInterval);
        }

        function restoreSavedData(currentRecord) {
            console.log('初始化行')
            let curRec = currentRecord;
            let sublistId = "custpage_sublist_detail";
            let count = curRec.getLineCount({sublistId: sublistId});

            for (let i = 0; i < count; i++) {
                curRec.selectLine({sublistId, line: i});
                // 只在明细子列表初始化时处理
                if (sublistId === "custpage_sublist_detail") {
                    // 获取已选择的数据
                    let selected = curRec.getValue({fieldId: "custpage_selected"});
                    let selectedObj = selected ? JSON.parse(selected) : {};

                    if (Object.keys(selectedObj).length > 0) {
                        // 获取当前行的唯一键
                        let subsidiary = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_subsidiary_hide"});
                        let vendor = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_vendor_hide"});
                        let orderId = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_order_hide"});
                        let flag = curRec.getValue({fieldId: "custpage_whole_payment"});
                        let radio = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_ratio"});
                        let currency = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_currency_hide"});

                        let key_end = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_orderkey_start_hide"});
                        let key_line = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_orderline_hide"});
                        let key_start = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_orderkey_end_hide"});
                        let lineKey = key_line + '_' + key_start + '_' + key_end;

                        let uniqueKey = subsidiary + '_' + vendor + '_' + orderId + '_' + flag + '_' + radio + '_' + currency;

                        // 查找当前行是否在已选择数据中
                        if (selectedObj[uniqueKey] && selectedObj[uniqueKey][lineKey]) {
                            let lineData = selectedObj[uniqueKey][lineKey];

                            // 恢复字段值

                            //整单预付金额分摊到该行核销金额
                            curRec.setCurrentSublistValue({
                                sublistId,
                                fieldId: "custpage_sublist_preamount_line",
                                value: lineData.preamountline || 0,
                                ignoreFieldChange: true
                            });

                            //该初始行已提交预付申请的预计入库数量合计
                            // curRec.setCurrentSublistValue({
                            //     sublistId,
                            //     fieldId: "custpage_sublist_prenumber_line",
                            //     value: lineData.preamountline || 0,
                            //     ignoreFieldChange: true
                            // });

                            //本次入库数量
                            curRec.setCurrentSublistValue({
                                sublistId,
                                fieldId: "custpage_sublist_number_estimated",
                                value: lineData.estimatedNumber || 0,
                                ignoreFieldChange: true
                            });

                            curRec.setCurrentSublistValue({
                                sublistId,
                                fieldId: "custpage_sublist_ratio",
                                value: lineData.ratio || "",
                                ignoreFieldChange: true
                            });

                            curRec.setCurrentSublistValue({
                                sublistId,
                                fieldId: "custpage_sublist_prepaid_amount",
                                value: lineData.prepaidAmount || 0,
                                ignoreFieldChange: true
                            });

                            curRec.setCurrentSublistValue({
                                sublistId,
                                fieldId: "custpage_sublist_number_good",
                                value: lineData.goodnumber || 0,
                                ignoreFieldChange: true
                            });

                            curRec.setCurrentSublistValue({
                                sublistId,
                                fieldId: "custpage_sublist_line_memo",
                                value: lineData.linememo || "",
                                ignoreFieldChange: true
                            });

                            // 设置勾选状态
                            curRec.setCurrentSublistValue({
                                sublistId,
                                fieldId: "custpage_sublist_checkbox",
                                value: true,
                                ignoreFieldChange: true
                            });
                        }
                    }
                }
            }
        }

        function getNewOrder() {
            var customrecord_swc_account_statementSearchObj = search.create({
                type: "customrecord_swc_advancepay_plateform",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            summary: "MAX",
                            label: "内部 ID"
                        })
                    ]
            });

            var results = getAllResults(customrecord_swc_account_statementSearchObj);
            var id = '';
            results.forEach(function (value) {
                id = value.getValue({
                    name: "internalid",
                    summary: "MAX",
                    label: "内部 ID"
                })
            });
            return id;
        }
        function getAllResults(srch) {
            let results = srch.run();
            let searchResults = [];
            let searchid = 0;
            let resultslice;
            do {
                resultslice = results.getRange({
                    start: searchid,
                    end: searchid + 1000
                });
                resultslice.forEach(function (slice) {
                    searchResults.push(slice);
                    searchid++;
                });

            } while (resultslice.length >= 1000);
            return searchResults;
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