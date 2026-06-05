/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/config', 'N/record', 'N/runtime', 'N/search'],
    /**
 * @param{config} config
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
    (config, record, runtime, search) => {
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
            const { newRecord, oldRecord, type } = scriptContext
            if ([scriptContext.UserEventType.EDIT, scriptContext.UserEventType.CREATE].includes(type)) {
                const base_data = {
                    BCP: newRecord.getValue('custrecord_swc_sf_bcp'),//Base Cost Price
                    MAP: newRecord.getValue('custrecord_swc_sf_map'),//MAP
                    inventory_gap: newRecord.getValue('custrecord_swc_sf_inventory_gap'),//Inventory GAP
                    store_id: newRecord.getValue('custrecord_swc_sf_store'),//店铺ID
                    sku_id: newRecord.getValue('custrecord_swc_sf_sku'),//SKUID
                    DFC_unit: newRecord.getValue('custrecord_swc_sf_dfc_unit'),//Domestic Freight Cost（DFC）Unit
                    cogs_unit: newRecord.getValue('custrecord_swc_sf_cogs_unit'),//COGS Unit-出仓价
                    forecast_refund_rate: newRecord.getValue('custrecord_swc_sf_forecast_refund_rate'),//Forecast Refund %
                    commission_rate: newRecord.getValue('custrecord_swc_sf_commission_rate'),//Commission %
                }
                // // 店铺数据
                // try {
                //     const store_info = record.load({
                //         type: record.Type.CUSTOMER,//SKU映射表
                //         id: base_data.store_id
                //     });
                //     // 运营小组
                //     newRecord.setValue({ fieldId: 'custrecord_swc_sf_op_team', value: store_info.getValue('custentity_swc_department') })
                //     // 店铺负责人
                //     newRecord.setValue({ fieldId: 'custrecord_swc_sf_store_manage', value: store_info.getValue('custentitycustomlist_swc_store_manager') })
                //     log.debug('store_info', store_info);
                // } catch (error) {
                //     log.error('店铺ID', base_data.store_id);
                //     log.error('未找到数据', error.message);
                // }
                // SKU数据
                let sku_search = search.create({
                    type: 'customrecord_swc_sales_forcast',//SKU映射表
                    filters: [
                        { name: 'internalid', operator: search.Operator.IS, values: base_data.sku_id },//给定测试条目 6482
                    ],
                    columns: [
                        { name: 'type', join: 'custrecord_swc_sf_sku' },//sku 名称
                    ]
                });
                const sku_info = sku_search.run().getRange({ start: 0, end: 1 })
                const item_type = sku_info[0].getValue({ name: 'type', join: 'custrecord_swc_sf_sku' })

                // CG/3PL/FBA三个国家仓库的库存数
                const location_type_map = {
                    '3PL': 1,
                    'FBA': 2,
                    'CG': 3
                }
                let kitAvailability = calculateKitAvailability([base_data.sku_id], item_type, location_type_map)
                log.debug('kitAvailability', kitAvailability);
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_3pl_available_inventor', value: kitAvailability[1] || 0 })
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_cg_available_inventory', value: kitAvailability[3] || 0 })
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_fba_available_inventor', value: kitAvailability[2] || 0 })

                log.debug('base_data', base_data);
                // IMU
                const IMU = base_data.MAP ? (base_data.MAP - base_data.BCP) / base_data.MAP : 0;
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_imu', value: IMU })
                // 库存是否满足
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_inventory_is_satisfy', value: base_data.inventory_gap > 0 })
                let sum_total_revenue = 0 // Total Forecast Revenue
                let sum_total_unit = 0 // Total Forecast Unit
                let total_ads_budget = 0 // Total Ads Budget 的子项
                let revenue_mon_sum = 0 // revenue月度汇总
                let unit_mon_sum = 0 // unit月度汇总
                for (let index = 1; index <= 32; index++) {
                    const asp_acp = newRecord.getValue(`custrecordcustrecord_swc_sf_asp_acp_w${index}`) || 0
                    const ads_rate = newRecord.getValue(`custrecordcustrecord_swc_sf_ads_rate_w${index}`) || 0
                    const total_unit = newRecord.getValue(`custrecord_swc_sf_total_unit_w${index}`) || 0
                    const actual_unit = newRecord.getValue(`custrecord_swc_sf_actual_unit_w${index}`) || 0
                    sum_total_unit += total_unit // 汇总计算 week unit
                    // 实际revenue
                    const actual_revenue = asp_acp * actual_unit
                    newRecord.setValue({ fieldId: `custrecord_swc_sf_actual_rev_w${index}`, value: actual_revenue })
                    // 预测revenue
                    const total_revenue = asp_acp * total_unit // 每周的revenue
                    sum_total_revenue += total_revenue // 汇总计算 week revenue
                    newRecord.setValue({ fieldId: `custrecord_swc_sf_total_rev_w${index}`, value: total_revenue })
                    // 计算每周的Ads Budget
                    const ads_budget = ads_rate * total_revenue
                    total_ads_budget += ads_budget
                    // 计算月的revenue和unit
                    revenue_mon_sum += actual_revenue
                    unit_mon_sum += actual_unit
                    if (index % 4 == 0) {
                        newRecord.setValue({ fieldId: `custrecord_swc_sf_total_unit_m${index / 4}`, value: unit_mon_sum })
                        newRecord.setValue({ fieldId: `custrecord_swc_sf_total_rev_m${index / 4}`, value: revenue_mon_sum })
                        revenue_mon_sum = 0
                        unit_mon_sum = 0
                    }
                }
                // Total Forecast Revenue
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_total_forecast_revenue', value: sum_total_revenue })
                // Total Forecast Unit
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_total_forecast_unit', value: sum_total_unit })
                // Total DFC
                const total_dfc = base_data.DFC_unit * sum_total_unit
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_total_dfc', value: total_dfc })
                // Total COGS
                const total_cogs = base_data.cogs_unit * sum_total_unit
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_total_cogs', value: total_cogs })
                // Total Ads Budget
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_total_ads_budget', value: total_ads_budget })
                // Total Refund Amount
                const total_refund_amount = sum_total_revenue * base_data.forecast_refund_rate
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_total_refund_amount', value: total_refund_amount })
                // Total Commission Amount
                const total_commission_amoun = sum_total_revenue * base_data.commission_rate
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_total_commission_amoun', value: total_commission_amoun })
                // PM
                const pm = sum_total_revenue - total_cogs - total_commission_amoun
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_pm', value: pm })
                // PM%
                const pm_rate = sum_total_revenue ? pm / sum_total_revenue : 0
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_pm_rate', value: Math.abs(pm_rate) })
                // OM
                const om = pm - total_ads_budget - total_refund_amount
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_om', value: om })
                // OM%
                const om_rate = sum_total_revenue ? om / sum_total_revenue : 0
                newRecord.setValue({ fieldId: 'custrecord_swc_sf_om_rate', value: Math.abs(om_rate) })
            }
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


        /**
         * 
         * @param {*} itemId 
         * @returns 返回货品的在库数量和平均成本
         */
        function calculateKitAvailability (itemId, type, location_type_map) { // itemId: Kit物品的内部ID
            // 1. 首先需要获取这个Kit物品的记录，找到它的所有组件
            // 注意：这里需要先加载Kit物品记录并遍历其"member"子列表来获取组件物品ID和数量。
            // 假设我们已经获得了组件物品ID和数量的映射关系，例如：
            // componentQtys = { '组件1内部ID': 2, '组件2内部ID': 1 }; // 表示Kit需要2个组件1和1个组件2。

            let componentQtys = {};
            if (type == 'Kit') {
                componentQtys = getKitComponents(itemId); //如果是套装则获取套装下的成员货品配置
            } else {
                componentQtys[itemId] = 1;//非套装，则搜索货品本身的库存数据
            }

            log.debug('componentQtys', componentQtys)
            let componentItemIds = Object.keys(componentQtys);

            // 2. 创建搜索来批量查询所有组件的库存余额
            let inventoryBalanceSearch = search.create({
                type: search.Type.ITEM,
                filters: [
                    { name: 'internalid', operator: search.Operator.IS, values: componentItemIds },
                    { name: 'custrecord_swc_location_type', join: 'inventoryLocation', operator: search.Operator.ANYOF, values: Object.values(location_type_map) },
                ],
                columns: [
                    { name: 'internalid', summary: 'GROUP' }, // 组件物品ID
                    { name: 'custrecord_swc_location_type', join: 'inventoryLocation', summary: 'GROUP' }, // 组件物品ID
                    { name: 'locationquantityonhand', summary: 'SUM' }, // 可用数量
                    { name: 'locationquantityintransit', summary: 'SUM' }, // 在途数量
                ]
            });
            let kitAvailableQuantity = {}
            // 3. 执行搜索并处理结果
            inventoryBalanceSearch.run().each(function (result) {
                log.debug('inventoryBalanceSearch result', result)
                const componentItemId = result.getValue({ name: 'internalid', summary: 'GROUP' });
                const intransit = result.getValue({ name: 'locationquantityintransit', summary: 'SUM' })
                const onhand = result.getValue({ name: 'locationquantityonhand', summary: 'SUM' })
                const componentAvailableQty = parseFloat(intransit + onhand) || 0;
                const qtyNeededPerKit = componentQtys[componentItemId];

                // 计算当前组件能支持多少个Kit
                const kitsSupportedByThisComponent = Math.floor(componentAvailableQty / qtyNeededPerKit);

                // Kit的可用数量是所有组件支持数量的最小值
                const locationType = result.getValue({ name: 'custrecord_swc_location_type', join: 'inventoryLocation', summary: 'GROUP' });
                if (!kitAvailableQuantity[locationType]) {
                    kitAvailableQuantity[locationType] = Number.MAX_SAFE_INTEGER
                }
                kitAvailableQuantity[locationType] = Math.min(kitAvailableQuantity[locationType], kitsSupportedByThisComponent);

                return true; // 继续处理下一个结果
            });

            return kitAvailableQuantity;
        }
        /**
         * 
         * @param {*} itemId 套装货品ID
         * @returns 返回套装成员货品对象，key为成员货品ID，value为成员货品数量，
         */
        function getKitComponents (itemId) {
            // 返回一个对象，如 { 'comp_item_id_1': 2, 'comp_item_id_2': 1 }
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
        return { beforeLoad, beforeSubmit, afterSubmit }

    });
