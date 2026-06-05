/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 * @name SWC_SS_JJ_GET_TOKEN.js
 * @author ZJG
 * @description NS货品同步至OMS
 */
define(['../common/interface', 'N/format', 'N/record', 'N/runtime', 'N/search', 'N/encode', 'N/https'],

    function (interface, format, record, runtime, search, encode, https) {

        function execute(context) {
            try {
                var developer_id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_developer_id' });
                var auth = {};
                search.create({
                    type: 'customrecord_swc_jj_developer_account',
                    filters: [
                        { name: 'internalid', operator: 'anyof', values: developer_id },
                    ],
                    columns: [
                        { name: 'custrecord_swc_jj_da_appid' },
                        { name: 'custrecord_swc_jj_da_appkey' },
                        { name: 'custrecord_swc_jj_da_service_address' },
                    ]
                }).run().each(function (rec) {
                    auth.id = rec.id;
                    auth.appid = rec.getValue('custrecord_swc_jj_da_appid');
                    auth.appkey = rec.getValue('custrecord_swc_jj_da_appkey');
                    auth.service_address = rec.getValue('custrecord_swc_jj_da_service_address');
                    return true;
                });

                var reqData = {
                    appId: auth.appid,
                    appKey: auth.appkey,
                }
                log.audit('reqData', reqData);
                
                var url = auth.service_address + '/api_token';
                log.audit('GetToken url', url);
                var response = https.post({
                    url: url,
                    headers: {
                        'Content-Type': 'application/json;charset=utf-8',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(reqData)
                })
                log.audit('response', response)
                if (response.code == '200') {
                    var body = JSON.parse(response.body)
                    log.audit('response body', response.body);
                    if (body.code == '200') {
                        record.submitFields({
                            type: 'customrecord_swc_jj_developer_account',
                            id: auth.id,
                            values: {
                                custrecord_swc_jj_da_accesstoken: body.data.accessToken
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true,
                            }
                        });
                    }

                }

            } catch (error) {
                log.error('error', error);
            }

        }

        return {
            execute: execute
        }
    });
