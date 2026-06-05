/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
const SUBMIST_STATUS = "1";//平台生成预付申请单
const SUBMIST_STATUS_2 = "2";
define(["N/currentRecord",'N/record', 'N/search', '../APP/SWC_APP_PaymentPlatform','N/url','N/https','N/ui/dialog','../common/MatchTool'],
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

            var labelSpan = document.querySelector('#custpage_pre_date_fs_lbl');
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

            var labelSpan = document.querySelector('#custpage_vendor_fs_lbl');
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
            let selected = curRec.getValue({fieldId: "custpage_selected"});
            let selectedObj = selected ? JSON.parse(selected) : {};
            let dataLength = Object.keys(selectedObj).length;

            //本次输入金额限制
            if (fieldId == "custpage_sublist_cur_payment") {
                let curAmount = curRec.getCurrentSublistValue({sublistId, fieldId: fieldId});
                //最高金额
                let pendingAmount = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_pending_payment_hide"});
                let type = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_order_type_hide"});
                console.log('type',type);
                if (type == 'VendBill') {
                    if (curAmount > pendingAmount) {
                        alert('本次支付金额不可大于待支付金额');
                        curRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: fieldId,
                            value: pendingAmount
                        });
                    }
                    if (curAmount < 0) {
                        alert('账单：本次支付金额不可小于0');
                        curRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: fieldId,
                            value: 0
                        });
                    }

                } else {
                    if (curAmount < pendingAmount) {
                        alert('本次支付金额不可大于待支付金额');
                        curRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: fieldId,
                            value: pendingAmount
                        });
                    }
                    if (curAmount > 0) {
                        alert('贷项：本次支付金额不可小于0');
                        curRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: fieldId,
                            value: 0
                        });
                    }
                }

            }

            if (fieldId == "custpage_sublist_checkbox") {
                // 获取单选框状态
                console.log('sublistId',sublistId);
                let checkbox = curRec.getCurrentSublistValue({sublistId, fieldId: fieldId});
                // var order =  curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_order_hide"});
                var orderLine =  curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_orderline_hide"});
                var startKey =  curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_orderkey_start_hide"});
                var endKey =  curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_orderkey_end_hide"});

                //本次支付金额
                var input3 = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_cur_payment"});


                if (checkbox) {
                    if (!input3) {
                        curRec.setCurrentSublistValue({
                            sublistId,
                            fieldId: fieldId,
                            value: false
                        });
                        alert('请填写本次支付金额');
                    }
                }

                var subsidiary =  curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_subsidiary_hide"});
                var vendor =  curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_vendor_hide"});
                var orderId =  curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_order_hide"});
                var currency =  curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_currency_hide"});
                var rate =  curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_exchange_rate_hide"});
                // var uniqueKey = subsidiary+ '_' + vendor + '_' + orderId + '_' + estimatedDate + '_' + account;
                // var uniqueKey = subsidiary+ '_' + vendor + '_' + orderId + '_' + currency + '_' + rate;
                // var uniqueKey = subsidiary+ '_' + vendor + '_' + currency;
                var gcKey = subsidiary + '_' + vendor + '_' + currency;
                var gcFlag = curRec.getValue({fieldId: "custpage_gc_flag"});
                var amountSum = curRec.getValue({
                    fieldId: 'custpage_pre_amount'
                }) || 0;

                var key_end = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_orderkey_start_hide"});
                var key_line = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_orderline_hide"});
                var key_start = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_orderkey_end_hide"});
                // var lineKey = key_line + '_' + key_start + '_' + key_end;
                var uniqueKey = orderId + '_' + key_line;
                if (checkbox) {
                    if (!gcFlag || gcFlag == gcKey) {
                        if (!gcFlag) {
                            curRec.setValue({
                                fieldId: 'custpage_gc_flag',
                                value: gcKey
                            })
                        }

                        //   - 翻页勾选使用
                        let lineDataObj = {};
                        if (input3) {
                            //合计对账总金额 应付总金额
                            curRec.setValue({
                                fieldId: 'custpage_pre_amount',
                                value: Number(amountSum) + Number(input3)
                            });
                            selectedObj[uniqueKey] = selectedObj[uniqueKey] || {};

                            //订单类型
                            lineDataObj["type2"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_type_2_hide"});
                            lineDataObj["orderline"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_orderline_hide"});   //订单行号
                            // lineDataObj["subsidiaryId"] = curRec.getCurrentSublistValue(
                            //     {sublistId, fieldId: "custpage_sublist_subsidiary_hide"});   //子公司
                            // lineDataObj["vendorId"] = curRec.getCurrentSublistValue(
                            //     {sublistId, fieldId: "custpage_sublist_vendor_hide"});   //供应商
                            lineDataObj["type"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_order_type_hide"});   //单据类型
                            lineDataObj["dzId"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_statement_hide"});   //对账单
                            lineDataObj["orderId"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_order_hide"});   //订单号
                            lineDataObj["startKey"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_orderkey_start_hide"});   //订单初始唯一键
                            lineDataObj["endKey"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_orderkey_end_hide"});   //订单后续唯一键
                            lineDataObj["item"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_item_code_hide"});   //货品编码
                            lineDataObj["itemName"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_item_name_hide"});   //货品名称
                            lineDataObj["quantity"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_number_hide"});   //订单行数量
                            lineDataObj["rate"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_item_price_hide"});   //未税单价
                            lineDataObj["tax"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_tax_hide"});   //税率
                            // lineDataObj["taxprice"] = curRec.getCurrentSublistValue(
                            //     {sublistId, fieldId: "custpage_sublist_tax_price_hide"});   //含税单价
                            lineDataObj["grossamount"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_all_amount_hide"});   //含税总金额
                            lineDataObj["wholespare"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_whole_allocation_hide"});   //整单预付-分摊
                            lineDataObj["beforearrived"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_before_shipment_amount_hide"});   //发货前预付金额
                            lineDataObj["writeoff"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_prepaid_amount_hide"});   //已预付总金额
                            lineDataObj["pending"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_pending_payment_hide"});   //待支付金额
                            lineDataObj["usedamount"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_already_payment_hide"});   //之前申请金额
                            lineDataObj["curamount"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_cur_payment"});   //本次支付金额
                            // lineDataObj["remainamount"] = curRec.getCurrentSublistValue(
                            //     {sublistId, fieldId: "custpage_sublist_cur_payment"});   //剩余可申请金额
                            // lineDataObj["cashieramount"] = curRec.getCurrentSublistValue(
                            //     {sublistId, fieldId: "custpage_sublist_cur_payment"});   //出纳付款
                            lineDataObj["paymentlink"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_cur_payment"});   //明细行付款链接
                            lineDataObj["duedate"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_cur_date_hide"});   //截至日期
                            lineDataObj["memo"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_line_memo"});   //行备注

                            lineDataObj["bhjh"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_demand_line_hide"});   //备货计划

                            //线下对账单
                            lineDataObj["xxdzd"] = curRec.getCurrentSublistValue(
                                {sublistId, fieldId: "custpage_sublist_xxdzd_hide"});//补充
                            selectedObj[uniqueKey] = lineDataObj;
                        }
                    } else {
                        alert('不符合合并条件，请检查已选择数据：子公司，供应商，货币');



                        curRec.setCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_checkbox", value: false,ignoreFieldChange: false})

                        // 删除取消勾选已选择的数据    - 翻页勾选使用
                        if (selectedObj.hasOwnProperty(uniqueKey)) {
                            delete selectedObj[uniqueKey];
                        }
                    }
                } else {
                    if (!gcFlag || gcFlag == gcKey) {
                        curRec.setValue({
                            fieldId: 'custpage_pre_amount',
                            value: Number(amountSum) - Number(input3)
                        });
                    }
                    // 删除取消勾选已选择的数据    - 翻页勾选使用
                    if (selectedObj.hasOwnProperty(uniqueKey)) {
                        delete selectedObj[uniqueKey];
                    }
                    if (Object.keys(selectedObj).length == 0) {
                        curRec.setValue({
                            fieldId: 'custpage_gc_flag',
                            value: ""
                        })
                    }
                }
                // 更新已选择数据   - 翻页勾选使用
                curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});
            }

            //查询条件-子公司
            if (fieldId == "custpage_subsidiary" || fieldId == "custpage_vendor"
                || fieldId == "custpage_order_startdate" || fieldId == "custpage_order_enddate") {
                let subsidiaryId = curRec.getValue('custpage_subsidiary') || "";
                let vendorId = curRec.getValue({fieldId:"custpage_vendor"}) || "";
                let startDate = curRec.getValue({fieldId:"custpage_order_startdate"}) || "";
                let endDate = curRec.getValue({fieldId:"custpage_order_enddate"}) || "";
                console.log('startDate',startDate);

                if (startDate)
                    startDate = `${startDate.getFullYear()}-${startDate.getMonth() + 1}-${startDate.getDate()}`;
                console.log('更改后startDate',startDate);
                if (endDate)
                    endDate = `${endDate.getFullYear()}-${endDate.getMonth() + 1}-${endDate.getDate()}`;

                // //订单选项更改
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
                    // //账单列表
                    let billData = app.srcBillOrd(subsidiaryId, vendorId, startDate, endDate);
                    var billField = curRec.getField({
                        fieldId: 'custpage_billorder'
                    });
                    billField.removeSelectOption({
                        value: null,
                    });
                    billData.forEach(function(value) {
                        billField.insertSelectOption({
                            value: value.value,
                            text: value.text
                        })
                    });
                    //对账单列表
                    let dzdData = app.searchDzd(vendorId);
                    var dzdField = curRec.getField({
                        fieldId: 'custpage_dzd'
                    });
                    dzdField.removeSelectOption({
                        value: null,
                    });
                    dzdData.forEach(function(value) {
                        dzdField.insertSelectOption({
                            value: value.value,
                            text: value.text
                        })
                    });
                } else {

                    var purField = curRec.getField({
                        fieldId: 'custpage_poreqorder'
                    });
                    purField.removeSelectOption({
                        value: null,
                    });


                    var billField = curRec.getField({
                        fieldId: 'custpage_billorder'
                    });
                    billField.removeSelectOption({
                        value: null,
                    });

                    var dzdField = curRec.getField({
                        fieldId: 'custpage_dzd'
                    });
                    dzdField.removeSelectOption({
                        value: null,
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

            if (fieldId == "custpage_vendor") {//custpage_account
                // window.location.reload();
                // var vedor = curRec.getValue({
                //     fieldId: 'custpage_vendor'
                // });

                // if (vedor) {
                //     var vendorRec = record.load({
                //         type: 'vendor',
                //         id: vedor
                //     });
                //     var terms = vendorRec.getValue({fieldId: 'custentity_swc_payment_terms'});
                //     var accountArr = vendorRec.getValue({fieldId: 'custentity_swc_vendor_banknumber'});

                // console.log('terms',terms);
                // if (terms) {
                //     curRec.setValue({
                //         fieldId: 'custpage_terms',
                //         value: terms
                //     });
                // }
                // if (accountArr.length > 0) {
                //     console.log('accountArr',accountArr);
                //     var accountData = [];
                //     if (typeof accountArr === 'string' && accountArr.trim() !== '') {
                //         var ids = accountArr.split(',').map(function(id) {
                //             return id.trim();
                //         }).filter(function(id) {
                //             return id !== '';
                //         });
                //
                //         ids.forEach(function(id) {
                //             accountData.push(id);
                //         });
                //     } else if (Array.isArray(accountArr)) {
                //         accountArr.forEach(function(item) {
                //             accountData.push(item);
                //         });
                //     } else if (accountArr != null) {
                //         accountData.push(accountArr);
                //     }
                //
                //     let accountData2 = app.srcAccount(accountData);
                //     console.log('accountData2',accountData2);
                //     var accountField = curRec.getField({
                //         fieldId: 'custpage_account'
                //     });
                //     accountField.removeSelectOption({
                //         value: null,
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
                //         value: accountData2[0]
                //     });
                // }
                // } else {
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
                //         value: '',
                //         text: ''
                //     })
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
            let gcFlag = curRec.getValue({fieldId: "custpage_gc_flag"});

            if (gcFlag) {
                var amountSum = Number(curRec.getValue({
                    fieldId: 'custpage_pre_amount'
                })) || 0;

                console.log('amountSum',amountSum);
                for (let i = 0; i < count; i++) {
                    curRec.selectLine({sublistId, line: i});
                    let checkbox = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_checkbox"});

                    if (checkbox) continue; // 如果已经选中，跳过

                    //如果支付金额为0则跳过
                    var curAmount = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_cur_payment"});
                    if (curAmount == 0) continue;

                    var subsidiary = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_subsidiary_hide"});
                    var vendor = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_vendor_hide"});
                    var orderId = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_order_hide"});
                    var currency = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_currency_hide"});
                    var rate = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_exchange_rate_hide"});
                    // var uniqueKey = subsidiary+ '_' + vendor + '_' + orderId + '_' + estimatedDate + '_' + account;
                    // var uniqueKey = subsidiary+ '_' + vendor + '_' + orderId + '_' + currency + '_' + rate;
                    // var uniqueKey = subsidiary+ '_' + vendor + '_' + currency;
                    var gcKey = subsidiary + '_' + vendor + '_' + currency;




                    var key_line = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_orderline_hide"});

                    // var lineKey = key_line + '_' + key_start + '_' + key_end;
                    var uniqueKey = orderId + '_' + key_line;

                    // 如果已存在，跳过
                    if (selectedObj.hasOwnProperty(uniqueKey)) {
                        continue;
                    }

                    console.log('全选gcKey',gcKey);
                    console.log('全选gcFlag',gcFlag);
                    if (gcKey == gcFlag) {
                        console.log('全选，选中')
                        // 手动构建 lineDataObj（复制自 fieldChanged 逻辑）
                        let lineDataObj = {};
                        //订单类型
                        lineDataObj["type2"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_type_2_hide"});
                        lineDataObj["orderline"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_orderline_hide"});   //订单行号
                        // lineDataObj["subsidiaryId"] = curRec.getCurrentSublistValue(
                        //     {sublistId, fieldId: "custpage_sublist_subsidiary_hide"});   //子公司
                        // lineDataObj["vendorId"] = curRec.getCurrentSublistValue(
                        //     {sublistId, fieldId: "custpage_sublist_vendor_hide"});   //供应商
                        lineDataObj["type"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_order_type_hide"});   //单据类型
                        lineDataObj["dzId"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_statement_hide"});   //对账单
                        lineDataObj["orderId"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_order_hide"});   //订单号
                        lineDataObj["startKey"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_orderkey_start_hide"});   //订单初始唯一键
                        lineDataObj["endKey"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_orderkey_end_hide"});   //订单后续唯一键
                        lineDataObj["item"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_item_code_hide"});   //货品编码
                        lineDataObj["itemName"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_item_name_hide"});   //货品名称
                        lineDataObj["quantity"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_number_hide"});   //订单行数量
                        lineDataObj["rate"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_item_price_hide"});   //未税单价
                        lineDataObj["tax"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_tax_hide"});   //税率
                        // lineDataObj["taxprice"] = curRec.getCurrentSublistValue(
                        //     {sublistId, fieldId: "custpage_sublist_tax_price_hide"});   //含税单价
                        lineDataObj["grossamount"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_all_amount_hide"});   //含税总金额
                        lineDataObj["wholespare"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_whole_allocation_hide"});   //整单预付-分摊
                        lineDataObj["beforearrived"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_before_shipment_amount_hide"});   //发货前预付金额
                        lineDataObj["writeoff"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_prepaid_amount_hide"});   //已预付总金额
                        lineDataObj["pending"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_pending_payment_hide"});   //待支付金额
                        lineDataObj["usedamount"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_already_payment_hide"});   //之前申请金额
                        lineDataObj["curamount"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_cur_payment"});   //本次支付金额
                        // lineDataObj["remainamount"] = curRec.getCurrentSublistValue(
                        //     {sublistId, fieldId: "custpage_sublist_cur_payment"});   //剩余可申请金额
                        // lineDataObj["cashieramount"] = curRec.getCurrentSublistValue(
                        //     {sublistId, fieldId: "custpage_sublist_cur_payment"});   //出纳付款
                        // lineDataObj["paymentlink"] = curRec.getCurrentSublistValue(
                        //     {sublistId, fieldId: "custpage_sublist_cur_payment"});   //明细行付款链接
                        lineDataObj["duedate"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_cur_date_hide"});   //截至日期
                        lineDataObj["memo"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_line_memo"});   //行备注

                        lineDataObj["bhjh"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_demand_line_hide"});   //备货计划

                        //线下对账单
                        lineDataObj["xxdzd"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_xxdzd_hide"});//补充
                        selectedObj[uniqueKey] = lineDataObj;

                        amountSum = amountSum + Number(lineDataObj["curamount"]);

                        // 初始化 uniqueKey 对象如果不存在
                        if (!selectedObj[uniqueKey]) {
                            selectedObj[uniqueKey] = {};
                        }

                        selectedObj[uniqueKey] = lineDataObj;

                        console.log('amountSum2',amountSum);

                        // 设置复选框，但仍然使用 ignoreFieldChange: true 避免重复触发
                        curRec.setCurrentSublistValue({
                            sublistId,
                            fieldId: "custpage_sublist_checkbox",
                            value: true,
                            ignoreFieldChange: true
                        });

                    }
                }

                // 更新已选择数据
                curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});


                curRec.setValue({
                    fieldId: 'custpage_pre_amount',
                    value: MatchTool.fixed(amountSum,2)
                });

                // 可以添加提示信息
                let selectedCount = 0;

                selectedCount = Object.keys(selectedObj).length;

                alert(`已选中 ${selectedCount} 行数据`);
            } else {
                alert('请先选择一行数据，再进行全选操作');
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
            console.log('count',count);
            if (!count) return;

            let selected = curRec.getValue({fieldId: "custpage_selected"});
            let selectedObj = selected ? JSON.parse(selected) : {};

            let gcFlag = curRec.getValue({fieldId: "custpage_gc_flag"});


            let  amountSum = curRec.getValue({
                fieldId: 'custpage_pre_amount',
            })
            for (let i = 0; i < count; i++) {
                curRec.selectLine({sublistId, line: i});

                // 获取唯一键
                // var subsidiary = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_subsidiary_hide"});
                // var vendor = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_vendor_hide"});
                var orderId = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_order_hide"});
                // var uniqueKey = subsidiary + '_' + vendor + '_' + orderId;

                // var key_end = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_orderkey_start_hide"});
                var key_line = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_orderline_hide"});
                // var key_start = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_orderkey_end_hide"});
                var uniqueKey = orderId + '_' + key_line;


                // 从 selectedObj 中删除对应的数据
                if (selectedObj.hasOwnProperty(uniqueKey) ) {
                    var curAmount = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_cur_payment"});   //本次支付金额
                    amountSum = MatchTool.subN(amountSum,curAmount);
                    delete selectedObj[uniqueKey];
                }

                // 设置复选框为未选中
                curRec.setCurrentSublistValue({
                    sublistId,
                    fieldId: "custpage_sublist_checkbox",
                    value: false,
                    ignoreFieldChange: true
                });
            }

            amountSum = MatchTool.fixed(amountSum,2);
            console.log('selectedObj',selectedObj);
            curRec.setValue({
                fieldId: 'custpage_pre_amount',
                value: amountSum
            });
            // 更新已选择数据
            curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});

            console.log('selectedObj.keys.length2',Object.keys(selectedObj).length);
            if (gcFlag && Object.keys(selectedObj).length == 0) {
                curRec.setValue({fieldId: "custpage_gc_flag",value: ''});
            }

            alert("已取消全选");
        }

        /**
         * 预付款平台【提交】按钮执行函数
         */
        async function createOrder() {
            // 弹出弹框
            var options = {
                title: "提醒",
                message: "确定生成付款申请"
            };

            // 使用 Promise 包装弹窗确认逻辑
            try {
                const result = await dialog.confirm(options);

                // 用户点击了确定
                if (result) {
                    console.log("用户确认提交");

                    let curRec = currentRecord.get();
                    let selected = curRec.getValue({fieldId: "custpage_selected"});
                    let selectedObj = selected ? JSON.parse(selected) : {};
                    let dataLength = Object.keys(selectedObj).length;
                    let dataValue = Object.values(selectedObj);//已勾选的数据
                    console.log('dataLength',dataLength);
                    console.log('dataValue',dataValue);
                    console.log('selectedObj',selectedObj);
                    console.log('dataValue',dataValue[0]);

                    //基本信息
                    //预付款日期
                    let preDate  = curRec.getText({fieldId: "custpage_pre_date"});
                    //备注
                    let memo  = curRec.getValue({fieldId: "custpage_memo"});
                    let gcFlag  = curRec.getValue({fieldId: "custpage_gc_flag"});
                    let amountSum  = curRec.getValue({fieldId: "custpage_pre_amount"});
                    let account  = curRec.getValue({fieldId: "custpage_account"});
                    let terms  = curRec.getValue({fieldId: "custpage_terms"});
                    let sub = gcFlag.split("_")[0];
                    let vendor = gcFlag.split("_")[1];
                    let currency = gcFlag.split("_")[2];
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
                    if (!preDate) {
                        alert("预付款日期不能为空");
                        return;
                    }
                    if (!bussiness) {
                        alert("提出部门不能为空");
                        return;
                    }

                    let poData = {};
                    poData["subsidiary"] = sub; //子公司
                    poData["vendor"] = vendor; //客户
                    poData["preDate"] = preDate;
                    poData["currency"] = currency;//货币
                    poData["memo"] = memo;//备注
                    poData["amountsum"] = amountSum;//备注
                    poData["account"] = account;//付款条件
                    poData["terms"] = terms;//银行科目
                    poData["bussiness"] = bussiness;//银行科目

                    poData["lineData"] = [];
                    for (let i in dataValue) {
                        var obj = dataValue[i];
                        console.log('obj',obj);
                        poData["lineData"].push(obj);
                    }

                    if (poData["lineData"].length <= 0) {
                        alert("无勾选数据");
                    } else {

                        // 显示弹窗
                        let timeoutblockerDiv = document.getElementById("timeoutblocker");
                        timeoutblockerDiv.style.display = "block";
                        let startDate = new Date().getTime();
                        let reqUrl = url.resolveScript({
                            scriptId: "customscript_swc_sl_paymentplatform",
                            deploymentId: "customdeploy_swc_sl_paymentplatform",
                            params: {
                                flag: SUBMIST_STATUS, // 区分创建付款申请单
                            }
                        });

                        let createPoResult = await https.post.promise({
                            url: reqUrl,
                            body: {
                                "adData": JSON.stringify(poData),
                            }
                        });
                        let data = createPoResult.body && JSON.parse(createPoResult.body);
                        console.log('接口1返回数据', data);

                        let poEndDate = new Date().getTime();
                        console.log("执行时间", ((poEndDate - startDate) / 1000) + "秒")

                        if (data.code == 200) {
                            // 开始轮询任务状态
                            pollTaskStatus(data.data.taskId);
                        }
                        if (data.code == 500) {
                            alert(data["msg"]);
                            let endDate = new Date().getTime();
                            console.log("共计执行时间", ((endDate - startDate) / 1000) + "秒")
                            window.onbeforeunload = null;
                            window.location.reload();
                        }
                    }
                } else {
                    // 用户点击了取消
                    console.log("用户取消提交");
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
                    scriptId: "customscript_swc_sl_paymentplatform",
                    deploymentId: "customdeploy_swc_sl_paymentplatform",
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
                            id: 2//后续需调整
                        });
                        var error = errorRec.getValue({fieldId: 'custrecord_swc_script_error_message'});

                        if (error) {
                            // errorRec.setValue({fieldId: 'custrecord_swc_script_error_message',value: ''});
                            // errorRec.save();
                            clearInterval(poll);
                            alert(`付款申请单生成失败,请联系管理员: ${error}`);
                            document.getElementById('timeoutblocker').style.display = 'none';
                            // 刷新页面或跳转
                            window.onbeforeunload = null;
                            window.location.reload();
                        } else {

                            clearInterval(poll);
                            alert("付款申请单生成成功！");
                            document.getElementById('timeoutblocker').style.display = 'none';
                            // 刷新页面或跳转
                            // 刷新页面或跳转
                            var newId = app.getNewOrder();
                            console.log('newId',newId);
                            let orderUrl = url.resolveRecord({
                                recordType: "customrecord_swc_payment_application",
                                recordId: newId,
                                isEditMode: false
                            });
                            window.onbeforeunload = null;
                            window.open(orderUrl);
                            window.location.reload();
                        }

                    } else if (status === "FAILED") {
                        clearInterval(poll);
                        alert("任务执行失败：" + data.data.error);
                        document.getElementById('timeoutblocker').style.display = 'none';
                    }
                    // 其他状态（PENDING, PROCESSING）继续轮询
                }
            }, checkInterval);
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