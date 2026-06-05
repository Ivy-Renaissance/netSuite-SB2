/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search','N/runtime', '../common/SWC_CONFIG_DATA'],
    (record, search,runtime,SWC_CONFIG_DATA) => {
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
            var location = runtime.getCurrentScript().getParameter({ name: 'custscript_ws_fee_location' });
            var data = getNeedData(location);

            if (!data || Object.keys(data).length === 0) {
                log.error('无需处理数据');
                return;
            }
            log.audit('data',data);
            return data
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
                log.audit('value',value);
                let date = value.date;

                //仓库
                let code = value.code;
                let locationData = [];
                locationData = searchLocation(code);
                log.audit('locationData',locationData);


                let curdate1 = value.curdate1,curdate2 = value.curdate2;
                // if (date) {
                //     let parts = date.split('-');
                //     let year = parseInt(parts[0], 10);
                //     let month = parseInt(parts[1], 10) - 1; // 转为0-11
                //     let prevYear, prevMonth;
                //     if (month === 0) {
                //         prevYear = year - 1;
                //         prevMonth = 11;
                //     } else {
                //         prevYear = year;
                //         prevMonth = month - 1;
                //     }
                //     curdate1 = prevYear + '-' + String(prevMonth + 1).padStart(2, '0') + '-01';
                //     curdate2 = year + '-' + String(month + 1).padStart(2, '0') + '-01';
                // }


                // var toData = searchToIdData(value.inputno);
                // if (value.inputno) {
                // log.audit('toData',toData);
                // var toIdData = searchToId(toData);
                // log.audit('toIdData',toIdData);

                var cgflag = false;
                if (code == 'CG') {
                    cgflag = true;
                }
                if (!curdate1 || !curdate2) {
                    record.submitFields({
                        type: 'customrecord_swc_lastmile_fees_details',
                        id: key,
                        values: {
                            "custrecord_swc_lastmile_cbcyerror":'无对应开始日期和结束日期'
                        }
                    });
                    throw new Error('无对应开始日期和结束日期');
                }
                var itemDetail = [];
                var detailObj;
                if (value.inputno) {
                    itemDetail = searchPici(value.sku, locationData, value.inputno, cgflag);
                    // var itemDetail = searchToDetail(toIdData,value.sku,value.location);
                    log.audit('itemDetail', itemDetail);
                    log.audit('curdate1', curdate1);
                    log.audit('curdate2', curdate2);
                } else {
                    record.submitFields({
                        type: 'customrecord_swc_lastmile_fees_details',
                        id: key,
                        values: {
                            "custrecord_swc_lastmile_cbcyerror":'尾程费用_出入库单号 为空'
                        }
                    });
                    throw new Error('尾程费用_出入库单号 为空');
                }
                if (itemDetail.length > 0) {
                    detailObj = searchAmount(itemDetail, value, curdate1, curdate2, locationData);
                    log.audit('detailObj', detailObj);
                } else {
                    detailObj = searchAmount(null, value, curdate1, curdate2, null,value.sku,code);
                }


                if (detailObj.batches.length > 0) {
                    if (value.amount !== 0 && detailObj.totalAmount !== 0) {
                        var cyAmount = value.amount - detailObj.totalAmount;
                        log.audit('cyAmount',cyAmount);
                        if (cyAmount != 0) {
                            var batches = detailObj.batches;
                            var flag1 = false;
                            var returnData = [];
                            returnData = search1(value.sku,locationData,batches);
                            log.audit('returnData1',returnData);

                            //判断 该货品该批次是否有数量
                            if (returnData.length == 0) {
                                returnData = search1(value.sku,locationData,null);
                                log.audit('returnData2',returnData);

                                if (returnData.length == 0) {
                                    var itemRec = record.load({
                                        type: 'item',
                                        id: value.sku,
                                    });
                                    var xl = itemRec.getValue({
                                        fieldId: 'custitem_swc_sjlm'
                                    });
                                    var zl = itemRec.getValue({
                                        fieldId: 'custitem_swc_ejlm'
                                    });
                                    var dl = itemRec.getValue({
                                        fieldId: 'custitem_swc_yjlm'
                                    });
                                    returnData = search2(value.sku,locationData,xl,null,null);
                                    log.audit('returnData3',returnData);
                                    if (returnData.length == 0) {
                                        returnData = search2(value.sku,locationData,null,zl,null);
                                        log.audit('returnData4',returnData);
                                        if (returnData.length == 0) {
                                            returnData = search2(value.sku,locationData,null,null,dl);
                                            log.audit('returnData5',returnData);
                                        }
                                    }
                                    flag1 = true;
                                }
                            }

                            //子公司:value.company 地点:data中 币种:value.currency 货品:value.sku 批次:data中 金额:需要根据data中数量进行分摊 数量:data中 入库单号:value.inputno

                            log.audit('returnData',returnData);
                            if (returnData.length > 0) {
                                record.submitFields({
                                    type: 'customrecord_swc_lastmile_fees_details',
                                    id: key,
                                    values: {
                                        'custrecord_swc_lastmile_cyflag': true,
                                    },
                                });
                                // 计算总数量
                                let totalQty = 0;
                                for (let item of returnData) {
                                    totalQty += Number(item.quantity);
                                }

                                let remainingAmount = cyAmount;          // 待分摊总金额
                                let allocatedAmount = 0;                // 已分摊累计金额

                                for (let i = 0; i < returnData.length; i++) {
                                    let batch = returnData[i];
                                    let batchQty =  Number(batch.quantity);
                                    let batchAmount;

                                    if (i === returnData.length - 1) {
                                        // 最后一个批次：用剩余金额补齐尾差
                                        batchAmount = round(remainingAmount, 2);
                                    } else {
                                        // 按数量比例计算分摊金额
                                        batchAmount = round(cyAmount * (batchQty / totalQty), 2);
                                        remainingAmount -= batchAmount;
                                        allocatedAmount += batchAmount;
                                    }

                                    let outputObj;
                                    if (flag1) {
                                        outputObj = {
                                            sub: value.company,           // 子公司
                                            location: batch.location,     // 地点ID
                                            currency: value.currency,     // 币种
                                            sku: batch.sku,               // 货品
                                            batch: batch.iniventory,      // 批次号
                                            ftAmount: batchAmount,        // 分摊后的仓租费
                                            quantity: batchQty,           // 该批次数量
                                            inputno: value.inputno,        // 入库单号
                                            mainid: value.mainid,
                                            curdate: value.curdate
                                        };
                                    } else {
                                        outputObj = {
                                            sub: value.company,           // 子公司
                                            location: batch.location,     // 地点ID
                                            currency: value.currency,     // 币种
                                            sku: value.sku,               // 货品
                                            batch: batch.iniventory,      // 批次号
                                            ftAmount: batchAmount,        // 分摊后的仓租费
                                            quantity: batchQty,           // 该批次数量
                                            inputno: value.inputno,        // 入库单号
                                            mainid: value.mainid,
                                            curdate: value.curdate
                                        };
                                    }

                                    log.audit('outputObj',outputObj);

                                    // 发送给 reduce 阶段处理（key 可自定义，这里用批次号）
                                    mapContext.write({
                                        key: key + i,
                                        value: JSON.stringify(outputObj)
                                    });
                                }
                            } else {
                                record.submitFields({
                                    type: 'customrecord_swc_lastmile_fees_details',
                                    id: key,
                                    values: {
                                        "custrecord_swc_lastmile_cbcyerror":'可分摊数量为0'
                                    }
                                });
                                throw new Error('可分摊数量为0');
                            }
                        }

                    } else {
                        record.submitFields({
                            type: 'customrecord_swc_lastmile_fees_details',
                            id: key,
                            values: {
                                "custrecord_swc_lastmile_cbcyerror":'可分摊金额为0'
                            }
                        });
                        throw new Error('可分摊金额为0');
                    }
                } else {
                    record.submitFields({
                        type: 'customrecord_swc_lastmile_fees_details',
                        id: key,
                        values: {
                            "custrecord_swc_lastmile_cbcyerror":'查询不到批次信息，请检查'
                        }
                    });
                    throw new Error('查询不到批次信息，请检查');
                }
                // } else {
                //     record.submitFields({
                //         type: 'customrecord_swc_lastmile_fees_details',
                //         id: key,
                //         values: {
                //             "custrecord_swc_lastmile_cbcyerror":'尾程费用_出入库单号 为空'
                //         }
                //     });
                //     throw new Error('尾程费用_出入库单号 为空');
                // }


            } catch (e) {
                log.error('error',e.message)
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
            var value = JSON.parse(reduceContext.values);
            var rec = record.create({
                type: 'customrecord_swc_ewh_fee_day',
                isDynamic: true
            });
            rec.setValue({
                fieldId: 'custrecord_swc_ewh_fee_day_subsidiary',
                value: value.sub
            });

            rec.setValue({
                fieldId: 'custrecord_swc_ewh_fee_day_warehouse',
                value: value.location
            });

            if (value.currency) rec.setValue({
                fieldId: 'custrecord_swc_ewh_fee_day_currency',
                value: value.currency
            });

            rec.setValue({
                fieldId: 'custrecord_swc_ewh_fee_day_sku',
                value: value.sku
            });

            rec.setValue({
                fieldId: 'custrecord_swc_ewh_fee_day_lot',
                value: value.batch
            });

            rec.setValue({
                fieldId: 'custrecord_swc_ewh_fee_day_fee',
                value: value.ftAmount
            });

            rec.setValue({
                fieldId: 'custrecord_swc_ewh_fee_day_cyquantity',
                value: value.quantity
            });

            rec.setValue({
                fieldId: 'custrecord_swc_ewh_fee_day_number',
                value: value.inputno
            });

            if (value.curdate) rec.setText({
                fieldId: 'custrecord_swc_ewh_fee_day_date',
                text: value.curdate
            });

            rec.setValue({
                fieldId: 'custrecord_swc_ewh_fee_day_type',
                value: '差异'
            });

            rec.setValue({
                fieldId: 'custrecord_swc_ewh_fee_day_wcmainid',
                value: value.mainid
            });

            var recId = rec.save();
            log.audit('recId',recId);

            //NVL({custrecord_swc_ewh_fee_day_fee},0)/NVL({custrecord_swc_ewh_fee_day_quantity},0)
            //NVL(NVL({custrecord_swc_ewh_fee_day_fee},0)/NVL({custrecord_swc_ewh_fee_day_quantity},0),0)
            //NVL(NVL({custrecord_swc_ewh_fee_day_fee},0)/NVL({custrecord_swc_ewh_fee_day_quantity},0), 0)
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

        function getNeedData(location) {

            var filter = [
                ["custrecord_swc_lastmile_receipt","isnotempty",""],
                "AND",
                ["custrecord_swc_lastmile_sku","noneof","@NONE@"],
                "AND",
                ["custrecord_swc_lastmile_amount2","isnotempty",""],
                // "AND",
                // ["custrecord_swc_lastmile_jfdate","isnotempty",""],
                // "AND",
                // ["custrecord_swc_lastmile_main.internalid","anyof","204"],
                "AND",
                ["custrecord_swc_lastmile_cyflag","is","F"],
                "AND",
                ["custrecord_swc_lastmile_main.custrecord_swc_lastmile_feetypes","anyof",SWC_CONFIG_DATA.configData().s_wclx_czfy],//仓租费用（实际-预估）
                // "AND",
                // ["internalid","anyof",438],
            ];
            if (location) {
                filter.push("AND");
                filter.push(["custrecord_swc_lastmile_place","startswith",location]);
            }
            const customrecord_swc_lastmile_fees_detailsSearchObj = search.create({
                type: "customrecord_swc_lastmile_fees_details",
                filters:
                filter,
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_lastmile_receipt", label: "尾程费用_入库单号"}),
                        search.createColumn({name: "custrecord_swc_lastmile_sku", label: "尾程费用_SKU"}),
                        search.createColumn({name: "custrecord_swc_lastmile_amount2", label: "尾程费用_实际金额"}),
                        search.createColumn({name: "custrecord_swc_lastmile_jfdate", label: "尾程费用_计费日期"}),
                        search.createColumn({name: "custrecord_swc_lastmile_main", label: "尾程各类费用"}),
                        search.createColumn({
                            name: "custrecord_swc_lastmile_company",
                            join: "CUSTRECORD_SWC_LASTMILE_MAIN",
                            label: "子公司"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_lastmile_currency",
                            join: "CUSTRECORD_SWC_LASTMILE_MAIN",
                            label: "货币"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_lastmile_place",
                            label: "海外仓仓库代码"
                        }),
                        // search.createColumn({name: "custrecordcustrecord_swc_warehouse_code", label: "海外仓仓库代码"}),
                        //custrecord_swc_lastmile_date1
                        search.createColumn({
                            name: "custrecord_swc_lastmile_date1",
                            join: "CUSTRECORD_SWC_LASTMILE_MAIN",
                            label: "开始日期"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_lastmile_date2",
                            join: "CUSTRECORD_SWC_LASTMILE_MAIN",
                            label: "结束日期"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_lastmile_date",
                            join: "CUSTRECORD_SWC_LASTMILE_MAIN",
                            label: "日期"
                        }),
                    ]
            });


            let results = getAllResultsByPage({searchObj: customrecord_swc_lastmile_fees_detailsSearchObj}).results;//检索方法;

            let obj = {};
            results.forEach(value => {
                var date = value.getValue({
                    name: "custrecord_swc_lastmile_date",
                    join: "CUSTRECORD_SWC_LASTMILE_MAIN",
                    label: "日期"
                });
                if (date) date = formatDateToYYYYMMDD(date);
                obj[value.id] = {
                    "inputno": value.getValue({name: "custrecord_swc_lastmile_receipt", label: "仓租费用_入库单号"}),
                    "sku": value.getValue({name: "custrecord_swc_lastmile_sku", label: "仓租费用_SKU"}),
                    "amount": value.getValue({name: "custrecord_swc_lastmile_amount2", label: "仓租费用_金额"}),
                    "date": value.getValue({name: "custrecord_swc_lastmile_jfdate", label: "仓租费用_计费日期"}),
                    "company": value.getValue({
                        name: "custrecord_swc_lastmile_company",
                        join: "CUSTRECORD_SWC_LASTMILE_MAIN",
                        label: "子公司"
                    }),
                    "currency": value.getValue({
                        name: "custrecord_swc_lastmile_currency",
                        join: "CUSTRECORD_SWC_LASTMILE_MAIN",
                        label: "货币"
                    }),
                    // "location": value.getValue({
                    //     name: "custrecord_swc_warehouse_place1",
                    //     join: "CUSTRECORD_SWC_WAREHOUSE_MAIN",
                    //     label: "实体仓库"
                    // }),
                    "code": value.getValue({
                        name: "custrecord_swc_lastmile_place",
                        label: "海外仓仓库代码"
                    }),
                    "curdate1":value.getValue({
                        name: "custrecord_swc_lastmile_date1",
                        join: "CUSTRECORD_SWC_LASTMILE_MAIN",
                        label: "开始日期"
                    }),
                    "curdate2":value.getValue({
                        name: "custrecord_swc_lastmile_date2",
                        join: "CUSTRECORD_SWC_LASTMILE_MAIN",
                        label: "结束日期"
                    }),
                    "curdate":date,
                    "mainid": value.getValue({name: "custrecord_swc_lastmile_main", label: "尾程各类费用"})
                };
            });

            return obj
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

        function searchToIdData(inputno) {
            const customrecord_swc_wl_plan_orderSearchObj = search.create({
                type: "customrecord_swc_wl_plan_order",
                filters:
                    [
                        ["custrecord_swc_hw_lc_number","startswith",inputno],
                        "AND",
                        ["formulatext: {custrecord_wl_tk_t_wl_id.custrecord_wl_tk_t_qg_t}","isnotempty",""]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custrecord_wl_tk_t_qg_t",
                            join: "CUSTRECORD_WL_TK_T_WL_ID",
                            label: "已清关单据"
                        })
                    ]
            });

            let results = getAllResultsByPage({searchObj: customrecord_swc_wl_plan_orderSearchObj}).results;//检索方法;

            let obj = [];
            results.forEach(value => {
                var result = value.getValue({
                    name: "custrecord_wl_tk_t_qg_t",
                    join: "CUSTRECORD_WL_TK_T_WL_ID",
                    label: "已清关单据"
                });
                log.audit('result',result);

                if (typeof result === 'string' && result.trim() !== '') {
                    var ids = result.split(',').map(function(id) {
                        return id.trim();
                    }).filter(function(id) {
                        return id !== '';
                    });

                    ids.forEach(function(id) {
                        obj.push(id);
                    });
                } else if (Array.isArray(result)) {
                    result.forEach(function(item) {
                        obj.push(item);
                    });
                } else if (result != null) {
                    obj.push(result);
                }
            });

            return obj
        }

        function searchPici(item,location,order,flag) {
            var filter = ["custbody_swc_main_num","startswith",order];
            if (flag) {
                filter = ["custbody_swc_main_detail_num","startswith",order];
            }
            const transactionSearchObj = search.create({
                type: "transaction",
                title: '批次检索 sun1' + new Date(),
                settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","InvAdjst","ItemRcpt"],
                        "AND",
                        ["item","anyof",item],
                        "AND",
                        ["location","anyof",location],
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

            // var searchID = transactionSearchObj.save();
            // log.audit('searchID',searchID);

            let results = getAllResultsByPage({searchObj: transactionSearchObj}).results;//检索方法;

            let data = [];
            results.forEach(value => {
                var id = value.id;
                var inventorynumber = value.getText({
                    name: "inventorynumber",
                    join: "inventoryDetail",
                    label: " 编号"
                });
                log.audit('inventorynumber',inventorynumber);

                data.push(inventorynumber);
            });

            return data
        }

        function searchToDetail(ids,sku,location) {

            const transferorderSearchObj = search.create({
                type: "transferorder",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","TrnfrOrd"],
                        "AND",
                        ["internalid","anyof",ids],
                        "AND",
                        ["item","anyof",sku],
                        "AND",
                        ["transferlocation","anyof", location],
                        "AND",
                        ["inventorydetail.inventorynumber","noneof","@NONE@"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "transferlocation",
                            summary: "GROUP",
                            label: "目标地点"
                        }),
                        search.createColumn({
                            name: "item",
                            join: "inventoryDetail",
                            summary: "GROUP",
                            label: "货品"
                        }),
                        search.createColumn({
                            name: "inventorynumber",
                            join: "inventoryDetail",
                            summary: "GROUP",
                            label: " 编号"
                        }),
                        search.createColumn({
                            name: "internalid",
                            summary: "GROUP",
                            label: "内部 ID"
                        })
                    ]
            });

            let results = getAllResultsByPage({searchObj: transferorderSearchObj}).results;//检索方法;

            let obj = {};
            let data = [];
            results.forEach(value => {
                obj.location = value.getValue({
                    name: "transferlocation",
                    summary: "GROUP",
                    label: "目标地点"
                })
                data.push(value.getText({
                    name: "inventorynumber",
                    join: "inventoryDetail",
                    summary: "GROUP",
                    label: " 编号"
                }));
            });

            obj.piciData = data;

            return obj
        }

        function searchAmount(itemDetail, value, curdate1, curdate2, locationData,wsku,code) {
            // var sub = value.company;
            // var currency = value.currency;
            // var inputno = value.inputno;
            if (itemDetail) {
                var sku = value.sku;
                var piciData = itemDetail;

                var filter = [];
                for (let i = 0; i < piciData.length; i++) {
                    filter.push(["custrecord_swc_ewh_fee_day_lot", "startswith", piciData[i]]);
                    if (i != piciData.length - 1) {
                        filter.push('AND');
                    }
                }

                var filters = [
                    ["custrecord_swc_ewh_fee_day_warehouse", "anyof", locationData],
                    "AND",
                    ["custrecord_swc_ewh_fee_day_sku", "anyof", sku],
                    "AND",
                    ["custrecord_swc_ewh_fee_day_type", "startswith", "预估"],
                ];
            } else {
                var sku = wsku;
                var filters = [
                    ["custrecordcustrecord_swc_warehouse_code", "anyof", code],
                    "AND",
                    ["custrecord_swc_ewh_fee_day_sku", "anyof", sku],
                    "AND",
                    ["custrecord_swc_ewh_fee_day_type", "startswith", "预估"],
                ];
            }

            if (curdate1 && curdate2){
                filters.push('AND');
                filters.push(["custrecord_swc_ewh_fee_day_date", "within", curdate1, curdate2]);
            }
            if (filter.length > 0) {
                filters.push('AND');
                filters.push(filter);
            }

            log.audit('filters',filters);

            // 构建搜索（原 filter 未实际使用，保留原逻辑）
            const customrecord_swc_ewh_fee_daySearchObj = search.create({
                type: "customrecord_swc_ewh_fee_day",
                title: '预估 检索1 sun' + new Date(),
                filters: filters,
                columns: [
                    search.createColumn({ name: "custrecord_swc_ewh_fee_day_fee", label: "仓租费" }),
                    search.createColumn({ name: "custrecord_swc_ewh_fee_day_lot", label: "批次" }),
                    search.createColumn({ name: "custrecord_swc_ewh_fee_day_quantity", label: "数量" }),
                    search.createColumn({ name: "custrecord_swc_ewh_fee_day_warehouse", label: "地点" })
                ]
            });

            // var searchId = customrecord_swc_ewh_fee_daySearchObj.save();
            // log.audit('searchId',searchId);

            let results = getAllResultsByPage({ searchObj: customrecord_swc_ewh_fee_daySearchObj }).results;

            let totalAmount = 0;
            let batchSet = new Set();   // 用于去重批次

            results.forEach(record => {
                let amount = parseFloat(record.getValue({ name: "custrecord_swc_ewh_fee_day_fee", label: "仓租费" })) || 0;
                let batch = record.getValue({ name: "custrecord_swc_ewh_fee_day_lot", label: "批次" });

                totalAmount += amount;
                if (batch) {
                    batchSet.add(batch);
                }
            });

            // 返回总金额和去重后的批次数组
            return {
                totalAmount: totalAmount,
                batches: Array.from(batchSet)
            };
        }

        function searchToId(toData) {
            const transactionSearchObj = search.create({
                type: "transaction",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["internalid","anyof",toData]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            summary: "GROUP",
                            label: "内部 ID"
                        }),
                        search.createColumn({
                            name: "type",
                            summary: "GROUP",
                            label: "类型"
                        })
                    ]
            });

            let results = getAllResultsByPage({searchObj: transactionSearchObj}).results;//检索方法;

            let data = [];
            results.forEach(value => {
                var type = value.getValue({
                    name: "type",
                    summary: "GROUP",
                    label: "类型"
                });
                if (type == 'TrnfrOrd') {
                    data.push(value.getValue({
                        name: "internalid",
                        summary: "GROUP",
                        label: "内部 ID"
                    }));
                }
            });


            return data
        }

        function searchLocation(whCode,ckType,service) {
            const locationSearchObj = search.create({
                type: "location",
                filters:
                    [
                        ["custrecord_swc_warehouse_code.name","startswith",whCode],
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

        function search1(sku,locationData,batches) {

            var filters = [
                ["item","anyof",sku],
                "AND",
                ["location","anyof",locationData],
            ]
            if (batches) {
                var filter = [];
                for (let i = 0;i < batches.length;i++) {
                    filter.push(["inventorynumber.inventorynumber","is",batches[i]]);
                    if (i != batches.length - 1) {
                        filter.push('AND');
                    }
                }
                filters.push('AND');
                filters.push(filter);
            }

            // const inventorydetailSearchObj = search.create({
            //     type: "inventorydetail",
            //     filters:filters,
            //     columns:
            //         [
            //             search.createColumn({
            //                 name: "inventorynumber",
            //                 summary: "GROUP",
            //                 label: " 编号"
            //             }),
            //             search.createColumn({
            //                 name: "quantityavailable",
            //                 join: "inventoryNumber",
            //                 summary: "SUM",
            //                 label: "可用"
            //             }),
            //             search.createColumn({
            //                 name: "location",
            //                 summary: "GROUP",
            //                 label: "地点"
            //             }),
            //             search.createColumn({
            //                 name: "subsidiary",
            //                 join: "location",
            //                 summary: "GROUP",
            //                 label: "子公司"
            //             })
            //         ]
            // });

            const inventorybalanceSearchObj = search.create({
                type: "inventorybalance",
                filters:
                filters,
                columns:
                    [
                        search.createColumn({name: "item", label: "货品"}),
                        search.createColumn({name: "location", label: "地点"}),
                        search.createColumn({name: "inventorynumber", label: "库存编号"}),
                        search.createColumn({name: "available", label: "可用"}),
                        search.createColumn({name: "onhand", label: "现有"}),
                        search.createColumn({
                            name: "inventorynumber",
                            join: "inventoryNumber",
                            label: "编号"
                        })
                    ]
            });

            let results = getAllResultsByPage({searchObj: inventorybalanceSearchObj}).results;//检索方法;

            let data = [];
            results.forEach(value => {
                var id = value.id;
                var location = value.getValue({name: "location", label: "地点"});
                var quantity = value.getValue({name: "onhand", label: "现有"});
                var iniventory = value.getValue({
                    name: "inventorynumber",
                    join: "inventoryNumber",
                    label: "编号"
                });

                if (quantity != 0) {
                    var obj = {};
                    obj = {
                        location: location,
                        quantity: quantity,
                        iniventory: iniventory
                    }

                    data.push(obj);
                }

            });

            return data
        }

        function search2(sku,locationData,xl,zl,dl) {
            var filters = [
                ["location","anyof",locationData],
            ]
            if (xl) {
                filters.push('AND');
                filters.push(["item.custitem_swc_sjlm","anyof",xl]);
            }
            if (zl) {
                filters.push('AND');
                filters.push(["item.custitem_swc_ejlm","anyof",zl]);
            }
            if (dl) {
                filters.push('AND');
                filters.push(["item.custitem_swc_yjlm","anyof",dl]);
            }
            // const inventorydetailSearchObj = search.create({
            //     type: "inventorydetail",
            //     filters:filters,
            //     columns:
            //         [
            //             search.createColumn({name: "inventorynumber", label: " 编号",summary: "GROUP"}),
            //             search.createColumn({
            //                 name: "quantityavailable",
            //                 join: "inventoryNumber",
            //                 summary: "SUM",
            //                 label: "可用"
            //             }),
            //             search.createColumn({name: "location", label: "地点",summary: "GROUP"}),
            //             search.createColumn({name: "item", label: "货品",summary: "GROUP"}),
            //             search.createColumn({
            //                 name: "subsidiary",
            //                 join: "location",
            //                 label: "子公司",
            //                 summary: "GROUP"
            //             })
            //         ]
            // });

            const inventorybalanceSearchObj = search.create({
                type: "inventorybalance",
                filters:
                filters,
                columns:
                    [
                        search.createColumn({name: "item", label: "货品"}),
                        search.createColumn({name: "location", label: "地点"}),
                        search.createColumn({name: "inventorynumber", label: "库存编号"}),
                        search.createColumn({name: "available", label: "可用"}),
                        search.createColumn({name: "onhand", label: "现有"}),
                        search.createColumn({
                            name: "inventorynumber",
                            join: "inventoryNumber",
                            label: "编号"
                        }),
                    ]
            });

            let results = getAllResultsByPage({searchObj: inventorybalanceSearchObj}).results;//检索方法;

            let data = [];
            results.forEach(value => {
                // var id = value.id;
                var location = value.getValue({name: "location", label: "地点"});
                var quantity = value.getValue({name: "onhand", label: "现有"});
                var iniventory = value.getValue({
                    name: "inventorynumber",
                    join: "inventoryNumber",
                    label: "编号"
                });
                var sku = value.getValue({name: "item", label: "货品"});

                if (quantity != 0) {
                    var obj = {};
                    obj = {
                        sku: sku,
                        location: location,
                        quantity: quantity,
                        iniventory: iniventory
                    }

                    data.push(obj);
                }
            });

            return data
        }

        function formatDateToYYYYMMDD(dateValue) {
            if (!dateValue) return ''; // 空值返回空字符串，setValue 可接受空串

            // 转为字符串，防止 Date 对象
            var dateStr = String(dateValue);

            // 提取空格前的部分，即可得到 "2026-01-26"
            return dateStr.split(' ')[0];
        }

        function round(number, precision) { return Math.round(+number + 'e' + precision) / Math.pow(10, precision); }

        return {getInputData, map, reduce, summarize}

    });