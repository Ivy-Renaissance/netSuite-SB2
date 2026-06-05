/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/record', 'N/runtime', '../common/moment', 'N/url'], function (search, record, runtime, moment, url) {//固定值
    var system_price_type = 2, curr_cny_id = 1, curr_usd_id = 2;
    function _get(context) {

    }

    function _post(context) {
        log.debug('context', context);
        var result_str = {};
        try {
            var need_data = context, bill_vendor = need_data.bill_vendor, bill_sub = need_data.bill_sub, bill_currency = need_data.bill_currency,
                bill_loc = need_data.bill_loc, bill_terms = need_data.bill_terms, dataList = need_data.dataList, bill_trandate = need_data.bill_trandate,
                bill_iffree = need_data.bill_iffree;
            log.debug('need_data', need_data);

            var item_price_info = getItemPriceInfo(bill_vendor, bill_sub, bill_currency, dataList, bill_trandate,bill_iffree);
            log.debug('item_price_info', item_price_info);
            var item_names = [];
            for (var i = 0; i < item_price_info.length; i++) {
                if (!bill_iffree && !item_price_info[i].item_price) {
                    if (item_names.indexOf(item_price_info[i].bill_item_text) == -1) {
                        item_names.push(item_price_info[i].bill_item_text);
                    }
                }
            }


            var exReDateObj = getReceiptDate(dataList);

            if (item_names.length > 0) {
                result_str.data = '以下货品：' + item_names + ',没有获取到价目表信息，请检查价目表是否维护！';
            } else {
                //创建采购订单
                var po_data = record.create({ type: 'purchaseorder', isDynamic: true });
                po_data.setValue('entity', bill_vendor);
                po_data.setValue('subsidiary', bill_sub);
                po_data.setValue('currency', bill_currency);
                po_data.setValue('location', bill_loc);
                po_data.setValue('custbody_swc_vendor_payment_terms', bill_terms);
                po_data.setValue('custbody_swc_po_fee', 1);
                po_data.setValue('custbody_swc_order_type2', 1);
                if (bill_iffree) po_data.setValue('custbody_swc_promotional_item_purchase', true);
                var trandate = bill_trandate;//po_data.getText({fieldId: 'trandate'});
                po_data.setText('trandate', bill_trandate);
                for (var i = 0; i < item_price_info.length; i++) {
                    po_data.selectNewLine('item');
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item_price_info[i].bill_item });
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item_price_info[i].remaining_po_qty });
                    if (bill_iffree) {
                        po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_including_tax_amt', value: 0 });
                    } else {
                        po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_including_tax_amt', value: item_price_info[i].item_price });
                    }
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: item_price_info[i].tax_code });
                    if (bill_iffree) {
                        po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
                    } else {
                        po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: item_price_info[i].item_price_tax });
                    }
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_beihuo_plan', value: item_price_info[i].stocking_plan });//备货计划
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_loc_type', value: item_price_info[i].loc_type });//仓库类型
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_country_code', value: item_price_info[i].bill_country });//国家编码
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_us_districts', value: item_price_info[i].us_districts });//美国分区
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_store', value: item_price_info[i].bill_customer });//店铺
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_sku_yjlm', value: item_price_info[i].bill_item_name });//产品品类
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_bill', value: item_price_info[i].bill_pr });//请购单
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_bom_list', value: item_price_info[i].bill_bom });//BOM
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_origin_sku', value: item_price_info[i].pr_origin_sku });//成品sku
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_main_sku', value: item_price_info[i].pr_main_sku });//主要部件
                    if (item_price_info[i].pr_support) po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_po_support', value: item_price_info[i].pr_support });//打托
                    if (item_price_info[i].fob_method) po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_po_exw', value: item_price_info[i].fob_method });//结算方式

                    var expectedreceiptdate = '';
                    if (item_price_info[i].bill_item in exReDateObj) {
                        var days = exReDateObj[item_price_info[i].bill_item];
                        if (days || days == 0) {
                            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');//dateFormat
                            expectedreceiptdate = moment(trandate).add(days, 'days').format(dateFormat);
                        }
                    }
                    po_data.setCurrentSublistText({ sublistId: 'item', fieldId: 'expectedreceiptdate', text: expectedreceiptdate });//预计接收日期

                    po_data.commitLine('item');
                }
                var po_data_id = po_data.save({ ignoreMandatoryFields: true });
                if (po_data_id) {
                    log.debug('po_data_id', po_data_id);
                    var tranid_num = search.lookupFields({ type: 'purchaseorder', id: po_data_id, columns: ['tranid'] });
                    result_str.data = '采购订单已生成，编号为：' + tranid_num.tranid;
                    var output = url.resolveRecord({
                        recordType: 'purchaseorder',
                        recordId: po_data_id,
                        isEditMode: false
                    });
                    result_str.url = output;
                }
            }
        } catch (e) {
            log.debug('e', e);
            result_str.data = e.message;
        }
        return result_str;
    }

    function getItemPriceInfo(bill_vendor, bill_sub, bill_currency, dataList, bill_trandate,bill_iffree) {
        var item_ids = [], price_details = {}, history_qty_info = {};
        for (var i = 0; i < dataList.length; i++) {
            dataList[i].tax_code = '';
            dataList[i].item_price = '';
            dataList[i].item_price_tax = '';
            if (item_ids.indexOf(dataList[i].bill_item) == -1) {
                item_ids.push(dataList[i].bill_item);
            }
        }
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var search_date = bill_trandate ? bill_trandate : moment(new Date()).add(16, 'hours').format(dateFormat);
        log.debug('search_date', search_date);
        //先获取满足条件的所有价目表
        var rec_search_obj = search.create({
            type: 'customrecord_swc_po_price_details',
            filters:
                [
                    ['custrecord_swc_sku_price_main_list.custrecord_swc_supplier', 'anyof', bill_vendor],
                    'AND',
                    ['custrecord_swc_sku_price_main_list.custrecord_swc_subsidiary', 'anyof', bill_sub],
                    'AND',
                    ['custrecord_swc_item', 'anyof', item_ids],
                    'AND',
                    ['custrecord_swc_effective_date', 'onorbefore', search_date],
                    'AND',
                    ['isinactive', 'is', false],
                    'AND',
                    ['custrecord_swc_sku_price_main_list.custrecord_swc_approval_status', 'anyof', 2]
                ],
            columns:
                [
                    search.createColumn({ name: 'custrecord_swc_price_type', join: 'custrecord_swc_sku_price_main_list', label: '价格类型' }),//0
                    search.createColumn({ name: 'custrecord_swc_tax_code', label: '税码(人民币)' }),//1
                    search.createColumn({ name: 'custrecord_swc_premium_unit_price', label: '优等品含税单价(人民币)' }),//2
                    search.createColumn({ name: 'custrecord_swc_premium_excluding_tax', label: '优等品不含税单价(人民币)' }),//3
                    search.createColumn({ name: 'custrecord_swc_initial_quantity', label: '起始数量' }),//4
                    search.createColumn({ name: 'custrecord_swc_end_quantity', label: '结束数量' }),//5
                    search.createColumn({ name: 'custrecord_swc_tax_code_usd', label: '税码(美金)' }),//6
                    search.createColumn({ name: 'custrecord_swc_premium_unit_price_usd', label: '优等品含税单价(美金)' }),//7
                    search.createColumn({ name: 'custrecord_swc_premium_excluding_tax_usd', label: '优等品不含税单价(美金)' }),//8
                    search.createColumn({ name: 'custrecord_swc_effective_date', sort: 'DESC', label: '生效日期' }),//9
                    search.createColumn({ name: 'custrecord_swc_item', label: '货品' }),//10
                    search.createColumn({ name: 'custrecord_swc_support', label: '打托' }),//11
                    search.createColumn({ name: 'custrecord_swc_exw', label: '结算方式' })//12
                ]
        });
        var results = getAllResults(rec_search_obj);
        if (results.length == 0) return dataList;
        for (var i = 0; i < results.length; i++) {
            var price_type = results[i].getValue(rec_search_obj.columns[0]);
            var tax_code = results[i].getValue(rec_search_obj.columns[1]);
            var premium_unit_price = results[i].getValue(rec_search_obj.columns[2]);
            var premium_excluding_tax = results[i].getValue(rec_search_obj.columns[3]);
            var initial_quantity = results[i].getValue(rec_search_obj.columns[4]);
            var end_quantity = results[i].getValue(rec_search_obj.columns[5]);
            var tax_code_usd = results[i].getValue(rec_search_obj.columns[6]);
            var premium_unit_price_usd = results[i].getValue(rec_search_obj.columns[7]);
            var premium_excluding_tax_usd = results[i].getValue(rec_search_obj.columns[8]);
            var effective_date = results[i].getValue(rec_search_obj.columns[9]);
            var item_id = results[i].getValue(rec_search_obj.columns[10]);

            var support = results[i].getValue(rec_search_obj.columns[11]);
            var mode = results[i].getValue(rec_search_obj.columns[12]);
            var searchKey = item_id + '_' + support + '_' + mode;
            price_details[searchKey] = price_details[searchKey] || {};
            price_details[searchKey]['effective_date'] = price_details[searchKey]['effective_date'] ? price_details[searchKey]['effective_date'] : effective_date;
            if (price_details[searchKey]['effective_date'] == effective_date) {
                price_details[searchKey]['price_type'] = price_type;
                price_details[searchKey]['item_price_info'] = price_details[searchKey]['item_price_info'] || [];

                price_details[searchKey]['item_price_info'].push({
                    tax_code: tax_code,
                    premium_unit_price: premium_unit_price,
                    premium_excluding_tax: premium_excluding_tax,
                    initial_quantity: initial_quantity,
                    end_quantity: end_quantity,
                    tax_code_usd: tax_code_usd,
                    premium_unit_price_usd: premium_unit_price_usd,
                    premium_excluding_tax_usd: premium_excluding_tax_usd
                });
            }
        }
        log.debug('price_details', price_details);


        if (!bill_iffree && Object.keys(price_details).length > 0) {
            var need_items = [];
            for (var i in price_details) {
                if (price_details[i].price_type == system_price_type) {
                    need_items.push(i);
                }
            }
            //查询累计阶梯数量价格的货品历史数量
            if (need_items.length > 0) {
                history_qty_info = getHistoryItemQty(bill_vendor, bill_sub, need_items, search_date);
                log.debug('history_qty_info', history_qty_info);
            }
            //匹配价格
            for (var i = 0; i < dataList.length; i++) {
                var key = dataList[i].bill_item + '_' + dataList[i].pr_support + '_' + dataList[i].fob_method;
                if (price_details[key]) {
                    var item_price_info = price_details[key].item_price_info || [];
                    if (item_price_info.length > 0) {
                        var item_qty = dataList[i].remaining_po_qty;
                        if (price_details[key].price_type == system_price_type && Object.keys(history_qty_info).length > 0) {
                            item_qty = Number(item_qty) + Number(history_qty_info[key] || 0);
                        }
                        for (var j = 0; j < item_price_info.length; j++) {
                            if (Number(item_qty) >= Number(item_price_info[j].initial_quantity) && Number(item_qty) <= Number(item_price_info[j].end_quantity)) {
                                if (bill_currency == curr_cny_id) {
                                    dataList[i].tax_code = item_price_info[j].tax_code;
                                    dataList[i].item_price = item_price_info[j].premium_unit_price;
                                    dataList[i].item_price_tax = item_price_info[j].premium_excluding_tax;
                                } else if (bill_currency == curr_usd_id) {
                                    dataList[i].tax_code = item_price_info[j].tax_code_usd;
                                    dataList[i].item_price = item_price_info[j].premium_unit_price_usd;
                                    dataList[i].item_price_tax = item_price_info[j].premium_excluding_tax_usd;
                                }
                            }
                        }
                    }
                }
            }
        } else if (bill_iffree && Object.keys(price_details).length > 0) {
            //匹配价格
            for (var i = 0; i < dataList.length; i++) {
                var key = dataList[i].bill_item + '_' + dataList[i].pr_support + '_' + dataList[i].fob_method;
                if (price_details[key]) {
                    var item_price_info = price_details[key].item_price_info || [];
                    if (item_price_info.length > 0) {
                        for (var j = 0; j < item_price_info.length; j++) {
                            if (bill_currency == curr_cny_id) {
                                dataList[i].tax_code = item_price_info[j].tax_code;
                            } else if (bill_currency == curr_usd_id) {
                                dataList[i].tax_code = item_price_info[j].tax_code_usd;
                            }

                        }
                    }
                }
            }
        }
        return dataList;
    }

    function getHistoryItemQty(bill_vendor, bill_sub, need_items, search_date) {
        var history_info = {};
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        if (dateFormat == 'DD/MM/YYYY' || dateFormat == 'D/M/YYYY') {
            var [day, month, year] = search_date.split("/");
            search_date = year + '/' + month + '/' + day;
        }
        //获取查询日期第一天以及最后一天
        var frist_day = moment(search_date).startOf('month').format(dateFormat);
        var last_day = moment(search_date).endOf('month').format(dateFormat);
        log.debug('frist_day', frist_day);
        log.debug('last_day', last_day);
        var filters_arr = [
            ['name', 'anyof', bill_vendor],
            'AND',
            ['subsidiary', 'anyof', bill_sub],
            'AND',
            ['mainline', 'is', 'F'],
            'AND',
            ['item', 'anyof', need_items],
            'AND',
            ['trandate', 'within', frist_day, last_day],
            'AND',
            ['status', 'noneof', 'PurchOrd:H', 'PurchOrd:A', 'PurchOrd:C']
        ];
        search.create({
            type: 'purchaseorder',
            settings: [{ 'name': 'consolidationtype', 'value': 'NONE' }],
            filters: filters_arr,
            columns:
                [
                    search.createColumn({ name: 'quantity', summary: 'SUM', label: '数量' }),
                    search.createColumn({ name: 'item', summary: 'GROUP', label: '货品' })
                ]
        }).run().each(function (result) {
            history_info[result.getValue(result.columns[1])] = result.getValue(result.columns[0]);
            return true;
        });
        return history_info;
    }

    function getReceiptDate(dataList) {
        var item_ids = [];
        for (var i = 0; i < dataList.length; i++) {
            if (item_ids.indexOf(dataList[i].bill_item) == -1) {
                item_ids.push(dataList[i].bill_item);
            }
        }

        var dateObj = {};
        if (item_ids.length > 0) {
            const itemSearchObj = search.create({
                type: "item",
                filters:
                    [
                        ["internalid", "anyof", item_ids]
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "内部 ID" }),
                        search.createColumn({ name: "custitem_swc_productdeliverydays", label: "采购交期" })
                    ]
            });

            var results = getAllResults(itemSearchObj);
            if (results.length == 0) return dateObj;
            for (var j = 0; j < results.length; j++) {
                var value = results[j];
                dateObj[value.id] = value.getValue({ name: "custitem_swc_productdeliverydays", label: "采购交期" }) || '';
            }
        }
        return dateObj
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