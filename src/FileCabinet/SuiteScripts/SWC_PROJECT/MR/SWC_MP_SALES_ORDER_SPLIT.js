/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @description 销售订单未税拆分
 */
define(['N/record', 'N/search', '../common/SWC_Utils.js', 'N/runtime'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search, utils, runtime) => {
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
            let results = [];
            try {
                let platformOrderId = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_dpt_platformorderid' }); // 平台订单编号，针对多平台
                let purchaseOrderid = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wfs_purchaseorderid' }); // 采购订单编号，针对沃尔玛
                log.debug('platformOrderId', platformOrderId)
                const dptFilters = [
                    // 已处理价税为否
                    { name: 'custrecord_swc_dpt_processed', operator: 'is', values: 'F' },
                    // 测试
                    // { name: 'custrecord_swc_dpt_store', operator: 'anyof', values: ['2067', '2072'] },
                    // { name: 'internalid', operator: 'anyof', values: ['241831']},
                ];
                if (platformOrderId) {
                    dptFilters.push({
                        name: 'custrecord_swc_dpt_platformorderid', operator: 'is', values: platformOrderId,
                    });
                }
                const dptColumns = [
                    // 内部ID
                    { name: 'internalid' },
                    // 主信息
                    { name: 'custrecord_swc_dptmaininfo' },
                    // 所属平台
                    { name: 'custentity_swc_platform', join: 'custrecord_swc_dpt_store' },
                    // 平台订单编号
                    { name: 'custrecord_swc_dpt_platformorderid' },
                    // 平台流水号
                    { name: 'custrecord_swc_dpt_platformordernumber' },
                ];
                // 查询多平台订单缓存-积加表
                paginationGetRecord('customrecord_swc_dpt_order', dptFilters, dptColumns, (rec) => {
                    log.debug('查询多平台订单缓存 platform', rec.getValue(rec.columns[2]));
                    results.push({
                        internalid: rec.getValue(rec.columns[0]),
                        info: JSON.parse(rec.getValue(rec.columns[1])),
                        platform: rec.getValue(rec.columns[2]),
                        platformOrderId: rec.getValue(rec.columns[3]),
                        platformOrderNumber: rec.getValue(rec.columns[4]),
                        orderType: 'dpt',
                    });
                });

                const wfsFilters = [
                    // 已处理价税为否
                    { name: 'custrecord_swc_wfs_processed', operator: 'is', values: 'F' },
                    // 测试
                    // { name: 'internalid', operator: 'anyof', values: ['2202'] },
                ];
                if (purchaseOrderid) {
                    wfsFilters.push({
                        name: 'custrecord_swc_wfs_purchaseorderid', operator: 'is', values: purchaseOrderid,
                    });
                }
                const wfsColumns = [
                    // 内部ID
                    { name: 'internalid' },
                    // 主信息
                    { name: 'custrecord_swc_wfs_maininfo' },
                    // 店铺
                    { name: 'custrecord_swc_wfs_shop' },
                    // 采购订单编号
                    { name: 'custrecord_swc_wfs_purchaseorderid' }
                ]
                // 查询沃尔玛订单缓存-积加表
                paginationGetRecord('customrecord_swc_walmart_order', wfsFilters, wfsColumns, (rec) => {
                    results.push({
                        internalid: rec.getValue(rec.columns[0]),
                        info: JSON.parse(rec.getValue(rec.columns[1])),
                        store: rec.getValue(rec.columns[2]),
                        purchaseOrderId: rec.getValue(rec.columns[3]),
                        orderType: 'walmart',
                    });
                });

            } catch (error) {
                log.error('getInputData error', error);
            }
            log.debug('getInputData results', results);
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
                const oData = JSON.parse(mapContext.value);
                log.debug('map oData', oData);
                const orderType = oData.orderType;
                const internalid = oData.internalid;

                // 更新多平台订单缓存-积加表
                if (orderType === 'dpt') {
                    const { info, platformOrderId, platformOrderNumber, platform } = oData;
                    const isObject = typeof info === 'object' && info != null;
                    const oInfo = isObject ? info : {};

                    let oDptRecord = record.load({ type: 'customrecord_swc_dpt_order', id: internalid });
                    log.debug('多平台 oDptRecord', oDptRecord);
                    if (oDptRecord) {
                        let currentData = {
                            platformId: oInfo.platformId,
                            erpShopName: oInfo.erpShopName,
                            platformOrderId: platformOrderId,
                            platformOrderNumber: platformOrderNumber,
                            items: []
                        }

                        if (oInfo.hasOwnProperty('items') && Array.isArray(oInfo.items)) {
                            let taxRate;
                            let totalPrice;
                            let bfPrice = 0;
                            let isEdit = false;
                            let buyerPayShipFee = '0.00';
                            // 计算规则类型
                            let computedRuleType = 0;
                            // 收件人国家
                            const receiverAddressCountryCode = oInfo.receiverAddressCountryCode;
                            const totalAmount = oInfo.totalAmount; // 订单总金额

                            // 平台id
                            const platformValue = Number(platform);

                            // 店铺+国家
                            // 3: Home Depot-CA
                            if (receiverAddressCountryCode === 'CA' && platformValue === 3) {
                                // 收件人地区或州
                                const receiverAddressState = oInfo.receiverAddressState;
                                log.debug('receiverAddressState', receiverAddressState);
                                taxRate = getEuropeTaxRate(receiverAddressCountryCode, receiverAddressState);
                                computedRuleType = 1;
                                isEdit = true;
                            }

                            // 15: Cdiscount-FR
                            if (receiverAddressCountryCode === 'FR' && platformValue === 15) {
                                taxRate = getEuropeTaxRate('FR', 'FR');
                                computedRuleType = 1;
                                isEdit = true;
                            }

                            // Kaufland-DE OTTO-DE 
                            if (receiverAddressCountryCode === 'DE' && (platformValue === 6 || platformValue === 25)) {
                                taxRate = getEuropeTaxRate('DE', 'DE');
                                computedRuleType = 1;
                                isEdit = true;
                            }

                            // Home Depot-US Wayfair-US 4: Lowe's-US Overstock-US Walmart_DSV_DeerValley_US
                            const usPlatformArr = [2, 3, 4, 10, 13];
                            if (receiverAddressCountryCode === 'US' && usPlatformArr.includes(platformValue)) {
                                computedRuleType = 2;
                                isEdit = true;
                            }

                            // Shopify-US、Shopify-UK、Shopify-EU、Shopify-CA
                            log.debug('receiverAddressCountryCode', receiverAddressCountryCode);
                            if (['US', 'UK', 'FR', 'CA', 'DE', 'BE'].includes(receiverAddressCountryCode) && platformValue === 9) {
                                log.debug('匹配成功')
                                computedRuleType = 3;
                                isEdit = true;
                                const filters = oInfo.items.filter(item => item.msku && item.msku.indexOf('XMHP') > -1);
                                if (filters.length > 0) {
                                    bfPrice = filters[0].productTotalPrice;
                                }
                                totalPrice = utils.subSumIsNumber(totalAmount, bfPrice, 2);
                            }

                            // manomano-FR manomano-DE
                            if (['FR', 'DE', 'UK', 'GB'].includes(receiverAddressCountryCode) && platformValue === 5) {
                                computedRuleType = 4;
                                isEdit = true;
                                totalPrice = totalAmount;
                            }

                            // 8: rona 2: Wayfair
                            // rona-ca Wayfair-CA
                            if (receiverAddressCountryCode === 'CA' && (platformValue === 8 || platformValue === 2)) {
                                // 收件人地区或州
                                const receiverAddressState = oInfo.receiverAddressState;
                                log.debug('receiverAddressCountryCode', receiverAddressCountryCode);
                                log.debug('receiverAddressState', receiverAddressState);
                                taxRate = getEuropeTaxRate(receiverAddressCountryCode, receiverAddressState);
                                computedRuleType = 5;
                                isEdit = true;
                            }

                            // Wayfair-EU
                            if (['UK', 'GB', 'IE'].includes(receiverAddressCountryCode) && platformValue === 2) {
                                taxRate = getEuropeTaxRate(receiverAddressCountryCode, receiverAddressCountryCode);
                                computedRuleType = 5;
                                isEdit = true;
                            }

                            // 7: Leroy Merlin-FR
                            if (receiverAddressCountryCode === 'FR' && platformValue === 7) {
                                computedRuleType = 6;
                                isEdit = true;
                            }

                            // 14: TEMU-US
                            if (receiverAddressCountryCode === 'US' && platformValue === 14) {
                                computedRuleType = 7;
                                isEdit = true;
                            }

                            // 26: BQ_DeerValley_UK
                            if (['UK', 'GB'].includes(receiverAddressCountryCode) && platformValue === 26) {
                                taxRate = getEuropeTaxRate('UK', 'UK');
                                computedRuleType = 8;
                                isEdit = true;
                            }

                            const itemArr = sortByUnitPriceDesc(oInfo.items);
                            // 未税总原销售额，含税/含折扣的销售额总额
                            const sumSalePrice = itemArr.reduce((sum, item) => utils.addSumIsNumber(sum, item.productTotalPrice, 4), 0);
                            for (let i = 0; i < itemArr.length; i++) {
                                const currentItem = oInfo.items[i];
                                // 总销售额
                                const productTotalPrice = currentItem.productTotalPrice;
                                const productUnitPrice = currentItem.productUnitPrice;
                                // sku
                                let sku = currentItem.sku;
                                // sku 未税无折扣销售额
                                let skuBaseAmount = 0

                                let unitPriceExclTax = productUnitPrice;
                                let tax = '0.00';

                                if (computedRuleType === 1) {
                                    unitPriceExclTax = getUnitPriceExclTax(taxRate, productUnitPrice);
                                    tax = taxRate != 0 ? utils.subSumIsNumber(productUnitPrice, unitPriceExclTax, 2) : '0.00';
                                }

                                if (computedRuleType === 2) {
                                    unitPriceExclTax = productUnitPrice;
                                    tax = '0.00';
                                }
                                // 针对Shopify平台
                                if (computedRuleType === 3) {
                                    log.debug('Shopify or manomano 计算税金和未税价格');
                                    const msku = currentItem.msku;
                                    // unitPriceExclTax = productUnitPrice;
                                    // 针对保费类商品，税金为0
                                    if (msku.indexOf('XMHP') > -1) {
                                        sku = 'XMHPPSKU';
                                        tax = '0.00';
                                    } else {
                                        tax = getShippifyAndManoTax(oInfo.tax, productTotalPrice, sumSalePrice);
                                    }
                                    log.debug('infoTax', oInfo.tax)
                                    log.debug('productTotalPrice', productTotalPrice)
                                    log.debug('sumSalePrice', sumSalePrice)
                                    log.debug('tax', tax)
                                    // 处理60 Shopify_DeerValley_US 32 Shopify_DeerValley_EU 51 Shopify_DeerValley_UK
                                    // const handleStore = ['Shopify_DeerValley_US', 'Shopify_DeerValley_EU', 'Shopify_DeerValley_UK']
                                    // if (handleStore.includes(currentData.erpShopName)) {
                                    // }
                                    // 获取订单的未税无折扣销售额
                                    const billBaseAmount = utils.subSumIsNumber(utils.subSumIsNumber(sumSalePrice, oInfo.tax), oInfo.discountFee)
                                    unitPriceExclTax = getShippifySkuBaseAmount(billBaseAmount, productTotalPrice, sumSalePrice)
                                    log.debug('unitPriceExclTax', unitPriceExclTax)
                                    // log.debug('currentData', currentData)
                                };

                                // 针对manomano平台 处理运费
                                if (computedRuleType === 4) {
                                    const msku = currentItem.msku;
                                    unitPriceExclTax = productUnitPrice;
                                    // 针对保费类商品，税金为0
                                    if (msku.indexOf('XMHP') > -1) {
                                        sku = 'XMHPPSKU';
                                        tax = '0.00';
                                    } else {
                                        tax = getShippifyAndManoTax(oInfo.tax, productTotalPrice, totalPrice);
                                    }

                                    buyerPayShipFee = oInfo.buyerPayShipFee;
                                    if (Number(buyerPayShipFee) === 0) {
                                        buyerPayShipFee = '0.00';
                                    } else {
                                        // 针对最后一行SKU运费，避免因四舍五入导致的运费不准确问题
                                        if (i === oInfo.items.length - 1) {
                                            const prevTax = currentData.items.reduce((sum, item) => {
                                                return utils.addSumIsNumber(sum, item.buyerPayShipFee, 2);
                                            }, 0);
                                            buyerPayShipFee = utils.subSumIsNumber(buyerPayShipFee, prevTax, 2);
                                        } else {
                                            // 将运费按比例分摊到每一行SKU
                                            buyerPayShipFee = getShippifyAndManoTax(buyerPayShipFee, productTotalPrice, totalPrice);
                                        }
                                    }
                                };

                                // 处理rona-ca、wayfair-ca、wayfair-EU
                                if (computedRuleType === 5) {
                                    unitPriceExclTax = productUnitPrice;
                                    tax = taxRate != 0 ? utils.mulSumIsNumber(parseFloat(productUnitPrice), taxRate, 2) : '0.00';
                                }

                                // 处理Leroy Merlin-FR
                                if (computedRuleType === 6) {
                                    unitPriceExclTax = productUnitPrice;
                                    const price = utils.divSumIsNumber(parseFloat(productUnitPrice), totalAmount, 2);
                                    tax = oInfo.tax && oInfo.tax != 0 ? utils.mulSumIsNumber(oInfo.tax, price, 2) : '0.00';
                                }

                                // 处理TEMU-US
                                if (computedRuleType === 7) {
                                    unitPriceExclTax = productUnitPrice;
                                }

                                // 处理BQ_DeerValley_UK
                                if (computedRuleType === 8) {
                                    const value = utils.divSumIsNumber(parseFloat(productUnitPrice), 1.2, 2);
                                    unitPriceExclTax = utils.mulSumIsNumber(value, taxRate, 2);
                                    const price = utils.divSumIsNumber(parseFloat(productUnitPrice), totalAmount, 2);
                                    tax = oInfo.tax && oInfo.tax != 0 ? utils.mulSumIsNumber(oInfo.tax, price, 2) : '0.00';
                                }

                                log.debug('buyerPayShipFee:', buyerPayShipFee);
                                log.debug('tax', tax)
                                currentData.items.push({
                                    sku: sku,
                                    msku: currentItem.msku,
                                    unitPriceExclTax: unitPriceExclTax, // 未税商品单价
                                    tax: tax, // 税金
                                    buyerPayShipFee: buyerPayShipFee // 买家运费
                                });
                            }

                            log.debug('custrecord_swc_dpt_js', currentData)
                            log.debug('isEdit', isEdit)
                            if (isEdit) {
                                // 针对Shopify、 manomano 或者 Leroy Merlin-FR 或者 BQ_DeerValley_UK 税金 分摊后差异处理，差异值添加到第一个sku中
                                if ([3, 4, 6, 8].includes(computedRuleType)) {
                                    const taxValue = parseFloat(oInfo.tax);
                                    const total = currentData.items.reduce((acc, cur) => {
                                        const tax = parseFloat(cur.tax);
                                        return utils.addSumIsNumber(acc, tax, 2)
                                    }, 0);
                                    if (taxValue != total) {
                                        const values = utils.subSumIsNumber(taxValue, total, 2);
                                        // 差异税金添加到第一个sku中
                                        const firstTax = currentData.items[0].tax;
                                        currentData.items[0].tax = utils.addSumIsNumber(firstTax, values, 2);
                                    }
                                }
                                // // 根据处理后的数据进行分摊
                                // currentData.items.map(item => {
                                //     const saleTaxRate = 0
                                //     if (item.skuBaseAmount) {
                                //         saleTaxRate = utils.divSumIsNumber(item.tax, item.skuBaseAmount, 4)
                                //     }
                                //     item.saleTaxRate = saleTaxRate
                                // })

                                log.debug('isEdit', isEdit)
                                oDptRecord.setValue({ fieldId: 'custrecord_swc_dpt_js', value: JSON.stringify(currentData) });
                                oDptRecord.setValue({ fieldId: 'custrecord_swc_dpt_processed', value: true });
                                oDptRecord.save();
                            }
                        }

                    };
                }
                // 更新沃尔玛订单缓存-积加表
                if (orderType === 'walmart') {
                    const { info, purchaseOrderId } = oData;
                    const oInfo = Array.isArray(info) ? info : [];

                    let oRecord = record.load({ type: 'customrecord_swc_walmart_order', id: internalid });
                    log.debug('沃尔玛 oRecord', oRecord);
                    if (oRecord) {
                        let currentData = {
                            marketName: '',
                            purchaseOrderId,
                            items: []
                        }

                        for (let i = 0; i < oInfo.length; i++) {
                            const currentItem = oInfo[i];
                            // 订单总金额，不含税
                            const chargeItemPrice = currentItem.chargeItemPrice;
                            // 税金
                            const taxAmount = currentItem.taxAmount;
                            // 采购订单行编号
                            const lineNumber = currentItem.lineNumber;

                            currentData.items.push({
                                sku: currentItem.sku,
                                msku: currentItem.itemMsku,
                                lineNumber,
                                unitPriceExclTax: chargeItemPrice,
                                tax: taxAmount,
                                // 写死运费
                                buyerPayShipFee: '0.00'
                            });
                        }
                        if (oInfo.length > 0) {
                            currentData.marketName = oInfo[0].marketName;
                        }
                        log.debug('custrecord_swc_wfs_js', currentData)

                        oRecord.setValue({ fieldId: 'custrecord_swc_wfs_js', value: JSON.stringify(currentData) });
                        oRecord.setValue({ fieldId: 'custrecord_swc_wfs_processed', value: true });
                        oRecord.save();
                    };
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
            try {
                const mapSummary = summaryContext.mapSummary;
                log.debug('mapSummary', mapSummary);

            } catch (error) {
                log.error('summarize error', error);
            }
        }

        /**
         * @description 根据商品单价降序排序
         * @param arr 数组
         * **/
        const sortByUnitPriceDesc = (arr) => {
            return arr.sort((a, b) => {
                const priceA = parseFloat(a.productUnitPrice);
                const priceB = parseFloat(b.productUnitPrice);
                return priceB - priceA; // 降序
            });
        }

        /**
         * @param totalTax 总税金
         * @param productTotalPrice 商品总价
         * @param totalPrice 订单总价
         * @return tax 金额
         * **/
        const getShippifyAndManoTax = (totalTax, productTotalPrice, totalPrice) => {
            let tax = '0.00';
            if (totalTax && totalTax != 0) {
                tax = utils.mulSumIsNumber(totalTax, utils.divSumIsNumber(productTotalPrice, totalPrice, 2), 2);
            }
            return tax;
        }

        /**
         * @param billBaseAmount 订单未税无折扣销售额
         * @param productTotalPrice 商品总价
         * @param totalPrice 订单总价
         * @return billBaseAmount 商品不含税不含优惠价销售额
         * **/
        const getShippifySkuBaseAmount = (billBaseAmount, productTotalPrice, totalPrice) => {
            let skuBaseAmount = '0.0000';
            if (billBaseAmount && billBaseAmount != 0) {
                // sku 未税无折扣销售额
                skuBaseAmount = utils.mulSumIsNumber(billBaseAmount, utils.divSumIsNumber(productTotalPrice, totalPrice, 4), 4)
            }
            return skuBaseAmount;
        }

        /**
         * @description 查找加拿大和欧洲对应税率映射表
         * @param country 国家
         * @param state 地区(州)
         * @return 得到税率
         * **/
        const getEuropeTaxRate = (country, state) => {
            let taxRate = 0;
            let countryId;
            log.debug('getEuropeTaxRate country', country);
            log.debug('getEuropeTaxRate state', state);

            search.create({
                type: "customlist_swc_dp_country",
                filters: [
                    ["name", "contains", country]
                ],
                columns: [
                    search.createColumn({ name: "name", label: "名称" }),
                    search.createColumn({ name: "internalid", label: "内部 ID" })
                ]
            }).run().each(function (rec) {
                countryId = rec.getValue(rec.columns[1]);
                log.debug('找到国家ID', countryId)
                return false;
            });

            if (countryId) {
                search.create({
                    type: 'customrecord_swc_ca_europe_ys_tax_rate',
                    filters: [
                        ["custrecord_swc_rr_country", "anyof", countryId],
                        "AND",
                        ["custrecord_swc_rr_state_qc", "is", state]
                    ],
                    columns: [
                        // 税率
                        { name: 'custrecord_swc_rr_rate' },
                    ]
                }).run().each(function (rec) {
                    log.debug('找到税率', rec)
                    taxRate = rec.getValue(rec.columns[0]);
                    return false;
                });
            }
            return taxRate;
        }

        /**
         * @description 获取未税商品价格 公式: 销售额/(1+税率)
         * @param taxRate 0:表示未找到税率，则返回销售额
         * **/
        const getUnitPriceExclTax = (taxRate, productUnitPrice) => {
            if (taxRate == 0) {
                return productUnitPrice;
            }
            const rate = utils.addSumIsNumber(1, taxRate, 2);
            return utils.divSumIsNumber(productUnitPrice, rate, 2);
        }

        /**
         * @param recordName 表名
         * @param filters 过滤器
         * @param columns 返回字段
         * @param callback 回调函数
         * **/
        const paginationGetRecord = (recordName, filters, columns, callback) => {
            const oSearch = search.create({
                type: recordName,
                filters: filters,
                columns: columns,
            });
            // 分页处理
            const pageData = oSearch.runPaged({
                pageSize: 1000
            });

            const totalCount = pageData.count; //总数
            const pageCount = pageData.pageRanges.length; //页数

            log.debug('总数 totalCount', totalCount);
            log.debug('页数 pageCount', pageCount);

            for (let i = 0; i < pageCount; i++) {
                pageData.fetch({
                    index: i
                }).data.forEach(function (rec) {
                    callback && callback(rec);
                    return true;
                });
            }
        }

        return { getInputData, map, reduce, summarize }

    });
