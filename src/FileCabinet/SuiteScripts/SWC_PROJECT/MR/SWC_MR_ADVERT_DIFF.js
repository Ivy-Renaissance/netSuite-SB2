/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * 获取其他平台广告数据中费用类型为账单的数据，查询账单与实际差异，生成差异账单或贷记
 */
define(["N/search", "N/record", "N/runtime", 'N/task', 'N/format', "../common/SWC_Utils.js"],

    (search, record, runtime, task, format, SWC_Utils) => {
        //TODO:生产环境ID
        //线上广告、线下广告类型
        const onSiteAdsType = '19';
        const offSiteAdsType = '20';

        const getInputData = (inputContext) => {


            var date = new Date();
            log.debug("开始时间", date.getTime());
            var stores = []
            var store = runtime.getCurrentScript().getParameter({ name: "custscript_swc_diff_store" });//店铺
            var filters = [
                // { name: 'internalid', operator: search.Operator.ANYOF, values: 90214 },//给定测试条目 6482 4551
                { name: 'custrecord_swc_op_fee_type', operator: search.Operator.ANYOF, values: ['2'] },//账单类型
                { name: 'custrecordcustrecord_swc_op_po_flag_', operator: search.Operator.NOTEQUALTO, values: 1 },//无差异时打上个标志，搜索没打标志的
                { name: 'custrecord_swc_op_diff_transaction', operator: search.Operator.ANYOF, values: '@NONE@' },//没有生成差异账单
            ]
            if (store) {
                filters.push({ name: 'custrecord_swc_store', operator: search.Operator.ANYOF, values: store })
            }
            //货币名称集合
            var allCurrencyNames = [];

            //搜索未处理的账单
            var mySearch = search.create({
                type: 'customrecord_swc_op_advertisement',//SKU映射表
                filters: filters,
                columns: [
                    { name: 'custrecord_swc_advertising_type' },//广告类型
                    { name: 'custrecord_swc_price' },//金额
                    { name: 'custrecord_swc_date' },//日期
                    { name: 'custrecord_swc_start_date' },//开始日期
                    { name: 'custrecord_swc_end_date' },//结束日期
                    { name: 'custrecord_swc_store' },//店铺--客户供应商共用
                    { name: 'custentity_swc_platform', join: 'custrecord_swc_store' },//平台
                    { name: 'subsidiary', join: 'custrecord_swc_store' },//子公司
                    { name: 'custrecord_swc_op_currency' }//货币

                ]
            });
            var pageData = mySearch.runPaged({
                pageSize: 1000
            });
            log.debug('pageData', pageData);
            var totalCount = pageData.count; //总数
            log.debug('totalCount', totalCount);
            var pageCount = pageData.pageRanges.length; //页数
            log.debug('pageCount', pageCount);
            var results = [];
            for (var i = 0; i < pageCount; i++) {
                pageData.fetch({
                    index: i
                }).data.forEach(function (rec) {
                    log.debug('rec', rec);
                    var store = rec.getValue('custrecord_swc_store');
                    if (store && stores.indexOf(store) === -1) {//运行一次脚本，每个店铺只取1条数据，避免没回写同时比较（回写是在reduece做的）
                        stores.push(store);
                        results.push({
                            id: rec.id,
                            adv_type: rec.getValue('custrecord_swc_advertising_type'),
                            price: rec.getValue('custrecord_swc_price'),
                            date: rec.getValue('custrecord_swc_date'),
                            start_date: rec.getValue('custrecord_swc_start_date'),
                            end_date: rec.getValue('custrecord_swc_end_date'),
                            store: rec.getValue('custrecord_swc_store'),
                            platform: rec.getValue({ name: 'custentity_swc_platform', join: 'custrecord_swc_store' }),
                            subsidiary: rec.getValue({ name: 'subsidiary', join: 'custrecord_swc_store' }),
                            currency: rec.getValue('custrecord_swc_op_currency')
                        });

                    }

                    return true;
                })
            }
            log.debug('results1', results)

            return results;

        }


        const map = (mapContext) => {
            try {
                var ScriptObj = runtime.getCurrentScript();
                var onSiteAdsSKU = ScriptObj.getParameter({ name: "custscript_swc_diff_on_site_sku" });//线上货品参数
                log.debug("线上货品", onSiteAdsSKU);
                var offSiteAdsSKU = ScriptObj.getParameter({ name: "custscript_swc_diff_off_site_sku" });//下线货品参数
                log.debug("线下货品", offSiteAdsSKU);
                var jjTypeSKU = ScriptObj.getParameter({ name: "custscript_swc_diff_jj_sku" });//积加广告货品参数
                log.debug("jjTypeSKU", jjTypeSKU);

                var obj = JSON.parse(mapContext.value)
                log.debug('obj', obj);
                var adv_type = obj.adv_type;
                //第一步搜索其他平台广告数或积加广告报告中花费的数据汇总
                var platform = obj.platform;
                var item_id = onSiteAdsSKU;
                //新增税金处理逻辑
                if (adv_type == 21 || adv_type == 22) {
                    if (adv_type == 21) {
                        item_id = ScriptObj.getParameter({ name: "custscript_swc_diff_vat_sku" });//税金-VAT
                    } else if (adv_type == 22) {
                        item_id = ScriptObj.getParameter({ name: "custscript_swc_diff_gst_sku" });//税金-GST/HST
                    }
                    bill_id = createVendorBill(obj.store, obj.price, item_id, obj)
                    record.submitFields({
                        type: "customrecord_swc_op_advertisement",
                        id: obj.id,  // 广告记录的内部ID
                        values: {
                            "custrecordcustrecord_swc_op_po_flag_": "1",  // 是否同步字段设为1（已同步）
                            "custrecord_swc_op_diff_transaction": bill_id,  // 差异账单
                            'custrecord_swc_op_diff_ifflag': true
                        }
                    });
                    return;
                }

                if (platform == 1 || platform == 21) {//亚马逊SC平台  亚马逊VC平台
                    item_id = onSiteAdsSKU;
                    var bill_id = ''

                    var mySearch = search.create({
                        type: 'customrecord_swc_jj_advertisement_report',//积加平台广告数
                        filters: [
                            { name: 'custrecord_swc_jj_adv_store', operator: search.Operator.IS, values: obj.store },//店铺
                            { name: 'custrecordcustrecord_swc_jj_adv_flag', operator: search.Operator.EQUALTO, values: 1 },//已处理
                            { name: 'custrecordcustrecord_swc_jj_adv_share', operator: search.Operator.IS, values: true },//是否分摊,没分摊的
                            { name: 'custrecord_swc_jj_adv_createdate', operator: search.Operator.WITHIN, values: [obj.start_date, obj.end_date] },//日期在账单日期范围内的
                        ],
                        columns: [
                            { name: 'custrecord_swc_jj_adv_cost', summary: 'SUM' },//金额
                        ]
                    })
                    var diff = 0;
                    mySearch.run().each(function (rec) {
                        log.debug('金额汇总', rec)
                        var total_amount = Number(rec.getValue(rec.columns[0]));
                        if (total_amount != obj.price) {
                            diff = obj.price - total_amount;
                            if (diff > 0) {
                                //生成账单
                                bill_id = createVendorBill(obj.store, diff, item_id, obj)
                            } else if (diff < 0) {
                                //生成贷记
                                bill_id = createVendorCredit(obj.store, -diff, item_id, obj)
                            }
                            record.submitFields({
                                type: "customrecord_swc_op_advertisement",
                                id: obj.id,  // 广告记录的内部ID
                                values: {
                                    "custrecordcustrecord_swc_op_po_flag_": "1",  // 是否同步字段设为1（已同步）
                                    "custrecord_swc_op_diff_transaction": bill_id,  // 差异账单，
                                    'custrecord_swc_op_diff_ifflag': true
                                }
                            });
                        }
                        return false;
                    })

                    //搜索所有预估记录回写已处理
                    var mySearch2 = search.create({
                        type: 'customrecord_swc_jj_advertisement_report',//积加平台广告数
                        filters: [
                            { name: 'custrecord_swc_jj_adv_store', operator: search.Operator.IS, values: obj.store },//店铺
                            { name: 'custrecordcustrecord_swc_jj_adv_flag', operator: search.Operator.EQUALTO, values: 1 },//已处理
                            { name: 'custrecordcustrecord_swc_jj_adv_share', operator: search.Operator.IS, values: true },//是否分摊,没分摊的
                            { name: 'custrecord_swc_jj_adv_createdate', operator: search.Operator.WITHIN, values: [obj.start_date, obj.end_date] },//日期在账单日期范围内的
                        ],
                        columns: [
                            { name: 'internalid' },//内部ID
                            { name: 'custrecord_swc_jj_adv_cost' },//金额
                        ]
                    })
                    var results = getAllSearchObj(mySearch2);
                    log.debug('results', results)
                    for (var i = 0; i < results.length; i++) {
                        var result = results[i];
                        mapContext.write({
                            key: 'JJ' + result.getValue({ name: "internalid" }),//其他广告的用QT加内部ID
                            value: { type: 'customrecord_swc_jj_advertisement_report', bill_id: bill_id }
                        })

                    }
                } else {
                    log.debug('其他平台');
                    if (adv_type == onSiteAdsType) {
                        item_id = onSiteAdsSKU;
                    } else {
                        item_id = offSiteAdsSKU;
                    }
                    var bill_id = ''
                    var myFilters = [
                        { name: 'custrecord_swc_op_fee_type', operator: search.Operator.NONEOF, values: ['2', '3'] },//账单类型不为账单和差异
                        { name: 'custrecord_swc_store', operator: search.Operator.IS, values: obj.store },//店铺
                        { name: 'custrecordcustrecord_swc_op_po_flag_', operator: search.Operator.EQUALTO, values: 1 },//已处理
                        { name: 'custrecordcustrecord_swc_op_order_share', operator: search.Operator.IS, values: true },//是否分摊,没分摊的
                        { name: 'custrecord_swc_date', operator: search.Operator.WITHIN, values: [obj.start_date, obj.end_date] },//日期在账单日期范围内的
                    ]
                    if (adv_type) {
                        myFilters = [
                            { name: 'custrecord_swc_op_fee_type', operator: search.Operator.NONEOF, values: ['2', '3'] },//账单类型不为账单和差异
                            { name: 'custrecord_swc_store', operator: search.Operator.IS, values: obj.store },//店铺
                            { name: 'custrecord_swc_advertising_type', operator: search.Operator.IS, values: adv_type },//有广告类型的需要按广告类型来匹配
                            { name: 'custrecordcustrecord_swc_op_po_flag_', operator: search.Operator.EQUALTO, values: 1 },//已处理
                            { name: 'custrecordcustrecord_swc_op_order_share', operator: search.Operator.IS, values: true },//是否分摊,没分摊的
                            { name: 'custrecord_swc_date', operator: search.Operator.WITHIN, values: [obj.start_date, obj.end_date] },//日期在账单日期范围内的
                        ]
                    }

                    var mySearch = search.create({
                        type: 'customrecord_swc_op_advertisement',//其他平台广告数
                        title: '其他平台广告数据 检索1' + new Date(),
                        filters: myFilters,
                        columns: [
                            { name: 'custrecord_swc_price', summary: 'SUM' },//金额
                        ]
                    })

                    // var searchId = mySearch.save();
                    // log.error('searchId',searchId);
                    mySearch.run().each(function (rec) {
                        log.debug('金额汇总', rec)
                        var total_amount = Number(rec.getValue(rec.columns[0]));
                        log.debug('total_amount', total_amount)
                        log.debug('obj.price', obj.price)
                        if (total_amount != obj.price) {
                            var diff = obj.price - total_amount;
                            log.debug('diff', diff)
                            if (diff > 0) {
                                //生成账单
                                log.debug('需要生成账单', {
                                    s: obj.store, d: diff, i: item_id, o: obj
                                })
                                bill_id = createVendorBill(obj.store, diff, item_id, obj)
                                log.debug('bill_id', bill_id)
                            } else if (diff < 0) {
                                //生成贷记
                                bill_id = createVendorCredit(obj.store, -diff, item_id, obj)
                            }
                            record.submitFields({
                                type: "customrecord_swc_op_advertisement",
                                id: obj.id,  // 广告记录的内部ID
                                values: {
                                    "custrecordcustrecord_swc_op_po_flag_": "1",  // 是否同步字段设为1（已同步）
                                    "custrecord_swc_op_diff_transaction": bill_id,  // 差异账单
                                    'custrecord_swc_op_diff_ifflag': true
                                }
                            });


                        } else {
                            // 无差异的，打上个标志
                            record.submitFields({
                                type: "customrecord_swc_op_advertisement",
                                id: obj.id,  // 广告记录的内部ID
                                values: {
                                    "custrecordcustrecord_swc_op_po_flag_": "1",  // 是否同步字段设为1（已同步）
                                    'custrecord_swc_op_diff_ifflag': true
                                }
                            });
                        }
                        return false;
                    })

                    //TODO:搜索所有预估记录回写已处理
                    var mySearch2 = search.create({
                        type: 'customrecord_swc_op_advertisement',//其他平台广告数
                        filters: myFilters,
                        columns: [
                            { name: 'internalid' },//内部ID
                            { name: 'custrecord_swc_price' },//金额
                        ]
                    })
                    var results = getAllSearchObj(mySearch2);
                    log.debug('results', results)
                    for (var i = 0; i < results.length; i++) {
                        var result = results[i];
                        mapContext.write({
                            key: 'QT' + result.getValue({ name: "internalid" }),//其他广告的用QT加内部ID
                            value: {
                                type: 'customrecord_swc_op_advertisement',
                                bill_id: bill_id
                            }
                        })

                    }

                }
            } catch (error) {
                log.error('error', error)
            }
        }

        const reduce = (reduceContext) => {
            try {
                log.debug('reduceContext', reduceContext)
                var recId = reduceContext.key.substring(2, reduceContext.key.length);
                log.debug('reduceContext.key', reduceContext.key)
                log.debug('reduceContext recId', recId)
                var v = reduceContext.values
                v.map(function (obj) {
                    var reduce_obj = JSON.parse(obj);
                    log.debug('reduceContext reduce_obj', reduce_obj)
                    if (reduce_obj.type == 'customrecord_swc_jj_advertisement_report') {
                        record.submitFields({
                            type: reduce_obj.type,
                            id: recId,  // 广告记录的内部ID
                            values: {
                                'custrecord_swc_jj_adv_diff_transaction': reduce_obj.bill_id,
                                'custrecord_swc_jj_adv_diff_ifflag': true
                            }
                        });
                    } else {
                        record.submitFields({
                            type: reduce_obj.type,
                            id: recId,  // 广告记录的内部ID
                            values: {
                                'custrecord_swc_op_diff_transaction': reduce_obj.bill_id,
                                'custrecord_swc_op_diff_ifflag': true
                            }
                        });
                    }

                })

            } catch (e) {
                log.error("reduce处理失败", {
                    error: e.message || JSON.stringify(e),
                    stack: e.stack,
                    原始数据: reduceContext.values
                });
            }
        }

        const summarize = (summaryContext) => {

        }

        /**
         * 创建 Vendor Credit（供应商贷项）
         * 注意：不要用 creditmemo（那是客户贷项）
         * @param {number|string} vendorId
         * @param {number} amount 正数
         */
        function createVendorCredit(vendorId, amount, ITEM_ID, obj) {
            var amt = Number(amount);
            if (!vendorId) throw new Error('Vendor Credit: entity为空');
            if (!(amt > 0)) throw new Error('Vendor Credit: amount必须>0');

            var tranRec = record.create({
                type: 'vendorcredit',
                isDynamic: true
            });

            tranRec.setValue({ fieldId: 'entity', value: vendorId });
            if (obj.date) {
                tranRec.setText({ fieldId: 'trandate', text: obj.date });
            }
            if (obj.subsidiary) {
                tranRec.setValue({ fieldId: 'subsidiary', value: obj.subsidiary });
            }
            if (obj.currency) {
                tranRec.setValue({ fieldId: 'currency', value: searchCurrency(obj.currency) });
            }
            tranRec.setValue({ fieldId: 'custbody_swc_order_type2', value: 15 });
            //搜索供应商付款条件
            search.create({
                type: "vendor",
                filters:
                    [
                        ["internalid", "is", vendorId]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custentity_swc_payment_terms", label: "Terms" })
                    ]
            }).run().each(function (a) {
                var terms = a.getValue('custentity_swc_payment_terms');
                if (terms) {
                    var termsArray = terms.split(',');
                    log.debug('termsArray', termsArray)
                    tranRec.setValue({ fieldId: 'custbody_swc_vendor_payment_terms', value: termsArray[0] });
                } else {
                    log.debug('没有terms')
                }
                return false
            });

            tranRec.selectNewLine({ sublistId: 'item' });
            tranRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: ITEM_ID });
            tranRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: '1' });
            tranRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: amt });
            tranRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: amt });
            tranRec.commitLine({ sublistId: 'item' });

            // tranRec.selectNewLine({ sublistId: 'expense' });
            // tranRec.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'account', value: Number(accountId) });
            // tranRec.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'amount', value: amt });
            // tranRec.commitLine({ sublistId: 'expense' });

            // 有些账号设置必填字段多，必要时可用 ignoreMandatoryFields:true
            return tranRec.save({ ignoreMandatoryFields: true });
        }

        /**
         * 创建 Vendor Bill（供应商账单）
         * @param {number|string} vendorId
         * @param {number} amount 正数
         */
        function createVendorBill(vendorId, amount, ITEM_ID, obj) {
            var amt = Number(amount);
            if (!vendorId) throw new Error('Vendor Bill: entity为空');
            if (!(amt > 0)) throw new Error('Vendor Bill: amount必须>0');
            log.debug('创建账单开始')
            var vendorbillRecord = record.create({
                type: 'vendorbill',
                isDynamic: true
            });

            vendorbillRecord.setValue({ fieldId: 'entity', value: vendorId });
            if (obj.date) {
                vendorbillRecord.setText({ fieldId: 'trandate', text: obj.date });
            }
            if (obj.subsidiary) {
                vendorbillRecord.setValue({ fieldId: 'subsidiary', value: obj.subsidiary });
            }
            if (obj.currency) {
                vendorbillRecord.setValue({ fieldId: 'currency', value: searchCurrency(obj.currency) });
            }
            vendorbillRecord.setValue({ fieldId: 'custbody_swc_order_type2', value: 15 });
            //搜索供应商付款条件
            search.create({
                type: "vendor",
                filters:
                    [
                        ["internalid", "is", vendorId]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custentity_swc_payment_terms", label: "Terms" })
                    ]
            }).run().each(function (a) {
                var terms = a.getValue('custentity_swc_payment_terms');
                if (terms) {
                    var termsArray = terms.split(',');
                    log.debug('termsArray', termsArray)
                    vendorbillRecord.setValue({ fieldId: 'custbody_swc_vendor_payment_terms', value: termsArray[0] });
                } else {
                    log.debug('没有terms')
                }
                return false
            });

            vendorbillRecord.selectNewLine({ sublistId: 'item' });
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: ITEM_ID });
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: '1' });
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: amt });
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: amt });
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_bill_writeoff_amount', value: 0 }); //已预付总金额
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_bill_unsettled_amount', value: amt });//待支付金额
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_notnotused', value: amt });//剩余金额
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_alreadyused', value: 0 });//已支付金额
            vendorbillRecord.commitLine({ sublistId: 'item' });



            // vendorbillRecord.selectNewLine({ sublistId: 'expense' });
            // vendorbillRecord.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'account', value: Number(accountId) });
            // vendorbillRecord.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'amount', value: amt });

            // // 关键：expense 要 commit expense（你原来 commit item 是 bug）
            // vendorbillRecord.commitLine({ sublistId: 'expense' });
            log.debug('创建账单保存')
            return vendorbillRecord.save({ ignoreMandatoryFields: true });
        }

        /**
         * 保存检索查询超过4000条
         * @param searchObj
         * @returns {*[]}
         */
        function getAllSearchObj(searchObj) {
            var RESULTCOUNT = 4000;
            var SIZE = 1000;
            var searchResultCount = searchObj.runPaged().count;
            var resList = [];

            if (searchResultCount > RESULTCOUNT) {
                var resultSet = searchObj.run();
                var max = Math.ceil(searchResultCount / SIZE);
                for (var i = 0; i < max; i++) {
                    var results = resultSet.getRange({
                        start: SIZE * i,
                        end: Number(SIZE * i) + Number(SIZE)
                    });
                    for (var j = 0; j < results.length; j++) {
                        resList.push(results[j]);
                    }
                }
            } else {
                searchObj.run().each(function (result) {
                    resList.push(result);
                    return true;
                });
            }
            return resList;
        }

        // 货币检索id
        function searchCurrency(currencyName) {


            try {
                var currencyId = '';
                var searchFilters = [];
                searchFilters.push(["symbol", "is", currencyName]); //通过名称去查


                var currencySearchObj = search.create({
                    type: "currency",
                    filters: searchFilters,
                    columns: [
                        search.createColumn({ name: "internalid", label: "内部 ID" }),
                        search.createColumn({ name: "symbol", label: "符号" })
                    ]
                });

                var results = getAllSearchObj(currencySearchObj);
                for (var k = 0; k < results.length; k++) {
                    var result = results[k];
                    currencyId = result.getValue({ name: "internalid", label: "内部 ID" });

                }

            } catch (e) {
                log.error("批量获取货币ID失败", {
                    error: e.toString(),
                    stack: e.stack
                });
            }
            return currencyId;
        }

        return {
            getInputData,
            map,
            reduce,
            summarize
        }

    });