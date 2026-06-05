/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * @author SWR
 * @description 积加-NS 其它平台日期范围报告
 */
define(['N/format', 'N/error', 'N/runtime', 'N/search', 'N/record', '../common/interface', '../common/moment'],
    function (format, error, runtime, search, record, interface, moment) {

        var rec_Type = 'customrecord_swc_settlement_report';

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

                var currencyObj =  searchCurrencyObj();

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
                    log.error('传入json',element);
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
                                log.audit('ns',ns);
                                if (xl == 'currency') {
                                    if (value in currencyObj)
                                        value = currencyObj[value] || '';
                                    rec.setValue({ fieldId: ns, value: value });
                                    continue
                                }
                                if (date) {
                                    // rec.setText({ fieldId: ns, text: value });
                                    if (xl == 'standardDate') {
                                        // var standardDate_date = format.format({ value: moment.utc(value).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                                        // standardDate_date = format.parse({ value: standardDate_date, type: 'date' });
                                        //
                                        // log.error('standardDate_date', standardDate_date);

                                        var standardDate_date = value.split(' ')[0];
                                        if (standardDate_date) {
                                            rec.setText({ fieldId: 'custrecord_swc_standarddate', text: standardDate_date});
                                        }
                                    }
                                    if (xl == 'marketDate') {
                                        // var marketDate_date = format.format({ value: moment.utc(value).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                                        // marketDate_date = format.parse({ value: marketDate_date, type: 'date' });
                                        // log.audit('marketDate_date', marketDate_date);

                                        var marketDate_date = value.split(' ')[0];
                                        if (marketDate_date) {
                                            rec.setText({ fieldId: 'custrecord_swc_marketdate', text: marketDate_date});
                                        }
                                    }
                                    if (xl == 'zeroDate') {
                                        if (acc_info) {
                                            var zeroDate_date = format.format({
                                                value: moment.utc(value).toDate(),
                                                type: format.Type.DATETIMETZ,
                                                timezone: acc_info.store_time_zone
                                            });
                                            zeroDate_date = format.parse({value: zeroDate_date, type: 'date'});
                                            log.audit('zeroDate_date', zeroDate_date);

                                            if (zeroDate_date) {
                                                rec.setValue(
                                                    {fieldId: 'custrecord_swc_zerodate', value: zeroDate_date});
                                            }
                                        }
                                    }
                                    if (xl == 'updateDate') {
                                        // var updateDate_date = format.format({ value: moment.utc(value).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                                        // updateDate_date = format.parse({ value: updateDate_date, type: 'date' });
                                        // log.audit('updateDate_date', updateDate_date);


                                        var updateDate_date = value.split(' ')[0];
                                        if (updateDate_date) {
                                            rec.setText({ fieldId: 'custrecord_swc_updatedate', text: updateDate_date });
                                        }
                                    }
                                    continue
                                }
                                // if (xl == 'marketId') {
                                //     rec.setValue({ fieldId: 'custrecord_swc_jj_drr_store', value: acc_info.id });
                                //     rec.setValue({ fieldId: ns, value: value });
                                //     continue
                                // }
                                if (text) {
                                    rec.setText({ fieldId: ns, text: value });
                                } else {
                                    rec.setValue({ fieldId: ns, value: value });
                                }
                            }
                        };
                        rec.setValue({ fieldId: 'custrecord_swc_qtjs_json', value: element});
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
            { xl: "id", ns: "custrecord_swc_id", help: "ID 主键", text: false, isNeed: true },
            { xl: "marketId", ns: "custrecord_swc_marketid", help: "站点ID", text: false, isNeed: true },
            { xl: "currency", ns: "custrecord_swc_s_currency", help: "币种", text: false, isNeed: true },
            // { xl: "currencySymbol", ns: "custrecord_swc_jj_drr_currencysymbol", help: "币种符号", text: false, isNeed: false },
            { xl: "createDate", ns: "custrecord_swc_createdate", help: "创建时间 [示例：Sep 1, 2021 12:17:22 AM PDT]", text: false, isNeed: true },
            { xl: "standardDate", ns: "custrecord_swc_standarddate", help: "标准时间", text: false, isNeed: true, date: true },
            { xl: "marketDate", ns: "custrecord_swc_marketdate", help: "市场（站点）时间 [yyyy-MM-dd HH:mm:ss]", text: false, isNeed: true,date: true },
            { xl: "zeroDate", ns: "custrecord_swc_zerodate", help: "零时区时间", text: false, isNeed: true, date: true },
            { xl: "settlementId", ns: "custrecord_swc_settlementid", help: "结算ID", text: false, isNeed: true },
            { xl: "orderType", ns: "custrecord_swc_ordertype", help: "报表类型", text: false, isNeed: true },
            { xl: "tipoDeConta", ns: "custrecord_swc_tipodeconta", help: "tipoDeConta", text: false, isNeed: true },
            { xl: "type", ns: "custrecord_swc_type", help: "类型", text: false, isNeed: true },
            { xl: "orderId", ns: "custrecord_swc_s_orderid", help: "订单编号", text: false, isNeed: true },
            { xl: "saleOrderType", ns: "custrecord_swc_saleordertype", help: "订单类型", text: false, isNeed: true },
            { xl: "sku", ns: "custrecord_swc_s_sku", help: "sku", text: false, isNeed: false },
            { xl: "originSku", ns: "custrecord_swc_originsku", help: "原表SKU列", text: false, isNeed: false },
            { xl: "msku", ns: "custrecord_swc_s_msku", help: "msku", text: false, isNeed: true },
            { xl: "product", ns: "custrecord_swc_product", help: "产品名称", text: false, isNeed: true },
            { xl: "description", ns: "custrecord_swc_description", help: "费用说明", text: false, isNeed: true },
            { xl: "quantity", ns: "custrecord_swc_s_quantity", help: "数量", text: false, isNeed: true },
            { xl: "marketplace", ns: "custrecord_swc_marketplace", help: "市场", text: false, isNeed: true },
            { xl: "fulfillment", ns: "custrecord_swc_fulfillment", help: "配送类型", text: false, isNeed: true },
            { xl: "orderCity", ns: "custrecord_swc_ordercity", help: "订单城市", text: false, isNeed: true },
            { xl: "orderState", ns: "custrecord_swc_orderstate", help: "订单地区", text: false, isNeed: true },
            { xl: "orderPostal", ns: "custrecord_swc_orderpostal", help: "订单邮编", text: false, isNeed: true },
            { xl: "taxCollectionModel", ns: "custrecord_swc_taxcollectionmodel", help: "税收征管模式", text: false, isNeed: true },
            { xl: "productSales", ns: "custrecord_swc_productsales", help: "售价", text: false, isNeed: true },
            { xl: "productSalesTax", ns: "custrecord_swc_productsalestax", help: "商品价格税", text: false, isNeed: true },
            { xl: "shippingCredits", ns: "custrecord_swc_shippingcredits", help: "运费", text: false, isNeed: true },
            { xl: "shippingCreditsTax", ns: "custrecord_swc_shippingcreditstax", help: "运费税", text: false, isNeed: true },
            { xl: "giftWrapCredits", ns: "custrecord_swc_giftwrapcredits", help: "礼品包装费", text: false, isNeed: true },
            { xl: "giftWrapCreditsTax", ns: "custrecord_swc_giftwrapcreditstax", help: "礼品包装费税", text: false, isNeed: true },
            { xl: "regulatoryFee", ns: "custrecord_swc_regulatoryfee", help: "监管费", text: false, isNeed: true },
            { xl: "regulatoryFeeTax", ns: "custrecord_swc_regulatoryfeetax", help: "监管费税", text: false, isNeed: true },
            { xl: "promotionalRebates", ns: "custrecord_swc_promotionalrebates", help: "促销折扣金额", text: false, isNeed: true },
            { xl: "promotionalRebatesTax", ns: "custrecord_swc_promotionalrebatestax", help: "促销折扣金额税", text: false, isNeed: true },
            { xl: "pointsGranted", ns: "custrecord_swc_pointsgranted", help: "积分", text: false, isNeed: true },
            { xl: "collectionVat", ns: "custrecord_swc_collectionvat", help: "collectionVat", text: false, isNeed: false },
            { xl: "marketplaceWithheldTax", ns: "custrecord_swc_marketplacewithheldtax", help: "市场预估税", text: false, isNeed: true },
            { xl: "sellingFees", ns: "custrecord_swc_sellingfees", help: "销售佣金", text: false, isNeed: true },
            { xl: "fbaFees", ns: "custrecord_swc_fbafees", help: "配送相关费用", text: false, isNeed: true },
            { xl: "otherTransactionFees", ns: "custrecord_swc_othertransactionfees", help: "其他交易费用", text: false, isNeed: true },
            { xl: "other", ns: "custrecord_swc_other", help: "其它", text: false, isNeed: true },
            { xl: "total", ns: "custrecord_swc_total", help: "总计金额", text: false, isNeed: true },
            { xl: "baseTotal", ns: "custrecord_swc_basetotal", help: "废弃", text: false, isNeed: false },
            { xl: "tcscgst", ns: "custrecord_swc_tcscgst", help: "TCS-CGST", text: false, isNeed: true },
            { xl: "tcssgst", ns: "custrecord_swc_tcssgst", help: "TCS-SGST", text: false, isNeed: true },
            { xl: "tcsigst", ns: "custrecord_swc_tcsigst", help: "TCS-IGST", text: false, isNeed: true },
            { xl: "updateDate", ns: "custrecord_swc_updatedate", help: "更新时间", text: false, isNeed: false ,date: true},
            { xl: "testOrder", ns: "custrecord_swc_testorder", help: "是否推广订单", text: false, isNeed: true },
            { xl: "testOrderName", ns: "custrecord_swc_testordername", help: "推广订单", text: false, isNeed: true },
            { xl: "productName", ns: "custrecord_swc_productname", help: "productName", text: false, isNeed: true },
            { xl: "countryCode", ns: "custrecord_swc_countrycode", help: "国家编码", text: false, isNeed: true },
            { xl: "feeType", ns: "custrecord_swc_feetype", help: "费用类型", text: false, isNeed: true },
            { xl: "dataBatchNo", ns: "custrecord_swc_databatchno", help: "批次号", text: false, isNeed: true },
            { xl: "platformCode", ns: "custrecord_swc_settlement_platformcode", help: "平台编码", text: false, isNeed: false},
            { xl: "notax", ns: "custrecord_swc_othertk_notax", help: "退款-未税金额", text: false, isNeed: false },
            { xl: "tax", ns: "custrecord_swc_othertk_tax", help: "退款-税额", text: false, isNeed: false },
            { xl: "disable", ns: "custrecord_swc_othertk_disable", help: "退款-IT未处理", text: false, isNeed: false}
        ];

        function searchCurrencyObj() {
            const currencySearchObj = search.create({
                type: "currency",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "name", label: "名称"}),
                        search.createColumn({name: "symbol", label: "符号"})
                    ]
            });

            var currencyObj = {};
            currencySearchObj.run().each(function(result){
                var key = result.getValue({name: "symbol", label: "符号"});
                currencyObj[key] = result.id;
                return true;
            });

            return currencyObj
        }

        return {
            'get': doGet,
            put: doPut,
            post: doPost,
            'delete': doDelete
        };

    });