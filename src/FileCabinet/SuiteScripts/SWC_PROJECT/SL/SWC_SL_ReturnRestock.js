/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
const SUBMIST_STATUS = "1";
const PAGE_SIZE = 500;// 子列表页面大小
const SUBMIST_STATUS_2 = "2";
define(["N/ui/serverWidget","N/runtime","N/record",'N/task',"../common/SWC_Translate","../APP/SWC_APP_ReturnRestock"],

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
                    //生成库存转移单
                    log.audit("生成库存转移单");
                    let adData = JSON.parse(parameters["poData"]);
                    log.audit('生成库存转移单 数据',adData);
                    var taskId;
                    if (adData.flag == 1) {
                        taskId = createReconciliation(adData);
                    } else if (adData.flag == 2){
                        taskId = createInventoryadjustment(adData);
                    }

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
            }
                // else if (parameters["flag"] == SUBMIST_STATUS_2) {
                //     let adData2 = JSON.parse(parameters["adData"]);
                //     let taskId = adData2.taskId;
                //     var summary = task.checkStatus(taskId);
                //     log.audit('summary',summary);
                //     result["code"] = 200;
                //     result.data.status = summary.status;
                //     log.audit('result',result);
                //     response.write(JSON.stringify(result));
            // }
            else {
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
            var form = serverWidget.createForm({title: "退货上架平台"});
            // 设置客户端脚本
            form.clientScriptModulePath = "../CS/SWC_CS_ReturnRestock";
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
            log.audit('userId',userId);

            //店铺
            var customerField = form.addField({
                id: "custpage_customer",
                type: serverWidget.FieldType.SELECT,
                label: SWC_Translate.translate("店铺"),
                source: 'customer',
                container: 'custpage_group_srch_cond',
            });
            // var customerData = app.searchCustomer();
            // log.audit('customerData',customerData);
            // customerField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            // customerData.forEach(function (value) {
            //     customerField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });


            var locationData = app.searchLocation();
            //发货地点
            var shipLocationField = form.addField({
                id: "custpage_ship_location",
                type: serverWidget.FieldType.SELECT,
                label: SWC_Translate.translate("发货地点"),
                source: 'location',
                container: 'custpage_group_srch_cond',
            });
            // shipLocationField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            // locationData.forEach(function (value) {
            //     shipLocationField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });

            //退货地点
            var returnLocationField = form.addField({
                id: "custpage_return_location",
                type: serverWidget.FieldType.SELECT,
                label: "退货地点 *",
                source: 'location',
                container: 'custpage_group_srch_cond',
            });
            // returnLocationField.isMandatory = true;

            // returnLocationField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            // locationData.forEach(function (value) {
            //     returnLocationField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });

            //子公司
            var subField = form.addField({
                id: "custpage_sub",
                type: serverWidget.FieldType.SELECT,
                label: SWC_Translate.translate("子公司"),
                source: 'subsidiary',
                container: 'custpage_group_srch_cond',
            });

            subField.updateDisplayType({
                displayType : serverWidget.FieldDisplayType.DISABLED
            });
            // vendorField.isMandatory = true;
            // log.audit('子公司');
            // var subsidiaryData = app.searchSubsidiary();
            // log.audit('subsidiaryData',subsidiaryData);
            // subField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            // subsidiaryData.forEach(function (value) {
            //     subField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });

            //货品
            var itemField = form.addField({
                id: "custpage_item",
                type: serverWidget.FieldType.TEXT,
                label: SWC_Translate.translate("货品"),
                container: 'custpage_group_srch_cond',
            });
            //库存编号
            var batchField = form.addField({
                id: "custpage_batch_location",
                type: serverWidget.FieldType.TEXT,
                label: SWC_Translate.translate("库存编号"),
                container: 'custpage_group_srch_cond',
            });


            //基础信息
            //目的仓库
            var purposeField = form.addField({
                id: "custpage_purpose_location",
                type: serverWidget.FieldType.SELECT,
                label: SWC_Translate.translate("目的仓库 *"),
                source: 'location',
                container: 'custpage_group_data_cond',
            });
            // purposeField.isMandatory = true;

            // purposeField.addSelectOption({
            //     value: "",
            //     text: ""
            // });
            // locationData.forEach(function (value) {
            //     purposeField.addSelectOption({
            //         value: value.value,
            //         text: value.text
            //     })
            // });

            var memoField = form.addField({
                id: "custpage_memo",
                type: serverWidget.FieldType.TEXT,
                label: SWC_Translate.translate("备注"),
                container: 'custpage_group_data_cond',
            });


            var flagField = form.addField({
                id: "custpage_flag",
                type: serverWidget.FieldType.SELECT,
                label: SWC_Translate.translate("转移/销毁 *"),
                container: 'custpage_group_data_cond',
            });
            flagField.addSelectOption({
                value: "",
                text: ""
            });
            flagField.addSelectOption({
                value: 1,
                text: "转移"
            });
            flagField.addSelectOption({
                value: 2,
                text: "销毁"
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
            // // 生成条件检测
            // var gcFlagField = form.addField({
            //     id: "custpage_gc_flag",
            //     type: serverWidget.FieldType.TEXT,
            //     label: "合并生成单据条件",
            //     container: 'custpage_group_srch_cond'
            // });
            // gcFlagField.updateDisplayType({displayType: "HIDDEN"});

            log.audit('parameters',parameters);
            //回显
            form.updateDefaultValues({
                //查询条件
                custpage_customer: parameters["custpage_customer"],
                custpage_ship_location: parameters["custpage_ship_location"],
                custpage_return_location: parameters["custpage_return_location"],
                custpage_item: parameters["custpage_item"],
                custpage_sub: parameters["custpage_sub"],
                custpage_batch_location: parameters["custpage_batch_location"],
                //基础信息
                custpage_purpose_location: parameters["custpage_purpose_location"],
                custpage_memo: parameters["custpage_memo"],

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
            sublist.addField({id: 'custpage_sublist_indextext', type: "TEXT", label: "序号"}).updateDisplayType({displayType: 'hidden'});

            //发货店铺
            sublist.addField({id: 'custpage_sublist_customer',type: 'TEXT', label: "发货店铺"})
            sublist.addField({id: 'custpage_sublist_customer_hide', type: 'TEXT', label: "发货店铺"}).updateDisplayType({displayType: 'hidden'});

            //发货地点
            sublist.addField({id: 'custpage_sublist_ship_location',type: 'TEXT', label: "发货地点"})
            sublist.addField({id: 'custpage_sublist_ship_location_hide', type: 'TEXT', label: "发货地点"}).updateDisplayType({displayType: 'hidden'});

            //原销售单号
            sublist.addField({id: 'custpage_sublist_sono',type: 'TEXT', label: "原销售单号"})
            sublist.addField({id: 'custpage_sublist_sono_hide', type: 'TEXT', label: "原销售单号"}).updateDisplayType({displayType: 'hidden'});

            //平台单号
            sublist.addField({id: 'custpage_sublist_plat_orderid',type: 'TEXT', label: "平台单号"})
            sublist.addField({id: 'custpage_sublist_plat_orderid_hide', type: 'TEXT', label: "平台单号"}).updateDisplayType({displayType: 'hidden'});

            //退货地点
            sublist.addField({id: 'custpage_sublist_return_location',type: 'TEXT', label: "退货地点"})
            sublist.addField({id: 'custpage_sublist_return_location_hide', type: 'TEXT', label: "退货地点"}).updateDisplayType({displayType: 'hidden'});

            //子公司
            sublist.addField({id: 'custpage_sublist_sub',type: 'TEXT', label: "子公司"})
            sublist.addField({id: 'custpage_sublist_sub_hide', type: 'TEXT', label: "子公司"}).updateDisplayType({displayType: 'hidden'});

            //货品
            sublist.addField({id: 'custpage_sublist_item',type: 'TEXT', label: "货品"})
            sublist.addField({id: 'custpage_sublist_item_hide', type: 'TEXT', label: "货品"}).updateDisplayType({displayType: 'hidden'});

            //平台SKU
            sublist.addField({id: 'custpage_sublist_plat_sku',type: 'TEXT', label: "平台SKU"})
            sublist.addField({id: 'custpage_sublist_plat_sku_hide', type: 'TEXT', label: "平台SKU"}).updateDisplayType({displayType: 'hidden'});

            //库存编号
            sublist.addField({id: 'custpage_sublist_batch',type: 'TEXT', label: "库存编号"})
            sublist.addField({id: 'custpage_sublist_batch_hide', type: 'TEXT', label: "库存编号"}).updateDisplayType({displayType: 'hidden'});

            //可用数量
            sublist.addField({id: 'custpage_sublist_available_quantity',type: 'FLOAT', label: "可用数量"})
            sublist.addField({id: 'custpage_sublist_available_quantity_hide', type: 'FLOAT', label: "可用数量"}).updateDisplayType({displayType: 'hidden'});

            //数量
            sublist.addField({id: 'custpage_sublist_tran_quantity',type: 'FLOAT', label: "数量"}).updateDisplayType({displayType: 'entry'})

            // //销毁数量
            // sublist.addField({id: 'custpage_sublist_adjust_quantity',type: 'FLOAT', label: "销毁数量"}).updateDisplayType({displayType: 'entry'})

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

                //发货店铺
                if (value["customerName"]) sublist.setSublistValue({
                    id: "custpage_sublist_customer", // 发货店铺
                    value: value["customerName"],
                    line: index,
                });
                if (value["customer"]) sublist.setSublistValue({
                    id: "custpage_sublist_customer_hide", // 发货店铺
                    value: value["customer"],
                    line: index,
                });

                //发货地点
                if (value["shipLocationName"]) sublist.setSublistValue({
                    id: "custpage_sublist_ship_location", // 发货地点
                    value: value["shipLocationName"],
                    line: index,
                });
                if (value["shipLocation"]) sublist.setSublistValue({
                    id: "custpage_sublist_ship_location_hide", // 发货地点
                    value: value["shipLocation"],
                    line: index,
                });

                //原销售单号
                if (value["sorderid"]) sublist.setSublistValue({
                    id: "custpage_sublist_sono", // 原销售单号
                    value: value["sorderid"],
                    line: index,
                });
                if (value["sorderid"]) sublist.setSublistValue({
                    id: "custpage_sublist_sono_hide", // 原销售单号
                    value: value["sorderid"],
                    line: index,
                });
                //采购订单号
                if (value["cgOrder"]) sublist.setSublistValue({
                    id: "custpage_sublist_plat_orderid", // 原销售单号
                    value: value["cgOrder"],
                    line: index,
                });
                if (value["cgOrder"]) sublist.setSublistValue({
                    id: "custpage_sublist_plat_orderid_hide", // 原销售单号
                    value: value["cgOrder"],
                    line: index,
                });

                //退货地点
                if (value["returnLocationName"]) sublist.setSublistValue({
                    id: "custpage_sublist_return_location", // 退货地点
                    value: value["returnLocationName"],
                    line: index,
                });
                if (value["returnLocation"]) sublist.setSublistValue({
                    id: "custpage_sublist_return_location_hide", // 退货地点
                    value: value["returnLocation"],
                    line: index,
                });

                //子公司
                if (value["subsidiary"]) sublist.setSublistValue({
                    id: "custpage_sublist_sub", // 子公司
                    value: value["subsidiary"],
                    line: index,
                });
                if (value["subsidiary"]) sublist.setSublistValue({
                    id: "custpage_sublist_sub_hide", // 子公司
                    value: value["subsidiary"],
                    line: index,
                });

                //货品
                if (value["skuName"]) sublist.setSublistValue({
                    id: "custpage_sublist_item", // 货品
                    value: value["skuName"],
                    line: index,
                });
                if (value["sku"]) sublist.setSublistValue({
                    id: "custpage_sublist_item_hide", // 货品
                    value: value["sku"],
                    line: index,
                });

                //平台SKU
                if (value["itemName"]) sublist.setSublistValue({
                    id: "custpage_sublist_plat_sku", // 货品
                    value: value["itemName"],
                    line: index,
                });
                if (value["itemName"]) sublist.setSublistValue({
                    id: "custpage_sublist_plat_sku_hide", // 货品
                    value: value["itemName"],
                    line: index,
                });

                //货品编号
                if (value["inventorynumber"]) sublist.setSublistValue({
                    id: "custpage_sublist_batch", // 货品编号
                    value: value["inventorynumber"],
                    line: index,
                });
                if (value["inventorynumber"]) sublist.setSublistValue({
                    id: "custpage_sublist_batch_hide", // 货品编号
                    value: value["inventorynumber"],
                    line: index,
                });

                //可用数量
                if (value["available"]) sublist.setSublistValue({
                    id: "custpage_sublist_available_quantity", // 可用数量
                    value: value["available"],
                    line: index,
                });
                if (value["available"]) sublist.setSublistValue({
                    id: "custpage_sublist_available_quantity_hide", // 可用数量
                    value: value["available"],
                    line: index,
                });

                //货品编号
                if (value["available"]) sublist.setSublistValue({
                    id: "custpage_sublist_tran_quantity", // 转移数量
                    value: value["available"],
                    line: index,
                });
            });

            form.updateDefaultValues({
                "custpage_amount_total": totalAmount
            })
        }
        function createReconciliation(adData) {

            var tranRec = record.create({
                type: 'inventorytransfer',
                isDynamic: true
            });
            //设置子公司
            tranRec.setValue({
                fieldId: 'subsidiary',
                value: adData.sub
            });
            //自地点
            tranRec.setValue({
                fieldId: 'location',
                value: adData.returnLocation
            });
            //至地点
            tranRec.setValue({
                fieldId: 'transferlocation',
                value: adData.purLocation
            });
            //备注
            tranRec.setValue({
                fieldId: 'memo',
                value: adData.memo
            });

            if (adData.lineData.length > 0) {
                for (let i = 0;i < adData.lineData.length;i++) {
                    var lineObj = adData.lineData[i];
                    log.audit('lineObj',lineObj);
                    tranRec.selectNewLine({
                        sublistId: 'inventory'
                    });
                    tranRec.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'item',
                        value: lineObj.item
                    });
                    tranRec.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'adjustqtyby',
                        value: lineObj.quantity
                    });
                    //获取子列表的子记录
                    var inventoryDetail = tranRec.getCurrentSublistSubrecord({
                        sublistId: 'inventory',
                        fieldId: 'inventorydetail',
                    });
                    //子记录的子列表
                    inventoryDetail.selectNewLine({sublistId: 'inventoryassignment'});
                    //批次号
                    inventoryDetail.setCurrentSublistText({
                        sublistId: 'inventoryassignment',
                        fieldId: 'receiptinventorynumber',
                        text: lineObj.bactch,
                        // ignoreFieldChange: false
                    });
                    // 数量
                    inventoryDetail.setCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'quantity',
                        value: lineObj.quantity,
                    });
                    //提交此
                    inventoryDetail.commitLine({sublistId: 'inventoryassignment'});


                    if (lineObj.shiplocation) tranRec.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_swc_shippingstore',
                        value: lineObj.shiplocation
                    });
                    if (lineObj.sono) tranRec.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_swc_source_sales_order_no',
                        value: lineObj.sono
                    });
                    tranRec.commitLine({sublistId: 'inventory'});
                }

                var tranId = tranRec.save();
            }

            return tranId;
        }

        function createInventoryadjustment(adData) {

            var value = adData;
            var rec = record.create({
                type: 'inventoryadjustment',
                isDynamic: true
            });
            rec.setValue({
                fieldId: 'subsidiary',
                value: value.sub
            });
            rec.setValue({
                fieldId: 'memo',
                value: value.memo
            });
            rec.setValue({
                fieldId: 'account',
                value: 974
            });
            for (let i = 0; i < value.lineData.length; i++) {
                var line = value.lineData[i];
                rec.selectNewLine({
                    sublistId: 'inventory'
                });
                rec.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'item',
                    value: line.item
                });
                rec.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'adjustqtyby',
                    value: -Math.abs(line.quantity)
                });
                rec.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'location',
                    value: value.returnLocation
                });

                var inventorydetail = rec.getCurrentSublistSubrecord({ sublistId: 'inventory', fieldId: 'inventorydetail' });
                inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', text: line.bactch });
                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: -Math.abs(line.quantity) });
                // inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                rec.commitLine({sublistId: 'inventory'});
            }
            var recId = rec.save();

            return recId
        }

        return {onRequest}

    });