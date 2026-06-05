/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_WAREHOUSE_FEE_IR_JOUR.js
 *@description 尾程货品收据仓租费日记账
 */
define(['../common/interface', '../common/moment', 'N/runtime', 'N/record', 'N/search', 'N/format', 'N/error'],
    function (interface, moment, runtime, record, search, format, error) {

        function getInputData() {
            var data = [];

            var subsidiary = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wf_ir_jo_subsidiary' });
            var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wf_ir_jo_start_date' });
            var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wf_ir_jo_end_date' });

            if (start_date) {
                start_date = format.format({ value: start_date, type: 'date' })
            } else {
                start_date = format.format({ value: moment().subtract(1, 'months').startOf('month').toDate(), type: 'date' });
            }

            if (end_date) {
                end_date = format.format({ value: end_date, type: 'date' })
            } else {
                end_date = format.format({ value: moment().subtract(1, 'months').endOf('month').toDate(), type: 'date' });
            }

            var filters = [
                { name: 'mainline', operator: 'is', values: true },
                { name: 'custbody_swc_calculate_warehouse_fee', operator: 'is', values: true },
                { name: 'custbody_swc_warehouse_fee_resolved', operator: 'is', values: false },
                { name: 'custbody_swc_relation_jour', operator: 'anyof', values: ['@NONE@'] },
            ]
            if (subsidiary) {
                filters.push({ name: 'subsidiary', operator: 'anyof', values: subsidiary })
            }
            if (end_date && start_date) {
                filters.push({ name: 'trandate', operator: 'within', values: [start_date, end_date] })
            }

            log.audit('filters', filters)
            search.create({
                type: 'itemreceipt',
                filters: filters,
                columns: [
                    { name: 'subsidiary', summary: 'GROUP' },
                    { name: 'location', summary: 'GROUP' },
                    { name: 'custbody_swc_warehouse_fee_currency', summary: 'GROUP' },
                    { name: 'type', join: 'createdfrom', summary: 'GROUP' },
                    { name: 'custbody_swc_warehouse_fee_total', summary: 'SUM' },
                ]
            }).run().each(function (rec) {
                data.push({
                    sub_id: rec.getValue(rec.columns[0]),
                    location_id: rec.getValue(rec.columns[1]),
                    currency_id: rec.getValue(rec.columns[2]),
                    createdfrom_type: rec.getValue(rec.columns[3]),
                    warehouse_fee_total: rec.getValue(rec.columns[4]),
                });
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
                var obj = JSON.parse(context.value);
                log.audit('map obj', obj);

                var trandate = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wf_ir_jo_end_date' });
                if (trandate) {
                    trandate = format.format({ value: trandate, type: 'date' })
                } else {
                    trandate = format.format({ value: moment().subtract(1, 'months').endOf('month').toDate(), type: 'date' });
                }

                var irids = GetIRIds(obj.sub_id, obj.currency_id, obj.createdfrom_type, obj.location_id);
                log.audit('irids', irids);
                log.audit('irids', irids.length);

                let currency_id = '';
                if (obj.currency_id) {
                    currency_id = obj.currency_id;
                } else {
                    var sbResult = search.lookupFields({ type: 'subsidiary', id: obj.sub_id, columns: ['currency'] });
                    log.audit('sbResult', sbResult);
                    if (sbResult['currency'].length) {
                        currency_id = sbResult['currency'][0].value;
                    }
                }

                if (obj.createdfrom_type == 'RtnAuth') {
                    var credit_account, debit_account;
                    search.create({
                        type: 'customrecord_swc_ewf_config',
                        filters: [
                            { name: 'custrecord_swc_ewfc_type', operator: 'is', values: '销售退货入库' },
                        ],
                        columns: [
                            { name: 'custrecordswc_ewfc_credit_account' },
                            { name: 'custrecordswc_ewfc_debit_account' },
                        ]
                    }).run().each(function (rec) {
                        credit_account = rec.getValue('custrecordswc_ewfc_credit_account');
                        debit_account = rec.getValue('custrecordswc_ewfc_debit_account');
                    });


                    var rec = record.create({ type: 'journalentry', isDynamic: true });
                    rec.setValue({ fieldId: 'subsidiary', value: obj.sub_id });
                    rec.setValue({ fieldId: 'currency', value: currency_id });
                    rec.setValue({ fieldId: 'trandate', value: format.parse({ value: trandate, type: 'date' }) });
                    rec.setValue({ fieldId: 'memo', value: '尾程货品收据仓租费' });
                    rec.setValue({ fieldId: 'approvalstatus', value: 2 });
                    rec.setValue({ fieldId: 'custbody_swc_journal_type', value: "2" });  //普通日记账

                    rec.selectNewLine({ sublistId: 'line' });
                    rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: debit_account });
                    rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: obj.warehouse_fee_total });
                    rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: obj.location_id });
                    rec.commitLine({ sublistId: 'line' });
                    rec.selectNewLine({ sublistId: 'line' });
                    rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: credit_account });
                    rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: obj.warehouse_fee_total });
                    rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: obj.location_id });
                    rec.commitLine({ sublistId: 'line' });

                    var jo_id = rec.save({ ignoreMandatoryFields: true });
                    log.audit('jo_id', jo_id);

                    for (let i = 0; i < irids.length; i++) {
                        context.write({
                            key: irids[i],
                            value: {
                                'type': 'ra',
                                'jo_id': jo_id,
                                'amount': obj.warehouse_fee_total,
                                'ir_id': irids[i],
                            }
                        });
                    }

                    let ewf_ids = GetEWFIds(irids);
                    for (let i = 0; i < ewf_ids.length; i++) {
                        context.write({
                            key: ewf_ids[i],
                            value: {
                                'type': 'ewf',
                                'jo_id': jo_id,
                                'ewf_id': ewf_ids[i],
                            }
                        });
                    }

                } else if (obj.createdfrom_type == 'TrnfrOrd') {

                    let credit_account, debit_account;

                    search.create({
                        type: 'customrecord_swc_ewf_config',
                        filters: [
                            { name: 'custrecord_swc_ewfc_type', operator: 'is', values: '调拨入库' },
                        ],
                        columns: [
                            { name: 'custrecordswc_ewfc_credit_account' },
                            { name: 'custrecordswc_ewfc_debit_account' },
                        ]
                    }).run().each(function (rec) {
                        credit_account = rec.getValue('custrecordswc_ewfc_credit_account');
                        debit_account = rec.getValue('custrecordswc_ewfc_debit_account');
                    });

                    let rec = record.create({ type: 'journalentry', isDynamic: true });
                    rec.setValue({ fieldId: 'subsidiary', value: obj.sub_id });
                    rec.setValue({ fieldId: 'currency', value: currency_id });
                    rec.setValue({ fieldId: 'trandate', value: format.parse({ value: trandate, type: 'date' }) });
                    rec.setValue({ fieldId: 'memo', value: '调拨货品收据仓租费' });
                    rec.setValue({ fieldId: 'approvalstatus', value: 2 });
                    rec.setValue({ fieldId: 'custbody_swc_journal_type', value: "2" });  //普通日记账

                    rec.selectNewLine({ sublistId: 'line' });
                    rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: debit_account });
                    rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: obj.warehouse_fee_total });
                    rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: obj.location_id });
                    rec.commitLine({ sublistId: 'line' });
                    rec.selectNewLine({ sublistId: 'line' });
                    rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: credit_account });
                    rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: obj.warehouse_fee_total });
                    rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: obj.location_id });
                    rec.commitLine({ sublistId: 'line' });

                    let jo_id = rec.save({ ignoreMandatoryFields: true });
                    log.audit('jo_id', jo_id);


                    for (let i = 0; i < irids.length; i++) {
                        context.write({
                            key: irids[i],
                            value: {
                                'type': 'to',
                                'jo_id': jo_id,
                                'amount': obj.warehouse_fee_total,
                                'ir_id': irids[i],
                            }
                        });
                    }

                    let ewf_ids = GetEWFIds(irids);
                    for (let i = 0; i < ewf_ids.length; i++) {
                        context.write({
                            key: ewf_ids[i],
                            value: {
                                'type': 'ewf',
                                'jo_id': jo_id,
                                'ewf_id': ewf_ids[i],
                            }
                        });
                    }
                } else {
                    for (let i = 0; i < irids.length; i++) {
                        context.write({
                            key: irids[i],
                            value: {
                                'type': 'no_deal',
                                'jo_id': jo_id,
                                'amount': obj.warehouse_fee_total,
                                'ir_id': irids[i],
                            }
                        });
                    }
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
                    var type = obj.type;
                    var jo_id = obj.jo_id;
                    var ir_id = obj.ir_id;
                    var ewf_id = obj.ewf_id;
                    var amount = obj.amount;
                    if (type == 'ra' || type == 'to') {
                        record.submitFields({
                            type: 'itemreceipt',
                            id: ir_id,
                            values: {
                                custbody_swc_relation_jour: jo_id,
                                custbody_swc_warehouse_fee_total_amt: amount,
                                custbody_swc_warehouse_fee_resolved: true,
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true,
                            }
                        });
                    }
                    else if (type == 'no_deal') {
                        record.submitFields({
                            type: 'itemreceipt',
                            id: ir_id,
                            values: {
                                custbody_swc_warehouse_fee_resolved: true,
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true,
                            }
                        });
                    }
                    else if (type == 'ewf') {
                        record.submitFields({
                            type: 'customrecord_swc_ewh_fee_day',
                            id: ewf_id,
                            values: {
                                custrecord_swc_ewh_fee_day_jo: jo_id,
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true,
                            }
                        });
                    }
                } catch (error) {
                    log.error('reduce error', error);
                }

            });
        }

        function summarize(summary) {

        }

        function GetIRIds(sub_id, currency_id, createdfrom_type, location_id) {
            try {
                var data = [];

                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wf_ir_jo_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wf_ir_jo_end_date' });

                if (start_date) {
                    start_date = format.format({ value: start_date, type: 'date' })
                } else {
                    start_date = format.format({ value: moment().subtract(1, 'months').startOf('month').toDate(), type: 'date' });
                }

                if (end_date) {
                    end_date = format.format({ value: end_date, type: 'date' })
                } else {
                    end_date = format.format({ value: moment().subtract(1, 'months').endOf('month').toDate(), type: 'date' });
                }

                var filters = [
                    { name: 'mainline', operator: 'is', values: true },
                    { name: 'subsidiary', operator: 'anyof', values: sub_id },
                    { name: 'location', operator: 'anyof', values: location_id },
                    { name: 'trandate', operator: 'within', values: [start_date, end_date] },
                    { name: 'custbody_swc_relation_jour', operator: 'anyof', values: ['@NONE@'] },
                    { name: 'custbody_swc_calculate_warehouse_fee', operator: 'is', values: true },
                ]
                if (currency_id) {
                    filters.push({ name: 'custbody_swc_warehouse_fee_currency', operator: 'anyof', values: currency_id });
                } else {
                    filters.push({ name: 'custbody_swc_warehouse_fee_currency', operator: 'anyof', values: ['@NONE@'] });
                }
                if (createdfrom_type) {
                    filters.push({ name: 'type', join: 'createdfrom', operator: 'anyof', values: createdfrom_type });
                }

                var mySearch = search.create({
                    type: 'itemreceipt',
                    filters: filters,
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
                if (data.length) {
                    data = [...new Set(data)];
                }
                return data;

            } catch (error) {
                log.error('GetIRIds error', error);
            }
        }

        function GetEWFIds(irids) {
            try {
                log.audit('GetEWFIds', irids);

                let data = [];

                let filters = [
                    { name: 'custrecord_swc_ewh_fee_day_ir', operator: 'anyof', values: irids },
                ]

                log.audit('filters', filters);

                let mySearch = search.create({
                    type: 'customrecord_swc_ewh_fee_day',
                    filters: filters,
                })
                let pageSize = '1000'; //每页条数
                let pageData = mySearch.runPaged({
                    pageSize: pageSize
                });
                log.debug('pageData', pageData);
                let totalCount = pageData.count; //总数
                log.debug('totalCount', totalCount);
                let pageCount = pageData.pageRanges.length; //页数
                log.debug('pageCount', pageCount);
                for (let i = 0; i < pageCount; i++) {
                    pageData.fetch({
                        index: i
                    }).data.forEach(function (rec) {
                        data.push(rec.id);
                    });
                }
                if (data.length) {
                    data = [...new Set(data)];
                }
                return data;

            } catch (error) {
                log.error('GetEWFIds error', error);
            }
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });
