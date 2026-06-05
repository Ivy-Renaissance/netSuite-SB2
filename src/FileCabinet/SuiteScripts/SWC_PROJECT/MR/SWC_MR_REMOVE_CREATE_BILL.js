/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *积加移除订单生成对应的TO、库存调整
 */
define(['N/search', 'N/record', 'N/runtime', '../common/moment', 'N/format', 'N/error'], function (search, record, runtime, moment, format, error) {

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
        var need_arr = [];
        var order_detailSearchObj = search.create({
            type: 'customrecord_swc_jj_removal_order_detail',
            filters:
                [
                    [
                        [
                            ['custrecord_swc_jj_ord_ordertype', 'is', 'Disposal'],
                            'AND',
                            ['custrecord_swc_jj_ord_disposedquantity', 'isnotempty', '']
                        ],
                        'or',
                        [
                            ['custrecord_swc_jj_ord_ordertype', 'is', 'Return'],
                            'AND',
                            ['custrecord_swc_jj_ord_shippedquantity', 'isnotempty', '']
                        ]
                    ],
                    'AND',
                    ['custrecord_swc_correlation_bill', 'anyof', '@NONE@'],
                    'AND',
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['internalid', 'anyof', 25]
                ],
            columns:
                [
                    search.createColumn({ name: 'custrecord_swc_jj_ord_ordertype', label: 'orderType' }),
                    search.createColumn({ name: 'custrecord_swc_jj_ro_shipwarehouseid', join: 'CUSTRECORD_SWC_JJ_ORD_FUJILU', label: 'shipWarehouseId' }),
                    search.createColumn({ name: 'custrecord_swc_jj_ro_returnwarehouseid', join: 'CUSTRECORD_SWC_JJ_ORD_FUJILU', label: 'returnWarehouseId' }),
                    search.createColumn({ name: 'custrecord_swc_jj_ord_sku', label: 'sku' }),
                    search.createColumn({ name: 'custrecord_swc_jj_ord_shippedquantity', label: 'shippedQuantity' }),
                    search.createColumn({ name: 'custrecord_swc_jj_ord_lastupdateddate', label: 'lastUpdatedDate' }),
                    search.createColumn({ name: 'custrecord_swc_jj_ord_disposedquantity', label: 'shippedQuantity' })
                ]
        });
        var results = getAllResults(order_detailSearchObj);
        if (results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                var bill_id = results[i].id;
                var order_type = results[i].getValue(order_detailSearchObj.columns[0]);
                var from_loc = results[i].getValue(order_detailSearchObj.columns[1]);
                var to_loc = results[i].getValue(order_detailSearchObj.columns[2]);
                var item_name = results[i].getValue(order_detailSearchObj.columns[3]);
                var item_qty = results[i].getValue(order_detailSearchObj.columns[4]);
                var tran_date = results[i].getValue(order_detailSearchObj.columns[5]);
                if (order_type == 'Disposal') {
                    item_qty = results[i].getValue(order_detailSearchObj.columns[6]);
                }
                need_arr.push({
                    bill_id: bill_id,
                    order_type: order_type,
                    from_loc: from_loc,
                    to_loc: to_loc,
                    item_name: item_name,
                    item_qty: item_qty,
                    tran_date: tran_date
                });
            }
        }
        return need_arr;
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

    function map(context) {
        var final_id, if_data_id, ir_data_id;
        try {
            var value = JSON.parse(context.value);
            var order_type = value.order_type, bill_id = value.bill_id, from_loc = value.from_loc, to_loc = value.to_loc, item_name = value.item_name, item_qty = value.item_qty,
                tran_date = value.tran_date;
            var need_tran_date = tran_date ? format.format({ value: moment.utc(tran_date).toDate(), type: format.Type.DATE }) : '';
            log.debug('need_tran_date2', need_tran_date);
            //from_loc查询积加平台仓关系对照表、to_loc查询NS地点
            var FBALocation = getFBALocation(from_loc);
            log.debug('FBALocation', FBALocation);
            from_loc = FBALocation.from_loc;
            log.debug('from_loc', from_loc);
            if (to_loc) {
                to_loc = getNSLocation(to_loc, FBALocation.store).to_loc;
            }
            if (order_type == 'Return') {
                if (!from_loc && !to_loc) {
                    log.debug('map e', '没有起始仓、目的仓信息');
                    return;
                }
                //创建转移单
                var loc_info = getLocInfo(from_loc, to_loc);
                log.debug('loc_info', loc_info);
                if (Object.keys(loc_info).length == 0) {
                    log.debug('map e', '没有获取到对应仓库的公司，请检查是否存在该仓库');
                    return;
                }
                var from_sub = loc_info.from_sub, to_sub = loc_info.to_sub;
                var item_id = getItemId(item_name);
                log.debug('item_id', item_id);
                if (!item_id) {
                    log.debug('map e', '没有匹配到对应的NS货品，请检查是否存在该货品');
                    return;
                }
                log.debug('from_loc', from_loc);
                log.debug('to_loc', to_loc);
                var to_data;
                if (from_sub == to_sub) {
                    //子公司一致，生成库存转移订单
                    to_data = record.create({ type: 'transferorder', isDynamic: true });
                    to_data.setValue('subsidiary', from_sub);
                    to_data.setValue('location', from_loc);
                    to_data.setValue('transferlocation', to_loc);
                } else {
                    return;
                    //子公司不一致，生成公司间库存转移订单
                    to_data = record.create({ type: 'intercompanytransferorder', isDynamic: true });
                    to_data.setValue('subsidiary', from_sub);
                    to_data.setValue('location', from_loc);
                    to_data.setValue('transferlocation', to_sub);
                    to_data.setValue('tosubsidiary', to_loc);
                }
                to_data.setValue('orderstatus', 'B');
                need_tran_date ? to_data.setText('trandate', need_tran_date) : '';
                to_data.setValue('custbody_swc_remove_order', bill_id);
                to_data.setValue('useitemcostastransfercost', true);
                to_data.selectNewLine('item');
                to_data.setCurrentSublistValue('item', 'item', item_id);
                to_data.setCurrentSublistValue('item', 'quantity', item_qty);
                //赋值批次
                var itemResult = search.lookupFields({ type: 'item', id: item_id, columns: ['islotitem', 'isserialitem', 'assetaccount'] });
                log.debug('itemResult', itemResult);
                var islotitem = itemResult['islotitem'];
                var isserialitem = itemResult['isserialitem'];
                var assetaccount = itemResult['assetaccount'][0].value;
                if (islotitem || isserialitem) {
                    InventoryDetails('item', to_data, item_qty, from_loc, 'to', assetaccount, need_tran_date, item_id);
                } else {
                    SearchInventory(item_id, item_qty, from_loc, assetaccount, need_tran_date);
                }
                to_data.commitLine({ sublistId: 'item' });
                final_id = to_data.save({ ignoreMandatoryFields: true });
                log.debug('final_id', final_id);
                if (final_id) {
                    var if_data = record.transform({
                        fromType: 'transferorder',
                        fromId: final_id,
                        toType: 'itemfulfillment',
                        isDynamic: true
                    });
                    need_tran_date ? if_data.setText('trandate', need_tran_date) : '';
                    if_data.setValue('shipstatus', 'C');
                    if_data_id = if_data.save({ ignoreMandatoryFields: true });
                    log.debug('if_data_id', if_data_id);
                    if (if_data_id) {
                        var ir_data = record.transform({
                            fromType: 'transferorder',
                            fromId: final_id,
                            toType: 'itemreceipt',
                            isDynamic: true
                        });
                        need_tran_date ? ir_data.setText('trandate', need_tran_date) : '';
                        ir_data_id = ir_data.save({ ignoreMandatoryFields: true });
                        log.debug('ir_data_id', ir_data_id);
                    }
                }
            } else if (order_type == 'Disposal') {
                if (!from_loc) {
                    log.debug('map e', '没有起始仓信息');
                    return;
                }
                var loc_info = getLocInfo(from_loc);
                log.debug('loc_info', loc_info);
                if (Object.keys(loc_info).length == 0) {
                    log.debug('map e', '没有获取到对应仓库的公司，请检查是否存在该仓库');
                    return;
                }
                var item_id = getItemId(item_name);
                log.debug('item_id', item_id);
                if (!item_id) {
                    log.debug('map e', '没有匹配到对应的NS货品，请检查是否存在该货品');
                    return;
                }
                var from_sub = loc_info.from_sub;
                var ia_data = record.create({ type: 'inventoryadjustment', isDynamic: true });
                ia_data.setValue('subsidiary', from_sub);
                log.debug('need_tran_date1', need_tran_date);
                need_tran_date ? ia_data.setText({ fieldId: 'trandate', text: need_tran_date }) : '';
                ia_data.setValue({ fieldId: 'account', value: 53 });
                ia_data.setValue('custbody_swc_remove_order', bill_id);
                ia_data.selectNewLine({ sublistId: 'inventory' })
                ia_data.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'item', value: item_id });
                ia_data.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'location', value: from_loc });
                ia_data.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: -item_qty });
                //赋值批次
                var itemResult = search.lookupFields({ type: 'item', id: item_id, columns: ['islotitem', 'isserialitem', 'assetaccount'] });
                log.debug('itemResult', itemResult);
                var islotitem = itemResult['islotitem'];
                var isserialitem = itemResult['isserialitem'];
                var assetaccount = itemResult['assetaccount'][0].value;
                if (islotitem || isserialitem) {
                    InventoryDetails('inventory', ia_data, -item_qty, from_loc, 'to', assetaccount, need_tran_date, item_id);
                } else {
                    SearchInventory(item_id, -item_qty, from_loc, assetaccount, need_tran_date);
                }
                ia_data.commitLine({ sublistId: 'inventory' })
                final_id = ia_data.save({ ignoreMandatoryFields: true });
                log.debug('final_id', final_id);
            }
            if (final_id) {
                //单据创建成功,回写移除订单明细
                var detail_id = record.submitFields({
                    type: 'customrecord_swc_jj_removal_order_detail',
                    id: bill_id,
                    values: {
                        custrecord_swc_correlation_bill: final_id
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true,
                    }
                });
                if (detail_id) {
                    log.debug('success', '单据回写成功' + detail_id);
                }
            }
        } catch (e) {
            log.debug('map e', e);
            if (if_data_id) {
                record.delete({ type: record.Type.ITEM_FULFILLMENT, id: if_data_id });
            }
            if (final_id) {
                record.delete({ type: record.Type.TRANSFER_ORDER, id: final_id });
            }
        }
    }

    function getFBALocation(from_loc) {
        var FBA_location = {
            "from_loc": '',
            "store": ''
        };
        search.create({
            type: 'customrecord_swc_jj_ptc',
            filters: [
                ['custrecord_swc_location_id', 'equalto', from_loc]
            ],
            columns: [
                { name: "custrecord_swc_plocation" },
                { name: "custrecord_swc_location_store", join: 'custrecord_swc_plocation' }
            ]
        }).run().each(function (results) {
            log.debug('getFBALocation results', results)
            FBA_location["from_loc"] = results.getValue({ name: "custrecord_swc_plocation" });
            FBA_location["store"] = results.getValue({ name: "custrecord_swc_location_store", join: 'custrecord_swc_plocation' });
            return false;
        });
        log.debug('FBA_location', FBA_location)
        return FBA_location;
    }

    function getNSLocation(to_loc, store) {
        var _location = {
            "to_loc": '',
            "store": ''
        };
        log.debug('getNSLocation', _location);
        search.create({
            type: 'location',
            filters: [
                ['custrecord_swc_jj_warehouse_id', 'is', to_loc]
            ],
            columns: [
                { name: "custrecord_swc_location_store" }
            ]
        }).run().each(function (results) {
            _location["to_loc"] = results.id;
            _location["store"] = results.getValue({ name: "custrecord_swc_location_store" });
            if (_location["store"] == store) {
                return false;
            }
            return true;
        });
        log.debug('to_location', _location)
        return _location;
    }

    function getItemId(item_name) {
        var item_id;
        // search.create({
        //     type: 'item',
        //     filters: [
        //         ['name', 'is', item_name]
        //     ]
        // }).run().each(function (results) {
        //     item_id = results.id;
        //     return false;
        // });
        //改成查询亚马逊SKU映射关系表
        search.create({
            type: 'customrecord_swc_amazon_sku_mapping',
            filters: [
                ['custrecord_swc_az_sku_map_msku', 'is', item_name]
            ],
            columns: [
                { name: "custrecord_swc_az_sku_map_item" }
            ]
        }).run().each(function (results) {
            item_id = results.getValue('custrecord_swc_az_sku_map_item');
            return false;
        });
        return item_id;
    }

    function getLocInfo(from_loc, to_loc) {
        var data_str = {}, from_sub, to_sub;
        if (from_loc) {
            var from_data = record.load({ type: 'location', id: from_loc, isDynamic: true })
            from_sub = from_data.getValue('subsidiary');
        }
        if (to_loc) {
            var to_data = record.load({ type: 'location', id: to_loc, isDynamic: true });
            to_sub = to_data.getValue('subsidiary');
        }
        data_str.from_sub = from_sub;
        data_str.to_sub = to_sub;
        return data_str;
    }

    //批次选择方案1:
    //第一步:先搜索所有当天有结余的批次号，并记录该批次当天结余;
    //第二步:拿这些批次号当过滤条件查当前时间点还有结余的批次;
    //第三步:满足上两步条件的批次，按天汇总当天出入库数，一天天累加算出当天结余，并记录最低结余数，最低结余数才是该批次真实的可用量;(一次性搜出所有批次的数据，按批次分开算)
    /**
     * 
     * @param {*} to_data     记录
     * @param {*} quantity  数量
     * @param {*} location  地点
     * @param {*} type      类型（so\po\to）
     * @param {*} assetaccount  库存商品资产账户
     */
    function InventoryDetails(sublist_id, to_data, quantity, location, type, assetaccount, need_tran_date, itemid) {
        try {
            // var qty = quantity;//
            var qty = Math.abs(quantity);
            var inventorydetail = to_data.getCurrentSublistSubrecord({ sublistId: sublist_id, fieldId: 'inventorydetail' });
            var invennumber = [], line_count = 0;
            var invennumber_quanty = {};
            var invennumber_quanty_min = {};
            var inven_quantity = 0;
            //第一步:先搜索所有当天有结余的批次号，并记录当天结余;
            var serialnumbers = [], serialnumbers_date = [], sd_sort = 1;
            var t_filters = [
                [
                    ['taxline', 'is', 'false'], 'and',
                    ['shipping', 'is', 'false'], 'and',
                    ['item', 'anyof', [itemid]], 'and',
                    ['location', 'anyof', [location]], 'and',
                    ['trandate', 'onorbefore', need_tran_date], 'and',//发货当天之前
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
                    ['trandate', 'onorbefore', need_tran_date], 'and',//发货当天之前
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
                log.debug('当天有结余', e)
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
                    message: '发货当天之前无可用批次号',
                    notifyOff: false
                });
            }

            //第二步:先搜索所有当前时间可用量大于0的批次
            var in_filters = [
                { name: 'item', operator: 'anyof', values: [itemid] },
                { name: 'location', operator: 'anyof', values: [location] },
                { name: 'quantityavailable', operator: 'notequalto', values: 0 },  //可用数量不为零
            ]
            log.audit('in_filters', in_filters);
            search.create({
                type: "inventorynumber",
                filters: in_filters,
                columns: [
                    { name: "inventorynumber" },
                    { name: "quantityintransit" },
                    { name: "quantityavailable" },
                    { name: "internalid", sort: search.Sort.ASC }
                ]
            }).run().each(function (e) {
                log.audit('当前可用批次/数量', e.getValue('inventorynumber') + '/' + e.getValue('quantityavailable'));
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
                    })
                }
                return true
            })

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
            if (invennumber.length == 0) {
                //库存不足,直接返回
                // return '库存不足'
                throw error.create({
                    name: '5016',
                    message: '当前时间可用库存不足。发货之前可用批次：' + JSON.stringify(serialnumbers),
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
                            ['trandate', 'after', need_tran_date], 'and',//当天之后的每天出入库数量之和
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
                            ['trandate', 'after', need_tran_date], 'and',//当天之后的每天出入库数量之和
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
                    var key = e.getValue(e.columns[1])
                    invennumber_quanty[key] = Number(invennumber_quanty[key]) + Number(e.getValue(e.columns[2]))//那天的结余
                    log.debug('对比结余量', {
                        invennumber_quanty_min: Number(invennumber_quanty_min[key]),
                        invennumber_quanty: Number(invennumber_quanty[key]),
                    });
                    if (Number(invennumber_quanty_min[key]) > Number(invennumber_quanty[key])) {
                        //如果那天的结余比出库当天的结余还小，则替换；需取最小结余量
                        invennumber_quanty_min[key] = Number(invennumber_quanty[key])
                    }
                    // log.debug('invennumber_quanty', invennumber_quanty)
                    // log.debug('invennumber_quanty_min', invennumber_quanty_min)
                    return true;
                });
                // log.debug('invennumber_quanty', invennumber_quanty)
                log.debug('invennumber2', invennumber)
                log.debug('invennumber_quanty_min', invennumber_quanty_min)
                //赋值批次库存可用列表中的实际可用量
                for (var i = 0; i < invennumber.length; i++) {
                    invennumber[i].actual_quantityavailable = invennumber_quanty_min[invennumber[i].inventorynumber]
                    if (invennumber[i].actual_quantityavailable > invennumber[i].quantityavailable) {
                        invennumber[i].actual_quantityavailable = invennumber[i].quantityavailable
                    }
                    if (Number(invennumber_quanty_min[invennumber[i].inventorynumber]) > 0) {
                        //如果批次实际可用量大于0，那么累加到库存可用量中
                        inven_quantity += Number(invennumber_quanty_min[invennumber[i].inventorynumber])
                    }
                }
                log.debug('invennumber3', invennumber)
                // log.debug('结束搜索每天库存')

                if (inven_quantity < quantity) {
                    // 可用库存不足
                    throw error.create({
                        name: '5017',
                        message: '实际最小可用库存不足。库存数量：' + inven_quantity + ',发货数量：' + quantity + '。批次号：' + JSON.stringify(invennumber),
                        notifyOff: false
                    });
                } else {
                    //可能会有多批次
                    for (var i = 0; i < invennumber.length; i++) {
                        if (Number(invennumber[i].actual_quantityavailable) <= 0) {
                            //如果实际可用数量小于等于0，则调过此批次
                            continue
                        }
                        // log.debug("line_count:", line_count)
                        qty = Number(invennumber[i].actual_quantityavailable) - Number(qty)
                        if (qty >= 0) {
                            inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                            if (type == 'to') {
                                log.debug("赋值批次号ID", invennumber[i].inventorynumber_id)
                                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id });
                                inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                            } else {
                                log.debug("赋值批次号", invennumber[i].inventorynumber)
                                inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', Text: invennumber[i].inventorynumber });
                                inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                            }
                            inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: line_count == 0 ? quantity : Number(invennumber[i].actual_quantityavailable) - Number(qty) });
                            inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                            line_count++;
                            break;
                        } else {
                            qty = 0 - Number(qty)
                            inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                            if (type == 'to') {
                                log.debug("赋值批次号ID1", invennumber[i].inventorynumber_id)
                                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id });
                                inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                            } else {
                                log.debug("赋值批次号1", invennumber[i].inventorynumber)
                                inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', Text: invennumber[i].inventorynumber });
                                inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                            }
                            inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: invennumber[i].actual_quantityavailable });
                            inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                            line_count++;
                        }
                    }
                }

            }
        } catch (err) {
            log.error('InventoryDetails error', err);
            var e = err.message ? err.message : err;
            var code = err.name ? err.name : 'e400';
            throw error.create({
                name: code,
                message: e,
                notifyOff: false
            });
        }
    }

    function SearchInventory(itemid, f_qty, location, assetaccount, need_tran_date) {
        try {
            f_qty = Math.abs(f_qty);
            var item_quanty = {};
            var item_quanty_min = {};
            var inven_quantity = 0;
            if (!assetaccount) {
                throw error.create({
                    name: '5012',
                    message: '库存商品资产账户没配置好',
                    notifyOff: false
                });
            }
            //第一步:先搜索所有发货当天有结余的库存，并记录当天结余;
            var items = [];
            var t_filters = [
                [
                    ['taxline', 'is', 'false'], 'and',
                    ['shipping', 'is', 'false'], 'and',
                    ['item', 'anyof', [itemid]], 'and',
                    ['location', 'anyof', [location]], 'and',
                    ['trandate', 'onorbefore', [need_tran_date]], 'and',//发货当天之前
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
                    [
                        ['mainline', 'is', 'false'], 'or',
                        [
                            ['type', 'anyof', ["Build", "Unbuild"]], 'and',
                            ['mainline', 'any', ''],
                        ]
                    ]
                ], 'or',
                [
                    ['item', 'anyof', [itemid]], 'and',
                    ['location', 'anyof', [location]], 'and',
                    ['trandate', 'onorbefore', need_tran_date], 'and',//发货当天之前
                    ['account', 'anyof', [assetaccount]], 'and',
                    ['quantity', 'isnotempty', ''], 'and',
                    ['type', 'anyof', ["BinTrnfr"]]
                ]
            ];
            log.debug('t_filters', t_filters)
            search.create({
                type: "transaction",
                filters: t_filters,
                columns: [
                    { name: "item", summary: "GROUP" },
                    { name: "quantity", summary: "SUM" }
                ]
            }).run().each(function (e) {
                log.debug('当天有结余', e)
                if (Number(e.getValue(e.columns[1])) > 0) {
                    //如果当天结余大于0，记录当天结余
                    item_quanty[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                    item_quanty_min[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                    items.push(e.getValue(e.columns[0]))
                    inven_quantity = e.getValue(e.columns[1])
                }
                return true;
            })
            log.debug('items', items)
            log.debug('item_quanty', item_quanty)
            log.debug('item_quanty_min', item_quanty_min)
            log.debug('inven_quantity', inven_quantity)
            if (items.length == 0) {
                throw error.create({
                    name: '5013',
                    message: '发货当天之前库存数量为0;发货数量：' + f_qty,
                    notifyOff: false
                });
            }
            log.debug('inven_quantity:' + inven_quantity, 'f_qty:' + f_qty)
            if (Number(inven_quantity) < Number(f_qty)) {
                // 可用库存不足
                throw error.create({
                    name: '5014',
                    message: '发货当天可用库存不足，可用库存量:' + inven_quantity + '发货数量:' + f_qty,
                    notifyOff: false
                });
            }
        } catch (err) {
            log.audit('SearchInventory error', err);
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
