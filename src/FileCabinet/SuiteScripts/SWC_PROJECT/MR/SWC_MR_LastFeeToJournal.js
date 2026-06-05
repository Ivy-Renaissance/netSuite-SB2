/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/search", "N/record", "N/runtime", "N/query", "N/format", "../common/SWC_Utils.js"],
    (search, record, runtime, query, format, SWC_Utils) => {

        const getInputData = (inputContext) => {
            try  {
                let startTime = new Date();
                let dataJson = getJournalData();
                log.audit("getJournalData running time", new Date() - startTime);

                log.audit('dataJson',dataJson);
                // 将分组后的数据转换为MapReduce可迭代的键值对数组
                // let inputArray = [];
                // for (let mainId in dataJson) {
                //     inputArray.push({
                //         key: mainId,
                //         value: dataJson[mainId]
                //     });
                // }
                // log.audit('inputArray',inputArray);
                return dataJson;
            } catch (e) {
                log.error('错误信息',e.message);
            }
        }

        // const map = (mapContext) => {
        //     // 直接转发给reduce
        //     mapContext.write(mapContext.key, mapContext.value);
        // }

        const reduce = (reduceContext) => {
            let mainId = reduceContext.key;
            let value = JSON.parse(reduceContext.values);
            let billIds = [];
            let creditIds = [];
            let scriptObj = runtime.getCurrentScript();
            let billed = scriptObj.getParameter({name: "custscript_swc_mr_fee_status_billed"});
            try {
                if (SWC_Utils.isEmpty(value)) return;
                let dataJson = value;

                // 创建账单（如果存在）
                if (dataJson.bill && !SWC_Utils.isEmpty(dataJson.bill)) {
                    let billId = createRecord(dataJson.bill.body, dataJson.bill.lines, record.Type.VENDOR_BILL);
                    log.audit('billId',billId);
                    if (!SWC_Utils.isEmpty(billId)) billIds.push(billId);
                }
                // 创建贷项（如果存在）
                if (dataJson.credit && !SWC_Utils.isEmpty(dataJson.credit)) {
                    let creditId = createRecord(dataJson.credit.body, dataJson.credit.lines, record.Type.VENDOR_CREDIT);
                    if (!SWC_Utils.isEmpty(creditId)) creditIds.push(creditId);
                }

                let rewriteValues = {};
                if (!SWC_Utils.isEmpty(billIds)) rewriteValues.custrecord_swc_lastmile_journal = billIds;
                if (!SWC_Utils.isEmpty(creditIds)) rewriteValues.custrecord_swc_lastmile_journal2 = creditIds;
                rewriteValues.custrecord_swc_lastmile_mistakememo = "";
                rewriteValues.custrecord_swc_lastmile_status = billed;

                log.audit('rewriteValues',rewriteValues);
                if (!SWC_Utils.isEmpty(rewriteValues)) {
                    record.submitFields({
                        type: "customrecord_swc_lastmile_fees",
                        id: mainId,
                        values: rewriteValues
                    });
                }
            } catch (e) {
                log.error("Error in reduce for mainId " + mainId, e);
                if (!SWC_Utils.isEmpty(billIds)) deleteRecords(billIds, record.Type.VENDOR_BILL);
                if (!SWC_Utils.isEmpty(creditIds)) deleteRecords(creditIds, record.Type.VENDOR_CREDIT);
                record.submitFields({
                    type: "customrecord_swc_lastmile_fees",
                    id: mainId,
                    values: { custrecord_swc_lastmile_mistakememo: e.message || e }
                });
            }
        }

        const summarize = (summaryContext) => {
            // 可添加日志统计
        }

        /**
         * 获取主记录及其明细，按主记录分组，返回结构：
         * {
         *   mainId: {
         *     bill: { body: {...}, lines: [{...}, ...] },   // 正数明细组
         *     credit: { body: {...}, lines: [{...}, ...] }  // 负数明细组（金额取绝对值）
         *   }
         * }
         */
        function getJournalData() {
            let groupedData = {};
            let scriptObj = runtime.getCurrentScript();
            let applied = scriptObj.getParameter({name: "custscript_swc_mr_fee_status_applied"});
            let taxCode = scriptObj.getParameter({name: "custscript_swc_mr_tax_code"});
            let bodyAccount = scriptObj.getParameter({name: "custscript_swc_mr_account"});
            let poType = scriptObj.getParameter({name: "custscript_swc_mr_po_type"});

            let lastMileFeeSql = "SELECT \n" +
                "  CUSTOMRECORD_SWC_LASTMILE_FEES.id AS id, \n" + // 内部id
                "  CUSTOMRECORD_SWC_LASTMILE_FEES.custrecord_swc_lastmile_company AS custrecord_swc_lastmile_company, \n" + // 子公司
                "  CUSTOMRECORD_SWC_LASTMILE_FEES.custrecord_swc_lastmile_currency AS custrecord_swc_lastmile_currency, \n" + // 货币
                "  CUSTOMRECORD_SWC_LASTMILE_FEES.custrecord_swc_lastmile_date AS custrecord_swc_lastmile_date, \n" + // 日期
                "  CUSTOMRECORD_SWC_LASTMILE_FEES.custrecord_swc_lastmile_feetypes AS custrecord_swc_lastmile_feetypes, \n" + // 尾程费用类型
                "  CUSTOMRECORD_SWC_LASTMILE_FEES.custrecord_swc_lastmile_memo AS custrecord_swc_lastmile_memo, \n" + // 备注
                "  CUSTOMRECORD_SWC_LASTMILE_FEES.custrecord_swc_ilastmile_vendor AS custrecord_swc_ilastmile_vendor, \n" + // 供应商
                "  CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_type AS custrecord_swc_lastmile_type, \n" + // 尾程各类费用明细 : 尾程费用_费用细项
                "  CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_po AS custrecord_swc_lastmile_po, \n" + // 尾程各类费用明细 : 尾程费用_采购单号/仓租单号
                "  CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_track AS custrecord_swc_lastmile_track, \n" + // 尾程各类费用明细 : 尾程费用_跟踪号
                "  CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_sku AS custrecord_swc_lastmile_sku, \n" + // 尾程各类费用明细 : 尾程费用_SKU
                "  CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_place AS custrecord_swc_lastmile_place, \n" + // 尾程各类费用明细 : 尾程费用_仓库
                "  CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_jfdate AS custrecord_swc_lastmile_jfdate, \n" + // 尾程各类费用明细 : 尾程费用_计费日期
                "  CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_receipt AS custrecord_swc_lastmile_receipt, \n" + // 尾程各类费用明细 : 尾程费用_入库单号
                "  CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_quantity AS custrecord_swc_lastmile_quantity, \n" + // 尾程各类费用明细 : 尾程费用_SKU数量
                "  CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_abnormal AS custrecord_swc_lastmile_abnormal, \n" + // 尾程各类费用明细 : 尾程费用_异常
                "  CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_memo2 AS custrecord_swc_lastmile_memo2, \n" + // 尾程各类费用明细 : 尾程费用_备注
                "  CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.id AS line_rec_id, \n" + // 尾程各类费用明细 : 内部id
                "  CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_amount AS custrecord_swc_lastmile_amount\n" + // 尾程各类费用明细 : 尾程费用_金额
                "FROM \n" +
                "  CUSTOMRECORD_SWC_LASTMILE_FEES \n" +
                "  left join CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS on CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_main = CUSTOMRECORD_SWC_LASTMILE_FEES.id\n" +
                "WHERE \n" +
                "BUILTIN.MNFILTER(CUSTOMRECORD_SWC_LASTMILE_FEES.custrecord_swc_lastmile_journal, 'MN_INCLUDE_EXACTLY', '', 'TRUE', NULL) = 'T'" + // 尾程费用-生成账单 等于 无
                "AND BUILTIN.MNFILTER(CUSTOMRECORD_SWC_LASTMILE_FEES.custrecord_swc_lastmile_journal2, 'MN_INCLUDE_EXACTLY', '', 'TRUE', NULL) = 'T'" + // AND 尾程费用-生成贷项 等于 无
                "AND NVL(CUSTOMRECORD_SWC_LASTMILE_FEES.isinactive, 'F') = 'F' " + // AND 非活动 是错的
                "AND CUSTOMRECORD_SWC_LASTMILE_FEES.custrecord_swc_lastmile_status in ('" + applied + "')"; // 状态 为 差异已审批

            let sqlResults = SWC_Utils.getAllSqlResults(lastMileFeeSql);
            if (SWC_Utils.isEmpty(sqlResults)) return {};

            log.audit("lastMileFeeSqlResults.length", sqlResults.length);

            // 收集需要查询的货品和供应商ID
            let itemIds = new Set();
            let vendorIds = new Set();

            // 第一遍遍历：按主记录分组，按正负分离明细行
            for (let row of sqlResults) {
                let mainId = row.id;
                let amount = parseFloat(row.custrecord_swc_lastmile_amount) || 0;
                if (amount === 0) continue; // 金额为0的行不生成任何单据

                if (!groupedData[mainId]) {
                    groupedData[mainId] = {
                        billLines: [],   // 正数明细
                        creditLines: [], // 负数明细（存储绝对值）
                        body: null
                    };
                }
                let group = groupedData[mainId];

                // 记录body信息（只需一次）
                if (!group.body) {
                    group.body = {
                        entity: row.custrecord_swc_ilastmile_vendor,
                        subsidiary: row.custrecord_swc_lastmile_company,
                        currency: row.custrecord_swc_lastmile_currency,
                        trandate: row.custrecord_swc_lastmile_date,
                        duedate: "",
                        account: bodyAccount,
                        memo: row.custrecord_swc_lastmile_memo,
                        custbody_swc_order_type2: poType
                    };
                    vendorIds.add(row.custrecord_swc_ilastmile_vendor);
                }

                // 构建明细行对象（注意：账单和贷项的行字段相同，金额用绝对值）
                let line = {
                    item: row.custrecord_swc_lastmile_type,
                    quantity: 1,
                    taxcode: taxCode,
                    rate: Math.abs(amount),
                    origrate: Math.abs(amount),
                    amount: Math.abs(amount),
                    custcol_swc_lastmile_po1: row.custrecord_swc_lastmile_po || "",
                    custcol_swc_lastmile_track1: row.custrecord_swc_lastmile_track || "",
                    custcol_swc_lastmile_sku1: row.custrecord_swc_lastmile_sku || "",
                    custcol_swc_lastmile_place1: row.custrecord_swc_lastmile_place || "",
                    custcol_swc_lastmile_jfdate1: row.custrecord_swc_lastmile_jfdate || "",
                    custcol_swc_lastmile_receipt1: row.custrecord_swc_lastmile_receipt || "",
                    custcol_swc_lastmile_quantity1: row.custrecord_swc_lastmile_quantity || "",
                    custcol_swc_lastmile_abnormal1: (row.custrecord_swc_lastmile_abnormal || "") === "T",
                    custcol_swc_lastmile_memo1: row.custrecord_swc_lastmile_memo2 || "",
                    custcol_swc_wc_fee2: row.line_rec_id || ""
                };
                if (amount > 0) {
                    group.billLines.push(line);
                } else {
                    group.creditLines.push(line);
                }
                if (row.custrecord_swc_lastmile_type) itemIds.add(row.custrecord_swc_lastmile_type);
            }

            // 移除没有有效明细的主记录（所有行金额为0）
            for (let mainId in groupedData) {
                let group = groupedData[mainId];
                if (group.billLines.length === 0 && group.creditLines.length === 0) {
                    delete groupedData[mainId];
                }
            }

            if (Object.keys(groupedData).length === 0) return {};

            // 获取货品信息（费用科目和itemid）
            let itemInfoJson = getItemInfoJson(Array.from(itemIds));
            // 获取供应商付款条件
            let vendorJson = getVendorInfo(Array.from(vendorIds));

            // 构建最终的输出结构
            let finalData = {};
            for (let mainId in groupedData) {
                let group = groupedData[mainId];
                let mainObj = {};

                // 处理账单（正数）
                if (group.billLines.length > 0) {
                    let billBody = { ...group.body };
                    // 补充供应商付款条件
                    let vendor = billBody.entity;
                    if (vendorJson[vendor] && vendorJson[vendor].paymentTerms) {
                        billBody.custbody_swc_vendor_payment_terms = vendorJson[vendor].paymentTerms;
                    }
                    // 补充行明细的货品描述和科目
                    let enrichedBillLines = enrichLinesWithItemInfo(group.billLines, itemInfoJson);
                    mainObj.bill = {
                        body: billBody,
                        lines: enrichedBillLines
                    };
                }

                // 处理贷项（负数）
                if (group.creditLines.length > 0) {
                    let creditBody = { ...group.body };
                    let vendor = creditBody.entity;
                    if (vendorJson[vendor] && vendorJson[vendor].paymentTerms) {
                        creditBody.custbody_swc_vendor_payment_terms = vendorJson[vendor].paymentTerms;
                    }
                    let enrichedCreditLines = enrichLinesWithItemInfo(group.creditLines, itemInfoJson);
                    mainObj.credit = {
                        body: creditBody,
                        lines: enrichedCreditLines
                    };
                }

                finalData[mainId] = mainObj;
            }
            return finalData;
        }

        /**
         * 为明细行补充货品名称（description）和费用科目（account）
         */
        function enrichLinesWithItemInfo(lines, itemInfoJson) {
            return lines.map(line => {
                let itemId = line.item;
                let itemInfo = itemInfoJson[itemId];
                if (itemInfo) {
                    // line.account = itemInfo.expenseAccount; // 若需要科目字段，取消注释
                    line.description = itemInfo.itemId;
                }
                return line;
            });
        }

        function getItemInfoJson(itemArr) {
            let itemInfoJson = {};
            if (SWC_Utils.isEmpty(itemArr) || itemArr.length <= 0) return itemInfoJson;
            let itemSql = `SELECT item.id AS id, item.itemid AS itemid FROM item WHERE item.id IN (${itemArr.join(',')}) AND NVL(item.isinactive, 'F') = 'F'`;
            let itemResults = SWC_Utils.getAllSqlResults(itemSql);
            for (let row of itemResults) {
                itemInfoJson[row.id] = {
                    itemId: row.itemid
                    // expenseAccount: row.expenseaccount  // 如需要可添加
                };
            }
            return itemInfoJson;
        }

        function getVendorInfo(vendorArr) {
            let vendorInfo = {};
            if (SWC_Utils.isEmpty(vendorArr) || vendorArr.length <= 0) return vendorInfo;
            let vendorSql = `SELECT vendor.id AS id, vendor.custentity_swc_payment_terms AS custentity_swc_payment_terms FROM vendor WHERE vendor.id IN (${vendorArr.join(',')}) AND NVL(vendor.isinactive, 'F') = 'F'`;
            let vendorResults = SWC_Utils.getAllSqlResults(vendorSql);
            for (let row of vendorResults) {
                let paymentTerms = row.custentity_swc_payment_terms || "";
                vendorInfo[row.id] = {
                    paymentTerms: SWC_Utils.isEmpty(paymentTerms) ? "" : paymentTerms.split(",")[0]
                };
            }
            return vendorInfo;
        }

        /**
         * 创建账单或贷项
         * @param bodyJson 主单字段
         * @param linesArray 明细行数组
         * @param type record.Type.VENDOR_BILL 或 VENDOR_CREDIT
         */
        function createRecord(bodyJson, linesArray, type) {
            if (SWC_Utils.isEmpty(bodyJson) || SWC_Utils.isEmpty(linesArray) || linesArray.length === 0) return "";
            let recordObj = record.create({ type: type, isDynamic: true });
            setBodyValue(recordObj, bodyJson);
            setLinesValue(recordObj, linesArray);
            return recordObj.save({ ignoreMandatoryFields: true });
        }

        function setBodyValue(recObj, bodyJson) {
            for (let fieldId in bodyJson) {
                let value = bodyJson[fieldId];
                if (fieldId === "trandate") value = format.parse({ value: value, type: format.Type.DATE });
                recObj.setValue({ fieldId: fieldId, value: value });
            }
        }

        function setLinesValue(recObj, linesArray) {
            let sublistId = "item";
            for (let line of linesArray) {
                recObj.selectNewLine({ sublistId: sublistId });
                for (let fieldId in line) {
                    let value = line[fieldId];
                    if (fieldId === "custcol_swc_lastmile_jfdate1" && !SWC_Utils.isEmpty(value)) {
                        value = format.parse({ value: value, type: format.Type.DATE });
                    }
                    recObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: fieldId, value: value });
                }
                recObj.commitLine({ sublistId: sublistId });
            }
        }

        function deleteRecords(recIds, type) {
            for (let id of recIds) {
                record.delete({ type: type, id: id });
            }
        }

        return {
            getInputData,
            // map,
            reduce,
            summarize
        };
    });