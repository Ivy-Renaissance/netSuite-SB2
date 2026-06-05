/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search) => {
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


            return {"toid": 15398}
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
            var key = mapContext.key;
            var value = mapContext.value;
            var toId = value;

            log.audit('key',key)
            log.audit('toId',toId)

            try {

                var toItemObj = {
                    "3234": 222,
                    "3277": 333
                }

                var items = ['3234','3277']
                //收获前获取货品 到岸成本相关数据
                var taxCodeObj = getTaxCodeObj();
                var itemObj = getItemObj(items,taxCodeObj);

                log.audit('itemObj',itemObj);


                // IR：收货
                const irRec = record.transform({
                    fromType: record.Type.TRANSFER_ORDER,
                    fromId: toId,
                    toType: record.Type.ITEM_RECEIPT,
                    isDynamic: true
                });

                irRec.setValue({fieldId: 'landedcostperline', value: true});

                //设置到岸成本
                var itemCount = irRec.getLineCount({
                    sublistId: 'item'
                });

                log.audit('itemCount', itemCount);
                for (let i = 0; i < itemCount; i++) {
                    irRec.selectLine({
                        sublistId: 'item',
                        line: i
                    });
                    var irItem = irRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                    });
                    var irAmount = 0;
                    if (irItem in toItemObj) {
                        irAmount = toItemObj[irItem];
                    }
                    var returnTax = 0;
                    var saleTex = 0;
                    if (irItem in itemObj) {
                        returnTax = convertPercentToDecimal(itemObj[irItem].rate);
                        saleTex = convertPercentToDecimal(itemObj[irItem].tax);
                    }
                    var returnAmount = irAmount * (saleTex - returnTax);//退税金额

                    log.audit('returnAmount',returnAmount);

                    if (returnAmount) {
                        const landed = irRec.getCurrentSublistSubrecord({sublistId: 'item', fieldId: 'landedcost'});

                        landed.selectNewLine({sublistId: 'landedcostdata'});

                        landed.setCurrentSublistValue({
                            sublistId: 'landedcostdata',
                            fieldId: 'costcategory',
                            value: 38
                        });

                        landed.setCurrentSublistValue({
                            sublistId: 'landedcostdata',
                            fieldId: 'amount',
                            value: returnAmount
                        });
                        landed.commitLine({sublistId: 'landedcostdata'});
                    }

                    irRec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol9',
                        value: returnTax
                    });
                    irRec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_swc_po_sk_',
                        value: returnAmount
                    });

                    var returnTax2 = irRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol9',
                    });
                    log.audit('returnTax2',returnTax2);



                    irRec.commitLine({sublistId: 'item'});
                }


                const irId = irRec.save({ignoreMandatoryFields: true});
                if (irId) log.debug('IR created', irId);
            } catch (e) {
                log.error('error',e.message)
            }
        }

        function convertPercentToDecimal(value) {
            if (typeof value === 'string' && value.trim().endsWith('%')) {
                // 移除百分号，解析为数字，除以100
                var num = parseFloat(value.replace('%', ''));
                if (!isNaN(num)) {
                    return num / 100;
                }
            }
            // 如果是数字，直接返回；如果是其他字符串，尝试parseFloat
            return parseFloat(value) || 0; // 或者直接返回value？但为了安全，返回数字或0
        }

        function getItemObj(items,taxCodeObj) {
            const itemSearchObj = search.create({
                type: "item",
                filters:
                    [
                        ["internalid","anyof",items],
                        "AND",
                        ["custitem_swc_tax_refund_rate1","isnotempty",""]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "custitem_swc_tax_refund_rate1", label: "退税率1"}),
                        search.createColumn({name: "taxschedule", label: "税务计划"})
                    ]
            });

            var obj = {};
            var taxData = [];
            itemSearchObj.run().each(function(result){
                var tax = result.getValue({name: "taxschedule", label: "税务计划"});
                if (taxData.indexOf(tax) == -1 && tax)
                    taxData.push(tax);
                obj[result.id] = {
                    rate: result.getValue({name: "custitem_swc_tax_refund_rate1", label: "退税率1"}),
                    tax: tax,
                }
                return true;
            });

            var scheduleObj = {};

            if (taxData.length > 0) {
                for (let i = 0;i < taxData.length;i++) {
                    var taxRec = record.load({
                        type: 'taxschedule',
                        id: taxData[i],
                        isDynamic: true
                    });
                    var taxCode = taxRec.getSublistValue({
                        sublistId: 'nexuses',
                        fieldId: 'salestaxcode',
                        line: 0
                    });
                    if (taxCode in taxCodeObj) {
                        scheduleObj[taxData[i]] = taxCodeObj[taxCode];
                    } else {
                        scheduleObj[taxData[i]] = 0;
                    }
                }
            }

            log.audit('obj',obj);
            log.audit('scheduleObj',scheduleObj);
            for (let key in obj) {
                if (obj[key].tax in scheduleObj)
                    obj[key].tax = scheduleObj[obj[key].tax]
            }

            return obj
        }

        function getTaxCodeObj() {
            const salestaxitemSearchObj = search.create({
                type: "salestaxitem",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "rate", label: "税率"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });

            var obj = {};
            salestaxitemSearchObj.run().each(function(result){
                obj[result.id] = result.getValue({name: "rate", label: "税率"});
                // .run().each has a limit of 4,000 results
                return true;
            });

            return obj
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

        return {getInputData, map, reduce, summarize}

    });
