/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * CG - 转移单
 */
define(['N/runtime', 'N/log', 'N/record', 'N/error', 'N/search', '../common/SWC_CONFIG_DATA', 'N/currency'], function (runtime, log, record, error, search, SWC_CONFIG_DATA, currency) {

    const PARAM_PAYLOAD = 'custscript_swc_cg_shipment_payload';
    const RECORD_TYPE_WL_PLAN_ORDER = 'customrecord_swc_wl_plan_order';
    const RECORD_TYPE_WL_PLAN_ORDER_DETAIL = 'recmachcustrecord_swc_wl_plan_order_id';
    const RECORD_TYPE_WL_PLAN_TK = 'recmachcustrecord_wl_tk_t_wl_id';
    const FIELD_CURRENT_STEP = 'custrecord_swc_wl_mytk_zx_no';
    const FIELD_ERROR_MESSAGE = 'custrecord_my_tk_error_message';
    const FIELD_WL_STATUS = 'custrecord_swc_wl_tk_status';
    let error_data = {};
    const CONFIG = SWC_CONFIG_DATA.configData();
    let is_error = false;

    function getInputData() {
        let recId;
        try {
            const payload = getExecutionPayload();
            log.audit('payload entered', payload);
            if (!payload || !Object.keys(payload).length) {
                throw error.create({ name: 'error', message: 'mr脚本未接收到入参', notifyOff: false });
            }
            //数据结构按照店铺维度进行区分
            const need_info = {};
            recId = payload.recId || '';
            if (!recId) {
                throw error.create({ name: 'error', message: 'SWC_MR_CG_SHIPMENT getInputData: 缺少 recId', notifyOff: false });
            }
            //获取物流发运信息
            const wlRec = record.load({ type: RECORD_TYPE_WL_PLAN_ORDER, id: recId, isDynamic: false });
            const md_location = wlRec.getValue('custrecord_swc_md_location');//目的仓仓库代码
            const terms_of_trade = wlRec.getValue('custrecord_swc_wl_terms_of_trade');//成交方式
            const md_county = wlRec.getValue('custrecord_swc_wl_county_lsit');//运抵国
            //获取物流发运明细信息
            const lineCount = wlRec.getLineCount(RECORD_TYPE_WL_PLAN_ORDER_DETAIL) || 0;
            if (lineCount > 0) {
                const shop_ids = [];
                for (let i = 0; i < lineCount; i++) {
                    const poId = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_po_num', line: i });
                    const shopId = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_customer', line: i });
                    const skuId = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_sku', line: i });
                    const superiorQty = toNumber(wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: i })) || 0;
                    const goodQty = toNumber(wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: i })) || 0;
                    const vendorId = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_vendor', line: i });
                    const lotNum = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_lot', line: i });

                    const trailer_fee = toNumber(wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_trailer_fee', line: i })) || 0;
                    const trailer_fee_currency = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_trailer_fee_c', line: i }) || '';
                    const cda_fee = toNumber(wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_cda_fee', line: i })) || 0;
                    const cda_fee_currency = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_cda_fee_c', line: i }) || '';
                    const em_ffc = toNumber(wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_ffc', line: i })) || 0;
                    const em_ffc_currency = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_ffc_c', line: i }) || '';
                    const bxf_fee = toNumber(wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_bxf_fee', line: i })) || 0;
                    const bxf_fee_currency = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_bxf_fee_c', line: i }) || '';
                    const hyf_fee = toNumber(wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_hyf_fee', line: i })) || 0;
                    const hyf_fee_currency = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_hyf_fee_c', line: i }) || '';
                    const qgf_fee = toNumber(wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_qgf_fee', line: i })) || 0;
                    const qgf_fee_currency = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_qgf_fee_c', line: i }) || '';
                    const jkgs_fee = toNumber(wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_jkgs_fee', line: i })) || 0;
                    const jkgs_fee_currency = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_jkgs_fee_c', line: i }) || '';
                    const hdf_fee = toNumber(wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_hdf_fee', line: i })) || 0;
                    const hdf_fee_currency = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_hdf_fee_c', line: i }) || '';
                    const tcf_fee = toNumber(wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_tcf_fee', line: i })) || 0;
                    const tcf_fee_currency = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_tcf_fee_c', line: i }) || '';
                    const rkcz = toNumber(wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_rkcz_fee', line: i })) || 0;
                    const rkcz_currency = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_em_rkcz_fee_c', line: i }) || '';

                    const qty = (Number(superiorQty) || 0) + (Number(goodQty) || 0);
                    if (qty <= 0) continue;
                    if (shopId && shop_ids.indexOf(shopId) == -1) {
                        shop_ids.push(shopId);
                    }
                    const line_items = {};
                    line_items.sku = skuId;
                    line_items.qty = qty;
                    line_items.lotNum = lotNum;
                    line_items.gys = vendorId;
                    line_items.trailer_fee = trailer_fee;
                    line_items.cda_fee = cda_fee;
                    line_items.em_ffc = em_ffc;
                    line_items.bxf_fee = bxf_fee;
                    line_items.hyf_fee = hyf_fee;
                    line_items.qgf_fee = qgf_fee;
                    line_items.jkgs_fee = jkgs_fee;
                    line_items.hdf_fee = hdf_fee;
                    line_items.tcf_fee = tcf_fee;
                    line_items.rkcz = rkcz;
                    line_items.trailer_fee_currency = trailer_fee_currency;
                    line_items.cda_fee_currency = cda_fee_currency;
                    line_items.em_ffc_currency = em_ffc_currency;
                    line_items.bxf_fee_currency = bxf_fee_currency;
                    line_items.hyf_fee_currency = hyf_fee_currency;
                    line_items.qgf_fee_currency = qgf_fee_currency;
                    line_items.jkgs_fee_currency = jkgs_fee_currency;
                    line_items.hdf_fee_currency = hdf_fee_currency;
                    line_items.tcf_fee_currency = tcf_fee_currency;
                    line_items.rkcz_currency = rkcz_currency;
                    const key = shopId + '_' + poId;
                    need_info[key] = need_info[key] || {};
                    need_info[key]['wl_id'] = recId;
                    need_info[key]['shop_id'] = shopId;
                    need_info[key]['md_loc_id'] = md_location;
                    need_info[key]['terms_of_trade'] = terms_of_trade;
                    need_info[key]['md_county'] = md_county;
                    need_info[key]['po_id'] = poId;
                    need_info[key]['tk_id'] = '';
                    need_info[key]['shop_sub_id'] = '';
                    need_info[key]['step_row'] = '';
                    need_info[key]['line_item_arr'] = need_info[key]['line_item_arr'] || [];
                    need_info[key]['line_item_arr'].push(line_items);
                }
                if (!shop_ids.length) {
                    throw error.create({ name: 'error', message: recId + '物流发运行未获取到对应的店铺信息', notifyOff: false });
                }
                log.debug('shop_ids', shop_ids);
                //获取店铺子公司
                const shop_info = getShopInfo(shop_ids);
                log.debug('店铺公司信息', shop_info);
                //执行路径
                const stepRows = payload.currentStepRows;
                for (let i in need_info) {
                    need_info[i]['shop_sub_id'] = shop_info[need_info[i].shop_id];
                    for (let j = 0; j < stepRows.length; j++) {
                        if (need_info[i]['shop_sub_id'] == stepRows[j].shopSubId) {
                            need_info[i]['step_row'] = stepRows[j];
                        }
                    }
                }
                //获取贸易条款单据明细
                const tkLineCount = wlRec.getLineCount(RECORD_TYPE_WL_PLAN_TK) || 0;
                if (tkLineCount > 0) {
                    const tk_info = {};
                    for (let i = 0; i < tkLineCount; i++) {
                        const tk_id = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_TK, fieldId: 'id', line: i });
                        const cus_id = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_TK, fieldId: 'custrecord_wl_tk_t_customer', line: i });
                        const po_id = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_TK, fieldId: 'custrecord_wl_tk_t_po', line: i });
                        tk_info[cus_id + '_' + po_id] = tk_id;
                    }
                    if (Object.keys(tk_info).length > 0) {
                        for (let i in need_info) {
                            need_info[i]['tk_id'] = tk_info[i];
                        }
                    }
                }
            } else {
                throw error.create({ name: 'error', message: recId + '物流发运没有明细行信息', notifyOff: false });
            }
            log.debug('need_info', need_info);
            log.debug('need_info.length', Object.keys(need_info).length);
            return need_info;
        } catch (e) {
            log.debug('e', e);
            if (recId) {
                record.submitFields({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: recId,
                    values: {
                        custrecord_my_tk_error_message: e.message
                    }
                });
            }
            throw e;
        }
    }

    function getShopInfo(shop_ids) {
        const shop_sub = {};
        search.create({
            type: 'customer',
            filters: [
                ['internalid', 'anyof', shop_ids]
            ],
            columns: [
                'subsidiary'
            ]
        }).run().each(function (rec) {
            const cus_id = rec.id;
            const sub_id = rec.getValue(rec.columns[0]);
            shop_sub[cus_id] = sub_id;
            return true;
        });
        return shop_sub;
    }

    function toNumber(v) {
        const n = Number(v);
        return isNaN(n) ? null : n;
    }

    function map(context) {
        const value = JSON.parse(context.value);
        log.debug('value', value);
        const shop_id = value.shop_id;//店铺ID
        log.debug('shop_id', shop_id);
        const wl_id = value.wl_id;//物流发运ID
        const md_loc_id = value.md_loc_id;//目的仓仓库代码
        const terms_of_trade = value.terms_of_trade;//成交方式
        const md_county = value.md_county;//运抵国
        const tk_id = value.tk_id;//贸易条款ID
        const po_id = value.po_id;//采购订单ID
        const shop_sub_id = value.shop_sub_id;//店铺子公司
        const step_row = value.step_row;//执行顺序
        const line_item_arr = value.line_item_arr;//行信息
        let toId = '';
        let ifId = '';
        let irId = '';
        let tkId = '';
        try {
            // 先聚合（按 sku + lot 汇总数量，并按 sku 汇总费用）
            const agg = aggregateLines(line_item_arr, terms_of_trade, step_row, step_row['startSubId']);
            log.debug('agg', agg);
            const items = agg.items || {};
            log.debug('items', items);
            //获取起始仓信息(判断是否已经生成贸易条款，若没有生成则默认取PO对应的仓库，否则获取前一步生成的单据对应的仓库)
            let from_loc_id;
            if (!tk_id) {
                const poRec = record.load({ type: record.Type.PURCHASE_ORDER, id: po_id, isDynamic: false });
                from_loc_id = poRec.getValue('location');
            } else {
                //获取前一步已生成单据信息
                from_loc_id = getPreviousStepInfo(tk_id);
            }
            //获取目的仓信息(根据店铺+TO子公司+执行顺序中的目的仓库属性（目的仓为平台仓的时候需要再加上目的仓仓库代码的条件）)
            let to_loc_id = findToLocation(shop_id, step_row['startSubId'], step_row, md_loc_id);
            log.debug('from_loc_id', from_loc_id);
            log.debug('to_loc_id', to_loc_id);
            // 创建 TO
            const toRec = record.create({ type: record.Type.TRANSFER_ORDER, isDynamic: true });
            //获取执行顺序中的子公司
            toRec.setValue('subsidiary', step_row['startSubId']);
            toRec.setValue('location', from_loc_id);
            toRec.setValue('transferlocation', to_loc_id);
            toRec.setValue('orderstatus', 'B');
            toRec.setValue('incoterm', 1);
            toRec.setValue('useitemcostastransfercost', true);
            toRec.setValue('custbody_swc_wl_no', wl_id);
            //创建行信息
            let toItemObj = {};
            let skuData = [];
            // 写入 item 行（按聚合后的 sku）
            for (const skuId in items) {
                if (skuData.indexOf(skuId) == -1) {
                    skuData.push(skuId);
                }
                if (!items.hasOwnProperty(skuId)) continue;
                const lotMap = items[skuId].lot || {};
                let lineQty = 0;
                for (const lotText in lotMap) {
                    if (!lotMap.hasOwnProperty(lotText)) continue;
                    lineQty += Number(lotMap[lotText] || 0);
                }
                if (lineQty <= 0) continue;
                toRec.selectNewLine({ sublistId: 'item' });
                toRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: skuId });
                toRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: lineQty });
                if (step_row['buttonId'] != 3) {//已清关
                    // inventorydetail：按批次拆分
                    const invDetail = toRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
                    // 如果 lotText 为空，说明非批次物料（或你不想分配批次），就不写 inventoryassignment
                    const lotKeys = Object.keys(lotMap || {});
                    const hasAnyLot = lotKeys.some(k => String(k || '').trim() !== '');
                    if (hasAnyLot) {
                        for (const lotText in lotMap) {
                            if (!lotMap.hasOwnProperty(lotText)) continue;
                            const q = Number(lotMap[lotText] || 0);
                            if (q <= 0) continue;
                            if (!String(lotText || '').trim()) continue;
                            invDetail.selectNewLine({ sublistId: 'inventoryassignment' });
                            invDetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', text: String(lotText) });
                            invDetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: q });
                            invDetail.commitLine({ sublistId: 'inventoryassignment' });
                        }
                    }
                }
                toItemObj[skuId] = toRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'amount' });
                toRec.commitLine({ sublistId: 'item' });
            }
            toId = toRec.save({ ignoreMandatoryFields: true });
            error_data[toId] = error_data[toId] || {};
            error_data[toId]['to_id'] = toId;
            error_data[toId]['if_id'] = ifId;
            error_data[toId]['ir_id'] = irId;
            error_data[toId]['tk_id'] = tkId;
            log.debug('TO created', toId);
            if (step_row['buttonId'] != 3 && step_row['warehouseAttribute'] != CONFIG.s_attribute_bsc) {//不为已清关或仓库属性为保税仓
                //创建发货单
                const ifRec = record.transform({
                    fromType: record.Type.TRANSFER_ORDER,
                    fromId: toId,
                    toType: record.Type.ITEM_FULFILLMENT,
                    isDynamic: true
                });
                ifRec.setValue({ fieldId: 'shipstatus', value: 'C' });
                ifId = ifRec.save({ ignoreMandatoryFields: true });
                error_data[toId]['if_id'] = ifId;
                log.debug('IF created', ifId);

                //创建收货单
                //收获前获取货品 到岸成本相关数据
                let taxCodeObj = getTaxCodeObj();
                let itemObj = getItemObj(skuData, taxCodeObj);
                const feeMaping = {
                    trailer_fee: 27,
                    cda_fee: 28,
                    em_ffc: 29,
                    bxf_fee: 30,
                    hyf_fee: 31,
                    qgf_fee: 32,
                    jkgs_fee: 33,
                    hdf_fee: 34,
                    tcf_fee: 35,
                    rkcz: 45
                };
                // IR：收货
                const irRec = record.transform({
                    fromType: record.Type.TRANSFER_ORDER,
                    fromId: toId,
                    toType: record.Type.ITEM_RECEIPT,
                    isDynamic: true
                });
                irRec.setValue({ fieldId: 'landedcostperline', value: true });
                //设置到岸成本
                var itemCount = irRec.getLineCount({ sublistId: 'item' });
                for (let i = 0; i < itemCount; i++) {
                    irRec.selectLine({ sublistId: 'item', line: i });
                    var irItem = irRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    var fee_info = items[irItem].fee || {};
                    if (Object.keys(fee_info).length > 0) {
                        const landed = irRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'landedcost' });
                        for (let j in fee_info) {
                            if (Number(fee_info[j]) > 0) {
                                landed.selectNewLine({ sublistId: 'landedcostdata' });
                                landed.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: feeMaping[j] });
                                landed.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'amount', value: fee_info[j] });
                                landed.commitLine({ sublistId: 'landedcostdata' });
                            }
                        }
                    }
                    irRec.commitLine({ sublistId: 'item' });
                }
                irId = irRec.save({ ignoreMandatoryFields: true });
                error_data[toId]['ir_id'] = irId;
                log.debug('IR created', irId);
            }
            //回写物流发运贸易条款单据
            let result_to_ids = [];
            //需要根据执行顺序判断将单据写进哪个字段
            let field_name;
            if (step_row['buttonId'] == 1) {//供应商已出货
                field_name = 'custrecord_wl_tk_t_g_t';
            } else if (step_row['buttonId'] == 2) {//已报关
                field_name = 'custrecord_wl_tk_t_bg_t';
            } else if (step_row['buttonId'] == 3) {//已清关
                field_name = 'custrecord_wl_tk_t_qg_t';
            }
            let tkRec;
            if (tk_id) {
                tkRec = record.load({ type: 'customrecord_swc_wl_tk_t', id: tk_id, isDynamic: true });
                const line_bill_ids = tkRec.getValue(field_name);
                result_to_ids = Array.isArray(line_bill_ids) ? line_bill_ids : [line_bill_ids];
                result_to_ids.push(toId);
            } else {
                tkRec = record.create({ type: 'customrecord_swc_wl_tk_t', isDynamic: true });
                tkRec.setValue('custrecord_wl_tk_t_wl_id', wl_id);
                tkRec.setValue('custrecord_wl_tk_t_cf', terms_of_trade);
                tkRec.setValue('custrecord_wl_tk_t_jyll', step_row['configId']);
                tkRec.setValue('custrecord_wl_tk_t_md', md_county);
                tkRec.setValue('custrecord_wl_tk_t_customer', shop_id);
                tkRec.setValue('custrecord_wl_tk_t_po', po_id);
                result_to_ids.push(toId);
            }
            result_to_ids.length > 0 ? tkRec.setValue(field_name, result_to_ids) : '';
            const tkRecId = tkRec.save();
            if (tkRecId) {
                log.debug('success', '贸易条款单据创建/更新成功');
                if (!tk_id) {
                    error_data[toId]['tk_id'] = tkRecId;
                }
            }
            log.debug('is_error', is_error);
            if (is_error) {
                log.debug('error_data1', error_data);
                if (Object.keys(error_data).length > 0) {
                    for (let i in error_data) {
                        context.write(i, error_data[i]);
                    }
                }
            }
        } catch (e) {
            log.debug('e', e);
            log.debug('error_data', error_data);
            // if (toId) {
            //     error_data[toId] = error_data[toId] || {};
            //     error_data[toId]['to_id'] = toId;
            //     error_data[toId]['if_id'] = ifId;
            //     error_data[toId]['ir_id'] = irId;
            // }
            is_error = true;
            if (Object.keys(error_data).length > 0) {
                for (let i in error_data) {
                    context.write(i, error_data[i]);
                }
            }
            if (wl_id) {
                record.submitFields({
                    type: RECORD_TYPE_WL_PLAN_ORDER,
                    id: wl_id,
                    values: {
                        custrecord_my_tk_error_message: e.message
                    }
                });
            }
            throw e;
        }
    }

    function getSubsidiaryCurrency(subsidiaryId) {
        var subsidiaryInfo = search.lookupFields({
            type: 'subsidiary',
            id: subsidiaryId,
            columns: ['currency']
        }) || {};
        var currencyId = '';
        if (subsidiaryInfo.currency && subsidiaryInfo.currency[0] && subsidiaryInfo.currency[0].value) {
            currencyId = subsidiaryInfo.currency[0].value;
        }
        return currencyId;
    }

    function getExchangeRate(currencyId, ven_curr_id) {
        if (!currencyId || !ven_curr_id) {
            return 1;
        }
        return Number(currency.exchangeRate({
            source: currencyId,
            target: ven_curr_id,
            date: new Date()
        })) || 1;
    }

    function getPreviousStepInfo(tk_id) {
        let need_loc;
        let ids = [];
        search.create({
            type: 'customrecord_swc_wl_tk_t',
            filters:
                [
                    ['internalid', 'anyof', tk_id]
                ],
            columns:
                [
                    'custrecord_wl_tk_t_g_t',
                    'custrecord_wl_tk_t_bg_t',
                    'custrecord_wl_tk_t_qg_t'
                ]
        }).run().each(function (result) {
            if (result.getValue(result.columns[0])) {
                const g_t_arr = result.getValue(result.columns[0]).split(',');
                if (g_t_arr.length > 0) {
                    ids = ids.concat(g_t_arr);
                }
            }
            if (result.getValue(result.columns[1])) {
                const t_bg_t_arr = result.getValue(result.columns[1]).split(',');
                if (t_bg_t_arr.length > 0) {
                    ids = ids.concat(t_bg_t_arr);
                }
            }
            if (result.getValue(result.columns[2])) {
                const t_qg_t_arr = result.getValue(result.columns[2]).split(',');
                if (t_qg_t_arr.length > 0) {
                    ids = ids.concat(t_qg_t_arr);
                }
            }
            return false;
        });
        log.debug('上一步生成的对应单据', ids);
        let to_id;
        let po_id;
        if (ids.length > 0) {
            search.create({
                type: 'transaction',
                filters:
                    [
                        ['internalid', 'anyof', ids],
                        'AND',
                        ['mainline', 'is', 'T']
                    ],
                columns:
                    [
                        search.createColumn({ name: 'internalid', sort: 'DESC', label: '内部 ID' }),
                        search.createColumn({ name: 'type', label: '类型' })
                    ]
            }).run().each(function (result) {
                const bill_type = result.getValue(result.columns[1]);
                if (bill_type == 'TrnfrOrd') {
                    to_id = result.id;
                    return false;
                }
                if (bill_type == 'PurchOrd') {
                    po_id = result.id;
                    return false;
                }
                return true;
            });
        }
        if (to_id) {
            const to_info = record.load({ type: record.Type.TRANSFER_ORDER, id: to_id, isDynamic: false });
            need_loc = to_info.getValue('transferlocation');
        }
        if (po_id) {
            const po_info = record.load({ type: record.Type.PURCHASE_ORDER, id: po_id, isDynamic: false });
            need_loc = po_info.getValue('location');
        }
        return need_loc;
    }

    function getItemObj(items, taxCodeObj) {
        const itemSearchObj = search.create({
            type: "item",
            filters:
                [
                    ["internalid", "anyof", items],
                    "AND",
                    ["custitem_swc_tax_refund_rate1", "isnotempty", ""]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "内部 ID" }),
                    search.createColumn({ name: "custitem_swc_tax_refund_rate1", label: "退税率1" }),
                    search.createColumn({ name: "taxschedule", label: "税务计划" })
                ]
        });

        var obj = {};
        var taxData = [];
        itemSearchObj.run().each(function (result) {
            var tax = result.getValue({ name: "taxschedule", label: "税务计划" });
            if (taxData.indexOf(tax) == -1 && tax)
                taxData.push(tax);
            obj[result.id] = {
                rate: result.getValue({ name: "custitem_swc_tax_refund_rate1", label: "退税率1" }),
                tax: tax,
            }
            return true;
        });

        var scheduleObj = {};

        if (taxData.length > 0) {
            for (let i = 0; i < taxData.length; i++) {
                var taxRec = record.load({
                    type: 'taxschedule',
                    id: taxData[i],
                    isDynamic: true
                });
                var taxCode = taxRec.getSublistValue({
                    sublistId: 'nexuses',
                    fieldId: 'salestaxcode',
                    line: 0
                });
                if (taxCode in taxCodeObj) {
                    scheduleObj[taxData[i]] = taxCodeObj[taxCode];
                } else {
                    scheduleObj[taxData[i]] = 0;
                }
            }
        }

        for (let key in obj) {
            if (obj[key].tax in scheduleObj)
                obj[key].tax = scheduleObj[obj[key].tax]
        }

        return obj;
    }

    function getTaxCodeObj() {
        const salestaxitemSearchObj = search.create({
            type: "salestaxitem",
            filters:
                [
                ],
            columns:
                [
                    search.createColumn({ name: "rate", label: "税率" }),
                    search.createColumn({ name: "internalid", label: "内部 ID" })
                ]
        });
        var obj = {};
        salestaxitemSearchObj.run().each(function (result) {
            obj[result.id] = result.getValue({ name: "rate", label: "税率" });
            // .run().each has a limit of 4,000 results
            return true;
        });
        return obj;
    }

    function aggregateLines(line_item_arr, terms_of_trade, step_row, start_sub_id) {
        let feeFields;
        const to_curr_id = getSubsidiaryCurrency(start_sub_id);
        if (terms_of_trade == '2') {// 国内FOB
            feeFields = ['trailer_fee', 'cda_fee', 'em_ffc'];
        } else if (terms_of_trade == '5') { // 海外FOB
            feeFields = ['bxf_fee', 'hyf_fee', 'qgf_fee', 'jkgs_fee', 'hdf_fee', 'tcf_fee', 'rkcz'];
        }

        const out = { gys: null, items: {} };

        for (let i = 0; i < (line_item_arr || []).length; i++) {
            const ln = line_item_arr[i] || {};
            const sku = String(ln.sku || '').trim();
            const lot = String(ln.lotNum || '').trim();
            const qty = Number(ln.qty || 0);
            if (!sku || qty <= 0) continue;

            if (out.gys === null && ln.gys) out.gys = String(ln.gys);

            if (!out.items[sku]) {
                out.items[sku] = { lot: {}, fee: {}, feeCurrency: {} };
                for (let f = 0; f < feeFields.length; f++) out.items[sku].fee[feeFields[f]] = 0;
            }

            if (!out.items[sku].lot[lot]) out.items[sku].lot[lot] = 0;
            out.items[sku].lot[lot] += qty;

            if (CONFIG.VENDOR_ID_SKIP_TRANSFER_LANDED_COST != ln.gys) {
                for (let f = 0; f < feeFields.length; f++) {
                    const field = feeFields[f];
                    const exchangeRate = getExchangeRate(ln[field + '_currency'], to_curr_id);
                    out.items[sku].fee[field] += Number(ln[field] || 0) * exchangeRate;
                }
            }
        }
        return out;
    }

    function findToLocation(shop_id, shop_sub_id, step_row, md_loc_id) {
        let loc_id;
        const filters_arr = [
            ['custrecord_swc_location_store', 'anyof', shop_id],//备货维度
            'AND',
            ['subsidiary', 'anyof', shop_sub_id],//子公司
            'AND',
            ['isinactive', 'is', false],//非活动
            'AND',
            ['custrecord_swc_location_attribute', 'anyof', step_row['warehouseAttribute']],//仓库属性
            // 'AND',
            // ['custrecord_swc_location_type', 'anyof', 3]//仓库类型
        ];
        if (step_row['warehouseAttribute'] == CONFIG.s_attribute_ptc) {//目的仓仓库属性为平台仓
            filters_arr.push('AND', ['custrecord_swc_warehouse_code', 'anyof', md_loc_id]);
        }
        search.create({
            type: 'location',
            filters: filters_arr
        }).run().each(function (rec) {
            loc_id = rec.id;
            return false;
        });
        return loc_id;
    }

    function reduce(context) {
        try {
            //删除数据
            const values = JSON.parse(context.values[0]);
            log.debug('reduce context', values);
            const to_id = values.to_id;
            const if_id = values.if_id;
            const ir_id = values.ir_id;
            const tk_id = values.tk_id;
            //需要按顺序删除，先删除收据，再删履行单，最后删TO
            if (ir_id) {
                record.delete({ type: record.Type.ITEM_RECEIPT, id: ir_id });
                log.debug('delete itemreceipt', ir_id);
            }
            if (if_id) {
                record.delete({ type: record.Type.ITEM_FULFILLMENT, id: if_id });
                log.debug('delete itemfulfillment', if_id);
            }
            if (to_id) {
                record.delete({ type: record.Type.TRANSFER_ORDER, id: to_id });
                log.debug('delete transferorder', to_id);
            }
            if (tk_id) {
                record.delete({ type: 'customrecord_swc_wl_tk_t', id: tk_id });
                log.debug('delete customrecord_swc_wl_tk_t', tk_id);
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function summarize(summary) {
        var hasError = false;
        if (summary.inputSummary && summary.inputSummary.error) {
            log.error('input error', summary.inputSummary.error);
            hasError = true;
        }
        summary.mapSummary.errors.iterator().each((key, err) => {
            log.error('map error', { key, err });
            hasError = true;
            return true;
        });
        summary.reduceSummary.errors.iterator().each((key, err) => {
            log.error('reduce error', { key, err });
            hasError = true;
            return true;
        });
        if (!hasError) {
            try {
                const payload = getExecutionPayload();
                if (payload.recId) {
                    record.submitFields({
                        type: RECORD_TYPE_WL_PLAN_ORDER,
                        id: payload.recId,
                        values: (function () {
                            var values = {};
                            values[FIELD_WL_STATUS] = payload.buttonId;
                            if (!isNaN(payload.currentStep)) {
                                values[FIELD_CURRENT_STEP] = String(Number(payload.currentStep) + 1);
                            }
                            values[FIELD_ERROR_MESSAGE] = '';
                            return values;
                        })()
                    });
                }
            } catch (e) {
                log.error('summarize update status error', e);
            }
        }
        log.audit('summarize', {
            usage: summary.usage,
            concurrency: summary.concurrency,
            yields: summary.yields,
            hasError: hasError
        });
    }

    function getExecutionPayload() {
        const payloadText = runtime.getCurrentScript().getParameter({ name: PARAM_PAYLOAD }) || '{}';
        try {
            return JSON.parse(payloadText);
        } catch (e) {
            log.error('SWC_MR_CG_SHIPMENT getExecutionPayload error', e);
            return {};
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
