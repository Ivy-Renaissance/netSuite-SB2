/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_PUSH_SKU.js
 *@author ZJG
 *@description 积加-推送产品
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error'],
    function (format, runtime, search, record, error) {
        function getInputData() {

            var data = []
            try {
                // search.create({
                //     type: 'customrecord_swc_purchase_plan',
                //     // filters: [
                //     //     { name: 'custitem_swc_push_jj_pro', operator: 'is', values: true },
                //     //     { name: 'custitem_swc_jj_create', operator: 'is', values: true }
                //     // ],
                //     columns: [
                //         // { name: 'type' }

                //     ]
                // }).run().each(function (a) {

                //     data.push({
                //         id: a.id
                //     })
                //     return true
                // });
                // return data;

                search.create({
                    type: 'item',
                    filters: [
                        { name: 'custitem_swc_push_jj_pro', operator: 'is', values: true },
                        { name: 'custitem_swc_jj_create', operator: 'is', values: false }
                    ],
                    columns: [
                        { name: 'type' }

                    ]
                }).run().each(function (a) {
                    var itemType = a.getValue('type');
                    log.debug('itemType', itemType)
                    if ('InvtPart' == itemType) {
                        itemType = 'lotnumberedinventoryitem'

                    } else {
                        itemType = 'lotnumberedassemblyitem'
                    }
                    data.push({
                        id: a.id,
                        type: itemType
                    })
                    return true
                });

            } catch (e) {
                log.error('getinput error', e);
            }
            log.audit("data length", data.length);
            return data;
        }

        function map(context) {
            try {
            //     var obj = JSON.parse(context.value)
            //     log.debug("obj", obj);
            //     var rec = record.load({
            //         type: 'customrecord_swc_purchase_plan',
            //         id: obj.id,
            //         isDynamic: true
            //     });
            //     var fields = {
            //     '2-3': "custrecord_swc_pd_cg_ca",
            //     '1-3': "custrecord_swc_pd_cg_us",
            //     '3-2': "custrecord_swc_pd_3pl_de",
            //     '4-2': "custrecord_swc_pd_3pl_uk",
            //     '1-2': "custrecord_swc_pd_fba_us",
            //     '2-2': "custrecord_swc_pd_fba_ca",
            //     '3-2': "custrecord_swc_pd_fba_de",
            //     '4-2': "custrecord_swc_pd_fba_uk",
            //     '5-2': "custrecord_swc_pd_fba_fr",
            //     '5-4': "custrecord_swc_pd_mano_fr"
            // }
            //     rec.setValue({ fieldId: 'custrecord_swc_pd_cg_ca', value: 0 });
            //     rec.setValue({ fieldId: 'custrecord_swc_pd_cg_us', value: 0 });
            //     rec.setValue({ fieldId: 'custrecord_swc_pd_3pl_de', value: 0 });
            //     rec.setValue({ fieldId: 'custrecord_swc_pd_3pl_uk', value: 0 });
            //     rec.setValue({ fieldId: 'custrecord_swc_pd_fba_us', value: 0 });
            //     rec.setValue({ fieldId: 'custrecord_swc_pd_fba_ca', value: 0 });
            //     rec.setValue({ fieldId: 'custrecord_swc_pd_fba_de', value: 0 });
            //     rec.setValue({ fieldId: 'custrecord_swc_pd_fba_uk', value: 0 });
            //     rec.setValue({ fieldId: 'custrecord_swc_pd_fba_fr', value: 0 });
            //     rec.setValue({ fieldId: 'custrecord_swc_pd_mano_fr', value: 0 });
            //     rec.save();
            //     return
                var obj = JSON.parse(context.value)
                log.debug("obj", obj);
                var newRecord = record.load({ type: obj.type, id: obj.id });
                // newRecord.setValue({ fieldId: 'custitem_swc_jj_create', value: false });
                newRecord.setValue({ fieldId: 'custitem_swc_jj_item_error', value: '' });
                newRecord.save({ ignoreMandatoryFields: true });
                var start = new Date().getTime();
                for (var i = 0; i < 1e7; i++) {
                    if ((new Date().getTime() - start) > 1000) {
                        break;
                    }
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