
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @description 采购需求汇总表保存UE，汇总采购需求明细表上各个国家+仓库类型的需求总数到采购需求汇总表上
 */
define(['N/record', 'N/search'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search) => {
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
            try {
                if(scriptContext.type == 'delete') return;
                var curRec = scriptContext.newRecord;
                var rec = record.load({
                    type: curRec.type,
                    id: curRec.id,
                    isDynamic: true
                });
                // 选择...	CG-CA	custrecord_swc_pd_cg_ca	整数			是
                // 选择...	CG-US	custrecord_swc_pd_cg_us	整数			是
                // 选择...	3PL -DE	custrecord_swc_pd_3pl_de	整数			是
                // 选择...	3PL-UK	custrecord_swc_pd_3pl_uk	整数			是
                // 选择...	FBA-US	custrecord_swc_pd_fba_us	整数			是
                // 选择...	FBA-CA	custrecord_swc_pd_fba_ca	整数			否
                // 选择...	FBA-DE	custrecord_swc_pd_fba_de	整数			否
                // 选择...	FBA-UK	custrecord_swc_pd_fba_uk	整数			否
                // 选择...	FBA-FR	custrecord_swc_pd_fba_fr	整数			否
                // 选择...	Mano-FR	custrecord_swc_pd_mano_fr	整数			是
                //根据国家+仓库类型配置对应的字段：
                // 国家：1 US、2 CA、3 DE、4 UK、5 FR 
                // 仓库：1 3PL、 2 FBA、 3 CG、 4 Mano
                var fields = {
                    '2-3': "custrecord_swc_pd_cg_ca",
                    '1-3': "custrecord_swc_pd_cg_us",
                    '3-1': "custrecord_swc_pd_3pl_de",
                    '4-1': "custrecord_swc_pd_3pl_uk",
                    '1-2': "custrecord_swc_pd_fba_us",
                    '2-2': "custrecord_swc_pd_fba_ca",
                    '3-2': "custrecord_swc_pd_fba_de",
                    '4-2': "custrecord_swc_pd_fba_uk",
                    '5-2': "custrecord_swc_pd_fba_fr",
                    '5-4': "custrecord_swc_pd_mano_fr"
                }
                search.create({
                    type: 'customrecord_swc_purchase_plan_detail',
                    filters: [
                        ['custrecord_swc_ppd_purchase_plan', 'is', curRec.id],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        { name: 'custrecord_swc_ppd_country', summary: "GROUP" },//备货国家
                        { name: 'custrecord_swc_ppd_location_type', summary: "GROUP" },//仓库类型
                        { name: 'custrecord_swc_ppd_quantity', summary: "SUM" }//数量汇总
                    ]
                }).run().each(function (result) {
                    var country = result.getValue(result.columns[0]);
                    var location_type = result.getValue(result.columns[1]);
                    var qty = result.getValue(result.columns[2]);
                    //判断国家+仓库类型，给各个字段赋值
                    var field = fields[country + '-' + location_type];
                    if (field) {
                        rec.setValue({ fieldId: field, value: qty });
                    }

                    return true;
                });

                rec.save();
            } catch (error) {
                log.error('error',error)
            }

        }


        return { beforeLoad, beforeSubmit, afterSubmit }

    });
