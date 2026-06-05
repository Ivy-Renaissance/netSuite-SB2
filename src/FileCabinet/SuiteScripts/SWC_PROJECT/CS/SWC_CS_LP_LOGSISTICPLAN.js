/**
 * ClientScript（去掉：上一页/下一页/缓存/刷新；仅对当前查询结果做全选；保留 saveRecord 校验）
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/url', '../common/SWC_CONFIG_DATA'], function (currentRecord, url, SWC_CONFIG_DATA) {
    var CONFIG = SWC_CONFIG_DATA.configData();

    function pageInit(scriptContext) {
        try {
            var el = document.getElementById('timeoutblocker');
            if (el) el.style.display = 'none';
        } catch (e) {}
    }

    function showBlocker(){
        try {
            var el = document.getElementById('timeoutblocker');
            if (el) el.style.display = 'block';
        } catch (e) {}
    }

    function search() {
        showBlocker(); // 点击查询显示
        // 下面保持不变...
        var rec = currentRecord.get();
        var baseUrl = window.location.href;
        baseUrl = removeParam(baseUrl, 'search_vendor');
        baseUrl = removeParam(baseUrl, 'search_po_id');
        baseUrl = removeParam(baseUrl, 'search_actual_cabinet');

        var vendor = rec.getValue({ fieldId: 'search_vendor' });
        var poIds = rec.getValue({ fieldId: 'search_po_id' });
        var cabinet = rec.getValue({ fieldId: 'search_actual_cabinet' });

        var u = baseUrl;
        if (vendor) u = changeURLArg(u, 'search_vendor', String(vendor));
        if (poIds && poIds.length) u = changeURLArg(u, 'search_po_id', poIds.join(','));
        if (cabinet) u = changeURLArg(u, 'search_actual_cabinet', String(cabinet));

        setWindowChanged(window, false);
        window.location.href = u;
    }

    function fieldChanged(scriptContext) {
        // 不做缓存；仅更新“已标记X条”
        // updateSelectedCountLabel();
        return true;
    }

    function selectAll() {
        var rec = currentRecord.get();
        var sublistId = 'info_list';
        var allLine = rec.getLineCount({ sublistId: sublistId }) || 0;

        for (var i = 0; i < allLine; i++) {
            rec.selectLine({ sublistId: sublistId, line: i });
            rec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'sublist_select', value: true, ignoreFieldChange: true });
            rec.commitLine({ sublistId: sublistId });
        }

        // updateSelectedCountLabel();
    }

    function unselectAll() {
        var rec = currentRecord.get();
        var sublistId = 'info_list';
        var allLine = rec.getLineCount({ sublistId: sublistId }) || 0;

        for (var i = 0; i < allLine; i++) {
            rec.selectLine({ sublistId: sublistId, line: i });
            rec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'sublist_select', value: false, ignoreFieldChange: true });
            rec.commitLine({ sublistId: sublistId });
        }

        // updateSelectedCountLabel();
    }

    // 从“当前页面 sublist 勾选”构建数组（不跨页、不缓存）
    function buildSelectedArrayFromCurrentPage() {
        var rec = currentRecord.get();
        var sublistId = 'info_list';
        var allLine = rec.getLineCount({ sublistId: sublistId }) || 0;

        var out = [];
        for (var i = 0; i < allLine; i++) {
            var check = rec.getSublistValue({ sublistId: sublistId, fieldId: 'sublist_select', line: i });
            if (check !== true && check !== 'T') continue;

            out.push({
                no: rec.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_line_no', line: i }),
                main_internalid: rec.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_main_internalid', line: i }),
                num_ca: rec.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_num_ca', line: i }),
                num_ca_sy: rec.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_num_ca_sy', line: i }),

                superior_qty_wl: rec.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_superior_qty_wl', line: i }),
                good_qty_wl: rec.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_good_qty_wl', line: i }),

                poId: rec.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_po_id', line: i }),
                country: rec.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_country', line: i }),
                location_type: rec.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_location_type', line: i }),
                region: rec.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_region', line: i }),
                item_id: rec.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_item_id', line: i })
            });
        }
        return out;
    }

    function writeHiddenSelectedJson(arr) {
        var rec = currentRecord.get();
        rec.setValue({ fieldId: 'custpage_selected_json', value: JSON.stringify(arr || []) });
    }

    // 保留：提交前校验（您要求保留 saveRecord check）
    function saveRecord(scriptContext) {
        try {
            var arr = buildSelectedArrayFromCurrentPage();
            if (!arr || arr.length === 0) {
                alert('请选择数据后，再提交。');
                return false;
            }

            var errorNos = [];
            var errorNos2 = [];
            var errorNos3 = [];

            for (var i = 0; i < arr.length; i++) {
                var r = arr[i] || {};
                var superiorRaw = r.superior_qty_wl;
                var goodRaw = r.good_qty_wl;
                var numCaRaw = r.num_ca;
                var ca_sy = Number(r.num_ca_sy || 0);

                var isEmpty = function (v) {
                    return v === null || v === undefined || v === '';
                };

                var noForMsg = (r.no !== undefined && r.no !== null && r.no !== '') ? r.no : r.main_internalid;

                if (isEmpty(superiorRaw) || isEmpty(goodRaw)) {
                    errorNos.push(noForMsg);
                    continue;
                }

                var superior = Number(superiorRaw);
                var good = Number(goodRaw);
                var numCa = Number(numCaRaw);

                if (Number.isNaN(superior) || Number.isNaN(good) || Number.isNaN(numCa)) {
                    errorNos.push(noForMsg);
                    continue;
                }

                if (ca_sy - superior - good < 0) {
                    errorNos.push(noForMsg);
                    continue;
                }

                if (ca_sy - superior - good === ca_sy) {
                    errorNos2.push(noForMsg);
                    continue;
                }

                if(superior + good != numCa){
                    errorNos3.push(noForMsg);
                    continue;
                }

            }

            if (errorNos.length > 0) {
                alert('以下明细数据异常（No）：' + errorNos.join(',') + '。本次真实发运优等品数量加本次真实发运良品数量，已超过当前可发运数量。');
                return false;
            }

            if (errorNos2.length > 0) {
                alert('以下明细数据异常（No）：' + errorNos2.join(',') + '。请正确填写【本次真实发运优等品数量】和【本次真实发运良品数量】。');
                return false;
            }

            if(errorNos3.length > 0){
                alert('以下明细数据异常（No）：' + errorNos3.join(',') + '。【本次真实发运优等品数量】和【本次真实发运良品数量】不等于【排柜数量】请重新填写。');
                return false;
            }

            writeHiddenSelectedJson(arr);

            showBlocker(); // 真正要提交时再显示
            return true;
        } catch (e) {
            alert('提交校验异常，请查看浏览器控制台或脚本日志。');
            return false;
        }
    }

    function updateSelectedCountLabel() {
        try {
            var rec = currentRecord.get();
            var sublistId = 'info_list';
            var allLine = rec.getLineCount({ sublistId: sublistId }) || 0;
            var cnt = 0;
            for (var i = 0; i < allLine; i++) {
                var check = rec.getSublistValue({ sublistId: sublistId, fieldId: 'sublist_select', line: i });
                if (check === true || check === 'T') cnt++;
            }

            // Suitelet 中按钮 id 是 show_run_lable
            var btn = document.getElementById('show_run_lable');
            if (btn) {
                btn.value = '已标记' + String(cnt) + '条';
            }
        } catch (e) {
            // ignore
        }
    }

    function changeURLArg(urlStr, arg, arg_val) {
        if (arg_val !== '') {
            var pattern = arg + '=([^&]*)';
            var replaceText = arg + '=' + encodeURIComponent(arg_val);
            if (urlStr.match(pattern)) {
                var tmp = '/(' + arg + '=)([^&]*)/gi';
                tmp = urlStr.replace(eval(tmp), replaceText);
                return tmp;
            } else {
                if (urlStr.match('[\\?]')) {
                    return urlStr + '&' + replaceText;
                } else {
                    return urlStr + '?' + replaceText;
                }
            }
        } else {
            return urlStr;
        }
    }

    function removeParam(urlStr, param) {
        try {
            var u = new URL(urlStr, window.location.origin);
            u.searchParams.delete(param);
            return u.toString();
        } catch (e) {
            // 兜底：简单正则删除
            var re = new RegExp('([?&])' + param + '=[^&]*(&)?', 'i');
            var out = urlStr.replace(re, function (match, p1, p2) {
                return p1 === '?' ? (p2 ? '?' : '') : (p2 ? p1 : '');
            });
            return out;
        }
    }

    function returnPage() {
        var getUrl = url.resolveScript({
            scriptId: CONFIG.SCRIPT_ID_SL_HP_DELIVERY_NOTICE,
            deploymentId: CONFIG.DEPLOY_ID_SL_HP_DELIVERY_NOTICE,
            returnExternalUrl: false
        });
        setWindowChanged(window, false);
        window.location.href = getUrl;
    }

    return {
        pageInit: pageInit,
        search: search,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord,
        returnPage: returnPage,
        selectAll: selectAll,
        unselectAll: unselectAll
    };
});
