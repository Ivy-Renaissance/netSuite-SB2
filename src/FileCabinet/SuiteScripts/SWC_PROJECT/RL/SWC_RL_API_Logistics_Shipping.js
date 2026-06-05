/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search'],

    (search) => {
        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const get = (requestParams) => {
            let result = {code: '200', msg: 'success', data: {}};
            log.audit('result',result);
            try {
                let shipData = getShipData();
                log.audit('shipData',shipData);
                if (shipData.length > 0) {
                    result.data.shipData = shipData;
                } else {
                    result['msg'] = result['msg'] + ',无符合条件数据'
                }
            } catch (e) {
                // 执行失败的场合，响应错误信息
                result['code'] = '400';
                result['msg'] = 'error:' + e.message;
            }

            return JSON.stringify(result);
        };

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

        };

        function getShipData() {
            let customrecord_swc_wl_plan_orderSearchObj = search.create({
                type: "customrecord_swc_wl_plan_order",
                filters:
                    [
                        ["custrecord_swc_wl_booking_number","isnotempty",""],
                        "AND",
                        ["custrecord_swc_wl_container_number","isnotempty",""],
                        "AND",
                        ["custrecord_swc_shipping_company","isnotempty",""],
                        "AND",
                        ["custrecord_swc_wl_rm_sta_gk","isnotempty",""],
                        "AND",
                        ["custrecord_swc_wl_md_lc","isnotempty",""],
                        "AND",
                        ["custrecord_swc_unloading_time","isempty",""]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "custrecord_swc_wl_booking_number", label: "订舱号"}),
                        search.createColumn({name: "custrecord_swc_wl_container_number", label: "集装箱箱号"}),
                        search.createColumn({name: "custrecord_swc_shipping_company", label: "船司"}),
                        search.createColumn({name: "custrecord_swc_wl_rm_sta_gk", label: "起运港"}),
                        search.createColumn({name: "custrecord_swc_wl_md_lc", label: "目的港"})
                    ]
            });
            let results = getAllResults(customrecord_swc_wl_plan_orderSearchObj);

            let data = [];
            results.forEach(value => {
                let id = value.id;
                let bookNumber = value.getValue({name: "custrecord_swc_wl_booking_number", label: "订舱号"});
                let containerNumber = value.getValue({name: "custrecord_swc_wl_container_number", label: "集装箱箱号"});
                let company = value.getValue({name: "custrecord_swc_shipping_company", label: "船司"});
                let pol = value.getValue({name: "custrecord_swc_wl_rm_sta_gk", label: "起运港"});
                let destination = value.getValue({name: "custrecord_swc_wl_md_lc", label: "目的港"});
                data.push(
                    {
                        id: id,
                        bookNumber: bookNumber,
                        containerNumber: containerNumber,
                        company: company,
                        pol: pol,
                        destination: destination
                    }
                )
            });

            return data
        }

        function getAllResults(srch) {
            var results = srch.run();
            var searchResults = [];
            var searchid = 0;
            do {
                var resultslice = results.getRange({
                    start: searchid,
                    end: searchid + 1000
                });
                resultslice.forEach(function (slice) {
                    searchResults.push(slice);
                    searchid++;
                });

            } while (resultslice.length >= 1000);
            return searchResults;
        }

        return {get};

    });
