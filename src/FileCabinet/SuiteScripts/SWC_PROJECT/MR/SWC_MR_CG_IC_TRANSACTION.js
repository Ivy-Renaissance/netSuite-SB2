/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * CG - 公司间交易
 */
define(['N/runtime', 'N/log', 'N/record', 'N/error', 'N/search', 'N/currency', '../common/SWC_CONFIG_DATA'], function (runtime, log, record, error, search, currency, SWC_CONFIG_DATA) {

    const PARAM_PAYLOAD = 'custscript_swc_cg_ic_payload';
    const RECORD_TYPE_WL_PLAN_ORDER = 'customrecord_swc_wl_plan_order';
    const RECORD_TYPE_WL_PLAN_ORDER_DETAIL = 'recmachcustrecord_swc_wl_plan_order_id';
    const RECORD_TYPE_WL_PLAN_TK = 'recmachcustrecord_wl_tk_t_wl_id';
    const FIELD_CURRENT_STEP = 'custrecord_swc_wl_mytk_zx_no';
    const FIELD_ERROR_MESSAGE = 'custrecord_my_tk_error_message';
    const FIELD_WL_STATUS = 'custrecord_swc_wl_tk_status';
    let error_data = {};
    const COPY_LINE_ID = [//PO行对应字段
        'vendorname',
        'custcol_swc_pr_main_sku',
        'custcol_swc_bom_list',
        'rate',
        'custcol_swc_including_tax_amt',
        'custcol_swc_us_districts',
        'custcol_swc_po_line_test',
        'custcol_swc_is_update_price',
        'custcol_swc_old_unit_price',
        'custcol_swc_old_unit_price_tax',
        'custcol_swc_old_tax_code',
        'custcol_swc_msku',
        'custcol_swc_grade',
        'custcol_swc_poline_afterwards_key',
        'custcol_swc_poline_initial_key',
        'custcol_swc_beihuo_plan',
        'custcol_swc_us_districts',
        'custcol_swc_loc_type',
        'custcol_swc_country_code',
        'custcol_swc_store'
    ];
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
                    const sku = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_item', line: i });
                    const country = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_country', line: i });
                    const location_type = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_location_type', line: i });
                    const region = wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_region', line: i });

                    const superiorQty = toNumber(wlRec.getSublistValue({ sublistId: RECORD_TYPE_WL_PLAN_ORDER_DETAIL, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: i })) || 0;
                    // 优等/良品
                    const yl = superiorQty > 0 ? 1 : 2;

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
                    line_items.other_sku = sku;
                    line_items.country = country;
                    line_items.location_type = location_type;
                    line_items.region = region;
                    line_items.yl = yl;
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
        let po_id = value.po_id;//采购订单ID
        const shop_sub_id = value.shop_sub_id;//店铺子公司
        const step_row = value.step_row;//执行顺序
        const line_item_arr = value.line_item_arr;//行信息
        let so_loc;
        let newPoId = '';
        let soId = '';
        let ifId = '';
        let invId = '';
        let irId = '';
        let tkId = '';
        try {
            //获取PO单的价格（疑问。。。。。。。。。若生成公司间时，前面有几层公司间交易价格怎么获取，是否获取前一步的公司间PO的价格）
            const po_price_info = {};
            const sublistId = 'item';
            if (tk_id) {
                //判断最后生成的单据是否是TO，若是TO则公司间交易SO的仓库取目的仓，若不是TO则判断是否是公司间交易单据
                const tk_info = getPreviousStepInfo(tk_id);
                log.debug('tk_info', tk_info);
                if (Object.keys(tk_info).length > 0) {
                    if (tk_info['to_id']) {
                        const to_info = record.load({ type: record.Type.TRANSFER_ORDER, id: tk_info['to_id'], isDynamic: false });
                        so_loc = to_info.getValue('transferlocation');
                    }
                    if (tk_info['po_id']) {
                        po_id = tk_info['po_id'];
                    }
                }
            }
            log.debug('po_id', po_id);
            log.debug('so_loc', so_loc);
            const srcPo = record.load({ type: record.Type.PURCHASE_ORDER, id: po_id, isDynamic: false });
            srcPo.setValue('custbody_swc_wl_no', wl_id);
            if (!so_loc) {
                so_loc = srcPo.getValue('location');
            }
            const currencyId = srcPo.getValue('currency');
            const srcLineCount = srcPo.getLineCount({ sublistId }) || 0;
            for (let i = 0; i < srcLineCount; i++) {
                const sku = srcPo.getSublistValue({ sublistId, fieldId: 'custcol_swc_pr_origin_sku', line: i });
                const skuId = srcPo.getSublistValue({ sublistId, fieldId: 'item', line: i });
                const country = srcPo.getSublistValue({ sublistId, fieldId: 'custcol_swc_country_code', line: i });
                const location_type = srcPo.getSublistValue({ sublistId, fieldId: 'custcol_swc_loc_type', line: i });
                const region = srcPo.getSublistValue({ sublistId, fieldId: 'custcol_swc_us_districts', line: i });
                const yl = srcPo.getSublistValue({ sublistId, fieldId: 'custcol_swc_grade', line: i });
                const customer = srcPo.getSublistValue({ sublistId, fieldId: 'custcol_swc_store', line: i });
                const key = sku + '_' + skuId + '_' + country + '_' + location_type + '_' + region + '_' + yl + '_' + customer;
                po_price_info[key] = po_price_info[key] || {};
                for (let j in COPY_LINE_ID) {
                    po_price_info[key][COPY_LINE_ID[j]] = srcPo.getSublistValue({ sublistId, fieldId: COPY_LINE_ID[j], line: i });
                }
            }
            log.debug('前PO行信息', po_price_info);
            //创建公司间交易PO
            const newPo = record.create({ type: record.Type.PURCHASE_ORDER, isDynamic: true });
            //供应商为执行顺序的起始子公司文本+前缀'IC-'
            const start_sub_name = step_row['startSubName'].split(':');
            newPo.setText('entity', 'IC-' + start_sub_name[start_sub_name.length - 1].trim());
            //获取子公司的主要币种
            const sub_curr_id = getSubCurrId(step_row['targetSubId']);
            //获取对应汇率
            const exchangeRate = getExchangeRate(currencyId, sub_curr_id);
            //子公司为目的公司ID
            newPo.setValue('subsidiary', step_row['targetSubId']);
            //地点，根据店铺+PO子公司+执行顺序中的目的仓库属性（目的仓为平台仓的时候需要再加上目的仓仓库代码的条件）
            const to_loc_id = findToLocation(shop_id, step_row['targetSubId'], step_row, md_loc_id);
            newPo.setValue('location', to_loc_id);
            newPo.setValue('custbody_swc_wl_no', wl_id);
            newPo.setValue('currency', sub_curr_id);
            newPo.setValue('custbody_swc_order_type2', 13);
            //创建行信息
            for (let i = 0; i < line_item_arr.length; i++) {
                const sku = line_item_arr[i].sku;
                const skuId = line_item_arr[i].other_sku;
                const country = line_item_arr[i].country;
                const location_type = line_item_arr[i].location_type;
                const region = line_item_arr[i].region;
                const yl = line_item_arr[i].yl;
                const wl_key = sku + '_' + skuId + '_' + country + '_' + location_type + '_' + region + '_' + yl + '_' + shop_id;
                const oldPOInfo = po_price_info[wl_key] || {};
                if (Object.keys(oldPOInfo).length > 0) {
                    newPo.selectNewLine({ sublistId });
                    newPo.setCurrentSublistValue({ sublistId, fieldId: 'item', value: sku });
                    newPo.setCurrentSublistValue({ sublistId, fieldId: 'custcol_swc_pr_origin_sku', value: sku });
                    for (let j in oldPOInfo) {
                        if (j == 'rate') {
                            newPo.setCurrentSublistValue({ sublistId, fieldId: 'quantity', value: line_item_arr[i].qty });
                            const need_rate = oldPOInfo[j] * exchangeRate * (1 + Number(step_row['price_factor'] || 0));
                            newPo.setCurrentSublistValue({ sublistId, fieldId: j, value: need_rate });
                            const amt = need_rate * line_item_arr[i].qty;
                            newPo.setCurrentSublistValue({ sublistId, fieldId: 'amount', value: amt });
                        } else {
                            newPo.setCurrentSublistValue({ sublistId, fieldId: j, value: oldPOInfo[j] });
                        }
                    }
                    newPo.commitLine({ sublistId });
                }
            }
            newPoId = newPo.save({ enableSourcing: true, ignoreMandatoryFields: false });
            log.debug('公司间交易 PO 做成', newPoId);
            error_data[newPoId] = error_data[newPoId] || {};
            error_data[newPoId]['po_id'] = newPoId;
            error_data[newPoId]['so_id'] = soId;
            error_data[newPoId]['if_id'] = ifId;
            error_data[newPoId]['inv_id'] = invId;
            error_data[newPoId]['ir_id'] = irId;
            error_data[newPoId]['tk_id'] = '';
            srcPo.save();
            //创建公司间交易SO
            const newSo = record.create({ type: record.Type.SALES_ORDER, isDynamic: true, defaultValues: { autogeneratedfromicq: 'T' } });
            // 客户为执行顺序的目的子公司文本+前缀'IC-'
            const target_sub_name = step_row['targetSubName'].split(':');
            newSo.setText('entity', 'IC-' + target_sub_name[target_sub_name.length - 1].trim());
            // 子公司为起始子公司ID
            newSo.setValue('subsidiary', step_row['startSubId']);
            // 地点：原 PO 地点/TO的目的地点
            newSo.setValue('location', so_loc);
            newSo.setValue('orderstatus', 'B');
            newSo.setValue('currency', sub_curr_id);
            // 关联公司间交易 PO
            newSo.setValue('intercotransaction', newPoId);
            //创建行信息
            const lots = {};
            const fee_info = {};
            const fee_curr_info = {};
            let lineNum = 1;
            for (let i = 0; i < line_item_arr.length; i++) {
                lots[lineNum] = line_item_arr[i].lotNum;
                fee_info[lineNum] = fee_info[lineNum] || {};
                fee_info[lineNum]['bxf_fee'] = line_item_arr[i].bxf_fee;
                fee_info[lineNum]['hyf_fee'] = line_item_arr[i].hyf_fee;
                fee_info[lineNum]['qgf_fee'] = line_item_arr[i].qgf_fee;
                fee_info[lineNum]['jkgs_fee'] = line_item_arr[i].jkgs_fee;
                fee_info[lineNum]['hdf_fee'] = line_item_arr[i].hdf_fee;
                fee_info[lineNum]['tcf_fee'] = line_item_arr[i].tcf_fee;
                fee_info[lineNum]['rkcz'] = line_item_arr[i].rkcz;
                fee_curr_info[lineNum] = fee_curr_info[lineNum] || {};
                fee_curr_info[lineNum]['bxf_fee_currency'] = line_item_arr[i].bxf_fee_currency;
                fee_curr_info[lineNum]['hyf_fee_currency'] = line_item_arr[i].hyf_fee_currency;
                fee_curr_info[lineNum]['qgf_fee_currency'] = line_item_arr[i].qgf_fee_currency;
                fee_curr_info[lineNum]['jkgs_fee_currency'] = line_item_arr[i].jkgs_fee_currency;
                fee_curr_info[lineNum]['hdf_fee_currency'] = line_item_arr[i].hdf_fee_currency;
                fee_curr_info[lineNum]['tcf_fee_currency'] = line_item_arr[i].tcf_fee_currency;
                fee_curr_info[lineNum]['rkcz_currency'] = line_item_arr[i].rkcz_currency;
                lineNum++;
                const sku = line_item_arr[i].sku;
                const skuId = line_item_arr[i].other_sku;
                const country = line_item_arr[i].country;
                const location_type = line_item_arr[i].location_type;
                const region = line_item_arr[i].region;
                const yl = line_item_arr[i].yl;
                const wl_key = sku + '_' + skuId + '_' + country + '_' + location_type + '_' + region + '_' + yl + '_' + shop_id;
                const oldPOInfo = po_price_info[wl_key] || {};
                if (Object.keys(oldPOInfo).length > 0) {
                    newSo.selectNewLine({ sublistId });
                    newSo.setCurrentSublistValue({ sublistId, fieldId: 'item', value: sku });
                    newSo.setCurrentSublistValue({ sublistId, fieldId: 'custcol_swc_pr_origin_sku', value: sku });
                    for (let j in oldPOInfo) {
                        if (j == 'rate') {
                            newSo.setCurrentSublistValue({ sublistId, fieldId: 'quantity', value: line_item_arr[i].qty });
                            const need_rate = oldPOInfo[j] * (1 + Number(step_row['price_factor'] || 0));
                            newSo.setCurrentSublistValue({ sublistId, fieldId: j, value: need_rate });
                            const amt = need_rate * line_item_arr[i].qty;
                            newSo.setCurrentSublistValue({ sublistId, fieldId: 'amount', value: amt });
                        } else {
                            newSo.setCurrentSublistValue({ sublistId, fieldId: j, value: oldPOInfo[j] });
                        }
                    }
                    newSo.commitLine({ sublistId });
                }
            }
            soId = newSo.save({ enableSourcing: true, ignoreMandatoryFields: false });
            log.debug('公司间交易SO做成', soId);
            error_data[newPoId]['so_id'] = soId;

            //SO创建货品履行
            const ifRec = record.transform({
                fromType: record.Type.SALES_ORDER,
                fromId: soId,
                toType: record.Type.ITEM_FULFILLMENT,
                isDynamic: true
            });
            ifRec.setValue({ fieldId: 'shipstatus', value: 'C' }); // Shipped
            const lineCount = ifRec.getLineCount({ sublistId }) || 0;
            let lineNo = 1;
            for (let i = 0; i < lineCount; i++) {
                ifRec.selectLine({ sublistId, line: i });
                ifRec.setCurrentSublistValue({ sublistId, fieldId: 'itemreceive', value: true });
                const lotNum = lots[lineNo] || '';
                lineNo++;
                const qty = Number(ifRec.getCurrentSublistValue({ sublistId, fieldId: 'quantity' })) || 0;
                ifRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'quantity', value: qty }); // 测试用 TODO
                ifRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'location', value: so_loc });
                if (!isBlank(lotNum)) {
                    const inventorydetail = ifRec.getCurrentSublistSubrecord({ sublistId, fieldId: 'inventorydetail' });
                    inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', text: lotNum });
                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: qty });
                    inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                }
                ifRec.commitLine({ sublistId });
            }
            ifId = ifRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
            log.debug('SO -> IF 做成', ifId);
            error_data[newPoId]['if_id'] = ifId;

            // 2) SO -> Invoice
            const invRec = record.transform({
                fromType: record.Type.SALES_ORDER,
                fromId: soId,
                toType: record.Type.INVOICE,
                isDynamic: false
            });
            invId = invRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
            log.debug('SO -> Invoice 做成', invId);
            error_data[newPoId]['inv_id'] = invId;

            // 3) 新公司间交易 PO -> Item Receipt
            const irRec = record.transform({
                fromType: record.Type.PURCHASE_ORDER,
                fromId: newPoId,
                toType: record.Type.ITEM_RECEIPT,
                isDynamic: true
            });
            const irLineCount = irRec.getLineCount({ sublistId }) || 0;
            //费用下拉选项
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
            for (let i = 0; i < irLineCount; i++) {
                irRec.selectLine({ sublistId, line: i });
                irRec.setCurrentSublistValue({ sublistId, fieldId: 'itemreceive', value: true });
                const lineNo = irRec.getCurrentSublistValue({ sublistId, fieldId: 'custcol_swc_line_no' });
                const lotNum = lots[lineNo] || '';
                const qty = Number(irRec.getCurrentSublistValue({ sublistId, fieldId: 'quantity' })) || 0;
                irRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'quantity', value: qty }); // 测试用 TODO
                if (!isBlank(lotNum)) {
                    const inventorydetail = irRec.getCurrentSublistSubrecord({ sublistId, fieldId: 'inventorydetail' });
                    inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                    inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', text: lotNum });
                    inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: qty });
                    inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                }
                //处理到岸成本费用信息
                const feeInfo = fee_info[lineNo] || {};
                const feeCurrInfo = fee_curr_info[lineNo] || {};
                if (Object.keys(feeInfo).length > 0) {
                    const lcSub = irRec.getCurrentSublistSubrecord({ sublistId, fieldId: 'landedcost' });
                    for (let j in feeInfo) {
                        if (Number(feeInfo[j]) > 0) {
                            lcSub.selectNewLine({ sublistId: 'landedcostdata' });
                            lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: feeMaping[j] });
                            const exchangeRate1 = getExchangeRate(feeCurrInfo[j + '_currency'], sub_curr_id);
                            lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'amount', value: feeInfo[j] * exchangeRate1 });
                            lcSub.commitLine({ sublistId: 'landedcostdata' });
                        }
                    }
                }
                irRec.commitLine({ sublistId });
            }
            irId = irRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
            log.debug('PO -> IR 做成', irId);
            error_data[newPoId]['ir_id'] = irId;

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
                result_to_ids.push(newPoId);
                result_to_ids.push(soId);
            } else {
                tkRec = record.create({ type: 'customrecord_swc_wl_tk_t', isDynamic: true });
                tkRec.setValue('custrecord_wl_tk_t_wl_id', wl_id);
                tkRec.setValue('custrecord_wl_tk_t_cf', terms_of_trade);
                tkRec.setValue('custrecord_wl_tk_t_jyll', step_row['configId']);
                tkRec.setValue('custrecord_wl_tk_t_md', md_county);
                tkRec.setValue('custrecord_wl_tk_t_customer', shop_id);
                tkRec.setValue('custrecord_wl_tk_t_po', po_id);
                result_to_ids.push(newPoId);
                result_to_ids.push(soId);
            }
            result_to_ids.length > 0 ? tkRec.setValue(field_name, result_to_ids) : '';
            const tkRecId = tkRec.save();
            if (tkRecId) {
                log.debug('success', '贸易条款单据创建/更新成功');
                if (!tk_id) {
                    error_data[newPoId]['tk_id'] = tkRecId;
                }
            }
            log.debug('is_error', is_error);
            if (is_error) {
                if (Object.keys(error_data).length > 0) {
                    for (let i in error_data) {
                        context.write(i, error_data[i]);
                    }
                }
            }
        } catch (e) {
            log.debug('e', e);
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

    function getSubCurrId(subsidiaryId) {
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

    function getExchangeRate(currencyId, sub_curr_id) {
        if (!currencyId || !sub_curr_id) {
            return 1;
        }
        return Number(currency.exchangeRate({
            source: currencyId,
            target: sub_curr_id,
            date: new Date()
        })) || 1;
    }

    /**
     * 判空
     */
    function isBlank(v) {
        return v === null || v === undefined || v === '';
    }

    function getPreviousStepInfo(tk_id) {
        let ids = [];
        let bill_info = {};
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
                if (result.getValue(result.columns[1]) == 'TrnfrOrd') {
                    bill_info['to_id'] = bill_info['to_id'] ? bill_info['to_id'] : result.id;
                }
                if (result.getValue(result.columns[1]) == 'PurchOrd') {
                    bill_info['po_id'] = bill_info['po_id'] ? bill_info['po_id'] : result.id;
                }
                return true;
            });
        }
        return bill_info;
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
            const po_id = values.po_id;
            const so_id = values.so_id;
            const if_id = values.if_id;
            const inv_id = values.inv_id;
            const ir_id = values.ir_id;
            const tk_id = values.tk_id;
            const po_item_id = CONFIG.PO_DELETE_ITEM;//固定值 公司间PO删除货品
            const so_item_id = CONFIG.SO_DELETE_ITEM;//固定值 公司间SO删除货品
            //需要按顺序删除
            if (ir_id) {
                record.delete({ type: 'itemreceipt', id: ir_id });
                log.debug('delete itemreceipt', ir_id);
            }
            if (inv_id) {
                record.delete({ type: 'invoice', id: inv_id });
                log.debug('delete invoice', inv_id);
            }
            if (if_id) {
                record.delete({ type: 'itemfulfillment', id: if_id });
                log.debug('delete itemfulfillment', if_id);
            }
            if (so_id) {
                var so_rec = record.load({ type: 'salesorder', id: so_id });
                for (var s = 0; s < so_rec.getLineCount({ sublistId: 'item' }); s++) {
                    so_rec.setSublistValue({ sublistId: 'item', fieldId: 'item', value: so_item_id, line: s });
                    so_rec.setSublistValue({ sublistId: 'item', fieldId: 'amount', value: '0', line: s });
                }
                so_rec.save({ ignoreMandatoryFields: true });

                var po_rec_ = record.load({ type: 'purchaseorder', id: po_id });
                for (var p = 0; p < po_rec_.getLineCount({ sublistId: 'item' }); p++) {
                    po_rec_.setSublistValue({ sublistId: 'item', fieldId: 'item', value: po_item_id, line: p });
                    po_rec_.setSublistValue({ sublistId: 'item', fieldId: 'amount', value: '0', line: p });
                }
                po_rec_.save({ ignoreMandatoryFields: true });
                record.submitFields({
                    type: 'purchaseorder',
                    id: po_id,
                    values: {
                        intercotransaction: ''
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
                record.submitFields({
                    type: 'salesorder',
                    id: so_id,
                    values: {
                        intercotransaction: ''
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
                record.delete({ type: 'salesorder', id: so_id });
                log.debug('delete salesorder', so_id);
            }
            if (po_id) {
                record.delete({ type: 'purchaseorder', id: po_id });
                log.debug('delete purchaseorder', po_id);
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
            log.error('SWC_MR_CG_IC_TRANSACTION getExecutionPayload error', e);
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
