/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/runtime', 'N/search', 'N/record','../common/MatchTool', '../common/SWC_CONFIG_DATA'],
    (runtime, search,record,MatchTool,SWC_CONFIG_DATA) => {
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
            const obj = JSON.parse(scriptObj.getParameter({name: "custscript_heardpay_json"}));
            log.audit('obj',obj);
            log.audit('生成付款单',Object.keys(obj).length);
            if (Object.keys(obj).length === 0)
                return;

            return {
                "obj": obj
            };
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
            var value = JSON.parse(mapContext.value);
            log.audit('value',value);
            var subsidiaryId = value.subsidiary;
            var vendorId = value.vendor;
            var currency = value.currency;
            var memo = value.memo;
            var amountSum = value.amountsum;
            var accountA = value.account;
            var terms = value.terms;
            var preDate = value.preDate;
            var bussiness = value.bussiness;
            var returnObj = {};
            try {
                //账单
                var vendorRec = record.load({
                    type: 'vendor',
                    id: vendorId,
                    isDynamic: true
                });
                var account = vendorRec.getValue({
                    fieldId: 'payablesaccount'
                })

                //创建付款申请单
                var payRec = record.create({
                    type: "customrecord_swc_payment_application",
                    isDynamic: true,
                });

                //提出部门赋值
                payRec.setValue({
                    fieldId: 'custrecord_swc_payapply_department',
                    value: bussiness
                });

                //子公司赋值
                payRec.setValue({
                    fieldId: 'custrecord_swc_pay_subsidary',
                    value: subsidiaryId
                });
                //供应商赋值
                payRec.setValue({
                    fieldId: 'custrecord_swc_pay_vendor',
                    value: vendorId
                });
                //预计付款日期
                if (preDate) payRec.setText({
                    fieldId: 'custrecord_swc_pay_paydate',
                    text: preDate
                });
                // //账单
                // payRec.setValue({
                //     fieldId: 'custrecord_swc_pay_vendoebill',
                //     value: billId
                // });
                //货币
                payRec.setValue({
                    fieldId: 'custrecord_swc_pay_currency',
                    value: currency
                });
                // //汇率
                // payRec.setValue({
                //     fieldId: 'custrecord_swc_pay_vendoebill',
                //     value: rate
                // });
                //审批状态
                payRec.setValue({
                    fieldId: 'custrecord_swc_pay_state',
                    value: SWC_CONFIG_DATA.configData().s_pr_status_WTJ //默认待提交
                });
                //付款科目
                payRec.setValue({
                    fieldId: 'custrecord_swc_pay_account',
                    value: account
                });
                //备注
                payRec.setValue({
                    fieldId: 'custrecord_swc_pay_memo',
                    value: memo
                });
                //付款申请总金额
                payRec.setValue({
                    fieldId: 'custrecord_swc_pay_total_amount',
                    value: amountSum
                });

                //付款条件
                payRec.setValue({
                    fieldId: 'custrecord_swc_vendorpay_items',
                    value: terms
                });
                // 银行账户
                payRec.setValue({
                    fieldId: 'custrecord_swc_vendor_bankaccount',
                    value: accountA
                });


                let pendingSum = 0;
                for (let i =0;i < value.lineData.length;i++) {
                    var line = value.lineData[i];
                    payRec.selectNewLine({
                        sublistId: 'recmachcustrecord_swc_pay_line_main'
                    });
                    //订单类型
                    if (line.type2) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_line_type2',
                        value: line.type2
                    });

                    //行号
                    if (line.orderline) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_line_number',
                        value: line.orderline
                    });
                    //账单
                    if (line.orderId) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_bill',
                        value: line.orderId
                    });
                    //对账单
                    if (line.dzd) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_line_dz',
                        value: line.dzd
                    });
                    //货品编码
                    if (line.item) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_line_item',
                        value: line.item
                    });
                    //货品名称
                    if (line.itemName) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_line_itemname',
                        value: line.itemName
                    });
                    //数量
                    if (line.quantity) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_line_quantity',
                        value: line.quantity
                    });
                    //未税单价
                    if (line.rate) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_line_price',
                        value: line.rate
                    });
                    //税率
                    // if (line.tax) payRec.setCurrentSublistValue({
                    //     sublistId: 'recmachcustrecord_swc_pay_line_main',
                    //     fieldId: 'custrecord_swc_pay_line_taxrate',
                    //     value: line.tax
                    // });
                    //订单行含税总金额
                    if (line.grossamount) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_line_amount',
                        value: line.grossamount
                    });
                    //待支付金额
                    if (line.grossamount) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_line_topay',
                        value: line.grossamount
                    });

                    pendingSum = MatchTool.addN(pendingSum,line.grossamount);
                    // //之前申请金额
                    // if (line.usedamount) payRec.setCurrentSublistValue({
                    //     sublistId: 'recmachcustrecord_swc_pay_line_main',
                    //     fieldId: 'custrecord_pay_line_used',
                    //     value: line.usedamount
                    // });
                    //本次支付金额
                    if (line.grossamount) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_line_paynow',
                        value: line.grossamount
                    });
                    //行备注
                    // if (line.memo) payRec.setCurrentSublistValue({
                    //     sublistId: 'recmachcustrecord_swc_pay_line_main',
                    //     fieldId: 'custrecord_swc_pay_line_memo',
                    //     value: line.memo
                    // });
                    //类型
                    if (line.type) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pay_line_type',
                        value: line.type
                    });

                    //起运港
                    if (line.qyg) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pyline_qyg',
                        value: line.qyg
                    });

                    //目的港
                    if (line.mdg) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pyline_mdg',
                        value: line.mdg
                    });

                    //装柜日期
                    if (line.zgrq) payRec.setCurrentSublistText({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pyline_zgdate',
                        text: line.zgrq
                    });

                    //预计进港时间
                    if (line.jgrq) payRec.setCurrentSublistText({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pyline_jgdate',
                        text: line.jgrq
                    });

                    //到港时间
                    if (line.dgrq) payRec.setCurrentSublistText({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pyline_dgdate',
                        text: line.dgrq
                    });

                    //出港待送货时间
                    if (line.cgrq) payRec.setCurrentSublistText({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pyline_chdate',
                        text: line.cgrq
                    });

                    //还柜时间
                    if (line.hgrq) payRec.setCurrentSublistText({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pyline_hgdate',
                        text: line.hgrq
                    });

                    // //到仓时间
                    // if (line.spo) payRec.setCurrentSublistValue({
                    //     sublistId: 'recmachcustrecord_swc_pay_line_main',
                    //     fieldId: 'custrecord_swc_dzline_dcdate',
                    //     value: line.spo
                    // });

                    //SPO号
                    if (line.spo) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pyline_spo',
                        value: line.spo
                    });

                    //包装体积
                    if (line.volume) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pyline_volume',
                        value: line.volume
                    });

                    //合约柜/非合约柜
                    if (line.cabinet) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pyline_contract',
                        value: line.cabinet
                    });

                    //全链路/到港
                    if (line.full) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pyline_fullick',
                        value: line.full
                    });

                    //柜号
                    if (line.container) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pyline_container',
                        value: line.container
                    });

                    //Broker Reference
                    if (line.broker) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_wl_broker',
                        value: line.broker
                    });

                    //Entry Number
                    if (line.entry) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_wl_entry',
                        value: line.entry
                    });

                    //INV NO
                    if (line.invno) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_wl_invno',
                        value: line.invno
                    });

                    //物流发运单
                    if (line.wlid) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_wl_fba_paper',
                        value: line.wlid
                    });

                    // //订单号
                    if (line.po) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_wl_po',
                        value: line.po
                    });

                    //线下对账单号
                    if (line.xxdzd) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_pyline_xxdzd',
                        value: line.xxdzd
                    });

                    //海外仓入库单号
                    if (line.hwrkdh) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_hw_lc_number_fc',
                        value: line.hwrkdh
                    });

                    //总真实发运数量
                    if (line.zzsfysl) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_total_shipment_qua_fc',
                        value: line.zzsfysl
                    });

                    //目的海外仓库代码
                    if (line.mdhwckdm) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_md_location_fc',
                        value: line.mdhwckdm
                    });

                    //货柜尺寸
                    if (line.hgcc) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_wl_zg_size_fc',
                        value: line.hgcc
                    });

                    //调拨费-单据编号
                    if (line.dbddjbh) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_document_number_fc',
                        value: line.dbddjbh
                    });

                    //尾程费用_出库单号
                    if (line.wcckdh) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_lastmile_po_fc',
                        value: line.wcckdh
                    });

                    //尾程费用_跟踪号
                    if (line.wcgzh) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_lastmile_track_fc',
                        value: line.wcgzh
                    });

                    //尾程费用_实物SKU/仓库SKU
                    if (line.wcswsku) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_lastmile_sku_fc',
                        value: line.wcswsku
                    });

                    //尾程费用_仓库代码
                    if (line.wcckdm) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_lastmile_place_fc',
                        value: line.wcckdm
                    });

                    //尾程费用_SKU数量
                    if (line.wcquantity) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_lastmile_quantity_fc',
                        value: line.wcquantity
                    });

                    //尾程费用_计费日期
                    if (line.wcjfdate) payRec.setCurrentSublistText({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_lastmile_jfdate_fc',
                        text: line.wcjfdate
                    });

                    //尾程费用_入库单号/物流子单号
                    if (line.wcrkdh) payRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_pay_line_main',
                        fieldId: 'custrecord_swc_lastmile_receipt_fc',
                        value: line.wcrkdh
                    });


                    // var shengyuAmount = (Number(line.pending || 0)) - (Number(line.curamount || 0)) - (Number(line.usedamount || 0))
                    // //本次支付金额
                    // if (shengyuAmount) payRec.setCurrentSublistValue({
                    //     sublistId: 'recmachcustrecord_swc_pay_line_main',
                    //     fieldId: 'custrecord_swc_pay_line_remain',
                    //     value: line.shengyuAmount
                    // });
                    payRec.commitLine({
                        sublistId: 'recmachcustrecord_swc_pay_line_main'
                    });
                    var returnKey = line.orderId + '_' + line.type;
                    returnObj[returnKey] = returnObj[returnKey] || {};
                    returnObj[returnKey].lineData = returnObj[returnKey].lineData || [];
                    returnObj[returnKey].lineData.push(line.orderline);
                }

                payRec.setValue({
                    fieldId: 'custrecord_swc_pay_remain_amount',
                    value: MatchTool.fixed(pendingSum,2)
                })

                var payRecId = payRec.save({ignoreMandatoryFields: true});
                log.audit('payRecId',payRecId);

                for (let key in returnObj) {
                    returnObj[key].recId = payRecId;
                    mapContext.write({
                        key: key, // 确保 key 为字符串
                        value: returnObj[key]
                    });
                }
            } catch (e) {
                log.error('map-错误', e.message);
                // 返回错误对象，携带关键信息
                mapContext.write({
                    key: 'error' + '_' + 'error',
                    value: e.message
                });
            }
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
            var key = reduceContext.key;
            log.audit('key', key);

            var id = key.split('_')[0];
            if (id == 'error') {
                reduceContext.write({
                    key: id,
                    value: reduceContext.values
                });
            } else {
                var value = JSON.parse(reduceContext.values);
                var recId = value.recId;
                var lineData = value.lineData;
                log.audit('value',value);
                var type = key.split('_')[1];
                try {
                    if (type == 'VendBill') {
                        type = "vendorbill"
                    } else {
                        type = "vendorcredit"
                    }

                    //回写事务处理
                    var rec = record.load({
                        type: type,
                        id: id,
                        isDynamic: true
                    });

                    var itemCount = rec.getLineCount('item');

                    if (itemCount > 0) {

                        for (let i = 0; i < itemCount; i++) {
                            rec.selectLine({
                                sublistId: 'item',
                                line: i
                            });
                            // var startkey = rec.getCurrentSublistValue({
                            //     sublistId: 'item',
                            //     fieldId: 'custcol_swc_poline_initial_key'
                            // });
                            // var endkey = rec.getCurrentSublistValue({
                            //     sublistId: 'item',
                            //     fieldId: 'custcol_swc_poline_afterwards_key'
                            // });
                            var lineId = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'line'
                            });
                            var onlyKey = lineId;
                            if (lineData.indexOf(String(onlyKey)) != -1) {
                                rec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_vendor_application',
                                    value: recId
                                });
                            }
                            rec.commitLine({
                                sublistId: 'item'
                            });
                        }
                    }

                    rec.save({
                        ignoreMandatoryFields: true
                    });

                } catch (e) {
                    log.error('error',e.message);
                    reduceContext.write({
                        key: id,
                        value: e.message
                    });
                }
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
            let hasError = false;
            let errorMessages = [];

            var contents = '';
            summaryContext.output.iterator().each(function(key, value) {
                contents += (key + ': ' + value + '\n');
                hasError = true;
                // return true;
            });
            log.error('hasError',hasError);
            // log.error('contents',contents);

            // if (hasError) {
            log.error('错误信息', contents);
            record.submitFields({
                type: 'customrecord_swc_script_error',
                id: 5,
                values: {
                    'custrecord_swc_script_error_message': contents
                }
            });
            // throw new Error('Map 阶段发生错误：' + errorMessages.join('；'));
            // }
        }

        return {getInputData, map,reduce, summarize}

    });