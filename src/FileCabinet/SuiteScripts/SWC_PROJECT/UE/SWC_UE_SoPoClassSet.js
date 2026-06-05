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
                let type = newRecord.type;
                let id = newRecord.id;

                try {
                    let lineObj = searchSoPo(type,id);
                    log.audit('lineObj',lineObj);
                    let itemObj = lineObj.itemObj;
                    let itemData = lineObj.itemData;

                    if (itemData.length > 0) {
                        let rec = record.load({
                            type: type,
                            id: id,
                            isDynamic: true
                        });
                        let sub = rec.getValue({
                            fieldId: 'subsidiary'
                        });

                        let classObj = searchClass(itemData,itemObj,sub);
                        log.audit('classObj',classObj);


                        let lineCount = rec.getLineCount({
                            sublistId: 'item'
                        });
                        log.audit('lineCount',lineCount);
                        if (lineCount > 0) {
                            for (let i = 0;i < lineCount;i++) {
                                rec.selectLine({
                                    sublistId: 'item',
                                    line: i
                                });
                                let item = rec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item'
                                });
                                let classId = rec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'class'
                                });
                                log.audit('classId',classId);
                                if (!classId && (item in classObj)) {
                                    rec.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'class',
                                        value: classObj[item]
                                    });
                                }
                                rec.commitLine({
                                    sublistId: 'item'
                                });
                            }
                        }

                        let recId = rec.save();
                        log.audit('recId',recId);
                    }

                } catch (e) {
                    log.audit('error',e.message);
                }
            }
        }

        function searchSoPo(type,id) {
            if (type == 'salesorder') {
                type = 'SalesOrd';
            } else {
                type = 'PurchOrd';
            }

            const transactionSearchObj = search.create({
                type: "transaction",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof",type],
                        "AND",
                        ["internalid","anyof",id],
                        "AND",
                        ["mainline","is","F"],
                        "AND",
                        ["taxline","is","F"],
                        "AND",
                        ["class","anyof","@NONE@"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "item",
                            summary: "GROUP",
                            label: "货品"
                        }),
                        search.createColumn({
                            name: "itemid",
                            join: "item",
                            summary: "GROUP",
                            label: "名称"
                        })
                    ]
            });

            let results = getAllResults(transactionSearchObj);

            let obj = {};
            let itemObj = {};
            let itemData = [];
            for (let i = 0; i < results.length;i++) {
                let result = results[i];
                let itemId = result.getValue({
                    name: "item",
                    summary: "GROUP",
                    label: "货品"
                })
                let itemName = result.getValue({
                    name: "itemid",
                    join: "item",
                    summary: "GROUP",
                    label: "名称"
                });
                itemObj[itemName] = itemId;
                itemData.push(itemName);
            }

            obj.itemObj = itemObj;
            obj.itemData = itemData;

            return obj;
        }

        function searchClass(itemData,itemObj,sub) {

            var filter = [];
            if (itemData.length) {

                for (let i = 0;i < itemData.length;i++) {
                    filter.push(["name", "startswith", itemData[i]]);
                    if (i != itemData.length - 1) {
                        filter.push('AND');
                    }
                }

                const classificationSearchObj = search.create({
                    type: "classification",
                    filters:
                    [
                        ["subsidiary", "anyof", sub],
                        'AND',
                        filter
                    ],
                    columns:
                        [
                            search.createColumn({name: "name", label: "名称"}),
                            search.createColumn({name: "internalid", label: "内部 ID"})
                        ]
                });

                let results = getAllResults(classificationSearchObj);

                let obj = {};

                for (let i = 0; i < results.length;i++) {
                    let result = results[i];
                    let name = result.getValue({name: "name", label: "名称"});
                    let id = result.getValue({name: "internalid", label: "内部 ID"});

                    if (name in itemObj) {
                        obj[itemObj[name]] = id;
                    }
                }

                return obj
            }
        }

        /**
         * 检索共通方法
         * @param mySearch
         * @returns {*[]}
         */
        function getAllResults(mySearch) {
            var resultSet = mySearch.run();
            var resultArr = [];
            var start = 0;
            var step = 1000;
            var results = resultSet.getRange({
                start: start,
                end: step
            });
            while (results && results.length > 0) {
                resultArr = resultArr.concat(results);
                start = Number(start) + Number(step);
                results = resultSet.getRange({
                    start: start,
                    end: Number(start) + Number(step)
                });
            }
            return resultArr;
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
