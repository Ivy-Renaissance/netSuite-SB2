/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_AZ_INVENTORYLEDGER.js
 *@description AZ库存分类账-调整
 */
define(['../common/interface', '../common/moment', 'N/runtime', 'N/record', 'N/search', 'N/format', 'N/error'],
    function (interface, moment, runtime, record, search, format, error) {

        var record_type = 'customrecord_swc_amz_inventoryledger'
        function getInputData() {
            var startTime = new Date().getTime();
            log.emergency('getInputData 开始', startTime);
            // var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_az_il_store' });
            var internalid = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_az_il_internalid' });
            var warehouseid = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_az_il_warehouseid' });
            var orderid = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_az_il_orderid' });
            // var shipdate_start = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_az_il_shipdate_start' });
            // var shipdate_end = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_az_il_shipdate_end' });
            var req_limit = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_az_il_limit' });
            // var memo = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_az_il_memo' });

            // if (shipdate_start) {
            //     shipdate_start = format.format({ value: shipdate_start, type: 'date' })
            // }
            // if (shipdate_end) {
            //     shipdate_end = format.format({ value: shipdate_end, type: 'date' })
            // }
            var orders = [];
            var limit = 399;
            var filters = [
                { name: 'custrecord_swc_amz_il_resolved', operator: 'is', values: false },
                { name: 'custrecord_swc_amz_eventtype', operator: 'is', values: 'Adjustments' },
            ]
            if (orderid) {
                filters.push({ name: 'custrecord_swc_amz_referenceid', operator: 'is', values: orderid })
            };
            if (warehouseid) {
                filters.push({ name: 'custrecord_swc_amz_warehouseid', operator: 'is', values: warehouseid })
            };
            // if (shipdate_end && shipdate_start) {
            //     filters.push({ name: 'custrecord_swc_amz_reportdate', operator: 'within', values: [shipdate_start, shipdate_end] })
            // }
            // if (shipdate_end && !shipdate_start) {
            //     filters.push({ name: 'custrecord_swc_amz_reportdate', operator: 'onorbefore', values: shipdate_end })
            // }
            // if (!shipdate_end && shipdate_start) {
            //     filters.push({ name: 'custrecord_swc_amz_reportdate', operator: 'onorafter', values: shipdate_start })
            // }
            if (req_limit) {
                limit = req_limit;
            }
            // if (memo) {
            //     filters.push({ name: 'custrecord_swc_amz_il_error', operator: 'contains', values: memo })
            // }
            if (internalid) {
                filters.push({ name: 'internalid', operator: 'is', values: internalid })
            }
            log.audit('filters', filters)
            search.create({
                type: record_type,
                filters: filters,
                columns: [
                    { name: 'custrecord_swc_amz_il_retry', sort: search.Sort.ASC },
                    { name: 'custrecord_swc_amz_reportdate', sort: search.Sort.ASC },
                    { name: 'custrecord_swc_amz_quantity' },
                    { name: 'custrecord_swc_amz_ybmsku' },
                    { name: 'custrecord_swc_amz_referenceid' },
                    { name: 'custrecord_swc_amz_warehouseid' },
                    { name: 'custrecord_swc_amz_sku' },
                    { name: 'custrecord_swc_amz_eventtype' },
                ]
            }).run().each(function (rec) {
                orders.push({
                    fsd_id: rec.id,
                    fsd_retry: rec.getValue({ name: 'custrecord_swc_amz_il_retry', sort: search.Sort.ASC }),
                    fsd_shipment_date: rec.getValue({ name: 'custrecord_swc_amz_reportdate', sort: search.Sort.ASC }),
                    fsd_quantity: rec.getValue('custrecord_swc_amz_quantity'),
                    fsd_sku: interface.replaceToChinessChar(rec.getValue('custrecord_swc_amz_ybmsku')),
                    fsd_warehouseid: rec.getValue('custrecord_swc_amz_warehouseid'),
                    fsd_order_id: rec.getValue('custrecord_swc_amz_referenceid'),
                    fsd_item: rec.getValue('custrecord_swc_amz_sku'),
                    fsd_type: rec.getValue('custrecord_swc_amz_eventtype'),
                });
                return --limit > 0
            })
            log.emergency('获取数量 orders', orders.length)
            var endTime = new Date().getTime();
            log.emergency('getInputData 结束', endTime);
            log.emergency('getInputData 耗时', endTime - startTime);
            return orders;
        }

        function map(context) {
            var startTime = new Date().getTime();
            log.emergency('map 开始', startTime);
            var obj = JSON.parse(context.value);
            log.audit('obj', obj)
            var fsd_id = obj.fsd_id;
            var fsd_retry = obj.fsd_retry;
            // var fsd_acc_id = obj.fsd_acc_id;
            var fsd_shipment_date = obj.fsd_shipment_date;
            var fsd_quantity = obj.fsd_quantity;
            var fsd_sku = obj.fsd_sku;
            var fsd_order_id = obj.fsd_order_id;
            var fsd_warehouseid = obj.fsd_warehouseid;
            var fsd_item_text = obj.fsd_item;
            var fsd_type = obj.fsd_type;
            var so_obj = {}, sku_obj = {}, so_id, so_ship_location = '';
            var items_info = [];
            var so_invoice_id, so_itemfulfillment_id, ia_id;
            var oii_flag = false;
            var fsd_item;
            try {
                // var acc_info = interface.GetAccountInfo(fsd_acc_id);
                // log.audit('acc_info', acc_info);
                if (!fsd_warehouseid) {
                    throw '发货仓Id 不存在';
                }
                var location_info = interface.GetLocationInfo(fsd_warehouseid);
                log.audit('location_info', location_info);
                if (!fsd_item_text) {
                    throw 'SKU未匹配';
                } else {
                    //查询货品
                    search.create({
                        type: 'item',
                        filters: [
                            { name: 'itemid', operator: 'is', values: fsd_item_text },
                        ],
                    }).run().each(function (rec) {
                        fsd_item = rec.id;
                    });
                    log.audit('fsd_item', fsd_item);
                }
                if (fsd_type == 'Adjustments') {
                    var ia_id = CreateInventoryAdjustment(fsd_id, location_info, fsd_item, fsd_quantity, fsd_order_id, fsd_shipment_date);
                    log.audit('ia_id', ia_id);

                    if (ia_id) {
                        record.submitFields({
                            type: record_type,
                            id: fsd_id,
                            values: {
                                custrecord_swc_amz_il_resolved: true,
                                custrecord_swc_amz_il_error: '',
                                custrecord_swc_amz_il_retry: '0',
                                custrecord_swc_amz_il_relation_ia: ia_id,
                            },
                            options: {
                                ignoreMandatoryFields: true
                            }
                        });
                    }
                }
                else {
                    throw '其他类型,暂不处理'
                }
            } catch (err) {
                log.debug('map error', err)
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                record.submitFields({
                    type: record_type,
                    id: fsd_id,
                    values: {
                        custrecord_swc_amz_il_error: e,
                        custrecord_swc_amz_il_retry: Number(fsd_retry) + 1
                    },
                    options: {
                        ignoreMandatoryFields: true
                    }
                })
            }
            var endTime = new Date().getTime();
            log.emergency('map 结束', endTime);
            log.emergency('map 耗时', (endTime - startTime) + '----' + fsd_order_id);
        }

        function reduce(context) {

        }

        function summarize(summary) {

        }

        function CreateInventoryAdjustment(fsd_id, location_info, fsd_item, fsd_quantity, fsd_order_id, fsd_shipment_date) {
            try {
                log.audit('CreateInventoryAdjustment', {
                    fsd_id: fsd_id,
                    location_info: location_info,
                    fsd_item: fsd_item,
                    fsd_quantity: fsd_quantity,
                    fsd_order_id: fsd_order_id,
                    fsd_shipment_date: fsd_shipment_date,
                });
                var assetaccount;
                fsd_shipment_date = format.parse({ value: fsd_shipment_date, type: 'date' });
                var inv_rec = record.create({ type: 'inventoryadjustment', isDynamic: true });
                inv_rec.setValue({ fieldId: 'subsidiary', value: location_info.subsidiary });
                // if (fsd_quantity > 0) {
                //     inv_rec.setValue({ fieldId: 'account', value: '1127' });//6301.01 营业外收入_盘盈利得
                // } else {
                //     inv_rec.setValue({ fieldId: 'account', value: '762' });// 6711.03 营业外支出_盘亏损失
                // }
                if (runtime.accountId == '11297254_SB1') {
                    inv_rec.setValue({ fieldId: 'account', value: '974' });// 待处理财产损溢
                } else {
                    inv_rec.setValue({ fieldId: 'account', value: '203' });// 待处理财产损溢
                }
                inv_rec.setValue({ fieldId: 'memo', value: fsd_order_id });
                inv_rec.setValue({ fieldId: 'trandate', value: fsd_shipment_date });
                inv_rec.setValue({ fieldId: 'custbody_swc_gl_az_inventoryledger', value: fsd_id }); // 关联库存分类账

                inv_rec.selectNewLine({ sublistId: 'inventory' })
                inv_rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'item', value: fsd_item });
                inv_rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'location', value: location_info.id });
                inv_rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: fsd_quantity });

                var invOnhand = inv_rec.getCurrentSublistValue({ sublistId: 'inventory', fieldId: 'quantityonhand' });
                log.debug('库存现有量  : qty', invOnhand + " : " + fsd_quantity);
                if (fsd_quantity < 0 && (Number(fsd_quantity) + Number(invOnhand)) < 0) {
                    throw '库存不足，需要调出货品, 但仓库无库存'
                }
                var itemResult = search.lookupFields({ type: 'item', id: fsd_item, columns: ['itemid', 'islotitem', 'isserialitem', 'assetaccount'] });
                log.audit('itemResult', itemResult);
                var islotitem = itemResult['islotitem'];
                var isserialitem = itemResult['isserialitem'];
                log.audit('assetaccount1', assetaccount);
                if (!assetaccount) {
                    assetaccount = itemResult['assetaccount'][0].value;
                }
                log.audit('assetaccount2', assetaccount);
                if (fsd_quantity > 0) {
                    if (islotitem || isserialitem) {
                        var inventorydetail = inv_rec.getCurrentSublistSubrecord({ sublistId: 'inventory', fieldId: 'inventorydetail' });
                        inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                        inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', value: fsd_order_id });
                        inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: fsd_quantity });
                        inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                        inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                    }
                } else {
                    if (islotitem || isserialitem) {
                        IAInventoryDetails(inv_rec, fsd_item, fsd_quantity, location_info.id, assetaccount)
                    }
                }
                inv_rec.commitLine({ sublistId: 'inventory' })
                return inv_rec.save({ ignoreMandatoryFields: true });
            } catch (err) {
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        //批次选择方案1:
        //第一步:先搜索所有当天有结余的批次号，并记录该批次当天结余;
        //第二步:拿这些批次号当过滤条件查当前时间点还有结余的批次;
        //第三步:满足上两步条件的批次，按天汇总当天出入库数，一天天累加算出当天结余，并记录最低结余数，最低结余数才是该批次真实的可用量;(一次性搜出所有批次的数据，按批次分开算)
        function IAInventoryDetails(f, itemid, quantity, location, assetaccount) {
            log.debug('IAInventoryDetails', {
                quantity: quantity,
                location: location,
                assetaccount: assetaccount,
            })
            try {
                var qty = quantity;
                var inventorydetail = f.getCurrentSublistSubrecord({ sublistId: 'inventory', fieldId: 'inventorydetail' });
                var invennumber = [];
                var invennumber_quanty = {};
                var invennumber_quanty_min = {};
                var inven_quantity = 0, founded = true;
                var date = f.getValue('trandate');
                var local_datetime = format.format({
                    value: date,
                    type: format.Type.DATE,
                });
                if (!assetaccount) {
                    search.create({
                        type: 'item',
                        filters: [
                            { name: 'internalId', operator: 'is', values: itemid },
                        ],
                        columns: [
                            { name: 'assetaccount' }
                        ]
                    }).run().each(function (rec) {
                        assetaccount = rec.getValue('assetaccount');
                    });
                    if (!assetaccount) {
                        throw error.create({
                            name: '5012',
                            message: '库存商品资产账户没配置好',
                            notifyOff: false
                        });
                    }
                }
                //第一步:先搜索所有当天有结余的批次号，并记录当天结余;
                var serialnumbers = [], serialnumbers_date = [], sd_sort = 1;
                var t_filters = [
                    [
                        ['taxline', 'is', 'false'], 'and',
                        ['shipping', 'is', 'false'], 'and',
                        ['item', 'anyof', [itemid]], 'and',
                        ['location', 'anyof', [location]], 'and',
                        ['trandate', 'onorbefore', local_datetime], 'and',//发货当天之前
                        ['type', 'anyof', ["InvAdjst", "ItemShip", "ItemRcpt", "InvTrnfr", "Build", "Unbuild", "CustInvc", "VendBill"]], 'and',
                        ['account', 'anyof', [assetaccount]], 'and',
                        ['quantity', 'isnotempty', ''], 'and',
                        [
                            ['appliedtotransaction.type', 'noneof', "ItemShip"], 'or',
                            [
                                ['appliedtotransaction.type', 'anyof', "ItemShip"], 'and',
                                ['createdfrom.type', 'anyof', "RtnAuth"]
                            ]
                        ], 'and',
                        ['serialnumber', 'isnotempty', ''], 'and',
                        [
                            ['mainline', 'is', 'false'], 'or',
                            [
                                ['type', 'anyof', ["Build", "Unbuild"]], 'and',
                                ['mainline', 'any', '']
                            ]
                        ]
                    ], 'or',
                    [
                        ['item', 'anyof', [itemid]], 'and',
                        ['location', 'anyof', [location]], 'and',
                        ['trandate', 'onorbefore', local_datetime], 'and',//发货当天之前
                        ['account', 'anyof', [assetaccount]], 'and',
                        ['quantity', 'isnotempty', ''], 'and',
                        ['serialnumber', 'isnotempty', ''], 'and',
                        ['type', 'anyof', ["BinTrnfr"]]
                    ]
                ];
                log.debug('t_filters', t_filters)
                search.create({
                    type: "transaction",
                    filters: t_filters,
                    columns: [
                        { name: "serialnumber", summary: "GROUP" },
                        { name: "serialnumberquantity", summary: "SUM" },
                        { name: "trandate", summary: "GROUP", sort: search.Sort.ASC },
                    ]
                }).run().each(function (e) {
                    // log.debug('发货当天之前有结余', e)
                    if (Number(e.getValue(e.columns[1])) > 0) {
                        //如果当天结余大于0，记录当天结余，并把批次号记录起来
                        invennumber_quanty[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                        invennumber_quanty_min[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                        serialnumbers.push(e.getValue(e.columns[0]));
                        serialnumbers_date.push({
                            serialnumber: e.getValue(e.columns[0]),
                            trandate: e.getValue(e.columns[2]),
                            sort_key: sd_sort,
                        });
                        sd_sort++
                    }
                    return true;
                })
                log.debug('serialnumbers', serialnumbers)
                if (serialnumbers.length == 0) {
                    throw error.create({
                        name: '5015',
                        message: '出库当天之前无可用批次号',
                        notifyOff: false
                    });
                }

                //第二步:先搜索所有当前时间可用量大于0的批次
                search.create({
                    type: "inventorynumber",
                    filters: [
                        { name: 'item', operator: 'anyof', values: [itemid] },
                        { name: 'location', operator: 'anyof', values: [location] },
                        { name: 'quantityavailable', operator: 'notequalto', values: 0 },  //可用数量不为零
                    ],
                    columns: [
                        { name: "inventorynumber" },
                        { name: "quantityintransit" },
                        { name: "quantityavailable" },
                        { name: "internalid", sort: search.Sort.DESC }
                    ]
                }).run().each(function (e) {
                    if (serialnumbers.indexOf(e.getValue('inventorynumber')) != -1) {
                        //当前可用量大于0且当天可用量大于0才记录
                        invennumber.push({
                            inventorynumber_id: e.id,
                            inventorynumber: e.getValue('inventorynumber'),
                            quantityavailable: e.getValue('quantityavailable'),
                            quantityintransit: e.getValue('quantityintransit'),
                            actual_quantityavailable: 0, //实际可用数量默认为0，实际可用数量后面查每天出入库累加取最小值
                            trandate: '',
                            sort_key: '',
                        });
                    }
                    return true
                });
                //排序，按照入库日期排序
                for (let i = 0; i < serialnumbers_date.length; i++) {
                    for (let j = 0; j < invennumber.length; j++) {
                        if (serialnumbers_date[i].serialnumber == invennumber[j].inventorynumber) {
                            invennumber[j].trandate = serialnumbers_date[i].trandate;
                            invennumber[j].sort_key = serialnumbers_date[i].sort_key;
                        }
                    }
                }

                invennumber.sort((a, b) => { return a.sort_key - b.sort_key });

                log.debug('第一次invennumber', invennumber)
                // log.debug('第一次invennumber_quanty', invennumber_quanty)
                // log.debug('第一次invennumber_quanty_min', invennumber_quanty_min)
                if (invennumber.length == 0) {
                    //库存不足,直接返回
                    throw error.create({
                        name: '5016',
                        message: '当前时间可用库存不足',
                        notifyOff: false
                    });
                } else if (invennumber.length > 0) {
                    var fils1 = [
                        [
                            [
                                ['taxline', 'is', 'false'], 'and',
                                ['shipping', 'is', 'false'], 'and',
                                ['item', 'anyof', [itemid]], 'and',
                                ['location', 'anyof', [location]], 'and',
                                ['trandate', 'after', local_datetime], 'and',//当天之后的每天出入库数量之和
                                ['type', 'anyof', ["InvAdjst", "ItemShip", "ItemRcpt", "InvTrnfr", "Build", "Unbuild", "CustInvc", "VendBill"]], 'and',
                                ['account', 'anyof', [assetaccount]], 'and',
                                ['quantity', 'isnotempty', ''], 'and',
                                [
                                    ['appliedtotransaction.type', 'noneof', "ItemShip"], 'or',
                                    [
                                        ['appliedtotransaction.type', 'anyof', "ItemShip"], 'and',
                                        ['createdfrom.type', 'anyof', "RtnAuth"]
                                    ]
                                ], 'and',
                                ['serialnumber', 'isnotempty', ''], 'and',
                                [
                                    ['mainline', 'is', 'false'], 'or',
                                    [
                                        ['type', 'anyof', ["Build", "Unbuild"]], 'and',
                                        ['mainline', 'any', '']
                                    ]
                                ]
                            ], 'or',
                            [
                                ['item', 'anyof', [itemid]], 'and',
                                ['location', 'anyof', [location]], 'and',
                                ['trandate', 'after', local_datetime], 'and',//当天之后的每天出入库数量之和
                                ['account', 'anyof', [assetaccount]], 'and',
                                ['quantity', 'isnotempty', ''], 'and',
                                ['serialnumber', 'isnotempty', ''], 'and',
                                ['type', 'anyof', ["BinTrnfr"]]
                            ]
                        ]
                    ];
                    var fils2 = [];

                    fils1.push('and')
                    for (var index = 0; index < invennumber.length; index++) {
                        fils2.push(['serialnumber', 'is', invennumber[index].inventorynumber])
                        if (index < invennumber.length - 1) {
                            fils2.push('or')
                        }
                    }
                    fils1.push(fils2)
                    log.debug('fils1', fils1)
                    // log.debug('开始搜索每天库存')

                    search.create({
                        type: "transaction",
                        filters: fils1,
                        columns: [
                            { name: "trandate", summary: "GROUP", sort: search.Sort.ASC },
                            { name: "serialnumber", summary: "GROUP" },
                            { name: "serialnumberquantity", summary: "SUM" }
                        ]
                    }).run().each(function (e) {
                        // log.debug('当天有结余', e)
                        var key = e.getValue(e.columns[1])
                        invennumber_quanty[key] = Number(invennumber_quanty[key]) + Number(e.getValue(e.columns[2]))//那天的结余
                        if (Number(invennumber_quanty_min[key]) > Number(invennumber_quanty[key])) {
                            //如果那天的结余比出库当天的结余还小，则替换；需取最小结余量
                            invennumber_quanty_min[key] = Number(invennumber_quanty[key])
                        }
                        return true;
                    });

                    // log.debug('invennumber_quanty', invennumber_quanty)
                    // log.debug('invennumber_quanty_min', invennumber_quanty_min)
                    // log.debug('invennumber2', invennumber)
                    //赋值批次库存可用列表中的实际可用量
                    for (var i = 0; i < invennumber.length; i++) {
                        invennumber[i].actual_quantityavailable = invennumber_quanty_min[invennumber[i].inventorynumber];
                        if (invennumber[i].actual_quantityavailable > invennumber[i].quantityavailable) {
                            invennumber[i].actual_quantityavailable = invennumber[i].quantityavailable
                        }
                        if (Number(invennumber_quanty_min[invennumber[i].inventorynumber]) > 0) {
                            //如果批次实际可用量大于0，那么累加到库存可用量中
                            inven_quantity += Number(invennumber_quanty_min[invennumber[i].inventorynumber])
                        }
                    }
                    log.debug('invennumber3', invennumber)

                    var tempQty = 0 - Number(qty);/*  数量转为正数  */
                    if (inven_quantity < tempQty) {
                        // 可用库存不足
                        throw error.create({
                            name: '5017',
                            message: '实际最小可用库存不足,可用库存量：' + inven_quantity + ',调整数量：' + tempQty + '.批次号：' + JSON.stringify(invennumber),
                            notifyOff: false
                        });
                    } else {
                        //可能会有多批次
                        /*  属于调出货品, 需要按批次调出  */
                        log.debug('tempQty  typeof  ' + typeof tempQty, tempQty);
                        for (var i = 0, len = invennumber.length; i < len; i++) {
                            var tempObj = invennumber[i];
                            var tempQuantity = Number(tempObj.actual_quantityavailable);
                            if (Number(tempQuantity) <= 0) {
                                //如果实际可用数量小于等于0，则调过此批次
                                continue
                            }
                            var setQty = 0;
                            if (tempQuantity > tempQty) {
                                setQty = tempQty;
                            } else {
                                setQty = tempQuantity;
                            }
                            log.debug('setQty', setQty);
                            tempQty = Number(tempQty) - Number(setQty);
                            /*  选择新的批次  */
                            inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                            // inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', text: tempObj.inventorynumber });
                            inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: tempObj.inventorynumber_id });
                            inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: 0 - Number(setQty) });
                            inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                            /*  提交新的批次  */
                            inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                            log.debug(i + " : " + (0 - Number(setQty)), tempObj);
                            log.debug('tempQty ', tempQty);
                            if (tempQty == 0) {
                                break;
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('InventoryDetails', err);
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });
