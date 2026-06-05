/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record','N/task','N/search'],
    (record,task,search) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {

            try {
                var request = scriptContext.request;
                var response = scriptContext.response;
                var parameters = request.parameters;
                var adData = JSON.parse(parameters["adData"]);
                var type = adData.type;
                var id = adData.id;
                var result = {code: 200, data: {}, msg: "执行成功"};

                log.audit('开始拆分');
                if (adData) {
                    try {
                        //包装箱明细
                        log.audit('adData',adData);
                        var taskId = createRec(adData);
                        // result["data"] = poId;
                        if (taskId) {
                            result["code"] = 200;
                            result["data"].taskId = taskId;
                        } else {
                            result["code"] = 500;
                            result["msg"] = '无法拆分';
                        }
                    } catch (e) {
                        result["code"] = 500;
                        result["msg"] = e.message;
                    }
                    response.write(JSON.stringify(result));
                }
            } catch (e) {
                log.error('error',error);
            }
        }

        function createRec(adData) {
            try {
                var cur = record.load({
                    type: adData.type,
                    id: adData.id,
                    isDynamic: true
                });
                //获取待拆分数据
                var lineCount = cur.getLineCount({sublistId: 'recmachcustrecord_swc_acd_actual_cabinet'});

                if (lineCount) {
                    let lineData = [];
                    let skuData = [];
                    let vendorData = [];
                    for (let i = 0; i < lineCount; i++) {
                        cur.selectLine({
                            sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                            line: i
                        });
                        var splitFlag = cur.getCurrentSublistValue({
                            sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                            fieldId: 'custrecord_swc_acd_main_sku'
                        });
                        //如果货品是主要货品
                        if (splitFlag) {
                            var lineId = cur.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                                fieldId: 'id'
                            });
                            var sku = cur.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                                fieldId: 'custrecord_swc_acd_item'
                            });
                            var vendor = cur.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                                fieldId: 'custrecord_swc_acd_vendor'
                            });
                            var zsQuantity = cur.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                                fieldId: 'custrecord_swc_acd_zs_qty'
                            });

                            if (skuData.indexOf(sku) == -1)
                                skuData.push(sku);

                            if (vendorData.indexOf(vendor) == -1)
                                vendorData.push(vendor);

                            lineData.push({
                                id: lineId,
                                sku: sku,
                                vendor: vendor,
                                quantity: zsQuantity
                            });
                        }
                    }

                    //先按供应商排序，再按sku排序
                    lineData.sort((a, b) => {
                        // 先比较vendor（数字比较）
                        if (a.vendor !== b.vendor) {
                            return Number(a.vendor) - Number(b.vendor);
                        }
                        // 如果vendor相同，再比较sku（数字比较）
                        return Number(a.sku) - Number(b.sku);
                    });

                    log.audit('lineData', lineData.length);
                    log.audit('skuData', skuData.length);
                    log.audit('vendorData', vendorData);
                    //查询 sku档案 获取sku的长宽高
                    let skuObj = {};
                    if (skuData.length > 0) {
                        log.audit('skuData2', skuData);
                        skuObj = searchSkuData(skuData);
                        log.audit('skuObj', skuObj);
                    }

                    //
                    //向装箱单明细添加数据
                    if (lineData.length > 0) {
                        let xh = 1;
                        for (let i = 0; i < lineData.length; i++) {
                            log.audit('lineData[i]', lineData[i]);
                            let lineId = lineData[i].id;
                            let lineCount = lineData[i].quantity;
                            let vendor = lineData[i].vendor;
                            let sku = lineData[i].sku;
                            let zxcc = '';
                            let bztj = '';
                            let jz = '';
                            let mz = '';
                            let gg = '';
                            if (sku in skuObj) {
                                gg = skuObj[sku].long + '*' + skuObj[sku].width + '*' + skuObj[sku].height;
                                zxcc = skuObj[sku].zxcc;
                                bztj = skuObj[sku].bztj;
                                jz = skuObj[sku].jz;
                                mz = skuObj[sku].mz;
                            }
                            log.audit('lineCount', lineCount);
                            for (let j = 0; j < lineCount; j++) {
                                cur.selectLine({
                                    sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                    line: xh - 1
                                });
                                //真实排柜明细
                                if (lineId) cur.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                    fieldId: 'custrecord_swc_pg_mx_id',
                                    value: lineId
                                });
                                //序号
                                cur.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                    fieldId: 'custrecord_swc_pg_id',
                                    value: xh
                                });
                                //sku
                                if (sku) cur.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                    fieldId: 'custrecord_swc_pg_sku',
                                    value: sku
                                });
                                //供应商
                                if (vendor) cur.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                    fieldId: 'custrecord_swc_pg_gys',
                                    value: vendor
                                });
                                //数量
                                cur.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                    fieldId: 'custrecord_swc_pg_sl',
                                    value: 1
                                });
                                //规格
                                if (gg) cur.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                    fieldId: 'custrecord_swc_pg_gg',
                                    value: gg
                                });
                                //箱号
                                cur.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                    fieldId: 'custrecord_swc_pg_xh',
                                    value: xh
                                });
                                //箱数
                                cur.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                    fieldId: 'custrecord_swc_pg_xs',
                                    value: 1
                                });
                                //纸箱尺寸
                                if (zxcc) cur.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                    fieldId: 'custrecord_swc_pg_zxcc',
                                    value: zxcc
                                });
                                //包装体积
                                if (bztj) cur.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                    fieldId: 'custrecord_swc_pg_bztj',
                                    value: bztj
                                });
                                //净重
                                if (jz) cur.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                    fieldId: 'custrecord_swc_pg_jz',
                                    value: jz
                                });
                                //毛重
                                if (mz) cur.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                    fieldId: 'custrecord_swc_pg_mz',
                                    value: mz
                                });

                                cur.commitLine({
                                    sublistId: 'recmachcustrecord_swc_pg_zspgdh'
                                });

                                xh++;
                            }
                        }

                        log.audit('拆分成功');
                        var recId = cur.save();
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }

                return recId;
            }
            catch (e) {
                return false;
            }
        }

        function searchSkuData(skuData) {
            const itemSearchObj = search.create({
                type: "item",
                filters:
                    [
                        ["internalid","anyof",skuData]
                    ],
                columns:
                    [
                        search.createColumn({name: "custitem_swc_packagel", label: "包装 长"}),
                        search.createColumn({name: "custitem_swc_packagew", label: "包装 宽"}),
                        search.createColumn({name: "custitem_swc_packageh", label: "包装 高"}),
                        search.createColumn({name: "custitem_swc_sku_zxcc", label: "纸箱尺寸"}),
                        search.createColumn({name: "custitem_swc_total_volume", label: "总体积（CBM）"}),
                        search.createColumn({name: "custitem_swc_total_net_weight", label: "净重（纸箱）"}),
                        search.createColumn({name: "custitem_swc_total_gross_weight", label: "毛重（纸箱）"})
                    ]
            });

            let results = getAllResults(itemSearchObj);
            log.audit('results',results);
            let obj = {};
            results.forEach(function (value) {
                let sku = value.id;
                obj[sku] = {
                    long: value.getValue({name: "custitem_swc_packagel", label: "包装 长"}),
                    width: value.getValue({name: "custitem_swc_packagew", label: "包装 宽"}),
                    height: value.getValue({name: "custitem_swc_packageh", label: "包装 高"}),
                    zxcc: value.getValue({name: "custitem_swc_sku_zxcc", label: "纸箱尺寸"}),
                    bztj: value.getValue({name: "custitem_swc_total_volume", label: "总体积（CBM）"}),
                    jz: value.getValue({name: "custitem_swc_total_net_weight", label: "净重（纸箱）"}),
                    mz: value.getValue({name: "custitem_swc_total_gross_weight", label: "毛重（纸箱）"}),
                }
            });
            return obj;
        }

        function getAllResults(srch) {
            let results = srch.run();
            let searchResults = [];
            let searchid = 0;
            let resultslice;
            do {
                resultslice = results.getRange({
                    start: searchid,
                    end: searchid + 1000
                });
                resultslice.forEach(function (slice) {
                    searchResults.push(slice);
                    searchid++;
                });

            } while (resultslice.length >= 1000);
            return searchResults;
        }

        return {onRequest}

    });