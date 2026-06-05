/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 *单据唯一键赋值
 */
define(['N/record'], function (record) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
        try {
            if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT) {
                var newRec = context.newRecord;
                var rec_type = newRec.type;
                var rec_id = newRec.id;
                var new_rec = record.load({ type: rec_type, id: rec_id, isDynamic: true });
                var count = new_rec.getLineCount({ sublistId: 'item' });
                for (var i = 0; i < count; i++) {
                    new_rec.selectLine('item', i);
                    //1:遍历行并重新赋值行号
                    var lineuniquekey = new_rec.getSublistValue({ sublistId: 'item', fieldId: 'lineuniquekey', line: i });
                    log.debug('lineuniquekey', lineuniquekey);
                    //赋值唯一键行号 当行唯一键为空的时候才赋值
                    var wyj = new_rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_poline_initial_key'});
                    log.error('wyj',!wyj);

                    log.error('wyj',String(wyj));
                    if (wyj) {
                        new_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_poline_initial_key', value: String(wyj)});
                        log.error('拆行唯一键已更新',i);
                    } else {
                        new_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_poline_initial_key', value: lineuniquekey });
                        log.error('唯一键已更新',i);
                    }

                    new_rec.commitLine('item');
                }
                var new_rec_id = new_rec.save({ enableSourcing: true, ignoreMandatoryFields: true });
                if (new_rec_id) {
                    log.debug('new_rec_id', '唯一键已更新');
                }
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});