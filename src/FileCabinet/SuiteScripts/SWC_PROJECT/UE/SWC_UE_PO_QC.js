/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *质检单，输入公司SKU，查询系统SKU
 */
define(['N/search', 'N/record'], function (search, record) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {
        try {
            if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT) {
                var new_rec = context.newRecord;
                var count = new_rec.getLineCount({ sublistId: 'recmachcustrecord_swc_related_main_qc' });
                var allItemNames = [];
                for (var i = 0; i < count; i++) {
                    //1:遍历行并重新赋值行号
                    var item_name = new_rec.getSublistValue({ sublistId: 'recmachcustrecord_swc_related_main_qc', fieldId: 'custrecord_swc_qc_item_name', line: i });
                    log.debug('item_name', item_name);
                    //赋值唯一键行号 当行唯一键为空的时候才赋值
                    var item = new_rec.getSublistValue({ sublistId: 'recmachcustrecord_swc_related_main_qc', fieldId: 'custrecord_swc_qc_details_item', line: i });
                    log.error('item', item);
                    if (!item && allItemNames.indexOf(item_name) == -1 && item_name) {
                        allItemNames.push(item_name)
                    }
                }

                var searchFilters = [];
                if (allItemNames.length === 1) {
                    searchFilters.push(["displayname", "is", allItemNames[0]]);
                } else {
                    var temp = [];
                    for (var i = 0; i < allItemNames.length; i++) {
                        temp.push(["entityid", "is", allItemNames[i]]);
                        if (i < allItemNames.length - 1) {
                            temp.push("OR");
                        }
                    }
                    searchFilters.push(temp);
                }

                var itemInfoMap = {};
                search.create({
                    type: 'item',
                    filters: searchFilters,
                    columns:
                        [
                            search.createColumn({ name: 'internalid', label: 'id' }),
                            search.createColumn({ name: 'displayname', label: 'displayname' })
                        ]
                }).run().each(function (rec) {
                    log.debug('item_info rec', rec);
                    var displayname = rec.getValue({ name: "displayname" });
                    itemInfoMap[displayname] = rec.id
                    return true
                });
                for (var i = 0; i < count; i++) {
                    //1:遍历行并重新赋值行号
                    var item_name = new_rec.getSublistValue({ sublistId: 'recmachcustrecord_swc_related_main_qc', fieldId: 'custrecord_swc_qc_item_name', line: i });
                    log.debug('item_name1', item_name);
                    //赋值唯一键行号 当行唯一键为空的时候才赋值
                    var item = new_rec.getSublistValue({ sublistId: 'recmachcustrecord_swc_related_main_qc', fieldId: 'custrecord_swc_qc_details_item', line: i });
                    log.error('item2', item);
                    if (!item && item_name) {
                        new_rec.setSublistValue({ sublistId: 'recmachcustrecord_swc_related_main_qc', fieldId: 'custrecord_swc_qc_details_item', value: itemInfoMap[item_name], line: i });
                    }
                }

            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function afterSubmit(context) {

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});