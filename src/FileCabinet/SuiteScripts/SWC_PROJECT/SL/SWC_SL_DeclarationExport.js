/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/search', 'N/runtime',"N/format",'N/record', "../lib/pinyin.min.js"],

    function (serverWidget, search, runtime,format,record, pinyin) {
        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(scriptContext) {
            if (scriptContext.request.method == "POST") {
                var result = {code: 200, msg: "执行成功"};
                try {
                    var response = scriptContext.response;
                    var body = scriptContext.request.body;
                    body = JSON.parse(body);
                    var type = body.type;
                    var recordId = body.recordId;//参数(报关单id)
                    log.audit("参数",body);
                    //导出
                    if(type == "2"){
                        //报关单，发票，箱单，合同，委托书
                        var declarationData = allData(recordId);
                        result["declarationData"] = declarationData;//报关单
                        log.audit("报关单",declarationData);
                    }
                    //作废
                    if(type == "1"){

                        var planOrderData  = planOrderSearch(recordId);
                        log.audit("所有发运单ID",planOrderData);
                        // for循环遍历每个发运单
                        for (var i = 0; i < planOrderData.length; i++) {
                            var recId = planOrderData[i]; //发运单id
                            var planOrderRec = record.load({type: "customrecord_swc_wl_plan_order", id: recId, isDynamic: true});
                            // 查询当前发运单的子列表
                            getPlanOrderSublistData(planOrderRec,recordId);

                            var savedId = planOrderRec.save();
                            log.audit("保存成功", "保存发运单ID: " + savedId);
                        }
                        record.submitFields({
                            type: "customrecord_swc_customs_declaration",
                            id: recordId,
                            values: {
                                "isinactive": true
                            }
                        });
                        log.audit("报关单反写成功", "报关单ID: " + recordId);
                    }

                }catch (e) {
                    log.audit({title: 'e', details: e});
                    result["code"] = 500;
                    result["msg"] = e.message;
                }
                response.write(JSON.stringify(result));
            }

        }

        // 获取报关单子列表数据
        function getPlanOrderSublistData(planOrderRec,recordId) {
            var sublistId= 'recmachcustrecord_swc_wl_plan_order_id';
            var lineCount = planOrderRec.getLineCount({sublistId:sublistId});
            log.audit("子表行数", lineCount);

            for (var j = 0; j < lineCount; j++) {
                var declarationId = planOrderRec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: "custrecord_swc_wl_bgdid",
                    line: j,
                });
                if(declarationId == recordId){
                    // 选中当前行
                    planOrderRec.selectLine({
                        sublistId: sublistId,
                        line: j
                    });

                    // 使用 setCurrentSublistValue 设置当前选中行的值
                    planOrderRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: "custrecord_swc_wl_bgdid",
                        value: ""
                    });
                    planOrderRec.commitLine({
                        sublistId: sublistId
                    });

                }
            }
        }

        /**
         * 计算逻辑
         */
        function allData(recordId) {

            var declarationData = [];

            var rec = record.load({type:"customrecord_swc_customs_declaration",id:recordId});
            //============报关单=====================
            //表头数据
            var bgdTitle = rec.getValue({fieldId:"custrecord_swc_bgd_title"});
            var jwshr = rec.getText({fieldId:"custrecord_swc_bgd_jwshr"})// 默认"AEO：LETTOI LLC"境外收货人
            var htxyh = rec.getValue({fieldId:"custrecord_swc_bgd_htxyh"});//合同协议号
            var scxsdw = rec.getValue({fieldId:"custrecord_swc_bgd_scxsdw"});//生产销售单位
            var jnfhr = rec.getText({fieldId:"custrecord_swc_bgd_jnfhr"});//境内发货人

            var ysfs = rec.getText({fieldId:"custrecord_swc_bgd_ysfs"});//运输方式
            var jgfs = rec.getText({fieldId:"custrecord_swc_bgd_jgfs"});//监管方式
            var zmxz = rec.getText({fieldId:"custrecord_swc_bgd_zmxz"});//征免性质
            var tradingCountry = rec.getText({fieldId:"custrecord_swc_bgd_trading_country"});//贸易国(地区)
            var ydg = rec.getText({fieldId:"custrecord_swc_bgd_ydg"});//运抵国(地区)
            var zyg = rec.getValue({fieldId:"custrecord_swc_bgd_zyg"});//指运港
            var js = rec.getValue({fieldId:"custrecord_swc_bgd_js"});//件数
            var grossWeight = rec.getValue({fieldId:"custrecord_swc_bgd_gross_weight"});//毛重（千克）
            var netWeight = rec.getValue({fieldId:"custrecord_swc_bgd_net_weight"});//净重（千克）
            var cjfs = rec.getValue({fieldId:"custrecord_swc_bgd_cjfs"});//成交方式
            var sfdzjbh = rec.getValue({fieldId:"custrecord_swc_bgd_sfdzjbh"});//随附单证及编号
            var bjmmjbz = rec.getValue({fieldId:"custrecord_swc_bgd_bjmmjbz"});//标记唛码及备注
            var bz = rec.getValue({fieldId:"custrecord_swc_bgd_bz"});//备注
            var tsgxqr = rec.getValue({fieldId:"custrecord_swc_bgd_tsgxqr"});//特殊关系确认
            var jgyxqr = rec.getValue({fieldId:"custrecord_swc_bgd_jgyxqr"});//价格影响确认
            var zftxqsyf = rec.getValue({fieldId:"custrecord_swc_bgd_zftxqsyf"});//支付特许权使用费
            var zbzj = rec.getValue({fieldId:"custrecord_swc_bgd_zbzj"});//自报自缴
            var ljka = rec.getValue({fieldId:"custrecord_swc_bgd_ljka"});//离境口岸


            //表行数据
            var lineData  = searchDeclarationDetailById(recordId);
            //计算汇总数据
            var totalAmount = 0; //汇总金额
            var totalNetWeight = 0;//汇总净重
            var totalGrossWeight = 0;//汇总毛重
            var totalPieces = 0;//汇总件数
            var totalSl = 0;//汇总数量
            var totalZj = 0;//汇总总价
            var totalNumJz = 0;//汇总（净重 （净重*数量））
            var totalNumMz = 0;//汇总（毛重 （毛重*数量））

            for (var i = 0; i < lineData.length; i++) {
                var line = lineData[i];

                line.lineNumber = i + 1; // 项号从1开始
                line.hscode = line.hscode || ""; // 商品编号
                line.ycg = line.ycg || ""; // 原产国
                line.zzmdg = line.zzmdg || ""; // 终目的国
                line.jnhyd = line.jnhyd || ""; // 境内货源地
                line.ggxh = line.ggxh || ""; // 规格型号
                line.quantity = line.sl || ""; // 数量
                line.dj = line.dj || ""; // 单价
                line.danw = line.dw || ""; // 单位
                line.zj = line.zj || ""; // 总价
                line.bz = line.bz || ""; // 币制
                line.spmc = line.spmc || ""; // 商品名称
                line.amount = line.amount || 0; // 金额
                line.jz = line.jz || 0; // 净重
                line.mz = line.mz || 0; // 毛重
                line.js = line.js || 0; // 件数
                line.sl = 0;
                line.script = "";
                line.NumJz = 0;
                line.NumMz = 0;
                line.dw = "";
                line.dwScript= "";

                if (line.quantity) {
                    const result = extractValueAndUnit(line.quantity);
                    if (result) {
                        line.sl = result.value;
                        line.script = result.unit || "";
                        log.audit("数量拆分",result)
                        line.NumJz =  line.sl *line.jz; //净重(数量*净重)
                        line.NumMz =  line.sl *line.mz; //毛重(数量*毛重)
                    }
                }

                //单位（拆分）
                if (line.danw) {
                    const result = extractValueAndUnit(line.danw);
                    if (result) {
                        line.dw = result.value;
                        line.dwScript = result.unit || "";
                    }
                }

                // 计算汇总值
                if (line.zj) {
                    totalZj += parseFloat(line.zj) || 0;
                }
                if (line.amount) {
                    totalAmount += parseFloat(line.amount) || 0;
                }
                if (line.jz) {
                    totalNetWeight += parseFloat(line.jz) || 0;
                }
                if (line.mz) {
                    totalGrossWeight += parseFloat(line.mz) || 0;
                }
                if (line.js) {
                    totalPieces += parseFloat(line.js) || 0;
                }
                if (line.quantity) {
                    totalSl += parseFloat(line.quantity) || 0;
                }
                if (line.NumJz) {
                    totalNumJz += parseFloat(line.NumJz) || 0;
                }
                if (line.NumMz) {
                    totalNumMz += parseFloat(line.NumMz) || 0;
                }
            }
            log.audit("明细数据汇总", {总金额: totalAmount,总净重: totalNetWeight,总毛重: totalGrossWeight, 总行数: lineData.length});

            //==================================发票
            var currentDateObj = new Date();
            log.audit("当前时间", currentDateObj);
            var yesterdayStr = getDateMinusDays(currentDateObj, 1);//日期-1
            var contractDateStr = getDateMinusDays(currentDateObj,25); //日期 -25
            var currentday = getDatePlusDays(currentDateObj,15); //日期 -15
            var jckriRq = getDatePlusDays(currentDateObj,1);//日期 +1

            declarationData.push({
                "bgdTitle":bgdTitle, //表单标题
                "jwshr": jwshr, //境外收货人
                "htxyh": htxyh, //合同协议号
                "scxsdw": scxsdw, //生产销售单位
                "jnfhr": jnfhr, //境内发货人
                "ysfs": ysfs, //运输方式
                "jgfs": jgfs, //监管方式
                "zmxz": zmxz, //征免性质
                "tradingCountry": tradingCountry, //贸易国(地区)
                "ydg": ydg,//运抵国(地区)
                "zyg": zyg, //指运港
                "js": js, //件数
                "grossWeight": grossWeight, //毛重（千克）
                "netWeight": netWeight, //净重（千克）
                "cjfs": cjfs, //成交方式
                "sfdzjbh": sfdzjbh, //随附单证及编号
                "bjmmjbz": bjmmjbz, //标记唛码及备注
                "bz": bz, //备注
                "tsgxqr": tsgxqr, //特殊关系确认
                "jgyxqr": jgyxqr, //价格影响确认
                "zftxqsyf": zftxqsyf, //支付特许权使用费
                "zbzj": zbzj, //自报自缴
                "lineData": lineData, // 添加明细数据
                "totalAmount": totalAmount, // 汇总金额
                "totalAmountChinese":toChineseAmount(totalAmount), // 汇总金额
                "totalNetWeight": totalNetWeight, // 汇总净重
                "totalGrossWeight": totalGrossWeight, // 汇总毛重
                "totalPieces": totalPieces, // 汇总件数
                "totalSl": totalSl, // 汇总数量
                "totalZj": totalZj, //汇总总价
                "totalNumMz": totalNumMz,
                "totalNumJz": totalNumJz,
                "lineCount": lineData.length,// 明细行数
                "htxyh": htxyh, //合同协议号
                "yesterdayStr": yesterdayStr, //日期
                "ljka": ljka, //离境口岸
                "ljkaChar": chineseToUpperChar(ljka), //离境口岸
                "cm": ljka + "至" + zyg, //离境口岸    指运港
                "contractDateStr": contractDateStr, //日期
                "jckri" :jckriRq, //日期+1
                "currentday": currentday, //日期+15天
                "currentDateObj": currentDateObj, //当前日期

            })
            log.audit("所有数据",declarationData);
            return declarationData;

        }


        //物流发运单搜索
        function planOrderSearch(wlBgdid){
            var planDetailList = [];
            var customrecord_swc_wl_plan_detailSearchObj = search.create({
                type: "customrecord_swc_wl_plan_detail",
                filters:
                    [
                        ["custrecord_swc_wl_bgdid","anyof",wlBgdid]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID",
                            label: "id"
                        })
                    ]
            });
            var searchResult = getAllSearchObj(customrecord_swc_wl_plan_detailSearchObj);
            var searchResultCount = customrecord_swc_wl_plan_detailSearchObj.runPaged().count;
            log.audit("searchResultCount",searchResultCount);
            searchResult.forEach(function (result) {
                var internalid = result.getValue({
                    name: "internalid",
                    join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID",
                    label: "id"
                });
                if (internalid) {
                    if(planDetailList.indexOf(internalid) < 0){
                        planDetailList.push(internalid);
                    }
                }
                return true;
            });
            // var customrecord_swc_wl_plan_orderSearchObj = search.create({
            //     type: "customrecord_swc_wl_plan_order",
            //     filters:
            //         [
            //             ["isinactive","is","F"]
            //         ],
            //     columns:
            //         [
            //             search.createColumn({name: "internalid", label: "内部 ID"})
            //         ]
            // });
            //
            // var searchResult = getAllSearchObj(customrecord_swc_wl_plan_orderSearchObj);
            // var searchResultCount = customrecord_swc_wl_plan_orderSearchObj.runPaged().count;
            // log.audit("customrecord_swc_wl_plan_orderSearchObj result count",searchResultCount);
            // searchResult.forEach(function (result) {
            //     var bgdidValue = result.getValue({ name: "internalid" });
            //     if (bgdidValue) {
            //         planDetailList.push(bgdidValue);
            //     }
            //     return true;
            // });
            return planDetailList;
        }


        /**
         * 从字符串中提取数值和单位部分
         * @param {string|number} str - 包含数值和单位的字符串，如 "1 千克"
         * @returns {Object|null} 包含value和unit的对象，或null
         */
        function extractValueAndUnit(str) {
            if (!str && str !== 0) return null;

            // const match = str.toString().match(/(\d+(?:\.\d+)?)\s*(.+)/);
            const match = str.toString().match(/(\d+(?:\.\d+)?)\s*(.*)/);
            if (match) {
                let unit = match[2].trim();
                // 如果单位是 "0"，转为空字符串
                if (unit === "0") unit = "";
                return {
                    value: parseFloat(match[1]),
                    unit:unit
                };
            }
            return null;
        }



        //searchName：小鹿奔奔报关单明细搜索
        function searchDeclarationDetailById(declarationId){
            var data = [];
            var customrecord_swc_declaration_detailsSearchObj = search.create({
                type: "customrecord_swc_declaration_details",
                filters:
                    [
                        ["custrecord_swc_bgdmx_bgdh","anyof",declarationId]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_bgdmx_xh", label: "项号"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_hscode", label: "商品编号"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_spmc", label: "商品名称"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_sbys", label: "申报要素"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_sl", label: "数量"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_sldw", label: "数量单位"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_zjz", label: "重量"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_zldw", label: "重量单位"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_dj", label: "单价"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_ycg", label: "原产国（地区）"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_zzmdg", label: "最终目的国（地区）"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_jnhyd", label: "境内货源地"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_zm", label: "征免"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_amount", label: "金额"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_jz", label: "净重"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_mz", label: "毛重"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_js", label: "件数"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_bgdh", label: "小鹿奔奔报关单号"}),
                        // search.createColumn({name: "custrecord_swc_bgdmx_sl", label: "单位"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_zj", label: "总价"}),
                        search.createColumn({name: "custrecord_swc_bgdmx_bz", label: "币制"})
                    ]
            });
            var searchResultCount = customrecord_swc_declaration_detailsSearchObj.runPaged().count;
            log.debug("报关单明细count",searchResultCount);
            var searchResult = getAllSearchObj(customrecord_swc_declaration_detailsSearchObj);
            searchResult.forEach(function (result) {
                // 格式化单价，确保有前导零
                var djValue = result.getValue({name: "custrecord_swc_bgdmx_dj", label: "单价"});
                var formattedDj = formatNumberWithLeadingZero(djValue);
                var obj = {
                    xh : result.getValue({name: "custrecord_swc_bgdmx_xh", label: "项号"}),
                    hscode : result.getValue({name: "custrecord_swc_bgdmx_hscode", label: "商品编号"}),
                    spmc : result.getValue({name:"custrecord_swc_bgdmx_spmc", label: "商品名称"}),
                    ycg : result.getText({name: "custrecord_swc_bgdmx_ycg", label: "原产国（地区）"}),
                    zzmdg : result.getText({name: "custrecord_swc_bgdmx_zzmdg", label: "最终目的国（地区）"}),
                    jnhyd : result.getValue({name: "custrecord_swc_bgdmx_jnhyd", label: "境内货源地"}),
                    zm : result.getValue({name: "custrecord_swc_bgdmx_zm", label: "征免"}),
                    amount : result.getValue({name: "custrecord_swc_bgdmx_amount", label: "金额"}),
                    jz : result.getValue({name: "custrecord_swc_bgdmx_jz", label: "净重"}),
                    mz : result.getValue({name: "custrecord_swc_bgdmx_mz", label: "毛重"}),
                    js : result.getValue({name: "custrecord_swc_bgdmx_js", label: "件数"}),
                    doNmu : result.getValue({name: "custrecord_swc_bgdmx_bgdh", label: "小鹿奔奔报关单号"}),
                    ggxh : result.getValue({name: "custrecord_swc_bgdmx_sbys", label: "申报要素"}),
                    sl : result.getValue({name: "custrecord_swc_bgdmx_sl", label: "数量"}),
                    sldw : result.getValue({name: "custrecord_swc_bgdmx_sldw", label: "数量单位"}),
                    zjz : result.getValue({name: "custrecord_swc_bgdmx_zjz", label: "重量"}),
                    zldw : result.getValue({name: "custrecord_swc_bgdmx_zldw", label: "重量单位"}),
                    dj : formattedDj,
                    dw : result.getValue({name: "custrecord_swc_bgdmx_sl", label: "单位"}),
                    zj : result.getValue({name: "custrecord_swc_bgdmx_zj", label: "总价"}),
                    bz : result.getValue({name: "custrecord_swc_bgdmx_bz", label: "币制"}),
                    spmc : result.getValue({name:"custrecord_swc_bgdmx_spmc", label: "商品名称"}),

                }
                data.push(obj);
                return true;
            });

            return data;
        }

        function formatNumberWithLeadingZero(value) {
            if (!value && value !== 0) return '';
            // 转换为字符串
            var strValue = value.toString();

            // 如果是小数且以点开头，添加零
            if (strValue.startsWith('.')) {
                return '0' + strValue;
            }

            // 如果是负数且以-.开头
            if (strValue.startsWith('-.')) {
                return '-0' + strValue.substring(1);
            }

            return strValue;
        }

        // 获取当前日期减去指定天数的函数
        function getDateMinusDays(currentDate, days) {
            var resultDate = new Date(currentDate);
            resultDate.setDate(resultDate.getDate() - days);
            return resultDate;
        }


        //获取当前日期加上指定天数的函数
        function getDatePlusDays(currentDateObj,days) {
            var resultDate = new Date(currentDateObj);
            resultDate.setDate(resultDate.getDate() + days);
            return resultDate;
        }



        /**
         * 金额转中文大写
         * @param {number} amount 金额
         * @returns {string}
         */
        function toChineseAmount(amount) {
            const units = ['', '拾', '佰', '仟'];
            const bigUnits = ['', '万', '亿'];
            const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];

            // 处理小数部分
            function handleDecimal(decimal) {
                let result = '';
                if (decimal[0] !== '0') {
                    result += digits[parseInt(decimal[0])] + '角';
                }
                if (decimal[1] !== '0') {
                    result += digits[parseInt(decimal[1])] + '分';
                }
                return result || '整';
            }

            // 处理整数部分
            function handleInteger(integer) {
                let result = '';
                let zeroFlag = false; // 标记是否有多余的零
                let length = integer.length;

                for (let i = 0; i < length; i++) {
                    const digit = parseInt(integer[i]);
                    const unit = units[(length - i - 1) % 4];
                    const bigUnit = bigUnits[Math.floor((length - i - 1) / 4)];

                    if (digit === 0) {
                        zeroFlag = true;
                    } else {
                        if (zeroFlag) {
                            result += '零';
                            zeroFlag = false;
                        }
                        result += digits[digit] + unit;
                    }

                    // 添加大单位（万、亿）
                    if ((length - i - 1) % 4 === 0 && (length - i - 1) !== 0) {
                        result += bigUnit;
                    }
                }

                return result || '零';
            }

            // 检查输入是否为有效数字
            if (isNaN(amount) || amount < 0) {
                return '输入无效金额';
            }

            // 将数字转换为字符串并分割整数和小数部分
            const [integerPart, decimalPart = '00'] = String(toFixed(Number(amount), 2))?.split('.');

            // 处理整数和小数部分
            const chineseInteger = handleInteger(integerPart);
            const chineseDecimal = handleDecimal(decimalPart);

            // 拼接结果
            return chineseInteger + '元' + chineseDecimal;
        }

        /**
         * 四舍五入保留小数
         */
        function toFixed(num, d) {
            num *= Math.pow(10, d);
            num = Math.round(num);
            return num / (Math.pow(10, d));
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

        function getCurDate() {
            return format.parse({
                value:(format.format({
                    value:new Date(),
                    type:format.Type.DATETIME
                })),
                type:format.Type.DATE
            });
        }

        function getCurrentDateFormatted() {
            const date = getCurDate();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始，所以需要+1，并且用padStart补0
            const day = String(date.getDate()).padStart(2, '0'); // 用padStart补0
            return `${year}/${month}/${day}`;

        }

        /**
         * 中文转换为大写汉语拼音
         * @param str
         * @returns {string}
         */
        function chineseToUpperChar(str){
            if (!str) return "";
            let charArr = pinyin.pinyin(str, {style: pinyin.pinyin.STYLE_NORMAL, segment: true});
            let charStr = "";
            for (let index in charArr){
                charStr = charStr + charArr[index][0];
            }
            return charStr.toUpperCase();
        }

        return {
            onRequest: onRequest
        };

    });
