/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/error', 'N/format', '../common/moment'], function (search, record, error, format, moment) {

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
                ['custrecord_swc_cg_roc_relation_ra', 'anyof', '@NONE@'],
                'AND',
                ['isinactive', 'is', false],
                'AND',
                ['custrecord_swc_cg_location', 'noneof', '@NONE@'],
                'AND',
                ['custrecord_swc_cg_transactionnumber', 'isnotempty', ''],
                'AND',
                ['custrecord_swc_cg_eventtype', 'is', 'Reverse Logistics - Return to Vendor'],
                'AND',
                ['custrecord_swc_cg_partnumber', 'isnotempty', ''],
                'AND',
                ['internalid', 'anyof', '16618']
            ],
            columns: [
                { name: 'custrecord_swc_cg_retry', sort: search.Sort.ASC },
                { name: 'custrecord_swc_cg_date', sort: search.Sort.ASC },
                { name: 'custrecord_swc_cg_location' },
                { name: 'custrecord_swc_cg_transactionnumber' },
                { name: 'custrecord_swc_cg_partnumber' },
                { name: 'custrecord_swc_cg_quantity' }
            ]
        }).run().each(function (rec) {
            need_rec.push({
                id: rec.id,
                retry: rec.getValue({ name: 'custrecord_swc_cg_retry', sort: search.Sort.ASC }),
                return_date: rec.getValue({ name: 'custrecord_swc_cg_date', sort: search.Sort.ASC }),
                acc_id: rec.getValue('custrecord_swc_cg_location'),
                orderid: rec.getValue('custrecord_swc_cg_transactionnumber'),
                orderitem: rec.getValue('custrecord_swc_cg_partnumber'),
                orderitemQty: rec.getValue('custrecord_swc_cg_quantity')
            })
            return --limit > 0;
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
        var orderid = obj.orderid;
        var orderitem = obj.orderitem;
        var orderitemQty = obj.orderitemQty;
        var lot_date = obj.return_date ? moment(obj.return_date).format('YYYYMMDD') : '';
        var ra_id, ir_id, cm_id;
        try {
            //使用【原发货单号】匹配原销售订单
            var so_info = getSoInfo(orderid), ir_cost = {};
            log.debug('so_info', so_info);
            if (Object.keys(so_info).length > 0) {
                //匹配到销售订单,根据销售订单生成退货授权
                var so_id = so_info.so_id, plan_metrics = so_info.plan_metrics, re_loc_id = so_info.re_loc_id, so_num = so_info.so_num, so_status = so_info.so_status;
                if (so_status == 'pendingFulfillment' || so_status == 'pendingApproval' || so_status == 'cancelled') {
                    throw error.create({ name: 'error', message: so_num + '订单状态异常不能进行退货', notifyOff: false });
                }
                if (!re_loc_id) {
                    throw error.create({ name: 'error', message: so_num + '订单客户，找不到退货仓库，请维护退货仓库', notifyOff: false });
                }
                //查询批次
                var lot_info = getLotInfo(so_id);
                var rec = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    toType: record.Type.RETURN_AUTHORIZATION,
                    fromId: Number(so_id),
                    isDynamic: true
                })
                //根据店铺、Part Number匹配【多平台SKU映射】中msku、店铺信息确定NS货品
                var item_id = getItemId(rec.getValue('entity'), orderitem);
                log.debug('item_id', item_id);
                if (!item_id) {
                    throw error.create({ name: 'error', message: '未匹配到对应NS货品', notifyOff: false });
                }
                //查询退货成本
                //先获取销售订单发出成本
                var so_loc_cost = getSoLocCost(so_id, item_id);
                log.debug('so发出成本', so_loc_cost);
                if (!Object.keys(so_loc_cost).length) {
                    throw error.create({ name: 'error', message: '未匹配到销货成本金额', notifyOff: false });
                } else {
                    ir_cost = so_loc_cost;
                }
                rec.setValue({ fieldId: 'trandate', value: format.parse({ value: return_date, type: 'date' }) });
                rec.setValue({ fieldId: 'orderstatus', value: 'B' });
                rec.setValue({ fieldId: 'location', value: re_loc_id });
                rec.setValue({ fieldId: 'custbody_swc_gl_cg_inventoryledger', value: roc_id });
                var ra_line = rec.getLineCount({ sublistId: 'item' }), price_info = {};
                if (ra_line > 0) {
                    for (var i = 0; i < ra_line; i++) {
                        var line_item = rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                        var line_price = rec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });
                        price_info[line_item] = line_price;
                        rec.removeLine({ sublistId: 'item', line: i });
                    }
                }
                rec.selectNewLine({ sublistId: 'item' });
                rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item_id });
                rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: orderitemQty });
                rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: price_info[item_id] });
                rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_original_if_serialnumber', value: lot_info[item_id] });
                rec.commitLine({ sublistId: 'item' });
                ra_id = rec.save({ ignoreMandatoryFields: true });
            } else {
                //获取店铺的退货仓
                var re_loc_data = getReturnLoc(acc_id);
                log.debug('re_loc_data', re_loc_data);
                if (!Object.keys(re_loc_data).length) {
                    throw error.create({ name: 'error', message: 'CG Mano库存分类账类型表未匹配到对应的配置信息', notifyOff: false });
                }
                if (!re_loc_data.loc_id || !re_loc_data.acc_id || !re_loc_data.plan_metrics) {
                    throw error.create({ name: 'error', message: 'CG Mano库存分类账类型表未匹配到对应的配置信息', notifyOff: false });
                }
                //根据店铺、Part Number匹配【多平台SKU映射】中msku、店铺信息确定NS货品
                var item_id = getItemId(re_loc_data.acc_id, orderitem);
                log.debug('item_id', item_id);
                if (!item_id) {
                    throw error.create({ name: 'error', message: '未匹配到对应NS货品', notifyOff: false });
                }
                //退货成本先获取退货收货仓的地点平均成本，若退货收货仓没有地点平均成本，则使用店铺维护的备货维度查询仓库类型为3PL、FBA、CG的地点平均成本用于退货成本
                var ra_loc_cost = getItemPrice(re_loc_data.loc_id, item_id);
                log.debug('退货收货仓的地点平均成本', ra_loc_cost);
                if (!Object.keys(ra_loc_cost).length) {
                    //查询备货维度对应的仓库
                    var loc_arr = getLocArr(re_loc_data.plan_metrics);
                    log.debug('备货维度对应的仓库', loc_arr);
                    if (loc_arr.length > 0) {
                        ir_cost = getItemPrice(loc_arr, item_id);
                        log.debug('备货维度的地点平均成本', ir_cost);
                        if (!Object.keys(ir_cost).length) {
                            throw error.create({ name: 'error', message: '未匹配到备货维度的地点平均成本', notifyOff: false });
                        }
                    } else {
                        throw error.create({ name: 'error', message: '该备货维度下不存在仓库类型为3PL、FBA、CG的仓库', notifyOff: false });
                    }
                } else {
                    ir_cost = ra_loc_cost;
                }
                //未匹配到销售订单,直接创建退货授权
                var rec = record.create({ type: record.Type.RETURN_AUTHORIZATION, isDynamic: true })
                rec.setValue({ fieldId: 'entity', value: re_loc_data.acc_id });
                rec.setValue({ fieldId: 'trandate', value: format.parse({ value: return_date, type: 'date' }) });
                rec.setValue({ fieldId: 'orderstatus', value: 'B' });
                rec.setValue({ fieldId: 'location', value: re_loc_data.loc_id });
                rec.setValue({ fieldId: 'otherrefnum', value: orderid });
                rec.setValue({ fieldId: 'custbody_swc_gl_cg_inventoryledger', value: roc_id });
                rec.selectNewLine({ sublistId: 'item' });
                rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item_id });
                rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: orderitemQty });
                var item_price = getItemPrice(re_loc_data.loc_id, item_id);
                if (Object.keys(item_price).length > 0) {
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: item_price[item_id]['item_price'] || 0 });
                } else {
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
                }
                rec.commitLine({ sublistId: 'item' });
                ra_id = rec.save({ ignoreMandatoryFields: true });
            }
            log.debug('ra_id', '退货授权已创建' + ra_id);
            if (ra_id) {
                //创建货品收据
                var ir_rec = record.transform({
                    fromType: record.Type.RETURN_AUTHORIZATION,
                    toType: record.Type.ITEM_RECEIPT,
                    fromId: ra_id,
                    isDynamic: true
                });
                ir_rec.setValue({ fieldId: 'trandate', value: format.parse({ value: return_date, type: 'date' }) });
                ir_rec.setValue({ fieldId: 'custbody_swc_gl_cg_inventoryledger', value: roc_id });
                var lineCount = ir_rec.getLineCount({ sublistId: 'item' }) || 0;
                for (var i = 0; i < lineCount; i++) {
                    var lot_num = 'RMA-' + lot_date + '-' + ra_id + '-R';
                    ir_rec.selectLine({ sublistId: 'item', line: i });
                    ir_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_cover_loc', value: ir_cost[item_id]['loc_id'] || '' })
                    ir_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'unitcostoverride', value: ir_cost[item_id]['item_price'] || '' });//覆盖价格
                    var qty = Number(ir_rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' })) || 0;
                    var inventorydetail = ir_rec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
                    inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', value: lot_num });
                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: qty });
                    inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                    ir_rec.commitLine({ sublistId: 'item' });
                }
                ir_id = ir_rec.save({ ignoreMandatoryFields: true });
                if (ir_id) {
                    log.debug('ir_id', '退货授权货品收据已创建' + ir_id);
                    //创建贷项通知单
                    // var cm_rec = record.transform({
                    //     fromType: record.Type.RETURN_AUTHORIZATION,
                    //     toType: record.Type.CREDIT_MEMO,
                    //     fromId: ra_id,
                    //     isDynamic: true
                    // });
                    // cm_rec.setValue({ fieldId: 'trandate', value: format.parse({ value: return_date, type: 'date' }) })
                    // cm_rec.setValue({ fieldId: 'custbody_swc_gl_cg_inventoryledger', value: roc_id });
                    // cm_id = cm_rec.save({ ignoreMandatoryFields: true });
                    // if (cm_id) {
                    //     log.debug('cm_id', '退货授权贷项通知单已创建');
                    record.submitFields({
                        type: 'customrecord_swc_cg_inventoryledger',
                        id: roc_id,
                        values: {
                            custrecord_swc_cg_error: '',
                            custrecord_swc_cg_resolved: true,
                            custrecord_swc_cg_roc_relation_ra: ra_id,
                            custrecord_swc_cg_roc_relation_ir: ir_id,
                            // custrecord_swc_cg_roc_relation_cm: cm_id,
                        }
                    });
                    // }
                }
            }
        } catch (e) {
            log.debug('e', e);
            if (cm_id) {
                record.delete({
                    type: record.Type.CREDIT_MEMO,
                    id: cm_id
                });
            }
            if (ir_id) {
                record.delete({
                    type: record.Type.ITEM_RECEIPT,
                    id: ir_id
                });
            }
            if (ra_id) {
                record.delete({
                    type: record.Type.RETURN_AUTHORIZATION,
                    id: ra_id
                });
            }
            record.submitFields({
                type: 'customrecord_swc_cg_inventoryledger',
                id: roc_id,
                values: {
                    custrecord_swc_cg_retry: Number(retry) + 1,
                    custrecord_swc_cg_error: e.message,
                    custrecord_swc_cg_resolved: false
                }
            });
        }
    }

    function getLocArr(plan_metrics) {
        var rec_loc = [];
        search.create({
            type: 'location',
            filters:
                [
                    ['custrecord_swc_location_store', 'anyof', plan_metrics],
                    'AND',
                    ['custrecord_swc_location_type', 'anyof', '1', '2', '3'],
                    'AND',
                    ['isinactive', 'is', 'F']
                ]
        }).run().each(function (result) {
            rec_loc.push(result.id);
            return true;
        });
        return rec_loc;
    }

    function getSoLocCost(so_id, item_id) {
        var cost = {};
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
                    ['item', 'anyof', item_id]
                ],
            columns:
                [
                    'item',
                    'cogsamount'//销货成本金额
                ]
        }).run().each(function (result) {
            if (result.getValue(result.columns[1])) {
                cost[result.getValue(result.columns[0])] = cost[result.getValue(result.columns[0])] || {};
                if (!cost[result.getValue(result.columns[0])]['item_price']) {
                    cost[result.getValue(result.columns[0])]['loc_id'] = '';
                    cost[result.getValue(result.columns[0])]['item_price'] = Math.abs(result.getValue(result.columns[1])) || '';
                }
            }
            return true;
        });
        return cost;
    }

    function getItemPrice(loc_id, item_id) {
        var price = {};
        search.create({
            type: 'item',
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
                    'inventorylocation'
                ]
        }).run().each(function (result) {
            log.debug('result.getValue(result.columns[0])', result.getValue(result.columns[0]));
            log.debug('result.getValue(result.columns[1])', result.getValue(result.columns[1]));
            log.debug('result.getValue(result.columns[2])', result.getValue(result.columns[2]));
            if (result.getValue(result.columns[1])) {
                price[result.getValue(result.columns[0])] = price[result.getValue(result.columns[0])] || {};
                if (!price[result.getValue(result.columns[0])]['item_price']) {
                    price[result.getValue(result.columns[0])]['loc_id'] = result.getValue(result.columns[2]) || '';
                    price[result.getValue(result.columns[0])]['item_price'] = result.getValue(result.columns[1]) || '';
                }
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

    function getLotInfo(so_id) {
        var lot_info = {};
        search.create({
            type: 'itemfulfillment',
            filters: [
                { name: 'createdfrom', operator: 'anyof', values: so_id },
                { name: 'cogs', operator: 'is', values: false },
            ],
            columns: [
                { name: 'item' },
                { name: 'serialnumber' }
            ]
        }).run().each(function (rec) {
            lot_info[rec.getValue(rec.columns[0])] = lot_info[rec.getValue(rec.columns[0])] || rec.getValue(rec.columns[1]);
            return true;
        });
        return lot_info;
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
                    'custrecord_swc_rma_location',//退货仓库
                    'custrecord_swc_dp',//店铺
                    'custrecord_swc_dp.custentity_swc_plan_metrics'//店铺对应备货维度
                ]
        }).run().each(function (result) {
            loc_rec.loc_id = result.getValue(result.columns[0]) ? result.getValue(result.columns[0]) : '';
            loc_rec.acc_id = result.getValue(result.columns[1]) ? result.getValue(result.columns[1]) : '';
            loc_rec.plan_metrics = result.getValue(result.columns[2]) ? result.getValue(result.columns[2]) : '';
            return false;
        });
        return loc_rec;
    }

    function getSoInfo(orderid) {
        var rec_info = {};
        search.create({
            type: 'salesorder',
            filters:
                [
                    [
                        ['otherrefnum', 'equalto', orderid],
                        'OR',
                        ['custbody_swc_platform_order_number', 'is', orderid]
                    ],
                    'AND',
                    ['mainline', 'is', true]
                ],
            columns:
                [
                    'customer.custentity_swc_plan_metrics',//备货维度
                    'customer.custentity_swc_rma_shop',//退货仓库
                    'tranid',//单号
                    'statusref'//状态
                ]
        }).run().each(function (result) {
            rec_info.so_id = result.id;
            rec_info.plan_metrics = result.getValue(result.columns[0]) || '';
            rec_info.re_loc_id = result.getValue(result.columns[1]) || '';
            rec_info.so_num = result.getValue(result.columns[2]);
            rec_info.so_status = result.getValue(result.columns[3]);
            return false;
        });
        return rec_info;
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
