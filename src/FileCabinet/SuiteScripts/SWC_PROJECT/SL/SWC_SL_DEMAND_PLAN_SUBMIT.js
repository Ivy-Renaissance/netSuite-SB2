/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @description 备货计划批量计算修正2、批量提交复核
 */
define(["N/ui/message", "N/search", 'N/record', 'N/ui/serverWidget', "N/ui/dialog", 'N/task', 'N/runtime', 'N/file', 'N/format', 'N/url'],
    /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{task} task
 */
    (message, search, record, serverWidget, dialog, task, runtime, file, format, url) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            var request = scriptContext.request;
            var response = scriptContext.response;
            var method = request.method;
            if (method == 'GET') {

                var parameters = request.parameters;
                var action = parameters.action;
                if (!action) {
                    var form = initUI(request);
                    response.writePage(form);
                } else if (action == 'search') {// 查询
                    var form = initUI(request);
                    log.debug('onRequest - parameters', parameters);
                    doSearch(parameters, form, parameters.nowPage,
                        parameters.pageSize);
                    response.writePage(form);
                } else if (action == 'calculateCorrection') {// 计算修正2
                    submitRequest(request, response);
                } else if (action == 'submitReview') {// 提交复核
                    submitRequest(request, response);
                }
            }
        }
        /**
             * 提交请求，刷新进度
             * 
             * @param request
             * @param response
             * @returns
             */
        function submitRequest(request, response) {
            var form = initUI(request);
            try {
                // ajax执行map/reduce，返回taskId
                var taskId = request.parameters.taskId;
                form = showProgress(form, taskId);
                response.writePage(form);
            } catch (e) {
                form = showProgress(form, null, e);
                response.writePage(form);

            }
        }

        /**
         * 初始化页面
         * 
         * @param form
         * @returns
         */
        function initUI(request) {

            var form = serverWidget.createForm({
                title: '备货计划处理平台'
            });

            form.addResetButton({
                label: '重置'
            });

            form.addButton({
                id: 'custpage_search_btn', label: '搜索',
                functionName: 'doSearch()'
            });
            /*
             * form.addButton({ id : 'custpage_search_btn', label : '全选',
             * functionName : 'selectAll()' });
             */
            form.addButton({
                id: 'custpage_btn_calculate', label: '计算修正2',
                functionName: 'calculateCorrection()'
            });
            form.addButton({
                id: 'custpage_btn_submit', label: '提交复核',
                functionName: 'submitReview()'
            });
            form.clientScriptModulePath = '../CS/SWC_CS_DEMAND_PLAN_SUBMIT';

            // 初始化分页相关的字段、按钮
            initPageChoose(request, form, 'N', 'custpage_demand_sublist');

            if (request.parameters.action != 'calculateCorrection' && request.parameters.action != 'submitReview') {
                initSublist(form);
            }

            return form;
        }
        function doSearch(parameters, form, nowPage, pageSizeParam) {
            var sublist = form.getSublist({ id: 'custpage_demand_sublist' });
            var lineNum = 0;

            var filterArray = getFilters(parameters);
            log.debug('filterArray', filterArray);
            var searchObj = search.create({
                type: 'customrecord_swc_demand_plan',
                filters: filterArray,
                columns: [
                    { name: 'internalid' },//备货编码
                    { name: 'custentity_swc_platform', join: 'custrecord_swc_dp_store' },//平台
                    { name: 'custrecord_swc_dp_store' },//店铺
                    { name: 'custrecord_swc_dp_sku' },//SKU
                    { name: 'custitem_swc_ejlm', join: 'custrecord_swc_dp_sku' },//二级类目
                    { name: 'custrecord_swc_dp_location_type' },//仓库属性
                    { name: 'custrecord_swc_dp_country' },//国家/地区
                    { name: 'custrecord_swc_dp_forcast_total' },//总需求
                    { name: 'custrecord_swc_dp_inventory' },//在库在产在途
                    { name: 'custrecord_swc_dp_inventory_status' },//库存状态
                    { name: 'custrecord_swc_dp_estimated_quantity' },//预估总销量
                    { name: 'custrecord_swc_dp_min_order_qty' },//起订量
                    { name: 'custrecord_swc_dp_sku_level' },//SKU等级
                    { name: 'custrecord_swc_dp_special_modification' },//特殊修改
                    { name: 'custrecord_swc_dp_quantity' },//PMC审批备货
                    { name: 'custrecord_swc_dp_pmc_memo' },//PMC备注
                    { name: 'custrecord_swc_dp_status' },//状态
                    { name: 'custrecord_swc_dp_system_recommendation' },//沟通方向
                    { name: 'custrecord_swc_dp_batch' },//备货批次
                    { name: 'custrecord_swc_dp_pmc_memo' },//复核备注//TODO
                    { name: 'custrecord_swc_dp_applicant' },//创建人
                    { name: 'custrecord_swc_dp_applicant' },//待审批人//TODO
                    { name: 'custrecord_swc_dp_applicant' },//计划部负责人//TODO
                    { name: 'created', sort: 'DESC' },//创建时间
                    { name: 'custrecord_swc_dp_review' },//复核单

                ]
            });
            // searchObj.filters = filterArray;
            // 每页数量:5-1000，默认50
            var myPagedData = searchObj.runPaged({
                pageSize: 1000
            });
            /*  总数据量  */
            var totalCount = myPagedData.count;
            /*  总页数  */
            var pageCount = myPagedData.pageRanges.length;
            log.debug('总数 : 页数', totalCount + " : " + pageCount);
            // 结果大于0
            if (myPagedData.count) {
                for (var index = 0; index < pageCount; index++) {
                    var myPage = myPagedData.fetch({
                        index: index
                    });
                    myPage.data.forEach(function (rec) {
                        log.debug('result', rec);
                        sublist.setSublistValue({ id: 'custpage_internalid', line: lineNum, value: rec.getValue('internalid') });
                        sublist.setSublistValue({ id: 'custpage_line_demand', line: lineNum, value: rec.getValue('internalid') });
                        // rec.getValue(rec.columns[1]) && sublist.setSublistValue({ id: 'custpage_line_platform', line: lineNum, value: rec.getValue(rec.columns[1]) });
                        rec.getValue(rec.columns[2]) && sublist.setSublistValue({ id: 'custpage_line_store', line: lineNum, value: rec.getValue(rec.columns[2]) });
                        rec.getValue(rec.columns[3]) && sublist.setSublistValue({ id: 'custpage_line_sku', line: lineNum, value: rec.getValue(rec.columns[3]) });
                        rec.getValue(rec.columns[4]) && sublist.setSublistValue({ id: 'custpage_line_ejlm', line: lineNum, value: rec.getValue(rec.columns[4]) });
                        rec.getValue(rec.columns[5]) && sublist.setSublistValue({ id: 'custpage_line_location_type', line: lineNum, value: rec.getValue(rec.columns[5]) });
                        rec.getValue(rec.columns[6]) && sublist.setSublistValue({ id: 'custpage_line_country', line: lineNum, value: rec.getValue(rec.columns[6]) });
                        rec.getValue(rec.columns[7]) && sublist.setSublistValue({ id: 'custpage_line_forcast_total', line: lineNum, value: rec.getValue(rec.columns[7]) });
                        rec.getValue(rec.columns[8]) && sublist.setSublistValue({ id: 'custpage_line_inventory', line: lineNum, value: rec.getValue(rec.columns[8]) });
                        rec.getValue(rec.columns[9]) && sublist.setSublistValue({ id: 'custpage_line_inventory_status', line: lineNum, value: rec.getValue(rec.columns[9]) });
                        rec.getValue(rec.columns[10]) && sublist.setSublistValue({ id: 'custpage_line_estimated_quantity', line: lineNum, value: rec.getValue(rec.columns[10]) });
                        rec.getValue(rec.columns[11]) && sublist.setSublistValue({ id: 'custpage_line_min_order_qty', line: lineNum, value: rec.getValue(rec.columns[11]) });
                        rec.getValue(rec.columns[12]) && sublist.setSublistValue({ id: 'custpage_line_level', line: lineNum, value: rec.getValue(rec.columns[12]) });
                        rec.getValue(rec.columns[13]) && sublist.setSublistValue({ id: 'custpage_line_special_modification', line: lineNum, value: rec.getValue(rec.columns[13]) });
                        rec.getValue(rec.columns[14]) && sublist.setSublistValue({ id: 'custpage_line_quantity', line: lineNum, value: rec.getValue(rec.columns[14]) });
                        rec.getValue(rec.columns[14]) && sublist.setSublistValue({ id: 'custpage_line_quantity_', line: lineNum, value: rec.getValue(rec.columns[14]) });
                        rec.getValue(rec.columns[15]) && sublist.setSublistValue({ id: 'custpage_line_pmc_memo', line: lineNum, value: rec.getValue(rec.columns[15]) });
                        rec.getValue(rec.columns[16]) && sublist.setSublistValue({ id: 'custpage_line_status', line: lineNum, value: rec.getValue(rec.columns[16]) });
                        rec.getValue(rec.columns[17]) && sublist.setSublistValue({ id: 'custpage_line_recommendation', line: lineNum, value: rec.getValue(rec.columns[17]) });
                        rec.getValue(rec.columns[18]) && sublist.setSublistValue({ id: 'custpage_line_batch', line: lineNum, value: rec.getValue(rec.columns[18]) });
                        rec.getValue(rec.columns[19]) && sublist.setSublistValue({ id: 'custpage_line_recheck_memo', line: lineNum, value: rec.getValue(rec.columns[19]) });
                        rec.getValue(rec.columns[20]) && sublist.setSublistValue({ id: 'custpage_line_owner', line: lineNum, value: rec.getValue(rec.columns[20]) });
                        rec.getValue(rec.columns[21]) && sublist.setSublistValue({ id: 'custpage_line_approver', line: lineNum, value: rec.getValue(rec.columns[21]) });
                        rec.getValue(rec.columns[22]) && sublist.setSublistValue({ id: 'custpage_line_planer', line: lineNum, value: rec.getValue(rec.columns[22]) });
                        rec.getValue(rec.columns[23]) && sublist.setSublistValue({ id: 'custpage_line_createdate', line: lineNum, value: rec.getValue(rec.columns[23]) });
                        rec.getValue(rec.columns[24]) && sublist.setSublistValue({ id: 'custpage_line_review', line: lineNum, value: rec.getValue(rec.columns[24]) });
                        lineNum++;
                    });

                }

            }

        }

        /**
         * 显示运行进度
         * 
         * @param form
         *            表单
         * @param taskId
         *            map/reduce执行id
         * @param errMsg
         *            错误信息
         * @returns
         */
        function showProgress(form, taskId, errMsg) {

            form.addFieldGroup({ id: 'custpage_progress_group', label: '运行进度' });

            var progress = form.addField({ id: 'custpage_progress', type: 'inlinehtml', label: "label", container: 'custpage_progress_group' });
            progress.updateDisplayType({
                displayType: 'inline'
            });
            progress.updateDisplaySize({
                height: 25,
                width: 200
            });
            progress.updateLayoutType({
                layoutType: serverWidget.FieldLayoutType.NORMAL
            });

            if (errMsg) {
                progress.defaultValue = '<div id="reportProgress" '
                    + 'style="margin-top:15px;font-size:14px;color:red;font-weight:bold;">'
                    + errMsg + '</div>';
            } else {
                progress.defaultValue = '<div id="reportProgress" style="margin-top:15px;font-size:14px;color:#4d5f79;font-weight:bold;">'
                    + '正在刷新进度，请勿刷新界面...</div>';
                var rtpTaskId = form.addField({
                    id: 'custpage_rtp_task_id',
                    type: 'text',
                    label: "rtpTaskId"
                });
                rtpTaskId.updateDisplayType({
                    displayType: 'hidden'
                });
                rtpTaskId.defaultValue = taskId;
            }
            return form;
        }

        /**
         * 初始化子列表
         * 
         * @param form
         * @returns
         */
        function initSublist(form) {
            var sublist = form.addSublist({ id: 'custpage_demand_sublist', label: '备货计划列表', type: serverWidget.SublistType.LIST });
            sublist.addMarkAllButtons();
            sublist.addField({ id: 'custpage_checkbox', type: serverWidget.FieldType.CHECKBOX, label: '选择' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.NORMAL });
            sublist.addField({ id: 'custpage_internalid', type: serverWidget.FieldType.TEXT, label: '内部ID' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
            sublist.addField({ id: 'custpage_line_demand', type: serverWidget.FieldType.SELECT, source: 'customrecord_swc_demand_plan', label: '备货编码' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            // sublist.addField({ id: 'custpage_line_platform', type: serverWidget.FieldType.TEXT, label: '平台' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_store', type: serverWidget.FieldType.SELECT, source: '-2', label: '备货维度' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_sku', type: serverWidget.FieldType.SELECT, source: '-10', label: 'SKU' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_ejlm', type: serverWidget.FieldType.SELECT, source: 'customrecord_swc_ejlm', label: '二级类目' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_location_type', type: serverWidget.FieldType.SELECT, source: 'customlist_swc_dp_location_type', label: '仓库属性' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_country', type: serverWidget.FieldType.SELECT, source: 'customlist_swc_dp_country', label: '国家/地区' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_forcast_total', type: serverWidget.FieldType.FLOAT, label: '总需求' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_inventory', type: serverWidget.FieldType.FLOAT, label: '在库在产在途' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_inventory_status', type: serverWidget.FieldType.SELECT, source: 'customlist_swc_sku_inventory_status', label: '库存状态' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_estimated_quantity', type: serverWidget.FieldType.FLOAT, label: '预估总销量' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_min_order_qty', type: serverWidget.FieldType.FLOAT, label: '起订量' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_level', type: serverWidget.FieldType.SELECT, source: 'customrecord_swc_sku_level_enum', label: 'SKU等级' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_special_modification', type: serverWidget.FieldType.FLOAT, label: '特殊修改' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_quantity', type: serverWidget.FieldType.FLOAT, label: 'PMC审批备货' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
            sublist.addField({ id: 'custpage_line_pmc_memo', type: serverWidget.FieldType.TEXT, label: 'PMC备注' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_status', type: serverWidget.FieldType.SELECT, source: 'customlist_swc_dp_approval_status', label: '状态' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_recommendation', type: serverWidget.FieldType.TEXT, label: '沟通方向' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_batch', type: serverWidget.FieldType.SELECT, source: 'customlist_swc_dp_batch', label: '备货批次' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_recheck_memo', type: serverWidget.FieldType.TEXT, label: '复核备注' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_owner', type: serverWidget.FieldType.SELECT, source: '-4', label: '创建人' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_approver', type: serverWidget.FieldType.SELECT, source: '-4', label: '待审批人' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_planer', type: serverWidget.FieldType.SELECT, source: '-4', label: '计划部负责人' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_createdate', type: serverWidget.FieldType.TEXT, label: '创建时间' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            sublist.addField({ id: 'custpage_line_review', type: serverWidget.FieldType.SELECT, source: 'customrecord_swc_demand_plan_review', label: '复核单' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
            sublist.addField({ id: 'custpage_line_quantity_', type: serverWidget.FieldType.FLOAT, label: 'PMC审批备货' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            return form;

        }

        /**
         * 初始化页面选择字段
         * 
         * @param form
         * @param hidePageSelect
         *            是否隐藏数据选择select
         * @returns
         */
        function initPageChoose(request, form, hidePageSelect, sublistId) {
            // 字段组
            form.addFieldGroup({ id: 'custpage_select_group', label: '筛选条件' });
            // form.addFieldGroup({ id: 'custpage_page_group', label: '分页信息' });
            form.addFieldGroup({ id: 'custpage_price_group', label: '产品信息' });
            form.addField({ id: 'custpage_platform', type: serverWidget.FieldType.SELECT, source: '-2', label: '备货维度', container: 'custpage_select_group' });
            form.addField({ id: 'custpage_sku', type: serverWidget.FieldType.SELECT, source: '-10', label: 'SKU', container: 'custpage_select_group' });
            form.addField({ id: 'custpage_internalid', type: serverWidget.FieldType.TEXT, label: '备货编号（多个以英文逗号隔开）', container: 'custpage_select_group' });
            form.addField({ id: 'custpage_ejlm', type: serverWidget.FieldType.SELECT, source: 'customrecord_swc_ejlm', label: '二级类目', container: 'custpage_select_group' });
            form.addField({ id: 'custpage_location_type', type: serverWidget.FieldType.SELECT, source: 'customlist_swc_dp_location_type', label: '仓库', container: 'custpage_select_group' });
            form.addField({ id: 'custpage_country', type: serverWidget.FieldType.SELECT, source: 'customlist_swc_dp_country', label: '国家', container: 'custpage_select_group' });
            form.addField({ id: 'custpage_recommendation', type: serverWidget.FieldType.TEXT, label: '沟通方向', container: 'custpage_select_group' });//TODO:
            form.addField({ id: 'custpage_status', type: serverWidget.FieldType.SELECT, source: 'customlist_swc_dp_approval_status', label: '状态', container: 'custpage_select_group' });//TODO:
            form.addField({ id: 'custpage_owner', type: serverWidget.FieldType.SELECT, source: '-4', label: '申请人', container: 'custpage_select_group' });
            form.addField({ id: 'custpage_planer', type: serverWidget.FieldType.SELECT, source: '-4', label: '计划部负责人', container: 'custpage_select_group' });
            form.addField({ id: 'custpage_approver', type: serverWidget.FieldType.SELECT, source: '-4', label: '待审批人', container: 'custpage_select_group' });
            form.addField({ id: 'custpage_batch', type: serverWidget.FieldType.SELECT, source: 'customlist_swc_dp_batch', label: '备货批次', container: 'custpage_select_group' });
            form.addField({ id: 'custpage_begin', type: serverWidget.FieldType.DATE, label: '开始日期', container: 'custpage_select_group' });
            form.addField({ id: 'custpage_end', type: serverWidget.FieldType.DATE, label: '结束日期', container: 'custpage_select_group' });
            form.addField({ id: 'custpage_reviewed', type: serverWidget.FieldType.CHECKBOX, label: '仅搜索未复核单据', container: 'custpage_select_group' });
            form.addField({ id: 'custpage_calculated', type: serverWidget.FieldType.CHECKBOX, label: '仅搜索未计算修正2单据', container: 'custpage_select_group' });

            // 查询字段默认值
            var fields = ['platform', 'sku', 'internalid', 'ejlm', 'location_type', 'country', 'recommendation', 'status', 'owner', 'planer', 'approver', 'batch', 'begin', 'end', 'reviewed', 'calculated'];
            for (var i in fields) {
                var param = request.parameters[fields[i]];
                if (param) {
                    form.getField({
                        id: 'custpage_' + fields[i]
                    }).defaultValue = param;
                }
            }
            // form.addFieldGroup({ id: 'custpage_page_group', label: '数据选择' });
            // if (hidePageSelect != 'Y') {
            //     form.addField({ id: 'custpage_select_page', type: serverWidget.FieldType.SELECT, label: '数据选择', container: 'custpage_page_group' });
            // }
            // form.addField({ id: 'custpage_total_count', type: serverWidget.FieldType.TEXT, label: '总行数', container: 'custpage_page_group' }).updateDisplaySize({ width: 40, height: 10 }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE }).updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });
            // form.addField({ id: 'custpage_total_page', type: serverWidget.FieldType.INTEGER, label: '总页数', container: 'custpage_page_group' }).updateDisplaySize({ width: 40, height: 10 }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN })
            // form.addField({ id: 'custpage_page_size', type: serverWidget.FieldType.SELECT, label: '每页条数', container: 'custpage_page_group' }).updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });
            // form.addField({ id: 'custpage_now_page', type: serverWidget.FieldType.INTEGER, label: '当前页', container: 'custpage_page_group' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN })
            // form.addField({ id: 'custpage_now_total_page', type: serverWidget.FieldType.TEXT, label: '当前页/总页数', container: 'custpage_page_group' }).updateDisplaySize({ width: 10, height: 10 }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE }).updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });
        }

        /**
         * 查询条件
         * 
         * @param parameters
         *            url参数
         * @returns filters 过滤条件
         */
        function getFilters(parameters) {
            log.debug('getFilters parameters', parameters);
            var filters = [];
            // 查询字段默认值
            var fields = ['platform', 'sku', 'internalid', 'ejlm', 'location_type', 'country', 'recommendation', 'status', 'owner', 'planer', 'approver', 'batch', 'begin', 'end', 'reviewed', 'calculated'];
            columns: [
                { name: 'internalid' },//备货编码
                { name: 'custentity_swc_platform', join: 'custrecord_swc_dp_store' },//平台
                { name: 'custrecord_swc_dp_store' },//店铺
                { name: 'custrecord_swc_dp_sku' },//SKU
                { name: 'custitem_swc_ejlm', join: 'custrecord_swc_dp_sku' },//二级类目
                { name: 'custrecord_swc_dp_location_type' },//仓库属性
                { name: 'custrecord_swc_dp_country' },//国家/地区
                { name: 'custrecord_swc_dp_forcast_total' },//总需求
                { name: 'custrecord_swc_dp_inventory' },//在库在产在途
                { name: 'custrecord_swc_dp_inventory_status' },//库存状态
                { name: 'custrecord_swc_dp_estimated_quantity' },//预估总销量
                { name: 'custrecord_swc_dp_min_order_qty' },//起订量
                { name: 'custrecord_swc_dp_sku_level' },//SKU等级
                { name: 'custrecord_swc_dp_special_modification' },//特殊修改
                { name: 'custrecord_swc_dp_quantity' },//PMC审批备货
                { name: 'custrecord_swc_dp_pmc_memo' },//PMC备注
                { name: 'custrecord_swc_dp_status' },//状态
                { name: 'custrecord_swc_dp_system_recommendation' },//沟通方向
                { name: 'custrecord_swc_dp_batch' },//备货批次
                { name: 'custrecord_swc_dp_pmc_memo' },//复核备注//TODO
                { name: 'custrecord_swc_dp_applicant' },//创建人
                { name: 'custrecord_swc_dp_applicant' },//待审批人//TODO
                { name: 'custrecord_swc_dp_applicant' },//计划部负责人//TODO
                { name: 'created' }//创建时间

            ]

            // 备货维度
            if (parameters.platform) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_dp_store', 'is', parameters.platform])
            }
            // sku
            if (parameters.sku) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_dp_sku', 'is', parameters.sku])
            }
            // ejlm
            if (parameters.ejlm) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_dp_sku.custitem_swc_ejlm', 'is', parameters.ejlm])
            }
            // 仓库类型
            if (parameters.location_type) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_dp_location_type', 'is', parameters.location_type])
            }
            // 国家
            if (parameters.country) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_dp_country', 'is', parameters.country])
            }
            // 沟通方向
            if (parameters.recommendation) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_dp_system_recommendation', 'is', parameters.recommendation])
            }
            // 状态
            if (parameters.status) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_dp_status', 'is', parameters.status])
            }
            // 申请人
            if (parameters.owner) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_dp_applicant', 'is', parameters.owner])
            }
            //TODO 
            // // 计划员
            // if (parameters.planer) {
            //     if (filters.length > 0) {
            //         filters.push('and')
            //     }
            //     filters.push(['custrecord_swc_dp_planer', 'is', parameters.planer])
            // }
            // 审批人
            // if (parameters.approver) {
            //     if (filters.length > 0) {
            //         filters.push('and')
            //     }
            //     filters.push(['custrecord_swc_dp_approver', 'is', parameters.approver])
            // }
            // 国家
            if (parameters.batch) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_dp_batch', 'is', parameters.batch])
            }
            // 开始时间
            if (parameters.begin) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_dp_applicant_date', 'onorafter', parameters.begin])
            }
            // 结束时间
            if (parameters.end) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_dp_applicant_date', 'onorbefore', parameters.end])
            }
            // 仅搜索未复核单
            if (parameters.reviewed) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_dp_quantity', 'greaterthan', 0])
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_dp_review', 'anyof', '@NONE@'])
            }
            // 仅搜索未复核单
            if (parameters.calculated) {
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(['custrecord_swc_dp_correction2_date', 'isempty', ''])
            }

            // 备货编码
            if (parameters.internalid) {
                var model_filter = [];
                var modles = parameters.internalid.split(',')
                for (var index = 0; index < modles.length; index++) {
                    var element = modles[index];
                    if (element) {
                        if (model_filter.length > 0) {
                            model_filter.push('or')
                        }
                        model_filter.push(['idtext', 'is', element])
                    }

                }
                if (filters.length > 0) {
                    filters.push('and')
                }
                filters.push(model_filter);
                // filters.push(search.createFilter({
                // 	name : 'custitem1',
                // 	operator : search.Operator.IS,
                // 	values : parameters.modle
                // }));
            }
            log.debug('sousuo filters', filters)
            return filters;
        }

        return { onRequest }

    });
