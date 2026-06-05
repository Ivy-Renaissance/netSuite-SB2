/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/runtime'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search, runtime) => {
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
            const userInfo = runtime.getCurrentUser()
            // 仅在查看或编辑模式下添加按钮
            if ((scriptContext.type === "view" || scriptContext.type === "edit") && userInfo.name === '袁毅') {
                var form = scriptContext.form;
                form.addButton({
                    id: 'custpage_create_advance',
                    label: '测试按钮',
                    functionName: 'createAdvance'
                });
                form.clientScriptModulePath = './clay_test_cs'; // 替换为你的客户端脚本路径
                // var rec = scriptContext.newRecord;
                // var state = rec.getValue('custrecord_swc_advancepay_state');
                // var pre = rec.getValue('custrecord_swc_advancepay_vprep_main');
                // log.audit('state ',state);
                // if (state == 1 && !pre) {
                //     // 添加一个按钮到表单

                //     // 同时，我们也可以添加一个客户端脚本到表单
                //     form.clientScriptModulePath = '../CS/SWC_CS_AdvanceCreate'; // 替换为你的客户端脚本路径
                // }
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

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
