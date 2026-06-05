/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/ui/dialog', 'N/search'], function (dialog, search) {

    const saveRecord = (context) => {
        // 生效日期/失效日期校验比较
        return dateCheck(context);
    };

    const fieldChanged = (context)=> {
        try {
            // 自动设置 【物流商服务报价-明细】 字段值
            setLpdLpFieldValues(context);
        } catch (e) {
            log.debug('e', e);
        }
    }

    /**
     * 自动设置 【物流商服务报价-明细】 字段值
     *
     * 1.自动设置【分摊规则】字段值
     *
     * @param context
     */
    function setLpdLpFieldValues(context){
        let now_rec = context.currentRecord, field_id = context.fieldId, sublist_id = 'recmachcustrecord_swc_lpd_lp';
        if (field_id == 'custrecord_swc_lp_rm_cost_s') {
            // 费用类型（中类）
            let cost_medium = now_rec.getCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_lp_cost_medium' });
            // 费用类型（小类）
            let cost_s = now_rec.getCurrentSublistText({ sublistId: sublist_id, fieldId: 'custrecord_swc_lp_rm_cost_s' });

            if(cost_medium && cost_s){
                search.create({
                    type: 'customrecord_swc_rule_mapping_table_deta',
                    filters: [
                        ["custrecord_swc_rm_cost_medium","anyof",cost_medium],
                        "AND",
                        ["custrecord_swc_rm_cost_s","is",cost_s]
                    ],
                    columns: [
                        { name: 'custrecord_swc_rm_allocation_logic' }
                    ]
                }).run().each(function (rec) {
                    now_rec.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_lp_allocation_rules', value: rec.getValue(rec.columns[0]) });
                });
            }
        }

    }

    /**
     * 生效日期/失效日期比较
     *
     * 失效日期不能小于或者等于生效日期
     *
     * @param context
     * @returns {boolean}
     */
    const dateCheck = (context) => {
        const rec = context.currentRecord;
        const start_date = rec.getValue({ fieldId: 'custrecord_swc_lp_start_date' });
        const end_date = rec.getValue({ fieldId: 'custrecord_swc_lp_end_date' });

        // 两个日期都有值时才比较
        if (start_date && end_date && end_date <= start_date) {
            dialog.alert({
                title: '错误',
                message: '失效日期 不能早于 生效日期，请修正后再保存。'
            });
            return false;
        }

        return true;
    }

    return {saveRecord, fieldChanged}

});
