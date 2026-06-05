/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * @author SWR
 * @description 3pl预估仓租费
 */
define(['N/format', 'N/error', 'N/runtime', 'N/search', 'N/record', '../common/interface', '../common/moment'],
    function (format, error, runtime, search, record, interface, moment) {

        var rec_Type = 'customrecord_swc_tpl_rental_fee';

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

                for (let d = 0; d < data.length; d++) {
                    const element = data[d];
                    try {
                        var s_id = '';
                        var externalid = element.sku + '_' + element.jtck + '_' + element.order  + '_' + element.jfdate;
                        search.create({
                            type: rec_Type,
                            filters: [
                                { name: 'externalid', operator: 'is', values: externalid },
                            ],
                        }).run().each(function (rec) {
                            s_id = rec.id;
                        });
                        log.audit('s_id',s_id);

                        if (s_id) {
                            // var rec = record.load({ type: rec_Type, id: s_id, isDynamic: false });
                            err_message.push(externalid + ':' + '数据导入重复，请检查')
                            fail_externalid.push(externalid);
                        } else if (!element.amount) {
                            err_message.push(externalid + ':' + '金额为空或为零');
                            fail_externalid.push(externalid);
                        } else {
                            var rec = record.create({type: rec_Type, isDynamic: false});
                            rec.setValue({
                                fieldId: 'externalid',
                                value: externalid
                            })

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
                                    if (text) {
                                        rec.setText({fieldId: ns, text: value});
                                    } else {
                                        rec.setValue({fieldId: ns, value: value});
                                    }
                                }
                            }
                            var id = rec.save({ ignoreMandatoryFields: true });
                            save_nsid.push(id);
                            success_externalid.push(externalid);
                        }
                    } catch (error) {
                        log.error('error', error);
                        var e = error.message ? error.message : error;
                        err_message.push(externalid + ':' + e)
                        fail_externalid.push(externalid);
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
            { xl: "sku", ns: "custrecord_tpl_rental_fee_sku", help: "SKU", text: false, isNeed: true },
            { xl: "cksku", ns: "custrecord_tpl_rental_fee_cksku", help: "仓库SKU", text: false, isNeed: false },
            { xl: "type", ns: "custrecord_tpl_rental_fee_type", help: "产品类型", text: false, isNeed: false },
            { xl: "ejpl", ns: "custrecord_tpl_rental_fee_ejpl", help: "二级品类", text: false, isNeed: false },
            { xl: "name", ns: "custrecord_tpl_rental_fee_name", help: "名称", text: false, isNeed: false },
            { xl: "country", ns: "custrecord_tpl_rental_fee_country", help: "国家", text: false, isNeed: false },
            { xl: "ckgs", ns: "custrecord_tpl_rental_fee_ckgs", help: "仓库归属", text: false, isNeed: false },
            { xl: "service", ns: "custrecord_tpl_rental_fee_service", help: "服务商", text: false, isNeed: false },
            { xl: "region", ns: "custrecord_tpl_rental_fee_region", help: "地区", text: false, isNeed: false },
            { xl: "jtck", ns: "custrecord_tpl_rental_fee_jtck", help: "具体仓库", text: false, isNeed: true },
            { xl: "order", ns: "custrecord_tpl_rental_fee_order", help: "入库单号", text: false, isNeed: true },
            { xl: "number", ns: "custrecord_tpl_rental_fee_number", help: "数量", text: false, isNeed: false },
            { xl: "long", ns: "custrecord_tpl_rental_fee_long", help: "长/cm", text: false, isNeed: false },
            { xl: "wide", ns: "custrecord_tpl_rental_fee_wide", help: "宽/cm", text: false, isNeed: false },
            { xl: "high", ns: "custrecord_tpl_rental_fee_high", help: "高/cm", text: false, isNeed: false },
            { xl: "weight", ns: "custrecord_tpl_rental_fee_weight", help: "重量/kg", text: false, isNeed: false },
            { xl: "volume", ns: "custrecord_tpl_rental_fee_volume", help: "体积/m³", text: false, isNeed: false },
            { xl: "rkdate", ns: "custrecord_tpl_rental_fee_rkdate", help: "入库日期", text: true, isNeed: false },
            { xl: "jfdate", ns: "custrecord_tpl_rental_fee_jfdate", help: "计费日期", text: true, isNeed: true },
            { xl: "days", ns: "custrecord_tpl_rental_fee_days", help: "库龄天数", text: false, isNeed: false },
            { xl: "czlx", ns: "custrecord_tpl_rental_fee_czlx", help: "仓租类型", text: false, isNeed: false },
            { xl: "amount", ns: "custrecord_tpl_rental_fee_amount", help: "计费金额", text: false, isNeed: false },
            { xl: "currency", ns: "custrecord_tpl_rental_fee_currency", help: "币种", text: false, isNeed: false },
            { xl: "csdate", ns: "custrecord_tpl_rental_fee_csdate", help: "测算时间", text: true, isNeed: false }
        ];


        return {
            'get': doGet,
            put: doPut,
            post: doPost,
            'delete': doDelete
        };

    });