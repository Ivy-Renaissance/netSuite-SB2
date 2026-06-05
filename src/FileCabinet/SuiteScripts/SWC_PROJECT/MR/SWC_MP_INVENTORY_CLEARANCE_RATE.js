/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @description 库存去化率
 */
define(['N/record', 'N/search', '../common/moment', 'N/config', 'N/format', "../common/SWC_Utils.js"],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search, moment, config, format, utils) => {
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
            // sku + 仓库类型 + 国家 维度获取数据
            let list = [];
            
            try {
                let skuData = [];
                // 查询内置货品表
                const oSearch = search.create({
                    type: 'item',
                    filters: [
                        // 货品类型为库存货品或者装配件
                        { name: 'type', operator: 'anyof', values: ['InvtPart', 'Assembly'] },
                        // 产品类别为主营产品
                        { name: 'custitem_swc_cplb', operator: 'is', values: '6' },
                        // 测试
                        { name: 'itemid', operator: 'is', values: '1110203010000008' }
                    ],
                    columns: [
                        { name: 'internalId' }, // 货品编号ID
                        { name: 'itemid' }, // 货品编号
                        { name: 'displayname' }, // 名称
                        { name: 'custitem_swc_cplb' }, // 产品类别
                        { name: 'custitem_swc_ejlm' }, // 二级类目
                        { name: 'custitem_swc_name_cn' }, // 中文名称
                        { name: 'custitem_swc_new_old' }, // 新老品
                        { name: 'custitem_swc_liquidation' }, // 是否清仓
                    ]
                });

                // 分页处理
                const pageData = oSearch.runPaged({
                    pageSize: 1000
                });

                const totalCount = pageData.count; //总数
                const pageCount = pageData.pageRanges.length; //页数
                log.debug('总数', totalCount);
                log.debug('页数', pageCount);

                for (let i = 0; i < pageCount; i++) {
                    if (skuData.length >= totalCount) {
                        break;
                    }
                    pageData.fetch({
                        index: i
                    }).data.forEach(function (rec) {
                        log.debug('rec', rec);
                        skuData.push({
                            internalId: rec.getValue(rec.columns[0]),
                            itemId: rec.getValue(rec.columns[1]),
                            displayname: rec.getValue(rec.columns[2]),
                            swc_cplb: rec.getValue(rec.columns[3]),
                            swc_ejlm: rec.getValue(rec.columns[4]),
                            swc_name_cn: rec.getValue(rec.columns[5]),
                            swc_new_old: rec.getValue(rec.columns[6]),
                            liquidation: rec.getValue(rec.columns[7]),
                        });
                        return true;
                    })
                };

                let newList = [];
                // 获取仓库类型
                const locationTypeList = getCustomListValues('customlist_swc_dp_location_type');
                log.debug(' locationTypeList ', locationTypeList);
                skuData.forEach((skuItem) => {
                    locationTypeList.forEach((lItem) => {
                        const obj = JSON.parse(JSON.stringify(skuItem));
                        obj['loction_type'] = lItem.id;
                        obj['loction_type_name'] = lItem.name;
                        newList.push(obj);
                    });
                });

                // 获取国家
                const countryList = getCustomListValues('customlist_swc_dp_country');
                log.debug(' countryList ', countryList);
                newList.forEach((newItem) => {
                    countryList.forEach((cItem) => {
                        const obj = JSON.parse(JSON.stringify(newItem));
                        obj['country'] = cItem.id;
                        obj['country_name'] = cItem.name;
                        list.push(obj);
                    });
                });

            } catch (e) {
                log.error('error ', e);
            }
            return list;
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
                const oMapData = JSON.parse(mapContext.value);
                log.debug('oMapData', oMapData);
                const internalId = oMapData.internalId; // 货品编码ID
                const displayname = oMapData.displayname; // sku code
                const country = oMapData.country; // 国家
                const countryName = oMapData.country_name;
                const locationType = oMapData.loction_type; // 仓库类型
                const locationTypeName = oMapData.loction_type_name;
                const swc_cplb = oMapData.swc_cplb; // 产品类别
                const swc_ejlm = oMapData.swc_ejlm; // 二级类目
                const swc_name_cn = oMapData.swc_name_cn;
                const swc_new_old = oMapData.swc_new_old;
                const liquidation = oMapData.liquidation; // 是否清仓
 
                // 获取系统日期格式
                const general_preferences = config.load({ type: config.Type.COMPANY_PREFERENCES });
                const dateFormat = general_preferences.getValue({ fieldId: 'DATEFORMAT' });
                // 时间
                const currentDate = moment().format(dateFormat);
                // 查询库存去化率表
                // let isExist = false;
                // let oRateRecord;

                // search.create({
                //     type: 'customrecord_swc_sku_status',
                //     filters: [
                //         { name: 'custrecord_swc_qh_country', operator: search.Operator.IS, values: country },
                //         { name: 'custrecord_swc_qh_location_type', operator: search.Operator.IS, values: locationType },
                //         { name: 'custrecord_swc_qh_sku', operator: search.Operator.IS, values: internalId }
                //     ],
                //     columns: [
                //         { name: 'custrecord_swc_qh_sku' },
                //     ]
                // }).run().each(function (rec) {
                //     log.debug('已存在记录', rec);
                //     isExist = true;
                //     oRateRecord = record.load({ type: 'customrecord_swc_sku_status', id: rec.id });
                //     return false;
                // });

                // if (!isExist) {
                //     oRateRecord = record.create({ type: 'customrecord_swc_sku_status' });
                // }
                let oRateRecord = record.create({ type: 'customrecord_swc_sku_status' });

                // 货品编码
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_sku', value: internalId });
                // sku
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_sku_code', value: displayname });
                // sku名称
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_sku_name', value: swc_name_cn });
                // 仓库属性
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_location_attribute', value: `${locationTypeName}-${countryName}` });
                // 仓库类型
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_location_type', value: locationType });
                // 国家
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_country', value: country });
                // 二级类目
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_ejlm', value: swc_ejlm });
                // 计算日期
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_count_date', value: format.parse({ value: currentDate, type: 'date' }) });
                // 新品或老品
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_new_old', value: swc_new_old });
                // 产品类型
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_sku_type', value: swc_cplb });

                // 在途
                const inTransitValue = getWareHouseTypeNumber(internalId, country, locationType, 'inTransit');
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_intransit', value: Math.round(inTransitValue) });
                log.debug('在途: ', inTransitValue);
                // 在库
                const inStockValue = getWareHouseTypeNumber(internalId, country, locationType, 'inStock');
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_in_stock', value: Math.round(inStockValue) });
                log.debug('在库: ', inStockValue);
                // 在产
                const inProductValue = getWareHouseTypeNumber(internalId, country, locationType, 'product');
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_in_production', value: Math.round(inProductValue) });
                log.debug('在产: ', inProductValue);
                // 库存全景 在途+在库+在产
                const inProductAndTransit = utils.addSumIsNumber(inTransitValue, inProductValue, 2);
                const inventoryTotalValue = utils.addSumIsNumber(inProductAndTransit, inStockValue, 2);
                log.debug('库存全景 四舍五入', Math.round(inventoryTotalValue));
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_inventory', value:  Math.round(inventoryTotalValue)});

                const byData = getFirstByDateAndQuantity(internalId, country, locationType);
                // 首批入库日期
                if (byData.date != '') {
                    log.debug('首批入库日期:', byData.date);
                    oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_by_date', value: format.parse({ value: byData.date, type: 'date' }) });
                }
                // 首批入库
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_first_stocked', value: byData.quantity });
                // 标准销量 
                const standardSales = getStandardSales(180, internalId, country, locationType, dateFormat);
                log.debug('+ standardSales +', standardSales);
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_standard_sales', value: standardSales });
                // 15天日销
                const fiftenDaysSales = getStandardSales(15, internalId, country, locationType, dateFormat);
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_fifteen_day_sales', value: fiftenDaysSales });
                // 取数的日销
                const daysSales = getDaysSales(standardSales, fiftenDaysSales);
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_day_sales', value: daysSales });
                // 增长率
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_growth_rate', value: getGrowthRate(standardSales, fiftenDaysSales) });

                // 当月在途
                const currentmonthIntransit = getCurrentMonthQuantity(internalId, country, locationType);
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_currentmonth_intransit', value: Math.round(currentmonthIntransit) });
                // 当月在产
                const currentmonthInprod = getWareHouseTypeNumber(internalId, country, locationType, 'monthProduct');
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_currentmonth_inprod', value: Math.round(currentmonthInprod) });

                // 在库可售天数 
                // 取值公式：在库数量/取数的日销
                let instockSellableDays = 0;
                if (daysSales === 0) {
                    instockSellableDays = 0;
                } else {
                    instockSellableDays = Math.round(utils.divSumIsNumber(inStockValue, daysSales, 2));
                }
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_instock_sellable_days', value: instockSellableDays });
                // 在库消耗完成日期 
                // 取值公式：在库可售天数 + 当前日期
                const finishDate = moment().add(Number(instockSellableDays), 'days').format(dateFormat)
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_instock_finish_date', value: format.parse({ value: finishDate, type: 'date' }) });
                
                // 在库+当月在途消耗完成天数
                // 取值公式: （在库+当月在途数量）/取数的日销
                let transitDays = 0;
                if (Number(daysSales) === 0) {
                    transitDays = 0;
                } else {
                    transitDays = Math.round(utils.divSumIsNumber(utils.addSumIsNumber(inStockValue, currentmonthIntransit, 2), daysSales, 2));
                }
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_instock_transit_days', value: transitDays });

                // 在库+当月在途消耗完成日期
                // 取值公式: （在库+当月在途消耗完成天数）+（报表生成日期）
                const transitDate = moment().add(transitDays, 'days').format(dateFormat);
                log.debug('transitDate', transitDate);
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_instock_transit_date', value: format.parse({ value: transitDate, type: 'date' }) });

                // 全链路可售天数 
                // 取值公式: 库存全景/取消的日销
                const linkSellableDays = daysSales == 0 ? 0 : Math.round(inventoryTotalValue/daysSales);
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_link_sellable_days', value: linkSellableDays });
                // 全链路消耗完成日期
                // 取值公式: 全链路可售天数+当前时间
                const linkUseDate = moment().add(Number(linkSellableDays), 'days').format(dateFormat);
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_link_use_finish_date', value: format.parse({ value: linkUseDate, type: 'date' }) });
                
                // 在库首批-断货天数
                // 取值公式：在库消耗完成日期 - 首批入库日期
                const instockFirstBatch = getFirstBatchDays(finishDate, byData.date);
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_instock_first_batch', value: Math.round(instockFirstBatch) });
                
                // 查询时效表
                const planTimesData = getPlanTimes(internalId, country, locationType);
                // 产品等级
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_sku_level', value: planTimesData.skuLevel });
                // 安全天数
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_safety_days', value: planTimesData.safetyTime });
                // 是否考核已断货
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_is_assessment_sold_out', value: planTimesData.isOutOfStock });
                // BY仓首批
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_by_warehouse_first', value: planTimesData.byFirstBatch });
                // 备货抵达天数
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_stock_arrival_days', value: planTimesData.planArrivedDays });
                // 在库目标周转
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_instock_target_rotate', value: planTimesData.instockTargetRotate });
                // 全链路目标周转
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_link_target_rotate', value: planTimesData.linkTargetRotate });

                // 下次备货抵达日期 逻辑: 默认为每月8号+备货抵达天数
                const { year, month } = utils.getTodayDate();
                const arriveDays = planTimesData.planArrivedDays || 0;
                const lastDate = moment(`${year}-${month}-08`).add(arriveDays, 'days').format(dateFormat)
                log.debug('lastDate', lastDate);
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_nextstock_arrival_date', value: format.parse({ value: lastDate, type: 'date' }) });
                // 全链路下次备货
                // 取值公式: 全链路消耗完成日期 - 下次备货抵达日期
                const linkNextStockDays = moment(linkUseDate).diff(moment(lastDate), 'days');
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_link_next_stock_days', value: linkNextStockDays });

                // 库存状态
                const oParams = {
                    liquidation, 
                    byFirstBatch: planTimesData.byFirstBatch, 
                    inventoryTotalValue, 
                    standardSales, 
                    fiftenDaysSales, 
                    inTransitValue,
                    inProductValue, 
                    sellableDays: instockSellableDays, 
                    safetyTime: planTimesData.safetyTime, 
                    instockTransitDays: transitDays, 
                    instockTargetRotate: planTimesData.instockTargetRotate, 
                    instockFirstBatch,
                    linkStockDays: linkNextStockDays, 
                    linkSellableDays, 
                    linkTargetRotate: planTimesData.linkTargetRotate,
                }
                const status = getInvertoryStatus(oParams);
                log.debug('库存状态', status);
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_inventory_status', value: status });
                // 上周-库存状态
                const lastweekStatus = getLastWeekStatus(internalId, country, locationType, dateFormat);
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_lastweek_inventory_s', value: lastweekStatus });

                // 日销控制数量
                const daysParams = {
                    status,
                    inStockValue,
                    instockTargetRotate: planTimesData.instockTargetRotate,
                    inventoryTotalValue,
                    linkTargetRotate: planTimesData.linkTargetRotate
                }
                const daysalesControlQty = getDaySalesControlQty(daysParams);
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_daysales_control_qty', value: daysalesControlQty });
                // 日销差异
                let differenceValue;
                if (fiftenDaysSales > 0 && daysalesControlQty > 0) {
                    differenceValue = utils.subSumIsNumber(daysalesControlQty, fiftenDaysSales, 2);
                } else {
                    differenceValue = '';
                }
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_daysales_difference', value: differenceValue });
                // 控制方向
                const controlDirection = getControlDirection(differenceValue, status);
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_control_direction', value: controlDirection });
                const results = getCompareStatusAndMeasure(status, lastweekStatus, internalId, country, locationType)
                // 两周-状态对比
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_two_week_status_comp', value: results.compareStatus });
                // 两周-管控措施
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_two_week_measure', value: results.measure });
                const datas = getCompareStatusAndMeasure(status, lastweekStatus, internalId, country, locationType, 'four')
                // 四周-状态对比
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_four_week_status_comp', value: datas.fourCompareStatus });
                // 四周-管控措施
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_four_week_measure', value: datas.fourMeasure });

                // 转状态
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_change_status', value: liquidation ? '转清货' : '' });
                // 3PL超期库存
                log.debug('+ locationType +', locationType);
                if (Number(locationType) === 1) {
                    oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_3pl_overdue_inventory', value: getTransactionQuantity(internalId, country, locationType) });
                }
                // CG超期库存
                if (Number(locationType) === 3) {
                    // oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_cg_overdue_inventory', value: getTransactionQuantity(internalId, country, locationType) });
                }

                const oStandSalesData = getDemandPlanStandardSales(internalId, country, locationType, dateFormat);
                log.debug('oStandSalesData', oStandSalesData);
                // 标准销量-Shopify
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_standard_sales_shopify', value: oStandSalesData.shopifyValue });
                // 标准销量-Home Depot
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_standard_sales_hd', value: oStandSalesData.homeDepotValue });
                // 标准销量-Amazon
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_standard_sales_amazon', value: oStandSalesData.amazonValue });
                // 标准销量-Lowe's
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_standard_sales_lowes', value: oStandSalesData.lowesValue });
                // 标准销量-Amazon_VC
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_standard_sales_amazonv', value: oStandSalesData.amazonVcValue });
                // 标准销量-Wayfair
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_standard_sales_wayfair', value: oStandSalesData.wayfairValue });
                // 标准销量-TEMU
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_standard_sales_temu', value: oStandSalesData.temuValue });
                // 标准销量-Rona
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_standard_sales_rona', value: oStandSalesData.ronaValue });
                // 标准销量-Mano
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_standard_sales_mano', value: oStandSalesData.manomanoValue });
                // 标准销量-LeroyMerlin
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_standard_sales_leroy', value: oStandSalesData.leroyMerlinValue });
                // 标准销量-Walmart
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_standard_sales_walmart', value: oStandSalesData.walmartValue });
                // 标准销量-Amazon_FR
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_standard_sales_fr', value: oStandSalesData.amazonFrValue });
                // 标准销量-整体
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_standard_sales_total', value: oStandSalesData.total });

                const oActualSalesData = getActualSales(internalId, country, locationType, dateFormat);
                log.debug('oActualSalesData', oActualSalesData);
                // 实际销量(15天)-Shopify
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_actual_sales_shopify', value: oActualSalesData.shopifyValue });
                // 实际销量(15天)-Home Depot
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_actual_sales_hd', value: oActualSalesData.homeDepotValue });
                // 实际销量(15天)-Amazon
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_actual_sales_amazon', value: oActualSalesData.amazonValue });
                // 实际销量(15天)-Lowe's
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_actual_sales_lowes', value: oActualSalesData.lowesValue });
                // 实际销量(15天)-Amazon_VC
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_actual_sales_vc', value: oActualSalesData.amazonVcValue });
                // 实际销量(15天)-Wayfair
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_actual_sales_wayfair', value: oActualSalesData.wayfairValue });
                // 实际销量(15天)-TEMU
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_actual_sales_temu', value: oActualSalesData.temuValue });
                // 实际销量(15天)-Rona
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_actual_sales_rona', value: oActualSalesData.ronaValue });
                // 实际销量(15天)-Mano
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_actual_sales_mano', value: oActualSalesData.manomanoValue });
                // 实际销量(15天)-LeroyMerlin
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_actual_sales_leroy', value: oActualSalesData.leroyMerlinValue });
                // 实际销量(15天)-Walmart
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_actual_sales_walmart', value: oActualSalesData.walmartValue });
                // 实际销量(15天)-Amazon_FR
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_actual_sales_fr', value: oActualSalesData.amazonFrValue });
                // 实际销量(15天)-整体
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_actual_sales_total', value: oActualSalesData.total });

                // 日销达成度-整体
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_day_sales_total', value: getDailySalesValue(oStandSalesData.total, oActualSalesData.total) });
                // 日销达成度-Shopify
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_daily_sales_shopify', value: getDailySalesValue(oStandSalesData.shopifyValue, oActualSalesData.shopifyValue) });
                // 日销达成度-Home Depot
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_daily_sales_hd', value: getDailySalesValue(oStandSalesData.homeDepotValue, oActualSalesData.homeDepotValue) });
                // 日销达成度-Amazon
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_daily_sales_amazon', value: getDailySalesValue(oStandSalesData.amazonValue, oActualSalesData.amazonValue) });
                // 日销达成度-Lowe's
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_daily_sales_lowes', value: getDailySalesValue(oStandSalesData.lowesValue, oActualSalesData.lowesValue) });
                // 日销达成度-Amazon_VC
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_daily_sales_vc', value: getDailySalesValue(oStandSalesData.amazonVcValue, oActualSalesData.amazonVcValue) });
                // 日销达成度-Wayfair
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_daily_sales_wayfair', value: getDailySalesValue(oStandSalesData.wayfairValue, oActualSalesData.wayfairValue) });
                // 日销达成度-TEMU
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_daily_sales_temu', value: getDailySalesValue(oStandSalesData.temuValue, oActualSalesData.temuValue) });
                // 日销达成度-Rona
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_daily_sales_rona', value: getDailySalesValue(oStandSalesData.ronaValue, oActualSalesData.ronaValue) });
                // 日销达成度-Mano
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_daily_sales_mano', value: getDailySalesValue(oStandSalesData.manomanoValue, oActualSalesData.manomanoValue) });
                // 日销达成度-LeroyMerlin
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_daily_sales_leroy', value: getDailySalesValue(oStandSalesData.leroyMerlinValue, oActualSalesData.leroyMerlinValue) });
                // 日销达成度-Walmart
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_daily_sales_walmart', value: getDailySalesValue(oStandSalesData.walmartValue, oActualSalesData.walmartValue) });
                // 日销达成度-Amazon_FR
                oRateRecord.setValue({ fieldId: 'custrecord_swc_qh_daily_sales_amazon_fr', value: getDailySalesValue(oStandSalesData.amazonFrValue, oActualSalesData.amazonFrValue) });
                
                
                if (Math.round(inventoryTotalValue) > 0) {
                    log.debug('record 写入成功', );
                    oRateRecord.save();
                }
            } catch (error) {
                log.error('map error', error);
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

        /**获取上周库存状态**/
        const getLastWeekStatus = (internalId, country, locationType, dateFormat) => {
            const startDate = moment().subtract(1, 'weeks').startOf('isoWeek').format(dateFormat);
            const endDate = moment().subtract(1, 'weeks').endOf('isoWeek').format(dateFormat);

            let status = '';
            search.create({
                type: 'customrecord_swc_sku_status',
                filters: [
                    { name: 'custrecord_swc_qh_country', operator: search.Operator.IS, values: country },
                    { name: 'custrecord_swc_qh_location_type', operator: search.Operator.IS, values: locationType },
                    { name: 'custrecord_swc_qh_sku', operator: search.Operator.IS, values: internalId },
                    // 日期范围 上周
                    { name: 'custrecord_swc_qh_count_date', operator: 'onorafter', values: startDate },
                    { name: 'custrecord_swc_qh_count_date', operator: "onorbefore", values: endDate }
                ],
                columns: [
                    { name: 'custrecord_swc_qh_inventory_status' },
                ]
            }).run().each(function (rec) {
                status = rec.getValue(rec.columns[0]);
                log.debug('查询到上周库存状态:', status);
                return false;
            });
            log.debug('上周库存状态:', status);
            return status;
        }

        /**
         * 获取两周、四周，状态对比，管控措施
         * 
         * @param type 两周或四周
         * @param status 本周状态
         * @param lastweekStatus 上周状态
         * @param internalId - 货品编码id
         * @param country 国家id
         * @param locationType 仓库类型id
         * 
         * @return compareStatus 状态对比
         * @return measure 措施
         * 
         * **/
        const getCompareStatusAndMeasure = (status, lastweekStatus, internalId, country, locationType, type = 'two') => {
            const matchArr = ['积压库存正常', '积压库存已断货', '积压库存在库-断货风险', '积压库存在产-断货风险', 
                '积压库存全链路-断货风险', '正常已断货', '在库-断货风险积压库存', '在库-断货风险已断货', '在产-断货风险积压库存', '在产-断货风险已断货',
                '全链路-断货风险积压库存', '全链路-断货风险已断货', '已断货积压库存', '已断货正常', '无标准销量已断货', '首批备货已断货'
            ]
            const statusTextArr = ['', '转清仓', '首批备货', '无标准销量', '已断货', '在库-断货风险', '在产-断货风险', '全链路-断货风险', '风险库存', '积压库存', '正常'];

            let obj = {
                compareStatus: '',
                measure: '',
                fourCompareStatus: '',
                fourMeasure: '',
            }

            // 两周
            if (status != '' && lastweekStatus != '' && type === 'two') {
                const text = `${statusTextArr[Number(lastweekStatus)]}${statusTextArr[Number(status)]}`
                if (matchArr.includes(text)) {
                    if (text === '积压库存正常') {
                        obj = {
                            compareStatus: '积压转正常',
                            measure: '如有降价，可调回原价',
                        }
                    }
                    if (text === '积压库存已断货' || text === '正常已断货' || text === '在库-断货风险已断货' || 
                        text === '在产-断货风险已断货' || text === '全链路-断货风险已断货' || text === '无标准销量已断货' || text === '首批备货已断货') {
                        obj = {
                            compareStatus: '新增-已断货',
                            measure: '追踪在产在途',
                        }
                    }
                    if (text === '积压库存在库-断货风险' || text === '积压库存在产-断货风险' || text === '积压库存全链路-断货风险') {
                        obj = {
                            compareStatus: '新增-断货风险',
                            measure: '减少日销，补充备货',
                        }
                    }
                    if (text === '在库-断货风险积压库存') {
                        obj = {
                            compareStatus: '新增-积压库存',
                            measure: '增加日销，加快消耗',
                        }
                    }
                    if (text === '在库-断货风险积压库存' || text === '在产-断货风险积压库存' || text === '全链路-断货风险积压库存') {
                        obj = {
                            compareStatus: '新增-积压库存',
                            measure: '增加日销，加快消耗',
                        }
                    }
                    if (text === '已断货积压库存') {
                        obj = {
                            compareStatus: '已断货转积压',
                            measure: '增加日销，加快消耗',
                        }
                    }
                    if (text === '已断货正常') {
                        obj = {
                            compareStatus: '已断货转正常',
                            measure: '如有提价，可调回原价',
                        }
                    }
                }                
            }

            // 四周
            if (status != '' && lastweekStatus != '' && type === 'four') {
                let oneStatus;
                let twoStatus;
                const oneStartDate = moment().subtract(2, 'weeks').startOf('isoWeek').format(dateFormat);
                const oneEndDate = moment().subtract(2, 'weeks').endOf('isoWeek').format(dateFormat);
                const twoStartDate = moment().subtract(3, 'weeks').startOf('isoWeek').format(dateFormat);
                const twoEndDate = moment().subtract(3, 'weeks').endOf('isoWeek').format(dateFormat);

                let oneFilters = [
                    { name: 'custrecord_swc_qh_country', operator: search.Operator.IS, values: country },
                    { name: 'custrecord_swc_qh_location_type', operator: search.Operator.IS, values: locationType },
                    { name: 'custrecord_swc_qh_sku', operator: search.Operator.IS, values: internalId },
                    // 日期范围
                    { name: 'custrecord_swc_qh_count_date', operator: 'onorafter', values: oneStartDate },
                    { name: 'custrecord_swc_qh_count_date', operator: "onorbefore", values: oneEndDate }
                ];
                let twoFilters = [
                    { name: 'custrecord_swc_qh_country', operator: search.Operator.IS, values: country },
                    { name: 'custrecord_swc_qh_location_type', operator: search.Operator.IS, values: locationType },
                    { name: 'custrecord_swc_qh_sku', operator: search.Operator.IS, values: internalId },
                    // 日期范围
                    { name: 'custrecord_swc_qh_count_date', operator: 'onorafter', values: twoStartDate },
                    { name: 'custrecord_swc_qh_count_date', operator: "onorbefore", values: twoEndDate }
                ];

                // 第一周
                search.create({
                    type: 'customrecord_swc_sku_status',
                    filters: oneFilters,
                    columns: [
                        { name: 'custrecord_swc_qh_inventory_status' },
                    ]
                }).run().each(function (rec) {
                    oneStatus = rec.getValue(rec.columns[0]);
                    log.debug('查询到第一周库存状态:', status);
                    return false;
                });
                // 第二周
                search.create({
                    type: 'customrecord_swc_sku_status',
                    filters: twoFilters,
                    columns: [
                        { name: 'custrecord_swc_qh_inventory_status' },
                    ]
                }).run().each(function (rec) {
                    twoStatus = rec.getValue(rec.columns[0]);
                    log.debug('查询到第二周库存状态:', status);
                    return false;
                });
                if (Number(status) === 9 && Number(lastweekStatus) === 9 && Number(twoStatus) === 9 && Number(oneStatus) === 9) {
                    obj = {
                        fourCompareStatus: '严重积压',
                        fourMeasure: '暂停一个月备货',
                    }
                }
                if (Number(status) === 4 && Number(lastweekStatus) === 4 && Number(twoStatus) === 4 && Number(oneStatus) === 4) {
                    obj = {
                        fourCompareStatus: '严重断货',
                        fourMeasure: '追查断货原因',
                    }
                }
                if (Number(status) === 8 && Number(lastweekStatus) === 8 && Number(twoStatus) === 8 && Number(oneStatus) === 8) {
                    obj = {
                        fourCompareStatus: '连续风险',
                        fourMeasure: '重点关注',
                    }
                }
            }
            log.debug('两周四周:', obj);
            return obj;
        } 

        /**
         * 获取在库首批-断货天数
         * @param finishDate 在库消耗完成日期
         * @param firstBatchDate 首批入库日期
         * **/ 
        const getFirstBatchDays = (finishDate, firstBatchDate) => {
            if (finishDate == '') {
                return moment(finishDate).diff(moment(), 'days');;
            }
            if (finishDate != '' && firstBatchDate != '') {
                return moment(finishDate).diff(moment(firstBatchDate), 'days');
            }
            return '';
        }

        /**
         * 获取控制方向
         * @param differenceValue 日销差异
         * @param status 库存状态
         * **/ 
        const getControlDirection = (differenceValue, status) => {
            if (differenceValue == '') {
                return '';
            }
            if (differenceValue != '' && differenceValue > 0 && Number(status) === 9) {
                return '增加日销'
            }
            return '减少日销';
        }

        /**
         * 获取日销控制数量
         * @param status 库存状态
         * @description 5 在库-断货风险 计算逻辑 在库/在库目标周转
         * @description 6、7 在产-断货风险或全链接断货风险 计算逻辑 库存全景/全链接目标周转
         * 
         * **/ 
        const getDaySalesControlQty = (params) => {
            const {
                status, inStockValue, instockTargetRotate,
                inventoryTotalValue, linkTargetRotate
            } = params;
            switch(Number(status)) {
                case 5:
                    return instockTargetRotate == 0 ? 0 : utils.divSumIsNumber(inStockValue, instockTargetRotate, 2);
                case 6:
                case 7:
                case 9:
                    return linkTargetRotate == 0 ? 0 : utils.divSumIsNumber(inventoryTotalValue, linkTargetRotate, 2);
            }
            return '';
        }


        /**
         * 获取时效表中 
         * 安全天数、是否考核已断货、BY仓首批，备货抵达天数
         * 在库目标周转、全链路目标周转
         * **/ 
        const getPlanTimes = (internalId, countryId, locationTypeId) => {
            const oData = {
                skuLevel: '',
                safetyTime: '',
                isOutOfStock: '',
                byFirstBatch: '',
                planArrivedDays: '',
                instockTargetRotate: 0,
                linkTargetRotate: 0,
            }
            search.create({
                type: 'customrecord_swc_plan_times',
                filters: [
                    { name: 'custrecord_swc_spt_sku', operator: search.Operator.IS, values: internalId },
                    { name: 'custrecord_swc_spt_location_type', operator: search.Operator.IS, values: locationTypeId },
                    { name: 'custrecord_swc_spt_country', operator: search.Operator.IS, values: countryId }
                ],
                columns: [
                    // 安全天数
                    { name: 'custrecord_swc_spt_safety_time' },
                    // 是否考核已断货
                    { name: 'custrecord_swc_spt_is_out_of_stock' },
                    // by仓首批
                    { name: 'custrecord_swc_spt_is_by_first_bacth' },
                    // 备货抵达天数
                    { name: 'custrecord_swc_spt_plan_arrived_tiem' },
                    // 在库目标周转
                    { name: 'custrecord_swc_spt_on_target_turnover' },
                    // 全链路-目标周转
                    { name: 'custrecord_swc_spt_all_target_turnover' },
                    // 等级
                    { name: 'custrecord_swc_spt_level' }
                ]
            }).run().each(function (rec) {
                log.debug('时效表中已存在记录', rec)
                oData.safetyTime = rec.getValue(rec.columns[0]);
                oData.isOutOfStock = rec.getValue(rec.columns[1]) ? 'Y' : 'N';
                oData.byFirstBatch = rec.getValue(rec.columns[2]) ? 'Y' : 'N';
                oData.planArrivedDays = rec.getValue(rec.columns[3]);
                oData.instockTargetRotate = rec.getValue(rec.columns[4]);
                oData.linkTargetRotate = rec.getValue(rec.columns[5]);
                oData.skuLevel = rec.getValue(rec.columns[6]);
                return false;
            });
            return oData;
        }

        /**
         * 获取增长率
         * 逻辑：
         * 1. 标准销量为0 且 15天日销 > 0 返回 100%
         * 2. else 标准销量 > 0 且 15天日销为0 返回 -100%
         * 3. else （15天日销-标准销量）/ 标准销量
         * @param standardSales 标准销量
         * @param fiftenDaysSales 日销
         * 
         **/ 
        const getGrowthRate = (standardSales, fiftenDaysSales) => {
            if (Number(standardSales) === 0 && Number(fiftenDaysSales) > 0) {
                return '100%'; 
            }
            if (Number(standardSales) > 0 && Number(fiftenDaysSales) === 0) {
                return '-100%'; 
            }
            if (Number(standardSales) === 0) {
                return '0%'; 
            }
            const values = utils.divSumIsNumber(utils.subSumIsNumber(fiftenDaysSales, standardSales, 2), standardSales, 2);
            return `${values}%`;
        }

        /**
         * 获取3PL或CG超期库龄
         * @description 库龄天数计算：当前日期-入库日期
         * @description 逻辑: 根据库龄天数
         * 1. 浴室柜 库龄天数 超过150天算超期，取批号数量
         * 2. 其他类目 库龄天数 超过120天算超期，取批号数量
         * 
         * **/ 
        const getTransactionQuantity = (internalId, countryId, locationTypeId) => {
            const oSearch = search.create({
                type: 'transaction',
                filters: [
                    { name: 'type', operator: 'anyof', values: ['ItemRcpt', 'ItemShip', 'BinTrnfr', 'InvAdjst', 'InvTrnfr'] },
                    { name: 'serialnumber', operator: 'isnotempty', values: '' },
                    { name: 'item', operator: 'anyof', values: internalId },
                    { name: 'custrecord_swc_location_type', join: 'location', operator: 'anyof', values: locationTypeId },// 仓库类型
                    { name: 'custrecord_swc_location_country', join: 'location', operator: 'anyof', values: countryId },// 国家
                ],
                columns: [
                    search.createColumn({
                        name: "serialnumber",
                        summary: "GROUP",
                        label: "事务处理序列号/批号"
                    }),
                    search.createColumn({
                        name: "custrecord_swc_location_type",
                        join: "location",
                        summary: "GROUP",
                        label: "仓库类型"
                    }),
                    search.createColumn({
                        name: "item",
                        summary: "GROUP",
                        label: "货品"
                    }),
                    search.createColumn({
                        name: "custitem_swc_ejlm",
                        join: "item",
                        summary: "GROUP",
                        label: "二级类目"
                    }),
                    search.createColumn({
                        name: "serialnumberquantity",
                        summary: "SUM",
                        label: "总数"
                    }),
                    search.createColumn({
                        name: "formulanumeric",
                        summary: "MAX",
                        formula: " CEIL({today}-{trandate})",
                        label: "库龄天数"
                    }),
                ]
            });
            const pageData = oSearch.runPaged({
                pageSize: 1000
            });
            // const totalCount = pageData.count; //总数
            const pageCount = pageData.pageRanges.length; //页数

            let quantity = 0;
            for (let i = 0; i < pageCount; i++) {
                pageData.fetch({
                    index: i
                }).data.forEach(function (rec) {
                    const ejlmId = rec.getValue(rec.columns[3]);
                    log.debug('ejlmId:', ejlmId);
                    // 批号数量
                    const serialnumberquantity = rec.getValue(rec.columns[4]); 
                    // 库龄天数
                    const inventoryDays = rec.getValue(rec.columns[5]);
                    quantity = utils.addSumIsNumber(serialnumberquantity, quantity);
                    // 二级类目
                    const ejlm = rec.getText(rec.columns[3]);
                    log.debug('ejlm:', ejlm);
                    // 浴室柜
                    const name = 'Bathroom Vanities'.toLocaleLowerCase();
                    if (String(ejlm).toLocaleLowerCase() === name && inventoryDays > 150) {
                        quantity = utils.addSumIsNumber(serialnumberquantity, quantity);
                    } else {
                        if (inventoryDays > 120) {
                            quantity = utils.addSumIsNumber(serialnumberquantity, quantity);
                        }
                    }
                    return true;
                })
            }
            log.debug('+ getTransactionQuantity +', quantity);
            return quantity;
        }

        /**
         * 日销逻辑
         * @params standSales 标准销量
         * @params actualSales 实际销量(15天)
         * @description 1. 标准销量 与 实际销量（15天）都为0 返回 无备货无销售
         * @description 2. 标准销量为0 且 实际销量（15天）>0 返回 无备货有销售
         * @description 3. 标准销量>0 且 实际销量（15天）> 0 且 实际销量（15天）< 80, 返回不达标
         * @description 4. 标准销量>0 且 实际销量（15天）> 0 且 80 < 实际销量（15天）< 120, 返回 预估无偏差
         * @description 5. 标准销量>0 且 实际销量（15天）> 0 且 实际销量（15天）> 120, 返回 超120%
         * **/ 
        const getDailySalesValue = (standSales, actualSales) => {
            let texts = '';
            if (standSales == 0 && actualSales == 0) {
                texts = '无备货无销售';
            } else if (standSales == 0 && actualSales > 0) {
                texts = '无备货有销售';
            } else if (standSales > 0 && actualSales >= 0 && actualSales < 80) {
                texts = '不达标';
            } else if (standSales > 0 && (actualSales > 80 && actualSales < 120)) {
                texts = '预估无偏差';
            } else if (standSales > 0 && actualSales > 120) {
                texts = '超120%';
            } else {
                texts = '';
            }
            return texts;
        }

        /**
         * 实际销量(15天 日销量)
         * 计算逻辑：平台+仓库+国家为维度获取最近15天销量数据，计算出平均值，将平均值四舍五入保留两位小数
         * 
         * **/
        const getActualSales = (internalId, countryId, locationTypeId, dateFormat) => {
            const lastSixMonthStart = moment().startOf('month').subtract(14, 'days').format(dateFormat);
            const currentDate = moment().format(dateFormat);

            // 查询销售订单
            const oSearch = search.create({
                type: "salesorder",
                filters: [
                    { name: 'mainline', operator: search.Operator.IS, values: false },
                    { name: 'type', operator: 'anyof', values: 'SalesOrd' },
                    { name: 'shipping', operator: 'is', values: false },
                    { name: 'taxline', operator: search.Operator.IS, values: false },
                    // 货品编码
                    { name: 'item', operator: 'is', values: internalId },
                    // { name: 'item', operator: 'is', values: '10086' },
                    // 仓库类型
                    { name: 'custentity_swc_location_type', join: 'customer', operator: 'anyof', values: locationTypeId },
                    // 国家
                    { name: 'custentity_swc_country', join: 'customer', operator: 'anyof', values: countryId },
                    // 日期范围 15日
                    { name: 'trandate', operator: 'onorafter', values: lastSixMonthStart },
                    { name: 'trandate', operator: "onorbefore", values: currentDate }
                ],
                columns: [
                    search.createColumn({
                        name: "item",
                        summary: "GROUP",
                        label: "货品"
                    }),
                    search.createColumn({
                        name: "internalid",
                        join: "customer",
                        summary: "GROUP",
                        label: "内部 ID"
                    }),
                    search.createColumn({
                        name: "quantity",
                        summary: "SUM",
                        label: "数量"
                    })
                ]
            });
            
            const pageData = oSearch.runPaged({
                pageSize: 1000
            });
            const totalCount = pageData.count; //总数
            const pageCount = pageData.pageRanges.length; //页数

            const results = [];
            for (let i = 0; i < pageCount; i++) {
                if (results.length >= totalCount) {
                    break;
                }
                pageData.fetch({
                    index: i
                }).data.forEach(function (rec) {
                    log.debug('店铺storeID:', rec.getValue(rec.columns[1]));
                    results.push({
                        sku: rec.getValue(rec.columns[0]),
                        storeId: rec.getValue(rec.columns[1]),
                        quantity: rec.getValue(rec.columns[2]),
                    });
                    return true;
                })
            }
            return getComputedPlatformValue(results, 2);
        }

        /**
         * 获取标准销量
         * 
         * @description 公式逻辑：根据上月的备货计划，以平台+仓库+国家为维度获取6/8 个月的备货总数除以180/240天，将平均值四舍五入保留两位小数，如果值为0，则标准销量也为0
         * 
         * **/ 
        const getDemandPlanStandardSales = (internalId, countryId, locationTypeId, dateFormat) => {
            const lastSixMonthStart = moment().startOf('month').subtract(1, 'months').format(dateFormat);
            const currentDate = moment().format(dateFormat);
            
            // 查询备货计划
            const oSearch = search.create({
                type: "customrecord_swc_demand_plan",
                filters: [
                    // 货品编码ID
                    { name: 'custrecord_swc_dp_sku', operator: 'is', values: internalId },
                    // 仓库类型
                    { name: 'custrecord_swc_dp_location_type', operator: 'is', values: locationTypeId },
                    // 国家
                    { name: 'custrecord_swc_dp_country', operator: 'is', values: countryId },
                    // 创建日期
                    { name: 'created', operator: 'onorafter', values: lastSixMonthStart },
                    { name: 'created', operator: "onorbefore", values: currentDate }
                ],
                columns: [
                    // sku
                    { name: 'custrecord_swc_dp_sku', summary: 'GROUP' }, 
                    // 店铺
                    { name: 'custrecord_swc_dp_store', summary: 'GROUP' },
                    // 备货总月份
                    { name: 'custrecord_swc_dp_months', summary: 'GROUP' },
                    // 总需求
                    { name: 'custrecord_swc_dp_forcast_total', summary: 'SUM' },
                ]
            });
            const pageData = oSearch.runPaged({
                pageSize: 1000
            });
            const totalCount = pageData.count; //总数
            const pageCount = pageData.pageRanges.length; //页数

            const results = [];
            for (let i = 0; i < pageCount; i++) {
                if (results.length >= totalCount) {
                    break;
                }
                pageData.fetch({
                    index: i
                }).data.forEach(function (rec) {
                    results.push({
                        sku: rec.getValue(rec.columns[0]),
                        storeId: rec.getValue(rec.columns[1]),
                        months: rec.getValue(rec.columns[2]),
                        total: rec.getValue(rec.columns[3]),
                    });
                    return true;
                })
            }

            return getComputedPlatformValue(results, 1);
        }

        /**
         * @param type 1:标准销量 2:实际销量 3:日销
         * 
         * **/ 
        const getComputedPlatformValue = (results, type) => {
            const oData = {
                amazonValue: 0,
                wayfairValue: 0,
                homeDepotValue: 0,
                lowesValue: 0,
                manomanoValue: 0,
                leroyMerlinValue: 0,
                ronaValue: 0,
                shopifyValue: 0,
                walmartValue: 0,
                amazonVcValue : 0,
                temuValue:  0,
                amazonFrValue: 0,
                total: 0,
            }

            // 存在多个店铺
            results.forEach(item => {
                const storeId = item.storeId;
                log.debug('查询到的店铺id:', storeId);
                const quantity = item.quantity;
                const months = item.months;
                const total = item.total;
                let currentValue;
                
                // 根据店铺ID, 查询客户表，获取所在平台
                let platformId;
                search.create({
                    type: 'customer',
                    filters: [
                        { name: 'internalid', operator: search.Operator.IS, values: storeId }
                    ],
                    columns: [
                        { name: 'custentity_swc_platform' }, // 所属平台
                    ]
                }).run().each(function (rec) {
                    // 已找到店铺
                    log.debug('查询到店铺所属平台id:', rec.getValue(rec.columns[0]));
                    platformId = rec.getValue(rec.columns[0]);
                    return false;
                });

                if (type === 1) {
                    currentValue = utils.divSumIsNumber(total, Number(months) * 30, 2)
                } else if (type === 2) {
                    currentValue = utils.divSumIsNumber(quantity, 15, 2)
                }
    
                // 1: Amazon
                if (Number(platformId) === 1) {
                    oData.amazonValue = currentValue;
                }
                // 2: Wayfair
                if (Number(platformId) === 2) {
                    oData.wayfairValue = currentValue;
                }
                // 3: Home Depot
                if (Number(platformId) === 3) {
                    oData.homeDepotValue = currentValue;
                }
                // 4: Lowe‘s
                if (Number(platformId) === 4) {
                    oData.lowesValue = currentValue;
                }
                // 5: Manomano
                if (Number(platformId) === 5) {
                    oData.manomanoValue = currentValue;
                }
                // 7: Leroy Merlin
                if (Number(platformId) === 7) {
                    oData.leroyMerlinValue = currentValue;
                }
                // 8: Rona
                if (Number(platformId) === 8) {
                    oData.ronaValue = currentValue;
                }
                // 9: Shopify
                if (Number(platformId) === 9) {
                    oData.shopifyValue = currentValue;
                }
                // 10: Walmart
                if (Number(platformId) === 10) {
                    oData.walmartValue = currentValue;
                }
                // 14: Temu
                if (Number(platformId) === 14) {
                    oData.temuValue = currentValue;
                }
                // 21: amazonVc
                if (Number(platformId) === 21) {
                    oData.amazonVcValue = currentValue;
                }
                // 24: amazonFr
                if (Number(platformId) === 24) {
                    oData.amazonFrValue = currentValue;
                }
            });

            // 平台不为0，四舍五入保留两个小数

            let totalValue = 0;
            let len = 0;
            Object.keys(oData).forEach(key => {
                if (key !== 'total' && oData[key] != 0) {
                    totalValue = utils.addSumIsNumber(totalValue, oData[key], 2);
                    len++;
                }
            })
            oData.total = len != 0 ? utils.divSumIsNumber(totalValue, len, 2) : 0;
            log.debug('++ oData ++', oData);
            return oData;
        }

        /**
         * @description 返回 取数的日销
         * **/ 
        const getDaysSales = (standardSales, fiftenDaysSales) => {
            let quantity = 0;
            if (Number(standardSales) === 0 && Number(fiftenDaysSales) === 0) {
                quantity = 0; 
            } else if (Number(standardSales) === 0 && Number(fiftenDaysSales) !== 0) {
                quantity = fiftenDaysSales; 
            } else if (Number(standardSales) !== 0 && Number(fiftenDaysSales) === 0) {
                quantity = standardSales; 
            } else {
                // 按3:7比例分配
                quantity = utils.addSumIsNumber(utils.mulSumIsNumber(standardSales, 0.3, 2), utils.mulSumIsNumber(fiftenDaysSales, 0.7, 2), 2);
            }
            return quantity;
        }

        /**
         * @days 180: 标准销量 15: 15天日销
         * @param internalId - 货品编码id
         * @param countryId 国家id
         * @param locationTypeId 仓库类型id
         * @dateFormat 日期格式
         * @description 获取该仓库类型，国家，SKU的销量
         * **/ 
        const getStandardSales = (days, internalId, countryId, locationTypeId, dateFormat) => {
            let quantity = 0;
            let lastSixMonthStart;
            const currentDate = moment().format(dateFormat);

            // 标准销量
            if (days === 180) {
                lastSixMonthStart = moment().startOf('month').subtract(6, 'months').format(dateFormat);
            }
            // 15天日销
            if (days === 15) {
                lastSixMonthStart = moment().startOf('month').subtract(14, 'days').format(dateFormat);
            }

            search.create({
                type: "salesorder",
                filters: [
                    { name: 'mainline', operator: search.Operator.IS, values: false },
                    { name: 'type', operator: 'anyof', values: 'SalesOrd' },
                    { name: 'shipping', operator: 'is', values: false },
                    { name: 'taxline', operator: search.Operator.IS, values: false },
                    // 仓库类型
                    { name: 'custentity_swc_location_type', join: 'customer', operator: 'anyof', values: locationTypeId },
                    // 国家
                    { name: 'custentity_swc_country', join: 'customer', operator: 'anyof', values: countryId },
                    { name: 'item', operator: 'anyof', values: internalId },
                    { name: 'trandate', operator: 'onorafter', values: lastSixMonthStart },
                    { name: 'trandate', operator: "onorbefore", values: currentDate }
                ],
                columns: [
                    // 货品
                    { name: 'item', summary: 'GROUP' }, 
                    // 数量
                    { name: 'quantity', summary: 'SUM' },
                ]
            }).run().each(function(rec) {
                log.debug('标准销量数量: ', rec.getValue(rec.columns[1]));
                quantity = rec.getValue(rec.columns[1]);
                return false;
            });
            if (quantity != 0) {
                return utils.divSumIsNumber(quantity, days, 2);
            }
            return quantity;
        }

        /**
         * 获取(当月)首批入库数量及首批入库日期
         * @param internalId - 货品编码id
         * @param countryId 国家id
         * @param locationTypeId 仓库类型id
         * @description 查询物流发运明细记录
         * 
         * **/ 
        const getFirstByDateAndQuantity = (internalId, countryId, locationTypeId) => {
            log.debug('首批入库及日期参数 货品编码id', internalId)

            const result = {
                date: '',
                quantity: 0
            }
            const oDate = getCurrentMonthRangeFormatted();
            
            // 查询物流发运明细
            search.create({
                type: 'customrecord_swc_wl_plan_detail',
                filters: [
                    { name: 'custrecord_swc_estimated_time_of_arrival', join: 'custrecord_swc_wl_plan_order_id', operator: 'within', values: [oDate.firstDay, oDate.lastDay] },
                    // 货品编码Id
                    { name: 'custrecord_swc_wl_d_sku', operator: search.Operator.IS, values: internalId },
                    // 国家
                    { name: 'custrecord_swc_wl_d_country', operator: search.Operator.IS, values: countryId },
                    // 仓库类型
                    { name: 'custrecord_swc_wl_d_location_type', operator: search.Operator.IS, values: locationTypeId }
                ],
                columns: [
                    { name: 'custrecord_swc_estimated_time_of_arrival', join: 'custrecord_swc_wl_plan_order_id', summary: 'GROUP', sort: search.Sort.ASC },
                    { name: 'custrecord_swc_wl_d_superior_qty_z', summary: 'SUM' }, // 真实发运优等品数量
                    { name: 'custrecord_swc_wl_d_good_qty_z', summary: 'SUM' }, // 真实发运良品数量
                    { name: 'formulanumeric', formula: "NVL({custrecord_swc_wl_d_superior_qty_z},0)+NVL({custrecord_swc_wl_d_good_qty_z},0)", summary: 'SUM' } // 合计
                ]
            }).run().each(function(rec) {
                log.debug('+ 物流发运明细 + ', rec)
                result.date = rec.getValue(rec.columns[0])
                result.quantity = rec.getValue(rec.columns[3]);
                return false;
            })
            return result;
        }

        const getCurrentMonthQuantity = (internalId, countryId, locationTypeId) => {
            let quantity = 0;
            const oDate = getCurrentMonthRangeFormatted();
            
            // 查询物流发运明细
            search.create({
                type: 'customrecord_swc_wl_plan_detail',
                filters: [
                    { name: 'custrecord_swc_estimated_time_of_arrival', join: 'custrecord_swc_wl_plan_order_id', operator: 'within', values: [oDate.firstDay, oDate.lastDay] },
                    // 货品编码Id
                    { name: 'custrecord_swc_wl_d_sku', operator: search.Operator.IS, values: internalId },
                    // 国家
                    { name: 'custrecord_swc_wl_d_country', operator: search.Operator.IS, values: countryId },
                    // 仓库类型
                    { name: 'custrecord_swc_wl_d_location_type', operator: search.Operator.IS, values: locationTypeId }
                ],
                columns: [
                    { name: 'custrecord_swc_wl_d_superior_qty_z', summary: 'SUM' }, // 真实发运优等品数量
                    { name: 'custrecord_swc_wl_d_good_qty_z', summary: 'SUM' }, // 真实发运良品数量
                    { name: 'formulanumeric', formula: "NVL({custrecord_swc_wl_d_superior_qty_z},0)+NVL({custrecord_swc_wl_d_good_qty_z},0)", summary: 'SUM' } // 合计
                ]
            }).run().each(function(rec) {
                log.debug('在途数量：', rec)
                quantity += rec.getValue(rec.columns[2]);
                return true;
            });
            log.debug('+ 当月在途数量合计：', quantity);
            return quantity;
        }

        /**
         * 获取当前日期第一天和最后一天日期
         * **/
        const getCurrentMonthRangeFormatted = () => {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const padZero = (n) => n.toString().padStart(2, '0');
            
            // 第一天
            const firstDay = `${year}-${padZero(month + 1)}-01`;
            
            // 最后一天
            const lastDayDate = new Date(year, month + 1, 0);
            const lastDay = `${year}-${padZero(month + 1)}-${padZero(lastDayDate.getDate())}`;
            
            return { firstDay, lastDay };
        }

        /**
         * 获取库存数量 在库，在途，在产 数量
         * @param internalId - 货品编码id
         * @param countryId 国家id
         * @param locationTypeId 仓库类型id
         * @description 根据关联字段 inventorylocation 查找地点表字段
         * **/ 
        const getWareHouseTypeNumber = (internalId, countryId, locationTypeId, type) => {
            let numbers;

            // 2 国内在途仓 3 国内海外在途仓 4 海外国内在途仓 5 海外国外在途仓 10 平台在途仓 11: 保税仓
            const intransitIds = ['2', '3', '4', '5', '10', '11'];
            // 6: 海外仓 7: 平台仓
            const inStockIds = ['6', '7'];
            // 在途、在库 
            if (type === 'inTransit' || type === 'inStock') {
                const ids = type === 'inTransit' ? intransitIds : inStockIds;
                search.create({
                    type: search.Type.ITEM,
                    filters: [
                        { name: 'internalid', operator: search.Operator.IS, values: internalId },
                        // 仓库属性
                        { name: 'custrecord_swc_location_attribute', join: 'inventorylocation', operator: 'anyof', values: ids },
                        // 国家
                        { name: 'custrecord_swc_location_country', join: 'inventorylocation', operator: search.Operator.IS, values: countryId },
                        // 仓库类型
                        { name: 'custrecord_swc_location_type', join: 'inventorylocation', operator: search.Operator.IS, values: locationTypeId }
                    ],
                    columns: [
                        { name: 'locationquantityonhand', summary: 'SUM' }, // 在手数量
                    ]
                }).run().each(function(rec) {
                    numbers = rec.getValue(rec.columns[0]);
                    log.debug('在途或在库结果:', numbers)
                    return false
                })
            }

            // 在产 或者 当月在产
            if (type === 'product' || type === 'monthProduct') {
                let filterArr = [
                    { name: 'mainline', operator: search.Operator.IS, values: false },
                    { name: 'taxline', operator: search.Operator.IS, values: false },
                    { name: 'shipping', operator: search.Operator.IS, values: false },
                    // 成品SKU (货品)
                    { name: 'custcol_swc_pr_origin_sku', operator: search.Operator.IS, values: internalId },
                    // 主要部件
                    { name: 'custcol_swc_pr_main_sku', operator: search.Operator.IS, values: true },
                    // 国家
                    { name: 'custcol_swc_country_code', operator: search.Operator.IS, values: countryId },
                    // 仓库类型
                    { name: 'custcol_swc_loc_type', operator: search.Operator.IS, values: locationTypeId }
                ];
                let columnsArr = [
                    { name: 'quantity', summary: 'SUM' }, // 数量
                    { name: 'quantityshiprecv', summary: 'SUM' }, // 已收货数量
                    { name: 'formulanumeric', formula: "{quantity}-{quantityshiprecv}", summary: 'SUM' } // 未回货数量
                ]
                // 当月在产
                if (type === 'monthProduct') {
                    const oDate = getCurrentMonthRangeFormatted();
                    filterArr.push({ name: 'trandate', operator: 'within', values: [oDate.firstDay, oDate.lastDay] })
                    // 月份汇总
                    columnsArr.push({ name: 'formulatext', formula: "TO_CHAR({trandate}, 'YYYY-MM')", summary: 'GROUP' });
                }

                // 查询采购订单，未收货
                search.create({
                    type: search.Type.PURCHASE_ORDER,
                    filters: filterArr,
                    columns: columnsArr,
                }).run().each(function (rec) {
                    numbers = Math.round(rec.getValue(rec.columns[2]));
                    log.debug('在产 或者 当月在产结果: ', numbers)
                    return false;
                });
            }
            return numbers || 0;
        }

        /**
         * 获取库存状态
         * @param params.liquidation 是否转清仓
         * @param params.inventoryTotalValue 库存全景
         * @param params.byFirstBatch by仓首批
         * @param params.standardSales 标准销量
         * @param params.fiftenDaysSales 15天日销
         * @param params.sellableDays 在库可售天数
         * @param params.inTransitValue 库存全景-在途
         * @param params.inProductValue 库存全景-在产
         * @param params.safetyTime 安全天数
         * @param params.instockTargetRotate 在库目标周转
         * @param params.instockTransitDays 在库+当月在途消耗完成天数
         * @param params.instockFirstBatch 在库首批-断货天数
         * @param params.linkStockDays 全链路下次备货
         * @param params.linkSellableDays 全链路可售天数
         * @param params.linkTargetRotate 全链路目标周转
         * 
         * @description 枚举值说明 1:转清仓 2:首批备货 3:无标准销量 4:已断货 5:在库-断货风险 
         * 6:在产-断货风险 7:全链路-断货风险 8:风险库存 9:积压库存 10:正常
         * 
         * 逻辑：
         * 1. 判断是否转清仓 true 返回 1
         * 2. else 判断是否为 首批备货 根据 by仓首批为Y 且 库存全景 大于 0 返回 首批备货
         * 3. else 标准销量 与 15天日销 的和 等于 0 返回 无标准销量
         * 4. 库存全景等于0 返回 无标准销量
         * 5. 在库可售天数 <= 0 && 在途与在产的和 >= 0 返回 已断货
         * 6. (在库可售天数 < 安全天数 || 在库+当月在途消耗完成天数 < 在库目标周转) 
         *    且 在库首批-断货天数 < -3 返回 在库-断货风险
         * 7. 全链路下次备货 < -7 且 在产数量为0 返回 在产-断货风险
         * 8. 全链路下次备货 < -7 返回 全链路-断货风险 
         * 9. (在库可售天数 > 在库目标周转 || 在库+当月在途消耗完成天数 > 在库目标周转) 
         *    且 全链路可售天数 > 全链路目标周转 返回 风险库存
         * 10. ((在库可售天数 - 在库目标周转) > 30 || (在库+当月在途消耗完成天数 - 在库目标周转) > 30) 
         *     且 (全链路可售天数 - 全链路目标周转) > 30 返回 积压库存
         * 11. 都不满足，返回 正常
         * **/ 
        const getInvertoryStatus = (params) => {
            const {
                liquidation, byFirstBatch, inventoryTotalValue, standardSales, fiftenDaysSales, inTransitValue,
                inProductValue, sellableDays, safetyTime, instockTransitDays, instockTargetRotate, instockFirstBatch,
                linkStockDays, linkSellableDays, linkTargetRotate,
            } = params;
            if (liquidation) {
                return '1';
            }
            if (byFirstBatch == 'Y' && inventoryTotalValue > 0) {
                return '2';
            }
            const values = utils.addSumIsNumber(standardSales, fiftenDaysSales); 
            if (values == 0 || inventoryTotalValue == 0) {
                return '3';
            }
            const inTotal = utils.addSumIsNumber(inTransitValue, inProductValue);
            if (sellableDays <= 0 && inTotal >= 0) {
                return '4';
            }
            if ((sellableDays < safetyTime || instockTransitDays < instockTargetRotate) && instockFirstBatch < -3) {
                return '5';
            }
            if (linkStockDays < -7 && inProductValue == 0) {
                return '6';
            }
            if (linkStockDays < -7 ) {
                return '7';
            }
            if ((sellableDays > instockTargetRotate || instockTransitDays > instockTargetRotate) && linkSellableDays > linkTargetRotate) {
                return '8';
            }
            const rotateDays = utils.subSumIsNumber(sellableDays, instockTargetRotate);
            const oDays = utils.subSumIsNumber(instockTransitDays, instockTargetRotate);
            const oDays1 = utils.subSumIsNumber(linkSellableDays, linkTargetRotate);
            if ((rotateDays > 30 || oDays > 30) && oDays1 > 30) {
                return '9';
            }
            return '10';
        }

        /**
         * 获取自定义列表  
         * 
         * @param {String} type 
         * @description 添加filters 由于NS脏数据，后续删除此逻辑
        */ 
        const getCustomListValues = (type) => {
            let list = [];
            let filters = [];
            // 仓库类型
            if (type === 'customlist_swc_dp_location_type') {
                filters = ['3PL', 'FBA', 'CG', 'Mano'];
            }
            // 国家
            if (type === 'customlist_swc_dp_country') {
                filters = ['US', 'CA', 'DE', 'UK', 'FR'];
            }
            search.create({
                type: type,
                filters: [],
                columns: ['internalid', 'name']
            }).run().each(function(rec) {
                const name = rec.getValue('name');
                if (filters.includes(name)) {
                    list.push({
                        id:  rec.id,
                        name: name,
                    })
                }
                return true;
            });
            return list;
        }

        return {
            getInputData, 
            map, 
            reduce, 
            summarize,
            getActualSales,
            getDemandPlanStandardSales,
            getComputedPlatformValue,
            getDaysSales,
            getStandardSales,
            getFirstByDateAndQuantity,
            getWareHouseTypeNumber,
            getInvertoryStatus,
            getCustomListValues,
            getCurrentMonthRangeFormatted,
            getDaySalesControlQty,
        }

    });
