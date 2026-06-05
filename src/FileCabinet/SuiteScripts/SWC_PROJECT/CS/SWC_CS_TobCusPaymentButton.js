/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(["N/search",'N/currentRecord',"N/url",'N/https','N/record','N/format', '../common/SWC_CONFIG_DATA',],
    function(search,currentRecord,url,https,record,format,SWC_CONFIG_DATA) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         * @since 2015.2
         */

        function pageInit(scriptContext) {

        }

        function tobpayment() {
            let id = currentRecord.get().id;
            window.open(`https://${SWC_CONFIG_DATA.configData().ACCOUNT_ID}.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=${SWC_CONFIG_DATA.configData().S_CUSTOMRECORD_YSKSQD}&cf=-1590&soRecId=${id}&whence=`);
        }

        return {
            pageInit: pageInit,
            tobpayment: tobpayment,
        };

    });