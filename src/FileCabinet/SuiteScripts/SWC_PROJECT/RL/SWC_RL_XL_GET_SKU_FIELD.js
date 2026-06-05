/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @description 获取 SKU 字段值
 */
define(['N/record', 'N/search'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search) => {
        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         * 
         */
        const get = (requestParams) => {
        }

        /**
         * Defines the function that is executed when a PUT request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body are passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const put = (requestBody) => {

        }

        /**
         * Defines the function that is executed when a POST request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         * @param requestBody.skuCode sku编码
         */
        const post = (requestBody) => {
            log.debug('requestBody', requestBody);
            let result = {};
            try {
                let skuCode = requestBody.skuCode;
                if (skuCode && skuCode.length > 0) {
                    // 限制100
                    if (skuCode.length > 100) {
                        throw '限制100条数据,请重新调用';
                    } else {
                        result = searchRecord(skuCode);
                    }
                } else {
                    result = { code: 400, msg: "缺少必要参数" };
                }
                log.debug('doGet result', result);
            } catch (err) {
                log.error('error', err);
                let msg = err.message ? err.message : err;
                result = { code: 201, msg: "获取SKU字段失败:" + msg }
            }
            return result;
        }

        /**
         * 查询 SKU 字段值
         * @param {string} skuCode - SKU Code
         * @returns {Object} SKU 字段值
         *
         **/
        const searchRecord = (skuCode) => {
            let result = {};
            let arrData = [];
            let skuData = [];
            let errorMsg = [];
            
            try {
                // 查询产品档案
                skuCode.forEach(skuName => {
                    search.create({
                        type: "item",
                        filters: [
                            { name: 'displayname', operator: 'is', values: skuName },
                        ],
                        columns: [
                            search.createColumn({name: "itemid", label: "名称"}),
                            search.createColumn({name: "custitem_swc_new_old", label: "新老品"}),
                            search.createColumn({name: "custitem_swc_cplb", label: "产品类别"}),
                            search.createColumn({name: "internalid", label: "内部 ID"}),
                        ]
                    }).run().each(function (rec) {
                        let data = {
                            sku: skuName,
                        };
                        log.debug('产品档案：已存在记录', rec);
                        const id = rec.getValue(rec.columns[3]);
                        data.internalid = id;

                        const itemid = rec.getValue('itemid');
                        log.debug('产品档案：货品名称/编码', itemid)
                        data.nsSkuCode = itemid;

                        const newOld = rec.getText('custitem_swc_new_old');
                        log.debug('产品档案：新老品', newOld)
                        data.newOld = newOld;
                        const productCategory = rec.getText('custitem_swc_cplb');
                        log.debug('产品档案：产品类别', productCategory)
                        data.productCategory = productCategory;
                        log.debug('等级：结果', data);
                        arrData.push(data);
                        return false;
                    });
                })
                
            } catch (err) {
                log.error('查询产品档案失败', err);
                errorMsg.push('查询产品档案失败:' + (err.message ? err.message : err));
            }

            // 查询产品等级表
            if (arrData.length > 0) {
                
                try {
                    arrData.forEach(item => {
                        let skuItem = {
                            sku: item.sku,
                            newOld: item.newOld,
                            productCategory: item.productCategory,
                            nsSkuCode: item.nsSkuCode,
                        };

                        if (item.nsSkuCode) {
                            search.create({
                                type: "customrecord_swc_sku_level",
                                filters: [
                                    ["custrecord_swc_sl_sku", "anyof", item.internalid]
                                ],
                                columns:
                                [
                                    search.createColumn({name: "custrecord_swc_sl_level", label: "产品等级"}),
                                    search.createColumn({name: "name", label: "名称"})
                                ]
                            }).run().each(function (rec) {
                                log.debug('等级：已存在记录', rec)
                                const level = rec.getText('custrecord_swc_sl_level');
                                log.debug('等级：结果', level)
                                skuItem.level = level;
                                return false;
                            });
                            skuData.push(skuItem);
                        }
                    })
                    
                } catch (err) {
                    log.error('查询产品等级表失败', err);
                    errorMsg.push('查询产品等级表失败:' + (err.message ? err.message : err));
                }
            }

            if (errorMsg.length === 0) {
                result.code = 200;
                result.msg = '查询成功';
                result.data = skuData;
            } else {
                result.code = 201;
                result.msg = '查询失败:' + errorMsg.join(';');
            }

            return result;
        }

        return {
            get, 
            put, 
            post
        }

    });
