/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/runtime', 'N/record', 'N/search', 'N/log'], (runtime, record, search, log) => {

    const PARAM_PAYLOAD = 'custscript_m_payload';       // 传入的 JSON 字符串

    function getInputData() {

        // 生成公司间交易
        // 1.按照PO单据做公司间交易
        // 2.在po单据的基础上，按照店铺维度去做公司间交易
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

            // 成交方式
            var terms_of_trade = rec.getValue('custrecord_swc_wl_terms_of_trade');
            // 目的仓仓库代码
            var md_location = rec.getValue('custrecord_swc_md_location');
            // 运抵国
            var wl_county_lsit = rec.getValue('custrecord_swc_wl_county_lsit');

            // 组装 documentData
            var documentData = {};

            if(btnType == 'wl'){// 供应商已出货
                // 数据整理，数据结构 ： 一层，按照PO单据分组， 二层，按照PO单据中的店铺分组

                var feeSubID = 'recmachcustrecord_swc_wl_plan_order_id';
                var lineCount = rec.getLineCount({ sublistId: feeSubID });

                for (var i = 0; i < lineCount; i++) {
                    // 采购订单编号
                    var poId = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_po_num', line: i });
                    // 店铺
                    var customerId = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_customer', line: i });

                    // 店铺的子公司
                    var s = search.lookupFields({
                        type: 'customer',
                        id: customerId,
                        columns: ['subsidiary']
                    })
                    var customerSub = s['subsidiary'][0].value;

                    // 货品
                    var skuId = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_item', line: i });
                    // SKU
                    var sku = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_sku', line: i });
                    // 国家
                    var country = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_country', line: i });
                    //仓库类型
                    var location_type = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_location_type', line: i });
                    // 区域
                    var region = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_region', line: i });
                    // 本次真实发运优等品数量
                    var superiorQty = toNumber(rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: i }));
                    // 本次真实发运良品数量
                    var goodQty = toNumber(rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: i }));
                    // 批次号
                    var lotNum = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custrecord_swc_wl_d_lot', line: i });

                    var key = poId + '_' + customerId + '_' + wl_county_lsit + '_' + btnType + '_' + terms_of_trade + '_' + customerSub
                    var yl = superiorQty > 0 ? 1 : 2
                    var value = skuId + '_' + sku + '_' + country + '_' + location_type + '_' + region + '_' + yl

                    if(documentData.hasOwnProperty(key)){
                        documentData[key][value] = lotNum
                    }else{
                        documentData[key] = {}
                        documentData[key][value] = lotNum
                    }
                }

            }else if(btnType == 'bg'){// 报关

                // TODO 等待后续逻辑处理
            }else if(btnType == 'qg'){// 清关
                // TODO 等待后续逻辑处理
            }

            log.debug('getInputData documentData', documentData);

            return documentData;
        }catch (e) {
            log.error('getInputData error', e)
        }

    }

    function map(context) {
        try{
            const mapKey = context.key;
            const mapValue = JSON.parse(context.value);

            var poDatas = mapKey.split('_');
            var poId = poDatas[0];
            var customerId = poDatas[1];
            var wl_county_lsit = poDatas[2];

            var btnType = poDatas[3];
            var terms_of_trade = poDatas[4];

            log.debug('Map key', mapKey);
            log.debug('Map Value', mapValue);

            if(btnType == 'wl'){ // PO单做成公司间交易
                // 创建PO单据，将符合要求的行复制过来
                var srcPo = record.load({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    isDynamic: false
                });

                var newPo = record.create({
                    type: record.Type.PURCHASE_ORDER,
                    isDynamic: true
                });

                // 原PO单地点
                var oldLocation = srcPo.getText('location');

                // 供应商 - 元PO单据的子公司 + IC-字段
                var oldSubsidiary = srcPo.getText('subsidiary');
                newPo.setText({ fieldId: 'entity', text: 'IC-' + oldSubsidiary });

                // 子公司
                var newSub = '';
                if(wl_county_lsit == 230){ // 美国的场合
                    newSub = 77
                }else{
                    var s = search.lookupFields({
                        type: 'customer',
                        id: customerId,
                        columns: ['subsidiary']
                    })
                    newSub = s['subsidiary'][0].value;
                }
                newPo.setValue({ fieldId: 'subsidiary', value: newSub });

                // 地点
                // 仓库属性
                var locationType = '';
                if(btnType == 'wl'){
                    if(terms_of_trade == 1){
                        locationType = 4
                    }
                }
                const locationSearchObj = search.create({
                    type: "location",
                    filters:
                        [
                            ["custrecord_swc_location_store","anyof",customerId],
                            "AND",
                            ["custrecord_swc_location_attribute","anyof",locationType]
                        ],
                    columns:
                        [
                            search.createColumn({name: "internalid", label: "内部 ID"})
                        ]
                });
                const result = locationSearchObj.run().getRange({ start: 0, end: 1 })[0];
                newPo.setValue({ fieldId: 'location', value: result.getValue('internalid') });

                // 币种
                var currencyId = srcPo.getValue('currency');
                newPo.setValue({ fieldId: 'subsidiary', value: currencyId });


                var sublistId = 'item';
                var srcLineCount = srcPo.getLineCount({ sublistId: sublistId }) || 0;

                for (var i = 0; i < srcLineCount; i++) {

                    // 货品
                    var skuId = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'item', line: i });
                    // SKU
                    var sku = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custcol_swc_pr_origin_sku', line: i });
                    // 国家
                    var country = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custcol_swc_country_code', line: i });
                    //仓库类型
                    var location_type = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custcol_swc_loc_type', line: i });
                    // 区域
                    var region = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custcol_swc_us_districts', line: i });
                    // 本次真实发运优等品数量
                    var yl = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'custcol_swc_grade', line: i });
                    // 数量
                    var qty = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'quantity', line: i });
                    // 金额
                    var amt = rec.getSublistValue({ sublistId: feeSubID, fieldId: 'amount', line: i });

                    var value = skuId + '_' + sku + '_' + country + '_' + location_type + '_' + region + '_' + yl

                    if (!mapValue[value]) continue;

                    newPo.selectNewLine({ sublistId: sublistId });

                    // 最小必填：item / quantity
                    newPo.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'item', value: skuId });
                    newPo.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'quantity', value: qty });
                    newPo.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'amount', value: amt });

                    newPo.commitLine({ sublistId: sublistId });
                }
                var newPoId = newPo.save();
                log.debug('newPoId', newPoId);

                const soRec = record.create({
                    type: record.Type.SALES_ORDER,
                    isDynamic: true
                });

                // 客户：公司间交易PO的子公司+‘IC-’
                soRec.setText({ fieldId: 'entity', text: 'IC-' + newSub });
                // 子公司：原PO单的子公司
                soRec.setText({ fieldId: 'subsidiary', text: oldSubsidiary });
                // 币种保持一致
                soRec.setValue({ fieldId: 'currency', value: currencyId });
                // 地点：原PO单的地点
                soRec.setValue({ fieldId: 'location', value: oldLocation });
                soRec.setValue({ fieldId: 'intercotransaction', value: newPoId });

                // soRec.selectNewLine({ sublistId: 'item' });
                // soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item });
                // soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                // soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: 18.88 });
                //
                // soRec.commitLine({ sublistId: 'item' });

                let soId = soRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
                log.debug('newSoId', soId);
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

    function toNumber(v) {
        const n = Number(v);
        return isNaN(n) ? null : n;
    }

    return { getInputData, map, reduce, summarize };
});
