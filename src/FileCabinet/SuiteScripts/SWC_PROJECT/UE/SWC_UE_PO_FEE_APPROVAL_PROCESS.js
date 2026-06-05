/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record'], function (search, record) {

    function beforeLoad(context) {
        // 审批按钮逻辑已切换到工作流，这里先保留历史代码作为留档，不再执行按钮注入。
        // try {
        //     var newRecord = context.newRecord, form = context.form;
        //     form.clientScriptModulePath = 'SuiteScripts/SWC_PROJECT/CS/SWC_CS_ESTIMATED_CABINET.js';
        //     if (context.type == 'view') {
        //         // 获取预估费用状态来判断按钮的显示
        //         var fee_ar_type = newRecord.getValue({ fieldId: 'custbody_swc_fee_ar_type' });
        //         var po_fee = newRecord.getValue({ fieldId: 'custbody_swc_po_fee' });
        //
        //         var type1 = 1;
        //         var type2 = 2;
        //         if(fee_ar_type == 1){ // 费用类型采购订单
        //             if(po_fee == 2 || po_fee == 3){
        //                 log.debug('1', newRecord.id);
        //                 form.addButton({
        //                     id: 'custpage_fee_ar_to',
        //                     label: '审核通过',
        //                     functionName: 'fee_ar_to(' + newRecord.id + ',' + type1 + ')',
        //                 });
        //                 form.addButton({
        //                     id: 'custpage_fee_ar_rtn',
        //                     label: '驳回',
        //                     functionName: 'fee_ar_to(' + newRecord.id + ',' + type2 + ')',
        //                 });
        //             }else if(po_fee == 4){
        //                 log.debug('2', newRecord.id);
        //                 form.addButton({
        //                     id: 'custpage_fee_ar_to',
        //                     label: '审核通过',
        //                     functionName: 'fee_ar_to_db(' + newRecord.id + ',' + type1 + ')',
        //                 });
        //
        //                 form.addButton({
        //                     id: 'custpage_fee_ar_rtn',
        //                     label: '驳回',
        //                     functionName: 'fee_ar_to_db(' + newRecord.id + ',' + type2 + ')',
        //                 });
        //             }
        //         }
        //     }
        // } catch (e) {
        //     log.debug('e', e);
        // }
        return;
    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
