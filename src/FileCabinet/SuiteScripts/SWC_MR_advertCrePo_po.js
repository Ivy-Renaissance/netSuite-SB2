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
            var type = obj.getParameter({name:"custscript_swc_mr_type"});
            var onSiteAds = obj.getParameter({name:"custscript_swc_mr_on_site_ads"});
            log.audit("货品", onSiteAds);
            var advertisementType = obj.getParameter({name:"custscript_advertisementtype"});
            var startTime = obj.getParameter({name:"custscript_starttime"});
            var endTime = obj.getParameter({name:"custscript_endtime"});
            var customerId = obj.getParameter({name:"custscript_customerid"});
            var jjType = obj.getParameter({name:"custscript_jj_advertisement_type"});

            log.audit("advertisementType", advertisementType);
            log.audit("startTime", startTime);
            log.audit("endTime", endTime);
            log.audit("customerId", customerId);
            log.audit("jjType", jjType);

            var date = new Date();
            log.audit("开始时间", date.getTime());

            var groupedData = [];

            let secTypeJson = getSecTypeJson();
            if(type == 1) {
                groupedData = getSearchList(advertisementType,startTime,endTime,customerId, secTypeJson);
            } else {
                groupedData = getSearchListJJ(advertisementType,startTime,endTime,customerId,jjType, secTypeJson);
            }

            var allStoreNames = [];
            for (var i = 0; i < groupedData.length; i++) {
                var group = groupedData[i];
                if (group.store && allStoreNames.indexOf(group.store) === -1) {
                    allStoreNames.push(group.store);
                }
            }

            if (allStoreNames.length > 0) {
                var vendorInfoMap = vendorSearchByName(allStoreNames);
                for (var j = 0; j < groupedData.length; j++) {
                    var group = groupedData[j];
                    var vendorInfo = vendorInfoMap[group.store];
                    if (vendorInfo) {
                        group.vendorId = vendorInfo.vendorId || null;
                        group.vendorSubsidiary = vendorInfo.subsidiary;
                    }
                }
            }
            return groupedData;
        }

        const map = (mapContext) => {}

        const reduce = (reduceContext) => {
            try {
                var obj = runtime.getCurrentScript();
                var type = obj.getParameter({name:"custscript_swc_mr_type"});
                var onSiteAds = obj.getParameter({name:"custscript_swc_mr_on_site_ads"});
                var purchaseEmployee = obj.getParameter({name: "custscript_swc_mr_purchase_employee"});
                var poFeeType = obj.getParameter({name: "custscript_swc_mr_po_fee"});
                var poForm = obj.getParameter({name: "custscript_swc_mr_po_form"});
                var poStatus = obj.getParameter({name: "custscript_swc_mr_po_status"});
                var customPoStatus = obj.getParameter({name: "custscript_swc_mr_custom_po_sataus"});

                var groupData = JSON.parse(reduceContext.values[0]);
                log.audit("开始处理分组", groupData);

                if (!groupData.vendorId) {
                    log.error("缺少供应商ID，无法创建采购单", {店铺: groupData.store});
                }

                // ==================== 分摊逻辑已注释 ====================
                // 原无SKU数据的发票查询和金额分配代码已全部注释，不再执行
                // 无论是否有SKU，均直接使用原始记录金额生成采购单行
                // ======================================================

                // 创建新的采购单
                var poRec = record.create({type: 'purchaseorder', isDynamic: true, defaultValues: {"customform": poForm}});

                poRec.setValue({fieldId: 'entity', value: groupData.vendorId});
                poRec.setValue({fieldId: 'subsidiary', value: groupData.vendorSubsidiary});

                let memo = "积加 广告报告";
                if(type == 1) {
                    memo = "其他平台广告数据";
                    poRec.setValue({fieldId: 'currency', value: groupData.currencyId});
                }

                poRec.setValue({fieldId: "employee", value: purchaseEmployee});
                poRec.setValue({fieldId: "custbody_po_fee", value: poFeeType});
                poRec.setValue({fieldId: "custbody_swc_order_type2", value: poFeeType});
                poRec.setValue({fieldId: "memo", value: memo});
                poRec.setValue({fieldId: "approvalstatus", value: poStatus});
                poRec.setValue({fieldId: "custbody_swc_po_approal_fix", value: customPoStatus});

                var addedLines = 0;
                if(type == 1){
                    addedLines = addAllRecordsToPo(poRec, groupData.records);
                }else if(type == 2){
                    addedLines = addJJRecordsToPo(poRec, groupData.records, onSiteAds);
                }

                var poId = poRec.save({enableSourcing: true, ignoreMandatoryFields: true });
                log.audit('采购单创建成功，采购单ID', poId);

                if(poId){
                    try {
                        // 反写同步状态和采购订单号
                        log.audit("开始反写同步状态", {采购单ID: poId, 需要更新的记录数: groupData.records.length});
                        for (var i = 0; i < groupData.records.length; i++) {
                            var recordItem = groupData.records[i];
                            try {
                                if(type == 1) {
                                    if(recordItem.hasSku) {
                                        record.submitFields({
                                            type: "customrecord_swc_op_advertisement",
                                            id: recordItem.internalId,
                                            values: { "custrecordcustrecord_swc_op_po_number_": poId }
                                        });
                                    } else {
                                        var advertisementR = record.create({type: "customrecord_swc_op_advertisement", isDynamic: true});
                                        advertisementR.setValue({fieldId:"custrecord_swc_sku", value:recordItem.item});
                                        advertisementR.setValue({fieldId:"custrecord_swc_advertising_type", value:recordItem.advertisingTypeId});
                                        advertisementR.setValue({fieldId:"custrecord_swc_price", value:recordItem.price});
                                        advertisementR.setValue({fieldId:"custrecord_swc_store", value:recordItem.storeId});
                                        advertisementR.setValue({fieldId:"custrecordcustrecord_swc_op_po_number_", value:poId});
                                        advertisementR.setValue({fieldId:"custrecord_swc_op_currency", value:recordItem.currency});
                                        advertisementR.setValue({fieldId:"custrecord_swc_op_platform", value:recordItem.platform});
                                        advertisementR.setValue({fieldId:"custrecord_swc_op_order_number", value:recordItem.orderNumber});
                                        advertisementR.setValue({fieldId:"custrecord_swc_start_date_time", value:recordItem.startDate});
                                        advertisementR.setValue({fieldId:"custrecord_swc_end_date_time", value:recordItem.endDate});
                                        var advertisementRId = advertisementR.save();
                                        log.audit("自定义创建记录成功", advertisementRId);
                                    }
                                } else if(type == 2){
                                    if(recordItem.hasSku) {
                                        record.submitFields({
                                            type: "customrecord_swc_jj_advertisement_report",
                                            id: recordItem.internalId,
                                            values: { "custrecordcustrecord_swc_jj_adv_ponumber": poId }
                                        });
                                    } else {
                                        var advertisementR = record.create({type: "customrecord_swc_jj_advertisement_report", isDynamic: true});
                                        advertisementR.setValue({fieldId:"custrecord_swc_jj_adv_msku", value:recordItem.itemName});
                                        advertisementR.setValue({fieldId:"custrecord_swc_jj_adv_type", value:recordItem.advType});
                                        advertisementR.setValue({fieldId:"custrecord_swc_jj_adv_campaignid", value:recordItem.campaignId});
                                        advertisementR.setValue({fieldId:"custrecord_swc_jj_adv_cost", value:recordItem.cost});
                                        advertisementR.setValue({fieldId:"custrecord_swc_jj_adv_store", value:recordItem.storeId});
                                        advertisementR.setValue({fieldId:"custrecordcustrecord_swc_jj_adv_ponumber", value:poId});
                                        advertisementR.setValue({fieldId:"custrecord_swc_jj_adv_marketid", value:recordItem.marketId});
                                        advertisementR.setValue({fieldId:"custrecord_swc_jj_adv_groupid", value:recordItem.groupid});
                                        advertisementR.setValue({fieldId:"custrecord_swc_jj_adv_groupname", value:recordItem.groupname});
                                        advertisementR.setValue({fieldId:"custrecord_swc_jj_adv_servingstatus", value:recordItem.servingstatus});
                                        advertisementR.setValue({fieldId:"custrecord_swc_jj_adv_campaignname", value:recordItem.campaignName});
                                        var jjId = advertisementR.save();
                                        log.audit("反写创建成功，ID为：", jjId);
                                    }
                                }
                            } catch (updateError) {
                                log.error("更新记录同步状态失败", updateError.toString());
                            }
                        }

                        // 更新原单的采购订单号（防止重复处理）
                        let invoiceDetails = groupData.invoiceDetails
                        if (invoiceDetails){
                            for (let index in invoiceDetails){
                                let recId = invoiceDetails[index].internalId;
                                if (!recId) continue;
                                let recType = "customrecord_swc_op_advertisement";
                                let poFieldId = "custrecordcustrecord_swc_op_po_number_";
                                if (type == 2) {
                                    recType = "customrecord_swc_jj_advertisement_report";
                                    poFieldId = "custrecordcustrecord_swc_jj_adv_ponumber";
                                }
                                let values = {};
                                values[poFieldId] = poId;
                                record.submitFields({type: recType, id: recId, values: values});
                            }
                        }
                    } catch (e) {
                        log.error("错误", e.toString());
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

        const summarize = (summaryContext) => {}

        // 以下所有辅助函数保持不变（getSearchList, processSkuRecords, processNoSkuRecords,
        // getSearchListJJ, processSkuRecordsJJ, processNoSkuRecordsJJ,
        // addAllRecordsToPo, addJJRecordsToPo, vendorSearchByName,
        // searchItemIdsByAdvertisingTypes, searchCurrency, getAllSearchObj,
        // getSecTypeJson, formatDate 等）
        // 由于篇幅原因，此处省略，实际使用时请保留原脚本中的完整定义

        // 注意：原脚本中的 processNoSkuRecords 和 processNoSkuRecordsJJ 函数内部
        // 仍然会设置 needInvoiceQuery = true 和 invoiceDetails 等字段，
        // 但由于 reduce 中的分摊逻辑已被注释，这些字段不会被使用，
        // 采购单将直接使用 groupData.records 中的原始记录（金额为原始 price/cost）。
        // 若希望完全避免无SKU数据进入采购单，可进一步修改分组逻辑，
        // 但按照当前要求仅注释分摊逻辑，因此保留原样。

        return {
            getInputData,
            reduce,
            summarize
        }
    });