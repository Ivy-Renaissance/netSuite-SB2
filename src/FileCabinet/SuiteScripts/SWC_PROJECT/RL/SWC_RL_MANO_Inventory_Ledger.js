/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * @name SWC_RL_CG_Inventory_Ledger.js
 * @author SWR
 * @description CG->NS
 */
define(['N/format', 'N/error', 'N/runtime', 'N/search', 'N/record', '../common/interface', '../common/moment'],
    function (format, error, runtime, search, record, interface, moment) {

        var rec_Type = 'customrecord_swc_mamo_inventoryledger';

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

                var typeObj = searchType();
                log.audit('typeObj',typeObj);

                for (let d = 0; d < data.length; d++) {
                    const element = data[d];
                    try {
                        // if (element.type != 1 && element.type != 2 && element.type != 3) {
                        //     throw new Error('类型不正确');
                        // }
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
                                if (ns == 'custrecord_swc_mano_sku') {
                                    // rec.setText({ fieldId: "custrecord_swc_mano_item", text: value });
                                    rec.setValue({ fieldId: ns, value: value });
                                } else if (ns == 'custrecord_swc_mano_created'){
                                    rec.setText({ fieldId: ns, text: value.substring(0, 10) });
                                } else if (ns == 'custrecord_swc_mano_location') {
                                    if (value in typeObj)
                                        rec.setValue({ fieldId: ns, value: typeObj[value] });
                                }else {
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
            { xl: "sku", ns: "custrecord_swc_mano_sku", help: "SKU", text: false, isNeed: true},
            { xl: "ean", ns: "custrecord_swc_mano_ean", help: "EAN", text: false, isNeed: false },
            { xl: "reference", ns: "custrecord_swc_mano_reference", help: "REFERENCE", text: false, isNeed: false },
            { xl: "type", ns: "custrecord_swc_mano_type", help: "TYPE", text: false, isNeed: false },
            { xl: "warehouse", ns: "custrecord_swc_mano_warehouse", help: "WAREHOUSE", text: false, isNeed: false },
            { xl: "city", ns: "custrecord_swc_mano_city", help: "CITY", text: false, isNeed: false },
            { xl: "beginning", ns: "custrecord_swc_mano_beginning", help: "BEGINNING UNITS", text: false, isNeed: false },
            { xl: "variation", ns: "custrecord_swc_mano_units", help: "VARIATION UNITS", text: false, isNeed: false},
            { xl: "ending", ns: "custrecord_swc_mano_ending", help: "ENDING UNITS", text: false, isNeed: false},
            { xl: "quantity", ns: "custrecord_swc_mano_quantity", help: "QUANTITY", text: false, isNeed: true},
            { xl: "created", ns: "custrecord_swc_mano_created", help: "CREATED AT", text: true, isNeed: true},
            { xl: "location", ns: "custrecord_swc_mano_location", help: "Location", text: false, isNeed: true},
        ]

        function searchType() {
            const customrecord_swc_cg_manoSearchObj = search.create({
                type: "customrecord_swc_cg_mano",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "name", label: "名称"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });
            var obj = {};
            customrecord_swc_cg_manoSearchObj.run().each(function(result){
                var name = result.getValue({name: "name", label: "名称"});
                var id = result.getValue({name: "internalid", label: "内部 ID"});
                obj[name] = id;
                // .run().each has a limit of 4,000 results
                return true;
            });

            return obj
        }

        return {
            'get': doGet,
            put: doPut,
            post: doPost,
            'delete': doDelete
        };

    });