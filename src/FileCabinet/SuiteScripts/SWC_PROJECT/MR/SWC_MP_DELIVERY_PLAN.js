/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime', 'N/search', 'N/config', '../common/moment'],
    /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
    (record, runtime, search, config, moment) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            var mySearch = search.create({
                type: 'customrecord_swc_sales_forcast',//SKU映射表
                filters: [
                    { name: 'externalid', operator: search.Operator.ISNOTEMPTY },//给定测试条目 6482 4551
                    // { name: 'custrecord_swc_sf_year', operator: search.Operator.ON, values: '2026-04-01' },
                    // { name: 'internalid', operator: search.Operator.ANYOF, values: ['86','89'] },//给定测试条目 6482 4551
                    { name: 'custentity_swc_plan_metrics', join: 'custrecord_swc_sf_store', operator: search.Operator.NONEOF, values: '@NONE@' },
                    // { name: 'custitem_swc_new_old', join: 'custrecord_swc_sf_sku', operator: search.Operator.IS, values: '2' }//产品是老品
                ],
                columns: [
                    { name: 'custentity_swc_plan_metrics', join: 'custrecord_swc_sf_store', summary: 'GROUP' },//备货维度
                    { name: 'custrecord_swc_sf_sku', summary: 'GROUP' },//SKU
                    { name: 'custrecord_swc_sf_saleperson', summary: 'MAX' },//运营
                ]
            });
            var results = [];
            var recs = getAllSearchObj(mySearch);
            for (var i = 0; i < recs.length; i++) {
                var rec = recs[i];
                log.debug('rec', rec)
                results.push({
                    sku: rec.getValue(rec.columns[1]),
                    store: rec.getValue(rec.columns[0]),
                    salesperson: rec.getValue(rec.columns[2])
                });

            }
            log.debug('results1', results)
            return results;

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
                    results.push({
                        sku: rec.getValue(rec.columns[1]),
                        store: rec.getValue(rec.columns[0]),
                        // platform: rec.getValue(rec.columns[2]),
                        salesperson: rec.getValue(rec.columns[2])
                    });
                    return true;
                })
            }
            log.debug('results1', results)

            return results;

            // var po = record.load({ type: "purchaseorder", id: 45191 })
            // var po_subsidiary = po.getValue('subsidiary');
            // log.debug('po_subsidiary', po_subsidiary);
            // log.debug('po_subsidiary1', po.getText('subsidiary'));
            // var to_location_Result = search.lookupFields({ type: 'location', id: 1470, columns: ['subsidiary'] });
            // var to_location_subsidiary = to_location_Result.subsidiary;
            // log.debug('to_location_Result', to_location_Result);
            // log.debug('to_location_subsidiary', to_location_subsidiary);
            // search.create({
            //     type: 'location',
            //     filters:
            //         [
            //             ['internalid', 'anyof', 1470]
            //         ],
            //     columns:
            //         [
            //             { name: 'subsidiary',label: 'subsidiary' }
            //         ]
            // }).run().each(function (results) {
            //     log.debug('to_location_subsidiary results', results);
            //     to_location_subsidiary = results.getValue({ name: "subsidiary" });
            //     return false;
            // });
            // log.debug('to_location_subsidiary', to_location_subsidiary);
            // return []
            // var demandRec = record.load({ type: 'customrecord_swc_delivery_plan', id: 1 });
            // var xz = demandRec.getValue('custrecord_swc_sdp_special_modification')
            // var xz1 = demandRec.getValue('custrecord_swc_sdp_correction1')
            // var xz2 = demandRec.getValue('custrecord_swc_sdp_correction2')
            // var xz3 = demandRec.getValue('custrecord_swc_sdp_correction3')
            // log.debug('xz', xz)
            // log.debug('isEmpty', isEmpty(xz))
            // log.debug('xz1', xz1)
            // log.debug('isEmpty1', isEmpty(xz1))
            // log.debug('xz2', xz2)
            // log.debug('isEmpty2', isEmpty(xz2))
            // log.debug('xz3', xz3)
            // log.debug('isEmpty3', isEmpty(xz3))

            // log.debug('xz===空', xz === '')
            // log.debug('xz===0', xz === 0)
            // log.debug('xz3===空', xz3 === '')
            // log.debug('xz3===0', xz3 === 0)

            // return [];
            // //获取系统日期格式配置
            // var general_preferences = config.load({ type: config.Type.COMPANY_PREFERENCES });
            // var dateFormat = general_preferences.getValue({ fieldId: 'DATEFORMAT' });
            // log.debug('dateFormat', dateFormat);
            // //本月月初时间
            // const MonthStart = moment().add(16, 'hours').startOf('month').format(dateFormat);
            // log.debug('MonthStart', MonthStart);
            // const MonthEnd = moment().add(16, 'hours').endOf('month').format(dateFormat);
            // log.debug('MonthEnd', MonthEnd);
            // const dayOfmonth = new Date().getDate();
            // log.debug('day', new Date());
            // log.debug('moment', moment());
            // log.debug('dayOfmonth', dayOfmonth);
            // const monthlyDemands = [120, 150, 180, 200, 160, 140, 170, 190];
            // // 使用示例
            // const startDay = 15; // 从第1个月的第15天开始
            // const result = calculateDemandInPeriod(dayOfmonth, monthlyDemands);
            // log.debug(`从第1个月第${dayOfmonth}天开始，往后120天的总需求数为：${result}`);
            // var estimatedQty = -20;
            // log.debug('是否等于0', estimatedQty == 0 ? 0 : estimatedQty)
            // return []

            //搜索SKU关系表里面老品SKU的，店铺+SKU+国家+仓库类型维度计算
            var mySearch = search.create({
                type: 'customrecord_swc_platform_sku_mapping',//SKU映射表
                filters: [
                    { name: 'internalid', operator: search.Operator.ANYOF, values: ['6900', '1032', '6482', '4551'] },//给定测试条目 6482 4551
                    { name: 'custentity_swc_plan_metrics', join: 'custrecord_swc_pt_sku_map_store', operator: search.Operator.NONEOF, values: '@NONE@' },
                    { name: 'custitem_swc_new_old', join: 'custrecord_swc_pt_sku_map_item', operator: search.Operator.IS, values: '2' }//产品是老品
                ],
                columns: [
                    // { name: 'custrecord_swc_pt_sku_map_store', summary: 'GROUP' },//店铺
                    { name: 'custentity_swc_plan_metrics', join: 'custrecord_swc_pt_sku_map_store', summary: 'GROUP' },//备货维度
                    //SKU关系表里面有套装和库存商品，需要以库存商品维度分类，套装需要下拆库存商品
                    { name: 'formulanumeric', summary: 'GROUP', formula: "case when {custrecord_swc_pt_sku_map_item.type}='Kit/Package' or {custrecord_swc_pt_sku_map_item.type}='套件' then {custrecord_swc_pt_sku_map_item.memberitem.id} else {custrecord_swc_pt_sku_map_item.id} end" },
                    // { name: 'custentity_swc_platform', join: 'custrecord_swc_pt_sku_map_store', summary: 'GROUP' },//平台
                    { name: 'custrecord_swc_pt_sku_map_salesperson', summary: 'MAX' },//运营
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
                    results.push({
                        sku: rec.getValue(rec.columns[1]),
                        store: rec.getValue(rec.columns[0]),
                        // platform: rec.getValue(rec.columns[2]),
                        salesperson: rec.getValue(rec.columns[2])
                    });
                    return true;
                })
            }
            log.debug('results1', results)
            // 亚马逊的在另一个表里面记录，搜索该表
            //搜索Amazon SKU映射表里面老品SKU的，店铺+SKU+国家+仓库类型维度计算
            var mySearch = search.create({
                type: 'customrecord_swc_amazon_sku_mapping',//SKU映射表
                filters: [
                    { name: 'internalid', operator: search.Operator.ANYOF, values: ['6900', '1032', '6482', '4551'] },//给定测试条目 6482 4551
                    { name: 'custentity_swc_plan_metrics', join: 'custrecord_swc_az_sku_map_store', operator: search.Operator.NONEOF, values: '@NONE@' },
                    { name: 'custitem_swc_new_old', join: 'custrecord_swc_az_sku_map_item', operator: search.Operator.IS, values: '2' }//产品是老品
                ],
                columns: [
                    // { name: 'custrecord_swc_az_sku_map_store', summary: 'GROUP' },//店铺
                    { name: 'custentity_swc_plan_metrics', join: 'custrecord_swc_az_sku_map_store', summary: 'GROUP' },//备货维度
                    //SKU关系表里面有套装和库存商品，需要以库存商品维度分类，套装需要下拆库存商品
                    { name: 'formulanumeric', summary: 'GROUP', formula: "case when {custrecord_swc_az_sku_map_item.type}='Kit/Package' or {custrecord_swc_az_sku_map_item.type}='套件' then {custrecord_swc_az_sku_map_item.memberitem.id} else {custrecord_swc_az_sku_map_item.id} end" },
                    // { name: 'custentity_swc_platform', join: 'custrecord_swc_az_sku_map_store', summary: 'GROUP' },//平台
                    { name: 'custrecord_swc_az_sku_map_salesperson', summary: 'MAX' },//运营
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
            for (var i = 0; i < pageCount; i++) {
                pageData.fetch({
                    index: i
                }).data.forEach(function (rec) {
                    results.push({
                        sku: rec.getValue(rec.columns[1]),
                        store: rec.getValue(rec.columns[0]),
                        // platform: rec.getValue(rec.columns[2]),
                        salesperson: rec.getValue(rec.columns[2])
                    });
                    return true;
                })
            }
            log.debug('results2', results)
            return results;

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

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            try {
                var obj = JSON.parse(mapContext.value);
                log.debug('obj', obj);
                var store = obj.store;
                var sku = obj.sku;
                var country;
                var locationTypes = []
                search.create({
                    type: 'customer',
                    filters: [
                        { name: 'internalid', operator: search.Operator.IS, values: store }
                    ],
                    columns: [
                        { name: 'custentity_swc_location_type' },//店铺支持的仓库类型
                        { name: 'custentity_swc_country' },//店铺所属国家
                    ]
                }).run().each(function (rec) {
                    log.debug('店铺仓库类型类别结果', rec)
                    locationTypes = rec.getValue(rec.columns[0]);
                    if (locationTypes.length > 0) {
                        locationTypes = locationTypes.split(',')
                    }
                    country = rec.getValue(rec.columns[1]);
                    return false;
                });
                //获取系统日期格式配置
                var general_preferences = config.load({ type: config.Type.COMPANY_PREFERENCES });
                var dateFormat = general_preferences.getValue({ fieldId: 'DATEFORMAT' });
                log.debug('dateFormat', dateFormat);
                //本月月初时间
                const MonthStart = moment().add(16, 'hours').startOf('month').format(dateFormat);
                log.debug('MonthStart', MonthStart);
                const MonthEnd = moment().add(16, 'hours').endOf('month').format(dateFormat);
                log.debug('MonthEnd', MonthEnd);

                //SKU+仓库类型+国家遍历
                for (let index = 0; index < locationTypes.length; index++) {
                    var locationType = locationTypes[index];
                    //先搜索该月份的备货计划是否已经计算过，已经计算过的加载该记录;
                    var demandRec, exist = false;
                    search.create({
                        type: 'customrecord_swc_delivery_plan',
                        filters: [
                            { name: 'custrecord_swc_sdp_applicant_date', operator: search.Operator.ONORAFTER, values: MonthStart },
                            { name: 'custrecord_swc_sdp_store', operator: search.Operator.IS, values: store },
                            { name: 'custrecord_swc_sdp_country', operator: search.Operator.IS, values: country },
                            { name: 'custrecord_swc_sdp_location_type', operator: search.Operator.IS, values: locationType },
                            { name: 'custrecord_swc_sdp_sku', operator: search.Operator.IS, values: sku },
                            { name: 'custrecord_swc_sdp_batch', operator: search.Operator.IS, values: '1' }//常规备货
                        ],
                        columns: [
                            { name: 'custrecord_swc_sdp_sku' },
                        ]
                    }).run().each(function (rec) {
                        log.debug('已存在预测结果', rec)
                        exist = true;
                        demandRec = record.load({ type: 'customrecord_swc_delivery_plan', id: rec.id });
                        return false;
                    });
                    if (!exist) {
                        demandRec = record.create({ type: 'customrecord_swc_delivery_plan' });
                    }

                    demandRec.setValue({ fieldId: 'name', value: 1 }) //备货批次编码
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_batch_month', value: "TH-" + moment().add(16, 'hours').startOf('month').format('YYYYMM') }) //备货月批次编码
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_batch', value: 1 }) //备货批次,默认常规备货
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_store', value: store })//平台（店铺）
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_country', value: country })//国家编码
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_location_type', value: locationType })//仓库类型
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_sku', value: sku })//仓库类型
                    // demandRec.setText({ fieldId: 'custrecord_swc_sdp_applicant', text: obj.salesperson })//销售人员要取自SKU映射表
                    var level = getSKULevel(sku, country);
                    if (level) {
                        demandRec.setValue({ fieldId: 'custrecord_swc_sdp_sku_level', value: level.level })//产品等级  
                    }
                    var totalMonths = runtime.getCurrentScript().getParameter('custscript_swc_sdp_totalmonths');//计算总月份取配置值
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_months', value: totalMonths })//预测的总月份，默认6个月，可配置8个月
                    var first3MUnits = 0; //前三个月需求
                    var forcast_effective = 0; //运营周期内有效需求

                    //搜索该备货维度下支持该仓库类型的店铺
                    var stores = [];
                    search.create({
                        type: 'customer',
                        filters: [
                            { name: 'custentity_swc_plan_metrics', operator: search.Operator.IS, values: store },
                            { name: 'custentity_swc_location_type', operator: search.Operator.ANYOF, values: locationType }
                        ],
                        columns: [
                            { name: 'internalid' }
                        ]
                    }).run().each(function (rec) {
                        stores.push(rec.id)
                        return true;
                    });
                    log.debug('stores', stores)

                    //计算提货提前期
                    var leadTime = 90;
                    var leadTimeFound = false;
                    search.create({
                        type: 'customrecord_swc_plan_times',
                        filters: [
                            { name: 'custrecord_swc_spt_sku', operator: 'anyof', values: sku },
                            { name: 'custrecord_swc_spt_country', operator: 'anyof', values: country },
                            { name: 'custrecord_swc_spt_location_type', operator: 'anyof', values: locationType }
                        ],
                        columns: [
                            { name: 'custitem_swc_productdeliverydays', join: 'custrecord_swc_spt_sku' },//采购交期
                            { name: 'formulanumeric', formula: "{custrecord_swc_spt_plan_processing_time}+{custrecord_swc_spt_domestic_process_time}+{custrecord_swc_spt_oversea_transfer_time}+{custrecord_swc_spt_logistics_time}+{custrecord_swc_spt_flex_time}+{custrecord_swc_spt_pre_wh_safety_time}+{custrecord_swc_spt_putaway_time}" },//备货提前期（除了安全天数和采购提前期以外）
                        ]
                    }).run().each(function (rec) {
                        log.audit('rec', JSON.stringify(rec));
                        leadTime = rec.getValue(rec.columns[1]) * 1 + level.safeDate * 1
                        leadTimeFound = true
                        return true;
                    });

                    var totalForcast = 0;
                    //开始搜索销售预测数量
                    search.create({
                        type: 'customrecord_swc_sales_forcast',
                        filters: [
                            [
                                ['custrecord_swc_sf_year', 'within', [MonthStart, MonthEnd]], 'and',
                                ['custrecord_swc_sf_store', 'is', stores], 'and',
                                ['custrecord_swc_sf_country', 'is', country], 'and',
                                ['custrecord_swc_sf_location_type', 'is', locationType]

                            ], 'and',
                            [
                                ['custrecord_swc_sf_sku', 'is', sku], 'or',
                                ['custrecord_swc_sf_sku.component', 'is', sku]
                            ]
                        ],
                        columns: [
                            // { name: 'custrecord_swc_sf_sku' },
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberitem.id} else {custrecord_swc_sf_sku.id} end", summary: 'GROUP' },
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w1} else {custrecord_swc_sf_actual_unit_w1} end", summary: 'SUM' },//第1周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w2} else {custrecord_swc_sf_actual_unit_w2} end", summary: 'SUM' },//第2周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w3} else {custrecord_swc_sf_actual_unit_w3} end", summary: 'SUM' },//第3周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w4} else {custrecord_swc_sf_actual_unit_w4} end", summary: 'SUM' },//第4周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w5} else {custrecord_swc_sf_actual_unit_w5} end", summary: 'SUM' },//第5周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w6} else {custrecord_swc_sf_actual_unit_w6} end", summary: 'SUM' },//第6周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w7} else {custrecord_swc_sf_actual_unit_w7} end", summary: 'SUM' },//第7周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w8} else {custrecord_swc_sf_actual_unit_w8} end", summary: 'SUM' },//第8周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w9} else {custrecord_swc_sf_actual_unit_w9} end", summary: 'SUM' },//第9周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w10} else {custrecord_swc_sf_actual_unit_w10} end", summary: 'SUM' },//第10周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w11} else {custrecord_swc_sf_actual_unit_w11} end", summary: 'SUM' },//第11周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w12} else {custrecord_swc_sf_actual_unit_w12} end", summary: 'SUM' },//第12周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w13} else {custrecord_swc_sf_actual_unit_w13} end", summary: 'SUM' },//第13周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w14} else {custrecord_swc_sf_actual_unit_w14} end", summary: 'SUM' },//第14周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w15} else {custrecord_swc_sf_actual_unit_w15} end", summary: 'SUM' },//第15周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w16} else {custrecord_swc_sf_actual_unit_w16} end", summary: 'SUM' },//第16周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w17} else {custrecord_swc_sf_actual_unit_w17} end", summary: 'SUM' },//第17周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w18} else {custrecord_swc_sf_actual_unit_w18} end", summary: 'SUM' },//第18周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w19} else {custrecord_swc_sf_actual_unit_w19} end", summary: 'SUM' },//第19周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w20} else {custrecord_swc_sf_actual_unit_w20} end", summary: 'SUM' },//第20周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w21} else {custrecord_swc_sf_actual_unit_w21} end", summary: 'SUM' },//第21周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w22} else {custrecord_swc_sf_actual_unit_w22} end", summary: 'SUM' },//第22周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w23} else {custrecord_swc_sf_actual_unit_w23} end", summary: 'SUM' },//第23周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w24} else {custrecord_swc_sf_actual_unit_w24} end", summary: 'SUM' },//第24周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w25} else {custrecord_swc_sf_actual_unit_w25} end", summary: 'SUM' },//第25周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w26} else {custrecord_swc_sf_actual_unit_w26} end", summary: 'SUM' },//第26周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w27} else {custrecord_swc_sf_actual_unit_w27} end", summary: 'SUM' },//第27周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w28} else {custrecord_swc_sf_actual_unit_w28} end", summary: 'SUM' },//第28周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w29} else {custrecord_swc_sf_actual_unit_w29} end", summary: 'SUM' },//第29周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w30} else {custrecord_swc_sf_actual_unit_w30} end", summary: 'SUM' },//第30周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w31} else {custrecord_swc_sf_actual_unit_w31} end", summary: 'SUM' },//第31周预测值
                            { name: 'formulanumeric', formula: "case when {custrecord_swc_sf_sku.type}='Kit/Package' or {custrecord_swc_sf_sku.type}='套件' then {custrecord_swc_sf_sku.memberquantity} * {custrecord_swc_sf_actual_unit_w32} else {custrecord_swc_sf_actual_unit_w32} end", summary: 'SUM' },//第32周预测值
                            { name: 'custrecord_swc_sf_start_date', summary: 'MAX' },//开始日期
                        ]
                    }).run().each(function (rec) {
                        log.debug('预测结果', rec)
                        var itemId = rec.getValue(rec.columns[0]);
                        if (itemId == sku) {//套装下可能会搜出其他子件SKU的需求数，这里只取对应SKU的
                            var unit_m1 = rec.getValue(rec.columns[1]) * 1 + rec.getValue(rec.columns[2]) * 1 + rec.getValue(rec.columns[3]) * 1 + rec.getValue(rec.columns[4]) * 1;
                            demandRec.setValue({ fieldId: 'custrecord_swc_sdp_forcast_m1', value: unit_m1 })//第1月需求
                            var unit_m2 = rec.getValue(rec.columns[5]) * 1 + rec.getValue(rec.columns[6]) * 1 + rec.getValue(rec.columns[7]) * 1 + rec.getValue(rec.columns[8]) * 1;
                            demandRec.setValue({ fieldId: 'custrecord_swc_sdp_forcast_m2', value: unit_m2 })//第2月需求 
                            var unit_m3 = rec.getValue(rec.columns[9]) * 1 + rec.getValue(rec.columns[10]) * 1 + rec.getValue(rec.columns[11]) * 1 + rec.getValue(rec.columns[12]) * 1;
                            demandRec.setValue({ fieldId: 'custrecord_swc_sdp_forcast_m3', value: unit_m3 })//第3月需求 
                            var unit_m4 = rec.getValue(rec.columns[13]) * 1 + rec.getValue(rec.columns[14]) * 1 + rec.getValue(rec.columns[15]) * 1 + rec.getValue(rec.columns[16]) * 1;
                            demandRec.setValue({ fieldId: 'custrecord_swc_sdp_forcast_m4', value: unit_m4 })//第4月需求 
                            var unit_m5 = rec.getValue(rec.columns[17]) * 1 + rec.getValue(rec.columns[18]) * 1 + rec.getValue(rec.columns[19]) * 1 + rec.getValue(rec.columns[20]) * 1;
                            demandRec.setValue({ fieldId: 'custrecord_swc_sdp_forcast_m5', value: unit_m5 })//第5月需求 
                            var unit_m6 = rec.getValue(rec.columns[21]) * 1 + rec.getValue(rec.columns[22]) * 1 + rec.getValue(rec.columns[23]) * 1 + rec.getValue(rec.columns[24]) * 1;
                            demandRec.setValue({ fieldId: 'custrecord_swc_sdp_forcast_m6', value: unit_m6 })//第6月需求 
                            var unit_m7 = rec.getValue(rec.columns[25]) * 1 + rec.getValue(rec.columns[26]) * 1 + rec.getValue(rec.columns[27]) * 1 + rec.getValue(rec.columns[28]) * 1;
                            if (totalMonths == 6) {
                                unit_m7 = 0;
                            }
                            demandRec.setValue({ fieldId: 'custrecord_swc_sdp_forcast_m7', value: unit_m7 })//第7月需求 
                            var unit_m8 = rec.getValue(rec.columns[29]) * 1 + rec.getValue(rec.columns[30]) * 1 + rec.getValue(rec.columns[31]) * 1 + rec.getValue(rec.columns[32]) * 1;
                            if (totalMonths == 6) {
                                unit_m8 = 0;
                            }
                            demandRec.setValue({ fieldId: 'custrecord_swc_sdp_forcast_m8', value: unit_m8 })//第8月需求 
                            const targetDate = new Date(rec.getValue(rec.columns[33]));
                            const currentDate = new Date();
                            const timeDiff = currentDate.getTime() - targetDate.getTime();
                            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                            // 定义8个月的需求数量（每月固定28天）
                            const monthlyDemands = [unit_m1, unit_m2, unit_m3, unit_m4, unit_m5, unit_m6, unit_m7, unit_m8];
                            forcast_effective = calculateDemandInPeriod(daysDiff, leadTime, monthlyDemands);
                            demandRec.setValue({ fieldId: 'custrecord_swc_sdp_forcast_effective', value: forcast_effective })//运营周期内需求数量
                            //旧逻辑-安全库存,按产品等级算运营前三月需求平均数/30*N,N根据产品等级算
                            first3MUnits = unit_m1 * 1 + unit_m2 * 1 + unit_m3 * 1;
                            totalForcast = unit_m1 * 1 + unit_m2 * 1 + unit_m3 * 1 + unit_m4 * 1 + unit_m5 * 1 + unit_m6 * 1 + unit_m7 * 1 + unit_m8 * 1;
                            return false; //找到了对应SKU的需求就中断循环了
                        }
                        return true;
                    });
                    //销售预测的结果值为0的，既销售需求为0的就不用备货
                    if (totalForcast == 0) {
                        continue;
                    }

                    search.create({
                        type: 'customrecord_swc_sku_manager',
                        filters: [
                            { name: 'custrecord_swc_sm_country', operator: search.Operator.IS, values: country },
                            { name: 'custrecord_swc_sm_store', operator: search.Operator.IS, values: store },
                            { name: 'custrecord_swc_sm_sku', operator: search.Operator.IS, values: sku }
                        ],
                        columns: [
                            { name: 'custrecord_swc_sm_sales_man' },
                            { name: 'custrecord_swc_sm_sales_supervisor' },
                            { name: 'custrecord_swc_sm_sales_manager' },
                            { name: 'custrecord_swc_sm_planer' },
                            { name: 'custrecord_swc_sm_plan_manager' }
                        ]
                    }).run().each(function (rec) {
                        demandRec.setValue({ fieldId: 'custrecord_swc_sdp_applicant', value: rec.getValue('custrecord_swc_sm_sales_man') })//
                        demandRec.setValue({ fieldId: 'custrecord_swc_sdp_sales_supervisor', value: rec.getValue('custrecord_swc_sm_sales_supervisor') })//
                        demandRec.setValue({ fieldId: 'custrecord_swc_sdp_sales_manager', value: rec.getValue('custrecord_swc_sm_sales_manager') })//
                        demandRec.setValue({ fieldId: 'custrecord_swc_sdp_planer', value: rec.getValue('custrecord_swc_sm_planer') })//
                        demandRec.setValue({ fieldId: 'custrecord_swc_sdp_plan_manager', value: rec.getValue('custrecord_swc_sm_plan_manager') })//
                        return false;
                    });

                    //TODO:获取库存状态，在库存去化率表里面计算（库存去化率表数据由甲方IT计算，NS只用到库存状态）
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_inventory_status', value: 3 })//查不到去化率时默认设置无标准销量
                    search.create({
                        type: 'customrecord_swc_sku_status',
                        filters: [
                            { name: 'custrecord_swc_qh_country', operator: search.Operator.IS, values: country },
                            { name: 'custrecord_swc_qh_location_type', operator: search.Operator.IS, values: locationType },
                            { name: 'custrecord_swc_qh_sku', operator: search.Operator.IS, values: sku }
                        ],
                        columns: [
                            { name: 'custrecord_swc_qh_inventory_status' },
                            { name: 'custrecord_swc_qh_by_date' }
                        ]
                    }).run().each(function (rec) {
                        demandRec.setValue({ fieldId: 'custrecord_swc_sdp_inventory_status', value: rec.getValue('custrecord_swc_qh_inventory_status') })//备货库存状态
                        rec.getValue('custrecord_swc_qh_by_date') && demandRec.setText({ fieldId: 'custrecord_swc_sdp_by_date', text: rec.getValue('custrecord_swc_qh_by_date') })//首次到仓时间
                        return false;
                    });

                    // 2 国内在途仓 3 国内海外在途仓 4 海外国内在途仓 5 海外国外在途仓 10 平台在途仓 11: 保税仓
                    const intransitIds = ['2', '3', '4', '5', '10', '11'];
                    // 6: 海外仓 7: 平台仓
                    const inStockIds = ['6', '7'];
                    //在库
                    var onhandQty = 0;
                    var salesPrice = 0, cost = 0, newOld = 1;
                    search.create({
                        type: search.Type.ITEM,
                        filters: [
                            { name: 'internalid', operator: search.Operator.IS, values: sku },
                            // 仓库属性
                            { name: 'custrecord_swc_location_attribute', join: 'inventorylocation', operator: 'anyof', values: inStockIds },
                            { name: 'custrecord_swc_location_store', join: 'inventorylocation', operator: search.Operator.IS, values: store },
                            { name: 'custrecord_swc_location_country', join: 'inventorylocation', operator: search.Operator.IS, values: country },
                            { name: 'custrecord_swc_location_type', join: 'inventorylocation', operator: search.Operator.IS, values: locationType }
                        ],
                        columns: [
                            { name: 'internalid', summary: 'GROUP' }, // 组件物品ID
                            { name: 'locationquantityavailable', summary: 'SUM' }, // 可用数量
                            { name: 'locationquantityonhand', summary: 'SUM' }, // 在手数量
                            { name: 'formulanumeric', formula: "{locationaveragecost}*{locationquantityonhand}", summary: 'SUM' }, // 总货值
                            //SKU档案上的其他信息一起搜索出来
                            { name: 'custitem_swc_msrp', summary: 'GROUP' },
                            { name: 'custitem_swc_map', summary: 'GROUP' },
                            { name: 'custitem_swc_new_old', summary: 'GROUP' }
                        ]
                    }).run().each(function (rec) {
                        onhandQty = rec.getValue(rec.columns[2]);
                        salesPrice = rec.getValue(rec.columns[4]) || 0;
                        newOld = rec.getValue(rec.columns[6]);
                        demandRec.setValue({ fieldId: 'custrecord_swc_sdp_unit_price', value: salesPrice })//售价
                        if (onhandQty > 0) {
                            cost = rec.getValue(rec.columns[3]) / onhandQty
                        }
                        if (salesPrice > 0) {
                            demandRec.setValue({ fieldId: 'custrecord_swc_sdp_profit_margin', value: Math.round(salesPrice - cost / salesPrice, 4) * 100 })//利润率
                        } else {
                            demandRec.setValue({ fieldId: 'custrecord_swc_sdp_profit_margin', value: 0 })//利润率
                        }
                        demandRec.setValue({ fieldId: 'custrecord_swc_sdp_inventory_cost', value: cost })//成本


                        return false;
                    });

                    //在产
                    var onOrderQty = 0;
                    search.create({
                        type: search.Type.PURCHASE_ORDER,
                        filters: [
                            { name: 'mainline', operator: search.Operator.IS, values: false },
                            { name: 'taxline', operator: search.Operator.IS, values: false },
                            { name: 'shipping', operator: search.Operator.IS, values: false },
                            { name: 'representingsubsidiary', join: 'vendor', operator: search.Operator.ANYOF, values: '@NONE@' },
                            { name: 'custcol_swc_pr_origin_sku', operator: search.Operator.IS, values: sku },
                            { name: 'custcol_swc_pr_main_sku', operator: search.Operator.IS, values: true },
                            { name: 'custcol_swc_store', operator: search.Operator.IS, values: store },
                            { name: 'custcol_swc_country_code', operator: search.Operator.IS, values: country },
                            { name: 'custcol_swc_loc_type', operator: search.Operator.IS, values: locationType }
                        ],
                        columns: [
                            { name: 'quantity', summary: 'SUM' }, // 数量
                            { name: 'quantityshiprecv', summary: 'SUM' }, // 已收货数量
                            { name: 'formulanumeric', formula: "{quantity}-{quantityshiprecv}", summary: 'SUM' } // 未回货数量
                        ]
                    }).run().each(function (rec) {
                        onOrderQty = rec.getValue(rec.columns[2]);
                        return false;
                    });

                    //TODO:物流发运单搜索在途数据
                    var onWayQty = 0;
                    search.create({
                        type: search.Type.ITEM,
                        filters: [
                            { name: 'internalid', operator: search.Operator.IS, values: sku },
                            // 仓库属性
                            { name: 'custrecord_swc_location_attribute', join: 'inventorylocation', operator: 'anyof', values: intransitIds },
                            { name: 'custrecord_swc_location_store', join: 'inventorylocation', operator: search.Operator.IS, values: store },
                            { name: 'custrecord_swc_location_country', join: 'inventorylocation', operator: search.Operator.IS, values: country },
                            { name: 'custrecord_swc_location_type', join: 'inventorylocation', operator: search.Operator.IS, values: locationType }
                        ],
                        columns: [
                            { name: 'internalid', summary: 'GROUP' }, // 组件物品ID
                            { name: 'locationquantityavailable', summary: 'SUM' }, // 可用数量
                            { name: 'locationquantityonhand', summary: 'SUM' }, // 在手数量
                        ]
                    }).run().each(function (rec) {
                        onWayQty = rec.getValue(rec.columns[2]);
                        return false;
                    });
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_onhand_quantity', value: onhandQty })
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_onorder_quantity', value: onOrderQty })
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_onway_quantity', value: onWayQty })
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_inventory', value: onhandQty * 1 + onOrderQty * 1 + onWayQty * 1 })//在库+在产+在途

                    //当月在产
                    var preDemandQty = 0;
                    const NextMonthEnd = moment().add(16, 'hours').add('1', 'months').endOf('month').format(dateFormat);
                    search.create({
                        type: search.Type.PURCHASE_ORDER,
                        filters: [
                            { name: 'closed', operator: search.Operator.IS, values: false },
                            { name: 'status', operator: search.Operator.ANYOF, values: ['PurchOrd:E', 'PurchOrd:B', 'PurchOrd:D'] },
                            { name: 'mainline', operator: search.Operator.IS, values: false },
                            { name: 'taxline', operator: search.Operator.IS, values: false },
                            { name: 'shipping', operator: search.Operator.IS, values: false },
                            // { name: 'custrecord_swc_dp_batch_month', join: 'custcol_swc_beihuo_plan', operator: search.Operator.IS, values: 'BH-202604' },
                            { name: 'representingsubsidiary', join: 'vendor', operator: search.Operator.ANYOF, values: '@NONE@' },
                            { name: 'formulanumeric', formula: "{quantity}-{quantityshiprecv}", operator: search.Operator.GREATERTHAN, values: 0 },
                            { name: 'custcol_swc_pr_origin_sku', operator: search.Operator.IS, values: sku },
                            { name: 'custcol_swc_pr_main_sku', operator: search.Operator.IS, values: true },
                            { name: 'custcol_swc_store', operator: search.Operator.IS, values: store },
                            { name: 'custcol_swc_country_code', operator: search.Operator.IS, values: country },
                            { name: 'custcol_swc_loc_type', operator: search.Operator.IS, values: locationType },
                            { name: 'expectedreceiptdate', operator: search.Operator.ONORBEFORE, values: NextMonthEnd }

                        ],
                        columns: [
                            { name: 'quantity', summary: 'SUM' }, // 数量
                            { name: 'quantityshiprecv', summary: 'SUM' }, // 已收货数量
                            { name: 'formulanumeric', formula: "{quantity}-{quantityshiprecv}", summary: 'SUM' } // 未回货数量
                        ]
                    }).run().each(function (rec) {
                        preDemandQty = rec.getValue(rec.columns[2]);
                        return false;
                    });
                    log.debug('preDemandQty', preDemandQty)
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_pre_demand_qty', value: preDemandQty })

                    //美国分区数量要根据订单目的地所在州确定分区
                    var region_columns = getRegionCulumns();
                    //获取item直接当做销售订单货品时的日均销量
                    var avg90 = 0, avg7 = 0, avg15 = 0, avg30 = 0;
                    var mxxssl = 0, mdxssl = 0, mzxssl = 0, mdnxssl = 0, mxnxssl = 0, jdxssl = 0, jxxssl = 0;
                    var columns_items = [
                        { name: 'formulanumeric', formula: 'case when trunc({today})-To_Date{trandate} > 90 then 0 else round({quantity}/90,8) end', summary: 'SUM' },
                        { name: 'formulanumeric', formula: 'case when trunc({today})-To_Date{trandate} > 7 then 0 else round({quantity}/7,8) end', summary: 'SUM' },
                        { name: 'formulanumeric', formula: 'case when trunc({today})-To_Date{trandate} > 15 then 0 else round({quantity}/15,8) end', summary: 'SUM' },
                        { name: 'formulanumeric', formula: 'case when trunc({today})-To_Date{trandate} > 30 then 0 else round({quantity}/30,8) end', summary: 'SUM' },
                        { name: 'formulanumeric', formula: 'case when trunc({today})-To_Date{trandate} > 90 then 0 else round({quantity},0) end', summary: 'SUM' },
                        { name: 'formulanumeric', formula: 'case when trunc({today})-To_Date{trandate} > 7 then 0 else round({quantity},0) end', summary: 'SUM' },
                        { name: 'formulanumeric', formula: 'case when trunc({today})-To_Date{trandate} > 15 then 0 else round({quantity},0) end', summary: 'SUM' },
                        { name: 'formulanumeric', formula: 'case when trunc({today})-To_Date{trandate} > 30 then 0 else round({quantity},0) end', summary: 'SUM' },
                    ].concat(region_columns.columns_items)

                    search.create({
                        type: 'salesorder',
                        filters: [
                            { name: 'item', operator: 'anyof', values: sku },
                            { name: 'entity', operator: 'anyof', values: stores },
                            { name: 'custrecord_swc_location_type', join: 'location', operator: 'anyof', values: locationType },
                            { name: 'mainline', operator: 'is', values: false },
                            { name: 'shipping', operator: 'is', values: false },
                            { name: 'taxline', operator: 'is', values: false },
                            { name: 'intercotransaction', operator: 'anyof', values: ['@NONE@'] },
                            { name: 'formulanumeric', formula: 'trunc({today})-To_Date{trandate}', operator: 'lessthan', values: ['91'] },
                        ],
                        columns: columns_items
                    }).run().each(function (rec) {
                        log.debug('日均销量1rec', rec);
                        avg90 = Number(avg90) + Number(rec.getValue(rec.columns[0]) ? rec.getValue(rec.columns[0]) : 0);
                        avg7 = Number(avg7) + Number(rec.getValue(rec.columns[1]) ? rec.getValue(rec.columns[1]) : 0);
                        avg15 = Number(avg15) + Number(rec.getValue(rec.columns[2]) ? rec.getValue(rec.columns[2]) : 0);
                        avg30 = Number(avg30) + Number(rec.getValue(rec.columns[3]) ? rec.getValue(rec.columns[3]) : 0);
                        log.debug('日均销量1', 'avg90:' + avg90 + ', avg7:' + avg7 + ', avg15:' + avg15 + ', avg30:' + avg30);
                        mxxssl = Number(rec.getValue(rec.columns[8]) ? rec.getValue(rec.columns[8]) : 0);
                        mdxssl = Number(rec.getValue(rec.columns[9]) ? rec.getValue(rec.columns[9]) : 0);
                        mzxssl = Number(rec.getValue(rec.columns[10]) ? rec.getValue(rec.columns[10]) : 0);
                        mdnxssl = Number(rec.getValue(rec.columns[11]) ? rec.getValue(rec.columns[11]) : 0);
                        mxnxssl = Number(rec.getValue(rec.columns[12]) ? rec.getValue(rec.columns[12]) : 0);
                        return false;
                    });

                    //美国分区数量要根据订单目的地所在州确定分区
                    var columns_component = [
                        { name: 'memberitem', join: 'item', summary: "GROUP", sort: search.Sort.ASC },
                        //套装订单中组件 3/7/15/30天总销量
                        { name: 'formulanumeric', formula: "case when trunc({today})-To_Date{trandate} > 90 then 0 else round({quantity}*{item.memberquantity}/90,8) end", summary: "SUM" },
                        { name: 'formulanumeric', formula: "case when trunc({today})-To_Date{trandate} > 7 then 0 else round({quantity}*{item.memberquantity}/7,8) end", summary: "SUM" },
                        { name: 'formulanumeric', formula: "case when trunc({today})-To_Date{trandate} > 15 then 0 else round({quantity}*{item.memberquantity}/15,8) end", summary: "SUM" },
                        { name: 'formulanumeric', formula: "case when trunc({today})-To_Date{trandate} > 30 then 0 else round({quantity}*{item.memberquantity}/30,8) end", summary: "SUM" },
                        { name: 'formulanumeric', formula: "case when trunc({today})-To_Date{trandate} > 90 then 0 else round({quantity}*{item.memberquantity},0) end", summary: "SUM" },
                        { name: 'formulanumeric', formula: "case when trunc({today})-To_Date{trandate} > 7 then 0 else round({quantity}*{item.memberquantity},0) end", summary: "SUM" },
                        { name: 'formulanumeric', formula: "case when trunc({today})-To_Date{trandate} > 15 then 0 else round({quantity}*{item.memberquantity},0) end", summary: "SUM" },
                        { name: 'formulanumeric', formula: "case when trunc({today})-To_Date{trandate} > 30 then 0 else round({quantity}*{item.memberquantity},0) end", summary: "SUM" },

                    ].concat(region_columns.columns_components)
                    //获取item当做销售订单套装下成员货品时的日均销量
                    log.debug('日销数据 columns_component', columns_component)

                    search.create({
                        type: 'salesorder',
                        filters: [
                            { name: 'entity', operator: 'anyof', values: stores },
                            { name: 'custrecord_swc_location_type', join: 'location', operator: 'anyof', values: locationType },
                            { name: 'mainline', operator: search.Operator.IS, values: false },
                            { name: 'shipping', operator: 'is', values: false },
                            { name: 'taxline', operator: search.Operator.IS, values: false },
                            { name: 'intercotransaction', operator: 'anyof', values: ['@NONE@'] },
                            { name: 'formulanumeric', formula: 'trunc({today})-To_Date{trandate}', operator: 'lessthan', values: ['91'] },
                            { name: 'component', join: 'item', operator: search.Operator.ANYOF, values: sku }
                        ],
                        columns: columns_component
                    }).run().each(function (rec) {
                        log.debug('日销数据', rec)
                        log.debug('日销数据item', rec.getValue(rec.columns[0]))
                        log.debug('日销数据memberitem', rec.getValue(rec.columns[1]))
                        if (rec.getValue(rec.columns[0]) == sku) {
                            avg90 = Number(avg90) + Number(rec.getValue(rec.columns[1]))
                            avg7 = Number(avg7) + Number(rec.getValue(rec.columns[2]))
                            avg15 = Number(avg15) + Number(rec.getValue(rec.columns[3]))
                            avg30 = Number(avg30) + Number(rec.getValue(rec.columns[4]))
                            log.debug('日均销量2', 'avg3:' + avg90 + ', avg7:' + avg7 + ', avg15:' + avg15 + ', avg30:' + avg30);
                            mxxssl = Number(mxxssl) + Number(rec.getValue(rec.columns[8]) ? rec.getValue(rec.columns[8]) : 0);
                            mdxssl = Number(mdxssl) + Number(rec.getValue(rec.columns[9]) ? rec.getValue(rec.columns[9]) : 0);
                            mzxssl = Number(mzxssl) + Number(rec.getValue(rec.columns[10]) ? rec.getValue(rec.columns[10]) : 0);
                            mdnxssl = Number(mdnxssl) + Number(rec.getValue(rec.columns[11]) ? rec.getValue(rec.columns[11]) : 0);
                            mxnxssl = Number(mxnxssl) + Number(rec.getValue(rec.columns[12]) ? rec.getValue(rec.columns[12]) : 0);
                            jdxssl = Number(jdxssl) + Number(rec.getValue(rec.columns[13]) ? rec.getValue(rec.columns[13]) : 0);
                            jxxssl = Number(jxxssl) + Number(rec.getValue(rec.columns[14]) ? rec.getValue(rec.columns[14]) : 0);
                        }
                        return true;
                    });
                    var avg = avg90 + avg7 + avg15 + avg30;
                    log.debug('总日均销量', avg);
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_mxxssl', value: mxxssl })
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_mdxssl', value: mdxssl })
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_mzxssl', value: mzxssl })
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_mdnxssl', value: mdnxssl })
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_mxnxssl', value: mxnxssl })
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_ca_east_xssl', value: jdxssl })
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_ca_west_xssl', value: jxxssl })


                    //旧逻辑-安全库存,按产品等级算运营前三月需求平均数/30*N,N根据产品等级算
                    var oldSafeQty = Math.round(first3MUnits / (3 * 28) * level.safeDate);
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_old_logic_safe_stock', value: oldSafeQty })

                    // 新逻辑-安全库存：
                    // 1.日均为0则取旧逻辑安全库存*权重；
                    // 2.否则新品则按7（0.2）、15（0.3）、30（0.3）、90（0.2）日均销量*30*权重；
                    // 3.否则老品：3.1在库小于15天日均*30时15（0.3）、30（0.4）、90（0.3）日均销量*30*权重；3.2在库大于15天日均*30时7（0.2）、15（0.3）、30（0.3）、90（0.2）日均销量*30*权重；
                    var newSafeQty = 0;
                    if (avg == 0) {
                        newSafeQty = oldSafeQty
                    } else if (newOld == '1') {
                        newSafeQty = Math.round(avg7 * 0.2 + avg15 * 0.3 + avg30 * 0.3 + avg90 * 0.2 * 30 * level.safeDate)
                    } else if (onhandQty < avg15 * 30) {
                        newSafeQty = Math.round(avg15 * 0.3 + avg30 * 0.4 + avg90 * 0.3 * 30 * level.safeDate)
                    } else {
                        newSafeQty = Math.round(avg7 * 0.2 + avg15 * 0.3 + avg30 * 0.3 + avg90 * 0.2 * 30 * level.safeDate)
                    }
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_new_logic_safe_stock', value: newSafeQty })//新逻辑-安全库存
                    //预估总数
                    // 1.日均为0则取运营周期内需求数量；2.否则新品则按7、15、30、90日均销量*备货周期*权重；
                    // 3.否则老品：3.1在库小于新逻辑安全库存时15*0.3、30*0.4、90*0.3日均销量*备货周期*权重；3.2在库大于新逻辑安全库存时7、15、30、90日均销量*备货周期*权重；
                    var estimatedQty = 0;

                    if (avg == 0) {
                        estimatedQty = forcast_effective
                    } else if (newOld == '1') {//获取新老品状态
                        estimatedQty = Math.round(avg7 * 0.2 + avg15 * 0.3 + avg30 * 0.3 + avg90 * 0.2 * leadTime * level.safeDate)
                    } else if (onhandQty < newSafeQty) {
                        estimatedQty = Math.round(avg15 * 0.3 + avg30 * 0.4 + avg90 * 0.3 * leadTime * level.safeDate)
                    } else {
                        estimatedQty = Math.round(avg7 * 0.2 + avg15 * 0.3 + avg30 * 0.3 + avg90 * 0.2 * leadTime * level.safeDate)
                    }
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_estimated_quantity', value: estimatedQty })//预估总数
                    // 销量调整系数：运营周期内需求数量/预估总数-1
                    var salesRate = estimatedQty == 0 ? 0 : Math.round(forcast_effective / estimatedQty - 1, 2);
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_sales_adjust_rate', value: salesRate })
                    //理论备货数量:销量调整系数绝对值小于0.2时取运营周期内需求数量否则取预估总数，再减去在产、在库、在途数量
                    var theoryQuantity = 0;
                    if (salesRate >= -0.2 && salesRate <= 0.2) {
                        theoryQuantity = forcast_effective - onhandQty /*- onOrderQty*/ - onWayQty;
                    } else {
                        theoryQuantity = estimatedQty - onhandQty /*- onOrderQty*/ - onWayQty;
                    }
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_theory_quantity', value: theoryQuantity })

                    //系统建议：
                    // 1.销售调整系数大于0.2："运营预估数量过大"；
                    // 2.销售调整系数小于-0.2且理论备货数量>0："运营预估数量过小"；
                    // 3.否则“运营预估数量在范围内”
                    if (salesRate > 0.2) {
                        demandRec.setValue({ fieldId: 'custrecord_swc_sdp_system_recommendation', value: '1' })
                    } else if (salesRate < -0.2 && theoryQuantity > 0) {
                        demandRec.setValue({ fieldId: 'custrecord_swc_sdp_system_recommendation', value: '2' })
                    } else {
                        demandRec.setValue({ fieldId: 'custrecord_swc_sdp_system_recommendation', value: '3' })
                    }
                    if (!leadTimeFound) {
                        demandRec.setValue({ fieldId: 'custrecord_swc_dp_system_recommendation', value: '4' })
                    }
                    if (!leadTimeFound) {
                        demandRec.setValue({ fieldId: 'custrecord_swc_sdp_system_recommendation', value: '4' })
                    }


                    //旧逻辑-备货系数:理论备货数量/旧逻辑-安全库存
                    var oldRate = oldSafeQty == 0 ? 0 : Math.round(theoryQuantity / oldSafeQty, 2);
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_old_plan_rate', value: oldRate })
                    // 新逻辑-备货系数:理论备货数量/新逻辑-安全库存
                    var newRate = newSafeQty == 0 ? 0 : Math.round(theoryQuantity / newSafeQty, 2);
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_new_plan_rate', value: newRate })
                    //修正1
                    // 1.仓库为3PL或Mano, 新逻辑备货系数大于2.5时，取新逻辑安全库存 * 2.5；
                    // 2.CG仓, 新逻辑备货系数大于3.5时，取新逻辑安全库存 * 3.5
                    // 3.否则取理论备货数量
                    var correction1 = 0;
                    if ((locationType == '1' || locationType == '4') && newRate > 2.5) {
                        correction1 = newSafeQty * 2.5;
                    } else if (locationType == '3' && newRate > 3.5) {
                        correction1 = newSafeQty * 3.5;
                    } else {
                        correction1 = theoryQuantity;
                    }
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_correction1', value: correction1 })

                    //搜索各区超龄数据
                    //库龄>180天
                    var mxcq = 0, mdcq = 0, mzcq = 0, mdncq = 0, mxncq = 0;//美西、美东、美中、美东南、美西南超龄数量;
                    search.create({
                        type: 'transaction',
                        filters: [
                            { name: 'type', operator: 'anyof', values: ['ItemRcpt', 'ItemShip', 'BinTrnfr', 'InvAdjst', 'InvTrnfr'] },
                            { name: 'item', operator: 'anyof', values: sku },
                            { name: 'custrecord_swc_location_type', join: 'location', operator: 'anyof', values: 1 },//3PL仓库类型
                            { name: 'custrecord_swc_location_country', join: 'location', operator: 'anyof', values: 1 },//国家为美国
                            // { name: 'location', operator: 'anyof', values: location_id },//TODO:仓库类型为海外仓、平台仓、国家为美国
                            { name: 'formulanumeric', operator: 'equalto', values: ['1'], formula: "case when {item.inventorylocation.id} = {location.id} then 1 end" },
                            { name: 'formulanumeric', operator: 'equalto', values: ['1'], formula: "case when {item.assetaccount.id} = {account.id} then 1 end" },
                        ],
                        columns: [
                            // { name: 'formulanumeric', summary: 'SUM', formula: "case when sum(case when {today}-{trandate}<=90 and {serialnumberquantity}>0 then {serialnumberquantity} else 0 end)>sum({serialnumberquantity}) then sum({serialnumberquantity}) else sum(case when {today}-{trandate}<=90 and {serialnumberquantity}>0 then {serialnumberquantity} else 0 end) end" },//90天内数量
                            // { name: 'formulanumeric', summary: 'SUM', formula: "case when sum(case when {today}-{trandate}>90 and {today}-{trandate}<=180 and {serialnumberquantity}>0 then {serialnumberquantity} else 0 end)>sum({serialnumberquantity})-case when sum(case when {today}-{trandate}<=90 and {serialnumberquantity}>0 then {serialnumberquantity} else 0 end)>sum({serialnumberquantity}) then sum({serialnumberquantity}) else sum(case when {today}-{trandate}<=90 and {serialnumberquantity}>0 then {serialnumberquantity} else 0 end) end then sum({serialnumberquantity})-case when sum(case when {today}-{trandate}<=90 and {serialnumberquantity}>0 then {serialnumberquantity} else 0 end)>sum({serialnumberquantity}) then sum({serialnumberquantity}) else sum(case when {today}-{trandate}<=90 and {serialnumberquantity}>0 then {serialnumberquantity} else 0 end) end else sum(case when {today}-{trandate}>90 and {today}-{trandate}<=180 and {serialnumberquantity}>0 then {serialnumberquantity} else 0 end) end" },//91-180天数量
                            { name: 'formulanumeric', summary: 'SUM', formula: "case when sum(case when {today}-{trandate}>180 and {serialnumberquantity}>0 then {serialnumberquantity} else 0 end)>sum({serialnumberquantity})-case when sum(case when {today}-{trandate}<=180 and {serialnumberquantity}>0 then {serialnumberquantity} else 0 end )>sum({serialnumberquantity}) then sum({serialnumberquantity}) else sum(case when {today}-{trandate}<=180 and {serialnumberquantity}>0 then {serialnumberquantity} else 0 end ) end then sum{serialnumberquantity}-case when sum(case when {today}-{trandate}<=180 and {serialnumberquantity}>0 then {serialnumberquantity} else 0 end )>sum({serialnumberquantity}) then sum({serialnumberquantity}) else sum(case when {today}-{trandate}<=180 and {serialnumberquantity}>0 then {serialnumberquantity} else 0 end ) end else sum(case when {today}-{trandate}>180 and {serialnumberquantity}>0 then {serialnumberquantity} else 0 end ) end" },//大于180天数量
                            { name: 'custrecord_swc_us_districts', join: 'location', summary: 'GROUP' }//根据美国分区分组
                        ]
                    }).run().each(function (rec) {
                        log.audit('rec', JSON.stringify(rec));
                        if (rec.getValue(rec.columns[1]) == 1) {
                            mxcq = rec.getValue(rec.columns[1]);
                        } else if (rec.getValue(rec.columns[1]) == 2) {
                            mdcq = rec.getValue(rec.columns[1]);
                        } else if (rec.getValue(rec.columns[1]) == 3) {
                            mzcq = rec.getValue(rec.columns[1]);
                        } else if (rec.getValue(rec.columns[1]) == 4) {
                            mdncq = rec.getValue(rec.columns[1]);
                        } else if (rec.getValue(rec.columns[1]) == 5) {
                            mxncq = rec.getValue(rec.columns[1]);
                        }
                        return true;
                    });
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_mxcqsl', value: mxcq })
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_mdcqsl', value: mdcq })
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_mzcqsl', value: mzcq })
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_mdncqsl', value: mdncq })
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_mxncqsl', value: mxncq })

                    //搜索最近一次备货计划
                    search.create({
                        type: 'customrecord_swc_demand_plan',
                        filters: [
                            { name: 'custrecord_swc_dp_store', operator: search.Operator.IS, values: store },
                            { name: 'custrecord_swc_dp_country', operator: search.Operator.IS, values: country },
                            { name: 'custrecord_swc_dp_location_type', operator: search.Operator.IS, values: locationType },
                            { name: 'custrecord_swc_dp_sku', operator: search.Operator.IS, values: sku },
                            { name: 'custrecord_swc_dp_batch', operator: search.Operator.IS, values: '1' }//常规备货
                        ],
                        columns: [
                            { name: 'internalid', sort: 'DESC' }
                        ]
                    }).run().each(function (rec) {
                        demandRec.setValue({ fieldId: 'custrecord_swc_sdp_demand_plan', value: rec.id })
                        return false;
                    });


                    //以下公式字段需要保存后再计算
                    // 资金占用
                    //修正3
                    //修正2
                    //计算修正2的时间
                    //PMC备注
                    // PMC 审批备货
                    // 理论PMC提前发货数量
                    // 实际PMC提前发货数量
                    var id = demandRec.save()
                    mapContext.write({
                        key: id,
                        value: { id: id }
                    })
                }
            } catch (error) {
                log.error('map error', error)
            }
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            try {
                var recId = reduceContext.key;
                var demandRec = record.load({ type: 'customrecord_swc_delivery_plan', id: recId });
                var sku = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_sku' });
                var country = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_country' });
                var locationType = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_location_type' });
                var store = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_store' });

                //获取系统日期格式配置
                var general_preferences = config.load({ type: config.Type.COMPANY_PREFERENCES });
                var dateFormat = general_preferences.getValue({ fieldId: 'DATEFORMAT' });
                log.debug('dateFormat', dateFormat);
                //本月月初时间
                const MonthStart = moment().add(16, 'hours').startOf('month').format(dateFormat);
                log.debug('MonthStart', MonthStart);
                const MonthEnd = moment().add(16, 'hours').endOf('month').format(dateFormat);
                log.debug('MonthEnd', MonthEnd);

                // 计算修正2: 相同SKU相同国家不同渠道的修正1总和
                var correction2 = 0;
                search.create({
                    type: 'customrecord_swc_delivery_plan',
                    filters: [
                        { name: 'custrecord_swc_sdp_applicant_date', operator: search.Operator.ONORAFTER, values: MonthStart },
                        { name: 'custrecord_swc_sdp_applicant_date', operator: search.Operator.ONORBEFORE, values: MonthEnd },
                        { name: 'custrecord_swc_sdp_country', operator: search.Operator.IS, values: country },
                        { name: 'custrecord_swc_sdp_sku', operator: search.Operator.IS, values: sku },
                        { name: 'custrecord_swc_sdp_batch', operator: search.Operator.IS, values: '1' }//常规备货
                    ],
                    columns: [
                        { name: 'custrecord_swc_sdp_correction1', summary: 'SUM' }
                    ]
                }).run().each(function (rec) {
                    correction2 = rec.getValue(rec.columns[0])
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_correction2', value: correction2 })
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_correction2_date', value: new Date() })
                    return false;
                });

                //修正3 
                // 1.修正1大于0且仓库为3PL时取修正1；
                // 2.否则修正2小于修正1则取修正2；
                // 3.否则修正1小于0且修正2大于0且仓库为3PL时取0；
                // 4.否则修正2大于修正1且修正1小于0且仓库为3PL时取修正2；
                // 5.否则修正1大于0且修正2小于0时取0，否则取修正1；
                // （修正1和修正2中绝对值较小者）
                // =IF(AND(修正1>0,H7="3PL"),修正1,
                // IF(AND(修正2<修正1,修正2>0),修正2,
                // IF(AND(修正1<0,修正2>0,H7="3PL"),0,
                // IF(AND(修正2>修正1,修正1<0,H7="3PL"),修正2,
                // IF(AND(修正1>0,修正2<0),0,修正1)))))
                var correction1 = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_correction1' });
                var correction3 = 0;
                if (correction1 > 0 && locationType == '1') {
                    correction3 = correction1;
                } else if (correction2 < correction1 && correction2 > 0) {
                    correction3 = correction2;
                } else if (correction1 < 0 && correction2 > 0 && locationType == '1') {
                    correction3 = 0;
                } else if (correction2 > correction1 && correction1 < 0 && locationType == '1') {
                    correction3 = correction2;
                } else if (correction1 > 0 && correction2 < 0) {
                    correction3 = correction1;
                } else {
                    correction3 = correction2;
                }
                demandRec.setValue({ fieldId: 'custrecord_swc_sdp_correction3', value: correction3 })

                //PMC 审批备货
                // 1、特殊修改则取特殊修改；
                // 2、修正3大于0小于10时取0；
                // 3、修正3大于0时取修正3，
                // 4.否则修正3小于0时修正3小于负在产量则取负在产量，否则取修正3
                var correction = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_special_modification' });//特殊修正
                var onOrderQty = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_onorder_quantity' });//在产量
                var quantity = 0;
                if (correction === '') {
                    if (correction3 > 0 && correction3 < 10) {
                        quantity = 0;
                    } else if (correction3 > 0) {
                        quantity = correction3;
                    } else if (correction3 < -onOrderQty) {
                        quantity = -onOrderQty;
                    } else {
                        quantity = correction3;
                    }
                } else {
                    quantity = correction;
                }
                demandRec.setValue({ fieldId: 'custrecord_swc_sdp_quantity', value: Math.round(quantity) })



                // 资金占用:PMC 审批备货数量*（采购成本+物流成本）
                if (Math.round(quantity) > 0) {
                    var cost = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_inventory_cost' });
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_funds', value: Math.round(quantity) * cost })
                } else {
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_funds', value: 0 })
                }

                // PMC备注
                // 1.PMC审批备货小于0: 暂缓·生产进度
                // 2.PMC审批备货等于0: 无需备货也不需要调整生产
                // 3.PMC审批备货大于0小于起订量: 审核需求小于起订量
                // 4.PMC审批备货大于0大于起订量: 审核需求满足起订量
                var minOrderQty = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_min_order_qty' });
                if (Math.round(quantity) < 0) {
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_pmc_memo', value: '暂缓·生产进度' })
                } else if (Math.round(quantity) == 0) {
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_pmc_memo', value: '无需备货也不需要调整生产' })
                } else if (Math.round(quantity) > 0 && Math.round(quantity) < minOrderQty) {
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_pmc_memo', value: '审核需求小于起订量' })
                } else if (Math.round(quantity) > 0 && Math.round(quantity) >= minOrderQty) {
                    demandRec.setValue({ fieldId: 'custrecord_swc_sdp_pmc_memo', value: '审核需求满足起订量' })
                }

                // 理论PMC提前发货数量
                // 1、PMC审批备货数量小于等于0时取0；
                // 2、否则新逻辑备货系数大于2.5时取新逻辑安全库存 * 1.5；
                // 3.否则：3PL仓：运营第一个月需求 / 2 + 第二、三月需求 + 新安全库存减去在库在途在产；非3PL仓：运营第四个月需求 / 2 + 第一、二、三月需求 + 新安全库存减去在库在途在产；
                var theoryEarlyQuantity = 0;
                var newRate = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_new_plan_rate' });
                var newSafeQty = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_new_logic_safe_stock' });
                var unit_m1 = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_forcast_m1' });
                var unit_m2 = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_forcast_m2' });
                var unit_m3 = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_forcast_m3' });
                var unit_m4 = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_forcast_m4' });
                var inventory = demandRec.getValue({ fieldId: 'custrecord_swc_sdp_inventory' });
                if (Math.round(quantity) <= 0) {
                    theoryEarlyQuantity = 0;
                } else if (newRate > 2.5) {
                    theoryEarlyQuantity = newSafeQty * 1.5;
                } else if (locationType == '1') {
                    theoryEarlyQuantity = unit_m1 / 2 + unit_m2 + unit_m3 + newSafeQty - inventory;
                } else {
                    theoryEarlyQuantity = unit_m1 + unit_m2 + unit_m3 + unit_m4 / 2 + newSafeQty - inventory;
                }
                demandRec.setValue({ fieldId: 'custrecord_swc_sdp_theory_early_quantity', value: theoryEarlyQuantity })

                // 实际PMC提前发货数量
                // PMC审批备货数量小于0或者理论PMC提前发货数量小于0时取0，否则取两者较小值
                var actualEarlyQuantity
                if (quantity < 0 || theoryEarlyQuantity < 0) {
                    actualEarlyQuantity = 0
                } else if (quantity > theoryEarlyQuantity) {
                    actualEarlyQuantity = theoryEarlyQuantity
                } else {
                    actualEarlyQuantity = quantity
                }
                demandRec.setValue({ fieldId: 'custrecord_swc_sdp_actual_early_quantity', value: Math.round(actualEarlyQuantity) })
                demandRec.save()
            } catch (error) {
                log.error('reduce error', error)
            }

        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {

        }

        /**
         * 根据美国各州对应分区汇总各分区数组，构建销售东单各区销量查询公式
         * @returns 
         */
        function getRegionCulumns() {
            var region_state_map = {
                '1': [],
                '2': [],
                '3': [],
                '4': [],
                '5': [],
                '6': [],
                '7': []
            }
            search.create({
                type: 'customrecord_swc_state_region_map',
                filters: [
                    { name: 'custrecord_swc_srm_region', operator: search.Operator.NONEOF, values: '@NONE@' }//分区不为空
                ],
                columns: [
                    { name: 'custrecord_swc_srm_state_short_name' },
                    { name: 'custrecord_swc_srm_region' }

                ]
            }).run().each(function (rec) {
                var region = rec.getValue('custrecord_swc_srm_region');
                var state = rec.getValue('custrecord_swc_srm_state_short_name');
                var tyempArray = region_state_map[region];
                tyempArray.push(state);
                region_state_map[region] = tyempArray;
                return true;
            });
            log.debug('region_state_map', region_state_map)
            var columns_items = [];//
            var columns_components = [];
            log.debug('Object.keys(region_state_map)', Object.keys(region_state_map))
            Object.keys(region_state_map).map(function (key) {
                log.debug('key', key)
                var states = region_state_map[key];
                log.debug('states', states)
                if (states.length > 0) {
                    var formula = "CASE WHEN {custbody_swc_salesorder_state} IN (";
                    for (var i = 0; i < states.length; i++) {
                        var _state = states[i];
                        formula = formula + "'" + _state + "'"
                        if (i < states.length - 1) {
                            formula = formula + ","
                        }
                    }
                    var formula_item = formula + ") THEN {quantity} ELSE 0 END"
                    var formula_component = formula + ") THEN {quantity}*{item.memberquantity} ELSE 0 END"
                    log.debug('formula' + i, formula_item)
                    columns_items.push({ name: 'formulanumeric', formula: formula_item, summary: 'SUM' })
                    columns_components.push({ name: 'formulanumeric', formula: formula_component, summary: 'SUM' })
                } else {
                    var formula = "CASE WHEN {custbody_swc_salesorder_state} IN ('---', '--') THEN {quantity} ELSE 0 END"
                    var formula_component = "CASE WHEN {custbody_swc_salesorder_state} IN ('---', '--') THEN {quantity}*{item.memberquantity} ELSE 0 END"
                    columns_items.push({ name: 'formulanumeric', formula: formula, summary: 'SUM' })
                    columns_components.push({ name: 'formulanumeric', formula: formula_component, summary: 'SUM' })
                }
                log.debug('columns_items', columns_items)
                log.debug('columns_components', columns_components)
            })
            var result = {
                columns_items: columns_items,
                columns_components: columns_components
            }
            log.debug('result', result)
            return result
        }

        /**
         * 通用非空判断
         * @param obj
         * @returns {boolean}
        */
        function isEmpty(v) {
            switch (typeof v) {
                case 'undefined':
                    return true;
                case 'string':
                    if (v.replace(/(^[ \t\n\r]*)|([ \t\n\r]*$)/g, '').length == 0)
                        return true;
                    break;
                case 'boolean':
                    if (v.toString() == '')
                        return true;
                    break;
                case 'number':
                    if (v == 0) {
                        return true;
                    } else {
                        return false;
                    }
                    break;
                case 'object':
                    if (null === v || v.length === 0)
                        return true;
                    for (var i in v) {
                        return false;
                    }
                    return true;
            }
            return false;
        }

        function getSKULevel(sku, country) {
            var levelObj = {
                level: 1,
                safeDate: 10,
                rate: 1
            };
            search.create({
                type: 'customrecord_swc_sku_level',
                filters: [
                    { name: 'custrecord_swc_sl_sku', operator: search.Operator.IS, values: sku },
                    { name: 'custrecord_swc_sl_country', operator: search.Operator.IS, values: country }
                ],
                columns: [
                    { name: 'custrecord_swc_sl_level' },
                    { name: 'custrecord_swc_sle_safe_date', join: 'custrecord_swc_sl_level' },
                    { name: 'custrecord_swc_sle_rate', join: 'custrecord_swc_sl_level' }

                ]
            }).run().each(function (rec) {
                levelObj = {
                    level: rec.getValue(rec.columns[0]),
                    safeDate: rec.getValue(rec.columns[1]),
                    rate: rec.getValue(rec.columns[2])
                }
                return false;
            });

            return levelObj
        }



        /**
         * 计算从第一个月第N天开始，往后leadTime天内的有效需求数
         * @param {number} startDay 起始天数（从第几天开始，从1开始计数）
         * @param {number} leadTime 备货提前期
         * @param {array} monthlyDemands 定义8个月的需求数量（每月固定28天）
         * @returns {number} 总需求数
         */
        function calculateDemandInPeriod(startDay, leadTime, monthlyDemands) {
            startDay = startDay * 1 + 1;
            if (startDay < 1) {
                startDay = 1
            }
            // if (startDay > 28) {
            //     startDay = 28
            // }
            // 参数校验
            // if (startDay < 1 || startDay > 28) {
            //     throw new Error("起始天数必须在1-28之间");
            // }

            let totalDemand = 0;
            let remainingDays = leadTime;
            let currentDay = startDay;
            let currentMonth = 0; // 从第1个月开始（索引0）

            // 遍历直到满足120天或超出8个月范围
            while (remainingDays > 0 && currentMonth < 8) {
                // 计算当前月剩余天数
                const daysInCurrentMonth = 28 - currentDay + 1;

                // 如果剩余天数大于当前月剩余天数
                if (remainingDays >= daysInCurrentMonth) {
                    if (daysInCurrentMonth < 0) {
                        //如果生效日小于0，则不取该月数据
                        currentMonth++;
                        currentDay = -daysInCurrentMonth; // 下个月从负数差异天数开始
                        continue;
                    }
                    // 计算当前月有效天数的需求
                    const effectiveDays = daysInCurrentMonth;
                    const dailyDemand = monthlyDemands[currentMonth] / 28;
                    totalDemand += dailyDemand * effectiveDays;

                    // 更新剩余天数并移动到下个月
                    remainingDays -= effectiveDays;
                    currentMonth++;
                    currentDay = 1; // 下个月从第1天开始
                } else {
                    // 剩余天数不足一个月，只计算部分天数
                    const dailyDemand = monthlyDemands[currentMonth] / 28;
                    totalDemand += dailyDemand * remainingDays;
                    break;
                }
            }

            return Math.round(totalDemand); // 取整
        }



        return { getInputData, map, reduce, summarize }

    });
