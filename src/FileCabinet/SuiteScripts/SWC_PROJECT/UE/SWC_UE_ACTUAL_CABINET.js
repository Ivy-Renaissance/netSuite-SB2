/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log','N/search', '../common/SWC_CONFIG_DATA'], (record, log,search, SWC_CONFIG_DATA) => {
    const CONFIG = SWC_CONFIG_DATA.configData();

    /**
     * 安全设置表单默认值（beforeLoad only）
     * 说明：这里用 form field 的 defaultValue，避免在 beforeLoad 里强行 setValue 造成某些场景覆盖用户输入。
     */
    function setDefault(form, fieldId, value) {
        try {
            const fld = form.getField({ id: fieldId });
            if (fld) fld.defaultValue = value;
        } catch (e) {
            log.debug('setDefault skip', { fieldId, value, e: String(e) });
        }
    }

    /**
     * 通用按比例分摊（参考您 splitRegions：floor + 尾差按小数部分从大到小补 1）
     * @param {number[]} regions  各行原始数量（>0）
     * @param {number} newSum     需要分摊的总数（>=0）
     * @param {number} totalRegion     各行原始数量之和
     * @returns {number[]}        分摊后的各行数量（整数，和为 newSum）
     */
    function splitByProportion(regions, newSum, totalRegion) {
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

    /**
     * Creates/updates 表单默认值 + 子列表行初始化
     */
    function beforeLoad(context) {
        try {
            if (context.type === context.UserEventType.CREATE) {

                log.debug('beforeLoad', 'CREATE');
                const req = context.request;
                const newRecord = context.newRecord;
                if (!req) return;

                let sourceId = req.parameters['record.custrecord_swc_ac_estimated_cabinet'];
                let region = req.parameters['record.custrecord_swc_ac_estimated_cabinet_line'];

                if (!sourceId) return;

                const tran = record.load({
                    type: 'customrecord_swc_estimated_cabinet',
                    id: sourceId,
                    isDynamic: false
                });

                const form = context.form;
                setDefault(form, 'custrecord_swc_ac_date', tran.getText({fieldId: 'custrecord_swc_ec_date'}) || '');
                setDefault(form, 'custrecord_swc_ac_create',
                    tran.getValue({fieldId: 'custrecord_swc_ec_create'}) || '');
                setDefault(form, 'custrecord_swc_ac_reviewer',
                    tran.getValue({fieldId: 'custrecord_swc_ec_reviewer'}) || '');
                setDefault(form, 'custrecord_swc_ac_reviewer_date',
                    tran.getText({fieldId: 'custrecord_swc_ec_reviewer_date'}) || '');

                //货好时间
                setDefault(form, 'custrecord_swc_zspgd_hhtime',
                    tran.getText({fieldId: 'custrecord_swc_ypgd_hhsj'}) || '');
                //起运港
                setDefault(form, 'custrecord_swc_zspgd_qyg',
                    tran.getValue({fieldId: 'custrecord_swc_ypgd_qyg'}) || '');
                setDefault(form, 'custrecord_swc_zspgd_dch',
                    tran.getValue({fieldId: 'custrecord_swc_ypgd_dch'}) || '');

                const subListFieldMapping = {
                    custrecord_swc_acd_po_id: 'custrecord_swc_ecd_po_no',                 // 采购订单编号
                    custrecord_swc_acd_estimated_cabine_no: 'id',                         // 预排柜明细 internal id
                    custrecord_swc_acd_item: 'custrecord_swc_ecd_item',                   // 货品
                    custrecord_swc_display_name_of_the_produ: 'custrecord_swc_ecd_item_name',// 货品名称
                    custrecord_swc_acd_vendor: 'custrecord_swc_ecd_vendor',               // 供应商
                    custrecord_swc_acd_volume: 'custrecord_swc_ecd_volume',               // 单个体积
                    custrecord_swc_acd_product_grade: 'custrecord_swc_ecd_product_grade', // 产品等级
                    custrecord_swc_acd_bom: 'custrecord_swc_ecd_bom',                     // BOM版本
                    custrecord_swc_acd_country: 'custrecord_swc_ecd_country',             // 国家
                    custrecord_swc_acd_warehouse_type: 'custrecord_swc_ecd_warehouse_type', // 仓库类型
                    custrecord_swc_acd_region: 'custrecord_swc_ecd_region',               // 区域
                    custrecord_swc_acd_po_quantity: 'custrecord_swc_ecd_po_quantity',     // 采购订单数量
                    custrecord_swc_acd_quantity: 'custrecord_swc_ecd_quantity',           // 本次预排柜数量
                    custrecord_swc_acd_main_sku: 'custrecord_swc_ecd_main_sku',
                    custrecord_swc_acd_item_o: 'custrecord_swc_ecd_item_o',                   // item
                    // custrecord_swc_acd_spo: 'custrecord_swc_spo',                   // spo
                };

                const subId = 'recmachcustrecord_swc_acd_actual_cabinet';
                const oldSubId = 'recmachcustrecord_swc_ecd_estimated_cabinet';
                const lineCount = tran.getLineCount({sublistId: oldSubId});

                let x = 0;
                for (let i = 0; i < lineCount; i++) {

                    // 获取区域，一致的区域放在一起
                    var oldRegion = tran.getSublistValue({
                        sublistId: oldSubId,
                        fieldId: 'custrecord_swc_estimated_cabine_no',
                        line: i
                    })

                    if(oldRegion == region){
                        // 真实发运（已发）
                        const zs_qty = Number(tran.getSublistValue({
                            sublistId: oldSubId,
                            fieldId: 'custrecord_swc_ecd_zs_qty',
                            line: i
                        }) || 0);

                        // 预估发运（计划）
                        const yg_qty = Number(tran.getSublistValue({
                            sublistId: oldSubId,
                            fieldId: 'custrecord_swc_ecd_quantity',
                            line: i
                        }) || 0);

                        const new_zs_qty = yg_qty - zs_qty;

                        if (new_zs_qty > 0) {

                            newRecord.setSublistValue({
                                sublistId: subId,
                                fieldId: 'custrecord_swc_acd_no',
                                line: x,
                                value: x + 1
                            });

                            for (const targetFieldId in subListFieldMapping) {
                                const sourceFieldId = subListFieldMapping[targetFieldId];
                                newRecord.setSublistValue({
                                    sublistId: subId,
                                    fieldId: targetFieldId,
                                    line: x,
                                    value: tran.getSublistValue({
                                        sublistId: oldSubId,
                                        fieldId: sourceFieldId,
                                        line: i
                                    })
                                });

                            }

                            newRecord.setSublistValue({
                                sublistId: subId,
                                fieldId: 'custrecord_swc_acd_zs_qty',
                                line: x,
                                value: new_zs_qty
                            });

                            newRecord.setSublistValue({
                                sublistId: subId,
                                fieldId: 'custrecord_zs_qty_ck',
                                line: x,
                                value: new_zs_qty
                            });

                            newRecord.setSublistValue({
                                sublistId: subId,
                                fieldId: 'custrecord_swc_acd_quantity_excellent',
                                line: x,
                                // value: new_zs_qty
                                value: 0
                            });

                            const ifQty = Number(tran.getSublistValue({
                                sublistId: oldSubId,
                                fieldId: 'custrecord_swc_ecd_if_quantity',
                                line: i
                            }) || 0);

                            const poQty = Number(tran.getSublistValue({
                                sublistId: oldSubId,
                                fieldId: 'custrecord_swc_ecd_po_quantity',
                                line: i
                            }) || 0);

                            newRecord.setSublistValue({
                                sublistId: subId,
                                fieldId: 'custrecord_swc_acd_if_quantity',
                                line: x,
                                value: ifQty
                            });

                            newRecord.setSublistValue({
                                sublistId: subId,
                                fieldId: 'custrecordswc_acd_nif_quantity',
                                line: x,
                                value: poQty - ifQty
                            });

                            newRecord.setSublistValue({
                                sublistId: subId,
                                fieldId: 'custrecord_swc_ecd_quantity_fine',
                                line: x,
                                value: 0
                            });

                            const estCabNo = tran.getSublistValue({
                                sublistId: oldSubId,
                                fieldId: 'custrecord_swc_estimated_cabine_no',
                                line: i
                            });

                            newRecord.setSublistValue({
                                sublistId: subId,
                                fieldId: 'custrecord_swc_acd_actual_cabinet_no',
                                line: x,
                                value: 'PG-' + (estCabNo || '')
                            });

                            x++;
                        }
                    }
                }
            } else {
                const form = context.form;
                const newRecord = context.newRecord;
                const type = newRecord.type;
                const id = newRecord.id;
                const curRec = record.load({
                    type: type,
                    id: id,
                    isDynamic: true
                })
                let lineCount = curRec.getLineCount({
                    sublistId: 'recmachcustrecord_swc_pg_zspgdh'
                });
                let state = curRec.getValue({
                    fieldId: 'custrecord_swc_zspgd_state'
                });
                if (lineCount == 0 && state == CONFIG.spztcw_dtj) {
                    form.addButton({
                        id: 'custpage_split_packing',
                        label: '拆分装箱明细',
                        functionName: 'splitPacking'
                    });
                }
                // 同时，我们也可以添加一个客户端脚本到表单
                form.clientScriptModulePath = CONFIG.CLIENT_SCRIPT_PATH_ACTUAL_CABINET;
            }
        } catch (e) {
            log.error('beforeLoad error', e);
        }
    }


    function afterSubmit(scriptContext) {
        try {
            log.debug('afterSubmit', scriptContext.type);
            if (scriptContext.type !== scriptContext.UserEventType.CREATE) {
                return;
            }

            const newRecord = scriptContext.newRecord;
            const recordId = newRecord.id;

            const rec = record.load({ type: 'customrecord_swc_actual_cabinet', id: recordId, isDynamic: false });
            const subId = 'recmachcustrecord_swc_acd_actual_cabinet';

            // 1) 回写 Estimated Cabinet 的 custrecord_swc_ecd_zs_qty（保留您原逻辑）
            const aecId = rec.getValue({ fieldId: 'custrecord_swc_ac_estimated_cabinet' });
            const updateJson = {};
            const line_count = rec.getLineCount({ sublistId: subId });

            // 为了后续写 memo：先把真实排柜单子表按 poId + key 建索引（避免 O(N^2) 反复扫描）
            // key = itemId_country_whType_region（与您 cabLines 的 key 一致）
            const subLineIndexMap = {}; // { [poId]: { [key]: [lineIndex,...] } }

            let zsqtySum = 0;
            let volumeSum = 0;
            // let spo ;
            for (let i = 0; i < line_count; i++) {
                const zs_qty = Number(rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_zs_qty', line: i }) || 0);
                zsqtySum = zsqtySum + zs_qty;
                const volume = Number(rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_volume', line: i }) || 0);
                volumeSum = volumeSum + (volume * zs_qty);
                log.error('volumeSum',volumeSum);
                const aecdId = rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_estimated_cabine_no', line: i });

                // 您原来取了但未使用的字段，这里保留读取不动
                const zs_quantityY = Number(rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_quantity_excellent', line: i }) || 0);
                const zs_quantityL = Number(rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_ecd_quantity_fine', line: i }) || 0);

                // 剩余可排柜数量（保留您原赋值逻辑：恒等为 0）
                const zs_qty_ck = Number(rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_zs_qty_ck', line: i }) || 0);

                rec.setSublistValue({
                    sublistId: subId,
                    fieldId: 'custrecord_zs_qty_ck',
                    value: Number(zs_qty) - Number(zs_qty),
                    line: i
                });

                if (aecdId) updateJson[aecdId] = zs_qty;

                // 建索引：poId + key -> 子表行
                const poId = rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_po_id', line: i });
                const itemId = rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_item', line: i });
                const country = rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_country', line: i });
                const whTypeId = rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_warehouse_type', line: i });
                const regionId = rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_region', line: i });

                if (poId && itemId) {
                    const key = String(itemId) + '_' + String(country) + '_' + String(whTypeId) + '_' + String(regionId);
                    if (!subLineIndexMap[poId]) subLineIndexMap[poId] = {};
                    if (!subLineIndexMap[poId][key]) subLineIndexMap[poId][key] = [];
                    subLineIndexMap[poId][key].push(i);
                }
            }
            //总真实排柜数量
            rec.setValue({
                fieldId: 'custrecord_swc_pg_zxs',
                value: zsqtySum
            });
            //总体积赋值
            rec.setValue({
                fieldId: 'custrecord_swc_pg_zyj',
                value: volumeSum
            });


            if (aecId) {
                const ecdRec = record.load({
                    type: 'customrecord_swc_estimated_cabinet',
                    id: aecId,
                    isDynamic: false
                });

                const ecdSubId = 'recmachcustrecord_swc_ecd_estimated_cabinet';
                const ecdLineCount = ecdRec.getLineCount({ sublistId: ecdSubId });
                log.debug('ecdLineCount', ecdLineCount);

                for (let x = 0; x < ecdLineCount; x++) {
                    const id = ecdRec.getSublistValue({ sublistId: ecdSubId, fieldId: 'id', line: x });
                    if (id && Object.prototype.hasOwnProperty.call(updateJson, id)) {
                        var oldZsQty = ecdRec.getSublistValue({
                            sublistId: ecdSubId,
                            fieldId: 'custrecord_swc_ecd_zs_qty',
                            line: x
                        });
                        // spo = ecdRec.getSublistValue({
                        //     sublistId: ecdSubId,
                        //     fieldId: 'custrecord_swc_spo',
                        //     line: x
                        // });

                        ecdRec.setSublistValue({
                            sublistId: ecdSubId,
                            fieldId: 'custrecord_swc_ecd_zs_qty',
                            value: Number(updateJson[id]) + Number(oldZsQty),
                            line: x
                        });
                    }
                }
                ecdRec.save({ ignoreMandatoryFields: true });

                //spo
                // rec.setValue({
                //     fieldId: 'custrecord_swc_zspgd_spo',
                //     value: spo
                // })
            }

            // 2) 真实排柜：按 poId 聚合 -> key(item_country_whType_region) -> totalQty
            const cabLines = {}; // { poId: { key: totalQty } }

            for (let j = 0; j < line_count; j++) {
                const poId = rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_po_id', line: j });
                const itemId = rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_item', line: j });
                const country = rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_country', line: j });
                const whTypeId = rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_warehouse_type', line: j });
                const regionId = rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_region', line: j });
                const qty = Number(rec.getSublistValue({ sublistId: subId, fieldId: 'custrecord_swc_acd_zs_qty', line: j }) || 0);

                if (!poId || !itemId) continue;
                if (qty === 0) continue;

                const key = String(itemId) + '_' + String(country) + '_' + String(whTypeId) + '_' + String(regionId);

                if (!cabLines[poId]) cabLines[poId] = {};
                cabLines[poId][key] = (Number(cabLines[poId][key]) || 0) + qty;
            }

            log.debug('cabLines', cabLines);

            // 3) 更新采购订单：对每个 PO，把 totalQty 分摊到匹配 key 的各 item 行，并写回 custcol_swc_ac_qty
            //    同时将本次分摊结果写入真实排柜单子表的 custrecord_swc_zs_po_memo（JSON，按 lineNo 精确记录）
            for (const poId in cabLines) {
                if (!Object.prototype.hasOwnProperty.call(cabLines, poId)) continue;

                const data = cabLines[poId]; // { key: totalQty }
                const poRec = record.load({
                    type: 'purchaseorder',
                    id: poId,
                    isDynamic: false
                });

                const poLineCount = poRec.getLineCount({ sublistId: 'item' });

                // 为每个 key 收集行（行索引、lineNo、quantity）
                const poItemQtyJson = {}; // { key: { totalQty, lines:[{lineIndex,lineNo,qty}] } }

                for (let i = 0; i < poLineCount; i++) {
                    const item = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_pr_origin_sku', line: i });
                    const loc_type = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_loc_type', line: i });
                    const country_code = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_country_code', line: i });
                    const us_districts = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_us_districts', line: i });
                    const line_no = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_line_no', line: i });
                    const quantity = Number(poRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }) || 0);

                    const grade = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_grade', line: i }) || '';
                    const key = String(item) + '_' + String(country_code) + '_' + String(loc_type) + '_' + String(us_districts);

                    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
                    if (grade) continue;

                    if (!poItemQtyJson[key]) {
                        poItemQtyJson[key] = {
                            totalQty: Number(data[key]) || 0,
                            lines: []
                        };
                    }

                    poItemQtyJson[key].lines.push({
                        lineIndex: i,
                        lineNo: line_no, // 您确认该字段在 PO 内唯一且准确
                        qty: quantity
                    });
                }

                log.debug('poItemQtyJson', poItemQtyJson);

                // 对每个 key 做分摊并回写 + 写 memo
                for (const key in poItemQtyJson) {
                    if (!Object.prototype.hasOwnProperty.call(poItemQtyJson, key)) continue;

                    const bucket = poItemQtyJson[key];
                    const totalQty = Number(bucket.totalQty) || 0;
                    const lines = bucket.lines;

                    if (!lines || lines.length === 0) continue;
                    if (totalQty === 0) continue;

                    // regions
                    var dftQty = [];
                    var dftQtyQty = 0;
                    for (let i = 0; i < lines.length; i++) {
                        const q = Number(lines[i].qty) || 0;
                        dftQty.push(q);
                        dftQtyQty += q;
                    }
                    if (dftQtyQty === 0) continue;

                    // 分摊
                    var getAry = splitByProportion(dftQty, totalQty, dftQtyQty);

                    // 回写 PO：custcol_swc_ac_qty += newQty
                    // 同时生成 memo：lineNo -> qty（只记录 qty>0 的项）
                    const allocArr = [];
                    for (let ag = 0; ag < getAry.length; ag++) {
                        var newQty = Number(getAry[ag]) || 0;
                        if (newQty === 0) continue;

                        const lineIndex = lines[ag].lineIndex;
                        const oldWlQty2 = Number(poRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_swc_ac_qty',
                            line: lineIndex
                        }) || 0);

                        poRec.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_swc_ac_qty',
                            line: lineIndex,
                            value: oldWlQty2 + newQty
                        });

                        allocArr.push({
                            lineNo: String(lines[ag].lineNo || ''),
                            qty: newQty
                        });
                    }

                    // 写 memo 到真实排柜单子表 custrecord_swc_zs_po_memo
                    // 注意：这里使用 cabLines 的 key（item_country_whType_region）与子表索引一致
                    const targetLines = (subLineIndexMap[poId] && subLineIndexMap[poId][key]) ? subLineIndexMap[poId][key] : [];
                    if (targetLines.length > 0) {
                        const memoStr = JSON.stringify({
                            poId: String(poId),
                            key: String(key),
                            allocations: allocArr
                        });

                        for (let t = 0; t < targetLines.length; t++) {
                            rec.setSublistValue({
                                sublistId: subId,
                                fieldId: 'custrecord_swc_zs_po_memo',
                                line: targetLines[t],
                                value: memoStr
                            });
                        }
                    }
                }

                poRec.save({ ignoreMandatoryFields: true });
            }

            // 保存真实排柜单（含 memo）
            rec.save({ ignoreMandatoryFields: true });

        } catch (err) {
            log.error('afterSubmit error', err);
        }
    }

    function beforeSubmit(scriptContext) {
        try {
            log.debug('beforeSubmit', scriptContext.type);

            // 只处理删除
            if (scriptContext.type !== scriptContext.UserEventType.DELETE) return;

            const oldRec = scriptContext.oldRecord;
            if (!oldRec) return;

            // ====== 固定参数（按您给的信息写死）======
            const SUBLIST_ID = 'recmachcustrecord_swc_acd_actual_cabinet';
            const MEMO_FIELD = 'custrecord_swc_zs_po_memo';
            const AECN = 'custrecord_swc_acd_estimated_cabine_no';
            const ACDQTY = 'custrecord_swc_acd_zs_qty';


            // PO 行唯一ID字段 & 需要回滚的数量字段
            const PO_LINE_NO_FIELD = 'custcol_swc_line_no';
            const PO_AC_QTY_FIELD = 'custcol_swc_ac_qty';

            // 子表（明细 custom record）的 Record Type（这里必须填“子记录的脚本ID”）
            // 例如：customrecord_swc_actual_cabinet_detail 之类
            // 您如果不填正确的 type，record.delete 会删不掉，父单仍会因关联而无法删除。
            const CHILD_REC_TYPE = 'customrecord_swc_actual_cabinet_detail'; // <-- 这里改成您的子表自定义记录脚本ID

            function toNumber(v) {
                if (v === null || v === undefined || v === '') return 0;
                const n = Number(v);
                return Number.isFinite(n) ? n : 0;
            }

            // ====== 0) 先把子表行的 internal id 收集出来（后面要 delete）======
            // 子表行通常有 fieldId='id' 可取到子记录 internalid；取不到时尝试 'internalid'
            const lineCount = oldRec.getLineCount({ sublistId: SUBLIST_ID }) || 0;
            const childIds = [];

            for (let i = 0; i < lineCount; i++) {
                const childId =
                    oldRec.getSublistValue({ sublistId: SUBLIST_ID, fieldId: 'id', line: i }) ||
                    oldRec.getSublistValue({ sublistId: SUBLIST_ID, fieldId: 'internalid', line: i });

                if (childId) childIds.push(String(childId));
            }

            // ====== 1) 从 memo 构建回滚映射：{ [poId]: { [lineNo]: qtySum } } ======
            const rollbackMap = {};

            var yPgQtyJson = {};

            for (let i = 0; i < lineCount; i++) {
                const memoStr = oldRec.getSublistValue({
                    sublistId: SUBLIST_ID,
                    fieldId: MEMO_FIELD,
                    line: i
                });
                if (!memoStr) continue;

                let obj;
                try {
                    obj = JSON.parse(memoStr);
                } catch (e) {
                    throw error.create({
                        name: 'INVALID_MEMO_JSON',
                        message: `删除被阻止：子表第 ${i + 1} 行 ${MEMO_FIELD} 不是合法JSON。`,
                        notifyOff: false
                    });
                }

                const poId = obj && obj.poId ? String(obj.poId) : '';
                const allocations = obj && Array.isArray(obj.allocations) ? obj.allocations : [];
                if (!poId || allocations.length === 0) continue;

                if (!rollbackMap[poId]) rollbackMap[poId] = {};

                for (const a of allocations) {
                    const lineNo = a && a.lineNo !== undefined ? String(a.lineNo) : '';
                    const qty = toNumber(a && a.qty);
                    if (!lineNo || qty === 0) continue;

                    rollbackMap[poId][lineNo] = toNumber(rollbackMap[poId][lineNo]) + qty;
                }

                const aecnId = oldRec.getSublistValue({
                    sublistId: SUBLIST_ID,
                    fieldId: AECN,
                    line: i
                });

                const acdQty = oldRec.getSublistValue({
                    sublistId: SUBLIST_ID,
                    fieldId: ACDQTY,
                    line: i
                });

                yPgQtyJson[aecnId] = acdQty
            }

            log.debug('rollbackMap', rollbackMap);

            for (const yPgQtyJsonKey in yPgQtyJson) {

                var objRecord = record.load({
                    type: 'customrecord_swc_estimated_cabine_detail',
                    id: yPgQtyJsonKey,
                    isDynamic: true
                });

                var oldQty = objRecord.getValue('custrecord_swc_ecd_zs_qty');
                objRecord.setValue({ fieldId: 'custrecord_swc_ecd_zs_qty', value: Number(oldQty) - Number(yPgQtyJson[yPgQtyJsonKey]) });

                objRecord.save();
            }

            // ====== 2) 逐 PO 回滚：custcol_swc_ac_qty = custcol_swc_ac_qty - qty ======
            for (const poId in rollbackMap) {
                if (!Object.prototype.hasOwnProperty.call(rollbackMap, poId)) continue;

                const lineNoQtyMap = rollbackMap[poId];

                const poRec = record.load({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    isDynamic: false
                });

                const poLineCount = poRec.getLineCount({ sublistId: 'item' }) || 0;

                // 建索引：custcol_swc_line_no -> 行索引
                const idx = {};
                for (let l = 0; l < poLineCount; l++) {
                    const ln = poRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: PO_LINE_NO_FIELD,
                        line: l
                    });
                    if (ln !== null && ln !== undefined && ln !== '') idx[String(ln)] = l;
                }

                const lineNos = Object.keys(lineNoQtyMap || {});
                for (let k = 0; k < lineNos.length; k++) {
                    const lineNo = String(lineNos[k]);
                    const backQty = toNumber(lineNoQtyMap[lineNo]);
                    if (backQty === 0) continue;

                    const lineIndex = idx[lineNo];
                    if (lineIndex === undefined) {
                        throw error.create({
                            name: 'PO_LINE_NOT_FOUND',
                            message: `删除被阻止：PO(${poId}) 找不到行ID ${PO_LINE_NO_FIELD}=${lineNo}，无法回滚。`,
                            notifyOff: false
                        });
                    }

                    const cur = toNumber(poRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: PO_AC_QTY_FIELD,
                        line: lineIndex
                    }));

                    const newVal = cur - backQty;
                    if (newVal < 0) {
                        throw error.create({
                            name: 'ROLLBACK_NEGATIVE',
                            message: `删除被阻止：PO(${poId}) 行ID(${lineNo}) 回滚后为负数。当前=${cur}，回滚=${backQty}。`,
                            notifyOff: false
                        });
                    }

                    poRec.setSublistValue({
                        sublistId: 'item',
                        fieldId: PO_AC_QTY_FIELD,
                        line: lineIndex,
                        value: newVal
                    });
                }

                poRec.save({ enableSourcing: true, ignoreMandatoryFields: true });
            }

            // ====== 3) 删除子表自定义记录（否则父单会因关联无法删除）======
            // 注意：这里是“直接删子记录”。如果您希望保留历史，请改成置无效标记而不是 delete。
            // 同一子记录 id 可能重复出现在列表里（极少见），这里做去重。
            const uniq = {};
            for (let i = 0; i < childIds.length; i++) {
                const id = childIds[i];
                if (!id || uniq[id]) continue;
                uniq[id] = true;

                record.delete({
                    type: CHILD_REC_TYPE,
                    id: id
                });
            }

            // beforeSubmit(DELETE) 不抛错即允许删除继续（NetSuite 会继续删除父记录）
        } catch (err) {
            log.error('beforeSubmit DELETE rollback error', err);
            throw err; // 抛错阻止删除，确保“回滚/清理成功后才允许删除”
        }
    }

    return { beforeLoad, afterSubmit, beforeSubmit };
});