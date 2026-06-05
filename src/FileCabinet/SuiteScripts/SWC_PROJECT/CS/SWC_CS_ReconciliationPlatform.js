/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
const SUBMIST_STATUS = "1";
const SUBMIST_STATUS_2 = "2";
define(['N/currentRecord', 'N/https', 'N/record', 'N/search', 'N/url',"../APP/SWC_APP_ReconciliationPlatform",'../common/MatchTool','N/ui/dialog'],

    function(currentRecord, https, record, search, url,app,MatchTool,dialog) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            let curRec = scriptContext.currentRecord;
            // var sublistId = scriptContext.sublistId;
            // let fieldId = scriptContext.fieldId;
            curRec.setValue({
                fieldId: 'custpage_reconciliation_date',
                value: new Date()
            })
            let selected = curRec.getValue({fieldId: "custpage_selected"});
            console.log('开始',selected);
            init();
            log.audit('scriptContext.mode',scriptContext.mode);
            let oDiv = document.getElementById("timeoutblocker");
            oDiv.style.display = "none";


            var labelSpan = document.querySelector('#custpage_type_fs_lbl');
            if (labelSpan) {
                var aTag = labelSpan.querySelector('a');
                if (aTag) {
                    aTag.innerHTML = aTag.innerHTML.replace(/\*/g, '<span style="color:red;">*</span>');
                }
            }

            var labelSpan = document.querySelector('#custpage_departments_fs_lbl');
            if (labelSpan) {
                var aTag = labelSpan.querySelector('a');
                if (aTag) {
                    aTag.innerHTML = aTag.innerHTML.replace(/\*/g, '<span style="color:red;">*</span>');
                }
            }
            //选择框 设置已选择
            // let sublistId = "custpage_sublist_detail";
            // let count = curRec.getLineCount(sublistId);
            // if (selected != '' && selected != undefined) {
            //     selected = JSON.parse(selected);
            //     if (Object.keys(selected).length > 0) {
            //         for (let i = 0;i < count;i++) {
            //             curRec.selectLine({sublistId, line: i});
            //             var invoice = curRec.getCurrentSublistValue(
            //                 {sublistId, fieldId: "custpage_sublist_invoice_number_hide"})
            //             var endKey = curRec.getCurrentSublistValue(
            //                 {sublistId, fieldId: "custpage_sublist_orderkey_end_hide"}) || '';
            //             var uniqueKey = invoice + '_' + endKey;
            //             console.log('uniqueKey',uniqueKey);
            //             if (uniqueKey in selected)
            //                 curRec.setCurrentSublistValue({sublistId, fieldId: "custpage_sublist_checkbox",value:true});
            //         }
            //     }
            // }
        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            let curRec = scriptContext.currentRecord;
            var sublistId = scriptContext.sublistId;
            let fieldId = scriptContext.fieldId;
            let selected = curRec.getValue({fieldId: "custpage_selected"});
            let selectedObj = selected ? JSON.parse(selected) : {};
            let dataLength = Object.keys(selectedObj).length;
            if (fieldId == "custpage_subsidiary") {
                var newSubsidiaryId = curRec.getValue('custpage_subsidiary');
                console.log('newSubsidiaryId',newSubsidiaryId);
                if (newSubsidiaryId) {
                    //自动设置货币
                    var subsidiaryRec = record.load({
                        type: 'subsidiary',
                        id: newSubsidiaryId
                    });
                    var currencyId = subsidiaryRec.getValue('currency');

                    if (currencyId)
                        curRec.setValue({
                            fieldId: 'custpage_currency',
                            value: currencyId
                        });
                }
            }

            if (fieldId == "custpage_customer") {
                var customerId = curRec.getValue('custpage_customer');

                if (customerId) {
                    var customerObj = app.searchCustomer(customerId);
                    log.audit('customerObj',customerObj);
                    var terms = customerObj[customerId].terms;
                    if (terms) {
                        curRec.setValue({
                            fieldId: 'custpage_date',
                            value: terms
                        });
                    }
                }
            }

            if (fieldId == "custpage_sublist_checkbox") {
                // 获取单选框状态
                console.log('sublistId',sublistId);
                let checkbox = curRec.getCurrentSublistValue({sublistId, fieldId: fieldId});
                // var order =  curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_order_hide"});
                //子公司
                var subsidiary =  curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_subsidiary_hide"}) || '';
                //供应商
                var vendor =  curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_vendor_hide"}) || '';
                //对账日期
                var date =  curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_date_hide"}) || '';
                //货币
                var currency =  curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_currency_hide"}) || '';

                // var uniqueKey = subsidiary + '_' + customer + '_' + date + '_' + currency + '_' + deadline;
                var gcKey = subsidiary + '_' + vendor + '_' + currency;
                var gcFlag = curRec.getValue({fieldId: "custpage_gc_flag"});

                //货币
                var line = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_lineid_hide"}) || '';
                var orderId = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_documentid_hide"}) || '';

                var uniqueKey = orderId + '_' + line;

                //合计逻辑
                var amountSumLine = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_amount_sum_hide"}) || 0;
                var amountSum = curRec.getValue({
                    fieldId: 'custpage_reconciliation_amount_total'
                }) || 0;
                var amountResolvedLine = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_amount_unresolved_hide"}) || 0;
                var amountResolved = curRec.getValue({
                    fieldId: 'custpage_payable_amount_total'
                }) || 0;

                if (checkbox) {
                    if (!gcFlag || gcFlag == gcKey) {
                        if (!gcFlag) {
                            curRec.setValue({
                                fieldId: 'custpage_gc_flag',
                                value: gcKey
                            })
                        }
                        //合计对账总金额 应付总金额
                        curRec.setValue({
                            fieldId: 'custpage_reconciliation_amount_total',
                            value: MatchTool.fixed(MatchTool.addN(Number(amountSum),Number(amountSumLine)),2)
                        });
                        curRec.setValue({
                            fieldId: 'custpage_payable_amount_total',
                            value: MatchTool.fixed(MatchTool.addN(Number(amountResolved),Number(amountResolvedLine)),2)
                        });

                        selectedObj[uniqueKey] = selectedObj[uniqueKey] || {};
                        let lineDataObj = {};

                        //订单类型
                        lineDataObj["type2"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_type_2_hide"});
                        //唯一键
                        lineDataObj["startkey"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_startkey_hide"});
                        lineDataObj["endkey"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_orderkey_hide"});

                        lineDataObj["lineid"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_lineid_hide"});

                        //线下对账单
                        lineDataObj["xxdzd"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_xxdzd_hide"});

                        //单据类型
                        lineDataObj["type"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_type_hide"});

                        //单据号
                        lineDataObj["doc"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_documentid_hide"});

                        //订单号
                        lineDataObj["po"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_order_id_hide"});

                        //SKU编码
                        lineDataObj["sku"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_sku_id_hide"});

                        //SKU产品描述
                        lineDataObj["skudatail"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_sku_name_hide"});

                        //数量
                        lineDataObj["number"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_sku_number_hide"});

                        //未税单价
                        lineDataObj["price"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_sku_price_hide"});

                        //含税总额
                        lineDataObj["amount"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_amount_sum_hide"});

                        //已核销金额
                        lineDataObj["used"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_amount_sold_hide"});

                        //应付金额
                        lineDataObj["topay"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_amount_unresolved_hide"});

                        //到期日
                        lineDataObj["duedate"] = curRec.getCurrentSublistText(
                            {sublistId, fieldId: "custpage_sublist_dateline_hide"});

                        //剩余天数
                        lineDataObj["ramaindate"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_pastdue_days_hide"});

                        lineDataObj["bgname"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_item_name_hide"});
                        lineDataObj["bgunit"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_item_unit_hide"});

                        lineDataObj["bhjh"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_demand_line_hide"});   //备货计划

                        selectedObj[uniqueKey] = lineDataObj;
                    } else {
                        alert('不符合合并条件，请检查已选择数据：子公司，供应商，货币');

                        curRec.setCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_checkbox", value: false,ignoreFieldChange: false})

                        // 删除取消勾选已选择的数据    - 翻页勾选使用
                        if (selectedObj.hasOwnProperty(uniqueKey)) {
                            delete selectedObj[uniqueKey];
                        }
                    }
                } else {
                    if (!gcFlag || gcFlag == gcKey) {
                        curRec.setValue({
                            fieldId: 'custpage_reconciliation_amount_total',
                            value: MatchTool.fixed(MatchTool.subN(Number(amountSum), Number(amountSumLine)), 2)
                        });
                        curRec.setValue({
                            fieldId: 'custpage_payable_amount_total',
                            value: MatchTool.fixed(MatchTool.subN(Number(amountResolved), Number(amountResolvedLine)), 2)
                        });
                    }
                    // 删除取消勾选已选择的数据    - 翻页勾选使用
                    if (selectedObj.hasOwnProperty(uniqueKey)) {
                        delete selectedObj[uniqueKey];
                    }
                    if (Object.keys(selectedObj).length == 0) {
                        curRec.setValue({
                            fieldId: 'custpage_gc_flag',
                            value: ""
                        })
                    }
                }
                // 更新已选择数据   - 翻页勾选使用
                curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});
            }
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

            var rec = scriptContext.currentRecord;
            var type = rec.getValue({
                fieldId: 'custpage_type',
            });
            let isEmptyArray = Array.isArray(type) && (type.length === 0 || (type.length === 1 && type[0] === ''));
            if (isEmptyArray) {
                alert('订单类型不能为空');
                return false;
            }
            if (!isEmptyArray) {
                return true;
            }

            return true;
            // return true;
        }

        // 上一页函数
        function prevPage() {
            let curRec = currentRecord.get();
            var currentPage = parseInt(curRec.getValue({fieldId: 'custpage_paged_index_detail'}));
            console.log('currentPage',currentPage);
            if (currentPage > 1) {
                curRec.setValue({fieldId: 'custpage_paged_index_detail', value: currentPage - 1});
                curRec.setValue({fieldId: 'custpage_commit_flag', value: true});
                // 触发表单提交
                document.forms['main_form'].submit();
            } else {
                alert('当前为第一页');
            }
        }

        // 下一页函数
        function nextPage() {
            let curRec = currentRecord.get();
            var currentPage = parseInt(curRec.getValue({fieldId: 'custpage_paged_index_detail'}));
            var totalPages = parseInt(curRec.getValue({fieldId: 'custpage_total_pages_detail'}));

            console.log('currentPage',currentPage);
            console.log('totalPages',totalPages);
            if (currentPage < totalPages) {
                curRec.setValue({fieldId: 'custpage_paged_index_detail', value: currentPage + 1});
                curRec.setValue({fieldId: 'custpage_commit_flag', value: true});
                // 触发表单提交
                document.forms['main_form'].submit();
            } else {
                alert('当前为最后一页');
            }
        }

        /**
         * 当前页面全选
         */
        // function selectAll() {
        //     let curRec = currentRecord.get();
        //     let sublistId = "custpage_sublist_detail";
        //     let count = curRec.getLineCount(sublistId);
        //     if (!count) return;
        //     // var errMsg = "";
        //     let selected = curRec.getValue({fieldId: "custpage_selected"});
        //     // let vendorId = curRec.getValue({fieldId:"custpage_vendor"}) || ""; //供应商
        //
        //     let selectedObj = selected ? JSON.parse(selected) : {};
        //     for (var i = 0; i < count; i++) {
        //         curRec.selectLine({sublistId, line: i});
        //         let checkbox = curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_checkbox"});
        //         if (checkbox) continue;
        //
        //         // 当前行设置为勾选
        //         curRec.setCurrentSublistValue({sublistId: "custpage_sublist_detail", fieldId: "custpage_sublist_checkbox", value: true, ignoreFieldChange: true});
        //         // curRec.setCurrentSublistValue({sublistId: "custpage_sublist_detail", fieldId: "custpage_sublist_checkbox", value: true});
        //
        //     }
        //     // 更新已选择数据
        //     curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});
        //     // // 提示错误信息
        //     // if (errMsg) alert(errMsg);
        // }
        function selectAll() {
            let curRec = currentRecord.get();
            let sublistId = "custpage_sublist_detail";
            let count = curRec.getLineCount(sublistId);
            if (!count) return;

            let selected = curRec.getValue({fieldId: "custpage_selected"});
            let selectedObj = selected ? JSON.parse(selected) : {};

            //合并标志
            let gcFlag = curRec.getValue({fieldId: "custpage_gc_flag"});

            let amountHS = Number(curRec.getValue({fieldId: "custpage_reconciliation_amount_total"}));
            let amountYF = Number(curRec.getValue({fieldId: "custpage_payable_amount_total"}));

            if (gcFlag) {
                for (let i = 0; i < count; i++) {
                    curRec.selectLine({sublistId, line: i});

                    // 获取当前行的唯一键
                    var invoice = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_documentid_hide"});
                    var startKey = curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_lineid_hide"}) || '';
                    var uniqueKey = invoice + '_' + startKey;

                    //子公司
                    var subsidiary =  curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_subsidiary_hide"}) || '';
                    //供应商
                    var vendor =  curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_vendor_hide"}) || '';
                    //货币
                    var currency =  curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_currency_hide"}) || '';

                    // var uniqueKey = subsidiary + '_' + customer + '_' + date + '_' + currency + '_' + deadline;
                    var gcKey = subsidiary + '_' + vendor + '_' + currency;


                    if (gcKey == gcFlag) {
                        // 如果已经选中，则跳过
                        if (selectedObj.hasOwnProperty(uniqueKey)) {
                            continue;
                        }

                        // 构建行数据对象
                        let lineDataObj = {};
                        //订单类型
                        lineDataObj["type2"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_type_2_hide"});
                        //唯一键
                        lineDataObj["startkey"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_startkey_hide"});
                        lineDataObj["endkey"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_orderkey_hide"});

                        lineDataObj["lineid"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_lineid_hide"});

                        //线下对账单
                        lineDataObj["xxdzd"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_xxdzd_hide"});

                        //单据类型
                        lineDataObj["type"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_type_hide"});

                        //单据号
                        lineDataObj["doc"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_documentid_hide"});

                        //订单号
                        lineDataObj["po"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_order_id_hide"});

                        //SKU编码
                        lineDataObj["sku"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_sku_id_hide"});

                        //SKU产品描述
                        lineDataObj["skudatail"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_sku_name_hide"});

                        //数量
                        lineDataObj["number"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_sku_number_hide"});

                        //未税单价
                        lineDataObj["price"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_sku_price_hide"});

                        //含税总额
                        lineDataObj["amount"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_amount_sum_hide"});
                        amountHS = amountHS + Number(lineDataObj["amount"]);

                        //已核销金额
                        lineDataObj["used"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_amount_sold_hide"});

                        //应付金额
                        lineDataObj["topay"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_amount_unresolved_hide"});
                        amountYF = amountYF + Number(lineDataObj["topay"]);

                        //到期日
                        lineDataObj["duedate"] = curRec.getCurrentSublistText(
                            {sublistId, fieldId: "custpage_sublist_dateline_hide"});

                        //剩余天数
                        lineDataObj["ramaindate"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_pastdue_days_hide"});

                        lineDataObj["bgname"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_item_name_hide"});
                        lineDataObj["bgunit"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_item_unit_hide"});

                        lineDataObj["bhjh"] = curRec.getCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_demand_line_hide"});   //备货计划

                        // 添加到已选对象
                        selectedObj[uniqueKey] = lineDataObj;

                        // 设置复选框为选中，注意使用ignoreFieldChange避免触发fieldChanged
                        curRec.setCurrentSublistValue(
                            {sublistId, fieldId: "custpage_sublist_checkbox", value: true, ignoreFieldChange: true});
                    }
                }

                amountHS = MatchTool.fixed(amountHS, 2);
                amountYF = MatchTool.fixed(amountYF, 2);
                curRec.setValue({fieldId: "custpage_reconciliation_amount_total", value: amountHS});
                curRec.setValue({fieldId: "custpage_payable_amount_total", value: amountYF});

                // 可以添加提示信息
                let selectedCount = Object.keys(selectedObj).length || 0;

                alert(`已选中 ${selectedCount} 行数据`);
            } else {
                alert('请先选择一行数据');
            }
            // 更新已选择数据到隐藏字段
            curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});
        }

        /**
         * 当前页面取消全选
         */
        // function deselectAll() {
        //     let curRec = currentRecord.get();
        //     let sublistId = "custpage_sublist_detail";
        //     let count = curRec.getLineCount({sublistId: "custpage_sublist_detail"});
        //     if (!count) return;
        //     var selected = curRec.getValue({fieldId: "custpage_selected"});
        //     for (var i = 0; i < count; i++) {
        //         curRec.selectLine({sublistId, line: i});
        //         curRec.setCurrentSublistValue({sublistId, fieldId: "custpage_sublist_checkbox", value: false});
        //     }
        // }
        function deselectAll() {
            let curRec = currentRecord.get();
            let sublistId = "custpage_sublist_detail";
            let count = curRec.getLineCount(sublistId);
            if (!count) return;

            let selected = curRec.getValue({fieldId: "custpage_selected"});
            let selectedObj = selected ? JSON.parse(selected) : {};

            console.log('取消全选：selectedObj',selectedObj);
            console.log('取消全选：count',count);

            let amountHS = Number(curRec.getValue({fieldId: "custpage_reconciliation_amount_total"}));
            let amountYF = Number(curRec.getValue({fieldId: "custpage_payable_amount_total"}));
            for (let i = 0; i < count; i++) {
                curRec.selectLine({sublistId, line: i});

                // 获取当前行的唯一键
                var invoice = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_documentid_hide"});
                var startKey = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_lineid_hide"}) || '';


                var uniqueKey = invoice + '_' + startKey;
                console.log('取消全选：uniqueKey',uniqueKey);
                // 从selectedObj中移除
                if (selectedObj.hasOwnProperty(uniqueKey)) {
                    console.log('取消全选：selectedObj[uniqueKey]',selectedObj[uniqueKey]);
                    //含税总额
                    amountHS = amountHS - Number(curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_amount_sum_hide"}));

                    //应付金额
                    amountYF = amountYF - Number(curRec.getCurrentSublistValue(
                        {sublistId, fieldId: "custpage_sublist_amount_unresolved_hide"}));
                    delete selectedObj[uniqueKey];
                }

                // 设置复选框为未选中，注意使用ignoreFieldChange避免触发fieldChanged
                curRec.setCurrentSublistValue({sublistId, fieldId: "custpage_sublist_checkbox", value: false, ignoreFieldChange: true});

            }
            console.log('取消全选：更新后selectedObj',selectedObj);

            amountHS = MatchTool.fixed(amountHS,2);
            amountYF = MatchTool.fixed(amountYF,2);
            curRec.setValue({fieldId: "custpage_reconciliation_amount_total", value: amountHS});
            curRec.setValue({fieldId: "custpage_payable_amount_total", value: amountYF});
            // 更新已选择数据到隐藏字段
            curRec.setValue({fieldId: "custpage_selected", value: JSON.stringify(selectedObj)});

            if (Object.keys(selectedObj).length == 0) {
                curRec.setValue({fieldId: "custpage_gc_flag", value: "", ignoreFieldChange: true});
            }
        }

        /**
         * 客户对账单【提交】按钮执行函数
         */
        async function createOrder() {
            // 弹出弹框
            var options = {
                title: "提醒",
                message: "确定生成对账单"
            };

            try {
                const result = await dialog.confirm(options);
                console.log('result', result);
                if (result) {
                    let curRec = currentRecord.get();
                    let selected = curRec.getValue({fieldId: "custpage_selected"});
                    let selectedObj = selected ? JSON.parse(selected) : {};
                    let dataLength = Object.keys(selectedObj).length;
                    let dataValue = Object.values(selectedObj);//已勾选的数据
                    console.log('dataValue', dataValue);

                    var gcFlag = curRec.getValue({fieldId: "custpage_gc_flag"});
                    let subsidiary = gcFlag.split("_")[0];
                    let vendor = gcFlag.split("_")[1];
                    let currency = gcFlag.split("_")[2];

                    // //子公司
                    // let subsidiary = curRec.getCurrentSublistValue(
                    //     {sublistId: "custpage_sublist_detail", fieldId: "custpage_sublist_subsidiary_hide"}) || '';
                    // //供应商
                    // let vendor = curRec.getCurrentSublistValue(
                    //     {sublistId: "custpage_sublist_detail", fieldId: "custpage_sublist_vendor_hide"}) || '';
                    //对账日期
                    let date = curRec.getText({fieldId: "custpage_reconciliation_date"}) || '';
                    // //货币
                    // let currency = curRec.getCurrentSublistValue(
                    //     {sublistId: "custpage_sublist_detail", fieldId: "custpage_sublist_currency_hide"}) || '';
                    //备注
                    let memo = curRec.getValue({fieldId: "custpage_main_memo"});
                    //对账总金额
                    let reconciliationAmount = curRec.getValue({fieldId: "custpage_reconciliation_amount_total"});
                    //应付总金额
                    let payAmount = curRec.getValue({fieldId: "custpage_payable_amount_total"});

                    let bussiness = curRec.getValue({fieldId: "custpage_departments"});

                    let poData = {};
                    poData["subsidiary"] = subsidiary; //子公司
                    poData["vendor"] = vendor; //客户
                    poData["date"] = date;
                    poData["currency"] = currency;//货币
                    poData["memo"] = memo;//备注
                    poData["reconciliationAmount"] = reconciliationAmount;//对账总金额
                    poData["payAmount"] = payAmount;//应付总金额
                    poData["bussiness"] = bussiness;//提出部门

                    poData["lineData"] = [];
                    for (let i in dataValue) {
                        var obj = dataValue[i];
                        console.log('obj', obj);
                        poData["lineData"].push(obj);
                    }

                    if (!bussiness) {
                        alert("提出部门不能为空");
                        return;
                    }

                    if (poData["lineData"].length <= 0) {
                        alert("无勾选数据");
                    } else {

                        // 显示弹窗
                        let timeoutblockerDiv = document.getElementById("timeoutblocker");
                        timeoutblockerDiv.style.display = "block";
                        let startDate = new Date().getTime();
                        try {
                            let reqUrl = url.resolveScript({
                                scriptId: "customscript_swc_sl_reconciliationplat",
                                deploymentId: "customdeploy_swc_sl_reconciliationplat",
                                params: {
                                    flag: SUBMIST_STATUS, // 请求区分创建对账单
                                }
                            });
                            //生成PO 选择用异步的原因：同步遮罩无法使用
                            let createPoResult = await https.post.promise({
                                url: reqUrl,
                                body: {
                                    "poData": JSON.stringify(poData),
                                }
                            })
                            let data = createPoResult.body && JSON.parse(createPoResult.body);
                            console.log('接口1返回数据', data);

                            let poEndDate = new Date().getTime();
                            console.log("执行时间", ((poEndDate - startDate) / 1000) + "秒")
                            // window.onbeforeunload = null;
                            // window.location.reload();

                            if (data.code == 200) {
                                // 开始轮询任务状态
                                pollTaskStatus(data.data.taskId);
                            }
                            if (data.code == 500) {
                                alert(data["msg"]);
                                let endDate = new Date().getTime();
                                console.log("共计执行时间", ((endDate - startDate) / 1000) + "秒")
                                window.onbeforeunload = null;
                                window.location.reload();
                            }

                        } catch (e) {
                            console.log(e)
                            alert(e.message)
                        }
                    }
                } else {
                    // 用户点击了取消
                    console.log("用户取消提交");
                }
            } catch (e) {
                // 弹窗出现错误
                console.log("弹窗错误: " + error);
            }
        }

        function pollTaskStatus(taskId) {
            var checkInterval = 4000; // 2秒检查一次
            var maxAttempts = 60; // 最多尝试60次（2分钟）
            var attempts = 0;

            var poll = setInterval(async function() {
                attempts++;

                if (attempts > maxAttempts) {
                    clearInterval(poll);
                    alert("任务处理超时");
                    document.getElementById('timeoutblocker').style.display = 'none';
                    return;
                }

                // 调用检查状态接口
                // var checkUrl = getRequestUrl({
                //     action: "checkTaskStatus",
                //     taskId: taskId
                // });
                let checkUrl = url.resolveScript({
                    scriptId: "customscript_swc_sl_reconciliationplat",
                    deploymentId: "customdeploy_swc_sl_reconciliationplat",
                    params: {
                        flag: SUBMIST_STATUS_2, // 请求区分创建对账客户单
                    }
                });

                let adData2 = {
                    taskId: taskId
                }
                let checkResult = await https.post.promise({
                    url: checkUrl,
                    body:{
                        "adData": JSON.stringify(adData2),
                    }
                });
                // var taskStatus = task.checkStatus(taskId);
                console.log('checkResult',checkResult);
                let data2 = checkResult.body && JSON.parse(checkResult.body);
                console.log('接口2返回数据',data2);


                if (data2.code === 200) {
                    var status = data2.data.status;
                    console.log('status',status);

                    if (status === "COMPLETE") {
                        var errorRec = record.load({
                            type: 'customrecord_swc_script_error',
                            id: 3//后续需调整
                        });
                        var error = errorRec.getValue({fieldId: 'custrecord_swc_script_error_message'});
                        if (error) {
                            // errorRec.setValue({fieldId: 'custrecord_swc_script_error_message',value: ''});
                            // errorRec.save();
                            clearInterval(poll);
                            alert(`客户对账单生成失败,请联系管理员: ${error}`);
                            document.getElementById('timeoutblocker').style.display = 'none';
                            // 刷新页面或跳转
                            window.onbeforeunload = null;
                            window.location.reload();
                        } else {
                            clearInterval(poll);
                            alert("客户对账单生成成功！");
                            document.getElementById('timeoutblocker').style.display = 'none';
                            // 刷新页面或跳转
                            var newId = app.getNewOrder();
                            console.log('newId',newId);
                            let orderUrl = url.resolveRecord({
                                recordType: "customrecord_swc_account_statement",
                                recordId: newId,
                                isEditMode: false
                            });
                            window.onbeforeunload = null;
                            window.open(orderUrl);
                            window.location.reload();
                        }

                    } else if (status === "FAILED") {
                        clearInterval(poll);
                        alert("任务执行失败：" + data.data.error);
                        document.getElementById('timeoutblocker').style.display = 'none';
                    }
                    // 其他状态（PENDING, PROCESSING）继续轮询
                }
            }, checkInterval);
        }

        function init() {
            var $ = jQuery;
            //分页下拉选
            $('.tdt_paged_index').change(function () {
                var fieldId = $(this).attr('id').replace('tdt', 'custpage');
                var currRecord = currentRecord.get();
                currRecord.setValue({
                    fieldId: fieldId,
                    value: $(this).val(),
                });
                // // 设置为true，不清空已选数据
                currRecord.setValue({fieldId: "custpage_commit_flag", value: true});//跨页提交用

                $('#submitter').click();
            });
            // //明细行固定高度,变为滚动
            // $('#custpage_sublist_detail_div').css("height",'500px');
            //固定明细行列头
            $('#custpage_sublist_detailheader').css({
                "position":'sticky',
                "top":0,
                "z-index": 1
            })

            // let count = $("tr[id^='custpage_sublist_detailrow']").length;
            // for (var i = 0; i < count; i++) {
            //     $(`input[name=inpt_custpage_sublist_vendor${i+1}]`).css("width",'150px')
            // }


        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            // validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            prevPage: prevPage,
            nextPage: nextPage,
            saveRecord: saveRecord,
            selectAll: selectAll,
            deselectAll: deselectAll,
            createOrder: createOrder
        };

    });