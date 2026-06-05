
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @description 采购需求汇总表保存UE，汇总采购需求明细表上各个国家+仓库类型的需求总数到采购需求汇总表上
 */
define(['N/record', 'N/search', 'N/config', '../common/moment'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search, config, moment) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (context) => {
            try {
                if (context.type === context.UserEventType.DELETE) {
                    // 删除时要删除提货分配记录
                    var sdpRecord = context.newRecord;
                    var sdpId = sdpRecord.id;

                    deleteOldAllocations(sdpId);
                }

            } catch (error) {
                log.error('error', error)
            }

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (context) => {
            try {
                if (context.type === context.UserEventType.EDIT || context.type === context.UserEventType.CREATE) {
                    // 编辑时先删除旧的分配记录，再重新分配
                    var sdpRecord = context.newRecord;
                    var sdpId = sdpRecord.id;
                    var oldRec = context.oldRecord;
                    var old_quantity = (oldRec && oldRec.getValue('custrecord_swc_sdp_quantity')) || 0;
                    var sdp_quantity = sdpRecord.getValue('custrecord_swc_sdp_quantity');

                    if (old_quantity != sdp_quantity && sdp_quantity > 0) {
                        deleteOldAllocations(sdpId);
                        var result = allocateQuantity(sdpRecord);
                        if (!result.success) {
                            log.error('提货计划重新分配失败', result.error);
                        }
                    } else {
                        // log.debug('提货计划数量没变，不用分配');
                    }



                }

            } catch (error) {
                log.error('error', error)
            }

        }

        // 自定义记录类型ID（需要根据实际配置修改）
        const ALLOCATION_RECORD_TYPE = 'customrecord_swc_sdp_allocation'; // 分配记录类型

        // 字段ID映射
        const FIELD_IDS = {
            // 提货计划字段
            SDP_QUANTITY: 'custrecord_swc_sdp_quantity',
            SDP_STORE: 'custrecord_swc_sdp_store',
            SDP_COUNTRY: 'custrecord_swc_sdp_country',
            SDP_LOC_TYPE: 'custrecord_swc_sdp_location_type',
            SDP_SKU: 'custrecord_swc_sdp_sku',
            SDP_US_WEST_QTY: 'custrecord_swc_sdp_us_west_qty',
            SDP_US_EAST_QTY: 'custrecord_swc_sdp_us_east_qty',
            SDP_US_CENTER_QTY: 'custrecord_swc_sdp_us_center_qty',
            SDP_US_SOUTHWEST_QTY: 'custrecord_swc_sdp_us_southwest_qty',
            SDP_US_SOUTHEAST_QTY: 'custrecord_swc_sdp_us_southeast_qty',
            SDP_CA_EAST_QTY: 'custrecord_swc_sdp_ca_east_qty',
            SDP_CA_WEST_QTY: 'custrecord_swc_sdp_ca_west_qty',

            // 分配记录字段
            ALLOC_PO_NUM: 'custrecord_swc_alloc_po_number',
            ALLOC_VENDOR: 'custrecord_swc_alloc_vendor',
            ALLOC_SKU: 'custrecord_swc_alloc_sku',
            ALLOC_ORIGIN_SKU: 'custrecord_swc_alloc_sku_origin',
            ALLOC_LOC_TYPE: 'custrecord_swc_alloc_loc_type',
            ALLOC_COUNTRY: 'custrecord_swc_alloc_country',
            ALLOC_QUANTITY: 'custrecord_swc_alloc_quantity',
            ALLOC_PO_QUANTITY: 'custrecord_swc_alloc_po_quantity',
            ALLOC_UNPG_QUANTITY: 'custrecord_swc_alloc_unpg_quantity',
            ALLOC_UNRECEIPT_QUANTITY: 'custrecord_swc_alloc_unrecv_quantity',
            ALLOC_DISTRICT: 'custrecord_swc_alloc_district',
            ALLOC_SDP_ID: 'custrecord_swc_alloc_sdp_id',
            ALLOC_STORE: 'custrecord_swc_alloc_store',
            ALLOC_DEMAND_PLAN: 'custrecord_swc_alloc_demand_plan'


        };

        // 分区枚举值
        const DISTRICTS = {
            US: ['1', '2', '3', '5', '4'],//['美西', '美东', '美中', '美西南', '美东南'],
            CA: ['6', '7']//['加东', '加西']
        };

        /**
         * 创建分配记录
         */
        function createAllocationRecord(params) {
            try {
                log.debug('createAllocationRecord params', params)
                var allocRecord = record.create({
                    type: ALLOCATION_RECORD_TYPE
                });

                allocRecord.setValue(FIELD_IDS.ALLOC_PO_NUM, params.id);
                allocRecord.setValue(FIELD_IDS.ALLOC_SKU, params.sku);
                allocRecord.setValue(FIELD_IDS.ALLOC_LOC_TYPE, params.locationType);
                allocRecord.setValue(FIELD_IDS.ALLOC_COUNTRY, params.country);
                allocRecord.setValue(FIELD_IDS.ALLOC_QUANTITY, params.quantity);
                allocRecord.setValue(FIELD_IDS.ALLOC_DISTRICT, params.district);
                allocRecord.setValue(FIELD_IDS.ALLOC_SDP_ID, params.sdpId);
                allocRecord.setValue(FIELD_IDS.ALLOC_VENDOR, params.vendor);
                allocRecord.setValue(FIELD_IDS.ALLOC_ORIGIN_SKU, params.oringin_sku);
                allocRecord.setValue(FIELD_IDS.ALLOC_STORE, params.store);
                allocRecord.setValue(FIELD_IDS.ALLOC_DEMAND_PLAN, params.demand_plan);
                allocRecord.setValue(FIELD_IDS.ALLOC_PO_QUANTITY, params.po_quantity);
                allocRecord.setValue(FIELD_IDS.ALLOC_UNPG_QUANTITY, params.unpg_quantity);
                allocRecord.setValue(FIELD_IDS.ALLOC_UNRECEIPT_QUANTITY, params.unreceipt_quantity);
                allocRecord.setValue('custrecord_swc_alloc_po_number_text', params.poNumber);
                allocRecord.setValue('custrecord_swc_alloc_bom', params.bom);
                params.expectedreceiptdate && allocRecord.setText({ fieldId: 'custrecord_swc_alloc_expectedreceiptdate', text: params.expectedreceiptdate });



                var recordId = allocRecord.save();
                // log.audit('分配记录已创建', {
                //     '记录ID': recordId,
                //     '参数': params
                // });

                return recordId;
            } catch (e) {
                log.error('创建分配记录失败', e);
                throw e;
            }
        }

        /**
         * 搜索采购订单明细行
         */
        function searchPOLines(filters) {
            var general_preferences = config.load({ type: config.Type.COMPANY_PREFERENCES });
            var dateFormat = general_preferences.getValue({ fieldId: 'DATEFORMAT' });
            log.debug('dateFormat', dateFormat);
            const NextMonthEnd = moment().add(16, 'hours').add('1', 'months').endOf('month').format(dateFormat);
            log.debug('NextMonthEnd', NextMonthEnd)
            log.debug('filters', filters)
            var myfilters = [
                // { name: 'datecreated', operator: search.Operator.ONORAFTER, values: '2026-04-20' },
                { name: 'closed', operator: search.Operator.IS, values: false },
                { name: 'status', operator: search.Operator.ANYOF, values: ['PurchOrd:E', 'PurchOrd:B', 'PurchOrd:D'] },
                { name: 'mainline', operator: search.Operator.IS, values: false },
                { name: 'taxline', operator: search.Operator.IS, values: false },
                { name: 'shipping', operator: search.Operator.IS, values: false },
                // { name: 'custrecord_swc_dp_batch_month', join: 'custcol_swc_beihuo_plan', operator: search.Operator.IS, values: 'BH-202604' },
                { name: 'representingsubsidiary', join: 'vendor', operator: search.Operator.ANYOF, values: '@NONE@' },
                // { name: 'expectedreceiptdate', operator: search.Operator.ONORBEFORE, values: NextMonthEnd },
                { name: 'custcol_swc_pr_origin_sku', operator: search.Operator.IS, values: filters.sku },
                { name: 'custcol_swc_pr_main_sku', operator: search.Operator.IS, values: true },
                { name: 'custcol_swc_store', operator: search.Operator.IS, values: filters.store },
                { name: 'custcol_swc_country_code', operator: search.Operator.IS, values: filters.country },
                { name: 'custcol_swc_loc_type', operator: search.Operator.IS, values: filters.locationType },
                { name: 'formulanumeric', formula: "{quantity}-{quantityshiprecv}", operator: search.Operator.GREATERTHAN, values: 0 },
            ]
            log.debug('myfilters', myfilters)
            var poLineSearch = search.create({
                type: search.Type.PURCHASE_ORDER,
                filters: myfilters,
                columns: [
                    search.createColumn({ name: 'formulanumeric', formula: "{quantity}-{quantityshiprecv}" }),
                    search.createColumn({ name: 'formulanumeric', formula: "{quantity}-NVL({custcol_swc_ac_qty}, 0)" }),
                    search.createColumn({ name: 'internalid', label: '内部ID' }),
                    search.createColumn({ name: 'line', label: '行ID' }),
                    search.createColumn({ name: 'tranid', label: '采购订单号' }),
                    search.createColumn({ name: 'internalid', join: 'vendor', label: '供应商' }),
                    search.createColumn({ name: 'item', label: 'SKU' }),
                    search.createColumn({ name: 'custcol_swc_pr_origin_sku', label: 'ORIGIN SKU' }),
                    search.createColumn({ name: 'quantity', label: '数量' }),
                    search.createColumn({ name: 'custcol_swc_store', label: '店铺' }),
                    search.createColumn({ name: 'custcol_swc_country_code', label: '国家' }),
                    search.createColumn({ name: 'custcol_swc_loc_type', label: '仓库类型' }),
                    search.createColumn({ name: 'custcol_swc_beihuo_plan', label: '备货计划' }),
                    search.createColumn({ name: 'custcol_swc_us_districts', label: '分区' }),
                    search.createColumn({ name: 'custcol_swc_bom_list', label: 'BOM' }),
                    search.createColumn({ name: 'expectedreceiptdate', label: '预计接收时间', sort: search.Sort.ASC })


                ]
            });

            var results = [];
            poLineSearch.run().each(function (result) {
                // log.debug('poLineSearch result', result);
                var line = {
                    id: result.id,
                    lineid: result.getValue('line'),
                    poNumber: result.getValue('tranid'),
                    vendor: result.getValue({ name: 'internalid', join: 'vendor', label: '供应商' }),
                    oringin_sku: result.getValue('custcol_swc_pr_origin_sku'),
                    sku: result.getValue('item'),
                    po_quantity: parseFloat(result.getValue('quantity')),
                    store: result.getValue('custcol_swc_store'),
                    country: result.getValue('custcol_swc_country_code'),
                    locationType: result.getValue('custcol_swc_loc_type'),
                    demand_plan: result.getValue('custcol_swc_beihuo_plan'),
                    district: result.getValue('custcol_swc_us_districts'),
                    bom: result.getValue('custcol_swc_bom_list'),
                    expectedreceiptdate: result.getValue('expectedreceiptdate'),
                    quantity: parseFloat(result.getValue(result.columns[0])),//未接收数量
                    unpg_quantity: parseFloat(result.getValue(result.columns[1]))//未真实排柜数量
                };


                // 如果指定了分区，只返回匹配的分区
                // if (!filters.district || line.district === filters.district) {
                //     results.push(line);
                // }
                results.push(line);

                return true;
            });

            return results;
        }

        /**
         * 分配提货数量到采购订单
         */
        function allocateQuantity(sdpRecord) {
            try {
                var sdpId = sdpRecord.id;
                var totalQuantity = sdpRecord.getValue(FIELD_IDS.SDP_QUANTITY);
                var store = sdpRecord.getValue(FIELD_IDS.SDP_STORE);
                var country = sdpRecord.getValue(FIELD_IDS.SDP_COUNTRY);
                var locationType = sdpRecord.getValue(FIELD_IDS.SDP_LOC_TYPE);
                var sku = sdpRecord.getValue(FIELD_IDS.SDP_SKU);

                var remainingQuantity = totalQuantity;
                var allocationResults = [];

                log.audit('开始分配提货计划', {
                    '提货计划ID': sdpId,
                    'SKU': sku,
                    '总数量': totalQuantity,
                    '国家': country,
                    '仓库类型': locationType,
                    'store': store
                });

                // if (country === '1' && locationType === '1') {
                //     // 处理美国3PL仓库，按五个分区分配
                //     var usDistrictQtys = {
                //         '1': parseFloat(sdpRecord.getValue(FIELD_IDS.SDP_US_WEST_QTY) || 0),
                //         '2': parseFloat(sdpRecord.getValue(FIELD_IDS.SDP_US_EAST_QTY) || 0),
                //         '3': parseFloat(sdpRecord.getValue(FIELD_IDS.SDP_US_CENTER_QTY) || 0),
                //         '5': parseFloat(sdpRecord.getValue(FIELD_IDS.SDP_US_SOUTHWEST_QTY) || 0),
                //         '4': parseFloat(sdpRecord.getValue(FIELD_IDS.SDP_US_SOUTHEAST_QTY) || 0)
                //     };

                //     for (var district in usDistrictQtys) {
                //         var districtQty = usDistrictQtys[district];
                //         if (districtQty > 0) {
                //             var allocation = allocateByDistrict({
                //                 sdpId: sdpId,
                //                 sku: sku,
                //                 locationType: locationType,
                //                 country: country,
                //                 district: district,
                //                 targetQuantity: districtQty,
                //                 store: store
                //             });

                //             allocationResults = allocationResults.concat(allocation);
                //             remainingQuantity -= allocation.totalAllocated;
                //         }
                //     }
                // } else if (country === '2' && locationType === '1') {
                //     // 处理加拿大3PL仓库，按两个分区分配
                //     var caDistrictQtys = {
                //         '6': parseFloat(sdpRecord.getValue(FIELD_IDS.SDP_CA_EAST_QTY) || 0),
                //         '7': parseFloat(sdpRecord.getValue(FIELD_IDS.SDP_CA_WEST_QTY) || 0)
                //     };

                //     for (var district in caDistrictQtys) {
                //         var districtQty = caDistrictQtys[district];
                //         if (districtQty > 0) {
                //             var allocation = allocateByDistrict({
                //                 sdpId: sdpId,
                //                 sku: sku,
                //                 locationType: locationType,
                //                 country: country,
                //                 district: district,
                //                 targetQuantity: districtQty,
                //                 store: store
                //             });

                //             allocationResults = allocationResults.concat(allocation);
                //             remainingQuantity -= allocation.totalAllocated;
                //         }
                //     }
                // } else 
                {
                    // 处理非3PL仓库（不分区域）// 全部按不分区计算，提货分配按原采购分区分配数据
                    var allocation = allocateNon3PL({
                        sdpId: sdpId,
                        sku: sku,
                        locationType: locationType,
                        country: country,
                        targetQuantity: totalQuantity,
                        store: store
                    });

                    allocationResults = allocationResults.concat(allocation);
                    remainingQuantity -= allocation.totalAllocated;
                }

                // 记录分配结果摘要
                log.audit('提货计划分配完成', {
                    '提货计划ID': sdpId,
                    '总需求数量': totalQuantity,
                    '已分配数量': totalQuantity - remainingQuantity,
                    '剩余未分配数量': remainingQuantity,
                    '创建分配记录数': allocationResults.length
                });

                return {
                    success: true,
                    allocated: totalQuantity - remainingQuantity,
                    remaining: remainingQuantity,
                    allocations: allocationResults
                };
            } catch (e) {
                log.error('分配失败', e);
                return {
                    success: false,
                    error: e.message
                };
            }
        }

        /**
         * 按分区分配数量
         */
        function allocateByDistrict(params) {
            var allocations = [];
            var remainingQty = params.targetQuantity;

            // 搜索匹配的采购订单明细行
            var poLines = searchPOLines({
                sku: params.sku,
                locationType: params.locationType,
                country: params.country,
                district: params.district,
                store: params.store
            });
            log.debug('poLines', poLines)

            // 按采购订单号排序（可改为按创建时间等排序）
            // poLines.sort(function (a, b) {
            //     return a.poNumber.localeCompare(b.poNumber);
            // });

            for (var i = 0; i < poLines.length && remainingQty > 0; i++) {
                var poLine = poLines[i];
                log.debug('poLine', poLine)
                var allocQty = Math.min(remainingQty, poLine.quantity);

                // 创建分配记录
                var allocRecordId = createAllocationRecord({
                    id: poLine.id,
                    poNumber: poLine.poNumber,
                    vendor: poLine.vendor,
                    oringin_sku: poLine.oringin_sku,
                    sku: poLine.sku,
                    locationType: poLine.locationType,
                    country: poLine.country,
                    quantity: allocQty,//分配数量
                    po_quantity: poLine.po_quantity,//订单数量
                    unpg_quantity: poLine.unpg_quantity,//未真实排柜数量
                    unreceipt_quantity: poLine.quantity,//未接收数量
                    store: poLine.store,
                    demand_plan: poLine.demand_plan,
                    expectedreceiptdate: poLine.expectedreceiptdate,
                    district: poLine.district,
                    sdpId: params.sdpId
                });

                allocations.push({
                    poNumber: poLine.poNumber,
                    poLineId: poLine.id,
                    quantity: allocQty,
                    allocationId: allocRecordId
                });
                log.debug('remainingQty 1', remainingQty)
                remainingQty -= allocQty;
                log.debug('remainingQty 2', remainingQty)
            }

            return {
                district: params.district,
                targetQuantity: params.targetQuantity,
                allocatedQuantity: params.targetQuantity - remainingQty,
                totalAllocated: params.targetQuantity - remainingQty,
                allocations: allocations
            };
        }

        /**
         * 分配非3PL仓库数量
         */
        function allocateNon3PL(params) {
            var allocations = [];
            var remainingQty = params.targetQuantity;

            // 搜索匹配的采购订单明细行
            var poLines = searchPOLines({
                sku: params.sku,
                locationType: params.locationType,
                country: params.country,
                store: params.store
            });
            log.debug('poLines', poLines)

            // poLines.sort(function (a, b) {
            //     return a.poNumber.localeCompare(b.poNumber);
            // });

            for (var i = 0; i < poLines.length && remainingQty > 0; i++) {
                var poLine = poLines[i];
                var allocQty = Math.min(remainingQty, poLine.quantity);

                // 创建分配记录
                var allocRecordId = createAllocationRecord({
                    id: poLine.id,
                    poNumber: poLine.poNumber,
                    vendor: poLine.vendor,
                    oringin_sku: poLine.oringin_sku,
                    sku: poLine.sku,
                    locationType: poLine.locationType,
                    country: poLine.country,
                    quantity: allocQty,//分配数量
                    po_quantity: poLine.po_quantity,//订单数量
                    unpg_quantity: poLine.unpg_quantity,//未真实排柜数量
                    unreceipt_quantity: poLine.quantity,//未接收数量
                    store: poLine.store,
                    demand_plan: poLine.demand_plan,
                    expectedreceiptdate: poLine.expectedreceiptdate,
                    district: poLine.district,
                    bom: poLine.bom,
                    sdpId: params.sdpId
                });

                allocations.push({
                    poNumber: poLine.poNumber,
                    poLineId: poLine.id,
                    quantity: allocQty,
                    allocationId: allocRecordId
                });

                remainingQty -= allocQty;
            }

            return {
                targetQuantity: params.targetQuantity,
                allocatedQuantity: params.targetQuantity - remainingQty,
                totalAllocated: params.targetQuantity - remainingQty,
                allocations: allocations
            };
        }

        /**
         * 删除旧的分配记录
         */
        function deleteOldAllocations(sdpId) {
            try {
                var mysearch = search.create({
                    type: ALLOCATION_RECORD_TYPE,
                    filters: [
                        [FIELD_IDS.ALLOC_SDP_ID, 'is', sdpId]
                    ],
                    columns: ['internalid']
                });

                var ids = [];
                mysearch.run().each(function (result) {
                    ids.push(result.id);
                    return true;
                });

                for (var i = 0; i < ids.length; i++) {
                    record.delete({
                        type: ALLOCATION_RECORD_TYPE,
                        id: ids[i]
                    });
                }

                log.audit('删除旧分配记录', {
                    '提货计划ID': sdpId,
                    '删除记录数': ids.length
                });
            } catch (e) {
                log.error('删除旧分配记录失败', e);
            }
        }


        return { beforeLoad, beforeSubmit, afterSubmit }

    });

