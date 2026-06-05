/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_WAREHOUSE_FEE_IA.js
 *@description 库存调整仓租费计算（废弃，与货品履行计算逻辑合并）
 */
define(['../common/interface', '../common/moment', 'N/runtime', 'N/record', 'N/search', 'N/format', 'N/error'],
    function (interface, moment, runtime, record, search, format, error) {

        function getInputData() {
            return
            var id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_ia_wf_id' });
            var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_ia_wf_start_date' });
            var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_ia_wf_end_date' });

            if (start_date) {
                start_date = format.format({ value: start_date, type: 'date' })
            }

            if (end_date) {
                end_date = format.format({ value: end_date, type: 'date' })
            }

            var data = [];
            var limit = 200;
            var filters = [
                { name: 'mainline', operator: 'is', values: true },
                { name: 'custbody_swc_calculate_warehouse_fee', operator: 'is', values: false },
                // { name: 'type', join: 'createdfrom', operator: 'anyof', values: ['SalesOrd'] },
                // { name: 'intercostatus', join: 'createdfrom', operator: 'anyof', values: ['@NONE@'] },
            ]
            if (id) {
                filters.push({ name: 'internalid', operator: 'is', values: id })
            } else {
                if (end_date && start_date) {
                    filters.push({ name: 'trandate', operator: 'within', values: [start_date, end_date] })
                } else {
                    filters.push({ name: 'trandate', operator: 'onorbefore', values: 'twodaysago' })
                }
            }
            log.audit('filters', filters)
            search.create({
                type: 'inventoryadjustment',
                filters: filters,
                columns: [
                    { name: 'trandate', sort: 'ASC' }
                ]
            }).run().each(function (rec) {
                data.push(rec.id);
                return --limit > 0;
            });
            if (data.length) {
                data = [...new Set(data)];
            }
            log.audit('data length', data.length);
            return data;
        }

        function map(context) {
            try {
                var ia_id = JSON.parse(context.value);
                log.audit('ia_id', ia_id);
                var ef_type = '调整';
                var ia_info = [];
                var rec = record.load({ type: 'inventoryadjustment', id: ia_id });

                const line = rec.getLineCount({ sublistId: 'inventory' });
                for (var i = 0; i < line; i++) {
                    var item = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'item', line: i });
                    var location = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'location', line: i });
                    var quantity = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'quantity', line: i });
                    var line_no = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'line', line: i });
                    var warehouse_fee = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'custcol_swc_warehouse_fee', line: i }) || 0;
                    var inventorydetailavail = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'inventorydetailavail', line: i });
                    var inventorydetailreq = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'inventorydetailreq', line: i });
                    if (inventorydetailavail == 'T' && inventorydetailreq == 'T') {
                        var id_subrec = rec.getSublistSubrecord({ sublistId: 'inventory', fieldId: 'inventorydetail', line: i });
                        for (var j = 0; j < id_subrec.getLineCount({ sublistId: 'inventoryassignment' }); j++) {
                            var sn_quantity = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j });
                            var sn_id = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'numberedrecordid', line: j });
                            if (Number(sn_quantity) < 0) {
                                ia_info.push({
                                    item_id: item,
                                    location: location,
                                    quantity: quantity,
                                    trandate: rec.getValue('trandate'),
                                    line_no: line_no,
                                    sn_id: sn_id,
                                    sn_quantity: Math.abs(sn_quantity),
                                    serialnumber: '',
                                    warehouse_fee: warehouse_fee,
                                });
                            }
                        }
                    }
                }
                log.audit('ia_info1', ia_info);
                if (ia_info.length == 0) {
                    rec.setValue({ fieldId: 'custbody_swc_calculate_warehouse_fee', value: true });
                    rec.setValue({ fieldId: 'custbody_swc_warehouse_fee_total', value: 0 });
                    rec.save({ ignoreMandatoryFields: true });
                    return
                }
                var in_filters = [], sn_numbers = [];
                for (let i = 0; i < ia_info.length; i++) {
                    if (in_filters.length) {
                        in_filters.push('or', ['internalid', 'anyof', ia_info[i].sn_id])
                    } else {
                        in_filters.push(['internalid', 'anyof', ia_info[i].sn_id])
                    }
                }
                search.create({
                    type: 'inventorynumber',
                    filters: in_filters,
                    columns: [
                        { name: 'internalid', summary: 'GROUP' },
                        { name: 'inventorynumber', summary: 'GROUP' },
                    ]
                }).run().each(function (e) {
                    sn_numbers.push({
                        id: e.getValue(e.columns[0]),
                        number: e.getValue(e.columns[1]),
                    })
                    return true
                })
                log.audit('sn_numbers', sn_numbers);

                for (let i = 0; i < ia_info.length; i++) {
                    for (let j = 0; j < sn_numbers.length; j++) {
                        if (ia_info[i].sn_id == sn_numbers[j].id) {
                            ia_info[i].serialnumber = sn_numbers[j].number;
                        }
                    }
                }
                log.audit('ia_info2', ia_info);
                var ewf = GetEstimateWarehouseFee(ia_info);
                var currency = '';
                for (let i = 0; i < ia_info.length; i++) {
                    for (let j = 0; j < ewf.length; j++) {
                        if (ia_info[i].item_id == ewf[j].sku_id && ia_info[i].location == ewf[j].warehouse_id && ia_info[i].serialnumber == ewf[j].lot_number) {
                            ia_info[i].avg_rate = ewf[j].avg_rate;
                            currency = ewf[j].currency;
                            let total_qty = interface.accSub(ewf[j].quantity, ia_info[i].sn_quantity);
                            log.audit('total_qty', total_qty);
                            if (Number(total_qty) == 0) {
                                ia_info[i].warehouse_fee = ewf[j].amount;
                            } else {
                                ia_info[i].warehouse_fee = interface.accMul(interface.accMul(ia_info[i].sn_quantity, ewf[j].avg_rate), ewf[j].date_count);
                            }
                        }
                    }
                }
                log.audit('ia_info3', ia_info);
                const result = calculateWarehouseFeeByLineNo(ia_info);
                log.audit('result', result);
                var warehouse_fee_total = 0;
                for (let i = 0; i < line; i++) {
                    var line_no = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'line', line: i });
                    log.audit('warehouse_fee_amount', result[line_no]);
                    warehouse_fee_total = interface.accAdd(warehouse_fee_total, Number(result[line_no] || 0).toFixed(2));
                    rec.setSublistValue({ sublistId: 'inventory', fieldId: 'custcol_swc_warehouse_fee', value: Number(result[line_no]).toFixed(2), line: i });
                }

                rec.setValue({ fieldId: 'custbody_swc_calculate_warehouse_fee', value: true });
                rec.setValue({ fieldId: 'custbody_swc_warehouse_fee_total', value: warehouse_fee_total || 0 });
                rec.setValue({ fieldId: 'custbody_swc_warehouse_fee_currency', value: currency });
                rec.save({ ignoreMandatoryFields: true });

                var location_info = interface.GetLocationInfo('', ia_info[0].location);
                // var sbResult = search.lookupFields({ type: 'subsidiary', id: location_info.subsidiary, columns: ['currency'] });
                // log.audit('sbResult', sbResult);
                // if (sbResult['currency'].length) {
                //     currency = sbResult['currency'][0].value;
                // }
                for (let i = 0; i < ia_info.length; i++) {
                    // context.write({
                    //     key: so_id + '.' + if_id + '.' + ia_info[i].line_no + '.' + ia_info[i].sn_id,
                    //     value: {
                    //         'so_id': so_id,
                    //         'if_id': if_id,
                    //         'ia_info': ia_info[i]
                    //     }
                    // });
                    var rec = record.create({ type: 'customrecord_swc_ewh_fee_day', isDynamic: false });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_subsidiary', value: location_info.subsidiary });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_warehouse', value: ia_info[i].location });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_currency', value: currency });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_lot', value: ia_info[i].serialnumber });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_date', value: format.parse({ value: ia_info[i].trandate, type: 'date' }) });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_quantity', value: -ia_info[i].sn_quantity });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_fee', value: -Number(ia_info[i].warehouse_fee || 0).toFixed(2) });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_sku', value: ia_info[i].item_id });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_ia', value: ia_id });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_type', value: ef_type });
                    var id = rec.save({ ignoreMandatoryFields: true });
                    log.audit('id', id);
                }

            } catch (err) {
                log.debug('map error', err)
            }
        }

        function reduce(context) {
            // log.audit('reduce key', context.key);
            // var v = context.values
            // v.map(function (obj) {
            //     try {
            //         obj = JSON.parse(obj);
            //         log.debug('obj', obj);
            //         var so_id = obj.so_id;
            //         var if_id = obj.if_id;
            //         var ia_info = obj.ia_info;

            //         var location_info = interface.GetLocationInfo('', ia_info.location);
            //         var sbResult = search.lookupFields({ type: 'subsidiary', id: location_info.subsidiary, columns: ['currency'] });
            //         log.audit('sbResult', sbResult);
            //         var currency = '';
            //         if (sbResult['currency'].length) {
            //             currency = sbResult['currency'][0].value;
            //         }
            //         var rec = record.create({ type: 'customrecord_swc_ewh_fee_day', isDynamic: false });
            //         rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_subsidiary', value: location_info.subsidiary });
            //         rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_warehouse', value: ia_info.location });
            //         rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_currency', value: currency });
            //         rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_lot', value: ia_info.serialnumber });
            //         rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_date', value: format.parse({ value: ia_info.trandate, type: 'date' }) });
            //         rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_quantity', value: -ia_info.sn_quantity });
            //         rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_fee', value: -Number(ia_info.warehouse_fee).toFixed(2) });
            //         rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_sku', value: ia_info.item_id });
            //         rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_so', value: so_id });
            //         rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_if', value: if_id });
            //         rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_type', value: '销售出库' });
            //         var id = rec.save({ ignoreMandatoryFields: true });
            //         log.audit('id', id);
            //     } catch (error) {
            //         log.error('reduce error', error);
            //     }

            // });
        }

        function summarize(summary) {

        }

        function GetEstimateWarehouseFee(ia_info) {
            try {
                var ewf = [];
                var filters = [
                    ['isinactive', 'is', false],
                    'and',
                    [
                        ['custrecord_swc_ewh_fee_day_type', 'is', '预估'],
                        'or',
                        ['custrecord_swc_ewh_fee_day_type', 'is', '差异'],
                        'or',
                        ['custrecord_swc_ewh_fee_day_type', 'is', '调拨入库'],
                        'or',
                        ['custrecord_swc_ewh_fee_day_type', 'is', '公司间采购入库'],
                    ],
                    'and',
                    ['custrecord_swc_ewh_fee_day_date', 'onorbefore', format.format({ value: ia_info[0].trandate, type: 'date' })],
                ];
                var f1 = [];
                for (let i = 0; i < ia_info.length; i++) {
                    if (f1.length > 0) {
                        f1.push('or')
                    }
                    f1.push([
                        ['custrecord_swc_ewh_fee_day_sku', 'anyof', ia_info[i].item_id], 'and',
                        ['custrecord_swc_ewh_fee_day_warehouse', 'anyof', ia_info[i].location], 'and',
                        ['custrecord_swc_ewh_fee_day_lot', 'is', ia_info[i].serialnumber]
                    ]);
                };
                if (f1.length) {
                    filters.push('and');
                    filters.push(f1);
                }
                log.audit('filters', filters);
                search.create({
                    type: 'customrecord_swc_ewh_fee_day',
                    filters: filters,
                    columns: [
                        { name: 'custrecord_swc_ewh_fee_day_date', summary: 'MIN' },
                        { name: 'custrecord_swc_ewh_fee_day_date', summary: 'MAX' },
                        { name: 'custrecord_swc_ewh_fee_day_warehouse', summary: 'GROUP' },
                        { name: 'custrecord_swc_ewh_fee_day_sku', summary: 'GROUP' },
                        { name: 'custrecord_swc_ewh_fee_day_lot', summary: 'GROUP' },
                        { name: 'custrecord_swc_ewh_fee_day_quantity', summary: 'SUM' },
                        { name: 'custrecord_swc_ewh_fee_day_fee', summary: 'SUM' },
                        { name: 'custrecord_swc_ewh_fee_day_rate', summary: 'AVG' },
                        { name: 'custrecord_swc_ewh_fee_day_currency', summary: 'GROUP' },
                    ]
                }).run().each(function (rec) {
                    ewf.push({
                        date_min: rec.getValue(rec.columns[0]),
                        date_max: rec.getValue(rec.columns[1]),
                        warehouse_id: rec.getValue(rec.columns[2]),
                        sku_id: rec.getValue(rec.columns[3]),
                        lot_number: rec.getValue(rec.columns[4]),
                        quantity: rec.getValue(rec.columns[5]),
                        amount: rec.getValue(rec.columns[6]),
                        rate: rec.getValue(rec.columns[7]),
                        avg_rate: interface.accDiv(rec.getValue(rec.columns[6]) || 0, rec.getValue(rec.columns[5]) || 0),
                        date_count: getDaysDifference(ia_info[0].trandate, rec.getValue(rec.columns[0])),
                        currency: rec.getValue(rec.columns[8]),
                    });
                    return true;
                });
                log.audit('ewf1', ewf);


                //查仓租日记录出库总和
                var ewf_1 = [];
                var filters1 = [
                    ['isinactive', 'is', false], 'and',
                    ['custrecord_swc_ewh_fee_day_quantity', 'lessthan', ['0']], 'and',
                    ['custrecord_swc_ewh_fee_day_date', 'onorbefore', format.format({ value: ia_info[0].trandate, type: 'date' })],
                ];
                var f1_1 = [];
                for (let i = 0; i < ia_info.length; i++) {
                    if (f1_1.length > 0) {
                        f1_1.push('or')
                    }
                    f1_1.push([
                        ['custrecord_swc_ewh_fee_day_sku', 'anyof', ia_info[i].item_id], 'and',
                        ['custrecord_swc_ewh_fee_day_warehouse', 'anyof', ia_info[i].location], 'and',
                        ['custrecord_swc_ewh_fee_day_lot', 'is', ia_info[i].serialnumber]
                    ]);
                };
                if (f1_1) {
                    filters1.push('and');
                    filters1.push(f1_1);
                }
                log.audit('filters1', filters1);
                search.create({
                    type: 'customrecord_swc_ewh_fee_day',
                    filters: filters1,
                    columns: [
                        { name: 'custrecord_swc_ewh_fee_day_warehouse', summary: 'GROUP' },
                        { name: 'custrecord_swc_ewh_fee_day_sku', summary: 'GROUP' },
                        { name: 'custrecord_swc_ewh_fee_day_lot', summary: 'GROUP' },
                        { name: 'custrecord_swc_ewh_fee_day_quantity', summary: 'SUM' },
                    ]
                }).run().each(function (rec) {
                    ewf_1.push({
                        warehouse_id: rec.getValue(rec.columns[0]),
                        sku_id: rec.getValue(rec.columns[1]),
                        lot_number: rec.getValue(rec.columns[2]),
                        quantity: rec.getValue(rec.columns[3]),
                    });
                    return true;
                });
                log.audit('ewf_1', ewf_1);




                //查货品、批次、仓库对应的入库数量总和
                var inbound_info = [];

                let items = [], locations = [];
                var fils2 = [];
                for (let i = 0; i < ia_info.length; i++) {
                    items.push(ia_info[i].item_id);
                    locations.push(ia_info[i].location);
                    // sn_ids.push(ia_info[i].sn_id);

                    fils2.push(['serialnumber', 'is', ia_info[i].serialnumber])
                    if (i < ia_info.length - 1) {
                        fils2.push('or')
                    }

                }
                items = [...new Set(items)];
                locations = [...new Set(locations)];
                var fils1 = [
                    [
                        ['taxline', 'is', 'false'], 'and',
                        ['shipping', 'is', 'false'], 'and',
                        ['item', 'anyof', items], 'and',
                        ['location', 'anyof', locations], 'and',
                        ['trandate', 'onorbefore', format.format({ value: ia_info[0].trandate, type: 'date' })], 'and',//当天之后的每天出入库数量之和
                        ['type', 'anyof', ["InvAdjst", "ItemShip", "ItemRcpt", "InvTrnfr", "Build", "Unbuild", "CustInvc", "VendBill"]], 'and',
                        ['account', 'anyof', ['920']], 'and',
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
                                ['mainline', 'any', '']
                            ]
                        ]
                    ]
                ];

                fils1.push('and');
                fils1.push(fils2);
                log.audit('fils1', fils1);

                search.create({
                    type: "transaction",
                    filters: fils1,
                    columns: [
                        { name: "item" },
                        { name: "location" },
                        { name: "serialnumber" },
                        { name: "serialnumberquantity" }
                    ]
                }).run().each(function (e) {
                    if (Number(e.getValue(e.columns[3])) > 0) {
                        inbound_info.push({
                            item_id: e.getValue(e.columns[0]),
                            location_id: e.getValue(e.columns[1]),
                            serialnumber: e.getValue(e.columns[2]),
                            qty: e.getValue(e.columns[3]),
                        });
                    }
                    return true;
                });
                log.audit('inbound_info', inbound_info);
                let result_info = mergeData(inbound_info)
                log.audit('result_info', result_info);

                for (let i = 0; i < ewf.length; i++) {
                    for (let j = 0; j < result_info.length; j++) {
                        if (ewf[i].sku_id == result_info[j].item_id && ewf[i].warehouse_id == result_info[j].location_id && ewf[i].serialnumber == result_info[j].serialnumber) {
                            ewf[i].quantity = result_info[j].qty;
                        }
                    }
                }

                for (let i = 0; i < ewf.length; i++) {
                    for (let j = 0; j < ewf_1.length; j++) {
                        if (ewf[i].warehouse_id == ewf_1[j].warehouse_id || ewf[i].sku_id == ewf_1[j].sku_id || ewf[i].lot_number == ewf_1[j].lot_number) {
                            ewf[i].quantity = interface.accAdd(ewf[i].quantity, ewf_1[j].quantity);
                        }
                    }
                }


                log.audit('ewf', ewf);
                return ewf
            } catch (error) {
                log.error('GetEstimateWarehouseFee error', error);
                throw error;
            }
        }

        function mergeData(arr) {
            const map = {};

            arr.forEach(item => {
                // 组合唯一 key：if_id + item_id
                const key = item.if_id + '-' + item.item_id;

                if (map[key]) {
                    // 已存在 → 累加 qty
                    map[key].qty = interface.accAdd(map[key].qty, item.qty);
                } else {
                    // 不存在 → 存入
                    map[key] = { ...item };
                }
            });

            // 转成数组返回
            return Object.values(map);
        }

        /**
         * 计算两个日期之间相差的天数
         * @param {Date|string} date1 - 第一个日期（可以是Date对象或合法的日期字符串）
         * @param {Date|string} date2 - 第二个日期（可以是Date对象或合法的日期字符串）
         * @returns {number} 两个日期相差的天数（绝对值）
         * @throws {Error} 如果传入的日期格式不合法会抛出错误
         */
        function getDaysDifference(date1, date2) {
            // 将输入转换为Date对象
            const d1 = new Date(date1);
            const d2 = new Date(date2);

            // 验证日期是否合法
            if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
                throw new Error('传入的日期格式不合法，请检查日期参数');
            }

            // 转换为毫秒数，并只保留日期部分（去除时分秒的影响）
            // 方法：将时间设置为00:00:00，再获取时间戳
            const startOfDay1 = new Date(d1.setHours(0, 0, 0, 0)).getTime();
            const startOfDay2 = new Date(d2.setHours(0, 0, 0, 0)).getTime();

            // 一天的毫秒数：24小时 * 60分钟 * 60秒 * 1000毫秒
            const oneDayMs = 24 * 60 * 60 * 1000;

            // 计算差值并取绝对值（确保结果为正数）
            const diffDays = Math.abs(Math.round((startOfDay2 - startOfDay1) / oneDayMs));

            return diffDays;
        }


        /**
         * 按 line_no 分组计算 warehouse_fee 总和
         * @param {Array} data - 原始数据数组
         * @returns {Object} 分组求和结果（key: line_no, value: 总和）
         */
        function calculateWarehouseFeeByLineNo(data) {
            // 第一步：分组累加
            var groupResult = data.reduce((acc, item) => {
                var lineNo = item.line_no;
                // 初始化分组（若不存在）
                if (!acc[lineNo]) {
                    acc[lineNo] = 0;
                }
                // 累加并处理浮点数精度
                acc[lineNo] = interface.accAdd(acc[lineNo], item.warehouse_fee);;
                return acc;
            }, {});

            // 第二步：格式化结果（保留2位小数，符合金额展示）
            var formattedResult = {};
            for (var lineNo in groupResult) {
                formattedResult[lineNo] = groupResult[lineNo];
            }

            return formattedResult;
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });
