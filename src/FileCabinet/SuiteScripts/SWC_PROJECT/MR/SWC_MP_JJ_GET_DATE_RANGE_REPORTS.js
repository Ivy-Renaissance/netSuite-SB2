/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_DATE_RANGE_REPORTS.js
 *@author ZJG
 *@description 积加-查询日期范围报告
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_drr_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_drr_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_drr_end_date' });

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

                var orderid = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_drr_orderid' });
                var request_acc = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_drr_store' });

                var page = 1, pageSize = 100;
                var params = {
                    purchaseStartDate: start_date,//开始时间 [yyyy-MM-dd]
                    purchaseEndDate: end_date,//结束时间 [yyyy-MM-dd]
                    orderType: '',//报表类型 [标准订单: 0; 发票订单: 1]
                    orderId: '',//订单id
                    marketIds: [],//店铺ID集合，如果数据较多，建议按店铺单独分开同步效率更高
                    feeTypes: [],//费用类型
                }

                try {
                    interface.getAccountList(request_acc).map(function (account) {
                        try {
                            params.marketIds = [account.jj_marketid];
                            if (request_acc && orderid) {
                                params.orderId = orderid;
                            }
                            interface.JJGetDateRangeReports(jj_account, params, page, pageSize, []).map(function (result) {
                                result.account = account;
                                data.push(result);
                            });
                        } catch (e1) {
                            log.error('handleit error', e1)
                        }
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
                var acc_info = obj.account;
                delete obj.account;
                log.audit('acc_info', acc_info);


                var ro_id = '';
                search.create({
                    type: 'customrecord_swc_jj_date_range_reports',
                    filters: [
                        { name: 'custrecord_swc_jj_drr_id', operator: 'is', values: obj.id },
                    ],
                }).run().each(function (rec) {
                    ro_id = rec.id;
                });
                log.audit('ro_id', ro_id);

                if (ro_id) {
                    var rec = record.load({ type: 'customrecord_swc_jj_date_range_reports', id: ro_id });
                } else {
                    var rec = record.create({ type: 'customrecord_swc_jj_date_range_reports', isDynamic: false });
                }

                for (var field_id in interface.fieldsMapping._DATE_RANGE_REPORTS_.mapping) {
                    if (obj[interface.fieldsMapping._DATE_RANGE_REPORTS_.mapping[field_id]]) {
                        rec.setValue({ fieldId: field_id, value: obj[interface.fieldsMapping._DATE_RANGE_REPORTS_.mapping[field_id]] })
                    }
                }
                rec.setValue({ fieldId: 'custrecord_swc_jj_drr_store', value: acc_info.id });

                if (acc_info.id) {
                    // if (obj.createDate) {
                    //     if (JSON.stringify(obj.createDate).indexOf('UTC') == -1) {
                    //         var createDate_date = format.format({ value: moment.utc(obj.createDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                    //         createDate_date = format.parse({ value: createDate_date, type: 'date' });
                    //         log.audit('createDate_date', createDate_date);
                    //         if (JSON.stringify(createDate_date) != null) {
                    //             log.audit('set', createDate_date);
                    //             rec.setValue({ fieldId: 'custrecord_swc_jj_drr_create_date', value: createDate_date });
                    //         }
                    //     }
                    // }
                    if (obj.standardDate) {
                        var standardDate_date = format.format({ value: moment.utc(obj.standardDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        standardDate_date = format.parse({ value: standardDate_date, type: 'date' });
                        log.audit('standardDate_date', standardDate_date);
                        if (standardDate_date) {
                            rec.setValue({ fieldId: 'custrecord_swc_jj_drr_standard_date', value: standardDate_date });
                        }
                    }
                    if (obj.marketDate) {
                        var marketDate_date = format.format({ value: moment.utc(obj.marketDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        marketDate_date = format.parse({ value: marketDate_date, type: 'date' });
                        log.audit('marketDate_date', marketDate_date);
                        if (marketDate_date) {
                            rec.setValue({ fieldId: 'custrecord_swc_jj_drr_market_date', value: marketDate_date });
                        }
                    }
                    if (obj.zeroDate) {
                        var zeroDate_date = format.format({ value: moment.utc(obj.zeroDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        zeroDate_date = format.parse({ value: zeroDate_date, type: 'date' });
                        log.audit('zeroDate_date', zeroDate_date);
                        if (zeroDate_date) {
                            rec.setValue({ fieldId: 'custrecord_swc_jj_drr_zero_date', value: zeroDate_date });
                        }
                    }
                    if (obj.updateDate) {
                        var updateDate_date = format.format({ value: moment.utc(obj.updateDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                        updateDate_date = format.parse({ value: updateDate_date, type: 'date' });
                        log.audit('updateDate_date', updateDate_date);
                        if (updateDate_date) {
                            rec.setValue({ fieldId: 'custrecord_swc_jj_drr_update_date', value: updateDate_date });
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