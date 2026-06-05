/**
 * 物流计划
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/search', 'N/ui/serverWidget', 'N/runtime', 'N/redirect', 'N/task', 'N/url', '../common/SWC_CONFIG_DATA'],
    function (search, serverWidget, runtime, redirect, task, url, SWC_CONFIG_DATA) {
        var CONFIG = SWC_CONFIG_DATA.configData();

        function onRequest(context) {
            if (context.request.method === 'GET') {
                var form = createform(context);
                form = setFormValue(form, context);
                context.response.writePage(form);
            } else {
                deliveryNotice(context);
            }
        }

        // 创建 Form
        function createform(context) {
            var form = serverWidget.createForm({
                title: translate('物流计划平台')
            });

            // 仍然使用原 ClientScript（请把该文件替换为我下面提供的 nopaging 版本）
            form.clientScriptModulePath = CONFIG.CLIENT_SCRIPT_PATH_LP_LOGSISTICPLAN;

            // 螢幕遮罩
            var hidden_field = form.addField({
                id: 'hidden_info',
                type: serverWidget.FieldType.INLINEHTML,
                label: translate('螢幕遮罩')
            });
            hidden_field.defaultValue =
                '<div id="timeoutblocker" style="position:absolute; z-index:10000; top:0; left:0; height:100%; width:100%; margin:5px 0; background-color:rgb(155,155,155); opacity:0.6;">' +
                '<span style="width:100%;height:100%;line-height:700px;text-align:center;display:block;font-weight:bold;color:#ff0900">加載中，請稍候 ... </span>' +
                '</div>';

            form.addSubmitButton({ label: translate('提交') });
            form.addButton({ id: 'search', label: translate('查询'), functionName: 'search' });

            form.addFieldGroup({ id: 'sublist_group', label: translate('子列表') });
            form.addFieldGroup({ id: 'search_group', label: translate('搜索条件') });

            // 搜索字段（保持原始字段）
            var fieldList = [
                { id: 'search_vendor', label: '供应商', type: serverWidget.FieldType.SELECT, group: 'search_group', source: 'vendor' },
                { id: 'search_po_id', label: 'PO单号', type: serverWidget.FieldType.MULTISELECT, group: 'search_group', source: 'purchaseorder' },
                { id: 'search_actual_cabinet', label: '排柜单号', type: serverWidget.FieldType.TEXT, group: 'search_group' }
            ];

            for (var i = 0; i < fieldList.length; i++) {
                var one = fieldList[i];
                var f = form.addField({
                    id: one.id,
                    type: one.type,
                    label: translate(one.label),
                    container: one.group,
                    source: one.source
                });
                if (context.request.parameters[one.id]) {
                    f.defaultValue = context.request.parameters[one.id];
                }
            }

            // 选中数据隐藏域：ClientScript 在保存前写 JSON
            var selectedJson = form.addField({
                id: 'custpage_selected_json',
                type: serverWidget.FieldType.LONGTEXT,
                label: ' '
            });
            selectedJson.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            // 子列表
            var info_sublist = form.addSublist({
                id: 'info_list',
                type: serverWidget.SublistType.LIST,
                label: translate('明细表'),
                tab: 'sublist_group'
            });

            info_sublist.addButton({ id: 'select_all', label: translate('全选'), functionName: 'selectAll()' });
            info_sublist.addButton({ id: 'unselect_all', label: translate('取消全选'), functionName: 'unselectAll()' });

            // // 已标记 X 条（ClientScript 会动态改文本）
            // var showRunLableButton = info_sublist.addButton({
            //     id: 'show_run_lable',
            //     label: translate('已标记0条'),
            //     functionName: ''
            // });
            // showRunLableButton.isDisabled = true;

            info_sublist.addField({
                id: 'sublist_select',
                label: translate('选择'),
                type: serverWidget.FieldType.CHECKBOX
            });

            // 列定义（保持原始列）
            var labelList = [
                { tp: "2", label: "内码", id: "main_internalid" },
                { tp: "1", label: "No.", id: "line_no" },
                { tp: "2", label: "采购订单编号", id: "po_id" },
                { tp: "1", label: "采购订单编号", id: "po_name" },
                { tp: "1", label: "货品", id: "item_name" },
                { tp: "2", label: "NS货品", id: "item_id" },
                { tp: "1", label: "公司SKU", id: "item_id_name" },
                { tp: "2", label: "供应商id", id: "vendor_id" },
                { tp: "1", label: "供应商", id: "vendor_name" },
                { tp: "1", label: "单个包装体积(CBM)", id: "individual_volume" },
                // { tp: "1", label: "产品等级", id: "product_grade_name" },
                // { tp: "2", label: "产品等级", id: "product_grade" },
                { tp: "2", label: "BOM版本", id: "bom_version" },
                { tp: "1", label: "BOM版本", id: "bom_version_name" },
                { tp: "1", label: "国家", id: "country_name" },
                { tp: "2", label: "国家", id: "country" },
                { tp: "2", label: "仓库类型", id: "location_type" },
                { tp: "1", label: "仓库类型", id: "location_type_name" },
                { tp: "1", label: "区域", id: "region_name" },
                { tp: "2", label: "区域", id: "region" },
                { tp: "1", label: "采购订单数量", id: "po_qty" },
                { tp: "2", label: "已出运数量", id: "shipped_qty" },
                { tp: "2", label: "未出运数量", id: "un_shipped_qty" },
                { tp: "1", label: "排柜数量", id: "num_ca" },
                { tp: "1", label: "剩余可发运数量", id: "num_ca_sy" },
                { tp: "1", label: "已发运优等品数量", id: "superior_qty" },
                { tp: "1", label: "已发运良品数量", id: "good_qty" },
                { tp: "12", label: "本次真实发运优等品数量", id: "superior_qty_wl" },
                { tp: "12", label: "本次真实发运良品数量", id: "good_qty_wl" }
            ];

            for (var j = 0; j < labelList.length; j++) {
                var col = labelList[j];

                if (col.tp === "1" || col.tp === "3") {
                    info_sublist.addField({
                        id: 'custpage_' + col.id,
                        label: translate(col.label),
                        type: serverWidget.FieldType.TEXT
                    });
                } else if (col.tp === "2") {
                    info_sublist.addField({
                        id: 'custpage_' + col.id,
                        label: translate(col.label),
                        type: serverWidget.FieldType.TEXT
                    }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                } else if (col.tp === "12") {
                    info_sublist.addField({
                        id: 'custpage_' + col.id,
                        label: translate(col.label),
                        type: serverWidget.FieldType.INTEGER
                    }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                }
            }

            return form;
        }

        // 关键改动：首次进入页面（无任何查询条件）不展示任何数据
        function setFormValue(form, context) {
            var p = context.request.parameters || {};
            var hasCriteria = !!(p.search_vendor || p.search_po_id || p.search_actual_cabinet);
            if (!hasCriteria) {
                return form;
            }

            var sublist = form.getSublist('info_list');
            var actual_cabinet_search = initSearch(p);

            // 不分页：最多取 1000 行（如需更多可以改）
            var rs = actual_cabinet_search.run().getRange({ start: 0, end: 1000 }) || [];

            var setSubFieldMappingValue = {
                custpage_po_id: 'custrecord_swc_acd_po_id',
                custpage_item_id: 'custrecord_swc_acd_item',
                custpage_item_id_name: 'custrecord_swc_acd_item.displayname',
                custpage_vendor_id: 'custrecord_swc_acd_vendor',
                custpage_individual_volume: 'custrecord_swc_acd_volume',
                // custpage_product_grade: 'custrecord_swc_acd_product_grade',
                custpage_bom_version: 'custrecord_swc_acd_bom',
                custpage_country: 'custrecord_swc_acd_country',
                custpage_location_type: 'custrecord_swc_acd_warehouse_type',
                custpage_region: 'custrecord_swc_acd_region',
                custpage_po_qty: 'custrecord_swc_acd_po_quantity',
                custpage_shipped_qty: 'custrecord_swc_acd_if_quantity',
                custpage_un_shipped_qty: 'custrecordswc_acd_nif_quantity',
                custpage_num_ca: 'custrecord_swc_acd_zs_qty',
                custpage_superior_qty: 'custrecord_swc_acd_quantity_excellent',
                custpage_good_qty: 'custrecord_swc_ecd_quantity_fine',
                // custpage_good_qty_wl: 'custrecord_swc_ecd_quantity_fine'
            };

            var setSubFieldMappingText = {
                custpage_po_name: 'custrecord_swc_acd_po_id',
                custpage_item_name: 'custrecord_swc_acd_item',
                custpage_vendor_name: 'custrecord_swc_acd_vendor',
                // custpage_product_grade_name: 'custrecord_swc_acd_product_grade',
                custpage_country_name: 'custrecord_swc_acd_country',
                custpage_region_name: 'custrecord_swc_acd_region',
                custpage_bom_version_name: 'custrecord_swc_acd_bom',
                custpage_location_type_name: 'custrecord_swc_acd_warehouse_type'
            };

            for (var line = 0; line < rs.length; line++) {
                var data = rs[line];

                sublist.setSublistValue({ id: 'custpage_line_no', line: line, value: String(line + 1) });
                sublist.setSublistValue({ id: 'custpage_main_internalid', line: line, value: String(data.getValue('internalid') || '') });

                // 初始默认 0
                sublist.setSublistValue({ id: 'custpage_superior_qty_wl', line: line, value: 0 });
                sublist.setSublistValue({ id: 'custpage_good_qty_wl', line: line, value: 0 });



                var sQty = data.getValue('custrecord_swc_acd_quantity_excellent') || 0;
                var gQty = data.getValue('custrecord_swc_ecd_quantity_fine') || 0;
                var nc = data.getValue('custrecord_swc_acd_zs_qty') || 0;
                var syQty = Number(nc) - Number(gQty) - Number(sQty);
                sublist.setSublistValue({ id: 'custpage_num_ca_sy', line: line, value: syQty });

                for (var k in setSubFieldMappingValue) {
                    if (setSubFieldMappingValue.hasOwnProperty(k)) {

                        var v = data.getValue(setSubFieldMappingValue[k]);
                        if(k == 'custpage_item_id_name')
                            v = data.getValue({ name: "displayname", join:'custrecord_swc_acd_item'});
                        sublist.setSublistValue({ id: k, line: line, value: (v === null || v === undefined || v === '') ? ' ' : String(v) });
                    }
                }
                for (var t in setSubFieldMappingText) {
                    if (setSubFieldMappingText.hasOwnProperty(t)) {
                        var tx = data.getText(setSubFieldMappingText[t]);
                        sublist.setSublistValue({ id: t, line: line, value: (tx === null || tx === undefined || tx === '') ? ' ' : String(tx) });
                    }
                }
            }

            return form;
        }

        function initSearch(parameters) {
            var s = search.create({
                type: "customrecord_swc_actual_cabinet_detail",
                columns: [
                    search.createColumn({ name: "custrecord_swc_acd_no", label: "No" }),
                    search.createColumn({ name: "custrecord_swc_acd_po_id", label: "采购订单编号" }),
                    search.createColumn({ name: "custrecord_swc_acd_item", label: "货品" }),
                    search.createColumn({ name: "displayname", join:'custrecord_swc_acd_item', label: "货品名称" }),
                    search.createColumn({ name: "custrecord_swc_acd_vendor", label: "供应商" }),
                    search.createColumn({ name: "custrecord_swc_acd_volume", label: "包装体积" }),
                    // search.createColumn({ name: "custrecord_swc_acd_product_grade", label: "产品等级" }),
                    search.createColumn({ name: "custrecord_swc_acd_bom", label: "BOM版本" }),
                    search.createColumn({ name: "custrecord_swc_acd_country", label: "国家" }),
                    search.createColumn({ name: "custrecord_swc_acd_estimated_cabine_no", label: "预排柜单号" }),
                    search.createColumn({ name: "custrecord_swc_acd_warehouse_type", label: "仓库类型" }),
                    search.createColumn({ name: "custrecord_swc_acd_actual_cabinet_no", label: "排柜单号" }),
                    search.createColumn({ name: "custrecord_swc_acd_region", label: "区域" }),
                    search.createColumn({ name: "custrecord_swc_acd_po_quantity", label: "采购订单数量" }),
                    search.createColumn({ name: "custrecord_swc_acd_if_quantity", label: "已出运数量" }),
                    search.createColumn({ name: "custrecordswc_acd_nif_quantity", label: "未出运数量" }),
                    search.createColumn({ name: "custrecord_swc_acd_quantity", label: "预排柜数量" }),
                    search.createColumn({ name: "custrecord_swc_acd_quantity_excellent", label: "本次真实排柜优等品数量" }),
                    search.createColumn({ name: "custrecord_swc_ecd_quantity_fine", label: "本次真实排柜良品数量" }),
                    search.createColumn({ name: "internalid", label: "内部 ID" }),
                    search.createColumn({ name: "custrecord_swc_acd_zs_qty", label: "真实排柜数量" })
                ]
            });

            var filters = [];
            // 只查“剩余可发运数量 > 0”的数据（保持原逻辑）
            filters.push([
                "formulanumeric: TO_NUMBER(NVL({custrecord_swc_acd_zs_qty}, 0)) - TO_NUMBER(NVL({custrecord_swc_acd_quantity_excellent}, 0)) - TO_NUMBER(NVL({custrecord_swc_ecd_quantity_fine}, 0))",
                "greaterthan",
                "0"
            ]);

            filters.push('AND');
            filters.push(["custrecord_swc_acd_actual_cabinet.custrecord_swc_zspgd_state","anyof","3"]);

            if (parameters.search_vendor) {
                filters.push('AND');
                filters.push(["custrecord_swc_acd_vendor", "anyof", parameters.search_vendor]);
            }

            if (parameters.search_po_id) {
                var poIds = String(parameters.search_po_id).split(',');
                if (poIds.length > 1) {
                    var inner = [];
                    for (var i = 0; i < poIds.length; i++) {
                        if (inner.length > 0) inner.push('OR');
                        inner.push(['custrecord_swc_acd_po_id', 'anyof', poIds[i]]);
                    }
                    filters.push('AND');
                    filters.push(inner);
                } else {
                    filters.push('AND');
                    filters.push(['custrecord_swc_acd_po_id', 'anyof', poIds[0]]);
                }
            }

            if (parameters.search_actual_cabinet) {
                filters.push('AND');
                filters.push(["custrecord_swc_acd_actual_cabinet.idtext", "is", parameters.search_actual_cabinet]);
            }

            s.filterExpression = filters;
            return s;
        }

        function deliveryNotice(context) {
            try {
                var req = context.request;

                // ClientScript 会优先写入这个 JSON
                var selectedJson = req.parameters.custpage_selected_json || '[]';
                var dataArr = [];
                try {
                    dataArr = JSON.parse(selectedJson);
                    if (!Array.isArray(dataArr)) dataArr = [];
                } catch (e) {
                    dataArr = [];
                }

                // 兜底：如果没传 JSON，则从 sublist 勾选读取
                if (dataArr.length === 0) {
                    var count = req.getLineCount({ group: 'info_list' });
                    for (var i = 0; i < count; i++) {
                        var check = req.getSublistValue({ group: 'info_list', name: 'sublist_select', line: i });
                        if (check === 'T') {
                            var poId = req.getSublistValue({ group: 'info_list', name: 'custpage_po_id', line: i });
                            var country = req.getSublistValue({ group: 'info_list', name: 'custpage_country', line: i });
                            var location_type = req.getSublistValue({ group: 'info_list', name: 'custpage_location_type', line: i });
                            var region = req.getSublistValue({ group: 'info_list', name: 'custpage_region', line: i });
                            var item_id = req.getSublistValue({ group: 'info_list', name: 'custpage_item_id', line: i });
                            var superior_qty_wl = req.getSublistValue({ group: 'info_list', name: 'custpage_superior_qty_wl', line: i });
                            var good_qty_wl = req.getSublistValue({ group: 'info_list', name: 'custpage_good_qty_wl', line: i });
                            var num_ca_sy = req.getSublistValue({ group: 'info_list', name: 'custpage_num_ca_sy', line: i });

                            dataArr.push({
                                main_internalid: req.getSublistValue({ group: 'info_list', name: 'custpage_main_internalid', line: i }),
                                num_ca: req.getSublistValue({ group: 'info_list', name: 'custpage_num_ca', line: i }),
                                superior_qty_wl: superior_qty_wl,
                                good_qty_wl: good_qty_wl,
                                poId: poId,
                                country: country,
                                location_type: location_type,
                                region: region,
                                item_id: item_id,
                                num_ca_sy: num_ca_sy
                            });
                        }
                    }
                }

                if (dataArr.length > 0) {
                    var scriptTask = task.create({ taskType: task.TaskType.MAP_REDUCE });
                    scriptTask.scriptId = CONFIG.SCRIPT_ID_MR_WL_PLAN_ORDER;
                    scriptTask.deploymentId = CONFIG.DEPLOY_ID_MR_WL_PLAN_ORDER;
                    scriptTask.params = {
                        custscript_swc_wl_plan_order_ids: JSON.stringify(dataArr)
                    };
                    scriptTask.submit();

                    var linkParam = { sortcol: "dcreated", sortdir: "DESC", date: "TODAY", scripttype: '155', primarykey: '288' };
                    var linkUrl = url.resolveTaskLink({ id: "LIST_MAPREDUCESCRIPTSTATUS", params: linkParam });
                    redirect.redirect({ url: linkUrl });
                }
            } catch (e) {
                log.debug('deliveryNotice', e);
            }
        }

        function translate(str) {
            var langObj = { "採購訂單號": { EN: "PO Number", CN: '採購訂單號' } };
            var lang = runtime.getCurrentUser().getPreference({ name: "LANGUAGE" });
            lang = lang === 'zh_TW' ? "CN" : "EN";
            return langObj[str] ? langObj[str][lang] : str;
        }

        return { onRequest: onRequest };
    });
