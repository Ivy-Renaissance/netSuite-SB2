/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/error', 'N/search'], function (runtime, error,search) {

    function beforeSubmit(context) {

        if (runtime.executionContext !== runtime.ContextType.CSV_IMPORT) return;

        const rec = context.newRecord;

        const nifQtyRaw = rec.getValue('custrecord_swc_ecd_nif_quantity');
        const quantity = rec.getValue('custrecord_swc_ecd_quantity');
        const po_quantity = rec.getValue('custrecord_swc_ecd_po_quantity');

        const if_quantity = rec.getValue('custrecord_swc_ecd_if_quantity');


        const estimated_cabine_no = rec.getValue('custrecord_swc_estimated_cabine_no');

        const quantityEmpty = (quantity === null || quantity === '');
        const ecNoEmpty = (estimated_cabine_no === null || estimated_cabine_no === '');


        //2026/02/27 swr
        //预排柜单号重复检验
        const cabinetId = rec.getValue('custrecord_swc_ecd_estimated_cabinet');
        if (!ecNoEmpty && cabinetId) {
            let repeatQuantity = searchRepeat(cabinetId,estimated_cabine_no);
            log.error('repeatQuantity',repeatQuantity);
            if (repeatQuantity > 0) {
                throw error.create({
                    name: 'CSV_VALIDATION_FAILED',
                    message: '当前行【预排柜单号】已历史单据使用。',
                    notifyOff: false
                })
            }
        }

        if(ecNoEmpty){
            throw error.create({
                name: 'CSV_VALIDATION_FAILED',
                message: '当前行【预排柜单号】未正确填写。',
                notifyOff: false
            })
        }else if(quantityEmpty){
            throw error.create({
                name: 'CSV_VALIDATION_FAILED',
                message: '当前行【本次预排柜数量】未正确填写。',
                notifyOff: false
            })
        }else if(Number(quantity || 0) - Number(po_quantity || 0) - Number(if_quantity || 0) > 0){
            throw error.create({
                name: 'CSV_VALIDATION_FAILED',
                message: '当前行【本次预排柜数量】超过【未出运数量】，请重新填写。',
                notifyOff: false
            })
        }
    }

    function searchRepeat(cabinetId,estimated_cabine_no) {
        const customrecord_swc_estimated_cabine_detailSearchObj = search.create({
            type: "customrecord_swc_estimated_cabine_detail",
            filters:
                [
                    ["custrecord_swc_estimated_cabine_no","startswith",estimated_cabine_no],
                    "AND",
                    ["custrecord_swc_ecd_estimated_cabinet","noneof",cabinetId]
                ],
            columns:
                [
                    search.createColumn({name: "internalid", label: "内部 ID"})
                ]
        });
        return customrecord_swc_estimated_cabine_detailSearchObj.runPaged().count || 0;
    }

    return { beforeSubmit };
});