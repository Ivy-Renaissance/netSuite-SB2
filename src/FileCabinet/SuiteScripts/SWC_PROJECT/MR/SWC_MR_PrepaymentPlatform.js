/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/runtime', 'N/search', 'N/record', 'N/currency', "../APP/SWC_APP_PrepaymentPlatform",'../common/MatchTool', '../common/SWC_CONFIG_DATA'],
    (runtime, search,record,currency,app,MatchTool,SWC_CONFIG_DATA) => {
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
            const obj = JSON.parse(scriptObj.getParameter({name: "custscript_advancepay_json"}));
            log.audit('obj',obj);
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
            log.audit('mapContext',mapContext);
            var key = mapContext.key;
            log.audit('key',key);
            var subsidiaryId = mapContext.key.split("_")[0];
            var vendorId = mapContext.key.split("_")[1];
            var pruId = mapContext.key.split("_")[2];
            var flag = mapContext.key.split("_")[3];
            var radio = mapContext.key.split("_")[4];
            var purCurrency = mapContext.key.split("_")[5];
            // var estimatedDate = new Date(mapContext.key.split("_")[3]);
            // var account = mapContext.key.split("_")[4];
            var value = JSON.parse(mapContext.value);
            log.audit('value',value);
            try {
                var sumAmount = 0;
                var basicObj = value.basicObj;
                delete value.basicObj;
                var precentObj = app.getPrecentObj();

                log.audit('测试0');
                var subRec = record.load({
                    type: 'subsidiary',
                    id: subsidiaryId,
                    isDynamic: true
                });
                var subCurrency = subRec.getText({fieldId:"currency"});

                var payRec = record.create({
                    type: "customrecord_swc_advancepay_plateform",
                    isDynamic: true,
                });
                //提出部门
                // payRec.setValue({
                //     fieldId: 'custrecord_swc_prepay_applaydepartment',
                //     value: SWC_CONFIG_DATA.configData().s_department_cgb
                // });
                //子公司赋值
                payRec.setValue({
                    fieldId: 'custrecord_swc_advancepay_subsidary',
                    value: subsidiaryId
                });
                //供应商赋值
                payRec.setValue({
                    fieldId: 'custrecord_swc_advancepay_vendor',
                    value: vendorId
                });
                //采购订单
                payRec.setValue({
                    fieldId: 'custrecord_swc_advancepay_po',
                    value: pruId
                });
                //预付款日期
                if (basicObj.orderDate) payRec.setText({
                    fieldId: 'custrecord_swc_advancepay_paydate2',
                    text: basicObj.orderDate
                });
                //预付款科目
                payRec.setValue({
                    fieldId: 'custrecord_swc_advancepay_account',
                    value: SWC_CONFIG_DATA.configData().S_ACCOUNT_YFZK_HWGYS //待定：暂默认预付账款-货物供应商
                });
                //预付款备注
                if (basicObj.memo) payRec.setValue({
                    fieldId: 'custrecord_swc_advancepay_memo',
                    value: basicObj.memo
                });
                //银行账户
                if (basicObj.account) payRec.setValue({
                    fieldId: 'custrecord_vendor_bankaccounts2',
                    value: basicObj.account
                });
                //付款条件
                if (basicObj.terms) payRec.setValue({
                    fieldId: 'custrecord_swc_vendor_items',
                    value: basicObj.terms
                });
                //审批状态
                payRec.setValue({
                    fieldId: 'custrecord_swc_advancepay_state',
                    value: SWC_CONFIG_DATA.configData().s_pr_status_WTJ//默认未提交
                });
                if (flag == 'true') payRec.setValue({
                    fieldId: 'custrecord_swc_advancepay_whole_yes',
                    value: true
                });
                if (flag == 'false') payRec.setValue({
                    fieldId: 'custrecord_swc_advancepay_whole_yes',
                    value: false
                });
                if (radio in precentObj) {
                    radio = parseInt(precentObj[radio].name)
                }
                //申请比例
                // if (flag == 'true' && radio) payRec.setValue({
                //     fieldId: 'custrecord_swc_advancepay_sum_percent1',
                //     value: radio
                // });
                //货币
                if (purCurrency) payRec.setValue({
                    fieldId: 'custrecord_swc_advancepay_currency',
                    value: purCurrency
                });

                if (basicObj.allQuantity) payRec.setValue({
                    fieldId: 'custrecord_swc_advancepay_allquantity',
                    value: Number(basicObj.allQuantity)
                });

                if (basicObj.allPreQuantity) payRec.setValue({
                    fieldId: 'custrecord_swc_advancepay_allprequantity',
                    value: Number(basicObj.allPreQuantity)
                });

                if (basicObj.bussiness) payRec.setValue({
                    fieldId: 'custrecord_swc_prepay_applaydepartment',
                    value: basicObj.bussiness
                });
                log.audit('测试1');

                // var curCurrency = payRec.getText({
                //     fieldId: 'custrecord_swc_advancepay_currency',
                // });
                // log.audit('curCurrency',curCurrency);
                // log.audit('subCurrency',subCurrency);
                // if (curCurrency == '人民币') curCurrency = 'CNY';
                // if (subCurrency == '人民币') subCurrency = 'CNY';
                // var exchangeRate = '';
                // if (basicObj.orderDate) exchangeRate = currency.exchangeRate({
                //     source: curCurrency,   // 来源货币代码
                //     target: subCurrency,   // 目标货币代码
                //     date: new Date(basicObj.orderDate)         // 汇率生效日期
                // });
                // log.audit('exchangeRate',exchangeRate);
                // //汇率
                // if (exchangeRate) payRec.setValue({
                //     fieldId: 'custrecord_swc_advancepay_currency_rate',
                //     value: exchangeRate
                // });
                // //预期预付款日期
                // if (date) payRec.setValue({
                //     fieldId: 'custrecord_swc_advancepay_paydate2',
                //     value: date
                // });
                // log.audit('value.length',value.length);
                let lineObj = [];
                let amountS1 = 0;
                let amountS2 = 0;
                let preObj = {};
                var skuData = [];
                for (let i in value) {
                    var line = value[i];
                    if (line.startKey in preObj) {
                        preObj[line.startKey].amount = preObj[line.startKey].amount + Number(line.prepaidAmount);
                    } else {
                        preObj[line.startKey] = {
                            "amount": Number(line.prepaidAmount)
                        }
                    }
                }
                log.audit('测试2');
                for (let i in value) {
                    var line = value[i];
                    log.audit('测试3');
                    payRec.selectNewLine({
                        sublistId: 'recmachcustrecord_swc_advancepay_main'
                    });
                    log.audit('测试4');
                    //订单类型
                    if (line.type2) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_ordertype',
                        value: line.type2
                    });
                    log.audit('测试5');
                    //行号
                    if (line.orderline) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_number',
                        value: line.orderline
                    });
                    //行唯一键 起始
                    if (line.startKey) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_initial',
                        value: line.startKey
                    });
                    if (skuData.indexOf(line.startKey) == -1 ) {
                        skuData.push(line.startKey);
                    }
                    //行唯一键 后续
                    if (line.endKey) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_aferwards',
                        value: line.endKey
                    });
                    lineObj.push(String(line.startKey));
                    //货品编码
                    if (line.item) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_item',
                        value: line.item
                    });
                    //货品名称
                    if (line.itemName) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_itemname',
                        value: line.itemName
                    });
                    // //货品名称
                    // if (line.itemName) payRec.setCurrentSublistValue({
                    //     sublistId: 'recmachcustrecord_swc_advancepay_main',
                    //     fieldId: 'custrecord_swc_advancepay_line_itemname'
                    // });
                    //未税单价
                    if (line.rate) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_price',
                        value: line.rate
                    });
                    //税率
                    if (line.tax) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_taxrate',
                        value: line.tax
                    });
                    //含税金额
                    if (line.taxprice) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_taxprice',
                        value: line.taxprice
                    });

                    //订单行数量
                    if (line.quantity) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_quantity',
                        value: line.quantity
                    });
                    //订单行含税总金额
                    if (line.grossamount) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_amount',
                        value: line.grossamount
                    });
                    amountS1 = amountS1 + Number(line.grossamount)
                    // //累计收获数量
                    // if (line.recvquantity) payRec.setCurrentSublistValue({
                    //     sublistId: 'recmachcustrecord_swc_advancepay_main',
                    //     fieldId: 'custrecord_swc_advancepay_linreceive_sum',
                    //     value: line.recvquantity
                    // });
                    //整单预付金额
                    if (line.preamount) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_sum',
                        value: line.preamount
                    });
                    //整单预付金额-分摊
                    if (line.preamountline) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_sum_share',
                        value: line.preamountline
                    });
                    //预计本次入库数量
                    if (line.estimatedNumber) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_receive_now',
                        value: line.estimatedNumber
                    });
                    //良品数量
                    if (line.goodnumber) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_good_num',
                        value: line.goodnumber
                    });
                    //良品价格
                    if (line.goodprice) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_good_pri',
                        value: line.goodprice
                    });
                    log.audit('测试6');
                    // //整单预付比例
                    if (line.ratio) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_sum_percent',
                        value: parseFloat(line.ratio)
                    });
                    log.audit('测试7');
                    //本次申请预付金额
                    if (line.prepaidAmount) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_amount_now',
                        value: line.prepaidAmount
                    });
                    payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_alreadyno',
                        value: preObj[line.startKey].amount
                    });

                    payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_useamount',
                        value: 0
                    });
                    amountS2 = amountS2 + Number(line.prepaidAmount)
                    //行备注
                    if (line.linememo) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_memo',
                        value: line.linememo
                    });

                    if (line.yjjsrq) payRec.setCurrentSublistText({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_edtdate',
                        text: line.yjjsrq
                    });

                    if (line.bhjh) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_advancepay_main',
                        fieldId: 'custrecord_swc_advancepay_line_demand',
                        value: line.bhjh
                    });
                    log.audit('line.prepaidAmount',line.prepaidAmount);

                    sumAmount = sumAmount + Number(line.prepaidAmount);
                    log.audit('测试8');
                    payRec.commitLine({
                        sublistId:'recmachcustrecord_swc_advancepay_main'
                    });
                    log.audit('测试9');
                }


                if (flag == 'true') {
                    log.error('amountS1',amountS1);
                    log.error('amountS2',amountS2);
                    let radio2 = MatchTool.mulN(MatchTool.fixed(MatchTool.divN(amountS2,amountS1),4),100);
                    payRec.setValue({
                        fieldId: 'custrecord_swc_advancepay_sum_percent1',
                        value: radio2
                    });
                }

                //预付款总金额
                payRec.setValue({
                    fieldId: 'custrecord_swc_advancepay_total_amount',
                    value: sumAmount
                });

                payRec.setValue({
                    fieldId: 'custrecord_swc_advancepay_no_sum',
                    value: sumAmount
                });

                payRec.setValue({
                    fieldId: 'custrecord_swc_advancepay_alread_sum',
                    value: 0
                });

                var payRecId = payRec.save({ignoreMandatoryFields: true});

                log.error('payRecId',payRecId);
                if (flag == 'true') {

                    //反写预付款申请单
                    var purRec = record.load({
                        type: 'purchaseorder',
                        id: pruId,
                        isDynamic: true
                    });
                    purRec.setValue({
                        fieldId: 'custbody_swc_whole_flag',
                        value: payRecId
                    });
                    var lineCount = purRec.getLineCount('item');
                    for (let j = 0; j < lineCount; j++) {
                        purRec.selectLine({
                            sublistId: 'item',
                            line: j
                        });
                        var lineId = purRec.getCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_swc_poline_initial_key"
                        });
                        if (lineObj.indexOf(String(lineId)) != -1) {
                            purRec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_swc_whole_flag',
                                value: payRecId
                            });
                            purRec.commitLine({
                                sublistId: 'item'
                            });
                        }
                    }
                    var backId = purRec.save({ignoreMandatoryFields: true});
                }

                log.error('创建成功',payRecId);
                log.error('反写成功',backId);
                log.error('创建结束');
                return payRecId;
            } catch (e) {
                log.error('map-错误', e.message);
                // 返回错误对象，携带关键信息
                mapContext.write({
                    key: pruId,
                    value: e.message
                });
            }

            // return payRecId;
            // return ''
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
            // 直接传递map的输出
            reduceContext.write({
                key: reduceContext.key,
                value: reduceContext.values
            });
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
            let hasError = false;
            let errorMessages = [];

            var contents = '';
            log.audit('summaryContext',summaryContext);
            summaryContext.output.iterator().each(function(key, value) {
                contents += (key + ': ' + value + '\n');
                hasError = true;
                // return true;
            });
            log.error('hasError',hasError);
            // log.error('contents',contents);

            // if (hasError) {
            log.error('检测到 map 阶段错误', contents);
            record.submitFields({
                type: 'customrecord_swc_script_error',
                id: 1,
                values: {
                    'custrecord_swc_script_error_message': contents
                }
            });
            // throw new Error('Map 阶段发生错误：' + errorMessages.join('；'));
            // }
        }

        return {getInputData, map,reduce, summarize}
    });