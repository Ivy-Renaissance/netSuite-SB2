/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_MANO_SHIPMENT.js
 *@description Mano库存分类账-发货、调整
 */
define(['../common/interface', '../common/moment', 'N/runtime', 'N/record', 'N/search', 'N/format', 'N/error'],
    function (interface, moment, runtime, record, search, format, error) {

        var shipment_record_type = 'customrecord_swc_mamo_inventoryledger'
        function getInputData() {
            var startTime = new Date().getTime();
            log.emergency('getInputData 开始', startTime);
            var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_mano_store' });
            var orderid = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_mano_orderid' });
            var shipdate_start = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_mano_shipdate_start' });
            var shipdate_end = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_mano_shipdate_end' });
            var req_limit = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_mano_limit' });
            var memo = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_mano_memo' });

            if (shipdate_start) {
                shipdate_start = format.format({ value: shipdate_start, type: 'date' })
            }
            if (shipdate_end) {
                shipdate_end = format.format({ value: shipdate_end, type: 'date' })
            }
            var orders = [];
            var limit = 399;
            var filters = [
                ['custrecord_swc_mano_resolved', 'is', false], 'and',
                ['custrecord_swc_mano_type', 'is', 'Customer Order']
            ]
            if (orderid) {
                filters.push('and', ['custrecord_swc_mano_reference', 'is', orderid])
            };
            if (shipdate_end && shipdate_start) {
                filters.push('and', ['custrecord_swc_mano_created', 'within', [shipdate_start, shipdate_end]])
            }
            if (shipdate_end && !shipdate_start) {
                filters.push('and', ['custrecord_swc_mano_created', 'onorbefore', shipdate_end])
            }
            if (!shipdate_end && shipdate_start) {
                filters.push('and', ['custrecord_swc_mano_created', 'onorafter', shipdate_start])
            }

            if (memo) {
                filters.push('and', ['custrecord_swc_mano_error', 'contains', memo])
            }
            if (req_limit) {
                limit = req_limit;
            }
            log.audit('filters', filters)
            search.create({
                type: shipment_record_type,
                filters: filters,
                columns: [
                    { name: 'custrecord_swc_mano_retry', sort: search.Sort.ASC },
                    { name: 'custrecord_swc_mano_created', sort: search.Sort.ASC },
                    { name: 'custrecord_swc_mano_quantity' },
                    { name: 'custrecord_swc_mano_sku' },
                    { name: 'custrecord_swc_mano_reference' },
                    { name: 'custrecord_swc_mano_location' },
                    { name: 'custrecord_swc_mano_item' },
                    { name: 'custrecord_swc_mano_warehouse' },
                    { name: 'custrecord_swc_mano_type' },
                ]
            }).run().each(function (rec) {
                orders.push({
                    fsd_id: rec.id,
                    fsd_retry: rec.getValue({ name: 'custrecord_swc_mano_retry', sort: search.Sort.ASC }),
                    fsd_shipment_date: rec.getValue({ name: 'custrecord_swc_mano_created', sort: search.Sort.ASC }),
                    fsd_quantity: rec.getValue('custrecord_swc_mano_quantity'),
                    fsd_sku: interface.replaceToChinessChar(rec.getValue('custrecord_swc_mano_sku')),
                    fsd_facility: rec.getValue('custrecord_swc_mano_location'),
                    fsd_order_id: rec.getValue('custrecord_swc_mano_reference'),
                    fsd_item: rec.getValue('custrecord_swc_mano_item'),
                    fsd_location: rec.getValue('custrecord_swc_mano_warehouse'),
                    fsd_type: rec.getValue('custrecord_swc_mano_type'),
                });
                return --limit > 0
            })
            log.emergency('获取数量 orders', orders.length)
            var endTime = new Date().getTime();
            log.emergency('getInputData 结束', endTime);
            log.emergency('getInputData 耗时', endTime - startTime);
            return orders;
        }

        function map(context) {
            var startTime = new Date().getTime();
            log.emergency('map 开始', startTime);
            var obj = JSON.parse(context.value);
            log.audit('obj', obj)
            var fsd_id = obj.fsd_id;
            var fsd_retry = obj.fsd_retry;
            // var fsd_acc_id = obj.fsd_acc_id;
            var fsd_shipment_date = obj.fsd_shipment_date;
            var fsd_quantity = obj.fsd_quantity;
            var fsd_sku = obj.fsd_sku;
            var fsd_order_id = obj.fsd_order_id;
            var fsd_facility = obj.fsd_facility;
            var fsd_location = obj.fsd_location;
            var fsd_item = obj.fsd_item;
            var fsd_type = obj.fsd_type;
            var so_obj = {}, sku_obj = {}, so_id, so_ship_location = '';
            var items_info = [];
            var so_invoice_id, so_itemfulfillment_id, ia_id;
            var oii_flag = false;
            var real_location_info;
            try {
                // var acc_info = interface.GetAccountInfo(fsd_acc_id);
                // log.audit('acc_info', acc_info);
                // if (!fsd_location) {
                //     throw '发货仓Id 不存在';
                // }
                // var location_info = interface.GetLocationInfo('', fsd_location);
                // log.audit('location_info', location_info);
                // so_ship_location = location_info.id;


                so_obj = interface.SearchSalesOrder('', fsd_order_id, true);
                log.audit('so_obj', so_obj);
                so_id = so_obj.so_id;
                if (so_id) {
                    if (so_obj.order_status == 'pendingApproval') {
                        record.submitFields({
                            type: record.Type.SALES_ORDER,
                            id: so_id,
                            values: {
                                orderstatus: 'B'
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        })
                    }
                    if (so_obj.ord_status == 'fullyBilled') {
                        record.submitFields({
                            type: shipment_record_type,
                            id: fsd_id,
                            values: {
                                custrecord_swc_mano_error: '没发货已开票',
                                custrecord_swc_mano_resolved: true,
                            },
                            options: {
                                ignoreMandatoryFields: true
                            }
                        })
                        return
                    }
                    // 查询有没有关联此发货报告的发票
                    var inv_id = [], fulfill_id = [];
                    search.create({
                        type: 'invoice',
                        filters: [
                            { name: 'custbody_swc_gl_mamo_inventoryledger', operator: 'anyof', values: fsd_id },
                            { name: 'mainline', operator: 'is', values: true }
                        ]
                    }).run().each(function (rec) {
                        inv_id.push(rec.id);
                        return true;
                    })
                    // 查询有没有关联此发货报告的货品实施单
                    search.create({
                        type: 'itemfulfillment',
                        filters: [
                            { name: 'custbody_swc_gl_mamo_inventoryledger', operator: 'anyof', values: fsd_id },
                            { name: 'mainline', operator: 'is', values: true }
                        ]
                    }).run().each(function (rec) {
                        fulfill_id.push(rec.id)
                        return true
                    })
                    if (inv_id.length == 1 && fulfill_id.length == 1) {
                        // 已存在此报告的发票，并且只有一个，就设置为T
                        record.submitFields({
                            type: shipment_record_type,
                            id: fsd_id,
                            values: {
                                custrecord_swc_mano_error: '已存在此报告的发票',
                                custrecord_swc_mano_resolved: true,
                                custrecord_swc_mano_itemfulfillment: fulfill_id[0],
                                custrecord_swc_mano_invoice: inv_id[0],
                                custrecord_swc_mano_salesorder: so_obj.so_id,
                            },
                            options: {
                                ignoreMandatoryFields: true
                            }
                        })
                        return
                    } else if (inv_id.length == 0 && fulfill_id.length > 0) {
                        fulfill_id.map(function (dls) {
                            // 如果是已发货，但是没开票，考虑到要保持一个发货一份发票，所以要把这个发货单删除，重新发货开票
                            var de = record.delete({ type: 'itemfulfillment', id: dls })
                            log.debug('已删除发货单，重新发货发票', de)
                        })
                    } else if (inv_id.length > 0 && fulfill_id.length == 0) {
                        inv_id.map(function (dls) {
                            // 如果是已开票，但是没发货，考虑到要保持一个发货一份发票，所以要把这个发货单删除，重新发货开票
                            var de = record.delete({ type: 'invoice', id: dls })
                            log.debug('已删除发票，重新发货发票', de)
                        })
                    }
                    else if (inv_id.length > 0 && fulfill_id.length > 0) {
                        // 发货有问题，停止发货，需要人工检查问题
                        record.submitFields({
                            type: shipment_record_type,
                            id: fsd_id,
                            values: {
                                custrecord_swc_mano_error: '发货有问题，停止发货，需要人工检查问题',
                            },
                            options: {
                                ignoreMandatoryFields: true
                            }
                        })
                        return
                    }

                    // var so_items = interface.SearchItemInfo(so_id);
                    var acc_info = interface.GetAccountInfo(so_obj.entity);
                    log.audit('acc_info', acc_info);

                    var location_attribute = '平台仓';
                    //TODO:测试环境ID 81
                    //TODO:生产环境ID 20
                    // let acc_sub_id = acc_info.subsidiary;
                    // if (runtime.accountId == '11297254_SB1') {
                    //     if (acc_sub_id == '81') {// 81 Fax East Trading LLC
                    //         location_attribute = '店铺虚拟仓';
                    //     } else {
                    //         location_attribute = '平台仓海外仓';
                    //     }
                    // } else {
                    //     if (acc_sub_id == '20') {// 20 Fax East Trading LLC
                    //         location_attribute = '店铺虚拟仓';
                    //     } else {
                    //         location_attribute = '平台仓海外仓';
                    //     }
                    // }
                    var location_info = interface.GetLocationInfo(fsd_sp_warehouse_id, '', acc_info.plan_metrics, 'Mano', location_attribute);
                    log.audit('location_info', location_info);
                    
                    var item_info = interface.GetItemInfoByPSM(acc_info.id, fsd_sku);
                    
                    //TODO:测试环境ID：7
                    //TODO:生产环境ID：7
                    if (item_info.item_cplb == '7') {
                        var pj_location_info = interface.GetLocationInfo(fsd_sp_warehouse_id, '', acc_info.pj_plan_metrics, 'Mano', location_attribute);
                        log.audit('pj_location_info', pj_location_info);
                        real_location_info = pj_location_info;
                    } else {
                        real_location_info = location_info;
                    }
                    so_ship_location = real_location_info.id;

                    if (so_obj.subsidiary == real_location_info.subsidiary) {
                        // SOAddlocation(so_id, so_ship_location, items_info)
                        so_itemfulfillment_id = SoToItemFulfillment(fsd_id, so_obj, fsd_order_id, fsd_shipment_date, fsd_quantity, acc_info, so_ship_location, item_info, fsd_sku);
                        log.audit('so_itemfulfillment_id', so_itemfulfillment_id);
                        if (so_itemfulfillment_id) {
                            so_invoice_id = SoToInvoice(fsd_id, so_obj, fsd_shipment_date, so_itemfulfillment_id, fsd_quantity, item_info, fsd_sku);
                            log.debug('so_invoice_id', so_invoice_id)
                            if (so_invoice_id) {
                                record.submitFields({
                                    type: shipment_record_type,
                                    id: fsd_id,
                                    values: {
                                        custrecord_swc_mano_resolved: true,
                                        custrecord_swc_mano_error: '',
                                        custrecord_swc_mano_itemfulfillment: so_itemfulfillment_id,
                                        custrecord_swc_mano_invoice: so_invoice_id,
                                        custrecord_swc_mano_salesorder: so_obj.so_id,
                                    },
                                    options: {
                                        ignoreMandatoryFields: true
                                    }
                                });
                            }
                        }
                    } else {
                        //公司间交易,暂不处理
                        throw '公司间交易,暂无处理逻辑';
                    }

                } else {
                    throw '找不到销售订单，请确认是否存在';
                }
            } catch (err) {
                log.debug('map error', err)
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                if (so_itemfulfillment_id) {
                    record.delete({
                        type: record.Type.ITEM_FULFILLMENT,
                        id: so_itemfulfillment_id
                    });
                }
                // DeleteInterCompanyTO(TO_ids, IF_ids, IR_ids)
                // if ((fsd_order_id.indexOf('S') != -1)) {
                //     try {
                if (so_id) {
                    SODeletelocation(so_id, items_info)
                }
                // } catch (dl) {
                //     log.audit('SODeletelocation error', dl);
                // }
                // }
                record.submitFields({
                    type: shipment_record_type,
                    id: fsd_id,
                    values: {
                        // custrecord_swc_jj_fs_item: sku_obj.sku_id,
                        custrecord_swc_mano_error: e,
                        custrecord_swc_mano_retry: Number(fsd_retry) + 1
                    },
                    options: {
                        ignoreMandatoryFields: true
                    }
                })
            }
            var endTime = new Date().getTime();
            log.emergency('map 结束', endTime);
            log.emergency('map 耗时', (endTime - startTime) + '----' + fsd_order_id);
        }

        function reduce(context) {

        }

        function summarize(summary) {

        }

        function SOAddlocation(so_id, location, items_info) {
            log.audit('SOAddlocation', {
                so_id: so_id,
                location: location,
                items_info: items_info,
            });
            var so_rec = record.load({ type: 'salesorder', id: so_id });
            so_rec.setValue({ fieldId: 'location', value: location });
            for (var index = 0; index < so_rec.getLineCount({ sublistId: 'item' }); index++) {
                var item_id = so_rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: index });
                var line_no = so_rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: index });
                var so_inventorylocation = so_rec.getSublistValue({ sublistId: 'item', fieldId: 'inventorylocation', line: index });
                var so_location = so_rec.getSublistValue({ sublistId: 'item', fieldId: 'location', line: index });
                for (var i = 0; i < items_info.length; i++) {
                    if (item_id == items_info[i].so_item_id && line_no == items_info[i].so_item_line_no) {
                        log.audit('地点', {
                            inventorylocation: so_inventorylocation,
                            location: so_location,
                        });
                        if (so_inventorylocation && so_location) {
                        } else {
                            so_rec.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location, line: index });
                            so_rec.setSublistValue({ sublistId: 'item', fieldId: 'inventorylocation', value: location, line: index });
                            log.audit('增加地点', 'ok');
                        }
                    }
                }
            }
            so_rec.save({ ignoreMandatoryFields: true });
        }

        function SODeletelocation(so_id, items_info) {
            var so_rec = record.load({ type: 'salesorder', id: so_id });
            so_rec.setValue({ fieldId: 'location', value: '' });
            for (var index = 0; index < so_rec.getLineCount({ sublistId: 'item' }); index++) {
                var item_id = so_rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: index });
                var line_no = so_rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: index });
                var quantityfulfilled = so_rec.getSublistValue({ sublistId: 'item', fieldId: 'quantityfulfilled', line: index });
                log.audit('quantityfulfilled', quantityfulfilled);
                for (var i = 0; i < items_info.length; i++) {
                    if (item_id == items_info[i].so_item_id && line_no == items_info[i].so_item_line_no) {
                        if (quantityfulfilled == 0) {
                            so_rec.setSublistValue({ sublistId: 'item', fieldId: 'location', value: '', line: index });
                            so_rec.setSublistValue({ sublistId: 'item', fieldId: 'inventorylocation', value: '', line: index });
                        }
                    }
                }
            }
            so_rec.save({ ignoreMandatoryFields: true });
        }

        function SoToItemFulfillment(fsd_id, so_obj, fsd_order_id, fsd_shipment_date, fsd_quantity, acc_info, so_ship_location, fsd_item_info, fsd_sku) {
            log.debug('SoToItemFulfillment', {
                fsd_id: fsd_id,
                fsd_order_id: fsd_order_id,
                fsd_shipment_date: fsd_shipment_date,
                fsd_quantity: fsd_quantity,
                so_ship_location: so_ship_location,
            });
            var so_id = so_obj.so_id;
            var location = so_ship_location;
            var acc_timezone = acc_info.timezone;
            var ia_id;
            log.audit('location', location);
            try {

                fsd_shipment_date = format.parse({ value: fsd_shipment_date, type: 'date' });
                try {
                    f = record.transform({
                        fromType: record.Type.SALES_ORDER,
                        toType: record.Type.ITEM_FULFILLMENT,
                        fromId: Number(so_id),
                        isDynamic: false,
                        defaultValues: {
                            inventorylocation: location
                        }
                    });
                } catch (err) {
                    var e = err.message ? err.message : err;
                    throw error.create({
                        name: '5011',
                        message: '销售订单转出库单失败:' + e,
                        notifyOff: false
                    });
                }
                f.setValue({ fieldId: 'trandate', value: fsd_shipment_date });
                f.setValue({ fieldId: 'shipstatus', value: 'C' });
                f.setValue({ fieldId: 'custbody_swc_gl_mamo_inventoryledger', value: fsd_id }); // 关联发货报告

                var kit_quantityremaining, inv_quantityremaining, ab_quantityremaining, kit_line_no, kit_itemreceive = false, kit_assembly = false, inv_itemreceive = true, inv_assembly = true;
                var lineCount = f.getLineCount({ sublistId: 'item' });
                for (var i = 0; i < lineCount; i++) {
                    f.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location, line: i });
                    var f_item_id = f.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    var f_item_type = f.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });
                    var f_seller_sku = f.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_msku', line: i }).trim();
                    var f_line_no = f.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: i });
                    var platform_line_id = f.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_platform_line_id', line: i });
                    var f_description = f.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i });
                    var f_onhand = f.getSublistValue({ sublistId: 'item', fieldId: 'onhand', line: i }) // 可用数量
                    var f_quantityremaining = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i })  //剩余数量
                    var f_location = f.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i })  //仓库
                    log.debug('f_item_type:' + i, f_item_type);
                    log.debug('f_location:' + i, f_location);
                    log.debug('f_onhand:' + i, f_onhand);
                    if (f_item_type == 'Kit') {
                        kit_quantityremaining = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i });
                        if (f_item_id == fsd_item_info.item_id && f_seller_sku == fsd_sku) {// && oii_flag ? true : platform_line_id == fsd_order_line_no
                            log.debug('Kit', {
                                f_item_id: f_item_id,
                                f_seller_sku: f_seller_sku,
                                // fsd_sku: fsd_sku,
                                // fsd_order_line_no: fsd_order_line_no,
                                platform_line_id: platform_line_id,
                            })
                            kit_line_no = f.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: i });
                            f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: fsd_quantity, line: i });
                            kit_itemreceive = true;
                            kit_assembly = true;
                            inv_itemreceive = false;
                            inv_assembly = false;
                            f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true, line: i });
                        } else {
                            // log.debug('Kit itemreceive false')
                            f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: i });
                        }
                    } else if (f_item_type == "InvtPart" && kit_itemreceive && kit_line_no == f_line_no) {
                        log.debug('InvtPart kit_itemreceive', {
                            f_item_id: f_item_id,
                            f_seller_sku: f_seller_sku,
                            fsd_sku: fsd_sku,
                        })
                        //根据KIT是否接收，数量等于KIT的组件数量*发货报告数量
                        inv_quantityremaining = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i });
                        var inv_fulfill_qty = inv_quantityremaining / kit_quantityremaining * fsd_quantity
                        f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: inv_fulfill_qty, line: i });
                        var itemResult = search.lookupFields({ type: 'item', id: f_item_id, columns: ['islotitem', 'isserialitem', 'assetaccount'] });
                        log.audit('itemResult', itemResult);
                        var islotitem = itemResult['islotitem'];
                        var isserialitem = itemResult['isserialitem'];
                        var assetaccount = itemResult['assetaccount'][0].value;
                        if (islotitem || isserialitem) {
                            InventoryDetails(f, i, inv_fulfill_qty, location, 'so', acc_timezone, assetaccount)
                        } else {
                            SearchInventory(f, f_item_id, inv_fulfill_qty, location, acc_timezone, assetaccount);
                        }
                    } else if (f_item_type == "Assembly" && kit_assembly && kit_line_no == f_line_no) {
                        log.debug('Assembly kit_itemreceive', {
                            f_item_id: f_item_id,
                            f_seller_sku: f_seller_sku,
                            fsd_sku: fsd_sku,
                        })
                        ab_quantityremaining = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i });
                        var ab_fulfill_qty = ab_quantityremaining / kit_quantityremaining * fsd_quantity
                        f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: ab_fulfill_qty, line: i });
                        var itemResult = search.lookupFields({ type: 'item', id: f_item_id, columns: ['islotitem', 'isserialitem', 'assetaccount'] });
                        log.audit('itemResult', itemResult);
                        var islotitem = itemResult['islotitem'];
                        var isserialitem = itemResult['isserialitem'];
                        var assetaccount = itemResult['assetaccount'][0].value;
                        if (islotitem || isserialitem) {
                            InventoryDetails(f, i, ab_fulfill_qty, location, 'so', acc_timezone, assetaccount)
                        } else {
                            SearchInventory(f, f_item_id, ab_fulfill_qty, location, acc_timezone, assetaccount);
                        }
                    } else if (f_item_type == "InvtPart" && ((inv_itemreceive && !kit_itemreceive) || (!inv_itemreceive && kit_itemreceive))) {
                        if (f_item_id == fsd_item_info.item_id && f_seller_sku == fsd_sku) {// && oii_flag ? true : platform_line_id == fsd_order_line_no
                            log.debug('InvtPart inv_itemreceive 2', {
                                f_item_id: f_item_id,
                                f_seller_sku: f_seller_sku,
                                // fsd_sku: fsd_sku,
                                // fsd_order_line_no: fsd_order_line_no,
                                platform_line_id: platform_line_id,
                            })
                            f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: fsd_quantity, line: i });
                            var itemResult = search.lookupFields({ type: 'item', id: f_item_id, columns: ['islotitem', 'isserialitem', 'assetaccount'] });
                            log.audit('itemResult', itemResult);
                            var islotitem = itemResult['islotitem'];
                            var isserialitem = itemResult['isserialitem'];
                            var assetaccount = itemResult['assetaccount'][0].value;
                            if (islotitem || isserialitem) {
                                InventoryDetails(f, i, fsd_quantity, location, 'so', acc_timezone, assetaccount)
                            } else {
                                SearchInventory(f, f_item_id, fsd_quantity, location, acc_timezone, assetaccount);
                            }
                            f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true, line: i });
                        } else {
                            f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: i });
                        }
                    } else if (f_item_type == "Assembly" && ((inv_assembly && !kit_assembly) || (!inv_assembly && kit_assembly))) {
                        if (f_item_id == fsd_item_info.item_id && f_seller_sku == fsd_sku) {// && oii_flag ? true : platform_line_id == fsd_order_line_no
                            log.debug('Assembly inv_assembly', {
                                f_item_id: f_item_id,
                                f_seller_sku: f_seller_sku,
                                // fsd_sku: fsd_sku,
                                // fsd_order_line_no: fsd_order_line_no,
                                platform_line_id: platform_line_id,
                            })
                            f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: fsd_quantity, line: i });
                            var itemResult = search.lookupFields({ type: 'item', id: f_item_id, columns: ['islotitem', 'isserialitem', 'assetaccount'] });
                            log.audit('itemResult', itemResult);
                            var islotitem = itemResult['islotitem'];
                            var isserialitem = itemResult['isserialitem'];
                            var assetaccount = itemResult['assetaccount'][0].value;
                            if (islotitem || isserialitem) {
                                InventoryDetails(f, i, fsd_quantity, location, 'so', acc_timezone, assetaccount)
                            } else {
                                SearchInventory(f, f_item_id, fsd_quantity, location, acc_timezone, assetaccount);
                            }
                            f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true, line: i });
                        } else {
                            f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: i });
                        }
                    }
                }

                var f_id = f.save({ ignoreMandatoryFields: true });
                return f_id;
            } catch (err) {
                log.audit('SoToItemFulfillment error', err);
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                if (ia_id) {
                    record.delete({
                        type: 'inventoryadjustment',
                        id: ia_id
                    });
                }
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        function SoToInvoice(fsd_id, so_obj, fsd_shipment_date, f_id, fsd_quantity, fsd_item_info, fsd_sku) {
            try {
                fsd_shipment_date = format.parse({ value: fsd_shipment_date, type: 'date' });
                var inv = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    toType: record.Type.INVOICE,
                    fromId: so_obj.so_id,
                    isDynamic: true
                });
                var approval_invoice = interface.GetInvoceApproval();

                var remocl = []
                inv.setValue({ fieldId: 'trandate', value: fsd_shipment_date });
                if (approval_invoice) {
                    inv.setValue({ fieldId: 'approvalstatus', value: 2 });
                }
                inv.setValue({ fieldId: 'custbody_swc_related_item_fulfillment', value: f_id });
                inv.setValue({ fieldId: 'custbody_swc_gl_mamo_inventoryledger', value: fsd_id });
                // 强制限制发票的行等于发货的行
                var len = inv.getLineCount({ sublistId: 'item' }), ck = true, seted = 0, cs = true
                for (var i = seted; i < len; i++) {
                    inv.selectLine({ sublistId: 'item', line: i })
                    var itds = inv.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' })
                    var qty = inv.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' })
                    var msku = inv.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_msku' }).trim();		//sellersku
                    var platform_line_id = inv.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_platform_line_id' });
                    if (itds == fsd_item_info.item_id && msku == fsd_sku && fsd_quantity <= qty && ck) {//(msku == fsd_sku && oii_flag ? true : fsd_order_line_no == platform_line_id) 
                        seted = i + 1
                        ck = false
                        inv.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: fsd_quantity });
                        var index = remocl.indexOf(i)
                        if (index != -1) {
                            remocl.splice(index, 1)
                        }
                        inv.commitLine({ sublistId: 'item' })
                    }
                    else {
                        if (remocl.indexOf(i) == -1) {
                            remocl.push(i)
                        }
                    }
                }
                log.debug('seted: ' + seted, remocl)
                //移除其他行
                var j = 0;
                for (var i = 0; i < len; i++) {
                    var line = remocl.indexOf(i);
                    if (line != -1) {
                        inv.removeLine({
                            sublistId: 'item',
                            line: i - j,
                            ignoreRecalc: false
                        });
                        j++;
                    }
                }
                var inv_id = inv.save({ ignoremandatoryfields: true });
                return inv_id;
            } catch (err) {
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        //批次选择方案1:
        //第一步:先搜索所有当天有结余的批次号，并记录该批次当天结余;
        //第二步:拿这些批次号当过滤条件查当前时间点还有结余的批次;
        //第三步:满足上两步条件的批次，按天汇总当天出入库数，一天天累加算出当天结余，并记录最低结余数，最低结余数才是该批次真实的可用量;(一次性搜出所有批次的数据，按批次分开算)
        /**
         * 
         * @param {*} f     记录
         * @param {*} l     行
         * @param {*} quantity  数量
         * @param {*} location  地点
         * @param {*} type      类型（so\po\to）
         * @param {*} acc_timezone  时区
         * @param {*} assetaccount  库存商品资产账户
         */
        function InventoryDetails(f, l, quantity, location, type, acc_timezone, assetaccount) {
            log.debug('InventoryDetails', {
                quantity: quantity,
                location: location,
                type: type,
                acc_timezone: acc_timezone,
                assetaccount: assetaccount,
            })
            try {
                var itemid = f.getSublistValue({ sublistId: 'item', fieldId: 'item', line: l }), qty = quantity;
                var inventorydetail = f.getSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail', line: l });
                var invennumber = [], line_count = 0;
                var invennumber_quanty = {};
                var invennumber_quanty_min = {};
                var inven_quantity = 0, founded = true;
                var date = f.getValue('trandate');
                var local_datetime = format.format({
                    value: date,
                    type: format.Type.DATE,
                    timezone: acc_timezone
                });
                //第一步:先搜索所有当天有结余的批次号，并记录当天结余;
                var serialnumbers = [], serialnumbers_date = [], sd_sort = 1;
                var t_filters = [
                    [
                        ['taxline', 'is', 'false'], 'and',
                        ['shipping', 'is', 'false'], 'and',
                        ['item', 'anyof', [itemid]], 'and',
                        ['location', 'anyof', [location]], 'and',
                        ['trandate', 'onorbefore', local_datetime], 'and',//发货当天之前
                        ['type', 'anyof', ["InvAdjst", "ItemShip", "ItemRcpt", "InvTrnfr", "Build", "Unbuild", "CustInvc", "VendBill"]], 'and',
                        ['account', 'anyof', [assetaccount]], 'and',
                        ['quantity', 'isnotempty', ''], 'and',
                        [
                            ['appliedtotransaction.type', 'noneof', "ItemShip"], 'or',
                            [
                                ['appliedtotransaction.type', 'anyof', "ItemShip"], 'and',
                                ['createdfrom.type', 'anyof', "RtnAuth"]
                            ]
                        ], 'and',
                        ['serialnumber', 'isnotempty', ''], 'and',
                        [
                            ['mainline', 'is', 'false'], 'or',
                            [
                                ['type', 'anyof', ["Build", "Unbuild"]], 'and',
                                ['mainline', 'any', '']
                            ]
                        ]
                    ], 'or',
                    [
                        ['item', 'anyof', [itemid]], 'and',
                        ['location', 'anyof', [location]], 'and',
                        ['trandate', 'onorbefore', local_datetime], 'and',//发货当天之前
                        ['account', 'anyof', [assetaccount]], 'and',
                        ['quantity', 'isnotempty', ''], 'and',
                        ['serialnumber', 'isnotempty', ''], 'and',
                        ['type', 'anyof', ["BinTrnfr"]]
                    ]
                ];
                log.debug('t_filters', t_filters)
                search.create({
                    type: "transaction",
                    filters: t_filters,
                    columns: [
                        { name: "serialnumber", summary: "GROUP" },
                        { name: "serialnumberquantity", summary: "SUM" },
                        { name: "trandate", summary: "GROUP", sort: search.Sort.ASC },
                    ]
                }).run().each(function (e) {
                    log.debug('当天有结余', e)
                    if (Number(e.getValue(e.columns[1])) > 0) {
                        //如果当天结余大于0，记录当天结余，并把批次号记录起来
                        invennumber_quanty[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                        invennumber_quanty_min[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                        serialnumbers.push(e.getValue(e.columns[0]));
                        serialnumbers_date.push({
                            serialnumber: e.getValue(e.columns[0]),
                            trandate: e.getValue(e.columns[2]),
                            sort_key: sd_sort,
                        });
                        sd_sort++
                    }
                    return true;
                })
                log.debug('serialnumbers', serialnumbers)

                if (serialnumbers.length == 0) {
                    throw error.create({
                        name: '5015',
                        message: '发货当天之前无可用批次号',
                        notifyOff: false
                    });
                }

                //第二步:先搜索所有当前时间可用量大于0的批次
                var in_filters = [
                    { name: 'item', operator: 'anyof', values: [itemid] },
                    { name: 'location', operator: 'anyof', values: [location] },
                    { name: 'quantityavailable', operator: 'notequalto', values: 0 },  //可用数量不为零
                ]
                log.audit('in_filters', in_filters);
                search.create({
                    type: "inventorynumber",
                    filters: in_filters,
                    columns: [
                        { name: "inventorynumber" },
                        { name: "quantityintransit" },
                        { name: "quantityavailable" },
                        { name: "internalid", sort: search.Sort.ASC }
                    ]
                }).run().each(function (e) {
                    log.audit('当前可用批次/数量', e.getValue('inventorynumber') + '/' + e.getValue('quantityavailable'));
                    if (serialnumbers.indexOf(e.getValue('inventorynumber')) != -1) {
                        //当前可用量大于0且当天可用量大于0才记录
                        invennumber.push({
                            inventorynumber_id: e.id,
                            inventorynumber: e.getValue('inventorynumber'),
                            quantityavailable: e.getValue('quantityavailable'),
                            quantityintransit: e.getValue('quantityintransit'),
                            actual_quantityavailable: 0, //实际可用数量默认为0，实际可用数量后面查每天出入库累加取最小值
                            trandate: '',
                            sort_key: '',
                        })
                    }
                    return true
                })

                //排序，按照入库日期排序
                for (let i = 0; i < serialnumbers_date.length; i++) {
                    for (let j = 0; j < invennumber.length; j++) {
                        if (serialnumbers_date[i].serialnumber == invennumber[j].inventorynumber) {
                            invennumber[j].trandate = serialnumbers_date[i].trandate;
                            invennumber[j].sort_key = serialnumbers_date[i].sort_key;
                        }
                    }
                }

                invennumber.sort((a, b) => { return a.sort_key - b.sort_key });

                log.debug('第一次invennumber', invennumber)
                if (invennumber.length == 0) {
                    //库存不足,直接返回
                    // return '库存不足'
                    throw error.create({
                        name: '5016',
                        message: '当前时间可用库存不足。发货之前可用批次：' + JSON.stringify(serialnumbers),
                        notifyOff: false
                    });
                } else if (invennumber.length > 0) {
                    var fils1 = [
                        [
                            [
                                ['taxline', 'is', 'false'], 'and',
                                ['shipping', 'is', 'false'], 'and',
                                ['item', 'anyof', [itemid]], 'and',
                                ['location', 'anyof', [location]], 'and',
                                ['trandate', 'after', local_datetime], 'and',//当天之后的每天出入库数量之和
                                ['type', 'anyof', ["InvAdjst", "ItemShip", "ItemRcpt", "InvTrnfr", "Build", "Unbuild", "CustInvc", "VendBill"]], 'and',
                                ['account', 'anyof', [assetaccount]], 'and',
                                ['quantity', 'isnotempty', ''], 'and',
                                [
                                    ['appliedtotransaction.type', 'noneof', "ItemShip"], 'or',
                                    [
                                        ['appliedtotransaction.type', 'anyof', "ItemShip"], 'and',
                                        ['createdfrom.type', 'anyof', "RtnAuth"]
                                    ]
                                ], 'and',
                                ['serialnumber', 'isnotempty', ''], 'and',
                                [
                                    ['mainline', 'is', 'false'], 'or',
                                    [
                                        ['type', 'anyof', ["Build", "Unbuild"]], 'and',
                                        ['mainline', 'any', '']
                                    ]
                                ]
                            ], 'or',
                            [
                                ['item', 'anyof', [itemid]], 'and',
                                ['location', 'anyof', [location]], 'and',
                                ['trandate', 'after', local_datetime], 'and',//当天之后的每天出入库数量之和
                                ['account', 'anyof', [assetaccount]], 'and',
                                ['quantity', 'isnotempty', ''], 'and',
                                ['serialnumber', 'isnotempty', ''], 'and',
                                ['type', 'anyof', ["BinTrnfr"]]
                            ]
                        ]
                    ];
                    var fils2 = [];

                    fils1.push('and')
                    for (var index = 0; index < invennumber.length; index++) {
                        fils2.push(['serialnumber', 'is', invennumber[index].inventorynumber])
                        if (index < invennumber.length - 1) {
                            fils2.push('or')
                        }
                    }
                    fils1.push(fils2)
                    log.debug('fils1', fils1)
                    // log.debug('开始搜索每天库存')
                    search.create({
                        type: "transaction",
                        filters: fils1,
                        columns: [
                            { name: "trandate", summary: "GROUP", sort: search.Sort.ASC },
                            { name: "serialnumber", summary: "GROUP" },
                            { name: "serialnumberquantity", summary: "SUM" }
                        ]
                    }).run().each(function (e) {
                        var key = e.getValue(e.columns[1])
                        invennumber_quanty[key] = Number(invennumber_quanty[key]) + Number(e.getValue(e.columns[2]))//那天的结余
                        log.debug('对比结余量', {
                            invennumber_quanty_min: Number(invennumber_quanty_min[key]),
                            invennumber_quanty: Number(invennumber_quanty[key]),
                        });
                        if (Number(invennumber_quanty_min[key]) > Number(invennumber_quanty[key])) {
                            //如果那天的结余比出库当天的结余还小，则替换；需取最小结余量
                            invennumber_quanty_min[key] = Number(invennumber_quanty[key])
                        }
                        // log.debug('invennumber_quanty', invennumber_quanty)
                        // log.debug('invennumber_quanty_min', invennumber_quanty_min)
                        return true;
                    });
                    // log.debug('invennumber_quanty', invennumber_quanty)
                    log.debug('invennumber2', invennumber)
                    log.debug('invennumber_quanty_min', invennumber_quanty_min)
                    //赋值批次库存可用列表中的实际可用量
                    for (var i = 0; i < invennumber.length; i++) {
                        invennumber[i].actual_quantityavailable = invennumber_quanty_min[invennumber[i].inventorynumber]
                        if (invennumber[i].actual_quantityavailable > invennumber[i].quantityavailable) {
                            invennumber[i].actual_quantityavailable = invennumber[i].quantityavailable
                        }
                        if (Number(invennumber_quanty_min[invennumber[i].inventorynumber]) > 0) {
                            //如果批次实际可用量大于0，那么累加到库存可用量中
                            inven_quantity += Number(invennumber_quanty_min[invennumber[i].inventorynumber])
                        }
                    }
                    log.debug('invennumber3', invennumber)
                    // log.debug('结束搜索每天库存')

                    if (inven_quantity < quantity) {
                        // 可用库存不足
                        throw error.create({
                            name: '5017',
                            message: '实际最小可用库存不足。库存数量：' + inven_quantity + ',发货数量：' + quantity + '。批次号：' + JSON.stringify(invennumber),
                            notifyOff: false
                        });
                    } else {
                        //可能会有多批次
                        for (var i = 0; i < invennumber.length; i++) {
                            if (Number(invennumber[i].actual_quantityavailable) <= 0) {
                                //如果实际可用数量小于等于0，则调过此批次
                                continue
                            }
                            // log.debug("line_count:", line_count)
                            qty = Number(type == 'so' ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit) - Number(qty)
                            if (qty >= 0) {
                                if (type == 'so') {
                                    log.debug("赋值批次号ID", invennumber[i].inventorynumber_id)
                                    inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id, line: line_count });
                                    inventorydetail.setSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1, line: line_count });
                                } else {
                                    log.debug("赋值批次号", invennumber[i].inventorynumber)
                                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', Text: invennumber[i].inventorynumber, line: line_count });
                                    inventorydetail.setSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1, line: line_count });
                                }
                                inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: line_count == 0 ? quantity : Number(type == 'so' ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit) - Number(qty), line: line_count });
                                line_count++;
                                break;
                            } else {
                                qty = 0 - Number(qty)
                                if (type == 'so') {
                                    log.debug("赋值批次号ID", invennumber[i].inventorynumber_id)
                                    inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id, line: line_count });
                                    inventorydetail.setSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1, line: line_count });
                                } else {
                                    log.debug("赋值批次号", invennumber[i].inventorynumber)
                                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', Text: invennumber[i].inventorynumber, line: line_count });
                                    inventorydetail.setSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1, line: line_count });
                                }
                                inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: type == 'so' ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit, line: line_count });
                                line_count++;
                            }
                        }
                    }

                }
            } catch (err) {
                log.error('InventoryDetails error', err);
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        function BinInventoryDetails(f, l, quantity, location, type, acc_timezone, assetaccount, global_config) {
            log.debug('BinInventoryDetails', {
                quantity: quantity,
                location: location,
                type: type,
                acc_timezone: acc_timezone,
                assetaccount: assetaccount,
                global_config: global_config,
            })
            try {
                var itemid = f.getSublistValue({ sublistId: 'item', fieldId: 'item', line: l }), qty = quantity;
                var inventorydetail = f.getSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail', line: l });
                var invennumber = [], line_count = 0;
                var invennumber_quanty = {};
                var invennumber_quanty_min = {};
                var inven_quantity = 0, founded = true;
                var date = f.getValue('trandate');
                var local_datetime = format.format({
                    value: date,
                    type: format.Type.DATE,
                    timezone: acc_timezone
                });
                // log.debug('f trandate', date)
                // log.debug('f local_datetime', local_datetime)
                // log.debug('f assetaccount', assetaccount)
                if (!assetaccount) {
                    search.create({
                        type: 'item',
                        filters: [
                            { name: 'internalId', operator: 'is', values: itemid },
                        ],
                        columns: [
                            { name: 'assetaccount' }
                        ]
                    }).run().each(function (rec) {
                        assetaccount = rec.getValue('assetaccount');
                    });
                }
                if (!assetaccount) {
                    throw error.create({
                        name: '5012',
                        message: '库存商品资产账户没配置好',
                        notifyOff: false
                    });
                }
                //第一步:先搜索所有当天有结余的批次号，并记录当天结余;
                var serialnumbers = [];
                var t_filters = [
                    [
                        ['taxline', 'is', 'false'], 'and',
                        ['shipping', 'is', 'false'], 'and',
                        ['item', 'anyof', [itemid]], 'and',
                        ['location', 'anyof', [location]], 'and',
                        ['trandate', 'onorbefore', local_datetime], 'and',//发货当天之前
                        ['type', 'anyof', ["InvAdjst", "ItemShip", "ItemRcpt", "InvTrnfr", "Build", "Unbuild", "CustInvc", "VendBill"]], 'and',
                        ['account', 'anyof', [assetaccount]], 'and',
                        ['quantity', 'isnotempty', ''], 'and',
                        [
                            ['appliedtotransaction.type', 'noneof', "ItemShip"], 'or',
                            [
                                ['appliedtotransaction.type', 'anyof', "ItemShip"], 'and',
                                ['createdfrom.type', 'anyof', "RtnAuth"]
                            ]
                        ], 'and',
                        ['serialnumber', 'isnotempty', ''], 'and',
                        [
                            ['mainline', 'is', 'false'], 'or',
                            [
                                ['type', 'anyof', ["Build", "Unbuild"]], 'and',
                                ['mainline', 'any', '']
                            ]
                        ]
                    ], 'or',
                    [
                        ['item', 'anyof', [itemid]], 'and',
                        ['location', 'anyof', [location]], 'and',
                        ['trandate', 'onorbefore', local_datetime], 'and',//发货当天之前
                        ['account', 'anyof', [assetaccount]], 'and',
                        ['quantity', 'isnotempty', ''], 'and',
                        ['serialnumber', 'isnotempty', ''], 'and',
                        ['type', 'anyof', ["BinTrnfr"]]
                    ]
                ];
                log.debug('t_filters', t_filters)
                search.create({
                    type: "transaction",
                    filters: t_filters,
                    columns: [
                        { name: "serialnumber", summary: "GROUP" },
                        { name: "serialnumberquantity", summary: "SUM" }
                    ]
                }).run().each(function (e) {
                    // log.debug('当天有结余', e)
                    if (Number(e.getValue(e.columns[1])) > 0) {
                        //如果当天结余大于0，记录当天结余，并把批次号记录起来
                        invennumber_quanty[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                        invennumber_quanty_min[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                        serialnumbers.push(e.getValue(e.columns[0]))
                    }
                    return true;
                })
                log.debug('serialnumbers', serialnumbers)

                if (serialnumbers.length == 0) {
                    throw error.create({
                        name: '5015',
                        message: '发货当天之前无可用批次号',
                        notifyOff: false
                    });
                }

                //第二步:先搜索所有当前时间可用量大于0的批次
                var bin_filters = [
                    ['location', 'anyof', [location]], 'and',
                ]
                var bin_filters_2 = []
                for (var index = 0; index < serialnumbers.length; index++) {
                    bin_filters_2.push(['inventorynumber', 'is', serialnumbers[index]])
                    if (index < serialnumbers.length - 1) {
                        bin_filters_2.push('or')
                    }
                }
                bin_filters.push(bin_filters_2)
                log.debug('bin_filters', bin_filters);
                search.create({
                    type: "inventorynumberbin",
                    filters: bin_filters,
                    columns: [
                        // { name: "internalid", sort: search.Sort.ASC },
                        { name: "binnumber" },
                        { name: "inventorynumber", sort: search.Sort.ASC },
                        { name: "quantityonhand" },
                        { name: "quantityavailable" },
                    ]
                }).run().each(function (e) {
                    // log.debug('inventorynumber', e.getText('inventorynumber'))
                    log.audit('当前可用批次/数量', e.getText('inventorynumber'));
                    if (serialnumbers.indexOf(e.getText('inventorynumber')) != -1) {
                        //当前可用量大于0且当天可用量大于0才记录
                        invennumber.push({
                            inventorynumber_id: e.getValue('inventorynumber'),
                            binnumber: e.getValue('binnumber'),
                            inventorynumber: e.getText('inventorynumber'),
                            quantityavailable: e.getValue('quantityavailable'),
                            quantityonhand: e.getValue('quantityonhand'),
                            actual_quantityavailable: 0 //实际可用数量默认为0，实际可用数量后面查每天出入库累加取最小值
                        })
                    }
                    return true
                })

                log.debug('第一次invennumber', invennumber)
                if (invennumber.length == 0) {
                    //库存不足,直接返回
                    // return '库存不足'
                    throw error.create({
                        name: '5016',
                        message: '当前时间可用库存不足。发货之前可用批次：' + JSON.stringify(serialnumbers),
                        notifyOff: false
                    });
                } else if (invennumber.length > 0) {
                    var fils1 = [
                        [
                            [
                                ['taxline', 'is', 'false'], 'and',
                                ['shipping', 'is', 'false'], 'and',
                                ['item', 'anyof', [itemid]], 'and',
                                ['location', 'anyof', [location]], 'and',
                                ['trandate', 'after', local_datetime], 'and',//当天之后的每天出入库数量之和
                                ['type', 'anyof', ["InvAdjst", "ItemShip", "ItemRcpt", "InvTrnfr", "Build", "Unbuild", "CustInvc", "VendBill"]], 'and',
                                ['account', 'anyof', [assetaccount]], 'and',
                                ['quantity', 'isnotempty', ''], 'and',
                                [
                                    ['appliedtotransaction.type', 'noneof', "ItemShip"], 'or',
                                    [
                                        ['appliedtotransaction.type', 'anyof', "ItemShip"], 'and',
                                        ['createdfrom.type', 'anyof', "RtnAuth"]
                                    ]
                                ], 'and',
                                ['serialnumber', 'isnotempty', ''], 'and',
                                [
                                    ['mainline', 'is', 'false'], 'or',
                                    [
                                        ['type', 'anyof', ["Build", "Unbuild"]], 'and',
                                        ['mainline', 'any', '']
                                    ]
                                ]
                            ], 'or',
                            [
                                ['item', 'anyof', [itemid]], 'and',
                                ['location', 'anyof', [location]], 'and',
                                ['trandate', 'after', local_datetime], 'and',//当天之后的每天出入库数量之和
                                ['account', 'anyof', [assetaccount]], 'and',
                                ['quantity', 'isnotempty', ''], 'and',
                                ['serialnumber', 'isnotempty', ''], 'and',
                                ['type', 'anyof', ["BinTrnfr"]]
                            ]
                        ]
                    ];
                    var fils2 = [];

                    fils1.push('and')
                    for (var index = 0; index < invennumber.length; index++) {
                        fils2.push(['serialnumber', 'is', invennumber[index].inventorynumber])
                        if (index < invennumber.length - 1) {
                            fils2.push('or')
                        }
                    }
                    fils1.push(fils2)
                    log.debug('fils1', fils1)
                    // log.debug('开始搜索每天库存')

                    search.create({
                        type: "transaction",
                        filters: fils1,
                        columns: [
                            { name: "trandate", summary: "GROUP", sort: search.Sort.ASC },
                            { name: "serialnumber", summary: "GROUP" },
                            { name: "serialnumberquantity", summary: "SUM" }
                        ]
                    }).run().each(function (e) {
                        // log.debug('当天有结余', e)
                        var key = e.getValue(e.columns[1])
                        invennumber_quanty[key] = Number(invennumber_quanty[key]) + Number(e.getValue(e.columns[2]))//那天的结余
                        if (Number(invennumber_quanty_min[key]) > Number(invennumber_quanty[key])) {
                            //如果那天的结余比出库当天的结余还小，则替换；需取最小结余量
                            invennumber_quanty_min[key] = Number(invennumber_quanty[key])
                        }
                        // log.debug('invennumber_quanty', invennumber_quanty)
                        // log.debug('invennumber_quanty_min', invennumber_quanty_min)
                        return true;
                    });

                    // log.debug('invennumber_quanty', invennumber_quanty)
                    // log.debug('invennumber2', invennumber)
                    //赋值批次库存可用列表中的实际可用量
                    for (var i = 0; i < invennumber.length; i++) {
                        invennumber[i].actual_quantityavailable = invennumber_quanty_min[invennumber[i].inventorynumber]
                        if (invennumber[i].actual_quantityavailable > invennumber[i].quantityavailable) {
                            invennumber[i].actual_quantityavailable = invennumber[i].quantityavailable
                        }
                        if (Number(invennumber_quanty_min[invennumber[i].inventorynumber]) > 0) {
                            //如果批次实际可用量大于0，那么累加到库存可用量中
                            inven_quantity += Number(invennumber_quanty_min[invennumber[i].inventorynumber])
                        }
                    }
                    log.debug('invennumber3', invennumber)
                    // log.debug('结束搜索每天库存')

                    if (inven_quantity < quantity) {
                        // 可用库存不足
                        throw error.create({
                            name: '5017',
                            message: '实际最小可用库存不足。库存数量：' + inven_quantity + ',发货数量：' + quantity + '。批次号：' + JSON.stringify(invennumber),
                            notifyOff: false
                        });
                    } else {
                        //如果全局变量配置按高价先出，根据批次号成本排序
                        if (global_config) {
                            if (global_config.hpfo) {
                                var lotnumbers = [];
                                for (var j = 0; j < invennumber.length; j++) {
                                    lotnumbers.push(invennumber[j].inventorynumber_id)
                                }
                                var lics = [];
                                search.create({
                                    type: 'customrecord_ld_lotnumber_inventory_cost',
                                    filters: [
                                        { name: 'custrecord_ld_lic_item', operator: 'anyof', values: itemid },
                                        { name: 'custrecord_ld_lic_location', operator: 'anyof', values: location },
                                        { name: 'custrecord_ld_lic_lotnumber', operator: 'anyof', values: lotnumbers },
                                    ],
                                    columns: [
                                        { name: 'custrecord_ld_lic_lotnumber' },
                                        { name: 'custrecord_ld_lic_cost' },
                                    ]
                                }).run().each(function (lic) {
                                    var l_lotnumber = lic.getValue('custrecord_ld_lic_lotnumber');
                                    var l_cost = lic.getValue('custrecord_ld_lic_cost');
                                    lics.push({
                                        l_lotnumber: l_lotnumber,
                                        l_cost: l_cost,
                                    })
                                    return true;
                                });
                                for (var k = 0; k < invennumber.length; k++) {
                                    var flag = true;
                                    for (var i = 0; i < lics.length; i++) {
                                        if (lics[i].l_lotnumber == invennumber[k].inventorynumber_id) {
                                            invennumber[k].cost = lics[i].l_cost;
                                            flag = false;
                                            break
                                        }
                                    }
                                    if (flag) {
                                        invennumber[k].cost = '0'
                                    }
                                }
                                invennumber.sort(function (a, b) { return b.cost - a.cost });
                                log.audit('按成本排序后的数据', invennumber);
                            }
                        }
                        //可能会有多批次
                        for (var i = 0; i < invennumber.length; i++) {
                            if (Number(invennumber[i].actual_quantityavailable) <= 0) {
                                //如果实际可用数量小于等于0，则调过此批次
                                continue
                            }
                            // log.debug("line_count:", line_count);
                            // log.debug('inventorynumber:' + i, invennumber[i].inventorynumber)
                            // log.debug('binnumber:' + i, invennumber[i].binnumber)
                            qty = Number(type == 'so' ? invennumber[i].actual_quantityavailable : invennumber[i].quantityavailable) - Number(qty)
                            if (qty >= 0) {
                                if (type == 'so') {
                                    log.debug("赋值批次号ID", invennumber[i].inventorynumber_id)
                                    inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id, line: line_count });
                                    inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', value: invennumber[i].binnumber, line: line_count });
                                    inventorydetail.setSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1, line: line_count });
                                } else {
                                    log.debug("赋值批次号", invennumber[i].inventorynumber)
                                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', Text: invennumber[i].inventorynumber, line: line_count });
                                    inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', value: invennumber[i].binnumber, line: line_count });
                                    inventorydetail.setSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1, line: line_count });
                                }
                                inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: line_count == 0 ? quantity : Number(type == 'so' ? invennumber[i].actual_quantityavailable : invennumber[i].quantityavailable) - Number(qty), line: line_count });
                                line_count++;
                                break;
                            } else {
                                qty = 0 - Number(qty)
                                if (type == 'so') {
                                    log.debug("赋值批次号ID", invennumber[i].inventorynumber_id)
                                    inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id, line: line_count });
                                    inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', value: invennumber[i].binnumber, line: line_count });
                                    inventorydetail.setSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1, line: line_count });
                                } else {
                                    log.debug("赋值批次号", invennumber[i].inventorynumber)
                                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', Text: invennumber[i].inventorynumber, line: line_count });
                                    inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', value: invennumber[i].binnumber, line: line_count });
                                    inventorydetail.setSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1, line: line_count });
                                }
                                inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: type == 'so' ? invennumber[i].actual_quantityavailable : invennumber[i].quantityavailable, line: line_count });
                                line_count++;
                            }
                        }
                    }

                }
            } catch (err) {
                log.debug('BinInventoryDetails error', err);
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        function IsDynamicBinInventoryDetails(f, quantity, location, type, acc_timezone, assetaccount, to_bin_invennumber, global_config) {
            log.debug('IsDynamicBinInventoryDetails', {
                quantity: quantity,
                location: location,
                type: type,
                acc_timezone: acc_timezone,
                assetaccount: assetaccount,
                global_config: global_config,
            })
            try {
                var itemid = f.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' }), qty = quantity;
                var inventorydetail = f.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
                var invennumber = [], line_count = 0;
                var invennumber_quanty = {};
                var invennumber_quanty_min = {};
                var inven_quantity = 0, founded = true;
                var date = f.getValue('trandate');
                var local_datetime = format.format({
                    value: date,
                    type: format.Type.DATE,
                    timezone: acc_timezone
                });
                // log.debug('f trandate', date)
                // log.debug('f local_datetime', local_datetime)
                // log.debug('f assetaccount', assetaccount)
                if (!assetaccount) {
                    search.create({
                        type: 'item',
                        filters: [
                            { name: 'internalId', operator: 'is', values: itemid },
                        ],
                        columns: [
                            { name: 'assetaccount' }
                        ]
                    }).run().each(function (rec) {
                        assetaccount = rec.getValue('assetaccount');
                    });
                }
                if (!assetaccount) {
                    throw error.create({
                        name: '5012',
                        message: '库存商品资产账户没配置好',
                        notifyOff: false
                    });
                }
                //第一步:先搜索所有当天有结余的批次号，并记录当天结余;
                var serialnumbers = [];
                var t_filters = [
                    [
                        ['taxline', 'is', 'false'], 'and',
                        ['shipping', 'is', 'false'], 'and',
                        ['item', 'anyof', [itemid]], 'and',
                        ['location', 'anyof', [location]], 'and',
                        ['trandate', 'onorbefore', local_datetime], 'and',//发货当天之前
                        ['type', 'anyof', ["InvAdjst", "ItemShip", "ItemRcpt", "InvTrnfr", "Build", "Unbuild", "CustInvc", "VendBill"]], 'and',
                        ['account', 'anyof', [assetaccount]], 'and',
                        ['quantity', 'isnotempty', ''], 'and',
                        [
                            ['appliedtotransaction.type', 'noneof', "ItemShip"], 'or',
                            [
                                ['appliedtotransaction.type', 'anyof', "ItemShip"], 'and',
                                ['createdfrom.type', 'anyof', "RtnAuth"]
                            ]
                        ], 'and',
                        ['serialnumber', 'isnotempty', ''], 'and',
                        [
                            ['mainline', 'is', 'false'], 'or',
                            [
                                ['type', 'anyof', ["Build", "Unbuild"]], 'and',
                                ['mainline', 'any', '']
                            ]
                        ]
                    ], 'or',
                    [
                        ['item', 'anyof', [itemid]], 'and',
                        ['location', 'anyof', [location]], 'and',
                        ['trandate', 'onorbefore', local_datetime], 'and',//发货当天之前
                        ['account', 'anyof', [assetaccount]], 'and',
                        ['quantity', 'isnotempty', ''], 'and',
                        ['serialnumber', 'isnotempty', ''], 'and',
                        ['type', 'anyof', ["BinTrnfr"]]
                    ]
                ];
                log.debug('t_filters', t_filters)
                search.create({
                    type: "transaction",
                    filters: t_filters,
                    columns: [
                        { name: "serialnumber", summary: "GROUP" },
                        { name: "serialnumberquantity", summary: "SUM" }
                    ]
                }).run().each(function (e) {
                    // log.debug('当天有结余', e)
                    if (Number(e.getValue(e.columns[1])) > 0) {
                        //如果当天结余大于0，记录当天结余，并把批次号记录起来
                        invennumber_quanty[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                        invennumber_quanty_min[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                        serialnumbers.push(e.getValue(e.columns[0]))
                    }
                    return true;
                })
                log.debug('serialnumbers', serialnumbers)

                if (serialnumbers.length == 0) {
                    throw error.create({
                        name: '5015',
                        message: '发货当天之前无可用批次号',
                        notifyOff: false
                    });
                }

                //第二步:先搜索所有当前时间可用量大于0的批次
                var bin_filters = [
                    ['location', 'anyof', [location]], 'and',
                ]
                var bin_filters_2 = []
                for (var index = 0; index < serialnumbers.length; index++) {
                    bin_filters_2.push(['inventorynumber', 'is', serialnumbers[index]])
                    if (index < serialnumbers.length - 1) {
                        bin_filters_2.push('or')
                    }
                }
                bin_filters.push(bin_filters_2)
                log.debug('bin_filters', bin_filters);
                search.create({
                    type: "inventorynumberbin",
                    filters: bin_filters,
                    columns: [
                        // { name: "internalid", sort: search.Sort.ASC },
                        { name: "binnumber" },
                        { name: "inventorynumber", sort: search.Sort.ASC },
                        { name: "quantityonhand" },
                        { name: "quantityavailable" },
                    ]
                }).run().each(function (e) {
                    // log.debug('inventorynumber', e.getText('inventorynumber'))
                    if (serialnumbers.indexOf(e.getText('inventorynumber')) != -1) {
                        //当前可用量大于0且当天可用量大于0才记录
                        invennumber.push({
                            inventorynumber_id: e.getValue('inventorynumber'),
                            binnumber: e.getValue('binnumber'),
                            inventorynumber: e.getText('inventorynumber'),
                            quantityavailable: e.getValue('quantityavailable'),
                            quantityonhand: e.getValue('quantityonhand'),
                            actual_quantityavailable: 0 //实际可用数量默认为0，实际可用数量后面查每天出入库累加取最小值
                        })
                    }
                    return true
                })

                log.debug('第一次invennumber', invennumber)
                if (invennumber.length == 0) {
                    //库存不足,直接返回
                    // return '库存不足'
                    throw error.create({
                        name: '5016',
                        message: '当前时间可用库存不足。发货之前可用批次：' + JSON.stringify(serialnumbers),
                        notifyOff: false
                    });
                } else if (invennumber.length > 0) {
                    var fils1 = [
                        [
                            [
                                ['taxline', 'is', 'false'], 'and',
                                ['shipping', 'is', 'false'], 'and',
                                ['item', 'anyof', [itemid]], 'and',
                                ['location', 'anyof', [location]], 'and',
                                ['trandate', 'after', local_datetime], 'and',//当天之后的每天出入库数量之和
                                ['type', 'anyof', ["InvAdjst", "ItemShip", "ItemRcpt", "InvTrnfr", "Build", "Unbuild", "CustInvc", "VendBill"]], 'and',
                                ['account', 'anyof', [assetaccount]], 'and',
                                ['quantity', 'isnotempty', ''], 'and',
                                [
                                    ['appliedtotransaction.type', 'noneof', "ItemShip"], 'or',
                                    [
                                        ['appliedtotransaction.type', 'anyof', "ItemShip"], 'and',
                                        ['createdfrom.type', 'anyof', "RtnAuth"]
                                    ]
                                ], 'and',
                                ['serialnumber', 'isnotempty', ''], 'and',
                                [
                                    ['mainline', 'is', 'false'], 'or',
                                    [
                                        ['type', 'anyof', ["Build", "Unbuild"]], 'and',
                                        ['mainline', 'any', '']
                                    ]
                                ]
                            ], 'or',
                            [
                                ['item', 'anyof', [itemid]], 'and',
                                ['location', 'anyof', [location]], 'and',
                                ['trandate', 'after', local_datetime], 'and',//当天之后的每天出入库数量之和
                                ['account', 'anyof', [assetaccount]], 'and',
                                ['quantity', 'isnotempty', ''], 'and',
                                ['serialnumber', 'isnotempty', ''], 'and',
                                ['type', 'anyof', ["BinTrnfr"]]
                            ]
                        ]
                    ];
                    var fils2 = [];

                    fils1.push('and')
                    for (var index = 0; index < invennumber.length; index++) {
                        fils2.push(['serialnumber', 'is', invennumber[index].inventorynumber])
                        if (index < invennumber.length - 1) {
                            fils2.push('or')
                        }
                    }
                    fils1.push(fils2)
                    log.debug('fils1', fils1)
                    // log.debug('开始搜索每天库存')

                    search.create({
                        type: "transaction",
                        filters: fils1,
                        columns: [
                            { name: "trandate", summary: "GROUP", sort: search.Sort.ASC },
                            { name: "serialnumber", summary: "GROUP" },
                            { name: "serialnumberquantity", summary: "SUM" }
                        ]
                    }).run().each(function (e) {
                        // log.debug('当天有结余', e)
                        var key = e.getValue(e.columns[1])
                        invennumber_quanty[key] = Number(invennumber_quanty[key]) + Number(e.getValue(e.columns[2]))//那天的结余
                        if (Number(invennumber_quanty_min[key]) > Number(invennumber_quanty[key])) {
                            //如果那天的结余比出库当天的结余还小，则替换；需取最小结余量
                            invennumber_quanty_min[key] = Number(invennumber_quanty[key])
                        }
                        return true;
                    });

                    // log.debug('invennumber_quanty', invennumber_quanty)
                    // log.debug('invennumber_quanty_min', invennumber_quanty_min)
                    // log.debug('invennumber2', invennumber)
                    //赋值批次库存可用列表中的实际可用量
                    for (var i = 0; i < invennumber.length; i++) {
                        invennumber[i].actual_quantityavailable = invennumber_quanty_min[invennumber[i].inventorynumber];
                        if (invennumber[i].actual_quantityavailable > invennumber[i].quantityavailable) {
                            invennumber[i].actual_quantityavailable = invennumber[i].quantityavailable
                        }
                        if (Number(invennumber_quanty_min[invennumber[i].inventorynumber]) > 0) {
                            //如果批次实际可用量大于0，那么累加到库存可用量中
                            inven_quantity += Number(invennumber_quanty_min[invennumber[i].inventorynumber])
                        }
                    }
                    log.debug('invennumber3', invennumber)
                    // log.debug('结束搜索每天库存')

                    if (inven_quantity < quantity) {
                        // 可用库存不足
                        throw error.create({
                            name: '5017',
                            message: '实际最小可用库存不足。库存数量：' + inven_quantity + ',发货数量：' + quantity + '。批次号：' + JSON.stringify(invennumber),
                            notifyOff: false
                        });
                    } else {
                        //如果全局变量配置按高价先出，根据批次号成本排序
                        if (global_config) {
                            if (global_config.hpfo) {
                                var lotnumbers = [];
                                for (var j = 0; j < invennumber.length; j++) {
                                    lotnumbers.push(invennumber[j].inventorynumber_id)
                                }
                                var lics = [];
                                search.create({
                                    type: 'customrecord_ld_lotnumber_inventory_cost',
                                    filters: [
                                        { name: 'custrecord_ld_lic_item', operator: 'anyof', values: itemid },
                                        { name: 'custrecord_ld_lic_location', operator: 'anyof', values: location },
                                        { name: 'custrecord_ld_lic_lotnumber', operator: 'anyof', values: lotnumbers },
                                    ],
                                    columns: [
                                        { name: 'custrecord_ld_lic_lotnumber' },
                                        { name: 'custrecord_ld_lic_cost' },
                                    ]
                                }).run().each(function (lic) {
                                    var l_lotnumber = lic.getValue('custrecord_ld_lic_lotnumber');
                                    var l_cost = lic.getValue('custrecord_ld_lic_cost');
                                    lics.push({
                                        l_lotnumber: l_lotnumber,
                                        l_cost: l_cost,
                                    })
                                    return true;
                                });
                                for (var k = 0; k < invennumber.length; k++) {
                                    var flag = true;
                                    for (var i = 0; i < lics.length; i++) {
                                        if (lics[i].l_lotnumber == invennumber[k].inventorynumber_id) {
                                            invennumber[k].cost = lics[i].l_cost;
                                            flag = false;
                                            break
                                        }
                                    }
                                    if (flag) {
                                        invennumber[k].cost = '0'
                                    }
                                }
                                invennumber.sort(function (a, b) { return b.cost - a.cost });
                                log.audit('按成本排序后的数据', invennumber);
                            }
                        }
                        //可能会有多批次
                        for (var i = 0; i < invennumber.length; i++) {
                            if (Number(invennumber[i].actual_quantityavailable) <= 0) {
                                //如果实际可用数量小于等于0，则调过此批次
                                continue
                            }
                            // log.debug("line_count:", line_count);
                            // log.debug('inventorynumber:' + i, invennumber[i].inventorynumber)
                            // log.debug('binnumber:' + i, invennumber[i].binnumber)
                            qty = Number((type == 'so' || type == 'to') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityavailable) - Number(qty)
                            log.debug('差值', qty)
                            if (qty >= 0) {
                                inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                                if (type == 'so') {
                                    log.debug("so 赋值批次号ID 1", invennumber[i].inventorynumber_id)
                                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id });
                                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', value: invennumber[i].binnumber });
                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                } else if (type == 'to') {
                                    log.debug("to 赋值批次号ID 1", invennumber[i].inventorynumber)
                                    // inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id });
                                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', text: invennumber[i].inventorynumber });
                                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', value: invennumber[i].binnumber });
                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                } else {
                                    log.debug("po 赋值批次号 1", invennumber[i].inventorynumber)
                                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', text: invennumber[i].inventorynumber });
                                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', value: invennumber[i].binnumber });
                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                }
                                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: line_count == 0 ? quantity : Number((type == 'so' || type == 'to') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityavailable) - Number(qty) });
                                inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                                to_bin_invennumber.push({
                                    itemid: itemid,
                                    inventorynumber_id: invennumber[i].inventorynumber_id,
                                    binnumber: invennumber[i].binnumber,
                                    inventorynumber: invennumber[i].inventorynumber,
                                    quantity: line_count == 0 ? quantity : Number((type == 'so' || type == 'to') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityavailable) - Number(qty),
                                })
                                log.debug('set quantity:' + i, line_count == 0 ? quantity : Number((type == 'so' || type == 'to') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityavailable) - Number(qty))
                                line_count++
                                break;
                            } else {
                                qty = 0 - Number(qty)
                                inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                                if (type == 'so') {
                                    log.debug("so 赋值批次号ID 2", invennumber[i].inventorynumber_id)
                                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id });
                                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', value: invennumber[i].binnumber });
                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                } else if (type == 'to') {
                                    log.debug("to 赋值批次号ID 2", invennumber[i].inventorynumber)
                                    // inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id });
                                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', text: invennumber[i].inventorynumber });
                                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', value: invennumber[i].binnumber });
                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                } else {
                                    log.debug("po 赋值批次号 2", invennumber[i].inventorynumber)
                                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', text: invennumber[i].inventorynumber });
                                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', value: invennumber[i].binnumber });
                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                }
                                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: (type == 'so' || type == 'to') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityavailable });
                                inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                                to_bin_invennumber.push({
                                    itemid: itemid,
                                    inventorynumber_id: invennumber[i].inventorynumber_id,
                                    binnumber: invennumber[i].binnumber,
                                    inventorynumber: invennumber[i].inventorynumber,
                                    quantity: (type == 'so' || type == 'to') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityavailable,
                                })
                                log.debug('set quantity:' + i, (type == 'so' || type == 'to') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityavailable)
                                line_count++
                            }
                        }
                    }

                }
            } catch (err) {
                log.debug('IsDynamicBinInventoryDetails error', err);
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        function IsDynamicInventoryDetails(f, quantity, location, type, acc_timezone, assetaccount, to_invennumber, global_config) {
            try {
                log.debug('IsDynamicInventoryDetails', {
                    quantity: quantity,
                    location: location,
                    type: type,
                    acc_timezone: acc_timezone,
                    assetaccount: assetaccount,
                    global_config: global_config,
                })
                var itemid = f.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' }), qty = quantity;
                var inventorydetail = f.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
                var invennumber = [], line_count = 0;
                var invennumber_quanty = {};
                var invennumber_quanty_min = {};
                var inven_quantity = 0, founded = true;
                var date = f.getValue('trandate');
                var local_datetime = format.format({
                    value: date,
                    type: format.Type.DATE,
                    timezone: acc_timezone
                });
                // log.debug('f trandate', date)
                // log.debug('f local_datetime', local_datetime)
                // log.debug('f assetaccount', assetaccount)
                if (!assetaccount) {
                    search.create({
                        type: 'item',
                        filters: [
                            { name: 'internalId', operator: 'is', values: itemid },
                        ],
                        columns: [
                            { name: 'assetaccount' }
                        ]
                    }).run().each(function (rec) {
                        assetaccount = rec.getValue('assetaccount');
                    });
                }
                if (!assetaccount) {
                    throw error.create({
                        name: '5012',
                        message: '库存商品资产账户没配置好',
                        notifyOff: false
                    });
                }
                //第一步:先搜索所有当天有结余的批次号，并记录当天结余;
                var serialnumbers = [];
                var t_filters = [
                    [
                        ['taxline', 'is', 'false'], 'and',
                        ['shipping', 'is', 'false'], 'and',
                        ['item', 'anyof', [itemid]], 'and',
                        ['location', 'anyof', [location]], 'and',
                        ['trandate', 'onorbefore', [local_datetime]], 'and',//发货当天之前
                        ['type', 'anyof', ["InvAdjst", "ItemShip", "ItemRcpt", "InvTrnfr", "Build", "Unbuild", "CustInvc", "VendBill"]], 'and',
                        ['account', 'anyof', [assetaccount]], 'and',
                        ['quantity', 'isnotempty', ''], 'and',
                        [
                            ['appliedtotransaction.type', 'noneof', "ItemShip"], 'or',
                            [
                                ['appliedtotransaction.type', 'anyof', "ItemShip"], 'and',
                                ['createdfrom.type', 'anyof', "RtnAuth"]
                            ]
                        ], 'and',
                        ['serialnumber', 'isnotempty', ''], 'and',
                        [
                            ['mainline', 'is', 'false'], 'or',
                            [
                                ['type', 'anyof', ["Build", "Unbuild"]], 'and',
                                ['mainline', 'any', ''],
                            ]
                        ]
                    ], 'or',
                    [
                        ['item', 'anyof', [itemid]], 'and',
                        ['location', 'anyof', [location]], 'and',
                        ['trandate', 'onorbefore', local_datetime], 'and',//发货当天之前
                        ['account', 'anyof', [assetaccount]], 'and',
                        ['quantity', 'isnotempty', ''], 'and',
                        ['serialnumber', 'isnotempty', ''], 'and',
                        ['type', 'anyof', ["BinTrnfr"]]
                    ]
                ];
                log.debug('t_filters', t_filters)
                search.create({
                    type: "transaction",
                    filters: t_filters,
                    columns: [
                        { name: "serialnumber", summary: "GROUP" },
                        { name: "serialnumberquantity", summary: "SUM" }
                    ]
                }).run().each(function (e) {
                    // log.debug('发货当天之前有结余', e)
                    if (Number(e.getValue(e.columns[1])) > 0) {
                        //如果当天结余大于0，记录当天结余，并把批次号记录起来
                        invennumber_quanty[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                        invennumber_quanty_min[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                        serialnumbers.push(e.getValue(e.columns[0]))
                    }
                    return true;
                })
                log.debug('serialnumbers', serialnumbers)
                if (serialnumbers.length == 0) {
                    throw error.create({
                        name: '5015',
                        message: '发货当天之前无可用批次号',
                        notifyOff: false
                    });
                }

                //第二步:先搜索所有当前时间可用量大于0的批次
                search.create({
                    type: "inventorynumber",
                    filters: [
                        { name: 'item', operator: 'anyof', values: [itemid] },
                        { name: 'location', operator: 'anyof', values: [location] },
                        { name: 'quantityavailable', operator: 'notequalto', values: 0 },  //可用数量不为零
                    ],
                    columns: [
                        { name: "inventorynumber" },
                        { name: "quantityintransit" },
                        { name: "quantityavailable" },
                        { name: "internalid", sort: search.Sort.ASC }
                    ]
                }).run().each(function (e) {
                    if (serialnumbers.indexOf(e.getValue('inventorynumber')) != -1) {
                        //当前可用量大于0且当天可用量大于0才记录
                        invennumber.push({
                            inventorynumber_id: e.id,
                            inventorynumber: e.getValue('inventorynumber'),
                            quantityavailable: e.getValue('quantityavailable'),
                            quantityintransit: e.getValue('quantityintransit'),
                            actual_quantityavailable: 0 //实际可用数量默认为0，实际可用数量后面查每天出入库累加取最小值
                        })
                    }
                    return true
                })

                // log.debug('第一次invennumber', invennumber)
                // log.debug('第一次invennumber_quanty', invennumber_quanty)
                // log.debug('第一次invennumber_quanty_min', invennumber_quanty_min)
                if (invennumber.length == 0) {
                    //库存不足,直接返回
                    // return '库存不足'
                    throw error.create({
                        name: '5016',
                        message: '当前时间可用库存不足。发货之前可用批次：' + JSON.stringify(serialnumbers),
                        notifyOff: false
                    });
                } else if (invennumber.length > 0) {
                    var fils1 = [
                        [
                            [
                                ['taxline', 'is', 'false'], 'and',
                                ['shipping', 'is', 'false'], 'and',
                                ['item', 'anyof', [itemid]], 'and',
                                ['location', 'anyof', [location]], 'and',
                                ['trandate', 'after', local_datetime], 'and',//当天之后的每天出入库数量之和
                                ['type', 'anyof', ["InvAdjst", "ItemShip", "ItemRcpt", "InvTrnfr", "Build", "Unbuild", "CustInvc", "VendBill"]], 'and',
                                ['account', 'anyof', [assetaccount]], 'and',
                                ['quantity', 'isnotempty', ''], 'and',
                                [
                                    ['appliedtotransaction.type', 'noneof', "ItemShip"], 'or',
                                    [
                                        ['appliedtotransaction.type', 'anyof', "ItemShip"], 'and',
                                        ['createdfrom.type', 'anyof', "RtnAuth"]
                                    ]
                                ], 'and',
                                ['serialnumber', 'isnotempty', ''], 'and',
                                [
                                    ['mainline', 'is', 'false'], 'or',
                                    [
                                        ['type', 'anyof', ["Build", "Unbuild"]], 'and',
                                        ['mainline', 'any', ''],
                                    ]
                                ]
                            ], 'or',
                            [
                                ['item', 'anyof', [itemid]], 'and',
                                ['location', 'anyof', [location]], 'and',
                                ['trandate', 'after', local_datetime], 'and',//当天之后的每天出入库数量之和
                                ['account', 'anyof', [assetaccount]], 'and',
                                ['quantity', 'isnotempty', ''], 'and',
                                ['serialnumber', 'isnotempty', ''], 'and',
                                ['type', 'anyof', ["BinTrnfr"]]
                            ]
                        ]
                    ];
                    var fils2 = [];

                    fils1.push('and')
                    for (var index = 0; index < invennumber.length; index++) {
                        fils2.push(['serialnumber', 'is', invennumber[index].inventorynumber])
                        if (index < invennumber.length - 1) {
                            fils2.push('or')
                        }
                    }
                    fils1.push(fils2)
                    log.debug('fils1', fils1)
                    // log.debug('开始搜索每天库存')

                    search.create({
                        type: "transaction",
                        filters: fils1,
                        columns: [
                            { name: "trandate", summary: "GROUP", sort: search.Sort.ASC },
                            { name: "serialnumber", summary: "GROUP" },
                            { name: "serialnumberquantity", summary: "SUM" }
                        ]
                    }).run().each(function (e) {
                        // log.debug('当天有结余', e)
                        var key = e.getValue(e.columns[1])
                        invennumber_quanty[key] = Number(invennumber_quanty[key]) + Number(e.getValue(e.columns[2]))//那天的结余
                        if (Number(invennumber_quanty_min[key]) > Number(invennumber_quanty[key])) {
                            //如果那天的结余比出库当天的结余还小，则替换；需取最小结余量
                            invennumber_quanty_min[key] = Number(invennumber_quanty[key])
                        }
                        return true;
                    });

                    // log.debug('invennumber_quanty', invennumber_quanty)
                    // log.debug('invennumber_quanty_min', invennumber_quanty_min)
                    // log.debug('invennumber2', invennumber)
                    //赋值批次库存可用列表中的实际可用量
                    for (var i = 0; i < invennumber.length; i++) {
                        invennumber[i].actual_quantityavailable = invennumber_quanty_min[invennumber[i].inventorynumber];
                        if (invennumber[i].actual_quantityavailable > invennumber[i].quantityavailable) {
                            invennumber[i].actual_quantityavailable = invennumber[i].quantityavailable
                        }
                        if (Number(invennumber_quanty_min[invennumber[i].inventorynumber]) > 0) {
                            //如果批次实际可用量大于0，那么累加到库存可用量中
                            inven_quantity += Number(invennumber_quanty_min[invennumber[i].inventorynumber])
                        }
                    }
                    log.debug('invennumber3', invennumber)

                    if (inven_quantity < quantity) {
                        // 可用库存不足
                        throw error.create({
                            name: '5017',
                            message: '实际最小可用库存不足。库存数量：' + inven_quantity + ',发货数量：' + quantity + '。批次号：' + JSON.stringify(invennumber),
                            notifyOff: false
                        });
                    } else {
                        //如果全局变量配置按高价先出，根据批次号成本排序
                        if (global_config) {
                            if (global_config.hpfo) {
                                var lotnumbers = [];
                                for (var j = 0; j < invennumber.length; j++) {
                                    lotnumbers.push(invennumber[j].inventorynumber_id)
                                }
                                var lics = [];
                                search.create({
                                    type: 'customrecord_ld_lotnumber_inventory_cost',
                                    filters: [
                                        { name: 'custrecord_ld_lic_item', operator: 'anyof', values: itemid },
                                        { name: 'custrecord_ld_lic_location', operator: 'anyof', values: location },
                                        { name: 'custrecord_ld_lic_lotnumber', operator: 'anyof', values: lotnumbers },
                                    ],
                                    columns: [
                                        { name: 'custrecord_ld_lic_lotnumber' },
                                        { name: 'custrecord_ld_lic_cost' },
                                    ]
                                }).run().each(function (lic) {
                                    var l_lotnumber = lic.getValue('custrecord_ld_lic_lotnumber');
                                    var l_cost = lic.getValue('custrecord_ld_lic_cost');
                                    lics.push({
                                        l_lotnumber: l_lotnumber,
                                        l_cost: l_cost,
                                    })
                                    return true;
                                });
                                for (var k = 0; k < invennumber.length; k++) {
                                    var flag = true;
                                    for (var i = 0; i < lics.length; i++) {
                                        if (lics[i].l_lotnumber == invennumber[k].inventorynumber_id) {
                                            invennumber[k].cost = lics[i].l_cost;
                                            flag = false;
                                            break
                                        }
                                    }
                                    if (flag) {
                                        invennumber[k].cost = '0'
                                    }
                                }
                                invennumber.sort(function (a, b) { return b.cost - a.cost });
                                log.audit('按成本排序后的数据', invennumber);
                            }
                        }
                        //可能会有多批次
                        for (var i = 0; i < invennumber.length; i++) {
                            if (Number(invennumber[i].actual_quantityavailable) <= 0) {
                                //如果实际可用数量小于等于0，则调过此批次
                                continue
                            }
                            inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                            qty = Number((type == 'so' || type == 'to') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit) - Number(qty)
                            log.debug('qty', qty)
                            if (qty >= 0) {
                                if (type == 'so') {
                                    log.debug("so 赋值批次号ID 1", invennumber[i].inventorynumber_id)
                                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id });
                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                } else if (type == 'to') {
                                    log.debug("to 赋值批次号ID 1", invennumber[i].inventorynumber_id)
                                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', text: invennumber[i].inventorynumber });
                                    // inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id });
                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                } else {
                                    log.debug("po 赋值批次号 1", invennumber[i].inventorynumber)
                                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', Text: invennumber[i].inventorynumber });
                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                }
                                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: line_count == 0 ? quantity : Number((type == 'so' || type == 'to') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit) - Number(qty) });
                                inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                                to_invennumber.push({
                                    itemid: itemid,
                                    inventorynumber_id: invennumber[i].inventorynumber_id,
                                    inventorynumber: invennumber[i].inventorynumber,
                                    quantity: line_count == 0 ? quantity : Number((type == 'so' || type == 'to') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit) - Number(qty),
                                })
                                log.audit('设置数量 1', line_count == 0 ? quantity : Number((type == 'so' || type == 'to') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit) - Number(qty));
                                line_count++
                                break;
                            } else {
                                qty = 0 - Number(qty)
                                if (type == 'so') {
                                    log.debug("so 赋值批次号ID 2", invennumber[i].inventorynumber_id)
                                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id });
                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                } else if (type == 'to') {
                                    log.debug("to 值批次号ID 2", invennumber[i].inventorynumber_id)
                                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', text: invennumber[i].inventorynumber });
                                    // inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id });
                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                } else {
                                    log.debug("po 赋值批次号 2", invennumber[i].inventorynumber)
                                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', Text: invennumber[i].inventorynumber });
                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                }
                                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: (type == 'so' || type == 'to') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit });
                                inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                                to_invennumber.push({
                                    itemid: itemid,
                                    inventorynumber_id: invennumber[i].inventorynumber_id,
                                    inventorynumber: invennumber[i].inventorynumber,
                                    quantity: (type == 'so' || type == 'to') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit,
                                })
                                log.audit('设置数量 2', (type == 'so' || type == 'to') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit);
                                line_count++
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('IsDynamicInventoryDetails error', err);

                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        function TOBinInventoryDetails(f_item_id, inventorydetail, to_bin_invennumber) {
            log.audit('TOInventoryDetails', {
                f_item_id: f_item_id,
                inventorydetail: inventorydetail,
                to_bin_invennumber: to_bin_invennumber,
            });
            var line_count = 0;
            for (var tbi = 0; tbi < to_bin_invennumber.length; tbi++) {
                if (to_bin_invennumber[tbi].itemid == f_item_id) {
                    inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: to_bin_invennumber[tbi].inventorynumber_id, line: line_count });
                    inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', value: to_bin_invennumber[tbi].binnumber, line: line_count });
                    inventorydetail.setSublistValue({ sublistId: "inventoryassignment", fieldId: "quantity", value: to_bin_invennumber[tbi].quantity, line: line_count });
                    inventorydetail.setSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1, line: line_count });
                    line_count++
                }
            }
        }

        function TOInventoryDetails(f_item_id, inventorydetail, to_invennumber) {
            log.audit('TOInventoryDetails', {
                f_item_id: f_item_id,
                inventorydetail: inventorydetail,
                to_invennumber: to_invennumber,
            });
            var line_count = 0;
            for (var ti = 0; ti < to_invennumber.length; ti++) {
                if (to_invennumber[ti].itemid == f_item_id) {
                    inventorydetail.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: to_invennumber[ti].inventorynumber_id, line: line_count });
                    inventorydetail.setSublistValue({ sublistId: "inventoryassignment", fieldId: "quantity", value: to_invennumber[ti].quantity, line: line_count });
                    inventorydetail.setSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1, line: line_count });
                    line_count++
                }
            }
        }

        function SearchInventory(f, itemid, f_qty, location, acc_timezone, assetaccount) {
            log.audit('SearchInventory', {
                itemid: itemid,
                f_qty: f_qty,
                location: location,
                acc_timezone: acc_timezone,
                assetaccount: assetaccount,
            });
            try {
                var invennumber = [];
                var item_quanty = {};
                var item_quanty_min = {};
                var inven_quantity = 0;
                var date = f.getValue('trandate');
                var local_datetime = format.format({
                    value: date,
                    type: format.Type.DATE,
                    timezone: acc_timezone
                });
                log.debug('f trandate', date)
                log.debug('f local_datetime', local_datetime)
                if (!assetaccount) {
                    search.create({
                        type: 'item',
                        filters: [
                            { name: 'internalId', operator: 'is', values: itemid },
                        ],
                        columns: [
                            { name: 'assetaccount' }
                        ]
                    }).run().each(function (rec) {
                        assetaccount = rec.getValue('assetaccount');
                    });
                }
                if (!assetaccount) {
                    throw error.create({
                        name: '5012',
                        message: '库存商品资产账户没配置好',
                        notifyOff: false
                    });
                }
                //第一步:先搜索所有发货当天有结余的库存，并记录当天结余;
                var items = [];
                var t_filters = [
                    [
                        ['taxline', 'is', 'false'], 'and',
                        ['shipping', 'is', 'false'], 'and',
                        ['item', 'anyof', [itemid]], 'and',
                        ['location', 'anyof', [location]], 'and',
                        ['trandate', 'onorbefore', [local_datetime]], 'and',//发货当天之前
                        ['type', 'anyof', ["InvAdjst", "ItemShip", "ItemRcpt", "InvTrnfr", "Build", "Unbuild", "CustInvc", "VendBill"]], 'and',
                        ['account', 'anyof', [assetaccount]], 'and',
                        ['quantity', 'isnotempty', ''], 'and',
                        [
                            ['appliedtotransaction.type', 'noneof', "ItemShip"], 'or',
                            [
                                ['appliedtotransaction.type', 'anyof', "ItemShip"], 'and',
                                ['createdfrom.type', 'anyof', "RtnAuth"]
                            ]
                        ], 'and',
                        [
                            ['mainline', 'is', 'false'], 'or',
                            [
                                ['type', 'anyof', ["Build", "Unbuild"]], 'and',
                                ['mainline', 'any', ''],
                            ]
                        ]
                    ], 'or',
                    [
                        ['item', 'anyof', [itemid]], 'and',
                        ['location', 'anyof', [location]], 'and',
                        ['trandate', 'onorbefore', local_datetime], 'and',//发货当天之前
                        ['account', 'anyof', [assetaccount]], 'and',
                        ['quantity', 'isnotempty', ''], 'and',
                        ['type', 'anyof', ["BinTrnfr"]]
                    ]
                ];
                log.debug('t_filters', t_filters)
                search.create({
                    type: "transaction",
                    filters: t_filters,
                    columns: [
                        { name: "item", summary: "GROUP" },
                        { name: "quantity", summary: "SUM" }
                    ]
                }).run().each(function (e) {
                    log.debug('当天有结余', e)
                    if (Number(e.getValue(e.columns[1])) > 0) {
                        //如果当天结余大于0，记录当天结余
                        item_quanty[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                        item_quanty_min[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                        items.push(e.getValue(e.columns[0]))
                        inven_quantity = e.getValue(e.columns[1])
                    }
                    return true;
                })
                log.debug('items', items)
                log.debug('item_quanty', item_quanty)
                log.debug('item_quanty_min', item_quanty_min)
                log.debug('inven_quantity', inven_quantity)
                if (items.length == 0) {
                    throw error.create({
                        name: '5013',
                        message: '发货当天之前库存数量为0;发货数量：' + f_qty,
                        notifyOff: false
                    });
                }
                log.debug('inven_quantity:' + inven_quantity, 'f_qty:' + f_qty)
                if (Number(inven_quantity) < Number(f_qty)) {
                    // 可用库存不足
                    throw error.create({
                        name: '5014',
                        message: '发货当天可用库存不足，可用库存量:' + inven_quantity + '发货数量:' + f_qty,
                        notifyOff: false
                    });
                }
            } catch (err) {
                log.audit('SearchInventory error', err);
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        function DeleteInfo(so_id) {
            search.create({
                type: 'invoice',
                filters: [
                    { name: "createdfrom", operator: "is", values: so_id },
                    { name: "mainline", operator: "is", values: true }
                ],
                columns: [
                    { name: "internalid" }
                ]
            }).run().each(function (rec) {
                search.create({
                    type: 'customerpayment',
                    filters: [
                        { name: 'appliedtotransaction', operator: 'is', values: rec.id },
                        { name: "mainline", operator: "is", values: false }
                    ],
                    columns: [
                        { name: "internalid" }
                    ]
                }).run().each(function (crec) {
                    record.delete({
                        type: 'customerpayment',
                        id: crec.id
                    });
                    return true;
                });
                record.delete({
                    type: 'invoice',
                    id: rec.id
                });
                return true;
            });
            search.create({
                type: 'itemfulfillment',
                filters: [
                    ["createdfrom", "anyof", so_id], 'and',
                    ["mainline", "is", true],
                ],
                columns: [
                    { name: "custbody_swc_gl_mamo_inventoryledger" }
                ]
            }).run().each(function (rec) {
                if (rec.getValue('custbody_swc_gl_mamo_inventoryledger')) {
                    record.submitFields({
                        type: shipment_record_type,
                        id: rec.getValue('custbody_swc_gl_mamo_inventoryledger'),
                        values: {
                            custrecord_swc_mano_resolved: false
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true,
                        }
                    });
                }
                record.delete({
                    type: 'itemfulfillment',
                    id: rec.id
                });
                return true;
            });
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });
