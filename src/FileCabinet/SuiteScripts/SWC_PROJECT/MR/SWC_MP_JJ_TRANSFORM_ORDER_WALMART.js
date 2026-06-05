/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_JJ_TRANSFORM_ORDER_WALMART.js
 *@description 积加-订单生成-Walmart
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {

        function getInputData() {
            var data = [];
            try {
                var request_acc = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_wmso_account' });
                var order_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_wmso_orderid' });
                var startdate = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_wmso_startdate' });
                var enddate = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_wmso_end_date' });
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
                        { name: 'custrecord_swc_wfs_resolved', operator: 'is', values: false },
                        { name: 'custrecord_swc_wfs_processed', operator: 'is', values: true },
                    ]
                    if (order_id) {
                        filters.push({ name: 'custrecord_swc_wfs_purchaseorderid', operator: 'is', values: order_id })
                    }
                    if (enddate && startdate) {
                        filters.push({ name: 'custrecordcustrecord_swc_wfs_ordersdate', operator: 'within', values: [startdate, enddate] })
                    }
                    if (enddate && !startdate) {
                        filters.push({ name: 'custrecordcustrecord_swc_wfs_ordersdate', operator: 'onorbefore', values: enddate })
                    }
                    if (!enddate && startdate) {
                        filters.push({ name: 'custrecordcustrecord_swc_wfs_ordersdate', operator: 'onorafter', values: startdate })
                    }

                    // 如果先了店铺，则只有等于选择的店铺时才查询，如果没有选择店铺，则都进行查询
                    if ((request_acc && account.id == request_acc) || !request_acc) {
                        filters.push({ name: 'custrecord_swc_wfs_shop', operator: 'anyof', values: account.id })
                        log.audit('查询缓存表', filters);
                        search.create({
                            type: 'customrecord_swc_walmart_order',
                            filters: filters,
                            columns: [
                                { name: 'custrecord_swc_wfs_retry', sort: 'ASC' },
                                { name: 'custrecordcustrecord_swc_wfs_ordersdate', sort: 'DESC' },
                                { name: 'custrecord_swc_wfs_maininfo' },
                                { name: 'custrecord_swc_wfs_js' },
                                { name: 'custrecordcustrecord_swc_wfs_ordersdate' },
                            ]
                        }).run().each(function (rec) {
                            data.push({
                                id: rec.id,
                                type: rec.recordType,
                                retry: rec.getValue({ name: 'custrecord_swc_wfs_retry', sort: 'ASC' }),
                                order: JSON.parse(rec.getValue('custrecord_swc_wfs_maininfo')),
                                price_tax: JSON.parse(rec.getValue('custrecord_swc_wfs_js')),
                                order_date: rec.getValue('custrecordcustrecord_swc_wfs_ordersdate'),
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
                var memo = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_wmso_memo' });
                var order_date = obj.order_date;
                var o = obj.order;
                var a = obj.account;
                var price_tax = obj.price_tax;
                log.audit('o', o);

                // var local_date_time = format.format({ value: moment.utc(o.orderDate).toDate(), type: format.Type.DATETIMETZ, timezone: a.store_time_zone });
                // var local_date_time = format.format({ value: moment.utc(o.orderDate).toDate(), type: format.Type.DATE });
                // var order_trandate = format.parse({ value: local_date_time, type: 'date' });
                var order_trandate = format.parse({ value: order_date, type: 'date' });
                log.audit('order_trandate', order_trandate);

                var so_id, ord, currency_text, currency_id;

                for (let i = 0; i < o.length; i++) {
                    if (!currency_text) {
                        currency_text = o[i].currencyCode;
                    }
                }
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

                search.create({
                    type: 'salesorder',
                    filters: [
                        { name: 'mainline', operator: 'is', values: true },
                        { name: 'name', operator: 'anyof', values: a.id },
                        { name: 'poastext', operator: 'is', values: o[0].purchaseOrderId },
                        // { name: 'custbody_swc_jj_id', operator: 'is', values: o.id },
                    ],
                }).run().each(function (rec) {
                    so_id = rec.id;
                });
                log.audit('so_id', so_id);

                if (so_id) {
                    ord = record.load({ type: 'salesorder', id: so_id, isDynamic: true });

                    ord.setValue({ fieldId: 'trandate', value: order_trandate });
                    if (memo) {
                        ord.setValue({ fieldId: 'memo', value: memo });
                    }

                    ord.setValue({ fieldId: 'custbody_swc_salesorder_state', value: o[0].shippingAddressState });

                    for (var field_id in interface.fieldsMapping._LIST_ORDERS_WM_.mapping) {
                        if (o[0][interface.fieldsMapping._LIST_ORDERS_WM_.mapping[field_id]]) {
                            ord.setValue({ fieldId: field_id, value: o[0][interface.fieldsMapping._LIST_ORDERS_WM_.mapping[field_id]] })
                        }
                    }



                    //设置发运地址（收件人地址）
                    if (o[0].country.length == 2) {
                        var shippingSubRec = ord.getSubrecord({ fieldId: 'shippingaddress' });
                        shippingSubRec.setValue({ fieldId: 'country', value: o[0].country });// Country
                        shippingSubRec.setValue({ fieldId: 'state', value: o[0].shippingAddressState });// State
                        shippingSubRec.setValue({ fieldId: 'city', value: o[0].shippingAddressCity });// City
                        shippingSubRec.setValue({ fieldId: 'zip', value: o[0].shippingAddressPostalCode }); // Postal Code
                        shippingSubRec.setValue({ fieldId: 'addr1', value: o[0].shippingAddressAddress1 }); // Address Line 1
                        shippingSubRec.setValue({ fieldId: 'addr2', value: o[0].shippingAddressAddress2 }); // Address Line 1
                        if (o[0].shippingAddressName) {
                            shippingSubRec.setValue({ fieldId: 'attention', value: o[0].shippingAddressName });
                            shippingSubRec.setValue({ fieldId: 'addressee', value: o[0].shippingAddressName });
                        }
                        shippingSubRec.setValue({ fieldId: 'override', value: false });
                        // ord.setValue({ fieldId: 'shipisresidential', value: false });
                    }

                    var LineCount = ord.getLineCount({ sublistId: 'item' });
                    log.debug('LineCount', LineCount)

                    for (let oi = 0; oi < o.length; oi++) {
                        if (o[oi].lineStatus == 'Cancelled') {
                            ord.setValue({ fieldId: 'custbody_swc_platform_order_status', value: o[oi].lineStatus });
                            for (let i = 0; i < LineCount; i++) {
                                ord.selectLine({ sublistId: 'item', line: i });
                                var jj_line_id = ord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id' });
                                if (jj_line_id == o[oi].lineNumber) {
                                    ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'isclosed', value: true, });
                                }
                                ord.commitLine({ sublistId: 'item' })
                            }
                        } else {

                            var flag = true;
                            for (let i = 0; i < LineCount; i++) {
                                ord.selectLine({ sublistId: 'item', line: i })
                                var jj_line_id = ord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id' });
                                if (jj_line_id == o[oi].lineNumber) {
                                    flag = false;
                                    ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: o[oi].orderLineQuantity });
                                    // ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: o[oi].chargeItemPrice });
                                    for (let k = 0; k < price_tax.items.length; k++) {
                                        if (price_tax.items[k].lineNumber == o[oi].lineNumber) {
                                            log.audit('items price', price_tax.items[k]);
                                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: price_tax.items[k].unitPriceExclTax });
                                            // var tax1amt = interface.accMul(price_tax.items[k].tax, o[oi].orderLineQuantity)
                                            var tax1amt = price_tax.items[k].tax;
                                            log.audit('tax1amt', tax1amt);
                                            // ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: '-7' });
                                            // ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'tax1amt', value: tax1amt });
                                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_taxamount', value: price_tax.items[k].tax });
                                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_taxam_all', value: tax1amt });
                                            if (runtime.accountId == '11297254' || runtime.accountId == '11297254_SB2') {
                                                //小鹿正式环境
                                                if (a.tax_mode == '1') {//自主纳税
                                                    ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'tax1amt', value: tax1amt });
                                                }
                                            }
                                            var tax_rate = interface.accDiv(tax1amt, interface.accMul(o[oi].orderLineQuantity, price_tax.items[k].unitPriceExclTax));
                                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_taxrate', value: tax_rate });
                                            break;
                                        }
                                    }
                                    var class_id = interface.SearchClassID(o[oi].sku);
                                    if (class_id) {
                                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: class_id });
                                    }
                                    for (var field_id in interface.fieldsMapping._LIST_ORDER_ITEMS_WM_.mapping) {
                                        if (o[oi][interface.fieldsMapping._LIST_ORDER_ITEMS_WM_.mapping[field_id]]) {
                                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: field_id, value: o[oi][interface.fieldsMapping._LIST_ORDER_ITEMS_WM_.mapping[field_id]] });
                                        }
                                    }
                                    ord.commitLine({ sublistId: 'item' })
                                    break;
                                }
                                ord.commitLine({ sublistId: 'item' })
                            }
                            if (flag) {
                                if (!o[oi].sku) {
                                    //测试中无itemId,给定一个值
                                    // line.itemId = 'zjg_test_001'
                                    throw '不存在货品，请联系管理员'
                                }
                                ord.selectNewLine({ sublistId: 'item' });
                                ord.setCurrentSublistText({ sublistId: 'item', fieldId: 'item', text: o[oi].sku });
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: o[oi].orderLineQuantity });
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: '-1' });
                                // ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: o[oi].chargeItemPrice });
                                for (let k = 0; k < price_tax.items.length; k++) {
                                    if (price_tax.items[k].lineNumber == o[oi].lineNumber) {
                                        log.audit('items price', price_tax.items[k]);
                                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: price_tax.items[k].unitPriceExclTax });
                                        // var tax1amt = interface.accMul(price_tax.items[k].tax, o[oi].orderLineQuantity)
                                        var tax1amt = price_tax.items[k].tax;
                                        log.audit('tax1amt', tax1amt);
                                        // ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: '-7' });
                                        // ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'tax1amt', value: tax1amt });
                                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_taxamount', value: price_tax.items[k].tax });
                                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_taxam_all', value: tax1amt });
                                        if (runtime.accountId == '11297254' || runtime.accountId == '11297254_SB2') {
                                            //小鹿正式环境
                                            if (a.tax_mode == '1') {//自主纳税
                                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'tax1amt', value: tax1amt });
                                            }
                                        }
                                        var tax_rate = interface.accDiv(tax1amt, interface.accMul(o[oi].orderLineQuantity, price_tax.items[k].unitPriceExclTax));
                                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_taxrate', value: tax_rate });
                                        break
                                    }
                                }
                                var class_id = interface.SearchClassID(o[oi].sku);
                                if (class_id) {
                                    ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: class_id });
                                }
                                for (var field_id in interface.fieldsMapping._LIST_ORDER_ITEMS_WM_.mapping) {
                                    if (o[oi][interface.fieldsMapping._LIST_ORDER_ITEMS_WM_.mapping[field_id]]) {
                                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: field_id, value: o[oi][interface.fieldsMapping._LIST_ORDER_ITEMS_WM_.mapping[field_id]] });
                                    }
                                }
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id', value: o[oi].lineNumber });
                                ord.commitLine({ sublistId: 'item' });
                            }
                        }
                    }

                    var soId = ord.save({ ignoreMandatoryFields: true });
                    log.audit('更新SO成功', soId);
                    return mark_resolved(obj.type, obj.id, soId);
                } else {
                    ord = record.create({ type: 'salesorder', isDynamic: true });
                    ord.setValue({ fieldId: 'entity', value: a.id });
                    ord.setValue({ fieldId: 'subsidiary', value: a.subsidiary });
                    ord.setValue({ fieldId: 'trandate', value: order_trandate });
                    ord.setValue({ fieldId: 'orderstatus', value: 'B' });
                    ord.setValue({ fieldId: 'currency', value: currency_id });
                    if (memo) {
                        ord.setValue({ fieldId: 'memo', value: memo });
                    }


                    //设置发运地址（收件人地址）
                    if (o[0].country.length == 2) {
                        var shippingSubRec = ord.getSubrecord({ fieldId: 'shippingaddress' });
                        shippingSubRec.setValue({ fieldId: 'country', value: o[0].country });// Country
                        shippingSubRec.setValue({ fieldId: 'state', value: o[0].shippingAddressState });// State
                        shippingSubRec.setValue({ fieldId: 'city', value: o[0].shippingAddressCity });// City
                        shippingSubRec.setValue({ fieldId: 'zip', value: o[0].shippingAddressPostalCode }); // Postal Code
                        shippingSubRec.setValue({ fieldId: 'addr1', value: o[0].shippingAddressAddress1 }); // Address Line 1
                        shippingSubRec.setValue({ fieldId: 'addr2', value: o[0].shippingAddressAddress2 }); // Address Line 1
                        if (o[0].shippingAddressName) {
                            shippingSubRec.setValue({ fieldId: 'attention', value: o[0].shippingAddressName });
                            shippingSubRec.setValue({ fieldId: 'addressee', value: o[0].shippingAddressName });
                        }
                        shippingSubRec.setValue({ fieldId: 'override', value: false });
                        // ord.setValue({ fieldId: 'shipisresidential', value: false });
                    }

                    ord.setValue({ fieldId: 'otherrefnum', value: o[0].purchaseOrderId });
                    for (var field_id in interface.fieldsMapping._LIST_ORDERS_WM_.mapping) {
                        if (o[0][interface.fieldsMapping._LIST_ORDERS_WM_.mapping[field_id]]) {
                            ord.setValue({ fieldId: field_id, value: o[0][interface.fieldsMapping._LIST_ORDERS_WM_.mapping[field_id]] })
                        }
                    }
                    ord.setValue({ fieldId: 'custbody_swc_salesorder_state', value: o[0].shippingAddressState });
                    ord.setValue({ fieldId: 'custbody_swc_relation_jj_wmorder_cache', value: obj.id });
                    ord.setValue({ fieldId: 'custbody_swc_jj_order', value: true });
                    // ord.setValue({ fieldId: 'custbody_swc_jj_id', value: o[0].id });

                    for (let oi = 0; oi < o.length; oi++) {
                        if (!o[oi].sku) {
                            // 测试中无itemId,给定一个值
                            // line.itemId = 'zjg_test_001'
                            throw '不存在货品，请联系管理员'
                        }

                        ord.selectNewLine({ sublistId: 'item' });
                        ord.setCurrentSublistText({ sublistId: 'item', fieldId: 'item', text: o[oi].sku });
                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: o[oi].orderLineQuantity });
                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: '-1' });
                        for (let k = 0; k < price_tax.items.length; k++) {
                            if (price_tax.items[k].lineNumber == o[oi].lineNumber) {
                                log.audit('items price', price_tax.items[k]);
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: price_tax.items[k].unitPriceExclTax });
                                // var tax1amt = interface.accMul(price_tax.items[k].tax, o[oi].orderLineQuantity)
                                var tax1amt = price_tax.items[k].tax;
                                log.audit('tax1amt', tax1amt);
                                // ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: '-7' });
                                // ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'tax1amt', value: tax1amt });
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_taxamount', value: price_tax.items[k].tax });
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_taxam_all', value: tax1amt });
                                if (runtime.accountId == '11297254' || runtime.accountId == '11297254_SB2') {
                                    //小鹿正式环境
                                    if (a.tax_mode == '1') {//自主纳税
                                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'tax1amt', value: tax1amt });
                                    }
                                }
                                var tax_rate = interface.accDiv(tax1amt, interface.accMul(o[oi].orderLineQuantity, price_tax.items[k].unitPriceExclTax));
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_taxrate', value: tax_rate });
                                break
                            }
                        }

                        var class_id = interface.SearchClassID(o[oi].sku);
                        if (class_id) {
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: class_id });
                        }
                        for (var field_id in interface.fieldsMapping._LIST_ORDER_ITEMS_WM_.mapping) {
                            if (o[oi][interface.fieldsMapping._LIST_ORDER_ITEMS_WM_.mapping[field_id]]) {
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: field_id, value: o[oi][interface.fieldsMapping._LIST_ORDER_ITEMS_WM_.mapping[field_id]] });
                            }
                        }
                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id', value: o[oi].lineNumber });
                        ord.commitLine({ sublistId: 'item' });

                    }

                    var soId = ord.save({ ignoreMandatoryFields: true });
                    log.audit('生成SO成功', soId);
                    return mark_resolved(obj.type, obj.id, soId);
                }
            } catch (e) {
                log.error("map error", e);
                var rec = record.load({ type: obj.type, id: obj.id });
                rec.setValue({ fieldId: 'custrecord_swc_wfs_error', value: e.message ? e.message : e });
                rec.setValue({ fieldId: 'custrecord_swc_wfs_retry', value: Number(obj.retry) + 1 });
                rec.save({ ignoreMandatoryFields: true });
            }
        }

        function reduce(context) {

        }

        function summarize(summary) {

        }

        var mark_resolved = function (type, id, so_id, memo) {
            var rec = record.load({ type: type, id: id });
            rec.setValue({ fieldId: 'custrecord_swc_wfs_resolved', value: true });
            if (so_id) {
                rec.setValue({ fieldId: 'custrecord_swc_wfs_so', value: so_id });
            }
            if (memo) {
                rec.setValue({ fieldId: 'custrecord_swc_wfs_error', value: memo });
            } else {
                rec.setValue({ fieldId: 'custrecord_swc_wfs_error', value: '' });
                rec.setValue({ fieldId: 'custrecord_swc_wfs_retry', value: '0' });
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
