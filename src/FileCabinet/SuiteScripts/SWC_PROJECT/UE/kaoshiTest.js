/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/error', 'N/search'],
    /**
 * @param{error} error
 * @param{search} search
 */
    (error, search) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            var soRec = context.newRecord;

            if (
                context.type !== context.UserEventType.CREATE &&
                context.type !== context.UserEventType.EDIT
            ) {
                return;
            }

            var orderTotal = Number(soRec.getValue({
                fieldId: 'total'
            })) || 0;

            var customerRec = record.load({
                type: record.Type.CUSTOMER,
                id: customerId
            });

            var creditLimit = Number(customerRec.getValue({
                fieldId: 'creditlimit'
            })) || 0;

            var balance = Number(customerRec.getValue({
                fieldId: 'balance'
            })) || 0;

            var availableCredit = creditLimit - balance;

            log.debug(availableCredit)

            throw error.create({
                name: 'INSUFFICIENT_CREDIT_LIMIT',
                message:
                    '客户信用额度不足，无法保存销售订单。\n' +
                    '信用额度：' + creditLimit + '\n' +
                    '当前余额：' + balance + '\n' +
                    '可用额度：' + availableCredit + '\n' +
                    '订单金额：' + orderTotal,
                notifyOff: false
            });
            // if (orderTotal > availableCredit) {
            // }
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
