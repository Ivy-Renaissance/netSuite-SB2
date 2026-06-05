/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/runtime', 'N/search', 'N/url', 'N/record', 'N/url', 'N/https', '../common/SWC_CONFIG_DATA'],
    /**
     * @param {record} record
     * @param {search} search
     * @param {redirect} redirect
     * @param {https} https
     * @param {url} url
     * @param {runtime} runtime
     * @param {serverWidget} serverWidget
     */
    function (serverWidget, runtime, search, url, record, url, https, SWC_CONFIG_DATA) {
        /**
         * @appliedtorecord recordType
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         */
        function beforeLoad(scriptContext) {
            if (scriptContext.type == "create") {
                var parameters = scriptContext.request.parameters;
                log.audit('parameters', parameters)
                if (parameters.soRecId) {
                    var soRecord = record.load({
                        type: record.Type.SALES_ORDER,
                        id: parameters.soRecId,
                    });
                    var subsidary = soRecord.getValue({ fieldId: 'subsidiary' })
                    var customer = soRecord.getValue({ fieldId: 'entity' })
                    var currency = soRecord.getValue({ fieldId: 'currency' })
                    var amount = soRecord.getValue({ fieldId: 'custbody_swc_advancerep_amount' }) || 0
                    var total = soRecord.getValue({ fieldId: 'total' })
                    var memo = soRecord.getValue({ fieldId: 'memo' })
                    var account = SWC_CONFIG_DATA.configData().S_ACCOUNT_YSZK//566 //2203 预收账款
                    var resTotal = total - amount
                    var payRecord = scriptContext.newRecord
                    payRecord.setValue({ fieldId: 'custrecord_swc_advancerep_subsidary', value: subsidary })
                    payRecord.setValue({ fieldId: 'custrecord_swc_advancerep_so', value: parameters.soRecId })
                    payRecord.setValue({ fieldId: 'custrecord_swc_advancerep_customer', value: customer })
                    payRecord.setValue({ fieldId: 'custrecord_swc_advancerep_currency', value: currency })
                    payRecord.setValue({ fieldId: 'custrecord_swc_advancerep_total_amount', value: resTotal })
                    payRecord.setValue({ fieldId: 'custrecord_swc_advanrep_account', value: account })
                    payRecord.setValue({ fieldId: 'custrecord_swc_advancerep_memo', value: memo })
                }
            }
        }

        const afterSubmit = (scriptContext) => {
            try {
                var payRec = record.load({ type: "customrecord_swc_advance_customerpayment", id: scriptContext.newRecord.id, isDynamic: true, })
                var status = payRec.getValue({ fieldId: 'custrecord_swc_advancerep_state' })
                var payment = payRec.getValue({ fieldId: 'custrecord_swc_advancerep_total_amount' })
                log.audit('payment', payment)
                var depositRec, depositId, salesID;
                salesID = payRec.getValue({ fieldId: 'custrecord_swc_advancerep_so' })
                if (status == 3) {
                    try {
                        depositRec = record.create({ type: "customerdeposit", isDynamic: true })
                        depositRec.setValue({ fieldId: 'customer', value: payRec.getValue({ fieldId: 'custrecord_swc_advancerep_customer' }) })
                        depositRec.setValue({ fieldId: 'subsidiary', value: payRec.getValue({ fieldId: 'custrecord_swc_advancerep_subsidary' }) })
                        depositRec.setValue({ fieldId: 'trandate', value: payRec.getValue({ fieldId: 'created' }) })
                        depositRec.setValue({ fieldId: 'currency', value: payRec.getValue({ fieldId: 'custrecord_swc_advancerep_currency' }) })
                        depositRec.setValue({ fieldId: 'undepfunds', value: "T" })
                        depositRec.setValue({ fieldId: 'custbody_cseg_cn_cfi', value: payRec.getValue({ fieldId: 'custrecord_swc_cashflow_receive' }) })

                        depositRec.setValue({ fieldId: 'custbody_swc_davancerep_link', value: scriptContext.newRecord.id })
                        depositRec.setValue({ fieldId: 'memo', value: payRec.getValue({ fieldId: 'custrecord_swc_advancerep_memo' }) })
                        depositRec.setValue({ fieldId: 'salesorder', value: salesID })
                        depositRec.setValue({ fieldId: 'payment', value: payment })
                        depositId = depositRec.save()
                    } catch (e) {
                        log.error('客户存款生成失败', e)
                        payRec.setValue({ fieldId: 'custrecord_swc_advancerep_mistakememo', value: '客户存款生成失败：' + e.message })
                    }

                    payRec.setValue({ fieldId: 'custrecord_swc_advancerep_cprep_main', value: depositId })
                    payRec.save()

                }
                var perimission = payRec.getValue({ fieldId: 'custrecord_swc_shipout_perimission' })//允许发货
                log.audit('perimission', perimission)
                // if(status==7||status==8||!perimission) return //已作废 已拒绝 不反写订单金额和状态
                var soRec = record.load({
                    type: record.Type.SALES_ORDER,
                    id: salesID,
                });
                var linkLIst = soRec.getValue({ fieldId: 'custbody_swc_advancerep_link' }) || []
                log.audit('linkLIst', linkLIst)
                linkLIst.push(scriptContext.newRecord.id)

                var soTotal = soRec.getValue({ fieldId: 'total' })
                // var oldAmount = soRec.getValue({fieldId:'custbody_swc_advancerep_amount'})||0
                // var payamount = payRec.getValue({fieldId:'custrecord_swc_advancerep_total_amount'})||0
                // var newAmount = oldAmount + payamount
                var patObj = searchForPayment(salesID)
                soRec.setValue({ fieldId: 'custbody_swc_advancerep_link', value: patObj.payList })
                soRec.setValue({ fieldId: 'custbody_swc_advancerep_amount', value: patObj.total })
                if (soTotal == patObj.total) soRec.setValue({ fieldId: 'custbody_swc_advancerecep_status', value: 2 })
                if (soTotal > patObj.total && patObj.total > 0) soRec.setValue({ fieldId: 'custbody_swc_advancerecep_status', value: 1 })
                if (patObj.payList.length == 0) soRec.setValue({ fieldId: 'custbody_swc_advancerecep_status', value: '' })
                soRec.save()
            } catch (e) {
                log.error('error', e)
                payRec.setValue({ fieldId: 'custrecord_swc_advancerep_mistakememo', value: '客户存款生成失败：' + e.message })
                payRec.save()
            }

        }

        function searchForPayment(soId) {
            var obj = {
                total: 0,
                payList: []
            }
            const customrecord_swc_advance_customerpaymentSearchObj = search.create({
                type: "customrecord_swc_advance_customerpayment",
                filters:
                    [
                        ["custrecord_swc_advancerep_so.internalid", "anyof", soId],
                        "AND",
                        ["custrecord_swc_advancerep_state", "noneof", "7", "8"],
                        "AND",
                        ["custrecord_swc_shipout_perimission", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custrecord_swc_advancerep_total_amount",
                            summary: "GROUP",
                            label: "预收款总金额"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_advancerep_state",
                            summary: "GROUP",
                            label: "审批状态"
                        }),
                        search.createColumn({
                            name: "custrecord_swc_shipout_perimission",
                            summary: "GROUP",
                            label: "允许发货"
                        }),

                        search.createColumn({
                            name: "internalid",
                            summary: "GROUP",
                            label: "内部ID"
                        })
                    ]
            });
            var searchResultCount = customrecord_swc_advance_customerpaymentSearchObj.runPaged().count;
            if (searchResultCount > 0) {
                customrecord_swc_advance_customerpaymentSearchObj.run().each(function (result) {
                    obj.total += parseFloat(result.getValue({ name: "custrecord_swc_advancerep_total_amount", summary: "GROUP", }));
                    obj.payList.push(result.getValue({ name: "internalid", summary: "GROUP", }));
                    return true;
                });
            }
            return obj
        }

        return {
            beforeLoad: beforeLoad,
            afterSubmit: afterSubmit,
        };
    });
