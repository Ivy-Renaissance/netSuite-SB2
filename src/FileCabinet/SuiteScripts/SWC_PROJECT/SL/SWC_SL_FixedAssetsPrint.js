/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope public
 */
var PAGE_NUM = 50 //每页显示多少条数据
define(['N/file', 'N/format', 'N/record', 'N/runtime', 'N/search', 'N/ui/serverWidget', "../APP/WMSUtils", '../common/SWCUtils','../lib/juicerTemplateEngine'],//, '../'

    (file, format, record, runtime, search, serverWidget, WMSUtils, SWCUtils) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            var options = {};
            options.request = scriptContext.request;
            options.parameters = options.request.parameters;
            var response = scriptContext.response;
            var priData = options.parameters["priData"];

            // 打印PDF
            if (priData && JSON.parse(priData)["type"] == "print") {
                log.audit("priData", priData)
                printLable(priData, response);
                return false;
            }
            options.form = serverWidget.createForm({
                title: "固定资产标识卡打印" // WMSUtils.getWMSTranslation({type:"element",key: 'BINPRINT'})
            });
            log.audit("pa", options.parameters);
            options.form.clientScriptModulePath = "../CS/SWC_CS_FixedAssetsPrint";
            // 数据待查询
            var data = [];
            // 创建body
            bodyCreate(options);
            // 查询数据(子公司和仓库不为空时查询)
            try {
                data = queryData(options);
            } catch (e) {
                log.audit("error", e);
            }
            // 创建list
            listCreaate(options);
            // 子列表赋值
            pageAssignment(data, options);
            // 固定子列表头
            addHideFloatElements(options.form);
            scriptContext.response.writePage({
                pageObject: options.form
            });
        }

        function printLable(priData,response) {
            priData = JSON.parse(priData);
            var data = priData["data"] || [];
            if(data){
                try {
                    var priLoad = record.load({type: "customrecord_swc_xlbb_printdata", id: data});
                    var barcodes = JSON.parse(priLoad.getValue({fieldId: "custrecord_swpd_print"}));
                    record.delete({type: "customrecord_swc_xlbb_printdata", id: data});
                    log.audit("barcodes", barcodes);
                    var barcodesTmpl = file.load({id: "../../HTML/fixedAssets"});
                    var xmlStr = barcodesTmpl.getContents();
                    xmlStr = juicer(xmlStr, {barcodes: barcodes});
                    response.renderPdf({xmlString: xmlStr});
                } catch (e) {
                    log.audit("e", e)
                    return false;
                }
            }
        }

        function printDataQuery(data,locationName,locationNum) {
            var barcodes = [];
            var filters = [['internalid', 'anyof', Object.keys(data)]];
            const binSearchColBinNumber = search.createColumn({ name: 'binnumber' });
            const binSearchColWMSRUYKG = search.createColumn({ name: 'custrecord_swc_wms_zone' });
            const binSearchColUQJFD = search.createColumn({ name: 'memo' });
            const binSearchColWMSZALVN = search.createColumn({ name: 'custrecord_swc_wms_arrow_direction' });

            const binSearch = search.create({
                type: 'bin',
                filters: filters,
                columns: [
                    binSearchColBinNumber,
                    binSearchColWMSRUYKG,
                    binSearchColUQJFD,
                    binSearchColWMSZALVN,
                ],
            });
            var result = getAllSearchObj(binSearch);
            for (var i = 0; i < result.length; i++) {
                var binid = result[i].getValue({name: 'internalid'})//内部ID
                var binNum = result[i].getValue({name: 'binnumber'})//库位名称
                var arrow = data[binid];
                barcodes.push({
                    locationName:locationName,
                    locationNum:locationNum,
                    binid:binid,
                    binNum:binNum,
                    arrow:arrow,
                    bin:locationNum + "_" + binid
                })
            }
            return barcodes;
        }

        /**
         * 创建body
         * @param options
         */
        function bodyCreate(options) {
            // 打印
            options.form.addButton({id: 'custpage_data_submit', label: 'PRINT', functionName: 'submitData'});
            // 查询
            options.form.addButton({id: 'custpage_data_query', label: 'SEARCH', functionName: 'searchData'});
            // 查询条件
            options.form.addFieldGroup({id: "custpage_group_srch_cond", label: 'CONDITION', tab: "", isCollapsible: true});
            // 资产类型
            options.form.addField({id: 'custpage_type', type: serverWidget.FieldType.SELECT, source: "customrecord_ncfar_assettype", label: "资产类型", container: 'custpage_group_srch_cond'});
            // 资产状态
            options.form.addField({id: 'custpage_status', type: serverWidget.FieldType.SELECT, source: "customlist_ncfar_assetstatus", label: "资产状态", container: 'custpage_group_srch_cond'});
            // 屏幕加载遮罩
            var html = options.form.addField({id: 'custpage_html', type: serverWidget.FieldType.INLINEHTML, label: 'a',container: 'custpage_group_srch_cond'})
            html.defaultValue = '<div id="timeoutblocker" style="position: absolute; z-index: 10000; top: 0px; left: 0px; height: 100%; width: 100%; margin: 5px 0px; background-color: rgb(155, 155, 155); opacity: 0.6;"><span style="width:100%;height:100%;line-height:700px;text-align:center;display:block;font-weight: bold; color: red">' + 'PLEASEWAITE' + '</span></div>'

            try {
                options.form.updateDefaultValues({
                    custpage_type: options.parameters["custpage_type"], // 资产类型
                    custpage_status: options.parameters["custpage_status"], // 资产状态
                });
            }catch (e) {
                log.audit("seterror",e.message);
            }
        }

        /**
         * 创建列表
         * @param options
         */
        function listCreaate(options){
            var sublistTotal = options.totalcount || "0" //结果总条数
            var sublistName = "明细：共" + sublistTotal + "条";
            options.sublist=options.form.addSublist({id: 'custpage_sublist_detail', type: serverWidget.SublistType.LIST, label:sublistName});
            // 全选
            options.sublist.addButton({id : 'custpage_sublist_btn_selectall', label: "SELECTAll", functionName: "selectAll"});
            // 取消全选
            options.sublist.addButton({id : 'custpage_sublist_btn_deselectall', label: "CANCELALL", functionName: "deselectAll"});
            // 选择
            options.sublist.addField({id: 'sub_checkbox', type: serverWidget.FieldType.CHECKBOX, label: "SELECT"});
            // 名称
            options.sublist.addField({id: 'sub_name', type: serverWidget.FieldType.TEXT,label: "名称"});
            // 编号
            options.sublist.addField({id: 'sub_code', type: serverWidget.FieldType.TEXT,label: "编号"});
            // 规格型号
            options.sublist.addField({id: 'sub_model', type: serverWidget.FieldType.TEXT,label: "规格型号"});
            // 类型
            options.sublist.addField({id: 'sub_type', type: serverWidget.FieldType.TEXT,label: "类型"});
            // 状态
            options.sublist.addField({id: 'sub_status', type: serverWidget.FieldType.TEXT,label: "状态"});
            // 数量
            options.sublist.addField({id: 'sub_quantity', type: serverWidget.FieldType.TEXT,label: "数量"});
        }

        /**
         * 查询数据
         * @param options
         * @returns []
         */
        function queryData(options) {
            var type = options.parameters["custpage_type"];
            var status = options.parameters["custpage_status"];
            var filters = [];
            if (type) {
                SWCUtils.addFilter(filters, ["custrecord_assettype", "anyof", type]);
            }
            if (status) {
                SWCUtils.addFilter(filters, ["custrecord_assetstatus", "anyof", status]);
            }

            const famAssetSearchColAltName = search.createColumn({name: 'altname'});
            const famAssetSearchColName = search.createColumn({name: 'name', sort: search.Sort.ASC});
            ////4月22
            // const famAssetSearchColWVHHA = search.createColumn({name: 'custrecord_swc_model'});
            const famAssetSearchColEXLRH = search.createColumn({name: 'custrecord_assettype'});
            const famAssetSearchColGZVSF = search.createColumn({name: 'custrecord_assetstatus'});
            const famAssetSearchColJKFJP = search.createColumn({name: 'custrecord_ncfar_quantity'});

            const famAssetSearch = search.create({
                type: 'customrecord_ncfar_asset',
                filters,
                columns: [
                    famAssetSearchColAltName,
                    famAssetSearchColName,
                    // famAssetSearchColWVHHA,
                    famAssetSearchColEXLRH,
                    famAssetSearchColGZVSF,
                    famAssetSearchColJKFJP,
                ],
            });

            var arr = [];
            var result = getAllSearchObj(famAssetSearch);
            for (var i = 0; i < result.length; i++) {
                var obj = {};
                obj['name'] = result[i].getValue({name: 'altname'}) || "" // 名称
                //4月22
                // obj['code'] = result[i].getValue({name: 'custrecord_swc_wms_zone'}) || "" // 编号
                // obj['model'] = result[i].getValue({name: 'memo'}) || "" // 规格型号
                obj['type'] = result[i].getText({name: 'custrecord_assettype'}) || "" // 类型
                obj['status'] = result[i].getText({name: 'custrecord_assetstatus'}) || "" // 状态
                obj['quantity'] = result[i].getValue({name: 'custrecord_ncfar_quantity'}) || "" // 数量
                arr.push(obj);
            }
            options.totalcount = arr.length;
            return arr;
        }

        /**
         * 行数据赋值
         * @param workData
         * @param options
         */
        function pageAssignment(workData,options) {
            try {
                log.audit('data',JSON.stringify(workData));
                for (var i = 0; i < workData.length; i++) {
                    // 名称
                    if (workData[i]["name"]) options.sublist.setSublistValue({
                        id: 'sub_name',
                        line: i,
                        value: workData[i]["name"]
                    });
                    // 编号
                    if (workData[i]["code"]) options.sublist.setSublistValue({
                        id: 'sub_code',
                        line: i,
                        value: workData[i]["code"]
                    });
                    // 规格型号
                    if (workData[i]["model"]) options.sublist.setSublistValue({
                        id: 'sub_model',
                        line: i,
                        value: workData[i]["model"]
                    });
                    // 类型
                    if (workData[i]["type"]) options.sublist.setSublistValue({
                        id: 'sub_type',
                        line: i,
                        value: workData[i]["type"]
                    });
                    // 状态
                    if (workData[i]["status"]) options.sublist.setSublistValue({
                        id: 'sub_status',
                        line: i,
                        value: workData[i]["status"]
                    });
                    // 数量
                    if (workData[i]["quantity"]) options.sublist.setSublistValue({
                        id: 'sub_quantity',
                        line: i,
                        value: workData[i]["quantity"]
                    });
                }
            }catch (e) {
                log.audit("赋值失败",e);
            }
        }

        /**
         * 如果选择了装配件过滤条件查询所有符合条件的工单内部Id
         * @param assembly 装配件
         * @returns {*[]}
         */
        function assemblyQuery(assembly) {
            var internalIdArr = [];
            var workorderSearchObj = search.create({
                type: "workorder",
                filters:
                    [
                        ["mainline","is","T"],
                        "AND",
                        ["type","anyof","WorkOrd"],
                        "AND",
                        ["item","anyof",assembly]
                    ],
                columns:
                    [
                        search.createColumn({name: "trandate", sort: search.Sort.ASC, label: "日期"}),
                        search.createColumn({name: "tranid", sort: search.Sort.ASC, label: "工单号"}),
                        search.createColumn({name: "displayname", join: "item", label: "装配件名称"}),
                        search.createColumn({name: "itemid", join: "item", label: "装配件编号"}),
                        search.createColumn({name: "internalid", join: "item", label: "内部 ID"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });
            var result = getAllSearchObj(workorderSearchObj);
            for (var i = 0; i < result.length; i++) {
                var internalId = result[i].getValue({name: "internalid", label: "内部 ID"});
                internalIdArr.push(internalId);
            }
            return internalIdArr;
        }

        /**
         * 查询装配件数据
         * @param internalidArr
         * @returns {*[]}
         */
        function assemblyQueryAll(internalidArr) {
            var obj = {};
            var filters = [["mainline","is","T"],
                "AND",
                ["type","anyof","WorkOrd"],
                "AND",
                ["applyingtransaction","anyof","@NONE@"],
                "AND",
                ["internalid","anyof",internalidArr]];

            var workorderSearchObj = search.create({
                type: "workorder",
                filters:filters,
                columns:
                    [
                        search.createColumn({name: "displayname", join: "item", label: "物料名称"}),
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "itemid", join: "item", label: "名称"}),
                        search.createColumn({name: "internalid", join: "item", label: "内部 ID"}),
                    ]
            });
            var result = getAllSearchObj(workorderSearchObj);
            for (var i = 0; i < result.length; i++) {
                var assemblyName = result[i].getValue({name: "displayname", join: "item", label: "物料名称"});
                var assemblyId = result[i].getValue({name: "internalid", join: "item", label: "内部 ID"});
                var assemblyNum = result[i].getValue({name: "itemid", join: "item", label: "名称"});
                var id = result[i].getValue({name: "internalid", label: "内部 ID"});
                obj[id] = {assemblyName:assemblyName,assemblyId:assemblyId,assemblyNum:assemblyNum}
            }
            return obj;
        }

        /**
         * 查询地点数据并给行上和body上的发料仓库列表添加值
         * @param options
         */
        function locationQuery(options) {
            var locationSearchObj = search.create({
                type: "location",
                filters:
                    [
                        ['isinactive', 'is', 'F'],
                        "AND",
                        ["subsidiary","anyof",options.parameters["custpage_subsidiary"]]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "name", sort: search.Sort.ASC, label: "名称"})
                    ]
            });
            var result = getAllSearchObj(locationSearchObj);
            var value = "";
            var text = "";
            options.locationField.addSelectOption({value:"", text:""});
            for (var i = 0; i < result.length; i++) {
                value = result[i].getValue({name: "internalid", label: "内部 ID"});
                text = result[i].getValue({name: "name", sort: search.Sort.ASC, label: "名称"});
                options.locationField.addSelectOption({value:value, text:text,isSelected:false});
            }
        }

        function addHideFloatElements(form) {
            try {
                var tmpHtmlVal = '';
                tmpHtmlVal = tmpHtmlVal + '<script>window.addEventListener("load",function(e){';
                tmpHtmlVal = tmpHtmlVal + '    jQuery("#custpage_sublist_detail_layer").on("DOMNodeInserted",function(e){resizeSublist()});';
                tmpHtmlVal = tmpHtmlVal + '    resizeSublist();';
                tmpHtmlVal = tmpHtmlVal + '});';
                tmpHtmlVal = tmpHtmlVal + 'function resizeSublist() {';
                tmpHtmlVal = tmpHtmlVal + '(function ($, undefined) {';
                tmpHtmlVal = tmpHtmlVal + '    $(function () {';
                tmpHtmlVal = tmpHtmlVal + '        const windowHPCHeight = $(window).height() * Number(0.54);';
                tmpHtmlVal = tmpHtmlVal + '        $(\'.uir-machine-table-container\').filter((index, elem) => $(elem).height() > windowHPCHeight)';
                tmpHtmlVal = tmpHtmlVal + '            .css(\'height\', \'54vh\')';
                tmpHtmlVal = tmpHtmlVal + '            .bind(\'scroll\',';
                tmpHtmlVal = tmpHtmlVal + '                (event) => {';
                tmpHtmlVal = tmpHtmlVal + '                    const headerElem = $(event.target).find(\'.uir-machine-headerrow\');';
                tmpHtmlVal = tmpHtmlVal + '                    headerElem.css(\'transform\', `translate(0, ${event.target.scrollTop}px)`);';
                tmpHtmlVal = tmpHtmlVal + '                }';
                tmpHtmlVal = tmpHtmlVal + '            )';
                tmpHtmlVal = tmpHtmlVal + '            .bind(\'scroll\',';
                tmpHtmlVal = tmpHtmlVal + '                (event) => {';
                tmpHtmlVal = tmpHtmlVal + '                    const headerElem = $(event.target).find(\'.uir-list-headerrow\');';
                tmpHtmlVal = tmpHtmlVal + '                    headerElem.css(\'transform\', `translate(0, ${event.target.scrollTop}px)`);';
                tmpHtmlVal = tmpHtmlVal + '                }';
                tmpHtmlVal = tmpHtmlVal + '            )';
                tmpHtmlVal = tmpHtmlVal + '    });';
                tmpHtmlVal = tmpHtmlVal + '})(window.NS.jQuery);';
                tmpHtmlVal = tmpHtmlVal + '}</script>';

                form.addField({
                    type: 'inlinehtml',
                    label: ' &nbsp; ',
                    id: 'custpage_hidefloatelements'
                }).defaultValue = tmpHtmlVal;
            } catch (ex) {
                log.error({
                    title: 'hide float elements error',
                    details: ex
                });
            }
        }

        /**
         * 加法函数
         * @param arg1
         * @param arg2
         * @returns {string}
         */
        function accAdd(arg1, arg2) {
            var r1, r2, m, n;
            try {
                r1 = arg1.toString().split(".")[1].length;
            }
            catch (e) {
                r1 = 0;
            }
            try {
                r2 = arg2.toString().split(".")[1].length;
            }
            catch (e) {
                r2 = 0;
            }
            m = Math.pow(10, Math.max(r1, r2)); //last modify by deeka //动态控制精度长度
            n = (r1 >= r2) ? r1 : r2;
            return ((arg1 * m + arg2 * m) / m).toFixed(n);
        }

        /**
         *除法函数
         */
        function accDiv(arg1, arg2) {
            var t1 = 0, t2 = 0, r1, r2;
            try {
                t1 = arg1.toString().split(".")[1].length;
            } catch (e) {
            }
            try {
                t2 = arg2.toString().split(".")[1].length;
            } catch (e) {
            }
            with (Math) {
                r1 = Number(arg1.toString().replace(".", ""));
                r2 = Number(arg2.toString().replace(".", ""));
                return (r1 / r2) * pow(10, t2 - t1);
            }
        }

        /**
         *
         * 乘法函数
         */
        function accMul(arg1, arg2) {

            var m = 0, s1 = arg1.toString(), s2 = arg2.toString();
            try {
                m += s1.split(".")[1].length;
            } catch (e) {
            }
            try {
                m += s2.split(".")[1].length;
            } catch (e) {
            }
            return Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m);
        }

        /**
         ** 减法函数，用来得到精确的减法结果
         ** 说明：javascript的减法结果会有误差，在两个浮点数相减的时候会比较明显。这个函数返回较为精确的减法结果。
         ** 调用：accSub(arg1,arg2)
         ** 返回值：arg1加上arg2的精确结果
         **/
        function accSub(arg1, arg2) {
            var r1, r2, m, n;
            try {
                r1 = arg1.toString().split(".")[1].length;
            }
            catch (e) {
                r1 = 0;
            }
            try {
                r2 = arg2.toString().split(".")[1].length;
            }
            catch (e) {
                r2 = 0;
            }
            m = Math.pow(10, Math.max(r1, r2)); //last modify by deeka //动态控制精度长度
            n = (r1 >= r2) ? r1 : r2;
            return ((arg1 * m - arg2 * m) / m).toFixed(n);
        }

        /**
         *
         * @param id
         * @param page 当前页码
         * @param total 结果总条数
         * @param pageNum 每页显示多少条数据
         * @returns {string}
         */
        function getPagedSelect(id, page, total, pageNum) {
            var str, start, end;
            var num = Math.ceil(total / pageNum);
            log.audit("num",Math.ceil(total / pageNum))
            id = 'tdt_paged_index_' + id;
            if (num === 1) {
                str = '<select id="' + id + '" class="tdt_paged_index" disabled>';
            } else {
                str = '<select id="' + id + '" class="tdt_paged_index">';
            }
            for (var i = 1; i <= num; i++) {
                start = (i - 1) * pageNum + 1;
                end = i * pageNum;
                if (end > total) {
                    end = total;
                }
                if (page == i) {
                    str +=
                        '<option value=' +
                        i +
                        ' selected>Page ' +
                        i +
                        '：' +
                        start +
                        ' to ' +
                        end +
                        '</option>';
                } else {
                    str +=
                        '<option value=' +
                        i +
                        '>Page ' +
                        i +
                        '：' +
                        start +
                        ' to ' +
                        end +
                        '</option>';
                }
            }
            str += '</select>';
            return str;
        }

        /**
         * 保存检索查询超过4000条
         * @param searchObj
         * @returns {*[]}
         */
        function getAllSearchObj(searchObj){
            var RESULTCOUNT = 4000;
            var SIZE = 1000;
            var searchResultCount = searchObj.runPaged().count;
            var resList = [];
            if(searchResultCount>RESULTCOUNT){
                var resultSet = searchObj.run();
                var max = Math.ceil(searchResultCount / SIZE);
                for(var i=0;i<max;i++){
                    var results = resultSet.getRange({
                        start: SIZE*i,
                        end: Number(SIZE*i)+Number(SIZE)
                    });
                    for(var j=0;j<results.length;j++){
                        resList.push(results[j]);
                    }
                }
            }else{
                searchObj.run().each(function(result){
                    resList.push(result);
                    return true;
                });
            }
            return resList;
        }

        return {onRequest}

    });
