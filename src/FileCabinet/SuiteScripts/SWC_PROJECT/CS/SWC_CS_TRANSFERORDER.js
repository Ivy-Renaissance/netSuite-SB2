// /**
//  * @NApiVersion 2.1
//  * @NScriptType ClientScript
//  */
// define([], () => {
//
//     // 原有费用校验子列表
//     const SUBLIST_ID = 'recmachcustrecord_swc_trnfrord_link';
//     const F_FEE = 'custrecord_swc_trnfrord_po_db_fee';
//     const F_FEE_SJ = 'custrecord_swc_trnfrord_po_db_fee_sj';
//
//     const F_FEE2 = 'custrecord_swc_hw_trnfrord_po_db_fee';
//     const F_FEE_SJ2 = 'custrecord_swc_hw_trnfrord_po_db_fee_sj';
//
//     // 新增 A/B 控制子列表
//     const SUBLIST_ID_HW = 'recmachcustrecord_swc_hw_trnfrord_link';
//     const FIELD_ID_HW_TYPE = 'custrecord_swc_hw_trnfrord_lo_type';
//     const FTGZ = 'custrecord_swc_hw_trnfrord_ft';
//     const F_PO_TRANSFER = 'custbody_swc_po_transfer';
//     const F_PO_TRANSFER_HW = 'custbody_swc_po_transfer_hw';
//
//     const notransferfee_check = 'custbody_swc_notransferfee_check'
//
//     let initHandled = false;
//
//     function toNumber(val) {
//         // 只有“空”才算未填写；0 不算空
//         if (val === null || val === undefined || val === '') return null;
//         if (typeof val === 'number') return val;
//
//         const s = String(val).replace(/,/g, '').trim();
//         if (s === '') return null;
//
//         const n = Number(s);
//         return Number.isFinite(n) ? n : NaN;
//     }
//
//     function round2(n) {
//         return Math.round(n * 100) / 100;
//     }
//
//     function getLineCountSafe(rec, sublistId) {
//         try {
//             return rec.getLineCount({ sublistId });
//         } catch (e) {
//             return 0;
//         }
//     }
//
//     function normalizeValue(value) {
//         if (value === null || value === undefined) return '';
//         return String(value).trim().toUpperCase();
//     }
//
//     /**
//      * 页面打开时：
//      * - create / edit / copy 都检查
//      * - 如果 HW 子列表里没有 A，则补一行 A
//      * - 如果 HW 子列表里没有 B，则补一行 B
//      * - 如果已存在，则不追加
//      */
//     function pageInit(context) {
//         try {
//             if (!['create', 'edit', 'copy'].includes(context.mode)) {
//                 return;
//             }
//
//             if (initHandled) return;
//
//             const rec = context.currentRecord;
//
//             // 延迟执行，避免页面刚打开时子列表还没准备好
//             setTimeout(function () {
//                 try {
//                     ensureHWABLines(rec);
//                     initHandled = true;
//                 } catch (e) {
//                     console.log('ensureHWABLines error: ' + e.name + ', ' + e.message);
//                 }
//             }, 800);
//
//         } catch (e) {
//             console.log('pageInit error: ' + e.name + ', ' + e.message);
//         }
//     }
//
//     function ensureHWABLines(rec) {
//         const lineCount = getLineCountSafe(rec, SUBLIST_ID_HW);
//         const values = getHWTypeValues(rec);
//
//         console.log('HW lineCount = ' + lineCount);
//         console.log('HW values = ' + JSON.stringify(values));
//
//         // 如果已经超过 2 行，不自动处理，留到 saveRecord 阶段拦截
//         if (lineCount > 2) {
//             console.log('HW lineCount > 2, skip auto add');
//             return;
//         }
//
//         const hasA = values.includes('出仓费');
//         const hasB = values.includes('入仓费');
//
//         if (!hasA) {
//             addHWLine(rec, '出仓费');
//         }
//
//         if (!hasB) {
//             addHWLine(rec, '入仓费');
//         }
//     }
//
//     function getHWTypeValues(rec) {
//         const values = [];
//         const lineCount = getLineCountSafe(rec, SUBLIST_ID_HW);
//
//         for (let i = 0; i < lineCount; i++) {
//             let value = '';
//             try {
//                 value = rec.getSublistValue({
//                     sublistId: SUBLIST_ID_HW,
//                     fieldId: FIELD_ID_HW_TYPE,
//                     line: i
//                 });
//             } catch (e) {
//                 value = '';
//             }
//
//             value = normalizeValue(value);
//             if (value) values.push(value);
//         }
//
//         return values;
//     }
//
//     function addHWLine(rec, loTypeValue) {
//         rec.selectNewLine({
//             sublistId: SUBLIST_ID_HW
//         });
//
//         rec.setCurrentSublistValue({
//             sublistId: SUBLIST_ID_HW,
//             fieldId: FTGZ,
//             value: 1,
//             ignoreFieldChange: true
//         });
//
//         rec.setCurrentSublistValue({
//             sublistId: SUBLIST_ID_HW,
//             fieldId: FIELD_ID_HW_TYPE,
//             value: loTypeValue,
//             ignoreFieldChange: true
//         });
//
//         rec.commitLine({
//             sublistId: SUBLIST_ID_HW
//         });
//
//         console.log('added HW line: ' + loTypeValue);
//     }
//
//     function saveRecord(context) {
//         const rec = context.currentRecord;
//
//         /**
//          * 1. 原有费用校验逻辑
//          */
//
//         const lineCount2 = getLineCountSafe(rec, SUBLIST_ID_HW);
//         if (lineCount2 && lineCount2 > 0) {
//             for (let i2 = 0; i2 < lineCount2; i2++) {
//                 const fee2 = toNumber(
//                     rec.getSublistValue({
//                         sublistId: SUBLIST_ID_HW,
//                         fieldId: F_FEE2,
//                         line: i2
//                     })
//                 );
//
//                 const feeSj2 = toNumber(
//                     rec.getSublistValue({
//                         sublistId: SUBLIST_ID_HW,
//                         fieldId: F_FEE_SJ2,
//                         line: i2
//                     })
//                 );
//
//                 // feeSj 为空：该行不校验
//                 if (feeSj2 === null) continue;
//
//                 // feeSj 非空（包括 0）：必须是有效数字
//                 if (Number.isNaN(feeSj2)) {
//                     alert(`第 ${i + 1} 行：实际海外仓调拨费不是有效数字，请检查输入。`);
//                     return false;
//                 }
//
//                 // fee 必须非空且有效数字
//                 if (fee2 === null) {
//                     alert(`第 ${i + 1} 行：已填写实际海外仓调拨费时，预估海外仓调拨费也必须填写，且两者必须一致。`);
//                     return false;
//                 }
//                 if (Number.isNaN(fee2)) {
//                     alert(`第 ${i + 1} 行：预估海外仓调拨费不是有效数字，请检查输入。`);
//                     return false;
//                 }
//
//                 // 必须一致（按两位小数比较）
//                 if (round2(feeSj2) !== round2(fee2)) {
//                     alert(`第 ${i + 1} 行：实际海外仓调拨费已填写时，必须与预估海外仓调拨费一致。请确认两个字段数值相同。`);
//                     return false;
//                 }
//             }
//         }
//
//         const lineCount = getLineCountSafe(rec, SUBLIST_ID);
//         if (lineCount && lineCount > 0) {
//             for (let i = 0; i < lineCount; i++) {
//                 const fee = toNumber(
//                     rec.getSublistValue({
//                         sublistId: SUBLIST_ID,
//                         fieldId: F_FEE,
//                         line: i
//                     })
//                 );
//
//                 const feeSj = toNumber(
//                     rec.getSublistValue({
//                         sublistId: SUBLIST_ID,
//                         fieldId: F_FEE_SJ,
//                         line: i
//                     })
//                 );
//
//                 // feeSj 为空：该行不校验
//                 if (feeSj === null) continue;
//
//                 // feeSj 非空（包括 0）：必须是有效数字
//                 if (Number.isNaN(feeSj)) {
//                     alert(`第 ${i + 1} 行：实际采购调拨费不是有效数字，请检查输入。`);
//                     return false;
//                 }
//
//                 // fee 必须非空且有效数字
//                 if (fee === null) {
//                     alert(`第 ${i + 1} 行：已填写实际采购调拨费时，预估采购调拨费也必须填写，且两者必须一致。`);
//                     return false;
//                 }
//                 if (Number.isNaN(fee)) {
//                     alert(`第 ${i + 1} 行：预估采购调拨费不是有效数字，请检查输入。`);
//                     return false;
//                 }
//
//                 // 必须一致（按两位小数比较）
//                 if (round2(feeSj) !== round2(fee)) {
//                     alert(`第 ${i + 1} 行：实际采购调拨费已填写时，必须与预估采购调拨费一致。请确认两个字段数值相同。`);
//                     return false;
//                 }
//             }
//         }
//
//         /**
//          * 2. HW 子列表 A/B 校验逻辑
//          * 要求：
//          * - 只能有 2 行
//          * - 必须正好一行 A、一行 B
//          */
//         const hwLineCount = getLineCountSafe(rec, SUBLIST_ID_HW);
//
//         if (hwLineCount !== 2) {
//             alert('海外仓调拨费录入信息错误。');
//             return false;
//         }
//
//         const hwValues = getHWTypeValues(rec);
//
//         if (hwValues.length !== 2) {
//             alert('海外仓调拨费录入信息错误。');
//             return false;
//         }
//
//         let countA = 0;
//         let countB = 0;
//
//         for (let i = 0; i < hwValues.length; i++) {
//             const v = hwValues[i];
//
//             if (v === '出仓费') {
//                 countA++;
//             } else if (v === '入仓费') {
//                 countB++;
//             } else {
//                 alert('海外仓调拨费录入信息错误。');
//                 return false;
//             }
//         }
//
//         if (countA !== 1 || countB !== 1) {
//             alert('海外仓调拨费录入信息错误。');
//             return false;
//         }
//
//         return true;
//     }
//
//     function fieldChanged(context) {
//         try {
//             const rec = context.currentRecord;
//             const fieldId = context.fieldId;
//
//             // 只处理头部字段
//             if (context.sublistId) {
//                 return;
//             }
//
//             if (fieldId === F_PO_TRANSFER) {
//                 const checked = rec.getValue({ fieldId: F_PO_TRANSFER });
//                 if (checked) {
//                     rec.setValue({
//                         fieldId: F_PO_TRANSFER_HW,
//                         value: false,
//                         ignoreFieldChange: true
//                     });
//
//                     rec.setValue({
//                         fieldId: notransferfee_check,
//                         value: false,
//                         ignoreFieldChange: true
//                     });
//                 }
//             }
//
//             if (fieldId === F_PO_TRANSFER_HW) {
//                 const checked = rec.getValue({ fieldId: F_PO_TRANSFER_HW });
//                 if (checked) {
//                     rec.setValue({
//                         fieldId: F_PO_TRANSFER,
//                         value: false,
//                         ignoreFieldChange: true
//                     });
//
//                     rec.setValue({
//                         fieldId: notransferfee_check,
//                         value: false,
//                         ignoreFieldChange: true
//                     });
//                 }
//             }
//
//             if(fieldId === notransferfee_check){
//                 rec.setValue({
//                     fieldId: F_PO_TRANSFER,
//                     value: false,
//                     ignoreFieldChange: true
//                 });
//                 rec.setValue({
//                     fieldId: F_PO_TRANSFER_HW,
//                     value: false,
//                     ignoreFieldChange: true
//                 });
//             }
//
//
//
//         } catch (e) {
//             console.log('fieldChanged error: ' + e.name + ', ' + e.message);
//         }
//     }
//
//     return {
//         pageInit,
//         saveRecord,
//         fieldChanged
//     };
// });

