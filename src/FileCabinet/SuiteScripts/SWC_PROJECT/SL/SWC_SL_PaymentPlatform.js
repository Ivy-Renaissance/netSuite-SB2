/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

const PAGE_SIZE = 1000;// 子列表页面大小
const SUBMIST_STATUS = "1";//平台生成预付申请单
const SUBMIST_STATUS_2 = "2";
define(["N/ui/serverWidget","N/runtime","N/record", "../APP/SWC_APP_PaymentPlatform",'N/task', '../common/SWC_CONFIG_DATA'],

    (serverWidget,runtime,record,app,task,SWC_CONFIG_DATA) => {
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

            log.audit("parameters", parameters)

            // 参数初始化
            app.initParams(parameters, method);
            log.audit("method", method)

            var result = {code: 200, data: {}, msg: "执行成功"};

            if (parameters["flag"] == SUBMIST_STATUS) {
                try {
                    //生成付款申请单
                    log.audit("生成付款申请单", parameters["adData"]);
                    let adData = JSON.parse(parameters["adData"])
                    var taskId = createAdvancepay(adData);
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
                log.audit('data', data);
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
            var form = serverWidget.createForm({title: "实物采购付款申请平台"});
            // 设置客户端脚本
            form.clientScriptModulePath = "../CS/SWC_CS_PaymentPlatform";
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
                label: "查询条件",
                tab: "",
                isCollapsible: true,
            });
            form.addFieldGroup({
                id: "custpage_group_write_cond",
                label: "基础信息",
                tab: "",
                isCollapsible: true,
            });

            // 屏幕遮罩
            var hidden_field = form.addField({ id:'hidden_info',type:serverWidget.FieldType.INLINEHTML,label:'屏幕遮罩'});
            hidden_field.defaultValue = '<div id="timeoutblocker" style="position: fixed; z-index: 10000; top: 0px; left: 0px; height: 100%; width: 100%; margin: 5px 0px; background-color: rgb(155, 155, 155); opacity: 0.6;"><span style="width:100%;height:100%;line-height:700px;text-align:center;display:block;font-weight: bold; color: red;font-size:20px">' + "数据处理中，请稍后" + '</span></div>';
            var userId = runtime.getCurrentUser().id;

            //组A: 查询条件
            //子公司
            var subsidiaryId = parameters["custpage_subsidiary"];
            parameters["subsidiaryId"] = subsidiaryId;
            var typeField = form.addField({
                id: "custpage_type",
                type: serverWidget.FieldType.MULTISELECT,
                label: "订单类型 *",
                // source: 'customlist_swc_po_type',
                container: 'custpage_group_srch_cond',
            });
            typeField.addSelectOption({
                value: SWC_CONFIG_DATA.configData().s_po_type_swcg,
                text: "实物采购"
            });
            typeField.addSelectOption({
                value: SWC_CONFIG_DATA.configData().s_po_type_gdzc,
                text: "固定资产"
            });
            //供应商
            var vendorId = parameters["custpage_vendor"];
            parameters["vendorId"] = vendorId;
            var vendorField = form.addField({
                id: "custpage_vendor",
                type: serverWidget.FieldType.SELECT,
                label: "供应商 *",
                source: 'vendor',
                container: 'custpage_group_srch_cond',
            });
            var subsidiaryIdField = form.addField({
                id: "custpage_subsidiary",
                type: serverWidget.FieldType.SELECT,
                label: "子公司",
                source: 'subsidiary',
                container: 'custpage_group_srch_cond',
            });
            // subsidiaryIdField.updateDisplayType({
            //     displayType : serverWidget.FieldDisplayType.DISABLED
            // });
            // vendorField.isMandatory = true;
            // log.audit('子公司');
            // var subsidiaryData = app.searchSubsidiary();
            // log.audit('subsidiaryData',subsidiaryData);
            // subsidiaryIdField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            // subsidiaryData.forEach(function (value) {
            //     subsidiaryIdField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });

            // subsidiaryField.updateDisplayType({
            //     displayType : serverWidget.FieldDisplayType.DISABLED
            // });
            // vendorField.isMandatory = true;
            // log.audit('subsidiaryId',subsidiaryId);
            //
            //
            // var vendorData = app.searchVendor();
            // vendorField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            // vendorData.forEach(function(value) {
            //     vendorField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });

            // 线下对账单号
            var xxdzdField = form.addField({
                id: "custpage_xxdzd",
                type: serverWidget.FieldType.TEXT,
                label: "线下对账单号",
                container: 'custpage_group_srch_cond',
            });


            //订单号
            let purOrderField = form.addField({
                id: "custpage_poreqorder",
                type: serverWidget.FieldType.MULTISELECT,
                label: "订单",
                container: 'custpage_group_srch_cond',
            });

            var purOrd = [];
            if (parameters["custpage_vendor"]) {
                purOrd = app.srcPurchOrd(parameters["custpage_subsidiary"],parameters["custpage_vendor"],
                    parameters["custpage_order_startdate"],parameters["custpage_order_enddate"]);
            }
            // purOrderField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            purOrd.forEach(function (value) {
                purOrderField.addSelectOption({
                    value: value.value,
                    text: value.text
                })
            });

            //账单
            let billField = form.addField({
                id: "custpage_billorder",
                type: serverWidget.FieldType.MULTISELECT,
                label: "账单",
                container: 'custpage_group_srch_cond',
            });

            var billOrd = [];
            if (parameters["custpage_vendor"]) {
                billOrd = app.srcBillOrd(parameters["custpage_subsidiary"],parameters["custpage_vendor"],
                    parameters["custpage_order_startdate"],parameters["custpage_order_enddate"]);
            }
            // billField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            billOrd.forEach(function (value) {
                billField.addSelectOption({
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


            //订单日期
            form.addField({
                id: "custpage_order_startdate",
                type: serverWidget.FieldType.DATE,
                label: '起始日期',
                container: 'custpage_group_srch_cond',
            });
            form.addField({
                id: "custpage_order_enddate",
                type: serverWidget.FieldType.DATE,
                label: '截至日期',
                container: 'custpage_group_srch_cond',
            });

            form.addField({
                id: "custpage_demand",
                type: serverWidget.FieldType.SELECT,
                label: "备货计划",
                source: 'customrecord_swc_demand_plan',
                container: 'custpage_group_srch_cond',
            });

            //组B:基础信息
            //预付款日期
            // var dateField = form.addField({
            //     id: "custpage_order_date",
            //     type: serverWidget.FieldType.DATE,
            //     label: '预付款日期',
            //     container: 'custpage_group_write_cond',
            // });

            //银行账户
            // var accountField = form.addField({
            //     id: "custpage_account",
            //     type: serverWidget.FieldType.SELECT,
            //     label: '银行账户',
            //     container: 'custpage_group_write_cond',
            // });
            // var accountObj = app.srcAccount();
            // accountField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            // accountObj.forEach(function (value) {
            //     accountField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });

            var bussinessField = form.addField({
                id: "custpage_bussiness",
                type: serverWidget.FieldType.SELECT,
                label: "提出部门 *",
                // source: 'customlist_swc_pay_departments',
                container: 'custpage_group_write_cond',
            });
            bussinessField.addSelectOption({
                value: SWC_CONFIG_DATA.configData().s_department_cgb,
                text: "采购"
            });
            bussinessField.addSelectOption({
                value: SWC_CONFIG_DATA.configData().s_department_xz,
                text: "行政"
            });

            //预计付款日期
            form.addField({
                id: "custpage_pre_date",
                type: serverWidget.FieldType.DATE,
                label: "预计付款日期 *",
                container: 'custpage_group_write_cond',
            });

            //银行账户
            var accountField = form.addField({
                id: "custpage_account",
                type: serverWidget.FieldType.SELECT,
                label: '银行账户 *',
                container: 'custpage_group_write_cond',
            });
            var accountData = [];
            if (parameters["custpage_vendor"]) {
                accountData = app.searchBillAccount(parameters["custpage_vendor"]);
                log.audit('accountData测试', accountData);
                if (accountData.length > 0) {
                    var accountObj = app.srcAccount(accountData);
                    accountField.addSelectOption({
                        value: "",
                        text: ""
                    });
                    accountObj.forEach(function(value) {
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
                container: 'custpage_group_write_cond',
            });
            if (parameters["custpage_vendor"]) {
                var termsData = app.searchBillTerms(parameters["custpage_vendor"]);

                if (termsData.length > 0) {
                    var termsObj = app.searchTerms(termsData);
                    termsField.addSelectOption({
                        value: "",
                        text: ""
                    });
                    termsObj.forEach(function(value) {
                        termsField.addSelectOption({
                            value: value.value,
                            text: value.text
                        })
                    });
                }
            }

            //备注
            form.addField({
                id: "custpage_memo",
                type: serverWidget.FieldType.TEXT,
                label: "备注",
                container: 'custpage_group_write_cond',
            });
            //付款总金额
            var preAmountSumField = form.addField({
                id: "custpage_pre_amount",
                type: serverWidget.FieldType.TEXT,
                label: "付款总金额",
                container: 'custpage_group_write_cond',
            });
            preAmountSumField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED,
            });

            // termsField.updateDisplayType({displayType: 'disabled'});

            //整单订单预付
            // var wholePaymentField = form.addField({
            //     id: "custpage_whole_payment",
            //     type: serverWidget.FieldType.SELECT,
            //     label: '整单订单预付',
            //     container: 'custpage_group_write_cond',
            // });
            // wholePaymentField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            // wholePaymentField.addSelectOption({
            //     value: true,
            //     text: "TRUE"
            // });
            // wholePaymentField.addSelectOption({
            //     value: false,
            //     text: "FALSE"
            // });

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
            // 生成条件检测
            var gcFlagField = form.addField({
                id: "custpage_gc_flag",
                type: serverWidget.FieldType.TEXT,
                label: "合并生成单据条件",
                container: 'custpage_group_srch_cond'
            });
            gcFlagField.updateDisplayType({displayType: "HIDDEN"});
            // 隐藏字段
            commitFlagField.updateDisplayType({displayType: "HIDDEN"});

            log.audit('parameters',parameters);
            //回显
            form.updateDefaultValues({
                //查询条件
                custpage_subsidiary: parameters["custpage_subsidiary"],
                custpage_vendor: parameters["custpage_vendor"],
                custpage_order_startdate: parameters["custpage_order_startdate"],
                custpage_order_enddate: parameters["custpage_order_enddate"],
                custpage_poreqorder: parameters["custpage_poreqorder"],
                custpage_billorder: parameters["custpage_billorder"],
                custpage_dzd: parameters["custpage_dzd"],
                custpage_demand: parameters["custpage_demand"],
                custpage_xxdzd: parameters["custpage_xxdzd"],
                custpage_type: parameters["custpage_type"],
                //基础信息
                custpage_memo: parameters["custpage_memo"],
                custpage_pre_amount: parameters["custpage_pre_amount"],
                custpage_pre_date: parameters["custpage_pre_date"],
                custpage_account: parameters["custpage_account"],
                custpage_terms: parameters["custpage_terms"],
                custpage_bussiness: parameters["custpage_bussiness"],

                custpage_gc_flag: parameters["custpage_gc_flag"],

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
            sublist.addField({id: 'custpage_sublist_type_2', type: 'SELECT',source: 'customlist_swc_po_type', label: "订单类型"}).updateDisplayType({displayType: 'disabled'});
            sublist.addField({id: 'custpage_sublist_type_2_hide', type: 'SELECT',source: 'customlist_swc_po_type', label: "订单类型"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_statement', type: 'TEXT', label: "对账单"});
            sublist.addField({id: 'custpage_sublist_statement_hide', type: 'TEXT', label: "对账单"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_order_type', type: 'TEXT', label: "单据类型"});
            sublist.addField({id: 'custpage_sublist_order_type_hide', type: 'TEXT', label: "单据类型"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_order', type: 'TEXT', label: "账单编号"});
            sublist.addField({id: 'custpage_sublist_order_hide', type: 'TEXT', label: "账单ID"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_subsidiary', type: 'TEXT', label: "子公司"});
            sublist.addField({id: 'custpage_sublist_subsidiary_hide', type: 'TEXT', label: "子公司"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_vendor', type: 'TEXT', label: "供应商"});
            sublist.addField({id: 'custpage_sublist_vendor_hide', type: 'TEXT', label: "供应商"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_currency', type: 'TEXT', label: "货币"});
            sublist.addField({id: 'custpage_sublist_currency_hide', type: 'TEXT', label: "货币"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_exchange_rate', type: 'TEXT', label: "汇率"});
            sublist.addField({id: 'custpage_sublist_exchange_rate_hide', type: 'TEXT', label: "汇率"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_date', type: 'TEXT', label: "日期"});
            sublist.addField({id: 'custpage_sublist_date_hide', type: 'TEXT', label: "日期"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_orderline', type: 'TEXT', label: "行号"});
            sublist.addField({id: 'custpage_sublist_orderline_hide', type: 'TEXT', label: "行号"}).updateDisplayType({displayType: 'hidden'});

            //线下对账单号
            sublist.addField({id: 'custpage_sublist_xxdzd', type: 'TEXT', label: "线下对账单号"})
            sublist.addField({id: 'custpage_sublist_xxdzd_hide', type: 'TEXT', label: "线下对账单号"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_orderkey_start', type: 'TEXT', label: "订单初始唯一键"});
            sublist.addField({id: 'custpage_sublist_orderkey_start_hide', type: 'TEXT', label: "订单初始唯一键"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_orderkey_end', type: 'TEXT', label: "订单后续唯一键"});
            sublist.addField({id: 'custpage_sublist_orderkey_end_hide', type: 'TEXT', label: "订单后续唯一键"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_item_code', type: 'TEXT', label: "SKU编码"});
            sublist.addField({id: 'custpage_sublist_item_code_hide', type: 'TEXT', label: "SKU编码"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_item_name', type: 'TEXT', label: "SKU产品描述"});
            sublist.addField({id: 'custpage_sublist_item_name_hide', type: 'TEXT', label: "SKU产品描述"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_demand_line', type: 'SELECT',source: 'customrecord_swc_demand_plan' , label: "备货计划"}).updateDisplayType({displayType: 'disabled'});
            sublist.addField({id: 'custpage_sublist_demand_line_hide', type: 'SELECT',source: 'customrecord_swc_demand_plan' , label: "备货计划"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_number', type: 'FLOAT', label: "数量"});
            sublist.addField({id: 'custpage_sublist_number_hide', type: 'FLOAT', label: "数量"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_item_price', type: 'CURRENCY', label: "含税单价"});
            sublist.addField({id: 'custpage_sublist_item_price_hide', type: 'CURRENCY', label: "含税单价"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_tax', type: 'PERCENT', label: "税率"});
            sublist.addField({id: 'custpage_sublist_tax_hide', type: 'PERCENT', label: "税率"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_all_amount', type: 'CURRENCY', label: "含税总金额"});
            sublist.addField({id: 'custpage_sublist_all_amount_hide', type: 'CURRENCY', label: "含税总金额"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_whole_allocation', type: 'CURRENCY', label: "整单预付-分摊"});
            sublist.addField({id: 'custpage_sublist_whole_allocation_hide', type: 'CURRENCY', label: "整单预付-分摊"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_before_shipment_amount', type: 'CURRENCY', label: "发货前预付金额"});
            sublist.addField({id: 'custpage_sublist_before_shipment_amount_hide', type: 'CURRENCY', label: "发货前预付金额"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_prepaid_amount', type: 'CURRENCY', label: "已经预付总金额"});
            sublist.addField({id: 'custpage_sublist_prepaid_amount_hide', type: 'CURRENCY', label: "已经预付总金额"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_pending_payment', type: 'CURRENCY', label: "待支付金额"}).updateDisplayType({displayType: 'disabled'});
            sublist.addField({id: 'custpage_sublist_pending_payment_hide', type: 'CURRENCY', label: "待支付金额"}).updateDisplayType({displayType: 'hidden'});

            // sublist.addField({id: 'custpage_sublist_already_payment', type: 'CURRENCY', label: "已支付金额"}).updateDisplayType({displayType: 'disabled'});
            // sublist.addField({id: 'custpage_sublist_already_payment_hide', type: 'CURRENCY', label: "已支付金额"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_cur_payment', type: 'CURRENCY', label: "本次支付金额"}).updateDisplayType({displayType: 'entry'}).updateDisplayType({displayType: 'disabled'});

            sublist.addField({id: 'custpage_sublist_line_memo', type: 'TEXT', label: "行备注"}).updateDisplayType({displayType: 'entry'});

            sublist.addField({id: 'custpage_sublist_cur_date', type: 'DATE', label: "到期日"});
            sublist.addField({id: 'custpage_sublist_cur_date_hide', type: 'DATE', label: "到期日"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_days', type: 'TEXT', label: "到期截至日期-出入库日期日"});
            sublist.addField({id: 'custpage_sublist_days_hide', type: 'TEXT', label: "到期截至日期-出入库日期日"}).updateDisplayType({displayType: 'hidden'});
            var pagedData = data.pagedData || [
                {
                    index: "1"
                }];
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
                // 对账单
                if (value["statement"]) sublist.setSublistValue({
                    id: "custpage_sublist_statement",
                    value: value["statement"],
                    line: index,
                });
                if (value["statementId"]) sublist.setSublistValue({
                    id: "custpage_sublist_statement_hide",
                    value: value["statementId"],
                    line: index,
                });
                // 单据类型
                if (value["type"]) sublist.setSublistValue({
                    id: "custpage_sublist_order_type",
                    value: value["type"],
                    line: index,
                });
                if (value["typeid"]) sublist.setSublistValue({
                    id: "custpage_sublist_order_type_hide",
                    value: value["typeid"],
                    line: index,
                });
                // 账单号
                if (value["no"]) sublist.setSublistValue({
                    id: "custpage_sublist_order",
                    value: value["no"],
                    line: index,
                });
                if (value["id"]) sublist.setSublistValue({
                    id: "custpage_sublist_order_hide",
                    value: value["id"],
                    line: index,
                });

                // 子公司
                if (value["subsidiaryname"]) sublist.setSublistValue({
                    id: "custpage_sublist_subsidiary",
                    value: value["subsidiaryname"],
                    line: index,
                });
                if (value["subsidiary"]) sublist.setSublistValue({
                    id: "custpage_sublist_subsidiary_hide",
                    value: value["subsidiary"],
                    line: index,
                });

                // 供应商
                if (value["vendorname"]) sublist.setSublistValue({
                    id: "custpage_sublist_vendor",
                    value: value["vendorname"],
                    line: index,
                });
                if (value["vendorid"]) sublist.setSublistValue({
                    id: "custpage_sublist_vendor_hide",
                    value: value["vendorid"],
                    line: index,
                });

                // 货币
                if (value["currencyname"]) sublist.setSublistValue({
                    id: "custpage_sublist_currency",
                    value: value["currencyname"],
                    line: index,
                });
                if (value["currency"]) sublist.setSublistValue({
                    id: "custpage_sublist_currency_hide",
                    value: value["currency"],
                    line: index,
                });

                // 汇率
                if (value["rate"]) sublist.setSublistValue({
                    id: "custpage_sublist_exchange_rate",
                    value: value["rate"],
                    line: index,
                });
                if (value["rate"]) sublist.setSublistValue({
                    id: "custpage_sublist_exchange_rate_hide",
                    value: value["rate"],
                    line: index,
                });

                // 日期
                if (value["date"]) sublist.setSublistValue({
                    id: "custpage_sublist_date",
                    value: value["date"],
                    line: index,
                });
                if (value["date"]) sublist.setSublistValue({
                    id: "custpage_sublist_date_hide",
                    value: value["date"],
                    line: index,
                });

                // 行号
                if (value["lineid"]) sublist.setSublistValue({
                    id: "custpage_sublist_orderline",
                    value: value["lineid"],
                    line: index,
                });
                if (value["lineid"]) sublist.setSublistValue({
                    id: "custpage_sublist_orderline_hide",
                    value: value["lineid"],
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

                // 初始唯一键
                if (value["startKey"]) sublist.setSublistValue({
                    id: "custpage_sublist_orderkey_start",
                    value: value["startKey"],
                    line: index,
                });
                if (value["startKey"]) sublist.setSublistValue({
                    id: "custpage_sublist_orderkey_start_hide",
                    value: value["startKey"],
                    line: index,
                });

                // 后续唯一键
                if (value["endKey"]) sublist.setSublistValue({
                    id: "custpage_sublist_orderkey_end",
                    value: value["endKey"],
                    line: index,
                });
                if (value["endKey"]) sublist.setSublistValue({
                    id: "custpage_sublist_orderkey_end_hide",
                    value: value["endKey"],
                    line: index,
                });

                // 货品编码
                if (value["itemcode"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_code",
                    value: value["itemcode"],
                    line: index,
                });
                if (value["itemid"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_code_hide",
                    value: value["itemid"],
                    line: index,
                });

                // 货品名称
                if (value["itemname"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_name",
                    value: value["itemname"],
                    line: index,
                });
                if (value["itemname"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_name_hide",
                    value: value["itemname"],
                    line: index,
                });

                //备货计划
                if (value["custpage_sublist_demand_line"]) sublist.setSublistValue({
                    id: "custpage_sublist_demand_line",
                    value: value["custpage_sublist_demand_line"],
                    line: index,
                });
                if (value["custpage_sublist_demand_line"]) sublist.setSublistValue({
                    id: "custpage_sublist_demand_line_hide",
                    value: value["custpage_sublist_demand_line"],
                    line: index,
                });

                // 数量
                if (value["number"]) sublist.setSublistValue({
                    id: "custpage_sublist_number",
                    value: value["number"],
                    line: index,
                });
                if (value["number"]) sublist.setSublistValue({
                    id: "custpage_sublist_number_hide",
                    value: value["number"],
                    line: index,
                });

                // 未税单价
                if (value["price"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_price",
                    value: value["price"],
                    line: index,
                });
                if (value["price"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_price_hide",
                    value: value["price"],
                    line: index,
                });

                //税率 tax custpage_sublist_tax
                if (value["taxrate"]) sublist.setSublistValue({
                    id: "custpage_sublist_tax",
                    value: value["taxrate"],
                    line: index,
                });
                if (value["taxrate"]) sublist.setSublistValue({
                    id: "custpage_sublist_tax_hide",
                    value: value["taxrate"],
                    line: index,
                });

                //含税总金额
                if (value["allamount"]) sublist.setSublistValue({
                    id: "custpage_sublist_all_amount",
                    value: value["allamount"],
                    line: index,
                });
                if (value["allamount"]) sublist.setSublistValue({
                    id: "custpage_sublist_all_amount_hide",
                    value: value["allamount"],
                    line: index,
                });

                //第一次整单预付-摊销金额
                if (value["wholespare"]) sublist.setSublistValue({
                    id: "custpage_sublist_whole_allocation",
                    value: value["wholespare"],
                    line: index,
                });
                if (value["wholespare"]) sublist.setSublistValue({
                    id: "custpage_sublist_whole_allocation_hide",
                    value: value["wholespare"],
                    line: index,
                });

                //发货前预付金额
                if (value["beforearrived"]) sublist.setSublistValue({
                    id: "custpage_sublist_before_shipment_amount",
                    value: value["beforearrived"],
                    line: index,
                });
                if (value["beforearrived"]) sublist.setSublistValue({
                    id: "custpage_sublist_before_shipment_amount_hide",
                    value: value["beforearrived"],
                    line: index,
                });

                //已经预付总金额
                if (value["writeoff"]) sublist.setSublistValue({
                    id: "custpage_sublist_prepaid_amount",
                    value: value["writeoff"],
                    line: index,
                });
                if (value["writeoff"]) sublist.setSublistValue({
                    id: "custpage_sublist_prepaid_amount_hide",
                    value: value["writeoff"],
                    line: index,
                });

                //待支付金额
                sublist.setSublistValue({
                    id: "custpage_sublist_pending_payment",
                    value: value["pending"],
                    line: index,
                });
                sublist.setSublistValue({
                    id: "custpage_sublist_pending_payment_hide",
                    value: value["pending"],
                    line: index,
                });

                // //已支付金额
                // sublist.setSublistValue({
                //     id: "custpage_sublist_already_payment",
                //     value: value["paidAmount"],
                //     line: index,
                // });
                // sublist.setSublistValue({
                //     id: "custpage_sublist_already_payment_hide",
                //     value: value["paidAmount"],
                //     line: index,
                // });

                //本次支付金额
                sublist.setSublistValue({
                    id: "custpage_sublist_cur_payment",
                    value: value["curAmount"],
                    line: index,
                });

                //到日期
                if (value["duedate"]) sublist.setSublistValue({
                    id: "custpage_sublist_cur_date",
                    value: value["duedate"],
                    line: index,
                });
                if (value["duedate"]) sublist.setSublistValue({
                    id: "custpage_sublist_cur_date_hide",
                    value: value["duedate"],
                    line: index,
                });

                //天数
                sublist.setSublistValue({
                    id: "custpage_sublist_days",
                    value: value["days"],
                    line: index,
                });
                sublist.setSublistValue({
                    id: "custpage_sublist_days_hide",
                    value: value["days"],
                    line: index,
                });

            });
        }

        function createAdvancepay(adData) {
            var mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE
            });

            //设置要执行的 Map/Reduce 脚本的部署ID
            mrTask.scriptId = 'customscript_swc_mr_paymentplatform';
            //设置部署ID
            mrTask.deploymentId = 'customdeploy_swc_mr_paymentplatform';

            //传递参数给 Map/Reduce 脚本
            mrTask.params = {
                // 这些参数可以在 Map/Reduce 脚本的 context.param1, context.param2 中获取
                'custscript_payment_json': adData,
            };

            var taskId = mrTask.submit();

            log.audit('taskId',taskId);
            return taskId;
        }


        return {onRequest}

    });