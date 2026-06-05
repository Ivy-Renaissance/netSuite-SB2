/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author ZJG
 *@name SWC_MP_WAREHOUSE_FEE_IF_JOUR.js
 *@description 尾程货品履行仓租费日记账
 */
define(['../common/interface', '../common/moment', 'N/runtime', 'N/record', 'N/search', 'N/format', 'N/error'],
    function (interface, moment, runtime, record, search, format, error) {

        function getInputData() {
            let data = [];

            let subsidiary = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wf_if_jo_subsidiary' });
            let start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wf_if_jo_start_date' });
            let end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wf_if_jo_end_date' });

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

            let filters = [
                { name: 'mainline', operator: 'is', values: true },
                { name: 'custbody_swc_calculate_warehouse_fee', operator: 'is', values: true },
                { name: 'custbody_swc_warehouse_fee_resolved', operator: 'is', values: false },
                { name: 'mainline', join: 'createdfrom', operator: 'is', values: true },
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
                type: 'itemfulfillment',
                filters: filters,
                columns: [
                    { name: 'subsidiary', summary: 'GROUP' },
                    { name: 'location', summary: 'GROUP' },
                    { name: 'custbody_swc_warehouse_fee_currency', summary: 'GROUP' },
                    { name: 'type', join: 'createdfrom', summary: 'GROUP' },
                    { name: 'intercostatus', join: 'createdfrom', summary: 'GROUP' },
                    { name: 'custbody_swc_warehouse_fee_total', summary: 'SUM' },
                ]
            }).run().each(function (rec) {
                data.push({
                    sub_id: rec.getValue(rec.columns[0]),
                    location_id: rec.getValue(rec.columns[1]),
                    currency_id: rec.getValue(rec.columns[2]),
                    createdfrom_type: rec.getValue(rec.columns[3]),
                    createdfrom_intercostatus: rec.getValue(rec.columns[4]),
                    warehouse_fee_total: rec.getValue(rec.columns[5]),
                });
                return true;
            });
            log.audit('data length', data.length);
            return data;
        }

        function map(context) {
            try {
                let obj = JSON.parse(context.value);
                log.audit('map obj', obj);

                let ifids = GetIfIds(obj.sub_id, obj.currency_id, obj.createdfrom_type, obj.createdfrom_intercostatus, obj.location_id);
                log.audit('ifids', ifids);
                log.audit('ifids', ifids.length);

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

                let trandate = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wf_if_jo_end_date' });
                if (trandate) {
                    trandate = format.format({ value: trandate, type: 'date' })
                } else {
                    trandate = format.format({ value: moment().subtract(1, 'months').endOf('month').toDate(), type: 'date' });
                }

                if (obj.createdfrom_type == 'TrnfrOrd') {

                    let credit_account, debit_account;
                    search.create({
                        type: 'customrecord_swc_ewf_config',
                        filters: [
                            { name: 'custrecord_swc_ewfc_type', operator: 'is', values: '调拨出库' },
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
                    rec.setValue({ fieldId: 'memo', value: '调拨货品履行仓租费' });
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


                    for (let i = 0; i < ifids.length; i++) {
                        context.write({
                            key: ifids[i],
                            value: {
                                'type': 'if',
                                'jo_id': jo_id,
                                'amount': obj.warehouse_fee_total,
                                'if_id': ifids[i],
                            }
                        });
                    }
                    let ewf_ids = GetEWFIds(ifids);
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
                    return
                } else {
                    if (obj.createdfrom_intercostatus) {

                        let if_result = GetIFSOPO(ifids);
                        log.audit('if_result', if_result);
                        for (let i = 0; i < if_result.length; i++) {
                            const element = if_result[i];
                            let if_ids = element.if_ids;
                            let so_ids = element.so_ids;
                            let po_ids = element.po_ids;

                            let rec = record.create({ type: 'advintercompanyjournalentry', isDynamic: true });
                            rec.setValue({ fieldId: 'subsidiary', value: element.so_subsidiary });
                            rec.setValue({ fieldId: 'currency', value: currency_id });
                            rec.setValue({ fieldId: 'trandate', value: format.parse({ value: trandate, type: 'date' }) });
                            rec.setValue({ fieldId: 'memo', value: '尾程公司间货品履行仓租费' });
                            rec.setValue({ fieldId: 'approvalstatus', value: 2 });
                            rec.setValue({ fieldId: 'custbody_swc_journal_type', value: "13" });  //公司间日记账

                            rec.selectNewLine({ sublistId: 'line' });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'linesubsidiary', value: element.so_subsidiary });
                            if (runtime.accountId == '11297254_SB1') {
                                rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: '155' });//6401.04 主营业务成本 : 公司间成本（原成本-关联）
                            } else {
                                rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: '956' });//6401.04 主营业务成本 : 公司间成本（原成本-关联）
                            }
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: obj.warehouse_fee_total });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'duetofromsubsidiary', value: element.po_subsidiary });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'eliminate', value: true });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: element.so_entity });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: element.so_location });
                            rec.commitLine({ sublistId: 'line' });
                            rec.selectNewLine({ sublistId: 'line' });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'linesubsidiary', value: element.so_subsidiary });
                            if (runtime.accountId == '11297254_SB1') {
                                rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: '920' });//1405 库存货品
                            } else {
                                rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: '160' });//1405 库存货品
                            }
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: obj.warehouse_fee_total });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: element.so_location });
                            rec.commitLine({ sublistId: 'line' });
                            rec.selectNewLine({ sublistId: 'line' });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'linesubsidiary', value: element.so_subsidiary });
                            if (runtime.accountId == '11297254_SB1') {
                                rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: '152' });//1122.01 应收账款 : 应收账款-公司间往来（应收-关联）
                            } else {
                                rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: '447' });//1122.01 应收账款 : 应收账款-公司间往来（应收-关联）
                            }
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: obj.warehouse_fee_total });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'duetofromsubsidiary', value: element.po_subsidiary });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'eliminate', value: true });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: element.so_entity });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: element.so_location });
                            rec.commitLine({ sublistId: 'line' });
                            rec.selectNewLine({ sublistId: 'line' });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'linesubsidiary', value: element.so_subsidiary });
                            if (runtime.accountId == '11297254_SB1') {
                                rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: '630' });//6001.02.01 主营业务收入 : 公司间收入（收入-关联） : 营业收入_公司间收入-代采购
                            } else {
                                rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: '638' });//6001.02.01 主营业务收入 : 公司间收入（收入-关联） : 营业收入_公司间收入-代采购
                            }
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: obj.warehouse_fee_total });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'duetofromsubsidiary', value: element.po_subsidiary });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'eliminate', value: true });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: element.so_entity });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: element.so_location });
                            rec.commitLine({ sublistId: 'line' });

                            rec.selectNewLine({ sublistId: 'line' });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'linesubsidiary', value: element.po_subsidiary });
                            if (runtime.accountId == '11297254_SB1') {
                                rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: '920' });//1405 库存货品
                            } else {
                                rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: '160' });//1405 库存货品
                            }
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: obj.warehouse_fee_total });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: element.po_location });
                            rec.commitLine({ sublistId: 'line' });
                            rec.selectNewLine({ sublistId: 'line' });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'linesubsidiary', value: element.po_subsidiary });
                            if (runtime.accountId == '11297254_SB1') {
                                rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: '153' });//2202.01 应付账款 : 应付账款-公司间往来（应付-关联）
                            } else {
                                rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: '498' });//2202.01 应付账款 : 应付账款-公司间往来（应付-关联）
                            }
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: obj.warehouse_fee_total });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'duetofromsubsidiary', value: element.so_subsidiary });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'eliminate', value: true });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: element.po_entity });
                            rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: element.po_location });
                            rec.commitLine({ sublistId: 'line' });

                            let jo_id = rec.save({ ignoreMandatoryFields: true });
                            log.audit('jo_id', jo_id);

                            for (let j = 0; j < if_ids.length; j++) {
                                context.write({
                                    key: if_ids[j],
                                    value: {
                                        'type': 'if',
                                        'jo_id': jo_id,
                                        'amount': obj.warehouse_fee_total,
                                        'if_id': if_ids[j],
                                    }
                                });
                            }

                            let ewf_ids = GetEWFIds(if_ids);
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

                        }

                    } else {
                        let credit_account, debit_account;
                        search.create({
                            type: 'customrecord_swc_ewf_config',
                            filters: [
                                { name: 'custrecord_swc_ewfc_type', operator: 'is', values: '销售出库' },
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
                        rec.setValue({ fieldId: 'memo', value: '尾程货品履行仓租费' });
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

                        for (let i = 0; i < ifids.length; i++) {
                            context.write({
                                key: ifids[i],
                                value: {
                                    'type': 'if',
                                    'jo_id': jo_id,
                                    'amount': obj.warehouse_fee_total,
                                    'if_id': ifids[i],
                                }
                            });
                        }
                        let ewf_ids = GetEWFIds(ifids);
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
                    }
                }

            } catch (err) {
                log.debug('map error', err)
            }
        }

        function reduce(context) {
            log.audit('reduce key', context.key);
            let v = context.values
            v.map(function (obj) {
                try {
                    obj = JSON.parse(obj);
                    log.debug('obj', obj);
                    let jo_id = obj.jo_id || '';
                    let if_id = obj.if_id;
                    let ewf_id = obj.ewf_id;
                    let type = obj.type;
                    let amount = obj.amount;
                    if (type == 'if') {
                        record.submitFields({
                            type: 'itemfulfillment',
                            id: if_id,
                            values: {
                                custbody_swc_warehouse_fee_resolved: true,
                                custbody_swc_relation_jour: jo_id,
                                custbody_swc_warehouse_fee_total_amt: amount,
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

        function GetIfIds(sub_id, currency_id, createdfrom_type, createdfrom_intercostatus, location_id) {
            try {
                let data = [];

                let start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wf_if_jo_start_date' });
                let end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wf_if_jo_end_date' });

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

                let filters = [
                    { name: 'mainline', operator: 'is', values: true },
                    { name: 'subsidiary', operator: 'anyof', values: sub_id },
                    { name: 'location', operator: 'anyof', values: location_id },
                    { name: 'trandate', operator: 'within', values: [start_date, end_date] },
                    { name: 'custbody_swc_relation_jour', operator: 'anyof', values: ['@NONE@'] },
                    { name: 'custbody_swc_calculate_warehouse_fee', operator: 'is', values: true },
                    { name: 'custbody_swc_warehouse_fee_resolved', operator: 'is', values: false },
                ]
                if (currency_id) {
                    filters.push({ name: 'custbody_swc_warehouse_fee_currency', operator: 'anyof', values: currency_id });
                } else {
                    filters.push({ name: 'custbody_swc_warehouse_fee_currency', operator: 'anyof', values: ['@NONE@'] });
                }
                if (createdfrom_type) {
                    filters.push({ name: 'type', join: 'createdfrom', operator: 'anyof', values: createdfrom_type });
                }
                if (createdfrom_intercostatus) {
                    filters.push({ name: 'intercostatus', join: 'createdfrom', operator: 'anyof', values: createdfrom_intercostatus });
                } else {
                    filters.push({ name: 'intercostatus', join: 'createdfrom', operator: 'anyof', values: ['@NONE@'] });
                }

                log.audit('filters', filters);

                let mySearch = search.create({
                    type: 'itemfulfillment',
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
                log.error('GetIfIds error', error);
            }
        }

        function GetIFSOPO(ifids) {
            try {
                log.audit('GetEWFIds', ifids);
                let so_ids = [], po_ids = [], if_po_so = [];

                let filters = [
                    ['mainline', 'is', true], 'and',
                    ['createdfrom.mainline', 'is', true], 'and',
                    ['internalid', 'anyof', ifids]
                ]
                let mySearch = search.create({
                    type: 'itemfulfillment',
                    filters: filters,
                    columns: [
                        { name: 'createdfrom' },
                        { name: 'location' },
                        { name: 'entity', join: 'createdfrom' },
                        { name: 'subsidiary', join: 'createdfrom' },
                        { name: 'intercotransaction', join: 'createdfrom' },
                    ]
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
                        so_ids.push(rec.getValue('createdfrom'));
                        po_ids.push(rec.getValue({ name: 'intercotransaction', join: 'createdfrom' }));
                        if_po_so.push({
                            if_id: rec.id,
                            so_id: rec.getValue('createdfrom'),
                            so_location: rec.getValue('location'),
                            so_entity: rec.getValue({ name: 'entity', join: 'createdfrom' }),
                            so_subsidiary: rec.getValue({ name: 'subsidiary', join: 'createdfrom' }),
                            po_id: rec.getValue({ name: 'intercotransaction', join: 'createdfrom' }),
                            po_subsidiary: '',
                            po_entity: '',
                            po_location: '',
                        })
                    });
                }
                if (so_ids.length) {
                    so_ids = [...new Set(so_ids)];
                }
                if (po_ids.length) {
                    po_ids = [...new Set(po_ids)];
                }


                let so_po_info = [];
                let mySearchSOPO = search.create({
                    type: 'purchaseorder',
                    filters: [
                        ['mainline', 'is', true], 'and',
                        ['internalid', 'anyof', po_ids],
                    ],
                    columns: [
                        { name: 'intercotransaction' },
                        { name: 'subsidiary' },
                        { name: 'entity' },
                        { name: 'location' },
                    ]
                })
                let pageDataSOPO = mySearchSOPO.runPaged({
                    pageSize: pageSize
                });
                let totalCountSOPO = pageDataSOPO.count; //总数
                let pageCountSOPO = pageDataSOPO.pageRanges.length; //页数
                for (let i = 0; i < pageCountSOPO; i++) {
                    pageDataSOPO.fetch({
                        index: i
                    }).data.forEach(function (rec) {
                        so_po_info.push({
                            po_id: rec.id,
                            so_id: rec.getValue('intercotransaction'),
                            po_subsidiary: rec.getValue('subsidiary'),
                            po_entity: rec.getValue('entity'),
                            po_location: rec.getValue('location'),
                        })
                    });
                }

                for (let i = 0; i < if_po_so.length; i++) {
                    for (let j = 0; j < so_po_info.length; j++) {
                        if (if_po_so[i].so_id == so_po_info[j].so_id && if_po_so[i].po_id == so_po_info[j].po_id) {
                            if_po_so[i].po_subsidiary = so_po_info[j].po_subsidiary;
                            if_po_so[i].po_entity = so_po_info[j].po_entity;
                            if_po_so[i].po_location = so_po_info[j].po_location;
                        }
                    }
                }
                log.audit('if_po_so', if_po_so);

                let result = groupBySubsidiary(if_po_so);

                return result;

            } catch (error) {
                log.error('GetIfIds error', error);
            }
        }

        function GetEWFIds(ifids) {
            try {
                log.audit('GetEWFIds', ifids);

                let data = [];

                let filters = [
                    { name: 'custrecord_swc_ewh_fee_day_if', operator: 'anyof', values: ifids },
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

        // 按 so_subsidiary + po_subsidiary 分组汇总
        function groupBySubsidiary(data) {
            const map = {};

            data.forEach(item => {
                // 唯一键：so_subsidiary + po_subsidiary
                const key = item.so_subsidiary + '_' + item.so_entity + '_' + item.so_location + '_' + item.po_subsidiary + '_' + item.po_entity + '_' + item.po_location;

                if (!map[key]) {
                    map[key] = {
                        so_subsidiary: item.so_subsidiary,
                        so_entity: item.so_entity,
                        so_location: item.so_location,
                        po_subsidiary: item.po_subsidiary,
                        po_entity: item.po_entity,
                        po_location: item.po_location,
                        if_id_list: [],
                        so_id_list: [],
                        po_id_list: []
                    };
                }
                // 把值 push 进数组
                map[key].if_id_list.push(item.if_id);
                map[key].so_id_list.push(item.so_id);
                map[key].po_id_list.push(item.po_id);
            });

            // 转成数组，并把数组转成逗号字符串
            return Object.values(map).map(group => ({
                so_subsidiary: group.so_subsidiary,
                so_entity: group.so_entity,
                so_location: group.so_location,
                po_subsidiary: group.po_subsidiary,
                po_entity: group.po_entity,
                po_location: group.po_location,
                if_ids: group.if_id_list,
                so_ids: group.so_id_list,
                po_ids: group.po_id_list
            }));
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });
