/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *@description 分页查询FBA、CG、Mano仓库库龄
 */
define(['N/error', 'N/record', 'N/search', 'N/runtime', '../common/moment'], function (error, record, search, runtime, moment) {

    function _get(context) {

    }

    function _post(context) {
        var result = { code: 200, message: 'success', pageCount: 0, totalCount: 0, data: [] };
        try {
            log.audit('Body', context);
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            var requestBody = getBody(context);
            var pageSize = requestBody.pageSize;
            var page = requestBody.page;
            var locationType = requestBody.locationType;
            var locationTypeMap = {
                "3PL": 1,
                "FBA": 2,
                "CG": 3,
                "Mano": 4,
                "WFS": 5,
                "CD": 6
            }

            var mySearch = search.create({
                type: 'transaction',
                filters: [
                    { name: 'formulanumeric', formula: 'case when {item.inventorylocation.id} = {location.id} then 1 end', operator: search.Operator.EQUALTO, values: 1 },
                    { name: 'formulanumeric', formula: 'case when {item.assetaccount.id} = {account.id} then 1 end', operator: search.Operator.EQUALTO, values: 1 },
                    { name: 'type', operator: search.Operator.ANYOF, values: ['InvTrnfr', 'InvAdjst', 'Build', 'ItemShip', 'ItemRcpt'] },
                    { name: 'serialnumber', operator: search.Operator.ISNOTEMPTY },
                    { name: 'serialnumberquantity', summary: 'SUM', operator: search.Operator.GREATERTHAN, values: 0 },
                    { name: "custrecord_swc_location_type", join: 'location', operator: search.Operator.IS, values: locationTypeMap[locationType] },
                    { name: "custrecord_swc_location_attribute", join: 'location', operator: search.Operator.ANYOF, values: ['6','7'] },
                    { name: "isinactive", join: 'location', operator: search.Operator.IS, values: false }
                ],
                columns: [
                    { name: "item", summary: "GROUP" },//0
                    { name: "displayname", join: 'item', summary: "GROUP" },//1
                    { name: "custitem_swc_cplb", join: 'item', summary: "GROUP" },//2
                    { name: "custitem_swc_ejlm", join: 'item', summary: "GROUP" },//3
                    { name: "custrecord_swc_location_country", join: 'location', summary: "GROUP" },//4
                    { name: "state", join: 'location', summary: "GROUP" },//5
                    { name: "custrecord_swc_location_attribute", join: 'location', summary: "GROUP" },//6
                    { name: "custrecord_swc_location_type", join: 'location', summary: "GROUP" },//7
                    { name: "custrecord_swc_warehouse_code", join: 'location', summary: "GROUP" },//8
                    { name: "location", summary: "GROUP" },//9
                    { name: "custbody_swc_wms_inbound_no", summary: "MAX" },//10
                    { name: "serialnumber", summary: "GROUP" },//11
                    { name: "serialnumberquantity", summary: "SUM" },//12
                    { name: "trandate", summary: "MIN" },//13
                    { name: "formulanumeric", formula: " CEIL({today}-{trandate})", summary: "MAX" },//14 库龄天数
                    { name: "custitem_swc_packagel", join: 'item', summary: "GROUP" },//15
                    { name: "custitem_swc_packagew", join: 'item', summary: "GROUP" },//16
                    { name: "custitem_swc_packageh", join: 'item', summary: "GROUP" },//17
                    { name: "custitem_swc_total_gross_weight", join: 'item', summary: "GROUP" },//18
                    { name: "custitem_swc_total_volume", join: 'item', summary: "GROUP" },//19
                    { name: "custitem_swc_contain_electricity", join: 'item', summary: "GROUP" },//20
                    { name: "custitem_swc_sensitive_item", join: 'item', summary: "GROUP" }//21
                ]
            });
            var pageData = mySearch.runPaged({
                pageSize: pageSize
            });
            log.debug('pageData', pageData);
            var totalCount = pageData.count; //总数
            log.debug('totalCount', totalCount);
            var pageCount = pageData.pageRanges.length; //页数
            log.debug('pageCount', pageCount);
            var results = [];
            if (pageCount>0 && pageCount > page) {
                pageData.fetch({
                    index: page
                }).data.forEach(function (rec) {
                    log.debug('rec', rec);
                    var dangerous = rec.getValue(rec.columns[20]) || rec.getValue(rec.columns[21])
                    results.push({
                        sku: rec.getValue(rec.columns[0]),
                        skuid: rec.getText(rec.columns[0]),
                        skuName: rec.getValue(rec.columns[1]),
                        wmsSku: '',
                        skuType: rec.getValue(rec.columns[2]),
                        secondCategory: rec.getText(rec.columns[3]),
                        country: rec.getText(rec.columns[4]),
                        locationType: rec.getText(rec.columns[7]),
                        vendor: rec.getText(rec.columns[8]),
                        region: rec.getValue(rec.columns[5]),
                        location: rec.getValue(rec.columns[9]),
                        locationName: rec.getText(rec.columns[9]),
                        orderNo: rec.getValue(rec.columns[10]),
                        lotNumber: rec.getValue(rec.columns[11]),
                        quantity: Number(rec.getValue(rec.columns[12])),
                        length: Number(rec.getValue(rec.columns[15])),
                        width: Number(rec.getValue(rec.columns[16])),
                        height: Number(rec.getValue(rec.columns[17])),
                        weight: Number(rec.getValue(rec.columns[18])),
                        volume: Number(rec.getValue(rec.columns[19])),
                        dangerous: dangerous,
                        age: Number(rec.getValue(rec.columns[14])),
                        stockDate: rec.getValue(rec.columns[13]),
                        // stockDate1: moment(rec.getValue(rec.columns[13])),
                        // stockDate2: moment(rec.getValue(rec.columns[13])).format('YYYY-MM-DD')
                    });
                    return true;
                })
            }
            result.totalCount = totalCount;
            result.pageCount = pageCount;
            result.data = results;
            log.debug('results', results)
            // result = {
            //     "code": 200,
            //     "message": "success",
            //     "pageCount": 1,
            //     "totalCount": 6,
            //     "data": [
            //         {
            //             "sku": "1131",
            //             "skuid": "1110101010000044",
            //             "skuName": "DV-1F0072",
            //             "wmsSku": "",
            //             "skuType": "6",
            //             "secondCategory": "Toilets",
            //             "country": "UK",
            //             "locationType": locationType,
            //             "vendor": "4PX-DEFRAB",
            //             "region": "",
            //             "location": "718",
            //             "locationName": "4PX-DEFRABAmazon_Bilin_BE",
            //             "orderNo": "TestOrderNo",
            //             "lotNumber": "2026011201",
            //             "quantity": 920,
            //             "length": 76,
            //             "width": 52,
            //             "height": 89,
            //             "weight": 48,
            //             "volume": 0.292,
            //             "dangerous": false,
            //             "age": 68,
            //             "stockDate": "2025-12-31"
            //         },
            //         {
            //             "sku": "1130",
            //             "skuid": "1110101010000043",
            //             "skuName": "DV-1F0071",
            //             "wmsSku": "",
            //             "skuType": "6",
            //             "secondCategory": "Toilets",
            //             "country": "UK",
            //             "locationType": locationType,
            //             "vendor": "4PX-DEFRAB",
            //             "region": "",
            //             "location": "718",
            //             "locationName": "4PX-DEFRABAmazon_Bilin_BE",
            //             "orderNo": "TestOrderNo",
            //             "lotNumber": "2026011201",
            //             "quantity": 930,
            //             "length": 76,
            //             "width": 52,
            //             "height": 89,
            //             "weight": 54,
            //             "volume": 0.292,
            //             "dangerous": false,
            //             "age": 38,
            //             "stockDate": "2025-12-31"
            //         },
            //         {
            //             "sku": "1113",
            //             "skuid": "1110101010000042",
            //             "skuName": "DV-1F0196",
            //             "wmsSku": "",
            //             "skuType": "6",
            //             "secondCategory": "Toilets",
            //             "country": "UK",
            //             "locationType": locationType,
            //             "vendor": "4PX-DEFRAB",
            //             "region": "",
            //             "location": "718",
            //             "locationName": "4PX-DEFRABAmazon_Bilin_BE",
            //             "orderNo": "TestOrderNo",
            //             "lotNumber": "2026011201",
            //             "quantity": 940,
            //             "length": 81,
            //             "width": 46,
            //             "height": 86,
            //             "weight": 55,
            //             "volume": 0.249,
            //             "dangerous": false,
            //             "age": 14,
            //             "stockDate": "2025-12-31"
            //         },
            //         {
            //             "sku": "1113",
            //             "skuid": "1110101010000042",
            //             "skuName": "DV-1F0196",
            //             "wmsSku": "",
            //             "skuType": "6",
            //             "secondCategory": "Toilets",
            //             "country": locationType == "Mano"?"UK":"US",
            //             "locationType": locationType,
            //             "vendor": "4PX-DEFRAB",
            //             "region": "",
            //             "location": "718",
            //             "locationName": "4PX-DEFRABAmazon_Bilin_BE",
            //             "orderNo": "",
            //             "lotNumber": "1",
            //             "quantity": 40,
            //             "length": 81,
            //             "width": 46,
            //             "height": 86,
            //             "weight": 55,
            //             "volume": 0.249,
            //             "dangerous": false,
            //             "age": 29,
            //             "stockDate": "2026-01-12"
            //         },
            //         {
            //             "sku": "1131",
            //             "skuid": "1110101010000044",
            //             "skuName": "DV-1F0072",
            //             "wmsSku": "",
            //             "skuType": "6",
            //             "secondCategory": "Toilets",
            //             "country": locationType == "Mano"?"UK":"US",
            //             "locationType": locationType,
            //             "vendor": "4PX-DEFRAB",
            //             "region": "",
            //             "location": "718",
            //             "locationName": "4PX-DEFRABAmazon_Bilin_BE",
            //             "orderNo": "",
            //             "lotNumber": "1",
            //             "quantity": 60,
            //             "length": 76,
            //             "width": 52,
            //             "height": 89,
            //             "weight": 48,
            //             "volume": 0.292,
            //             "dangerous": false,
            //             "age": 99,
            //             "stockDate": "2026-01-12"
            //         },
            //         {
            //             "sku": "1130",
            //             "skuid": "1110101010000043",
            //             "skuName": "DV-1F0071",
            //             "wmsSku": "",
            //             "skuType": "6",
            //             "secondCategory": "Toilets",
            //             "country": locationType == "Mano"?"UK":"US",
            //             "locationType": locationType,
            //             "vendor": "4PX-DEFRAB",
            //             "region": "",
            //             "location": "718",
            //             "locationName": "4PX-DEFRABAmazon_Bilin_BE",
            //             "orderNo": "",
            //             "lotNumber": "1",
            //             "quantity": 50,
            //             "length": 76,
            //             "width": 52,
            //             "height": 89,
            //             "weight": 54,
            //             "volume": 0.292,
            //             "dangerous": false,
            //             "age": 180,
            //             "stockDate": "2026-01-12"
            //         }
            //     ]
            // }
        } catch (e) {
            log.error("错误信息：", { err: e.message, requestBody });
            if (e?.name && +e.name) {
                result.code = +e.name;
                result.message = e.message;
                result.data = e.data;
            } else {
                result.code = 500;
                result.message = "请求异常,错误信息:" + e;
            }
        }
        return JSON.stringify(result);
    }

    function getCurrencyId(currency_text) {
        var currency_id;
        if (currency_text) {
            search.create({
                type: 'currency',
                filters: [
                    { name: 'symbol', operator: 'is', values: currency_text }
                ]
            }).run().each(function (e) {
                currency_id = e.id;
                return false;
            })
        }
        return currency_id;
    }

    /**
     * 获取 请求body
     * @param {string|Object} requestBody 请求body
     * @returns {Object}
     */
    function getBody(requestBody) {
        try {
            requestBody = typeof (requestBody) == "string" ? JSON.parse(requestBody) : requestBody;
        } catch (e) {
            throw error.create({ name: "400", message: "requestBody参数错误: " + requestBody, notifyOff: true });
        }
        return requestBody;
    }

    function _put(context) {

    }

    function _delete(context) {

    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
