/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * @author SWR
 * @description 积加-NS 其它平台日期范围报告
 */
define(['N/format', 'N/error', 'N/runtime', 'N/search', 'N/record', '../common/interface', '../common/moment'],
    function (format, error, runtime, search, record, interface, moment) {

        var rec_Type = 'customrecord_swc_amz_inventoryledger';

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
                    market_ids.push(data[i].warehouseId)
                }
                log.audit('market_ids', market_ids);

                var n_market_ids = [...new Set(market_ids)];
                log.audit('n_market_ids', n_market_ids);
                var storeList = interface.getAccountList('', n_market_ids);
                log.audit('storeList',storeList);

                for (let d = 0; d < data.length; d++) {
                    const element = data[d];
                    try {
                        var acc_info;
                        for (let j = 0; j < storeList.length; j++) {
                            if (storeList[j].jj_marketid == element.warehouseId) {
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
                                    rec.setValue({ fieldId: ns, value: new Date(value)});

                                    if (xl == 'updateTime') {
                                        var updatetime_date = format.format({ value: moment.utc(value).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                                        updatetime_date = format.parse({ value: updatetime_date, type: 'date' });
                                        log.audit('updatetime_date', updatetime_date);
                                        if (updatetime_date) {
                                            rec.setValue({ fieldId: 'custrecord_swc_amz_updatetime', value: new Date(updatetime_date)});
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
            { xl: "warehouseName", ns: "custrecord_swc_amz_warehousename", help: "仓库名称", text: false, isNeed: false },
            { xl: "warehouseId", ns: "custrecord_swc_amz_warehouseid", help: "仓库id", text: false, isNeed: false },
            { xl: "reportDate", ns: "custrecord_swc_amz_reportdate", help: "报表日期", text: false, isNeed: false },
            { xl: "skuName", ns: "custrecord_swc_amz_skuname", help: "产品名称", text: false, isNeed: false },
            { xl: "sku", ns: "custrecord_swc_amz_sku", help: "SKU", text: false, isNeed: false },
            { xl: "fnsku", ns: "custrecord_swc_amz_fnsku", help: "FNSKU", text: false, isNeed: false },
            { xl: "sourceMsku", ns: "custrecord_swc_amz_ybmsku", help: "原表MSKU", text: false, isNeed: false },
            { xl: "msku", ns: "custrecord_swc_amz_msku", help: "MSKU", text: false, isNeed: false },
            { xl: "asin", ns: "custrecord_swc_amz_asin", help: "ASIN", text: false, isNeed: false },
            { xl: "disposition", ns: "custrecord_swc_amz_disposition", help: "库存属性", text: false, isNeed: false },
            { xl: "referenceId", ns: "custrecord_swc_amz_referenceid", help: "内部编号", text: false, isNeed: false },
            { xl: "quantity", ns: "custrecord_swc_amz_quantity", help: "数量", text: false, isNeed: false },
            { xl: "eventType", ns: "custrecord_swc_amz_eventtype", help: "动作类型", text: false, isNeed: false },
            { xl: "fulfillmentCenter", ns: "custrecord_swc_amz_fulfillmentcenter", help: "运营中心", text: false, isNeed: false },
            { xl: "country", ns: "custrecord_swc_amz_country", help: "国家", text: false, isNeed: false },
            { xl: "reason", ns: "custrecord_swc_amz_reason", help: "原因", text: false, isNeed: false },
            { xl: "reconciledQuantity", ns: "custrecord_swc_amz_reconciledquantity", help: "已调整数量", text: false, isNeed: false },
            { xl: "unreconciledQuantity", ns: "custrecord_swc_amz_unreconciledquantity", help: "未调整数量", text: false, isNeed: false },
            { xl: "createTime", ns: "custrecord_swc_amz_createtime", help: "创建时间", text: false, isNeed: false },
            // { xl: "showDetailButton", ns: "", help: "是否展示按钮，true=展示，false=隐藏", text: false, isNeed: false },
            { xl: "updateTime", ns: "custrecord_swc_amz_updatetime", help: "系统获取报告更新的时间,yyyy-MM-dd HH:mm:ss", text: false, isNeed: false, date: true }
        ];


        return {
            'get': doGet,
            put: doPut,
            post: doPost,
            'delete': doDelete
        };

    });