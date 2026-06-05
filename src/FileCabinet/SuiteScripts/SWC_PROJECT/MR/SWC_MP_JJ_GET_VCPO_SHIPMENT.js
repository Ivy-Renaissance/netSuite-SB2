/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_VCPO_SHIPMENT.js
 *@author ZJG
 *@description 积加-查询VC-PO货件列表（废弃，改用获取大货发货单接口）
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_vcpo_sm_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_vcpo_sm_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_vcpo_sm_end_date' });

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
                    start_date: start_date,
                    end_date: end_date,
                    abnormalTypeList: [],//异常类型：CREATE_PREPAID_SHIPMENT_FAILED、CREATE_COLLECT_SHIPMENT_FAILED、CREATE_COLLECT_ASN_FAILED
                    amazonReferenceNumberList: [],//ARN集合
                    amzShipType: [],//配送方式：SMALL_PARCEL-小包裹SPD，LESS_THAN_TRUCK_LOAD-零担LTL
                    asinList: [],//ASIN集合
                    marketIdList: [],//站点id
                    mskuList: [],//MSKU集合
                    outboundOrderList: [],//系统出库单号集合
                    purchaseOrderNumberList: [],//采购单号
                    referenceNumberList: [],//referenceIdList
                    shipFromList: [],//发货仓
                    shipToList: [],//收货仓
                    shipmentShippingStatusList: [],//货件发货状态：READY-待发货，WORKING-仓库作业中，SHIPPED-已发货
                    shipmentStatusList: [],//货件状态：DRAFT-草稿，CREATING-创建中，CREATED-已创建，SUBMITTING-提交中，SUBMITTED-已提交
                    skuList: [],//SKU集合
                }

                try {
                    interface.JJGetVCPOShipment(jj_account, params, page, pageSize, []).map(function (a) {
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

                var ps_id = '';
                search.create({
                    type: 'customrecord_swc_jj_vc_po_shipment',
                    filters: [
                        { name: 'custrecord_swc_jj_vcps_store', operator: 'is', values: acc_info.id },
                        { name: 'custrecord_swc_jj_vcpo_id', operator: 'is', values: obj.id },
                        { name: 'custrecord_swc_jj_vcps_outboundorder', operator: 'is', values: obj.outboundOrder },
                        { name: 'custrecord_swc_jj_vcps_shipmentid', operator: 'is', values: obj.shipmentId },
                        { name: 'custrecord_swc_jj_vcps_arn', operator: 'is', values: obj.amazonReferenceNumber },
                    ],
                }).run().each(function (rec) {
                    ps_id = rec.id;
                });
                log.audit('ps_id', ps_id);

                if (ps_id) {
                    var rec = record.load({ type: 'customrecord_swc_jj_vc_po_shipment', id: ps_id });
                } else {
                    var rec = record.create({ type: 'customrecord_swc_jj_vc_po_shipment', isDynamic: false });
                }

                for (var field_id in interface.fieldsMapping._VC_PO_SHIPMENT_.mapping) {
                    if (obj[interface.fieldsMapping._VC_PO_SHIPMENT_.mapping[field_id]]) {
                        rec.setValue({ fieldId: field_id, value: obj[interface.fieldsMapping._VC_PO_SHIPMENT_.mapping[field_id]] })
                    }
                }

                rec.setValue({ fieldId: 'custrecord_swc_jj_vcps_store', value: acc_info.id });
                rec.setValue({ fieldId: 'custrecord_swc_jj_vcps_body', value: JSON.stringify(obj) });
                rec.setValue({ fieldId: 'custrecord_swc_jj_vcps_cartonlist', value: JSON.stringify(obj.cartonList) });
                rec.setValue({ fieldId: 'custrecord_swc_jj_vcps_itemlist', value: JSON.stringify(obj.itemList) });
                rec.setValue({ fieldId: 'custrecord_swc_jj_vcps_joineditemlist', value: JSON.stringify(obj.joinedItemList) });


                if (acc_info.id) {
                    if (obj.createTime) {
                        var create_date = format.format({ value: moment.utc(obj.createTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        create_date = format.parse({ value: create_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcps_create_date', value: create_date });
                    }
                    if (obj.estimatedDeliveryTime) {
                        var ed_date = format.format({ value: moment.utc(obj.estimatedDeliveryTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        ed_date = format.parse({ value: ed_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcps_ed_date', value: ed_date });
                    }
                    if (obj.outboundTime) {
                        var outbound_date = format.format({ value: moment.utc(obj.outboundTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        outbound_date = format.parse({ value: outbound_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcps_outbound_date', value: outbound_date });
                    }
                    if (obj.requestedPickupTime) {
                        var rp_date = format.format({ value: moment.utc(obj.requestedPickupTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        rp_date = format.parse({ value: rp_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcps_rp_date', value: rp_date });
                    }
                    if (obj.shippedTime) {
                        var shipped_date = format.format({ value: moment.utc(obj.shippedTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        shipped_date = format.parse({ value: shipped_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_vcps_shipped_date', value: shipped_date });
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