/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/url', 'N/search', 'N/ui/dialog', '../common/commonTool', 'N/https', 'N/format'], function (currentRecord, url, search, dialog, commonTool, https, format) {

    function pageInit(context) {
        window.onbeforeunload = null;
    }

    function saveRecord(context) {

    }

    function validateField(context) {

    }

    function fieldChanged(context) {
        try {
            var now_rec = context.currentRecord;
            var now_fieldid = context.fieldId;
            var now_line = context.line;
            if (now_fieldid == 'search_vendor') {
                var fields_id = 'custpage_bill_subsidiary';
                setToNullOption(now_rec, fields_id);
                var fields_id1 = 'custpage_bill_location';
                setToNullOption(now_rec, fields_id1);
                var fields_id2 = 'custpage_bill_currency';
                setToNullOption(now_rec, fields_id2);
            } else if (now_fieldid == 'remaining_po_qty') {
                var rec = now_rec.selectLine({ sublistId: 'info_list', line: now_line });
                var remaining_pr_qty = now_rec.getSublistValue({ sublistId: 'info_list', fieldId: 'remaining_pr_qty', line: now_line });
                var remaining_po_qty = now_rec.getSublistValue({ sublistId: 'info_list', fieldId: 'remaining_po_qty', line: now_line });
                if (Number(remaining_po_qty) < 0) {
                    dialog.alert({
                        title: '提示',
                        message: '本次采购数量不能为负数！'
                    })
                    now_rec.setCurrentSublistValue({ sublistId: 'info_list', fieldId: 'remaining_po_qty', value: Number(remaining_pr_qty), ignoreFieldChange: true });
                }
                if (Number(remaining_po_qty) > Number(remaining_pr_qty)) {
                    dialog.alert({
                        title: '提示',
                        message: '本次采购数量不能大于剩余可采购数量！'
                    })
                    now_rec.setCurrentSublistValue({ sublistId: 'info_list', fieldId: 'remaining_po_qty', value: Number(remaining_pr_qty), ignoreFieldChange: true });
                }
                rec.commitLine({ sublistId: 'info_list' });
            }
            //  else if (now_fieldid == 'custpage_bill_subsidiary') {
            //     var loc_arr = getLocArr(now_rec.getValue(now_fieldid));
            //     var need_fields_id = 'custpage_bill_location';
            //     setNewOption(now_rec, need_fields_id, loc_arr);
            // }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function setToNullOption(now_rec, fields_id) {
        var objField = now_rec.getField({ fieldId: fields_id });
        objField.removeSelectOption({
            value: null,
        });
        objField.insertSelectOption({
            value: '',
            text: '',
        });
    }

    function setNewOption(now_rec, need_fieldid, need_arr) {
        var objField = now_rec.getField({ fieldId: need_fieldid });
        objField.removeSelectOption({
            value: null,
        });
        objField.insertSelectOption({
            value: '',
            text: '',
        });
        if (need_arr.length > 0) {
            for (var i = 0; i < need_arr.length; i++) {
                objField.insertSelectOption({
                    value: need_arr[i].value,
                    text: need_arr[i].text,
                });
            }
        }
    }

    function getLocArr(sub_id) {
        var need_loc = [];
        search.create({
            type: 'location',
            filters:
                [
                    ['subsidiary', 'anyof', sub_id],
                    'AND',
                    ['isinactive', 'is', false]
                ],
            columns:
                [
                    'name'
                ]
        }).run().each(function (result) {
            need_loc.push({
                value: result.id,
                text: result.getValue(result.columns[0])
            });
            return true;
        });
        return need_loc;
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

    function Select() {
        var now_rec = currentRecord.get();
        var params = {
            action: 'search'
        };
        var output = url.resolveScript({
            scriptId: 'customscript_swc_sl_pr_create_po',
            deploymentId: 'customdeploy_swc_sl_pr_create_po',
        });
        params = getFilters(now_rec, params);
        setWindowChanged(window, false);
        window.location.href = output + '&' + serializeURL(params);
    }

    /**
     * 序列化url参数
     *
     * @param obj
     * @returns 序列化后的url
     * @author guangyuan.tan
     */
    function serializeURL(obj) {
        var str = [];
        for (var p in obj)
            if (obj.hasOwnProperty(p)) {
                str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
            }
        return str.join('&');
    }

    function getFilters(currentRec, params) {
        // 筛选条件后缀
        var fields = ['search_vendor', 'custpage_batch', 'custpage_batch_month', 'custpage_begin', 'custpage_end','custpage_hd_currency', 'custpage_trandate'];

        for (var i in fields) {
            var currentField = currentRec.getValue(fields[i]);
            if (currentField) {
                // 日期特殊处理
                // if (fields[i] == 'search_date' || fields[i] == 'search_date_to') {
                //     currentField = format.format({
                //         value: currentField,
                //         type: format.Type.DATE
                //     });
                // }
                if (fields[i] == 'custpage_begin' || fields[i] == 'custpage_end'|| fields[i] == 'custpage_trandate') {
                    currentField = format.format({
                        value: currentField,
                        type: format.Type.DATE
                    });
                }
                params[fields[i]] = currentField;
            }
        }
        return params;
    }

    function createBill() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount('info_list');
            var dataList = [], data_str = {}, bill_vendor = rec.getValue('search_vendor'), bill_sub = rec.getValue('custpage_bill_subsidiary'),
                bill_currency = rec.getValue('custpage_bill_currency'), bill_loc = rec.getValue('custpage_bill_location'),
                bill_terms = rec.getValue('custpage_bill_terms');
                var bill_trandate = rec.getText('custpage_trandate');
            if (!bill_sub || !bill_currency || !bill_loc || !bill_terms|| !bill_trandate) {
                dialog.alert({
                    title: '提示',
                    message: '采购信息存在空值，请检查采购信息是否全部填充！'
                })
                return false;
            }
            for (var i = 0; i < lineCount; i++) {
                var isSelect = rec.getSublistValue('info_list', 'custpage_line_checkbox', i);
                if (isSelect) {
                    var stocking_plan = rec.getSublistValue('info_list', 'stocking_plan', i);
                    var bill_pr = rec.getSublistValue('info_list', 'bill_pr', i);
                    var bill_item = rec.getSublistValue('info_list', 'bill_item', i);
                    var bill_item_text = rec.getSublistValue('info_list', 'bill_item_text', i);
                    var bill_item_name = rec.getSublistValue('info_list', 'bill_item_name', i);
                    var remaining_po_qty = rec.getSublistValue('info_list', 'remaining_po_qty', i);
                    var bill_bom = rec.getSublistValue('info_list', 'bill_bom', i);
                    var bill_customer = rec.getSublistValue('info_list', 'bill_customer', i);
                    var loc_type = rec.getSublistValue('info_list', 'loc_type', i);
                    var bill_country = rec.getSublistValue('info_list', 'bill_country', i);
                    var us_districts = rec.getSublistValue('info_list', 'us_districts', i);
                    var pr_origin_sku = rec.getSublistValue('info_list', 'pr_origin_sku', i);
                    var pr_main_sku = rec.getSublistValue('info_list', 'pr_main_sku', i);
                    var pr_support = rec.getSublistValue('info_list', 'pr_support', i);
                    var fob_method = rec.getSublistValue('info_list', 'fob_method', i);
                    dataList.push({
                        stocking_plan: stocking_plan,
                        bill_pr: bill_pr,
                        bill_item: bill_item,
                        bill_item_text: bill_item_text,
                        bill_item_name: bill_item_name,
                        remaining_po_qty: remaining_po_qty,
                        bill_bom: bill_bom,
                        bill_customer: bill_customer,
                        loc_type: loc_type,
                        bill_country: bill_country,
                        us_districts: us_districts,
                        pr_origin_sku: pr_origin_sku,
                        pr_main_sku: pr_main_sku,
                        pr_support: pr_support,
                        fob_method: fob_method
                    });
                }
            }
            if (dataList.length <= 0) {
                dialog.alert({
                    title: '提示',
                    message: '请至少选择一条数据！'
                })
                return false;
            }
            data_str.bill_vendor = bill_vendor;
            data_str.bill_sub = bill_sub;
            data_str.bill_currency = bill_currency;
            data_str.bill_loc = bill_loc;
            data_str.bill_terms = bill_terms;
            data_str.bill_trandate = bill_trandate;
            data_str.dataList = dataList;
            var options = { title: '生成采购订单', message: '是否生成采购订单？' };
            function success(result) {
                if (result) {
                    commonTool.startMask('生成中，请耐心等待！');
                    var link = url.resolveScript({
                        scriptId: 'customscript_swc_rl_pr_create_po',
                        deploymentId: 'customdeploy_swc_rl_pr_create_po'
                    });
                    var header = {
                        'Content-Type': 'application/json;charset=utf-8',
                        'Accept': 'application/json'
                    }
                    https.post.promise({
                        url: link,
                        body: JSON.stringify(data_str),
                        headers: header
                    }).then(function (resp) {
                        var resultData = JSON.parse(resp.body);
                        if (resultData) {
                            commonTool.endMask();
                            dialog.alert({ title: '提示', message: resultData.data }).then(function () {
                                if (resultData.url) {
                                    window.open(resultData.url);
                                }
                                window.location.reload();
                            });
                        }
                    });
                }
            }
            function failure(reason) { }
            dialog.confirm(options).then(success).catch(failure);
        } catch (e) {
            log.debug('e', e);
        }
    }

    return {
        pageInit: pageInit,
        // saveRecord: saveRecord,
        // validateField: validateField,
        fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // lineInit: lineInit,
        // validateDelete: validateDelete,
        // validateInsert: validateInsert,
        // validateLine: validateLine,
        // sublistChanged: sublistChanged,
        Select: Select,
        createBill: createBill
    }
});