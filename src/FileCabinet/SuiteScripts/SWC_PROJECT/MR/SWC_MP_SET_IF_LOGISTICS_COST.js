/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_SET_IF_LOGISTICS_COST.js
 *@description 尾程销售货品履行实际物流费用分摊
 */
define(['../common/interface', '../common/moment', 'N/runtime', 'N/record', 'N/search', 'N/format', 'N/error'],
    function (interface, moment, runtime, record, search, format, error) {

        var record_type = 'customrecord_swc_logistics_cost'
        function getInputData() {
            var startTime = new Date().getTime();
            log.emergency('getInputData 开始', startTime);
            var if_id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_lc_if_id' });
            var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_lc_if_start_date' });
            var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_lc_if_end_date' });

            if (start_date) {
                start_date = format.format({ value: start_date, type: 'date' })
            }
            if (end_date) {
                end_date = format.format({ value: end_date, type: 'date' })
            }
            var data = [];
            var limit = 399;
            var filters = [
                { name: 'isinactive', operator: 'is', values: false },
                { name: 'custrecord_swc_lc_resolved', operator: 'is', values: false },
            ]
            if (if_id) {
                filters.push({ name: 'custrecord_swc_linkid', operator: 'anyof', values: if_id })
            }
            if (end_date && start_date) {
                filters.push({ name: 'custrecord_swc_update_date', operator: 'within', values: [start_date, end_date] })
            }
            if (end_date && !start_date) {
                filters.push({ name: 'custrecord_swc_update_date', operator: 'onorbefore', values: end_date })
            }
            if (!end_date && start_date) {
                filters.push({ name: 'custrecord_swc_update_date', operator: 'onorafter', values: start_date })
            }
            log.audit('filters', filters)
            search.create({
                type: record_type,
                filters: filters,
                columns: [
                    { name: 'custrecord_swc_linkid' },
                    { name: 'custrecord_swc_lc_retry', sort: 'ASC' },
                ]
            }).run().each(function (rec) {
                data.push({
                    if_id: rec.getValue(rec.columns[0]),
                    retry: rec.getValue(rec.columns[1]),
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
            var cacheids = [];
            try {
                var obj = JSON.parse(context.value);
                log.audit('obj', obj);
                var if_id = obj.if_id;

                let currency_id, lc_cost = [];
                var fee_filters = [
                    { name: 'isinactive', operator: 'is', values: false },
                    { name: 'custrecord_swc_lc_resolved', operator: 'is', values: false },
                    { name: 'custrecord_swc_linkid', operator: 'anyof', values: if_id },
                ]
                log.debug('fee_filters', fee_filters);
                var fee_columns = [
                    { name: 'custrecord_swc_logistics' },
                    { name: 'custrecord_swc_feeid' },
                    { name: 'custrecord_swc_amount' },
                    { name: 'custrecord_swc_wl_currency' },
                ]
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
                for (let i = 0; i < pageCount; i++) {
                    pageData.fetch({
                        index: i
                    }).data.forEach(function (rec) {
                        cacheids.push(rec.id);
                        if (!currency_id) {
                            currency_id = rec.getValue('custrecord_swc_wl_currency');
                        }
                        lc_cost.push({
                            logistics: rec.getValue('custrecord_swc_logistics'),
                            feeid: rec.getValue('custrecord_swc_feeid'),
                            amount: rec.getValue('custrecord_swc_amount'),
                            currency: rec.getValue('custrecord_swc_wl_currency'),
                            wcfeegs: '',
                        });
                    });
                }
                log.audit('cacheids', cacheids);
                log.audit('lc_cost1', lc_cost);


                var f1 = [], wc_f = [];
                for (let i = 0; i < lc_cost.length; i++) {
                    if (f1.length) {
                        f1.push('or')
                    }
                    f1.push([
                        ['custrecord_swc_vender', 'is', lc_cost[i].logistics], 'and',
                        ['custrecord_swc_wcfeeid', 'is', lc_cost[i].feeid]
                    ]);
                }
                search.create({
                    type: 'customrecord_swc_wcfee',
                    filters: f1,
                    columns: [
                        { name: 'custrecord_swc_vender' },
                        { name: 'custrecord_swc_wcfeeid' },
                        { name: 'custrecord_swc_wcfeegs' },
                    ]
                }).run().each(function (rec) {
                    wc_f.push({
                        logistics: rec.getValue('custrecord_swc_vender'),
                        feeid: rec.getValue('custrecord_swc_wcfeeid'),
                        wcfeegs: rec.getValue('custrecord_swc_wcfeegs'),
                    });
                    return true;
                });
                log.audit('wc_f', wc_f);

                for (let i = 0; i < lc_cost.length; i++) {
                    for (let j = 0; j < wc_f.length; j++) {
                        if (lc_cost[i].logistics == wc_f[j].logistics && lc_cost[i].feeid == wc_f[j].feeid) {
                            lc_cost[i].wcfeegs = wc_f[j].wcfeegs;
                        }
                    }
                }
                log.audit('lc_cost2', lc_cost);



                for (let i = 0; i < lc_cost.length; i++) {
                    if (!lc_cost[i].wcfeegs) {
                        throw '配置表找不到该数据.物流商:' + lc_cost[i].logistics + ',费用项id:' + lc_cost[i].feeid;
                    }
                }

                let result_fee = groupByFee(lc_cost);
                log.audit('result_fee', result_fee);


                var if_data = [], total_weight = 0;
                search.create({
                    type: 'itemfulfillment',
                    filters: [
                        { name: 'internalId', operator: 'is', values: if_id },
                        { name: 'cogs', operator: 'is', values: false },
                    ],
                    columns: [
                        { name: 'item' },
                        { name: 'location' },
                        { name: 'quantity' },
                        { name: 'custcol_swc_line_no' },
                        { name: 'custitem_swc_packageweight', join: 'item' },
                    ]
                }).run().each(function (rec) {
                    let item_id = rec.getValue('item');
                    let item_text = rec.getText('item');
                    let qty = Math.abs(rec.getValue('quantity'));
                    let line_no = rec.getValue('custcol_swc_line_no');
                    let packageweight = rec.getValue({ name: 'custitem_swc_packageweight', join: 'item' }) || 0;
                    let total_line_weight = interface.accMul(qty, packageweight)
                    if_data.push({
                        id: rec.id,
                        line_no: line_no,
                        item_id: item_id,
                        item_text: item_text,
                        quantity: qty,
                        packageweight: packageweight,
                        total_line_weight: total_line_weight,
                    });
                    total_weight = interface.accAdd(total_weight, total_line_weight)
                    return true;
                });
                log.audit('if_data', if_data);
                log.audit('total_weight', total_weight);

                const finalResult = allocateFeeByWeight(if_data, result_fee, total_weight);
                log.audit('finalResult', finalResult);


                var if_rec = record.load({ type: 'itemfulfillment', id: if_id });
                var if_line = if_rec.getLineCount({ sublistId: 'item' });
                for (let i = 0; i < if_line; i++) {
                    let item_id = if_rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    let line_no = if_rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: i });
                    for (let j = 0; j < finalResult.length; j++) {
                        if (item_id == finalResult[j].item_id && line_no == finalResult[j].line_no) {
                            if_rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_shipping_price_', value: finalResult[j].kdf, line: i });//快递费
                            if_rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_others_price_', value: finalResult[j].ckczf, line: i });//出库操作费
                            if_rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_currency', value: currency_id, line: i });//出库操作费用
                        }
                    }
                }


                let save_id = if_rec.save({ ignoreMandatoryFields: true });
                log.audit('save_id', save_id);

                for (var i = 0; i < cacheids.length; i++) {
                    context.write({
                        key: if_id + '.' + cacheids[i],
                        value: {
                            'cache_id': cacheids[i],
                            'if_id': if_id,
                            'type': 'ok',
                        }
                    });
                }

            } catch (error) {
                log.error('map error', error);
                let e = error.message ? error.message : error;
                for (var i = 0; i < cacheids.length; i++) {
                    context.write({
                        key: if_id + '.' + cacheids[i],
                        value: {
                            'cache_id': cacheids[i],
                            'if_id': if_id,
                            'type': 'ok',
                            'msg': e,
                        }
                    });
                }

            }
        }

        function reduce(context) {
            var v = context.values
            v.map(function (obj) {
                try {
                    obj = JSON.parse(obj);
                    log.debug('obj', obj);
                    var rec = record.load({ type: record_type, id: obj.cache_id });
                    if (obj.type == 'ok') {
                        rec.setValue({ fieldId: 'custrecord_swc_lc_resolved', value: true });
                    }
                    else if (obj.type == 'error') {
                        rec.setValue({ fieldId: 'custrecord_swc_lc_error', value: obj.msg });
                        rec.setValue({ fieldId: 'custrecord_swc_lc_retry', value: Number(retry) + 1 });
                    }

                    var st_id = rec.save({ ignoreMandatoryFields: true });
                    log.audit('st_id', st_id);
                } catch (error) {
                    log.error('reduce error', error);
                }

            });
        }

        function summarize(summary) {

        }

        // 按 wcfeegs + currency 汇总 amount
        function groupByFee(data) {
            const map = {};

            data.forEach(item => {
                // 唯一键：费用名称 + 币种
                const key = item.wcfeegs + '_' + item.currency;

                // 金额转数字
                const amt = Number(item.amount) || 0;

                if (!map[key]) {
                    map[key] = {
                        wcfeegs: item.wcfeegs,
                        currency: item.currency,
                        amount: 0
                    };
                }

                // 累加金额
                map[key].amount = interface.accAdd(map[key].amount, amt);
            });

            // 转成数组返回
            return Object.values(map);
        }

        // 重量分摊费用计算
        function allocateFeeByWeight(if_data, fee, total_weight) {

            const skuCount = if_data.length;

            return if_data.map((item, index) => {
                // 把重量转成数字
                const weight = Number(item.total_line_weight);
                // 重量占比
                const ratio = weight / total_weight;

                // 基础信息
                const result = {
                    id: item.id,
                    line_no: item.line_no,
                    item_id: item.item_id,
                    item_text: item.item_text,
                    quantity: item.quantity,
                    packageweight: item.packageweight,
                    total_line_weight: weight
                };

                // 循环分摊每一种费用
                fee.forEach(cost => {
                    const totalFee = cost.amount;
                    // 核心公式：sku分摊费用 = 总费用 * (单行重量 / 总重量)
                    let splitAmount = interface.accMul(cost.amount, ratio);

                    // 前 N-1 条：四舍五入 2 位小数
                    if (index < skuCount - 1) {
                        splitAmount = splitAmount;
                    }
                    // 最后一条：处理尾差 = 总费用 - 前面所有之和
                    else {
                        let sumBefore = 0;
                        for (let i = 0; i < skuCount - 1; i++) {
                            const w = Number(if_data[i].total_line_weight);
                            sumBefore += totalFee * (w / total_weight);
                        }
                        splitAmount = interface.accSub(totalFee, sumBefore);
                    }


                    let fee_name = cost.wcfeegs, fee_fied = '';
                    if (fee_name == '快递费') {
                        fee_fied = 'kdf';
                    } else if (fee_name == '出库操作费') {
                        fee_fied = 'ckczf';
                    } else {
                        fee_fied = 'qtfy';//其他未知
                    }
                    result[fee_name] = fee_name;
                    result[fee_fied] = Number(splitAmount);       // 分摊金额
                    result[fee_fied + '_currency'] = cost.currency; // 币种
                });

                return result;
            });
        }


        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });