/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record','N/search','../common/SWC_CONFIG_DATA'],
    (record,search,SWC_CONFIG_DATA ) => {
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
                var curRec = scriptContext.newRecord;
                var createId = curRec.id;
                var createType = curRec.type;

                log.audit('createType',createType);

                var purRec = record.load({
                    type: createType,
                    id: createId,
                    isDynamic: true,
                });
                let ifZQ = purRec.getValue({fieldId: 'custbody_swc_bill_term_flag'});//是否进行账期处理
                let JZData = purRec.getText({fieldId: 'duedate'});//截止日期
                let ITJZDate = purRec.getValue({fieldId: 'custbody_swc_search_duedate'});//截止日期 开发用
                let errorMsg = purRec.getValue({fieldId: 'custbody_swc_terms_error'});//账期-错误信息

                log.audit('处理前JZData',JZData);
                //判断是否已经进行过账期处理 区分人工创建/代码生成
                if (!ifZQ && !JZData) {
                    if (createType == 'vendorbill') {
                        let entity = purRec.getValue({fieldId: 'entity'});

                        //取账单上 付款条件（供应商付款条件为多选）
                        let terms = purRec.getValue({fieldId: 'custbody_swc_vendor_payment_terms'});//付款条件

                        var createdObj = getCreatedFrom(createId);

                        if (!terms) {
                            terms = createdObj.terms;
                            purRec.setValue({
                                fieldId: 'custbody_swc_vendor_payment_terms',
                                value: terms
                            });
                        }

                        log.audit('terms',terms);
                        //有来源的情况
                        if (createdObj.createdfrom) {
                            if (terms) {
                                //付款条件-规则配置表
                                var configObj;
                                configObj = searchConfig(terms);
                                log.audit('configObj',configObj);
                                var date = purRec.getValue({fieldId: configObj.config_filedId}) || ' ';
                                //判断参考日期是否为空
                                if (date) {
                                    let baseDate = new Date(date);
                                    // 1. 判断 config_adddays 是否为空
                                    // 注意：此处“为空”包括 undefined、null、空字符串；0 或 '0' 视为有值
                                    if (configObj.config_adddays !== undefined && configObj.config_adddays !== null && configObj.config_adddays !== '') {
                                        let days = parseInt(configObj.config_adddays, 10);
                                        log.audit('days',days);
                                        if (!isNaN(days)) {
                                            baseDate.setDate(baseDate.getDate() + days);
                                        }
                                        JZData = formatDate(baseDate);
                                    } else {
                                        // 2. config_adddays 为空，判断 config_months
                                        if (configObj.config_months) {
                                            let targetDate = new Date(baseDate);
                                            log.audit('targetDate1',targetDate);
                                            // config_months == 2 表示次月，否则（包括1或其他）视为本月
                                            if (configObj.config_months == 2) {
                                                targetDate.setMonth(targetDate.getMonth() + 1);
                                                log.audit('targetDate2',targetDate);
                                            }
                                            if (configObj.config_endflag) {
                                                // 取月底日期：当月最后一天
                                                targetDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
                                                log.audit('targetDate3',targetDate);
                                            } else {
                                                let day = configObj.config_day;
                                                if (day >= 1 && day <= 31) {
                                                    // 获取当月最大天数，避免超出范围
                                                    let maxDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
                                                    let setDay = Math.min(day, maxDay);
                                                    targetDate.setDate(setDay);
                                                }
                                            }
                                            JZData = formatDate(targetDate);
                                        } else {
                                            // config_months 也为空，结果也为空
                                            JZData = '';
                                            errorMsg = '付款条件-规则配置表';
                                        }
                                    }
                                } else {
                                    JZData = ''; // 如果参考日期为空，结果也为空
                                    errorMsg = '由业务手动补充参考日期/截至日期';
                                }
                            }
                        } else {
                            //无来源的情况赋值 单据日期
                            JZData = purRec.getText({fieldId: 'trandate'});
                        }
                    } else {
                        //为账单贷项时 单据日期
                        JZData = purRec.getText({fieldId: 'trandate'});
                    }

                    purRec.setText({
                        fieldId: 'duedate',
                        text: JZData
                    });
                    if (JZData) purRec.setValue({
                        fieldId: 'custbody_swc_bill_term_flag',
                        value: true
                    });
                }
                
                //赋值开发用账期
                if (JZData) {
                    purRec.setText({
                        fieldId: 'custbody_swc_search_duedate',
                        text: JZData
                    });
                }

                //反写错误信息
                if (errorMsg) purRec.setValue({
                    fieldId: 'custbody_swc_terms_error',
                    text: errorMsg
                });

                let purOrderId = purRec.save({ignoreMandatoryFields: true});
                log.audit('purOrderId', purOrderId);
            }
        }

        function getCreatedFrom(createId) {
            const vendorbillSearchObj = search.create({
                type: "vendorbill",
                settings:[{"name":"consolidationtype","value":"NONE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["type","anyof","VendBill"],
                        "AND",
                        ["mainline","is","T"],
                        "AND",
                        ["internalid","anyof",createId],
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "createdfrom", label: "创建自"}),
                        search.createColumn({
                            name: "custbody_swc_vendor_payment_terms",
                            join: "createdFrom",
                            label: "付款条件"
                        })
                    ]
            });
            var obj = {};
            vendorbillSearchObj.run().each(function(result){
                var id = result.getValue({name: "internalid", label: "内部 ID"});
                var createdfrom = result.getValue({name: "createdfrom", label: "创建自"}) || '';
                var terms = result.getValue({
                    name: "custbody_swc_vendor_payment_terms",
                    join: "createdFrom",
                    label: "付款条件"
                }) || '';

                obj = {
                    'createdfrom': createdfrom,
                    'terms': terms
                }
                return true;
            });

            return obj;
        }

        function searchConfig(terms) {
            //付款条件-规则配置表搜索
            const customrecord_swc_payterms_configSearchObj = search.create({
                type: "customrecord_swc_payterms_config",
                filters:
                    [
                        ["internalid","anyof",terms]
                    ],
                columns:
                    [
                        search.createColumn({name: "name", label: "名称"}),
                        search.createColumn({name: "custrecord_swc_payconfig_dateid", label: "参考日期ID"}),
                        search.createColumn({name: "custrecord_swc_payconfig_adddays", label: "参考日期-加几天"}),
                        search.createColumn({name: "custrecord_swc_payconfig_months", label: "本月/次月"}),
                        search.createColumn({name: "custrecord_swc_payconfig_day", label: "本月/次月-几号"}),
                        search.createColumn({name: "custrecord_swc_payconfig_endflag", label: "月底"})
                    ]
            });

            var obj = {};
            customrecord_swc_payterms_configSearchObj.run().each(function(result){
                var config_filedId = result.getValue({name: "custrecord_swc_payconfig_dateid", label: "参考日期ID"});
                var config_adddays = result.getValue({name: "custrecord_swc_payconfig_adddays", label: "参考日期-加几天"}) || '';
                var config_months = result.getValue({name: "custrecord_swc_payconfig_months", label: "本月/次月"}) || '';
                var config_day= result.getValue({name: "custrecord_swc_payconfig_day", label: "本月/次月-几号"}) || '';
                var config_endflag = result.getValue({name: "custrecord_swc_payconfig_endflag", label: "月底"});

                obj = {
                    'config_filedId': config_filedId,
                    'config_adddays': config_adddays,
                    'config_months': config_months,
                    'config_day': config_day,
                    'config_endflag': config_endflag,
                }
                return true;
            });

            return obj;
        }

        function formatDate(date) {
            if (!(date instanceof Date) || isNaN(date)) return '';
            let year = date.getFullYear();
            let month = date.getMonth() + 1;
            let day = date.getDate();
            return year + '-' + month + '-' + day;
        }

        return {afterSubmit}

    });