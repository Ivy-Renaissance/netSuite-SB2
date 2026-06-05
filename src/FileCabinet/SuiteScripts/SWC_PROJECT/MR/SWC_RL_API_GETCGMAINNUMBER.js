/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', '../common/SWC_CONFIG_DATA'],

    (search,SWC_CONFIG_DATA) => {
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
                let CGData = getCGData();
                log.audit('CGData',CGData);
                if (CGData.length > 0) {
                    result.data.cgdata = CGData;
                } else {
                    result['msg'] = result['msg'] + '无数据'
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

        function getCGData() {
            const transferorderSearchObj = search.create({
                type: "transferorder",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","TrnfrOrd"],
                        "AND",
                        ["mainline","is","T"],
                        "AND",
                        ["tolocation.custrecord_swc_location_attribute","anyof",SWC_CONFIG_DATA.configData().s_attribute_bsc],
                        "AND",
                        ["custbody_swc_wl_no.custrecord_swc_cg_main_order_number","isnotempty",""],
                        "AND",
                        ["status","anyof","TrnfrOrd:G"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custrecord_swc_cg_main_order_number",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "CG主单号"
                        })
                    ]
            });
            let results = getAllResults(transferorderSearchObj);

            let data = [];
            results.forEach(value => {
                let CGNumber = value.getValue({
                    name: "custrecord_swc_cg_main_order_number",
                    join: "CUSTBODY_SWC_WL_NO",
                    label: "CG主单号"
                });
                if (data.indexOf(CGNumber) == -1)
                    data.push(CGNumber)
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
