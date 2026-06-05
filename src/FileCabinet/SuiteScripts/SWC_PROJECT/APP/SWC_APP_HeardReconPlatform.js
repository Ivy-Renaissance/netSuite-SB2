/**
 * @NApiVersion 2.1
 * @author swr
 * @description search
 */

define([ "N/query", "N/search", "N/format", "N/record","N/runtime", 'N/url','../common/MatchTool', '../common/SWC_CONFIG_DATA'],
    function (query, search, format, record,runtime,url,MatchTool,SWC_CONFIG_DATA) {


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
                parameters["custpage_fee_type"] = "";
                parameters["custpage_ls_preta"] = "";
                parameters["custpage_ls_eta"] = "";
                parameters["custpage_ls_wat"] = "";
                parameters["custpage_ls_container_number"] = "";
                parameters["custpage_ls_vendor"] = "";
                parameters["custpage_ls_order_number"] = "";
                parameters["custpage_bussiness"] = "";
                // parameters["custpage_reconciliation_date"] = new Date();
                // parameters["custpage_main_memo"] = "";
                parameters["custpage_xxdzd"] = "";
                parameters["custpage_type"]= "";

                parameters["custpage_reconciliation_date"] = '';
                parameters["custpage_main_memo"] = '';
                parameters["custpage_reconciliation_amount_total"] = '';
                parameters["custpage_payable_amount_total"] = '';

                parameters["custpage_gc_flag"] = '';
                parameters["custpage_selected"] = '';
            }

            log.audit('parameters["custpage_commit_flag"]',parameters["custpage_commit_flag"]);
            if (method == "POST" && parameters["custpage_commit_flag"] == "F") {
                parameters["custpage_paged_index_detail"] = 1;
                parameters["custpage_subsidiary"] = parameters["custpage_subsidiary"] || '';
                parameters["custpage_customer"] = parameters["custpage_customer"] || '';

                parameters["custpage_bussiness"] = "";
                parameters["custpage_reconciliation_date"] = '';
                parameters["custpage_main_memo"] = '';
                parameters["custpage_reconciliation_amount_total"] = '';
                parameters["custpage_payable_amount_total"] = '';

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

                log.audit('parameters',parameters);
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
                ["type","anyof","VendBill","VendCred"],
                // "AND",
                // ["custbody_po_fee","anyof","3","6"],
                "AND",
                ["custcol_swc_vendor_statement","anyof","@NONE@"],
                "AND",
                ["mainline","is","F"],
                "AND",
                ["taxline","is","F"],
            ];

            // if (parameters.custpage_bussiness) {
            //     filter.push("AND");
            //     filter.push(["item.custitem_swc_item_applay_department","anyof",parameters.custpage_bussiness]);
            // }

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
                filter.push(["trandate","on",parameters.custpage_start_date]);
            }

            //费用类型
            if (parameters.custpage_fee_type) {
                let orderIds = String(parameters.custpage_fee_type)
                .split(/[^0-9]+/)
                .filter(id => id.length > 0);
                filter.push("AND");
                filter.push(["item","anyof", orderIds]);
            }

            //物流发运单号
            if (parameters.custpage_ls_order_number) {
                filter.push("AND");
                filter.push(["custbody_swc_wl_no","anyof", parameters.custpage_ls_order_number]);
            }

            //集装箱箱号
            if (parameters.custpage_ls_container_number) {
                filter.push("AND");
                filter.push(["custbody_swc_wl_no.custrecord_swc_wl_container_number","startswith", parameters.custpage_ls_container_number]);
            }

            //预计进港时间
            if (parameters.custpage_ls_preta) {
                filter.push("AND");
                filter.push(["custbody_swc_wl_no.custrecord_swc_expected_arrival_time","on", parameters.custpage_ls_preta]);
            }

            //到港时间
            if (parameters.custpage_ls_eta) {
                filter.push("AND");
                filter.push(["custbody_swc_wl_no.custrecord_swc_wl_eta","on", parameters.custpage_ls_eta]);
            }

            //到仓时间
            if (parameters.custpage_ls_wat) {
                filter.push("AND");
                filter.push(["custbody_swc_wl_no.custrecord_swc_wl_ata","on", parameters.custpage_ls_wat]);
            }

            if (parameters.custpage_xxdzd) {
                filter.push("AND");
                filter.push(["custcol_swc_statement_offline","startswith", parameters.custpage_xxdzd]);
            }
            log.error('检索条件',filter)

            if (parameters.custpage_type) {
                let orderIds = String(parameters.custpage_type)
                .split(/[^0-9]+/)
                .filter(id => id.length > 0);
                filter.push("AND");
                filter.push(["custbody_swc_order_type2","anyof",orderIds]);
            }

            //物流对账单 账单 检索
            var transactionSearchObj = search.create({
                type: "transaction",
                title: '物流对账单平台 数据 检索' + new Date(),
                settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters: filter,
                columns:
                    [
                        search.createColumn({name: "item", label: "货品", sort: search.Sort.DESC}),
                        search.createColumn({name: "internalid", label: "内部 ID" , sort: search.Sort.ASC}),
                        search.createColumn({name: "line", label: "行 Id"}),
                        search.createColumn({name: "subsidiarynohierarchy", label: "子公司（无层次结构）"}),
                        search.createColumn({
                            name: "internalid",
                            join: "vendor",
                            label: "内部 ID"
                        }),
                        search.createColumn({
                            name: "entityid",
                            join: "vendor",
                            label: "内部 ID"
                        }),

                        search.createColumn({name: "currency", label: "货币"}),
                        search.createColumn({name: "exchangerate", label: "汇率"}),
                        search.createColumn({name: "trandate", label: "日期"}),
                        search.createColumn({name: "type", label: "类型"}),
                        search.createColumn({name: "transactionname", label: "事务处理名称"}),
                        search.createColumn({name: "quantity", label: "数量"}),
                        // search.createColumn({name: "taxamount", label: "金额（税）"}),
                        search.createColumn({
                            name: "formulacurrency2",
                            formula: "NVL({taxamount}/{exchangerate}, 0)",
                            label: "税额"
                        }),
                        search.createColumn({
                            name: "formulacurrency",
                            formula: "CASE {type} WHEN '账单' THEN ABS({fxamount})+ABS(NVL({taxamount}/{exchangerate} , 0)) WHEN '账单贷项' THEN (ABS({fxamount})+ABS(NVL({taxamount}/{exchangerate} , 0))) * (-1) END",
                            label: "含税总金额"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_wl_rm_sta_gk",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "起运港"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_wl_md_lc",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "目的港"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_wl_loading_date",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "装柜日期"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_expected_arrival_time",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "起运港实际进港时间"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_wl_eta",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "预计到岸日期ETA"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_gate_out_time_for",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "出港待送货时间gate out"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_wl_return_time",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "还柜时间"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_wl_spo",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "SPO"
                        }),
                        // search.createColumn({
                        //     name: "custrecord23",
                        //     join: "CUSTBODY_SWC_WL_NO",
                        //     label: "实际柜号"
                        // }),
                        search.createColumn({
                            name: "custrecord_swc_wl_total_volume",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "总体积（CBM）"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_contract_cabinet1",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "合约柜/非合约柜"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_fy_full_link",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "全链路/到港"
                        }),

                        search.createColumn({
                            name: "custrecord_swc_broker_reference",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "Broker Reference"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_entry_number",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "Entry Number"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_inv_no",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "INV NO"
                        }),
                        search.createColumn({
                            name: "custbody_swc_wl_no",
                            label: "物流发运单"
                        }),
                        search.createColumn({
                            name: "displayname",
                            join: "item",
                            label: "显示名称"
                        }),
                        search.createColumn({
                            name: "custcol_swc_statement_offline",
                            label: "线下对账单号"
                        }),
                        search.createColumn({name: "createdfrom", label: "创建自"}),
                        search.createColumn({name: "custbody_swc_search_duedate", label: "到期日期"}),

                        search.createColumn({
                            name: "custrecord_swc_hw_lc_number",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "海外仓入库单号"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_total_actual_shipment_qua",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "总真实发运数量"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_md_location",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "目的海外仓仓库代码"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_wl_zg_size",
                            join: "CUSTBODY_SWC_WL_NO",
                            label: "货柜尺寸"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_document_number",
                            join: "CUSTRECORD_SWC_HW_TRNFRORD_LINK",
                            label: "单据编号"
                        }),
                        search.createColumn({name: "custcol_swc_lastmile_po1", label: "尾程费用_出库单号"}),
                        search.createColumn({name: "custcol_swc_lastmile_track1", label: "尾程费用_跟踪号"}),
                        search.createColumn({name: "custcol_swc_lastmile_sku1", label: "尾程费用_实物SKU/仓库SKU"}),
                        search.createColumn({name: "custcol_swc_lastmile_place1", label: "尾程费用_仓库代码"}),
                        search.createColumn({name: "custcol_swc_lastmile_quantity1", label: "尾程费用_SKU数量"}),
                        search.createColumn({name: "custcol_swc_lastmile_jfdate1", label: "尾程费用_计费日期"}),
                        search.createColumn({name: "custcol_swc_lastmile_receipt1", label: "尾程费用_入库单号/物流子单号"}),
                        search.createColumn({
                            name: "custbody_swc_order_type2",
                            label: "采购订单类型(手工单用)",
                        }),

                    ]
            });

            // var search1 = transactionSearchObj.save();
            // log.audit('search1',search1);
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
                    var custpage_sublist_type_2 = result.getValue({
                        name: "custbody_swc_order_type2",
                        label: "采购订单类型(手工单用)",
                    }) || "";
                    var custpage_sublist_documentid = result.getValue({name: "internalid", label: "内部 ID" , sort: search.Sort.ASC}) || "";
                    var custpage_sublist_cgdd = result.getText({name: "createdfrom", label: "创建自"}) || "";
                    var custpage_sublist_cgdd_hide = result.getValue({name: "createdfrom", label: "创建自"}) || "";
                    var custpage_sublist_lineid = result.getValue({name: "line", label: "行 Id"}) || "";
                    var custpage_sublist_subsidiary_hide = result.getValue({name: "subsidiarynohierarchy", label: "子公司（无层次结构）"}) || "";
                    var custpage_sublist_subsidiary = result.getText({name: "subsidiarynohierarchy", label: "子公司（无层次结构）"}) || "";
                    var  custpage_sublist_vendor_hide = result.getValue({
                        name: "internalid",
                        join: "vendor",
                        label: "内部 ID"
                    }) || "";
                    var custpage_sublist_vendor = result.getValue({
                        name: "entityid",
                        join: "vendor",
                        label: "内部 ID"
                    }) || "";
                    var  custpage_sublist_currency_hide = result.getValue({name: "currency", label: "货币"}) || "";
                    var  custpage_sublist_currency = result.getText({name: "currency", label: "货币"}) || "";
                    var custpage_sublist_tax = result.getValue({name: "exchangerate", label: "汇率"}) || "";
                    var custpage_sublist_date = result.getValue({name: "trandate", label: "日期"}) || "";
                    var custpage_sublist_type = result.getValue({name: "type", label: "类型"}) || "";
                    if (custpage_sublist_type == 'VendBill') {
                        custpage_sublist_type = '费用账单'
                    } else {
                        custpage_sublist_type = '费用贷项'
                    }
                    var custpage_sublist_invoice_number = result.getValue({name: "transactionname", label: "事务处理名称"}) || "";
                    var quantity = result.getValue({name: "quantity", label: "数量"}) || 0;
                    var taxamount = result.getValue({
                        name: "formulanumeric2",
                        formula: "{taxitem.rate}*{fxamount}/100",
                        label: "税额"
                    }) || 0;
                    // if (taxamount)
                    //     taxamount = MatchTool.fixed(taxamount,2);
                    // var fxamount = Number(result.getValue({
                    //     name: "formulanumeric",
                    //     formula: "{fxamount}",
                    //     label: "公式（数值）"
                    // })) || 0;
                    // var sumAmount = fxamount + Math.abs(taxamount);
                    var sumAmount = Number(result.getValue({
                        name: "formulacurrency",
                        formula: "CASE {type} WHEN '账单' THEN ABS({fxamount})+ABS(NVL({taxamount}/{exchangerate} , 0)) WHEN '账单贷项' THEN (ABS({fxamount})+ABS(NVL({taxamount}/{exchangerate} , 0))) * (-1) END",
                        label: "含税总金额"
                    })) || 0;
                    var price = 0;
                    if (quantity) {
                        quantity = Math.abs(quantity);
                        price = sumAmount/quantity;
                    } else {
                        price = sumAmount;
                    }

                    var custpage_swc_wl_id = result.getText({
                        name: "custbody_swc_wl_no",
                        label: "物流发运单"
                    }) || "";
                    var custpage_swc_wl_id_hide = result.getValue({
                        name: "custbody_swc_wl_no",
                        label: "物流发运单"
                    }) || "";

                    var custpage_swc_wl_rm_sta_gk = result.getText({
                        name: "custrecord_swc_wl_rm_sta_gk",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "起运港"
                    }) || "";
                    var custpage_swc_wl_rm_sta_gk_hide = result.getValue({
                        name: "custrecord_swc_wl_rm_sta_gk",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "起运港"
                    }) || "";
                    var custpage_swc_wl_md_lc = result.getText({
                        name: "custrecord_swc_wl_md_lc",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "目的港"
                    }) || "";
                    var custpage_swc_wl_md_lc_hide = result.getValue({
                        name: "custrecord_swc_wl_md_lc",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "目的港"
                    }) || "";
                    var custpage_swc_wl_loading_date = result.getValue({
                        name: "custrecord_swc_wl_loading_date",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "装柜日期"
                    }) || "";
                    var custpage_swc_wl_no = result.getValue({
                        name: "custrecord_swc_expected_arrival_time",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "起运港实际进港时间"
                    }) || "";
                    var custpage_swc_wl_etd = result.getValue({
                        name: "custrecord_swc_wl_eta",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "预计到岸日期ETA"
                    }) || "";
                    var custpage_swc_gate_out_time_for = result.getValue({
                        name: "custrecord_swc_gate_out_time_for",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "出港待送货时间gate out"
                    }) || "";
                    var custpage_swc_wl_return_time = result.getValue({
                        name: "custrecord_swc_wl_return_time",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "还柜时间"
                    }) || "";
                    var custpage_swc_wl_spo = result.getValue({
                        name: "custrecord_swc_wl_spo",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "SPO"
                    }) || "";
                    // var custpage_swc_wl_container_number = result.getValue({
                    //     name: "custrecord23",
                    //     join: "CUSTBODY_SWC_WL_NO",
                    //     label: "实际柜号"
                    // }) || "";
                    var custpage_swc_wl_total_volume = result.getValue({
                        name: "custrecord_swc_wl_total_volume",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "总体积（CBM）"
                    }) || 0;
                    var custpage_swc_contract_cabinet1_hide = result.getValue({
                        name: "custrecord_swc_contract_cabinet1",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "合约柜/非合约柜"
                    }) || "";
                    var custpage_swc_contract_cabinet1 = result.getText({
                        name: "custrecord_swc_contract_cabinet1",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "合约柜/非合约柜"
                    }) || "";
                    var custpage_swc_fy_full_link_hide = result.getValue({
                        name: "custrecord_swc_fy_full_link",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "全链路/到港"
                    }) || "";
                    var custpage_swc_fy_full_link = result.getText({
                        name: "custrecord_swc_fy_full_link",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "全链路/到港"
                    }) || "";
                    var  custpage_swc_fee_type_hide = result.getValue({name: "item", label: "货品" , sort: search.Sort.DESC}) || "";
                    var  custpage_swc_fee_type = result.getText({name: "item", label: "货品" , sort: search.Sort.DESC}) || "";
                    var  custpage_swc_fee_type_hide2 = result.getValue({
                        name: "displayname",
                        join: "item",
                        label: "显示名称"
                    }) || "";

                    var custpage_swc_broker_reference = result.getValue({
                        name: "custrecord_swc_broker_reference",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "Broker Reference"
                    }) || "";
                    var custpage_swc_enter_number = result.getValue({
                        name: "custrecord_swc_entry_number",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "Entry Number"
                    }) || "";
                    var custpage_swc_inv_no = result.getValue({
                        name: "custrecord_swc_inv_no",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "INV NO"
                    }) || "";
                    var custpage_sublist_xxdzd = result.getValue({
                        name: "custcol_swc_statement_offline",
                        label: "线下对账单号"
                    }) || "";
                    var dueDate = result.getValue({name: "custbody_swc_search_duedate", label: "到期日期"});
                    var days = 0;
                    if (dueDate && custpage_sublist_date) {
                        // 转换为Date对象（如果还不是）
                        var dueDateObj = new Date(dueDate);
                        var itemDateObj = new Date(custpage_sublist_date);

                        // 计算天数差（毫秒转换为天）
                        var diffTime = dueDateObj - itemDateObj;
                        days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) || 0;
                    }
                    var custpage_swc_hw_lc_number_dz = result.getValue({
                        name: "custrecord_swc_hw_lc_number",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "海外仓入库单号"
                    }) || "";
                    var custpage_swc_total_shipment_qua = result.getValue({
                        name: "custrecord_swc_total_actual_shipment_qua",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "总真实发运数量"
                    }) || "";
                    var custpage_swc_md_location = result.getValue({
                        name: "custrecord_swc_md_location",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "目的海外仓仓库代码"
                    }) || "";
                    var custpage_swc_wl_zg_size = result.getValue({
                        name: "custrecord_swc_wl_zg_size",
                        join: "CUSTBODY_SWC_WL_NO",
                        label: "货柜尺寸"
                    }) || "";
                    var custpage_swc_document_number = result.getValue({
                        name: "custrecord_swc_document_number",
                        join: "CUSTRECORD_SWC_HW_TRNFRORD_LINK",
                        label: "单据编号"
                    }) || "";
                    var custpage_swc_lastmile_po = result.getValue({name: "custcol_swc_lastmile_po1", label: "尾程费用_出库单号"}) || "";
                    var custpage_swc_lastmile_track = result.getValue({name: "custcol_swc_lastmile_track1", label: "尾程费用_跟踪号"}) || "";
                    var custpage_swc_lastmile_sku = result.getValue({name: "custcol_swc_lastmile_sku1", label: "尾程费用_实物SKU/仓库SKU"}) || "";

                    var custpage_swc_lastmile_place = result.getValue({name: "custcol_swc_lastmile_place1", label: "尾程费用_仓库代码"}) || "";
                    var custpage_swc_lastmile_quantity = result.getValue({name: "custcol_swc_lastmile_quantity1", label: "尾程费用_SKU数量"}) || "";
                    var custpage_swc_lastmile_jfdate = result.getValue({name: "custcol_swc_lastmile_jfdate1", label: "尾程费用_计费日期"}) || "";
                    var custpage_swc_lastmile_receipt = result.getValue({name: "custcol_swc_lastmile_receipt1", label: "尾程费用_入库单号/物流子单号"}) || "";



                    var item = {}
                    item.selected = "";
                    item.index = (startIndex + index + 1).toString();
                    item.custpage_sublist_type_2 = custpage_sublist_type_2;
                    item.custpage_sublist_cgdd = custpage_sublist_cgdd;
                    item.custpage_sublist_cgdd_hide = custpage_sublist_cgdd_hide;
                    item.custpage_sublist_documentid = custpage_sublist_documentid;
                    item.custpage_sublist_lineid = custpage_sublist_lineid;
                    item.custpage_sublist_subsidiary = custpage_sublist_subsidiary;
                    item.custpage_sublist_subsidiary_hide = custpage_sublist_subsidiary_hide;
                    item.custpage_sublist_vendor = custpage_sublist_vendor;
                    item.custpage_sublist_vendor_hide = custpage_sublist_vendor_hide;
                    item.custpage_sublist_currency = custpage_sublist_currency;
                    item.custpage_sublist_currency_hide = custpage_sublist_currency_hide;
                    item.custpage_sublist_tax = custpage_sublist_tax;
                    item.custpage_sublist_date = custpage_sublist_date;
                    item.custpage_sublist_type = custpage_sublist_type;
                    item.custpage_sublist_invoice_number = custpage_sublist_invoice_number;
                    item.custpage_swc_wl_id = custpage_swc_wl_id;
                    item.custpage_swc_wl_id_hide = custpage_swc_wl_id_hide;
                    item.custpage_swc_wl_rm_sta_gk = custpage_swc_wl_rm_sta_gk;
                    item.custpage_swc_wl_rm_sta_gk_hide = custpage_swc_wl_rm_sta_gk_hide;
                    item.custpage_swc_wl_md_lc = custpage_swc_wl_md_lc;
                    item.custpage_swc_wl_md_lc_hide = custpage_swc_wl_md_lc_hide;
                    item.custpage_swc_wl_loading_date = custpage_swc_wl_loading_date;
                    item.custpage_swc_wl_no = custpage_swc_wl_no;
                    item.custpage_swc_wl_etd = custpage_swc_wl_etd;
                    item.custpage_swc_gate_out_time_for = custpage_swc_gate_out_time_for;
                    item.custpage_swc_wl_return_time = custpage_swc_wl_return_time;
                    item.custpage_swc_wl_spo = custpage_swc_wl_spo;
                    // item.custpage_swc_wl_container_number = custpage_swc_wl_container_number;
                    item.custpage_swc_wl_total_volume = custpage_swc_wl_total_volume;
                    item.custpage_swc_contract_cabinet1 = custpage_swc_contract_cabinet1;
                    item.custpage_swc_contract_cabinet1_hide = custpage_swc_contract_cabinet1_hide;
                    item.custpage_swc_fy_full_link = custpage_swc_fy_full_link;
                    item.custpage_swc_fy_full_link_hide = custpage_swc_fy_full_link_hide;
                    item.custpage_swc_broker_reference = custpage_swc_broker_reference;
                    item.custpage_swc_enter_number = custpage_swc_enter_number;
                    item.custpage_swc_inv_no = custpage_swc_inv_no;
                    item.custpage_swc_fee_type = custpage_swc_fee_type;
                    item.custpage_swc_fee_type_hide = custpage_swc_fee_type_hide;
                    item.custpage_sublist_sku_number = quantity;
                    item.custpage_sublist_sku_price = price;
                    item.custpage_sublist_amount_sum = sumAmount;
                    item.custpage_swc_fee_type_hide2 = custpage_swc_fee_type_hide2;
                    item.custpage_sublist_xxdzd = custpage_sublist_xxdzd;
                    item.dueDate = dueDate;
                    item.days = days;

                    item.custpage_swc_hw_lc_number_dz = custpage_swc_hw_lc_number_dz;
                    item.custpage_swc_total_shipment_qua = custpage_swc_total_shipment_qua;
                    item.custpage_swc_md_location = custpage_swc_md_location;
                    item.custpage_swc_wl_zg_size = custpage_swc_wl_zg_size;
                    item.custpage_swc_document_number = custpage_swc_document_number;
                    item.custpage_swc_lastmile_po = custpage_swc_lastmile_po;
                    item.custpage_swc_lastmile_track = custpage_swc_lastmile_track;
                    item.custpage_swc_lastmile_sku = custpage_swc_lastmile_sku;
                    item.custpage_swc_lastmile_place = custpage_swc_lastmile_place;
                    item.custpage_swc_lastmile_quantity = custpage_swc_lastmile_quantity;
                    item.custpage_swc_lastmile_jfdate = custpage_swc_lastmile_jfdate;
                    item.custpage_swc_lastmile_receipt = custpage_swc_lastmile_receipt;

                    queryPageData.push(item);
                    log.audit('item',item);
                });
            }
            // 翻页勾选
            var selectedDataObj = parameters["custpage_selected"] ? JSON.parse(parameters["custpage_selected"]) : {};
            queryPageData.forEach(item => {
                var uniqueKey = item["custpage_sublist_documentid"] + '_' + item["custpage_sublist_lineid"];

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

        function searchLSOrder() {
            const customrecord_swc_wl_plan_orderSearchObj = search.create({
                type: "customrecord_swc_wl_plan_order",
                filters:
                    [
                        ["isinactive","is","F"]
                    ],
                columns:
                    [
                        search.createColumn({name: "name", label: "ID"}),
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "custrecord_swc_wl_container_number", label: "集装箱箱号"})
                    ]
            });

            var results = getAllResults(customrecord_swc_wl_plan_orderSearchObj);
            var oArr = [];
            var cArr = [];
            var cArr2 = [];
            var obj = {};
            results.forEach(function (value) {
                oArr.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: value.getValue({name: "name", label: "ID"}),
                });
                var con = value.getValue({name: "custrecord_swc_wl_container_number", label: "集装箱箱号"});
                var obj2 = {
                    value: con,
                    text: con,
                }

                if (cArr2.indexOf(con) == -1 && con) {
                    cArr2.push(con);
                    cArr.push(obj2);
                }

            });
            obj.oArr = oArr;
            obj.cArr = cArr;
            return obj;
        }

        function searchItem() {
            const serviceitemSearchObj = search.create({
                type: "serviceitem",
                filters:
                    [
                        ["type","anyof","Service"],
                        "AND",
                        ["isinactive","is","F"]
                    ],
                columns:
                    [
                        search.createColumn({name: "itemid", label: "名称"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });

            var results = getAllResults(serviceitemSearchObj);
            var arr = [];
            results.forEach(function (value) {
                arr.push({
                    value: value.getValue({name: "internalid", label: "内部 ID"}),
                    text: value.getValue({name: "itemid", label: "名称"}),
                });
            });
            return arr;
        }

        function searchBussiness() {
            const customlist_swc_pay_departmentsSearchObj = search.create({
                type: "customlist_swc_pay_departments",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "name", label: "名称"})
                    ]
            });

            var results = getAllResults(customlist_swc_pay_departmentsSearchObj);
            var arr = [];
            results.forEach(function (value) {
                arr.push({
                    value: value.id,
                    text: value.getValue({name: "name", label: "名称"}),
                });
            });
            return arr;
        }

        function round(number, precision) { return Math.round(+number + 'e' + precision) / Math.pow(10, precision); }

        return {
            initParams: initParams,
            getNewOrder: getNewOrder,
            getPagedSelect: getPagedSelect, // 获取分页下拉选数据
            searchSubsidiary: searchSubsidiary,
            searchVendor:searchVendor,
            searchCurrency: searchCurrency,
            searchLSOrder: searchLSOrder,
            searchItem: searchItem,
            searchBussiness: searchBussiness,
            getData: getData,
        }

    });