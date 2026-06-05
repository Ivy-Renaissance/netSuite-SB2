/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_SETTLEMENT_HANDLE_XL.js
 *@description 小鹿结算报告（RPA）处理
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', 'N/config', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, config, interface, moment) {

        //debit-借  credit-贷

        var settlement_record_type = 'customrecord_swc_xl_settlemenreport';
        function getInputData() {
            var startTime = new Date().getTime();
            log.emergency('getInputData 开始', startTime);
            var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_jour_store' });
            var settlement_id = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_jour_sett_id' });
            var order_id = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_jour_order_id' });
            var startdate = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_jour_startdate' });
            var enddate = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_jour_enddate' });

            if (startdate) {
                startdate = format.format({ value: startdate, type: 'date' })
            }
            if (enddate) {
                enddate = format.format({ value: enddate, type: 'date' })
            }

            var data = [];
            var limit = 399;
            var filters = [
                { name: 'isinactive', operator: 'is', values: false },
                { name: 'custrecord_swc_sett_resolved', operator: 'is', values: false },
                { name: 'custrecord_swc_original_orderid', operator: 'isnotempty', values: '' },
                // { name: 'custrecord_swc_platform', operator: 'noneof', values: ['9'] }, //Shopify-9
                { name: 'custrecord_swc_accounting_date', operator: 'before', values: 'twodaysago' },
                { name: 'created', operator: 'before', values: 'twodaysago' },
            ]
            if (acc) {
                filters.push({ name: 'custrecord_swc_shop', operator: 'anyof', values: acc })
            };
            if (enddate && startdate) {
                filters.push({ name: 'custrecord_swc_accounting_date', operator: 'within', values: [startdate, enddate] })
            }
            if (enddate && !startdate) {
                filters.push({ name: 'custrecord_swc_accounting_date', operator: 'onorbefore', values: enddate })
            }
            if (!enddate && startdate) {
                filters.push({ name: 'custrecord_swc_accounting_date', operator: 'onorafter', values: startdate })
            }
            if (settlement_id) {
                filters.push({ name: 'custrecord_swc_settlement_documentid', operator: 'is', values: settlement_id })
            }
            if (order_id) {
                filters.push({ name: 'custrecord_swc_original_orderid', operator: 'is', values: order_id })
            }
            log.debug('filters', filters)
            search.create({
                type: settlement_record_type,
                filters: filters,
                columns: [
                    { name: 'custrecord_swc_settlement_documentid', summary: 'GROUP' },
                    { name: 'custrecord_swc_shop', summary: 'GROUP' },
                    { name: 'custrecord_swc_original_orderid', summary: 'GROUP' },
                    { name: 'custrecord_swc_xl_currency', summary: 'GROUP' },
                    { name: 'custrecord_swc_accounting_date', summary: 'GROUP' },
                    { name: 'custrecord_swc_sett_retry', summary: 'SUM', sort: 'ASC' },
                ]
            }).run().each(function (rec) {
                data.push({
                    sett_id: rec.getValue(rec.columns[0]),
                    acc_id: rec.getValue(rec.columns[1]),
                    order_id: rec.getValue(rec.columns[2]),
                    sett_currency: rec.getValue(rec.columns[3]),
                    accounting_date: rec.getValue(rec.columns[4]),
                    retry: rec.getValue(rec.columns[5]),
                })
                return --limit > 0
            })
            log.audit('data', data);
            log.audit('获取数量 data', data.length)
            var endTime = new Date().getTime();
            log.emergency('getInputData 结束', endTime);
            log.emergency('getInputData 耗时', endTime - startTime);
            return data;
        }

        function map(context) {
            var startTime = new Date().getTime();
            log.emergency('map 开始', startTime);
            var obj = JSON.parse(context.value);
            log.audit('map obj', obj);
            var sett_id = obj.sett_id;
            var acc_id = obj.acc_id;
            var order_id = obj.order_id;
            var accounting_date = obj.accounting_date;
            var PT_Arrys = [], item_codes = [], shipment_ids = [], settlement_ids = [], FeeTypeArray = [], invoices = [], no_invoices_error = [], no_so_error = [], no_fs_error = [], invoices_amount = [];
            var shipsItemCode = {}, settlmentID = {}
            var real_acc_info, so_obj = {};
            var depositDate, depositDateObj, currency_text, currency_id, merchant_order_id, locationDepositDateTime, postedDate, postedDateObj, locationpostedDateTime, endDate, endDateObj, endDateTime;
            var sett_entity, sett_acc, sett_acc_text, sett_subsidiary, sett_payment_account, sett_currency, sett_currency_text;
            var principal_amount;
            var TransferUnsuccessful = [], reserveAmount = [];
            var no_markplace = false;
            var DR = 0, funds = 0;
            var so_ids = [];

            try {
                currency_text = obj.sett_currency;
                var platform_id = ''
                real_acc_info = interface.GetAccountInfo(acc_id);
                log.audit('real_acc_info', real_acc_info);

                if (!accounting_date) {
                    throw '无计费日期';
                }

                var fee_account = [];
                search.create({
                    type: 'customrecord_swc_settlement_account',
                    filters: [
                        // { name: 'name', operator: 'isnotempty', values: '' },
                        { name: 'custrecord_swc_sa_different_currency', operator: 'is', values: false },
                        { name: 'custrecord_swc_sa_fee_field', operator: 'isnotempty', values: '' },
                        { name: 'custrecord_swc_sa_fee_account', operator: 'noneof', values: ['@NONE@'] },
                    ],
                    columns: [
                        { name: 'name' },
                        { name: 'custrecord_swc_sa_fee_field' },
                        { name: 'custrecord_swc_sa_fee_account' },
                        { name: 'custrecord_swc_sa_amount_type' },
                        { name: 'custrecord_swc_sa_is_accountpayable' },
                        { name: 'custrecord_swc_sa_debit_credit' },
                        { name: 'custrecord_swc_sa_fee_plateform' },
                        { name: 'custrecord_swc_sa_fee_journalmemo' },
                    ]
                }).run().each(function (rec) {
                    var debitCredit = rec.getText(rec.columns[5]);
                    if (debitCredit == '贷方') {
                        debitCredit = 'credit';
                    } else if (debitCredit == '借方') {
                        debitCredit = 'debit';
                    }
                    fee_account.push({
                        fee_name: rec.getValue(rec.columns[0]),
                        fee_filed: rec.getValue(rec.columns[1]),
                        fee_account: rec.getValue(rec.columns[2]),
                        amount_type: rec.getValue(rec.columns[3]),
                        isAccountPayable: rec.getValue(rec.columns[4]),
                        plateform: rec.getValue(rec.columns[6]),
                        journalMemo: rec.getValue(rec.columns[7]),
                        debitCredit: debitCredit,
                    });
                    return true;
                });
                log.audit('fee_account', fee_account);


                var seller_skus = [];
                var fee_filters = [
                    { name: 'isinactive', operator: search.Operator.IS, values: false },
                    { name: 'custrecord_swc_sett_resolved', operator: 'is', values: false },
                    { name: 'custrecord_swc_xl_currency', operator: 'is', values: obj.sett_currency },
                ]
                if (sett_id != '- None -') {
                    fee_filters.push({ name: 'custrecord_swc_settlement_documentid', operator: 'is', values: sett_id })
                } else {
                    fee_filters.push({ name: 'custrecord_swc_settlement_documentid', operator: 'isempty' })
                }
                if (order_id != '- None -') {
                    fee_filters.push({ name: 'custrecord_swc_original_orderid', operator: 'is', values: order_id })
                } else {
                    fee_filters.push({ name: 'custrecord_swc_original_orderid', operator: 'isempty' })
                }
                fee_filters.push({ name: 'custrecord_swc_accounting_date', operator: 'on', values: accounting_date });
                log.debug('fee_filters', fee_filters);
                var lx_fee_columns = [
                    { name: 'custrecord_swc_accounting_date' },
                    { name: 'custrecord_swc_xl_sku' },
                    { name: 'custrecord_swc_xl_currency' },
                    { name: 'custrecord_swc_platform' },
                    { name: 'custrecord_swc_ac_type' },
                    { name: 'custrecord_swc_rpa_so_link' },
                ]
                for (let i = 0; i < fee_account.length; i++) {
                    if (fee_account[i].fee_filed) {
                        lx_fee_columns.push({ name: fee_account[i].fee_filed })
                    }
                }
                log.audit('lx_fee_columns', lx_fee_columns);
                var mySearch = search.create({
                    type: settlement_record_type,
                    filters: fee_filters,
                    columns: lx_fee_columns
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
                for (var i = 0; i < pageCount; i++) {
                    pageData.fetch({
                        index: i
                    }).data.forEach(function (rec) {
                        settlement_ids.push(rec.id);
                        // if (!accounting_date) {
                        //     accounting_date = rec.getValue('custrecord_swc_accounting_date');
                        // }
                        if (!platform_id) {
                            platform_id = rec.getValue('custrecord_swc_platform');
                        }
                        // if (!currency_text) {
                        //     currency_text = rec.getValue('custrecord_swc_xl_currency');
                        //     log.debug('currency_text', currency_text);
                        // }
                        var msku = rec.getValue('custrecord_swc_xl_sku');
                        log.audit('msku', msku);

                        let so_link = rec.getValue('custrecord_swc_rpa_so_link');
                        if (so_link) {
                            if (so_link.indexOf(',') != -1) {
                                var sls = so_link.split(',');
                                for (let j = 0; j < sls.length; j++) {
                                    so_ids.push(sls[j])
                                }
                            } else {
                                so_ids.push(so_link)
                            }
                        }

                        for (let k = 0; k < fee_account.length; k++) {
                            if (fee_account[k].fee_filed && fee_account[k].plateform == platform_id) {
                                var amount = rec.getValue(fee_account[k].fee_filed) || 0;

                                var fee = Math.round(parseFloat(amount) * 100) / 100;
                                if (Number(fee) != 0) {
                                    FeeTypeArray.push({
                                        "amount": fee,
                                        "fee_account": fee_account[k].fee_account,
                                        "amount_type": fee_account[k].amount_type,
                                        // "fee_cd": fee_account[k].fee_cd,
                                        "sku": rec.getValue('custrecord_swc_xl_sku'),
                                        "ac_type": rec.getValue('custrecord_swc_ac_type'),
                                        "isAccountPayable": fee_account[k].isAccountPayable,
                                        "debitCredit": fee_account[k].debitCredit,
                                        "journalMemo": fee_account[k].journalMemo,
                                        "sku_info": {},
                                    });
                                }
                            }
                        }

                        if (seller_skus.length) {
                            var flag = true;
                            for (let j = 0; j < seller_skus.length; j++) {
                                if (seller_skus[j].sku == msku) {
                                    flag = false;
                                    break
                                }
                            }
                            if (flag) {
                                seller_skus.push({
                                    sku: msku,
                                });
                            }
                        } else {
                            seller_skus.push({
                                sku: msku,
                            });
                        }

                    });
                }
                if (so_ids.length) {
                    so_ids = [...new Set(so_ids)];
                }
                log.audit('so_ids', so_ids);
                if (settlement_ids.length) {
                    settlement_ids = [...new Set(settlement_ids)];
                }
                log.audit('settlement_ids', settlement_ids);
                log.audit('FeeTypeArray', FeeTypeArray);
                log.audit('FeeTypeArray length', FeeTypeArray.length);


                //匹配sku信息
                if (FeeTypeArray.length && seller_skus.length) {
                    SearchSKU(seller_skus, real_acc_info.id);

                    for (let i = 0; i < FeeTypeArray.length; i++) {
                        for (let j = 0; j < seller_skus.length; j++) {
                            if (FeeTypeArray[i].sku == seller_skus[j].sku) {
                                FeeTypeArray[i].sku_info = seller_skus[j];
                            }
                        }
                    }
                }

                var SK_FeeTypeArray = [], TK_FeeTypeArray = [], FY_FeeTypeArray = [], SJ_FeeTypeArray = [], GG_FeeTypeArray = [];
                for (let i = 0; i < FeeTypeArray.length; i++) {
                    if (FeeTypeArray[i].amount_type == '收款') {
                        SK_FeeTypeArray.push(FeeTypeArray[i]);
                    }
                    else if (FeeTypeArray[i].amount_type == '退款') {
                        TK_FeeTypeArray.push(FeeTypeArray[i]);
                    }
                    else if (FeeTypeArray[i].amount_type == '费用') {
                        FY_FeeTypeArray.push(FeeTypeArray[i]);
                    }
                    else if (FeeTypeArray[i].amount_type == '税金') {
                        SJ_FeeTypeArray.push(FeeTypeArray[i]);
                    }
                    else if (FeeTypeArray[i].amount_type == '广告') {
                        GG_FeeTypeArray.push(FeeTypeArray[i]);
                    }
                }
                log.audit('SK_FeeTypeArray', SK_FeeTypeArray);
                log.audit('TK_FeeTypeArray', TK_FeeTypeArray);
                log.audit('FY_FeeTypeArray', FY_FeeTypeArray);
                log.audit('SJ_FeeTypeArray', SJ_FeeTypeArray);
                log.audit('GG_FeeTypeArray', GG_FeeTypeArray);

                if (currency_text != '- None -') {
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
                        throw '货币代码找不到对应货币,请维护对应货币：' + currency_text;
                    }
                } else {
                    throw '无货币，暂时没处理逻辑' + currency_text;
                    currency_id = real_acc_info.info.currency;
                }


                sett_entity = real_acc_info.id;
                sett_acc = real_acc_info.id
                sett_acc_text = real_acc_info.entityid
                sett_subsidiary = real_acc_info.subsidiary;
                sett_payment_account = real_acc_info.payment_account;
                sett_currency = currency_id;
                sett_currency_text = currency_text;

                if (!sett_payment_account) {
                    throw '客户 付款科目(平台应收) 为空,请维护';
                }


                var Account, cus_account_name;
                search.create({
                    type: 'customer',
                    filters: [
                        { name: 'internalId', operator: 'is', values: sett_entity },
                    ],
                    columns: [
                        { name: 'receivablesaccount' },
                    ]
                }).run().each(function (rec) {
                    log.audit('customer rec', rec);
                    cus_account_name = rec.getValue('receivablesaccount');
                });
                if (cus_account_name == '使用系统首选项' || cus_account_name == 'Use System Preference') {
                    var configRecObj = config.load({ type: config.Type.ACCOUNTING_PREFERENCES });
                    Account = configRecObj.getValue('ARACCOUNT');
                } else {
                    // Account = cus_account_name;
                    var cus_rec = record.load({ type: 'customer', id: sett_entity });
                    Account = cus_rec.getValue('receivablesaccount');
                }
                log.audit('Account', Account);
                if (!Account) {
                    throw '客户应收科目为空,请维护';
                }


                var jo_fy_id, jo_sk_id, jo_tk_id, jo_sj_id, jo_gg_id;
                if (FY_FeeTypeArray.length) {
                    log.audit('FY_FeeTypeArray', '费用凭证');
                    var DR_FY = 0, funds_fy = 0, AP_FY = 0;
                    var jour_fy = record.create({ type: 'journalentry', isDynamic: true });
                    jour_fy.setValue({ fieldId: 'subsidiary', value: sett_subsidiary });
                    jour_fy.setValue({ fieldId: 'currency', value: sett_currency });
                    jour_fy.setValue({ fieldId: 'trandate', value: format.parse({ value: accounting_date, type: 'date' }) });
                    jour_fy.setValue({ fieldId: 'memo', value: sett_id });
                    jour_fy.setValue({ fieldId: 'approvalstatus', value: 2 });
                    if (sett_id != '- None -') {
                        jour_fy.setValue({ fieldId: 'custbody_swc_settlement_id', value: sett_id });
                    }
                    if (order_id != '- None -') {
                        jour_fy.setValue({ fieldId: 'custbody_swc_platform_order_number', value: order_id });
                    }
                    jour_fy.setValue({ fieldId: 'custbody_swc_relation_so', value: so_ids });
                    jour_fy.setValue({ fieldId: 'custbody_swc_relation_xl_settlement', value: settlement_ids });
                    jour_fy.setValue({ fieldId: 'custbody_swc_journal_type', value: "7" });  //结算报告-费用日记账
                    jour_fy.setValue({ fieldId: 'custbody_swc_voucher_type', value: "费用凭证" });  //当前凭证

                    FY_FeeTypeArray.map(function (obj) {
                        log.audit('FeeTypeArray obj', obj);
                        if (obj.fee_account) {
                            if (Number(obj.amount) != 0) {
                                var x = Number(obj.amount).toFixed(2);
                                log.debug('x', x);
                                if (sett_currency_text == 'JPY') {
                                    x = Number(x).toFixed(0)
                                }
                                // DR_FY = interface.accAdd(Number(DR_FY), Number(x));
                                // log.debug('DR_FY', DR_FY);

                                if (obj.isAccountPayable) {
                                    if (obj.debitCredit == 'credit') {
                                        AP_FY = interface.accAdd(Number(AP_FY), Number(x));
                                    } else {
                                        AP_FY = interface.accSub(Number(AP_FY), Number(x));
                                    }
                                }

                                jour_fy.selectNewLine({ sublistId: 'line' });
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: obj.fee_account });
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj.journalMemo });
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: obj.debitCredit, value: x });
                                // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: x }); // 借
                                // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: x }); // 贷
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "费用凭证" });
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                                obj.sku_info.item_text ? jour_fy.setCurrentSublistText({ sublistId: 'line', fieldId: "custcol_swc_main_sku", text: obj.sku_info.item_text }) : '';
                                jour_fy.commitLine({ sublistId: 'line' });

                                jour_fy.selectNewLine({ sublistId: 'line' })
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: sett_payment_account }) //应收账款-平台
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj.journalMemo });
                                if (obj.debitCredit == 'credit') {
                                    jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: x }) //借
                                } else {
                                    jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: x }) //贷
                                }
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "费用凭证" });
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                                jour_fy.commitLine({ sublistId: 'line' })
                            }
                        }
                    });

                    log.audit('AP_FY', AP_FY);
                    if (Number(AP_FY) != 0) {
                        var v_Account, v_account_name;
                        // search.create({
                        //     type: 'vendor',
                        //     filters: [
                        //         { name: 'internalId', operator: 'is', values: sett_entity },
                        //     ],
                        //     columns: [
                        //         { name: 'payablesaccount' },
                        //     ]
                        // }).run().each(function (rec) {
                        //     log.audit('customer rec', rec);
                        //     v_account_name = rec.getValue('payablesaccount');
                        // });
                        // log.audit('v_account_name', v_account_name);
                        // if (!v_account_name) {
                        //     //|| v_account_name == '使用系统首选项' || v_account_name == 'Use System Preference'
                        //     var configRecObj = config.load({ type: config.Type.ACCOUNTING_PREFERENCES });
                        //     v_Account = configRecObj.getValue('PAYMENTACCOUNT');
                        //     log.audit('v_Account -1', v_Account);
                        // } else {
                        //     // var v_rec = record.load({ type: 'vendor', id: sett_entity });
                        //     // v_Account = v_rec.getValue('payablesaccount');
                        //     v_Account = v_account_name;
                        // }
                        // log.audit('v_Account', v_Account);

                        // if (!v_Account) {
                        //     throw '客户对应供应商 默认应付账款科目 为空,请维护';
                        // }

                        //TODO:测试环境ID 1559
                        //TODO:生产环境ID 502
                        if (runtime.accountId == '11297254_SB1') {
                            v_Account = '1559';  //1559 2202.07	应付账款-平台
                        } else {
                            v_Account = '502';//502    2202.05 平台
                        }



                        jour_fy.selectNewLine({ sublistId: 'line' })
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: v_Account });
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: AP_FY }) //贷
                        // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: AP_FY }) //借
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "费用凭证" });
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                        // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "memo", value: sett_id });
                        jour_fy.commitLine({ sublistId: 'line' })
                        jour_fy.selectNewLine({ sublistId: 'line' })
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: v_Account });
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                        // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: AP_FY }) //贷
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: AP_FY }) //借
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "费用凭证" });
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                        // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "memo", value: sett_id });
                        jour_fy.commitLine({ sublistId: 'line' })
                    }

                    // funds_fy = DR_FY //结算的金额total，计入费用凭证
                    // log.debug('funds_fy', funds_fy);


                    // jour_fy.selectNewLine({ sublistId: 'line' })
                    // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: sett_payment_account }) //应收账款-平台
                    // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                    // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: funds_fy }) //贷
                    // // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: funds_fy }) //借
                    // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "费用凭证" });
                    // // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "memo", value: sett_id });
                    // jour_fy.commitLine({ sublistId: 'line' })
                    jo_fy_id = jour_fy.save({ ignoreMandatoryFields: true });
                    log.debug('生成费用凭证:', jo_fy_id);
                }

                if (SK_FeeTypeArray.length) {
                    if (platform_id != '9') {
                        //Shopify 平台存在订单货币与结算货币不一致情况,用另外的脚本处理

                        log.audit('SK_FeeTypeArray', '收款凭证');
                        var DR_SK = 0, funds_sk = 0;
                        var cs_sk_cout = 1, db_sk_cout = 1;
                        var jour_sk = record.create({ type: 'journalentry', isDynamic: true });
                        jour_sk.setValue({ fieldId: 'subsidiary', value: sett_subsidiary });
                        jour_sk.setValue({ fieldId: 'currency', value: sett_currency });
                        jour_sk.setValue({ fieldId: 'trandate', value: format.parse({ value: accounting_date, type: 'date' }) });
                        jour_sk.setValue({ fieldId: 'memo', value: sett_id });
                        jour_sk.setValue({ fieldId: 'approvalstatus', value: 2 });
                        if (sett_id != '- None -') {
                            jour_sk.setValue({ fieldId: 'custbody_swc_settlement_id', value: sett_id });
                        }
                        if (order_id != '- None -') {
                            jour_sk.setValue({ fieldId: 'custbody_swc_platform_order_number', value: order_id });
                        }
                        jour_sk.setValue({ fieldId: 'custbody_swc_relation_so', value: so_ids });
                        jour_sk.setValue({ fieldId: 'custbody_swc_relation_xl_settlement', value: settlement_ids });
                        jour_sk.setValue({ fieldId: 'custbody_swc_journal_type', value: "5" });  //结算报告-收款日记账
                        jour_sk.setValue({ fieldId: 'custbody_swc_voucher_type', value: "收款凭证" });  //当前凭证

                        SK_FeeTypeArray.map(function (obj) {
                            log.audit('FeeTypeArray obj', obj);
                            if (obj.fee_account) {
                                if (Number(obj.amount) != 0) {
                                    var x = Number(obj.amount).toFixed(2);
                                    log.debug('x', x);
                                    if (sett_currency_text == 'JPY') {
                                        x = Number(x).toFixed(0)
                                    }
                                    // DR_SK = interface.accAdd(Number(DR_SK), Number(x));
                                    if (obj.debitCredit == 'credit') {
                                        DR_SK = interface.accAdd(Number(DR_SK), Number(x));
                                        cs_sk_cout++;
                                    } else {
                                        DR_SK = interface.accSub(Number(DR_SK), Number(x));
                                        db_sk_cout++;
                                    }
                                    log.debug('DR_SK', DR_SK);
                                    jour_sk.selectNewLine({ sublistId: 'line' });
                                    jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: obj.fee_account });
                                    jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                                    jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj.journalMemo });
                                    jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: obj.debitCredit, value: x });
                                    // jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: x }); // 借
                                    // jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: x }); // 贷
                                    jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "收款凭证" });
                                    jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                                    obj.sku_info.item_text ? jour_sk.setCurrentSublistText({ sublistId: 'line', fieldId: "custcol_swc_main_sku", text: obj.sku_info.item_text }) : '';
                                    jour_sk.commitLine({ sublistId: 'line' });
                                }
                            }
                        });


                        funds_sk = DR_SK //结算的金额total，计入费用凭证
                        log.debug('funds_sk', funds_sk);

                        jour_sk.selectNewLine({ sublistId: 'line' })
                        jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: sett_payment_account }) //应收账款-平台
                        jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                        jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: '收款' });
                        if (Number(cs_sk_cout) > Number(db_sk_cout)) {
                            jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: funds_sk }) //借
                        } else {
                            jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: funds_sk }) //贷
                        }
                        // jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: funds_sk }) //贷
                        // jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: funds_sk }) //借
                        jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "收款凭证" });
                        jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                        // jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "memo", value: sett_id });
                        jour_sk.commitLine({ sublistId: 'line' })
                        jo_sk_id = jour_sk.save({ ignoreMandatoryFields: true });
                        log.debug('生成收款凭证:', jo_sk_id);
                    }
                }

                if (TK_FeeTypeArray.length) {
                    if (platform_id != '9') {
                        //Shopify 平台存在订单货币与结算货币不一致情况,用另外的脚本处理

                        log.audit('TK_FeeTypeArray', '退款凭证');
                        var DR_TK = 0, funds_tk = 0;
                        var cd_tk_cout = 1, db_tk_cout = 1;
                        var jour_tk = record.create({ type: 'journalentry', isDynamic: true });
                        jour_tk.setValue({ fieldId: 'subsidiary', value: sett_subsidiary });
                        jour_tk.setValue({ fieldId: 'currency', value: sett_currency });
                        jour_tk.setValue({ fieldId: 'trandate', value: format.parse({ value: accounting_date, type: 'date' }) });
                        jour_tk.setValue({ fieldId: 'memo', value: sett_id });
                        jour_tk.setValue({ fieldId: 'approvalstatus', value: 2 });
                        if (sett_id != '- None -') {
                            jour_tk.setValue({ fieldId: 'custbody_swc_settlement_id', value: sett_id });
                        }
                        if (order_id != '- None -') {
                            jour_tk.setValue({ fieldId: 'custbody_swc_platform_order_number', value: order_id });
                        }
                        jour_tk.setValue({ fieldId: 'custbody_swc_relation_so', value: so_ids });
                        jour_tk.setValue({ fieldId: 'custbody_swc_relation_xl_settlement', value: settlement_ids });
                        jour_tk.setValue({ fieldId: 'custbody_swc_journal_type', value: "6" });  //结算报告-退款日记账
                        jour_tk.setValue({ fieldId: 'custbody_swc_voucher_type', value: "退款凭证" });  //当前凭证

                        TK_FeeTypeArray.map(function (obj) {
                            log.audit('FeeTypeArray obj', obj);
                            if (obj.fee_account) {
                                if (Number(obj.amount) != 0) {
                                    var x = Number(obj.amount).toFixed(2);
                                    log.debug('x', x);
                                    if (sett_currency_text == 'JPY') {
                                        x = Number(x).toFixed(0)
                                    }
                                    // DR_TK = interface.accAdd(Number(DR_TK), Number(x));
                                    if (obj.debitCredit == 'credit') {
                                        DR_TK = interface.accAdd(Number(DR_TK), Number(x));
                                        cd_tk_cout++;
                                    } else {
                                        DR_TK = interface.accSub(Number(DR_TK), Number(x));
                                        db_tk_cout++;
                                    }
                                    log.debug('DR_TK', DR_TK);
                                    jour_tk.selectNewLine({ sublistId: 'line' });
                                    jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: obj.fee_account });
                                    jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                                    jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj.journalMemo });
                                    jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: obj.debitCredit, value: x });
                                    // jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: x }); // 贷
                                    // jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: x }); // 借
                                    jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "退款凭证" });
                                    jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                                    obj.sku_info.item_text ? jour_tk.setCurrentSublistText({ sublistId: 'line', fieldId: "custcol_swc_main_sku", text: obj.sku_info.item_text }) : '';
                                    jour_tk.commitLine({ sublistId: 'line' });
                                }
                            }
                        });


                        funds_tk = DR_TK //结算的金额total，计入费用凭证
                        log.debug('funds_tk', funds_tk);

                        jour_tk.selectNewLine({ sublistId: 'line' })
                        jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: sett_payment_account }) //应收账款-平台
                        jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                        jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: '退款' });
                        if (Number(cd_tk_cout) > Number(db_tk_cout)) {
                            jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: funds_tk }) //借
                        } else {
                            jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: funds_tk }) //贷
                        }
                        // jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: funds_tk }) //借
                        // jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: funds_tk }) //贷
                        jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "退款凭证" });
                        jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                        // jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "memo", value: sett_id });
                        jour_tk.commitLine({ sublistId: 'line' })

                        if (Number(funds_tk) > 0) {
                            let DR_TK_2 = 0, funds_tk_2 = 0;
                            let cd_tk_cout_2 = 1, db_tk_cout_2 = 1;
                            jour_tk.setValue({ fieldId: 'custbody_swc_write_off_invoice_credit', value: true });


                            TK_FeeTypeArray.map(function (obj_2) {
                                log.audit('FeeTypeArray obj', obj_2);
                                let set_cd_2 = '';
                                if (obj_2.fee_account) {
                                    if (Number(obj_2.amount) != 0) {
                                        var y = Number(obj_2.amount).toFixed(2);
                                        log.debug('y', y);
                                        if (sett_currency_text == 'JPY') {
                                            y = Number(y).toFixed(0)
                                        }
                                        if (obj_2.debitCredit == 'credit') {
                                            DR_TK_2 = interface.accAdd(Number(DR_TK_2), Number(y));
                                            cd_tk_cout_2++;
                                            set_cd_2 = 'debit';
                                        } else {
                                            DR_TK_2 = interface.accSub(Number(DR_TK_2), Number(y));
                                            db_tk_cout_2++;
                                            set_cd_2 = 'credit';
                                        }
                                        log.debug('DR_TK_2', DR_TK_2);
                                        jour_tk.selectNewLine({ sublistId: 'line' });
                                        jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: obj_2.fee_account });
                                        jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                                        log.audit('sett_entity', sett_entity);
                                        jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj_2.journalMemo });
                                        jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: set_cd_2, value: y });
                                        // jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: x }); // 贷
                                        // jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: x }); // 借
                                        jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "退款凭证" });
                                        jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                                        obj_2.sku_info.item_text ? jour_tk.setCurrentSublistText({ sublistId: 'line', fieldId: "custcol_swc_main_sku", text: obj_2.sku_info.item_text }) : '';
                                        jour_tk.commitLine({ sublistId: 'line' });
                                    }
                                }
                            });

                            funds_tk_2 = DR_TK_2 //结算的金额total，计入费用凭证
                            log.debug('funds_tk_2', funds_tk_2);

                            let incomeaccount = '';
                            //TODO:测试环境ID 54
                            //TODO:生产环境ID 54
                            if (runtime.accountId == '11297254_SB1') {
                                incomeaccount = '54';  //54 4000 Sales
                            } else {
                                incomeaccount = '54';  //54 4000 Sales
                            }

                            jour_tk.selectNewLine({ sublistId: 'line' })
                            jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: incomeaccount })
                            jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                            jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: '退款' });
                            if (Number(cd_tk_cout_2) > Number(db_tk_cout_2)) {
                                jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: funds_tk_2 }) //借
                            } else {
                                jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: funds_tk_2 }) //贷
                            }
                            // jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: funds_tk }) //借
                            // jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: funds_tk }) //贷
                            jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "退款凭证" });
                            jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                            // jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "memo", value: sett_id });
                            jour_tk.commitLine({ sublistId: 'line' })
                        }

                        jo_tk_id = jour_tk.save({ ignoreMandatoryFields: true });
                        log.debug('生成退款凭证:', jo_tk_id);
                    }
                }

                if (SJ_FeeTypeArray.length) {
                    log.audit('SJ_FeeTypeArray', '税金凭证');
                    if (real_acc_info.tax_mode == '2') {
                        //纳税模式 为 代扣代缴 才生成税金日记账
                        var DR_SJ = 0, funds_sj = 0;
                        var jour_sj = record.create({ type: 'journalentry', isDynamic: true });
                        jour_sj.setValue({ fieldId: 'subsidiary', value: sett_subsidiary });
                        jour_sj.setValue({ fieldId: 'currency', value: sett_currency });
                        jour_sj.setValue({ fieldId: 'trandate', value: format.parse({ value: accounting_date, type: 'date' }) });
                        jour_sj.setValue({ fieldId: 'memo', value: sett_id });
                        jour_sj.setValue({ fieldId: 'approvalstatus', value: 2 });
                        if (sett_id != '- None -') {
                            jour_sj.setValue({ fieldId: 'custbody_swc_settlement_id', value: sett_id });
                        }
                        if (order_id != '- None -') {
                            jour_sj.setValue({ fieldId: 'custbody_swc_platform_order_number', value: order_id });
                        }
                        jour_sj.setValue({ fieldId: 'custbody_swc_relation_so', value: so_ids });
                        jour_sj.setValue({ fieldId: 'custbody_swc_relation_xl_settlement', value: settlement_ids });
                        jour_sj.setValue({ fieldId: 'custbody_swc_journal_type', value: "12" });  //结算报告_代扣代缴日记账
                        jour_sj.setValue({ fieldId: 'custbody_swc_voucher_type', value: "代扣代缴日记账" });  //当前凭证

                        SJ_FeeTypeArray.map(function (obj) {
                            log.audit('FeeTypeArray obj', obj);
                            if (obj.fee_account) {
                                if (Number(obj.amount) != 0) {
                                    var x = Number(obj.amount).toFixed(2);
                                    log.debug('x', x);
                                    if (sett_currency_text == 'JPY') {
                                        x = Number(x).toFixed(0)
                                    }
                                    DR_SJ = interface.accAdd(Number(DR_SJ), Number(x));
                                    log.debug('DR_SJ', DR_SJ);
                                    jour_sj.selectNewLine({ sublistId: 'line' });
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: obj.fee_account });
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj.journalMemo });
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: x }); // 贷
                                    // jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: x }); // 借
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "代扣代缴日记账" });
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                                    obj.sku_info.item_text ? jour_sj.setCurrentSublistText({ sublistId: 'line', fieldId: "custcol_swc_main_sku", text: obj.sku_info.item_text }) : '';
                                    jour_sj.commitLine({ sublistId: 'line' });

                                    jour_sj.selectNewLine({ sublistId: 'line' })
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: sett_payment_account }) //应收账款-平台
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj.journalMemo });
                                    if (obj.debitCredit == 'credit') {
                                        jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: x }) //借
                                    } else {
                                        jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: x }) //贷
                                    }
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "代扣代缴日记账" });
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                                    // obj.sku_info.item_text ? jour_sj.setCurrentSublistText({ sublistId: 'line', fieldId: "custcol_swc_main_sku", text: obj.sku_info.item_text }) : '';
                                    jour_sj.commitLine({ sublistId: 'line' })
                                }
                            }
                        });


                        // funds_sj = DR_SJ //结算的金额total，计入费用凭证
                        // log.debug('funds_sj', funds_sj);

                        // jour_sj.selectNewLine({ sublistId: 'line' })
                        // jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: SJ_FeeTypeArray[0].fee_account })
                        // jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                        // jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: funds_sj }) //借
                        // // jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: funds_sj }) //贷
                        // jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "代扣代缴日记账" });
                        // // jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "memo", value: sett_id });
                        // jour_sj.commitLine({ sublistId: 'line' })
                        jo_sj_id = jour_sj.save({ ignoreMandatoryFields: true });
                        log.debug('生成税金凭证:', jo_sj_id);
                    }
                }

                if (GG_FeeTypeArray.length) {
                    if (real_acc_info.auto_offset_adv_bill) {
                        var DR_GG = 0, funds_gg = 0;
                        var cd_gg_cout = 1, db_gg_cout = 1;
                        var jour_gg = record.create({ type: 'journalentry', isDynamic: true });
                        jour_gg.setValue({ fieldId: 'subsidiary', value: sett_subsidiary });
                        jour_gg.setValue({ fieldId: 'currency', value: sett_currency });
                        jour_gg.setValue({ fieldId: 'trandate', value: format.parse({ value: accounting_date, type: 'date' }) });
                        jour_gg.setValue({ fieldId: 'memo', value: sett_id });
                        jour_gg.setValue({ fieldId: 'approvalstatus', value: 2 });
                        if (sett_id != '- None -') {
                            jour_gg.setValue({ fieldId: 'custbody_swc_settlement_id', value: sett_id });
                        }
                        if (order_id != '- None -') {
                            jour_gg.setValue({ fieldId: 'custbody_swc_platform_order_number', value: order_id });
                        }
                        jour_gg.setValue({ fieldId: 'custbody_swc_relation_so', value: so_ids });
                        jour_gg.setValue({ fieldId: 'custbody_swc_relation_xl_settlement', value: settlement_ids });
                        jour_gg.setValue({ fieldId: 'custbody_swc_journal_type', value: "14" });  //结算报告-广告日记账
                        jour_gg.setValue({ fieldId: 'custbody_swc_voucher_type', value: "广告凭证" });  //当前凭证

                        GG_FeeTypeArray.map(function (obj) {
                            log.audit('FeeTypeArray obj', obj);
                            if (obj.fee_account) {
                                if (Number(obj.amount) != 0) {
                                    var x = Number(obj.amount).toFixed(2);
                                    log.debug('x', x);
                                    if (sett_currency_text == 'JPY') {
                                        x = Number(x).toFixed(0)
                                    }
                                    if (obj.debitCredit == 'credit') {
                                        DR_GG = interface.accAdd(Number(DR_GG), Number(x));
                                        cd_gg_cout++;
                                    } else {
                                        DR_GG = interface.accSub(Number(DR_GG), Number(x));
                                        db_gg_cout++;
                                    }
                                    log.debug('DR_GG', DR_GG);

                                    jour_gg.selectNewLine({ sublistId: 'line' });
                                    jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: obj.fee_account });
                                    jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                                    jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj.journalMemo });
                                    jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: obj.debitCredit, value: x });
                                    jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "广告凭证" });
                                    jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                                    obj.sku_info.item_text ? jour_gg.setCurrentSublistText({ sublistId: 'line', fieldId: "custcol_swc_main_sku", text: obj.sku_info.item_text }) : '';
                                    jour_gg.commitLine({ sublistId: 'line' });
                                }
                            }
                        });


                        funds_gg = DR_GG //结算的金额total，计入费用凭证
                        log.debug('funds_gg', funds_gg);

                        jour_gg.selectNewLine({ sublistId: 'line' })
                        jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: sett_payment_account }) //应收账款-平台
                        jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                        jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: '广告' });
                        if (Number(cd_gg_cout) > Number(db_gg_cout)) {
                            jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: funds_gg }) //借
                        } else {
                            jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: funds_gg }) //贷
                        }
                        jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "广告凭证" });
                        jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                        jour_gg.commitLine({ sublistId: 'line' })

                        jo_gg_id = jour_gg.save({ ignoreMandatoryFields: true });
                        log.debug('生成广告凭证:', jo_gg_id);
                    }
                }

                for (var i = 0; i < settlement_ids.length; i++) {
                    context.write({
                        key: sett_id + '.' + settlement_ids[i],
                        value: {
                            'id': settlement_ids[i],
                            'sett_id': sett_id,
                            'jo_fy_id': jo_fy_id,
                            'jo_sk_id': jo_sk_id,
                            'jo_tk_id': jo_tk_id,
                            'jo_sj_id': jo_sj_id,
                            'jo_gg_id': jo_gg_id,
                            'type': 'jour',
                        }
                    });
                }

            } catch (err) {
                log.error('map error', err);
                if (jo_fy_id) {
                    record.delete({
                        type: 'journalentry',
                        id: jo_fy_id
                    });
                }
                if (jo_sk_id) {
                    record.delete({
                        type: 'journalentry',
                        id: jo_sk_id
                    });
                }
                if (jo_tk_id) {
                    record.delete({
                        type: 'journalentry',
                        id: jo_tk_id
                    });
                }
                if (jo_sj_id) {
                    record.delete({
                        type: 'journalentry',
                        id: jo_sj_id
                    });
                }
                if (jo_gg_id) {
                    record.delete({
                        type: 'journalentry',
                        id: jo_gg_id
                    });
                }
                if (settlement_ids.length > 0) {
                    var e = err.message ? err.message : err;
                    for (var i = 0; i < settlement_ids.length; i++) {
                        context.write({
                            key: sett_id + '.' + settlement_ids[i],
                            value: {
                                'id': settlement_ids[i],
                                'sett_id': sett_id,
                                'type': 'map_error',
                                'msg': e,
                            }
                        });
                    }
                }
            }
            var endTime = new Date().getTime();
            log.emergency('map 结束', endTime);
            log.emergency('map 耗时', (endTime - startTime) + '......' + JSON.stringify(obj));
        }

        function reduce(context) {
            var startTime = new Date().getTime();
            log.emergency('reduce 开始', startTime);
            log.debug("reduce context", JSON.stringify(context))
            log.audit('reduce key', context.key);

            var v = context.values
            v.map(function (obj) {
                try {
                    obj = JSON.parse(obj);
                    log.debug('obj', obj);
                    var rec = record.load({ type: settlement_record_type, id: obj.id });
                    var retry = rec.getValue('custrecord_swc_sett_retry');
                    if (Number(retry) > 1000) {
                        retry = 1;
                    }
                    if (obj.type == 'jour') {
                        rec.setValue({ fieldId: 'custrecord_swc_sett_error', value: '' });
                        rec.setValue({ fieldId: 'custrecord_swc_sett_resolved', value: true });
                        if (obj.jo_fy_id) {
                            rec.setValue({ fieldId: 'custrecord_swc_settlemenreport_journal', value: obj.jo_fy_id });
                        }
                        if (obj.jo_sk_id) {
                            rec.setValue({ fieldId: 'custrecord_swc_journal_income', value: obj.jo_sk_id });
                        }
                        if (obj.jo_tk_id) {
                            rec.setValue({ fieldId: 'custrecord_swc_journal_refund', value: obj.jo_tk_id });
                        }
                        if (obj.jo_sj_id) {
                            rec.setValue({ fieldId: 'custrecord_swc_tax_journal', value: obj.jo_sj_id });
                        }
                        if (obj.jo_gg_id) {
                            rec.setValue({ fieldId: 'custrecord_swc_adv_journal', value: obj.jo_gg_id });
                        }
                        rec.setValue({ fieldId: 'custrecord_swc_sett_retry', value: 0 });
                    }
                    else if (obj.type == 'map_error') {
                        rec.setValue({ fieldId: 'custrecord_swc_sett_error', value: obj.msg });
                        rec.setValue({ fieldId: 'custrecord_swc_sett_retry', value: Number(retry) + 1 });
                    }

                    var st_id = rec.save({ ignoreMandatoryFields: true });
                    log.audit('st_id', st_id);
                } catch (error) {
                    log.error('reduce error', error);
                    var start = new Date().getTime();
                    for (var i = 0; i < 1e7; i++) {
                        if ((new Date().getTime() - start) > 1000) {
                            break;
                        }
                    }

                    obj = JSON.parse(obj);
                    log.debug('obj', obj);
                    var rec = record.load({ type: settlement_record_type, id: obj.id });
                    var retry = rec.getValue('custrecord_swc_sett_retry');
                    if (Number(retry) > 1000) {
                        retry = 1;
                    }
                    if (obj.type == 'jour') {
                        rec.setValue({ fieldId: 'custrecord_swc_sett_error', value: '' });
                        rec.setValue({ fieldId: 'custrecord_swc_sett_resolved_ca', value: true });
                        if (obj.jo_fy_id) {
                            rec.setValue({ fieldId: 'custrecord_swc_settlemenreport_journal', value: obj.jo_fy_id });
                        }
                        if (obj.jo_sk_id) {
                            rec.setValue({ fieldId: 'custrecord_swc_journal_income', value: obj.jo_sk_id });
                        }
                        if (obj.jo_tk_id) {
                            rec.setValue({ fieldId: 'custrecord_swc_journal_refund', value: obj.jo_tk_id });
                        }
                        if (obj.jo_sj_id) {
                            rec.setValue({ fieldId: 'custrecord_swc_tax_journal', value: obj.jo_sj_id });
                        }
                        rec.setValue({ fieldId: 'custrecord_swc_sett_retry', value: 0 });
                    }
                    else if (obj.type == 'map_error') {
                        rec.setValue({ fieldId: 'custrecord_swc_sett_error', value: obj.msg });
                        rec.setValue({ fieldId: 'custrecord_swc_sett_retry', value: Number(retry) + 1 });
                    }

                    var st_id = rec.save({ ignoreMandatoryFields: true });
                    log.audit('st_id', st_id);
                }

            });
            var endTime = new Date().getTime();
            var parms = {
                settlement_id: context.key.split('.')[0],
            }
            log.emergency('reduce 结束', endTime);
            log.emergency('reduce 耗时', (endTime - startTime) + '......' + JSON.stringify(parms));
        }

        function summarize(summary) {
        }

        function SearchSKU(skuInfo, acc_id) {
            try {
                log.audit('SearchSKU', skuInfo);

                var itemFilters = [
                    ['isinactive', 'is', false], 'and',
                    ['custrecord_swc_pt_sku_map_store', 'anyof', acc_id]
                ];
                var filters = [];
                for (let i = 0; i < skuInfo.length; i++) {
                    if (skuInfo[i].sku) {
                        if (filters.length) {
                            filters.push('or', ['custrecord_swc_pt_sku_map_msku', 'is', skuInfo[i].sku])
                        } else {
                            filters.push(['custrecord_swc_pt_sku_map_msku', 'is', skuInfo[i].sku])
                        }
                    }
                }
                if (filters.length) {
                    itemFilters.push('and')
                    itemFilters.push(filters)
                }

                var s_sku_info = [];
                var mySearch = search.create({
                    type: 'customrecord_swc_platform_sku_mapping',
                    filters: itemFilters,
                    columns: [
                        { name: 'custrecord_swc_pt_sku_map_item' },
                        { name: 'custrecord_swc_pt_sku_map_msku' },
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
                            item_id: rec.getValue('custrecord_swc_pt_sku_map_item'),
                            item_text: rec.getText('custrecord_swc_pt_sku_map_item'),
                            sku: rec.getValue('custrecord_swc_pt_sku_map_msku')
                        });
                    });
                }
                log.audit('s_sku_info', s_sku_info);


                for (let i = 0; i < skuInfo.length; i++) {
                    for (let j = 0; j < s_sku_info.length; j++) {
                        if (skuInfo[i].sku == s_sku_info[j].sku) {
                            skuInfo[i].skuid = s_sku_info[j].item_id;
                            skuInfo[i].item_text = s_sku_info[j].item_text;
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