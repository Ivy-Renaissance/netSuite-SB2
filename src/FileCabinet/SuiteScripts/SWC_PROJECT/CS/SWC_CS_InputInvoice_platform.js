/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
const SUBMIST_STATUS = "1";
const PAGE_SIZE = 5;// 子列表页面大小
const SUBMIST_STATUS_2 = "2";
define(['N/currentRecord', 'N/https', 'N/record', 'N/search', 'N/url',"../APP/SWC_APP_InputInvoice_platform"],

function(currentRecord, https, record, search, url,app) {
    
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
        let selected = curRec.getValue({fieldId: "custpage_selected"});
        console.log('开始',selected);
        init();
        log.audit('scriptContext.mode',scriptContext.mode);
        let oDiv = document.getElementById("timeoutblocker");
        oDiv.style.display = "none";
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

        if (fieldId == "custpage_sublist_checkbox") {
            // 获取单选框状态
            console.log('sublistId',sublistId);
            let checkbox = curRec.getCurrentSublistValue({sublistId, fieldId: fieldId});
            // var order =  curRec.getCurrentSublistValue({sublistId, fieldId: "custpage_sublist_order_hide"});
            var item = curRec.getCurrentSublistValue(
                {sublistId, fieldId: "custpage_sublist_item_hide"})
            var line = curRec.getCurrentSublistValue(
                {sublistId, fieldId: "custpage_sublist_orderkey_end_hide"}) || '';
            var billId = curRec.getCurrentSublistValue(
                {sublistId, fieldId: "custpage_sublist_bill_number_hide"}) || '';
            var uniqueKey = billId + '_' + item + '_' + line;

            if (checkbox) {
                let lineDataObj = {};
                // selectedObj[uniqueKey] = selectedObj[uniqueKey] || [];

                lineDataObj["statementnumber"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_statement_number_hide"});

                lineDataObj["purnumber"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_pur_number_hide"});

                lineDataObj["receiptnumber"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_receipt_number_hide"});

                lineDataObj["billnumber"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_bill_number_hide"});

                lineDataObj["item"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_item_hide"});

                lineDataObj["currency"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_currency_hide"});

                lineDataObj["number"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_number_hide"});

                lineDataObj["tax"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_tax_hide"});

                lineDataObj["price"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_price_hide"});

                lineDataObj["amountall"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_amount_all_hide"});

                lineDataObj["invoicesissued"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_invoices_issued_hide"});

                lineDataObj["issuedinput"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_issued_input_hide"});

                lineDataObj["amountinput"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_amount_input_hide"});

                lineDataObj["taxrebaterate"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_taxrebate_rate_hide"});

                lineDataObj["taxrefundamount"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_taxrefund_amount_hide"});

                lineDataObj["refundamount"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_refund_amount_hide"});

                lineDataObj["advancepayment"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_advance_payment_hide"});

                lineDataObj["unpaidamount"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_unpaid_amount_hide"});

                lineDataObj["type"] = curRec.getCurrentSublistValue(
                    {sublistId, fieldId: "custpage_sublist_type_hide"});

                selectedObj[uniqueKey] = lineDataObj;
            } else {
                // 删除取消勾选已选择的数据    - 翻页勾选使用
                if (selectedObj.hasOwnProperty(uniqueKey)) {
                    delete selectedObj[uniqueKey];
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

    /**
     * 客户对账单【提交】按钮执行函数
     */
    async function createOrder() {
        let curRec = currentRecord.get();
        let selected = curRec.getValue({fieldId: "custpage_selected"});
        let selectedObj = selected ? JSON.parse(selected) : {};
        let dataLength = Object.keys(selectedObj).length;
        let dataValue = Object.values(selectedObj);//已勾选的数据
        console.log('dataValue',dataValue);

        var subsidiary =  curRec.getValue({fieldId: "custpage_subsidiary"});
        var vendor =  curRec.getValue({fieldId: "custpage_vendor"});
        var purchaser =  curRec.getValue({ fieldId: "custpage_purchaser"});
        var period =  curRec.getValue({fieldId: "custpage_period"});
        var invoiceDate =  curRec.getValue({fieldId: "custpage_invoice_date"});
        var invoiceNumber =  curRec.getValue({fieldId: "custpage_invoice_number"});

        let poData = {};
        poData["subsidiary"] = subsidiary || ''; //子公司
        poData["vendor"] = vendor || ''; //供应商
        poData["purchaser"] = purchaser || '';//员工
        poData["period"] = period || '';//期间
        poData["invoiceDate"] = invoiceDate;//发票日期
        poData["invoiceNumber"] = invoiceNumber;//发票号

        poData["lineData"] = [];
        for (let i in dataValue) {
            var obj = dataValue[i];
            console.log('obj',obj);
            poData["lineData"].push(obj);
        }

        if (poData["lineData"].length <= 0) {
            alert("无勾选数据");
        } else if (!invoiceDate || !invoiceNumber) {
            alert("发票日期或发票号为空");
        } else if (!subsidiary) {
            alert("子公司为空");
        }else {

            // 显示弹窗
            let timeoutblockerDiv = document.getElementById("timeoutblocker");
            timeoutblockerDiv.style.display = "block";
            let startDate = new Date().getTime();
            try {
                let reqUrl = url.resolveScript({
                    scriptId: "customscript_swc_sl_inputinvoice_platfor",
                    deploymentId: "customdeploy_swc_sl_inputinvoice_platfor",
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

    }

    function pollTaskStatus(taskId) {
        var checkInterval = 2000; // 2秒检查一次
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
                    clearInterval(poll);
                    alert("客户对账单生成成功！");
                    document.getElementById('timeoutblocker').style.display = 'none';
                    // 刷新页面或跳转
                    var newId = app.getNewOrder();
                    console.log('newId',newId);
                    let orderUrl = url.resolveRecord({
                        recordType: "customrecord_swc_input_invoice",
                        recordId: newId,
                        isEditMode: false
                    });
                    window.onbeforeunload = null;
                    window.open(orderUrl);
                    window.location.reload();
                } else if (status === "FAILED") {
                    clearInterval(poll);
                    alert("任务执行失败：" + data.data.error);
                    document.getElementById('timeoutblocker').style.display = 'none';
                }
                // 其他状态（PENDING, PROCESSING）继续轮询
            }
        }, checkInterval);
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
        // saveRecord: saveRecord,
        createOrder: createOrder,
        prevPage: prevPage,
        nextPage: nextPage,
    };
    
});
