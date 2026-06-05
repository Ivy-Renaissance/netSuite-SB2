/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_JJ_TRANSFORM_ORDER_AFTERSALES.js
 *@description 积加-订单生成-售后订单
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {

        function getInputData() {
            var data = [];
            try {
                var request_acc = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_asso_account' });
                var order_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_asso_orderid' });
                var as_order_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_asso_as_orderid' });
                var startdate = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_asso_startdate' });
                var enddate = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_to_asso_end_date' });


                if (startdate) {
                    startdate = format.format({ value: startdate, type: 'date' })
                }
                if (enddate) {
                    enddate = format.format({ value: enddate, type: 'date' })
                }
                var limit = 200;
                var filters = [
                    { name: 'custrecord_swc_aso_resolved', operator: 'is', values: false },
                    { name: 'custrecord_swc_aso_postsalesstate', operator: 'is', values: 'COMPLETED' },
                ]
                if (order_id) {
                    filters.push({ name: 'custrecord_swc_aso_orderid', operator: 'is', values: order_id })
                }
                if (as_order_id) {
                    filters.push({ name: 'custrecord_swc_aso_postsalesnumber', operator: 'is', values: as_order_id })
                }
                if (enddate && startdate) {
                    filters.push({ name: 'custrecord_swc_aso_create_date', operator: 'within', values: [startdate, enddate] })
                }
                if (enddate && !startdate) {
                    filters.push({ name: 'custrecord_swc_aso_create_date', operator: 'onorbefore', values: enddate })
                }
                if (!enddate && startdate) {
                    filters.push({ name: 'custrecord_swc_aso_create_date', operator: 'onorafter', values: startdate })
                }
                if (request_acc) {
                    filters.push({ name: 'custrecord_swc_aso_store_id', operator: 'anyof', values: request_acc })
                }
                log.audit('查询缓存表', filters);
                search.create({
                    type: 'customrecord_swc_after_sales_order',
                    filters: filters,
                    columns: [
                        { name: 'custrecord_swc_aso_retry', sort: 'ASC' },
                        { name: 'custrecord_swc_aso_create_date', sort: 'DESC' },
                        { name: 'custrecord_swc_aso_store_id' },
                        { name: 'custrecord_swc_aso_body' },
                        { name: 'custentity_swc_platform', join: 'custrecord_swc_aso_store_id' },
                    ]
                }).run().each(function (rec) {
                    data.push({
                        id: rec.id,
                        type: rec.recordType,
                        retry: rec.getValue({ name: 'custrecord_swc_aso_retry', sort: 'ASC' }),
                        order: JSON.parse(rec.getValue('custrecord_swc_aso_body')),
                        acc_id: rec.getValue('custrecord_swc_aso_store_id'),
                        acc_platform: rec.getValue({ name: 'custentity_swc_platform', join: 'custrecord_swc_aso_store_id' }),
                    });
                    return --limit > 0
                })

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
                log.audit('o', o);

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

                if (obj.acc_id) {
                    var a = interface.GetAccountInfo(obj.acc_id);
                    // if (obj.acc_platform == '9') {
                    //     var real_acc_id = '';
                    //     search.create({
                    //         type: 'customrecord_swc_shopify_pd',
                    //         filters: [
                    //             { name: 'custrecord_swc_jj_pd', operator: 'anyof', values: obj.acc_id },
                    //             { name: 'custrecord_swc_jj_currency', operator: 'anyof', values: currency_id },
                    //         ],
                    //         columns: [
                    //             { name: 'custrecord_swc_ns_pd' }
                    //         ]
                    //     }).run().each(function (rec) {
                    //         real_acc_id = rec.getValue('custrecord_swc_ns_pd');
                    //     });
                    //     log.audit('real_acc_id', real_acc_id);

                    //     if (real_acc_id) {
                    //         var a = interface.GetAccountInfo(real_acc_id);
                    //         log.audit('a', a);
                    //         if (!a.id) {
                    //             throw 'Shopify客户信息未找到'
                    //         }
                    //     } else {
                    //         throw 'Shopify依据币种转换店铺 未匹配到,请维护数据'
                    //     }
                    // } else {
                    //     var a = interface.GetAccountInfo(obj.acc_id);
                    // }
                } else {
                    throw '无店铺信息，暂不处理';
                }



                var local_date_time = format.format({ value: moment.utc(o.createTime).toDate(), type: format.Type.DATE });
                var order_trandate = format.parse({ value: local_date_time, type: 'date' });
                log.audit('order_trandate', order_trandate);

                var so_id, ord, currency_text;
                search.create({
                    type: 'salesorder',
                    filters: [
                        { name: 'mainline', operator: 'is', values: true },
                        { name: 'name', operator: 'anyof', values: a.id },
                        { name: 'poastext', operator: 'is', values: o.postSalesNumber },
                        { name: 'custbody_swc_jj_id', operator: 'is', values: o.id },
                    ],
                }).run().each(function (rec) {
                    so_id = rec.id;
                });
                log.audit('so_id', so_id);

                if (so_id) {
                    ord = record.load({ type: 'salesorder', id: so_id, isDynamic: true });

                    ord.setValue({ fieldId: 'trandate', value: order_trandate });

                    // for (var field_id in interface.fieldsMapping._LIST_ORDERS_AS_.mapping) {
                    //     if (o[interface.fieldsMapping._LIST_ORDERS_AS_.mapping[field_id]]) {
                    //         ord.setValue({ fieldId: field_id, value: o[interface.fieldsMapping._LIST_ORDERS_AS_.mapping[field_id]] })
                    //     }
                    // }

                    //设置发运地址（收件人地址）
                    if (o.countryCode.length == 2) {
                        var shippingSubRec = ord.getSubrecord({ fieldId: 'shippingaddress' });
                        shippingSubRec.setValue({ fieldId: 'country', value: o.countryCode });// Country
                        shippingSubRec.setValue({ fieldId: 'state', value: o.provinceCode });// State
                        shippingSubRec.setValue({ fieldId: 'city', value: o.city });// City
                        shippingSubRec.setValue({ fieldId: 'zip', value: o.postcode }); // Postal Code
                        shippingSubRec.setValue({ fieldId: 'addr1', value: o.address }); // Address Line 1
                        shippingSubRec.setValue({ fieldId: 'addrphone', value: o.phone }); // Phone
                        if (o.senderReceiver) {
                            shippingSubRec.setValue({ fieldId: 'attention', value: o.senderReceiver });
                            shippingSubRec.setValue({ fieldId: 'addressee', value: o.senderReceiver });
                        }
                        shippingSubRec.setValue({ fieldId: 'override', value: false });
                        // ord.setValue({ fieldId: 'shipisresidential', value: false });
                    }

                    ord.setValue({ fieldId: 'custbody_swc_salesorder_type', value: '3' });//售后
                    ord.setValue({ fieldId: 'custbody_swc_salesorder_state', value: o.provinceCode });
                    ord.setValue({ fieldId: 'custbody_swc_platform_order_number', value: o.soSourceOrderCode });
                    var line_items = o.businessItemList;
                    log.audit('line_items', line_items);

                    var LineCount = ord.getLineCount({ sublistId: 'item' });
                    line_items.map(function (line) {
                        log.debug('line', line)
                        var flag = true;
                        for (var i = 0; i < LineCount; i++) {
                            ord.selectLine({ sublistId: 'item', line: i })
                            var sku_name = ord.getCurrentSublistText({ sublistId: 'item', fieldId: 'item' });
                            if (sku_name == line.sku) {
                                flag = false;
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: line.postSalesQuantity });
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
                                var class_id = interface.SearchClassID(line.sku);
                                if (class_id) {
                                    ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: class_id });
                                }
                                ord.commitLine({ sublistId: 'item' })
                                break;
                            }
                            ord.commitLine({ sublistId: 'item' })
                        }
                        if (flag) {
                            if (!line.sku) {
                                throw '不存在货品，请联系管理员'
                            }
                            ord.selectNewLine({ sublistId: 'item' });
                            ord.setCurrentSublistText({ sublistId: 'item', fieldId: 'item', text: line.sku });
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: line.postSalesQuantity });
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: '-1' });
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
                            var class_id = interface.SearchClassID(line.sku);
                            if (class_id) {
                                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: class_id });
                            }
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_jj_line_id', value: line.id });
                            ord.commitLine({ sublistId: 'item' });
                        }
                    });
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

                    //设置发运地址（收件人地址）
                    if (o.countryCode.length == 2) {
                        var shippingSubRec = ord.getSubrecord({ fieldId: 'shippingaddress' });
                        shippingSubRec.setValue({ fieldId: 'country', value: o.countryCode });// Country
                        shippingSubRec.setValue({ fieldId: 'state', value: o.provinceCode });// State
                        shippingSubRec.setValue({ fieldId: 'city', value: o.city });// City
                        shippingSubRec.setValue({ fieldId: 'zip', value: o.postcode }); // Postal Code
                        shippingSubRec.setValue({ fieldId: 'addr1', value: o.address }); // Address Line 1
                        shippingSubRec.setValue({ fieldId: 'addrphone', value: o.phone }); // Phone
                        if (o.senderReceiver) {
                            shippingSubRec.setValue({ fieldId: 'attention', value: o.senderReceiver });
                            shippingSubRec.setValue({ fieldId: 'addressee', value: o.senderReceiver });
                        }
                        shippingSubRec.setValue({ fieldId: 'override', value: false });
                        // ord.setValue({ fieldId: 'shipisresidential', value: false });
                    }

                    ord.setValue({ fieldId: 'otherrefnum', value: o.postSalesNumber });
                    // for (var field_id in interface.fieldsMapping._LIST_ORDERS_AS_.mapping) {
                    //     if (o[interface.fieldsMapping._LIST_ORDERS_AS_.mapping[field_id]]) {
                    //         ord.setValue({ fieldId: field_id, value: o[interface.fieldsMapping._LIST_ORDERS_AS_.mapping[field_id]] })
                    //     }
                    // }
                    ord.setValue({ fieldId: 'custbody_swc_salesorder_state', value: o.provinceCode });
                    ord.setValue({ fieldId: 'custbody_swc_salesorder_type', value: '3' });//售后
                    ord.setValue({ fieldId: 'custbody_swc_relation_jj_asorder_cache', value: obj.id });
                    ord.setValue({ fieldId: 'custbody_swc_platform_order_number', value: o.soSourceOrderCode });
                    ord.setValue({ fieldId: 'custbody_swc_jj_order', value: true });
                    ord.setValue({ fieldId: 'custbody_swc_jj_id', value: o.id });

                    var line_items = o.businessItemList;
                    log.audit('line_items', line_items);

                    line_items.map(function (line) {
                        log.debug('line', line)
                        if (line.postSalesQuantity == 0) {
                            return;
                        }
                        if (!line.sku) {
                            throw '不存在货品，请联系管理员'
                        }

                        ord.selectNewLine({ sublistId: 'item' });
                        ord.setCurrentSublistText({ sublistId: 'item', fieldId: 'item', text: line.sku, });
                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: line.postSalesQuantity });
                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: '-1' });
                        ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
                        var class_id = interface.SearchClassID(line.sku);
                        if (class_id) {
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: class_id });
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
                rec.setValue({ fieldId: 'custrecord_swc_aso_error', value: e.message ? e.message : e });
                rec.setValue({ fieldId: 'custrecord_swc_aso_retry', value: Number(obj.retry) + 1 });
                rec.save({ ignoreMandatoryFields: true });
            }
        }

        function reduce(context) {

        }

        function summarize(summary) {

        }

        var mark_resolved = function (type, id, so_id, memo) {
            var rec = record.load({ type: type, id: id });
            rec.setValue({ fieldId: 'custrecord_swc_aso_resolved', value: true });
            if (so_id) {
                rec.setValue({ fieldId: 'custrecord_swc_aso_relation_so', value: so_id });
            }
            if (memo) {
                rec.setValue({ fieldId: 'custrecord_swc_aso_error', value: memo });
            } else {
                rec.setValue({ fieldId: 'custrecord_swc_aso_error', value: '' });
                rec.setValue({ fieldId: 'custrecord_swc_aso_retry', value: '0' });
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
