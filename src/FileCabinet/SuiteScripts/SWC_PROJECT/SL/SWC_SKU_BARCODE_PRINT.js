/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 * 物流发运单，SKU标签打印
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/runtime', '../common/moment', 'N/render', 'N/file', 'N/log'], function (ui, search, record, runtime, moment) {

    function onRequest (context) {
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

    function showResult (method, params, response) {
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
    function createForm (params) {
        var form = ui.createForm({ title: '物流发运明细SKU打印' });
        form.clientScriptModulePath = '../CS/SWC_CS_SKU_BARCODE_PRINT.js';
        //按钮
        form.addButton({ id: 'select_data', label: '搜索', functionName: 'Select()' });
        form.addButton({ id: 'print_code', label: '打印标签', functionName: 'printCode()' });
        //分组
        form.addFieldGroup({ id: 'search_group', label: '搜索条件' });

        form.addField({ id: 'order_code', type: ui.FieldType.SELECT, source: 'customrecord_swc_wl_plan_order', label: '物流发运单号', container: 'search_group' });
        var search_vendor = form.addField({ id: 'search_vendor', type: ui.FieldType.SELECT, source: 'vendor', label: '供应商', container: 'search_group' });
        search_vendor.defaultValue = params.search_vendor ? params.search_vendor : '';
        // 查询字段默认值
        var fields = ['order_code'];
        for (var i in fields) {
            var param = params[fields[i]];
            if (param) {
                form.getField({
                    id: fields[i]
                }).defaultValue = param;
            }
        }


        var info_sublist = form.addSublist({ id: 'info_list', type: ui.SublistType.LIST, label: '列表' });
        info_sublist.addMarkAllButtons();
        info_sublist.addField({ id: 'custpage_line_checkbox', type: ui.FieldType.CHECKBOX, label: '选择' });
        info_sublist.addField({ id: 'order_id', type: ui.FieldType.SELECT, source: 'customrecord_swc_wl_plan_order', label: '物流发运单号' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'bill_supplier', type: ui.FieldType.SELECT, source: 'vendor', label: '供应商' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'com_sku', type: ui.FieldType.TEXT, label: '公司SKU' }).updateDisplayType({ displayType: 'inline' });
        info_sublist.addField({ id: 'product_sku', type: ui.FieldType.SELECT, source: 'item', label: '成品SKU' }).updateDisplayType({ displayType: 'inline' });

        return form;
    }

    //获取数据
    function getNeedData (params) {
        var rec_data = [], filters = [];
        if (params.search_vendor) {//供应商
            if (filters.length > 0) {
                filters.push('and')
            }
            filters.push(['isinactive', 'is', false]);
            filters.push('and')
            // filters.push(['formulanumeric: NVL({custrecord_swc_pr_quantity}, 0) - NVL({custrecord_swc_pr_quantity_purchased}, 0)', 'greaterthan', 0]);
            // filters.push('and');
            filters.push(['custrecord_swc_wl_d_vendor', 'anyof', params.search_vendor]);
        }
        // 物流发运单
        if (params.order_code) {
            if (filters.length > 0) {
                filters.push('and')
            }
            filters.push(['custrecord_swc_wl_plan_order_id', 'anyof', params.order_code])
        }

        var search_rec = search.create({
            type: 'customrecord_swc_wl_plan_detail',
            filters: filters,
            columns:
                [
                    'custrecord_swc_wl_plan_order_id',//物流发运单号
                    'custrecord_swc_wl_d_vendor',// 供应商
                    'custrecord_swc_wl_d_sku.displayname',//公司SKU
                    'custrecord_swc_wl_d_sku',//成品SKU
                ]
        });
        var results = getAllResults(search_rec);
        if (results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                rec_data.push({
                    order_id: results[i].getValue(search_rec.columns[0]),
                    bill_supplier: results[i].getValue(search_rec.columns[1]),
                    com_sku: results[i].getValue(search_rec.columns[2]),
                    product_sku: results[i].getValue(search_rec.columns[3]),
                });
            }
        }
        return rec_data;
    }

    /**
     * 通用检索方法
     * @param mySearch
     * @returns {[]}
     */
    function getAllResults (mySearch) {
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
    function setFormValue (page_form, result) {
        var page_sublist = page_form.getSublist('info_list');
        for (var i = 0; i < result.length; i++) {
            result[i].order_id ? page_sublist.setSublistValue({ id: 'order_id', line: i, value: result[i].order_id }) : '';
            result[i].bill_supplier ? page_sublist.setSublistValue({ id: 'bill_supplier', line: i, value: result[i].bill_supplier }) : '';
            result[i].com_sku ? page_sublist.setSublistValue({ id: 'com_sku', line: i, value: result[i].com_sku }) : '';
            result[i].product_sku ? page_sublist.setSublistValue({ id: 'product_sku', line: i, value: result[i].product_sku }) : '';
        }
        return page_form;
    }

    return {
        onRequest: onRequest
    }
});