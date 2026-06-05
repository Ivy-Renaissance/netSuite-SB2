/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *预估仓租费日记录创建PO单
 */
define(['N/search', 'N/record', 'N/runtime', '../common/moment', 'N/error', 'N/format', '../common/SWC_CONFIG_DATA'], function (search, record, runtime, moment, error, format, SWC_CONFIG_DATA) {
    var CONFIG = SWC_CONFIG_DATA.configData();
    function getInputData() {
        try {
            var need_data = getNeedData();
            log.debug('need_data', need_data);
            log.debug('need_data.length', Object.keys(need_data).length);
            return need_data;
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getNeedData() {
        var ewh_fee_day_warehouse = runtime.getCurrentScript().getParameter('custscript_swc_ewh_fee_day_warehouse');
        var start_date = runtime.getCurrentScript().getParameter('custscript_swc_ewh_fee_start_date');
        var end_date = runtime.getCurrentScript().getParameter('custscript_swc_ewh_fee_end_date');
        start_date = start_date ? format.format({ value: start_date, type: 'date' }) : '';
        end_date = end_date ? format.format({ value: end_date, type: 'date' }) : '';
        var need_arr = {};
        var filters_arr = [
            ['custrecord_swc_ewh_fee_day_po', 'anyof', '@NONE@'],
            'AND',
            ['isinactive', 'is', 'F'],
            'AND',
            ["custrecord_swc_ewh_fee_day_fee", "greaterthan", "0"],
            "AND",
            ["custrecord_swc_ewh_fee_day_type", "is", "预估"]
        ];
        if (ewh_fee_day_warehouse) {
            filters_arr.push('AND', ['custrecord_swc_ewh_fee_day_warehouse', 'anyof', ewh_fee_day_warehouse]);
        }
        if (start_date || end_date) {
            filters_arr.push('AND', ['custrecord_swc_ewh_fee_day_date', 'within', start_date, end_date]);
        }
        log.debug('filters_arr', filters_arr);
        var order_detailSearchObj = search.create({
            type: 'customrecord_swc_ewh_fee_day',
            filters: filters_arr,
            columns:
                [
                    'custrecord_swc_ewh_fee_day_subsidiary',
                    'custrecord_swc_ewh_fee_day_warehouse',
                    'custrecord_swc_ewh_fee_day_currency',
                    { name: 'custrecord_swc_ewh_fee_day_date', sort: 'ASC' },
                    'custrecord_swc_ewh_fee_day_fee',
                    'custrecord_swc_ewh_fee_day_sku',
                    'custrecord_swc_ewh_fee_day_quantity',
                    'custrecord_swc_ewh_fee_day_warehouse.custrecord_swc_vendor'
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
                var quantity = results[i].getValue(order_detailSearchObj.columns[6]);
                var vendor = results[i].getValue(order_detailSearchObj.columns[7]);
                var key = vendor + '_' + subsidiary + '_' + currency;
                need_arr[key] = need_arr[key] || {};
                need_arr[key]['bill_ids'] = need_arr[key]['bill_ids'] || [];
                need_arr[key]['bill_ids'].push(bill_id);
                need_arr[key]['subsidiary'] = subsidiary;
                need_arr[key]['warehouse'] = warehouse;
                need_arr[key]['currency'] = currency;
                need_arr[key]['date'] = date;
                need_arr[key]['sku'] = sku;
                need_arr[key]['quantity'] = quantity;
                need_arr[key]['vendor'] = vendor;
                need_arr[key]['fee'] = Number(need_arr[key]['fee'] || 0) + Number(fee);
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
        var po_id, ir_Id;
        try {
            var value = JSON.parse(context.value);
            log.debug('value', value);
            var bill_ids = value.bill_ids, subsidiary = value.subsidiary, warehouse = value.warehouse, currency = value.currency, date = value.date, fee = value.fee,
                sku = value.sku, quantity = value.quantity, vendor = value.vendor, lot = value.lot, sublist_id = 'item';
            log.debug('subsidiary', subsidiary);
            log.debug('warehouse', warehouse);
            log.debug('currency', currency);
            log.debug('date', date);
            log.debug('fee', fee);
            log.debug('quantity', quantity);
            log.debug('vendor', vendor);
            //获取供应商的付款条件
            var vendor_payment_terms = getVendorPaymentTerms(vendor);
            log.debug('vendor_payment_terms', vendor_payment_terms);
            //创建采购订单
            var po_data = record.create({ type: 'purchaseorder', isDynamic: true });
            po_data.setValue('entity', vendor);
            po_data.setValue('subsidiary', subsidiary);
            date ? po_data.setText('trandate', date) : '';
            po_data.setValue('location', warehouse);
            po_data.setValue('currency', currency);
            po_data.setValue('custbody_swc_ewh_fee_day_list', bill_ids);
            // po_data.setValue('memo', '预估仓租费日记录测试数据');
            po_data.setValue('custbody_swc_po_fee', 6);//后续需要调整  【采购订单类型(手工单用)】尾程费用类-预估
            po_data.setValue('custbody_swc_order_type2', 6);//后续需要调整  【采购订单类型（代码用）】尾程费用类-预估
            po_data.setValue('custbody_swc_vendor_payment_terms', vendor_payment_terms);//付款条件
            po_data.selectNewLine(sublist_id);
            po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'item', value: CONFIG.s_item_czf });//后续需要调整
            po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'quantity', value: 1 });
            po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'rate', value: fee });
            po_data.commitLine(sublist_id);
            po_id = po_data.save({ ignoreMandatoryFields: true });
            if (po_id) {
                log.debug('创建PO单成功', po_id);
                var vendorbill_Rec = record.transform({
                    fromType: 'purchaseorder',
                    fromId: po_id,
                    toType: 'vendorbill',
                    isDynamic: true
                });
                date ? vendorbill_Rec.setText('trandate', date) : '';
                var vendorbill_Id = vendorbill_Rec.save();
                if (vendorbill_Id) {
                    log.debug('创建账单成功', vendorbill_Id);
                    context.write(po_id, bill_ids);
                }
                // var ir_Rec = record.transform({
                //     fromType: 'purchaseorder',
                //     fromId: po_id,
                //     toType: 'itemreceipt',
                //     isDynamic: true
                // });
                // date ? ir_Rec.setText('trandate', date) : '';
                // ir_Id = ir_Rec.save();
                // if (ir_Id) {
                //     log.debug('创建收货单成功', ir_Id);
                // }
            }
        } catch (e) {
            log.debug('e', e);
            // if (ir_Id) {
            //     record.delete({ type: "itemreceipt", id: ir_Id });
            // }
            if (po_id) {
                record.delete({ type: "purchaseorder", id: po_id });
            }
        }
    }

    function getVendorPaymentTerms(vendor) {
        var payment_terms;
        search.create({
            type: 'vendor',
            filters:
                [
                    ['internalid', 'anyof', vendor]
                ],
            columns:
                [
                    'custentity_swc_payment_terms'
                ]
        }).run().each(function (result) {
            if (result.getValue(result.columns[0])) {
                var payment_terms_arr = result.getValue(result.columns[0]).split(',');
                payment_terms = payment_terms_arr[0];
            }
            return false;
        });
        return payment_terms;
    }

    function reduce(context) {
        try {
            log.debug('context', context);
            var po_id = context.key;
            var bill_ids = JSON.parse(context.values[0]);
            log.debug('po_id', po_id);
            log.debug('bill_ids', bill_ids);
            //回写预估仓租费日记录
            for (var i in bill_ids) {
                var ewh_fee_day_id = record.submitFields({
                    type: 'customrecord_swc_ewh_fee_day',
                    id: bill_ids[i],
                    values: {
                        custrecord_swc_ewh_fee_day_po: po_id
                    }
                });
                if (ewh_fee_day_id) {
                    log.debug('success', 'PO回写成功' + ewh_fee_day_id);
                }
            }
        } catch (e) {
            log.debug('e', e);
        }
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