/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_OBD_OUTBOUND.js
 *@author ZJG
 *@description 积加-查询大货出库单
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_obd_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_obd_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_obd_end_date' });

                if (!start_date) {
                    start_date = moment.utc().subtract(2, 'day').startOf('day').toISOString().substring(0, 19).replace('T', ' ');
                } else {
                    start_date = moment.utc(start_date).startOf('day').toISOString().substring(0, 19).replace('T', ' ');
                }
                if (!end_date) {
                    end_date = moment.utc().add(8, 'h').toISOString().substring(0, 19).replace('T', ' ');
                } else {
                    end_date = moment.utc(end_date).endOf('day').toISOString().substring(0, 19).replace('T', ' ');
                }


                var page = 1, pageSize = 100;
                var params = {
                    // start_date: start_date,
                    // end_date: end_date,
                    warehouseId: '',// 仓库ID
                    sourceOrderNos: [],//来源单号
                    waybillNos: [],//运单号
                    orderNos: [],//出库单号
                    externalOrderNos: [],//三方仓单号
                    createBeginTime: '',//创建时间-开始，yyyy-MM-dd HH:mm:ss
                    createEndTime: '',//创建时间-结束，yyyy-MM-dd HH:mm:ss
                    outBeginTime: start_date,//出库时间-开始，yyyy-MM-dd HH:mm:ss
                    outEndTime: end_date,//出库时间-结束，yyyy-MM-dd HH:mm:ss
                    cancelBeginTime: '',//取消时间-开始，yyyy-MM-dd HH:mm:ss
                    cancelEndTime: '',// 取消时间- 结束，yyyy-MM-dd HH:mm:ss
                }

                try {
                    interface.JJGetObdOutbound(jj_account, params, page, pageSize, []).map(function (a) {
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

                var itemVOList = obj.itemVOList;

                for (let i = 0; i < itemVOList.length; i++) {

                    var acc_info = interface.GetVCAccountInfo('', itemVOList[i].marketId);
                    log.audit('acc_info', acc_info);

                    var ps_id = '';
                    search.create({
                        type: 'customrecord_swc_vcpo_ship',
                        filters: [
                            { name: 'custrecord_swc_vs_id', operator: 'is', values: obj.id },
                            { name: 'custrecord_swc_vs_lineid', operator: 'is', values: itemVOList[i].id },
                        ],
                    }).run().each(function (rec) {
                        ps_id = rec.id;
                    });
                    log.audit('ps_id', ps_id);

                    if (ps_id) {
                        var rec = record.load({ type: 'customrecord_swc_vcpo_ship', id: ps_id });
                    } else {
                        var rec = record.create({ type: 'customrecord_swc_vcpo_ship', isDynamic: false });
                    }

                    rec.setValue({ fieldId: 'custrecord_swc_vs_alreadyoutnum', value: obj.alreadyOutNum });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_createstatus', value: obj.createStatus });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_externalorderno', value: obj.externalOrderNo });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_sourceorderno', value: obj.sourceOrderNo });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_ordertype', value: obj.orderType });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_warehouseid', value: obj.warehouseId });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_id', value: obj.id });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_maininfo', value: JSON.stringify(obj) });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_lineinfo', value: JSON.stringify(itemVOList[i]) });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_lineid', value: itemVOList[i].id });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_linealreadyoutnum', value: itemVOList[i].alreadyOutNum });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_linedeliverynum', value: itemVOList[i].deliveryNum });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_lineno', value: itemVOList[i].lineNo });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_marketid', value: itemVOList[i].marketId });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_lineorderid', value: itemVOList[i].orderId });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_lineorderno', value: itemVOList[i].orderNo });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_linesku', value: itemVOList[i].sku });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_linewarehouseid', value: itemVOList[i].warehouseId });
                    rec.setValue({ fieldId: 'custrecord_swc_vs_linestore', value: acc_info.id });


                    if (obj.outTime) {
                        var outDate = format.format({ value: moment.utc(obj.outTime).toDate(), type: format.Type.DATE });
                        outDate = format.parse({ value: outDate, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_vs_out_date', value: outDate });
                        rec.setValue({ fieldId: 'custrecord_swc_vs_outtime', value: obj.outTime });
                    }
                    if (obj.createTime) {
                        var createDate = format.format({ value: moment.utc(obj.createTime).toDate(), type: format.Type.DATE });
                        createDate = format.parse({ value: createDate, type: 'date' });
                        rec.setValue({ fieldId: 'custrecord_swc_vs_create_date', value: createDate });
                        rec.setValue({ fieldId: 'custrecord_swc_vs_createtime', value: obj.createTime });
                    }

                    var id = rec.save({ ignoreMandatoryFields: true });
                    log.debug("cache save success", id);
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