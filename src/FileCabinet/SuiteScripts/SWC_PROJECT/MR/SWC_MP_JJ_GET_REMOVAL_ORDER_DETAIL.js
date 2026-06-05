/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_REMOVAL_ORDER_DETAIL.js
 *@author ZJG
 *@description 积加-查询FBA移除订单详情
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var orderid = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_rod_orderid' });
                var warehouseid = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_rod_warehouseid' });
                var filters = [
                    [
                        ['custrecord_swc_jj_ro_orderstatuskey', 'isnot', 'Completed'],
                        'and', ['custrecord_swc_jj_ro_orderstatuskey', 'isnot', 'Cancelled'],
                        'and', ['custrecord_swc_jj_ro_orderstatuskey', 'isnot', 'Abolished'],
                        'and', ['custrecord_swc_jj_ro_orderstatuskey', 'isnot', 'AmazonRejected'],
                    ]
                ]
                if (orderid) {
                    filters.push('and', ['custrecord_swc_jj_ro_orderid', 'is', orderid])
                }
                if (warehouseid) {
                    filters.push('and', ['custrecord_swc_jj_ro_shipwarehouseid', 'is', warehouseid])
                }
                log.audit('filters', filters);
                search.create({
                    type: 'customrecord_swc_jj_removal_order',
                    filters: filters,
                    columns: [
                        { name: 'custrecord_swc_jj_ro_orderid' },
                        { name: 'custrecord_swc_jj_ro_shipwarehouseid' },
                    ]
                }).run().each(function (rec) {
                    data.push({
                        id: rec.id,
                        orderId: rec.getValue('custrecord_swc_jj_ro_orderid'),
                        shipWarehouseId: rec.getValue('custrecord_swc_jj_ro_shipwarehouseid'),
                    });
                    return true;
                });

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

                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_rod_account' });
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

                var ro_rec = record.load({ type: 'customrecord_swc_jj_removal_order', id: obj.id });

                ro_rec.setValue({ fieldId: 'custrecord_swc_jj_ro_total', value: JSON.stringify(total) });
                ro_rec.setValue({ fieldId: 'custrecord_swc_jj_ro_volist', value: JSON.stringify(removalOrderVoList) });
                ro_rec.setValue({ fieldId: 'custrecord_swc_jj_ro_detailsvo', value: JSON.stringify(removalOrderDetailsVo) });
                const sublistId = 'recmachcustrecord_swc_jj_ord_fujilu';
                const line = ro_rec.getLineCount({ sublistId: sublistId });
                log.audit('line', line);
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