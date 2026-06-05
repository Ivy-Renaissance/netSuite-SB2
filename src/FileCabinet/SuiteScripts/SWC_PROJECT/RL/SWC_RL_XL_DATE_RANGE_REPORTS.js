/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * @name SWC_RL_XL_DATE_RANGE_REPORTS.js
 * @author ZJG
 * @description 积加-NS 日期范围报告
 */
define(['N/format', 'N/error', 'N/runtime', 'N/search', 'N/record', '../common/interface', '../common/moment'],
    function (format, error, runtime, search, record, interface, moment) {

        var rec_Type = 'customrecord_swc_jj_date_range_reports';

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

                var market_ids = [];
                for (let i = 0; i < data.length; i++) {
                    market_ids.push(data[i].marketId)
                }
                log.audit('market_ids', market_ids);

                var n_market_ids = [...new Set(market_ids)];
                log.audit('n_market_ids', n_market_ids);
                var storeList = interface.getAccountList('', n_market_ids);

                for (let d = 0; d < data.length; d++) {
                    const element = data[d];
                    try {
                        var acc_info;
                        for (let j = 0; j < storeList.length; j++) {
                            if (storeList[j].jj_marketid == element.marketId) {
                                acc_info = storeList[j];
                                break
                            }
                        }

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
                                    rec.setValue({ fieldId: ns, value: value });

                                    if (xl == 'standardDate') {
                                        var standardDate_date = format.format({ value: moment.utc(value).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                                        standardDate_date = format.parse({ value: standardDate_date, type: 'date' });
                                        log.audit('standardDate_date', standardDate_date);
                                        if (standardDate_date) {
                                            rec.setValue({ fieldId: 'custrecord_swc_jj_drr_standard_date', value: standardDate_date });
                                        }
                                    }
                                    if (xl == 'marketDate') {
                                        var marketDate_date = format.format({ value: moment.utc(value).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                                        marketDate_date = format.parse({ value: marketDate_date, type: 'date' });
                                        log.audit('marketDate_date', marketDate_date);
                                        if (marketDate_date) {
                                            rec.setValue({ fieldId: 'custrecord_swc_jj_drr_market_date', value: marketDate_date });
                                        }
                                    }
                                    if (xl == 'zeroDate') {
                                        var zeroDate_date = format.format({ value: moment.utc(value).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                                        zeroDate_date = format.parse({ value: zeroDate_date, type: 'date' });
                                        log.audit('zeroDate_date', zeroDate_date);
                                        if (zeroDate_date) {
                                            rec.setValue({ fieldId: 'custrecord_swc_jj_drr_zero_date', value: zeroDate_date });
                                        }
                                    }
                                    if (xl == 'updateDate') {
                                        var updateDate_date = format.format({ value: moment.utc(value).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                                        updateDate_date = format.parse({ value: updateDate_date, type: 'date' });
                                        log.audit('updateDate_date', updateDate_date);
                                        if (updateDate_date) {
                                            rec.setValue({ fieldId: 'custrecord_swc_jj_drr_update_date', value: updateDate_date });
                                        }
                                    }
                                    continue
                                }
                                if (xl == 'marketId') {
                                    rec.setValue({ fieldId: 'custrecord_swc_jj_drr_store', value: acc_info.id });
                                    rec.setValue({ fieldId: ns, value: value });
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
            { xl: "id", ns: "custrecord_swc_jj_drr_id", help: "积加主键id", text: false, isNeed: false },
            { xl: "marketId", ns: "custrecord_swc_jj_drr_marketid", help: "站点ID", text: false, isNeed: false },
            { xl: "marketName", ns: "custrecord_swc_jj_drr_marketname", help: "站点", text: false, isNeed: false },
            { xl: "currency", ns: "custrecord_swc_jj_drr_currency", help: "币种", text: false, isNeed: false },
            { xl: "currencySymbol", ns: "custrecord_swc_jj_drr_currencysymbol", help: "币种符号", text: false, isNeed: false },
            { xl: "createDate", ns: "custrecord_swc_jj_drr_createdate", help: "创建时间（报表时间）", text: false, isNeed: false, date: true },
            { xl: "standardDate", ns: "custrecord_swc_jj_drr_standarddate", help: "标准时间", text: false, isNeed: false, date: true },
            { xl: "marketDate", ns: "custrecord_swc_jj_drr_marketdate", help: "市场时间", text: false, isNeed: false, date: true },
            { xl: "updateDate", ns: "custrecord_swc_jj_drr_updatedate", help: "更新时间", text: false, isNeed: false, date: true },
            { xl: "zeroDate", ns: "custrecord_swc_jj_drr_zerodate", help: "零时区时间", text: false, isNeed: false, date: true },
            { xl: "settlementId", ns: "custrecord_swc_jj_drr_settlementid", help: "结算ID", text: false, isNeed: false },
            { xl: "orderType", ns: "custrecord_swc_jj_drr_ordertype", help: "报表类型", text: false, isNeed: false },
            { xl: "type", ns: "custrecord_swc_jj_drr_type", help: "费用类型", text: false, isNeed: false },
            { xl: "feeType", ns: "custrecord_swc_jj_drr_feetype", help: "费用类型（兼容字段）", text: false, isNeed: false },
            { xl: "orderId", ns: "custrecord_swc_jj_drr_orderid", help: "亚马逊订单编号", text: false, isNeed: false },
            { xl: "saleOrderType", ns: "custrecord_swc_jj_drr_saleordertype", help: "销售订单类型", text: false, isNeed: false },
            { xl: "testOrder", ns: "custrecord_swc_jj_drr_testorder", help: "是否测评订单", text: false, isNeed: false },
            { xl: "testOrderName", ns: "custrecord_swc_jj_drr_testordername", help: "测评订单名称", text: false, isNeed: false },
            { xl: "SKU", ns: "custrecord_swc_jj_drr_sku", help: "MSKU", text: false, isNeed: false },
            { xl: "originSku", ns: "custrecord_swc_jj_drr_originsku", help: "源文件SKU", text: false, isNeed: false },
            { xl: "product", ns: "custrecord_swc_jj_drr_product", help: "SKU（来源于产品）", text: false, isNeed: false },
            { xl: "description", ns: "custrecord_swc_jj_drr_description", help: "费用说明", text: false, isNeed: false },
            { xl: "quantity", ns: "custrecord_swc_jj_drr_quantity", help: "数量", text: false, isNeed: false },
            { xl: "marketplace", ns: "custrecord_swc_jj_drr_marketplace", help: "市场", text: false, isNeed: false },
            { xl: "fulfillment", ns: "custrecord_swc_jj_drr_fulfillment", help: "配送类型", text: false, isNeed: false },
            { xl: "countryCode", ns: "custrecord_swc_jj_drr_countrycode", help: "国家编码", text: false, isNeed: false },
            { xl: "countryName", ns: "custrecord_swc_jj_drr_countryname", help: "国家名称", text: false, isNeed: false },
            { xl: "orderCity", ns: "custrecord_swc_jj_drr_ordercity", help: "订单城市", text: false, isNeed: false },
            { xl: "orderState", ns: "custrecord_swc_jj_drr_orderstate", help: "订单状态", text: false, isNeed: false },
            { xl: "orderPostal", ns: "custrecord_swc_jj_drr_orderpostal", help: "订单邮寄", text: false, isNeed: false },
            { xl: "taxCollectionModel", ns: "custrecord_swc_jj_drr_taxcollectionmodel", help: "税收征管模式", text: false, isNeed: false },
            { xl: "productSales", ns: "custrecord_swc_jj_drr_productsales", help: "商品价格（售价）", text: false, isNeed: false },
            { xl: "productSalesTax", ns: "custrecord_swc_jj_drr_productsalestax", help: "商品价格税", text: false, isNeed: false },
            { xl: "shippingCredits", ns: "custrecord_swc_jj_drr_shippingcredits", help: "运费", text: false, isNeed: false },
            { xl: "shippingCreditsTax", ns: "custrecord_swc_jj_drr_shippingcreditstax", help: "运费税", text: false, isNeed: false },
            { xl: "giftWrapCredits", ns: "custrecord_swc_jj_drr_giftwrapcredits", help: "礼品包装费", text: false, isNeed: false },
            { xl: "giftWrapCreditsTax", ns: "custrecord_swc_jj_drr_giftwrapcreditstax", help: "礼品包装费税", text: false, isNeed: false },
            { xl: "regulatoryFee", ns: "custrecord_swc_jj_drr_regulatoryfee", help: "监管费", text: false, isNeed: false },
            { xl: "regulatoryFeeTax", ns: "custrecord_swc_jj_drr_regulatoryfeetax", help: "监管费税", text: false, isNeed: false },
            { xl: "promotionalRebates", ns: "custrecord_swc_jj_drr_promotionalrebates", help: "折扣金额", text: false, isNeed: false },
            { xl: "promotionalRebatesTax", ns: "custrecord_swc_jj_drr_pmt_rebates_tax", help: "折扣金额税", text: false, isNeed: false },
            { xl: "pointsGranted", ns: "custrecord_swc_jj_drr_pointsgranted", help: "积分金额", text: false, isNeed: false },
            { xl: "marketplaceWithheldTax", ns: "custrecord_swc_jj_drr_mp_withheld_tax", help: "市场预扣税", text: false, isNeed: false },
            { xl: "sellingFees", ns: "custrecord_swc_jj_drr_sellingfees", help: "销售佣金", text: false, isNeed: false },
            { xl: "fbaFees", ns: "custrecord_swc_jj_drr_fbafees", help: "配送相关费用", text: false, isNeed: false },
            { xl: "otherTransactionFees", ns: "custrecord_swc_jj_drr_other_tsc_fee", help: "其他交易费用", text: false, isNeed: false },
            { xl: "other", ns: "custrecord_swc_jj_drr_other", help: "其它", text: false, isNeed: false },
            { xl: "total", ns: "custrecord_swc_jj_drr_total", help: "总计", text: false, isNeed: false },
            { xl: "tcscgst", ns: "custrecord_swc_jj_drr_tcscgst", help: "印度站专有tcscgst", text: false, isNeed: false },
            { xl: "tcssgst", ns: "custrecord_swc_jj_drr_tcssgst", help: "印度站专有tcssgst", text: false, isNeed: false },
            { xl: "tcsigst", ns: "custrecord_swc_jj_drr_tcsigst", help: "印度站专有tcsigst", text: false, isNeed: false },
            { xl: "tds", ns: "custrecord_swc_jj_drr_tds", help: "印度站专有tds", text: false, isNeed: false },

        ]

        return {
            'get': doGet,
            put: doPut,
            post: doPost,
            'delete': doDelete
        };

    });
