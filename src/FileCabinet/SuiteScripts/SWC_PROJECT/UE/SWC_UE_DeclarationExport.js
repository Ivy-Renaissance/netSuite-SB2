/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget','N/record',"N/search"],
    /**
     * @param {serverWidget} serverWidget
     * @param {record} record
     */
    function(serverWidget,record,search) {

        /**
         * @appliedtorecord recordType
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @returns {Void}
         */
        function beforeLoad(scriptContext) {
            if(scriptContext.type=="view" ){
                var recordId = scriptContext.newRecord.id;
                var isinactive =scriptContext.newRecord.getValue("isinactive");
                log.audit("是否是非活动",isinactive);
                if(!isinactive) {
                    // 屏幕遮罩
                    // var hidden_field = scriptContext.form.addField({ id: 'custpage_hiddeninfo', type: serverWidget.FieldType.INLINEHTML, label: '屏幕遮罩' });
                    // hidden_field.defaultValue = '<div id="timeoutblocker" style="position: fixed;display:none; z-index: 10000; top: 0px; left: 0px; height: 100%; width: 100%; margin: 5px 0px; background-color: rgb(155, 155, 155); opacity: 0.6;"><span style="width:100%;height:100%;line-height:700px;text-align:center;display:none;font-weight: bold; color: red">' + "数据处理中，请稍后" + '</span></div>';
                    scriptContext.form.addButton({
                        id: 'custpage_print_declaration_excel',
                        label: '报关单打印',
                        functionName: 'declarationExportExcel("' + recordId + '")'
                    });

                    scriptContext.form.addButton({
                        id: 'custpage_print_declaration_void',
                        label: '作废',
                        functionName: 'declarationVoid("' + recordId + '")'
                    });

                    scriptContext.form.clientScriptModulePath = "../CS/SWC_CS_DeclarationExport.js";
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
            var nRecord = scriptContext.newRecord;
            var recordId; // 在 try 外部声明

            try {
                if(scriptContext.type === 'delete') {
                    recordId = nRecord.id; 
                    log.audit('报关单ID', recordId)

                    //先清空关联的发运单
                    var planOrderData = planOrderSearch(recordId);
                    log.audit("报关单关联的所有发运单ID", planOrderData);
                    for (var i = 0; i < planOrderData.length; i++) {
                        var recId = planOrderData[i]; //发运单id
                        var planOrderRec = record.load({type: "customrecord_swc_wl_plan_order", id: recId, isDynamic: true});
                        // 查询当前发运单的子列表
                        getPlanOrderSublistData(planOrderRec, recordId);

                        var savedId = planOrderRec.save();
                        log.audit("保存成功", "保存发运单ID: " + savedId);
                    }

                    var declarationRec = record.load({type: "customrecord_swc_customs_declaration", id: recordId});
                    // 删除报关单明细信息
                    var lineCount = declarationRec.getLineCount({sublistId: 'recmachcustrecord_swc_bgdmx_bgdh'});
                    log.audit("子列表行数", lineCount);
                    for (var i = lineCount - 1; i >= 0; i--) {
                        declarationRec.removeLine({sublistId: "recmachcustrecord_swc_bgdmx_bgdh", line: i});
                    }
                    var savedDeclarationId = declarationRec.save();
                    log.audit("子列表删除成功", savedDeclarationId);
                }
            } catch (e) {
                log.error("处理失败", { recordId: recordId,error: e.toString(),});
                throw e;
            }
        }

        const afterSubmit = (scriptContext) => {

        }


        //物流发运单搜索
        function planOrderSearch(recordId){
            var planDetailList = [];
            var customrecord_swc_wl_plan_detailSearchObj = search.create({
                type: "customrecord_swc_wl_plan_detail",
                filters:
                    [
                        ["custrecord_swc_wl_bgdid","anyof",recordId]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID",
                            label: "id"
                        })
                    ]
            });
            var searchResult = getAllSearchObj(customrecord_swc_wl_plan_detailSearchObj);
            var searchResultCount = customrecord_swc_wl_plan_detailSearchObj.runPaged().count;
            log.audit("searchResultCount",searchResultCount);
            searchResult.forEach(function (result) {
                var internalid = result.getValue({
                    name: "internalid",
                    join: "CUSTRECORD_SWC_WL_PLAN_ORDER_ID",
                    label: "id"
                });
                if (internalid) {
                    if(planDetailList.indexOf(internalid) < 0){
                        planDetailList.push(internalid);
                    }
                }
                return true;
            });
            return planDetailList;
        }

        // 获取报关单子列表数据
        function getPlanOrderSublistData(planOrderRec,recordId) {
            var sublistId= 'recmachcustrecord_swc_wl_plan_order_id';
            var lineCount = planOrderRec.getLineCount({sublistId:sublistId});
            log.audit("子表行数", lineCount);

            for (var j = 0; j < lineCount; j++) {
                var declarationId = planOrderRec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: "custrecord_swc_wl_bgdid",
                    line: j,
                });
                if(declarationId == recordId){
                    // 选中当前行
                    planOrderRec.selectLine({
                        sublistId: sublistId,
                        line: j
                    });

                    // 使用 setCurrentSublistValue 设置当前选中行的值
                    planOrderRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: "custrecord_swc_wl_bgdid",
                        value: ""
                    });
                    planOrderRec.commitLine({
                        sublistId: sublistId
                    });

                }
            }
        }

        /**
         * 保存检索查询超过4000条
         * @param searchObj
         * @returns {*[]}
         */
        function getAllSearchObj(searchObj){
            var RESULTCOUNT = 4000;
            var SIZE = 1000;
            var searchResultCount = searchObj.runPaged().count;
            var resList = [];
            if(searchResultCount>RESULTCOUNT){
                var resultSet = searchObj.run();
                var max = Math.ceil(searchResultCount / SIZE);
                for(var i=0;i<max;i++){
                    var results = resultSet.getRange({
                        start: SIZE*i,
                        end: Number(SIZE*i)+Number(SIZE)
                    });
                    for(var j=0;j<results.length;j++){
                        resList.push(results[j]);
                    }
                }
            }else{
                searchObj.run().each(function(result){
                    resList.push(result);
                    return true;
                });
            }
            return resList;
        }



        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            // afterSubmit: afterSubmit
       };
    });
