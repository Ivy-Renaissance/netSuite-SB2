/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * @author SWR
 * @description 积加-NS V2结算报告
 */
define(['N/format', 'N/error', 'N/runtime', 'N/search', 'N/record', '../common/interface', '../common/moment'],
    function (format, error, runtime, search, record, interface, moment) {

        var rec_Type = 'customrecord_swc_amazon_v2';

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
                                    // rec.setValue({ fieldId: ns, value: value });

                                    if (acc_info) {
                                        if (xl == 'postedDateTime') {
                                            var postedDateTime_date = format.format({
                                                value: moment.utc(value).toDate(),
                                                type: format.Type.DATETIMETZ,
                                                timezone: acc_info.store_time_zone
                                            });
                                            postedDateTime_date = format.parse(
                                                {value: postedDateTime_date, type: 'date'});
                                            log.audit('postedDateTime_date', postedDateTime_date);
                                            if (postedDateTime_date) {
                                                rec.setValue({
                                                    fieldId: 'custrecord_swc_amzv2_posteddatetime',
                                                    value: postedDateTime_date
                                                });
                                            }
                                        }
                                        if (xl == 'createTime') {
                                            var createTime_date = format.format({
                                                value: moment.utc(value).toDate(),
                                                type: format.Type.DATETIMETZ,
                                                timezone: acc_info.store_time_zone
                                            });
                                            createTime_date = format.parse({value: createTime_date, type: 'date'});
                                            log.audit('createTime_date', createTime_date);
                                            if (createTime_date) {
                                                rec.setValue({
                                                    fieldId: 'custrecord_swc_amzv2_createtime',
                                                    value: createTime_date
                                                });
                                            }
                                        }
                                        if (xl == 'updateTime') {
                                            var updateTime_date = format.format({
                                                value: moment.utc(value).toDate(),
                                                type: format.Type.DATETIMETZ,
                                                timezone: acc_info.store_time_zone
                                            });
                                            updateTime_date = format.parse({value: updateTime_date, type: 'date'});
                                            log.audit('updateTime_date', updateTime_date);
                                            if (updateTime_date) {
                                                rec.setValue({
                                                    fieldId: 'custrecord_swc_amzv2_updatetime',
                                                    value: updateTime_date
                                                });
                                            }
                                        }
                                    }
                                    continue
                                }

                                // if (xl == 'postedDateTime') {
                                //     rec.setText({
                                //         fieldId: 'custrecord_swc_amzv2_creat_date',
                                //         text: value.split(' ')[0]
                                //     });
                                // }
                                // if (xl == 'marketId') {
                                //     rec.setValue({ fieldId: 'custrecord_swc_amzv2_marketid', value: acc_info.id });
                                //     rec.setValue({ fieldId: ns, value: value });
                                //     continue
                                // }
                                if (xl == 'postedDateTimeTransfer') {
                                    var postedDate = toStandardDateFormat(value);
                                    rec.setValue({
                                        fieldId: 'custrecord_swc_amzv2_posteddate',
                                        value: value
                                    });
                                    if (postedDate) rec.setText({ fieldId: ns, text: postedDate });
                                    continue;
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
            { xl: "marketId", ns: "custrecord_swc_amzv2_marketid", help: "站点ID", text: false, isNeed: false },
            { xl: "marketName", ns: "custrecord_swc_amzv2_marketname", help: "站点名称", text: false, isNeed: false },
            { xl: "settlementId", ns: "custrecord_swc_amzv2_settlementid", help: "结算编码", text: false, isNeed: false },
            // { xl: "postedDate", ns: "custrecord_swc_amzv2_creat_date", help: "源表字段", text: true, isNeed: false },
            { xl: "orderId", ns: "custrecord_swc_amzv2_orderid", help: "源表order-id", text: false, isNeed: false },
            { xl: "merchantOrderId", ns: "custrecord_swc_amzv2_merchantorderid", help: "源表merchant-order-id", text: false, isNeed: false },
            { xl: "adjustmentId", ns: "custrecord_swc_amzv2_adjustmentid", help: "源表adjustment-id", text: false, isNeed: false },
            { xl: "shipmentId", ns: "custrecord_swc_amzv2_shipmentid", help: "源表shipment-id", text: false, isNeed: false },
            { xl: "marketplaceName", ns: "custrecord_swc_amzv2_marketplacename", help: "源表marketplace-name", text: false, isNeed: false },
            { xl: "amountType", ns: "custrecord_swc_amzv2_amounttype", help: "源表amount-type", text: false, isNeed: false },
            { xl: "amountDescription", ns: "custrecord_swc_amzv2_amountdescription", help: "源表amount-description", text: false, isNeed: false },
            { xl: "currency", ns: "custrecord_swc_amzv2_currency", help: "币种", text: false, isNeed: false },
            { xl: "amount", ns: "custrecord_swc_amzv2_amount", help: "源表amount", text: false, isNeed: false },
            { xl: "fulfillmentId", ns: "custrecord_swc_amzv2_fulfillmentid", help: "源表fulfillment-id", text: false, isNeed: false },
            { xl: "postedDateTime", ns: "custrecord_swc_amzv2_posteddatetime", help: "源表posted-date", text: false, isNeed: false },
            { xl: "orderItemCode", ns: "custrecord_swc_amzv2_orderitemcode", help: "源表order-item-code", text: false, isNeed: false },
            { xl: "merchantOrderItemId", ns: "custrecord_swc_amzv2_merchantorderitemid", help: "源表merchant-order-item-id", text: false, isNeed: false },
            { xl: "merchantAdjustmentItemId", ns: "custrecord_swc_amzv2_merchantadjustmenti", help: "源表merchant-adjustment-item-id", text: false, isNeed: false },
            { xl: "quantityPurchased", ns: "custrecord_swc_amzv2_quantitypurchased", help: "源表quantity-purchased", text: false, isNeed: false },
            { xl: "promotionId", ns: "custrecord_swc_amzv2_promotionid", help: "promotion-id", text: false, isNeed: false },
            { xl: "msku", ns: "custrecord_swc_amzv2_msku", help: "源表的SKU", text: false, isNeed: false },
            { xl: "transactionType", ns: "custrecord_swc_amzv2_transactiontype", help: "源表transaction-type", text: false, isNeed: false },
            { xl: "sku", ns: "custrecord_swc_amzv2_sku", help: "通过MSKU转换的sku", text: false, isNeed: false },
            { xl: "productName", ns: "custrecord_swc_amzv2_productname", help: "产品名称", text: false, isNeed: false },
            { xl: "createTime", ns: "custrecord_swc_amzv2_createtime", help: "创建时间", text: false, isNeed: false },
            { xl: "updateTime", ns: "custrecord_swc_amzv2_updatetime", help: "更新时间", text: false, isNeed: false },
            // { xl: "createDate", ns: "custrecord_swc_amzv2_creat_date", help: "创建日期", text: true, isNeed: false }
            { xl: "postedDateTimeTransfer", ns: "custrecord_swc_amzv2_creat_date", help: "源表字段", text: true, isNeed: false },
        ];

        /**
         * 将各种常见日期字符串转换为 YYYY-MM-DD 格式
         * @param {string} dateStr - 输入的日期字符串
         * @returns {string} - 格式化后的日期 YYYY-MM-DD，无效时返回空字符串或原值（可根据需要调整）
         */
        function toStandardDateFormat(dateStr) {
            if (!dateStr || typeof dateStr !== 'string') return '';

            // 去除首尾空白
            dateStr = dateStr.split(' ')[0];

            // 尝试匹配分隔符：- . /
            const separatorMatch = dateStr.match(/[-\/.]/);
            if (!separatorMatch) return dateStr; // 无分隔符，无法解析

            const separator = separatorMatch[0];
            const parts = dateStr.split(separator);
            if (parts.length !== 3) return dateStr;

            let year, month, day;

            // 判断格式：第一部分为4位数字 → YYYY-MM-DD
            if (parts[0].length === 4 && /^\d{4}$/.test(parts[0])) {
                year = parts[0];
                month = parts[1].padStart(2, '0');
                day = parts[2].padStart(2, '0');
            }
            // 最后一部分为4位数字 → DD.MM.YYYY 或 DD/MM/YYYY
            else if (parts[2].length === 4 && /^\d{4}$/.test(parts[2])) {
                day = parts[0].padStart(2, '0');
                month = parts[1].padStart(2, '0');
                year = parts[2];
            }
            // 其他情况（如 MM/DD/YYYY）需要根据业务定制，这里默认按 日-月-年 兜底
            else {
                // 假设是 DD-MM-YYYY 或 DD.MM.YYYY，但月份写在中间
                if (parts[2].length === 4) {
                    day = parts[0].padStart(2, '0');
                    month = parts[1].padStart(2, '0');
                    year = parts[2];
                } else {
                    return dateStr; // 无法识别
                }
            }

            // 验证日期有效性
            const testDate = new Date(`${year}-${month}-${day}`);
            if (isNaN(testDate.getTime())) return dateStr; // 无效日期

            return `${year}-${month}-${day}`;
        }

        return {
            'get': doGet,
            put: doPut,
            post: doPost,
            'delete': doDelete
        };

    });