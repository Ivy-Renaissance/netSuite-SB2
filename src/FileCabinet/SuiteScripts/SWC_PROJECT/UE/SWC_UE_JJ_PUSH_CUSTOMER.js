/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @name SWC_UE_JJ_PUSH_CUSTOMER.js
 * @author ZJG
 * @description NS客户同步至积加
 */
define(['N/record', 'N/search', '../common/moment', '../common/interface', 'N/runtime', 'N/error'],

    function (record, search, moment, interface, runtime, error) {
        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        function beforeLoad(scriptContext) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {
            try {
                var developer_id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_custoemr_developer_id' });

                var newRecord = scriptContext.newRecord;
                var type = scriptContext.type;
                log.audit('type', type);
                log.audit('newRecordType', newRecord.type);

                if (type == 'delete') {

                } else {
                    //客户
                    newRecord = record.load({ type: newRecord.type, id: newRecord.id });
                    var auth = interface.JJDeveloperAccountAuth(developer_id);
                    log.audit('auth', auth);
                    var body = GetBody(newRecord);
                    log.audit('body', body);

                    var jj_customer_id = newRecord.getValue('custentity_swc_jj_customer_id');
                    var representingsubsidiary = newRecord.getValue('representingsubsidiary');
                    var ctype = newRecord.getValue('custentity_swc_ctype');
                    if (ctype == '2') {
                        if (!representingsubsidiary) {
                            if (!jj_customer_id) {
                                //创建接口
                                var path = '/middle/multiplatform/shopCustom/create';
                                var response_body = interface.JJHttpsResponse('post', path, auth, body);
                                log.audit('response_body_item', response_body);
                                if (response_body.code == '200') {
                                    newRecord.setValue({ fieldId: 'custentity_swc_jj_customer_id', value: response_body.data });
                                    newRecord.setValue({ fieldId: 'custentity_swc_jj_customer_error', value: '' });
                                    newRecord.save({ ignoreMandatoryFields: true });
                                } else {
                                    newRecord.setValue({ fieldId: 'custentity_swc_jj_customer_error', value: '创建同步失败:' + JSON.stringify(response_body.messages) });
                                    newRecord.save({ ignoreMandatoryFields: true });
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('afterSubmit error', err);
                var e = err.message ? err.message : err;
                log.audit('e', e);
                log.audit('1', newRecord.type);
                log.audit('2', newRecord.id);
                record.submitFields({
                    type: newRecord.type,
                    id: newRecord.id,
                    values: {
                        'custentity_swc_jj_customer_error': e
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });

            }
        }

        function GetBody(rec) {
            log.audit('GetBody', rec);
            var body = {};
            body.erpShopName = rec.getValue('entityid');
            body.remark = rec.getValue('comments');
            return body
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });
