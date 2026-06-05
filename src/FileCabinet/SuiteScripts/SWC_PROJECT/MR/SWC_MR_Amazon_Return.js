/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/error', 'N/format', 'N/record', 'N/runtime', 'N/search','../common/MatchTool', '../common/moment', '../common/SWC_CONFIG_DATA'],

    (error, format, record, runtime, search,MatchTool,moment,SWC_CONFIG_DATA) => {
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
        var sales_return_record_type = 'customrecord_swc_amazon_returnorder'
        const getInputData = (inputContext) => {
            var orderid = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_return_order_id' });
            var startdate = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_return_startdate' });
            var enddate = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_return_enddate' });
            log.audit('params',{
                orderid: orderid,
                startdate: startdate,
                enddate: enddate
            });

            var filters = [
                ['custrecord_swc_amz_is_resolved', 'is', false ],
            ];
            var limit = 399;

            log.audit('orderid',orderid);
            if (orderid) {
                filters.push("AND")
                filters.push(['custrecord_swc_amz_rtid', 'equalto', orderid ])
            }
            if (enddate && startdate) {
                // filters.push({ name: 'custrecord_swc_amz_rtdate', operator: 'within', values: [startdate, enddate] })
                filters.push("AND")
                filters.push(['custrecord_swc_amz_rtdate', 'within', startdate,enddate])
            }
            if (enddate && !startdate) {
                // filters.push({ name: 'custrecord_swc_amz_rtdate', operator: 'onorbefore', values: enddate })
                filters.push("AND")
                filters.push(['custrecord_swc_amz_rtdate', 'onorbefore',enddate])
            }
            if (!enddate && startdate) {
                // filters.push({ name: 'custrecord_swc_amz_rtdate', operator: 'onorafter', values: startdate })
                filters.push("AND")
                filters.push(['custrecord_swc_amz_rtdate', 'onorbefore',startdate])
            }

            var orders = [];

            log.audit('filters',filters);
            search.create({
                type: sales_return_record_type,
                title: '亚马逊退货-退货报告数据检索' + new Date(),
                filters: filters,
                columns: [
                    { name: 'custrecord_swc_amz_rtmarketid' },//店铺ID
                    { name: 'custrecord_swc_amz_rtsalesorderid' },//源单号
                    { name: 'custrecord_swc_amz_rtitem' },//货品
                    { name: 'custrecord_swc_amz_rtquantity' },//数量
                    { name: 'custrecord_swc_amz_rtlocation' },//仓库标识
                    { name: 'custrecord_swc_amz_errormessage' },//错误信息
                    { name: 'custrecord_swc_amz_rtstatus' },//退货状态
                    { name: 'custrecord_swc_amz_rtdate' },//退货日期
                    { name: 'custrecord_swc_amz_rtdisposition' },//退货类型描述
                    // { name: 'custrecord_swc_amz_is_resolved' },//是否生成
                    { name: 'custrecord_swc_amz_return_retry' },//循环次数
                    // { name: 'custrecord_swc_amz_return_authorization' },//关联退货授权
                    // { name: 'custrecord_swc_amz_return_receipt' },//关联货品收据
                ]
            }).run().each(function (rec) {
                orders.push({
                    return_id: rec.id,
                    return_market: rec.getValue({ name: 'custrecord_swc_amz_rtmarketid'}),
                    acc_name: rec.getText({ name: 'custrecord_swc_amz_rtmarketid'}),
                    return_so: rec.getValue({ name: 'custrecord_swc_amz_rtsalesorderid'}),
                    return_item: rec.getValue('custrecord_swc_amz_rtitem'),
                    return_quantity: rec.getValue('custrecord_swc_amz_rtquantity'),
                    return_location: rec.getValue({ name: 'custrecord_swc_amz_rtlocation'}),
                    return_error: rec.getValue({ name: 'custrecord_swc_amz_errormessage'}),
                    return_status: rec.getValue({ name: 'custrecord_swc_amz_rtstatus'}),
                    return_date: rec.getValue({ name: 'custrecord_swc_amz_rtdate'}),
                    return_detailed_disposition: rec.getValue({ name: 'custrecord_swc_amz_rtdisposition'}),
                    return_retry: rec.getValue({ name: 'custrecord_swc_amz_return_retry'}),
                    // return_flag: rec.getValue({ name: 'custrecord_swc_amz_is_resolved'}),
                })
                return --limit > 0
            })
            log.audit('获取数量 orders', orders.length);
            return orders;
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
            var obj = JSON.parse(mapContext.value);
            log.audit('obj', obj)
            var return_id = obj.return_id;
            var return_market = obj.return_market;
            var return_so = obj.return_so;
            var return_item = obj.return_item;
            var return_quantity = obj.return_quantity;
            var return_location = obj.return_location;
            var return_status = obj.return_status;
            var return_date = obj.return_date;
            var return_detailed_disposition = obj.return_detailed_disposition;
            var return_retry = obj.return_retry;
            var acc_name = obj.acc_name;

            return_date = return_date.split(' ')[0];
            var customerRec = record.load({
                type: 'customer',
                id: return_market,
            });
            let bhwd = customerRec.getValue({
                fieldId: 'custentity_swc_plan_metrics'
            });
            //currency
            let currency = customerRec.getValue({
                fieldId: 'currency'
            });
            log.audit('return_date',return_date);
            var ra_id,ir_id;
            try {
                var soId = searchSoId(return_so);
                log.audit('销售订单',soId);

                if (return_status == 'Reimbursed') {
                    record.submitFields({
                        type: sales_return_record_type,
                        id: return_id,
                        values: {
                            custrecord_swc_amz_errormessage: '',
                            custrecord_swc_amz_return_retry: 0,//循环次数
                            custrecord_swc_amz_is_resolved: true
                        }
                    });
                    return
                }
                if (!bhwd) {
                    throw "该店铺无对应备货计划";
                }

                var location = searchLocations(bhwd);
                log.audit('location',location);
                var pici_cost;
                // search.create({
                //     type: "item",
                //     filters:
                //         [
                //             ["internalid","anyof",return_item],
                //             "AND",
                //             ["inventorylocation","anyof",location]
                //         ],
                //     columns:
                //         [
                //             search.createColumn({name: "itemid", label: "名称"}),
                //             search.createColumn({name: "inventorylocation", label: "库存地点"}),
                //             search.createColumn({
                //                 name: "subsidiary",
                //                 join: "inventoryLocation",
                //                 label: "子公司"
                //             }),
                //             search.createColumn({name: "locationquantityonhand", label: "地点现有"}),
                //             search.createColumn({name: "locationquantityavailable", label: "可用地点"}),
                //             search.createColumn({name: "locationtotalvalue", label: "地点总价值"}),
                //             search.createColumn({name: "locationaveragecost", label: "地点平均成本"})
                //         ]
                // }).run().each(function(rec) {
                //     var serialnumberquantity = rec.getValue({name: "locationaveragecost", label: "地点平均成本"});
                //     log.audit('serialnumberquantity',serialnumberquantity);
                //
                //     if (Number(serialnumberquantity) > 0) {
                //         pici_cost = Number(serialnumberquantity);
                //     }
                // });
                // log.audit('pici_cost',pici_cost);


                var ir_cost = {};
                //判断销售订单是否存在
                if (soId) {
                    log.audit('销售订单存在的情况');
                    var pici = searchPCData(soId, return_item);
                    log.audit('销售订单存在的情况-批次号',pici);
                    if (pici) {
                        //查询退货成本
                        //先获取销售订单发出成本
                        var so_loc_cost = getSoLocCost(soId, return_item);
                        log.debug('so发出成本', so_loc_cost);
                        if (!Object.keys(so_loc_cost).length) {
                            throw error.create({ name: 'error', message: '未匹配到销货成本金额', notifyOff: false });
                        } else {
                            ir_cost = so_loc_cost;
                        }
                        pici_cost = ir_cost[return_item];
                        //批次存在时
                        ra_id = TransformReturnAuthorization(return_id,soId, pici, return_item, return_quantity,return_date,location,pici_cost);
                        log.audit('ra_id',ra_id);
                        //创建 退货授权 后
                        if (ra_id) {
                            var date2 = new Date(return_date);
                            var year = date2.getFullYear();
                            var month = (date2.getMonth() + 1).toString().padStart(2, '0');
                            var day = date2.getDate().toString().padStart(2, '0');
                            var formattedDate = year + month + day; // 例如 "20260305"
                            var curpici = 'RMA' + '-' + formattedDate + '-' + ra_id + '-' + 'R';
                            ir_id =  TransformItemReceipt(return_id,ra_id, pici, return_item,return_quantity,return_date,curpici,pici_cost,currency);
                            log.audit('销售订单存在的情况-批次号存在情况-ir_id',ir_id);

                            if (ir_id) {
                                //回写
                                record.submitFields({
                                    type: sales_return_record_type,
                                    id: return_id,
                                    values: {
                                        custrecord_swc_amz_errormessage: '',
                                        custrecord_swc_amz_return_authorization: ra_id,
                                        custrecord_swc_amz_return_receipt: ir_id,
                                        custrecord_swc_amz_is_resolved: true,
                                        custrecord_swc_amz_return_retry: 0
                                    }
                                });
                            }
                        }
                        log.audit('销售订单存在的情况-批次号存在情况-ra_id', ra_id);
                    }
                    // else {
                    //     if (location) {
                    //         if (pici_cost) {
                    //             ra_id = createReturnAuthorization(return_id,return_item,return_date,location,return_market,return_quantity,return_so,pici_cost)
                    //             //创建 退货授权 后
                    //             if (ra_id) {
                    //                 var date2 = new Date(return_date);
                    //                 var year = date2.getFullYear();
                    //                 var month = (date2.getMonth() + 1).toString().padStart(2, '0');
                    //                 var day = date2.getDate().toString().padStart(2, '0');
                    //                 var formattedDate = year + month + day; // 例如 "20260305"
                    //                 var curpici = 'RMA' + '-' + formattedDate + '_' + ra_id + '_' + 'R';
                    //                 ir_id =  TransformItemReceipt(return_id,ra_id, pici, return_item,return_quantity,return_date,curpici,pici_cost);
                    //                 log.audit('销售订单存在的情况-批次号存在情况-ir_id',ir_id);
                    //
                    //                 if (ir_id) {
                    //                     //回写
                    //                     record.submitFields({
                    //                         type: sales_return_record_type,
                    //                         id: return_id,
                    //                         values: {
                    //                             custrecord_swc_amz_errormessage: '',
                    //                             custrecord_swc_amz_return_authorization: ra_id,
                    //                             custrecord_swc_amz_return_receipt: ir_id,
                    //                             custrecord_swc_amz_is_resolved: true,
                    //                             custrecord_swc_amz_return_retry: 0
                    //                         }
                    //                     });
                    //                 }
                    //             }
                    //
                    //         } else {
                    //             throw '销售订单未履行,查不到最近的对应入库成本';//如果直接创建入库成本为0
                    //         }
                    //     } else {
                    //         throw '销售订单未履行,查不到相应地点';//如果直接创建入库成本为0
                    //     }
                    // }
                } else {
                    log.audit('无销售订单时-处理',return_market);
                    log.audit('无销售订单时-location',location);
                    if (location) {
                        // //获取店铺的退货仓
                        // var re_loc_data = getReturnLoc(return_market, location);
                        // if (!Object.keys(re_loc_data).length) {
                        //     throw error.create({ name: 'error', message: acc_name + ':找不到退货仓库/备货维度，请维护退货仓库、备货维度', notifyOff: false });
                        // }
                        // if (!re_loc_data.loc_id || !re_loc_data.plan_metrics) {
                        //     throw error.create({ name: 'error', message: acc_name + ':找不到退货仓库/备货维度，请维护退货仓库、备货维度', notifyOff: false });
                        // }
                        //退货成本先获取退货收货仓的地点平均成本，若退货收货仓没有地点平均成本，则使用店铺维护的备货维度查询仓库类型为3PL、FBA、CG的地点平均成本用于退货成本
                        var ra_loc_cost = getItemPrice(location, return_item);
                        log.debug('退货收货仓的地点平均成本', ra_loc_cost);
                        if (!Object.keys(ra_loc_cost).length) {
                            //查询备货维度对应的仓库
                            var loc_arr = getLocArr(return_market);
                            log.debug('备货维度对应的仓库', loc_arr);
                            if (loc_arr.length > 0) {
                                ir_cost = getItemPrice(loc_arr, return_item);
                                log.debug('备货维度的地点平均成本', ir_cost);
                            } else {
                                throw error.create({ name: 'error', message: '该备货维度下不存在仓库类型为平台仓的仓库', notifyOff: false });
                            }
                        } else {
                            ir_cost = ra_loc_cost;
                        }
                        pici_cost = ir_cost[return_item];
                        if (pici_cost) {

                            ra_id = createReturnAuthorization(return_id,return_item,return_date,location,return_market,return_quantity,return_so,pici_cost)

                            //创建 退货授权 后
                            if (ra_id) {
                                var date2 = new Date(return_date);
                                var year = date2.getFullYear();
                                var month = (date2.getMonth() + 1).toString().padStart(2, '0');
                                var day = date2.getDate().toString().padStart(2, '0');
                                var formattedDate = year + month + day; // 例如 "20260305"
                                var curpici = 'RMA' + '-' + formattedDate + '-' + ra_id + '-' + 'R';
                                ir_id =  TransformItemReceipt(return_id,ra_id, pici, return_item,return_quantity,return_date,curpici,pici_cost,currency);
                                log.audit('销售订单不存在的情况-批次号存在情况-ir_id',ir_id);

                                if (ir_id) {
                                    //回写
                                    record.submitFields({
                                        type: sales_return_record_type,
                                        id: return_id,
                                        values: {
                                            custrecord_swc_amz_errormessage: '',
                                            custrecord_swc_amz_return_authorization: ra_id,
                                            custrecord_swc_amz_return_receipt: ir_id,
                                            custrecord_swc_amz_is_resolved: true,
                                            custrecord_swc_amz_return_retry: 0
                                        }
                                    });
                                }
                            }
                        } else {
                            throw '销售订单未履行,入库成本';//如果直接创建入库成本为0
                        }
                    } else {
                        throw '入库失败无相应地点';//如果直接创建入库成本为0
                    }
                }



            } catch (err) {

                log.debug('map error', err)
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                if (ra_id) {
                    record.delete({
                        type: record.Type.RETURN_AUTHORIZATION,
                        id: ra_id
                    });
                }

                // if (ia_id) {
                //     record.delete({
                //         type: 'inventoryadjustment',
                //         id: ia_id
                //     });
                // }

                record.submitFields({
                    type: sales_return_record_type,
                    id: return_id,
                    values: {
                        custrecord_swc_amz_errormessage: e,
                        custrecord_swc_amz_is_resolved: false,
                        custrecord_swc_amz_return_retry:Number(return_retry) + 1
                    }
                });


                log.audit('e.message',e.message);
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

        function searchSoId(return_so) {
            const salesorderSearchObj = search.create({
                type: "salesorder",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","SalesOrd"],
                        "AND",
                        ["formulatext: {otherrefnum}","startswith",return_so]
                    ]
            });
            var id = '';
            var results = getAllResults(salesorderSearchObj);
            if (results.length > 0) {
                id = results[0].id;
            }

            return id
        }

        function searchPCData(soId,return_item) {
            const itemfulfillmentSearchObj = search.create({
                type: "itemfulfillment",
                title: '亚马逊退货-批次号检索',
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","ItemShip"],
                        "AND",
                        ["createdfrom","anyof",soId],
                        "AND",
                        ["item","anyof",return_item],
                        "AND",
                        ["inventorydetail.inventorynumber","noneof","@NONE@"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "inventorynumber",
                            join: "inventoryDetail",
                            label: " 编号"
                        })
                    ]
            });
            // var searchId = itemfulfillmentSearchObj.save();
            // log.audit('searchId',searchId);

            var obj = {};
            var results = getAllResults(itemfulfillmentSearchObj);

            var inventorynumber = '';
            if (results.length > 0) {
                inventorynumber = results[0].getText({
                    name: "inventorynumber",
                    join: "inventoryDetail",
                    label: " 编号"
                });
            }

            return inventorynumber
        }

        function createReturnAuthorization(return_id,return_item,return_date,location,return_market,return_quantity,return_so,pici_cost) {

            var customerRec = record.load({
                type: 'customer',
                id: return_market,
            });
            var r_sub = customerRec.getValue({
                fieldId: 'subsidiary'
            });
            log.audit('r_sub',r_sub);

            var rec = record.create({
                type: record.Type.RETURN_AUTHORIZATION,
                isDynamic: true
            });

            rec.setValue({
                fieldId: 'entity',
                value: return_market
            });
            rec.setValue({
                fieldId: 'subsidiary',
                value: r_sub
            });
            rec.setText({ fieldId: 'trandate', text:  return_date });

            rec.setValue({
                fieldId: 'location',
                value: location
            });

            rec.selectNewLine({
                sublistId: 'item',
            });

            rec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                value: return_item
            });

            rec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                value: return_quantity
            });

            // log.audit('批次号存在的情况-单价',pici_cost);
            // log.audit('批次号存在的情况-数量',return_quantity);
            // // // inventorydetail：按批次拆分
            // const invDetail = rec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
            // log.audit('设置批次')
            //
            // invDetail.selectNewLine({ sublistId: 'inventoryassignment' });
            //
            // var date = new Date();
            // var year = date.getFullYear();
            // var month = (date.getMonth() + 1).toString().padStart(2, '0');
            // var day = date.getDate().toString().padStart(2, '0');
            // var formattedDate = year + month + day; // 例如 "20260305"
            // var pici = 'RMA' + '-' + formattedDate + '_' + 'R';
            //
            // invDetail.setCurrentSublistValue({
            //     sublistId: 'inventoryassignment',
            //     fieldId: 'receiptinventorynumber',
            //     value: pici
            // });
            //
            // var shurupici = invDetail.getCurrentSublistValue({
            //     sublistId: 'inventoryassignment',
            //     fieldId: 'receiptinventorynumber',
            // });
            // log.audit('shurupici',shurupici);
            //
            // invDetail.setCurrentSublistValue({
            //     sublistId: 'inventoryassignment',
            //     fieldId: 'quantity',
            //     value: return_quantity
            // });
            //
            // invDetail.commitLine({ sublistId: 'inventoryassignment' });

            rec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: pici_cost
            });

            rec.commitLine({sublistId: 'item'});

            var id = rec.save();

            return id
        }

        function TransformReturnAuthorization(return_id,soId,pici,return_item,return_quantity,return_date,location,pici_cost) {
            var rec = record.transform({
                fromType: record.Type.SALES_ORDER,
                toType: record.Type.RETURN_AUTHORIZATION,
                fromId: soId,
                isDynamic: true
            });
            rec.setText({ fieldId: 'trandate', text:  return_date });

            var lineCount = rec.getLineCount({
                sublistId: 'item'
            });
            log.audit('lineCount',lineCount);

            rec.setValue({
                fieldId: 'custbody_swc_amazon_returnorder',
                value: return_id
            });

            rec.setValue({
                fieldId: 'location',
                value: location
            });

            for (let i = lineCount - 1;i >= 0;i--) {
                rec.selectLine({
                    sublistId: 'item',
                    line: i
                });
                var item = rec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item'
                });
                log.audit('批次号存在的情况-货品',item);
                if (item == return_item) {

                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: return_quantity
                    });

                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: pici_cost
                    });

                    rec.commitLine({sublistId: 'item'});
                } else {
                    rec.removeLine({
                        sublistId: 'item',
                        line: i,
                        ignoreRecalc: true
                    });
                }
            }
            var id = rec.save();

            return id
        }

        function TransformItemReceipt(return_id,ra_id, pici, return_item,return_quantity,return_date,curpici,pici_cost,currency) {
            var return_itemreceipt = record.transform({
                fromType: record.Type.RETURN_AUTHORIZATION,
                toType: 'itemreceipt',
                fromId: Number(ra_id),
                isDynamic: true,
            });

            return_itemreceipt.setText({ fieldId: 'trandate', text:  return_date });

            return_itemreceipt.setValue({
                fieldId: 'custbody_swc_amazon_returnorder',
                value: return_id
            });
            var lineCount = return_itemreceipt.getLineCount({
                sublistId: 'item'
            });
            log.audit('lineCount',lineCount);

            for (let i = lineCount - 1;i >= 0;i--) {
                return_itemreceipt.selectLine({
                    sublistId: 'item',
                    line: i
                });
                var item = return_itemreceipt.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item'
                });

                return_itemreceipt.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'unitcostoverride',
                    value: pici_cost
                });

                return_itemreceipt.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'unitcostoverridecurrency',
                    value: currency
                });

                log.audit('批次号存在的情况-货品', item);
                if (item == return_item) {

                    if (pici) return_itemreceipt.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_swc_original_if_serialnumber',
                        value: pici
                    });

                    log.audit('批次号存在的情况-数量', return_quantity);
                    // // inventorydetail：按批次拆分
                    const invDetail = return_itemreceipt.getCurrentSublistSubrecord(
                        {sublistId: 'item', fieldId: 'inventorydetail'});
                    log.audit('设置批次')

                    invDetail.selectNewLine({sublistId: 'inventoryassignment'});

                    invDetail.setCurrentSublistText({
                        sublistId: 'inventoryassignment',
                        fieldId: 'receiptinventorynumber',
                        text: String(curpici)
                    });

                    invDetail.setCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'quantity',
                        value: return_quantity
                    });

                    invDetail.commitLine({sublistId: 'inventoryassignment'});

                    return_itemreceipt.commitLine({sublistId: 'item'});
                }
            }

            var receiptId = return_itemreceipt.save();

            return receiptId
        }

        function SearchReturnAuthorization(return_id) {
            log.debug('SearchReturnAuthorization', return_id)
            var rs = false
            search.create({
                type: record.Type.RETURN_AUTHORIZATION,
                filters: [
                    { name: "custbody_swc_az_customer_return", operator: "anyof", values: return_id },
                ],
                columns: [
                    { name: "status" },
                    { name: "location" },
                    { name: "custbody_dps_account" },
                ]
            }).run().each(function (rec) {
                rs = {
                    rat_id: rec.id,
                    status: rec.getValue("status"),
                    location: rec.getValue("location"),
                    ra_account: rec.getValue("custbody_dps_account"),
                }
            });
            return rs
        }

        function searchLocations(return_market) {
            const locationSearchObj = search.create({
                type: "location",
                filters:
                    [
                        ["custrecord_swc_location_store","anyof",return_market],
                        "AND",
                        ["custrecord_swc_location_type","anyof",SWC_CONFIG_DATA.configData().s_cltype_fba],//默认FBA仓,s_cltype_fba
                        "AND",
                        ["custrecord_swc_location_attribute","anyof",SWC_CONFIG_DATA.configData().s_attribute_ptc]//默认平台仓 s_attribute_ptc
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });

            var id ;
            var results = getAllResults(locationSearchObj);

            if (results.length > 0)
                id = results[0].getValue({name: "internalid", label: "内部 ID"});

            return id
        }

        /**
         * 通用检索方法
         * @param mySearch
         * @returns {[]}
         */
        function getAllResults(mySearch) {
            var resultSet = mySearch.run();
            var resultArr = [];
            var start = 0;
            var step = 1000;
            var results = resultSet.getRange({
                start: start,
                end: step
            });
            while (results && results.length > 0) {
                resultArr = resultArr.concat(results);
                start = Number(start) + Number(step);
                results = resultSet.getRange({
                    start: start,
                    end: Number(start) + Number(step)
                });
            }
            return resultArr;
        }

        function CreateInventoryAdjustment(return_market,return_item,pici_cost, location, return_id, return_date, return_quantity) {
            try {
                log.audit('CreateInventoryAdjustment', {
                    pici_cost: pici_cost
                });

                var r_location = location;
                var r_sub = '';
                var customerRec = record.load({
                    type: 'customer',
                    id: return_market,
                });
                r_sub = customerRec.getValue({
                    fieldId: 'subsidiary'
                });
                log.audit('r_sub',r_sub);
                log.audit('r_location', r_location);
                if (!r_location) {
                    throw error.create({
                        name: '5023',
                        message: '店铺仓库信息没维护完全,请检查店铺信息是否维护完全FBA仓 与 FBA 退货回仓',
                        notifyOff: false
                    });
                }

                var inv_rec = record.create({ type: 'inventoryadjustment', isDynamic: true });

                inv_rec.setValue({ fieldId: 'subsidiary', value: r_sub});
                inv_rec.setValue({ fieldId: 'customer', value: return_market});
                inv_rec.setValue({ fieldId: 'account', value: 132});
                inv_rec.setValue({ fieldId: 'trandate', value: moment(return_date).toDate() });
                inv_rec.setValue({ fieldId: 'custbody_dps_az_customer_return', value: return_id });

                inv_rec.selectNewLine({ sublistId: 'inventory' })
                inv_rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'item', value: return_item });
                inv_rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'location', value: r_location });
                inv_rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: return_quantity });
                inv_rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'unitcost', value: pici_cost });

                var itemResult = search.lookupFields({ type: 'item', id: return_item, columns: ['itemid', 'islotitem', 'isserialitem'] });


                var item_text = itemResult['itemid'];
                if (item_text.indexOf(':') != -1) {
                    item_text = item_text.slice(Number(item_text.indexOf(':')) + 1);
                }
                var pici = item_text.trim();
                var inventorydetail = inv_rec.getCurrentSublistSubrecord({ sublistId: 'inventory', fieldId: 'inventorydetail' });
                inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', value: pici });
                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: return_quantity });
                inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                inventorydetail.commitLine({ sublistId: 'inventoryassignment' });

                inv_rec.commitLine({ sublistId: 'inventory' })
                return inv_rec.save({ ignoreMandatoryFields: true });

            } catch (err) {
                log.error('CreateInventoryAdjustment error', err);
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        function getSoLocCost(so_id, item_ids) {
            var cost_info = {};
            search.create({
                type: 'itemfulfillment',
                settings: [{ 'name': 'consolidationtype', 'value': 'NONE' }, { 'name': 'includeperiodendtransactions', 'value': 'F' }],
                filters:
                    [
                        ['type', 'anyof', 'ItemShip'],
                        'AND',
                        ['createdfrom', 'anyof', so_id],
                        'AND',
                        ['cogs', 'is', 'T'],
                        'AND',
                        ['account', 'noneof', '920'],
                        'AND',
                        ['item', 'anyof', item_ids]
                    ],
                columns:
                    [
                        'item',
                        'cogsamount'//销货成本金额
                    ]
            }).run().each(function (result) {
                cost_info[result.getValue(result.columns[0])] = Math.abs(result.getValue(result.columns[1]));
                return true;
            });
            return cost_info;
        }

        function getReturnLoc(acc_id, loc_id) {
            var loc_data = search.lookupFields({ type: 'customer', id: acc_id, columns: ['subsidiary', 'custentity_swc_plan_metrics'] });
            var loc_rec = {};
            if (loc_data.subsidiary.length > 0 && loc_data.custentity_swc_plan_metrics.length > 0) {
                //使用店铺子公司+退货仓库ID匹配地点信息
                var rec_loc_id = getLocId(loc_data.subsidiary[0].value, loc_id);
                loc_rec.loc_id = rec_loc_id || '';
                loc_rec.plan_metrics = loc_data.custentity_swc_plan_metrics[0].value;
            }
            return loc_rec;
        }

        function getLocId(sub_id, loc_id) {
            var need_id;
            search.create({
                type: 'location',
                filters:
                    [
                        ['custrecord_swc_jj_warehouse_id', 'is', loc_id],
                        'AND',
                        ['subsidiary', 'anyof', sub_id]
                    ]
            }).run().each(function (result) {
                need_id = result.id;
                return false;
            });
            return need_id;
        }

        function getItemPrice(loc_id, item_id) {
            var price = {};
            search.create({
                type: 'inventoryitem',
                filters:
                    [
                        ['internalid', 'anyof', item_id],
                        'AND',
                        ['inventorylocation', 'anyof', loc_id]
                    ],
                columns:
                    [
                        'internalid',
                        'locationaveragecost',//地点平均成本
                    ]
            }).run().each(function (result) {
                if (!price[result.getValue(result.columns[0])] && result.getValue(result.columns[1])) {
                    price[result.getValue(result.columns[0])] = result.getValue(result.columns[1]);
                }
                return true;
            });
            return price;
        }

        function getLocArr(return_market) {
            var rec_loc = [];
            search.create({
                type: 'location',
                filters:
                    [
                        ["custrecord_swc_location_store","anyof",return_market],
                        "AND",
                        ["custrecord_swc_location_type","anyof",SWC_CONFIG_DATA.configData().s_cltype_fba],//默认FBA仓,s_cltype_fba
                        "AND",
                        ["custrecord_swc_location_attribute","anyof",SWC_CONFIG_DATA.configData().s_attribute_ptc],//默认平台仓 s_attribute_ptc
                        "AND",
                        ['isinactive', 'is', 'F']
                    ]
            }).run().each(function (result) {
                rec_loc.push(result.id);
                return true;
            });
            return rec_loc;
        }

        return {getInputData, map, reduce, summarize}

    });