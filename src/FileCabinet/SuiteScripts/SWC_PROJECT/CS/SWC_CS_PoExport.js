/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(["N/currentRecord", "N/url", "N/https", "N/search","N/record",],

    function( currentRecord, url, https, search, record,) {
        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */

        function pageInit(scriptContext) {

        }

        //导出方法
        function exportExcel() {
            let cur = currentRecord.get();
            let recordId = cur.id;
            console.log("recordId",recordId)
            var output = url.resolveScript({
                scriptId: "customscript_swc_sl_pokexport",
                deploymentId: "customdeploy_swc_sl_pokexport",
                params: {
                    // flag:'form',
                    recordId: recordId
                }
            })
            console.log("111",output)
            var a = document.createElement("a");                                                                                                                // 为了给xls文件命名，重新创建一个a元素
            a.href = output;                                                                                                                    // 给a元素设置 href属性
            a.download = "采购订单导出excel" + '.xls';                                                                                                                  // 给a元素设置下载名称
            a.click();
        }


        
        return {
            pageInit : pageInit,
            exportExcel : exportExcel,
        };
    });