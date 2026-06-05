/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget','N/runtime','N/search','N/url','N/record','N/url','N/https',],
    /**
     * @param {record} record
     * @param {search} search
     * @param {redirect} redirect
     * @param {https} https
     * @param {url} url
     * @param {runtime} runtime
     * @param {serverWidget} serverWidget
     */
    function(serverWidget,runtime,search,url,record,url,https) {

            /**
             * @appliedtorecord recordType
             *
             * @param {Object} scriptContext
             * @param {Record} scriptContext.newRecord - New record
             * @param {string} scriptContext.type - Trigger type
             */
            function beforeLoad(scriptContext) {
                if(scriptContext.type=="view"){

                        var toB= scriptContext.newRecord.getValue({fieldId:'custbody_swc_2b_so'})
                        var custbody_swc_advancerep_link= scriptContext.newRecord.getValue({fieldId:'custbody_swc_advancerep_link'})
                        log.audit('custbody_swc_advancerep_link',custbody_swc_advancerep_link)
                        var orderstatus= scriptContext.newRecord.getValue({fieldId:'orderstatus'})

                        var recepstatus= scriptContext.newRecord.getValue({fieldId:'custbody_swc_advancerecep_status'})//预收款状态

                        
                        if(toB&&orderstatus=='B'&&recepstatus!=2){
                                scriptContext.form.addButton({
                                        id: 'custpage_tobpayment',
                                        label: '预收款申请-2B',
                                        functionName: 'tobpayment'
                                });
                        }
                        scriptContext.form.clientScriptModulePath = "SuiteScripts/SWC_PROJECT/CS/SWC_CS_TobCusPaymentButton.js";
                }

            }



            return {
                    beforeLoad: beforeLoad,
            };

    });
