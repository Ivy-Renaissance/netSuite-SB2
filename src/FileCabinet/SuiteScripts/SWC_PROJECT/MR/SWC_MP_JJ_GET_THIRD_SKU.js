/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@name SWC_MP_JJ_GET_THIRD_SKU.js
 *@author ZJG
 *@description 积加-查询三方仓产品配对信息
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/interface', '../common/moment'],
    function (format, runtime, search, record, error, interface, moment) {
        function getInputData() {
            var data = []
            try {
                var jj_acc_id = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_tp_msku_jj_account' });
                var matchStatus = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_tp_msku_match_status' });
                var state = runtime.getCurrentScript().getParameter({ name: 'custscript_jj_tp_msku_state' });
                if (!jj_acc_id) {
                    throw '请维护积加账号参数';
                } else {
                    var jj_account = interface.JJDeveloperAccountAuth(jj_acc_id);
                }

                var skuList = [], thirdSkuList = [], spCodeList = [], thirdSkuStatusList = [], warehouseIds = [];
                var page = 1, pageSize = 1000;
                var params = {
                    skuList: skuList,
                    thirdSkuList: thirdSkuList,
                    spCodeList: spCodeList,
                    thirdSkuStatusList: thirdSkuStatusList,
                    warehouseIds: warehouseIds,
                    matchStatus: matchStatus,
                    state: state,
                }
                interface.JJGetThirdProduct(jj_account, params, page, pageSize, []).map(function (sku) {
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
                var obj = JSON.parse(context.value);
                log.audit('obj', obj);

                var mp_id = '';
                search.create({
                    type: 'customrecord_swc_thirdproduct_mapping',
                    filters: [
                        { name: 'custrecord_swc_tp_sku_map_id', operator: 'is', values: obj.id },
                    ],
                }).run().each(function (rec) {
                    mp_id = rec.id;
                });
                log.audit('mp_id', mp_id);

                if (!mp_id) {
                    var rec = record.create({ type: 'customrecord_swc_thirdproduct_mapping', isDynamic: false });
                } else {
                    var rec = record.load({ type: 'customrecord_swc_thirdproduct_mapping', id: mp_id });
                }

                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_id', value: obj.id });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_spname', value: obj.spName });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_spcode', value: obj.spCode });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_warehouseid', value: obj.warehouseId });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_warehousename', value: obj.warehouseName });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_warehousecode', value: obj.warehouseCode });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_thirdskuname', value: obj.thirdSkuName });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_thirdsku', value: obj.thirdSku });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_thirdskustatus', value: obj.thirdSkuStatus });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_skuname', value: obj.skuName });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_sku', value: obj.sku });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_skuimageurl', value: obj.skuImageUrl });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_quantity', value: obj.quantity });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_matchstatus', value: obj.matchStatus });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_state', value: obj.state });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_shipdesc', value: obj.shipDesc });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_msku', value: obj.msku });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_shippriority', value: obj.shipPriority });
                rec.setValue({ fieldId: 'custrecord_swc_tp_sku_map_syncgipstorage', value: obj.syncGipStorage });
                rec.setText({ fieldId: 'custrecord_swc_3pl_item', text: obj.sku });


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