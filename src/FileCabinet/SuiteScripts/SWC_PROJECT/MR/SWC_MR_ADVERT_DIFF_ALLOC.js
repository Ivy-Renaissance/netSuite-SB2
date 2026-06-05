/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * 获取其他平台广告数据中费用类型为账单的数据，查询已经生成差异账单（贷记）的数据，将差异分配到各个SKU数据上
 */
define(["N/search", "N/record", "N/runtime", 'N/task', 'N/format', "../common/SWC_Utils.js"],

    (search, record, runtime, task, format, SWC_Utils) => {
        //TODO:生产环境ID
        //线上广告、线下广告类型
        const onSiteAdsType = '19';
        const offSiteAdsType = '20';

        const getInputData = (inputContext) => {

            var store = runtime.getCurrentScript().getParameter({ name: "custscript_swc_diff_store2" });//店铺
            var date = new Date();
            log.debug("开始时间", date.getTime());
            var stores = []
            //货币名称集合
            var allCurrencyNames = [];

            var filters = [
                // { name: 'externalid', operator: search.Operator.ANYOF, values: 2 },//给定测试条目 6482 4551
                { name: 'custrecord_swc_op_fee_type', operator: search.Operator.ANYOF, values: '2' },//账单类型
                { name: 'custrecord_swc_advertising_type', operator: search.Operator.NONEOF, values: ['21', '22'] },//不为税金类型广告账单

                { name: 'custrecordcustrecord_swc_op_order_share', operator: search.Operator.ISNOT, values: true },//是否分摊
                { name: 'custrecord_swc_op_diff_transaction', operator: search.Operator.NONEOF, values: '@NONE@' },//没有生成差异账单
            ]
            if (store) {
                filters.push({ name: 'custrecord_swc_store', operator: search.Operator.ANYOF, values: store })
            }
            //搜索未处理的账单
            var mySearch = search.create({
                type: 'customrecord_swc_op_advertisement',//其他平台广告数据
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
                    { name: 'custrecord_swc_op_currency' },//货币
                    { name: 'custrecord_swc_op_diff_transaction' }//差异单据


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
                    // if (store && stores.indexOf(store) === -1)
                    {//运行一次脚本，每个店铺只取1条数据，避免没回写同时比较（回写是在reduece做的）
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
                            currency: rec.getValue('custrecord_swc_op_currency'),
                            trans: rec.getValue('custrecord_swc_op_diff_transaction')
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
                var obj = JSON.parse(mapContext.value)
                var adv_type = obj.adv_type;
                //第一步搜索其他平台广告数或积加广告报告中花费的数据汇总
                var platform = obj.platform;
                log.audit('adv_type',adv_type);
                log.audit('platform',platform);

                if (platform == 1 || platform == 21) {//亚马逊平台

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
                        }
                        return false;
                    })
                    //搜索所有预估记录,按SKU+店铺分组汇总金额，按各个金额占比分摊差异
                    var mySearch2 = search.create({
                        type: 'customrecord_swc_jj_advertisement_report',//积加平台广告数Á
                        filters: [
                            { name: 'custrecord_swc_jj_adv_store', operator: search.Operator.IS, values: obj.store },//店铺
                            { name: 'custrecordcustrecord_swc_jj_adv_flag', operator: search.Operator.EQUALTO, values: 1 },//已处理
                            { name: 'custrecordcustrecord_swc_jj_adv_share', operator: search.Operator.IS, values: true },//是否分摊,没分摊的
                            { name: 'custrecord_swc_jj_adv_createdate', operator: search.Operator.WITHIN, values: [obj.start_date, obj.end_date] },//日期在账单日期范围内的
                        ],
                        columns: [
                            { name: 'custrecord_swc_jj_adv_msku', summary: 'GROUP' },//MSKU
                            { name: 'custrecord_swc_jj_adv_cost', summary: 'SUM' },//金额
                        ]
                    })
                    var results = getAllSearchObj(mySearch2);
                    log.debug('results', results)
                    var sku_costs = []
                    for (var i = 0; i < results.length; i++) {
                        var result = results[i];
                        sku_costs.push({
                            sku: result.getValue(result.columns[0]),
                            cost: result.getValue(result.columns[1])
                        })
                    }
                    log.debug('sku_costs', sku_costs);
                    log.debug('diff', diff);
                    var alloc_sku_costs = allocateDifference(sku_costs, diff, 2);
                    log.debug('alloc_sku_costs', alloc_sku_costs);
                    for (var i = 0; i < alloc_sku_costs.length; i++) {
                        var alloc_sku_cost = alloc_sku_costs[i];
                        mapContext.write({
                            key: 'JJ' + alloc_sku_cost.sku,//其他广告的用QT加SKU
                            value: { type: 'customrecord_swc_jj_advertisement_report', obj: obj, alloc_sku_cost: alloc_sku_cost }
                        })

                    }
                } else {

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
                    var diff = 0;
                    var mySearch = search.create({
                        type: 'customrecord_swc_op_advertisement',//其他平台广告数
                        filters: myFilters,
                        columns: [
                            { name: 'custrecord_swc_price', summary: 'SUM' },//金额
                        ]
                    })
                    mySearch.run().each(function (rec) {
                        log.debug('金额汇总', rec)
                        var total_amount = Number(rec.getValue(rec.columns[0]));
                        if (total_amount != obj.price) {
                            diff = obj.price - total_amount;
                        }
                        return false;
                    })

                    //TODO:搜索所有预估记录回写已处理
                    var mySearch2 = search.create({
                        type: 'customrecord_swc_op_advertisement',//其他平台广告数
                        filters: myFilters,
                        columns: [
                            { name: 'custrecord_swc_sku', summary: 'GROUP' },//SKU
                            { name: 'custrecord_swc_price', summary: 'SUM' },//金额
                        ]
                    })
                    var results = getAllSearchObj(mySearch2);
                    log.debug('results', results)
                    var sku_costs = []
                    for (var i = 0; i < results.length; i++) {
                        var result = results[i];
                        sku_costs.push({
                            sku: result.getValue(result.columns[0]),
                            cost: result.getValue(result.columns[1])
                        })
                    }

                    log.audit('diff',diff);
                    log.audit('sku_costs',sku_costs);
                    var alloc_sku_costs = allocateDifference(sku_costs, diff, 2);
                    log.audit('alloc_sku_costs',alloc_sku_costs);
                    for (var i = 0; i < alloc_sku_costs.length; i++) {
                        var alloc_sku_cost = alloc_sku_costs[i];
                        mapContext.write({
                            key: 'QT' + alloc_sku_cost.sku,//其他广告的用QT加SKU
                            value: { type: 'customrecord_swc_op_advertisement', obj: obj, alloc_sku_cost: alloc_sku_cost }
                        })

                    }



                }
            } catch (error) {
                log.error('error', error)
            }
        }

        /**
         * 根据sku成本按比例分摊差异费用，前n-1行按比例分摊并四舍五入保留N位小数，尾差分摊到最后一行
         * @param {Object[]} sku_costs - 数组，每个对象需包含cost字段（成本金额）
         * @param {number} diff_amount - 需要分摊的差异费用总额
         * @param {number} N - 分摊金额保留的小数位数
         * @return {Object[]} 新数组，包含原对象所有字段及新增的allocatedDiff字段（分摊金额）
         */
        function allocateDifference(sku_costs, diff_amount, N) {
            // 计算总成本
            var totalCost = 0;
            for (var i = 0; i < sku_costs.length; i++) {
                totalCost += Number(sku_costs[i].cost);
            }
            log.debug('totalCost', totalCost);

            // // 避免除零错误
            // if (totalCost === 0) {
            //     throw new Error("Total cost cannot be zero for allocation.");
            // }

            var result = [];
            var allocatedSum = 0;
            var numItems = sku_costs.length;

            // 舍入函数：四舍五入保留N位小数
            function roundToDecimals(num, decimals) {
                var factor = Math.pow(10, decimals);
                return Math.round(num * factor) / factor;
            }

            for (var i = 0; i < numItems; i++) {
                var cost = Number(sku_costs[i].cost);
                var allocatedAmount;

                if (i < numItems - 1) {
                    // 前n-1行：按比例计算并四舍五入保留N位小数
                    if (totalCost === 0) {
                        // 如果总金额为0，则平均分摊
                        allocatedAmount = diff_amount / sku_costs.length;
                    } else {
                        var ratio = cost / totalCost;
                        log.debug('ratio', ratio);
                        allocatedAmount = diff_amount * ratio;
                    }
                    allocatedAmount = roundToDecimals(allocatedAmount, N);
                } else {
                    // 最后一行：尾差分摊，确保总和精确等于diff_amount
                    allocatedAmount = diff_amount - allocatedSum;
                }

                allocatedSum += allocatedAmount;

                // 复制原对象并添加分摊金额字段
                var newItem = {};
                for (var key in sku_costs[i]) {
                    if (sku_costs[i].hasOwnProperty(key)) {
                        newItem[key] = sku_costs[i][key];
                    }
                }
                newItem.allocatedDiff = allocatedAmount;

                result.push(newItem);
            }

            return result;
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
                    var info = reduce_obj.obj;
                    var alloc_sku_cost = reduce_obj.alloc_sku_cost;

                    if (reduce_obj.type == 'customrecord_swc_jj_advertisement_report') {
                        var rec = record.create({ type: 'customrecord_swc_jj_advertisement_report', isDynamic: false });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_adv_store', value: info.store });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_adv_msku', value: alloc_sku_cost.sku });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_adv_cost', value: alloc_sku_cost.allocatedDiff });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_adv_fee_type', value: '3' });
                        rec.setText({ fieldId: 'custrecord_swc_jj_adv_createdate', text: info.date });
                        rec.setText({ fieldId: 'custrecord_swc_jj_adv_enddate', text: info.date });
                        rec.setValue({ fieldId: 'custrecordcustrecord_swc_jj_adv_share', value: true });
                        // rec.setValue({ fieldId: '', value: info.currency });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_adv_diff_transaction', value: info.trans });
                        var id = rec.save();
                        log.debug('id', id);

                        // id: rec.id,
                        // adv_type: rec.getValue('custrecord_swc_advertising_type'),
                        // price: rec.getValue('custrecord_swc_price'),
                        // date: rec.getValue('custrecord_swc_date'),
                        // start_date: rec.getValue('custrecord_swc_start_date'),
                        // end_date: rec.getValue('custrecord_swc_end_date'),
                        // store: rec.getValue('custrecord_swc_store'),
                        // platform: rec.getValue({ name: 'custentity_swc_platform', join: 'custrecord_swc_store' }),
                        // subsidiary: rec.getValue({ name: 'subsidiary', join: 'custrecord_swc_store' }),
                        // currency: rec.getValue('custrecord_swc_op_currency'),
                        // trans: rec.getValue('custrecord_swc_op_diff_transaction')
                    } else {
                        var rec = record.create({ type: 'customrecord_swc_op_advertisement', isDynamic: false });
                        rec.setValue({ fieldId: 'custrecord_swc_store', value: info.store });
                        rec.setValue({ fieldId: 'custrecord_swc_advertising_type', value: info.adv_type });
                        rec.setValue({ fieldId: 'custrecord_swc_sku', value: alloc_sku_cost.sku });
                        rec.setValue({ fieldId: 'custrecord_swc_price', value: alloc_sku_cost.allocatedDiff });
                        rec.setValue({ fieldId: 'custrecord_swc_op_fee_type', value: '3' });
                        rec.setText({ fieldId: 'custrecord_swc_date', text: info.date });
                        rec.setText({ fieldId: 'custrecord_swc_start_date', text: info.start_date });
                        rec.setText({ fieldId: 'custrecord_swc_end_date', text: info.end_date });
                        rec.setValue({ fieldId: 'custrecord_swc_op_currency', value: info.currency });
                        rec.setValue({ fieldId: 'custrecord_swc_op_diff_transaction', value: info.trans });
                        // rec.save();
                        var id = rec.save();
                        log.debug('id', id);
                    }
                    record.submitFields({
                        type: "customrecord_swc_op_advertisement",
                        id: info.id,  // 账单类广告费用的ID
                        values: {
                            "custrecordcustrecord_swc_op_order_share": true,  // 是否分摊
                        }
                    });


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

        return {
            getInputData,
            map,
            reduce,
            summarize
        }

    });