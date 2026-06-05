/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_UNITS_DETAIL.js
 *@author ZJG
 *@description 积加-批量查询包裹单详情及费用
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = [], limit = 399;
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_ud_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                }

                var store_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_ud_store' });
                var order_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_ud_order_id' });

                var filters = [
                    ['isinactive', 'is', false], 'and',
                    ['custrecord_swc_jj_zs_resolved', 'is', true], 'and',
                    ['custrecord_swc_jj_zs_ud_resolved', 'is', false], 'and',
                    ['custrecord_swc_jj_zs_fo_order_no', 'isnotempty', []], 'and',
                    ['custrecord_swc_jj_zs_relation_if', 'noneof', ['@NONE@']]
                ];
                if (store_id) {
                    filters.push('and', ['custrecord_swc_jj_zs_store', 'anyof', store_id]);
                }
                if (order_id) {
                    filters.push('and', ['custrecord_swc_jj_zs_source_order_no', 'is', order_id]);
                }

                search.create({
                    type: 'customrecord_swc_jj_zfh_shipment',
                    filters: filters,
                    columns: [
                        { name: 'custrecord_swc_jj_zs_fo_order_no' },
                        { name: 'custrecord_swc_jj_zs_relation_if' },
                    ]
                }).run().each(function (rec) {
                    data.push({
                        id: rec.id,
                        if_id: rec.getValue('custrecord_swc_jj_zs_relation_if'),
                        fo_order_no: rec.getValue('custrecord_swc_jj_zs_fo_order_no'),
                    });
                    return --limit > 0;
                });

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
                var data = [];



                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_ud_account' });
                var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);

                var foOrderCodeList = [];
                foOrderCodeList.push(obj.fo_order_no);
                var params = {
                    foOrderCodeList: foOrderCodeList,
                    unitCodeList: [],
                }

                interface.JJGetShipUnitsDetail(jj_account, params, []).map(function (d) {
                    data.push(d);
                });
                log.audit('data', data);

                for (let i = 0; i < data.length; i++) {
                    const element = data[i];
                    let supplierFeeList = element.supplierFeeList;
                    let foOrderCode = element.foOrderCode;

                    for (let j = 0; j < supplierFeeList.length; j++) {
                        const element_sfl = supplierFeeList[j];
                        var rec = record.create({ type: 'customrecord_swc_logistics_cost', isDynamic: false });
                        rec.setValue({ fieldId: 'custrecord_swc_logistics', value: element_sfl.supplierName });
                        rec.setValue({ fieldId: 'custrecord_swc_feeid', value: element_sfl.feeType });
                        rec.setValue({ fieldId: 'custrecord_swc_feetname', value: element_sfl.feeTypeName });
                        rec.setValue({ fieldId: 'custrecord_swc_amount', value: element_sfl.amount });
                        // rec.setValue({ fieldId: 'custrecord_swc_updateby', value: element_sfl.supplierName });
                        rec.setValue({ fieldId: 'custrecord_swc_update_time', value: element_sfl.updateTime });
                        // rec.setValue({ fieldId: 'custrecord_swc_wl_currency', value: element_sfl.currency });
                        rec.setText({ fieldId: 'custrecord_swc_wl_currency', text: element_sfl.currency });
                        rec.setValue({ fieldId: 'custrecord_swc_wl_trackingno', value: element.trackingNo });
                        rec.setValue({ fieldId: 'custrecord_swc_linkid', value: obj.if_id });

                        if (element_sfl.updateTime) {
                            let update_date = format.format({ value: moment.utc(element_sfl.updateTime).toDate(), type: format.Type.DATE });
                            update_date = format.parse({ value: update_date, type: 'date' });
                            rec.setValue({ fieldId: 'custrecord_swc_update_date', value: update_date });
                        }

                        rec.save({ ignoreMandatoryFields: true });
                    }
                }

                if (data.length) {
                    record.submitFields({
                        type: 'customrecord_swc_jj_zfh_shipment',
                        id: obj.id,
                        values: {
                            custrecord_swc_jj_zs_ud_resolved: true
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true,
                        }
                    });
                }

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