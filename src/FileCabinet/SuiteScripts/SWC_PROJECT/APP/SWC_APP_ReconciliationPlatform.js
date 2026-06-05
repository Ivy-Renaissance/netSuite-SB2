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
                // var subsidiaryId = srcUserSubsidiary(userId);

                parameters["custpage_paged_index_detail"] = 1;
                parameters["custpage_subsidiary"] = "";
                parameters["custpage_vendor"] = "";
                parameters["custpage_currency"] = "";
                parameters["custpage_start_date"] = "";
                parameters["custpage_deadline"] = "";
                parameters["custpage_dead_start_date"] = "";
                parameters["custpage_dead_deadline"] = "";
                parameters["custpage_type"] = "";
                parameters["custpage_demand"] = "";
                parameters["custpage_xxdzd"] = "";
                // parameters["custpage_reconciliation_date"] = new Date();
                // parameters["custpage_main_memo"] = "";

                parameters["custpage_reconciliation_date"] = '';
                parameters["custpage_main_memo"] = '';
                parameters["custpage_reconciliation_amount_total"] = '';
                parameters["custpage_payable_amount_total"] = '';
                parameters["custpage_departments"] = "";

                parameters["custpage_gc_flag"] = '';
                parameters["custpage_selected"] = '';
            }
            // if (method == "POST") {
            //     parameters["custpage_subsidiary"] = parameters["custpage_subsidiary"];
            //     parameters["custpage_customer"] = parameters["custpage_customer"];
            // }
            log.audit('parameters["custpage_commit_flag"]',parameters["custpage_commit_flag"]);
            if (method == "POST" && parameters["custpage_commit_flag"] == "F") {
                parameters["custpage_paged_index_detail"] = 1;
                parameters["custpage_subsidiary"] = parameters["custpage_subsidiary"] || '';
                parameters["custpage_customer"] = parameters["custpage_customer"] || '';

                parameters["custpage_reconciliation_date"] = '';
                parameters["custpage_main_memo"] = '';
                parameters["custpage_reconciliation_amount_total"] = '';
                parameters["custpage_payable_amount_total"] = '';
                parameters["custpage_departments"] = "";

                parameters["custpage_gc_flag"] = '';
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
                        ["isinactive","is","F"],
                        // "AND",
                        // ["subsidiary","anyof",subsidiaryId]
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

        function searchCustomer(customerId) {
            var customerSearchObj = search.create({
                type: "vendor",
                filters:
                    [
                        ["internalid","anyof",customerId],
                    ],
                columns:
                    [
                        search.createColumn({name: "terms", label: "条款"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });
            var results = getAllResults(customerSearchObj);
            var obj = {};
            results.forEach(function (value) {
                var id =  value.getValue({name: "internalid", label: "内部 ID"});
                var terms = value.getValue({name: "terms", label: "条款"});
                obj[id] = {
                    terms: terms
                }
            });
            return obj;
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
                [
                    [
                        ["type","anyof","VendBill"],
                        // "AND",
                        // ["formulanumeric: {custcol_swc_bill_writeoff_amount}-ABS({taxamount})-ABS({grossamount})","notequalto","0"],
                        "AND",
                        [
                            [
                                ["custbody_swc_order_type2","anyof","1"],
                                "AND",
                                ["custcol_swc_bill_writeoff_amount","isnotempty",""],
                                "AND",
                                ["custcol_swc_prepay_beforearrived","isnotempty",""]
                            ],
                            "OR",
                            [
                                ["custbody_swc_order_type2","noneof","1"],
                                "AND",
                                ["custbody_swc_order_type2","noneof","@NONE@"],
                            ]
                        ],
                    ],
                    "OR",
                    [
                        ["type","anyof","VendCred"],
                        "AND",
                        ["amountremaining","notequalto","0.00"],
                        "AND",
                        ["custbody_swc_order_type2","noneof","@NONE@"]
                    ]
                ],
                "AND",
                ["mainline", "is", "F"],
                "AND",
                ["taxline", "is", "F"],
                "AND",
                ["custcol_swc_vendor_statement","anyof","@NONE@"],
            ];

            if (parameters.custpage_subsidiary) {
                filter.push("AND");
                filter.push(["subsidiary", "anyof", parameters.custpage_subsidiary]);
            }

            if (parameters.custpage_vendor) {
                filter.push("AND");
                filter.push(["vendor.internalid", "anyof", parameters.custpage_vendor]);
            }

            if (parameters.custpage_currency) {
                filter.push("AND");
                filter.push(
                    ["currency", "anyof", parameters.custpage_currency]);
            }

            //开始日期
            if (parameters.custpage_start_date) {
                filter.push("AND");
                filter.push(["trandate","onorafter",parameters.custpage_start_date]);
            }
            //结束日期
            if (parameters.custpage_deadline) {
                filter.push("AND");
                filter.push(["trandate","onorbefore",parameters.custpage_deadline]);
            }

            //截止日期：开始日期
            if (parameters.custpage_dead_start_date) {
                filter.push("AND");
                filter.push(["custbody_swc_search_duedate","onorafter",parameters.custpage_dead_start_date]);
            }
            //截止日期：结束日期
            if (parameters.custpage_dead_deadline) {
                filter.push("AND");
                filter.push(["custbody_swc_search_duedate","onorbefore",parameters.custpage_dead_deadline]);
            }

            if (parameters.custpage_type) {
                let orderIds = String(parameters.custpage_type)
                .split(/[^0-9]+/)
                .filter(id => id.length > 0);
                filter.push("AND");
                filter.push(["custbody_swc_order_type2","anyof",orderIds]);
            }

            if (parameters.custpage_demand) {
                filter.push("AND");
                filter.push(["custcol_swc_beihuo_plan","anyof",parameters.custpage_demand]);
            }

            if (parameters.custpage_xxdzd) {
                filter.push("AND");
                filter.push(["custcol_swc_statement_offline","startswith", parameters.custpage_xxdzd]);
            }

            log.error('检索条件',filter)

            var transactionSearchObj = search.create({
                type: "transaction",
                title:'供应商对账平台：数据检索开发用' + new Date(),
                settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters: filter,
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "line", label: "行 Id"}),
                        search.createColumn({name: "subsidiarynohierarchy", label: "子公司"}),
                        search.createColumn({
                            name: "entityid",
                            join: "vendor",
                            label: "供应商名称"
                        }),
                        search.createColumn({
                            name: "internalid",
                            join: "vendor",
                            label: "供应商"
                        }),
                        search.createColumn({
                            name: "custcol_swc_statement_offline",
                            label: "线下对账单号"
                        }),
                        search.createColumn({name: "currency", label: "货币"}),
                        search.createColumn({name: "trandate", label: "日期"}),
                        search.createColumn({name: "type", label: "类型"}),
                        search.createColumn({
                            name: "custbody_swc_po_fee",
                            join: "createdFrom",
                            label: "类型判断"
                        }),
                        search.createColumn({name: "transactionnumber", label: "单据号"}),
                        search.createColumn({
                            name: "internalid",
                            join: "createdFrom",
                            label: "订单号"
                        }),
                        search.createColumn({
                            name: "tranid",
                            join: "createdFrom",
                            label: "订单号"
                        }),
                        search.createColumn({name: "invoicenum", label: "发票号码"}),
                        search.createColumn({name: "item", label: "SKU编码"}),
                        search.createColumn({
                            name: "itemid",
                            join: "item",
                            label: "名称"
                        }),
                        search.createColumn({
                            name: "displayname",
                            join: "item",
                            label: "显示名称"
                        }),
                        search.createColumn({name: "quantity", label: "数量"}),
                        search.createColumn({name: "rate", label: "未税单价"}),
                        // search.createColumn({
                        //     name: "formulanumeric2",
                        //     formula: "NVL(ROUND({taxitem.rate}*{fxamount}/100，2), 0)",
                        //     label: "税额（外币）"
                        // }),
                        search.createColumn({
                            name: "formulacurrency",
                            formula: "{fxamount}",
                            label: "总额（外币）"
                        }),
                        search.createColumn({
                            name: "formulacurrency2",
                            formula: "NVL({taxamount}/{exchangerate}, 0)",
                            label: "税额"
                        }),
                        search.createColumn( {name: "custcol_swc_including_tax_amt", label: "含税单价"}),
                        search.createColumn({name: "grossamount", label: "总额"}),
                        search.createColumn({name: "taxamount", label: "总税额"}),
                        search.createColumn({name: "custbody_swc_search_duedate", label: "到期日期"}),
                        search.createColumn({name: "custcol_swc_bill_writeoff_amount", label: "已预付总金额"}),
                        search.createColumn({name: "paidamount", label: "已支付金额"}),
                        search.createColumn({name: "custcol_swc_poline_initial_key", label: "订单行初始唯一键"}),
                        search.createColumn({name: "custcol_swc_poline_afterwards_key", label: "订单行后续唯一键"}),
                        search.createColumn({
                            name: "custitem_swc_sku_bgskuname",
                            join: "item",
                            label: "报关货品名称"
                        }),
                        search.createColumn({
                            name: "custitem_swc_sku_bgsldw",
                            join: "item",
                            label: "报关数量单位"
                        }),
                        search.createColumn({
                            name: "custcol_swc_beihuo_plan",
                            label: "备货计划",
                        }),
                        search.createColumn({
                            name: "custbody_swc_order_type2",
                            label: "采购订单类型(手工单用)",
                        }),
                    ]
            });
            // var searchID = transactionSearchObj.save();
            // //
            // log.audit('APP-searchID',searchID);
            let pagedData = transactionSearchObj.runPaged({
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
                    var item = {}
                    item.type2 = result.getValue({
                        name: "custbody_swc_order_type2",
                        label: "采购订单类型(手工单用)",
                    }) || "";
                    item.custpage_sublist_demand_line = result.getValue({
                        name: "custcol_swc_beihuo_plan",
                        label: "备货计划",
                    }) || "";
                    item.custpage_sublist_xxdzd = result.getValue({
                        name: "custcol_swc_statement_offline",
                        label: "线下对账单号"
                    }) || "";
                    item.selected = "";
                    item.index = (startIndex + index + 1).toString();
                    item.id = result.getValue({name: "internalid", label: "内部 ID"}) || "";
                    item.lineid = result.getValue({name: "line", label: "行 Id"}) || "";
                    item.subsidiaryname = result.getText({name: "subsidiarynohierarchy", label: "子公司"}) || "";
                    item.vendorname = result.getValue({
                        name: "entityid",
                        join: "vendor",
                        label: "供应商名称"
                    }) || "";
                    item.subsidiaryid = result.getValue({name: "subsidiarynohierarchy", label: "子公司"}) || "";
                    item.vendorid = result.getValue({
                        name: "internalid",
                        join: "vendor",
                        label: "供应商"
                    }) || "";
                    item.currencyname = result.getText({name: "currency", label: "货币"}) || "";
                    item.currencyid = result.getValue({name: "currency", label: "货币"}) || "";
                    item.date = result.getValue({name: "trandate", label: "日期"}) || "";
                    item.type = ''
                    item.trannumber = result.getValue({name: "transactionnumber", label: "单据号"}) || "";
                    item.purnumber = result.getValue({
                        name: "tranid",
                        join: "createdFrom",
                        label: "订单号"
                    }) || "";
                    item.purId = result.getValue({
                        name: "internalid",
                        join: "createdFrom",
                        label: "订单号"
                    }) || "";
                    item.skuid = result.getValue({name: "item", label: "SKU编码"}) || "";
                    item.skuname = result.getValue({
                        name: "displayname",
                        join: "item",
                        label: "显示名称"
                    }) || "";
                    item.skuCode = result.getValue({
                        name: "itemid",
                        join: "item",
                        label: "名称"
                    }) || "";
                    item.skunumber = Math.abs(Number(result.getValue({name: "quantity", label: "数量"}))) || 0;
                    // item.skurate = result.getValue({name: "rate", label: "未税单价"}) || 0;

                    // item.skurate = result.getValue({name: "custcol_swc_including_tax_amt", label: "含税单价"}) || 0;



                    //已核销金额
                    item.verifiedamount = 0;
                    //应付金额
                    item.payableamount = 0;

                    item.duedate = result.getValue({name: "custbody_swc_search_duedate", label: "到期日期"});
                    item.days = 0;
                    var dueDate = result.getValue({name: "custbody_swc_search_duedate", label: "到期日期"});
                    if (dueDate && item.date) {
                        // 转换为Date对象（如果还不是）
                        var dueDateObj = new Date(dueDate);
                        var itemDateObj = new Date(item.date);

                        // 计算天数差（毫秒转换为天）
                        var diffTime = dueDateObj - itemDateObj;
                        item.days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) || 0;
                    }

                    //不同单据不同处理
                    var type = result.getValue({name: "type", label: "类型"});
                    var typeFlag = result.getValue({
                        name: "custbody_swc_po_fee",
                        join: "createdFrom",
                        label: "类型判断"
                    });
                    log.error('type',type);
                    if (type == 'VendBill') {
                        var amountSum = result.getValue({
                            name: "formulacurrency",
                            formula: "{fxamount}",
                            label: "总额（外币）"
                        }) || 0;
                        var tax =  result.getValue({
                            name: "formulacurrency2",
                            formula: "NVL({taxamount}/{exchangerate}, 0)",
                            label: "税额"
                        }) || 0;
                        amountSum = Math.abs(amountSum);
                        tax = Math.abs(tax);
                        item.amountsum = Number(amountSum) + Number(tax);
                        item.amountsum = Math.abs(item.amountsum);
                        item.type = '账单';
                        var paidAmount = result.getValue({name: "paidamount", label: "已支付金额"}) || 0;
                        var offAmount = result.getValue({name: "custcol_swc_bill_writeoff_amount", label: "已预付总金额"}) || 0;

                        item.verifiedamount = Number(offAmount) + Number(paidAmount);
                        if (typeFlag == "2") {
                            item.type = '费用账单';
                            item.verifiedamount = 0;
                        }
                    } else {
                        var amountSum = result.getValue({
                            name: "formulacurrency",
                            formula: "{fxamount}",
                            label: "总额（外币）"
                        }) || 0;
                        var tax =  result.getValue({
                            name: "formulacurrency2",
                            formula: "NVL({taxamount}/{exchangerate}, 0)",
                            label: "税额"
                        }) || 0;
                        amountSum = Math.abs(amountSum);
                        tax = Math.abs(tax);
                        item.amountsum = Number(amountSum) + Number(tax);
                        item.amountsum = - Math.abs(item.amountsum);
                        item.type = '贷项'
                        if (typeFlag == "2") {
                            item.type = '费用贷项'
                        }
                    }

                    item.skurate = MatchTool.divN(item.amountsum,item.skunumber);

                    //金额处理逻辑
                    item.payableamount = item.amountsum - item.verifiedamount;

                    //唯一键
                    item.startkey = result.getValue({name: "custcol_swc_poline_initial_key", label: "订单行初始唯一键"}) || '';
                    item.endkey = result.getValue({name: "custcol_swc_poline_afterwards_key", label: "订单行后续唯一键"}) || '';

                    item.bgname = result.getValue({
                        name: "custitem_swc_sku_bgskuname",
                        join: "item",
                        label: "报关货品名称"
                    }) || '';
                    item.bgunit = result.getValue({
                        name: "custitem_swc_sku_bgsldw",
                        join: "item",
                        label: "报关数量单位"
                    }) || '';

                    log.audit('数据',item);
                    queryPageData.push(item);
                });

            }
            // 翻页勾选
            var selectedDataObj = parameters["custpage_selected"] ? JSON.parse(parameters["custpage_selected"]) : {};
            queryPageData.forEach(item => {
                var uniqueKey = item["id"] + '_' + item["lineid"];

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

        return {
            getPagedSelect: getPagedSelect, // 获取分页下拉选数据
            searchSubsidiary: searchSubsidiary,
            searchVendor:searchVendor,
            searchCustomer: searchCustomer,//检索店铺
            searchCurrency: searchCurrency,
            getData: getData,
            initParams: initParams,
            getNewOrder: getNewOrder
        }

    });