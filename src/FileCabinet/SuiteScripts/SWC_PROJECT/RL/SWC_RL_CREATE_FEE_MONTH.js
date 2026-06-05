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
        try {
            log.audit('Body', context);
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            var requestBody = getBody(context);
            //创建仓租费月报告
            var rental_month_data = record.create({ type: 'customrecord_swc_warehouse_rental_month', isDynamic: true });
            rental_month_data.setValue('custrecord_swc_warehouse_rental_sub', requestBody.subsidiary);
            rental_month_data.setValue('custrecord_swc_warehouse_rental_location', requestBody.warehouse);
            rental_month_data.setValue('custrecord_swc_warehouse_rental_currency', getCurrencyId(requestBody.currency));
            var fee_day_date = requestBody.date ? moment(requestBody.date).format(dateFormat) : '';
            fee_day_date ? rental_month_data.setText('custrecord_swc_warehouse_rental_date', fee_day_date) : '';
            rental_month_data.setValue('custrecord_swc_warehouse_rental_sku', requestBody.sku);
            rental_month_data.setValue('custrecord_swc_warehouse_rental_estimate', requestBody.estimate_fee);
            rental_month_data.setValue('custrecord_swc_warehouse_rental_actual', requestBody.actual_fee);
            rental_month_data.setValue('custrecord_swc_warehouse_rental_differen', requestBody.differen_fee);
            var rental_month_data_id = rental_month_data.save({ ignoreMandatoryFields: true });
            if (rental_month_data_id) {
                result.data = { id: rental_month_data_id };
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

    function getCurrencyId(currency_text) {
        var currency_id;
        if (currency_text) {
            search.create({
                type: 'currency',
                filters: [
                    { name: 'symbol', operator: 'is', values: currency_text }
                ]
            }).run().each(function (e) {
                currency_id = e.id;
                return false;
            })
        }
        return currency_id;
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
