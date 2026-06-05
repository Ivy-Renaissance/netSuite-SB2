/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *@description 分页查询测评订单
 */

define(['N/search', 'N/error'], (search, error) => {

    /**
     * POST 查询接口
     */
    const post = (context) => {

        let result = {
            code: 200,
            message: 'success',
            pageCount: 0,
            totalCount: 0,
            data: []
        };

        try {

            // 解析参数
            let requestBody = getBody(context);

            let page = requestBody.page || 0;
            let pageSize = requestBody.pageSize || 50;

            // 创建查询
            let mySearch = search.create({
                type: search.Type.SALES_ORDER,

                filters: [
                    ['custbody_swc_evaluation', 'is', 'T']
                ],

                columns: [
                    search.createColumn({
                        name: 'entity'
                    }),
                    search.createColumn({
                        name: 'tranid'
                    })
                ]
            });

            // 分页执行
            let pagedData = mySearch.runPaged({
                pageSize: pageSize
            });

            let totalCount = pagedData.count;

            let pageCount = pagedData.pageRanges.length;

            let results = [];

            if (page < pageCount) {

                pagedData.fetch({
                    index: page
                }).data.forEach(rec => {

                    results.push({
                        store: rec.getText('entity'),
                        orderNo: rec.getValue('tranid')
                    });

                    return true;
                });
            }

            result.totalCount = totalCount;
            result.pageCount = pageCount;
            result.data = results;

        }
        catch (e) {

            log.error('error', e);

            result.code = 500;
            result.message = e.message;

        }

        return result;
    };


    /**
     * 解析请求 body
     */
    const getBody = (requestBody) => {

        try {

            requestBody =
                typeof requestBody === 'string'
                    ? JSON.parse(requestBody)
                    : requestBody;

        } catch (e) {

            throw error.create({
                name: "400",
                message: "requestBody参数错误"
            });

        }

        return requestBody;
    };


    return {
        post
    };

});