/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @description 备货计划复核通过之后按SKU分组汇总
 */
define(['N/record', 'N/runtime', 'N/search', 'N/config', '../common/moment', '../common/commons'],
    /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
    (record, runtime, search, config, moment, commons) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            try {
                // repartition(926)
                // return []
                var results = [];
                var limit = 3999;
                search.create({
                    type: 'customrecord_swc_demand_plan',
                    filters: [
                        { name: 'custrecord_swc_dpr_status', join: 'custrecord_swc_dp_review', operator: search.Operator.IS, values: 6 },//复核单审批状态为已审批通过
                        { name: 'custrecord_swc_dpr_deal', join: 'custrecord_swc_dp_review', operator: search.Operator.IS, values: false },//还没生成采购需求汇总表的单据
                        // { name: 'internalid', join: 'custrecord_swc_dp_review', operator: search.Operator.IS, values: 73 },//特定单据测试
                    ],
                    columns: [
                        { name: 'custrecord_swc_dp_review', summary: 'GROUP' },
                        { name: 'custrecord_swc_dp_sku', summary: 'GROUP' },
                        { name: 'type', join: 'custrecord_swc_dp_sku', summary: 'GROUP' }
                    ]
                }).run().each(function (rec) {
                    log.debug('备货汇总明细数据', rec)
                    results.push({
                        sku: rec.getValue(rec.columns[1]),
                        reviewId: rec.getValue(rec.columns[0])
                    })
                    return limit-- > 0;
                })
                log.debug('results', results.length)
                return results;
            } catch (error) {
                log.debug('get error', error)
                return []
            }


        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            try {
                var obj = JSON.parse(mapContext.value);
                var reviewId = obj.reviewId;
                var sku = obj.sku;
                var purchaseRec = record.create({ type: 'customrecord_swc_purchase_plan' });
                var totalQty = 0, west_qty = 0, east_qty = 0, center_qty = 0, southwest_qty = 0, southeast_qty = 0, ca_east_qty = 0, ca_west_qty = 0;
                var lineNum = 0;
                var skuType = '';
                var vendor = '';
                search.create({
                    type: 'customrecord_swc_demand_plan',
                    filters: [
                        { name: 'custrecord_swc_dp_review', operator: search.Operator.IS, values: reviewId },
                        { name: 'custrecord_swc_dp_sku', operator: search.Operator.IS, values: sku }
                    ],
                    columns: [
                        { name: 'custrecord_swc_dp_batch' },
                        { name: 'custrecord_swc_dp_country' },
                        { name: 'custrecord_swc_dp_location_type' },
                        { name: 'custrecord_swc_dp_sku' },
                        { name: 'custrecord_swc_dp_store' },
                        { name: 'custrecord_swc_dp_quantity' },
                        { name: 'custrecord_swc_dp_applicant_date' },
                        { name: 'custrecord_swc_dp_applicant' },
                        { name: 'custrecord_swc_dp_sku_name' },
                        { name: 'custrecord_swc_dp_by_date' },
                        { name: 'custrecord_swc_dp_new_old' },
                        { name: 'custrecord_swc_dp_cplb' },
                        { name: 'custrecord_swc_dp_sku_level' },
                        { name: 'custrecord_swc_dp_inventory_status' },
                        { name: 'custrecord_swc_dp_us_west_qty' },//美国五区
                        { name: 'custrecord_swc_dp_us_east_qty' },
                        { name: 'custrecord_swc_dp_us_center_qty' },
                        { name: 'custrecord_swc_dp_us_southwest_qty' },
                        { name: 'custrecord_swc_dp_us_southeast_qty' },
                        { name: 'custrecord_swc_dp_ca_east_qty' },//加东加西
                        { name: 'custrecord_swc_dp_ca_west_qty' },
                        { name: 'subtype', join: 'custrecord_swc_dp_sku' },
                        { name: 'type', join: 'custrecord_swc_dp_sku' },
                        { name: 'custitem_swc_preferred_vendor', join: 'custrecord_swc_dp_sku' }
                    ]
                }).run().each(function (rec) {
                    log.debug('备货汇总数据', rec)
                    skuType = rec.getValue({ name: 'type', join: 'custrecord_swc_dp_sku' })
                    vendor = rec.getValue({ name: 'custitem_swc_preferred_vendor', join: 'custrecord_swc_dp_sku' })
                    totalQty = Number(totalQty) + Number(rec.getValue('custrecord_swc_dp_quantity') || 0)
                    west_qty = Number(west_qty) + Number(rec.getValue('custrecord_swc_dp_us_west_qty') || 0)
                    east_qty = Number(east_qty) + Number(rec.getValue('custrecord_swc_dp_us_east_qty') || 0)
                    center_qty = Number(center_qty) + Number(rec.getValue('custrecord_swc_dp_us_center_qty') || 0)
                    southwest_qty = Number(southwest_qty) + Number(rec.getValue('custrecord_swc_dp_us_southwest_qty') || 0)
                    southeast_qty = Number(southeast_qty) + Number(rec.getValue('custrecord_swc_dp_us_southeast_qty') || 0)
                    ca_east_qty = Number(ca_east_qty) + Number(rec.getValue('custrecord_swc_dp_ca_east_qty') || 0)
                    ca_west_qty = Number(ca_west_qty) + Number(rec.getValue('custrecord_swc_dp_ca_west_qty') || 0)
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_demand_plan', value: rec.id, line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_batch', value: rec.getValue('custrecord_swc_dp_batch'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_location_type', value: rec.getValue('custrecord_swc_dp_location_type'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_country', value: rec.getValue('custrecord_swc_dp_country'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_sku', value: rec.getValue('custrecord_swc_dp_sku'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_store', value: rec.getValue('custrecord_swc_dp_store'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_quantity', value: rec.getValue('custrecord_swc_dp_quantity'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_date', value: new Date()/*rec.getValue('custrecord_swc_dp_applicant_date')*/, line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_salesman', value: rec.getValue('custrecord_swc_dp_applicant'), line: lineNum });
                    // purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_sku_yjlm', value: rec.getValue('custrecord_swc_dp_location_type'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_first_receipt_time', value: new Date() /*rec.getValue('custrecord_swc_dp_by_date')*/, line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_new_old', value: rec.getValue('custrecord_swc_dp_new_old'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_sku_type', value: rec.getValue('custrecord_swc_dp_cplb'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_sku_level', value: rec.getValue('custrecord_swc_dp_sku_level'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_inventory_status', value: rec.getValue('custrecord_swc_dp_inventory_status'), line: lineNum });
                    // purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_shipping_priority', value: rec.getValue('custrecord_swc_pp_shipping_priority'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_west', value: rec.getValue('custrecord_swc_dp_us_west_qty'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_east', value: rec.getValue('custrecord_swc_dp_us_east_qty'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_center', value: rec.getValue('custrecord_swc_dp_us_center_qty'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_east_south', value: rec.getValue('custrecord_swc_dp_us_southeast_qty'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_west_south', value: rec.getValue('custrecord_swc_dp_us_southwest_qty'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_ca_east', value: rec.getValue('custrecord_swc_dp_ca_east_qty'), line: lineNum });
                    purchaseRec.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_ca_west', value: rec.getValue('custrecord_swc_dp_ca_west_qty'), line: lineNum });

                    // purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_sku_yjlm', value: rec.getValue('custrecord_swc_dp_location_type') })
                    purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_vendor', value: rec.getValue({ name: 'custitem_swc_preferred_vendor', join: 'custrecord_swc_dp_sku' }) })
                    purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_batch', value: rec.getValue('custrecord_swc_dp_batch') })
                    rec.getValue('custrecord_swc_dp_by_date') && purchaseRec.setText({ fieldId: 'custrecord_swc_pd_first_receipt_time', text: rec.getValue('custrecord_swc_dp_by_date') })
                    purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_new_old', value: rec.getValue('custrecord_swc_dp_new_old') })
                    purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_sku_type', value: rec.getValue('custrecord_swc_dp_cplb') })
                    purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_sku_level', value: rec.getValue('custrecord_swc_dp_sku_level') })
                    purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_inventory_status', value: rec.getValue('custrecord_swc_dp_inventory_status') })
                    lineNum++;
                    return true;
                })

                purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_sku', value: sku })
                purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_quantity', value: totalQty })
                purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_date', value: new Date() })
                if (skuType == 'Assembly' && vendor) {//如果是装配件，并且配置了默认供应商，搜索默认BOM
                    search.create({
                        type: 'bom',
                        filters: [
                            { name: 'custrecord_swc_bom_vendor', operator: search.Operator.IS, values: vendor },
                            { name: 'assembly', join: 'assemblyitem', operator: search.Operator.IS, values: sku }
                        ],
                        columns: [
                            { name: 'internalid' }
                        ]
                    }).run().each(function (bom_rec) {
                        log.debug('备货汇总供应商BOM', bom_rec)
                        purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_bom', value: bom_rec.id })
                        return false;
                    })
                }
                //TODO:发货优先级
                // purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_shipping_priority', value: vendor })
                purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_us_west', value: west_qty })
                purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_us_east', value: east_qty })
                purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_us_center', value: center_qty })
                purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_us_east_south', value: southeast_qty })
                purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_us_west_south', value: southwest_qty })
                purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_ca_east', value: ca_east_qty })
                purchaseRec.setValue({ fieldId: 'custrecord_swc_pd_ca_west', value: ca_west_qty })
                var purchasePlanId = purchaseRec.save();
                //采购需求汇总之后重新分配美国五区分区数量（五区合并3区逻辑）
                // repartition(purchasePlanId)

                mapContext.write({
                    key: reviewId,
                    value: { id: purchasePlanId }
                })

                // purchasePlanToPurchaseRequest(purchasePlanId)

            } catch (error) {
                log.error('reduce error', error)
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
                //标志复核单已转换采购需求汇总表
                log.debug('reduceContext.key', reduceContext.key)
                log.debug('reduceContext.values', reduceContext.values)
                var reviewId = reduceContext.key;
                var reviewRec = record.load({ type: 'customrecord_swc_demand_plan_review', id: reviewId });
                reviewRec.setValue({ fieldId: 'custrecord_swc_dpr_deal', value: true })
                reviewRec.save();

            } catch (error) {
                log.error('销售统计结果', error)
            }

        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {

        }


        /**
         * 采购汇总表重新分配美国五区数量（五区合并三区）
         * @param {*} recId 
         */
        function repartition(recId) {
            var headerRecord = record.load({ type: 'customrecord_swc_purchase_plan', id: recId });
            let totalQty = 0;
            const DETAIL_SUBLIST_ID = "recmachcustrecord_swc_ppd_purchase_plan";
            let regions = ['west', 'west_south', 'east_south', 'east', 'center'];
            for (var i = 0; i < regions.length; i++) {
                var fieldId = 'custrecord_swc_pd_us_' + regions[i]; //各个分区字段ID
                var value = headerRecord.getValue({ fieldId: fieldId }) || 0;
                totalQty = totalQty + Number(value);
            }
            if (totalQty < 30) {
                applyRule1(headerRecord, regions, totalQty);
            } else if (totalQty >= 30 && totalQty < 100) {
                applyRule2(headerRecord, regions);
            }
            // 总数量 ≥ 100时不处理
        }

        function applyRule1(headerRecord, regionFields, totalQty) {
            // 1. 确定汇总表头的最大分区
            var headerRegionValues = {};
            var maxRegion = null;
            var maxValue = -1;
            //TODO:有断货风险则全部发到美西自建仓（需要确定如何判断为有断货风险）

            for (var i = 0; i < regionFields.length; i++) {
                var fieldId = 'custrecord_swc_pd_us_' + regionFields[i]; //各个分区字段ID
                var value = headerRecord.getValue({ fieldId: fieldId }) || 0;
                headerRegionValues[regionFields[i]] = value;

                // 找出数量最大且优先级最高的分区 (a > b > c > d > e)
                if (value > maxValue || (value === maxValue && regionFields.indexOf(regionFields[i]) < regionFields.indexOf(maxRegion))) {
                    maxValue = value;
                    maxRegion = regionFields[i];
                }
            }

            // 有断货风险则全部发到美西自建仓（需要确定如何判断为有断货风险）
            var inventory_status = headerRecord.getValue({ fieldId: 'custrecord_swc_pd_inventory_status' });
            if (inventory_status == '4' || inventory_status == '5' || inventory_status == '6' || inventory_status == '7') {
                maxRegion = regionFields[0];
            }

            // 更新汇总表头：将所有数量归并到最大分区
            for (var j = 0; j < regionFields.length; j++) {
                var fieldId = 'custrecord_swc_pd_us_' + regionFields[j];
                var newValue = (regionFields[j] === maxRegion) ? totalQty : 0;
                headerRecord.setValue({ fieldId: fieldId, value: newValue });
            }

            // 2. 同步更新明细表：每行均按汇总表头的最大分区进行调整
            var itemSublistId = 'recmachcustrecord_swc_ppd_purchase_plan'; // 明细子列表ID
            var lineCount = headerRecord.getLineCount({ sublistId: itemSublistId });

            for (var k = 0; k < lineCount; k++) {
                var lineTotalQty = headerRecord.getSublistValue({
                    sublistId: itemSublistId,
                    fieldId: 'custrecord_swc_ppd_quantity', // 明细行总数字段
                    line: k
                });
                var lineCountry = headerRecord.getSublistValue({
                    sublistId: itemSublistId,
                    fieldId: 'custrecord_swc_ppd_country', // 明细行总数字段
                    line: k
                });
                var lineLocationType = headerRecord.getSublistValue({
                    sublistId: itemSublistId,
                    fieldId: 'custrecord_swc_ppd_location_type', // 明细行总数字段
                    line: k
                });

                for (var m = 0; m < regionFields.length; m++) {
                    var lineFieldId = 'custrecord_swc_ppd_us_' + regionFields[m]; // 明细行分数字段
                    var newLineValue = (regionFields[m] === maxRegion) ? lineTotalQty : 0;
                    if (lineCountry == '1' && lineLocationType == '1') {
                        headerRecord.setSublistValue({
                            sublistId: itemSublistId,
                            fieldId: lineFieldId,
                            line: k,
                            value: newLineValue
                        });
                    }

                }
            }
            headerRecord.save()
        }

        function applyRule2(headerRecord, regionFields) {
            // 1. 对汇总表头的分区进行排序（按数量降序，数量相同按优先级美西>美西南>美东南>美东>美中的顺序进行数据清洗）
            var headerRegionValues = {};
            for (var i = 0; i < regionFields.length; i++) {
                var fieldId = 'custrecord_swc_pd_us_' + regionFields[i];
                headerRegionValues[regionFields[i]] = headerRecord.getValue({ fieldId: fieldId }) || 0;
            }

            var sortedRegions = regionFields.sort(function (a, b) {
                if (headerRegionValues[a] !== headerRegionValues[b]) {
                    return headerRegionValues[b] - headerRegionValues[a]; // 按数量降序
                }
                return regionFields.indexOf(a) - regionFields.indexOf(b); // 数量相同按优先级排序
            });

            // 2. 计算汇总表头新的分区值（合并规则）
            var newHeaderValues = {};
            newHeaderValues[sortedRegions[0]] = headerRegionValues[sortedRegions[0]] + headerRegionValues[sortedRegions[3]]; // 第一区 + 第四区
            newHeaderValues[sortedRegions[1]] = headerRegionValues[sortedRegions[1]] + headerRegionValues[sortedRegions[4]]; // 第二区 + 第五区
            newHeaderValues[sortedRegions[2]] = headerRegionValues[sortedRegions[2]]; // 第三区不变
            newHeaderValues[sortedRegions[3]] = 0; // 第四区归零
            newHeaderValues[sortedRegions[4]] = 0; // 第五区归零

            // 更新汇总表头
            for (var j = 0; j < regionFields.length; j++) {
                var fieldId = 'custrecord_swc_pd_us_' + regionFields[j];
                headerRecord.setValue({ fieldId: fieldId, value: newHeaderValues[regionFields[j]] });
            }

            // 3. 同步更新明细表：每行均按汇总表头的合并规则进行调整
            var itemSublistId = 'recmachcustrecord_swc_ppd_purchase_plan';
            var lineCount = headerRecord.getLineCount({ sublistId: itemSublistId });

            for (var k = 0; k < lineCount; k++) {
                var lineRegionValues = {};
                // 读取明细行各分区原始值
                for (var m = 0; m < regionFields.length; m++) {
                    var lineFieldId = 'custrecord_swc_ppd_us_' + regionFields[m];
                    lineRegionValues[regionFields[m]] = headerRecord.getSublistValue({
                        sublistId: itemSublistId,
                        fieldId: lineFieldId,
                        line: k
                    }) || 0;
                }

                // 使用汇总表头相同的排序结果（sortedRegions）和合并规则
                var newLineValues = {};
                newLineValues[sortedRegions[0]] = lineRegionValues[sortedRegions[0]] + lineRegionValues[sortedRegions[3]];
                newLineValues[sortedRegions[1]] = lineRegionValues[sortedRegions[1]] + lineRegionValues[sortedRegions[4]];
                newLineValues[sortedRegions[2]] = lineRegionValues[sortedRegions[2]];
                newLineValues[sortedRegions[3]] = 0;
                newLineValues[sortedRegions[4]] = 0;

                // 更新明细行
                for (var n = 0; n < regionFields.length; n++) {
                    var updateFieldId = 'custrecord_swc_ppd_us_' + regionFields[n];
                    headerRecord.setSublistValue({
                        sublistId: itemSublistId,
                        fieldId: updateFieldId,
                        line: k,
                        value: newLineValues[regionFields[n]]
                    });
                }
            }
            headerRecord.save()
        }

        return { getInputData, map, reduce, summarize }

    });
