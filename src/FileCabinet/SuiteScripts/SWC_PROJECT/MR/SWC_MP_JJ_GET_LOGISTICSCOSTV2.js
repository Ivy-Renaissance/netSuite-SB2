/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_LOGISTICSCOSTV2.js
 *@author ZJG
 *@description 积加-分页查询自发货尾程物流费用
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_zfhlc_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_zfhlc_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_zfhlc_end_date' });

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
                    startDate: start_date,//录入费用开始时间 [yyyy-MM-dd],建议按单日来查
                    endDate: end_date,//录入费用结束时间 [yyyy-MM-dd]
                    sourceCodeList: [],//来源单号集合
                    beginCreateTime: '',//创建开始时间 [yyyy-MM-dd],建议按单日来查
                    endCreateTime: '',//创建结束时间 [yyyy-MM-dd]
                    deliveryBeginTime: '',//发运开始时间 [yyyy-MM-dd],建议按单日来查
                    deliveryEndTime: '',//发运结束时间 [yyyy-MM-dd]
                }

                try {
                    interface.JJGetLogisticsCostV2(jj_account, params, page, pageSize, []).map(function (a) {
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
                // var acc_info = interface.GetVCAccountInfo('', obj.marketId);
                // log.audit('acc_info', acc_info);

                var zfh_lc_id = '';
                search.create({
                    type: 'customrecord_swc_jj_zfh_logistics_cost',
                    filters: [
                        { name: 'custrecord_swc_jjzlc_foordercode', operator: 'is', values: obj.foOrderCode },
                        { name: 'custrecord_swc_jjzlc_platformid', operator: 'is', values: obj.platformId },
                        { name: 'custrecord_swc_jjzlc_platformsourcecode', operator: 'is', values: obj.platformSourceCode },
                        { name: 'custrecord_swc_jjzlc_logisticstype', operator: 'is', values: obj.logisticsType },
                    ],
                }).run().each(function (rec) {
                    zfh_lc_id = rec.id;
                });
                log.audit('zfh_lc_id', zfh_lc_id);

                if (zfh_lc_id) {
                    var rec = record.load({ type: 'customrecord_swc_jj_zfh_logistics_cost', id: zfh_lc_id });
                } else {
                    var rec = record.create({ type: 'customrecord_swc_jj_zfh_logistics_cost', isDynamic: false });
                }

                for (var field_id in interface.fieldsMapping._ZFH_LOGISTICS_COST_.mapping) {
                    if (obj[interface.fieldsMapping._ZFH_LOGISTICS_COST_.mapping[field_id]]) {
                        rec.setValue({ fieldId: field_id, value: obj[interface.fieldsMapping._ZFH_LOGISTICS_COST_.mapping[field_id]] })
                    }
                }

                rec.setValue({ fieldId: 'custrecord_swc_jjzlc_body', value: JSON.stringify(obj) });
                rec.setValue({ fieldId: 'custrecord_swc_jjzlc_unitlist', value: JSON.stringify(obj.unitList) });
                rec.setValue({ fieldId: 'custrecord_swc_jjzlc_costitemlist', value: JSON.stringify(obj.costItemList) });
                rec.setValue({ fieldId: 'custrecord_swc_jjzlc_etcostitemlist', value: JSON.stringify(obj.estimateCostItemList) });
                rec.setValue({ fieldId: 'custrecord_swc_jjzlc_costsharevolist', value: JSON.stringify(obj.costShareVOList) });



                var costShareVOList = obj.costShareVOList;
                var costItemList = obj.costItemList;
                var unitList = obj.unitList;

                const zlccsSublistId = 'recmachcustrecord_swc_jj_zlccs_father_record';//费用分摊明细
                if (!zfh_lc_id) {
                    for (let i = 0; i < costShareVOList.length; i++) {
                        const element = costShareVOList[i];
                        for (var field_id in interface.fieldsMapping._ZFH_LOGISTICS_COST_CS_.mapping) {
                            if (element[interface.fieldsMapping._ZFH_LOGISTICS_COST_CS_.mapping[field_id]]) {
                                ro_rec.setSublistValue({ sublistId: zlccsSublistId, fieldId: field_id, value: element[interface.fieldsMapping._ZFH_LOGISTICS_COST_CS_.mapping[field_id]], line: i })
                            }
                        }
                    }
                }
                const zlcciSublistId = 'recmachcustrecord_swc_jj_zlcci_father_record';//费用项明细
                if (!zfh_lc_id) {
                    for (let i = 0; i < costItemList.length; i++) {
                        const element = costItemList[i];
                        for (var field_id in interface.fieldsMapping._ZFH_LOGISTICS_COST_CI_.mapping) {
                            if (element[interface.fieldsMapping._ZFH_LOGISTICS_COST_CI_.mapping[field_id]]) {
                                ro_rec.setSublistValue({ sublistId: zlcciSublistId, fieldId: field_id, value: element[interface.fieldsMapping._ZFH_LOGISTICS_COST_CI_.mapping[field_id]], line: i })
                            }
                        }
                    }
                }
                const zlcuSublistId = 'recmachcustrecordswc_jj_zlcu_father_record';//小包裹明细
                if (!zfh_lc_id) {
                    for (let i = 0; i < unitList.length; i++) {
                        const element = unitList[i];
                        for (var field_id in interface.fieldsMapping._ZFH_LOGISTICS_COST_CU_.mapping) {
                            if (element[interface.fieldsMapping._ZFH_LOGISTICS_COST_CU_.mapping[field_id]]) {
                                ro_rec.setSublistValue({ sublistId: zlcuSublistId, fieldId: field_id, value: element[interface.fieldsMapping._ZFH_LOGISTICS_COST_CU_.mapping[field_id]], line: i })
                            }
                        }
                    }
                }


                // if (acc_info.id) {
                //     if (obj.orderDate) {
                //         var od_date = format.format({ value: moment.utc(obj.orderDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                //         od_date = format.parse({ value: od_date, type: 'date' });
                //         rec.setValue({ fieldId: 'custrecord_swc_jj_vcdf_od_date', value: od_date });
                //     }
                //     if (obj.promisedDeliveryDate) {
                //         var pdd_date = format.format({ value: moment.utc(obj.promisedDeliveryDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                //         pdd_date = format.parse({ value: pdd_date, type: 'date' });
                //         rec.setValue({ fieldId: 'custrecord_swc_jj_vcdf_pdd_date', value: pdd_date });
                //     }
                //     if (obj.requiredShipDate) {
                //         var rsd_date = format.format({ value: moment.utc(obj.requiredShipDate).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                //         rsd_date = format.parse({ value: rsd_date, type: 'date' });
                //         rec.setValue({ fieldId: 'custrecord_swc_jj_vcdf_rsd_date', value: rsd_date });
                //     }
                //     if (obj.updateTime) {
                //         var update_time = format.format({ value: moment.utc(obj.updateTime).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.store_time_zone });
                //         update_time = format.parse({ value: update_time, type: 'date' });
                //         rec.setValue({ fieldId: 'custrecord_swc_jj_vcdf_updatedate', value: update_time });
                //     }
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