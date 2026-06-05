/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *@description 一键接收配件类型采购订单
 */
define(['../common/moment', "N/search", "N/record", "N/currency", '../common/SWC_CONFIG_DATA'], function (moment, search, record, NScurrency, SWC_CONFIG_DATA) {
     const CONFIG = SWC_CONFIG_DATA.configData();

    // -----------------------------
    // 参数/常量区
    // -----------------------------
    const INTERCOMPANY_SUBSIDIARY_TAX_CODE_MAP = CONFIG.INTERCOMPANY_SUBSIDIARY_TAX_CODE_MAP || {};

    function _get(context) {

    }

    function _post(context) {
        var request = context.request;
        var result;

        // 提货计划记录字段及字段ID为：
        // 数量 custrecord_swc_sdp_quantity
        // 店铺 custrecord_swc_sdp_store
        // 国家 custrecord_swc_sdp_country
        // 仓库类型 custrecord_swc_sdp_location_type
        // SKU custrecord_swc_sdp_sku
        // 3PL-US-美西分区数量 custrecord_swc_sdp_us_west_qty
        // 3PL-US-美东分区数量 custrecord_swc_sdp_us_east_qty
        // 3PL-US-美中分区数量 custrecord_swc_sdp_us_center_qty
        // 3PL-US-美西南分区数量 custrecord_swc_sdp_us_southwest_qty
        // 3PL-US-美东南分区数量 custrecord_swc_sdp_us_southeast_qty
        // 3PL-CA-加东分区数量 custrecord_swc_sdp_ca_east_qty
        // 3PL-CA-加西分区数量 custrecord_swc_sdp_ca_west_qty


        // 采购订单明细行字段及ID：
        // 数量 quantity
        // 店铺 custcol_swc_store
        // 国家 custcol_swc_country_code
        // 仓库类型 custcol_swc_loc_type
        // 分区 custcol_swc_us_districts
        // SKU item

        // 分区枚举值为美西、美东、美中、美西南、美东南、加东、加西
        // 国家为US、仓库类型为3PL时，提货计划数量会拆分到美国五个分区之中，3PL-US-美西分区数量、3PL-US-美东分区数量、3PL-US-美中分区数量、3PL-US-美西南分区数量、3PL-US-美东南分区数量
        // 国家为CA、仓库类型为3PL时，提货计划数量会拆分到加拿大两个分区之中，3PL-CA-加东分区数量、3PL-CA-加西分区数量

        // 已知一条提货计划数量为100，需要搜索匹配采购订单明细，将提货需要的100个数量分配到采购订单明细上，采购订单明细的总数量可能比提货计划数量多或者少，分配结果需要记录到一个自定义记录中，记录采购订单号+SKU+仓库类型+国家+分配数量；
        // 请帮我用Netsuite 2.0脚本写一段代码处理此需求






        try {

            var po_id = context.bill_id;
            var action = context.action;

            if (!action) {
                throw new Error('缺少 action 参数');
            }
            if (!po_id && po_id !== 0) {
                throw new Error('缺少 bill_id 参数');
            }

            var handlers = getActionHandlers();
            var handler = handlers[action];

            if (typeof handler !== 'function') {
                throw new Error('不支持的 action：' + action);
            }

            result = handler(po_id);
            return result
        } catch (error) {
            log.error('onRequest error', error);
            return {
                code: '500',
                msg: '请求失败' + error.message
            }
        }

    }
    function getActionHandlers() {
        return {
            batchReceive: batchReceive,                      // 一键接收
            onClickInOutCreate: onClickInOutCreate,          // 采购入库调拨
            onClickFeePoCreate: onClickFeePoCreate,          // 调拨费采购订单类型做成
            onClickApproveOk: onClickApproveOk,              // 采购调拨费分摊
            onClickReapply: onClickReapply                  // 调拨费重新提交
        };
    }

    function batchReceive(po_id) {
        try {
            log.debug('batchReceive', po_id)
            var po = record.load({ type: "purchaseorder", id: po_id })
            var to_location = po.getValue('custbody_swc_to_location')
            var tranid = po.getValue('tranid');
            var location = po.getValue('location');
            var promotional = po.getValue('custbody_swc_promotional_item_purchase');//配件订单
            // if (!location) {
            //     location = po.getValue('custbody_ld_demand_warehouse')
            // }
            if (!location) {
                return {
                    code: '500',
                    msg: '请求失败,收货地点为空'
                }
            }
            if (!to_location && !promotional) {
                return {
                    code: '500',
                    msg: '请求失败,调拨目的仓为空，不允许一键收货'
                }
            }
            var trandate = moment().add(16, 'hours').format('YYYY-MM-DD');
            var trandates = trandate.split('-');
            var pici = tranid + trandates[0] + trandates[1] + trandates[2];
            log.debug('APPROVAL STATUS', po.getValue('approvalstatus'))
            log.debug('tranid', po.getValue('tranid'))


            var receiptRec = record.transform({
                fromType: 'purchaseorder',
                toType: record.Type.ITEM_RECEIPT,
                fromId: Number(po_id),
                isDynamic: true
            })
            receiptRec.setText({ fieldId: 'trandate', text: trandate });
            var lr = receiptRec.getLineCount({ sublistId: 'item' });
            var receipt_linecount = 0;
            var fromlocation = po.getValue('location');
            var items = []//调拨单货品明细
            for (var i = 0; i < lr; i++) {
                receiptRec.selectLine({ sublistId: 'item', line: i })
                var itemtype = receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });		//货品类型
                // log.debug('itemtype', itemtype)
                if (itemtype == 'OTHCHARGE') continue
                // fromlocation = receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i });

                var quantity = receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_curent_receipt_qty', line: i })//
                // log.debug('quantity ' + i, quantity)
                var isMain = receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_main_sku', line: i });
                if (!quantity || quantity == 0 || isMain) {
                    receiptRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false });
                    continue
                }
                receipt_linecount++;
                receiptRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: location });
                receiptRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: quantity });
                try {
                    var re_inventorydetail = receiptRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' })
                    re_inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' })
                    // re_inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', 
                    //                    fieldId: 'issueinventorynumber', text:tranid});
                    re_inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', text: pici + '' + i });
                    re_inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: quantity });
                    re_inventorydetail.commitLine({ sublistId: 'inventoryassignment' })
                    if (to_location) {
                        var skuId = receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                        var origin_sku = receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_origin_sku', line: i });
                        var country = receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_country_code', line: i });
                        var location_type = receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_loc_type', line: i });
                        var region = receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_us_districts', line: i });
                        var yl = receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_grade', line: i });
                        var customer = receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_store', line: i });
                        items.push({
                            item: receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }),
                            location: receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i }),
                            quantity: receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_curent_receipt_qty', line: i }),
                            pici: pici + '' + i,
                            origin_sku: origin_sku,
                            country: country,
                            location_type: location_type,
                            region: region,
                            yl: yl,
                            customer: customer,
                            rate: receiptRec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i })
                        })
                    }
                    receiptRec.commitLine({ sublistId: 'item' })
                } catch (error) {
                    log.error('库存详细信息报错', error)
                }


            }
            if (receipt_linecount == 0) {
                log.error('收货失败', '收货数量为零')
                return {
                    code: '500',
                    msg: '请求失败,本次收货数量为零'
                };
            }
            var RECEIPT_SAVE = receiptRec.save({ ignoreMandatoryFields: true })
            log.audit('收货成功', RECEIPT_SAVE)
            //做TO单， TODO:判断发出仓和目的仓子公司是否一致，不一致则要生成公司间交易

            if (to_location) {
                var po_subsidiary = po.getText('subsidiary');
                var to_location_Result = search.lookupFields({ type: 'location', id: to_location, columns: ['subsidiary'] });
                var to_location_subsidiary = to_location_Result.subsidiary;
                if (po_subsidiary == to_location_subsidiary) {
                    //子公司相同，
                    var rec = record.create({ type: 'transferorder', isDynamic: false })
                    rec.setValue({ fieldId: 'subsidiary', value: po.getValue('subsidiary') })
                    rec.setValue({ fieldId: 'location', value: fromlocation })
                    rec.setValue({ fieldId: 'transferlocation', value: to_location })
                    // rec.setValue({ fieldId: 'orderstatus', value: 'B' })
                    rec.setValue({ fieldId: 'custbody_swc_po_transfer', value: true })
                    rec.setValue({ fieldId: 'custbody_swc_fee_po_id', value: po_id })
                    rec.setValue({ fieldId: 'useitemcostastransfercost', value: true })
                    for (var index = 0; index < items.length; index++) {
                        var element = items[index];
                        rec.setSublistValue({ sublistId: 'item', fieldId: 'item', value: element.item, line: index })
                        rec.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.quantity, line: index })
                        rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_origin_sku', value: element.origin_sku, line: index })
                        rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_country_code', value: element.country, line: index })
                        rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_loc_type', value: element.location_type, line: index })
                        rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_us_districts', value: element.region, line: index })
                        rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_grade ', value: element.yl, line: index })
                        rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_store', value: element.customer, line: index })
                        var sublistSubrecord = rec.getSublistSubrecord({
                            sublistId: 'item',
                            fieldId: 'inventorydetail',
                            line: index
                        });
                        sublistSubrecord.setSublistText({
                            sublistId: 'inventoryassignment',
                            fieldId: 'issueinventorynumber',
                            text: element.pici,
                            line: 0
                        });
                        sublistSubrecord.setSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            value: element.quantity,
                            line: 0
                        });

                    }
                    var id = rec.save({ ignoreMandatoryFields: true })
                    record.submitFields({
                        type: 'purchaseorder',
                        id: po_id,
                        values: {
                            custbody_swc_transorder_id: id
                        },
                        options: {
                            ignoreMandatoryFields: true
                        }
                    })
                } else {
                    //子公司不同需要做公司间PO订单、公司间SO订单、SO的出库单
                    //第一步建立公司间PO============================================================================================================
                    var newPo = record.create({
                        type: record.Type.PURCHASE_ORDER,
                        isDynamic: true
                    });
                    // 原 PO 地点
                    var oldLocation = po.getValue('location');

                    // 供应商：原 PO 子公司文本 -> 'IC-xxx'
                    var oldSubsidiaryText = po.getText('subsidiary');
                    var oldSubsidiary = po.getValue('subsidiary');
                    newPo.setText({ fieldId: 'entity', text: 'IC-' + oldSubsidiaryText });
                    //要获取子公司内部ID
                    var to_location_subsidiary_id = '', poCurrencyId = '';
                    search.create({
                        type: "subsidiary",
                        filters:
                            [
                                ["formulatext: {namenohierarchy}", "is", to_location_subsidiary]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "name", label: "Name" }),
                                search.createColumn({ name: "currency", label: "currency" })
                            ]
                    }).run().each(function (a) {
                        to_location_subsidiary_id = a.id;
                        poCurrencyId = a.getValue('currency')
                        return false
                    });

                    //搜索公司间供应商付款条件
                    search.create({
                        type: "vendor",
                        filters:
                            [
                                ["entityid", "is", 'IC-' + oldSubsidiaryText]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "custentity_swc_payment_terms", label: "Terms" })
                            ]
                    }).run().each(function (a) {
                        var terms = a.getValue('custentity_swc_payment_terms');
                        if (terms) {
                            var termsArray = terms.split(',');
                            log.debug('termsArray', termsArray)
                            newPo.setValue({ fieldId: 'custbody_swc_vendor_payment_terms', value: termsArray[0] });
                        } else {
                            log.debug('没有terms')
                        }
                        return false
                    });

                    to_location_subsidiary_id && newPo.setValue({ fieldId: 'subsidiary', value: to_location_subsidiary_id });
                    newPo.setValue({ fieldId: 'location', value: to_location });
                    newPo.setValue({ fieldId: 'custbody_swc_po_transfer', value: true })
                    newPo.setValue({ fieldId: 'custbody_swc_order_type2', value: 13 });
                    newPo.setValue({ fieldId: 'custbody_swc_fee_po_id', value: po_id })
                    // 币种：取目的子公司本位币
                    var currencyId = po.getValue('currency');
                    newPo.setValue({ fieldId: 'currency', value: poCurrencyId });
                    var exchangeRate = NScurrency.exchangeRate({
                    source: currencyId,
                    target: poCurrencyId
                });
                    for (var index = 0; index < items.length; index++) {
                        newPo.selectNewLine({ sublistId: 'item' });
                        var element = items[index];
                        newPo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: element.item })
                        newPo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.quantity })
                        newPo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: element.rate*exchangeRate })
                        newPo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: INTERCOMPANY_SUBSIDIARY_TAX_CODE_MAP[to_location_subsidiary_id].po })                  
                        newPo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: to_location })
                        newPo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_origin_sku', value: element.origin_sku })
                        newPo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_country_code', value: element.country })
                        newPo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_loc_type', value: element.location_type })
                        newPo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_us_districts', value: element.region })
                        newPo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_grade ', value: element.yl })
                        newPo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_store', value: element.customer })
                        //TODO:在PO单上记录批次号，后面接收入库时用
                        newPo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_lot_number', value: element.pici })

                        log.debug('element.pici ', element.pici)
                        newPo.commitLine({ sublistId: 'item' });

                    }
                    var newPoId = newPo.save({ enableSourcing: true, ignoreMandatoryFields: false });
                    log.debug('公司间交易 PO（bg/cgbg/qg）做成', newPoId);

                    //第二步建立公司间SO============================================================================================================
                    // 公司间交易 SO
                    var soRec = record.create({
                        type: record.Type.SALES_ORDER,
                        isDynamic: true,
                        defaultValues: { autogeneratedfromicq: 'T' }
                    });
                    // 客户：公司间交易 PO 子公司 + 'IC-'
                    soRec.setText({ fieldId: 'entity', text: 'IC-' + newPo.getText('subsidiary') });

                    // 子公司：原采购单子公司
                    soRec.setValue({ fieldId: 'subsidiary', value: po.getValue('subsidiary') });

                    // 币种
                    soRec.setValue({ fieldId: 'currency', value: poCurrencyId });

                    // 地点：转移单至地点
                    soRec.setValue({ fieldId: 'location', value: oldLocation });

                    // 关联 PO
                    soRec.setValue({ fieldId: 'intercotransaction', value: newPoId });
                    for (var index = 0; index < items.length; index++) {
                        soRec.selectNewLine({ sublistId: 'item' });
                        var element = items[index];
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: element.item })
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.quantity })
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: element.rate*exchangeRate })
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: INTERCOMPANY_SUBSIDIARY_TAX_CODE_MAP[to_location_subsidiary_id].so }) 
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_origin_sku', value: element.origin_sku })
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_country_code', value: element.country })
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_loc_type', value: element.location_type })
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_us_districts', value: element.region })
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_grade ', value: element.yl })
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_store', value: element.customer })
                        soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: oldLocation })
                        //TODO:在PO单上记录批次号，后面接收入库时用
                        var inventorydetail = soRec.getCurrentSublistSubrecord({
                            sublistId: 'item',
                            fieldId: 'inventorydetail'
                        });
                        inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                        inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', text: element.pici });
                        inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: element.quantity });
                        inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                        inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                        soRec.commitLine({ sublistId: 'item' });

                    }
                    // soRec.setValue({ fieldId: 'orderstatus', value: 'B' });
                    var soId = soRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
                    log.debug('公司间交易 SO（bg/cgbg/qg）做成', soId);

                    //第三步建立公司间SO的出库单============================================================================================================
                    var ifRec = record.transform({
                        fromType: record.Type.SALES_ORDER,
                        fromId: soId,
                        toType: record.Type.ITEM_FULFILLMENT,
                        isDynamic: true
                    });

                    ifRec.setValue({ fieldId: 'shipstatus', value: 'C' }); // Shipped

                    // var sublistId = 'item';
                    var lineCount = ifRec.getLineCount({ sublistId: 'item' }) || 0;

                    for (let i = 0; i < lineCount; i++) {
                        ifRec.selectLine({ sublistId: 'item', line: i });
                        ifRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true });

                        // 以“行号字段”作为 lotJson 的 key（你原逻辑使用 custcol_swc_line_no）
                        // var item_id = ifRec.getCurrentSublistValue({ sublistId, fieldId: 'item' });
                        // var lineNo = ifRec.getCurrentSublistValue({ sublistId, fieldId: 'custcol_swc_line_no' });
                        var element = items[i];
                        var lotNum = element.pici;
                        log.debug('lotNum', lotNum);

                        // 数量：用真实数量（不要再写死 1）
                        var qty = Number(ifRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' })) || 0;
                        log.debug('qty', qty);
                        log.debug('so_loc', oldLocation)
                        ifRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty }); // 测试用 TODO
                        ifRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: oldLocation });

                        // 处理库存明细：必须 selectNewLine 才能写 assignment
                        // if (lotNum) {
                        //     var inventorydetail = ifRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });

                        //     inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' });
                        //     inventorydetail.setCurrentSublistText({
                        //         sublistId: 'inventoryassignment',
                        //         fieldId: 'issueinventorynumber',
                        //         text: lotNum
                        //     });
                        //     inventorydetail.setCurrentSublistValue({
                        //         sublistId: 'inventoryassignment',
                        //         fieldId: 'quantity',
                        //         value: qty
                        //         // value: 1 // 测试用 TODO
                        //     });
                        //     inventorydetail.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                        //     inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
                        // }

                        ifRec.commitLine({ sublistId: 'item' });
                    }
                    var ifId = ifRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
                    log.debug('SO -> IF 做成', ifId);


                }


            }

            //将本次接收数量和调拨目的仓置空
            var po = record.load({ type: "purchaseorder", id: po_id })
            var lc = po.getLineCount({ sublistId: 'item' });
            for (var i = 0; i < lc; i++) {
                po.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_curent_receipt_qty', value: 0, line: i });
            }
            po.setValue({ fieldId: 'custbody_swc_to_location', value: '' })
            var poid = po.save({ ignoreMandatoryFields: true })
            log.audit('收货成功', poid)

            return {
                code: '200',
                msg: '请求成功'
                , data: { id: RECEIPT_SAVE }
            }

        } catch (error) {
            log.error('收货失败', error)
            return {
                code: '500',
                msg: '请求失败' + error.message
            }
        }
    }

    /**
         * 采购入库调拨
         */
    function onClickInOutCreate(id) {
        var result_str = {};

        try {

            var irRec = record.transform({
                fromType: record.Type.PURCHASE_ORDER,
                fromId: id,
                toType: record.Type.ITEM_RECEIPT,
                isDynamic: true
            });

            var irLineCount = irRec.getLineCount({ sublistId: 'item' });

            for (var b2 = 0; b2 < irLineCount; b2++) {
                irRec.selectLine({ sublistId: 'item', line: b2 });

                var remainIr = Number(irRec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantityremaining'
                }) || 0);

                // var irLineNo = irRec.getCurrentSublistValue({
                //     sublistId: 'item',
                //     fieldId: 'custcol_swc_line_no'
                // })

                if (remainIr > 0) {
                    irRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true });
                    irRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: remainIr });
                    var pici = irRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_lot_number' });
                    var re_inventorydetail = irRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' })
                    re_inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' })
                    re_inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', text: pici });
                    re_inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: remainIr });
                    re_inventorydetail.commitLine({ sublistId: 'inventoryassignment' })

                    // var lcSub = irRec.getCurrentSublistSubrecord({
                    //     sublistId: 'item',
                    //     fieldId: 'landedcost'
                    // });
                    //
                    // lcSub.selectNewLine({ sublistId: 'landedcostdata' });
                    // lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: 37 });
                    // lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'amount', value: dbFeeFtAmount[irLineNo] });
                    // lcSub.commitLine({ sublistId: 'landedcostdata' });

                    irRec.commitLine({ sublistId: 'item' });
                } else {
                    irRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false });
                    irRec.commitLine({ sublistId: 'item' });
                }
            }

            irRec.save({ enableSourcing: true, ignoreMandatoryFields: true });
            log.debug('货品收据', irRec);
            record.submitFields({
                type: 'purchaseorder',
                id: id,
                values: {
                    custbody_swc_po_db_type: 5,
                }
            });

            result_str.msg = '已生成出库单及接收单';
            return result_str;

        } catch (e) {
            log.debug('入库失败：', e);
            result_str.msg = '入库失败,请联系管理人员';
            return result_str;
        }
    }

    /**
     * 调拨费费用类型采购订单做成
     * @param id
     * @returns {{}}
     */
    function onClickFeePoCreate(id) {

        var result_str = {};

        try {

            var rec = record.load({
                type: 'purchaseorder',
                id: id,
            });

            var feeSubID = 'recmachcustrecord_swc_trnfrord_link';
            var line = rec.getLineCount(feeSubID);

            var feeYgCheck = [];
            var payCheck = [];
            if (line <= 0) {
                result_str.msg = '请正确填写采购调拨费录入信息！';
                return result_str;
            }
            for (var x = 0; x < line; x++) {
                // 费用明细表ID
                var fee_id = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'id', line: x });
                // 预估采购杂费
                var po_fee_yg = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_trnfrord_po_db_fee', line: x });
                // 付款方
                var trnfrord_pay = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_trnfrord_pay', line: x });

                if (!po_fee_yg) {
                    feeYgCheck.push(fee_id)
                }

                if (!trnfrord_pay) {
                    payCheck.push(trnfrord_pay)
                }
            }

            if (payCheck.length > 0) {
                result_str.msg = '内部ID：' + feeYgCheck.join(',') + '行的付款方请正常填写！';
                return result_str;
            }

            if (feeYgCheck.length > 0) {
                result_str.msg = '内部ID：' + feeYgCheck.join(',') + '行的预估采购调拨费请正常填写！';
                return result_str;
            }

            for (var i = 0; i < line; i++) {
                var poDBID = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'id', line: i });
                // 付款方
                var trnfrord_pay = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_trnfrord_pay', line: i });
                // 预估采购杂费
                var po_db_fee = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_trnfrord_po_db_fee', line: i });

                // 创建费用类型采购订单
                var po_data = record.create({ type: 'purchaseorder', isDynamic: true });

                // 表单：采购订单_费用类
                po_data.setValue({ fieldId: 'customform', value: 102 });//TODO:生产环境ID
                po_data.setValue({ fieldId: 'entity', value: trnfrord_pay });
                po_data.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: 1 });// 等待审批

                // 账期 TODO 假数据，测试使用
                // po_data.setValue({ fieldId: 'custbody_swc_cqdd_zq', value: 1 });
                // 关联转移单
                po_data.setValue({ fieldId: 'custbody_swc_transorder_id', value: id });
                // 采购调拨费
                po_data.setValue({ fieldId: 'custbody_swc_po_fee', value: 4 });
                po_data.setValue({ fieldId: 'custbody_swc_order_type2', value: 4 });
                // 采购调拨费录入单
                po_data.setValue({ fieldId: 'custbody_swc_po_db_id', value: poDBID });
                // 采购调拨费状态
                po_data.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: 1 });
                // 明细数据做成
                po_data.selectNewLine({ sublistId: 'item' });
                po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 3110 });//TODO:生产环境ID
                po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                po_data.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: po_db_fee });
                po_data.commitLine({ sublistId: 'item' });
                var saveId = po_data.save({ ignoreMandatoryFields: true });
                rec.setSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_trnfrord_po_id', value: saveId, line: i });
                rec.setSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_trnfrord_po_type', value: 1, line: i });
                rec.setValue({ fieldId: 'custbody_swc_po_db_type', value: 1 });

            }

            rec.save();
            result_str.msg = '生成费用类采购订单成功';
        } catch (e) {
            log.debug('生成费用类采购订单 ： ', e.message);
            result_str.msg = '生成费用类采购订单失败,请联系管理人员';
        }

        return result_str;
    }

    /**
     * 调拨费用分摊
     */
    function onClickApproveOk(id) {
        var result_str = {};

        try {

            // 调拨费分摊金额
            var dbFeeFtAmount = {};

            var rec = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: id,
                isDynamic: false
            });

            // rec.setValue({ fieldId: 'orderstatus', value: 'B' })

            var feeSearch = search.create({
                type: "customrecord_swc_trnfrord_db",
                filters: [
                    ["custrecord_swc_trnfrord_link", "anyof", String(id)]
                ],
                columns: [
                    search.createColumn({ name: "custrecord_swc_trnfrord_po_db_fee" }),
                    search.createColumn({ name: "custrecord_swc_trnfrord_pay" })
                ]
            });

            var rs = feeSearch.run().getRange({ start: 0, end: 1 });
            if (!rs || rs.length === 0) {
                result_str.msg = '未找到调拨费数据';
                return result_str;
            }

            var po_db_fee = Number(rs[0].getValue({ name: 'custrecord_swc_trnfrord_po_db_fee' }) || 0);
            if (!po_db_fee || po_db_fee === 0) {
                result_str.msg = '预估采购调拨费为0，无需分摊';
                return result_str;
            }

            var subId = 'item';
            var lineCount = rec.getLineCount({ sublistId: subId });
            if (!lineCount || lineCount <= 0) {
                result_str.msg = '调拨单无明细行';
                return result_str;
            }

            var lineInfo = [];
            var itemIds = [];

            for (var i = 0; i < lineCount; i++) {
                var itemId = rec.getSublistValue({ sublistId: subId, fieldId: 'item', line: i });
                if (!itemId) continue;

                var qty = Number(rec.getSublistValue({ sublistId: subId, fieldId: 'quantity', line: i }) || 0);
                if (qty < 0) qty = 0;

                var itemIdStr = String(itemId);
                itemIds.push(itemIdStr);
                lineInfo.push({ line: i, itemId: itemIdStr, qty: qty });
            }

            if (lineInfo.length === 0) {
                result_str.msg = '未取得有效商品行';
                return result_str;
            }

            var uniqItemIds = Array.from(new Set(itemIds));
            if (uniqItemIds.length === 0) {
                result_str.msg = '未取得有效商品行';
                return result_str;
            }

            var inventoryitemSearchObj = search.create({
                type: "inventoryitem",
                filters: [
                    ["type", "anyof", "InvtPart"],
                    "AND",
                    ["internalid", "anyof", uniqItemIds]
                ],
                columns: [
                    search.createColumn({ name: "custitem_swc_total_volume" }),
                    search.createColumn({ name: "internalid" })
                ]
            });

            var itemSearchResults = getAllResults(inventoryitemSearchObj);
            var volMap = {};
            for (var r = 0; r < itemSearchResults.length; r++) {
                var iid = String(itemSearchResults[r].getValue({ name: 'internalid' }));
                var vpu = Number(itemSearchResults[r].getValue({ name: 'custitem_swc_total_volume' }) || 0);
                volMap[iid] = vpu;
            }

            var totalVol = 0;
            for (var j = 0; j < lineInfo.length; j++) {
                var vpu2 = Number(volMap[lineInfo[j].itemId] || 0);
                var volQty = vpu2 * Number(lineInfo[j].qty || 0);
                lineInfo[j].volPerUnit = vpu2;
                lineInfo[j].volQty = volQty;
                totalVol += volQty;
            }

            if (totalVol <= 0) {
                result_str.msg = '总体积为0，无法分摊';
                return result_str;
            }

            var allocated = 0;

            var lastIdx = -1;
            for (var k = lineInfo.length - 1; k >= 0; k--) {
                if (Number(lineInfo[k].volQty || 0) > 0) {
                    lastIdx = k;
                    break;
                }
            }
            if (lastIdx === -1) lastIdx = lineInfo.length - 1;
            var share;
            for (var m = 0; m < lineInfo.length; m++) {

                if (m === lastIdx) {
                    share = round2(po_db_fee - allocated);
                } else {
                    share = round2((lineInfo[m].volQty / totalVol) * po_db_fee);
                    allocated = round2(allocated + share);
                }

                var lineNo = rec.getSublistValue({
                    sublistId: subId,
                    fieldId: 'custcol_swc_line_no',
                    line: lineInfo[m].line
                });

                rec.setSublistValue({
                    sublistId: subId,
                    fieldId: 'custcol_swc_epac',
                    line: lineInfo[m].line,
                    value: share
                });

                rec.setSublistValue({
                    sublistId: subId,
                    fieldId: 'custcol_swc_aptf',
                    line: lineInfo[m].line,
                    value: share
                });

                dbFeeFtAmount[lineNo] = share;

            }
            rec.save({ enableSourcing: true, ignoreMandatoryFields: true });

            log.debug('dbFeeFtAmount', dbFeeFtAmount);

            var toRecForShip = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: id,
                isDynamic: false
            });

            var remainShipTotal = 0;
            var toShipLines = toRecForShip.getLineCount({ sublistId: 'item' });
            for (var s1 = 0; s1 < toShipLines; s1++) {
                var rem = Number(toRecForShip.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantityremaining',
                    line: s1
                }) || 0);
                remainShipTotal += rem;
            }

            var irRec = record.transform({
                fromType: record.Type.PURCHASE_ORDER,
                fromId: id,
                toType: record.Type.ITEM_RECEIPT,
                isDynamic: true
            });

            var irLineCount = irRec.getLineCount({ sublistId: 'item' });

            for (var b2 = 0; b2 < irLineCount; b2++) {
                irRec.selectLine({ sublistId: 'item', line: b2 });

                var remainIr = Number(irRec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantityremaining'
                }) || 0);

                var irLineNo = irRec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_swc_line_no'
                })

                if (remainIr > 0) {
                    irRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true });
                    irRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: remainIr });
                    var pici = irRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_lot_number' });
                    var re_inventorydetail = irRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' })
                    re_inventorydetail.selectNewLine({ sublistId: 'inventoryassignment' })
                    re_inventorydetail.setCurrentSublistText({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', text: pici });
                    re_inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: remainIr });
                    re_inventorydetail.commitLine({ sublistId: 'inventoryassignment' })

                    var lcSub = irRec.getCurrentSublistSubrecord({
                        sublistId: 'item',
                        fieldId: 'landedcost'
                    });
                    lcSub.selectNewLine({ sublistId: 'landedcostdata' });
                    lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'costcategory', value: 37 });//TODO:根据环境配置
                    lcSub.setCurrentSublistValue({ sublistId: 'landedcostdata', fieldId: 'amount', value: dbFeeFtAmount[irLineNo] });
                    lcSub.commitLine({ sublistId: 'landedcostdata' });

                    irRec.commitLine({ sublistId: 'item' });
                } else {
                    irRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false });
                    irRec.commitLine({ sublistId: 'item' });
                }
            }

            irRec.save({ enableSourcing: true, ignoreMandatoryFields: true });

            record.submitFields({
                type: 'purchaseorder',
                id: id,
                values: {
                    custbody_swc_po_db_type: 5,
                }
            });

            result_str.msg = '调拨费用分摊完成，并已生成出库单及接收单';
            return result_str;

        } catch (e) {
            log.debug('调拨费用分摊及入库失败：', e);
            result_str.msg = '调拨费用分摊及入库失败,请联系管理人员';
            return result_str;
        }
    }

    /**
     * 费用类型采购订单，重新审批
     * @param id
     */
    function onClickReapply(id) {
        var result_str = {};

        try {
            var rec = record.load({
                type: 'purchaseorder',
                id: id,
            });

            var saveFlag = false;
            var trnfrord_link = 'recmachcustrecord_swc_trnfrord_link';
            var line = rec.getLineCount(trnfrord_link);

            for (var x = 0; x < line; x++) {
                // 预估金额
                var trnfrord_po_db_fee = rec.getSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_trnfrord_po_db_fee', line: x });
                // 费用类采购订单ID
                var trnfrord_po_id = rec.getSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_trnfrord_po_id', line: x });
                // 费用类型采购订单状态
                var trnfrord_po_type = rec.getSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_trnfrord_po_type', line: x });

                if (trnfrord_po_type == 3) {
                    saveFlag = true;
                    // 更新采购订单ID
                    var poRec = record.load({
                        type: 'purchaseorder',
                        id: trnfrord_po_id,
                    });
                    poRec.setValue({ fieldId: 'custbody_swc_fee_ar_type', value: 1 });
                    poRec.setSublistValue({ sublistId: 'item', fieldId: 'amount', value: trnfrord_po_db_fee, line: 0 });
                    poRec.save();
                    rec.setSublistValue({ sublistId: trnfrord_link, fieldId: 'custrecord_swc_trnfrord_po_type', value: 1, line: x });
                }
            }
            if (saveFlag == true) {
                rec.setValue({ fieldId: 'custbody_swc_po_db_type', value: 1 });
                rec.save();
                result_str.msg = '重新审批提交成功！';
            } else {
                result_str.msg = '当前数据中，没有需要重新审核的数据！请确认！';
            }

        } catch (e) {
            log.debug('重新审批提交异常 ： ', e);
            result_str.msg = '重新审批提交异常,请联系管理人员';
        }

        return result_str;
    }

    /**
         * 检索共通方法
         * @param mySearch
         * @returns {*[]}
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
    function toNumber(v) {
        var n = Number(v);
        return isFinite(n) ? n : 0;
    }

    function round2(n) {
        n = toNumber(n);
        return Math.round((n + Number.EPSILON) * 100) / 100;
    }


    function _put(context) {

    }

    function _delete(context) {

    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
