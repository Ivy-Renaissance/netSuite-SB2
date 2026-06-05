/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @description 每月底20号左右计算一遍从当前周周一开始连续24周或32周的销量预测
 */
define(['N/record', 'N/search', 'N/config', 'N/runtime', '../common/moment'],
    (record, search, config, runtime, moment) => {
        
        const getInputData = (inputContext) => {
            try {
                //搜索SKU关系表里面老品SKU的，店铺+SKU+国家+仓库类型维度计算
                var mySearch = search.create({
                    type: 'customrecord_swc_platform_sku_mapping',//SKU映射表
                    filters: [
                        { name: 'internalid', operator: search.Operator.ANYOF, values: ['6968','1032','6482'] },//给定测试条目 6482 '6968','1032','6482'
                        { name: 'custitem_swc_new_old', join: 'custrecord_swc_pt_sku_map_item', operator: search.Operator.IS, values: '2' }//产品是老品
                    ],
                    columns: [
                        { name: 'custrecord_swc_pt_sku_map_item' },//SKU
                        { name: 'custrecord_swc_pt_sku_map_store' },//店铺
                        { name: 'custrecord_swc_pt_sku_map_platformname' },//平台
                        { name: 'custrecord_swc_pt_sku_map_priority' },//priority
                        { name: 'custrecord_swc_pt_sku_map_asp' },//asp
                        { name: 'custrecord_swc_pt_sku_map_salesperson' },//运营
                        { name: 'displayname', join: 'custrecord_swc_pt_sku_map_item' },//sku 名称
                        { name: 'upccode', join: 'custrecord_swc_pt_sku_map_item' },//upc
                        { name: 'custitem_swc_yjlm', join: 'custrecord_swc_pt_sku_map_item' },//一级类目
                        { name: 'custitem_swc_ejlm', join: 'custrecord_swc_pt_sku_map_item' },//二级类目
                        { name: 'custitem_swc_sjlm', join: 'custrecord_swc_pt_sku_map_item' },//三级类目
                        { name: 'custitem_swc_cplb', join: 'custrecord_swc_pt_sku_map_item' },//产品类别
                        { name: 'custitem_swc_first_receipt_time', join: 'custrecord_swc_pt_sku_map_item' },//首次到仓时间
                        { name: 'custitem_swc_new_old', join: 'custrecord_swc_pt_sku_map_item' },//新老品
                        { name: 'custitem_swc_lifecycle', join: 'custrecord_swc_pt_sku_map_item' },// lifecycle
                        { name: 'custitem_swc_msrp', join: 'custrecord_swc_pt_sku_map_item' },//MSRP
                        { name: 'custitem_swc_map', join: 'custrecord_swc_pt_sku_map_item' },//MAP
                        { name: 'custitem_swc_liquidation_price', join: 'custrecord_swc_pt_sku_map_item' },//清仓价
                        { name: 'custitem_swc_liquidation', join: 'custrecord_swc_pt_sku_map_item' },//是否清仓
                        { name: 'type', join: 'custrecord_swc_pt_sku_map_item' }//是否清仓
                    ]
                });
                var pageData = mySearch.runPaged({
                    pageSize: 1000
                });
                var totalCount = pageData.count; //总数
                log.debug('totalCount', totalCount);
                var pageCount = pageData.pageRanges.length; //页数
                var results = [];
                for (var i = 0; i < pageCount; i++) {
                    pageData.fetch({
                        index: i
                    }).data.forEach(function (rec) {
                        results.push({
                            id: rec.id,
                            sku: rec.getValue('custrecord_swc_pt_sku_map_item'),
                            store: rec.getValue('custrecord_swc_pt_sku_map_store'),
                            platform: rec.getValue('custrecord_swc_pt_sku_map_platformname'),
                            priority: rec.getValue('custrecord_swc_pt_sku_map_priority'),
                            asp: rec.getValue('custrecord_swc_pt_sku_map_asp'),
                            salesperson: rec.getValue('custrecord_swc_pt_sku_map_salesperson'),
                            sku_name: rec.getValue({ name: 'displayname', join: 'custrecord_swc_pt_sku_map_item' }),
                            upc: rec.getValue({ name: 'upccode', join: 'custrecord_swc_pt_sku_map_item' }),
                            old: rec.getValue({ name: 'custitem_swc_new_old', join: 'custrecord_swc_pt_sku_map_item' }),
                            lifecycle: rec.getValue({ name: 'custitem_swc_lifecycle', join: 'custrecord_swc_pt_sku_map_item' }),
                            type: rec.getValue({ name: 'custitem_swc_cplb', join: 'custrecord_swc_pt_sku_map_item' }),
                            yjlm: rec.getValue({ name: 'custitem_swc_yjlm', join: 'custrecord_swc_pt_sku_map_item' }),
                            ejlm: rec.getValue({ name: 'custitem_swc_ejlm', join: 'custrecord_swc_pt_sku_map_item' }),
                            sjlm: rec.getValue({ name: 'custitem_swc_sjlm', join: 'custrecord_swc_pt_sku_map_item' }),
                            msrp: rec.getValue({ name: 'custitem_swc_msrp', join: 'custrecord_swc_pt_sku_map_item' }),
                            map: rec.getValue({ name: 'custitem_swc_map', join: 'custrecord_swc_pt_sku_map_item' }),
                            liquidation_price: rec.getValue({ name: 'custitem_swc_liquidation_price', join: 'custrecord_swc_pt_sku_map_item' }),
                            liquidation: rec.getValue({ name: 'custitem_swc_liquidation', join: 'custrecord_swc_pt_sku_map_item' }),
                            itemType: rec.getValue({ name: 'type', join: 'custrecord_swc_pt_sku_map_item' })
                        });
                        return true;
                    })
                }

                //搜索Amazon SKU映射表里面老品SKU的，店铺+SKU+国家+仓库类型维度计算
                var mySearch = search.create({
                    type: 'customrecord_swc_amazon_sku_mapping',//SKU映射表
                    filters: [
                        { name: 'internalid', operator: search.Operator.IS, values: '6482222222' },//给定测试条目
                        { name: 'custitem_swc_new_old', join: 'custrecord_swc_az_sku_map_item', operator: search.Operator.IS, values: '2' }//产品是老品
                    ],
                    columns: [
                        { name: 'custrecord_swc_az_sku_map_item' },//SKU
                        { name: 'custrecord_swc_az_sku_map_store' },//店铺
                        { name: 'custrecord_swc_az_sku_map_priority' },//priority
                        { name: 'custrecord_swc_az_sku_map_asp' },//asp
                        { name: 'custrecord_swc_az_sku_map_salesperson' },//运营
                        { name: 'displayname', join: 'custrecord_swc_az_sku_map_item' },//sku 名称
                        { name: 'upccode', join: 'custrecord_swc_az_sku_map_item' },//upc
                        { name: 'custitem_swc_yjlm', join: 'custrecord_swc_az_sku_map_item' },//一级类目
                        { name: 'custitem_swc_ejlm', join: 'custrecord_swc_az_sku_map_item' },//二级类目
                        { name: 'custitem_swc_sjlm', join: 'custrecord_swc_az_sku_map_item' },//三级类目
                        { name: 'custitem_swc_cplb', join: 'custrecord_swc_az_sku_map_item' },//产品类别
                        { name: 'custitem_swc_first_receipt_time', join: 'custrecord_swc_az_sku_map_item' },//首次到仓时间
                        { name: 'custitem_swc_new_old', join: 'custrecord_swc_az_sku_map_item' },//新老品
                        { name: 'custitem_swc_lifecycle', join: 'custrecord_swc_az_sku_map_item' },// lifecycle
                        { name: 'custitem_swc_msrp', join: 'custrecord_swc_az_sku_map_item' },//MSRP
                        { name: 'custitem_swc_map', join: 'custrecord_swc_az_sku_map_item' },//MAP
                        { name: 'custitem_swc_liquidation_price', join: 'custrecord_swc_az_sku_map_item' },//清仓价
                        { name: 'custitem_swc_liquidation', join: 'custrecord_swc_az_sku_map_item' },//是否清仓
                        { name: 'type', join: 'custrecord_swc_az_sku_map_item' }//是否清仓
                    ]
                });
                var pageData = mySearch.runPaged({
                    pageSize: 1000
                });
                var totalCount = pageData.count; //总数
                var pageCount = pageData.pageRanges.length; //页数
                for (var i = 0; i < pageCount; i++) {
                    pageData.fetch({
                        index: i
                    }).data.forEach(function (rec) {
                        results.push({
                            id: rec.id,
                            sku: rec.getValue('custrecord_swc_az_sku_map_item'),
                            store: rec.getValue('custrecord_swc_az_sku_map_store'),
                            priority: rec.getValue('custrecord_swc_az_sku_map_priority'),
                            asp: rec.getValue('custrecord_swc_az_sku_map_asp'),
                            salesperson: rec.getValue('custrecord_swc_az_sku_map_salesperson'),
                            sku_name: rec.getValue({ name: 'displayname', join: 'custrecord_swc_az_sku_map_item' }),
                            upc: rec.getValue({ name: 'upccode', join: 'custrecord_swc_az_sku_map_item' }),
                            old: rec.getValue({ name: 'custitem_swc_new_old', join: 'custrecord_swc_az_sku_map_item' }),
                            lifecycle: rec.getValue({ name: 'custitem_swc_lifecycle', join: 'custrecord_swc_az_sku_map_item' }),
                            type: rec.getValue({ name: 'custitem_swc_cplb', join: 'custrecord_swc_az_sku_map_item' }),
                            yjlm: rec.getValue({ name: 'custitem_swc_yjlm', join: 'custrecord_swc_az_sku_map_item' }),
                            ejlm: rec.getValue({ name: 'custitem_swc_ejlm', join: 'custrecord_swc_az_sku_map_item' }),
                            sjlm: rec.getValue({ name: 'custitem_swc_sjlm', join: 'custrecord_swc_az_sku_map_item' }),
                            msrp: rec.getValue({ name: 'custitem_swc_msrp', join: 'custrecord_swc_az_sku_map_item' }),
                            map: rec.getValue({ name: 'custitem_swc_map', join: 'custrecord_swc_az_sku_map_item' }),
                            liquidation_price: rec.getValue({ name: 'custitem_swc_liquidation_price', join: 'custrecord_swc_az_sku_map_item' }),
                            liquidation: rec.getValue({ name: 'custitem_swc_liquidation', join: 'custrecord_swc_az_sku_map_item' }),
                            itemType: rec.getValue({ name: 'type', join: 'custrecord_swc_az_sku_map_item' })
                        });
                        return true;
                    })
                }
                log.debug('results ', results)
                return results;
            } catch (error) {
                log.debug('getInputData error ', error)
            }
        }

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
                log.debug('locationTypes', locationTypes)
                //获取系统日期格式配置
                var general_preferences = config.load({ type: config.Type.COMPANY_PREFERENCES });
                var dateFormat = general_preferences.getValue({ fieldId: 'DATEFORMAT' });
                log.debug('dateFormat', dateFormat);
                
                // 🔥 关键修改：从"下个月初"改为"当前周周一"
                const currentMonday = moment().add(16, 'hours').locale('zh-cn').startOf('week').format(dateFormat);
                log.debug('currentMonday', currentMonday);
                log.debug('moment()', moment());
                
                // 计算去年同期的对应周一（52周前）
                const lastYearMonday = moment().add(16, 'hours').locale('zh-cn').startOf('week').subtract(52, 'weeks').format(dateFormat);
                log.debug('lastYearMonday', lastYearMonday);

                var totalMonths = runtime.getCurrentScript().getParameter('custscript_swc_sf_totalmonths');//计算总月份取配置值
                //下月初时间
                const MonthStart = moment().add(16, 'hours').startOf('month').add(1, 'months').format(dateFormat);
                log.debug('MonthStart', MonthStart);
                
                // 获取预测周数配置（24周或32周）
                var totalWeeks = totalMonths*4;
                log.debug('totalWeeks', totalWeeks);
                
                // 动态生成日期范围数组（替代原来的32个硬编码变量）
                const dateRanges = [];
                // 前4周 + 当前周 + 后totalWeeks周 = totalWeeks + 5 周的数据
                for (let i = -4; i <= totalWeeks; i++) {
                    const startDate = moment(lastYearMonday).add(i * 7, 'days').format(dateFormat);
                    const endDate = moment(lastYearMonday).add((i + 1) * 7, 'days').format(dateFormat);
                    dateRanges.push({ start: startDate, end: endDate });
                }
                
                //上季度（保持不变）
                const lastQuarter = getLastQuarter(dateFormat);
                log.debug('lastQuarter', lastQuarter);

                //当前时间
                const now = moment().add(16, 'hours').format(dateFormat);
                log.debug('now', now);
                //前四周
                const last4Week = moment().add(16, 'hours').subtract(28, 'days').format(dateFormat);
                //前一周
                const lastWeek = moment().add(16, 'hours').subtract(7, 'days').format(dateFormat);

                //SKU+仓库类型+国家遍历
                for (let index = 0; index < locationTypes.length; index++) {
                    var locationType = locationTypes[index];
                    log.debug('locationType' + index, locationType)

                    //先搜索该周的销售预测是否已经计算过
                    var forcastRec, exist = false;
                    search.create({
                        type: 'customrecord_swc_sales_forcast',
                        filters: [
                            { name: 'custrecord_swc_sf_year', operator: search.Operator.ONORAFTER, values: MonthStart },
                            { name: 'custrecord_swc_sf_store', operator: search.Operator.IS, values: store },
                            { name: 'custrecord_swc_sf_country', operator: search.Operator.IS, values: country },
                            { name: 'custrecord_swc_sf_location_type', operator: search.Operator.IS, values: locationType },
                            { name: 'custrecord_swc_sf_sku', operator: search.Operator.IS, values: sku }
                        ],
                        columns: [
                            { name: 'custrecord_swc_sf_sku' },
                        ]
                    }).run().each(function (rec) {
                        log.debug('已存在预测结果', rec)
                        exist = true;
                        forcastRec = record.load({ type: 'customrecord_swc_sales_forcast', id: rec.id });
                        return false;
                    });
                    if (!exist) {
                        forcastRec = record.create({ type: 'customrecord_swc_sales_forcast' });
                    }
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_store', value: store })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_country', value: country })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_location_type', value: locationType })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_saleperson', value: obj.salesperson })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_batch', value: 1 })
                    
                    forcastRec.setText({ fieldId: 'custrecord_swc_sf_year', text: MonthStart })
                    forcastRec.setText({ fieldId: 'custrecord_swc_sf_start_date', text: currentMonday }) // 🔥 修改为当前周周一
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_months', value: Math.ceil(totalWeeks / 4) }) // 转换为月数用于显示
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_weeks', value: totalWeeks }) // 新增周数字段
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_sku', value: sku })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_priority', value: obj.priority })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_sku_name', value: obj.sku_name })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_upc', value: obj.upc })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_old', value: obj.old })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_lifecycle', value: obj.lifecycle })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_type', value: obj.type })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_ejlm', value: obj.ejlm })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_sjlm', value: obj.sjlm })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_msrp', value: obj.msrp })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_map', value: obj.map })
                    forcastRec.setValue({ fieldId: 'custrecord_swc_sf_sap', value: obj.asp })

                    // 构建动态的销售订单搜索列
                    const salesColumns = [];
                    
                    // 添加每周的销量列（前4周到后totalWeeks周）
                    for (let i = 0; i < dateRanges.length; i++) {
                        salesColumns.push({
                            name: 'formulanumeric', 
                            formula: `case when {trandate} >= TO_DATE('${dateRanges[i].start}', '${dateFormat}') and {trandate} < TO_DATE('${dateRanges[i].end}', '${dateFormat}') then {quantity} else 0 end`, 
                            summary: 'SUM'
                        });
                    }
                    
                    // 添加上季度销量和销售额
                    salesColumns.push({
                        name: 'formulanumeric', 
                        formula: `case when {trandate} >= TO_DATE('${lastQuarter.start}', '${dateFormat}') and {trandate} <= TO_DATE('${lastQuarter.end}', '${dateFormat}') then {quantity} else 0 end`, 
                        summary: 'SUM'
                    });
                    salesColumns.push({
                        name: 'formulanumeric', 
                        formula: `case when {trandate} >= TO_DATE('${lastQuarter.start}', '${dateFormat}') and {trandate} <= TO_DATE('${lastQuarter.end}', '${dateFormat}') then {fxamount} else 0 end`, 
                        summary: 'SUM'
                    });
                    
                    // 添加前4周和前1周销量
                    salesColumns.push({
                        name: 'formulanumeric', 
                        formula: `case when {trandate} >= TO_DATE('${last4Week}', '${dateFormat}') and {trandate} < TO_DATE('${now}', '${dateFormat}') then {quantity} else 0 end`, 
                        summary: 'SUM'
                    });
                    salesColumns.push({
                        name: 'formulanumeric', 
                        formula: `case when {trandate} >= TO_DATE('${lastWeek}', '${dateFormat}') and {trandate} < TO_DATE('${now}', '${dateFormat}') then {quantity} else 0 end`, 
                        summary: 'SUM'
                    });
                    log.debug('salesColumns', salesColumns)
                    log.debug('filters', [
                            { name: 'mainline', operator: search.Operator.IS, values: false },
                            { name: 'taxline', operator: search.Operator.IS, values: false },
                            { name: 'shipping', operator: search.Operator.IS, values: false },
                            { name: 'item', operator: search.Operator.IS, values: sku },
                            { name: 'entity', operator: search.Operator.IS, values: store },
                            { name: 'custrecord_swc_location_type', join: 'location', operator: search.Operator.IS, values: locationType },
                            { name: 'trandate', operator: search.Operator.WITHIN, values: [dateRanges[0].start, MonthStart] }
                        ])

                    search.create({
                        type: 'salesorder',
                        filters: [
                            { name: 'mainline', operator: search.Operator.IS, values: false },
                            { name: 'taxline', operator: search.Operator.IS, values: false },
                            { name: 'shipping', operator: search.Operator.IS, values: false },
                            { name: 'item', operator: search.Operator.IS, values: sku },
                            { name: 'entity', operator: search.Operator.IS, values: store },
                            { name: 'custrecord_swc_location_type', join: 'location', operator: search.Operator.IS, values: locationType },
                            // 调整时间范围过滤器
                            { name: 'trandate', operator: search.Operator.WITHIN, values: [dateRanges[0].start, MonthStart] }
                        ],
                        columns: salesColumns
                    }).run().each(function (rec) {
                        log.debug('销售统计结果', rec)
                        
                        //前4周销量销量
                        var last4WeekUnit = rec.getValue(rec.columns[rec.columns.length - 2]); // 倒数第二列
                        var lastWeekUnit = rec.getValue(rec.columns[rec.columns.length - 1]); // 最后一列
                        var asp = 0;
                        var lastQuarterQty = rec.getValue(rec.columns[rec.columns.length - 4]); // 上季度销量
                        var lastQuarterAmt = rec.getValue(rec.columns[rec.columns.length - 3]); // 上季度销售额
                        
                        if (lastQuarterQty > 0) {
                            asp = lastQuarterAmt / lastQuarterQty;
                        }
                        log.debug('asp', asp)

                        //初始销量取前四周销量的平均值
                        var lastForcast = last4WeekUnit / 4;
                        log.debug('lastForcast', lastForcast)

                        //总预估数量、总预估金额；
                        var total_unit = 0;
                        var total_rev = 0;
                        
                        // 🔥 修改循环逻辑：现在是totalWeeks周，不是totalMonths*4周
                        for (let i = 0; i < totalWeeks; i++) {
                            // 第i周之前前四周销量和（使用动态索引）
                            var _b4W = (rec.getValue(rec.columns[i]) * 1 + 
                                      rec.getValue(rec.columns[i + 1]) * 1 + 
                                      rec.getValue(rec.columns[i + 2]) * 1 + 
                                      rec.getValue(rec.columns[i + 3]) * 1);
                            var _b1W = rec.getValue(rec.columns[i + 3]) * 1;

                            //第i周销量
                            var _nUnit = rec.getValue(rec.columns[i + 4]);
                            //第i周增长率rate
                            var rate = 1;

                            if (i == 0) {//第一周的增长率4周销量平均值，后续周的直接取本周与上周销量比
                                if (_b4W > 0) {
                                    rate = 4 * _nUnit / _b4W;
                                }
                            } else {
                                if (_b1W > 0) {
                                    rate = _nUnit / _b1W;
                                }
                            }

                            //如果增长率为0（历史该周销量为0），那么增长率设置为近期最新增长率，如果还为0，则设置为1；
                            if (rate == 0 && last4WeekUnit > 0) {
                                rate = 4 * lastWeekUnit / last4WeekUnit;
                            }
                            if (rate == 0) {
                                rate = 1;
                            }
                            // log.debug('_nUnit' + i, _nUnit);
                            // log.debug('_b4W' + i, _b4W);
                            // log.debug('_b1W' + i, _b1W);
                            // log.debug('rate' + i, rate);

                            //销售预测值等于前一周预测值*rate;
                            var forcast = Math.round(lastForcast * rate, 2);
                            //预测设置值
                            forcastRec.setValue({ fieldId: 'custrecord_swc_sf_total_unit_w' + (i + 1), value: forcast });
                            forcastRec.setValue({ fieldId: 'custrecord_swc_sf_total_rev_w' + (i + 1), value: forcast * asp });
                            if (!exist) {
                                forcastRec.setValue({ fieldId: 'custrecord_swc_sf_actual_unit_w' + (i + 1), value: forcast });
                                forcastRec.setValue({ fieldId: 'custrecord_swc_sf_actual_rev_w' + (i + 1), value: forcast * asp });
                            }
                            //更新前一周预测值
                            lastForcast = lastForcast * rate;
                            total_unit = total_unit + forcast;
                            total_rev = total_rev + forcast * asp;
                            log.debug('lastForcast' + i, lastForcast);
                        }

                        forcastRec.save();
                        return false;
                    });
                }

            } catch (error) {
                log.error("map error", error);
            }
        }

        const reduce = (reduceContext) => {
            // 可以在这里添加汇总逻辑（如果需要）
        }

        const summarize = (summaryContext) => {
            // 汇总统计信息
        }

        // 根据当前周周一为基准，计算上季度开始时间和结束时间
        function getLastQuarter (dateFormat) {
            const now = new Date();
            // 使用当前日期来确定季度
            const currentMonth = now.getMonth(); // 0-11, 0代表一月
            const currentYear = now.getFullYear();
            let lastQuarterStart, lastQuarterEnd;

            if (currentMonth >= 0 && currentMonth <= 2) { // 当前是Q1，上季度是去年的Q4
                lastQuarterStart = new Date(currentYear - 1, 9, 1);   // 10月1日
                lastQuarterEnd = new Date(currentYear - 1, 11, 31);   // 12月31日
            } else if (currentMonth >= 3 && currentMonth <= 5) { // 当前是Q2，上季度是Q1
                lastQuarterStart = new Date(currentYear, 0, 1);      // 1月1日
                lastQuarterEnd = new Date(currentYear, 2, 31);       // 3月31日
            } else if (currentMonth >= 6 && currentMonth <= 8) { // 当前是Q3，上季度是Q2
                lastQuarterStart = new Date(currentYear, 3, 1);      // 4月1日
                lastQuarterEnd = new Date(currentYear, 5, 30);       // 6月30日
            } else { // 当前是Q4，上季度是Q3
                lastQuarterStart = new Date(currentYear, 6, 1);      // 7月1日
                lastQuarterEnd = new Date(currentYear, 8, 30);       // 9月30日
            }

            return {
                start: moment(lastQuarterStart.toISOString()).format(dateFormat),
                end: moment(lastQuarterEnd.toISOString()).format(dateFormat)
            };
        }

        function calculateKitAvailability(itemId, type) {
            let componentQtys = {};
            if (type == 'Kit') {
                componentQtys = getKitComponents(itemId);
            } else {
                componentQtys[itemId] = 1;
            }

            log.debug('componentQtys', componentQtys);
            let componentItemIds = Object.keys(componentQtys);
            let kitAvailableQuantity = Number.MAX_SAFE_INTEGER;
            let kitAverageCost = 0;

            let inventoryBalanceSearch = search.create({
                type: search.Type.ITEM,
                filters: [
                    ['internalid', 'anyof', componentItemIds]
                ],
                columns: [
                    { name: 'internalid', summary: 'GROUP' },
                    { name: 'locationquantityavailable', summary: 'SUM' },
                    { name: 'locationquantityonhand', summary: 'SUM' },
                    { name: 'formulanumeric', formula: "{locationaveragecost}*{locationquantityonhand}", summary: 'SUM' }
                ]
            });

            inventoryBalanceSearch.run().each(function (result) {
                log.debug('inventoryBalanceSearch result', result);
                let componentItemId = result.getValue({ name: 'internalid', summary: 'GROUP' });
                let componentAvailableQty = parseFloat(result.getValue({ name: 'locationquantityonhand', summary: 'SUM' })) || 0;
                let componentCost = parseFloat(result.getValue(result.columns[3])) || 0;
                let componentAverageCost = componentAvailableQty > 0 ? Math.round(componentCost / componentAvailableQty, 2) : 0;
                let qtyNeededPerKit = componentQtys[componentItemId];

                let kitsSupportedByThisComponent = Math.floor(componentAvailableQty / qtyNeededPerKit);
                kitAvailableQuantity = Math.min(kitAvailableQuantity, kitsSupportedByThisComponent);
                kitAverageCost = kitAverageCost + componentAverageCost;

                return true;
            });

            if (kitAvailableQuantity === Number.MAX_SAFE_INTEGER) {
                kitAvailableQuantity = 0;
                kitAverageCost = 0;
            }

            return { "quantity": kitAvailableQuantity, "cost": kitAverageCost };
        }

        function getKitComponents(itemId) {
            let componentMap = {};
            search.create({
                type: 'item',
                filters: [
                    { name: 'internalid', operator: 'is', values: itemId }
                ],
                columns: [
                    { name: 'memberitem' },
                    { name: 'memberquantity' }
                ]
            }).run().each(function (rec) {
                componentMap[rec.getValue('memberitem')] = rec.getValue('memberquantity');
                return true;
            });
            return componentMap;
        }

        return { getInputData, map, reduce, summarize }
    });