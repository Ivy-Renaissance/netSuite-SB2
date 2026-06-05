/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_JJ_DATE_RANGE_REPORTS_SHIPMENT.js
 *@description 亚马逊日期范围报告发货处理（虚拟发出商品仓库 发货）
 */
define(['../common/interface', '../common/moment', 'N/runtime', 'N/record', 'N/search', 'N/format', 'N/error'],
    function (interface, moment, runtime, record, search, format, error) {

        var shipment_record_type = 'customrecord_swc_jj_date_range_reports'
        function getInputData() {
            var startTime = new Date().getTime();
            log.emergency('getInputData 开始', startTime);
            var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_drrfs_store' });
            var orderid = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_drrfs_orderid' });
            var shipdate_start = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_drrfs_start_date' });
            var shipdate_end = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_drrfs_end_date' });
            var req_limit = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_drrfs_limit' });
            var memo = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_drrfs_memo' });

            if (shipdate_start) {
                shipdate_start = format.format({ value: shipdate_start, type: 'date' })
            }
            if (shipdate_end) {
                shipdate_end = format.format({ value: shipdate_end, type: 'date' })
            }
            var orders = [];
            var limit = 200;
            var filters = [
                { name: 'custrecord_swc_jj_drr_resolved', operator: 'is', values: false },
                { name: 'custrecord_swc_jj_drr_type', operator: 'is', values: ['Order'] },
            ]
            if (orderid) {
                filters.push({ name: 'custrecord_swc_jj_drr_orderid', operator: 'is', values: orderid })
            };
            if (acc) {
                filters.push({ name: 'custrecord_swc_jj_drr_store', operator: 'anyof', values: acc })
            };
            if (shipdate_end && shipdate_start) {
                filters.push({ name: 'custrecord_swc_jj_drr_market_date', operator: 'within', values: [shipdate_start, shipdate_end] })
            }
            if (shipdate_end && !shipdate_start) {
                filters.push({ name: 'custrecord_swc_jj_drr_market_date', operator: 'onorbefore', values: shipdate_end })
            }
            if (!shipdate_end && shipdate_start) {
                filters.push({ name: 'custrecord_swc_jj_drr_market_date', operator: 'onorafter', values: shipdate_start })
            }
            if (req_limit) {
                limit = req_limit;
            }
            if (memo) {
                filters.push({ name: 'custrecord_swc_jj_drr_error', operator: 'contains', values: memo })
            }
            log.audit('filters', filters)
            search.create({
                type: shipment_record_type,
                filters: filters,
                columns: [
                    { name: 'custrecord_swc_jj_drr_market_date', sort: search.Sort.ASC },
                    { name: 'custrecord_swc_jj_drr_retry', sort: search.Sort.ASC },
                    { name: 'custrecord_swc_jj_drr_quantity' },
                    { name: 'custrecord_swc_jj_drr_sku' },
                    { name: 'custrecord_swc_jj_drr_originsku' },
                    { name: 'custrecord_swc_jj_drr_product' },
                    { name: 'custrecord_swc_jj_drr_orderid' },
                    { name: 'custrecord_swc_jj_drr_store' },
                    { name: 'custrecord_swc_jj_drr_productsales' },
                    { name: 'custrecord_swc_jj_drr_productsalestax' },
                    { name: 'custrecord_swc_jj_drr_saleordertype' },
                    { name: 'custrecord_swc_jj_drr_settlementid' },
                    { name: 'custrecord_swc_jj_drr_shippingcredits' },
                    { name: 'custrecord_swc_jj_drr_giftwrapcredits' },
                    { name: 'custentity_swc_shipment_item_location', join: 'custrecord_swc_jj_drr_store' },
                ]
            }).run().each(function (rec) {
                orders.push({
                    fsd_id: rec.id,
                    fsd_retry: rec.getValue({ name: 'custrecord_swc_jj_drr_retry', sort: search.Sort.ASC }),
                    fsd_acc_id: rec.getValue('custrecord_swc_jj_drr_store'),
                    fsd_shipment_date: rec.getValue({ name: 'custrecord_swc_jj_drr_market_date', sort: search.Sort.ASC }),
                    fsd_sku: rec.getValue('custrecord_swc_jj_drr_product'),
                    fsd_quantity: rec.getValue('custrecord_swc_jj_drr_quantity'),
                    fsd_msku: interface.replaceToChinessChar(rec.getValue('custrecord_swc_jj_drr_sku')),
                    fsd_originsku: interface.replaceToChinessChar(rec.getValue('custrecord_swc_jj_drr_originsku')),
                    fsd_order_id: rec.getValue('custrecord_swc_jj_drr_orderid'),
                    fsd_item_price: rec.getValue('custrecord_swc_jj_drr_productsales') || 0,
                    fsd_item_tax: rec.getValue('custrecord_swc_jj_drr_productsalestax'),
                    fsd_order_type: rec.getValue('custrecord_swc_jj_drr_saleordertype'),
                    fsd_settlement_id: rec.getValue('custrecord_swc_jj_drr_settlementid'),
                    fsd_shippingcredits: rec.getValue('custrecord_swc_jj_drr_shippingcredits') || 0,
                    fsd_giftwrapcredits: rec.getValue('custrecord_swc_jj_drr_giftwrapcredits') || 0,
                    fsd_sp_warehouse_id: rec.getValue({ name: 'custentity_swc_shipment_item_location', join: 'custrecord_swc_jj_drr_store' }),
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
            var fsd_acc_id = obj.fsd_acc_id;
            var fsd_shipment_date = obj.fsd_shipment_date;
            var fsd_quantity = obj.fsd_quantity;
            var fsd_sku = obj.fsd_sku;
            var fsd_msku = obj.fsd_originsku;
            var fsd_order_id = obj.fsd_order_id;
            var fsd_order_type = obj.fsd_order_type;
            var fsd_sp_warehouse_id = obj.fsd_sp_warehouse_id;
            var fsd_item_price = obj.fsd_item_price;
            var fsd_shippingcredits = obj.fsd_shippingcredits;
            var fsd_giftwrapcredits = obj.fsd_giftwrapcredits;
            var fsd_item_tax = obj.fsd_item_tax;
            var fsd_settlement_id = obj.fsd_settlement_id;
            var so_obj = {}, sku_obj = {}, so_id, so_ship_location = '';
            var TO_ids = [], IF_ids = [], IR_ids = [];
            var to_bin_invennumber = [], to_invennumber = [];
            var items_info = [];
            var so_invoice_id, so_itemfulfillment_id;
            var oii_flag = false;
            let cache_amount = interface.accDiv(interface.accAdd(interface.accAdd(fsd_item_price, fsd_shippingcredits), fsd_giftwrapcredits), fsd_quantity);
            let cache_rate = interface.accDiv(cache_amount, fsd_quantity);
            try {
                var acc_info = interface.GetAccountInfo(fsd_acc_id);
                log.audit('acc_info', acc_info);
                if (!fsd_sp_warehouse_id) {
                    throw '请维护店铺发出商品仓库';
                }
                var location_info = interface.GetLocationInfo('', fsd_sp_warehouse_id);
                log.audit('location_info', location_info);
                so_ship_location = location_info.id;
                log.audit('fsd_order_type', fsd_order_type);

                if (!fsd_sku) {
                    throw '无SKU，暂时不处理';
                }

                if (fsd_order_type == 'StandardOrder') {
                    so_obj = interface.SearchSalesOrder(fsd_acc_id, fsd_order_id, true);
                    log.audit('so_obj', so_obj);
                    so_id = so_obj.so_id
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
                                    // custrecord_swc_jj_fs_location: location_info.id,
                                    custrecord_swc_jj_drr_error: '没发货已开票',
                                    custrecord_swc_jj_drr_resolved: true,
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
                                { name: 'custbody_swc_jj_date_range_reports', operator: 'anyof', values: fsd_id },
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
                                { name: 'custbody_swc_jj_date_range_reports', operator: 'anyof', values: fsd_id },
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
                                    // custrecord_swc_jj_fs_location: so_ship_location,
                                    custrecord_swc_jj_drr_error: '已存在此报告的发票',
                                    custrecord_swc_jj_drr_resolved: true,
                                    custrecord_swc_jj_drr_relation_if: fulfill_id[0],
                                    custrecord_swc_jj_drr_relation_iv: inv_id[0],
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
                                // 如果是已开票，但是没发货，考虑到要保持一个发货一份发票，所以要把这个发票删除，重新发货开票
                                var de = record.delete({ type: 'invoice', id: dls })
                                log.debug('已删除发票，重新发货发票', de)
                            })
                        } else if (inv_id.length > 0 && fulfill_id.length > 0) {
                            // 发货有问题，停止发货，需要人工检查问题
                            record.submitFields({
                                type: shipment_record_type,
                                id: fsd_id,
                                values: {
                                    // custrecord_swc_jj_fs_location: so_ship_location,
                                    custrecord_swc_jj_drr_error: '发货有问题，停止发货，需要人工检查问题',
                                },
                                options: {
                                    ignoreMandatoryFields: true
                                }
                            })
                            return
                        }

                        var so_items = interface.SearchItemInfo(so_id);
                        var flag = false, quantityshiprecv = false, delete_if = false;
                        log.audit('so_items', so_items);
                        for (var index = 0; index < so_items.length; index++) {
                            if (so_items[index].so_item_seller_sku == fsd_msku) {
                                if (so_items[index].so_item_quantityshiprecv > 0) {
                                    quantityshiprecv = true;
                                    if (!so_items[index].so_item_location) {
                                        delete_if = true;
                                    }
                                }
                                items_info.push({
                                    so_item_id: so_items[index].so_item_id,
                                    so_item_type: so_items[index].so_item_type,
                                    so_item_quantity: fsd_quantity,
                                    so_item_seller_sku: so_items[index].so_item_seller_sku,
                                    so_item_line_no: so_items[index].so_item_line_no,
                                })
                                flag = true
                                break
                            }
                        }
                        if (!flag) {
                            var reason = 'FBA单匹配不到so货品明细行。so明细信息：' + JSON.stringify(so_items) + ',发货报告信息：seller sku=' + fsd_msku
                            log.error('reason', reason);
                            record.submitFields({
                                type: shipment_record_type,
                                id: fsd_id,
                                values: {
                                    // custrecord_swc_jj_fs_location: so_ship_location,
                                    custrecord_swc_jj_drr_error: reason,
                                    custrecord_swc_jj_drr_retry: Number(fsd_retry) + 1
                                },
                                options: {
                                    ignoreMandatoryFields: true
                                }
                            })
                            return
                        }
                        if (delete_if) {
                            DeleteInfo(so_id)
                            record.submitFields({
                                type: shipment_record_type,
                                id: fsd_id,
                                values: {
                                    custrecord_swc_jj_drr_error: '重新执行',
                                    custrecord_swc_jj_drr_retry: Number(fsd_retry) + 1
                                },
                                options: {
                                    ignoreMandatoryFields: true
                                }
                            })
                            return
                        }

                        if (so_obj.subsidiary == location_info.subsidiary) {
                            SOAddlocation(so_id, so_ship_location, items_info)
                            so_itemfulfillment_id = SoToItemFulfillment(fsd_id, so_obj, fsd_order_id, fsd_shipment_date, fsd_msku, fsd_quantity, acc_info, so_ship_location, fsd_settlement_id);
                            log.audit('so_itemfulfillment_id', so_itemfulfillment_id);
                            if (so_itemfulfillment_id) {
                                so_invoice_id = SoToInvoice(fsd_id, so_obj, fsd_shipment_date, so_itemfulfillment_id, fsd_msku, fsd_quantity, cache_rate, fsd_settlement_id);
                                log.debug('so_invoice_id', so_invoice_id)
                                if (so_invoice_id) {
                                    record.submitFields({
                                        type: shipment_record_type,
                                        id: fsd_id,
                                        values: {
                                            // custrecord_swc_jj_fs_location: so_ship_location,
                                            custrecord_swc_jj_drr_resolved: true,
                                            custrecord_swc_jj_drr_error: '',
                                            custrecord_swc_jj_drr_relation_if: so_itemfulfillment_id,
                                            custrecord_swc_jj_drr_relation_iv: so_invoice_id,
                                            custrecord_swc_jj_drr_relation_so: so_obj.so_id,
                                        },
                                        options: {
                                            ignoreMandatoryFields: true
                                        }
                                    })
                                }
                            }
                        } else {
                            //公司间交易,暂不处理
                            throw '公司间交易,暂无处理逻辑';
                        }

                    } else {
                        throw '找不到销售订单，请确认是否存在';
                    }
                } else if (fsd_order_type == 'Multichannel') {
                    throw '多渠道订单,暂无处理逻辑';
                } else if (fsd_order_type == 'Patch') {
                    throw '补单,暂无处理逻辑';
                } else if (fsd_order_type == 'Replace') {
                    throw '换货订单,暂无处理逻辑';
                } else {
                    throw '未知订单类型,暂不处理';
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
                        // custrecord_swc_jj_fs_location: location_info.id,
                        custrecord_swc_jj_drr_error: e,
                        custrecord_swc_jj_drr_retry: Number(fsd_retry) + 1
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

        function SearchItemInfo(so_id) {
            var so_items = [];
            search.create({
                type: 'salesorder',
                filters: [
                    { name: 'internalId', operator: 'is', values: so_id },
                    { name: 'mainline', operator: 'is', values: false },
                    { name: 'taxline', operator: 'is', values: false },
                    { name: 'shipping', operator: 'is', values: false },
                ],
                columns: [
                    { name: 'item' },
                    { name: 'location' },
                    { name: 'quantity' },
                    { name: 'quantityshiprecv' },
                    { name: 'quantitycommitted' },
                    { name: 'type', join: 'item' },
                    { name: 'custcol_swc_msku' },
                    { name: 'custcol_swc_line_no' },
                ]
            }).run().each(function (rec) {
                so_items.push({
                    so_item_id: rec.getValue('item'),
                    so_item_location: rec.getValue('location'),
                    so_item_quantity: rec.getValue('quantity'),
                    so_item_quantityshiprecv: rec.getValue('quantityshiprecv'),
                    so_item_quantitycommitted: rec.getValue('quantitycommitted'),
                    so_item_type: rec.getValue({ name: 'type', join: 'item' }),
                    so_item_seller_sku: rec.getValue('custcol_swc_msku').trim(),
                    so_item_line_no: rec.getValue('custcol_swc_line_no'),
                })
                return true;
            });
            return so_items
        }

        function SoToItemFulfillment(fsd_id, so_obj, fsd_order_id, fsd_shipment_date, fsd_msku, fsd_quantity, acc_info, so_ship_location, fsd_settlement_id) {
            log.debug('SoToItemFulfillment', {
                fsd_id: fsd_id,
                fsd_order_id: fsd_order_id,
                fsd_shipment_date: fsd_shipment_date,
                fsd_msku: fsd_msku,
                fsd_quantity: fsd_quantity,
                so_ship_location: so_ship_location,
                fsd_settlement_id: fsd_settlement_id,
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
                f.setValue({ fieldId: 'custbody_swc_jj_date_range_reports', value: fsd_id }); // 关联发货报告-日期范围报告
                f.setValue({ fieldId: 'custbody_swc_settlement_id', value: fsd_settlement_id });

                var kit_quantityremaining, inv_quantityremaining, ab_quantityremaining, kit_line_no, kit_itemreceive = false, kit_assembly = false, inv_itemreceive = true, inv_assembly = true;
                var lineCount = f.getLineCount({ sublistId: 'item' });
                for (var i = 0; i < lineCount; i++) {
                    f.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location, line: i });
                    var f_item_id = f.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    var f_item_type = f.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });
                    var f_seller_sku = f.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_msku', line: i }).trim();
                    var f_line_no = f.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: i });
                    var f_description = f.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i });
                    var f_onhand = f.getSublistValue({ sublistId: 'item', fieldId: 'onhand', line: i }) // 可用数量
                    var f_quantityremaining = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i })  //剩余数量
                    var f_location = f.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i })  //仓库
                    log.debug('f_item_type:' + i, f_item_type);
                    log.debug('f_location:' + i, f_location);
                    log.debug('f_onhand:' + i, f_onhand);
                    if (f_item_type == 'Kit') {
                        kit_quantityremaining = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i });
                        if (f_seller_sku == fsd_msku) {
                            log.debug('Kit', {
                                f_item_id: f_item_id,
                                f_seller_sku: f_seller_sku,
                                fsd_msku: fsd_msku,
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
                            fsd_msku: fsd_msku,
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
                            fsd_msku: fsd_msku,
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
                        if (f_seller_sku == fsd_msku) {
                            log.debug('InvtPart inv_itemreceive 2', {
                                f_item_id: f_item_id,
                                f_seller_sku: f_seller_sku,
                                fsd_msku: fsd_msku,
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
                        if (f_seller_sku == fsd_msku) {
                            log.debug('Assembly inv_assembly', {
                                f_item_id: f_item_id,
                                f_seller_sku: f_seller_sku,
                                fsd_msku: fsd_msku,
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

        function SoToInvoice(fsd_id, so_obj, fsd_shipment_date, f_id, fsd_msku, fsd_quantity, cache_rate, fsd_settlement_id) {
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
                inv.setValue({ fieldId: 'custbody_swc_jj_date_range_reports', value: fsd_id });
                inv.setValue({ fieldId: 'custbody_swc_settlement_id', value: fsd_settlement_id });
                // 强制限制发票的行等于发货的行
                var len = inv.getLineCount({ sublistId: 'item' }), ck = true, seted = 0, cs = true
                for (var i = seted; i < len; i++) {
                    inv.selectLine({ sublistId: 'item', line: i })
                    var itds = inv.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' })
                    var qty = inv.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' })
                    var msku = inv.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_msku' }).trim();		//sellersku
                    if ((msku == fsd_msku) && fsd_quantity <= qty && ck) {
                        seted = i + 1
                        ck = false
                        inv.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: fsd_quantity });
                        inv.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: cache_rate });
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

        function SSoToItemFulfillment(icto, fsd_id, so_obj, so_id, fsd_order_id, fsd_shipment_date, fsd_shipment_date_text, sku_obj, fsd_msku, fsd_quantity, fsd_merchant_order_item_id, so_account, acc_info, global_config, so_ship_location, to_bin_invennumber, to_invennumber, oii_flag) {
            log.debug('SSoToItemFulfillment', {
                fsd_id: fsd_id,
                so_id: so_id,
                fsd_order_id: fsd_order_id,
                fsd_shipment_date: fsd_shipment_date,
                fsd_shipment_date_text: fsd_shipment_date_text,
                fsd_msku: fsd_msku,
                fsd_quantity: fsd_quantity,
                fsd_merchant_order_item_id: fsd_merchant_order_item_id,
                so_account: so_account,
                to_bin_invennumber: to_bin_invennumber,
                to_invennumber: to_invennumber,
                so_ship_location: so_ship_location,
                oii_flag: oii_flag,
            });
            var location = so_ship_location;
            try {
                fsd_shipment_date = format.parse({ value: fsd_shipment_date, type: 'date' });

                var acc_timezone = acc_info.timezone;
                if (so_obj.shipment_account_subsidiary == so_obj.so_account_subsidiary) {
                    line_account = so_obj.so_account;
                } else {
                    line_account = so_obj.shipment_account;
                }
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
                f.setValue({ fieldId: 'shipstatus', value: 'C' });
                f.setValue({ fieldId: 'trandate', value: fsd_shipment_date });
                f.setValue({ fieldId: 'custbody_dps_account', value: so_account });    //订单店铺 
                f.setValue({ fieldId: 'custbody_swc_jj_date_range_reports', value: fsd_id }); // 关联发货报告-日期范围报告
                var fsd_shipment_date_time = format.format({ value: moment.utc(fsd_shipment_date_text).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.location_timezone });
                f.setText({ fieldId: 'custbody_dps_local_time', text: fsd_shipment_date_time });
                //判断是否需要填写库位信息
                var bin, assetaccount, location_bin;
                if (global_config) {
                    bin = global_config.bin_management;
                    assetaccount = global_config.assetaccount
                } else {
                    bin = false;
                }
                if (bin) {
                    location_bin = interface.GetLocationBinManagement(location);
                } else {
                    location_bin = false
                }
                var kit_quantityremaining, inv_quantityremaining, ab_quantityremaining, kit_line_no, kit_itemreceive = false, kit_assembly = false, inv_itemreceive = true, inv_assembly = true;
                var lineCount = f.getLineCount({ sublistId: 'item' });
                for (var i = 0; i < lineCount; i++) {
                    var f_item_id = f.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    var f_item_type = f.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });
                    var f_seller_sku = f.getSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_fba_sellersku', line: i }); //S单匹配seller sku
                    var f_order_item_id = f.getSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_order_item_id', line: i });
                    var f_line_no = f.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: i });
                    var f_description = f.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i });
                    var f_onhand = f.getSublistValue({ sublistId: 'item', fieldId: 'onhand', line: i }) // 可用数量
                    var f_quantityremaining = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i })  //剩余数量
                    f.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location, line: i });
                    log.debug('f_item_type', f_item_type);
                    log.debug('f_seller_sku', f_seller_sku);
                    log.debug('f_order_item_id', f_order_item_id);
                    log.debug('fsd_msku', fsd_msku);
                    log.debug('fsd_merchant_order_item_id', fsd_merchant_order_item_id);
                    log.debug('location', f.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i }));
                    var item_bin;
                    if (bin) {
                        item_bin = interface.GetItemBinManagement(f_item_id);
                    } else {
                        item_bin = false
                    }
                    if (bin && location_bin && item_bin) {
                        if (f_item_type == 'Kit') {
                            kit_quantityremaining = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i });
                            if (f_seller_sku == fsd_msku && oii_flag ? true : f_order_item_id == fsd_merchant_order_item_id) { //行上sellersku和order item id跟发货报告上相同 
                                kit_line_no = f.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: fsd_quantity, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_account', value: line_account, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_fn_sku', value: sku_obj.sku_fnsku, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_salesperson', value: sku_obj.sku_salesperson, line: i });
                                kit_itemreceive = true;
                                kit_assembly = true;
                                inv_itemreceive = false;
                                inv_assembly = false;
                                f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true, line: i });
                            } else {
                                f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: i });
                            }
                        } else if (f_item_type == "InvtPart" && kit_itemreceive && kit_line_no == f_line_no) {
                            //根据KIT是否接收，数量等于KIT的组件数量*发货报告数量
                            inv_quantityremaining = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i });
                            var inv_fulfill_qty = inv_quantityremaining / kit_quantityremaining * fsd_quantity
                            f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: inv_fulfill_qty, line: i });
                            f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_account', value: line_account, line: i });
                            f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_fn_sku', value: sku_obj.sku_fnsku, line: i });
                            f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_salesperson', value: sku_obj.sku_salesperson, line: i });
                            var itemResult = search.lookupFields({ type: 'item', id: f_item_id, columns: ['islotitem', 'isserialitem', 'assetaccount'] });
                            log.audit('itemResult', itemResult);
                            var islotitem = itemResult['islotitem'];
                            var isserialitem = itemResult['isserialitem'];
                            if (!assetaccount) {
                                assetaccount = itemResult['assetaccount'][0].value;
                            }
                            if (islotitem || isserialitem) {
                                if (to_bin_invennumber.length > 0) {
                                    TOBinInventoryDetails(f_item_id, inventorydetail, to_bin_invennumber)
                                } else {
                                    BinInventoryDetails(f, i, inv_fulfill_qty, location, 'so', acc_timezone, assetaccount, global_config)
                                }
                            }
                            else {
                                SearchInventory(f, f_item_id, inv_fulfill_qty, location, acc_timezone, assetaccount);
                            }
                        } else if (f_item_type == "Assembly" && kit_assembly && kit_line_no == f_line_no) {
                            ab_quantityremaining = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i });
                            var ab_fulfill_qty = ab_quantityremaining / kit_quantityremaining * fsd_quantity
                            f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: ab_fulfill_qty, line: i });
                            f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_account', value: line_account, line: i });
                            f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_fn_sku', value: sku_obj.sku_fnsku, line: i });
                            f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_salesperson', value: sku_obj.sku_salesperson, line: i });
                            var itemResult = search.lookupFields({ type: 'item', id: f_item_id, columns: ['islotitem', 'isserialitem', 'assetaccount'] });
                            log.audit('itemResult', itemResult);
                            var islotitem = itemResult['islotitem'];
                            var isserialitem = itemResult['isserialitem'];
                            if (!assetaccount) {
                                assetaccount = itemResult['assetaccount'][0].value;
                            }
                            if (islotitem || isserialitem) {
                                if (to_bin_invennumber.length > 0) {
                                    TOBinInventoryDetails(f_item_id, inventorydetail, to_bin_invennumber)
                                } else {
                                    BinInventoryDetails(f, i, ab_fulfill_qty, location, 'so', acc_timezone, assetaccount, global_config)
                                }
                            }
                            else {
                                SearchInventory(f, f_item_id, ab_fulfill_qty, location, acc_timezone, assetaccount);
                            }
                        } else if (f_item_type == "InvtPart" && ((inv_itemreceive && !kit_itemreceive) || (!inv_itemreceive && kit_itemreceive))) {
                            if (f_seller_sku == fsd_msku && oii_flag ? true : f_order_item_id == fsd_merchant_order_item_id) { //行上sellersku和order item id跟发货报告上相同 
                                f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: fsd_quantity, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_account', value: line_account, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_fn_sku', value: sku_obj.sku_fnsku, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_salesperson', value: sku_obj.sku_salesperson, line: i });
                                var itemResult = search.lookupFields({ type: 'item', id: f_item_id, columns: ['islotitem', 'isserialitem', 'assetaccount'] });
                                log.audit('itemResult', itemResult);
                                var islotitem = itemResult['islotitem'];
                                var isserialitem = itemResult['isserialitem'];
                                if (!assetaccount) {
                                    assetaccount = itemResult['assetaccount'][0].value;
                                }
                                if (islotitem || isserialitem) {
                                    if (to_bin_invennumber.length > 0) {
                                        TOBinInventoryDetails(f_item_id, inventorydetail, to_bin_invennumber)
                                    } else {
                                        BinInventoryDetails(f, i, fsd_quantity, location, 'so', acc_timezone, assetaccount, global_config)
                                    }
                                }
                                else {
                                    SearchInventory(f, f_item_id, fsd_quantity, location, acc_timezone, assetaccount);
                                }
                                f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true, line: i });
                            } else {
                                f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: i });
                            }
                        } else if (f_item_type == "Assembly" && ((inv_assembly && !kit_assembly) || (!inv_assembly && kit_assembly))) {
                            if (f_seller_sku == fsd_msku && oii_flag ? true : f_order_item_id == fsd_merchant_order_item_id) { //行上sellersku和order item id跟发货报告上相同 
                                f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: fsd_quantity, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_account', value: line_account, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_fn_sku', value: sku_obj.sku_fnsku, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_salesperson', value: sku_obj.sku_salesperson, line: i });
                                var itemResult = search.lookupFields({ type: 'item', id: f_item_id, columns: ['islotitem', 'isserialitem', 'assetaccount'] });
                                log.audit('itemResult', itemResult);
                                var islotitem = itemResult['islotitem'];
                                var isserialitem = itemResult['isserialitem'];
                                if (!assetaccount) {
                                    assetaccount = itemResult['assetaccount'][0].value;
                                }
                                if (islotitem || isserialitem) {
                                    if (to_bin_invennumber.length > 0) {
                                        TOBinInventoryDetails(f_item_id, inventorydetail, to_bin_invennumber)
                                    } else {
                                        BinInventoryDetails(f, i, fsd_quantity, location, 'so', acc_timezone, assetaccount, global_config)
                                    }
                                }
                                else {
                                    SearchInventory(f, f_item_id, fsd_quantity, location, acc_timezone, assetaccount);
                                }
                                f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true, line: i });
                            } else {
                                f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: i });
                            }
                        }
                    } else {
                        if (f_item_type == 'Kit') {
                            kit_quantityremaining = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i });
                            if (f_seller_sku == fsd_msku && oii_flag ? true : f_order_item_id == fsd_merchant_order_item_id) { //行上sellersku和order item id跟发货报告上相同 
                                kit_line_no = f.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: fsd_quantity, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_account', value: line_account, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_fn_sku', value: sku_obj.sku_fnsku, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_salesperson', value: sku_obj.sku_salesperson, line: i });
                                kit_itemreceive = true;
                                kit_assembly = true;
                                inv_itemreceive = false;
                                inv_assembly = false;
                                f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true, line: i });
                            } else {
                                f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: i });
                            }
                        } else if (f_item_type == "InvtPart" && kit_itemreceive && kit_line_no == f_line_no) {
                            //根据KIT是否接收，数量等于KIT的组件数量*发货报告数量
                            inv_quantityremaining = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i });
                            var inv_fulfill_qty = inv_quantityremaining / kit_quantityremaining * fsd_quantity
                            f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: inv_fulfill_qty, line: i });
                            f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_account', value: line_account, line: i });
                            f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_fn_sku', value: sku_obj.sku_fnsku, line: i });
                            f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_salesperson', value: sku_obj.sku_salesperson, line: i });
                            var itemResult = search.lookupFields({ type: 'item', id: f_item_id, columns: ['islotitem', 'isserialitem', 'assetaccount'] });
                            log.audit('itemResult', itemResult);
                            var islotitem = itemResult['islotitem'];
                            var isserialitem = itemResult['isserialitem'];
                            if (!assetaccount) {
                                assetaccount = itemResult['assetaccount'][0].value;
                            }
                            if (islotitem || isserialitem) {
                                if (to_invennumber.length > 0) {
                                    TOInventoryDetails(f_item_id, inventorydetail, to_invennumber)
                                } else {
                                    InventoryDetails(f, i, inv_fulfill_qty, location, 'so', acc_timezone, assetaccount, global_config)
                                }
                            }
                            else {
                                if (runtime.accountId.indexOf('5953530') != -1) {
                                    if (f_onhand < inv_fulfill_qty) {
                                        throw error.create({
                                            name: '5018',
                                            message: '当前库存数量为:' + f_onhand + ';发货数量：' + inv_fulfill_qty,
                                            notifyOff: false
                                        });
                                    }
                                } else {
                                    SearchInventory(f, f_item_id, inv_fulfill_qty, location, acc_timezone, assetaccount);
                                }
                            }
                        } else if (f_item_type == "Assembly" && kit_assembly && kit_line_no == f_line_no) {
                            ab_quantityremaining = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i });
                            var ab_fulfill_qty = ab_quantityremaining / kit_quantityremaining * fsd_quantity
                            f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: ab_fulfill_qty, line: i });
                            f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_account', value: line_account, line: i });
                            f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_fn_sku', value: sku_obj.sku_fnsku, line: i });
                            f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_salesperson', value: sku_obj.sku_salesperson, line: i });
                            var itemResult = search.lookupFields({ type: 'item', id: f_item_id, columns: ['islotitem', 'isserialitem', 'assetaccount'] });
                            log.audit('itemResult', itemResult);
                            var islotitem = itemResult['islotitem'];
                            var isserialitem = itemResult['isserialitem'];
                            if (!assetaccount) {
                                assetaccount = itemResult['assetaccount'][0].value;
                            }
                            if (islotitem || isserialitem) {
                                if (to_invennumber.length > 0) {
                                    TOInventoryDetails(f_item_id, inventorydetail, to_invennumber)
                                } else {
                                    InventoryDetails(f, i, ab_fulfill_qty, location, 'so', acc_timezone, assetaccount, global_config)
                                }
                            }
                            else {
                                if (runtime.accountId.indexOf('5953530') != -1) {
                                    if (f_onhand < ab_fulfill_qty) {
                                        throw error.create({
                                            name: '5018',
                                            message: '当前库存数量为:' + f_onhand + ';发货数量：' + ab_fulfill_qty,
                                            notifyOff: false
                                        });
                                    }
                                } else {
                                    SearchInventory(f, f_item_id, ab_fulfill_qty, location, acc_timezone, assetaccount);
                                }
                            }
                        } else if (f_item_type == "InvtPart" && ((inv_itemreceive && !kit_itemreceive) || (!inv_itemreceive && kit_itemreceive))) {
                            if (f_seller_sku == fsd_msku && oii_flag ? true : f_order_item_id == fsd_merchant_order_item_id) { //行上sellersku和order item id跟发货报告上相同 
                                f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: fsd_quantity, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_account', value: line_account, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_fn_sku', value: sku_obj.sku_fnsku, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_salesperson', value: sku_obj.sku_salesperson, line: i });
                                var itemResult = search.lookupFields({ type: 'item', id: f_item_id, columns: ['islotitem', 'isserialitem', 'assetaccount'] });
                                log.audit('itemResult', itemResult);
                                var islotitem = itemResult['islotitem'];
                                var isserialitem = itemResult['isserialitem'];
                                if (!assetaccount) {
                                    assetaccount = itemResult['assetaccount'][0].value;
                                }
                                if (islotitem || isserialitem) {
                                    if (to_invennumber.length > 0) {
                                        TOInventoryDetails(f_item_id, inventorydetail, to_invennumber)
                                    } else {
                                        InventoryDetails(f, i, fsd_quantity, location, 'so', acc_timezone, assetaccount, global_config)
                                    }
                                }
                                else {
                                    if (runtime.accountId.indexOf('5953530') != -1) {
                                        if (f_onhand < fsd_quantity) {
                                            throw error.create({
                                                name: '5018',
                                                message: '当前库存数量为:' + f_onhand + ';发货数量：' + fsd_quantity,
                                                notifyOff: false
                                            });
                                        }
                                    } else {
                                        SearchInventory(f, f_item_id, fsd_quantity, location, acc_timezone, assetaccount);
                                    }
                                }
                                f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true, line: i });
                            } else {
                                // log.debug('InvtPart inv_itemreceive itemreceive false')
                                f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: i });
                            }
                        } else if (f_item_type == "Assembly" && ((inv_assembly && !kit_assembly) || (!inv_assembly && kit_assembly))) {
                            if (f_seller_sku == fsd_msku && oii_flag ? true : f_order_item_id == fsd_merchant_order_item_id) { //行上sellersku和order item id跟发货报告上相同 
                                f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: fsd_quantity, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_account', value: line_account, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_fn_sku', value: sku_obj.sku_fnsku, line: i });
                                f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_salesperson', value: sku_obj.sku_salesperson, line: i });
                                var itemResult = search.lookupFields({ type: 'item', id: f_item_id, columns: ['islotitem', 'isserialitem', 'assetaccount'] });
                                log.audit('itemResult', itemResult);
                                var islotitem = itemResult['islotitem'];
                                var isserialitem = itemResult['isserialitem'];
                                if (!assetaccount) {
                                    assetaccount = itemResult['assetaccount'][0].value;
                                }
                                if (islotitem || isserialitem) {
                                    if (to_invennumber.length > 0) {
                                        TOInventoryDetails(f_item_id, inventorydetail, to_invennumber)
                                    } else {
                                        InventoryDetails(f, i, fsd_quantity, location, 'so', acc_timezone, assetaccount, global_config)
                                    }
                                }
                                else {
                                    if (runtime.accountId.indexOf('5953530') != -1) {
                                        if (f_onhand < fsd_quantity) {
                                            throw error.create({
                                                name: '5018',
                                                message: '当前库存数量为:' + f_onhand + ';发货数量：' + fsd_quantity,
                                                notifyOff: false
                                            });
                                        }
                                    } else {
                                        SearchInventory(f, f_item_id, fsd_quantity, location, acc_timezone, assetaccount);
                                    }
                                }
                                f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true, line: i });
                            } else {
                                // log.debug('Assembly false')
                                f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: i });
                            }
                        }
                    }
                }

                var f_id = f.save({ ignoreMandatoryFields: true });
                return f_id
            } catch (err) {
                log.audit('SSoToItemFulfillment error', err);
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                if (icto) {
                    e = '公司间交易出错：' + e
                }
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }
        }

        function SSoToInvoice(icto, fsd_id, so_id, fsd_shipment_date, fsd_shipment_date_text, f_id, acc_info, sku_obj, fsd_msku, fsd_quantity, fsd_merchant_order_item_id, oii_flag) {
            try {
                fsd_shipment_date = format.parse({ value: fsd_shipment_date, type: 'date' });

                try {
                    var inv = record.transform({
                        fromType: record.Type.SALES_ORDER,
                        toType: record.Type.INVOICE,
                        fromId: so_id,
                        isDynamic: true
                    });
                } catch (error) {
                    var inv_id = '';
                    search.create({
                        type: 'invoice',
                        filters: [
                            { name: 'mainline', operator: 'is', values: true },
                            { name: 'createdfrom', operator: 'anyof', values: so_id },
                            { name: 'custbody_dps_related_item_fulfillment', operator: 'anyof', values: ['@NONE@'] },
                        ],
                    }).run().each(function (rec) {
                        inv_id = rec.id;
                    });
                    log.audit('inv_id', inv_id);
                    if (inv_id) {
                        var inv = record.load({
                            type: 'invoice',
                            id: inv_id,
                            isDynamic: true
                        });
                    }
                }
                var approval_invoice = interface.GetInvoceApproval();
                var remocl = [];
                inv.setValue({ fieldId: 'trandate', value: fsd_shipment_date });
                inv.setValue({ fieldId: 'custbody_dps_related_item_fulfillment', value: f_id });
                inv.setValue({ fieldId: 'custbody_swc_jj_date_range_reports', value: fsd_id });
                if (approval_invoice) {
                    inv.setValue({ fieldId: 'approvalstatus', value: 2 }); //已核准状态
                }
                var fsd_shipment_date_time = format.format({ value: moment.utc(fsd_shipment_date_text).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.location_timezone });
                inv.setText({ fieldId: 'custbody_dps_local_time', text: fsd_shipment_date_time });
                // 强制限制发票的行等于发货的行
                var len = inv.getLineCount({ sublistId: 'item' }), ck = true, seted = 0, cs = true
                for (var i = seted; i < len; i++) {
                    inv.selectLine({ sublistId: 'item', line: i })
                    var itds = inv.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' })
                    var qty = inv.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' })
                    var amount = inv.getCurrentSublistValue({ sublistId: 'item', fieldId: 'amount' })
                    var msku = inv.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_fba_sellersku' });		//fba sellersku
                    var order_item_id = inv.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_order_item_id' });		//order item id
                    var rate_price = Math.round(parseFloat(amount / qty) * 100) / 100
                    // log.debug('rate_price:  ' + rate_price, amount + ' / ' + qty)
                    if ((msku == fsd_msku && oii_flag ? true : order_item_id == fsd_merchant_order_item_id) && fsd_quantity <= qty && ck) {
                        // log.debug('是这行' + seted, i)
                        seted = i + 1
                        ck = false
                        inv.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: fsd_quantity });
                        inv.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_fn_sku', value: sku_obj.sku_fnsku });
                        var salesperson = inv.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_salesperson' });
                        if (!salesperson) {
                            var acc = inv.getValue('custbody_dps_account');
                            var sku_salesperson;
                            search.create({
                                type: 'customrecord_dps_sku_corr',
                                filters: [
                                    { name: 'custrecord_dps_sku_account', operator: 'anyof', values: acc },
                                    { name: 'custrecord_dps_sku_itemid', operator: 'anyof', values: itds },
                                    { name: 'isinactive', join: 'custrecord_dps_sku_itemid', operator: 'is', values: false },// 存在货品非活动的情况 
                                    { name: 'isinactive', operator: 'is', values: false },// 存在非活动的情况 
                                    { name: 'custrecord_dps_sku_is_return_sku', operator: 'is', values: false },
                                    { name: 'custrecord_dps_sku_start_date', operator: 'onorbefore', values: format.format({ value: fsd_shipment_date, type: 'date' }) },
                                    { name: 'custrecord_dps_sku_end_date', operator: 'onorafter', values: format.format({ value: fsd_shipment_date, type: 'date' }) },
                                ],
                                columns: [
                                    { name: 'created', sort: search.Sort.DESC },
                                    { name: 'custrecord_dps_sku_salesperson' },
                                ]
                            }).run().each(function (rec) {
                                sku_salesperson = rec.getValue('custrecord_dps_sku_salesperson');
                            });
                            inv.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_salesperson', value: sku_salesperson });
                        }
                        var index = remocl.indexOf(i)
                        if (index != -1) {
                            remocl.splice(index, 1)
                        }
                        // log.debug('index' + index, index)
                        // log.debug('remocl' + seted, remocl)
                        inv.commitLine({ sublistId: 'item' })
                    }
                    else {
                        // log.debug('不是这行' + seted, i)
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
                log.audit('SSoToInvoice error', err);
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                if (icto) {
                    e = '公司间交易出错：' + e
                }
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

        function IsDynamicInventoryDetails(f, sublistId, quantity, location, type, acc_timezone, assetaccount) {
            try {
                log.debug('IsDynamicInventoryDetails', {
                    quantity: quantity,
                    location: location,
                    type: type,
                    acc_timezone: acc_timezone,
                    assetaccount: assetaccount,
                })
                var itemid = f.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'item' }), qty = quantity;
                var inventorydetail = f.getCurrentSublistSubrecord({ sublistId: sublistId, fieldId: 'inventorydetail' });
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
                var serialnumbers = [], serialnumbers_date = [], sd_sort = 1;
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
                        { name: "serialnumberquantity", summary: "SUM" },
                        { name: "trandate", summary: "GROUP", sort: search.Sort.ASC },
                    ]
                }).run().each(function (e) {
                    // log.debug('发货当天之前有结余', e)
                    if (Number(e.getValue(e.columns[1])) > 0) {
                        //如果当天结余大于0，记录当天结余，并把批次号记录起来
                        invennumber_quanty[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                        invennumber_quanty_min[e.getValue(e.columns[0])] = e.getValue(e.columns[1])
                        serialnumbers.push(e.getValue(e.columns[0]))
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
                        //可能会有多批次
                        for (var i = 0; i < invennumber.length; i++) {
                            if (Number(invennumber[i].actual_quantityavailable) <= 0) {
                                //如果实际可用数量小于等于0，则调过此批次
                                continue
                            }
                            inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                            qty = Number((type == 'so' || type == 'to' || type == 'it') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit) - Number(qty)
                            log.debug('qty', qty)
                            if (qty >= 0) {
                                if (type == 'so') {
                                    log.debug("so 赋值批次号ID 1", invennumber[i].inventorynumber_id)
                                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id });
                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                } else if (type == 'it') {
                                    log.debug("it 赋值批次号ID 1", invennumber[i].inventorynumber_id)
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
                                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: line_count == 0 ? quantity : Number((type == 'so' || type == 'to' || type == 'it') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit) - Number(qty) });
                                inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                                log.audit('设置数量 1', line_count == 0 ? quantity : Number((type == 'so' || type == 'to' || type == 'it') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit) - Number(qty));
                                line_count++
                                break;
                            } else {
                                qty = 0 - Number(qty)
                                if (type == 'so') {
                                    log.debug("so 赋值批次号ID 2", invennumber[i].inventorynumber_id)
                                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: invennumber[i].inventorynumber_id });
                                    inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                } else if (type == 'it') {
                                    log.debug("it 赋值批次号ID 1", invennumber[i].inventorynumber_id)
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
                                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: (type == 'so' || type == 'to' || type == 'it') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit });
                                inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                                log.audit('设置数量 2', (type == 'so' || type == 'to' || type == 'it') ? invennumber[i].actual_quantityavailable : invennumber[i].quantityintransit);
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
                    { name: "custbody_swc_jj_date_range_reports" }
                ]
            }).run().each(function (rec) {
                if (rec.getValue('custbody_swc_jj_date_range_reports')) {
                    record.submitFields({
                        type: shipment_record_type,
                        id: rec.getValue('custbody_swc_jj_date_range_reports'),
                        values: {
                            custrecord_swc_jj_drr_resolved: false
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
