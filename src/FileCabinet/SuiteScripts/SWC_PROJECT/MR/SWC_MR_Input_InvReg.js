/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search','../common/MatchTool','N/runtime', '../common/SWC_CONFIG_DATA'],

    (record,search,MatchTool,runtime,SWC_CONFIG_DATA) => {
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

            var orderid = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_inv_order_id' });
            //获取发票数据
            let obj = getData(orderid);
            log.audit('obj',obj);

            if (Object.keys(obj).length <= 0)
                return;
            return obj
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
            try {
                let key = mapContext.key;
                let value = JSON.parse(mapContext.value);
                log.audit('map-key',key);
                log.audit('map-value',value);

                let backObj = {};

                //子公司
                let subsidiary = key.split('_')[0];
                //货币
                let currency = key.split('_')[1];
                //实体发票号码
                let invNumber = key.split('_')[2];
                //是否为主表
                let flag = key.split('_')[3];
                //审核实体发票日期
                let tranDate = key.split('_')[4];
                //备注
                let memo = invNumber + '已开票转税金';

                let journalObj = {
                    subsidiary: subsidiary,
                    currency: currency,
                    tranDate: tranDate,
                    memo: memo,
                    lines: []
                };

                //记录此次map涉及到的行
                let curLineKeyData = []

                for (let lineKey in value) {
                    //发票ID
                    let invId = lineKey.split('_')[0];
                    //初始唯一键
                    let lineId = lineKey.split('_')[1];
                    //单据类型
                    let type = lineKey.split('_')[2];
                    // //后续唯一键
                    // let endKey = lineKey.split('_')[2];
                    let backKey = invId + '_' + type;
                    let backLineKey = invId + '_' + lineId;
                    backObj[backKey] = backObj[backKey] || {};
                    backObj[backKey][backLineKey] = {};
                    curLineKeyData.push(backLineKey);

                    let line = value[lineKey];
                    if (!line.errorFlag) {
                        journalObj.lines.push(
                            {account: SWC_CONFIG_DATA.configData().S_ACCOUNT_YJSF_JXSE, debit: line.curAmount, credit: 0, memo: line.memo},//应交税费_应交增值税_进项税额
                            {account: SWC_CONFIG_DATA.configData().S_ACCOUNT_YJSF_JXSEWKP, debit: 0, credit: line.curAmount, memo: line.memo},//应交税费_应交增值税_进项税额-未开票
                        );
                    }

                    backObj[backKey][backLineKey].amount = line.curAmount;
                    backObj[backKey][backLineKey].invoiced = line.curInvoiced;
                    backObj[backKey][backLineKey].errorFlag = line.errorFlag;
                    backObj[backKey][backLineKey].message = line.message;
                }
                log.audit('生成日记账数据：journalObj',journalObj);
                if (journalObj.lines.length > 0) {
                    let jouId = createJournalEntry(journalObj);
                    log.audit('日记账jouId',jouId);
                    const jouRec = record.load({
                        type: 'journalentry',
                        id: jouId
                    });
                    var tranId = jouRec.getValue({
                        fieldId: 'tranid'
                    })
                }


                log.audit('backObj',backObj);
                log.audit('curLineKeyData',curLineKeyData);
                for (let backKey in backObj) {
                    for (let linKey in backObj[backKey]) {
                        if (curLineKeyData.indexOf(linKey) != -1) {
                            backObj[backKey][linKey].journal = tranId || '';
                            backObj[backKey][linKey].date = tranDate;
                        }
                    }

                    mapContext.write({
                        key: backKey + '_' + flag, // 确保 key 为字符串
                        value: backObj[backKey]
                    });
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
            log.audit('reduce-key',reduceContext.key);
            log.audit('reduce-value',reduceContext.values);
            let key = reduceContext.key;

            let value = mergeJSONStrings(reduceContext.values);
            //账单Id
            let billId = key.split('_')[0];
            //主表/子列表 标志
            let flag = key.split('_')[2];
            //单据类型
            let type = key.split('_')[1];
            if (type == 'VendBill') {
                type = "vendorbill"
            } else {
                type = "vendorcredit"
            }
            log.audit('reduce-key',key);
            log.audit('reduce-value',value);
            try {
                let rec = record.load({
                    type: type,
                    id: billId,
                    isDynamic: true
                });
                let count = rec.getLineCount({
                    sublistId: 'item'
                });
                let errorLineData = [];
                for (let i = 0;i < count;i++) {
                    rec.selectLine({
                        sublistId: 'item',
                        line: i
                    })
                    let lineId = rec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'line',
                    });
                    let lineKey = billId + '_' + lineId;

                    // let lineKey = rec.getCurrentSublistValue({
                    //     sublistId: 'item',
                    //     fieldId: 'id',
                    // });

                    log.audit('lineKey',lineKey);
                    if (lineKey in value) {
                        let lineObj = value[lineKey];
                        log.audit('lineObj',lineObj);
                        if (!lineObj.errorFlag) {
                            //反写日记账
                            let journal = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_swc_bill_taxjournal',
                            });
                            let curJournal = lineObj.journal + '审核日期：' + lineObj.date + ';';
                            //反写金额
                            let invoiced = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_swc_bill_invoiced',
                            });
                            let curAmount = Number(lineObj.invoiced);
                            if (flag == 'false') {
                                if (journal) {
                                    curJournal = journal + curJournal;
                                }
                                if (invoiced) {
                                    curAmount = invoiced + lineObj.invoiced;
                                }

                                rec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_bill_invoiced_cur',
                                    value: ''
                                });
                                rec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_bill_date',
                                    value: ''
                                });
                                rec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_bill_number',
                                    value: ''
                                });
                            }
                            // else {
                            //     rec.setValue({
                            //         fieldId: 'custbody_swc_bill_date_main',
                            //         value: ''
                            //     });
                            // }

                            log.audit('curJournal', curJournal);
                            log.audit('curAmount', curAmount);

                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_swc_bill_taxjournal',
                                value: curJournal
                            });
                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_swc_bill_invoiced',
                                value: curAmount
                            });

                            rec.commitLine({
                                sublistId: 'item'
                            });
                        } else {
                            errorLineData.push(lineId);
                        }
                        log.error('errorLineData',errorLineData);
                    }
                }
                if (errorLineData.length > 0) {
                    errorLineData = errorLineData.join(",");
                    rec.setValue({
                        fieldId: 'custbody_swc_bill_taxjournal_error',
                        value: `不允许超额开票： ${errorLineData}`
                    });
                }
                let bill = rec.save();
                log.audit('反写成功Id',bill);
            } catch (e) {
                log.error('error',e.message);
                record.submitFields({
                    type: type,
                    id: billId,
                    values: {
                        "custbody_swc_bill_taxjournal_error": e.message
                    }
                });
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

        //获取发票数据
        function getData(orderid) {
            var fittles = [
                ["type","anyof","VendBill","VendCred"],
                "AND",
                ["mainline","is","F"],
                "AND",
                ["taxline","is","F"],
                "AND",
                [
                    [["custbody_swc_bill_number_main","isnotempty",""],"AND",["custbody_swc_bill_date_main","isnotempty",""],"AND",["custcol_swc_bill_taxjournal","isempty",""]],
                    "OR",
                    ["custcol_swc_bill_number","isnotempty",""],"AND",["custcol_swc_bill_date","isnotempty",""]
                ],
                "AND",
                ["internalid","anyof",'555140','529918','466612']
            ]
            if (orderid) {
                fittles.push('AND');
                fittles.push(["internalid","anyof",orderid])
            }
            let vendorbillSearchObj = search.create({
                type: "transaction",
                title: '进项发票登记 数据检索' + new Date(),
                // settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                fittles,
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "transactionnumber", label: "事务处理编号"}),
                        search.createColumn({name: "amount", label: "金额"}),
                        search.createColumn({name: "taxamount", label: "金额（税）"}),
                        search.createColumn({
                            name: "rate",
                            join: "taxItem",
                            label: "税率"
                        }),
                        search.createColumn({name: "custcol_swc_bill_invoiced_cur", label: "本次开票金额"}),
                        search.createColumn({name: "custcol_swc_bill_invoiced", label: "已开票金额"}),
                        search.createColumn({name: "line", label: "行 Id"}),
                        search.createColumn({name: "item", label: "货品"}),
                        search.createColumn({name: "custbody_swc_vendor_prepayment_item", label: "货品编码"}),
                        search.createColumn({name: "custbody_swc_bill_number_main", label: "实体发票号码"}),
                        search.createColumn({name: "custcol_swc_bill_number", label: "实体发票号码"}),
                        search.createColumn({name: "custbody_swc_bill_date_main", label: "审核实体发票日期"}),
                        search.createColumn({name: "custcol_swc_bill_date", label: "审核实体发票日期"}),
                        search.createColumn({name: "subsidiarynohierarchy", label: "子公司（无层次结构）"}),
                        search.createColumn({name: "currency", label: "货币"}),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "CASE {type} WHEN '账单' THEN ABS({fxamount})+ABS(NVL({taxamount}/{exchangerate} , 0)) WHEN '账单贷项' THEN (ABS({fxamount})+ABS(NVL({taxamount}/{exchangerate} , 0))) * (-1) END",//"ABS({fxamount})+ABS(NVL({taxamount}/{exchangerate}, 0))",
                            label: "含税总金额"
                        }),
                        search.createColumn({name: "type", label: "类型"}),
                    ]
            });
            // var searchId = vendorbillSearchObj.save();
            // log.audit('searchId',searchId);

            let results = getAllResultsByPage({searchObj: vendorbillSearchObj}).results;//检索方法;

            let obj = {};
            results.forEach(value => {
                let numberMain = value.getValue({name: "custbody_swc_bill_number_main", label: "实体发票号码"});
                let dateMain = value.getValue({name: "custbody_swc_bill_date_main", label: "审核实体发票日期"});
                let numberLine = value.getValue({name: "custcol_swc_bill_number", label: "实体发票号码"});
                let dateLine = value.getValue({name: "custcol_swc_bill_date", label: "审核实体发票日期"});
                let lineType = value.getValue({name: "type", label: "类型"});
                //区分是CSV导入场景 还是 主表填写
                let flag = true;
                if (numberLine && dateLine)
                    flag = false;


                //主表信息
                //税额
                let tax = Math.abs(value.getValue({name: "taxamount", label: "金额（税）"}));
                if (lineType == 'VendBill') {
                    tax = tax
                } else {
                    tax = - tax
                }
                //子公司
                let sub = value.getValue({name: "subsidiarynohierarchy", label: "子公司（无层次结构）"});
                //货币
                let currency = value.getValue({name: "currency", label: "货币"});


                let lineObj = {};
                //行信息
                //单据ID
                let id = value.id;
                //行ID
                let lineId = value.getValue({name: "line", label: "行 Id"});

                let lineKey = id + '_' + lineId + '_' + lineType;
                //备注
                let billNumber = value.getValue({name: "transactionnumber", label: "事务处理编号"});
                let itemName = value.getText({name: "item", label: "货品"});
                let itemCode = value.getValue({name: "custbody_swc_vendor_prepayment_item", label: "货品编码"});
                let memo = billNumber + ',' + "货品" + ',' + itemName;

                let errorFlag = false;
                let message = '';
                //当 发票信息 在主表上时
                // 金额取每行的 税额
                // 不用取本次开票金额 和 已开票金额
                var curAmount = 0;
                log.audit('flag',flag);
                if (flag) {
                    var key = sub + '_' + currency + '_' + numberMain + '_' + flag + '_' + dateMain;
                    curAmount = tax;
                } else {
                    var curInvoiced = Number(value.getValue({name: "custcol_swc_bill_invoiced_cur", label: "本次开票金额"}));
                    var invoicedAmount = Number(value.getValue({name: "custcol_swc_bill_invoiced", label: "已开票金额"}));
                    var amountSum = MatchTool.fixed(Number(value.getValue({
                        name: "formulanumeric",
                        formula: "CASE {type} WHEN '账单' THEN ABS({fxamount})+ABS(NVL({taxamount}/{exchangerate} , 0)) WHEN '账单贷项' THEN (ABS({fxamount})+ABS(NVL({taxamount}/{exchangerate} , 0))) * (-1) END",//"ABS({fxamount})+ABS(NVL({taxamount}/{exchangerate}, 0))",
                        label: "含税总金额"
                    })),2);
                    var taxRate = value.getValue({
                        name: "rate",
                        join: "taxItem",
                        label: "税率"
                    });
                    //本次开票金额
                    curAmount = MatchTool.divN(MatchTool.mulN(curInvoiced,parseInt(taxRate)),100);
                    var key = sub + '_' + currency + '_' + numberLine + '_' + flag + '_' + dateLine;

                    log.audit('amountSum',amountSum);
                    log.audit('MatchTool.addN(curInvoiced,invoicedAmount)',MatchTool.addN(curInvoiced,invoicedAmount));
                    if (Math.abs(amountSum) < Math.abs(MatchTool.addN(curInvoiced,invoicedAmount))) {
                        errorFlag = true;
                        message = '不允许超额开票'
                    }
                }
                log.audit('curAmount',curAmount);
                log.audit('lineKey',lineKey);

                if (curAmount) {
                    if (lineType == 'VendBill') {
                        curAmount = curAmount
                    } else {
                        curAmount = - curAmount
                    }
                    obj[key] = obj[key] || {};
                    obj[key][lineKey] = {
                        curInvoiced: curInvoiced,
                        curAmount: curAmount,
                        memo: memo,
                        errorFlag: errorFlag,
                        message: message
                    }
                }
            });

            return obj
        }

        /**
         * 创建日记账
         * @param {Object} transactionData - 日记账数据
         * @returns {number} - 返回创建的日记账的内部 ID
         */
        function createJournalEntry(transactionData) {
            var journalEntry = record.create({
                type: record.Type.JOURNAL_ENTRY,
                isDynamic: true,
            });

            if (transactionData.subsidiary) journalEntry.setValue({
                fieldId: 'subsidiary',
                value: transactionData.subsidiary,
            });

            if (transactionData.tranDate) journalEntry.setText({
                fieldId: 'trandate',
                text: transactionData.tranDate,
            });

            if (transactionData.memo) journalEntry.setValue({
                fieldId: 'memo',
                value: transactionData.memo,
            });

            if (transactionData.currency) journalEntry.setValue({
                fieldId: 'currency',
                value: transactionData.currency,
            });

            //日记账类型
            journalEntry.setValue({
                fieldId: 'custbody_swc_journal_type',
                value: 3,//结转税金日记账
            });

            journalEntry.setValue({
                fieldId: 'approvalstatus',
                value: 2,//已审批
            });

            // Add lines
            transactionData.lines.forEach(function(line, index) {
                journalEntry.selectNewLine({
                    sublistId: 'line',
                });

                journalEntry.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'account',
                    value: line.account,
                });

                journalEntry.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'debit',
                    value: line.debit,
                });

                journalEntry.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'credit',
                    value: line.credit,
                });

                journalEntry.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'memo',
                    value: line.memo,
                });

                journalEntry.commitLine({
                    sublistId: 'line',
                });
            });

            var journalEntryId = journalEntry.save();
            return journalEntryId;
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

        function formatDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function mergeJSONStrings(jsonStrings) {
            const result = {};

            jsonStrings.forEach((str, index) => {
                try {
                    const obj = JSON.parse(str);

                    Object.keys(obj).forEach(key => {
                        // 如果键已存在，进行特殊处理（合并或跳过）
                        if (result.hasOwnProperty(key)) {
                            // 根据需求选择：跳过、覆盖或合并对象
                            console.warn(`键 ${key} 已存在，跳过重复键`);
                            // 或者合并对象内容
                            // result[key] = { ...result[key], ...obj[key] };
                        } else {
                            result[key] = obj[key];
                        }
                    });

                } catch (e) {
                    console.error(`解析第 ${index} 个JSON字符串失败:`, e);
                }
            });

            return result;
        }

        return {getInputData, map, reduce, summarize};

    });