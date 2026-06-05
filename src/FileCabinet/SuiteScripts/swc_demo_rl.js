/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define([],

    () => {
        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const get = (requestParams) => {
            log.debug('get requestParams', requestParams)
            return {"basec64":"dfdfsdf"};
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
            log.debug('post requestBody', requestBody)
            var resutl;
            switch (requestBody.so_act) {
                case 'CreateFulfillmentOrder':
                    resutl = CreateFulfillmentOrder(requestBody.so_id);
                    break;
                case 'CancelFulfillmentOrder':
                    resutl = CancelFulfillmentOrder(requestBody.so_id);
                    break;
                case 'CreateFulfillmentOrder11':
                    resutl = {
                        hh: 'hh'
                    };
                    break;
            }
            return resutl;
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
        function CreateFulfillmentOrder(so_id){
            var result ={};
        	result.code = 'Failure';
        	result.message = 'Please select an Amazon Account first!';

            // result.code = 'Success';
        	// result.message = '创建成功';

            return result
        }
        function CancelFulfillmentOrder(so_id){
            return {

            }
        }

        return { get, put, post, delete: doDelete }

    });
