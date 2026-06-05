/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
var pageSize = "100";
define(["N/ui/serverWidget", "N/search", "N/runtime", "N/record", "N/encode", "N/query", "N/url", "../common/SWC_Utils.js", "../CS/SWC_CS_BGDMergePlatform.js", "../lib/pinyin.min.js", '../common/SWC_CONFIG_DATA'],

    (serverWidget, search, runtime, record, encode, query, url, SWC_Utils, SWC_CS_BGDMergePlatform, pinyin,SWC_CONFIG_DATA) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            let response = scriptContext.response;
            let request = scriptContext.request;
            let params = request.parameters;
            let method = request.method;
            log.audit("params", params);
            var processFlag = params.processFlag == "T" ? "T" : "F"; // 创建小鹿奔奔报关单标识
            let platformType = runtime.getCurrentScript().getParameter({name: "custscript_swc_sl_platform_type"});
            try {
                let options = (params.options && JSON.parse(params.options)) || {
                    subsidiary: params.custpage_body_subsidiary || "",
                    entity: params.custpage_body_entity || "",
                    shipper: params.custpage_body_export_shipper || "",
                    buyer: params.custpage_body_export_buyer || "",
                    contractNo: params.custpage_body_contract_no || "",
                    date: params.custpage_body_date || "",
                    dateFrom: params.custpage_body_date_from || "",
                    dateTo: params.custpage_body_date_to || "",
                    spo: params.custpage_body_spo || "",
                    containerNo: params.custpage_body_container_no || "",
                };
                log.audit("options", JSON.stringify(options));
                // log.audit("test", pinyin.pinyin("昂贵的给我", { style: pinyin.pinyin.STYLE_NORMAL }));

                let form = createForm(options, params);
                createSublist(form);
                if (method === "POST" && processFlag == "T"){
                    let action = "合并报关单";
                    if (platformType != "报关单") action = "合并并打印清关单";
                    try {
                        var result = {code: 200,  message: "success", recId: ""};
                        var createJson = params.createJson || "{}";
                        if (createJson) createJson = JSON.parse(createJson);
                        if (SWC_Utils.isEmpty(createJson)){
                            result.code = 100;
                            result.message = action + "失败";
                        }else {
                            let resultJson = {};
                            let platformType = runtime.getCurrentScript().getParameter({name: "custscript_swc_sl_platform_type"});
                            if (platformType == "报关单"){ // 合并报关单
                                resultJson = createDeclaration(createJson, options);
                                result.recId = resultJson.recId;
                            }else { // 合并清关单并打印
                                log.audit("合并清关单并打印", "start");
                                let platformBodyInfo = params.bodyInfo || "{}";
                                if (platformBodyInfo) platformBodyInfo = JSON.parse(platformBodyInfo);
                                let excelDataJson = getExcelDataJson(createJson, platformBodyInfo);
                                if (SWC_Utils.isEmpty(excelDataJson) || Object.keys(excelDataJson).length <= 0) {
                                    response.write({output: "所选数据不存在装箱明细"});
                                    return;
                                }
                                let excelString = SWC_CS_BGDMergePlatform.generateExcelString(excelDataJson);
                                let spo = excelDataJson.body.spo;
                                var filename = encodeURIComponent(spo + ".xls");
                                if (SWC_Utils.isEmpty(spo) || spo == " ") filename = encodeURIComponent(  "合并清关单" + ".xls");

                                var content = encode.convert({
                                    string: "headString" + excelString,
                                    inputEncoding: "UTF_8",
                                    outputEncoding: "UTF_8"
                                });//encode.Encoding.UTF_8
                                response.setHeader({name: "Content-Disposition", value: "attachment;filename=" + filename});
                                response.setHeader({name: "Content-Type", value: "text/plain"});
                                response.setHeader({name: "Accept-Language", value: "zh-cn"});
                                response.write({output: content});
                                return;
                            }
                        }
                    } catch (e) {
                        log.audit("e", e)
                        result.code = 100;
                        result.message = action + "报错：" + JSON.stringify(e.message);
                    }
                    response.write({output: JSON.stringify(result)});
                    return;
                } else if (method === "POST" || (method === "GET" && params.options)) {
                    setFieldsDefaultValue(form, options);
                    // 检索表体数据
                    var currentPage = parseInt(params.page) || 1; // 当前页码
                    var searchObj = searchSoCal(options);
                    var totalResults = searchObj.totalResults; // 总条数
                    var resultArr = [];
                    var resultsByPage = getResultsByPage(searchObj.searchObj, currentPage, pageSize); // 通过保存检索分页查询
                    log.audit("resultsByPage", resultsByPage.length);
                    let scheme = "https://";
                    let host = url.resolveDomain({hostType: url.HostType.APPLICATION});
                    let domain = scheme + host;
                    if (resultsByPage.length > 0) {
                        let formulaColumnObj = search.createColumn({name: "formulatext", summary: "MAX", formula: "listagg({internalid}, ',')"});
                        resultsByPage.forEach(function (res) {
                            var lineData = {};
                            let planOrderId = res.getValue({name: "custrecord_swc_wl_plan_order_id", summary: "GROUP"});
                            let planOrderName = res.getValue({name: "name", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", summary: "GROUP"});
                            var planOrderPath = url.resolveRecord({recordType: "customrecord_swc_wl_plan_order", recordId: planOrderId, isEditMode: false});
                            let planOrderUrl = domain + planOrderPath;
                            lineData.custpage_sub_mainid_link = '<a href="' + planOrderUrl + '" target="_blank"><font color="#00F">' + planOrderName + '</font></a>';
                            lineData.custpage_sub_mainid = planOrderId;
                            lineData.custpage_sub_po = res.getValue({name: "internalid", join: "CUSTRECORD_SWC_WL_D_PO_NUM", summary: "GROUP"});
                            lineData.custpage_sub_sku = res.getValue({name: "custrecord_swc_wl_d_sku", summary: "GROUP"});
                            lineData.custpage_sub_vendor = res.getValue({name: "custrecord_swc_wl_d_vendor", summary: "GROUP"});
                            lineData.custpage_sub_detail_ids = res.getValue(formulaColumnObj);
                            lineData.custpage_sub_subsidiary = res.getValue({name: "subsidiary", join: "CUSTRECORD_SWC_WL_D_PO_NUM", summary: "GROUP"});
                            lineData.custpage_sub_spo = isNone(res.getValue({name: "custrecord_swc_wl_spo", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", summary: "GROUP"}));
                            lineData.custpage_sub_container_num = isNone(res.getValue({name: "custrecord_swc_wl_container_number", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", summary: "GROUP"}));
                            if (platformType == "清关单") {
                                lineData.custpage_sub_date = isNone(res.getValue({name: "custrecord_swc_wl_itemno", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", summary: "GROUP"}));
                            }
                            resultArr.push(lineData);
                        });
                    }
                    if (resultArr.length > 0) {
                        log.audit("resultArr", resultArr);
                        // 子列表赋值
                        setSublistValues(options, resultArr, totalResults, form, currentPage, pageSize);
                    }
                }
                response.writePage({pageObject: form});
            } catch (e) {
                log.error("onRequest", e);
            }

        }

        /**
         * 创建表单，添加按钮及表头字段
         * @returns {Form}
         * @param options
         * @param params
         * @return {Form}
         */
        function createForm(options, params) {
            let form = serverWidget.createForm({title: `${params.deploy === "1" ? "报关处理平台" : "清关处理平台"}`});
            form.clientScriptModulePath = "../CS/SWC_CS_BGDMergePlatform.js";
            // 屏幕遮罩
            let hidden_field = form.addField({id: 'hidden_info', type: serverWidget.FieldType.INLINEHTML, label: '屏幕遮罩'});
            hidden_field.defaultValue = '<div id="timeoutblocker" style="position: fixed; z-index: 10000; top: 0px; left: 0px; height: 100%; width: 100%; margin: 5px 0px; background-color: rgb(155, 155, 155); opacity: 0.6;"><span style="width:100%;height:100%;line-height:700px;text-align:center;display:block;font-weight: bold; color: red">页面加载中，请稍后。。。</span></div>';
            form.addSubmitButton({label: "查询"});
            let subsidiary;
            let entity;
            if (params.deploy === "1") {
                form.addButton({id: "custpage_btn_bgd", label: "生成报关单", functionName: "createBGD"});
                subsidiary = form.addField({id: "custpage_body_subsidiary", label: "子公司", type: serverWidget.FieldType.SELECT, source: "subsidiary"});
                subsidiary.isMandatory = true;
                entity = form.addField({id: "custpage_body_entity", label: "供应商", type: serverWidget.FieldType.SELECT, source: "vendor"});
                form.addField({id: "custpage_body_date_from", label: "创建日期自", type: serverWidget.FieldType.DATE});
                form.addField({id: "custpage_body_date_to", label: "创建日期至", type: serverWidget.FieldType.DATE});
                form.addField({id: "custpage_body_spo", label: "SPO", type:serverWidget.FieldType.TEXT});
                form.addField({id: "custpage_body_container_no", label: "集装箱箱号", type:serverWidget.FieldType.TEXT});
            } else {
                form.addButton({id: "custpage_btn_qgd", label: "打印清关", functionName: "mergeQGD"});
                form.addFieldGroup({id: "fieldgroup_swc_filters", label: "筛选器"});
                form.addFieldGroup({id: "fieldgroup_swc_info", label: "清关信息"});
                subsidiary = form.addField({id: "custpage_body_subsidiary", label: "子公司", type: serverWidget.FieldType.SELECT, source: "subsidiary", container: "fieldgroup_swc_filters"});
                entity = form.addField({id: "custpage_body_entity", label: "供应商", type: serverWidget.FieldType.SELECT, source: "vendor", container: "fieldgroup_swc_filters"});
                form.addField({id: "custpage_body_date_from", label: "创建日期自", type: serverWidget.FieldType.DATE, container: "fieldgroup_swc_filters"});
                form.addField({id: "custpage_body_date_to", label: "创建日期至", type: serverWidget.FieldType.DATE, container: "fieldgroup_swc_filters"});
                form.addField({id: "custpage_body_spo", label: "SPO", type:serverWidget.FieldType.TEXT, container: "fieldgroup_swc_filters"});
                form.addField({id: "custpage_body_container_no", label: "集装箱箱号", type:serverWidget.FieldType.TEXT, container: "fieldgroup_swc_filters"});
                // 清关发货人 字段
                let exportShipper = form.addField({id: "custpage_body_export_shipper", label: "清关发货人*", type: serverWidget.FieldType.SELECT, container: "fieldgroup_swc_info"});
                let shipperOptions = searchShipperOptions();
                shipperOptions.forEach(function (value) {
                    exportShipper.addSelectOption({value: value.value, text: value.text});
                });
                // CONTRACT NO 字段
                form.addField({id: "custpage_body_contract_no", label: "CONTRACT NO", type: serverWidget.FieldType.TEXT, container: "fieldgroup_swc_info"});
                // 清关收货人 字段
                let exportBuyer = form.addField({id: "custpage_body_export_buyer", label: "清关收货人*", type: serverWidget.FieldType.SELECT, container: "fieldgroup_swc_info"});
                let buyerOptions = searchBuyerOptions();
                buyerOptions.forEach(function (value) {
                    exportBuyer.addSelectOption({value: value.value, text: value.text});
                });
                // DATE 字段
                form.addField({id: "custpage_body_date", label: "DATE", type: serverWidget.FieldType.DATE, container: "fieldgroup_swc_info"});
            }

            // 子公司字段追加下拉选项
            // let subsidiaryOptions = searchSubsidiaryOptions();
            // subsidiaryOptions.forEach(function (value) {
            //     subsidiary.addSelectOption({value: value.value, text: value.text});
            // });

            // 供应商字段追加下拉选项
            // let entityOptions = searchEntityOptions(options.subsidiary);// || userSubsidiary
            // entityOptions.forEach(function (value) {
            //     entity.addSelectOption(value);
            // });
            let platformTypeField = form.addField({id: "custpage_body_platform_type", label: "platform type", type: serverWidget.FieldType.TEXT});
            platformTypeField.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            platformTypeField.defaultValue = runtime.getCurrentScript().getParameter({name: "custscript_swc_sl_platform_type"});
            return form;
        }

        /**
         * 创建子列表
         * @param form
         */
        const createSublist = (form) => {
            let platformType = runtime.getCurrentScript().getParameter({name: "custscript_swc_sl_platform_type"});
            let sublist = form.addSublist({id: "custpage_sublist", type: serverWidget.SublistType.LIST, label: "列表"});
            sublist.addButton({id: "custpage_sublist_btn_selectall", label: "全选", functionName: "selectAll"});
            sublist.addButton({id: "custpage_sublist_btn_deselectall", label: "取消全选", functionName: "deSelectAll"});
            sublist.addField({id: "custpage_sub_check", label: "勾选框", type: serverWidget.FieldType.CHECKBOX});
            sublist.addField({id: "custpage_sub_no", label: "NO.", type: serverWidget.FieldType.INTEGER}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            sublist.addField({id: "custpage_sub_mainid", label: "物流发运单号id", type: serverWidget.FieldType.TEXT}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            sublist.addField({id: "custpage_sub_mainid_link", label: "物流发运单号", type: serverWidget.FieldType.TEXT}).updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
            sublist.addField({id: "custpage_sub_po", label: "采购订单编号", type: serverWidget.FieldType.SELECT, source: "purchaseorder"}).updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
            sublist.addField({id: "custpage_sub_sku", label: "SKU", type: serverWidget.FieldType.SELECT, source: "item"}).updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
            sublist.addField({id: "custpage_sub_vendor", label: "供应商", type: serverWidget.FieldType.SELECT, source: "vendor"}).updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
            sublist.addField({id: "custpage_sub_spo", label: "SPO", type: serverWidget.FieldType.TEXT}).updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
            let containerNumField = sublist.addField({id: "custpage_sub_container_num", label: "集装箱箱号", type: serverWidget.FieldType.TEXT});
            if (platformType == "报关单"){
                containerNumField.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            }else {
                containerNumField.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
                sublist.addField({id: "custpage_sub_date", label: "真实排柜时间", type: serverWidget.FieldType.TEXT}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            }
            sublist.addField({id: "custpage_sub_detail_ids", label: "物流发运明细 ids", type: serverWidget.FieldType.TEXTAREA}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            sublist.addField({id: "custpage_sub_subsidiary", label: "采购单子公司", type: serverWidget.FieldType.SELECT, source: "subsidiary"}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
        }

        /**
         * 页面查询后刷新，固定表头字段
         * @param form
         * @param options
         */
        function setFieldsDefaultValue(form, options) {
            if (!SWC_Utils.isEmpty(options.subsidiary)) form.getField("custpage_body_subsidiary").defaultValue = options.subsidiary;
            if (!SWC_Utils.isEmpty(options.entity)) form.getField("custpage_body_entity").defaultValue = options.entity;
            if (!SWC_Utils.isEmpty(options.shipper)) form.getField("custpage_body_export_shipper").defaultValue = options.shipper;
            if (!SWC_Utils.isEmpty(options.buyer)) form.getField("custpage_body_export_buyer").defaultValue = options.buyer;
            if (!SWC_Utils.isEmpty(options.contractNo)) form.getField("custpage_body_contract_no").defaultValue = options.contractNo;
            if (!SWC_Utils.isEmpty(options.date)) form.getField("custpage_body_date").defaultValue = options.date;
            if (!SWC_Utils.isEmpty(options.dateFrom)) form.getField("custpage_body_date_from").defaultValue = options.dateFrom;
            if (!SWC_Utils.isEmpty(options.dateTo)) form.getField("custpage_body_date_to").defaultValue = options.dateTo;
            if (!SWC_Utils.isEmpty(options.spo)) form.getField("custpage_body_spo").defaultValue = options.spo;
            if (!SWC_Utils.isEmpty(options.containerNo)) form.getField("custpage_body_container_no").defaultValue = options.containerNo;
            // form.getField("custpage_body_platform_type").defaultValue = runtime.getCurrentScript().getParameter({name: "custscript_swc_sl_platform_type"});
        }

        /**
         * 子列表赋值
         * @param resultArr
         * @param form
         */
        function setSublistValues(options, resultArr, totalResults, form, currentPage, pageSize) {
            var totalPages = Math.ceil(totalResults / pageSize);
            var subList = form.getSublist({id: "custpage_sublist"});
            subList.addButton({id: "custpage_sub_nextpage", label: "上一页", functionName: "lastPage(" + currentPage + ")"});
            subList.addButton({id: "custpage_sub_nextpage", label: "下一页", functionName: "nextPage(" + totalPages + "," + currentPage + ")"});
            resultArr.forEach(function (subObj, index) {
                subList.setSublistValue({id: "custpage_sub_no", line: index, value: parseInt((currentPage - 1) * pageSize + index + 1)}); // 序号
                for (let fieldId in subObj){
                    if (!SWC_Utils.isEmpty(subObj[fieldId])) subList.setSublistValue({id: fieldId, line: index, value: subObj[fieldId]});
                }
            });

            var fyField = form.addField({id: "custpage_body_page", type: serverWidget.FieldType.TEXT, label: "当前页/总页数"});
            fyField.defaultValue = currentPage + "/" + totalPages;
            fyField.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
            fyField.updateBreakType({breakType: serverWidget.FieldBreakType.STARTCOL});
            var total = form.addField({id: "custpage_body_total", type: serverWidget.FieldType.TEXT, label: "合计数量"});
            total.defaultValue = totalResults;
            total.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
            var curTotal = form.addField({id: "custpage_body_curtotal", type: serverWidget.FieldType.TEXT, label: "当前页数量"});
            curTotal.defaultValue = resultArr.length;
            curTotal.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
            form.addField({id: "custpage_body_skipto", type: serverWidget.FieldType.INTEGER, label: "跳转至"});
        }

        function searchSoCal(options){
            let filters = [
                ["isinactive", "is", "F"], // 非活动 F
                "AND",
                ["custrecord_swc_wl_plan_order_id.isinactive", "is", "F"], // 物流发运单号 : 非活动 F
                // "AND",
                // ["custrecord_swc_wl_plan_order_id.created", "within", "thisyear"], // 物流发运单号 : 创建日期 处于 本年度 内
                "AND",
                ["custrecord_swc_wl_d_po_num.mainline", "is", "T"], // 采购订单编号 : 主行 T
            ];
            let platformType = runtime.getCurrentScript().getParameter({name: "custscript_swc_sl_platform_type"});
            if (platformType == "报关单") filters.push("AND", ["custrecord_swc_wl_bgdid","anyof","@NONE@"]); // 报关单id 等于 无
            if (options.subsidiary) {
                filters.push("AND", ["custrecord_swc_wl_plan_order_id.custrecord_swc_wl_po_zt", "anyof", options.subsidiary]); // 物流发运单号 : 采购主体
            }
            if (options.entity) {
                filters.push("AND", ["custrecord_swc_wl_d_vendor", "anyof", options.entity]); // 供应商
            }
            if (options.dateFrom){
                filters.push("AND", ["custrecord_swc_wl_plan_order_id.created", "onorafter", options.dateFrom]); // 物流发运单号 : 创建日期
            }
            if (options.dateTo){
                filters.push("AND", ["custrecord_swc_wl_plan_order_id.created", "onorbefore", options.dateTo]); // 物流发运单号 : 创建日期
            }
            if (options.spo){
                filters.push("AND", ["custrecord_swc_wl_plan_order_id.custrecord_swc_wl_spo", "contains", options.spo]); // 物流发运单号 : SPO
            }
            if (options.containerNo){
                filters.push("AND", ["custrecord_swc_wl_plan_order_id.custrecord_swc_wl_container_number", "contains", options.containerNo]); // 物流发运单号 : 集装箱箱号
            }
            let columns = [
                search.createColumn({name: "name", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", summary: "GROUP", label: "ID"}),
                search.createColumn({name: "custrecord_swc_wl_spo", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", summary: "GROUP", label: "SPO"}),
                search.createColumn({name: "custrecord_swc_wl_container_number", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", summary: "GROUP", label: "集装箱箱号"}),
                search.createColumn({name: "custrecord_swc_wl_plan_order_id", summary: "GROUP", label: "物流发运单号"}),
                search.createColumn({name: "internalid", join: "CUSTRECORD_SWC_WL_D_PO_NUM", summary: "GROUP", label: "内部 ID"}),
                search.createColumn({name: "subsidiary", join: "CUSTRECORD_SWC_WL_D_PO_NUM", summary: "GROUP", label: "子公司"}),
                // search.createColumn({name: "tranid", join: "CUSTRECORD_SWC_WL_D_PO_NUM", summary: "GROUP", label: "文档编号"}),
                search.createColumn({name: "custrecord_swc_wl_d_sku", summary: "GROUP", label: "SKU"}),
                search.createColumn({name: "custrecord_swc_wl_d_vendor", summary: "GROUP", label: "供应商"}),
                search.createColumn({name: "formulatext", summary: "MAX", formula: "listagg({internalid}, ',')", label: "公式（文本）"})
            ]
            if (platformType == "清关单") columns.push(search.createColumn({name: "custrecord_swc_wl_itemno", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", summary: "GROUP", label: "真实排柜时间"}));
            let searchObj = search.create({
                type: "customrecord_swc_wl_plan_detail",
                filters: filters,
                columns: columns
            });
            var searchResultCount = searchObj.runPaged().count;
            return {searchObj: searchObj, totalResults: searchResultCount};
        }

        /**
         * 获取无层级子公司select options
         */
        function searchSubsidiaryOptions() {
            var subsidiarySearchObj = search.create({
                type: "subsidiary",
                filters:
                    [
                        ["isinactive", "is", "F"],
                        "AND",
                        ["iselimination", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({name: "namenohierarchy", label: "名称（无层次结构）"})
                    ]
            });
            var searchResultCount = subsidiarySearchObj.runPaged().count;
            var subsidiaryOptions = [{value: "", text: ""}];
            if (searchResultCount > 0) {
                subsidiarySearchObj.run().each(function (result) {
                    subsidiaryOptions.push({
                        value: result.id,
                        text: result.getValue({name: "namenohierarchy"})
                    });
                    // .run().each has a limit of 4,000 results
                    return true;
                });
            }
            return subsidiaryOptions;
        }

        /**
         * 获取供应商select options
         * @return {*[]}
         */
        function searchEntityOptions(subsidiary) {
            let filters = [
                ["vendor.isinactive", "is", "F"]
            ];
            if (subsidiary) {
                filters.push("AND", ["subsidiary", "anyof", subsidiary]);
            }
            var vendorSearchObj = search.create({
                type: "vendorsubsidiaryrelationship",
                filters: filters,
                columns:
                    [
                        search.createColumn({name: "internalid", join: "vendor", label: "内部ID"}),
                        search.createColumn({name: "entityid", join: "vendor", label: "ID"}),
                        // search.createColumn({name: "altname", join: "vendor", label: "名称"})
                    ]
            });
            var results = getAllResults(vendorSearchObj);
            var entityOptions = [{value: "", text: ""}];
            if (results.length > 0) {
                for (let i = 0; i < results.length; i++) {
                    let id = results[i].getValue({name: "internalid", join: "vendor"});
                    let entityId = results[i].getValue({name: "entityid", join: "vendor"});
                    // let altName = results[i].getValue({name: "altname", join: "vendor"});
                    entityOptions.push({
                        value: id,
                        // text: `${entityId} ${altName}`
                        text: `${entityId}`
                    });
                }
            }
            return entityOptions;
        }

        /**
         * 清关发货人抬头 检索
         * @returns {[{text: string, value: string}]}
         */
        function searchShipperOptions(){
            let sql = "SELECT CUSTOMRECORD_SWC_QG_SHIPPER.custrecord_swc_qg_shipper_mc AS custrecord_swc_qg_shipper_mc, CUSTOMRECORD_SWC_QG_SHIPPER.id AS id FROM CUSTOMRECORD_SWC_QG_SHIPPER WHERE NVL(CUSTOMRECORD_SWC_QG_SHIPPER.isinactive, 'F') = 'F'";
            let results = SWC_Utils.getAllSqlResults(sql);
            var shipperOptions = [{value: "", text: ""}];
            for(let i = 0; i < results.length; i++) {
                let result = results[i];
                shipperOptions.push({value: result.id, text: result.custrecord_swc_qg_shipper_mc});
            }
            return shipperOptions;
        }

        /**
         * 清关收货人抬头 检索
         * @returns {[{text: string, value: string}]}
         */
        function searchBuyerOptions(){
            let sql = "SELECT CUSTOMRECORD_SWC_QG_BUYER.custrecord_swc_qg_buyer_mc AS custrecord_swc_qg_buyer_mc, CUSTOMRECORD_SWC_QG_BUYER.id AS id FROM CUSTOMRECORD_SWC_QG_BUYER WHERE NVL(CUSTOMRECORD_SWC_QG_BUYER.isinactive, 'F') = 'F'";
            let results = SWC_Utils.getAllSqlResults(sql);
            var buyerOptions = [{value: "", text: ""}];
            for(let i = 0; i < results.length; i++) {
                let result = results[i];
                buyerOptions.push({value: result.id, text: result.custrecord_swc_qg_buyer_mc});
            }
            return buyerOptions;
        }

        /**
         * 创建 合并报关单
         * @param createJson
         * @param options
         * @returns {{}}
         */
        function createDeclaration(createJson, options) {
            let resultJson = {};
            log.audit("createJson", JSON.stringify(createJson));
            let planOrderArr = []; // 物流发运单 id 数组
            let detailArr = []; // 物流发运明细 id 数组
            for (let line in createJson){
                let lineData = createJson[line];
                let planOrderId = lineData.planOrderId;
                let detailIds = lineData.detailIds;
                if (!SWC_Utils.isEmpty(planOrderId) && !planOrderArr.includes(planOrderId)) planOrderArr.push(planOrderId);
                if (!SWC_Utils.isEmpty(detailIds)) detailArr = detailArr.concat(detailIds.split(","));
            }
            log.audit("312", JSON.stringify({planOrderArr, detailArr, options}));
            let searchInfo = getSearchInfoByParams(planOrderArr, detailArr, options);
            if (SWC_Utils.isEmpty(searchInfo)) return resultJson;
            let recObj = record.create({type: "customrecord_swc_customs_declaration", isDynamic: true});
            setBodyValue(recObj, searchInfo.body);
            setLineValue(recObj, searchInfo.line);
            let recId = recObj.save({ignoreMandatoryFields: true}); // 目前存在必填字段未赋值
            resultJson.recId = recId;
            // 创建完合并报关单后 回写 物流发运单明细
            if (!SWC_Utils.isEmpty(recId)) updatePlanOrders(createJson, recId);
            return resultJson;
        }

        /**
         * 检索 物流发运明细 获取 创建报关单信息
         * @param planOrderArr
         * @param detailArr
         * @param options
         * @returns {{}}
         */
        function getSearchInfoByParams(planOrderArr, detailArr, options){
            let searchInfo = {};
            if (SWC_Utils.isEmpty(planOrderArr) || SWC_Utils.isEmpty(detailArr) || SWC_Utils.isEmpty(options)) return searchInfo;
            let scriptObj = runtime.getCurrentScript();
            let jgfs = scriptObj.getParameter({name: "custscript_swc_sl_jgfs"}); // 监管方式:一般贸易
            let zmxz = scriptObj.getParameter({name: "custscript_swc_sl_zmxz"}); // 征免性质:一般征税
            let domesticFob = scriptObj.getParameter({name: "custscript_swc_sl_domestic_fob"}); // 成交方式:国内FOB
            let exportFob = scriptObj.getParameter({name: "custscript_swc_sl_export_fob"}); // 成交方式:海外FOB
            // let currentDateObj = SWC_Utils.getTodayDate();
            let filters = [
                ["isinactive", "is", "F"],
                "AND",
                ["custrecord_swc_wl_plan_order_id.isinactive", "is", "F"],
                "AND",
                ["custrecord_swc_wl_d_po_num.mainline", "is", "T"]

            ];
            if (options.subsidiary) {
                filters.push("AND", ["custrecord_swc_wl_plan_order_id.custrecord_swc_wl_po_zt", "anyof", options.subsidiary]);
            }
            if (!SWC_Utils.isEmpty(planOrderArr)) filters.push("AND", ["custrecord_swc_wl_plan_order_id", "anyof", planOrderArr]);
            // 6154,6157,6156,6155,6488,6491,6490,6489
            if (!SWC_Utils.isEmpty(detailArr)) filters.push("AND", ["internalid", "anyof", detailArr]);
            let searchObj = search.create({
                type: "customrecord_swc_wl_plan_detail",
                filters: filters,
                columns:
                    [
                        // search.createColumn({name: "internalid", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", label: "内部 ID"}),
                        search.createColumn({name: "custrecord_swc_wl_bgdtt", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", label: "报关抬头公司"}),
                        search.createColumn({name: "custrecord_swc_wl_trasfer_way", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", label: "运输方式"}),
                        search.createColumn({name: "custrecord_swc_wl_county_lsit", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", label: "目的国"}),
                        search.createColumn({name: "custrecord_swc_wl_md_lc", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", label: "目的港"}),
                        // search.createColumn({name: "custrecord_swc_wl_total_quantity", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", label: "总件数"}),
                        search.createColumn({name: "custrecord_swc_wl_gross_weight_total", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", label: "总毛重（G）"}),
                        search.createColumn({name: "custrecord_swc_wl_net_weight", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", label: "总净重（G）"}),
                        search.createColumn({name: "custrecord_swc_wl_terms_of_trade", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", label: "成交方式"}),
                        search.createColumn({name: "custrecord_swc_wl_container_number", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", label: "集装箱箱号"}),
                        search.createColumn({name: "custrecord_swc_wl_spo", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID", label: "SPO"}),
                        // search.createColumn({name: "internalid", label: "内部 ID"}),
                        // search.createColumn({name: "custrecord_swc_wl_d_hscode", label: "商品编码（HSCODE）"}),
                        search.createColumn({name: "custrecord_swc_wl_plan_order_id", label: "物流发运单号"}),
                        search.createColumn({name: "custrecord_swc_wl_d_sku", label: "SKU"}),
                        search.createColumn({name: "averagecost", join: "CUSTRECORD_SWC_WL_D_SKU", label: "平均成本"}),
                        search.createColumn({name: "custitem_swc_sku_bgsldw", join: "CUSTRECORD_SWC_WL_D_SKU", label: "报关数量单位"}),
                        search.createColumn({name: "custitem_swc_sku_jnhyd", join: "CUSTRECORD_SWC_WL_D_SKU", label: "境内货源地"}),
                        search.createColumn({name: "custitem_swc_sku_ycgdq", join: "CUSTRECORD_SWC_WL_D_SKU", label: "原产国"}),
                        search.createColumn({name: "custrecord_swc_wl_d_to_country", label: "目的国"}),
                        search.createColumn({name: "subsidiarynohierarchy", join: "CUSTRECORD_SWC_WL_D_PO_NUM", label: "子公司（无层次结构）"}),
                        search.createColumn({name: "custitem_swc_sku_bgskuname", join: "CUSTRECORD_SWC_WL_D_SKU", label: "报关货品名称"}),
                        // search.createColumn({name: "custrecord_swc_wl_d_po_qty", label: "采购订单数量"}),
                        search.createColumn({name: "custrecord_swc_wl_d_superior_qty_z", label: "本次真实发运优等品数量"}),
                        search.createColumn({name: "custrecord_swc_wl_d_good_qty_z", label: "本次真实发运良品数量"}),
                        search.createColumn({name: "currency", join: "CUSTRECORD_SWC_WL_D_PO_NUM", label: "货币"}),
                        search.createColumn({name: "custrecord_swc_wl_d_cd_amount", label: "报关金额"}),
                        search.createColumn({name: "custrecord_swc_wl_d_total_net_weight", label: "总净重（G）"}),
                        search.createColumn({name: "custrecord_swc_wl_d_total_gross_weight", label: "总毛重（G）"})
                    ]
            });
            let results = SWC_Utils.getAllResults(searchObj);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return searchInfo;
            let toCountriesArr = [];
            let skuArr = [];
            let spoArr = [];
            let containerNoArr = [];
            let planOrderIdArr = [];
            let buyerObj = getBuyer();
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                let bodyJson = searchInfo.body = searchInfo.body || {};
                let lineJson = searchInfo.line = searchInfo.line || {};
                let domesticShipper = result.getValue({name: "custrecord_swc_wl_bgdtt", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID"}); // 物流发运单.报关抬头公司
                // let domesticShipperTextArr = domesticShipper.split(" : ");
                let toCountry = result.getValue({name: "custrecord_swc_wl_county_lsit", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID"}); // 物流发运单.目的国
                // let totalQuantity = result.getValue({name: "custrecord_swc_wl_total_quantity", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID"}); // 总件数
                let totalGrossWeight = result.getValue({name: "custrecord_swc_wl_gross_weight_total", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID"}); // 总毛重（G）
                let totalNetWeight = result.getValue({name: "custrecord_swc_wl_net_weight", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID"}); // 物流发运单.总净重（G）
                let tradeTermsText = result.getText({name: "custrecord_swc_wl_terms_of_trade", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID"}); // 成交方式 文本
                let tradeTermsId = result.getValue({name: "custrecord_swc_wl_terms_of_trade", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID"}); // 成交方式 id
                let detailId = result.id;
                let lineTotalNetWeight = result.getValue({name: "custrecord_swc_wl_d_total_net_weight"}); // 物流发运明细.总净重（G）
                let quantity = ""; // 数量 本次真实发运优等品数量 有值取 本次真实发运优等品数量 无值取 本次真实发运良品数量
                let superiorQty = result.getValue({name: "custrecord_swc_wl_d_superior_qty_z"}) || ""; // 本次真实发运优等品数量
                let goodQty = result.getValue({name: "custrecord_swc_wl_d_good_qty_z"}) || ""; // 本次真实发运良品数量
                quantity = superiorQty;
                if (SWC_Utils.isEmpty(superiorQty)) quantity = goodQty;
                let averageCost = result.getValue({name: "averagecost", join: "CUSTRECORD_SWC_WL_D_SKU"}); // 下钻货品的平均成本
                let skuRate = SWC_Utils.addSumIsNumber(Number(averageCost), 1.05); // 计算：平均成本+1.05
                let sku = result.getValue({name: "custrecord_swc_wl_d_sku"}); // SKU
                let totalAmt = SWC_Utils.mulSumIsNumber(quantity, skuRate); // 总价 -- 单价*数量
                let spo = result.getValue({name: "custrecord_swc_wl_spo", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID"}); // 物流发运单.SPO
                let containerNo = result.getValue({name: "custrecord_swc_wl_container_number", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID"}); // 物流发运单.集装箱箱号
                let planOrderId = result.getValue({name: "custrecord_swc_wl_plan_order_id"}) || ""; // 物流发运单号
                if (!SWC_Utils.isEmpty(toCountry) && !toCountriesArr.includes(toCountry)) toCountriesArr.push(toCountry);
                if (!SWC_Utils.isEmpty(sku) && !skuArr.includes(sku)) skuArr.push(sku);
                if (!spoArr.includes(spo)) spoArr.push(spo);
                if (!containerNoArr.includes(containerNo)) containerNoArr.push(containerNo);
                if (!SWC_Utils.isEmpty(planOrderId) && !planOrderIdArr.includes(planOrderId)) planOrderIdArr.push(planOrderId);
                // 无论物流发运单上维护的是国内FOB还是海外FOB，在报关单中都显示为FOB
                if (tradeTermsId == domesticFob || tradeTermsId == exportFob) tradeTermsText = "FOB";
                bodyJson.custrecord_swc_bgd_title = "中华人民共和国海关出口货物报关单"; // 标题 -- 默认值“中华人民共和国海关出口货物报关单”
                // bodyJson.custrecord_swc_bgd_jnfhr = domesticShipper; // 境内发货人 -- 物流发运单.报关抬头公司
                bodyJson.custrecord_swc_bgd_jnfhr = SWC_CONFIG_DATA.configData().s_subsidiary_hnxlbbdzswyxgs; // 默认 湖南小鹿奔奔电子商务有限公司
                var country = result.getText({name: "custrecord_swc_wl_d_to_country", label: "目的国"});
                if (country in buyerObj) bodyJson.custrecord_swc_bgd_jwshr = buyerObj[country].buyer; // 境外收货人 -- 默认值"" //buyerObj
                bodyJson.custrecord_swc_bgd_ysfs = result.getValue({name: "custrecord_swc_wl_trasfer_way", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID"}); // 运输方式 -- 物流发运单.运输方式
                bodyJson.custrecord_swc_bgd_scxsdw = result.getText({name: "subsidiarynohierarchy", join: "CUSTRECORD_SWC_WL_D_PO_NUM"}); // 生产销售单位 -- 物流发运明细上采购订单的子公司
                bodyJson.custrecord_swc_bgd_jgfs = jgfs; // 监管方式 -- 默认“一般贸易”
                bodyJson.custscript_swc_sl_zmxz = zmxz; // 征免性质 -- 默认“一般征税”
                // bodyJson.custrecord_swc_bgd_htxyh = "XLBB" + currentDateObj.year + currentDateObj.month + currentDateObj.day + "-柜号"; // 合同协议号 -- “XLBB”+“当天日期”+“-柜号”(柜号取值不确定)
                bodyJson.custrecord_swc_bgd_htxyh = ""; // 合同协议号 -- ""(暂时空)
                bodyJson.custrecord_swc_bgd_trading_country = toCountry; // 贸易国(地区) -- 物流发运单.目的国
                bodyJson.custrecord_swc_bgd_ydg = toCountry; // 运抵国(地区) -- 物流发运单.目的国
                bodyJson.custrecord_swc_bgd_zyg = result.getText({name: "custrecord_swc_wl_md_lc", join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID"}); // 指运港 -- 物流发运单.目的港
                bodyJson.custrecord_swc_bgd_js = SWC_Utils.addSumIsNumber(bodyJson.custrecord_swc_bgd_js || 0, quantity); // 件数 -- 明细行的数量汇总
                bodyJson.custrecord_swc_bgd_gross_weight = totalGrossWeight; // 毛重（千克） -- 物流发运单.总毛重（G）(单位对不上, 逻辑可能有问题)
                bodyJson.custrecord_swc_bgd_net_weight = totalNetWeight; // 净重（千克） -- 物流发运单.总净重（G）(单位对不上, 逻辑可能有问题)
                bodyJson.custrecord_swc_bgd_sfdzjbh = ""; // 随附单证及编号 -- 默认 ""
                bodyJson.custrecord_swc_bgd_bjmmjbz = "境外品牌(贴牌生产） 出口享惠：不享惠"; // 标记唛码及备注 -- 默认描述：“境外品牌(贴牌生产） 出口享惠：不享惠”
                bodyJson.custrecord_swc_bgd_tsgxqr = "否"; // 特殊关系确认 -- 默认否
                bodyJson.custrecord_swc_bgd_tsgxqr = "否"; // 价格影响确认 -- 默认否
                bodyJson.custrecord_swc_bgd_zftxqsyf = "否"; // 支付特许权使用费 -- 默认否
                bodyJson.custrecord_swc_bgd_zbzj = "出口不填"; // 支付特许权使用费 -- 默认描述：“出口不填”
                bodyJson.custrecord_swc_wlfyd_jzxxh = containerNoArr.join(" "); // 集装箱箱号 -- 物流发运单.集装箱箱号
                bodyJson.custrecord_swc_wlfyd_spo = spoArr.join(" "); // SPO -- 物流发运单.SPO
                bodyJson.custrecord_swc_wlfyd_wlfydh = planOrderIdArr; // 物流发运单号 -- 物流发运单号
                bodyJson.custrecord_swc_bgd_cjfs = 'FOB'; // 成交方式 -- 默认FOB

                bodyJson.custrecord_swc_bgd_bz = `集装箱标箱数及号码：${bodyJson.custrecord_swc_wlfyd_jzxxh}`; // 备注 -- 默认描述“集装箱标箱数及号码：”
                let lineDetailJson = lineJson[detailId] = lineJson[detailId] || {};
                lineDetailJson.custrecord_swc_bgdmx_hscode = toCountry + "_" + sku; // 商品编号 -- 用货品和运抵国（custrecord_swc_wl_county_lsit）字段查找 SKU和HS code映射
                lineDetailJson.custrecord_swc_bgdmx_spmc = result.getValue({name: "custitem_swc_sku_bgskuname", join: "CUSTRECORD_SWC_WL_D_SKU"}); // 商品名称 -- 对应货品的 报关货品名称
                lineDetailJson.custrecord_swc_bgdmx_ggxh = ""; // 规格型号 -- 有拼接规则（暂时先不放规则）
                lineDetailJson.custrecord_swc_bgdmx_sl = quantity; // 数量 -- 同一sku的采购订单数量合计 (合计?)
                lineDetailJson.custrecord_swc_bgdmx_sldw = result.getValue({name: "custitem_swc_sku_bgsldw", join: "CUSTRECORD_SWC_WL_D_SKU"}); // 数量单位 -- 对应货品的 报关数量单位
                lineDetailJson.custrecord_swc_bgdmx_dw = ""; // 单位 -- 暂先为空
                lineDetailJson.custrecord_swc_bgdmx_dj = skuRate; // 单价 -- 下钻货品的平均成本，计算：平均成本+1.05
                lineDetailJson.custrecord_swc_bgdmx_zj = totalAmt; // 总价 -- 单价*数量
                lineDetailJson.custrecord_swc_bgdmx_amount = totalAmt; // 金额 -- 单价*数量
                lineDetailJson.custrecord_swc_bgdmx_bz = result.getText({name: "currency", join: "CUSTRECORD_SWC_WL_D_PO_NUM"}); // 币制 -- 取采购订单币种
                lineDetailJson.custrecord_swc_bgdmx_zzmdg = result.getValue({name: "custrecord_swc_wl_d_to_country"}); // 最终目的国（地区） -- 物流发运明细.目的国
                lineDetailJson.custrecord_swc_bgdmx_jz = lineTotalNetWeight; // 净重 -- 总净重（G）
                lineDetailJson.custrecord_swc_bgdmx_mz = result.getValue({name: "custrecord_swc_wl_d_total_gross_weight"}); // 毛重 -- 总毛重（G）
                lineDetailJson.custrecord_swc_bgdmx_js = quantity; // 件数 -- 数量
                lineDetailJson.custrecord_swc_bgdmx_zjz = lineTotalNetWeight; // 重量 -- 总净重（G）
                lineDetailJson.custrecord_swc_bgdmx_zldw = "千克"; // 重量单位 -- 默认千克
                lineDetailJson.custrecord_swc_bgdmx_zzmdg = toCountry; // 最终目的国（地区） -- 物流发运单.目的国(与小鹿奔奔报关单.运抵国(地区)相同)
                lineDetailJson.custrecord_swc_bgdmx_ycg = result.getValue({name: "custitem_swc_sku_ycgdq", join: "CUSTRECORD_SWC_WL_D_SKU"}); // 原产国（地区） -- 对应货品的 原产国
                lineDetailJson.custrecord_swc_bgdmx_jnhyd = result.getValue({name: "custitem_swc_sku_jnhyd", join: "CUSTRECORD_SWC_WL_D_SKU"}); // 境内货源地 -- 对应货品的 境内货源地
            }
            let skuInfo = getSkuHSCode(toCountriesArr, skuArr);
            updateSearchInfo(skuInfo, searchInfo);
            return searchInfo;
        }

        /**
         * 用货品和运抵国（custrecord_swc_wl_county_lsit）字段查找“SKU和HS code映射”自定义记录中对应的数据
         * @param toCountriesArr
         * @param skuArr
         * @returns {{}}
         */
        function getSkuHSCode(toCountriesArr, skuArr){
            let skuInfo = {};
            if (SWC_Utils.isEmpty(toCountriesArr) || toCountriesArr.length <= 0) return skuInfo;
            if (SWC_Utils.isEmpty(skuArr) || skuArr.length <= 0) return skuInfo;
            var searchObj = search.create({
                type: "customrecord_swc_sku_hscode_ys",
                filters:
                    [
                        ["custrecord_swc_ys_country","anyof",toCountriesArr], // 国家
                        "AND",
                        ["custrecord_swc_ys_item","anyof",skuArr], // 货品
                        "AND",
                        ["isinactive","is","F"] // 非活动 F
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_ys_item", label: "货品"}),
                        search.createColumn({name: "custrecord_swc_ys_country", label: "国家"}),
                        search.createColumn({name: "custrecord_swc_ys_hscode", label: "HS CODE"}),
                        search.createColumn({name: "custrecord_swc_ys_sbys", label: "申报要素"})
                    ]
            });
            let results = SWC_Utils.getAllResults(searchObj);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return skuInfo;
            for (let i = 0; i < results.length; i++){
                let result = results[i];
                let country = result.getValue({name: "custrecord_swc_ys_country"}); // 国家
                let sku = result.getValue({name: "custrecord_swc_ys_item"}); // 货品
                let skuDetailJson = skuInfo[country + "_" + sku] = skuInfo[country + "_" + sku] || {};
                skuDetailJson.HSCode = result.getValue({name: "custrecord_swc_ys_hscode"}); // HS CODE
                skuDetailJson.applyDescription = result.getValue({name: "custrecord_swc_ys_sbys"}); // 申报要素
            }
            return skuInfo;
        }

        /**
         * 更新 商品编号
         * @param skuInfo
         * @param searchInfo
         */
        function updateSearchInfo(skuInfo, searchInfo){
            let lineJson = searchInfo.line;
            for (let lineKey in lineJson){
                let lineDetailJson = lineJson[lineKey];
                let skuKey = lineDetailJson.custrecord_swc_bgdmx_hscode; // 商品编号
                let skuDetailJson = skuInfo[skuKey] || {};
                lineDetailJson.custrecord_swc_bgdmx_hscode = skuDetailJson.HSCode || ""; // 商品编号
                lineDetailJson.custrecord_swc_bgdmx_sbys = skuDetailJson.applyDescription || ""; // 申报要素
            }
        }

        function setBodyValue(recObj, bodyJson){
            for (let fieldId in bodyJson){
                let value = bodyJson[fieldId];
                // if (fieldId == "trandate") value = format.parse({value: value, type: format.Type.DATE});
                recObj.setValue({fieldId: fieldId, value: value});
            }
        }

        function setLineValue(recObj, lineJson){
            let sublistId = "recmachcustrecord_swc_bgdmx_bgdh";
            let index = 0;
            for (let line in lineJson){
                let lineDetailJson = lineJson[line];
                recObj.selectNewLine({sublistId: sublistId});
                recObj.setCurrentSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_bgdmx_xh", value: index + 1});
                for (let fieldId in lineDetailJson){
                    recObj.setCurrentSublistValue({sublistId: sublistId, fieldId: fieldId, value: lineDetailJson[fieldId]});
                }
                recObj.commitLine({sublistId: sublistId});
                index++;
            }
        }

        /**
         * 检索 装箱明细-物流单 获取 清关单打印数据
         * @param createJson
         * @param platformBodyInfo
         * @returns {{}}
         */
        function getExcelDataJson(createJson, platformBodyInfo){
            let excelDataJson = {};
            if (SWC_Utils.isEmpty(createJson) || SWC_Utils.isEmpty(platformBodyInfo)) return excelDataJson;
            // 首先获取 清关发货人 和 清关收货人 信息
            setPlatformBodyInfo(excelDataJson, platformBodyInfo);

            let planOrderArr = []; // 物流发运单 id 数组
            let skuArr = []; // 货品 id 数组
            for (let line in createJson){
                let lineData = createJson[line];
                let planOrderId = lineData.planOrderId;
                let skuId = lineData.skuId;
                if (!SWC_Utils.isEmpty(planOrderId) && !planOrderArr.includes(planOrderId)) planOrderArr.push(planOrderId);
                if (!SWC_Utils.isEmpty(skuId) && !skuArr.includes(skuId)) skuArr.push(skuId);
            }
            // 检索 SKU和HS CODE映射 获取 HTS
            let skuHSTCodeJson = getSkuHTS(skuArr, excelDataJson);
            // 检索 清关价维护单 获取 申报单价
            let skuClearRateJson = getSkuClearRateJson(skuArr, excelDataJson);

            let filters = [
                ["isinactive","is","F"], // 非活动 F
                "AND",
                ["custrecord_swc_wl_wlfydh.isinactive","is","F"] // 物流发运单号 : 非活动 F
            ];
            // 物流发运单号
            if (!SWC_Utils.isEmpty(planOrderArr)) filters.push("AND", ["custrecord_swc_wl_wlfydh", "anyof", planOrderArr]);
            // SKU
            if (!SWC_Utils.isEmpty(skuArr)) filters.push("AND", ["custrecord_swc_wl_sku", "anyof", skuArr]);
            var searchObj = search.create({
                type: "customrecord_swc_zxmx_wl", // 装箱明细-物流单
                filters: filters,
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_wl_cpmc", label: "产品名称"}),
                        search.createColumn({name: "custrecord_swc_wl_gg", label: "规格"}),
                        search.createColumn({name: "custrecord_swc_wl_xs", label: "箱数"}),
                        search.createColumn({name: "custrecord_swc_wl_sl", label: "数量"}),
                        search.createColumn({name: "custrecord_swc_wl_zxcc", label: "纸箱尺寸"}),
                        search.createColumn({name: "custrecord_swc_wl_bztj", label: "包装体积"}),
                        search.createColumn({name: "custrecord_swc_wl_jz", label: "净重"}),
                        search.createColumn({name: "custrecord_swc_wl_mz", label: "毛重"}),
                        search.createColumn({name: "custrecord_swc_wl_sku", label: "SKU"}),
                        search.createColumn({name: "custrecord_swc_wl_wlfydh", label: "物流发运单号"}),
                        // search.createColumn({name: "displayname", join: "CUSTRECORD_SWC_WL_SKU", label: "显示名称"}),
                        search.createColumn({name: "custitem_swc_sku_glhlzlbl", join: "CUSTRECORD_SWC_WL_SKU", label: "钢铝含量重量比率"}),
                        search.createColumn({name: "custrecord_swc_wl_container_number", join: "CUSTRECORD_SWC_WL_WLFYDH", label: "集装箱箱号"}),
                        search.createColumn({name: "custrecord_swc_wl_seal_number", join: "CUSTRECORD_SWC_WL_WLFYDH", label: "封条号"}),
                        search.createColumn({name: "custrecord_swc_wl_spo", join: "CUSTRECORD_SWC_WL_WLFYDH", label: "SPO"}),
                        search.createColumn({name: "companyname", join: "CUSTRECORD_SWC_WL_GYS", label: "公司名称"})
                    ]
            });
            let results = SWC_Utils.getAllResults(searchObj);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return excelDataJson;
            let spoArr = [];
            for (let i = 0; i < results.length; i++){
                let result = results[i];
                let bodyJson = excelDataJson.body = excelDataJson.body || {};
                // let lineJson = excelDataJson.line = excelDataJson.line || {};
                let orderJson = excelDataJson.order = excelDataJson.order || {};
                let orderId = result.getValue({name: "custrecord_swc_wl_wlfydh"}); // 物流发运单号
                let orderDetailJson = orderJson[orderId] = orderJson[orderId] || {};
                let orderBodyJson = orderDetailJson.body = orderDetailJson.body || {};
                let lineJson = orderDetailJson.line = orderDetailJson.line || {};
                let sku = result.getValue({name: "custrecord_swc_wl_sku"}); // SKU
                let ctnQty = result.getValue({name: "custrecord_swc_wl_xs"}); // 箱数
                let quantity = result.getValue({name: "custrecord_swc_wl_sl"}); // 数量
                let percentage = result.getValue({name: "custitem_swc_sku_glhlzlbl", join: "CUSTRECORD_SWC_WL_SKU"}); // SKU.钢铝含量重量比率
                let percentageDecimal = percentToDecimal(percentage);
                let spo = result.getValue({name: "custrecord_swc_wl_spo", join: "CUSTRECORD_SWC_WL_WLFYDH"}); // 物流发运单.SPO
                if (!spoArr.includes(spo)) spoArr.push(spo);
                bodyJson.spo = spoArr.join(" ");
                orderBodyJson.spo = spo;
                orderBodyJson.sealNumber = result.getValue({name: "custrecord_swc_wl_seal_number", join: "CUSTRECORD_SWC_WL_WLFYDH"}); // 物流发运单.封条号
                orderBodyJson.containerNumber = result.getValue({name: "custrecord_swc_wl_container_number", join: "CUSTRECORD_SWC_WL_WLFYDH"}); // 物流发运单.集装箱箱号
                // bodyJson.sealNumber = result.getValue({name: "custrecord_swc_wl_seal_number", join: "CUSTRECORD_SWC_WL_WLFYDH"}); // 物流发运单.封条号
                // bodyJson.containerNumber = result.getValue({name: "custrecord_swc_wl_container_number", join: "CUSTRECORD_SWC_WL_WLFYDH"}); // 物流发运单.集装箱箱号
                let itemJson = lineJson[i] = lineJson[i] || {};
                itemJson.itemNo = result.getValue({name: "custrecord_swc_wl_cpmc"}); // Item NO(货品名称) -- 产品名称
                itemJson.vendor = result.getValue({name: "companyname", join: "CUSTRECORD_SWC_WL_GYS"}); // 供应商 -- 供应商 : 公司名称
                itemJson.size = result.getValue({name: "custrecord_swc_wl_gg"}); // Size(规格) -- 规格
                itemJson.ctns = SWC_Utils.addSumIsNumber(itemJson.ctns || 0, Number(ctnQty)); // CTNS(箱数) -- 同一货品名称的箱数合计
                itemJson.quantity = SWC_Utils.addSumIsNumber(itemJson.quantity || 0, Number(quantity)); // Quantity(数量) -- 同一货品名称的数量合计
                itemJson.cartonsSize = result.getValue({name: "custrecord_swc_wl_zxcc"}); // Cartons size（ M M ）(纸箱尺寸) -- 纸箱尺寸
                itemJson.vlumeo = result.getValue({name: "custrecord_swc_wl_bztj"}); // Vlumeo（m3）(包装体积) -- 包装体积
                itemJson.weightNW = result.getValue({name: "custrecord_swc_wl_jz"}); // Weight-NW (kgs)(净重) -- 净重
                itemJson.weightGW = result.getValue({name: "custrecord_swc_wl_mz"}); // Weight-GW(kgs)(毛重) -- 毛重
                itemJson.totalWeightNW = SWC_Utils.mulSumIsNumber(Number(itemJson.quantity || 0), Number(itemJson.weightNW || 0)); // Total Weight-NW (kgs)(总净重) -- 数量*净重
                itemJson.totalWeightGW = SWC_Utils.mulSumIsNumber(Number(itemJson.quantity || 0), Number(itemJson.weightGW || 0)); // Total Weight-GW(kgs)(总毛重) -- 数量*毛重
                itemJson.county = "China"; // County of steel/aluminum was made(产地国) -- 默认China
                itemJson.percentage = percentage; // Percentage() -- SKU.钢铝含量重量比率
                itemJson.NWPiece = SWC_Utils.mulSumIsNumber(Number(itemJson.weightNW || 0), Number(percentageDecimal || 0)); // NW/piece(NW/件) -- 净重*Percentage
                itemJson.GWPiece = SWC_Utils.mulSumIsNumber(Number(itemJson.weightGW || 0), Number(percentageDecimal || 0)); // GW/piece(GW/件) -- 毛重*Percentage
                itemJson.NWTotal = SWC_Utils.mulSumIsNumber(Number(itemJson.ctns || 0), Number(itemJson.NWPiece || 0)); // NW/Total(NW/总计) -- 箱数*NW/piece
                itemJson.GWTotal = SWC_Utils.mulSumIsNumber(Number(itemJson.ctns || 0), Number(itemJson.GWPiece || 0)); // GW/Total(GW/总计) -- 箱数*GW/piece
                let fobPrice = 0;
                if (!SWC_Utils.isEmpty(skuClearRateJson[sku])) fobPrice = skuClearRateJson[sku].rate;
                itemJson.fobUSDPrice = fobPrice; // FOB USD PRICE(美元单价) -- 清关价维护单明细 对应币种单价
                itemJson.amountUSDPrice = SWC_Utils.mulSumIsNumber(Number(itemJson.fobUSDPrice || 0), Number(itemJson.quantity || 0)); // AMOUNT USD PRICE(美元总金额) -- 美元单价*数量
                itemJson.SOrALUSDPrice = SWC_Utils.mulSumIsNumber(Number(itemJson.fobUSDPrice || 0), Number(percentageDecimal || 0)); // FOB USD PRICE(钢/铝美元价格) -- 美元单价*比例(SKU.钢铝含量重量比率)
                itemJson.SOrALTotalUSDAmount = SWC_Utils.mulSumIsNumber(Number(itemJson.SOrALUSDPrice || 0), Number(itemJson.quantity || 0)); // STEEL/ALUMINUM TOTAL AMOUNT USD(钢/铝总金额（美元）) -- 钢/铝美元价格*数量
                itemJson.NonSAndALTotalUSDAmount = SWC_Utils.subSumIsNumber(Number(itemJson.amountUSDPrice || 0), Number(itemJson.SOrALTotalUSDAmount || 0)); // NON STEEL/ALUMINUM TOTAL AMOUNT USD(非钢/铝 总金额 美元) -- 美元总金额 - 钢/铝总金额（美元）
                let remark = "";
                if (!SWC_Utils.isEmpty(skuHSTCodeJson[sku])) remark = skuHSTCodeJson[sku].HTS;
                itemJson.remark = remark; // remark -- SKU和HS code映射.HTS（国外清关）

                // 新逻辑
                // newLogicTest(excelDataJson, result, i, skuClearRateJson, skuHSTCodeJson);
            }
            log.audit("excelDataJson", excelDataJson);
            log.audit("excelDataJson.order", excelDataJson.order);
            return excelDataJson;
        }

        function newLogicTest(excelDataJson, result, i, skuClearRateJson, skuHSTCodeJson){
            let orderJson = excelDataJson.order = excelDataJson.order || {};
            let orderId = result.getValue({name: "custrecord_swc_wl_wlfydh"}); // 物流发运单号
            let orderDetailJson = orderJson[orderId] = orderJson[orderId] || {};
            let orderBodyJson = orderDetailJson.body = orderDetailJson.body || {};
            let lineJson = orderDetailJson.line = orderDetailJson.line || {};
            let sku = result.getValue({name: "custrecord_swc_wl_sku"}); // SKU
            let ctnQty = result.getValue({name: "custrecord_swc_wl_xs"}); // 箱数
            let quantity = result.getValue({name: "custrecord_swc_wl_sl"}); // 数量
            let percentage = result.getValue({name: "custitem_swc_sku_glhlzlbl", join: "CUSTRECORD_SWC_WL_SKU"}); // SKU.钢铝含量重量比率
            let percentageDecimal = percentToDecimal(percentage);
            let spo = result.getValue({name: "custrecord_swc_wl_spo", join: "CUSTRECORD_SWC_WL_WLFYDH"}); // 物流发运单.SPO
            // if (!spoArr.includes(spo)) spoArr.push(spo);
            orderBodyJson.spo = spo;
            orderBodyJson.sealNumber = result.getValue({name: "custrecord_swc_wl_seal_number", join: "CUSTRECORD_SWC_WL_WLFYDH"}); // 物流发运单.封条号
            orderBodyJson.containerNumber = result.getValue({name: "custrecord_swc_wl_container_number", join: "CUSTRECORD_SWC_WL_WLFYDH"}); // 物流发运单.集装箱箱号
            let itemJson = lineJson[i] = lineJson[i] || {};
            itemJson.itemNo = result.getValue({name: "custrecord_swc_wl_cpmc"}); // Item NO(货品名称) -- 产品名称
            itemJson.vendor = result.getValue({name: "companyname", join: "CUSTRECORD_SWC_WL_GYS"}); // 供应商 -- 供应商 : 公司名称
            itemJson.size = result.getValue({name: "custrecord_swc_wl_gg"}); // Size(规格) -- 规格
            itemJson.ctns = SWC_Utils.addSumIsNumber(itemJson.ctns || 0, Number(ctnQty)); // CTNS(箱数) -- 同一货品名称的箱数合计
            itemJson.quantity = SWC_Utils.addSumIsNumber(itemJson.quantity || 0, Number(quantity)); // Quantity(数量) -- 同一货品名称的数量合计
            itemJson.cartonsSize = result.getValue({name: "custrecord_swc_wl_zxcc"}); // Cartons size（ M M ）(纸箱尺寸) -- 纸箱尺寸
            itemJson.vlumeo = result.getValue({name: "custrecord_swc_wl_bztj"}); // Vlumeo（m3）(包装体积) -- 包装体积
            itemJson.weightNW = result.getValue({name: "custrecord_swc_wl_jz"}); // Weight-NW (kgs)(净重) -- 净重
            itemJson.weightGW = result.getValue({name: "custrecord_swc_wl_mz"}); // Weight-GW(kgs)(毛重) -- 毛重
            itemJson.totalWeightNW = SWC_Utils.mulSumIsNumber(Number(itemJson.quantity || 0), Number(itemJson.weightNW || 0)); // Total Weight-NW (kgs)(总净重) -- 数量*净重
            itemJson.totalWeightGW = SWC_Utils.mulSumIsNumber(Number(itemJson.quantity || 0), Number(itemJson.weightGW || 0)); // Total Weight-GW(kgs)(总毛重) -- 数量*毛重
            itemJson.county = "China"; // County of steel/aluminum was made(产地国) -- 默认China
            itemJson.percentage = percentage; // Percentage() -- SKU.钢铝含量重量比率
            itemJson.NWPiece = SWC_Utils.mulSumIsNumber(Number(itemJson.weightNW || 0), Number(percentageDecimal || 0)); // NW/piece(NW/件) -- 净重*Percentage
            itemJson.GWPiece = SWC_Utils.mulSumIsNumber(Number(itemJson.weightGW || 0), Number(percentageDecimal || 0)); // GW/piece(GW/件) -- 毛重*Percentage
            itemJson.NWTotal = SWC_Utils.mulSumIsNumber(Number(itemJson.ctns || 0), Number(itemJson.NWPiece || 0)); // NW/Total(NW/总计) -- 箱数*NW/piece
            itemJson.GWTotal = SWC_Utils.mulSumIsNumber(Number(itemJson.ctns || 0), Number(itemJson.GWPiece || 0)); // GW/Total(GW/总计) -- 箱数*GW/piece
            let fobPrice = 0;
            if (!SWC_Utils.isEmpty(skuClearRateJson[sku])) fobPrice = skuClearRateJson[sku].rate;
            itemJson.fobUSDPrice = fobPrice; // FOB USD PRICE(美元单价) -- 清关价维护单明细 对应币种单价
            itemJson.amountUSDPrice = SWC_Utils.mulSumIsNumber(Number(itemJson.fobUSDPrice || 0), Number(itemJson.quantity || 0)); // AMOUNT USD PRICE(美元总金额) -- 美元单价*数量
            itemJson.SOrALUSDPrice = SWC_Utils.mulSumIsNumber(Number(itemJson.fobUSDPrice || 0), Number(percentageDecimal || 0)); // FOB USD PRICE(钢/铝美元价格) -- 美元单价*比例(SKU.钢铝含量重量比率)
            itemJson.SOrALTotalUSDAmount = SWC_Utils.mulSumIsNumber(Number(itemJson.SOrALUSDPrice || 0), Number(itemJson.quantity || 0)); // STEEL/ALUMINUM TOTAL AMOUNT USD(钢/铝总金额（美元）) -- 钢/铝美元价格*数量
            itemJson.NonSAndALTotalUSDAmount = SWC_Utils.subSumIsNumber(Number(itemJson.amountUSDPrice || 0), Number(itemJson.SOrALTotalUSDAmount || 0)); // NON STEEL/ALUMINUM TOTAL AMOUNT USD(非钢/铝 总金额 美元) -- 美元总金额 - 钢/铝总金额（美元）
            let remark = "";
            if (!SWC_Utils.isEmpty(skuHSTCodeJson[sku])) remark = skuHSTCodeJson[sku].HTS;
            itemJson.remark = remark; // remark -- SKU和HS code映射.HTS（国外清关）
        }

        /**
         * 将清关平台主体字段信息追加到 清关单打印数据
         * @param excelDataJson
         * @param platformBodyInfo
         */
        function setPlatformBodyInfo(excelDataJson, platformBodyInfo){
            if (SWC_Utils.isEmpty(platformBodyInfo)) return;
            let bodyJson = excelDataJson.body = excelDataJson.body || {};
            let exportBuyer = platformBodyInfo.exportBuyer;
            let USABuyer = runtime.getCurrentScript().getParameter({name: "custscript_swc_sl_buyer"}); // 清关收货人:美国
            updateShipperInfoById(platformBodyInfo.exportShipper, bodyJson);
            updateBuyerInfoById(exportBuyer, bodyJson);
            bodyJson.contractNo = platformBodyInfo.contractNo || "";
            bodyJson.date = platformBodyInfo.date;
            bodyJson.isUSA = USABuyer == exportBuyer; // 只有清关收货人选择的是美国，才需要计算含钢铝
        }

        /**
         * 根据内部id 获取 清关发货人 信息
         * @param exportShipper
         * @param bodyJson
         */
        function updateShipperInfoById(exportShipper, bodyJson){
            let sql = `SELECT CUSTOMRECORD_SWC_QG_SHIPPER.custrecord_swc_qg_shipper AS custrecord_swc_qg_shipper, CUSTOMRECORD_SWC_QG_SHIPPER.custrecord_swc_qg_shipper_xx AS custrecord_swc_qg_shipper_xx, CUSTOMRECORD_SWC_QG_SHIPPER.custrecord_swc_qgfhr_lxfs AS custrecord_swc_qgfhr_lxfs FROM CUSTOMRECORD_SWC_QG_SHIPPER WHERE NVL(CUSTOMRECORD_SWC_QG_SHIPPER.isinactive, 'F') = 'F' AND CUSTOMRECORD_SWC_QG_SHIPPER.id IN (${exportShipper})`;
            let results = SWC_Utils.getAllSqlResults(sql);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return;
            let result = results[0];
            bodyJson.title = result.custrecord_swc_qg_shipper || "";
            bodyJson.shipperAddress = result.custrecord_swc_qg_shipper_xx || "";
            bodyJson.shipperTel = result.custrecord_swc_qgfhr_lxfs || "";
        }

        /**
         * 根据内部id 获取 清关收货人 信息
         * @param exportBuyer
         * @param bodyJson
         */
        function updateBuyerInfoById(exportBuyer, bodyJson){
            if (SWC_Utils.isEmpty(exportBuyer)) return;
            let sql = `SELECT CUSTOMRECORD_SWC_QG_BUYER.custrecord_swc_qg_buyer_mc AS custrecord_swc_qg_buyer_mc, CUSTOMRECORD_SWC_QG_BUYER.custrecord_swc_qg_buyer_xx AS custrecord_swc_qg_buyer_xx, Subsidiary.name AS name, CUSTOMLIST_SWC_CURRENCY.name AS currencyname FROM CUSTOMRECORD_SWC_QG_BUYER left join Subsidiary on CUSTOMRECORD_SWC_QG_BUYER.custrecord_swc_qg_buyer = Subsidiary.id left join CUSTOMLIST_SWC_CURRENCY on CUSTOMLIST_SWC_CURRENCY.id = CUSTOMRECORD_SWC_QG_BUYER.custrecord_swc_qgshr_currency WHERE NVL(CUSTOMRECORD_SWC_QG_BUYER.isinactive, 'F') = 'F' AND CUSTOMRECORD_SWC_QG_BUYER.id IN (${exportBuyer})`;
            let results = SWC_Utils.getAllSqlResults(sql);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return;
            let result = results[0];
            bodyJson.to = result.name || "";
            bodyJson.contactPerson = result.custrecord_swc_qg_buyer_xx || "";
            bodyJson.currencyName = result.currencyname || "";
            bodyJson.buyerName = result.custrecord_swc_qg_buyer_mc || "";
            // bodyJson.buyerTel = result.custrecord_swc_qgshr_lxfs;
        }

        function getSkuHTS(skuArr, excelDataJson){
            let skuHSTCodeJson = {};
            if (SWC_Utils.isEmpty(skuArr)) return skuHSTCodeJson;
            let bodyJson = excelDataJson.body = excelDataJson.body || {};
            let countryName = bodyJson.buyerName; // 清关收货人.名称
            if (SWC_Utils.isEmpty(countryName)) return skuHSTCodeJson;
            let countryId = getCountryId(countryName);
            if (SWC_Utils.isEmpty(countryId)) return skuHSTCodeJson;
            var searchObj = search.create({
                type: "customrecord_swc_sku_hscode_ys",
                filters:
                    [
                        ["custrecord_swc_ys_country","anyof",countryId], // 国家
                        "AND",
                        ["custrecord_swc_ys_item","anyof",skuArr], // 货品
                        "AND",
                        ["isinactive","is","F"] // 非活动 F
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_ys_item", label: "货品"}),
                        search.createColumn({name: "custrecord_swc_ys_hts", label: "HTS（国外清关）"})
                    ]
            });
            let results = SWC_Utils.getAllResults(searchObj);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return skuHSTCodeJson;
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                let sku = result.getValue({name: "custrecord_swc_ys_item"}); // 货品
                let HTS = result.getValue({name: "custrecord_swc_ys_hts"}); // HTS（国外清关）
                let skuJson = skuHSTCodeJson[sku] = skuHSTCodeJson[sku] || {};
                skuJson.HTS = HTS;
            }
            return skuHSTCodeJson;
        }

        /**
         * 根据国家名称 检索获取 国家id
         * @param countryName
         * @returns {string|*}
         */
        function getCountryId(countryName){
            let countryId = "";
            let sql = `SELECT Country.uniquekey FROM Country WHERE Country.name = '${countryName}'`;
            let results = SWC_Utils.getAllSqlResults(sql);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return countryId;
            return results[0].uniquekey;
        }

        /**
         * 检索 清关价维护单明细 获取对应 币种 单价
         * USD 取 申报单价USD(custrecord_clearance_price_detail_usd)
         * GBP 取 申报单价GBP(custrecord_clearance_price_detail_gbp)
         * EUR 取 申报单价EUR(custrecord_clearance_price_detail_eur)
         * CAD 取 申报单价CAD(custrecord_clearance_price_detail_cad)
         * @param skuArr
         * @param excelDataJson
         * @returns {{}}
         */
        function getSkuClearRateJson(skuArr, excelDataJson){
            let skuClearRateJson = {};
            if (SWC_Utils.isEmpty(skuArr)) return skuClearRateJson;
            let bodyJson = excelDataJson.body = excelDataJson.body || {};
            let currencyName = bodyJson.currencyName; // 清关收货人.币种
            if (SWC_Utils.isEmpty(currencyName)) currencyName = "USD";
            // USD 取 申报单价USD(custrecord_clearance_price_detail_usd); GBP 取 申报单价GBP(custrecord_clearance_price_detail_gbp); EUR 取 申报单价EUR(custrecord_clearance_price_detail_eur); CAD 取 申报单价CAD(custrecord_clearance_price_detail_cad)
            let currencyFieldMappingJson = {"USD": "custrecord_clearance_price_detail_usd", "GBP": "custrecord_clearance_price_detail_gbp", "EUR": "custrecord_clearance_price_detail_eur", "CAD": "custrecord_clearance_price_detail_cad"};
            var customrecord_swc_clearance_price_detailSearchObj = search.create({
                type: "customrecord_swc_clearance_price_detail",
                filters:
                    [
                        ["isinactive","is","F"], // 非活动 F
                        "AND",
                        ["custrecord_clearance_price_detail_sku","anyof",skuArr] // SKU
                    ],
                columns:
                    [
                        search.createColumn({name: currencyFieldMappingJson[currencyName]}),
                        search.createColumn({name: "custrecord_clearance_price_detail_sku", label: "SKU"})
                    ]
            });
            let results = SWC_Utils.getAllResults(customrecord_swc_clearance_price_detailSearchObj);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return skuClearRateJson;
            for (let i = 0; i < results.length; i++){
                let result = results[i];
                let sku = result.getValue({name: "custrecord_clearance_price_detail_sku"}); // SKU
                let rate = result.getValue({name: currencyFieldMappingJson[currencyName]}); // 单价
                let skuJson = skuClearRateJson[sku] = skuClearRateJson[sku] || {};
                skuJson.rate = rate;
            }
            return skuClearRateJson;
        }

        /**
         * 解析保存检索数据
         * @param mySearch
         * @return {*[]}
         */
        const getAllResults = (mySearch) => {
            let resultSet = mySearch.run();
            let resultArr = [];
            let start = 0;
            let step = 1000;
            let results = resultSet.getRange({start: start, end: step});
            while (results && results.length > 0) {
                resultArr = resultArr.concat(results);
                start = Number(start) + Number(step);
                results = resultSet.getRange({start: start, end: Number(start) + Number(step)});
            }
            return resultArr;
        }

        /**
         * 分页检索
         * @param searchObj
         * @param page
         * @param pagesize
         * @returns {*}
         */
        function getResultsByPage(searchObj, page, pagesize) {
            var start = (Number(page) - 1) * Number(pagesize);
            var end = Number(start) + Number(pagesize);
            var resultset = searchObj.run();
            var results = resultset.getRange({
                start: start,
                end: end
            });
            return results;
        }

        /**
         * 将百分比字符串转换为对应的小数
         * @param {string} percentStr - 百分比字符串，如 "10.0%", "5.5%", "100%"
         * @returns {number|null} - 转换后的小数，输入非法时返回 null
         */
        function percentToDecimal(percentStr) {
            if (typeof percentStr !== "string") return 0;

            // 移除非数字和点的字符，保留数字、点、负号（如果有）
            const cleaned = percentStr.replace(/[^\d.-]/g, "");
            if (SWC_Utils.isEmpty(cleaned)) return 0;

            const num = Number(cleaned);
            if (isNaN(num)) return 0;

            if (num == 0) return num;

            return SWC_Utils.divSumIsNumber(num, 100);
        }

        /**
         * 创建完合并报关单后 回写 物流发运单明细
         * @param createJson
         * @param recId 合并报关单(小鹿奔奔报关单)id
         */
        function updatePlanOrders(createJson, recId){
            if (SWC_Utils.isEmpty(createJson)) return;
            for (let line in createJson){
                let lineData = createJson[line];
                let planOrderId = lineData.planOrderId; // 物流发运单id
                let detailIds = lineData.detailIds; // 物流发运单明细id
                let detailArr = detailIds.split(","); // 物流发运单明细id数组
                if (!SWC_Utils.isEmpty(detailArr) && detailArr.length > 0) updatePlanOrder(planOrderId, detailArr, recId);
            }
        }

        /**
         * 回写 更新物流发运单明细
         * @param planOrderId
         * @param detailArr
         * @param recId
         */
        function updatePlanOrder(planOrderId, detailArr, recId){
            if (SWC_Utils.isEmpty(planOrderId)) return;
            let planOrderRec = record.load({type: "customrecord_swc_wl_plan_order", id: planOrderId, isDynamic: true});
            let sublistId = "recmachcustrecord_swc_wl_plan_order_id";
            let lineCount = planOrderRec.getLineCount({sublistId: sublistId});
            if (lineCount <= 0) return;
            for (let i = 0; i < lineCount; i++){
                planOrderRec.selectLine({sublistId: sublistId, line: i});
                let detailId = planOrderRec.getCurrentSublistValue({sublistId: sublistId, fieldId: "id"}); // 物流发运单明细内部id
                if (detailArr.includes(detailId)) {
                    planOrderRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_wl_bgdid", value: recId}); // 报关单id
                    planOrderRec.commitLine({sublistId: sublistId});
                }
            }
            planOrderRec.save();
        }

        function getBuyer() {
            const customrecord_swc_qg_buyerSearchObj = search.create({
                type: "customrecord_swc_qg_buyer",
                filters:
                    [],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_qg_buyer_mc", label: "名称"}),
                        search.createColumn({name: "custrecord_swc_qg_buyer", label: "收货人"})
                    ]
            });

            var buyerObj = {};
            customrecord_swc_qg_buyerSearchObj.run().each(function(result){
                var mc = result.getValue({name: "custrecord_swc_qg_buyer_mc", label: "名称"});
                var buyer = result.getText({name: "custrecord_swc_qg_buyer", label: "收货人"});
                buyerObj[mc] = {
                    buyer: buyer
                }
                return true;
            });

            return buyerObj
        }

        /**
         * none格式转换空
         * @param str
         * @returns {string|*}
         */
        function isNone(str) {
            if (str == "- None -") {
                return "";
            } else {
                return str;
            }
        }

        return {onRequest}

    });