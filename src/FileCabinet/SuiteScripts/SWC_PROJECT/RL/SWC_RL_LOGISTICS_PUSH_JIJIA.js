/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/record', '../common/moment', '../common/interface', 'N/runtime'], function (search, record, moment, interface, runtime) {

    function _get(context) {

    }

    function _post(context) {
        var result_str = {};
        try {
            //易达云头程运输方式、始发仓
            var ydy_transportation_mode = {
                '海运整柜-20GP': '2000670',
                '海运整柜-40GP': '2000671',
                '海运整柜-40HQ': '2000672',
                '海运整柜-45HQ': '2003301',
                '海运散货': '2000669'
            };
            var ydy_start_loc = {
                '深圳仓-CNSZ': '38',
                '广州仓-CNGZ': '48',
                '上海仓-CNSH': '60'
            };
            //关税类型
            var tariff_list = {
                '实报实销': 'P'
            };
            //易达云入库类型
            var inbound_type_list = {
                '国内验货入库': 'NI',
                '国外验货入库': 'WI'
            };
            //易仓入库单类型
            var receipt_type_list = {
                '自发头程': 'D',
                '中转待发': 'T'
            };
            var bill_id = context, sublist_id = 'recmachcustrecord_swc_acd_actual_cabinet', sublist_id1 = 'recmachcustrecord_swc_pg_zspgdh', item_arr = [];
            var actual_cabinet_data = record.load({ type: 'customrecord_swc_actual_cabinet', id: bill_id, isDynamic: true });
            var md_location = actual_cabinet_data.getValue('custrecord_swc_pg_md_location');
            if (!md_location) {
                result_str.data = '物流发运单【目的仓仓库代码】未进行填写，请检查';
                return result_str;
            }
            //使用【目的仓仓库代码】获取地点对应的【三方仓ID】、【海外仓仓库代码】、【海外仓服务商】
            var third_loc_info = getThirdLocInfo(md_location);
            if (Object.keys(third_loc_info).length > 0) {
                var third_loc_id = third_loc_info.third_loc_id;//三方仓id
                var third_loc_code = third_loc_info.third_loc_code;//海外仓仓库代码
                var third_loc_sp = third_loc_info.third_loc_sp;//海外仓服务商 (用于判断推送哪个仓的JSON)
                var third_loc_sp_code = third_loc_info.third_loc_sp_code;//海外仓服务商名称
                //获取三方仓产品映射关系
                var search_item_arr = [];
                var bill_line_num = actual_cabinet_data.getLineCount(sublist_id);
                if (bill_line_num > 0) {
                    for (var i = 0; i < bill_line_num; i++) {
                        var item_code = actual_cabinet_data.getSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_swc_acd_item', line: i });
                        if (search_item_arr.indexOf(item_code) == -1) {
                            search_item_arr.push(item_code);
                        }
                    }
                } else {
                    result_str.data = '物流发运单没有明细行信息，请检查单据信息！';
                    return result_str;
                }
                var item_map_info = getItemMapInfo(search_item_arr, third_loc_sp_code);
                if (Object.keys(item_map_info).length == 0) {
                    result_str.data = '未匹配到三方仓的产品映射关系，请检查【三方仓产品配对信息】数据！';
                    return result_str;
                }
                //获取行信息
                var packageList = [];
                //装箱明细
                var error_line_arr = [];
                var line_info = {};
                var line_num = actual_cabinet_data.getLineCount(sublist_id1);
                if (line_num > 0) {
                    for (var i = 0; i < line_num; i++) {
                        var item_code = actual_cabinet_data.getSublistValue({ sublistId: sublist_id1, fieldId: 'custrecord_swc_pg_sku', line: i });//sku
                        var superior_qty = actual_cabinet_data.getSublistValue({ sublistId: sublist_id1, fieldId: 'custrecord_swc_pg_sl', line: i }) || 0;//数量
                        var pg_gg = actual_cabinet_data.getSublistValue({ sublistId: sublist_id1, fieldId: 'custrecord_swc_pg_gg', line: i });//规格
                        var pg_gg_info = pg_gg.split('*'), x_length = 0, x_width = 0, x_height = 0;
                        if (pg_gg_info.length > 0) {
                            x_length = pg_gg_info[0];
                            x_width = pg_gg_info[1];
                            x_height = pg_gg_info[2];
                        }
                        var pg_xh = actual_cabinet_data.getSublistValue({ sublistId: sublist_id1, fieldId: 'custrecord_swc_pg_xh', line: i });//箱号
                        var pg_mz = actual_cabinet_data.getSublistValue({ sublistId: sublist_id1, fieldId: 'custrecord_swc_pg_mz', line: i }) || 0;//毛重
                        var pg_id = actual_cabinet_data.getSublistValue({ sublistId: sublist_id1, fieldId: 'custrecord_swc_pg_id', line: i });//序号
                        if (!item_map_info[item_code]) {
                            error_line_arr.push(pg_id);
                        } else {
                            line_info[pg_xh] = line_info[pg_xh] || {};
                            line_info[pg_xh]['boxNo'] = pg_xh;
                            line_info[pg_xh]['weight'] = pg_mz;
                            line_info[pg_xh]['length'] = x_length;
                            line_info[pg_xh]['width'] = x_width;
                            line_info[pg_xh]['height'] = x_height;
                            line_info[pg_xh]['productList'] = line_info[pg_xh]['productList'] || [];
                            line_info[pg_xh]['productList'].push({
                                'sku': item_map_info[item_code],
                                'quantity': superior_qty
                            });
                        }
                    }
                    if (Object.keys(line_info).length > 0) {
                        for (var i in line_info) {
                            packageList.push(line_info[i]);
                        }
                    }
                } else {
                    result_str.data = '物流发运单没有装箱明细行信息，请检查单据信息！';
                    return result_str;
                }
                if (error_line_arr.length > 0) {
                    result_str.data = '装箱明细：' + error_line_arr + '序号，未匹配到三方仓货品编码，请检查【三方仓产品配对信息】数据！';
                    return result_str;
                }
                var logistics_waybill_num = actual_cabinet_data.getValue('name');
                var reservation_number = actual_cabinet_data.getValue('custrecord_pg_reservation_number');
                var container_number = actual_cabinet_data.getValue('custrecord_swc_pg_container_number');
                var delivery_method = actual_cabinet_data.getValue('custrecord_swc_pg_delivery_method') - 1;
                var logistics_memo = actual_cabinet_data.getValue('custrecord_swc_pg_memo');
                var eta_date = actual_cabinet_data.getValue('custrecord_swc_pg_estimated_time_of_arri') ? moment(actual_cabinet_data.getValue('custrecord_swc_pg_estimated_time_of_arri')).format('YYYY-MM-DD HH:mm:ss') : '';
                var trasfer_way = actual_cabinet_data.getValue('custrecord_swc_mode_of_transportation') - 1;
                var pg_attributes = actual_cabinet_data.getValue('custrecord_product_pg_attributes') - 1;
                var pg_attributes_name = actual_cabinet_data.getText('custrecord_product_pg_attributes');
                var type_of_goods = actual_cabinet_data.getValue('custrecord_pg_type_of_goods');
                var type_of_goods_name = actual_cabinet_data.getText('custrecord_pg_type_of_goods');
                var pg_size = actual_cabinet_data.getValue('custrecord_swc_pg_size');
                var pg_size_name = actual_cabinet_data.getText('custrecord_swc_pg_size');
                var pg_etd_date = actual_cabinet_data.getValue('custrecord_swc_pg_etd_date') ? moment(actual_cabinet_data.getValue('custrecord_swc_pg_etd_date')).format('YYYY-MM-DD HH:mm:ss') : '';
                var shipping_method = actual_cabinet_data.getValue('custrecordpg_wuyouda_shipping_method');
                var shipping_method_name = actual_cabinet_data.getText('custrecordpg_wuyouda_shipping_method');
                var first_leg_type = actual_cabinet_data.getValue('custrecord_swc_pg_first_leg_type');
                var first_leg_type_name = actual_cabinet_data.getText('custrecord_swc_pg_first_leg_type');
                var stacking_flag = actual_cabinet_data.getValue('custrecord_swc_pg_stacking_flag');
                var type_of_tariff = actual_cabinet_data.getText('custrecord_swc_pg_type_of_tariff');
                var nbound_type = actual_cabinet_data.getText('custrecord_swc_zspgd_nbound_type');
                var first_leg_ship = actual_cabinet_data.getText('custrecord_swc_pg_cloud_first_leg_ship');
                var cloud_origin_warehou = actual_cabinet_data.getText('custrecord_swc_yida_cloud_origin_warehou');
                var warehouse_receipt_type = actual_cabinet_data.getText('custrecord_swc_pg_warehouse_receipt_type');
                var tracking_number = actual_cabinet_data.getValue('custrecord_swc_pg_tracking_number');
                var warehouse_country = actual_cabinet_data.getText('custrecord_swc_pg_country');
                var zspgd_spo = actual_cabinet_data.getText('custrecord_swc_zspgd_spo');
                var cargo_type1 = actual_cabinet_data.getValue('custrecord_swc_bulk_cargo_type1');
                var thirdWarehouseId = third_loc_id;
                var orderNumber = logistics_waybill_num;
                var appointmentCode = reservation_number;
                var incomeType = delivery_method;
                var serviceRegion = warehouse_country;
                var desc = logistics_memo;
                var etaDate = eta_date;
                var shippingType = trasfer_way;
                var warehouseCode = third_loc_code;
                if ((!container_number || !pg_size) && third_loc_sp != 7) {
                    result_str.data = '集装箱箱号/货柜尺寸为空';
                    return result_str;
                }
                var need_body = {};
                if (third_loc_sp == 5) {//无忧达
                    need_body.appointmentCode = appointmentCode;
                    need_body.appointmentNo = appointmentCode;
                    need_body.etaDate = etaDate;
                    need_body.incomeType = incomeType;
                    need_body.orderNumber = zspgd_spo;
                    need_body.serviceRegion = serviceRegion;
                    need_body.shippingType = shippingType;
                    need_body.thirdWarehouseId = thirdWarehouseId;
                    need_body.warehouseCode = warehouseCode;
                    var need_ext = [];
                    if (container_number) {
                        need_ext.push({
                            'parameterKey': 'cabinet_num',
                            'parameterValue': container_number
                        });
                    }
                    if (type_of_goods) {
                        need_ext.push({
                            'parameterKey': 'cargo_type',
                            'parameterValue': type_of_goods,
                            'parameterValueDesc': type_of_goods_name
                        });
                    }
                    if (pg_size) {
                        need_ext.push({
                            'parameterKey': 'container_model',
                            'parameterValue': pg_size,
                            'parameterValueDesc': pg_size_name
                        });
                    }
                    if (pg_etd_date) {
                        need_ext.push({
                            'parameterKey': 'etd',
                            'parameterValue': pg_etd_date
                        });
                    }
                    if (shipping_method) {
                        need_ext.push({
                            'parameterKey': 'receiving_shipping_type',
                            'parameterValue': shipping_method,
                            'parameterValueDesc': shipping_method_name
                        });
                    }
                    if (first_leg_type) {
                        need_ext.push({
                            'parameterKey': 'spontaneous_first_leg_type',
                            'parameterValue': first_leg_type,
                            'parameterValueDesc': first_leg_type_name
                        });
                    }
                    if (stacking_flag) {
                        need_ext.push({
                            'parameterKey': 'stacking_flag',
                            'parameterValue': '1',
                            'parameterValueDesc': '是'
                        });
                    }
                    if (tracking_number) {
                        need_ext.push({
                            'parameterKey': 'tracking_no',
                            'parameterValue': tracking_number
                        });
                    }
                    need_body.ext = need_ext;
                    need_body.packageList = packageList;
                } else if (third_loc_sp == 2 || third_loc_sp == 4 || third_loc_sp == 8 || third_loc_sp == 3) {//易仓、富士康、鹿游、派速捷
                    need_body.desc = desc;
                    need_body.etaDate = etaDate;
                    need_body.incomeType = incomeType;
                    need_body.orderNumber = zspgd_spo;
                    need_body.serviceRegion = serviceRegion;
                    need_body.thirdWarehouseId = thirdWarehouseId;
                    need_body.warehouseCode = warehouseCode;
                    var need_ext = [];
                    if (type_of_tariff) {
                        need_ext.push({
                            'parameterKey': 'tax_type',
                            'parameterValue': tariff_list[type_of_tariff],
                            'parameterValueDesc': type_of_tariff
                        });
                    }
                    if (warehouse_receipt_type) {
                        need_ext.push({
                            'parameterKey': 'receiving_type',
                            'parameterValue': receipt_type_list[warehouse_receipt_type],
                            'parameterValueDesc': warehouse_receipt_type
                        });
                    }
                    if (desc) {
                        need_ext.push({
                            'parameterKey': 'receiving_desc',
                            'parameterValue': desc
                        });
                    }
                    if (tracking_number) {
                        need_ext.push({
                            'parameterKey': 'tracking_no',
                            'parameterValue': tracking_number
                        });
                    }
                    if (pg_size) {
                        if (pg_size_name == '45HQ') {
                            pg_size = 5;
                        } else if (pg_size_name == '45GP') {
                            pg_size = 4;
                        }
                        need_ext.push({
                            'parameterKey': 'containerType',
                            'parameterValue': pg_size,
                            'parameterValueDesc': pg_size_name
                        });
                    }
                    if (cargo_type1 == 1) {
                        //散货类型（托）
                        need_ext.push({
                            'parameterKey': 'bulkCargoType',
                            'parameterValue': '1',
                            'parameterValueDesc': '是'
                        });
                        //散货类型（件）
                        need_ext.push({
                            'parameterKey': 'bulkCargoTypePiece',
                            'parameterValue': '0',
                            'parameterValueDesc': '否'
                        });
                    } else if (cargo_type1 == 2) {
                        //散货类型（托）
                        need_ext.push({
                            'parameterKey': 'bulkCargoType',
                            'parameterValue': '0',
                            'parameterValueDesc': '否'
                        });
                        //散货类型（件）
                        need_ext.push({
                            'parameterKey': 'bulkCargoTypePiece',
                            'parameterValue': '1',
                            'parameterValueDesc': '是'
                        });
                    } else {
                        //散货类型（托）
                        need_ext.push({
                            'parameterKey': 'bulkCargoType',
                            'parameterValue': '0',
                            'parameterValueDesc': '否'
                        });
                        //散货类型（件）
                        need_ext.push({
                            'parameterKey': 'bulkCargoTypePiece',
                            'parameterValue': '0',
                            'parameterValueDesc': '否'
                        });
                    }
                    need_body.ext = need_ext;
                    need_body.packageList = packageList;
                } else {
                    result_str.data = '该类型不需要推送积加';
                    return result_str;
                }
                log.debug('need_body', need_body);
                if (Object.keys(need_body).length > 0) {
                    //推送积加
                    var developer_id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_custoemr_developer_id1' });
                    var auth = interface.JJDeveloperAccountAuth(developer_id);
                    log.debug('auth', auth);
                    var path = '/warehouseCenter/ship/inboundOrder/create';
                    // result_str.data = JSON.stringify(need_body);
                    // return result_str;
                    var response_body = interface.JJHttpsResponse('post', path, auth, need_body);
                    log.debug('response_body_item', response_body);
                    if (response_body.code == 200) {
                        var rec_data = response_body.data;
                        if (rec_data.length > 0) {
                            var wayBillNumber = rec_data[0].wayBillNumber;
                            if (wayBillNumber) {
                                var actual_cabinet_id = record.submitFields({
                                    type: 'customrecord_swc_actual_cabinet',
                                    id: bill_id,
                                    values: {
                                        custrecord_swc__pg_hw_lc_number: wayBillNumber,
                                        custrecord_swc_push_accumulation_uccess: true,
                                        custrecord_swc_pg_push_jijia_information: response_body.messages
                                    }
                                });
                                if (actual_cabinet_id) {
                                    log.debug('success', '积加单号反写成功' + actual_cabinet_id);
                                }
                                result_str.data = '推送成功';
                            } else {
                                var actual_cabinet_id = record.submitFields({
                                    type: 'customrecord_swc_actual_cabinet',
                                    id: bill_id,
                                    values: {
                                        custrecord_swc_pg_push_jijia_information: rec_data[0].remark
                                    }
                                });
                                if (actual_cabinet_id) {
                                    log.debug('error', '积加推送信息反写成功' + actual_cabinet_id);
                                }
                                result_str.data = '未返回积加单号，积加返回信息：' + rec_data[0].remark;
                            }
                        }
                    } else {
                        var actual_cabinet_id = record.submitFields({
                            type: 'customrecord_swc_actual_cabinet',
                            id: bill_id,
                            values: {
                                custrecord_swc_pg_push_jijia_information: response_body.messages
                            }
                        });
                        if (actual_cabinet_id) {
                            log.debug('error', '积加推送信息反写成功' + actual_cabinet_id);
                        }
                        result_str.data = response_body.messages;
                    }
                } else {
                    result_str.data = '构建推送body出错';
                }
            } else {
                result_str.data = '未获取到对应的三方仓信息，请检查对应的地点是否已进行维护';
            }
        } catch (e) {
            log.debug('e', e);
            result_str.data = e.message;
        }
        return result_str;
    }

    function getItemMapInfo(search_item_arr, third_loc_sp_code) {
        var item_info = {};
        search.create({
            type: 'customrecord_swc_thirdproduct_mapping',
            filters:
                [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['custrecord_swc_3pl_item', 'anyof', search_item_arr],
                    'AND',
                    ['custrecord_swc_tp_sku_map_spname', 'is', third_loc_sp_code],
                    'AND',
                    ['custrecord_swc_tp_sku_map_spname', 'isnotempty', ''],
                    "AND",
                    ['custrecord_swc_3pl_item', 'noneof', '@NONE@']
                ],
            columns:
                [
                    'custrecord_swc_tp_sku_map_thirdsku',//三方仓sku
                    'custrecord_swc_3pl_item',//货品
                    { name: 'internalid', sort: 'ASC' }
                ]
        }).run().each(function (result) {
            item_info[result.getValue(result.columns[1])] = result.getValue(result.columns[0]);
            return true;
        });
        return item_info;
    }

    function getThirdLocInfo(md_location) {
        var third_info = {};
        search.create({
            type: 'customrecord_swc_overseas_arehouse_code',
            filters:
                [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['internalid', 'anyof', md_location]
                ],
            columns:
                [
                    'custrecord_swc_loc_id',//三方仓id
                    'name',//海外仓仓库代码
                    'custrecord_swc_service_provider',//海外仓服务商
                ]
        }).run().each(function (result) {
            var warehouse_id = result.getValue(result.columns[0]);
            var warehouse_code = result.getValue(result.columns[1]);
            var third_loc_sp = result.getValue(result.columns[2]);
            var third_loc_sp_code = result.getText(result.columns[2]);
            third_info.third_loc_id = warehouse_id;
            third_info.third_loc_code = warehouse_code;
            third_info.third_loc_sp = third_loc_sp;
            third_info.third_loc_sp_code = third_loc_sp_code;
            return false;
        });
        return third_info;
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
