/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @description import packset data
 */
define(['N/search', 'N/record', 'N/runtime', 'N/format',  'N/task'],

    (search, record, runtime, format, task) => {
        const getInputData = (inputContext) => {
            let script = runtime.getCurrentScript();
            return getAllData()
        }
        /**
         * @param {Object} mapContext 
         */
        const map = (mapContext) => {
            var key = mapContext.key;
            var value = JSON.parse(mapContext.value)
            log.audit('key',key)
            log.audit('value',value)
            var type='suc'
            var mes=""
            var rtId,creditmemoId,itemId,soIdlist
            try {
                var soNo= key.split("_")[2]
                soIdlist = searchForSoId(soNo)
                var MSKU = key.split("_")[5]
                var cusId = key.split("_")[1]
                var currency = key.split("_")[4]
                var date = key.split("_")[3]
                itemId = searchForItem(MSKU,cusId)
                if(!itemId){
                    type='err'
                    mes="未找到对应的itemId,MSKU:"+MSKU
                    log.audit('未找到对应的itemId,MSKU',MSKU)
                }else{
                    var subsidiaryId = search.lookupFields({
                        type: record.Type.CUSTOMER,
                        id: cusId,  
                        columns: ['subsidiary']
                    }).subsidiary[0].value;
                    var rtRcord = record.create({
                        type: "returnauthorization",
                        isDynamic: true
                    });
                    rtRcord.setValue({fieldId: 'otherrefnum', value:soNo})
                    rtRcord.setValue({fieldId: 'entity', value:cusId})                    
                    rtRcord.setValue({fieldId: 'subsidiary', value:subsidiaryId})
                    rtRcord.setValue({
                        fieldId: 'trandate',
                        value: format.parse({value: date, type: format.Type.DATE})
                    });
                    rtRcord.setValue({fieldId: 'currency', value:currency})
                    var sublistId = "item"
                    for(let i=0;i<value.length;i++){
                        var rate = value[i].amount/value[i].quantity
                        rtRcord.selectNewLine({sublistId: sublistId});
                        rtRcord.setCurrentSublistValue({sublistId: sublistId, fieldId: "item", value: itemId})
                        rtRcord.setCurrentSublistValue({sublistId: sublistId, fieldId: "quantity", value: value[i].quantity})
                        rtRcord.setCurrentSublistValue({sublistId: sublistId, fieldId: "rate", value: rate})
                        rtRcord.setCurrentSublistValue({sublistId: sublistId, fieldId: "amount", value: value[i].amount})
                        rtRcord.setCurrentSublistValue({sublistId: sublistId, fieldId: "custcol_swc_taxam_all", value: value[i].taxAmount})
                        rtRcord.setCurrentSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_rtv_msku", value: value[i].msku})
                        rtRcord.setCurrentSublistValue({sublistId: sublistId, fieldId: "taxcode", value: -7})
                        rtRcord.setCurrentSublistValue({sublistId: sublistId, fieldId: "custcol_swc_related_xl_retrea", value: value[i].rtvId})
                        rtRcord.commitLine({sublistId: sublistId})
                    }
                    rtId = rtRcord.save()
                    log.audit('退货授权',rtId)
                    if(rtId){
                        const locationId = findSubsidiaryLocation(subsidiaryId)
                        var creditmemo = record.transform({fromType:"returnauthorization",fromId:rtId,toType:"creditmemo"});
                        creditmemo.setValue({fieldId:"location",value:locationId})
                        creditmemoId = creditmemo.save()
                        log.audit('贷项通知单',creditmemoId)
                    }
                }
                var parmasobj = {
                    type: type,//suc成功 err失败
                    soIdlist:soIdlist,//mapContext.value为map中的value
                    itemId: itemId,
                    rtId: rtId,
                    creditmemoId: creditmemoId,
                    msg: mes
                }
                for (let i=0;i<value.length;i++) {
                    mapContext.write({
                        key: value[i].rtvId,
                        value: parmasobj
                    });
                }
            } catch (error) {
                log.error('error',error)
                var parmasobj = {
                    type: type,//suc成功 err失败
                    soIdlist:soIdlist,//mapContext.value为map中的value
                    itemId: itemId,
                    rtId: rtId,
                    creditmemoId: creditmemoId,
                    msg: error.message
                }
                for (let i=0;i<value.length;i++) {
                    mapContext.write({
                        key: value[i].rtvId,
                        value: parmasobj
                    });
                }
            }
        }

      /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            try {
                var value = JSON.parse(reduceContext.values);
                var key = reduceContext.key;
                var detailRec = record.load({type:"customrecord_swc_xl_rtvam_ip",id:key,isDynamic:true});//小鹿退款明细
                if(value.soIdlist.length>0){
                    detailRec.setValue({fieldId:"custrecord_swc_rtv_po",value:value.soIdlist})//匹配至订单
                }else{
                    detailRec.setValue({fieldId:"custrecord_swc_rtv_po",value:""})//匹配至订单
                }
                if(value.itemId)detailRec.setValue({fieldId:"custrecord_swc_ns_sku",value:value.itemId})//NS sku
                if(value.rtId)detailRec.setValue({fieldId:"custrecord_swc_rtv_vrma",value:value.rtId})//生成退货授权
                if(value.creditmemoId)detailRec.setValue({fieldId:"custrecord_swc_rtv_debit",value:value.creditmemoId})//生成贷项通知单
                if(value.msg){
                    detailRec.setValue({fieldId:"custrecord_swc_rtv_status",value:2})//代码运行状态 2 执行失败
                }else{
                    detailRec.setValue({fieldId:"custrecord_swc_rtv_status",value:1})//代码运行状态 1 执行成功
                }
                detailRec.setValue({fieldId:"custrecord_swc_rtv_error",value:value.msg})//error 
                detailRec.save()
            } catch (e) {
                log.error('reduce-error',e.message);
            }
        };

        function findSubsidiaryLocation(subsidiary) {
            var locationId=""
            const locationSearchObj = search.create({
            type: "location",
            filters:
            [
                ["subsidiary","anyof",subsidiary]
            ],
            columns:
            [
                search.createColumn({name: "name", label: "名称"}),
                search.createColumn({name: "phone", label: "电话"}),
                search.createColumn({name: "city", label: "城市"}),
                search.createColumn({name: "internalid", label: "内部 ID"})
            ]
            });
            const searchResultCount = locationSearchObj.runPaged().count;
            log.debug("locationSearchObj result count",searchResultCount);
            locationSearchObj.run().each(function(result){
            // .run().each has a limit of 4,000 results
            locationId = result.getValue({name: "internalid"});
            return false;
            });
            return locationId;
        }


        /**
         * Processes the map context to generate and upload files based on the given data.
         * @param {Object} summaryContext - The context object containing key and value properties for processing.
         */
        const summarize = (summaryContext) => {

        }

        function getAllData() {
            try {
                var data = searchForRTListData();  
                return data;
            } catch (error) {
                log.audit("error", error)
                return {}
            }
        }

        function searchForRTListData(){
            var resultObj = {}
            var dataList = []
            const customrecord_swc_xl_rtvam_ipSearchObj = search.create({
            type: "customrecord_swc_xl_rtvam_ip",
            filters:
            [
                ["custrecord_swc_rtv_status","anyof","@NONE@","3"]
            ],
            columns:
            [
                search.createColumn({name: "internalid", label: "内部 ID"}),
                search.createColumn({name: "custrecord_swc_rtv_platform", label: "平台"}),
                search.createColumn({name: "custrecord_swc_rtv_shop", label: "店铺"}),
                search.createColumn({name: "custrecord_swc_rtv_ponumber", label: "平台单号（PO number）"}),
                search.createColumn({name: "custrecord_swc_rtv_invoicenumber", label: "发票号（Invoice Number）"}),
                search.createColumn({name: "custrecord_swc_rtv_rtvdate", label: "退款时间（ RTV Date）"}),
                search.createColumn({name: "custrecord_swc_rtv_currency", label: "币种"}),
                search.createColumn({name: "custrecord_swc_rtv_msku", label: "MSKU"}),
                search.createColumn({name: "custrecord_swc_rtv_quantity", label: "退回数量"}),
                search.createColumn({name: "custrecord_swc_rtv_amount", label: "退款金额-未税（RTV Amount）"}),
                search.createColumn({name: "custrecord_swc_rtv_taxamount", label: "税额"}),
                search.createColumn({name: "custrecord_swc_outputcsv_memo", label: "备注"}),
                search.createColumn({name: "custrecord_swc_ns_sku", label: "NS sku"}),
                search.createColumn({name: "custrecord_swc_rtv_vrma", label: "生成退货授权"}),
                search.createColumn({name: "custrecord_swc_rtv_debit", label: "生成贷项通知单"}),
                search.createColumn({name: "custrecord_swc_rtv_error", label: "error"}),
                search.createColumn({name: "custrecord_swc_rtv_po", label: "匹配至订单"}),
                search.createColumn({name: "custrecord_swc_rtv_status", label: "代码运行状态"})
            ]
            });
            var results = getAllResultsOfSearch(customrecord_swc_xl_rtvam_ipSearchObj);
            if(results.length>0){
                // 处理结果
                results.forEach(function(result){
                    var rtvId = result.getValue({name: "internalid"});
                    var platform = result.getValue({name: "custrecord_swc_rtv_platform"});
                    var shop = result.getValue({name: "custrecord_swc_rtv_shop"});
                    var poNumber = result.getValue({name: "custrecord_swc_rtv_ponumber"});
                    var invoiceNumber = result.getValue({name: "custrecord_swc_rtv_invoicenumber"});
                    var rtvDate = result.getValue({name: "custrecord_swc_rtv_rtvdate"});
                    var currency = result.getValue({name: "custrecord_swc_rtv_currency"});
                    var msku = result.getValue({name: "custrecord_swc_rtv_msku"});
                    var quantity = result.getValue({name: "custrecord_swc_rtv_quantity"});
                    var amount = result.getValue({name: "custrecord_swc_rtv_amount"});
                    var taxAmount = result.getValue({name: "custrecord_swc_rtv_taxamount"});
                    var memo = result.getValue({name: "custrecord_swc_outputcsv_memo"});
                    var nsSku = result.getValue({name: "custrecord_swc_ns_sku"});
                    var vrma = result.getValue({name: "custrecord_swc_rtv_vrma"});
                    var debit = result.getValue({name: "custrecord_swc_rtv_debit"});
                    var error = result.getValue({name: "custrecord_swc_rtv_error"});
                    var po = result.getValue({name: "custrecord_swc_rtv_po"});
                    var status = result.getValue({name: "custrecord_swc_rtv_status"});
                    var key=platform+"_"+shop+"_"+poNumber+"_"+rtvDate+"_"+currency+"_"+msku
                    if(resultObj.hasOwnProperty(key)){
                        resultObj[key].push({
                            rtvId:rtvId,
                            platform: platform,
                            shop: shop,
                            poNumber: poNumber,
                            invoiceNumber: invoiceNumber,
                            rtvDate: rtvDate,
                            currency: currency,
                            msku: msku,
                            quantity: quantity,
                            amount: amount,
                            taxAmount: taxAmount,
                            memo: memo,
                            nsSku: nsSku,
                            vrma: vrma,
                            debit: debit,
                            error: error,
                            po: po,
                            status: status
                        })
                    }else{
                        resultObj[key]=[{
                          rtvId:rtvId,
                            platform: platform,
                            shop: shop,
                            poNumber: poNumber,
                            invoiceNumber: invoiceNumber,
                            rtvDate: rtvDate,
                            currency: currency,
                            msku: msku,
                            quantity: quantity,
                            amount: amount,
                            taxAmount: taxAmount,
                            memo: memo,
                            nsSku: nsSku,
                            vrma: vrma,
                            debit: debit,
                            error: error,
                            po: po,
                            status: status
                        }]
                    }
                });
            }
            log.audit("resultObj",resultObj)
            return resultObj;
        }

        function searchForSoId(soNo) {
            // Implementation for searching SO ID
            var internalidList=[];
            const salesorderSearchObj = search.create({
                type: "salesorder",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                [
                    ["type","anyof","SalesOrd"], 
                    "AND", 
                    [["custbody_swc_platform_order_number","is",soNo],"OR",["externalrefnumber","is",soNo]], 
                    "AND", 
                    ["mainline","is","T"]
                ],
                columns:
                [
                    search.createColumn({name: "ordertype", label: "订单类型"}),
                    search.createColumn({name: "mainline", label: "*"}),
                    search.createColumn({name: "internalid", label: "内部 ID"}),
                    search.createColumn({name: "custbody_swc_platform_order_number", label: "平台订单流水号"}),
                ]
            });
            const searchResultCount = salesorderSearchObj.runPaged().count;
            if(searchResultCount > 0){
                salesorderSearchObj.run().each(function(result){
                    var id = result.getValue({name: "internalid"});
                    internalidList.push(id);
                });
            }
            log.audit('internalidList',internalidList)
            return internalidList;
        }

        function searchForItem(MSKU,cusId) {
            // Implementation for searching Item Type based on MSKU
            var itemId=""
            const customrecord_swc_amazon_sku_mappingSearchObj = search.create({
            type: "customrecord_swc_amazon_sku_mapping",
            filters:
            [
                ["custrecord_swc_az_sku_map_store.internalid","anyof",cusId], 
                "AND", 
                ["custrecord_swc_az_sku_map_msku","is",MSKU]
            ],
            columns:
            [
                search.createColumn({name: "custrecord_swc_az_sku_map_item", label: "NS货品"}),
                search.createColumn({name: "custrecord_swc_az_sku_map_msku", label: "msku"}),
                search.createColumn({name: "custrecord_swc_az_sku_map_store", label: "店铺"}),  
            ]
            });
            var results = getAllResultsOfSearch(customrecord_swc_amazon_sku_mappingSearchObj);
            if(results.length>0){
                // 处理结果
                results.forEach(function(result){
                    itemId = result.getValue({name: "custrecord_swc_az_sku_map_item"});
                });
            }else{
                const customrecord_swc_platform_sku_mappingSearchObj = search.create({
                type: "customrecord_swc_platform_sku_mapping",
                filters:
                [
                    ["custrecord_swc_pt_sku_map_store.internalid","anyof",cusId], 
                    "AND", 
                    ["custrecord_swc_pt_sku_map_msku","is",MSKU]
                ],
                columns:
                [
                    search.createColumn({name: "scriptid", label: "脚本 ID"}),
                    search.createColumn({name: "custrecord_swc_pt_sku_map_sku", label: "sku"}),
                    search.createColumn({name: "custrecord_swc_pt_sku_map_msku", label: "msku"}),
                    search.createColumn({name: "custrecord_swc_pt_sku_map_item", label: "Item"}),
                ]
                });

                var results2 = getAllResultsOfSearch(customrecord_swc_platform_sku_mappingSearchObj);
                if(results2.length>0){
                    // 处理结果
                    results2.forEach(function(result){
                        itemId = result.getValue({name: "custrecord_swc_pt_sku_map_item"});
                    });
                }
            }

            return itemId;
        }

        function getAllResultsOfSearch(saveSearch) {
            var resultset = saveSearch.run();
            var start = 0;
            var step = 1000;
            var resultArr = [];
            var results = resultset.getRange({
            start: start,
            end: Number(start) + Number(step)
            });
            while (results && results.length > 0) {
            resultArr = resultArr.concat(results);
            start = Number(start) + Number(step);
            results = resultset.getRange({
                start: start,
                end: Number(start) + Number(step)
            });
            }
            return resultArr;
        }


        return {
            getInputData,
            map,
            summarize,
            reduce
        }

    });