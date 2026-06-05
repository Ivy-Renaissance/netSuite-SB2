/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_SETTLEMENT_HANDLE_JJPT.js
 *@description 积加其他平台结算报告处理
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', 'N/config', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, config, interface, moment) {

        //debit-借  credit-贷

        var settlement_record_type = 'customrecord_swc_settlement_report';
        function getInputData() {
            var startTime = new Date().getTime();
            log.emergency('getInputData 开始', startTime);
            var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_jjpt_jour_store' });
            var marketid = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_jjpt_jour_marketid' });
            var settlement_id = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_jjpt_jour_sett_id' });
            var order_id = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_jjpt_jour_order_id' });
            var startdate = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_jjpt_jour_startdate' });
            var enddate = runtime.getCurrentScript().getParameter({ name: 'custscript_sett_jjpt_jour_enddate' });

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
                { name: 'custrecord_swc_pt_journal_resolved', operator: 'is', values: false },
                { name: 'custrecord_swc_s_orderid', operator: 'isnotempty', values: '' },
                { name: 'custrecord_swc_marketdate', operator: 'before', values: 'twodaysago' },
                { name: 'created', operator: 'before', values: 'twodaysago' },
            ]
            // if (acc) {
            //     filters.push({ name: 'custrecord_swc_shop', operator: 'anyof', values: acc })
            // };
            if (enddate && startdate) {
                filters.push({ name: 'custrecord_swc_marketdate', operator: 'within', values: [startdate, enddate] })
            }
            if (enddate && !startdate) {
                filters.push({ name: 'custrecord_swc_marketdate', operator: 'onorbefore', values: enddate })
            }
            if (!enddate && startdate) {
                filters.push({ name: 'custrecord_swc_marketdate', operator: 'onorafter', values: startdate })
            }
            if (marketid) {
                filters.push({ name: 'custrecord_swc_marketid', operator: 'is', values: marketid })
            }
            if (settlement_id) {
                filters.push({ name: 'custrecord_swc_settlementid', operator: 'is', values: settlement_id })
            }
            if (order_id) {
                filters.push({ name: 'custrecord_swc_s_orderid', operator: 'is', values: order_id })
            }
            log.debug('filters', filters)
            search.create({
                type: settlement_record_type,
                filters: filters,
                columns: [
                    { name: 'custrecord_swc_settlementid', summary: 'GROUP' },
                    { name: 'custrecord_swc_s_orderid', summary: 'GROUP' },
                    { name: 'custrecord_swc_marketid', summary: 'GROUP' },
                    { name: 'custrecord_swc_s_currency', summary: 'GROUP' },
                    { name: 'custrecord_swc_marketdate', summary: 'GROUP' },
                    { name: 'custrecord_swc_pt_journal_retry', summary: 'SUM', sort: 'ASC' },
                ]
            }).run().each(function (rec) {
                data.push({
                    sett_id: rec.getValue(rec.columns[0]),
                    order_id: rec.getValue(rec.columns[1]),
                    marketid: rec.getValue(rec.columns[2]),
                    sett_currency: rec.getValue(rec.columns[3]),
                    marketdate: rec.getValue(rec.columns[4]),
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
            var marketid = obj.marketid;
            var order_id = obj.order_id;
            var marketdate = obj.marketdate;
            var PT_Arrys = [], item_codes = [], shipment_ids = [], settlement_ids = [], FeeTypeArray = [], invoices = [], no_invoices_error = [], no_so_error = [], no_fs_error = [], invoices_amount = [];
            var shipsItemCode = {}, settlmentID = {}
            var real_acc_info, so_obj = {};
            var depositDate, depositDateObj, currency_text, currency_id, merchant_order_id, locationDepositDateTime, postedDate, postedDateObj, locationpostedDateTime, endDate, endDateObj, endDateTime;
            var sett_entity, sett_acc, sett_acc_text, sett_subsidiary, sett_payment_account, sett_currency, sett_currency_text;
            var principal_amount;
            var TransferUnsuccessful = [], reserveAmount = [];
            var no_markplace = false;
            // var marketdate, createtime;
            var DR = 0, funds = 0;
            var so_ids = [];

            try {
                if (marketdate == '- None -') {
                    throw '无计费日期';
                }

                currency_id = obj.sett_currency;
                var platform_id = ''
                real_acc_info = interface.GetAccountInfo('', marketid);
                log.audit('real_acc_info', real_acc_info);
                platform_id = real_acc_info.platform;

                var feeAccount = [], ac_feilds = [], n_ac_feilds = [];
                search.create({
                    type: 'customrecord_swc_pt_sett_account',
                    filters: [],
                    columns: [
                        { name: 'custrecord_swc_pt_sett_type' },
                        { name: 'custrecord_swc_pt_sett_fee_type' },
                        { name: 'custrecord_swc_pt_sett_jour_type' },
                        { name: 'custrecord_swc_pt_sett_account' },
                        { name: 'custrecord_swc_pt_sett_ac_feild' },
                        { name: 'custrecord_swc_pt_sett_is_accountpayable' },
                        { name: 'custrecord_swc_pt_sett_debit_credit' },
                        { name: 'custrecord_swc_pt_sett_description' },
                        { name: 'custrecord_swc_pt_sett_plateform' },
                        { name: 'custrecord_swc_pt_sett_journalmemo' },
                    ]
                }).run().each(function (rec) {
                    var debitCredit = rec.getText(rec.columns[6]);
                    if (debitCredit == '贷方') {
                        debitCredit = 'credit';
                    } else if (debitCredit == '借方') {
                        debitCredit = 'debit';
                    }
                    feeAccount.push({
                        type: rec.getValue(rec.columns[0]),
                        feeType: rec.getValue(rec.columns[1]),
                        jourType: rec.getValue(rec.columns[2]),
                        accountId: rec.getValue(rec.columns[3]),
                        ac_feild: rec.getValue(rec.columns[4]),
                        isAccountPayable: rec.getValue(rec.columns[5]),
                        description: rec.getValue(rec.columns[7]),
                        plateform: rec.getValue(rec.columns[8]),
                        journalMemo: rec.getValue(rec.columns[9]),
                        debitCredit: debitCredit,
                    });
                    ac_feilds.push(rec.getValue(rec.columns[4]));
                    return true;
                });
                log.audit('feeAccount', feeAccount);
                if (ac_feilds.length) {
                    n_ac_feilds = [...new Set(ac_feilds)];
                }


                //收入金额：总计金额--销售佣金-配送相关费用-其他交易费用-其它促销折扣
                var fee_filters = [
                    { name: 'isinactive', operator: search.Operator.IS, values: false },
                    { name: 'custrecord_swc_s_currency', operator: 'anyof', values: obj.sett_currency },
                    { name: 'custrecord_swc_pt_journal_resolved', operator: 'is', values: false },
                ]
                if (sett_id != '- None -') {
                    fee_filters.push({ name: 'custrecord_swc_settlementid', operator: 'is', values: sett_id })
                } else {
                    fee_filters.push({ name: 'custrecord_swc_settlementid', operator: 'isempty' })
                }
                if (order_id != '- None -') {
                    fee_filters.push({ name: 'custrecord_swc_s_orderid', operator: 'is', values: order_id })
                } else {
                    fee_filters.push({ name: 'custrecord_swc_s_orderid', operator: 'isempty' })
                }
                fee_filters.push({ name: 'custrecord_swc_marketdate', operator: 'on', values: marketdate });
                log.debug('fee_filters', fee_filters);
                var lx_fee_columns = [
                    { name: 'custrecord_swc_marketdate' },
                    { name: 'custrecord_swc_s_sku' },
                    { name: 'custrecord_swc_s_currency' },
                    { name: 'custrecord_swc_type' },
                    { name: 'custrecord_swc_feetype' },
                    { name: 'custrecord_swc_description' },
                    { name: 'custrecord_swc_other_so_link' },
                    // { name: 'custrecord_swc_total_tax' },
                    // { name: 'custrecord_swc_total' },
                    // { name: 'custrecord_swc_total_sales_refund' },//总收款/退款金额
                    // { name: 'custrecord_swc_sellingfees' },//销售佣金
                    // { name: 'custrecord_swc_fbafees' },//配送相关费用
                    // { name: 'custrecord_swc_othertransactionfees' },//其他交易费用
                    // { name: 'custrecord_swc_other' },//其它
                ]
                for (let i = 0; i < n_ac_feilds.length; i++) {
                    lx_fee_columns.push({ name: n_ac_feilds[i] })
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

                        // if (!marketdate) {
                        //     marketdate = rec.getValue('custrecord_swc_marketdate');
                        // }
                        if (!currency_text) {
                            // currency_id = rec.getValue('custrecord_swc_s_currency');
                            currency_text = rec.getText('custrecord_swc_s_currency');
                            log.debug('currency_text', currency_text);
                        }

                        var type = interface.replaceToChinessChar(rec.getValue('custrecord_swc_type'));
                        var feeType = interface.replaceToChinessChar(rec.getValue('custrecord_swc_feetype'));
                        var description = interface.replaceToChinessChar(rec.getValue('custrecord_swc_description'));

                        let so_link = rec.getValue('custrecord_swc_other_so_link');
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

                        // var amount = rec.getValue('custrecord_swc_total') || 0;
                        // var total_sales_refund = rec.getValue('custrecord_swc_total_sales_refund') || 0;
                        // var tax_amount = rec.getValue('custrecord_swc_total_tax') || 0;
                        // var sellingfees = rec.getValue('custrecord_swc_sellingfees') || 0;
                        // var fbafees = rec.getValue('custrecord_swc_fbafees') || 0;
                        // var othertransactionfees = rec.getValue('custrecord_swc_othertransactionfees') || 0;
                        // var other = rec.getValue('custrecord_swc_other') || 0;

                        // if (real_acc_info.tax_mode == '2') {//代扣代缴
                        //     var n_amount = interface.accSub(interface.accSub(interface.accSub(interface.accSub(interface.accSub(amount, tax_amount), sellingfees), fbafees), othertransactionfees), other);
                        //     log.audit('代扣代缴', n_amount);
                        //     if (Number(n_amount) != 0) {
                        //         FeeTypeArray.push({
                        //             "amount": n_amount,
                        //             "tax_amount": tax_amount,
                        //             "type": type,
                        //             "feeType": feeType,
                        //             "sku": rec.getValue('custrecord_swc_s_sku'),
                        //             "memo": type + '_' + feeType,
                        //             "accountId": '',
                        //             "jourType": '',
                        //         });
                        //     }
                        // } else {
                        //     var n_amount = interface.accSub(interface.accSub(interface.accSub(interface.accSub(amount, sellingfees), fbafees), othertransactionfees), other);
                        //     log.audit('非代扣代缴', n_amount);
                        //     if (Number(n_amount) != 0) {
                        //         FeeTypeArray.push({
                        //             "amount": n_amount,
                        //             "tax_amount": 0,
                        //             "type": type,
                        //             "feeType": feeType,
                        //             "sku": rec.getValue('custrecord_swc_s_sku'),
                        //             "memo": type + '_' + feeType,
                        //             "accountId": '',
                        //             "jourType": '',
                        //         });
                        //     }
                        // }
                        // log.audit('type-' + rec.id, type);
                        // log.audit('feeType-' + rec.id, feeType);

                        for (let k = 0; k < feeAccount.length; k++) {
                            // log.audit('feeAccount-' + i, feeAccount[k]);

                            if (feeAccount[k].ac_feild && type == feeAccount[k].type && feeType == feeAccount[k].feeType && platform_id == feeAccount[k].plateform) {
                                if (feeAccount[k].description) {
                                    if (description.indexOf(feeAccount[k].description) != -1) {
                                        var fee_amount = rec.getValue(feeAccount[k].ac_feild) || 0;
                                        if (Number(fee_amount) != 0) {
                                            FeeTypeArray.push({
                                                "cache_id": rec.id,
                                                "amount": fee_amount,
                                                "type": type,
                                                "feeType": feeType,
                                                "sku": rec.getValue('custrecord_swc_s_sku'),
                                                "memo": type + '_' + feeType,
                                                "accountId": feeAccount[k].accountId,
                                                "jourType": feeAccount[k].jourType,
                                                "debitCredit": feeAccount[k].debitCredit,
                                                "isAccountPayable": feeAccount[k].isAccountPayable,
                                                "journalMemo": feeAccount[k].journalMemo,
                                            });
                                        }
                                    }
                                } else {
                                    var fee_amount = rec.getValue(feeAccount[k].ac_feild) || 0;
                                    if (Number(fee_amount) != 0) {
                                        FeeTypeArray.push({
                                            "cache_id": rec.id,
                                            "amount": fee_amount,
                                            "type": type,
                                            "feeType": feeType,
                                            "sku": rec.getValue('custrecord_swc_s_sku'),
                                            "memo": type + '_' + feeType,
                                            "accountId": feeAccount[k].accountId,
                                            "jourType": feeAccount[k].jourType,
                                            "debitCredit": feeAccount[k].debitCredit,
                                            "isAccountPayable": feeAccount[k].isAccountPayable,
                                            "journalMemo": feeAccount[k].journalMemo,
                                        });
                                    }
                                }
                            }
                        }
                    });
                }
                if (so_ids.length) {
                    so_ids = [...new Set(so_ids)];
                }
                log.audit('so_ids', so_ids);
                log.audit('settlement_ids', settlement_ids);
                log.audit('FeeTypeArray', FeeTypeArray);
                log.audit('FeeTypeArray length', FeeTypeArray.length);

                // for (let i = 0; i < FeeTypeArray.length; i++) {
                //     if (!FeeTypeArray[i].accountId) {
                //         for (let j = 0; j < feeAccount.length; j++) {
                //             if (feeAccount[j].jourType != '费用') {
                //                 if (FeeTypeArray[i].type == feeAccount[j].type && FeeTypeArray[i].feeType == feeAccount[j].feeType) {
                //                     FeeTypeArray[i].accountId = feeAccount[j].accountId;
                //                     FeeTypeArray[i].jourType = feeAccount[j].jourType;
                //                 }
                //             }
                //         }
                //     }
                // }
                var SK_FeeTypeArray = [], TK_FeeTypeArray = [], FY_FeeTypeArray = [], SJ_FeeTypeArray = [], GG_FeeTypeArray = [];
                for (let i = 0; i < FeeTypeArray.length; i++) {
                    if (FeeTypeArray[i].jourType == '收款') {
                        SK_FeeTypeArray.push(FeeTypeArray[i]);
                    }
                    else if (FeeTypeArray[i].jourType == '退款') {
                        TK_FeeTypeArray.push(FeeTypeArray[i]);
                    }
                    else if (FeeTypeArray[i].jourType == '费用') {
                        FY_FeeTypeArray.push(FeeTypeArray[i]);
                    }
                    else if (FeeTypeArray[i].jourType == '税金') {
                        SJ_FeeTypeArray.push(FeeTypeArray[i]);
                    }
                    else if (FeeTypeArray[i].jourType == '广告') {
                        GG_FeeTypeArray.push(FeeTypeArray[i]);
                    }
                }
                log.audit('SK_FeeTypeArray', SK_FeeTypeArray);
                log.audit('TK_FeeTypeArray', TK_FeeTypeArray);
                log.audit('FY_FeeTypeArray', FY_FeeTypeArray);
                log.audit('SJ_FeeTypeArray', SJ_FeeTypeArray);
                log.audit('GG_FeeTypeArray', GG_FeeTypeArray);
                // return
                // if (currency_text) {
                //     search.create({
                //         type: 'currency',
                //         filters: [
                //             { name: "symbol", operator: 'is', values: currency_text }
                //         ]
                //     }).run().each(function (e) {
                //         currency_id = e.id
                //     })
                // } else {
                //     currency_id = real_acc_info.info.currency;
                // }
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
                    var DR_FY = 0, funds_fy = 0, AP_FY = 0;
                    var jour_fy = record.create({ type: 'journalentry', isDynamic: true });
                    jour_fy.setValue({ fieldId: 'subsidiary', value: sett_subsidiary });
                    jour_fy.setValue({ fieldId: 'currency', value: sett_currency });
                    jour_fy.setValue({ fieldId: 'trandate', value: format.parse({ value: marketdate, type: 'date' }) });
                    jour_fy.setValue({ fieldId: 'memo', value: sett_id });
                    jour_fy.setValue({ fieldId: 'approvalstatus', value: 2 });
                    if (sett_id != '- None -') {
                        jour_fy.setValue({ fieldId: 'custbody_swc_settlement_id', value: sett_id });
                    }
                    if (order_id != '- None -') {
                        jour_fy.setValue({ fieldId: 'custbody_swc_platform_order_number', value: order_id });
                    }
                    jour_fy.setValue({ fieldId: 'custbody_swc_relation_so', value: so_ids });
                    jour_fy.setValue({ fieldId: 'custbody_swc_relation_jjpt_settlement', value: settlement_ids });
                    jour_fy.setValue({ fieldId: 'custbody_swc_journal_type', value: "7" });  //结算报告-费用日记账
                    jour_fy.setValue({ fieldId: 'custbody_swc_voucher_type', value: "费用凭证" });  //当前凭证

                    FY_FeeTypeArray.map(function (obj) {
                        log.audit('FeeTypeArray obj', obj);
                        if (obj.accountId) {
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
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: obj.accountId });
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj.journalMemo });
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: obj.debitCredit, value: x }); // 借
                                // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: x }); // 借
                                // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: x }); // 贷
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "费用凭证" });
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                                jour_fy.setCurrentSublistText({ sublistId: 'line', fieldId: "custcol_swc_main_sku", text: obj.sku });
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
                    // // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: funds_fy }) //贷
                    // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: funds_fy }) //借
                    // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "费用凭证" });
                    // // jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "memo", value: sett_id });
                    // jour_fy.commitLine({ sublistId: 'line' })
                    jo_fy_id = jour_fy.save({ ignoreMandatoryFields: true });
                    log.debug('生成费用凭证:', jo_fy_id);
                }

                if (SK_FeeTypeArray.length) {
                    var DR_SK = 0, funds_sk = 0;
                    var cs_sk_cout = 1, db_sk_cout = 1;
                    var jour_sk = record.create({ type: 'journalentry', isDynamic: true });
                    jour_sk.setValue({ fieldId: 'subsidiary', value: sett_subsidiary });
                    jour_sk.setValue({ fieldId: 'currency', value: sett_currency });
                    jour_sk.setValue({ fieldId: 'trandate', value: format.parse({ value: marketdate, type: 'date' }) });
                    jour_sk.setValue({ fieldId: 'memo', value: sett_id });
                    jour_sk.setValue({ fieldId: 'approvalstatus', value: 2 });
                    if (sett_id != '- None -') {
                        jour_sk.setValue({ fieldId: 'custbody_swc_settlement_id', value: sett_id });
                    }
                    if (order_id != '- None -') {
                        jour_sk.setValue({ fieldId: 'custbody_swc_platform_order_number', value: order_id });
                    }
                    jour_sk.setValue({ fieldId: 'custbody_swc_relation_so', value: so_ids });
                    jour_sk.setValue({ fieldId: 'custbody_swc_relation_jjpt_settlement', value: settlement_ids });
                    jour_sk.setValue({ fieldId: 'custbody_swc_journal_type', value: "5" });  //结算报告-收款日记账
                    jour_sk.setValue({ fieldId: 'custbody_swc_voucher_type', value: "收款凭证" });  //当前凭证

                    SK_FeeTypeArray.map(function (obj) {
                        log.audit('FeeTypeArray obj', obj);
                        if (obj.accountId) {
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
                                jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: obj.accountId });
                                jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                                jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj.journalMemo });
                                jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: obj.debitCredit, value: x });
                                // jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: x }); // 借
                                // jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: x }); // 贷
                                jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "收款凭证" });
                                jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                                jour_sk.setCurrentSublistText({ sublistId: 'line', fieldId: "custcol_swc_main_sku", text: obj.sku });
                                jour_sk.commitLine({ sublistId: 'line' });
                            }
                        }
                    });


                    funds_sk = DR_SK //结算的金额total，计入费用凭证
                    log.debug('funds_sk', funds_sk);

                    jour_sk.selectNewLine({ sublistId: 'line' })
                    jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: sett_payment_account }) //应收账款-平台
                    jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                    jour_sk.setCurrentSublistValue({ sublistId: 'line', fieldId: "memo", value: '收款' })
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

                if (TK_FeeTypeArray.length) {
                    var DR_TK = 0, funds_tk = 0;
                    var cd_tk_cout = 1, db_tk_cout = 1;
                    var jour_tk = record.create({ type: 'journalentry', isDynamic: true });
                    jour_tk.setValue({ fieldId: 'subsidiary', value: sett_subsidiary });
                    log.audit('sett_subsidiary', sett_subsidiary);
                    jour_tk.setValue({ fieldId: 'currency', value: sett_currency });
                    log.audit('sett_currency', sett_currency);
                    jour_tk.setValue({ fieldId: 'trandate', value: format.parse({ value: marketdate, type: 'date' }) });
                    jour_tk.setValue({ fieldId: 'memo', value: sett_id });
                    jour_tk.setValue({ fieldId: 'approvalstatus', value: 2 });
                    if (sett_id != '- None -') {
                        jour_tk.setValue({ fieldId: 'custbody_swc_settlement_id', value: sett_id });
                    }
                    if (order_id != '- None -') {
                        jour_tk.setValue({ fieldId: 'custbody_swc_platform_order_number', value: order_id });
                    }
                    jour_tk.setValue({ fieldId: 'custbody_swc_relation_so', value: so_ids });
                    jour_tk.setValue({ fieldId: 'custbody_swc_relation_jjpt_settlement', value: settlement_ids });
                    jour_tk.setValue({ fieldId: 'custbody_swc_journal_type', value: "6" });  //结算报告-退款日记账
                    jour_tk.setValue({ fieldId: 'custbody_swc_voucher_type', value: "退款凭证" });  //当前凭证

                    TK_FeeTypeArray.map(function (obj) {
                        log.audit('FeeTypeArray obj', obj);
                        let set_cd = '';
                        if (obj.accountId) {
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
                                    set_cd = 'credit';
                                } else {
                                    DR_TK = interface.accSub(Number(DR_TK), Number(x));
                                    db_tk_cout++;
                                    set_cd = 'debit';
                                }
                                log.debug('DR_TK', DR_TK);
                                jour_tk.selectNewLine({ sublistId: 'line' });
                                jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: obj.accountId });
                                jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                                log.audit('sett_entity', sett_entity);
                                jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj.journalMemo });
                                jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: set_cd, value: x });
                                // jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: x }); // 贷
                                // jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: x }); // 借
                                jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "退款凭证" });
                                jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                                jour_tk.setCurrentSublistText({ sublistId: 'line', fieldId: "custcol_swc_main_sku", text: obj.sku });
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
                            if (obj_2.accountId) {
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
                                    jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: obj_2.accountId });
                                    jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                                    log.audit('sett_entity', sett_entity);
                                    jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj_2.journalMemo });
                                    jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: set_cd_2, value: y });
                                    // jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: x }); // 贷
                                    // jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: x }); // 借
                                    jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "退款凭证" });
                                    jour_tk.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                                    jour_tk.setCurrentSublistText({ sublistId: 'line', fieldId: "custcol_swc_main_sku", text: obj_2.sku });
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

                if (SJ_FeeTypeArray.length) {
                    if (real_acc_info.tax_mode == '2') {
                        var DR_SJ = 0, funds_sj = 0;
                        var jour_sj = record.create({ type: 'journalentry', isDynamic: true });
                        jour_sj.setValue({ fieldId: 'subsidiary', value: sett_subsidiary });
                        jour_sj.setValue({ fieldId: 'currency', value: sett_currency });
                        jour_sj.setValue({ fieldId: 'trandate', value: format.parse({ value: marketdate, type: 'date' }) });
                        jour_sj.setValue({ fieldId: 'memo', value: sett_id });
                        jour_sj.setValue({ fieldId: 'approvalstatus', value: 2 });
                        if (sett_id != '- None -') {
                            jour_sj.setValue({ fieldId: 'custbody_swc_settlement_id', value: sett_id });
                        }
                        if (order_id != '- None -') {
                            jour_sj.setValue({ fieldId: 'custbody_swc_platform_order_number', value: order_id });
                        }
                        jour_sj.setValue({ fieldId: 'custbody_swc_relation_so', value: so_ids });
                        jour_sj.setValue({ fieldId: 'custbody_swc_relation_jjpt_settlement', value: settlement_ids });
                        jour_sj.setValue({ fieldId: 'custbody_swc_journal_type', value: "12" });  //结算报告_代扣代缴日记账
                        jour_sj.setValue({ fieldId: 'custbody_swc_voucher_type', value: "代扣代缴日记账" });  //当前凭证

                        SJ_FeeTypeArray.map(function (obj) {
                            log.audit('FeeTypeArray obj', obj);
                            if (obj.accountId) {
                                if (Number(obj.amount) != 0) {
                                    var x = Number(obj.amount).toFixed(2);
                                    log.debug('x', x);
                                    if (sett_currency_text == 'JPY') {
                                        x = Number(x).toFixed(0)
                                    }
                                    // DR_SJ = interface.accAdd(Number(DR_SJ), Number(x));
                                    // log.debug('DR_SJ', DR_SJ);
                                    jour_sj.selectNewLine({ sublistId: 'line' });
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: obj.accountId });//测试环境固定1303
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj.journalMemo });
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: obj.debitCredit, value: x });
                                    // jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: x }); // 贷
                                    // jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: x }); // 借
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "代扣代缴日记账" });
                                    jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                                    jour_sj.setCurrentSublistText({ sublistId: 'line', fieldId: "custcol_swc_main_sku", text: obj.sku });
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
                                    // jour_sj.setCurrentSublistText({ sublistId: 'line', fieldId: "custcol_swc_main_sku", text: obj.sku });
                                    jour_sj.commitLine({ sublistId: 'line' })
                                }
                            }
                        });


                        // funds_sj = DR_SJ //结算的金额total，计入费用凭证
                        // log.debug('funds_sj', funds_sj);
                        // if (Number(funds_sj) != 0) {
                        //     jour_sj.selectNewLine({ sublistId: 'line' })
                        //     jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: SJ_FeeTypeArray[0].accountId }) //测试环境固定1303
                        //     jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                        //     jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: funds_sj }) //借
                        //     // jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: funds_sj }) //贷
                        //     jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "代扣代缴日记账" });
                        //     // jour_sj.setCurrentSublistValue({ sublistId: 'line', fieldId: "memo", value: sett_id });
                        //     jour_sj.commitLine({ sublistId: 'line' })
                        // }
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
                        jour_gg.setValue({ fieldId: 'trandate', value: format.parse({ value: marketdate, type: 'date' }) });
                        jour_gg.setValue({ fieldId: 'memo', value: sett_id });
                        jour_gg.setValue({ fieldId: 'approvalstatus', value: 2 });
                        if (sett_id != '- None -') {
                            jour_gg.setValue({ fieldId: 'custbody_swc_settlement_id', value: sett_id });
                        }
                        if (order_id != '- None -') {
                            jour_gg.setValue({ fieldId: 'custbody_swc_platform_order_number', value: order_id });
                        }
                        jour_gg.setValue({ fieldId: 'custbody_swc_relation_so', value: so_ids });
                        jour_gg.setValue({ fieldId: 'custbody_swc_relation_jjpt_settlement', value: settlement_ids });
                        jour_gg.setValue({ fieldId: 'custbody_swc_journal_type', value: "14" });  //结算报告-广告日记账
                        jour_gg.setValue({ fieldId: 'custbody_swc_voucher_type', value: "广告凭证" });  //当前凭证

                        GG_FeeTypeArray.map(function (obj) {
                            log.audit('FeeTypeArray obj', obj);
                            if (obj.accountId) {
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
                                    jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: obj.accountId });
                                    jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: sett_entity }) //客户
                                    jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj.journalMemo });
                                    jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: obj.debitCredit, value: x });
                                    jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swc_voucher_type", value: "广告凭证" });
                                    jour_gg.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_swt_platform", value: platform_id });
                                    jour_gg.setCurrentSublistText({ sublistId: 'line', fieldId: "custcol_swc_main_sku", text: obj.sku });
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
                    var retry = rec.getValue('custrecord_swc_pt_journal_retry');
                    if (Number(retry) > 100) {
                        retry = 1;
                    }
                    if (obj.type == 'jour') {
                        rec.setValue({ fieldId: 'custrecord_swc_pt_journal_error', value: '' });
                        rec.setValue({ fieldId: 'custrecord_swc_pt_journal_resolved', value: true });
                        rec.setValue({ fieldId: 'custrecord_swc_pt_journal_fee', value: obj.jo_fy_id });
                        rec.setValue({ fieldId: 'custrecord_swc_pt_journal_income', value: obj.jo_sk_id });
                        rec.setValue({ fieldId: 'custrecord_swc_pt_journal_refund', value: obj.jo_tk_id });
                        rec.setValue({ fieldId: 'custrecord_swc_pt_journal_tax', value: obj.jo_sj_id });
                        rec.setValue({ fieldId: 'custrecord_swc_pt_journal_adv', value: obj.jo_gg_id });
                        rec.setValue({ fieldId: 'custrecord_swc_pt_journal_retry', value: 0 });
                    }
                    else if (obj.type == 'map_error') {
                        rec.setValue({ fieldId: 'custrecord_swc_pt_journal_error', value: obj.msg });
                        rec.setValue({ fieldId: 'custrecord_swc_pt_journal_retry', value: Number(retry) + 1 });
                    }

                    var st_id = rec.save({ ignoreMandatoryFields: true });
                    log.audit('st_id', st_id);
                } catch (error) {
                    log.error('reduce error', error);
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

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });