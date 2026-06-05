/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_VCPO_ORDER.js
 *@author ZJG
 *@description 积加-查询VC-PO订单列表
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_vcpo_o_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_vcpo_o_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_vcpo_o_end_date' });
                var columnType = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_vcpo_o_date_columntype' });

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


                var page = 1, pageSize = 100;
                var params = {
                    columnType: columnType,
                    start_date: start_date,
                    end_date: end_date,
                    ackStatusList: [],//订单确认状态：IN_PROCESS-确认中，COMPLETE：已确认，FAILED-确认失败
                    asins: [],//ASIN列表
                    dealCodes: [],//交易代码列表
                    eans: [],//EAN列表
                    invoiceStatusList: [],//开票状态：0-全部商品未开票，1-部分商品已开票，2-全部商品已开票
                    invoiceSubmitStatus: '',//发票提交状态：0-未提交，1-提交中，2-提交完成，3-
                    marketIds: [],//站点ID列表
                    modelNumbers: [],//型号列表
                    mskus: [],//MSKU列表
                    prOrderType: '',//PR订单的类型：PO,DI
                    purchaseOrderNumbers: [],//订单编号列表
                    purchaseOrderState: '',//采购订单的当前状态：NEW-新创建的订单，ACKNOWLEDGED-供应商确认的订单，CLOSED-已完成的订单
                    purchaseOrderTypes: [],//采购订单的类型：REGULAR_ORDER,CONSIGNED_ORDER,NEW_PRODUCT_INTRODUCTION,RUSH_ORDER
                    sellingPartyId: '',//VendorCode
                    shipToCountryCodeList: [],//收货仓国家代码
                    shipToList: [],//收货仓
                    shipType: '',//发货方式：prepaid，collect
                    shipmentIds: [],//ASN
                    shipmentStatusList: [],//关联货件状态:DRAFT-草稿，CREATING-创建中，CREATED-已创建，SUBMITTING-提交中，SUBMITTED-已提交
                    skuList: [],//sku列表
                }

                try {
                    interface.JJGetVCPOOrder(jj_account, params, page, pageSize, []).map(function (a) {
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

                var vc_po_id = '';
                search.create({
                    type: 'customrecord_swc_jj_vc_po_order',
                    filters: [
                        { name: 'custrecord_swc_jj_vcpo_id', operator: 'is', values: obj.id },
                    ],
                }).run().each(function (rec) {
                    vc_po_id = rec.id;
                });
                log.audit('vc_po_id', vc_po_id);

                if (vc_po_id) {
                    var rec = record.load({ type: 'customrecord_swc_jj_vc_po_order', id: vc_po_id });
                } else {
                    var rec = record.create({ type: 'customrecord_swc_jj_vc_po_order', isDynamic: false });
                }

                for (var field_id in interface.fieldsMapping._VC_PO_ORDER_.mapping) {
                    if (obj[interface.fieldsMapping._VC_PO_ORDER_.mapping[field_id]]) {
                        rec.setValue({ fieldId: field_id, value: obj[interface.fieldsMapping._VC_PO_ORDER_.mapping[field_id]] })
                    }
                }

                rec.setValue({ fieldId: 'custrecord_swc_jj_vcpo_store', value: acc_info.id });
                rec.setValue({ fieldId: 'custrecord_swc_jj_vcpo_body', value: JSON.stringify(obj) });
                rec.setValue({ fieldId: 'custrecord_swc_jj_vcpo_orderlabelvos', value: JSON.stringify(obj.orderLabelVOS) });
                rec.setValue({ fieldId: 'custrecord_swc_jj_vcpo_orderitemvos', value: JSON.stringify(obj.orderItemVOS) });


                if (acc_info.id) {
                    if (obj.purchaseOrderChangedDate) {
                        // var pocd_date = format.format({ value: moment.utc(obj.purchaseOrderChangedDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var pocd_date = format.format({ value: moment.utc(obj.purchaseOrderChangedDate).toDate(), type: format.Type.DATE });
                        pocd_date = format.parse({ value: pocd_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcpo_pocd_date', value: pocd_date });
                    }
                    if (obj.purchaseOrderDate) {
                        // var pod_date = format.format({ value: moment.utc(obj.purchaseOrderDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var pod_date = format.format({ value: moment.utc(obj.purchaseOrderDate).toDate(), type: format.Type.DATE });
                        pod_date = format.parse({ value: pod_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcpo_pod_date', value: pod_date });
                    }
                    if (obj.shipWindowEnd) {
                        // var sw_end_date = format.format({ value: moment.utc(obj.shipWindowEnd).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var sw_end_date = format.format({ value: moment.utc(obj.shipWindowEnd).toDate(), type: format.Type.DATE });
                        sw_end_date = format.parse({ value: sw_end_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcpo_sw_end_date', value: sw_end_date });
                    }
                    if (obj.shipWindowStart) {
                        // var sw_start_date = format.format({ value: moment.utc(obj.shipWindowStart).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var sw_start_date = format.format({ value: moment.utc(obj.shipWindowStart).toDate(), type: format.Type.DATE });
                        sw_start_date = format.parse({ value: sw_start_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcpo_sw_start_date', value: sw_start_date });
                    }
                    if (obj.deliveryWindowEnd) {
                        // var dw_end_date = format.format({ value: moment.utc(obj.deliveryWindowEnd).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var dw_end_date = format.format({ value: moment.utc(obj.deliveryWindowEnd).toDate(), type: format.Type.DATE });
                        dw_end_date = format.parse({ value: dw_end_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcpo_dw_end_date', value: dw_end_date });
                    }
                    if (obj.deliveryWindowStart) {
                        // var dw_start_date = format.format({ value: moment.utc(obj.deliveryWindowStart).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var dw_start_date = format.format({ value: moment.utc(obj.deliveryWindowStart).toDate(), type: format.Type.DATE });
                        dw_start_date = format.parse({ value: dw_start_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcpo_dw_start_date', value: dw_start_date });
                    }
                    if (obj.updateTime) {
                        // var update_time = format.format({ value: moment.utc(obj.updateTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var update_time = format.format({ value: moment.utc(obj.updateTime).toDate(), type: format.Type.DATE });
                        update_time = format.parse({ value: update_time, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcpo_update_date', value: update_time });
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