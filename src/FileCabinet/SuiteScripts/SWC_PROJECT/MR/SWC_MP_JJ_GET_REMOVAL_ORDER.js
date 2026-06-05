/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_REMOVAL_ORDER.js
 *@author ZJG
 *@description 积加-查询FBA移除订单列表
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_ro_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_ro_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_ro_end_date' });

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
                    requestDateBegin: '',
                    requestDateEnd: '',
                    updateTimeBegin: start_date,
                    updateTimeEnd: end_date,
                    orderTypeList: [],// 移除方式 [Return - 退货, Disposal - 弃置, Liquidations - 清算]
                    createWay: '',//创建方式 [0-亚马逊后台,1-系统内]
                }

                try {
                    interface.JJGetRemovalOrder(jj_account, params, page, pageSize, []).map(function (a) {
                        data.push(a);
                    });
                } catch (e1) {
                    log.error('handleit error', e1)
                }
            } catch (e) {
                log.error('getinput error', e);
            }
            // log.audit("data[0]", data[0]);
            log.audit("data length", data.length);
            return data;
        }

        function map(context) {
            try {
                var obj = JSON.parse(context.value);
                log.audit('obj', obj);

                var ro_id = '';
                search.create({
                    type: 'customrecord_swc_jj_removal_order',
                    filters: [
                        { name: 'custrecord_swc_jj_ro_id', operator: 'is', values: obj.id },
                        { name: 'custrecord_swc_jj_ro_orderid', operator: 'is', values: obj.orderId },
                    ],
                }).run().each(function (rec) {
                    ro_id = rec.id;
                });
                log.audit('ro_id', ro_id);

                if (ro_id) {
                    var rec = record.load({ type: 'customrecord_swc_jj_removal_order', id: ro_id });
                } else {
                    var rec = record.create({ type: 'customrecord_swc_jj_removal_order', isDynamic: false });
                }

                for (var field_id in interface.fieldsMapping._REMOVAL_ORDERE_.mapping) {
                    if (obj[interface.fieldsMapping._REMOVAL_ORDERE_.mapping[field_id]]) {
                        rec.setValue({ fieldId: field_id, value: obj[interface.fieldsMapping._REMOVAL_ORDERE_.mapping[field_id]] })
                    }
                }


                var requestDate = format.parse({ value: moment(obj.requestTime).toDate(), type: 'date' });
                var updateDate = format.parse({ value: moment(obj.updateTime).toDate(), type: 'date' });

                rec.setValue({ fieldId: 'custrecord_swc_jj_ro_requestdate', value: requestDate });
                rec.setValue({ fieldId: 'custrecord_swc_jj_ro_updatedate', value: updateDate });

                var save_id = rec.save({ ignoreMandatoryFields: true });
                log.debug("cache save success", save_id);


                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_ro_account' });
                var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);

                var params = {
                    warehouseId: obj.shipWarehouseId,
                    orderId: obj.orderId,
                }

                var ro_detail = interface.JJGetRemovalOrderDetail(jj_account, params);
                log.audit('ro_detail', ro_detail);

                var removalOrderDetailsVo = ro_detail.removalOrderDetailsVo;
                var removalOrderVoList = ro_detail.removalOrderVoList;
                var total = ro_detail.total;

                var ro_rec = record.load({ type: 'customrecord_swc_jj_removal_order', id: save_id });

                ro_rec.setValue({ fieldId: 'custrecord_swc_jj_ro_total', value: JSON.stringify(total) });
                ro_rec.setValue({ fieldId: 'custrecord_swc_jj_ro_volist', value: JSON.stringify(removalOrderVoList) });
                ro_rec.setValue({ fieldId: 'custrecord_swc_jj_ro_detailsvo', value: JSON.stringify(removalOrderDetailsVo) });
                const sublistId = 'recmachcustrecord_swc_jj_ord_fujilu'
                const line = ro_rec.getLineCount({ sublistId: sublistId });
                if (Number(line) == 0) {
                    for (let i = 0; i < removalOrderVoList.length; i++) {
                        const element = removalOrderVoList[i];
                        for (var field_id in interface.fieldsMapping._REMOVAL_ORDERE_DETAIL_.mapping) {
                            if (element[interface.fieldsMapping._REMOVAL_ORDERE_DETAIL_.mapping[field_id]]) {
                                ro_rec.setSublistValue({ sublistId: sublistId, fieldId: field_id, value: element[interface.fieldsMapping._REMOVAL_ORDERE_DETAIL_.mapping[field_id]], line: i })
                            }
                        }
                    }
                } else {
                    var n_data = [];
                    for (let j = 0; j < removalOrderVoList.length; j++) {
                        const element = removalOrderVoList[j];
                        var flag = true;
                        for (let i = 0; i < line; i++) {
                            var l_id = ro_rec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_jj_ord_id', line: i });
                            var l_msku = ro_rec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_jj_ord_msku', line: i });
                            var l_orderid = ro_rec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_jj_ord_orderid', line: i });
                            var l_warehouseid = ro_rec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_jj_ord_warehouseid', line: i });
                            if (element.id == l_id && element.orderId == l_orderid && element.warehouseId == l_warehouseid && element.msku == l_msku) {
                                flag = false;
                                for (var field_id in interface.fieldsMapping._REMOVAL_ORDERE_DETAIL_.mapping) {
                                    if (element[interface.fieldsMapping._REMOVAL_ORDERE_DETAIL_.mapping[field_id]]) {
                                        ro_rec.setSublistValue({ sublistId: sublistId, fieldId: field_id, value: element[interface.fieldsMapping._REMOVAL_ORDERE_DETAIL_.mapping[field_id]], line: i })
                                    }
                                }
                                break;
                            }
                        }
                        if (flag) {
                            n_data.push(element)
                        }
                    }
                    for (let i = 0; i < n_data.length; i++) {
                        const element = n_data[i];
                        for (var field_id in interface.fieldsMapping._REMOVAL_ORDERE_DETAIL_.mapping) {
                            if (element[interface.fieldsMapping._REMOVAL_ORDERE_DETAIL_.mapping[field_id]]) {
                                ro_rec.setSublistValue({ sublistId: sublistId, fieldId: field_id, value: element[interface.fieldsMapping._REMOVAL_ORDERE_DETAIL_.mapping[field_id]], line: Number(Number(line) + Number(i)) })
                            }
                        }
                    }
                }
                var ro_line_id = ro_rec.save({ ignoreMandatoryFields: true });
                log.debug("ro_line_id", ro_line_id);
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