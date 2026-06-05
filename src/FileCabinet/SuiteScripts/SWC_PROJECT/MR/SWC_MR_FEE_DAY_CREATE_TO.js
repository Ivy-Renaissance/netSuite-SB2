/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *预估仓租费日记录创建TO单
 */
define(['N/search', 'N/record', 'N/runtime', '../common/moment', 'N/error'], function (search, record, runtime, moment, error) {

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
            type: 'customrecord_swc_ewh_fee_day',
            filters:
                [
                    ["custrecord_swc_ewh_fee_day_noamount","greaterthan","0.00"],
                    "AND",
                    ["custrecord_swc_ewh_fee_day_po","noneof","@NONE@"],
                    "AND",
                    ['custrecord_swc_ewh_fee_day_to', 'anyof', '@NONE@'],
                    'AND',
                    ['custrecord_swc_ewh_fee_day_to1', 'anyof', '@NONE@'],
                    'AND',
                    ['isinactive', 'is', 'F'],
                    // 'AND',
                    // ['internalid', 'anyof', 8, 15, 16]
                ],
            columns:
                [
                    'custrecord_swc_ewh_fee_day_subsidiary',
                    'custrecord_swc_ewh_fee_day_warehouse',
                    'custrecord_swc_ewh_fee_day_currency',
                    'custrecord_swc_ewh_fee_day_date',
                    // 'custrecord_swc_ewh_fee_day_fee',
                    'custrecord_swc_ewh_fee_day_noamount',
                    'custrecord_swc_ewh_fee_day_sku',
                    'custrecord_swc_ewh_fee_day_lot',
                    'custrecord_swc_ewh_fee_day_quantity'
                ]
        });
        var results = getAllResults(order_detailSearchObj);
        if (results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                var bill_id = results[i].id;
                var subsidiary = results[i].getValue(order_detailSearchObj.columns[0]);
                var warehouse = results[i].getValue(order_detailSearchObj.columns[1]);
                var currency = results[i].getValue(order_detailSearchObj.columns[2]);
                var date = results[i].getValue(order_detailSearchObj.columns[3]);
                var fee = results[i].getValue(order_detailSearchObj.columns[4]);
                var sku = results[i].getValue(order_detailSearchObj.columns[5]);
                var lot = results[i].getValue(order_detailSearchObj.columns[6]);
                var quantity = results[i].getValue(order_detailSearchObj.columns[7]);
                need_arr.push({
                    bill_id: bill_id,
                    subsidiary: subsidiary,
                    warehouse: warehouse,
                    currency: currency,
                    date: date,
                    fee: fee,
                    sku: sku,
                    lot: lot,
                    quantity: quantity
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
        var to_ids = [], if_data_ids = [], ir_data_ids = [],bill_id;
        try {
            var value = JSON.parse(context.value);
            var  subsidiary = value.subsidiary, warehouse = value.warehouse, currency = value.currency, date = value.date, fee = value.fee,
                sku = value.sku, lot = value.lot, quantity = value.quantity, sublist_id = 'item';
            bill_id = value.bill_id;
            //创建第一段转移单
            var to_data = record.create({ type: 'transferorder', isDynamic: true });
            to_data.setValue('subsidiary', subsidiary);
            to_data.setValue('location', warehouse);
            to_data.setValue('transferlocation', 39);//后续取值需要调整
            to_data.setValue('orderstatus', 'B');
            date ? to_data.setText('trandate', date) : '';
            to_data.setValue('custbody_swc_ewh_fee_day_list', bill_id);
            to_data.setValue('useitemcostastransfercost', true);
            to_data.setValue('memo', '预估仓租费日记录测试数据');
            to_data.selectNewLine(sublist_id);
            to_data.setCurrentSublistValue(sublist_id, 'item', sku);
            to_data.setCurrentSublistValue(sublist_id, 'quantity', quantity);
            if (lot) {
                var inventorydetail = to_data.getCurrentSublistSubrecord({ sublistId: sublist_id, fieldId: 'inventorydetail' });
                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: lot });
                inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: quantity });
                inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
            }
            to_data.commitLine({ sublistId: 'item' });
            var to_data_id = to_data.save({ ignoreMandatoryFields: true });
            if (to_data_id) {
                log.debug('创建TO单成功1', to_data_id);
                to_ids.push(to_data_id);
                var if_data = record.transform({
                    fromType: 'transferorder',
                    fromId: to_data_id,
                    toType: 'itemfulfillment',
                    isDynamic: true
                });
                date ? if_data.setText('trandate', date) : '';
                if_data.setValue('shipstatus', 'C');
                var if_data_id = if_data.save({ ignoreMandatoryFields: true });
                if (if_data_id) {
                    log.debug('创建TO单履行成功1', if_data_id);
                    if_data_ids.push(if_data_ids);
                    var ir_data = record.transform({
                        fromType: 'transferorder',
                        fromId: to_data_id,
                        toType: 'itemreceipt',
                        isDynamic: true
                    });
                    ir_data.setValue('currency', currency);
                    date ? ir_data.setText('trandate', date) : '';
                    var ir_data_id = ir_data.save({ ignoreMandatoryFields: true });
                    if (ir_data_id) {
                        log.debug('创建TO单收货成功1', ir_data_id);
                        ir_data_ids.push(ir_data_id);
                    }
                }
                //创建第二段转移单
                var to_data1 = record.create({ type: 'transferorder', isDynamic: true });
                to_data1.setValue('subsidiary', subsidiary);
                to_data1.setValue('location', 39);//后续取值需要调整
                to_data1.setValue('transferlocation', warehouse);
                to_data1.setValue('orderstatus', 'B');
                date ? to_data1.setText('trandate', date) : '';
                to_data1.setValue('custbody_swc_ewh_fee_day_list', bill_id);
                to_data1.setValue('useitemcostastransfercost', true);
                to_data1.setValue('memo', '预估仓租费日记录测试数据');
                to_data1.selectNewLine(sublist_id);
                to_data1.setCurrentSublistValue(sublist_id, 'item', sku);
                to_data1.setCurrentSublistValue(sublist_id, 'quantity', quantity);
                if (lot) {
                    var inventorydetail1 = to_data1.getCurrentSublistSubrecord({ sublistId: sublist_id, fieldId: 'inventorydetail' });
                    inventorydetail1.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: lot });
                    inventorydetail1.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                    inventorydetail1.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: quantity });
                    inventorydetail1.commitLine({ sublistId: 'inventoryassignment' });
                }
                to_data1.commitLine({ sublistId: 'item' });
                var to_data_id1 = to_data1.save({ ignoreMandatoryFields: true });
                if (to_data_id1) {
                    log.debug('创建TO单成功2', to_data_id1);
                    to_ids.push(to_data_id1);
                    var if_data1 = record.transform({
                        fromType: 'transferorder',
                        fromId: to_data_id1,
                        toType: 'itemfulfillment',
                        isDynamic: true
                    });
                    date ? if_data1.setText('trandate', date) : '';
                    if_data1.setValue('shipstatus', 'C');
                    var if_data_id1 = if_data1.save({ ignoreMandatoryFields: true });
                    if (if_data_id1) {
                        log.debug('创建TO单履行成功2', if_data_id1);
                        if_data_ids.push(if_data_id1);
                        var ir_data1 = record.transform({
                            fromType: 'transferorder',
                            fromId: to_data_id1,
                            toType: 'itemreceipt',
                            isDynamic: true
                        });
                        date ? ir_data1.setText('trandate', date) : '';
                        ir_data1.setValue('currency', currency);
                        ir_data1.setValue('landedcostperline', true);
                        ir_data1.selectLine({ sublistId: sublist_id, line: 0 });
                        var landed_cost = ir_data1.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'landedcost' });
                        landed_cost.selectNewLine({ sublistId: 'landedcostdata' });
                        landed_cost.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: 37 });
                        landed_cost.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'amount', value: fee });
                        landed_cost.commitLine({ sublistId: 'landedcostdata' });
                        ir_data1.commitLine(sublist_id);
                        var ir_data_id1 = ir_data1.save({ ignoreMandatoryFields: true });
                        if (ir_data_id1) {
                            log.debug('创建TO单收货成功2', ir_data_id1);
                            ir_data_ids.push(ir_data_id1);
                            //回写预估仓租费日记录
                            var ewh_fee_day_id = record.submitFields({
                                type: 'customrecord_swc_ewh_fee_day',
                                id: bill_id,
                                values: {
                                    custrecord_swc_ewh_fee_day_to: to_data_id,
                                    custrecord_swc_ewh_fee_day_to1: to_data_id1,
                                    custrecord_swc_ewh_fee_day_error: ""
                                }
                            });
                            if (ewh_fee_day_id) {
                                log.debug('success', 'TO回写成功' + ewh_fee_day_id);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            log.debug('e', e);
            if (ir_data_ids.length > 0) {
                for (var i = 0; i < ir_data_ids.length; i++) {
                    record.delete({ type: "itemreceipt", id: ir_data_ids[i] });
                }
            }
            if (if_data_ids.length > 0) {
                for (var i = 0; i < if_data_ids.length; i++) {
                    record.delete({ type: "itemfulfillment", id: if_data_ids[i] });
                }
            }
            if (to_ids.length > 0) {
                for (var i = 0; i < to_ids.length; i++) {
                    record.delete({ type: "transferorder", id: to_ids[i] });
                }
            }
            if (bill_id) {
                record.submitFields({
                    type: 'customrecord_swc_ewh_fee_day',
                    id: bill_id,
                    values: {
                        "custrecord_swc_ewh_fee_day_error": e.message
                    }
                })
            }
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