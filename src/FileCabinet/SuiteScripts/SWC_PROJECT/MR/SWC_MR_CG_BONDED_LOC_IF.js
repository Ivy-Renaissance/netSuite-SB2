/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *清关转移单CG保税仓发货处理
 */
define(['N/search', 'N/record', 'N/currency'], function (search, record, currency) {

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
            type: 'customrecord_swc_platform_loc_out_info',
            filters:
                [
                    ['custrecord_swc_out_loc_type', 'anyof', '1'],
                    'AND',
                    ['formulanumeric: NVL({custrecord_swc_out_quantity}, 0) - NVL({custrecord_swc_out_allocated_qty}, 0)', 'greaterthan', '0'],
                    'AND',
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['custrecord_swc_out_sku', 'noneof', '@NONE@'],
                    'AND',
                    ['custrecord_swc_out_detail_num', 'isnotempty', ''],
                    'AND',
                    ['custrecord_swc_out_sub_order.custrecord_swc_cso_status', 'is', '6'],//头程费用类型采购订单【审核成功】的订单才跑出库
                    // 'AND',
                    // ['custrecord_swc_out_number', 'is', '56786234567']
                ],
            columns:
                [
                    search.createColumn({ name: 'custrecord_swc_out_number', label: '主单号' }),
                    search.createColumn({ name: 'custrecord_swc_out_detail_num', label: '子单号' }),
                    search.createColumn({ name: 'custrecord_swc_out_sku', label: 'SKU' }),
                    search.createColumn({ name: 'custrecord_swc_out_date', label: '保税仓出库日期' }),
                    search.createColumn({ name: 'formulanumeric', formula: 'NVL({custrecord_swc_out_quantity}, 0) - NVL({custrecord_swc_out_allocated_qty}, 0)', label: '公式（数值）' }),
                    search.createColumn({ name: 'custrecord_swc_out_quantity', label: '数量' })
                ]
        });
        //每次运行脚本，同一个主单号只取一个子单号去处理，避免不同子单号分配到相同TO时重复分配的问题
        var results = getAllResults(infoSearchObj);
        var out_numbers = [];
        if (results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                var bill_id = results[i].id;
                var out_number = results[i].getValue(infoSearchObj.columns[0]);
                var out_detail_num = results[i].getValue(infoSearchObj.columns[1]);
                var out_sku = results[i].getValue(infoSearchObj.columns[2]);
                var out_date = results[i].getValue(infoSearchObj.columns[3]);
                var out_qty = results[i].getValue(infoSearchObj.columns[4]);
                var old_qty = results[i].getValue(infoSearchObj.columns[5]);
                if (out_numbers.indexOf(out_number) == -1 || need_info[out_detail_num]) {
                    need_info[out_detail_num] = need_info[out_detail_num] || {};
                    need_info[out_detail_num][out_sku] = need_info[out_detail_num][out_sku] || [];
                    need_info[out_detail_num][out_sku].push({
                        batch: bill_id,
                        out_number: out_number,
                        out_detail_num: out_detail_num,
                        old_qty: old_qty,
                        quantity: Number(out_qty)
                    });
                    out_numbers.push(out_number)
                }

            }
        }
        log.debug('need_info', need_info)
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
            var key = context.key, value = JSON.parse(context.value);
            log.debug('key', key);
            log.debug('value', value);
            var out_number = '';
            Object.keys(value).map(function name(de) {
                log.debug('de', de)
                out_number = value[de][0].out_number
                log.debug('out_number', out_number)
            })
            if (!out_number) return
            //根据主单号查询对应的物流发运单已清关下的TO单
            var to_search_info = getToId(out_number);
            var to_ids = to_search_info.search_ids;
            var pre_to_info = to_search_info.pre_to_info;//用来匹配上一步TO收货批次信息
            log.debug('to_ids', to_ids);
            log.debug('pre_to_info', pre_to_info);
            if (to_ids.length > 0) {
                //根据TOid获取对应的to信息
                var to_info = getToInfo(to_ids, pre_to_info);
                log.debug('to_info', to_info);
                if (to_info.length > 0) {
                    //进行数量分摊
                    // 3. 执行分配
                    const _result = allocateBatchByRowRatio(to_info, value, out_number);
                    log.debug('_result', _result);
                    //分配完之后再根据接口
                    var fees = getFees(key)
                    log.debug('fees', fees);
                    const result = allocateFeesByVolume(_result, fees)
                    log.debug('newResult', result);
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
                    log.debug('error', '对应TO单已全部发货');
                }
            } else {
                log.debug('error', '物流发运单已报关下的TO单为空！');
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getFees(cg_num) {
        //TODO:费用用了一次之后就不再分摊了，只分摊一次
        var fees = []
        search.create({
            type: 'customrecord_swc_cg_first_leg_cost',
            filters:
                [
                    ['custrecord_swc_wl_cflc_yg_fee', 'greaterthan', 0],
                    'AND',
                    ['custrecord_swc_cg_first_leg_cost_id.custrecord_swc_cso_sub_order_number', 'is', cg_num],
                    'AND',
                    ['isinactive', 'is', false]
                ],
            columns:
                [
                    { name: "custrecord_swc_wl_cflc_yg_fee", summary: "SUM" },//预估费用
                    { name: "custrecord_swc_wl_cflc_yg_currency", summary: "GROUP" },//预估别种
                    { name: "custrecord_swc_cflc_fee_type_z", summary: "GROUP" },//预估别种
                    { name: "custrecord_swc_cost_category", join: 'custrecord_swc_cflc_fee_type_z', summary: "GROUP" },//费用类别
                ]
        }).run().each(function (fee_rec) {
            fees.push({
                fee: fee_rec.getValue(fee_rec.columns[0]),
                currency: fee_rec.getValue(fee_rec.columns[1]),
                type_z: fee_rec.getValue(fee_rec.columns[2]),
                category: fee_rec.getValue(fee_rec.columns[3])
            })
            return true;
        });
        return fees;
    }

    /**
     * 分摊费用到调拨单明细
     * @param {Array} transferDetails - 调拨单明细数组
     * @param {Array} fees - 费用数组
     * @returns {Array} 包含分摊后费用的调拨单明细数组
     */
    function allocateFeesByVolume(transferDetails, fees) {
        // 计算每个明细的体积和总体积
        var totalVolume = 0;
        var detailVolumes = [];

        // 第一步：计算每个明细的体积
        for (var i = 0; i < transferDetails.length; i++) {
            var detail = transferDetails[i];
            var volume = detail.allocatedQty * detail.unitVolume;
            detailVolumes.push({
                index: i,
                volume: volume
            });
            totalVolume += volume;
        }

        // 第二步：分摊每个费用
        for (var i = 0; i < transferDetails.length; i++) {
            var detail = transferDetails[i];
            var volume = detailVolumes[i].volume;
            var allocatedFees = [];

            // 对每个费用进行分摊
            for (var j = 0; j < fees.length; j++) {
                var fee = fees[j];
                var allocatedAmount = 0;

                if (totalVolume > 0) {
                    // 计算分摊金额 = 费用金额 * (当前明细体积 / 总体积)
                    allocatedAmount = Math.round(parseFloat(fee.fee) * (volume / totalVolume) * 100) / 100;
                } else {
                    // 如果总体积为0，则平均分摊
                    allocatedAmount = parseFloat(fee.fee) / transferDetails.length;
                }

                // 创建分摊后的费用对象
                var allocatedFee = {
                    fee: allocatedAmount.toString(),
                    currency: fee.currency,
                    type_z: fee.type_z,
                    category: fee.category
                };

                allocatedFees.push(allocatedFee);
            }

            // 将分摊后的费用数组添加到明细中
            detail.fees = allocatedFees;
        }

        return transferDetails;
    }

    function getToId(cg_num) {
        var search_info = {}, search_ids = [], pre_to_info = {};
        search.create({
            type: 'customrecord_swc_wl_tk_t',
            filters:
                [
                    ['custrecord_wl_tk_t_qg_t.type', 'anyof', 'TrnfrOrd'],
                    'AND',
                    ['custrecord_wl_tk_t_wl_id.custrecord_swc_cg_main_order_number', 'is', cg_num],
                    'AND',
                    ['isinactive', 'is', false]
                ],
            columns:
                [
                    'custrecord_wl_tk_t_qg_t',
                    'custrecord_wl_tk_t_g_t',
                    'custrecord_wl_tk_t_bg_t',
                    'custrecord_wl_tk_t_wl_id.custrecord_swc_wl_terms_of_trade'
                ]
        }).run().each(function (result) {
            var rec_arr = result.getValue(result.columns[0]).split(',');
            if (rec_arr.length > 0) {
                var need_id = rec_arr.sort(function (a, b) { return a - b; })[0];
                search_ids.push(need_id);
                var terms_of_trade = result.getValue(result.columns[3]);
                if (terms_of_trade == 5) {//海外FOB
                    var g_t_arr = result.getValue(result.columns[1]).split(',');
                    if (g_t_arr.length > 0) {
                        var g_t_id = g_t_arr.sort(function (a, b) { return b - a; })[0];
                        pre_to_info[need_id] = g_t_id;
                    }
                } else {
                    var t_bg_t_arr = result.getValue(result.columns[2]).split(',');
                    if (t_bg_t_arr.length > 0) {
                        var t_bg_t_id = t_bg_t_arr.sort(function (a, b) { return b - a; })[0];
                        pre_to_info[need_id] = t_bg_t_id;
                    }
                }
            }
            return true;
        });
        search_info.search_ids = search_ids;
        search_info.pre_to_info = pre_to_info || '';
        return search_info;
    }

    function getToInfo(to_ids, pre_to_info) {
        var item_arr = [], search_lots_to_arr = [];
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
                    'custcol_swc_line_no',
                    { name: 'custitem_swc_total_volume', join: 'item' }
                ]
        });
        var results = getAllResults(toSearchObj);
        if (results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                var bill_id = results[i].id;
                var line_no = results[i].getValue(toSearchObj.columns[2]);
                var sku_id = results[i].getValue(toSearchObj.columns[0]);
                var sku_qty = Number(results[i].getValue(toSearchObj.columns[1]));
                var unitVolume = results[i].getValue(toSearchObj.columns[3]) || 0;
                item_arr.push({
                    order_id: bill_id,
                    line_no: line_no,
                    sku_id: sku_id,
                    sku_qty: sku_qty,
                    unitVolume: unitVolume,
                    item_lots: []
                });
                if (pre_to_info[bill_id] && search_lots_to_arr.indexOf(pre_to_info[bill_id]) == -1) {
                    search_lots_to_arr.push(pre_to_info[bill_id]);
                }
            }
        }
        //获取对应的TO收货批次
        if (search_lots_to_arr.length > 0) {
            var lot_info = getLotArr(search_lots_to_arr, pre_to_info);
            log.debug('lot_info', lot_info);
            if (Object.keys(lot_info).length > 0) {
                for (var i = 0; i < item_arr.length; i++) {
                    var key = item_arr[i].order_id + '_' + item_arr[i].sku_id;
                    if (lot_info[key] && lot_info[key].length > 0) {
                        item_arr[i].item_lots = lot_info[key];
                    }
                }
            }
        }
        return item_arr;
    }

    function getLotArr(search_lots_to_arr, pre_to_info) {
        var need_info = {};
        var itemreceiptSearchObj = search.create({
            type: 'itemreceipt',
            filters:
                [
                    ["serialnumber", "isnotempty", ""],
                    "AND",
                    ["createdfrom", "anyof", search_lots_to_arr]
                ],
            columns:
                [
                    search.createColumn({ name: "createdfrom", summary: "GROUP", label: "创建自" }),
                    search.createColumn({ name: "item", summary: "GROUP", label: "货品" }),
                    search.createColumn({ name: "serialnumber", summary: "GROUP", label: "事务处理序列号/批号" }),
                    search.createColumn({ name: "serialnumberquantity", summary: "SUM", label: "事务处理序列号/批号数量" })
                ]
        });
        var results = getAllResults(itemreceiptSearchObj);
        if (results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                var createdfrom_id = results[i].getValue(itemreceiptSearchObj.columns[0]);
                var sku_id = results[i].getValue(itemreceiptSearchObj.columns[1]);
                var sku_lot = results[i].getValue(itemreceiptSearchObj.columns[2]);
                var sku_lot_qty = results[i].getValue(itemreceiptSearchObj.columns[3]);
                var key_id;
                for (var j in pre_to_info) {
                    if (createdfrom_id == pre_to_info[j]) {
                        key_id = j;
                        break;
                    }
                }
                var key = key_id + '_' + sku_id;
                need_info[key] = need_info[key] || [];
                need_info[key].push({
                    lot: sku_lot,
                    qty: sku_lot_qty
                });
            }
        }
        return need_info;
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
                item_lots: line.item_lots,
                originalQty: line.sku_qty, //原始数量
                allocatedQty: 0, // 已分摊数量
                unitVolume: line.unitVolume, // 单个体积
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
                const { batch: batchName, out_detail_num: outDetailNum, old_qty: oldQty, quantity: receiveTotal } = batch;
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
        var if_ids = [], ir_ids = [];
        try {
            log.debug('key', context.key);
            log.debug('values', JSON.parse(context.values));
            var to_id = context.key, sublist_id = 'item';
            var need_info = JSON.parse(context.values), item_line = need_info.item_line, batch_allocations_info = need_info.batch_allocations_info;
            log.debug('need_info', need_info);
            if (item_line.length > 0) {
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
                        if_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'itemreceive', value: false });//先把所有行改成不接收，下面匹配到了再勾上
                        for (var j = 0; j < item_line.length; j++) {
                            if (item_line[j].line_no == line_num) {
                                if_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'itemreceive', value: true });
                                if_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'quantity', value: item_line[j].allocatedQty });
                                var lot_arr = item_line[j].item_lots;
                                var allocated_qty = item_line[j].allocatedQty;
                                if (lot_arr.length > 0) {
                                    var inventorydetail = if_data.getCurrentSublistSubrecord({ sublistId: sublist_id, fieldId: 'inventorydetail' });
                                    for (var l = 0; l < lot_arr.length; l++) {
                                        if (Number(allocated_qty) > 0) {
                                            inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                                            inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', text: String(lot_arr[l].lot) });
                                            var quantityavailable = inventorydetail.getCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantityavailable' });
                                            if (Number(quantityavailable) >= Number(allocated_qty)) {
                                                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: allocated_qty });
                                                inventorydetail.commitLine('inventoryassignment');
                                                break;
                                            } else if (Number(quantityavailable) < Number(allocated_qty)) {
                                                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: quantityavailable });
                                                inventorydetail.commitLine('inventoryassignment');
                                                allocated_qty = Number(allocated_qty) - Number(quantityavailable);
                                            }
                                        } else {
                                            break;
                                        }
                                    }
                                }
                            } else {
                                // if_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'itemreceive', value: false });
                            }
                        }
                        if_data.commitLine(sublist_id);
                    }
                }
                var if_data_id = if_data.save({ ignoreMandatoryFields: true });
                if (if_data_id) {
                    if_ids.push(if_data_id);
                    log.debug('success', '转移单货品履行生成成功');
                    //生成货品收据
                    var ir_data = record.transform({
                        fromType: record.Type.TRANSFER_ORDER,
                        fromId: to_id,
                        toType: record.Type.ITEM_RECEIPT,
                        isDynamic: true
                    });
                    ir_data.setValue('custbody_swc_main_num', item_line[0].batchAllocations[0].main_num );
                    ir_data.setValue('custbody_swc_main_detail_num', item_line[0].batchAllocations[0].out_detail_num);
                    var ir_line_count = ir_data.getLineCount(sublist_id);
                    var ir_currency = ir_data.getValue('currency')
                    if (ir_line_count > 0) {
                        for (var i = ir_line_count - 1; i >= 0; i--) {
                            var line_num = ir_data.getSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_line_no', line: i });
                            ir_data.selectLine(sublist_id, i);
                            ir_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'itemreceive', value: false });//先把所有行改成不接收，下面匹配到了再勾上
                            for (var j = 0; j < item_line.length; j++) {
                                if (item_line[j].line_no == line_num) {
                                    ir_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'itemreceive', value: true });
                                    ir_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'quantity', value: item_line[j].allocatedQty });
                                    var fee_arr = convertAndMergeFees(item_line[j].fees, ir_currency);
                                    var allocated_qty = item_line[j].allocatedQty;
                                    if (fee_arr.length > 0) {
                                        var landed_cost = ir_data.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'landedcost' });
                                        for (var l = 0; l < fee_arr.length; l++) {
                                            landed_cost.selectNewLine({ sublistId: 'landedcostdata' });
                                            landed_cost.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: fee_arr[l].category });
                                            landed_cost.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'amount', value: fee_arr[l].fee });
                                            landed_cost.commitLine({ sublistId: 'landedcostdata' });
                                        }
                                    }
                                } else {
                                    // ir_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'itemreceive', value: false });
                                }
                            }
                            ir_data.commitLine(sublist_id);
                        }
                    }

                    var ir_data_id = ir_data.save({ ignoreMandatoryFields: true });
                    if (ir_data_id) {
                        ir_ids.push(ir_data_id);
                        log.debug('success', '转移单货品收据生成成功');
                    }
                }

                var update_info = {};
                //将分摊明细关联到对应的TO单中
                for (var i in batch_allocations_info) {
                    update_info[i] = Number(update_info[i] || 0) + Number(batch_allocations_info[i].quantity);
                    var allocation_qty_record_data = record.create({ type: 'customrecord_swc_allocation_qty_record', isDynamic: true });
                    allocation_qty_record_data.setValue('custrecord_swc_correlation_order', to_id);
                    allocation_qty_record_data.setValue('custrecord_swc_outbound_list_id', i);
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
                //将已分摊的数量汇总更新出库报告已分配数量
                for (var i in update_info) {
                    var in_info_data = record.load({ type: 'customrecord_swc_platform_loc_out_info', id: i, isDynamic: true });
                    var in_allocated_qty = in_info_data.getValue('custrecord_swc_out_allocated_qty') || 0;
                    var need_allocated_qty = Number(update_info[i]) + Number(in_allocated_qty);
                    in_info_data.setValue('custrecord_swc_out_allocated_qty', need_allocated_qty);
                    var in_info_data_id = in_info_data.save({ ignoreMandatoryFields: true });
                    if (in_info_data_id) {
                        log.debug('success', '出库报告已分配数量已更新');
                    }
                }
            } else {
                log.debug('error', '不存在分摊明细');
            }
            // var line_info = {};
            // for (var i = 0; i < item_line.length; i++) {
            //     var batch_allocations = item_line[i].batchAllocations;
            //     for (var j = 0; j < batch_allocations.length; j++) {
            //         var line_key = batch_allocations[j].main_num + '_' + batch_allocations[j].out_detail_num;
            //         line_info[line_key] = line_info[line_key] || {};
            //         line_info[line_key]['main_num'] = batch_allocations[j].main_num;
            //         line_info[line_key]['out_detail_num'] = batch_allocations[j].out_detail_num;
            //         line_info[line_key]['item_lots'] = item_line[i].item_lots;
            //         line_info[line_key]['item_fees'] = item_line[i].fees;
            //         line_info[line_key]['detail_line'] = line_info[line_key]['detail_line'] || {};
            //         line_info[line_key]['detail_line'][item_line[i].line_no] = Number(line_info[line_key]['detail_line'][item_line[i].line_no] || 0) + Number(batch_allocations[j].quantity);
            //     }
            // }
            // log.debug('line_info', line_info);
            // if (Object.keys(line_info).length > 0) {
            //     for (var k in line_info) {
            //         var detail_line = line_info[k].detail_line;
            //         var if_data = record.transform({
            //             fromType: record.Type.TRANSFER_ORDER,
            //             fromId: to_id,
            //             toType: record.Type.ITEM_FULFILLMENT,
            //             isDynamic: true
            //         });
            //         if_data.setValue({ fieldId: 'shipstatus', value: 'C' });
            //         var bill_line_count = if_data.getLineCount(sublist_id);
            //         if (bill_line_count > 0) {
            //             for (var i = bill_line_count - 1; i >= 0; i--) {
            //                 var line_num = if_data.getSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_line_no', line: i });
            //                 if_data.selectLine(sublist_id, i);
            //                 if_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'itemreceive', value: false });//先把所有行改成不接收，下面匹配到了再勾上
            //                 for (var j in detail_line) {
            //                     if (j == line_num) {
            //                         if_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'itemreceive', value: true });
            //                         if_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'quantity', value: detail_line[j] });
            //                         var lot_arr = line_info[k].item_lots;
            //                         var allocated_qty = detail_line[j];
            //                         if (lot_arr.length > 0) {
            //                             var inventorydetail = if_data.getCurrentSublistSubrecord({ sublistId: sublist_id, fieldId: 'inventorydetail' });
            //                             for (var l = 0; l < lot_arr.length; l++) {
            //                                 if (Number(allocated_qty) > 0) {
            //                                     inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
            //                                     inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', text: String(lot_arr[l].lot) });
            //                                     var quantityavailable = inventorydetail.getCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantityavailable' });
            //                                     if (Number(quantityavailable) >= Number(allocated_qty)) {
            //                                         inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: allocated_qty });
            //                                         inventorydetail.commitLine('inventoryassignment');
            //                                         break;
            //                                     } else if (Number(quantityavailable) < Number(allocated_qty)) {
            //                                         inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: quantityavailable });
            //                                         inventorydetail.commitLine('inventoryassignment');
            //                                         allocated_qty = Number(allocated_qty) - Number(quantityavailable);
            //                                     }
            //                                 } else {
            //                                     break;
            //                                 }
            //                             }
            //                         }
            //                     } else {
            //                         // if_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'itemreceive', value: false });
            //                     }
            //                 }
            //                 if_data.commitLine(sublist_id);
            //             }
            //         }
            //         var if_data_id = if_data.save({ ignoreMandatoryFields: true });
            //         if (if_data_id) {
            //             if_ids.push(if_data_id);
            //             log.debug('success', '转移单货品履行生成成功');
            //             //生成货品收据
            //             var ir_data = record.transform({
            //                 fromType: record.Type.TRANSFER_ORDER,
            //                 fromId: to_id,
            //                 toType: record.Type.ITEM_RECEIPT,
            //                 isDynamic: true
            //             });
            //             ir_data.setValue('custbody_swc_main_num', line_info[k].main_num);
            //             ir_data.setValue('custbody_swc_main_detail_num', line_info[k].out_detail_num);
            //             var ir_line_count = ir_data.getLineCount(sublist_id);
            //             var ir_currency = ir_data.getValue('currency')
            //             if (ir_line_count > 0) {
            //                 for (var i = ir_line_count - 1; i >= 0; i--) {
            //                     var line_num = ir_data.getSublistValue({ sublistId: sublist_id, fieldId: 'custcol_swc_line_no', line: i });
            //                     ir_data.selectLine(sublist_id, i);
            //                     for (var j in detail_line) {
            //                         if (j == line_num) {
            //                             ir_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'quantity', value: detail_line[j] });
            //                             var fee_arr = convertAndMergeFees(line_info[k].item_fees, ir_currency);
            //                             var allocated_qty = detail_line[j];
            //                             if (fee_arr.length > 0) {
            //                                 var landed_cost = ir_data.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'landedcost' });
            //                                 for (var l = 0; l < fee_arr.length; l++) {
            //                                     landed_cost.selectNewLine({ sublistId: 'landedcostdata' });
            //                                     landed_cost.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: fee_arr[l].category });
            //                                     landed_cost.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'amount', value: fee_arr[l].fee });
            //                                     landed_cost.commitLine({ sublistId: 'landedcostdata' });
            //                                 }
            //                             }
            //                         } else {
            //                             // ir_data.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'itemreceive', value: false });
            //                         }
            //                     }
            //                     ir_data.commitLine(sublist_id);
            //                 }
            //             }

            //             var ir_data_id = ir_data.save({ ignoreMandatoryFields: true });
            //             if (ir_data_id) {
            //                 ir_ids.push(ir_data_id);
            //                 log.debug('success', '转移单货品收据生成成功');
            //             }
            //         }
            //     }
            //     var update_info = {};
            //     //将分摊明细关联到对应的TO单中
            //     for (var i in batch_allocations_info) {
            //         update_info[i] = Number(update_info[i] || 0) + Number(batch_allocations_info[i].quantity);
            //         var allocation_qty_record_data = record.create({ type: 'customrecord_swc_allocation_qty_record', isDynamic: true });
            //         allocation_qty_record_data.setValue('custrecord_swc_correlation_order', to_id);
            //         allocation_qty_record_data.setValue('custrecord_swc_outbound_list_id', i);
            //         allocation_qty_record_data.setValue('custrecord_swc_main_num', batch_allocations_info[i].main_num);
            //         allocation_qty_record_data.setValue('custrecord_swc_detail_num', batch_allocations_info[i].out_detail_num);
            //         allocation_qty_record_data.setValue('custrecord_swc_correlation_sku', batch_allocations_info[i].item);
            //         allocation_qty_record_data.setValue('custrecord_swc_list_qty', batch_allocations_info[i].oldQty);
            //         allocation_qty_record_data.setValue('custrecord_swc_to_qty', batch_allocations_info[i].toQty);
            //         allocation_qty_record_data.setValue('custrecord_swc_apportioned_qty', batch_allocations_info[i].quantity);
            //         var allocation_qty_record_data_id = allocation_qty_record_data.save({ ignoreMandatoryFields: true });
            //         if (allocation_qty_record_data_id) {
            //             log.debug('success', '分摊明细关联成功');
            //         }
            //     }
            //     //将已分摊的数量汇总更新出库报告已分配数量
            //     for (var i in update_info) {
            //         var in_info_data = record.load({ type: 'customrecord_swc_platform_loc_out_info', id: i, isDynamic: true });
            //         var in_allocated_qty = in_info_data.getValue('custrecord_swc_out_allocated_qty') || 0;
            //         var need_allocated_qty = Number(update_info[i]) + Number(in_allocated_qty);
            //         in_info_data.setValue('custrecord_swc_out_allocated_qty', need_allocated_qty);
            //         var in_info_data_id = in_info_data.save({ ignoreMandatoryFields: true });
            //         if (in_info_data_id) {
            //             log.debug('success', '出库报告已分配数量已更新');
            //         }
            //     }
            // } else {
            //     log.debug('error', '不存在分摊明细');
            // }
        } catch (e) {
            log.debug('e', e);
            if (ir_ids.length > 0) {
                for (var i in ir_ids) {
                    record.delete({ type: 'itemreceipt', id: ir_ids[i] });
                };
            }
            if (if_ids.length > 0) {
                for (var i in if_ids) {
                    record.delete({ type: 'itemfulfillment', id: if_ids[i] });
                };
            }
        }
    }

    /**
     * 计算交叉汇率
     * @param {Object} ratesMap - 币别到基础币别汇率的映射
     * @param {string} sourceCurrency - 源币别
     * @param {string} targetCurrency - 目标币别
     * @returns {number} 交叉汇率
     */
    function calculateCrossRate(ratesMap, sourceCurrency, targetCurrency) {
        try {
            // 如果币别相同，汇率为1
            if (sourceCurrency === targetCurrency) {
                return 1;
            }

            // 获取源币别和目标币别的汇率
            var sourceRate = ratesMap[sourceCurrency] || 1;
            var targetRate = ratesMap[targetCurrency] || 1;

            // 计算交叉汇率：目标币别/源币别
            if (sourceRate > 0) {
                return targetRate / sourceRate;
            } else {
                log.debug('源币别汇率无效: ' + sourceCurrency + ' = ' + sourceRate);
                return 1;
            }

        } catch (e) {
            log.error('计算交叉汇率失败', e.toString());
            return 1;
        }
    }

    /**
     * 转换费用到目标币别并合并
     * @param {Array} fees - 原始费用数组
     * @param {string} targetCurrency - 目标币别代码
     * @returns {Array} 转换并合并后的费用数组
     */
    function convertAndMergeFees(fees, targetCurrency) {
        try {
            log.debug('开始转换费用', {
                '费用数量': fees.length,
                '目标币别': targetCurrency
            });

            // 第一步：收集所有需要查询的币别
            var allCurrencies = []; // 包含目标币别

            for (var i = 0; i < fees.length; i++) {
                var currency = fees[i].currency;
                if (currency && allCurrencies.indexOf(currency) === -1) {
                    allCurrencies.push(currency);
                }
            }

            log.debug('需要查询的币别列表', allCurrencies);

            // 第二步：批量获取所有币别的汇率
            var ratesMap = getExchangeRatesByDate(allCurrencies, targetCurrency);

            // 第三步：转换和合并费用
            var mergedFees = {};

            for (var i = 0; i < fees.length; i++) {
                var fee = fees[i];
                var sourceCurrency = fee.currency;
                var amount = parseFloat(fee.fee);
                var category = fee.category;

                // 计算交叉汇率
                var exchangeRate = ratesMap[sourceCurrency];

                // 转换金额
                var convertedAmount = amount * exchangeRate;
                log.debug('费用转换详情1', {
                    '序号': i + 1,
                    '原始金额': amount,
                    '源币别': sourceCurrency,
                    '目标币别': targetCurrency,
                    '汇率': exchangeRate,
                    '转换后金额': convertedAmount,
                    '费用类型': fee.type_z,
                    '分类': category
                });

                log.debug('费用转换详情', {
                    '序号': i + 1,
                    '原始金额': amount,
                    '源币别': sourceCurrency,
                    '目标币别': targetCurrency,
                    '汇率': exchangeRate.toFixed(4),
                    '转换后金额': convertedAmount.toFixed(2),
                    '费用类型': fee.type_z,
                    '分类': category
                });

                // 按category合并
                if (!mergedFees[category]) {
                    // 创建新的费用对象
                    mergedFees[category] = {
                        fee: convertedAmount,
                        currency: targetCurrency,
                        type_z: fee.type_z,
                        category: category,
                        originalFees: [fee] // 保存原始费用信息
                    };
                } else {
                    // 累加金额
                    mergedFees[category].fee += convertedAmount;

                    // 添加原始费用信息
                    mergedFees[category].originalFees.push(fee);

                    // 如果type_z不同，记录警告
                    if (mergedFees[category].type_z !== fee.type_z) {
                        log.debug('同一分类下有不同费用类型', {
                            '分类': category,
                            '已有类型': mergedFees[category].type_z,
                            '新类型': fee.type_z
                        });
                        // 保留第一个遇到的type_z
                    }
                }
            }

            // 第四步：转换为数组并格式化
            var result = [];
            for (var category in mergedFees) {
                if (mergedFees.hasOwnProperty(category)) {
                    var mergedFee = mergedFees[category];

                    // 创建结果对象
                    var resultFee = {
                        fee: mergedFee.fee.toFixed(2), // 保留两位小数
                        currency: mergedFee.currency,
                        type_z: mergedFee.type_z,
                        category: mergedFee.category
                    };

                    // 可选：添加原始费用数量信息
                    resultFee.originalFeeCount = mergedFee.originalFees.length;

                    result.push(resultFee);
                }
            }
            log.debug('转换合并完成', {
                '原始费用数量': fees.length,
                '合并后费用数量': result.length,
                '结果': JSON.stringify(result, null, 2)
            });

            return result;

        } catch (e) {
            log.error('转换合并费用失败', e.toString());
            throw e;
        }
    }

    /**
     * 使用高级汇率查询（按日期）
     * @param {Array} currencySymbols - 币别符号数组
     * @param {string} date - 汇率日期（可选）
     * @returns {Object} 汇率映射
     */
    function getExchangeRatesByDate(currencySymbols, targetCurrency, date) {
        try {
            if (!currencySymbols || currencySymbols.length === 0) {
                return {};
            }

            var uniqueSymbols = Array.from(new Set(currencySymbols));
            var ratesMap = {};

            // 如果没有指定日期，使用当前日期
            var effectiveDate = date || new Date();

            log.debug('按日期查询汇率', {
                '币别数量': uniqueSymbols.length,
                '日期': effectiveDate,
                '币别列表': uniqueSymbols.join(', ')
            });

            for (let i = 0; i < uniqueSymbols.length; i++) {
                var rate = currency.exchangeRate({
                    source: uniqueSymbols[i],
                    target: targetCurrency,
                    date: effectiveDate
                });
                ratesMap[uniqueSymbols[i]] = rate;
            }

            return ratesMap;

        } catch (e) {
            log.error('按日期查询汇率失败', e.toString());
            return {};
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
