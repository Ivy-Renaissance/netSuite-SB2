/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @description 备货计划计算修正2和提交复核处理
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
            log.debug('入参', runtime.getCurrentScript().getParameter({ name: 'custscript_swc_mp_dp_deal_params' }))
            var results = JSON.parse(runtime.getCurrentScript().getParameter({ name: 'custscript_swc_mp_dp_deal_params' }));
            // for (var i = 0; i < 10000; i++) {
            //     results.push({
            //         sku: i,
            //         store: i
            //     });
            // }
            if (results && results.length > 0 && results[0].action == '2') {
                var reviewRec = record.create({ type: 'customrecord_swc_demand_plan_review' });
                var reviewId = reviewRec.save();
                for (let i = 0; i < results.length; i++) {
                    var temp = results[i];
                    temp["reviewId"] = reviewId;
                    results[i] = temp;
                }
            }
            log.debug('results', results.length)
            //获取系统日期格式配置
            var general_preferences = config.load({ type: config.Type.COMPANY_PREFERENCES });
            var dateFormat = general_preferences.getValue({ fieldId: 'DATEFORMAT' });
            log.debug('dateFormat', dateFormat);
            //上月初时间
            const lastMonthStart = moment().add(16, 'hours').startOf('month').subtract(1, 'months').format(dateFormat);
            log.debug('lastMonthStart', lastMonthStart);
            const lastMonthEnd = moment('2025-12-11').startOf('month').subtract(1, 'days').format(dateFormat);
            log.debug('lastMonthEnd', lastMonthEnd);
            log.debug('lastMonthEnd1', moment('2025-12-11'));

            // var testArray = ["1", "2", "3", "4", "1", "2", "3", "5", "1", "2", "3"]
            // log.debug('testArray', testArray)
            // var newArray = commons.dedup(testArray, function (mapEntry) {
            //     return mapEntry;
            // });
            // log.debug('newArray', newArray)
            // var testArray = [{ id: '1', date: '2' }, { id: '3', date: '4' }, { id: '1', date: '2' }]
            // log.debug('testArray', testArray)
            // var newArray = commons.dedup(testArray, function (mapEntry) {
            //     return mapEntry.id;
            // });
            // log.debug('newArray', newArray)
            // var testArray = [{ id: '1', date: '2' }, { id: '3', date: '4' }, { id: '1', date: '2' }, { id: '1', date: '3' }]
            // log.debug('testArray', testArray)
            // var newArray = commons.dedup(testArray, function (mapEntry) {
            //     return mapEntry;
            // });
            // log.debug('newArray', newArray)
            // log.debug('isNaN1', commons.isNaN(''))
            // log.debug('isNaN2', commons.isNaN(0))
            // log.debug('isNaN3', commons.isNaN(-1))
            // log.debug('isNaN4', commons.isNaN('a'))
            // return []
            return results;

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
                var recId = obj.Id;
                if (obj.action == '1') {
                    calculateCorrection(recId)
                } else if (obj.action == '2') {
                    var sku = submitReview(recId, obj.reviewId)
                    if (sku) {
                        mapContext.write({
                            key: obj.reviewId,
                            value: sku
                        })
                    }

                }

            } catch (error) {
                log.error('reduce error', error)
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
                log.debug('reduceContext.key', reduceContext.key)
                log.debug('reduceContext.values', reduceContext.values)
                var reviewId = reduceContext.key;
                var reviewRec = record.load({ type: 'customrecord_swc_demand_plan_review', id: reviewId });
                reviewRec.setValue({ fieldId: 'custrecord_swc_dpr_submit_date', value: new Date() })

                var values = reduceContext.values;
                log.debug('values', values)
                var skus = commons.dedup(values, function (mapEntry) {
                    return mapEntry;
                });
                log.debug('skus', skus)
                //统计复核单的汇总数据
                search.create({
                    type: 'customrecord_swc_demand_plan',
                    filters: [
                        { name: 'custrecord_swc_dp_review', operator: search.Operator.IS, values: reviewId }
                    ],
                    columns: [
                        { name: 'custrecord_swc_dp_forcast_m1', summary: 'SUM' },
                        { name: 'custrecord_swc_dp_forcast_m2', summary: 'SUM' },
                        { name: 'custrecord_swc_dp_forcast_m3', summary: 'SUM' },
                        { name: 'custrecord_swc_dp_forcast_m4', summary: 'SUM' },
                        { name: 'custrecord_swc_dp_forcast_m5', summary: 'SUM' },
                        { name: 'custrecord_swc_dp_forcast_m6', summary: 'SUM' },
                        { name: 'custrecord_swc_dp_forcast_m7', summary: 'SUM' },
                        { name: 'custrecord_swc_dp_forcast_m8', summary: 'SUM' },
                        { name: 'custrecord_swc_dp_forcast_total', summary: 'SUM' },
                        { name: 'custrecord_swc_dp_quantity', summary: 'SUM' },
                        { name: 'custrecord_swc_dp_funds', summary: 'SUM' }
                    ]
                }).run().each(function (rec) {
                    log.debug('备货汇总数据', rec)
                    reviewRec.setValue({ fieldId: 'custrecord_swc_dpr_forcast_m1', value: rec.getValue(rec.columns[0]) })
                    reviewRec.setValue({ fieldId: 'custrecord_swc_dpr_forcast_m2', value: rec.getValue(rec.columns[1]) })
                    reviewRec.setValue({ fieldId: 'custrecord_swc_dpr_forcast_m3', value: rec.getValue(rec.columns[2]) })
                    reviewRec.setValue({ fieldId: 'custrecord_swc_dpr_forcast_m4', value: rec.getValue(rec.columns[3]) })
                    reviewRec.setValue({ fieldId: 'custrecord_swc_dpr_forcast_m5', value: rec.getValue(rec.columns[4]) })
                    reviewRec.setValue({ fieldId: 'custrecord_swc_dpr_forcast_m6', value: rec.getValue(rec.columns[5]) })
                    reviewRec.setValue({ fieldId: 'custrecord_swc_dpr_forcast_m7', value: rec.getValue(rec.columns[6]) })
                    reviewRec.setValue({ fieldId: 'custrecord_swc_dpr_forcast_m8', value: rec.getValue(rec.columns[7]) })
                    reviewRec.setValue({ fieldId: 'custrecord_swc_dpr_forcast_total', value: rec.getValue(rec.columns[8])||0 })
                    reviewRec.setValue({ fieldId: 'custrecord_swc_dpr_forcast_m_toltal', value: rec.getValue(rec.columns[8])||0 })
                    reviewRec.setValue({ fieldId: 'custrecord_swc_dpr_quantity', value: rec.getValue(rec.columns[9]) })
                    reviewRec.setValue({ fieldId: 'custrecord_swc_dpr_amount', value: rec.getValue(rec.columns[10]) })

                    return false;
                })



                //获取系统日期格式配置
                var general_preferences = config.load({ type: config.Type.COMPANY_PREFERENCES });
                var dateFormat = general_preferences.getValue({ fieldId: 'DATEFORMAT' });
                log.debug('dateFormat', dateFormat);
                //上月初时间
                const lastMonthStart = moment().add(16, 'hours').startOf('month').subtract(1, 'months').format(dateFormat);
                log.debug('lastMonthStart', lastMonthStart);
                const lastMonthEnd = moment().add(16, 'hours').startOf('month').subtract(1, 'days').format(dateFormat);
                log.debug('lastMonthStart', lastMonthStart);
                //获取item直接当做销售订单货品时的上月销量
                var lastMonthSales = 0;
                search.create({
                    type: 'salesorder',
                    filters: [
                        { name: 'mainline', operator: search.Operator.IS, values: false },
                        { name: 'taxline', operator: search.Operator.IS, values: false },
                        { name: 'shipping', operator: search.Operator.IS, values: false },
                        { name: 'item', operator: search.Operator.ANYOF, values: skus },
                        { name: 'intercotransaction', operator: 'anyof', values: ['@NONE@'] },
                        { name: 'trandate', operator: search.Operator.WITHIN, values: [lastMonthStart, lastMonthEnd] }
                    ],
                    columns: [
                        { name: 'quantity', summary: 'SUM' },//数量
                    ]
                }).run().each(function (rec) {
                    log.debug('销售统计结果', rec)
                    lastMonthSales = rec.getValue(rec.columns[0])
                })
                //获取item当做销售订单套装下成员货品时的上月销量
                search.create({
                    type: 'salesorder',
                    filters: [
                        { name: 'mainline', operator: search.Operator.IS, values: false },
                        { name: 'taxline', operator: search.Operator.IS, values: false },
                        { name: 'shipping', operator: search.Operator.IS, values: false },
                        { name: 'component', join: 'item', operator: search.Operator.ANYOF, values: skus },
                        { name: 'intercotransaction', operator: 'anyof', values: ['@NONE@'] },
                        { name: 'trandate', operator: search.Operator.WITHIN, values: [lastMonthStart, lastMonthEnd] }
                    ],
                    columns: [
                        { name: 'memberitem', join: 'item', summary: "GROUP", sort: search.Sort.ASC },
                        { name: 'formulanumeric', formula: "{quantity}*{item.memberquantity}", summary: 'SUM' }//销售数量*组件比例
                    ]
                }).run().each(function (rec) {
                    log.debug('销售统计结果', rec)
                    if (skus.indexOf(rec.getValue(rec.columns[0])) != -1) {
                        lastMonthSales = Number(lastMonthSales) + Number(rec.getValue(rec.columns[1]))
                    }
                    return true;
                })
                reviewRec.setValue({ fieldId: 'custrecord_swc_dp_last_month_sales', value: lastMonthSales||0 })
                reviewRec.save();

            } catch (error) {
                log.error('销售统计结果', error)
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
         * 计算修正2
         * @param {*} recId 备货计划单ID
         */
        function calculateCorrection(recId) {
            var demandRec = record.load({ type: 'customrecord_swc_demand_plan', id: recId });
            var sku = demandRec.getValue({ fieldId: 'custrecord_swc_dp_sku' });
            var country = demandRec.getValue({ fieldId: 'custrecord_swc_dp_country' });
            var locationType = demandRec.getValue({ fieldId: 'custrecord_swc_dp_location_type' });
            var store = demandRec.getValue({ fieldId: 'custrecord_swc_dp_store' });
            var batch = demandRec.getValue({ fieldId: 'custrecord_swc_dp_batch' });

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
                type: 'customrecord_swc_demand_plan',
                filters: [
                    { name: 'custrecord_swc_dp_applicant_date', operator: search.Operator.ONORAFTER, values: MonthStart },
                    { name: 'custrecord_swc_dp_applicant_date', operator: search.Operator.ONORBEFORE, values: MonthEnd },
                    { name: 'custrecord_swc_dp_country', operator: search.Operator.IS, values: country },
                    { name: 'custrecord_swc_dp_sku', operator: search.Operator.IS, values: sku },
                    { name: 'custrecord_swc_dp_batch', operator: search.Operator.IS, values: batch }//备货批次
                ],
                columns: [
                    { name: 'custrecord_swc_dp_correction1', summary: 'SUM' }
                ]
            }).run().each(function (rec) {
                correction2 = rec.getValue(rec.columns[0])
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_correction2', value: correction2 })
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_correction2_date', value: new Date() })
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
            var correction1 = demandRec.getValue({ fieldId: 'custrecord_swc_dp_correction1' });
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
            demandRec.setValue({ fieldId: 'custrecord_swc_dp_correction3', value: correction3 })

            //PMC 审批备货
            // 1、特殊修改则取特殊修改；
            // 2、修正3大于0小于10时取0；
            // 3、修正3大于0时取修正3，
            // 4.否则修正3小于0时修正3小于负在产量则取负在产量，否则取修正3
            var correction = demandRec.getValue({ fieldId: 'custrecord_swc_dp_special_modification' });//特殊修正
            var onOrderQty = demandRec.getValue({ fieldId: 'custrecord_swc_dp_onorder_quantity' });//在产量
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
            demandRec.setValue({ fieldId: 'custrecord_swc_dp_quantity', value: Math.round(quantity) })



            // 资金占用:PMC 审批备货数量*（采购成本+物流成本）
            if (Math.round(quantity) > 0) {
                var cost = demandRec.getValue({ fieldId: 'custrecord_swc_dp_inventory_cost' });
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_funds', value: Math.round(quantity) * cost })
            } else {
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_funds', value: 0 })
            }

            // PMC备注
            // 1.PMC审批备货小于0: 暂缓·生产进度
            // 2.PMC审批备货等于0: 无需备货也不需要调整生产
            // 3.PMC审批备货大于0小于起订量: 审核需求小于起订量
            // 4.PMC审批备货大于0大于起订量: 审核需求满足起订量
            var minOrderQty = demandRec.getValue({ fieldId: 'custrecord_swc_dp_min_order_qty' });
            if (Math.round(quantity) < 0) {
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_pmc_memo', value: '暂缓·生产进度' })
            } else if (Math.round(quantity) == 0) {
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_pmc_memo', value: '无需备货也不需要调整生产' })
            } else if (Math.round(quantity) > 0 && Math.round(quantity) < minOrderQty) {
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_pmc_memo', value: '审核需求小于起订量' })
            } else if (Math.round(quantity) > 0 && Math.round(quantity) >= minOrderQty) {
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_pmc_memo', value: '审核需求满足起订量' })
            }

            // 理论PMC提前发货数量
            // 1、PMC审批备货数量小于等于0时取0；
            // 2、否则新逻辑备货系数大于2.5时取新逻辑安全库存 * 1.5；
            // 3.否则：3PL仓：运营第一个月需求 / 2 + 第二、三月需求 + 新安全库存减去在库在途在产；非3PL仓：运营第四个月需求 / 2 + 第一、二、三月需求 + 新安全库存减去在库在途在产；
            var theoryEarlyQuantity = 0;
            var newRate = demandRec.getValue({ fieldId: 'custrecord_swc_dp_new_plan_rate' });
            var newSafeQty = demandRec.getValue({ fieldId: 'custrecord_swc_dp_new_logic_safety_stock' });
            var unit_m1 = demandRec.getValue({ fieldId: 'custrecord_swc_dp_forcast_m1' });
            var unit_m2 = demandRec.getValue({ fieldId: 'custrecord_swc_dp_forcast_m2' });
            var unit_m3 = demandRec.getValue({ fieldId: 'custrecord_swc_dp_forcast_m3' });
            var unit_m4 = demandRec.getValue({ fieldId: 'custrecord_swc_dp_forcast_m4' });
            var inventory = demandRec.getValue({ fieldId: 'custrecord_swc_dp_inventory' });
            if (Math.round(quantity) <= 0) {
                theoryEarlyQuantity = 0;
            } else if (newRate > 2.5) {
                theoryEarlyQuantity = newSafeQty * 1.5;
            } else if (locationType == '1') {
                theoryEarlyQuantity = unit_m1 / 2 + unit_m2 + unit_m3 + newSafeQty - inventory;
            } else {
                theoryEarlyQuantity = unit_m1 + unit_m2 + unit_m3 + unit_m4 / 2 + newSafeQty - inventory;
            }
            demandRec.setValue({ fieldId: 'custrecord_swc_dp_theory_early_quantity', value: theoryEarlyQuantity })

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
            demandRec.setValue({ fieldId: 'custrecord_swc_dp_actual_early_quantity', value: Math.round(actualEarlyQuantity) })
            demandRec.save()
        }

        /**
         * 提交复核
         * @param {*} recId 备货计划单ID
         * @param {*} reviewId 复核单ID
         */
        function submitReview(recId, reviewId) {
            var demandRec = record.load({ type: 'customrecord_swc_demand_plan', id: recId });
            var review = demandRec.getValue({ fieldId: 'custrecord_swc_dp_review' });
            var sku = demandRec.getValue({ fieldId: 'custrecord_swc_dp_sku' });
            if (!review) {
                demandRec.setValue({ fieldId: 'custrecord_swc_dp_review', value: reviewId })
                demandRec.save()
                return sku;
            } else {
                return;
            }

        }

        return { getInputData, map, reduce, summarize }

    });
