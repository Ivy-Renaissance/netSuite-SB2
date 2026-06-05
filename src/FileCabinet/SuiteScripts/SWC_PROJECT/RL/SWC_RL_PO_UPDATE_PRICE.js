/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/runtime', '../common/moment'], function (record, search, runtime, moment) {
    //固定值
    var curr_cny_id = 1, curr_usd_id = 2;
    function _get(context) {

    }

    function _post(context) {
        var result_str = {};
        try {
            var bill_id = context;
            var po_data = record.load({ type: 'purchaseorder', id: bill_id, isDynamic: true });
            var entity_id = po_data.getValue('entity'), sub_id = po_data.getValue('subsidiary'), curr_id = po_data.getValue('currency'),
                tran_date = po_data.getText('trandate'), sublist_id = 'item';
            var po_line = po_data.getLineCount(sublist_id), item_arr = [], check_items = [], item_ids = [], check_item_ids = [];
            for (var i = 0; i < po_line; i++) {
                var is_update_price = po_data.getSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_is_update_price', line: i });
                var item_id = po_data.getSublistValue({ sublistId: sublist_id, fieldId: 'item', line: i });
                var item_qty = po_data.getSublistValue({ sublistId: sublist_id, fieldId: 'quantity', line: i });
                var item_received_qty = po_data.getSublistValue({ sublistId: sublist_id, fieldId: 'quantityreceived', line: i });
                var old_unit_price = po_data.getSublistValue({ sublistId: sublist_id, fieldId: 'rate', line: i });
                var old_unit_price_tax = po_data.getSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_including_tax_amt', line: i });
                var old_tax_code = po_data.getSublistValue({ sublistId: sublist_id, fieldId: 'taxcode', line: i });
                var line_unique_key = po_data.getSublistValue({ sublistId: sublist_id, fieldId: 'lineuniquekey', line: i });
                var remaining_qty = item_qty - item_received_qty;
                var support = po_data.getSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_po_support', line: i });
                var mode = po_data.getSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_po_exw', line: i });
                var item_name = po_data.getSublistText({ sublistId: sublist_id, fieldId: 'item', line: i });
                if (Number(remaining_qty) > 0) {//剩余数量大于0的行才进行处理
                    item_arr.push({
                        item_id: item_id,
                        "support": support,
                        "mode": mode,
                        "item_name": item_name,
                        item_qty: item_qty,
                        item_received_qty: item_received_qty,
                        remaining_qty: remaining_qty,
                        old_unit_price: old_unit_price,
                        old_unit_price_tax: old_unit_price_tax,
                        old_tax_code: old_tax_code,
                        unit_price: '',
                        unit_price_tax: '',
                        tax_code: '',
                        line_unique_key: line_unique_key
                    });
                    if (item_ids.indexOf(item_id) == -1) {
                        item_ids.push(item_id);
                    }
                    if (is_update_price) {
                        check_items.push({
                            item_id: item_id,
                            "support": support,
                            "mode": mode,
                            "item_name": item_name,
                            item_qty: item_qty,
                            item_received_qty: item_received_qty,
                            remaining_qty: remaining_qty,
                            old_unit_price: old_unit_price,
                            old_unit_price_tax: old_unit_price_tax,
                            old_tax_code: old_tax_code,
                            unit_price: "",
                            unit_price_tax: "",
                            tax_code: "",
                            line_unique_key: line_unique_key
                        });
                        if (check_item_ids.indexOf(item_id) == -1) {
                            check_item_ids.push(item_id);
                        }
                    }
                }
            }
            if (check_items.length > 0) {
                item_arr = check_items;
            }
            if (check_item_ids.length > 0) {
                item_ids = check_item_ids;
            }
            log.debug('未匹配价格前的数据 item_arr', item_arr);
            if (item_arr.length > 0) {
                //查询价目表
                var last_item_arr = getPriceInfo(entity_id, sub_id, curr_id, item_ids, bill_id, tran_date, item_arr);
                log.debug('匹配价格后的数据 last_item_arr', last_item_arr);
                
                //判断每一行都取到了价格才继续更新
                var item_names = [];
                for (var n = 0; n < last_item_arr.length; n++) {
                    if (!last_item_arr[n].unit_price) {
                        if (item_names.indexOf(last_item_arr[n].item_name) == -1) {
                            item_names.push(last_item_arr[n].item_name);
                        }
                    }
                }
                if (item_names.length > 0) {
                    result_str.data = '以下货品：' + item_names + ',没有获取到价目表信息，请检查价目表是否维护！';
                    return result_str;
                }
                var is_save = false;
                for (var i = 0; i < last_item_arr.length; i++) {
                    if (last_item_arr[i].unit_price && last_item_arr[i].tax_code) {
                        if (Number(last_item_arr[i].unit_price) != Number(last_item_arr[i].old_unit_price) || Number(last_item_arr[i].tax_code) != Number(last_item_arr[i].old_tax_code)) {
                            is_save = true;
                            //判断是否需要拆行，不拆行直接进行更新
                            var line_key = po_data.findSublistLineWithValue({ sublistId: sublist_id, fieldId: 'lineuniquekey', value: last_item_arr[i].line_unique_key });
                            if (Number(last_item_arr[i].item_received_qty) > 0) {
                                var COPY_FIELD_IDS = [
                                    // 'item',
                                    'description',
                                    'units',
                                    // 'rate',
                                    // 'taxcode',
                                    'department',
                                    'class',
                                    'location',
                                    'custcol_swc_main_sku',
                                    // 'custcol_swc_including_tax_amt',
                                    // 'custcol_swc_old_unit_price',
                                    // 'custcol_swc_old_unit_price_tax',
                                    // 'custcol_swc_old_tax_code',
                                    'custcol_swc_po_line_test',
                                    'custcol_swc_msku',
                                    'custcol_swc_line_no',
                                    'custcol_swc_beihuo_plan',
                                    'custcol_swc_loc_type',
                                    'custcol_swc_country_code',
                                    'custcol_swc_us_districts',
                                    'custcol_swc_store',
                                    'custcol_swc_sku_yjlm',
                                    'custcol_swc_pr_bill',
                                    'custcol_swc_bom_list',
                                    'custcol_swc_pr_origin_sku',
                                    'custcol_swc_pr_main_sku',
                                    'custcol_swc_po_support',//打托
                                    'custcol_swc_po_exw'//结算方式
                                ];
                                //拆行
                                po_data.selectLine({ sublistId: sublist_id, line: line_key });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'quantity', value: last_item_arr[i].item_received_qty });
                                var old_line = {}
                                for (var m = 0; m < COPY_FIELD_IDS.length; m++) {
                                    old_line[COPY_FIELD_IDS[m]] = po_data.getCurrentSublistValue({ sublistId: sublist_id, fieldId: COPY_FIELD_IDS[m] });
                                }
                                po_data.commitLine({ sublistId: sublist_id });
                                //添加新行 TODO:新增行需要复制原行上的其他字段信息
                                po_data.selectNewLine({ sublistId: sublist_id });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'item', value: last_item_arr[i].item_id });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'quantity', value: last_item_arr[i].remaining_qty });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_including_tax_amt', value: last_item_arr[i].unit_price });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'rate', value: last_item_arr[i].unit_price_tax });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'taxcode', value: last_item_arr[i].tax_code });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_old_unit_price', value: last_item_arr[i].old_unit_price });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_old_unit_price_tax', value: last_item_arr[i].old_unit_price_tax });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_old_tax_code', value: last_item_arr[i].old_tax_code });
                                for (var m = 0; m < COPY_FIELD_IDS.length; m++) {
                                    po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: COPY_FIELD_IDS[m], value: old_line[COPY_FIELD_IDS[m]] });
                                }
                                po_data.commitLine({ sublistId: sublist_id });
                            } else {
                                //不拆行
                                po_data.selectLine({ sublistId: sublist_id, line: line_key });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_including_tax_amt', value: last_item_arr[i].unit_price });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'rate', value: last_item_arr[i].unit_price_tax });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'taxcode', value: last_item_arr[i].tax_code });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_old_unit_price', value: last_item_arr[i].old_unit_price });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_old_unit_price_tax', value: last_item_arr[i].old_unit_price_tax });
                                po_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_old_tax_code', value: last_item_arr[i].old_tax_code });
                                po_data.commitLine({ sublistId: sublist_id });
                            }
                        }
                    }
                }
                if (is_save) {
                    var po_data_id = po_data.save({ ignoreMandatoryFields: true });
                    if (po_data_id) {
                        result_str.data = '价格已更新成功';
                    }
                } else {
                    result_str.data = '价格已更新成功';
                }
            } else {
                result_str.data = '该采购订单已全部收货，不进行价格更新！';
            }
        } catch (e) {
            log.debug('e', e);
            result_str.data = e.message;
        }
        return result_str;
    }

    function getPriceInfo(entity_id, sub_id, curr_id, item_ids, bill_id, tran_date, item_arr) {
        var price_details = {}, search_qty_obj = {};
        //先获取满足条件的所有价目表
        var rec_search_obj = search.create({
            type: 'customrecord_swc_po_price_details',
            filters:
                [
                    ['custrecord_swc_sku_price_main_list.custrecord_swc_supplier', 'anyof', entity_id],
                    'AND',
                    ['custrecord_swc_sku_price_main_list.custrecord_swc_subsidiary', 'anyof', sub_id],
                    'AND',
                    ['custrecord_swc_item', 'anyof', item_ids],
                    'AND',
                    ['custrecord_swc_effective_date', 'onorbefore', tran_date],
                    'AND',
                    ['isinactive', 'is', false]
                ],
            columns:
                [
                    search.createColumn({ name: 'custrecord_swc_price_type', join: 'custrecord_swc_sku_price_main_list', label: '价格类型' }),
                    search.createColumn({ name: 'custrecord_swc_tax_code', label: '税码(人民币)' }),
                    search.createColumn({ name: 'custrecord_swc_premium_unit_price', label: '优等品含税单价(人民币)' }),
                    search.createColumn({ name: 'custrecord_swc_premium_excluding_tax', label: '优等品不含税单价(人民币)' }),
                    search.createColumn({ name: 'custrecord_swc_initial_quantity', label: '起始数量' }),
                    search.createColumn({ name: 'custrecord_swc_end_quantity', label: '结束数量' }),
                    search.createColumn({ name: 'custrecord_swc_tax_code_usd', label: '税码(美金)' }),
                    search.createColumn({ name: 'custrecord_swc_premium_unit_price_usd', label: '优等品含税单价(美金)' }),
                    search.createColumn({ name: 'custrecord_swc_premium_excluding_tax_usd', label: '优等品不含税单价(美金)' }),
                    search.createColumn({ name: 'custrecord_swc_effective_date', sort: 'DESC', label: '生效日期' }),
                    search.createColumn({ name: 'custrecord_swc_item', label: '货品' }),
                    search.createColumn({ name: 'custrecord_swc_support', label: '打托' }),//11
                    search.createColumn({ name: 'custrecord_swc_exw', label: '结算方式' })//12
                ]
        });
        var results = getAllResults(rec_search_obj);
        if (results.length == 0) return item_arr;
        for (var i = 0; i < results.length; i++) {
            var item_id = results[i].getValue(rec_search_obj.columns[10]);
            var price_type = results[i].getValue(rec_search_obj.columns[0]);
            var effective_date = results[i].getValue(rec_search_obj.columns[9]);
            var tax_code = results[i].getValue(rec_search_obj.columns[1]);
            var premium_unit_price = results[i].getValue(rec_search_obj.columns[2]);
            var premium_excluding_tax = results[i].getValue(rec_search_obj.columns[3]);
            var initial_quantity = results[i].getValue(rec_search_obj.columns[4]);
            var end_quantity = results[i].getValue(rec_search_obj.columns[5]);
            var tax_code_usd = results[i].getValue(rec_search_obj.columns[6]);
            var premium_unit_price_usd = results[i].getValue(rec_search_obj.columns[7]);
            var premium_excluding_tax_usd = results[i].getValue(rec_search_obj.columns[8]);

            var support = results[i].getValue(rec_search_obj.columns[11]);
            var mode = results[i].getValue(rec_search_obj.columns[12]);
            var searchKey = item_id + '_' + support + '_' + mode;

            price_details[searchKey] = price_details[searchKey] || {};
            price_details[searchKey].price_type = price_details[searchKey].price_type || price_type;
            price_details[searchKey].effective_date = price_details[searchKey].effective_date || effective_date;
            price_details[searchKey].price_details_info = price_details[searchKey].price_details_info || [];
            if (price_details[searchKey].effective_date == effective_date) {
                price_details[searchKey].price_details_info.push({
                    tax_code: tax_code,
                    premium_unit_price: premium_unit_price,
                    premium_excluding_tax: premium_excluding_tax,
                    initial_quantity: initial_quantity,
                    end_quantity: end_quantity,
                    tax_code_usd: tax_code_usd,
                    premium_unit_price_usd: premium_unit_price_usd,
                    premium_excluding_tax_usd: premium_excluding_tax_usd,
                    effective_date: effective_date
                });
            }
            search_qty_obj[price_type] = search_qty_obj[price_type] || [];
            if (search_qty_obj[price_type].indexOf(item_id) == -1) {
                search_qty_obj[price_type].push(item_id);
            }
        }
        log.debug('price_details', price_details);
        log.debug('search_qty_obj', search_qty_obj);
        if (Object.keys(price_details).length) {
            //获取每个货品的匹配数量
            var match_qty_obj = getMatchItemQty(entity_id, sub_id, bill_id, tran_date, search_qty_obj);  
            for (var i = 0; i < item_arr.length; i++) {
                var lineKey = item_arr[i].item_id + '_' + item_arr[i].support + '_' + item_arr[i].mode
                if (price_details[lineKey] && Object.keys(price_details[lineKey]).length) {
                    var price_details_info = price_details[lineKey].price_details_info;
                    if (price_details_info.length > 0) {
                        for (var k = 0; k < price_details_info.length; k++) {
                            if (Number(match_qty_obj[item_arr[i].item_id]) >= Number(price_details_info[k].initial_quantity) && Number(match_qty_obj[item_arr[i].item_id]) <= Number(price_details_info[k].end_quantity)) {
                                if (curr_id == curr_cny_id) {
                                    item_arr[i].tax_code = price_details_info[k].tax_code;
                                    item_arr[i].unit_price = price_details_info[k].premium_unit_price;
                                    item_arr[i].unit_price_tax = price_details_info[k].premium_excluding_tax;
                                } else if (curr_id == curr_usd_id) {
                                    item_arr[i].tax_code = price_details_info[k].tax_code_usd;
                                    item_arr[i].unit_price = price_details_info[k].premium_unit_price_usd;
                                    item_arr[i].unit_price_tax = price_details_info[k].premium_excluding_tax_usd;
                                }
                            }
                        }
                    }
                }
            }
        }
        return item_arr;
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

    function getMatchItemQty(entity_id, sub_id, bill_id, tran_date, search_qty_obj) {
        var need_obj = {};
        for (var i in search_qty_obj) {
            var filters_arr = [];
            filters_arr.push(['status', 'noneof', 'PurchOrd:H', 'PurchOrd:A', 'PurchOrd:C']);
            filters_arr.push('AND');
            filters_arr.push(['mainline', 'is', 'F']);
            filters_arr.push('AND');
            filters_arr.push(['item', 'anyof', search_qty_obj[i]]);
            if (i == 1) {
                filters_arr.push('AND');
                filters_arr.push(['internalid', 'anyof', bill_id]);
            } else if (i == 2) {
                var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
                if (dateFormat == 'DD/MM/YYYY' || dateFormat == 'D/M/YYYY') {
                    var [day, month, year] = tran_date.split("/");
                    tran_date = year + '/' + month + '/' + day;
                }
                //获取查询日期第一天以及最后一天
                var frist_day = moment(tran_date).startOf('month').format(dateFormat);
                var last_day = moment(tran_date).endOf('month').format(dateFormat);
                log.debug('frist_day', frist_day);
                log.debug('last_day', last_day);
                filters_arr.push('AND');
                filters_arr.push(['name', 'anyof', entity_id]);
                filters_arr.push('AND');
                filters_arr.push(['subsidiary', 'anyof', sub_id]);
                filters_arr.push('AND');
                filters_arr.push(['trandate', 'within', frist_day, last_day]);
            }
            search.create({
                type: 'purchaseorder',
                settings: [{ 'name': 'consolidationtype', 'value': 'NONE' }],
                filters: filters_arr,
                columns:
                    [
                        search.createColumn({ name: 'item', summary: 'GROUP', label: '货品' }),
                        search.createColumn({ name: 'quantity', summary: 'SUM', label: '数量' })
                    ]
            }).run().each(function (result) {
                need_obj[result.getValue(result.columns[0])] = result.getValue(result.columns[1]);
                return true;
            });
        }
        return need_obj;
    }

    function _put(context) {

    }

    function _delete(context) {

    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
