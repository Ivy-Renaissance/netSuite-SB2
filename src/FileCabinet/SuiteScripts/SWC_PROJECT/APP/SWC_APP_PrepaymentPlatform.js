/**
 * @NApiVersion 2.1
 * @author swr
 * @description search
 */
// const SUBMIST_STATUS_2 = "2";
define([ "N/query", "N/search", "N/format", "N/record","N/runtime", 'N/url','../common/MatchTool', '../common/SWC_CONFIG_DATA'],
    function (query, search, format, record,runtime,url,MatchTool,SWC_CONFIG_DATA) {

        // runtime.envType
        function initParams(parameters, method) {
            // 首次进入页面，为GET请求
            if (method == "GET") {
                let userId = runtime.getCurrentUser().id;
                // let subsidiaryId = srcUserSubsidiary(userId);
                parameters["custpage_subsidiary"] = '';
                parameters["custpage_vendor"] = '';
                parameters["custpage_poreqorder"] = '';
                parameters["custpage_order_startdate"] = '';
                parameters["custpage_order_enddate"] = '';
                parameters["custpage_order_date"] = '';
                parameters["custpage_account"] = '';
                parameters["custpage_selected"] = '';
                parameters["custpage_terms"] = '';
                parameters["custpage_account_hide"] = '';
                parameters["custpage_demand"] = '';
                parameters["custpage_expectedreceiptdate_s"] = '';
                parameters["custpage_expectedreceiptdate_e"] = '';
                parameters["custpage_type"] = '';
                parameters["custpage_bussiness"] = '';
            }
            // log.audit('method',method);
            // log.audit('parameters["custpage_commit_flag"]',parameters["custpage_commit_flag"]);
            // log.audit('parameters["custpage_paged_index_detail"]',parameters["custpage_paged_index_detail"]);
            if (method == 'POST' && parameters["custpage_commit_flag"] == "F") {
                parameters["custpage_paged_index_detail"] = 1;
                parameters["custpage_memo"] = '';
                parameters["custpage_order_date"] = '';
                parameters["custpage_account"] = '';
                parameters["custpage_terms"] = '';
                parameters["custpage_whole_payment"] = '';
                parameters["custpage_selected"] = '';
                parameters["custpage_all_payment"] = '';
                parameters["custpage_all_quantity"] = '';
                parameters["custpage_all_prequantity"] = '';
                parameters["custpage_bussiness"] = '';
            }
        }
        /**
         * searchname:预付款平台数据源
         // * @param subsidiaryId
         * @return {*[]}
         */
        function srcPurchOrd(subsidiaryId,vendorId,startDate,endDate) {
            let filter = [
                ["type","anyof","PurchOrd"],
                "AND",
                ["mainline","is","T"],
                "AND",
                ["status","noneof","PurchOrd:G","PurchOrd:H","PurchOrd:F"],
                "AND",
                ["custbody_swc_noneed_advancepay","is","F"],
                "AND",
                ["closed","is","F"],
                "AND",
                ["formulatext: {vendor.custentity_swc_advance_payment_percent}","isnotempty",""],
                "AND",
                [
                    ["custbody_swc_order_type2","anyof",SWC_CONFIG_DATA.configData().s_po_type_swcg],
                    "OR",
                    [
                        ["custbody_swc_order_type2","anyof",SWC_CONFIG_DATA.configData().s_po_type_gdzc],
                        "AND",
                        ["custbody_swc_po_approal_fix","anyof",SWC_CONFIG_DATA.configData().s_pr_status_ypz]//已批准
                    ]
                ]
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


            let purchaseorderSearchObj = search.create({
                type: "purchaseorder",
                title: '预付款申请平台 采购订单列表检索' + new Date(),
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters: filter,
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "transactionname", label: "事务处理名称"})
                    ]
            });

            let results = getAllResults(purchaseorderSearchObj);
            let arr = [];
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
                data["pageId"] = pageId;

                let vprepObj = searchVprep(parameters["subsidiaryId"],parameters["vendorId"],parameters["custpage_poreqorder"]);
                log.audit('vprepObj',vprepObj);
                //检索供应商 申请比例
                let vendorObj = searchVendorDetail(parameters["vendorId"]);
                log.audit('vendorObj',vendorObj);
                //检索供应商预付款单 整单已预付金额
                let {dataCount,queryPageData} = queryData(parameters,pageSize,pageId-1,vendorObj,vprepObj);

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
         * @description  searchName:采购申请平台数据源
         * @param parameters
         * @param pageSize
         * @param pageId
         * @param vendorObj
         * @param vprepObj
         // * @param vpObj
         * @returns {{queryPageData: *[], dataCount: number}}
         */
        function queryData(parameters,pageSize,pageId,vendorObj,vprepObj) {
            let queryPageData = [];

            //	预付款平台 数据检索Tue Jan 20 2026 00:43:08 GMT-0800 (PST)
            let filter = [
                ["type","anyof","PurchOrd"],
                "AND",
                ["mainline","is","F"],
                "AND",
                ["taxline","is","F"],
                "AND",
                ["status","noneof","PurchOrd:G","PurchOrd:H","PurchOrd:F"],
                "AND",
                ["custbody_swc_noneed_advancepay","is","F"],
                "AND",
                ["closed","is","F"],
                "AND",
                ["formulatext: {vendor.custentity_swc_advance_payment_percent}","isnotempty",""],
                "AND",
                [
                    ["custbody_swc_order_type2","anyof",SWC_CONFIG_DATA.configData().s_po_type_swcg],
                    "OR",
                    [
                        ["custbody_swc_order_type2","anyof",SWC_CONFIG_DATA.configData().s_po_type_gdzc],
                        "AND",
                        ["custbody_swc_po_approal_fix","anyof",SWC_CONFIG_DATA.configData().s_pr_status_ypz]//已批准
                    ]
                ]

            ];
            if (parameters.subsidiaryId) {
                filter.push("AND");
                filter.push(["subsidiary","anyof",parameters.subsidiaryId]);
            }

            if (parameters.vendorId) {
                filter.push("AND");
                filter.push(["vendor.internalid","anyof",parameters.vendorId]);
            }

            // if (parameters.custpage_order_startdate && parameters.custpage_order_enddate) {
            //     filter.push("AND");
            //     filter.push(["trandate","within",parameters.custpage_order_startdate,parameters.custpage_order_enddate]);
            // }

            if (parameters.custpage_order_startdate) {
                filter.push("AND");
                filter.push(["trandate","onorafter",parameters.custpage_order_startdate]);
            }
            //结束日期
            if (parameters.custpage_order_enddate) {
                filter.push("AND");
                filter.push(["trandate","onorbefore",parameters.custpage_order_enddate]);
            }

            if (parameters.custpage_poreqorder) {
                const orderIds = String(parameters.custpage_poreqorder)
                .split(/[^0-9]+/)
                .filter(id => id.length > 0);
                filter.push("AND");
                filter.push(["internalid","anyof",orderIds]);
            }

            if (parameters.custpage_order_startdate) {
                filter.push("AND");
                filter.push(["trandate","onorafter",parameters.custpage_order_startdate]);
            }

            if (parameters.custpage_expectedreceiptdate_s) {
                filter.push("AND");
                filter.push(["expectedreceiptdate","onorafter",parameters.custpage_expectedreceiptdate_s]);
            }
            if (parameters.custpage_expectedreceiptdate_e) {
                filter.push("AND");
                filter.push(["expectedreceiptdate","onorbefore",parameters.custpage_expectedreceiptdate_e]);
            }
            if (parameters.custpage_demand) {
                filter.push("AND");
                filter.push(["custcol_swc_beihuo_plan","anyof",parameters.custpage_demand]);
            }

            if (parameters.custpage_type) {
                let orderIds = String(parameters.custpage_type)
                .split(/[^0-9]+/)
                .filter(id => id.length > 0);
                filter.push("AND");
                filter.push(["custbody_swc_order_type2","anyof",orderIds]);
            }

            let purchaseorderSearchObj = search.create({
                type: "purchaseorder",
                title: '预付款平台 数据检索' + new Date(),
                settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:filter,
                columns:
                // [
                //     search.createColumn({name: "internalid", label: "内部 ID"}),
                //     search.createColumn({name: "trandate", label: "日期"}),
                //     search.createColumn({name: "tranid", label: "文档编号"}),
                //     search.createColumn({name: "subsidiarynohierarchy", label: "子公司（无层次结构）"}),
                //     search.createColumn({
                //         name: "entityid",
                //         join: "vendor",
                //         label: "名称"
                //     }),
                //     search.createColumn({
                //         name: "internalid",
                //         join: "vendor",
                //         label: "内部ID"
                //     }),
                //     search.createColumn({name: "item", label: "货品"}),
                //     search.createColumn({
                //         name: "itemid",
                //         join: "item",
                //         label: "名称"
                //     }),
                //     search.createColumn({
                //         name: "displayname",
                //         join: "item",
                //         label: "显示名称"
                //     }),
                //     search.createColumn({name: "quantity", label: "数量"}),
                //     // search.createColumn({name: "rate", label: "货品价格"}),
                //     search.createColumn({name: "fxrate", label: "货品价格"}),
                //     search.createColumn({name: "quantityshiprecv", label: "已履行/已接收数量"}),
                //     search.createColumn({name: "custcol_swc_poline_initial_key", label: "订单行初始唯一键"}),
                //     search.createColumn({name: "custcol_swc_poline_afterwards_key", label: "订单行后续唯一键"}),
                //     search.createColumn({name: "line", label: "行 Id"}),
                //     search.createColumn({name: "taxamount", label: "金额（税）"}),
                //     search.createColumn({
                //         name: "rate",
                //         join: "taxItem",
                //         label: "税率"
                //     }),
                //     search.createColumn({name: "currency", label: "货币"}),
                //     search.createColumn({
                //         name: "formulanumeric",
                //         formula: "{fxrate}*{quantity}*(1+NVL({taxitem.rate}, 0)/100)",
                //         label: "含税总金额"
                //     })
                // ]
                    [
                        search.createColumn({
                            name: "internalid",
                            summary: "GROUP",
                            label: "内部 ID"
                        }),
                        search.createColumn({
                            name: "trandate",
                            summary: "GROUP",
                            label: "日期"
                        }),
                        search.createColumn({
                            name: "subsidiarynohierarchy",
                            summary: "GROUP",
                            label: "子公司（无层次结构）"
                        }),
                        search.createColumn({
                            name: "entityid",
                            join: "vendor",
                            summary: "GROUP",
                            label: "名称"
                        }),
                        search.createColumn({
                            name: "internalid",
                            join: "vendor",
                            summary: "GROUP",
                            label: "内部ID"
                        }),
                        search.createColumn({
                            name: "item",
                            summary: "GROUP",
                            label: "货品"
                        }),
                        search.createColumn({
                            name: "itemid",
                            join: "item",
                            summary: "GROUP",
                            label: "名称"
                        }),
                        search.createColumn({
                            name: "displayname",
                            join: "item",
                            summary: "GROUP",
                            label: "显示名称"
                        }),
                        search.createColumn({
                            name: "quantity",
                            summary: "SUM",
                            label: "数量"
                        }),
                        search.createColumn({
                            name: "fxrate",
                            summary: "MAX",
                            label: "货品价格"
                        }),
                        search.createColumn({
                            name: "quantityshiprecv",
                            summary: "SUM",
                            label: "已履行/已接收数量"
                        }),
                        search.createColumn({
                            name: "custcol_swc_poline_initial_key",
                            summary: "GROUP",
                            label: "订单行初始唯一键"
                        }),
                        search.createColumn({
                            name: "rate",
                            join: "taxItem",
                            summary: "AVG",
                            label: "税率"
                        }),
                        search.createColumn({
                            name: "currency",
                            summary: "GROUP",
                            label: "货币"
                        }),
                        search.createColumn({
                            name: "custcol_swc_including_tax_amt",
                            summary: "MAX",
                            label: "含税单价"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            summary: "SUM",
                            formula: "{fxrate}*{quantity}*(1+NVL({taxitem.rate}, 0)/100)",
                            label: "公式（数值）"
                        }),
                        search.createColumn({
                            name: "tranid",
                            summary: "GROUP",
                            label: "文档编号"
                        }),
                        search.createColumn({
                            name: "internalid",
                            join: "subsidiary",
                            summary: "GROUP",
                            label: "内部 ID"
                        }),
                        search.createColumn({
                            name: "custcol_swc_beihuo_plan",
                            label: "备货计划",
                            summary: "GROUP",
                        }),
                        search.createColumn({
                            name: "expectedreceiptdate",
                            label: "预计接收日期",
                            summary: "GROUP",
                        }),
                        search.createColumn({
                            name: "custbody_swc_order_type2",
                            label: "采购订单类型(手工单用)",
                            summary: "GROUP",
                        }),
                    ]
            });

            // let searchId = purchaseorderSearchObj.save();
            // log.audit('searchId',searchId);

            let pagedData = purchaseorderSearchObj.runPaged();
            let results = getAllResults(purchaseorderSearchObj);
            let allDataCount = pagedData.count; // 原始数据总数

            let dataCount = 0;//记录总数
            let filteredData = []; // 用于存储过滤后的数据
            var radioObj = getPrecentObj();

            if(allDataCount > 0) {
                // 首先，获取所有数据并进行过滤
                // let pageList = pagedData.fetch({
                //     index: pageId
                // });
                let allNumberObj = {};
                let vendorIdData = [];

                results.forEach((result,index)=> {
                    let item = {}
                    item.custpage_sublist_type_2 = result.getValue({
                        name: "custbody_swc_order_type2",
                        label: "采购订单类型(手工单用)",
                        summary: "GROUP",
                    }) || "";
                    item.custpage_sublist_demand_line_hide = result.getValue({
                        name: "custcol_swc_beihuo_plan",
                        label: "备货计划",
                        summary: "GROUP",
                    }) || "";
                    item.custpage_sublist_demand_line = result.getText({
                        name: "custcol_swc_beihuo_plan",
                        label: "备货计划",
                        summary: "GROUP",
                    }) || "";
                    item.custpage_sublist_expectedreceiptdate_line = result.getValue({
                        name: "expectedreceiptdate",
                        label: "预计接收日期",
                        summary: "GROUP",
                    }) || "";
                    //货币
                    item.currency = result.getValue({
                        name: "currency",
                        label: "货币",
                        summary: "GROUP",
                    }) || "";
                    item.currencyName = result.getText({
                        name: "currency",
                        label: "货币",
                        summary: "GROUP",
                    }) || "";
                    //税率
                    item.taxrate = result.getValue({
                        name: "rate",
                        join: "taxItem",
                        label: "税率",
                        summary: "AVG",
                    }) || "";
                    item.taxrate = parseInt(item.taxrate);
                    //税值 -:检索出的税额为相反值
                    // let taxAmount = (- Number(result.getValue({name: "taxamount", label: "金额（税）"}))) || 0;
                    let rate = result.getValue({
                        name: "custcol_swc_including_tax_amt",
                        summary: "MAX",
                        label: "含税单价"
                    }) || 0;
                    let quantity = Number(result.getValue({name: "quantity", label: "数量" , summary: "SUM"})) || 0;

                    item.selected = "";
                    item.order = result.getValue({name: "tranid", label: "文档编号", summary: "GROUP"}) || "";
                    item.orderId = result.getValue({name: "internalid", label: "内部 ID", summary: "GROUP"}) || "";
                    item.subsidiary = result.getValue({name: "subsidiarynohierarchy", label: "子公司（无层次结构）", summary: "GROUP"}) || "";
                    item.subsidiaryId = result.getValue({
                        name: "internalid",
                        join: "subsidiary",
                        summary: "GROUP",
                        label: "内部 ID"
                    }) || "";
                    item.vendor = result.getValue({
                        name: "entityid",
                        join: "vendor",
                        label: "名称",
                        summary: "GROUP"
                    }) || "";
                    item.vendorId = result.getValue({
                        name: "internalid",
                        join: "vendor",
                        label: "内部ID",
                        summary: "GROUP"
                    }) || "";
                    if (vendorIdData.indexOf(item.vendorId) == -1)
                        vendorIdData.push(item.vendorId);
                    item.item = result.getValue({name: "item", label: "货品" , summary: "GROUP"}) || "";
                    item.itemName = result.getValue({
                        name: "itemid",
                        join: "item",
                        label: "名称",
                        summary: "GROUP"
                    }) || "";
                    item.itemCode = result.getValue({
                        name: "displayname",
                        join: "item",
                        label: "显示名称",
                        summary: "GROUP"
                    }) || "";
                    item.rate = rate;
                    item.quantity = quantity;


                    //含税总额
                    item.grossamount = MatchTool.fixed(result.getValue({
                        name: "formulanumeric",
                        formula: "{fxrate}*{quantity}*(1+NVL({taxitem.rate}, 0)/100)",
                        label: "含税总金额",
                        summary: "SUM"
                    }) || "",2);
                    //含税单价
                    item.taxprice = divN(item.grossamount,item.quantity);
                    item.recvquantity = result.getValue({name: "quantityshiprecv", label: "已履行/已接收数量" , summary: "SUM"}) || "";
                    item.startKey = result.getValue({name: "custcol_swc_poline_initial_key", label: "订单行初始唯一键" , summary: "GROUP"}) || "";
                    // item.endKey = result.getValue({name: "custcol_swc_poline_afterwards_key", label: "订单行后续唯一键"}) || "";
                    // item.lineId = result.getValue({name: "line", label: "行 Id"}) || "";

                    //行总数量
                    if (item.startKey in allNumberObj) {
                        allNumberObj[item.startKey] = allNumberObj[item.startKey] + quantity;
                    } else {
                        allNumberObj[item.startKey] = quantity;
                    }

                    let vendorId = result.getValue({
                        name: "internalid",
                        join: "vendor",
                        label: "内部ID",
                        summary: "GROUP"
                    });

                    //供应商 申请比例
                    if (String(vendorId) in vendorObj) {
                        if (vendorObj[String(vendorId)].radio) {
                            item.radio = vendorObj[String(vendorId)].radio[0] || 0;
                        } else {
                            item.radio = 0
                        }
                    } else {
                        item.radio = 0;
                    }

                    if (String(vendorId) in vendorObj) {
                        item.radiolist = vendorObj[String(vendorId)].radio;
                    } else {
                        item.radiolist = [];
                    }


                    let radioName = 0;
                    if (item.radio) {
                        radioName = radioObj[item.radio].name;
                    }

                    // 如果已履行数量等于总数量，跳过后续处理
                    if (item.recvquantity == item.quantity) return;

                    if (item.radio == 0) return;

                    item.trandate = result.getValue({name: "trandate", label: "日期" , summary: "GROUP"});

                    // item.yjAmount = accMul(accMul(item.rate,(Number(item["quantity"]) - Number(item["recvquantity"]))),parseInt(item.radio)/100)
                    //预付金额
                    item.yjAmount = 0;

                    let amountObj = vprepObj.amountObj;
                    let numberObj = vprepObj.numberObj;
                    //整单已预付金额
                    item.wholeamount = 0;
                    if (item.startKey in amountObj) {
                        item.wholeamount = MatchTool.fixed(amountObj[item.startKey].amountNow,2);
                    }
                    item.wholeamount_no = 0;
                    if (item.startKey in amountObj) {
                        item.wholeamount_no = MatchTool.fixed(amountObj[item.startKey].amountNow_no,2) || 0;
                    }

                    //该初始行已提交预付申请的预计入库数量合计
                    item.wholenumber = 0;
                    if (item.startKey in numberObj) {
                        item.wholenumber = numberObj[item.startKey].receiveNow;
                    }

                    //整单预付标志
                    if (item.wholeamount == 0) {
                        item.wholeFlag = 'T';
                        //整单预付比例
                        item.yjAmount = MatchTool.fixed(MatchTool.mulN(MatchTool.mulN(item.taxprice,quantity),MatchTool.divN(parseInt(radioName),100)),2);
                    } else {
                        item.wholeFlag = 'F';
                    }

                    // 如果预付款金额等于总额，跳过后续处理
                    if (item.wholeamount == item.grossamount) return;

                    if (quantity == item.wholenumber) return;

                    // 添加到过滤后的数据数组
                    filteredData.push(item);
                });

                // 计算过滤后的数据总数
                dataCount = filteredData.length;
                //获取良品价格
                let goodPriceObj = getGoodPrice(vendorIdData);

                // 进行分页处理
                if(dataCount > 0) {
                    let startIndex = pageId * pageSize;
                    let endIndex = Math.min(startIndex + pageSize, dataCount);

                    // 获取当前页的数据
                    let currentPageData = filteredData.slice(startIndex, endIndex);

                    var flagIndex = 0;
                    // 为当前页数据添加序号和勾选状态
                    currentPageData.forEach((item, index) => {
                        item.index = (startIndex + index + 1 - flagIndex).toString();
                        item.allNumber = 0;
                        //行总数
                        if (item.startKey in allNumberObj) {
                            item.allNumber = allNumberObj[item.startKey];
                        }

                        // if (item.allNumber == item.wholenumber) {
                        //     flagIndex++;
                        //     dataCount--;
                        //     return;
                        // }
                        item.goodprice = 0;
                        //良品价格 key
                        let goodPriceKey = item.subsidiaryId + '_' + item.vendorId + '_' + item.item;

                        if (goodPriceKey in goodPriceObj) {
                            let goodLineObj = goodPriceObj[goodPriceKey];
                            for (let lineKey in goodLineObj) {
                                if (new Date(item.trandate) >= new Date(lineKey)) {
                                    if (item.currency == '1')
                                        item.goodprice = goodLineObj[lineKey].amountRMB;
                                    if (item.currency == '2')
                                        item.goodprice = goodLineObj[lineKey].amountMY;
                                    break;
                                }
                            }
                        }

                        // // 翻页勾选逻辑
                        // let uniqueKey = item["subsidiaryId"] + '_' + item["vendorId"] + '_' + item["orderId"] + '_' + parameters.custpage_whole_payment + '_' + item["radio"] + '_' + item["currency"];
                        // let lineKey = item.lineId + '_' + item.startKey + '_' + item.endKey;
                        //
                        // let selectedDataObj = parameters["custpage_selected"] ? JSON.parse(parameters["custpage_selected"]) : {};
                        // if (selectedDataObj) {
                        //     if (uniqueKey in selectedDataObj && lineKey in selectedDataObj[uniqueKey]) {
                        //         item["selected"] = "T";
                        //     }
                        // }

                        queryPageData.push(item);
                    });
                }
            }

            return {
                queryPageData: queryPageData,
                dataCount: dataCount
            }
        }

        function searchVendorDetail(vendor) {
            let filter = [];
            if (vendor) {
                filter.push(
                    ["internalid","anyof",vendor]
                )
            }

            let vendorSearchObj = search.create({
                type: "vendor",
                filters:
                filter,
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID", sort: 'DESC'}),
                        search.createColumn({name: "entityid", label: "名称"}),
                        search.createColumn({name: "custentity_swc_advance_payment_percent", label: "预付款比例"})
                    ]
            });

            let results = getAllResults(vendorSearchObj);
            let vendorObj = {};
            results.forEach(function (value) {
                let id = value.id;
                vendorObj[id] = {
                    radio: value.getValue({name: "custentity_swc_advance_payment_percent", label: "预付款比例"})
                }
            });

            for (const key in vendorObj) {
                const radioValue = vendorObj[key].radio;

                if (radioValue && typeof radioValue === 'string' && radioValue.trim() !== "") {
                    // 分割字符串，清理并转换为数字进行排序
                    const values = radioValue.split(',')
                    .map(item => item.trim())
                    .filter(item => item !== "")
                    .map(item => {
                        // 尝试转换为数字进行排序，但保持字符串类型
                        const num = parseInt(item, 10);
                        return isNaN(num) ? item : num;
                    })
                    .sort((a, b) => {
                        // 数字排序
                        if (typeof a === 'number' && typeof b === 'number') {
                            return a - b;
                        }
                        // 如果混合类型，数字优先
                        if (typeof a === 'number' && typeof b !== 'number') return -1;
                        if (typeof a !== 'number' && typeof b === 'number') return 1;
                        // 都是字符串则按字母排序
                        return String(a).localeCompare(String(b));
                    })
                    .map(item => String(item)); // 转换回字符串

                    // 更新对象
                    vendorObj[key] = {
                        "radio": values
                    };
                }
            }

            return vendorObj
        }

        function searchVprep(subsidiary,vendor) {
            let filter = [
                ["isinactive","is","F"],
                "AND",
                ["custrecord_swc_advancepay_state","noneof",SWC_CONFIG_DATA.configData().s_pr_status_yzf,SWC_CONFIG_DATA.configData().s_pr_status_yjj],
                // "AND",
                // ["custrecord_swc_advancepay_whole_yes","is","T"],
                "AND",
                ["custrecord_swc_advancepay_main.custrecord_swc_advancepay_line_initial","isnotempty",""]
            ];
            if (subsidiary) {
                filter.push("AND");
                filter.push(
                    ["custrecord_swc_advancepay_subsidary","anyof",subsidiary]
                );
            }
            if (vendor) {
                filter.push("AND");
                filter.push(
                    ["custrecord_swc_advancepay_vendor","anyof",vendor]
                )
            }
            let customrecord_swc_advancepay_plateformSearchObj = search.create({
                type: "customrecord_swc_advancepay_plateform",
                title: '预付款平台 已预付数量合计' + new Date(),
                filters:
                filter,
                columns:
                    [
                        search.createColumn({
                            name: "custrecord_swc_advancepay_line_initial",
                            join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                            summary: "GROUP",
                            label: "订单行初始唯一键"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_advancepay_amount_now",
                            join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                            summary: "SUM",
                            label: "本次申请预付金额"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_advancepay_receive_now",
                            join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                            summary: "SUM",
                            label: "预计本次入库数量"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_advancepay_line_good_num",
                            join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                            summary: "SUM",
                            label: "预计本次良品数量"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_advancepay_whole_yes",
                            summary: "GROUP",
                            label: "整张订单预付"
                        })
                    ]
            });

            let results = getAllResults(customrecord_swc_advancepay_plateformSearchObj);

            let VprepObj = {};
            let amountObj = {};
            let numberObj = {};
            results.forEach(function (value) {
                let id = value.id;
                let startKey = value.getValue({
                    name: "custrecord_swc_advancepay_line_initial",
                    join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                    summary: "GROUP",
                    label: "订单行初始唯一键"
                });
                if (startKey == '- None -')
                    startKey = '';
                let amountNow = Number(value.getValue({
                    name: "custrecord_swc_advancepay_amount_now",
                    join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                    summary: "SUM",
                    label: "本次申请预付金额"
                }));
                let receiveNow = Number(value.getValue({
                    name: "custrecord_swc_advancepay_receive_now",
                    join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                    summary: "SUM",
                    label: "预计本次入库数量"
                }));
                let goodNow = Number(value.getValue({
                    name: "custrecord_swc_advancepay_line_good_num",
                    join: "CUSTRECORD_SWC_ADVANCEPAY_MAIN",
                    summary: "SUM",
                    label: "预计本次良品数量"
                }));
                let wholeFlag = value.getValue({
                    name: "custrecord_swc_advancepay_whole_yes",
                    summary: "GROUP",
                    label: "整张订单预付"
                });

                if (!(startKey in amountObj)) {
                    amountObj[startKey] = {}
                }
                if (wholeFlag) {
                    amountObj[startKey].amountNow = amountNow
                }
                if (!wholeFlag) {
                    amountObj[startKey].amountNow_no = amountNow
                }
                if (startKey in numberObj) {
                    numberObj[startKey].receiveNow = numberObj[startKey].receiveNow + receiveNow + goodNow
                } else {
                    numberObj[startKey] = {
                        receiveNow: receiveNow + goodNow
                    }
                }

            });

            VprepObj.amountObj = amountObj;
            VprepObj.numberObj = numberObj;
            return VprepObj
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

        // //检索 供应商预付款单 得到整单已预付金额
        // function searchVPrep(subsidiary) {
        //     let filter = [
        //         ["type","anyof","VPrep"],
        //         "AND",
        //         ["approvalstatus","noneof","3"],
        //         "AND",
        //         ["custbody_swc_advancepay_line_initial1","isnotempty",""],
        //         "AND",
        //         ["mainline","is","T"]
        //     ]
        //     if (subsidiary) {
        //         filter.push("AND");
        //         filter.push(
        //             ["custrecord_swc_advancepay_subsidary","anyof",subsidiary]
        //         );
        //     }
        //     let vendorprepaymentSearchObj = search.create({
        //         type: "vendorprepayment",
        //         settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
        //         filters:filter,
        //         columns:
        //             [
        //                 search.createColumn({name: "internalid", label: "内部 ID"}),
        //                 search.createColumn({name: "amount", label: "金额"}),
        //                 search.createColumn({name: "custbody_swc_advancepay_line_initial1", label: "行初始唯一键"}),
        //             ]
        //     });
        //
        //     let results = getAllResults(vendorprepaymentSearchObj);
        //     let obj = {};
        //     results.forEach(value => {
        //         let id = value.getValue({name: "internalid", label: "内部 ID"});
        //         let amount = Math.abs(value.getValue({name: "amount", label: "金额"}));
        //         let startKey = value.getValue({name: "custbody_swc_advancepay_line_initial1", label: "行初始唯一键"});
        //         if (startKey in obj) {
        //             obj[startKey].amount = obj[startKey].amount + amount;
        //         } else {
        //             obj[startKey] = {
        //                 amount: amount
        //             }
        //         }
        //     });
        //
        //     return obj
        // }

        // //获取良品数量
        // function getGoodPrice(vendorIdData) {
        //     var itemSearchObj = search.create({
        //         type: "item",
        //         filters:
        //             [
        //                 ["othervendor","noneof","@NONE@"],
        //                 "AND",
        //                 ["othervendor","anyof",vendorIdData]
        //             ],
        //         columns:
        //             [
        //                 search.createColumn({name: "internalid", label: "内部 ID"}),
        //                 search.createColumn({name: "itemid", label: "名称"}),
        //                 search.createColumn({name: "othervendor", label: "供应商"}),
        //                 search.createColumn({name: "vendorcost", label: "供应商价格"})
        //             ]
        //     });
        //
        //     let results = getAllResults(itemSearchObj);
        //     let obj = {};
        //     results.forEach(value => {
        //         let id = value.getValue({name: "internalid", label: "内部 ID"});
        //         let vendor = value.getValue({name: "othervendor", label: "供应商"});
        //         let goodPrice = value.getValue({name: "vendorcost", label: "供应商价格"});
        //         let key =  id + '_' + vendor;
        //
        //         obj[key] = {
        //             goodPrice: goodPrice
        //         }
        //     });
        //
        //     return obj
        // }

        function getPrecentObj () {
            var customlist_swc_prepay_precent_listSearchObj = search.create({
                type: "customlist_swc_prepay_precent_list",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "name", label: "名称"})
                    ]
            });

            let results = getAllResults(customlist_swc_prepay_precent_listSearchObj);
            let obj = {};
            results.forEach(value => {
                let id = value.getValue({name: "internalid", label: "内部 ID"});
                let name = value.getValue({name: "name", label: "名称"});

                obj[id] = {
                    name: name
                }
            });

            return obj
        }

        function getGoodPrice(vendorIdData) {
            var customrecord_swc_po_price_listSearchObj = search.create({
                type: "customrecord_swc_po_price_list",
                filters:
                    [
                        ["custrecord_swc_supplier","anyof",vendorIdData],
                        "AND",
                        ["custrecord_swc_approval_status","anyof","2"]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_supplier", label: "供应商"}),
                        search.createColumn({name: "custrecord_swc_subsidiary", label: "子公司"}),
                        search.createColumn({name: "custrecord_swc_currency", label: "供应商主要币种"}),
                        search.createColumn({
                            name: "custrecord_swc_item",
                            join: "CUSTRECORD_SWC_SKU_PRICE_MAIN_LIST",
                            label: "货品"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_good_unit_price",
                            join: "CUSTRECORD_SWC_SKU_PRICE_MAIN_LIST",
                            label: "良品含税单价(人民币)"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_good_unit_price_usd",
                            join: "CUSTRECORD_SWC_SKU_PRICE_MAIN_LIST",
                            label: "良品含税单价(美金)"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_effective_date",
                            join: "CUSTRECORD_SWC_SKU_PRICE_MAIN_LIST",
                            label: "生效日期",
                            sort: search.Sort.DESC
                        })
                    ]
            });

            let results = getAllResults(customrecord_swc_po_price_listSearchObj);
            let obj = {};
            results.forEach(value => {
                let vendor = value.getValue({name: "custrecord_swc_supplier", label: "供应商"});
                let sub = value.getValue({name: "custrecord_swc_subsidiary", label: "子公司"});
                let item = value.getValue({
                    name: "custrecord_swc_item",
                    join: "CUSTRECORD_SWC_SKU_PRICE_MAIN_LIST",
                    label: "货品"
                });
                let amountRMB = value.getValue({
                    name: "custrecord_swc_good_unit_price",
                    join: "CUSTRECORD_SWC_SKU_PRICE_MAIN_LIST",
                    label: "良品含税单价(人民币)"
                });
                let amountMY = value.getValue({
                    name: "custrecord_swc_good_unit_price_usd",
                    join: "CUSTRECORD_SWC_SKU_PRICE_MAIN_LIST",
                    label: "良品含税单价(美金)"
                });
                let date = value.getValue({
                    name: "custrecord_swc_effective_date",
                    join: "CUSTRECORD_SWC_SKU_PRICE_MAIN_LIST",
                    label: "生效日期"
                });
                let key = sub + '_' +  vendor + '_' + item;

                obj[key] = obj[key] || {};
                obj[key][date] = {
                    amountRMB: amountRMB,
                    amountMY: amountMY,
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

        function searchBL() {
            const customlist_swc_prepay_precent_listSearchObj = search.create({
                type: "customlist_swc_prepay_precent_list",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "name", label: "名称"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });

            let results = getAllResults(customlist_swc_prepay_precent_listSearchObj);
            let arr = [];
            results.forEach(function (value) {

                arr.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: value.getValue({name: "name", label: "名称"})
                })
            });

            return arr;
        }

        return {
            getPagedSelect: getPagedSelect, // 获取分页下拉选数据
            searchSubsidiary: searchSubsidiary,//获取子公司信息
            searchVendor: searchVendor,//获取供应商信息
            srcPurchOrd: srcPurchOrd,//获取采购订单
            initParams: initParams,
            getData: getData,
            accMul: accMul,
            divN: divN,
            srcAccount: srcAccount,
            getPrecentObj: getPrecentObj,
            searchTerms: searchTerms,
            searchBillAccount: searchBillAccount,
            searchBillTerms: searchBillTerms,
            searchBL: searchBL
        }

    });