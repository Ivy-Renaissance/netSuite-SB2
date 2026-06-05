/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_STORAGE_FEE.js
 *@author ZJG
 *@description 积加-查询仓储费
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var sf_type = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_sf_type' });
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_sf_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var store_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_sf_store_id' });
                var asin = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_sf_asin' });
                var sku = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_sf_sku' });
                var fnsku = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_sf_fnsku' });
                var month_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_sf_month_date' });

                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_sf_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_sf_end_date' });

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
                var month, year;
                if (month_date) {
                    month = new Date(month_date).getMonth() + 1;
                    year = new Date(month_date).getFullYear();
                } else {
                    var date = new Date();
                    year = date.getFullYear();
                    month = date.getMonth(); // 当前月(0~11)
                }

                var marketIds = [];
                if (store_id) {
                    interface.getAccountList(store_id).map(function (account) {
                        marketIds.push(account.jj_marketid);
                    });
                }
                log.audit('marketIds', marketIds);

                var page = 1, pageSize = 500;
                var params = {
                    year: year,
                    month: month,
                    asin: asin,
                    sku: sku,
                    fnsku: fnsku,
                    marketIds: marketIds,
                    purchaseStartDate: start_date,
                    purchaseEndDate: end_date,
                    categorys: [],
                    brands: [],
                }

                try {
                    if (sf_type == '月度仓储费') {
                        interface.JJGetStorageFee(jj_account, params, page, pageSize, []).map(function (sf) {
                            data.push(sf);
                        });
                    } else if (sf_type == '长期仓储费') {
                        interface.JJGetStorageLongFee(jj_account, params, page, pageSize, []).map(function (sf) {
                            data.push(sf);
                        });
                    } else {
                        return []
                    }
                } catch (e1) {
                    log.error('handleit error', e1)
                }
            } catch (e) {
                log.error('getinput error', e);
            }
            log.audit("data length", data.length);
            log.audit("data[0]", data[0]);
            return data;
        }

        function map(context) {
            try {
                var obj = JSON.parse(context.value);
                log.audit('obj', obj);

                var sf_type = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_sf_type' });

                var acc_info = interface.GetAccountInfo('', obj.marketId);
                log.audit('acc_info', acc_info);

                var fs_id = '';
                var filters = [];
                if (sf_type == '月度仓储费') {
                    filters.push({ name: 'custrecord_swc_sfr_fee_type', operator: 'is', values: 'create' });
                    // filters.push({ name: 'custrecord_swc_sfr_fee_type', operator: 'is', values: '月度仓储费' });
                    // filters.push({ name: 'custrecord_swc_sfr_marketid', operator: 'is', values: obj.marketId });
                    // filters.push({ name: 'custrecord_swc_sfr_fnsku', operator: 'is', values: obj.fnsku });
                    // filters.push({ name: 'custrecord_swc_sfr_msku', operator: 'is', values: obj.sellerSku });
                    // filters.push({ name: 'custrecord_swc_sfr_asin', operator: 'is', values: obj.asin });
                    // filters.push({ name: 'custrecord_swc_sfr_year', operator: 'is', values: obj.year });
                    // filters.push({ name: 'custrecord_swc_sfr_month', operator: 'is', values: obj.month });
                    // filters.push({ name: 'custrecord_swc_sfr_currency', operator: 'is', values: obj.currency });
                    // filters.push({ name: 'custrecord_swc_sfr_fulfillmentcenter', operator: 'is', values: obj.fulfillmentCenter });
                    // filters.push({ name: 'custrecord_swc_sfr_est_monthlystoragefee', operator: 'is', values: obj.estimatedMonthlyStorageFee });
                } else {
                    filters.push({ name: 'custrecord_swc_sfr_fee_type', operator: 'is', values: '长期仓储费' });
                    filters.push({ name: 'custrecord_swc_sfr_marketid', operator: 'is', values: obj.marketId });
                    filters.push({ name: 'custrecord_swc_sfr_year', operator: 'is', values: obj.year });
                    filters.push({ name: 'custrecord_swc_sfr_month', operator: 'is', values: obj.month });
                    filters.push({ name: 'custrecord_swc_sfr_fnsku', operator: 'is', values: obj.fnsku });
                    filters.push({ name: 'custrecord_swc_sfr_msku', operator: 'is', values: obj.msku });
                    filters.push({ name: 'custrecord_swc_sfr_asin', operator: 'is', values: obj.asin });
                    if (obj.currency) {
                        filters.push({ name: 'custrecord_swc_sfr_currency', operator: 'is', values: obj.currency });
                    } else {
                        filters.push({ name: 'custrecord_swc_sfr_currency', operator: 'isempty', values: '' });
                    }
                    if (obj.country) {
                        filters.push({ name: 'custrecord_swc_sfr_countrycode', operator: 'is', values: obj.country });
                    } else {
                        filters.push({ name: 'custrecord_swc_sfr_countrycode', operator: 'isempty', values: '' });
                    }
                    filters.push({ name: 'custrecord_swc_sfr_snapshotdate', operator: 'is', values: moment.utc(obj.snapshotDate).toISOString() });
                }
                search.create({
                    type: 'customrecord_swc_storage_fee_report',
                    filters: filters,
                }).run().each(function (rec) {
                    fs_id = rec.id;
                });
                log.audit('fs_id', fs_id);

                if (fs_id) {
                    var rec = record.load({ type: 'customrecord_swc_storage_fee_report', id: fs_id });
                } else {
                    var rec = record.create({ type: 'customrecord_swc_storage_fee_report', isDynamic: false });
                }
                rec.setValue({ fieldId: 'custrecord_swc_sfr_store', value: acc_info.id });

                if (sf_type == '月度仓储费') {
                    rec.setValue({ fieldId: 'custrecord_swc_sfr_fee_type', value: '月度仓储费' });
                    rec.setValue({ fieldId: 'custrecord_swc_sfr_marketids', value: JSON.stringify(obj.marketIds) });

                    for (var field_id in interface.fieldsMapping._STORAGE_FEE_.mapping) {
                        if (obj[interface.fieldsMapping._STORAGE_FEE_.mapping[field_id]]) {
                            rec.setValue({ fieldId: field_id, value: obj[interface.fieldsMapping._STORAGE_FEE_.mapping[field_id]] })
                        }
                    }
                } else {
                    rec.setValue({ fieldId: 'custrecord_swc_sfr_fee_type', value: '长期仓储费' });
                    rec.setValue({ fieldId: 'custrecord_swc_sfr_snapshotdate', value: moment.utc(obj.snapshotDate).toISOString() });

                    for (var field_id in interface.fieldsMapping._STORAGE_LONG_FEE_.mapping) {
                        if (obj[interface.fieldsMapping._STORAGE_LONG_FEE_.mapping[field_id]]) {
                            rec.setValue({ fieldId: field_id, value: obj[interface.fieldsMapping._STORAGE_LONG_FEE_.mapping[field_id]] })
                        }
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