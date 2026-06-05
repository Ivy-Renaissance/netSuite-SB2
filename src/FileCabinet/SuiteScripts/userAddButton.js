/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
// 用户事件脚本自定义按钮脚本
define([],
    
    () => {
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
         // 添加按钮    
         const from = scriptContext.form;
         var entityId = scriptContext.newRecord.getValue('entityid');
         from.addButton({
            id: 'custpage_add_button',
            label: '小鹿添加按钮',
            functionName: `customButtonFunction("${entityId}","${scriptContext.type}")`
        });
          from.clientScriptModulePath='SuiteScripts/addButtonClient.js';

        }



        return {beforeLoad}

    });
