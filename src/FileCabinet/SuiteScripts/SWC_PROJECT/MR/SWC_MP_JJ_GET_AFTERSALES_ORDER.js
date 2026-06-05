/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_AFTERSALES_ORDER.js
 *@author ZJG
 *@description 积加-查询售后工单
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_aso_account' });

                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_aso_start_date' });
                var end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_aso_end_date' });

                var createdate = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_aso_createdate' });
                var purchasedate = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_aso_purchasedate' });
                var update = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_aso_update' });
                var orderids = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_aso_orderids' });
                var ps_orderids = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_aso_ps_orderids' });

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

                if (orderids) {
                    orderids = orderids.split(',');
                }
                if (ps_orderids) {
                    ps_orderids = ps_orderids.split(',');
                }

                if (createdate) {
                    dateQueryType = 'CREATE';
                }
                if (purchasedate) {
                    dateQueryType = 'PURCHASE';
                }
                if (update) {
                    dateQueryType = 'UPDATE';
                }
                if (!dateQueryType) {
                    throw '请在 创建日期、采购日期、更新日期 中选择一个';
                }

                var page = 1, pageSize = 100;
                var params = {
                    dateQueryType: dateQueryType,
                    startDate: start_date,
                    endDate: end_date,
                    polymerizeShopIds: [],//聚合店铺Id集合
                    orderIds: orderids,//平台订单号
                    postSalesNumbers: ps_orderids,//售后工单号
                    postSalesStates: [],//工单状态 [PENDING_SUBMISSION-待提交，PENDING_APPROVAL-待审批，IN_PROGRESS-处理中，COMPLETED-已完成，CANCELLED-已作废，ABNORMAL-异常]
                    postSalesTypes: [],//售后类型 [REFUND-仅退款、RETURN-仅退货、REFUND_AND_RETURN-退款并退货、RESEND-重发、NOT_SHIPPED_EXCHANGE-未发换货、SHIPPED_EXCHANGE-已发换货]
                    postSalesReasonIds: [],//售后原因id集合
                    ticketIds: [],//沟通任务编号集合
                    soSourceOrderCodes: [],//自发货订单编号集合
                    sourceReturnCodes: [],//销售退货单编号集合
                    creatorIds: [],//添加人id集合
                }

                try {
                    interface.JJGetAfterSalesOrder(jj_account, params, page, pageSize, []).map(function (a) {
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

                var acc_info = interface.GetAccountInfo('', obj.polymerizeShopId);
                log.audit('acc_info', acc_info);

                var as_so_id = '';
                search.create({
                    type: 'customrecord_swc_after_sales_order',
                    filters: [
                        { name: 'custrecord_swc_aso_id', operator: 'is', values: obj.id },
                        { name: 'custrecord_swc_aso_polymerizeshopid', operator: 'is', values: obj.polymerizeShopId },
                    ],
                }).run().each(function (rec) {
                    as_so_id = rec.id;
                });
                log.audit('as_so_id', as_so_id);

                if (as_so_id) {
                    var rec = record.load({ type: 'customrecord_swc_after_sales_order', id: as_so_id });
                } else {
                    var rec = record.create({ type: 'customrecord_swc_after_sales_order', isDynamic: false });
                }


                rec.setValue({ fieldId: 'custrecord_swc_aso_store_id', value: acc_info.id });
                rec.setValue({ fieldId: 'custrecord_swc_aso_id', value: obj.id });
                rec.setValue({ fieldId: 'custrecord_swc_aso_platformcode', value: obj.platformCode });
                rec.setValue({ fieldId: 'custrecord_swc_aso_polymerizeshopid', value: obj.polymerizeShopId });
                rec.setValue({ fieldId: 'custrecord_swc_aso_polymerizeshopname', value: obj.polymerizeShopName });
                rec.setValue({ fieldId: 'custrecord_swc_aso_orderid', value: obj.orderId });
                rec.setValue({ fieldId: 'custrecord_swc_aso_ordermodule', value: obj.orderModule });
                rec.setValue({ fieldId: 'custrecord_swc_aso_postsalesnumber', value: obj.postSalesNumber });
                rec.setValue({ fieldId: 'custrecord_swc_aso_postsalesstate', value: obj.postSalesState });
                rec.setValue({ fieldId: 'custrecord_swc_aso_postsalesstatename', value: obj.postSalesStateName });

                rec.setValue({ fieldId: 'custrecord_swc_aso_body', value: JSON.stringify(obj) });
                rec.setValue({ fieldId: 'custrecord_swc_aso_businessitemlist', value: JSON.stringify(obj.businessItemList) });


                if (obj.createTime) {
                    var c_date = format.format({ value: moment.utc(obj.createTime).toDate(), type: format.Type.DATE });
                    c_date = format.parse({ value: c_date, type: 'date' });
                    rec.setValue({ fieldId: 'custrecord_swc_aso_create_date', value: c_date });
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