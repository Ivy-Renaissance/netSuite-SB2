/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_ORDER_MAIN.js
 *@author ZJG
 *@description 积加-全渠道订单查询
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var request_acc = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_go_main_account' });
                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_go_main_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_go_main_end_date' });
                var order_ids = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_go_main_orderids' });

                if (!start_date) {
                    start_date = moment.utc().subtract(2, 'day').startOf('day').toISOString().substring(0, 19).replace('T', ' ');
                } else {
                    start_date = moment.utc(start_date).startOf('day').toISOString().substring(0, 19).replace('T', ' ');
                }
                if (!end_date) {
                    end_date = moment.utc().add(8, 'h').toISOString().substring(0, 19).replace('T', ' ');
                } else {
                    end_date = moment.utc(end_date).endOf('day').toISOString().substring(0, 19).replace('T', ' ');
                }
                var req_order_ids = [];
                if (order_ids) {
                    req_order_ids = order_ids.split(',');
                }

                log.audit('start_date', start_date);
                log.audit('end_date', end_date);
                log.audit('req_order_ids', req_order_ids);
                var page = 1, pageSize = 500;
                interface.getAccountList(request_acc).map(function (account) {
                    try {
                        if (req_order_ids.length && request_acc) {
                            interface.JJListOrders(account, '', '', req_order_ids, page, pageSize, []).map(function (order) {
                                order.account = account;
                                data.push(order);
                            });
                        } else {
                            interface.JJListOrders(account, start_date, end_date, '', page, pageSize, []).map(function (order) {
                                order.account = account;
                                data.push(order);
                            });
                        }
                    } catch (e1) {
                        log.error('handleit error', e1)
                    }
                })

            } catch (e) {
                log.error('getinput error', e);
            }
            log.audit("data length", data.length);
            return data;
        }

        function map(context) {
            try {
                var order = JSON.parse(context.value);
                log.audit('order', order);
                var account = order.account;
                delete order.account;

                var r, r_id, cach_resolved;
                search.create({
                    type: 'customrecord_swc_jj_order_cache',
                    filters: [
                        { name: 'custrecord_swc_jj_oc_store', operator: 'anyof', values: account.id },
                        { name: 'custrecord_swc_jj_oc_order_id', operator: 'is', values: order.orderId },
                        { name: 'custrecord_swc_jj_oc_id', operator: 'is', values: order.id },
                    ]
                }).run().each(function (rec) {
                    r_id = rec.id
                    r = record.load({ type: 'customrecord_swc_jj_order_cache', id: rec.id });
                    updateTime = rec.getValue('custrecord_swc_jj_oc_updatetime');
                    cach_resolved = rec.getValue('custrecord_swc_jj_oc_resolved');
                    return false;
                });
                if (!r) {
                    r = record.create({ type: 'customrecord_swc_jj_order_cache' });
                } else if (updateTime == order.updateTime && cach_resolved) {
                    //已解决的cach，并且更新时间没发生变化，就不要重新保存了
                    return;
                }
                r.setValue({ fieldId: 'custrecord_swc_jj_oc_id', value: order.id });
                r.setValue({ fieldId: 'custrecord_swc_jj_oc_store', value: account.id });
                r.setValue({ fieldId: 'custrecord_swc_jj_oc_main_info', value: JSON.stringify(order) });
                r.setValue({ fieldId: 'custrecord_swc_jj_oc_order_id', value: order.orderId });
                r.setValue({ fieldId: 'custrecord_swc_jj_oc_resolved', value: false });
                r.setValue({ fieldId: 'custrecord_swc_jj_oc_platformcode', value: order.platformCode });
                r.setValue({ fieldId: 'custrecord_swc_jj_oc_order_status', value: order.orderStatus });
                r.setValue({ fieldId: 'custrecord_swc_jj_oc_platformorderstatus', value: order.platformOrderStatus });
                r.setValue({ fieldId: 'custrecord_swc_jj_oc_order_type', value: order.orderType });
                r.setValue({ fieldId: 'custrecord_swc_jj_oc_purchase_date_text', value: order.purchaseDate });
                r.setValue({ fieldId: 'custrecord_swc_jj_oc_updatetime', value: order.updateTime });
                var acc_local_time = format.format({
                    value: moment.utc(order.purchaseDate).toDate(),
                    type: format.Type.DATETIMETZ,
                    timezone: account.store_time_zone
                });
                var order_trandate = format.parse({ value: acc_local_time, type: 'date' });
                r.setValue({ fieldId: 'custrecord_swc_jj_oc_purchase_date', value: order_trandate });
                var ss = r.save();
                log.debug("cache save success", ss);
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