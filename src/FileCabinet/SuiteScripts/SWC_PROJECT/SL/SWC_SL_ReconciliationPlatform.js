/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
const SUBMIST_STATUS = "1";
const PAGE_SIZE = 500;// 子列表页面大小
const SUBMIST_STATUS_2 = "2";
define(["N/ui/serverWidget","N/runtime","N/record",'N/task',"../common/SWC_Translate","../APP/SWC_APP_ReconciliationPlatform"],

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
            var form = serverWidget.createForm({title: "综合对账平台"});
            // 设置客户端脚本
            form.clientScriptModulePath = "../CS/SWC_CS_ReconciliationPlatform";
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
            // form.addFieldGroup({
            //     id: "custpage_group_write_cond",
            //     label: SWC_Translate.translate("账龄金额"),
            //     tab: "",
            //     isCollapsible: true,
            // });

            // form.addFieldGroup({
            //     id: "custpage_group_sum",
            //     label: SWC_Translate.translate("金额合计"),
            //     tab: "",
            //     isCollapsible: true,
            // });

            // 屏幕遮罩
            var hidden_field = form.addField(
                {id: 'hidden_info', type: serverWidget.FieldType.INLINEHTML, label: '屏幕遮罩'});
            hidden_field.defaultValue = '<div id="timeoutblocker" style="position: fixed; z-index: 10000; top: 0px; left: 0px; height: 100%; width: 100%; margin: 5px 0px; background-color: rgb(155, 155, 155); opacity: 0.6;"><span style="width:100%;height:100%;line-height:700px;text-align:center;display:block;font-weight: bold; color: red;font-size:20px">' +
                "数据处理中，请稍后" + '</span></div>';
            var userId = runtime.getCurrentUser().id;

            var subsidiaryId = parameters["custpage_subsidiary"];
            //订单类型
            var typeField = form.addField({
                id: "custpage_type",
                type: serverWidget.FieldType.MULTISELECT,
                label: SWC_Translate.translate("订单类型 *"),
                source: 'customlist_swc_po_type',
                container: 'custpage_group_srch_cond',
            });

            //线下对账单号
            var xxdzdField = form.addField({
                id: "custpage_xxdzd",
                type: serverWidget.FieldType.TEXT,
                label: SWC_Translate.translate("线下对账单号"),
                container: 'custpage_group_srch_cond',
            });

            //子公司
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

            var customerField = form.addField({
                id: "custpage_vendor",
                type: serverWidget.FieldType.SELECT,
                label: SWC_Translate.translate("供应商"),
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

            // form.addField({
            //     id: "custpage_date",
            //     type: serverWidget.FieldType.TEXT,
            //     label: SWC_Translate.translate("账期"),
            //     container: 'custpage_group_srch_cond',
            // });

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

            form.addField({
                id: "custpage_demand",
                type: serverWidget.FieldType.SELECT,
                label: "备货计划",
                source: 'customrecord_swc_demand_plan',
                container: 'custpage_group_srch_cond',
            });

            form.addField({
                id: "custpage_start_date",
                type: serverWidget.FieldType.DATE,
                label: SWC_Translate.translate("单据：开始日期"),
                container: 'custpage_group_srch_cond',
            });

            form.addField({
                id: "custpage_deadline",
                type: serverWidget.FieldType.DATE,
                label: SWC_Translate.translate("单据：截至日期"),
                container: 'custpage_group_srch_cond',
            });

            form.addField({
                id: "custpage_dead_start_date",
                type: serverWidget.FieldType.DATE,
                label: SWC_Translate.translate("截至日期范围：开始日期"),
                container: 'custpage_group_srch_cond',
            });

            form.addField({
                id: "custpage_dead_deadline",
                type: serverWidget.FieldType.DATE,
                label: SWC_Translate.translate("截至日期范围：截至日期"),
                container: 'custpage_group_srch_cond',
            });

            //基础信息
            form.addField({
                id: "custpage_departments",
                type: serverWidget.FieldType.SELECT,
                label: "提出部门 *",
                source: 'customlist_swc_pay_departments',
                container: 'custpage_group_data_cond',
            });
            form.addField({
                id: "custpage_reconciliation_date",
                type: serverWidget.FieldType.DATE,
                label: SWC_Translate.translate("对账日期"),
                container: 'custpage_group_data_cond',
            });
            form.addField({
                id: "custpage_main_memo",
                type: serverWidget.FieldType.TEXT,
                label: SWC_Translate.translate("备注"),
                container: 'custpage_group_data_cond',
            });
            var recAmountField = form.addField({
                id: "custpage_reconciliation_amount_total",
                type: serverWidget.FieldType.TEXT,
                label: SWC_Translate.translate("对账总金额"),
                container: 'custpage_group_data_cond',
            });
            recAmountField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED,
            });

            var payableAmountField = form.addField({
                id: "custpage_payable_amount_total",
                type: serverWidget.FieldType.TEXT,
                label: SWC_Translate.translate("应付总金额"),
                container: 'custpage_group_data_cond',
            });
            payableAmountField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED,
            });





            // var pageField = form.addField({
            //     id: "custpage_page",
            //     type: serverWidget.FieldType.SELECT,
            //     label: SWC_Translate.translate("每页条数"),
            //     container: 'custpage_group_srch_cond',
            // });


            // //账龄金额
            // //未到账金额
            // var unsettledAmountField = form.addField({
            //     id: "custpage_amount_unsettled",
            //     type: serverWidget.FieldType.TEXT,
            //     label: SWC_Translate.translate("未到期金额"),
            //     container: 'custpage_group_write_cond',
            // });
            // //1 - 30 days
            // form.addField({
            //     id: "custpage_amount_firstmonth",
            //     type: serverWidget.FieldType.TEXT,
            //     label: SWC_Translate.translate("1 - 30 days"),
            //     container: 'custpage_group_write_cond',
            // });
            // //31 - 60 days
            // form.addField({
            //     id: "custpage_amount_secondmonth",
            //     type: serverWidget.FieldType.TEXT,
            //     label: SWC_Translate.translate("31 - 60 days"),
            //     container: 'custpage_group_write_cond',
            // });
            // //61 - 90 days
            // form.addField({
            //     id: "custpage_amount_thirdmonth",
            //     type: serverWidget.FieldType.TEXT,
            //     label: SWC_Translate.translate("61 - 90 days"),
            //     container: 'custpage_group_write_cond',
            // });
            // //> 90 days
            // form.addField({
            //     id: "custpage_amount_othermonth",
            //     type: serverWidget.FieldType.TEXT,
            //     label: SWC_Translate.translate("> 90 days"),
            //     container: 'custpage_group_write_cond',
            // });
            // //总金额
            // var sumAmountField = form.addField({
            //     id: "custpage_amount_sum",
            //     type: serverWidget.FieldType.TEXT,
            //     label: SWC_Translate.translate("总金额"),
            //     container: 'custpage_group_write_cond',
            // });

            // //金额合计
            // var totalAmountField = form.addField({
            //     id: "custpage_amount_total",
            //     type: serverWidget.FieldType.TEXT,
            //     label: SWC_Translate.translate("含税金额合计"),
            //     container: 'custpage_group_sum',
            // });
            //
            // totalAmountField.updateDisplayType({
            //     displayType: serverWidget.FieldDisplayType.DISABLED,
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
            // 隐藏字段
            commitFlagField.updateDisplayType({displayType: "HIDDEN"});
            // 生成条件检测
            var gcFlagField = form.addField({
                id: "custpage_gc_flag",
                type: serverWidget.FieldType.TEXT,
                label: "合并生成单据条件",
                container: 'custpage_group_srch_cond'
            });
            gcFlagField.updateDisplayType({displayType: "HIDDEN"});

            log.audit('parameters',parameters);
            //回显
            form.updateDefaultValues({
                //查询条件
                custpage_subsidiary: parameters["custpage_subsidiary"],
                custpage_vendor: parameters["custpage_vendor"],
                custpage_currency: parameters["custpage_currency"],
                custpage_start_date: parameters["custpage_start_date"],
                custpage_deadline: parameters["custpage_deadline"],
                custpage_dead_start_date: parameters["custpage_dead_start_date"],
                custpage_dead_deadline: parameters["custpage_dead_deadline"],
                custpage_type: parameters["custpage_type"],
                custpage_demand: parameters["custpage_demand"],
                custpage_xxdzd: parameters["custpage_xxdzd"],
                //基础信息
                custpage_reconciliation_date: parameters["custpage_reconciliation_date"],
                custpage_main_memo: parameters["custpage_main_memo"],
                custpage_reconciliation_amount_total: parameters["custpage_reconciliation_amount_total"],
                custpage_payable_amount_total: parameters["custpage_payable_amount_total"],
                custpage_departments: parameters["custpage_departments"],

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
            // var sublistName = SWC_Translate.translate("结果列：共") + data["dataCount"] + SWC_Translate.translate("条");
            // var sublist = form.addSublist({
            //     id: "custpage_sublist_detail",
            //     label: sublistName,
            //     type: serverWidget.SublistType["LIST"]
            // });
            // // 全选、取消全选
            // sublist.addButton({
            //     id: 'custpage_sublist_btn_selectall',
            //     label: SWC_Translate.translate("全部勾选"),
            //     functionName: "selectAll"
            // });
            // sublist.addButton({
            //     id: 'custpage_sublist_btn_deselectall',
            //     label: SWC_Translate.translate("全部取消"),
            //     functionName: "deselectAll"
            // });
            // // 添加上一页按钮
            // sublist.addButton({
            //     id: 'custpage_sublist_btn_prevpage',
            //     label: SWC_Translate.translate("上一页"),
            //     functionName: "prevPage"
            // });
            //
            // // 添加下一页按钮
            // sublist.addButton({
            //     id: 'custpage_sublist_btn_nextpage',
            //     label: SWC_Translate.translate("下一页"),
            //     functionName: "nextPage"
            // });
            // // 分页相关
            // var pagedIndex = data["pageId"];
            // var pagedNum = data["pageSize"] || 200;
            // var pagedTotal = data["dataCount"] || 0;
            // // 计算总页数
            // var totalPages = Math.ceil(pagedTotal / pagedNum);
            // var pagedIdxField = form.addField({
            //     id: 'custpage_paged_index_detail',
            //     label: 'PAGED_INDEX_DETAIL',
            //     type: serverWidget.FieldType.INTEGER,
            // });
            // pagedIdxField.defaultValue = pagedIndex;
            // pagedIdxField.updateDisplayType({
            //     displayType: serverWidget.FieldDisplayType.HIDDEN,
            // });
            //
            // var pagedtotalField = form.addField({
            //     id: 'custpage_total_pages_detail',
            //     label: 'PAGED_INDEX_DETAIL',
            //     type: serverWidget.FieldType.INTEGER,
            // });
            // pagedtotalField.defaultValue = totalPages;
            // pagedtotalField.updateDisplayType({
            //     displayType: serverWidget.FieldDisplayType.HIDDEN,
            // });
            //
            //
            // if (pagedTotal > 0) {
            //     // 更新帮助文本显示分页信息
            //     sublist.helpText =
            //         '<div style="text-align:left;">' +
            //         // app.getPagedSelect("detail", pagedIndex, pagedTotal, pagedNum) +
            //         '<span style="margin-left: 10px;">' +
            //         SWC_Translate.translate("当前第") + pagedIndex + SWC_Translate.translate("页，共") + totalPages + SWC_Translate.translate("页") +
            //         '</span></div>';
            // }
            // sublist.addField(
            //     {id: 'custpage_sublist_checkbox', type: 'checkbox', label: SWC_Translate.translate("选择")});
            // sublist.addField({
            //     id: 'custpage_sublist_index',
            //     type: "TEXT",
            //     label: '<span style="color: #c77f02;">*  </span>' + SWC_Translate.translate("序号")
            // });
            // sublist.addField({id: 'custpage_sublist_indextext', type: "TEXT", label: SWC_Translate.translate("序号")}).
            // updateDisplayType({displayType: 'hidden'});
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
            //单据ID
            sublist.addField({id: 'custpage_sublist_documentid',type: 'TEXT', label: SWC_Translate.translate("单据ID")});
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
            //供应商
            sublist.addField({id: 'custpage_sublist_vendor', type: 'TEXT', label: SWC_Translate.translate("供应商")})
            sublist.addField({id: 'custpage_sublist_vendor_hide', type: 'TEXT', label: SWC_Translate.translate("供应商")}).updateDisplayType({displayType: 'hidden'});
            //货币
            sublist.addField({id: 'custpage_sublist_currency', type: 'TEXT', label: SWC_Translate.translate("货币")})
            sublist.addField({id: 'custpage_sublist_currency_hide', type: 'TEXT', label: SWC_Translate.translate("货币")}).updateDisplayType({displayType: 'hidden'});
            //日期
            sublist.addField({id: 'custpage_sublist_date', type: 'DATE', label: SWC_Translate.translate("单据日期")})
            sublist.addField({id: 'custpage_sublist_date_hide', type: 'DATE', label: SWC_Translate.translate("单据日期")}).updateDisplayType({displayType: 'hidden'});
            //类型
            sublist.addField({id: 'custpage_sublist_type', type: 'TEXT', label: SWC_Translate.translate("单据类型")})
            sublist.addField({id: 'custpage_sublist_type_hide', type: 'TEXT', label: SWC_Translate.translate("单据类型")}).updateDisplayType({displayType: 'hidden'});
            //单据号
            sublist.addField({id: 'custpage_sublist_invoice_number', type: 'TEXT', label: SWC_Translate.translate("单据号")})
            sublist.addField({id: 'custpage_sublist_invoice_number_hide', type: 'TEXT', label: SWC_Translate.translate("单据号")}).updateDisplayType({displayType: 'hidden'});
            //订单号
            sublist.addField({id: 'custpage_sublist_order_id', type: 'TEXT', label: SWC_Translate.translate("订单号")})
            sublist.addField({id: 'custpage_sublist_order_id_hide', type: 'TEXT', label: SWC_Translate.translate("订单号")}).updateDisplayType({displayType: 'hidden'});//为什么有这个字段加上样式(hidden或entry都可以)，因为不加样式，在CS里getCurrentSublistValue取不到值
            //SKU编码
            sublist.addField({id: 'custpage_sublist_sku_id', type: 'TEXT', label: SWC_Translate.translate("SKU编码")})
            sublist.addField({id: 'custpage_sublist_sku_id_hide', type: 'TEXT', label: SWC_Translate.translate("SKU编码")}).updateDisplayType({displayType: 'hidden'});

            //报关货品名称
            sublist.addField({id: 'custpage_sublist_item_name', type: 'TEXT', label: SWC_Translate.translate("报关货品名称")})
            sublist.addField({id: 'custpage_sublist_item_name_hide', type: 'TEXT', label: SWC_Translate.translate("报关货品名称")}).updateDisplayType({displayType: 'hidden'});

            //SKU编码
            sublist.addField({id: 'custpage_sublist_item_unit', type: 'TEXT', label: SWC_Translate.translate("报关数量单位")})
            sublist.addField({id: 'custpage_sublist_item_unit_hide', type: 'TEXT', label: SWC_Translate.translate("报关数量单位")}).updateDisplayType({displayType: 'hidden'});

            //SKU产品描述
            sublist.addField({id: 'custpage_sublist_sku_name', type: 'TEXT', label: SWC_Translate.translate("SKU产品描述")})
            sublist.addField({id: 'custpage_sublist_sku_name_hide', type: 'TEXT', label: SWC_Translate.translate("SKU产品描述")}).updateDisplayType({displayType: 'hidden'});

            sublist.addField({id: 'custpage_sublist_demand_line', type: 'SELECT',source: 'customrecord_swc_demand_plan' , label: "备货计划"}).updateDisplayType({displayType: 'disabled'});
            sublist.addField({id: 'custpage_sublist_demand_line_hide', type: 'SELECT',source: 'customrecord_swc_demand_plan' , label: "备货计划"}).updateDisplayType({displayType: 'hidden'});

            //数量
            sublist.addField({id: 'custpage_sublist_sku_number', type: 'FLOAT', label: SWC_Translate.translate("数量")})
            sublist.addField({id: 'custpage_sublist_sku_number_hide', type: 'FLOAT', label: SWC_Translate.translate("数量")}).updateDisplayType({displayType: 'hidden'});
            //SKU单价
            sublist.addField({id: 'custpage_sublist_sku_price', type: 'CURRENCY', label: SWC_Translate.translate("含税单价")})
            sublist.addField({id: 'custpage_sublist_sku_price_hide', type: 'CURRENCY', label: SWC_Translate.translate("含税单价")}).updateDisplayType({displayType: 'hidden'});
            //含税总额
            sublist.addField({id: 'custpage_sublist_amount_sum', type: 'CURRENCY', label: SWC_Translate.translate("含税总额")})
            sublist.addField({id: 'custpage_sublist_amount_sum_hide', type: 'CURRENCY', label: SWC_Translate.translate("含税总额")}).updateDisplayType({displayType: 'hidden'});
            //已核销金额
            sublist.addField({id: 'custpage_sublist_amount_sold', type: 'CURRENCY', label: SWC_Translate.translate("已核销金额（预付核销）")})
            sublist.addField({id: 'custpage_sublist_amount_sold_hide', type: 'CURRENCY', label: SWC_Translate.translate("已核销金额（预付核销）")}).updateDisplayType({displayType: 'hidden'});
            //应付金额
            sublist.addField({id: 'custpage_sublist_amount_unresolved', type: 'CURRENCY', label: SWC_Translate.translate("应付金额")})
            sublist.addField({id: 'custpage_sublist_amount_unresolved_hide', type: 'CURRENCY', label: SWC_Translate.translate("应付金额")}).updateDisplayType({displayType: 'hidden'});
            //到期日
            sublist.addField({id: 'custpage_sublist_dateline', type: 'DATE', label: SWC_Translate.translate("到期日")})
            sublist.addField({id: 'custpage_sublist_dateline_hide', type: 'DATE', label: SWC_Translate.translate("到期日")}).updateDisplayType({displayType: 'hidden'});
            //逾期天数
            sublist.addField({id: 'custpage_sublist_pastdue_days', type: 'FLOAT', label: SWC_Translate.translate("剩余天数")})
            sublist.addField({id: 'custpage_sublist_pastdue_days_hide', type: 'FLOAT', label: SWC_Translate.translate("剩余天数")}).updateDisplayType({displayType: 'hidden'});

            //行唯一键
            sublist.addField({id: 'custpage_sublist_startkey_hide', type: 'TEXT', label: "订单初始唯一键"}).updateDisplayType({displayType: 'hidden'});
            sublist.addField({id: 'custpage_sublist_orderkey_hide', type: 'TEXT', label: "订单后续唯一键"}).updateDisplayType({displayType: 'hidden'});
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
                if (value["type2"]) sublist.setSublistValue({
                    id: "custpage_sublist_type_2",
                    value: value["type2"],
                    line: index,
                });
                if (value["type2"]) sublist.setSublistValue({
                    id: "custpage_sublist_type_2_hide",
                    value: value["type2"],
                    line: index,
                });
                // id
                if (value["id"]) sublist.setSublistValue({
                    id: "custpage_sublist_documentid",
                    value: value["id"],
                    line: index,
                });
                if (value["id"]) sublist.setSublistValue({
                    id: "custpage_sublist_documentid_hide",
                    value: value["id"],
                    line: index,
                });
                //行ID
                if (value["lineid"]) sublist.setSublistValue({
                    id: "custpage_sublist_lineid",
                    value: value["lineid"],
                    line: index,
                });
                if (value["lineid"]) sublist.setSublistValue({
                    id: "custpage_sublist_lineid_hide",
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
                //子公司
                if (value["subsidiaryname"]) sublist.setSublistValue({
                    id: "custpage_sublist_subsidiary",
                    value: value["subsidiaryname"],
                    line: index,
                });
                if (value["subsidiaryid"]) sublist.setSublistValue({
                    id: "custpage_sublist_subsidiary_hide",
                    value: value["subsidiaryid"],
                    line: index,
                });
                //供应商
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
                //币种
                if (value["currencyname"]) sublist.setSublistValue({
                    id: "custpage_sublist_currency",
                    value: value["currencyname"],
                    line: index,
                });
                if (value["currencyid"]) sublist.setSublistValue({
                    id: "custpage_sublist_currency_hide",
                    value: value["currencyid"],
                    line: index,
                });
                //单据日期
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
                //类型
                if (value["type"]) sublist.setSublistValue({
                    id: "custpage_sublist_type",
                    value: value["type"],
                    line: index,
                });
                if (value["type"]) sublist.setSublistValue({
                    id: "custpage_sublist_type_hide",
                    value: value["type"],
                    line: index,
                });
                //单据号
                if (value["trannumber"]) sublist.setSublistValue({
                    id: "custpage_sublist_invoice_number",
                    value: value["trannumber"],
                    line: index,
                });
                if (value["trannumber"]) sublist.setSublistValue({
                    id: "custpage_sublist_invoice_number_hide",
                    value: value["trannumber"],
                    line: index,
                });
                //订单号
                if (value["purnumber"]) sublist.setSublistValue({
                    id: "custpage_sublist_order_id",
                    value: value["purnumber"],
                    line: index,
                });
                if (value["purId"]) sublist.setSublistValue({
                    id: "custpage_sublist_order_id_hide",
                    value: value["purId"],
                    line: index,
                });
                //货品编码
                if (value["skuCode"]) sublist.setSublistValue({
                    id: "custpage_sublist_sku_id",
                    value: value["skuCode"],
                    line: index,
                });
                if (value["skuid"]) sublist.setSublistValue({
                    id: "custpage_sublist_sku_id_hide",
                    value: value["skuid"],
                    line: index,
                });

                //报关
                if (value["bgname"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_name",
                    value: value["bgname"],
                    line: index,
                });
                if (value["bgname"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_name_hide",
                    value: value["bgname"],
                    line: index,
                });

                //报关
                if (value["bgunit"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_unit",
                    value: value["bgunit"],
                    line: index,
                });
                if (value["bgunit"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_unit_hide",
                    value: value["bgunit"],
                    line: index,
                });

                //产品描述
                if (value["skuname"]) sublist.setSublistValue({
                    id: "custpage_sublist_sku_name",
                    value: value["skuname"],
                    line: index,
                });
                if (value["skuname"]) sublist.setSublistValue({
                    id: "custpage_sublist_sku_name_hide",
                    value: value["skuname"],
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

                //数量
                if (value["skunumber"]) sublist.setSublistValue({
                    id: "custpage_sublist_sku_number",
                    value: value["skunumber"],
                    line: index,
                });
                if (value["skunumber"]) sublist.setSublistValue({
                    id: "custpage_sublist_sku_number_hide",
                    value: value["skunumber"],
                    line: index,
                });
                //单价
                if (value["skurate"] || value["skurate"] == 0) sublist.setSublistValue({
                    id: "custpage_sublist_sku_price",
                    value: value["skurate"],
                    line: index,
                });
                if (value["skurate"] || value["skurate"] == 0) sublist.setSublistValue({
                    id: "custpage_sublist_sku_price_hide",
                    value: value["skurate"],
                    line: index,
                });
                //含税总额
                if (value["amountsum"] || value["amountsum"] == 0) sublist.setSublistValue({
                    id: "custpage_sublist_amount_sum",
                    value: value["amountsum"],
                    line: index,
                });
                if (value["amountsum"] || value["amountsum"] == 0) sublist.setSublistValue({
                    id: "custpage_sublist_amount_sum_hide",
                    value: value["amountsum"],
                    line: index,
                });
                //已核销金额（预付核销）
                sublist.setSublistValue({
                    id: "custpage_sublist_amount_sold",
                    value: value["verifiedamount"],
                    line: index,
                });
                sublist.setSublistValue({
                    id: "custpage_sublist_amount_sold_hide",
                    value: value["verifiedamount"],
                    line: index,
                });
                //应付金额
                sublist.setSublistValue({
                    id: "custpage_sublist_amount_unresolved",
                    value: value["payableamount"],
                    line: index,
                });
                sublist.setSublistValue({
                    id: "custpage_sublist_amount_unresolved_hide",
                    value: value["payableamount"],
                    line: index,
                });
                //到期日
                if (value["duedate"]) sublist.setSublistValue({
                    id: "custpage_sublist_dateline",
                    value: value["duedate"],
                    line: index,
                });
                if (value["duedate"]) sublist.setSublistValue({
                    id: "custpage_sublist_dateline_hide",
                    value: value["duedate"],
                    line: index,
                });
                //剩余天数
                sublist.setSublistValue({
                    id: "custpage_sublist_pastdue_days",
                    value: value["days"],
                    line: index,
                });
                sublist.setSublistValue({
                    id: "custpage_sublist_pastdue_days_hide",
                    value: value["days"],
                    line: index,
                });
                //唯一键
                if (value["startkey"]) sublist.setSublistValue({
                    id: "custpage_sublist_startkey_hide",
                    value: value["startkey"],
                    line: index,
                });
                if (value["endkey"]) sublist.setSublistValue({
                    id: "custpage_sublist_orderkey_hide",
                    value: value["endkey"],
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
            mrTask.scriptId = 'customscript_swc_mr_reconciliation';
            //设置部署ID
            mrTask.deploymentId = 'customdeploy_swc_mr_reconciliation';

            log.audit('adData',adData);
            //传递参数给 Map/Reduce 脚本
            mrTask.params = {
                // 这些参数可以在 Map/Reduce 脚本的 context.param1, context.param2 中获取
                'custscript_reconciliation_json': JSON.stringify(adData),
            };

            var taskId = mrTask.submit();

            log.audit('taskId',taskId);
            return taskId;
        }

        return {onRequest}

    });