/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/search'], (search) => {

    // 原有费用校验子列表
    const SUBLIST_ID = 'recmachcustrecord_swc_trnfrord_link';
    const F_FEE = 'custrecord_swc_trnfrord_po_db_fee';
    const F_FEE_SJ = 'custrecord_swc_trnfrord_po_db_fee_sj';

    const F_FEE2 = 'custrecord_swc_hw_trnfrord_po_db_fee';
    const F_FEE_SJ2 = 'custrecord_swc_hw_trnfrord_po_db_fee_sj';

    // 新增 A/B/C 控制子列表
    const SUBLIST_ID_HW = 'recmachcustrecord_swc_hw_trnfrord_link';
    const FIELD_ID_HW_TYPE = 'custrecord_swc_hw_trnfrord_lo_type';
    const FTGZ = 'custrecord_swc_hw_trnfrord_ft';
    const FIELD_HW_PAY = 'custrecord_swc_hw_trnfrord_pay_qs';
    const FIELD_HW_HISTORY_DIFF = 'custrecord_swc_historical_differences';
    const F_PO_TRANSFER = 'custbody_swc_po_transfer';
    const F_PO_TRANSFER_HW = 'custbody_swc_po_transfer_hw';

    const notransferfee_check = 'custbody_swc_notransferfee_check';

    let initHandled = false;

    function toNumber(val) {
        // 只有“空”才算未填写；0 不算空
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'number') return val;

        const s = String(val).replace(/,/g, '').trim();
        if (s === '') return null;

        const n = Number(s);
        return Number.isFinite(n) ? n : NaN;
    }

    function round2(n) {
        return Math.round(n * 100) / 100;
    }

    function getLineCountSafe(rec, sublistId) {
        try {
            return rec.getLineCount({ sublistId });
        } catch (e) {
            return 0;
        }
    }

    function normalizeValue(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim().toUpperCase();
    }

    /**
     * 页面打开时：
     * - create / edit / copy 都检查
     * - 如果 HW 子列表里没有 出仓费，则补一行
     * - 如果 HW 子列表里没有 入仓费，则补一行
     * - 如果 HW 子列表里没有 卡车费，则补一行
     * - 如果已存在，则不追加
     */
    function pageInit(context) {
        try {
            if (!['create', 'edit', 'copy'].includes(context.mode)) {
                return;
            }

            if (initHandled) return;

            const rec = context.currentRecord;

            // 延迟执行，避免页面刚打开时子列表还没准备好
            setTimeout(function () {
                try {
                    ensureHWABLines(rec);
                    initHandled = true;
                } catch (e) {
                    console.log('ensureHWABLines error: ' + e.name + ', ' + e.message);
                }
            }, 800);

        } catch (e) {
            console.log('pageInit error: ' + e.name + ', ' + e.message);
        }
    }

    function ensureHWABLines(rec) {
        const lineCount = getLineCountSafe(rec, SUBLIST_ID_HW);
        const values = getHWTypeValues(rec);

        console.log('HW lineCount = ' + lineCount);
        console.log('HW values = ' + JSON.stringify(values));

        // 如果已经超过 3 行，不自动处理，留到 saveRecord 阶段拦截
        if (lineCount > 3) {
            console.log('HW lineCount > 3, skip auto add');
            return;
        }

        const hasA = values.includes('出仓费');
        const hasB = values.includes('入仓费');
        const hasC = values.includes('卡车费');

        if (!hasA) {
            addHWLine(rec, '出仓费');
        }

        if (!hasB) {
            addHWLine(rec, '入仓费');
        }

        if (!hasC) {
            addHWLine(rec, '卡车费');
        }
    }

    function getHWTypeValues(rec) {
        const values = [];
        const lineCount = getLineCountSafe(rec, SUBLIST_ID_HW);

        for (let i = 0; i < lineCount; i++) {
            let value = '';
            try {
                value = rec.getSublistValue({
                    sublistId: SUBLIST_ID_HW,
                    fieldId: FIELD_ID_HW_TYPE,
                    line: i
                });
            } catch (e) {
                value = '';
            }

            value = normalizeValue(value);
            if (value) values.push(value);
        }

        return values;
    }

    function addHWLine(rec, loTypeValue) {
        let ftgzValue = 1;

        // 只有出仓费是 2，其余都是 1
        if (loTypeValue === '出仓费') {
            ftgzValue = 3;
        }

        rec.selectNewLine({
            sublistId: SUBLIST_ID_HW
        });

        rec.setCurrentSublistValue({
            sublistId: SUBLIST_ID_HW,
            fieldId: FTGZ,
            value: ftgzValue,
            ignoreFieldChange: true
        });

        rec.setCurrentSublistValue({
            sublistId: SUBLIST_ID_HW,
            fieldId: FIELD_ID_HW_TYPE,
            value: loTypeValue,
            ignoreFieldChange: true
        });

        // 历史差异逻辑按最新业务已停用，字段保留但不再自动赋值。
        // rec.setCurrentSublistValue({
        //     sublistId: SUBLIST_ID_HW,
        //     fieldId: FIELD_HW_HISTORY_DIFF,
        //     value: 0,
        //     ignoreFieldChange: true
        // });

        rec.commitLine({
            sublistId: SUBLIST_ID_HW
        });

        console.log('added HW line: ' + loTypeValue + ', FTGZ=' + ftgzValue);
    }

    // 历史差异逻辑按最新业务已停用，代码保留便于后续恢复。
    // function getHwHistoricalDifferenceAmount(payId, loType, rec) {
    //     if (!loType) return 0;
    //
    //     const historySearch = search.create({
    //         type: 'customrecord_swc_trnfrord_db_hw',
    //         filters: [
    //             ['custrecord_swc_historical_difference_han', 'is', 'F'],
    //             'AND',
    //             ['custrecord_swc_hw_trnfrord_lo_type', 'is', String(loType)]
    //         ],
    //         columns: [
    //             search.createColumn({
    //                 name: 'custrecord_swc_cost_difference',
    //                 summary: 'SUM'
    //             })
    //         ]
    //     });
    //
    //     const rs = historySearch.run().getRange({ start: 0, end: 1 }) || [];
    //     if (!rs.length) return 0;
    //
    //     return round2(rs[0].getValue({
    //         name: 'custrecord_swc_cost_difference',
    //         summary: 'SUM'
    //     }) || 0);
    // }
    //
    // function refreshAllHwHistoricalDifferences(rec) {
    //     const lineCount = getLineCountSafe(rec, SUBLIST_ID_HW);
    //     for (let i = 0; i < lineCount; i++) {
    //         let payId = '';
    //         try {
    //             payId = rec.getSublistValue({
    //                 sublistId: SUBLIST_ID_HW,
    //                 fieldId: FIELD_HW_PAY,
    //                 line: i
    //             });
    //         } catch (e) {
    //             payId = '';
    //         }
    //         let loType = '';
    //         try {
    //             loType = rec.getSublistValue({
    //                 sublistId: SUBLIST_ID_HW,
    //                 fieldId: FIELD_ID_HW_TYPE,
    //                 line: i
    //             });
    //         } catch (e) {
    //             loType = '';
    //         }
    //         const amount = getHwHistoricalDifferenceAmount(payId, loType, rec);
    //
    //         rec.selectLine({
    //             sublistId: SUBLIST_ID_HW,
    //             line: i
    //         });
    //
    //         rec.setCurrentSublistValue({
    //             sublistId: SUBLIST_ID_HW,
    //             fieldId: FIELD_HW_HISTORY_DIFF,
    //             value: amount,
    //             ignoreFieldChange: true
    //         });
    //
    //         rec.commitLine({
    //             sublistId: SUBLIST_ID_HW
    //         });
    //     }
    // }

    function saveRecord(context) {
        const rec = context.currentRecord;

        /**
         * 1. 原有费用校验逻辑
         */
        const lineCount2 = getLineCountSafe(rec, SUBLIST_ID_HW);
        if (lineCount2 && lineCount2 > 0) {
            for (let i2 = 0; i2 < lineCount2; i2++) {
                const fee2 = toNumber(
                    rec.getSublistValue({
                        sublistId: SUBLIST_ID_HW,
                        fieldId: F_FEE2,
                        line: i2
                    })
                );

                const feeSj2 = toNumber(
                    rec.getSublistValue({
                        sublistId: SUBLIST_ID_HW,
                        fieldId: F_FEE_SJ2,
                        line: i2
                    })
                );

                // feeSj 为空：该行不校验
                if (feeSj2 === null) continue;

                // feeSj 非空（包括 0）：必须是有效数字
                if (Number.isNaN(feeSj2)) {
                    alert(`第 ${i2 + 1} 行：实际海外仓调拨费不是有效数字，请检查输入。`);
                    return false;
                }

                // fee 必须非空且有效数字
                if (fee2 === null) {
                    alert(`第 ${i2 + 1} 行：已填写实际海外仓调拨费时，预估海外仓调拨费也必须填写，且两者必须一致。`);
                    return false;
                }
                if (Number.isNaN(fee2)) {
                    alert(`第 ${i2 + 1} 行：预估海外仓调拨费不是有效数字，请检查输入。`);
                    return false;
                }

                // 当前业务允许实际海外仓调拨费与预估海外仓调拨费不一致，
                // 差异后续通过差异账单逻辑处理，这里不再拦截。
            }
        }

        const lineCount = getLineCountSafe(rec, SUBLIST_ID);
        if (lineCount && lineCount > 0) {
            for (let i = 0; i < lineCount; i++) {
                const fee = toNumber(
                    rec.getSublistValue({
                        sublistId: SUBLIST_ID,
                        fieldId: F_FEE,
                        line: i
                    })
                );

                const feeSj = toNumber(
                    rec.getSublistValue({
                        sublistId: SUBLIST_ID,
                        fieldId: F_FEE_SJ,
                        line: i
                    })
                );

                // feeSj 为空：该行不校验
                if (feeSj === null) continue;

                // feeSj 非空（包括 0）：必须是有效数字
                if (Number.isNaN(feeSj)) {
                    alert(`第 ${i + 1} 行：实际采购调拨费不是有效数字，请检查输入。`);
                    return false;
                }

                // fee 必须非空且有效数字
                if (fee === null) {
                    alert(`第 ${i + 1} 行：已填写实际采购调拨费时，预估采购调拨费也必须填写，且两者必须一致。`);
                    return false;
                }
                if (Number.isNaN(fee)) {
                    alert(`第 ${i + 1} 行：预估采购调拨费不是有效数字，请检查输入。`);
                    return false;
                }

                // 必须一致（按两位小数比较）
                if (round2(feeSj) !== round2(fee)) {
                    alert(`第 ${i + 1} 行：实际采购调拨费已填写时，必须与预估采购调拨费一致。请确认两个字段数值相同。`);
                    return false;
                }
            }
        }

        /**
         * 2. HW 子列表 出仓费/入仓费/卡车费 校验逻辑
         * 要求：
         * - 只能有 3 行
         * - 必须正好一行出仓费、一行入仓费、一行卡车费
         */
        const hwLineCount = getLineCountSafe(rec, SUBLIST_ID_HW);

        if (hwLineCount !== 3) {
            alert('海外仓调拨费录入信息错误。');
            return false;
        }

        const hwValues = getHWTypeValues(rec);

        if (hwValues.length !== 3) {
            alert('海外仓调拨费录入信息错误。');
            return false;
        }

        let countA = 0;
        let countB = 0;
        let countC = 0;

        for (let i = 0; i < hwValues.length; i++) {
            const v = hwValues[i];

            if (v === '出仓费') {
                countA++;
            } else if (v === '入仓费') {
                countB++;
            } else if (v === '卡车费') {
                countC++;
            } else {
                alert('海外仓调拨费录入信息错误。');
                return false;
            }
        }

        if (countA !== 1 || countB !== 1 || countC !== 1) {
            alert('海外仓调拨费录入信息错误。');
            return false;
        }

        // 历史差异逻辑按最新业务已停用。
        // refreshAllHwHistoricalDifferences(rec);

        return true;
    }

    function fieldChanged(context) {
        try {
            const rec = context.currentRecord;
            const fieldId = context.fieldId;
            const sublistId = context.sublistId;

            // 历史差异逻辑按最新业务已停用。
            // if (sublistId === SUBLIST_ID_HW && (fieldId === FIELD_HW_PAY || fieldId === FIELD_ID_HW_TYPE)) {
            //     const payId = rec.getCurrentSublistValue({
            //         sublistId: SUBLIST_ID_HW,
            //         fieldId: FIELD_HW_PAY
            //     });
            //     const loType = rec.getCurrentSublistValue({
            //         sublistId: SUBLIST_ID_HW,
            //         fieldId: FIELD_ID_HW_TYPE
            //     });
            //
            //     rec.setCurrentSublistValue({
            //         sublistId: SUBLIST_ID_HW,
            //         fieldId: FIELD_HW_HISTORY_DIFF,
            //         value: getHwHistoricalDifferenceAmount(payId, loType, rec),
            //         ignoreFieldChange: true
            //     });
            //     return;
            // }

            // 只处理头部字段
            if (sublistId) {
                return;
            }

            if (fieldId === F_PO_TRANSFER) {
                const checked = rec.getValue({ fieldId: F_PO_TRANSFER });
                if (checked) {
                    rec.setValue({
                        fieldId: F_PO_TRANSFER_HW,
                        value: false,
                        ignoreFieldChange: true
                    });

                    rec.setValue({
                        fieldId: notransferfee_check,
                        value: false,
                        ignoreFieldChange: true
                    });
                }
            }

            if (fieldId === F_PO_TRANSFER_HW) {
                const checked = rec.getValue({ fieldId: F_PO_TRANSFER_HW });
                if (checked) {
                    rec.setValue({
                        fieldId: F_PO_TRANSFER,
                        value: false,
                        ignoreFieldChange: true
                    });

                    rec.setValue({
                        fieldId: notransferfee_check,
                        value: false,
                        ignoreFieldChange: true
                    });
                }
            }

            if (fieldId === notransferfee_check) {
                rec.setValue({
                    fieldId: F_PO_TRANSFER,
                    value: false,
                    ignoreFieldChange: true
                });
                rec.setValue({
                    fieldId: F_PO_TRANSFER_HW,
                    value: false,
                    ignoreFieldChange: true
                });
            }

        } catch (e) {
            console.log('fieldChanged error: ' + e.name + ', ' + e.message);
        }
    }

    return {
        pageInit,
        saveRecord,
        fieldChanged
    };
});
