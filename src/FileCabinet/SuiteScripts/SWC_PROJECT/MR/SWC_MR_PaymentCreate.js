/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime', 'N/search', 'N/task','../common/MatchTool', '../common/SWC_CONFIG_DATA'],
    (record, runtime, search, task,MatchTool,SWC_CONFIG_DATA) => {
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
            const params = JSON.parse(scriptObj.getParameter({name: "custscript_prejson_json"}));
            log.audit('params',params);
            const obj = getData(params);

            log.audit('obj',obj);
            log.audit('生成付款单',Object.keys(obj).length);
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
                log.audit('key',key);
                var value = JSON.parse(mapContext.value);
                log.audit('value',value);
                var lineObj = value.lineObj;
                var line1 = Object.keys(lineObj)[0];
                // var vprepRec = record.create({
                //     type: 'vendorpayment',
                //     isDynamic: true
                // })
                var vprepRec = record.transform({
                    fromType: 'vendorbill',
                    fromId: line1,
                    toType: 'vendorpayment',
                    isDynamic: true
                })

                //供应商/收款人
                if (value.entity) vprepRec.setValue({
                    fieldId: 'entity',
                    value: value.entity
                });
                //子公司
                if (value.subsidiary) vprepRec.setValue({
                    fieldId: 'subsidiary',
                    value: value.subsidiary
                });

                //货币
                if (value.currency) vprepRec.setValue({
                    fieldId: 'currency',
                    value: value.currency
                });
                //汇率
                if (value.exchangerate) vprepRec.setValue({
                    fieldId: 'exchangerate',
                    value: value.exchangerate
                });
                //日期
                if (value.trandate) vprepRec.setText({
                    fieldId: 'trandate',
                    text: value.trandate
                });
                if (value.account) vprepRec.setValue({
                    fieldId: 'account',
                    value: value.account
                });

                vprepRec.setValue({
                    fieldId: 'custbody_swc_bussiness_department',
                    value: SWC_CONFIG_DATA.configData().s_department_cgb
                });

                //明细处理
                var lineCount = vprepRec.getLineCount({sublistId: 'apply'});
                var backAmount = 0;
                log.audit('lineCount',lineCount);
                if (lineCount) {
                    for (let i = 0; i <lineCount; i++) {
                        vprepRec.selectLine({
                            sublistId: 'apply',
                            line: i
                        });
                        var billId = vprepRec.getCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'doc'
                        });
                        log.audit('billId',billId);
                        if (billId in lineObj) {
                            vprepRec.setCurrentSublistValue({
                                sublistId: 'apply',
                                fieldId: 'apply',
                                value: true
                            });
                            vprepRec.setCurrentSublistValue({
                                sublistId: 'apply',
                                fieldId: 'amount',
                                value: lineObj[billId].curAmount
                            });
                            backAmount = backAmount + Number(lineObj[billId].curAmount)

                            vprepRec.commitLine({sublistId: 'apply'});
                        }
                    }
                }

                //中国现金流量表项
                if (value.custbody_cseg_cn_cfi) vprepRec.setValue({
                    fieldId: 'custbody_cseg_cn_cfi',
                    value: value.custbody_cseg_cn_cfi //默认【购买商品、接受劳务支付的现金】
                });
                //备注
                vprepRec.setValue({
                    fieldId: 'memo',
                    value: value.memo
                });
                //付款申请单链接
                vprepRec.setValue({
                    fieldId: 'custbody_swc_payment_application',
                    value: key
                });

                var account11 = vprepRec.getValue({
                    fieldId: 'account',
                });
                log.audit('account11',account11);
                log.audit('value.account',value.account);
                //银行账户科目
                if (value.account) vprepRec.setValue({
                    fieldId: 'account',
                    value: value.account
                });
                var account22 = vprepRec.getValue({
                    fieldId: 'account',
                });
                log.audit('account22',account22);
                var vprepId = vprepRec.save({ignoreMandatoryFields: true});
                // var backObj = {};
                // backObj[key] = vprepId;

                log.audit('vprepId',vprepId);

                //反写
                var paymentRec = record.load({
                    type: 'customrecord_swc_payment_application',
                    id: key,
                    isDynamic: true
                });
                //反写主表账单付款链接
                var bill = paymentRec.getValue({
                    fieldId: 'custrecord_swc_pay_payment'
                });
                // 处理各种类型
                if (!bill) {
                    bill = [];
                } else if (!Array.isArray(bill)) {
                    bill = [String(bill)];
                }
                bill.push(String(vprepId));
                log.audit('bill',bill);
                paymentRec.setValue({
                    fieldId: 'custrecord_swc_pay_payment',
                    value: bill
                });
                //反写实际付款总金额
                var actualAmount = paymentRec.getValue({
                    fieldId: 'custrecord_swc_pay_actual_amount'
                }) || 0;
                paymentRec.setValue({
                    fieldId: 'custrecord_swc_pay_actual_amount',
                    value: actualAmount + backAmount
                });
                //剩余待支付金额
                var payAmount = Number(paymentRec.getValue({
                    fieldId: 'custrecord_swc_pay_total_amount'
                }));
                log.audit('payAmount',payAmount);
                paymentRec.setValue({
                    fieldId: 'custrecord_swc_pay_remain_amount',
                    value: payAmount - actualAmount - backAmount
                });
                log.audit('value.mode',value.mode);
                if (value.mode == SWC_CONFIG_DATA.configData().s_fkms_bfzf) {
                    let lineCount = paymentRec.getLineCount({sublistId: 'recmachcustrecord_swc_pay_line_main'});

                    // paymentRec.setText({
                    //     fieldId: 'custrecord_swc_pay_actual_paydate',
                    //     text: ''
                    // });
                    // paymentRec.setText({
                    //     fieldId: 'custrecord_swc_pay_bankaccount',
                    //     text: ''
                    // });

                    log.audit('lineCount',lineCount);

                    if (lineCount) {
                        for (let i = 0; i < lineCount; i++) {
                            paymentRec.selectLine({
                                sublistId: 'recmachcustrecord_swc_pay_line_main',
                                line: i
                            });
                            let lineCashier = paymentRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pay_line_main',
                                fieldId: 'custrecord_swc_pay_line_cashier'
                            });
                            if (lineCashier) {
                                paymentRec.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pay_line_main',
                                    fieldId: 'custrecord_swc_pay_line_cashier',
                                    value: false
                                });
                                paymentRec.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pay_line_main',
                                    fieldId: 'custrecord_swc_pay_line_payment',
                                    value: vprepId
                                });
                                paymentRec.commitLine({sublistId: 'recmachcustrecord_swc_pay_line_main'});
                            }
                        }
                    }
                }
                paymentRec.save({ignoreMandatoryFields: true});
                log.audit('反写成功');

                //反写账单
                var backObj = value.backObj;
                if (Object.keys(backObj).length > 0) {
                    for (let i in backObj) {
                        mapContext.write({
                            key: i + '_' + key + '_' + vprepId, // 确保 key 为字符串
                            value: backObj[i]
                        });
                    }
                }

            } catch (e) {
                record.submitFields({
                    type: 'customrecord_swc_payment_application',
                    id: key,
                    values: {
                        "custrecord_swc_pay_mistakememo": e.message
                    }
                });
                log.error("map-error",e.message);
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
            const key = reduceContext.key;
            log.audit('key', key);
            let id = key.split('_')[0];
            let type = key.split('_')[1];
            let sqId = key.split('_')[2];
            let vprepId = key.split('_')[3];
            try {
                // const len = reduceContext.values.length;
                let value = mergeJSONStrings(reduceContext.values);
                log.audit('value', value);
                if (type == 'VendBill') {
                    type = "vendorbill"
                } else {
                    type = "vendorcredit"
                }

                if (id) {
                    let billRec = record.load({
                        type: type,
                        id: id,
                        isDynamic: true
                    });
                    let lineCount = billRec.getLineCount({
                        sublistId: 'item'
                    });
                    if (lineCount) {
                        for (let i = 0;i < lineCount;i++) {
                            billRec.selectLine({
                                sublistId: 'item',
                                line: i
                            });
                            let line = billRec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'line'
                            });
                            if (line in value) {
                                //剩余金额
                                let notAmount = Number(billRec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_notnotused'
                                }));
                                notAmount = MatchTool.subN(notAmount,value[line].curAmount)
                                if (notAmount) {
                                    notAmount = MatchTool.fixed(notAmount,2);
                                }
                                billRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_notnotused',
                                    value: notAmount
                                });
                                //已支付金额
                                let alreadyAmount = Number(billRec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_alreadyused'
                                }));
                                alreadyAmount = MatchTool.addN(alreadyAmount,value[line].curAmount);
                                if (alreadyAmount) {
                                    alreadyAmount = MatchTool.fixed(alreadyAmount,2);
                                }
                                billRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_alreadyused',
                                    value: alreadyAmount
                                });
                                billRec.commitLine({
                                    sublistId: 'item'
                                });
                            }
                        }

                        billRec.save();
                    }
                }
                log.audit('反写成功');

            } catch (e) {
                log.error('error',e.message)

                if (vprepId) {
                    record.delete({
                        type: 'vendorpayment',
                        id: vprepId
                    })
                }
                record.submitFields({
                    type: 'customrecord_swc_payment_application',
                    id: sqId,
                    values: {
                        "custrecord_swc_pay_mistakememo": e.message
                    }
                });
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

        function getData(params) {
            let type = params.type;
            let id = params.id;
            log.audit('type',type);
            let adData = {};
            let curRec = record.load({type:type,id:id,isDynamic: true});
            //供应商
            var entity = curRec.getValue('custrecord_swc_pay_vendor');
            //子公司
            var subsidiary = curRec.getValue('custrecord_swc_pay_subsidary');
            //银行账户科目
            var account = curRec.getValue('custrecord_swc_pay_bankaccount');
            //货币
            var currency = curRec.getValue('custrecord_swc_pay_currency');
            //汇率
            var exchangerate = curRec.getValue('custrecord_swc_pay_currency_rate');
            //日期
            var trandate = curRec.getText('custrecord_swc_pay_actual_paydate');
            //备注
            var memo = curRec.getValue('custrecord_swc_pay_memo');
            //付款模式
            var mode = curRec.getValue('custrecord_swc_pay_mode');
            //现金流量表项
            var custbody_cseg_cn_cfi = curRec.getValue('custrecord_swc_cashflow_pay');
            var lineCount = curRec.getLineCount({sublistId: 'recmachcustrecord_swc_pay_line_main'});
            var mainFlag = false;
            //整单预付情况
            if (mode == SWC_CONFIG_DATA.configData().s_fkms_qbzf) {
                mainFlag = true;
            }
            var lineObj = {};
            var backObj = {};
            if (lineCount) {
                for (let i = 0;i < lineCount;i++) {
                    curRec.selectLine({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        line: i
                    });
                    //获取账单id
                    var billId = curRec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_bill'
                    });
                    //获取行id
                    var lineId = curRec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_line_number'
                    });

                    //获取本次付款金额
                    var curAmount = Number(curRec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_line_paynow'
                    }));
                    var lineCashier = curRec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_line_cashier'
                    });
                    if (mainFlag || lineCashier) {

                        //付款行数据
                        if (billId in lineObj) {
                            lineObj[billId].curAmount = lineObj[billId].curAmount + curAmount;
                        } else {
                            lineObj[billId] = {
                                curAmount: curAmount
                            }
                        }
                        var backType = curRec.getCurrentSublistValue({
                            sublistId: 'recmachcustrecord_swc_pay_line_main',
                            fieldId: 'custrecord_swc_pay_line_type'
                        });
                        //反写行数据
                        var backKey = billId + '_' + backType;
                        backObj[backKey] = backObj[backKey] || {};
                        backObj[backKey][lineId] = {
                            curAmount: curAmount,
                            lineCashier: lineCashier
                        }
                    }
                }
            }


            var custrecord_swc_payapply_link = curRec.id;
            adData[custrecord_swc_payapply_link] = {
                subsidiary: subsidiary,
                entity: entity,
                currency: currency,
                exchangerate: exchangerate,
                trandate: trandate,
                account: account,
                memo:memo,
                type: type,
                id: id,
                mode: mode,
                custbody_cseg_cn_cfi: custbody_cseg_cn_cfi,
                lineObj: lineObj,
                backObj: backObj
            }

            return adData
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
                            log.error(`键 ${key} 已存在，跳过重复键`);
                            // 或者合并对象内容
                            // result[key] = { ...result[key], ...obj[key] };
                        } else {
                            result[key] = obj[key];
                        }
                    });

                } catch (e) {
                    log.error(`解析第 ${index} 个JSON字符串失败:`, e);
                }
            });

            return result;
        }

        return {getInputData, map, reduce,summarize}

    });