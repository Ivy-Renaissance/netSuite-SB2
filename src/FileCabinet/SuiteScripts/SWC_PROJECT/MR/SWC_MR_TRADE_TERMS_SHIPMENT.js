/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * 贸易条款 - 转移单
 */
define(['N/runtime', 'N/record', 'N/search', 'N/log', 'N/error'], (runtime, record, search, log, error) => {

    // -----------------------------
    // 常量：脚本参数
    // -----------------------------
    const PARAM_PAYLOAD = 'custscript_payload'; // 传入的字符串："{wlId}_{btnType}"

    // -----------------------------
    // getInputData：整理输入数据
    // -----------------------------
    function getInputData() {
        try {
            const payloadStr = runtime.getCurrentScript().getParameter({ name: PARAM_PAYLOAD }) || '';
            if (!payloadStr || payloadStr.indexOf('_') < 0) {
                log.error('getInputData', `payload 参数格式不正确: ${payloadStr}`);
                return [];
            }

            const poLocationCache = {};
            const toLocationCache = {};
            const lotValidationCache = {};
            const lotValidationErrors = [];

            function getPoLocation(poId) {
                const key = String(poId || '');
                if (!key) return '';
                if (Object.prototype.hasOwnProperty.call(poLocationCache, key)) {
                    return poLocationCache[key];
                }

                const poInfo = search.lookupFields({
                    type: 'purchaseorder',
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
                    type: 'transferorder',
                    id: toId,
                    columns: ['transferlocation']
                }) || {};

                const locationArr = toInfo.transferlocation || [];
                const locationId = (locationArr[0] && locationArr[0].value) ? String(locationArr[0].value) : '';
                toLocationCache[key] = locationId;
                return locationId;
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
                    log.error('checkLotExistsAtLocation error', { itemId, lotNum, locationId, error: e });
                    exists = false;
                }

                lotValidationCache[cacheKey] = exists;
                return exists;
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

            function abortIfLotInvalid() {
                if (lotValidationErrors.length === 0) return false;
                record.submitFields({
                    type: 'customrecord_swc_wl_plan_order',
                    id: wlId,
                    values: {
                        custrecord_my_tk_error_message: lotValidationErrors.join('。')
                    }
                });
                return true;
            }

            const wlAry = String(payloadStr).split('_');
            const wlId = wlAry[0];
            const btnType = wlAry[1];

            const wlRec = record.load({
                type: 'customrecord_swc_wl_plan_order',
                id: wlId,
                isDynamic: false
            });

            const terms_of_trade = wlRec.getValue('custrecord_swc_wl_terms_of_trade'); // 成交方式
            const md_location = wlRec.getValue('custrecord_swc_md_location');          // 目的仓（字段值）
            const wl_county_lsit = wlRec.getValue('custrecord_swc_wl_county_lsit');    // 运抵国

            const documentData = {
                type: terms_of_trade,
                md_location: md_location,
                source_plan_order_id: wlId,
                btnType: btnType,
                wl_county_lsit: wl_county_lsit,
                poData: {}
            };

            const list = [];

            // -----------------------------
            // 分支1：wl（供应商已出货）
            // -----------------------------
            if (btnType === 'wl' || btnType === 'cgwl') {
                const feeSubID = 'recmachcustrecord_swc_wl_plan_order_id';
                const lineCount = wlRec.getLineCount({ sublistId: feeSubID }) || 0;

                for (let i = 0; i < lineCount; i++) {
                    const poId = wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_po_num', line: i });
                    const customerId = wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_customer', line: i });
                    const skuId = wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_sku', line: i });
                    const superiorQty = toNumber(wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: i })) || 0;
                    const goodQty = toNumber(wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: i })) || 0;
                    const vendorId = wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_vendor', line: i });
                    const lotNum = wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_lot', line: i });

                    const trailer_fee = toNumber(wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_trailer_fee', line: i })) || 0;
                    const cda_fee = toNumber(wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_cda_fee', line: i })) || 0;
                    const em_ffc = toNumber(wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_ffc', line: i })) || 0;
                    const bxf_fee = toNumber(wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_bxf_fee', line: i })) || 0;
                    const hyf_fee = toNumber(wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_hyf_fee', line: i })) || 0;
                    const qgf_fee = toNumber(wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_qgf_fee', line: i })) || 0;
                    const jkgs_fee = toNumber(wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_jkgs_fee', line: i })) || 0;
                    const hdf_fee = toNumber(wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_hdf_fee', line: i })) || 0;
                    const tcf_fee = toNumber(wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_tcf_fee', line: i })) || 0;

                    const rkcz = toNumber(wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_rkcz_fee', line: i })) || 0;

                    if (isBlank(poId) || isBlank(customerId) || isBlank(skuId)) continue;

                    const qty = (Number(superiorQty) || 0) + (Number(goodQty) || 0);
                    if (qty <= 0) continue;
                    collectLotValidationError(skuId, lotNum, getPoLocation(poId), '原PO地点');

                    const poBucket = ensure(documentData.poData, String(poId), {});
                    const custLines = ensure(poBucket, String(customerId), []);

                    custLines.push({
                        sku: skuId,
                        qty: qty,
                        lotNum: lotNum || '',
                        gys: vendorId || '',
                        trailer_fee,
                        cda_fee,
                        em_ffc,
                        bxf_fee,
                        hyf_fee,
                        qgf_fee,
                        jkgs_fee,
                        hdf_fee,
                        tcf_fee,
                        rkcz
                    });
                }

                if (abortIfLotInvalid()) return [];
                flattenPoDataToList(documentData, list);
                log.debug('getInputData list (wl/cgwl)', JSON.stringify(list));
                return list;
            }

            // -----------------------------
            // 分支2：bg（报关）
            // EXW(=1)：前置是 PO（公司间交易逻辑）
            // 非 EXW：前置为上一阶段已生成的 TO（从追踪表里取 custrecord_wl_tk_t_g_t），基于它做二次转移
            // -----------------------------
            if (btnType === 'bg') {
                log.debug('terms_of_trade', terms_of_trade);

                const feeSubID = 'recmachcustrecord_swc_wl_plan_order_id';
                const lineCount = wlRec.getLineCount({ sublistId: feeSubID }) || 0;

                // 入库费用TODO
                var feeObj = {};
                for (let i = 0; i < lineCount; i++) {
                    const customerId = wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_customer', line: i });
                    const skuId = wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_sku', line: i });

                    const rkcz = toNumber(wlRec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_rkcz_fee', line: i })) || 0;

                    var key = customerId + '_' + skuId;
                    if (feeObj.hasOwnProperty(key)) {
                        var oldRkcz = feeObj[key]
                        feeObj[key] = Number(oldRkcz) + Number(rkcz);
                    } else {
                        feeObj[key] = rkcz
                    }
                }

                // EXW：仍按你原逻辑（从 PO + Item Receipt 找批次）
                if (Number(terms_of_trade) === 1) {
                    const tkSub = 'recmachcustrecord_wl_tk_t_wl_id';
                    const tkCount = wlRec.getLineCount({ sublistId: tkSub }) || 0;

                    const tkRows = []; // [{ tk_id, poId, customerId, toId }, ...]

                    for (let i = 0; i < tkCount; i++) {
                        const toIds = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_g_t', line: i });
                        const toId = Array.isArray(toIds) ? toIds[0] : toIds;
                        const customerId = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_customer', line: i });
                        const poId = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_po', line: i });
                        const wlPoId = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_g_t', line: i });
                        const tk_id = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'id', line: i });

                        if (isBlank(poId) || isBlank(customerId) || isBlank(tk_id)) continue;

                        tkRows.push({
                            tk_id: tk_id,
                            poId: String(poId),
                            customerId: String(customerId),
                            toId: toId ? String(toId) : '',
                            wlPoId: wlPoId[1]
                        });
                    }

                    log.debug('tkRows', tkRows);

                    if (tkRows.length === 0) {
                        log.debug('bg: no tkRows', '未找到公司间交易明细（tkSub为空或字段缺失）');
                        return [];
                    }

                    for (let r = 0; r < tkRows.length; r++) {
                        const row = tkRows[r];
                        // const poId = row.poId;
                        const poId = row.toId;
                        const customerId = row.customerId;
                        const tk_id = row.tk_id;

                        const lotMapByItem = getLotQtyMapByItemReceipt(poId);

                        const poRec = record.load({
                            type: record.Type.PURCHASE_ORDER,
                            id: poId,
                            isDynamic: false
                        });

                        const poLineCount = poRec.getLineCount({ sublistId: 'item' }) || 0;
                        const vendorId = poRec.getValue({ fieldId: 'entity' });
                        var lotTextAry = [];
                        for (let i = 0; i < poLineCount; i++) {
                            const skuId = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_origin_sku', line: i });
                            const store = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_store', line: i });
                            const poQty = toNumber(poRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })) || 0;
                            if (isBlank(skuId) || poQty <= 0) continue;

                            const lots = lotMapByItem[String(skuId)] || [];

                            // 入库费用TODO
                            var key2 = customerId + '_' + skuId

                            if (lots.length > 0) {
                                for (let k = 0; k < lots.length; k++) {
                                    const lotText = lots[k].lotText || '';
                                    const qty = Number(lots[k].qty || 0);
                                    if (qty <= 0) continue;

                                    if (lotTextAry.indexOf(lotText) == -1) {
                                        collectLotValidationError(skuId, lotText, getPoLocation(poId), '原PO地点');
                                        const poBucket = ensure(documentData.poData, String(poId), {});
                                        const custLines = ensure(poBucket, String(customerId), []);
                                        custLines.push({
                                            sku: skuId,
                                            qty: qty,
                                            lotNum: lotText,
                                            gys: vendorId || '',
                                            tk_id: tk_id,
                                            store: store,
                                            rkcz: feeObj.hasOwnProperty(key2) ? feeObj[key2] : ''// 入库费用TODO
                                        });
                                        lotTextAry.push(lotText);
                                    }

                                }
                            } else {
                                if (store == customerId) {
                                    const poBucket = ensure(documentData.poData, String(poId), {});
                                    const custLines = ensure(poBucket, String(customerId), []);
                                    custLines.push({
                                        sku: skuId,
                                        qty: poQty,
                                        lotNum: '',
                                        gys: vendorId || '',
                                        tk_id: tk_id,
                                        store: store,
                                        rkcz: ''// 入库费用TODO
                                    });
                                }
                            }
                        }
                    }

                    log.debug('documentData', documentData);
                    if (abortIfLotInvalid()) return [];
                    flattenPoDataToList2(documentData, list, { includeTkId: true });
                    log.debug('getInputData list (bg-exw)', JSON.stringify(list));
                    return list;
                }

                // -----------------------------
                // 非 EXW：前置为上一阶段 TO，基于该 TO 明细（含批次）做二次转移
                // -----------------------------
                const tkSub = 'recmachcustrecord_wl_tk_t_wl_id';
                const tkCount = wlRec.getLineCount({ sublistId: tkSub }) || 0;

                if (tkCount === 0) {
                    log.debug('bg(non-exw): no tk lines', `wlId=${wlId}`);
                    return [];
                }

                for (let i = 0; i < tkCount; i++) {
                    const rawToIds = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_g_t', line: i });
                    const srcToId = Array.isArray(rawToIds) ? rawToIds[0] : rawToIds;

                    const customerId = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_customer', line: i });
                    const poId = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_po', line: i });
                    const tk_id = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'id', line: i });

                    if (isBlank(srcToId) || isBlank(customerId) || isBlank(poId) || isBlank(tk_id)) {
                        log.debug('bg(non-exw) skip missing fields', { srcToId, customerId, poId, tk_id });
                        continue;
                    }

                    const src = getLinesFromTransferOrder(String(srcToId));
                    if (!src || !Array.isArray(src.lines) || src.lines.length === 0) {
                        log.debug('bg(non-exw): no lines from TO', { srcToId });
                        continue;
                    }

                    for (let s = 0; s < src.lines.length; s++) {
                        const srcLine = src.lines[s] || {};
                        collectLotValidationError(srcLine.sku, srcLine.lotNum, src.fromLocationId, '来源转移单目标地点');
                    }

                    list.push({
                        cjType: terms_of_trade,
                        poId: String(poId),
                        shopId: String(customerId),
                        md_location: String(md_location),
                        btnType: String(btnType),
                        wlId: String(wlId),
                        countyLsit: wl_county_lsit,
                        tk_id: String(tk_id),

                        // 关键：map 里据此判断“从TO二次转移”
                        sourceType: 'TO',
                        sourceId: String(srcToId),
                        subsidiaryId: src.subsidiaryId,
                        fromLocationId: src.fromLocationId,

                        lines: src.lines
                    });
                }

                if (abortIfLotInvalid()) return [];
                log.debug('getInputData list (bg-non-exw)', JSON.stringify(list));
                return list;
            }

            if (btnType === 'qg' || btnType === 'cgqg') {

                // 国内FOB 前置单据 公司间交易
                if (Number(terms_of_trade) === 2 && btnType !== 'cgqg') {
                    const tkSub = 'recmachcustrecord_wl_tk_t_wl_id';
                    const tkCount = wlRec.getLineCount({ sublistId: tkSub }) || 0;

                    const tkRows = []; // [{ tk_id, poId, customerId, toId }, ...]

                    for (let i = 0; i < tkCount; i++) {
                        const toIds = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_bg_t', line: i });
                        const toId = Array.isArray(toIds) ? toIds.sort(function (a, b) { return a - b; })[0] : toIds;
                        const customerId = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_customer', line: i });
                        const poId = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_bg_t', line: i });
                        const tk_id = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'id', line: i });

                        if (isBlank(poId) || isBlank(customerId) || isBlank(tk_id)) continue;

                        tkRows.push({
                            tk_id: tk_id,
                            poId: String(toId),
                            customerId: String(customerId),
                            toId: toId ? String(toId) : ''
                        });
                    }

                    if (tkRows.length === 0) {
                        log.debug('bg: no tkRows', '未找到公司间交易明细（tkSub为空或字段缺失）');
                        return [];
                    }
                    log.debug('tkRows', tkRows);

                    for (let r = 0; r < tkRows.length; r++) {
                        const row = tkRows[r];
                        const poId = row.poId;
                        const customerId = row.customerId;
                        const tk_id = row.tk_id;
                        log.debug('row', row);
                        log.debug('poId', poId);
                        log.debug('customerId', customerId);
                        log.debug('tk_id', tk_id);

                        // const lotMapByItem = getLotQtyMapByItemReceipt(poId);
                        const lotMapByItem = getNewLotQtyMapByItemReceipt(poId);
                        log.debug('lotMapByItem', lotMapByItem);

                        const poRec = record.load({
                            type: record.Type.PURCHASE_ORDER,
                            id: poId,
                            isDynamic: false
                        });

                        const poLineCount = poRec.getLineCount({ sublistId: 'item' }) || 0;
                        const vendorId = poRec.getValue({ fieldId: 'entity' });

                        for (let i = 0; i < poLineCount; i++) {
                            const skuId = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_origin_sku', line: i });
                            const lineId = poRec.getSublistValue({ sublistId: 'item', fieldId: 'line', line: i });

                            const poQty = toNumber(poRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })) || 0;
                            if (isBlank(skuId) || poQty <= 0) continue;
                            const lots = lotMapByItem[String(lineId)] || [];
                            log.debug('lots', lots);
                            if (lots.length > 0) {
                                for (let k = 0; k < lots.length; k++) {
                                    const lotText = lots[k].lotText || '';
                                    const qty = Number(lots[k].qty || 0);
                                    if (qty <= 0) continue;
                                    collectLotValidationError(skuId, lotText, getPoLocation(poId), '原PO地点');

                                    const poBucket = ensure(documentData.poData, String(poId), {});
                                    const custLines = ensure(poBucket, String(customerId), []);
                                    custLines.push({
                                        sku: skuId,
                                        qty: qty,
                                        lotNum: lotText,
                                        gys: vendorId || '',
                                        tk_id: tk_id
                                    });
                                }
                            } else {
                                const poBucket = ensure(documentData.poData, String(poId), {});
                                const custLines = ensure(poBucket, String(customerId), []);
                                custLines.push({
                                    sku: skuId,
                                    qty: poQty,
                                    lotNum: '',
                                    gys: vendorId || '',
                                    tk_id: tk_id
                                });
                            }
                        }
                    }

                    if (abortIfLotInvalid()) return [];
                    flattenPoDataToList(documentData, list, { includeTkId: true });
                    log.debug('getInputData list (bg-exw)', JSON.stringify(list));
                    return list;

                }
                // 其余成交方式 前置单据 转移单
                const tkSub = 'recmachcustrecord_wl_tk_t_wl_id';
                const tkCount = wlRec.getLineCount({ sublistId: tkSub }) || 0;

                if (tkCount === 0) {
                    log.debug('bg(non-exw): no tk lines', `wlId=${wlId}`);
                    return [];
                }
                var locationError = [];
                for (let i = 0; i < tkCount; i++) {
                    var rawToIds, srcToId;
                    if (terms_of_trade == 5) {
                        if (btnType === 'cgqg') {
                            var toIds = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_g_t', line: i });
                            srcToId = Array.isArray(toIds) ? toIds.sort(function (a, b) { return b - a; })[0] : toIds;
                        } else {
                            srcToId = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_g_t', line: i });
                        }
                    } else {
                        rawToIds = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_bg_t', line: i });
                        srcToId = getSrcToId(rawToIds);
                    }

                    const customerId = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_customer', line: i });
                    const customerText = wlRec.getSublistText({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_customer', line: i });
                    const poId = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_po', line: i });
                    const tk_id = wlRec.getSublistValue({ sublistId: tkSub, fieldId: 'id', line: i });

                    if (isBlank(srcToId) || isBlank(customerId) || isBlank(poId) || isBlank(tk_id)) {
                        log.debug('bg(non-exw) skip missing fields', { srcToId, customerId, poId, tk_id });
                        continue;
                    }
                    const subsidiaryId = record.load({ type: record.Type.TRANSFER_ORDER, id: srcToId, isDynamic: false }).getValue({ fieldId: 'subsidiary' });
                    const locationAttribute = resolveLocationAttribute(btnType, terms_of_trade);
                    log.debug('customerId', customerId) // 店铺
                    log.debug('locationAttribute', locationAttribute) // 仓库属性
                    log.debug('subsidiaryId', subsidiaryId) // 子公司
                    const newLocationId = findToLocation(customerId, locationAttribute, subsidiaryId, '', btnType, md_location);
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

                    const src = getLinesFromTransferOrder(String(srcToId));
                    if (!src || !Array.isArray(src.lines) || src.lines.length === 0) {
                        log.debug('bg(non-exw): no lines from TO', { srcToId });
                        continue;
                    }

                    for (let s = 0; s < src.lines.length; s++) {
                        const srcLine = src.lines[s] || {};
                        collectLotValidationError(srcLine.sku, srcLine.lotNum, src.fromLocationId, '来源转移单目标地点');
                    }

                    list.push({
                        cjType: terms_of_trade,
                        poId: String(poId),
                        shopId: String(customerId),
                        md_location: String(md_location),
                        btnType: String(btnType),
                        wlId: String(wlId),
                        countyLsit: wl_county_lsit,
                        tk_id: String(tk_id),

                        // 关键：map 里据此判断“从TO二次转移”
                        sourceType: 'TO',
                        sourceId: String(srcToId),
                        subsidiaryId: src.subsidiaryId,
                        fromLocationId: src.fromLocationId,

                        lines: src.lines
                    });
                }
                if (locationError.length > 0) {
                    record.submitFields({
                        type: 'customrecord_swc_wl_plan_order',
                        id: wlId,
                        values: {
                            custrecord_my_tk_error_message: locationError.join('。')
                        }
                    });
                    return []
                }
                if (abortIfLotInvalid()) return [];
                log.debug('getInputData list (bg-non-exw)', JSON.stringify(list));
                return list;

            }


        } catch (e) {
            log.error('getInputData error', e);
            return [];
        }
    }

    // -----------------------------
    // map：每条输入创建一张 TO（以及 IF/IR/落地成本等）
    // -----------------------------
    function map(context) {
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

        const value = JSON.parse(context.value || '{}');
        log.debug('value', value);

        const poId = value.poId;
        const shopId = value.shopId;
        const mdLocationId = toNumber(value.md_location);
        // 成交方式
        const cjType = toNumber(value.cjType);
        // 按钮状态
        const btnType = String(value.btnType || '');
        const lines = value.lines || [];
        const wlId = value.wlId;
        const countyLsit = value.countyLsit;
        const tk_id = value.tk_id || '';
        var to_ids = [];
        try {
            if (!poId || !shopId) {
                log.debug('map skip (missing poId/shopId)', { poId, shopId });
                return;
            }
            if (!mdLocationId) {
                throw new Error(`md_location 无效：${value.md_location}`);
            }
            if (!Array.isArray(lines) || lines.length === 0) {
                log.debug('map skip (no lines)', { poId, shopId });
                return;
            }

            // 先聚合（按 sku + lot 汇总数量，并按 sku 汇总费用）
            const agg = aggregateLines(lines, cjType, btnType);
            const items = agg.items || {};
            if (Object.keys(items).length === 0) {
                log.debug('map skip (items empty after aggregate)', { poId, shopId });
                return;
            }
            log.debug('items', items);
            // 创建 TO（必须先创建再 setValue）
            const toRec = record.create({
                type: record.Type.TRANSFER_ORDER,
                isDynamic: true
            });

            // 决定 subsidiary / 起始仓（location）
            let subsidiaryId = null;
            let fromLocationId = null;

            // 非 EXW(bg) 的二次转移：起始仓 = 上一张TO的目的仓(transferlocation)
            if (String(value.sourceType || '') === 'TO' && value.sourceId) {
                subsidiaryId = value.subsidiaryId || null;
                fromLocationId = toNumber(value.fromLocationId);

                if (!subsidiaryId || !fromLocationId) {
                    const srcTo = record.load({ type: record.Type.TRANSFER_ORDER, id: value.sourceId, isDynamic: false });
                    if (!subsidiaryId) subsidiaryId = srcTo.getValue({ fieldId: 'subsidiary' }) || null;
                    if (!fromLocationId) fromLocationId = toNumber(srcTo.getValue({ fieldId: 'transferlocation' }));
                }
            } else {
                // wl 或其他：从 PO 获取 subsidiary / location
                const poRec = record.load({ type: record.Type.PURCHASE_ORDER, id: poId, isDynamic: false });
                subsidiaryId = poRec.getValue({ fieldId: 'subsidiary' }) || null;
                fromLocationId = toNumber(poRec.getValue({ fieldId: 'location' }));
            }

            if (subsidiaryId) toRec.setValue({ fieldId: 'subsidiary', value: subsidiaryId });
            if (!fromLocationId) {
                throw new Error(`起始仓为空，无法创建 TO。poId=${poId}, sourceType=${value.sourceType}, sourceId=${value.sourceId}`);
            }
            toRec.setValue({ fieldId: 'location', value: fromLocationId });
            toRec.setValue({ fieldId: 'custbody_swc_wl_no', value: wlId });

            // 目的仓：按店铺 + attribute 搜索 location
            log.debug('btnType', btnType); // 按钮缩写
            log.debug('cjType', cjType); // 成交方式
            const locationAttribute = resolveLocationAttribute(btnType, cjType);

            log.debug('shopId', shopId) // 店铺
            log.debug('locationAttribute', locationAttribute) // 仓库属性
            log.debug('subsidiaryId', subsidiaryId) // 子公司

            const toLocationId = findToLocation(shopId, locationAttribute, subsidiaryId, '', btnType, mdLocationId);
            if (!toLocationId) {
                log.debug('目的仓不存在，请确认', { shopId, locationAttribute });
                throw error.create({ name: '5011', message: '目的仓不存在，请确认', notifyOff: false });
            }
            toRec.setValue({ fieldId: 'transferlocation', value: toLocationId });
            log.debug('subsidiaryId', subsidiaryId);
            log.debug('fromLocationId', fromLocationId);
            log.debug('toLocationId', toLocationId);

            // TO 基本字段
            toRec.setValue({ fieldId: 'orderstatus', value: 'B' });
            toRec.setValue({ fieldId: 'incoterm', value: 1 });
            toRec.setValue({ fieldId: 'useitemcostastransfercost', value: true });

            var toItemObj = {};
            var skuData = [];
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

                if (btnType !== 'cgqg') {
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
                            log.debug('Lot', String(lotText));
                            log.debug('数量', q);
                            if (!String(lotText || '').trim()) continue;

                            invDetail.selectNewLine({ sublistId: 'inventoryassignment' });

                            invDetail.setCurrentSublistText({
                                sublistId: 'inventoryassignment',
                                fieldId: 'issueinventorynumber',
                                text: String(lotText)
                            });

                            invDetail.setCurrentSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'quantity',
                                value: q
                            });

                            invDetail.commitLine({ sublistId: 'inventoryassignment' });
                        }
                    }
                }

                toItemObj[skuId] = toRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'amount' });
                toRec.commitLine({ sublistId: 'item' });
            }

            const toId = toRec.save({ ignoreMandatoryFields: true });
            if (!toId) {
                log.error('TO save failed', { poId, shopId });
                return;
            }
            to_ids.push(toId);
            log.debug('TO created', toId);

            if (btnType === 'cgqg') {
                if (tk_id) {
                    record.submitFields({
                        type: 'customrecord_swc_wl_tk_t',
                        id: tk_id,
                        values: { custrecord_wl_tk_t_qg_t: [toId] }
                    });
                } else {
                    log.debug('bg: tk_id missing', { poId, shopId, toId });
                }
            } else {
                if (btnType !== 'qg') {
                    // IF：发货
                    const ifRec = record.transform({
                        fromType: record.Type.TRANSFER_ORDER,
                        fromId: toId,
                        toType: record.Type.ITEM_FULFILLMENT,
                        isDynamic: true
                    });
                    ifRec.setValue({ fieldId: 'shipstatus', value: 'C' });
                    const ifId = ifRec.save({ ignoreMandatoryFields: true });
                    if (!ifId) {
                        log.error('IF save failed', { toId });
                        return;
                    }
                    log.debug('IF created', ifId);

                    //收获前获取货品 到岸成本相关数据
                    var taxCodeObj = getTaxCodeObj();
                    var itemObj = getItemObj(skuData, taxCodeObj);

                    // IR：收货
                    const irRec = record.transform({
                        fromType: record.Type.TRANSFER_ORDER,
                        fromId: toId,
                        toType: record.Type.ITEM_RECEIPT,
                        isDynamic: true
                    });

                    irRec.setValue({ fieldId: 'landedcostperline', value: true });

                    //设置到岸成本
                    var itemCount = irRec.getLineCount({
                        sublistId: 'item'
                    });
                    for (let i = 0; i < itemCount; i++) {
                        irRec.selectLine({
                            sublistId: 'item',
                            line: i
                        });
                        var irItem = irRec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: i
                        });
                        var irAmount = 0;
                        log.audit('irItem', irItem);
                        log.audit('toItemObj', toItemObj);
                        if (irItem in toItemObj) {
                            irAmount = toItemObj[irItem];
                        }
                        var returnTax = 0;
                        var saleTex = 0;
                        if (irItem in itemObj) {
                            returnTax = convertPercentToDecimal(itemObj[irItem].rate);
                            log.audit('returnTax', returnTax);
                            saleTex = convertPercentToDecimal(itemObj[irItem].tax);
                            log.audit('saleTex', saleTex);
                        }
                        var returnAmount = irAmount * (saleTex - returnTax);//退税金额
                        log.audit('returnAmount', returnAmount);

                        if (returnAmount) {
                            const landed = irRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'landedcost' });

                            landed.selectNewLine({ sublistId: 'landedcostdata' });

                            landed.setCurrentSublistValue({
                                sublistId: 'landedcostdata',
                                fieldId: 'costcategory',
                                value: 38
                            });

                            landed.setCurrentSublistValue({
                                sublistId: 'landedcostdata',
                                fieldId: 'amount',
                                value: returnAmount
                            });

                            landed.commitLine({ sublistId: 'landedcostdata' });
                        }


                        if (returnTax) returnTax = round(returnTax * 100, 2);
                        if (returnAmount) returnAmount = round(returnAmount, 2);
                        log.audit('returnTax', returnTax);
                        log.audit('returnAmount2', returnAmount);
                        irRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol9',
                            value: returnTax
                        });
                        irRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_swc_po_sk_',
                            value: returnAmount
                        });
                        irRec.commitLine({ sublistId: 'item' });
                    }

                    // 入库费用TODO
                    if (btnType == 'bg' && cjType == 1) {
                        applyLandedCostPerLine(irRec, items, feeMaping, cjType, btnType);
                    }

                    // 只有 wl 才写头程费用
                    if (btnType === 'wl' || btnType === 'cgwl') {
                        log.debug('items', items);
                        log.debug('cjType', cjType)
                        applyLandedCostPerLine(irRec, items, feeMaping, cjType, btnType);
                    }

                    const irId = irRec.save({ ignoreMandatoryFields: true });
                    if (irId) log.debug('IR created', irId);
                    //CG创建海外国外在途仓-CG保税仓TO(海外FOB)
                    if (btnType == 'cgwl' && cjType == '5') {
                        var toRec1 = record.create({
                            type: record.Type.TRANSFER_ORDER,
                            isDynamic: true
                        });
                        if (subsidiaryId) toRec1.setValue({ fieldId: 'subsidiary', value: subsidiaryId });
                        toRec1.setValue({ fieldId: 'location', value: toLocationId });
                        toRec1.setValue({ fieldId: 'custbody_swc_wl_no', value: wlId });

                        // 目的仓：按店铺 + attribute 搜索 location
                        log.debug('btnType', btnType); // 按钮缩写
                        log.debug('cjType', cjType); // 成交方式
                        var locationAttribute1 = resolveLocationAttribute(btnType, 'TO');

                        log.debug('shopId', shopId) // 店铺
                        log.debug('locationAttribute1', locationAttribute1) // 仓库属性
                        log.debug('subsidiaryId', subsidiaryId) // 子公司

                        var toLocationId1 = findToLocation(shopId, locationAttribute1, subsidiaryId, 'TO', btnType, mdLocationId);
                        if (!toLocationId1) {
                            log.debug('目的仓不存在，请确认', { shopId, locationAttribute1 });
                            throw error.create({ name: '5011', message: '目的仓不存在，请确认', notifyOff: false });
                        }
                        toRec1.setValue({ fieldId: 'transferlocation', value: toLocationId1 });
                        log.debug('subsidiaryId', subsidiaryId);
                        log.debug('fromLocationId', toLocationId);
                        log.debug('toLocationId', toLocationId1);

                        // TO 基本字段
                        toRec1.setValue({ fieldId: 'orderstatus', value: 'B' });
                        toRec1.setValue({ fieldId: 'incoterm', value: 1 });
                        toRec1.setValue({ fieldId: 'useitemcostastransfercost', value: true });

                        var toItemObj = {};
                        var skuData = [];
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

                            toRec1.selectNewLine({ sublistId: 'item' });
                            toRec1.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: skuId });
                            toRec1.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: lineQty });

                            // inventorydetail：按批次拆分
                            const invDetail = toRec1.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });

                            // 如果 lotText 为空，说明非批次物料（或你不想分配批次），就不写 inventoryassignment
                            const lotKeys = Object.keys(lotMap || {});
                            const hasAnyLot = lotKeys.some(k => String(k || '').trim() !== '');

                            if (hasAnyLot) {
                                for (const lotText in lotMap) {
                                    if (!lotMap.hasOwnProperty(lotText)) continue;
                                    const q = Number(lotMap[lotText] || 0);
                                    if (q <= 0) continue;
                                    log.debug('Lot', String(lotText));
                                    log.debug('数量', q);
                                    if (!String(lotText || '').trim()) continue;

                                    invDetail.selectNewLine({ sublistId: 'inventoryassignment' });

                                    invDetail.setCurrentSublistText({
                                        sublistId: 'inventoryassignment',
                                        fieldId: 'issueinventorynumber',
                                        text: String(lotText)
                                    });

                                    invDetail.setCurrentSublistValue({
                                        sublistId: 'inventoryassignment',
                                        fieldId: 'quantity',
                                        value: q
                                    });

                                    invDetail.commitLine({ sublistId: 'inventoryassignment' });
                                }
                            }

                            toItemObj[skuId] = toRec1.getCurrentSublistValue({ sublistId: 'item', fieldId: 'amount' });
                            toRec1.commitLine({ sublistId: 'item' });
                        }

                        const toId1 = toRec1.save({ ignoreMandatoryFields: true });
                        if (!toId1) {
                            log.error('TO save failed', { poId, shopId });
                            return;
                        }
                        to_ids.push(toId1);
                        log.debug('TO created 海外FOB', toId1);
                    }
                }
            }

            // 回写追踪数据
            if (btnType === 'wl' || btnType === 'cgwl') {
                const tkRec = record.create({ type: 'customrecord_swc_wl_tk_t', isDynamic: true });
                tkRec.setValue({ fieldId: 'custrecord_wl_tk_t_wl_id', value: wlId });
                tkRec.setValue({ fieldId: 'custrecord_wl_tk_t_cf', value: cjType });
                tkRec.setValue({ fieldId: 'custrecord_wl_tk_t_customer', value: shopId });
                tkRec.setValue({ fieldId: 'custrecord_wl_tk_t_po', value: poId });
                if (countyLsit) tkRec.setValue({ fieldId: 'custrecord_wl_tk_t_md', value: countyLsit });
                tkRec.setValue({ fieldId: 'custrecord_wl_tk_t_g_t', value: to_ids });
                tkRec.save();
            }

            if (btnType === 'bg') {
                if (tk_id) {
                    record.submitFields({
                        type: 'customrecord_swc_wl_tk_t',
                        id: tk_id,
                        values: { custrecord_wl_tk_t_bg_t: toId }
                    });
                } else {
                    log.debug('bg: tk_id missing', { poId, shopId, toId });
                }
            }

            if (btnType === 'qg') {
                if (tk_id) {
                    record.submitFields({
                        type: 'customrecord_swc_wl_tk_t',
                        id: tk_id,
                        values: { custrecord_wl_tk_t_qg_t: [toId] }
                    });
                } else {
                    log.debug('bg: tk_id missing', { poId, shopId, toId });
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
            log.error('Map Error', e);
            throw e;
        }
    }

    // -----------------------------
    // reduce：暂不处理
    // -----------------------------
    function reduce(context) { }

    // -----------------------------
    // summarize：汇总日志
    // -----------------------------
    function summarize(summary) {
        let hasError = false;
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
                const payloadStr = runtime.getCurrentScript().getParameter({ name: PARAM_PAYLOAD }) || '';
                const payloadAry = String(payloadStr).split('_');
                const wlId = payloadAry[0] || '';
                const btnType = payloadAry[1] || '';
                const statusValue = getTkStatusValueByBtnType(btnType);

                if (wlId && statusValue) {
                    record.submitFields({
                        type: 'customrecord_swc_wl_plan_order',
                        id: wlId,
                        values: { custrecord_swc_wl_tk_status: statusValue }
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
    // 共同方法区
    // =========================================================

    function ensure(obj, key, initValue) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = initValue;
        return obj[key];
    }

    function toNumber(v) {
        const n = Number(v);
        return isNaN(n) ? null : n;
    }

    function isBlank(v) {
        return v === null || v === undefined || v === '';
    }

    function getTkStatusValueByBtnType(btnType) {
        btnType = String(btnType || '');
        if (btnType === 'wl' || btnType === 'cgwl') return 1;
        if (btnType === 'bg') return 2;
        if (btnType === 'qg' || btnType === 'cgqg') return 3;
        return '';
    }

    function getAllResults(srch) {
        const results = srch.run();
        const out = [];
        let idx = 0;
        while (true) {
            const slice = results.getRange({ start: idx, end: idx + 1000 });
            if (!slice || slice.length === 0) break;
            for (let i = 0; i < slice.length; i++) out.push(slice[i]);
            idx += slice.length;
            if (slice.length < 1000) break;
        }
        return out;
    }

    function aggregateLines(lines, cjType, btnType) {
        log.debug('cjType', cjType);
        var feeFields = [];

        if (cjType == '2') {// 国内FOB   头程海运费,海运保险费,目的国进口关税,目的港拖车费,目的港清关代理费,目的港货代费用
            feeFields = ['bxf_fee', 'hyf_fee', 'qgf_fee', 'jkgs_fee', 'hdf_fee', 'tcf_fee'];
        } else if (cjType == '5') { // 海外FOB  头程海运费,海运保险费,目的国进口关税,目的港拖车费,目的港清关代理费,目的港货代费用
            feeFields = ['bxf_fee', 'hyf_fee', 'qgf_fee', 'jkgs_fee', 'hdf_fee', 'tcf_fee', 'rkcz'];
        } else if (cjType == '1') {
            if (btnType == 'bg') {
                feeFields = ['rkcz'];
            } else {
                // EXW  头程海运费,海运保险费,目的国进口关税,目的港拖车费,目的港清关代理费,目的港货代费用, 国内港报关代理费, 国内港拖车费, 国内港货代费用
                feeFields = ['trailer_fee', 'cda_fee', 'em_ffc', 'bxf_fee', 'hyf_fee', 'qgf_fee', 'jkgs_fee', 'hdf_fee', 'tcf_fee'];
            }
        } else if (cjType == '3') { // DDP  头程海运费,海运保险费,目的国进口关税,目的港拖车费,目的港清关代理费,目的港货代费用, 国内港报关代理费, 国内港拖车费, 国内港货代费用
            feeFields = ['trailer_fee', 'cda_fee', 'em_ffc', 'bxf_fee', 'hyf_fee', 'qgf_fee', 'jkgs_fee', 'hdf_fee', 'tcf_fee'];
        } else if (cjType == '4') { // DDU
            feeFields = ['trailer_fee', 'cda_fee', 'em_ffc', 'bxf_fee', 'hyf_fee', 'qgf_fee', 'jkgs_fee', 'hdf_fee', 'tcf_fee'];
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
        log.debug('out', out);
        return out;
    }

    function flattenPoDataToList2(documentData, list, opts) {
        const mdLocation = documentData.md_location;
        const cjType = documentData.type;
        const btType = documentData.btnType;
        const wlId = documentData.source_plan_order_id;
        const countyLsit = documentData.wl_county_lsit;
        const includeTkId = (opts && opts.includeTkId) ? true : false;

        function toStr(v) {
            return (v === null || v === undefined) ? '' : String(v);
        }

        for (const poId in documentData.poData) {
            if (!Object.prototype.hasOwnProperty.call(documentData.poData, poId)) continue;

            const poRec = record.load({ type: record.Type.PURCHASE_ORDER, id: poId, isDynamic: false });
            const sub = poRec.getValue({ fieldId: 'subsidiary' });

            const shops = documentData.poData[poId] || {};
            for (const shopId in shops) {
                if (!Object.prototype.hasOwnProperty.call(shops, shopId)) continue;

                const lines = shops[shopId] || [];
                if (!Array.isArray(lines) || lines.length === 0) continue;

                // 1) shopId 内按 store 分组（只分组，不合并数量）
                const storeBuckets = {}; // storeId -> lines[]
                for (let i = 0; i < lines.length; i++) {
                    const ln = lines[i];
                    if (!ln) continue;

                    const storeId = toStr(ln.store) || '__NO_STORE__';
                    if (!storeBuckets[storeId]) storeBuckets[storeId] = [];
                    storeBuckets[storeId].push(ln); // 原样 push，保留 1/3/1/3
                }

                // 2) 每个 store 单独 push 一条记录
                for (const storeId in storeBuckets) {
                    if (!Object.prototype.hasOwnProperty.call(storeBuckets, storeId)) continue;

                    const storeLines = storeBuckets[storeId] || [];
                    if (storeLines.length === 0) continue;

                    let tk_id = '';
                    if (includeTkId) {
                        for (let i = 0; i < storeLines.length; i++) {
                            if (storeLines[i] && storeLines[i].tk_id) { tk_id = String(storeLines[i].tk_id); break; }
                        }
                    }

                    list.push({
                        cjType: cjType,
                        poId: String(poId),
                        shopId: String(shopId),
                        store: String(storeId),
                        md_location: String(mdLocation),
                        btnType: String(btType),
                        sub: sub,
                        wlId: wlId,
                        countyLsit: countyLsit,
                        tk_id: tk_id,
                        lines: storeLines
                    });
                }
            }
        }
    }

    function flattenPoDataToList(documentData, list, opts) {
        const mdLocation = documentData.md_location;
        const cjType = documentData.type;
        const btType = documentData.btnType;
        const wlId = documentData.source_plan_order_id;
        const countyLsit = documentData.wl_county_lsit;
        const includeTkId = (opts && opts.includeTkId) ? true : false;

        for (const poId in documentData.poData) {
            if (!documentData.poData.hasOwnProperty(poId)) continue;

            const poRec = record.load({ type: record.Type.PURCHASE_ORDER, id: poId, isDynamic: false });
            const sub = poRec.getValue({ fieldId: 'subsidiary' });

            const shops = documentData.poData[poId] || {};
            for (const shopId in shops) {
                if (!shops.hasOwnProperty(shopId)) continue;

                const lines = shops[shopId] || [];
                if (!Array.isArray(lines) || lines.length === 0) continue;

                let tk_id = '';
                if (includeTkId) {
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i] && lines[i].tk_id) { tk_id = String(lines[i].tk_id); break; }
                    }
                }

                list.push({
                    cjType: cjType,
                    poId: String(poId),
                    shopId: String(shopId),
                    md_location: String(mdLocation),
                    btnType: String(btType),
                    sub: sub,
                    wlId: wlId,
                    countyLsit: countyLsit,
                    tk_id: tk_id,
                    lines: lines
                });
            }
        }
    }

    function resolveLocationAttribute(btnType, cjType) {
        if (btnType === 'wl') {
            return (Number(cjType) === 5) ? '5' : '2';
        }
        if (btnType === 'cgwl') {
            if (cjType == '5') {
                return '5';
            } else if (cjType == 'TO') {
                return '11';
            }
            return '2';
        }
        if (btnType === 'bg') {
            if (cjType == '3' || cjType == '4') {
                return '3';
            }
            return '5';
        }
        if (btnType === 'cgqg') {
            if (cjType == 'TO') {
                return '7';
            } else {
                return '10';
            }
        }
        if (btnType === 'fbaqg') {
            return '7';
        }
        return '6';
    }

    function findToLocation(shopId, locationAttribute, subsidiaryId, loc_type, btnType, mdLocationId) {
        var filters_arr = [];
        filters_arr.push(["custrecord_swc_location_store", "anyof", shopId]);
        filters_arr.push('AND', ["custrecord_swc_location_attribute", "anyof", locationAttribute]);
        filters_arr.push('AND', ["subsidiary", "anyof", subsidiaryId]);
        filters_arr.push('AND', ["isinactive", "is", false]);
        if (loc_type == 'TO') {
            filters_arr.push('AND', ["custrecord_swc_location_type", "anyof", 3]);
            filters_arr.push('AND', ["custrecord_swc_warehouse_code", "anyof", mdLocationId]);
        }
        if (btnType == 'qg') {
            filters_arr.push('AND', ["custrecord_swc_warehouse_code", "anyof", mdLocationId]);
        }
        const locationSearchObj = search.create({
            type: "location",
            filters: filters_arr,
            columns: [search.createColumn({ name: "internalid" })]
        });

        const rs = locationSearchObj.run().getRange({ start: 0, end: 1 });
        if (!rs || rs.length === 0) return null;

        return rs[0].getValue({ name: 'internalid' }) || null;
    }

    function applyLandedCostPerLine(irRec, items, feeMaping, cjType, btnType) {

        if (btnType == 'wl') {
            // 按照成交方式，来判断当前 TO 单是否需要追加 到岸成本 信息
            // 国内fob   不处理费用
            // 海外fob  处理费用，只处理海外
            // ddp。 处理费用，全部处理
            // ddu。处理费用，除了目的国进口关税，其余都处理

            if (cjType != 2) {// 不是国内FOB的场合，都进行不同的费用信息处理
                const lineCount = irRec.getLineCount({ sublistId: 'item' }) || 0;

                for (let i = 0; i < lineCount; i++) {
                    const itemId = irRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    if (!items || !items.hasOwnProperty(itemId)) continue;

                    const fee = items[itemId].fee || {};

                    irRec.selectLine({ sublistId: 'item', line: i });
                    const lcSub = irRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'landedcost' });

                    for (const feeKey in fee) {
                        if (!fee.hasOwnProperty(feeKey)) continue;

                        const amountValue = Number(fee[feeKey] || 0);
                        if (!amountValue) continue;

                        if (cjType == '4') {
                            if (feeKey != 'jkgs_fee') {
                                lcSub.selectNewLine({ sublistId: 'landedcostdata' });
                                lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: feeMaping[feeKey] });
                                lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'amount', value: amountValue });
                                lcSub.commitLine({ sublistId: 'landedcostdata' });
                            }
                        } else {
                            lcSub.selectNewLine({ sublistId: 'landedcostdata' });
                            lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: feeMaping[feeKey] });
                            lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'amount', value: amountValue });
                            lcSub.commitLine({ sublistId: 'landedcostdata' });
                        }


                    }

                    irRec.commitLine({ sublistId: 'item' });
                }
            }
        } else {
            const lineCount = irRec.getLineCount({ sublistId: 'item' }) || 0;

            for (let i = 0; i < lineCount; i++) {
                const itemId = irRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                if (!items || !items.hasOwnProperty(itemId)) continue;

                const fee = items[itemId].fee || {};

                irRec.selectLine({ sublistId: 'item', line: i });
                const lcSub = irRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'landedcost' });

                for (const feeKey in fee) {
                    if (!fee.hasOwnProperty(feeKey)) continue;

                    const amountValue = Number(fee[feeKey] || 0);
                    if (!amountValue) continue;

                    lcSub.selectNewLine({ sublistId: 'landedcostdata' });
                    lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: feeMaping[feeKey] });
                    lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'amount', value: amountValue });
                    lcSub.commitLine({ sublistId: 'landedcostdata' });
                }

                irRec.commitLine({ sublistId: 'item' });
            }
        }
    }

    function getNewLotQtyMapByItemReceipt(poId) {
        const out = {};

        const srch = search.create({
            type: 'itemreceipt',
            filters: [
                ["type", "anyof", "ItemRcpt"],
                "AND",
                ["createdfrom", "anyof", poId],
                "AND",
                ["mainline", "is", "F"],
                "AND",
                ["taxline", "is", "F"],
                "AND",
                ["cogs", "is", "F"],
                "AND",
                ["shipping", "is", "F"],
                "AND",
                ["custcol_swc_pr_origin_sku", "noneof", "@NONE@"]
            ],
            columns: [
                search.createColumn({ name: "line", join: "appliedToTransaction", summary: "GROUP" }),
                search.createColumn({ name: "inventorynumber", join: "inventoryDetail", summary: "GROUP" }),
                search.createColumn({ name: "quantity", summary: "SUM" })
            ]
        });

        const rs = getAllResults(srch);

        for (let i = 0; i < rs.length; i++) {
            const lineId = rs[i].getValue({ name: "line", join: "appliedToTransaction", summary: "GROUP" });
            const lotText = rs[i].getText({ name: "inventorynumber", join: "inventoryDetail", summary: "GROUP" }) || '';
            const qty = Number(rs[i].getValue({ name: "quantity", summary: "SUM" }) || 0);

            if (!lineId || qty <= 0) continue;

            if (!out[String(lineId)]) out[String(lineId)] = [];
            out[String(lineId)].push({ lotText: lotText, qty: qty });
        }

        return out;
    }

    function getLotQtyMapByItemReceipt(poId) {
        const out = {};

        const srch = search.create({
            type: 'itemreceipt',
            filters: [
                ["type", "anyof", "ItemRcpt"],
                "AND",
                ["createdfrom", "anyof", poId],
                "AND",
                ["mainline", "is", "F"],
                "AND",
                ["taxline", "is", "F"],
                "AND",
                ["cogs", "is", "F"],
                "AND",
                ["shipping", "is", "F"]
            ],
            columns: [
                search.createColumn({ name: "custcol_swc_pr_origin_sku", summary: "GROUP" }),
                search.createColumn({ name: "inventorynumber", join: "inventoryDetail", summary: "GROUP" }),
                search.createColumn({ name: "quantity", summary: "SUM" })
            ]
        });

        const rs = getAllResults(srch);

        for (let i = 0; i < rs.length; i++) {
            const itemId = rs[i].getValue({ name: "custcol_swc_pr_origin_sku", summary: "GROUP" });
            const lotText = rs[i].getText({ name: "inventorynumber", join: "inventoryDetail", summary: "GROUP" }) || '';
            const qty = Number(rs[i].getValue({ name: "quantity", summary: "SUM" }) || 0);

            if (!itemId || qty <= 0) continue;

            if (!out[String(itemId)]) out[String(itemId)] = [];
            out[String(itemId)].push({ lotText: lotText, qty: qty });
        }

        return out;
    }

    /**
     * 从前置 Transfer Order 抽取明细行（含批次分配）
     * 返回：
     * {
     *   subsidiaryId: number|string|null,
     *   fromLocationId: number|string|null,  // 作为“二次转移”的起始仓（上一张TO的目的仓）
     *   lines: [{ sku, qty, lotNum, gys }, ...]
     * }
     */
    function getLinesFromTransferOrder(toId) {
        const out = { subsidiaryId: null, fromLocationId: null, lines: [] };
        if (isBlank(toId)) return out;

        const toRec = record.load({
            type: record.Type.TRANSFER_ORDER,
            id: toId,
            isDynamic: false
        });

        out.subsidiaryId = toRec.getValue({ fieldId: 'subsidiary' }) || null;
        out.fromLocationId = toRec.getValue({ fieldId: 'transferlocation' }) || null; // 二次转移起始仓

        const sublistId = 'item';
        const lineCount = toRec.getLineCount({ sublistId }) || 0;

        for (let i = 0; i < lineCount; i++) {
            const itemId = toRec.getSublistValue({ sublistId, fieldId: 'item', line: i });
            const lineQty = Number(toRec.getSublistValue({ sublistId, fieldId: 'quantity', line: i }) || 0);
            if (isBlank(itemId) || lineQty <= 0) continue;

            let pushed = false;

            try {
                const invDet = toRec.getSublistSubrecord({ sublistId, fieldId: 'inventorydetail', line: i });
                const asnCount = invDet.getLineCount({ sublistId: 'inventoryassignment' }) || 0;

                for (let j = 0; j < asnCount; j++) {
                    const lotText =
                        invDet.getSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: j }) ||
                        invDet.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: j }) ||
                        '';

                    const q = Number(invDet.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j }) || 0);
                    if (q <= 0) continue;

                    out.lines.push({
                        sku: itemId,
                        qty: q,
                        lotNum: String(lotText || ''),
                        gys: ''
                    });

                    pushed = true;
                }
            } catch (e) {
                // 没有库存明细或非批次物料，走退化逻辑
            }

            if (!pushed) {
                out.lines.push({
                    sku: itemId,
                    qty: lineQty,
                    lotNum: '',
                    gys: ''
                });
            }
        }

        return out;
    }

    function getSrcToId(rawToIds) {
        var ids_to;
        if (rawToIds.length > 0) {
            search.create({
                type: "transaction",
                filters:
                    [
                        ["internalid", "anyof", rawToIds],
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "type", label: "类型" })
                    ]
            }).run().each(function (result) {
                if (result.getValue(result.columns[0]) == 'TrnfrOrd') {
                    ids_to = result.id;
                }
                return true;
            });
        }
        return ids_to;
    }

    function convertPercentToDecimal(value) {
        if (typeof value === 'string' && value.trim().endsWith('%')) {
            // 移除百分号，解析为数字，除以100
            var num = parseFloat(value.replace('%', ''));
            if (!isNaN(num)) {
                return num / 100;
            }
        }
        // 如果是数字，直接返回；如果是其他字符串，尝试parseFloat
        return parseFloat(value) || 0; // 或者直接返回value？但为了安全，返回数字或0
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

        return obj
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

        return obj
    }

    function round(number, precision) { return Math.round(+number + 'e' + precision) / Math.pow(10, precision); }
    return { getInputData, map, reduce, summarize };
});
