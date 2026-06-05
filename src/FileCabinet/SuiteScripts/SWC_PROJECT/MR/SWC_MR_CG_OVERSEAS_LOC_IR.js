/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record'], function (search, record) {

    function getInputData() {
        try {
            var need_data = getNeedData();
            log.debug('need_data', need_data);
            log.debug('need_data.length', Object.keys(need_data).length);
            return need_data;
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getNeedData() {
        var need_info = {};
        var infoSearchObj = search.create({
            type: "transferorder",
            filters:
                [
                    ["custbody_swc_wl_no", "noneof", "@NONE@"],//关联物流发运不为空
                    "AND",
                    ["custbody_swc_wl_no.custrecord_swc_cg_main_order_number", "isnotempty", ""],//关联物流发运的CG主单号不为空
                    "AND",
                    ["tolocation.custrecord_swc_location_attribute", "anyof", "7"],//目的仓的仓库属性为平台仓
                    "AND",
                    ['mainline', 'is', 'F'],
                    'AND',
                    ['transactionlinetype', 'anyof', 'RECEIVING'],
                    'AND',
                    ['formulanumeric: {quantity} - {quantityshiprecv}', 'greaterthan', '0'],
                    'AND',
                    ['custbody_swc_main_num', 'isnotempty', ''],
                    'AND',
                    ['custbody_swc_main_detail_num', 'isnotempty', '']
                ],
            columns:
                [
                    'internalid',//内部ID
                    'custbody_swc_main_num',//主单号
                    'custbody_swc_main_detail_num'//子单号
                ]
        });
        var results = getAllResults(infoSearchObj);
        if (results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                var to_id = results[i].getValue(infoSearchObj.columns[0]);
                var main_num = results[i].getValue(infoSearchObj.columns[1]);
                var detail_num = results[i].getValue(infoSearchObj.columns[2]);
                var key = main_num + '_' + detail_num;
                need_info[key] = need_info[key] || {};
                need_info[key]['main_num'] = main_num;
                need_info[key]['detail_num'] = detail_num;
                need_info[key]['to_ids'] = need_info[key]['to_ids'] || [];
                if (need_info[key]['to_ids'].indexOf(to_id) == -1) {
                    need_info[key]['to_ids'].push(to_id);
                }
            }
        }
        return need_info;
    }

    /**
     * 通用检索方法
     * @param mySearch
     * @returns {[]}
     */
    function getAllResults(mySearch) {
        var resultSet = mySearch.run();
        var resultArr = [];
        var start = 0;
        var step = 1000;
        var results = resultSet.getRange({
            start: start,
            end: step
        });
        while (results && results.length > 0) {
            resultArr = resultArr.concat(results);
            start = Number(start) + Number(step);
            results = resultSet.getRange({
                start: start,
                end: Number(start) + Number(step)
            });
        }
        return resultArr;
    }

    function map(context) {
        try {
            var value = JSON.parse(context.value);
            log.debug('value', value);
            var main_num = value.main_num;
            var detail_num = value.detail_num;
            //获取平台及海外仓收货报告
            var recipt_info = getReciptInfo(main_num, detail_num);
            log.debug('recipt_info', recipt_info);
            var to_ids = value.to_ids || [];
            if (!Object.keys(recipt_info).length) {
                log.debug('error', '平台及海外仓收货报告为空！');
                return;
            }
            if (to_ids.length > 0) {
                //根据TOid获取对应的to信息
                var to_info = getToInfo(to_ids);
                log.debug('to_info', to_info);
                if (to_info.length > 0) {
                    //进行数量分摊
                    // 3. 执行分配
                    const result = allocateBatchByRowRatio(to_info, recipt_info, main_num);
                    log.debug('result', result);
                    if (result.length > 0) {
                        //按to单进行分组
                        var new_bill_info = {};
                        for (var i = 0; i < result.length; i++) {
                            new_bill_info[result[i].order_id] = new_bill_info[result[i].order_id] || {};
                            new_bill_info[result[i].order_id]['item_line'] = new_bill_info[result[i].order_id]['item_line'] || [];
                            new_bill_info[result[i].order_id]['item_line'].push(result[i]);
                        }
                        for (var i in new_bill_info) {
                            var item_info_arr = new_bill_info[i].item_line;
                            var batch_allocations_info = {};
                            for (var j = 0; j < item_info_arr.length; j++) {
                                var allocations_info_arr = item_info_arr[j].batchAllocations;
                                for (var k = 0; k < allocations_info_arr.length; k++) {
                                    batch_allocations_info[allocations_info_arr[k].batch] = batch_allocations_info[allocations_info_arr[k].batch] || {};
                                    batch_allocations_info[allocations_info_arr[k].batch]['main_num'] = allocations_info_arr[k].main_num;
                                    batch_allocations_info[allocations_info_arr[k].batch]['out_detail_num'] = allocations_info_arr[k].out_detail_num;
                                    batch_allocations_info[allocations_info_arr[k].batch]['item'] = allocations_info_arr[k].item;
                                    batch_allocations_info[allocations_info_arr[k].batch]['oldQty'] = allocations_info_arr[k].oldQty;
                                    batch_allocations_info[allocations_info_arr[k].batch]['toQty'] = item_info_arr[j].originalQty;
                                    batch_allocations_info[allocations_info_arr[k].batch]['quantity'] = Number(batch_allocations_info[allocations_info_arr[k].batch]['quantity'] || 0) + Number(allocations_info_arr[k].quantity);
                                }
                            }
                            new_bill_info[i].batch_allocations_info = batch_allocations_info;
                        }
                        log.debug('new_bill_info', new_bill_info);
                        if (Object.keys(new_bill_info).length > 0) {
                            for (var i in new_bill_info) {
                                context.write(i, new_bill_info[i]);
                            }
                        }
                    } else {
                        log.debug('error', '分摊数据有误请检查数据' + to_ids);
                    }
                } else {
                    log.debug('error', '对应TO单已全部收货');
                }
            } else {
                log.debug('error', '物流发运单已报关下的TO单为空！');
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getReciptInfo(main_num, detail_num) {
        var need_info = {};
        var infoSearchObj = search.create({
            type: 'customrecord_swc_platform_loc_in_info',
            filters:
                [
                    ['custrecord_swc_in_loc_type', 'anyof', '2'],
                    'AND',
                    ['formulanumeric: NVL({custrecord_swc_in_ow_quantity}, 0) - NVL({custrecord_swc_in_allocated_qty}, 0)', 'greaterthan', '0'],
                    'AND',
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['custrecord_swc_in_sku', 'noneof', '@NONE@'],
                    'AND',
                    ['custrecord_swc_in_detail_num', 'is', detail_num],
                    'AND',
                    ['custrecord_swc_in_number', 'is', main_num]
                ],
            columns:
                [
                    search.createColumn({ name: 'custrecord_swc_in_number', label: '主单号' }),
                    search.createColumn({ name: 'custrecord_swc_in_detail_num', label: '子单号' }),
                    search.createColumn({ name: 'custrecord_swc_in_sku', label: 'SKU' }),
                    search.createColumn({ name: 'custrecord_swc_in_date', label: '保税仓入库日期' }),
                    search.createColumn({ name: 'formulanumeric', formula: 'NVL({custrecord_swc_in_ow_quantity}, 0) - NVL({custrecord_swc_in_allocated_qty}, 0)', label: '公式（数值）' }),
                    search.createColumn({ name: 'custrecord_swc_in_ow_quantity', label: '数量' })
                ]
        });
        var results = getAllResults(infoSearchObj);
        if (results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                var bill_id = results[i].id;
                var detail_num = results[i].getValue(infoSearchObj.columns[1]);
                var in_sku = results[i].getValue(infoSearchObj.columns[2]);
                var in_date = results[i].getValue(infoSearchObj.columns[3]);
                var in_qty = results[i].getValue(infoSearchObj.columns[4]);
                var old_qty = results[i].getValue(infoSearchObj.columns[5]);
                need_info[in_sku] = need_info[in_sku] || [];
                need_info[in_sku].push({
                    batch: bill_id,
                    detail_num: detail_num,
                    old_qty: old_qty,
                    quantity: Number(in_qty)
                });
            }
        }
        return need_info;
    }

    function getToInfo(to_ids) {
        var item_arr = [];
        var toSearchObj = search.create({
            type: 'transferorder',
            filters:
                [
                    ['type', 'anyof', 'TrnfrOrd'],
                    'AND',
                    ['mainline', 'is', 'F'],
                    'AND',
                    ['internalid', 'anyof', to_ids],
                    'AND',
                    ['transactionlinetype', 'anyof', 'RECEIVING'],
                    'AND',
                    ['formulanumeric: {quantity} - {quantityshiprecv}', 'greaterthan', '0']
                ],
            columns:
                [
                    'item',
                    { name: 'formulanumeric', formula: '{quantity} - {quantityshiprecv}' },
                    'custcol_swc_line_no'
                ]
        });
        var results = getAllResults(toSearchObj);
        if (results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                var bill_id = results[i].id;
                var line_no = results[i].getValue(toSearchObj.columns[2]);
                var sku_id = results[i].getValue(toSearchObj.columns[0]);
                var sku_qty = Number(results[i].getValue(toSearchObj.columns[1]));
                item_arr.push({
                    order_id: bill_id,
                    line_no: line_no,
                    sku_id: sku_id,
                    sku_qty: sku_qty
                });
            }
        }
        return item_arr;
    }

    /**
     * 多货品分批出库，按行维度占比分配（保留批次信息）
     * @param {Array} orderRowGoodsList - 基础数据：[[订单标识, 行号, 货品名称, 货品数量], ...]
     * @param {Object} batchReceiveConfig - 分批出库配置：{货品名称: [{批次: 批次名, 数量: 出库数}, ...], ...}
     * @returns {Array} 最终分配结果：[[订单标识, 行号, 货品名称, 原始数量, 批次, 分配数量], ...]
     */
    function allocateBatchByRowRatio(orderRowGoodsList, batchReceiveConfig, main_num) {
        var rec_arr = [];
        const orderMap = {};
        orderRowGoodsList.forEach(line => {
            if (!orderMap[line.sku_id]) {
                orderMap[line.sku_id] = [];
            }
            orderMap[line.sku_id].push({
                order_id: line.order_id,
                line_no: line.line_no,
                sku_id: line.sku_id,
                originalQty: line.sku_qty, //原始数量
                allocatedQty: 0, // 已分摊数量
                remaining: line.sku_qty,  // 剩余可分摊数量
                batchAllocations: [] // 记录每个批次的分摊明细
            });
        });
        log.debug('orderMap', orderMap);
        // 遍历每个货品（A/B）
        for (const [goods, batchList] of Object.entries(batchReceiveConfig)) {
            log.debug('goods', goods);
            log.debug('batchList', batchList);
            const orderLines = orderMap[goods] || [];
            log.debug('orderLines', orderLines);

            // 遍历当前货品的每一批出库，独立分配
            batchList.forEach(batch => {
                const { batch: batchName, detail_num: outDetailNum, old_qty: oldQty, quantity: receiveTotal } = batch;
                log.debug('batchName', batchName);
                let currentBatchRemaining = receiveTotal; // 当前批次剩余待分配数量
                log.debug('currentBatchRemaining', currentBatchRemaining);
                // 计算当前剩余可分摊的订单行总量
                const remainingOrderTotal = orderLines.reduce((sum, line) => sum + line.remaining, 0);
                log.debug('remainingOrderTotal', remainingOrderTotal);
                if (remainingOrderTotal <= 0) return; // 所有订单行已填满，无需分配
                var allocateQty_total = 0;
                orderLines.forEach(line => {
                    if (currentBatchRemaining <= 0 || line.remaining <= 0) return;
                    // 计算该行应分摊的比例和数量
                    const ratio = line.remaining / remainingOrderTotal;
                    let allocateQty = Math.floor(currentBatchRemaining * ratio) || 1; // 向下取整避免超额（为0时默认为1）
                    // 确保不超过该行剩余可分配量
                    allocateQty = Math.min(allocateQty, line.remaining);
                    // 更新该行数据
                    if (Number(allocateQty) > 0) {
                        line.batchAllocations.push({
                            batch: batchName,
                            out_detail_num: outDetailNum,
                            main_num: main_num,
                            item: goods,
                            oldQty: oldQty,
                            quantity: allocateQty
                        });
                        line.allocatedQty += allocateQty;
                        line.remaining -= allocateQty;
                        // currentBatchRemaining -= allocateQty;
                        allocateQty_total += Number(allocateQty);
                    }
                });
                currentBatchRemaining -= allocateQty_total;
                log.debug('currentBatchRemaining1', currentBatchRemaining);
                log.debug('orderLines1', orderLines);
                //将剩余的数量分摊进未满足的订单行中
                // 遍历订单行，逐个分配
                for (let i = 0; i < orderLines.length && currentBatchRemaining > 0; i++) {
                    const line = orderLines[i];

                    // 跳过无剩余可分配的行
                    if (line.remaining <= 0) continue;

                    // 计算当前行可分配的数量：取剩余待分配量 和 该行剩余量的较小值
                    const canAllocate = Math.min(currentBatchRemaining, line.remaining);

                    if (Number(canAllocate) > 0) {
                        line.batchAllocations.push({
                            batch: batchName,
                            out_detail_num: outDetailNum,
                            main_num: main_num,
                            item: goods,
                            oldQty: oldQty,
                            quantity: canAllocate
                        });
                        // 更新当前行的字段
                        line.allocatedQty += canAllocate;
                        line.remaining -= canAllocate;
                        currentBatchRemaining -= canAllocate;
                    }
                }
                log.debug('currentBatchRemaining2', currentBatchRemaining);
                log.debug('orderLines2', orderLines);
            });
            rec_arr = rec_arr.concat(orderLines);
        }
        return rec_arr;
    }

    function reduce(context) {
        try {
            log.debug('key', context.key);
            log.debug('values', context.values);
            log.debug('values', JSON.parse(context.values));
            var to_id = context.key, sublist_id = 'item';
            var need_info = JSON.parse(context.values), item_line = need_info.item_line, batch_allocations_info = need_info.batch_allocations_info;
            log.debug('need_info', need_info);
            var line_arr = [], to_item_qtys = {};
            for (var i = 0; i < item_line.length; i++) {
                line_arr.push(Number(item_line[i].line_no));
                to_item_qtys[item_line[i].sku_id] = Number(to_item_qtys[item_line[i].sku_id] || 0) + Number(item_line[i].originalQty);
            }
            log.debug('line_arr', line_arr);
            var if_data = record.transform({
                fromType: record.Type.TRANSFER_ORDER,
                fromId: to_id,
                toType: record.Type.ITEM_FULFILLMENT,
                isDynamic: true
            });
            if_data.setValue({ fieldId: 'shipstatus', value: 'C' });
            var bill_line_count = if_data.getLineCount(sublist_id);
            if (bill_line_count > 0) {
                for (var i = bill_line_count - 1; i >= 0; i--) {
                    var line_num = if_data.getSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_line_no', line: i });
                    if_data.selectLine(sublist_id, i);
                    if_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'itemreceive', value: false });
                    for (var k = 0; k < item_line.length; k++) {
                        if (item_line[k].line_no == line_num) {
                            if_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'itemreceive', value: true });
                            if_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'quantity', value: item_line[k].allocatedQty });
                            var inventorydetail = if_data.getCurrentSublistSubrecord({ sublistId: sublist_id, fieldId: 'inventorydetail' });
                            var boxSubLineCount = inventorydetail.getLineCount({ sublistId: 'inventoryassignment' });
                            if (boxSubLineCount > 0) {
                                var allocated_qty = item_line[k].allocatedQty, inventory_details = {}, lot_ids = [];
                                for (var j = 0; j < boxSubLineCount; j++) {
                                    inventorydetail.selectLine({ sublistId: 'inventoryassignment', line: j });
                                    var lot_id = inventorydetail.getCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber' });
                                    var lot_qty = inventorydetail.getCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity' });
                                    lot_ids.push(lot_id);
                                    if (Number(allocated_qty) > Number(lot_qty)) {
                                        inventory_details[lot_id] = lot_qty;
                                        allocated_qty -= Number(lot_qty);
                                    } else {
                                        inventory_details[lot_id] = allocated_qty;
                                        break;
                                    }
                                }
                                for (var j = 0; j < boxSubLineCount; j++) {
                                    inventorydetail.selectLine({ sublistId: 'inventoryassignment', line: j });
                                    var lot_id = inventorydetail.getCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber' });
                                    if (lot_ids.indexOf(lot_id) == -1) {
                                        var line_num = inventorydetail.findSublistLineWithValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: lot_id });
                                        inventorydetail.removeLine({ sublistId: 'inventoryassignment', line: line_num });
                                    } else {
                                        inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: inventory_details[lot_id] });
                                        inventorydetail.commitLine('inventoryassignment');
                                    }
                                }
                            }
                        }
                    }
                    if_data.commitLine(sublist_id);
                }
            }
            var ifId = if_data.save({ ignoreMandatoryFields: true });
            if (!ifId) {
                log.error('IF save failed', { to_id });
                return;
            }
            log.debug('IF created', ifId);
            var to_data = record.transform({
                fromType: record.Type.TRANSFER_ORDER,
                fromId: to_id,
                toType: record.Type.ITEM_RECEIPT,
                isDynamic: true
            });
            var to_data_id = to_data.save({ ignoreMandatoryFields: true });
            if (to_data_id) {
                log.debug('success', '转移单货品收据生成成功');
                var update_info = {};
                //将分摊明细关联到对应的TO单中
                for (var i in batch_allocations_info) {
                    update_info[i] = Number(update_info[i] || 0) + Number(batch_allocations_info[i].quantity);
                    var allocation_qty_record_data = record.create({ type: 'customrecord_swc_allocation_qty_record', isDynamic: true });
                    allocation_qty_record_data.setValue('custrecord_swc_correlation_order', to_id);
                    allocation_qty_record_data.setValue('custrecord_swc_receipt_list_id', i);
                    allocation_qty_record_data.setValue('custrecord_swc_main_num', batch_allocations_info[i].main_num);
                    allocation_qty_record_data.setValue('custrecord_swc_detail_num', batch_allocations_info[i].out_detail_num);
                    allocation_qty_record_data.setValue('custrecord_swc_correlation_sku', batch_allocations_info[i].item);
                    allocation_qty_record_data.setValue('custrecord_swc_list_qty', batch_allocations_info[i].oldQty);
                    allocation_qty_record_data.setValue('custrecord_swc_to_qty', batch_allocations_info[i].toQty);
                    allocation_qty_record_data.setValue('custrecord_swc_apportioned_qty', batch_allocations_info[i].quantity);
                    var allocation_qty_record_data_id = allocation_qty_record_data.save({ ignoreMandatoryFields: true });
                    if (allocation_qty_record_data_id) {
                        log.debug('success', '分摊明细关联成功');
                    }
                }
                //将已分摊的数量汇总更新收货报告已分配数量
                for (var i in update_info) {
                    var in_info_data = record.load({ type: 'customrecord_swc_platform_loc_in_info', id: i, isDynamic: true });
                    var in_allocated_qty = in_info_data.getValue('custrecord_swc_in_allocated_qty') || 0;
                    //to_item_qtys是TO的发货数量
                    var need_allocated_qty = Number(update_info[i]) + Number(in_allocated_qty);
                    in_info_data.setValue('custrecord_swc_in_allocated_qty', need_allocated_qty);
                    var in_info_data_id = in_info_data.save({ ignoreMandatoryFields: true });
                    if (in_info_data_id) {
                        log.debug('success', '收货报告已分配数量已更新');
                    }
                }
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function summarize(summary) {
        log.debug('summary', summary);
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
