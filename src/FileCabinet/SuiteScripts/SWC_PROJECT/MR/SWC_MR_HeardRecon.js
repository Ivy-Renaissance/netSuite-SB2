/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record','N/runtime', '../common/moment', '../common/SWC_CONFIG_DATA'],
    (record,runtime,moment,SWC_CONFIG_DATA) => {
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
            const obj = JSON.parse(scriptObj.getParameter({name: "custscript_heardreconc_json"}));
            log.audit('obj',obj);
            if (!obj)
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
            try {
                var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
                log.audit('dateFormat',dateFormat);
                var value = JSON.parse(mapContext.value);
                log.audit('value',value);

                var idObj = {};

                //创建客户对账单
                var rec = record.create({
                    type: 'customrecord_swc_account_statement',
                    isDynamic: true
                });

                rec.setValue({
                    fieldId: 'custrecord_swc_applaydepartment',
                    value: value.bussiness
                });
                //子公司
                if (value.subsidiary) rec.setValue({
                    fieldId: 'custrecord_swc_statement_subsidiary',
                    value: value.subsidiary
                });

                //供应商
                if (value.vendor) rec.setValue({
                    fieldId: 'custrecord_swc_statement_customer',
                    value: value.vendor
                });
                //货币
                if (value.currency) rec.setValue({
                    fieldId: 'custrecord_swc_statement_currency',
                    value: value.currency
                });
                //对账日期
                if (value.date) {
                    var date = value.date ? moment(value.date).format(dateFormat) : '';
                    log.audit('date',date);
                    rec.setText({
                        fieldId: 'custrecord_swc_statement_date',
                        text: date
                    });
                }
                //审批状态
                rec.setValue({
                    fieldId: 'custrecord_swc_statement_state',
                    value: SWC_CONFIG_DATA.configData().s_pr_status_ypz//默认已批准
                });
                //对账总金额
                if (value.reconciliationAmount) rec.setValue({
                    fieldId: 'custrecord_swc_statement_amount',
                    value: value.reconciliationAmount
                });
                //应付总金额
                if (value.payAmount) rec.setValue({
                    fieldId: 'custrecord_swc_statement_topay',
                    value: value.payAmount
                });
                //备注
                if (value.memo) rec.setValue({
                    fieldId: 'custrecord_swc_statement_memo',
                    value: value.memo
                });


                for (let i = 0;i < value.lineData.length;i++) {
                    var lines = value.lineData[i];
                    rec.selectNewLine("recmachcustrecord_swc_dz_main");
                    //订单类型
                    if (lines.type2) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_type2',
                        value: lines.type2
                    });
                    //类型
                    if (lines.type) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_type',
                        value: lines.type
                    });
                    //账单/账单贷项
                    if (lines.id) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_doc',
                        value: lines.id
                    });
                    // //订单号
                    if (lines.po) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_po',
                        value: lines.po
                    });
                    //货品
                    if (lines.item) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_sku',
                        value: lines.item
                    });
                    //SKU名称
                    if (lines.item2) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_sku_datail',
                        value: lines.item2
                    });

                    //SKU数量
                    if (lines.number) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_number',
                        value: lines.number
                    });
                    //SKU单价
                    if (lines.price) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_price',
                        value: lines.price
                    });
                    //含税总额
                    if (lines.amount) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_amount',
                        value: lines.amount
                    });

                    //起运港
                    if (lines.qyg) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_qyg',
                        value: lines.qyg
                    });

                    //目的港
                    if (lines.mdg) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_mdg',
                        value: lines.mdg
                    });

                    //装柜日期
                    if (lines.zgrq) rec.setCurrentSublistText({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_zgdate',
                        text: lines.zgrq
                    });

                    //预计进港时间
                    if (lines.jgrq) rec.setCurrentSublistText({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_jgdate',
                        text: lines.jgrq
                    });

                    //到港时间
                    if (lines.dgrq) rec.setCurrentSublistText({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_dgdate',
                        text: lines.dgrq
                    });

                    //出港待送货时间
                    if (lines.cgrq) rec.setCurrentSublistText({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_chdate',
                        text: lines.cgrq
                    });

                    //还柜时间
                    if (lines.hgrq) rec.setCurrentSublistText({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_hgdate',
                        text: lines.hgrq
                    });

                    // //到仓时间
                    // if (lines.spo) rec.setCurrentSublistValue({
                    //     sublistId: 'recmachcustrecord_swc_dz_main',
                    //     fieldId: 'custrecord_swc_dzline_dcdate',
                    //     value: lines.spo
                    // });

                    //SPO号
                    if (lines.spo) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_spo',
                        value: lines.spo
                    });

                    //包装体积
                    if (lines.volume) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_volume',
                        value: lines.volume
                    });

                    //合约柜/非合约柜
                    if (lines.cabinet) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_contract',
                        value: lines.cabinet
                    });

                    //全链路/到港
                    if (lines.full) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_fullick',
                        value: lines.full
                    });

                    //Broker Reference
                    if (lines.broker) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_broker',
                        value: lines.broker
                    });

                    //Entry Number
                    if (lines.entry) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_entry',
                        value: lines.entry
                    });

                    //INV NO
                    if (lines.invno) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_invno',
                        value: lines.invno
                    });
                    //线下对账单
                    if (lines.xxdzd) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_xxdzd',
                        value: lines.xxdzd
                    });

                    //物流发运单
                    if (lines.wlid) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dz_fba_paper',
                        value: lines.wlid
                    });

                    //到期日
                    if (lines.duedate)  {
                        var dueDate = lines.duedate ? moment(lines.duedate).format(dateFormat) : '';
                        log.error('lines.duedate',lines.duedate);
                        log.error('lines.duedate',dueDate);
                        rec.setCurrentSublistText({
                            sublistId: 'recmachcustrecord_swc_dz_main',
                            fieldId: 'custrecord_swc_dzline_duedate',
                            text: dueDate
                        });
                    }
                    //逾期天数
                    rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_dzline_ramaindate',
                        value: lines.ramaindate
                    });

                    //海外仓入库单号
                    if (lines.hwrkdh) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_hw_lc_number_dz',
                        value: lines.hwrkdh
                    });

                    //总真实发运数量
                    if (lines.zzsfysl) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_total_shipment_qua_dz',
                        value: lines.zzsfysl
                    });

                    //目的海外仓库代码
                    if (lines.mdhwckdm) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_md_location_dz',
                        value: lines.mdhwckdm
                    });

                    //货柜尺寸
                    if (lines.hgcc) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_wl_zg_size_dz',
                        value: lines.hgcc
                    });

                    //调拨费-单据编号
                    if (lines.dbddjbh) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_document_number_dz',
                        value: lines.dbddjbh
                    });

                    //尾程费用_出库单号
                    if (lines.wcckdh) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_lastmile_po_dz',
                        value: lines.wcckdh
                    });

                    //尾程费用_跟踪号
                    if (lines.wcgzh) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_lastmile_track_dz',
                        value: lines.wcgzh
                    });

                    //尾程费用_实物SKU/仓库SKU
                    if (lines.wcswsku) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_lastmile_sku_dz',
                        value: lines.wcswsku
                    });

                    //尾程费用_仓库代码
                    if (lines.wcckdm) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_lastmile_place_dz',
                        value: lines.wcckdm
                    });

                    //尾程费用_SKU数量
                    if (lines.wcquantity) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_lastmile_quantity_dz',
                        value: lines.wcquantity
                    });

                    //尾程费用_计费日期
                    if (lines.wcjfdate) rec.setCurrentSublistText({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_lastmile_jfdate_dz',
                        text: lines.wcjfdate
                    });

                    //尾程费用_入库单号/物流子单号
                    if (lines.wcrkdh) rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_swc_dz_main',
                        fieldId: 'custrecord_swc_lastmile_receipt_dz',
                        value: lines.wcrkdh
                    });

                    var key = lines.lineid;
                    if (!(lines.id in idObj)) {
                        idObj[lines.id] = {
                            type: lines.type,
                            lines: []
                        };
                    }
                    idObj[lines.id].lines.push(key);
                    rec.commitLine({sublistId: 'recmachcustrecord_swc_dz_main'});
                }

                var recId = rec.save();
                log.audit('recId',recId);


                for (let key in idObj) {
                    let obj = idObj[key];
                    mapContext.write({
                        key: key + '_' + obj.type, // 确保 key 为字符串
                        value: {
                            recId: recId,
                            lineData: obj.lines
                        }
                    });
                }

                return idObj;
            } catch (e) {
                log.audit('e',e.message);
                mapContext.write({
                    key: 'error' + '_' + 'error',
                    value: e.message
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
                    if (type == '账单' || type == '费用账单') {
                        type = "vendorbill";
                    } else {
                        type = "vendorcredit";
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
                                    fieldId: 'custcol_swc_vendor_statement',
                                    value: recId
                                });
                            }
                            rec.commitLine({
                                sublistId: 'item'
                            });
                        }
                    }

                    var fyCount = rec.getLineCount('expense');
                    log.audit('fyCount',fyCount);
                    if (fyCount > 0) {
                        for (let i = 0;i < fyCount;i++) {
                            rec.selectLine({
                                sublistId: 'expense',
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
                                sublistId: 'expense',
                                fieldId: 'line'
                            });
                            log.audit('lineId',lineId);
                            var onlyKey = lineId;
                            log.audit('onlyKey',onlyKey);
                            if (lineData.indexOf(String(onlyKey)) != -1) {
                                rec.setCurrentSublistValue({
                                    sublistId: 'expense',
                                    fieldId: 'custcol_swc_vendor_statement',
                                    value: recId
                                });
                            }
                            rec.commitLine({
                                sublistId: 'expense'
                            });
                        }
                    }
                    // var statement = rec.getValue('custbody_swc_customer_statement');
                    // log.audit('statement',statement);
                    //
                    // // 判断statement的类型并处理
                    // if (!statement || statement === '' || statement === null || statement === undefined) {
                    //     // 如果是空，则创建新数组并添加value
                    //     var newStatementArray = [recId];
                    //     rec.setValue('custbody_swc_customer_statement', newStatementArray);
                    // } else if (Array.isArray(statement)) {
                    //     // 如果是数组，则直接push
                    //     statement.push(recId);
                    //     rec.setValue('custbody_swc_customer_statement', statement);
                    // } else if (typeof statement === 'string') {
                    //     // 如果是字符串，先转换为数组
                    //     try {
                    //         // 先尝试解析是否为JSON数组字符串
                    //         var parsedStatement = JSON.parse(statement);
                    //         if (Array.isArray(parsedStatement)) {
                    //             parsedStatement.push(recId);
                    //             rec.setValue('custbody_swc_customer_statement', parsedStatement);
                    //         } else {
                    //             // 如果不是数组，则创建新数组
                    //             var newArray = [parsedStatement, recId];
                    //             rec.setValue('custbody_swc_customer_statement', newArray);
                    //         }
                    //     } catch (e) {
                    //         // 如果不是JSON，则作为普通字符串处理
                    //         var newArray = [statement, recId];
                    //         rec.setValue('custbody_swc_customer_statement', newArray);
                    //     }
                    // } else {
                    //     // 其他类型（如数字、对象等），创建新数组
                    //     var newArray = [statement, recId];
                    //     rec.setValue('custbody_swc_customer_statement', newArray);
                    // }

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
                id: 4,
                values: {
                    'custrecord_swc_script_error_message': contents
                }
            });
            // throw new Error('Map 阶段发生错误：' + errorMessages.join('；'));
            // }
        }

        return {getInputData, map,reduce, summarize}

    });