/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record','N/search','../common/SWC_CONFIG_DATA','N/url','N/https'],
    (record,search,SWC_CONFIG_DATA ,url ,https) => {
        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            if (scriptContext.type == 'create') {
                var curRec = scriptContext.newRecord;
                var createId = curRec.id;
                var createType = curRec.type;
                log.error('error',createId);
                var orderType = curRec.getValue('ordertype');
                var purId = curRec.getValue('createdfrom');

                if (purId && orderType == "PurchOrd") {
                    var createRec = record.load({
                        type: createType,
                        id: createId,
                        isDynamic: true
                    });

                    var flag = createRec.getValue({fieldId: 'custbody_swc_fulfillment_flag'});
                    if (!flag) {
                        var entity = createRec.getValue({fieldId: 'entity'});
                        var entityRec = record.load({
                            type: 'vendor',
                            id: entity
                        });
                        var account = entityRec.getValue({
                            fieldId: 'payablesaccount'
                        });
                        if (account) {
                            const createPoResult = https.requestSuitelet({
                                scriptId: 'customscript_swc_sl_bill_automaticcreate',
                                deploymentId: 'customdeploy_swc_sl_bill_automaticcreate',
                                method: https.Method.POST,
                                body: JSON.stringify({
                                    purId: purId,
                                    account: account
                                }),
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });

                            let data = createPoResult.body && JSON.parse(createPoResult.body);
                            log.error('接口1返回数据', data);

                            if (data.code == 500) {
                                createRec.setValue({
                                    fieldId: 'custbody_swc_bill_automatic_error',
                                    value: data.msg
                                })
                            }
                            log.error('createPoResult', createPoResult);
                        } else {
                            createRec.setValue({
                                fieldId: 'custbody_swc_bill_automatic_error',
                                value: '未填写默认应付账款科目'
                            })
                        }
                    }
                }
            }
        }

        return {afterSubmit}

    });