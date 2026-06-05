/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record'], function (search, record) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {
        try {
            log.debug('beforeSubmit', 'beforeSubmit')
            // if (context.type == 'create') 
            {
                var newRec = context.newRecord;
                var created_from_id = newRec.getValue('createdfrom');
                var bill_type = getBillTypeAndLocation(created_from_id);
                log.debug('bill_type', bill_type)
                if (bill_type.need_type == 'TrnfrOrd') {
                    newRec.setValue('location', bill_type.need_loc)
                }

            }
        } catch (error) {
            log.error('error', error)
        }

    }

    function afterSubmit(context) {
        try {
            if (context.type == 'create') {
                var newRec = context.newRecord;
                var created_from_id = newRec.getValue('createdfrom'), sublist_id = 'item';
                //获取创建自的类型
                var bill_type = getBillType(created_from_id);
                if (bill_type == 'RtnAuth') {
                    //获取货品行信息
                    var ir_count = newRec.getLineCount(sublist_id), ir_lot_arr = [];
                    if (ir_count > 0) {
                        for (var i = 0; i < ir_count; i++) {
                            var id_record = newRec.getSublistSubrecord({ sublistId: sublist_id, fieldId: 'inventorydetail', line: i });
                            var id_count = id_record.getLineCount('inventoryassignment');
                            if (id_count > 0) {
                                for (var j = 0; j < id_count; j++) {
                                    var lot_num = id_record.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', line: j });
                                    ir_lot_arr.push(lot_num);
                                }
                            }
                        }
                    }
                    log.debug('ir_lot_arr', ir_lot_arr);
                    if (ir_lot_arr.length > 0) {
                        var lot_ids = getLotId(ir_lot_arr);
                        log.debug('lot_ids', lot_ids);
                        if (lot_ids.length > 0) {
                            //获取退货授权信息
                            var shop_id, loc_id, so_num;
                            var ra_data = record.load({ type: 'returnauthorization', id: created_from_id });
                            var ra_created_from = ra_data.getValue('createdfrom');
                            if (ra_created_from) {
                                var so_data = record.load({ type: 'salesorder', id: ra_created_from });
                                shop_id = so_data.getValue('entity');
                                so_num = so_data.getValue('tranid');
                                //仓库需要从货品履行上获取
                                loc_id = getLocId(ra_created_from);
                            } else {
                                shop_id = ra_data.getValue('entity');
                            }
                            for (var i = 0; i < lot_ids.length; i++) {
                                //进行批次号更新
                                var inventory_number = record.submitFields({
                                    type: 'inventorynumber',
                                    id: lot_ids[i],
                                    values: {
                                        custitemnumber_swc_itemrmashop: shop_id,//店铺
                                        custitemnumber_swc_rma_location: loc_id,//订单仓库
                                        custitemnumber_swc_ysalesorderid: so_num//SO单号
                                    }
                                });
                                if (inventory_number) {
                                    log.debug('success', '批次更新成功');
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getLocId(ra_created_from) {
        var loc_id;
        search.create({
            type: 'itemfulfillment',
            filters:
                [
                    ['type', 'anyof', 'ItemShip'],
                    'AND',
                    ['createdfrom', 'anyof', ra_created_from],
                    'AND',
                    ['location', 'noneof', '@NONE@']
                ],
            columns:
                [
                    'location'
                ]
        }).run().each(function (result) {
            loc_id = result.getValue(result.columns[0]);
            return false;
        });
        return loc_id;
    }

    /**
     * 搜索货品收据的创建自单据类型和收货仓库
     * @param {收据创建自单据id} created_from_id 
     * @returns 
     */
    function getBillTypeAndLocation(created_from_id) {
        var need_data = {};
        search.create({
            type: 'itemreceipt',
            filters: [
                ['type', 'anyof', 'ItemRcpt'],
                'AND',
                ['createdfrom', 'anyof', created_from_id],
                'AND',
                ['mainline', 'is', 'T']
            ],
            columns: [
                search.createColumn({ name: 'tranid', label: '文档编号' }),
                search.createColumn({
                    name: 'type',
                    join: 'createdFrom',
                    label: '类型'
                }),
                search.createColumn({ name: 'transferlocation', join: 'createdFrom', label: '目的地点' }),
                search.createColumn({ name: 'location', join: 'createdFrom', label: '地点' })
            ]
        }).run().each(function (result) {
            log.debug('result', result)
            need_data['need_type'] = result.getValue(result.columns[1]);
            need_data['need_loc'] = result.getValue(result.columns[2]);
            return false;
        });
        return need_data;
    }

    function getBillType(created_from_id) {
        var need_type;
        search.create({
            type: 'itemreceipt',
            filters: [
                ['type', 'anyof', 'ItemRcpt'],
                'AND',
                ['createdfrom', 'anyof', created_from_id],
                'AND',
                ['mainline', 'is', 'T']
            ],
            columns: [
                search.createColumn({ name: 'tranid', label: '文档编号' }),
                search.createColumn({
                    name: 'type',
                    join: 'createdFrom',
                    label: '类型'
                })
            ]
        }).run().each(function (result) {
            need_type = result.getValue(result.columns[1]);
            return false;
        });
        return need_type;
    }

    function getLotId(lot_num_arr) {
        var lot_ids = [], filters_arr = [];
        for (var i = 0; i < lot_num_arr.length; i++) {
            if (filters_arr.length > 0) {
                filters_arr.push('OR', ['inventorynumber', 'is', lot_num_arr[i]]);
            } else {
                filters_arr.push(['inventorynumber', 'is', lot_num_arr[i]]);
            }
        }
        search.create({
            type: 'inventorynumber',
            filters: filters_arr,
            columns: [
                'inventorynumber',
                'item'
            ]
        }).run().each(function (result) {
            lot_ids.push(result.id);
            return true;
        });
        return lot_ids;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
