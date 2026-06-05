/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search','../common/SWC_CONFIG_DATA'],
function(record, search,SWC_CONFIG_DATA) {
    
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
        console.log('初始');
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
        let curRec = scriptContext.currentRecord;
        var sublistId = scriptContext.sublistId;
        let fieldId = scriptContext.fieldId;

        if (fieldId == "entity") {

            let entity = curRec.getValue({fieldId: 'entity'});
            let tranDate = curRec.getValue({fieldId: 'trandate'});
            let terms = getVendorTerms(entity);
            let createId = curRec.getValue({fieldId: 'itemrcpt'}) || '';
            let receipt = curRec.getValue({fieldId: 'custbody_swc_bill_create_receipt'});
            let recData = '';
            if (receipt && !createId) {
                createId = receipt;
            }
            if (createId) {
                recData = getReceiptData(createId);
                // SWC_CONFIG_DATA
                let dueDate = getDueDate(tranDate, terms, recData);
                console.log('dueDate', dueDate);
                curRec.setValue({
                    fieldId: 'duedate',
                    value: dueDate
                });
                curRec.setValue({
                    fieldId: 'custbody_swc_search_duedate',
                    value: dueDate
                });
            }

        }
    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {

    }

    function getReceiptData(receipt) {
        var itemreceiptSearchObj = search.create({
            type: "itemreceipt",
            settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
            filters:
                [
                    ["type","anyof","ItemRcpt"],
                    "AND",
                    ["mainline","is","T"],
                    "AND",
                    ["taxline","is","F"],
                    "AND",
                    ["internalid","anyof",receipt]
                ],
            columns:
                [
                    search.createColumn({name: "trandate", label: "日期"})
                ]
        });
        let recData = '';
        itemreceiptSearchObj.run().each(function(result){
            recData = result.getValue({name: "trandate", label: "日期"});
            return true;
        });

        return recData
    }

    function getVendorTerms(entity) {
        var vendorSearchObj = search.create({
            type: "vendor",
            filters:
                [
                    ["internalid","anyof",entity]
                ],
            columns:
                [
                    search.createColumn({name: "custentity_swc_payment_terms", label: "付款条件"})
                ]
        });
        var searchResultCount = vendorSearchObj.runPaged().count;
        log.debug("vendorSearchObj result count",searchResultCount);
        var terms = 0;
        vendorSearchObj.run().each(function(result){
            terms = result.getValue({name: "custentity_swc_payment_terms", label: "付款条件"});
            return true;
        });

        return terms
    }

    function getDueDate(tranDate,terms,recData) {
        let dueDate = tranDate;
        if (terms == SWC_CONFIG_DATA.configData().TERMS_1) {
            //30%定金，70%尾款到发货 0
            dueDate = tranDate;
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_9) {
            //次月月底结算 供应商的账单上，账期所属月，下个月月底
            dueDate = new Date(tranDate.getFullYear(), tranDate.getMonth() + 2, 0);
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_2) {
            //120天账期 120
            dueDate = new Date(tranDate);
            dueDate.setDate(dueDate.getDate() + 120);
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_10) {
            //次月15号结算 供应商的账单上，账期所属月，下个月15
            dueDate = new Date(tranDate.getFullYear(), tranDate.getMonth() + 1, 15);
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_11) {
            //次月20号结算 供应商的账单上，账期所属月，下个月20
            dueDate = new Date(tranDate.getFullYear(), tranDate.getMonth() + 1, 20);
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_3) {
            //出货前付全款 0
            dueDate = tranDate;
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_4) {
            //70天账期 70
            dueDate = new Date(tranDate);
            dueDate.setDate(dueDate.getDate() + 70);
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_5) {
            //90天账期 90
            dueDate = new Date(tranDate);
            dueDate.setDate(dueDate.getDate() + 90);
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_6) {
            //75天账期 75
            dueDate = new Date(tranDate);
            dueDate.setDate(dueDate.getDate() + 75);
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_12) {
            //30%定金，70%到港前支付 0
            dueDate = tranDate;
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_13) {
            //20%定金，80%到港前支付 0
            dueDate = tranDate;
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_7) {
            //60天账期 60
            dueDate = new Date(tranDate);
            dueDate.setDate(dueDate.getDate() + 60);
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_14) {
            //当月到港当月结 供应商的账单上，账期所属月，本月月底
            dueDate = new Date(tranDate.getFullYear(), tranDate.getMonth() + 1, 0);
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_15) {
            //预付30%，70%出货后30天结算 供应商的货品收据上，日期+30
            if (recData) {
                dueDate = new Date(tranDate);
                dueDate.setDate(recData.getDate() + 30);
            } else {
                alert('相关货品收据日期获取失败，请检查是否关联');
            }
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_8) {
            //55天账期 55
            dueDate = new Date(tranDate);
            dueDate.setDate(dueDate.getDate() + 55);
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_16) {
            //30%定金，发货后次月20号前支付70%尾款 供应商的货品收据上，账期所属月，下月20号
            if (recData) {
                dueDate = new Date(recData.getFullYear(), recData.getMonth() + 1, 20);
            } else {
                alert('相关货品收据日期获取失败，请检查是否关联');
            }
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_17) {
            //当月到港月底结算 供应商的账单上，账期所属月末
            dueDate = new Date(tranDate.getFullYear(), tranDate.getMonth() + 1, 0);
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_18) {
            //预充值 0
            dueDate = tranDate;
        } else if (terms == SWC_CONFIG_DATA.configData().TERMS_19) {
            //次月月结 供应商的账单上，账期所属月，下个月月底
            dueDate = new Date(tranDate.getFullYear(), tranDate.getMonth() + 2, 0);
        }

        return dueDate
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // sublistChanged: sublistChanged,
        // lineInit: lineInit,
        // validateField: validateField,
        // validateLine: validateLine,
        // validateInsert: validateInsert,
        // validateDelete: validateDelete,
        // saveRecord: saveRecord
    };
    
});
