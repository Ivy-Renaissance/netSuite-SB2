/**
 * @NApiVersion 2.1
 * @author sht
 * @description search
 */

define([ "N/query", "N/search", "N/format", "N/record","N/runtime", 'N/url'],
    function (query, search, format, record,runtime,url) {


        function initParams(parameters, method) {
            // 首次进入页面，为GET请求
            if (method == "GET") {
                var userId = runtime.getCurrentUser().id;
                // var subsidiaryId = srcUserSubsidiary(userId);

                parameters["custpage_subsidiary"] = '';
                parameters["custpage_vendor"] = '';
                parameters["custpage_purchaser"] = '';
                parameters["custpage_period"] = '';
                parameters["custpage_invoice_date"] = new Date();
                parameters["custpage_invoice_number"] = '';
                parameters["custpage_selected"] = '';
            }
            if (method == 'POST' && parameters["custpage_commit_flag"] != "T") {
                // parameters["custpage_subsidiary"] = '';
                // parameters["custpage_vendor"] = '';
                // parameters["custpage_poreqorder"] = '';
                // parameters["custpage_order_startdate"] = '';
                // parameters["custpage_order_enddate"] = '';
                parameters["custpage_order_date"] = '';
                parameters["custpage_account"] = '';
                parameters["custpage_selected"] = '';
            }
        }
        /**
         * searchname:预付款平台数据源
         // * @param subsidiaryId
         * @return {*[]}
         */
        function srcPurchOrd() {
            var purchaseorderSearchObj = search.create({
                type: "purchaseorder",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","PurchOrd"],
                        "AND",
                        ["mainline","is","T"]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "transactionname", label: "事务处理名称"})
                    ]
            });

            var results = getAllResults(purchaseorderSearchObj);
            var arr = [];
            results.forEach(function (value) {

                arr.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: value.getValue({name: "transactionname", label: "事务处理名称"}),
                })
            });
            return arr;
        }
        /**
         *  检索当前子公司的供应商
         // * @param SubsidiaryId
         * @return {*[]}
         */
        function searchVendor() {
            let arr = [];
            var vendorSearchObj = search.create({
                type: "vendor",
                filters:
                    [
                        ["isinactive","is","F"]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "entityid", label: "名称"})
                    ]
            });
            var results = getAllResults(vendorSearchObj);
            results.forEach(function (value) {
                // let str1 = value.getValue({name: "internalid", label: "内部 ID"}) || "";
                // let str2 = value.getValue({name: "entityid", label: "名称"}) || "";

                arr.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: value.getValue({name: "entityid", label: "名称"}),
                })
            });
            return arr;
        }


        function searchSubsidiary() {
            let arr = [];
            var subsidiarySearchObj = search.create({
                type: "subsidiary",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "namenohierarchy", label: "名称（无层次结构）"})
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

        /**
         *  检索期间
         * @return {*[]}
         */
        function searchPeriod() {
            let arr = [];
            var accountingperiodSearchObj = search.create({
                type: "accountingperiod",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "periodname", label: "名称"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });
            var results = getAllResults(accountingperiodSearchObj);
            results.forEach(function (value) {

                arr.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: value.getValue({name: "periodname", label: "名称"}),
                })
            });
            return arr;
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
         *除法函数
         */
        function accDiv(arg1, arg2) {
            var t1 = 0, t2 = 0, r1, r2;
            try {
                t1 = arg1.toString().split(".")[1].length;
            } catch (e) {
            }
            try {
                t2 = arg2.toString().split(".")[1].length;
            } catch (e) {
            }
            with (Math) {
                r1 = Number(arg1.toString().replace(".", ""));
                r2 = Number(arg2.toString().replace(".", ""));
                return (r1 / r2) * pow(10, t2 - t1);
            }
        }

        /**
         *
         * 乘法函数
         */
        function accMul(arg1, arg2) {

            var m = 0, s1 = arg1.toString(), s2 = arg2.toString();
            try {
                m += s1.split(".")[1].length;
            } catch (e) {
            }
            try {
                m += s2.split(".")[1].length;
            } catch (e) {
            }
            return Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m);
        }

        /**
         * 检索画面表示数据：检索未完成发货的销售订单明细行
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

                var receiptObj = getReceiptObj(parameters);

                var pageId = parameters["custpage_paged_index_detail"] || 1;
                log.audit('pageId',pageId);
                data["pageId"] = pageId;

                let {dataCount,queryPageData} = queryData(parameters,pageSize,pageId-1,receiptObj);

                data["dataCount"] = dataCount;
                data["pagedData"] = queryPageData;


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
         * @description  searchName:采购申请平台数据源 searchId:customsearch_swc_pr
         * @param parameters
         * @param pageSize
         * @param pageId
         * @param receiptObj
         * @returns {{queryPageData: *[], dataCount: number}}
         */
        function queryData(parameters,pageSize,pageId,receiptObj) {
            let queryPageData = [];

            let filter = [
                ["type","anyof","VendBill","VendCred"],
                "AND",
                ["mainline","is","F"],
                "AND",
                ["taxline","is","F"]
            ];

            if (parameters.subsidiaryId) {
                filter.push("AND");
                filter.push(["subsidiary","anyof",parameters.subsidiaryId]);
            }

            if (parameters.vendorId) {
                filter.push("AND");
                filter.push(["vendor.internalid","anyof",parameters.vendorId]);
            }

            //采购员
            if (parameters.custpage_purchaser) {
                filter.push("AND");
                filter.push(["employee","anyof",parameters.custpage_purchaser]);
            }
            //期间
            if (parameters.custpage_period) {
                filter.push("AND");
                filter.push( ["postingperiod","abs",parameters.custpage_period]);
            }


            var transactionSearchObj = search.create({
                type: "transaction",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                filter,
                columns:
                    [
                        search.createColumn({
                            name: "tranid",
                            join: "createdFrom",
                            label: "文档编号"
                        }),
                        search.createColumn({
                            name: "internalid",
                            join: "createdFrom",
                            label: "内部ID"
                        }),
                        search.createColumn({name: "tranid", label: "文档编号"}),
                        search.createColumn({
                            name: "itemid",
                            join: "item",
                            label: "名称"
                        }),
                        search.createColumn({name: "currency", label: "货币"}),
                        search.createColumn({name: "quantity", label: "数量"}),
                        search.createColumn({name: "custcol_swc_including_tax_amt", label: "含税单价"}),
                        search.createColumn({name: "grossamount", label: "金额（总额）"}),
                        search.createColumn({name: "item", label: "货品"}),
                        search.createColumn({name: "line", label: "行 Id"}),
                        search.createColumn({name: "custbody_swc_customer_statement", label: "供应商对账单"}),
                        search.createColumn({
                            name: "rate",
                            join: "taxItem",
                            label: "税率"
                        }),
                        search.createColumn({name: "recordtype", label: "记录类型"}),
                        search.createColumn({name: "transactionnumber", label: "事务处理编号"})
                    ]
            });

            let pagedData = transactionSearchObj.runPaged();
            var results = getAllResults(transactionSearchObj);
            let allDataCount = pagedData.count; // 原始数据总数
            let dataCount = 0;//记录总数
            let filteredData = []; // 用于存储过滤后的数据


            if(allDataCount > 0) {
                // 首先，获取所有数据并进行过滤
                // var pageList = pagedData.fetch({
                //     index: pageId
                // });

                results.forEach((result,index)=> {
                    var reKey = '';
                    var item = {}
                    item.selected = "";
                    item.order = result.getValue({name: "transactionnumber", label: "事务处理编号"}) || "";
                    item.orderId = result.id || "";
                    item.puorder = result.getValue({
                        name: "tranid",
                        join: "createdFrom",
                        label: "文档编号"
                    }) || "";
                    item.puorderId = result.getValue({
                        name: "internalid",
                        join: "createdFrom",
                        label: "内部ID"
                    }) || "";
                    item.item = result.getValue({name: "item", label: "货品"}) || "";
                    item.itemName = result.getValue({
                        name: "itemid",
                        join: "item",
                        label: "名称"
                    }) || "";
                    item.currency = result.getValue({name: "currency", label: "货币"}) || "";
                    item.quantity = Math.abs(result.getValue({name: "quantity", label: "数量"})) || "";
                    item.grossamount = Math.abs(result.getValue({name: "grossamount", label: "金额（总额）"})) || "";
                    item.taxrate = Math.abs(result.getValue({name: "custcol_swc_including_tax_amt", label: "含税单价"})) || "";
                    item.lineId = result.getValue({name: "line", label: "行 Id"}) || "";
                    item.taxcode = result.getValue({
                        name: "rate",
                        join: "taxItem",
                        label: "税率"
                    }) || "";
                    item.vendororder = result.getValue({name: "custbody_swc_customer_statement", label: "供应商对账单"}) || "";
                    item.type = result.getValue({name: "recordtype", label: "记录类型"}) || "";
                    reKey = item.puorderId + '_' + item.item;
                    if (reKey in receiptObj) {
                        item.receipt = receiptObj[reKey].tranId;
                        item.receiptId = receiptObj[reKey].id;
                    }
                    // 添加到过滤后的数据数组
                    filteredData.push(item);
                });


                log.audit('filteredData',filteredData);
                // 计算过滤后的数据总数
                dataCount = filteredData.length;
                log.audit('过滤后的数据总数', dataCount);

                // 进行分页处理
                if(dataCount > 0) {
                    // let startIndex = pageId * pageSize;
                    // let endIndex = Math.min(startIndex + pageSize, dataCount);
                    let startIndex = 0;
                    let endIndex = dataCount;
                    log.audit('startIndex',startIndex);
                    log.audit('endIndex',endIndex);

                    // 获取当前页的数据
                    let currentPageData = filteredData.slice(startIndex, endIndex);

                    log.audit('currentPageData',currentPageData);
                    // 为当前页数据添加序号和勾选状态
                    currentPageData.forEach((item, index) => {
                        item.index = (startIndex + index + 1).toString();

                        // 翻页勾选逻辑
                        var lineKey = item.orderId + '_' + item.item + '_' + item.line;

                        var selectedDataObj = parameters["custpage_selected"] ? JSON.parse(parameters["custpage_selected"]) : {};
                        if (selectedDataObj) {
                            if (lineKey in selectedDataObj) {
                                item["selected"] = "T";
                            }
                        }

                        queryPageData.push(item);
                    });
                }
            }

            log.audit('queryPageData',queryPageData);

            return {
                queryPageData: queryPageData,
                dataCount: dataCount
            }
        }

        function srcAccount() {
            var accountSearchObj = search.create({
                type: "account",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "name", label: "名称"}),
                        search.createColumn({name: "number", label: "编号"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });

            var results = getAllResults(accountSearchObj);
            var arr = [];
            results.forEach(function (value) {
                var number = value.getValue({name: "number", label: "编号"}) || '';
                var name = value.getValue({name: "name", label: "名称"});
                if (number)
                    number = number + ' ';
                var text = number + name;
                arr.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: text,
                })
            });

            return arr;
        }

        function searchEmployee() {
            let arr = [];
            var employeeSearchObj = search.create({
                type: "employee",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "entityid", label: "名称"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });
            var results = getAllResults(employeeSearchObj);
            results.forEach(function (value) {
                arr.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: value.getValue({name: "entityid", label: "名称"}),
                })
            });
            return arr;
        }

        function getNewOrder() {
            var customrecord_swc_input_invoiceSearchObj = search.create({
                type: "customrecord_swc_input_invoice",
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

            var results = getAllResults(customrecord_swc_input_invoiceSearchObj);
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

        function getReceiptObj(parameters) {

            let filter = [
                ["type","anyof","ItemRcpt"],
                "AND",
                ["mainline","is","F"],
                "AND",
                ["taxline","is","F"]
            ];

            if (parameters.subsidiaryId) {
                filter.push("AND");
                filter.push(["subsidiary","anyof",parameters.subsidiaryId]);
            }

            if (parameters.vendorId) {
                filter.push("AND");
                filter.push(["vendor.internalid","anyof",parameters.vendorId]);
            }

            var itemreceiptSearchObj = search.create({
                type: "itemreceipt",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                filter,
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
                            name: "item",
                            summary: "GROUP",
                            label: "货品"
                        }),
                        search.createColumn({
                            name: "createdfrom",
                            summary: "GROUP",
                            label: "创建自"
                        })
                    ]
            });

            var obj = {};

            var results = getAllResults(itemreceiptSearchObj);

            results.forEach(value => {
                var id = value.getValue({
                    name: "internalid",
                    summary: "GROUP",
                    label: "内部 ID"
                });
                var tranId = value.getValue({
                    name: "tranid",
                    summary: "GROUP",
                    label: "文档编号"
                });
                var item = value.getValue({
                    name: "item",
                    summary: "GROUP",
                    label: "货品"
                });
                var puId = value.getValue({
                    name: "createdfrom",
                    summary: "GROUP",
                    label: "创建自"
                });

                var key = puId + '_' + item;
                obj[key] = {
                    id: id,
                    tranId: tranId
                }
            });

            return obj
        }

        return {
            getPagedSelect: getPagedSelect, // 获取分页下拉选数据
            searchSubsidiary: searchSubsidiary,//获取子公司信息
            searchVendor: searchVendor,//获取供应商信息
            srcPurchOrd: srcPurchOrd,//获取采购订单
            searchPeriod: searchPeriod,//获取期间信息
            initParams: initParams,
            getData: getData,
            accMul: accMul,
            srcAccount: srcAccount,
            searchEmployee: searchEmployee,
            getNewOrder: getNewOrder
        }

    });
