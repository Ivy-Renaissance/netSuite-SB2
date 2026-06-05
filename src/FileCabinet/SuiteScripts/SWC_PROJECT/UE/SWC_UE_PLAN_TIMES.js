/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @description 计划时效表，保存是自动查询产品等级和安全天数
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
            var newRecord = scriptContext.newRecord;
            // if (scriptContext.type == 'create') 
            {
                var country = newRecord.getValue('custrecord_swc_spt_country');//国家编码
                var sku = newRecord.getValue('custrecord_swc_spt_sku');
                var level = getSKULevel(sku, country);
                log.debug('level', level)
                log.debug('country', country)
                log.debug('sku', sku)
                if (level) {
                    newRecord.setValue({ fieldId: 'custrecord_swc_spt_level', value: level.level })//产品等级  
                    newRecord.setValue({ fieldId: 'custrecord_swc_spt_safety_time', value: level.safeDate })//安全天数
                    level.ejlm&&newRecord.setValue({ fieldId: 'custrecord_swc_spt_sku_ejlm', value: level.ejlm })//二级类目
                }else{
                    newRecord.setValue({ fieldId: 'custrecord_swc_spt_level', value: '' })//产品等级  
                    newRecord.setValue({ fieldId: 'custrecord_swc_spt_safety_time', value: 0 })//安全天数
                }
            }


        }

        function getSKULevel(sku, country) {
            var levelObj;
            search.create({
                type: 'customrecord_swc_sku_level',
                filters: [
                    { name: 'custrecord_swc_sl_sku', operator: search.Operator.IS, values: sku },
                    { name: 'custrecord_swc_sl_country', operator: search.Operator.IS, values: country }
                ],
                columns: [
                    { name: 'custrecord_swc_sl_level' },
                    { name: 'custrecord_swc_sle_safe_date', join: 'custrecord_swc_sl_level' },
                    { name: 'custrecord_swc_sle_rate', join: 'custrecord_swc_sl_level' },
                    { name: 'custitem_swc_ejlm', join: 'custrecord_swc_sl_sku' }

                ]
            }).run().each(function (rec) {
                levelObj = {
                    level: rec.getValue(rec.columns[0]),
                    safeDate: rec.getValue(rec.columns[1]),
                    rate: rec.getValue(rec.columns[2]),
                    ejlm: rec.getValue(rec.columns[3])
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
            if (startDay > 28) {
                startDay = 28
            }
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
