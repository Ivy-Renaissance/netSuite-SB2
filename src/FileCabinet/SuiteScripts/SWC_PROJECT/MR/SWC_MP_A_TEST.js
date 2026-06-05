/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search) => {
        var ids = [];
        var has_error = false;
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
            // var data = ['1', '2', '3', '4', '5', '6', '7']
            var data = ['33', '19', '11', '6', '3', '2', '47', '26', '15', '4', '2', '1', '5', '55', '26', '4']
            var newdatas = splitRegions(data, 189, 259);
            log.debug('newdatas', newdatas)
            var details = [
                {
                    "id": "1149",
                    "demand_plan": "81",
                    "batch": "5",
                    "location_type": "1",
                    "country": "1",
                    "sku": "3719",
                    "store": "149",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 33,
                    "a": 0,
                    "b": 0,
                    "c": 33,
                    "d": 0,
                    "e": 0,
                    "f": 0,
                    "g": 0
                },
                {
                    "id": "1150",
                    "demand_plan": "272",
                    "batch": "5",
                    "location_type": "1",
                    "country": "1",
                    "sku": "3719",
                    "store": "149",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 19,
                    "a": 0,
                    "b": 0,
                    "c": 0,
                    "d": 19,
                    "e": 0,
                    "f": 0,
                    "g": 0
                },
                {
                    "id": "1151",
                    "demand_plan": "312",
                    "batch": "5",
                    "location_type": "1",
                    "country": "1",
                    "sku": "3719",
                    "store": "149",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 11,
                    "a": 11,
                    "b": 0,
                    "c": 0,
                    "d": 0,
                    "e": 0,
                    "f": 0,
                    "g": 0
                },
                {
                    "id": "1152",
                    "demand_plan": "342",
                    "batch": "5",
                    "location_type": "1",
                    "country": "1",
                    "sku": "3719",
                    "store": "148",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 6,
                    "a": 0,
                    "b": 0,
                    "c": 6,
                    "d": 0,
                    "e": 0,
                    "f": 0,
                    "g": 0
                },
                {
                    "id": "1153",
                    "demand_plan": "418",
                    "batch": "5",
                    "location_type": "1",
                    "country": "1",
                    "sku": "3719",
                    "store": "148",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 3,
                    "a": 0,
                    "b": 0,
                    "c": 0,
                    "d": 3,
                    "e": 0,
                    "f": 0,
                    "g": 0
                },
                {
                    "id": "1154",
                    "demand_plan": "442",
                    "batch": "5",
                    "location_type": "1",
                    "country": "1",
                    "sku": "3719",
                    "store": "148",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 2,
                    "a": 2,
                    "b": 0,
                    "c": 0,
                    "d": 0,
                    "e": 0,
                    "f": 0,
                    "g": 0
                },
                {
                    "id": "1155",
                    "demand_plan": "477",
                    "batch": "5",
                    "location_type": "1",
                    "country": "1",
                    "sku": "3719",
                    "store": "155",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 47,
                    "a": 0,
                    "b": 0,
                    "c": 47,
                    "d": 0,
                    "e": 0,
                    "f": 0,
                    "g": 0
                },
                {
                    "id": "1156",
                    "demand_plan": "704",
                    "batch": "5",
                    "location_type": "1",
                    "country": "1",
                    "sku": "3719",
                    "store": "155",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 26,
                    "a": 0,
                    "b": 0,
                    "c": 0,
                    "d": 26,
                    "e": 0,
                    "f": 0,
                    "g": 0
                },
                {
                    "id": "1157",
                    "demand_plan": "769",
                    "batch": "5",
                    "location_type": "1",
                    "country": "1",
                    "sku": "3719",
                    "store": "155",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 15,
                    "a": 15,
                    "b": 0,
                    "c": 0,
                    "d": 0,
                    "e": 0,
                    "f": 0,
                    "g": 0
                },
                {
                    "id": "1158",
                    "demand_plan": "1210",
                    "batch": "5",
                    "location_type": "1",
                    "country": "1",
                    "sku": "3719",
                    "store": "146",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 4,
                    "a": 0,
                    "b": 0,
                    "c": 4,
                    "d": 0,
                    "e": 0,
                    "f": 0,
                    "g": 0
                },
                {
                    "id": "1159",
                    "demand_plan": "1407",
                    "batch": "5",
                    "location_type": "1",
                    "country": "1",
                    "sku": "3719",
                    "store": "146",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 2,
                    "a": 0,
                    "b": 0,
                    "c": 0,
                    "d": 2,
                    "e": 0,
                    "f": 0,
                    "g": 0
                },
                {
                    "id": "1160",
                    "demand_plan": "1452",
                    "batch": "5",
                    "location_type": "1",
                    "country": "1",
                    "sku": "3719",
                    "store": "146",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 1,
                    "a": 1,
                    "b": 0,
                    "c": 0,
                    "d": 0,
                    "e": 0,
                    "f": 0,
                    "g": 0
                },
                {
                    "id": "1161",
                    "demand_plan": "1492",
                    "batch": "5",
                    "location_type": "3",
                    "country": "1",
                    "sku": "3719",
                    "store": "148",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 5,
                    "a": 0,
                    "b": 0,
                    "c": 0,
                    "d": 0,
                    "e": 0,
                    "f": 0,
                    "g": 0
                },
                {
                    "id": "1162",
                    "demand_plan": "1577",
                    "batch": "5",
                    "location_type": "3",
                    "country": "1",
                    "sku": "3719",
                    "store": "151",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 55,
                    "a": 0,
                    "b": 0,
                    "c": 0,
                    "d": 0,
                    "e": 0,
                    "f": 0,
                    "g": 0
                },
                {
                    "id": "1163",
                    "demand_plan": "1679",
                    "batch": "5",
                    "location_type": "1",
                    "country": "2",
                    "sku": "3719",
                    "store": "159",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 26,
                    "a": 0,
                    "b": 0,
                    "c": 0,
                    "d": 0,
                    "e": 0,
                    "f": 26,
                    "g": 0
                },
                {
                    "id": "1164",
                    "demand_plan": "1680",
                    "batch": "5",
                    "location_type": "1",
                    "country": "2",
                    "sku": "3719",
                    "store": "159",
                    "date": "2026-04-30",
                    "salesman": "426",
                    "receipt_time": "2026-04-30",
                    "new_old": "2",
                    "sku_level": "1",
                    "inventory_status": "3",
                    "sum": 4,
                    "a": 0,
                    "b": 0,
                    "c": 0,
                    "d": 0,
                    "e": 0,
                    "f": 4,
                    "g": 0
                }
            ]
            var ratio = 189 / 259;
            var tempArray = [];
            for (var i = 0; i < details.length; i++) {
                tempArray.push(details[i].sum)
            }
            var splitData = splitRegions(tempArray, 189, 259);
            log.debug('splitData', splitData)
            var newDetails = [];
            var allocatedSum = 0; // 已分配的拆分数量

            for (var i = 0; i < details.length; i++) {
                var det = details[i];
                var newSum;
                if (i < details.length - 1) {
                    // 前N-1条明细：向下取整以确保不超额[7](@ref)
                    newSum = Math.floor(det.sum * ratio);
                } else {
                    // 最后一条明细：用减法处理尾差
                    newSum = 189 - allocatedSum;
                }
                allocatedSum += newSum;
                newDetails.push(newSum)
            }

            log.debug('newDetails', newDetails)
            var newDetails1 = [];

            for (var i = 0; i < details.length; i++) {
                var det = details[i];

                newDetails1.push(splitData[i])
            }
            log.debug('newDetails1', newDetails1)


            newDetails = [];
            var allocatedSum = 0; // 已分配的拆分数量

            // 处理每条明细
            for (var i = 0; i < details.length; i++) {
                var det = details[i];
                var newSum = splitData[i];
                // 处理五个区域数量的拆分
                var regionAllocated = 0;
                var regions = [det.a, det.b, det.c, det.d, det.e];
                var newRegions = [];
                if (det.location_type == '1' && det.country == '1') {//US-3PL的才需要分区
                    newRegions = splitRegions(regions, newSum, det.sum);
                    newDetails.push({
                        id: det.id,
                        origin: det,
                        newSum: newSum,
                        newA: newRegions[0] || 0,
                        newB: newRegions[1] || 0,
                        newC: newRegions[2] || 0,
                        newD: newRegions[3] || 0,
                        newE: newRegions[4] || 0,
                        newF: 0,
                        newG: 0
                    });
                } else if (det.location_type == '1' && det.country == '2') {//CA-3PL的需要拆分成加东加西
                    regions = [det.f, det.g];
                    newRegions = splitRegions(regions, newSum, det.sum);
                    newDetails.push({
                        id: det.id,
                        origin: det,
                        newSum: newSum,
                        newA: 0,
                        newB: 0,
                        newC: 0,
                        newD: 0,
                        newE: 0,
                        newF: newRegions[0] || 0,
                        newG: newRegions[1] || 0
                    });
                } else {
                    newDetails.push({
                        id: det.id,
                        origin: det,
                        newSum: newSum,
                        newA: 0,
                        newB: 0,
                        newC: 0,
                        newD: 0,
                        newE: 0,
                        newF: 0,
                        newG: 0
                    });
                }
            }
            log.debug('newDetails', newDetails)
            for (let index = 0; index < newDetails.length; index++) {
                const element = newDetails[index];
                log.debug('newDetails--'+index, element)
                
            }

            return []
            return data;
            search.create({
                type: "vendor",
                filters:
                    [
                        ["entityid", "is", '5 Wayfair_DeerValley_CA']//5 Wayfair_DeerValley_CA
                    ],
                columns:
                    [
                        search.createColumn({ name: "custentity_swc_payment_terms", label: "Terms" })
                    ]
            }).run().each(function (a) {
                log.debug('a', a)
                log.debug('a1', a.getValue('custentity_swc_payment_terms'))
                var terms = a.getValue('custentity_swc_payment_terms');
                if (terms) {
                    var termsArray = terms.split(',');
                    log.debug('termsArray', termsArray)
                } else {
                    log.debug('没有terms')
                }
                // newPo.setValue({ fieldId: 'custbody_swc_vendor_payment_terms', value: a.getValue('custentity_swc_payment_terms') });
                return false
            });
            return [];
            var mySearch = search.create({
                type: 'customrecord_swc_sales_forcast',//SKU映射表
                filters: [
                    { name: 'externalid', operator: search.Operator.ISNOTEMPTY },//给定测试条目 6482 4551
                    // { name: 'custrecord_swc_sf_sku', operator: search.Operator.ANYOF, values: ['1276'] },//给定测试条目 6482 4551
                    // { name: 'internalid', operator: search.Operator.ANYOF, values: ['61'] },//给定测试条目 6482 4551
                    { name: 'custentity_swc_plan_metrics', join: 'custrecord_swc_sf_store', operator: search.Operator.NONEOF, values: '@NONE@' },
                    // { name: 'custitem_swc_new_old', join: 'custrecord_swc_sf_sku', operator: search.Operator.IS, values: '2' }//产品是老品
                ],
                columns: [
                    { name: 'custentity_swc_plan_metrics', join: 'custrecord_swc_sf_store', summary: 'GROUP' },//备货维度
                    { name: 'custrecord_swc_sf_sku', summary: 'GROUP' },//SKU
                    // { name: 'custrecord_swc_sf_saleperson', summary: 'MAX' },//运营
                ]
            });
            var pageData = mySearch.runPaged({
                pageSize: 1000
            });
            log.debug('pageData', pageData);
            var totalCount = pageData.count; //总数
            log.debug('totalCount', totalCount);
            log.debug('pageData.pageRanges', pageData.pageRanges);
            var pageCount = pageData.pageRanges.length; //页数
            log.debug('pageCount', pageCount);
            var results = [];
            for (var i = 0; i < pageCount; i++) {
                log.debug('开始获取i页', i);
                pageData.fetch({
                    index: i
                }).data.forEach(function (rec) {
                    log.debug('rec', rec);
                    results.push({
                        sku: rec.getValue(rec.columns[1]),
                        store: rec.getValue(rec.columns[0]),
                        // salesperson: rec.getValue(rec.columns[2])
                    });
                    return true;
                })
            }
            return []
        }

        function splitRegions(regions, newSum, totalRegion) {

            // 计算每个区域按比例拆分的基础值
            var baseValues = [];
            var regionSum = 0;
            for (var j = 0; j < regions.length; j++) {
                // 如果该区域的原始数量为0，则基础值为0，不参与尾差分配
                if (regions[j] === 0) {
                    baseValues[j] = 0;
                } else {
                    // 按比例计算，向下取整
                    baseValues[j] = Math.floor(regions[j] * (newSum / totalRegion));
                }
                regionSum += baseValues[j];
            }

            var diff = newSum - regionSum; // 尾差

            // 创建一个数组，包含所有非零区域的索引，并按照小数部分从大到小排序
            var indices = [];
            for (var j = 0; j < regions.length; j++) {
                if (regions[j] !== 0) {
                    indices.push(j);
                }
            }

            // 计算每个区域比例的小数部分
            var decimals = [];
            for (var j = 0; j < indices.length; j++) {
                var idx = indices[j];
                decimals.push(regions[idx] * (newSum / totalRegion) - baseValues[idx]);
            }

            // 按照小数部分从大到小排序索引数组（仅非零区域）
            for (var j = 0; j < indices.length - 1; j++) {
                for (var k = j + 1; k < indices.length; k++) {
                    if (decimals[j] < decimals[k]) {
                        var temp = indices[j];
                        indices[j] = indices[k];
                        indices[k] = temp;
                        var tempDec = decimals[j];
                        decimals[j] = decimals[k];
                        decimals[k] = tempDec;
                    }
                }
            }

            // 将尾差分配给前diff个区域（每个区域加1）
            for (var j = 0; j < diff; j++) {
                var idx = indices[j];
                baseValues[idx] += 1;
            }

            // 现在baseValues数组就是拆分后五个区域的数量
            var newA = baseValues[0];
            var newB = baseValues[1];
            var newC = baseValues[2];
            var newD = baseValues[3];
            var newE = baseValues[4];
            // 然后，将newA, newB, newC, newD, newE存储起来。
            return baseValues
            return [newA, newB, newC, newD, newE]


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
            log.debug('map', mapContext.value)
            log.debug('map has_error', has_error)
            log.debug('数据', ids)
            if (has_error) {
                return
            }
            ids.push(mapContext.value)

            if (mapContext.value == '5') {
                has_error = true
                mapContext.write(
                    {
                        key: 'ids',
                        value: ids
                    }
                )
                throw '出错了'
            }
            // try {
            //     log.debug('map', mapContext.value)
            //     ids.push(mapContext.value)
            //     mapContext.write(
            //         {
            //             key: 'id',
            //             value: mapContext.value
            //         }
            //     )
            //     if (mapContext.value == '5') {
            //         throw '出错了'
            //     }
            // } catch (error) {
            //     log.debug('删除数据', ids)
            //     throw '删除完故意中断'
            // }

            // var rec = record.create({ type: 'customrecord_gfw_test' })
            // rec.setValue({ fieldId: 'name', value: mapContext.value });
            // rec.save()
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
            log.debug('has_error', has_error)
            log.debug('ids', ids)
            log.debug('reduceContext', reduceContext)
            log.debug('reduceContext.values', reduceContext.values)
            log.debug('reduceContext.values', JSON.parse(reduceContext.values))

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
            log.debug('summaryContext.output', summaryContext.output)
        }

        return { getInputData, map, reduce, summarize }

    });
