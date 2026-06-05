/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @description 定时执行【Meta接口PO】自定义记录，生成SO
 */
define(['N/record', 'N/util', 'N/search', 'N/format', 'N/task', '../common/SWC_CONFIG_DATA'],
    (record, util, search, format,task, SWC_CONFIG_DATA) => {
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
                var currencyObj = getCurrencyObj();
                log.audit('currencyObj',currencyObj);
                var mainJson = getData(currencyObj);
                log.audit('mainJson',mainJson);

                return mainJson;
            } catch (e) {
                log.error("getInptData-error",e.message);
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
                var value = JSON.parse(mapContext.value);
                log.audit('value',value);
                var key = mapContext.key;

                var transactionData = {
                    subsidiary: value.subsidiary,
                    trandate: new Date(),
                    platfm: value.platfm,
                    currency: value.currency,
                };

                var lines = [];

                //亚马逊平台
                if (value.platform == SWC_CONFIG_DATA.configData().PLATFORM_AMAZON) {
                    if (value.ac_6001_01_01) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_01,
                                credit: 0,
                                memo: 'ac_6001_01_01'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_01,
                                memo: 'ac_6001_01_01'
                            },
                        )
                    }
                    if (value.ac_6001_01_03) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_03,
                                credit: 0,
                                memo: 'ac_6001_01_03'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_03,
                                memo: 'ac_6001_01_03'
                            },
                        )
                    }
                    if (value.ac_6001_01_02) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_02,
                                credit: 0,
                                memo: 'ac_6001_01_02'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_02,
                                memo: 'ac_6001_01_02'
                            },
                        )
                    }
                    if (value.ac_6601_03) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_03,
                                credit: 0,
                                memo: 'ac_6601_03'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_03,
                                memo: 'ac_6601_03'
                            },
                        )
                    }
                    if (value.ac_6601_05) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_05,
                                credit: 0,
                                memo: 'ac_6601_05'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_05,
                                memo: 'ac_6601_05'
                            },
                        )
                    }
                }

                //Wayfair
                if (value.platform == SWC_CONFIG_DATA.configData().PLATFORM_WAYFAIR) {
                    if (value.tax) {
                        lines.push(
                            {
                                account: 206,//待定
                                debit: value.tax,
                                credit: 0,
                                memo: 'tax'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.tax,
                                memo: 'tax'
                            },
                        )
                    }
                    if (value.ac_6001_01_01) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_01,
                                credit: 0,
                                memo: 'ac_6001_01_01'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_01,
                                memo: 'ac_6001_01_01'
                            },
                        )
                    }
                    if (value.ac_6001_01_03) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_03,
                                credit: 0,
                                memo: 'ac_6001_01_03'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_03,
                                memo: 'ac_6001_01_03'
                            },
                        )
                    }
                    if (value.ac_6001_01_02) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_02,
                                credit: 0,
                                memo: 'ac_6001_01_02'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_02,
                                memo: 'ac_6001_01_02'
                            },
                        )
                    }
                    if (value.ac_6601_01_01) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_01_01,
                                credit: 0,
                                memo: 'ac_6601_01_01'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_01_01,
                                memo: 'ac_6601_01_01'
                            },
                        )
                    }
                    if (value.ac_6601_04) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_04,
                                credit: 0,
                                memo: 'ac_6601_04'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_04,
                                memo: 'ac_6601_04'
                            },
                        )
                    }
                }

                //Home Depot
                if (value.platform == SWC_CONFIG_DATA.configData().PLATFORM_HOMEDEPOT) {
                    if (value.ac_6001_01_01) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_01,
                                credit: 0,
                                memo: 'ac_6001_01_01'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_01,
                                memo: 'ac_6001_01_01'
                            },
                        )
                    }
                    if (value.ac_6001_01_03) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_03,
                                credit: 0,
                                memo: 'ac_6001_01_03'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_03,
                                memo: 'ac_6001_01_03'
                            },
                        )
                    }
                    if (value.ac_6001_01_02) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_02,
                                credit: 0,
                                memo: 'ac_6001_01_02'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_02,
                                memo: 'ac_6001_01_02'
                            },
                        )
                    }
                    if (value.ac_6601_03) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_03,
                                credit: 0,
                                memo: 'ac_6601_03'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_03,
                                memo: 'ac_6601_03'
                            },
                        )
                    }
                }

                //Lowe‘s
                if (value.platform == SWC_CONFIG_DATA.configData().PLATFORM_LOWE) {
                    if (value.ac_6001_01_01) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_01,
                                credit: 0,
                                memo: 'ac_6001_01_01'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_01,
                                memo: 'ac_6001_01_01'
                            },
                        )
                    }
                    if (value.ac_6001_01_03) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_03,
                                credit: 0,
                                memo: 'ac_6001_01_03'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_03,
                                memo: 'ac_6001_01_03'
                            },
                        )
                    }
                    if (value.ac_6001_01_02) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_02,
                                credit: 0,
                                memo: 'ac_6001_01_02'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_02,
                                memo: 'ac_6001_01_02'
                            },
                        )
                    }
                    if (value.ac_6601_02) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_02,
                                credit: 0,
                                memo: 'ac_6601_02'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_02,
                                memo: 'ac_6601_02'
                            },
                        )
                    }
                    if (value.ac_6601_03) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_03,
                                credit: 0,
                                memo: 'ac_6601_03'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_03,
                                memo: 'ac_6601_03'
                            },
                        )
                    }
                }

                //Manomano
                //Kaufland
                //Leroy Merlin
                if (value.platform == SWC_CONFIG_DATA.configData().PLATFORM_LEROYMERLIN) {
                    if (value.ac_6601_02) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_02,
                                credit: 0,
                                memo: 'ac_6601_02'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_02,
                                memo: 'ac_6601_02'
                            },
                        )
                    }
                }
                //Rona
                //Shopify
                //Walmart
                //Houzz
                if (value.platform == SWC_CONFIG_DATA.configData().PLATFORM_HOUZZ) {
                    if (value.tax) {
                        lines.push(
                            {
                                account: 206,//待定
                                debit: value.tax,
                                credit: 0,
                                memo: 'tax'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.tax,
                                memo: 'tax'
                            },
                        )
                    }
                    if (value.ac_6001_01_01) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_01,
                                credit: 0,
                                memo: 'ac_6001_01_01'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_01,
                                memo: 'ac_6001_01_01'
                            },
                        )
                    }
                    if (value.ac_6001_01_02) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_02,
                                credit: 0,
                                memo: 'ac_6001_01_02'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_02,
                                memo: 'ac_6001_01_02'
                            },
                        )
                    }
                    if (value.ac_6601_02) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_02,
                                credit: 0,
                                memo: 'ac_6601_02'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_02,
                                memo: 'ac_6601_02'
                            },
                        )
                    }
                }
                //Macy's
                if (value.platform == SWC_CONFIG_DATA.configData().PLATFORM_Macy) {
                    if (value.tax) {
                        lines.push(
                            {
                                account: 206,//待定
                                debit: value.tax,
                                credit: 0,
                                memo: 'tax'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.tax,
                                memo: 'tax'
                            },
                        )
                    }
                    if (value.ac_6001_01_01) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_01,
                                credit: 0,
                                memo: 'ac_6001_01_01'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_01,
                                memo: 'ac_6001_01_01'
                            },
                        )
                    }
                    if (value.ac_6001_01_02) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_02,
                                credit: 0,
                                memo: 'ac_6001_01_02'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_02,
                                memo: 'ac_6001_01_02'
                            },
                        )
                    }
                    if (value.ac_6601_01_04) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_01_04,
                                credit: 0,
                                memo: 'ac_6601_01_04'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_01_04,
                                memo: 'ac_6601_01_04'
                            },
                        )
                    }
                    if (value.ac_6601_02) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_02,
                                credit: 0,
                                memo: 'ac_6601_02'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_02,
                                memo: 'ac_6601_02'
                            },
                        )
                    }
                    if (value.ac_6601_11) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_11,
                                credit: 0,
                                memo: 'ac_6601_11'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_11,
                                memo: 'ac_6601_11'
                            },
                        )
                    }
                }
                //Overstock
                if (value.platform == SWC_CONFIG_DATA.configData().PLATFORM_OBERSTOCK) {
                    if (value.ac_6001_01_01) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_01,
                                credit: 0,
                                memo: 'ac_6001_01_01'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_01,
                                memo: 'ac_6001_01_01'
                            },
                        )
                    }
                    if (value.ac_6001_01_03) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_03,
                                credit: 0,
                                memo: 'ac_6001_01_03'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_03,
                                memo: 'ac_6001_01_03'
                            },
                        )
                    }
                    if (value.ac_6001_01_02) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6001_01_02,
                                credit: 0,
                                memo: 'ac_6001_01_02'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6001_01_02,
                                memo: 'ac_6001_01_02'
                            },
                        )
                    }
                    if (value.ac_6601_02) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_02,
                                credit: 0,
                                memo: 'ac_6601_02'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_02,
                                memo: 'ac_6601_02'
                            },
                        )
                    }
                    if (value.ac_6601_03) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_03,
                                credit: 0,
                                memo: 'ac_6601_03'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_03,
                                memo: 'ac_6601_03'
                            },
                        )
                    }
                    if (value.ac_6601_11) {
                        lines.push(
                            {
                                account: 206,
                                debit: value.ac_6601_11,
                                credit: 0,
                                memo: 'ac_6601_11'
                            },
                            {
                                account: 199,
                                debit: 0,
                                credit: value.ac_6601_11,
                                memo: 'ac_6601_11'
                            },
                        )
                    }
                }
                //Temu
                //Cdiscount
                //ebay
                //Ozon
                //Tiktok

                transactionData.lines = lines;
                log.audit('transactionData',transactionData);
                var journalId = createJournalEntry(transactionData);

                record.submitFields({
                    type: 'customrecord_swc_xl_settlemenreport',
                    id: key,
                    values: {
                        "custrecord_swc_settlemenreport_journal": journalId
                    }
                });
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
            var contents = '';
            //异常信息整理
            summaryContext.output.iterator().each(function(key, value) {
                contents += (key + ': ' + value + '\n');
                return true;
            });
            log.audit('contents',contents);
        }

        function getData(currencyObj) {
            var customrecord_swc_xl_settlemenreportSearchObj = search.create({
                type: "customrecord_swc_xl_settlemenreport",
                filters:
                    [
                        ["custrecord_swc_settlemenreport_journal","anyof","@NONE@"]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_platform", label: "平台"}),
                        search.createColumn({name: "custrecord_swc_shop", label: "店铺"}),
                        search.createColumn({name: "custrecord_swc_settlement_documentid", label: "结算单据编号"}),
                        search.createColumn({name: "custrecord_swc_xl_currency", label: "币种"}),
                        search.createColumn({name: "custrecord_swc_tax", label: "税金"}),
                        search.createColumn({name: "custrecord_swc_ac_6001_01_01", label: "6001.01.01营业收入_平台销售收入"}),
                        search.createColumn({name: "custrecord_swc_ac_6001_01_03", label: "6001.01.03营业收入_贸易折扣"}),
                        search.createColumn({name: "custrecord_swc_ac_6001_01_02", label: "6001.01.02营业收入_平台销售退款"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_01_01", label: "6601.01.01快递费"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_01_02", label: "6601.01.02卡车费"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_01_03", label: "6601.01.03仓库调拨费"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_01_04", label: "6601.01.04其他"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_02", label: "6601.02平台佣金"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_03", label: "6601.03广告费"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_04", label: "6601.04破损费"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_05", label: "6601.05订阅费"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_10", label: "6601.10软件工具插件等"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_06", label: "6601.06操作手续费"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_07_01", label: "6601.07.01测评佣金"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_07_02", label: "6601.07.02测评产品成本"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_07_03", label: "6601.07.03测评尾程运费"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_08_01", label: "6601.08.01产品成本"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_08_02", label: "6601.08.02处置费"}),
                        search.createColumn({name: "custrecord_swc_ac_6601_11", label: "6601.11其他费用"}),
                        search.createColumn({
                            name: "subsidiarynohierarchy",
                            join: "CUSTRECORD_SWC_SHOP",
                            label: "主要子公司（无层次结构）"
                        })
                    ]
            });

            let results = getAllResults(customrecord_swc_xl_settlemenreportSearchObj);

            var obj = {};
            results.forEach(value => {
                var detailsObj = {};//明细行存值
                var id = value.id;
                var platform = value.getValue({name: "custrecord_swc_platform", label: "平台"});
                var settlement = value.getValue({name: "custrecord_swc_settlement_documentid", label: "结算单据编号"});
                var subsidiaryId = value.getValue({
                    name: "subsidiarynohierarchy",
                    join: "CUSTRECORD_SWC_SHOP",
                    label: "主要子公司（无层次结构）"
                });
                var currency = value.getValue({name: "custrecord_swc_xl_currency", label: "币种"});
                detailsObj.platform = platform;
                detailsObj.settlement = settlement;
                detailsObj.subsidiary = subsidiaryId;
                if (currency in currencyObj) {
                    currency = currencyObj[currency];
                }
                detailsObj.currency = currency;
                detailsObj.tax = value.getValue({name: "custrecord_swc_tax", label: "税金"});
                detailsObj.ac_6001_01_01 = value.getValue({name: "custrecord_swc_ac_6001_01_01", label: "6001.01.01营业收入_平台销售收入"});
                detailsObj.ac_6001_01_03 = value.getValue({name: "custrecord_swc_ac_6001_01_03", label: "6001.01.03营业收入_贸易折扣"});
                detailsObj.ac_6001_01_02 = value.getValue({name: "custrecord_swc_ac_6001_01_02", label: "6001.01.02营业收入_平台销售退款"});
                detailsObj.ac_6601_01_01 = value.getValue({name: "custrecord_swc_ac_6601_01_01", label: "6601.01.01快递费"});
                detailsObj.ac_6601_01_02 = value.getValue({name: "custrecord_swc_ac_6601_01_02", label: "6601.01.02卡车费"});
                detailsObj.ac_6601_01_03 = value.getValue({name: "custrecord_swc_ac_6601_01_03", label: "6601.01.03仓库调拨费"});
                detailsObj.ac_6601_01_04 = value.getValue({name: "custrecord_swc_ac_6601_01_04", label: "6601.01.04其他"});
                detailsObj.ac_6601_02 = value.getValue({name: "custrecord_swc_ac_6601_02", label: "6601.02平台佣金"});
                detailsObj.ac_6601_03 = value.getValue({name: "custrecord_swc_ac_6601_03", label: "6601.03广告费"});
                detailsObj.ac_6601_04 = value.getValue({name: "custrecord_swc_ac_6601_04", label: "6601.04破损费"});
                detailsObj.ac_6601_05 = value.getValue({name: "custrecord_swc_ac_6601_05", label: "6601.05订阅费"});
                detailsObj.ac_6601_10 = value.getValue({name: "custrecord_swc_ac_6601_10", label: "6601.10软件工具插件等"});
                detailsObj.ac_6601_06 = value.getValue({name: "custrecord_swc_ac_6601_06", label: "6601.06操作手续费"});
                detailsObj.ac_6601_07_01 = value.getValue({name: "custrecord_swc_ac_6601_07_01", label: "6601.07.01测评佣金"});
                detailsObj.ac_6601_07_02 = value.getValue({name: "custrecord_swc_ac_6601_07_02", label: "6601.07.02测评产品成本"});
                detailsObj.ac_6601_07_03 = value.getValue({name: "custrecord_swc_ac_6601_07_03", label: "6601.07.03测评尾程运费"});
                detailsObj.ac_6601_08_01 = value.getValue({name: "custrecord_swc_ac_6601_08_01", label: "6601.08.01产品成本"});
                detailsObj.ac_6601_08_02 = value.getValue({name: "custrecord_swc_ac_6601_08_02", label: "6601.08.02处置费"});
                detailsObj.ac_6601_11 = value.getValue({name: "custrecord_swc_ac_6601_11", label: "6601.11其他费用"});
                // //houzz
                // if (platform == SWC_CONFIG_DATA.configData().PLATFORM_HOUZZ) {
                //     detailsObj.tax = value.getValue({name: "custrecord_swc_tax", label: "税金"});
                //     detailsObj.ac_6001_01_01 = value.getValue({name: "custrecord_swc_ac_6001_01_01", label: "6001.01.01营业收入_平台销售收入"});
                //     detailsObj.ac_6001_01_02 = value.getValue({name: "custrecord_swc_ac_6001_01_02", label: "6001.01.02营业收入_平台销售退款"});
                //     detailsObj.ac_6601_02 = value.getValue({name: "custrecord_swc_ac_6601_02", label: "6601.02平台佣金"});
                // }
                //
                // //Wayfair
                // if (platform == SWC_CONFIG_DATA.configData().PLATFORM_WAYFAIR) {
                //     detailsObj.ac_6001_01_01 = value.getValue({name: "custrecord_swc_ac_6001_01_01", label: "6001.01.01营业收入_平台销售收入"});
                //     detailsObj.ac_6001_01_03 = value.getValue({name: "custrecord_swc_ac_6001_01_03", label: "6001.01.03营业收入_贸易折扣"});
                //     detailsObj.ac_6001_01_02 = value.getValue({name: "custrecord_swc_ac_6001_01_02", label: "6001.01.02营业收入_平台销售退款"});
                //     detailsObj.ac_6601_03 = value.getValue({name: "custrecord_swc_ac_6601_03", label: "6601.03广告费"});
                //     detailsObj.ac_6601_05 = value.getValue({name: "custrecord_swc_ac_6601_05", label: "6601.05订阅费"});
                // }
                //
                // //亚马逊
                // if (platform == SWC_CONFIG_DATA.configData().PLATFORM_AMAZON) {
                //     detailsObj.ac_6001_01_01 = value.getValue({name: "custrecord_swc_ac_6001_01_01", label: "6001.01.01营业收入_平台销售收入"});
                //     detailsObj.ac_6001_01_03 = value.getValue({name: "custrecord_swc_ac_6001_01_03", label: "6001.01.03营业收入_贸易折扣"});
                //     detailsObj.ac_6001_01_02 = value.getValue({name: "custrecord_swc_ac_6001_01_02", label: "6001.01.02营业收入_平台销售退款"});
                //     detailsObj.ac_6601_03 = value.getValue({name: "custrecord_swc_ac_6601_03", label: "6601.03广告费"});
                //     detailsObj.ac_6601_05 = value.getValue({name: "custrecord_swc_ac_6601_05", label: "6601.05订阅费"});
                // }
                obj[id] = detailsObj;
            });

            return obj;
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

            if (transactionData.trandate) journalEntry.setValue({
                fieldId: 'trandate',
                value: transactionData.trandate,
            });

            if (transactionData.memo) journalEntry.setValue({
                fieldId: 'memo',
                value: transactionData.memo,
            });

            if (transactionData.currency) journalEntry.setValue({
                fieldId: 'currency',
                value: Number(transactionData.currency),
            });

            if (transactionData.platfm) journalEntry.setValue({
                fieldId: 'cseg_hx_fm_platfm',
                value: transactionData.platfm,
            });//销售平台
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

                if (line.department) {
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'department',
                        value: line.department,
                    });//部门
                }

                if (line.name) {
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'entity',
                        value: line.name,
                    });//名称
                }

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

        function getAllResults(srch) {
            var results = srch.run();
            var searchResults = [];
            var searchid = 0;
            do {
                var resultslice = results.getRange({
                    start: searchid,
                    end: searchid + 1000
                });
                resultslice.forEach(function (slice) {
                    searchResults.push(slice);
                    searchid++;
                });

            } while (resultslice.length >= 1000);
            return searchResults;
        }

        function getCurrencyObj() {
            var currencySearchObj = search.create({
                type: "currency",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "name", label: "名称"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });

            let results = getAllResults(currencySearchObj);

            var obj = {};
            results.forEach(value => {
                var name = value.getValue({name: "name", label: "名称"});
                obj[name] = value.id;
            });

            return obj
        }
        return {getInputData, map, summarize}

    });