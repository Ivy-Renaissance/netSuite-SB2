/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @description 对外接口，小鹿拉取NS SKU列表
 */
define(['N/record', 'N/runtime', 'N/search'],
    /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
    (record, runtime, search) => {
        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
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
         */
        const post = (requestBody) => {
            log.debug('requestBody', requestBody);
            let result = {};
            try {
                
                let page = requestBody.page;
                let pageSize = requestBody.pageSize;
                if (page && pageSize) {
                    result = searchRecord(page, pageSize);
                } else {
                    result = { code: 400, msg: "缺少必要参数" };
                }
            } catch (error) {
                log.error('查询失败', error);
                let msg = error.message ? error.message : error;
                result = { code: 201, msg: "查询失败:" + msg }
            }
            return result;
        }

        /**
         * 查询货品
         * @param {string} page 页码
         * @param {string} pageSize 每页条数
         * @returns {Object} 货品信息
         *
         **/
        const searchRecord = (page, pageSize) => {
            let result = {};
            const skuData = [];
            let errorMsg = [];
            let totalCount = 0;
            let pageCount = 0;
            const params = {
                page: page || 1,
                pageSize: pageSize || 500,
            }
            try {
                // 查询货品表
                const oSearch = search.create({
                    type: 'item',
                    filters: [
                        ["type","anyof","InvtPart","Assembly"], 
                        "AND", 
                        ["custitem_swc_ejlm","noneof","@NONE@"], 
                        "AND", 
                        ["displayname","isnotempty",""]
                    ],
                    columns: [
                        search.createColumn({name: "itemid", label: "名称"}),
                        search.createColumn({name: "displayname", label: "显示名称"}),
                        search.createColumn({name: "custitem_swc_packagel", label: "包装长（CM）"}),
                        search.createColumn({name: "custitem_swc_packagew", label: "包装宽（CM）"}),
                        search.createColumn({name: "custitem_swc_packageh", label: "包装高（CM）"}),
                        search.createColumn({name: "custitem_swc_packageweight", label: "包装重（KG）"}),
                        search.createColumn({name: "custitem_swc_ejlm", label: "二级类目"}),
                        search.createColumn({name: "custitem_swc_package_seat_height", label: "包装座高(CM)"})
                    ]
                });
                // 分页处理
                const pageData = oSearch.runPaged({
                    pageSize: params.pageSize
                });

                totalCount = pageData.count; //总数
                pageCount = pageData.pageRanges.length; //页数
                log.debug('总数', totalCount);

                if (params.page <= pageCount) {
                    log.debug('页数', pageCount);
                    pageData.fetch({
                        index: params.page - 1
                    }).data.forEach(function (rec) {
                        // log.debug('rec', rec);
                        // log.debug('rec.ejlm', rec.getText(rec.columns[6]));
                        skuData.push({
                            nsSkuCode: rec.getValue(rec.columns[0]),
                            skuCode: rec.getValue(rec.columns[1]),
                            packageLength: rec.getValue(rec.columns[2]),
                            packageWidth: rec.getValue(rec.columns[3]),
                            packageHeight: rec.getValue(rec.columns[4]),
                            packageWeight: rec.getValue(rec.columns[5]),
                            ejlm: rec.getText(rec.columns[6]),
                            packageSeatHeight: rec.getValue(rec.columns[7]),
                        });
                        return false;
                    });
                }
            } catch (error) {
                log.error('查询失败', error);
                let msg = error.message ? error.message : error;
                errorMsg.push("查询失败:" + msg);
            }

            if (errorMsg.length === 0) {
                result.code = 200;
                result.msg = '查询成功';
                result.data = {
                    list: skuData,
                    totalCount: totalCount,
                    pageCount: pageCount,
                    currentPage: params.page,
                    pageSize: params.pageSize,
                };
            } else {
                result.code = 201;
                result.msg = '查询失败:' + errorMsg.join(';');
            }
            
            return result;
        }

        return {get, put, post }

    });
