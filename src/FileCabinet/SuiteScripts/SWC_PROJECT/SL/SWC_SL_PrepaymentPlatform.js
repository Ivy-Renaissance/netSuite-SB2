/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

const PAGE_SIZE = 300;// 子列表页面大小
const SUBMIST_STATUS = "1";//平台生成预付申请单
const SUBMIST_STATUS_2 = "2";
define(["N/ui/serverWidget","N/runtime","N/record", "../APP/SWC_APP_PrepaymentPlatform",'N/task'],

    (serverWidget,runtime,record,app,task) => {
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

            // 参数初始化
            app.initParams(parameters, method);

            var result = {code: 200, data: {}, msg: "执行成功"};

            if (parameters["flag"] == SUBMIST_STATUS) {
                try {
                    //生成预付申请单
                    log.audit("生成预付款申请单", parameters["adData"]);
                    let adData = JSON.parse(parameters["adData"])
                    var taskId = createAdvancepay(adData);
                    // result["data"] = poId;
                    result["code"] = 200;
                    result["data"].taskId = taskId;
                } catch (e) {
                    result["code"] = 500;
                    result["msg"] = e.message;
                }
                response.write(JSON.stringify(result));
            } else if (parameters["flag"] == SUBMIST_STATUS_2) {
                let adData2 = JSON.parse(parameters["adData"]);
                let taskId = adData2.taskId;
                var summary = task.checkStatus(taskId);
                result["code"] = 200;
                result.data.status = summary.status;
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
            var form = serverWidget.createForm({title: "实物采购预付款平台"});
            // 设置客户端脚本
            form.clientScriptModulePath = "../CS/SWC_CS_PrepaymentPlatform";
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
                source: 'customlist_swc_po_type',
                container: 'custpage_group_srch_cond',
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

            form.addField({
                id: "custpage_subsidiary",
                type: serverWidget.FieldType.SELECT,
                label: "子公司",
                source: 'subsidiary',
                container: 'custpage_group_srch_cond',
            });

            form.addField({
                id: "custpage_demand",
                type: serverWidget.FieldType.SELECT,
                label: "备货计划",
                source: 'customrecord_swc_demand_plan',
                container: 'custpage_group_srch_cond',
            });

            //订单日期
            form.addField({
                id: "custpage_order_startdate",
                type: serverWidget.FieldType.DATE,
                label: '订单起始日期',
                container: 'custpage_group_srch_cond',
            });
            form.addField({
                id: "custpage_order_enddate",
                type: serverWidget.FieldType.DATE,
                label: '订单截至日期',
                container: 'custpage_group_srch_cond',
            });

            form.addField({
                id: "custpage_expectedreceiptdate_s",
                type: serverWidget.FieldType.DATE,
                label: "预计接收日期-开始",
                source: 'customrecord_swc_demand_plan',
                container: 'custpage_group_srch_cond',
            });

            form.addField({
                id: "custpage_expectedreceiptdate_e",
                type: serverWidget.FieldType.DATE,
                label: "预计接收日期-结束",
                source: 'customrecord_swc_demand_plan',
                container: 'custpage_group_srch_cond',
            });

            //订单号
            let purOrderField = form.addField({
                id: "custpage_poreqorder",
                type: serverWidget.FieldType.MULTISELECT,
                label: "订单",
                // source: 'purchaseorder',
                container: 'custpage_group_srch_cond',
            });

            if (parameters["custpage_vendor"]) {
                var purOrd = app.srcPurchOrd(
                    parameters["custpage_subsidiary"],parameters["custpage_vendor"],
                    parameters["custpage_order_startdate"],parameters["custpage_order_enddate"],
                    parameters["custpage_poreqorder"]
                );
                purOrd.forEach(function (value) {
                    purOrderField.addSelectOption({
                        value: value.value,
                        text: value.text
                    })
                });
            }

            //组B:基础信息
            var bussinessField = form.addField({
                id: "custpage_bussiness",
                type: serverWidget.FieldType.SELECT,
                label: "提出部门 *",
                source: 'customlist_swc_pay_departments',
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
                log.audit('accountData',accountData);

                var accountObj = app.srcAccount(accountData);
                log.audit('accountObj',accountObj);
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


            var accountField2 = form.addField({
                id: "custpage_account_hide",
                type: serverWidget.FieldType.SELECT,
                label: '银行账户',
                container: 'custpage_group_write_cond',
            }).updateDisplayType({displayType: 'HIDDEN'});

            //付款条件
            var termsField = form.addField({
                id: "custpage_terms",
                type: serverWidget.FieldType.SELECT,
                label: '付款条件 *',
                container: 'custpage_group_write_cond',
            });
            var termsData = [];

            if (parameters["custpage_vendor"]) {
                termsData = app.searchBillTerms(parameters["custpage_vendor"]);

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

            //整单订单预付
            var wholePaymentField = form.addField({
                id: "custpage_whole_payment",
                type: serverWidget.FieldType.SELECT,
                label: '非整单预付 *',
                container: 'custpage_group_write_cond',
            });
            wholePaymentField.addSelectOption({
                value: "",
                text: ""
            });
            wholePaymentField.addSelectOption({
                value: true,
                text: "整单预付（基于订单数量）"
            });
            wholePaymentField.addSelectOption({
                value: false,
                text: "非整单预付（基于入库单数量）"
            });

            //预期预付款日期
            var dateField = form.addField({
                id: "custpage_order_date",
                type: serverWidget.FieldType.DATE,
                label: '预期预付款日期 *',
                container: 'custpage_group_write_cond',
            });

            //备注
            form.addField({
                id: "custpage_memo",
                type: serverWidget.FieldType.TEXT,
                label: "备注",
                container: 'custpage_group_write_cond',
            });

            form.addField({
                id: "custpage_all_payment",
                type: serverWidget.FieldType.CURRENCY,
                label: '总预付金额',
                container: 'custpage_group_write_cond',
            }).updateDisplayType({displayType: 'entry'}).updateDisplayType({displayType: 'disabled'});

            form.addField({
                id: "custpage_all_quantity",
                type: serverWidget.FieldType.FLOAT,
                label: '订单总数量',
                container: 'custpage_group_write_cond',
            }).updateDisplayType({displayType: 'entry'}).updateDisplayType({displayType: 'disabled'});

            form.addField({
                id: "custpage_all_prequantity",
                type: serverWidget.FieldType.FLOAT,
                label: '预计入库总数量',
                container: 'custpage_group_write_cond',
            }).updateDisplayType({displayType: 'entry'}).updateDisplayType({displayType: 'disabled'});

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

            //回显
            form.updateDefaultValues({
                //查询条件
                custpage_subsidiary: parameters["custpage_subsidiary"],
                custpage_vendor: parameters["custpage_vendor"],
                custpage_order_startdate: parameters["custpage_order_startdate"],
                custpage_order_enddate: parameters["custpage_order_enddate"],
                custpage_poreqorder: parameters["custpage_poreqorder"],
                custpage_demand: parameters["custpage_demand"],
                custpage_expectedreceiptdate_s: parameters["custpage_expectedreceiptdate_s"],
                custpage_expectedreceiptdate_e: parameters["custpage_expectedreceiptdate_e"],
                custpage_type: parameters["custpage_type"],
                //基础信息
                custpage_memo: parameters["custpage_memo"],
                custpage_order_date: parameters["custpage_order_date"],
                custpage_whole_payment: parameters["custpage_whole_payment"],
                custpage_account: parameters["custpage_account"],
                custpage_terms: parameters["custpage_terms"],
                custpage_account_hide: parameters["custpage_account_hide"],
                custpage_all_payment: parameters["custpage_all_payment"],
                custpage_all_quantity: parameters["custpage_all_quantity"],
                custpage_all_prequantity: parameters["custpage_all_prequantity"],
                custpage_bussiness: parameters["custpage_bussiness"],

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

            sublist.addField({id: 'custpage_sublist_order', type: 'TEXT', label: "订单号"});
            sublist.addField({id: 'custpage_sublist_order_hide', type: 'TEXT', label: "订单号ID"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_subsidiary', type: 'TEXT', label: "子公司"});
            sublist.addField({id: 'custpage_sublist_subsidiary_hide', type: 'TEXT', label: "子公司"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_vendor', type: 'TEXT', label: "供应商"});
            sublist.addField({id: 'custpage_sublist_vendor_hide', type: 'TEXT', label: "供应商"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_orderline', type: 'TEXT', label: "订单行号"}).updateDisplayType({displayType: 'hidden'});
            sublist.addField({id: 'custpage_sublist_orderline_hide', type: 'TEXT', label: "订单行号"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_orderkey_start', type: 'TEXT', label: "订单初始唯一键"});
            sublist.addField({id: 'custpage_sublist_orderkey_start_hide', type: 'TEXT', label: "订单初始唯一键"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_orderkey_end', type: 'TEXT', label: "订单后续唯一键"}).updateDisplayType({displayType: 'hidden'});;
            sublist.addField({id: 'custpage_sublist_orderkey_end_hide', type: 'TEXT', label: "订单后续唯一键"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_item_code', type: 'TEXT', label: "货品编码"});
            sublist.addField({id: 'custpage_sublist_item_code_hide', type: 'TEXT', label: "货品编码"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_item_name', type: 'TEXT', label: "货品名称"});
            sublist.addField({id: 'custpage_sublist_item_name_hide', type: 'TEXT', label: "货品名称"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_currency', type: 'TEXT', label: "货币"});
            sublist.addField({id: 'custpage_sublist_currency_hide', type: 'TEXT', label: "货币"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_item_price', type: 'CURRENCY', label: "未税单价"}).updateDisplayType({displayType: 'hidden'});
            sublist.addField({id: 'custpage_sublist_item_price_hide', type: 'CURRENCY', label: "未税单价"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_tax', type: 'PERCENT', label: "税率"}).updateDisplayType({displayType: 'hidden'});
            sublist.addField({id: 'custpage_sublist_tax_hide', type: 'PERCENT', label: "税率"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_tax_price', type: 'CURRENCY', label: "优品单价"});
            sublist.addField({id: 'custpage_sublist_tax_price_hide', type: 'CURRENCY', label: "优品单价"}).updateDisplayType({displayType: 'hidden'});

            //良品单价
            sublist.addField({id: 'custpage_sublist_price_good', type: 'CURRENCY', label: "良品单价"});
            sublist.addField({id: 'custpage_sublist_price_good_hide', type: 'CURRENCY', label: "良品单价"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_number', type: 'FLOAT', label: "数量"});
            sublist.addField({id: 'custpage_sublist_number_hide', type: 'FLOAT', label: "数量"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_all_amount', type: 'CURRENCY', label: "订单行含税总金额"});
            sublist.addField({id: 'custpage_sublist_all_amount_hide', type: 'CURRENCY', label: "订单行含税总金额"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_all_number', type: 'FLOAT', label: "已收货数量"});
            sublist.addField({id: 'custpage_sublist_all_number_hide', type: 'FLOAT', label: "已收货数量"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_prenumber_line', type: 'CURRENCY', label: "预计已入库数量"}).updateDisplayType({displayType: 'entry'}).updateDisplayType({displayType: 'disabled'});
            sublist.addField({id: 'custpage_sublist_prenumber_line_hide', type: 'CURRENCY', label: "预计已入库数量"}).updateDisplayType({displayType: 'hidden'});

            // sublist.addField({id: 'custpage_sublist_all_amount_before', type: 'FLOAT', label: "之前预付金额累计"});
            // sublist.addField({id: 'custpage_sublist_all_amount_before_hide', type: 'TEXT', label: "之前预付金额累计"}).updateDisplayType({displayType: 'hidden'});

            // sublist.addField({id: 'custpage_sublist_unpaid_amount', type: 'FLOAT', label: "未付金额"});
            // sublist.addField({id: 'custpage_sublist_unpaid_amount_hide', type: 'TEXT', label: "未付金额"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_preamount', type: 'CURRENCY', label: "整单预付金额"});
            sublist.addField({id: 'custpage_sublist_preamount_hide', type: 'CURRENCY', label: "整单预付金额"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_preamount_line', type: 'CURRENCY', label: "整单预付-分摊"}).updateDisplayType({displayType: 'entry'}).updateDisplayType({displayType: 'disabled'});
            sublist.addField({id: 'custpage_sublist_preamount_line_hide', type: 'CURRENCY', label: "整单预付-分摊"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_nopreamount_line', type: 'CURRENCY', label: "非整单预付金额"}).updateDisplayType({displayType: 'entry'}).updateDisplayType({displayType: 'disabled'});
            sublist.addField({id: 'custpage_sublist_nopreamount_line_hide', type: 'CURRENCY', label: "非整单预付金额"}).updateDisplayType({displayType: 'hidden'});


            sublist.addField({id: 'custpage_sublist_expectedreceiptdate_line', type: 'DATE', label: "预计接收日期"});
            sublist.addField({id: 'custpage_sublist_expectedreceiptdate_line_hide', type: 'DATE', label: "预计接收日期"}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_demand_line', type: 'TEXT', label: "备货计划"});
            sublist.addField({id: 'custpage_sublist_demand_line_hide', type: 'TEXT', label: "备货计划"}).updateDisplayType({displayType: 'hidden'});


            sublist.addField({id: 'custpage_sublist_number_estimated', type: 'FLOAT', label: "预计入库优品数量"}).updateDisplayType({displayType: 'entry'});
            sublist.addField({id: 'custpage_sublist_number_estimated_max', type: 'FLOAT', label: "预计入库优品数量"}).updateDisplayType({displayType: 'hidden'});

            //预计入库良品数量
            sublist.addField({id: 'custpage_sublist_number_good', type: 'FLOAT', label: "预计入库良品数量"}).updateDisplayType({displayType: 'entry'});


            var ratioField = sublist.addField({id: 'custpage_sublist_ratio', type: 'SELECT', label: "整单预付比例"}).updateDisplayType({displayType: 'entry'})
            ratioField.addSelectOption({
                value: 0,
                text: ""
            });
            var blData = app.searchBL();
            blData.forEach(function (value) {
                ratioField.addSelectOption({
                    value: value.value,
                    text: value.text
                })
            });

            sublist.addField({id: 'custpage_sublist_prepaid_amount', type: 'CURRENCY', label: "本次申请预付金额"}).updateBreakType({
                breakType: 'startcol'
            })
            .updateDisplayType({
                displayType: 'entry'
            });


            sublist.addField({id: 'custpage_sublist_line_memo', type: 'TEXT', label: "行备注"}).updateDisplayType({displayType: 'entry'});

            sublist.addField({id: 'custpage_sublist_line_whole_ratio_hide', type: 'TEXT', label: "整单预付比例暂存"}).updateDisplayType({displayType: 'hidden'});

            // sublist.addField({id: 'custpage_sublist_whole_flag', type: 'checkbox', label: "整张订单预付"}).updateDisplayType({displayType: 'disabled'});
            // sublist.addField({id: 'custpage_sublist_whole_flag_hide', type: 'checkbox', label: "整张订单预付"}).updateDisplayType({displayType: 'hidden'});
            // // sublist.addField(
            //     {id: 'custpage_sublist_standardrate', type: 'FLOAT', label: SWC_Translate.translate("标准价")}).
            //     updateDisplayType({displayType: 'hidden'});
            //}

            var pagedData = data.pagedData || [
                {
                    index: "1"
                }];
            pagedData.forEach(function(value, index) {
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
                // 采购申请单号
                if (value["order"]) sublist.setSublistValue({
                    id: "custpage_sublist_order",
                    value: value["order"],
                    line: index,
                });
                if (value["orderId"]) sublist.setSublistValue({
                    id: "custpage_sublist_order_hide",
                    value: value["orderId"],
                    line: index,
                });

                // 子公司
                if (value["subsidiary"]) sublist.setSublistValue({
                    id: "custpage_sublist_subsidiary",
                    value: value["subsidiary"],
                    line: index,
                });
                if (value["subsidiaryId"]) sublist.setSublistValue({
                    id: "custpage_sublist_subsidiary_hide",
                    value: value["subsidiaryId"],
                    line: index,
                });

                // 供应商
                if (value["vendor"]) sublist.setSublistValue({
                    id: "custpage_sublist_vendor",
                    value: value["vendor"],
                    line: index,
                });
                if (value["vendorId"]) sublist.setSublistValue({
                    id: "custpage_sublist_vendor_hide",
                    value: value["vendorId"],
                    line: index,
                });
                // 货币
                if (value["currencyName"]) sublist.setSublistValue({
                    id: "custpage_sublist_currency",
                    value: value["currencyName"],
                    line: index,
                });
                if (value["currency"]) sublist.setSublistValue({
                    id: "custpage_sublist_currency_hide",
                    value: value["currency"],
                    line: index,
                });
                // 货品编码
                if (value["itemName"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_code",
                    value: value["itemName"],
                    line: index,
                });
                if (value["item"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_code_hide",
                    value: value["item"],
                    line: index,
                });
                // // 货品编码
                // if (value["itemName"]) sublist.setSublistValue({
                //     id: "custpage_sublist_item_name",
                //     value: value["itemName"],
                //     line: index,
                // });
                // 货品名称
                if (value["itemCode"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_name",
                    value: value["itemCode"],
                    line: index,
                });
                if (value["itemCode"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_name_hide",
                    value: value["itemCode"],
                    line: index,
                });
                // 单价
                if (value["rate"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_price",
                    value: value["rate"],
                    line: index,
                });
                if (value["rate"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_price_hide",
                    value: value["rate"],
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
                //含税单价 taxrate custpage_sublist_tax
                if (value["rate"]) sublist.setSublistValue({
                    id: "custpage_sublist_tax_price",
                    value: value["rate"],
                    line: index,
                });
                if (value["rate"]) sublist.setSublistValue({
                    id: "custpage_sublist_tax_price_hide",
                    value: value["rate"],
                    line: index,
                });

                // 订单数量
                if (value["quantity"]) sublist.setSublistValue({
                    id: "custpage_sublist_number",
                    value: value["quantity"],
                    line: index,
                });
                if (value["quantity"]) sublist.setSublistValue({
                    id: "custpage_sublist_number_hide",
                    value: value["quantity"],
                    line: index,
                });
                //订单号总金额
                if (value["grossamount"]) sublist.setSublistValue({
                    id: "custpage_sublist_all_amount",
                    value: value["grossamount"],
                    line: index,
                });
                if (value["grossamount"]) sublist.setSublistValue({
                    id: "custpage_sublist_all_amount_hide",
                    value: value["grossamount"],
                    line: index,
                });
                //累计收货数量
                if (value["recvquantity"]) sublist.setSublistValue({
                    id: "custpage_sublist_all_number",
                    value: value["recvquantity"],
                    line: index,
                });
                if (value["recvquantity"]) sublist.setSublistValue({
                    id: "custpage_sublist_all_number_hide",
                    value: value["recvquantity"],
                    line: index,
                });
                //行ID
                if (value["lineId"]) sublist.setSublistValue({
                    id: "custpage_sublist_orderline",
                    value: value["lineId"],
                    line: index,
                });
                if (value["lineId"]) sublist.setSublistValue({
                    id: "custpage_sublist_orderline_hide",
                    value: value["lineId"],
                    line: index,
                });
                //订单初始唯一键
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
                //订单后续唯一键
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
                // //之前申请金额
                // sublist.setSublistValue({
                //     id: "custpage_sublist_all_amount_before",
                //     value: value["prepaidAmount"],
                //     line: index,
                // });
                // sublist.setSublistValue({
                //     id: "custpage_sublist_all_amount_before_hide",
                //     value: value["prepaidAmount"],
                //     line: index,
                // });
                //预计本次入库数量
                sublist.setSublistValue({
                    id: "custpage_sublist_number_estimated",
                    value: 0,
                    line: index,
                });
                sublist.setSublistValue({
                    id: "custpage_sublist_number_estimated_max",
                    value: value.quantity - value.recvquantity,
                    line: index,
                });
                // //未付金额
                // sublist.setSublistValue({
                //     id: "custpage_sublist_unpaid_amount",
                //     value: Number(value["grossamount"]) - Number(value["prepaidAmount"]),
                //     line: index,
                // });
                // sublist.setSublistValue({
                //     id: "custpage_sublist_unpaid_amount_hide",
                //     value: Number(value["grossamount"]) - Number(value["prepaidAmount"]),
                //     line: index,
                // });
                //整单预付金额
                if (value.wholeamount || value.wholeamount == 0) sublist.setSublistValue({
                    id: "custpage_sublist_preamount",
                    value: value.wholeamount,
                    line: index,
                });
                if (value.wholeamount || value.wholeamount == 0) sublist.setSublistValue({
                    id: "custpage_sublist_preamount_hide",
                    value: value.wholeamount,
                    line: index,
                });

                //非整单预付金额
                if (value.wholeamount_no || value.wholeamount_no == 0) sublist.setSublistValue({
                    id: "custpage_sublist_nopreamount_line",
                    value: value.wholeamount_no,
                    line: index,
                });
                if (value.wholeamount_no || value.wholeamount_no == 0) sublist.setSublistValue({
                    id: "custpage_sublist_nopreamount_line_hide",
                    value: value.wholeamount_no,
                    line: index,
                });

                //预计接受日期
                if (value["custpage_sublist_expectedreceiptdate_line"]) sublist.setSublistValue({
                    id: "custpage_sublist_expectedreceiptdate_line",
                    value: value["custpage_sublist_expectedreceiptdate_line"],
                    line: index,
                });
                if (value["custpage_sublist_expectedreceiptdate_line"]) sublist.setSublistValue({
                    id: "custpage_sublist_expectedreceiptdate_line_hide",
                    value: value["custpage_sublist_expectedreceiptdate_line"],
                    line: index,
                });

                //备货计划
                if (value["custpage_sublist_demand_line"] && value["custpage_sublist_demand_line"] != '- None -') sublist.setSublistValue({
                    id: "custpage_sublist_demand_line",
                    value: value["custpage_sublist_demand_line"],
                    line: index,
                });
                if (value["custpage_sublist_demand_line_hide"] && value["custpage_sublist_demand_line_hide"] != '- None -') sublist.setSublistValue({
                    id: "custpage_sublist_demand_line_hide",
                    value: value["custpage_sublist_demand_line_hide"],
                    line: index,
                });

                //整单已预付金额分摊到该行 allNumber
                sublist.setSublistValue({
                    id: "custpage_sublist_preamount_line_hide",
                    value: value.allNumber,
                    line: index,
                });

                //该初始行已提交预付申请的预计入库数量合计
                sublist.setSublistValue({
                    id: "custpage_sublist_prenumber_line",
                    value: value.wholenumber,
                    line: index,
                });
                sublist.setSublistValue({
                    id: "custpage_sublist_prenumber_line_hide",
                    value: value.wholenumber,
                    line: index,
                });

                //整单申请比例
                if (value["radio"]) sublist.setSublistValue({
                    id: "custpage_sublist_ratio",
                    value: value["radio"] || 0,
                    line: index,
                });

                //本次申请预付金额
                sublist.setSublistValue({
                    id: "custpage_sublist_prepaid_amount",
                    value: value.yjAmount,
                    line: index,
                });

                //良品价格
                if (value.goodprice) sublist.setSublistValue({
                    id: "custpage_sublist_price_good",
                    value: value.goodprice,
                    line: index,
                });
                if (value.goodprice) sublist.setSublistValue({
                    id: "custpage_sublist_price_good_hide",
                    value: value.goodprice,
                    line: index,
                });


                if (value.radiolist) sublist.setSublistValue({
                    id: "custpage_sublist_line_whole_ratio_hide",
                    value: JSON.stringify(value.radiolist),
                    line: index,
                });

                //整单标志
                // sublist.setSublistValue({
                //     id: "custpage_sublist_whole_flag",
                //     value: value.wholeFlag,
                //     line: index,
                // });

                // sublist.setSublistValue({
                //     id: "custpage_sublist_whole_flag_hide",
                //     value: value.wholeFlag,
                //     line: index,
                // });
            });
        }

        function createAdvancepay(adData) {
            var mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE
            });

            //设置要执行的 Map/Reduce 脚本的部署ID
            mrTask.scriptId = 'customscript_swc_mr_prepaymentplatform';
            //设置部署ID
            mrTask.deploymentId = 'customdeploy_swc_mr_prepaymentplatform';

            //传递参数给 Map/Reduce 脚本
            mrTask.params = {
                // 这些参数可以在 Map/Reduce 脚本的 context.param1, context.param2 中获取
                'custscript_advancepay_json': adData,
            };

            var taskId = mrTask.submit();

            return taskId;
        }


        return {onRequest}

    });