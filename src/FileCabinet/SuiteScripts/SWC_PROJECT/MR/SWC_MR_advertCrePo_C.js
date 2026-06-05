/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * 获取其他平台广告数据/积加广告数据（仅处理有SKU的数据），生成采购订单及账单
 * 无SKU数据的发票查询与分摊已移至独立脚本处理
 */
define(["N/search", "N/record", "N/runtime", 'N/task', 'N/format', "../common/SWC_Utils.js"],

    (search, record, runtime, task, format, SWC_Utils) => {

        const getInputData = (inputContext) => {
            var obj = runtime.getCurrentScript();
            var type = obj.getParameter({ name: "custscript_swc_mr_type_c" }); // 脚本中的参数ID
            var onSiteAds = obj.getParameter({ name: "custscript_swc_mr_on_site_ads_c" }); // 货品参数
            var advertisementType = obj.getParameter({ name: "custscript_advertisementtype_c" }); // 其他广告类型参数
            var startTime = obj.getParameter({ name: "custscript_starttime_c" }); // 开始时间
            var endTime = obj.getParameter({ name: "custscript_endtime_c" }); // 结束时间
            var customerId = obj.getParameter({ name: "custscript_customerid_c" }); // 店铺
            var jjType = obj.getParameter({ name: "custscript_jj_advertisement_type_c" }); // 积加广告类型

            log.audit("advertisementType", advertisementType);
            log.audit("startTime", startTime);
            log.audit("endTime", endTime);
            log.audit("customerId", customerId);
            log.audit("jjType", jjType);

            var date = new Date();
            log.audit("开始时间", date.getTime());

            var groupedData = [];

            let secTypeJson = getSecTypeJson();
            if (type == 1) {
                groupedData = getSearchList(advertisementType, startTime, endTime, customerId, secTypeJson);
            } else {
                groupedData = getSearchListJJ(advertisementType, startTime, endTime, customerId, jjType, secTypeJson);
            }

            // 过滤：只保留有SKU的分组数据
            groupedData = groupedData.filter(group => group.hasSku === true);

            var allStoreNames = [];
            for (var i = 0; i < groupedData.length; i++) {
                var group = groupedData[i];
                if (group.store && allStoreNames.indexOf(group.store) === -1) {
                    allStoreNames.push(group.store);
                }
            }

            if (allStoreNames.length > 0) {
                // 根据店铺名称查询店铺ID和店铺子公司
                var vendorInfoMap = vendorSearchByName(allStoreNames);
                // 更新分组数据中的店铺信息和子公司
                for (var j = 0; j < groupedData.length; j++) {
                    var group = groupedData[j];
                    var vendorInfo = vendorInfoMap[group.store];
                    if (vendorInfo) {
                        group.vendorId = vendorInfo.vendorId || null;
                        group.vendorSubsidiary = vendorInfo.subsidiary;
                        group.paymentTermId = vendorInfo.paymentTermId;
                    }
                }
            }
            log.audit('groupedData',groupedData);
            return groupedData;
        }

        const map = (mapContext) => {
            // 本脚本不需要map阶段，保留空函数
        }

        const reduce = (reduceContext) => {
            try {
                var obj = runtime.getCurrentScript();
                var type = obj.getParameter({ name: "custscript_swc_mr_type_c" });
                var onSiteAds = obj.getParameter({ name: "custscript_swc_mr_on_site_ads_c" });
                var purchaseEmployee = obj.getParameter({ name: "custscript_swc_mr_purchase_employee_c" });
                var poFeeType = obj.getParameter({ name: "custscript_swc_mr_po_fee_c" });
                var poForm = obj.getParameter({ name: "custscript_swc_mr_po_form_c" });
                var poStatus = obj.getParameter({ name: "custscript_swc_mr_po_status_c" });
                var customPoStatus = obj.getParameter({ name: "custscript_swc_mr_custom_po_sataus_c" });

                var groupData = JSON.parse(reduceContext.values[0]);
                log.audit("开始处理分组", groupData);

                // 检查是否有供应商ID
                if (!groupData.vendorId) {
                    log.error("缺少供应商ID，无法创建采购单", { 店铺: groupData.store });
                    return;
                }

                // 创建新的采购单
                var poRec = record.create({ type: 'purchaseorder', isDynamic: true, defaultValues: { "customform": poForm } });

                // 设置采购单字段
                poRec.setValue({ fieldId: 'entity', value: groupData.vendorId });
                poRec.setValue({ fieldId: 'subsidiary', value: groupData.vendorSubsidiary });

                let memo = "积加 广告报告";
                if (type == 1) {
                    memo = "其他平台广告数据";
                    poRec.setValue({ fieldId: 'currency', value: groupData.currencyId });
                }

                poRec.setValue({ fieldId: "employee", value: purchaseEmployee });
                poRec.setValue({ fieldId: "custbody_swc_po_fee", value: poFeeType });
                poRec.setValue({ fieldId: "custbody_swc_order_type2", value: poFeeType });
                poRec.setValue({ fieldId: "memo", value: memo });
                poRec.setValue({ fieldId: "approvalstatus", value: poStatus });
                poRec.setValue({ fieldId: "custbody_swc_po_approal_fix", value: customPoStatus });
                poRec.setValue({ fieldId: "custbody_swc_vendor_payment_terms", value: groupData.paymentTermId });

                var addedLines = 0;
                if (type == 1) {
                    addedLines = addAllRecordsToPo(poRec, groupData.records);
                } else if (type == 2) {
                    addedLines = addJJRecordsToPo(poRec, groupData.records, onSiteAds);
                }

                let lineCount = poRec.getLineCount({ sublistId: "item" });
                if (lineCount <= 0) {
                    log.audit("创建采购单", "未添加任何行，创建失败");
                    return;
                }

                // 保存采购单
                var poId = poRec.save({ enableSourcing: true, ignoreMandatoryFields: true });
                log.audit('采购单创建成功，采购单ID', poId);

                if (poId) {
                    try {
                        // 反写所有相关记录的采购订单ID
                        for (var i = 0; i < groupData.records.length; i++) {
                            var recordItem = groupData.records[i];
                            try {
                                if (type == 1) {
                                    // 其他广告：更新自定义记录中的采购单号
                                    record.submitFields({
                                        type: "customrecord_swc_op_advertisement",
                                        id: recordItem.internalId,
                                        values: {
                                            "custrecordcustrecord_swc_op_po_number_": poId
                                        }
                                    });
                                } else if (type == 2) {
                                    // 积加广告：更新自定义记录中的采购单号
                                    record.submitFields({
                                        type: "customrecord_swc_jj_advertisement_report",
                                        id: recordItem.internalId,
                                        values: {
                                            "custrecordcustrecord_swc_jj_adv_ponumber": poId
                                        }
                                    });
                                }
                            } catch (updateError) {
                                log.error("更新记录同步状态失败", updateError.toString());
                            }
                        }
                    } catch (e) {
                        log.error("反写采购单号失败", e.toString());
                    }
                }
            } catch (e) {
                log.error("reduce处理失败", {
                    error: e.message || JSON.stringify(e),
                    stack: e.stack,
                    原始数据: reduceContext.values
                });
            }
        }

        const summarize = (summaryContext) => {
            // 汇总阶段暂不需要处理
        }

        // ==================== 其他平台广告数据搜索（仅处理有SKU） ====================
        function getSearchList(storeType, startTime, endTime, customerId, secTypeJson) {
            var dataArray = [];

            var filterArray = [];
            filterArray.push(["custrecordcustrecord_swc_op_po_flag_", "notequalto", "1"]); // 是否同步
            filterArray.push("AND");
            filterArray.push(["custrecordcustrecord_swc_op_po_number_", "anyof", "@NONE@"]); // 采购单号为空
            filterArray.push("AND");
            filterArray.push(["custrecord_swc_price", "notlessthanorequalto", "0"]); // 金额大于0
            // 增加过滤：仅处理有SKU的记录
            filterArray.push("AND");
            filterArray.push(["custrecord_swc_sku", "isnotempty", ""]); // SKU不为空

            if (storeType) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_advertising_type", "anyof", storeType]);
            }
            if (customerId) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_store", "anyof", customerId]);
            }
            var startDate = null;
            var endDate = null;
            if (startTime) {
                startDate = format.format({ value: startTime, type: format.Type.DATE });
            }
            if (endTime) {
                endDate = format.format({ value: endTime, type: format.Type.DATE });
            }
            if (startDate) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_start_date", "onorafter", startDate]);
            }
            if (endDate) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_end_date", "onorbefore", endDate]);
            }

            var customrecord_swc_op_advertisementSearchObj = search.create({
                type: "customrecord_swc_op_advertisement",
                filters: filterArray,
                columns: [
                    search.createColumn({ name: "custrecord_swc_advertising_type", label: "广告类型" }),
                    search.createColumn({ name: "custrecord_swc_sku", label: "SKU" }),
                    search.createColumn({ name: "custrecord_swc_category", label: "品类" }),
                    search.createColumn({ name: "custrecord_swc_price", label: "金额" }),
                    search.createColumn({ name: "custrecord_swc_date", label: "日期" }),
                    search.createColumn({ name: "custrecord_swc_during", label: "期间" }),
                    search.createColumn({ name: "custrecord_swc_date_time", label: "日期时间" }),
                    search.createColumn({ name: "custrecord_swc_start_date", label: "开始日期" }),
                    search.createColumn({ name: "custrecord_swc_end_date", label: "结束日期" }),
                    search.createColumn({ name: "custrecord_swc_start_date_time", label: "开始日期时间" }),
                    search.createColumn({ name: "custrecord_swc_end_date_time", label: "结束日期时间" }),
                    search.createColumn({ name: "custrecord_swc_store", label: "店铺" }),
                    search.createColumn({ name: "custrecord_swc_op_currency", label: "货币" }),
                    search.createColumn({ name: "custrecord_swc_op_order_number", label: "单据号" }),
                    search.createColumn({ name: "internalid", label: "内部 ID" }),
                    search.createColumn({ name: "custrecordcustrecord_swc_op_po_number_", label: "采购订单号" }),
                    search.createColumn({ name: "subsidiary", join: "CUSTRECORD_SWC_STORE", label: "主要子公司" }),
                    search.createColumn({ name: "custrecord_swc_op_platform", label: "平台" })
                ]
            });

            var searchResult = getAllSearchObj(customrecord_swc_op_advertisementSearchObj);
            log.debug("其他平台广告数据搜索结果数量（有SKU）", searchResult.length);

            // 直接处理有SKU的记录（不需要再区分，因为搜索已过滤）
            var skuGroupedData = processSkuRecords(searchResult);
            for (var j = 0; j < skuGroupedData.length; j++) {
                dataArray.push(skuGroupedData[j]);
            }

            return dataArray;
        }

        // 处理有SKU的记录
        function processSkuRecords(records) {
            var groupedData = {};
            var dataArray = [];

            var allCurrencyNames = [];
            var allStoreNames = [];

            for (var i = 0; i < records.length; i++) {
                var result = records[i];
                var currency = result.getValue({ name: "custrecord_swc_op_currency", label: "货币" });
                if (currency && allCurrencyNames.indexOf(currency) == -1) {
                    allCurrencyNames.push(currency);
                }
                var store = result.getValue({ name: "custrecord_swc_store", label: "店铺" });
                if (store && allStoreNames.indexOf(store) == -1) {
                    allStoreNames.push(store);
                }
            }

            var currencyIdMap = searchCurrency(allCurrencyNames);

            for (var j = 0; j < records.length; j++) {
                var result = records[j];
                try {
                    var store = result.getText({ name: "custrecord_swc_store", label: "店铺" });
                    var orderNumber = result.getValue({ name: "custrecord_swc_op_order_number", label: "单据号" });
                    var currency = result.getValue({ name: "custrecord_swc_op_currency", label: "货币" });

                    if (!store || !orderNumber) {
                        log.audit("跳过缺少店铺或单据号的记录", {
                            索引: j,
                            internalid: result.getValue({ name: "internalid", label: "内部 ID" })
                        });
                        continue;
                    }

                    var groupKey = store + "_" + orderNumber;

                    if (!groupedData[groupKey]) {
                        groupedData[groupKey] = {
                            store: store,
                            orderNumber: orderNumber,
                            currency: currency,
                            currencyId: currencyIdMap[currency] || null,
                            records: [],
                            totalAmount: 0,
                            hasSku: true
                        };
                    }

                    var internalId = result.getValue({ name: "internalid", label: "内部 ID" });
                    var advertisingType = result.getText({ name: "custrecord_swc_advertising_type", label: "广告类型" });
                    var advertisingTypeId = result.getValue({ name: "custrecord_swc_advertising_type", label: "广告类型" });
                    var item = result.getValue({ name: "custrecord_swc_sku", label: "SKU" });
                    var price = parseFloat(result.getValue({ name: "custrecord_swc_price", label: "金额" })) || 0;
                    var subsidiary = result.getValue({ name: "subsidiary", join: "CUSTRECORD_SWC_STORE", label: "主要子公司" });

                    var recordData = {
                        internalId: internalId,
                        advertisingType: advertisingType,
                        advertisingTypeId: advertisingTypeId,
                        item: item,
                        price: price,
                        currency: currency,
                        subsidiary: subsidiary,
                        hasSku: true
                    };

                    groupedData[groupKey].records.push(recordData);
                    groupedData[groupKey].totalAmount += price;

                    if (groupedData[groupKey].records.length === 1) {
                        groupedData[groupKey].subsidiary = subsidiary;
                    }
                } catch (e) {
                    log.error("处理有SKU搜索结果失败", { error: e.toString() });
                }
            }

            var groupKeys = Object.keys(groupedData);
            for (var k = 0; k < groupKeys.length; k++) {
                dataArray.push(groupedData[groupKeys[k]]);
            }
            log.audit("有SKU数据分组完成", { 分组数量: dataArray.length });
            return dataArray;
        }

        // ==================== 积加广告数据搜索（仅处理有MSKU） ====================
        function getSearchListJJ(storeType, startTime, endTime, customerId, jjType, secTypeJson) {
            var dataArray = [];
            var filterArray = [];
            filterArray.push(["custrecordcustrecord_swc_jj_adv_flag", "notequalto", "1"]);
            filterArray.push("AND");
            filterArray.push(["custrecordcustrecord_swc_jj_adv_ponumber", "anyof", "@NONE@"]);
            filterArray.push("AND");
            filterArray.push(["custrecord_swc_jj_adv_cost", "notlessthanorequalto", "0"]);
            // 增加过滤：仅处理有MSKU的记录
            filterArray.push("AND");
            filterArray.push(["custrecord_swc_jj_adv_msku", "isnotempty", ""]);

            if (jjType) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_jj_adv_type", "is", jjType]);
            }
            if (customerId) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_jj_adv_store", "anyof", customerId]);
            }
            var startDate = null;
            var endDate = null;
            if (startTime) {
                startDate = format.format({ value: startTime, type: format.Type.DATE });
            }
            if (endTime) {
                endDate = format.format({ value: endTime, type: format.Type.DATE });
            }
            if (startDate) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_jj_adv_startdate", "onorafter", startDate]);
            }
            if (endDate) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_jj_adv_enddate", "onorbefore", endDate]);
            }

            var customrecord_swc_jj_advertisement_reportSearchObj = search.create({
                type: "customrecord_swc_jj_advertisement_report",
                filters: filterArray,
                columns: [
                    search.createColumn({ name: "custrecord_swc_jj_adv_store", label: "店铺" }),
                    search.createColumn({ name: "custrecord_swc_jj_adv_campaignname", label: "campaignName" }),
                    search.createColumn({ name: "custrecord_swc_jj_adv_type", label: "积加广告类型" }),
                    search.createColumn({ name: "custrecord_swc_jj_adv_msku", label: "msku" }),
                    search.createColumn({ name: "custrecord_swc_jj_adv_cost", label: "cost" }),
                    search.createColumn({ name: "custrecord_swc_jj_adv_adsorders", label: "adsOrders" }),
                    search.createColumn({ name: "custrecord_swc_jj_adv_adssales", label: "adsSales" }),
                    search.createColumn({ name: "internalid", label: "内部 ID" }),
                    search.createColumn({ name: "custrecordcustrecord_swc_jj_adv_ponumber", label: "采购订单号" }),
                    search.createColumn({ name: "custrecordcustrecord_swc_jj_adv_flag", label: "是否同步" }),
                    search.createColumn({ name: "custrecord_swc_jj_adv_startdate", label: "开始时间" }),
                    search.createColumn({ name: "custrecord_swc_jj_adv_enddate", label: "结束时间" }),
                    search.createColumn({ name: "custrecord_swc_jj_adv_marketid", label: "marketId" }),
                    search.createColumn({ name: "custrecord_swc_jj_adv_campaignid", label: "campaignId" }),
                    search.createColumn({ name: "custrecord_swc_jj_adv_groupid", label: "groupid" }),
                    search.createColumn({ name: "custrecord_swc_jj_adv_groupname", label: "groupname" }),
                    search.createColumn({ name: "custrecord_swc_jj_adv_servingstatus", label: "servingstatus" }),
                    search.createColumn({ name: "custrecord_swc_jj_adv_portfolioname", label: "portfolioName" }),
                ]
            });

            var searchResult = getAllSearchObj(customrecord_swc_jj_advertisement_reportSearchObj);
            log.audit("积加广告数据搜索结果数量（有MSKU）", searchResult.length);

            var mskuGroupedData = processSkuRecordsJJ(searchResult);
            for (var j = 0; j < mskuGroupedData.length; j++) {
                dataArray.push(mskuGroupedData[j]);
            }
            return dataArray;
        }

        // 处理积加广告中有MSKU的记录
        function processSkuRecordsJJ(records) {
            var groupedData = {};
            var dataArray = [];

            var allStoreNames = [];

            for (var i = 0; i < records.length; i++) {
                var result = records[i];
                try {
                    var campaignId = result.getValue({ name: "custrecord_swc_jj_adv_campaignid", label: "campaignId" });
                    var store = result.getText({ name: "custrecord_swc_jj_adv_store", label: "店铺" });

                    if (store && allStoreNames.indexOf(store) == -1) {
                        allStoreNames.push(store);
                    }

                    if (!store) {
                        log.audit("跳过缺少store的记录", { internalid: result.getValue({ name: "internalid", label: "内部 ID" }) });
                        continue;
                    }

                    var groupKey = store.toString();

                    if (!groupedData[groupKey]) {
                        groupedData[groupKey] = {
                            campaignId: campaignId,
                            campaignName: "",
                            store: store,
                            advType: "",
                            records: [],
                            hasSku: true
                        };
                    }

                    var internalId = result.getValue({ name: "internalid", label: "内部 ID" });
                    var campaignName = result.getValue({ name: "custrecord_swc_jj_adv_campaignname", label: "campaignName" });
                    var advType = result.getText({ name: "custrecord_swc_jj_adv_type", label: "积加广告类型" });
                    var msku = result.getValue({ name: "custrecord_swc_jj_adv_msku", label: "msku" });
                    var cost = parseFloat(result.getValue({ name: "custrecord_swc_jj_adv_cost", label: "cost" })) || 0;

                    var recordData = {
                        internalId: internalId,
                        msku: msku,
                        cost: cost,
                        hasSku: true
                    };

                    groupedData[groupKey].records.push(recordData);

                    if (groupedData[groupKey].records.length === 1) {
                        groupedData[groupKey].campaignName = campaignName || "";
                        groupedData[groupKey].advType = advType || "";
                    }
                } catch (e) {
                    log.error("处理积加有MSKU搜索结果失败", { error: e.toString() });
                }
            }

            var groupKeys = Object.keys(groupedData);
            for (var j = 0; j < groupKeys.length; j++) {
                dataArray.push(groupedData[groupKeys[j]]);
            }
            log.audit("积加广告有MSKU分组完成", { 分组数量: dataArray.length });
            return dataArray;
        }

        // ==================== 添加记录到采购单 ====================
        function addAllRecordsToPo(poRec, records) {
            var sublistId = "item";
            var addedLines = 0;
            log.audit("开始添加其他广告行，数量：", records.length);

            var allAdvertisingTypes = [];
            for (var i = 0; i < records.length; i++) {
                var recordItem = records[i];
                if (recordItem.advertisingType && allAdvertisingTypes.indexOf(recordItem.advertisingType) === -1) {
                    allAdvertisingTypes.push(recordItem.advertisingType);
                }
            }
            log.audit("广告类型集合", allAdvertisingTypes);

            var itemIdMap = searchItemIdsByAdvertisingTypes(allAdvertisingTypes);

            for (var j = 0; j < records.length; j++) {
                var recordItem = records[j];
                try {
                    if (!recordItem.advertisingType) {
                        log.audit("跳过无效记录，缺少广告类型", { 索引: j, recordId: recordItem.internalId });
                        continue;
                    }
                    var itemId = itemIdMap[recordItem.advertisingType];
                    if (!itemId) {
                        log.audit("跳过记录，未找到广告类型对应的货品", { 广告类型: recordItem.advertisingType });
                        continue;
                    }

                    poRec.selectNewLine({ sublistId: sublistId });
                    poRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'item', value: itemId });
                    poRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'rate', value: recordItem.price });
                    poRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'amount', value: recordItem.price });
                    poRec.commitLine({ sublistId: sublistId });
                    addedLines++;
                } catch (lineError) {
                    log.error("添加行数据失败", lineError.toString());
                }
            }
            log.audit("添加其他广告行数据完成，成功添加行数：", addedLines);
            return addedLines;
        }

        function addJJRecordsToPo(poRec, records, onSiteAds) {
            var sublistId = "item";
            var addedLines = 0;
            var itemId = onSiteAds;
            if (!itemId) return 0;

            for (var i = 0; i < records.length; i++) {
                var recordItem = records[i];
                var cost = recordItem.cost || 0;
                if (cost <= 0) continue;

                try {
                    poRec.selectNewLine({ sublistId: sublistId });
                    poRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'item', value: itemId });
                    poRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'rate', value: cost });
                    poRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'amount', value: cost });
                    poRec.commitLine({ sublistId: sublistId });
                    addedLines++;
                } catch (e) {
                    log.error("添加积加广告行失败", { cost: cost, error: e.toString() });
                }
            }
            return addedLines;
        }

        // ==================== 辅助函数 ====================
        function vendorSearchByName(storeNames) {
            var vendorInfoMap = {};
            if (!storeNames || storeNames.length === 0) {
                return vendorInfoMap;
            }
            try {
                var searchFilters = [];
                if (storeNames.length === 1) {
                    searchFilters.push(["entityid", "is", storeNames[0]]);
                } else {
                    var temp = [];
                    for (var i = 0; i < storeNames.length; i++) {
                        temp.push(["entityid", "is", storeNames[i]]);
                        if (i < storeNames.length - 1) temp.push("OR");
                    }
                    searchFilters.push(temp);
                }

                var vendorSearchObj = search.create({
                    type: "vendor",
                    filters: searchFilters,
                    columns: [
                        search.createColumn({ name: "entityid", label: "名称" }),
                        search.createColumn({ name: "internalid", label: "内部 ID" }),
                        search.createColumn({ name: "subsidiary", label: "主要子公司" }),
                        search.createColumn({ name: "custentity_swc_payment_terms", label: "付款条件" }),
                    ]
                });
                var results = getAllSearchObj(vendorSearchObj);
                results.forEach(function (result) {
                    var vendorId = result.getValue({ name: "internalid", label: "内部 ID" });
                    var vendorName = result.getValue({ name: "entityid", label: "名称" });
                    var subsidiary = result.getValue({ name: "subsidiary", label: "主要子公司" });
                    var paymentTerms = result.getValue({ name: "custentity_swc_payment_terms", label: "付款条件" });
                    let paymentTermId = paymentTerms ? paymentTerms.split(",")[0] : "";
                    vendorInfoMap[vendorName] = {
                        vendorId: vendorId,
                        subsidiary: subsidiary,
                        paymentTermId: paymentTermId
                    };
                });
            } catch (e) {
                log.error("查询供应商信息失败", { error: e.toString() });
            }
            return vendorInfoMap;
        }

        function searchItemIdsByAdvertisingTypes(advertisingTypes) {
            var itemIdMap = {};
            if (!advertisingTypes || advertisingTypes.length === 0) return itemIdMap;
            try {
                var searchFilters = [];
                if (advertisingTypes.length === 1) {
                    searchFilters.push(["name", "is", advertisingTypes[0]]);
                } else {
                    var temp = [];
                    for (var j = 0; j < advertisingTypes.length; j++) {
                        temp.push(["name", "is", advertisingTypes[j]]);
                        if (j < advertisingTypes.length - 1) temp.push("OR");
                    }
                    searchFilters.push(temp);
                }

                var serviceitemSearchObj = search.create({
                    type: "serviceitem",
                    filters: [["type", "anyof", "Service"], "AND", searchFilters],
                    columns: [
                        search.createColumn({ name: "itemid", label: "货品编号" }),
                        search.createColumn({ name: "internalid", label: "内部ID" }),
                        search.createColumn({ name: "name", label: "名称" })
                    ]
                });
                var resultSet = getAllSearchObj(serviceitemSearchObj);
                for (var k = 0; k < resultSet.length; k++) {
                    var result = resultSet[k];
                    var itemId = result.getValue({ name: "internalid", label: "内部ID" });
                    var itemName = result.getValue({ name: "name", label: "名称" });
                    itemIdMap[itemName] = itemId;
                }
            } catch (e) {
                log.error("批量获取货品ID失败", { error: e.toString() });
            }
            return itemIdMap;
        }

        function searchCurrency(currencyNames) {
            var currencyMap = {};
            if (!currencyNames || currencyNames.length === 0) return currencyMap;
            try {
                var searchFilters = [];
                if (currencyNames.length === 1) {
                    searchFilters.push(["symbol", "is", currencyNames[0]]);
                } else {
                    var temp = [];
                    for (var j = 0; j < currencyNames.length; j++) {
                        temp.push(["symbol", "is", currencyNames[j]]);
                        if (j < currencyNames.length - 1) temp.push("OR");
                    }
                    searchFilters.push(temp);
                }

                var currencySearchObj = search.create({
                    type: "currency",
                    filters: searchFilters,
                    columns: [
                        search.createColumn({ name: "internalid", label: "内部 ID" }),
                        search.createColumn({ name: "symbol", label: "符号" })
                    ]
                });
                var results = getAllSearchObj(currencySearchObj);
                for (var k = 0; k < results.length; k++) {
                    var result = results[k];
                    var currencyId = result.getValue({ name: "internalid", label: "内部 ID" });
                    var currencyName = result.getValue({ name: "symbol", label: "符号" });
                    currencyMap[currencyName] = currencyId;
                }
            } catch (e) {
                log.error("批量获取货币ID失败", { error: e.toString() });
            }
            return currencyMap;
        }

        function getAllSearchObj(searchObj) {
            var RESULTCOUNT = 4000;
            var SIZE = 1000;
            var searchResultCount = searchObj.runPaged().count;
            var resList = [];
            if (searchResultCount > RESULTCOUNT) {
                var resultSet = searchObj.run();
                var max = Math.ceil(searchResultCount / SIZE);
                for (var i = 0; i < max; i++) {
                    var results = resultSet.getRange({ start: SIZE * i, end: SIZE * i + SIZE });
                    for (var j = 0; j < results.length; j++) {
                        resList.push(results[j]);
                    }
                }
            } else {
                searchObj.run().each(function (result) {
                    resList.push(result);
                    return true;
                });
            }
            return resList;
        }

        function getSecTypeJson() {
            let secTypeJson = {};
            var customrecord_swc_ejlmSearchObj = search.create({
                type: "customrecord_swc_ejlm",
                filters: [["isinactive", "is", "F"]],
                columns: [search.createColumn({ name: "name", label: "名称" })]
            });
            let results = getAllSearchObj(customrecord_swc_ejlmSearchObj);
            if (!results || results.length <= 0) return secTypeJson;
            for (let i = 0; i < results.length; i++) {
                secTypeJson[results[i].getValue({ name: "name" })] = results[i].id;
            }
            return secTypeJson;
        }

        return {
            getInputData,
            // map,
            reduce,
            summarize
        }
    });