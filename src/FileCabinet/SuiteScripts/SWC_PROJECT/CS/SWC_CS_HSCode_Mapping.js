/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(["N/search", "../common/SWC_Utils.js"],

function(search, SWC_Utils) {
    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
        let curRec = scriptContext.currentRecord;
        let fieldId = scriptContext.fieldId;
        if (fieldId == "custrecord_swc_ys_item") { // 货品
            let item = curRec.getValue({fieldId: fieldId});
            let description = curRec.getValue({fieldId: "custrecord_swc_ys_sbys"}); // 申报要素
            let skuDescription = "";
            if (!SWC_Utils.isEmpty(description) && SWC_Utils.isEmpty(item)) { // 申报要素 已有值 但货品被清空 清空 申报要素 字段值
                curRec.setValue({fieldId: "custrecord_swc_ys_sbys", value: skuDescription, ignoreFieldChange: true});
                return;
            }
            if (!SWC_Utils.isEmpty(item)) skuDescription = getSkuDescription(item);
            curRec.setValue({fieldId: "custrecord_swc_ys_sbys", value: skuDescription, ignoreFieldChange: true});
        }
    }

    /**
     * 获取 申报要素
     * @param item
     * @returns {string}
     */
    function getSkuDescription(item){
        let skuDescription = "";
        if (SWC_Utils.isEmpty(item)) return skuDescription;
        let itemInfo = getItemInfo(item);

        // 3|0|用途|材质|种类|品牌牌|加工方法 规格：产品高*产品长*产品宽mm 型号：货品名称
        skuDescription = `3|0|${itemInfo.productPurpose || ""}|${itemInfo.texture || ""}|${itemInfo.category || ""}|${itemInfo.brand || ""}牌|${itemInfo.processingMethod || ""} 规格：${itemInfo.height || ""}*${itemInfo.length || ""}*${itemInfo.width || ""}mm 型号：${itemInfo.displayName || ""}`;
        return skuDescription;
    }

    /**
     * 获取货品信息
     * @param item
     * @returns {{}}
     */
    function getItemInfo(item){
        let itemInfo = {};
        if (SWC_Utils.isEmpty(item)) return itemInfo;
        var itemSearchObj = search.create({
            type: "item",
            filters:
                [
                    ["isinactive", "is", "F"], // 非活动 F
                    "AND",
                    ["internalid", "anyof", item] // 内部 ID
                ],
            columns: [
                search.createColumn({name: "custitem_swc_texture", label: "材质"}),
                search.createColumn({name: "custitem_swc_brand", label: "品牌"}),
                search.createColumn({name: "custitem_swc_height", label: "产品高"}),
                search.createColumn({name: "custitem_swc_length", label: "产品长"}),
                search.createColumn({name: "custitem_swc_width", label: "产品宽"}),
                search.createColumn({name: "displayname", label: "货品名称"}),
                search.createColumn({name: "custitem_swc_product_purpose", label: "用途"}),
                search.createColumn({name: "custitem_swc_sku_category", label: "种类"}),
                search.createColumn({name: "custitem_swc_sku_processing_method", label: "加工方法"})
            ]
        });
        let results = SWC_Utils.getAllResults(itemSearchObj);
        if (SWC_Utils.isEmpty(results) || results.length <= 0) return itemInfo;
        let result = results[0];
        itemInfo.texture = result.getValue({name: "custitem_swc_texture"}); // 材质
        itemInfo.brand = result.getText({name: "custitem_swc_brand"}); // 品牌
        itemInfo.height = result.getValue({name: "custitem_swc_height"}); // 产品高
        itemInfo.length = result.getValue({name: "custitem_swc_length"}); // 产品长
        itemInfo.width = result.getValue({name: "custitem_swc_width"}); // 产品宽
        itemInfo.displayName = result.getValue({name: "displayname"}); // 货品名称
        itemInfo.productPurpose = result.getValue({name: "custitem_swc_product_purpose"}); // 用途
        itemInfo.category = result.getValue({name: "custitem_swc_sku_category"}); // 种类
        itemInfo.processingMethod = result.getValue({name: "custitem_swc_sku_processing_method"}); // 加工方法
        return itemInfo;
    }

    return {
        fieldChanged: fieldChanged
    };
    
});
