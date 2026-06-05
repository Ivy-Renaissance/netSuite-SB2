/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_JJ_TRANSFORM_RETURN_ORDER.js
 *@description 积加退货报告处理(废弃  使用 SWC_MR_JJ_CREATE_RA.js 脚本 );
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {

        const recordType = 'customrecord_swc_jj_return_order_cache';

        function getInputData() {
            var startTime = new Date().getTime();
            log.emergency('getInputData 开始', startTime);
            var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_tro_store' });
            var orderid = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_tro_order_id' });
            var startdate = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_tro_startdate' });
            var enddate = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_tro_enddate' });
            if (startdate) {
                startdate = format.format({ value: startdate, type: 'date' })
            }
            if (enddate) {
                enddate = format.format({ value: enddate, type: 'date' })
            }
            var orders = [];
            var limit = 399;
            var filters = [
                { name: 'custrecord_swc_jj_roc_resolved', operator: 'is', values: false },
                { name: 'custrecord_swc_jj_roc_returnstatus', operator: 'is', values: 'COMPLETE' },
            ]
            if (orderid) {
                filters.push({ name: 'custrecord_swc_jj_roc_sourcecode', operator: 'is', values: orderid })
            };
            if (acc) {
                filters.push({ name: 'custrecord_swc_jj_roc_store', operator: 'anyof', values: acc })
            };
            if (enddate && startdate) {
                filters.push({ name: 'custrecord_swc_jj_roc_returnorderdate', operator: 'within', values: [startdate, enddate] })
            }
            if (enddate && !startdate) {
                filters.push({ name: 'custrecord_swc_jj_roc_returnorderdate', operator: 'onorbefore', values: enddate })
            }
            if (!enddate && startdate) {
                filters.push({ name: 'custrecord_swc_jj_roc_returnorderdate', operator: 'onorafter', values: startdate })
            }

            search.create({
                type: recordType,
                filters: filters,
                columns: [
                    { name: 'custrecord_swc_jj_roc_retry', sort: search.Sort.ASC },
                    { name: 'custrecord_swc_jj_roc_returnorderdate', sort: search.Sort.ASC },
                    { name: 'custrecord_swc_jj_roc_store' },
                    { name: 'custrecord_swc_jj_roc_sourcecode' },
                    { name: 'custrecord_swc_jj_roc_returnwarehouseid' },
                    { name: 'custrecord_swc_jj_roc_orderitems' },
                    { name: 'custrecord_swc_jj_roc_currency' },
                    { name: 'custrecord_swc_jj_roc_actualinbounddate' },
                ]
            }).run().each(function (rec) {
                orders.push({
                    id: rec.id,
                    retry: rec.getValue({ name: 'custrecord_swc_jj_roc_retry', sort: search.Sort.ASC }),
                    return_date: rec.getValue({ name: 'custrecord_swc_jj_roc_returnorderdate', sort: search.Sort.ASC }),
                    acc_id: rec.getValue('custrecord_swc_jj_roc_store'),
                    orderid: rec.getValue('custrecord_swc_jj_roc_sourcecode'),
                    returnwarehouseid: rec.getValue('custrecord_swc_jj_roc_returnwarehouseid'),
                    currency: rec.getValue('custrecord_swc_jj_roc_currency'),
                    actualinbounddate: rec.getValue('custrecord_swc_jj_roc_actualinbounddate'),
                    orderitems: JSON.parse(rec.getValue('custrecord_swc_jj_roc_orderitems')),
                })
                return --limit > 0
            })
            log.audit('获取数量 orders', orders.length)
            var endTime = new Date().getTime();
            log.emergency('getInputData 结束', endTime);
            log.emergency('getInputData 耗时', endTime - startTime);
            return orders;
        }

        function map(context) {
            var obj = JSON.parse(context.value);
            log.audit('obj', obj)
            var roc_id = obj.id;
            var retry = obj.retry;
            var return_date = obj.return_date;
            var acc_id = obj.acc_id;
            var orderid = obj.orderid;
            var returnwarehouseid = obj.returnwarehouseid;
            var actualinbounddate = obj.actualinbounddate;
            var currency_text = obj.currency;
            var orderitems = obj.orderitems;
            var ra_id, ir_id, cm_id;
            var lot_sns = [];
            try {
                var location_info = interface.GetLocationInfo(returnwarehouseid);
                log.audit('location_info', location_info);

                var acc_info = interface.GetAccountInfo(acc_id);
                log.audit('acc_info', acc_info);

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
                        throw '找不到货币，请维护货币：' + currency_text;
                    }
                }

                var res = SearchReturnAuthorization(roc_id);
                if (!res) {
                    var so_obj = interface.SearchSalesOrder(acc_info.id, orderid, false);

                    for (let i = 0; i < orderitems.length; i++) {
                        var item_info = interface.GetItemInfo('', orderitems[i].sku);
                        log.audit('item_info', item_info);
                        orderitems[i].item_info = item_info;
                    }

                    if (so_obj.so_id) {
                        if (so_obj.order_status == 'pendingFulfillment' || so_obj.order_status == 'pendingApproval' || so_obj.order_status == 'cancelled') {
                            //没发货，直接创建退货授权
                            ra_id = CreateReturnAuthorization(roc_id, acc_info, location_info, return_date, currency_id, orderid, orderitems);
                        } else {
                            //有销售订单，查对应货品的批次
                            var so_items = interface.SearchItemInfo(so_id);
                            var flag = false;
                            for (let i = 0; i < orderitems.length; i++) {
                                const oi = orderitems[i];
                                var item_info = interface.GetItemInfo('', oi.sku);
                                for (let j = 0; j < so_items.length; j++) {
                                    const si = so_items[j];
                                    if (item_info.id == si.so_item_id) {
                                        if (Number(si.so_item_quantityshiprecv) > Number(oi.returnQuantity)) {
                                            flag = true;
                                            break;
                                        }
                                    }
                                }
                            }
                            if (flag) {
                                //查询发货批次
                                search.create({
                                    type: 'itemfulfillment',
                                    filters: [
                                        { name: 'createdfrom', operator: 'anyof', values: so_obj.so_id },
                                        { name: 'cogs', operator: 'is', values: false },
                                    ],
                                    columns: [
                                        { name: 'item' },
                                        { name: 'location' },
                                        { name: 'serialnumber' },
                                        { name: 'serialnumberquantity' },
                                    ]
                                }).run().each(function (rec) {
                                    lot_sns.push({
                                        item_id: rec.getValue('item'),
                                        location_id: rec.getValue('location'),
                                        serialnumber: rec.getValue('serialnumber'),
                                        serialnumberquantity: Math.abs(rec.getValue('serialnumberquantity')),
                                    });
                                    return true;
                                });

                                ra_id = TransformReturnAuthorization(roc_id, acc_info, location_info, so_obj, return_date, currency_id, orderid, orderitems);
                            } else {
                                ra_id = CreateReturnAuthorization(roc_id, acc_info, location_info, return_date, currency_id, orderid, orderitems);
                            }
                        }
                    } else {
                        //没有销售订单，直接创建退货授权
                        ra_id = CreateReturnAuthorization(roc_id, acc_info, location_info, return_date, currency_id, orderid, orderitems);
                    }
                    log.audit('ra_id', ra_id);
                    if (ra_id) {
                        if (actualinbounddate) {
                            ir_id = TransformItemReceipt(roc_id, ra_id, actualinbounddate, orderid, orderitems, lot_sns);
                            log.audit('ir_id', ir_id);
                            cm_id = TransformCreditMemo(roc_id, ra_id, actualinbounddate, orderid, orderitems);
                            log.audit('cm_id', cm_id);
                            record.submitFields({
                                type: recordType,
                                id: roc_id,
                                values: {
                                    custrecord_swc_jj_roc_error: '',
                                    custrecord_swc_jj_roc_resolved: true,
                                    custrecord_swc_jj_roc_relation_ra: ra_id,
                                    custrecord_swc_jj_roc_relation_ir: ir_id,
                                    custrecord_swc_jj_roc_relation_cm: cm_id,
                                }
                            });
                        }
                    }
                } else {
                    //找到已生成的退货授权单
                    //删掉，重新生成
                    record.delete({
                        type: record.Type.RETURN_AUTHORIZATION,
                        id: res.rat_id
                    });
                }

            } catch (err) {
                log.debug('map error', err)
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
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
                    type: recordType,
                    id: roc_id,
                    values: {
                        custrecord_swc_jj_roc_retry: Number(retry) + 1,
                        custrecord_swc_jj_roc_error: e,
                        custrecord_swc_jj_roc_resolved: false,
                    }
                })
            }
        }

        function reduce(context) {

        }

        function summarize(summary) {
        }

        function SearchReturnAuthorization(id) {
            log.debug('SearchReturnAuthorization', id)
            var rs = false
            search.create({
                type: record.Type.RETURN_AUTHORIZATION,
                filters: [
                    { name: "custbody_swc_jj_return_order", operator: 'anyof', values: id },
                ],
                columns: [
                    { name: "status" },
                    { name: "location" },
                    { name: "name" },
                ]
            }).run().each(function (rec) {
                rs = {
                    rat_id: rec.id,
                    status: rec.getValue("status"),
                    location: rec.getValue("location"),
                    ra_account: rec.getValue("name"),
                }
            });
            return rs
        }

        function CreateReturnAuthorization(roc_id, acc_info, location_info, return_date, currency_id, orderid, orderitems) {
            try {
                log.audit('CreateReturnAuthorization', {
                    roc_id: roc_id,
                    acc_info: acc_info,
                    location_info: location_info,
                    return_date: return_date,
                    currency_id: currency_id,
                    orderid: orderid,
                });

                var rec = record.create({ type: record.Type.RETURN_AUTHORIZATION, isDynamic: true })
                rec.setValue({ fieldId: 'entity', value: acc_info.id });
                rec.setValue({ fieldId: 'trandate', value: format.parse({ value: return_date, type: 'date' }) });
                rec.setValue({ fieldId: 'orderstatus', value: 'B' });
                rec.setValue({ fieldId: 'location', value: location_info.id });
                rec.setValue({ fieldId: 'otherrefnum', value: orderid });
                rec.setValue({ fieldId: 'currency', value: currency_id });
                rec.setValue({ fieldId: 'custbody_swc_jj_return_order', value: roc_id });

                for (let i = 0; i < orderitems.length; i++) {
                    const element = orderitems[i];
                    log.audit('element', element);
                    // var item_info = interface.GetItemInfo('', element.sku);
                    // log.audit('item_info', item_info);
                    rec.selectNewLine({ sublistId: 'item' });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: element.item_info.id });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.returnQuantity });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: '-1' });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: element.returnUnitPrice });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: element.amount });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_msku', value: element.msku });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id', value: element.id });

                    // if (item_info.islotitem || item_info.isserialitem) {
                    //     var inventorydetail = rec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
                    //     inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                    //     inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', text: orderid });
                    //     inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                    //     inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: element.returnQuantity });
                    //     inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                    // }
                    rec.commitLine({ sublistId: 'item' });
                }

                var id = rec.save({ ignoreMandatoryFields: true });
                return id
            } catch (err) {
                log.error('CreateReturnAuthorization error', err);
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        function TransformItemReceipt(roc_id, ra_id, date, orderid, orderitems, lot_sns) {
            try {
                log.audit('TransformItemReceipt', {
                    roc_id: roc_id,
                    ra_id: ra_id,
                    date: date,
                    orderid: orderid,
                });

                var rec = record.transform({ fromType: record.Type.RETURN_AUTHORIZATION, toType: record.Type.ITEM_RECEIPT, fromId: ra_id, isDynamic: true })
                rec.setValue({ fieldId: 'trandate', value: format.parse({ value: date, type: 'date' }) });
                rec.setValue({ fieldId: 'custbody_swc_jj_return_order', value: roc_id });

                const ir_line = rec.getLineCount({ sublistId: 'item' });
                log.audit('ir_line', ir_line);
                for (let i = 0; i < ir_line; i++) {
                    rec.selectLine({ sublistId: 'item', line: i })
                    var ir_item_id = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });
                    var ir_location_id = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'location' });
                    var ir_jj_line_id = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id' });
                    for (let j = 0; j < orderitems.length; j++) {
                        log.audit('orderitems', orderitems);
                        log.audit('匹配', {
                            ir_item_id: ir_item_id,
                            item_info_id: orderitems[j].item_info.id,
                            ir_jj_line_id: ir_jj_line_id,
                            jj_id: orderitems[j].id,
                        });
                        if (orderitems[j].id == ir_jj_line_id && orderitems[j].item_info.id == ir_item_id) {
                            log.audit('actualInboundQuantity', orderitems[j].actualInboundQuantity);
                            if (orderitems[j].actualInboundQuantity) {
                                rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true });
                                rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: orderitems[j].actualInboundQuantity });
                                if (orderitems[j].item_info.islotitem || orderitems[j].item_info.isserialitem) {
                                    if (lot_sns.length) {
                                        var inventorydetail = rec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
                                        for (let k = 0; k < lot_sns.length; k++) {
                                            if (lot_sns[k].item_id == ir_item_id && lot_sns[k].location_id == ir_location_id) {
                                                if (Number(orderitems[j].actualInboundQuantity) < Number(lot_sns[k].serialnumberquantity)) {
                                                    inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                                                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', text: lot_sns[k].serialnumber });
                                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: orderitems[j].actualInboundQuantity });
                                                    inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                                                } else {
                                                    inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                                                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', text: lot_sns[k].serialnumber });
                                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: lot_sns[k].serialnumberquantity });
                                                    inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                                                }
                                            }
                                        }
                                    } else {
                                        var inventorydetail = rec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
                                        inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                                        inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', text: orderid });
                                        inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                        inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: orderitems[j].actualInboundQuantity });
                                        inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                                    }
                                }
                            } else {
                                rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false });
                            }
                        }
                    }
                    rec.commitLine({ sublistId: 'item' })
                }
                const new_ir_line = rec.getLineCount({ sublistId: 'item' });
                if (Number(new_ir_line) > 0) {
                    var id = rec.save({ ignoreMandatoryFields: true });
                    return id;
                } else {
                    log.audit('仅退货', '退货数量为0');
                }

            } catch (err) {
                log.error('TransformItemReceipt error', err);
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        function TransformCreditMemo(roc_id, ra_id, date, orderid, orderitems) {
            try {
                log.audit('TransformCreditMemo', {
                    roc_id: roc_id,
                    ra_id: ra_id,
                    date: date,
                });
                //创建贷项通知单
                var rec = record.transform({ fromType: record.Type.RETURN_AUTHORIZATION, toType: record.Type.CREDIT_MEMO, fromId: ra_id, isDynamic: true });
                rec.setValue({ fieldId: 'trandate', value: format.parse({ value: date, type: 'date' }) })
                rec.setValue({ fieldId: 'custbody_swc_jj_return_order', value: roc_id });

                const cm_line = rec.getLineCount({ sublistId: 'item' });
                var ck = true, remocl = [];
                for (let i = 0; i < cm_line; i++) {
                    rec.selectLine({ sublistId: 'item', line: i })
                    var cm_item_id = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });
                    var cm_quantity = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' });
                    var cm_jj_line_id = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id' });
                    for (let j = 0; j < orderitems.length; j++) {
                        if (orderitems[j].id == cm_jj_line_id && orderitems[j].item_info.id == cm_item_id) {
                            if (orderitems[j].actualInboundQuantity) {
                                if (Number(orderitems[j].amount) > 0 && orderitems[j].actualInboundQuantity <= cm_quantity && ck) {
                                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: orderitems[j].actualInboundQuantity });
                                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: orderitems[j].returnUnitPrice });
                                    // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: orderitems[j].amount });
                                    ck = false;
                                    var index = remocl.indexOf(i);
                                    if (index != -1) {
                                        remocl.splice(index, 1);
                                    }
                                } else {
                                    if (remocl.indexOf(i) == -1) {
                                        remocl.push(i);
                                    }
                                }
                            } else {
                                if (Number(orderitems[j].amount) > 0 && orderitems[j].returnQuantity <= cm_quantity && ck) {
                                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: orderitems[j].returnQuantity });
                                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: orderitems[j].returnUnitPrice });
                                    // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: orderitems[j].amount });
                                    ck = false;
                                    var index = remocl.indexOf(i);
                                    if (index != -1) {
                                        remocl.splice(index, 1);
                                    }
                                } else {
                                    if (remocl.indexOf(i) == -1) {
                                        remocl.push(i);
                                    }
                                }
                            }
                        }
                    }
                    rec.commitLine({ sublistId: 'item' })
                }
                log.audit('remocl', remocl);
                //移除其他行
                var j = 0;
                for (var i = 0; i < cm_line; i++) {
                    var line = remocl.indexOf(i);
                    if (line != -1) {
                        rec.removeLine({
                            sublistId: 'item',
                            line: i - j,
                            ignoreRecalc: false
                        });
                        j++;
                    }
                }

                const new_cm_line = rec.getLineCount({ sublistId: 'item' });
                if (Number(new_cm_line) > 0) {
                    var id = rec.save({ ignoreMandatoryFields: true });
                    return id;
                } else {
                    log.error('仅退货', '退款金额为0,不生成贷项');
                }
            } catch (err) {
                log.audit('TransformCreditMemo error', err);
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        function TransformReturnAuthorization(roc_id, acc_info, location_info, so_obj, return_date, currency_id, orderid, orderitems) {
            try {
                var return_author_id;
                r = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    toType: record.Type.RETURN_AUTHORIZATION,
                    fromId: Number(so_obj.so_id)
                })
                r.setValue({ fieldId: 'trandate', value: format.parse({ value: return_date, type: 'date' }) });
                r.setValue({ fieldId: 'orderstatus', value: 'B' });
                r.setValue({ fieldId: 'location', value: location_info.id });
                f.setValue({ fieldId: 'currency', value: currency_id });
                f.setValue({ fieldId: 'custbody_swc_jj_return_order', value: roc_id });

                var lc = r.getLineCount({ sublistId: 'item' });
                var remocl = [];

                for (var ln = 0; ln < lc; ln++) {
                    var ck = true;
                    var itemid = r.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ln });
                    for (let i = 0; i < orderitems.length; i++) {
                        if (itemid == orderitems[i].item_info.id) {
                            r.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: orderitems[i].returnQuantity, line: ln });
                            r.setSublistValue({ sublistId: 'item', fieldId: 'price', value: '-1', line: ln });
                            r.setSublistValue({ sublistId: 'item', fieldId: 'rate', value: element.returnUnitPrice, line: ln });
                            r.setSublistValue({ sublistId: 'item', fieldId: 'amount', value: element.amount, line: ln });
                            r.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location_info.id, line: ln });
                            r.setSublistValue({ sublistId: 'item', fieldId: 'inventorylocation', value: location_info.id, line: ln });
                            r.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_msku', value: orderitems[i].msku, line: ln });
                            r.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id', value: orderitems[i].id, line: ln });

                            ck = false;
                            var index = remocl.indexOf(ln);
                            if (index != -1) {
                                remocl.splice(index, 1);
                            }
                            break
                        }
                    }
                    if (ck) {
                        if (remocl.indexOf(ln) == -1) {
                            remocl.push(ln);
                        }
                    }
                };

                log.audit('remocl', remocl);
                //移除其他行
                var j = 0;
                for (var i = 0; i < lc; i++) {
                    var line = remocl.indexOf(i);
                    if (line != -1) {
                        r.removeLine({
                            sublistId: 'item',
                            line: i - j,
                            ignoreRecalc: false
                        });
                        j++;
                    }
                }

                var finnal_line = r.getLineCount({ sublistId: 'item' });
                log.audit('finnal_line', finnal_line);
                if (finnal_line == '0') {
                    throw '转退货授权单失败，找不到对应的货品行';
                    return CreateReturnAuthorization(roc_id, acc_info, location_info, return_date, currency_id, orderid, orderitems);
                }
                return_author_id = r.save({ ignoreMandatoryFields: true });
                return return_author_id
            } catch (err) {
                log.error('TransformReturnAuthorization error', err);
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
