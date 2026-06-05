/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', 'N/error', '../common/SWC_CONFIG_DATA'],
    function (format, runtime, search, record, error, SWC_CONFIG_DATA) {
        var CONFIG = SWC_CONFIG_DATA.configData();
        function getInputData() {

            let order_ids = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wl_plan_order_ids' });
            order_ids = JSON.parse(order_ids)

            log.debug('order_ids', order_ids)
            if (order_ids.length > 0) {
                // 采购订单已发运数量回写
                var cabLines = {}
                for (let d = 0; d < order_ids.length; d++) {
                    var data = order_ids[d]
                    // 采购订单编号
                    var poId = data.poId
                    // 国家
                    var country = data.country
                    // 仓库类型
                    var location_type = data.location_type
                    // 区域
                    var region = data.region
                    // 货品
                    var item_id = data.item_id
                    // 本次真实发运优等品数量
                    var superior_qty_wl = data.superior_qty_wl
                    // 本次真实发运良品数量
                    var good_qty_wl = data.good_qty_wl

                    const key = String(item_id) + '_' + String(country) + '_' + String(location_type) + '_' + String(region);

                    if (!cabLines[poId]) cabLines[poId] = {};
                    cabLines[poId][key] = (Number(cabLines[poId][key]) || 0) + Number(superior_qty_wl) + Number(good_qty_wl); // 同 key 累加，避免覆盖
                }

                log.debug('cabLines', cabLines);
                log.debug('Object.keys(cabLines).length', Object.keys(cabLines).length)
                // 先更新采购订单
                if(Object.keys(cabLines).length > 0){
                    try{
                        for (const poId in cabLines) {
                            if (!Object.prototype.hasOwnProperty.call(cabLines, poId)) continue;

                            const data = cabLines[poId]; // { key: totalQty }
                            const poRec = record.load({
                                type: 'purchaseorder',
                                id: poId,
                                isDynamic: false // 用 setSublistValue(line=) 更稳
                            });

                            const poLineCount = poRec.getLineCount({ sublistId: 'item' });

                            // 为每个 key 收集行（行索引、lineNo、quantity）
                            const poItemQtyJson = {}; // { key: { totalQty, lines:[{lineIndex,lineNo,qty}] } }

                            var oldWlQty = {};
                            for (let i = 0; i < poLineCount; i++) {
                                // 成品SKU
                                const item = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_origin_sku', line: i });
                                // 仓库类型
                                const loc_type = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_loc_type', line: i });
                                // 国家
                                const country_code = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_country_code', line: i });
                                // 美国分区
                                const us_districts = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_us_districts', line: i }) || ' ';
                                // Line No
                                const line_no = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: i });
                                const quantity = Number(poRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }) || 0);

                                const wlQty = Number(poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_wl_qty', line: i }) || 0);

                                oldWlQty[line_no] = wlQty;

                                // 成品SKU 国家 仓库类型 美国分区
                                const key = String(item) + '_' + String(country_code) + '_' + String(loc_type) + '_' + String(us_districts);

                                log.debug('key', key);
                                // 品级为空的场合
                                const grade = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_grade', line: i }) || '';
                                // // 行关闭
                                // var lineClose = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_close', line: i }) === true
                                //     || poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_close', line: i }) === 'T';
                                //
                                log.debug('grade', grade);
                                // log.debug('lineClose', lineClose);

                                // 品级为空，
                                if (grade != '') continue;
                                log.debug('grade1', grade);
                                if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
                                log.debug('grade2', grade);

                                log.debug('poItemQtyJson[key]', poItemQtyJson[key]);

                                if (!poItemQtyJson[key]) {
                                    poItemQtyJson[key] = {
                                        totalQty: Number(data[key]) || 0,
                                        lines: []
                                    };
                                }

                                poItemQtyJson[key].lines.push({
                                    lineIndex: i,
                                    lineNo: line_no,
                                    qty: Number(quantity) - Number(wlQty)
                                });
                            }

                            log.debug('poItemQtyJson', poItemQtyJson)
                            // 对每个 key 做分摊并回写
                            log.debug('oldWlQty', oldWlQty);
                            for (const key in poItemQtyJson) {

                                const bucket = poItemQtyJson[key];
                                const totalQty = Number(bucket.totalQty) || 0; // 这次要分摊的总数量
                                var dftQty = []; // 每一行剩余可分摊数量
                                const lines = bucket.lines;
                                var dftQtyQty = 0;// 这次分摊总数量之和
                                for (let i = 0; i < lines.length; i++) {
                                    dftQty.push(lines[i].qty)
                                    dftQtyQty += Number(lines[i].qty)
                                }
                                var getAry = splitByProportion(dftQty, totalQty, dftQtyQty);
                                for (let ag = 0; ag < getAry.length; ag++) {

                                    for (let z = 0; z < poLineCount; z++) {
                                        var line_no2 = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: z });

                                        if(line_no2 == lines[ag].lineNo){
                                            var newQty = getAry[ag];
                                            log.debug('line_no2', line_no2)
                                            log.debug('Number(newQty)', Number(newQty))
                                            log.debug('Number(oldWlQty2)',Number(oldWlQty[line_no2]))
                                            poRec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_swc_wl_qty',
                                                line: z,
                                                value: (Number(newQty) || 0) + Number(oldWlQty[line_no2])
                                            });
                                        }
                                    }
                                }
                            }

                            poRec.save({ ignoreMandatoryFields: true });
                        }
                    }catch (e) {
                        log.debug('e', e);
                    }
                }
            }

            var ids = [];
            for (let i = 0; i < order_ids.length; i++) {
                var data = order_ids[i];
                ids.push(data.main_internalid)
            }

            var mapDatas = [];
            var mapJson = {};

            var customrecord_swc_actual_cabinet_detailSearchObj = search.create({
                type: "customrecord_swc_actual_cabinet_detail",
                filters:
                    [
                        ["internalid","anyof",ids],
                        "AND",
                        ["custrecord_swc_acd_po_id.mainline","is","T"]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_acd_country", label: "国家"}),
                        search.createColumn({name: "custrecord_swc_acd_warehouse_type", label: "仓库类型"}),
                        search.createColumn({name: "custrecord_swc_acd_region", label: "区域"}),
                        search.createColumn({
                            name: "subsidiary",
                            join: "CUSTRECORD_SWC_ACD_PO_ID",
                            label: "子公司"
                        }),
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "custrecord_swc_acd_po_id", label: "采购订单编号"}),
                        search.createColumn({name: "custrecord_swc_acd_item", label: "货品"}),

                    ]
            });

            var searchObj = getAllResults(customrecord_swc_actual_cabinet_detailSearchObj);
            if(searchObj && searchObj.length > 0) {
                for (let i = 0; i < searchObj.length; i++) {
                    var datas = searchObj[i];
                    var country = datas.getValue({name: "custrecord_swc_acd_country", label: "国家"});
                    var warehouse_type = datas.getValue({name: "custrecord_swc_acd_warehouse_type", label: "仓库类型"});
                    var region = datas.getValue({name: "custrecord_swc_acd_region", label: "区域"});
                    var subsidiary = datas.getValue({
                        name: "subsidiary",
                        join: "CUSTRECORD_SWC_ACD_PO_ID",
                        label: "子公司"
                    });

                    var zts = search.lookupFields({
                        type: 'subsidiary',
                        id: subsidiary,
                        columns: ['custrecord_swc_subway_001_']
                    })
                    var zt = zts['custrecord_swc_subway_001_'][0].value;

                    var key = country + '_' + warehouse_type + '_' + region + '_' + subsidiary + '_' + zt;
                    if(mapJson.hasOwnProperty(key)){
                        mapJson[key].push({
                            poID : datas.getValue({name: "custrecord_swc_acd_po_id", label: "采购订单编号"}),
                            itemID : datas.getValue({name: "custrecord_swc_acd_item", label: "货品"}),
                            country : country,
                            warehouse_type : warehouse_type,
                            region : region,
                            subsidiary : subsidiary,
                            pgid : datas.getValue({name: "internalid", label: "内部 ID"}),
                            zt : zt
                        });
                    }else{
                        mapJson[key] = [{
                            poID : datas.getValue({name: "custrecord_swc_acd_po_id", label: "采购订单编号"}),
                            itemID : datas.getValue({name: "custrecord_swc_acd_item", label: "货品"}),
                            country : country,
                            warehouse_type : warehouse_type,
                            region : region,
                            subsidiary : subsidiary,
                            pgid : datas.getValue({name: "internalid", label: "内部 ID"}),
                            zt : zt
                        }]
                    }
                }
            }

            for (const mapJsonKey in mapJson) {
                mapDatas.push(mapJson[mapJsonKey]);
            }

            return mapDatas;
        }

        function map(context) {

            try{
                var outputByPgid = {}; // key: pgid, value: {y,l}
                var poIds = []; // POID
                var itemIds = []; // 货品
                var countrys = []; // 国家
                var warehouse_types = []; // 仓库类型
                var regions = []; // 区域
                var pgids = [];

                var values = JSON.parse(context.value);
                log.debug('values', values);
                log.audit('WL_PLAN_MR_INPUT_SUMMARY', {
                    contextKey: context.key || '',
                    inputCount: values && values.length ? values.length : 0,
                    firstInput: values && values.length ? values[0] : null
                });
                for (let i = 0; i < values.length; i++) {
                    var obj = values[i];
                    if(obj.poID){
                        poIds.push(obj.poID)
                    }
                    if(obj.itemID){
                        itemIds.push(obj.itemID)
                    }
                    if(obj.country){
                        countrys.push(obj.country)
                    }
                    if(obj.warehouse_type){
                        warehouse_types.push(obj.warehouse_type)
                    }
                    if(obj.region){
                        regions.push(obj.region)
                    }
                    if(obj.pgid){
                        pgids.push(obj.pgid);
                    }
                }

                poIds = poIds.length > 0 ? poIds : poIds[0]; // POID
                itemIds = itemIds.length > 0 ? itemIds : itemIds[0]; // 货品
                countrys = countrys.length > 0 ? countrys : countrys[0]; // 国家
                warehouse_types = warehouse_types.length > 0 ? warehouse_types : warehouse_types[0]; // 仓库类型
                regions = regions.length > 0 ? regions : regions[0]; // 区域
                pgids = pgids.length > 0 ? pgids : pgids[0];

                var filters = [
                    ["type", "anyof", "PurchOrd"],
                    "AND",
                    ["custcol_swc_grade","anyof","@NONE@"]
                ];

                if (!isEmpty(poIds)) {
                    filters.push("AND");
                    filters.push(["internalid", "anyof", poIds]);
                }

                if (!isEmpty(itemIds)) {
                    filters.push("AND");
                    filters.push(["custcol_swc_pr_origin_sku", "anyof", itemIds]);
                }

                if (!isEmpty(countrys)) {
                    filters.push("AND");
                    filters.push(["custcol_swc_country_code", "anyof", countrys]);
                }

                if (!isEmpty(warehouse_types)) {
                    filters.push("AND");
                    filters.push(["custcol_swc_loc_type", "anyof", warehouse_types]);
                }

                if (!isEmpty(regions)) {
                    filters.push("AND");
                    filters.push(["custcol_swc_us_districts", "anyof", regions]);
                }
                log.audit('WL_PLAN_MR_PO_SEARCH_FILTERS', {
                    poIds: poIds,
                    itemIds: itemIds,
                    countrys: countrys,
                    warehouse_types: warehouse_types,
                    regions: regions,
                    pgids: pgids,
                    filters: filters
                });

                var purchaseorderSearchObj = search.create({
                    type: "purchaseorder",
                    title: '物流发运-采购订单检索'+new Date(),
                    settings: [
                        { "name": "consolidationtype", "value": "ACCTTYPE" },
                        { "name": "includeperiodendtransactions", "value": "F" }
                    ],
                    filters: filters,
                    columns: [

                        search.createColumn({ name: "custcol_swc_pr_origin_sku", label: "成品SKU" }),
                        // 国家
                        search.createColumn({ name: "custcol_swc_country_code", label: "国家" }),
                        // 仓库类型
                        search.createColumn({ name: "custcol_swc_loc_type", label: "仓库类型" }),
                        // 区域
                        search.createColumn({ name: "custcol_swc_us_districts", label: "区域" }),
                        // 采购订单内部ID
                        search.createColumn({ name: "internalid", label: "id" }),
                        search.createColumn({ name: "custcol_swc_store", label: "店铺" }),
                        search.createColumn({ name: "quantity", label: "数量" }),
                        search.createColumn({ name: "custcol_swc_line_no", label: "Line No" }),
                        search.createColumn({
                            name: "custitem_swc_total_volume",
                            join: "CUSTCOL_SWC_PR_ORIGIN_SKU",
                            label: "单个体积"
                        }),
                        search.createColumn({
                            name: "custitem_swc_total_volume",
                            join: "CUSTCOL_SWC_PR_ORIGIN_SKU",
                            label: "总体积（CBM）"
                        }),
                        search.createColumn({
                            name: "custitem_swc_total_net_weight",
                            join: "CUSTCOL_SWC_PR_ORIGIN_SKU",
                            label: "总净重（G）"
                        }),
                        search.createColumn({
                            name: "custitem_swc_total_gross_weight",
                            join: "CUSTCOL_SWC_PR_ORIGIN_SKU",
                            label: "总毛重（G）"
                        }),
                        //swr 2026/03/16
                        search.createColumn({
                            name: "type",
                            join: "CUSTCOL_SWC_PR_ORIGIN_SKU",
                            label: "类型"
                        }),
                        //swr 2026/03/16
                        search.createColumn({name: "custcol_swc_including_tax_amt", label: "含税金额"})
                    ]
                });

                var items = {};

                var searchObj = getAllResults(purchaseorderSearchObj);
                log.audit('WL_PLAN_MR_PO_SEARCH_RESULT', {
                    resultCount: searchObj ? searchObj.length : 0
                });
                for (let i = 0; i < searchObj.length; i++) {

                    var item = searchObj[i].getValue({
                        name: "custcol_swc_pr_origin_sku",
                        label: "成品SKU"
                    });

                    //swr 2026/03/16
                    var item_type = searchObj[i].getValue({
                        name: "type",
                        join: "CUSTCOL_SWC_PR_ORIGIN_SKU",
                        label: "类型"
                    });
                    //swr 2026/03/16

                    var country_code = searchObj[i].getValue({
                        name: "custcol_swc_country_code",
                        label: "国家"
                    });

                    var loc_type = searchObj[i].getValue({
                        name: "custcol_swc_loc_type",
                        label: "仓库类型"
                    });

                    var us_districts = searchObj[i].getValue({
                        name: "custcol_swc_us_districts",
                        label: "区域"
                    });

                    var id = searchObj[i].getValue({
                        name: "internalid",
                        label: "id"
                    });

                    var store = searchObj[i].getValue({
                        name: "custcol_swc_store",
                        label: "店铺"
                    });

                    var qty = searchObj[i].getValue({
                        name: "quantity",
                        label: "数量"
                    });

                    var lineId = searchObj[i].getValue({
                        name: "custcol_swc_line_no",
                        label: "Line No"
                    });

                    // 单个体积
                    var single_volume = searchObj[i].getValue({
                        name: "custitem_swc_total_volume",
                        join: "CUSTCOL_SWC_PR_ORIGIN_SKU",
                        label: "单个体积"
                    });

                    // 总体积
                    var total_volume = searchObj[i].getValue({
                        name: "custitem_swc_total_volume",
                        join: "CUSTCOL_SWC_PR_ORIGIN_SKU",
                        label: "总体积（CBM）"
                    });

                    // 总净重
                    var total_net_weight = searchObj[i].getValue({
                        name: "custitem_swc_total_net_weight",
                        join: "CUSTCOL_SWC_PR_ORIGIN_SKU",
                        label: "总净重（G）"
                    });

                    // 总毛重
                    var total_gross_weight = searchObj[i].getValue({
                        name: "custitem_swc_total_gross_weight",
                        join: "CUSTCOL_SWC_PR_ORIGIN_SKU",
                        label: "总毛重（G）"
                    });

                    var total_rate = searchObj[i].getValue({name: "custcol_swc_including_tax_amt", label: "含税金额"});

                    var key = [
                        String(item),
                        String(country_code),
                        String(loc_type),
                        String(us_districts),
                        String(id)
                    ].join('|');


                    if (items.hasOwnProperty(key)) {
                        items[key].push({
                            gys: store,
                            qty: qty,
                            数量: qty,
                            lineId: lineId,
                            single_volume: single_volume,
                            total_volume: total_volume,
                            total_net_weight: total_net_weight,
                            total_gross_weight: total_gross_weight,
                            total_rate: total_rate,
                            item_type: item_type,
                            item_Type: item_type
                        });
                    } else {
                        items[key] = [];
                        items[key].push({
                            gys: store,
                            qty: qty,
                            数量: qty,
                            lineId: lineId,
                            single_volume: single_volume,
                            total_volume: total_volume,
                            total_net_weight: total_net_weight,
                            total_gross_weight: total_gross_weight,
                            total_rate: total_rate,
                            item_type: item_type,
                            item_Type: item_type
                        });
                    }
                }
                log.audit('WL_PLAN_MR_PO_KEY_SUMMARY', {
                    keyCount: Object.keys(items).length,
                    sampleKeys: Object.keys(items).slice(0, 20)
                });

                var actual_cabinet = search.lookupFields({ type: 'customrecord_swc_actual_cabinet_detail', id: pgids, columns: ['custrecord_swc_acd_actual_cabinet'] });
                log.audit('WL_PLAN_MR_ACTUAL_CABINET_LOOKUP', {
                    pgids: pgids,
                    actualCabinet: actual_cabinet
                });

                var newRecord = record.create({type: 'customrecord_swc_wl_plan_order'});
                var zspgSum = 0;

                newRecord.setValue({ fieldId: 'custrecord_swc_wl_actual_cabinet', value: actual_cabinet['custrecord_swc_acd_actual_cabinet'][0].value })
                newRecord.setValue({ fieldId: 'custrecord_swc_wl_od', value: values[0].zt })
                newRecord.setValue({ fieldId: 'custrecord_swc_wl_po_zt', value: values[0].subsidiary })

                // TODO 作业内容，load 真实排柜数据 。内部ID：value: actual_cabinet['custrecord_swc_acd_actual_cabinet'][0].value   2025-01-28 swr

                // 1.load真实排柜头部字段，set当前对应字段中
                if (actual_cabinet['custrecord_swc_acd_actual_cabinet'][0].value) {
                    var actualCabinetRec = record.load({
                        type: 'customrecord_swc_actual_cabinet',
                        id: actual_cabinet['custrecord_swc_acd_actual_cabinet'][0].value,
                        isDynamic: true
                    });
                    //真实排柜信息
                    var actualCabinetObj = {
                        "custrecord_swc_md_location": actualCabinetRec.getValue({fieldId:"custrecord_swc_pg_md_location"}),//目的仓仓库代码
                        "custrecord_swc_shipment_id": actualCabinetRec.getValue({fieldId:"custrecord_swc_pg_shipment_id"}),//Shipment id
                        "custrecord_swc_hw_lc_number": actualCabinetRec.getValue({fieldId:"custrecord_swc__pg_hw_lc_number"}),//海外仓入库单号
                        "custrecord_swc_cg_main_order_number": actualCabinetRec.getValue({fieldId:"custrecord_swc_pg_main_order_n"}),//CG主单号
                        "custrecord_swc_wl_container_number": actualCabinetRec.getValue({fieldId:"custrecord_swc_pg_container_number"}),//集装箱箱号
                        "custrecord_swc_delivery_method": actualCabinetRec.getValue({fieldId:"custrecord_swc_pg_delivery_method"}),//交货方式
                        "custrecord_swc_estimated_time_of_arrival": actualCabinetRec.getText({fieldId:"custrecord_swc_pg_estimated_time_of_arri"}),//预计到达时间
                        "custrecord_swc_wl_trasfer_way": actualCabinetRec.getValue({fieldId:"custrecord_swc_mode_of_transportation"}),//运输方式
                        "custrecord_swc_tariff_type": actualCabinetRec.getValue({fieldId:"custrecord_swc_pg_type_of_tariff"}),//关税类型
                        "custrecord_swc_push_jijia": actualCabinetRec.getValue({fieldId:"custrecord_swc_push_accumulation_uccess"}),//推送积加成功
                        "custrecord_swc_push_jijia_info": actualCabinetRec.getValue({fieldId:"custrecord_swc_pg_push_jijia_information"}),//推送积加信息
                        "custrecord_product_attributes": actualCabinetRec.getValue({fieldId:"custrecord_product_pg_attributes"}),//4pX 产品属性
                        "custrecord_swc_reservation_number": actualCabinetRec.getValue({fieldId:"custrecord_pg_reservation_number"}),//无忧达 预约单号
                        "custrecord_swc_ext_cargo_type": actualCabinetRec.getValue({fieldId:"custrecord_pg_type_of_goods"}),//无忧达 货物类型
                        "custrecord_swc_receiving_shipping_type": actualCabinetRec.getValue({fieldId:"custrecordpg_wuyouda_shipping_method"}),//无忧达 无忧达运输方式
                        "custrecord_swc_first_leg_type": actualCabinetRec.getValue({fieldId:"custrecord_swc_pg_first_leg_type"}),//无忧达 自发头程类型
                        "custrecord_swc_stacking_flag": actualCabinetRec.getValue({fieldId:"custrecord_swc_pg_stacking_flag"}),//无忧达 是否需要上架
                        "custrecord_swc_receiving_type": actualCabinetRec.getValue({fieldId:"custrecord_swc_pg_warehouse_receipt_type"}),//易仓  入库单类型
                        "custrecord_swc_tracking_no": actualCabinetRec.getValue({fieldId:"custrecord_swc_pg_tracking_number"}),//易仓  跟踪号
                        "custrecord_swc_ydy_shipping_type": actualCabinetRec.getValue({fieldId:"custrecord_swc_pg_cloud_first_leg_ship"}),//易达云 易达云头程运输方式
                        "custrecord_swc_ydy_storage_type": actualCabinetRec.getValue({fieldId:"custrecord_swc_zspgd_nbound_type"}),//易达云 入库类型1
                        "custrecord_swc_ydy_start_loc": actualCabinetRec.getValue({fieldId:"custrecord_swc_yida_cloud_origin_warehou"}),//易达云 易达云始发仓

                        "custrecord_swc_wl_rm_sta_gk": actualCabinetRec.getValue({fieldId:"custrecord_swc_zspgd_qyg"}),//起运港
                        "custrecord_swc_wl_md_lc": actualCabinetRec.getValue({fieldId:"custrecord_swc_zspgd_mdg"}),//目的港
                        "custrecord_swc_wl_itemno": actualCabinetRec.getText({fieldId:"custrecord_swc_ac_itemno"}),//真实排柜时间
                        "custrecord_swc_wl_spo": actualCabinetRec.getValue({fieldId:"custrecord_swc_zspgd_spo"}),//SPO
                        "custrecord_swc_wl_booking_number": actualCabinetRec.getValue({fieldId:"custrecord_swc_zspgd_dch"}),//订舱号
                        "custrecord_swc_good_timing": actualCabinetRec.getText({fieldId:"custrecord_swc_zspgd_hhtime"}),//货好时间
                        // "custrecord23": actualCabinetRec.getValue({fieldId:"custrecord_swc_actual_cabinet_num"}),//实际柜号
                        "custrecord_swc_wl_zg_size": actualCabinetRec.getValue({fieldId:"custrecord_swc_pg_size"}),//货柜尺寸
                        "custrecord_swc_wl_loading_date": actualCabinetRec.getText({fieldId:"custrecord_swc_ac_loading_date"}),//装柜日期
                    }

                    //赋值物流发运单
                    for (var actKey in actualCabinetObj) {
                        var actDetail = actualCabinetObj[actKey];
                        if (actDetail) {
                            if (actKey == "custrecord_swc_estimated_time_of_arrival" || actKey == "custrecord_swc_wl_itemno" || actKey == "custrecord_swc_good_timing"
                                || actKey == "custrecord_swc_wl_loading_date") {
                                newRecord.setText({ fieldId: actKey, text: actDetail});
                            }
                            else {
                                newRecord.setValue({ fieldId: actKey, value: actDetail});
                            }
                        }
                    }
                }




                //装箱单 明细行 数量
                var packObj = {};
                var subListFieldMapping = fieldMapping();

                var totalNetWeight = 0;
                var totalGrossWeight = 0;
                var totalVolume = 0;
                var tatalNewRate = 0;

                var acdSearch = getAcdSearchValue(pgids);
                const subId = 'recmachcustrecord_swc_wl_plan_order_id';
                var lineId = 0;
                log.debug('acdSearch', acdSearch.length);
                log.audit('WL_PLAN_MR_ACD_SEARCH_RESULT', {
                    pgids: pgids,
                    resultCount: acdSearch ? acdSearch.length : 0
                });
                if(acdSearch && acdSearch.length > 0){
                    for (let z = 0; z < acdSearch.length; z++) {
                        var data = acdSearch[z];
                        var item2 = data.getValue('custrecord_swc_acd_item');
                        var acd_country2 = data.getValue('custrecord_swc_acd_country');
                        var warehouse_type2 = data.getValue('custrecord_swc_acd_warehouse_type');
                        var region2 = data.getValue('custrecord_swc_acd_region');
                        var po_id2 = data.getValue('custrecord_swc_acd_po_id');
                        var acId = data.getValue('custrecord_swc_acd_actual_cabinet');

                        var itemId = data.getValue('custrecord_swc_acd_item_o');
                        var mainSku = data.getValue('custrecord_swc_acd_main_sku');

                        // var d_num_ca = data.getValue('custrecord_swc_wl_d_num_ca');

                        var ecId = data.getValue({
                            name: "custrecord_swc_ecd_estimated_cabinet",
                            join: "CUSTRECORD_SWC_ACD_ESTIMATED_CABINE_NO",
                            label: "预排柜单"
                        });

                        var key2 = [
                            String(item2),
                            String(acd_country2),
                            String(warehouse_type2),
                            String(region2),
                            String(po_id2)
                        ].join('|');

                        log.debug('key2', key2);
                        log.audit('WL_PLAN_MR_DETAIL_MATCH_CHECK', {
                            acdIndex: z,
                            actualCabinetDetailId: data.getValue('internalid'),
                            key2: key2,
                            hasPoMatch: items.hasOwnProperty(key2),
                            item2: item2,
                            country: acd_country2,
                            warehouseType: warehouse_type2,
                            region: region2,
                            poId: po_id2,
                            poKeyCount: Object.keys(items).length,
                            samplePoKeys: Object.keys(items).slice(0, 10)
                        });

                        if(items.hasOwnProperty(key2)){

                            var dataLine = items[key2];

                            var orderParam = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_wl_plan_order_ids' });
                            var orderArr = JSON.parse(orderParam || '[]');
                            var qtyMap = {};
                            for (var k = 0; k < orderArr.length; k++) {
                                qtyMap[String(orderArr[k].main_internalid)] = {
                                    y: Number(orderArr[k].superior_qty_wl || 0),
                                    l: Number(orderArr[k].good_qty_wl || 0)
                                };
                            }

                            var currentPgid = String(data.getValue('internalid') || (pgids && pgids.length ? pgids[0] : ''));
                            var q = qtyMap[currentPgid] || { y: 0, l: 0 };
                            var y = q.y;
                            var l = q.l;

                            outputByPgid[currentPgid] = { y: Number(y || 0), l: Number(l || 0) };
                            var n = dataLine.length;

                            y = Number(y || 0);
                            l = Number(l || 0);

                            packObj[currentPgid] = {
                                number: y + l
                            }

                            function n0(v){ return Number(v || 0); }

                            // 关键：统一保留两位小数，并且输出为 Number（避免出现 2.1015）
                            // 说明：toFixed 返回 string，所以要再 Number(...) 一次
                            function r2(n){
                                return Number(n0(n).toFixed(2));
                            }

                            var lineQtys = [];
                            var totalLineQty = 0;
                            for (var qtyIndex = 0; qtyIndex < n; qtyIndex++) {
                                var currentLineQty = n0(dataLine[qtyIndex].qty);
                                lineQtys.push(currentLineQty);
                                totalLineQty += currentLineQty;
                            }

                            // 先按采购订单行数量占比，分配本次发运总数到每一行。
                            // 再在“每行本次发运数量”基础上分配优等品，良品取剩余值，
                            // 从而保证：每行优等品 + 良品 <= 该 PO 行数量。
                            var shippedSplit = splitByProportion(lineQtys, y + l, totalLineQty);
                            var ySplit = splitByProportion(shippedSplit, y, y + l);
                            var lSplit = [];
                            for (var splitIndex = 0; splitIndex < n; splitIndex++) {
                                lSplit[splitIndex] = n0(shippedSplit[splitIndex]) - n0(ySplit[splitIndex]);
                            }
                            log.audit('WL_PLAN_MR_QTY_SPLIT', {
                                actualCabinetDetailId: currentPgid,
                                key2: key2,
                                dataLineCount: n,
                                requestedSuperiorQty: y,
                                requestedGoodQty: l,
                                requestedTotalQty: y + l,
                                poLineQtys: lineQtys,
                                totalLineQty: totalLineQty,
                                shippedSplit: shippedSplit,
                                superiorSplit: ySplit,
                                goodSplit: lSplit
                            });


                            for (var j = 0; j < n; j++) {

                                var qtyexcellent = n0(ySplit[j]);
                                var qtyfine = n0(lSplit[j]);

                                // 下面这些单件值（来自 item join）
                                var unitVol   = n0(dataLine[j].total_volume);       // 单件体积（CBM）
                                var unitNet   = n0(dataLine[j].total_net_weight);   // 单件净重（G）
                                var unitGross = n0(dataLine[j].total_gross_weight); // 单件毛重（G）

                                // 物流发运明细金额直接取来源行单价 rate，不做其他运算。
                                var unitRate = dataLine[j].total_rate;



                                // 优等品：数量为0不生成明细
                                if (qtyexcellent > 0) {
                                    zspgSum = zspgSum + qtyexcellent;

                                    // 体积/净重/毛重：保留两位
                                    var volExcellent   = r2(unitVol * qtyexcellent);
                                    var netExcellent   = r2(unitNet * qtyexcellent);
                                    var grossExcellent = r2(unitGross * qtyexcellent);
                                    for (const subListFieldMappingKey in subListFieldMapping) {
                                        if (subListFieldMapping[subListFieldMappingKey]) {
                                            var mappingSourceFieldId = subListFieldMapping[subListFieldMappingKey];
                                            var mappingFieldValue = data.getValue(mappingSourceFieldId);
                                            if (subListFieldMappingKey === 'custrecord_swc_wl_d_product_name') {
                                                log.audit('WL_PLAN_DETAIL_PRODUCT_NAME_MAPPING', {
                                                    明细类型: '优品',
                                                    物流发运单ID: newRecord.id || '',
                                                    物流发运明细行号: lineId,
                                                    真实排柜明细ID: data.getValue('internalid') || '',
                                                    源字段ID: mappingSourceFieldId,
                                                    源字段值: mappingFieldValue,
                                                    目标字段ID: subListFieldMappingKey
                                                });
                                            }
                                            if (subListFieldMapping[subListFieldMappingKey] == 'custrecord_swc_acd_volume') {
                                                newRecord.setSublistValue({
                                                    sublistId: subId,
                                                    fieldId: subListFieldMappingKey,
                                                    line: lineId,
                                                    value: mappingFieldValue || 0
                                                });
                                            } else {
                                                newRecord.setSublistValue({
                                                    sublistId: subId,
                                                    fieldId: subListFieldMappingKey,
                                                    line: lineId,
                                                    value: mappingFieldValue || ' '
                                                });
                                            }
                                        }
                                    }

                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: lineId, value: qtyexcellent });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_customer',        line: lineId, value: dataLine[j].gys });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_po_qty',          line: lineId, value: n0(dataLine[j].qty) });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_actual_cabinet',  line: lineId, value: Number(currentPgid) });

                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_shipped_qty',     line: lineId, value: qtyexcellent });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_un_shipped_qty',  line: lineId, value: n0(dataLine[j].qty) - qtyexcellent });

                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_total_volume',       line: lineId, value: volExcellent });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_total_net_weight',   line: lineId, value: netExcellent });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_total_gross_weight', line: lineId, value: grossExcellent });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_amount_total', line: lineId, value: unitRate });

                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_actual_cabinet_zs', line: lineId, value: acId });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_item', line: lineId, value: itemId });

                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_main_sku', line: lineId, value: mainSku });

                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_ca_num_o', line: lineId, value: ecId });

                                    // newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_zs_qty_ck', line: lineId, value: d_num_ca });

                                    if (dataLine[j].item_Type != 'Assembly') {
                                        newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_if_assembly', line: lineId, value: true });
                                    }


                                    // 累加也用 r2，避免浮点累积后出现 2.1015
                                    totalVolume      = r2(totalVolume + volExcellent);
                                    totalNetWeight   = r2(totalNetWeight + netExcellent);
                                    totalGrossWeight = r2(totalGrossWeight + grossExcellent);
                                    tatalNewRate = r2(tatalNewRate + n0(unitRate));

                                    lineId++;
                                }

                                // 良品：数量为0不生成明细
                                if (qtyfine > 0) {
                                    zspgSum = zspgSum + qtyfine;
                                    var volFine   = r2(unitVol * qtyfine);
                                    var netFine   = r2(unitNet * qtyfine);
                                    var grossFine = r2(unitGross * qtyfine);
                                    for (const subListFieldMappingKey in subListFieldMapping) {
                                        if (subListFieldMapping[subListFieldMappingKey]) {
                                            var mappingSourceFieldId = subListFieldMapping[subListFieldMappingKey];
                                            var mappingFieldValue = data.getValue(mappingSourceFieldId);
                                            if (subListFieldMappingKey === 'custrecord_swc_wl_d_product_name') {
                                                log.audit('WL_PLAN_DETAIL_PRODUCT_NAME_MAPPING', {
                                                    明细类型: '良品',
                                                    物流发运单ID: newRecord.id || '',
                                                    物流发运明细行号: lineId,
                                                    真实排柜明细ID: data.getValue('internalid') || '',
                                                    源字段ID: mappingSourceFieldId,
                                                    源字段值: mappingFieldValue,
                                                    目标字段ID: subListFieldMappingKey
                                                });
                                            }
                                            if (subListFieldMapping[subListFieldMappingKey] == 'custrecord_swc_acd_volume') {
                                                newRecord.setSublistValue({
                                                    sublistId: subId,
                                                    fieldId: subListFieldMappingKey,
                                                    line: lineId,
                                                    value: mappingFieldValue || 0
                                                });
                                            } else {
                                                newRecord.setSublistValue({
                                                    sublistId: subId,
                                                    fieldId: subListFieldMappingKey,
                                                    line: lineId,
                                                    value: mappingFieldValue || ' '
                                                });
                                            }
                                        }
                                    }

                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_good_qty_z',      line: lineId, value: qtyfine });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_customer',        line: lineId, value: dataLine[j].gys });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_po_qty',          line: lineId, value: n0(dataLine[j].qty) });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_actual_cabinet',  line: lineId, value: Number(currentPgid) });

                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_shipped_qty',     line: lineId, value: qtyfine });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_un_shipped_qty',  line: lineId, value: n0(dataLine[j].qty) - qtyfine });

                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_total_volume',       line: lineId, value: volFine });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_total_net_weight',   line: lineId, value: netFine });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_total_gross_weight', line: lineId, value: grossFine });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_amount_total', line: lineId, value: unitRate });

                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_actual_cabinet_zs', line: lineId, value: acId });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_item', line: lineId, value: itemId });

                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_main_sku', line: lineId, value: mainSku });
                                    newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_ca_num_o', line: lineId, value: ecId });

                                    if (dataLine[j].item_Type != 'Assembly') {
                                        newRecord.setSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_wl_d_if_assembly', line: lineId, value: true });
                                    }

                                    totalVolume      = r2(totalVolume + volFine);
                                    totalNetWeight   = r2(totalNetWeight + netFine);
                                    totalGrossWeight = r2(totalGrossWeight + grossFine);
                                    tatalNewRate = r2(tatalNewRate + n0(unitRate));

                                    lineId++;
                                }
                            }
                        } else {
                            log.error('WL_PLAN_MR_NO_PO_MATCH', {
                                actualCabinetDetailId: data.getValue('internalid'),
                                key2: key2,
                                reason: '真实排柜明细 key 在采购订单检索结果 items 中不存在，后续不会生成物流发运明细',
                                expectedKeyParts: {
                                    item: item2,
                                    country: acd_country2,
                                    warehouseType: warehouse_type2,
                                    region: region2,
                                    poId: po_id2
                                },
                                samplePoKeys: Object.keys(items).slice(0, 20)
                            });
                        }
                    }
                }

                //复制装箱明细
                log.audit('packObj',packObj);
                if (actual_cabinet['custrecord_swc_acd_actual_cabinet'][0].value) {
                    //获取装箱单数据
                    let actLineCount = actualCabinetRec.getLineCount({
                        sublistId: 'recmachcustrecord_swc_acd_actual_cabinet'
                    });
                    log.audit('actLineCount',actLineCount);
                    let actLineObj = {};
                    for (let i = 0;i < actLineCount;i++) {
                        actualCabinetRec.selectLine({
                            sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                            line: i
                        });
                        //真实排柜行id
                        let actLineId = actualCabinetRec.getCurrentSublistValue({
                            sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                            fieldId: 'id'
                        });
                        //主要部件
                        let actLineMain = actualCabinetRec.getCurrentSublistValue({
                            sublistId: 'recmachcustrecord_swc_acd_actual_cabinet',
                            fieldId: 'custrecord_swc_acd_main_sku'
                        });

                        if (actLineId in packObj) {
                            let actLineQuantity = packObj[actLineId].number;
                            if (pgids.indexOf(actLineId) !== -1 && actLineMain && actLineQuantity > 0) {
                                actLineObj[actLineId] = {
                                    number: actLineQuantity
                                };
                            }
                        }
                    }

                    log.audit('actLineObj',actLineObj);
                    //处理真实排柜 装箱明细

                    let actPackCount = actualCabinetRec.getLineCount({
                        sublistId: 'recmachcustrecord_swc_pg_zspgdh'
                    });
                    log.audit('actPackCount',actPackCount);
                    let actPackData = [];
                    for (let i = 0;i < actPackCount;i++) {
                        actualCabinetRec.selectLine({
                            sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                            line: i
                        });
                        //真实排柜行id
                        let actLineId = actualCabinetRec.getCurrentSublistValue({
                            sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                            fieldId: 'custrecord_swc_pg_mx_id'
                        });
                        //是否发运
                        let actLineMain = actualCabinetRec.getCurrentSublistValue({
                            sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                            fieldId: 'custrecord_swc_pg_wl_flag'
                        });
                        //判断是否为本次发运行 且 是否已经发运
                        if (actLineId in actLineObj && !actLineMain) {
                            //将是否发运设置为已发运
                            actualCabinetRec.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                fieldId: 'custrecord_swc_pg_wl_flag',
                                value: true
                            });

                            //判断数量是否还有
                            actLineObj[actLineId].number = actLineObj[actLineId].number - 1;
                            log.audit('actLineObj[actLineId].number',actLineObj[actLineId].number);
                            if (actLineObj[actLineId].number == 0) {
                                delete actLineObj[actLineId];
                            }

                            //获取 发运装箱明细数据
                            //序号
                            let xhid = actualCabinetRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                fieldId: 'custrecord_swc_pg_id'
                            });
                            //产品名称
                            let cpmc = actualCabinetRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                fieldId: 'custrecord_swc_pg_cpmc'
                            });
                            //供应商
                            let gys = actualCabinetRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                fieldId: 'custrecord_swc_pg_gys'
                            });
                            //SKU
                            let sku = actualCabinetRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                fieldId: 'custrecord_swc_pg_sku'
                            });
                            //规格
                            let gg = actualCabinetRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                fieldId: 'custrecord_swc_pg_gg'
                            });
                            //箱号
                            let xh = actualCabinetRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                fieldId: 'custrecord_swc_pg_xh'
                            });
                            //数量
                            let sl = actualCabinetRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                fieldId: 'custrecord_swc_pg_sl'
                            });
                            //箱数
                            let xs = actualCabinetRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                fieldId: 'custrecord_swc_pg_xs'
                            });
                            //纸箱尺寸
                            let zxcc = actualCabinetRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                fieldId: 'custrecord_swc_pg_zxcc'
                            });
                            //包装体积
                            let bztj = actualCabinetRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                fieldId: 'custrecord_swc_pg_bztj'
                            });
                            //净重
                            let jz = actualCabinetRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                fieldId: 'custrecord_swc_pg_jz'
                            });
                            //毛重
                            let mz = actualCabinetRec.getCurrentSublistValue({
                                sublistId: 'recmachcustrecord_swc_pg_zspgdh',
                                fieldId: 'custrecord_swc_pg_mz'
                            });
                            actPackData.push({
                                xhid: xhid,
                                cpmc: cpmc,
                                gys: gys,
                                sku: sku,
                                gg: gg,
                                xh: xh,
                                sl: sl,
                                xs: xs,
                                zxcc: zxcc,
                                bztj: bztj,
                                jz: jz,
                                mz: mz
                            });
                        }
                        actualCabinetRec.commitLine({sublistId: 'recmachcustrecord_swc_pg_zspgdh'});
                    }

                    log.audit('装箱：actPackData',actPackData);
                    log.audit('装箱数量',actPackData.length);
                    //设置物流发运装箱明细 newRecord
                    if (actPackData.length > 0) {
                        for (let i = 0; i < actPackData.length; i++) {
                            let packLineObj = actPackData[i];
                            // newRecord.selectLine({
                            //     sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                            //     line: i
                            // });
                            //序号
                            if(packLineObj.xhid) newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                                fieldId: 'custrecord_swc_wl_id',
                                value: packLineObj.xhid,
                                line: i
                            });
                            //供应商
                            if(packLineObj.gys) newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                                fieldId: 'custrecord_swc_wl_gys',
                                value: packLineObj.gys,
                                line: i
                            });
                            //sku
                            if(packLineObj.sku) newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                                fieldId: 'custrecord_swc_wl_sku',
                                value: packLineObj.sku,
                                line: i
                            });
                            //产品名称
                            if(packLineObj.cpmc) newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                                fieldId: 'custrecord_swc_wl_cpmc',
                                value: packLineObj.cpmc,
                                line: i
                            });
                            //箱号
                            if(packLineObj.xh) newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                                fieldId: 'custrecord_swc_wl_xh',
                                value: packLineObj.xh,
                                line: i
                            });
                            //箱数
                            if(packLineObj.xs) newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                                fieldId: 'custrecord_swc_wl_xs',
                                value: packLineObj.xs,
                                line: i
                            });
                            //数量
                            if(packLineObj.sl) newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                                fieldId: 'custrecord_swc_wl_sl',
                                value: packLineObj.sl,
                                line: i
                            });
                            //纸箱尺寸
                            if(packLineObj.zxcc) newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                                fieldId: 'custrecord_swc_wl_zxcc',
                                value: packLineObj.zxcc,
                                line: i
                            });
                            //包装体积
                            if(packLineObj.bztj) newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                                fieldId: 'custrecord_swc_wl_bztj',
                                value: packLineObj.bztj,
                                line: i
                            });
                            //规格
                            if(packLineObj.gg) newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                                fieldId: 'custrecord_swc_wl_gg',
                                value: packLineObj.gg,
                                line: i
                            });
                            //净重
                            if(packLineObj.jz) newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                                fieldId: 'custrecord_swc_wl_jz',
                                value: packLineObj.jz,
                                line: i
                            });
                            //毛重
                            if(packLineObj.mz) newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                                fieldId: 'custrecord_swc_wl_mz',
                                value: packLineObj.mz,
                                line: i
                            });
                            // //总净重
                            // if(packLineObj.xhid) newRecord.setCurrentSublistValue({
                            //     sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                            //     fieldId: 'custrecord_swc_wl_zjz',
                            //     value: packLineObj.xhid
                            // });
                            // //总毛重
                            // if(packLineObj.xhid) newRecord.setCurrentSublistValue({
                            //     sublistId: 'recmachcustrecord_swc_wl_wlfydh',
                            //     fieldId: 'custrecord_swc_wl_zmz',
                            //     value: packLineObj.xhid
                            // });
                            // newRecord.commitLine({sublistId: 'recmachcustrecord_swc_wl_wlfydh'});
                        }
                    }
                }

                newRecord.setValue({ fieldId: 'custrecord_swc_wl_net_weight', value: totalNetWeight })
                newRecord.setValue({ fieldId: 'custrecord_swc_wl_gross_weight_total', value: totalGrossWeight })
                newRecord.setValue({ fieldId: 'custrecord_swc_wl_total_volume', value: totalVolume })
                newRecord.setValue({ fieldId: 'custrecord_swc_wl_amount_total', value: tatalNewRate })

                var feeSubId = 'recmachcustrecord_swc_wl_po_fee_wl';
                if(acdSearch && acdSearch.length > 0){
                    var poFeeLineMap = {};
                    var poFeeLineList = [];

                    for (var feeIdx = 0; feeIdx < acdSearch.length; feeIdx++) {
                        var feeDataRaw = acdSearch[feeIdx];
                        var poId = feeDataRaw.getValue('custrecord_swc_acd_po_id') || '';
                        var vendorId = feeDataRaw.getValue('custrecord_swc_acd_vendor') || '';
                        var feeKey = String(poId) + '_' + String(vendorId);

                        if (!poId || !vendorId) continue;
                        if (poFeeLineMap[feeKey]) continue;

                        poFeeLineMap[feeKey] = true;
                        poFeeLineList.push({
                            poId: poId,
                            vendorId: vendorId
                        });
                    }

                    for (var feeLine = 0; feeLine < poFeeLineList.length; feeLine++) {
                        var feeData = poFeeLineList[feeLine];
                        newRecord.setSublistValue({
                            sublistId: feeSubId,
                            fieldId: 'custrecord_swc_wl_po_fee_id',
                            line: feeLine,
                            value: feeData.poId,
                        });

                        newRecord.setSublistValue({
                            sublistId: feeSubId,
                            fieldId: 'custrecord_swc_wl_po_fee_ven',
                            line: feeLine,
                            value: feeData.vendorId,
                        });
                    }
                }

                // 头程费用信息录入
                var legCostSubID = 'recmachcustrecord_swc_wl_first_leg_cost_id';
                // var customrecord_swc_service_quotation_detaiSearchObj = search.create({
                //     type: "customrecord_swc_service_quotation_detai",
                //     filters:
                //         [
                //             ["custrecord_swc_lpd_lp.custrecord_swc_lp_start_date","onorbefore","today"],
                //             "AND",
                //             ["custrecord_swc_lpd_lp.custrecord_swc_lp_end_date","onorafter","today"],
                //         ],
                //     columns:
                //         [
                //             search.createColumn({name: "custrecord_swc_lp_cost_medium", label: "费用类型（中类）"}),
                //             search.createColumn({name: "custrecord_swc_lp_rm_cost_s", label: "费用类型（小类）"}),
                //         ]
                // });

                const customrecord_swc_rule_mapping_table_detailedSearchObj = search.create({
                    type: "customrecord_swc_rule_mapping_table_deta",
                    filters:
                        [
                        ],
                    columns:
                        [
                            search.createColumn({name: "custrecord_swc_rm_cost_medium", label: "费用项（中类）"}),
                            search.createColumn({name: "custrecord_swc_rm_cost_s", label: "费用项（小类）"}),
                            search.createColumn({name: "custrecord_swc_carrier", label: "承运商"}),
                            search.createColumn({name: "custrecord_swc_rm_allocation_logic", label: "分摊规则"})
                        ]
                });
                var quotation_detaiSearchObj = getAllResults(customrecord_swc_rule_mapping_table_detailedSearchObj);
                if(quotation_detaiSearchObj && quotation_detaiSearchObj.length > 0){
                    // 我先读取当前物流发运单上的运抵国和目的仓，后面在“入库操作费(101)”场景下做承运商覆盖。
                    var wlCountyLsit = newRecord.getValue({ fieldId: 'custrecord_swc_wl_county_lsit' });
                    var wlMdLocation = newRecord.getValue({ fieldId: 'custrecord_swc_md_location' });
                    var legCarrierSummary = [];
                    for (let legLine = 0; legLine < quotation_detaiSearchObj.length; legLine++) {
                        var legData = quotation_detaiSearchObj[legLine];
                        var feeTypeZ = legData.getValue('custrecord_swc_rm_cost_medium');
                        var feeTypeX = legData.id;
                        var carrierId = legData.getValue('custrecord_swc_carrier');
                        var ruleCarrierId = carrierId;
                        var carrierSource = '规则明细.custrecord_swc_carrier';

                        // 中类
                        newRecord.setSublistValue({
                            sublistId: legCostSubID,
                            fieldId: 'custrecord_swc_flc_fee_type_z',
                            line: legLine,
                            value: feeTypeZ,
                        });

                        // 小类
                        // newRecord.setSublistValue({
                        //     sublistId: legCostSubID,
                        //     fieldId: 'custrecord_swc_wl_flc_fee_type_x',
                        //     line: legLine,
                        //     value: legData.getValue('custrecord_swc_lp_rm_cost_s'),
                        // });
                        newRecord.setSublistValue({
                            sublistId: legCostSubID,
                            fieldId: 'custrecord_swc_wl_flc_fee_type_x',
                            line: legLine,
                            value: feeTypeX,
                        });

                        // 我默认沿用规则明细上的承运商字段。
                        // 但在“入库操作费(101)”且物流发运单已有运抵国时，优先按“运抵国 + 目的仓”去供应商取第一个匹配值。
                        if (String(feeTypeZ) === '101' && wlCountyLsit && wlMdLocation) {
                            var matchedVendorId = getFirstVendorByCountryAndLocation(wlCountyLsit, wlMdLocation);
                            if (matchedVendorId) {
                                carrierId = matchedVendorId;
                                carrierSource = '供应商匹配(运抵国+目的仓)';
                            }
                        }

                        var feeTypeZText = legData.getText('custrecord_swc_rm_cost_medium') || '';
                        var feeTypeXText = legData.getText('custrecord_swc_rm_cost_s') || '';
                        var ruleCarrierName = legData.getText('custrecord_swc_carrier') || '';
                        var finalCarrierName = carrierId ? (lookupFieldText('vendor', carrierId, 'entityid') || lookupFieldText('vendor', carrierId, 'companyname') || '') : '';

                        if (carrierId) {
                            try {
                                newRecord.setSublistValue({
                                    sublistId: legCostSubID,
                                    fieldId: 'custrecord_swc_wl_flc_location',
                                    line: legLine,
                                    value: carrierId
                                });
                            } catch (carrierSetError) {
                                log.error('WL_PLAN_FIRST_LEG_CARRIER_SET_ERROR', {
                                    物流发运单ID: newRecord.id || '',
                                    行号: legLine + 1,
                                    中类ID: feeTypeZ || '',
                                    中类名称: feeTypeZText,
                                    小类ID: feeTypeX || '',
                                    小类名称: feeTypeXText,
                                    规则承运商ID: ruleCarrierId || '',
                                    规则承运商名称: ruleCarrierName,
                                    最终承运商ID: carrierId || '',
                                    最终承运商名称: finalCarrierName,
                                    承运商来源: carrierSource,
                                    运抵国: wlCountyLsit || '',
                                    目的仓: wlMdLocation || '',
                                    errorName: carrierSetError && carrierSetError.name || '',
                                    errorMessage: carrierSetError && carrierSetError.message || '',
                                    errorStack: carrierSetError && carrierSetError.stack || ''
                                });
                                throw new Error('头程费用信息录入承运商写入失败：第' + (legLine + 1)
                                    + '行，中类【' + (feeTypeZText || feeTypeZ || '') + '】'
                                    + '，小类【' + (feeTypeXText || feeTypeX || '') + '】'
                                    + '，规则承运商【' + (ruleCarrierName || ruleCarrierId || '') + '】'
                                    + '，最终承运商【' + (finalCarrierName || carrierId || '') + '】'
                                    + '，承运商来源【' + carrierSource + '】'
                                    + '，运抵国【' + (wlCountyLsit || '') + '】'
                                    + '，目的仓【' + (wlMdLocation || '') + '】'
                                    + '。原始错误：' + ((carrierSetError && carrierSetError.message) || carrierSetError || ''));
                            }
                        }

                        newRecord.setSublistValue({
                            sublistId: legCostSubID,
                            fieldId: 'custrecord_swc_wl_flc_allocation_rules',
                            line: legLine,
                            value: legData.getValue('custrecord_swc_rm_allocation_logic')
                        });

                        legCarrierSummary.push({
                            行号: legLine + 1,
                            中类ID: feeTypeZ || '',
                            中类名称: feeTypeZText,
                            小类ID: feeTypeX || '',
                            小类名称: feeTypeXText,
                            规则承运商ID: ruleCarrierId || '',
                            规则承运商名称: ruleCarrierName,
                            最终承运商ID: carrierId || '',
                            最终承运商名称: finalCarrierName,
                            承运商来源: carrierSource
                        });
                    }

                    log.audit('WL_PLAN_FIRST_LEG_CARRIER_INIT', {
                        物流发运单ID: newRecord.id || '',
                        运抵国: wlCountyLsit || '',
                        目的仓: wlMdLocation || '',
                        总行数: legCarrierSummary.length,
                        头程费用承运商明细: legCarrierSummary
                    });
                }

                newRecord.setValue({
                    fieldId: 'custrecord_swc_total_actual_shipment_qua',
                    value: zspgSum
                })

                var legCarrierSaveSnapshot = [];
                var legLineCountBeforeSave = newRecord.getLineCount({ sublistId: legCostSubID }) || 0;
                for (var snapIdx = 0; snapIdx < legLineCountBeforeSave; snapIdx++) {
                    var snapFeeTypeZ = newRecord.getSublistValue({
                        sublistId: legCostSubID,
                        fieldId: 'custrecord_swc_flc_fee_type_z',
                        line: snapIdx
                    });
                    var snapFeeTypeX = newRecord.getSublistValue({
                        sublistId: legCostSubID,
                        fieldId: 'custrecord_swc_wl_flc_fee_type_x',
                        line: snapIdx
                    });
                    var snapCarrierId = newRecord.getSublistValue({
                        sublistId: legCostSubID,
                        fieldId: 'custrecord_swc_wl_flc_location',
                        line: snapIdx
                    });
                    legCarrierSaveSnapshot.push({
                        行号: snapIdx + 1,
                        中类ID: snapFeeTypeZ || '',
                        小类ID: snapFeeTypeX || '',
                        承运商ID: snapCarrierId || '',
                        承运商名称: snapCarrierId ? (lookupFieldText('vendor', snapCarrierId, 'entityid') || lookupFieldText('vendor', snapCarrierId, 'companyname') || '') : ''
                    });
                }

                log.audit('WL_PLAN_MR_BEFORE_SAVE', {
                    detailLineCount: lineId,
                    totalActualShipmentQty: zspgSum,
                    totalVolume: totalVolume,
                    totalNetWeight: totalNetWeight,
                    totalGrossWeight: totalGrossWeight,
                    totalRate: tatalNewRate,
                    firstLegCarrierLineCount: legLineCountBeforeSave,
                    firstLegCarrierSnapshot: legCarrierSaveSnapshot,
                    packObj: packObj,
                    outputByPgid: outputByPgid
                });
                var wlPlanOrderId = '';
                try {
                    wlPlanOrderId = newRecord.save({ignoreMandatoryFields: true});
                } catch (saveError) {
                    log.error('WL_PLAN_MR_SAVE_ERROR', {
                        detailLineCount: lineId,
                        totalActualShipmentQty: zspgSum,
                        firstLegCarrierLineCount: legLineCountBeforeSave,
                        firstLegCarrierSnapshot: legCarrierSaveSnapshot,
                        errorName: saveError && saveError.name || '',
                        errorMessage: saveError && saveError.message || '',
                        errorStack: saveError && saveError.stack || ''
                    });
                    throw saveError;
                }
                log.audit('WL_PLAN_MR_SAVE_SUCCESS', {
                    wlPlanOrderId: wlPlanOrderId,
                    detailLineCount: lineId,
                    totalActualShipmentQty: zspgSum
                });
                actualCabinetRec.save();

                for (var k in outputByPgid) {
                    if (outputByPgid.hasOwnProperty(k)) {
                        context.write({
                            key: String(k),
                            value: JSON.stringify({
                                y: Number(outputByPgid[k].y || 0),
                                l: Number(outputByPgid[k].l || 0)
                            })
                        });
                    }
                }

            }catch (e) {
                log.error('WL_PLAN_MR_MAP_ERROR_DETAIL', {
                    name: e && e.name,
                    message: e && e.message,
                    stack: e && e.stack,
                    contextKey: context && context.key,
                    contextValue: context && context.value
                });
            }
        }

        function reduce(context) {
            let reduce_key = context.key;
            let reduce_values = JSON.parse(context.values);

            log.debug('reduce_key', reduce_key);
            log.debug('reduce_values', reduce_values);

            const acd = record.load({
                type: 'customrecord_swc_actual_cabinet_detail',
                id: reduce_key,
                isDynamic: false // 用 setSublistValue(line=) 更稳
            });

            var oldY = acd.getValue('custrecord_swc_acd_quantity_excellent') || 0;
            var oldL = acd.getValue('custrecord_swc_ecd_quantity_fine') || 0;
            var zs_qty = Number(acd.getValue({fieldId: 'custrecord_swc_acd_zs_qty'}) || 0);

            acd.setValue({ fieldId: 'custrecord_swc_acd_quantity_excellent', value: Number(oldY) + Number(reduce_values.y) })
            acd.setValue({ fieldId: 'custrecord_swc_ecd_quantity_fine', value: Number(oldL) + Number(reduce_values.l) })

            // var yf_qut = Number(oldY) + Number(reduce_values.y) + Number(oldL) + Number(reduce_values.l);
            //
            // acd.setValue({
            //     fieldId: 'custrecord_zs_qty_ck',
            //     value: Number(zs_qty) - yf_qut,
            // });


            acd.save();
        }

        function summarize(summary) {
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

        function getAcdSearchValue(idAry){
            var customrecord_swc_actual_cabinet_detailSearchObj = search.create({
                type: "customrecord_swc_actual_cabinet_detail",
                filters:
                    [
                        ["internalid","anyof",idAry]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_swc_acd_no", label: "No"}),
                        search.createColumn({name: "custrecord_swc_acd_po_id", label: "采购订单编号"}),
                        search.createColumn({name: "custrecord_swc_acd_item", label: "货品"}),
                        search.createColumn({name: "custrecord_swc_acd_vendor", label: "供应商"}),
                        search.createColumn({name: "custrecord_swc_acd_volume", label: "单个体积"}),
                        // search.createColumn({name: "custrecord_swc_acd_product_grade", label: "产品等级"}),
                        search.createColumn({name: "custrecord_swc_acd_bom", label: "BOM版本"}),
                        search.createColumn({name: "custrecord_swc_acd_country", label: "国家"}),
                        search.createColumn({name: "custrecord_swc_acd_estimated_cabine_no", label: "预排柜单号"}),
                        search.createColumn({name: "custrecord_swc_acd_warehouse_type", label: "仓库类型"}),
                        search.createColumn({name: "custrecord_swc_acd_actual_cabinet_no", label: "排柜单号"}),
                        search.createColumn({name: "custrecord_swc_acd_region", label: "区域"}),
                        search.createColumn({name: "custrecord_swc_acd_po_quantity", label: "采购订单数量"}),
                        search.createColumn({name: "custrecord_swc_acd_if_quantity", label: "已出运数量"}),
                        search.createColumn({name: "custrecordswc_acd_nif_quantity", label: "未出运数量"}),
                        search.createColumn({name: "custrecord_swc_acd_quantity", label: "预排柜数量"}),
                        search.createColumn({name: "custrecord_swc_acd_quantity_excellent", label: "本次真实排柜优等品数量"}),
                        search.createColumn({name: "custrecord_swc_ecd_quantity_fine", label: "本次真实排柜良品数量"}),
                        search.createColumn({name: "custrecord_swc_acd_zs_qty", label: "真实排柜数量"}),
                        search.createColumn({name: "custrecord_swc_acd_actual_cabinet", label: "排柜单号"}),
                        search.createColumn({name: "custrecord_swc_acd_main_sku", label: "主要部件"}),
                        search.createColumn({name: "custrecord_swc_display_name_of_the_produ", label: "公司SKU"}),

                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({
                            name: "custitem_swc_total_net_weight",
                            join: "CUSTRECORD_SWC_ACD_ITEM",
                            label: "总净重（G）"
                        }),
                        search.createColumn({
                            name: "custitem_swc_total_gross_weight",
                            join: "CUSTRECORD_SWC_ACD_ITEM",
                            label: "总毛重（G）"
                        }),
                        search.createColumn({
                            name: "custitem_swc_total_volume",
                            join: "CUSTRECORD_SWC_ACD_ITEM",
                            label: "总体积（CBM）"
                        }),
                        search.createColumn({name: "custrecord_swc_acd_item_o", label: "item"}),
                        search.createColumn({
                            name: "custrecord_swc_ecd_estimated_cabinet",
                            join: "CUSTRECORD_SWC_ACD_ESTIMATED_CABINE_NO",
                            label: "预排柜单"
                        })
                    ]
            });

            return getAllResults(customrecord_swc_actual_cabinet_detailSearchObj);

        }

        /**
         * 我只取第一个匹配的供应商，用于“入库操作费(101)”场景下回填头程费用子表承运商。
         * 匹配条件：
         * 1. 供应商.目的国 = 物流发运单.运抵国
         * 2. 供应商.目的仓库代码 = 物流发运单.目的仓仓库代码
         * 3. 多个结果时按检索顺序取第一条
         * @param {string|number} countyLsit
         * @param {string|number} mdLocation
         * @returns {string}
         */
        function getFirstVendorByCountryAndLocation(countyLsit, mdLocation){
            if (!countyLsit || !mdLocation) return '';

            var vendorSearchObj = search.create({
                type: search.Type.VENDOR,
                filters: [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['custentity_swc_destination_country', 'anyof', countyLsit],
                    'AND',
                    ['custentity_swc_destination_arehouse_cod', 'anyof', mdLocation]
                ],
                columns: [
                    search.createColumn({ name: 'internalid', sort: search.Sort.ASC })
                ]
            });

            var result = vendorSearchObj.run().getRange({ start: 0, end: 1 });
            if (result && result.length > 0) {
                return result[0].getValue({ name: 'internalid' }) || '';
            }
            return '';
        }

        function lookupFieldText(type, recId, columnId) {
            if (!type || !recId || !columnId) return '';
            try {
                var info = search.lookupFields({
                    type: type,
                    id: recId,
                    columns: [columnId]
                }) || {};
                var value = info[columnId];
                if (Array.isArray(value) && value[0]) {
                    return value[0].text || value[0].value || '';
                }
                return value || '';
            } catch (e) {
                return '';
            }
        }

        /**
         * MR 生成物流发运单时不做关税/保险费初始化同步。
         * 相关费用同步交给物流发运单 UE 的 afterSubmit 处理。
         */
        function syncInitialEstimatedFeeForInsuranceAndDuty(wlPlanOrderId) {
            return;
        }

        function getInsuranceAndDutyFeeLines(wlPlanOrderId) {
            var lineList = [];
            var feeSearch = search.create({
                type: 'customrecord_swc_wl_first_leg_cost',
                filters: [
                    ['custrecord_swc_wl_first_leg_cost_id', 'anyof', String(wlPlanOrderId)],
                    'AND',
                    ['custrecord_swc_flc_fee_type_z', 'anyof', ['4', '7']]
                ],
                columns: [
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: 'custrecord_swc_flc_fee_type_z' }),
                    search.createColumn({ name: 'custrecord_swc_wl_flc_fee_type_x' }),
                    search.createColumn({ name: 'custrecord_swc_wl_flc_location' })
                ]
            });

            feeSearch.run().each(function (result) {
                lineList.push({
                    id: result.getValue({ name: 'internalid' }),
                    feeTypeZ: result.getValue({ name: 'custrecord_swc_flc_fee_type_z' }),
                    feeTypeX: result.getValue({ name: 'custrecord_swc_wl_flc_fee_type_x' }),
                    carrierId: result.getValue({ name: 'custrecord_swc_wl_flc_location' })
                });
                return true;
            });

            return lineList;
        }

        function getPlanDetailLineList(planRec) {
            var lineList = [];
            var sublistId = 'recmachcustrecord_swc_wl_plan_order_id';
            var lineCount = planRec.getLineCount({ sublistId: sublistId }) || 0;

            for (var i = 0; i < lineCount; i++) {
                    lineList.push({
                        line: i,
                        detailId: planRec.getSublistValue({ sublistId: sublistId, fieldId: 'id', line: i }),
                        poId: planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_po_num', line: i }),
                        itemId: planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_sku', line: i }),
                        amountTotal: toNumber(planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_amount_total', line: i })),
                        superiorQty: toNumber(planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: i })),
                        goodQty: toNumber(planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: i })),
                    shippedQty: toNumber(planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_shipped_qty', line: i }))
                });
            }

            return lineList;
        }

        function getPurchaseOrderCurrencyMap(detailLineList) {
            var poIdMap = {};
            for (var i = 0; i < detailLineList.length; i++) {
                if (detailLineList[i].poId) {
                    poIdMap[String(detailLineList[i].poId)] = true;
                }
            }

            var poIds = Object.keys(poIdMap);
            var currencyMap = {};
            if (!poIds.length) {
                return currencyMap;
            }

            var poSearch = search.create({
                type: 'purchaseorder',
                filters: [
                    ['internalid', 'anyof', poIds],
                    'AND',
                    ['mainline', 'is', 'T']
                ],
                columns: [
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: 'currency' }),
                    search.createColumn({ name: 'trandate' })
                ]
            });

            poSearch.run().each(function (result) {
                var poId = result.getValue({ name: 'internalid' });
                currencyMap[String(poId)] = {
                    id: result.getValue({ name: 'currency' }) || '',
                    text: result.getText({ name: 'currency' }) || '',
                    trandate: result.getValue({ name: 'trandate' }) || ''
                };
                return true;
            });

            return currencyMap;
        }

        /**
         * 我把海运保险费按物流发运明细逐行汇总。
         * 每一行的公式是：
         * custrecord_swc_wl_d_amount_total * 数量 * 1.1 * 0.0005
         * 然后再按成交方式对应的默认币种，与 PO 币种做人民币/美元换算。
         */
        function calculateInsuranceEstimatedFee(detailLineList, poCurrencyMap, termsOfTrade) {
            var total = 0;
            var lineAmountMap = {};
            for (var i = 0; i < detailLineList.length; i++) {
                var line = detailLineList[i];
                var qty = getPlanDetailLineQty(line);
                if (qty <= 0 || line.amountTotal <= 0) {
                    lineAmountMap[String(line.line)] = 0;
                    continue;
                }

                var lineAmount = line.amountTotal * qty * 1.1 * 0.0005;
                var poCurrencyInfo = poCurrencyMap[String(line.poId)] || {};
                lineAmount = convertInsuranceAmountToRmb(lineAmount, poCurrencyInfo);
                lineAmountMap[String(line.line)] = lineAmount;

                total = round2(total + lineAmount);
            }
            return {
                total: total,
                lineAmountMap: lineAmountMap
            };
        }

        /**
         * 我把目的国进口关税按物流发运明细逐行汇总。
         * 计算公式是：
         * 税率有值时：清关价单价 * 数量 * 税率
         * 税率为空或 0 时：清关价单价 * 数量
         * 不做币种转换，直接按清关价字段原币种汇总。
         * 其中清关价字段由运抵国决定，美国(US)场合最后总额再加 40。
         */
        function calculateImportDutyEstimatedFee(detailLineList, countryCode, clearancePriceFieldId, isUsCountry, poCurrencyMap, mainStore, createDate) {
            var skuMap = {};
            for (var i = 0; i < detailLineList.length; i++) {
                if (detailLineList[i].itemId) {
                    skuMap[String(detailLineList[i].itemId)] = true;
                }
            }

            var skuIds = Object.keys(skuMap);
            if (!skuIds.length || !countryCode || !clearancePriceFieldId) {
                return 0;
            }

            var clearancePriceMap = getClearancePriceMap(skuIds, clearancePriceFieldId, mainStore, createDate);
            var countryInternalId = getCountryInternalIdByCountryCode(countryCode);
            var taxRateMap = getSkuTaxRateMap(skuIds, countryInternalId);
            var dutyCurrencyCode = getDutyCurrencyCodeByCountry(countryCode);
            var total = 0;
            var lineAmountMap = {};
            var summaryLines = [];

            for (var j = 0; j < detailLineList.length; j++) {
                var line = detailLineList[j];
                var qty = getPlanDetailLineQty(line);
                if (qty <= 0 || !line.itemId) {
                    lineAmountMap[String(line.line)] = 0;
                    summaryLines.push({
                        行号: line.line,
                        物流发运明细ID: line.detailId,
                        采购订单ID: line.poId,
                        SKU: line.itemId,
                        数量: qty,
                        清关价单价: 0,
                        税率: 0,
                        汇率: 1,
                        清关价乘数量: 0,
                        当前行计算结果: 0,
                        跳过原因: qty <= 0 ? '数量为空或0' : 'SKU为空'
                    });
                    continue;
                }

                var unitPrice = toNumber(clearancePriceMap[String(line.itemId)]);
                var taxRate = toNumber(taxRateMap[String(line.itemId)]);
                if (unitPrice <= 0) {
                    lineAmountMap[String(line.line)] = 0;
                    summaryLines.push({
                        行号: line.line,
                        物流发运明细ID: line.detailId,
                        采购订单ID: line.poId,
                        SKU: line.itemId,
                        数量: qty,
                        清关价单价: unitPrice,
                        税率: taxRate,
                        汇率: 1,
                        清关价乘数量: 0,
                        当前行计算结果: 0,
                        跳过原因: '清关价为空或0'
                    });
                    continue;
                }

                var baseAmount = unitPrice * qty;
                var lineAmount = taxRate > 0 ? (unitPrice * qty * taxRate) : baseAmount;
                var poCurrencyInfo = poCurrencyMap[String(line.poId)] || {};
                var exchangeRate = 1;
                if (!isUsCountry) {
                    exchangeRate = getCurrencyRateBySourceCurrencyCode(dutyCurrencyCode, poCurrencyInfo.id, poCurrencyInfo.trandate);
                    lineAmount = round2(lineAmount * exchangeRate);
                }
                lineAmountMap[String(line.line)] = lineAmount;
                summaryLines.push({
                    行号: line.line,
                    物流发运明细ID: line.detailId,
                    采购订单ID: line.poId,
                    SKU: line.itemId,
                    数量: qty,
                    清关价单价: unitPrice,
                    税率: taxRate,
                    汇率: exchangeRate,
                    清关价乘数量: round2(baseAmount),
                    汇率转换前金额: round2(taxRate > 0 ? (unitPrice * qty * taxRate) : baseAmount),
                    当前行计算结果: lineAmount,
                    计算公式: taxRate > 0 ? '清关价单价 * 数量 * 税率' : '清关价单价 * 数量',
                    跳过原因: ''
                });

                total = round2(total + lineAmount);
            }

            var usSurcharge = 0;
            if (isUsCountry) {
                usSurcharge = 40;
                total = round2(total + 40);
            }
            logImportDutyEstimatedFeeSummary({
                运抵国代码: countryCode,
                清关价字段: clearancePriceFieldId,
                主店铺: mainStore || '',
                物流发运单创建日期: createDate || '',
                关税币种: dutyCurrencyCode,
                是否美国: isUsCountry,
                美国额外加40: usSurcharge,
                明细行数: detailLineList.length,
                每行计算明细: summaryLines,
                每行金额Map: lineAmountMap,
                最终合计: total
            }, summaryLines);

            return {
                total: total,
                lineAmountMap: lineAmountMap
            };
        }

        function logImportDutyEstimatedFeeSummary(summary, calculatedLines) {
            calculatedLines = calculatedLines || [];
            var chunkSize = 10;
            log.audit('IMPORT_DUTY_ESTIMATED_FEE_SUMMARY', summary);
            for (var i = 0; i < calculatedLines.length; i += chunkSize) {
                log.audit('IMPORT_DUTY_ESTIMATED_FEE_LINES_' + (Math.floor(i / chunkSize) + 1), {
                    起始序号: i + 1,
                    结束序号: Math.min(i + chunkSize, calculatedLines.length),
                    总行数: calculatedLines.length,
                    每行计算明细: calculatedLines.slice(i, i + chunkSize)
                });
            }
        }

        function applyInsuranceAndDutyToPlanDetail(planRec, insuranceLineAmountMap, dutyLineAmountMap, countryCode) {
            var sublistId = 'recmachcustrecord_swc_wl_plan_order_id';
            var lineCount = planRec.getLineCount({ sublistId: sublistId }) || 0;
            // 海运保险费明细币种固定回写人民币
            var insuranceCurrency = 1;
            var dutyCurrency = getDutyCurrencyInternalIdByCountryCode(countryCode);

            for (var i = 0; i < lineCount; i++) {
                var insuranceAmount = round2(toNumber((insuranceLineAmountMap || {})[String(i)]));
                var dutyAmount = round2(toNumber((dutyLineAmountMap || {})[String(i)]));

                planRec.setSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_swc_wl_d_em_bxf_fee',
                    line: i,
                    value: insuranceAmount
                });
                if (insuranceCurrency) {
                    planRec.setSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_swc_wl_d_em_bxf_fee_c',
                        line: i,
                        value: insuranceCurrency
                    });
                }

                planRec.setSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_swc_wl_d_em_jkgs_fee',
                    line: i,
                    value: dutyAmount
                });
                if (dutyCurrency) {
                    planRec.setSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_swc_wl_d_em_jkgs_fee_c',
                        line: i,
                        value: dutyCurrency
                    });
                }
            }

            planRec.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });
        }

        function rebalanceLineAmountMap(lineAmountMap, targetTotal) {
            lineAmountMap = lineAmountMap || {};
            targetTotal = round2(toNumber(targetTotal));

            var keys = Object.keys(lineAmountMap);
            if (!keys.length) {
                return lineAmountMap;
            }

            var currentTotal = 0;
            var positiveKeys = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = round2(toNumber(lineAmountMap[key]));
                lineAmountMap[key] = value;
                currentTotal = round2(currentTotal + value);
                if (value > 0) {
                    positiveKeys.push(key);
                }
            }

            var diffCents = Math.round((targetTotal - currentTotal) * 100);
            if (diffCents === 0) {
                return lineAmountMap;
            }

            var allocKeys = positiveKeys.length ? positiveKeys : keys;
            var weightTotal = 0;
            var weights = [];
            for (var j = 0; j < allocKeys.length; j++) {
                var weight = round2(toNumber(lineAmountMap[allocKeys[j]]));
                if (weight <= 0) weight = 1;
                weights.push(weight);
                weightTotal += weight;
            }

            var allocated = new Array(allocKeys.length);
            var allocatedSum = 0;
            var sign = diffCents >= 0 ? 1 : -1;
            var absDiff = Math.abs(diffCents);
            var decimals = [];
            for (var k = 0; k < allocKeys.length; k++) {
                var raw = weights[k] * (absDiff / weightTotal);
                var base = Math.floor(raw);
                allocated[k] = base;
                allocatedSum += base;
                decimals[k] = raw - base;
            }

            var rest = absDiff - allocatedSum;
            while (rest > 0) {
                var maxIndex = 0;
                for (var m = 1; m < decimals.length; m++) {
                    if (decimals[m] > decimals[maxIndex]) {
                        maxIndex = m;
                    }
                }
                allocated[maxIndex] += 1;
                decimals[maxIndex] = -1;
                rest--;
            }

            for (var n = 0; n < allocKeys.length; n++) {
                var lineKey = allocKeys[n];
                lineAmountMap[lineKey] = round2(toNumber(lineAmountMap[lineKey]) + sign * allocated[n] / 100);
            }

            return lineAmountMap;
        }

        /**
         * 我按传入的清关价字段去取 SKU 对应单价。
         * 这个字段已经在外层根据运抵国换算好了，不在这里再做国家判断。
         */
        function getClearancePriceMap(skuIds, priceFieldId, mainStore, createDate) {
            var priceMap = {};
            if (!skuIds || !skuIds.length || !priceFieldId) {
                return priceMap;
            }

            var filters = [
                search.createFilter({
                    name: 'isinactive',
                    operator: search.Operator.IS,
                    values: 'F'
                }),
                search.createFilter({
                    name: 'custrecord_clearance_price_detail_sku',
                    operator: search.Operator.ANYOF,
                    values: skuIds
                })
            ];
            if (createDate) {
                filters.push(search.createFilter({
                    name: 'custrecordcustrecord_swc_effective_date',
                    operator: search.Operator.ONORBEFORE,
                    values: formatSearchDate(createDate)
                }));
            }

            var priceSearch = search.create({
                type: 'customrecord_swc_clearance_price_detail',
                filters: filters,
                columns: [
                    search.createColumn({ name: 'custrecord_clearance_price_detail_sku' }),
                    search.createColumn({ name: priceFieldId }),
                    search.createColumn({ name: 'custrecord_clearance_price_detail_main' }),
                    search.createColumn({ name: 'custrecordcustrecord_swc_effective_date' })
                ]
            });

            var matchedRows = [];
            priceSearch.run().each(function (result) {
                var skuId = result.getValue({ name: 'custrecord_clearance_price_detail_sku' });
                var priceValue = toNumber(result.getValue({ name: priceFieldId }));
                priceMap[String(skuId)] = priceValue;
                matchedRows.push({
                    SKU: skuId,
                    清关价: priceValue,
                    清关价主表ID: result.getValue({ name: 'custrecord_clearance_price_detail_main' }),
                    生效日期: result.getValue({ name: 'custrecordcustrecord_swc_effective_date' })
                });
                return true;
            });
            log.audit('CLEARANCE_PRICE_SEARCH_SUMMARY', {
                SKU列表: skuIds,
                清关价字段: priceFieldId,
                主店铺: mainStore || '',
                是否使用子公司条件: false,
                物流发运单创建日期: createDate || '',
                格式化后创建日期: createDate ? formatSearchDate(createDate) : '',
                命中行数: matchedRows.length,
                命中明细: matchedRows.slice(0, 20),
                价格Map: priceMap
            });

            return priceMap;
        }

        function formatSearchDate(dateValue) {
            if (!dateValue) return dateValue;
            try {
                return format.format({
                    value: dateValue,
                    type: format.Type.DATE
                });
            } catch (e) {
                return dateValue;
            }
        }

        /**
         * 我把运抵国代码映射成清关价维护单的价格字段。
         * 支持的国家代码：
         * US -> USD
         * CA -> CAD
         * DE/FR/IT/ES/NL -> EUR
         * GB/UK -> GBP
         * 其余国家返回空，后续按 0 处理，不抛异常。
         */
        function getClearancePriceFieldIdByCountry(countryId) {
            var countryCode = String(countryId || '').toUpperCase();
            if (countryCode === 'US') return 'custrecord_clearance_price_detail_usd';
            if (countryCode === 'CA') return 'custrecord_clearance_price_detail_cad';
            if (countryCode === 'DE' || countryCode === 'FR' || countryCode === 'IT' || countryCode === 'ES' || countryCode === 'NL') {
                return 'custrecord_clearance_price_detail_eur';
            }
            if (countryCode === 'GB' || countryCode === 'UK') return 'custrecord_clearance_price_detail_gbp';
            return '';
        }

        function getDutyCurrencyCodeByCountry(countryId) {
            var countryCode = String(countryId || '').toUpperCase();
            if (countryCode === 'US') return 'USD';
            if (countryCode === 'CA') return 'CAD';
            if (countryCode === 'DE' || countryCode === 'FR' || countryCode === 'IT' || countryCode === 'ES' || countryCode === 'NL') {
                return 'EUR';
            }
            if (countryCode === 'GB' || countryCode === 'UK') return 'GBP';
            return '';
        }

        function getDutyCurrencyInternalIdByCountryCode(countryCode) {
            var dutyCurrencyCode = getDutyCurrencyCodeByCountry(countryCode);
            return getCurrencyIdByCurrencyCode(dutyCurrencyCode);
        }

        function getCountryInternalIdByCountryCode(countryCode) {
            countryCode = String(countryCode || '').toUpperCase();
            if (countryCode === 'US') return String(CONFIG.COUNTRY_ID_US);
            if (countryCode === 'CA') return '37';
            if (countryCode === 'DE') return '57';
            if (countryCode === 'FR') return '75';
            if (countryCode === 'IT') return '110';
            if (countryCode === 'ES') return '68';
            if (countryCode === 'NL') return '166';
            if (countryCode === 'GB' || countryCode === 'UK') return String(CONFIG.COUNTRY_ID_GB);
            return '';
        }

        function normalizeCountryCode(countryValue, countryText) {
            var rawValue = String(countryValue || '').trim();
            var rawText = String(countryText || '').trim();
            var upperValue = rawValue.toUpperCase();
            var upperText = rawText.toUpperCase();

            if (upperValue === 'US' || upperValue === 'CA' || upperValue === 'DE' || upperValue === 'FR'
                || upperValue === 'IT' || upperValue === 'ES' || upperValue === 'NL'
                || upperValue === 'GB' || upperValue === 'UK') {
                return upperValue;
            }

            if (upperText === 'US' || upperText === 'CA' || upperText === 'DE' || upperText === 'FR'
                || upperText === 'IT' || upperText === 'ES' || upperText === 'NL'
                || upperText === 'GB' || upperText === 'UK') {
                return upperText;
            }

            if (rawValue === String(CONFIG.COUNTRY_ID_US) || rawText.indexOf('美国') !== -1 || rawText.indexOf('美利坚') !== -1) return 'US';
            if (rawText.indexOf('加拿大') !== -1) return 'CA';
            if (rawText.indexOf('德国') !== -1) return 'DE';
            if (rawText.indexOf('法国') !== -1) return 'FR';
            if (rawText.indexOf('意大利') !== -1) return 'IT';
            if (rawText.indexOf('西班牙') !== -1) return 'ES';
            if (rawText.indexOf('荷兰') !== -1) return 'NL';
            if (rawText.indexOf('英国') !== -1) return 'GB';

            return upperValue;
        }

        function getSkuTaxRateMap(skuIds, countryId) {
            var taxRateMap = {};
            if (!skuIds || !skuIds.length || !countryId) {
                return taxRateMap;
            }

            var taxSearch = search.create({
                type: 'customrecord_swc_sku_hscode_ys',
                filters: [
                    ['custrecord_swc_ys_country', 'anyof', countryId],
                    'AND',
                    ['custrecord_swc_ys_item', 'anyof', skuIds],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    search.createColumn({ name: 'custrecord_swc_ys_item' }),
                    search.createColumn({ name: 'custrecord_swc_tax_rate' })
                ]
            });

            taxSearch.run().each(function (result) {
                var skuId = result.getValue({ name: 'custrecord_swc_ys_item' });
                taxRateMap[String(skuId)] = parsePercentRate(result.getValue({ name: 'custrecord_swc_tax_rate' }));
                return true;
            });

            return taxRateMap;
        }

        function getPlanDetailLineQty(line) {
            if (toNumber(line.superiorQty) > 0) return toNumber(line.superiorQty);
            if (toNumber(line.goodQty) > 0) return toNumber(line.goodQty);
            return toNumber(line.shippedQty);
        }

        function isUsdCurrency(currencyText) {
            currencyText = String(currencyText || '').toUpperCase();
            return currencyText.indexOf('USD') !== -1 || currencyText.indexOf('美元') !== -1;
        }

        function isRmbCurrency(currencyText) {
            currencyText = String(currencyText || '').toUpperCase();
            return currencyText.indexOf('CNY') !== -1
                || currencyText.indexOf('RMB') !== -1
                || currencyText.indexOf('人民币') !== -1;
        }

        function convertInsuranceAmountToRmb(amount, poCurrencyInfo) {
            amount = round2(amount);
            poCurrencyInfo = poCurrencyInfo || {};
            var poCurrencyText = poCurrencyInfo.text || '';
            var poCurrencyId = poCurrencyInfo.id || '';
            var poTranDate = poCurrencyInfo.trandate || '';
            if (amount <= 0) {
                return amount;
            }

            if (isRmbCurrency(poCurrencyText) || !poCurrencyId) {
                return amount;
            }

            var rmbCurrencyId = getCurrencyIdByDefaultCode('RMB');
            if (!rmbCurrencyId || String(rmbCurrencyId) === String(poCurrencyId)) {
                return amount;
            }

            try {
                return round2(amount * getCurrencyRateBySourceCurrencyCode(getCurrencyCodeFromCurrencyInfo(poCurrencyInfo), rmbCurrencyId, poTranDate));
            } catch (e) {
                log.error('convertInsuranceAmountToRmb error', e);
                return amount;
            }
        }

        function getCurrencyCodeFromCurrencyInfo(poCurrencyInfo) {
            var currencyText = String((poCurrencyInfo && poCurrencyInfo.text) || '').toUpperCase();
            if (currencyText.indexOf('USD') !== -1 || currencyText.indexOf('美元') !== -1) return 'USD';
            if (currencyText.indexOf('CNY') !== -1 || currencyText.indexOf('RMB') !== -1 || currencyText.indexOf('人民币') !== -1) return 'RMB';
            if (currencyText.indexOf('CAD') !== -1) return 'CAD';
            if (currencyText.indexOf('EUR') !== -1) return 'EUR';
            if (currencyText.indexOf('GBP') !== -1) return 'GBP';
            return '';
        }

        function getCurrencyIdByDefaultCode(currencyCode) {
            currencyCode = String(currencyCode || '').toUpperCase();
            if (!currencyCode) return '';
            if (currencyIdCache[currencyCode]) return currencyIdCache[currencyCode];

            var keywordList = [];
            if (currencyCode === 'USD') {
                keywordList = ['USD', '美元'];
            } else if (currencyCode === 'RMB') {
                keywordList = ['CNY', 'RMB', '人民币'];
            }

            if (!keywordList.length) return '';

            var currencySearch = search.create({
                type: 'currency',
                filters: [
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: 'name' }),
                    search.createColumn({ name: 'symbol' })
                ]
            });

            var currencyId = '';
            currencySearch.run().each(function (result) {
                var name = String(result.getValue({ name: 'name' }) || '').toUpperCase();
                var symbol = String(result.getValue({ name: 'symbol' }) || '').toUpperCase();
                for (var i = 0; i < keywordList.length; i++) {
                    var keyword = String(keywordList[i] || '').toUpperCase();
                    if (name.indexOf(keyword) !== -1 || symbol.indexOf(keyword) !== -1) {
                        currencyId = result.getValue({ name: 'internalid' }) || '';
                        return false;
                    }
                }
                return true;
            });

            currencyIdCache[currencyCode] = currencyId;
            return currencyId;
        }

        function getCurrencyIdByCurrencyCode(currencyCode) {
            currencyCode = String(currencyCode || '').toUpperCase();
            if (!currencyCode) return '';
            if (currencyIdCache[currencyCode]) return currencyIdCache[currencyCode];

            var currencySearch = search.create({
                type: 'currency',
                filters: [
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: 'name' }),
                    search.createColumn({ name: 'symbol' })
                ]
            });

            var currencyId = '';
            currencySearch.run().each(function (result) {
                var name = String(result.getValue({ name: 'name' }) || '').toUpperCase();
                var symbol = String(result.getValue({ name: 'symbol' }) || '').toUpperCase();
                if (name.indexOf(currencyCode) !== -1 || symbol.indexOf(currencyCode) !== -1) {
                    currencyId = result.getValue({ name: 'internalid' }) || '';
                    return false;
                }
                return true;
            });

            currencyIdCache[currencyCode] = currencyId;
            return currencyId;
        }

        function getCurrencyRateBySourceCurrencyCode(sourceCurrencyCode, targetCurrencyId, tranDate) {
            return 1;
        }

        function parsePercentRate(rateValue) {
            var rateText = String(rateValue || '').replace('%', '').trim();
            if (!rateText) return 0;

            var rate = Number(rateText);
            if (!isFinite(rate)) return 0;

            return rate > 1 ? rate / 100 : rate;
        }

        function toNumber(value) {
            var n = Number(value);
            return isFinite(n) ? n : 0;
        }

        function round2(n) {
            n = toNumber(n);
            return Math.round((n + Number.EPSILON) * 100) / 100;
        }

        function fieldMapping() {
            const subListFieldMapping = {
                custrecord_swc_wl_d_po_num : 'custrecord_swc_acd_po_id', // 采购订单编号
                // custrecord_swc_wl_d_product_grade : 'custrecord_swc_acd_product_grade', // 产品等级
                custrecord_swc_wl_d_acd_volume: 'custrecord_swc_acd_volume',// 单个包装体积
                custrecord_swc_wl_d_bom_version : 'custrecord_swc_acd_bom', // BOM版本
                custrecord_swc_wl_d_ca_num : 'custrecord_swc_acd_estimated_cabine_no', // 预排柜单号
                custrecord_swc_wl_d_num_ca : 'custrecord_swc_acd_zs_qty', // 排柜数量
                custrecord_swc_wl_d_superior_qty : 'custrecord_swc_acd_quantity_excellent', // 本次真实排柜优等品数量
                custrecord_swc_wl_d_good_qty : 'custrecord_swc_ecd_quantity_fine', // 本次真实排柜良品数量
                custrecord_swc_wl_d_vendor : 'custrecord_swc_acd_vendor', // 供应商
                custrecord_swc_wl_d_sku : 'custrecord_swc_acd_item', // SKU
                custrecord_swc_wl_d_product_name: 'custrecord_swc_display_name_of_the_produ', // 公司SKU
                custrecord_swc_wl_d_country : 'custrecord_swc_acd_country', // 国家
                custrecord_swc_wl_d_location_type : 'custrecord_swc_acd_warehouse_type', // 仓库类型
                custrecord_swc_wl_d_region : 'custrecord_swc_acd_region', // 区域
            }

            return subListFieldMapping;
        }

        /**
         * 通用非空判断
         * @param obj
         * @returns {boolean}
         */
        function isEmpty(v) {
            switch (typeof v) {
                case 'undefined':
                    return true;
                case 'string':
                    if (v.replace(/(^[ \t\n\r]*)|([ \t\n\r]*$)/g, '').length == 0)
                        return true;
                    break;
                case 'boolean':
                    if (v.toString() == '')
                        return true;
                    break;
                case 'number':
                    if (v == 0) {
                        return true;
                    } else {
                        return false;
                    }
                    break;
                case 'object':
                    if (null === v || v.length === 0)
                        return true;
                    for (var i in v) {
                        return false;
                    }
                    return true;
            }
            return false;
        }

        /**
         * 通用按比例分摊（参考您 splitRegions：floor + 尾差按小数部分从大到小补 1）
         * @param {number[]} regions  各行原始数量（>0）
         * @param {number} newSum     需要分摊的总数（>=0）
         * @returns {number[]}        分摊后的各行数量（整数，和为 newSum）
         */
        function splitByProportion(regions, newSum, totalRegion) {
            newSum = Number(newSum) || 0;
            totalRegion = Number(totalRegion) || 0;
            if (!regions || !regions.length || newSum <= 0 || totalRegion <= 0) {
                var emptyResult = [];
                for (var emptyIndex = 0; emptyIndex < (regions ? regions.length : 0); emptyIndex++) {
                    emptyResult.push(0);
                }
                return emptyResult;
            }

            // 计算每个区域按比例拆分的基础值
            var baseValues = [];
            var regionSum = 0;
            for (var j = 0; j < regions.length; j++) {
                // 如果该区域的原始数量为0，则基础值为0，不参与尾差分配
                if (regions[j] === 0) {
                    baseValues[j] = 0;
                } else {
                    // 按比例计算，向下取整
                    baseValues[j] = Math.floor(regions[j] * (newSum / totalRegion));
                }
                regionSum += baseValues[j];
            }

            var diff = newSum - regionSum; // 尾差

            // 创建一个数组，包含所有非零区域的索引，并按照小数部分从大到小排序
            var indices = [];
            for (var j = 0; j < regions.length; j++) {
                if (regions[j] !== 0) {
                    indices.push(j);
                }
            }

            // 计算每个区域比例的小数部分
            var decimals = [];
            for (var j = 0; j < indices.length; j++) {
                var idx = indices[j];
                decimals.push(regions[idx] * (newSum / totalRegion) - baseValues[idx]);
            }

            // 按照小数部分从大到小排序索引数组（仅非零区域）
            for (var j = 0; j < indices.length - 1; j++) {
                for (var k = j + 1; k < indices.length; k++) {
                    if (decimals[j] < decimals[k]) {
                        var temp = indices[j];
                        indices[j] = indices[k];
                        indices[k] = temp;
                        var tempDec = decimals[j];
                        decimals[j] = decimals[k];
                        decimals[k] = tempDec;
                    }
                }
            }

            // 将尾差分配给前diff个区域（每个区域加1）
            for (var j = 0; j < diff; j++) {
                var idx = indices[j];
                baseValues[idx] += 1;
            }

            return baseValues;
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });
