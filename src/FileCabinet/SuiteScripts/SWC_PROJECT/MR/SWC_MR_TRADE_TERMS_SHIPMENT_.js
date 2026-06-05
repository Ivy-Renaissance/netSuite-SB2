/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/runtime', 'N/record', 'N/search', 'N/log'], (runtime, record, search, log) => {

    const PARAM_PAYLOAD = 'custscript_payload';       // 传入的 JSON 字符串

    function getInputData() {

        // 生成转移订单
        // 1.按照PO单据做转移单
        // 2.在po单据的基础上，按照店铺维度去做转移单
        try{
            const payloadStr = runtime.getCurrentScript().getParameter({ name: PARAM_PAYLOAD });

            // 参数分解，判断起始点
            var wlAry = payloadStr.split('_');
            var wlId = wlAry[0];
            var btnType = wlAry[1];

            // 获取当前物流发运单
            var rec = record.load({
                type: 'customrecord_swc_wl_plan_order',
                id: wlId,
                isDynamic: false
            });

            var list = [];

            // 成交方式
            var terms_of_trade = rec.getValue('custrecord_swc_wl_terms_of_trade');
            // 目的仓仓库代码
            var md_location = rec.getValue('custrecord_swc_md_location');
            // 运抵国
            var wl_county_lsit = rec.getValue('custrecord_swc_wl_county_lsit');


            // 组装 documentData
            var documentData = {
                type: terms_of_trade,          // 成交方式
                md_location: md_location,       // 目的仓仓库代码
                source_plan_order_id: wlId,   // 溯源，便于 MR 回写状态
                btnType: btnType,
                wl_county_lsit: wl_county_lsit,
                poData: {}                      // { poId: { customerId: [lines...] } }
            };

            // 国内FOB DDP DDU	转移单（供应商虚拟仓-国内在途仓）
            // 海外FOB	转移单（供应商虚拟仓-海外国外在途仓）
            if(btnType == 'wl'){// 供应商已出货
                // 数据整理，数据结构 ： 一层，按照PO单据分组， 二层，按照PO单据中的店铺分组

                var feeSubID = 'recmachcustrecord_swc_wl_plan_order_id';
                var lineCount = rec.getLineCount({ sublistId: feeSubID });



                for (var i = 0; i < lineCount; i++) {
                    // 采购订单编号
                    var poId = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_po_num', line: i });
                    // 店铺
                    var customerId = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_customer', line: i });
                    // 货品
                    var skuId = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_item', line: i });
                    // 本次真实发运优等品数量
                    var superiorQty = toNumber(rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: i }));
                    // 本次真实发运良品数量
                    var goodQty = toNumber(rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: i }));
                    // 供应商
                    var vendorId = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_vendor', line: i });
                    // 批次号
                    var lotNum = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_lot', line: i });

                    // 预估国内港拖车费
                    var trailer_fee = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_trailer_fee', line: i }) || 0;
                    // 预估国内港报关代理费
                    var cda_fee = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_cda_fee', line: i }) || 0;
                    // 预估国内港货代费用
                    var em_ffc = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_ffc', line: i }) || 0;
                    // 预估海运保险费
                    var bxf_fee = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_bxf_fee', line: i }) || 0;
                    // 预估头程海运费
                    var hyf_fee = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_hyf_fee', line: i }) || 0;
                    // 预估目的港清关代理费
                    var qgf_fee = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_qgf_fee', line: i }) || 0;
                    // 预估目的国进口关税
                    var jkgs_fee = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_jkgs_fee', line: i }) || 0;
                    // 预估目的港货代费用
                    var hdf_fee = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_hdf_fee', line: i }) || 0;
                    // 预估目的港拖车费
                    var tcf_fee = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_em_tcf_fee', line: i }) || 0;

                    if (isBlank(poId) || isBlank(customerId) || isBlank(skuId)) continue;

                    var qty = superiorQty + goodQty;
                    if (qty <= 0) continue;

                    var poBucket = ensure(documentData.poData, String(poId), {});
                    var custLines = ensure(poBucket, String(customerId), []);

                    custLines.push({
                        sku: skuId,
                        qty: qty,
                        lotNum: lotNum || '',
                        gys: vendorId || '',
                        trailer_fee: trailer_fee,
                        cda_fee: cda_fee,
                        em_ffc: em_ffc,
                        bxf_fee: bxf_fee,
                        hyf_fee: hyf_fee,
                        qgf_fee: qgf_fee,
                        jkgs_fee: jkgs_fee,
                        hdf_fee: hdf_fee,
                        tcf_fee: tcf_fee,
                    });
                }

                // 将 poData 展平为 map 输入数组，每条代表一个“(poId, shopId) -> 一张转移单”
                const mdLocation = documentData.md_location; // 目的仓
                const cjType = documentData.type; // 目的仓
                const btType = documentData.btnType;
                const wlId = documentData.source_plan_order_id;
                const countyLsit = documentData.wl_county_lsit


                for (const poId in documentData.poData) {

                    var poRec = record.load({
                        type: 'purchaseorder',
                        id: poId
                    });
                    var sub = poRec.getValue('subsidiary');

                    const shops = documentData.poData[poId];
                    if (!shops) continue;

                    for (const shopId in shops) {
                        const lines = shops[shopId] || [];
                        list.push({
                            cjType: cjType,
                            poId: String(poId),
                            shopId: String(shopId),
                            md_location: String(mdLocation),
                            btnType: String(btType),
                            sub: sub,
                            wlId: wlId,
                            countyLsit: countyLsit,
                            lines: lines,
                        });
                    }
                }

            }else if(btnType == 'bg'){// 报关

                // 前置单据为
                log.debug('terms_of_trade', terms_of_trade);
                if(terms_of_trade == 1){ // exw 前置单据公司间交易

                    // 获取公司间交易的PO单据
                    var tkSub = 'recmachcustrecord_wl_tk_t_wl_id';
                    var tkCount = rec.getLineCount({ sublistId: tkSub })
                    var poIds = {}

                    for (var i = 0; i < tkCount; i++) {
                        // 转移单据
                        var toIds = rec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_g_t', line: i });
                        var toId = toIds[0]
                        log.debug('toId', toId)
                        var t_customer = rec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_customer', line: i });
                        var t_po = rec.getSublistValue({ sublistId: tkSub, fieldId: 'custrecord_wl_tk_t_po', line: i });
                        var t_id = rec.getSublistValue({ sublistId: tkSub, fieldId: 'id', line: i });
                        documentData.t_id = t_id;
                        poIds[toId] = {
                            customer : t_customer,
                            po : toId,
                            t_id : t_id
                        }
                    }

                    log.debug('poIds', poIds);

                    for (let pi = 0; pi < poIds; pi++) {

                        var poRec = record.load({
                            type: 'purchaseorder',
                            id: pi,
                            isDynamic: true
                        });

                        var sub = poRec.getValue('subsidiary');
                        var feeSubID = 'item';
                        var lineCount = rec.getLineCount({ sublistId: feeSubID });

                        const itemreceiptSearchObj = search.create({
                            type: "itemreceipt",
                            settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                            filters:
                                [
                                    ["type","anyof","ItemRcpt"],
                                    "AND",
                                    ["createdfrom","anyof",pi],
                                    "AND",
                                    ["mainline","is","F"],
                                    "AND",
                                    ["taxline","is","F"],
                                    "AND",
                                    ["cogs","is","F"]
                                ],
                            columns:
                                [
                                    search.createColumn({
                                        name: "internalid",
                                        summary: "GROUP",
                                        label: "内部 ID"
                                    }),
                                    search.createColumn({
                                        name: "serialnumbers",
                                        summary: "GROUP",
                                        label: "序列号/批号"
                                    })
                                ]
                        });
                        var lotNames = []
                        var s = getAllResults(itemreceiptSearchObj);
                        for (let ii = 0; ii < s.length > 0; ii++) {
                            lotNames.push(s[ii].getText({
                                name: "serialnumbers",
                                summary: "GROUP",
                                label: "序列号/批号"
                            }))
                        }


                        for (var i = 0; i < lineCount; i++) {
                            // 采购订单编号
                            var poId = poIds[pi].po;
                            // 店铺
                            var customerId = poIds[pi].customer;
                            // 货品
                            var skuId = poRec.getSublistValue({ sublistId: feeSubID, fieldId: 'item', line: i });
                            // 数量
                            var qty = toNumber(poRec.getSublistValue({ sublistId: feeSubID, fieldId: 'quantity', line: i }));
                            // 供应商
                            var vendorId = poRec.getValue('entity');
                            // 批次号
                            var lotNum = lotNames[i];

                            if (isBlank(poId) || isBlank(customerId) || isBlank(skuId)) continue;

                            if (qty <= 0) continue;

                            var poBucket = ensure(documentData.poData, String(poId), {});
                            var custLines = ensure(poBucket, String(customerId), []);

                            custLines.push({
                                sku: skuId,
                                qty: qty,
                                lotNum: lotNum || '',
                                gys: vendorId || '',
                            });
                        }

                        // 将 poData 展平为 map 输入数组，每条代表一个“(poId, shopId) -> 一张转移单”
                        const mdLocation = documentData.md_location; // 目的仓
                        const cjType = documentData.type; // 目的仓
                        const btType = documentData.btnType;
                        const wlId = documentData.source_plan_order_id;
                        const countyLsit = documentData.wl_county_lsit


                        list.push({
                            cjType: cjType,
                            poId: String(poId),
                            shopId: String(shopId),
                            md_location: String(mdLocation),
                            btnType: String(btType),
                            sub: sub,
                            wlId: wlId,
                            countyLsit: countyLsit,
                            lines: lines,
                        });
                    }
                }else{// 前置单据为转移单

                }



            }else if(btnType == 'qg'){// 清关

            }

            log.debug('getInputData list', list);

            return list;
        }catch (e) {
            log.error('getInputData error', e)
        }

    }

    function map(context) {
        try{

            var feeMaping = {
                trailer_fee: 27,
                cda_fee: 28,
                em_ffc: 29,
                bxf_fee: 30,
                hyf_fee: 31,
                qgf_fee: 32,
                jkgs_fee: 33,
                hdf_fee: 34,
                tcf_fee: 35,
            }

            const value = JSON.parse(context.value);

            log.debug('Map Value', value);

            const poId = value.poId;
            const shopId = value.shopId;
            const sub = value.sub;
            const mdLocationId = toNumber(value.md_location);

            // 成交方式
            const cjType = toNumber(value.cjType);
            // 按钮方式
            const btnType = value.btnType;

            const lines = value.lines || [];

            if (!mdLocationId) {
                throw new Error(`md_location 无效：${value.md_location}`);
            }
            if (lines.length === 0) {
                log.debug('map skip (no lines)', { poId, shopId });
                return;
            }

            if(btnType == 'wl'){
                var rec_data_id, if_data_id;
                var to = record.create({
                    type: 'transferorder',
                    isDynamic: true
                });

                // 1) PO.location
                let poRec = record.load({ type: record.Type.PURCHASE_ORDER, id: poId, isDynamic: false });

                // 2) 聚合明细：sku -> lot -> qtySum
                const agg = aggregateLines(lines);
                log.debug('agg.items', JSON.stringify(agg.items));

                // 子公司
                const subsidiary = poRec.getValue({ fieldId: 'subsidiary' });
                if (subsidiary) to.setValue({ fieldId: 'subsidiary', value: subsidiary });

                // 起始仓库 - po单上的地点，直接拿
                let fromLocationId = toNumber(poRec.getValue({ fieldId: 'location' }));
                log.debug('起始仓', fromLocationId);
                to.setValue({ fieldId: 'location', value: fromLocationId });

                // 目的仓  条件1，店铺，子公司 条件2，国内在途仓/海外在途仓
                log.debug('cjType', cjType);
                log.debug('btnType', btnType)

                var locationAttribute = '';
                if(btnType == 'wl'){
                    if(cjType == 5){// 海外FOB的场合
                        // 海外国外在途仓
                        locationAttribute = '5'
                    }else{// 其余的场合
                        // 国内在途仓
                        locationAttribute = '2'
                    }
                }

                log.debug('shopId', shopId)
                if(shopId){
                    var locationSearchObj2 = search.create({
                        type: "location",
                        filters:
                            [
                                ["custrecord_swc_location_store","anyof",shopId],
                                "AND",
                                ["custrecord_swc_location_attribute","anyof",locationAttribute]
                            ],
                        columns:
                            [
                                search.createColumn({name: "internalid", label: "内部 ID"})
                            ]
                    });
                    var rs2 = locationSearchObj2.run().getRange({ start: 0, end: 1 });
                    if (!rs2 || rs2.length === 0) {
                        log.debug('目的仓不存在，请确认');
                        return;
                    }
                    var mdlocation = rs2[0].getValue({ name: 'internalid' }) || null;
                    log.debug('目的仓', mdlocation);
                    to.setValue({ fieldId: 'transferlocation', value: mdlocation });

                    // 3.创建转移订单TO
                    to.setValue('orderstatus', 'B');
                    to.setValue('incoterm', 1);
                    to.setValue('useitemcostastransfercost', true);

                    const sublistId = 'item';
                    const items = agg.items;

                    for (const skuId in items) {
                        const lotMap = items[skuId].lot;

                        let lineQty = 0;
                        for (const lotText in lotMap) lineQty += Number(lotMap[lotText] || 0);
                        if (lineQty <= 0) continue;

                        to.selectNewLine({
                            sublistId : sublistId
                        });
                        to.setCurrentSublistValue({
                            sublistId : sublistId,
                            fieldId : 'item',
                            value : skuId
                        });
                        to.setCurrentSublistValue({
                            sublistId : sublistId,
                            fieldId : 'quantity',
                            value : 2
                            // lineQty
                        });

                        var subRec = to.getCurrentSublistSubrecord({
                            sublistId : sublistId,
                            fieldId : 'inventorydetail'
                        });

                        for (const lotText in lotMap) {
                            const q = Number(lotMap[lotText] || 0);
                            if (q <= 0) continue;

                            subRec.selectNewLine({
                                sublistId : 'inventoryassignment'
                            });
                            subRec.setCurrentSublistText({
                                sublistId : 'inventoryassignment',
                                fieldId : 'issueinventorynumber',
                                text : lotText
                            });
                            subRec.setCurrentSublistValue({
                                sublistId : 'inventoryassignment',
                                fieldId : 'quantity',
                                // value : q
                                value : 1
                            });
                            subRec.commitLine({
                                sublistId : 'inventoryassignment'
                            });
                        }
                        to.commitLine({ sublistId: sublistId });
                    }
                    rec_data_id = to.save({ignoreMandatoryFields: true});

                    if (rec_data_id) {
                        log.debug('success', 'TO单已经创建' + rec_data_id);
                        var if_data = record.transform({
                            fromType: record.Type.TRANSFER_ORDER,
                            fromId: rec_data_id,
                            toType: record.Type.ITEM_FULFILLMENT,
                            isDynamic: true
                        });
                        if_data.setValue('shipstatus', 'C');
                        if_data_id = if_data.save({ignoreMandatoryFields: true});

                        if (if_data_id) {
                            log.debug('success', '发货成功' + if_data_id);
                            var ir_data = record.transform({
                                fromType: record.Type.TRANSFER_ORDER,
                                fromId: rec_data_id,
                                toType: record.Type.ITEM_RECEIPT,
                                isDynamic: true
                            });
                            ir_data.setValue('landedcostperline', true);

                            // 到岸成本数据整理
                            // 汇总维度 货品 + 数量
                            var lineCount = ir_data.getLineCount({sublistId: 'item'});
                            for (var i = 0; i < lineCount; i++) {

                                var itemId = ir_data.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    line: i
                                });

                                if(items.hasOwnProperty(itemId)){
                                    var fee = items[itemId].fee

                                    ir_data.selectLine({
                                        sublistId: 'item',
                                        line: i
                                    });
                                    var subRecord = ir_data.getCurrentSublistSubrecord({
                                        sublistId: 'item',
                                        fieldId: 'landedcost'
                                    });

                                    for (var feeKey in fee) {

                                        var amountValue = fee[feeKey] || 0;
                                        if (amountValue != 0) {
                                            subRecord.selectNewLine({
                                                sublistId: 'landedcostdata'
                                            });

                                            subRecord.setCurrentSublistValue({
                                                sublistId: 'landedcostdata',
                                                fieldId: 'costcategory',
                                                value: feeMaping[feeKey]
                                            });

                                            subRecord.setCurrentSublistValue({
                                                sublistId: 'landedcostdata',
                                                fieldId: 'amount',
                                                value: amountValue
                                            });

                                            subRecord.commitLine({
                                                sublistId: 'landedcostdata'
                                            });
                                        }
                                    }
                                    ir_data.commitLine({sublistId: 'item'});
                                }
                            }
                            var ir_data_id = ir_data.save({ignoreMandatoryFields: true});
                            if (ir_data_id) {
                                log.debug('success', '收货成功' + ir_data_id);
                            }

                            const wlId = value.wlId;
                            const countyLsit = value.countyLsit

                            var wl_tk_t = record.create({ type: 'customrecord_swc_wl_tk_t', isDynamic: true });
                            wl_tk_t.setValue({ fieldId: 'custrecord_wl_tk_t_wl_id', value: wlId });

                            // 成交方式
                            wl_tk_t.setValue({ fieldId: 'custrecord_wl_tk_t_cf', value: cjType });

                            // 关联店铺
                            wl_tk_t.setValue({ fieldId: 'custrecord_wl_tk_t_customer', value: shopId });

                            // 关联采购订单
                            wl_tk_t.setValue({ fieldId: 'custrecord_wl_tk_t_po', value: poId });

                            // 运抵国
                            if(countyLsit){
                                wl_tk_t.setValue({ fieldId: 'custrecord_wl_tk_t_md', value: countyLsit });
                            }

                            // 供应商已发货单据
                            wl_tk_t.setValue({ fieldId: 'custrecord_wl_tk_t_g_t', value: rec_data_id });

                            wl_tk_t.save();
                        } else {
                            result_str.data = '发货失败';
                            return result_str;
                        }

                    }
                }
            }else if(btnType == 'bg'){// EXW 场合，唯一前置是公司间交易，不做头程费用处理
                var rec_data_id, if_data_id;
                var to = record.create({
                    type: 'transferorder',
                    isDynamic: true
                });

                // 1) PO.location
                let poRec = record.load({ type: record.Type.PURCHASE_ORDER, id: poId, isDynamic: false });

                // 2) 聚合明细：sku -> lot -> qtySum
                const agg = aggregateLines(lines);
                log.debug('agg.items', JSON.stringify(agg.items));

                // 子公司
                const subsidiary = poRec.getValue({ fieldId: 'subsidiary' });
                if (subsidiary) to.setValue({ fieldId: 'subsidiary', value: subsidiary });

                // 起始仓库 - po单上的地点，直接拿
                let fromLocationId = toNumber(poRec.getValue({ fieldId: 'location' }));
                log.debug('起始仓', fromLocationId);
                to.setValue({ fieldId: 'location', value: fromLocationId });

                // 目的仓  条件1，店铺，子公司 条件2，国内在途仓/海外在途仓
                log.debug('cjType', cjType);
                log.debug('btnType', btnType)

                var locationAttribute = '';
                if(btnType == 'wl'){
                    if(cjType == 1){// exw
                        // 海外国外在途仓
                        locationAttribute = '5'
                    }else{// 其余的场合
                        // 国内在途仓
                        locationAttribute = '2'
                    }
                }

                log.debug('shopId', shopId)
                if(shopId){
                    var locationSearchObj2 = search.create({
                        type: "location",
                        filters:
                            [
                                ["custrecord_swc_location_store","anyof",shopId],
                                "AND",
                                ["custrecord_swc_location_attribute","anyof",locationAttribute]
                            ],
                        columns:
                            [
                                search.createColumn({name: "internalid", label: "内部 ID"})
                            ]
                    });
                    var rs2 = locationSearchObj2.run().getRange({ start: 0, end: 1 });
                    if (!rs2 || rs2.length === 0) {
                        log.debug('目的仓不存在，请确认');
                        return;
                    }
                    var mdlocation = rs2[0].getValue({ name: 'internalid' }) || null;
                    log.debug('目的仓', mdlocation);
                    to.setValue({ fieldId: 'transferlocation', value: mdlocation });

                    // 3.创建转移订单TO
                    to.setValue('orderstatus', 'B');
                    to.setValue('incoterm', 1);
                    to.setValue('useitemcostastransfercost', true);

                    const sublistId = 'item';
                    const items = agg.items;

                    for (const skuId in items) {
                        const lotMap = items[skuId].lot;

                        let lineQty = 0;
                        for (const lotText in lotMap) lineQty += Number(lotMap[lotText] || 0);
                        if (lineQty <= 0) continue;

                        to.selectNewLine({
                            sublistId : sublistId
                        });
                        to.setCurrentSublistValue({
                            sublistId : sublistId,
                            fieldId : 'item',
                            value : skuId
                        });
                        to.setCurrentSublistValue({
                            sublistId : sublistId,
                            fieldId : 'quantity',
                            value : 2
                            // lineQty
                        });

                        var subRec = to.getCurrentSublistSubrecord({
                            sublistId : sublistId,
                            fieldId : 'inventorydetail'
                        });

                        for (const lotText in lotMap) {
                            const q = Number(lotMap[lotText] || 0);
                            if (q <= 0) continue;

                            subRec.selectNewLine({
                                sublistId : 'inventoryassignment'
                            });
                            subRec.setCurrentSublistText({
                                sublistId : 'inventoryassignment',
                                fieldId : 'issueinventorynumber',
                                text : lotText
                            });
                            subRec.setCurrentSublistValue({
                                sublistId : 'inventoryassignment',
                                fieldId : 'quantity',
                                // value : q
                                value : 1
                            });
                            subRec.commitLine({
                                sublistId : 'inventoryassignment'
                            });
                        }
                        to.commitLine({ sublistId: sublistId });
                    }
                    rec_data_id = to.save({ignoreMandatoryFields: true});

                    if (rec_data_id) {
                        log.debug('success', 'TO单已经创建' + rec_data_id);
                        var if_data = record.transform({
                            fromType: record.Type.TRANSFER_ORDER,
                            fromId: rec_data_id,
                            toType: record.Type.ITEM_FULFILLMENT,
                            isDynamic: true
                        });
                        if_data.setValue('shipstatus', 'C');
                        if_data_id = if_data.save({ignoreMandatoryFields: true});

                        if (if_data_id) {
                            log.debug('success', '发货成功' + if_data_id);
                            var ir_data = record.transform({
                                fromType: record.Type.TRANSFER_ORDER,
                                fromId: rec_data_id,
                                toType: record.Type.ITEM_RECEIPT,
                                isDynamic: true
                            });
                            ir_data.setValue('landedcostperline', true);

                            // 到岸成本数据整理
                            // 汇总维度 货品 + 数量
                            var lineCount = ir_data.getLineCount({sublistId: 'item'});
                            for (var i = 0; i < lineCount; i++) {

                                var itemId = ir_data.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    line: i
                                });

                                if(items.hasOwnProperty(itemId)){
                                    var fee = items[itemId].fee

                                    ir_data.selectLine({
                                        sublistId: 'item',
                                        line: i
                                    });
                                    var subRecord = ir_data.getCurrentSublistSubrecord({
                                        sublistId: 'item',
                                        fieldId: 'landedcost'
                                    });

                                    for (var feeKey in fee) {

                                        var amountValue = fee[feeKey] || 0;
                                        if (amountValue != 0) {
                                            subRecord.selectNewLine({
                                                sublistId: 'landedcostdata'
                                            });

                                            subRecord.setCurrentSublistValue({
                                                sublistId: 'landedcostdata',
                                                fieldId: 'costcategory',
                                                value: feeMaping[feeKey]
                                            });

                                            subRecord.setCurrentSublistValue({
                                                sublistId: 'landedcostdata',
                                                fieldId: 'amount',
                                                value: amountValue
                                            });

                                            subRecord.commitLine({
                                                sublistId: 'landedcostdata'
                                            });
                                        }
                                    }
                                    ir_data.commitLine({sublistId: 'item'});
                                }
                            }
                            var ir_data_id = ir_data.save({ignoreMandatoryFields: true});
                            if (ir_data_id) {
                                log.debug('success', '收货成功' + ir_data_id);
                            }

                            const tk_id = value.tk_id;
                            record.submitFields({
                                type: 'customrecord_swc_wl_tk_t',
                                id: tk_id,
                                values: {
                                    custrecord_wl_tk_t_bg_t: rec_data_id
                                }
                            });
                        } else {
                            result_str.data = '发货失败';
                            return result_str;
                        }

                    }
                }
            }



        }catch (e) {
            log.debug('Map Error', e)
        }

    }

    function reduce(context) {
        // 这里按您的要求“保留 reduce”，暂不做任何处理
        // context.key: "poId|shopId"
        // context.values: [itId, itId, ...]  (理论上每个 key 只有 1 个)
        // log.debug('reduce placeholder', { key: context.key, values: context.values });
    }

    function summarize(summary) {
        if (summary.inputSummary && summary.inputSummary.error) {
            log.error('input error', summary.inputSummary.error);
        }

        summary.mapSummary.errors.iterator().each((key, err) => {
            log.error('map error', { key, err });
            return true;
        });

        summary.reduceSummary.errors.iterator().each((key, err) => {
            log.error('reduce error', { key, err });
            return true;
        });

        log.audit('summarize', {
            usage: summary.usage,
            concurrency: summary.concurrency,
            yields: summary.yields
        });
    }

    function ensure(obj, key, initValue) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
            obj[key] = initValue;
        }
        return obj[key];
    }

    function toNumber(v) {
        const n = Number(v);
        return isNaN(n) ? null : n;
    }

    function isBlank(v) {
        return v === null || v === undefined || v === '';
    }

    /**
     * 将店铺下的明细聚合：按 sku -> lotNum 汇总数量
     * 输入 lines: [{sku,qty,lotNum,gys}, ...]
     * 输出: { skuId: { lotText: qtySum, ... }, ... }
     */
    function aggregateLines(lines) {
        const feeFields = [
            'trailer_fee',
            'cda_fee',
            'em_ffc',
            'bxf_fee',
            'hyf_fee',
            'qgf_fee',
            'jkgs_fee',
            'hdf_fee',
            'tcf_fee'
        ];

        const out = {
            gys: null,
            items: {}
        };

        for (let i = 0; i < (lines || []).length; i++) {
            const ln = lines[i] || {};

            const sku = String(ln.sku || '').trim();
            const lot = String(ln.lotNum || '').trim();
            const qty = Number(ln.qty || 0);

            if (!sku || qty <= 0) continue;

            // gys 取第一个有效值
            if (out.gys === null && ln.gys) out.gys = String(ln.gys);

            // 初始化 sku 容器
            if (!out.items[sku]) {
                out.items[sku] = {
                    lot: {},
                    fee: {}
                };

                // fee 初始化为 0
                for (let f = 0; f < feeFields.length; f++) {
                    out.items[sku].fee[feeFields[f]] = 0;
                }
            }

            // 1) 聚合 lot 数量
            if (!out.items[sku].lot[lot]) out.items[sku].lot[lot] = 0;
            out.items[sku].lot[lot] += qty;

            // 2) 聚合 fee 合计（同 SKU 累加）
            for (let f = 0; f < feeFields.length; f++) {
                const field = feeFields[f];
                const v = Number(ln[field] || 0);
                out.items[sku].fee[field] += v;
            }
        }

        return out;
    }

    function getAllResults(srch) {
        var results = srch.run();
        var searchResults = [];
        var searchid = 0;
        do {
            var resultslice = results.getRange({
                start: searchid,
                end: searchid + 1000
            });
            resultslice.forEach(function (slice) {
                searchResults.push(slice);
                searchid++;
            });

        } while (resultslice.length >= 1000);
        return searchResults;
    }

    return { getInputData, map, reduce, summarize };
});
