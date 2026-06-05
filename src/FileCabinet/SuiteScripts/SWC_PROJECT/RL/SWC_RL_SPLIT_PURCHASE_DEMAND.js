/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *@description 拆分订单采购汇总表
 */
define(['N/error', 'N/record', 'N/search', 'N/runtime', '../common/moment'], function (error, record, search, runtime, moment) {

    function _get(context) {

    }

    function _post(context) {
        var result = { code: 200, message: 'success', pageCount: 0, totalCount: 0, data: [] };
        try {
            log.audit('Body', context);
            var requestBody = getBody(context);



            // var regionAllocated = 0;
            // var regions = [23, 34, 21, 0, 0];
            // var newRegions = [];
            // var newSum = 33;
            // var sum = 78;
            // return splitRegions(requestBody.regions, requestBody.newSum, requestBody.sum)

            var headRecord = record.load({ type: 'customrecord_swc_purchase_plan', id: requestBody.id });
            var headId = requestBody.id;

            // 假设汇总表"总数量"字段ID为"custrecord_swc_pd_quantity"，拆分数量输入字段为"custrecord_split_qty"
            var headQty = headRecord.getValue('custrecord_swc_pd_quantity');
            var splitQty = requestBody.quantity;

            // 校验拆分数量
            if (!splitQty || splitQty <= 0) {
                return;
            }
            if (splitQty >= headQty) {
                log.error({
                    title: '拆分数量错误',
                    details: '拆分数量必须小于总数量'
                });
                return;
            }
            // 搜索关联的明细记录
            var detailSearch = search.create({
                type: 'customrecord_swc_purchase_plan_detail', // 明细表自定义记录类型
                filters: [['custrecord_swc_ppd_purchase_plan', 'anyof', headId]], // 关联汇总表ID的字段
                columns: [
                    { name: 'internalid' },
                    { name: 'custrecord_swc_ppd_demand_plan' },
                    { name: 'custrecord_swc_ppd_batch' },
                    { name: 'custrecord_swc_ppd_location_type' },
                    { name: 'custrecord_swc_ppd_country' },
                    { name: 'custrecord_swc_ppd_sku' },
                    { name: 'custrecord_swc_ppd_store' },
                    { name: 'custrecord_swc_ppd_quantity' },
                    { name: 'custrecord_swc_ppd_date' },
                    { name: 'custrecord_swc_ppd_salesman' },
                    { name: 'custrecord_swc_ppd_first_receipt_time' },
                    { name: 'custrecord_swc_ppd_new_old' },
                    { name: 'custrecord_swc_ppd_sku_level' },
                    { name: 'custrecord_swc_ppd_inventory_status' },
                    { name: 'custrecord_swc_ppd_quantity' }, // 需求数量
                    { name: 'custrecord_swc_ppd_us_west' },   // 区域A
                    { name: 'custrecord_swc_ppd_us_east' },   // 区域B
                    { name: 'custrecord_swc_ppd_us_center' },   // 区域C
                    { name: 'custrecord_swc_ppd_us_east_south' },   // 区域D
                    { name: 'custrecord_swc_ppd_us_west_south' },    // 区域E
                    { name: 'custrecord_swc_ppd_ca_east' },    // 区域f
                    { name: 'custrecord_swc_ppd_ca_west' }    // 区域G
                ]
            });

            var detailResults = detailSearch.run().getRange({ start: 0, end: 1000 });
            if (detailResults.length === 0) {
                return; // 无明细记录时退出
            }

            // 计算总需求数量（应与headQty一致）
            var totalOriginalSum = 0;
            var details = [];
            detailResults.forEach(function (result) {
                var sum = parseFloat(result.getValue('custrecord_swc_ppd_quantity')) || 0;
                totalOriginalSum += sum;
                details.push({
                    id: result.id,
                    demand_plan: result.getValue('custrecord_swc_ppd_demand_plan'),
                    batch: result.getValue('custrecord_swc_ppd_batch'),
                    location_type: result.getValue('custrecord_swc_ppd_location_type'),
                    country: result.getValue('custrecord_swc_ppd_country'),
                    sku: result.getValue('custrecord_swc_ppd_sku'),
                    store: result.getValue('custrecord_swc_ppd_store'),
                    date: result.getValue('custrecord_swc_ppd_date'),
                    salesman: result.getValue('custrecord_swc_ppd_salesman'),
                    receipt_time: result.getValue('custrecord_swc_ppd_first_receipt_time'),
                    new_old: result.getValue('custrecord_swc_ppd_new_old'),
                    sku_level: result.getValue('custrecord_swc_ppd_sku_level'),
                    inventory_status: result.getValue('custrecord_swc_ppd_inventory_status'),
                    sum: sum,
                    a: parseFloat(result.getValue('custrecord_swc_ppd_us_west')) || 0,
                    b: parseFloat(result.getValue('custrecord_swc_ppd_us_east')) || 0,
                    c: parseFloat(result.getValue('custrecord_swc_ppd_us_center')) || 0,
                    d: parseFloat(result.getValue('custrecord_swc_ppd_us_east_south')) || 0,
                    e: parseFloat(result.getValue('custrecord_swc_ppd_us_west_south')) || 0,
                    f: parseFloat(result.getValue('custrecord_swc_ppd_ca_east')) || 0,
                    g: parseFloat(result.getValue('custrecord_swc_ppd_ca_west')) || 0
                });
            });

            log.debug('details', details)

            // 计算实际拆分比例（基于明细需求数量之和）
            var ratio = splitQty / totalOriginalSum;
            var newDetails = [];
            var allocatedSum = 0; // 已分配的拆分数量

            //先分好数组
            var tempArray = [];
            for (var i = 0; i < details.length; i++) {
                tempArray.push(details[i].sum)
            }
            var splitData = splitRegions(tempArray, splitQty, totalOriginalSum);
            log.debug('splitData', splitData)

            // 处理每条明细
            for (var i = 0; i < details.length; i++) {
                var det = details[i];
                var newSum = splitData[i];
                // if (i < details.length - 1) {
                //     // 前N-1条明细：向下取整以确保不超额[7](@ref)
                //     newSum = Math.floor(det.sum * ratio);
                // } else {
                //     // 最后一条明细：用减法处理尾差
                //     newSum = splitQty - allocatedSum;
                // }
                // allocatedSum += newSum;

                // 处理五个区域数量的拆分
                var regionAllocated = 0;
                var regions = [det.a, det.b, det.c, det.d, det.e];
                var newRegions = [];
                if (det.location_type == '1' && det.country == '1') {//US-3PL的才需要分区
                    newRegions = splitRegions(regions, newSum, det.sum);
                    newDetails.push({
                        id: det.id,
                        origin: det,
                        newSum: newSum,
                        newA: newRegions[0] || 0,
                        newB: newRegions[1] || 0,
                        newC: newRegions[2] || 0,
                        newD: newRegions[3] || 0,
                        newE: newRegions[4] || 0,
                        newF: 0,
                        newG: 0
                    });
                } else if (det.location_type == '1' && det.country == '2') {//CA-3PL的需要拆分成加东加西
                    regions = [det.f, det.g];
                    newRegions = splitRegions(regions, newSum, det.sum);
                    newDetails.push({
                        id: det.id,
                        origin: det,
                        newSum: newSum,
                        newA: 0,
                        newB: 0,
                        newC: 0,
                        newD: 0,
                        newE: 0,
                        newF: newRegions[0] || 0,
                        newG: newRegions[1] || 0
                    });
                } else {
                    newDetails.push({
                        id: det.id,
                        origin: det,
                        newSum: newSum,
                        newA: 0,
                        newB: 0,
                        newC: 0,
                        newD: 0,
                        newE: 0,
                        newF: 0,
                        newG: 0
                    });
                }
            }
            log.debug('newDetails', newDetails)
            // // 更新原汇总表的总数量
            // record.submitFields({
            //     type: 'customrecord_swc_purchase_plan', // 汇总表自定义记录类型
            //     id: headId,
            //     values: { 'custrecord_swc_pd_quantity': headQty - splitQty }
            // });
            //更新原单
            var originHead = record.load({ type: 'customrecord_swc_purchase_plan', id: headId })
            originHead.setValue('custrecord_swc_pd_quantity', headQty - splitQty);

            // 创建新汇总表
            var newHead = record.create({
                type: 'customrecord_swc_purchase_plan',
                isDynamic: false
            });
            newHead.setValue('custrecord_swc_pd_quantity', splitQty);
            newHead.setValue('custrecord_swc_pd_date', headRecord.getValue('custrecord_swc_pd_date'));
            // var newHeadId = newHead.save();

            //原记录表头分区数量
            var totalQty = 0, west_qty = 0, east_qty = 0, center_qty = 0, southwest_qty = 0, southeast_qty = 0, ca_west_qty = 0, ca_east_qty = 0;
            //新记录表头分区数量
            var _totalQty = 0, _west_qty = 0, _east_qty = 0, _center_qty = 0, _southwest_qty = 0, _southeast_qty = 0, _ca_west_qty = 0, _ca_east_qty = 0;
            var lineNum = 0;

            // 更新原明细并创建新明细
            newDetails.forEach(function (det) {
                // 更新原明细数量（减少）
                var originalDetail = det.origin
                var originalSum = originalDetail.sum;
                west_qty = Number(west_qty) + Number((originalDetail.a - det.newA) || 0)
                east_qty = Number(east_qty) + Number((originalDetail.b - det.newB) || 0)
                center_qty = Number(center_qty) + Number((originalDetail.c - det.newC) || 0)
                southwest_qty = Number(southwest_qty) + Number((originalDetail.d - det.newD) || 0)
                southeast_qty = Number(southeast_qty) + Number((originalDetail.e - det.newE) || 0)
                ca_east_qty = Number(ca_east_qty) + Number((originalDetail.f - det.newF) || 0)
                ca_west_qty = Number(ca_west_qty) + Number((originalDetail.g - det.newG) || 0)
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_demand_plan', value: originalDetail.demand_plan, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_batch', value: originalDetail.batch, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_location_type', value: originalDetail.location_type, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_country', value: originalDetail.country, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_sku', value: originalDetail.sku, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_store', value: originalDetail.store, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_quantity', value: originalSum - det.newSum, line: lineNum });
                originHead.setSublistText({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_date', text: originalDetail.date, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_salesman', value: originalDetail.salesman, line: lineNum });
                // originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_sku_yjlm', value: rec.getValue('custrecord_swc_dp_location_type'), line: lineNum });
                originHead.setSublistText({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_first_receipt_time', text: originalDetail.receipt_time, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_new_old', value: originalDetail.new_old, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_sku_type', value: originalDetail.sku_type, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_sku_level', value: originalDetail.sku_level, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_inventory_status', value: originalDetail.inventory_status, line: lineNum });
                // originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_shipping_priority', value: originalDetail.batch,rec.getValue('custrecord_swc_pp_shipping_priority'), line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_west', value: originalDetail.a - det.newA, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_east', value: originalDetail.b - det.newB, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_center', value: originalDetail.c - det.newC, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_east_south', value: originalDetail.d - det.newD, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_west_south', value: originalDetail.e - det.newE, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_ca_east', value: originalDetail.f - det.newF, line: lineNum });
                originHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_ca_west', value: originalDetail.g - det.newG, line: lineNum });


                _west_qty = Number(_west_qty) + Number(det.newA || 0)
                _east_qty = Number(_east_qty) + Number(det.newB || 0)
                _center_qty = Number(_center_qty) + Number(det.newC || 0)
                _southwest_qty = Number(_southwest_qty) + Number(det.newD || 0)
                _southeast_qty = Number(_southeast_qty) + Number(det.newE || 0)
                _ca_east_qty = Number(_ca_east_qty) + Number(det.newF || 0)
                _ca_west_qty = Number(_ca_west_qty) + Number(det.newG || 0)
                // 创建新明细记录并关联到新汇总表
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_demand_plan', value: originalDetail.demand_plan, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_batch', value: originalDetail.batch, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_location_type', value: originalDetail.location_type, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_country', value: originalDetail.country, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_sku', value: originalDetail.sku, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_store', value: originalDetail.store, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_quantity', value: det.newSum, line: lineNum });
                newHead.setSublistText({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_date', text: originalDetail.date, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_salesman', value: originalDetail.salesman, line: lineNum });
                // newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_sku_yjlm', value: rec.getValue('custrecord_swc_dp_location_type'), line: lineNum });
                newHead.setSublistText({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_first_receipt_time', text: originalDetail.receipt_time, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_new_old', value: originalDetail.new_old, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_sku_type', value: originalDetail.sku_type, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_sku_level', value: originalDetail.sku_level, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_inventory_status', value: originalDetail.inventory_status, line: lineNum });
                // newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_shipping_priority', value: originalDetail.batch,rec.getValue('custrecord_swc_pp_shipping_priority'), line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_west', value: det.newA, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_east', value: det.newB, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_center', value: det.newC, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_east_south', value: det.newD, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_us_west_south', value: det.newE, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_ca_east', value: det.newF, line: lineNum });
                newHead.setSublistValue({ sublistId: 'recmachcustrecord_swc_ppd_purchase_plan', fieldId: 'custrecord_swc_ppd_ca_west', value: det.newG, line: lineNum });
                lineNum++;
            });

            //修改原采购汇总表头的分区数量
            originHead.setValue({ fieldId: 'custrecord_swc_pd_us_west', value: west_qty })
            originHead.setValue({ fieldId: 'custrecord_swc_pd_us_east', value: east_qty })
            originHead.setValue({ fieldId: 'custrecord_swc_pd_us_center', value: center_qty })
            originHead.setValue({ fieldId: 'custrecord_swc_pd_us_east_south', value: southeast_qty })
            originHead.setValue({ fieldId: 'custrecord_swc_pd_us_west_south', value: southwest_qty })
            originHead.setValue({ fieldId: 'custrecord_swc_pd_ca_east', value: ca_east_qty })
            originHead.setValue({ fieldId: 'custrecord_swc_pd_ca_west', value: ca_west_qty })
            var originHeadId = originHead.save();

            if (requestBody.vendor) {//如果是装配件，并且配置了默认供应商，搜索默认BOM
                search.create({
                    type: 'bom',
                    filters: [
                        { name: 'custrecord_swc_bom_vendor', operator: search.Operator.IS, values: requestBody.vendor },
                        { name: 'assembly', join: 'assemblyitem', operator: search.Operator.IS, values: originHead.getValue('custrecord_swc_pd_sku') }
                    ],
                    columns: [
                        { name: 'internalid' }
                    ]
                }).run().each(function (bom_rec) {
                    log.debug('备货汇总供应商BOM', bom_rec)
                    newHead.setValue({ fieldId: 'custrecord_swc_pd_bom', value: bom_rec.id })
                    return false;
                })
            }

            newHead.setValue({ fieldId: 'custrecord_swc_pd_vendor', value: requestBody.vendor })
            newHead.setValue({ fieldId: 'custrecord_swc_pd_batch', value: originHead.getValue('custrecord_swc_pd_batch') })
            newHead.setValue({ fieldId: 'custrecord_swc_pd_first_receipt_time', value: originHead.getValue('custrecord_swc_pd_first_receipt_time') })
            newHead.setValue({ fieldId: 'custrecord_swc_pd_new_old', value: originHead.getValue('custrecord_swc_pd_new_old') })
            newHead.setValue({ fieldId: 'custrecord_swc_pd_sku_type', value: originHead.getValue('custrecord_swc_pd_sku_type') })
            newHead.setValue({ fieldId: 'custrecord_swc_pd_sku_level', value: originHead.getValue('custrecord_swc_pd_sku_level') })
            newHead.setValue({ fieldId: 'custrecord_swc_pd_inventory_status', value: originHead.getValue('custrecord_swc_pd_inventory_status') })
            newHead.setValue({ fieldId: 'custrecord_swc_pd_sku', value: originHead.getValue('custrecord_swc_pd_sku') })
            // newHead.setValue({ fieldId: 'custrecord_swc_pd_date', value: originHead.getValue('custrecord_swc_pd_date') })
            // newHead.setValue({ fieldId: 'custrecord_swc_pd_shipping_priority', value: vendor })
            newHead.setValue({ fieldId: 'custrecord_swc_pd_us_west', value: _west_qty })
            newHead.setValue({ fieldId: 'custrecord_swc_pd_us_east', value: _east_qty })
            newHead.setValue({ fieldId: 'custrecord_swc_pd_us_center', value: _center_qty })
            newHead.setValue({ fieldId: 'custrecord_swc_pd_us_east_south', value: _southeast_qty })
            newHead.setValue({ fieldId: 'custrecord_swc_pd_us_west_south', value: _southwest_qty })
            newHead.setValue({ fieldId: 'custrecord_swc_pd_ca_east', value: _ca_east_qty })
            newHead.setValue({ fieldId: 'custrecord_swc_pd_ca_west', value: _ca_west_qty })
            var newHeadId = newHead.save();

            log.audit({
                title: '拆分完成',
                details: '已成功拆分汇总表及明细记录。新汇总表ID: ' + newHeadId
            });


        } catch (e) {
            log.error("错误信息：", { err: e.message, requestBody });
            if (e?.name && +e.name) {
                result.code = +e.name;
                result.message = e.message;
                result.data = e.data;
            } else {
                result.code = 500;
                result.message = "请求异常,错误信息:" + e;
            }
        }
        return JSON.stringify(result);
    }

    function splitRegions(regions, newSum, totalRegion) {

        // 计算每个区域按比例拆分的基础值
        var baseValues = [];
        var regionSum = 0;
        for (var j = 0; j < regions.length; j++) {
            // 如果该区域的原始数量为0，则基础值为0，不参与尾差分配
            if (regions[j] === 0) {
                baseValues[j] = 0;
            } else {
                // 按比例计算，向下取整
                baseValues[j] = Math.floor(regions[j] * (newSum / totalRegion));
            }
            regionSum += baseValues[j];
        }

        var diff = newSum - regionSum; // 尾差

        // 创建一个数组，包含所有非零区域的索引，并按照小数部分从大到小排序
        var indices = [];
        for (var j = 0; j < regions.length; j++) {
            if (regions[j] !== 0) {
                indices.push(j);
            }
        }

        // 计算每个区域比例的小数部分
        var decimals = [];
        for (var j = 0; j < indices.length; j++) {
            var idx = indices[j];
            decimals.push(regions[idx] * (newSum / totalRegion) - baseValues[idx]);
        }

        // 按照小数部分从大到小排序索引数组（仅非零区域）
        for (var j = 0; j < indices.length - 1; j++) {
            for (var k = j + 1; k < indices.length; k++) {
                if (decimals[j] < decimals[k]) {
                    var temp = indices[j];
                    indices[j] = indices[k];
                    indices[k] = temp;
                    var tempDec = decimals[j];
                    decimals[j] = decimals[k];
                    decimals[k] = tempDec;
                }
            }
        }

        // 将尾差分配给前diff个区域（每个区域加1）
        for (var j = 0; j < diff; j++) {
            var idx = indices[j];
            baseValues[idx] += 1;
        }

        // 现在baseValues数组就是拆分后五个区域的数量
        var newA = baseValues[0];
        var newB = baseValues[1];
        var newC = baseValues[2];
        var newD = baseValues[3];
        var newE = baseValues[4];
        // 然后，将newA, newB, newC, newD, newE存储起来。
        return baseValues
        return [newA, newB, newC, newD, newE]


    }

    function getCurrencyId(currency_text) {
        var currency_id;
        if (currency_text) {
            search.create({
                type: 'currency',
                filters: [
                    { name: 'symbol', operator: 'is', values: currency_text }
                ]
            }).run().each(function (e) {
                currency_id = e.id;
                return false;
            })
        }
        return currency_id;
    }

    /**
     * 获取 请求body
     * @param {string|Object} requestBody 请求body
     * @returns {Object}
     */
    function getBody(requestBody) {
        try {
            requestBody = typeof (requestBody) == "string" ? JSON.parse(requestBody) : requestBody;
        } catch (e) {
            throw error.create({ name: "400", message: "requestBody参数错误: " + requestBody, notifyOff: true });
        }
        return requestBody;
    }

    function _put(context) {

    }

    function _delete(context) {

    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
