/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_BATCH_TRACKING_IF_JOUR.js
 *@description 成本还原-批次跟踪 出库单生成日记账
 */
define(['../common/interface', '../common/moment', 'N/runtime', 'N/record', 'N/search', 'N/format', 'N/error'],
    function (interface, moment, runtime, record, search, format, error) {

        var record_type = 'customrecord_swc_batch_track'
        function getInputData() {
            var startTime = new Date().getTime();
            log.emergency('getInputData 开始', startTime);
            var if_id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_btj_if_id' });
            var location_id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_btj_location_id' });
            var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_btj_start_date' });
            var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_btj_end_date' });

            if (start_date) {
                start_date = format.format({ value: start_date, type: 'date' })
            }
            if (end_date) {
                end_date = format.format({ value: end_date, type: 'date' })
            }
            var data = [];
            var limit = 399;
            var filters = [
                { name: 'custrecord_swc_bt_resolved', operator: 'is', values: false },
                { name: 'custrecord_swc_bt_type', operator: 'anyof', values: ['8'] },
                { name: 'custrecord_swc_bt_type_id', operator: 'noneof', values: ['@NONE@'] },
            ]
            if (if_id) {
                filters.push({ name: 'custrecord_swc_bt_type_id', operator: 'anyof', values: if_id })
            }
            if (location_id) {
                filters.push({ name: 'custrecord_swc_bt_location', operator: 'anyof', values: location_id })
            };
            if (end_date && start_date) {
                filters.push({ name: 'custrecord_swc_bt_date', operator: 'within', values: [start_date, end_date] })
            }
            if (end_date && !start_date) {
                filters.push({ name: 'custrecord_swc_bt_date', operator: 'onorbefore', values: end_date })
            }
            if (!end_date && start_date) {
                filters.push({ name: 'custrecord_swc_bt_date', operator: 'onorafter', values: start_date })
            }
            log.audit('filters', filters)
            search.create({
                type: record_type,
                filters: filters,
                columns: [
                    { name: 'custrecord_swc_bt_type_id' },
                ]
            }).run().each(function (rec) {
                data.push({
                    if_id: rec.getValue(rec.columns[0])
                });
                return --limit > 0
            })
            log.audit('data', data);

            if (data.length) {
                // data = [...new Set(data)];   对象数组不能直接用
                data = unique(data)
            }
            log.emergency('获取数量 data', data.length)
            return data;
        }

        function unique(arr) {
            const seen = new Set();
            return arr.filter(a => {
                // 判断是否已经存在
                if (!seen.has(a.if_id)) {
                    seen.add(a.if_id);
                    return true;
                }
                return false;
            });
        }

        function map(context) {
            try {
                var obj = JSON.parse(context.value);
                log.audit('obj', obj);
                var if_id = obj.if_id;


                var feeFieldMap = [], FeeTypeArray = [], mainObj = {}, cacheids = [];

                search.create({
                    type: 'customrecord_swc_costcategory_map_feild',
                    filters: [
                        { name: 'custrecord_swc_cmf_bt_account', operator: 'noneof', values: ['@NONE@'] },
                    ],
                    columns: [
                        { name: 'custrecord_swc_cmf_costcategory' },
                        { name: 'custrecord_swc_cmf_bt_filed' },
                        { name: 'custrecord_swc_cmf_bt_account' },
                    ]
                }).run().each(function (rec) {
                    feeFieldMap.push({
                        costcategory: rec.getValue('custrecord_swc_cmf_costcategory'),
                        bt_filed: rec.getValue('custrecord_swc_cmf_bt_filed'),
                        bt_account: rec.getValue('custrecord_swc_cmf_bt_account'),
                        bt_account_text: rec.getText('custrecord_swc_cmf_bt_account'),
                    });
                    return true;
                });
                log.audit('feeFieldMap', feeFieldMap);


                var fee_filters = [
                    { name: 'isinactive', operator: 'is', values: false },
                    { name: 'custrecord_swc_bt_resolved', operator: 'is', values: false },
                    { name: 'custrecord_swc_bt_type_id', operator: 'anyof', values: if_id },
                ]
                log.debug('fee_filters', fee_filters);
                var fee_columns = [
                    { name: 'custrecord_swc_bt_subsidiary' },
                    { name: 'custrecord_swc_bt_date' },
                    { name: 'custrecord_swc_bt_sku' },
                    { name: 'custrecord_swc_bt_location' },
                    { name: 'custrecord_swc_bt_batch' },
                    { name: 'custrecord_swc_bt_currency' },
                    { name: 'custrecord_swc_bt_s_quantity' },
                ]
                for (let i = 0; i < feeFieldMap.length; i++) {
                    if (feeFieldMap[i].bt_filed) {
                        fee_columns.push({ name: feeFieldMap[i].bt_filed })
                    }
                }
                log.audit('fee_columns', fee_columns);
                var mySearch = search.create({
                    type: record_type,
                    filters: fee_filters,
                    columns: fee_columns
                });
                var pageSize = '1000'; //每页条数
                var pageData = mySearch.runPaged({
                    pageSize: pageSize
                });
                log.debug('pageData', pageData);
                var totalCount = pageData.count; //总数
                log.debug('totalCount', totalCount);
                var pageCount = pageData.pageRanges.length; //页数
                log.debug('pageCount', pageCount);
                for (var i = 0; i < pageCount; i++) {
                    pageData.fetch({
                        index: i
                    }).data.forEach(function (rec) {
                        cacheids.push(rec.id);

                        if (Object.keys(mainObj).length == 0) {
                            mainObj = {
                                subsidiary: rec.getValue('custrecord_swc_bt_subsidiary'),
                                date: rec.getValue('custrecord_swc_bt_date'),
                                location_id: rec.getValue('custrecord_swc_bt_location'),
                                currency: rec.getValue('custrecord_swc_bt_currency'),
                            }
                        }

                        for (let i = 0; i < feeFieldMap.length; i++) {
                            if (feeFieldMap[i].bt_filed) {
                                var fee = rec.getValue(feeFieldMap[i].bt_filed) || 0;
                                if (Number(fee) != 0) {
                                    FeeTypeArray.push({
                                        "fee": -fee,
                                        "qty": rec.getValue('custrecord_swc_bt_s_quantity'),
                                        "sku": rec.getValue('custrecord_swc_bt_sku'),
                                        "sku_text": rec.getText('custrecord_swc_bt_sku'),
                                        "batch": rec.getValue('custrecord_swc_bt_batch'),
                                        "batch_text": rec.getText('custrecord_swc_bt_batch'),
                                        "feeAccount": feeFieldMap[i].bt_account,
                                        "bt_account_text": feeFieldMap[i].bt_account_text,
                                        "amount": interface.accMul(fee, rec.getValue('custrecord_swc_bt_s_quantity')),
                                    });
                                }
                            }
                        }
                    });
                }

                log.audit('cacheids', cacheids);
                log.audit('cacheids length', cacheids.length);

                var if_rec = record.load({ type: 'itemfulfillment', id: if_id });
                var ordertype = if_rec.getValue('ordertype');
                if (ordertype == 'TrnfrOrd') {
                    for (var i = 0; i < cacheids.length; i++) {
                        context.write({
                            key: if_id + '.' + cacheids[i],
                            value: {
                                'cache_id': cacheids[i],
                                'if_id': if_id,
                                'type': 'no_deal',
                            }
                        });
                    }
                    return
                }


                log.audit('mainObj', mainObj);
                log.audit('FeeTypeArray', FeeTypeArray);

                var if_data = [];
                search.create({
                    type: 'itemfulfillment',
                    settings: [
                        { 'name': 'consolidationtype', 'value': 'NONE' }
                    ],
                    filters: [
                        { name: 'internalId', operator: 'is', values: if_id },
                        { name: 'cogs', operator: 'is', values: true },
                        { name: 'serialnumber', operator: 'isnotempty', values: '' },
                    ],
                    columns: [
                        { name: 'item' },
                        { name: 'location' },
                        { name: 'quantity' },
                        { name: 'serialnumber' },
                        { name: 'serialnumberquantity' },
                        { name: 'amount' },
                    ]
                }).run().each(function (rec) {
                    if_data.push({
                        id: rec.id,
                        item_id: rec.getValue('item'),
                        item_text: rec.getText('item'),
                        location_id: rec.getValue('location'),
                        quantity: rec.getValue('quantity'),
                        s_quantity: rec.getValue('serialnumberquantity'),
                        serinalnumber: rec.getValue('serialnumber'),
                        amount: rec.getValue('amount'),
                    });
                    return true;
                });

                log.audit('if_data', if_data);

                // 1. 给 data2 分组求和：按 sku_text + batch_text 分组
                const data2Map = {};
                FeeTypeArray.forEach(item => {
                    const key = item.sku_text + '_' + item.batch_text;
                    if (!data2Map[key]) {
                        data2Map[key] = 0;
                    }
                    // 转为数字累加
                    data2Map[key] = interface.accAdd(data2Map[key], Number(item.amount).toFixed(2));
                });
                log.audit('data2Map', data2Map);


                // 2. 遍历 data1，计算差值
                const difFee = if_data.map(item => {
                    const key = item.item_text + '_' + item.serinalnumber;
                    const data1Amount = Number(item.amount);
                    const data2TotalAmount = data2Map[key] || 0;

                    // 计算差值：data1 - data2
                    const diff = interface.accSub(data2TotalAmount, data1Amount);

                    return {
                        item_text: item.item_text,
                        serinalnumber: item.serinalnumber,
                        data1_amount: data1Amount,
                        data2_total_amount: data2TotalAmount,
                        // 差值（保留两位小数）
                        amount_diff: Number(diff).toFixed(2)
                    };
                });
                log.audit('difFee', difFee);


                // var difFee = [];
                // for (let i = 0; i < if_data.length; i++) {
                //     for (let j = 0; j < FeeTypeArray.length; j++) {
                //         if (if_data[i].item_text == FeeTypeArray[j].sku_text && if_data[i].serinalnumber == FeeTypeArray[j].batch_text) {
                //             if (difFee.length) {
                //                 var flag = true;
                //                 for (let k = 0; k < difFee.length; k++) {
                //                     if (difFee[k].item_text == FeeTypeArray[j].sku_text && difFee[k].serinalnumber == FeeTypeArray[j].batch_text) {
                //                         difFee[k].dif_fee = interface.accAdd(difFee[k].dif_fee, interface.accMul(FeeTypeArray[j].fee, FeeTypeArray[j].qty));
                //                         flag = false;
                //                         break
                //                     }
                //                 }
                //                 if (flag) {
                //                     difFee.push({
                //                         item_text: if_data[i].item_text,
                //                         serinalnumber: if_data[i].serinalnumber,
                //                         dif_fee: interface.accAdd(if_data[i].amount, interface.accMul(FeeTypeArray[j].fee, FeeTypeArray[j].qty))
                //                     });
                //                 }
                //             } else {
                //                 difFee.push({
                //                     item_text: if_data[i].item_text,
                //                     serinalnumber: if_data[i].serinalnumber,
                //                     dif_fee: interface.accAdd(if_data[i].amount, interface.accMul(FeeTypeArray[j].fee, FeeTypeArray[j].qty))
                //                 });
                //             }
                //         }
                //     }
                // }
                // log.audit('difFee', difFee);


                var jo_fy_id;
                if (FeeTypeArray.length) {
                    var funds_fy = 0;
                    var jour_fy = record.create({ type: 'statisticaljournalentry', isDynamic: true });
                    jour_fy.setValue({ fieldId: 'subsidiary', value: mainObj.subsidiary });
                    jour_fy.setValue({ fieldId: 'currency', value: mainObj.currency });
                    jour_fy.setValue({ fieldId: 'trandate', value: format.parse({ value: mainObj.date, type: 'date' }) });
                    jour_fy.setValue({ fieldId: 'memo', value: '成本还原 出库日记账' });
                    jour_fy.setValue({ fieldId: 'approvalstatus', value: 2 });
                    jour_fy.setValue({ fieldId: 'custbody_swc_related_item_fulfillment', value: if_id });
                    jour_fy.setValue({ fieldId: 'custbody_swc_journal_type', value: "2" });  //普通日记账
                    if (runtime.accountId == '11297254_SB1') {
                        jour_fy.setValue({ fieldId: 'unitstype', value: "1" });
                    } else {
                        jour_fy.setValue({ fieldId: 'unitstype', value: "2" });
                    }

                    FeeTypeArray.map(function (obj) {
                        // log.audit('FeeTypeArray obj', obj);
                        if (obj.feeAccount) {
                            if (Number(obj.fee) != 0) {
                                var x = Number(interface.accMul(obj.fee, obj.qty)).toFixed(2);
                                // log.debug('x', x);
                                funds_fy = interface.accAdd(Number(funds_fy), Number(x));
                                jour_fy.selectNewLine({ sublistId: 'line' });
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: obj.feeAccount });
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: obj.sku_text + '  ' + obj.batch_text });
                                jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: x }); // 借
                                jour_fy.commitLine({ sublistId: 'line' });
                            }
                        }
                    });

                    if (runtime.accountId == '11297254_SB1') {
                        var if_account = '1417';//T6601.14.01.01 销售费用-销货成本_采购成本_采购价格
                        var dif_account = '1523';//T6601.99	核算差异
                    } else {
                        var if_account = '959';//T6601.14.01 销售费用-销货成本_采购成本_采购价格
                        var dif_account = '981';//T6601.99	核算差异
                    }

                    for (let i = 0; i < if_data.length; i++) {
                        jour_fy.selectNewLine({ sublistId: 'line' })
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: if_account });
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: if_data[i].item_text + '  ' + if_data[i].serinalnumber });
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: if_data[i].amount }); //借
                        jour_fy.commitLine({ sublistId: 'line' })
                    }


                    for (let i = 0; i < difFee.length; i++) {
                        jour_fy.selectNewLine({ sublistId: 'line' })
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: dif_account });
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: difFee[i].item_text + '  ' + difFee[i].serinalnumber });
                        jour_fy.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: Number(difFee[i].amount_diff).toFixed(2) }); //借
                        jour_fy.commitLine({ sublistId: 'line' })
                    }


                    jo_fy_id = jour_fy.save({ ignoreMandatoryFields: true });
                    log.debug('生成费用凭证:', jo_fy_id);
                }

                for (var i = 0; i < cacheids.length; i++) {
                    context.write({
                        key: if_id + '.' + cacheids[i],
                        value: {
                            'cache_id': cacheids[i],
                            'jo_fy_id': jo_fy_id,
                            'if_id': if_id,
                            'type': 'jour',
                        }
                    });
                }

            } catch (error) {
                log.error('map error', error);
            }
        }

        function reduce(context) {
            var v = context.values
            v.map(function (obj) {
                try {
                    obj = JSON.parse(obj);
                    log.debug('obj', obj);
                    var rec = record.load({ type: record_type, id: obj.cache_id });
                    if (obj.type == 'jour') {
                        rec.setValue({ fieldId: 'custrecord_swc_bt_resolved', value: true });
                        if (obj.jo_fy_id) {
                            rec.setValue({ fieldId: 'custrecord_swc_bt_jour', value: obj.jo_fy_id });
                        }
                    }
                    if (obj.type == 'no_deal') {
                        rec.setValue({ fieldId: 'custrecord_swc_bt_resolved', value: true });
                    }
                    // else if (obj.type == 'map_error') {
                    //     rec.setValue({ fieldId: 'custrecord_swc_sett_error', value: obj.msg });
                    //     rec.setValue({ fieldId: 'custrecord_swc_sett_retry', value: Number(retry) + 1 });
                    // }

                    var st_id = rec.save({ ignoreMandatoryFields: true });
                    log.audit('st_id', st_id);
                } catch (error) {
                    log.error('reduce error', error);
                }

            });
        }

        function summarize(summary) {

        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });
