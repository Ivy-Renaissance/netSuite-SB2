/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/currency', 'N/record', 'N/runtime', 'N/search'],
    (currency, record, runtime, search) => {
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
            var startData = runtime.getCurrentScript().getParameter({name: 'custscript_V2_startData'});
            var endData = runtime.getCurrentScript().getParameter({name: 'custscript_V2_endData'});

            startData = normalizeToYMD(startData);
            endData = normalizeToYMD(endData);
            var needData = getNeedData(startData,endData);
            if (Object.keys(needData).length == 0) return;
            return needData
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
                let key = mapContext.key;
                let value = JSON.parse(mapContext.value);
                let customer;
                if (value.marketid) {
                    customer = getCustomer(value.marketid);
                }

                if (customer) {
                    record.submitFields({
                        type: 'customrecord_swc_amazon_v2',
                        id: key,
                        values: {
                            'custrecord_swc_amzv2_customer': customer,//店铺
                        },
                    });
                } else {
                    record.submitFields({
                        type: 'customrecord_swc_amazon_v2',
                        id: key,
                        values: {
                            'custrecord_swc_amzv2_customer': '',//店铺
                        },
                    });
                }
            } catch (e) {
                log.error('error',e.message);
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

        function getNeedData(startData,endData) {
            var filter = [
                ["custrecord_swc_amzv2_marketid","isnotempty",""],
                "AND",
                ["custrecord_swc_amzv2_customer","anyof","@NONE@"]
            ];
            if (startData) {
                filter.push('AND');
                filter.push(["custrecord_swc_amzv2_creat_date","onorafter",startData]);
            }
            if (endData) {
                filter.push('AND');
                filter.push(["custrecord_swc_amzv2_creat_date","onorbefore",endData]);
            }
            log.audit('filter',filter);
            const customrecord_swc_amazon_v2SearchObj = search.create({
                type: "customrecord_swc_amazon_v2",
                title: '亚马逊V2数据检索 sun1' + new Date(),
                filters:
                filter,
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "custrecord_swc_amzv2_marketid", label: "站点ID"})
                    ]
            });

            // var searchID = customrecord_swc_amazon_v2SearchObj.save();
            // log.audit('searchID',searchID);

            // let results = getAllResultsByPage({searchObj: customrecord_swc_amazon_v2SearchObj}).results;//检索方法;

            var results = getAllResults(customrecord_swc_amazon_v2SearchObj);

            log.audit('results',results);

            let obj = {};
            results.forEach(value => {
                obj[value.id] = {
                    'marketid': value.getValue({name: "custrecord_swc_amzv2_marketid", label: "站点ID"})
                };
            })

            return obj
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

        function getAllResults(srch) {
            let results = srch.run();
            let searchResults = [];
            let searchid = 0;
            let resultslice;
            do {
                resultslice = results.getRange({
                    start: searchid,
                    end: searchid + 1000
                });
                log.audit('resultslice',resultslice);
                resultslice.forEach(function (slice) {
                    searchResults.push(slice);
                    searchid++;
                });

            } while (resultslice.length >= 1000);
            return searchResults;
        }

        /**
         * 按页抓取全量数据
         * @param options
         * @return {{pageRanges: [], totalPages: number, totalCount: number, results: []}}
         */
        function getAllResultsByPage(options) {
            //获取全部result的时候，每次抓取的条数
            const STEP = 1000;
            var data = {
                results: [],
                totalCount:0,
                pageRanges:[],
                totalPages:0
            };
            //不存储results[],以便节约空间
            var donotStoreResults = options.donotStoreResults;

            var searchObj = options.searchObj;
            var pagedData = searchObj.runPaged({pageSize: STEP});
            //记录总条数
            data.totalCount = pagedData.count;
            //如果没有结果，则直接返回
            if(!pagedData.count){
                return data;
            }
            data.pageRanges = pagedData.pageRanges;
            var totalPages = data.totalPages = data.pageRanges.length;
            var startPage = Number(options.startPage||0);
            var endPage = totalPages;
            //从startPage开始取N页
            if(options.pageCount){
                endPage = Math.min(totalPages,startPage + Number(options.pageCount));
            }

            for(var i =startPage;i<endPage;i++){
                //抓取指定页
                var page = pagedData.fetch({index: i});
                var results = page.data;
                if (results && results.length) {
                    if(!donotStoreResults){
                        data.results = data.results.concat(results);
                    }
                    //针对每条result 调用回调函数
                    var cb = options.cb;
                    results.forEach(function (result, index) {
                        if (util.isFunction(cb)) {
                            cb(result, index);
                        }
                    });
                }
            }

            return data;
        }

        function getCustomer(marketid) {
            const customerSearchObj = search.create({
                type: "customer",
                filters:
                    [
                        ["custentity_swc_jj_marketid","is",marketid]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });
            var customer;
            customerSearchObj.run().each(function(result){
                customer = result.getValue({name: "internalid", label: "内部 ID"});
                return true;
            });

            return customer
        }

        /**
         * 将任意合法日期字符串转换为 yyyy-mm-dd 格式
         * @param {string} dateStr - 输入的日期字符串（如 '2026/4/7', '04/07/2026', '20260407'）
         * @returns {string} - 格式化后的 yyyy-mm-dd 字符串，若无效则返回空字符串
         */
        function normalizeToYMD(dateStr) {
            if (!dateStr) return '';

            // 已经是 yyyy-mm-dd 格式（严格两位月日）
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return dateStr;
            }

            // 尝试解析为 Date 对象
            let date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                log.warn('Invalid date', dateStr);
                return '';
            }

            // 提取年、月、日并补零
            let year = date.getFullYear();
            let month = String(date.getMonth() + 1).padStart(2, '0');
            let day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        return {getInputData, map, reduce, summarize}

    });
