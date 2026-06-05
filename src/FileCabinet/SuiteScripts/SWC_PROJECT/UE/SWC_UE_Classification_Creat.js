/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
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
            if (scriptContext.type == 'create' || scriptContext.type == 'edit') {
                var newRecord = scriptContext.newRecord;
                //获取已创建货品的名称
                var itemName = newRecord.getValue({fieldId: 'itemid'}) || '';
                var itemSubsidiary = newRecord.getValue({fieldId: 'subsidiary'}) || '';
                var itemSubFlag = newRecord.getValue({fieldId: 'includechildren'}) || '';
                var id = newRecord.id;
                log.audit('itemSubFlag',itemSubFlag);
                log.audit('itemName',itemName);
                log.audit('货品ID',id);

                //查找是否有重复名称的类别
                var classId = checkExistingRecord(id);
                log.audit('classId',classId);
                if (classId) {
                    log.error('已有该货品');
                    record.submitFields({
                        type: 'classification',
                        id: classId,
                        values: {
                            name: itemName,
                            includechildren: itemSubFlag,
                            subsidiary: itemSubsidiary
                        },
                    });
                } else {
                    createNewRecord(itemName,itemSubsidiary,itemSubFlag,id);
                }
            }
        }

        function checkExistingRecord(id) {
            try {
                const searchObj = search.create({
                    type: 'classification',
                    filters: [
                        ['custrecord_swc_classitem', 'anyof', id]
                    ],
                    columns: [
                        search.createColumn({name: 'internalid'})
                    ]
                });

                const results = searchObj.run().getRange({start: 0, end: 1});
                if (results && results.length > 0) {
                    return results[0].id;
                }
                return null;
            } catch (e) {
                log.error('检查记录存在时出错', e);
                return null;
            }
        }



        function createNewRecord(itemName,itemSubsidiary,itemSubFlag,id) {
            var rec = record.create({
                type: 'classification',
                isDynamic: true
            });

            //名称
            rec.setValue({
                fieldId: 'name',
                value: itemName
            });
            //子公司
            rec.setValue({
                fieldId: 'subsidiary',
                value: itemSubsidiary
            });
            //关联货品
            rec.setValue({
                fieldId: 'custrecord_swc_classitem',
                value: id
            });
            //包含状态
            if (itemSubFlag) {
                rec.setValue({
                    fieldId: 'includechildren',
                    value: true
                });
            } else {
                rec.setValue({
                    fieldId: 'includechildren',
                    value: false
                });
            }

            var recId = rec.save();

            log.audit('recId',recId);
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
