/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @description 备货计划人工导入或者修改特殊修改字段时要触发脚本自动计算其他信息
 */
define(['N/search'],
    /**
 * @param{search} search
 */
    (search) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

            log.debug('scriptContext', scriptContext)
            log.debug('scriptContext.type', scriptContext.type)
            var demandRec = scriptContext.newRecord;
            if (scriptContext.type == 'create') {
                var country = demandRec.getValue('custrecord_swc_dp_country');//国家编码
                var store = demandRec.getValue('custrecord_swc_dp_store');//平台（店铺）
                var locationType = demandRec.getValue('custrecord_swc_dp_location_type');//仓库类型
                var sku = demandRec.getValue('custrecord_swc_dp_sku');
                var level = getSKULevel(sku, country);
                if (level) {
                    demandRec.setValue({ fieldId: 'custrecord_swc_dp_sku_level', value: level.level })//产品等级  
                }
                // demandRec.setValue({ fieldId: 'custrecord_swc_dp_months', value: 6 })//预测的总月份，默认6个月，可配置8个月
                var first3MUnits = 0; //前三个月需求
                var forcast_effective = 0; //运营周期内有效需求
                //开始搜索销售预测数量
                var unit_m1 = demandRec.getValue('custrecord_swc_dp_forcast_m1');//第1月需求
                var unit_m2 = demandRec.getValue('custrecord_swc_dp_forcast_m1');//第2月需求
                var unit_m3 = demandRec.getValue('custrecord_swc_dp_forcast_m1');//第3月需求
                var unit_m4 = demandRec.getValue('custrecord_swc_dp_forcast_m1');//第4月需求
                var unit_m5 = demandRec.getValue('custrecord_swc_dp_forcast_m1');//第5月需求
                var unit_m6 = demandRec.getValue('custrecord_swc_dp_forcast_m1');//第6月需求
                var unit_m7 = demandRec.getValue('custrecord_swc_dp_forcast_m1');//第7月需求
                var unit_m8 = demandRec.getValue('custrecord_swc_dp_forcast_m1');//第8月需求

                const dayOfmonth = new Date().getDate();
                log.debug('dayOfmonth', dayOfmonth);

                var leadTime = 150;
                var leadTimeFound = false;
                log.debug('locationType', locationType)
                search.create({
                    type: 'customrecord_swc_plan_times',
                    filters: [
                        { name: 'custrecord_swc_spt_sku', operator: 'anyof', values: sku },
                        { name: 'custrecord_swc_spt_country', operator: 'anyof', values: country },
                        { name: 'custrecord_swc_spt_location_type', operator: 'anyof', values: locationType }
                    ],
                    columns: [
                        { name: 'custitem_swc_productdeliverydays', join: 'custrecord_swc_spt_sku' },//采购交期
                        { name: 'formulanumeric', formula: "{custrecord_swc_spt_plan_processing_time}+{custrecord_swc_spt_purch_processing_time}+{custrecord_swc_spt_domestic_process_time}+{custrecord_swc_spt_oversea_transfer_time}+{custrecord_swc_spt_logistics_time}+{custrecord_swc_spt_flex_time}+{custrecord_swc_spt_pre_wh_safety_time}+{custrecord_swc_spt_putaway_time}" },//备货提前期（除了安全天数和采购提前期以外）
                    ]
                }).run().each(function (rec) {
                    log.audit('rec', JSON.stringify(rec));
                    leadTime = rec.getValue(rec.columns[0]) * 1 + rec.getValue(rec.columns[1]) * 1 + level.safeDate
                    leadTimeFound = true
                    return true;
                });

                var months = demandRec.getValue('custrecord_swc_dp_months')
                // TODO:
                if (months == 8) {
                    leadTime = leadTime + 60;
                }

                // 定义8个月的需求数量（每月固定28天）
                const monthlyDemands = [unit_m1, unit_m2, unit_m3, unit_m4, unit_m5, unit_m6, unit_m7, unit_m8];
                forcast_effective = calculateDemandInPeriod(dayOfmonth, leadTime, monthlyDemands);
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_forcast_effective', value: forcast_effective })//运营周期内需求数量
                //旧逻辑-安全库存,按产品等级算运营前三月需求平均数/30*N,N根据产品等级算
                first3MUnits = unit_m1 * 1 + unit_m2 * 1 + unit_m3 * 1;

                //TODO:搜索SKU负责人管理获取相关人员
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
                    demandRec.setValue({ fieldId: 'custrecord_swc_dp_applicant', value: rec.getValue('custrecord_swc_sm_sales_man') })//
                    demandRec.setValue({ fieldId: 'custrecord_swc_dp_sales_supervisor', value: rec.getValue('custrecord_swc_sm_sales_supervisor') })//
                    demandRec.setValue({ fieldId: 'custrecord_swc_dp_sales_manager', value: rec.getValue('custrecord_swc_sm_sales_manager') })//
                    demandRec.setValue({ fieldId: 'custrecord_swc_dp_planer', value: rec.getValue('custrecord_swc_sm_planer') })//
                    demandRec.setValue({ fieldId: 'custrecord_swc_dp_plan_manager', value: rec.getValue('custrecord_swc_sm_plan_manager') })//
                    return false;
                });

                //TODO:获取库存状态，在库存去化率表里面计算（库存去化率表数据由甲方IT计算，NS只用到库存状态）
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_inventory_status', value: 3 })//查不到去化率时默认设置，无标准销量
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
                    demandRec.setValue({ fieldId: 'custrecord_swc_dp_inventory_status', value: rec.getValue('custrecord_swc_qh_inventory_status') })//备货库存状态
                    rec.getValue('custrecord_swc_qh_by_date') && demandRec.setText({ fieldId: 'custrecord_swc_dp_by_date', text: rec.getValue('custrecord_swc_qh_by_date') })//首次到仓时间
                    return false;
                });

                // 2 国内在途仓 3 国内海外在途仓 4 海外国内在途仓 5 海外国外在途仓 10 平台在途仓 11: 保税仓
                const intransitIds = ['2', '3', '4', '5', '10', '11'];
                // 6: 海外仓 7: 平台仓
                const inStockIds = ['6', '7'];
                //在库
                var onhandQty = 0;
                var salesPrice = 0, cost = 0, newOld = 1;
                log.debug('sku', sku);
                log.debug('store', store);
                log.debug('country', country);
                log.debug('locationType', locationType);
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
                    demandRec.setValue({ fieldId: 'custrecord_swc_dp_unit_price', value: salesPrice })//售价
                    if (onhandQty > 0) {
                        cost = rec.getValue(rec.columns[3]) / onhandQty
                    }
                    if (salesPrice > 0) {
                        demandRec.setValue({ fieldId: 'custrecord_swc_dp_profit_margin', value: Math.round(salesPrice - cost / salesPrice, 4) * 100 })//利润率
                    } else {
                        demandRec.setValue({ fieldId: 'custrecord_swc_dp_profit_margin', value: 0 })//利润率
                    }
                    demandRec.setValue({ fieldId: 'custrecord_swc_dp_inventory_cost', value: cost })//成本
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
                var onWayQty = 0;
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_onhand_quantity', value: onhandQty })
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_onorder_quantity', value: onOrderQty })
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_onway_quantity', value: onWayQty })
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_inventory', value: onhandQty * 1 + onOrderQty * 1 + onWayQty * 1 })//在库+在产+在途

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

                //TODO:美国分区数量要根据订单目的地所在州确定分区
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

                log.debug('日销数据 columns_items', columns_items)
                stores.length > 0 && search.create({
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
                    jdxssl = Number(jdxssl) + Number(rec.getValue(rec.columns[13]) ? rec.getValue(rec.columns[13]) : 0);
                    jxxssl = Number(jxxssl) + Number(rec.getValue(rec.columns[14]) ? rec.getValue(rec.columns[14]) : 0);
                    return false;
                });

                //TODO:美国分区数量要根据订单目的地所在州确定分区
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
                stores.length > 0 && search.create({
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
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_mxxssl', value: mxxssl })
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_mdxssl', value: mdxssl })
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_mzxssl', value: mzxssl })
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_mdnxssl', value: mdnxssl })
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_mxnxssl', value: mxnxssl })
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_ca_east_xssl', value: jdxssl })
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_ca_west_xssl', value: jxxssl })


                //旧逻辑-安全库存,按产品等级算运营前三月需求平均数/30*N,N根据产品等级算
                var oldSafeQty = Math.round(first3MUnits / (3 * 28) * level.safeDate);
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_old_logic_safety_stock', value: oldSafeQty })

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
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_new_logic_safety_stock', value: newSafeQty })//新逻辑-安全库存
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
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_estimated_quantity', value: estimatedQty })//预估总数
                // 销量调整系数：运营周期内需求数量/预估总数-1
                var salesRate = estimatedQty == 0 ? 0 : Math.round(forcast_effective / estimatedQty - 1, 2);
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_sales_adjust_rate', value: salesRate })
                //理论备货数量:销量调整系数绝对值小于0.2时取运营周期内需求数量否则取预估总数，再减去在产、在库、在途数量
                var theoryQuantity = 0;
                if (salesRate >= -0.2 && salesRate <= 0.2) {
                    theoryQuantity = forcast_effective - onhandQty - onOrderQty - onWayQty;
                } else {
                    theoryQuantity = estimatedQty - onhandQty - onOrderQty - onWayQty;
                }
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_theory_quantity', value: theoryQuantity })

                //系统建议：
                // 1.销售调整系数大于0.2："运营预估数量过大"；
                // 2.销售调整系数小于-0.2且理论备货数量>0："运营预估数量过小"；
                // 3.否则“运营预估数量在范围内”
                if (salesRate > 0.2) {
                    demandRec.setValue({ fieldId: 'custrecord_swc_dp_system_recommendation', value: '1' })
                } else if (salesRate < -0.2 && theoryQuantity > 0) {
                    demandRec.setValue({ fieldId: 'custrecord_swc_dp_system_recommendation', value: '2' })
                } else {
                    demandRec.setValue({ fieldId: 'custrecord_swc_dp_system_recommendation', value: '3' })
                }

                if (!leadTimeFound) {
                    demandRec.setValue({ fieldId: 'custrecord_swc_dp_system_recommendation', value: '4' })
                }


                //旧逻辑-备货系数:理论备货数量/旧逻辑-安全库存
                var oldRate = oldSafeQty == 0 ? 0 : Math.round(theoryQuantity / oldSafeQty, 2);
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_old_plan_rate', value: oldRate })
                // 新逻辑-备货系数:理论备货数量/新逻辑-安全库存
                var newRate = newSafeQty == 0 ? 0 : Math.round(theoryQuantity / newSafeQty, 2);
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_new_plan_rate', value: newRate })
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
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_correction1', value: correction1 })

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
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_mxcqsl', value: mxcq })
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_mdcqsl', value: mdcq })
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_mzcqsl', value: mzcq })
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_mdncqsl', value: mdncq })
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_mxncqsl', value: mxncq })

            }

            var special_modification = demandRec.getValue('custrecord_swc_dp_special_modification');//特殊修改
            if (special_modification !== '') {
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_quantity', value: special_modification })//PMC审批数量
            }


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
         * 计算从第一个月第N天开始，往后120天内的有效需求数
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
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
