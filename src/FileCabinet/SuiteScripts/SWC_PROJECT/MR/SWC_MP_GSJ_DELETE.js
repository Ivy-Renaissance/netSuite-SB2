/**
 * 内部交易操作
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(
    ['N/search', 'N/record', 'N/runtime'],
    function (search, record, runtime) {

        function getInputData() {
            var mySearch = initSearch();
            var col = mySearch.columns;
            var results = mySearch.run().getRange({
                start: 0,
                end: 1000
            });
            var alls = [];
            var j = 1;
            log.debug({ title: 'results.length', details: results.length });
            while (results.length > 0 && j < 10) {
                for (var i = 0; i < results.length; i++) {
                    var result = results[i];
                    var tmp = new Object();
                    tmp.po_id = result.getValue(col[0]);
                    tmp.so_id = result.getValue(col[1]);
                    alls[alls.length] = tmp;
                }
                results = mySearch.run().getRange({
                    start: 0 + j * 1000,
                    end: 1000 + j * 1000
                });
                j++;
            }
            log.debug({ title: 'alls', details: JSON.stringify(alls.length) });
            return alls;
        }

        function map(context) {
            try {
                log.debug({ title: 'context map', details: context });
                var value = JSON.parse(context.value);
                log.audit('value', value);

                deleteIntercotransactionPOSO(value.so_id, value.po_id)
            } catch (error) {
                log.error('error', error);
            }

        }

        function reduce(context) {
            log.debug({
                title: 'context reduce',
                details: context
            });
        }
        function summarize(summary) {
            log.debug({ title: 'summary', details: summary });
        }

        function initSearch() {
            var po_id = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_nb_po_id' });
            var filters = [
                ["type", "anyof", "PurchOrd"],
                "AND",
                ["mainline", "is", "T"],
                "AND",
                ["memomain", "is", "待删除"],
                // "AND",
                // ["intercotransaction", "noneof", "@NONE@"],
            ]
            if (po_id) {
                filters.push('and', ['internalid', 'anyof', po_id])
            }
            log.audit('filters', filters);

            var mySearch = search.create({
                type: "purchaseorder",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters: filters,
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "内部 ID" }),
                        search.createColumn({ name: "intercotransaction", label: "配对公司间事务处理" })
                    ]
            });
            return mySearch;
        }

        function deleteIntercotransactionPOSO(so_id, po_id) {
            log.audit('deletePOSO', {
                so_id: so_id,
                po_id: po_id,
            });
            var item_id = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_nb_item_id' });
            search.create({
                type: 'vendorbill',
                filters: [
                    { name: 'createdfrom', operator: 'is', values: po_id },
                    { name: 'mainline', operator: 'is', values: true },
                ],
                columns: [
                    { name: 'internalId' }
                ]
            }).run().each(function (rec) {
                if (rec.id) {
                    record.delete({
                        type: 'vendorbill',
                        id: rec.id
                    });
                    log.debug('delete vendorbill', rec.id)
                }
                return true;
            });

            search.create({
                type: 'itemreceipt',
                filters: [
                    { name: 'createdfrom', operator: 'is', values: po_id },
                    { name: 'mainline', operator: 'is', values: true },
                ],
                columns: [
                    { name: 'internalId' }
                ]
            }).run().each(function (rec) {
                if (rec.id) {
                    record.delete({
                        type: 'itemreceipt',
                        id: rec.id
                    });
                    log.debug('delete itemreceipt', rec.id)
                }
                return true;
            });

            so_id && search.create({
                type: 'invoice',
                filters: [
                    { name: 'createdfrom', operator: 'is', values: so_id },
                    { name: 'mainline', operator: 'is', values: true },
                ],
                columns: [
                    { name: 'internalId' }
                ]
            }).run().each(function (rec) {
                if (rec.id) {
                    record.delete({
                        type: 'invoice',
                        id: rec.id
                    });
                    log.debug('delete invoice', rec.id)
                }
                return true;
            });

            so_id && search.create({
                type: 'itemfulfillment',
                filters: [
                    { name: 'createdfrom', operator: 'is', values: so_id },
                    { name: 'mainline', operator: 'is', values: true },
                ],
                columns: [
                    { name: 'internalId' }
                ]
            }).run().each(function (rec) {
                if (rec.id) {
                    record.delete({
                        type: 'itemfulfillment',
                        id: rec.id
                    });
                    log.debug('delete itemfulfillment', rec.id)
                }
                return true;
            });

            if (so_id) {
                var so_rec = record.load({ type: 'salesorder', id: so_id });
                for (var s = 0; s < so_rec.getLineCount({ sublistId: 'item' }); s++) {
                    so_rec.setSublistValue({ sublistId: 'item', fieldId: 'item', value: item_id, line: s });
                    so_rec.setSublistValue({ sublistId: 'item', fieldId: 'amount', value: '0', line: s });
                }
                so_rec.save({ ignoreMandatoryFields: true });
            }


            var po_rec_ = record.load({ type: 'purchaseorder', id: po_id });
            for (var p = 0; p < po_rec_.getLineCount({ sublistId: 'item' }); p++) {
                po_rec_.setSublistValue({ sublistId: 'item', fieldId: 'item', value: item_id, line: p });
                po_rec_.setSublistValue({ sublistId: 'item', fieldId: 'amount', value: '0', line: p });
            }
            po_rec_.save({ ignoreMandatoryFields: true });


            record.submitFields({
                type: 'purchaseorder',
                id: po_id,
                values: {
                    intercotransaction: ''
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            so_id&&record.submitFields({
                type: 'salesorder',
                id: so_id,
                values: {
                    intercotransaction: ''
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            so_id&&record.delete({
                type: 'salesorder',
                id: so_id
            });

            record.delete({
                type: 'purchaseorder',
                id: po_id
            });
        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });