/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_PLATFORM_SKU.js
 *@author ZJG
 *@description 积加-查询SKU关联多平台MSKU
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_pt_msku_jj_account' });
                var sku_type = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_pt_msku_sku_type' });
                // var acc_ids = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_pt_msku_acc_ids' });
                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                // if (acc_ids) {
                //     //根据店铺查平台编码？ 或者参数为平台编码
                //     search.create({
                //         type: 'customer',
                //         filters: [
                //             { name: 'internalId', operator: 'is', values: acc_ids },
                //         ],
                //         columns: [
                //             { name: 'internalId' }
                //         ]
                //     }).run().each(function (rec) {

                //         return true;
                //     });
                // }
                var platformIdList = [];

                var page = 1, pageSize = 100;
                interface.JJGetPlatformMsku(jj_account, sku_type, platformIdList, page, pageSize, []).map(function (sku) {
                    data.push(sku);
                });
            } catch (e) {
                log.error('getinput error', e);
            }
            log.audit("data length", data.length);
            return data;
        }

        function map(context) {
            try {


                // var userObj = runtime.getCurrentUser();
                // log.audit('userObj', userObj);

                // var DATEFORMAT = userObj.getPreference({ name: "DATEFORMAT" });
                // var TIMEFORMAT = userObj.getPreference({ name: "TIMEFORMAT" });
                // var TIMEZONE = userObj.getPreference({ name: "TIMEZONE" });
                // log.audit('datetime', {
                //     DATEFORMAT: DATEFORMAT,
                //     TIMEFORMAT: TIMEFORMAT,
                //     TIMEZONE: TIMEZONE,
                // });



                var obj = JSON.parse(context.value);
                log.audit('obj', obj);

                var mp_id = '';
                search.create({
                    type: 'customrecord_swc_platform_sku_mapping',
                    filters: [
                        { name: 'custrecord_swc_pt_sku_map_sku', operator: 'is', values: obj.sku },
                        { name: 'custrecord_swc_pt_sku_map_skutype', operator: 'is', values: obj.skuType },
                        { name: 'custrecord_swc_pt_sku_map_msku', operator: 'is', values: obj.msku },
                        { name: 'custrecord_swc_pt_sku_map_platformid', operator: 'is', values: obj.platformId },
                        { name: 'custrecord_swc_pt_sku_map_platformname', operator: 'is', values: obj.platformName },
                        { name: 'custrecord_swc_pt_sku_map_shopid', operator: 'is', values: obj.shopId },
                        { name: 'custrecord_swc_pt_sku_map_country', operator: 'is', values: obj.country },
                        { name: 'custrecord_swc_pt_sku_map_recorddate_t', operator: 'is', values: obj.recordDate },
                    ],
                    columns: [
                        { name: 'created', sort: search.Sort.DESC },
                    ]
                }).run().each(function (rec) {
                    mp_id = rec.id;
                });
                log.audit('mp_id', mp_id);

                if (!mp_id) {
                    var rec = record.create({ type: 'customrecord_swc_platform_sku_mapping', isDynamic: false });
                } else {
                    var rec = record.load({ type: 'customrecord_swc_platform_sku_mapping', id: mp_id });
                }

                rec.setValue({ fieldId: 'custrecord_swc_pt_sku_map_sku', value: obj.sku });
                rec.setValue({ fieldId: 'custrecord_swc_pt_sku_map_skutype', value: obj.skuType });
                rec.setValue({ fieldId: 'custrecord_swc_pt_sku_map_msku', value: obj.msku });
                rec.setValue({ fieldId: 'custrecord_swc_pt_sku_map_platformid', value: obj.platformId });
                rec.setValue({ fieldId: 'custrecord_swc_pt_sku_map_platformname', value: obj.platformName });
                rec.setValue({ fieldId: 'custrecord_swc_pt_sku_map_shopid', value: obj.shopId });
                rec.setValue({ fieldId: 'custrecord_swc_pt_sku_map_country', value: obj.country });
                rec.setValue({ fieldId: 'custrecord_swc_pt_sku_map_recorddate_t', value: obj.recordDate });
                rec.setValue({ fieldId: 'custrecord_swc_pt_sku_map_memo', value: obj.memo });
                
                rec.setText({ fieldId: 'custrecord_swc_pt_sku_map_item', text: obj.sku });
                
                var acc_info = interface.GetAccountInfo('', '', obj.shopId, obj.platformName);
                log.audit('acc_info', acc_info);
                rec.setValue({ fieldId: 'custrecord_swc_pt_sku_map_store', value: acc_info.id });


                // var date_time = format.format({
                //     value: moment(obj.recordDate).toDate(),
                //     type: format.Type.DATETIMETZ,
                //     timezone: TIMEZONE
                // });
                // rec.setText({ fieldId: "custrecord_swc_pt_sku_map_recorddate", text: date_time });

                var id = rec.save({ ignoreMandatoryFields: true });
                log.debug("cache save success", id);

            } catch (e) {
                log.error("import skumap error", e);
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