/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @description 采购需求汇总表确认后自动生成请购单
 */
define(['N/record', 'N/runtime', 'N/search', 'N/config', '../common/moment', '../common/commons'],
    /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
    (record, runtime, search, config, moment, commons) => {
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
            try {

                var results = [];
                var limit = 3999;
                search.create({
                    type: 'customrecord_swc_purchase_plan',
                    filters: [
                        { name: 'custrecord_swc_dpr_comfirm', operator: search.Operator.IS, values: true },//采购需求汇总表已确认
                        { name: 'custrecord_swc_pd_deal', operator: search.Operator.IS, values: false },//还没生成采购请购明细
                        // { name: 'internalid', operator: search.Operator.IS, values: 1344 },//特定单据测试
                    ],
                    columns: [
                        { name: 'internalid' },
                        { name: 'custrecord_swc_pd_sku' }
                    ]
                }).run().each(function (rec) {
                    log.debug('采购需求明细表', rec)
                    results.push({
                        id: rec.id
                    })
                    return limit-- > 0;
                })
                log.debug('results', results.length)
                return results;
            } catch (error) {
                log.debug('get error', error)
                return []
            }


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
            //放到Reduce方法里面去处理
            // try {
            //     var obj = JSON.parse(mapContext.value);
            //     var id = obj.id;
            //     // purchasePlanToPurchaseRequest(id)
            // } catch (error) {
            //     log.error('reduce error', error)
            // }
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
            // log.debug('reduce', reduceContext);
            // log.debug('key', reduceContext.key);
            // log.debug('values', reduceContext.values);
            try {
                var dd = [];
                reduceContext.values.map(function (value) {
                    // log.debug('value', value);
                    var obj = JSON.parse(value);
                    var id = obj.id;
                    log.debug('id', id);
                    purchasePlanToPurchaseRequest(id)
                })

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
         * 将采购需求汇总表转成请购单明细
         * @param {*} planId 采购需求汇总表ID
         */
        function purchasePlanToPurchaseRequest(planId) {
            var us_districts = [
                { index: 1, suorce: 'custrecord_swc_ppd_us_west', target: "custrecord_swc_pr_quantity", district: 1 },
                { index: 2, suorce: 'custrecord_swc_ppd_us_east', target: "custrecord_swc_pr_quantity", district: 2 },
                { index: 3, suorce: 'custrecord_swc_ppd_us_center', target: "custrecord_swc_pr_quantity", district: 3 },
                { index: 4, suorce: 'custrecord_swc_ppd_us_east_south', target: "custrecord_swc_pr_quantity", district: 4 },
                { index: 5, suorce: 'custrecord_swc_ppd_us_west_south', target: "custrecord_swc_pr_quantity", district: 5 }
            ]
            var ca_districts = [
                { index: 6, suorce: 'custrecord_swc_ppd_ca_east', target: "custrecord_swc_pr_quantity", district: 6 },
                { index: 7, suorce: 'custrecord_swc_ppd_ca_west', target: "custrecord_swc_pr_quantity", district: 7 }
            ]
            //首先搜索SKU是不是装配件，库存商品的话直接转成请购明细，装配件类型SKU要查询BOM组成，根据BOM去拆分成组件的请购
            search.create({
                type: 'customrecord_swc_purchase_plan_detail',
                filters: [
                    { name: 'custrecord_swc_ppd_purchase_plan', operator: search.Operator.IS, values: planId }
                ],
                columns: [
                    { name: 'custrecord_swc_ppd_demand_plan' },
                    { name: 'custrecord_swc_ppd_batch' },
                    { name: 'custrecord_swc_ppd_location_type' },
                    { name: 'custrecord_swc_ppd_country' },
                    { name: 'custrecord_swc_ppd_sku' },
                    { name: 'custrecord_swc_ppd_store' },
                    { name: 'custrecord_swc_ppd_quantity' },
                    { name: 'custrecord_swc_ppd_date' },
                    { name: 'custrecord_swc_ppd_salesman' },
                    { name: 'custrecord_swc_ppd_sku_yjlm' },
                    { name: 'custrecord_swc_ppd_first_receipt_time' },
                    { name: 'custrecord_swc_ppd_new_old' },
                    { name: 'custrecord_swc_ppd_sku_type' },
                    { name: 'custrecord_swc_ppd_sku_level' },
                    { name: 'custrecord_swc_ppd_inventory_status' },
                    { name: 'custrecord_swc_ppd_shipping_priority' },
                    { name: 'custrecord_swc_ppd_us_west' },
                    { name: 'custrecord_swc_ppd_us_east' },
                    { name: 'custrecord_swc_ppd_us_center' },
                    { name: 'custrecord_swc_ppd_us_east_south' },
                    { name: 'custrecord_swc_ppd_us_west_south' },
                    { name: 'custrecord_swc_ppd_ca_east' },
                    { name: 'custrecord_swc_ppd_ca_west' },
                    { name: 'subtype', join: 'custrecord_swc_ppd_sku' },
                    { name: 'type', join: 'custrecord_swc_ppd_sku' },
                    { name: 'vendor', join: 'custrecord_swc_ppd_sku' },
                    { name: 'custrecord_swc_pd_vendor', join: 'custrecord_swc_ppd_purchase_plan' },
                    { name: 'custrecord_swc_pd_bom', join: 'custrecord_swc_ppd_purchase_plan' },
                    { name: 'custitem_swc_cplb', join: 'custrecord_swc_ppd_sku' },
                    { name: 'custrecord_swc_pd_support', join: 'custrecord_swc_ppd_purchase_plan' },//打托
                    { name: 'custrecord_swc_pd_setfobtlement_method', join: 'custrecord_swc_ppd_purchase_plan' }//结算方式（付款方式，FOB价或者EXW价）
                ]
            }).run().each(function (rec) {
                log.debug('备货汇总数据', rec)
                var skuType = rec.getValue({ name: 'type', join: 'custrecord_swc_ppd_sku' });
                var _cplb = rec.getValue({ name: 'custitem_swc_cplb', join: 'custrecord_swc_ppd_sku' });

                if (skuType == 'InvtPart') {
                    var location_type = rec.getValue('custrecord_swc_ppd_location_type');
                    var country = rec.getValue('custrecord_swc_ppd_country');
                    //非US-3PL的直接转换， US-3PL的要根据五个区域的数量拆分成每个区域1条采购申请,新增加拿大分区
                    if (location_type == '1' && (country == '1' || country == '2')) {//TODO:生产环境ID
                        var districts = us_districts
                        if (country == '2') {
                            districts = ca_districts
                        }
                        for (let i = 0; i < districts.length; i++) {
                            var qty = rec.getValue(districts[i].suorce)//取出对应美国分区的数量，如果数量大于0才创建请购单 
                            if (qty > 0) {
                                var prRec = record.create({ type: 'customrecord_swc_purchase_request' });
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_purchase_plan', value: planId });//需求汇总表
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_demand_plan', value: rec.getValue('custrecord_swc_ppd_demand_plan') });//备货计划
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_vendor', value: rec.getValue({ name: 'custrecord_swc_pd_vendor', join: 'custrecord_swc_ppd_purchase_plan' }) });//供应商
                                // prRec.setValue({ fieldId: 'custrecord_swc_pr_bom', value: rec.getValue('') });//BOM
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_batch', value: rec.getValue('custrecord_swc_ppd_batch') });//备货批次
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_location_type', value: rec.getValue('custrecord_swc_ppd_location_type') });//仓库类型
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_store', value: rec.getValue('custrecord_swc_ppd_store') });//店铺
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_country', value: rec.getValue('custrecord_swc_ppd_country') });//国家
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_us_districts', value: districts[i].district });//美国分区
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_origin_sku', value: rec.getValue('custrecord_swc_ppd_sku') }); //成品SKU
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_main_sku', value: true });//主要部件
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_sku', value: rec.getValue('custrecord_swc_ppd_sku') });//SKU
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_quantity', value: qty });//数量
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_quantity_purchased', value: 0 });//已采数量
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_date', value: new Date()/*rec.getValue('custrecord_swc_ppd_date')*/ });//日期
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_sku_yjlm', value: rec.getValue('custrecord_swc_ppd_sku_yjlm') });//产品品类名称
                                var receipt_time = rec.getValue('custrecord_swc_ppd_first_receipt_time');
                                receipt_time ? prRec.setText({ fieldId: 'custrecord_swc_pr_first_receipt_time', text: receipt_time }) : '';//首次到仓时间
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_new_old', value: rec.getValue('custrecord_swc_ppd_new_old') });//新老标签
                                // prRec.setValue({ fieldId: 'custrecord_swc_pr_sku_type', value: rec.getValue('custrecord_swc_ppd_sku_type') });//产品类型
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_sku_level', value: rec.getValue('custrecord_swc_ppd_sku_level') });//产品等级
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_inventory_status', value: rec.getValue('custrecord_swc_ppd_inventory_status') }); //库存状态
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_shipping_priority', value: rec.getValue('custrecord_swc_ppd_shipping_priority') });//发货优先级
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_support', value: rec.getValue({ name: 'custrecord_swc_pd_support', join: 'custrecord_swc_ppd_purchase_plan' }) });//打托
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_setfobtlement_method', value: rec.getValue({ name: 'custrecord_swc_pd_setfobtlement_method', join: 'custrecord_swc_ppd_purchase_plan' }) });//
                                prRec.save();
                            }
                        }
                    } else {
                        var prRec = record.create({ type: 'customrecord_swc_purchase_request' });
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_purchase_plan', value: planId });//需求汇总表
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_demand_plan', value: rec.getValue('custrecord_swc_ppd_demand_plan') });//备货计划
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_vendor', value: rec.getValue({ name: 'custrecord_swc_pd_vendor', join: 'custrecord_swc_ppd_purchase_plan' }) });//供应商
                        // prRec.setValue({ fieldId: 'custrecord_swc_pr_bom', value: '' });//BOM
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_batch', value: rec.getValue('custrecord_swc_ppd_batch') });//备货批次
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_location_type', value: rec.getValue('custrecord_swc_ppd_location_type') });//仓库类型
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_store', value: rec.getValue('custrecord_swc_ppd_store') });//店铺
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_country', value: rec.getValue('custrecord_swc_ppd_country') });//国家
                        // prRec.setValue({ fieldId: 'custrecord_swc_pr_us_districts', value: rec.getValue('') });//美国分区
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_origin_sku', value: rec.getValue('custrecord_swc_ppd_sku') }); //成品SKU
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_main_sku', value: true });//主要部件
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_sku', value: rec.getValue('custrecord_swc_ppd_sku') });//SKU
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_quantity', value: rec.getValue('custrecord_swc_ppd_quantity') });//数量
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_quantity_purchased', value: 0 });//已采数量
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_date', value: new Date()/*rec.getValue('custrecord_swc_ppd_date')*/ });//日期
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_sku_yjlm', value: rec.getValue('custrecord_swc_ppd_sku_yjlm') });//产品品类名称
                        var receipt_time = rec.getValue('custrecord_swc_ppd_first_receipt_time');
                        receipt_time ? prRec.setText({ fieldId: 'custrecord_swc_pr_first_receipt_time', text: receipt_time }) : '';//首次到仓时间
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_new_old', value: rec.getValue('custrecord_swc_ppd_new_old') });//新老标签
                        // prRec.setValue({ fieldId: 'custrecord_swc_pr_sku_type', value: rec.getValue('custrecord_swc_ppd_sku_type') });//产品类型
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_sku_level', value: rec.getValue('custrecord_swc_ppd_sku_level') });//产品等级
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_inventory_status', value: rec.getValue('custrecord_swc_ppd_inventory_status') }); //库存状态
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_shipping_priority', value: rec.getValue('custrecord_swc_ppd_shipping_priority') });//发货优先级
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_support', value: rec.getValue({ name: 'custrecord_swc_pd_support', join: 'custrecord_swc_ppd_purchase_plan' }) });//打托
                        prRec.setValue({ fieldId: 'custrecord_swc_pr_setfobtlement_method', value: rec.getValue({ name: 'custrecord_swc_pd_setfobtlement_method', join: 'custrecord_swc_ppd_purchase_plan' }) });//
                        prRec.save();
                    }

                } else if (skuType == 'Assembly') {
                    var BOM = rec.getValue({ name: 'custrecord_swc_pd_bom', join: 'custrecord_swc_ppd_purchase_plan' });
                    //搜索BOM版本
                    var components = [];
                    search.create({
                        type: 'bomrevision',
                        filters: [
                            { name: 'billofmaterials', operator: search.Operator.IS, values: BOM }
                        ],
                        columns: [
                            { name: 'item', join: 'component' },
                            { name: 'quantity', join: 'component' },
                            { name: 'custrecord_swc_is_main_sku', join: 'component' }

                        ]
                    }).run().each(function (bom_rec) {
                        var componentSKU = bom_rec.getValue({ name: 'item', join: 'component' });
                        var componentQty = bom_rec.getValue({ name: 'quantity', join: 'component' });
                        var main = bom_rec.getValue({ name: 'custrecord_swc_is_main_sku', join: 'component' });
                        var componentVendor;
                        if (!main) {
                            //不是主要部件，则需要搜索配件的默认供应商
                            var componentVendors = search.lookupFields({
                                type: 'item',
                                id: componentSKU,
                                columns: ["custitem_swc_preferred_vendor"]
                            })["custitem_swc_preferred_vendor"]
                            componentVendors.length > 0 ? componentVendor = componentVendors[0].value : ''
                        }

                        var location_type = rec.getValue('custrecord_swc_ppd_location_type');
                        var country = rec.getValue('custrecord_swc_ppd_country');
                        //非US-3PL的直接转换， US-3PL的要根据五个区域的数量拆分成每个区域1条采购申请
                        if (location_type == '1' && (country == '1' || country == '2')) {//TODO:生产环境ID
                            var districts = us_districts
                            if (country == '2') {
                                districts = ca_districts
                            }
                            for (let i = 0; i < districts.length; i++) {
                                var qty = rec.getValue(districts[i].suorce)//取出对应美国分区的数量，如果数量大于0才创建请购单 
                                if (qty > 0) {
                                    var prRec = record.create({ type: 'customrecord_swc_purchase_request' });
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_purchase_plan', value: planId });//需求汇总表
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_demand_plan', value: rec.getValue('custrecord_swc_ppd_demand_plan') });//备货计划
                                    if (main) {
                                        prRec.setValue({ fieldId: 'custrecord_swc_pr_vendor', value: rec.getValue({ name: 'custrecord_swc_pd_vendor', join: 'custrecord_swc_ppd_purchase_plan' }) });//供应商
                                    } else {
                                        //查询配件的默认供应商
                                        componentVendor ? prRec.setValue({ fieldId: 'custrecord_swc_pr_vendor', value: componentVendor }) : '';//供应商
                                    }
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_bom', value: BOM });//BOM
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_batch', value: rec.getValue('custrecord_swc_ppd_batch') });//备货批次
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_location_type', value: rec.getValue('custrecord_swc_ppd_location_type') });//仓库类型
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_store', value: rec.getValue('custrecord_swc_ppd_store') });//店铺
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_country', value: rec.getValue('custrecord_swc_ppd_country') });//国家
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_us_districts', value: districts[i].district });//美国分区
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_origin_sku', value: rec.getValue('custrecord_swc_ppd_sku') }); //成品SKU
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_main_sku', value: main });//主要部件
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_sku', value: componentSKU });//SKU
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_quantity', value: qty * componentQty });//数量
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_quantity_purchased', value: 0 });//已采数量
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_date', value: new Date()/*rec.getValue('custrecord_swc_ppd_date')*/ });//日期
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_sku_yjlm', value: rec.getValue('custrecord_swc_ppd_sku_yjlm') });//产品品类名称
                                    var receipt_time = rec.getValue('custrecord_swc_ppd_first_receipt_time');
                                    receipt_time ? prRec.setText({ fieldId: 'custrecord_swc_pr_first_receipt_time', text: receipt_time }) : '';//首次到仓时间
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_new_old', value: rec.getValue('custrecord_swc_ppd_new_old') });//新老标签
                                    log.debug('custrecord_swc_pr_sku_type', rec.getValue('custrecord_swc_ppd_sku_type'))
                                    // prRec.setValue({ fieldId: 'custrecord_swc_pr_sku_type', value: rec.getValue('custrecord_swc_ppd_sku_type') });//产品类型
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_sku_level', value: rec.getValue('custrecord_swc_ppd_sku_level') });//产品等级
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_inventory_status', value: rec.getValue('custrecord_swc_ppd_inventory_status') }); //库存状态
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_shipping_priority', value: rec.getValue('custrecord_swc_ppd_shipping_priority') });//发货优先级
                                    prRec.setValue({ fieldId: 'custrecord_swc_pr_setfobtlement_method', value: rec.getValue({ name: 'custrecord_swc_pd_setfobtlement_method', join: 'custrecord_swc_ppd_purchase_plan' }) });//结算方式
                                    if (main) {
                                        prRec.setValue({ fieldId: 'custrecord_swc_pr_support', value: rec.getValue({ name: 'custrecord_swc_pd_support', join: 'custrecord_swc_ppd_purchase_plan' }) });//打托
                                    }
                                    prRec.save();
                                }
                            }
                        } else {
                            var prRec = record.create({ type: 'customrecord_swc_purchase_request' });
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_purchase_plan', value: planId });//需求汇总表
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_demand_plan', value: rec.getValue('custrecord_swc_ppd_demand_plan') });//备货计划
                            if (main) {
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_vendor', value: rec.getValue({ name: 'custrecord_swc_pd_vendor', join: 'custrecord_swc_ppd_purchase_plan' }) });//供应商
                            } else {
                                //查询配件的默认供应商
                                componentVendor ? prRec.setValue({ fieldId: 'custrecord_swc_pr_vendor', value: componentVendor }) : '';//供应商
                            }
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_bom', value: BOM });//BOM
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_batch', value: rec.getValue('custrecord_swc_ppd_batch') });//备货批次
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_location_type', value: rec.getValue('custrecord_swc_ppd_location_type') });//仓库类型
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_store', value: rec.getValue('custrecord_swc_ppd_store') });//店铺
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_country', value: rec.getValue('custrecord_swc_ppd_country') });//国家
                            // prRec.setValue({ fieldId: 'custrecord_swc_pr_us_districts', value: rec.getValue('') });//美国分区
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_origin_sku', value: rec.getValue('custrecord_swc_ppd_sku') }); //成品SKU
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_main_sku', value: main });//主要部件
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_sku', value: componentSKU });//SKU
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_quantity', value: rec.getValue('custrecord_swc_ppd_quantity') * componentQty });//数量
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_quantity_purchased', value: 0 });//已采数量
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_date', value: new Date()/*rec.getValue('custrecord_swc_ppd_date')*/ });//日期
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_sku_yjlm', value: rec.getValue('custrecord_swc_ppd_sku_yjlm') });//产品品类名称
                            var receipt_time = rec.getValue('custrecord_swc_ppd_first_receipt_time');
                            receipt_time ? prRec.setText({ fieldId: 'custrecord_swc_pr_first_receipt_time', text: receipt_time }) : '';//首次到仓时间
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_new_old', value: rec.getValue('custrecord_swc_ppd_new_old') });//新老标签
                            // prRec.setValue({ fieldId: 'custrecord_swc_pr_sku_type', value: rec.getValue('custrecord_swc_ppd_sku_type') });//产品类型
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_sku_level', value: rec.getValue('custrecord_swc_ppd_sku_level') });//产品等级
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_inventory_status', value: rec.getValue('custrecord_swc_ppd_inventory_status') }); //库存状态
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_shipping_priority', value: rec.getValue('custrecord_swc_ppd_shipping_priority') });//发货优先级
                            prRec.setValue({ fieldId: 'custrecord_swc_pr_setfobtlement_method', value: rec.getValue({ name: 'custrecord_swc_pd_setfobtlement_method', join: 'custrecord_swc_ppd_purchase_plan' }) });//
                            if (main) {
                                prRec.setValue({ fieldId: 'custrecord_swc_pr_support', value: rec.getValue({ name: 'custrecord_swc_pd_support', join: 'custrecord_swc_ppd_purchase_plan' }) });//打托
                            }
                            prRec.save();
                        }
                        return true;
                    })


                }
                return true;
            })

            record.submitFields({
                type: 'customrecord_swc_purchase_plan',
                id: planId,
                values: {
                    custrecord_swc_pd_deal: true
                }
            })



        }

        return { getInputData, reduce, summarize }

    });
