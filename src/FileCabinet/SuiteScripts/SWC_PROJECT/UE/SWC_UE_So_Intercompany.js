/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/runtime', 'N/search','../common/MatchTool','../common/SWC_CONFIG_DATA'],
    (record, runtime, search,MatchTool,SWC_CONFIG_DATA) => {
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
            if (scriptContext.type == 'create') {
                var rec = scriptContext.newRecord;
                //判断是否为 公司间
                var ifGsj = rec.getValue({fieldId: 'intercotransaction'});

                if (ifGsj) {

                    var soSubWay,entitySubWay = 0;
                    var soSub = rec.getValue({fieldId: 'subsidiary'});
                    if (soSub) {
                        var soSubRec = record.load({
                            type: 'subsidiary',
                            id: soSub
                        });
                        soSubWay = soSubRec.getValue({
                            fieldId: 'custrecord_swc_subway_001_',
                        });
                    }
                    var entity = rec.getValue({fieldId: 'entity'});
                    if (entity) {
                        var entityRec = record.load({
                            type: 'customer',
                            id: entity
                        });
                        var entitySub = entityRec.getValue({
                            fieldId: 'representingsubsidiary',
                        });
                        if (entitySub) {
                            var entitySubRec = record.load({
                                type: 'subsidiary',
                                id: entitySub
                            });
                            entitySubWay = entitySubRec.getValue({
                                fieldId: 'custrecord_swc_subway_001_',
                            });
                        }
                    }

                    if (soSubWay == SWC_CONFIG_DATA.configData().s_subway_gn && entitySubWay == SWC_CONFIG_DATA.configData().s_subway_gw) {

                        var lineCount = rec.getLineCount({sublistId: 'item'});
                        log.audit('lineCount', lineCount);
                        if (lineCount) {
                            let itemData = [];
                            for (let i = 0; i < lineCount; i++) {
                                var item = rec.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    line: i
                                });
                                if (itemData.indexOf(item) == -1)
                                    itemData.push(item);
                            }
                            log.audit('itemData', itemData);

                            //收获前获取货品 到岸成本相关数据
                            var taxCodeObj = getTaxCodeObj();
                            var itemObj = getItemObj(itemData, taxCodeObj);
                            log.audit('itemObj', itemObj);

                            //处理金额
                            for (let i = 0; i < lineCount; i++) {
                                var irItem = rec.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    line: i
                                });
                                var returnTax = 0;
                                var saleTex = 0;
                                var taxCode;
                                if (irItem in itemObj) {
                                    returnTax = Number(convertPercentToDecimal(itemObj[irItem].rate)) || 0;
                                    saleTex = Number(convertPercentToDecimal(itemObj[irItem].tax)) || 0;
                                    taxCode = itemObj[irItem].taxcode
                                }
                                if (saleTex == 0) {
                                    continue;
                                }
                                log.audit('returnTax', returnTax);
                                log.audit('saleTex', saleTex);
                                var tax = saleTex - returnTax;//税
                                log.audit('tax', tax);

                                var noRate = rec.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'rate',
                                    line: i
                                });

                                var quantity = rec.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    line: i
                                });

                                var nowRate = MatchTool.divN(noRate, (1 + Number(tax)));
                                log.audit('nowRate', nowRate);
                                var taxAmount = (noRate - nowRate) * quantity;

                                rec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'rate',
                                    value: nowRate,
                                    line: i
                                });

                                if (returnTax) {
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'tax1amt',
                                        value: taxAmount,
                                        line: i
                                    });
                                } else {
                                    if (taxCode) {
                                        rec.setSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'taxcode',
                                            value: taxCode,
                                            line: i
                                        });
                                    }
                                }
                                // rec.commitLine({sublistId: 'item'});
                            }
                        }
                    }
                }
            }
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

        function getItemObj(items,taxCodeObj) {
            const itemSearchObj = search.create({
                type: "item",
                filters:
                    [
                        ["internalid","anyof",items],
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "custitem_swc_tax_refund_rate1", label: "退税率1"}),
                        search.createColumn({name: "taxschedule", label: "税务计划"})
                    ]
            });

            var obj = {};
            var taxData = [];
            itemSearchObj.run().each(function(result){
                var tax = result.getValue({name: "taxschedule", label: "税务计划"});
                if (taxData.indexOf(tax) == -1 && tax)
                    taxData.push(tax);
                obj[result.id] = {
                    rate: result.getValue({name: "custitem_swc_tax_refund_rate1", label: "退税率1"}),
                    tax: tax,
                    taxcode: 0
                }
                return true;
            });

            var scheduleObj = {};

            if (taxData.length > 0) {
                for (let i = 0;i < taxData.length;i++) {
                    var taxRec = record.load({
                        type: 'taxschedule',
                        id: taxData[i],
                        isDynamic: true
                    });
                    var taxCode = taxRec.getSublistValue({
                        sublistId: 'nexuses',
                        fieldId: 'salestaxcode',
                        line: 0
                    });
                    if (taxCode in taxCodeObj) {
                        scheduleObj[taxData[i]] = {
                            tax: taxCodeObj[taxCode],
                            taxCode: taxCode
                        }
                        // scheduleObj[taxData[i]] = taxCodeObj[taxCode];
                    } else {
                        scheduleObj[taxData[i]] = {
                            tax: 0,
                            taxCode: taxCode
                        }
                        // scheduleObj[taxData[i]] = 0;
                    }
                }
            }

            log.audit('obj',obj);
            log.audit('scheduleObj',scheduleObj);
            for (let key in obj) {
                if (obj[key].tax in scheduleObj) {
                    obj[key].taxcode = scheduleObj[obj[key].tax].taxCode;
                    obj[key].tax = scheduleObj[obj[key].tax].tax;
                }
            }

            return obj
        }

        function getTaxCodeObj() {
            const salestaxitemSearchObj = search.create({
                type: "salestaxitem",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({name: "rate", label: "税率"}),
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });

            var obj = {};
            salestaxitemSearchObj.run().each(function(result){
                obj[result.id] = result.getValue({name: "rate", label: "税率"});
                // .run().each has a limit of 4,000 results
                return true;
            });

            return obj
        }

        function convertPercentToDecimal(value) {
            if (typeof value === 'string' && value.trim().endsWith('%')) {
                // 移除百分号，解析为数字，除以100
                var num = parseFloat(value.replace('%', ''));
                if (!isNaN(num)) {
                    return num / 100;
                }
            }
            // 如果是数字，直接返回；如果是其他字符串，尝试parseFloat
            return parseFloat(value) || 0; // 或者直接返回value？但为了安全，返回数字或0
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });