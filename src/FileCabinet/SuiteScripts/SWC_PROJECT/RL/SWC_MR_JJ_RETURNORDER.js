/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author SWR
 *@description 积加-查询退货订单列表
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_return_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_return_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_return_end_date' });

                if (!start_date) {
                    // 当天0点
                    start_date = moment.utc().startOf('day').format("YYYY-MM-DD HH:mm:ss");
                } else {
                    // 参数有值时，设置为当天的0点
                    start_date = moment.utc(start_date).startOf('day').format("YYYY-MM-DD HH:mm:ss");
                }

                if (!end_date) {
                    // 当天23:59:59
                    end_date = moment.utc().endOf('day').format("YYYY-MM-DD HH:mm:ss");
                } else {
                    // 参数有值时，设置为当天的23:59:59
                    end_date = moment.utc(end_date).endOf('day').format("YYYY-MM-DD HH:mm:ss");
                }


                var page = 1, pageSize = 100;
                var params = {
                    start_date: start_date,
                    end_date: end_date,
                }

                try {
                    interface.JJGetReturnOrder(jj_account, params, page, pageSize, []).map(function (a) {
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

                var acc_info = GetVCAccountInfo2('', obj.marketId);
                log.audit('acc_info', acc_info);

                var vc_df_id = '';

                log.audit('obj.id',obj.id);

                search.create({
                    type: 'customrecord_swc_amazon_returnorder',
                    filters: [
                        { name: 'custrecord_swc_amz_rtid', operator: 'equalto', values: obj.id },
                    ],
                }).run().each(function (rec) {
                    vc_df_id = rec.id;
                });
                log.audit('vc_df_id', vc_df_id);

                if (vc_df_id) {
                    var rec = record.load({ type: 'customrecord_swc_amazon_returnorder', id: vc_df_id });
                } else {
                    var rec = record.create({ type: 'customrecord_swc_amazon_returnorder', isDynamic: false });
                }

                for (var field_id in interface.fieldsMapping._JJ_RETURN_ORDER_.mapping) {
                    if (obj[interface.fieldsMapping._JJ_RETURN_ORDER_.mapping[field_id]]) {
                        rec.setValue({ fieldId: field_id, value: obj[interface.fieldsMapping._JJ_RETURN_ORDER_.mapping[field_id]] })
                    }
                }

                rec.setValue({ fieldId: 'custrecord_swc_amz_rtmarketid', value: acc_info.id });
                rec.setText({ fieldId: 'custrecord_swc_amz_rtitem', text: obj.sku });


                if (acc_info.id) {
                    if (obj.purchaseDate) {
                        var od_date = format.format({ value: moment.utc(obj.purchaseDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        od_date = format.parse({ value: od_date, type: 'date' });
                        log.audit('od_date',od_date);
                        rec.setValue({ fieldId: 'custrecord_swc_amz_rtpurchasedate', value: new Date(od_date) });
                    }
                    if (obj.returnDate) {
                        var od_date = format.format({ value: moment.utc(obj.returnDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        od_date = format.parse({ value: od_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_amz_rtdate', value: new Date(od_date) });
                    }
                    if (obj.createTime) {
                        var od_date = format.format({ value: moment.utc(obj.createTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        od_date = format.parse({ value: od_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_amz_rtcreatetime', value: new Date(od_date) });
                    }
                    if (obj.updateTime) {
                        var od_date = format.format({ value: moment.utc(obj.updateTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        od_date = format.parse({ value: od_date, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_amz_rtupdatetime', value: new Date(od_date) });
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


        function GetVCAccountInfo2(id, marketId) {
            var accounts = {}, fils = [];
            fils = [
                { name: 'isinactive', operator: 'is', values: false },
            ]
            if (id) {
                fils.push({ name: 'internalid', operator: 'anyof', values: id });
            }
            if (marketId) {
                fils.push({ name: 'custentity_swc_jj_customer_id', operator: 'is', values: marketId });
            }
            log.audit('fils', fils);
            search.create({
                type: 'customer',
                filters: fils,
                columns: [
                    { name: 'entityid' },
                    { name: 'subsidiary' },
                    { name: 'currency' },
                    { name: 'custentity_swc_shipment_item_location' },
                    { name: 'custentity_swc_store_time_zone' },
                    { name: 'custentity_swc_payment_account' },
                    { name: 'custentity_swc_platform_ar_account' },
                    { name: 'custentity_swc_platform' },
                    { name: 'custentity_swc_jj_marketid' },
                    { name: 'custentity_swc_jj_customer_id' },
                    { name: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_appid', join: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_appkey', join: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_service_address', join: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_accesstoken', join: 'custentity_swc_jj_account' },
                ]
            }).run().each(function (rec) {
                accounts = {
                    id: rec.id,
                    entityid: rec.getValue('entityid'),
                    auth_meta: {
                        dev_account: rec.getValue('custentity_swc_jj_account'),
                        appid: rec.getValue({ name: 'custrecord_swc_jj_da_appid', join: 'custentity_swc_jj_account' }),
                        appkey: rec.getValue({ name: 'custrecord_swc_jj_da_appkey', join: 'custentity_swc_jj_account' }),
                        service_address: rec.getValue({ name: 'custrecord_swc_jj_da_service_address', join: 'custentity_swc_jj_account' }),
                        accesstoken: rec.getValue({ name: 'custrecord_swc_jj_da_accesstoken', join: 'custentity_swc_jj_account' }),
                    },
                    subsidiary: rec.getValue('subsidiary'),
                    currency: rec.getValue('currency'),
                    platform: rec.getValue('custentity_swc_platform'),
                    jj_marketid: rec.getValue('custentity_swc_jj_marketid'),
                    jj_customer_id: rec.getValue('custentity_swc_jj_customer_id'),
                    store_time_zone: rec.getValue('custentity_swc_store_time_zone'),
                    shipment_item_location: rec.getValue('custentity_swc_shipment_item_location'),
                    payment_account: rec.getValue('custentity_swc_payment_account'),
                    platform_ar_account: rec.getValue('custentity_swc_platform_ar_account'),
                };
                return true;
            })
            return accounts;
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });