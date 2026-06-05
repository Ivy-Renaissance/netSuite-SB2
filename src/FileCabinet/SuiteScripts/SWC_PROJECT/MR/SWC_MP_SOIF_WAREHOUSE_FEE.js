/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_SOIF_WAREHOUSE_FEE.js
 *@description 销售货品履行仓租费计算
 */
define(['../common/interface', '../common/moment', 'N/runtime', 'N/record', 'N/search', 'N/format', 'N/error'],
    function (interface, moment, runtime, record, search, format, error) {

        function getInputData() {

            var id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_soif_wf_id' });
            var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_soif_wf_start_date' });
            var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_soif_wf_end_date' });

            if (start_date) {
                start_date = format.format({ value: start_date, type: 'date' })
            }

            if (end_date) {
                end_date = format.format({ value: end_date, type: 'date' })
            }

            var data = [];
            var filters = [
                { name: 'mainline', operator: 'is', values: true },
                { name: 'custbody_swc_calculate_warehouse_fee', operator: 'is', values: false },
                { name: 'type', join: 'createdfrom', operator: 'anyof', values: ['SalesOrd'] },
                { name: 'intercostatus', join: 'createdfrom', operator: 'anyof', values: ['@NONE@'] },
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
                type: 'itemfulfillment',
                filters: filters,
                columns: []
            }).run().each(function (rec) {
                data.push(rec.id);
                return true;
            });
            if (data.length) {
                data = [...new Set(data)];
            }
            log.audit('data length', data.length);
            return data;
        }

        function map(context) {
            try {
                var if_id = JSON.parse(context.value);
                log.audit('if_id', if_id);
                var if_info = [];
                var rec = record.load({ type: 'itemfulfillment', id: if_id });
                var so_id = rec.getValue('createdfrom');

                const line = rec.getLineCount({ sublistId: 'item' });
                for (var i = 0; i < line; i++) {
                    var item = rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    var location = rec.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i });
                    var quantity = rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                    var line_no = rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: i });
                    var warehouse_fee = rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_warehouse_fee', line: i }) || 0;
                    var inventorydetailavail = rec.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetailavail', line: i });
                    var inventorydetailreq = rec.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetailreq', line: i });
                    if (inventorydetailavail == 'T' && inventorydetailreq == 'T') {
                        var id_subrec = rec.getSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail', line: i });
                        for (var j = 0; j < id_subrec.getLineCount({ sublistId: 'inventoryassignment' }); j++) {
                            var sn_quantity = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j });
                            var sn_id = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'numberedrecordid', line: j });
                            if_info.push({
                                item_id: item,
                                location: location,
                                quantity: quantity,
                                trandate: rec.getValue('trandate'),
                                line_no: line_no,
                                sn_id: sn_id,
                                sn_quantity: sn_quantity,
                                serialnumber: '',
                                warehouse_fee: warehouse_fee,
                            });
                        }
                    }
                }
                log.audit('if_info1', if_info);

                var in_filters = [], sn_numbers = [];
                for (let i = 0; i < if_info.length; i++) {
                    if (in_filters.length) {
                        in_filters.push('or', ['internalid', 'anyof', if_info[i].sn_id])
                    } else {
                        in_filters.push(['internalid', 'anyof', if_info[i].sn_id])
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

                for (let i = 0; i < if_info.length; i++) {
                    for (let j = 0; j < sn_numbers.length; j++) {
                        if (if_info[i].sn_id == sn_numbers[j].id) {
                            if_info[i].serialnumber = sn_numbers[j].number;
                        }
                    }
                }
                log.audit('if_info2', if_info);


                var ewf = GetEstimateWarehouseFee(if_info);

                for (let i = 0; i < if_info.length; i++) {
                    for (let j = 0; j < ewf.length; j++) {
                        if (if_info[i].item_id == ewf[j].sku_id && if_info[i].location == ewf[j].warehouse_id && if_info[i].serialnumber == ewf[j].lot_number) {
                            if_info[i].avg_rate = ewf[j].avg_rate;
                            if_info[i].warehouse_fee = interface.accMul(interface.accMul(if_info[i].sn_quantity, ewf[j].avg_rate), ewf[j].date_count);
                        }
                    }
                }
                log.audit('if_info3', if_info);

                const result = calculateWarehouseFeeByLineNo(if_info);
                log.audit('result', result);
                
                for (let i = 0; i < line; i++) {
                    var line_no = rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: i });
                    log.audit('warehouse_fee_amount', result[line_no]);
                    rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_warehouse_fee', value: Number(result[line_no]).toFixed(2), line: i });
                }

                rec.setValue({ fieldId: 'custbody_swc_calculate_warehouse_fee', value: true });
                rec.save({ ignoreMandatoryFields: true });

                for (let i = 0; i < if_info.length; i++) {
                    context.write({
                        key: so_id + '.' + if_id + '.' + if_info[i].line_no + '.' + if_info[i].sn_id,
                        value: {
                            'so_id': so_id,
                            'if_id': if_id,
                            'if_info': if_info[i]
                        }
                    });
                }

            } catch (err) {
                log.debug('map error', err)
            }
        }

        function reduce(context) {
            log.audit('reduce key', context.key);
            var v = context.values
            v.map(function (obj) {
                try {
                    obj = JSON.parse(obj);
                    log.debug('obj', obj);
                    var so_id = obj.so_id;
                    var if_id = obj.if_id;
                    var if_info = obj.if_info;

                    // if_info.push({
                    //     item_id: item,
                    //     location: location,
                    //     quantity: quantity,
                    //     trandate: rec.getValue('trandate'),
                    //     line_no: line_no,
                    //     sn_id: sn_id,
                    //     sn_quantity: sn_quantity,
                    //     serialnumber: '',
                    //     warehouse_fee: warehouse_fee,
                    // });
                    var location_info = interface.GetLocationInfo('', if_info.location);
                    var sbResult = search.lookupFields({ type: 'subsidiary', id: location_info.subsidiary, columns: ['currency'] });
                    log.audit('sbResult', sbResult);
                    var currency = '';
                    if (sbResult['currency'].length) {
                        currency = sbResult['currency'][0].value;
                    }
                    var rec = record.create({ type: 'customrecord_swc_ewh_fee_day', isDynamic: false });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_subsidiary', value: location_info.subsidiary });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_warehouse', value: if_info.location });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_currency', value: currency });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_lot', value: if_info.serialnumber });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_date', value: format.parse({ value: if_info.trandate, type: 'date' }) });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_quantity', value: -if_info.sn_quantity });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_fee', value: -Number(if_info.warehouse_fee).toFixed(2) });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_sku', value: if_info.item_id });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_so', value: so_id });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_if', value: if_id });
                    var id = rec.save({ ignoreMandatoryFields: true });
                    log.audit('id', id);
                } catch (error) {
                    log.error('reduce error', error);
                }

            });
        }

        function summarize(summary) {

        }

        function GetEstimateWarehouseFee(if_info) {
            try {
                var ewf = [];
                var filters = [
                    ['isinactive', 'is', false], 'and',
                    ['isinactive', 'onorbefore', if_info[0].trandate],
                ];
                var f1 = [];
                for (let i = 0; i < if_info.length; i++) {
                    if (f1.length > 0) {
                        f1.push('or')
                    }
                    f1.push([
                        ['custrecord_swc_ewh_fee_day_sku', 'anyof', if_info[i].item_id], 'and',
                        ['custrecord_swc_ewh_fee_day_warehouse', 'anyof', if_info[i].location], 'and',
                        ['custrecord_swc_ewh_fee_day_lot', 'is', if_info[i].serialnumber]
                    ]);
                };
                if (f1.length) {
                    filters.push('and');
                    filters.push(f1);
                }
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
                        date_count: getDaysDifference(rec.getValue(rec.columns[1]), rec.getValue(rec.columns[0])),
                    });
                    return true;
                });
                log.audit('ewf', ewf);
                return ewf
            } catch (error) {
                log.error('GetEstimateWarehouseFee error', error);
                throw error;
            }
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
