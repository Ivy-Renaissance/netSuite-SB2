/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime', 'N/search'],
    (record, runtime, search) => {
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
            var obj = getNeedData();
            log.audit('obj',obj);
            if (Object.keys(obj).length < 0) return;
            return obj
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
            let key = mapContext.key;
            let value = JSON.parse(mapContext.value);
            log.audit('map-key',key);
            log.audit('map-value',value);
            try {

                if (!value.wyflag && !value.dxflag) {
                    //取账单上 付款条件（供应商付款条件为多选）
                    let terms = value.terms;

                    if (!terms) {
                        terms = value.creTerms;
                        record.submitFields({
                            type: "vendorbill",
                            id: key,
                            values: {
                                "custbody_swc_vendor_payment_terms": terms//创建状态=处理中
                            }
                        })
                    }

                    log.audit('terms', terms);
                    //有来源的情况
                    var JZData = '';
                    var errorMsg = '';

                    if (terms) {
                        //付款条件-规则配置表
                        var configObj;
                        configObj = searchConfig(terms);
                        log.audit('configObj', configObj);
                        var date = value.date;
                        //判断参考日期是否为空
                        if (date) {
                            let baseDate = new Date(date);
                            // 1. 判断 config_adddays 是否为空
                            // 注意：此处“为空”包括 undefined、null、空字符串；0 或 '0' 视为有值
                            if (configObj.config_adddays !== undefined && configObj.config_adddays !== null &&
                                configObj.config_adddays !== '') {
                                let days = parseInt(configObj.config_adddays, 10);
                                log.audit('days', days);
                                if (!isNaN(days)) {
                                    baseDate.setDate(baseDate.getDate() + days);
                                }
                                JZData = formatDate(baseDate);
                            } else {
                                // 2. config_adddays 为空，判断 config_months
                                if (configObj.config_months) {
                                    let targetDate = new Date(baseDate);
                                    log.audit('targetDate1', targetDate);
                                    // config_months == 2 表示次月，否则（包括1或其他）视为本月
                                    if (configObj.config_months == 2) {
                                        targetDate.setMonth(targetDate.getMonth() + 1);
                                        log.audit('targetDate2', targetDate);
                                    }
                                    if (configObj.config_endflag) {
                                        // 取月底日期：当月最后一天
                                        targetDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
                                        log.audit('targetDate3', targetDate);
                                    } else {
                                        let day = configObj.config_day;
                                        if (day >= 1 && day <= 31) {
                                            // 获取当月最大天数，避免超出范围
                                            let maxDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1,
                                                0).getDate();
                                            let setDay = Math.min(day, maxDay);
                                            targetDate.setDate(setDay);
                                        }
                                    }
                                    JZData = formatDate(targetDate);
                                } else {
                                    // config_months 也为空，结果也为空
                                    JZData = '';
                                    errorMsg = '付款条件-规则配置表';
                                }
                            }
                        } else {
                            JZData = ''; // 如果参考日期为空，结果也为空
                            errorMsg = '由业务手动补充参考日期/截至日期';
                        }

                        if (errorMsg) {
                            record.submitFields({
                                type: 'vendorbill',
                                id: key,
                                values: {
                                    "custbody_swc_terms_error": errorMsg,
                                }
                            });
                        } else {
                            record.submitFields({
                                type: 'vendorbill',
                                id: key,
                                values: {
                                    "duedate": JZData,
                                    "custbody_swc_search_duedate": JZData,
                                    "custbody_swc_bill_term_flag": true,
                                    "custbody_swc_terms_error": '',
                                }
                            });
                        }

                    }
                } else {
                    if (value.wyflag) {
                        record.submitFields({
                            type: 'vendorbill',
                            id: key,
                            values: {
                                "duedate": value.date,
                                "custbody_swc_search_duedate": value.date,
                                "custbody_swc_bill_term_flag": true,
                            }
                        });
                    }

                    if (value.dxflag) {
                        record.submitFields({
                            type: value.dxtype,
                            id: key,
                            values: {
                                "duedate": value.date,
                                "custbody_swc_search_duedate": value.date,
                                "custbody_swc_bill_term_flag": true,
                            }
                        });
                    }
                }
            } catch (e) {
                record.submitFields({
                    type: 'vendorbill',
                    id: key,
                    values: {
                        "custbody_swc_terms_error": e.message,
                    }
                });
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
            log.audit('结束');
        }

        function getNeedData() {
            var obj = {};

            //有来源检索
            const vendorbillSearchObj = search.create({
                type: "vendorbill",
                title: '账期 有来源账单检索' + new Date(),
                settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","VendBill"],
                        "AND",
                        ["mainline","is","T"],
                        "AND",
                        ["formuladate: CASE {custbody_swc_vendor_payment_terms.custrecord_swc_payconfig_dateid}        WHEN 'trandate' THEN {trandate}        WHEN 'custrecord_swc_wl_etd' THEN {custbody_swc_wl_no.custrecord_swc_wl_etd}        WHEN 'custrecord_swc_wl_eta' THEN {custbody_swc_wl_no.custrecord_swc_wl_eta} WHEN 'custrecord_swc_wl_itemno' THEN {custbody_swc_wl_no.custrecord_swc_wl_itemno} END","isnotempty",""],
                        "AND",
                        ["custbody_swc_bill_term_flag","is","F"],
                        "AND",
                        ["createdfrom","noneof","@NONE@"],
                        // "AND",
                        // ["duedate","isempty",""],
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({
                            name: "custbody_swc_vendor_payment_terms",
                            join: "createdFrom",
                            label: "付款条件"
                        }),
                        search.createColumn({name: "custbody_swc_vendor_payment_terms", label: "付款条件"}),
                        search.createColumn({
                            name: "formuladate",
                            formula: "CASE {custbody_swc_vendor_payment_terms.custrecord_swc_payconfig_dateid}     WHEN 'trandate' THEN {trandate}     WHEN 'custrecord_swc_wl_etd' THEN {custbody_swc_wl_no.custrecord_swc_wl_etd}     WHEN 'custrecord_swc_wl_eta' THEN {custbody_swc_wl_no.custrecord_swc_wl_eta} WHEN 'custrecord_swc_wl_itemno' THEN {custbody_swc_wl_no.custrecord_swc_wl_itemno} END",
                            label: "公式（日期）"
                        }),
                        // search.createColumn({name: "custbody_swc_bill_term_flag", label: "是否进行账期处理"}),
                        search.createColumn({name: "custbody_swc_terms_error", label: "账期-错误消息"})
                    ]
            });

            // var searchId1 = vendorbillSearchObj.save();
            // log.audit('searchId1',searchId1);

            var results = getAllResults(vendorbillSearchObj);
            for (let i = 0;i < results.length;i++) {
                var value = results[i];
                var id = value.getValue({name: "internalid", label: "内部 ID"});
                var creTerms = value.getValue({
                    name: "custbody_swc_vendor_payment_terms",
                    join: "createdFrom",
                    label: "付款条件"
                });
                var terms = value.getValue({name: "custbody_swc_vendor_payment_terms", label: "付款条件"});
                var date = value.getValue({
                    name: "formuladate",
                    formula: "CASE {custbody_swc_vendor_payment_terms.custrecord_swc_payconfig_dateid}     WHEN 'trandate' THEN {trandate}     WHEN 'custrecord_swc_wl_etd' THEN {custbody_swc_wl_no.custrecord_swc_wl_etd}     WHEN 'custrecord_swc_wl_eta' THEN {custbody_swc_wl_no.custrecord_swc_wl_eta} WHEN 'custrecord_swc_wl_itemno' THEN {custbody_swc_wl_no.custrecord_swc_wl_itemno} END",
                    label: "公式（日期）"
                });
                var errorMsg = value.getValue({name: "custbody_swc_terms_error", label: "账期-错误消息"});

                obj[id] = {
                    "wyflag": false,
                    "dxflag": false,
                    "creTerms": creTerms,
                    "terms": terms,
                    "date": date,
                    "errorMsg": errorMsg
                }
            }

            const vendorbillSearchObj2 = search.create({
                type: "vendorbill",
                title: '账期 无来源账单检索' + new Date(),
                settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","VendBill"],
                        "AND",
                        ["mainline","is","T"],
                        "AND",
                        ["custbody_swc_bill_term_flag","is","F"],
                        "AND",
                        ["createdfrom","anyof","@NONE@"],
                        // "AND",
                        // ["duedate","isempty",""],
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "trandate", label: "日期"})
                    ]
            });
            // var searchId2 = vendorbillSearchObj2.save();
            // log.audit('searchId2',searchId2);
            var results = getAllResults(vendorbillSearchObj2);
            for (let i = 0;i < results.length;i++) {
                var value = results[i];
                var id = value.getValue({name: "internalid", label: "内部 ID"});
                var date = value.getValue({name: "trandate", label: "日期"});
                obj[id] = {
                    "wyflag": true,
                    "dxflag": false,
                    "date": date
                }
            }

            //账单贷项
            const vendorcreditSearchObj = search.create({
                type: "vendorcredit",
                title: '账期 贷项检索' + new Date(),
                settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","VendCred"],
                        "AND",
                        ["custbody_swc_bill_term_flag","is","F"],
                        "AND",
                        ["mainline","is","T"],
                        "AND",
                        ["duedate","isempty",""]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "trandate", label: "日期"})
                    ]
            });
            // var searchId3 = vendorcreditSearchObj.save();
            // log.audit('searchId3',searchId3);
            var results = getAllResults(vendorcreditSearchObj);
            for (let i = 0;i < results.length;i++) {
                var value = results[i];
                var id = value.getValue({name: "internalid", label: "内部 ID"});
                var date = value.getValue({name: "trandate", label: "日期"});
                obj[id] = {
                    "wyflag": false,
                    "dxflag": true,
                    "dxtype": 'vendorcredit',
                    "date": date
                }
            }

            return obj
        }

        /**
         * 通用检索方法
         * @param mySearch
         * @returns {[]}
         */
        function getAllResults(mySearch) {
            var resultSet = mySearch.run();
            var resultArr = [];
            var start = 0;
            var step = 1000;
            var results = resultSet.getRange({
                start: start,
                end: step
            });
            while (results && results.length > 0) {
                resultArr = resultArr.concat(results);
                start = Number(start) + Number(step);
                results = resultSet.getRange({
                    start: start,
                    end: Number(start) + Number(step)
                });
            }
            return resultArr;
        }

        function searchConfig(terms) {
            //付款条件-规则配置表搜索
            const customrecord_swc_payterms_configSearchObj = search.create({
                type: "customrecord_swc_payterms_config",
                filters:
                    [
                        ["internalid","anyof",terms]
                    ],
                columns:
                    [
                        search.createColumn({name: "name", label: "名称"}),
                        search.createColumn({name: "custrecord_swc_payconfig_dateid", label: "参考日期ID"}),
                        search.createColumn({name: "custrecord_swc_payconfig_adddays", label: "参考日期-加几天"}),
                        search.createColumn({name: "custrecord_swc_payconfig_months", label: "本月/次月"}),
                        search.createColumn({name: "custrecord_swc_payconfig_day", label: "本月/次月-几号"}),
                        search.createColumn({name: "custrecord_swc_payconfig_endflag", label: "月底"})
                    ]
            });

            var obj = {};
            customrecord_swc_payterms_configSearchObj.run().each(function(result){
                var config_filedId = result.getValue({name: "custrecord_swc_payconfig_dateid", label: "参考日期ID"});
                var config_adddays = result.getValue({name: "custrecord_swc_payconfig_adddays", label: "参考日期-加几天"}) || '';
                var config_months = result.getValue({name: "custrecord_swc_payconfig_months", label: "本月/次月"}) || '';
                var config_day= result.getValue({name: "custrecord_swc_payconfig_day", label: "本月/次月-几号"}) || '';
                var config_endflag = result.getValue({name: "custrecord_swc_payconfig_endflag", label: "月底"});

                obj = {
                    'config_filedId': config_filedId,
                    'config_adddays': config_adddays,
                    'config_months': config_months,
                    'config_day': config_day,
                    'config_endflag': config_endflag,
                }
                return true;
            });

            return obj;
        }

        function formatDate(date) {
            if (!(date instanceof Date) || isNaN(date)) return '';
            let year = date.getFullYear();
            let month = date.getMonth() + 1;
            let day = date.getDate();
            return year + '-' + month + '-' + day;
        }

        return {getInputData, map, reduce, summarize}

    });
