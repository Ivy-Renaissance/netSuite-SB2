/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *请购单创建采购页面
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/runtime', '../common/moment'], function (ui, search, record, runtime, moment) {

    function onRequest(context) {
        try {
            var response = context.response;
            var request = context.request;
            var method = request.method;
            var params = request.parameters;
            showResult(method, params, response);
        } catch (e) {
            log.debug('e', e);
        }
    }

    function showResult(method, params, response) {
        var page_form = createForm(params);
        if (method == 'GET') {
            if (params.action == 'search') {
                var result = getNeedData(params);//获取数据
                log.debug('result', result);
                if (result.length > 0) {
                    page_form = setFormValue(page_form, result);//渲染结果
                }
            }
        }
        response.writePage(page_form);
    }

    //创建Form
    function createForm(params) {
        var form = ui.createForm({ title: '请购转采购' });
        form.clientScriptModulePath = '../CS/SWC_CS_PR_CREATE_PO.js';
        //按钮
        form.addButton({ id: 'select_data', label: '搜索', functionName: 'Select()' });
        form.addButton({ id: 'create_bill', label: '生成采购订单', functionName: 'createBill()' });
        //分组
        form.addFieldGroup({ id: 'search_group', label: '搜索条件' });

        var search_vendor = form.addField({ id: 'search_vendor', type: ui.FieldType.SELECT, source: 'vendor', label: '供应商', container: 'search_group' });
        search_vendor.defaultValue = params.search_vendor ? params.search_vendor : '';
        form.addField({ id: 'custpage_batch', type: ui.FieldType.SELECT, source: 'customlist_swc_dp_batch', label: '备货批次', container: 'search_group' });
        form.addField({ id: 'custpage_batch_month', type: ui.FieldType.TEXT, label: '备货月批次编码', container: 'search_group' });
        form.addField({ id: 'custpage_begin', type: ui.FieldType.DATE, label: '备货开始日期', container: 'search_group' });
        form.addField({ id: 'custpage_end', type: ui.FieldType.DATE, label: '备货结束日期', container: 'search_group' });
        form.addField({ id: 'custpage_hd_currency', type: ui.FieldType.SELECT, source: 'currency', label: '惠达货品币种', container: 'search_group' });
        form.addFieldGroup({ id: 'main_group', label: '采购信息' });
        var custpage_bill_trandate = form.addField({ id: 'custpage_trandate', type: ui.FieldType.DATE, source: '', label: '采购日期', container: 'main_group' });
        custpage_bill_trandate.defaultValue = new Date()
        // 查询字段默认值
        var fields = ['custpage_batch', 'custpage_batch_month', 'custpage_begin', 'custpage_end','custpage_hd_currency', 'custpage_trandate'];
        for (var i in fields) {
            var param = params[fields[i]];
            if (param) {
                form.getField({
                    id:  fields[i]
                }).defaultValue = param;
            }
        }


        
        var custpage_bill_subsidiary = form.addField({ id: 'custpage_bill_subsidiary', type: ui.FieldType.SELECT, source: '', label: '子公司', container: 'main_group' });
        //根据所选供应商获取子公司(查询供应商及公司主体映射表)
        var search_sub_id;
        if (params.search_vendor) {
            var sub_arr = getSubInfo(params.search_vendor);
            if (sub_arr.length > 0) {
                search_sub_id = sub_arr[0].value;
                for (var i = 0; i < sub_arr.length; i++) {
                    custpage_bill_subsidiary.addSelectOption({
                        value: sub_arr[i].value,
                        text: sub_arr[i].text
                    });
                }
            }
        }
        var custpage_bill_currency = form.addField({ id: 'custpage_bill_currency', type: ui.FieldType.SELECT, source: '', label: '币种', container: 'main_group' });
        //获取供应商币种信息
        if (params.search_vendor) {
            var curr_arr = getCurrInfo(params.search_vendor);
            log.debug('curr_arr', curr_arr);
            if (curr_arr.length > 0) {
                for (var i = 0; i < curr_arr.length; i++) {
                    custpage_bill_currency.addSelectOption({
                        value: curr_arr[i].value,
                        text: curr_arr[i].text,
                        isSelected: curr_arr[i].isSelected
                    });
                }
            }
        }
        var custpage_bill_location = form.addField({ id: 'custpage_bill_location', type: ui.FieldType.SELECT, source: '', label: '仓库', container: 'main_group' });
        //根据供应商、子公司获取对应的仓库
        if (params.search_vendor && search_sub_id) {
            var loc_arr = getLocInfo(params.search_vendor, search_sub_id);
            log.debug('loc_arr', loc_arr);
            if (loc_arr.length > 0) {
                for (var i = 0; i < loc_arr.length; i++) {
                    custpage_bill_location.addSelectOption({
                        value: loc_arr[i].value,
                        text: loc_arr[i].text
                    });
                }
            }
        }

        var custpage_bill_terms = form.addField({ id: 'custpage_bill_terms', type: ui.FieldType.SELECT, source: '', label: '账期', container: 'main_group' });
        if (params.search_vendor) {
            let vendorTerms = searchBillTerms(params.search_vendor);

            let termsData = searchTerms(vendorTerms);
            if (termsData.length > 0) {
                for (let x = 0; x < termsData.length; x++) {
                    custpage_bill_terms.addSelectOption({
                        value: termsData[x].value,
                        text: termsData[x].text
                    });
                }
            }
        }

        


        var info_sublist = form.addSublist({ id: 'info_list', type: ui.SublistType.LIST, label: '列表' });
        info_sublist.addMarkAllButtons();
        info_sublist.addField({ id: 'custpage_line_checkbox', type: ui.FieldType.CHECKBOX, label: '选择' });
        info_sublist.addField({ id: 'stocking_plan', type: ui.FieldType.SELECT, source: 'customrecord_swc_demand_plan', label: '备货计划' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'bill_pr', type: ui.FieldType.SELECT, source: 'customrecord_swc_purchase_request', label: '请购单号' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'bill_item', type: ui.FieldType.SELECT, source: 'item', label: 'SKU' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'bill_item_text', type: ui.FieldType.TEXT, label: 'SKU名称' }).updateDisplayType({ displayType: 'hidden' });
        info_sublist.addField({ id: 'sku_name', type: ui.FieldType.TEXT, label: 'SKU名称 ' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'pr_origin_sku', type: ui.FieldType.SELECT, source: 'item', label: '成品SKU' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'cbsku_name', type: ui.FieldType.TEXT, label: '成本SKU名称' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'pr_main_sku', type: ui.FieldType.CHECKBOX, label: '主要部件' }).updateDisplayType({ displayType: 'disabled' });
        info_sublist.addField({ id: 'bill_item_name', type: ui.FieldType.SELECT, source: 'customrecord_swc_yjlm', label: '产品品类名称' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'bill_pr_qty', type: ui.FieldType.FLOAT, label: '请购数量' });
        info_sublist.addField({ id: 'remaining_pr_qty', type: ui.FieldType.FLOAT, label: '剩余可采购数量' });
        info_sublist.addField({ id: 'remaining_po_qty', type: ui.FieldType.FLOAT, label: '本次采购数量' }).updateDisplayType({ displayType: 'entry' });
        info_sublist.addField({ id: 'bill_supplier', type: ui.FieldType.SELECT, source: 'vendor', label: '供应商' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'bill_bom', type: ui.FieldType.SELECT, source: 'bom', label: 'BOM' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'bill_customer', type: ui.FieldType.SELECT, source: 'customer', label: '店铺' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'loc_type', type: ui.FieldType.SELECT, source: 'customlist_swc_dp_location_type', label: '仓库类型' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'bill_country', type: ui.FieldType.SELECT, source: 'customlist_swc_dp_country', label: '国家编码' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'us_districts', type: ui.FieldType.SELECT, source: 'customlist_swc_us_districts', label: '美国分区' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'pr_support', type: ui.FieldType.CHECKBOX, label: '打托' }).updateDisplayType({ displayType: 'disabled' });
        info_sublist.addField({ id: 'fob_method', type: ui.FieldType.SELECT, source: 'customlist_swc_setfobtlement_method', label: '结算方式' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'item_currency', type: ui.FieldType.SELECT, source: 'currency', label: '惠达货品币种' }).updateDisplayType({ displayType: 'inline' });
        return form;
    }

    function getCurrInfo(search_vendor) {
        var need_info = [], need_info_key = [], sublist_id = 'currency';
        var ven_data = record.load({ type: 'vendor', id: search_vendor, isDynamic: true });
        var ven_line = ven_data.getLineCount(sublist_id);
        var main_curr_id = ven_data.getValue('currency');
        if (ven_line > 0) {
            for (var i = 0; i < ven_line; i++) {
                var curr_id = ven_data.getSublistValue({ sublistId: sublist_id, fieldId: 'currency', line: i });
                var curr_name = ven_data.getSublistText({ sublistId: sublist_id, fieldId: 'currency', line: i });
                var isSelected = false;
                if (main_curr_id == curr_id) {
                    isSelected = true;
                }
                if (need_info_key.indexOf(curr_id) == -1) {
                    need_info_key.push(curr_id);
                    need_info.push({
                        value: curr_id,
                        text: curr_name,
                        isSelected: isSelected
                    });
                }
            }
        }
        return need_info;
    }

    function getLocInfo(search_vendor, search_sub_id) {
        var loc_arr = [];
        var rec_search_obj = search.create({
            type: 'location',
            filters:
                [
                    ['subsidiary', 'anyof', search_sub_id],
                    'AND',
                    ['custrecord_swc_vendor', 'anyof', search_vendor],
                    'AND',
                    ['isinactive', 'is', false]
                ],
            columns:
                [
                    'name'
                ]
        });
        var results = getAllResults(rec_search_obj);
        if (results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                var loc_id = results[i].id;
                var loc_name = results[i].getValue(rec_search_obj.columns[0]);
                loc_arr.push({
                    value: loc_id,
                    text: loc_name
                });
            }
        }
        return loc_arr;
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

    function getSubInfo(search_vendor) {
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var search_date = moment(new Date()).add(16, 'hours').format(dateFormat);
        log.debug('search_date', search_date);
        var sub_arr = [], effective_time;
        var rec_search_obj = search.create({
            type: 'customrecord_swc_vendor_subsidiary_list',
            filters:
                [
                    ['custrecord_swc_vendor_list', 'anyof', search_vendor],
                    'AND',
                    ['custrecord_swc_effective_time', 'onorbefore', search_date],
                    'AND',
                    ['isinactive', 'is', false]
                ],
            columns:
                [
                    'custrecord_swc_subsidiary_list',
                    'custrecord_swc_subsidiary_list.namenohierarchy',
                    { name: 'custrecord_swc_effective_time', sort: 'DESC' }
                ]
        });
        var results = getAllResults(rec_search_obj);
        if (results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                effective_time = effective_time ? effective_time : results[i].getValue(rec_search_obj.columns[2]);
                if (effective_time == results[i].getValue(rec_search_obj.columns[2])) {
                    var sub_id = results[i].getValue(rec_search_obj.columns[0]);
                    var sub_name = results[i].getValue(rec_search_obj.columns[1]);
                    sub_arr.push({
                        value: sub_id,
                        text: sub_name
                    });
                }
            }
        }
        return sub_arr;
    }

    //获取数据
    function getNeedData(params) {
        var rec_data = [], filters = [];
        if (params.search_vendor) {//供应商
            filters.push(['isinactive', 'is', false]);
            filters.push('and');
            filters.push(['formulanumeric: NVL({custrecord_swc_pr_quantity}, 0) - NVL({custrecord_swc_pr_quantity_purchased}, 0)', 'greaterthan', 0]);
            filters.push('and');
            filters.push(['custrecord_swc_pr_vendor', 'anyof', params.search_vendor]);
            // 备货批次
            if (params.custpage_batch) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_pr_demand_plan.custrecord_swc_dp_batch', 'is', params.custpage_batch])
            }
            // 备货月批次
            if (params.custpage_batch_month) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_pr_demand_plan.custrecord_swc_dp_batch_month', 'is', params.custpage_batch_month])
            }
            // 开始时间
            if (params.custpage_begin) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_pr_demand_plan.custrecord_swc_dp_applicant_date', 'onorafter', params.custpage_begin])
            }
            // 结束时间
            if (params.custpage_end) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_pr_demand_plan.custrecord_swc_dp_applicant_date', 'onorbefore', params.custpage_end])
            }

            // 惠达货品币种
            if (params.custpage_hd_currency) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_pr_sku.custitem_swc_huida_order_currency', 'anyof', params.custpage_hd_currency])
            }

            var search_rec = search.create({
                type: 'customrecord_swc_purchase_request',
                filters: filters,
                columns:
                    [
                        'custrecord_swc_pr_demand_plan',//备货计划
                        'custrecord_swc_pr_sku',//货品
                        'custrecord_swc_pr_sku_yjlm',//产品品类名称
                        'custrecord_swc_pr_quantity',//请购数量
                        { name: 'formulanumeric', formula: '{custrecord_swc_pr_quantity} - NVL({custrecord_swc_pr_quantity_purchased}, 0)' },//剩余可采购数量
                        'custrecord_swc_pr_vendor',//供应商
                        'custrecord_swc_pr_bom',//BOM
                        'custrecord_swc_pr_store',//店铺
                        'custrecord_swc_pr_location_type',//仓库类型
                        'custrecord_swc_pr_country',//国家编码
                        'custrecord_swc_pr_us_districts',//美国分区
                        'custrecord_swc_pr_origin_sku',//成品SKU
                        'custrecord_swc_pr_main_sku',//主要部件
                        'custrecord_swc_pr_sku.displayname',//货品名称
                        'custrecord_swc_pr_origin_sku.displayname',//成品SKU名称
                        'custrecord_swc_pr_support',//打托
                        'custrecord_swc_pr_setfobtlement_method',//结算方式
                        'custrecord_swc_pr_sku.custitem_swc_huida_order_currency',//币种
                    ]
            });
            var results = getAllResults(search_rec);
            if (results.length > 0) {
                for (var i = 0; i < results.length; i++) {
                    rec_data.push({
                        bill_pr: results[i].id,
                        stocking_plan: results[i].getValue(search_rec.columns[0]),
                        bill_item: results[i].getValue(search_rec.columns[1]),
                        bill_item_text: results[i].getText(search_rec.columns[1]),
                        bill_item_name: results[i].getValue(search_rec.columns[2]),
                        bill_pr_qty: results[i].getValue(search_rec.columns[3]),
                        remaining_pr_qty: results[i].getValue(search_rec.columns[4]),
                        bill_supplier: results[i].getValue(search_rec.columns[5]),
                        bill_bom: results[i].getValue(search_rec.columns[6]),
                        bill_customer: results[i].getValue(search_rec.columns[7]),
                        loc_type: results[i].getValue(search_rec.columns[8]),
                        bill_country: results[i].getValue(search_rec.columns[9]),
                        us_districts: results[i].getValue(search_rec.columns[10]),
                        pr_origin_sku: results[i].getValue(search_rec.columns[11]),
                        pr_main_sku: results[i].getValue(search_rec.columns[12]),
                        sku_name: results[i].getValue(search_rec.columns[13]),
                        cbsku_name: results[i].getValue(search_rec.columns[14]),
                        pr_support: results[i].getValue(search_rec.columns[15]),
                        fob_method: results[i].getValue(search_rec.columns[16]),
                        item_currency: results[i].getValue(search_rec.columns[17]),
                    });
                }
            }
        }
        return rec_data;
    }

    /**
     * 通用检索方法
     * @param mySearch
     * @returns {[]}
     */
    function getAllResults(mySearch) {
        var resultSet = mySearch.run();
        var resultArr = [];
        var start = 0;
        var step = 1000;
        var results = resultSet.getRange({
            start: start,
            end: step
        });
        while (results && results.length > 0) {
            resultArr = resultArr.concat(results);
            start = Number(start) + Number(step);
            results = resultSet.getRange({
                start: start,
                end: Number(start) + Number(step)
            });
        }
        return resultArr;
    }

    //渲染结果
    function setFormValue(page_form, result) {
        var page_sublist = page_form.getSublist('info_list');
        for (var i = 0; i < result.length; i++) {
            result[i].stocking_plan ? page_sublist.setSublistValue({ id: 'stocking_plan', line: i, value: result[i].stocking_plan }) : '';
            result[i].bill_pr ? page_sublist.setSublistValue({ id: 'bill_pr', line: i, value: result[i].bill_pr }) : '';
            result[i].bill_item ? page_sublist.setSublistValue({ id: 'bill_item', line: i, value: result[i].bill_item }) : '';
            result[i].bill_item_text ? page_sublist.setSublistValue({ id: 'bill_item_text', line: i, value: result[i].bill_item_text }) : '';
            result[i].bill_item_name ? page_sublist.setSublistValue({ id: 'bill_item_name', line: i, value: result[i].bill_item_name }) : '';
            result[i].pr_origin_sku ? page_sublist.setSublistValue({ id: 'pr_origin_sku', line: i, value: result[i].pr_origin_sku }) : '';
            result[i].pr_main_sku ? page_sublist.setSublistValue({ id: 'pr_main_sku', line: i, value: 'T' }) : '';
            result[i].bill_pr_qty ? page_sublist.setSublistValue({ id: 'bill_pr_qty', line: i, value: result[i].bill_pr_qty }) : '';
            result[i].remaining_pr_qty ? page_sublist.setSublistValue({ id: 'remaining_pr_qty', line: i, value: result[i].remaining_pr_qty }) : '';
            result[i].remaining_pr_qty ? page_sublist.setSublistValue({ id: 'remaining_po_qty', line: i, value: result[i].remaining_pr_qty }) : '';
            result[i].bill_supplier ? page_sublist.setSublistValue({ id: 'bill_supplier', line: i, value: result[i].bill_supplier }) : '';
            result[i].bill_bom ? page_sublist.setSublistValue({ id: 'bill_bom', line: i, value: result[i].bill_bom }) : '';
            result[i].bill_customer ? page_sublist.setSublistValue({ id: 'bill_customer', line: i, value: result[i].bill_customer }) : '';
            result[i].loc_type ? page_sublist.setSublistValue({ id: 'loc_type', line: i, value: result[i].loc_type }) : '';
            result[i].bill_country ? page_sublist.setSublistValue({ id: 'bill_country', line: i, value: result[i].bill_country }) : '';
            result[i].us_districts ? page_sublist.setSublistValue({ id: 'us_districts', line: i, value: result[i].us_districts }) : '';
            result[i].sku_name ? page_sublist.setSublistValue({ id: 'sku_name', line: i, value: result[i].sku_name }) : '';
            result[i].cbsku_name ? page_sublist.setSublistValue({ id: 'cbsku_name', line: i, value: result[i].cbsku_name }) : '';
            result[i].pr_support ? page_sublist.setSublistValue({ id: 'pr_support', line: i, value: 'T' }) : '';
            result[i].fob_method ? page_sublist.setSublistValue({ id: 'fob_method', line: i, value: result[i].fob_method }) : '';
            result[i].item_currency ? page_sublist.setSublistValue({ id: 'item_currency', line: i, value: result[i].item_currency }) : '';
        }
        return page_form;
    }

    return {
        onRequest: onRequest
    }
});