/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_SHIPMENT_ZFH.js
 *@author ZJG
 *@description 积加-自发货订单-配货单列表
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_zs_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var store_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_zs_store' });

                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_zs_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_zs_end_date' });

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

                var marketId = [];
                if (store_id) {
                    interface.getAccountList(store_id).map(function (account) {
                        marketId.push(account.jj_marketid);
                    });
                }
                log.audit('marketId', marketId);

                var thirdWarehouseFlag = false;  // 是否三方仓发货: N - 否、Y - 是
                var sourceCode = [];
                var order_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_zs_order_id' });
                if (order_id) {
                    sourceCode.push(order_id);
                }
                var page = 1, pageSize = 100;
                var params = {
                    marketId: marketId,
                    updateTimeAfter: start_date,
                    updateTimeBefore: end_date,
                    // deliveryTimeAfter: start_date,
                    // deliveryTimeBefore: end_date,
                    sourceChannel: [],
                    sourceCode: sourceCode,
                    shopId: [],
                    shopName: [],
                    customerPackageNoList: [],
                    orderCodeList: [],
                    // foOrderStatus: [],
                    foOrderStatus: ['SHIPPED', 'ALREADY_DELIVERY'],
                    shopCountry: [],
                    warehouseId: [],
                    orderType: [],
                    syncDeliveryFlag: [],
                    deliveryMethod: [],
                    accessMode: [],
                    bizStatusList: [],
                    labelList: [],
                    thirdWarehouseFlag: thirdWarehouseFlag,
                }

                try {
                    interface.JJGetZFHShipment(jj_account, params, page, pageSize, []).map(function (zs) {
                        data.push(zs);
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

                var orderItems = obj.orderItems;

                for (let i = 0; i < orderItems.length; i++) {
                    let items = orderItems[i];
                    let zs_id = '';
                    search.create({
                        type: 'customrecord_swc_jj_zfh_shipment',
                        filters: [
                            { name: 'custrecord_swc_jj_zs_id', operator: 'is', values: obj.id },
                            { name: 'custrecord_swc_jj_zs_fo_order_line_no', operator: 'is', values: items.foOrderLineNo },
                        ],
                    }).run().each(function (rec) {
                        zs_id = rec.id;
                    });
                    log.audit('zs_id', zs_id);

                    if (zs_id) {
                        var rec = record.load({ type: 'customrecord_swc_jj_zfh_shipment', id: zs_id });
                    } else {
                        var rec = record.create({ type: 'customrecord_swc_jj_zfh_shipment', isDynamic: false });
                    }

                    if (acc_info.id) {
                        rec.setValue({ fieldId: 'custrecord_swc_jj_zs_store', value: acc_info.id });
                    }
                    rec.setValue({ fieldId: 'custrecord_swc_jj_zs_shippingamount', value: items.shippingAmount });
                    rec.setValue({ fieldId: 'custrecord_swc_jj_zs_others', value: items.others });
                    rec.setValue({ fieldId: 'custrecord_swc_jj_zs_consigneeinfo', value: JSON.stringify(obj.consigneeInfo) });
                    rec.setValue({ fieldId: 'custrecord_swc_jj_zs_body', value: JSON.stringify(obj) });

                    for (var field_id in interface.fieldsMapping._ZFH_SHIPMENT_.mapping) {
                        if (obj[interface.fieldsMapping._ZFH_SHIPMENT_.mapping[field_id]]) {
                            rec.setValue({ fieldId: field_id, value: obj[interface.fieldsMapping._ZFH_SHIPMENT_.mapping[field_id]] })
                        }
                    }

                    for (var field_id in interface.fieldsMapping._ZFH_SHIPMENT_.mapping) {
                        if (items[interface.fieldsMapping._ZFH_SHIPMENT_.mapping[field_id]]) {
                            rec.setValue({ fieldId: field_id, value: items[interface.fieldsMapping._ZFH_SHIPMENT_.mapping[field_id]] })
                        }
                    }

                    if (obj.isCustomizationOrder == 'Y') {
                        rec.setValue({ fieldId: 'custrecord_swc_jj_zs_iscustomizationorde', value: true });
                    }
                    if (obj.thirdWarehouseFlag == 'Y') {
                        rec.setValue({ fieldId: 'custrecord_swc_jj_zs_thirdwarehouse_flag', value: true });
                    }

                    if (obj.deliveryTimeMarket) {
                        if (acc_info.id) {
                            var shipment_date = format.format({ value: moment.utc(obj.deliveryTimeMarket).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                            shipment_date = format.parse({ value: shipment_date, type: 'date' });
                            rec.setValue({ fieldId: 'custrecord_swc_jj_zs_delivery_date', value: shipment_date });
                        }
                    }
                    var id = rec.save({ ignoreMandatoryFields: true });
                    log.debug("cache save success", id);

                }

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