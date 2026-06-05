/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime', 'N/search', 'N/task', '../common/SWC_CONFIG_DATA'],
    (record, runtime, search, task,SWC_CONFIG_DATA) => {
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
        const TCBM_CG = 1;// 提出部门 采购
        const getInputData = (inputContext) => {
            const scriptObj = runtime.getCurrentScript();
            const params = JSON.parse(scriptObj.getParameter({name: "custscript_advance_json"}));
            const obj = getData(params);

            log.audit('生成预付款单',Object.keys(obj).length);
            if (Object.keys(obj).length === 0)
                return;

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
            try {
                var key = mapContext.key;
                var item = mapContext.key.split("_")[0];
                var line = mapContext.key.split("_")[1];
                var value = JSON.parse(mapContext.value);
                var vprepRec = record.create({
                    type: 'vendorprepayment',
                    isDynamic: true
                })

                if (value.entity) vprepRec.setValue({
                    fieldId: 'entity',
                    value: value.entity
                });
                if (value.subsidiary) {
                    vprepRec.setValue({
                        fieldId: 'subsidiary',
                        value: value.subsidiary
                    });

                    var subRec = record.load({
                        type: "subsidiary",
                        id: value.subsidiary
                    });
                    var vpp = subRec.getValue({
                        fieldId: 'custrecord_cn_cfi_out_vpp'
                    });
                }

                if (value.currency) vprepRec.setValue({
                    fieldId: 'currency',
                    value: value.currency
                });
                if (value.purchaseorder) vprepRec.setValue({
                    fieldId: 'purchaseorder',
                    value: value.purchaseorder
                });

                // if (value.exchangerate) vprepRec.setValue({
                //     fieldId: 'exchangerate',
                //     value: value.exchangerate
                // });
                if (value.trandate) vprepRec.setValue({
                    fieldId: 'trandate',
                    value: new Date(value.trandate)
                });
                if (value.payment) vprepRec.setValue({
                    fieldId: 'payment',
                    value: value.payment
                });
                // if (value.prepaymentaccount) vprepRec.setValue({
                //     fieldId: 'prepaymentaccount',
                //     value: value.prepaymentaccount
                // });
                // if (value.account) vprepRec.setValue({
                //     fieldId: 'account',
                //     value: value.account
                // });
                if (value.account) vprepRec.setValue({
                    fieldId: 'account',
                    value: value.account
                });
                if (value.memo) vprepRec.setValue({
                    fieldId: 'memo',
                    value: value.memo
                });

                vprepRec.setValue({
                    fieldId: 'custbody_swc_bussiness_department',
                    value: SWC_CONFIG_DATA.configData().s_department_cgb
                });
                // if (value.custbody_swc_vendor_prepayment_item) vprepRec.setValue({
                //     fieldId: 'custbody_swc_vendor_prepayment_item',
                //     value: value.custbody_swc_vendor_prepayment_item
                // });
                if (value.custbody_swc_advancepay_whole_yes1) vprepRec.setValue({
                    fieldId: 'custbody_swc_advancepay_whole_yes1',
                    value: true
                });
                if (value.custbody_swc_advancepay_sum_percent1) vprepRec.setValue({
                    fieldId: 'custbody_swc_advancepay_sum_percent1',
                    value: value.custbody_swc_advancepay_sum_percent1
                });
                if (value.custbody_cseg_cn_cfi) vprepRec.setValue({
                    fieldId: 'custbody_cseg_cn_cfi',
                    value: value.custbody_cseg_cn_cfi
                });
                // if (value.custbody_swc_advancepay_line_initial1) vprepRec.setValue({
                //     fieldId: 'custbody_swc_advancepay_line_initial1',
                //     value: value.custbody_swc_advancepay_line_initial1
                // });
                // if (value.custbody_swc_advancepay_line_aferward1) vprepRec.setValue({
                //     fieldId: 'custbody_swc_advancepay_line_aferward1',
                //     value: value.custbody_swc_advancepay_line_aferward1
                // });
                if (value.custbody_swc_advancepay) vprepRec.setValue({
                    fieldId: 'custbody_swc_advancepay',
                    value: value.custbody_swc_advancepay
                });

                //供应商银行账户
                if (value.bankaccounts2) vprepRec.setValue({
                    fieldId: 'custbody_swc_bank_accounts',
                    value: value.bankaccounts2
                });

                //付款条件
                if (value.terms) vprepRec.setValue({
                    fieldId: 'custbody_swc_vendor_payment_terms',
                    value: value.terms
                });

                var vprepId = vprepRec.save();
                var backObj = {};
                backObj[key] = vprepId;


                record.submitFields({
                    type: 'customrecord_swc_advancepay_plateform',
                    id: key,
                    values: {
                        "custrecord_swc_advancepay_vprep_main": vprepId
                    }
                })

                // mapContext.write({
                //     key: value.id + '%' + value.type, // 确保 key 为字符串
                //     value: {
                //         backObj
                //     }
                // });
            } catch (e) {
                log.error("map-error",e.message);
                record.submitFields({
                    type: 'customrecord_swc_advancepay_plateform',
                    id: key,
                    values: {
                        "custrecord_swc_advancepay_mistakememo": e.message
                    }
                })
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
            // try {
            //     const key = reduceContext.key;
            //     log.audit('key',key);
            //     // const len = reduceContext.values.length;
            //     let values = JSON.parse(reduceContext.values);
            //     let value = values.backObj;
            //     log.audit('value',value);
            //
            //     let curRec = record.load({type: key.split("%")[1],id:key.split("%")[0],isDynamic: true});
            //     curRec.setValue({
            //         fieldId: 'custrecord_swc_advancepay_state',
            //         value: 1
            //     });
            //     let lineCount = curRec.getLineCount({
            //         sublistId: 'recmachcustrecord_swc_advancepay_main'
            //     });
            //     for (let i = 0;i < lineCount;i++) {
            //         curRec.selectLine({
            //             sublistId: 'recmachcustrecord_swc_advancepay_main',
            //             line: i
            //         });
            //         let item = curRec.getCurrentSublistValue({
            //             sublistId: 'recmachcustrecord_swc_advancepay_main',
            //             fieldId: 'custrecord_swc_advancepay_line_item'
            //         });
            //         let line = curRec.getCurrentSublistValue({
            //             sublistId: 'recmachcustrecord_swc_advancepay_main',
            //             fieldId: 'custrecord_swc_advancepay_line_number'
            //         });
            //         let startKey = curRec.getCurrentSublistValue({
            //             sublistId: 'recmachcustrecord_swc_advancepay_main',
            //             fieldId: 'custrecord_swc_advancepay_line_initial'
            //         });
            //         let endKey = curRec.getCurrentSublistValue({
            //             sublistId: 'recmachcustrecord_swc_advancepay_main',
            //             fieldId: 'custrecord_swc_advancepay_line_aferwards'
            //         });
            //         let key = item + '_' + line + '_' + startKey + '_' + endKey;
            //         log.audit('reduce_key',key);
            //         if (key in value) {
            //             curRec.setCurrentSublistValue({
            //                 sublistId: 'recmachcustrecord_swc_advancepay_main',
            //                 fieldId: 'custrecord_swc_advancepay_vprep',
            //                 value: value[key]
            //             });
            //         }
            //
            //         curRec.commitLine({
            //             sublistId: 'recmachcustrecord_swc_advancepay_main'
            //         })
            //     }
            //     let curId = curRec.save();
            //     log.audit('curId',curId);
            // } catch (e) {
            //     log.error('reduce-error',e.message);
            // }
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

        function getData(params) {
            let type = params.type;
            let id = params.id;
            let adData = {};
            let curRec = record.load({type:type,id:id,isDynamic: true});
            //供应商
            var entity = curRec.getValue('custrecord_swc_advancepay_vendor');
            //子公司
            var subsidiary = curRec.getValue('custrecord_swc_advancepay_subsidary');
            //货币
            var currency = curRec.getValue('custrecord_swc_advancepay_currency');
            //采购订单
            var purchaseorder = curRec.getValue('custrecord_swc_advancepay_po');
            //预付款科目
            var account = curRec.getValue('custrecord_swc_advancepay_account');
            //预付款总金额
            var payment = curRec.getValue('custrecord_swc_advancepay_total_amount');

            // //汇率
            // var exchangerate = curRec.getValue('custrecord_swc_advancepay_currency_rate');
            //预付款日期
            var trandate = curRec.getValue('custrecord_swc_advancepay_paydate');

            //银行账户科目
            var bankAccount = curRec.getValue('custrecord_swc_advancepay_bankaccount');

            var custrecord_swc_advancepay_whole_yes = curRec.getValue('custrecord_swc_advancepay_whole_yes');
            var custrecord_swc_advancepay_sum_percent1 = curRec.getValue('custrecord_swc_advancepay_sum_percent1');

            var memo = curRec.getValue('custrecord_swc_advancepay_memo');

            var cashflow = curRec.getValue('custrecord_swc_cashflow_advancepay') || '';

            var terms = curRec.getValue('custrecord_swc_vendor_items');

            var bankaccounts2 = curRec.getValue('custrecord_vendor_bankaccounts2');


            var custbody_swc_advancepay = curRec.id;
            adData[custbody_swc_advancepay] = {
                subsidiary: subsidiary,
                entity: entity,
                purchaseorder: purchaseorder,
                currency: currency,
                // exchangerate: exchangerate,
                trandate: trandate,
                payment: payment,
                prepaymentaccount: account,
                account: bankAccount,
                custbody_swc_advancepay_whole_yes1: custrecord_swc_advancepay_whole_yes,
                custbody_swc_advancepay_sum_percent1: custrecord_swc_advancepay_sum_percent1,
                custbody_swc_advancepay: custbody_swc_advancepay,
                custbody_cseg_cn_cfi: cashflow,
                type: type,
                id: id,
                memo: memo,
                terms: terms,
                bankaccounts2: bankaccounts2
            }

            return adData
        }

        return {getInputData, map, summarize}

    });