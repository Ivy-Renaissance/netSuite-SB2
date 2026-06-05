/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_ADVERTISEMENT.js
 *@author ZJG
 *@description 积加-广告报告获取
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var adv_type = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_adv_type' });
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_adv_account' });
                if (!adv_type) {
                    throw '请填写参数：报告类型';
                }
                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var store_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_adv_store_id' });
                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_adv_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_adv_end_date' });

                if (!start_date) {
                    start_date = moment.utc().subtract(1, 'months').startOf('month').toISOString().substring(0, 10);
                } else {
                    start_date = moment.utc(start_date).startOf('day').toISOString().substring(0, 10);
                }
                if (!end_date) {
                    end_date = moment.utc().subtract(1, 'months').endOf('month').toISOString().substring(0, 10);
                } else {
                    end_date = moment.utc(end_date).endOf('day').toISOString().substring(0, 10);
                }
                log.audit('date', start_date + '___' + end_date);

                interface.getAccountList(store_id).map(function (account) {

                    var page = 0, pageSize = 100;
                    var params = {
                        startDataDate: start_date,
                        endDataDate: end_date,
                        marketId: account.jj_marketid,
                    }

                    try {
                        if (adv_type == '商品广告') {
                            interface.JJGetAdsSpProduct(jj_account, params, page, pageSize, []).map(function (adv) {
                                adv.account = account;
                                data.push(adv);
                            });
                        } else if (adv_type == '品牌广告') {
                            interface.JJGetAdsSbCampaign(jj_account, params, page, pageSize, []).map(function (adv) {
                                adv.account = account;
                                data.push(adv);
                            });
                        } else if (adv_type == '展示广告') {
                            interface.JJGetAdsSdProduct(jj_account, params, page, pageSize, []).map(function (adv) {
                                adv.account = account;
                                data.push(adv);
                            });
                        } else {
                            return []
                        }
                    } catch (e1) {
                        log.error('handleit error', e1)
                    }
                })

            } catch (e) {
                log.error('getinput error', e);
            }
            log.audit("data length", data.length);
            log.audit("data[0]", data[0]);
            return data;
        }

        function map(context) {
            try {
                var adv_type = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_adv_type' });

                var obj = JSON.parse(context.value);
                log.audit('obj', obj);

                var acc_info = obj.account;
                delete obj.account;

                if (Number(obj.cost) == 0) {
                    return
                }

                var adv_id = '';
                var filters = []
                if (adv_type == '商品广告') {
                    filters.push({ name: 'custrecord_swc_jj_adv_type', operator: 'is', values: '商品广告' });
                    filters.push({ name: 'custrecord_swc_jj_adv_id', operator: 'is', values: obj.id });
                    filters.push({ name: 'custrecord_swc_jj_adv_hash', operator: 'is', values: obj.hash });
                } else if (adv_type == '品牌广告') {
                    filters.push({ name: 'custrecord_swc_jj_adv_type', operator: 'is', values: '品牌广告' });
                    filters.push({ name: 'custrecord_swc_jj_adv_id', operator: 'is', values: obj.id });
                    filters.push({ name: 'custrecord_swc_jj_adv_hash', operator: 'is', values: obj.hash });
                } else {
                    filters.push({ name: 'custrecord_swc_jj_adv_type', operator: 'is', values: '展示广告' });
                    // filters.push({ name: 'custrecord_swc_jj_adv_id', operator: 'is', values: obj.id });
                    filters.push({ name: 'custrecord_swc_jj_adv_hash', operator: 'is', values: obj.hash });
                }
                search.create({
                    type: 'customrecord_swc_jj_advertisement_report',
                    filters: filters,
                }).run().each(function (rec) {
                    adv_id = rec.id;
                });
                log.audit('adv_id', adv_id);

                if (adv_id) {
                    var rec = record.load({ type: 'customrecord_swc_jj_advertisement_report', id: adv_id });
                } else {
                    var rec = record.create({ type: 'customrecord_swc_jj_advertisement_report', isDynamic: false });
                }

                for (var field_id in interface.fieldsMapping._ADVERTISEMENT_REPORT_.mapping) {
                    if (obj[interface.fieldsMapping._ADVERTISEMENT_REPORT_.mapping[field_id]]) {
                        rec.setValue({ fieldId: field_id, value: obj[interface.fieldsMapping._ADVERTISEMENT_REPORT_.mapping[field_id]] })
                    }
                }

                rec.setValue({ fieldId: 'custrecord_swc_jj_adv_store', value: acc_info.id });
                rec.setValue({ fieldId: 'custrecord_swc_jj_adv_campaignid', value: obj.campaignId + '' });
                rec.setValue({ fieldId: 'custrecord_swc_jj_adv_body', value: JSON.stringify(obj) });

                if (adv_type == '商品广告') {
                    rec.setValue({ fieldId: 'custrecord_swc_jj_adv_type', value: '商品广告' });
                } else if (adv_type == '品牌广告') {
                    rec.setValue({ fieldId: 'custrecord_swc_jj_adv_type', value: '品牌广告' });
                } else {
                    rec.setValue({ fieldId: 'custrecord_swc_jj_adv_type', value: '展示广告' });
                }

                if (acc_info.id) {
                    if (obj.createDate) {
                        var createDate = format.format({ value: moment(obj.createDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        createDate = format.parse({ value: createDate, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_adv_createdate', value: createDate });
                    }
                    if (obj.startDate) {
                        var startDate = format.format({ value: moment(obj.startDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        startDate = format.parse({ value: startDate, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_adv_startdate', value: startDate });
                    }
                    if (obj.endDate) {
                        var endDate = format.format({ value: moment(obj.endDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        endDate = format.parse({ value: endDate, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_adv_enddate', value: endDate });
                    } else {
                        var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_adv_end_date' });
                        if (!end_date) {
                            end_date = moment.utc().add(8, 'h').toISOString().substring(0, 10);
                        } else {
                            end_date = moment.utc(end_date).endOf('day').toISOString().substring(0, 10);
                        }
                        var endDate = format.format({ value: moment(end_date).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        endDate = format.parse({ value: endDate, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_jj_adv_enddate', value: endDate });
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