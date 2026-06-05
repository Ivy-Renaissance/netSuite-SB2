/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope public
 * @description CG子单信息按钮，处理费用预估、分摊、实际费用分摊、费用采购等业务
 */
define(['N/ui/dialog', 'N/https', 'N/url', 'N/record', 'N/search', 'N/currentRecord', 'N/url'],
    function (dialog, https, url, record, search, currentRecord, urls) {

        function pageInit(scriptContext) { }
        function fieldChanged(scriptContext) { }

        // ========== 常量：Suitelet 入口与 headers ==========
        var SUITELET_INFO = {
            scriptId: 'customscript_swc_rl_cg_sub_order',
            deploymentId: 'customdeploy_swc_rl_cg_sub_order'
        };

        var JSON_HEADERS = {
            'Content-Type': 'application/json;charset=utf-8',
            'Accept': 'application/json'
        };
        // 我用一个页面级内存标记，尽量拦住同一浏览器里对同一动作的重复点击。
        var PENDING_REQUEST_MAP = {};
        var TRADE_TERMS_V2_PROGRESS_TIMER = null;
        var TRADE_TERMS_V2_STATUS_TIMER = null;

        function getSuiteletLink() {
            return url.resolveScript(SUITELET_INFO);
        }


        function getPendingRequestKey(params) {
            return String(params.action || '') + '::' + String(params.billId || '');
        }

        function normalizeResultMessage(resultData) {
            if (!resultData) return '';
            return resultData.data || resultData.message || '';
        }

        function isConcurrentChangedMessage(message) {
            var text = String(message || '').toLowerCase();
            return text.indexOf('record has been changed') !== -1
                || text.indexOf('rcrd_has_been_changed') !== -1
                || text.indexOf('单据已被改修') !== -1
                || text.indexOf('记录已被修改') !== -1;
        }

        function showAlertMessage(message) {
            return dialog.alert({
                title: '提示',
                message: message
            });
        }

        // ========== 通用调用 ==========
        function confirmAndPost(params) {
            // params:
            // - title
            // - message
            // - maskMessage
            // - action
            // - billId  (最终写入 requestData.bill_id 的值)
            // - onSuccessBeforeAlert (可选)
            var options = {
                title: params.title,
                message: params.message
            };
            var pendingKey = getPendingRequestKey(params);

            function success(result) {
                try {
                    if (!result) return;
                    if (PENDING_REQUEST_MAP[pendingKey]) {
                        showAlertMessage('当前操作正在处理中，请勿重复点击。');
                        return;
                    }

                    PENDING_REQUEST_MAP[pendingKey] = true;

                    startMask(params.maskMessage);

                    var link = getSuiteletLink();
                    var requestData = {
                        bill_id: params.billId,
                        action: params.action
                    };

                    https.post.promise({
                        url: link,
                        body: JSON.stringify(requestData),
                        headers: JSON_HEADERS
                    }).then(function (resp) {
                        var resultData = {};
                        try {
                            resultData = JSON.parse(resp.body);
                        } catch (e) {
                            resultData = { data: '返回数据解析失败，请刷新页面后确认处理结果。' };
                        }

                        var message = normalizeResultMessage(resultData) || '处理完成，请刷新页面确认结果。';
                        if (isConcurrentChangedMessage(message)) {
                            message = '当前单据刚被其他人或其他流程更新，请先刷新页面确认结果后再决定是否继续操作。';
                        }

                        return showAlertMessage(message).then(function () {
                            if (resultData.url) {
                                window.open(resultData.url);
                            }
                            window.location.reload();
                        });
                    }).catch(function (e) {
                        var errorMessage = (e && e.message) ? e.message : String(e || '');
                        if (isConcurrentChangedMessage(errorMessage)) {
                            errorMessage = '当前单据刚被其他人或其他流程更新，请先刷新页面确认结果后再决定是否继续操作。';
                        } else if (!errorMessage) {
                            errorMessage = '请求执行失败，请刷新页面后确认结果。';
                        }

                        return showAlertMessage(errorMessage);
                    }).then(function () {
                        endMask();
                        delete PENDING_REQUEST_MAP[pendingKey];
                    });

                } catch (e) {
                    alert('异常 : ' + e);
                    endMask();
                    delete PENDING_REQUEST_MAP[pendingKey];
                }
            }

            function failure(reason) { }

            dialog.confirm(options).then(success).catch(failure);
        }

        // ========== 具体业务按钮函数 ==========

        function feeEstimatedCos(wlId) {
            confirmAndPost({
                title: '预估费用',
                message: '是否进行预估费用生成？',
                maskMessage: '正在进行预估费用生成，请耐心等待！',
                action: 'feeEstimatedCos',
                billId: wlId
            });
        }

        function feePoCreate(wlId) {
            confirmAndPost({
                title: '费用类采购订单',
                message: '是否生成费用类采购订单？',
                maskMessage: '正在生成费用类采购订单，请耐心等待！',
                action: 'feePoCreate',
                billId: wlId
            });
        }

        function feeApportion(wlId) {
            confirmAndPost({
                title: '费用分摊',
                message: '是否进行费用分摊？',
                maskMessage: '正在进行费用分摊，请耐心等待！',
                action: 'feeApportion',
                billId: wlId
            });
        }

        function feeApportionSj(wlId) {
            confirmAndPost({
                title: '实际费用分摊',
                message: '是否进行实际费用分摊？',
                maskMessage: '正在进行实际费用分摊，请耐心等待！',
                action: 'feeApportionSj',
                billId: wlId
            });
        }

        function feeApportionSjWc(wlId) {
            confirmAndPost({
                title: '实际费用分摊',
                message: '是否进行实际费用分摊？',
                maskMessage: '正在进行实际费用分摊，请耐心等待！',
                action: 'feeApportionSjWc',
                billId: wlId
            });
        }

        function fee_ar_to(wlId, type) {
            var typeJson = {
                1: {
                    title: '审批确认',
                    message: '是否审核通过',
                    startMask: '正在审核通过中，请耐心等待'
                },
                2: {
                    title: '审批确认',
                    message: '是否审核驳回',
                    startMask: '正在审核驳回中，请耐心等待'
                }
            };

            confirmAndPost({
                title: typeJson[type].title,
                message: typeJson[type].message,
                maskMessage: typeJson[type].startMask,
                action: 'fee_ar_to',
                billId: wlId + '_' + type
            });
        }

        function fee_ar_to_db(wlId, type) {
            var typeJson = {
                1: {
                    title: '审批确认',
                    message: '是否审核通过',
                    startMask: '正在审核通过中，请耐心等待'
                },
                2: {
                    title: '审批确认',
                    message: '是否审核驳回',
                    startMask: '正在审核驳回中，请耐心等待'
                }
            };

            confirmAndPost({
                title: typeJson[type].title,
                message: typeJson[type].message,
                maskMessage: typeJson[type].startMask,
                action: 'fee_ar_to_db',
                billId: wlId + '_' + type
            });
        }

        function workOrderAssembly(wlId) {
            confirmAndPost({
                title: '工单组装',
                message: '是否进行工单组装？',
                maskMessage: '正在进行工单组装，请耐心等待！',
                action: 'workOrderAssembly',
                billId: wlId
            });
        }

        function createIfRecord(wlId) {
            confirmAndPost({
                title: '预估杂费分摊',
                message: '是否进行预估杂费分摊处理？',
                maskMessage: '预估杂费分摊处理中，请耐心等待！',
                action: 'createIfRecord',
                billId: wlId
            });
        }

        function upDataPoSubListLine(wlId) {
            confirmAndPost({
                title: '采购订单明细行数据更新',
                message: '是否进行采购订单明细行数据更新处理？',
                maskMessage: '正在进行采购订单明细行数据更新处理，请耐心等待！',
                action: 'upDataPoSubListLine',
                billId: wlId
            });
        }

        function tcFeePoCreate(wlId) {
            confirmAndPost({
                title: '头程费用类采购订单',
                message: '是否生成头程费用类采购订单？',
                maskMessage: '正在生成头程费用类采购订单，请耐心等待！',
                action: 'tcFeePoCreate',
                billId: wlId
            });
        }

        function wlRm(wlId) {
            confirmAndPost({
                title: '物流发运无效',
                message: '是否将当前物流发运无效掉？',
                maskMessage: '物流发运正在无效中，请耐心等待！',
                action: 'wlRm',
                billId: wlId
            });
        }

        function poZfCy(wlId) {
            confirmAndPost({
                title: '采购杂费差异账单',
                message: '是否进行采购杂费差异账单做成？',
                maskMessage: '正在进行采购杂费差异账单做成，请耐心等待！',
                action: 'poZfCy',
                billId: wlId
            });
        }

        function fee_po_sp(wlId) {
            confirmAndPost({
                title: '费用类采购订单重新审批',
                message: '是否进行费用类采购订单重新审批？',
                maskMessage: '提交中，请耐心等待！',
                action: 'fee_po_sp',
                billId: wlId
            });
        }

        function fee_po_sp_tc(wlId) {
            confirmAndPost({
                title: '头程费用类采购订单重新审批',
                message: '是否进行头程费用类采购订单重新审批？',
                maskMessage: '提交中，请耐心等待！',
                action: 'fee_po_sp_tc',
                billId: wlId
            });
        }

        function onClickFeePoCreate(wlId) {
            confirmAndPost({
                title: '费用类型采购订单做成',
                message: '是否进行费用类型采购订单做成？',
                maskMessage: '提交中，请耐心等待！',
                action: 'onClickFeePoCreate',
                billId: wlId
            });
        }

        function onClickFeePoCreate_hw(wlId) {
            confirmAndPost({
                title: '费用类型采购订单做成',
                message: '是否进行费用类型采购订单做成？',
                maskMessage: '提交中，请耐心等待！',
                action: 'onClickFeePoCreate_hw',
                billId: wlId
            });
        }

        function onClickReapply(wlId) {
            confirmAndPost({
                title: '重新审核',
                message: '是否进行重新审核？',
                maskMessage: '重新审核中，请耐心等待！',
                action: 'onClickReapply',
                billId: wlId
            });
        }

        function onClickReapply_hw(wlId) {
            confirmAndPost({
                title: '重新审核',
                message: '是否进行重新审核？',
                maskMessage: '重新审核中，请耐心等待！',
                action: 'onClickReapply_hw',
                billId: wlId
            });
        }

        function differentialBillingCompleted(wlId) {
            confirmAndPost({
                title: '差异账单',
                message: '是否生成差异账单？',
                maskMessage: '差异账单生成中，请耐心等待！',
                action: 'differentialBillingCompleted',
                billId: wlId
            });
        }

        function differentialBillingCompleted_hw(wlId) {
            confirmAndPost({
                title: '差异账单',
                message: '是否生成差异账单？',
                maskMessage: '差异账单生成中，请耐心等待！',
                action: 'differentialBillingCompleted_hw',
                billId: wlId
            });
        }

        function differentialBillingCompleted_hw_actual(wlId) {
            confirmAndPost({
                title: '实际差异账单',
                message: '是否生成实际差异账单？',
                maskMessage: '差异账单生成中，请耐心等待！',
                action: 'differentialBillingCompleted_hw_actual',
                billId: wlId
            });
        }

        function onClickApproveOk(wlId) {
            confirmAndPost({
                title: '调拨费入库分摊',
                message: '是否进行采购调拨费入库分摊？',
                maskMessage: '差异账单生成中，请耐心等待！',
                action: 'onClickApproveOk',
                billId: wlId
            });
        }

        function onClickApproveOk_hw(wlId) {
            confirmAndPost({
                title: '调拨费入库分摊',
                message: '是否进行采购调拨费入库分摊？',
                maskMessage: '差异账单生成中，请耐心等待！',
                action: 'onClickApproveOk_hw',
                billId: wlId
            });
        }

        function onClickInOutCreate(wlId) {
            confirmAndPost({
                title: '采购入库调拨',
                message: '是否生成出库单据和入库单据',
                maskMessage: '货品履行和货品收据生成中，请耐心等待！',
                action: 'onClickInOutCreate',
                billId: wlId
            });
        }

        function poToIf(wlId) {
            confirmAndPost({
                title: '采购订单入库',
                message: '是否进行采购订单入库？',
                maskMessage: '采购订单入库中，请耐心等待！',
                action: 'poToIf',
                billId: wlId
            });
        }

        function supplierShippedCn(wlId) {
            confirmAndPost({
                title: '供应商出货',
                message: '是否进行供应商出货？',
                maskMessage: '供应商出货中，请耐心等待！',
                action: 'supplierShippedCn',
                billId: wlId
            });
        }

        function customsDeclared(wlId) {
            confirmAndPost({
                title: '报关',
                message: '是否进行报关处理？',
                maskMessage: '报关中，请耐心等待！',
                action: 'customsDeclared',
                billId: wlId
            });
        }

        function clearedCustoms(wlId) {
            confirmAndPost({
                title: '清关',
                message: '是否进行清关处理？',
                maskMessage: '清关中，请耐心等待！',
                action: 'clearedCustoms',
                billId: wlId
            });
        }

        // ========== 关闭遮罩 ==========
        function endMask() {
            try {
                document.getElementById('cutomerModel').style.display = 'none';
            } catch (e) { }
        }

        // ========== 开始遮罩 ==========
        function startMask(message, type) {
            if (!type) type = "afterbegin";

            var htmlText =
                "<div id ='cutomerModel' style=\"position: absolute;top: 0;left: 0;display: block;background-color: rgba(9, 9, 9, 0.6);width: 100%;height: 100%;z-index: 1000;text-align:center\"/>\n" +
                "<img src=\"https://system.na2.netsuite.com/core/media/media.nl?id=3583&c=4890821&h=8dca27f2eedc57f9d2a1\" style=\"margin-top:20%;width:40px;\" /></br>\n" +
                "<b style=\"margin-top:2%;color:#fff\">" + message + "</b>\n" +
                "</div>";

            insertHTML(document.body, type, htmlText);
            document.getElementById('cutomerModel').style.display = 'block';

            var pageH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
            pageH = pageH > 0 ? pageH : 600;
            document.getElementById('cutomerModel').style.height = pageH + "px";
            return true;
        }

        function insertHTML(el, where, html) {
            if (!el) return false;

            where = where.toLowerCase();
            if (el.insertAdjacentHTML) {
                el.insertAdjacentHTML(where, html);
            } else {
                var range = el.ownerDocument.createRange(), frag = null;

                switch (where) {
                    case "beforebegin":
                        range.setStartBefore(el);
                        frag = range.createContextualFragment(html);
                        el.parentNode.insertBefore(frag, el);
                        return el.previousSibling;

                    case "afterbegin":
                        if (el.firstChild) {
                            range.setStartBefore(el.firstChild);
                            frag = range.createContextualFragment(html);
                            el.insertBefore(frag, el.firstChild);
                        } else {
                            el.innerHTML = html;
                        }
                        return el.firstChild;

                    case "beforeend":
                        if (el.lastChild) {
                            range.setStartAfter(el.lastChild);
                            frag = range.createContextualFragment(html);
                            el.appendChild(frag);
                        } else {
                            el.innerHTML = html;
                        }
                        return el.lastChild;

                    case "afterend":
                        range.setStartAfter(el);
                        frag = range.createContextualFragment(html);
                        el.parentNode.insertBefore(frag, el.nextSibling);
                        return el.nextSibling;
                }
            }
        }

        // ========== 其它：保持原逻辑不改 ==========
        function toActualCabinet() {

            try {
                var recId = currentRecord.get().id;

                var rec = record.load({
                    type: 'customrecord_swc_estimated_cabinet',
                    id: recId
                });

                // 明细子列表
                var sublistId = 'recmachcustrecord_swc_ecd_estimated_cabinet';
                var lineCount = rec.getLineCount({ sublistId: sublistId }) || 0;

                // 收集 region（去重）
                var regionMap = {};
                var regionAry = [];

                var regionMap2 = {};
                var regionAry2 = [];

                for (var i = 0; i < lineCount; i++) {

                    var region = rec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_swc_estimated_cabine_no',
                        line: i
                    });

                    var region2 = rec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_swc_ecd_region',
                        line: i
                    });

                    // 采购订单数量
                    var po_quantity = rec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_swc_ecd_po_quantity',
                        line: i
                    }) || 0;

                    // 真实排柜数量
                    var zs_qty = rec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_swc_ecd_zs_qty',
                        line: i
                    }) || 0;

                    if(Number(po_quantity) > Number(zs_qty)){
                        var key = String(region);
                        if (!regionMap[key]) {
                            regionMap[key] = true;
                            regionAry.push(key);
                        }

                        var key2 = String(region2);
                        if (!regionMap2[key2]) {
                            regionMap2[key2] = true;
                            regionAry2.push(key2);
                        }
                    }
                }

                log.debug

                // 每个区域打开一个新窗口
                for (var j = 0; j < regionAry.length; j++) {
                    var targetUrl = urls.resolveRecord({
                        recordType: 'customrecord_swc_actual_cabinet',
                        isEditMode: true,
                        params: {
                            'record.custrecord_swc_ac_estimated_cabinet': String(recId),
                            'record.custrecord_swc_ac_estimated_cabinet_line': String(regionAry[j]),
                            'record.custrecord_swc_ac_region': String(regionAry2[j])
                        }
                    });

                    window.open(targetUrl, '_blank');
                }

                return {};
            } catch (e) {
                console.log('toActualCabinet error', e);
                alert('打开真实排柜单失败：' + (e && e.message ? e.message : e));
                return {};
            }
        }

        function saveRecord(context) {
            // var rec = context.currentRecord;
            //
            // var sublistId = 'recmachcustrecord_swc_wl_first_leg_cost_id';
            // var feeFieldId = 'custrecord_swc_wl_flc_sj_fee';
            // var currencyFieldId = 'custrecord_swc_wl_flc_sj_currency';
            // var statusFieldId = 'custrecord_swc_wl_plan_status';
            //
            // var lineCount = rec.getLineCount({ sublistId: sublistId }) || 0;
            //
            // var hasAnyFeeFilled = false;
            //
            // for (var i = 0; i < lineCount; i++) {
            //     var feeVal = rec.getSublistValue({
            //         sublistId: sublistId,
            //         fieldId: feeFieldId,
            //         line: i
            //     });
            //
            //     if (isFeeFilled(feeVal)) {
            //         hasAnyFeeFilled = true;
            //
            //         var currencyVal = rec.getSublistValue({
            //             sublistId: sublistId,
            //             fieldId: currencyFieldId,
            //             line: i
            //         });
            //
            //         if (isEmpty(currencyVal)) {
            //             alert('保存失败：第 ' + (i + 1) + ' 行已填写【实际费用】，但未选择【实际币种】。');
            //             return false;
            //         }
            //     }
            // }
            //
            // if (!hasAnyFeeFilled) return true;
            //
            // rec.setValue({
            //     fieldId: statusFieldId,
            //     value: 11
            // });
            return true;
        }

        function isEmpty(v) {
            return v === null || v === '' || typeof v === 'undefined';
        }

        function isFeeFilled(v) {
            if (isEmpty(v)) return false;
            if (typeof v === 'string' && v.trim() === '') return false;
            return true;
        }

        // ====== 隐藏编辑和删除按钮 ======
        function hideRecmachSublistUI_SAFE(sublistDomId, options) {
            options = options || {};
            var editLabel = options.editLabel || '编辑';
            var deleteLabel = options.deleteLabel || '删除';

            var $ = jQuery;

            var tableId = sublistDomId + '__tab';
            var layerId = sublistDomId + '_layer';

            function hideColsOnlyThisTable() {
                var $table = $('#' + tableId);
                if (!$table.length) return;

                var $headerRow = $table.find('.uir-list-headerrow');
                if (!$headerRow.length) return;

                var editIdx = $headerRow.find("td[data-label='" + editLabel + "']").index();
                var delIdx = $headerRow.find("td[data-label='" + deleteLabel + "']").index();

                if (editIdx !== -1) {
                    var col = editIdx + 1;
                    $table.find('tr').each(function () {
                        $(this).find('th:nth-child(' + col + '),td:nth-child(' + col + ')').hide();
                    });
                }
                if (delIdx !== -1) {
                    var col2 = delIdx + 1;
                    $table.find('tr').each(function () {
                        $(this).find('th:nth-child(' + col2 + '),td:nth-child(' + col2 + ')').hide();
                    });
                }
            }

            $('#tbl_new' + sublistDomId).hide();

            var layerEl = document.getElementById(layerId);
            if (layerEl) {
                var attachEl = layerEl.querySelector('input#attach');
                if (attachEl) attachEl.style.display = 'none';

                var customizeEl = layerEl.querySelector('input#customize');
                if (customizeEl) customizeEl.style.display = 'none';
            }

            hideColsOnlyThisTable();

            var tries = 0;
            var timer = setInterval(function () {
                tries++;
                if (document.getElementById(tableId)) {
                    clearInterval(timer);
                    hideColsOnlyThisTable();
                }
                if (tries >= 30) {
                    clearInterval(timer);
                }
            }, 300);

            if (layerEl) {
                var observer = new MutationObserver(function () {
                    hideColsOnlyThisTable();
                });
                observer.observe(layerEl, { subtree: true, childList: true });
            }
        }

        function validateDelete(context) {
            try {
                alert(context.sublistId);
                if (context.sublistId && context.sublistId !== 'recmachcustrecord_swc_wl_plan_order_id') {
                    return true;
                }

                var msg = '确定要删除这一行吗？\n点击“确定”将删除，点击“取消”将保留。';
                return window.confirm(msg);

            } catch (e) {
                return true;
            }
        }

        function onClickInOutCreate_hw(wlId) {
            confirmAndPost({
                title: '海外仓调拨',
                message: '是否生成出库单据和入库单据',
                maskMessage: '货品履行和货品收据生成中，请耐心等待！',
                action: 'onClickInOutCreate_hw',
                billId: wlId
            });
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            feePoCreate: feePoCreate,
            createIfRecord: createIfRecord,
            toActualCabinet: toActualCabinet,
            upDataPoSubListLine: upDataPoSubListLine,
            feeEstimatedCos: feeEstimatedCos,
            fee_ar_to: fee_ar_to,
            feeApportion: feeApportion,
            workOrderAssembly: workOrderAssembly,
            tcFeePoCreate: tcFeePoCreate,
            saveRecord: saveRecord,
            feeApportionSj: feeApportionSj,
            wlRm: wlRm,
            hideRecmachSublistUI_SAFE: hideRecmachSublistUI_SAFE,
            poZfCy: poZfCy,
            validateDelete: validateDelete,
            fee_po_sp: fee_po_sp,
            onClickFeePoCreate: onClickFeePoCreate,
            fee_ar_to_db: fee_ar_to_db,
            onClickReapply: onClickReapply,
            differentialBillingCompleted: differentialBillingCompleted,
            differentialBillingCompleted_hw: differentialBillingCompleted_hw,
            differentialBillingCompleted_hw_actual: differentialBillingCompleted_hw_actual,
            onClickApproveOk: onClickApproveOk,
            poToIf: poToIf,
            supplierShippedCn: supplierShippedCn,
            fee_po_sp_tc: fee_po_sp_tc,
            customsDeclared: customsDeclared,
            clearedCustoms: clearedCustoms,
            onClickInOutCreate: onClickInOutCreate,
            onClickInOutCreate_hw: onClickInOutCreate_hw,
            onClickFeePoCreate_hw: onClickFeePoCreate_hw,
            onClickApproveOk_hw: onClickApproveOk_hw,
            onClickReapply_hw: onClickReapply_hw,
            feeApportionSjWc: feeApportionSjWc
        };
    });
