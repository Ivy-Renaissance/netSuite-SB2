/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * @name SWC_RL_JJ_PT_ADV.js
 * @author ZJG
 * @description 积加-其他平台广告数据
 */
define(['N/format', 'N/error', 'N/runtime', 'N/search', 'N/record', '../common/interface', '../common/moment'],
    function (format, error, runtime, search, record, interface, moment) {

        var rec_Type = 'customrecord_swc_op_advertisement';

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
                checkData(requestBody);
                outcome = CreatedRecord(requestBody);
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


        function CreatedRecord(requestBody) {
            try {
                log.audit('CreatedRecord', requestBody);
                var result = {};
                var rec = record.create({ type: rec_Type, isDynamic: false });
                for (var i in body_main) {
                    var jj = body_main[i].jj;
                    var ns = body_main[i].ns;
                    var text = body_main[i].text;
                    var value = requestBody[jj];
                    log.audit('i的属性值=' + i, {
                        jj: jj,
                        ns: ns,
                        text: text,
                        value: value,
                    });
                    if (value && ns) {
                        if (jj == 'date') {
                            log.audit('date', format.parse({ value: moment(value).toDate(), type: 'date' }));
                            rec.setValue({ fieldId: ns, value: value });
                            rec.setValue({ fieldId: 'custrecord_swc_date', value: format.parse({ value: moment(value).toDate(), type: 'date' }) });
                            continue
                        } else if (jj == 'startDate') {
                            log.audit('startDate', format.parse({ value: moment(value).toDate(), type: 'date' }));
                            rec.setValue({ fieldId: ns, value: value });
                            rec.setValue({ fieldId: 'custrecord_swc_start_date', value: format.parse({ value: moment(value).toDate(), type: 'date' }) });
                            continue
                        } else if (jj == 'endDate') {
                            log.audit('endDate', format.parse({ value: moment(value).toDate(), type: 'date' }));
                            rec.setValue({ fieldId: ns, value: value });
                            rec.setValue({ fieldId: 'custrecord_swc_end_date', value: format.parse({ value: moment(value).toDate(), type: 'date' }) });
                            continue
                        } else if (jj == 'sku') {
                            var item_id = '';
                            search.create({
                                type: 'item',
                                filters: [
                                    { name: 'displayname', operator: 'is', values: value },
                                ],
                            }).run().each(function (irec) {
                                item_id = irec.id;
                            });
                            if (!item_id) {
                                throw 'NS找不到系统SKU:' + value
                            }
                            rec.setValue({ fieldId: 'custrecord_swc_sku', value: item_id });
                            continue
                        }
                    }
                    if (text) {
                        rec.setText({ fieldId: ns, text: value });
                    } else {
                        rec.setValue({ fieldId: ns, value: value });
                    }
                };

                var id = rec.save({ ignoreMandatoryFields: true });
                var data = {
                    id: id
                }
                result.code = 200;
                result.data = data;
                result.msg = '数据存储成功';
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
                    var key = bean[i].jj
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
                    var value = context[bean[i].jj]
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
            { jj: 'externalid', ns: 'externalid', help: '外部ID', text: true, isNeed: true },
            { jj: 'platform', ns: 'custrecord_swc_op_platform', help: '平台', text: true, isNeed: true },
            { jj: 'advertisingType', ns: 'custrecord_swc_advertising_type', help: '广告类型', text: true, isNeed: true },
            { jj: 'sku', ns: 'custrecord_swc_sku', help: 'SKU', text: true, isNeed: false },
            { jj: 'category', ns: 'custrecord_swc_category', help: '品类', text: true, isNeed: true },
            { jj: 'price', ns: 'custrecord_swc_price', help: '金额', text: false, isNeed: true },
            { jj: 'date', ns: 'custrecord_swc_date_time', help: '日期', text: true, isNeed: false },
            { jj: 'during', ns: 'custrecord_swc_during', help: '期间', text: true, isNeed: true },
            { jj: 'startDate', ns: 'custrecord_swc_start_date_time', help: '开始日期', text: true, isNeed: true },
            { jj: 'endDate', ns: 'custrecord_swc_end_date_time', help: '结束日期', text: true, isNeed: true },
            { jj: 'store', ns: 'custrecord_swc_store', help: '店铺', text: false, isNeed: true },
            { jj: 'currency', ns: 'custrecord_swc_op_currency', help: '货币', text: false, isNeed: false },
            { jj: 'orderNumber', ns: 'custrecord_swc_op_order_number', help: '单据号', text: false, isNeed: false },
        ]

        return {
            'get': doGet,
            put: doPut,
            post: doPost,
            'delete': doDelete
        };

    });