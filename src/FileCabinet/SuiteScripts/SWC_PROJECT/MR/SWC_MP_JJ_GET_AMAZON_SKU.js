/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_AMAZON_SKU.js
 *@author ZJG
 *@description 积加-查询SKU关联亚马逊MSKU
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_az_msku_jj_account' });
                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_az_msku_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_az_msku_end_date' });
                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }
                if (start_date) {
                    start_date = moment.utc(start_date).startOf('day').toISOString().substring(0, 19).replace('T', ' ');
                }
                if (end_date) {
                    end_date = moment.utc(end_date).endOf('day').toISOString().substring(0, 19).replace('T', ' ');
                }

                log.audit('start_date', start_date);
                log.audit('end_date', end_date);

                var page = 1, pageSize = 100;
                if (start_date && end_date) {
                    interface.JJGetAmazonMsku(jj_account, start_date, end_date, page, pageSize, []).map(function (sku) {
                        data.push(sku);
                    });
                } else {
                    interface.JJGetAmazonMsku(jj_account, '', '', page, pageSize, []).map(function (sku) {
                        data.push(sku);
                    });
                }
            } catch (e) {
                log.error('getinput error', e);
            }
            log.audit("data length", data.length);
            return data;
        }

        function map(context) {
            try {

                var userObj = runtime.getCurrentUser();
                log.audit('userObj', userObj);

                var DATEFORMAT = userObj.getPreference({ name: "DATEFORMAT" });
                var TIMEFORMAT = userObj.getPreference({ name: "TIMEFORMAT" });
                var TIMEZONE = userObj.getPreference({ name: "TIMEZONE" });
                log.audit('datetime', {
                    DATEFORMAT: DATEFORMAT,
                    TIMEFORMAT: TIMEFORMAT,
                    TIMEZONE: TIMEZONE,
                });

                var obj = JSON.parse(context.value);
                log.audit('obj', obj);

                if (obj.msku) {

                    var productInfos = [];
                    var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_az_msku_jj_account' });
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);

                    var page = 1, pageSize = 100;
                    var params = {
                        msku: obj.msku,
                        state: '',
                        marketIdList: [],
                        asin: '',
                        variationAsin: '',
                        sku: '',
                        spu: '',
                        fulfillment: '',
                        addStartDate: '',
                        addEndDate: '',
                    }

                    interface.JJGetProductInfos(jj_account, params, page, pageSize, []).map(function (a) {
                        productInfos.push(a);
                    });
                    log.audit('productInfos', productInfos);

                    for (let i = 0; i < productInfos.length; i++) {
                        log.audit('info', {
                            marketId: productInfos[i].marketId,
                            fnsku: productInfos[i].fnsku,
                            asin: productInfos[i].asin,
                        });

                        var acc_info = interface.GetAccountInfo('', productInfos[i].marketId);
                        log.audit('acc_info', acc_info);

                        var mp_id = '';
                        search.create({
                            type: 'customrecord_swc_amazon_sku_mapping',
                            filters: [
                                { name: 'custrecord_swc_az_sku_map_sku', operator: 'is', values: obj.sku },
                                { name: 'custrecord_swc_az_sku_map_msku', operator: 'is', values: obj.msku },
                                { name: 'custrecord_swc_az_sku_map_warehouseid', operator: 'is', values: obj.warehouseId },
                                { name: 'custrecord_swc_az_sku_map_store', operator: 'is', values: acc_info.id },
                                { name: 'custrecord_swc_az_sku_map_recorddate_t', operator: 'is', values: obj.recordDate },
                            ],
                            columns: [
                                { name: 'created', sort: search.Sort.DESC },
                            ]
                        }).run().each(function (rec) {
                            mp_id = rec.id;
                        });
                        log.audit('mp_id', mp_id);

                        if (!mp_id) {
                            var rec = record.create({ type: 'customrecord_swc_amazon_sku_mapping', isDynamic: false });
                        } else {
                            var rec = record.load({ type: 'customrecord_swc_amazon_sku_mapping', id: mp_id });
                        }
                        rec.setValue({ fieldId: 'custrecord_swc_az_sku_map_sku', value: obj.sku });
                        rec.setValue({ fieldId: 'custrecord_swc_az_sku_map_msku', value: obj.msku });
                        rec.setValue({ fieldId: 'custrecord_swc_az_sku_map_warehouseid', value: obj.warehouseId });
                        rec.setValue({ fieldId: 'custrecord_swc_az_sku_map_recorddate_t', value: obj.recordDate });
                        rec.setValue({ fieldId: 'custrecord_swc_az_sku_map_memo', value: obj.memo });

                        rec.setValue({ fieldId: 'custrecord_swc_az_sku_map_fnsku', value: productInfos[i].fnsku });
                        rec.setValue({ fieldId: 'custrecord_swc_az_sku_map_asin', value: productInfos[i].asin });
                        rec.setText({ fieldId: 'custrecord_swc_az_sku_map_item', text: obj.sku });

                        if (acc_info.id) {
                            rec.setValue({ fieldId: 'custrecord_swc_az_sku_map_store', value: acc_info.id });
                        }

                        if (obj.warehouseId) {
                            try {
                                var location_info = interface.GetJJPTLocationInfo(obj.warehouseId);
                                log.audit('location_info', location_info);
                                rec.setValue({ fieldId: 'custrecord_swc_az_sku_map_location', value: location_info.id });
                            } catch (error) {
                                log.error('GetLocationInfo error', error);
                            }
                        }

                        var date_time = format.format({ value: moment(obj.recordDate).toDate(), type: format.Type.DATETIMETZ, timezone: TIMEZONE });
                        date = format.parse({ value: date_time, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_az_sku_map_recorddate', value: date });

                        var id = rec.save({ ignoreMandatoryFields: true });
                        log.debug("cache save success", id);

                    }

                }

            } catch (e) {
                log.error("import skumap error", e);
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