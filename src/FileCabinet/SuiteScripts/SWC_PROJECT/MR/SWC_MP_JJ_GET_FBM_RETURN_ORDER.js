/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_FBM_RETURN_ORDER.js
 *@author ZJG
 *@description 积加-查询销售退货单列表
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_fbm_ro_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_fbm_ro_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_fbm_ro_end_date' });

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
                    timeStart: start_date,
                    timeEnd: end_date,
                    timeRangeType: 'RETURN_ORDER_TIME',//时间类型 [CREATE_TIME: 创建时间；RETURN_ORDER_TIME: 退货时间]
                    returnType: '',//退货类型 BUYER_RETURN-买家退货 LOGISTICS_RETURN-物流退回
                    sourceReturnCodeList: [],//来源退货单号
                    returnStatusList: [],//退货单状态 DRAFT-草稿 WAIT_INBOUND-待入库 COMPLETE-已完成 DELETE-已作废
                    sourceChannelList: [],//来源渠道（平台） AMAZON-亚马逊 WALMART-沃尔玛 EBAY-ebay SHOPEE-shopee SHOPIFY-shopify ALIEXPRESS-aliexpress TIKTOK-tiktok LAZADA-lazada CUSTOM-自定义 WISH-wish CDISCOUNT-CDISCOUNT MERCADOLIBRE-美客多 WAYFAIR-WAYFAIR COUPANG-酷胖 RAKUTEN-日本乐天 NEWEGG-新蛋 ALIBABA-阿里巴巴国际站 YAHOO-雅虎 G-G
                    sourceCodeList: [],//原发货单号（即关联的原自发货订单对应的平台发货单号）
                    returnCodeList: [],//退货单号
                    accessModeList: [],//接入方式 MANUAL-手工 INTERFACE-接口 IMPORT-导入
                    returnWarehouseIdList: [],//退货仓库
                }
                log.audit('params', params);
                try {
                    interface.JJGetFbmReturnOrder(jj_account, params, page, pageSize, []).map(function (fs) {
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

                var ro_id = '';
                search.create({
                    type: 'customrecord_swc_jj_return_order_cache',
                    filters: [
                        { name: 'custrecord_swc_jj_roc_id', operator: 'is', values: obj.id },
                    ],
                }).run().each(function (rec) {
                    ro_id = rec.id;
                });
                log.audit('ro_id', ro_id);

                if (ro_id) {
                    var rec = record.load({ type: 'customrecord_swc_jj_return_order_cache', id: ro_id });
                } else {
                    var rec = record.create({ type: 'customrecord_swc_jj_return_order_cache', isDynamic: false });
                }

                for (var field_id in interface.fieldsMapping._FBM_RETURN_ORDERE_.mapping) {
                    if (obj[interface.fieldsMapping._FBM_RETURN_ORDERE_.mapping[field_id]]) {
                        rec.setValue({ fieldId: field_id, value: obj[interface.fieldsMapping._FBM_RETURN_ORDERE_.mapping[field_id]] })
                    }
                }

                rec.setValue({ fieldId: 'custrecord_swc_jj_roc_store', value: acc_info.id });
                rec.setValue({ fieldId: 'custrecord_swc_jj_roc_orderitems', value: JSON.stringify(obj.orderItems) });
                rec.setValue({ fieldId: 'custrecord_swc_jj_roc_returnshippinginfo', value: JSON.stringify(obj.returnShippingInfo) });
                rec.setValue({ fieldId: 'custrecord_swc_jj_roc_body', value: JSON.stringify(obj) });
                

                // if (acc_info.id) {
                    if (obj.returnOrderTime) {
                        // var returnOrderdate = format.format({ value: moment.utc(obj.returnOrderTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var returnOrderdate = format.format({ value: moment.utc(obj.returnOrderTime).toDate(), type: format.Type.DATE });
                        returnOrderdate = format.parse({ value: returnOrderdate, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_roc_returnorderdate', value: returnOrderdate });
                    }
                    if (obj.expectedArrivalTime) {
                        // var expectedArrivaldate = format.format({ value: moment.utc(obj.expectedArrivalTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var expectedArrivaldate = format.format({ value: moment.utc(obj.expectedArrivalTime).toDate(), type: format.Type.DATE });
                        expectedArrivaldate = format.parse({ value: expectedArrivaldate, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_roc_expectedarrivaldat', value: expectedArrivaldate });
                    }
                    if (obj.actualInboundTime) {
                        // var actualInbounddate = format.format({ value: moment.utc(obj.actualInboundTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var actualInbounddate = format.format({ value: moment.utc(obj.actualInboundTime).toDate(), type: format.Type.DATE });
                        actualInbounddate = format.parse({ value: actualInbounddate, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_roc_actualinbounddate', value: actualInbounddate });
                    }
                    if (obj.createTime) {
                        // var create_time = format.format({ value: moment.utc(obj.createTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var create_time = format.format({ value: moment.utc(obj.createTime).toDate(), type: format.Type.DATE });
                        create_time = format.parse({ value: create_time, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_roc_updatedate', value: update_time });
                    }
                    if (obj.updateTime) {
                        // var update_time = format.format({ value: moment.utc(obj.updateTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        var update_time = format.format({ value: moment.utc(obj.updateTime).toDate(), type: format.Type.DATE });
                        update_time = format.parse({ value: update_time, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_roc_createdate', value: create_time });
                    }
                // }

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