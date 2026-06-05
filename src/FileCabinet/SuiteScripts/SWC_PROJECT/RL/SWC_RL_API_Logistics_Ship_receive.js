/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/http', 'N/record', 'N/runtime', '../common/moment'],

    (http, record, runtime, moment) => {
        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const get = (requestParams) => {

        }

        /**
         * Defines the function that is executed when a PUT request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body are passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const put = (requestBody) => {

        }

        /**
         * Defines the function that is executed when a POST request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const post = (requestBody) => {

            let result = { code: '200', msg: 'success', data: {} };
            try {
                let shipObj = requestBody;
                log.error('shipObj', shipObj);
                var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
                if (shipObj) {
                    let id = shipObj.id;
                    let rec = record.load({
                        type: 'customrecord_swc_wl_plan_order',
                        id: id,
                        isDynamic: true
                    });

                    //卸货时间discharge
                    if (shipObj.unLoadingTime) {
                        var unLoadingTime = shipObj.unLoadingTime ? moment(shipObj.unLoadingTime).format(dateFormat) : '';
                        rec.setText({
                            fieldId: 'custrecord_swc_unloading_time',
                            text: unLoadingTime
                        });
                    }

                    //预计开船时间ETD
                    if (shipObj.etd) {
                        var etd = shipObj.etd ? moment(shipObj.etd).format(dateFormat) : '';
                        rec.setText({
                            fieldId: 'custrecord_swc_wl_etd',
                            text: etd
                        });
                    }
                    //预计到岸日期ETA
                    if (shipObj.eta) {
                        var eta = shipObj.eta ? moment(shipObj.eta).format(dateFormat) : '';
                        rec.setText({
                            fieldId: 'custrecord_swc_wl_eta',
                            text: eta
                        });
                    }
                    //实际开船时间ATD
                    if (shipObj.atd) {
                        var atd = shipObj.atd ? moment(shipObj.atd).format(dateFormat) : '';
                        rec.setText({
                            fieldId: 'custrecord_swc_wl_atd',
                            text: atd
                        });
                    }
                    //实际到岸时间ATA
                    if (shipObj.ata) {
                        var ata = shipObj.ata ? moment(shipObj.ata).format(dateFormat) : '';
                        rec.setText({
                            fieldId: 'custrecord_swc_wl_ata',
                            text: ata
                        });
                    }
                    // 出港待送货时间gate out
                    if (shipObj.gateOutTime) {
                        var gateOutTime = shipObj.gateOutTime ? moment(shipObj.gateOutTime).format(dateFormat) : '';
                        rec.setText({
                            fieldId: 'custrecord_swc_gate_out_time_for',
                            text: gateOutTime
                        });
                    }
                    // 还柜时间
                    if (shipObj.returnTime) {
                        var returnTime = shipObj.returnTime ? moment(shipObj.returnTime).format(dateFormat) : '';
                        rec.setText({
                            fieldId: 'custrecord_swc_wl_return_time',
                            text: returnTime
                        });
                    }

                    //预计进港时间
                    if (shipObj.arrivalTime) {
                        var arrivalTime = shipObj.arrivalTime ? moment(shipObj.arrivalTime).format(dateFormat) : '';
                        rec.setText({
                            fieldId: 'custrecord_swc_expected_arrival_time',
                            text: arrivalTime
                        });
                    }

                    let recId = rec.save();

                    result.data.id = recId;
                } else {
                    result.msg = "error" + ",无数据"
                }
            } catch (e) {
                result.msg = "error" + e.message;
            }

            return JSON.stringify(result);
        }

        /**
         * Defines the function that is executed when a DELETE request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters are passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const doDelete = (requestParams) => {

        }

        return { get, put, post, delete: doDelete }

    });