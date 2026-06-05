/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_JJ_TRANSFORM_ORDER_MULTIPLATFORM.js
 *@description 积加-订单生成-多平台(multiplatform)
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {

        function getInputData() {
            var data = [];
            try {
                var request_acc = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_mpso_account' });
                var order_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_mpso_orderid' });
                var startdate = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_mpso_startdate' });
                var enddate = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_mpso_end_date' });
                if (startdate) {
                    startdate = format.format({ value: startdate, type: 'date' })
                }
                if (enddate) {
                    enddate = format.format({ value: enddate, type: 'date' })
                }
                interface.getAccountList().map(function (account) {
                    if (account.id != request_acc && request_acc) { return };
                    var limit = 200;
                    var filters = [
                        { name: 'custrecord_swc_dpt_resolved', operator: 'is', values: false },
                        { name: 'custrecord_swc_dpt_processed', operator: 'is', values: true },
                    ]
                    if (order_id) {
                        filters.push({ name: 'custrecord_swc_dpt_platformorderid', operator: 'is', values: order_id })
                    }
                    if (enddate && startdate) {
                        filters.push({ name: 'custrecord_swc_dpt_orderingtime', operator: 'within', values: [startdate, enddate] })
                    }
                    if (enddate && !startdate) {
                        filters.push({ name: 'custrecord_swc_dpt_orderingtime', operator: 'onorbefore', values: enddate })
                    }
                    if (!enddate && startdate) {
                        filters.push({ name: 'custrecord_swc_dpt_orderingtime', operator: 'onorafter', values: startdate })
                    }

                    // 如果先了店铺，则只有等于选择的店铺时才查询，如果没有选择店铺，则都进行查询
                    if ((request_acc && account.id == request_acc) || !request_acc) {
                        filters.push({ name: 'custrecord_swc_dpt_store', operator: 'anyof', values: account.id })
                        search.create({
                            type: 'customrecord_swc_dpt_order',
                            filters: filters,
                            columns: [
                                { name: 'custrecord_swc_dpt_retry', sort: 'ASC' },
                                { name: 'custrecord_swc_dpt_orderingtime', sort: 'DESC' },
                                { name: 'custrecord_swc_dptmaininfo' },
                                { name: 'custrecord_swc_dpt_js' },
                            ]
                        }).run().each(function (rec) {
                            data.push({
                                id: rec.id,
                                type: rec.recordType,
                                retry: rec.getValue({ name: 'custrecord_swc_dpt_retry', sort: 'ASC' }) || 0,
                                order: JSON.parse(rec.getValue('custrecord_swc_dptmaininfo')),
                                price_tax: JSON.parse(rec.getValue('custrecord_swc_dpt_js')),
                                account: account,
                            });
                            return --limit > 0
                        })
                    }
                });

            } catch (error) {
                log.error('getInputData error', error);
            }
            log.audit('data length', data.length);
            return data;
        }

        function map(context) {
            var obj = JSON.parse(context.value);
            log.audit('obj', obj);
            try {
                var o = obj.order;
                var a = obj.account;
                var price_tax = obj.price_tax;
                log.audit('o', o);

                // var local_date_time = format.format({ value: moment.utc(o.orderingTime).toDate(), type: format.Type.DATETIMETZ, timezone: a.store_time_zone });
                var local_date_time = format.format({ value: moment.utc(o.orderingTime).toDate(), type: format.Type.DATE });
                var order_trandate = format.parse({ value: local_date_time, type: 'date' });
                log.audit('order_trandate', order_trandate);

                var so_id, ord, currency_text;
                search.create({
                    type: 'salesorder',
                    filters: [
                        { name: 'mainline', operator: 'is', values: true },
                        { name: 'name', operator: 'anyof', values: a.id },
                        { name: 'poastext', operator: 'is', values: o.platformOrderId },
                        { name: 'custbody_swc_jj_id', operator: 'is', values: o.id },
                    ],
                }).run().each(function (rec) {
                    so_id = rec.id;
                });
                log.audit('so_id', so_id);

                if (so_id) {
                    ord = record.load({ type: 'salesorder', id: so_id, isDynamic: true });

                    ord.setValue({ fieldId: 'trandate', value: order_trandate });

                    for (var field_id in interface.fieldsMapping._LIST_ORDERS_MP_.mapping) {
                        if (o[interface.fieldsMapping._LIST_ORDERS_MP_.mapping[field_id]]) {
                            ord.setValue({ fieldId: field_id, value: o[interface.fieldsMapping._LIST_ORDERS_MP_.mapping[field_id]] })
                        }
                    }

                    //设置发运地址（收件人地址）
                    if (o.receiverAddressCountryCode.length == 2) {
                        var shippingSubRec = ord.getSubrecord({ fieldId: 'shippingaddress' });
                        shippingSubRec.setValue({ fieldId: 'country', value: o.receiverAddressCountryCode });// Country
                        shippingSubRec.setValue({ fieldId: 'state', value: o.receiverAddressArea });// State
                        shippingSubRec.setValue({ fieldId: 'city', value: o.receiverAddressCity });// City
                        shippingSubRec.setValue({ fieldId: 'zip', value: o.receiverAddressPostCode }); // Postal Code
                        shippingSubRec.setValue({ fieldId: 'addr1', value: o.receiverAddressDetail1 }); // Address Line 1
                        shippingSubRec.setValue({ fieldId: 'addr2', value: o.receiverAddressDetail2 }); // Address Line 1
                        shippingSubRec.setValue({ fieldId: 'addrphone', value: o.receiverPhone ? o.receiverPhone : o.receiverMobilePhone }); // Phone
                        if (o.receiverName) {
                            shippingSubRec.setValue({ fieldId: 'attention', value: o.receiverName });
                            shippingSubRec.setValue({ fieldId: 'addressee', value: o.receiverName });
                        }
                        ord.setValue({ fieldId: 'shipisresidential', value: false });
                    }

                    if (o.orderStatus == '4') {
                        ord.setValue({ fieldId: 'custbody_swc_platform_order_status', value: o.platformOrderStatus });
                        for (var i = 0; i < ord.getLineCount({ sublistId: 'item' }); i++) {
                            ord.selectLine({ sublistId: 'item', line: i })
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'isclosed', value: true, });
                            ord.commitLine({ sublistId: 'item' })
                        }
                    } else {
                        var line_items = o.itemVos;
                        if (!line_items) {
                            var line_items = o.items;
                        }
                        log.audit('line_items', line_items);

                        var LineCount = ord.getLineCount({ sublistId: 'item' });
                        line_items.map(function (line) {
                            log.debug('line', line)
                            var flag = true;
                            for (var i = 0; i < LineCount; i++) {
                                ord.selectLine({ sublistId: 'item', line: i })
                                var jj_line_id = ord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id' });
                                if (jj_line_id == line.id) {
                                    flag = false;
                                    ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: line.buyQuantity });
                                    for (let k = 0; k < price_tax.items.length; k++) {
                                        if (price_tax.items[k].lineNumber == jj_line_id) {
                                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: price_tax.items[k].unitPriceExclTax });
                                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxrate', value: price_tax.items[k].unitPriceExclTax });
                                        }
                                    }
                                    var class_id = interface.SearchClassID(line.sku);
                                    log.audit('class_id', class_id);
                                    if (class_id) {
                                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: class_id });
                                    }
                                    for (var field_id in interface.fieldsMapping._LIST_ORDER_ITEMS_MP_.mapping) {
                                        if (line[interface.fieldsMapping._LIST_ORDER_ITEMS_MP_.mapping[field_id]]) {
                                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: field_id, value: line[interface.fieldsMapping._LIST_ORDER_ITEMS_MP_.mapping[field_id]] });
                                        }
                                    }
                                    ord.commitLine({ sublistId: 'item' })
                                    break;
                                }
                                ord.commitLine({ sublistId: 'item' })
                            }
                            if (flag) {
                                if (!line.sku) {
                                    //测试中无itemId,给定一个值
                                    // line.itemId = 'zjg_test_001'
                                    throw '不存在货品，请联系管理员'
                                }
                                ord.selectNewLine({ sublistId: 'item' });
                                ord.setCurrentSublistText({ sublistId: 'item', fieldId: 'item', text: line.sku, });
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: line.buyQuantity });
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: '-1' });
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: line.productUnitPrice });
                                var class_id = interface.SearchClassID(line.sku);
                                log.audit('class_id', class_id);
                                if (class_id) {
                                    ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: class_id });
                                }
                                for (var field_id in interface.fieldsMapping._LIST_ORDER_ITEMS_MP_.mapping) {
                                    if (line[interface.fieldsMapping._LIST_ORDER_ITEMS_MP_.mapping[field_id]]) {
                                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: field_id, value: line[interface.fieldsMapping._LIST_ORDER_ITEMS_MP_.mapping[field_id]] });
                                    }
                                }
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id', value: line.id });
                                ord.commitLine({ sublistId: 'item' });
                            }
                        });
                    }
                    var soId = ord.save({ ignoreMandatoryFields: true });
                    log.audit('更新SO成功', soId);
                    return mark_resolved(obj.type, obj.id, soId)
                } else {
                    ord = record.create({ type: 'salesorder', isDynamic: true });
                    ord.setValue({ fieldId: 'entity', value: a.id });
                    ord.setValue({ fieldId: 'subsidiary', value: a.subsidiary });
                    ord.setValue({ fieldId: 'trandate', value: order_trandate });
                    ord.setValue({ fieldId: 'otherrefnum', value: o.platformOrderId });
                    ord.setValue({ fieldId: 'orderstatus', value: 'B' });

                    var currency_id;
                    if (o.currency) {
                        search.create({
                            type: 'currency',
                            filters: [
                                { name: 'symbol', operator: 'is', values: o.currency }
                            ]
                        }).run().each(function (e) {
                            currency_id = e.id
                            return true
                        })
                        if (!currency_id) {
                            throw '找不到货币，请维护货币：' + o.currency;
                        }
                    } else {
                        throw '订单报文无货币，暂不处理'
                    }
                    ord.setValue({ fieldId: 'currency', value: currency_id });


                    for (var field_id in interface.fieldsMapping._LIST_ORDERS_MP_.mapping) {
                        if (o[interface.fieldsMapping._LIST_ORDERS_MP_.mapping[field_id]]) {
                            ord.setValue({ fieldId: field_id, value: o[interface.fieldsMapping._LIST_ORDERS_MP_.mapping[field_id]] })
                        }
                    }
                    ord.setValue({ fieldId: 'custbody_swc_relation_jj_mporder_cache', value: obj.id });
                    ord.setValue({ fieldId: 'custbody_swc_jj_order', value: true });
                    ord.setValue({ fieldId: 'custbody_swc_jj_id', value: o.id });


                    //设置发运地址（收件人地址）
                    if (o.receiverAddressCountryCode.length == 2) {
                        var shippingSubRec = ord.getSubrecord({ fieldId: 'shippingaddress' });
                        shippingSubRec.setValue({ fieldId: 'country', value: o.receiverAddressCountryCode });// Country
                        shippingSubRec.setValue({ fieldId: 'state', value: o.receiverAddressArea });// State
                        shippingSubRec.setValue({ fieldId: 'city', value: o.receiverAddressCity });// City
                        shippingSubRec.setValue({ fieldId: 'zip', value: o.receiverAddressPostCode }); // Postal Code
                        shippingSubRec.setValue({ fieldId: 'addr1', value: o.receiverAddressDetail1 }); // Address Line 1
                        shippingSubRec.setValue({ fieldId: 'addr2', value: o.receiverAddressDetail2 }); // Address Line 1
                        shippingSubRec.setValue({ fieldId: 'addrphone', value: o.receiverPhone ? o.receiverPhone : o.receiverMobilePhone }); // Phone
                        if (o.receiverName) {
                            shippingSubRec.setValue({ fieldId: 'attention', value: o.receiverName });
                            shippingSubRec.setValue({ fieldId: 'addressee', value: o.receiverName });
                        }
                        ord.setValue({ fieldId: 'shipisresidential', value: false });
                    }

                    var line_items = o.itemVos;
                    if (!line_items) {
                        var line_items = o.items;
                    }
                    // var line_items = o.itemVos;
                    // var line_items = o.items;
                    log.audit('line_items', line_items);

                    line_items.map(function (line) {
                        log.debug('line', line)
                        if (line.buyQuantity == 0) {
                            return;
                        }
                        if (!line.sku) {
                            // 测试中无itemId,给定一个值
                            // line.itemId = 'zjg_test_001'
                            throw '不存在货品，请联系管理员'
                        }

                        ord.selectNewLine({ sublistId: 'item' });
                        ord.setCurrentSublistText({ sublistId: 'item', fieldId: 'item', text: line.sku });
                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: line.buyQuantity });
                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: '-1' });
                        // ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: line.productUnitPrice });
                        for (let k = 0; k < price_tax.items.length; k++) {
                            if (price_tax.items[k].lineNumber == line.id) {
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: price_tax.items[k].unitPriceExclTax });
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxrate', value: price_tax.items[k].unitPriceExclTax });
                            }
                        }

                        var class_id = interface.SearchClassID(line.sku);
                        log.audit('class_id', class_id);
                        if (class_id) {
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: class_id });
                        }
                        for (var field_id in interface.fieldsMapping._LIST_ORDER_ITEMS_MP_.mapping) {
                            if (line[interface.fieldsMapping._LIST_ORDER_ITEMS_MP_.mapping[field_id]]) {
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: field_id, value: line[interface.fieldsMapping._LIST_ORDER_ITEMS_MP_.mapping[field_id]] });
                            }
                        }
                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id', value: line.id });
                        ord.commitLine({ sublistId: 'item' });
                    });

                    var soId = ord.save({ ignoreMandatoryFields: true });
                    log.audit('生成SO成功', soId);
                    return mark_resolved(obj.type, obj.id, soId)
                }
            } catch (e) {
                log.error("map error", e);
                var rec = record.load({ type: obj.type, id: obj.id });
                rec.setValue({ fieldId: 'custrecord_swc_dpt_error', value: e.message ? e.message : e });
                rec.setValue({ fieldId: 'custrecord_swc_dpt_retry', value: Number(obj.retry) + 1 });
                rec.save({ ignoreMandatoryFields: true });
            }
        }

        function reduce(context) {

        }

        function summarize(summary) {

        }

        var mark_resolved = function (type, id, so_id, memo) {
            var rec = record.load({ type: type, id: id });
            rec.setValue({ fieldId: 'custrecord_swc_dpt_resolved', value: true });
            if (so_id) {
                rec.setValue({ fieldId: 'custrecord_swc_dpt_so', value: so_id });
            }
            if (memo) {
                rec.setValue({ fieldId: 'custrecord_swc_dpt_error', value: memo });
            } else {
                rec.setValue({ fieldId: 'custrecord_swc_dpt_error', value: '' });
                rec.setValue({ fieldId: 'custrecord_swc_dpt_retry', value: '0' });
            }
            rec.save({ ignoreMandatoryFields: true });
        }


        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });
