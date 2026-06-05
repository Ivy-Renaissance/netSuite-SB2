/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * 获取其他平台广告数据/积加广告数据，生成采购订单及账单
 */
define(["N/search", "N/record", "N/runtime", 'N/task', 'N/format', "../common/SWC_Utils.js"],

    (search, record, runtime, task, format, SWC_Utils) => {

        const getInputData = (inputContext) => {
            var obj = runtime.getCurrentScript();
            var type = obj.getParameter({ name: "custscript_swc_mr_type" });//脚本中的参数ID
            var onSiteAds = obj.getParameter({ name: "custscript_swc_mr_on_site_ads" });//货品参数
            log.debug("货品", onSiteAds);
            var advertisementType = obj.getParameter({ name: "custscript_advertisementtype" });//其他广告类型参数
            var startTime = obj.getParameter({ name: "custscript_starttime" });//开始时间
            var endTime = obj.getParameter({ name: "custscript_endtime" });//结束时间
            var customerId = obj.getParameter({ name: "custscript_customerid" });//店铺
            var jjType = obj.getParameter({ name: "custscript_jj_advertisement_type" });//积加广告类型

            log.debug("advertisementType", advertisementType);
            log.debug("startTime", startTime);
            log.debug("endTime", endTime);
            log.debug("customerId", customerId);
            log.debug("jjType", jjType);

            var date = new Date();
            log.debug("开始时间", date.getTime());

            var groupedData = [];

            let secTypeJson = getSecTypeJson();
            if (type == 1) {
                groupedData = getSearchList(advertisementType, startTime, endTime, customerId, secTypeJson);
            } else {
                groupedData = getSearchListJJ(advertisementType, startTime, endTime, customerId, jjType, secTypeJson);
            }

            var allStoreNames = [];
            for (var i = 0; i < groupedData.length; i++) {
                var group = groupedData[i];
                if (group.store && allStoreNames.indexOf(group.store) === -1) {
                    allStoreNames.push(group.store);
                }
            }

            if (allStoreNames.length > 0) {
                //根据店铺名称查询店铺ID和店铺子公司
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
            log.debug('groupedData', groupedData);
            return groupedData;
        }

        const map = (mapContext) => {
            try {
                var obj = runtime.getCurrentScript();
                var type = obj.getParameter({ name: "custscript_swc_mr_type" });//脚本中的参数ID
                var onSiteAds = obj.getParameter({ name: "custscript_swc_mr_on_site_ads" });//货品参数
                var purchaseEmployee = obj.getParameter({ name: "custscript_swc_mr_purchase_employee" }); // 采购员
                var poFeeType = obj.getParameter({ name: "custscript_swc_mr_po_fee" }); // 费用类型采购订单 广告费用
                var poForm = obj.getParameter({ name: "custscript_swc_mr_po_form" }); // 采购单 表单
                var poStatus = obj.getParameter({ name: "custscript_swc_mr_po_status" }); // 采购订单审批状态 待审批
                var customPoStatus = obj.getParameter({ name: "custscript_swc_mr_custom_po_sataus" }); // 审批状态 待审批

                var groupData = JSON.parse(mapContext.value);
                log.debug("开始处理分组", groupData);

                // 检查是否有供应商ID
                if (!groupData.vendorId) {
                    log.error("缺少供应商ID，无法创建采购单", { 店铺: groupData.store });
                }

                // 如果是无SKU数据且需要发票查询，在map中执行发票查询和金额分配
                if (type == 1 && groupData.hasSku === false && groupData.needInvoiceQuery === true) {

                    try {
                        // 格式化日期
                        var startDateStr = null;
                        var endDateStr = null;
                        if (groupData.minStartDate) {
                            startDateStr = formatDate(new Date(groupData.minStartDate));
                        }
                        if (groupData.maxEndDate) {
                            endDateStr = formatDate(new Date(groupData.maxEndDate));
                        }
                        let category = groupData.category;

                        log.debug("开始处理无SKU分组的发票查询和金额分配", {
                            分组标识: groupData.store + "_" + groupData.orderNumber,
                            子公司: groupData.subsidiary,
                            店铺ID: groupData.storeId,
                            stores: groupData.stores,
                            category: groupData.category,
                            startDateStr: startDateStr,
                            endDateStr: endDateStr
                        });

                        var stores = groupData.stores;
                        var store_filter = groupData.storeId;
                        if (stores) {
                            store_filter = stores.split(',');
                        }

                        let filters = [
                            ["mainline", "is", "F"],
                            "AND",
                            ["shipping", "is", "F"],
                            "AND",
                            ["taxline", "is", "F"],
                            "AND",
                            ["type", "anyof", "CustInvc"],
                            "AND",
                            ["subsidiary", "anyof", groupData.subsidiary],
                            "AND",
                            ["mainname", "anyof", store_filter],
                            // "AND",
                            // ["trandate","within", startDateStr, endDateStr]
                        ];
                        if (category) filters.push("AND", ["item.custitem_swc_ejlm", "anyof", category]);
                        if (startDateStr) filters.push("AND", ["trandate", "onorafter", startDateStr]);
                        if (endDateStr) filters.push("AND", ["trandate", "onorbefore", endDateStr]);
                        log.debug('发票检索 filters',filters)

                        // 创建发票检索 - 获取明细数据
                        var invoiceDetailSearchObj = search.create({
                            type: "invoice",
                            title: '发票检索 - 获取明细数据 广告费' + new Date(),
                            filters: filters,
                            columns: [
                                search.createColumn({ name: "fxamount", summary: "SUM", label: "金额（外币）" }),
                                search.createColumn({ name: "item", summary: "GROUP", label: "货品" }),
                                search.createColumn({ name: "displayname", join: "ITEM", summary: "GROUP", label: "货品" }),
                                search.createColumn({ name: "trandate", summary: "GROUP", label: "日期" })
                            ]
                        });
                        var searchid = invoiceDetailSearchObj.save();
                        log.debug('searchid',searchid);

                        // 获取所有发票数据
                        var invoiceDetails = [];
                        var invoiceTotal = 0;

                        // 使用runPaged()获取所有结果
                        var pagedData = invoiceDetailSearchObj.runPaged();

                        // 遍历所有页面
                        pagedData.pageRanges.forEach(function (pageRange) {
                            var page = pagedData.fetch(pageRange);
                            page.data.forEach(function (result) {
                                try {
                                    var fxAmount = parseFloat(result.getValue({ name: "fxamount", summary: "SUM", label: "金额（外币）" })) || 0;
                                    var itemId = result.getValue({ name: "item", summary: "GROUP", label: "货品" });
                                    var itemName = result.getValue({ name: "displayname", join: "ITEM", summary: "GROUP" });
                                    var trandate = result.getValue({ name: "trandate", summary: "GROUP", label: "日期" });

                                    invoiceDetails.push({
                                        amount: fxAmount,
                                        itemId: itemId,
                                        itemName: itemName,
                                        trandate: trandate
                                    });
                                    invoiceTotal += fxAmount;
                                } catch (e) {
                                    log.error("处理发票记录时出错", e.toString());
                                }
                            });
                        });

                        log.debug("发票查询结果", {
                            发票汇总金额: invoiceTotal,
                            发票明细数量: invoiceDetails.length
                        });

                        // 使用发票明细数据分配金额到每条记录
                        if (invoiceTotal > 0 && invoiceDetails.length > 0) {
                            // 清空原有的records，准备重新生成
                            groupData.records = [];

                            // 为每条发票明细分配金额
                            var accumulatedAllocated = 0;
                            for (let tkey in groupData.totalAmount) {
                                let totalAmount = groupData.totalAmount[tkey];
                                for (var idx = 0; idx < invoiceDetails.length; idx++) {
                                    var invoiceItem = invoiceDetails[idx];
                                    var ratio = SWC_Utils.divSumIsNumber(invoiceItem.amount, invoiceTotal, 2);
                                    var isLast = (idx === invoiceDetails.length - 1);
                                    var allocatedAmount;

                                    if (isLast) {
                                        // 最后一条：直接使用总金额减去前面累加的向下取整金额，自然弥补尾差
                                        allocatedAmount = totalAmount - accumulatedAllocated;
                                        // 注：由于 totalAmount 和 accumulatedAllocated 均为两位小数，
                                        // 减法结果理论上是精确的两位小数，无需再向下取整，否则会重新产生差额。
                                    } else {
                                        // 非最后一条：严格向下取整保留两位小数（截断）
                                        var rawAmount = ratio * totalAmount;
                                        allocatedAmount = Math.floor(rawAmount * 100) / 100;
                                        if (allocatedAmount == 0) continue;
                                    }

                                    accumulatedAllocated += allocatedAmount;

                                    var sourceRecord = groupData.invoiceDetails[0] || {};


                                    // 创建分配后的记录
                                    groupData.records.push({
                                        price: allocatedAmount,
                                        item: invoiceItem.itemId,
                                        itemName: invoiceItem.itemName,
                                        advertisingTypeId: tkey.split('_')[0],
                                        advertisingType: tkey.split('_')[1],
                                        storeId: sourceRecord.storeId,
                                        currency: sourceRecord.currency,
                                        hasSku: false,
                                        orderNumber: groupData.orderNumber,
                                        platform: sourceRecord.platform,
                                        startDate: sourceRecord.startDate,
                                        endDate: sourceRecord.endDate,
                                        laterDate: groupData.laterDate
                                    });
                                }
                            }


                            log.debug("金额分配完成", {
                                分配前总金额: groupData.totalAmount,
                                分配后总金额: groupData.records.reduce((sum, item) => sum + item.price, 0),
                                分配记录数: groupData.records.length
                            });
                        } else {
                            var qtFilter = [
                                ["custrecord_swc_pt_sku_map_store", "anyof", groupData.storeId],
                                "AND",
                                ["custrecord_swc_pt_sku_map_item", "noneof", "@NONE@"],
                            ];
                            if (category) {
                                qtFilter.push("AND");
                                qtFilter.push(["custrecord_swc_pt_sku_map_item.custitem_swc_ejlm", "noneof", category]);
                            }
                            //检索其它平台
                            const customrecord_swc_platform_sku_mappingSearchObj = search.create({
                                type: "customrecord_swc_platform_sku_mapping",
                                filters:
                                qtFilter,
                                columns:
                                    [
                                        search.createColumn({
                                            name: "custrecord_swc_pt_sku_map_item",
                                            summary: "GROUP",
                                            label: "Item"
                                        }),
                                        search.createColumn({
                                            name: "displayname",
                                            join: "CUSTRECORD_SWC_PT_SKU_MAP_ITEM",
                                            summary: "GROUP",
                                            label: "货品名称"
                                        }),
                                    ]
                            });

                            // 获取所有SKU映射表数据
                            var invoiceDetails2 = [];

                            // 使用runPaged()获取所有结果
                            var pagedData2 = customrecord_swc_platform_sku_mappingSearchObj.runPaged();

                            // 遍历所有页面
                            pagedData2.pageRanges.forEach(function (pageRange) {
                                var page = pagedData2.fetch(pageRange);
                                page.data.forEach(function (result) {
                                    try {
                                        var itemId = result.getValue({
                                            name: "custrecord_swc_pt_sku_map_item",
                                            summary: "GROUP",
                                            label: "Item"
                                        });
                                        var itemName = result.getValue({
                                            name: "displayname",
                                            join: "CUSTRECORD_SWC_PT_SKU_MAP_ITEM",
                                            summary: "GROUP",
                                            label: "货品名称"
                                        });

                                        invoiceDetails2.push({
                                            itemId: itemId,
                                            itemName: itemName,
                                        });
                                    } catch (e) {
                                        log.error("处理记录时出错", e.toString());
                                    }
                                });
                            });

                            if (invoiceDetails2.length > 0) {
                                groupData.records = [];

                                for (let tkey in groupData.totalAmount) {
                                    let totalAmount = groupData.totalAmount[tkey];
                                    var accumulatedAllocated = 0;
                                    for (var idx = 0; idx < invoiceDetails2.length; idx++) {
                                        var invoiceItem = invoiceDetails2[idx];
                                        var ratio = 1 / invoiceDetails2.length;
                                        var isLast = (idx === invoiceDetails2.length - 1);
                                        var allocatedAmount;

                                        if (isLast) {
                                            // 最后一条：直接使用总金额减去前面累加的向下取整金额，自然弥补尾差
                                            allocatedAmount = totalAmount - accumulatedAllocated;
                                            // 注：由于 totalAmount 和 accumulatedAllocated 均为两位小数，
                                            // 减法结果理论上是精确的两位小数，无需再向下取整，否则会重新产生差额。
                                        } else {
                                            // 非最后一条：严格向下取整保留两位小数（截断）
                                            var rawAmount = ratio * totalAmount;
                                            allocatedAmount = Math.floor(rawAmount * 100) / 100;
                                            if (allocatedAmount == 0) continue;
                                        }

                                        accumulatedAllocated += allocatedAmount;

                                        var sourceRecord = groupData.invoiceDetails[0] || {};

                                        // 创建分配后的记录
                                        groupData.records.push({
                                            price: allocatedAmount,
                                            item: invoiceItem.itemId,
                                            itemName: invoiceItem.itemName,
                                            advertisingTypeId: tkey.split('_')[0],
                                            advertisingType: tkey.split('_')[1],
                                            storeId: sourceRecord.storeId,
                                            currency: sourceRecord.currency,
                                            hasSku: false,
                                            orderNumber: groupData.orderNumber,
                                            platform: sourceRecord.platform,
                                            startDate: sourceRecord.startDate,
                                            endDate: sourceRecord.endDate,
                                            laterDate: groupData.laterDate
                                        });
                                    }
                                }

                                log.debug('sku映射表数据', groupData.records);
                            }
                        }

                        // 标记发票查询已完成
                        delete groupData.needInvoiceQuery;

                    } catch (e) {
                        log.error("发票查询或金额分配失败", {
                            分组标识: groupData.store + "_" + groupData.orderNumber,
                            error: e.toString()
                        });
                    }
                }

                // 如果是积加广告的无SKU数据且需要发票查询
                if (type == 2 && groupData.hasSku === false && groupData.needInvoiceQuery === true) {

                    try {
                        // 格式化日期
                        var startDateStr = null;
                        var endDateStr = null;
                        if (groupData.minStartDate) {
                            startDateStr = formatDate(new Date(groupData.minStartDate));
                        }
                        if (groupData.maxEndDate) {
                            endDateStr = formatDate(new Date(groupData.maxEndDate));
                        }
                        let category = groupData.category;

                        log.debug("开始处理积加广告无MSKU分组的发票查询和金额分配", {
                            分组标识: groupData.campaignId,
                            子公司: groupData.vendorSubsidiary,
                            店铺ID: groupData.storeId,
                            category: groupData.category,
                            startDateStr: startDateStr,
                            endDateStr: endDateStr
                        });

                        let filters = [
                            ["mainline", "is", "F"],
                            "AND",
                            ["shipping", "is", "F"],
                            "AND",
                            ["taxline", "is", "F"],
                            "AND",
                            ["type", "anyof", "CustInvc"],
                            "AND",
                            ["subsidiary", "anyof", groupData.vendorSubsidiary],
                            "AND",
                            ["mainname", "anyof", groupData.storeId],
                            // "AND",
                            // ["trandate", "onorafter", startDateStr, endDateStr]
                        ];
                        if (category) filters.push("AND", ["item.custitem_swc_ejlm", "anyof", category]);
                        if (startDateStr) filters.push("AND", ["trandate", "onorafter", startDateStr]);
                        if (endDateStr) filters.push("AND", ["trandate", "onorbefore", endDateStr]);

                        // 创建发票检索
                        var invoiceDetailSearchObj = search.create({
                            type: "invoice",
                            filters: filters,
                            columns: [
                                search.createColumn({ name: "fxamount", summary: "SUM", label: "金额（外币）" }),
                                search.createColumn({ name: "item", summary: "GROUP", label: "货品" }),
                                search.createColumn({ name: "displayname", join: "ITEM", summary: "GROUP", label: "货品" }),
                                search.createColumn({ name: "trandate", summary: "GROUP", label: "日期" })
                            ]
                        });

                        // 获取所有发票数据
                        var invoiceDetails = [];
                        var invoiceTotal = 0;

                        var pagedData = invoiceDetailSearchObj.runPaged();

                        pagedData.pageRanges.forEach(function (pageRange) {
                            var page = pagedData.fetch(pageRange);
                            page.data.forEach(function (result) {
                                try {
                                    var fxAmount = parseFloat(result.getValue({ name: "fxamount", summary: "SUM", label: "金额（外币）" })) || 0;
                                    var itemId = result.getValue({ name: "item", summary: "GROUP", label: "货品" });
                                    var itemName = result.getValue({ name: "displayname", join: "ITEM", summary: "GROUP" });

                                    invoiceDetails.push({ amount: fxAmount, itemId: itemId, itemName: itemName });
                                    invoiceTotal += fxAmount;
                                } catch (e) {
                                    log.error("处理积加广告发票记录时出错", e.toString());
                                }
                            });
                        });

                        log.debug("积加广告发票查询结果", {
                            发票汇总金额: invoiceTotal,
                            发票明细数量: invoiceDetails.length
                        });

                        // 使用发票明细数据分配金额
                        if (invoiceTotal > 0 && invoiceDetails.length > 0) {
                            // 清空原有的records
                            groupData.records = [];

                            // 为每条发票明细分配金额
                            var accumulatedAllocated = 0;
                            for (var idx = 0; idx < invoiceDetails.length; idx++) {
                                var invoiceItem = invoiceDetails[idx];
                                var ratio = SWC_Utils.divSumIsNumber(invoiceItem.amount, invoiceTotal, 2);
                                var isLast = (idx === invoiceDetails.length - 1);
                                var allocatedAmount;

                                if (isLast) {
                                    // 最后一条：直接使用总金额减去前面累加的向下取整金额，自然弥补尾差
                                    allocatedAmount = groupData.totalCost - accumulatedAllocated;
                                    // 注：由于 totalAmount 和 accumulatedAllocated 均为两位小数，
                                    // 减法结果理论上是精确的两位小数，无需再向下取整，否则会重新产生差额。
                                } else {
                                    // 非最后一条：严格向下取整保留两位小数（截断）
                                    var rawAmount = ratio * groupData.totalCost;
                                    allocatedAmount = Math.floor(rawAmount * 100) / 100;
                                    if (allocatedAmount == 0) continue;
                                }

                                accumulatedAllocated += allocatedAmount;

                                var sourceRecord = groupData.invoiceDetails[0] || {};

                                // 创建分配后的记录
                                groupData.records.push({
                                    cost: allocatedAmount,
                                    advType: sourceRecord.advType,
                                    advTypeId: sourceRecord.advTypeId,
                                    storeId: sourceRecord.storeId,
                                    campaignId: sourceRecord.campaignId,
                                    hasSku: false,
                                    itemName: invoiceItem.itemName,
                                    startDate: sourceRecord.startDate,
                                    endDate: sourceRecord.endDate,
                                    marketId: sourceRecord.marketId,
                                    groupid: sourceRecord.groupid,
                                    groupname: sourceRecord.groupname,
                                    servingstatus: sourceRecord.servingstatus,
                                    campaignName: sourceRecord.campaignName,
                                    laterDate: groupData.laterDate
                                });
                            }

                            log.debug("积加广告金额分配完成", {
                                分配前总成本: groupData.totalCost,
                                分配后总成本: groupData.records.reduce((sum, item) => sum + item.cost, 0),
                                分配记录数: groupData.records.length
                            });
                        } else {
                            var jjFilter = [
                                ["custrecord_swc_az_sku_map_store", "anyof", groupData.storeId],
                                "AND",
                                ["custrecord_swc_az_sku_map_item", "noneof", "@NONE@"],
                            ];
                            if (category) {
                                jjFilter.push("AND");
                                jjFilter.push(["custrecord_swc_az_sku_map_item.custitem_swc_ejlm", "noneof", category]);
                            }
                            //检索其它平台
                            const customrecord_swc_amazon_sku_mappingSearchObj = search.create({
                                type: "customrecord_swc_amazon_sku_mapping",
                                filters:
                                jjFilter,
                                columns:
                                    [
                                        search.createColumn({
                                            name: "custrecord_swc_az_sku_map_item",
                                            summary: "GROUP",
                                            label: "NS货品"
                                        }),
                                        search.createColumn({
                                            name: "itemid",
                                            join: "CUSTRECORD_SWC_AZ_SKU_MAP_ITEM",
                                            summary: "GROUP",
                                            label: "名称"
                                        })
                                    ]
                            });

                            // 获取所有SKU映射表数据
                            var invoiceDetails2 = [];

                            // 使用runPaged()获取所有结果
                            var pagedData2 = customrecord_swc_amazon_sku_mappingSearchObj.runPaged();

                            // 遍历所有页面
                            pagedData2.pageRanges.forEach(function (pageRange) {
                                var page = pagedData2.fetch(pageRange);
                                page.data.forEach(function (result) {
                                    try {
                                        var itemId = result.getValue({
                                            name: "custrecord_swc_az_sku_map_item",
                                            summary: "GROUP",
                                            label: "NS货品"
                                        });
                                        var itemName = result.getValue({
                                            name: "itemid",
                                            join: "CUSTRECORD_SWC_AZ_SKU_MAP_ITEM",
                                            summary: "GROUP",
                                            label: "名称"
                                        });

                                        invoiceDetails2.push({
                                            itemId: itemId,
                                            itemName: itemName,
                                        });
                                    } catch (e) {
                                        log.error("处理记录时出错", e.toString());
                                    }
                                });
                            });

                            if (invoiceDetails2.length > 0) {
                                groupData.records = [];
                                var accumulatedAllocated = 0;
                                for (var idx = 0; idx < invoiceDetails2.length; idx++) {
                                    var invoiceItem = invoiceDetails2[idx];
                                    var ratio = 1 / invoiceDetails2.length;
                                    var isLast = (idx === invoiceDetails2.length - 1);
                                    var allocatedAmount;

                                    if (isLast) {
                                        // 最后一条：直接使用总金额减去前面累加的向下取整金额，自然弥补尾差
                                        allocatedAmount = groupData.totalAmount - accumulatedAllocated;
                                        // 注：由于 totalAmount 和 accumulatedAllocated 均为两位小数，
                                        // 减法结果理论上是精确的两位小数，无需再向下取整，否则会重新产生差额。
                                    } else {
                                        // 非最后一条：严格向下取整保留两位小数（截断）
                                        var rawAmount = ratio * groupData.totalAmount;
                                        allocatedAmount = Math.floor(rawAmount * 100) / 100;
                                        if (allocatedAmount == 0) continue;
                                    }

                                    accumulatedAllocated += allocatedAmount;

                                    var sourceRecord = groupData.invoiceDetails[0] || {};

                                    // 创建分配后的记录
                                    groupData.records.push({
                                        cost: allocatedAmount,
                                        advType: sourceRecord.advType,
                                        advTypeId: sourceRecord.advTypeId,
                                        storeId: sourceRecord.storeId,
                                        campaignId: sourceRecord.campaignId,
                                        hasSku: false,
                                        itemName: invoiceItem.itemName,
                                        startDate: sourceRecord.startDate,
                                        endDate: sourceRecord.endDate,
                                        marketId: sourceRecord.marketId,
                                        groupid: sourceRecord.groupid,
                                        groupname: sourceRecord.groupname,
                                        servingstatus: sourceRecord.servingstatus,
                                        campaignName: sourceRecord.campaignName,
                                        laterDate: groupData.laterDate
                                    });
                                }
                            }
                        }

                        // 标记发票查询已完成
                        delete groupData.needInvoiceQuery;

                    } catch (e) {
                        log.error("积加广告发票查询或金额分配失败", {
                            分组标识: groupData.campaignId,
                            error: e.toString()
                        });
                    }
                }

                //日期标志
                var startTime = obj.getParameter({ name: "custscript_starttime" });//开始时间
                var endTime = obj.getParameter({ name: "custscript_endtime" });//结束时间
                var dataFlag;
                if (startTime && endTime) {
                    dataFlag = format.format({ value: startTime, type: format.Type.DATE }) + '至' + format.format({ value: endTime, type: format.Type.DATE }) + '花费'
                }

                log.debug('groupData', groupData);
                // 创建新的采购单
                var poRec = record.create({ type: 'purchaseorder', isDynamic: true, defaultValues: { "customform": poForm } });

                // 设置采购单字段 用供应商的子公司信息
                poRec.setValue({ fieldId: 'entity', value: groupData.vendorId }); // 供应商ID
                poRec.setValue({ fieldId: 'subsidiary', value: groupData.vendorSubsidiary }); // 子公司

                //其他广告需要设置货币,积加暂时自动带出货币
                let memo = "积加 广告报告";
                if (type == 1) {
                    memo = "其他平台广告数据";
                    poRec.setValue({ fieldId: 'currency', value: groupData.currencyId }); // 币种
                }

                if (dataFlag) {
                    memo = memo + ';' + dataFlag;
                }

                poRec.setValue({ fieldId: "employee", value: purchaseEmployee }); // 员工
                poRec.setValue({ fieldId: "custbody_swc_po_fee", value: poFeeType }); // 费用类型采购订单
                poRec.setValue({ fieldId: "custbody_swc_order_type2", value: poFeeType }); // 采购订单类型(手工单用)
                poRec.setValue({ fieldId: "memo", value: memo }); // 备注
                poRec.setValue({ fieldId: "approvalstatus", value: poStatus }); // 审批状态
                poRec.setValue({ fieldId: "custbody_swc_po_approal_fix", value: customPoStatus }); // 采购订单审批状态
                poRec.setValue({ fieldId: "custbody_swc_vendor_payment_terms", value: groupData.paymentTermId }); // 付款条件

                var addedLines = 0;
                if (type == 1) {//1其他广告
                    // 添加所有数据行到采购单子列表
                    addedLines = addAllRecordsToPo(poRec, groupData.records);
                } else if (type == 2) { //2积加广告
                    log.debug("groupData.campaignId", groupData.campaignId);
                    addedLines = addJJRecordsToPo(poRec, groupData.records, onSiteAds);
                }

                let lineCount = poRec.getLineCount({ sublistId: "item" });
                if (lineCount <= 0) {
                    log.debug("创建采购单", "未检索到发票 创建失败");
                    return;
                }
                // 保存采购单
                var poId = poRec.save({ enableSourcing: true, ignoreMandatoryFields: true });
                log.debug('采购单创建成功，采购单ID', poId);

                if (poId) {
                    try {
                        // 直接转换记录（po单-账单）
                        // var vendorbillRec = record.transform({
                        //     fromType: "purchaseorder",
                        //     fromId: poId,
                        //     toType: "vendorbill",
                        //     isDynamic: true
                        // });
                        // var recId = vendorbillRec.save();
                        // log.debug("账单创建成功", recId);

                        //反写同步状态和采购订单号
                        log.debug("开始反写同步状态", { 采购单ID: poId, 需要更新的记录数: groupData.records.length });
                        log.debug("po创建成功后groupData", groupData);

                        var returnKey = mapContext.key;
                        // 反写所有相关记录的采购订单ID
                        for (var i = 0; i < groupData.records.length; i++) {
                            var recordItem = groupData.records[i];
                            recordItem.type = type;
                            recordItem.poId = poId;
                            log.debug('反写相关记录');
                            mapContext.write({ key: '反写相关记录' + '_' + returnKey + '_' + i, value: recordItem });
                            // log.debug("recordItem", recordItem);
                        }

                        // 更新sku为空的原单的采购订单号 防止重复处理
                        let invoiceDetails = groupData.invoiceDetails
                        // log.debug('groupData.invoiceDetails', groupData.invoiceDetails.length);
                        if (invoiceDetails) {
                            for (let index in invoiceDetails) {
                                let recId = invoiceDetails[index].internalId;
                                if (!recId) continue;
                                let recType = "customrecord_swc_op_advertisement"; // 其他平台广告数据
                                let poFieldId = "custrecordcustrecord_swc_op_po_number_"; // 其他平台广告数据.采购订单号
                                if (type == 2) {
                                    recType = "customrecord_swc_jj_advertisement_report"; // 积加 广告报告
                                    poFieldId = "custrecordcustrecord_swc_jj_adv_ponumber"; // 积加 广告报告.采购订单号
                                }
                                let values = {};
                                values[poFieldId] = poId;
                                log.debug('更新sku为空的原单');
                                mapContext.write({
                                    key: '更新sku为空的原单' + '_' + returnKey + '_' + recId, value: {
                                        recType: recType,
                                        recId: recId,
                                        values: values
                                    }
                                });
                                // record.submitFields({type: recType, id: recId, values: values});
                            }
                        }

                    } catch (e) {
                        log.error("错误", e.toString());
                    }
                }

                // 根据类型生成不同的输出键
                // var groupKey;
                // if(type == 1) {
                //     groupKey = groupData.store + "_" + groupData.orderNumber;
                // } else if(type == 2) {
                //     groupKey = groupData.campaignId;
                // }

                // mapContext.write({
                //     key: "success",
                //     value: JSON.stringify({
                //         groupKey: groupKey,
                //         poId: poId,
                //         recordCount: groupData.records.length,
                //         addedLines: addedLines,
                //         type: type,
                //         vendorId: groupData.vendorId,
                //         vendorSubsidiary: groupData.vendorSubsidiary,
                //     })
                // });

            } catch (e) {
                log.error("reduce处理失败", {
                    error: e.message || JSON.stringify(e),
                    stack: e.stack,
                    原始数据: mapContext.values
                });

                // mapContext.write({
                //     key: "fail",
                //     value: JSON.stringify({
                //         error: e.message,
                //         type: type,
                //         timestamp: new Date().toISOString()
                //     })
                // });
            }
        }

        const reduce = (reduceContext) => {
            var key = reduceContext.key;
            log.debug('key', key);
            var recordItem = JSON.parse(reduceContext.values);
            var type = key.split('_')[0];
            log.debug('recordItem', recordItem);
            try {
                if (type == '反写相关记录') {
                    if (recordItem.type == 1) {//1其他广告
                        if (recordItem.hasSku) {
                            record.submitFields({
                                type: "customrecord_swc_op_advertisement",
                                id: recordItem.internalId,  // 广告记录的内部ID
                                values: {
                                    // "custrecordcustrecord_swc_op_po_flag_": "1",  // 是否同步字段设为1（已同步）
                                    "custrecordcustrecord_swc_op_po_number_": recordItem.poId  // 采购订单的内部ID
                                }
                            });
                        } else {
                            var advertisementR = record.create(
                                { type: "customrecord_swc_op_advertisement", isDynamic: true });
                            advertisementR.setValue({ fieldId: "custrecord_swc_sku", value: recordItem.itemName });
                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_advertising_type", value: recordItem.advertisingTypeId });
                            advertisementR.setValue({ fieldId: "custrecord_swc_price", value: recordItem.price });
                            advertisementR.setValue({ fieldId: "custrecord_swc_store", value: recordItem.storeId });
                            // advertisementR.setValue({fieldId:"custrecordcustrecord_swc_op_po_flag_",value:"1"});
                            advertisementR.setValue(
                                { fieldId: "custrecordcustrecord_swc_op_po_number_", value: recordItem.poId });
                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_op_currency", value: recordItem.currency });

                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_op_platform", value: recordItem.platform });
                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_op_order_number", value: recordItem.orderNumber });
                            advertisementR.setValue({ fieldId: "custrecordcustrecord_swc_op_order_share", value: true });
                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_start_date_time", value: recordItem.startDate });
                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_end_date_time", value: recordItem.endDate });

                            var sDate = formatDateToYYYYMMDD(recordItem.startDate);
                            var eDate = formatDateToYYYYMMDD(recordItem.endDate);
                            // var kDate = formatDateToYYYYMMDD(recordItem.startDate);
                            // advertisementR.setText({fieldId: "custrecord_swc_start_date", text: sDate});
                            // advertisementR.setText({fieldId: "custrecord_swc_end_date", text: eDate});
                            // advertisementR.setValue({fieldId: "custrecord_swc_date_time", value: recordItem.endDate});
                            advertisementR.setText({ fieldId: "custrecord_swc_start_date", text: recordItem.laterDate });
                            advertisementR.setText({ fieldId: "custrecord_swc_end_date", text: recordItem.laterDate });
                            advertisementR.setValue({ fieldId: "custrecord_swc_date_time", value: recordItem.laterDate });
                            advertisementR.setText({ fieldId: "custrecord_swc_date", text: recordItem.laterDate });
                            var advertisementRId = advertisementR.save();
                            log.debug("自定义创建记录成功", advertisementRId);
                        }

                    } else if (recordItem.type == 2) {//积加
                        if (recordItem.hasSku) {
                            record.submitFields({
                                type: "customrecord_swc_jj_advertisement_report",
                                id: recordItem.internalId,  // 积加记录的内部ID
                                values: {
                                    // "custrecordcustrecord_swc_jj_adv_flag": "1",  // 是否同步字段设为1（已同步）
                                    "custrecordcustrecord_swc_jj_adv_ponumber": recordItem.poId  // 采购订单的内部ID
                                }
                            });
                        } else {

                            var advertisementR = record.create(
                                { type: "customrecord_swc_jj_advertisement_report", isDynamic: true });
                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_jj_adv_msku", value: recordItem.itemName });
                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_jj_adv_type", value: recordItem.advTypeId });
                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_jj_adv_campaignid", value: recordItem.campaignId });
                            advertisementR.setValue({ fieldId: "custrecord_swc_jj_adv_cost", value: recordItem.cost });
                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_jj_adv_store", value: recordItem.storeId });
                            // advertisementR.setValue({fieldId:"custrecordcustrecord_swc_jj_adv_flag",value:"1"});
                            advertisementR.setValue(
                                { fieldId: "custrecordcustrecord_swc_jj_adv_ponumber", value: recordItem.poId });
                            // advertisementR.setValue({fieldId:"custrecordcustrecord_swc_op_order_share",value:"Y"});
                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_jj_adv_marketid", value: recordItem.marketId });
                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_jj_adv_groupid", value: recordItem.groupid });
                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_jj_adv_groupname", value: recordItem.groupname });
                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_jj_adv_servingstatus", value: recordItem.servingstatus });
                            advertisementR.setValue(
                                { fieldId: "custrecord_swc_jj_adv_campaignname", value: recordItem.campaignName });
                            advertisementR.setValue({ fieldId: "custrecordcustrecord_swc_jj_adv_share", value: true });

                            advertisementR.setText(
                                { fieldId: "custrecord_swc_jj_adv_createdate", text: recordItem.laterDate });
                            advertisementR.setText(
                                { fieldId: "custrecord_swc_jj_adv_startdate", text: recordItem.laterDate });
                            advertisementR.setText(
                                { fieldId: "custrecord_swc_jj_adv_enddate", text: recordItem.laterDate });

                            var jjId = advertisementR.save();
                            log.debug("反写创建成功，ID为：", jjId);
                        }
                    }
                } else if (type == '更新sku为空的原单') {
                    record.submitFields({ type: recordItem.recType, id: recordItem.recId, values: recordItem.values });
                }

            } catch (updateError) {
                log.error("更新记录同步状态失败", updateError.toString());
            }
        }

        const summarize = (summaryContext) => {

        }


        // 其他平台广告数据搜索（按店铺和单据号分组）先根据SKU区分
        function getSearchList(storeType, startTime, endTime, customerId, secTypeJson) {
            var dataArray = [];

            var filterArray = [];

            filterArray.push(["custrecordcustrecord_swc_op_po_flag_", "notequalto", "1"]);//是否同步
            filterArray.push("AND");
            filterArray.push(["custrecordcustrecord_swc_op_po_number_", "anyof", "@NONE@"]);//采购单号
            filterArray.push("AND");
            filterArray.push(["custrecord_swc_price", "notlessthanorequalto", "0"]);//金额大于0
            filterArray.push("AND");
            filterArray.push(["custrecord_swc_op_fee_type", "anyof", "1"]);//类型限制 花费

            if (storeType) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_advertising_type", "anyof", storeType]); //广告类型
            }
            if (customerId) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_store", "anyof", customerId]);//店铺
            }
            var startDate = null;
            var endDate = null;
            if (startTime) {
                startDate = format.format({ value: startTime, type: format.Type.DATE });
            }
            if (endTime) {
                endDate = format.format({ value: endTime, type: format.Type.DATE });
            }
            // if (startDate) {
            //     filterArray.push("AND");
            //     filterArray.push(["custrecord_swc_start_date", "onorafter", startDate]);
            // }
            // if (endDate) {
            //     filterArray.push("AND");
            //     filterArray.push(["custrecord_swc_end_date", "onorbefore", endDate]);
            // }
            if (startDate) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_end_date", "onorafter", startDate]);
            }
            if (endDate) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_end_date", "onorbefore", endDate]);
            }
            log.debug("filterArray", filterArray);

            var customrecord_swc_op_advertisementSearchObj = search.create({
                type: "customrecord_swc_op_advertisement",
                filters:
                filterArray
                //     [
                // ["custrecordcustrecord_swc_op_po_flag_", "notequalto", "1"], // 是否同步字段 0或者空 未同步，1同步
                // ["custrecordcustrecord_swc_op_po_number_","anyof","@NONE@"] ,//采购订单号=空
                // "AND",
                // ["internalid","anyof","5405","5406"] ]
                ,
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
                    search.createColumn({
                        name: "subsidiary",
                        join: "CUSTRECORD_SWC_STORE",
                        label: "主要子公司"
                    }),
                    search.createColumn({ name: "custrecord_swc_op_platform", label: "平台" }),
                    search.createColumn({ name: "custrecord_swc_op_stores", label: "分摊店铺" })
                ]
            });

            var searchResult = getAllSearchObj(customrecord_swc_op_advertisementSearchObj);
            log.debug("其他平台广告数据搜索结果数量", searchResult.length);

            // 分别存储有SKU和无SKU的数据
            var recordsWithSku = [];
            var recordsWithoutSku = [];

            //根据SKU字段区分数据
            for (var i = 0; i < searchResult.length; i++) {
                var result = searchResult[i];
                var sku = result.getValue({ name: "custrecord_swc_sku", label: "SKU" });
                if (sku && sku.trim() !== '') {
                    recordsWithSku.push(result);
                } else {
                    recordsWithoutSku.push(result);
                }
            }

            // 处理有SKU的数据
            if (recordsWithSku.length > 0) {
                var skuGroupedData = processSkuRecords(recordsWithSku);
                // 使用 for 循环合并数组
                for (var j = 0; j < skuGroupedData.length; j++) {
                    dataArray.push(skuGroupedData[j]);
                }
            }

            // 处理无SKU的数据
            if (recordsWithoutSku.length > 0) {
                var noSkuGroupedData = processNoSkuRecords(recordsWithoutSku, secTypeJson);//没有sku的分组
                // 使用 for 循环合并数组
                for (var k = 0; k < noSkuGroupedData.length; k++) {
                    dataArray.push(noSkuGroupedData[k]);
                }
            }

            return dataArray;
        }

        // 处理有SKU的记录
        function processSkuRecords(records) {
            var groupedData = {};
            var dataArray = [];

            //货币名称集合
            var allCurrencyNames = [];
            //店铺名称集合
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

            // 获取所有货币名称对应的货币ID
            var currencyIdMap = searchCurrency(allCurrencyNames);

            for (var j = 0; j < records.length; j++) {
                var result = records[j];
                try {
                    var store = result.getText({ name: "custrecord_swc_store", label: "店铺" });
                    var orderNumber = result.getValue({ name: "custrecord_swc_op_order_number", label: "单据号" });
                    var currency = result.getValue({ name: "custrecord_swc_op_currency", label: "货币" });
                    // 检查必要的分组字段
                    // if (!store || !orderNumber) {
                    //     log.debug("跳过缺少店铺或单据号的记录", {
                    //         索引: j,
                    //         internalid: result.getValue({name: "internalid", label: "内部 ID"})
                    //     });
                    //     continue;
                    // }

                    if (!store) {
                        log.debug("跳过缺少店铺的记录", {
                            索引: j,
                            internalid: result.getValue({ name: "internalid", label: "内部 ID" })
                        });
                        continue;
                    }

                    // 创建分组键
                    // var groupKey = store + "_" + orderNumber; //店铺和单据号
                    var groupKey = store; //店铺

                    // 初始化分组
                    if (!groupedData[groupKey]) {
                        groupedData[groupKey] = {
                            store: store,
                            orderNumber: orderNumber,
                            currency: currency,
                            currencyId: currencyIdMap[currency] || null, // 获取货币ID
                            records: [],
                            totalAmount: 0,
                            hasSku: true // 标记为有SKU数据
                        };
                    }

                    // 获取记录数据
                    var internalId = result.getValue({ name: "internalid", label: "内部 ID" });
                    var advertisingType = result.getText({ name: "custrecord_swc_advertising_type", label: "广告类型" });
                    var advertisingTypeId = result.getValue({ name: "custrecord_swc_advertising_type", label: "广告类型" });
                    var item = result.getValue({ name: "custrecord_swc_sku", label: "SKU" });
                    var category = result.getValue({ name: "custrecord_swc_category", label: "品类" });
                    var price = result.getValue({ name: "custrecord_swc_price", label: "金额" }) || 0;
                    var during = result.getValue({ name: "custrecord_swc_during", label: "期间" });
                    var poNumber = result.getValue({ name: "custrecordcustrecord_swc_op_po_number_", label: "采购订单号" });
                    var subsidiary = result.getValue({
                        name: "subsidiary",
                        join: "CUSTRECORD_SWC_STORE",
                        label: "主要子公司"
                    });
                    var stores = result.getValue({ name: "custrecord_swc_op_stores" });

                    // 构建记录对象
                    var recordData = {
                        internalId: internalId,
                        advertisingType: advertisingType,
                        advertisingTypeId: advertisingTypeId,
                        item: item,
                        category: category,
                        price: parseFloat(price) || 0,
                        during: during,
                        currency: currency,
                        poNumber: poNumber,
                        subsidiary: subsidiary,
                        stores: stores,
                        hasSku: true // 标记为有SKU数据
                    };

                    // 添加到分组
                    groupedData[groupKey].records.push(recordData);
                    groupedData[groupKey].totalAmount += recordData.price;


                    // 设置分组的基础信息（使用第一条记录的信息）
                    if (groupedData[groupKey].records.length === 1) {
                        groupedData[groupKey].subsidiary = subsidiary;
                    }

                } catch (e) {
                    log.error("处理有SKU搜索结果失败", { error: e.toString(), });
                }
            }

            // 将分组数据转换为数组
            var groupKeys = Object.keys(groupedData);
            for (var k = 0; k < groupKeys.length; k++) {
                var groupKey = groupKeys[k];
                dataArray.push(groupedData[groupKey]);
            }
            log.debug("有SKU数据分组完成", { 分组数量: dataArray.length });

            return dataArray;
        }

        // 处理无SKU的记录
        function processNoSkuRecords(records, secTypeJson) {
            var groupedData = {};
            var dataArray = [];

            //货币名称集合
            var allCurrencyNames = [];
            //店铺名称集合
            var allStoreNames = [];

            for (var i = 0; i < records.length; i++) {
                var result = records[i];
                var currency = result.getValue({ name: "custrecord_swc_op_currency", label: "货币" });
                if (currency && allCurrencyNames.indexOf(currency) == -1) {
                    allCurrencyNames.push(currency);
                }
                var store = result.getText({ name: "custrecord_swc_store", label: "店铺" });
                if (store && allStoreNames.indexOf(store) == -1) {
                    allStoreNames.push(store);
                }
            }
            // 获取所有货币名称对应的货币ID
            var currencyIdMap = searchCurrency(allCurrencyNames);
            // 获取店铺id和子公司信息
            var vendorInfoMap = vendorSearchByName(allStoreNames);
            log.debug("vendorInfoMap", vendorInfoMap)

            //收集所有记录的基础数据
            for (var j = 0; j < records.length; j++) {
                var result = records[j];
                try {
                    var store = result.getText({ name: "custrecord_swc_store", label: "店铺" });
                    var orderNumber = result.getValue({ name: "custrecord_swc_op_order_number", label: "单据号" });
                    var storeId = result.getValue({ name: "custrecord_swc_store", label: "店铺" });
                    var currency = result.getValue({ name: "custrecord_swc_op_currency", label: "货币" });
                    // 获取日期信息
                    // var startDate = result.getValue({name: "custrecord_swc_start_date", label: "开始日期"});
                    // var endDate = result.getValue({name: "custrecord_swc_end_date", label: "结束日期"});
                    // 获取子公司信息
                    var subsidiary = result.getValue({ name: "subsidiary", join: "CUSTRECORD_SWC_STORE", label: "主要子公司" });
                    var stores = result.getValue({ name: "custrecord_swc_op_stores" });

                    var startDate = result.getValue({ name: "custrecord_swc_start_date_time", label: "开始日期时间" });
                    var endDate = result.getValue({ name: "custrecord_swc_end_date_time", label: "结束日期时间" });
                    var platform = result.getValue({ name: "custrecord_swc_op_platform", label: "平台" });
                    var category = result.getValue({ name: "custrecord_swc_category", label: "品类" });
                    var categoryId = secTypeJson[category] || "";
                    // 检查必要的分组字段
                    // if (!store || !orderNumber) {
                    //     log.debug("跳过缺少店铺或单据号的记录", { internalid: result.getValue({name: "internalid", label: "内部 ID"})});
                    //     continue;
                    // }

                    if (!store) {
                        log.debug("跳过缺少店铺的记录", { internalid: result.getValue({ name: "internalid", label: "内部 ID" }) });
                        continue;
                    }

                    // 创建分组键
                    // var groupKey = store + "_" + orderNumber + "_" + categoryId + "_nosku";

                    var groupKey = store + "_" + "_nosku";

                    // 初始化分组
                    if (!groupedData[groupKey]) {
                        groupedData[groupKey] = {
                            store: store,
                            storeId: storeId,
                            orderNumber: orderNumber,
                            currency: currency,
                            category: categoryId,
                            currencyId: currencyIdMap[currency] || null,
                            records: [],
                            totalAmount: {},
                            hasSku: false,
                            subsidiary: subsidiary, // 保存子公司信息
                            stores: stores,
                            startDate: startDate,    // 保存开始日期
                            endDate: endDate,        // 保存结束日期
                            invoiceTotalAmount: 0,
                            invoiceDetails: [],
                            platform: platform,
                            // 添加发票查询所需的信息
                            needInvoiceQuery: true,  // 标记需要查询发票
                            minStartDate: startDate,
                            maxEndDate: endDate,
                            laterDate: new Date(result.getValue({ name: "custrecord_swc_end_date", label: "结束日期" })).toISOString().slice(0, 10)
                        };
                    } else {
                        var endDate1 = new Date(result.getValue({ name: "custrecord_swc_end_date", label: "结束日期" }));



                        // 比较并取较晚的日期
                        groupedData[groupKey].laterDate = endDate1 > new Date(groupedData[groupKey].laterDate) ? endDate1 : new Date(groupedData[groupKey].laterDate);
                        groupedData[groupKey].laterDate = groupedData[groupKey].laterDate.toISOString().slice(0, 10); // 例如 "2026-04-13"
                    }

                    // 获取记录数据
                    var internalId = result.getValue({ name: "internalid", label: "内部 ID" });
                    var advertisingType = result.getText({ name: "custrecord_swc_advertising_type", label: "广告类型" });
                    var advertisingTypeId = result.getValue({ name: "custrecord_swc_advertising_type", label: "广告类型" });
                    var item = result.getValue({ name: "custrecord_swc_sku", label: "SKU" });

                    var price = parseFloat(result.getValue({ name: "custrecord_swc_price", label: "金额" })) || 0;
                    var during = result.getValue({ name: "custrecord_swc_during", label: "期间" });
                    var poNumber = result.getValue({ name: "custrecordcustrecord_swc_op_po_number_", label: "采购订单号" });

                    // 获取供应商ID
                    var vendorInfo = vendorInfoMap[store];
                    var vendorId = vendorInfo ? vendorInfo.vendorId : null;
                    var paymentTermId = vendorInfo ? vendorInfo.paymentTermId : null;

                    // 构建记录对象（包含原始金额和日期信息）
                    var recordData = {
                        internalId: internalId,
                        advertisingType: advertisingType,
                        advertisingTypeId: advertisingTypeId,
                        item: item,
                        category: categoryId,
                        oldPrice: price,  // 保存原始金额
                        price: 0,      // 分配后的金额，初始为0
                        during: during,
                        currency: currency,
                        poNumber: poNumber,
                        subsidiary: subsidiary,
                        stores: stores,
                        vendorId: vendorId,
                        storeId: storeId,
                        startDate: startDate,   // 每条记录的开始日期
                        endDate: endDate,       // 每条记录的结束日期
                        hasSku: false, // 标记为有SKU数据
                        orderNumber: orderNumber,
                        platform: platform,
                        paymentTermId: paymentTermId
                    };

                    // 添加到分组
                    groupedData[groupKey].invoiceDetails.push(recordData);
                    // groupedData[groupKey].totalAmount += price;
                    let tkey = advertisingTypeId + '_' + advertisingType;
                    groupedData[groupKey].totalAmount[tkey] = groupedData[groupKey].totalAmount[tkey] || 0;
                    groupedData[groupKey].totalAmount[tkey] += price;

                    // 更新分组的最早开始日期和最晚结束日期
                    if (groupedData[groupKey].invoiceDetails.length === 1) {
                        groupedData[groupKey].subsidiary = subsidiary;
                        groupedData[groupKey].stores = stores;
                        // groupedData[groupKey].vendorId = vendorId;
                        groupedData[groupKey].storeId = storeId;
                        groupedData[groupKey].minStartDate = startDate;
                        groupedData[groupKey].maxEndDate = endDate;
                    } else {
                        // 比较日期，取最早开始和最晚结束
                        if (startDate && (!groupedData[groupKey].minStartDate || startDate < groupedData[groupKey].minStartDate)) {
                            groupedData[groupKey].minStartDate = startDate;
                        }
                        if (endDate && (!groupedData[groupKey].maxEndDate || endDate > groupedData[groupKey].maxEndDate)) {
                            groupedData[groupKey].maxEndDate = endDate;
                        }
                    }

                } catch (e) {
                    log.error("处理无SKU失败", { error: e.toString() });
                }
            }

            // 将分组数据转换为数组
            var groupKeys = Object.keys(groupedData);
            for (var k = 0; k < groupKeys.length; k++) {
                var groupKey = groupKeys[k];
                dataArray.push(groupedData[groupKey]);
            }
            log.debug("没有SKU数据分组完成", { 分组数量: dataArray.length });

            return dataArray;
        }


        // 积加 广告报告搜索（按广告活动id分组）
        function getSearchListJJ(storeType, startTime, endTime, customerId, jjType, secTypeJson) {
            var dataArray = [];
            var filterArray = [];
            filterArray.push(["custrecordcustrecord_swc_jj_adv_flag", "notequalto", "1"]);
            filterArray.push("AND");
            filterArray.push(["custrecordcustrecord_swc_jj_adv_ponumber", "anyof", "@NONE@"]);
            filterArray.push("AND");
            filterArray.push(["custrecord_swc_jj_adv_cost", "notlessthanorequalto", "0"]);
            filterArray.push("AND");
            filterArray.push(["custrecord_swc_jj_adv_fee_type", "anyof", "1"]);//类型限制 花费

            if (jjType) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_jj_adv_type", "is", jjType]);//广告类型
            }
            if (customerId) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_jj_adv_store", "anyof", customerId]);//店铺
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
                filterArray.push(["custrecord_swc_jj_adv_createdate", "onorafter", startDate]);
            }
            if (endDate) {
                filterArray.push("AND");
                filterArray.push(["custrecord_swc_jj_adv_createdate", "onorbefore", endDate]);
            }
            log.debug("filterArray", filterArray);


            var customrecord_swc_jj_advertisement_reportSearchObj = search.create({
                type: "customrecord_swc_jj_advertisement_report",
                filters: filterArray
                // [
                // ["custrecordcustrecord_swc_jj_adv_ponumber", "anyof", "@NONE@"]//采购订单号=空
                // ["custrecordcustrecord_swc_jj_adv_flag", "notequalto", "1"], // 是否同步字段 0或者空 未同步，1同步
                // "AND",
                // ["internalid","anyof","697","698"]]
                ,
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
            log.debug("积加广告数据搜索结果数量", searchResult.length);

            // 分别存储有MSKU和无MSKU的数据
            var recordsWithMsku = [];
            var recordsWithoutMsku = [];

            // 根据msku字段区分数据
            for (var i = 0; i < searchResult.length; i++) {
                var result = searchResult[i];
                var msku = result.getValue({ name: "custrecord_swc_jj_adv_msku", label: "msku" });
                if (msku && msku.trim() !== '') {
                    recordsWithMsku.push(result);
                } else {
                    recordsWithoutMsku.push(result);
                }
            }

            // 处理有MSKU的数据
            if (recordsWithMsku.length > 0) {
                var mskuGroupedData = processSkuRecordsJJ(recordsWithMsku);
                for (var j = 0; j < mskuGroupedData.length; j++) {
                    dataArray.push(mskuGroupedData[j]);
                }
            }

            // 处理无MSKU的数据
            if (recordsWithoutMsku.length > 0) {
                var noMskuGroupedData = processNoSkuRecordsJJ(recordsWithoutMsku, secTypeJson);
                for (var k = 0; k < noMskuGroupedData.length; k++) {
                    dataArray.push(noMskuGroupedData[k]);
                }
            }

            return dataArray;
        }

        // 处理积加广告中有MSKU的记录
        function processSkuRecordsJJ(records) {
            var groupedData = {};
            var dataArray = [];

            //收集所有不同的店铺名称
            var allStoreNames = [];

            for (var i = 0; i < records.length; i++) {
                var result = records[i];

                try {
                    var campaignId = result.getValue({ name: "custrecord_swc_jj_adv_campaignid", label: "campaignId" });
                    var store = result.getText({ name: "custrecord_swc_jj_adv_store", label: "店铺" });

                    // 收集店铺名称
                    if (store && allStoreNames.indexOf(store) == -1) {
                        allStoreNames.push(store);
                    }

                    // 检查必要的分组字段
                    if (!store) {
                        log.debug("跳过缺少store的记录", {
                            索引: i,
                            internalid: result.getValue({ name: "internalid", label: "内部 ID" })
                        });
                        continue;
                    }

                    // 创建分组键
                    var groupKey = store.toString();

                    // 初始化分组
                    if (!groupedData[groupKey]) {
                        groupedData[groupKey] = {
                            campaignId: campaignId,//广告活动id
                            campaignName: "", // 将在第一条记录时设置
                            store: store || "", // 店铺
                            advType: "", // 积加广告类型
                            records: [],
                            hasSku: true // 标记为有MSKU数据
                        };
                    }

                    // 获取记录数据
                    var internalId = result.getValue({ name: "internalid", label: "内部 ID" });
                    var campaignName = result.getValue({ name: "custrecord_swc_jj_adv_campaignname", label: "campaignName" });
                    var advType = result.getText({ name: "custrecord_swc_jj_adv_type", label: "积加广告类型" });
                    var msku = result.getValue({ name: "custrecord_swc_jj_adv_msku", label: "msku" });
                    var cost = result.getValue({ name: "custrecord_swc_jj_adv_cost", label: "cost" }) || 0;
                    var adsOrders = result.getValue({ name: "custrecord_swc_jj_adv_adsorders", label: "adsOrders" }) || 0;
                    var adsSales = result.getValue({ name: "custrecord_swc_jj_adv_adssales", label: "adsSales" }) || 0;
                    var poNumber = result.getValue({ name: "custrecordcustrecord_swc_jj_adv_ponumber", label: "采购订单号" });
                    var syncFlag = result.getValue({ name: "custrecordcustrecord_swc_jj_adv_flag", label: "是否同步" });

                    // 构建记录对象
                    var recordData = {
                        internalId: internalId,
                        msku: msku,
                        cost: parseFloat(cost) || 0,
                        adsOrders: parseInt(adsOrders) || 0,
                        adsSales: parseFloat(adsSales) || 0,
                        poNumber: poNumber,
                        syncFlag: syncFlag,
                        hasSku: true // 标记为有MSKU数据
                    };

                    // 添加到分组
                    groupedData[groupKey].records.push(recordData);

                    // 设置分组的基础信息（使用第一条记录的信息）
                    if (groupedData[groupKey].records.length === 1) {
                        groupedData[groupKey].campaignName = campaignName || "";
                        groupedData[groupKey].advType = advType || "";
                        if (store && !groupedData[groupKey].store) {
                            groupedData[groupKey].store = store;
                        }
                    }

                } catch (e) {
                    log.error("处理积加有MSKU搜索结果失败", {
                        索引: i,
                        error: e.toString(),
                        stack: e.stack
                    });
                }
            }

            // 将分组数据转换为数组
            var groupKeys = Object.keys(groupedData);
            for (var j = 0; j < groupKeys.length; j++) {
                var groupKey = groupKeys[j];
                dataArray.push(groupedData[groupKey]);
            }

            log.debug("积加广告有MSKU分组完成", {
                原始记录数: records.length,
                分组数量: dataArray.length
            });

            return dataArray;
        }

        // 处理积加广告中无MSKU的记录
        function processNoSkuRecordsJJ(records, secTypeJson) {
            var groupedData = {};
            var dataArray = [];

            // 店铺名称集合
            var allStoreNames = [];

            for (var i = 0; i < records.length; i++) {
                var result = records[i];
                var store = result.getText({ name: "custrecord_swc_jj_adv_store", label: "店铺" });
                if (store && allStoreNames.indexOf(store) == -1) {
                    allStoreNames.push(store);
                }
            }

            // 获取店铺id和子公司信息
            var vendorInfoMap = vendorSearchByName(allStoreNames);
            log.debug("积加无MSKU vendorInfoMap", vendorInfoMap);

            // 第一步：收集所有记录的基础数据
            for (var j = 0; j < records.length; j++) {
                var result = records[j];
                try {
                    var campaignId = result.getValue({ name: "custrecord_swc_jj_adv_campaignid", label: "campaignId" });
                    var store = result.getText({ name: "custrecord_swc_jj_adv_store", label: "店铺" });
                    var storeId = result.getValue({ name: "custrecord_swc_jj_adv_store", label: "店铺" });
                    var campaignName = result.getValue({ name: "custrecord_swc_jj_adv_campaignname", label: "campaignName" });
                    var advType = result.getText({ name: "custrecord_swc_jj_adv_type", label: "积加广告类型" });
                    var advTypeId = result.getValue({ name: "custrecord_swc_jj_adv_type", label: "积加广告类型" });
                    // 获取日期信息
                    var startDate = result.getValue({ name: "custrecord_swc_jj_adv_startdate", label: "开始日期" });
                    var endDate = result.getValue({ name: "custrecord_swc_jj_adv_enddate", label: "结束日期" });
                    var marketId = result.getValue({ name: "custrecord_swc_jj_adv_marketid", label: "marketId" });
                    var groupid = result.getValue({ name: "custrecord_swc_jj_adv_groupid", label: "groupid" });
                    var groupname = result.getValue({ name: "custrecord_swc_jj_adv_groupname", label: "groupname" });
                    var servingstatus = result.getValue({ name: "custrecord_swc_jj_adv_servingstatus", label: "servingstatus" });
                    var category = result.getValue({ name: "custrecord_swc_jj_adv_portfolioname", label: "portfolioName" });
                    var categoryId = secTypeJson[category] || "";

                    // 检查必要的分组字段
                    if (!store) {
                        log.debug("跳过缺少store的记录", {
                            internalid: result.getValue({ name: "internalid", label: "内部 ID" })
                        });
                        continue;
                    }

                    // 创建分组键
                    var groupKey = store.toString() + "_" + category + "_nosku";


                    // 初始化分组
                    if (!groupedData[groupKey]) {
                        groupedData[groupKey] = {
                            campaignId: campaignId,
                            campaignName: campaignName || "",
                            store: store || "",
                            storeId: storeId || "",
                            advType: advType || "",
                            advTypeId: advTypeId || "",
                            records: [],
                            totalCost: 0,
                            hasSku: false, // 标记为无SKU数据
                            invoiceTotalAmount: 0,
                            invoiceDetails: [],
                            startDate: startDate,
                            endDate: endDate,
                            marketId: marketId,
                            groupid: groupid,
                            groupname: groupname,
                            servingstatus: servingstatus,
                            // 添加发票查询所需的信息
                            needInvoiceQuery: true,
                            minStartDate: startDate,
                            maxEndDate: endDate,
                            category: categoryId,
                            laterDate: endDate
                        };

                        // 获取供应商信息
                        var vendorInfo = vendorInfoMap[store];
                        if (vendorInfo) {
                            groupedData[groupKey].vendorId = vendorInfo.vendorId;
                            groupedData[groupKey].vendorSubsidiary = vendorInfo.subsidiary;
                            groupedData[groupKey].paymentTermId = vendorInfo.paymentTermId;
                        }
                    } else {
                        var endDate1 = new Date(result.getValue({ name: "custrecord_swc_jj_adv_enddate", label: "结束日期" }));



                        // 比较并取较晚的日期
                        groupedData[groupKey].laterDate = endDate1 > new Date(groupedData[groupKey].laterDate) ? endDate1 : new Date(groupedData[groupKey].laterDate);
                        groupedData[groupKey].laterDate = groupedData[groupKey].laterDate.toISOString().slice(0, 10); // 例如 "2026-04-13"
                    }



                    // 获取记录数据
                    var internalId = result.getValue({ name: "internalid", label: "内部 ID" });
                    var cost = parseFloat(result.getValue({ name: "custrecord_swc_jj_adv_cost", label: "cost" })) || 0;
                    var adsOrders = result.getValue({ name: "custrecord_swc_jj_adv_adsorders", label: "adsOrders" }) || 0;
                    var adsSales = result.getValue({ name: "custrecord_swc_jj_adv_adssales", label: "adsSales" }) || 0;
                    var poNumber = result.getValue({ name: "custrecordcustrecord_swc_jj_adv_ponumber", label: "采购订单号" });
                    // 构建记录对象


                    var recordData = {
                        internalId: internalId,
                        oldCost: cost,  // 保存原始金额
                        cost: 0,         // 分配后的金额，初始为0
                        adsOrders: parseInt(adsOrders) || 0,
                        adsSales: parseFloat(adsSales) || 0,
                        poNumber: poNumber,
                        hasSku: false,
                        advType: advType,
                        advTypeId: advTypeId,
                        storeId: storeId,
                        campaignId: campaignId,
                        startDate: startDate,
                        endDate: endDate,
                        marketId: marketId,
                        groupid: groupid,
                        groupname: groupname,
                        servingstatus: servingstatus,
                        campaignName: campaignName,
                        category: categoryId
                    };

                    // 添加到分组
                    groupedData[groupKey].invoiceDetails.push(recordData);
                    groupedData[groupKey].totalCost += cost;

                    //===============================================================
                    // 更新分组的最早开始日期和最晚结束日期
                    if (groupedData[groupKey].invoiceDetails.length === 1) {
                        // groupedData[groupKey].subsidiary = subsidiary;
                        // groupedData[groupKey].storeId = storeId;
                        groupedData[groupKey].minStartDate = startDate;
                        groupedData[groupKey].maxEndDate = endDate;
                    } else {
                        // 比较日期，取最早开始和最晚结束
                        if (startDate && (!groupedData[groupKey].minStartDate || startDate < groupedData[groupKey].minStartDate)) {
                            groupedData[groupKey].minStartDate = startDate;
                        }
                        if (endDate && (!groupedData[groupKey].maxEndDate || endDate > groupedData[groupKey].maxEndDate)) {
                            groupedData[groupKey].maxEndDate = endDate;
                        }
                    }
                    //===============================================================
                } catch (e) {
                    log.error("处理积加无MSKU搜索结果失败", { error: e.toString() });
                }
            }

            // 将分组数据转换为数组
            var groupKeys = Object.keys(groupedData);
            for (var k = 0; k < groupKeys.length; k++) {
                var groupKey = groupKeys[k];
                dataArray.push(groupedData[groupKey]);
            }
            log.debug("积加广告无MSKU分组完成", { 分组数量: dataArray.length });

            return dataArray;
        }

        // 添加其他广告记录到采购单
        function addAllRecordsToPo(poRec, records) {
            var sublistId = "item";
            var addedLines = 0;
            log.debug("开始添加其他广告行，数量：", records.length);

            // 分离有SKU和无SKU的记录
            var recordsWithSku = [];
            var recordsWithoutSku = [];
            var recordsWithSkuObj = [];
            var recordsWithoutSkuObj = [];

            for (var i = 0; i < records.length; i++) {
                if (records[i].hasSku === true) {
                    recordsWithSku.push(records[i]);
                } else {
                    recordsWithoutSku.push(records[i]);
                }
            }

            log.debug("记录分类", { 总记录数: records.length, 有SKU记录数: recordsWithSku.length, 无SKU记录数: recordsWithoutSku.length });

            // 1. 处理有SKU的记录（走现有逻辑）
            if (recordsWithSku.length > 0) {
                // 所有广告类型集合
                var allAdvertisingTypes = [];
                for (var j = 0; j < recordsWithSku.length; j++) {
                    var recordItem = recordsWithSku[j];
                    if (recordItem.advertisingType && allAdvertisingTypes.indexOf(recordItem.advertisingType) === -1) {
                        allAdvertisingTypes.push(recordItem.advertisingType);
                    }
                }
                log.debug("有SKU广告类型集合", allAdvertisingTypes);

                // 获取所有广告类型对应的货品ID
                var itemIdMap = searchItemIdsByAdvertisingTypes(allAdvertisingTypes);

                for (var m = 0; m < recordsWithSku.length; m++) {
                    var recordItem = recordsWithSku[m];
                    if (!recordItem.advertisingType) {
                        continue;
                    }
                    var itemId = itemIdMap[recordItem.advertisingType];
                    if (itemId) {
                        recordsWithSkuObj[itemId] = recordsWithSkuObj[itemId] || {
                            'price': 0,
                            'itemId': itemId
                        }

                        recordsWithSkuObj[itemId].price = recordsWithSkuObj[itemId].price + Number(recordItem.price);
                    }
                }
                log.debug('recordsWithSkuObj', recordsWithSkuObj);
                // 循环添加有SKU的记录到采购单
                // for (var k = 0; k < recordsWithSku.length; k++) {
                for (let k in recordsWithSkuObj) {
                    var skuRecord = recordsWithSkuObj[k];
                    try {
                        // if (!skuRecord.advertisingType) {
                        //     // log.debug("跳过无效有SKU记录，缺少广告类型", {索引: k, recordId: skuRecord.internalId});
                        //     continue;
                        // }

                        // var itemId = itemIdMap[skuRecord.advertisingType];

                        if (!skuRecord.itemId) {
                            // log.debug("跳过有SKU记录，未找到广告类型对应的货品", {
                            //     索引: k,
                            //     广告类型: skuRecord.advertisingType,
                            //     recordId: skuRecord.internalId
                            // });
                            continue;
                        }
                        // log.debug("添加有SKU记录", {
                        //     广告类型: skuRecord.advertisingType,
                        //     金额: skuRecord.price,
                        //     货品ID: itemId
                        // });

                        poRec.selectNewLine({ sublistId: sublistId });
                        poRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'item',
                            value: skuRecord.itemId
                        });
                        poRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'rate',
                            value: skuRecord.price
                        });
                        poRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'amount',
                            value: skuRecord.price
                        });
                        poRec.commitLine({ sublistId: sublistId });
                        addedLines++;

                    } catch (lineError) {
                        log.error("添加有SKU行数据失败", {
                            错误: lineError.toString(),
                            索引: k,
                            // recordId: skuRecord.internalId
                        });
                    }
                }
            }

            // 2. 处理无SKU的记录（按发票条数循环，使用原有货品ID，金额使用计算后的金额）
            if (recordsWithoutSku.length > 0) {


                var allAdvertisingTypes = [];
                for (var j = 0; j < recordsWithoutSku.length; j++) {
                    var recordItem = recordsWithoutSku[j];
                    if (recordItem.advertisingType && allAdvertisingTypes.indexOf(recordItem.advertisingType) === -1) {
                        allAdvertisingTypes.push(recordItem.advertisingType);
                    }
                }
                log.debug("有SKU广告类型集合", allAdvertisingTypes);

                // 获取所有广告类型对应的货品ID
                var itemIdMap = searchItemIdsByAdvertisingTypes(allAdvertisingTypes);
                log.debug('itemIdMap', itemIdMap);

                for (var m = 0; m < recordsWithoutSku.length; m++) {
                    var recordItem = recordsWithoutSku[m];
                    if (!recordItem.advertisingType) {
                        continue;
                    }

                    var itemId = itemIdMap[recordItem.advertisingType];
                    log.debug('itemId', itemId);
                    if (itemId) {
                        if (itemId in recordsWithoutSkuObj) {
                            recordsWithoutSkuObj[itemId].price = recordsWithoutSkuObj[itemId].price +
                                Number(recordItem.price);
                        } else {
                            recordsWithoutSkuObj[itemId] = {
                                price: Number(recordItem.price),
                                itemId: itemId
                            }
                        }
                    }
                }

                log.debug('recordsWithoutSkuObj', recordsWithoutSkuObj);
                // 获取分组数据（第一条记录包含分组信息）
                for (let n in recordsWithoutSkuObj) {
                    var groupData = recordsWithoutSkuObj[n];
                    log.debug("groupData", groupData)
                    // var itemId = itemIdMap[groupData.advertisingType];
                    // 添加采购单行
                    poRec.selectNewLine({ sublistId: sublistId });

                    // 设置货品ID（优先使用原有的货品ID）
                    poRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'item',
                        value: groupData.itemId
                    });
                    poRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'rate',
                        value: groupData.price
                    });
                    // 设置金额（使用计算后的金额或发票金额）
                    poRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'amount',
                        value: groupData.price
                    });

                    poRec.commitLine({ sublistId: sublistId });
                }

            }

            return addedLines;
        }

        // 添加其他广告记录到采购单
        // function addAllRecordsToPo(poRec, records) {
        //     var sublistId = "item";
        //     var addedLines = 0;
        //     log.debug("开始添加其他广告行，数量：", records.length);
        //
        //     //所有广告类型集合 - 将 forEach 改为 for 循环
        //     var allAdvertisingTypes = [];
        //     for (var i = 0; i < records.length; i++) {
        //         var recordItem = records[i];
        //         if (recordItem.advertisingType && allAdvertisingTypes.indexOf(recordItem.advertisingType) === -1) {
        //             allAdvertisingTypes.push(recordItem.advertisingType);//获取所有广告类型
        //         }
        //     }
        //     log.debug("广告类型集合", allAdvertisingTypes);
        //
        //     //获取所有广告类型对应的货品ID
        //     var itemIdMap = searchItemIdsByAdvertisingTypes(allAdvertisingTypes);
        //
        //     for (var j = 0; j < records.length; j++) {
        //         var recordItem = records[j];
        //             try {
        //                 // 检查记录是否有效
        //                 if (!recordItem.advertisingType) {
        //                     log.debug("跳过无效记录，缺少广告类型", {索引: j, recordId: recordItem.internalId});
        //                     continue;
        //                 }
        //
        //                 // 从映射表中获取货品ID
        //                 var itemId = itemIdMap[recordItem.advertisingType];
        //
        //                 if (!itemId) {
        //                     log.debug("跳过这条记录，未找到广告类型对应的货品", {
        //                         索引: j,
        //                         广告类型: recordItem.advertisingType,
        //                         recordId: recordItem.internalId
        //                     });
        //                     continue;
        //                 }
        //                 log.debug("recordItem",recordItem);
        //                 poRec.selectNewLine({sublistId: sublistId});
        //                 // 设置货品ID
        //                 poRec.setCurrentSublistValue({
        //                     sublistId: sublistId,
        //                     fieldId: 'item',
        //                     value: itemId
        //                 });
        //                 // 设置金额
        //                 poRec.setCurrentSublistValue({
        //                     sublistId: sublistId,
        //                     fieldId: 'amount',
        //                     value: recordItem.price
        //                 });
        //                 poRec.commitLine({sublistId: sublistId});
        //                 addedLines++;
        //
        //             } catch (lineError) {
        //                 log.error("添加行数据失败", lineError.toString());
        //             }
        //
        //
        //     }
        //
        //     log.debug("添加其他广告行数据完成，总条数：", records.length);
        //     return addedLines;
        // }

        // 添加积加广告行记录到采购单
        function addJJRecordsToPo(poRec, records, onSiteAds) {
            var sublistId = "item";
            var addedLines = 0;
            log.debug("11", onSiteAds);
            // 使用脚本参数中的货品ID
            var itemId = onSiteAds;
            if (!itemId) return 0;
            var recordsWithSku = [];
            var recordsWithoutSku = [];
            for (var i = 0; i < records.length; i++) {
                if (records[i].hasSku === true) {
                    recordsWithSku.push(records[i]);
                } else {
                    recordsWithoutSku.push(records[i]);
                }
            }
            log.debug("recordsWithSku.length", recordsWithSku.length);
            log.debug("recordsWithoutSku.length", recordsWithoutSku.length);

            var costSum = 0;
            for (var j = 0; j < records.length; j++) {
                var recordItem = records[j];
                // log.debug("recordItem111",recordItem);
                var cost = recordItem.cost || 0;
                if (cost <= 0) continue;

                if (recordsWithSku.length > 0) {
                    costSum = costSum + Number(cost);
                }
                if (recordsWithoutSku.length > 0) {
                    var skuRecord = recordsWithoutSku[j];
                    costSum = costSum + Number(skuRecord.cost);
                }
            }

            try {
                poRec.selectNewLine({ sublistId: sublistId });
                poRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'item', value: itemId });
                poRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'rate', value: costSum });
                poRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'amount', value: costSum });
                poRec.commitLine({ sublistId: sublistId });
                addedLines++;
            } catch (e) {
                log.error("添加行失败", { cost: cost, error: e.toString() });
            }

            // for (var i = 0; i < records.length; i++) {
            //     var recordItem = records[i];
            //     // log.debug("recordItem111",recordItem);
            //     var cost = recordItem.cost || 0;
            //     if (cost <= 0) continue;
            //
            //     if (recordsWithSku.length > 0) {
            //         try {
            //             poRec.selectNewLine({sublistId: sublistId});
            //             poRec.setCurrentSublistValue({sublistId: sublistId, fieldId: 'item', value: itemId});
            //             poRec.setCurrentSublistValue({sublistId: sublistId, fieldId: 'amount', value: cost});
            //             poRec.commitLine({sublistId: sublistId});
            //             addedLines++;
            //         } catch (e) {
            //             log.error("添加行失败", {cost: cost, error: e.toString()});
            //         }
            //     }
            //     if (recordsWithoutSku.length > 0) {
            //         var skuRecord = recordsWithoutSku[i];
            //         try {
            //
            //             poRec.selectNewLine({sublistId: sublistId});
            //             poRec.setCurrentSublistValue({sublistId: sublistId, fieldId: 'item', value: itemId});
            //             poRec.setCurrentSublistValue({sublistId: sublistId, fieldId: 'amount', value: skuRecord.cost});
            //             poRec.commitLine({sublistId: sublistId});
            //             addedLines++;
            //
            //         } catch (lineError) {
            //             log.error("添加有SKU行数据失败", {错误: lineError.toString(), 索引: i, recordId: skuRecord.internalId});
            //         }
            //     }
            // }

            return addedLines;
        }


        // 供应商名称检索id（批量查询） - 同时查询供应商ID和子公司
        function vendorSearchByName(storeNames) {
            var vendorInfoMap = {};

            if (!storeNames || storeNames.length === 0) {
                log.debug("店铺名称列表为空");
                return vendorInfoMap;
            }

            try {
                log.debug("店铺名称列表", storeNames);
                var searchFilters = [];
                if (storeNames.length === 1) {
                    searchFilters.push(["entityid", "is", storeNames[0]]);
                } else {
                    var temp = [];
                    for (var i = 0; i < storeNames.length; i++) {
                        temp.push(["entityid", "is", storeNames[i]]);
                        if (i < storeNames.length - 1) {
                            temp.push("OR");
                        }
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
                    // 字段无值 返回空, 字段选一条 返回 一条记录的内部id, 字段选两条 返回 用','间隔的内部id 字符串
                    var paymentTerms = result.getValue({ name: "custentity_swc_payment_terms", label: "付款条件" });
                    let paymentTermId = "";
                    if (paymentTerms) paymentTermId = paymentTerms.split(",")[0];
                    // 建立店铺名称到供应商信息的映射（包含供应商ID和子公司）
                    vendorInfoMap[vendorName] = {
                        vendorId: vendorId,
                        subsidiary: subsidiary,
                        paymentTermId: paymentTermId
                    };
                    log.debug("映射供应商信息", { 店铺名称: vendorName, 店铺ID: vendorId, 子公司: subsidiary });
                });

                // 检查哪些店铺没有找到对应的供应商
                var notFoundStores = [];
                for (var m = 0; m < storeNames.length; m++) {
                    var storeName = storeNames[m];
                    if (!vendorInfoMap[storeName]) {
                        notFoundStores.push(storeName);
                    }
                }

                if (notFoundStores.length > 0) {
                    log.debug("以下店铺未找到对应的供应商", {
                        未找到的店铺: notFoundStores,
                        数量: notFoundStores.length
                    });
                }

                log.debug("供应商信息查询完成", {
                    查询店铺数量: storeNames.length,
                    找到供应商数量: Object.keys(vendorInfoMap).length,
                    未找到数量: notFoundStores.length
                });

            } catch (e) {
                log.error("查询供应商信息失败", {
                    error: e.toString(),
                    stack: e.stack
                });
            }

            return vendorInfoMap;
        }


        // 批量获取广告类型对应的货品ID
        function searchItemIdsByAdvertisingTypes(advertisingTypes) {
            var itemIdMap = {};

            try {
                if (!advertisingTypes || advertisingTypes.length === 0) {
                    log.debug("广告类型集合为空");
                    return itemIdMap;
                }

                //所有广告类型对应的货品
                var searchFilters = [];

                var temp = [];
                for (var j = 0; j < advertisingTypes.length; j++) {
                    if (advertisingTypes.length == 1) {
                        searchFilters.push(["name", "is", advertisingTypes[j]]); //通过名称去查
                    } else {
                        temp.push(["name", "is", advertisingTypes[j]]);
                        if (advertisingTypes.length > 0 && (j != advertisingTypes.length - 1)) {
                            temp.push("OR");
                        }
                    }
                }

                if (temp.length > 1) {
                    searchFilters.push(temp);
                }

                if (searchFilters.length === 0) {
                    log.debug("没有有效的广告类型可以搜索");
                    return itemIdMap;
                }

                var serviceitemSearchObj = search.create({
                    type: "serviceitem",
                    filters: [
                        ["type", "anyof", "Service"],
                        "AND",
                        searchFilters
                    ],
                    columns: [
                        search.createColumn({ name: "itemid", label: "货品编号" }),
                        search.createColumn({ name: "internalid", label: "内部ID" }),
                        search.createColumn({ name: "name", label: "名称" })
                    ]
                });
                // var resultSet = serviceitemSearchObj.run();
                // var resultRange = resultSet.getRange({start: 0, end: 1000}); // 获取前1000条，如果超过1000条需要分页
                var resultSet = getAllSearchObj(serviceitemSearchObj);
                for (var k = 0; k < resultSet.length; k++) {
                    var result = resultSet[k];
                    var itemId = result.getValue({ name: "internalid", label: "内部ID" });
                    var itemName = result.getValue({ name: "name", label: "名称" });
                    // 建立广告类型名称到货品ID的映射
                    itemIdMap[itemName] = itemId;
                }

            } catch (e) {
                log.error("批量获取货品ID失败", { error: e.toString(), stack: e.stack });
            }
            log.debug("根据广告类型查询到的货品ID集合", itemIdMap);
            return itemIdMap;
        }

        // 货币检索id
        function searchCurrency(currencyNames) {
            var currencyMap = {};

            try {
                if (!currencyNames || currencyNames.length === 0) {
                    log.debug("货币名称列表为空");
                    return currencyMap;
                }

                log.debug("货币名称集合", currencyNames);

                var searchFilters = [];
                var temp = [];

                for (var j = 0; j < currencyNames.length; j++) {
                    if (currencyNames.length == 1) {
                        searchFilters.push(["symbol", "is", currencyNames[j]]); //通过名称去查
                    } else {
                        temp.push(["symbol", "is", currencyNames[j]]);
                        if (currencyNames.length > 0 && (j != currencyNames.length - 1)) {
                            temp.push("OR");
                        }
                    }
                }

                if (temp.length > 1) {
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

                    // 建立货币名称到货币ID的映射
                    currencyMap[currencyName] = currencyId;

                    log.debug("映射货币名称到货币ID", {
                        货币名称: currencyName,
                        货币ID: currencyId
                    });
                }

            } catch (e) {
                log.error("批量获取货币ID失败", {
                    error: e.toString(),
                    stack: e.stack
                });
            }
            return currencyMap;
        }

        //格式化日期为 YYYY-MM-DD
        function formatDate(date) {
            if (!date) return null;
            var year = date.getFullYear();
            var month = (date.getMonth() + 1).toString().padStart(2, '0');
            var day = date.getDate().toString().padStart(2, '0');
            return year + '-' + month + '-' + day;
        }

        /**
         * 保存检索查询超过4000条
         * @param searchObj
         * @returns {*[]}
         */
        function getAllSearchObj(searchObj) {
            var RESULTCOUNT = 4000;
            var SIZE = 1000;
            var searchResultCount = searchObj.runPaged().count;
            var resList = [];

            if (searchResultCount > RESULTCOUNT) {
                var resultSet = searchObj.run();
                var max = Math.ceil(searchResultCount / SIZE);
                for (var i = 0; i < max; i++) {
                    var results = resultSet.getRange({
                        start: SIZE * i,
                        end: Number(SIZE * i) + Number(SIZE)
                    });
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

        /**
         * 二级类目搜索
         * @returns {{}}
         */
        function getSecTypeJson() {
            let secTypeJson = {};
            var customrecord_swc_ejlmSearchObj = search.create({
                type: "customrecord_swc_ejlm",
                filters:
                    [
                        ["isinactive", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "name", label: "名称" })
                    ]
            });
            let results = getAllSearchObj(customrecord_swc_ejlmSearchObj);
            if (!results || results.length <= 0) return secTypeJson;
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                secTypeJson[result.getValue({ name: "name" })] = result.id;
            }
            return secTypeJson;
        }

        function formatDateToYYYYMMDD(dateValue) {
            if (!dateValue) return ''; // 空值返回空字符串，setValue 可接受空串

            // 转为字符串，防止 Date 对象
            var dateStr = String(dateValue);

            // 提取空格前的部分，即可得到 "2026-01-26"
            return dateStr.split(' ')[0];
        }

        return {
            getInputData,
            map,
            reduce,
            summarize
        }

    });