/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
const SUBMIST_STATUS = "1";
const PAGE_SIZE = 500;// 子列表页面大小
const SUBMIST_STATUS_2 = "2";
define(["N/ui/serverWidget","N/runtime","N/record",'N/task',"../common/SWC_Translate","../APP/SWC_APP_HeardPayPlatform"],

    (serverWidget,runtime,record,task,SWC_Translate,app) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            var request = scriptContext.request;
            var response = scriptContext.response;
            var parameters = request.parameters;
            var method = request.method;

            var result = {code: 200, data: {}, msg: "执行成功"};
            app.initParams(parameters, method);
            log.audit("method", method)

            if (parameters["flag"] == SUBMIST_STATUS) {
                try {
                    //生成客户对账单
                    log.audit("生成客户对账单");
                    let adData = JSON.parse(parameters["poData"]);
                    log.audit('生成客户对账单 数据',adData);
                    var taskId = createReconciliation(adData);
                    // result["data"] = poId;
                    result["code"] = 200;
                    result["data"].taskId = taskId;
                    log.audit('result',result);
                } catch (e) {
                    log.audit({title: 'e', details: e});
                    result["code"] = 500;
                    result["msg"] = e.message;
                }
                log.audit('result',result);
                response.write(JSON.stringify(result));
            } else if (parameters["flag"] == SUBMIST_STATUS_2) {
                let adData2 = JSON.parse(parameters["adData"]);
                let taskId = adData2.taskId;
                var summary = task.checkStatus(taskId);
                log.audit('summary',summary);
                result["code"] = 200;
                result.data.status = summary.status;
                log.audit('result',result);
                response.write(JSON.stringify(result));
            } else {
                // 创建表单
                var form = crtForm();
                // 创建单据头字段、赋值、默认值
                crtBodyFields({
                    form: form,
                    parameters: parameters
                });

                //检索画面表示数据：{"pageId":1,"pageSize":50,"pagedData":[],"dataCount":100}
                var data = app.getData({
                    method: method,
                    parameters: parameters,
                    pageSize: PAGE_SIZE
                });
                // log.audit('data', data);
                // var data = {"pageId":1,"pageSize":50,"pagedData":[],"dataCount":PAGE_SIZE};
                //明细行子列表（明细）
                crtSublistDtl({
                    form: form,
                    data: data,
                    parameters: parameters
                });

                response.writePage({
                    pageObject: form
                });
            }
        }

        /**
         * 创建表单
         * @return {Form} 表单对象
         */
        function crtForm() {
            // 创建表单对象
            var form = serverWidget.createForm({title: "综合付款申请平台"});
            // 设置客户端脚本
            form.clientScriptModulePath = "../CS/SWC_CS_HeardPayPlatform";
            // 提交按钮设置为刷新
            form.addSubmitButton({
                label: "查询",
            });
            form.addButton({
                id: "custpage_submit_btn",
                label: "提交",
                functionName: "createOrder"
            });
            return form;
        }

        /**
         * 创建单据头字段
         * @param {Object} options
         * @param {Form} options.form 表单对象
         * @param {Object} options.parameters http请求参数
         */
        function crtBodyFields(options) {
            var form = options.form;
            var parameters = options.parameters;

            form.addFieldGroup({
                id: "custpage_group_srch_cond",
                label: SWC_Translate.translate("筛选器"),
                tab: "",
                isCollapsible: true,
            });
            form.addFieldGroup({
                id: "custpage_group_data_cond",
                label: SWC_Translate.translate("基础信息"),
                tab: "",
                isCollapsible: true,
            });


            // 屏幕遮罩
            var hidden_field = form.addField(
                {id: 'hidden_info', type: serverWidget.FieldType.INLINEHTML, label: '屏幕遮罩'});
            hidden_field.defaultValue = '<div id="timeoutblocker" style="position: fixed; z-index: 10000; top: 0px; left: 0px; height: 100%; width: 100%; margin: 5px 0px; background-color: rgb(155, 155, 155); opacity: 0.6;"><span style="width:100%;height:100%;line-height:700px;text-align:center;display:block;font-weight: bold; color: red;font-size:20px">' +
                "数据处理中，请稍后" + '</span></div>';
            var userId = runtime.getCurrentUser().id;

            //提出部门
            // var bussinessField = form.addField({
            //     id: "custpage_bussiness",
            //     type: serverWidget.FieldType.SELECT,
            //     label: SWC_Translate.translate("提出部门"),
            //     source: 'customlist_swc_pay_departments',
            //     container: 'custpage_group_srch_cond',
            // });
            // var bussinessData = app.searchBussiness();
            // bussinessField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            // bussinessData.forEach(function (value) {
            //     bussinessField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });

            //订单类型
            var typeField = form.addField({
                id: "custpage_type",
                type: serverWidget.FieldType.MULTISELECT,
                label: SWC_Translate.translate("订单类型 *"),
                source: 'customlist_swc_po_type',
                container: 'custpage_group_srch_cond',
            });

            // 线下对账单号
            var xxdzdField = form.addField({
                id: "custpage_xxdzd",
                type: serverWidget.FieldType.TEXT,
                label: SWC_Translate.translate("线下对账单号"),
                container: 'custpage_group_srch_cond',
            });

            //子公司
            var subsidiaryId = parameters["custpage_subsidiary"];
            var subsidiaryField = form.addField({
                id: "custpage_subsidiary",
                type: serverWidget.FieldType.SELECT,
                label: SWC_Translate.translate("子公司"),
                source: 'subsidiary',
                container: 'custpage_group_srch_cond',
            });
            // log.audit('子公司');
            // var subsidiaryData = app.searchSubsidiary();
            // log.audit('subsidiaryData',subsidiaryData);
            // subsidiaryField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            // subsidiaryData.forEach(function (value) {
            //     subsidiaryField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });

            //货币
            var currencyField = form.addField({
                id: "custpage_currency",
                type: serverWidget.FieldType.SELECT,
                label: SWC_Translate.translate("货币"),
                source: 'currency',
                container: 'custpage_group_srch_cond',
            });
            // var currencyData = app.searchCurrency();
            // log.audit('currencyData',currencyData);
            // currencyField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            // currencyData.forEach(function (value) {
            //     currencyField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });

            //供应商
            var customerField = form.addField({
                id: "custpage_vendor",
                type: serverWidget.FieldType.SELECT,
                label: SWC_Translate.translate("供应商 *"),
                source: 'vendor',
                container: 'custpage_group_srch_cond',
            });

            // var vendorData = app.searchVendor();
            // customerField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            // vendorData.forEach(function(value) {
            //     customerField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });

            //单据日期
            // form.addField({
            //     id: "custpage_start_date",
            //     type: serverWidget.FieldType.DATE,
            //     label: SWC_Translate.translate("单据日期"),
            //     container: 'custpage_group_srch_cond',
            // });

            // //工厂
            // var lsVendorField = form.addField({
            //     id: "custpage_ls_vendor",
            //     type: serverWidget.FieldType.SELECT,
            //     label: SWC_Translate.translate("工厂"),
            //     container: 'custpage_group_srch_cond',
            // });
            // lsVendorField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            // vendorData.forEach(function(value) {
            //     lsVendorField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });

            // 物流发运单号
            // var lsOrderField = form.addField({
            //     id: "custpage_ls_order_number",
            //     type: serverWidget.FieldType.MULTISELECT,
            //     label: SWC_Translate.translate("物流发运单号"),
            //     container: 'custpage_group_srch_cond',
            // });
            // var lsObj = app.searchLSOrder();
            // var lsOrderData = lsObj.oArr;
            // // lsOrderField.addSelectOption({
            // //     value: "",
            // //     text: ""
            // // });
            // lsOrderData.forEach(function(value) {
            //     lsOrderField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });
            //
            // //集装箱箱号
            // var containerField = form.addField({
            //     id: "custpage_ls_container_number",
            //     type: serverWidget.FieldType.MULTISELECT,
            //     label: SWC_Translate.translate("集装箱箱号"),
            //     container: 'custpage_group_srch_cond',
            // });
            // var lsContainerData = lsObj.cArr;
            // // containerField.addSelectOption({
            // //     value: "",
            // //     text: ""
            // // });
            // lsContainerData.forEach(function(value) {
            //     containerField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });

            //费用类型
            var feeTypeField = form.addField({
                id: "custpage_fee_type",
                type: serverWidget.FieldType.MULTISELECT,
                label: SWC_Translate.translate("费用类型"),
                container: 'custpage_group_srch_cond',
            });
            var feeTypeData = app.searchItem();
            // feeTypeField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            feeTypeData.forEach(function(value) {
                feeTypeField.addSelectOption({
                    value: value.value,
                    text: value.text
                })
            });

            let dzdField = form.addField({
                id: "custpage_dzd",
                type: serverWidget.FieldType.MULTISELECT,
                label: "对账单",
                container: 'custpage_group_srch_cond',
            });


            var dzdOrd = [];
            if (parameters["custpage_vendor"]) {
                dzdOrd = app.searchDzd(parameters["custpage_vendor"]);
            }
            // var dzdOrd = app.searchDzd();
            dzdOrd.forEach(function (value) {
                dzdField.addSelectOption({
                    value: value.value,
                    text: value.text
                })
            });

            // //预计进港时间
            // form.addField({
            //     id: "custpage_ls_preta",
            //     type: serverWidget.FieldType.DATE,
            //     label: SWC_Translate.translate("预计进港时间"),
            //     container: 'custpage_group_srch_cond',
            // });
            //
            // //到港时间
            // form.addField({
            //     id: "custpage_ls_eta",
            //     type: serverWidget.FieldType.DATE,
            //     label: SWC_Translate.translate("到港时间"),
            //     container: 'custpage_group_srch_cond',
            // });
            //
            // //到仓时间
            // form.addField({
            //     id: "custpage_ls_wat",
            //     type: serverWidget.FieldType.DATE,
            //     label: SWC_Translate.translate("到仓时间"),
            //     container: 'custpage_group_srch_cond',
            // });

            //基础信息
            //提出部门
            var bussinessField = form.addField({
                id: "custpage_bussiness",
                type: serverWidget.FieldType.SELECT,
                label: SWC_Translate.translate("提出部门 *"),
                source: 'customlist_swc_pay_departments',
                container: 'custpage_group_data_cond',
            });
            //对账日期
            form.addField({
                id: "custpage_reconciliation_date",
                type: serverWidget.FieldType.DATE,
                label: SWC_Translate.translate("预计付款日期 *"),
                container: 'custpage_group_data_cond',
            });
            //备注
            form.addField({
                id: "custpage_main_memo",
                type: serverWidget.FieldType.TEXT,
                label: SWC_Translate.translate("备注"),
                container: 'custpage_group_data_cond',
            });
            //对账总金额
            var recAmountField = form.addField({
                id: "custpage_reconciliation_amount_total",
                type: serverWidget.FieldType.TEXT,
                label: SWC_Translate.translate("付款总金额"),
                container: 'custpage_group_data_cond',
            });
            recAmountField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED,
            });

            //应付总金额
            // var payableAmountField = form.addField({
            //     id: "custpage_payable_amount_total",
            //     type: serverWidget.FieldType.TEXT,
            //     label: SWC_Translate.translate("应付总金额"),
            //     container: 'custpage_group_data_cond',
            // });
            // payableAmountField.updateDisplayType({
            //     displayType: serverWidget.FieldDisplayType.DISABLED,
            // });

            //银行账户
            var accountField = form.addField({
                id: "custpage_account",
                type: serverWidget.FieldType.SELECT,
                label: '银行账户 *',
                container: 'custpage_group_data_cond',
            });
            var accountData = [];
            if (parameters["custpage_vendor"]) {
                accountData = app.searchBillAccount(parameters["custpage_vendor"]);

                log.audit('accountData测试',accountData);
                if (accountData.length > 0) {
                    var accountObj = app.srcAccount(accountData);
                    accountField.addSelectOption({
                        value: "",
                        text: ""
                    });
                    accountObj.forEach(function (value) {
                        accountField.addSelectOption({
                            value: value.value,
                            text: value.text
                        })
                    });
                }
            }

            //付款条件
            var termsField = form.addField({
                id: "custpage_terms",
                type: serverWidget.FieldType.SELECT,
                label: '付款条件 *',
                container: 'custpage_group_data_cond',
            });
            var termsData = [];

            if (parameters["custpage_vendor"]) {
                termsData = app.searchBillTerms(parameters["custpage_vendor"]);

                if (termsData.length > 0) {
                    var termsObj = app.searchTerms(termsData);
                    termsField.addSelectOption({
                        value: "",
                        text: ""
                    });
                    termsObj.forEach(function (value) {
                        termsField.addSelectOption({
                            value: value.value,
                            text: value.text
                        })
                    });
                }
            }

            // 已选择数据   ---跨页提交用
            var selectedField = form.addField({
                id: "custpage_selected",
                type: serverWidget.FieldType.LONGTEXT,
                label: "已选择数据",
                container: 'custpage_group_srch_cond'
            });
            selectedField.maxLength = 100000000;
            // 隐藏字段
            selectedField.updateDisplayType({displayType: "HIDDEN"});
            // 提交区分：点击查询按钮 清空已选择数据（"T"的场合，清空已选择数据） ---跨页提交用
            var commitFlagField = form.addField({
                id: "custpage_commit_flag",
                type: serverWidget.FieldType.CHECKBOX,
                label: "已选择数据",
                container: 'custpage_group_srch_cond'
            });
            // 隐藏字段
            commitFlagField.updateDisplayType({displayType: "HIDDEN"});
            // 生成条件检测
            var gcFlagField = form.addField({
                id: "custpage_gc_flag",
                type: serverWidget.FieldType.TEXT,
                label: "合并生成单据条件",
                container: 'custpage_group_srch_cond'
            });
            // gcFlagField.updateDisplayType({displayType: "HIDDEN"});

            log.audit('parameters',parameters);
            //回显
            form.updateDefaultValues({
                //查询条件
                custpage_subsidiary: parameters["custpage_subsidiary"],
                custpage_vendor: parameters["custpage_vendor"],
                custpage_currency: parameters["custpage_currency"],
                custpage_start_date: parameters["custpage_start_date"],
                custpage_ls_order_number: parameters["custpage_ls_order_number"],
                custpage_fee_type: parameters["custpage_fee_type"],
                custpage_ls_preta: parameters["custpage_ls_preta"],
                custpage_ls_eta: parameters["custpage_ls_eta"],
                custpage_ls_wat: parameters["custpage_ls_wat"],
                custpage_ls_container_number: parameters["custpage_ls_container_number"],
                custpage_ls_vendor: parameters["custpage_ls_vendor"],
                custpage_bussiness: parameters["custpage_bussiness"],
                custpage_xxdzd: parameters["custpage_xxdzd"],
                custpage_type: parameters["custpage_type"],
                custpage_dzd: parameters["custpage_dzd"],
                //基础信息
                custpage_reconciliation_date: parameters["custpage_reconciliation_date"],
                custpage_main_memo: parameters["custpage_main_memo"],
                custpage_reconciliation_amount_total: parameters["custpage_reconciliation_amount_total"],
                custpage_payable_amount_total: parameters["custpage_payable_amount_total"],
                custpage_account: parameters["custpage_account"],
                custpage_terms: parameters["custpage_terms"],

                custpage_gc_flag:  parameters["custpage_gc_flag"],

                custpage_selected: parameters["custpage_selected"], // 已选择数据
            });

        }

        /**
         * 创建明细行子列表
         * @param {Object} options
         * @param {Form} options.form 表单对象
         * @param {Object} options.data 分页数据：{"pageId":1,"pageSize":100,"pagedData":[],"dataCount":0}
         * @param {Object} options.parameters
         */
        function crtSublistDtl(options) {
            var form = options.form;
            var data = options.data;
            var parameters = options.parameters;
            var sublistName = "结果列：共" + data["dataCount"] + "条";
            var sublist = form.addSublist({
                id: "custpage_sublist_detail",
                label: sublistName,
                type: serverWidget.SublistType["LIST"]
            });
            // 全选、取消全选
            sublist.addButton({
                id: 'custpage_sublist_btn_selectall',
                label: "全选",
                functionName: "selectAll"
            });
            sublist.addButton({
                id: 'custpage_sublist_btn_deselectall',
                label: "取消全选",
                functionName: "deselectAll"
            });
            // 分页相关
            var pagedIndex = data["pageId"];
            var pagedNum = data["pageSize"] || PAGE_SIZE;
            var pagedTotal = data["dataCount"] || 0;
            var pagedIdxField = form.addField({
                id: 'custpage_paged_index_detail',
                label: 'PAGED_INDEX_DETAIL',
                type: serverWidget.FieldType.INTEGER,
            });
            pagedIdxField.defaultValue = pagedIndex;
            pagedIdxField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN,
            });
            if (pagedTotal > 0) {
                sublist.helpText =
                    '<div style="text-align:left;">' +
                    app.getPagedSelect("detail", pagedIndex, pagedTotal, pagedNum) +
                    '</div>';
            }
            sublist.addField(
                {id: 'custpage_sublist_checkbox', type: 'checkbox', label: "选择"});
            sublist.addField({
                id: 'custpage_sublist_index',
                type: "TEXT",
                label: '<span style="color: #c77f02;">*  </span>' + "序号"
            });
            sublist.addField({id: 'custpage_sublist_indextext', type: "TEXT", label: "序号"}).
                updateDisplayType({displayType: 'hidden'});


            //订单类型
            sublist.addField({id: 'custpage_sublist_type_2', type: 'SELECT',source: 'customlist_swc_po_type', label: SWC_Translate.translate("订单类型")}).updateDisplayType({displayType: 'disabled'});
            sublist.addField({id: 'custpage_sublist_type_2_hide', type: 'SELECT',source: 'customlist_swc_po_type', label: SWC_Translate.translate("订单类型")}).updateDisplayType({displayType: 'hidden'});
            //采购订单ID
            sublist.addField({id: 'custpage_sublist_cgdd',type: 'TEXT', label: SWC_Translate.translate("采购订单ID")})
            sublist.addField({id: 'custpage_sublist_cgdd_hide', type: 'TEXT', label: SWC_Translate.translate("采购订单ID")}).updateDisplayType({displayType: 'hidden'});
            //对账单ID
            sublist.addField({id: 'custpage_sublist_dzd',type: 'TEXT', label: SWC_Translate.translate("对账单ID")})
            sublist.addField({id: 'custpage_sublist_dzd_hide', type: 'TEXT', label: SWC_Translate.translate("对账单ID")}).updateDisplayType({displayType: 'hidden'});
            //单据ID
            sublist.addField({id: 'custpage_sublist_documentid',type: 'TEXT', label: SWC_Translate.translate("单据ID")})
            sublist.addField({id: 'custpage_sublist_documentid_hide', type: 'TEXT', label: SWC_Translate.translate("单据ID")}).updateDisplayType({displayType: 'hidden'});
            //行ID
            sublist.addField({id: 'custpage_sublist_lineid', type: 'TEXT', label: SWC_Translate.translate("行ID")})
            sublist.addField({id: 'custpage_sublist_lineid_hide', type: 'TEXT', label: SWC_Translate.translate("行ID")}).updateDisplayType({displayType: 'hidden'});
            //线下对账单号
            sublist.addField({id: 'custpage_sublist_xxdzd', type: 'TEXT', label: SWC_Translate.translate("线下对账单号")})
            sublist.addField({id: 'custpage_sublist_xxdzd_hide', type: 'TEXT', label: SWC_Translate.translate("线下对账单号")}).updateDisplayType({displayType: 'hidden'});
            //子公司
            sublist.addField({id: 'custpage_sublist_subsidiary', type: 'TEXT', label: SWC_Translate.translate("子公司")})
            sublist.addField({id: 'custpage_sublist_subsidiary_hide', type: 'TEXT', label: SWC_Translate.translate("子公司")}).updateDisplayType({displayType: 'hidden'});
            // //工厂
            // sublist.addField({id: 'custpage_sublist_ls_vendor', type: 'TEXT', label: SWC_Translate.translate("工厂")})
            // sublist.addField({id: 'custpage_sublist_ls_vendor_hide', type: 'TEXT', label: SWC_Translate.translate("工厂")}).updateDisplayType({displayType: 'hidden'});
            //供应商
            sublist.addField({id: 'custpage_sublist_vendor', type: 'TEXT', label: SWC_Translate.translate("供应商")})
            sublist.addField({id: 'custpage_sublist_vendor_hide', type: 'TEXT', label: SWC_Translate.translate("供应商")}).updateDisplayType({displayType: 'hidden'});
            //货币
            sublist.addField({id: 'custpage_sublist_currency', type: 'TEXT', label: SWC_Translate.translate("货币")})
            sublist.addField({id: 'custpage_sublist_currency_hide', type: 'TEXT', label: SWC_Translate.translate("货币")}).updateDisplayType({displayType: 'hidden'});
            //汇率
            sublist.addField({id: 'custpage_sublist_tax', type: 'TEXT', label: SWC_Translate.translate("汇率")})
            sublist.addField({id: 'custpage_sublist_tax_hide', type: 'TEXT', label: SWC_Translate.translate("汇率")}).updateDisplayType({displayType: 'hidden'});
            // //日期
            // sublist.addField({id: 'custpage_sublist_date', type: 'DATE', label: SWC_Translate.translate("单据日期")})
            // sublist.addField({id: 'custpage_sublist_date_hide', type: 'DATE', label: SWC_Translate.translate("单据日期")}).updateDisplayType({displayType: 'hidden'});
            // //类型
            // sublist.addField({id: 'custpage_sublist_type', type: 'TEXT', label: SWC_Translate.translate("单据类型")})
            sublist.addField({id: 'custpage_sublist_type_hide', type: 'TEXT', label: SWC_Translate.translate("单据类型")}).updateDisplayType({displayType: 'hidden'});

            //单据号
            sublist.addField({id: 'custpage_sublist_invoice_number', type: 'TEXT', label: SWC_Translate.translate("单据号")})
            sublist.addField({id: 'custpage_sublist_invoice_number_hide', type: 'TEXT', label: SWC_Translate.translate("单据号")}).updateDisplayType({displayType: 'hidden'});
            //费用类型
            sublist.addField({id: 'custpage_swc_fee_type', type: 'TEXT', label: SWC_Translate.translate("费用类型")})
            sublist.addField({id: 'custpage_swc_fee_type_hide', type: 'TEXT', label: SWC_Translate.translate("费用类型")}).updateDisplayType({displayType: 'hidden'});
            sublist.addField({id: 'custpage_swc_fee_type_hide2', type: 'TEXT', label: SWC_Translate.translate("费用类型2")}).updateDisplayType({displayType: 'hidden'});
            //含税总额
            sublist.addField({id: 'custpage_sublist_amount_sum', type: 'CURRENCY', label: SWC_Translate.translate("含税总额")})
            sublist.addField({id: 'custpage_sublist_amount_sum_hide', type: 'CURRENCY', label: SWC_Translate.translate("含税总额")}).updateDisplayType({displayType: 'hidden'});
            //物流发运单号
            sublist.addField({id: 'custpage_swc_wl_id', type: 'TEXT', label: SWC_Translate.translate("物流发运单号")})
            sublist.addField({id: 'custpage_swc_wl_id_hide', type: 'TEXT', label: SWC_Translate.translate("物流发运单号")}).updateDisplayType({displayType: 'hidden'});
            //起运港
            sublist.addField({id: 'custpage_swc_wl_rm_sta_gk', type: 'TEXT', label: SWC_Translate.translate("起运港")})
            sublist.addField({id: 'custpage_swc_wl_rm_sta_gk_hide', type: 'TEXT', label: SWC_Translate.translate("起运港")}).updateDisplayType({displayType: 'hidden'});
            //目的港
            sublist.addField({id: 'custpage_swc_wl_md_lc', type: 'TEXT', label: SWC_Translate.translate("目的港")})
            sublist.addField({id: 'custpage_swc_wl_md_lc_hide', type: 'TEXT', label: SWC_Translate.translate("目的港")}).updateDisplayType({displayType: 'hidden'});
            //装柜日期
            sublist.addField({id: 'custpage_swc_wl_loading_date', type: 'DATE', label: SWC_Translate.translate("装柜日期")})
            sublist.addField({id: 'custpage_swc_wl_loading_date_hide', type: 'DATE', label: SWC_Translate.translate("装柜日期")}).updateDisplayType({displayType: 'hidden'});
            //预计进港时间
            sublist.addField({id: 'custpage_swc_wl_no', type: 'DATE', label: SWC_Translate.translate("预计进港时间")})
            sublist.addField({id: 'custpage_swc_wl_no_hide', type: 'DATE', label: SWC_Translate.translate("预计进港时间")}).updateDisplayType({displayType: 'hidden'});
            //到港时间
            sublist.addField({id: 'custpage_swc_wl_etd', type: 'DATE', label: SWC_Translate.translate("到港时间")})
            sublist.addField({id: 'custpage_swc_wl_etd_hide', type: 'DATE', label: SWC_Translate.translate("到港时间")}).updateDisplayType({displayType: 'hidden'});
            //出港待送货时间
            sublist.addField({id: 'custpage_swc_gate_out_time_for', type: 'DATE', label: SWC_Translate.translate("出港待送货时间")})
            sublist.addField({id: 'custpage_swc_gate_out_time_for_hide', type: 'DATE', label: SWC_Translate.translate("出港待送货时间")}).updateDisplayType({displayType: 'hidden'});
            //还柜时间
            sublist.addField({id: 'custpage_swc_wl_return_time', type: 'DATE', label: SWC_Translate.translate("还柜时间")})
            sublist.addField({id: 'custpage_swc_wl_return_time_hide', type: 'DATE', label: SWC_Translate.translate("还柜时间")}).updateDisplayType({displayType: 'hidden'});
            //SPO号
            sublist.addField({id: 'custpage_swc_wl_spo', type: 'TEXT', label: SWC_Translate.translate("SPO号")})
            sublist.addField({id: 'custpage_swc_wl_spo_hide', type: 'TEXT', label: SWC_Translate.translate("SPO号")}).updateDisplayType({displayType: 'hidden'});
            //柜号
            sublist.addField({id: 'custpage_swc_wl_container_number', type: 'TEXT', label: SWC_Translate.translate("柜号")})
            sublist.addField({id: 'custpage_swc_wl_container_number_hide', type: 'TEXT', label: SWC_Translate.translate("柜号")}).updateDisplayType({displayType: 'hidden'});
            //总体积
            sublist.addField({id: 'custpage_swc_wl_total_volume', type: 'FLOAT', label: SWC_Translate.translate("总体积")})
            sublist.addField({id: 'custpage_swc_wl_total_volume_hide', type: 'FLOAT', label: SWC_Translate.translate("总体积")}).updateDisplayType({displayType: 'hidden'});
            //合约柜/非合约柜
            sublist.addField({id: 'custpage_swc_contract_cabinet1', type: 'TEXT', label: SWC_Translate.translate("合约柜/非合约柜")})
            sublist.addField({id: 'custpage_swc_contract_cabinet1_hide', type: 'TEXT', label: SWC_Translate.translate("合约柜/非合约柜")}).updateDisplayType({displayType: 'hidden'});
            //全链路/到港
            sublist.addField({id: 'custpage_swc_fy_full_link', type: 'TEXT', label: SWC_Translate.translate("全链路/到港")})
            sublist.addField({id: 'custpage_swc_fy_full_link_hide', type: 'TEXT', label: SWC_Translate.translate("全链路/到港")}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_swc_broker_reference', type: 'TEXT', label: SWC_Translate.translate("Broker Reference")})
            sublist.addField({id: 'custpage_swc_broker_reference_hide', type: 'TEXT', label: SWC_Translate.translate("Broker Reference")}).updateDisplayType({displayType: 'hidden'});
            sublist.addField({id: 'custpage_swc_enter_number', type: 'TEXT', label: SWC_Translate.translate("Entry Number")})
            sublist.addField({id: 'custpage_swc_enter_number_hide', type: 'TEXT', label: SWC_Translate.translate("Entry Number")}).updateDisplayType({displayType: 'hidden'});
            sublist.addField({id: 'custpage_swc_inv_no', type: 'TEXT', label: SWC_Translate.translate("INV NO")})
            sublist.addField({id: 'custpage_swc_inv_no_hide', type: 'TEXT', label: SWC_Translate.translate("INV NO")}).updateDisplayType({displayType: 'hidden'});
            // //数量
            // sublist.addField({id: 'custpage_sublist_sku_number', type: 'FLOAT', label: SWC_Translate.translate("数量")})
            // sublist.addField({id: 'custpage_sublist_sku_number_hide', type: 'FLOAT', label: SWC_Translate.translate("数量")}).updateDisplayType({displayType: 'hidden'});
            // //含税单价
            // sublist.addField({id: 'custpage_sublist_sku_price', type: 'CURRENCY', label: SWC_Translate.translate("含税单价")})
            // sublist.addField({id: 'custpage_sublist_sku_price_hide', type: 'CURRENCY', label: SWC_Translate.translate("含税单价")}).updateDisplayType({displayType: 'hidden'});
            //

            //海外仓入库单号
            sublist.addField({ id: 'custpage_swc_hw_lc_number_dz', type: serverWidget.FieldType.TEXT, label: '海外仓入库单号' }).updateDisplayType({ displayType: 'inline' });
            sublist.addField({ id: 'custpage_swc_hw_lc_number_dz_hide', type: serverWidget.FieldType.TEXT, label: '海外仓入库单号' }).updateDisplayType({ displayType: 'hidden' });
            //总真实发运数量
            sublist.addField({ id: 'custpage_swc_total_shipment_qua', type: serverWidget.FieldType.FLOAT, label: '总真实发运数量' }).updateDisplayType({ displayType: 'inline' });
            sublist.addField({ id: 'custpage_swc_total_shipment_qua_hide', type: serverWidget.FieldType.FLOAT, label: '总真实发运数量' }).updateDisplayType({ displayType: 'hidden' });
            //目的海外仓库代码
            sublist.addField({ id: 'custpage_swc_md_location', type: serverWidget.FieldType.SELECT, source: 'customrecord_swc_overseas_arehouse_code', label: '目的海外仓库代码' }).updateDisplayType({ displayType: 'inline' });
            sublist.addField({ id: 'custpage_swc_md_location_hide', type: serverWidget.FieldType.SELECT, source: 'customrecord_swc_overseas_arehouse_code', label: '目的海外仓库代码' }).updateDisplayType({ displayType: 'hidden' });
            //货柜尺寸
            sublist.addField({ id: 'custpage_swc_wl_zg_size', type: serverWidget.FieldType.SELECT, source: 'customlist_swc_container_size', label: '货柜尺寸' }).updateDisplayType({ displayType: 'inline' });
            sublist.addField({ id: 'custpage_swc_wl_zg_size_hide', type: serverWidget.FieldType.SELECT, source: 'customlist_swc_container_size', label: '货柜尺寸' }).updateDisplayType({ displayType: 'hidden' });
            //调拨费-单据编号
            sublist.addField({ id: 'custpage_swc_document_number', type: serverWidget.FieldType.TEXT, label: '调拨费-单据编号' }).updateDisplayType({ displayType: 'inline' });
            sublist.addField({ id: 'custpage_swc_document_number_hide', type: serverWidget.FieldType.TEXT, label: '调拨费-单据编号' }).updateDisplayType({ displayType: 'hidden' });
            //尾程费用_出库单号
            sublist.addField({ id: 'custpage_swc_lastmile_po', type: serverWidget.FieldType.TEXT, label: '尾程费用_出库单号' }).updateDisplayType({ displayType: 'inline' });
            sublist.addField({ id: 'custpage_swc_lastmile_po_hide', type: serverWidget.FieldType.TEXT, label: '尾程费用_出库单号' }).updateDisplayType({ displayType: 'hidden' });
            //尾程费用_跟踪号
            sublist.addField({ id: 'custpage_swc_lastmile_track', type: serverWidget.FieldType.TEXT, label: '尾程费用_跟踪号' }).updateDisplayType({ displayType: 'inline' });
            sublist.addField({ id: 'custpage_swc_lastmile_track_hide', type: serverWidget.FieldType.TEXT, label: '尾程费用_跟踪号' }).updateDisplayType({ displayType: 'hidden' });
            //尾程费用_实物SKU/仓库SKU
            sublist.addField({ id: 'custpage_swc_lastmile_sku', type: serverWidget.FieldType.SELECT, source: 'item', label: '尾程费用_实物SKU/仓库SKU' }).updateDisplayType({ displayType: 'inline' });
            sublist.addField({ id: 'custpage_swc_lastmile_sku_hide', type: serverWidget.FieldType.SELECT, source: 'item', label: '尾程费用_实物SKU/仓库SKU' }).updateDisplayType({ displayType: 'hidden' });
            //尾程费用_仓库代码
            sublist.addField({ id: 'custpage_swc_lastmile_place', type: serverWidget.FieldType.TEXT, label: '尾程费用_仓库代码' }).updateDisplayType({ displayType: 'inline' });
            sublist.addField({ id: 'custpage_swc_lastmile_place_hide', type: serverWidget.FieldType.TEXT, label: '尾程费用_仓库代码' }).updateDisplayType({ displayType: 'hidden' });
            //尾程费用_SKU数量
            sublist.addField({ id: 'custpage_swc_lastmile_quantity', type: serverWidget.FieldType.FLOAT, label: '尾程费用_SKU数量' }).updateDisplayType({ displayType: 'inline' });
            sublist.addField({ id: 'custpage_swc_lastmile_quantity_hide', type: serverWidget.FieldType.FLOAT, label: '尾程费用_SKU数量' }).updateDisplayType({ displayType: 'hidden' });
            //尾程费用_计费日期
            sublist.addField({ id: 'custpage_swc_lastmile_jfdate', type: serverWidget.FieldType.DATE, label: '尾程费用_计费日期' }).updateDisplayType({ displayType: 'inline' });
            sublist.addField({ id: 'custpage_swc_lastmile_jfdate_hide', type: serverWidget.FieldType.DATE, label: '尾程费用_计费日期' }).updateDisplayType({ displayType: 'hidden' });
            //尾程费用_入库单号/物流子单号
            sublist.addField({ id: 'custpage_swc_lastmile_receipt', type: serverWidget.FieldType.TEXT, label: '尾程费用_入库单号/物流子单号' }).updateDisplayType({ displayType: 'inline' });
            sublist.addField({ id: 'custpage_swc_lastmile_receipt_hide', type: serverWidget.FieldType.TEXT, label: '尾程费用_入库单号/物流子单号' }).updateDisplayType({ displayType: 'hidden' });

            log.audit('data.pagedData',data.pagedData);
            var pagedData = data.pagedData || [
                {
                    index: "1"
                }];

            var totalAmount = 0;
            pagedData.forEach(function(value, index) {
                log.audit('value',value);
                if (value["selected"] && value["selected"] == "T") {
                    sublist.setSublistValue({
                        id: "custpage_sublist_checkbox", // 选择
                        value: "T",
                        line: index,
                    });
                }
                if (value["index"]) sublist.setSublistValue({
                    id: "custpage_sublist_index", // 序号
                    value: value["index"],
                    line: index,
                });
                if (value["index"]) sublist.setSublistValue({
                    id: "custpage_sublist_indextext", // 序号
                    value: value["index"],
                    line: index,
                });
                //订单类型
                if (value["custpage_sublist_type_2"]) sublist.setSublistValue({
                    id: "custpage_sublist_type_2",
                    value: value["custpage_sublist_type_2"],
                    line: index,
                });
                if (value["custpage_sublist_type_2"]) sublist.setSublistValue({
                    id: "custpage_sublist_type_2_hide",
                    value: value["custpage_sublist_type_2"],
                    line: index,
                });
                //采购订单ID
                if (value["custpage_sublist_cgdd"]) sublist.setSublistValue({
                    id: "custpage_sublist_cgdd",
                    value: value["custpage_sublist_cgdd"],
                    line: index,
                });
                if (value["custpage_sublist_cgdd_hide"]) sublist.setSublistValue({
                    id: "custpage_sublist_cgdd_hide",
                    value: value["custpage_sublist_cgdd_hide"],
                    line: index,
                });
                //线下对账单号
                if (value["custpage_sublist_xxdzd"]) sublist.setSublistValue({
                    id: "custpage_sublist_xxdzd",
                    value: value["custpage_sublist_xxdzd"],
                    line: index,
                });
                if (value["custpage_sublist_xxdzd"]) sublist.setSublistValue({
                    id: "custpage_sublist_xxdzd_hide",
                    value: value["custpage_sublist_xxdzd"],
                    line: index,
                });
                //对账单ID
                if (value["custpage_sublist_dzd"]) sublist.setSublistValue({
                    id: "custpage_sublist_dzd",
                    value: value["custpage_sublist_dzd"],
                    line: index,
                });
                if (value["custpage_sublist_dzd_hide"]) sublist.setSublistValue({
                    id: "custpage_sublist_dzd_hide",
                    value: value["custpage_sublist_dzd_hide"],
                    line: index,
                });
                // 单据ID
                if (value["custpage_sublist_documentid"]) sublist.setSublistValue({
                    id: "custpage_sublist_documentid",
                    value: value["custpage_sublist_documentid"],
                    line: index,
                });
                if (value["custpage_sublist_documentid"]) sublist.setSublistValue({
                    id: "custpage_sublist_documentid_hide",
                    value: value["custpage_sublist_documentid"],
                    line: index,
                });
                // 行ID
                if (value["custpage_sublist_lineid"]) sublist.setSublistValue({
                    id: "custpage_sublist_lineid",
                    value: value["custpage_sublist_lineid"],
                    line: index,
                });
                if (value["custpage_sublist_lineid"]) sublist.setSublistValue({
                    id: "custpage_sublist_lineid_hide",
                    value: value["custpage_sublist_lineid"],
                    line: index,
                });

                // 子公司
                if (value["custpage_sublist_subsidiary"]) sublist.setSublistValue({
                    id: "custpage_sublist_subsidiary",
                    value: value["custpage_sublist_subsidiary"],
                    line: index,
                });
                if (value["custpage_sublist_subsidiary_hide"]) sublist.setSublistValue({
                    id: "custpage_sublist_subsidiary_hide",
                    value: value["custpage_sublist_subsidiary_hide"],
                    line: index,
                });

                // 供应商
                if (value["custpage_sublist_vendor"]) sublist.setSublistValue({
                    id: "custpage_sublist_vendor",
                    value: value["custpage_sublist_vendor"],
                    line: index,
                });
                if (value["custpage_sublist_vendor_hide"]) sublist.setSublistValue({
                    id: "custpage_sublist_vendor_hide",
                    value: value["custpage_sublist_vendor_hide"],
                    line: index,
                });

                // 货币
                if (value["custpage_sublist_currency"]) sublist.setSublistValue({
                    id: "custpage_sublist_currency",
                    value: value["custpage_sublist_currency"],
                    line: index,
                });
                if (value["custpage_sublist_currency_hide"]) sublist.setSublistValue({
                    id: "custpage_sublist_currency_hide",
                    value: value["custpage_sublist_currency_hide"],
                    line: index,
                });

                // 汇率
                if (value["custpage_sublist_tax"]) sublist.setSublistValue({
                    id: "custpage_sublist_tax",
                    value: value["custpage_sublist_tax"],
                    line: index,
                });
                if (value["custpage_sublist_tax"]) sublist.setSublistValue({
                    id: "custpage_sublist_tax_hide",
                    value: value["custpage_sublist_tax"],
                    line: index,
                });

                // 单据日期
                if (value["custpage_sublist_date"]) sublist.setSublistValue({
                    id: "custpage_sublist_date",
                    value: value["custpage_sublist_date"],
                    line: index,
                });
                if (value["custpage_sublist_date"]) sublist.setSublistValue({
                    id: "custpage_sublist_date_hide",
                    value: value["custpage_sublist_date"],
                    line: index,
                });

                // 单据类型
                if (value["custpage_sublist_type"]) sublist.setSublistValue({
                    id: "custpage_sublist_type",
                    value: value["custpage_sublist_type"],
                    line: index,
                });
                if (value["custpage_sublist_type_hide"]) sublist.setSublistValue({
                    id: "custpage_sublist_type_hide",
                    value: value["custpage_sublist_type_hide"],
                    line: index,
                });

                // 单据号
                if (value["custpage_sublist_invoice_number"]) sublist.setSublistValue({
                    id: "custpage_sublist_invoice_number",
                    value: value["custpage_sublist_invoice_number"],
                    line: index,
                });
                if (value["custpage_sublist_invoice_number"]) sublist.setSublistValue({
                    id: "custpage_sublist_invoice_number_hide",
                    value: value["custpage_sublist_invoice_number"],
                    line: index,
                });

                //物流发运单号
                if (value["custpage_swc_wl_id"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_id",
                    value: value["custpage_swc_wl_id"],
                    line: index,
                });
                if (value["custpage_swc_wl_id_hide"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_id_hide",
                    value: value["custpage_swc_wl_id_hide"],
                    line: index,
                });

                // 起运港
                if (value["custpage_swc_wl_rm_sta_gk"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_rm_sta_gk",
                    value: value["custpage_swc_wl_rm_sta_gk"],
                    line: index,
                });
                if (value["custpage_swc_wl_rm_sta_gk_hide"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_rm_sta_gk_hide",
                    value: value["custpage_swc_wl_rm_sta_gk_hide"],
                    line: index,
                });

                // 目的港
                if (value["custpage_swc_wl_md_lc"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_md_lc",
                    value: value["custpage_swc_wl_md_lc"],
                    line: index,
                });
                if (value["custpage_swc_wl_md_lc_hide"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_md_lc_hide",
                    value: value["custpage_swc_wl_md_lc_hide"],
                    line: index,
                });

                // 装柜日期
                if (value["custpage_swc_wl_loading_date"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_loading_date",
                    value: value["custpage_swc_wl_loading_date"],
                    line: index,
                });
                if (value["custpage_swc_wl_loading_date"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_loading_date_hide",
                    value: value["custpage_swc_wl_loading_date"],
                    line: index,
                });

                // 预计进港时间
                if (value["custpage_swc_wl_no"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_no",
                    value: value["custpage_swc_wl_no"],
                    line: index,
                });
                if (value["custpage_swc_wl_no"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_no_hide",
                    value: value["custpage_swc_wl_no"],
                    line: index,
                });

                // 到港时间
                if (value["custpage_swc_wl_etd"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_etd",
                    value: value["custpage_swc_wl_etd"],
                    line: index,
                });
                if (value["custpage_swc_wl_etd"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_etd_hide",
                    value: value["custpage_swc_wl_etd"],
                    line: index,
                });

                // 出港待送货时间
                if (value["custpage_swc_gate_out_time_for"]) sublist.setSublistValue({
                    id: "custpage_swc_gate_out_time_for",
                    value: value["custpage_swc_gate_out_time_for"],
                    line: index,
                });
                if (value["custpage_swc_gate_out_time_for"]) sublist.setSublistValue({
                    id: "custpage_swc_gate_out_time_for_hide",
                    value: value["custpage_swc_gate_out_time_for"],
                    line: index,
                });

                // 还柜时间
                if (value["custpage_swc_wl_return_time"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_return_time",
                    value: value["custpage_swc_wl_return_time"],
                    line: index,
                });
                if (value["custpage_swc_wl_return_time"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_return_time_hide",
                    value: value["custpage_swc_wl_return_time"],
                    line: index,
                });

                // SPO号
                if (value["custpage_swc_wl_spo"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_spo",
                    value: value["custpage_swc_wl_spo"],
                    line: index,
                });
                if (value["custpage_swc_wl_spo"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_spo_hide",
                    value: value["custpage_swc_wl_spo"],
                    line: index,
                });

                // 柜号
                if (value["custpage_swc_wl_container_number"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_container_number",
                    value: value["custpage_swc_wl_container_number"],
                    line: index,
                });
                if (value["custpage_swc_wl_container_number"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_container_number_hide",
                    value: value["custpage_swc_wl_container_number"],
                    line: index,
                });

                // 总体积（CBM）
                if (value["custpage_swc_wl_total_volume"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_total_volume",
                    value: value["custpage_swc_wl_total_volume"],
                    line: index,
                });
                if (value["custpage_swc_wl_total_volume"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_total_volume_hide",
                    value: value["custpage_swc_wl_total_volume"],
                    line: index,
                });

                // 合约柜/非合约柜
                if (value["custpage_swc_contract_cabinet1"]) sublist.setSublistValue({
                    id: "custpage_swc_contract_cabinet1",
                    value: value["custpage_swc_contract_cabinet1"],
                    line: index,
                });
                if (value["custpage_swc_contract_cabinet1_hide"]) sublist.setSublistValue({
                    id: "custpage_swc_contract_cabinet1_hide",
                    value: value["custpage_swc_contract_cabinet1_hide"],
                    line: index,
                });

                // 全链路/到港
                if (value["custpage_swc_fy_full_link"]) sublist.setSublistValue({
                    id: "custpage_swc_fy_full_link",
                    value: value["custpage_swc_fy_full_link"],
                    line: index,
                });
                if (value["custpage_swc_fy_full_link_hide"]) sublist.setSublistValue({
                    id: "custpage_swc_fy_full_link_hide",
                    value: value["custpage_swc_fy_full_link_hide"],
                    line: index,
                });

                if (value["custpage_swc_broker_reference"]) sublist.setSublistValue({
                    id: "custpage_swc_broker_reference",
                    value: value["custpage_swc_broker_reference"],
                    line: index,
                });
                if (value["custpage_swc_broker_reference"]) sublist.setSublistValue({
                    id: "custpage_swc_broker_reference_hide",
                    value: value["custpage_swc_broker_reference"],
                    line: index,
                });

                if (value["custpage_swc_enter_number"]) sublist.setSublistValue({
                    id: "custpage_swc_enter_number",
                    value: value["custpage_swc_enter_number"],
                    line: index,
                });
                if (value["custpage_swc_enter_number"]) sublist.setSublistValue({
                    id: "custpage_swc_enter_number_hide",
                    value: value["custpage_swc_enter_number"],
                    line: index,
                });

                if (value["custpage_swc_inv_no"]) sublist.setSublistValue({
                    id: "custpage_swc_inv_no",
                    value: value["custpage_swc_inv_no"],
                    line: index,
                });
                if (value["custpage_swc_inv_no"]) sublist.setSublistValue({
                    id: "custpage_swc_inv_no_hide",
                    value: value["custpage_swc_inv_no"],
                    line: index,
                });

                // 费用类型
                if (value["custpage_swc_fee_type"]) sublist.setSublistValue({
                    id: "custpage_swc_fee_type",
                    value: value["custpage_swc_fee_type"],
                    line: index,
                });
                if (value["custpage_swc_fee_type_hide"]) sublist.setSublistValue({
                    id: "custpage_swc_fee_type_hide",
                    value: value["custpage_swc_fee_type_hide"],
                    line: index,
                });
                if (value["custpage_swc_fee_type_hide2"]) sublist.setSublistValue({
                    id: "custpage_swc_fee_type_hide2",
                    value: value["custpage_swc_fee_type_hide2"],
                    line: index,
                });

                // 数量
                if (value["custpage_sublist_sku_number"]) sublist.setSublistValue({
                    id: "custpage_sublist_sku_number",
                    value: value["custpage_sublist_sku_number"],
                    line: index,
                });
                if (value["custpage_sublist_sku_number"]) sublist.setSublistValue({
                    id: "custpage_sublist_sku_number_hide",
                    value: value["custpage_sublist_sku_number"],
                    line: index,
                });

                // 含税单价
                if (value["custpage_sublist_sku_price"]) sublist.setSublistValue({
                    id: "custpage_sublist_sku_price",
                    value: value["custpage_sublist_sku_price"],
                    line: index,
                });
                if (value["custpage_sublist_sku_price"]) sublist.setSublistValue({
                    id: "custpage_sublist_sku_price_hide",
                    value: value["custpage_sublist_sku_price"],
                    line: index,
                });

                // 含税总额
                if (value["custpage_sublist_amount_sum"]) sublist.setSublistValue({
                    id: "custpage_sublist_amount_sum",
                    value: value["custpage_sublist_amount_sum"],
                    line: index,
                });
                if (value["custpage_sublist_amount_sum"]) sublist.setSublistValue({
                    id: "custpage_sublist_amount_sum_hide",
                    value: value["custpage_sublist_amount_sum"],
                    line: index,
                });

                if (value["custpage_swc_hw_lc_number_dz"]) sublist.setSublistValue({
                    id: "custpage_swc_hw_lc_number_dz",
                    value: value["custpage_swc_hw_lc_number_dz"],
                    line: index,
                });
                if (value["custpage_swc_hw_lc_number_dz"]) sublist.setSublistValue({
                    id: "custpage_swc_hw_lc_number_dz_hide",
                    value: value["custpage_swc_hw_lc_number_dz"],
                    line: index,
                });

                if (value["custpage_swc_total_shipment_qua"]) sublist.setSublistValue({
                    id: "custpage_swc_total_shipment_qua",
                    value: value["custpage_swc_total_shipment_qua"],
                    line: index,
                });
                if (value["custpage_swc_total_shipment_qua"]) sublist.setSublistValue({
                    id: "custpage_swc_total_shipment_qua_hide",
                    value: value["custpage_swc_total_shipment_qua"],
                    line: index,
                });

                if (value["custpage_swc_md_location"]) sublist.setSublistValue({
                    id: "custpage_swc_md_location",
                    value: value["custpage_swc_md_location"],
                    line: index,
                });
                if (value["custpage_swc_md_location"]) sublist.setSublistValue({
                    id: "custpage_swc_md_location_hide",
                    value: value["custpage_swc_md_location"],
                    line: index,
                });

                if (value["custpage_swc_wl_zg_size"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_zg_size",
                    value: value["custpage_swc_wl_zg_size"],
                    line: index,
                });
                if (value["custpage_swc_wl_zg_size"]) sublist.setSublistValue({
                    id: "custpage_swc_wl_zg_size_hide",
                    value: value["custpage_swc_wl_zg_size"],
                    line: index,
                });

                if (value["custpage_swc_document_number"]) sublist.setSublistValue({
                    id: "custpage_swc_document_number",
                    value: value["custpage_swc_document_number"],
                    line: index,
                });
                if (value["custpage_swc_document_number"]) sublist.setSublistValue({
                    id: "custpage_swc_document_number_hide",
                    value: value["custpage_swc_document_number"],
                    line: index,
                });

                if (value["custpage_swc_lastmile_po"]) sublist.setSublistValue({
                    id: "custpage_swc_lastmile_po",
                    value: value["custpage_swc_lastmile_po"],
                    line: index,
                });
                if (value["custpage_swc_lastmile_po"]) sublist.setSublistValue({
                    id: "custpage_swc_lastmile_po_hide",
                    value: value["custpage_swc_lastmile_po"],
                    line: index,
                });

                if (value["custpage_swc_lastmile_track"]) sublist.setSublistValue({
                    id: "custpage_swc_lastmile_track",
                    value: value["custpage_swc_lastmile_track"],
                    line: index,
                });
                if (value["custpage_swc_lastmile_track"]) sublist.setSublistValue({
                    id: "custpage_swc_lastmile_track_hide",
                    value: value["custpage_swc_lastmile_track"],
                    line: index,
                });

                if (value["custpage_swc_lastmile_sku"]) sublist.setSublistValue({
                    id: "custpage_swc_lastmile_sku",
                    value: value["custpage_swc_lastmile_sku"],
                    line: index,
                });
                if (value["custpage_swc_lastmile_sku"]) sublist.setSublistValue({
                    id: "custpage_swc_lastmile_sku_hide",
                    value: value["custpage_swc_lastmile_sku"],
                    line: index,
                });

                if (value["custpage_swc_lastmile_place"]) sublist.setSublistValue({
                    id: "custpage_swc_lastmile_place",
                    value: value["custpage_swc_lastmile_place"],
                    line: index,
                });
                if (value["custpage_swc_lastmile_place"]) sublist.setSublistValue({
                    id: "custpage_swc_lastmile_place_hide",
                    value: value["custpage_swc_lastmile_place"],
                    line: index,
                });

                if (value["custpage_swc_lastmile_quantity"]) sublist.setSublistValue({
                    id: "custpage_swc_lastmile_quantity",
                    value: value["custpage_swc_lastmile_quantity"],
                    line: index,
                });
                if (value["custpage_swc_lastmile_quantity"]) sublist.setSublistValue({
                    id: "custpage_swc_lastmile_quantity_hide",
                    value: value["custpage_swc_lastmile_quantity"],
                    line: index,
                });

                if (value["custpage_swc_lastmile_jfdate"]) sublist.setSublistValue({
                    id: "custpage_swc_lastmile_jfdate",
                    value: value["custpage_swc_lastmile_jfdate"],
                    line: index,
                });
                if (value["custpage_swc_lastmile_jfdate"]) sublist.setSublistValue({
                    id: "custpage_swc_lastmile_jfdate_hide",
                    value: value["custpage_swc_lastmile_jfdate"],
                    line: index,
                });

                if (value["custpage_swc_lastmile_receipt"]) sublist.setSublistValue({
                    id: "custpage_swc_lastmile_receipt",
                    value: value["custpage_swc_lastmile_receipt"],
                    line: index,
                });
                if (value["custpage_swc_lastmile_receipt"]) sublist.setSublistValue({
                    id: "custpage_swc_lastmile_receipt_hide",
                    value: value["custpage_swc_lastmile_receipt"],
                    line: index,
                });
            });

            form.updateDefaultValues({
                "custpage_amount_total": totalAmount
            })
        }
        function createReconciliation(adData) {
            var mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE
            });

            //设置要执行的 Map/Reduce 脚本的部署ID
            mrTask.scriptId = 'customscript_swc_mr_heardpay';
            //设置部署ID
            mrTask.deploymentId = 'customdeploy_swc_mr_heardpay';

            log.audit('adData',adData);
            //传递参数给 Map/Reduce 脚本
            mrTask.params = {
                // 这些参数可以在 Map/Reduce 脚本的 context.param1, context.param2 中获取
                'custscript_heardpay_json': JSON.stringify(adData),
            };

            var taskId = mrTask.submit();

            log.audit('taskId',taskId);
            return taskId;
        }

        return {onRequest}

    });