/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope public
 */
define(['N/record', 'N/url', 'N/currentRecord', 'N/search', 'N/translation'],

    function (record, url, currentRecord, search, translation) {

    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    var trHeight;

    function pageInit(scriptContext) {
        trHeight = jQuery(".uir-machine-headerrow").height();
        init();
        // 隐藏遮罩
        jQuery('div#timeoutblocker').hide();
    }

    function init() {
        var $ = jQuery;
    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {

    }

    function searchData() {
        var rec = currentRecord.get();
        var custpage_type = rec.getValue({fieldId: "custpage_type"});
        var custpage_status = rec.getValue({fieldId: "custpage_status"});
        var output = url.resolveScript({
            scriptId: 'customscript_swc_sl_fixedassetsprint',
            deploymentId: 'customdeploy_swc_sl_fixedassetsprint',
            params: {
                custpage_type: custpage_type,
                custpage_status: custpage_status
            }
        });
        window.onbeforeunload = null;
        window.location.href = output;
    }

    /**
     * 获取WMS翻译信息
     * @param {Object} options - 包含请求参数的对象
     * @param {string} options.type - 翻译的类型
     * @param {string} options.key - 需要翻译的键名
     * @returns {Promise<string>} 返回一个Promise，解析后得到翻译后的字符串
     * @description 通过给定的键名从翻译集合中获取翻译信息
     */
    function getWMSTranslation({type, key}) {
        var collection = type == "element" ? "custcollection_swms_element" : "custcollection_swms_prompt";
        return translation.get({collection: collection, key: key})();
    }

    /**
     * 当前页面全选
     */
    function selectAll() {
        var rec = currentRecord.get();
        var sublistId = "custpage_sublist_detail";
        var line = rec.getLineCount({sublistId: sublistId});
        if (!line) return;
        //行数据取值
        for (var i = 0; i < line; i++) {
            rec.selectLine({sublistId: sublistId, line: i});
            var box = rec.getCurrentSublistValue({sublistId: sublistId, fieldId: "sub_checkbox"});
            if (box) {
                continue;
            }
            //复选框打勾
            rec.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: "sub_checkbox",
                value: true,
                ignoreFieldChange: true
            });
        }
    }

    /**
     * 当前页面取消全选
     */
    function deselectAll() {
        var curRec = currentRecord.get();
        var sublistId = "custpage_sublist_detail";
        // 获取当前数据总条数
        var dtlCt = curRec.getLineCount({sublistId: sublistId});
        if (!dtlCt) return;
        for (var i = 0; i < dtlCt; i++) {
            curRec.selectLine({sublistId: sublistId, line: i});
            var box = curRec.getCurrentSublistValue({sublistId: sublistId, fieldId: "sub_checkbox"});
            if (!box) {
                continue;
            }
            curRec.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: "sub_checkbox",
                value: false,
                ignoreFieldChange: true
            });
        }
    }

    function submitData() {
        var clickFlag = 0;
        if (clickFlag == 0) {
            clickFlag = 1;
            var curRec = currentRecord.get();
            var sublistId = "custpage_sublist_detail";
            // 获取当前数据总条数
            var dtlCt = curRec.getLineCount({sublistId: sublistId});
            if (!dtlCt) return;
            var arr = [];
            var flag = true;
            for (var i = 0; i < dtlCt; i++) {
                var obj = {};
                curRec.selectLine({sublistId: sublistId, line: i});
                var box = curRec.getCurrentSublistValue({sublistId: sublistId, fieldId: "sub_checkbox"});
                if (box) {
                    flag = false;
                    var name = curRec.getSublistValue({sublistId: sublistId, fieldId: "sub_name", line: i});
                    var code = curRec.getSublistValue({sublistId: sublistId, fieldId: "sub_code", line: i});
                    var model = curRec.getSublistValue({sublistId: sublistId, fieldId: "sub_model", line: i});
                    obj["name"] = name;
                    obj["code"] = code;
                    obj["model"] = model;
                    arr.push(obj)
                }
            }
            if (flag) {
                alert(getWMSTranslation({key: "MSG2"}));
                return false;
            }
            var priCreate = record.create({type: "customrecord_swc_xlbb_printdata"});
            priCreate.setValue({fieldId: "custrecord_swpd_print", value: JSON.stringify(arr)});
            var id = priCreate.save();
            console.log('id',id);
            var printUrl = url.resolveScript({
                scriptId: 'customscript_swc_sl_fixedassetsprint',
                deploymentId: 'customdeploy_swc_sl_fixedassetsprint',
                params: {
                    priData: JSON.stringify({
                        type: "print",
                        data: id
                    })
                }
            });
            // 打开pdf
            window.open(printUrl);
            jQuery("input[id^=custpage_data_submit]").attr("disabled", true);
            setTimeout(function () {
                clickFlag = 0;
                jQuery("input[id^=custpage_data_submit]").attr("disabled", false);
            }, 800);
        }
    }

    return {
        searchData: searchData,
        deselectAll: deselectAll,
        selectAll: selectAll,
        submitData: submitData,
        pageInit: pageInit
    };
    
});
