/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record'],

    (record) => {
        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const get = (requestParams) => {
            //查询
            log.debug({
                title: 'get',
                details: JSON.stringify(requestParams),
            });
            var objRecord = record.load({
                type: requestParams.recordType,
                id: requestParams.id,
                isDynamic: true
            });
            return objRecord;
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
            //修改
            var id = record.submitFields({
                type: record.Type.CUSTOMER,
                id: 133,
                values: {
                    comments: '修改comments'

                },

                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            return JSON.stringify({
                id: id,
                message: '修改成功'
            });


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
            //增加
            log.debug({
                title: 'post',
                details: JSON.stringify(requestBody),
            });
            var objRecord = record.create({
                type: requestBody.recordType,
            });
            objRecord.setValue({
                fieldId: 'companyname',
                value: requestBody.name
            });
            objRecord.setValue({
                fieldId: 'subsidiary',
                value: requestBody.subsidiary
            });
            var recordId = objRecord.save();
            return JSON.stringify({
                id: recordId,
                message: '创建成功'
            });


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
            log.debug({
                title: 'doDelete',
                details: JSON.stringify(requestParams),
            });

            var recordId = record.delete({
                type: requestParams.recordType,
                id: requestParams.id
            });
            return JSON.stringify({
                id: recordId,
                message: '删除成功'
            });

        }

        return { get, put, post, delete: doDelete  }

    });
