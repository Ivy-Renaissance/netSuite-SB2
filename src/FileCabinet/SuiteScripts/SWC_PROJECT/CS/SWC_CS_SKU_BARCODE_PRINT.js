/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/url', 'N/search', 'N/ui/dialog', '../common/commonTool', 'N/https', 'N/format'], function (currentRecord, url, search, dialog, commonTool, https, format) {

    function pageInit (context) {
        window.onbeforeunload = null;
    }

    function saveRecord (context) {

    }

    function validateField (context) {

    }


    function setToNullOption (now_rec, fields_id) {
        var objField = now_rec.getField({ fieldId: fields_id });
        objField.removeSelectOption({
            value: null,
        });
        objField.insertSelectOption({
            value: '',
            text: '',
        });
    }

    function setNewOption (now_rec, need_fieldid, need_arr) {
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

    function getLocArr (sub_id) {
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

    function postSourcing (context) {

    }

    function lineInit (context) {

    }

    function validateDelete (context) {

    }

    function validateInsert (context) {

    }

    function validateLine (context) {

    }

    function sublistChanged (context) {

    }

    function Select () {
        var now_rec = currentRecord.get();
        var params = {
            action: 'search'
        };
        var output = url.resolveScript({
            scriptId: 'customscript_swc_sku_barcode_print',
            deploymentId: 'customdeploy_swc_sl_sku_barcode_print',
        });
        params = getFilters(now_rec, params);
        setWindowChanged(window, false);
        console.log(params);
        window.location.href = output + '&' + serializeURL(params);
    }

    /**
     * 序列化url参数
     *
     * @param obj
     * @returns 序列化后的url
     * @author guangyuan.tan
     */
    function serializeURL (obj) {
        var str = [];
        for (var p in obj)
            if (obj.hasOwnProperty(p)) {
                str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
            }
        return str.join('&');
    }

    function getFilters (currentRec, params) {
        // 筛选条件后缀
        var fields = ['search_vendor', 'order_code'];

        for (var i in fields) {
            var currentField = currentRec.getValue(fields[i]);
            if (currentField) {
                params[fields[i]] = currentField;
            }
        }
        return params;
    }

    function printCode (params) {
        // 业务方法脚本地址
        const actionUrl = url.resolveScript({
            scriptId: "customscript_swc_print_label",
            deploymentId: "customdeploy_swc_print_label",
        });

        // 获取选中的sku
        const rec = currentRecord.get();
        const lineCount = rec.getLineCount('info_list');
        let dataList = []
        for (let i = 0; i < lineCount; i++) {
            const isSelect = rec.getSublistValue('info_list', 'custpage_line_checkbox', i);
            if (isSelect) {
                const order_id = rec.getSublistValue('info_list', 'order_id', i);
                const bill_supplier = rec.getSublistValue('info_list', 'bill_supplier', i);
                const com_sku = rec.getSublistValue('info_list', 'com_sku', i);
                const product_sku = rec.getSublistValue('info_list', 'product_sku', i);
                dataList.push({
                    order_id,
                    bill_supplier,
                    com_sku,
                    product_sku,
                });
            }
            if (dataList.length <= 0) {
                dialog.alert({
                    title: '提示',
                    message: '请至少选择一条数据！'
                })
                return false;
            }
        }

        const options = { title: '生成SKU标签', message: '是否开始生成SKU标签？' };
        function success (result) {
            if (result) {
                commonTool.startMask('生成中，请耐心等待！');
                log.debug('linkA', actionUrl)
                const sku_code = dataList.map(item => item.com_sku)
                const file_url = actionUrl + '&' + serializeURL({ sku_code: Array.from(new Set(sku_code)) });
                window.open(file_url, '_blank')
                commonTool.endMask();
            }
        }
        function failure (reason) { }
        dialog.confirm(options).then(success).catch(failure);
    }

    return {
        pageInit: pageInit,
        // saveRecord: saveRecord,
        // validateField: validateField,
        // postSourcing: postSourcing,
        // lineInit: lineInit,
        // validateDelete: validateDelete,
        // validateInsert: validateInsert,
        // validateLine: validateLine,
        // sublistChanged: sublistChanged,
        Select: Select,
        printCode: printCode
    }
});