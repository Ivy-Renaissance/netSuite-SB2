/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * 第二笔预付款核销
 */
define(['N/currency', 'N/currentRecord', 'N/record', 'N/runtime', 'N/search', '../common/MatchTool','../common/SWC_CONFIG_DATA'],
    (currency, currentRecord, record, runtime, search,MatchTool,SWC_CONFIG_DATA) => {
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
            let billObj = searchBillData();

            log.audit('billObj',billObj);
            return billObj;
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
                const key = mapContext.key;
                const value = JSON.parse(mapContext.value);

                //供应商核销数据
                let writeOffObj = {};
                //预付款申请单反写数据
                let adBackObj = {};
                let startKeyData = value.startKey;
                let preObj = searchPreObj(startKeyData);
                log.audit('preObj',preObj);


                let billRec = record.load({
                    type: 'vendorbill',
                    id: key,
                    isDynamic: true
                });
                let lineCount = billRec.getLineCount({
                    sublistId: 'item'
                });
                log.audit('lineCount',lineCount);
                for (let i = 0;i < lineCount;i++) {
                    billRec.selectLine({
                        sublistId: 'item',
                        line: i
                    });
                    //含税总金额
                    let grossAmt = billRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'grossamt'
                    });
                    //第一次整单预付核销金额
                    let firstAmount = billRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_swc_prepay_whole1_spare'
                    });
                    log.audit('firstAmount',firstAmount);
                    //子一次预付款金额存在
                    if (firstAmount) {
                        let endAmount = grossAmt - firstAmount;
                        let startKey = billRec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_swc_poline_initial_key'
                        });
                        let endKey = billRec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_swc_line_no'
                        });

                        startKey = startKey + '_' + endKey;
                        log.audit('startKey',startKey);
                        if (startKey in preObj) {
                            let allAmount = preObj[startKey].amount;
                            let adAmount = 0;
                            log.audit('allAmount',allAmount);
                            //如果未核销金额不为0
                            if (allAmount > 0) {
                                //若改行 预计支付尾款 小于 未核销金额
                                if (endAmount <= allAmount) {
                                    billRec.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_swc_prepay_beforearrived',
                                        value: endAmount
                                    });
                                    adAmount = endAmount;
                                    preObj[startKey].amount = MatchTool.subN(preObj[startKey].amount,endAmount);
                                    preObj[startKey].paidAmount = MatchTool.addN(preObj[startKey].paidAmount,endAmount);
                                } else if (endAmount > allAmount) {
                                    //若该行预计支付尾款 大于 剩余未核销金额
                                    billRec.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_swc_prepay_beforearrived',
                                        value: allAmount
                                    });
                                    adAmount = allAmount;
                                    preObj[startKey].amount = 0;
                                    preObj[startKey].paidAmount = MatchTool.addN(preObj[startKey].paidAmount,allAmount);
                                }

                                // //反写预付款申请单
                                // let adId = preObj[startKey].id;
                                // adBackObj[adId] = adBackObj[adId] || {};
                                // let adLineKey = startKey + '_' + endKey
                                // if (adLineKey in adBackObj[adId]) {
                                //     adBackObj[adId][adLineKey].amount = adBackObj[adId][adLineKey].amount + adAmount
                                // } else {
                                //     adBackObj[adId][adLineKey] = {
                                //         amount: adAmount,
                                //         billId: key
                                //     }
                                // }

                                //含税金额
                                let grossamt = billRec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'grossamt'
                                });

                                //第一次预付
                                let firstAmount = billRec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_prepay_whole1_spare',
                                });
                                //第二次预付
                                let secondAmount = billRec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_prepay_beforearrived',
                                });

                                //已预付总金额
                                billRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_bill_writeoff_amount',
                                    value: Number(firstAmount) + Number(secondAmount)
                                });

                                //待支付金额
                                billRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_bill_unsettled_amount',
                                    value: MatchTool.fixed(MatchTool.subN(MatchTool.subN(grossamt,Number(firstAmount)),Number(secondAmount)),2)
                                });
                                //剩余金额
                                billRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_notnotused',
                                    value: MatchTool.fixed(MatchTool.subN(MatchTool.subN(grossamt,Number(firstAmount)),Number(secondAmount)),2)
                                });
                                //已支付金额
                                billRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_alreadyused',
                                    value: 0
                                });

                                billRec.commitLine({
                                    sublistId: 'item'
                                });
                            } else {
                                billRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_prepay_beforearrived',
                                    value: 0
                                });
                                //含税金额
                                let grossamt = billRec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'grossamt'
                                });
                                //第一次预付
                                let firstAmount = billRec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_prepay_whole1_spare',
                                });
                                //待支付金额
                                billRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_bill_unsettled_amount',
                                    value: MatchTool.fixed(MatchTool.subN(grossamt,Number(firstAmount)),2)
                                });
                                //剩余金额
                                billRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_notnotused',
                                    value: MatchTool.fixed(MatchTool.subN(grossamt,Number(firstAmount)),2)
                                });
                                //已支付金额
                                billRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_alreadyused',
                                    value: 0
                                });



                                billRec.commitLine({
                                    sublistId: 'item'
                                });
                            }
                        }
                    }
                }

                billRec.save();

                log.audit('处理后preObj',preObj);
                if (Object.keys(preObj).length > 0) {
                    const paymentObj = allocatePaymentAsObject(preObj,key,adBackObj);
                    log.audit('paymentObj',paymentObj);
                    log.audit('adBackObj',adBackObj);
                    for (let key2 in paymentObj) {
                        mapContext.write({
                            key: key2 + '_' + 'vendorprepayment', // 确保 key 为字符串
                            value: paymentObj[key2],
                        });
                    }

                    if (Object.keys(adBackObj).length > 0) {
                        for (let key2 in adBackObj) {
                            mapContext.write({
                                key: key2 + '_' + 'ad', // 确保 key 为字符串
                                value: adBackObj[key2],
                            });
                        }
                    }
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
            try {
                const key = reduceContext.key;
                log.audit('key',key);
                let id = key.split('_')[0];
                let type = key.split('_')[1];
                // const len = reduceContext.values.length;

                log.audit('type',type);
                //供应商预付款生成供应商预付款核销
                if (type == 'vendorprepayment') {
                    // 1. 将 values 解析为数组
                    const items = [];
                    reduceContext.values.forEach(str => {
                        try {
                            const obj = JSON.parse(str);
                            items.push(obj);
                        } catch (e) {
                            log.error('解析预付款核销数据失败', e);
                        }
                    });

                    // 2. 如果没有任何数据，跳过
                    if (items.length === 0) return;

                    const preRec = record.transform({
                        fromType: "vendorprepayment",
                        fromId: id,
                        toType: "vendorprepaymentapplication",
                        isDynamic: true
                    });

                    preRec.setValue({
                        fieldId: 'account',
                        value: SWC_CONFIG_DATA.configData().S_ACCOUNT_YFZK//待定应付账款 S_ACCOUNT_YFZK
                    });

                    let lineCount = preRec.getLineCount({
                        sublistId: 'bill'
                    });
                    log.audit('lineCount', lineCount);

                    for (let item of items) {
                        for (let i = 0; i < lineCount; i++) {
                            preRec.selectLine({
                                sublistId: 'bill',
                                line: i
                            })
                            let billId = preRec.getCurrentSublistValue({
                                sublistId: 'bill',
                                fieldId: 'internalid',
                            });

                            log.audit('billId', billId);
                            if (billId == item.billId) {
                                preRec.setCurrentSublistValue({
                                    sublistId: 'bill',
                                    fieldId: 'unapplied',
                                    value: item.amount,
                                });
                                preRec.setCurrentSublistValue({
                                    sublistId: 'bill',
                                    fieldId: 'apply',
                                    value: true,
                                });
                                preRec.commitLine({
                                    sublistId: 'bill'
                                });
                            }
                        }
                    }

                    let preId = preRec.save({
                        ignoreMandatoryFields: true
                    });
                    log.audit('preId', preId);
                }

                //反写预付款申请单
                if (type == 'ad') {
                    let value = mergeJSONStrings(reduceContext.values);
                    log.audit('value',value);
                    let adRec = record.load({
                        type: 'customrecord_swc_advancepay_plateform',
                        id: id,
                        isDynamic: true
                    });
                    let amountSum = adRec.getValue({fieldId: "custrecord_swc_advancepay_alread_sum"}) || 0;
                    let lineCount = adRec.getLineCount({sublistId: 'recmachcustrecord_swc_advancepay_main'});
                    log.audit('lineCount',lineCount);
                    if (lineCount) {
                        for (let i = 0;i < lineCount;i++) {
                            adRec.selectLine({
                                sublistId: 'recmachcustrecord_swc_advancepay_main',
                                line: i
                            });
                            let startKey = adRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_advancepay_main',
                                fieldId: 'custrecord_swc_advancepay_line_initial'
                            });
                            let endKey = adRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_advancepay_main',
                                fieldId: 'custrecord_swc_advancepay_line_number'
                            });
                            let lineKey = startKey + '_' + endKey;
                            log.audit('lineKey',lineKey);
                            if (lineKey in value) {

                                let lineBill = adRec.getCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_advancepay_main',
                                    fieldId: 'custrecord_swc_advancepay_line_uses'
                                });
                                let lineAmount = adRec.getCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_advancepay_main',
                                    fieldId: 'custrecord_swc_advancepay_line_useamount'
                                }) || 0;
                                let noLineAmount = adRec.getCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_advancepay_main',
                                    fieldId: 'custrecord_swc_advancepay_alreadyno'
                                }) || 0;
                                let preAmount = adRec.getCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_advancepay_main',
                                    fieldId: 'custrecord_swc_advancepay_amount_now'
                                });
                                if (noLineAmount < value[lineKey].amount) {
                                    amountSum = amountSum + value[lineKey].amount;
                                    lineAmount = lineAmount + value[lineKey].amount;
                                    noLineAmount = noLineAmount - value[lineKey].amount;
                                    value[lineKey].amount = MatchTool.subN(value[lineKey].amount,noLineAmount)
                                } else {
                                    amountSum = amountSum + noLineAmount;
                                    lineAmount = lineAmount + noLineAmount;
                                    noLineAmount = 0;
                                    value[lineKey].amount = MatchTool.subN(value[lineKey].amount,noLineAmount)
                                }

                                // 确保lineBill是数组
                                if (!Array.isArray(lineBill)) {
                                    // 如果不是数组，根据当前值初始化
                                    lineBill = lineBill ?
                                        (typeof lineBill === 'string' ? [lineBill] : [])
                                        : [];
                                }
                                lineBill.push(value[lineKey].billId);

                                log.audit('lineAmount',lineAmount);
                                log.audit('lineBill',lineBill);
                                log.audit('noLineAmount',noLineAmount);
                                adRec.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_advancepay_main',
                                    fieldId: 'custrecord_swc_advancepay_line_useamount',
                                    value: lineAmount
                                });
                                adRec.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_advancepay_main',
                                    fieldId: 'custrecord_swc_advancepay_line_uses',
                                    value: lineBill
                                });
                                adRec.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_advancepay_main',
                                    fieldId: 'custrecord_swc_advancepay_alreadyno',
                                    value: noLineAmount
                                });
                                adRec.commitLine({sublistId: 'recmachcustrecord_swc_advancepay_main'})
                            }
                        }
                    }
                    adRec.setValue({
                        fieldId: "custrecord_swc_advancepay_alread_sum",
                        value: amountSum
                    });
                    let nowAmount = adRec.getValue({
                        fieldId: "custrecord_swc_advancepay_amount_now",
                    });
                    let noAmountSum = MatchTool.subN(nowAmount,amountSum) || 0;
                    adRec.setValue({
                        fieldId: "custrecord_swc_advancepay_no_sum",
                        value: noAmountSum
                    });

                    adRec.save();
                    log.audit('反写成功')
                }
            } catch (e) {
                log.error('error',e.message);
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

        function searchBillData() {
            var vendorbillSearchObj = search.create({
                type: "vendorbill",
                settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","VendBill"],
                        "AND",
                        ["custcol_swc_prepay_whole1_spare","isnotempty",""],
                        "AND",
                        ["custcol_swc_poline_initial_key","isnotempty",""],
                        // "AND",
                        // ["internalid","anyof","44147"],
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            summary: "GROUP",
                            label: "内部 ID"
                        }),
                        search.createColumn({
                            name: "custcol_swc_poline_initial_key",
                            summary: "GROUP",
                            label: "订单行初始唯一键"
                        }),
                        // search.createColumn({
                        //     name: "fxrate",
                        //     summary: "MAX",
                        //     label: "货品价格"
                        // }),
                        // search.createColumn({
                        //     name: "quantity",
                        //     summary: "GROUP",
                        //     label: "数量"
                        // }),
                        // search.createColumn({
                        //     name: "taxamount",
                        //     summary: "MAX",
                        //     label: "金额（税）"
                        // })
                    ]
            });

            var result = getAllResultsByPage({searchObj: vendorbillSearchObj}).results;//检索方法;

            var obj = {};
            result.forEach(value => {
                // var lineObj = {};
                var id = value.getValue({
                    name: "internalid",
                    summary: "GROUP",
                    label: "内部 ID"
                });
                var startKey = value.getValue({
                    name: "custcol_swc_poline_initial_key",
                    summary: "GROUP",
                    label: "订单行初始唯一键"
                });
                // lineObj.rate = rate;
                // lineObj.quantity = quantity;
                // lineObj.startKey = startKey;


                if (id in obj) {
                    obj[id].startKey.push(startKey);
                } else {
                    obj[id] = {
                        startKey: [startKey],
                        // rate: rate
                        // line: []
                    }
                }
                // obj[id].lineObj = lineObj;
                // obj[id].line.push(lineObj);
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

        function searchPreObj(startKeyData) {
            let filter = [];
            for (let i = 0;i < startKeyData.length;i++) {
                let startKey = startKeyData[i];
                filter.push(["custrecord_swc_advancepay_main.custrecord_swc_advancepay_line_initial","startswith",startKey]);
                if (i !== startKeyData.length - 1)
                    filter.push("OR");
            }
            var customrecord_swc_advancepay_plateformSearchObj = search.create({
                type: "customrecord_swc_advancepay_plateform",
                // title: '预付款核销-二次开发数据 孙开发',
                filters:
                    [
                        ["custrecord_swc_advancepay_whole_yes","is","F"],
                        "AND",
                        ["custrecord_swc_advancepay_vprep_main.status","noneof","VPrep:F"],
                        "AND",
                        ["custrecord_swc_advancepay_vprep_main.mainline","is","F"],
                        "AND",
                        filter
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_advancepay_vprep_main", label: "预付款单"}),
                        search.createColumn({
                            name: "custrecord_swc_advancepay_line_initial",
                            join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                            label: "订单行初始唯一键"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_advancepay_alreadyno",
                            join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                            label: "金额"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_advancepay_line_useamount",
                            join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                            label: "已付金额"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_advancepay_line_number",
                            join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                            label: "行号"
                        })
                    ]
            });

            var result = getAllResultsByPage({searchObj: customrecord_swc_advancepay_plateformSearchObj}).results;//检索方法;

            var obj = {};
            result.forEach(value => {
                let adObj = {};
                let startKey = value.getValue({
                    name: "custrecord_swc_advancepay_line_initial",
                    join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                    label: "订单行初始唯一键"
                });
                let vpId = value.getValue({name: "custrecord_swc_advancepay_vprep_main", label: "预付款单"});
                let allAmount = value.getValue({
                    name: "custrecord_swc_advancepay_alreadyno",
                    join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                    label: "金额"
                });
                let paidAmount = value.getValue({
                    name: "custrecord_swc_advancepay_line_useamount",
                    join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                    label: "已付金额"
                });
                let endKey = value.getValue({
                    name: "custrecord_swc_advancepay_line_number",
                    join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                    label: "行号"
                });
                let amount = MatchTool.subN(allAmount,paidAmount);
                log.audit('amount',amount);

                adObj[value.id] = {
                    id: value.id,
                    amount: amount,//剩余未核销金额
                    vpId: vpId,
                }

                startKey = startKey + '_' + endKey;
                if (startKey in obj) {
                    obj[startKey].amount = MatchTool.addN(obj[startKey].amount,amount);
                } else {
                    // obj[startKey].amount = amount;
                    // obj[startKey].paidAmount = 0;
                    // obj[startKey].adData = [];

                    obj[startKey] = {
                        amount: amount,
                        paidAmount: 0,
                        adData: []
                    }
                }

                obj[startKey].adData.push(adObj[value.id]);

                log.audit('obj',obj);
            });

            return obj
        }

        function allocatePaymentAsObject(data, billId, adBackObj) {
            let result = {};
            // 遍历所有日期
            for (let billKey in data) {
                const billData = data[billKey];
                const paidAmount = Number(billData.paidAmount);
                const adData = billData.adData;
                log.audit('billData', billData);

                // 如果没有支付金额，跳过该日期（关键修改）
                if (paidAmount <= 0) {
                    continue;
                }

                let remainingPaid = paidAmount;

                // 遍历adData数组进行分摊
                for (let i = 0; i < adData.length; i++) {
                    if (remainingPaid <= 0) break;

                    log.audit('adData[i]', adData[i]);
                    const adObj = adData[i];
                    const itemKey = adObj.id;
                    const vpId = adObj.vpId;
                    const itemAmount = Number(adObj.amount);

                    const allocateAmount = Math.min(remainingPaid, itemAmount);
                    log.audit('allocateAmount', allocateAmount);

                    adBackObj[itemKey] = adBackObj[itemKey] || {};
                    if (billKey in adBackObj[itemKey]) {
                        adBackObj[itemKey][billKey].amount += allocateAmount;
                    } else {
                        adBackObj[itemKey][billKey] = {
                            amount: allocateAmount,
                            billId: billId
                        };
                    }

                    if (!(vpId in result)) {
                        result[vpId] = {
                            amount: allocateAmount,
                            billId: billId
                        };
                    } else {
                        result[vpId].amount += allocateAmount;
                    }

                    remainingPaid -= allocateAmount;
                }
            }
            return result;
        }

        function mergeJSONStrings(jsonStrings) {
            const result = {};

            jsonStrings.forEach((str, index) => {
                try {
                    const obj = JSON.parse(str);

                    Object.keys(obj).forEach(key => {
                        const incoming = obj[key];
                        if (result.hasOwnProperty(key)) {
                            // 累加 amount
                            result[key].amount += incoming.amount;

                            // 合并 billId 为数组
                            let existingBillIds = result[key].billId;
                            if (!Array.isArray(existingBillIds)) {
                                existingBillIds = [existingBillIds];
                            }
                            let newBillIds = incoming.billId;
                            if (!Array.isArray(newBillIds)) {
                                newBillIds = [newBillIds];
                            }
                            // 合并（不去重，若需去重可加 Set）
                            result[key].billId = existingBillIds.concat(newBillIds);
                        } else {
                            // 首次出现，将 billId 转为数组
                            result[key] = {
                                amount: incoming.amount,
                                billId: Array.isArray(incoming.billId) ? incoming.billId : [incoming.billId]
                            };
                        }
                    });

                } catch (e) {
                    log.error(`解析第 ${index} 个JSON字符串失败:`, e);
                }
            });

            return result;
        }

        return {getInputData, map, reduce, summarize}

    });