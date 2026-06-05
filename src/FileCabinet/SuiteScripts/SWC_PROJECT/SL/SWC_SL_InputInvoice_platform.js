/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
const SUBMIST_STATUS = "1";
const PAGE_SIZE = 5;// 子列表页面大小
const SUBMIST_STATUS_2 = "2";
define(["N/ui/serverWidget",'N/https', 'N/record', 'N/runtime', "../APP/SWC_APP_InputInvoice_platform",'N/task'],

    (serverWidget,https, record, runtime,app,task) => {
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
                    //生成进项票发票
                    log.audit("生成进项票发票");
                    let adData = JSON.parse(parameters["poData"]);
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
            var form = serverWidget.createForm({title: "进项票登记平台"});
            // 设置客户端脚本
            form.clientScriptModulePath = "../CS/SWC_CS_InputInvoice_platform.js";
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
                label: "筛选器",
                tab: "",
                isCollapsible: true,
            });
            form.addFieldGroup({
                id: "custpage_group_write_cond",
                label: "发票基础信息",
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
            var subsidiaryIdField = form.addField({
                id: "custpage_subsidiary",
                type: serverWidget.FieldType.SELECT,
                label: "子公司",
                container: 'custpage_group_srch_cond',
            });
            // subsidiaryIdField.updateDisplayType({
            //     displayType : serverWidget.FieldDisplayType.DISABLED
            // });
            // vendorField.isMandatory = true;
            log.audit('子公司');
            var subsidiaryData = app.searchSubsidiary();
            log.audit('subsidiaryData',subsidiaryData);
            subsidiaryIdField.addSelectOption({
                value: "",
                text: ""
            });
            subsidiaryData.forEach(function (value) {
                subsidiaryIdField.addSelectOption({
                    value: value.value,
                    text: value.text
                })
            });


            //供应商
            var vendorId = parameters["custpage_vendor"];
            parameters["vendorId"] = vendorId;
            var vendorField = form.addField({
                id: "custpage_vendor",
                type: serverWidget.FieldType.SELECT,
                label: "供应商",
                container: 'custpage_group_srch_cond',
            });
            // subsidiaryField.updateDisplayType({
            //     displayType : serverWidget.FieldDisplayType.DISABLED
            // });
            // vendorField.isMandatory = true;
            log.audit('subsidiaryId',subsidiaryId);


            var vendorData = app.searchVendor();
            vendorField.addSelectOption({
                value: "",
                text: ""
            });
            vendorData.forEach(function(value) {
                vendorField.addSelectOption({
                    value: value.value,
                    text: value.text
                })
            });


            //采购员
            let purchaserField = form.addField({
                id: "custpage_purchaser",
                type: serverWidget.FieldType.SELECT,
                label: "采购员",
                container: 'custpage_group_srch_cond',
            });

            var employeeData = app.searchEmployee();
            log.audit('employeeData',employeeData);
            purchaserField.addSelectOption({
                value: "",
                text: ""
            });
            employeeData.forEach(function (value) {
                purchaserField.addSelectOption({
                    value: value.value,
                    text: value.text
                })
            });


            //期间
            var periodField = form.addField({
                id: "custpage_period",
                type: serverWidget.FieldType.SELECT,
                label: '期间',
                container: 'custpage_group_srch_cond',
            });
            var periodData = app.searchPeriod();
            periodField.addSelectOption({
                value: "",
                text: ""
            });
            periodData.forEach(function(value) {
                periodField.addSelectOption({
                    value: value.value,
                    text: value.text
                })
            });

            //组B:基础信息
            //预付款日期
            form.addField({
                id: "custpage_invoice_date",
                type: serverWidget.FieldType.DATE,
                label: '发票日期',
                container: 'custpage_group_write_cond',
            });

            form.addField({
                id: "custpage_invoice_number",
                type: serverWidget.FieldType.TEXT,
                label: '发票号',
                container: 'custpage_group_write_cond',
            });

            // 已选择数据   ---跨页提交用
            var selectedField = form.addField({
                id: "custpage_selected",
                type: serverWidget.FieldType.LONGTEXT,
                label: "已选择数据",
                container: 'custpage_group_srch_cond'
            });
            selectedField.maxLength = 100000000;
            // 隐藏字段
            // selectedField.updateDisplayType({displayType: "HIDDEN"});
            // 提交区分：点击查询按钮 清空已选择数据（"T"的场合，清空已选择数据） ---跨页提交用
            var commitFlagField = form.addField({
                id: "custpage_commit_flag",
                type: serverWidget.FieldType.CHECKBOX,
                label: "已选择数据",
                container: 'custpage_group_srch_cond'
            });
            // 隐藏字段
            commitFlagField.updateDisplayType({displayType: "HIDDEN"});

            log.audit('parameters',parameters);
            //回显
            form.updateDefaultValues({
                //查询条件
                custpage_subsidiary: parameters["custpage_subsidiary"],
                custpage_purchaser: parameters["custpage_purchaser"],
                custpage_vendor: parameters["custpage_vendor"],
                custpage_period: parameters["custpage_period"],
                //基础信息
                custpage_invoice_date: parameters["custpage_invoice_date"],
                // custpage_invoice_number: parameters["custpage_invoice_number"],

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
            // // 全选、取消全选
            // sublist.addButton({
            //     id: 'custpage_sublist_btn_selectall',
            //     label: "全部勾选",
            //     functionName: "selectAll"
            // });
            // sublist.addButton({
            //     id: 'custpage_sublist_btn_deselectall',
            //     label: "全部取消",
            //     functionName: "deselectAll"
            // });
            // // 添加上一页按钮
            // sublist.addButton({
            //     id: 'custpage_sublist_btn_prevpage',
            //     label: "上一页",
            //     functionName: "prevPage"
            // });
            //
            // // 添加下一页按钮
            // sublist.addButton({
            //     id: 'custpage_sublist_btn_nextpage',
            //     label: "下一页",
            //     functionName: "nextPage"
            // });
            // 分页相关
            var pagedIndex = data["pageId"];
            var pagedNum = data["pageSize"] || 200;
            var pagedTotal = data["dataCount"] || 0;
            // 计算总页数
            var totalPages = Math.ceil(pagedTotal / pagedNum);
            var pagedIdxField = form.addField({
                id: 'custpage_paged_index_detail',
                label: 'PAGED_INDEX_DETAIL',
                type: serverWidget.FieldType.INTEGER,
            });
            pagedIdxField.defaultValue = pagedIndex;
            pagedIdxField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN,
            });

            var pagedtotalField = form.addField({
                id: 'custpage_total_pages_detail',
                label: 'PAGED_INDEX_DETAIL',
                type: serverWidget.FieldType.INTEGER,
            });
            pagedtotalField.defaultValue = totalPages;
            pagedtotalField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN,
            });


            // if (pagedTotal > 0) {
            //     // 更新帮助文本显示分页信息
            //     sublist.helpText =
            //         '<div style="text-align:left;">' +
            //         // app.getPagedSelect("detail", pagedIndex, pagedTotal, pagedNum) +
            //         '<span style="margin-left: 10px;">' +
            //         "当前第" + pagedIndex + "页，共" + totalPages + "页" +
            //         '</span></div>';
            // }
            sublist.addField(
                {id: 'custpage_sublist_checkbox', type: 'checkbox', label: "选择"});
            sublist.addField({
                id: 'custpage_sublist_index',
                type: "TEXT",
                label: '<span style="color: #c77f02;">*  </span>' + "序号"
            });
            sublist.addField({id: 'custpage_sublist_indextext', type: "TEXT", label: "序号"}).
                updateDisplayType({displayType: 'hidden'});

            //系统对账单号
            sublist.addField({id: 'custpage_sublist_statement_number', type: 'TEXT', label: "系统对账单号"})
            sublist.addField({id: 'custpage_sublist_statement_number_hide', type: 'TEXT', label: "系统对账单号"}).updateDisplayType({displayType: 'hidden'});
            //采购订单号
            sublist.addField({id: 'custpage_sublist_pur_number', type: 'TEXT', label: "采购订单号"})
            sublist.addField({id: 'custpage_sublist_pur_number_hide', type: 'TEXT', label: "采购订单号"}).updateDisplayType({displayType: 'hidden'});
            //入库单号
            sublist.addField({id: 'custpage_sublist_receipt_number', type: 'TEXT', label: "入库单号"})
            sublist.addField({id: 'custpage_sublist_receipt_number_hide', type: 'TEXT', label: "入库单号"}).updateDisplayType({displayType: 'hidden'});
            //系统账单号
            sublist.addField({id: 'custpage_sublist_bill_number', type: 'TEXT', label: "系统账单号"})
            sublist.addField({id: 'custpage_sublist_bill_number_hide', type: 'TEXT', label: "系统账单号"}).updateDisplayType({displayType: 'hidden'});
            //物料名称
            sublist.addField({id: 'custpage_sublist_item', type: 'TEXT', label: "物料名称"})
            sublist.addField({id: 'custpage_sublist_item_hide', type: 'TEXT', label: "物料名称"}).updateDisplayType({displayType: 'hidden'});
            //货币
            sublist.addField({id: 'custpage_sublist_currency', type: 'TEXT', label: "货币"})
            sublist.addField({id: 'custpage_sublist_currency_hide', type: 'TEXT', label: "货币"}).updateDisplayType({displayType: 'hidden'});
            //数量
            sublist.addField({id: 'custpage_sublist_number', type: 'TEXT', label: "数量"})
            sublist.addField({id: 'custpage_sublist_number_hide', type: 'TEXT', label: "数量"}).updateDisplayType({displayType: 'hidden'});
            //税率
            sublist.addField({id: 'custpage_sublist_tax', type: 'TEXT', label: "税率"})
            sublist.addField({id: 'custpage_sublist_tax_hide', type: 'TEXT', label: "税率"}).updateDisplayType({displayType: 'hidden'});
            //含税单价
            sublist.addField({id: 'custpage_sublist_price', type: 'TEXT', label: "含税单价"})
            sublist.addField({id: 'custpage_sublist_price_hide', type: 'TEXT', label: "含税单价"}).updateDisplayType({displayType: 'hidden'});
            //总额
            sublist.addField({id: 'custpage_sublist_amount_all', type: 'TEXT', label: "总额"})
            sublist.addField({id: 'custpage_sublist_amount_all_hide', type: 'TEXT', label: "总额"}).updateDisplayType({displayType: 'hidden'});
            //已开税票数量
            sublist.addField({id: 'custpage_sublist_invoices_issued', type: 'TEXT', label: "已开税票数量"})
            sublist.addField({id: 'custpage_sublist_invoices_issued_hide', type: 'TEXT', label: "已开税票数量"}).updateDisplayType({displayType: 'hidden'});
            //开税票数量
            sublist.addField({id: 'custpage_sublist_issued_input', type: 'TEXT', label: "开税票数量"})
            sublist.addField({id: 'custpage_sublist_issued_input_hide', type: 'TEXT', label: "开税票数量"}).updateDisplayType({displayType: 'hidden'});
            //开税票金额
            sublist.addField({id: 'custpage_sublist_amount_input', type: 'TEXT', label: "开税票金额"})
            sublist.addField({id: 'custpage_sublist_amount_input_hide', type: 'TEXT', label: "开税票金额"}).updateDisplayType({displayType: 'hidden'});
            //退税率
            sublist.addField({id: 'custpage_sublist_taxrebate_rate', type: 'TEXT', label: "退税率"})
            sublist.addField({id: 'custpage_sublist_taxrebate_rate_hide', type: 'TEXT', label: "退税率"}).updateDisplayType({displayType: 'hidden'});
            //退税金额
            sublist.addField({id: 'custpage_sublist_taxrefund_amount', type: 'TEXT', label: "退税金额"})
            sublist.addField({id: 'custpage_sublist_taxrefund_amount_hide', type: 'TEXT', label: "退税金额"}).updateDisplayType({displayType: 'hidden'});
            //出口免退税金额
            sublist.addField({id: 'custpage_sublist_refund_amount', type: 'TEXT', label: "出口免退税金额"})
            sublist.addField({id: 'custpage_sublist_refund_amount_hide', type: 'TEXT', label: "出口免退税金额"}).updateDisplayType({displayType: 'hidden'});
            //预付付款
            sublist.addField({id: 'custpage_sublist_advance_payment', type: 'TEXT', label: "预付付款"})
            sublist.addField({id: 'custpage_sublist_advance_payment_hide', type: 'TEXT', label: "预付付款"}).updateDisplayType({displayType: 'hidden'});
            //未付款金额
            sublist.addField({id: 'custpage_sublist_unpaid_amount', type: 'TEXT', label: "未付款金额"})
            sublist.addField({id: 'custpage_sublist_unpaid_amount_hide', type: 'TEXT', label: "未付款金额"}).updateDisplayType({displayType: 'hidden'});

            //行唯一键
            sublist.addField({id: 'custpage_sublist_orderkey_end_hide', type: 'TEXT', label: "订单后续唯一键"}).updateDisplayType({displayType: 'hidden'});
            //类型
            sublist.addField({id: 'custpage_sublist_type_hide', type: 'TEXT', label: "类型"}).updateDisplayType({displayType: 'hidden'});

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
                // 系统对账单
                if (value["vendororder"]) sublist.setSublistValue({
                    id: "custpage_sublist_statement_number",
                    value: value["vendororder"],
                    line: index,
                });
                if (value["vendororder"]) sublist.setSublistValue({
                    id: "custpage_sublist_statement_number_hide",
                    value: value["vendororder"],
                    line: index,
                });
                // 采购订单号
                if (value["puorder"]) sublist.setSublistValue({
                    id: "custpage_sublist_pur_number",
                    value: value["puorder"],
                    line: index,
                });
                if (value["puorderId"]) sublist.setSublistValue({
                    id: "custpage_sublist_pur_number_hide",
                    value: value["puorderId"],
                    line: index,
                });
                // 入库单号
                if (value["receipt"]) sublist.setSublistValue({
                    id: "custpage_sublist_receipt_number",
                    value: value["receipt"],
                    line: index,
                });
                if (value["receiptId"]) sublist.setSublistValue({
                    id: "custpage_sublist_receipt_number_hide",
                    value: value["receiptId"],
                    line: index,
                });
                // 系统账单号
                if (value["order"]) sublist.setSublistValue({
                    id: "custpage_sublist_bill_number",
                    value: value["order"],
                    line: index,
                });
                if (value["orderId"]) sublist.setSublistValue({
                    id: "custpage_sublist_bill_number_hide",
                    value: value["orderId"],
                    line: index,
                });
                // 物料名称
                if (value["itemName"]) sublist.setSublistValue({
                    id: "custpage_sublist_item",
                    value: value["itemName"],
                    line: index,
                });
                if (value["item"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_hide",
                    value: value["item"],
                    line: index,
                });
                // 货币
                if (value["currency"]) sublist.setSublistValue({
                    id: "custpage_sublist_currency",
                    value: value["currency"],
                    line: index,
                });
                if (value["currency"]) sublist.setSublistValue({
                    id: "custpage_sublist_currency_hide",
                    value: value["currency"],
                    line: index,
                });
                // 数量
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
                // 税率
                if (value["taxcode"]) sublist.setSublistValue({
                    id: "custpage_sublist_tax",
                    value: value["taxcode"],
                    line: index,
                });
                if (value["taxcode"]) sublist.setSublistValue({
                    id: "custpage_sublist_tax_hide",
                    value: value["taxcode"],
                    line: index,
                });
                // 含税单价
                if (value["taxrate"]) sublist.setSublistValue({
                    id: "custpage_sublist_price",
                    value: value["taxrate"],
                    line: index,
                });
                if (value["taxrate"]) sublist.setSublistValue({
                    id: "custpage_sublist_price_hide",
                    value: value["taxrate"],
                    line: index,
                });
                // 总额
                if (value["grossamount"]) sublist.setSublistValue({
                    id: "custpage_sublist_amount_all",
                    value: value["grossamount"],
                    line: index,
                });
                if (value["grossamount"]) sublist.setSublistValue({
                    id: "custpage_sublist_amount_all_hide",
                    value: value["grossamount"],
                    line: index,
                });
                // // 已开税票数量
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_invoices_issued",
                //     value: value["date"],
                //     line: index,
                // });
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_invoices_issued_hide",
                //     value: value["date"],
                //     line: index,
                // });
                // // 开税票数量
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_issued_input",
                //     value: value["date"],
                //     line: index,
                // });
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_issued_input_hide",
                //     value: value["date"],
                //     line: index,
                // });
                // // 开税票金额
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_amount_input",
                //     value: value["date"],
                //     line: index,
                // });
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_amount_input_hide",
                //     value: value["date"],
                //     line: index,
                // });
                // // 退税率
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_taxrebate_rate",
                //     value: value["date"],
                //     line: index,
                // });
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_taxrebate_rate_hide",
                //     value: value["date"],
                //     line: index,
                // });
                // // 退税金额
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_taxrefund_amount",
                //     value: value["date"],
                //     line: index,
                // });
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_taxrefund_amount_hide",
                //     value: value["date"],
                //     line: index,
                // });
                // // 出口免退税金额
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_refund_amount",
                //     value: value["date"],
                //     line: index,
                // });
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_refund_amount_hide",
                //     value: value["date"],
                //     line: index,
                // });
                // // 预付付款
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_advance_payment",
                //     value: value["date"],
                //     line: index,
                // });
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_advance_payment_hide",
                //     value: value["date"],
                //     line: index,
                // });
                // // 未付款金额
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_unpaid_amount",
                //     value: value["date"],
                //     line: index,
                // });
                // if (value["date"]) sublist.setSublistValue({
                //     id: "custpage_sublist_unpaid_amount_hide",
                //     value: value["date"],
                //     line: index,
                // });
                //行唯一键
                if (value["lineId"]) sublist.setSublistValue({
                    id: "custpage_sublist_orderkey_end_hide",
                    value: value["lineId"],
                    line: index,
                });
                if (value["type"]) sublist.setSublistValue({
                    id: "custpage_sublist_type_hide",
                    value: value["type"],
                    line: index,
                });
            });

        }

        function createReconciliation(adData) {
            var mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE
            });

            //设置要执行的 Map/Reduce 脚本的部署ID
            mrTask.scriptId = 'customscript_swc_mr_inputinvoice';
            //设置部署ID
            mrTask.deploymentId = 'customdeploy_swc_mr_inputinvoice';

            log.audit('adData',adData);
            //传递参数给 Map/Reduce 脚本
            mrTask.params = {
                // 这些参数可以在 Map/Reduce 脚本的 context.param1, context.param2 中获取
                'custscript_inputInvoice_json': JSON.stringify(adData),
            };

            var taskId = mrTask.submit();

            log.audit('taskId',taskId);
            return taskId;
        }
        return {onRequest}

    });
