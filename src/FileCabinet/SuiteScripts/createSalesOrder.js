/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record'], (record) => {

    /**
     * 创建销售订单
     */
    const execute = (scriptContext) => {
        var salesOrder = record.create({
            type: record.Type.SALES_ORDER,
            isDynamic: true
        });
        /** 选择表单客户*/
        salesOrder.setValue({
            fieldId: 'entity',
            value: 24
        });
        /**
         * 创建子列表
         */
        salesOrder.selectNewLine({
            sublistId: 'item'
        });
        /** 选择表单货品*/
        salesOrder.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            value: 31
        });
        /**
         * 选择表单数量
         */
        salesOrder.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            value: 5
        });
        /**
         * 选择表单单价
         */
        salesOrder.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'rate',
            value: 10   
        });
        /**
         * 提交当前行
         */
        salesOrder.commitLine({
            sublistId: 'item'
        });
        salesOrder.save();
            alert('创建成功');
          
    }

    return { execute }

});
