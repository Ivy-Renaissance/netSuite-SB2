/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *CG上架
 */
define(['N/search', 'N/record', '../common/SWC_CONFIG_DATA'], function (search, record, SWC_CONFIG_DATA) {
    const CONFIG = SWC_CONFIG_DATA.configData();
    function getInputData() {
        try {
            var need_data = getNeedData();
            log.debug('need_data', need_data);
            log.debug('need_data.length', need_data.length);
            return need_data;
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getNeedData() {
        var need_info = [];
        var infoSearchObj = search.create({
            type: "transferorder",
            filters:
                [
                    ["applyingtransaction", "noneof", "@NONE@"],//核销事务处理不为空
                    "AND",
                    ["custbody_swc_wl_no", "noneof", "@NONE@"],//关联物流发运不为空
                    "AND",
                    ["custbody_swc_wl_no.custrecord_swc_cg_main_order_number", "isnotempty", ""],//关联物流发运的CG主单号不为空
                    "AND",
                    ["tolocation.custrecord_swc_location_attribute", "anyof", "10"],//目的仓的仓库属性为平台在途仓
                    "AND",
                    ["formulatext: case when {applyingtransaction.custbody_swc_correlation_to_bill} = ' ' then 1 else 0 end", "is", "1"],//核销事务处理的关联TO单为空
                    "AND",
                    ["applyingtransaction.type", "anyof", "ItemRcpt"]//核销事务处理类型为货品收据
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", summary: "GROUP", label: "内部ID" }),
                    search.createColumn({ name: "applyingtransaction", summary: "GROUP", label: "核销事务处理" }),
                    search.createColumn({ name: "custbody_swc_wl_no", summary: "GROUP", label: "关联物流发运" }),
                    search.createColumn({ name: "custrecord_swc_wl_county_lsit", join: "custbody_swc_wl_no", summary: "GROUP", label: "运抵国" })
                ]
        });
        var results = getAllResults(infoSearchObj);
        if (results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                var to_id = results[i].getValue(infoSearchObj.columns[0]);
                var ir_id = results[i].getValue(infoSearchObj.columns[1]);
                var wl_id = results[i].getValue(infoSearchObj.columns[2]);
                var wl_country = results[i].getValue(infoSearchObj.columns[3]);
                need_info.push({
                    wl_id: wl_id,
                    to_id: to_id,
                    ir_id: ir_id,
                    wl_country: wl_country
                });
            }
        }
        return need_info;
    }

    /**
     * 通用检索方法
     * @param mySearch
     * @returns {[]}
     */
    function getAllResults(mySearch) {
        var resultSet = mySearch.run();
        var resultArr = [];
        var start = 0;
        var step = 1000;
        var results = resultSet.getRange({
            start: start,
            end: step
        });
        while (results && results.length > 0) {
            resultArr = resultArr.concat(results);
            start = Number(start) + Number(step);
            results = resultSet.getRange({
                start: start,
                end: Number(start) + Number(step)
            });
        }
        return resultArr;
    }

    function map(context) {
        try {
            var value = JSON.parse(context.value);
            var previous_to_id = value.to_id, ir_id = value.ir_id, wl_id = value.wl_id, wl_country = value.wl_country;
            //根据TOID获取对应的贸易条款单据表的ID
            var tk_id = getTkId(previous_to_id);
            //查询发货信息
            var ir_data = getIrData(ir_id);
            log.debug('ir_data', ir_data);
            //创建TO单
            var previous_to_data = record.load({ type: 'transferorder', id: previous_to_id, isDynamic: false });
            var to_data = record.create({ type: record.Type.TRANSFER_ORDER, isDynamic: true });
            var sub_id = wl_country == CONFIG.COUNTRY_ID_US ? CONFIG.SUBSIDIARY_ID_US_DEFAULT : previous_to_data.getValue('subsidiary');
            var loc_id = previous_to_data.getValue('transferlocation');
            log.debug('loc_id', loc_id);
            to_data.setValue('subsidiary', sub_id);
            to_data.setValue('location', loc_id);
            //获取目的仓
            var end_loc = getEndLoc(loc_id, sub_id);
            log.debug('end_loc', end_loc);
            if (!end_loc) {
                log.debug('error', '未匹配到目的仓');
                return;
            }
            to_data.setValue('transferlocation', end_loc);
            to_data.setValue({ fieldId: 'orderstatus', value: 'B' });
            to_data.setValue({ fieldId: 'incoterm', value: 1 });
            to_data.setValue({ fieldId: 'useitemcostastransfercost', value: true });
            to_data.setValue({ fieldId: 'custbody_swc_wl_no', value: wl_id });
            to_data.setValue({ fieldId: 'custbody_swc_main_num', value: ir_data[0].main_num });
            to_data.setValue({ fieldId: 'custbody_swc_main_detail_num', value: ir_data[0].detail_num });
            for (var i = 0; i < ir_data.length; i++) {
                var lot_arr = ir_data[i].lot_arr;
                to_data.selectNewLine({ sublistId: 'item' });
                to_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: ir_data[i].item_id });
                to_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: ir_data[i].item_qty });
                if (lot_arr.length > 0) {
                    var invDetail = to_data.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
                    for (var j = 0; j < lot_arr.length; j++) {
                        invDetail.selectNewLine({ sublistId: 'inventoryassignment' });
                        invDetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', text: lot_arr[j].lot_num });
                        invDetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: lot_arr[j].lot_qty });
                        invDetail.commitLine({ sublistId: 'inventoryassignment' });
                    }
                }
                to_data.commitLine({ sublistId: 'item' });
            }
            var toId = to_data.save({ ignoreMandatoryFields: true });
            if (!toId) {
                log.error('TO save failed', { poId, shopId });
                return;
            }
            log.debug('TO created', toId);
            //创建发货
            // var ifRec = record.transform({
            //     fromType: record.Type.TRANSFER_ORDER,
            //     fromId: toId,
            //     toType: record.Type.ITEM_FULFILLMENT,
            //     isDynamic: true
            // });
            // ifRec.setValue({ fieldId: 'shipstatus', value: 'C' });
            // var ifId = ifRec.save({ ignoreMandatoryFields: true });
            // if (!ifId) {
            //     log.error('IF save failed', { toId });
            //     return;
            // }
            // log.debug('IF created', ifId);
            //将已创建的TO关联到对应的货品收据上
            var rec_ir = record.submitFields({
                type: 'itemreceipt',
                id: ir_id,
                values: {
                    custbody_swc_correlation_to_bill: toId
                }
            });
            if (rec_ir) {
                log.error('success', '关联反写成功' + rec_ir);
            }
            //将已创建的TO回写到对应的贸易条款记录上
            if (tk_id) {
                var tk_t_data = record.load({ type: 'customrecord_swc_wl_tk_t', id: tk_id, isDynamic: true });
                var qg_bill_info = tk_t_data.getValue('custrecord_wl_tk_t_qg_t') || [];
                qg_bill_info.push(toId);
                tk_t_data.setValue('custrecord_wl_tk_t_qg_t', qg_bill_info);
                var tk_t_data_id = tk_t_data.save({ ignoreMandatoryFields: true });
                if (tk_t_data_id) {
                    log.error('success', '关联贸易条款反写成功' + tk_t_data_id);
                }
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getTkId(previous_to_id) {
        var tk_id;
        search.create({
            type: "customrecord_swc_wl_tk_t",
            filters:
                [
                    ["custrecord_wl_tk_t_qg_t", "anyof", previous_to_id],
                    "AND",
                    ["isinactive", "is", "F"]
                ]
        }).run().each(function (result) {
            tk_id = result.id;
            return false;
        });
        return tk_id;
    }

    function getEndLoc(loc_id, sub_id) {
        var loc_data = record.load({ type: 'location', id: loc_id, isDynamic: false });
        var shop_id = loc_data.getValue('custrecord_swc_location_store');
        if (shop_id) {
            var filters_arr = [];
            filters_arr.push(["custrecord_swc_location_store", "anyof", shop_id]);
            filters_arr.push('AND', ["custrecord_swc_location_attribute", "anyof", 7]);
            filters_arr.push('AND', ["subsidiary", "anyof", sub_id]);
            filters_arr.push('AND', ["isinactive", "is", false]);
            filters_arr.push('AND', ["custrecord_swc_location_type", "anyof", 3]);
            var locSearch = search.create({ type: "location", filters: filters_arr, columns: [search.createColumn({ name: "internalid" })] });
            var rs = locSearch.run().getRange({ start: 0, end: 1 });
            if (!rs || rs.length === 0) return null;
            return rs[0].getValue({ name: 'internalid' }) || null;
        }
        return null;
    }

    function getIrData(ir_id) {
        var ir_item_arr = [], sublist_id = 'item';
        var ir_data = record.load({ type: 'itemreceipt', id: ir_id, isDynamic: false });
        var main_num = ir_data.getValue('custbody_swc_main_num');
        var detail_num = ir_data.getValue('custbody_swc_main_detail_num');
        var bill_line_count = ir_data.getLineCount(sublist_id);
        for (var i = 0; i < bill_line_count; i++) {
            var item_id = ir_data.getSublistValue({ sublistId: sublist_id, fieldId: 'item', line: i });
            var item_qty = ir_data.getSublistValue({ sublistId: sublist_id, fieldId: 'quantity', line: i });
            var lot_arr = [];
            var inventorydetail = ir_data.getSublistSubrecord({ sublistId: sublist_id, fieldId: 'inventorydetail', line: i });
            var boxSubLineCount = inventorydetail.getLineCount({ sublistId: 'inventoryassignment' });
            if (boxSubLineCount > 0) {
                for (var j = 0; j < boxSubLineCount; j++) {
                    var lot_num = inventorydetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', line: j });
                    var lot_qty = inventorydetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j });
                    lot_arr.push({
                        lot_num: lot_num,
                        lot_qty: lot_qty
                    });
                }
            }
            ir_item_arr.push({
                item_id: item_id,
                item_qty: item_qty,
                main_num: main_num,
                detail_num: detail_num,
                lot_arr: lot_arr
            });
        }
        return ir_item_arr;
    }

    function reduce(context) {

    }

    function summarize(summary) {
        log.debug('summary', summary);
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
