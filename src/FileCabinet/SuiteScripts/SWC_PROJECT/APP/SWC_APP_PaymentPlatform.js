/**
 * @NApiVersion 2.1
 * @author swr
 * @description search
 */

define([ "N/query", "N/search", "N/format", "N/record","N/runtime", 'N/url','../common/MatchTool', '../common/SWC_CONFIG_DATA'],
    function (query, search, format, record,runtime,url,MatchTool,SWC_CONFIG_DATA) {


        function initParams(parameters, method) {
            log.audit('method',method);
            log.audit('parameters["custpage_commit_flag"]',parameters["custpage_commit_flag"]);
            // 首次进入页面，为GET请求
            if (method == "GET") {
                let userId = runtime.getCurrentUser().id;
                // let subsidiaryId = srcUserSubsidiary(userId);
                parameters["custpage_paged_index_detail"] = 1;
                parameters["custpage_subsidiary"] = '';
                parameters["custpage_vendor"] = '';
                parameters["custpage_poreqorder"] = '';
                parameters["custpage_order_startdate"] = '';
                parameters["custpage_order_enddate"] = '';
                parameters["custpage_order_date"] = '';
                parameters["custpage_account"] = '';
                parameters["custpage_terms"] = '';
                parameters["custpage_dzd"] = '';
                parameters["custpage_demand"] = "";
                parameters["custpage_xxdzd"] = "";
                parameters["custpage_type"] = '';
                parameters["custpage_bussiness"] = '';

                parameters["custpage_gc_flag"] = '';
                parameters["custpage_selected"] = '';
            }
            if (method == 'POST' && parameters["custpage_commit_flag"] == 'F') {
                parameters["custpage_paged_index_detail"] = 1;
                // parameters["custpage_subsidiary"] = '';
                // parameters["custpage_vendor"] = '';
                // parameters["custpage_poreqorder"] = '';
                // parameters["custpage_order_startdate"] = '';
                // parameters["custpage_order_enddate"] = '';
                parameters["custpage_memo"] = '';
                parameters["custpage_pre_amount"] = '';
                parameters["custpage_pre_date"] = '';
                parameters["custpage_bussiness"] = '';
                parameters["custpage_terms"] = '';
                parameters["custpage_account"] = '';

                parameters["custpage_gc_flag"] = '';
                parameters["custpage_selected"] = '';
            }
        }
        /**
         * searchname:付款平台数据源
         // * @param subsidiaryId
         * @return {*[]}
         */
        function srcPurchOrd(subsidiaryId,vendorId,startDate,endDate) {
            let filter = [
                ["type","anyof","VendBill","VendCred"],
                "AND",
                [
                    [
                        ["type","anyof","VendBill"],
                        "AND",
                        ["custcol_swc_notnotused","notequalto","0.00"],
                        "AND",
                        ["custcol_swc_bill_unsettled_amount","notequalto","0.00"],
                        "AND",
                        ["custbody_swc_order_type2","anyof",SWC_CONFIG_DATA.configData().s_po_type_swcg,SWC_CONFIG_DATA.configData().s_po_type_gdzc],
                    ],
                    "OR",
                    [
                        ["type","anyof","VendCred"],
                        "AND",
                        ["custbody_swc_order_type2","anyof",SWC_CONFIG_DATA.configData().s_po_type_swcg,SWC_CONFIG_DATA.configData().s_po_type_gdzc],

                    ]
                ],
                "AND",
                ["mainline","is","F"],
                "AND",
                ["taxline","is","F"],
                "AND",
                ["custcol_swc_vendor_statement","noneof","@NONE@"],
                "AND",
                ["createdfrom","noneof","@NONE@"],
                "AND",
                ["custcol_swc_vendor_application","anyof","@NONE@"],
            ];
            if (subsidiaryId) {
                filter.push("AND");
                filter.push(["subsidiary","anyof",subsidiaryId]);
            }
            if (vendorId) {
                filter.push("AND");
                filter.push(["vendor.internalid","anyof",vendorId]);
            }
            log.error('startDate',startDate);
            //开始日期
            if (startDate) {
                filter.push("AND");
                filter.push(["trandate","onorafter",startDate]);
            }
            //结束日期
            if (endDate) {
                filter.push("AND");
                filter.push(["trandate","onorbefore",endDate]);
            }
            let purchaseorderSearchObj = search.create({
                type: "transaction",
                title: '付款平台：采购订单检索' + new Date(),
                // settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                filter,
                columns:
                    [
                        search.createColumn({
                            name: "tranid",
                            join: "createdFrom",
                            summary: "GROUP",
                            label: "文档编号"
                        }),
                        search.createColumn({
                            name: "internalid",
                            join: "createdFrom",
                            summary: "GROUP",
                            label: "内部 ID",
                            sort: search.Sort.ASC,
                        })
                    ]
            });

            // let searchId = purchaseorderSearchObj.save();
            // log.audit('searchId',searchId);

            let results = getAllResults(purchaseorderSearchObj);
            let arr = [];
            results.forEach(function (value) {

                arr.push({
                    value: value.getValue({
                        name: "internalid",
                        join: "createdFrom",
                        summary: "GROUP",
                        label: "内部 ID"
                    }),
                    text: value.getValue({
                        name: "tranid",
                        join: "createdFrom",
                        summary: "GROUP",
                        label: "文档编号"
                    }),
                })
            });
            return arr;
        }

        /**
         * searchname:付款平台-账单列表 开发用
         // * @param subsidiaryId
         * @return {*[]}
         */
        function srcBillOrd(subsidiaryId,vendorId,startDate,endDate) {
            let filter = [
                ["type","anyof","VendBill","VendCred"],
                "AND",
                [
                    [
                        ["type","anyof","VendBill"],
                        "AND",
                        ["custcol_swc_notnotused","notequalto","0.00"],
                        "AND",
                        ["custcol_swc_bill_unsettled_amount","notequalto","0.00"],
                        "AND",
                        ["custbody_swc_order_type2","anyof",SWC_CONFIG_DATA.configData().s_po_type_swcg,SWC_CONFIG_DATA.configData().s_po_type_gdzc],
                    ],
                    "OR",
                    [
                        ["type","anyof","VendCred"],
                        "AND",
                        ["custbody_swc_order_type2","anyof",SWC_CONFIG_DATA.configData().s_po_type_swcg,SWC_CONFIG_DATA.configData().s_po_type_gdzc],

                    ]
                ],
                "AND",
                ["mainline","is","F"],
                "AND",
                ["taxline","is","F"],
                "AND",
                ["custcol_swc_vendor_statement","noneof","@NONE@"],
                "AND",
                ["custcol_swc_vendor_application","anyof","@NONE@"],
            ];
            if (subsidiaryId) {
                filter.push("AND");
                filter.push(["subsidiary","anyof",subsidiaryId]);
            }
            if (vendorId) {
                filter.push("AND");
                filter.push(["vendor.internalid","anyof",vendorId]);
            }
            //开始日期
            if (startDate) {
                filter.push("AND");
                filter.push(["trandate","onorafter",startDate]);
            }
            //结束日期
            if (endDate) {
                filter.push("AND");
                filter.push(["trandate","onorbefore",endDate]);
            }
            let vendorbillSearchObj = search.create({
                type: "transaction",
                title: '付款平台：账单检索' + new Date(),
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                filter,
                columns:
                    [
                        search.createColumn({
                            name: "transactionnumber",
                            summary: "GROUP",
                            label: "事务处理编号"
                        }),
                        search.createColumn({
                            name: "internalid",
                            summary: "GROUP",
                            label: "内部 ID"
                        })
                    ]
            });

            // let searchId = vendorbillSearchObj.save();
            // log.audit('searchId',searchId);

            let results = getAllResults(vendorbillSearchObj);
            let arr = [];
            results.forEach(function (value) {

                arr.push({
                    value: value.getValue({
                        name: "internalid",
                        summary: "GROUP",
                        label: "内部 ID"
                    }),
                    text: value.getValue({
                        name: "transactionnumber",
                        summary: "GROUP",
                        label: "事务处理编号"
                    }),
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
            let vendorSearchObj = search.create({
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
            let results = getAllResults(vendorSearchObj);
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
            let subsidiarySearchObj = search.create({
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
            let results = getAllResults(subsidiarySearchObj);
            results.forEach(function (value) {
                arr.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: value.getValue({name: "namenohierarchy", label: "名称（无层次结构）"}),
                })
            });
            return arr;
        }

        function getPagedSelect(id, page, total, pageNum) {
            let str, start, end;
            let num = Math.ceil(total / pageNum);
            id = 'tdt_paged_index_' + id;
            if (num === 1) {
                str = '<select id="' + id + '" class="tdt_paged_index" disabled>';
            } else {
                str = '<select id="' + id + '" class="tdt_paged_index">';
            }
            for (let i = 1; i <= num; i++) {
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
            let results = srch.run();
            let searchResults = [];
            let searchid = 0;
            let resultslice;
            do {
                resultslice = results.getRange({
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
            let t1 = 0, t2 = 0, r1, r2;
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

            let m = 0, s1 = arg1.toString(), s2 = arg2.toString();
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
            let method = options.method;
            let parameters = options.parameters;
            let pageSize = options.pageSize;

            let data = {
                pageId: 1,
                pageSize: pageSize,
                pagedData: [],
                dataCount: 0
            };
            if (method == 'POST') {

                let pageId = parameters["custpage_paged_index_detail"] || 1;
                log.audit('pageId',pageId);
                data["pageId"] = pageId;


                let {dataCount,queryPageData} = queryData(parameters,pageSize,pageId-1);

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
         * @returns {{queryPageData: *[], dataCount: number}}
         */
        function queryData(parameters,pageSize,pageId) {
            let queryPageData = [];

            let filter = [
                ["type","anyof","VendBill","VendCred"],
                "AND",
                [
                    [
                        ["type","anyof","VendBill"],
                        "AND",
                        ["custcol_swc_notnotused","notequalto","0.00"],
                        "AND",
                        ["custcol_swc_bill_unsettled_amount","notequalto","0.00"],
                        "AND",
                        ["custbody_swc_order_type2","anyof",SWC_CONFIG_DATA.configData().s_po_type_swcg,SWC_CONFIG_DATA.configData().s_po_type_gdzc],


                    ],
                    "OR",
                    [
                        ["type","anyof","VendCred"],
                        "AND",
                        ["custbody_swc_order_type2","anyof",SWC_CONFIG_DATA.configData().s_po_type_swcg,SWC_CONFIG_DATA.configData().s_po_type_gdzc],

                    ]
                ],
                "AND",
                ["mainline","is","F"],
                "AND",
                ["taxline","is","F"],
                "AND",
                ["custcol_swc_vendor_statement","noneof","@NONE@"],
                "AND",
                ["custcol_swc_vendor_application","anyof","@NONE@"],
            ];

            if (parameters.subsidiaryId) {
                filter.push("AND");
                filter.push(["subsidiary","anyof",parameters.subsidiaryId]);
            }

            if (parameters.vendorId) {
                filter.push("AND");
                filter.push(["vendor.internalid","anyof",parameters.vendorId]);
            }

            if (parameters.custpage_order_startdate) {
                // parameters.custpage_order_startdate = `${parameters.custpage_order_startdate.getFullYear()}-${parameters.custpage_order_startdate.getMonth() + 1}-${parameters.custpage_order_startdate.getDate()}`;
                filter.push("AND");
                filter.push(["trandate","onorafter",parameters.custpage_order_startdate]);
            }
            //结束日期
            if (parameters.custpage_order_enddate) {
                // parameters.custpage_order_enddate = `${parameters.custpage_order_enddate.getFullYear()}-${parameters.custpage_order_enddate.getMonth() + 1}-${parameters.custpage_order_enddate.getDate()}`;
                filter.push("AND");
                filter.push(["trandate","onorbefore",parameters.custpage_order_enddate]);
            }

            if (parameters.custpage_billorder) {
                let orderIds = String(parameters.custpage_billorder)
                .split(/[^0-9]+/)
                .filter(id => id.length > 0);
                filter.push("AND");
                filter.push(["internalid","anyof",orderIds]);
            }

            if (parameters.custpage_poreqorder) {
                let orderIds = String(parameters.custpage_poreqorder)
                .split(/[^0-9]+/)
                .filter(id => id.length > 0);
                filter.push("AND");
                filter.push(["createdfrom","anyof",orderIds]);
            }

            if (parameters.custpage_dzd) {
                // parameters.custpage_order_enddate = `${parameters.custpage_order_enddate.getFullYear()}-${parameters.custpage_order_enddate.getMonth() + 1}-${parameters.custpage_order_enddate.getDate()}`;
                filter.push("AND");
                filter.push(["custcol_swc_vendor_statement","anyof",parameters.custpage_dzd]);
            }
            // if (parameters.custpage_poreqorder) {
            //     filter.push("AND");
            //     filter.push(["internalid","anyof",parameters.custpage_poreqorder]);
            // }

            if (parameters.custpage_demand) {
                filter.push("AND");
                filter.push(["custcol_swc_beihuo_plan","anyof",parameters.custpage_demand]);
            }

            if (parameters.custpage_xxdzd) {
                filter.push("AND");
                filter.push(["custcol_swc_statement_offline","startswith", parameters.custpage_xxdzd]);
            }

            if (parameters.custpage_type) {
                let orderIds = String(parameters.custpage_type)
                .split(/[^0-9]+/)
                .filter(id => id.length > 0);
                filter.push("AND");
                filter.push(["custbody_swc_order_type2","anyof",orderIds]);
            }

            var vendorbillSearchObj = search.create({
                type: "transaction",
                title: '付款平台：检索数据' + new Date(),
                settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                filter,
                columns:
                    [
                        search.createColumn({name: "custcol_swc_vendor_statement", label: "对账单"}),
                        search.createColumn({name: "transactionnumber", label: "事务处理编号"}),
                        search.createColumn({name: "subsidiarynohierarchy", label: "子公司（无层次结构）"}),
                        search.createColumn({
                            name: "internalid",
                            join: "vendor",
                            label: "供应商ID"
                        }),
                        search.createColumn({
                            name: "entityid",
                            join: "vendor",
                            label: "供应商名称"
                        }),
                        search.createColumn({name: "currency", label: "货币"}),
                        search.createColumn({name: "exchangerate", label: "汇率"}),
                        search.createColumn({name: "trandate", label: "日期"}),
                        search.createColumn({name: "line", label: "行 Id"}),
                        search.createColumn({name: "custcol_swc_poline_initial_key", label: "订单行初始唯一键"}),
                        search.createColumn({name: "custcol_swc_poline_afterwards_key", label: "订单行后续唯一键"}),
                        search.createColumn({
                            name: "internalid",
                            join: "item",
                            label: "内部 ID"
                        }),
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
                        search.createColumn({name: "rate", label: "货品价格"}),
                        search.createColumn({name: "custcol_swc_including_tax_amt", label: "含税单价"}),
                        search.createColumn({
                            name: "rate",
                            join: "taxItem",
                            label: "税率"
                        }),
                        search.createColumn({
                            name: "formulacurrency",
                            formula: "{fxamount}",
                            label: "总额（外币）"
                        }),
                        // search.createColumn({
                        //     name: "formulanumeric2",
                        //     formula: "NVL(ROUND({taxitem.rate}*{fxamount}/100，2), 0)",
                        //     label: "税额（外币）"
                        // }),
                        search.createColumn({
                            name: "formulacurrency2",
                            formula: "NVL({taxamount}/{exchangerate}, 0)",
                            label: "税额"
                        }),
                        // search.createColumn({
                        //     name: "formulacurrency",
                        //     formula: "{fxamount} - NVL({taxamount}/{exchangerate}, 0)",
                        //     label: "含税总金额"
                        // }),
                        search.createColumn({name: "grossamount", label: "金额（总额）"}),
                        search.createColumn({name: "taxamount", label: "金额（税）"}),
                        search.createColumn({name: "custcol_swc_prepay_whole1_spare", label: "第一次整单预付-摊销金额"}),
                        search.createColumn({name: "custcol_swc_prepay_beforearrived", label: "发货前预付金额"}),
                        search.createColumn({name: "custcol_swc_bill_writeoff_amount", label: "已预付总金额"}),
                        search.createColumn({name: "type", label: "类型"}),
                        search.createColumn({name: "custbody_swc_po_fee", label: "类型判断"}),
                        search.createColumn({name: "custbody_swc_search_duedate", label: "到期日期"}),
                        search.createColumn({
                            name: "custcol_swc_beihuo_plan",
                            label: "备货计划",
                        }),
                        search.createColumn({
                            name: "custbody_swc_order_type2",
                            label: "采购订单类型(手工单用)",
                        }),
                        search.createColumn({
                            name: "custcol_swc_statement_offline",
                            label: "线下对账单号"
                        }),
                    ]
            });

            // let searchId = vendorbillSearchObj.save();
            // log.audit('searchId',searchId);

            let pagedData = vendorbillSearchObj.runPaged();
            let results = getAllResults(vendorbillSearchObj);
            let allDataCount = pagedData.count; // 原始数据总数
            let dataCount = 0;//记录总数
            let filteredData = []; // 用于存储过滤后的数据
            let billData = [];//账单ID汇总：检索 已支付金额 用
            let paidObj = getPaidAmount();
            log.audit('paidObj',paidObj);

            if(allDataCount > 0) {
                // 首先，获取所有数据并进行过滤
                // let pageList = pagedData.fetch({
                //     index: pageId
                // });

                results.forEach((result,index)=> {
                    let line = {};
                    line.custpage_sublist_type_2 = result.getValue({
                        name: "custbody_swc_order_type2",
                        label: "采购订单类型(手工单用)",
                    }) || "";
                    line.custpage_sublist_demand_line = result.getValue({
                        name: "custcol_swc_beihuo_plan",
                        label: "备货计划",
                    }) || "";

                    line.custpage_sublist_xxdzd = result.getValue({
                        name: "custcol_swc_statement_offline",
                        label: "线下对账单号"
                    }) || "";

                    //对账单
                    line.statement = result.getText({name: "custcol_swc_vendor_statement", label: "对账单"});
                    line.statementId = result.getValue({name: "custcol_swc_vendor_statement", label: "对账单"});

                    //账单编号
                    line.no = result.getValue({name: "transactionnumber", label: "事务处理编号"});
                    //账单id
                    line.id = result.id;
                    if (billData.indexOf(result.id) == -1) {
                        billData.push(result.id);
                    }
                    //子公司
                    line.subsidiary = result.getValue({name: "subsidiarynohierarchy", label: "子公司（无层次结构）"});
                    //子公司
                    line.subsidiaryname = result.getText({name: "subsidiarynohierarchy", label: "子公司（无层次结构）"});
                    //供应商id
                    line.vendorid = result.getValue({
                        name: "internalid",
                        join: "vendor",
                        label: "供应商ID"
                    });
                    //供应商名称
                    line.vendorname = result.getValue({
                        name: "entityid",
                        join: "vendor",
                        label: "供应商名称"
                    });
                    //货币
                    line.currency = result.getValue({name: "currency", label: "货币"});
                    //货币名称
                    //货币
                    line.currencyname = result.getText({name: "currency", label: "货币"});
                    //汇率
                    line.rate = result.getValue({name: "exchangerate", label: "汇率"});
                    //日期
                    line.date = result.getValue({name: "trandate", label: "日期"});
                    //行号
                    line.lineid = result.getValue({name: "line", label: "行 Id"});
                    //初始唯一键
                    line.startKey = result.getValue({name: "custcol_swc_poline_initial_key", label: "订单行初始唯一键"});
                    //后续唯一键
                    line.endKey = result.getValue({name: "custcol_swc_poline_afterwards_key", label: "订单行后续唯一键"});
                    //货品ID
                    line.itemid = result.getValue({
                        name: "internalid",
                        join: "item",
                        label: "内部 ID"
                    });
                    //货品名称
                    line.itemcode = result.getValue({
                        name: "itemid",
                        join: "item",
                        label: "名称"
                    });
                    //货品编码
                    line.itemname = result.getValue({
                        name: "displayname",
                        join: "item",
                        label: "显示名称"
                    });

                    //数量
                    line.number = Math.abs(result.getValue({name: "quantity", label: "数量"}));
                    //单价
                    // line.price = result.getValue({name: "rate", label: "货品价格"});
                    // line.price = result.getValue({name: "custcol_swc_including_tax_amt", label: "含税单价"});
                    //税率
                    line.taxrate = result.getValue({
                        name: "rate",
                        join: "taxItem",
                        label: "税率"
                    });
                    if (line.taxrate != 0) {
                        line.taxrate = parseInt(line.taxrate);
                    }
                    //金额总额
                    line.grossamount = Math.abs(result.getValue({
                        name: "formulacurrency",
                        formula: "{fxamount}",
                        label: "总额（外币）"
                    }));
                    //税额
                    line.taxamount =  Number(result.getValue({
                        name: "formulacurrency2",
                        formula: "NVL({taxamount}/{exchangerate}, 0)",
                        label: "税额"
                    }));



                    // line.allamount = result.getValue({name: "custcol_swc_including_tax_amt", label: "含税单价"});

                    //类型
                    //不同单据不同处理
                    var type = result.getValue({name: "type", label: "类型"});
                    var typeFlag = result.getValue({name: "custbody_swc_po_fee", label: "类型判断"});
                    if (type == 'VendBill') {
                        //含税金额
                        line.taxamount = Math.abs(line.taxamount);
                        line.allamount =  line.grossamount + line.taxamount;
                        line.allamount = Math.abs(line.allamount);
                        line.type = '账单';
                        if (typeFlag == "2") {
                            line.type = '费用账单';
                        }
                    } else {
                        line.taxamount = Math.abs(line.taxamount);
                        line.allamount =  line.grossamount + line.taxamount;
                        line.allamount = - Math.abs(line.allamount);
                        line.type = '贷项'
                        if (typeFlag == "2") {
                            line.type = '费用贷项'
                        }
                    }

                    line.price = MatchTool.divN(line.allamount,line.number);
                    line.typeid = result.getValue({name: "type", label: "类型"});
                    //第一次整单预付-摊销金额
                    line.wholespare = result.getValue({name: "custcol_swc_prepay_whole1_spare", label: "第一次整单预付-摊销金额"});
                    //发货前预付金额
                    line.beforearrived = result.getValue({name: "custcol_swc_prepay_beforearrived", label: "发货前预付金额"});
                    //已预付总金额
                    line.writeoff = result.getValue({name: "custcol_swc_bill_writeoff_amount", label: "已预付总金额"});

                    //待支付金额
                    line.pending = line.allamount - Number(line.writeoff);
                    // if (line.pending == 0) {
                    //     return;
                    // }
                    //已支付金额
                    let paidKey = line.id + '_' + line.lineid;
                    line.paidAmount = 0;
                    // if (paidKey in paidObj) {
                    //     return;
                    // }

                    //本次支付金额
                    line.curAmount = line.pending - line.paidAmount;
                    line.curAmount = MatchTool.fixed(line.curAmount,2);

                    //到期日
                    line.duedate = result.getValue({name: "custbody_swc_search_duedate", label: "到期日期"});
                    line.days = 0;
                    var dueDate = result.getValue({name: "custbody_swc_search_duedate", label: "到期日期"});
                    if (dueDate && line.date) {
                        // 转换为Date对象（如果还不是）
                        var dueDateObj = new Date(dueDate);
                        var itemDateObj = new Date(line.date);

                        // 计算天数差（毫秒转换为天）
                        var diffTime = dueDateObj - itemDateObj;
                        line.days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    }

                    // 添加到过滤后的数据数组
                    filteredData.push(line);
                });

                // let billObj = getPaymentData(billData)//检索 付款平台-本次支付金额 开发用


                log.audit('filteredData',filteredData);
                // 计算过滤后的数据总数
                dataCount = filteredData.length;

                // 进行分页处理
                if(dataCount > 0) {
                    let startIndex = MatchTool.mulN(pageId,pageSize);
                    let endIndex = Math.min(startIndex + pageSize, dataCount);
                    log.audit('startIndex',startIndex);
                    log.audit('endIndex',endIndex);

                    // 获取当前页的数据
                    let currentPageData = filteredData.slice(startIndex, endIndex);

                    log.audit('currentPageData',currentPageData);
                    // 为当前页数据添加序号和勾选状态
                    currentPageData.forEach((item, index) => {
                        item.index = (startIndex + index + 1).toString();

                        log.error('item.index',item.index);

                        // 翻页勾选逻辑
                        // let uniqueKey = item["subsidiary"] + '_' + item["vendorId"] + '_' + item["id"];
                        let uniqueKey = item.id + '_' + item.lineid;

                        //本次支付金额
                        // let amountKey = item.vendorid + '_' + item.lineid;
                        // item.nowamount = 0;
                        // if (amountKey in billObj) {
                        //     item.nowamount = billObj[amountKey];
                        // }

                        let selectedDataObj = parameters["custpage_selected"] ? JSON.parse(parameters["custpage_selected"]) : {};
                        if (selectedDataObj) {
                            if (uniqueKey in selectedDataObj) {
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


        function srcAccount(ids) {
            var filter = [];
            if (ids) {
                if (ids.length > 0) {
                    filter.push(['internalid',"anyof",ids]);
                }
            }
            let accountSearchObj = search.create({
                type: "customrecord_swc_vendor_bank",
                filters:
                filter,
                columns:
                    [
                        search.createColumn({name: "name", label: "名称"}),
                        // search.createColumn({name: "number", label: "编号"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });

            let results = getAllResults(accountSearchObj);
            let arr = [];
            results.forEach(function (value) {
                // let number = value.getValue({name: "number", label: "编号"}) || '';
                let name = value.getValue({name: "name", label: "名称"});

                arr.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: name,
                })
            });

            return arr;
        }

        // JavaScript中科学计数法转化为数值字符串形式
        function toNonExponential(num) {
            num = Number(num);
            let m = num.toExponential().match(/\d(?:.(\d*))?e([+-]\d+)/);
            return num.toFixed(Math.max(0, (m[1] || '').length - m[2]));
        }

        /**
         * 浮点数乘法
         * @param {*} a
         * @param {*} b
         */
        function mul(a, b) {
            a = toNonExponential(a);
            b = toNonExponential(b);
            let c = 0,
                d = a.toString(),
                e = b.toString();
            try {
                c += d.split('.')[1].length;
            } catch (f) {}
            try {
                c += e.split('.')[1].length;
            } catch (f) {}
            return (
                (Number(d.replace('.', '')) * Number(e.replace('.', ''))) /
                Math.pow(10, c)
            );
        }

        /**
         * 浮点数除法
         * @param {*} a
         * @param {*} b
         */
        function div(a, b) {
            a = toNonExponential(a);
            b = toNonExponential(b);
            let c,
                d,
                e = 0,
                f = 0;
            try {
                e = a.toString().split('.')[1].length;
            } catch (g) {}
            try {
                f = b.toString().split('.')[1].length;
            } catch (g) {}
            return (
                (c = Number(a.toString().replace('.', ''))),
                    (d = Number(b.toString().replace('.', ''))),
                    mul(c / d, Math.pow(10, f - e))
            );
        }

        function parseFloatOrZero(v) {
            return parseFloat(v) || 0;
        }

        function divN(a, b) {
            a = parseFloatOrZero(a);
            b = parseFloatOrZero(b);
            return b && div(a, b);
        }

        function getPaidAmount() {
            var customrecord_swc_payment_applicationSearchObj = search.create({
                type: "customrecord_swc_payment_application",
                title: '付款平台： 已支付金额检索' + new Date(),
                filters:
                    [
                        ["custrecord_swc_pay_state","noneof",SWC_CONFIG_DATA.configData().s_pr_status_yzf,SWC_CONFIG_DATA.configData().s_pr_status_yjj],
                        // "AND",
                        // ["custrecord_swc_pay_line_main.custrecord_swc_pay_bill","noneof","@NONE@"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custrecord_swc_pay_bill",
                            join: "CUSTRECORD_SWC_PAY_LINE_MAIN",
                            label: "账单"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_pay_line_number",
                            join: "CUSTRECORD_SWC_PAY_LINE_MAIN",
                            label: "行号"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_pay_line_paynow",
                            join: "CUSTRECORD_SWC_PAY_LINE_MAIN",
                            label: "本次支付金额"
                        }),
                        // search.createColumn({
                        //     name: "custrecord_swc_pay_line_initial",
                        //     join: "CUSTRECORD_SWC_PAY_LINE_MAIN",
                        //     label: "订单行初始唯一键"
                        // }),
                        // search.createColumn({
                        //     name: "custrecord_swc_pay_line_aferwards",
                        //     join: "CUSTRECORD_SWC_PAY_LINE_MAIN",
                        //     label: "订单行后续唯一键"
                        // })
                    ]
            });

            let results = getAllResults(customrecord_swc_payment_applicationSearchObj);
            // let searchId = customrecord_swc_payment_applicationSearchObj.save();
            // log.audit('searchId',searchId);

            let obj = {};
            results.forEach(function (value) {
                var id = value.getValue({
                    name: "custrecord_swc_pay_bill",
                    join: "CUSTRECORD_SWC_PAY_LINE_MAIN",
                    label: "账单"
                });
                var line = value.getValue({
                    name: "custrecord_swc_pay_line_number",
                    join: "CUSTRECORD_SWC_PAY_LINE_MAIN",
                    label: "行号"
                });
                var amount = value.getValue({
                    name: "custrecord_swc_pay_line_paynow",
                    join: "CUSTRECORD_SWC_PAY_LINE_MAIN",
                    label: "本次支付金额"
                }) || 0;
                amount = Number(amount);
                var key = id + '_' + line;
                if (key in obj) {
                    obj[key].amount = obj[key].amount + amount;
                } else {
                    obj[key] = {
                        amount: amount
                    }
                }
            });

            return obj
        }

        function searchTerms(vendorTerms) {

            var filter = [
                ["isinactive","is","F"]
            ];
            if (vendorTerms) {
                if (vendorTerms.length > 0) {
                    filter.push('AND');
                    filter.push(['internalid',"anyof",vendorTerms]);
                }
            }
            const customlist_swc_payment_terms_listSearchObj = search.create({
                type: "customrecord_swc_payterms_config",
                filters:filter,
                columns:
                    [
                        search.createColumn({name: "name", label: "名称"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });

            let results = getAllResults(customlist_swc_payment_terms_listSearchObj);
            let obj = [];
            results.forEach(value => {
                obj.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: value.getValue({name: "name", label: "名称"}),
                })
            });
            return obj
        }

        function searchBillAccount(vendor) {
            const vendorSearchObj = search.create({
                type: "vendor",
                filters:
                    [
                        ["internalid","anyof",vendor]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            join: "CUSTRECORD_SWC_VENDOR_LISTS",
                            label: "内部 ID"
                        })
                    ]
            });
            let results = getAllResults(vendorSearchObj);
            let accountArr ;
            let accountData = [];
            results.forEach(value => {
                var account = value.getValue({
                    name: "internalid",
                    join: "CUSTRECORD_SWC_VENDOR_LISTS",
                    label: "内部 ID"
                });
                if (account) accountData.push(account);
            });

            // if (accountArr) {
            //     if (typeof accountArr === 'string' && accountArr.trim() !== '') {
            //         var ids = accountArr.split(',').map(function(id) {
            //             return id.trim();
            //         }).filter(function(id) {
            //             return id !== '';
            //         });
            //
            //         ids.forEach(function(id) {
            //             accountData.push(id);
            //         });
            //     } else if (Array.isArray(accountArr)) {
            //         accountArr.forEach(function(item) {
            //             accountData.push(item);
            //         });
            //     } else if (accountArr != null) {
            //         accountData.push(accountArr);
            //     }
            // }

            return accountData
        }

        function searchDzd(vendor) {
            const customrecord_swc_dzlineSearchObj = search.create({
                type: "customrecord_swc_dzline",
                filters:
                    [
                        ["custrecord_swc_dz_main.custrecord_swc_statement_state","noneof",SWC_CONFIG_DATA.configData().s_pr_status_yzf,SWC_CONFIG_DATA.configData().s_pr_status_yjj,SWC_CONFIG_DATA.configData().s_pr_status_ydh],
                        "AND",
                        ["custrecord_swc_dz_main.internalid","noneof","@NONE@"],
                        "AND",
                        ["custrecord_swc_dz_main.custrecord_swc_statement_customer","anyof",vendor],
                        "AND",
                        [
                            [
                                ["custrecord_swc_dzline_doc.type","anyof","VendBill"],
                                "AND",
                                ["custrecord_swc_dzline_doc.custcol_swc_notnotused","notequalto","0.00"],
                                "AND",
                                ["custrecord_swc_dzline_doc.custcol_swc_bill_unsettled_amount","notequalto","0.00"],
                                "AND",
                                ["custrecord_swc_dzline_doc.custbody_swc_order_type2","anyof",SWC_CONFIG_DATA.configData().s_po_type_swcg,SWC_CONFIG_DATA.configData().s_po_type_gdzc],
                                "AND",
                                ["custrecord_swc_dzline_doc.status","anyof","VendBill:D","VendBill:A"]
                            ],
                            "OR",
                            [
                                ["custrecord_swc_dzline_doc.type","anyof","VendCred"],
                                "AND",
                                ["custrecord_swc_dzline_doc.custbody_swc_order_type2","anyof",SWC_CONFIG_DATA.configData().s_po_type_swcg,SWC_CONFIG_DATA.configData().s_po_type_gdzc],

                            ]
                        ],
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custrecord_swc_dz_main",
                            summary: "GROUP",
                            label: "供应商对账单main"
                        }),
                        search.createColumn({
                            name: "id",
                            join: "CUSTRECORD_SWC_DZ_MAIN",
                            summary: "GROUP",
                            label: "ID"
                        })
                    ]
            });

            let results = getAllResults(customrecord_swc_dzlineSearchObj);
            let arr = [];
            results.forEach(value => {
                arr.push({
                    value: value.getValue({
                        name: "custrecord_swc_dz_main",
                        summary: "GROUP",
                        label: "供应商对账单main"
                    }),
                    text: value.getValue({
                        name: "id",
                        join: "CUSTRECORD_SWC_DZ_MAIN",
                        summary: "GROUP",
                        label: "ID"
                    }),
                })
            });

            return arr
        }


        function searchBillTerms(vendor) {
            const vendorSearchObj = search.create({
                type: "vendor",
                filters:
                    [
                        ["internalid","anyof",vendor]
                    ],
                columns:
                    [
                        search.createColumn({name: "custentity_swc_payment_terms", label: "付款条件"})
                    ]
            });
            let results = getAllResults(vendorSearchObj);
            let accountArr ;
            let accountData = [];
            results.forEach(value => {
                accountArr =  value.getValue({name: "custentity_swc_payment_terms", label: "付款条件"})
            });

            if (accountArr) {
                if (typeof accountArr === 'string' && accountArr.trim() !== '') {
                    var ids = accountArr.split(',').map(function(id) {
                        return id.trim();
                    }).filter(function(id) {
                        return id !== '';
                    });

                    ids.forEach(function(id) {
                        accountData.push(id);
                    });
                } else if (Array.isArray(accountArr)) {
                    accountArr.forEach(function(item) {
                        accountData.push(item);
                    });
                } else if (accountArr != null) {
                    accountData.push(accountArr);
                }
            }

            return accountData
        }

        function getNewOrder() {
            var customrecord_swc_account_statementSearchObj = search.create({
                type: "customrecord_swc_payment_application",
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
            searchSubsidiary: searchSubsidiary,//获取子公司信息
            searchVendor: searchVendor,//获取供应商信息
            srcPurchOrd: srcPurchOrd,//获取采购订单
            srcBillOrd: srcBillOrd,
            initParams: initParams,
            getData: getData,
            accMul: accMul,
            divN: divN,
            srcAccount: srcAccount,
            searchTerms: searchTerms,
            searchBillAccount: searchBillAccount,
            searchDzd: searchDzd,
            searchBillTerms: searchBillTerms,
            getNewOrder: getNewOrder
        }

    });