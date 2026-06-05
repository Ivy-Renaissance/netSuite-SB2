/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/format', 'N/error', 'N/runtime', 'N/search', 'N/record', '../common/SWC_CONFIG_DATA', '../common/moment','N/currency'],
    function(format, error, runtime, search, record,SWC_CONFIG_DATA,moment,currency) {

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
            var location = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_tplrentel_hwcckdm' });
            var par_sku = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_tplrentel_sku' });
            var jfsdata = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_tplrentel_jfsdata' });
            var jfedata = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_tplrentel_jfedata' });
            var id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_tplrentel_id' });

            //币种检索
            var currencyObj = searchCurrency();
            log.debug('currencyObj',currencyObj);
            var needData = getNeedData(currencyObj,location,par_sku,jfsdata,jfedata,id);
            log.debug('needData',needData);
            
            if (!needData || Object.keys(needData).length === 0) {
                log.error('无需处理数据');
                return;
            }
            return needData
        };

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
            let key = mapContext.key;
            let value = JSON.parse(mapContext.value);
            try {
                //sku匹配
                var nsitem,locationData,piciData,numberObj;
                if (value.whCode && value.sku) {
                    nsitem = searchSku(value.whCode,value.sku);
                    if (!nsitem) {
                        record.submitFields({
                            type: 'customrecord_swc_tpl_rental_fee',
                            id: key,
                            values: {
                                "custrecord_tpl_rental_fee_errormsg":'【三方仓产品配对信息】表无对应ns货品，请检查'
                            }
                        });
                        throw new Error('【三方仓产品配对信息】表无对应ns货品，请检查');
                    }
                } else {
                    record.submitFields({
                        type: 'customrecord_swc_tpl_rental_fee',
                        id: key,
                        values: {
                            "custrecord_tpl_rental_fee_errormsg":'【3PL预估仓租费】表货品或服务商信息为空，请检查'
                        }
                    });
                    throw new Error('【3PL预估仓租费】表货品或服务商信息为空，请检查');
                }

                //地点匹配
                //服务商 value.service
                //海外仓仓库代码 value.whCode
                //仓库归属 value.ckType
                locationData = searchLocation(value.whCode,value.ckType,value.service);
                if (locationData.length <= 0) {
                    record.submitFields({
                        type: 'customrecord_swc_tpl_rental_fee',
                        id: key,
                        values: {
                            "custrecord_tpl_rental_fee_errormsg":'【地点】表无对应数据，请检查'
                        }
                    });
                    throw new Error('【地点】表无对应数据，请检查');
                }



                //IR/IA单获取
                //货品 nsitem
                //地点 locationData
                //入库单号 value.order
                //是否是CG cgflag
                var cgflag = false;
                if (value.whCode == 'CG') {
                    cgflag = true;
                }
                piciData = searchPici(nsitem,locationData,value.order,cgflag,key);

                if (piciData.length <= 0) {
                    record.submitFields({
                        type: 'customrecord_swc_tpl_rental_fee',
                        id: key,
                        values: {
                            "custrecord_tpl_rental_fee_errormsg":'【库存调整】和【货品收据】表无对应数据，请检查'
                        }
                    });
                    throw new Error('【库存调整】和【货品收据】表无对应数据，请检查');
                }

                //数量获取
                numberObj = searchNumber(nsitem,locationData,piciData);

                if (Object.keys(numberObj).length <= 0) {
                    record.submitFields({
                        type: 'customrecord_swc_tpl_rental_fee',
                        id: key,
                        values: {
                            "custrecord_tpl_rental_fee_errormsg":'【库存】无数量，请检查'
                        }
                    });
                    throw new Error('【库存】无数量，请检查');
                }

                // 将对象转换为数组，保留键名以便后续还原
                var items = Object.keys(numberObj).map(key => ({
                    key: key,
                    ...numberObj[key]
                }));

                // 计算总数量
                var totalQty = items.reduce((sum, item) => sum + Number(item.quantity), 0);

                if (totalQty === 0) {
                    // 如果总数量为0，所有对象的 allocatedAmount 设为0
                    items.forEach(item => item.allocatedAmount = 0);
                } else {
                    var allocatedSum = 0;
                    for (var i = 0; i < items.length; i++) {
                        var item = items[i];

                        if (i === items.length - 1) {
                            // 最后一个对象，用总额减去已分配的总和，确保总和等于 amount
                            item.allocatedAmount = value.amount - allocatedSum;
                        } else {
                            // 按比例计算，四舍五入保留两位小数
                            var raw = value.amount * item.quantity / totalQty;

                            item.allocatedAmount = Math.round(raw * 100) / 100;

                            allocatedSum += item.allocatedAmount;
                        }
                    }
                }

                // 将分配结果写回原对象
                items.forEach(item => {
                    numberObj[item.key].allocatedAmount = item.allocatedAmount;
                });

                // 将flag设置为true
                record.submitFields({
                    type: 'customrecord_swc_tpl_rental_fee',
                    id: key,
                    values: {
                        "custrecord_tpl_rental_fee_flag": true
                    }
                });

                for (let reKey in numberObj) {
                    var reValue = numberObj[reKey];
                    reValue.custrecord_swc_ewh_fee_day_number = value.order;//入库单号
                    reValue.custrecord_swc_ewh_fee_day_sku = nsitem;//货品
                    reValue.custrecord_swc_ewh_fee_day_currency = value.currency;//币种
                    reValue.custrecordcustrecord_swc_warehouse_code = value.whCode;//海外仓仓库代码

                    reValue.custrecord_swc_ewh_fee_day_in_date = value.rkdate;//入库日期
                    reValue.custrecord_swc_ewh_fee_day_date = value.jfDate;//计费日期
                    reValue.currencytext = value.currencytext;//原币种

                    reValue.id = key;//原单据ID


                    mapContext.write({key: key + '_' + reKey, value: reValue});
                }

            } catch (e) {
                log.error('error',e.message);
            }
        };

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
            var key = reduceContext.key;
            var valuesArr = JSON.parse(reduceContext.values);
            try {

                var rec = record.create({
                    type: 'customrecord_swc_ewh_fee_day',
                    isDynamic: true
                });

                //仓库
                rec.setValue({
                    fieldId: 'custrecord_swc_ewh_fee_day_warehouse',
                    value: valuesArr.location
                });

                //批次
                rec.setValue({
                    fieldId: 'custrecord_swc_ewh_fee_day_lot',
                    value: valuesArr.inventorynumber
                });
                //入库单号
                rec.setValue({
                    fieldId: 'custrecord_swc_ewh_fee_day_number',
                    value: valuesArr.custrecord_swc_ewh_fee_day_number
                });
                //海外仓仓库代码
                rec.setText({
                    fieldId: 'custrecordcustrecord_swc_warehouse_code',
                    text: valuesArr.custrecordcustrecord_swc_warehouse_code
                });
                //入库日期
                rec.setText({
                    fieldId: 'custrecord_swc_ewh_fee_day_in_date',
                    text: valuesArr.custrecord_swc_ewh_fee_day_in_date
                });
                //计费日期
                rec.setText({
                    fieldId: 'custrecord_swc_ewh_fee_day_date',
                    text: valuesArr.custrecord_swc_ewh_fee_day_date
                });
                //数量
                rec.setValue({
                    fieldId: 'custrecord_swc_ewh_fee_day_quantity',
                    value: valuesArr.quantity
                });
                //货品
                rec.setValue({
                    fieldId: 'custrecord_swc_ewh_fee_day_sku',
                    value: valuesArr.custrecord_swc_ewh_fee_day_sku
                });
                //币种处理
                var sub = rec.getValue('custrecord_swc_ewh_fee_day_subsidiary');
                var subRec = record.load({
                    type: 'subsidiary',
                    id: sub
                });
                var currency_ben = subRec.getValue({
                    fieldId: 'currency'
                });
                var currency_bent = subRec.getText({
                    fieldId: 'currency'
                });

                var currency_or = valuesArr.currencytext;
                if (currency_bent && currency_or) {
                    var rate = currency.exchangeRate({
                        source: currency_or,
                        target: currency_bent,
                        date: new Date(valuesArr.custrecord_swc_ewh_fee_day_date)
                    });
                    log.audit('rate',rate);
                    rec.setValue('custrecord_swc_ewh_fee_day_currency', currency_ben);//本币
                    rec.setValue('custrecord_swc_ewh_fee_day_rate_or', rate);//汇率
                    rec.setValue('custrecord_swc_ewh_fee_day_fee', rate * valuesArr.allocatedAmount);//仓租费 本币
                }

                //仓租费
                rec.setValue({
                    fieldId: 'custrecord_swc_ewh_fee_day_fee_or',
                    value: valuesArr.allocatedAmount
                });
                //币种
                rec.setValue({
                    fieldId: 'custrecord_swc_ewh_fee_day_currency_or',
                    value: valuesArr.custrecord_swc_ewh_fee_day_currency
                });
                var recId = rec.save();
                log.debug('recId',recId);
            } catch (e) {
                log.error('error',e.message)
            }
        };

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

        };

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

        //searchname: 预估仓储日记录 3PL预估仓租费数据检索
        function getNeedData(currencyObj,location,par_sku,jfsdata,jfedata,id) {
            var filter = [
                ['custrecord_tpl_rental_fee_flag', 'is', 'F']
            ];
            if (location) {
                filter.push('AND');
                filter.push(['custrecord_tpl_rental_fee_jtck', 'is', location]);
            }
            if (par_sku) {
                filter.push('AND');
                filter.push(['custrecord_tpl_rental_fee_sku', 'is', par_sku]);
            }
            //开始日期
            if (jfsdata) {
                jfsdata = moment.utc(jfsdata).startOf('day').toISOString().substring(0, 10);
                filter.push("AND");
                filter.push(["custrecord_tpl_rental_fee_jfdate","onorafter",jfsdata]);
            }
            //结束日期
            if (jfedata) {
                jfedata = moment.utc(jfedata).startOf('day').toISOString().substring(0, 10);
                filter.push("AND");
                filter.push(["custrecord_tpl_rental_fee_jfdate","onorbefore",jfedata]);
            }
            //内部ID
            if (id) {
                filter.push("AND");
                filter.push(["internalid","anyof",id]);
            }
            const customrecord_swc_tpl_rental_feeSearchObj = search.create({
                type: 'customrecord_swc_tpl_rental_fee',
                filters:
                filter,
                columns:
                    [
                        search.createColumn({name: 'custrecord_tpl_rental_fee_sku', label: 'SKU'}),
                        search.createColumn({name: 'custrecord_tpl_rental_fee_ckgs', label: '仓库归属'}),
                        search.createColumn({name: 'custrecord_tpl_rental_fee_jtck', label: '具体仓库'}),
                        search.createColumn({name: 'custrecord_tpl_rental_fee_order', label: '入库单号'}),
                        search.createColumn({name: 'custrecord_tpl_rental_fee_rkdate', label: '入库日期'}),
                        search.createColumn({name: 'custrecord_tpl_rental_fee_jfdate', label: '计费日期'}),
                        search.createColumn({name: 'custrecord_tpl_rental_fee_amount', label: '计费金额'}),
                        search.createColumn({name: 'custrecord_tpl_rental_fee_currency', label: '币种'}),
                        search.createColumn({name: 'custrecord_tpl_rental_fee_errormsg', label: '错误原因'}),
                        search.createColumn({name: "custrecord_tpl_rental_fee_service", label: "服务商"})
                    ],
            });

            let results = getAllResultsByPage({searchObj: customrecord_swc_tpl_rental_feeSearchObj}).results;//检索方法;

            let obj = {};
            results.forEach(value => {
                var id = value.id;
                var sku = value.getValue({name: 'custrecord_tpl_rental_fee_sku', label: 'SKU'});
                var ckType = value.getValue({name: 'custrecord_tpl_rental_fee_ckgs', label: '仓库归属'});
                var whCode = value.getValue({name: 'custrecord_tpl_rental_fee_jtck', label: '具体仓库'});
                var order = value.getValue({name: 'custrecord_tpl_rental_fee_order', label: '入库单号'});
                var rkdate = value.getValue({name: 'custrecord_tpl_rental_fee_rkdate', label: '入库日期'});
                var jfDate = value.getValue({name: 'custrecord_tpl_rental_fee_jfdate', label: '计费日期'});
                var amount = value.getValue({name: 'custrecord_tpl_rental_fee_amount', label: '计费金额'});
                var currency = value.getValue({name: 'custrecord_tpl_rental_fee_currency', label: '币种'});
                var service = value.getValue({name: "custrecord_tpl_rental_fee_service", label: "服务商"});
                var currencyText = value.getValue({name: 'custrecord_tpl_rental_fee_currency', label: '币种'});

                if (currency in currencyObj) {
                    currency = currencyObj[currency];
                }

                obj[id] = {
                    'sku': sku,
                    'ckType': ckType,
                    'whCode': whCode,
                    'order': order,
                    'rkdate': rkdate,
                    'jfDate': jfDate,
                    'amount': amount,
                    'currency': currency,
                    'service': service,
                    'currencytext': currencyText
                }
            });

            return obj
        }

        function searchSku(whCode,itemId) {
            var skuId;
            search.create({
                type: "customrecord_swc_thirdproduct_mapping",
                filters:
                    [
                        ["custrecord_swc_tp_sku_map_thirdsku","is",itemId],
                        "AND",
                        ["custrecord_swc_tp_sku_map_warehousecode","is",whCode]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_3pl_item", label: "货品"}),
                        search.createColumn({name: "internalid", label: "内部 ID",sort: search.Sort.DESC})
                    ]
            }).run().each(function (rec) {
                skuId = rec.getValue({name: "custrecord_swc_3pl_item", label: "货品"});
            });
            return skuId
        }

        function searchLocation(whCode,ckType,service) {
            const locationSearchObj = search.create({
                type: "location",
                filters:
                    [
                        ["custrecord_swc_warehouse_code.name","is",whCode],
                        "AND",
                        ["custrecord_swc_location_type","anyof",SWC_CONFIG_DATA.configData().s_cktype_3pl,SWC_CONFIG_DATA.configData().s_cltype_cg],
                        "AND",
                        ["custrecord_swc_location_attribute","anyof",SWC_CONFIG_DATA.configData().s_attribute_ptc,SWC_CONFIG_DATA.configData().s_attribute_hwc],
                        "AND",
                        ["isinactive","is","F"]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "name", label: "名称"}),
                    ]
            });

            let results = getAllResultsByPage({searchObj: locationSearchObj}).results;//检索方法;

            let data = [];
            results.forEach(value => {
                var id = value.id;
                var location = value.getValue({name: "internalid", label: "内部 ID"});

                data.push(location);
            });

            return data
        }

        function searchPici(item,locationData,order,flag,key) {
            var filter = ["custbody_swc_main_num","is",order];
            if (flag) {
                filter = ["custbody_swc_main_detail_num","is",order];
            }
            const transactionSearchObj = search.create({
                type: "transaction",
                title: "仓储预估 批次检索" + new Date(),
                settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","InvAdjst","ItemRcpt"],
                        "AND",
                        ["item","anyof",item],
                        "AND",
                        ["location","anyof",locationData],
                        "AND",
                        ["mainline","is","F"],
                        "AND",
                        filter
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "inventorynumber",
                            join: "inventoryDetail",
                            label: " 编号"
                        }),
                        search.createColumn({
                            name: "internalid",
                            join: "inventoryDetail",
                            label: "内部 ID"
                        })
                    ]
            });


            let results = getAllResultsByPage({searchObj: transactionSearchObj}).results;//检索方法;

            let data = [];
            results.forEach(value => {
                var id = value.id;
                var location = value.getValue({
                    name: "inventorynumber",
                    join: "inventoryDetail",
                    label: " 编号"
                });

                data.push(location);
            });

            return data
        }

        function searchNumber(item,locationData,piciData) {

            const inventorybalanceSearchObj = search.create({
                type: "inventorybalance",
                title: '库存数量 检索' + new Date(),
                filters:
                    [
                        ["item","anyof",item],
                        "AND",
                        ["location","anyof",locationData],
                        "AND",
                        ["inventorynumber.internalid","anyof",piciData]
                    ],
                columns:
                    [
                        search.createColumn({name: "item", label: "货品"}),
                        search.createColumn({name: "location", label: "地点"}),
                        search.createColumn({name: "inventorynumber", label: "库存编号"}),
                        search.createColumn({name: "available", label: "可用"}),
                        search.createColumn({name: "onhand", label: "现有"}),
                        search.createColumn({
                            name: "subsidiary",
                            join: "location",
                            label: "子公司"
                        }),
                        search.createColumn({
                            name: "inventorynumber",
                            join: "inventoryNumber",
                            label: "编号"
                        })
                    ]
            });

            let results = getAllResultsByPage({searchObj: inventorybalanceSearchObj}).results;//检索方法;

            let obj = {};
            results.forEach(value => {
                var inventorynumber = value.getValue({
                    name: "inventorynumber",
                    join: "inventoryNumber",
                    label: "编号"
                });
                var quantity = value.getValue({name: "onhand", label: "现有"});
                var location = value.getValue({name: "location", label: "地点"});
                var sub = value.getValue({
                    name: "subsidiary",
                    join: "location",
                    label: "子公司"
                });

                let key = location + '_' + inventorynumber + '_' + sub;

                obj[key] = {
                    "inventorynumber": inventorynumber,
                    "quantity": quantity,
                    "location": location,
                    "sub": sub
                }
            });

            return obj
        }

        function  searchCurrency() {
            const currencySearchObj = search.create({
                type: "currency",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "name", label: "名称"}),
                        search.createColumn({name: "symbol", label: "符号"})
                    ]
            });

            let data = {};
            currencySearchObj.run().each(function(result){
                var symbol = result.getValue({name: "symbol", label: "符号"});
                data[symbol] = result.id;
                // .run().each has a limit of 4,000 results
                return true;
            });

            return data
        }

        return {getInputData, map, reduce, summarize};

    });