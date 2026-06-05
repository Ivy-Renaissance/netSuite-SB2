/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @name SWC_UE_BATCH_TRACKING.js
 * @author ZJG
 * @description 成本还原-批次跟踪
 */
define(['N/record', 'N/search', '../common/moment', '../common/interface', 'N/runtime', 'N/error', 'N/currency'],

    function (record, search, moment, interface, runtime, error, currency) {

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        function beforeLoad(scriptContext) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {
            var newRecord = scriptContext.newRecord;
            if (scriptContext.type == 'delete') {
                log.audit('beforeSubmit delete', newRecord.id);
                //日记账处理
                DeleteJour(newRecord.id);
                DeleteData(newRecord.id);
            }
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {
            try {
                var type = scriptContext.type;
                log.audit('afterSubmit type', type);
                var newRecord = scriptContext.newRecord;
                log.audit('newRecord.type', newRecord.type);
                log.audit('newRecord.id', newRecord.id);
                log.audit('RemainingUsage 1', runtime.getCurrentScript().getRemainingUsage());
                if (type == 'delete') {
                    // log.audit('delete', id);
                    // if (newRecord.type == 'itemfulfillment') {
                    //     var ordertype = newRecord.getValue('ordertype');
                    //     if (ordertype == 'SalesOrd') {
                    //         //日记账处理
                    //         DeleteJour(newRecord.id);
                    //     }
                    // }
                    // DeleteData(newRecord.id)
                    return
                }
                var feeFieldMap = [];
                search.create({
                    type: 'customrecord_swc_costcategory_map_feild',
                    filters: [
                        { name: 'custrecord_swc_cmf_costcategory', operator: 'noneof', values: ['@NONE@'] },
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
                    });
                    return true;
                });
                newRecord = record.load({ type: newRecord.type, id: newRecord.id });
                if (newRecord.type == 'itemreceipt') {
                    var ordertype = newRecord.getValue('ordertype');
                    var currency_id = newRecord.getValue('currency');
                    var subsidiary = newRecord.getValue('subsidiary');
                    var trandate = newRecord.getValue('trandate');
                    var createdfrom = newRecord.getValue('createdfrom');
                    var itemfulfillment = newRecord.getValue('itemfulfillment');
                    var c_transaction_type = ''; //成本还原-事务处理类型
                    log.audit('ordertype', ordertype);
                    log.audit('itemfulfillment', itemfulfillment);
                    var if_data = [];

                    if (ordertype == 'PurchOrd') {
                        var poResult = search.lookupFields({ type: 'purchaseorder', id: createdfrom, columns: ['intercotransaction'] });
                        log.audit('poResult', poResult);
                        if (poResult.intercotransaction) {
                            c_transaction_type = '3'; //公司间交易

                            search.create({
                                type: 'itemfulfillment',
                                filters: [
                                    { name: 'createdfrom', operator: 'is', values: poResult.intercotransaction },
                                ]
                            }).run().each(function (if_rec) {
                                itemfulfillment = if_rec.id;
                            });
                            log.audit('itemfulfillment', itemfulfillment);

                            if (itemfulfillment) {
                                search.create({
                                    type: 'itemfulfillment',
                                    filters: [
                                        { name: 'internalId', operator: 'is', values: itemfulfillment },
                                        { name: 'cogs', operator: 'is', values: true },
                                        { name: 'serialnumber', operator: 'isnotempty', values: '' },
                                    ],
                                    columns: [
                                        // { name: 'item' },
                                        // { name: 'location' },
                                        // { name: 'quantity' },
                                        // { name: 'serialnumber' },
                                        // { name: 'serialnumberquantity' },
                                        { name: 'custcol_swc_store' },
                                        { name: 'custrecord_swc_location_store', join: 'location' },
                                    ]
                                }).run().each(function (rec) {
                                    if_data.push({
                                        id: rec.id,
                                        // trandate: trandate,
                                        // currency_id: currency_id,
                                        // subsidiary: subsidiary,
                                        // item_id: rec.getValue('item'),
                                        // location_id: rec.getValue('location'),
                                        // quantity: rec.getValue('quantity'),
                                        // s_quantity: rec.getValue('serialnumberquantity'),
                                        // serinalnumber_text: rec.getValue('serialnumber'),
                                        store: rec.getValue('custcol_swc_store') ? rec.getValue('custcol_swc_store') : rec.getValue({ name: 'custrecord_swc_location_store', join: 'location' }),
                                    });
                                    return true;
                                });
                                log.audit('if_data', if_data);
                            }

                        } else {
                            c_transaction_type = '1'; //国内采购入库
                        }
                    } else if (ordertype == 'TrnfrOrd') {
                        // c_transaction_type = newRecord.getValue('custbody_swc_cb_transaction_type');
                        // if (!c_transaction_type) {
                        //     var toResult = search.lookupFields({ type: 'transferorder', id: createdfrom, columns: ['custbody_swc_cb_transaction_type'] });
                        //     log.audit('toResult', toResult);
                        //     if (toResult['custbody_swc_cb_transaction_type'].length) {
                        //         c_transaction_type = toResult['custbody_swc_cb_transaction_type'][0].value;
                        //     }
                        //     log.audit('c_transaction_type', c_transaction_type);
                        // }
                        c_transaction_type = '9';

                        if (itemfulfillment) {
                            search.create({
                                type: 'itemfulfillment',
                                filters: [
                                    { name: 'internalId', operator: 'is', values: itemfulfillment },
                                    { name: 'cogs', operator: 'is', values: true },
                                    { name: 'serialnumber', operator: 'isnotempty', values: '' },
                                ],
                                columns: [
                                    // { name: 'item' },
                                    // { name: 'location' },
                                    // { name: 'quantity' },
                                    // { name: 'serialnumber' },
                                    // { name: 'serialnumberquantity' },
                                    { name: 'custcol_swc_store' },
                                    { name: 'custrecord_swc_location_store', join: 'location' },
                                ]
                            }).run().each(function (rec) {
                                if_data.push({
                                    id: rec.id,
                                    // trandate: trandate,
                                    // currency_id: currency_id,
                                    // subsidiary: subsidiary,
                                    // item_id: rec.getValue('item'),
                                    // location_id: rec.getValue('location'),
                                    // quantity: rec.getValue('quantity'),
                                    // s_quantity: rec.getValue('serialnumberquantity'),
                                    // serinalnumber_text: rec.getValue('serialnumber'),
                                    store: rec.getValue('custcol_swc_store') ? rec.getValue('custcol_swc_store') : rec.getValue({ name: 'custrecord_swc_location_store', join: 'location' }),
                                });
                                return true;
                            });
                            log.audit('if_data', if_data);
                        }


                    } else if (ordertype == 'RtnAuth') {
                        c_transaction_type = '5'; //退货入库
                    } else {
                        throw '创建自非采购单、非转移单';
                    }

                    const lineCount = newRecord.getLineCount({ sublistId: 'item' });
                    log.audit('lineCount', lineCount);
                    var data = [], flag_store = false, o_if_sns = [];
                    for (var i = 0; i < lineCount; i++) {
                        var item = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                        var location = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i });
                        var quantity = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                        var l_rate = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });
                        var store = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_store', line: i });
                        var original_if_serialnumber = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_original_if_serialnumber', line: i });
                        if (!store) {
                            flag_store = true
                        }
                        if (original_if_serialnumber) {
                            o_if_sns.push(original_if_serialnumber);
                        }
                        var inventorydetailavail = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetailavail', line: i });
                        var inventorydetailreq = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetailreq', line: i });
                        var landedcostset = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'landedcostset', line: i });
                        log.audit('inventorydetai & landedcostset', {
                            inventorydetailavail: inventorydetailavail,
                            inventorydetailreq: inventorydetailreq,
                            landedcostset: landedcostset,
                        });
                        if (inventorydetailavail == 'T' && inventorydetailreq == 'T') {
                            var id_subrec = newRecord.getSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail', line: i });
                            // log.audit('id_subrec', id_subrec);
                            for (var j = 0; j < id_subrec.getLineCount({ sublistId: 'inventoryassignment' }); j++) {
                                var s_quantity = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j });
                                var serinalnumber = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'numberedrecordid', line: j });
                                // var receiptinventorynumber = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', line: j });

                                var lc_data = [];
                                if (landedcostset == 'T') {
                                    var lc_subrec = newRecord.getSublistSubrecord({ sublistId: 'item', fieldId: 'landedcost', line: i });
                                    // log.audit('lc_subrec', lc_subrec);
                                    for (var k = 0; k < lc_subrec.getLineCount({ sublistId: 'landedcostdata' }); k++) {
                                        var costcategory = lc_subrec.getSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', line: k });
                                        var costcategory_text = lc_subrec.getSublistText({ sublistId: 'landedcostdata', fieldId: 'costcategory', line: k });
                                        var lc_amount = lc_subrec.getSublistValue({ sublistId: 'landedcostdata', fieldId: 'amount', line: k });
                                        lc_data.push({
                                            costcategory: costcategory,
                                            costcategory_text: costcategory_text,
                                            amount: interface.accDiv(interface.accMul(interface.accDiv(s_quantity, quantity), lc_amount), s_quantity),
                                        });
                                    }
                                }
                                for (let lc = 0; lc < lc_data.length; lc++) {
                                    for (let fm = 0; fm < feeFieldMap.length; fm++) {
                                        if (lc_data[lc].costcategory == feeFieldMap[fm].costcategory) {
                                            lc_data[lc].bt_filed = feeFieldMap[fm].bt_filed;
                                        }
                                    }
                                }
                                // if (lc_data.length) {
                                data.push({
                                    id: newRecord.id,
                                    trandate: trandate,
                                    store: store,
                                    c_transaction_type: c_transaction_type,
                                    currency_id: currency_id,
                                    subsidiary: subsidiary,
                                    item_id: item,
                                    location_id: location,
                                    quantity: quantity,
                                    l_rate: l_rate,
                                    s_quantity: s_quantity,
                                    serinalnumber: serinalnumber,
                                    original_if_serialnumber: original_if_serialnumber,
                                    if_id: '',
                                    // receiptinventorynumber: receiptinventorynumber,
                                    lc_data: lc_data,
                                });
                                // } else {
                                //     if (c_transaction_type == '3') {
                                //         data.push({
                                //             id: newRecord.id,
                                //             trandate: trandate,
                                //             c_transaction_type: c_transaction_type,
                                //             currency_id: currency_id,
                                //             subsidiary: subsidiary,
                                //             item_id: item,
                                //             location_id: location,
                                //             quantity: quantity,
                                //             l_rate: l_rate,
                                //             s_quantity: s_quantity,
                                //             serinalnumber: serinalnumber,
                                //             lc_data: lc_data,
                                //         });
                                //     }
                                // }
                            }
                        }
                    }
                    if (flag_store) {
                        var location_store;
                        search.create({
                            type: 'location',
                            filters: [
                                { name: 'internalId', operator: 'is', values: data[0].location_id },
                            ],
                            columns: [
                                { name: 'custrecord_swc_location_store' },
                            ]
                        }).run().each(function (rec) {
                            location_store = rec.getValue('custrecord_swc_location_store');
                        });
                        if (!location_store) {
                            throw newRecord.id + '：无备货维度,不处理';
                        }
                        for (let i = 0; i < data.length; i++) {
                            if (!data[i].store) {
                                data[i].store = location_store;
                            }
                        }
                    }
                    if (if_data.length) {
                        if (if_data[0].store != data[0].store) {
                            var if_data_bt = searchIFBatchTracking(itemfulfillment, feeFieldMap);
                            log.audit('if_data_bt', if_data_bt);
                            for (let i = 0; i < data.length; i++) {
                                for (let j = 0; j < if_data_bt.length; j++) {
                                    if (data[i].item_id == if_data_bt[j].custrecord_swc_bt_sku && data[i].serinalnumber == if_data_bt[j].custrecord_swc_bt_batch) {
                                        var ir_lc_data = data[i].lc_data;
                                        var if_lc_data = if_data_bt[i].lc_data;
                                        for (let m = 0; m < if_lc_data.length; m++) {
                                            if (Number(if_lc_data[m].amount)) {
                                                var flag_1 = true;
                                                for (let n = 0; n < ir_lc_data.length; n++) {
                                                    if (if_lc_data[m].costcategory == ir_lc_data[n].costcategory) {
                                                        ir_lc_data[n].amount = interface.accAdd(ir_lc_data[n].amount, Math.abs(if_lc_data[m].amount));
                                                        flag_1 = false;
                                                        break;
                                                    }
                                                }
                                                if (flag_1) {
                                                    ir_lc_data.push({
                                                        costcategory: if_lc_data[m].costcategory,
                                                        amount: Math.abs(if_lc_data[m].amount),
                                                    });
                                                }
                                            }
                                        }
                                        data[i].lc_data = ir_lc_data;
                                    }
                                }
                            }
                        }
                    }

                    if (ordertype == 'RtnAuth') {
                        if (o_if_sns.length) {
                            var raResult = search.lookupFields({ type: 'returnauthorization', id: createdfrom, columns: ['createdfrom'] });
                            log.audit('raResult', raResult);
                            if (raResult['createdfrom'].length) {
                                let if_ids = [];
                                let so_id = raResult['createdfrom'][0].value;
                                let if_filters = [
                                    ['createdfrom', 'anyof', so_id]
                                ]
                                let f1 = [];
                                for (let i = 0; i < data.length; i++) {
                                    if (f1.length) {
                                        f1.push('or')
                                    }
                                    f1.push([
                                        ['item', 'anyof', data[i].item_id], 'and',
                                        ['serialnumber', 'is', data[i].original_if_serialnumber]
                                    ])
                                }
                                if_filters.push('and', f1);
                                log.audit('if_filters', if_filters);
                                search.create({
                                    type: 'itemfulfillment',
                                    filters: if_filters,
                                    columns: [
                                        { name: 'internalId' }
                                    ]
                                }).run().each(function (a) {
                                    if_ids.push(a.id);
                                    return true;
                                });
                                log.audit('if_ids', if_ids);
                                if (if_ids.length) {
                                    if_ids = [...new Set(if_ids)];
                                    for (let ii = 0; ii < if_ids.length; ii++) {
                                        let if_data_bt = searchIFBatchTracking(if_ids[ii], feeFieldMap);
                                        log.audit('if_data_bt', if_data_bt);
                                        for (let i = 0; i < data.length; i++) {
                                            for (let j = 0; j < if_data_bt.length; j++) {
                                                if (!data[i].if_id && data[i].item_id == if_data_bt[j].custrecord_swc_bt_sku && data[i].original_if_serialnumber == if_data_bt[j].custrecord_swc_bt_batch_text) {
                                                    var ir_lc_data = data[i].lc_data;
                                                    var if_lc_data = if_data_bt[i].lc_data;
                                                    for (let m = 0; m < if_lc_data.length; m++) {
                                                        if (Number(if_lc_data[m].amount)) {
                                                            var flag_1 = true;
                                                            for (let n = 0; n < ir_lc_data.length; n++) {
                                                                if (if_lc_data[m].costcategory == ir_lc_data[n].costcategory) {
                                                                    ir_lc_data[n].amount = interface.accAdd(ir_lc_data[n].amount, Math.abs(if_lc_data[m].amount));
                                                                    flag_1 = false;
                                                                    break;
                                                                }
                                                            }
                                                            if (flag_1) {
                                                                ir_lc_data.push({
                                                                    costcategory: if_lc_data[m].costcategory,
                                                                    amount: Math.abs(if_lc_data[m].amount),
                                                                });
                                                            }
                                                        }
                                                    }
                                                    data[i].lc_data = ir_lc_data;
                                                    data[i].if_id = if_ids[ii];
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    return
                                }
                            } else {
                                return
                            }
                        } else {
                            return
                        }
                    }

                    log.audit('RemainingUsage 2', runtime.getCurrentScript().getRemainingUsage());

                    log.audit('data', data);
                    log.audit('data length', data.length);
                    if (data.length) {
                        // if (data.length > 150) {

                        // } else {
                        batchTracking(newRecord.id, data, feeFieldMap);
                        // }
                    }

                    log.audit('RemainingUsage 3', runtime.getCurrentScript().getRemainingUsage());
                }
                else if (newRecord.type == 'itemfulfillment') {
                    var ordertype = newRecord.getValue('ordertype');
                    var currency_id = newRecord.getValue('currency');
                    var subsidiary = newRecord.getValue('subsidiary');
                    var trandate = newRecord.getValue('trandate');
                    var createdfrom = newRecord.getValue('createdfrom');
                    var shipstatus = newRecord.getValue('shipstatus');
                    var c_transaction_type = '8'; //成本还原-事务处理类型  货品履行
                    log.audit('ordertype', ordertype);
                    log.audit('shipstatus', shipstatus);
                    if (ordertype == 'SalesOrd' || ordertype == 'TrnfrOrd') {
                        if (ordertype == 'TrnfrOrd') {
                            let f_location_store = '', t_location_store = '';
                            search.create({
                                type: 'transferorder',
                                filters: [
                                    { name: 'mainline', operator: 'is', values: true },
                                    { name: 'internalId', operator: 'anyof', values: createdfrom },
                                ],
                                columns: [
                                    { name: 'custrecord_swc_location_store', join: 'location' },
                                    { name: 'custrecord_swc_location_store', join: 'toLocation' },
                                ]
                            }).run().each(function (a) {
                                f_location_store = a.getValue(a.columns[0]);
                                t_location_store = a.getValue(a.columns[1]);
                            });
                            log.audit('f_location_store', f_location_store);
                            log.audit('t_location_store', t_location_store);
                            if (f_location_store == t_location_store) {
                                return
                            }
                        }
                        // var soResult = search.lookupFields({ type: 'salesorder', id: createdfrom, columns: ['intercotransaction'] });
                        // log.audit('soResult', soResult);
                        // if (soResult.intercotransaction) {
                        //     //公司间交易
                        //     // c_transaction_type = '3'; //公司间交易
                        // } else {
                        //     // c_transaction_type = '1'; //国内采购入库
                        // }
                        if (shipstatus == 'C' || !shipstatus) {

                            var sbResult = search.lookupFields({ type: 'subsidiary', id: subsidiary, columns: ['currency'] });
                            log.audit('sbResult', sbResult);
                            if (sbResult['currency'].length) {
                                currency_id = sbResult['currency'][0].value;
                            }

                            const lineCount = newRecord.getLineCount({ sublistId: 'item' });
                            log.audit('lineCount', lineCount);
                            var data = [], flag_store = false, bt_cy_rate = [];

                            // search.create({
                            //     type: newRecord.type,
                            //     filters: [
                            //         { name: 'internalId', operator: 'is', values: newRecord.id },
                            //         { name: 'cogs', operator: 'is', values: true },
                            //         { name: 'serialnumber', operator: 'isnotempty', values: '' },
                            //     ],
                            //     columns: [
                            //         { name: 'item' },
                            //         { name: 'location' },
                            //         { name: 'quantity' },
                            //         { name: 'serialnumber' },
                            //         { name: 'serialnumberquantity' },
                            //         // { name: 'serialnumbercost' },
                            //     ]
                            // }).run().each(function (rec) {
                            //     data.push({
                            //         id: newRecord.id,
                            //         trandate: trandate,
                            //         c_transaction_type: c_transaction_type,
                            //         currency_id: currency_id,
                            //         subsidiary: subsidiary,
                            //         item_id: rec.getValue('item'),
                            //         location_id: rec.getValue('location'),
                            //         quantity: rec.getValue('quantity'),
                            //         // if_amount: rec.getValue('serialnumbercost'),
                            //         s_quantity: rec.getValue('serialnumberquantity'),
                            //         serinalnumber: rec.getValue('serialnumber'),
                            //         l_rate: 0,
                            //         lc_data: [],
                            //     });
                            //     return true;
                            // });

                            for (var i = 0; i < lineCount; i++) {
                                var item = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                                var location = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i });
                                var quantity = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                                var store = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_store', line: i });
                                if (!store) {
                                    flag_store = true
                                }
                                var inventorydetailavail = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetailavail', line: i });
                                var inventorydetailreq = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetailreq', line: i });
                                log.audit('inventorydetai', {
                                    inventorydetailavail: inventorydetailavail,
                                    inventorydetailreq: inventorydetailreq,
                                });
                                if (inventorydetailavail == 'T' && inventorydetailreq == 'T') {
                                    var id_subrec = newRecord.getSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail', line: i });
                                    for (var j = 0; j < id_subrec.getLineCount({ sublistId: 'inventoryassignment' }); j++) {
                                        var s_quantity = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j });
                                        var serinalnumber = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'numberedrecordid', line: j });
                                        data.push({
                                            id: newRecord.id,
                                            trandate: trandate,
                                            store: store,
                                            c_transaction_type: c_transaction_type,
                                            currency_id: currency_id,
                                            subsidiary: subsidiary,
                                            item_id: item,
                                            location_id: location,
                                            quantity: quantity,
                                            l_rate: 0,
                                            s_quantity: s_quantity,
                                            serinalnumber: serinalnumber,
                                            lc_data: [],
                                            bt_result: {},
                                        });
                                    }
                                }
                            }
                            if (flag_store) {
                                var location_store;
                                search.create({
                                    type: 'location',
                                    filters: [
                                        { name: 'internalId', operator: 'is', values: data[0].location_id },
                                    ],
                                    columns: [
                                        { name: 'custrecord_swc_location_store' },
                                    ]
                                }).run().each(function (rec) {
                                    location_store = rec.getValue('custrecord_swc_location_store');
                                });
                                for (let i = 0; i < data.length; i++) {
                                    if (!data[i].store) {
                                        data[i].store = location_store;
                                    }
                                }
                            }

                            log.audit('data', data);
                            log.audit('data length', data.length);

                            searchBatchTrackingPriceIF(data, bt_cy_rate);
                            log.audit('data2', data);
                            log.audit('bt_cy_rate2', bt_cy_rate);

                            // var exchangeRate = currency.exchangeRate({
                            //     source: data[0].bt_result.bt_currency,
                            //     target: data[0].currency_id,
                            //     date: trandate
                            // });

                            // log.audit('exchangeRate', exchangeRate);

                            for (let i = 0; i < data.length; i++) {
                                data[i].bt_cy_rate = bt_cy_rate;
                            }

                            if (data.length) {
                                // if (data.length > 150) {

                                // } else {
                                batchTracking(newRecord.id, data, feeFieldMap);
                                // }
                            }
                        }

                    }
                }
                else if (newRecord.type == 'assemblybuild') {
                    var subsidiary = newRecord.getValue('subsidiary');
                    var trandate = newRecord.getValue('trandate');
                    var location = newRecord.getValue('location');
                    var total = newRecord.getValue('total');
                    var c_transaction_type = '7'; //成本还原-事务处理类型 - 装配件

                    var sbResult = search.lookupFields({ type: 'subsidiary', id: subsidiary, columns: ['currency'] });
                    log.audit('sbResult', sbResult);
                    if (sbResult['currency'].length) {
                        currency_id = sbResult['currency'][0].value;
                    }
                    var data = [];

                    // const lineCount = newRecord.getLineCount({ sublistId: 'component' });
                    // log.audit('lineCount', lineCount);
                    // for (var i = 0; i < lineCount; i++) {
                    //     var item = newRecord.getSublistValue({ sublistId: 'component', fieldId: 'item', line: i });
                    //     var quantity = newRecord.getSublistValue({ sublistId: 'component', fieldId: 'quantity', line: i });
                    //     var l_rate = newRecord.getSublistValue({ sublistId: 'component', fieldId: 'rate', line: i });
                    //     var inventorydetailavail = newRecord.getSublistValue({ sublistId: 'component', fieldId: 'componentinventorydetailavail', line: i });
                    //     var inventorydetailreq = newRecord.getSublistValue({ sublistId: 'component', fieldId: 'componentinventorydetailreq', line: i });
                    //     log.audit('inventorydetai', {
                    //         inventorydetailavail: inventorydetailavail,
                    //         inventorydetailreq: inventorydetailreq,
                    //     });
                    //     if (inventorydetailavail == 'T' && inventorydetailreq == 'T') {
                    //         var id_subrec = newRecord.getSublistSubrecord({ sublistId: 'component', fieldId: 'componentinventorydetail', line: i });
                    //         for (var j = 0; j < id_subrec.getLineCount({ sublistId: 'inventoryassignment' }); j++) {
                    //             var s_quantity = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j });
                    //             var serinalnumber = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'numberedrecordid', line: j });

                    //             data.push({
                    //                 id: newRecord.id,
                    //                 trandate: trandate,
                    //                 c_transaction_type: c_transaction_type,
                    //                 currency_id: currency_id,
                    //                 subsidiary: subsidiary,
                    //                 item_id: item,
                    //                 location_id: location,
                    //                 quantity: quantity,
                    //                 l_rate: 0,
                    //                 s_quantity: s_quantity,
                    //                 serinalnumber: serinalnumber,
                    //                 lc_data: [],
                    //             });
                    //         }
                    //     }
                    // }
                    // log.audit('data', data);
                    // log.audit('RemainingUsage 2', runtime.getCurrentScript().getRemainingUsage());

                    //查成本还原-批次跟踪记录下对应的子配件的成本
                    // searchBatchTrackingPrice(data);
                    // log.audit('search price', data);

                    // bt_export_tax_rebate: rec.getValue('custrecord_swc_bt_export_tax_rebate') || 0,
                    // bt_po_transfer_fee: rec.getValue('custrecord_swc_bt_po_transfer_fee') || 0,
                    // bt_miscellaneous_expenses: rec.getValue('custrecord_swc_bt_miscellaneous_expenses') || 0,
                    // bt_po_other_expenses: rec.getValue('custrecord_swc_bt_po_other_expenses') || 0,

                    // var items_price = [];
                    // for (let i = 0; i < data.length; i++) {
                    //     if (items_price.length) {
                    //         var flag = false;
                    //         for (let j = 0; j < items_price.length; j++) {
                    //             if (items_price[j].item_id == data[i].item_id) {
                    //                 items_price[j].sn_amount = interface.accAdd(items_price[j].sn_amount, data[i].l_sn_amount);
                    //                 items_price[j].bt_export_tax_rebate_1 = interface.accAdd(items_price[j].bt_export_tax_rebate_1, data[i].bt_export_tax_rebate_1);
                    //                 items_price[j].bt_export_tax_rebate_1 = interface.accAdd(items_price[j].bt_export_tax_rebate_1, data[i].bt_export_tax_rebate_1);
                    //                 items_price[j].bt_miscellaneous_expenses_1 = interface.accAdd(items_price[j].bt_miscellaneous_expenses_1, data[i].bt_miscellaneous_expenses_1);
                    //                 items_price[j].bt_po_other_expenses_1 = interface.accAdd(items_price[j].bt_po_other_expenses_1, data[i].bt_po_other_expenses_1);
                    //                 flag = true;
                    //             }
                    //         }
                    //         if (!flag) {
                    //             items_price.push({
                    //                 item_id: data[i].item_id,
                    //                 item_quantity: data[i].quantity,
                    //                 sn_amount: data[i].l_sn_amount || 0,
                    //                 bt_export_tax_rebate_1: data[i].bt_export_tax_rebate_1 || 0,
                    //                 bt_po_transfer_fee_1: data[i].bt_po_transfer_fee_1 || 0,
                    //                 bt_miscellaneous_expenses_1: data[i].bt_miscellaneous_expenses_1 || 0,
                    //                 bt_po_other_expenses_1: data[i].bt_po_other_expenses_1 || 0,
                    //             });
                    //         }
                    //     } else {
                    //         items_price.push({
                    //             item_id: data[i].item_id,
                    //             item_quantity: data[i].quantity,
                    //             sn_amount: data[i].l_sn_amount || 0,
                    //             bt_export_tax_rebate_1: data[i].bt_export_tax_rebate_1 || 0,
                    //             bt_po_transfer_fee_1: data[i].bt_po_transfer_fee_1 || 0,
                    //             bt_miscellaneous_expenses_1: data[i].bt_miscellaneous_expenses_1 || 0,
                    //             bt_po_other_expenses_1: data[i].bt_po_other_expenses_1 || 0,
                    //         });
                    //     }
                    // }
                    // log.audit('items_price', items_price);
                    // var t_rate = 0, bt_export_tax_rebate = 0, bt_po_transfer_fee = 0, bt_miscellaneous_expenses = 0, bt_po_other_expenses = 0;
                    // for (let i = 0; i < items_price.length; i++) {
                    //     t_rate = interface.accAdd(interface.accDiv(items_price[i].sn_amount, items_price[i].item_quantity), t_rate);
                    //     bt_export_tax_rebate = interface.accAdd(interface.accDiv(items_price[i].bt_export_tax_rebate_1, items_price[i].item_quantity), bt_export_tax_rebate);
                    //     bt_po_transfer_fee = interface.accAdd(interface.accDiv(items_price[i].bt_po_transfer_fee_1, items_price[i].item_quantity), bt_po_transfer_fee);
                    //     bt_miscellaneous_expenses = interface.accAdd(interface.accDiv(items_price[i].bt_miscellaneous_expenses_1, items_price[i].item_quantity), bt_miscellaneous_expenses);
                    //     bt_po_other_expenses = interface.accAdd(interface.accDiv(items_price[i].bt_po_other_expenses_1, items_price[i].item_quantity), bt_po_other_expenses);
                    // }
                    // log.audit('t_rate', t_rate);

                    log.audit('inventorydetail', newRecord.getSubrecord('inventorydetail'));
                    var t_inventorydetail = newRecord.getSubrecord('inventorydetail');
                    for (var j = 0; j < t_inventorydetail.getLineCount({ sublistId: 'inventoryassignment' }); j++) {
                        var s_quantity = t_inventorydetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j });
                        var serinalnumber = t_inventorydetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'numberedrecordid', line: j });

                        data.push({
                            id: newRecord.id,
                            trandate: trandate,
                            c_transaction_type: c_transaction_type,
                            currency_id: currency_id,
                            store: '',
                            subsidiary: subsidiary,
                            item_id: newRecord.getValue('item'),
                            location_id: location,
                            quantity: newRecord.getValue('quantity'),
                            l_rate: interface.accDiv(total, newRecord.getValue('quantity')),
                            s_quantity: s_quantity,
                            serinalnumber: serinalnumber,
                            // bt_export_tax_rebate: bt_export_tax_rebate,
                            // bt_po_transfer_fee: bt_po_transfer_fee,
                            // bt_miscellaneous_expenses: bt_miscellaneous_expenses,
                            // bt_po_other_expenses: bt_po_other_expenses,
                            lc_data: [],
                        });
                    }

                    log.audit('total data', data);
                    log.audit('data length', data.length);
                    if (data.length) {
                        // if (data.length > 150) {

                        // } else {
                        batchTracking(newRecord.id, data, feeFieldMap);
                        // }
                    }
                    log.audit('RemainingUsage 3', runtime.getCurrentScript().getRemainingUsage());
                }
                else {
                    log.audit('error', '未知类型');
                }
            } catch (error) {
                log.error('afterSubmit error', error);
            }
        }

        function batchTracking(id, data, feeFieldMap) {
            var bt_data = searchBatchTracking(id, data);
            log.audit('bt_data', bt_data);
            if (bt_data.length) {
                const result = data.filter(aItem =>
                    !bt_data.some(bItem =>
                        bItem.bt_type_id == aItem.id &&
                        bItem.bt_batch == aItem.serinalnumber &&
                        bItem.bt_sku == aItem.item_id &&
                        bItem.bt_location == aItem.location_id &&
                        bItem.bt_store == aItem.store &&
                        bItem.bt_subsidiary == aItem.subsidiary
                    )
                );
                log.audit('result', result);
                if (result.length) {
                    createBatchTracking(id, result, feeFieldMap);
                }
            } else {
                createBatchTracking(id, data, feeFieldMap);
            }
        }

        function searchBatchTracking(id, data) {
            var result = [];
            var filters = [
                ['isinactive', 'is', false], 'and',
                ['custrecord_swc_bt_type_id', 'anyof', id]
            ]
            var fils = [];
            for (let i = 0; i < data.length; i++) {
                if (fils.length > 0) {
                    fils.push('or')
                }
                fils.push([
                    ['custrecord_swc_bt_subsidiary', 'anyof', data[i].subsidiary], 'and',
                    ['custrecord_swc_bt_sku', 'anyof', data[i].item_id], 'and',
                    ['custrecord_swc_bt_location', 'anyof', data[i].location_id], 'and',
                    ['custrecord_swc_bt_currency', 'anyof', data[i].currency_id], 'and',
                    ['custrecord_swc_bt_batch', 'anyof', data[i].serinalnumber]
                ]);
                if (data[i].c_transaction_type != 7) {
                    fils.push('and', ['custrecord_swc_bt_bhwd', 'anyof', data[i].store])
                }
            }
            if (fils.length > 0) {
                filters.push('and');
                filters.push(fils)
            }
            search.create({
                type: 'customrecord_swc_batch_track',
                filters: filters,
                columns: [
                    { name: 'custrecord_swc_bt_subsidiary' },
                    { name: 'custrecord_swc_bt_sku' },
                    { name: 'custrecord_swc_bt_location' },
                    { name: 'custrecord_swc_bt_batch' },
                    { name: 'custrecord_swc_bt_type_id' },
                    { name: 'custrecord_swc_bt_bhwd' },
                ]
            }).run().each(function (rec) {
                result.push({
                    bt_id: rec.id,
                    bt_subsidiary: rec.getValue('custrecord_swc_bt_subsidiary'),
                    bt_sku: rec.getValue('custrecord_swc_bt_sku'),
                    bt_location: rec.getValue('custrecord_swc_bt_location'),
                    bt_batch: rec.getValue('custrecord_swc_bt_batch'),
                    bt_type_id: rec.getValue('custrecord_swc_bt_type_id'),
                    bt_store: rec.getValue('custrecord_swc_bt_bhwd'),
                });
                return true;
            });
            return result;
        }

        function searchBatchTrackingPrice(data) {
            var result = [];
            var filters = [
                ['isinactive', 'is', false], 'and',
                ['custrecord_swc_bt_type', 'anyof', ['1']]
            ]
            var fils = [];
            for (let i = 0; i < data.length; i++) {
                if (fils.length > 0) {
                    fils.push('or')
                }
                fils.push([
                    ['custrecord_swc_bt_subsidiary', 'anyof', data[i].subsidiary], 'and',
                    ['custrecord_swc_bt_sku', 'anyof', data[i].item_id], 'and',
                    ['custrecord_swc_bt_location', 'anyof', data[i].location_id], 'and',
                    ['custrecord_swc_bt_currency', 'anyof', data[i].currency_id], 'and',
                    ['custrecord_swc_bt_batch', 'anyof', data[i].serinalnumber]
                ]);
            }
            if (fils.length > 0) {
                filters.push('and');
                filters.push(fils)
            }
            log.audit('filters', filters);

            search.create({
                type: 'customrecord_swc_batch_track',
                filters: filters,
                columns: [
                    { name: 'internalid', sort: 'DESC' },
                    { name: 'custrecord_swc_bt_subsidiary' },
                    { name: 'custrecord_swc_bt_sku' },
                    { name: 'custrecord_swc_bt_location' },
                    { name: 'custrecord_swc_bt_batch' },
                    { name: 'custrecord_swc_bt_type_id' },
                    { name: 'custrecord_swc_bt_currency' },
                    { name: 'custrecord_swc_bt_price' },
                    { name: "custrecord_swc_bt_export_tax_rebate" },//采购-出口免退税
                    { name: "custrecord_swc_bt_po_transfer_fee" },//采购-调拨费
                    { name: "custrecord_swc_bt_miscellaneous_expenses" },//采购-杂费
                    { name: "custrecord_swc_bt_po_other_expenses" },//采购-其他费用
                ]
            }).run().each(function (rec) {
                result.push({
                    bt_id: rec.id,
                    bt_subsidiary: rec.getValue('custrecord_swc_bt_subsidiary'),
                    bt_sku: rec.getValue('custrecord_swc_bt_sku'),
                    bt_location: rec.getValue('custrecord_swc_bt_location'),
                    bt_batch: rec.getValue('custrecord_swc_bt_batch'),
                    bt_type_id: rec.getValue('custrecord_swc_bt_type_id'),
                    bt_currency: rec.getValue('custrecord_swc_bt_currency'),
                    bt_price: rec.getValue('custrecord_swc_bt_price') || 0,
                    bt_export_tax_rebate: rec.getValue('custrecord_swc_bt_export_tax_rebate') || 0,
                    bt_po_transfer_fee: rec.getValue('custrecord_swc_bt_po_transfer_fee') || 0,
                    bt_miscellaneous_expenses: rec.getValue('custrecord_swc_bt_miscellaneous_expenses') || 0,
                    bt_po_other_expenses: rec.getValue('custrecord_swc_bt_po_other_expenses') || 0,

                });
                return true;
            });
            log.audit('searchBatchTrackingPrice', result);

            for (let i = 0; i < data.length; i++) {
                for (let j = 0; j < result.length; j++) {
                    if (!data[i].l_rate) {
                        if (data[i].item_id == result[j].bt_sku && data[i].subsidiary == result[j].bt_subsidiary && data[i].location_id == result[j].bt_location && data[i].currency_id == result[j].bt_currency && data[i].serinalnumber == result[j].bt_batch) {
                            data[i].l_rate = -result[j].bt_price;
                            data[i].bt_export_tax_rebate = -result[j].bt_export_tax_rebate;
                            data[i].bt_po_transfer_fee = -result[j].bt_po_transfer_fee;
                            data[i].bt_miscellaneous_expenses = -result[j].bt_miscellaneous_expenses;
                            data[i].bt_po_other_expenses = -result[j].bt_po_other_expenses;
                            data[i].bt_export_tax_rebate_1 = interface.accMul(result[j].bt_export_tax_rebate, data[i].s_quantity);
                            data[i].bt_po_transfer_fee_1 = interface.accMul(result[j].bt_po_transfer_fee, data[i].s_quantity);
                            data[i].bt_miscellaneous_expenses_1 = interface.accMul(result[j].bt_miscellaneous_expenses, data[i].s_quantity);
                            data[i].bt_po_other_expenses_1 = interface.accMul(result[j].bt_po_other_expenses, data[i].s_quantity);
                            data[i].l_sn_amount = interface.accMul(result[j].bt_price, data[i].s_quantity);
                        }
                    }
                }
            }

        }

        function searchBatchTrackingPriceIF(data, bt_cy_rate) {
            var result1 = [];
            var bt_cy_ids = [];
            var filters1 = [
                ['isinactive', 'is', false]
                , 'and',
                ['custrecord_swc_bt_type', 'noneof', ['8']]
            ]
            var fils1 = [];
            for (let i = 0; i < data.length; i++) {
                if (fils1.length > 0) {
                    fils1.push('or')
                }
                fils1.push([
                    ['custrecord_swc_bt_bhwd', 'anyof', data[i].store], 'and',
                    ['custrecord_swc_bt_sku', 'anyof', data[i].item_id], 'and',
                    ['custrecord_swc_bt_batch', 'anyof', data[i].serinalnumber]
                ]);
            }
            if (fils1.length > 0) {
                filters1.push('and');
                filters1.push(fils1)
            }
            log.audit('filters1', filters1);

            search.create({
                type: 'customrecord_swc_batch_track',
                filters: filters1,
                columns: [
                    { name: 'custrecord_swc_bt_sku', summary: 'GROUP' },
                    { name: 'custrecord_swc_bt_batch', summary: 'GROUP' },
                    { name: 'custrecord_swc_bt_bhwd', summary: 'GROUP' },
                    { name: 'custrecord_swc_bt_currency', summary: 'GROUP' },
                    { name: "custrecord_swc_bt_export_tax_rebate", summary: 'SUM' },//采购-出口免退税
                    { name: "custrecord_swc_bt_po_transfer_fee", summary: 'SUM' },//采购-调拨费
                    { name: "custrecord_swc_bt_miscellaneous_expenses", summary: 'SUM' },//采购-杂费
                    { name: "custrecord_swc_bt_po_other_expenses", summary: 'SUM' },//采购-其他费用
                    { name: "custrecord_swc_bt_domestic_trailer_fee", summary: 'SUM' },//头程-国内拖车费
                    { name: "custrecord_swc_bt_customs_clearance_fee", summary: 'SUM' },//头程-国内报关费
                    { name: "custrecord_swc_bt_domestic_port_charges", summary: 'SUM' },//头程-国内港杂费
                    { name: "custrecord_swc_bt_ocean_freight", summary: 'SUM' },//头程-海运费
                    { name: "custrecord_swc_bt_of_insurance_fee", summary: 'SUM' },//头程-海运保险费
                    { name: "custrecord_swc_bt_tariff", summary: 'SUM' },//头程-关税
                    { name: "custrecord_swc_bt_clearance_fee", summary: 'SUM' },//头程-清关手续费
                    { name: "custrecord_swc_bt_port_miscellaneous", summary: 'SUM' },//头程-目的港港杂
                    { name: "custrecord_swc_bt_port_trailer_fee", summary: 'SUM' },//头程-目的港拖车费
                    { name: "custrecord_swc_bt_abnormal_expenses", summary: 'SUM' },//头程-异常费用
                    { name: "custrecord_swc_bt_other_expenses", summary: 'SUM' },//头程-其它费用
                    { name: "custrecord_swc_bt_storage_fee", summary: 'SUM' },//库内-入库费
                    { name: "custrecord_swc_bt_rental_fee", summary: 'SUM' },//库内-仓租费（在库）
                    { name: "custrecord_swc_bt_in_fee", summary: 'SUM' },//入库操作费
                    { name: "custrecord_swc_bt_warehouse_fe", summary: 'SUM' },//入库费
                    { name: "custrecord_swc_bt_truck", summary: 'SUM' },//卡车费
                    { name: "custrecord_swc_bt_outbound_fee", summary: 'SUM' },//出库费
                ]
            }).run().each(function (rec) {
                result1.push({
                    bt_sku: rec.getValue(rec.columns[0]),
                    bt_batch: rec.getValue(rec.columns[1]),
                    bt_store: rec.getValue(rec.columns[2]),
                    bt_currency: rec.getValue(rec.columns[3]),
                    bt_export_tax_rebate: rec.getValue(rec.columns[4]) || 0,
                    bt_po_transfer_fee: rec.getValue(rec.columns[5]) || 0,
                    bt_miscellaneous_expenses: rec.getValue(rec.columns[6]) || 0,
                    bt_po_other_expenses: rec.getValue(rec.columns[7]) || 0,
                    bt_domestic_trailer_fee: rec.getValue(rec.columns[8]) || 0,
                    bt_customs_clearance_fee: rec.getValue(rec.columns[9]) || 0,
                    bt_domestic_port_charges: rec.getValue(rec.columns[10]) || 0,
                    bt_ocean_freight: rec.getValue(rec.columns[11]) || 0,
                    bt_of_insurance_fee: rec.getValue(rec.columns[12]) || 0,
                    bt_tariff: rec.getValue(rec.columns[13]) || 0,
                    bt_clearance_fee: rec.getValue(rec.columns[14]) || 0,
                    bt_port_miscellaneous: rec.getValue(rec.columns[15]) || 0,
                    bt_port_trailer_fee: rec.getValue(rec.columns[16]) || 0,
                    bt_abnormal_expenses: rec.getValue(rec.columns[17]) || 0,
                    bt_other_expenses: rec.getValue(rec.columns[18]) || 0,
                    bt_storage_fee: rec.getValue(rec.columns[19]) || 0,
                    bt_rental_fee: rec.getValue(rec.columns[20]) || 0,
                    bt_in_fee: rec.getValue(rec.columns[21]) || 0,
                    bt_warehouse_fe: rec.getValue(rec.columns[22]) || 0,
                    bt_truck: rec.getValue(rec.columns[23]) || 0,
                    bt_outbound_fee: rec.getValue(rec.columns[24]) || 0,
                });
                bt_cy_ids.push(rec.getValue(rec.columns[3]));
                return true;
            });
            log.audit('searchBatchTrackingPrice1', result1);
            log.audit('bt_cy_ids1', bt_cy_ids);

            // for (let i = 0; i < data.length; i++) {
            //     for (let j = 0; j < result1.length; j++) {
            //         if (data[i].item_id == result1[j].bt_sku && data[i].serinalnumber == result1[j].bt_batch && data[i].store == result1[j].bt_store) {
            //             // data[i].bt_result.push(result1[j]);
            //             data[i].bt_result = result1[j];
            //         }
            //     }
            // }


            var result2 = [];
            var filters2 = [
                ['isinactive', 'is', false], 'and',
                ['custrecord_swc_bt_type', 'anyof', ['1', '7', '5']]
            ]
            var fils2 = [];
            for (let i = 0; i < data.length; i++) {
                if (fils2.length > 0) {
                    fils2.push('or')
                }
                fils2.push([
                    ['custrecord_swc_bt_sku', 'anyof', data[i].item_id], 'and',
                    ['custrecord_swc_bt_batch', 'anyof', data[i].serinalnumber]
                ]);
            }
            if (fils2.length > 0) {
                filters2.push('and');
                filters2.push(fils2)
            }
            log.audit('filters2', filters2);

            search.create({
                type: 'customrecord_swc_batch_track',
                filters: filters2,
                columns: [
                    { name: 'custrecord_swc_bt_sku', summary: 'GROUP' },
                    { name: 'custrecord_swc_bt_batch', summary: 'GROUP' },
                    { name: 'custrecord_swc_bt_currency', summary: 'GROUP' },
                    { name: "custrecord_swc_bt_price", summary: 'MAX' },
                    // { name: "custrecord_swc_bt_export_tax_rebate", summary: 'SUM' },//采购-出口免退税
                    // { name: "custrecord_swc_bt_po_transfer_fee", summary: 'SUM' },//采购-调拨费
                    // { name: "custrecord_swc_bt_miscellaneous_expenses", summary: 'SUM' },//采购-杂费
                    // { name: "custrecord_swc_bt_po_other_expenses", summary: 'SUM' },//采购-其他费用
                    // { name: "custrecord_swc_bt_in_fee", summary: 'SUM' },//入库操作费
                ]
            }).run().each(function (rec) {
                result2.push({
                    bt_sku: rec.getValue(rec.columns[0]),
                    bt_batch: rec.getValue(rec.columns[1]),
                    bt_currency: rec.getValue(rec.columns[2]),
                    bt_price: rec.getValue(rec.columns[3]) || 0,
                    // bt_export_tax_rebate: rec.getValue(rec.columns[4]) || 0,
                    // bt_po_transfer_fee: rec.getValue(rec.columns[5]) || 0,
                    // bt_miscellaneous_expenses: rec.getValue(rec.columns[6]) || 0,
                    // bt_po_other_expenses: rec.getValue(rec.columns[7]) || 0,
                    // bt_in_fee: rec.getValue(rec.columns[8]) || 0,
                });
                bt_cy_ids.push(rec.getValue(rec.columns[2]));
                return true;
            });
            log.audit('searchBatchTrackingPrice2', result2);
            log.audit('bt_cy_ids2', bt_cy_ids);

            // for (let i = 0; i < data.length; i++) {
            //     for (let j = 0; j < result2.length; j++) {
            //         if (data[i].item_id == result2[j].bt_sku && data[i].serinalnumber == result2[j].bt_batch) {
            //             data[i].bt_result.bt_price = result2[j].bt_price;
            //             // data[i].bt_result.bt_currency = result2[j].bt_currency;
            //             // if (Number(data[i].bt_result.bt_export_tax_rebate) == 0) {
            //             //     data[i].bt_result.bt_export_tax_rebate = result2[j].bt_export_tax_rebate;
            //             // }
            //             // if (Number(data[i].bt_result.bt_po_transfer_fee) == 0) {
            //             //     data[i].bt_result.bt_po_transfer_fee = result2[j].bt_po_transfer_fee;
            //             // }
            //             // if (Number(data[i].bt_result.bt_miscellaneous_expenses) == 0) {
            //             //     data[i].bt_result.bt_miscellaneous_expenses = result2[j].bt_miscellaneous_expenses;
            //             // }
            //             // if (Number(data[i].bt_result.bt_po_other_expenses) == 0) {
            //             //     data[i].bt_result.bt_po_other_expenses = result2[j].bt_po_other_expenses;
            //             // }
            //             // if (Number(data[i].bt_result.bt_in_fee) == 0) {
            //             //     data[i].bt_result.bt_in_fee = result2[j].bt_in_fee;
            //             // }
            //         }
            //     }
            // }
            if (bt_cy_ids.length) {
                bt_cy_ids = [...new Set(bt_cy_ids)];
            }
            log.audit('bt_cy_ids', bt_cy_ids);
            for (let i = 0; i < bt_cy_ids.length; i++) {
                var exchangeRate = currency.exchangeRate({
                    source: bt_cy_ids[i],
                    target: data[0].currency_id,
                    date: data[0].trandate
                });
                log.audit('汇率：' + bt_cy_ids[i] + '->' + data[0].currency_id, exchangeRate);
                bt_cy_rate.push({
                    cy_id: bt_cy_ids[i],
                    exchangeRate: exchangeRate,
                });
            }
            for (let i = 0; i < result1.length; i++) {
                for (let j = 0; j < bt_cy_rate.length; j++) {
                    if (result1[i].bt_currency == bt_cy_rate[j].cy_id) {
                        result1[i].bt_export_tax_rebate = interface.accMul(result1[i].bt_export_tax_rebate, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_po_transfer_fee = interface.accMul(result1[i].bt_po_transfer_fee, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_miscellaneous_expenses = interface.accMul(result1[i].bt_miscellaneous_expenses, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_po_other_expenses = interface.accMul(result1[i].bt_po_other_expenses, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_domestic_trailer_fee = interface.accMul(result1[i].bt_domestic_trailer_fee, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_customs_clearance_fee = interface.accMul(result1[i].bt_customs_clearance_fee, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_domestic_port_charges = interface.accMul(result1[i].bt_domestic_port_charges, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_ocean_freight = interface.accMul(result1[i].bt_ocean_freight, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_of_insurance_fee = interface.accMul(result1[i].bt_of_insurance_fee, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_tariff = interface.accMul(result1[i].bt_tariff, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_clearance_fee = interface.accMul(result1[i].bt_clearance_fee, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_port_miscellaneous = interface.accMul(result1[i].bt_port_miscellaneous, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_port_trailer_fee = interface.accMul(result1[i].bt_port_trailer_fee, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_abnormal_expenses = interface.accMul(result1[i].bt_abnormal_expenses, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_other_expenses = interface.accMul(result1[i].bt_other_expenses, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_storage_fee = interface.accMul(result1[i].bt_storage_fee, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_rental_fee = interface.accMul(result1[i].bt_rental_fee, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_in_fee = interface.accMul(result1[i].bt_in_fee, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_warehouse_fe = interface.accMul(result1[i].bt_warehouse_fe, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_truck = interface.accMul(result1[i].bt_truck, bt_cy_rate[j].exchangeRate);
                        result1[i].bt_outbound_fee = interface.accMul(result1[i].bt_outbound_fee, bt_cy_rate[j].exchangeRate);
                    }
                }
            }
            log.audit('result1 rate', result1);
            var n_result1 = [];
            for (let i = 0; i < result1.length; i++) {
                if (n_result1.length) {
                    var flag = true;
                    for (let j = 0; j < n_result1.length; j++) {
                        if (n_result1[j].bt_sku == result1[i].bt_sku && n_result1[j].bt_batch == result1[i].bt_batch && n_result1[j].bt_store == result1[i].bt_store) {
                            n_result1[j].bt_export_tax_rebate = interface.accAdd(n_result1[j].bt_export_tax_rebate, result1[i].bt_export_tax_rebate);
                            n_result1[j].bt_po_transfer_fee = interface.accAdd(n_result1[j].bt_po_transfer_fee, result1[i].bt_po_transfer_fee);
                            n_result1[j].bt_miscellaneous_expenses = interface.accAdd(n_result1[j].bt_miscellaneous_expenses, result1[i].bt_miscellaneous_expenses);
                            n_result1[j].bt_po_other_expenses = interface.accAdd(n_result1[j].bt_po_other_expenses, result1[i].bt_po_other_expenses);
                            n_result1[j].bt_domestic_trailer_fee = interface.accAdd(n_result1[j].bt_domestic_trailer_fee, result1[i].bt_domestic_trailer_fee);
                            n_result1[j].bt_customs_clearance_fee = interface.accAdd(n_result1[j].bt_customs_clearance_fee, result1[i].bt_customs_clearance_fee);
                            n_result1[j].bt_domestic_port_charges = interface.accAdd(n_result1[j].bt_domestic_port_charges, result1[i].bt_domestic_port_charges);
                            n_result1[j].bt_ocean_freight = interface.accAdd(n_result1[j].bt_ocean_freight, result1[i].bt_ocean_freight);
                            n_result1[j].bt_of_insurance_fee = interface.accAdd(n_result1[j].bt_of_insurance_fee, result1[i].bt_of_insurance_fee);
                            n_result1[j].bt_tariff = interface.accAdd(n_result1[j].bt_tariff, result1[i].bt_tariff);
                            n_result1[j].bt_clearance_fee = interface.accAdd(n_result1[j].bt_clearance_fee, result1[i].bt_clearance_fee);
                            n_result1[j].bt_port_miscellaneous = interface.accAdd(n_result1[j].bt_port_miscellaneous, result1[i].bt_port_miscellaneous);
                            n_result1[j].bt_port_trailer_fee = interface.accAdd(n_result1[j].bt_port_trailer_fee, result1[i].bt_port_trailer_fee);
                            n_result1[j].bt_abnormal_expenses = interface.accAdd(n_result1[j].bt_abnormal_expenses, result1[i].bt_abnormal_expenses);
                            n_result1[j].bt_other_expenses = interface.accAdd(n_result1[j].bt_other_expenses, result1[i].bt_other_expenses);
                            n_result1[j].bt_storage_fee = interface.accAdd(n_result1[j].bt_storage_fee, result1[i].bt_storage_fee);
                            n_result1[j].bt_rental_fee = interface.accAdd(n_result1[j].bt_rental_fee, result1[i].bt_rental_fee);
                            n_result1[j].bt_in_fee = interface.accAdd(n_result1[j].bt_in_fee, result1[i].bt_in_fee);
                            n_result1[j].bt_warehouse_fe = interface.accAdd(n_result1[j].bt_warehouse_fe, result1[i].bt_warehouse_fe);
                            n_result1[j].bt_truck = interface.accAdd(n_result1[j].bt_truck, result1[i].bt_truck);
                            n_result1[j].bt_outbound_fee = interface.accAdd(n_result1[j].bt_outbound_fee, result1[i].bt_outbound_fee);
                            flag = false;
                            break;
                        }
                    }
                    if (flag) {
                        n_result1.push(result1[i])
                    }
                } else {
                    n_result1.push(result1[i])
                }
            }
            log.audit('n_result1', n_result1);

            for (let i = 0; i < data.length; i++) {
                for (let j = 0; j < n_result1.length; j++) {
                    if (data[i].item_id == n_result1[j].bt_sku && data[i].serinalnumber == n_result1[j].bt_batch && data[i].store == n_result1[j].bt_store) {
                        data[i].bt_result = n_result1[j];
                    }
                }
            }

            for (let i = 0; i < result2.length; i++) {
                for (let j = 0; j < bt_cy_rate.length; j++) {
                    if (result2[i].bt_currency == bt_cy_rate[j].cy_id) {
                        result2[i].exchangeRate = bt_cy_rate[j].exchangeRate;
                        result2[i].bt_price = interface.accMul(result2[i].bt_price, bt_cy_rate[j].exchangeRate);
                    }
                }
            }
            log.audit('result2 rate', result2);
            for (let i = 0; i < data.length; i++) {
                for (let j = 0; j < result2.length; j++) {
                    if (data[i].item_id == result2[j].bt_sku && data[i].serinalnumber == result2[j].bt_batch) {
                        if (data[i].bt_result.bt_price) {
                            if (Number(data[i].bt_result.bt_price) < Number(result2[j].bt_price)) {
                                data[i].bt_result.bt_price = result2[j].bt_price;
                            }
                        } else {
                            data[i].bt_result.bt_price = result2[j].bt_price;
                        }
                    }
                }
            }

        }

        function createBatchTracking(id, data, feeFieldMap) {
            for (let i = 0; i < data.length; i++) {
                const e = data[i];
                log.audit('data', e);
                var lc_data = e.lc_data;
                var rec = record.create({ type: 'customrecord_swc_batch_track', isDynamic: false });
                rec.setValue({ fieldId: 'custrecord_swc_bt_type_id', value: id });
                rec.setValue({ fieldId: 'custrecord_swc_bt_subsidiary', value: e.subsidiary });
                rec.setValue({ fieldId: 'custrecord_swc_bt_date', value: e.trandate });
                rec.setValue({ fieldId: 'custrecord_swc_bt_sku', value: e.item_id });
                rec.setValue({ fieldId: 'custrecord_swc_bt_location', value: e.location_id });
                rec.setValue({ fieldId: 'custrecord_swc_bt_batch', value: e.serinalnumber });
                rec.setValue({ fieldId: 'custrecord_swc_bt_type', value: e.c_transaction_type });
                rec.setValue({ fieldId: 'custrecord_swc_bt_currency', value: e.currency_id });
                rec.setValue({ fieldId: 'custrecord_swc_bt_s_quantity', value: e.s_quantity });
                rec.setValue({ fieldId: 'custrecord_swc_bt_bhwd', value: e.store });
                e.if_id ? rec.setValue({ fieldId: 'custrecord_swc_bt_orgin_if_id', value: e.if_id }) : '';
                if (e.c_transaction_type == '1' || e.c_transaction_type == '7') {
                    //国内采购入库     装配件构建
                    rec.setValue({ fieldId: 'custrecord_swc_bt_price', value: e.l_rate || 0 });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_export_tax_rebate', value: e.bt_export_tax_rebate || 0 });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_po_transfer_fee', value: e.bt_po_transfer_fee || 0 });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_miscellaneous_expenses', value: e.bt_miscellaneous_expenses || 0 });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_po_other_expenses', value: e.bt_po_other_expenses || 0 });
                }

                for (let j = 0; j < lc_data.length; j++) {
                    for (let k = 0; k < feeFieldMap.length; k++) {
                        if (feeFieldMap[k].costcategory == lc_data[j].costcategory) {
                            rec.setValue({ fieldId: feeFieldMap[k].bt_filed, value: lc_data[j].amount || 0 });
                            break
                        }
                    }
                }

                if (e.c_transaction_type == '8') {
                    rec.setValue({ fieldId: 'custrecord_swc_bt_price', value: -e.bt_result.bt_price || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_export_tax_rebate', value: -e.bt_result.bt_export_tax_rebate || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_po_transfer_fee', value: -e.bt_result.bt_po_transfer_fee || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_miscellaneous_expenses', value: -e.bt_result.bt_miscellaneous_expenses || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_po_other_expenses', value: -e.bt_result.bt_po_other_expenses || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_domestic_trailer_fee', value: -e.bt_result.bt_domestic_trailer_fee || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_customs_clearance_fee', value: -e.bt_result.bt_customs_clearance_fee || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_domestic_port_charges', value: -e.bt_result.bt_domestic_port_charges || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_ocean_freight', value: -e.bt_result.bt_ocean_freight || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_of_insurance_fee', value: -e.bt_result.bt_of_insurance_fee || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_tariff', value: -e.bt_result.bt_tariff || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_clearance_fee', value: -e.bt_result.bt_clearance_fee || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_port_miscellaneous', value: -e.bt_result.bt_port_miscellaneous || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_port_trailer_fee', value: -e.bt_result.bt_port_trailer_fee || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_abnormal_expenses', value: -e.bt_result.bt_abnormal_expenses || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_other_expenses', value: -e.bt_result.bt_other_expenses || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_storage_fee', value: -e.bt_result.bt_storage_fee || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_rental_fee', value: -e.bt_result.bt_rental_fee || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_in_fee', value: -e.bt_result.bt_in_fee || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_warehouse_fe', value: -e.bt_result.bt_warehouse_fe || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_truck', value: -e.bt_result.bt_truck || 0 });
                    rec.setValue({ fieldId: 'custrecord_swc_bt_outbound_fee', value: -e.bt_result.bt_outbound_fee || 0 });

                    for (let k = 0; k < e.bt_cy_rate.length; k++) {
                        rec.setSublistValue({ sublistId: 'recmachcustrecord_swc_bter_fjl', fieldId: 'custrecord_swc_bter_source_currency', value: e.bt_cy_rate[k].cy_id, line: k });
                        rec.setSublistValue({ sublistId: 'recmachcustrecord_swc_bter_fjl', fieldId: 'custrecord_swc_bter_exchangerate', value: e.bt_cy_rate[k].exchangeRate, line: k });
                    }
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_exchangerate', value: e.exchangeRate });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_price', value: interface.accMul(-e.bt_result.bt_price || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_export_tax_rebate', value: interface.accMul(-e.bt_result.bt_export_tax_rebate || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_po_transfer_fee', value: interface.accMul(-e.bt_result.bt_po_transfer_fee || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_miscellaneous_expenses', value: interface.accMul(-e.bt_result.bt_miscellaneous_expenses || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_po_other_expenses', value: interface.accMul(-e.bt_result.bt_po_other_expenses || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_domestic_trailer_fee', value: interface.accMul(-e.bt_result.bt_domestic_trailer_fee || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_customs_clearance_fee', value: interface.accMul(-e.bt_result.bt_customs_clearance_fee || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_domestic_port_charges', value: interface.accMul(-e.bt_result.bt_domestic_port_charges || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_ocean_freight', value: interface.accMul(-e.bt_result.bt_ocean_freight || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_of_insurance_fee', value: interface.accMul(-e.bt_result.bt_of_insurance_fee || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_tariff', value: interface.accMul(-e.bt_result.bt_tariff || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_clearance_fee', value: interface.accMul(-e.bt_result.bt_clearance_fee || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_port_miscellaneous', value: interface.accMul(-e.bt_result.bt_port_miscellaneous || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_port_trailer_fee', value: interface.accMul(-e.bt_result.bt_port_trailer_fee || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_abnormal_expenses', value: interface.accMul(-e.bt_result.bt_abnormal_expenses || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_other_expenses', value: interface.accMul(-e.bt_result.bt_other_expenses || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_storage_fee', value: interface.accMul(-e.bt_result.bt_storage_fee || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_rental_fee', value: interface.accMul(-e.bt_result.bt_rental_fee || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_in_fee', value: interface.accMul(-e.bt_result.bt_in_fee || 0, e.exchangeRate) });
                    // rec.setValue({ fieldId: 'custrecord_swc_bt_exchangerate', value: e.exchangeRate });
                }

                var bt_id = rec.save({ ignoreMandatoryFields: true });
                log.audit('bt_id id', bt_id);
            }
        }

        function DeleteJour(id) {
            try {
                var jo_id_info = [];
                search.create({
                    type: 'journalentry',
                    filters: [
                        { name: 'custbody_swc_related_item_fulfillment', operator: 'is', values: id },
                    ],
                }).run().each(function (rec) {
                    jo_id_info.push({
                        jo_id: rec.id,
                        jo_type: rec.recordType,
                    })
                    return true
                });
                if (jo_id_info.length) {
                    jo_id_info = unique(jo_id_info)
                }
                log.audit('jo_id_info2', jo_id_info);
                for (let i = 0; i < jo_id_info.length; i++) {
                    record.delete({ type: jo_id_info[i].jo_type, id: jo_id_info[i].jo_id });
                }
            } catch (error) {
                log.error('DeleteJour id', id);
            }
        }

        function unique(arr) {
            const seen = new Set();
            return arr.filter(a => {
                // 判断是否已经存在
                if (!seen.has(a.jo_id)) {
                    seen.add(a.jo_id);
                    return true;
                }
                return false;
            });
        }

        function DeleteData(id) {
            try {
                search.create({
                    type: 'customrecord_swc_batchtrack_exchangerate',
                    filters: [
                        { name: 'custrecord_swc_bt_type_id', join: 'custrecord_swc_bter_fjl', operator: 'anyof', values: id },
                    ],
                }).run().each(function (rec) {
                    log.audit('delete id', rec.id);
                    record.delete({ type: 'customrecord_swc_batchtrack_exchangerate', id: rec.id });
                    return true;
                });

                search.create({
                    type: 'customrecord_swc_batch_track',
                    filters: [
                        { name: 'custrecord_swc_bt_type_id', operator: 'anyof', values: id },
                    ],
                }).run().each(function (rec) {
                    log.audit('delete id', rec.id);
                    record.delete({ type: 'customrecord_swc_batch_track', id: rec.id });
                    return true;
                });
            } catch (error) {
                log.error('DeleteData id', id);
            }
        }

        function searchIFBatchTracking(id, feeFieldMap) {

            var if_data_bt = [];
            var filters1 = [
                ['isinactive', 'is', false], 'and',
                ['custrecord_swc_bt_type_id', 'anyof', id]
            ]
            var columns1 = [
                { name: 'custrecord_swc_bt_sku' },
                { name: 'custrecord_swc_bt_batch' },
            ];
            for (let i = 0; i < feeFieldMap.length; i++) {
                columns1.push({ name: feeFieldMap[i].bt_filed })
            }
            log.audit('filters', filters1);
            log.audit('columns', columns1);

            search.create({
                type: 'customrecord_swc_batch_track',
                filters: filters1,
                columns: columns1
            }).run().each(function (rec) {
                let json = {}, lc_data = [];
                json.custrecord_swc_bt_sku = rec.getValue('custrecord_swc_bt_sku');
                json.custrecord_swc_bt_batch = rec.getValue('custrecord_swc_bt_batch');
                json.custrecord_swc_bt_batch_text = rec.getText('custrecord_swc_bt_batch');

                for (let i = 0; i < feeFieldMap.length; i++) {
                    let json_1 = {}
                    let bt_filed = feeFieldMap[i].bt_filed;
                    json_1.costcategory = feeFieldMap[i].costcategory;
                    json_1[bt_filed] = rec.getValue(bt_filed) || 0;
                    json_1.amount = rec.getValue(bt_filed) || 0;
                    lc_data.push(json_1);
                }
                json.lc_data = lc_data;
                if_data_bt.push(json);
                return true;
            });
            return if_data_bt;
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });