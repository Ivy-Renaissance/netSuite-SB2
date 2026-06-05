/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_EWF_JOUR.js
 *@description 预估仓租费日记账
 */
define(['../common/interface', '../common/moment', 'N/runtime', 'N/record', 'N/search', 'N/format', 'N/error'],
    function (interface, moment, runtime, record, search, format, error) {

        function getInputData() {
            var data = [];

            var location = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_ewf_jo_location' });
            var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_ewf_jo_start_date' });
            var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_ewf_jo_end_date' });

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
                ['isinactive', 'is', false], 'and',
                ['custrecord_swc_ewh_fee_day_jo', 'anyof', ['@NONE@']], 'and',
                [
                    ['custrecord_swc_ewh_fee_day_type', 'is', '预估'], 'or',
                    ['custrecord_swc_ewh_fee_day_type', 'is', '差异']
                ]
            ]
            if (location) {
                filters.push('and', ['custrecord_swc_ewh_fee_day_warehouse', 'anyof', location])
            }
            if (end_date && start_date) {
                filters.push('and', ['custrecord_swc_ewh_fee_day_date', 'within', [start_date, end_date]])
            }

            log.audit('filters', filters)
            search.create({
                type: 'customrecord_swc_ewh_fee_day',
                filters: filters,
                columns: [
                    { name: 'custrecord_swc_ewh_fee_day_warehouse', summary: 'GROUP' },
                    { name: 'custrecord_swc_ewh_fee_day_currency', summary: 'GROUP' },
                    { name: 'custrecord_swc_ewh_fee_day_fee', summary: 'SUM' },
                ]
            }).run().each(function (rec) {
                data.push({
                    location_id: rec.getValue(rec.columns[0]),
                    currency_id: rec.getValue(rec.columns[1]),
                    warehouse_fee_total: rec.getValue(rec.columns[2]),
                });
                return true;
            });
            // if (data.length) {
            //     data = [...new Set(data)];
            // }
            log.audit('data length', data.length);
            return data;
        }

        function map(context) {
            try {
                var obj = JSON.parse(context.value);
                log.audit('map obj', obj);

                var location_info = interface.GetLocationInfo('', obj.location_id);
                log.audit('location_info', location_info);

                var ewfids = GetEWFIds(obj.location_id, obj.currency_id);
                log.audit('ewfids', ewfids);
                log.audit('ewfids', ewfids.length);



                var trandate = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_ewf_jo_end_date' });
                if (trandate) {
                    trandate = format.format({ value: trandate, type: 'date' })
                } else {
                    trandate = format.format({ value: moment().subtract(1, 'months').endOf('month').toDate(), type: 'date' });
                }

                var credit_account, debit_account;
                search.create({
                    type: 'customrecord_swc_ewf_config',
                    filters: [
                        { name: 'custrecord_swc_ewfc_type', operator: 'is', values: '预估' },
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
                rec.setValue({ fieldId: 'subsidiary', value: location_info.subsidiary });
                rec.setValue({ fieldId: 'currency', value: obj.currency_id });
                rec.setValue({ fieldId: 'trandate', value: format.parse({ value: trandate, type: 'date' }) });
                rec.setValue({ fieldId: 'memo', value: '尾程预估-实际仓租费' });
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

                for (let i = 0; i < ewfids.length; i++) {
                    context.write({
                        key: ewfids[i],
                        value: {
                            'jo_id': jo_id,
                            'amount': obj.warehouse_fee_total,
                            'ewf_id': ewfids[i],
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
                    var jo_id = obj.jo_id;
                    var ewf_id = obj.ewf_id;
                    var amount = obj.amount;
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
                } catch (error) {
                    log.error('reduce error', error);
                }

            });
        }

        function summarize(summary) {

        }

        function GetEWFIds(location_id, currency_id) {
            try {
                var data = [];

                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_ewf_jo_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_ewf_jo_end_date' });

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
                    ['isinactive', 'is', false], 'and',
                    ['custrecord_swc_ewh_fee_day_jo', 'anyof', ['@NONE@']], 'and',
                    ['custrecord_swc_ewh_fee_day_warehouse', 'anyof', location_id], 'and',
                    ['custrecord_swc_ewh_fee_day_currency', 'anyof', currency_id], 'and',
                    ['custrecord_swc_ewh_fee_day_date', 'within', [start_date, end_date]], 'and',
                    [
                        ['custrecord_swc_ewh_fee_day_type', 'is', '预估'], 'or',
                        ['custrecord_swc_ewh_fee_day_type', 'is', '差异']
                    ]
                ]

                var mySearch = search.create({
                    type: 'customrecord_swc_ewh_fee_day',
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
