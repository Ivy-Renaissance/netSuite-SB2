/**
 * @NApiVersion 2.1
 * @author swr
 * @description search
 */

define([ "N/query", "N/search", "N/format", "N/record","N/runtime", 'N/url','../common/MatchTool'],
    function (query, search, format, record,runtime,url,MatchTool) {


        function initParams(parameters, method) {
            // 首次进入页面，为GET请求
            if (method == "GET") {
                var userId = runtime.getCurrentUser().id;
                parameters["custpage_paged_index_detail"] = 1;
                parameters["custpage_customer"] = "";
                parameters["custpage_ship_location"] = "";
                parameters["custpage_return_location"] = "";
                parameters["custpage_item"] = "";
                parameters["custpage_sub"] = "";
                parameters["custpage_batch_location"] = "";

                parameters["custpage_purpose_location"] = '';
                parameters["custpage_memo"] = '';

                parameters["custpage_selected"] = '';
            }
            log.audit('parameters["custpage_commit_flag"]',parameters["custpage_commit_flag"]);
            if (method == "POST" && parameters["custpage_commit_flag"] == "F") {
                parameters["custpage_paged_index_detail"] = 1;
                // parameters["custpage_customer"] = "";
                // parameters["custpage_ship_location"] = "";
                // parameters["custpage_return_location"] = "";
                // parameters["custpage_item"] = "";
                // parameters["custpage_sub"] = "";
                // parameters["custpage_batch_location"] = "";

                parameters["custpage_purpose_location"] = '';
                parameters["custpage_memo"] = '';

                parameters["custpage_selected"] = '';
            }
        }

        function getPagedSelect(id, page, total, pageNum) {
            var str, start, end;
            var num = Math.ceil(total / pageNum);
            id = 'tdt_paged_index_' + id;
            if (num === 1) {
                str = '<select id="' + id + '" class="tdt_paged_index" disabled>';
            } else {
                str = '<select id="' + id + '" class="tdt_paged_index">';
            }
            for (var i = 1; i <= num; i++) {
                start = (i - 1) * pageNum + 1;
                end = i * pageNum;
                if (end > total) {
                    end = total;
                }
                if (page == i) {
                    str +=
                        '<option value=' +
                        i +
                        ' selected>Page ' +
                        i +
                        '：' +
                        start +
                        ' to ' +
                        end +
                        '</option>';
                } else {
                    str +=
                        '<option value=' +
                        i +
                        '>Page ' +
                        i +
                        '：' +
                        start +
                        ' to ' +
                        end +
                        '</option>';
                }
            }
            str += '</select>';
            return str;
        }

        function searchSubsidiary() {
            let arr = [];
            var subsidiarySearchObj = search.create({
                type: "subsidiary",
                filters:
                    [
                        // ["country","noneof","CN","TW","HK"],
                        // "AND",
                        ["iselimination","is","F"]
                    ],
                columns:
                    [
                        search.createColumn({name: "namenohierarchy", label: "名称（无层次结构）"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });
            var results = getAllResults(subsidiarySearchObj);
            results.forEach(function (value) {
                arr.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: value.getValue({name: "namenohierarchy", label: "名称（无层次结构）"}),
                })
            });
            return arr;
        }


        function searchReturnSubsidiary(reLocation) {
            let arr;
            var subsidiarySearchObj = search.create({
                type: "subsidiary",
                filters:
                    [
                        ["country","anyof",reLocation],
                        "AND",
                        ["iselimination","is","F"]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });
            var results = getAllResults(subsidiarySearchObj);
            results.forEach(function (value) {
                arr = value.getValue({name: "internalid", label: "内部 ID"});
            });
            return arr;
        }

        /**
         *  检索当前地点
         // * @param SubsidiaryId
         * @return {*[]}
         */
        function searchLocation() {
            let arr = [];
            const locationSearchObj = search.create({
                type: "location",
                filters:
                    [
                        ["isinactive","is","F"]
                    ],
                columns:
                    [
                        search.createColumn({name: "name", label: "名称"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });
            var results = getAllResults(locationSearchObj);
            results.forEach(function (value) {

                arr.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: value.getValue({name: "name", label: "名称"}),
                })
            });
            return arr;
        }

        function searchCustomer() {
            const customerSearchObj = search.create({
                type: "customer",
                filters:
                    [
                        ["isinactive","is","F"]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "entityid", label: "ID"}),
                        search.createColumn({name: "altname", label: "名称"}),
                    ]
            });
            var results = getAllResults(customerSearchObj);
            let arr = [];
            results.forEach(function (value) {
                arr.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: value.getValue({name: "entityid", label: "ID"}) + ' ' + value.getValue({name: "altname", label: "名称"}),
                })
            });

            log.audit('客户检索',arr);
            return arr;
        }

        function searchCurrency() {
            var currencySearchObj = search.create({
                type: "currency",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "name", label: "名称"})
                    ]
            });

            var results = getAllResults(currencySearchObj);
            var arr = [];
            results.forEach(function (value) {

                arr.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: value.getValue({name: "name", label: "名称"}),
                })
            });
            return arr;
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

        /**
         * 检索画面表示数据：
         * @param {Object} options
         * @param {string} options.method 请求方法：GET/POST
         * @param {Object} options.parameters 请求参数
         * @param {number} options.pageSize 页面大小
         * @return {Object} {"pageId":1,"pageSize":100,"pagedData":[],"dataCount":0}
         */
        function getData(options) {
            var method = options.method;
            var parameters = options.parameters;
            var pageSize = options.pageSize;

            var data = {
                pageId: 1,
                pageSize: pageSize,
                pagedData: [],
                dataCount: 0
            };
            if (method == 'POST') {

                log.audit('parameters["custpage_paged_index_detail"]',parameters["custpage_paged_index_detail"]);
                var pageId = parameters["custpage_paged_index_detail"] || 1;
                data["pageId"] = pageId;

                let {dataCount,queryPageData} = queryData(parameters,pageSize,pageId-1);

                data["dataCount"] = dataCount;
                data["pagedData"] = queryPageData;

                log.audit('APP-data',data);
                if (data["dataCount"]  == 0) {
                    data["pageId"] = 1;
                    return data;
                }
                //例：当前查到的数据在第五页，换筛选条件了，第五页没有数据了，则会跳到第一页
                if ((pageId - (data["dataCount"] / pageSize)) > 1) {
                    data.pageId = 1;
                }
            }


            return data;
        }

        /**
         * 平台数据获取
         * @description
         * @param parameters
         * @param pageSize
         * @param pageId
         * @returns {{queryPageData: *[], dataCount: number}}
         */
        function queryData(parameters,pageSize,pageId) {
            let queryPageData = [];

            let filter = [
                ["inventorynumber.custitemnumber_swc_itemrmashop","noneof","@NONE@"],
                "AND",
                ["item.isinactive","is","F"]
            ];


            //      ["inventorynumber.custitemnumber_swc_itemrmashop","anyof","2066"],
            //       "AND",
            //       ["inventorynumber.custitemnumber_swc_rma_location","anyof","718"],
            //       "AND",
            //       ["location","anyof","718"],
            //       "AND",
            //       ["location.subsidiary","anyof","63"],
            //       "AND",
            //       ["item.name","contains","111"],
            //       "AND",
            //       ["inventorynumber.inventorynumber","contains","111"]

            if (parameters.custpage_customer) {
                filter.push("AND");
                filter.push(["inventorynumber.custitemnumber_swc_itemrmashop","anyof",parameters.custpage_customer]);
            }

            if (parameters.custpage_ship_location) {
                filter.push("AND");
                filter.push(["inventorynumber.custitemnumber_swc_rma_location","anyof",parameters.custpage_ship_location]);
            }

            if (parameters.custpage_return_location) {
                filter.push("AND");
                filter.push(["location","anyof",parameters.custpage_return_location]);
            }

            if (parameters.custpage_item) {
                filter.push("AND");
                filter.push(["item.name","contains",parameters.custpage_item]);
            }

            if (parameters.custpage_sub) {
                filter.push("AND");
                filter.push(["location.subsidiary","anyof",parameters.custpage_sub]);
            }

            if (parameters.custpage_batch_location) {
                filter.push("AND");
                filter.push(["inventorynumber.inventorynumber","contains",parameters.custpage_batch_location]);
            }

            log.error('检索条件',filter)

            const inventorybalanceSearchObj = search.create({
                type: "inventorybalance",
                filters:
                filter,
                columns:
                    [
                        search.createColumn({
                            name: "custitemnumber_swc_itemrmashop",
                            join: "inventoryNumber",
                            label: "发货店铺"
                        }),
                        search.createColumn({
                            name: "custitemnumber_swc_rma_location",
                            join: "inventoryNumber",
                            label: "发货地点"
                        }),
                        search.createColumn({
                            name: "custitemnumber_swc_ysalesorderid",
                            join: "inventoryNumber",
                            label: "原销售单号"
                        }),
                        search.createColumn({name: "location", label: "退货地点"}),
                        search.createColumn({
                            name: "subsidiary",
                            join: "location",
                            label: "子公司"
                        }),
                        search.createColumn({name: "item", label: "货品"}),
                        search.createColumn({name: "inventorynumber", label: "库存编号"}),
                        search.createColumn({name: "available", label: "可用"}),
                        search.createColumn({
                            name: "displayname",
                            join: "item",
                            label: "显示名称"
                        })
                    ]
            });
            var results = getAllResults(inventorybalanceSearchObj);
            log.audit('soData results',results);
            var soData = [];
            results.forEach(function (value) {
                var soId = value.getValue({
                    name: "custitemnumber_swc_ysalesorderid",
                    join: "inventoryNumber",
                    label: "原销售单号"
                });
                if (soData.indexOf(soId) == -1 && soId) {
                    soData.push(soId);
                }
            });
            log.audit('soData',soData);
            log.audit('soData',soData.length);
            var soObj = {};
            if (soData.length > 0) {
                soObj = searchSoNumber(soData);
            }
            log.audit('soObj',soObj);

            let pagedData = inventorybalanceSearchObj.runPaged({
                pageSize: pageSize
            });
            let dataCount = pagedData.count;
            log.audit('APP-pagedData',pagedData.pageSize);
            if (dataCount > 0) {
                var pageList = pagedData.fetch({
                    index: pageId
                });
                let startIndex = MatchTool.mulN(pageId,pageSize);
                pageList.data.forEach((result, index) => {
                    var customer = result.getValue({
                        name: "custitemnumber_swc_itemrmashop",
                        join: "inventoryNumber",
                        label: "发货店铺"
                    });
                    var customerName = result.getText({
                        name: "custitemnumber_swc_itemrmashop",
                        join: "inventoryNumber",
                        label: "发货店铺"
                    });
                    var shipLocation = result.getValue({
                        name: "custitemnumber_swc_rma_location",
                        join: "inventoryNumber",
                        label: "发货地点"
                    })
                    var shipLocationName = result.getText({
                        name: "custitemnumber_swc_rma_location",
                        join: "inventoryNumber",
                        label: "发货地点"
                    });
                    var sorderid = result.getValue({
                        name: "custitemnumber_swc_ysalesorderid",
                        join: "inventoryNumber",
                        label: "原销售单号"
                    });
                    var cgOrder;
                    if (sorderid in soObj) {
                        cgOrder = soObj[sorderid];
                    }
                    // var sorderidName = result.getText({
                    //     name: "custitemnumber_swc_ysalesorderid",
                    //     join: "inventoryNumber",
                    //     label: "原销售单号"
                    // });
                    var returnLocation = result.getValue({name: "location", label: "退货地点"});
                    var returnLocationName = result.getText({name: "location", label: "退货地点"});
                    var subsidiary = result.getValue({
                        name: "subsidiary",
                        join: "location",
                        label: "子公司"
                    });
                    var subsidiaryName = result.getText({
                        name: "subsidiary",
                        join: "location",
                        label: "子公司"
                    });
                    var sku = result.getValue({name: "item", label: "货品"});
                    var skuName = result.getText({name: "item", label: "货品"});
                    var inventorynumber = result.getText({name: "inventorynumber", label: "库存编号"})
                    var available = result.getValue({name: "available", label: "可用"})
                    var itemName = result.getValue({
                        name: "displayname",
                        join: "item",
                        label: "显示名称"
                    })

                    var item = {}
                    item.selected = "";
                    item.index = (startIndex + index + 1).toString();
                    item.id = result.getValue({name: "internalid", label: "内部 ID"}) || "";
                    item.customer = customer;
                    item.customerName = customerName;
                    item.shipLocation = shipLocation;
                    item.shipLocationName = shipLocationName;
                    item.sorderid = sorderid;
                    // item.sorderidName = sorderidName;
                    item.returnLocation = returnLocation;
                    item.returnLocationName = returnLocationName;
                    item.subsidiary = subsidiary;
                    item.subsidiaryName = subsidiaryName;
                    item.sku = sku;
                    item.skuName = skuName;
                    item.inventorynumber = inventorynumber;
                    item.available = available;
                    item.itemName = itemName;
                    item.cgOrder = cgOrder;
                    queryPageData.push(item);
                });

            }
            log.audit('queryPageData',queryPageData);
            // 翻页勾选
            var selectedDataObj = parameters["custpage_selected"] ? JSON.parse(parameters["custpage_selected"]) : {};
            queryPageData.forEach(item => {
                var uniqueKey = item["index"];

                //回显已勾选
                if (selectedDataObj.hasOwnProperty(uniqueKey)) {
                    // 选中状态
                    item["selected"] = "T";
                }
            })

            return {
                queryPageData: queryPageData,
                dataCount: dataCount
            }
        }

        function getNewOrder() {
            var customrecord_swc_account_statementSearchObj = search.create({
                type: "customrecord_swc_account_statement",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            summary: "MAX",
                            label: "内部 ID"
                        })
                    ]
            });

            var results = getAllResults(customrecord_swc_account_statementSearchObj);
            var id = '';
            results.forEach(function (value) {
                id = value.getValue({
                    name: "internalid",
                    summary: "MAX",
                    label: "内部 ID"
                })
            });
            return id;
        }

        function searchSoNumber(soData) {

            var filter = [];
            for (let i = 0;i < soData.length;i++) {
                filter.push(["numbertext","haskeywords",soData[i]]);
                if (i != soData.length - 1)
                    filter.push("OR");
            }
            log.debug('searchSoNumber filter',filter)
            const salesorderSearchObj = search.create({
                type: "salesorder",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","SalesOrd"],
                        "AND",
                        ["formulatext: {otherrefnum}","isnotempty",""],
                        "AND",
                        filter
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            summary: "GROUP",
                            label: "内部 ID"
                        }),
                        search.createColumn({
                            name: "tranid",
                            summary: "GROUP",
                            label: "文档编号"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            summary: "GROUP",
                            formula: "{otherrefnum}",
                            label: "公式（文本）"
                        })
                    ]
            });
            var results = getAllResults(salesorderSearchObj);
            var obj = {};
            results.forEach(function (value) {
                var tranid = value.getValue({
                    name: "tranid",
                    summary: "GROUP",
                    label: "文档编号"
                });
                var soNumber = value.getValue({
                    name: "formulatext",
                    summary: "GROUP",
                    formula: "{otherrefnum}",
                    label: "公式（文本）"
                });
                obj[tranid] = soNumber;
            });
            return obj;
        }

        return {
            getPagedSelect: getPagedSelect, // 获取分页下拉选数据
            searchSubsidiary: searchSubsidiary,
            searchLocation:searchLocation,//检索地点
            searchCustomer: searchCustomer,//检索供应商的账期（条款）
            searchCurrency: searchCurrency,
            getData: getData,
            initParams: initParams,
            getNewOrder: getNewOrder,
            searchReturnSubsidiary: searchReturnSubsidiary
        }

    });