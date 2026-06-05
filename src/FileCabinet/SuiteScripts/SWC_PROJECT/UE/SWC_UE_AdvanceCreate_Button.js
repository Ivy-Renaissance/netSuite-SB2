/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search','../common/SWC_CONFIG_DATA', 'N/runtime'],
    (record, search,SWC_CONFIG_DATA,runtime) => {
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
            // 仅在查看或编辑模式下添加按钮
            if (scriptContext.type === "view"|| scriptContext.type === "edit") {
                var form = scriptContext.form;
                var rec = scriptContext.newRecord;
                var state = rec.getValue('custrecord_swc_advancepay_state');
                var pre = rec.getValue('custrecord_swc_advancepay_vprep_main');
                var userObj = runtime.getCurrentUser();
                if (state == SWC_CONFIG_DATA.configData().s_pr_status_ypz && !pre && (userObj.role == SWC_CONFIG_DATA.configData().s_role_gly || userObj.role == SWC_CONFIG_DATA.configData().s_role_xlcn)) {
                    // 添加一个按钮到表单
                    form.addButton({
                        id: 'custpage_create_advance',
                        label: '生成预付款单',
                        functionName: 'createAdvance'
                    });

                    // 同时，我们也可以添加一个客户端脚本到表单
                    form.clientScriptModulePath = '../CS/SWC_CS_AdvanceCreate'; // 替换为你的客户端脚本路径
                }
            }
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

        return {beforeLoad, beforeSubmit, afterSubmit}

    });