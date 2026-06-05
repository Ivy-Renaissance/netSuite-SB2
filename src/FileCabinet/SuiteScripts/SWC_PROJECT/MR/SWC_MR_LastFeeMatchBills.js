/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/search", "N/runtime", "N/format", "N/record", "../common/SWC_Utils.js"],

    (search, runtime, format, record, SWC_Utils) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            let feeRecId = runtime.getCurrentScript().getParameter({name: "custscript_swc_mr_last_mile_fees_id"}); // 尾程各类费用id
            if (SWC_Utils.isEmpty(feeRecId)) return {};
            let updateBillJson = lastFeeMatchBills(feeRecId);
            log.audit("updateBillJson", JSON.stringify(updateBillJson));
            return updateBillJson;
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            try {
                let billId = mapContext.key;
                let value = mapContext.value;
                let dataJson = typeof value == "string"? JSON.parse(value): {};
                updateBills(billId, dataJson);
            }catch (e) {
                log.audit("map error", e);
                log.audit("map error message", e.message);
            }
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {

        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {

        }

        function lastFeeMatchBills(feeRecId) {
            let feeRecObj = record.load({type: "customrecord_swc_lastmile_fees", id: feeRecId, isDynamic: true});
            let scriptObj = runtime.getCurrentScript();
            let billType = scriptObj.getParameter({name: "custscript_swc_mr_bill_order_type"}); // 账单类型 尾程费用类-预估
            let matched = scriptObj.getParameter({name: "custscript_swc_mr_status_matched"}); // 状态 已匹配
            let sublistId = "recmachcustrecord_swc_lastmile_main"; // 入库费用明细
            let lineCount = feeRecObj.getLineCount({sublistId: sublistId});
            let updateJson = getUpdateJson(feeRecObj, billType, lineCount, sublistId);
            log.audit("updateJson", JSON.stringify(updateJson));
            let updateBillJson = updateRec(feeRecObj, updateJson, lineCount, sublistId, matched);
            feeRecObj.save({ignoreMandatoryFields: true});
            return updateBillJson;
        }

        /**
         * 获取 匹配后的 预估金额
         * @param recObj
         * @param billType 采购订单类型 尾程费用类-预估
         * @param lineCount 明细行数
         * @param sublistId 子列表id
         * @returns {{}}
         */
        function getUpdateJson(recObj, billType, lineCount, sublistId) {
            let updateJson = {};
            if (SWC_Utils.isEmpty(recObj) || SWC_Utils.isEmpty(billType)) return updateJson;
            // let date = recObj.getValue({fieldId: "custrecord_swc_lastmile_date"}); // 日期
            let type = recObj.getValue({fieldId: "custrecord_swc_lastmile_feetypes"});//類型
            let date1 = recObj.getValue({fieldId: "custrecord_swc_lastmile_date1"});
            let date2 = recObj.getValue({fieldId: "custrecord_swc_lastmile_date2"});
            // if (typeof date != "string") date = format.format({value: date, type: format.Type.DATE});
            if (typeof date1 != "string") date1 = format.format({value: date1, type: format.Type.DATE});
            if (typeof date2 != "string") date2 = format.format({value: date2, type: format.Type.DATE});
            let vendor = recObj.getValue({fieldId: "custrecord_swc_ilastmile_vendor"}); // 供应商
            let currency = recObj.getValue({fieldId: "custrecord_swc_lastmile_currency"}); // 货币
            let skuArr = []; // sku 数组
            for (let i = 0; i < lineCount; i++) {
                let sku = recObj.getSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_lastmile_type", line: i}); // 入库费用明细.尾程费用_费用细项
                if (!SWC_Utils.isEmpty(sku) && !skuArr.includes(sku)) skuArr.push(sku);
            }
            if (type == '5') {
                updateJson = searchBills(date1,date2, vendor, currency, skuArr, billType,type);
            } else {
                updateJson = searchBills(null,null, vendor, currency, skuArr, billType,type);
            }
            // updateJson = searchBills(date, vendor, currency, skuArr, billType);
            return updateJson;
        }

        /**
         * 检索账单
         * @param date1 日期
         * @param date2 日期
         * @param vendor 供应商
         * @param currency 币种
         * @param skuArr 货品
         * @param billType 采购订单类型 尾程费用类-预估
         * @param type
         * @returns {{}}
         */
        function searchBills(date1,date2, vendor, currency, skuArr, billType,type) {
            let updateJson = {};
            // log.audit("function searchBills params", JSON.stringify({date, vendor, currency, skuArr, billType}));
            if (type == '5') {
                if (SWC_Utils.isEmpty(date1) || SWC_Utils.isEmpty(date2) || SWC_Utils.isEmpty(vendor) || SWC_Utils.isEmpty(currency) || SWC_Utils.isEmpty(skuArr)) return updateJson;
            } else {
                if (SWC_Utils.isEmpty(vendor) || SWC_Utils.isEmpty(currency) || SWC_Utils.isEmpty(skuArr)) return updateJson;
            }

            var filters = [
                ["type", "anyof", "VendBill"], // 类型 账单
                "AND",
                ["custbody_swc_order_type2", "anyof", billType], // 采购订单类型(手工单用) 等于 尾程费用类-预估
                "AND",
                ["custcol_swc_wc_fee2", "anyof", "@NONE@"], // 关联尾程费用子表记录 等于 无
                "AND",
                ["name", "anyof", vendor], // 名称
                "AND",
                ["currency", "anyof", currency], // 货币
                // "AND",
                // ["trandate", "onorbefore", date], // 日期 时间为 date 或之前
                "AND",
                ["item", "anyof", skuArr], // 货品
                "AND",
                ["mainline", "is", "F"], // 主行 F
                "AND",
                ["taxline", "is", "F"], // 税行 F
                "AND",
                ["shipping", "is", "F"], // 发运行 F
                "AND",
                ["cogs", "is", "F"] // 销货成本行 F
            ]
            if (type == '5') {
                filters.push('AND');
                filters.push(["trandate", "within", date1,date2]);
            }
            var vendorbillSearchObj = search.create({
                type: "vendorbill",
                settings: [{"name": "consolidationtype", "value": "ACCTTYPE"}, {"name": "includeperiodendtransactions", "value": "F"}],
                filters:
                filters,
                columns:
                    [
                        search.createColumn({name: "item", label: "货品"}),
                        search.createColumn({name: "fxamount", label: "金额（外币）"}),
                        search.createColumn({name: "custcol_swc_lastmile_po1", label: "尾程费用_出库单号"}),
                        search.createColumn({name: "custcol_swc_lastmile_track1", label: "尾程费用_跟踪号"}),
                        search.createColumn({name: "custcol_swc_lastmile_sku1", label: "尾程费用_实物SKU/仓库SKU"}),
                        search.createColumn({name: "custcol_swc_lastmile_place1", label: "尾程费用_仓库代码"}),
                        search.createColumn({name: "custcol_swc_lastmile_receipt1", label: "尾程费用_入库单号/物流子单号"}),
                        search.createColumn({name: "line", label: "行 Id"})
                    ]
            });
            let results = SWC_Utils.getAllResults(vendorbillSearchObj);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return updateJson;
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                let sku = result.getValue({name: "item"}); // 货品
                let line = result.getValue({name: "line"}); // 行 Id
                let billId = result.id;
                let amount = result.getValue({name: "fxamount"}); // 金额（外币）
                let poNum = result.getValue({name: "custcol_swc_lastmile_po1"}); // 尾程费用_出库单号
                let trackNum = result.getValue({name: "custcol_swc_lastmile_track1"}); // 尾程费用_跟踪号
                let feeSku = result.getValue({name: "custcol_swc_lastmile_sku1"}); // 尾程费用_实物SKU/仓库SKU
                let place = result.getValue({name: "custcol_swc_lastmile_place1"}); // 尾程费用_仓库代码
                let receiptNum = result.getValue({name: "custcol_swc_lastmile_receipt1"}); // 尾程费用_入库单号/物流子单号
                // 分组匹配 预估账单 预估金额
                // ${尾程费用_出库单号}_${尾程费用_跟踪号}_${尾程费用_实物SKU/仓库SKU}_${尾程费用_仓库代码}_${尾程费用_入库单号/物流子单号}
                let key = sku + "_" + poNum + "_" + trackNum + "_" + feeSku + "_" + place + "_" + receiptNum;
                let skuJson = updateJson[key] = updateJson[key] || {};
                let updateBillJson = skuJson.update = skuJson.update || {}; // 用于记录该分组关联的哪个账单的哪些行
                let fieldsJson = skuJson.fields = skuJson.fields || {}; // 用于更新 尾程各类费用 的子列表字段

                let billJson = updateBillJson[billId] = updateBillJson[billId] || {};
                billJson[line] = billJson[line] || {}; // 记录分组关联的账单行

                let billArr = fieldsJson.custrecord_swc_lastmile_estimatebills = fieldsJson.custrecord_swc_lastmile_estimatebills || []; // 入库费用明细.尾程费用_匹配至预估账单
                if (!SWC_Utils.isEmpty(billId) && !billArr.includes(billId)) billArr.push(billId);
                fieldsJson.custrecord_swc_lastmile_estimate = SWC_Utils.addSumIsNumber(fieldsJson.custrecord_swc_lastmile_estimate || 0, Number(amount)); // 入库费用明细.尾程费用_预估金额
            }
            return updateJson;
        }

        /**
         * 检索后 更新明细行 和 单据状态
         * @param recObj
         * @param updateJson 检索帐单后获取的 预估账单信息
         * @param lineCount 子列表行数
         * @param sublistId 子列表 id
         * @param matched 状态 已匹配
         */
        function updateRec(recObj, updateJson, lineCount, sublistId, matched) {
            let updateBillJson = {};
            // 状态 更新为 已匹配
            recObj.setValue({fieldId: "custrecord_swc_lastmile_status", value: matched}); // 状态
            for (let i = 0; i < lineCount; i++) {
                recObj.selectLine({sublistId: sublistId, line: i});
                let sku = recObj.getCurrentSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_lastmile_type"}); // 入库费用明细.尾程费用_费用细项
                let lineRecId = recObj.getCurrentSublistValue({sublistId: sublistId, fieldId: "id"}); // 尾程各类费用明细 内部id
                if (SWC_Utils.isEmpty(sku)) continue; // 入库费用明细.尾程费用_费用细项 为空的行 不处理
                let poNum = recObj.getCurrentSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_lastmile_po"}); // 尾程费用_出库单号
                let trackNum = recObj.getCurrentSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_lastmile_track"}); // 尾程费用_跟踪号
                let feeSku = recObj.getCurrentSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_lastmile_sku"}); // 尾程费用_实物SKU/仓库SKU
                let place = recObj.getCurrentSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_lastmile_place"}); // 尾程费用_仓库代码
                let receiptNum = recObj.getCurrentSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_lastmile_receipt"}); // 尾程费用_入库单号/物流子单号
                let actualAmt = recObj.getCurrentSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_lastmile_amount2"}); // 尾程费用_实际金额
                // 分组匹配 预估账单 预估金额
                // ${尾程费用_出库单号}_${尾程费用_跟踪号}_${尾程费用_实物SKU/仓库SKU}_${尾程费用_仓库代码}_${尾程费用_入库单号/物流子单号}
                let key = sku + "_" + poNum + "_" + trackNum + "_" + feeSku + "_" + place + "_" + receiptNum;
                log.audit("updateRec key", key);
                let skuJson = updateJson[key];
                let fieldsJson;

                if (SWC_Utils.isEmpty(skuJson)) {
                    // 若未查到 sku的账单明细 入库费用明细.尾程费用_预估金额 为 0; 入库费用明细.尾程费用_匹配至预估账单 不赋值; 尾程费用_金额 为 尾程费用_实际金额的值
                    fieldsJson = {custrecord_swc_lastmile_estimate: 0, custrecord_swc_lastmile_amount: actualAmt}; // 入库费用明细.尾程费用_预估金额; 尾程费用_金额
                }else {
                    fieldsJson = skuJson.fields;
                    // 尾程费用_金额 = 尾程费用_实际金额 - 尾程费用_预估金额
                    fieldsJson.custrecord_swc_lastmile_amount = SWC_Utils.subSumIsNumber(actualAmt, Number(fieldsJson.custrecord_swc_lastmile_estimate || 0));
                }
                setSublistValues(recObj, fieldsJson, i, sublistId);

                // 如果有匹配的行 收集子记录与账单行的关联关系
                if (!SWC_Utils.isEmpty(skuJson)) {
                    generateUpdateBillJson(lineRecId, skuJson.update, updateBillJson);
                    delete skuJson;
                }
                recObj.commitLine({sublistId: sublistId});
            }
            return updateBillJson;
        }

        /**
         * 子列表 赋值
         * @param recObj
         * @param skuJson
         * @param line
         * @param sublistId
         */
        function setSublistValues(recObj, skuJson, line, sublistId) {
            for (let fieldId in skuJson) {
                recObj.setCurrentSublistValue({sublistId: sublistId, fieldId: fieldId, value: skuJson[fieldId]});
            }
        }

        /**
         * 记录 关联的账单的行所匹配的 尾程费用子表记录
         * @param lineRecId
         * @param updateJson
         * @param updateBillJson
         */
        function generateUpdateBillJson(lineRecId, updateJson, updateBillJson){
            if (SWC_Utils.isEmpty(lineRecId) || SWC_Utils.isEmpty(updateJson)) return;
            for (let billId in updateJson){
                let billJson = updateJson[billId];
                let billDetail = updateBillJson[billId] = updateBillJson[billId] || {};
                for (let lineId in billJson){
                    billDetail[lineId] = {custcol_swc_wc_fee2: lineRecId};
                }
            }
        }

        /**
         * 更新 匹配的账单的 行 关联尾程费用子表记录 字段
         * @param billId
         * @param updateJson
         */
        function updateBills(billId, updateJson) {
            if (SWC_Utils.isEmpty(updateJson) || SWC_Utils.isEmpty(billId)) return;
            let sublistId = "item";
            let billRec = record.load({type: record.Type.VENDOR_BILL, id: billId, isDynamic: true});
            let lineCount = billRec.getLineCount({sublistId: sublistId});
            for (let i = 0; i < lineCount; i++){
                billRec.selectLine({sublistId: sublistId, line: i});
                let line = billRec.getCurrentSublistValue({sublistId: sublistId, fieldId: "line"}); // 行号
                let lineJson = updateJson[line];
                if (SWC_Utils.isEmpty(lineJson) || Object.keys(lineJson).length <= 0) continue;
                setSublistValues(billRec, lineJson, line, sublistId);
                billRec.commitLine({sublistId: sublistId});
            }
            billRec.save({ignoreMandatoryFields: true});
        }

        return {getInputData, map, reduce, summarize}

    });