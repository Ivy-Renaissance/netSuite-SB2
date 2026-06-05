/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @name SWC_UE_IF_BATCH_MONITORING.js
 * @author ZJG
 * @description 销售出库监控批次号，如果为0，添加至待移除备份数据
 */
define(['N/record', 'N/search', '../common/moment', '../common/interface', 'N/runtime', 'N/error', 'N/format'],

    function (record, search, moment, interface, runtime, error, format) {


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
                    return
                }
                if (newRecord.type == 'itemfulfillment') {
                    var ordertype = newRecord.getValue('ordertype');
                    var currency = newRecord.getValue('currency');
                    var subsidiary = newRecord.getValue('subsidiary');
                    var trandate = newRecord.getValue('trandate');
                    var createdfrom = newRecord.getValue('createdfrom');
                    var shipstatus = newRecord.getValue('shipstatus');
                    log.audit('ordertype', ordertype);
                    log.audit('shipstatus', shipstatus);
                    if (ordertype == 'SalesOrd') {
                        if (shipstatus == 'C' || !shipstatus) {
                            var po_id;
                            var soResult = search.lookupFields({ type: 'salesorder', id: createdfrom, columns: ['intercotransaction'] });
                            log.audit('soResult', soResult);
                            po_id = soResult.intercotransaction;
                            log.audit('po_id', po_id);
                            if (po_id) {
                                return
                            }

                            var sbResult = search.lookupFields({ type: 'subsidiary', id: subsidiary, columns: ['currency'] });
                            log.audit('sbResult', sbResult);
                            if (sbResult['currency'].length) {
                                currency = sbResult['currency'][0].value;
                            }

                            const lineCount = newRecord.getLineCount({ sublistId: 'item' });
                            log.audit('lineCount', lineCount);
                            var data = [];

                            for (var i = 0; i < lineCount; i++) {
                                var item = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                                var location = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i });
                                var quantity = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                                var inventorydetailavail = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetailavail', line: i });
                                var inventorydetailreq = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetailreq', line: i });
                                log.audit('inventorydetai', {
                                    inventorydetailavail: inventorydetailavail,
                                    inventorydetailreq: inventorydetailreq,
                                });
                                if (inventorydetailavail == 'T' && inventorydetailreq == 'T') {
                                    var id_subrec = newRecord.getSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail', line: i });
                                    for (var j = 0; j < id_subrec.getLineCount({ sublistId: 'inventoryassignment' }); j++) {
                                        var sn_quantity = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j });
                                        var sn_id = id_subrec.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'numberedrecordid', line: j });
                                        data.push({
                                            id: newRecord.id,
                                            trandate: trandate,
                                            currency: currency,
                                            subsidiary: subsidiary,
                                            item_id: item,
                                            location_id: location,
                                            quantity: quantity,
                                            l_rate: 0,
                                            sn_quantity: sn_quantity,
                                            sn_id: sn_id,
                                            serialnumber: '',
                                        });
                                    }
                                }
                            }
                            log.audit('data1', data);

                            var in_filters = [], sn_numbers = [];
                            for (let i = 0; i < data.length; i++) {
                                if (in_filters.length) {
                                    in_filters.push('or', [[
                                        ['internalid', 'anyof', data[i].sn_id], 'and',
                                        ['item', 'anyof', data[i].item_id], 'and',
                                        ['location', 'anyof', data[i].location_id]
                                    ]])
                                } else {
                                    in_filters.push([
                                        ['internalid', 'anyof', data[i].sn_id], 'and',
                                        ['item', 'anyof', data[i].item_id], 'and',
                                        ['location', 'anyof', data[i].location_id]
                                    ])
                                }
                            }
                            search.create({
                                type: 'inventorynumber',
                                filters: in_filters,
                                columns: [
                                    { name: 'internalid', summary: 'GROUP' },
                                    { name: 'inventorynumber', summary: 'GROUP' },
                                    { name: 'item', summary: 'GROUP' },
                                    { name: 'location', summary: 'GROUP' },
                                    { name: 'quantityavailable', summary: 'SUM' },
                                ]
                            }).run().each(function (e) {
                                sn_numbers.push({
                                    id: e.getValue(e.columns[0]),
                                    number: e.getValue(e.columns[1]),
                                    item_id: e.getValue(e.columns[2]),
                                    location_id: e.getValue(e.columns[3]),
                                    quantityavailable: e.getValue(e.columns[4]),
                                })
                                return true
                            })
                            log.audit('sn_numbers', sn_numbers);

                            for (let i = 0; i < data.length; i++) {
                                for (let j = 0; j < sn_numbers.length; j++) {
                                    if (data[i].sn_id == sn_numbers[j].id && data[i].item_id == sn_numbers[j].item_id && data[i].location_id == sn_numbers[j].location_id) {
                                        data[i].serialnumber = sn_numbers[j].number;
                                        data[i].quantityavailable = sn_numbers[j].quantityavailable;
                                    }
                                }
                            }
                            log.audit('data2', data);

                            for (let i = 0; i < data.length; i++) {
                                if (Number(data[i].quantityavailable) == 0) {
                                    var cache_id, cache_trandate;
                                    search.create({
                                        type: 'customrecord_swc_removed_ewf_sn',
                                        filters: [
                                            { name: 'custrecord_swc_rewfs_location', operator: 'anyof', values: data[i].location_id },
                                            { name: 'custrecord_swc_rewfs_item', operator: 'anyof', values: data[i].item_id },
                                            { name: 'custrecord_swc_rewfs_serinalnumber', operator: 'anyof', values: data[i].sn_id },
                                            { name: 'custrecord_swc_rewfs_sn', operator: 'is', values: data[i].serialnumber },
                                        ],
                                        columns: [
                                            { name: 'custrecord_swc_rewfs_trandate' }
                                        ]
                                    }).run().each(function (crec) {
                                        cache_id = crec.id;
                                        cache_trandate = crec.getValue('custrecord_swc_rewfs_trandate');
                                    });
                                    if (cache_id) {
                                        var rec = record.load({ type: 'customrecord_swc_removed_ewf_sn', id: cache_id });
                                        if (moment.utc(data[i].trandate).toISOString() > moment.utc(cache_trandate).toISOString()) {
                                            rec.setValue({ fieldId: 'custrecord_swc_rewfs_trandate', value: format.parse({ value: data[i].trandate, type: 'date' }) });
                                        }
                                    } else {
                                        var rec = record.create({ type: 'customrecord_swc_removed_ewf_sn', isDynamic: false });
                                        rec.setValue({ fieldId: 'custrecord_swc_rewfs_trandate', value: format.parse({ value: data[i].trandate, type: 'date' }) });
                                    }
                                    rec.setValue({ fieldId: 'custrecord_swc_rewfs_location', value: data[i].location_id });
                                    rec.setValue({ fieldId: 'custrecord_swc_rewfs_item', value: data[i].item_id });
                                    rec.setValue({ fieldId: 'custrecord_swc_rewfs_serinalnumber', value: data[i].sn_id });
                                    rec.setValue({ fieldId: 'custrecord_swc_rewfs_sn', value: data[i].serialnumber });
                                    var rewfs_id = rec.save({ ignoreMandatoryFields: true });
                                    log.audit('rewfs_id', rewfs_id);
                                }
                            }

                        }
                    }
                }
            } catch (error) {
                log.error('afterSubmit error', error);
            }
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });
