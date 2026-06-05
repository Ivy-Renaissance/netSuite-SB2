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
                let tranId = key.split('_')[0];
                let sub = key.split('_')[1];
                let currency = key.split('_')[2];
                let date = key.split('_')[3];

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
                if (value.date) jouRec.setValue({
                    fieldId: 'trandate',
                    value: value.date
                });
                //设置关联单据
                jouRec.setValue({
                    fieldId: 'custbody_swc_owtf_transfer',
                    value: tranId
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


                record.submitFields({
                    type: 'transferorder',
                    id: tranId,
                    values: {
                        'custbody_swc_owtf_flag': jouId
                    }
                });
                log.audit('反写成功',tranId)
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
            const transferorderSearchObj = search.create({
                type: "transferorder",
                settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","TrnfrOrd"],
                        "AND",
                        ["custbody_swc_the_actual_overseas_wareh","is","T"],
                        "AND",
                        ["custbody_swc_owtf_flag","anyof","@NONE@"],
                        "AND",
                        ["custrecord_swc_hw_trnfrord_link.custrecord_swc_cost_difference","notequalto","0"],
                        "AND",
                        ["mainline","is","T"],
                        "AND",
                        ["taxline","is","F"],
                        "AND",
                        ["custrecord_swc_hw_trnfrord_link.custrecord_swc_actual_overseas_warehouse","noneof","@NONE@"]
                    ],
                columns:
                    [
                        search.createColumn({name: "subsidiary", label: "子公司"}),
                        search.createColumn({name: "tranid", label: "文档编号"}),
                        search.createColumn({
                            name: "custrecord_swc_actual_overseas_warehouse",
                            join: "CUSTRECORD_SWC_HW_TRNFRORD_LINK",
                            label: "实际海外仓调拨费币种"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_db_actual_billing_date",
                            join: "CUSTRECORD_SWC_HW_TRNFRORD_LINK",
                            label: "实际账单日期"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_cost_difference",
                            join: "CUSTRECORD_SWC_HW_TRNFRORD_LINK",
                            label: "费用差异"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_hw_trnfrord_lo_type",
                            join: "CUSTRECORD_SWC_HW_TRNFRORD_LINK",
                            label: "费用"
                        })
                    ]
            });

            var results = getAllResults(transferorderSearchObj);

            var obj = {};
            results.forEach(function (value) {
                var sub = value.getValue({name: "subsidiary", label: "子公司"});
                // var sub = value.getValue({name: "tranid", label: "文档编号"});
                var currency = value.getValue({
                    name: "custrecord_swc_actual_overseas_warehouse",
                    join: "CUSTRECORD_SWC_HW_TRNFRORD_LINK",
                    label: "实际海外仓调拨费币种"
                });
                var date = value.getValue({
                    name: "custrecord_swc_db_actual_billing_date",
                    join: "CUSTRECORD_SWC_HW_TRNFRORD_LINK",
                    label: "实际账单日期"
                });
                var diff = value.getValue({
                    name: "custrecord_swc_cost_difference",
                    join: "CUSTRECORD_SWC_HW_TRNFRORD_LINK",
                    label: "费用差异"
                });
                var type = value.getValue({
                    name: "custrecord_swc_hw_trnfrord_lo_type",
                    join: "CUSTRECORD_SWC_HW_TRNFRORD_LINK",
                    label: "费用"
                });
                var key = value.id + '_' + sub + '_' + currency + '_' + date;


                obj[key] = obj[key] || {};
                obj[key].date = date;
                obj[key].linedata = obj[key].linedata || [];

                obj[key].linedata.push(
                    {
                        account: SWC_CONFIG_DATA.configData().S_ACCOUNT_SSFY_WCYF_CKDBF,
                        debit: diff,
                        credit: 0,
                        memo: type
                    },
                    {
                        account: SWC_CONFIG_DATA.configData().S_ACCOUNT_YFZK,
                        debit: 0,
                        credit: diff,
                        memo: type
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
