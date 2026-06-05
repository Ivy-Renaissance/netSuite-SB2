/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *贸易条款根据货品收据生成内部交易
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
                    ["custbody_swc_wl_no.custrecord_swc_hw_lc_number", "isnotempty", ""],//关联物流发运的海外仓入库单号不为空
                    "AND",
                    ["tolocation.custrecord_swc_location_attribute", "anyof", "6"],//目的仓的仓库属性为海外仓
                    "AND",
                    ["formulatext: case when {applyingtransaction.custbody_swc_correlation_nb_po} = ' ' then 1 else 0 end", "is", "1"],//核销事务处理的关联PO单为空
                    "AND",
                    ["applyingtransaction.type", "anyof", "ItemRcpt"],//核销事务处理类型为货品收据 
                    "AND",
                    ["custbody_swc_wl_no.custrecord_swc_wl_county_lsit", "anyof", CONFIG.COUNTRY_ID_US]//物流发运目的国为美国
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", summary: "GROUP", label: "内部ID" }),
                    search.createColumn({ name: "applyingtransaction", summary: "GROUP", label: "核销事务处理" }),
                    search.createColumn({ name: "custbody_swc_wl_no", summary: "GROUP", label: "关联物流发运" }),
                    search.createColumn({ name: "custrecord_swc_wl_terms_of_trade", join: "custbody_swc_wl_no", summary: "GROUP", label: "成交方式" })
                ]
        });
        var results = getAllResults(infoSearchObj);
        if (results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                var to_id = results[i].getValue(infoSearchObj.columns[0]);
                var ir_id = results[i].getValue(infoSearchObj.columns[1]);
                var wl_id = results[i].getValue(infoSearchObj.columns[2]);
                var terms_of_trade = results[i].getValue(infoSearchObj.columns[3]);
                need_info.push({
                    wl_id: wl_id,
                    to_id: to_id,
                    ir_id: ir_id,
                    terms_of_trade: terms_of_trade
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
            log.debug('value', value);
            var previous_to_id = value.to_id, ir_id = value.ir_id, wl_id = value.wl_id, terms_of_trade = value.terms_of_trade;
            //获取贸易条款生成的对应的单据信息
            var tk_info = getTkInfo(previous_to_id, terms_of_trade);
            log.debug('tk_info', tk_info);
            if (Object.keys(tk_info).length > 0) {
                var po_id = tk_info.po_id, tk_id = tk_info.tk_id, shop_id = tk_info.shop_id, jyll_id = tk_info.jyll_id;
                //查询发货信息
                var ir_data = getIrData(ir_id);
                log.debug('ir_data', ir_data);
                //如果为海外FOB的去匹配原PO的价格，非海外FOB的匹配第一次的公司间交易PO价格
                //根据收据的批次去匹配对应的优良品价格
                //获取物流计划信息
                var wl_data = record.load({ type: 'customrecord_swc_wl_plan_order', id: wl_id, isDynamic: true });
                var wlLineCount = wl_data.getLineCount('recmachcustrecord_swc_wl_plan_order_id') || 0;
                log.debug('wlLineCount', wlLineCount);
                if (wlLineCount > 0) {
                    for (var j = 0; j < ir_data.length; j++) {
                        for (let i = 0; i < wlLineCount; i++) {
                            wl_data.selectLine({ sublistId: 'recmachcustrecord_swc_wl_plan_order_id', line: i });
                            var d_customer = wl_data.getCurrentSublistValue({ sublistId: 'recmachcustrecord_swc_wl_plan_order_id', fieldId: 'custrecord_swc_wl_d_customer', line: i });//店铺
                            var d_lot = wl_data.getCurrentSublistValue({ sublistId: 'recmachcustrecord_swc_wl_plan_order_id', fieldId: 'custrecord_swc_wl_d_lot', line: i });//批次号
                            if (d_customer == shop_id && d_lot == ir_data[j].lot_num) {
                                var superior_qty_z = wl_data.getCurrentSublistValue({ sublistId: 'recmachcustrecord_swc_wl_plan_order_id', fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: i });//优品数量
                                var yl = Number(superior_qty_z) > 0 ? 1 : 2;
                                ir_data[j].yl = yl;
                                break;
                            }
                        }
                    }
                } else {
                    log.debug('e', '未获取到物流发运单明细信息，无法判断货品优良关系');
                    return;
                }
                log.debug('ir_data1', ir_data);
                //获取对应的PO优良品价格
                var po_data = record.load({ type: record.Type.PURCHASE_ORDER, id: po_id, isDynamic: true });
                var poLineCount = po_data.getLineCount('item') || 0;
                for (var j = 0; j < ir_data.length; j++) {
                    for (let i = 0; i < poLineCount; i++) {
                        po_data.selectLine({ sublistId: 'item', line: i });
                        var skuId = po_data.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                        var sku = po_data.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_origin_sku', line: i });
                        var country = po_data.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_country_code', line: i });
                        var location_type = po_data.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_loc_type', line: i });
                        var region = po_data.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_us_districts', line: i });
                        var yl1 = po_data.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_grade', line: i });
                        var customer = po_data.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_store', line: i });
                        var rate = po_data.getCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }) || 0;
                        var tax_code = po_data.getCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', line: i });
                        if (skuId == ir_data[j].item_id && yl1 == ir_data[j].yl && customer == shop_id) {
                            ir_data[j].sku = sku;
                            ir_data[j].country = country;
                            ir_data[j].location_type = location_type;
                            ir_data[j].region = region;
                            ir_data[j].rate = rate;
                            ir_data[j].tax_code = tax_code;
                            break;
                        }
                    }
                }
                log.debug('ir_data2', ir_data);
                //获取物流计划信息
                var previous_to_data = record.load({ type: 'transferorder', id: previous_to_id, isDynamic: false });
                var sub_code = previous_to_data.getText('subsidiary');
                var sub_id = previous_to_data.getValue('subsidiary');
                var loc_id = previous_to_data.getValue('transferlocation');
                var warehouse_code = wl_data.getValue('custrecord_swc_md_location');
                log.debug('loc_id', loc_id);
                log.debug('warehouse_code', warehouse_code);
                //根据TO对应的目的仓去找对应的店铺以及店铺公司
                var shop_info = getShopInfo(loc_id, warehouse_code);
                log.debug('shop_info', shop_info);
                if (!Object.keys(shop_info).length) {
                    log.debug('error', '未获取到店铺的对应公司');
                    return;
                }
                //查询公司间交易链路中第一层价格交易系数
                var transaction_coefficient = 0;
                if (terms_of_trade == 5) {
                    transaction_coefficient = getTransactionCoefficient(jyll_id);
                }
                //创建内部PO
                var po_data = record.create({ type: record.Type.PURCHASE_ORDER, isDynamic: true });
                po_data.setText({ fieldId: 'entity', text: 'IC-' + sub_code });
                po_data.setValue({ fieldId: 'subsidiary', value: shop_info.sub_id });
                po_data.setValue({ fieldId: 'location', value: shop_info.loc_id });
                po_data.setValue({ fieldId: 'custbody_swc_wl_no', value: wl_id });
                po_data.setValue('custbody_swc_order_type2', 13);
                // po_data.setValue({ fieldId: 'currency', value: currencyId });
                for (var i = 0; i < ir_data.length; i++) {
                    po_data.selectNewLine({ sublistId: 'item' });
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: ir_data[i].item_id });
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: ir_data[i].lot_qty });
                    var need_rate = ir_data[i].rate ? ir_data[i].rate * (1 + transaction_coefficient) : 0;
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: need_rate });
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_including_tax_amt', value: need_rate });
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: ir_data[i].tax_code });
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_origin_sku', value: ir_data[i].sku });
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_country_code', value: ir_data[i].country });
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_loc_type', value: ir_data[i].location_type });
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_us_districts', value: ir_data[i].region });
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_grade', value: ir_data[i].yl1 });
                    po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_store', value: ir_data[i].customer });
                    po_data.commitLine({ sublistId: 'item' });
                }
                var poId = po_data.save({ ignoreMandatoryFields: true });
                if (!poId) {
                    log.error('PO save failed', { poId });
                    return;
                }
                log.debug('PO created', poId);
                //创建公司间交易 SO
                var soRec = record.create({
                    type: record.Type.SALES_ORDER,
                    isDynamic: true,
                    defaultValues: { autogeneratedfromicq: 'T' }
                });
                // 客户：店铺子公司 + 'IC-'
                soRec.setText({ fieldId: 'entity', text: 'IC-' + shop_info.sub_code });

                // 子公司：转移单子公司
                soRec.setValue({ fieldId: 'subsidiary', value: sub_id });

                // 地点：转移单至地点
                soRec.setValue({ fieldId: 'location', value: loc_id });

                // 关联 PO
                soRec.setValue({ fieldId: 'intercotransaction', value: poId });

                soRec.setValue({ fieldId: 'orderstatus', value: 'B' });
                var lots = {}, soLine = 1;
                for (var i = 0; i < ir_data.length; i++) {
                    lots[soLine] = ir_data[i].lot_num;
                    soLine++;
                    soRec.selectNewLine({ sublistId: 'item' });
                    soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: ir_data[i].item_id });
                    soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: ir_data[i].lot_qty });
                    var need_rate = ir_data[i].rate ? ir_data[i].rate * (1 + transaction_coefficient) : 0;
                    soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: need_rate });
                    soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_including_tax_amt', value: need_rate });
                    soRec.commitLine({ sublistId: 'item' });
                }
                var soId = soRec.save({ ignoreMandatoryFields: true });
                if (!soId) {
                    log.error('SO save failed', { soId });
                    return;
                }
                log.debug('SO created', soId);
                //创建货品履行
                const ifRec = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    fromId: soId,
                    toType: record.Type.ITEM_FULFILLMENT,
                    isDynamic: true
                });

                ifRec.setValue({ fieldId: 'shipstatus', value: 'C' }); // Shipped

                const sublistId = 'item';
                const lineCount = ifRec.getLineCount({ sublistId }) || 0;
                var lineNo = 1;
                for (let i = 0; i < lineCount; i++) {
                    ifRec.selectLine({ sublistId, line: i });
                    ifRec.setCurrentSublistValue({ sublistId, fieldId: 'itemreceive', value: true });
                    const lotNums = lots[lineNo];
                    lineNo++;
                    // 数量：用真实数量（不要再写死 1）
                    const qty = Number(ifRec.getCurrentSublistValue({ sublistId, fieldId: 'quantity' })) || 0;
                    ifRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'quantity', value: qty }); // 测试用 TODO
                    ifRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'location', value: loc_id });
                    if (lotNums.length > 0) {
                        const inventorydetail = ifRec.getCurrentSublistSubrecord({ sublistId, fieldId: 'inventorydetail' });
                        inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                        inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', text: lotNums });
                        inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: qty });
                        inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                    }
                    ifRec.commitLine({ sublistId });
                }

                const ifId = ifRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
                log.debug('SO -> IF 做成', ifId);
                // 2) SO -> Invoice
                const invRec = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    fromId: soId,
                    toType: record.Type.INVOICE,
                    isDynamic: false
                });

                const invId = invRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
                log.debug('SO -> Invoice 做成', invId);

                // 3) 新公司间交易 PO -> Item Receipt
                const irRec = record.transform({
                    fromType: record.Type.PURCHASE_ORDER,
                    fromId: poId,
                    toType: record.Type.ITEM_RECEIPT,
                    isDynamic: true
                });

                const irLineCount = irRec.getLineCount({ sublistId }) || 0;
                for (let i = 0; i < irLineCount; i++) {
                    irRec.selectLine({ sublistId, line: i });
                    irRec.setCurrentSublistValue({ sublistId, fieldId: 'itemreceive', value: true });
                    const poLineNo = irRec.getCurrentSublistValue({ sublistId, fieldId: 'custcol_swc_line_no' });
                    const lotNum = lots[poLineNo];
                    const qty1 = Number(irRec.getCurrentSublistValue({ sublistId, fieldId: 'quantity' })) || 0;
                    irRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'quantity', value: qty1 });
                    if (lotNum) {
                        const inventorydetail1 = irRec.getCurrentSublistSubrecord({ sublistId, fieldId: 'inventorydetail' });
                        inventorydetail1.selectNewLine({ sublistId: 'inventoryassignment' });
                        inventorydetail1.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', text: lotNum });
                        inventorydetail1.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: qty1 });
                        inventorydetail1.commitLine({ sublistId: 'inventoryassignment' });
                    }
                    irRec.commitLine({ sublistId });
                }
                const irId = irRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
                log.debug('PO -> IR 做成', irId);

                //将已创建的PO关联到对应的货品收据上
                var rec_ir = record.submitFields({
                    type: 'itemreceipt',
                    id: ir_id,
                    values: {
                        custbody_swc_correlation_nb_po: poId
                    }
                });
                if (rec_ir) {
                    log.error('success', '关联反写成功' + rec_ir);
                }
                //将已创建的PO回写到对应的贸易条款记录上
                var tk_t_data = record.load({ type: 'customrecord_swc_wl_tk_t', id: tk_id, isDynamic: true });
                var qg_bill_info = tk_t_data.getValue('custrecord_wl_tk_t_qg_t') || [];
                qg_bill_info.push(poId);
                qg_bill_info.push(soId);
                tk_t_data.setValue('custrecord_wl_tk_t_qg_t', qg_bill_info);
                var tk_t_data_id = tk_t_data.save({ ignoreMandatoryFields: true });
                if (tk_t_data_id) {
                    log.error('success', '关联贸易条款反写成功' + tk_t_data_id);
                }
            } else {
                log.debug('e', '未匹配到对应的贸易条款单据信息');
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    //查询
    function getTransactionCoefficient(jyll_id) {
        var additive_ratio = 0;
        if (jyll_id) {
            search.create({
                type: "customrecord_swc_transaction_link_confi",
                filters:
                    [
                        ["custrecord_swc_main_config", "anyof", jyll_id],
                        "AND",
                        ["custrecord_swc_button", "anyof", "@NONE@"],
                        "AND",
                        ["custrecord_swc_is_auto", "is", "F"],
                        "AND",
                        ["custrecord_swc_generated_according", "is", "T"],
                        "AND",
                        ["custrecord_swc_warehouse_attributes", "anyof", "12"],
                        "AND",
                        ["custrecord_swc_jy_document_type", "anyof", "2"]
                    ],
                columns:
                    [
                        'custrecord_swc_jy_price_factor',
                        { name: 'custrecord_swc_execution_order', sort: 'DESC' }
                    ]
            }).run().each(function (result) {
                additive_ratio = result.getValue(result.columns[0]) ? Number(result.getValue(result.columns[0]).replace('%', '')) / 100 : 0;
                return false;
            });
        }
        return additive_ratio;
    }

    function getTkInfo(previous_to_id, terms_of_trade) {
        var rec_data = {};
        search.create({
            type: "customrecord_swc_wl_tk_t",
            filters:
                [
                    ["custrecord_wl_tk_t_qg_t", "anyof", previous_to_id],
                    "AND",
                    ["isinactive", "is", "F"]
                ],
            columns:
                [
                    'custrecord_wl_tk_t_g_t',//供应商已出货
                    'custrecord_wl_tk_t_bg_t',//已报关
                    'custrecord_wl_tk_t_qg_t',//已清关
                    'custrecord_wl_tk_t_po',//关联采购单
                    'custrecord_wl_tk_t_customer',//店铺
                    'custrecord_wl_tk_t_jyll'//交易链路
                ]
        }).run().each(function (result) {
            var t_g_t = result.getValue(result.columns[0]) || '';
            var t_bg_t = result.getValue(result.columns[1]) || '';
            var qg_t = result.getValue(result.columns[2]) || '';
            var t_po = result.getValue(result.columns[3]) || '';
            var shop_id = result.getValue(result.columns[4]) || '';
            rec_data.tk_id = result.id;
            var po_id;
            if (terms_of_trade == 1) {//EXW
                po_id = t_g_t ? t_g_t.split(',')[0] : '';
            } else if (terms_of_trade == 2) {//国内FOB
                po_id = t_bg_t ? t_bg_t.split(',')[0] : '';
            } else if (terms_of_trade == 3) {//DDP
                po_id = qg_t ? qg_t.split(',')[0] : '';
            } else if (terms_of_trade == 4) {//DDU
                po_id = qg_t ? qg_t.split(',')[0] : '';
            } else if (terms_of_trade == 5) {//海外FOB
                po_id = t_po ? t_po : '';
            }
            rec_data.po_id = po_id;
            rec_data.shop_id = shop_id;
            rec_data.jyll_id = result.getValue(result.columns[5]) ? result.getValue(result.columns[5]) : '';
            return false;
        });
        return rec_data;
    }

    function getShopInfo(loc_id, warehouse_code) {
        var info_data = {};
        var loc_data = record.load({ type: 'location', id: loc_id, isDynamic: false });
        var shop_id = loc_data.getValue('custrecord_swc_location_store');
        if (shop_id) {
            var shop_info = search.lookupFields({ type: 'customer', id: shop_id, columns: ['subsidiarynohierarchy'] });
            info_data.sub_id = shop_info.subsidiarynohierarchy[0].value;
            info_data.sub_code = shop_info.subsidiarynohierarchy[0].text;
            //使用店铺、店铺子公司、仓库属性、海外仓代码获取对应的店铺虚拟仓
            var filters_arr = [];
            filters_arr.push(["custrecord_swc_location_store", "anyof", shop_id]);
            filters_arr.push('AND', ["custrecord_swc_location_attribute", "anyof", 12]);
            filters_arr.push('AND', ["subsidiary", "anyof", info_data.sub_id]);
            filters_arr.push('AND', ["isinactive", "is", false]);
            filters_arr.push('AND', ["custrecord_swc_warehouse_code", "anyof", warehouse_code]);
            var locSearch = search.create({ type: "location", filters: filters_arr, columns: [search.createColumn({ name: "internalid" })] });
            var rs = locSearch.run().getRange({ start: 0, end: 1 });
            if (!rs || rs.length === 0) return {};
            info_data.loc_id = rs[0].getValue({ name: 'internalid' });
            return info_data || {};
        }
        return info_data;
    }

    function getIrData(ir_id) {
        var ir_item_arr = [], sublist_id = 'item';
        var ir_data = record.load({ type: 'itemreceipt', id: ir_id, isDynamic: false });
        var bill_line_count = ir_data.getLineCount(sublist_id);
        for (var i = 0; i < bill_line_count; i++) {
            var item_id = ir_data.getSublistValue({ sublistId: sublist_id, fieldId: 'item', line: i });
            var inventorydetail = ir_data.getSublistSubrecord({ sublistId: sublist_id, fieldId: 'inventorydetail', line: i });
            var boxSubLineCount = inventorydetail.getLineCount({ sublistId: 'inventoryassignment' });
            if (boxSubLineCount > 0) {
                for (var j = 0; j < boxSubLineCount; j++) {
                    var lot_num = inventorydetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', line: j });
                    var lot_qty = inventorydetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j });
                    ir_item_arr.push({
                        item_id: item_id,
                        lot_num: lot_num,
                        lot_qty: lot_qty,
                        yl: '',
                        sku: '',
                        country: '',
                        location_type: '',
                        region: '',
                        rate: '',
                        tax_code: ''
                    });
                }
            }
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
