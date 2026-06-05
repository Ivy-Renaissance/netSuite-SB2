/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_WAREHOUSE_FEE_SOIF.js
 *@description 销售货品履行仓租费计算
 */
define(['../common/interface', '../common/moment', 'N/runtime', 'N/record', 'N/search', 'N/format', 'N/error'],
    function (interface, moment, runtime, record, search, format, error) {

        function getInputData() {

            let id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_soif_wf_id' });
            let start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_soif_wf_start_date' });
            let end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_soif_wf_end_date' });

            if (start_date) {
                start_date = format.format({ value: start_date, type: 'date' })
            }

            if (end_date) {
                end_date = format.format({ value: end_date, type: 'date' })
            }

            let data = [];
            let limit = 200;
            let filters = [
                { name: 'mainline', operator: 'is', values: true },
                { name: 'type', operator: 'anyof', values: ['InvAdjst', 'ItemShip'] },
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
                type: 'transaction',
                filters: filters,
                columns: [
                    { name: 'trandate', sort: 'ASC' },
                    { name: 'type' },
                ]
            }).run().each(function (rec) {
                data.push({
                    id: rec.id,
                    type: rec.getValue(rec.columns[1]),
                });
                return --limit > 0;
            });
            if (data.length) {
                // data = [...new Set(data)];   对象数组不能直接用
                data = unique(data)
            }
            log.audit('data length', data.length);
            return data;
        }

        function unique(arr) {
            const seen = new Set();
            return arr.filter(a => {
                // 判断是否已经存在
                if (!seen.has(a.id)) {
                    seen.add(a.id);
                    return true;
                }
                return false;
            });
        }

        function map(context) {
            try {
                let obj = JSON.parse(context.value);
                log.audit('obj', obj);

                if (obj.type == 'ItemShip') {
                    let if_id = obj.id;
                    log.audit('if_id', if_id);
                    let if_info = [];
                    let rec = record.load({ type: 'itemfulfillment', id: if_id });
                    let ordertype = rec.getValue('ordertype');
                    let so_id, to_id, ef_type;
                    let ef_type_1, to_location;
                    if (ordertype == 'SalesOrd') {
                        so_id = rec.getValue('createdfrom');
                        let soResult = search.lookupFields({ type: 'salesorder', id: so_id, columns: ['intercotransaction'] });
                        log.audit('soResult', soResult);
                        if (soResult.intercotransaction) {
                            //公司间交易
                            ef_type = '公司间销售出库';
                            let toResult = search.lookupFields({ type: 'purchaseorder', id: soResult.intercotransaction, columns: ['location'] });
                            log.audit('toResult', toResult);
                            to_location = toResult['location'][0].value;
                            ef_type_1 = '公司间采购入库';
                        } else {
                            ef_type = '销售出库';
                        }
                    } else if (ordertype == 'TrnfrOrd') {
                        to_id = rec.getValue('createdfrom');

                        // let toResult = search.lookupFields({ type: 'transferorder', id: to_id, columns: ['transferlocation'] });
                        // log.audit('toResult', toResult);
                        // to_location = toResult['transferlocation'][0].value;

                        ef_type = '调拨出库';
                        // ef_type_1 = '调拨入库';
                    } else {
                        rec.setValue({ fieldId: 'custbody_swc_calculate_warehouse_fee', value: true });
                        rec.save({ ignoreMandatoryFields: true });
                        return
                    }

                    const line = rec.getLineCount({ sublistId: 'item' });
                    for (let i = 0; i < line; i++) {
                        let item = rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                        let location = rec.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i });
                        let quantity = rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                        let line_no = rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: i });
                        let warehouse_fee = rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_warehouse_fee', line: i }) || 0;
                        let inventorydetailavail = rec.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetailavail', line: i });
                        let inventorydetailreq = rec.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetailreq', line: i });
                        if (inventorydetailavail == 'T' && inventorydetailreq == 'T') {
                            let id_subrec = rec.getSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail', line: i });
                            for (let j = 0; j < id_subrec.getLineCount({ sublistId: 'inventoryassignment' }); j++) {
                                let sn_quantity = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j });
                                let sn_id = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'numberedrecordid', line: j });
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

                    let in_filters = [], sn_numbers = [];
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

                    let ewf = SearchEstimateWarehouseFee(if_info);
                    log.audit('result ewf', ewf);
                    let currency = '';
                    for (let i = 0; i < if_info.length; i++) {
                        for (let j = 0; j < ewf.length; j++) {
                            if (if_info[i].item_id == ewf[j].sku_id && if_info[i].location == ewf[j].warehouse_id && if_info[i].serialnumber == ewf[j].lot_number) {
                                let avg_rate = interface.accDiv(ewf[j].amount, ewf[j].remaining_quantity);
                                currency = ewf[j].currency;
                                let total_qty = interface.accSub(ewf[j].zoro_quantity, if_info[i].sn_quantity);
                                log.audit('total_qty', total_qty);
                                if (Number(total_qty) == 0) {
                                    if_info[i].warehouse_fee = ewf[j].amount;
                                } else {
                                    if_info[i].warehouse_fee = interface.accMul(if_info[i].sn_quantity, avg_rate);
                                }
                            }
                        }
                    }
                    log.audit('if_info3', if_info);
                    let result = calculateWarehouseFeeByLineNo(if_info);
                    log.audit('result', result);
                    let warehouse_fee_total = 0;
                    for (let i = 0; i < line; i++) {
                        let line_no = rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: i });
                        log.audit('warehouse_fee_amount', result[line_no]);
                        warehouse_fee_total = interface.accAdd(warehouse_fee_total, Number(result[line_no]).toFixed(2));
                        rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_warehouse_fee', value: Number(result[line_no]).toFixed(2), line: i });
                    }

                    rec.setValue({ fieldId: 'custbody_swc_calculate_warehouse_fee', value: true });
                    rec.setValue({ fieldId: 'custbody_swc_warehouse_fee_total', value: warehouse_fee_total });
                    rec.setValue({ fieldId: 'custbody_swc_warehouse_fee_currency', value: currency });
                    rec.save({ ignoreMandatoryFields: true });

                    let location_info = interface.GetLocationInfo('', if_info[0].location);
                    for (let i = 0; i < if_info.length; i++) {
                        let rec = record.create({ type: 'customrecord_swc_ewh_fee_day', isDynamic: false });
                        rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_subsidiary', value: location_info.subsidiary });
                        rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_warehouse', value: if_info[i].location });
                        rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_currency', value: currency });
                        rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_lot', value: if_info[i].serialnumber });
                        rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_date', value: format.parse({ value: if_info[i].trandate, type: 'date' }) });
                        rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_quantity', value: -if_info[i].sn_quantity });
                        rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_fee', value: -Number(if_info[i].warehouse_fee).toFixed(2) });
                        rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_sku', value: if_info[i].item_id });
                        rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_to', value: to_id });
                        rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_so', value: so_id });
                        rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_if', value: if_id });
                        rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_type', value: ef_type });
                        let id = rec.save({ ignoreMandatoryFields: true });
                        log.audit('id', id);

                        if (to_location) {

                            let to_location_info = interface.GetLocationInfo('', to_location);
                            let rec_1 = record.create({ type: 'customrecord_swc_ewh_fee_day', isDynamic: false });
                            rec_1.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_subsidiary', value: to_location_info.subsidiary });
                            rec_1.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_warehouse', value: to_location });
                            rec_1.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_currency', value: currency });
                            rec_1.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_lot', value: if_info[i].serialnumber });
                            rec_1.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_date', value: format.parse({ value: if_info[i].trandate, type: 'date' }) });
                            rec_1.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_quantity', value: if_info[i].sn_quantity });
                            rec_1.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_fee', value: Number(if_info[i].warehouse_fee).toFixed(2) });
                            rec_1.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_sku', value: if_info[i].item_id });
                            rec_1.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_to', value: to_id });
                            rec_1.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_so', value: so_id });
                            rec_1.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_if', value: if_id });
                            rec_1.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_type', value: ef_type_1 });
                            let id_1 = rec_1.save({ ignoreMandatoryFields: true });
                            log.audit('id_1', id_1);
                        }

                    }

                } else {
                    let ia_id = obj.id;
                    let ef_type = '调整';
                    let ia_info = [];
                    let rec = record.load({ type: 'inventoryadjustment', id: ia_id });

                    const line = rec.getLineCount({ sublistId: 'inventory' });
                    for (let i = 0; i < line; i++) {
                        let item = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'item', line: i });
                        let location = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'location', line: i });
                        let quantity = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'quantity', line: i });
                        let line_no = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'line', line: i });
                        let warehouse_fee = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'custcol_swc_warehouse_fee', line: i }) || 0;
                        let inventorydetailavail = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'inventorydetailavail', line: i });
                        let inventorydetailreq = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'inventorydetailreq', line: i });
                        if (inventorydetailavail == 'T' && inventorydetailreq == 'T') {
                            let id_subrec = rec.getSublistSubrecord({ sublistId: 'inventory', fieldId: 'inventorydetail', line: i });
                            for (let j = 0; j < id_subrec.getLineCount({ sublistId: 'inventoryassignment' }); j++) {
                                let sn_quantity = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j });
                                let sn_id = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'numberedrecordid', line: j });
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
                    let in_filters = [], sn_numbers = [];
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
                    let ewf = SearchEstimateWarehouseFee(ia_info);
                    log.audit('result ewf', ewf);
                    
                    let currency = '';
                    for (let i = 0; i < ia_info.length; i++) {
                        for (let j = 0; j < ewf.length; j++) {
                            if (ia_info[i].item_id == ewf[j].sku_id && ia_info[i].location == ewf[j].warehouse_id && ia_info[i].serialnumber == ewf[j].lot_number) {
                                let avg_rate = interface.accDiv(ewf[j].amount, ewf[j].remaining_quantity);
                                currency = ewf[j].currency;
                                let total_qty = interface.accSub(ewf[j].zoro_quantity, ia_info[i].sn_quantity);
                                log.audit('total_qty', total_qty);
                                if (Number(total_qty) == 0) {
                                    ia_info[i].warehouse_fee = ewf[j].amount;
                                } else {
                                    ia_info[i].warehouse_fee = interface.accMul(ia_info[i].sn_quantity, avg_rate);
                                }
                            }
                        }
                    }
                    log.audit('ia_info3', ia_info);
                    const result = calculateWarehouseFeeByLineNo(ia_info);
                    log.audit('result', result);
                    let warehouse_fee_total = 0;
                    for (let i = 0; i < line; i++) {
                        let line_no = rec.getSublistValue({ sublistId: 'inventory', fieldId: 'line', line: i });
                        log.audit('warehouse_fee_amount', result[line_no]);
                        warehouse_fee_total = interface.accAdd(warehouse_fee_total, Number(result[line_no] || 0).toFixed(2));
                        rec.setSublistValue({ sublistId: 'inventory', fieldId: 'custcol_swc_warehouse_fee', value: Number(result[line_no]).toFixed(2), line: i });
                    }

                    rec.setValue({ fieldId: 'custbody_swc_calculate_warehouse_fee', value: true });
                    rec.setValue({ fieldId: 'custbody_swc_warehouse_fee_total', value: warehouse_fee_total || 0 });
                    rec.setValue({ fieldId: 'custbody_swc_warehouse_fee_currency', value: currency });
                    rec.save({ ignoreMandatoryFields: true });

                    let location_info = interface.GetLocationInfo('', ia_info[0].location);
                    for (let i = 0; i < ia_info.length; i++) {
                        let rec = record.create({ type: 'customrecord_swc_ewh_fee_day', isDynamic: false });
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
                        let id = rec.save({ ignoreMandatoryFields: true });
                        log.audit('id', id);
                    }
                }

                return

            } catch (err) {
                log.debug('map error', err)
            }
        }

        function reduce(context) {

        }

        function summarize(summary) {

        }

        function SearchEstimateWarehouseFee(data) {
            try {
                let ewf = [];
                //1.查 地点+货品+批次号 对应的仓租费总和
                let filters = [
                    ['isinactive', 'is', false],
                    'and',
                    ['custrecord_swc_ewh_fee_day_date', 'onorbefore', format.format({ value: data[0].trandate, type: 'date' })],
                    'and',
                    [
                        ['custrecord_swc_ewh_fee_day_type', 'is', '预估'],
                        'or',
                        ['custrecord_swc_ewh_fee_day_type', 'is', '差异'],
                        'or',
                        [
                            ['custrecord_swc_ewh_fee_day_type', 'is', '调整'], 'and',
                            ['custrecord_swc_ewh_fee_day_ia', 'noneof', ['@NONE@']]
                        ],
                        'or',
                        [
                            ['custrecord_swc_ewh_fee_day_type', 'is', '调拨出库'], 'and',
                            ['custrecord_swc_ewh_fee_day_if', 'noneof', ['@NONE@']]
                        ],
                        'or',
                        [
                            ['custrecord_swc_ewh_fee_day_type', 'is', '调拨入库'], 'and',
                            ['custrecord_swc_ewh_fee_day_ir', 'noneof', ['@NONE@']]
                        ],
                        'or',
                        [
                            ['custrecord_swc_ewh_fee_day_type', 'is', '销售出库'], 'and',
                            ['custrecord_swc_ewh_fee_day_if', 'noneof', ['@NONE@']]
                        ],
                        'or',
                        [
                            ['custrecord_swc_ewh_fee_day_type', 'is', '销售退货入库'], 'and',
                            ['custrecord_swc_ewh_fee_day_ir', 'noneof', ['@NONE@']]
                        ],
                        'or',
                        [
                            ['custrecord_swc_ewh_fee_day_type', 'is', '公司间采购入库'], 'and',
                            ['custrecord_swc_ewh_fee_day_if', 'noneof', ['@NONE@']]
                        ],
                        'or',
                        [
                            ['custrecord_swc_ewh_fee_day_type', 'is', '公司间销售出库'], 'and',
                            ['custrecord_swc_ewh_fee_day_if', 'noneof', ['@NONE@']]
                        ],
                    ],
                ];
                let f1 = [];
                for (let i = 0; i < data.length; i++) {
                    if (f1.length > 0) {
                        f1.push('or')
                    }
                    f1.push([
                        ['custrecord_swc_ewh_fee_day_sku', 'anyof', data[i].item_id], 'and',
                        ['custrecord_swc_ewh_fee_day_warehouse', 'anyof', data[i].location], 'and',
                        ['custrecord_swc_ewh_fee_day_lot', 'is', data[i].serialnumber]
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
                        { name: 'custrecord_swc_ewh_fee_day_warehouse', summary: 'GROUP' },
                        { name: 'custrecord_swc_ewh_fee_day_sku', summary: 'GROUP' },
                        { name: 'custrecord_swc_ewh_fee_day_lot', summary: 'GROUP' },
                        { name: 'custrecord_swc_ewh_fee_day_currency', summary: 'GROUP' },
                        { name: 'custrecord_swc_ewh_fee_day_fee', summary: 'SUM' },
                    ]
                }).run().each(function (rec) {
                    ewf.push({
                        warehouse_id: rec.getValue(rec.columns[0]),
                        sku_id: rec.getValue(rec.columns[1]),
                        lot_number: rec.getValue(rec.columns[2]),
                        currency: rec.getValue(rec.columns[3]),
                        amount: rec.getValue(rec.columns[4]),
                        remaining_quantity: 0,
                        zoro_quantity: 0,
                    });
                    return true;
                });
                log.audit('ewf1', ewf);

                //2.有效剩余数量 = 当前库存结余 + 未处理仓租出库的数量（货品履行+库存调整）
                //查询当前库存结余
                let filters_in = [], sn_info = [];
                for (let i = 0; i < data.length; i++) {
                    if (filters_in.length) {
                        filters_in.push('or')
                    }
                    filters_in.push([
                        ['item', 'anyof', data[i].item_id], 'and',
                        ['location', 'anyof', data[i].location], 'and',
                        ['inventorynumber', 'is', data[i].serialnumber]
                    ]);
                }
                search.create({
                    type: 'inventorynumber',
                    filters: filters_in,
                    columns: [
                        { name: 'inventorynumber' },
                        { name: 'item' },
                        { name: 'location' },
                        { name: 'quantityonhand' },
                    ]
                }).run().each(function (e) {
                    sn_info.push({
                        inventorynumber: e.getValue(e.columns[0]),
                        item_id: e.getValue(e.columns[1]),
                        location_id: e.getValue(e.columns[2]),
                        quantity: e.getValue(e.columns[3]),
                    })
                    return true
                })
                log.audit('sn_info', sn_info);
                for (let i = 0; i < ewf.length; i++) {
                    for (let j = 0; j < sn_info.length; j++) {
                        if (ewf[i].warehouse_id == sn_info[j].location_id && ewf[i].sku_id == sn_info[j].item_id && ewf[i].lot_number == sn_info[j].inventorynumber) {
                            ewf[i].remaining_quantity = interface.accAdd(ewf[i].remaining_quantity, sn_info[j].quantity);
                        }
                    }
                }

                //查 未处理仓租出库的数量（货品履行+库存调整）
                let ifia_info = [];
                let filters_ifia = [
                    ['mainline', 'is', false], 'and',
                    ['type', 'anyof', ['InvAdjst', 'ItemShip']], 'and',
                    ['custbody_swc_calculate_warehouse_fee', 'is', false],
                ];
                let f2 = [];
                for (let i = 0; i < data.length; i++) {
                    if (f2.length > 0) {
                        f2.push('or')
                    }
                    f2.push([
                        ['item', 'anyof', data[i].item_id], 'and',
                        ['location', 'anyof', data[i].location], 'and',
                        ['serialnumber', 'is', data[i].serialnumber]
                    ]);
                };
                if (f2.length) {
                    filters_ifia.push('and');
                    filters_ifia.push(f2);
                }
                log.audit('filters_ifia', filters_ifia);
                search.create({
                    type: 'transaction',
                    filters: filters_ifia,
                    columns: [
                        { name: 'item' },
                        { name: 'location' },
                        { name: 'serialnumber' },
                        { name: "serialnumberquantity" }
                    ]
                }).run().each(function (rec) {
                    if (Number(rec.getValue(rec.columns[3])) < 0) {
                        ifia_info.push({
                            item_id: rec.getValue(rec.columns[0]),
                            location_id: rec.getValue(rec.columns[1]),
                            serialnumber: rec.getValue(rec.columns[2]),
                            serialnumberquantity: rec.getValue(rec.columns[3]),
                        });
                    }
                    return true;
                });
                ifia_info = mergeData(ifia_info)
                log.audit('ifia_info', ifia_info);
                for (let i = 0; i < ewf.length; i++) {
                    for (let j = 0; j < ifia_info.length; j++) {
                        if (ewf[i].warehouse_id == ifia_info[j].location_id && ewf[i].sku_id == ifia_info[j].item_id && ewf[i].lot_number == ifia_info[j].serialnumber) {
                            ewf[i].remaining_quantity = interface.accAdd(ewf[i].remaining_quantity, Math.abs(ifia_info[j].serialnumberquantity));
                        }
                    }
                }


                //查询判断最后一笔出库费用：
                // 1.查日期出库当前之前的事务处理出入库总和
                // 2.查记录表出库当天的出库总和
                // 3.结余 = 前期出库人总和 + 当天仓租记录总和 + 本次出库数量
                //查货品、批次、仓库对应的入库数量总和
                let transaction_info = [];

                let items = [], locations = [];
                let fils2 = [];
                for (let i = 0; i < data.length; i++) {
                    items.push(data[i].item_id);
                    locations.push(data[i].location);
                    fils2.push(['serialnumber', 'is', data[i].serialnumber])
                    if (i < data.length - 1) {
                        fils2.push('or')
                    }
                }
                items = [...new Set(items)];
                locations = [...new Set(locations)];
                let fils1 = [
                    [
                        ['taxline', 'is', 'false'], 'and',
                        ['shipping', 'is', 'false'], 'and',
                        ['item', 'anyof', items], 'and',
                        ['location', 'anyof', locations], 'and',
                        ['trandate', 'before', format.format({ value: data[0].trandate, type: 'date' })], 'and',//当天之前的每天出入库数量
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
                        { name: "item", summary: "GROUP" },
                        { name: "location", summary: "GROUP" },
                        { name: "serialnumber", summary: "GROUP" },
                        { name: "serialnumberquantity", summary: "SUM" }
                    ]
                }).run().each(function (e) {
                    transaction_info.push({
                        item_id: e.getValue(e.columns[0]),
                        location_id: e.getValue(e.columns[1]),
                        serialnumber: e.getValue(e.columns[2]),
                        qty: e.getValue(e.columns[3]),
                    });
                    return true;
                });
                log.audit('transaction_info', transaction_info);

                let ewf_2 = [];
                let filters_2 = [
                    ['isinactive', 'is', false],
                    'and',
                    ['custrecord_swc_ewh_fee_day_quantity', 'lessthan', ['0']],
                    'and',
                    ['custrecord_swc_ewh_fee_day_date', 'on', format.format({ value: data[0].trandate, type: 'date' })],
                    'and',
                    [
                        [
                            ['custrecord_swc_ewh_fee_day_type', 'is', '调整'], 'and',
                            ['custrecord_swc_ewh_fee_day_ia', 'noneof', ['@NONE@']]
                        ],
                        'or',
                        [
                            ['custrecord_swc_ewh_fee_day_type', 'is', '调拨出库'], 'and',
                            ['custrecord_swc_ewh_fee_day_if', 'noneof', ['@NONE@']]
                        ],
                        'or',
                        [
                            ['custrecord_swc_ewh_fee_day_type', 'is', '销售出库'], 'and',
                            ['custrecord_swc_ewh_fee_day_if', 'noneof', ['@NONE@']]
                        ],
                        'or',
                        [
                            ['custrecord_swc_ewh_fee_day_type', 'is', '公司间销售出库'], 'and',
                            ['custrecord_swc_ewh_fee_day_if', 'noneof', ['@NONE@']]
                        ],
                    ],
                ];
                let f_2 = [];
                for (let i = 0; i < data.length; i++) {
                    if (f_2.length > 0) {
                        f_2.push('or')
                    }
                    f_2.push([
                        ['custrecord_swc_ewh_fee_day_sku', 'anyof', data[i].item_id], 'and',
                        ['custrecord_swc_ewh_fee_day_warehouse', 'anyof', data[i].location], 'and',
                        ['custrecord_swc_ewh_fee_day_lot', 'is', data[i].serialnumber]
                    ]);
                };
                if (f_2.length) {
                    filters_2.push('and');
                    filters_2.push(f_2);
                }
                log.audit('filters_2', filters_2);
                search.create({
                    type: 'customrecord_swc_ewh_fee_day',
                    filters: filters_2,
                    columns: [
                        { name: 'custrecord_swc_ewh_fee_day_warehouse', summary: 'GROUP' },
                        { name: 'custrecord_swc_ewh_fee_day_sku', summary: 'GROUP' },
                        { name: 'custrecord_swc_ewh_fee_day_lot', summary: 'GROUP' },
                        { name: 'custrecord_swc_ewh_fee_day_quantity', summary: 'SUM' },
                    ]
                }).run().each(function (rec) {
                    ewf_2.push({
                        warehouse_id: rec.getValue(rec.columns[0]),
                        sku_id: rec.getValue(rec.columns[1]),
                        lot_number: rec.getValue(rec.columns[2]),
                        qty: rec.getValue(rec.columns[3]),
                    });
                    return true;
                });


                log.audit('ewf_2', ewf_2);
                for (let i = 0; i < transaction_info.length; i++) {
                    for (let j = 0; j < ewf_2.length; j++) {
                        if (transaction_info[i].item_id == ewf_2[j].sku_id && transaction_info[i].location_id == ewf_2[j].serialnumber && transaction_info[i].item_id == ewf_2[j].lot_number) {
                            transaction_info[i].qty = interface.accAdd(transaction_info[i].qty, ewf_2[j].qty);
                        }
                    }
                }
                for (let i = 0; i < ewf.length; i++) {
                    for (let j = 0; j < transaction_info.length; j++) {
                        if (ewf[i].sku_id == transaction_info[j].item_id && ewf[i].warehouse_id == transaction_info[j].location_id && ewf[i].lot_number == transaction_info[j].serialnumber) {
                            ewf[i].zoro_quantity = interface.accAdd(ewf[i].zoro_quantity, transaction_info[j].qty)
                        }
                    }
                }

                return ewf;
            } catch (error) {
                log.error('SearchEstimateWarehouseFee error', error);
                throw error;
            }
        }

        function GetEstimateWarehouseFee(if_info) {
            try {
                let ewf = [];
                let filters = [
                    ['isinactive', 'is', false],
                    'and',
                    [
                        ['custrecord_swc_ewh_fee_day_type', 'is', '预估'],
                        'or',
                        ['custrecord_swc_ewh_fee_day_type', 'is', '差异'],
                        'or',
                        ['custrecord_swc_ewh_fee_day_type', 'is', '调拨入库'],
                        'or',
                        ['custrecord_swc_ewh_fee_day_type', 'is', '销售退货入库'],
                        'or',
                        ['custrecord_swc_ewh_fee_day_type', 'is', '公司间采购入库'],
                    ],
                    'and',
                    ['custrecord_swc_ewh_fee_day_date', 'onorbefore', format.format({ value: if_info[0].trandate, type: 'date' })],
                ];
                let f1 = [];
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
                        date_count: getDaysDifference(if_info[0].trandate, rec.getValue(rec.columns[0])),
                        currency: rec.getValue(rec.columns[8]),
                    });
                    return true;
                });
                log.audit('ewf1', ewf);


                //查仓租日记录出库总和
                let ewf_1 = [];
                let filters1 = [
                    ['isinactive', 'is', false], 'and',
                    ['custrecord_swc_ewh_fee_day_quantity', 'lessthan', ['0']], 'and',
                    ['custrecord_swc_ewh_fee_day_date', 'onorbefore', format.format({ value: if_info[0].trandate, type: 'date' })],
                ];
                let f1_1 = [];
                for (let i = 0; i < if_info.length; i++) {
                    if (f1_1.length > 0) {
                        f1_1.push('or')
                    }
                    f1_1.push([
                        ['custrecord_swc_ewh_fee_day_sku', 'anyof', if_info[i].item_id], 'and',
                        ['custrecord_swc_ewh_fee_day_warehouse', 'anyof', if_info[i].location], 'and',
                        ['custrecord_swc_ewh_fee_day_lot', 'is', if_info[i].serialnumber]
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
                        { name: 'custrecord_swc_ewh_fee_day_fee', summary: 'SUM' },
                    ]
                }).run().each(function (rec) {
                    ewf_1.push({
                        warehouse_id: rec.getValue(rec.columns[0]),
                        sku_id: rec.getValue(rec.columns[1]),
                        lot_number: rec.getValue(rec.columns[2]),
                        quantity: rec.getValue(rec.columns[3]),
                        amount: rec.getValue(rec.columns[4]),
                    });
                    return true;
                });
                log.audit('ewf_1', ewf_1);




                //查货品、批次、仓库对应的入库数量总和
                let inbound_info = [];

                let items = [], locations = [];
                let fils2 = [];
                for (let i = 0; i < if_info.length; i++) {
                    items.push(if_info[i].item_id);
                    locations.push(if_info[i].location);
                    // sn_ids.push(if_info[i].sn_id);

                    fils2.push(['serialnumber', 'is', if_info[i].serialnumber])
                    if (i < if_info.length - 1) {
                        fils2.push('or')
                    }

                }
                items = [...new Set(items)];
                locations = [...new Set(locations)];
                let fils1 = [
                    [
                        ['taxline', 'is', 'false'], 'and',
                        ['shipping', 'is', 'false'], 'and',
                        ['item', 'anyof', items], 'and',
                        ['location', 'anyof', locations], 'and',
                        ['trandate', 'onorbefore', format.format({ value: if_info[0].trandate, type: 'date' })], 'and',//当天之后的每天出入库数量之和
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
                        if (ewf[i].sku_id == result_info[j].item_id && ewf[i].warehouse_id == result_info[j].location_id && ewf[i].lot_number == result_info[j].serialnumber) {
                            ewf[i].quantity = result_info[j].qty;
                        }
                    }
                }
                log.audit('ewf_2', ewf);

                for (let i = 0; i < ewf.length; i++) {
                    for (let j = 0; j < ewf_1.length; j++) {
                        if (ewf[i].warehouse_id == ewf_1[j].warehouse_id || ewf[i].sku_id == ewf_1[j].sku_id || ewf[i].lot_number == ewf_1[j].lot_number) {
                            ewf[i].quantity = interface.accAdd(ewf[i].quantity, ewf_1[j].quantity);
                            ewf[i].amount = interface.accAdd(ewf[i].amount, ewf_1[j].amount);
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
                const key = item.location_id + '-' + item.item_id + '-' + item.serialnumber;

                if (map[key]) {
                    // 已存在 → 累加 qty
                    map[key].serialnumberquantity = interface.accAdd(map[key].serialnumberquantity, item.serialnumberquantity);
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
            let groupResult = data.reduce((acc, item) => {
                let lineNo = item.line_no;
                // 初始化分组（若不存在）
                if (!acc[lineNo]) {
                    acc[lineNo] = 0;
                }
                // 累加并处理浮点数精度
                acc[lineNo] = interface.accAdd(acc[lineNo], item.warehouse_fee);;
                return acc;
            }, {});

            // 第二步：格式化结果（保留2位小数，符合金额展示）
            let formattedResult = {};
            for (let lineNo in groupResult) {
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