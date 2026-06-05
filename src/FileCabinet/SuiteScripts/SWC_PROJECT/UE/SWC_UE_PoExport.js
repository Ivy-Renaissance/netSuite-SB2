/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget','N/record','N/redirect',"N/error","N/search",'N/url','N/https' ],
    /**
     * @param {serverWidget} serverWidget
     * @param {record} record
     */
    function(serverWidget,record,redirect,error,search,url,https) {

            /**
             * @appliedtorecord recordType
             *
             * @param {Object} scriptContext
             * @param {Record} scriptContext.newRecord - New record
             * @param {string} scriptContext.type - Trigger type
             * @param {Form} scriptContext.form - Current form
             * @returns {Void}  
             */
            function beforeLoad(scriptContext) {
                if(scriptContext.type=="view"){
                    scriptContext.form.addButton({
                        id: 'custpage_print_excel',
                        label: '采购合同打印',
                        functionName: 'exportExcel'
                    });
                    scriptContext.form.clientScriptModulePath = "../CS/SWC_CS_PoExport.js";
                }

            }


            // const afterSubmit = (scriptContext) => {
            //
            // }

            return {
                beforeLoad: beforeLoad,
                // afterSubmit: afterSubmit
            };
    });
