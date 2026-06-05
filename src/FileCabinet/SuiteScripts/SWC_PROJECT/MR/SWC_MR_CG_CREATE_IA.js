/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/error', 'N/format', '../common/moment', '../common/SWC_CONFIG_DATA'], function (search, record, error, format, moment, SWC_CONFIG_DATA) {
    const CONFIG = SWC_CONFIG_DATA.configData();
    function getInputData() {
        try {
            var need_data = getNeedData();
            log.debug('need_data', need_data);
            log.debug('need_data.length', need_data.length);
            return need_data;
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getNeedData() {
        var need_rec = [], limit = 4000;
        search.create({
            type: 'customrecord_swc_cg_inventoryledger',
            filters: [
                ['custrecord_swc_cg_inventoryadjustment', 'anyof', '@NONE@'],
                'AND',
                ['isinactive', 'is', false],
                'AND',
                ['custrecord_swc_cg_location', 'noneof', '@NONE@'],
                'AND',
                [
                    ['custrecord_swc_cg_eventtype', 'is', 'Adjustment'],
                    'OR',
                    ['custrecord_swc_cg_eventtype', 'is', 'Adjustment - Cycle Count Adjustment'],
                    'OR',
                    ['custrecord_swc_cg_eventtype', 'is', 'Adjustment - Damage Adjustment'],
                    'OR',
                    ['custrecord_swc_cg_eventtype', 'is', 'Adjustment - Internal Adjustment'],
                    'OR',
                    ['custrecord_swc_cg_eventtype', 'is', 'Adjustment - Ownership Transfer Adjustment'],
                    'OR',
                    ['custrecord_swc_cg_eventtype', 'is', 'Adjustment - Returns Process Adjustment'],
                    'OR',
                    ['custrecord_swc_cg_eventtype', 'is', 'Adjustment - System-Generated Admin Adjustment'],
                    'OR',
                    ['custrecord_swc_cg_eventtype', 'is', 'Adjustment - Transfer Adjustment']
                ],
                'AND',
                ['custrecord_swc_cg_partnumber', 'isnotempty', ''],
                'AND',
                ['internalid', 'anyof', '28180','27710','22556','28030','26053']
            ],
            columns: [
                { name: 'custrecord_swc_cg_retry', sort: search.Sort.ASC },
                { name: 'custrecord_swc_cg_date', sort: search.Sort.ASC },
                { name: 'custrecord_swc_cg_location' },
                { name: 'custrecord_swc_cg_partnumber' },
                { name: 'custrecord_swc_cg_quantity' },
                { name: 'custrecord_swc_cg_transactionnumber' }
            ]
        }).run().each(function (rec) {
            need_rec.push({
                id: rec.id,
                retry: rec.getValue({ name: 'custrecord_swc_cg_retry', sort: search.Sort.ASC }),
                return_date: rec.getValue({ name: 'custrecord_swc_cg_date', sort: search.Sort.ASC }),
                acc_id: rec.getValue('custrecord_swc_cg_location'),
                orderitem: rec.getValue('custrecord_swc_cg_partnumber'),
                orderitemQty: rec.getValue('custrecord_swc_cg_quantity'),
                fsd_order_id: rec.getValue('custrecord_swc_cg_transactionnumber')
            })
            return --limit > 0
        })
        return need_rec;
    }

    function map(context) {
        var obj = JSON.parse(context.value);
        log.debug('obj', obj);
        var roc_id = obj.id;
        var retry = obj.retry;
        var return_date = obj.return_date;
        var acc_id = obj.acc_id;
        var orderitem = obj.orderitem;
        var orderitemQty = obj.orderitemQty;
        var fsd_order_id = obj.fsd_order_id;
        var lot_date = obj.return_date ? moment(obj.return_date).format('YYYYMMDD') : '';
        try {
            var re_loc_data = getReturnLoc(acc_id);
            log.debug('re_loc_data', re_loc_data);
            if (!Object.keys(re_loc_data).length) {
                throw error.create({ name: 'error', message: 'CG Mano库存分类账类型表未匹配到对应的配置信息', notifyOff: false });
            }
            if (!re_loc_data.loc_id || !re_loc_data.acc_id) {
                throw error.create({ name: 'error', message: 'CG Mano库存分类账类型表未匹配到对应的配置信息', notifyOff: false });
            }
            //根据店铺、Part Number匹配【多平台SKU映射】中msku、店铺信息确定NS货品
            var item_id = getItemId(re_loc_data.acc_id, orderitem);
            log.debug('item_id', item_id);
            if (!item_id) {
                throw error.create({ name: 'error', message: '未匹配到对应NS货品', notifyOff: false });
            }
            var inv_rec = record.create({ type: 'inventoryadjustment', isDynamic: true });
            inv_rec.setValue({ fieldId: 'subsidiary', value: re_loc_data.sub_id });
            if (Number(orderitemQty) > 0) {
                inv_rec.setValue({ fieldId: 'account', value: CONFIG.S_ACCOUNT_PYLD });//6301.01 营业外收入_盘盈利得
            } else {
                inv_rec.setValue({ fieldId: 'account', value: CONFIG.S_ACCOUNT_PKSS });// 6711.03 营业外支出_盘亏损失
            }
            inv_rec.setValue({ fieldId: 'trandate', value: format.parse({ value: return_date, type: 'date' }) });
            inv_rec.setValue({ fieldId: 'custbody_swc_gl_cg_inventoryledger', value: roc_id }); // 关联发货报告

            inv_rec.selectNewLine({ sublistId: 'inventory' })
            inv_rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'item', value: item_id });
            inv_rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'location', value: re_loc_data.loc_id });
            inv_rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: orderitemQty });
            var unitCost = getItemPrice(re_loc_data.loc_id, item_id);
            inv_rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'unitcost', value: unitCost });

            var invOnhand = inv_rec.getCurrentSublistValue({ sublistId: 'inventory', fieldId: 'quantityonhand' });
            log.debug('库存现有量  : qty', invOnhand + " : " + orderitemQty);
            if (orderitemQty < 0 && (Number(orderitemQty) + Number(invOnhand)) < 0) {
                throw '库存不足，需要调出货品, 但仓库无库存'
            }
            var itemResult = search.lookupFields({ type: 'item', id: item_id, columns: ['itemid', 'islotitem', 'isserialitem', 'assetaccount'] });
            log.audit('itemResult', itemResult);
            var islotitem = itemResult['islotitem'];
            var isserialitem = itemResult['isserialitem'];
            var assetaccount;
            log.audit('assetaccount1', assetaccount);
            if (!assetaccount) {
                assetaccount = itemResult['assetaccount'][0].value;
            }
            log.audit('assetaccount2', assetaccount);
            if (orderitemQty > 0) {
                if (islotitem || isserialitem) {
                    var lot_num = 'IA-' + lot_date + '-' + re_loc_data.loc_id;
                    var inventorydetail = inv_rec.getCurrentSublistSubrecord({ sublistId: 'inventory', fieldId: 'inventorydetail' });
                    inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', value: lot_num });
                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: orderitemQty });
                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                    inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                }
            } else {
                if (islotitem || isserialitem) {
                    IAInventoryDetails(inv_rec, item_id, orderitemQty, re_loc_data.loc_id, assetaccount);
                }
            }
            inv_rec.commitLine({ sublistId: 'inventory' })
            var inv_rec_id = inv_rec.save({ ignoreMandatoryFields: true });
            if (inv_rec_id) {
                log.debug('inv_rec_id', '库存调整已创建');
                record.submitFields({
                    type: 'customrecord_swc_cg_inventoryledger',
                    id: roc_id,
                    values: {
                        custrecord_swc_cg_error: '',
                        custrecord_swc_cg_resolved: true,
                        custrecord_swc_cg_inventoryadjustment: inv_rec_id
                    }
                });
            }
        } catch (e) {
            log.debug('e', e);
            record.submitFields({
                type: 'customrecord_swc_cg_inventoryledger',
                id: roc_id,
                values: {
                    custrecord_swc_cg_retry: Number(retry) + 1,
                    custrecord_swc_cg_error: e,
                    custrecord_swc_cg_resolved: false
                }
            });
        }
    }

    function getItemPrice(loc_id, item_id) {
        var price = 0;
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
                    'locationaveragecost',//地点平均成本
                ]
        }).run().each(function (result) {
            if (!price && result.getValue(result.columns[0])) {
                price = result.getValue(result.columns[0]);
            }
            return true;
        });
        return price;
    }

    function getItemId(acc_id, orderitem) {
        var rec_item;
        search.create({
            type: 'customrecord_swc_platform_sku_mapping',
            filters:
                [
                    ['custrecord_swc_pt_sku_map_msku', 'is', orderitem],
                    'AND',
                    ['custrecord_swc_pt_sku_map_store', 'anyof', acc_id],
                    'AND',
                    ['isinactive', 'is', false]
                ],
            columns:
                [
                    'custrecord_swc_pt_sku_map_item',
                    { name: 'internalid', sort: 'DESC' }
                ]
        }).run().each(function (result) {
            log.debug('result.getValue(result.columns[0])', result.getValue(result.columns[0]));
            if (result.getValue(result.columns[0])) {
                rec_item = result.getValue(result.columns[0]);
            }
            return false;
        });
        return rec_item;
    }

    function getReturnLoc(acc_id) {
        var loc_rec = {};
        search.create({
            type: 'customrecord_swc_cg_mano',
            filters:
                [
                    ['isinactive', 'is', false],
                    'AND',
                    ['internalid', 'is', acc_id]
                ],
            columns:
                [
                    'custrecord_swc_cg_locationj',//调整地点
                    'custrecord_swc_dp'//店铺
                ]
        }).run().each(function (result) {
            loc_rec.loc_id = result.getValue(result.columns[0]) ? result.getValue(result.columns[0]) : '';
            loc_rec.sub_id = result.getValue(result.columns[0]) ? record.load({ type: 'location', id: result.getValue(result.columns[0]) }).getValue('subsidiary') : '';
            loc_rec.acc_id = result.getValue(result.columns[1]) ? result.getValue(result.columns[1]) : '';
            return false;
        });
        return loc_rec;
    }

    function getLocId(plan_metrics, sub_id) {
        var rec_loc;
        search.create({
            type: 'location',
            filters: [
                ['isinactive', 'is', false],
                'AND',
                ['custrecord_swc_location_type', 'is', 4],//仓库类型
                'AND',
                ['custrecord_swc_location_store', 'anyof', plan_metrics],//备货维度
                'AND',
                ['subsidiary', 'anyof', sub_id],
                'AND',
                ['custrecord_swc_location_attribute', 'anyof', 7]//仓库属性
            ]
        }).run().each(function (rec) {
            rec_loc = rec.id;
        });
        return rec_loc;
    }

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

    function reduce(context) {

    }

    function summarize(summary) {
        log.debug('summary', summary);
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
