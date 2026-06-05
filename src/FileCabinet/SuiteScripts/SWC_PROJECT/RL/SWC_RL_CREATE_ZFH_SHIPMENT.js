/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/error', 'N/record', 'N/search', 'N/runtime', '../common/moment'], function (error, record, search, runtime, moment) {

    function _get(context) {

    }

    function _post(context) {
        var result = { code: 200, message: 'success', data: {} };
        try {
            log.audit('Body', context);
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            var requestBody = getBody(context);
            //创建预估仓租费日记录
            var zfh_shipment_data = record.create({ type: 'customrecord_swc_jj_zfh_shipment', isDynamic: true });
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_store', requestBody.store);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_id', requestBody.jijia_id);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_access_mode', requestBody.access_mode);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_customer_package_no', requestBody.shipment_package_no);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_country_code', requestBody.country_code);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_delivery_time', requestBody.delivery_time);
            var delivery_date = requestBody.delivery_date ? moment(requestBody.delivery_date).format(dateFormat) : '';
            zfh_shipment_data.setText('custrecord_swc_jj_zs_delivery_date', delivery_date);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_fo_order_no', requestBody.fo_order_no);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_fo_order_status', requestBody.fo_order_status);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_iscustomizationorde', requestBody.is_customizationorder);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_order_type', requestBody.order_type);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_package_no', requestBody.package_no);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_shop_id', requestBody.shop_id);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_shop_name', requestBody.shop_name);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_market_id', requestBody.market_id);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_so_order_no', requestBody.so_order_no);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_source_channel', requestBody.source_channel);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_delivery_method', requestBody.delivery_method);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_source_order_no', requestBody.source_order_no);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_thirdwarehouse_flag', requestBody.is_thirdwarehouse);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_warehouse_id', requestBody.warehouse_id);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_warehouse_name', requestBody.warehouse_name);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_fo_order_line_no', requestBody.order_line_no);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_msku', requestBody.msku);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_quantity', requestBody.quantity);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_valid_quantity', requestBody.valid_quantity);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_package_line_no', requestBody.package_line_no);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_so_order_detail_id', requestBody.order_detail_id);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_source_line_no', requestBody.source_line_no);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_third_sku', requestBody.third_sku);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_detail_status', requestBody.detail_status);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_erp_order_line_no', requestBody.erp_order_line_no);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_sku', requestBody.sku);
            zfh_shipment_data.setText('custrecord_swc_jj_zs_item', requestBody.item);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_location', requestBody.location);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_retry', requestBody.retry);
            zfh_shipment_data.setValue('custrecord_swc_jj_zs_resolved', requestBody.resolved);
            var zfh_shipment_data_id = zfh_shipment_data.save({ ignoreMandatoryFields: true });
            if (zfh_shipment_data_id) {
                result.data = { id: zfh_shipment_data_id };
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
