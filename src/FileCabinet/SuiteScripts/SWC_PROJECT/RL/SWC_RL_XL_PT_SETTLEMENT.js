/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * @name SWC_RL_XL_PT_SETTLEMENT.js
 * @author ZJG
 * @description 积加-结算报告
 */
define(['N/format', 'N/error', 'N/runtime', 'N/search', 'N/record', '../common/interface', '../common/moment'],
    function (format, error, runtime, search, record, interface, moment) {

        var rec_Type = 'customrecord_swc_xl_settlemenreport';

        /**
         * Function called upon sending a GET request to the RESTlet.
         *
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.1
         */
        function doGet(requestParams) {

        }
        /**
         * Function called upon sending a PUT request to the RESTlet.
         *
         * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
         * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.2
         */
        function doPut(requestBody) {

        }
        /**
         * Function called upon sending a POST request to the RESTlet.
         *
         * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
         * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.2
         */
        function doPost(requestBody) {
            try {
                var outcome;
                log.error("doPost==》", requestBody);
                var data = requestBody.data;
                if (data.length > 100) {
                    throw '限制100条数据,请重新调用';
                } else {
                    outcome = CreatedRecord(data);
                }
                // checkData(requestBody);
            } catch (err) {
                log.debug('error', err);
                var e = err.message ? err.message : err;
                outcome = { code: '201', msg: "数据存储失败:" + e }
            }
            return outcome;
        }
        /**
         * Function called upon sending a DELETE request to the RESTlet.
         *
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.2
         */
        function doDelete(requestParams) {

        }


        function CreatedRecord(data) {
            try {
                log.audit('CreatedRecord', data);
                var result = {};

                var err_message = [];
                var fail_externalid = [];
                var success_externalid = [];
                var save_nsid = [];

                for (let d = 0; d < data.length; d++) {
                    const element = data[d];
                    try {
                        var s_id = '';
                        search.create({
                            type: rec_Type,
                            filters: [
                                { name: 'externalid', operator: 'is', values: element.externalid },
                            ],
                        }).run().each(function (rec) {
                            s_id = rec.id;
                        });
                        if (s_id) {
                            var rec = record.load({ type: rec_Type, id: s_id, isDynamic: false });
                            var r1 = rec.getValue('custrecord_swc_sett_resolved');
                            var r2 = rec.getValue('custrecord_swc_xl_credit_resolved');
                            var r3 = rec.getValue('custrecord_swc_sett_resolved_ca');
                            var r4 = rec.getValue('custrecord_swc_xl_credit_resolved_ca');
                            if (r1 || r2 || r3 || r4) {
                                throw '该数据已处理,不允许更新';
                            }
                        } else {
                            var rec = record.create({ type: rec_Type, isDynamic: false });
                        }
                        for (var i in body_main) {
                            var xl = body_main[i].xl;
                            var ns = body_main[i].ns;
                            var text = body_main[i].text;
                            var date = body_main[i].date;
                            var value = element[xl];
                            log.audit('i的属性值=' + i, {
                                xl: xl,
                                ns: ns,
                                text: text,
                                value: value,
                            });
                            if (value && ns) {
                                if (date) {
                                    log.audit(xl, format.parse({ value: moment(value).toDate(), type: 'date' }));
                                    rec.setValue({ fieldId: ns, value: format.parse({ value: moment(value).toDate(), type: 'date' }) });
                                    continue
                                }
                                if (text) {
                                    rec.setText({ fieldId: ns, text: value });
                                } else {
                                    rec.setValue({ fieldId: ns, value: value });
                                }
                            }
                        };
                        var id = rec.save({ ignoreMandatoryFields: true });
                        save_nsid.push(id);
                        success_externalid.push(element.externalid);
                    } catch (error) {
                        log.error('error', error);
                        var e = error.message ? error.message : error;
                        err_message.push(element.externalid + ':' + e)
                        fail_externalid.push(element.externalid);
                    }

                }



                if (fail_externalid.length > 0 && success_externalid.length > 0) {
                    result.code = '2001';
                    result.msg = '数据存储部分成功，失败原因' + JSON.stringify(err_message);
                    result.data = {
                        success_externalid: success_externalid,
                        fail_externalid: fail_externalid,
                        save_nsid: save_nsid,
                    };
                } else if (fail_externalid.length > 0 && success_externalid.length == 0) {
                    result.code = '400';
                    result.msg = '数据存储失败' + JSON.stringify(err_message);
                    result.data = {
                        success_externalid: success_externalid,
                        fail_externalid: fail_externalid,
                        save_nsid: save_nsid,
                    };
                } else if (fail_externalid.length == 0 && success_externalid.length > 0) {
                    result.code = '200';
                    result.msg = '数据全部存储成功';
                    result.data = {
                        success_externalid: success_externalid,
                        fail_externalid: fail_externalid,
                        save_nsid: save_nsid,
                    };
                }

                return result;
            } catch (err) {
                log.error('CreatedRecord error', err);
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : '201';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        function checkData(requestBody) {
            //参数必传检测
            var checkResult = CheckUtil.checkNeed(requestBody, body_main)
            if (!checkResult.check) {
                throw checkResult.msg
            }
        }
        var CheckUtil = {
            //检测必传项是否存在
            checkNeed: function (context, bean) {
                var b = true
                var msg = ''
                for (var i = 0; i < bean.length; i++) {
                    var key = bean[i].xl
                    // log.error('key', key);
                    var isNeed = bean[i].isNeed
                    // log.error('isNeed', isNeed);
                    if (isNeed) {
                        if (context[key] == undefined || context[key] == null || context[key] == "") {
                            // log.error('context[key]', context[key]);
                            msg = bean[i].help + '(' + key + ')' + '不能为空'
                            b = false
                            break
                        }
                    }
                }
                var result = {
                    check: b,
                    msg: msg
                }
                return result
            },
            //检测数据类型是否正确
            checkType: function (context, bean) {
                var b = true
                var msg = ''
                for (var i = 0; i < bean.length; i++) {
                    var value = context[bean[i].xl]
                    var type = bean[i].type
                    if (value != undefined || value != null) {
                        if (typeof (value) != type) {
                            b = false
                            msg = bean[i].help + '(' + bean[i].sl + '):数据类型应为' + type
                            break
                        }
                    }
                }
                var result = {
                    check: b,
                    msg: msg
                }
                return result
            },
            check: function (context, bean) {
                var msg = ""
                var back = true
                //1.先检测必传项是否传入。
                var checkNeedResult = CheckUtil.checkNeed(context, bean)
                var checkTypeResult = CheckUtil.checkType(context, bean)
                //2.检测传入参数不合格，返回错误信息。
                if (!checkNeedResult.check) {
                    back = false
                    msg = checkNeedResult.msg
                }
                //3检验传入参数的数据类型
                if (!checkTypeResult.check) {
                    back = false
                    msg = checkTypeResult.msg
                }
                return {
                    back: back
                    , msg: msg
                }
            }
        }

        var body_main = [
            { xl: "externalid", ns: "externalid", help: "外部id", text: false, isNeed: true },
            { xl: "externalid", ns: "custrecord_swc_external_id", help: "外部id", text: false, isNeed: true },
            { xl: "platform", ns: "custrecord_swc_platform", help: "平台", text: true, isNeed: false },
            { xl: "store", ns: "custrecord_swc_shop", help: "店铺", text: false, isNeed: false },
            { xl: "orderId", ns: "custrecord_swc_orderid", help: "订单号", text: false, isNeed: false },
            { xl: "originalOrderId", ns: "custrecord_swc_original_orderid", help: "原始订单号", text: false, isNeed: false },
            { xl: "invoiceId", ns: "custrecord_swc_invoiceid", help: "发票号", text: false, isNeed: false },
            { xl: "settlementDocumentid", ns: "custrecord_swc_settlement_documentid", help: "结算单据编号", text: false, isNeed: false },
            { xl: "paymentId", ns: "custrecord_swc_paymentid", help: "付款编号", text: false, isNeed: false },
            { xl: "splitLabel", ns: "custrecord_swc_split_label", help: "拆单标识", text: false, isNeed: false },
            { xl: "orderDate", ns: "custrecord_swc_orderdate", help: "订单日期", text: true, isNeed: false, date: true },
            { xl: "invoiceDate", ns: "custrecord_swc_invoicedate", help: "发票日期", text: true, isNeed: false, date: true },
            { xl: "accountingDate", ns: "custrecord_swc_accounting_date", help: "记账日期", text: true, isNeed: false, date: true },
            { xl: "refundDate", ns: "custrecord_swc_refund_date", help: "退款日期", text: true, isNeed: false, date: true },
            { xl: "sku", ns: "custrecord_swc_xl_sku", help: "SKU", text: true, isNeed: false },
            { xl: "displayname", ns: "custrecord_swc_displayname", help: "商品名称", text: false, isNeed: false },
            { xl: "currency", ns: "custrecord_swc_xl_currency", help: "币种", text: true, isNeed: false },
            { xl: "quantity", ns: "custrecord_swc_quantity", help: "数量", text: false, isNeed: false },
            { xl: "rate", ns: "custrecord_swc_rate", help: "单价", text: false, isNeed: false },
            { xl: "tax", ns: "custrecord_swc_tax", help: "税金", text: false, isNeed: false },
            { xl: "ac_6001_01_01", ns: "custrecord_swc_ac_6001_01_01", help: "平台销售收入", text: false, isNeed: false },
            { xl: "ac_6001_01_03", ns: "custrecord_swc_ac_6001_01_03", help: "贸易折扣", text: false, isNeed: false },
            { xl: "ac_6001_01_02", ns: "custrecord_swc_ac_6001_01_02", help: "平台销售退款", text: false, isNeed: false },
            { xl: "ac_6601_01_01", ns: "custrecord_swc_ac_6601_01_01", help: "快递费", text: false, isNeed: false },
            { xl: "ac_6601_01_02", ns: "custrecord_swc_ac_6601_01_02", help: "卡车费", text: false, isNeed: false },
            { xl: "ac_6601_01_03", ns: "custrecord_swc_ac_6601_01_03", help: "仓库调拨费", text: false, isNeed: false },
            { xl: "ac_6601_01_04", ns: "custrecord_swc_ac_6601_01_04", help: "6601.01.04其他", text: false, isNeed: false },
            { xl: "ac_6601_02", ns: "custrecord_swc_ac_6601_02", help: "平台佣金", text: false, isNeed: false },
            { xl: "ac_6601_03", ns: "custrecord_swc_ac_6601_03", help: "广告费", text: false, isNeed: false },
            { xl: "ac_6601_04", ns: "custrecord_swc_ac_6601_04", help: "破损费", text: false, isNeed: false },
            { xl: "ac_6601_05", ns: "custrecord_swc_ac_6601_05", help: "订阅费", text: false, isNeed: false },
            { xl: "ac_6601_10", ns: "custrecord_swc_ac_6601_10", help: "软件工具插件等", text: false, isNeed: false },
            { xl: "ac_6601_06", ns: "custrecord_swc_ac_6601_06", help: "操作手续费", text: false, isNeed: false },
            { xl: "ac_6601_07_01", ns: "custrecord_swc_ac_6601_07_01", help: "测评佣金", text: false, isNeed: false },
            { xl: "ac_6601_07_02", ns: "custrecord_swc_ac_6601_07_02", help: "测评产品成本", text: false, isNeed: false },
            { xl: "ac_6601_07_03", ns: "custrecord_swc_ac_6601_07_03", help: "测评尾程运费", text: false, isNeed: false },
            { xl: "ac_6601_08_01", ns: "custrecord_swc_ac_6601_08_01", help: "产品成本", text: false, isNeed: false },
            { xl: "ac_6601_08_02", ns: "custrecord_swc_ac_6601_08_02", help: "处置费", text: false, isNeed: false },
            { xl: "ac_6601_11", ns: "custrecord_swc_ac_6601_11", help: "其他费用", text: false, isNeed: false },
            { xl: "ac_6099", ns: "custrecord_swc_ac_6099", help: "仓租费", text: false, isNeed: false },
            { xl: "ac_1012", ns: "custrecord_swc_ac_1012", help: "回款提现", text: false, isNeed: false },
            { xl: "ac_6098", ns: "custrecord_swc_ac_6098", help: "提前支付折扣", text: false, isNeed: false },
            { xl: "type", ns: "custrecord_swc_ac_type", help: "单据类型", text: false, isNeed: false },
            { xl: "currencyOrder", ns: "custrecord_swc_xl_currency_order", help: "订单币种", text: false, isNeed: false },
            { xl: "originalAmount", ns: "custrecord_swc_xl_original_amount", help: "原始金额", text: false, isNeed: false },
            { xl: "fbaCreditFee", ns: "custrecord_swc_swc_fba_creditfee", help: "物流扣费", text: false, isNeed: false },
            { xl: "tk_notax", ns: "custrecord_swc_tk_notax", help: "退款-未税金额", text: false, isNeed: false },
            { xl: "tk_tax", ns: "custrecord_swc_tk_tax", help: "退款-税额", text: false, isNeed: false },
            { xl: "tk_disable", ns: "custrecord_swc_tk_disable", help: "退款-IT未拆税", text: false, isNeed: false },
        ]

        return {
            'get': doGet,
            put: doPut,
            post: doPost,
            'delete': doDelete
        };

    });
