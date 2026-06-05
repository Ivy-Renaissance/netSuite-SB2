/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author SWR
 *@description 积加-查询三方仓入库单信息
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            try {
                var actualObj = searchActualData();
                log.audit('actualObj',actualObj);

                //IC951200260204946
                // var actualObj = {};
                // actualObj['RVLETT-260121-0001'] = {
                //     "location": 1733
                // }
                // actualObj['RVLETT-260114-0001'] = {
                //     "location": 1733
                // }

                if (!actualObj || Object.keys(actualObj).length === 0) {
                    log.error('无需处理数据');
                    return;
                }

            } catch (e) {
                log.error('getinput error', e);
            }
            return actualObj;
        }

        function map(context) {
            try {
                var key = context.key;
                var obj = JSON.parse(context.value);
                log.audit('obj', obj);

                let locationObj = searchLocationData(obj.location);
                log.audit('locationObj', locationObj);
                let wayBillNumber = key;//入库单号
                let thirdWarehouseId;//三方仓ID
                if (obj.locationText && locationObj.servic)
                    thirdWarehouseId = searchThirdWarehouse(obj.locationText,locationObj.servic);
                let shippingMethodCode = locationObj.servic;//物流渠道代码

                // thirdWarehouseId = 57;
                // shippingMethodCode = 3;

                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_tpw_inventory_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var params = {
                    "thirdWarehouseId":thirdWarehouseId,
                    "wayBillNumber":wayBillNumber,
                    "shippingMethodCode":shippingMethodCode
                }
                log.audit('params',params);
                var thirdInventoryObj = interface.JJGetThirdInventory(jj_account, params) || '';
                log.audit('thirdInventoryObj',thirdInventoryObj);


                // 创建一个对象来存储每个SKU的总和
                const skuSummary = {};
                let orderSku = '';
                let date = '';
                if (thirdInventoryObj.length !== 0) {
                    date = thirdInventoryObj[0].warehouseShelfTime;
                    log.audit('thirdInventoryObj.packageList',thirdInventoryObj.packageList);
                    //判断状态信息
                    var status = thirdInventoryObj[0].status;
                    if (status == 'E') {
                        var zdIdData = searchZspgd(wayBillNumber);

                        for (let i = 0;i < zdIdData.length;i++) {
                            context.write({
                                key: 'zspg' + '_' + i, // 确保 key 为字符串
                            });
                        }
                    }
                    // 遍历每个箱子
                    thirdInventoryObj[0].packageList.forEach(box => {
                        log.audit('box',box);
                        // 遍历每个箱子中的产品列表
                        box.productList.forEach(product => {

                            orderSku = product.sku;
                            const sku = product.sku;

                            const putawayQuantity = product.putawayQuantity;
                            if (putawayQuantity === 0) {
                                return; // 跳过当前产品
                            }
                            log.audit('putawayQuantity',putawayQuantity);

                            // 如果SKU不存在于结果对象中，初始化
                            if (!skuSummary[sku]) {
                                skuSummary[sku] = {
                                    quantity: 0,
                                    wayBillNumber: wayBillNumber,
                                    shippingMethodCode: shippingMethodCode,
                                    date: date
                                };
                            }

                            // 累加putawayQuantity
                            skuSummary[sku].quantity += putawayQuantity;
                        });
                    });

                    // 输出: { "DV-1S0019": { "quantity": 4 } }
                    log.audit('skuSummary',skuSummary);
                    for (let key in skuSummary) {
                        if (skuSummary[key].quantity != 0) {
                            context.write({
                                key: 'bg' + '_' + key, // 确保 key 为字符串
                                value: skuSummary[key]
                            });
                        }
                    }
                }

                //                let wayBillNumber = key;//入库单号
                //                 let thirdWarehouseId = locationObj.threeid;//三方仓ID
                //                 let shippingMethodCode = locationObj.servic;//物流渠道代码





                // var a = {
                //     "thirdWarehouseId":42,
                //     "shippingMethodCode": 7,
                //     "wayBillNumberArr":["BSYT26011803-4PXGBLONA-3"]
                // }

                //https://open.gerpgo.com/api/open/warehouseCenter/ship/inboundOrder/detail


            } catch (e) {
                log.error("import cache error", e);
            }
        }

        function reduce(context) {
            const key = context.key;
            log.audit('key',key);
            let values = JSON.parse(context.values);
            log.audit('values',values);

            var type = key.split('_')[0];
            if (type == 'bg') {
                var item = key.split('_')[1];
                if (values) {
                    // 创建组合唯一键：入库单号 + SKU
                    const uniqueKey = values.wayBillNumber + '_' + item;

                    // 检查是否已存在相同记录
                    const existingRecordId = checkExistingRecord(uniqueKey);

                    if (existingRecordId) {
                        // 更新现有记录
                        log.audit('更新已存在记录', existingRecordId);
                        updateRecord(existingRecordId, values, item);
                    } else {
                        // 创建新记录
                        createNewRecord(values, item, uniqueKey);
                    }
                }
            } else {
                var zsId = key.split('_')[1];
                record.submitFields({
                    type: 'customrecord_swc_actual_cabinet',
                    id: zsId,
                    values: {
                        'custrecord_swc_ac_locinfo_flag': true
                    }
                })
            }
        }

        function checkExistingRecord(uniqueKey) {
            try {
                const searchObj = search.create({
                    type: 'customrecord_swc_platform_loc_in_info',
                    filters: [
                        ['externalid', 'is', uniqueKey]
                    ],
                    columns: [
                        search.createColumn({name: 'internalid'})
                    ]
                });

                const results = searchObj.run().getRange({start: 0, end: 1});
                if (results && results.length > 0) {
                    return results[0].id;
                }
                return null;
            } catch (e) {
                log.error('检查记录存在时出错', e);
                return null;
            }
        }

        function createNewRecord(value, sku, uniqueKey) {
            try {
                const itemId = searchItem(sku);

                var rec = record.create({
                    type: 'customrecord_swc_platform_loc_in_info',
                    isDynamic: true
                });

                // 唯一键
                rec.setValue({
                    fieldId: 'externalid',
                    value: uniqueKey
                });

                // 仓库类型
                rec.setValue({
                    fieldId: 'custrecord_swc_in_loc_type',
                    value: 3 // 3PL仓
                });

                // 主单号
                rec.setValue({
                    fieldId: 'custrecord_swc_in_number',
                    value: value.wayBillNumber
                });

                // SKU
                rec.setValue({
                    fieldId: 'custrecord_swc_in_sku_code',
                    value: sku
                });

                // 目的仓上架日期
                if (value.date) {
                    rec.setText({
                        fieldId: 'custrecord_swc_in_ow_date',
                        text: value.date.split(' ')[0]
                    });
                }

                // 目的仓上架数量
                rec.setValue({
                    fieldId: 'custrecord_swc_in_ow_quantity',
                    value: value.quantity
                });

                // 海外仓服务商
                rec.setValue({
                    fieldId: 'custrecord_swc_in_date_servic',
                    value: value.shippingMethodCode
                });

                var servic = rec.getText({
                    fieldId: 'custrecord_swc_in_date_servic',
                });

                var skuId = searchSku(itemId,servic);

                if (skuId)  rec.setValue({
                    fieldId: 'custrecord_swc_in_sku',
                    value: value.skuId
                });

                const recId = rec.save();
                log.audit('生成成功', recId);
                return recId;
            } catch (e) {
                log.error('创建记录失败', {sku, uniqueKey, error: e});
                throw e;
            }
        }

        function updateRecord(recordId, value, sku) {
            try {
                var rec = record.load({
                    type: 'customrecord_swc_platform_loc_in_info',
                    id: recordId,
                    isDynamic: true
                });

                // 更新数量
                rec.setValue({
                    fieldId: 'custrecord_swc_in_ow_quantity',
                    value: value.quantity
                });

                // 更新日期
                if (value.date) {
                    rec.setText({
                        fieldId: 'custrecord_swc_in_ow_date',
                        text: value.date.split(' ')[0]
                    });
                }

                // 更新数量
                rec.setValue({
                    fieldId: 'custrecord_swc_in_sku_code',
                    value: sku
                });

                // // 更新服务商
                // rec.setValue({
                //     fieldId: 'custrecord_swc_in_date_servic',
                //     value: value.shippingMethodCode
                // });

                const recId = rec.save();
                log.audit('更新成功', recId);
                return recId;
            } catch (e) {
                log.error('更新记录失败', {recordId, error: e});
                throw e;
            }
        }

        function summarize(summary) {
        }

        function searchSku(itemId,servic) {
            var skuId;
            search.create({
                type: "customrecord_swc_thirdproduct_mapping",
                filters:
                    [
                        ["custrecord_swc_tp_sku_map_thirdsku","startswith",itemId],
                        "AND",
                        ["custrecord_swc_tp_sku_map_spname","startswith",servic]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_3pl_item", label: "货品"}),
                        search.createColumn({name: "internalid", label: "内部 ID",sort: search.Sort.DESC})
                    ]
            }).run().each(function (rec) {
                skuId = rec.getValue({name: "custrecord_swc_3pl_item", label: "货品"});
            });
            return skuId
        }

        function searchActualData() {
            const customrecord_swc_actual_cabinetSearchObj = search.create({
                type: "customrecord_swc_actual_cabinet",
                filters:
                    [
                        ["custrecord_swc__pg_hw_lc_number","isnotempty",""],
                        "AND",
                        ["custrecord_swc_pg_md_location","noneof","@NONE@"],
                        // "AND",
                        // ["internalid","anyof","27"]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "custrecord_swc_pg_md_location", label: "目的仓仓库代码"}),
                        search.createColumn({name: "custrecord_swc__pg_hw_lc_number", label: "海外仓入库单号"})
                    ]
            });

            let results = getAllResults(customrecord_swc_actual_cabinetSearchObj);
            // let searchID = itemSearchObj.save();
            // log.audit('searchID',searchID);
            let obj = {};
            results.forEach(function (value) {
                let number = value.getValue({name: "custrecord_swc__pg_hw_lc_number", label: "海外仓入库单号"});
                obj[number] = {
                    "location": value.getValue({name: "custrecord_swc_pg_md_location", label: "目的仓仓库代码"}),
                    "locationText": value.getText({name: "custrecord_swc_pg_md_location", label: "目的仓仓库代码"})
                }

            });

            return obj
        }

        function searchLocationData(code) {
            const locationSearchObj = search.create({
                type: "location",
                filters:
                    [
                        ["custrecord_swc_warehouse_code","anyof",code]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custrecord_swc_jj_warehouse_id",
                            summary: "GROUP",
                            label: "三方仓id"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_overseas_warehouse_servic",
                            summary: "GROUP",
                            label: "海外仓服务商"
                        })
                    ]
            });

            let results = getAllResults(locationSearchObj);
            // let searchID = itemSearchObj.save();
            // log.audit('searchID',searchID);
            let obj = {};
            results.forEach(function (value) {
                obj = {
                    "threeid": value.getValue({
                        name: "custrecord_swc_jj_warehouse_id",
                        summary: "GROUP",
                        label: "三方仓id"
                    }),
                    "servic": value.getValue({
                        name: "custrecord_swc_overseas_warehouse_servic",
                        summary: "GROUP",
                        label: "海外仓服务商"
                    }),
                }
            });

            return obj
        }

        function searchItem(sku) {
            const itemSearchObj = search.create({
                type: "item",
                title: '库存分账接口获取货品ID' + new Date(),
                filters:
                    [
                        ["itemId","is",sku]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "itemId", label: "货品编码"})
                    ]
            });

            let results = getAllResults(itemSearchObj);

            let id = '';
            results.forEach(function (value) {

                // let itemId = value.getValue({name: "itemId", label: "货品编码"});
                id = value.id;
            });

            return id
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

        function searchZspgd(wayBillNumber) {
            const customrecord_swc_actual_cabinetSearchObj = search.create({
                type: "customrecord_swc_actual_cabinet",
                filters:
                    [
                        ["custrecord_swc__pg_hw_lc_number","startswith",wayBillNumber]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            summary: "GROUP",
                            label: "内部 ID"
                        })
                    ]
            });

            let results = getAllResults(customrecord_swc_actual_cabinetSearchObj);

            let idData = [];
            results.forEach(function (value) {

                // let itemId = value.getValue({name: "itemId", label: "货品编码"});
                idData.push(value.getValue({
                    name: "internalid",
                    summary: "GROUP",
                    label: "内部 ID"
                }));
            });

            return idData
        }

        function searchThirdWarehouse(locationText,servic) {

            const customrecord_swc_overseas_arehouse_codeSearchObj = search.create({
                type: "customrecord_swc_overseas_arehouse_code",
                filters:
                    [
                        ["name","startswith",locationText],
                        "AND",
                        ["custrecord_swc_service_provider","anyof",servic]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_loc_id", label: "积加ID"})
                    ]
            });

            let results = getAllResults(customrecord_swc_overseas_arehouse_codeSearchObj);

            let three ;
            results.forEach(function (value) {

                three = value.getValue({name: "custrecord_swc_loc_id", label: "积加ID"});
            });

            return three
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });