/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @description 自动创建一年的销售订单
 */
define(['N/record', 'N/search', 'N/config', 'N/runtime', '../common/moment'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search, config, runtime, moment) => {
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
            var results = []
            for (let index = -30; index < 450; index++) {
                results.push(index)
            }
            // for (let index = 1; index < 2; index++) {
            //     results.push(index)
            // }
            // var ord = record.load({ type: 'salesorder', isDynamic: true, id: '16581' });
            // var addr = ord.getSubrecord({ fieldId: 'shippingaddress' });
            // addr.setValue({ fieldId: 'country', value: 'US' });
            // addr.setValue({ fieldId: 'city', value: 'shipToCtiy' });
            // addr.setValue({ fieldId: 'state', value: 'PR' }); //customer.states[ll] 
            // addr.setValue({ fieldId: 'zip', value: '123456' });
            // addr.setValue({ fieldId: 'addrphone', value: '1234567890' });
            // addr.setValue({ fieldId: 'addressee', value: 'test address' });
            // addr.setValue({ fieldId: 'addr1', value: 'addr111' });
            // addr.setValue({ fieldId: 'addr2', value: 'addr222' });
            // addr.setValue({ fieldId: 'addr3', value: 'addr33' });
            // log.debug('state',addr.getValue({ fieldId: 'state'}))
            // var orderid = ord.save();
            // log.debug('orderid', orderid)
            return results
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
                // var obj = JSON.parse(mapContext.value);
                log.debug('mapContext.value', mapContext.value);
                var general_preferences = config.load({ type: config.Type.COMPANY_PREFERENCES });
                var dateFormat = general_preferences.getValue({ fieldId: 'DATEFORMAT' });
                log.debug('dateFormat', dateFormat);
                const date = moment().subtract(mapContext.value, 'days').format(dateFormat);
                log.debug('dateFormat date', date);
                // return
                var items = [
                    '517'
                ]
                var us_states = [
                    'AL',
                    'AK',
                    'AZ',
                    'AR',
                    'AA',
                    'AE',
                    'AP',
                    'CA',
                    'CO',
                    'CT',
                    'DE',
                    'DC',
                    'FL',
                    'GA',
                    'HI',
                    'ID',
                    'IL',
                    'IN',
                    'IA',
                    'KS',
                    'KY',
                    'LA',
                    'ME',
                    'MD',
                    'MA',
                    'MI',
                    'MN',
                    'MS',
                    'MO',
                    'MT',
                    'NE',
                    'NV',
                    'NH',
                    'NJ',
                    'NM',
                    'NY',
                    'NC',
                    'ND',
                    'OH',
                    'OK',
                    'OR',
                    'PA',
                    'PR',
                    'RI',
                    'SC',
                    'SD',
                    'TN',
                    'TX',
                    'UT',
                    'VT',
                    'VA',
                    'WA',
                    'WV',
                    'WI',
                    'WY'
                ]
                var ca_states = [
                    'AB',
                    'BC',
                    'MB',
                    'NB',
                    'NL',
                    'NT',
                    'NS',
                    'NU',
                    'ON',
                    'PE',
                    'QC',
                    'SK',
                    'YT'
                ]
                var customers = [
                    {
                        customer: '2069',
                        subsidiary: '79',
                        currency: '3',
                        country: 'CA',
                        states: ca_states,
                        locations: ['1484', '1513']
                    },
                    {
                        customer: '2072',
                        subsidiary: '77',
                        currency: '2',
                        country: 'US',
                        states: us_states,
                        locations: [
                            '1717',
                            '2138',
                            '1568',
                            '1482']
                    },
                    {
                        customer: '2065',
                        subsidiary: '81',
                        currency: '2',
                        country: 'US',
                        states: us_states,
                        locations: [
                            '1703'
                        ]
                    }
                ]
                for (let m = 0; m < customers.length; m++) {

                    const customer = customers[m];
                    for (let index = 0; index < customer.locations.length; index++) {
                        const location = customer.locations[index];
                        var ord = record.create({ type: 'salesorder', isDynamic: true });
                        // ord.setValue({ fieldId: 'customform', value: 377 });
                        ord.setValue({ fieldId: 'entity', value: customer.customer });
                        ord.setValue({ fieldId: 'subsidiary', value: customer.subsidiary });
                        ord.setValue({ fieldId: 'orderstatus', value: 'B' });
                        ord.setText({ fieldId: 'trandate', text: date });
                        ord.setValue({ fieldId: 'currency', value: customer.currency });
                        ord.setValue({ fieldId: 'otherrefnum', value: 'testOrder' + mapContext.value + customer.customer });
                        // var nn = customer.locations.length;
                        // var ii = Math.floor(Math.random() * (nn + 1))
                        var nnn = customer.states.length;
                        var ll = Math.floor(Math.random() * (nnn + 1))
                        ord.setValue({ fieldId: 'location', value: location });
                        ord.setValue({ fieldId: 'memo', value: '测试预测销量用订单' + customer.states[ll] + ', ll=' + ll });
                        for (let n = 0; n < items.length; n++) {
                            ord.selectNewLine({ sublistId: 'item' });
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: items[n] });
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: location });
                            var qty = Math.floor(Math.random() * 33);
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty });
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 150 });
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: qty * 150 });
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: -7 });
                            ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'isclosed', value: true });
                            ord.commitLine({ sublistId: 'item' });
                        }
                        var addr = ord.getSubrecord({ fieldId: 'shippingaddress' });
                        addr.setValue({ fieldId: 'country', value: customer.country });
                        addr.setValue({ fieldId: 'city', value: 'shipToCtiy' });
                        addr.setValue({ fieldId: 'state', value: customer.states[ll] }); //
                        addr.setValue({ fieldId: 'zip', value: '123456' });
                        addr.setValue({ fieldId: 'addrphone', value: '1234567890' });
                        addr.setValue({ fieldId: 'addressee', value: 'test address' });
                        addr.setValue({ fieldId: 'addr1', value: 'addr1' });
                        addr.setValue({ fieldId: 'addr2', value: 'addr2' });
                        addr.setValue({ fieldId: 'addr3', value: 'addr3' });
                        ord.setValue({ fieldId: 'custbody_swc_salesorder_state', value: customer.states[ll] });

                        var orderid = ord.save();
                        log.debug('orderid', orderid)
                    }


                }

            } catch (error) {
                log.error("map error", error)
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

        //根据下个月日期为基准，计算上季度开始时间和结束时间
        function getLastQuarter(dateFormat) {
            // const currentDate = new Date();//moment().startOf('month').add(1, 'months');//new Date();
            const now = new Date();//当前时间
            log.debug('当前月份', now.getMonth());
            const currentDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);//下个月初的时间
            log.debug('currentDate:', currentDate);
            log.debug('now:', now);
            const currentMonth = currentDate.getMonth(); // 0-11, 0代表一月
            const currentYear = currentDate.getFullYear();
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
            log.debug('上季度开始日期:', moment(lastQuarterStart.toISOString()).format(dateFormat)); // 格式化为YYYY-MM-DD
            log.debug('上季度结束日期:', moment(lastQuarterEnd.toISOString()).format(dateFormat));

            return {
                start: moment(lastQuarterStart.toISOString()).format(dateFormat),
                end: moment(lastQuarterEnd.toISOString()).format(dateFormat)
            };
        }

        /**
         * 
         * @param {*} itemId 
         * @returns 返回货品的在库数量和平均成本
         */
        function calculateKitAvailability(itemId, type) { // itemId: Kit物品的内部ID
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
            let kitAvailableQuantity = Number.MAX_SAFE_INTEGER;

            // 2. 创建搜索来批量查询所有组件的库存余额
            let inventoryBalanceSearch = search.create({
                type: search.Type.ITEM,
                filters: [
                    ['internalid', 'anyof', componentItemIds]
                    // 可以添加location过滤器来指定特定仓库[1](@ref)
                ],
                columns: [
                    { name: 'internalid', summary: 'GROUP' }, // 组件物品ID
                    { name: 'locationquantityavailable', summary: 'SUM' }, // 可用数量
                    { name: 'locationquantityonhand', summary: 'SUM' }, // 在手数量
                    { name: 'formulanumeric', formula: "{locationaveragecost}*{locationquantityonhand}", summary: 'SUM' } // 总货值
                ]
            });

            var kitAverageCost = 0;
            // 3. 执行搜索并处理结果
            inventoryBalanceSearch.run().each(function (result) {
                log.debug('inventoryBalanceSearch result', result)
                let componentItemId = result.getValue({ name: 'internalid', summary: 'GROUP' });
                let componentAvailableQty = parseFloat(result.getValue({ name: 'locationquantityonhand', summary: 'SUM' })) || 0;
                let componentCost = parseFloat(result.getValue(result.columns[3])) || 0;
                let componentAverageCost = Math.round(componentCost / componentAvailableQty, 2);
                let qtyNeededPerKit = componentQtys[componentItemId];

                // 计算当前组件能支持多少个Kit
                let kitsSupportedByThisComponent = Math.floor(componentAvailableQty / qtyNeededPerKit);

                // Kit的可用数量是所有组件支持数量的最小值
                kitAvailableQuantity = Math.min(kitAvailableQuantity, kitsSupportedByThisComponent);

                kitAverageCost = kitAverageCost + componentAverageCost;

                return true; // 继续处理下一个结果
            });

            // 如果没有任何组件（极端情况），则Kit可用数量为0
            if (kitAvailableQuantity === Number.MAX_SAFE_INTEGER) {
                kitAvailableQuantity = 0;
                kitAverageCost = 0;
            }

            return { "quantity": kitAvailableQuantity, "cost": kitAverageCost };
        }

        /**
         * 
         * @param {*} itemId 套装货品ID
         * @returns 返回套装成员货品对象，key为成员货品ID，value为成员货品数量，
         */
        function getKitComponents(itemId) {
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

        return { getInputData, map, reduce, summarize }

    });
