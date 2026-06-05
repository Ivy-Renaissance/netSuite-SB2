/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_XL_JOURNALENTRY_PAYMENT.js
 *@description 结算日记账自动核销发票、贷项通知单
 */
define(['../common/interface', '../common/moment', 'N/runtime', 'N/record', 'N/search', 'N/format', 'N/error'],
    function (interface, moment, runtime, record, search, format, error) {

        var record_type = 'journalentry'
        function getInputData() {
            var startTime = new Date().getTime();
            log.emergency('getInputData 开始', startTime);
            var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jour_p_store' });
            var orderid = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jour_p_orderid' });
            var date_start = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jour_p_start_date' });
            var date_end = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jour_p_end_date' });
            var settlement_id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jour_p_settlement_id' });
            var internalid = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jour_p_internalid' });

            if (date_start) {
                date_start = format.format({ value: date_start, type: 'date' })
            }
            if (date_end) {
                date_end = format.format({ value: date_end, type: 'date' })
            }
            var data = [], jo_ids = [];
            var limit = 200;
            var filters = [
                { name: 'custbody_swc_write_off_invoice_credit', operator: 'is', values: false },
                { name: 'custbody_swc_journal_type', operator: 'anyof', values: ['5', '6', '14'] },
                // { name: 'account', operator: 'anyof', values: ['1301'] }, //1122.03 应收账款 : 应收账款-平台
            ]
            if (runtime.accountId == '11297254_SB1') {
                filters.push({ name: 'account', operator: 'anyof', values: ['1301'] });  //1122.03 应收账款 : 应收账款-平台
            } else {
                filters.push({ name: 'account', operator: 'anyof', values: ['448'] });  //1122.02 应收账款 : 应收账款-平台
            }
            if (acc) {
                filters.push({ name: 'entity', operator: 'anyof', values: acc })
            };
            if (orderid) {
                filters.push({ name: 'custbody_swc_platform_order_number', operator: 'is', values: orderid })
            };
            if (settlement_id) {
                filters.push({ name: 'custbody_swc_settlement_id', operator: 'is', values: settlement_id })
            };
            if (internalid) {
                filters.push({ name: 'internalid', operator: 'is', values: internalid })
            };
            if (date_end && date_start) {
                filters.push({ name: 'trandate', operator: 'within', values: [date_start, date_end] })
            }
            if (date_end && !date_start) {
                filters.push({ name: 'trandate', operator: 'onorbefore', values: date_end })
            }
            if (!date_end && date_start) {
                filters.push({ name: 'trandate', operator: 'onorafter', values: date_start })
            }
            log.audit('filters', filters)
            search.create({
                type: record_type,
                filters: filters,
                columns: [
                    { name: 'trandate', sort: search.Sort.ASC },
                    { name: 'subsidiary' },
                    { name: 'currency' },
                    { name: 'fxamount' },
                    { name: 'entity' },
                    { name: 'account' },
                    { name: 'custbody_swc_journal_type' },
                    { name: 'custbody_swc_settlement_id' },
                    { name: 'custbody_swc_platform_order_number' },
                    { name: 'custbody_swc_relation_az_settlement' },
                    { name: 'custbody_swc_relation_jjpt_settlement' },
                    { name: 'custbody_swc_relation_xl_settlement' },
                ]
            }).run().each(function (rec) {
                if (JSON.stringify(jo_ids).indexOf(rec.id) == -1) {
                    jo_ids.push(rec.id);
                    data.push({
                        jo_id: rec.id,
                        trandate: rec.getValue({ name: 'trandate', sort: search.Sort.ASC }),
                        subsidiary: rec.getValue('subsidiary'),
                        currency: rec.getValue('currency'),
                        jourAmount: Math.abs(rec.getValue('fxamount')),
                        entity: rec.getValue('entity'),
                        account: rec.getValue('account'),
                        journalType: rec.getValue('custbody_swc_journal_type'),
                        settlementId: rec.getValue('custbody_swc_settlement_id'),
                        orderId: rec.getValue('custbody_swc_platform_order_number'),
                        az_settlement: rec.getValue('custbody_swc_relation_az_settlement'),
                        jjpt_settlement: rec.getValue('custbody_swc_relation_jjpt_settlement'),
                        xl_settlement: rec.getValue('custbody_swc_relation_xl_settlement'),
                    });
                }
                return --limit > 0;
            })
            log.emergency('获取数量 data', data.length)
            return data;
        }

        function map(context) {
            try {
                var obj = JSON.parse(context.value);
                log.audit('obj', obj)
                var jo_id = obj.jo_id;
                var trandate = obj.trandate;
                var subsidiary = obj.subsidiary;
                var currency = obj.currency;
                var entity = obj.entity;
                var journalType = obj.journalType;
                var jourAmountTotal = obj.jourAmount;
                var jourAmount = obj.jourAmount;
                var settlementId = obj.settlementId;
                var orderId = obj.orderId;

                // var real_acc_info = interface.GetAccountInfo(entity);

                if (journalType == '5') {
                    //结算报告-收款日记账
                    // if (obj.az_settlement.length > 0) {
                    //     //亚马逊-单独订单核销
                    //     //通过 结算ID、订单号、子公司、货币、客户（店铺） 找到对应的发票进行核销
                    //     var invoiceId, totalInvoiceAmount = 0, aracctid = '';
                    //     search.create({
                    //         type: 'invoice',
                    //         filters: [
                    //             { name: 'subsidiary', operator: 'anyof', values: subsidiary },
                    //             { name: 'currency', operator: 'anyof', values: currency },
                    //             { name: 'entity', operator: 'anyof', values: entity },
                    //             { name: 'mainline', operator: 'is', values: true },
                    //             { name: 'poastext', operator: 'is', values: orderId },
                    //             { name: 'custbody_swc_settlement_id', operator: 'is', values: settlementId },
                    //         ],
                    //         columns: [
                    //             { name: 'trandate' },
                    //             { name: 'internalid' },
                    //             { name: 'fxamount' },
                    //             { name: 'fxamountpaid' },
                    //             { name: 'tranid' },
                    //             { name: 'account' },
                    //         ]
                    //     }).run().each(function (rec) {
                    //         invoiceId = rec.id;
                    //         var fxAmount = rec.getValue('fxamount') || 0;
                    //         var fxamountpaid = rec.getValue('fxamountpaid') || 0;
                    //         var fxamountunpaid = interface.accSub(fxAmount, fxamountpaid);
                    //         totalInvoiceAmount = interface.accAdd(totalInvoiceAmount, fxamountunpaid);
                    //         if (!aracctid) {
                    //             aracctid = rec.getValue('account');
                    //         }
                    //     });
                    //     log.audit('invoiceInfo', invoiceInfo);
                    //     log.audit('jourAmountTotal', jourAmountTotal);
                    //     log.audit('totalInvoiceAmount', totalInvoiceAmount);

                    //     if (invoiceId) {
                    //         if (Number(jourAmountTotal) == Number(totalInvoiceAmount)) {
                    //             var hx_inv = [];
                    //             var pmt = record.create({ type: record.Type.CUSTOMER_PAYMENT, isDynamic: true });

                    //             pmt.setValue({ fieldId: 'customer', value: entity });
                    //             pmt.setValue({ fieldId: 'subsidiary', value: subsidiary });
                    //             pmt.setValue({ fieldId: 'currency', value: currency });
                    //             pmt.setText({ fieldId: 'trandate', text: trandate });

                    //             pmt.setValue({ fieldId: 'aracct', value: aracctid });

                    //             log.audit('entity', pmt.getValue('customer'));
                    //             log.audit('subsidiary', pmt.getValue('subsidiary'));
                    //             log.audit('currency', pmt.getValue('currency'));
                    //             log.audit('aracct', pmt.getValue('aracct'));

                    //             var ln = pmt.findSublistLineWithValue({ sublistId: 'apply', fieldId: 'internalid', value: invoiceId });
                    //             log.audit('ln', ln);
                    //             if (ln != -1) {
                    //                 pmt.selectLine({ sublistId: 'apply', line: ln });
                    //                 pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                    //                 pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: totalInvoiceAmount });
                    //                 pmt.commitLine({ sublistId: 'apply' });
                    //             } else {
                    //                 throw '核销异常,找不到对应的发票';
                    //             }

                    //             var j_line = pmt.findSublistLineWithValue({ sublistId: 'credit', fieldId: 'internalid', value: jo_id });
                    //             log.audit('j_line', j_line);
                    //             if (j_line != -1) {
                    //                 pmt.selectLine({ sublistId: 'credit', line: j_line });
                    //                 pmt.setCurrentSublistValue({ sublistId: 'credit', fieldId: 'apply', value: true });
                    //                 pmt.setCurrentSublistValue({ sublistId: 'credit', fieldId: 'amount', value: jourAmountTotal });
                    //                 pmt.commitLine({ sublistId: 'credit' });
                    //             } else {
                    //                 throw '核销异常,找不到对应的日记账';
                    //             }

                    //             log.audit('payment', pmt.getValue('payment'));
                    //             if (Number(pmt.getValue('payment')) != 0) {
                    //                 throw '异常:日记账核销金额不为0';
                    //             }
                    //             var id = pmt.save({ ignoreMandatoryFields: true });
                    //             log.audit('id', id);
                    //             record.submitFields({
                    //                 type: record_type,
                    //                 id: jo_id,
                    //                 values: {
                    //                     custbody_swc_write_off_invoice_credit: true,
                    //                     custbody_swc_relation_invoice_credit: invoiceId,
                    //                     custbody_swc_error: '',
                    //                 },
                    //                 options: {
                    //                     enableSourcing: false,
                    //                     ignoreMandatoryFields: true,
                    //                 }
                    //             });
                    //         } else {
                    //             throw '发票金额与结算收款金额不一致,暂不核销';
                    //         }
                    //     } else {
                    //         throw '亚马逊结算找不到对应发票,无法核销';
                    //     }

                    // } else {

                    var invoiceInfo = [], totalInvoiceAmount = 0, aracctid = '';
                    var filters = [
                        ['mainline', 'is', true], 'and',
                        // ['trandate', 'onorbefore', trandate], 'and',
                        ['subsidiary', 'anyof', subsidiary], 'and',
                        ['currency', 'anyof', currency], 'and',
                        ['entity', 'anyof', entity], 'and',
                        [
                            ['poastext', 'is', orderId], 'or',
                            ['custbody_swc_platform_order_number', 'is', orderId]
                        ]
                    ];
                    search.create({
                        type: 'invoice',
                        filters: filters,
                        columns: [
                            { name: 'trandate', sort: search.Sort.ASC },
                            { name: 'internalid', sort: search.Sort.ASC },
                            { name: 'fxamount' },
                            { name: 'fxamountpaid' },
                            { name: 'tranid' },
                            { name: 'account' },
                        ]
                    }).run().each(function (rec) {
                        var fxAmount = rec.getValue('fxamount') || 0;
                        var fxamountpaid = rec.getValue('fxamountpaid') || 0;
                        var fxamountunpaid = interface.accSub(fxAmount, fxamountpaid);
                        totalInvoiceAmount = interface.accAdd(totalInvoiceAmount, fxamountunpaid);
                        jourAmount = interface.accSub(jourAmount, fxamountunpaid);
                        if (!aracctid) {
                            aracctid = rec.getValue('account');
                        }
                        if (Number(jourAmount) > 0) {
                            invoiceInfo.push({
                                id: rec.id,
                                tranid: rec.getValue('tranid'),
                                trandate: rec.getValue({ name: 'trandate', sort: search.Sort.ASC }),
                                setAmount: fxamountunpaid,
                            });
                            return true;
                        } else {
                            invoiceInfo.push({
                                id: rec.id,
                                tranid: rec.getValue('tranid'),
                                trandate: rec.getValue({ name: 'trandate', sort: search.Sort.ASC }),
                                setAmount: interface.accAdd(jourAmount, fxamountunpaid),
                            });
                            return false;
                        }
                    });
                    log.audit('invoiceInfo', invoiceInfo);
                    log.audit('jourAmountTotal', jourAmountTotal);
                    log.audit('totalInvoiceAmount', totalInvoiceAmount);

                    if (invoiceInfo.length == 0) {
                        throw '异常:未找到待核销发票';
                    }

                    var unpaid_amount = 0;
                    if (Number(jourAmountTotal) > Number(totalInvoiceAmount)) {
                        // throw '日记账核销金额 大于 发票待核销金额 , 暂不处理';
                        unpaid_amount = interface.accSub(jourAmountTotal, totalInvoiceAmount);
                        jourAmountTotal = totalInvoiceAmount;
                    } else {

                    }
                    var hx_inv = [];
                    var pmt = record.create({ type: record.Type.CUSTOMER_PAYMENT, isDynamic: true });

                    pmt.setValue({ fieldId: 'customer', value: entity });
                    pmt.setValue({ fieldId: 'subsidiary', value: subsidiary });
                    pmt.setValue({ fieldId: 'currency', value: currency });
                    pmt.setText({ fieldId: 'trandate', text: trandate });

                    pmt.setValue({ fieldId: 'aracct', value: aracctid });

                    log.audit('entity', pmt.getValue('customer'));
                    log.audit('subsidiary', pmt.getValue('subsidiary'));
                    log.audit('currency', pmt.getValue('currency'));
                    log.audit('aracct', pmt.getValue('aracct'));

                    for (let i = 0; i < invoiceInfo.length; i++) {
                        var invoice_id = invoiceInfo[i].id
                        log.audit('invoice_id', invoice_id);
                        var ln = pmt.findSublistLineWithValue({ sublistId: 'apply', fieldId: 'internalid', value: invoice_id });
                        log.audit('ln', ln);
                        if (ln != -1) {
                            hx_inv.push(invoice_id);
                            pmt.selectLine({ sublistId: 'apply', line: ln });
                            pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                            pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: invoiceInfo[i].setAmount });
                            pmt.commitLine({ sublistId: 'apply' });
                        }
                    }
                    if (hx_inv.length == 0) {
                        throw '异常:未核销到发票';
                    }

                    var jo_flag = true;
                    var line = pmt.getLineCount({ sublistId: 'credit' });
                    for (let i = 0; i < line; i++) {
                        pmt.selectLine({ sublistId: 'credit', line: i });
                        var id = pmt.getCurrentSublistValue({ sublistId: 'credit', fieldId: 'internalid' });
                        if (id == jo_id) {
                            jo_flag = false;
                            pmt.setCurrentSublistValue({ sublistId: 'credit', fieldId: 'apply', value: true });
                            var amt = pmt.getCurrentSublistValue({ sublistId: 'credit', fieldId: 'amount' });
                            paid_amount = interface.accSub(paid_amount, amt);
                            if (Number(paid_amount) < 0) {
                                var set_amount = interface.accAdd(paid_amount, amt)
                                pmt.setCurrentSublistValue({ sublistId: 'credit', fieldId: 'amount', value: set_amount });
                                pmt.commitLine({ sublistId: 'credit' });
                                break;
                            }
                            pmt.commitLine({ sublistId: 'credit' });
                        }
                    }
                    if (jo_flag) {
                        throw '核销异常,找不到对应的日记账';
                    }

                    // var j_line = pmt.findSublistLineWithValue({ sublistId: 'credit', fieldId: 'internalid', value: jo_id });
                    // log.audit('j_line', j_line);
                    // pmt.selectLine({ sublistId: 'credit', line: j_line });
                    // pmt.setCurrentSublistValue({ sublistId: 'credit', fieldId: 'apply', value: true });
                    // pmt.setCurrentSublistValue({ sublistId: 'credit', fieldId: 'amount', value: jourAmountTotal });
                    // pmt.commitLine({ sublistId: 'credit' });

                    log.audit('payment', pmt.getValue('payment'));
                    log.audit('hx_inv', hx_inv);
                    if (Number(pmt.getValue('payment')) != 0) {
                        throw '异常:日记账核销金额不为0';
                    }
                    var id = pmt.save({ ignoreMandatoryFields: true });
                    log.audit('id', id);
                    record.submitFields({
                        type: record_type,
                        id: jo_id,
                        values: {
                            custbody_swc_write_off_invoice_credit: true,
                            custbody_swc_relation_invoice_credit: hx_inv,
                            custbody_swc_unpaid_amount: unpaid_amount,
                            custbody_swc_error: '',
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true,
                        }
                    });

                }
                else if (journalType == '6') {
                    //结算报告-退款日记账
                    // if (obj.az_settlement.length > 0) {
                    //     //亚马逊-单独订单核销
                    //     //通过 结算ID、订单号、子公司、货币、客户（店铺） 找到对应的发票进行核销
                    //     var creditId, totalCreditAmount = 0, aracctid = '';
                    //     search.create({
                    //         type: 'creditmemo',
                    //         filters: [
                    //             { name: 'subsidiary', operator: 'anyof', values: subsidiary },
                    //             { name: 'currency', operator: 'anyof', values: currency },
                    //             { name: 'entity', operator: 'anyof', values: entity },
                    //             { name: 'mainline', operator: 'is', values: true },
                    //             { name: 'poastext', operator: 'is', values: orderId },
                    //             { name: 'custbody_swc_settlement_id', operator: 'is', values: settlementId },
                    //         ],
                    //         columns: [
                    //             { name: 'trandate', sort: search.Sort.ASC },
                    //             { name: 'internalid', sort: search.Sort.ASC },
                    //             { name: 'fxamount' },
                    //             { name: 'fxamountpaid' },
                    //             { name: 'tranid' },
                    //             { name: 'account' },
                    //         ]
                    //     }).run().each(function (rec) {
                    //         creditId = rec.id;
                    //         var fxAmount = Math.abs(rec.getValue('fxamount')) || 0;
                    //         var fxamountpaid = rec.getValue('fxamountpaid') || 0;
                    //         var fxamountunpaid = interface.accSub(fxAmount, fxamountpaid);
                    //         totalCreditAmount = interface.accAdd(totalCreditAmount, fxamountunpaid);

                    //         if (!aracctid) {
                    //             aracctid = rec.getValue('account');
                    //         }
                    //     });

                    //     log.audit('creditId', creditId);
                    //     log.audit('jourAmountTotal', jourAmountTotal);
                    //     log.audit('totalCreditAmount', totalCreditAmount);

                    //     if (creditId) {
                    //         if (Number(jourAmountTotal) == Number(totalCreditAmount)) {

                    //             var pmt = record.create({ type: record.Type.CUSTOMER_PAYMENT, isDynamic: true });

                    //             pmt.setValue({ fieldId: 'customer', value: entity });
                    //             pmt.setValue({ fieldId: 'subsidiary', value: subsidiary });
                    //             pmt.setValue({ fieldId: 'currency', value: currency });
                    //             pmt.setText({ fieldId: 'trandate', text: trandate });

                    //             pmt.setValue({ fieldId: 'aracct', value: aracctid });

                    //             log.audit('entity', pmt.getValue('customer'));
                    //             log.audit('subsidiary', pmt.getValue('subsidiary'));
                    //             log.audit('currency', pmt.getValue('currency'));
                    //             log.audit('aracct', pmt.getValue('aracct'));


                    //             var jo_flag = true;
                    //             var line = pmt.getLineCount({ sublistId: 'apply' });
                    //             for (let i = 0; i < line; i++) {
                    //                 pmt.selectLine({ sublistId: 'apply', line: i });
                    //                 var id = pmt.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'internalid' });
                    //                 if (id == jo_id) {
                    //                     jo_flag = false;
                    //                     pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                    //                     pmt.commitLine({ sublistId: 'apply' });
                    //                 }
                    //             }
                    //             if (jo_flag) {
                    //                 throw '核销异常,找不到对应的日记账';
                    //             }
                    //             log.audit('jour payment', pmt.getValue('payment'));
                    //             if (Number(pmt.getValue('payment')) != jourAmountTotal) {
                    //                 throw '核销未勾选完该日记账,等待下一次处理';
                    //             }


                    //             var ln = pmt.findSublistLineWithValue({ sublistId: 'credit', fieldId: 'internalid', value: creditId });
                    //             log.audit('ln', ln);
                    //             if (ln != -1) {
                    //                 pmt.selectLine({ sublistId: 'credit', line: ln });
                    //                 pmt.setCurrentSublistValue({ sublistId: 'credit', fieldId: 'apply', value: true });
                    //                 pmt.setCurrentSublistValue({ sublistId: 'credit', fieldId: 'amount', value: totalCreditAmount });
                    //                 pmt.commitLine({ sublistId: 'credit' });
                    //             } else {
                    //                 throw '核销异常,找不到对应的贷项';
                    //             }

                    //             // var j_line = pmt.findSublistLineWithValue({ sublistId: 'apply', fieldId: 'internalid', value: jo_id });
                    //             // log.audit('j_line', j_line);
                    //             // if (j_line != -1) {
                    //             //     pmt.selectLine({ sublistId: 'apply', line: j_line });
                    //             //     pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                    //             //     pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: jourAmountTotal });
                    //             //     pmt.commitLine({ sublistId: 'apply' });
                    //             // } else {
                    //             //     throw '核销异常,找不到对应的日记账';
                    //             // }

                    //             log.audit('payment', pmt.getValue('payment'));
                    //             if (Number(pmt.getValue('payment')) != 0) {
                    //                 throw '异常:日记账核销金额不为0';
                    //             }
                    //             var id = pmt.save({ ignoreMandatoryFields: true });
                    //             log.audit('id', id);
                    //             record.submitFields({
                    //                 type: record_type,
                    //                 id: jo_id,
                    //                 values: {
                    //                     custbody_swc_write_off_invoice_credit: true,
                    //                     custbody_swc_relation_invoice_credit: creditId,
                    //                     custbody_swc_error: '',
                    //                 },
                    //                 options: {
                    //                     enableSourcing: false,
                    //                     ignoreMandatoryFields: true,
                    //                 }
                    //             });
                    //         } else {
                    //             throw '贷项金额与结算收款金额不一致,暂不核销';
                    //         }
                    //     } else {
                    //         throw '亚马逊结算找不到对应贷项,无法核销';
                    //     }



                    // } else {
                    var creditInfo = [], totalCreditAmount = 0, aracctid = '';
                    var filters = [
                        ['mainline', 'is', true], 'and',
                        // ['trandate', 'onorbefore', trandate], 'and',
                        ['subsidiary', 'anyof', subsidiary], 'and',
                        ['currency', 'anyof', currency], 'and',
                        ['entity', 'anyof', entity], 'and',
                        [
                            ['poastext', 'is', orderId], 'or',
                            ['custbody_swc_platform_order_number', 'is', orderId]
                        ]
                    ];
                    search.create({
                        type: 'creditmemo',
                        filters: filters,
                        columns: [
                            { name: 'trandate', sort: search.Sort.ASC },
                            { name: 'internalid', sort: search.Sort.ASC },
                            { name: 'fxamount' },
                            { name: 'fxamountpaid' },
                            { name: 'tranid' },
                            { name: 'account' },
                        ]
                    }).run().each(function (rec) {
                        var fxAmount = Math.abs(rec.getValue('fxamount')) || 0;
                        log.audit('fxAmount', fxAmount);
                        var fxamountpaid = rec.getValue('fxamountpaid') || 0;
                        log.audit('fxamountpaid', fxamountpaid);
                        var fxamountunpaid = interface.accSub(fxAmount, fxamountpaid);
                        log.audit('fxamountunpaid', fxamountunpaid);
                        totalCreditAmount = interface.accAdd(totalCreditAmount, fxamountunpaid);
                        jourAmount = interface.accSub(jourAmount, fxamountunpaid);
                        if (!aracctid) {
                            aracctid = rec.getValue('account');
                        }
                        if (Number(jourAmount) > 0) {
                            creditInfo.push({
                                id: rec.id,
                                tranid: rec.getValue('tranid'),
                                trandate: rec.getValue({ name: 'trandate', sort: search.Sort.ASC }),
                                setAmount: fxamountunpaid,
                            });
                            return true;
                        } else {
                            creditInfo.push({
                                id: rec.id,
                                tranid: rec.getValue('tranid'),
                                trandate: rec.getValue({ name: 'trandate', sort: search.Sort.ASC }),
                                setAmount: interface.accAdd(jourAmount, fxamountunpaid),
                            });
                            return false;
                        }
                    });
                    log.audit('creditInfo', creditInfo);
                    log.audit('jourAmountTotal', jourAmountTotal);
                    log.audit('totalCreditAmount', totalCreditAmount);

                    if (creditInfo.length == 0) {
                        throw '异常:未找到待核销贷项';
                    }

                    var unpaid_amount = 0;
                    if (Number(jourAmountTotal) > Number(totalCreditAmount)) {
                        unpaid_amount = interface.accSub(jourAmountTotal, totalCreditAmount);
                        jourAmountTotal = totalCreditAmount;
                        // throw '日记账核销金额 大于 贷项待核销金额 , 暂不处理';
                    } else {

                    }
                    var hx_crd = [];
                    var pmt = record.create({ type: record.Type.CUSTOMER_PAYMENT, isDynamic: true });

                    pmt.setValue({ fieldId: 'customer', value: entity });
                    pmt.setValue({ fieldId: 'subsidiary', value: subsidiary });
                    pmt.setValue({ fieldId: 'currency', value: currency });
                    pmt.setText({ fieldId: 'trandate', text: trandate });

                    pmt.setValue({ fieldId: 'aracct', value: aracctid });

                    log.audit('entity', pmt.getValue('customer'));
                    log.audit('subsidiary', pmt.getValue('subsidiary'));
                    log.audit('currency', pmt.getValue('currency'));
                    log.audit('aracct', pmt.getValue('aracct'));

                    var jo_flag = true;
                    var line = pmt.getLineCount({ sublistId: 'apply' });
                    var paid_amount = jourAmountTotal;
                    for (let i = 0; i < line; i++) {
                        pmt.selectLine({ sublistId: 'apply', line: i });
                        var id = pmt.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'internalid' });
                        if (id == jo_id) {
                            jo_flag = false;
                            pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                            var amt = pmt.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount' });
                            paid_amount = interface.accSub(paid_amount, amt);
                            if (Number(paid_amount) < 0) {
                                var set_amount = interface.accAdd(paid_amount, amt)
                                pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: set_amount });
                                pmt.commitLine({ sublistId: 'apply' });
                                break;
                            }
                            pmt.commitLine({ sublistId: 'apply' });
                        }
                    }
                    if (jo_flag) {
                        throw '核销异常,找不到对应的日记账';
                    }
                    log.audit('jour payment', pmt.getValue('payment'));
                    if (Number(pmt.getValue('payment')) != jourAmountTotal) {
                        throw '核销未勾选完该日记账,等待下一次处理';
                    }

                    for (let i = 0; i < creditInfo.length; i++) {
                        var credit_id = creditInfo[i].id
                        log.audit('credit_id', credit_id);
                        var ln = pmt.findSublistLineWithValue({ sublistId: 'credit', fieldId: 'internalid', value: credit_id });
                        log.audit('ln', ln);
                        if (ln != -1) {
                            hx_crd.push(credit_id);
                            pmt.selectLine({ sublistId: 'credit', line: ln });
                            pmt.setCurrentSublistValue({ sublistId: 'credit', fieldId: 'apply', value: true });
                            pmt.setCurrentSublistValue({ sublistId: 'credit', fieldId: 'amount', value: creditInfo[i].setAmount });
                            pmt.commitLine({ sublistId: 'credit' });
                        }
                    }
                    if (hx_crd.length == 0) {
                        throw '异常:未核销到贷项';
                    }

                    log.audit('payment', pmt.getValue('payment'));
                    log.audit('hx_crd', hx_crd);
                    if (Number(pmt.getValue('payment')) != 0) {
                        throw '异常:日记账核销金额不为0';
                    }
                    var id = pmt.save({ ignoreMandatoryFields: true });
                    log.audit('id', id);
                    record.submitFields({
                        type: record_type,
                        id: jo_id,
                        values: {
                            custbody_swc_write_off_invoice_credit: true,
                            custbody_swc_relation_invoice_credit: hx_crd,
                            custbody_swc_unpaid_amount: unpaid_amount,
                            custbody_swc_error: '',
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true,
                        }
                    });
                    // }

                }
                else if (journalType == '14') {
                    jourAmount = -jourAmount;
                    let totalCreditAmount = jourAmount;
                    let dataCreditInfo = [];
                    let apacctid = '';
                    let unpaid_amount = 0;
                    let filters_vc = [
                        ['mainline', 'is', true], 'and',
                        ['formulanumeric: NVL({fxamount}, 0)-NVL({fxamountpaid},0)', 'notequalto', ['0']], 'and',
                        ['trandate', 'onorbefore', trandate], 'and',
                        ['subsidiary', 'anyof', subsidiary], 'and',
                        ['currency', 'anyof', currency], 'and',
                        ['entity', 'anyof', entity], 'and',
                        ['custbody_swc_order_type2', 'anyof', ['15', '16']]
                    ];
                    log.audit('filters_vc', filters_vc);
                    search.create({
                        type: 'vendorcredit',
                        filters: filters_vc,
                        columns: [
                            { name: 'trandate', sort: search.Sort.ASC },
                            { name: 'internalid', sort: search.Sort.ASC },
                            { name: 'fxamount' },
                            { name: 'fxamountpaid' },
                            { name: 'tranid' },
                            { name: 'formulanumeric', formula: 'NVL({fxamount}, 0) - NVL({fxamountpaid}, 0)' },
                            { name: 'account' },
                        ]
                    }).run().each(function (rec) {
                        log.audit('结果rec', JSON.stringify(rec));
                        log.audit('fxamountunpaid', rec.getValue(rec.columns[5]));
                        totalCreditAmount = interface.accAdd(totalCreditAmount, rec.getValue(rec.columns[5]))
                        dataCreditInfo.push({
                            id: rec.id,
                            tranid: rec.getValue('tranid'),
                            trandate: rec.getValue({ name: 'trandate', sort: search.Sort.ASC }),
                            setAmount: rec.getValue(rec.columns[5]),
                        });
                        if (!apacctid) {
                            apacctid = rec.getValue('account');
                        }
                        return true;
                    });
                    log.audit('dataCreditInfo', dataCreditInfo);
                    log.audit('totalCreditAmount', totalCreditAmount);

                    let filters_vb = [
                        ['mainline', 'is', true], 'and',
                        ['formulanumeric: NVL({fxamount}, 0)-NVL({fxamountpaid},0)', 'notequalto', ['0']], 'and',
                        ['trandate', 'onorbefore', trandate], 'and',
                        ['subsidiary', 'anyof', subsidiary], 'and',
                        ['currency', 'anyof', currency], 'and',
                        ['entity', 'anyof', entity], 'and',
                        ['custbody_swc_order_type2', 'anyof', ['15', '16']]
                    ];
                    log.audit('filters_vb', filters_vb);

                    let dataBillInfo = [], totalBillAmount = 0, setBillAmount = 0;
                    search.create({
                        type: 'vendorbill',
                        filters: filters_vb,
                        columns: [
                            { name: 'trandate', sort: search.Sort.ASC },
                            { name: 'internalid', sort: search.Sort.ASC },
                            { name: 'fxamount' },
                            { name: 'fxamountpaid' },
                            { name: 'tranid' },
                            { name: 'formulanumeric', formula: 'NVL({fxamount}, 0) - NVL({fxamountpaid}, 0)' },
                            { name: 'account' },
                        ]
                    }).run().each(function (rec) {
                        log.audit('结果rec', JSON.stringify(rec));
                        log.audit('fxamountunpaid', rec.getValue(rec.columns[5]));
                        if (!apacctid) {
                            apacctid = rec.getValue('account');
                        }
                        totalBillAmount = interface.accAdd(totalBillAmount, rec.getValue(rec.columns[5]));
                        if (Number(totalBillAmount) + Number(totalCreditAmount) > 0) {
                            let s_amount = - interface.accAdd(totalCreditAmount, setBillAmount);
                            dataBillInfo.push({
                                id: rec.id,
                                tranid: rec.getValue('tranid'),
                                trandate: rec.getValue({ name: 'trandate', sort: search.Sort.ASC }),
                                setAmount: s_amount,
                            });
                            setBillAmount = interface.accAdd(setBillAmount, s_amount);
                            return false;
                        } else {
                            dataBillInfo.push({
                                id: rec.id,
                                tranid: rec.getValue('tranid'),
                                trandate: rec.getValue({ name: 'trandate', sort: search.Sort.ASC }),
                                setAmount: rec.getValue(rec.columns[5]),
                            });
                            setBillAmount = interface.accAdd(setBillAmount, rec.getValue(rec.columns[5]));
                            return true;
                        }
                    });
                    log.audit('totalBillAmount', totalBillAmount);
                    log.audit('setBillAmount', setBillAmount);
                    log.audit('dataBillInfo', dataBillInfo);

                    let difAmount = interface.accAdd(setBillAmount, totalCreditAmount);
                    if (Number(difAmount) < 0) {
                        throw '未找到足额账单和贷项';
                    }

                    var hx_inv = [];
                    var pmt = record.create({ type: record.Type.VENDOR_PAYMENT, isDynamic: true });

                    pmt.setValue({ fieldId: 'entity', value: entity });
                    pmt.setValue({ fieldId: 'subsidiary', value: subsidiary });
                    pmt.setValue({ fieldId: 'currency', value: currency });
                    pmt.setText({ fieldId: 'trandate', text: trandate });

                    pmt.setValue({ fieldId: 'apacct', value: apacctid });

                    var vdResult = search.lookupFields({ type: 'vendor', id: entity, columns: ['custentity_swc_company_payaccount'] });
                    log.audit('vdResult', vdResult);

                    pmt.setValue({ fieldId: 'account', value: vdResult['custentity_swc_company_payaccount'][0].value });

                    log.audit('entity', pmt.getValue('entity'));
                    log.audit('subsidiary', pmt.getValue('subsidiary'));
                    log.audit('currency', pmt.getValue('currency'));
                    log.audit('apacct', pmt.getValue('apacct'));
                    log.audit('account', pmt.getValue('account'));

                    let j_line = pmt.findSublistLineWithValue({ sublistId: 'apply', fieldId: 'internalid', value: jo_id });
                    log.audit('j_line', j_line);
                    if (j_line == -1) {
                        throw '异常:核销未找到该日记账';
                    }
                    pmt.selectLine({ sublistId: 'apply', line: j_line });
                    pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                    pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: jourAmount });
                    pmt.commitLine({ sublistId: 'apply' });

                    for (let i = 0; i < dataCreditInfo.length; i++) {
                        let vc_id = dataCreditInfo[i].id
                        let ln_vc = pmt.findSublistLineWithValue({ sublistId: 'apply', fieldId: 'internalid', value: vc_id });
                        log.audit('ln_vc', ln_vc);
                        if (ln_vc != -1) {
                            hx_inv.push(vc_id);
                            pmt.selectLine({ sublistId: 'apply', line: ln_vc });
                            pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                            pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: dataCreditInfo[i].setAmount });
                            pmt.commitLine({ sublistId: 'apply' });
                        }
                    }
                    if (hx_inv.length == 0) {
                        throw '异常:数据太多,未找到账单贷项';
                    }
                    for (let i = 0; i < dataBillInfo.length; i++) {
                        let vb_id = dataBillInfo[i].id
                        let ln_vb = pmt.findSublistLineWithValue({ sublistId: 'apply', fieldId: 'internalid', value: vb_id });
                        log.audit('ln_vb', ln_vb);
                        if (ln_vb != -1) {
                            hx_inv.push(vb_id);
                            pmt.selectLine({ sublistId: 'apply', line: ln_vb });
                            pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                            pmt.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: dataBillInfo[i].setAmount });
                            pmt.commitLine({ sublistId: 'apply' });
                        }
                    }
                    if (hx_inv.length == 0) {
                        throw '异常:数据太多,未找到账单贷项';
                    }


                    log.audit('payment', pmt.getValue('total'));
                    log.audit('hx_inv', hx_inv);
                    if (Number(pmt.getValue('total')) != 0) {
                        throw '异常:日记账核销金额不为0';
                    }
                    var id = pmt.save({ ignoreMandatoryFields: true });
                    log.audit('id', id);
                    record.submitFields({
                        type: record_type,
                        id: jo_id,
                        values: {
                            custbody_swc_write_off_invoice_credit: true,
                            custbody_swc_relation_invoice_credit: hx_inv,
                            custbody_swc_unpaid_amount: unpaid_amount,
                            custbody_swc_error: '',
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true,
                        }
                    });


                } else {
                    throw '未知类型';
                }

            } catch (error) {
                log.error('map error', error);
                var e = error.message ? error.message : error;
                record.submitFields({
                    type: record_type,
                    id: jo_id,
                    values: {
                        custbody_swc_error: e
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true,
                    }
                });

            }
        }

        function reduce(context) {

        }

        function summarize(summary) {

        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });
