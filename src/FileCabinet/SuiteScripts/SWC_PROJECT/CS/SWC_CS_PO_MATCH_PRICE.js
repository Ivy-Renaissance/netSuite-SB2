/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *货品行匹配供应商采购价格
 */
define(['N/search', 'N/ui/dialog', 'N/runtime', '../common/moment', 'N/https', 'N/url', '../common/commonTool', 'N/currentRecord'], function (search, dialog, runtime, moment, https, url, commonTool, currentRecord) {
    //固定值
    var system_price_type = 2, curr_cny_id = 1, curr_usd_id = 2;
    function pageInit(context) {

    }

    function saveRecord(context) {

    }

    function validateField(context) {

    }

    function fieldChanged(context) {
        try {
            var now_rec = context.currentRecord, field_id = context.fieldId, sublist_id = 'item';
            var flag = now_rec.getValue({ fieldId: 'custbody_swc_promotional_item_purchase' });
            if (!flag) {
                if (sublist_id && field_id == 'item') {
                    //匹配采购价格
                    var entity_id = now_rec.getValue('entity'), sub_id = now_rec.getValue('subsidiary'),
                        curr_id = now_rec.getValue('currency'),
                        item_id = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'item' }),
                        support = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_po_support' }),
                        mode = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_po_exw' }),
                        item_qty = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'quantity' }) || 0,
                        now_rec_id = now_rec.id, tran_date = now_rec.getText('trandate');
                    if (entity_id && sub_id && curr_id && item_id) {
                        var item_price_info = getItemPriceInfo(entity_id, sub_id, curr_id, item_id, item_qty,
                            now_rec_id, tran_date, support, mode);
                        log.debug('item_price_info', item_price_info);
                        if (Object.keys(item_price_info).length) {
                            now_rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_swc_including_tax_amt',
                                value: item_price_info.item_price
                            });
                            now_rec.setCurrentSublistValue(
                                { sublistId: 'item', fieldId: 'rate', value: item_price_info.item_price_tax });
                            now_rec.setCurrentSublistValue(
                                { sublistId: 'item', fieldId: 'taxcode', value: item_price_info.tax_code });
                        } else {
                            now_rec.setCurrentSublistValue(
                                { sublistId: 'item', fieldId: 'custcol_swc_including_tax_amt', value: '' });
                            now_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: '' });
                            now_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: '' });
                            dialog.alert({
                                title: '提示',
                                message: '未匹配到有效的采购价目表!'
                            });
                            return false;
                        }
                    }
                }

                if (field_id == 'quantity') {
                    //匹配采购价格
                    var entity_id = now_rec.getValue('entity'), sub_id = now_rec.getValue('subsidiary'),
                        curr_id = now_rec.getValue('currency'),
                        item_id = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'item' }),
                        support = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_po_support' }),
                        mode = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_po_exw' }),
                        item_qty = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'quantity' }) || 0,
                        now_rec_id = now_rec.id, tran_date = now_rec.getText('trandate');
                    if (entity_id && sub_id && curr_id && item_id) {
                        var item_price_info = getItemPriceInfo(entity_id, sub_id, curr_id, item_id, item_qty,
                            now_rec_id, tran_date, support, mode);
                        log.debug('item_price_info', item_price_info);
                        if (Object.keys(item_price_info).length) {
                            now_rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_swc_including_tax_amt',
                                value: item_price_info.item_price
                            });
                            now_rec.setCurrentSublistValue(
                                { sublistId: 'item', fieldId: 'rate', value: item_price_info.item_price_tax });
                            now_rec.setCurrentSublistValue(
                                { sublistId: 'item', fieldId: 'taxcode', value: item_price_info.tax_code });
                        } else {
                            now_rec.setCurrentSublistValue(
                                { sublistId: 'item', fieldId: 'custcol_swc_including_tax_amt', value: '' });
                            now_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: '' });
                            now_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: '' });
                            dialog.alert({
                                title: '提示',
                                message: '未匹配到有效的采购价目表!'
                            });
                            return false;
                        }
                    }
                }
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getItemPriceInfo(entity_id, sub_id, curr_id, item_id, item_qty, now_rec_id, tran_date, support, mode) {
        var rec_info = {}, price_details = [], price_type, effective_date;
        //先获取满足条件的所有价目表
        var myFilters = [
            ['custrecord_swc_sku_price_main_list.custrecord_swc_supplier', 'anyof', entity_id],
            'AND',
            ['custrecord_swc_sku_price_main_list.custrecord_swc_subsidiary', 'anyof', sub_id],
            'AND',
            ['custrecord_swc_item', 'anyof', item_id],
            'AND',
            ['custrecord_swc_support', 'is', support],
            'AND',
            ['custrecord_swc_effective_date', 'onorbefore', tran_date],
            'AND',
            ['isinactive', 'is', false]
        ]
        if (mode) {
            myFilters.push('AND')
            myFilters.push(['custrecord_swc_exw', 'anyof', mode])
        }else{
            myFilters.push('AND')
            myFilters.push(['custrecord_swc_exw', 'anyof', '@NONE@'])
        }
        var rec_search_obj = search.create({
            type: 'customrecord_swc_po_price_details',
            filters: myFilters,
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
                    search.createColumn({ name: 'custrecord_swc_support', label: '打托' }),//11
                    search.createColumn({ name: 'custrecord_swc_exw', label: '结算方式' })//12
                ]
        });
        var results = getAllResults(rec_search_obj);
        if (results.length == 0) return rec_info;
        for (var i = 0; i < results.length; i++) {
            price_type = price_type ? price_type : results[i].getValue(rec_search_obj.columns[0]);
            effective_date = effective_date ? effective_date : results[i].getValue(rec_search_obj.columns[9]);
            var tax_code = results[i].getValue(rec_search_obj.columns[1]);
            var premium_unit_price = results[i].getValue(rec_search_obj.columns[2]);
            var premium_excluding_tax = results[i].getValue(rec_search_obj.columns[3]);
            var initial_quantity = results[i].getValue(rec_search_obj.columns[4]);
            var end_quantity = results[i].getValue(rec_search_obj.columns[5]);
            var tax_code_usd = results[i].getValue(rec_search_obj.columns[6]);
            var premium_unit_price_usd = results[i].getValue(rec_search_obj.columns[7]);
            var premium_excluding_tax_usd = results[i].getValue(rec_search_obj.columns[8]);
            price_details.push({
                tax_code: tax_code,
                premium_unit_price: premium_unit_price,
                premium_excluding_tax: premium_excluding_tax,
                initial_quantity: initial_quantity,
                end_quantity: end_quantity,
                tax_code_usd: tax_code_usd,
                premium_unit_price_usd: premium_unit_price_usd,
                premium_excluding_tax_usd: premium_excluding_tax_usd,
                effective_date: results[i].getValue(rec_search_obj.columns[9])
            });
        }
        log.debug('price_details', price_details);
        if (price_details.length > 0) {
            if (price_type == system_price_type) {//判断生效日期最近的一条记录对应的价格类型
                //类型为【累计阶梯数量价格】需要加上当前月历史的采购数量
                var history_item_qty = getHistoryItemQty(entity_id, sub_id, item_id, now_rec_id, tran_date);
                item_qty = Number(item_qty) + Number(history_item_qty);
            }
            //匹配价格
            for (var i = 0; i < price_details.length; i++) {
                if (effective_date == price_details[i].effective_date) {
                    if (Number(item_qty) >= Number(price_details[i].initial_quantity) && Number(item_qty) <= Number(price_details[i].end_quantity)) {
                        if (curr_id == curr_cny_id) {
                            rec_info.tax_code = price_details[i].tax_code;
                            rec_info.item_price = price_details[i].premium_unit_price;
                            rec_info.item_price_tax = price_details[i].premium_excluding_tax;
                        } else if (curr_id == curr_usd_id) {
                            rec_info.tax_code = price_details[i].tax_code_usd;
                            rec_info.item_price = price_details[i].premium_unit_price_usd;
                            rec_info.item_price_tax = price_details[i].premium_excluding_tax_usd;
                        }
                    }
                }
            }
        }
        return rec_info;
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

    function getHistoryItemQty(entity_id, sub_id, item_id, now_rec_id, tran_date) {
        var history_qty = 0;
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
        var filters_arr = [
            ['name', 'anyof', entity_id],
            'AND',
            ['subsidiary', 'anyof', sub_id],
            'AND',
            ['mainline', 'is', 'F'],
            'AND',
            ['item', 'anyof', item_id],
            'AND',
            ['trandate', 'within', frist_day, last_day],
            'AND',
            ['status', 'noneof', 'PurchOrd:H', 'PurchOrd:A', 'PurchOrd:C']
        ];
        if (now_rec_id) {
            filters_arr.push('AND', ['internalid', 'noneof', now_rec_id]);
        }
        search.create({
            type: 'purchaseorder',
            settings: [{ 'name': 'consolidationtype', 'value': 'NONE' }],
            filters: filters_arr,
            columns:
                [
                    search.createColumn({ name: 'quantity', summary: 'SUM', label: '数量' })
                ]
        }).run().each(function (result) {
            history_qty = result.getValue(result.columns[0]);
            return false;
        });
        return history_qty;
    }

    function postSourcing(context) {

    }

    function lineInit(context) {

    }

    function validateDelete(context) {

    }

    function validateInsert(context) {

    }

    function validateLine(context) {

    }

    function sublistChanged(context) {

    }

    function updatePrice(bill_id) {
        try {
            var options = { title: '提示', message: '是否进行更新价格?' };
            function success(result) {
                if (result) {
                    commonTool.startMask('请稍后, 正在处理!');
                    var link = url.resolveScript({
                        scriptId: 'customscript_swc_rl_po_update_price',
                        deploymentId: 'customdeploy_swc_rl_po_update_price'
                    });
                    var header = {
                        'Content-Type': 'application/json;charset=utf-8',
                        'Accept': 'application/json'
                    }
                    https.post.promise({
                        url: link,
                        body: bill_id,
                        headers: header
                    }).then(function (resp) {
                        var resultData = JSON.parse(resp.body);
                        if (resultData) {
                            commonTool.endMask();
                            dialog.alert({ title: '提示', message: resultData.data }).then(function () {
                                window.location.reload();
                            });
                        }
                    });
                }
            }
            function failure(reason) { }
            dialog.confirm(options).then(success).catch(failure);
        } catch (e) {
            dialog.alert({
                title: '提示',
                message: e.message
            });
        }
    }

    return {
        // pageInit: pageInit,
        // saveRecord: saveRecord,
        // validateField: validateField,
        fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // lineInit: lineInit,
        // validateDelete: validateDelete,
        // validateInsert: validateInsert,
        // validateLine: validateLine,
        // sublistChanged: sublistChanged,
        updatePrice: updatePrice
    }
});