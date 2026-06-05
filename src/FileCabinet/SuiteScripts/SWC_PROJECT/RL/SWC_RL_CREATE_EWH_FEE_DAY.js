/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *
 */
define(['N/error', 'N/record', 'N/search', 'N/runtime', '../common/moment', 'N/currency'], function (error, record, search, runtime, moment,currency) {

    function _get(context) {

    }

    function _post(context) {
        var result = { code: 200, message: 'success', data: {} };
        try {
            log.audit('Body', context);
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            var requestBody = getBody(context);
            //创建预估仓租费日记录
            var ewh_fee_data = record.create({ type: 'customrecord_swc_ewh_fee_day', isDynamic: true });
            ewh_fee_data.setValue('custrecord_swc_ewh_fee_day_subsidiary', requestBody.subsidiary);
            ewh_fee_data.setValue('custrecord_swc_ewh_fee_day_warehouse', requestBody.warehouse);
            // ewh_fee_data.setValue('custrecord_swc_ewh_fee_day_currency', getCurrencyId(requestBody.currency));
            ewh_fee_data.setValue('custrecord_swc_ewh_fee_day_currency_or', getCurrencyId(requestBody.currency));//原币
            ewh_fee_data.setValue('custrecord_swc_ewh_fee_day_lot', requestBody.lot);
            ewh_fee_data.setValue('custrecord_swc_ewh_fee_day_number', requestBody.number);
            var in_date = requestBody.in_date ? moment(requestBody.in_date).format(dateFormat) : '';
            in_date ? ewh_fee_data.setText('custrecord_swc_ewh_fee_day_in_date', in_date) : '';
            var fee_day_date = requestBody.date ? moment(requestBody.date).format(dateFormat) : '';
            fee_day_date ? ewh_fee_data.setText('custrecord_swc_ewh_fee_day_date', fee_day_date) : '';
            ewh_fee_data.setValue('custrecord_swc_ewh_fee_day_inventory_age', requestBody.inventory_age);
            ewh_fee_data.setValue('custrecord_swc_ewh_fee_day_quantity', requestBody.quantity);
            // ewh_fee_data.setValue('custrecord_swc_ewh_fee_day_fee', requestBody.fee);//仓租费 本币
            ewh_fee_data.setValue('custrecord_swc_ewh_fee_day_amount_or', requestBody.fee);//仓租费 原币
            ewh_fee_data.setText('custrecord_swc_ewh_fee_day_sku', requestBody.sku);
            //币种处理
            var sub = ewh_fee_data.getValue('custrecord_swc_ewh_fee_day_subsidiary');
            var subRec = record.load({
                type: 'subsidiary',
                id: sub
            });
            var currency_ben = subRec.getValue({
                fieldId: 'currency'
            });
            var currency_bent = subRec.getText({
                fieldId: 'currency'
            });

            var currency_or = requestBody.currency;
            if (currency_bent && currency_or) {
                var rate = currency.exchangeRate({
                    source: currency_or,
                    target: currency_bent,
                    date: new Date(fee_day_date)
                });
                log.audit('rate',rate);
                ewh_fee_data.setValue('custrecord_swc_ewh_fee_day_currency', currency_ben);//本币
                ewh_fee_data.setValue('custrecord_swc_ewh_fee_day_rate_or', rate);//汇率
                ewh_fee_data.setValue('custrecord_swc_ewh_fee_day_fee', rate * requestBody.fee);//仓租费 原币
            }
            var ewh_fee_data_id = ewh_fee_data.save({ ignoreMandatoryFields: true });
            if (ewh_fee_data_id) {
                result.data = { id: ewh_fee_data_id };
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