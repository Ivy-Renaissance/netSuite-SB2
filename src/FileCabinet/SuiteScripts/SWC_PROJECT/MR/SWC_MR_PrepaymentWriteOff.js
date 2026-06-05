/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * 第一笔预付款核销
 */
define(['N/record', 'N/runtime', 'N/search', '../common/SWC_CONFIG_DATA', '../common/MatchTool', "../APP/SWC_APP_PrepaymentPlatform"],
    (record, runtime, search,SWC_CONFIG_DATA,MatchTool,app) => {
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
            // let vpObj = searchVPData();//查询需要核销的【供应商预付款】标准单据
            var orderid = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_yfk_zdid' });
            let obj = searchBillData(orderid);

            let billObj = obj.obj;
            let startKeyData = obj.startKeyData;
            let idData = obj.idData;

            if (!billObj || Object.keys(billObj).length === 0) {
                log.error('无需处理数据');
                return;
            }
            log.audit('obj',obj);


            let preObj = searchPreObj(startKeyData);
            log.audit('preObj',preObj);

            // if (Object.keys(preObj).length <= 0) return;

            let fxRateObj = searchFxObj(startKeyData);

            // if (Object.keys(fxRateObj).length <= 0) return;

            let billLineObj = searchLineBill(idData,billObj,preObj,fxRateObj);

            if (Object.keys(billLineObj).length <= 0) return;

            log.audit('billLineObj',billLineObj);

            return billLineObj;
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
                // const lineObj = value.lineObj;
                const lineObj = value['line'];

                //供应商核销数据
                let writeOffObj = value['writeOffObj'];
                //预付款申请单反写数据
                let adBackObj = value['adBackObj'];
                // let startKeyData = value.startKey;
                // let preObj = searchPreObj(startKeyData);
                // log.audit('preObj',preObj);
                //
                // let fxRateObj = searchFxObj(startKeyData);
                // log.audit('fxRateObj',fxRateObj);


                let billRec = record.load({
                    type: 'vendorbill',
                    id: key,
                    isDynamic: true
                });
                let lineCount = billRec.getLineCount({
                    sublistId: 'item'
                });

                for (let i = 0;i < lineCount;i++) {
                    billRec.selectLine({
                        sublistId: 'item',
                        line: i
                    });
                    let startKey = billRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'line'
                    });

                    if (startKey in lineObj) {
                        //第一次预付
                        billRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_swc_prepay_whole1_spare',
                            value: lineObj[startKey].custcol_swc_prepay_whole1_spare
                        });


                        //已预付总金额
                        billRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_swc_bill_writeoff_amount',
                            value: lineObj[startKey].custcol_swc_bill_writeoff_amount
                        });
                    }
                    billRec.commitLine({
                        sublistId: 'item'
                    });
                }

                billRec.save({
                    ignoreMandatoryFields: true
                });

                for (let key in writeOffObj) {
                    mapContext.write({
                        key: key + '_' + 'vendorprepayment', // 确保 key 为字符串
                        value: writeOffObj[key]
                    });
                }
                for (let key in adBackObj) {
                    mapContext.write({
                        key: key + '_' + 'ad', // 确保 key 为字符串
                        value: adBackObj[key]
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
            try {
                const key = reduceContext.key;
                let id = key.split('_')[0];
                let type = key.split('_')[1];
                // const len = reduceContext.values.length;

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

                    // 3. 创建预付款核销申请单
                    const preRec = record.transform({
                        fromType: "vendorprepayment",
                        fromId: id,
                        toType: "vendorprepaymentapplication",
                        isDynamic: true
                    });

                    preRec.setValue({
                        fieldId: 'account',
                        value: SWC_CONFIG_DATA.configData().S_ACCOUNT_YFZK
                    });

                    // 4. 遍历 items，为每个 billId 添加子表行（或者合并相同 billId 的金额）
                    // 注意：vendorprepaymentapplication 的 bill 子表可能每个账单只能有一行，需要根据实际业务判断
                    // 以下代码假设每个 billId 需要单独一行
                    for (let item of items) {
                        let lineCount = preRec.getLineCount({ sublistId: 'bill' });
                        let found = false;
                        // 查找是否已存在该 billId 的行（可选，如需合并金额）
                        for (let i = 0; i < lineCount; i++) {
                            preRec.selectLine({ sublistId: 'bill', line: i });
                            let existingBillId = preRec.getCurrentSublistValue({
                                sublistId: 'bill',
                                fieldId: 'internalid'
                            });
                            if (existingBillId == item.billId) {
                                // 存在，累加金额
                                let existingAmount = preRec.getCurrentSublistValue({
                                    sublistId: 'bill',
                                    fieldId: 'amount'
                                });
                                preRec.setCurrentSublistValue({
                                    sublistId: 'bill',
                                    fieldId: 'amount',
                                    value: existingAmount + item.amount
                                });
                                preRec.commitLine({ sublistId: 'bill' });
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            // 新增一行
                            preRec.selectNewLine({ sublistId: 'bill' });
                            preRec.setCurrentSublistValue({
                                sublistId: 'bill',
                                fieldId: 'internalid',
                                value: item.billId
                            });
                            preRec.setCurrentSublistValue({
                                sublistId: 'bill',
                                fieldId: 'apply',
                                value: true
                            });
                            preRec.setCurrentSublistValue({
                                sublistId: 'bill',
                                fieldId: 'amount',
                                value: item.amount
                            });
                            preRec.commitLine({ sublistId: 'bill' });
                        }
                    }

                    let preId = preRec.save({ ignoreMandatoryFields: true });
                    log.audit('preId', preId);
                }

                //反写预付款申请单
                if (type == 'ad') {
                    let value = mergeJSONStrings(reduceContext.values);
                    let adRec = record.load({
                        type: 'customrecord_swc_advancepay_plateform',
                        id: id,
                        isDynamic: true
                    });
                    let amountSum = adRec.getValue({fieldId: "custrecord_swc_advancepay_alread_sum"}) || 0;
                    let lineCount = adRec.getLineCount({sublistId: 'recmachcustrecord_swc_advancepay_main'});

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
                            // let endKey = adRec.getCurrentSublistValue({
                            //     sublistId: 'recmachcustrecord_swc_advancepay_main',
                            //     fieldId: 'custrecord_swc_advancepay_line_number'
                            // });
                            let lineKey = startKey;

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
                                }) || 0;
                                lineAmount = lineAmount + value[lineKey].amount;
                                // 确保lineBill是数组
                                if (!Array.isArray(lineBill)) {
                                    // 如果不是数组，根据当前值初始化
                                    lineBill = lineBill ?
                                        (typeof lineBill === 'string' ? [lineBill] : [])
                                        : [];
                                }
                                // lineBill.push(value[lineKey].billId);
                                let billIdVal = value[lineKey].billId;
                                if (Array.isArray(billIdVal)) {
                                    billIdVal.forEach(id => lineBill.push(id));
                                } else {
                                    lineBill.push(billIdVal);
                                }

                                // if (noLineAmount) {
                                //     noLineAmount = noLineAmount - value[lineKey].amount;
                                // } else {
                                //     noLineAmount = preAmount - value[lineKey].amount;
                                // }
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
                                    value: preAmount - lineAmount
                                });
                                adRec.commitLine({sublistId: 'recmachcustrecord_swc_advancepay_main'})
                            }
                        }
                    }

                    for (let lineKey in value) {
                        amountSum = amountSum + value[lineKey].amount;
                    }
                    adRec.setValue({
                        fieldId: "custrecord_swc_advancepay_alread_sum",
                        value: amountSum
                    });
                    let nowAmount = adRec.getValue({
                        fieldId: "custrecord_swc_advancepay_total_amount",
                    });
                    let noAmountSum = (nowAmount - amountSum) || 0;
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
            log.audit('结束');
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

        function searchBillData(orderid) {
            var filter = [
                ["type","anyof","VendBill"],
                "AND",
                ["custcol_swc_prepay_whole1_spare","isempty",""],
                "AND",
                ["custcol_swc_poline_initial_key","isnotempty",""],
                "AND",
                ["custbody_swc_order_type2","anyof",SWC_CONFIG_DATA.configData().s_po_type_swcg,SWC_CONFIG_DATA.configData().s_po_type_gdzc],
                // "AND",
                // ["createdfrom","anyof","419","398","291"]
            ]
                // ["internalid","anyof","17548","21784","22189","129648","299323","325483","326141","333868"]
            if (orderid) {
                filter.push("AND");
                filter.push(["internalid","anyof",orderid])
            }
            var vendorbillSearchObj = search.create({
                type: "vendorbill",
                settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                filter,
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
                        search.createColumn({
                            name: "fxrate",
                            summary: "MAX",
                            label: "货品价格"
                        }),
                        search.createColumn({
                            name: "quantity",
                            summary: "GROUP",
                            label: "数量"
                        }),
                        search.createColumn({
                            name: "formulacurrency",
                            summary: "MAX",
                            formula: "{fxrate}*(1+NVL({taxitem.rate}/100, 0))",
                            label: "公式（货币）"
                        })
                    ]
            });

            var result = getAllResultsByPage({searchObj: vendorbillSearchObj}).results;//检索方法;

            var json = {};
            var obj = {};
            var lineObj = {};
            var startKeyData = [];
            var idData = [];
            result.forEach(value => {
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
                if (idData.indexOf(id) == -1) {
                    idData.push(id);
                }
                if (startKeyData.indexOf(startKey) == -1) {
                    startKeyData.push(startKey);
                }
                // var rate = Number(value.getValue({
                //     name: "fxrate",
                //     summary: "MAX",
                //     label: "货品价格"
                // }));
                // var quantity = Math.abs(value.getValue({
                //     name: "quantity",
                //     summary: "GROUP",
                //     label: "数量"
                // }));
                var rate = Math.abs(value.getValue({
                    name: "formulacurrency",
                    summary: "MAX",
                    formula: "{fxrate}*(1+NVL({taxitem.rate}/100, 0))",
                    label: "公式（货币）"
                })) || 0;
                // // 四舍五入成整数
                // tax = MatchTool.fixed(tax,2);
                //
                // log.audit('总税',{
                //     quantity:quantity,
                //     tax: tax
                // })
                //
                // tax = MatchTool.fixed(MatchTool.divN(tax,quantity),2);
                // log.audit('单税',tax);
                // // lineObj.rate = rate;
                // // lineObj.quantity = quantity;
                // // lineObj.startKey = startKey;
                // log.audit('rate',rate);
                lineObj[startKey] = {
                    rate: rate
                };

                if (id in obj) {
                    obj[id].startKey.push(startKey);
                } else {
                    obj[id] = {
                        startKey: [startKey],
                        // rate: rate
                        // line: []
                    }
                }
                obj[id].lineObj = lineObj;
                // obj[id].line.push(lineObj);
            });

            json.obj = obj;
            json.startKeyData = startKeyData;
            json.idData = idData;
            return json
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
                filters: [
                    ["custrecord_swc_advancepay_whole_yes","is","T"],
                    "AND",
                    filter
                ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_advancepay_vprep_main", label: "预付款单"}),
                        search.createColumn({name: "custrecord_swc_advancepay_sum_percent1", label: "整单预付比例"}),
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
                        search.createColumn({name: "custrecord_swc_advancepay_po", label: "采购订单"}),
                    ]
            });

            var result = getAllResultsByPage({searchObj: customrecord_swc_advancepay_plateformSearchObj}).results;//检索方法;

            var obj = {};
            result.forEach(value => {
                let radio = value.getValue({name: "custrecord_swc_advancepay_sum_percent1", label: "整单预付比例"});
                let startKey = value.getValue({
                    name: "custrecord_swc_advancepay_line_initial",
                    join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                    label: "订单行初始唯一键"
                });
                let amount = Number(value.getValue({
                    name: "custrecord_swc_advancepay_alreadyno",
                    join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                    label: "金额"
                })) || 0;
                let vpId = value.getValue({name: "custrecord_swc_advancepay_vprep_main", label: "预付款单"});
                let poId = value.getValue({name: "custrecord_swc_advancepay_po", label: "采购订单"});

                startKey = poId + '_' + startKey;
                if (vpId)
                    if (!(startKey in obj)) {
                        obj[startKey] = {
                            radio: radio,
                            vpId: vpId,
                            adId: value.id,
                            amount: amount
                        };
                    } else {
                        obj[startKey].amount = obj[startKey].amount + amount
                    }

            });

            return obj
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
                            result[key].amount = MatchTool.fixed(result[key].amount,2) + MatchTool.fixed(incoming.amount,2);

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

        function searchFxObj(startKeyData) {
            let filter = [];
            for (let i = 0;i < startKeyData.length;i++) {
                let startKey = startKeyData[i];
                filter.push(["custcol_swc_poline_initial_key","startswith",startKey]);
                if (i !== startKeyData.length - 1)
                    filter.push("OR");
            }

            const purchaseorderSearchObj = search.create({
                type: "purchaseorder",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","PurchOrd"],
                        "AND",
                        ["mainline","is","F"],
                        "AND",
                        ["taxline","is","F"],
                        "AND",
                        ["custbody_swc_order_type2","anyof",SWC_CONFIG_DATA.configData().s_po_type_swcg,SWC_CONFIG_DATA.configData().s_po_type_gdzc],
                        "AND",
                        filter
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
                        search.createColumn({
                            name: "custcol_swc_including_tax_amt",
                            summary: "MAX",
                            label: "含税单价"
                        })
                    ]
            });

            var result = getAllResultsByPage({searchObj: purchaseorderSearchObj}).results;//检索方法;

            var obj = {};
            result.forEach(value => {
                var key = value.getValue({
                    name: "custcol_swc_poline_initial_key",
                    summary: "GROUP",
                    label: "订单行初始唯一键"
                });
                var id = value.getValue({
                    name: "internalid",
                    summary: "GROUP",
                    label: "内部 ID"
                });
                key = id + '_' + key;
                obj[key] = value.getValue({
                    name: "custcol_swc_including_tax_amt",
                    summary: "MAX",
                    label: "含税单价"
                });
            })

            return obj
        }

        function searchLineBill(idData,billObj,preObj,fxRateObj) {
            const vendorbillSearchObj = search.create({
                type: "vendorbill",
                settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","VendBill"],
                        "AND",
                        ["mainline","is","F"],
                        "AND",
                        ["taxline","is","F"],
                        "AND",
                        ["internalid","anyof",idData],
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "custcol_swc_poline_initial_key", label: "订单行初始唯一键"}),
                        search.createColumn({name: "quantity", label: "数量"}),
                        search.createColumn({
                            name: "formulacurrency",
                            formula: "CASE {type} WHEN '账单' THEN ABS({fxamount})+ABS(NVL({taxamount}/{exchangerate} , 0)) WHEN '账单贷项' THEN (ABS({fxamount})+ABS(NVL({taxamount}/{exchangerate} , 0))) * (-1) END",
                            label: "含税金额"
                        }),
                        search.createColumn({name: "line", label: "行 Id"}),
                        search.createColumn({name: "createdfrom", label: "创建自"}),
                    ]
            });
            var result = getAllResultsByPage({searchObj: vendorbillSearchObj}).results;//检索方法;
            var obj = {};
            result.forEach(value => {
                var key = value.getValue({name: "internalid", label: "内部 ID"});
                var startKey = value.getValue({name: "custcol_swc_poline_initial_key", label: "订单行初始唯一键"});
                var line = value.getValue({name: "line", label: "行 Id"});
                var createdId = value.getValue({name: "createdfrom", label: "创建自"});

                if (key in billObj) {
                    var startKeyData = billObj[key].startKey;
                    log.audit('billObj[key]',billObj[key]);
                    log.audit('startKeyData',startKeyData);
                    var preKey = createdId + '_' + startKey;
                    if (startKeyData.indexOf(String(startKey)) != -1 && preKey in preObj) {
                        if (preObj[preKey].amount > 0) {
                            obj[key] = obj[key] || {
                                'line': {},
                                'writeOffObj': {},
                                'adBackObj': {},
                            };
                            //比例
                            let radio = preObj[preKey].radio;
                            let vpId = preObj[preKey].vpId;
                            let adId = preObj[preKey].adId;
                            let preAmount = preObj[preKey].amount;
                            //最高单价
                            // let rate = lineObj[startKey].rate;
                            let rate = fxRateObj[preKey]; //最高单价
                            log.audit('最高单价',rate);
                            //账单行数量
                            let quantity = Math.abs(value.getValue({name: "quantity", label: "数量"}));

                            let grossamt = value.getValue({
                                name: "formulacurrency",
                                formula: "CASE {type} WHEN '账单' THEN ABS({fxamount})+ABS(NVL({taxamount}/{exchangerate} , 0)) WHEN '账单贷项' THEN (ABS({fxamount})+ABS(NVL({taxamount}/{exchangerate} , 0))) * (-1) END",
                                label: "含税金额"
                            });
                            log.audit('grossamt',grossamt);

                            log.audit('账单行数量',quantity);
                            log.audit('比例',MatchTool.divN(parseInt(radio), 100));
                            //摊销金额
                            let amount = MatchTool.fixed(
                                MatchTool.mulN(MatchTool.mulN(MatchTool.divN(parseInt(radio), 100), quantity), rate),
                                2);

                            if (amount > grossamt) {
                                amount = grossamt;
                            }

                            if (amount < preObj[preKey].amount) {
                                preObj[preKey].amount = preObj[preKey].amount - amount;
                            } else {
                                amount = preObj[preKey].amount;
                                preObj[preKey].amount = 0;
                            }

                            obj[key]["line"][line] = {};
                            amount = MatchTool.fixed(amount,2);

                            // preAmount
                            if (vpId in obj[key]['writeOffObj']) {
                                obj[key]['writeOffObj'][vpId].amount = obj[key]['writeOffObj'][vpId].amount + amount;
                            } else {
                                obj[key]['writeOffObj'][vpId] = {
                                    billId: key,
                                    amount: amount
                                }
                            }
                            //反写预付款申请单
                            obj[key]['adBackObj'][adId] = obj[key]['adBackObj'][adId] || {};
                            let adLineKey = startKey;
                            if (adLineKey in obj[key]['adBackObj'][adId]) {
                                obj[key]['adBackObj'][adId][adLineKey].amount = obj[key]['adBackObj'][adId][adLineKey].amount + amount
                            } else {
                                obj[key]['adBackObj'][adId][adLineKey] = {
                                    amount: amount,
                                    billId: key
                                }
                            }

                            //第一次整单预付-摊销金额
                            obj[key]['line'][line] = {
                                custcol_swc_prepay_whole1_spare: amount,
                                custcol_swc_bill_writeoff_amount: amount
                            }
                        }
                    }

                    if (startKeyData.indexOf(String(startKey)) != -1 && !(preKey in preObj)) {
                        obj[key] = obj[key] || {
                            'line': {},
                            'writeOffObj': {},
                            'adBackObj': {},
                        };
                        obj[key]['line'][line] = {
                            custcol_swc_prepay_whole1_spare: 0,
                            custcol_swc_bill_writeoff_amount: 0
                        }
                    }
                }
            });

            return obj;
        }
        return {getInputData, map, reduce, summarize}

    });