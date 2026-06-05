/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @name SWC_UE_SETTLEMENT_LINK_SO.js
 * @author ZJG
 * @description 结算报告关联销售订单
 */
define(['N/record', 'N/search', '../common/moment', '../common/interface', 'N/runtime', 'N/error', 'N/currency'],

    function (record, search, moment, interface, runtime, error, currency) {

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        function beforeLoad(scriptContext) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {
            try {
                var type = scriptContext.type;
                var newRecord = scriptContext.newRecord;
                log.audit('type', type);
                log.audit('newRecord.type', newRecord.type);
                if (type == 'delete') {
                    return
                }
                var rec = record.load({ type: newRecord.type, id: newRecord.id });
                
                if (rec.type == 'customrecord_swc_amazon_v2') {
                    //AmazonV2结算报告
                    var link_so = rec.getValue('custrecord_swc_amzv2_so_link');
                    log.audit('link_so', link_so);
                    if (!link_so) {
                        var order_id = rec.getValue('custrecord_swc_amzv2_orderid');
                        var market_id = rec.getValue('custrecord_swc_amzv2_marketid');
                        var msku = rec.getValue('custrecord_swc_amzv2_msku');
                        var sku_text = rec.getValue('custrecord_swc_amzv2_sku');
                        if (order_id && market_id) {
                            var acc_info = interface.GetAccountInfo('', market_id);
                            if (acc_info.id) {
                                var soIds = SearchSalesOrder(acc_info.id, order_id);
                                log.audit('soIds', soIds);
                                if (soIds.length) {
                                    rec.setValue({ fieldId: 'custrecord_swc_amzv2_so_link', value: soIds });
                                    rec.save({ ignoreMandatoryFields: true });
                                }
                            }
                        }
                    }

                }
                else if (rec.type == 'customrecord_swc_settlement_report') {
                    //积加其他平台结算报告
                    var link_so = rec.getValue('custrecord_swc_other_so_link');
                    log.audit('link_so', link_so);
                    if (!link_so) {
                        var order_id = rec.getValue('custrecord_swc_s_orderid');
                        var market_id = rec.getValue('custrecord_swc_marketid');
                        var msku = rec.getValue('custrecord_swc_s_msku');
                        var sku_text = rec.getValue('custrecord_swc_s_sku');
                        if (order_id && market_id) {
                            var acc_info = interface.GetAccountInfo('', market_id);
                            if (acc_info.id) {
                                var soIds = SearchSalesOrder(acc_info.id, order_id);
                                log.audit('soIds', soIds);
                                if (soIds.length) {
                                    rec.setValue({ fieldId: 'custrecord_swc_other_so_link', value: soIds });
                                    rec.save({ ignoreMandatoryFields: true });
                                }
                            }
                        }
                    }


                }
                else if (rec.type == 'customrecord_swc_xl_settlemenreport') {
                    //小鹿RPA结算报告
                    var link_so = rec.getValue('custrecord_swc_rpa_so_link');
                    log.audit('link_so', link_so);
                    if (!link_so) {
                        var order_id = rec.getValue('custrecord_swc_original_orderid');
                        var acc_id = rec.getValue('custrecord_swc_shop');
                        var msku = rec.getValue('custrecord_swc_xl_sku');
                        if (order_id && acc_id) {
                            var soIds = SearchSalesOrder(acc_id, order_id);
                            log.audit('soIds', soIds);
                            if (soIds.length) {
                                rec.setValue({ fieldId: 'custrecord_swc_rpa_so_link', value: soIds });
                                rec.save({ ignoreMandatoryFields: true });
                            }
                        }
                    }

                }
                else if (rec.type == 'customrecord_swc_xl_rtvam_ip') {
                    //小鹿退款明细-（导入）
                    var link_so = rec.getValue('custrecord_swc_rtv_po');
                    log.audit('link_so', link_so);
                    if (!link_so) {
                        var order_id = rec.getValue('custrecord_swc_rtv_ponumber');
                        var acc_id = rec.getValue('custrecord_swc_rtv_shop');
                        var msku = rec.getValue('custrecord_swc_rtv_msku');
                        if (order_id && acc_id) {
                            var soIds = SearchSalesOrder(acc_id, order_id);
                            log.audit('soIds', soIds);
                            if (soIds.length) {
                                rec.setValue({ fieldId: 'custrecord_swc_rtv_po', value: soIds });
                                rec.save({ ignoreMandatoryFields: true });
                            }
                        }
                    }

                }
                
            } catch (error) {
                log.error('afterSubmit error', error);
            }
        }

        function SearchSalesOrder(acc_id, order_id) {
            log.audit('SearchSalesOrder',{
                acc_id: acc_id,
                order_id: order_id,
            });
            
            var so_ids = [];
            var filters = [
                ['mainline', 'is', true], 'and',
                ['name', 'anyof', acc_id], 'and',
                [
                    ['poastext', 'is', order_id], 'or',
                    ['custbody_swc_platform_order_number', 'is', order_id]
                ]
            ];
            log.audit('SearchSalesOrder filters', filters);
            search.create({
                type: 'salesorder',
                filters: filters,
                columns: [
                    { name: 'subsidiary' },
                    { name: 'entity' },
                    { name: 'department' },
                    { name: 'currency' },
                    { name: 'statusref' },
                    { name: 'location' },
                    { name: 'otherrefnum' },
                ]
            }).run().each(function (rec) {
                so_ids.push(rec.id);
                return true
            });
            if (so_ids.length) {
                so_ids = [...new Set(so_ids)];
            }
            return so_ids
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });
