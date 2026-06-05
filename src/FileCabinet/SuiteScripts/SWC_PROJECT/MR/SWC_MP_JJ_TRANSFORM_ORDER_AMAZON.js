/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_JJ_TRANSFORM_ORDER_AMAZON.js
 *@description 积加-订单生成-Amazon
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {

        function getInputData() {
            var data = [];
            try {
                var request_acc = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_azso_account' });
                var order_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_azso_orderid' });
                var startdate = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_azso_startdate' });
                var enddate = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_azso_end_date' });


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
                        { name: 'custrecord_swc_amz_resolved', operator: 'is', values: false },
                    ]
                    if (order_id) {
                        filters.push({ name: 'custrecord_swc_amz_orderid', operator: 'is', values: order_id })
                    }
                    if (enddate && startdate) {
                        filters.push({ name: 'custrecord_swc_amz_pdate', operator: 'within', values: [startdate, enddate] })
                    }
                    if (enddate && !startdate) {
                        filters.push({ name: 'custrecord_swc_amz_pdate', operator: 'onorbefore', values: enddate })
                    }
                    if (!enddate && startdate) {
                        filters.push({ name: 'custrecord_swc_amz_pdate', operator: 'onorafter', values: startdate })
                    }

                    // 如果先了店铺，则只有等于选择的店铺时才查询，如果没有选择店铺，则都进行查询
                    if ((request_acc && account.id == request_acc) || !request_acc) {
                        filters.push({ name: 'custrecord_swc_amz_store', operator: 'anyof', values: account.id })
                        log.audit('查询缓存表', filters);
                        search.create({
                            type: 'customrecord_swc_amz_order',
                            filters: filters,
                            columns: [
                                { name: 'custrecord_swc_amz_retry', sort: 'ASC' },
                                { name: 'custrecord_swc_amz_pdate', sort: 'DESC' },
                                { name: 'custrecord_swc_amz_maininfo' },
                            ]
                        }).run().each(function (rec) {
                            data.push({
                                id: rec.id,
                                type: rec.recordType,
                                retry: rec.getValue({ name: 'custrecord_swc_amz_retry', sort: 'ASC' }),
                                order: JSON.parse(rec.getValue('custrecord_swc_amz_maininfo')),
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
                var memo = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_azso_memo' });
                var fbm_no_deal = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_azso_fbm_no_deal' });
                var o = obj.order;
                var a = obj.account;
                log.audit('o', o);
                if (fbm_no_deal) {
                    if (o.fulfillment == 'MFN') {
                        var rec = record.load({ type: obj.type, id: obj.id });
                        rec.setValue({ fieldId: 'custrecord_swc_amz_retry', value: Number(obj.retry) + 1 });
                        rec.setValue({ fieldId: 'custrecord_swc_amz_error', value: 'FBM订单暂不处理' });
                        rec.save({ ignoreMandatoryFields: true });
                        return
                    }
                }

                var local_date_time = format.format({ value: moment.utc(o.purchaseDate).toDate(), type: format.Type.DATE });
                var order_trandate = format.parse({ value: local_date_time, type: 'date' });
                log.audit('order_trandate', order_trandate);

                var so_id, ord, currency_text;
                search.create({
                    type: 'salesorder',
                    filters: [
                        { name: 'mainline', operator: 'is', values: true },
                        { name: 'name', operator: 'anyof', values: a.id },
                        { name: 'poastext', operator: 'is', values: o.orderId },
                        { name: 'custbody_swc_jj_id', operator: 'is', values: o.id },
                    ],
                }).run().each(function (rec) {
                    so_id = rec.id;
                });
                log.audit('so_id', so_id);

                if (so_id) {
                    ord = record.load({ type: 'salesorder', id: so_id, isDynamic: true });

                    ord.setValue({ fieldId: 'trandate', value: order_trandate });
                    ord.setValue({ fieldId: 'custbody_swc_evaluation', value: o.evaluation });
                    if (memo) {
                        ord.setValue({ fieldId: 'memo', value: memo });
                    }

                    for (var field_id in interface.fieldsMapping._LIST_ORDERS_AZ_.mapping) {
                        if (o[interface.fieldsMapping._LIST_ORDERS_AZ_.mapping[field_id]]) {
                            ord.setValue({ fieldId: field_id, value: o[interface.fieldsMapping._LIST_ORDERS_AZ_.mapping[field_id]] })
                        }
                    }
                    if (o.fulfillment == 'MFN') {
                        ord.setValue({ fieldId: 'custbody_swc_salesorder_type', value: '1' });//自发货
                    } else {
                        ord.setValue({ fieldId: 'custbody_swc_salesorder_type', value: '2' });//平台发货
                    }

                    //设置发运地址（收件人地址）
                    if (o.addressCountrycode.length == 2) {
                        var shippingSubRec = ord.getSubrecord({ fieldId: 'shippingaddress' });
                        shippingSubRec.setValue({ fieldId: 'country', value: o.addressCountrycode });// Country
                        shippingSubRec.setValue({ fieldId: 'state', value: o.addressStateorregion });// State
                        shippingSubRec.setValue({ fieldId: 'city', value: o.addressCity });// City
                        shippingSubRec.setValue({ fieldId: 'zip', value: o.addressPostalcode }); // Postal Code
                        shippingSubRec.setValue({ fieldId: 'addr1', value: o.addressLine1 }); // Address Line 1
                        shippingSubRec.setValue({ fieldId: 'addr2', value: o.addressLine2 }); // Address Line 1
                        shippingSubRec.setValue({ fieldId: 'addrphone', value: o.addressPhone }); // Phone
                        if (o.addressName) {
                            shippingSubRec.setValue({ fieldId: 'attention', value: o.addressName });
                            shippingSubRec.setValue({ fieldId: 'addressee', value: o.addressName });
                        }
                        shippingSubRec.setValue({ fieldId: 'override', value: false });
                        // ord.setValue({ fieldId: 'shipisresidential', value: false });
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
                                    ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: line.quantityOrdered });
                                    if (o.fulfillment == 'MFN') {
                                        // FBM收入：
                                        // US: itemPrice + shippingPrice + giftWrapPrice
                                        // 非US：（itemPrice - itemTax）+（shippingPrice - shippingTax）+（giftWrapPrice - giftWrapTax）
                                        let line_amount = 0, line_rate = 0;
                                        if (a.acc_country == 'US') {
                                            line_amount = interface.accAdd(interface.accAdd(line.itemPrice || 0, line.shippingPrice || 0), line.giftWrapPrice || 0);
                                        } else {
                                            let line_ip = interface.accSub(line.itemPrice || 0, line.itemTax || 0) || 0;
                                            let line_sp = interface.accSub(line.shippingPrice || 0, line.shippingTax || 0) || 0;
                                            let line_gp = interface.accSub(line.giftWrapPrice || 0, line.giftWrapTax || 0) || 0;
                                            line_amount = interface.accAdd(interface.accAdd(line_ip, line_sp), line_gp);
                                        }
                                        line_rate = interface.accDiv(line_amount, line.quantityOrdered);
                                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: line_rate });
                                    } else {
                                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: line.sellingPrice });
                                    }
                                    // ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: interface.accDiv(line.itemPrice, line.quantityOrdered) });
                                    var class_id = interface.SearchClassID(line.sku);
                                    if (class_id) {
                                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: class_id });
                                    }
                                    for (var field_id in interface.fieldsMapping._LIST_ORDER_ITEMS_AZ_.mapping) {
                                        if (line[interface.fieldsMapping._LIST_ORDER_ITEMS_AZ_.mapping[field_id]]) {
                                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: field_id, value: line[interface.fieldsMapping._LIST_ORDER_ITEMS_AZ_.mapping[field_id]] });
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
                                ord.setCurrentSublistText({ sublistId: 'item', fieldId: 'item', text: line.sku });
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: line.quantityOrdered });
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: '-1' });
                                if (o.fulfillment == 'MFN') {
                                    // FBM收入：
                                    // US: itemPrice + shippingPrice + giftWrapPrice
                                    // 非US：（itemPrice - itemTax）+（shippingPrice - shippingTax）+（giftWrapPrice - giftWrapTax）
                                    let line_amount = 0, line_rate = 0;
                                    if (a.acc_country == 'US') {
                                        line_amount = interface.accAdd(interface.accAdd(line.itemPrice || 0, line.shippingPrice || 0), line.giftWrapPrice || 0);
                                    } else {
                                        let line_ip = interface.accSub(line.itemPrice || 0, line.itemTax || 0) || 0;
                                        let line_sp = interface.accSub(line.shippingPrice || 0, line.shippingTax || 0) || 0;
                                        let line_gp = interface.accSub(line.giftWrapPrice || 0, line.giftWrapTax || 0) || 0;
                                        line_amount = interface.accAdd(interface.accAdd(line_ip, line_sp), line_gp);
                                    }
                                    line_rate = interface.accDiv(line_amount, line.quantityOrdered);
                                    ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: line_rate });
                                } else {
                                    ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: line.sellingPrice });
                                }
                                // ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: interface.accDiv(line.itemPrice, line.quantityOrdered) });
                                var class_id = interface.SearchClassID(line.sku);
                                if (class_id) {
                                    ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: class_id });
                                }
                                for (var field_id in interface.fieldsMapping._LIST_ORDER_ITEMS_AZ_.mapping) {
                                    if (line[interface.fieldsMapping._LIST_ORDER_ITEMS_AZ_.mapping[field_id]]) {
                                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: field_id, value: line[interface.fieldsMapping._LIST_ORDER_ITEMS_AZ_.mapping[field_id]] });
                                    }
                                }
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id', value: line.id });
                                ord.commitLine({ sublistId: 'item' });
                            }
                        });
                    }
                    var soId = ord.save({ ignoreMandatoryFields: true });
                    log.audit('更新SO成功', soId);
                    return mark_resolved(obj.type, obj.id, soId);
                } else {
                    if (o.orderStatus == '4') {
                        var rec = record.load({ type: obj.type, id: obj.id });
                        rec.setValue({ fieldId: 'custrecord_swc_amz_resolved', value: true });
                        rec.setValue({ fieldId: 'custrecord_swc_amz_error', value: '订单状态已取消,不生成销售订单' });
                        rec.save({ ignoreMandatoryFields: true });
                        return
                    }
                    ord = record.create({ type: 'salesorder', isDynamic: true });
                    ord.setValue({ fieldId: 'entity', value: a.id });
                    ord.setValue({ fieldId: 'subsidiary', value: a.subsidiary });
                    ord.setValue({ fieldId: 'trandate', value: order_trandate });
                    ord.setValue({ fieldId: 'orderstatus', value: 'B' });
                    if (memo) {
                        ord.setValue({ fieldId: 'memo', value: memo });
                    }
                    var currency_id;
                    if (o.currencyCode) {
                        search.create({
                            type: 'currency',
                            filters: [
                                { name: 'symbol', operator: 'is', values: o.currencyCode }
                            ]
                        }).run().each(function (e) {
                            currency_id = e.id
                            return true
                        })
                        if (!currency_id) {
                            throw '找不到货币，请维护货币：' + o.currencyCode;
                        }
                    } else {
                        throw '订单报文无货币，暂不处理'
                    }
                    ord.setValue({ fieldId: 'currency', value: currency_id });

                    //设置发运地址（收件人地址）
                    if (o.addressCountrycode.length == 2) {
                        var shippingSubRec = ord.getSubrecord({ fieldId: 'shippingaddress' });
                        shippingSubRec.setValue({ fieldId: 'country', value: o.addressCountrycode });// Country
                        shippingSubRec.setValue({ fieldId: 'state', value: o.addressStateorregion });// State
                        shippingSubRec.setValue({ fieldId: 'city', value: o.addressCity });// City
                        shippingSubRec.setValue({ fieldId: 'zip', value: o.addressPostalcode }); // Postal Code
                        shippingSubRec.setValue({ fieldId: 'addr1', value: o.addressLine1 }); // Address Line 1
                        shippingSubRec.setValue({ fieldId: 'addr2', value: o.addressLine2 }); // Address Line 1
                        shippingSubRec.setValue({ fieldId: 'addrphone', value: o.addressPhone }); // Phone
                        if (o.addressName) {
                            shippingSubRec.setValue({ fieldId: 'attention', value: o.addressName });
                            shippingSubRec.setValue({ fieldId: 'addressee', value: o.addressName });
                        }
                        shippingSubRec.setValue({ fieldId: 'override', value: false });
                        // ord.setValue({ fieldId: 'shipisresidential', value: false });
                    }

                    ord.setValue({ fieldId: 'otherrefnum', value: o.orderId });
                    for (var field_id in interface.fieldsMapping._LIST_ORDERS_AZ_.mapping) {
                        if (o[interface.fieldsMapping._LIST_ORDERS_AZ_.mapping[field_id]]) {
                            ord.setValue({ fieldId: field_id, value: o[interface.fieldsMapping._LIST_ORDERS_AZ_.mapping[field_id]] })
                        }
                    }
                    if (o.fulfillment == 'MFN') {
                        ord.setValue({ fieldId: 'custbody_swc_salesorder_type', value: '1' });//自发货
                    } else {
                        ord.setValue({ fieldId: 'custbody_swc_salesorder_type', value: '2' });//平台发货
                    }
                    ord.setValue({ fieldId: 'custbody_swc_relation_jj_azorder_cache', value: obj.id });
                    ord.setValue({ fieldId: 'custbody_swc_jj_order', value: true });
                    ord.setValue({ fieldId: 'custbody_swc_jj_id', value: o.id });
                    ord.setValue({ fieldId: 'custbody_swc_evaluation', value: o.evaluation });

                    var line_items = o.itemVos;
                    log.audit('line_items', line_items);

                    line_items.map(function (line) {
                        log.debug('line', line)
                        if (line.quantityOrdered == 0) {
                            return;
                        }
                        if (!line.sku) {
                            // 测试中无itemId,给定一个值
                            // line.itemId = 'zjg_test_001'
                            throw '不存在货品，请联系管理员'
                        }

                        ord.selectNewLine({ sublistId: 'item' });
                        ord.setCurrentSublistText({ sublistId: 'item', fieldId: 'item', text: line.sku, });
                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: line.quantityOrdered });
                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: '-1' });
                        if (o.fulfillment == 'MFN') {
                            // FBM收入：
                            // US: itemPrice + shippingPrice + giftWrapPrice
                            // 非US：（itemPrice - itemTax）+（shippingPrice - shippingTax）+（giftWrapPrice - giftWrapTax）
                            let line_amount = 0, line_rate = 0;
                            if (a.acc_country == 'US') {
                                line_amount = interface.accAdd(interface.accAdd(line.itemPrice || 0, line.shippingPrice || 0), line.giftWrapPrice || 0);
                            } else {
                                let line_ip = interface.accSub(line.itemPrice || 0, line.itemTax || 0) || 0;
                                let line_sp = interface.accSub(line.shippingPrice || 0, line.shippingTax || 0) || 0;
                                let line_gp = interface.accSub(line.giftWrapPrice || 0, line.giftWrapTax || 0) || 0;
                                line_amount = interface.accAdd(interface.accAdd(line_ip, line_sp), line_gp);
                            }
                            line_rate = interface.accDiv(line_amount, line.quantityOrdered);
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: line_rate });
                        } else {
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: line.sellingPrice });
                        }
                        // ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: interface.accDiv(line.itemPrice, line.quantityOrdered) });
                        var class_id = interface.SearchClassID(line.sku);
                        if (class_id) {
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: class_id });
                        }
                        for (var field_id in interface.fieldsMapping._LIST_ORDER_ITEMS_AZ_.mapping) {
                            if (line[interface.fieldsMapping._LIST_ORDER_ITEMS_AZ_.mapping[field_id]]) {
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: field_id, value: line[interface.fieldsMapping._LIST_ORDER_ITEMS_AZ_.mapping[field_id]] });
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
                rec.setValue({ fieldId: 'custrecord_swc_amz_error', value: e.message ? e.message : e });
                rec.setValue({ fieldId: 'custrecord_swc_amz_retry', value: Number(obj.retry) + 1 });
                rec.save({ ignoreMandatoryFields: true });
            }
        }

        function reduce(context) {

        }

        function summarize(summary) {

        }

        var mark_resolved = function (type, id, so_id, memo) {
            var rec = record.load({ type: type, id: id });
            rec.setValue({ fieldId: 'custrecord_swc_amz_resolved', value: true });
            if (so_id) {
                rec.setValue({ fieldId: 'custrecord_swc_amz_so', value: so_id });
            }
            if (memo) {
                rec.setValue({ fieldId: 'custrecord_swc_amz_error', value: memo });
            } else {
                rec.setValue({ fieldId: 'custrecord_swc_amz_error', value: '' });
                rec.setValue({ fieldId: 'custrecord_swc_amz_retry', value: '0' });
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
