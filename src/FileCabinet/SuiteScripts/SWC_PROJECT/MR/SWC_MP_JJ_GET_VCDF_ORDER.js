/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_VCDF_ORDER.js
 *@author ZJG
 *@description 积加-查询VC-DF订单列表
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_vcdf_o_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_vcdf_o_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_vcdf_o_end_date' });
                var columnType = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_vcdf_o_date_columntype' });
                var orderids = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_vcdf_o_orderids' });

                if (!start_date) {
                    start_date = moment.utc().subtract(2, 'day').startOf('day').toISOString().substring(0, 10);
                } else {
                    start_date = moment.utc(start_date).startOf('day').toISOString().substring(0, 10);
                }
                if (!end_date) {
                    end_date = moment.utc().add(8, 'h').toISOString().substring(0, 10);
                } else {
                    end_date = moment.utc(end_date).endOf('day').toISOString().substring(0, 10);
                }

                if (orderids) {
                    orderids = orderids.split(',');
                }

                var page = 1, pageSize = 100;
                var params = {
                    columnType: columnType,
                    start_date: start_date,
                    end_date: end_date,
                    asins: [],//ASIN列表
                    customerOrderNumbers: [],//买家订单号列表
                    marketIds: [],//站点ID列表
                    mskus: [],//MSKU列表
                    orderStatus: [],//订单状态:NEW-新增，SHIPPED-已发货，ACCEPTED-待发货，CANCELLED-已取消
                    purchaseOrderNumbers: orderids,//订单编号列表
                    skuList: [],//sku列表
                }

                try {
                    interface.JJGetVCDFOrder(jj_account, params, page, pageSize, []).map(function (a) {
                        data.push(a);
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

                var acc_info = interface.GetVCAccountInfo('', obj.marketId);
                log.audit('acc_info', acc_info);

                var vc_df_id = '';
                search.create({
                    type: 'customrecord_swc_jj_vc_df_order',
                    filters: [
                        { name: 'custrecord_swc_jj_vcdf_id', operator: 'is', values: obj.id },
                    ],
                }).run().each(function (rec) {
                    vc_df_id = rec.id;
                });
                log.audit('vc_df_id', vc_df_id);

                if (vc_df_id) {
                    var rec = record.load({ type: 'customrecord_swc_jj_vc_df_order', id: vc_df_id });
                } else {
                    var rec = record.create({ type: 'customrecord_swc_jj_vc_df_order', isDynamic: false });
                }

                for (var field_id in interface.fieldsMapping._VC_DF_ORDER_.mapping) {
                    if (obj[interface.fieldsMapping._VC_DF_ORDER_.mapping[field_id]]) {
                        rec.setValue({ fieldId: field_id, value: obj[interface.fieldsMapping._VC_DF_ORDER_.mapping[field_id]] })
                    }
                }

                rec.setValue({ fieldId: 'custrecord_swc_jj_vcdf_store', value: acc_info.id });
                rec.setValue({ fieldId: 'custrecord_swc_jj_vcdf_body', value: JSON.stringify(obj) });
                rec.setValue({ fieldId: 'custrecord_swc_jj_vcdf_orderlabelvos', value: JSON.stringify(obj.orderLabelVOS) });
                rec.setValue({ fieldId: 'custrecord_swc_jj_vcdf_orderitemvos', value: JSON.stringify(obj.orderItemVOS) });


                if (acc_info.id) {
                    if (obj.orderDate) {
                        // var od_date = format.format({ value: moment.utc(obj.orderDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var od_date = format.format({ value: moment.utc(obj.orderDate).toDate(), type: format.Type.DATE });
                        od_date = format.parse({ value: od_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcdf_od_date', value: od_date });
                    }
                    if (obj.promisedDeliveryDate) {
                        // var pdd_date = format.format({ value: moment.utc(obj.promisedDeliveryDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var pdd_date = format.format({ value: moment.utc(obj.promisedDeliveryDate).toDate(), type: format.Type.DATE });
                        pdd_date = format.parse({ value: pdd_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcdf_pdd_date', value: pdd_date });
                    }
                    if (obj.requiredShipDate) {
                        // var rsd_date = format.format({ value: moment.utc(obj.requiredShipDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var rsd_date = format.format({ value: moment.utc(obj.requiredShipDate).toDate(), type: format.Type.DATE });
                        rsd_date = format.parse({ value: rsd_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcdf_rsd_date', value: rsd_date });
                    }
                    if (obj.updateTime) {
                        // var update_time = format.format({ value: moment.utc(obj.updateTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var update_time = format.format({ value: moment.utc(obj.updateTime).toDate(), type: format.Type.DATE });
                        update_time = format.parse({ value: update_time, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcdf_updatedate', value: update_time });
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