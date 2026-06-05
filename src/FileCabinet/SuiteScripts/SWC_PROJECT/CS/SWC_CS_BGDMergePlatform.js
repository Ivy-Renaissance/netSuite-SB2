/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(["N/url", "N/https", "N/ui/dialog", "N/format", "N/runtime", "N/currentRecord", "../common/SWC_Utils.js"],

    function(url, https, dialog, format, runtime, currentRecord, SWC_Utils) {

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
            var curRec = scriptContext.currentRecord;
            jQuery(function($) {
                let platFormType = curRec.getValue({fieldId: "custpage_body_platform_type"}); // platform type
                if (platFormType == "清关单") { // 将 清关发货人* 清关收货人* 字段 的* 变为红色
                    let shipperFieldId = "custpage_body_export_shipper";
                    let buyerFieldId = "custpage_body_export_buyer";
                    let shipperDom = $('#' + shipperFieldId + '_fs_lbl').children('a')[0];
                    if (shipperDom) {
                        let shipperLabel = $(shipperDom).text();
                        $(shipperDom).html(shipperLabel.replace("*", "<span style='color: red'>*</span>"));
                    }

                    let buyerDom = $('#' + buyerFieldId + '_fs_lbl').children('a')[0];
                    if (buyerDom) {
                        let buyerLabel = $(buyerDom).text();
                        $(buyerDom).html(buyerLabel.replace("*", "<span style='color: red'>*</span>"));
                    }
                }
            });

            var selectedArr = sessionStorage.getItem("selectedArr");
            if (selectedArr && Object.keys(JSON.parse(selectedArr)).length > 0) {
                var selected = JSON.parse(selectedArr);
                var count = curRec.getLineCount({sublistId: "custpage_sublist"});
                for (var i = 0; i < count; i++) {
                    var no = curRec.getSublistValue({sublistId: "custpage_sublist", fieldId: "custpage_sub_no", line: i});
                    if (selected.hasOwnProperty(no)) {
                        curRec.selectLine({sublistId: "custpage_sublist", line: i});
                        curRec.setCurrentSublistValue({sublistId: "custpage_sublist", fieldId: "custpage_sub_check", value: true, ignoreFieldChange: true});
                        curRec.commitLine({sublistId: "custpage_sublist"})
                    }
                }
            }

            // 关闭”加载中，请稍候 ...“遮罩
            var oDiv = document.getElementById("timeoutblocker");
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
            var sublistId = scriptContext.sublistId;
            var fieldId = scriptContext.fieldId;
            var curRec = scriptContext.currentRecord;

            // 在表头输入页码，直接跳转至对应页
            if (fieldId == "custpage_body_skipto") {
                var fyField = curRec.getValue({fieldId: "custpage_body_page"});
                if (fyField) {
                    var totalPages = parseInt(fyField.split("/")[1]);
                    var skipTo = curRec.getValue({fieldId: fieldId});
                    if (skipTo <= 0) {
                        dialog.alert({message: "输入的页面必须大于0！"});
                        curRec.setValue({fieldId: fieldId, value: "", ignoreFieldChange: true});
                        return;
                    }
                    if (skipTo > totalPages) {
                        dialog.alert({message: "跳转到的页码不能大于总页数！"});
                        curRec.setValue({fieldId: fieldId, value: "", ignoreFieldChange: true});
                        return;
                    }
                    skipToPage(skipTo);
                }
            }

            // 存储已选择的数据，防止换页后找不到上页选择的数据
            if (sublistId == "custpage_sublist" && fieldId == "custpage_sub_check") {
                var lineNum = scriptContext.line;
                var selected = sessionStorage.getItem("selectedArr");
                var selectedArr = (selected && JSON.parse(selected)) || {};
                var no = curRec.getSublistValue({sublistId: sublistId, fieldId: "custpage_sub_no", line: lineNum});
                var checkbox = curRec.getSublistValue({sublistId: sublistId, fieldId: fieldId, line: lineNum});
                if (checkbox) {
                    selectedArr[no] = getCheckedValue(curRec, sublistId, lineNum);
                } else {
                    delete selectedArr[no];
                }
                setBodyDate(curRec, sublistId, lineNum, checkbox);
                sessionStorage.setItem("selectedArr", JSON.stringify(selectedArr));
            }

            //
            // if (fieldId == "custpage_body_export_shipper") {
            //     let shipperXL = runtime.getCurrentScript().getParameter({name: "custscript_swc_sl_shipper"}); // 清关发货人:小鹿奔奔
            //     let exportShipper = curRec.getValue({fieldId: fieldId});
            //     if (exportShipper == shipperXL) curRec.setValue({fieldId: "custpage_body_contract_no", value: getShipperInfoById(exportShipper), ignoreFieldChange: true});
            //     // 若为空是否清空?
            // }

            // if (fieldId == "custpage_body_subsidiary"){ // 子公司
            //     let subsidiary = curRec.getValue({fieldId: fieldId});
            //     let entityField = curRec.getField({fieldId: "custpage_body_entity"}); // 供应商
            //     entityField.removeSelectOption({value: null});
            //     entityField.insertSelectOption({value: "", text: ""});
            //     let options = {subsidiary: subsidiary};
            //     let slUrl = url.resolveScript({scriptId: "customscript_swc_sl_platform_handle", deploymentId: "customdeploy_swc_sl_platform_handle"});
            //     let promise = https.post.promise({url: slUrl, body: JSON.stringify({actionType: "getEntityOptions", options: options})});
            //     promise.then(function (response){
            //         let responseBody = SWC_Utils.isEmpty(response.body)? {}: JSON.parse(response.body);
            //         for (let index in responseBody){
            //             entityField.insertSelectOption(responseBody[index]);
            //         }
            //     });
            // }
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
            // 点击查询后清空selectedArr session
            sessionStorage.removeItem("selectedArr");
            return true;
        }

        /**
         * 子列表按钮点击下一页
         * @param totalPages
         * @param currentPage
         * @param options
         */
        function nextPage(totalPages, currentPage) {
            var page = currentPage + 1;
            if (page > totalPages) {
                dialog.alert({message: "已经是最后一页了"});
                return;
            }
            skipToPage(page)
        }

        /**
         * 子列表按钮点击上一页
         * @param currentPage
         * @param options
         */
        function lastPage(currentPage) {
            var page = currentPage - 1;
            if (page == 0) {
                dialog.alert({message: "已经是第一页了"});
                return;
            }
            skipToPage(page);
        }

        /**
         * 跳转至页码
         * @param page 页码
         * @param options 表头数据
         */
        function skipToPage(page) {
            var curRec = currentRecord.get();
            let platFormType = curRec.getValue({fieldId: "custpage_body_platform_type"}); // platform type
            let date = curRec.getValue({fieldId: "custpage_body_date"}) || ""; // DATE
            let dateFrom = curRec.getValue({fieldId: "custpage_body_date_from"}) || ""; // 创建日期自
            let dateTo = curRec.getValue({fieldId: "custpage_body_date_to"}) || ""; // 创建日期至
            var options = {
                subsidiary: curRec.getValue({fieldId: "custpage_body_subsidiary"}) || "", // 子公司
                entity: curRec.getValue({fieldId: "custpage_body_entity"}) || "", // 供应商
                shipper: curRec.getValue({fieldId: "custpage_body_export_shipper"}) || "", // 清关发货人
                buyer: curRec.getValue({fieldId: "custpage_body_export_buyer"}) || "", // 清关收货人
                contractNo: curRec.getValue({fieldId: "custpage_body_contract_no"}) || "", // CONTRACT NO
                date: date? format.format({value: date, type: format.Type.DATE}): "",
                dateFrom: dateFrom? format.format({value: dateFrom, type: format.Type.DATE}): "",
                dateTo: dateTo? format.format({value: dateTo, type: format.Type.DATE}): "",
                spo: curRec.getValue({fieldId: "custpage_body_spo"}) || "", // SPO
                containerNo: curRec.getValue({fieldId: "custpage_body_container_no"}) || "", // 集装箱箱号
            }
            var params = {
                "page": page,
                "options": JSON.stringify(options)
            };
            let deployId = "customdeploy_swc_sl_bgdmergeplatform"; // 报关单平台部署id
            if (platFormType == "清关单") deployId = "customdeploy_swc_sl_qgdmergeplatform"; // 清关单平台部署id
            //刷新页面
            var urlObj = url.resolveScript({
                scriptId: "customscript_swc_sl_bgdmergeplatform",
                deploymentId: deployId,
                returnExternalUrl: false,
                params: params
            });
            window.onbeforeunload = null;
            window.location.href = urlObj;
        }

        /**
         * 子列表全选方法
         */
        function selectAll() {
            var rec = currentRecord.get();
            var count = rec.getLineCount({sublistId: "custpage_sublist"});
            for (var i = 0; i < count; i++) {
                rec.selectLine({sublistId: "custpage_sublist", line: i});
                rec.setCurrentSublistValue({sublistId: "custpage_sublist", fieldId: "custpage_sub_check", value: true});
            }
        }

        /**
         * 子列表取消全选方法
         */
        function deSelectAll() {
            var rec = currentRecord.get();
            var count = rec.getLineCount({sublistId: "custpage_sublist"});
            for (var i = 0; i < count; i++) {
                rec.selectLine({sublistId: "custpage_sublist", line: i});
                rec.setCurrentSublistValue({sublistId: "custpage_sublist", fieldId: "custpage_sub_check", value: false});
            }
        }

        function getCheckedValue(curRec, sublistId, lineNum){
            let checkedData = {};
            if (SWC_Utils.isEmpty(sublistId) || SWC_Utils.isEmpty(lineNum)) return checkedData;
            checkedData.planOrderId = curRec.getSublistValue({sublistId: sublistId, fieldId: "custpage_sub_mainid", line: lineNum}) || ""; // 物流发运单号
            checkedData.poId = curRec.getSublistValue({sublistId: sublistId, fieldId: "custpage_sub_po", line: lineNum}) || ""; // 采购订单编号
            checkedData.skuId = curRec.getSublistValue({sublistId: sublistId, fieldId: "custpage_sub_sku", line: lineNum}) || ""; // SKU
            checkedData.vendorId = curRec.getSublistValue({sublistId: sublistId, fieldId: "custpage_sub_vendor", line: lineNum}) || ""; // 供应商
            checkedData.detailIds = curRec.getSublistValue({sublistId: sublistId, fieldId: "custpage_sub_detail_ids", line: lineNum}) || ""; // 物流发运明细 ids
            checkedData.subsidiary = curRec.getSublistValue({sublistId: sublistId, fieldId: "custpage_sub_subsidiary", line: lineNum}) || ""; // 采购单子公司
            checkedData.spo = curRec.getSublistValue({sublistId: sublistId, fieldId: "custpage_sub_spo", line: lineNum}) || ""; // SPO
            checkedData.containerNo = curRec.getSublistValue({sublistId: sublistId, fieldId: "custpage_sub_container_num", line: lineNum}) || ""; // 集装箱箱号
            return checkedData;
        }

        /**
         * 清关处理平台 根据选中行 为 主体字段 date 赋值
         * @param curRec
         * @param sublistId
         * @param lineNum
         * @param checkbox
         */
        function setBodyDate(curRec, sublistId, lineNum, checkbox){
            let platformType = curRec.getValue({fieldId: "custpage_body_platform_type"});
            if (platformType != "清关单") return;
            let realDate = curRec.getSublistValue({sublistId: sublistId, fieldId: "custpage_sub_date", line: lineNum});
            // console.log(realDate);
            if (!SWC_Utils.isEmpty(realDate)) realDate = format.parse({value: realDate, type: format.Type.DATE});
            if (!checkbox) realDate = "";
            curRec.setValue({fieldId: "custpage_body_date", value: realDate, ignoreFieldChange: true});
        }

        /**
         * 合并报关单按钮
         */
        function createBGD(){
            var selected = sessionStorage.getItem("selectedArr");
            var selectedArr = (selected && JSON.parse(selected)) || {};
            if (SWC_Utils.isEmpty(selectedArr)) { // 选择的行为空时
                dialog.alert({message: "请选择需要合并的行。"});
                return;
            }
            // SPO和集装箱号最多2个，否则报错
            let spoArr = [];
            let containerNoArr = [];
            console.log(selectedArr);
            for (let line in selectedArr){
                let lineData = selectedArr[line];
                let spo = lineData.spo;
                let containerNo = lineData.containerNo;
                if (!spoArr.includes(spo)) spoArr.push(spo);
                if (!containerNoArr.includes(containerNo)) containerNoArr.push(containerNo);
            }
            // console.log(poIdArr);
            if (spoArr.length > 2) {
                dialog.alert({message: "最多可选择2个不同的SPO进行合并"});
                return;
            }
            if (containerNoArr.length > 2) {
                dialog.alert({message: "最多可选择2个不同的集装箱箱号进行合并"});
                return;
            }
            postToSl(selectedArr);
        }

        function postToSl(selectedArr){
            var rec = currentRecord.get();
            let deployId = "customdeploy_swc_sl_bgdmergeplatform";
            let platFormType = rec.getValue({fieldId: "custpage_body_platform_type"});
            // 显示弹窗
            var timeoutblockerDiv = document.getElementById("timeoutblocker");
            var span = timeoutblockerDiv.querySelector("span");
            let innerHTML = "正在生成合并报关单，请稍后。。。";
            let errorMessage = "生成合并报关单报错：";
            if (platFormType == "清关单") {
                innerHTML = "正在合并清关单并打印，请稍后。。。";
                deployId = "customdeploy_swc_sl_qgdmergeplatform";
                errorMessage = "合并清关单并打印报错：";
            }
            span.innerHTML = innerHTML;
            timeoutblockerDiv.style.display = "block";

            var urlObj = url.resolveScript({
                scriptId: "customscript_swc_sl_bgdmergeplatform",
                deploymentId: deployId,
            });
            https.post.promise({
                url: urlObj,
                body: {
                    processFlag: "T",
                    createJson: JSON.stringify(selectedArr)
                }
            }).then(function (response) {
                var responseBody = JSON.parse(response.body);
                if (responseBody.code != "200") {
                    dialog.alert({message: responseBody.message});
                } else {
                    // 成功后清空selectedArr session
                    sessionStorage.removeItem("selectedArr");
                    let recId = responseBody.recId;
                    if (!SWC_Utils.isEmpty(recId)){
                        let recUrl = url.resolveRecord({recordType: "customrecord_swc_customs_declaration", recordId: recId, isEditMode: false});
                        window.open(recUrl);
                    }
                }
                // 禁用离开页面前提示
                window.onbeforeunload = null;
                // 刷新页面
                window.location.href = urlObj;
            }).catch(function (error) {
                dialog.alert({message: errorMessage +error.message});
            });
        }

        /**
         * 合并清关单并打印
         */
        function mergeQGD(){
            var rec = currentRecord.get();
            var selected = sessionStorage.getItem("selectedArr");
            var selectedArr = (selected && JSON.parse(selected)) || {};
            let exportShipper = rec.getValue({fieldId: "custpage_body_export_shipper"}); // 清关发货人
            let exportBuyer = rec.getValue({fieldId: "custpage_body_export_buyer"}); // 清关收货人
            let contractNo = rec.getValue({fieldId: "custpage_body_contract_no"}); // CONTRACT NO
            let date = rec.getValue({fieldId: "custpage_body_date"}); // DATE
            if (date) date = format.format({value: date, type: format.Type.DATE});

            if (SWC_Utils.isEmpty(selectedArr)) { // 选择的行为空时
                dialog.alert({message: "请选择需要合并并打印的行。"});
                return;
            }
            if (SWC_Utils.isEmpty(exportShipper)) {
                dialog.alert({message: "清关发货人不能为空"});
                return;
            }
            if (SWC_Utils.isEmpty(exportBuyer)) {
                dialog.alert({message: "清关收货人不能为空"});
                return;
            }
            // 采购订单子公司必须一致，否则报错
            let subsidiaryArr = [];
            let spoArr = [];
            for (let line in selectedArr){
                let lineData = selectedArr[line];
                let subsidiary = lineData.subsidiary;
                let spo = lineData.spo;
                if (!subsidiaryArr.includes(subsidiary)) subsidiaryArr.push(subsidiary);
                if (!spoArr.includes(spo)) spoArr.push(spo);
            }
            // console.log({subsidiaryArr, spoArr});
            if (subsidiaryArr.length > 1) {
                dialog.alert({message: "请选择相同采购订单子公司进行合并"});
                return;
            }

            if (spoArr.length > 2) {
                dialog.alert({message: "只能选择最多两个不同的SPO进行合并"});
                return;
            }

            // 显示弹窗
            var timeoutblockerDiv = document.getElementById("timeoutblocker");
            var span = timeoutblockerDiv.querySelector("span");
            span.innerHTML = "正在合并清关单并打印，请稍后。。。";
            timeoutblockerDiv.style.display = "block";

            var urlObj = url.resolveScript({
                scriptId: "customscript_swc_sl_bgdmergeplatform",
                deploymentId: "customdeploy_swc_sl_qgdmergeplatform",
            });
            var form = document.createElement("form");
            form.method = "POST";
            form.action = urlObj;
            form.target = "_blank";

            // 创建并设置createJson输入框 为防止传参过多, 选择post提交
            let createJsonInput = document.createElement("input");
            createJsonInput.type = "hidden";
            createJsonInput.name = "createJson";
            createJsonInput.value = JSON.stringify(selectedArr);

            // 创建并设置processFlag输入框
            let processFlagInput = document.createElement("input");
            processFlagInput.type = "hidden";
            processFlagInput.name = "processFlag";
            processFlagInput.value = "T";

            // 创建并设置bodyInfo输入框
            let bodyInfoInput = document.createElement("input");
            bodyInfoInput.type = "hidden";
            bodyInfoInput.name = "bodyInfo";
            bodyInfoInput.value = JSON.stringify({exportShipper, exportBuyer, contractNo, date});

            // 添加到表单
            form.appendChild(createJsonInput);
            form.appendChild(processFlagInput);
            form.appendChild(bodyInfoInput);
            document.body.appendChild(form);
            form.submit();
            let pageUrl = url.resolveScript({scriptId: "customscript_swc_sl_bgdmergeplatform", deploymentId: "customdeploy_swc_sl_qgdmergeplatform"});
            // 成功后清空selectedArr session
            sessionStorage.removeItem("selectedArr");
            // 禁用离开页面前提示
            window.onbeforeunload = null;
            // 刷新页面
            window.location.href = pageUrl;
            //postToSl(selectedArr);
        }

        /**
         * 生成excel文件的 xml 文本
         * @param dataJson
         * @returns {string}
         */
        function generateExcelString(dataJson){
            let xmlString = '';
            if (SWC_Utils.isEmpty(dataJson)) return xmlString;
            let bodyJson = dataJson.body;
            let orderJson = dataJson.order;
            let isUSA = bodyJson.isUSA || false;
            let title = bodyJson.title || "";
            let shipperAddress = bodyJson.shipperAddress || "";
            let shipperTel = bodyJson.shipperTel || "";
            let to = bodyJson.to || "";
            let contactPerson = bodyJson.contactPerson || "";
            let currencyName = bodyJson.currencyName || "";
            let contractNo = bodyJson.contractNo || "";
            let date = bodyJson.date || "";
            xmlString += '<?xml version="1.0"?>\n';
            xmlString += '<?mso-application progid="Excel.Sheet"?>\n';
            xmlString += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
            xmlString += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
            xmlString += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
            xmlString += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
            xmlString += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
            xmlString += ' <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">\n';
            xmlString += '  <Author></Author>\n';
            xmlString += '  <LastAuthor></LastAuthor>\n';
            xmlString += '  <Created>2015-06-05T18:19:34Z</Created>\n';
            xmlString += '  <LastSaved>2026-02-11T06:04:07Z</LastSaved>\n';
            xmlString += '  <Version>16.00</Version>\n';
            xmlString += ' </DocumentProperties>\n';
            xmlString += ' <OfficeDocumentSettings xmlns="urn:schemas-microsoft-com:office:office">\n';
            xmlString += '  <AllowPNG/>\n';
            xmlString += ' </OfficeDocumentSettings>\n';
            xmlString += ' <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">\n';
            xmlString += '  <WindowHeight>12648</WindowHeight>\n';
            xmlString += '  <WindowWidth>22260</WindowWidth>\n';
            xmlString += '  <WindowTopX>32767</WindowTopX>\n';
            xmlString += '  <WindowTopY>32767</WindowTopY>\n';
            xmlString += '  <ProtectStructure>False</ProtectStructure>\n';
            xmlString += '  <ProtectWindows>False</ProtectWindows>\n';
            xmlString += ' </ExcelWorkbook>\n';
            xmlString += ' <Styles>\n';
            xmlString += '  <Style ss:ID="Default" ss:Name="Normal">\n';
            xmlString += '   <Alignment ss:Vertical="Bottom"/>\n';
            xmlString += '   <Borders/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="11" ss:Color="#000000"/>\n';
            xmlString += '   <Interior/>\n';
            xmlString += '   <NumberFormat/>\n';
            xmlString += '   <Protection/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s80">\n';
            xmlString += '   <Alignment ss:Vertical="Center"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s209">\n';
            xmlString += '   <Alignment ss:Vertical="Center"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s210">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s213">\n';
            xmlString += '   <Alignment ss:Vertical="Center" ss:WrapText="1"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s214">\n';
            xmlString += '   <Alignment ss:Vertical="Center"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s217">\n';
            xmlString += '   <Alignment ss:Vertical="Center"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#1E23F2"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s218">\n';
            xmlString += '   <Alignment ss:Vertical="Center"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#1E23F2"/>\n';
            xmlString += '   <NumberFormat ss:Format="Short Date"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s219">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s220">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s221">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s223">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s224">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s226">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '   <Interior ss:Color="#FFFF00" ss:Pattern="Solid"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s227">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '   <Interior ss:Color="#FFFF00" ss:Pattern="Solid"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s228">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Top"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s229">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Top" ss:WrapText="1"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s230">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s231">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s232">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s234">\n';
            xmlString += '   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#111BEF"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s235">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#111BEF"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s236">\n';
            xmlString += '   <Alignment ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s237">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s238">\n';
            xmlString += '   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s239">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s240">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s241">\n';
            xmlString += '   <Alignment ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s242">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s243">\n';
            xmlString += '   <Alignment ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s244">\n';
            xmlString += '   <Alignment ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#1F2329"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s247">\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s251">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '   <Interior/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s252">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '   <Interior/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s253">\n';
            xmlString += '   <Alignment ss:Vertical="Center"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '   <Interior/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s257">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s258">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s261">\n';
            xmlString += '   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#1E23F2"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s263">\n';
            xmlString += '   <Alignment ss:Vertical="Top"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s265">\n';
            xmlString += '   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#1E23F2"/>\n';
            xmlString += '   <NumberFormat ss:Format="Short Date"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s266">\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s267">\n';
            xmlString += '   <Alignment ss:Horizontal="Left" ss:Vertical="Bottom"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s268">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s269">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '   <Interior ss:Color="#FFFF00" ss:Pattern="Solid"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s270">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s271">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '   <NumberFormat ss:Format="Standard"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s272">\n';
            xmlString += '   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s273">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            xmlString += '   <Borders>\n';
            xmlString += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"\n';
            xmlString += '     ss:Color="#000000"/>\n';
            xmlString += '   </Borders>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#1E23F2"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s274">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s278">\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s281">\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '   <Interior/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s282">\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '   <Interior/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s283">\n';
            xmlString += '   <Alignment ss:Horizontal="Left" ss:Vertical="Top"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '   <Interior/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s284">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '   <Interior/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s285">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Top"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '   <Interior/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s286">\n';
            xmlString += '   <Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"\n';
            xmlString += '    ss:Bold="1"/>\n';
            xmlString += '   <Interior/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s287">\n';
            xmlString += '   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '   <Interior/>\n';
            xmlString += '  </Style>\n';
            xmlString += '  <Style ss:ID="s288">\n';
            xmlString += '   <Alignment ss:Horizontal="Right" ss:Vertical="Top"/>\n';
            xmlString += '   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Color="#000000"/>\n';
            xmlString += '   <Interior/>\n';
            xmlString += '  </Style>\n';
            xmlString += ' </Styles>\n';

            // Packing sheet页 生成开始
            xmlString += ' <Worksheet ss:Name="Packing">\n';
            xmlString += '  <Table ss:ExpandedColumnCount="9999" ss:ExpandedRowCount="9999" x:FullColumns="1"\n';
            xmlString += '   x:FullRows="1" ss:StyleID="s80" ss:DefaultColumnWidth="75.600000000000009"\n';
            xmlString += '   ss:DefaultRowHeight="13.8">\n';
            xmlString += '   <Column ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="21.599999999999998"/>\n';
            xmlString += '   <Column ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="121.8"/>\n';
            xmlString += '   <Column ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="124.2"/>\n';
            xmlString += '   <Column ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="97.2" ss:Span="1"/>\n';
            xmlString += '   <Column ss:Index="6" ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="113.39999999999999"/>\n';
            xmlString += '   <Column ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="118.8"/>\n';
            xmlString += '   <Column ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="90" ss:Span="1"/>\n';
            xmlString += '   <Column ss:Index="10" ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="86.399999999999991" ss:Span="1"/>\n';
            xmlString += '   <Column ss:Index="12" ss:StyleID="s80" ss:Width="66.600000000000009"/>\n';
            xmlString += '   <Column ss:StyleID="s80" ss:Width="65.400000000000006"/>\n';
            xmlString += '   <Column ss:StyleID="s80" ss:Width="63.599999999999994"/>\n';
            xmlString += '   <Column ss:StyleID="s80" ss:Width="63"/>\n';
            xmlString += '   <Column ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="72.599999999999994"/>\n';
            xmlString += '   <Column ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="178.20000000000002"/>\n';
            xmlString += '   <Column ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="97.2"/>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:MergeAcross="10" ss:StyleID="s251"><Data ss:Type="String">' + title + '</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:MergeAcross="10" ss:StyleID="s251"><Data ss:Type="String">PACKING LIST</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:MergeAcross="10" ss:StyleID="s252"><Data ss:Type="String">' + shipperAddress + '</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:MergeAcross="10" ss:StyleID="s252"><Data ss:Type="String">' + shipperTel + '</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:StyleID="s209"/>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:StyleID="s209"/>\n';
            xmlString += '    <Cell ss:StyleID="s253"><Data ss:Type="String">TO : ' + to + '</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s253"/>\n';
            xmlString += '    <Cell ss:StyleID="s253"><Data ss:Type="String">Address:' + contactPerson + '</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s253"/>\n';
            xmlString += '    <Cell ss:StyleID="s209"/>\n';
            xmlString += '    <Cell ss:StyleID="s209"/>\n';
            xmlString += '    <Cell ss:StyleID="s209"/>\n';
            xmlString += '    <Cell ss:StyleID="s253"><Data ss:Type="String">CONTRACT NO: </Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s217"><Data ss:Type="String">' + contractNo + '</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:StyleID="s209"/>\n';
            xmlString += '    <Cell ss:StyleID="s253"><Data ss:Type="String">Contact person: Zuofei FU</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s209"/>\n';
            xmlString += '    <Cell ss:StyleID="s209"><Data ss:Type="String">Tel: 3125327319</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s209"/>\n';
            xmlString += '    <Cell ss:StyleID="s209"/>\n';
            xmlString += '    <Cell ss:StyleID="s209"/>\n';
            xmlString += '    <Cell ss:StyleID="s209"/>\n';
            xmlString += '    <Cell ss:StyleID="s253"><Data ss:Type="String">DATE : </Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s218"><Data ss:Type="String">' + date + '</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:MergeAcross="1" ss:StyleID="s219"/>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:MergeDown="1" ss:StyleID="s223"><Data ss:Type="String">NO.</Data></Cell>\n';
            xmlString += '    <Cell ss:MergeDown="1" ss:StyleID="s223"><Data ss:Type="String">Item NO</Data></Cell>\n';
            xmlString += '    <Cell ss:MergeDown="1" ss:StyleID="s223"><Data ss:Type="String">Size</Data></Cell>\n';
            xmlString += '    <Cell ss:MergeDown="1" ss:StyleID="s223"><Data ss:Type="String">CTNS</Data></Cell>\n';
            xmlString += '    <Cell ss:MergeDown="1" ss:StyleID="s223"><Data ss:Type="String">Quantity</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s224"><Data ss:Type="String">Cartons size</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s224"><Data ss:Type="String">Volume</Data></Cell>\n';
            xmlString += '    <Cell ss:MergeAcross="1" ss:StyleID="s224"><Data ss:Type="String">Weight</Data></Cell>\n';
            xmlString += '    <Cell ss:MergeAcross="1" ss:StyleID="s224"><Data ss:Type="String">Total Weight</Data></Cell>\n';
            if (isUSA){
                xmlString += '    <Cell ss:MergeAcross="4" ss:StyleID="s226"><Data ss:Type="String">STEEL/ALUMINUM</Data></Cell>\n';
                xmlString += '    <Cell ss:MergeDown="1" ss:StyleID="s227"><Data ss:Type="String">County of steel/aluminum was made</Data></Cell>\n';
            }
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="31.200000000000003">\n';
            xmlString += '    <Cell ss:Index="6" ss:StyleID="s228"><Data ss:Type="String">（ M M ）</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s228"><Data ss:Type="String">（m3）</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s229"><Data ss:Type="String">NW (kgs)</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s229"><Data ss:Type="String">GW(kgs)</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s229"><Data ss:Type="String">NW (kgs)</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s229"><Data ss:Type="String">GW(kgs)</Data></Cell>\n';
            if (isUSA){
                xmlString += '    <Cell ss:StyleID="s230"><Data ss:Type="String">NW/piece</Data></Cell>\n';
                xmlString += '    <Cell ss:StyleID="s230"><Data ss:Type="String">GW/piece</Data></Cell>\n';
                xmlString += '    <Cell ss:StyleID="s230"><Data ss:Type="String">NW/Total</Data></Cell>\n';
                xmlString += '    <Cell ss:StyleID="s230"><Data ss:Type="String">GW/Total</Data></Cell>\n';
                xmlString += '    <Cell ss:StyleID="s231"><Data ss:Type="String">Percentage</Data></Cell>\n';
            }
            xmlString += '   </Row>\n';

            // Packing sheet页行信息 输出开始
            for (let orderId in orderJson){
                let orderDetailJson = orderJson[orderId];
                let orderBodyJson = orderDetailJson.body;
                let lineJson = orderDetailJson.line;
                let packingIndex = 0;
                let packingCtnsTotal = 0;
                let packingQtyTotal = 0;
                let packingVlumeoTotal = 0;
                let packingNWTotal = 0;
                let packingGWTotal = 0;
                for (let sku in lineJson){
                    packingIndex++;
                    let skuJson = lineJson[sku];
                    let ctns = skuJson.ctns;
                    let quantity = skuJson.quantity;
                    let vlumeo = skuJson.vlumeo;
                    let totalWeightNW = skuJson.totalWeightNW;
                    let totalWeightGW = skuJson.totalWeightGW;
                    packingCtnsTotal = SWC_Utils.addSumIsNumber(packingCtnsTotal, Number(ctns));
                    packingQtyTotal = SWC_Utils.addSumIsNumber(packingQtyTotal, Number(quantity));
                    packingVlumeoTotal = SWC_Utils.addSumIsNumber(packingVlumeoTotal, Number(vlumeo));
                    packingNWTotal = SWC_Utils.addSumIsNumber(packingNWTotal, Number(totalWeightNW));
                    packingGWTotal = SWC_Utils.addSumIsNumber(packingGWTotal, Number(totalWeightGW));
                    xmlString += '   <Row ss:Height="15.600000000000001">\n';
                    xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="Number">' + packingIndex + '</Data></Cell>\n'; // NO.
                    xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="String">' + skuJson.itemNo + '</Data></Cell>\n'; // Item NO
                    xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="String">' + skuJson.size + '</Data></Cell>\n'; // Size
                    xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="Number">' + ctns + '</Data></Cell>\n'; // CTNS
                    xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="Number">' + quantity + '</Data></Cell>\n'; // Quantity
                    xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="String">' + skuJson.cartonsSize + '</Data></Cell>\n'; // Cartons size（ M M ）
                    xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="Number">' + vlumeo + '</Data></Cell>\n'; // Vlumeo（m3）
                    xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="Number">' + skuJson.weightNW + '</Data></Cell>\n'; // Weight NW (kgs)
                    xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="Number">' + skuJson.weightGW + '</Data></Cell>\n'; // Weight GW(kgs)
                    xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="Number">' + totalWeightNW + '</Data></Cell>\n'; // Total Weight NW (kgs)
                    xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="Number">' + totalWeightGW + '</Data></Cell>\n'; // Total Weight GW(kgs)
                    if (isUSA){
                        xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="String">' + skuJson.NWPiece + '</Data></Cell>\n'; // STEEL/ALUMINUM NW/piece
                        xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="String">' + skuJson.GWPiece + '</Data></Cell>\n'; // STEEL/ALUMINUM GW/piece
                        xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="String">' + skuJson.NWTotal + '</Data></Cell>\n'; // STEEL/ALUMINUM NW/Total
                        xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="String">' + skuJson.GWTotal + '</Data></Cell>\n'; // STEEL/ALUMINUM GW/Total
                        xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="String">' + skuJson.percentage + '</Data></Cell>\n'; // STEEL/ALUMINUM Percentage
                        xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="String">' + skuJson.county + '</Data></Cell>\n'; // County of steel/aluminum was made
                    }
                    xmlString += '   </Row>\n';
                }

                // 合计行 开始
                xmlString += '   <Row ss:Height="15.600000000000001">\n';
                xmlString += '    <Cell ss:MergeAcross="2" ss:StyleID="s234"><Data ss:Type="String">TOTAL AMOUNT：</Data></Cell>\n';
                xmlString += '    <Cell ss:StyleID="s235"><Data ss:Type="Number">' + packingCtnsTotal + '</Data></Cell>\n';
                xmlString += '    <Cell ss:StyleID="s235"><Data ss:Type="Number">' + packingQtyTotal + '</Data></Cell>\n';
                xmlString += '    <Cell ss:StyleID="s235"/>\n';
                xmlString += '    <Cell ss:StyleID="s235"><Data ss:Type="Number">' + packingVlumeoTotal + '</Data></Cell>\n';
                xmlString += '    <Cell ss:StyleID="s235"/>\n';
                xmlString += '    <Cell ss:StyleID="s235"/>\n';
                xmlString += '    <Cell ss:StyleID="s235"><Data ss:Type="Number">' + packingNWTotal + '</Data></Cell>\n';
                xmlString += '    <Cell ss:StyleID="s235"><Data ss:Type="Number">' + packingGWTotal + '</Data></Cell>\n';
                if (isUSA){
                    xmlString += '    <Cell ss:StyleID="s235"/>\n';
                    xmlString += '    <Cell ss:StyleID="s235"/>\n';
                    xmlString += '    <Cell ss:StyleID="s235"/>\n';
                    xmlString += '    <Cell ss:StyleID="s235"/>\n';
                    xmlString += '    <Cell ss:StyleID="s236"/>\n';
                    xmlString += '    <Cell ss:StyleID="s236"/>\n';
                }
                xmlString += '   </Row>\n';
                // 合计行 结束

                // 箱号 封条号 spo 行 开始
                xmlString += '   <Row ss:Height="15.600000000000001">\n';
                xmlString += '    <Cell ss:StyleID="s232"></Cell>\n';
                xmlString += '    <Cell ss:MergeAcross="1" ss:StyleID="s237"><Data ss:Type="String">Container NO:' + orderBodyJson.containerNumber + '</Data></Cell>\n';
                // xmlString += '    <Cell ss:StyleID="s238"><Data ss:Type="String">' + bodyJson.containerNumber + '</Data></Cell>\n';
                // xmlString += '    <Cell ss:StyleID="s239"/>\n';
                xmlString += '    <Cell ss:MergeAcross="1" ss:StyleID="s240"><Data ss:Type="String">Seal NO:' + orderBodyJson.sealNumber + '</Data></Cell>\n';
                // xmlString += '    <Cell ss:StyleID="s241"><Data ss:Type="String">' + bodyJson.sealNumber + '</Data></Cell>\n';
                xmlString += '    <Cell ss:MergeAcross="1" ss:StyleID="s242"><Data ss:Type="String">SPO:' + orderBodyJson.spo + '</Data></Cell>\n';
                // xmlString += '    <Cell ss:StyleID="s243"><Data ss:Type="String">' + spo + '</Data></Cell>\n';
                xmlString += '    <Cell ss:MergeAcross="3" ss:StyleID="s243"></Cell>\n';
                // xmlString += '    <Cell ss:StyleID="s240"/>\n';
                // xmlString += '    <Cell ss:StyleID="s238"/>\n';
                // xmlString += '    <Cell ss:StyleID="s244"/>\n';
                if (isUSA){
                    xmlString += '    <Cell ss:StyleID="s240"/>\n';
                    xmlString += '    <Cell ss:StyleID="s240"/>\n';
                    xmlString += '    <Cell ss:StyleID="s240"/>\n';
                    xmlString += '    <Cell ss:StyleID="s240"/>\n';
                    xmlString += '    <Cell ss:StyleID="s244"/>\n';
                    xmlString += '    <Cell ss:StyleID="s244"/>\n';
                }
                xmlString += '   </Row>\n';
                // 箱号 封条号 spo 行 结束
            }
            // Packing sheet页行信息 输出结束

            xmlString += '  </Table>\n';
            xmlString += '  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n';
            xmlString += '   <PageSetup>\n';
            xmlString += '    <Header x:Margin="0.3"/>\n';
            xmlString += '    <Footer x:Margin="0.3"/>\n';
            xmlString += '    <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>\n';
            xmlString += '   </PageSetup>\n';
            xmlString += '   <Selected/>\n';
            xmlString += '   <Panes>\n';
            xmlString += '    <Pane>\n';
            xmlString += '     <Number>3</Number>\n';
            xmlString += '     <RangeSelection>R1C1:R1C11</RangeSelection>\n';
            xmlString += '    </Pane>\n';
            xmlString += '   </Panes>\n';
            xmlString += '   <ProtectObjects>False</ProtectObjects>\n';
            xmlString += '   <ProtectScenarios>False</ProtectScenarios>\n';
            xmlString += '  </WorksheetOptions>\n';
            xmlString += ' </Worksheet>\n';
            // Packing sheet页 生成结束

            // Invoice sheet页 生成开始
            xmlString += ' <Worksheet ss:Name="Invoice">\n';
            xmlString += '  <Table ss:ExpandedColumnCount="9999" ss:ExpandedRowCount="9999" x:FullColumns="1"\n';
            xmlString += '   x:FullRows="1" ss:StyleID="s80" ss:DefaultColumnWidth="75.600000000000009"\n';
            xmlString += '   ss:DefaultRowHeight="13.8">\n';
            xmlString += '   <Column ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="124.2" ss:Span="3"/>\n';
            xmlString += '   <Column ss:Index="5" ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="210.6"\n';
            xmlString += '    ss:Span="4"/>\n';
            xmlString += '   <Column ss:Index="10" ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="135"\n';
            xmlString += '    ss:Span="1"/>\n';
            xmlString += '   <Column ss:Index="12" ss:StyleID="s80" ss:AutoFitWidth="0" ss:Width="156.6"/>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:MergeAcross="6" ss:StyleID="s286"><Data ss:Type="String">' + title + '</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:MergeAcross="6" ss:StyleID="s210"><Data ss:Type="String">COMMERCIAL INVOICE</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:MergeAcross="6" ss:StyleID="s284"><Data ss:Type="String">' + shipperAddress + '</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:MergeAcross="6" ss:StyleID="s285"><Data ss:Type="String">' + shipperTel + '</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:StyleID="s257"/>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:StyleID="s282"><Data ss:Type="String">TO : ' + to + '</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s209"/>\n';
            xmlString += '    <Cell ss:StyleID="s253"><Data ss:Type="String">Address:' + contactPerson + '</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s209"/>\n';
            xmlString += '    <Cell ss:Index="6" ss:StyleID="s287"><Data ss:Type="String">CONTRACT NO: </Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s261"><Data ss:Type="String">' + contractNo + '</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row>\n';
            xmlString += '    <Cell ss:MergeAcross="1" ss:StyleID="s283"><Data ss:Type="String">Contact person: Zuofei FU</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s263"><Data ss:Type="String">Tel: 3125327319</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s263"/>\n';
            xmlString += '    <Cell ss:Index="6" ss:StyleID="s288"><Data ss:Type="String">DATE : </Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s265"><Data ss:Type="String">' + date + '</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="15.600000000000001">\n';
            xmlString += '    <Cell ss:StyleID="s257"/>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:Height="93.600000000000009">\n';
            xmlString += '    <Cell ss:StyleID="s268"><Data ss:Type="String">ITEM CODE</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s268"><Data ss:Type="String">DESCRIPTION</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s268"><Data ss:Type="String">SIZE</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s268"><Data ss:Type="String">FOB ' + currencyName + ' PRICE</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s268"><Data ss:Type="String">TOTAL QUANTITY (PCS)</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s268"><Data ss:Type="String">TOTAL AMOUNT ' + currencyName + ' PRICE</Data></Cell>\n';
            xmlString += '    <Cell ss:StyleID="s268"><ss:Data ss:Type="String"\n';
            xmlString += '      xmlns="http://www.w3.org/TR/REC-html40"><B><Font html:Face="Calibri"\n';
            xmlString += '        x:Family="Swiss" html:Color="#000000">Remark</Font></B></ss:Data></Cell>\n';
            if (isUSA){
                xmlString += '    <Cell ss:StyleID="s269"><Data ss:Type="String">STEEL/ALUMINUM&#10;' + currencyName + ' PRICE</Data></Cell>\n';
                xmlString += '    <Cell ss:StyleID="s269"><Data ss:Type="String">STEEL/ALUMINUM TOTAL AMOUNT ' + currencyName + '</Data></Cell>\n';
                xmlString += '    <Cell ss:StyleID="s269"><Data ss:Type="String">NON STEEL/ALUMINUM&#10;TOTAL AMOUNT&#10;' + currencyName + '</Data></Cell>\n';
            }
            xmlString += '   </Row>\n';

            // Invoice sheet页行信息 输出开始
            for (let orderId in orderJson){
                let orderDetailJson = orderJson[orderId];
                let orderBodyJson = orderDetailJson.body;
                let lineJson = orderDetailJson.line;
                let invoiceQtyTotal = 0;
                let invoiceUSDAmtTotal = 0;
                for (let sku in lineJson){
                    let skuJson = lineJson[sku];
                    let quantity = skuJson.quantity;
                    let amountUSDPrice = skuJson.amountUSDPrice;
                    invoiceQtyTotal = SWC_Utils.addSumIsNumber(invoiceQtyTotal, Number(quantity));
                    invoiceUSDAmtTotal = SWC_Utils.addSumIsNumber(invoiceUSDAmtTotal, Number(amountUSDPrice));
                    xmlString += '   <Row ss:Height="15.600000000000001">\n';
                    xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="String">' + skuJson.itemNo + '</Data></Cell>\n'; // ITEM CODE
                    xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="String"></Data></Cell>\n'; // DESCRIPTION
                    xmlString += '    <Cell ss:StyleID="s232"><Data ss:Type="String">' + skuJson.size + '</Data></Cell>\n'; // SIZE
                    xmlString += '    <Cell ss:StyleID="s270"><Data ss:Type="Number">' + skuJson.fobUSDPrice + '</Data></Cell>\n'; // FOB USD PRICE
                    xmlString += '    <Cell ss:StyleID="s270"><Data ss:Type="Number">' + quantity + '</Data></Cell>\n'; // TOTAL QUANTITY (PCS)
                    xmlString += '    <Cell ss:StyleID="s271"><Data ss:Type="Number">' + amountUSDPrice + '</Data></Cell>\n'; // AMOUNT USD PRICE
                    xmlString += '    <Cell ss:StyleID="s270"><Data ss:Type="String">' + skuJson.remark + '</Data></Cell>\n'; // Remark（根据“SKU和HS code映射”取得 HTS（国外清关））
                    if (isUSA){
                        xmlString += '    <Cell ss:StyleID="s270"><Data ss:Type="String">' + skuJson.SOrALUSDPrice + '</Data></Cell>\n'; // STEEL/ALUMINUM USD PRICE
                        xmlString += '    <Cell ss:StyleID="s270"><Data ss:Type="String">' + skuJson.SOrALTotalUSDAmount + '</Data></Cell>\n'; // STEEL/ALUMINUM TOTAL AMOUNT USD
                        xmlString += '    <Cell ss:StyleID="s270"><Data ss:Type="String">' + skuJson.NonSAndALTotalUSDAmount + '</Data></Cell>\n'; // NON STEEL/ALUMINUM TOTAL AMOUNT USD
                    }
                    xmlString += '   </Row>\n';
                }

                // 合计行 开始
                xmlString += '   <Row ss:Height="15.600000000000001">\n';
                xmlString += '    <Cell ss:MergeAcross="3" ss:StyleID="s272"><Data ss:Type="String">TOTAL AMOUNT:</Data></Cell>\n';
                xmlString += '    <Cell ss:StyleID="s273"><Data ss:Type="Number">' + invoiceQtyTotal + '</Data></Cell>\n';
                xmlString += '    <Cell ss:StyleID="s273"><Data ss:Type="Number">' + invoiceUSDAmtTotal + '</Data></Cell>\n';
                xmlString += '    <Cell ss:StyleID="s268"/>\n';
                if (isUSA){
                    xmlString += '    <Cell ss:StyleID="s273"/>\n';
                    xmlString += '    <Cell ss:StyleID="s273"/>\n';
                    xmlString += '    <Cell ss:StyleID="s273"/>\n';
                }
                // xmlString += '    <Cell ss:Index="12" ss:StyleID="s209"/>\n';
                xmlString += '   </Row>\n';
                // 合计行 结束

                // spo行 开始
                xmlString += '   <Row ss:AutoFitHeight="0" ss:Height="19.05">\n';
                xmlString += '    <Cell ss:StyleID="s257"/>\n';
                xmlString += '    <Cell ss:StyleID="s257"/>\n';
                xmlString += '    <Cell ss:StyleID="s257"/>\n';
                xmlString += '    <Cell ss:StyleID="s257"/>\n';
                xmlString += '    <Cell ss:StyleID="s257"/>\n';
                xmlString += '    <Cell ss:StyleID="s257"/>\n';
                xmlString += '    <Cell ss:StyleID="s278"><Data ss:Type="String">SPO:' + orderBodyJson.spo + '</Data></Cell>\n';
                xmlString += '   </Row>\n';
                // spo行 结束
            }

            // Invoice sheet页行信息 输出结束

            xmlString += '   <Row ss:AutoFitHeight="0" ss:Height="19.05">\n';
            xmlString += '    <Cell ss:StyleID="s281"><Data ss:Type="String">Remarks:</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:AutoFitHeight="0" ss:Height="19.05">\n';
            xmlString += '    <Cell ss:StyleID="s282"><Data ss:Type="String">1.TERM OF PAYMENT : By T/T 100% after finish goods</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:AutoFitHeight="0" ss:Height="19.05">\n';
            xmlString += '    <Cell ss:StyleID="s282"><Data ss:Type="String">2.Delivery Date: About 20 days</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:AutoFitHeight="0" ss:Height="19.05">\n';
            xmlString += '    <Cell ss:StyleID="s282"><Data ss:Type="String">3.Packing Standard: according to customer\'s design</Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '   <Row ss:AutoFitHeight="0" ss:Height="19.05">\n';
            xmlString += '    <Cell ss:StyleID="s278"><Data ss:Type="String"></Data></Cell>\n';
            xmlString += '   </Row>\n';
            xmlString += '  </Table>\n';
            xmlString += '  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n';
            xmlString += '   <PageSetup>\n';
            xmlString += '    <Header x:Margin="0.3"/>\n';
            xmlString += '    <Footer x:Margin="0.3"/>\n';
            xmlString += '    <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>\n';
            xmlString += '   </PageSetup>\n';
            xmlString += '   <Panes>\n';
            xmlString += '    <Pane>\n';
            xmlString += '     <Number>3</Number>\n';
            xmlString += '     <ActiveRow>16</ActiveRow>\n';
            xmlString += '     <ActiveCol>4</ActiveCol>\n';
            xmlString += '    </Pane>\n';
            xmlString += '   </Panes>\n';
            xmlString += '   <ProtectObjects>False</ProtectObjects>\n';
            xmlString += '   <ProtectScenarios>False</ProtectScenarios>\n';
            xmlString += '  </WorksheetOptions>\n';
            xmlString += ' </Worksheet>\n';
            // Invoice sheet页 生成结束

            xmlString += '</Workbook>\n';

            return xmlString;
        }

        /**
         * 根据内部id 获取 清关发货人 信息
         * @param exportShipper
         * @returns {string|*|string}
         */
        function getShipperInfoById(exportShipper){
            let contractNo = "";
            let sql = `SELECT CUSTOMRECORD_SWC_QG_SHIPPER.custrecord_swc_qg_shipper_xx AS custrecord_swc_qg_shipper_xx FROM CUSTOMRECORD_SWC_QG_SHIPPER WHERE NVL(CUSTOMRECORD_SWC_QG_SHIPPER.isinactive, 'F') = 'F' AND CUSTOMRECORD_SWC_QG_SHIPPER."ID" IN (${exportShipper})`;
            let results = SWC_Utils.getAllSqlResults(sql);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return contractNo;
            contractNo = results[0].custrecord_swc_qg_shipper_xx;
            return contractNo;
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            saveRecord: saveRecord,
            nextPage: nextPage,
            lastPage: lastPage,
            selectAll: selectAll,
            deSelectAll: deSelectAll,
            createBGD: createBGD,
            mergeQGD: mergeQGD,
            generateExcelString: generateExcelString
        };

    });
