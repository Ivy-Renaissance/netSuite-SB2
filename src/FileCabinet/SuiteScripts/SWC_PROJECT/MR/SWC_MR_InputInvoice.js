/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime'],
    (record, runtime) => {
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
            const scriptObj = runtime.getCurrentScript();
            const obj = JSON.parse(scriptObj.getParameter({name: 'custscript_inputInvoice_json'}));
            log.audit('obj', obj);
            if (!obj)
                return;
            return {
                'obj': obj,
            };
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
                log.audit('mapContext',mapContext);
                var value = JSON.parse(mapContext.value);
                log.audit('value',value);

                var lines = value.lineData;

                var idData = [];
                var idObj = {};

                //创建进项发票
                var rec = record.create({
                    type: 'customrecord_swc_input_invoice',
                    isDynamic: true
                });

                //子公司
                if (value.subsidiary) {
                    rec.setValue({
                        fieldId: 'custrecord_swc_input_invoice_sub',
                        value: value.subsidiary
                    })
                }

                //供应商
                if (value.vendor) {
                    rec.setValue({
                        fieldId: 'custrecord_swc_input_invoice_vendor',
                        value: value.vendor
                    })
                }

                //采购员
                if (value.purchaser) {
                    rec.setValue({
                        fieldId: 'custrecord_swc_input_invoice_employee',
                        value: value.purchaser
                    })
                }

                //期间
                if (value.period) {
                    rec.setValue({
                        fieldId: 'custrecord_swc_input_invoice_period',
                        value: value.period
                    })
                }

                //发票日期
                if (value.invoiceDate) {
                    rec.setValue({
                        fieldId: 'custrecord_swc_input_invoice_date',
                        value: new Date(value.invoiceDate)
                    })
                }
                //发票号
                if (value.invoiceNumber) {
                    rec.setValue({
                        fieldId: 'custrecord_swc_input_invoice_no',
                        value: value.invoiceNumber
                    })
                }

                for (let i = 0;i < lines.length;i++) {
                    var lineObj = lines[i];
                    rec.selectNewLine({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main'
                    });

                    //供应商对账单
                    if (lineObj.statementnumber) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_statement',
                        value: lineObj.statementnumber
                    });
                    //采购订单号
                    if (lineObj.purnumber) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_pur',
                        value: lineObj.purnumber
                    });
                    //入库单号
                    if (lineObj.receiptnumber) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_receipt',
                        value: lineObj.receiptnumber
                    });
                    //系统账单号
                    if (lineObj.billnumber) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_bill',
                        value: lineObj.billnumber
                    });
                    //物料名称
                    if (lineObj.item) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_item',
                        value: lineObj.item
                    });
                    //货币
                    if (lineObj.currency) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_currency',
                        value: lineObj.currency
                    });
                    //数量
                    if (lineObj.number) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_number',
                        value: lineObj.number
                    });
                    //税率
                    if (lineObj.tax) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_tax',
                        value: (100 - parseInt(lineObj.tax))
                    });
                    //已开税票数量
                    if (lineObj.invoicesissued) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_tax_included',
                        value: lineObj.invoicesissued
                    });
                    //开税票数量
                    if (lineObj.issuedinput) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_tax_number',
                        value: lineObj.issuedinput
                    });
                    //开税票金额
                    if (lineObj.amountinput) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_tax_amount',
                        value: lineObj.amountinput
                    });
                    //退税率
                    if (lineObj.taxrebaterate) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_tax_refund',
                        value: lineObj.taxrebaterate
                    });
                    //退税金额
                    if (lineObj.taxrefundamount) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_refund_amoun',
                        value: lineObj.taxrefundamount
                    });
                    //出口免退税金额
                    if (lineObj.refundamount) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_dutyfree',
                        value: lineObj.refundamount
                    });
                    //预付付款
                    if (lineObj.advancepayment) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_advance_pay',
                        value: lineObj.advancepayment
                    });
                    //未付款金额
                    if (lineObj.unpaidamount) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_advance_npay',
                        value: lineObj.unpaidamount
                    });
                    //含税单价
                    if (lineObj.price) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_rate',
                        value: lineObj.price
                    });
                    //总额
                    if (lineObj.amountall) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main',
                        fieldId: 'custrecord_swc_input_detail_all_amount',
                        value: lineObj.amountall
                    });

                    rec.commitLine({
                        sublistId: 'recmachcustrecord_swc_input_invoice_main'
                    });

                    idObj[lineObj.billnumber] = lineObj.type;
                }
                var invoiceInputId = rec.save();
                log.audit('invoiceInputId',invoiceInputId);


                for (let key in idObj) {
                    var type = idObj[key];
                    mapContext.write({
                        key: key + '_' + type, // 确保 key 为字符串
                        value: invoiceInputId
                    });
                }
            } catch (e) {
                log.error('map-error',e.message);
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
            try {
                var value = JSON.parse(reduceContext.values);
                var key = reduceContext.key;
                log.audit('key', key);

                var id = key.split('_')[0];
                var type = key.split('_')[1];

                record.submitFields({
                    type: type,
                    id: id,
                    values: {
                        "custbody_swc_bill_input_invoice": value
                    }
                })

            } catch (e) {
                log.error('reduce-error',e.message);
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
            log.error('结束');
        };

        return {getInputData, map, reduce, summarize};

    });
