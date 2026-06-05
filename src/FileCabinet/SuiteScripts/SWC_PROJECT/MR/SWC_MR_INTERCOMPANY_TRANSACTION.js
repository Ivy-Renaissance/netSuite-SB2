/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * 贸易条款 - 公司间交易
 */
define(['N/runtime', 'N/record', 'N/search', 'N/log', 'N/currency', 'N/error'], (runtime, record, search, log, currency, error) => {

    // -----------------------------
    // 参数/常量区
    // -----------------------------

    const PARAM_PAYLOAD = 'custscript_m_payload'; // 传入："{wlId}_{btnType}"

    // 复制 PO/SO 行字段清单
    const COPY_LINE_ID = [
        'item',
        'vendorname',
        'custcol_swc_pr_main_sku',
        'custcol_swc_bom_list',
        'custcol_swc_pr_origin_sku',
        'quantity',
        'rate',
        'custcol_swc_including_tax_amt',
        'custcol_swc_us_districts',
        'amount',
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

    // 物流发运单：物流发运明细
    const WL_DETAIL_SUBLIST = 'recmachcustrecord_swc_wl_plan_order_id';

    // 物流发运单：贸易条款
    const WL_TK_SUBLIST = 'recmachcustrecord_wl_tk_t_wl_id';

    // 物流发运单状态字段
    const WL_STATUS_FIELD = 'custrecord_swc_wl_tk_status';

    // 运抵国 = 美国
    const COUNTRY_US = 230;
    const subsidiaryCurrencyCache = {};
    const lotValidationCache = {};

    // -----------------------------
    // getInputData：组装 map 输入
    // -----------------------------
    function getInputData() {
        const payloadStr = runtime.getCurrentScript().getParameter({ name: PARAM_PAYLOAD }) || '';
        const { wlId, btnType } = parsePayload(payloadStr);

        if (!wlId || !btnType) {
            log.error('getInputData', `payload 格式不正确：${payloadStr}`);
            return {};
        }

        try {
            const poLocationCache = {};
            const toLocationCache = {};
            const lotValidationErrors = [];

            function getPoLocation(poId) {
                const key = String(poId || '');
                if (!key) return '';
                if (Object.prototype.hasOwnProperty.call(poLocationCache, key)) {
                    return poLocationCache[key];
                }

                const poInfo = search.lookupFields({
                    type: search.Type.PURCHASE_ORDER,
                    id: poId,
                    columns: ['location']
                }) || {};

                const locationArr = poInfo.location || [];
                const locationId = (locationArr[0] && locationArr[0].value) ? String(locationArr[0].value) : '';
                poLocationCache[key] = locationId;
                return locationId;
            }

            function getTransferOrderToLocation(toId) {
                const key = String(toId || '');
                if (!key) return '';
                if (Object.prototype.hasOwnProperty.call(toLocationCache, key)) {
                    return toLocationCache[key];
                }

                const toInfo = search.lookupFields({
                    type: search.Type.TRANSFER_ORDER,
                    id: toId,
                    columns: ['transferlocation']
                }) || {};

                const locationArr = toInfo.transferlocation || [];
                const locationId = (locationArr[0] && locationArr[0].value) ? String(locationArr[0].value) : '';
                toLocationCache[key] = locationId;
                return locationId;
            }

            function collectLotValidationError(itemId, lotNum, locationId, locationLabel) {
                const itemKey = String(itemId || '').trim();
                const lotKey = String(lotNum || '').trim();
                const locKey = String(locationId || '').trim();
                if (!itemKey || !lotKey) return;

                if (!locKey || !checkLotExistsAtLocation(itemKey, lotKey, locKey)) {
                    lotValidationErrors.push('Lot番号不存在或不在当前' + locationLabel + '。货品:' + itemKey + '，Lot:' + lotKey + '，地点:' + (locKey || '空'));
                }
            }

            // 加载物流发运单
            const wlRec = record.load({
                type: 'customrecord_swc_wl_plan_order',
                id: wlId,
                isDynamic: false
            });

            // 成交方式
            const terms_of_trade = wlRec.getValue('custrecord_swc_wl_terms_of_trade');
            // 目的仓仓库代码
            const md_location = wlRec.getValue('custrecord_swc_md_location');
            // 运抵国
            const wl_county_lsit = wlRec.getValue('custrecord_swc_wl_county_lsit');

            // documentData 作为 getInputData 输出：
            const documentData = {};

            var locationError = [];

            if (btnType === 'wl') {
                const lineCount = wlRec.getLineCount({ sublistId: WL_DETAIL_SUBLIST }) || 0;

                for (let i = 0; i < lineCount; i++) {
                    const poId = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_po_num', line: i });
                    const customerId = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_customer', line: i });

                    // 关键字段缺失直接跳过
                    if (isBlank(poId) || isBlank(customerId)) continue;

                    // 店铺子公司
                    const customerSub = getCustomerSubsidiary(customerId);

                    // 货品维度字段
                    const skuId = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_item', line: i });
                    const sku = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_sku', line: i });
                    const country = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_country', line: i });
                    const location_type = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_location_type', line: i });
                    const region = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_region', line: i });

                    const customer = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_customer', line: i });
                    const customerText = wlRec.getSublistText({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_customer', line: i });

                    // 优等/良品
                    const superiorQty = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: i })) || 0;
                    const yl = superiorQty > 0 ? 1 : 2;

                    // 批次号
                    const lotNum = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_lot', line: i }) || '';
                    const goodQty = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: i })) || 0;
                    const qty = (Number(superiorQty) || 0) + (Number(goodQty) || 0);
                    collectLotValidationError(sku, lotNum, getPoLocation(poId), '原PO地点');

                    // 新 PO 子公司：美国固定 77，否则取店铺子公司
                    const newSub = (String(wl_county_lsit) === String(COUNTRY_US)) ? 77 : getCustomerSubsidiary(customerId);
                    const locationAttribute = resolveLocationAttribute('wl', terms_of_trade);
                    const newLocationId = findLocationInternalId(customerId, locationAttribute, '', newSub);
                    var attrObj = {
                        1: '供应商仓',
                        2: '国内在途仓',
                        3: '国内海外在途仓',
                        4: '海外国内在途仓',
                        5: '海外国外在途仓',
                        6: '海外仓',
                        7: '平台仓',
                        8: 'HD门店退货仓',
                        9: '不良品仓',
                        10: '平台在途仓',
                        11: '保税仓',
                        12: '店铺虚拟仓',
                    }

                    if (!newLocationId) {
                        locationError.push('目的地点找不到：店铺:' + customerText + ', 仓库类型:' + attrObj[locationAttribute]);
                    }

                    // key
                    const key = buildInputKey({
                        poId,
                        customerId,
                        wl_county_lsit,
                        btnType,
                        terms_of_trade,
                        customerSub,
                        wlId
                    });

                    // valueKey
                    const valueKey = buildLineValueKey({
                        skuId,
                        sku,
                        country,
                        location_type,
                        region,
                        yl,
                        customer
                    });

                    // 写入 documentData
                    if (!documentData.hasOwnProperty(key)) documentData[key] = {};
                    documentData[key][valueKey] = documentData[key][valueKey] || {};
                    documentData[key][valueKey]['item_id'] = sku;
                    documentData[key][valueKey]['lot_num'] = lotNum;
                    documentData[key][valueKey]['lot_qty'] = qty;
                }

            } else if (btnType === 'bg' || btnType === 'cgbg') {
                // 贸易条款：得到 toId -> { customer, po, t_id }
                const tkCount = wlRec.getLineCount({ sublistId: WL_TK_SUBLIST }) || 0;
                const lineCount = wlRec.getLineCount({ sublistId: WL_DETAIL_SUBLIST }) || 0;

                const toIds = {}; // key=toId, value={customer,po,t_id}
                for (let i = 0; i < tkCount; i++) {
                    const toId = wlRec.getSublistValue({ sublistId: WL_TK_SUBLIST, fieldId: 'custrecord_wl_tk_t_g_t', line: i });
                    const t_customer = wlRec.getSublistValue({ sublistId: WL_TK_SUBLIST, fieldId: 'custrecord_wl_tk_t_customer', line: i });
                    const t_po = wlRec.getSublistValue({ sublistId: WL_TK_SUBLIST, fieldId: 'custrecord_wl_tk_t_po', line: i });
                    const t_id = wlRec.getSublistValue({ sublistId: WL_TK_SUBLIST, fieldId: 'id', line: i });

                    // toId 为空则无法关联，跳过
                    if (isBlank(toId)) continue;

                    toIds[String(toId)] = {
                        customer: t_customer,
                        po: t_po,
                        t_id: t_id
                    };
                }
                log.error('toIds', toIds);

                // 遍历每个 toId，把符合 (po,customer) 的 wl 明细行收集起来
                for (const toIdsKey in toIds) {
                    if (!toIds.hasOwnProperty(toIdsKey)) continue;

                    const link = toIds[toIdsKey];
                    const tkId = link.t_id;          // 追踪表行 id（后续 map/reduce 回写 bg 单据用）
                    const to_poId = link.po;         // 对应原 PO
                    const to_customerId = link.customer; // 对应店铺

                    if (isBlank(to_poId) || isBlank(to_customerId) || isBlank(tkId)) continue;

                    for (let i = 0; i < lineCount; i++) {
                        const poId = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_po_num', line: i });
                        const customerId = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_customer', line: i });

                        // 只抓取属于该 toId 关联的 (po,customer) 的明细
                        if (String(poId) !== String(to_poId) || String(customerId) !== String(to_customerId)) continue;

                        const customerSub = getCustomerSubsidiary(customerId);

                        // 货品维度字段
                        const skuId = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_item', line: i });
                        const sku = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_sku', line: i });
                        const country = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_country', line: i });
                        const location_type = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_location_type', line: i });
                        const region = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_region', line: i });

                        const customer = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_customer', line: i });


                        // 优等/良品 -> grade
                        const superiorQty = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: i })) || 0;
                        const yl = superiorQty > 0 ? 1 : 2;

                        const lotNum = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_lot', line: i }) || '';
                        const goodQty = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: i })) || 0;
                        const qty = (Number(superiorQty) || 0) + (Number(goodQty) || 0);
                        collectLotValidationError(sku, lotNum, getTransferOrderToLocation(toIdsKey), '来源转移单目标地点');
                        // bg key：额外拼上 toId 和 tkId，保证 map 里能取到
                        const key = buildInputKey({
                            poId,
                            customerId,
                            wl_county_lsit,
                            btnType,
                            terms_of_trade,
                            customerSub,
                            wlId,
                            toId: toIdsKey,
                            tkId: tkId
                        });

                        const valueKey = buildLineValueKey({
                            skuId,
                            sku,
                            country,
                            location_type,
                            region,
                            yl,
                            customer
                        });

                        if (!documentData.hasOwnProperty(key)) documentData[key] = {};
                        documentData[key][valueKey] = documentData[key][valueKey] || {};
                        documentData[key][valueKey]['item_id'] = sku;
                        documentData[key][valueKey]['lot_num'] = lotNum;
                        documentData[key][valueKey]['lot_qty'] = qty;
                    }
                }

            } else if (btnType === 'qg') {
                // 贸易条款：得到 toId -> { customer, po, t_id }
                const tkCount = wlRec.getLineCount({ sublistId: WL_TK_SUBLIST }) || 0;
                const lineCount = wlRec.getLineCount({ sublistId: WL_DETAIL_SUBLIST }) || 0;

                const toIds = {}; // key=toId, value={customer,po,t_id}
                for (let i = 0; i < tkCount; i++) {
                    const toId = wlRec.getSublistValue({ sublistId: WL_TK_SUBLIST, fieldId: 'custrecord_wl_tk_t_bg_t', line: i });
                    const t_customer = wlRec.getSublistValue({ sublistId: WL_TK_SUBLIST, fieldId: 'custrecord_wl_tk_t_customer', line: i });
                    const t_po = wlRec.getSublistValue({ sublistId: WL_TK_SUBLIST, fieldId: 'custrecord_wl_tk_t_po', line: i });
                    const t_id = wlRec.getSublistValue({ sublistId: WL_TK_SUBLIST, fieldId: 'id', line: i });

                    // toId 为空则无法关联，跳过
                    if (isBlank(toId)) continue;

                    toIds[String(toId)] = {
                        customer: t_customer,
                        po: t_po,
                        t_id: t_id
                    };
                }
                log.debug('toIds', toIds);
                // 遍历每个 toId，把符合 (po,customer) 的 wl 明细行收集起来
                for (const toIdsKey in toIds) {
                    if (!toIds.hasOwnProperty(toIdsKey)) continue;

                    const link = toIds[toIdsKey];
                    const tkId = link.t_id;          // 追踪表行 id（后续 map/reduce 回写 bg 单据用）
                    const to_poId = link.po;         // 对应原 PO
                    const to_customerId = link.customer; // 对应店铺

                    if (isBlank(to_poId) || isBlank(to_customerId) || isBlank(tkId)) continue;

                    for (let i = 0; i < lineCount; i++) {
                        const poId = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_po_num', line: i });
                        const customerId = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_customer', line: i });

                        // 只抓取属于该 toId 关联的 (po,customer) 的明细
                        if (String(poId) !== String(to_poId) || String(customerId) !== String(to_customerId)) continue;

                        const customerSub = getCustomerSubsidiary(customerId);

                        // 货品维度字段
                        const skuId = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_item', line: i });
                        const sku = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_sku', line: i });
                        const country = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_country', line: i });
                        const location_type = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_location_type', line: i });
                        const region = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_region', line: i });

                        const customer = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_customer', line: i });


                        // 优等/良品 -> grade
                        const superiorQty = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: i })) || 0;
                        const yl = superiorQty > 0 ? 1 : 2;

                        const lotNum = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_lot', line: i }) || '';
                        const goodQty = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: i })) || 0;
                        const qty = (Number(superiorQty) || 0) + (Number(goodQty) || 0);
                        collectLotValidationError(sku, lotNum, getTransferOrderToLocation(toIdsKey), '来源转移单目标地点');
                        // bg key：额外拼上 toId 和 tkId，保证 map 里能取到
                        const key = buildInputKey({
                            poId,
                            customerId,
                            wl_county_lsit,
                            btnType,
                            terms_of_trade,
                            customerSub,
                            wlId,
                            toId: toIdsKey,
                            tkId: tkId
                        });

                        const valueKey = buildLineValueKey({
                            skuId,
                            sku,
                            country,
                            location_type,
                            region,
                            yl,
                            customer
                        });

                        if (!documentData.hasOwnProperty(key)) documentData[key] = {};
                        documentData[key][valueKey] = documentData[key][valueKey] || {};
                        documentData[key][valueKey]['item_id'] = sku;
                        documentData[key][valueKey]['lot_num'] = lotNum;
                        documentData[key][valueKey]['lot_qty'] = qty;
                    }
                }
            }

            log.debug('getInputData documentData keys', JSON.stringify(documentData));
            log.debug('getInputData documentData keys', Object.keys(documentData).length);

            if (lotValidationErrors.length > 0) {
                record.submitFields({
                    type: 'customrecord_swc_wl_plan_order',
                    id: wlId,
                    values: {
                        custrecord_my_tk_error_message: lotValidationErrors.join('。')
                    }
                });
                return [];
            }

            if (locationError && locationError.length > 0) {
                record.submitFields({
                    type: 'customrecord_swc_wl_plan_order',
                    id: wlId,
                    values: {
                        custrecord_my_tk_error_message: locationError.join('。')
                    }
                });
                return []
            }
            return documentData;

        } catch (e) {
            // 失败状态回写
            safeUpdateWlStatusOnError(btnType, wlId);
            log.error('getInputData error', e);
            return {};
        }
    }

    // -----------------------------
    // map：创建公司间交易 PO + SO（并 write 给 reduce）
    // -----------------------------
    function map(context) {
        const mapKey = context.key;                  // documentData 的 key
        const mapValue = JSON.parse(context.value);  // documentData[key] 的对象（valueKey -> lotNum）

        log.debug('Map key', mapKey);
        log.debug('Map value', mapValue);

        // key 分解：wl 与 bg 格式不同
        const parts = String(mapKey).split('_');

        // 固定段
        const poId = parts[0];
        const customerId = parts[1];
        const wl_county_lsit = parts[2];
        const btnType = parts[3];
        const terms_of_trade = parts[4];
        const customerSub = parts[5];
        const wlId = parts[6];

        // bg 专用段（存在则取）
        const toId = (btnType === 'bg' || btnType === 'cgbg' || btnType === 'qg') ? parts[7] : '';
        const tkID = (btnType === 'bg' || btnType === 'cgbg' || btnType === 'qg') ? parts[8] : '';
        log.debug('Map data', {
            poId: poId, customerId: customerId, wl_county_lsit: wl_county_lsit, btnType: btnType, terms_of_trade: terms_of_trade, customerSub: customerSub, wlId: wlId,
            customerSub: customerSub, wlId: wlId, toId: toId, tkID: tkID
        });

        // 目的地找不到的场合，也要进行明细行的数据回写
        var noLocationFlag = false;

        try {
            if (btnType === 'wl') {
                log.debug('map', 'Map - 供应商出货');

                // 原 PO
                const srcPo = record.load({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    isDynamic: false
                });

                srcPo.setValue({ fieldId: 'custbody_swc_wl_no', value: wlId });

                // 新公司间交易 PO
                const newPo = record.create({
                    type: record.Type.PURCHASE_ORDER,
                    isDynamic: true
                });

                // 原 PO 地点
                const oldLocation = srcPo.getValue('location');
                validateLotAssignments(mapValue, oldLocation, '原PO地点');

                newPo.setValue({ fieldId: 'custbody_swc_wl_no', value: wlId });

                // 供应商：原 PO 子公司文本 -> 'IC-xxx'
                const oldSubsidiaryText = srcPo.getText('subsidiary');
                const oldSubsidiary = srcPo.getValue('subsidiary');
                newPo.setText({ fieldId: 'entity', text: 'IC-' + oldSubsidiaryText });

                // 新 PO 子公司：美国固定 77，否则取店铺子公司
                const newSub = (String(wl_county_lsit) === String(COUNTRY_US)) ? 77 : getCustomerSubsidiary(customerId);

                newPo.setValue({ fieldId: 'subsidiary', value: newSub });

                // 新 PO 地点：按店铺 + locationAttribute 查找
                const locationAttribute = resolveLocationAttribute('wl', terms_of_trade);
                const newLocationId = findLocationInternalId(customerId, locationAttribute, '', newSub);
                if (!newLocationId) {
                    log.debug('map', `目的地点找不到：customer=${customerId}, attr=${locationAttribute}`);
                    noLocationFlag = true;
                }

                var soId = '';
                var newPoId = '';
                var lotJson = {};
                if (!noLocationFlag) {
                    newPo.setValue({ fieldId: 'location', value: newLocationId });

                    //查询公司间交易链路中第一层价格交易系数
                    var transaction_coefficient = getTransactionCoefficient(srcPo.getValue('subsidiary'), newSub, srcPo.getValue('trandate'));
                    const currencyId = transaction_coefficient.transaction_currency || srcPo.getValue('currency');
                    newPo.setValue({ fieldId: 'currency', value: currencyId });

                    // 复制行：只复制匹配 mapValue[valueKey] 的行
                    const sublistId = 'item';
                    const srcLineCount = srcPo.getLineCount({ sublistId }) || 0;

                    for (let i = 0; i < srcLineCount; i++) {
                        const valueKey = buildPoLineValueKeyFromPo(srcPo, sublistId, i);
                        if (!mapValue[valueKey]) continue;

                        newPo.selectNewLine({ sublistId });
                        // copyLineFields(srcPo, newPo, sublistId, i, COPY_LINE_ID);
                        copyLineFields(srcPo, newPo, sublistId, i, COPY_LINE_ID, transaction_coefficient, mapValue[valueKey].lot_qty);

                        newPo.commitLine({ sublistId });
                    }

                    newPoId = newPo.save({ enableSourcing: true, ignoreMandatoryFields: false });
                    srcPo.save();
                    log.debug('公司间交易 PO 做成', newPoId);

                    // 新公司间交易 SO
                    const soRec = record.create({
                        type: record.Type.SALES_ORDER,
                        isDynamic: true,
                        defaultValues: { autogeneratedfromicq: 'T' }
                    });

                    // 客户：公司间交易 PO 子公司 + 'IC-'
                    soRec.setText({ fieldId: 'entity', text: 'IC-' + newPo.getText('subsidiary') });

                    // 子公司：原 PO 子公司
                    soRec.setValue({ fieldId: 'subsidiary', value: oldSubsidiary });

                    // 币种：与公司间交易 PO 一致
                    soRec.setValue({ fieldId: 'currency', value: currencyId });

                    // 地点：原 PO 地点
                    soRec.setValue({ fieldId: 'location', value: oldLocation });

                    // 关联公司间交易 PO
                    soRec.setValue({ fieldId: 'intercotransaction', value: newPoId });

                    // 复制行 + 组装 lotJson（注意：lotJson 的 key 应与 reduce 里读取的 custcol_swc_line_no 一致）
                    let lineNum = 1;

                    //查询公司间交易链路中第一层价格交易系数
                    var transaction_coefficient = getTransactionCoefficient(srcPo.getValue('subsidiary'), newSub, srcPo.getValue('trandate'));
                    log.debug('transaction_coefficient', transaction_coefficient);
                    for (let i = 0; i < srcLineCount; i++) {
                        const valueKey = buildPoLineValueKeyFromPo(srcPo, sublistId, i);
                        log.debug('valueKey', valueKey);
                        log.debug('mapValue', mapValue);
                        if (!mapValue[valueKey]) continue;
                        log.debug('AA');
                        soRec.selectNewLine({ sublistId });

                        // copyLineFields(srcPo, soRec, sublistId, i, COPY_LINE_ID, transaction_coefficient);
                        copyLineFields(srcPo, soRec, sublistId, i, COPY_LINE_ID, transaction_coefficient, mapValue[valueKey].lot_qty);

                        lotJson[String(lineNum)] = mapValue[valueKey].lot_num;
                        lineNum++;

                        soRec.commitLine({ sublistId });
                    }

                    soRec.setValue({ fieldId: 'orderstatus', value: 'B' });
                    soId = soRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
                    log.debug('公司间交易 SO 做成', soId);
                }

                // 交给 reduce：创建 IF/INV/IR + 写追踪表
                context.write({
                    key: buildReduceKey({
                        newPoId,
                        soId,
                        wl_county_lsit,
                        wlId,
                        terms_of_trade,
                        oldPoId: poId,
                        customerId,
                        btnType,
                        tkId: '', // bg 才有
                        to_sub: newSub,
                        to_start_loc: newLocationId,
                        so_loc: oldLocation,
                        noLocationFlag: noLocationFlag
                    }),
                    value: JSON.stringify(lotJson)
                });

            } else if (btnType === 'bg' || btnType === 'cgbg' || btnType === 'qg') {
                // bg：会基于“转移单 toId”的信息决定 oldLocation/oldSubsidiary
                const toRec = record.load({
                    type: 'transferorder',
                    id: toId,
                    isDynamic: false
                });

                // 原 PO（用于复制商品行、币种等）
                const srcPo = record.load({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    isDynamic: false
                });

                srcPo.setValue({ fieldId: 'custbody_swc_wl_no', value: wlId });

                const newPo = record.create({
                    type: record.Type.PURCHASE_ORDER,
                    isDynamic: true
                });

                newPo.setValue({ fieldId: 'approvalstatus', value: 2 });

                // 用转移单的“至地点”
                const oldLocation = toRec.getValue('transferlocation');
                validateLotAssignments(mapValue, oldLocation, '来源转移单目标地点');

                // 供应商：转移单子公司文本 -> 'IC-xxx'
                const oldSubsidiaryText = toRec.getText('subsidiary');
                const oldSubsidiary = toRec.getValue('subsidiary');
                log.debug('oldSubsidiaryText', oldSubsidiaryText);
                log.debug('oldSubsidiary', oldSubsidiary);
                newPo.setText({ fieldId: 'entity', text: 'IC-' + oldSubsidiaryText });
                newPo.setValue({ fieldId: 'custbody_swc_wl_no', value: wlId });

                // 新 PO 子公司：美国固定 77，否则取店铺子公司
                var newSub = (String(wl_county_lsit) === String(COUNTRY_US)) ? 77 : customerSub;

                newPo.setValue({ fieldId: 'subsidiary', value: newSub });

                // 新 PO 地点：海外/国外在途仓
                log.debug('newSub', newSub)
                log.debug('btnType', btnType);
                log.debug('terms_of_trade', terms_of_trade);
                const locationAttribute = resolveLocationAttribute(btnType, terms_of_trade);
                log.debug('customerId', customerId);
                log.debug('locationAttribute', locationAttribute);
                const newLocationId = findLocationInternalId(customerId, locationAttribute, '', newSub);
                if (!newLocationId) {
                    log.debug('map', `目的地点找不到：customer=${customerId}, attr=${locationAttribute}`);
                    noLocationFlag = true;
                }
                newPo.setValue({ fieldId: 'location', value: newLocationId });

                //查询公司间交易链路中第一层价格交易系数
                var transaction_coefficient = getTransactionCoefficient(srcPo.getValue('subsidiary'), newSub, srcPo.getValue('trandate'));
                const currencyId = transaction_coefficient.transaction_currency || srcPo.getValue('currency');
                newPo.setValue({ fieldId: 'currency', value: currencyId });

                // 复制行（同 wl）
                const sublistId = 'item';
                const srcLineCount = srcPo.getLineCount({ sublistId }) || 0;
                for (let j in mapValue) {
                    newPo.selectNewLine({ sublistId });
                    for (let i = 0; i < srcLineCount; i++) {
                        const valueKey = buildPoLineValueKeyFromPo(srcPo, sublistId, i);
                        if (j !== valueKey) continue;//if(!mapValue[valueKey]) continue;不区分优良品
                        copyLineFields(srcPo, newPo, sublistId, i, COPY_LINE_ID, transaction_coefficient, mapValue[valueKey].lot_qty);
                        break;
                    }
                    newPo.commitLine({ sublistId });
                }
                const newPoId = newPo.save({ enableSourcing: true, ignoreMandatoryFields: false });
                srcPo.save();
                log.debug('公司间交易 PO（bg/cgbg/qg）做成', newPoId);
                // 公司间交易 SO
                const soRec = record.create({
                    type: record.Type.SALES_ORDER,
                    isDynamic: true,
                    defaultValues: { autogeneratedfromicq: 'T' }
                });

                // 客户：公司间交易 PO 子公司 + 'IC-'
                soRec.setText({ fieldId: 'entity', text: 'IC-' + newPo.getText('subsidiary') });

                // 子公司：转移单子公司
                soRec.setValue({ fieldId: 'subsidiary', value: oldSubsidiary });

                // 币种：与公司间交易 PO 一致
                soRec.setValue({ fieldId: 'currency', value: currencyId });

                // 地点：转移单至地点
                soRec.setValue({ fieldId: 'location', value: oldLocation });

                // 关联 PO
                soRec.setValue({ fieldId: 'intercotransaction', value: newPoId });

                const lotJson = {};
                let lineNum = 1;

                for (let j in mapValue) {
                    soRec.selectNewLine({ sublistId });
                    for (let i = 0; i < srcLineCount; i++) {
                        const valueKey = buildPoLineValueKeyFromPo(srcPo, sublistId, i);
                        if (j !== valueKey) continue;//if(!mapValue[valueKey]) continue;不区分优良品
                        lotJson[lineNum] = mapValue[valueKey].lot_num;
                        copyLineFields(srcPo, soRec, sublistId, i, COPY_LINE_ID, transaction_coefficient, mapValue[valueKey].lot_qty);
                        break;
                    }
                    lineNum++;
                    soRec.commitLine({ sublistId });
                }

                soRec.setValue({ fieldId: 'orderstatus', value: 'B' });
                const soId = soRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
                log.debug('公司间交易 SO（bg/cgbg/qg）做成', soId);

                context.write({
                    key: buildReduceKey({
                        newPoId,
                        soId,
                        wl_county_lsit,
                        wlId,
                        terms_of_trade,
                        oldPoId: poId,
                        customerId,
                        btnType,
                        tkId: tkID, // bg 才有
                        to_sub: newSub,
                        to_start_loc: newLocationId,
                        so_loc: oldLocation,
                        noLocationFlag: noLocationFlag
                    }),
                    value: JSON.stringify(lotJson)
                });
            }

        } catch (e) {
            record.submitFields({
                type: 'customrecord_swc_wl_plan_order',
                id: wlId,
                values: {
                    custrecord_my_tk_error_message: e.message
                }
            });
            safeUpdateWlStatusOnError(btnType, wlId);
            log.error('map error', e);
            throw e;
        }
    }

    // -----------------------------
    // reduce：创建 IF/INV/IR + 回写追踪/状态
    // -----------------------------
    function reduce(context) {
        // reduce key 格式：newPoId_soId_wl_county_lsit_wlId_terms_oldPoId_customerId_btnType(_tkId)
        const ids = String(context.key).split('_');
        log.debug('reduce key ids', ids);
        // 合并多个 map value（避免只取第一个造成丢批次）
        const lots = mergeLotJsonValues(context.values);
        log.debug('lots', lots);

        const newPoId = ids[0];
        const soId = ids[1];

        const wl_county_lsit = ids[2];
        const wlId = ids[3];
        const terms_of_trade = ids[4];

        const oldPoId = ids[5];
        const customerId = ids[6];

        const btnType = ids[7];
        const tkId = (btnType === 'bg' || btnType === 'cgbg' || btnType === 'qg') ? ids[8] : '';

        const to_sub = ids[9];
        const to_start_loc = ids[10];
        const so_loc = ids[11];

        const noLocationFlag = ids[12];

        try {
            if (noLocationFlag == false) {

                // 1) SO -> Item Fulfillment
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

                    // 以“行号字段”作为 lotJson 的 key（你原逻辑使用 custcol_swc_line_no）
                    // const item_id = ifRec.getCurrentSublistValue({ sublistId, fieldId: 'item' });
                    // const lineNo = ifRec.getCurrentSublistValue({ sublistId, fieldId: 'custcol_swc_line_no' });
                    log.debug('lineNo', lineNo);
                    const lotNum = lots[lineNo] || '';
                    log.debug('lotNum', lotNum);
                    lineNo++;

                    // 数量：用真实数量（不要再写死 1）
                    const qty = Number(ifRec.getCurrentSublistValue({ sublistId, fieldId: 'quantity' })) || 0;
                    log.debug('qty', qty);
                    log.debug('so_loc', so_loc)
                    ifRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'quantity', value: qty }); // 测试用 TODO
                    ifRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'location', value: so_loc });

                    // 处理库存明细：必须 selectNewLine 才能写 assignment
                    if (!isBlank(lotNum)) {
                        const inventorydetail = ifRec.getCurrentSublistSubrecord({ sublistId, fieldId: 'inventorydetail' });

                        inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                        inventorydetail.setCurrentSublistText({
                            sublistId: 'inventoryassignment',
                            fieldId: 'issueinventorynumber',
                            text: lotNum
                        });
                        inventorydetail.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            value: qty
                            // value: 1 // 测试用 TODO
                        });
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
                    fromId: newPoId,
                    toType: record.Type.ITEM_RECEIPT,
                    isDynamic: true
                });
                const irCurrencyId = irRec.getValue({ fieldId: 'currency' }) || '';
                const irTranDate = irRec.getValue({ fieldId: 'trandate' }) || new Date();

                const irLineCount = irRec.getLineCount({ sublistId }) || 0;
                var new_to_item_arr = [];
                for (let i = 0; i < irLineCount; i++) {
                    irRec.selectLine({ sublistId, line: i });
                    irRec.setCurrentSublistValue({ sublistId, fieldId: 'itemreceive', value: true });

                    const lineNo = irRec.getCurrentSublistValue({ sublistId, fieldId: 'custcol_swc_line_no' });
                    const lotNum = lots[lineNo] || '';
                    const item_id = irRec.getCurrentSublistValue({ sublistId, fieldId: 'item' });
                    const item_qty = irRec.getCurrentSublistValue({ sublistId, fieldId: 'quantity' });
                    new_to_item_arr.push({
                        item_id: item_id,
                        item_qty: item_qty,
                        lotNum: lotNum
                    });

                    const qty = Number(irRec.getCurrentSublistValue({ sublistId, fieldId: 'quantity' })) || 0;
                    irRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'quantity', value: qty }); // 测试用 TODO

                    if (!isBlank(lotNum)) {
                        const inventorydetail = irRec.getCurrentSublistSubrecord({ sublistId, fieldId: 'inventorydetail' });

                        inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                        inventorydetail.setCurrentSublistText({
                            sublistId: 'inventoryassignment',
                            fieldId: 'receiptinventorynumber',
                            text: lotNum
                        });
                        inventorydetail.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            value: qty
                            // value: 1
                        });
                        inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                    }
                    irRec.commitLine({ sublistId });
                }


                // 成交方式是EXW的场合，需要处理到岸成本费用信息
                // 只有 wl 才写头程费用
                log.debug('btnType', btnType);
                if (btnType === 'bg' || btnType === 'wl' || (btnType === 'qg' && terms_of_trade == '4')) {
                    // 费用金额获取
                    const wlRec = record.load({
                        type: 'customrecord_swc_wl_plan_order',
                        id: wlId,
                        isDynamic: false
                    });

                    const lineCount = wlRec.getLineCount({ sublistId: WL_DETAIL_SUBLIST }) || 0;

                    var poIds = {};

                    for (let i = 0; i < lineCount; i++) {
                        const poId = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_po_num', line: i });
                        const itemId = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_item', line: i });

                        // 区域 custrecord_swc_wl_d_region
                        const d_region = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_region', line: i });

                        // 品级 custcol_swc_grade
                        // 优品
                        const d_superior_qty_z = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: i });
                        // 良品
                        const d_good_qty_z = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: i });

                        var yl = d_superior_qty_z ? 1 : 2;

                        // 仓库类型 custcol_swc_loc_type
                        const d_location_type = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_location_type', line: i });

                        // 国家 custcol_swc_country_code
                        const d_country = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_country', line: i });

                        // 店铺 custcol_swc_store
                        const d_customer = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_customer', line: i });

                        const d_sku = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_sku', line: i });
                        var key = buildLandedCostKey(itemId, d_sku, d_country, d_location_type, d_region, yl, d_customer);
                        if (oldPoId == poId) {
                            var trailer_fee = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_em_trailer_fee', line: i })) || 0;
                            var cda_fee = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_em_cda_fee', line: i })) || 0;
                            var em_ffc = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_em_ffc', line: i })) || 0;
                            var bxf_fee = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_em_bxf_fee', line: i })) || 0;
                            var bxf_fee_currency = wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_em_bxf_fee_c', line: i }) || '';
                            var hyf_fee = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_em_hyf_fee', line: i })) || 0;
                            var qgf_fee = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_em_qgf_fee', line: i })) || 0;
                            var jkgs_fee = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_em_jkgs_fee', line: i })) || 0;
                            var hdf_fee = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_em_hdf_fee', line: i })) || 0;
                            var tcf_fee = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_em_tcf_fee', line: i })) || 0;

                            var rkcz = toNumber(wlRec.getSublistValue({ sublistId: WL_DETAIL_SUBLIST, fieldId: 'custrecord_swc_wl_d_em_rkcz_fee', line: i })) || 0;

                            if (bxf_fee && bxf_fee_currency && irCurrencyId && String(bxf_fee_currency) !== String(irCurrencyId)) {
                                bxf_fee = roundAmount(
                                    bxf_fee * getStandardExchangeRate(bxf_fee_currency, irCurrencyId, irTranDate)
                                );
                            }


                            if (poIds.hasOwnProperty(key)) {
                                poIds[key].trailer_fee = Number(poIds[key].trailer_fee) + trailer_fee;
                                poIds[key].cda_fee = Number(poIds[key].cda_fee) + cda_fee;
                                poIds[key].em_ffc = Number(poIds[key].em_ffc) + em_ffc;
                                poIds[key].bxf_fee = Number(poIds[key].bxf_fee) + bxf_fee;
                                poIds[key].hyf_fee = Number(poIds[key].hyf_fee) + hyf_fee;
                                poIds[key].qgf_fee = Number(poIds[key].qgf_fee) + qgf_fee;
                                poIds[key].jkgs_fee = Number(poIds[key].jkgs_fee) + jkgs_fee;
                                poIds[key].hdf_fee = Number(poIds[key].hdf_fee) + hdf_fee;
                                poIds[key].tcf_fee = Number(poIds[key].tcf_fee) + tcf_fee;

                                poIds[key].rkcz = Number(poIds[key].rkcz) + rkcz;
                            } else {
                                poIds[key] = {
                                    trailer_fee: trailer_fee,
                                    cda_fee: cda_fee,
                                    em_ffc: em_ffc,
                                    bxf_fee: bxf_fee,
                                    hyf_fee: hyf_fee,
                                    qgf_fee: qgf_fee,
                                    jkgs_fee: jkgs_fee,
                                    hdf_fee: hdf_fee,
                                    tcf_fee: tcf_fee,

                                    rkcz: rkcz,
                                }
                            }
                        }
                    }
                    log.debug('poIds', poIds);
                    log.debug('terms_of_trade', terms_of_trade);
                    applyLandedCostPerLine(irRec, poIds, terms_of_trade);
                }

                const irId = irRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
                log.debug('PO -> IR 做成', irId);
            }

            // 4) 回写追踪/状态
            if (btnType === 'wl') {
                // wl：创建追踪记录 customrecord_swc_wl_tk_t
                const wl_tk_t = record.create({ type: 'customrecord_swc_wl_tk_t', isDynamic: true });

                wl_tk_t.setValue({ fieldId: 'custrecord_wl_tk_t_wl_id', value: wlId });              // 物流发运单
                wl_tk_t.setValue({ fieldId: 'custrecord_wl_tk_t_cf', value: terms_of_trade });       // 成交方式
                wl_tk_t.setValue({ fieldId: 'custrecord_wl_tk_t_customer', value: customerId });     // 店铺
                wl_tk_t.setValue({ fieldId: 'custrecord_wl_tk_t_po', value: oldPoId });              // 原 PO

                if (!isBlank(wl_county_lsit)) {
                    wl_tk_t.setValue({ fieldId: 'custrecord_wl_tk_t_md', value: wl_county_lsit });   // 运抵国
                }

                // 供应商已发货：你原逻辑用数组 [newPoId, soId]
                if (noLocationFlag == false) {
                    wl_tk_t.setValue({ fieldId: 'custrecord_wl_tk_t_g_t', value: [newPoId, soId] });
                }

                wl_tk_t.save();

            } else if (btnType === 'bg' || btnType === 'cgbg' || btnType === 'qg') {
                var ids_arr = [newPoId, soId];
                var newToRecId;
                if (btnType === 'cgbg' || btnType === 'qg') {
                    log.debug('new_to_item_arr', new_to_item_arr);
                    // 创建 TO
                    const newToRec = record.create({
                        type: record.Type.TRANSFER_ORDER,
                        isDynamic: true
                    });
                    newToRec.setValue({ fieldId: 'subsidiary', value: to_sub });
                    newToRec.setValue({ fieldId: 'location', value: to_start_loc });
                    const warehouse_code = record.load({ type: 'customrecord_swc_wl_plan_order', id: wlId, isDynamic: true }).getValue('custrecord_swc_md_location');
                    const locationAttribute1 = resolveLocationAttribute(btnType, 'TO');
                    const bill_loc_type = btnType === 'qg' ? '' : 'TO';
                    const toLocationId = findLocationInternalId(customerId, locationAttribute1, bill_loc_type, to_sub, warehouse_code);
                    newToRec.setValue({ fieldId: 'transferlocation', value: toLocationId });
                    newToRec.setValue({ fieldId: 'orderstatus', value: 'B' });
                    newToRec.setValue({ fieldId: 'incoterm', value: 1 });
                    newToRec.setValue({ fieldId: 'useitemcostastransfercost', value: true });
                    newToRec.setValue({ fieldId: 'custbody_swc_wl_no', value: wlId });

                    //swr
                    var new_to_item_arr_hb = [];
                    if (new_to_item_arr.length > 0) {
                        new_to_item_arr_hb = getHBlot(new_to_item_arr);
                    }
                    log.debug('new_to_item_arr_hb', new_to_item_arr_hb);
                    for (var i = 0; i < new_to_item_arr_hb.length; i++) {
                        newToRec.selectNewLine({ sublistId: 'item' });
                        newToRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: new_to_item_arr_hb[i].item_id });
                        newToRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: new_to_item_arr_hb[i].item_qty });
                        if (new_to_item_arr_hb[i].lot) {
                            const inventorydetail = newToRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
                            for (var j = 0; j < new_to_item_arr_hb[i].lot.length; j++) {
                                inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                                inventorydetail.setCurrentSublistText({
                                    sublistId: 'inventoryassignment',
                                    fieldId: 'receiptinventorynumber',
                                    text: new_to_item_arr_hb[i].lot[j].lotNumber
                                });
                                inventorydetail.setCurrentSublistValue({
                                    sublistId: 'inventoryassignment',
                                    fieldId: 'quantity',
                                    value: new_to_item_arr_hb[i].lot[j].quantity
                                    // value: 1
                                });
                                inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                            }
                        }
                        newToRec.commitLine({ sublistId: 'item' });
                    }
                    //swr

                    // for (var i = 0; i < new_to_item_arr.length; i++) {
                    //     newToRec.selectNewLine({ sublistId: 'item' });
                    //     newToRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: new_to_item_arr[i].item_id });
                    //     newToRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: new_to_item_arr[i].item_qty });
                    //     if (!isBlank(new_to_item_arr[i].lotNum)) {
                    //         const inventorydetail = newToRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
                    //         inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                    //         inventorydetail.setCurrentSublistText({
                    //             sublistId: 'inventoryassignment',
                    //             fieldId: 'receiptinventorynumber',
                    //             text: new_to_item_arr[i].lotNum
                    //         });
                    //         inventorydetail.setCurrentSublistValue({
                    //             sublistId: 'inventoryassignment',
                    //             fieldId: 'quantity',
                    //             value: new_to_item_arr[i].item_qty
                    //             // value: 1
                    //         });
                    //         inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                    //     }
                    //     newToRec.commitLine({ sublistId: 'item' });
                    // }
                    newToRecId = newToRec.save({ ignoreMandatoryFields: true });
                    if (!newToRecId) {
                        log.error('TO save failed', 'error');
                        return;
                    }
                    ids_arr.push(newToRecId);
                    log.debug('TO created', newToRecId);
                    // IF：发货
                    // const ifRec = record.transform({
                    //     fromType: record.Type.TRANSFER_ORDER,
                    //     fromId: newToRecId,
                    //     toType: record.Type.ITEM_FULFILLMENT,
                    //     isDynamic: true
                    // });
                    // ifRec.setValue({ fieldId: 'shipstatus', value: 'C' });
                    // const ifId = ifRec.save({ ignoreMandatoryFields: true });
                    // if (!ifId) {
                    //     log.error('IF save failed', { newToRecId });
                    //     return;
                    // }
                    // log.debug('IF created', ifId);
                }
                // bg：写回追踪表行的“报关单据”
                if (!isBlank(tkId)) {
                    if (btnType === 'cgbg' || btnType === 'bg') {
                        record.submitFields({
                            type: 'customrecord_swc_wl_tk_t',
                            id: tkId,
                            values: { custrecord_wl_tk_t_bg_t: ids_arr }
                        });
                    } else if (btnType === 'qg') {
                        record.submitFields({
                            type: 'customrecord_swc_wl_tk_t',
                            id: tkId,
                            values: { custrecord_wl_tk_t_qg_t: ids_arr }
                        });
                    }
                }
            }

            record.submitFields({
                type: 'customrecord_swc_wl_plan_order',
                id: wlId,
                values: {
                    custrecord_my_tk_error_message: ''
                }
            });

        } catch (e) {
            record.submitFields({
                type: 'customrecord_swc_wl_plan_order',
                id: wlId,
                values: {
                    custrecord_my_tk_error_message: e.message
                }
            });
            safeUpdateWlStatusOnError(btnType, wlId);
            log.error('reduce error', e);
            throw e;
        }
    }

    // -----------------------------
    // summarize
    // -----------------------------
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
                var payloadStr = runtime.getCurrentScript().getParameter({ name: PARAM_PAYLOAD }) || '';
                var payload = parsePayload(payloadStr);
                var statusValue = getTkStatusValueByBtnType(payload.btnType);

                if (payload.wlId && statusValue) {
                    record.submitFields({
                        type: 'customrecord_swc_wl_plan_order',
                        id: payload.wlId,
                        values: { [WL_STATUS_FIELD]: statusValue }
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

    // =========================================================
    // 共通方法区
    // =========================================================

    //查询
    function getTransactionCoefficient(po_sub, customerSub, tranDate) {
        var additive_ratio = 0;
        var transactionCurrency = '';
        var exchangeRate = 1;
        var filters_arr = [];
        if (customerSub == 77) {//公司为Lettoi LLC指定查询中转公司
            filters_arr = ['custrecord_transshipment_company', 'anyof', customerSub];
        } else {
            filters_arr = ['custrecord_swc_targe_company', 'anyof', customerSub];
        }
        search.create({
            type: 'customrecord_swc_intercompany_link',
            filters: [
                ['custrecord_swc_startup_company', 'anyof', po_sub],
                'AND',
                filters_arr,
                'AND',
                ['isinactive', 'is', false]
            ],
            columns: [
                'custrecord_swc_price_factor',
                'custrecord_swc_jy_currency'
            ]
        }).run().each(function (result) {
            additive_ratio = result.getValue(result.columns[0]) ? Number(result.getValue(result.columns[0]).replace('%', '')) / 100 : 0;
            transactionCurrency = result.getValue(result.columns[1]) || '';
            return false;
        });

        var poSubsidiaryCurrency = getSubsidiaryCurrency(po_sub);
        if (poSubsidiaryCurrency && transactionCurrency && String(poSubsidiaryCurrency) !== String(transactionCurrency)) {
            exchangeRate = getStandardExchangeRate(poSubsidiaryCurrency, transactionCurrency, tranDate);
        }

        return {
            additive_ratio: additive_ratio,
            po_subsidiary_currency: poSubsidiaryCurrency,
            transaction_currency: transactionCurrency,
            subsidiary_currency: poSubsidiaryCurrency,
            exchange_rate: exchangeRate
        };
    }

    function getSubsidiaryCurrency(subsidiaryId) {
        var key = String(subsidiaryId || '');
        if (!key) return '';
        if (Object.prototype.hasOwnProperty.call(subsidiaryCurrencyCache, key)) {
            return subsidiaryCurrencyCache[key];
        }

        var subsidiaryInfo = search.lookupFields({
            type: 'subsidiary',
            id: subsidiaryId,
            columns: ['currency']
        }) || {};

        var currencyId = '';
        if (subsidiaryInfo.currency && subsidiaryInfo.currency[0] && subsidiaryInfo.currency[0].value) {
            currencyId = subsidiaryInfo.currency[0].value;
        }

        subsidiaryCurrencyCache[key] = currencyId;
        return currencyId;
    }

    function getStandardExchangeRate(sourceCurrencyId, targetCurrencyId, tranDate) {
        if (!sourceCurrencyId || !targetCurrencyId || String(sourceCurrencyId) === String(targetCurrencyId)) {
            return 1;
        }

        try {
            return Number(currency.exchangeRate({
                source: Number(sourceCurrencyId),
                target: Number(targetCurrencyId),
                date: tranDate || new Date()
            })) || 1;
        } catch (e) {
            log.error('getStandardExchangeRate error', e);
            return 1;
        }
    }

    /**
     * payload 解析："{wlId}_{btnType}"
     */
    function parsePayload(payloadStr) {
        const s = String(payloadStr || '');
        const ary = s.split('_');
        return {
            wlId: ary[0] || '',
            btnType: ary[1] || ''
        };
    }

    /**
     * 数字转换：NaN -> null
     */
    function toNumber(v) {
        const n = Number(v);
        return isNaN(n) ? null : n;
    }

    function roundAmount(v) {
        v = Number(v) || 0;
        return Math.round((v + Number.EPSILON) * 100) / 100;
    }

    /**
     * 判空
     */
    function isBlank(v) {
        return v === null || v === undefined || v === '';
    }

    function getTkStatusValueByBtnType(btnType) {
        btnType = String(btnType || '');
        if (btnType === 'wl') return 1;
        if (btnType === 'bg' || btnType === 'cgbg') return 2;
        if (btnType === 'qg') return 3;
        return '';
    }

    function validateLotAssignments(mapValue, locationId, locationLabel) {
        locationId = String(locationId || '');
        locationLabel = String(locationLabel || '来源地点');
        if (!locationId || !mapValue) return;

        for (const valueKey in mapValue) {
            if (!Object.prototype.hasOwnProperty.call(mapValue, valueKey)) continue;

            const lineObj = mapValue[valueKey] || {};
            const lotNum = String(lineObj.lot_num || '').trim();
            const itemId = String(lineObj.item_id || '').trim();

            if (!lotNum || !itemId) continue;

            if (!checkLotExistsAtLocation(itemId, lotNum, locationId)) {
                throw error.create({
                    name: 'LOT_NOT_FOUND',
                    message: 'Lot番号不存在或不在当前' + locationLabel + '。货品:' + itemId + '，Lot:' + lotNum + '，地点:' + locationId,
                    notifyOff: false
                });
            }
        }
    }

    function checkLotExistsAtLocation(itemId, lotNum, locationId) {
        const cacheKey = [String(itemId || ''), String(lotNum || ''), String(locationId || '')].join('_');
        if (Object.prototype.hasOwnProperty.call(lotValidationCache, cacheKey)) {
            return lotValidationCache[cacheKey];
        }

        let exists = false;

        try {
            const balanceSearch = search.create({
                type: 'inventorybalance',
                filters: [
                    ['item', 'anyof', itemId],
                    'AND',
                    ['location', 'anyof', locationId],
                    'AND',
                    ['inventorynumber', 'is', lotNum]
                ],
                columns: [
                    search.createColumn({ name: 'internalid', join: 'item' })
                ]
            });

            const rs = balanceSearch.run().getRange({ start: 0, end: 1 }) || [];
            exists = rs.length > 0;
        } catch (e) {
            log.error('checkLotExistsAtLocation error', {
                itemId: itemId,
                lotNum: lotNum,
                locationId: locationId,
                error: e
            });
            exists = false;
        }

        lotValidationCache[cacheKey] = exists;
        return exists;
    }

    /**
     * 安全取得店铺子公司（lookupFields 的返回结构可能为空）
     */
    function getCustomerSubsidiary(customerId) {
        if (isBlank(customerId)) return '';
        const s = search.lookupFields({
            type: 'customer',
            id: customerId,
            columns: ['subsidiary']
        }) || {};
        const arr = s['subsidiary'] || [];
        return (arr[0] && arr[0].value) ? arr[0].value : '';
    }

    /**
     * 组装 getInputData 的 key
     * wl: poId_customerId_wlCounty_btnType_terms_customerSub_wlId
     * bg: 上面基础上再加 _toId_tkId
     */
    function buildInputKey(p) {
        const base = [
            p.poId,
            p.customerId,
            p.wl_county_lsit,
            p.btnType,
            p.terms_of_trade,
            p.customerSub,
            p.wlId
        ].map(v => String(v || '')).join('_');

        if (p.btnType === 'bg' || p.btnType === 'cgbg' || p.btnType === 'qg') {
            return base + '_' + String(p.toId || '') + '_' + String(p.tkId || '');
        }
        return base;
    }

    /**
     * 组装“行识别 key”（决定是否复制某条 item 行）
     */
    function buildLineValueKey(p) {
        return [
            p.skuId,
            p.sku,
            p.country,
            p.location_type,
            p.region,
            p.yl,
            p.customer
        ].map(v => String(v || '')).join('_');
    }

    /**
     * 从 PO 的 item 行构建 valueKey
     */
    function buildPoLineValueKeyFromPo(poRec, sublistId, line) {
        const skuId = poRec.getSublistValue({ sublistId, fieldId: 'item', line });
        const sku = poRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_pr_origin_sku', line });
        const country = poRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_country_code', line });
        const location_type = poRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_loc_type', line });
        const region = poRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_us_districts', line });
        const yl = poRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_grade', line });
        const customer = poRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_store', line });


        return buildLineValueKey({ skuId, sku, country, location_type, region, yl, customer });
    }

    function buildLandedCostKey(itemId, originSku, country, locationType, region, grade, customer) {
        return [
            itemId,
            originSku,
            country,
            locationType,
            region,
            grade,
            customer
        ].map(v => String(v || '')).join('_');
    }

    /**
     * location attribute 推导
     */
    function resolveLocationAttribute(btnType, terms_of_trade) {
        const t = String(terms_of_trade || '');
        if (btnType === 'wl') {
            // 你原逻辑：terms_of_trade==1 => 4，否则未定义。这里给一个可运行的默认值（比如 4/2 这种）
            if (t === '1') return '4';
            return '2'; // 默认一个合理的 attribute，避免空
        }
        if (btnType === 'bg') {
            // 你原逻辑：terms_of_trade==2 => 11，否则未定义
            if (t === '2') return '5';
            return '5'; // 报关通常也是海外/国外在途，直接固定，避免空
        }
        if (btnType === 'cgbg') {
            if (t == 'TO') {
                return '11';//保税仓
            } else {
                return '4';//海外国内在途仓
            }
        }
        if (btnType === 'qg') {
            if (t == 'TO') {
                return '6';//海外仓
            }
            return '5';//海外国外在途仓
        }
        return '2';
    }

    /**
     * 根据店铺 + 仓库属性查 location internalid
     */
    function findLocationInternalId(customerId, locationAttribute, loc_type, newSub, warehouse_code) {
        if (isBlank(customerId) || isBlank(locationAttribute)) return '';
        var filters_arr = [];
        filters_arr.push(["custrecord_swc_location_store", "anyof", customerId]);
        filters_arr.push('AND', ["custrecord_swc_location_attribute", "anyof", locationAttribute]);
        filters_arr.push('AND', ["isinactive", "is", false]);
        if (loc_type == 'TO') {
            filters_arr.push('AND', ["custrecord_swc_location_type", "anyof", 3]);
            filters_arr.push('AND', ["custrecord_swc_warehouse_code", "anyof", warehouse_code]);
        }

        if (newSub) {
            filters_arr.push('AND', ["subsidiary", "anyof", newSub]);
        }


        const locationSearchObj = search.create({
            type: "location",
            filters: filters_arr,
            columns: [search.createColumn({ name: "internalid" })]
        });

        const rs = locationSearchObj.run().getRange({ start: 0, end: 1 });
        if (!rs || rs.length === 0) return '';

        return rs[0].getValue({ name: 'internalid' }) || '';
    }

    /**
     * 复制一行的多个字段（统一封装，避免重复代码）
     */
    function copyLineFields(srcRec, dstRec, sublistId, srcLine, fieldIds, transactionInfo, qty) {

        log.debug('srcRec', srcRec);
        log.debug('dstRec', dstRec);
        log.debug('sublistId', sublistId);
        log.debug('srcLine', srcLine);
        log.debug('fieldIds', fieldIds);
        log.debug('transactionInfo', transactionInfo);
        log.debug('qty', qty);

        var additiveRatio = transactionInfo && transactionInfo.additive_ratio !== undefined && transactionInfo.additive_ratio !== null
            ? Number(transactionInfo.additive_ratio)
            : 0;
        var exchangeRate = transactionInfo && transactionInfo.exchange_rate ? Number(transactionInfo.exchange_rate) : 1;
        var additiveMultiplier = isFinite(additiveRatio) && additiveRatio > 0 ? additiveRatio : 0;

        log.debug('exchangeRate', exchangeRate);
        log.debug('additiveMultiplier', additiveMultiplier);

        for (let i = 0; i < fieldIds.length; i++) {
            const fid = fieldIds[i];
            var v = srcRec.getSublistValue({ sublistId, fieldId: fid, line: srcLine });
            if (fid == 'rate') {
                // 未税价格（rate）的计算方式，为custcol_swc_including_tax_amt的就算方式，两套计算方式相同
                // v = v * exchangeRate * (1 + additiveMultiplier);

                const tax_amt = srcRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_including_tax_amt', line: srcLine });
                log.debug('tax_amt', tax_amt);
                v = tax_amt * exchangeRate * (1 + additiveMultiplier);

            } else if (fid == 'custcol_swc_including_tax_amt') {
                const tax_amt = srcRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_including_tax_amt', line: srcLine });
                log.debug('tax_amt', tax_amt);
                v = tax_amt * exchangeRate * (1 + additiveMultiplier);
            } else if (fid == 'amount') {
                const rate = srcRec.getSublistValue({ sublistId, fieldId: 'rate', line: srcLine });
                v = rate * exchangeRate * (1 + additiveMultiplier) * qty;
            } else if (fid == 'quantity') {
                v = qty;
            } else if (fid == 'item') {
                v = srcRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_pr_origin_sku', line: srcLine });
            }
            // 注意：某些字段不能 setCurrentSublistValue（例如 text-only/不可写字段）会抛错，必要时可加 try/catch 或白名单。
            v ? dstRec.setCurrentSublistValue({ sublistId, fieldId: fid, value: v }) : '';
        }
    }

    /**
     * 组装 reduce key（避免散落字符串拼接）
     */
    function buildReduceKey(p) {
        const base = [
            p.newPoId,
            p.soId,
            p.wl_county_lsit,
            p.wlId,
            p.terms_of_trade,
            p.oldPoId,
            p.customerId,
            p.btnType
        ].map(v => String(v || '')).join('_');

        if (p.btnType === 'bg' || p.btnType === 'cgbg' || p.btnType === 'wl' || p.btnType === 'qg') {
            return base + '_' + String(p.tkId || '') + '_' + String(p.to_sub || '') + '_' + String(p.to_start_loc || '') + '_' + String(p.so_loc || '') + '_' + String(p.noLocationFlag || '');
        }
        return base;
    }

    /**
     * 合并 reduce 的 values（map 可能多次 write 同一 key）
     */
    function mergeLotJsonValues(values) {
        const out = {};
        for (let i = 0; i < (values || []).length; i++) {
            const obj = JSON.parse(values[i] || '{}');
            for (const k in obj) {
                if (!obj.hasOwnProperty(k)) continue;
                out[String(k)] = obj[k];
            }
        }
        return out;
    }

    /**
     * 异常时写物流发运单状态（wl=4, bg=5）
     */
    function safeUpdateWlStatusOnError(btnType, wlId) {
        try {
            if (isBlank(wlId)) return;

            if (btnType === 'wl') {
                // record.submitFields({
                //     type: 'customrecord_swc_wl_plan_order',
                //     id: wlId,
                //     values: { [WL_STATUS_FIELD]: 4 }
                // });
            } else if (btnType === 'bg') {
                // record.submitFields({
                //     type: 'customrecord_swc_wl_plan_order',
                //     id: wlId,
                //     values: { [WL_STATUS_FIELD]: 5 }
                // });
            }
        } catch (e) {
            log.error('safeUpdateWlStatusOnError', e);
        }
    }

    function applyLandedCostPerLine(irRec, poIds, terms_of_trade) {
        try {
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

            let feeFields = [];
            if (terms_of_trade == '2') {
                feeFields = ['bxf_fee', 'hyf_fee', 'qgf_fee', 'jkgs_fee', 'hdf_fee', 'tcf_fee', 'rkcz'];
            } else if (terms_of_trade == '1') {
                feeFields = ['trailer_fee', 'cda_fee', 'em_ffc', 'bxf_fee', 'hyf_fee', 'qgf_fee', 'jkgs_fee', 'hdf_fee', 'tcf_fee'];
            } else if (terms_of_trade == '4') {
                feeFields = ['jkgs_fee', 'rkcz'];
            } else if (terms_of_trade == '3') {
                feeFields = ['rkcz'];
            }

            const sublistId = 'item';
            const lineCount = irRec.getLineCount({ sublistId }) || 0;

            for (let i = 0; i < lineCount; i++) {
                const itemId = irRec.getSublistValue({ sublistId, fieldId: 'item', line: i });
                const d_region = irRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_us_districts', line: i });
                const yl = irRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_grade', line: i });
                const d_location_type = irRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_loc_type', line: i });
                const d_country = irRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_country_code', line: i });
                const d_customer = irRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_store', line: i });

                const originSku = irRec.getSublistValue({ sublistId, fieldId: 'custcol_swc_pr_origin_sku', line: i });
                const key = buildLandedCostKey(itemId, originSku, d_country, d_location_type, d_region, yl, d_customer);
                log.debug('key', key);

                if (!poIds || !Object.prototype.hasOwnProperty.call(poIds, key)) continue;

                irRec.selectLine({ sublistId, line: i });

                const obj = poIds[key];

                for (const feeKey in obj) {
                    if (!feeFields.includes(feeKey)) continue;

                    const amountValue = Number(obj[feeKey] || 0);
                    if (!amountValue) continue;

                    const costCategory = feeMaping[feeKey];
                    if (!costCategory) continue;

                    // 关键：每次写入前重新获取当前行的 subrecord 引用，避免引用失效
                    const lcSub = irRec.getCurrentSublistSubrecord({ sublistId, fieldId: 'landedcost' });

                    lcSub.selectNewLine({ sublistId: 'landedcostdata' });
                    lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: costCategory });
                    lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'amount', value: amountValue });
                    lcSub.commitLine({ sublistId: 'landedcostdata' });

                    log.debug('landedcost added', { line: i, feeKey, amountValue, costCategory });
                }

                irRec.commitLine({ sublistId });
            }
        } catch (e) {
            log.error('applyLandedCostPerLine error', e);
            throw e;
        }
    }

    function aggregateLines(lines, cjType) {
        var feeFields = [];

        if (cjType == '2') {// 国内FOB   头程海运费,海运保险费,目的国进口关税,目的港拖车费,目的港清关代理费,目的港货代费用
            feeFields = ['bxf_fee', 'hyf_fee', 'qgf_fee', 'jkgs_fee', 'hdf_fee', 'tcf_fee'];
        } else if (cjType == '1') { // EXW  头程海运费,海运保险费,目的国进口关税,目的港拖车费,目的港清关代理费,目的港货代费用, 国内港报关代理费, 国内港拖车费, 国内港货代费用
            feeFields = ['trailer_fee', 'cda_fee', 'em_ffc', 'bxf_fee', 'hyf_fee', 'qgf_fee', 'jkgs_fee', 'hdf_fee', 'tcf_fee'];
        } else if (cjType == '4') { // DDU
            feeFields = ['jkgs_fee'];
        }

        const out = { gys: null, items: {} };

        for (let i = 0; i < (lines || []).length; i++) {
            const ln = lines[i] || {};
            const sku = String(ln.sku || '').trim();
            const lot = String(ln.lotNum || '').trim();
            const qty = Number(ln.qty || 0);
            if (!sku || qty <= 0) continue;

            if (out.gys === null && ln.gys) out.gys = String(ln.gys);

            if (!out.items[sku]) {
                out.items[sku] = { lot: {}, fee: {} };
                for (let f = 0; f < feeFields.length; f++) out.items[sku].fee[feeFields[f]] = 0;
            }

            if (!out.items[sku].lot[lot]) out.items[sku].lot[lot] = 0;
            out.items[sku].lot[lot] += qty;

            for (let f = 0; f < feeFields.length; f++) {
                const field = feeFields[f];
                out.items[sku].fee[field] += Number(ln[field] || 0);
            }
        }
        return out;
    }

    function getHBlot(arr) {
        // 使用 Map 按 item_id 分组聚合
        const map = new Map();

        for (const item of arr) {
            const id = item.item_id;
            if (!map.has(id)) {
                // 初始化聚合对象
                map.set(id, {
                    item_id: id,
                    item_qty: 0,
                    lot: []
                });
            }

            const aggregated = map.get(id);
            // 累加总数量
            aggregated.item_qty += item.item_qty;

            // 如果存在批次号，则添加到 lot 数组
            if (item.lotNum) { // 可根据需要替换为 !isBlank(item.lotNum)
                aggregated.lot.push({
                    lotNumber: item.lotNum,
                    quantity: item.item_qty
                });
            }
        }

        // 清空原数组并填充聚合后的结果
        arr.length = 0;
        arr.push(...map.values());

        return arr
    }

    return { getInputData, map, reduce, summarize };
});
