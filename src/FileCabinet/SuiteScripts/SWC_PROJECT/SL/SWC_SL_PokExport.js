/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
var PONAME = "刘锦玉"
var POPHONE = "15292259639"

define(['N/search', 'N/url', 'N/email', 'N/record', 'N/runtime', 'N/format', 'N/file', 'N/render', 'N/encode','../common/MatchTool'],
    (search, url, email, record, runtime, format, file, render, encode,MatchTool) => {
        function onRequest(context) {
            var response = context.response;

            try {
                if (context.request.method === 'GET') {
                    let data = "";
                    log.audit('采购单id', context.request.parameters.recordId);
                    data = getPoOrder(context.request.parameters);
                    log.audit("po单数据data", data);
                    let renderExcel = _renderExcel({
                        tplName: 'SWC_PoOrder_Excel.html',
                        renderData: data,
                        fileName: "采购订单数据导出" ,
                        response: response,
                    });
                    log.audit('测试excel', renderExcel);
                }
            } catch (e) {
                log.error('error', e)
            }
        }


        //po单数据
        function getPoOrder(params){
            var arr = {};
            var poRec = record.load({type: "purchaseorder", id: params.recordId});

            //表头信息
            var entityId = poRec.getValue({fieldId:"entity"}); //供应商
            arr.entityName = poRec.getText({fieldId:"entity"}); //供应商
            arr.subsidiaryName = poRec.getText({fieldId:"subsidiary"}); //子公司
            var currentDate = poRec.getValue({fieldId:"trandate"}); //日期
            arr.trandate = format.format({value:currentDate, type: format.Type.DATE});
            log.audit("日期", arr.trandate);
            arr.tranid = poRec.getValue({fieldId:"tranid"}); //po单号
            arr.tranidName = poRec.getText({fieldId:"tranid"}); //po单号
            arr.poName = PONAME; //姓名：默认
            arr.poPhone = POPHONE; //电话：默认
            var entityTerms = searchEntityTerms(entityId);
            // arr.clauseContent = entityTerms.replace(new RegExp("\r\n", 'g'), "<br></br>");//供应商条款
            arr.clauseContent = entityTerms;


            //行的相关字段
            var lineData = [];
            var sublistId = "item";
            let lineCount = poRec.getLineCount({sublistId: sublistId});
            if (lineCount > 0) {

                // 汇总相同货品的Map
                var itemSummaryMap = {};

                // 计算总计
                var totalOrderQuantity = 0; //数量合计
                var totalAmount = 0; //金额合计

                for (var i = 0; i < lineCount;i++) {
                    var line = {};
                    line.lineNum  = i + 1; //序号

                    // 获取货品ID（使用内部ID更准确）
                    var itemId = poRec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: "item",
                        line: i
                    });

                    //货品名称（相同货品汇总）
                    var itemText  = poRec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: "displayname",
                        line: i
                    });

                    //数量（相同货品汇总，按货品维度数量汇总）
                    var quantity  = poRec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: "quantity",
                        line: i
                    })|| 0;

                    //含税单价（取含税单价，同一货品单价相同）
                    // var rate = poRec.getSublistValue({
                    //     sublistId: sublistId,
                    //     fieldId: "custcol_swc_including_tax_amt",
                    //     line: i
                    // })|| 0;
                    //未税单价
                    var rate = poRec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: "rate",
                        line: i
                    })|| 0;
                    //税额
                    var tax1amt = poRec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: "tax1amt",
                        line: i
                    })|| 0;

                    var amount = rate * quantity;

                    if (tax1amt) {
                        rate = rate + MatchTool.divN(tax1amt,quantity);
                        amount = amount + tax1amt;
                    }
                    rate = MatchTool.fixed(rate,2);
                    amount = MatchTool.fixed(amount,2);
                    //金额（总金额）
                    // var amount = poRec.getSublistValue({
                    //     sublistId: sublistId,
                    //     fieldId: "grossamt",
                    //     line: i
                    // }) || 0;


                    // 累加总计
                    totalOrderQuantity += quantity; //数量合计
                    totalAmount += amount;//总金额合计

                    // 如果货品已存在于Map中，则汇总数量和金额
                    if (itemSummaryMap[itemId]) {
                        itemSummaryMap[itemId].quantity += quantity;
                        itemSummaryMap[itemId].amount += amount;
                        // 单价相同（同一货品单价相同）
                    } else {
                        // 首次出现该货品，初始化数据
                        itemSummaryMap[itemId] = {
                            itemId: String(itemId),
                            itemText: itemText,
                            quantity: quantity,
                            rate: rate,
                            amount: amount
                        };
                    }

                }

                // 将汇总后的数据转换为数组格式
                var lineNum = 1;
                for (var key in itemSummaryMap) {
                    if (itemSummaryMap.hasOwnProperty(key)) {
                        var item = itemSummaryMap[key];
                        var line = {};
                        line.lineNum = lineNum++; // 序号
                        line.itemId = item.itemText + ""; // 货品（相同货品已汇总）

                        line.qty = item.quantity; // 数量（相同货品汇总）
                        line.unitPrice = item.rate; // 单价（取货品单价，同一货品单价相同）
                        line.amount = item.amount; // 金额（总金额，相同货品金额累加）

                        lineData.push(line);
                    }
                }

                // 存储总计
                arr.totalOrderQuantity = totalOrderQuantity; // 订单数量合计
                arr.totalAmount = totalAmount; // 金额合计


            }

            if (lineData != null && lineData.length > 0) {
                arr.lineData = lineData; //子列表数据
            }
            log.audit('arr', arr);
            return arr;
        }


        //检索供应商下的条款  searchName:检索供应商下条款
        function searchEntityTerms(entityId){

            var vendorSearchObj = search.create({
                type: "vendor",
                filters:
                    [
                        ["internalid","anyof",entityId]
                    ],
                columns:
                    [
                        search.createColumn({name: "custentity_swc_clause_content", label: "条款内容"})
                    ]
            });
            var clauseContent = "";
            var searchResultCount = vendorSearchObj.runPaged().count;
            log.debug("vendorSearchObj result count",searchResultCount);
            vendorSearchObj.run().each(function(result){
                clauseContent = result.getValue({name: "custentity_swc_clause_content", label: "条款内容"})
                return true;
            });
            log.audit("1",clauseContent)
            if (clauseContent) {
                // 查找"4.验收标准"的位置
                var indexOfStandard = clauseContent.indexOf("4.验收标准");

                if (indexOfStandard !== -1) {
                    // 分割字符串为两部分
                    var beforeStandard = clauseContent.substring(0, indexOfStandard); // 4.验收标准之前
                    var afterStandard = clauseContent.substring(indexOfStandard); // 4.验收标准及之后
                    log.audit("afterStandard",afterStandard)
                    // 4.验收标准之前：使用HTML的<br>标签（用于显示换行）因为打印预览时字显示不全，被盖住一半，加&nbsp是为了打印预览时字展示全部
                    beforeStandard = beforeStandard.replace(/\r\n/g, "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br>");
                    // 4.验收标准之后：使用Excel的换行符\n（用于单元格内换行）
                    // afterStandard = afterStandard.replace(/\r\n/g, "&#10;");
                    clauseContent = beforeStandard + afterStandard+
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
                } else {
                    // 如果没有找到"4.验收标准"，全部使用<br>标签
                    clauseContent = clauseContent.replace(/\r\n/g, "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
                        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br>");
                }
            }
            // // 添加Excel特定的包装
            // clauseContent = "<span style='white-space: pre-wrap; mso-data-placement: same-cell;'>" +
            //     clauseContent +
            //     "</span>";
            return clauseContent;

        }


        function _renderExcel(option) {
            var fileId;
            var renderData = option.renderData;
            var fileName = option.fileName;
            var response = option.response;
            var HTMLId = 680;
            // var HTMLId = 682;
            log.audit("123",option)
            // 1,载入模板
            var renderer = render.create();
            renderer.templateContent = file
            .load({
                id: HTMLId, //模版id
            })
            .getContents();

            var obj = {};
            obj.renderData = renderData;
            //2,填充数据
            renderer.addCustomDataSource({
                format: render.DataSource.OBJECT,
                alias: 'data',
                data: obj.renderData,
            });
            //3,替换数据
            var fileContent = renderer.renderAsString();
            // 4,转换编码
            fileContent = encode.convert({
                string: fileContent,
                inputEncoding: encode.Encoding.UTF_8,
                outputEncoding: encode.Encoding.BASE_64,
            });
            //5,生成Excel
            var excelFile = file.create({
                name: fileName + '.xls',
                fileType: file.Type.EXCEL,
                contents: fileContent
            });
            // 6,保存文件
            if (option.folder) {
                excelFile.folder = option.folder;
                excelFile.isOnline = true;
                fileId = excelFile.save();
            }
            // 7,输出
            if (option.response) {
                response.writeFile({
                    file: excelFile,
                    isInline: true,
                });
            }
            return {
                fileId: fileId,
                excelFile: excelFile,
            };
        }
        /**
         * 获取文件url
         * @param id 文件id
         * @param encodeType 编码类型: [IMAGE]
         * @returns {string}
         */
        function getFileURL(id, encodeType) {
            let fileURL = '';
            try {
                const f = file.load({id: id});

                fileURL = 'https://' + url.resolveDomain({hostType: url.HostType.APPLICATION}) + f.url;
                if (encodeType?.toUpperCase() === 'IMAGE') {
                    fileURL = fileURL.replace(/&/g, '&amp;');
                }
            } catch (e) {
                log.error({
                    title: 'getFileURL函数获取文件URL失败:',
                    details: '参数: [id: ' + id + ', encodeType: ' + encodeType + ']' + '，错误：' + e,
                });
            }

            return fileURL;
        }





        return {
            onRequest: onRequest
        };
    });