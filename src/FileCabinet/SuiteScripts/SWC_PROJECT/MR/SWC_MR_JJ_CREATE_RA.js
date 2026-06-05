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
            type: 'customrecord_swc_jj_return_order_cache',
            filters: [
                ['custrecord_swc_jj_roc_relation_ra', 'anyof', '@NONE@'],
                'AND',
                ['custrecord_swc_jj_roc_returnstatus', 'is', 'COMPLETE'],
                'AND',
                ['isinactive', 'is', false],
                'AND',
                ['custrecord_swc_jj_roc_store', 'noneof', '@NONE@'],
                'AND',
                ['custrecord_swc_jj_roc_orderitems', 'isnotempty', ''],
                'AND',
                ['internalid', 'anyof', '2204']
            ],
            columns: [
                { name: 'custrecord_swc_jj_roc_retry', sort: search.Sort.ASC },
                { name: 'custrecord_swc_jj_roc_returnorderdate', sort: search.Sort.ASC },
                { name: 'custrecord_swc_jj_roc_store' },
                { name: 'custrecord_swc_jj_roc_sourcecode' },
                { name: 'custrecord_swc_jj_roc_orderitems' },
                { name: 'custrecord_swc_jj_roc_currency' },
                { name: 'custrecord_swc_jj_roc_returnwarehouseid' }
            ]
        }).run().each(function (rec) {
            need_rec.push({
                id: rec.id,
                retry: rec.getValue({ name: 'custrecord_swc_jj_roc_retry', sort: search.Sort.ASC }),
                return_date: rec.getValue({ name: 'custrecord_swc_jj_roc_returnorderdate', sort: search.Sort.ASC }),
                acc_id: rec.getValue('custrecord_swc_jj_roc_store'),
                acc_name: rec.getText('custrecord_swc_jj_roc_store'),
                orderid: rec.getValue('custrecord_swc_jj_roc_sourcecode'),
                orderitems: JSON.parse(rec.getValue('custrecord_swc_jj_roc_orderitems')),
                currency: rec.getValue('custrecord_swc_jj_roc_currency'),
                loc_id: rec.getValue('custrecord_swc_jj_roc_returnwarehouseid')
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
        var acc_name = obj.acc_name;
        var orderid = obj.orderid;
        var currency_text = obj.currency;
        var orderitems = obj.orderitems;
        var lot_date = obj.return_date ? moment(obj.return_date).format('YYYYMMDD') : '';
        var loc_id = obj.loc_id;
        var ra_id, ir_id, cm_id;
        try {
            var currency_id;
            if (currency_text) {
                search.create({
                    type: 'currency',
                    filters: [
                        { name: 'symbol', operator: 'is', values: currency_text }
                    ]
                }).run().each(function (e) {
                    currency_id = e.id
                    return true
                })
                if (!currency_id) {
                    throw error.create({ name: 'error', message: '找不到货币，请维护货币：' + currency_text, notifyOff: false });
                }
            }
            //匹配货品
            var item_arr = [], error_items = [], item_ids = [];
            for (let i = 0; i < orderitems.length; i++) {
                var item_id = getItemId(orderitems[i].sku);
                if (!item_id) {
                    error_items.push(orderitems[i].sku);
                }
                if (item_ids.indexOf(item_id) == -1) {
                    item_ids.push(item_id);
                }
                item_arr.push({
                    item_id: item_id,
                    re_qty: orderitems[i].returnQuantity,
                    rate: orderitems[i].returnUnitPrice,
                    amount: orderitems[i].amount,
                    swc_msku: orderitems[i].msku,
                    jj_line_id: orderitems[i].id
                });
            }
            if (error_items.length > 0) {
                throw error.create({ name: 'error', message: '以下sku找不到对应的NS货品：' + error_items + ',请检查货品', notifyOff: false });
            }
            //使用【原发货单号】匹配原销售订单
            var so_info = getSoInfo(orderid, loc_id), ir_cost = {};
            if (Object.keys(so_info).length > 0) {
                //匹配到销售订单,根据销售订单生成退货授权
                var so_id = so_info.so_id, re_loc_id = so_info.re_loc_id, so_num = so_info.so_num, so_status = so_info.so_status;
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
                //查询退货成本
                //先获取销售订单发出成本
                var so_loc_cost = getSoLocCost(so_id, item_ids);
                log.debug('so发出成本', so_loc_cost);
                if (!Object.keys(so_loc_cost).length) {
                    throw error.create({ name: 'error', message: '未匹配到销货成本金额', notifyOff: false });
                } else {
                    ir_cost = so_loc_cost;
                }
                rec.setValue({ fieldId: 'trandate', value: format.parse({ value: return_date, type: 'date' }) });
                rec.setValue({ fieldId: 'orderstatus', value: 'B' });
                rec.setValue({ fieldId: 'location', value: re_loc_id });
                rec.setValue({ fieldId: 'currency', value: currency_id });
                rec.setValue({ fieldId: 'custbody_swc_jj_return_order', value: roc_id });
                var ra_line = rec.getLineCount({ sublistId: 'item' });
                if (ra_line > 0) {
                    for (var i = 0; i < ra_line; i++) {
                        rec.removeLine({ sublistId: 'item', line: i });
                    }
                }
                for (let i = 0; i < item_arr.length; i++) {
                    const element = item_arr[i];
                    rec.selectNewLine({ sublistId: 'item' });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: element.item_id });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.re_qty });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: '-1' });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: element.rate });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: element.amount });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_msku', value: element.swc_msku });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id', value: element.jj_line_id });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_original_if_serialnumber', value: lot_info[element.item_id] });
                    rec.commitLine({ sublistId: 'item' });
                }
                ra_id = rec.save({ ignoreMandatoryFields: true });
            } else {
                //获取店铺的退货仓
                var re_loc_data = getReturnLoc(acc_id, loc_id);
                if (!Object.keys(re_loc_data).length) {
                    throw error.create({ name: 'error', message: acc_name + ':找不到退货仓库/备货维度，请维护退货仓库、备货维度', notifyOff: false });
                }
                if (!re_loc_data.loc_id || !re_loc_data.plan_metrics) {
                    throw error.create({ name: 'error', message: acc_name + ':找不到退货仓库/备货维度，请维护退货仓库、备货维度', notifyOff: false });
                }
                //退货成本先获取退货收货仓的地点平均成本，若退货收货仓没有地点平均成本，则使用店铺维护的备货维度查询仓库类型为3PL、FBA、CG的地点平均成本用于退货成本
                var ra_loc_cost = getItemPrice(re_loc_data.loc_id, item_ids);
                log.debug('退货收货仓的地点平均成本', ra_loc_cost);
                if (!Object.keys(ra_loc_cost).length) {
                    //查询备货维度对应的仓库
                    var loc_arr = getLocArr(re_loc_data.plan_metrics);
                    log.debug('备货维度对应的仓库', loc_arr);
                    if (loc_arr.length > 0) {
                        ir_cost = getItemPrice(loc_arr, item_ids);
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
                rec.setValue({ fieldId: 'entity', value: acc_id });
                rec.setValue({ fieldId: 'trandate', value: format.parse({ value: return_date, type: 'date' }) });
                rec.setValue({ fieldId: 'orderstatus', value: 'B' });
                rec.setValue({ fieldId: 'location', value: re_loc_data.loc_id });
                rec.setValue({ fieldId: 'otherrefnum', value: orderid });
                rec.setValue({ fieldId: 'currency', value: currency_id });
                rec.setValue({ fieldId: 'custbody_swc_jj_return_order', value: roc_id });
                for (let i = 0; i < item_arr.length; i++) {
                    const element = item_arr[i];
                    rec.selectNewLine({ sublistId: 'item' });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: element.item_id });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.re_qty });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: '-1' });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: element.rate });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: element.amount });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_msku', value: element.swc_msku });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id', value: element.jj_line_id });
                    rec.commitLine({ sublistId: 'item' });
                }
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
                ir_rec.setValue({ fieldId: 'custbody_swc_jj_return_order', value: roc_id });
                var lineCount = ir_rec.getLineCount({ sublistId: 'item' }) || 0;
                for (var i = 0; i < lineCount; i++) {
                    var lot_num = 'RMA-' + lot_date + '-' + ra_id + '-R';
                    ir_rec.selectLine({ sublistId: 'item', line: i });
                    var item_id = ir_rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });
                    ir_cost[item_id]['loc_id'] ? ir_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_cover_loc', value: ir_cost[item_id]['loc_id'] }) : '';
                    ir_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'unitcostoverride', value: ir_cost[item_id]['item_price'] || '' });
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
                    // cm_rec.setValue({ fieldId: 'custbody_swc_jj_return_order', value: roc_id });
                    // cm_id = cm_rec.save({ ignoreMandatoryFields: true });
                    // if (cm_id) {
                    // log.debug('cm_id', '退货授权贷项通知单已创建');

                    var return_author_load = record.load({ type: record.Type.RETURN_AUTHORIZATION, id: ra_id })
                    var LineCount = return_author_load.getLineCount({ sublistId: 'item' })
                    for (var i = 0; i < LineCount; i++) {
                        return_author_load.setSublistValue({ sublistId: 'item', fieldId: 'isclosed', line: i, value: true });
                    }
                    return_author_load.save()

                    record.submitFields({
                        type: 'customrecord_swc_jj_return_order_cache',
                        id: roc_id,
                        values: {
                            custrecord_swc_jj_roc_error: '',
                            custrecord_swc_jj_roc_resolved: true,
                            custrecord_swc_jj_roc_relation_ra: ra_id,
                            custrecord_swc_jj_roc_relation_ir: ir_id,
                            // custrecord_swc_jj_roc_relation_cm: cm_id,
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
                type: 'customrecord_swc_jj_return_order_cache',
                id: roc_id,
                values: {
                    custrecord_swc_jj_roc_retry: Number(retry) + 1,
                    custrecord_swc_jj_roc_error: e,
                    custrecord_swc_jj_roc_resolved: false
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
            if (result.getValue(result.columns[1])) {
                price[result.getValue(result.columns[0])] = price[result.getValue(result.columns[0])] || {};
                if (!Object.keys(price[result.getValue(result.columns[0])]).length) {
                    price[result.getValue(result.columns[0])]['loc_id'] = result.getValue(result.columns[2]) || '';
                    price[result.getValue(result.columns[0])]['item_price'] = result.getValue(result.columns[1]) || '';
                }
            }
            return true;
        });
        return price;
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
            if (result.getValue(result.columns[1])) {
                cost_info[result.getValue(result.columns[0])] = cost_info[result.getValue(result.columns[0])] || {};
                cost_info[result.getValue(result.columns[0])]['loc_id'] = '';
                cost_info[result.getValue(result.columns[0])]['item_price'] = Math.abs(result.getValue(result.columns[1])) || '';
            }
            return true;
        });
        return cost_info;
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

    function getItemId(name) {
        var item_id;
        search.create({
            type: 'item',
            filters: [
                ['isinactive', 'is', false],
                'AND',
                ['itemid', 'is', name]
            ]
        }).run().each(function (rec) {
            item_id = rec.id;
            return false;
        });
        return item_id;
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

    function getSoInfo(orderid, loc_id) {
        var rec_info = {}, sub_id;
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
                    'tranid',//单号
                    'statusref',//状态
                    'customer.subsidiarynohierarchy'//客户子公司
                ]
        }).run().each(function (result) {
            rec_info.so_id = result.id;
            rec_info.so_num = result.getValue(result.columns[0]);
            rec_info.so_status = result.getValue(result.columns[1]);
            sub_id = result.getValue(result.columns[2]);
            return false;
        });
        if (!sub_id) {
            return rec_info;
        }
        //使用店铺子公司+退货仓库ID匹配地点信息
        var rec_loc_id = getLocId(sub_id, loc_id);
        rec_info.re_loc_id = rec_loc_id || '';
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