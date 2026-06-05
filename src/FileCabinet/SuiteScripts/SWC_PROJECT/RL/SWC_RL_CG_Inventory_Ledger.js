/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * @name SWC_RL_CG_inventory_ledger.js
 * @author SWR
 * @description CG->NS
 */
define(['N/format', 'N/error', 'N/runtime', 'N/search', 'N/record', '../common/interface', '../common/moment'],
    function (format, error, runtime, search, record, interface, moment) {

        var rec_Type = 'customrecord_swc_cg_inventoryledger';

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
                var itemData = [];

                var typeObj = searchType();

                // for (let d = 0; d < data.length; d++) {
                //     if (data[d].partnumber && itemData.indexOf(data[d].partnumber) == -1)
                //         itemData.push(data[d].partnumber)
                // }
                //
                // log.error('itemData',itemData);
                // //检索货品ID
                // let itemObj = searchItem(itemData);
                // log.error('itemObj',itemObj);

                for (let d = 0; d < data.length; d++) {
                    const element = data[d];
                    try {
                        // if (element.type != 4 && element.type != 5 && element.type != 6 &&
                        //     element.type != 7 && element.type != 8 && element.type != 9 &&
                        //     element.type != 10 && element.type != 11) {
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
                                if (ns == 'custrecord_swc_cg_partnumber') {
                                    // rec.setValue({ fieldId: "custrecord_swc_cg_item", value: itemObj[value]});
                                    // rec.setText({ fieldId: "custrecord_swc_cg_item", text: value });
                                    rec.setValue({ fieldId: ns, value: value });
                                } else if (ns == 'custrecord_swc_cg_location') {
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
                        }
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
            // { xl: "externalid", ns: "custrecord_swc_external_id", help: "外部id", text: false, isNeed: true },
            { xl: "date", ns: "custrecord_swc_cg_date", help: "Date", text: true, isNeed: false , date: true },
            { xl: "type", ns: "custrecord_swc_cg_eventtype", help: "Event Type", text: false, isNeed: false },
            { xl: "partnumber", ns: "custrecord_swc_cg_partnumber", help: "Part Number", text: false, isNeed: true },
            { xl: "transactionnumber", ns: "custrecord_swc_cg_transactionnumber", help: "Transaction Number", text: false, isNeed: false },
            { xl: "country", ns: "custrecord_swc_cg_country", help: "Country", text: false, isNeed: false },
            { xl: "facility", ns: "custrecord_swc_cg_facility", help: "Facility", text: false, isNeed: false },
            { xl: "quantity", ns: "custrecord_swc_cg_quantity", help: "Quantity", text: false, isNeed: true },
            { xl: "details", ns: "custrecord_swc_cg_details", help: "Details", text: true, isNeed: false},
            { xl: "location", ns: "custrecord_swc_cg_location", help: "Location", text: false, isNeed: false},
            // { xl: "threepart", ns: "custrecord_swc_warehouse", help: "WAREHOUSE", text: false, isNeed: true},
        ]

        function searchItem(itemData) {
            var filter = [];
            if (itemData.length > 0) {
                for (let i = 0;i < itemData.length;i++) {
                    filter.push(["itemId","is",itemData[i]]);
                    if (i != itemData.length - 1) {
                        filter.push("OR");
                    }
                }
            }
            const itemSearchObj = search.create({
                type: "item",
                title: '库存分账接口获取货品ID' + new Date(),
                filters:
                filter,
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "itemId", label: "货品编码"})
                    ]
            });

            let results = getAllResults(itemSearchObj);
            // let searchID = itemSearchObj.save();
            // log.audit('searchID',searchID);
            let obj = {};
            results.forEach(function (value) {

                let itemId = value.getValue({name: "itemId", label: "货品编码"});
                obj[itemId] = value.id;
            });

            return obj
        }

        function getAllResults(srch) {
            let results = srch.run();
            let searchResults = [];
            let searchid = 0;
            let resultslice;
            do {
                resultslice = results.getRange({
                    start: searchid,
                    end: searchid + 1000
                });
                resultslice.forEach(function (slice) {
                    searchResults.push(slice);
                    searchid++;
                });

            } while (resultslice.length >= 1000);
            return searchResults;
        }

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