/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope public
 */
define(['N/ui/dialog', 'N/currentRecord', 'N/format', 'N/url', 'N/record', 'N/search','../common/commonTool', 'N/https', '../common/SWC_CONFIG_DATA'],
    function (dialog, currentRecord, format, urls,record,search,commonTool,https, SWC_CONFIG_DATA) {
        var CONFIG = SWC_CONFIG_DATA.configData();

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
            try {
                var now_rec   = scriptContext.currentRecord;
                var field_id  = scriptContext.fieldId;
                var sublist_id = 'recmachcustrecord_swc_acd_actual_cabinet';

                //目的仓库-海外仓服务商
                // if (field_id === 'custrecord_swc_pg_md_location') {
                //     var location = now_rec.getValue({fieldId: 'custrecord_swc_pg_md_location'});
                //     if (location) {
                //         var servic = searchServic(location);//海外仓服务商
                //
                //         if (servic) {
                //             now_rec.setValue({
                //                 fieldId: 'custrecord_swc_pg_hw_servic',
                //                 value: servic
                //             });
                //         }
                //     }
                // }

                // 明细行字段才有 sublistId，这里最好一起判断
                if (scriptContext.sublistId !== sublist_id) return;

                if (field_id === 'custrecord_swc_acd_zs_qty') {

                    // 新输入的值（数量）
                    var newQtyRaw = now_rec.getCurrentSublistValue({
                        sublistId: sublist_id,
                        fieldId: 'custrecord_swc_acd_zs_qty'
                    });

                    // 基准值（上限）：custrecord_zs_qty_ck
                    // var limitQtyRaw = now_rec.getCurrentSublistValue({
                    //     sublistId: sublist_id,
                    //     fieldId: 'custrecord_zs_qty_ck'
                    // });

                    // 更改为数量为采购订单数量对比
                    var limitQtyRaw = now_rec.getCurrentSublistValue({
                        sublistId: sublist_id,
                        fieldId: 'custrecord_swc_acd_po_quantity'
                    });

                    var newQty   = Number(newQtyRaw) || 0;
                    var limitQty = Number(limitQtyRaw) || 0;

                    // 如果新值 > 上限：提示并恢复
                    if (newQty > limitQty) {
                        alert('本次【真实排柜数量】已超出【剩余可排柜数量】（' + limitQty + '）');

                        now_rec.setCurrentSublistValue({
                            sublistId: sublist_id,
                            fieldId: 'custrecord_swc_acd_zs_qty',
                            value: limitQty,
                            ignoreFieldChange: true   // 关键：避免递归触发 fieldChanged
                        });

                        // 恢复后通常直接 return，避免继续用错误值计算其它字段
                        return;
                    }
                }

            } catch (e) {
                log.debug('e', e);
            }
        }

        function saveRecord(context) {
            try {
                var now_rec = context.currentRecord, sublist_id = 'recmachcustrecord_swc_acd_actual_cabinet';

                var line_count = now_rec.getLineCount(sublist_id);

                var cabinet_no_ary = [];

                var zsErrorMsgLine = [];
                var errorMsgLine = [];
                if (line_count > 0) {
                    for (var i = 0; i < line_count; i++) {
                        var quantity_excellent = now_rec.getSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_acd_quantity_excellent', line: i }) || 0;
                        var quantity_fine = now_rec.getSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_ecd_quantity_fine', line: i }) || 0;

                        var cabinet_no = now_rec.getSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_acd_actual_cabinet_no', line: i });

                        var nif_quantity = now_rec.getSublistValue({ sublistId: sublist_id, fieldId: 'custrecordswc_acd_nif_quantity', line: i });

                        var zs_qty = now_rec.getSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_acd_zs_qty', line: i });


                        // 真实排柜数量 《= 未出运数量
                        if(Number(zs_qty) > Number(nif_quantity)){
                            zsErrorMsgLine.push(i+1);
                        }

                        if (Number(quantity_excellent) + Number(quantity_fine) != Number(zs_qty)) {
                            errorMsgLine.push(i+1);
                        }

                        if(cabinet_no == ''){
                            cabinet_no_ary.push(i+1);
                        }
                    }
                }
                return true;
            } catch (e) {
                log.debug('e', e);
            }
        }

        //2026/02/03 swr
        async function splitPacking() {
            // 弹出弹框
            var options = {
                title: "提醒",
                message: "确定进行装箱单拆分"
            };
            const result = await dialog.confirm(options);
            // 用户点击了确定
            if (result) {
                let maskShown = false; // 标记蒙版是否已显示
                try {
                    console.log('开始拆分');
                    commonTool.startMask('正在进行装箱单拆分，请耐心等待');
                    await new Promise(resolve => setTimeout(resolve, 100));
                    maskShown = true;
                    var currentRec = currentRecord.get();
                    console.log('currentRec.type', currentRec.type);
                    console.log('currentRec.type', currentRec.id);
                    let type = currentRec.type;
                    let id = currentRec.id;


                    let reqUrl = urls.resolveScript({
                        scriptId: CONFIG.SCRIPT_ID_SL_SPLIT_PACK,
                        deploymentId: CONFIG.DEPLOY_ID_SL_SPLIT_PACK,
                    });

                    var adData = {
                        type: type,
                        id: id
                    }

                    log.error('adData', adData);
                    var resp = https.post({
                        url: reqUrl,
                        body: {
                            "adData": JSON.stringify(adData),
                        },
                    });

                    log.error('resp', resp);
                    if (resp) {
                        resp = JSON.parse(resp.body);
                        if (resp.data.code == '500') {
                            alert('无符合拆分条件的数据');
                            commonTool.endMask();
                        } else {
                            commonTool.endMask();
                            // 刷新页面或跳转
                            window.location.reload();
                        }
                    }

                    // var cur = record.load({
                    //     type: type,
                    //     id: id,
                    //     isDynamic: true
                    // });
                    //
                    // //获取待拆分数据
                    // var lineCount = cur.getLineCount({sublistId: 'recmachcustrecord_swc_acd_actual_cabinet'});
                    // if (lineCount) {
                    //     let lineData = [];
                    //     let skuData = [];
                    //     let vendorData = [];
                    //     for (let i = 0; i < lineCount; i++) {
                    //         cur.selectLine({
                    //             sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                    //             line: i
                    //         });
                    //         var splitFlag = cur.getCurrentSublistValue({
                    //             sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                    //             fieldId: 'custrecord_swc_acd_main_sku'
                    //         });
                    //         //如果货品是主要货品
                    //         if (splitFlag) {
                    //             var lineId = cur.getCurrentSublistValue({
                    //                 sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                    //                 fieldId: 'id'
                    //             });
                    //             var sku = cur.getCurrentSublistValue({
                    //                 sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                    //                 fieldId: 'custrecord_swc_acd_item'
                    //             });
                    //             var vendor = cur.getCurrentSublistValue({
                    //                 sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                    //                 fieldId: 'custrecord_swc_acd_vendor'
                    //             });
                    //             var zsQuantity = cur.getCurrentSublistValue({
                    //                 sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                    //                 fieldId: 'custrecord_swc_acd_zs_qty'
                    //             });
                    //
                    //             if (skuData.indexOf(sku) == -1)
                    //                 skuData.push(sku);
                    //
                    //             if (vendorData.indexOf(vendor) == -1)
                    //                 vendorData.push(vendor);
                    //
                    //             lineData.push({
                    //                 id: lineId,
                    //                 sku: sku,
                    //                 vendor: vendor,
                    //                 quantity: zsQuantity
                    //             });
                    //         }
                    //     }
                    //
                    //     //先按供应商排序，再按sku排序
                    //     lineData.sort((a, b) => {
                    //         // 先比较vendor（数字比较）
                    //         if (a.vendor !== b.vendor) {
                    //             return Number(a.vendor) - Number(b.vendor);
                    //         }
                    //         // 如果vendor相同，再比较sku（数字比较）
                    //         return Number(a.sku) - Number(b.sku);
                    //     });
                    //
                    //     console.log('lineData', lineData.length);
                    //     console.log('skuData', skuData);
                    //     console.log('vendorData', vendorData);
                    //     //查询 sku档案 获取sku的长宽高
                    //     let skuObj = {};
                    //     if (skuData.length > 0)
                    //         skuObj = searchSkuData(skuData);
                    //     console.log('skuObj', skuObj);
                    //     //
                    //     //向装箱单明细添加数据
                    //     if (lineData.length > 0) {
                    //         let xh = 1;
                    //         for (let i = 0; i < lineData.length; i++) {
                    //             console.log('lineData[i]',lineData[i]);
                    //             let lineId = lineData[i].id;
                    //             let lineCount = lineData[i].quantity;
                    //             let vendor = lineData[i].vendor;
                    //             let sku = lineData[i].sku;
                    //             let zxcc = '';
                    //             let bztj = '';
                    //             let jz = '';
                    //             let mz = '';
                    //             let gg = '';
                    //             if (sku in skuObj) {
                    //                 gg = skuObj[sku].long + '*' + skuObj[sku].width + '*' + skuObj[sku].height;
                    //                 zxcc = skuObj[sku].zxcc;
                    //                 bztj = skuObj[sku].bztj;
                    //                 jz = skuObj[sku].jz;
                    //                 mz = skuObj[sku].mz;
                    //             }
                    //             console.log('lineCount',lineCount);
                    //             for (let j = 0; j < lineCount; j++) {
                    //                 cur.selectLine({
                    //                     sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                    //                     line: xh - 1
                    //                 });
                    //                 //真实排柜明细
                    //                 if (lineId) cur.setCurrentSublistValue({
                    //                     sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                    //                     fieldId: 'custrecord_swc_pg_mx_id',
                    //                     value: lineId
                    //                 });
                    //                 //序号
                    //                 cur.setCurrentSublistValue({
                    //                     sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                    //                     fieldId: 'custrecord_swc_pg_id',
                    //                     value: xh
                    //                 });
                    //                 //sku
                    //                 if (sku) cur.setCurrentSublistValue({
                    //                     sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                    //                     fieldId: 'custrecord_swc_pg_sku',
                    //                     value: sku
                    //                 });
                    //                 //供应商
                    //                 if (vendor) cur.setCurrentSublistValue({
                    //                     sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                    //                     fieldId: 'custrecord_swc_pg_gys',
                    //                     value: vendor
                    //                 });
                    //                 //数量
                    //                 cur.setCurrentSublistValue({
                    //                     sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                    //                     fieldId: 'custrecord_swc_pg_sl',
                    //                     value: 1
                    //                 });
                    //                 //规格
                    //                 if (gg) cur.setCurrentSublistValue({
                    //                     sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                    //                     fieldId: 'custrecord_swc_pg_gg',
                    //                     value: gg
                    //                 });
                    //                 //箱号
                    //                 cur.setCurrentSublistValue({
                    //                     sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                    //                     fieldId: 'custrecord_swc_pg_xh',
                    //                     value: xh
                    //                 });
                    //                 //箱数
                    //                 cur.setCurrentSublistValue({
                    //                     sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                    //                     fieldId: 'custrecord_swc_pg_xs',
                    //                     value: 1
                    //                 });
                    //                 //纸箱尺寸
                    //                 if (zxcc) cur.setCurrentSublistValue({
                    //                     sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                    //                     fieldId: 'custrecord_swc_pg_zxcc',
                    //                     value: zxcc
                    //                 });
                    //                 //包装体积
                    //                 if (bztj) cur.setCurrentSublistValue({
                    //                     sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                    //                     fieldId: 'custrecord_swc_pg_bztj',
                    //                     value: bztj
                    //                 });
                    //                 //净重
                    //                 if (jz) cur.setCurrentSublistValue({
                    //                     sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                    //                     fieldId: 'custrecord_swc_pg_jz',
                    //                     value: jz
                    //                 });
                    //                 //毛重
                    //                 if (mz) cur.setCurrentSublistValue({
                    //                     sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                    //                     fieldId: 'custrecord_swc_pg_mz',
                    //                     value: mz
                    //                 });
                    //
                    //                 cur.commitLine({
                    //                     sublistId: 'recmachcustrecord_swc_pg_zspgdh'
                    //                 });
                    //
                    //                 console.log('xh',xh);
                    //                 xh++;
                    //             }
                    //         }

                    //         console.log('拆分成功');
                    //         cur.save();
                    //         commonTool.endMask();
                    //         // 刷新页面或跳转
                    //         window.location.reload();
                    //     } else {
                    //         alert('无符合拆分条件的数据');
                    //         commonTool.endMask();
                    //     }
                    // } else {
                    //     alert('无符合拆分条件的数据');
                    //     commonTool.endMask();
                    // }
                } catch (e) {
                    console.log('error', e.message);
                    log.error('error', e.message)
                } finally {
                    // 确保蒙版被关闭
                    if (maskShown) {
                        commonTool.endMask();
                    }
                }
            }
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
        //2026/02/03 swr

        function searchServic(now_rec){
            const locationSearchObj = search.create({
                type: "location",
                filters:
                    [
                        ["custrecord_swc_warehouse_code","anyof",now_rec],
                        "AND",
                        ["custrecord_swc_overseas_warehouse_servic","noneof","@NONE@"]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_overseas_warehouse_servic", label: "海外仓服务商"})
                    ]
            });

            let results = getAllResults(locationSearchObj);
            let servic;
            if (results.length > 0) {
                servic = results[0].getValue({name: "custrecord_swc_overseas_warehouse_servic", label: "海外仓服务商"});
            }
            return servic;
        }


        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            saveRecord: saveRecord,
            splitPacking: splitPacking
        };

    });
