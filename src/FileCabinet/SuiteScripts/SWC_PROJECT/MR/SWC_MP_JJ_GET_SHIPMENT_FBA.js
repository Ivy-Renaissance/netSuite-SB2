/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_SHIPMENT_FBA.js
 *@author ZJG
 *@description 积加-查询FBA配送信息列表
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_fs_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var store_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_fs_store' });
                var order_ids = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_fs_orderids' });

                var shipment_start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_fs_shipment_start_date' });
                var shipment_end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_fs_shipment_end_date' });

                var update_start_date, update_end_date;
                if (!shipment_start_date) {
                    shipment_start_date = moment.utc().subtract(2, 'day').startOf('day').toISOString().substring(0, 10);
                    update_start_date = moment.utc().subtract(2, 'day').startOf('day').toISOString().substring(0, 19).replace('T', ' ');
                } else {
                    shipment_start_date = moment.utc(shipment_start_date).startOf('day').toISOString().substring(0, 10);
                    update_start_date = moment.utc(shipment_start_date).startOf('day').toISOString().substring(0, 19).replace('T', ' ');
                }
                if (!shipment_end_date) {
                    shipment_end_date = moment.utc().add(8, 'h').toISOString().substring(0, 10);
                    update_end_date = moment.utc().add(8, 'h').toISOString().substring(0, 19).replace('T', ' ');
                } else {
                    shipment_end_date = moment.utc(shipment_end_date).endOf('day').toISOString().substring(0, 10);
                    update_end_date = moment.utc(shipment_end_date).endOf('day').toISOString().substring(0, 19).replace('T', ' ');
                }


                var req_order_ids = [];
                if (order_ids) {
                    req_order_ids = order_ids.split(',');
                }
                var marketIds = [];
                if (store_id) {
                    interface.getAccountList(store_id).map(function (account) {
                        marketIds.push(account.jj_marketid);
                    });
                }
                log.audit('marketIds', marketIds);

                var page = 1, pageSize = 100;
                var params = {
                    marketIds: marketIds,
                    orderIds: req_order_ids,
                    dateType: 0,
                    // purchaseStartDate: purchaseStartDate,
                    // purchaseEndDate: purchaseEndDate,
                    // shipmentStartDate: shipment_start_date,
                    // shipmentEndDate: shipment_end_date,
                    // estimatedArrivalDateBegin: estimatedArrivalDateBegin,
                    // estimatedArrivalDateEnd: estimatedArrivalDateEnd,
                    // createTimeBegin: createTimeBegin,
                    // createTimeEnd: createTimeEnd,
                    updateTimeBegin: update_start_date,
                    updateTimeEnd: update_end_date,
                    // orderTypes: orderTypes,
                    orderTypes: [],
                }

                try {
                    interface.JJGetFbaShipment(jj_account, params, page, pageSize, []).map(function (fs) {
                        data.push(fs);
                    });
                } catch (e1) {
                    log.error('handleit error', e1)
                }
            } catch (e) {
                log.error('getinput error', e);
            }
            log.audit("data length", data.length);
            return data;
        }

        function map(context) {
            try {
                var obj = JSON.parse(context.value);
                log.audit('obj', obj);

                var acc_info = interface.GetAccountInfo('', obj.marketId);
                log.audit('acc_info', acc_info);

                var fs_id = '';
                search.create({
                    type: 'customrecord_swc_jj_fba_shipment',
                    filters: [
                        { name: 'custrecord_swc_jj_fs_id', operator: 'is', values: obj.id },
                    ],
                }).run().each(function (rec) {
                    fs_id = rec.id;
                });
                log.audit('fs_id', fs_id);

                if (fs_id) {
                    var rec = record.load({ type: 'customrecord_swc_jj_fba_shipment', id: fs_id });
                } else {
                    var rec = record.create({ type: 'customrecord_swc_jj_fba_shipment', isDynamic: false });
                }

                rec.setValue({ fieldId: 'custrecord_swc_jj_fs_store', value: acc_info.id });


                for (var field_id in interface.fieldsMapping._FBA_SHIPMENT_.mapping) {
                    if (obj[interface.fieldsMapping._FBA_SHIPMENT_.mapping[field_id]]) {
                        rec.setValue({ fieldId: field_id, value: obj[interface.fieldsMapping._FBA_SHIPMENT_.mapping[field_id]] })
                    }
                }

                if (acc_info.id) {
                    if (obj.purchaseDate) {
                        var purchase_date = format.format({ value: moment.utc(obj.purchaseDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        purchase_date = format.parse({ value: purchase_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_fs_purchase_date', value: purchase_date });
                    }
                    if (obj.paymentsDate) {
                        var payments_date = format.format({ value: moment.utc(obj.paymentsDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        payments_date = format.parse({ value: payments_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_fs_payments_date', value: payments_date });
                    }
                    if (obj.shipmentDate) {
                        var shipment_ate = format.format({ value: moment.utc(obj.shipmentDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        shipment_ate = format.parse({ value: shipment_ate, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_fs_shipment_date', value: shipment_ate });
                    }
                    if (obj.estimatedArrivalDate) {
                        var estimated_arrivalDate = format.format({ value: moment.utc(obj.estimatedArrivalDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        estimated_arrivalDate = format.parse({ value: estimated_arrivalDate, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_fs_ea_date', value: estimated_arrivalDate });
                    }
                    if (obj.createTime) {
                        var create_time = format.format({ value: moment.utc(obj.createTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        create_time = format.parse({ value: create_time, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_fs_create_time', value: create_time });
                    }
                    if (obj.updateTime) {
                        var update_time = format.format({ value: moment.utc(obj.updateTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        update_time = format.parse({ value: update_time, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_fs_update_time', value: update_time });
                    }
                }


                var id = rec.save({ ignoreMandatoryFields: true });
                log.debug("cache save success", id);
            } catch (e) {
                log.error("import cache error", e);
            }
        }

        function reduce(context) {
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