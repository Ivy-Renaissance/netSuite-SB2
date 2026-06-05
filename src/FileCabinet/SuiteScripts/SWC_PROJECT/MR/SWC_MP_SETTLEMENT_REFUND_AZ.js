/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_SETTLEMENT_REFUND_AZ.js
 *@description 亚马逊结算报告退款
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', 'N/config', '../common/interface', '../common/moment', 'N/error'],
    function (format, runtime, search, record, error, config, interface, moment, error) {

        var settlement_refund_record_type = 'customrecord_swc_amazon_v2';
        function getInputData() {
            var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_az_refund_account' });
            var marketid = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_az_refund_marketid' });
            var orderid = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_az_refund_order_id' });
            var startdate = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_az_refund_startdate' });
            var enddate = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_az_refund_enddate' });
            var settlement_id = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_az_refund_settlementid' });
            if (startdate) {
                startdate = format.format({ value: startdate, type: 'date' })
            }
            if (enddate) {
                enddate = format.format({ value: enddate, type: 'date' })
            }
            var orders = [];
            var limit = 399;
            var filters = [
                { name: 'isinactive', operator: 'is', values: false },
                { name: 'custrecord_swc_amzv2_credit_resolved', operator: 'is', values: false },
                { name: 'custrecord_swc_amzv2_transactiontype', operator: 'is', values: 'Refund' },
                { name: 'custrecord_swc_amzv2_creat_date', operator: 'before', values: 'twodaysago' },
                { name: 'created', operator: 'before', values: 'twodaysago' },
            ]
            if (orderid) {
                filters.push({ name: 'custrecord_swc_amzv2_orderid', operator: 'is', values: orderid })
            };
            if (marketid) {
                filters.push({ name: 'custrecord_swc_amzv2_marketid', operator: 'is', values: marketid })
            };
            // if (acc) {
            //     filters.push({ name: 'custrecord_dps_sett_account', operator: 'anyof', values: acc })
            // };
            if (enddate && startdate) {
                filters.push({ name: 'custrecord_swc_amzv2_creat_date', operator: 'within', values: [startdate, enddate] })
            }
            if (enddate && !startdate) {
                filters.push({ name: 'custrecord_swc_amzv2_creat_date', operator: 'onorbefore', values: enddate })
            }
            if (!enddate && startdate) {
                filters.push({ name: 'custrecord_swc_amzv2_creat_date', operator: 'onorafter', values: startdate })
            }
            if (settlement_id) {
                filters.push({ name: 'custrecord_swc_amzv2_settlementid', operator: 'is', values: settlement_id })
            }
            log.audit('getInputData filters', filters);
            search.create({
                type: settlement_refund_record_type,
                filters: filters,
                columns: [
                    { name: 'custrecord_swc_amzv2_marketid', summary: 'GROUP' },
                    { name: 'custrecord_swc_amzv2_settlementid', summary: 'GROUP' },
                    { name: 'custrecord_swc_amzv2_orderid', summary: 'GROUP' },
                    { name: 'custrecord_swc_amzv2_currency', summary: 'GROUP' },
                    { name: 'custrecord_swc_amzv2_retry', summary: 'SUM', sort: 'ASC' },
                    { name: 'custrecord_swc_amzv2_creat_date', summary: 'GROUP' },
                ]
            }).run().each(function (rec) {
                orders.push({
                    marketid: rec.getValue(rec.columns[0]),
                    settlement_id: rec.getValue(rec.columns[1]),
                    order_id: rec.getValue(rec.columns[2]),
                    sett_currency: rec.getValue(rec.columns[3]),
                    retry: rec.getValue(rec.columns[4]),
                    creat_date: rec.getValue(rec.columns[5]),
                })
                return --limit > 0
            })

            log.audit('获取数量 orders', orders.length)
            return orders;
        }

        function map(context) {
            var startTime = new Date().getTime();
            log.emergency('map 开始', startTime);
            var v = JSON.parse(context.value);
            log.audit('v', v)
            var settlement_id = v.settlement_id;
            var order_id = v.order_id;
            var sett_currency = v.sett_currency;

            var sett_refund_currency = sett_currency;
            var sett_refund_order_id = order_id;
            var sett_refund_settlement_id = settlement_id;
            var sett_refund_quantity = 1;

            var refund_date = v.creat_date;
            try {

                if (refund_date == '- None -') {
                    throw '无计费日期';
                }

                var sett_refund_acc = interface.GetAccountInfo('', v.marketid);

                var feeAccount = [];
                search.create({
                    type: 'customrecord_swc_az_settlement_account',
                    filters: [
                        { name: 'custrecord_swc_az_sa_jour_type', operator: 'is', values: '退款' }
                    ],
                    columns: [
                        { name: 'custrecord_swc_az_sa_transaction_type' },
                        { name: 'custrecord_swc_az_sa_amount_type' },
                        { name: 'custrecord_swc_az_sa_amount_description' },
                        { name: 'custrecord_swc_az_sa_account' },
                        { name: 'custrecord_swc_az_sa_jour_type' },
                    ]
                }).run().each(function (rec) {
                    feeAccount.push({
                        transactionType: rec.getValue(rec.columns[0]),
                        amountType: rec.getValue(rec.columns[1]),
                        amountDescription: rec.getValue(rec.columns[2]),
                        accountId: rec.getValue(rec.columns[3]),
                        jourType: rec.getValue(rec.columns[4]),
                    });
                    return true;
                });
                log.audit('feeAccount', feeAccount);


                var filters = [
                    ['isinactive', 'is', false], 'and',
                    ['custrecord_swc_amzv2_credit_resolved', 'is', false], 'and',
                    ['custrecord_swc_amzv2_settlementid', 'is', settlement_id], 'and',
                    ['custrecord_swc_amzv2_creat_date', 'on', refund_date], 'and',
                    ['custrecord_swc_amzv2_orderid', 'is', order_id]
                ]
                var sett_ids = [], sku_info_fee = [], mskus = [];
                search.create({
                    type: settlement_refund_record_type,
                    filters: filters,
                    columns: [
                        { name: 'custrecord_swc_amzv2_transactiontype' },
                        { name: 'custrecord_swc_amzv2_amounttype' },
                        { name: 'custrecord_swc_amzv2_amountdescription' },
                        { name: 'custrecord_swc_amzv2_orderid' },
                        { name: 'custrecord_swc_amzv2_sku' },
                        { name: 'custrecord_swc_amzv2_amount' },
                        { name: 'custrecord_swc_amzv2_creat_date' },
                        { name: 'custrecord_swc_amzv2_msku' },
                    ]
                }).run().each(function (rec) {
                    sett_ids.push(rec.id);
                    var sku = rec.getValue('custrecord_swc_amzv2_sku');
                    var msku = rec.getValue('custrecord_swc_amzv2_msku');
                    if (!sku) {
                        mskus.push(msku);
                    }
                    // if (!refund_date) {
                    //     refund_date = rec.getValue('custrecord_swc_amzv2_creat_date');
                    // }
                    var transactiontype = rec.getValue('custrecord_swc_amzv2_transactiontype');
                    var amounttype = rec.getValue('custrecord_swc_amzv2_amounttype');
                    var amountdescription = rec.getValue('custrecord_swc_amzv2_amountdescription');
                    var amount = 0;
                    for (let i = 0; i < feeAccount.length; i++) {
                        if (transactiontype == feeAccount[i].transactionType && amounttype == feeAccount[i].amountType && amountdescription == feeAccount[i].amountDescription) {
                            amount = rec.getValue('custrecord_swc_amzv2_amount').replace(/,/, '.');
                        }
                    }


                    if (sku_info_fee.length) {
                        var falg = true;
                        for (let i = 0; i < sku_info_fee.length; i++) {
                            if (sku_info_fee[i].sku_text == sku) {
                                sku_info_fee[i].amount = interface.accAdd(sku_info_fee[i].amount, amount);
                                falg = false;
                                break
                            }
                        }
                        if (falg) {
                            sku_info_fee.push({
                                sku_text: sku,
                                amount: amount,
                                msku: msku,
                            });
                        }
                    } else {
                        sku_info_fee.push({
                            sku_text: sku,
                            amount: amount,
                            msku: msku,
                        });
                    }
                    return true
                });

                if (!sett_refund_acc.jsbg_credit) {
                    for (let i = 0; i < sett_ids.length; i++) {
                        context.write({
                            key: sett_refund_settlement_id + '.' + sett_refund_order_id + '.' + sett_ids[i],
                            value: {
                                'id': sett_ids[i],
                                'type': 'not_credit',
                            }
                        });
                    }
                    return
                }

                if (sku_info_fee.length == 0) {
                    for (let i = 0; i < sett_ids.length; i++) {
                        context.write({
                            key: sett_refund_settlement_id + '.' + sett_refund_order_id + '.' + sett_ids[i],
                            value: {
                                'id': sett_ids[i],
                                'type': 'no_refund',
                            }
                        });
                    }
                    return
                }

                sku_info_fee = sku_info_fee.filter(item => Number(item.amount) <= 0);
                log.audit('排除总金额大于0', sku_info_fee);

                if (sku_info_fee.length == 0) {
                    for (let i = 0; i < sett_ids.length; i++) {
                        context.write({
                            key: sett_refund_settlement_id + '.' + sett_refund_order_id + '.' + sett_ids[i],
                            value: {
                                'id': sett_ids[i],
                                'type': 'no_refund',
                            }
                        });
                    }
                    return
                }

                if (mskus.length) {
                    //没sku情况下,根据msku查询Amazon sku关系表;
                    SearchSKU(mskus, sku_info_fee, sett_refund_acc.id);
                    log.audit('mskus', mskus);
                    for (let i = 0; i < sku_info_fee.length; i++) {
                        if (sku_info_fee[i].msku) {
                            if (!sku_info_fee[i].sku_text) {
                                throw 'SKU找不到:' + sku_info_fee[i].msku + ',店铺名称:' + sett_refund_acc.entityid;
                            }
                        } else {
                            throw '无MSKU';
                            // sku_info_fee[i].skuid = '4375';//测试环境固定值
                            // sku_info_fee[i].sku_text = '110000009';//测试环境固定值
                        }
                    }
                }


                var currency_id = ''
                if (sett_refund_currency != '- None -') {
                    search.create({
                        type: 'currency',
                        filters: [
                            { name: 'symbol', operator: 'is', values: sett_refund_currency }
                        ]
                    }).run().each(function (e) {
                        currency_id = e.id
                        return true
                    })
                    if (!currency_id) {
                        throw '货币代码找不到对应货币,请维护对应货币：' + sett_refund_currency;
                    }
                } else {
                    throw '无货币，暂时没处理逻辑' + sett_refund_currency;
                    currency_id = sett_refund_acc.info.currency;
                }




                //生成退货授权+贷项通知单
                var rt_id = SearchReturnAuthorization(sett_refund_settlement_id, sett_refund_order_id, sett_refund_acc);
                if (rt_id) {
                    log.audit('rt_id', rt_id);
                    var cm_id;
                    search.create({
                        type: 'creditmemo',
                        filters: [
                            { name: 'mainline', operator: 'is', values: true },
                            { name: 'createdfrom', operator: 'anyof', values: rt_id },
                        ],
                    }).run().each(function (rec) {
                        cm_id = rec.id;
                    });

                    for (let i = 0; i < sett_ids.length; i++) {
                        context.write({
                            key: sett_refund_settlement_id + '.' + sett_refund_order_id + '.' + sett_ids[i],
                            value: {
                                'id': sett_ids[i],
                                'settlement_id': sett_refund_settlement_id,
                                'cm_id': cm_id,
                                'rt_id': rt_id,
                                'type': 'refund',
                            }
                        });
                    }
                } else {
                    rt_id = CreateReturnAuthorization(sett_refund_acc, sett_ids, sett_refund_settlement_id, sett_refund_order_id, refund_date, sku_info_fee, sett_refund_quantity, currency_id)
                    log.audit('rt_id', rt_id);
                    cm_id = CreateCreditMemo(rt_id, refund_date);
                    log.audit('cm_id', cm_id);

                    var ra_rec = record.load({ type: record.Type.RETURN_AUTHORIZATION, id: rt_id })
                    var LineCount = ra_rec.getLineCount({ sublistId: 'item' })
                    for (let i = 0; i < LineCount; i++) {
                        ra_rec.setSublistValue({ sublistId: 'item', fieldId: 'isclosed', line: i, value: true })
                    }
                    ra_rec.save({ ignoreMandatoryFields: true });

                    for (let i = 0; i < sett_ids.length; i++) {
                        context.write({
                            key: sett_refund_settlement_id + '.' + sett_refund_order_id + '.' + sett_ids[i],
                            value: {
                                'id': sett_ids[i],
                                'settlement_id': sett_refund_settlement_id,
                                'cm_id': cm_id,
                                'rt_id': rt_id,
                                'type': 'refund',
                            }
                        });
                    }
                }

            } catch (err) {
                log.error('map error', err);
                if (sett_ids.length > 0) {
                    var e = err.message ? err.message : err;
                    for (var i = 0; i < sett_ids.length; i++) {
                        context.write({
                            key: sett_refund_settlement_id + '.' + sett_refund_order_id + '.' + sett_ids[i],
                            value: {
                                'id': sett_ids[i],
                                'settlement_id': sett_refund_settlement_id,
                                'type': 'map_error',
                                'msg': e,
                            }
                        });
                    }
                }
            }

        }
        function reduce(context) {
            log.audit('reduce key', context.key);
            var v = context.values
            v.map(function (obj) {
                try {
                    obj = JSON.parse(obj);
                    log.debug('obj', obj);
                    var rec = record.load({ type: settlement_refund_record_type, id: obj.id });
                    var retry = rec.getValue('custrecord_swc_amzv2_retry');
                    if (Number(retry) > 100) {
                        retry = 1;
                    }
                    if (obj.type == 'refund') {
                        rec.setValue({ fieldId: 'custrecord_swc_amzv2_credit_resolved', value: true });
                        rec.setValue({ fieldId: 'custrecord_swc_amzv2_relation_credit', value: obj.cm_id });
                        rec.setValue({ fieldId: 'custrecord_swc_amzv2_relation_ra', value: obj.rt_id });
                        rec.setValue({ fieldId: 'custrecord_swc_amzv2_retry', value: 0 });
                        rec.setValue({ fieldId: 'custrecord_swc_amzv2_error', value: '' });
                    }
                    else if (obj.type == 'map_error') {
                        rec.setValue({ fieldId: 'custrecord_swc_amzv2_error', value: obj.msg });
                        rec.setValue({ fieldId: 'custrecord_swc_amzv2_retry', value: Number(retry) + 1 });
                    }
                    else if (obj.type == 'not_credit') {
                        rec.setValue({ fieldId: 'custrecord_swc_amzv2_credit_resolved', value: true });
                        rec.setValue({ fieldId: 'custrecord_swc_amzv2_retry', value: 0 });
                        rec.setValue({ fieldId: 'custrecord_swc_amzv2_error', value: '' });
                    }

                    var st_id = rec.save({ ignoreMandatoryFields: true });
                    log.audit('st_id', st_id);
                } catch (error) {
                    log.error('reduce error', error);
                }

            });
        }

        function summarize(summary) {

        }

        function SearchReturnAuthorization(sett_refund_settlement_id, sett_refund_order_id, acc_info) {
            log.debug('SearchReturnAuthorization', {
                sett_refund_settlement_id: sett_refund_settlement_id,
                sett_refund_order_id: sett_refund_order_id,
                acc_info: acc_info,
            })
            var rs_id = false;
            search.create({
                type: record.Type.RETURN_AUTHORIZATION,
                filters: [
                    { name: "mainline", operator: "is", values: true },
                    { name: "name", operator: "is", values: acc_info.id },
                    { name: "poastext", operator: "is", values: sett_refund_order_id },
                    { name: "custbody_swc_settlement_id", operator: "is", values: sett_refund_settlement_id },
                ],
                columns: [
                ]
            }).run().each(function (rec) {
                rs_id = rec.id;
            });
            return rs_id
        }

        function CreateReturnAuthorization(acc_info, sett_ids, sett_refund_settlement_id, sett_refund_order_id, refund_date, sku_info_fee, sett_refund_quantity, currency_id) {
            try {
                log.audit('CreateReturnAuthorization', {
                    sett_refund_settlement_id: sett_refund_settlement_id,
                    sett_refund_order_id: sett_refund_order_id,
                    refund_date: refund_date,
                    sku_info_fee: sku_info_fee,
                    sett_refund_quantity: sett_refund_quantity,
                    currency_id: currency_id,
                    acc_info: acc_info,
                });

                // var return_loaction;
                // search.create({
                //     type: 'location',
                //     filters: [
                //         { name: 'custrecord_swc_location_store', operator: 'anyof', values: acc_info.id },
                //     ],
                //     columns: [
                //         { name: 'internalId' }
                //     ]
                // }).run().each(function (rec) {
                //     return_loaction = rec.id;
                //     return true;
                // });
                // if (!return_loaction) {
                //     throw '店铺找不到对应的平台仓,暂不处理';
                // }

                // return_loaction = ''

                var retrun_authorization_rec = record.create({ type: record.Type.RETURN_AUTHORIZATION, isDynamic: true });
                retrun_authorization_rec.setValue({ fieldId: 'entity', value: acc_info.id });
                retrun_authorization_rec.setValue({ fieldId: 'trandate', value: format.parse({ value: refund_date, type: 'date' }) });
                retrun_authorization_rec.setValue({ fieldId: 'orderstatus', value: 'B' });
                // retrun_authorization_rec.setValue({ fieldId: 'location', value: return_loaction });
                retrun_authorization_rec.setValue({ fieldId: 'currency', value: currency_id });
                retrun_authorization_rec.setValue({ fieldId: 'otherrefnum', value: sett_refund_order_id });
                retrun_authorization_rec.setValue({ fieldId: 'custbody_swc_platform_order_number', value: sett_refund_order_id });
                retrun_authorization_rec.setValue({ fieldId: 'custbody_swc_relation_az_settlement', value: sett_ids });
                retrun_authorization_rec.setValue({ fieldId: 'custbody_swc_settlement_id', value: sett_refund_settlement_id });
                for (let i = 0; i < sku_info_fee.length; i++) {
                    retrun_authorization_rec.selectNewLine({ sublistId: 'item' })
                    retrun_authorization_rec.setCurrentSublistText({ sublistId: 'item', fieldId: 'item', text: sku_info_fee[i].sku_text });
                    // retrun_authorization_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: return_loaction })
                    retrun_authorization_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: sett_refund_quantity })
                    retrun_authorization_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: '-1' })
                    retrun_authorization_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: Math.abs(sku_info_fee[i].amount) / sett_refund_quantity })
                    retrun_authorization_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: Math.abs(sku_info_fee[i].amount) })
                    retrun_authorization_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_msku', value: sku_info_fee[i].msku })
                    var class_id = interface.SearchClassID(sku_info_fee[i].sku_text);
                    if (class_id) {
                        retrun_authorization_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: class_id });
                    }
                    retrun_authorization_rec.commitLine({ sublistId: 'item' })
                }
                var retrun_authorization_id = retrun_authorization_rec.save({ ignoreMandatoryFields: true });
                return retrun_authorization_id
            } catch (err) {
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        function CreateCreditMemo(rt_id, refund_date) {
            try {
                //创建贷项通知单
                var credit_memo_rec = record.transform({
                    fromType: record.Type.RETURN_AUTHORIZATION,
                    toType: record.Type.CREDIT_MEMO,
                    fromId: rt_id,
                    isDynamic: true
                });
                credit_memo_rec.setValue({ fieldId: "trandate", value: format.parse({ value: refund_date, type: 'date' }) });
                var credit_memo_id = credit_memo_rec.save({ ignoreMandatoryFields: true });
                return credit_memo_id
            } catch (err) {
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        function SearchSKU(mskus, skuInfo, acc_id) {
            try {
                log.audit('SearchSKU', mskus);
                var n_mskus = [...new Set(mskus)];

                var itemFilters = [
                    ['isinactive', 'is', false], 'and',
                    ['custrecord_swc_az_sku_map_store', 'anyof', acc_id]
                ];
                var filters = [];
                for (let i = 0; i < n_mskus.length; i++) {
                    if (n_mskus[i]) {
                        if (filters.length) {
                            filters.push('or', ['custrecord_swc_az_sku_map_msku', 'is', n_mskus[i]])
                        } else {
                            filters.push(['custrecord_swc_az_sku_map_msku', 'is', mskus[i]])
                        }
                    }
                }
                if (filters.length) {
                    itemFilters.push('and')
                    itemFilters.push(filters)
                }

                var s_sku_info = [];
                var mySearch = search.create({
                    type: 'customrecord_swc_amazon_sku_mapping',
                    filters: itemFilters,
                    columns: [
                        { name: 'custrecord_swc_az_sku_map_item' },
                        { name: 'custrecord_swc_az_sku_map_msku' },
                        { name: 'created', sort: search.Sort.DESC },
                    ]
                });
                var pageSize = '1000'; //每页条数
                var pageData = mySearch.runPaged({
                    pageSize: pageSize
                });
                log.debug('pageData', pageData);
                var totalCount = pageData.count; //总数
                log.debug('totalCount', totalCount);
                var pageCount = pageData.pageRanges.length; //页数
                log.debug('pageCount', pageCount);

                for (let i = 0; i < pageCount; i++) {
                    pageData.fetch({
                        index: i
                    }).data.forEach(function (rec) {
                        s_sku_info.push({
                            item_id: rec.getValue('custrecord_swc_az_sku_map_item'),
                            item_text: rec.getText('custrecord_swc_az_sku_map_item'),
                            msku: rec.getValue('custrecord_swc_az_sku_map_msku')
                        });
                    });
                }

                for (let i = 0; i < skuInfo.length; i++) {
                    for (let j = 0; j < s_sku_info.length; j++) {
                        if (skuInfo[i].msku == s_sku_info[j].msku) {
                            skuInfo[i].skuid = s_sku_info[j].item_id;
                            skuInfo[i].sku_text = s_sku_info[j].item_text;
                            break
                        }
                    }
                }

                log.audit('skuInfo', skuInfo);


            } catch (error) {
                log.audit('SearchSKU error', error);
                var e = error.message ? error.message : error;
                throw e
            }
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });
