/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *
 */
define(['N/error', 'N/record', 'N/search', 'N/runtime', '../common/moment'], function (error, record, search, runtime, moment) {

    function _get(context) {

    }

    function _post(context) {
        var result = { code: 200, message: 'success', data: {} };
        //注：CG货品匹配【多平台 SKU映射】表信息:匹配条件：店铺+sku_code，3PL货品匹配【三方仓产品配对信息】表信息：匹配条件：服务商+三方仓sku
        try {
            log.audit('Body', context);
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            var requestBody = getBody(context);
            if (requestBody.type == 1 || requestBody.type == 2) {
                if (!requestBody.storeId) {
                    result.code = 500;
                    result.message = "店铺【storeId】参数为空";
                    return JSON.stringify(result);
                }
            }
            if (requestBody.type == 3) {
                if (!requestBody.serviceProvider) {
                    result.code = 500;
                    result.message = "服务商【serviceProvider】参数为空";
                    return JSON.stringify(result);
                }
            }
            //根据店铺、skucode匹配【多平台 SKU映射】表信息
            var item_id = getItemId(requestBody.storeId, requestBody.sku);
            // if (!item_id) {
            //     result.code = 500;
            //     result.message = "未匹配到NS系统货品";
            //     return JSON.stringify(result);
            // }
            var memo = '';
            //创建平台及海外仓收货报告
            var in_info_data = record.create({ type: 'customrecord_swc_platform_loc_in_info', isDynamic: true });
            in_info_data.setValue('custrecord_swc_in_loc_type', requestBody.type);
            in_info_data.setValue('custrecord_swc_in_number', requestBody.number);
            in_info_data.setValue('custrecord_swc_in_detail_num', requestBody.detailNumber);
            in_info_data.setValue('custrecord_swc_in_sku_code', requestBody.sku);
            if (item_id) {
                in_info_data.setValue('custrecord_swc_in_sku', item_id);
            } else {
                memo = '未匹配到NS系统货品';
            }
            var in_date = requestBody.date ? moment(requestBody.date).format(dateFormat) : '';
            in_date ? in_info_data.setText('custrecord_swc_in_date', in_date) : '';
            in_info_data.setValue('custrecord_swc_in_quantity', requestBody.quantity);
            var ow_date = requestBody.owDate ? moment(requestBody.owDate).format(dateFormat) : '';
            ow_date ? in_info_data.setText('custrecord_swc_in_ow_date', ow_date) : '';
            in_info_data.setValue('custrecord_swc_in_ow_quantity', requestBody.owQuantity);
            in_info_data.setValue('custrecord_swc_in_date_servic', requestBody.serviceProvider);
            in_info_data.setValue('custrecord_swc_in_store', requestBody.storeId);
            in_info_data.setValue('custrecord_swc_in_memo', memo);
            //2026/04/24 补充
            in_info_data.setValue('custrecord_swc_in_shsl', requestBody.shsl);
            
            var sjkcsj_date = requestBody.sjkcsj ? moment(requestBody.sjkcsj).format(dateFormat) : '';
            sjkcsj_date ? in_info_data.setText('custrecord_swc_in_sjkcsj', sjkcsj_date) : '';
            
            var qgsj_date = requestBody.qgsj ? moment(requestBody.qgsj).format(dateFormat) : '';
            qgsj_date ? in_info_data.setText('custrecord_swc_in_qgsj', qgsj_date) : '';
            
            var sjdgsj_date = requestBody.sjdgsj ? moment(requestBody.sjdgsj).format(dateFormat) : '';
            sjdgsj_date ? in_info_data.setText('custrecord_swc_in_sjdgsj', sjdgsj_date) : '';
            
            var mdcsjddsj_date = requestBody.mdcsjddsj ? moment(requestBody.mdcsjddsj).format(dateFormat) : '';
            mdcsjddsj_date ? in_info_data.setText('custrecord_swc_in_mdcsjddsj', mdcsjddsj_date) : '';
            
            var kxfhsj_date = requestBody.kxfhsj ? moment(requestBody.kxfhsj).format(dateFormat) : '';
            kxfhsj_date ? in_info_data.setText('custrecord_swc_in_kxfhsj', kxfhsj_date) : '';
            //2026/04/24 补充 end
            var in_info_data_id = in_info_data.save({ ignoreMandatoryFields: true });
            if (in_info_data_id) {
                result.data = { id: in_info_data_id };
            }
        } catch (e) {
            log.error("错误信息：", { err: e.message, requestBody });
            if (e?.name && +e.name) {
                result.code = +e.name;
                result.message = e.message;
                result.data = e.data;
            } else {
                result.code = 500;
                result.message = "请求异常,错误信息:" + e;
            }
        }
        return JSON.stringify(result);
    }

    function getItemId(storeId, sku) {
        var item_id;
        search.create({
            type: 'customrecord_swc_platform_sku_mapping',
            filters:
                [
                    ["custrecord_swc_pt_sku_map_msku", "is", sku],
                    "AND",
                    ["custrecord_swc_pt_sku_map_store", "anyof", storeId],
                    "AND",
                    ["isinactive", "is", false]
                ],
            columns:
                [
                    'custrecord_swc_pt_sku_map_item',
                    { name: 'internalid', sort: 'DESC' }
                ]
        }).run().each(function (result) {
            if (result.getValue(result.columns[0])) {
                item_id = result.getValue(result.columns[0]);
            }
            return false;
        });
        return item_id;
    }

    /**
     * 获取 请求body
     * @param {string|Object} requestBody 请求body
     * @returns {Object}
     */
    function getBody(requestBody) {
        try {
            requestBody = typeof (requestBody) == "string" ? JSON.parse(requestBody) : requestBody;
        } catch (e) {
            throw error.create({ name: "400", message: "requestBody参数错误: " + requestBody, notifyOff: true });
        }
        return requestBody;
    }

    function _put(context) {

    }

    function _delete(context) {

    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});