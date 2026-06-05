/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime', 'N/search', '../common/SWC_CONFIG_DATA'],

    (record, runtime, search,SWC_CONFIG_DATA) => {
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
            //检索原数据
            var obj = getOverData();
            if (Object.keys(obj).length <= 0) return;
            log.audit('obj',obj);
            return obj;
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
            try {
                //var key = value.id + '_' + sub + '_' + currency + '_' + date;
                let sub = key.split('_')[0];
                let currency = key.split('_')[1];

                //创建日记账
                let jouRec = record.create({
                    type: 'journalentry',
                    isDynamic: true
                });

                //设置子公司
                jouRec.setValue({
                    fieldId: 'subsidiary',
                    value: sub
                });
                //设置货币
                jouRec.setValue({
                    fieldId: 'currency',
                    value: currency
                });
                //设置日期
                // 获取当前日期
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth(); // 0 表示一月

                // 本月月底：下个月的第 0 天
                const lastDayOfMonth = new Date(year, month + 1, 0);

                // 次月月初：下个月的第 1 天
                const firstDayOfNextMonth = new Date(year, month + 1, 1);
                jouRec.setValue({
                    fieldId: 'trandate',
                    value: lastDayOfMonth //本月月底
                });
                jouRec.setValue({
                    fieldId: 'reversaldate',
                    value: firstDayOfNextMonth //次月月初
                });

                for (let i = 0;i < value.linedata.length;i++) {
                    let line = value.linedata[i];
                    jouRec.selectNewLine({
                        sublistId: 'line',
                    });

                    jouRec.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        value: line.account,
                    });

                    jouRec.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'debit',
                        value: line.debit,
                    });


                    jouRec.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'credit',
                        value: line.credit,
                    });

                    jouRec.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'memo',
                        value: line.memo,
                    });

                    jouRec.commitLine({
                        sublistId: 'line',
                    });
                }

                var jouId = jouRec.save();

                log.audit('jouId',jouId);


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

        function getOverData() {
            //对应科目检索
            const customrecord_swc_rule_mapping_tableSearchObj = search.create({
                type: "customrecord_swc_rule_mapping_table",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_cost_medium", label: "费用项（中类）"}),
                        search.createColumn({name: "custrecord_swc_account", label: "会计科目"})
                    ]
            });
            let results4 = getAllResults(customrecord_swc_rule_mapping_tableSearchObj);
            let accountObj = {};
            results4.forEach(function (value) {
                let cost = value.getValue({name: "custrecord_swc_cost_medium", label: "费用项（中类）"});
                let account = value.getValue({name: "custrecord_swc_account", label: "会计科目"});
                accountObj[cost] = account;
            });
            log.audit('对应科目',accountObj);

            //头程费用信息录入
            var obj = {};
            const customrecord_swc_wl_first_leg_costSearchObj = search.create({
                type: "customrecord_swc_wl_first_leg_cost",
                filters:
                    [
                        ["formulanumeric: NVL({custrecord_swc_wl_flc_sj_fee_cy}, 0) - NVL({custrecord_swc_tc_historical_difference}, 0) ","notequalto","0"],
                        "AND",
                        ["custrecord_swc_wl_flc_sj_currency","noneof","@NONE@"],
                        "AND",
                        ["custrecord_swc_wl_flc_location","noneof","@NONE@"],
                        "AND",
                        ["custrecord_swc_tc_historical_difference","isnotempty","0"],
                        "AND",
                        ["custrecord_swc_wl_flc_sj_fee_cy","notequalto","0"],
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "subsidiarynohierarchy",
                            join: "CUSTRECORD_SWC_WL_FLC_LOCATION",
                            label: "主要子公司（无层次结构）"
                        }),
                        search.createColumn({name: "custrecord_swc_wl_flc_sj_currency", label: "实际币种"}),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "NVL({custrecord_swc_wl_flc_sj_fee_cy}, 0) - NVL({custrecord_swc_tc_historical_difference}, 0) ",
                            label: "公式（数值）"
                        }),
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "custrecord_swc_flc_fee_type_z", label: "费用类型（中类）"})
                    ]
            });

            let results = getAllResults(customrecord_swc_wl_first_leg_costSearchObj);

            results.forEach(function (value) {
                var sub = value.getValue({
                    name: "subsidiarynohierarchy",
                    join: "CUSTRECORD_SWC_WL_FLC_LOCATION",
                    label: "主要子公司（无层次结构）"
                });
                // var sub = value.getValue({name: "tranid", label: "文档编号"});
                var currency = value.getValue({name: "custrecord_swc_wl_flc_sj_currency", label: "实际币种"});
                var diff = Number(value.getValue({
                    name: "formulanumeric",
                    formula: "NVL({custrecord_swc_wl_flc_sj_fee_cy}, 0) - NVL({custrecord_swc_tc_historical_difference}, 0) ",
                    label: "公式（数值）"
                }));
                var id = value.getValue({name: "internalid", label: "内部 ID"});
                var type = value.getText({name: "custrecord_swc_flc_fee_type_z", label: "费用类型（中类）"});

                var key = sub + '_' + currency;

                if (type in accountObj) {
                    obj[key] = obj[key] || {};
                    obj[key].linedata = obj[key].linedata || [];

                    obj[key].linedata.push(
                        {
                            account: SWC_CONFIG_DATA.configData().S_ACCOUNT_ZYYWCB_TCCYZZ,//主营业成本-头程差异中转,
                            debit: diff,
                            credit: 0,
                            memo: '头程费用信息录入: ' + id
                        },
                        {
                            account: accountObj[type],
                            debit: 0,
                            credit: diff,
                            memo: '头程费用信息录入: ' + id
                        },
                    );
                }
            });


            //差异日记账-CG头程费用信息录入
            const customrecord_swc_cg_first_leg_costSearchObj = search.create({
                type: "customrecord_swc_cg_first_leg_cost",
                filters:
                    [
                        ["formulanumeric: NVL({custrecord_swc_wl_cflc_sj_fee_cy}, 0) - NVL({custrecord_swc_wl_processedcg_difference}, 0) ","notequalto","0"],
                        "AND",
                        ["custrecord_swc_wl_cflc_sj_currency","noneof","@NONE@"],
                        "AND",
                        ["custrecord_swc_wl_cflc_location","noneof","@NONE@"],
                        "AND",
                        ["custrecord_swc_wl_processedcg_difference","isnotempty",""],
                        "AND",
                        ["custrecord_swc_wl_cflc_sj_fee_cy","notequalto","0"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "subsidiarynohierarchy",
                            join: "CUSTRECORD_SWC_WL_CFLC_LOCATION",
                            label: "主要子公司（无层次结构）"
                        }),
                        search.createColumn({name: "custrecord_swc_wl_cflc_sj_currency", label: "实际币种"}),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "NVL({custrecord_swc_wl_cflc_sj_fee_cy}, 0) - NVL({custrecord_swc_wl_processedcg_difference}, 0) ",
                            label: "公式（数值）"
                        }),
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "custrecord_swc_cflc_fee_type_z", label: "费用类型（中类）"})
                    ]
            });

            let results2 = getAllResults(customrecord_swc_cg_first_leg_costSearchObj);

            results2.forEach(function (value) {
                var sub = value.getValue({
                    name: "subsidiarynohierarchy",
                    join: "CUSTRECORD_SWC_WL_CFLC_LOCATION",
                    label: "主要子公司（无层次结构）"
                });
                // var sub = value.getValue({name: "tranid", label: "文档编号"});
                var currency = value.getValue({name: "custrecord_swc_wl_cflc_sj_currency", label: "实际币种"});
                var diff = Number(value.getValue({
                    name: "formulanumeric",
                    formula: "NVL({custrecord_swc_wl_cflc_sj_fee_cy}, 0) - NVL({custrecord_swc_wl_processedcg_difference}, 0) ",
                    label: "公式（数值）"
                }));
                var id = value.getValue({name: "internalid", label: "内部 ID"});
                var type = value.getText({name: "custrecord_swc_cflc_fee_type_z", label: "费用类型（中类）"});

                var key = sub + '_' + currency;


                if (type in accountObj) {
                    obj[key] = obj[key] || {};
                    obj[key].linedata = obj[key].linedata || [];

                    obj[key].linedata.push(
                        {
                            account: SWC_CONFIG_DATA.configData().S_ACCOUNT_ZYYWCB_TCCYZZ,//主营业成本-头程差异中转,
                            debit: diff,
                            credit: 0,
                            memo: 'CG头程费用信息录入: ' + id
                        },
                        {
                            account: accountObj[type],
                            debit: 0,
                            credit: diff,
                            memo: 'CG头程费用信息录入: ' + id
                        },
                    );
                }
            });

            //物流发运-采购信息搜索
            const customrecord_swc_wl_po_feeSearchObj = search.create({
                type: "customrecord_swc_wl_po_fee",
                filters:
                    [
                        ["formulanumeric: NVL({custrecord_swc_wl_po_fee_cy}, 0) - NVL({custrecord_swc_wl_processed_difference}, 0)","notequalto","0"],
                        "AND",
                        ["custrecord_swc_wl_po_fee_ven","noneof","@NONE@"],
                        "AND",
                        ["custrecord_swc_wl_po_fee_cy","notequalto","0"],
                        "AND",
                        ["custrecord_swc_wl_processed_difference","isnotempty",""]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "subsidiarynohierarchy",
                            join: "CUSTRECORD_SWC_WL_PO_FEE_VEN",
                            label: "主要子公司（无层次结构）"
                        }),
                        search.createColumn({
                            name: "currency",
                            join: "CUSTRECORD_SWC_WL_PO_FEE_VEN",
                            label: "货币"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "NVL({custrecord_swc_wl_po_fee_cy}, 0) - NVL({custrecord_swc_wl_processed_difference}, 0)",
                            label: "公式（数值）"
                        }),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });

            let results3 = getAllResults(customrecord_swc_wl_po_feeSearchObj);

            results3.forEach(function (value) {
                var sub = value.getValue({
                    name: "subsidiarynohierarchy",
                    join: "CUSTRECORD_SWC_WL_PO_FEE_VEN",
                    label: "主要子公司（无层次结构）"
                });
                // var sub = value.getValue({name: "tranid", label: "文档编号"});
                var currency = value.getValue({
                    name: "currency",
                    join: "CUSTRECORD_SWC_WL_PO_FEE_VEN",
                    label: "货币"
                });
                var diff = Number(value.getValue({
                    name: "formulanumeric",
                    formula: "NVL({custrecord_swc_wl_po_fee_cy}, 0) - NVL({custrecord_swc_wl_processed_difference}, 0)",
                    label: "公式（数值）"
                }));
                var id = value.getValue({name: "internalid", label: "内部 ID"});

                var key = sub + '_' + currency;


                obj[key] = obj[key] || {};
                obj[key].linedata = obj[key].linedata || [];

                obj[key].linedata.push(
                    {
                        account: SWC_CONFIG_DATA.configData().S_ACCOUNT_ZYYWCB_TCCYZZ,//主营业成本-头程差异中转
                        debit: diff,
                        credit: 0,
                        memo: '物流发运-采购信息: ' + id
                    },
                    {
                        account: SWC_CONFIG_DATA.configData().S_ACCOUNT_XSFY_CGZF,//销售费用-销货成本_采购成本_采购杂费
                        debit: 0,
                        credit: diff,
                        memo: '物流发运-采购信息: ' + id
                    },
                );
            });

            return obj;
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
                resultslice.forEach(function (slice) {
                    searchResults.push(slice);
                    searchid++;
                });

            } while (resultslice.length >= 1000);
            return searchResults;
        }

        return {getInputData, map, reduce, summarize}

    });
