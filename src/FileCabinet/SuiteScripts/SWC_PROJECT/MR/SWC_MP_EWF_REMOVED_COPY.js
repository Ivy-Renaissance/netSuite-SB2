/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_EWF_REMOVED_COPY.js
 *@description 待移除预估日仓费批次号，备份到另一张表
 */
define(['../common/interface', '../common/moment', 'N/runtime', 'N/record', 'N/search', 'N/format', 'N/error'],
    function (interface, moment, runtime, record, search, format, error) {

        function getInputData() {
            var startDate = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_ewf_start_date' });
            var endDate = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_ewf_end_date' });

            if (startDate) {
                startDate = format.format({ value: startDate, type: 'date' });
            } else {
                startDate = format.format({ value: moment().subtract(2, 'months').startOf('month').toDate(), type: 'date' });
            }
            if (endDate) {
                endDate = format.format({ value: endDate, type: 'date' });
            } else {
                endDate = format.format({ value: moment().subtract(2, 'months').endOf('month').toDate(), type: 'date' });
            }
            var data = [];
            var limit = 399;
            var filters = [
                { name: 'custrecord_swc_rewfs_resolved', operator: 'is', values: false },
            ]
            if (endDate && startDate) {
                filters.push({ name: 'custrecord_swc_rewfs_trandate', operator: 'within', values: [startDate, endDate] });
            }
            if (endDate && !startDate) {
                filters.push({ name: 'custrecord_swc_rewfs_trandate', operator: 'onorbefore', values: endDate });
            }
            if (!endDate && startDate) {
                filters.push({ name: 'custrecord_swc_rewfs_trandate', operator: 'onorafter', values: startDate });
            }
            log.audit('filters', filters);
            search.create({
                type: 'customrecord_swc_removed_ewf_sn',
                filters: filters,
                columns: [
                    { name: 'custrecord_swc_rewfs_item' },
                    { name: 'custrecord_swc_rewfs_serinalnumber' },
                    { name: 'custrecord_swc_rewfs_sn' },
                    { name: 'custrecord_swc_rewfs_location' },
                ]
            }).run().each(function (rec) {
                data.push({
                    id: rec.id,
                    trandate: rec.getValue('custrecord_swc_rewfs_trandate'),
                    item_id: rec.getValue('custrecord_swc_rewfs_item'),
                    location_id: rec.getValue('custrecord_swc_rewfs_location'),
                    sn_id: rec.getValue('custrecord_swc_rewfs_serinalnumber'),
                    sn_text: rec.getValue('custrecord_swc_rewfs_sn'),
                });
                return --limit > 0
            })
            log.emergency('获取数量 data', data.length)
            return data;
        }

        function map(context) {
            try {
                var obj = JSON.parse(context.value);
                log.audit('map obj', obj);

                var cache_id = obj.id;
                var item_id = obj.item_id;
                var location_id = obj.location_id;
                var sn_id = obj.sn_id;
                var sn_text = obj.sn_text;

                var data = [];
                var ewf_filters = [
                    { name: 'isinactive', operator: search.Operator.IS, values: false },
                    { name: 'custrecord_swc_ewh_fee_day_warehouse', operator: 'anyof', values: location_id },
                    { name: 'custrecord_swc_ewh_fee_day_sku', operator: 'anyof', values: item_id },
                    { name: 'custrecord_swc_ewh_fee_day_lot', operator: 'is', values: sn_text },
                ]
                log.debug('ewf_filters', ewf_filters);
                var mySearch = search.create({
                    type: 'customrecord_swc_ewh_fee_day',
                    filters: ewf_filters,
                })
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
                        data.push(rec.id);
                    });
                }
                log.audit('data', data);
                log.audit('data length', data.length);

                for (let i = 0; i < data.length; i++) {
                    context.write({
                        key: cache_id + '.' + data[i],
                        value: {
                            'id': data[i],
                        }
                    });
                }

                record.submitFields({
                    type: 'customrecord_swc_removed_ewf_sn',
                    id: cache_id,
                    values: {
                        custrecord_swc_rewfs_resolved: true,
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true,
                    }
                });



            } catch (error) {
                log.error('map error', error);
            }

        }

        function reduce(context) {
            log.audit('reduce', context);
            var v = context.values;
            v.map(function (obj) {
                try {
                    obj = JSON.parse(obj);
                    log.audit('reduce obj', obj);

                    var result = {};
                    search.create({
                        type: 'customrecord_swc_ewh_fee_day',
                        filters: [
                            { name: 'internalId', operator: 'is', values: obj.id },
                        ],
                        columns: [
                            { name: 'custrecord_swc_ewh_fee_day_subsidiary' },
                            { name: 'custrecord_swc_ewh_fee_day_warehouse' },
                            { name: 'custrecord_swc_ewh_fee_day_currency' },
                            { name: 'custrecord_swc_ewh_fee_day_lot' },
                            { name: 'custrecord_swc_ewh_fee_day_number' },
                            { name: 'custrecord_swc_ewh_fee_day_in_date' },
                            { name: 'custrecord_swc_ewh_fee_day_date' },
                            { name: 'custrecord_swc_ewh_fee_day_inventory_age' },
                            { name: 'custrecord_swc_ewh_fee_day_quantity' },
                            { name: 'custrecord_swc_ewh_fee_day_fee' },
                            { name: 'custrecord_swc_ewh_fee_day_rate' },
                            { name: 'custrecord_swc_ewh_fee_day_sku' },
                            { name: 'custrecord_swc_ewh_fee_day_po' },
                            { name: 'custrecord_swc_ewh_fee_day_to' },
                            { name: 'custrecord_swc_ewh_fee_day_to1' },
                            { name: 'custrecord_swc_ewh_fee_day_yesamount' },
                            { name: 'custrecord_swc_ewh_fee_day_noamount' },
                            { name: 'custrecord_swc_ewh_fee_day_so' },
                            { name: 'custrecord_swc_ewh_fee_day_if' },
                            { name: 'custrecord_swc_ewh_fee_day_ir' },
                            { name: 'custrecord_swc_ewh_fee_day_type' },
                            { name: 'custrecord_swc_ewh_fee_day_ra' },
                        ]
                    }).run().each(function (rec) {
                        result = {
                            subsidiary: rec.getValue('custrecord_swc_ewh_fee_day_subsidiary'),
                            warehouse: rec.getValue('custrecord_swc_ewh_fee_day_warehouse'),
                            currency: rec.getValue('custrecord_swc_ewh_fee_day_currency'),
                            lot: rec.getValue('custrecord_swc_ewh_fee_day_lot'),
                            number: rec.getValue('custrecord_swc_ewh_fee_day_number'),
                            in_date: rec.getValue('custrecord_swc_ewh_fee_day_in_date'),
                            date: rec.getValue('custrecord_swc_ewh_fee_day_date'),
                            inventory_age: rec.getValue('custrecord_swc_ewh_fee_day_inventory_age'),
                            quantity: rec.getValue('custrecord_swc_ewh_fee_day_quantity'),
                            fee: rec.getValue('custrecord_swc_ewh_fee_day_fee'),
                            sku: rec.getValue('custrecord_swc_ewh_fee_day_sku'),
                            po: rec.getValue('custrecord_swc_ewh_fee_day_po'),
                            to: rec.getValue('custrecord_swc_ewh_fee_day_to'),
                            to1: rec.getValue('custrecord_swc_ewh_fee_day_to1'),
                            yesamount: rec.getValue('custrecord_swc_ewh_fee_day_yesamount'),
                            noamount: rec.getValue('custrecord_swc_ewh_fee_day_noamount'),
                            so: rec.getValue('custrecord_swc_ewh_fee_day_so'),
                            if: rec.getValue('custrecord_swc_ewh_fee_day_if'),
                            ir: rec.getValue('custrecord_swc_ewh_fee_day_ir'),
                            type: rec.getValue('custrecord_swc_ewh_fee_day_type'),
                            ra: rec.getValue('custrecord_swc_ewh_fee_day_ra'),
                        }
                    });
                    log.audit('result', result);
                    
                    var rec = record.create({ type: 'customrecord_swc_ewh_fee_day1', isDynamic: false });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_subsidiary1', value: result.subsidiary });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_warehouse1', value: result.warehouse });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_currency1', value: result.currency });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_lot1', value: result.lot });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_number1', value: result.number });
                    result.in_date ? rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_in_date1', value: format.parse({ value: result.in_date, type: 'date' }) }) : '';
                    result.date ? rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_date1', value: format.parse({ value: result.date, type: 'date' }) }) : '';
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_inventory_ag1', value: result.inventory_age });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_quantity1', value: result.quantity });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_fee1', value: result.fee });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_sku1', value: result.sku });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_po1', value: result.po });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_to_1', value: result.to });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_to11', value: result.to1 });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_yesamount1', value: result.yesamount });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_noamount1', value: result.noamount });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_so1', value: result.so });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_if1', value: result.if });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_ir1', value: result.ir });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_type1', value: result.type });
                    rec.setValue({ fieldId: 'custrecord_swc_ewh_fee_day_ra1', value: result.ra });
                    rec.save({ ignoreMandatoryFields: true });

                    record.delete({
                        type: 'customrecord_swc_ewh_fee_day',
                        id: obj.id
                    });

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
