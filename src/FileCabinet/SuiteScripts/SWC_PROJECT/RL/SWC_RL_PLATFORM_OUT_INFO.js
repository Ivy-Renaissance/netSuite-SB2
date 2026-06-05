/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *
 */
define(['N/error', 'N/record', 'N/search', 'N/runtime', '../common/moment','../common/MatchTool'], function (error, record, search, runtime, moment,MatchTool) {

    function _get(context) {

    }

    function _post(context) {
        //注：CG货品匹配【多平台 SKU映射】表信息:匹配条件：店铺+sku_code，3PL货品匹配【三方仓产品配对信息】表信息：匹配条件：服务商+三方仓sku
        var result = { code: 200, message: 'success', data: {} };
        try {
            log.audit('Body', context);
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            var requestBody = getBody(context);
            // if (requestBody.type == 1 || requestBody.type == 2) {
            //     if (!requestBody.storeId) {
            //         result.code = 500;
            //         result.message = "店铺【storeId】参数为空";
            //         return JSON.stringify(result);
            //     }
            // }
            // if (requestBody.type == 3) {
            //     if (!requestBody.serviceProvider) {
            //         result.code = 500;
            //         result.message = "服务商【serviceProvider】参数为空";
            //         return JSON.stringify(result);
            //     }
            // }
            //根据店铺、skucode匹配【多平台 SKU映射】表信息
            var item_id = getItemId(requestBody.storeId, requestBody.sku);
            // if (!item_id) {
            //     result.code = 500;
            //     result.message = "未匹配到NS系统货品";
            //     return JSON.stringify(result);
            // }

            var memo = '';
            //创建平台仓出库
            var out_info_data = record.create({ type: 'customrecord_swc_platform_loc_out_info', isDynamic: true });
            out_info_data.setValue('custrecord_swc_out_loc_type', requestBody.type);
            out_info_data.setValue('custrecord_swc_out_number', requestBody.number);//主单号
            out_info_data.setValue('custrecord_swc_out_detail_num', requestBody.detailNumber);//子单号
            out_info_data.setValue('custrecord_swc_out_sku_code', requestBody.sku);
            if (item_id) {
                out_info_data.setValue('custrecord_swc_out_sku', item_id);
            } else {
                memo = '未匹配到NS系统货品'
            }
            log.audit('item_id',item_id);
            out_info_data.setValue('custrecord_swc_out_memo', memo);
            var out_date = requestBody.date ? moment(requestBody.date).format(dateFormat) : '';
            out_date ? out_info_data.setText('custrecord_swc_out_date', out_date) : '';
            out_info_data.setValue('custrecord_swc_out_quantity', requestBody.quantity);
            out_info_data.setValue('custrecord_swc_out_date_servic', requestBody.serviceProvider);
            out_info_data.setValue('custrecord_swc_out_store', requestBody.storeId);

            if (requestBody.jzxh) out_info_data.setValue('custrecord_swc_out_jzxh', requestBody.jzxh);
            // out_info_data.setValue('custrecord_swc_out_allocated_qty', requestBody.allocatedqty);
            // out_info_data.setValue('custrecord_swc_out_sub_order', requestBody.suborder);//CG子单信息
            if (requestBody.fhsl) out_info_data.setValue('custrecord_swc_out_fhsl', requestBody.fhsl);
            if (requestBody.fhxs) out_info_data.setValue('custrecord_swc_out_fhxs', requestBody.fhxs);
            if (requestBody.shsl) out_info_data.setValue('custrecord_swc_out_shsl', requestBody.shsl);
            if (requestBody.dch) out_info_data.setValue('custrecord_swc_out_dch', requestBody.dch);
            if (requestBody.fhr) out_info_data.setValue('custrecord_swc_out_fhr', requestBody.fhr);
            if (requestBody.ztdh) out_info_data.setValue('custrecord_swc_out_ztdh', requestBody.ztdh);
            if (requestBody.cs) out_info_data.setValue('custrecord_swc_out_cs', requestBody.cs);
            if (requestBody.gx) out_info_data.setValue('custrecord_swc_out_gx', requestBody.gx);
            if (requestBody.hwmz) out_info_data.setValue('custrecord_swc_out_hwmz', requestBody.hwmz);
            let ztj = 0;
            if (item_id) {
                const itemSearchObj = search.create({
                    type: "item",
                    filters:
                        [
                            ["internalid", "anyof", item_id]
                        ],
                    columns:
                        [
                            search.createColumn({name: "custitem_swc_total_volume", label: "包装体积（CBM）"})
                        ]
                });
                itemSearchObj.run().each(function(result) {
                    var tj = result.getValue({name: "custitem_swc_total_volume", label: "包装体积（CBM）"});
                    ztj = MatchTool.mulN(Number(tj),Number(requestBody.quantity));
                    return true;
                });
            }
            log.error('ztj',ztj);
            if (ztj) {
                ztj = MatchTool.fixed(ztj,4);
                out_info_data.setValue('custrecord_swc_out_hwti', ztj);
            }
            // if (requestBody.hwti) out_info_data.setValue('custrecord_swc_out_hwti', requestBody.hwti);
            // if (requestBody.bscshc) out_info_data.setText('custrecord_swc_out_bscshc', requestBody.bscshc);//保税仓收货仓 //需要映射

            if (requestBody.bscshc) {
                out_info_data.setValue('custrecord_swc_out_bscshc_string', requestBody.bscshc);//保税仓收货仓 //需要映射
                var location = locationSearch(requestBody.bscshc);
                if (location) out_info_data.setValue('custrecord_swc_out_bscshc', location);
            }

            if (requestBody.qyg) {
                out_info_data.setValue('custrecord_swc_out_qyg_string', requestBody.qyg);
                var qyg = qygSearch(requestBody.qyg);
                if (qyg) out_info_data.setValue('custrecord_swc_out_qyg', qyg);
            }//起运港 //需要映射

            var yjkcsj = requestBody.yjkcsj ? moment(requestBody.yjkcsj).format(dateFormat) : '';
            if (yjkcsj) out_info_data.setText('custrecord_swc_out_yjkcsj', yjkcsj);
            var sjkcsj = requestBody.sjkcsj ? moment(requestBody.sjkcsj).format(dateFormat) : '';
            if (sjkcsj) out_info_data.setText('custrecord_swc_out_sjkcsj', sjkcsj);
            var qygjgsj = requestBody.qygjgsj ? moment(requestBody.qygjgsj).format(dateFormat) : '';
            if (qygjgsj) out_info_data.setText('custrecord_swc_out_qygjgsj', qygjgsj);
            var qgsj = requestBody.qgsj ? moment(requestBody.qgsj).format(dateFormat) : '';
            if (qgsj) out_info_data.setText('custrecord_swc_out_qgsj', qgsj);
            // if (requestBody.mdg) out_info_data.setText('custrecord_swc_out_mdg', requestBody.mdg);//目的港 //需要映射
            if (requestBody.mdg) {
                out_info_data.setValue('custrecord_swc_out_mdg_string', requestBody.mdg);//目的港 //需要映射
                var mdg = mdgSearch(requestBody.mdg);
                if (mdg) out_info_data.setValue('custrecord_swc_out_mdg', mdg);
            }

            var yjdgsj = requestBody.yjdgsj ? moment(requestBody.yjdgsj).format(dateFormat) : '';
            if (yjdgsj) out_info_data.setText('custrecord_swc_out_yjdgsj', yjdgsj);
            var sjdgsj = requestBody.sjdgsj ? moment(requestBody.sjdgsj).format(dateFormat) : '';
            if (sjdgsj) out_info_data.setText('custrecord_swc_out_sjdgsj', sjdgsj);
            if (requestBody.mdhcz) out_info_data.setText('custrecord_swc_out_mdhcz', requestBody.mdhcz);
            var mdhcyjddsje = requestBody.mdhcyjddsje ? moment(requestBody.mdhcyjddsje).format(dateFormat) : '';
            if (mdhcyjddsje) out_info_data.setText('custrecord_swc_out_mdhcyjddsje', mdhcyjddsje);
            var mdhcyjddsja = requestBody.mdhcyjddsja ? moment(requestBody.mdhcyjddsja).format(dateFormat) : '';
            if (mdhcyjddsja) out_info_data.setText('custrecord_swc_out_mdhcyjddsja', mdhcyjddsja);
            // if (requestBody.mdc) out_info_data.setText('custrecord_swc_out_mdc', requestBody.mdc);//地点 //需要映射

            if (requestBody.mdc) {
                out_info_data.setValue('custrecord_swc_out_mdc_string', requestBody.mdc);//地点 //需要映射
                var location = locationSearch(requestBody.mdc);
                if (location) out_info_data.setValue('custrecord_swc_out_bscshc', location);
            }

            var mdcsjddsj = requestBody.mdcsjddsj ? moment(requestBody.mdcsjddsj).format(dateFormat) : '';
            if (mdcsjddsj) out_info_data.setText('custrecord_swc_out_mdcsjddsj', mdcsjddsj);
            var kxfhsj = requestBody.kxfhsj ? moment(requestBody.kxfhsj).format(dateFormat) : '';
            if (kxfhsj) out_info_data.setText('custrecord_swc_out_kxfhsj', kxfhsj);

            //子单头匹配
            if (requestBody.number && requestBody.detailNumber) {

                var suborder = searchSuborder(requestBody.number, requestBody.detailNumber);//查询CG子单信息
                if (!suborder) {
                    var cgRec = record.create({
                        type: 'customrecord_swc_cg_sub_order',
                        isDynamic: false
                    });
                    cgRec.setValue({ fieldId: 'custrecord_swc_cos_total_volume', value: requestBody.hwti});
                    cgRec.setValue({
                        fieldId: 'custrecord_swc_cso_main_order_number',
                        value: requestBody.number
                    });
                    cgRec.setValue({
                        fieldId: 'custrecord_swc_cso_sub_order_number',
                        value: requestBody.detailNumber
                    });
                    var wlID;
                    search.create({
                        type: "customrecord_swc_wl_plan_order",
                        filters:
                            [
                                ["custrecord_swc_cg_main_order_number", "is", requestBody.number]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "internalid", label: "内部 ID" }),
                                search.createColumn({ name: "custrecord_swc_md_location", label: "目的仓仓库代码" }),
                                search.createColumn({ name: "custrecord_swc_contract_cabinet1", label: "合约柜/非合约柜" }),
                                search.createColumn({ name: "custrecord_swc_fy_full_link", label: "全链路/到港" }),
                                search.createColumn({ name: "custrecord_swc_wl_zg_size", label: "货柜尺寸" }),
                                search.createColumn({ name: "custrecord_swc_wl_rm_sta_gk", label: "起运港" }),
                                search.createColumn({ name: "custrecord_swc_wl_md_lc", label: "目的港" }),
                                search.createColumn({ name: "custrecord_swc_wl_terms_of_trade", label: "成交方式" }),
                                search.createColumn({ name: "custrecord_swc_wl_po_zt", label: "采购主体" }),
                                search.createColumn({ name: "custrecord_swc_wl_county_lsit", label: "运抵国" }),
                                search.createColumn({ name: "custrecord_swc_wl_trasfer_way", label: "运输方式" }),
                                search.createColumn({ name: "custrecord_swc_fy_loading_city", label: "装柜城市" })
                            ]
                    }).run().each(function (wl_order) {
                        wlID = wl_order.getValue('internalid');
                        cgRec.setValue({ fieldId: 'custrecord_swc_cso_wl_plan_order', value: wl_order.getValue('internalid') });
                        cgRec.setValue({ fieldId: 'custrecordcustrecord_swc_cso_md_location', value: wl_order.getValue('custrecord_swc_md_location') });
                        cgRec.setValue({ fieldId: 'custrecord_swc_cos_contract_cabinet1', value: wl_order.getValue('custrecord_swc_contract_cabinet1') });
                        cgRec.setValue({ fieldId: 'custrecord_swc_cos_fy_full_link', value: wl_order.getValue('custrecord_swc_fy_full_link') });
                        cgRec.setValue({ fieldId: 'custrecord_swc_cos_zg_size', value: wl_order.getValue('custrecord_swc_wl_zg_size') });
                        cgRec.setValue({ fieldId: 'custrecord_swc_cos_rm_sta_gk', value: wl_order.getValue('custrecord_swc_wl_rm_sta_gk') });
                        cgRec.setValue({ fieldId: 'custrecord_swc_cos_md_lc', value: wl_order.getValue('custrecord_swc_wl_md_lc') });
                        cgRec.setValue({ fieldId: 'custrecord_swc_cos_terms_of_trade', value: wl_order.getValue('custrecord_swc_wl_terms_of_trade') });
                        cgRec.setValue({ fieldId: 'custrecord_swc_cos_po_zt', value: wl_order.getValue('custrecord_swc_wl_po_zt') });
                        cgRec.setValue({ fieldId: 'custrecord_swc_cos_county_lsit', value: wl_order.getValue('custrecord_swc_wl_county_lsit') });
                        cgRec.setValue({ fieldId: 'custrecord_swc_cos_trasfer_way', value: wl_order.getValue('custrecord_swc_wl_trasfer_way') });
                        cgRec.setValue({ fieldId: 'custrecord_swc_cos_loading_city', value: wl_order.getValue('custrecord_swc_fy_loading_city') });
                    })
                    //创建费用明细
                    // 头程费用信息录入
                    var legCostSubID = 'recmachcustrecord_swc_cg_first_leg_cost_id';
                    var customrecord_swc_service_quotation_detaiSearchObj = search.create({
                        type: "customrecord_swc_service_quotation_detai",
                        filters:
                            [
                                ["custrecord_swc_lpd_lp.custrecord_swc_lp_start_date","onorbefore","today"],
                                "AND",
                                ["custrecord_swc_lpd_lp.custrecord_swc_lp_end_date","onorafter","today"],
                            ],
                        columns:
                            [
                                search.createColumn({name: "custrecord_swc_lp_cost_medium", label: "费用类型（中类）"}),
                                search.createColumn({name: "custrecord_swc_lp_rm_cost_s", label: "费用类型（小类）"}),
                            ]
                    });

                    // const customrecord_swc_rule_mapping_table_detaSearchObj = search.create({
                    //     type: "customrecord_swc_rule_mapping_table_deta",
                    //     filters:
                    //         [
                    //         ],
                    //     columns:
                    //         [
                    //             search.createColumn({ name: "custrecord_swc_rm_cost_medium", label: "费用项（中类）" }),
                    //             search.createColumn({ name: "custrecord_swc_rm_cost_s", label: "费用项（小类）" }),
                    //             search.createColumn({ name: "custrecord_swc_carrier", label: "承运商" }),
                    //             search.createColumn({ name: "custrecord_swc_rm_allocation_logic", label: "分摊规则" })
                    //         ]
                    // });
                    if (wlID) {
                        const customrecord_swc_wl_first_leg_costSearchObj = search.create({
                            type: "customrecord_swc_wl_first_leg_cost",
                            filters:
                                [
                                    ["custrecord_swc_wl_first_leg_cost_id", "anyof", wlID]
                                ],
                            columns:
                                [
                                    search.createColumn(
                                        {name: "custrecord_swc_flc_fee_type_z", label: "费用类型（中类）"}),
                                    search.createColumn(
                                        {name: "custrecord_swc_wl_flc_fee_type_x", label: "费用类型（小类）"}),
                                    search.createColumn(
                                        {name: "custrecord_swc_wl_flc_allocation_rules", label: "分摊规则"}),
                                    search.createColumn({name: "custrecord_swc_wl_flc_location", label: "承运商"})
                                ]
                        });
                        var quotation_detaiSearchObj = getAllResults(customrecord_swc_wl_first_leg_costSearchObj);
                        if (quotation_detaiSearchObj && quotation_detaiSearchObj.length > 0) {
                            // 我先读取当前物流发运单上的运抵国和目的仓，后面在“入库操作费(101)”场景下做承运商覆盖。
                            // var wlCountyLsit = cgRec.getValue({ fieldId: 'custrecord_swc_wl_county_lsit' });
                            // var wlMdLocation = cgRec.getValue({ fieldId: 'custrecord_swc_md_location' });
                            for (let legLine = 0; legLine < quotation_detaiSearchObj.length; legLine++) {
                                var legData = quotation_detaiSearchObj[legLine];
                                var feeTypeZ = legData.getValue('custrecord_swc_flc_fee_type_z');
                                var carrierId = legData.getValue('custrecord_swc_wl_flc_location');
                                var feeTypeX = legData.getValue('custrecord_swc_wl_flc_fee_type_x');
                                // 中类
                                cgRec.setSublistValue({
                                    sublistId: legCostSubID,
                                    fieldId: 'custrecord_swc_cflc_fee_type_z',
                                    line: legLine,
                                    value: feeTypeZ,
                                });

                                // 小类
                                // cgRec.setSublistValue({
                                //     sublistId: legCostSubID,
                                //     fieldId: 'custrecord_swc_wl_cflc_fee_type_x',
                                //     line: legLine,
                                //     value: legData.getValue('custrecord_swc_lp_rm_cost_s'),
                                // });
                                cgRec.setSublistValue({
                                    sublistId: legCostSubID,
                                    fieldId: 'custrecord_swc_wl_cflc_fee_type_x',
                                    line: legLine,
                                    value: feeTypeX,
                                });

                                // // 我默认沿用规则明细上的承运商字段。
                                // // 但在“入库操作费(101)”且物流发运单已有运抵国时，优先按“运抵国 + 目的仓”去供应商取第一个匹配值。
                                // if (String(feeTypeZ) === '101' && wlCountyLsit && wlMdLocation) {
                                //     var matchedVendorId = getFirstVendorByCountryAndLocation(wlCountyLsit, wlMdLocation);
                                //     if (matchedVendorId) {
                                //         carrierId = matchedVendorId;
                                //     }
                                // }

                                if (carrierId) {
                                    cgRec.setSublistValue({
                                        sublistId: legCostSubID,
                                        fieldId: 'custrecord_swc_wl_cflc_location',
                                        line: legLine,
                                        value: carrierId
                                    });
                                }

                                cgRec.setSublistValue({
                                    sublistId: legCostSubID,
                                    fieldId: 'custrecord_swc_wl_cflc_allocation_rules',
                                    line: legLine,
                                    value: legData.getValue('custrecord_swc_wl_flc_allocation_rules')
                                });
                            }
                        }
                    }
                    suborder = cgRec.save({ ignoreMandatoryFields: true });
                }




                if (suborder)
                    out_info_data.setValue('custrecord_swc_out_sub_order', suborder);//CG子单信息
            }

            var out_info_data_id = out_info_data.save({ ignoreMandatoryFields: true });
            if (out_info_data_id) {
                result.data = { id: out_info_data_id };
            }
        } catch (e) {
            log.error("错误信息：", { err: e.message, requestBody });
            if (e?.name && +e.name) {
                result.code = +e.name;
                result.message = e.message;
                result.data = e.data;
            } else {
                result.code = 500;
                result.message = "请求异常,错误信息:" + e.message;
            }
        }
        return JSON.stringify(result);
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

    function getItemId(storeId, sku) {
        var item_id;
        search.create({
            type: 'customrecord_swc_platform_sku_mapping',
            filters:
                [
                    ["custrecord_swc_pt_sku_map_msku", "is", sku],
                    "AND",
                    ["custrecord_swc_pt_sku_map_store", "anyof", storeId],
                    "AND",
                    ["isinactive", "is", false]
                ],
            columns:
                [
                    'custrecord_swc_pt_sku_map_item',
                    { name: 'internalid', sort: 'DESC' }
                ]
        }).run().each(function (result) {
            if (result.getValue(result.columns[0])) {
                item_id = result.getValue(result.columns[0]);
            }
            return false;
        });
        return item_id;
    }

    /**
     * 获取 请求body
     * @param {string|Object} requestBody 请求body
     * @returns {Object}
     */
    function getBody(requestBody) {
        try {
            requestBody = typeof (requestBody) == "string" ? JSON.parse(requestBody) : requestBody;
        } catch (e) {
            throw error.create({ name: "400", message: "requestBody参数错误: " + requestBody, notifyOff: true });
        }
        return requestBody;
    }

    function searchSuborder(number, detailNumber) {
        const customrecord_swc_cg_sub_orderSearchObj = search.create({
            type: "customrecord_swc_cg_sub_order",
            filters:
                [
                    ["custrecord_swc_cso_main_order_number", "startswith", number],
                    "AND",
                    ["custrecord_swc_cso_sub_order_number", "startswith", detailNumber]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "内部 ID" })
                ]
        });
        var suborder;
        customrecord_swc_cg_sub_orderSearchObj.run().each(function (result) {
            suborder = result.id;
            return true;
        });

        return suborder;
    }

    function _put(context) {

    }

    function _delete(context) {

    }

    function qygSearch(qyg) {
        const customrecord_swc_port_of_loadingSearchObj = search.create({
            type: "customrecord_swc_port_of_loading",
            filters:
                [
                    ["name","is",qyg]
                ],
            columns:
                [
                    search.createColumn({name: "internalid", label: "内部 ID"})
                ]
        });

        var id;
        customrecord_swc_port_of_loadingSearchObj.run().each(function(result){
            id = result.id;
            return true;
        });

        return id
    }

    function mdgSearch(mdg) {
        const customrecord_swc_port_of_loadingSearchObj = search.create({
            type: "customrecord_swc_destination_port",
            filters:
                [
                    ["name","is",mdg]
                ],
            columns:
                [
                    search.createColumn({name: "internalid", label: "内部 ID"})
                ]
        });

        var id;
        customrecord_swc_port_of_loadingSearchObj.run().each(function(result){
            id = result.id;
            return true;
        });

        return id
    }

    function locationSearch(location) {
        const customrecord_swc_port_of_loadingSearchObj = search.create({
            type: "customrecord_swc_destination_port",
            filters:
                [
                    ["name","is",location]
                ],
            columns:
                [
                    search.createColumn({name: "internalid", label: "内部 ID"})
                ]
        });

        var id;
        customrecord_swc_port_of_loadingSearchObj.run().each(function(result){
            id = result.id;
            return true;
        });

        return id
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});