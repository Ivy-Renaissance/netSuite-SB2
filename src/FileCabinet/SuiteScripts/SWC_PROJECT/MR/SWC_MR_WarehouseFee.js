/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/search", "N/record", "N/runtime", "N/query", "N/format", "../common/SWC_Utils.js"],

    (search, record, runtime, query, format, SWC_Utils) => {
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
            let startTime = new Date();
            let dataJson = getCreateData();
            log.audit("dataJson", JSON.stringify(dataJson));
            log.audit("getJournalData running time", new Date() - startTime);
            // return {};
            return dataJson;
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
            let startTime = new Date();
            let key = reduceContext.key;
            let value = reduceContext.values[0];
            let recIdsJson = {};
            try {
                let dataJson = {};
                if (SWC_Utils.isEmpty(value)) return;
                dataJson = typeof value == "string"? JSON.parse(value): value;
                // json中只能存在 bill 或 creditMemo 中的一个
                let expensesRecJsonKey = "bill";
                if (SWC_Utils.isEmpty(dataJson[expensesRecJsonKey])) expensesRecJsonKey = "creditMemo";
                let expensesRecJson = dataJson[expensesRecJsonKey];
                let currency = expensesRecJson.body.currency;
                if (expensesRecJsonKey == "bill"){ // 创建账单
                    let billId = createExpensesRec(expensesRecJson, record.Type.VENDOR_BILL, "expense");
                    if (!SWC_Utils.isEmpty(billId)) setInRecIdsJson(billId, recIdsJson, record.Type.VENDOR_BILL);
                }else if (expensesRecJsonKey == "creditMemo"){ // 创建贷项
                    // let creditMemoId = createExpensesRec(expensesRecJson);
                }

                createTOIRAndIf(dataJson.transferOrder, recIdsJson, currency);

                // 回写 尾程费用-仓租
                writeBackWarehouseRec(key, recIdsJson);
            }catch (e) {
                log.audit("error", e);
                // 删除已创建的记录
                deleteRecs(recIdsJson);
                // 异常时 尾程费用-仓租 报错信息 回写
                record.submitFields({type: "customrecord_swc_warehouse", id: key, values: {custrecord_swc_warehouse_mistakememo: e.message || e}});
            }
            log.audit("recIdsJson", JSON.stringify(recIdsJson));
            log.audit("reduce running time", new Date() - startTime);
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

        function getCreateData(){
            let createDataJson = {};
            let warehouseSql = "SELECT \n" +
                "  CUSTOMRECORD_SWC_WAREHOUSE.id AS id, \n" + // 内部id
                "  CUSTOMRECORD_SWC_WAREHOUSE.custrecord_swc_warehouse_vendor AS custrecord_swc_warehouse_vendor, \n" + // 供应商
                "  CUSTOMRECORD_SWC_WAREHOUSE.custrecord_swc_warehouse_company AS custrecord_swc_warehouse_company, \n" + // 子公司
                "  CUSTOMRECORD_SWC_WAREHOUSE.custrecord_swc_warehouse_currency AS custrecord_swc_warehouse_currency, \n" + // 货币
                "  CUSTOMRECORD_SWC_WAREHOUSE.custrecord_swc_warehouse_date AS custrecord_swc_warehouse_date, \n" + // 日期
                "  CUSTOMRECORD_SWC_WAREHOUSE.custrecord_swc_warehouse_memo AS custrecord_swc_warehouse_memo, \n" + // 备注
                "  CUSTOMRECORD_SWC_WAREHOUSE.custrecord_swc_warehouse_place1 AS custrecord_swc_warehouse_place1, \n" + // 仓租费用_实体仓库
                "  CUSTOMRECORD_SWC_WAREHOUSE.custrecord_swc_warehouse_place2 AS custrecord_swc_warehouse_place2, \n" + // 仓租费用_发出商品仓
                "  CUSTOMRECORD_SWC_WAREHOUSE_DETAILS.custrecord_swc_warehouse_fee_type AS custrecord_swc_warehouse_fee_type, \n" + // 仓租费用明细.仓租费用_费用细项
                "  CUSTOMRECORD_SWC_WAREHOUSE_DETAILS.custrecord_swc_warehouse_amount AS custrecord_swc_warehouse_amount, \n" + // 仓租费用明细.仓租费用_金额
                "  CUSTOMRECORD_SWC_WAREHOUSE_DETAILS.custrecord_swc_warehouse_sku AS custrecord_swc_warehouse_sku\n" + // 仓租费用明细.仓租费用_SKU
                "FROM \n" +
                "  CUSTOMRECORD_SWC_WAREHOUSE \n" +
                "  left join CUSTOMRECORD_SWC_WAREHOUSE_DETAILS on CUSTOMRECORD_SWC_WAREHOUSE_DETAILS.custrecord_swc_warehouse_main = CUSTOMRECORD_SWC_WAREHOUSE.id\n" +
                "WHERE \n" +
                // 非活动 F and 账单/贷项 为空 and 关联第一段转移单 为空 and 关联第二段转移单 为空
                "   NVL(CUSTOMRECORD_SWC_WAREHOUSE.isinactive, 'F') = 'F' AND CUSTOMRECORD_SWC_WAREHOUSE.custrecord_swc_warehouse_transaction IS NULL AND CUSTOMRECORD_SWC_WAREHOUSE.custrecord_swc_warehouse_to1 IS NULL AND CUSTOMRECORD_SWC_WAREHOUSE.custrecord_swc_warehouse_to2 IS NULL\n";
            let warehouseResults = SWC_Utils.getAllSqlResults(warehouseSql);
            if (SWC_Utils.isEmpty(warehouseResults) || warehouseResults.length <= 0) return createDataJson;
            let scriptObj = runtime.getCurrentScript();
            let billAccount = scriptObj.getParameter({name: "custscript_swc_mr_bill_account"}); // 应付科目
            let billTax = scriptObj.getParameter({name: "custscript_swc_mr_bill_tax"}); // 账单税码
            let typeTO = scriptObj.getParameter({name: "custscript_swc_mr_type_to"}); // 仓储费 TO
            let incotermDap = scriptObj.getParameter({name: "custscript_swc_mr_incoterm_dap"}); // 国际贸易术语 DAP
            let itemArr = [];
            for (let i = 0; i < warehouseResults.length; i++) {
                let result = warehouseResults[i];
                let recId = result.id; // 内部id
                let amount = result.custrecord_swc_warehouse_amount; // 仓租费用明细.仓租费用_金额
                if (amount < 0) continue; // 目前不考虑 金额 < 0 的情况
                let vendor = result.custrecord_swc_warehouse_vendor; // 供应商
                let subsidiary = result.custrecord_swc_warehouse_company; // 子公司
                let currency = result.custrecord_swc_warehouse_currency; // 货币
                let tranDate = result.custrecord_swc_warehouse_date; // 日期
                let memo = result.custrecord_swc_warehouse_memo; // 备注
                let locationA = result.custrecord_swc_warehouse_place1; // 仓租费用_实体仓库
                let locationB = result.custrecord_swc_warehouse_place2; // 仓租费用_发出商品仓
                let expensesItem = result.custrecord_swc_warehouse_fee_type; // 仓租费用明细.仓租费用_费用细项
                let sku = result.custrecord_swc_warehouse_sku; // 仓租费用明细.仓租费用_SKU
                let detailJson = createDataJson[recId] = createDataJson[recId] || {};
                // 正数生成账单，增加费用；负数生成贷项，减少费用
                let expensesRecJsonKey = "bill";
                if (amount < 0) expensesRecJsonKey = "creditMemo";

                let expensesRecJson = detailJson[expensesRecJsonKey] = detailJson[expensesRecJsonKey] || {};
                let TOJson = detailJson.transferOrder = detailJson.transferOrder || {};

                // [目标记录字段 -- 自定义记录字段/特殊逻辑]
                if (expensesRecJsonKey == "bill"){ // 整理 创建账单Json
                    let billBodyJson = expensesRecJson.body = expensesRecJson.body || {};
                    let billLineJson = expensesRecJson.line = expensesRecJson.line || {};
                    billBodyJson.entity = vendor; // 供应商 -- 供应商
                    billBodyJson.subsidiary = subsidiary; // 子公司 -- 子公司
                    // expensesBodyJson.tranid = ""; // 参考编号 -- 暂定，与transactionnumber一致
                    billBodyJson.currency = currency; // 货币 -- 货币
                    billBodyJson.trandate = tranDate; // 日期 -- 日期
                    billBodyJson.account = billAccount; // 科目 -- 默认科目，2202.03应付账款_应付明细款
                    billBodyJson.memo = memo; // 备注 -- 备注
                    billBodyJson.duedate = ""; // 到期日期 -- 默认空
                    billBodyJson.custbody_swc_wc_fee2 = recId; // 创建自：尾程费用记录 -- 尾程费用-仓租.内部id
                    let billLineDetailJson = billLineJson[i] = billLineJson[i] || {};
                    billLineDetailJson.item = expensesItem; // 仓租费用明细.仓租费用_费用细项 (用于获取 货品的费用科目 名称)
                    billLineDetailJson.account = "";
                    billLineDetailJson.amount = amount; // 金额 -- 仓租费用明细.仓租费用_金额
                    billLineDetailJson.taxcode = billTax; // 税码 -- VAT_CN:VAT_CN 0%
                }else if (expensesRecJsonKey == "creditMemo") { // 整理 创建贷项Json

                }

                // 整理 创建转移单Json
                let TOBodyJson = TOJson.body = TOJson.body || {};
                let TOLocationJson = TOJson.location = TOJson.location || {};
                let TOLineJson = TOJson.line = TOJson.line || {};
                // 创建的两个 转移单 自地点 至地点 相反 单独记录
                TOLocationJson.locationA = locationA;
                TOLocationJson.locationB = locationB;

                TOBodyJson.subsidiary = subsidiary; // 子公司 -- 子公司
                TOBodyJson.trandate = tranDate; // 日期 -- 日期
                TOBodyJson.useitemcostastransfercost = true; // 将货品成本用作转移成本 -- 默认"T"?
                TOBodyJson.custbody_swc_cb_transaction_type = typeTO; // 成本还原-事务处理类型 -- 默认【仓储费 TO】
                TOBodyJson.firmed = true; // 已确定 -- 默认已确定=T
                TOBodyJson.incoterm = incotermDap; // 国际贸易术语 -- 默认，DAP
                TOBodyJson.memo = memo; // 备注 -- 备注
                TOBodyJson.custbody_swc_wc_fee2 = recId; // 创建自：尾程费用记录 -- 尾程费用-仓租.内部id

                let TOLineDetailJson = TOLineJson[i] = TOLineJson[i] || {};
                TOLineDetailJson.item = sku; // 货品 -- 仓租费用明细.仓租费用_SKU
                TOLineDetailJson.quantity = 1; // 数量 -- 默认，数量=1
                TOLineDetailJson.amount = amount; // 转移价格 -- 仓租费用明细.仓租费用_金额

                if (!SWC_Utils.isEmpty(expensesItem) && !itemArr.includes(expensesItem)) itemArr.push(expensesItem);
                if (!SWC_Utils.isEmpty(sku) && !itemArr.includes(sku)) itemArr.push(sku);
            }
            let itemInfoJson = getItemInfoJson(itemArr);
            updateCreateDataJson(createDataJson, itemInfoJson);
            return createDataJson;
        }

        /**
         * 检索 货品 货品名称/编号; 费用科目
         * @param itemArr
         * @returns {{}}
         */
        function getItemInfoJson(itemArr) {
            let itemInfoJson = {};
            if (SWC_Utils.isEmpty(itemArr) || itemArr.length <= 0) return itemInfoJson;
            let itemSql = `SELECT item.id AS id, item.itemid AS itemid, item.expenseaccount AS expenseaccount, item.islotitem AS islotitem FROM item WHERE item.id IN (${itemArr.join(',')}) AND NVL(item.isinactive, 'F') = 'F'`;
            let itemResults = SWC_Utils.getAllSqlResults(itemSql);
            if (SWC_Utils.isEmpty(itemResults) || itemResults.length <= 0) return itemInfoJson;
            for (let i = 0; i < itemResults.length; i++) {
                let result = itemResults[i];
                let internalId = result.id;
                let expenseAccount = result.expenseaccount;
                let itemDetailJson = itemInfoJson[internalId] = itemInfoJson[internalId] || {};
                itemDetailJson.itemId = result.itemid;
                itemDetailJson.expenseAccount = expenseAccount;
                itemDetailJson.islotitem = result.islotitem;
            }
            return itemInfoJson;
        }

        /**
         * 将货品 品名称/编号; 费用科目 更新到 createDataJson 中
         * @param createDataJson
         * @param itemInfoJson
         */
        function updateCreateDataJson(createDataJson, itemInfoJson) {
            if (SWC_Utils.isEmpty(createDataJson) || SWC_Utils.isEmpty(itemInfoJson)) return;
            for (let recId in createDataJson) {
                let recJson = createDataJson[recId];
                // 更新账单/贷项json
                let expensesRecJson = SWC_Utils.isEmpty(recJson.bill)? recJson.creditMemo: recJson.bill;
                let lineJson = expensesRecJson.line;
                for (let lineKey in lineJson){
                    let lineDetailJson = lineJson[lineKey];
                    let item = lineDetailJson.item;
                    let itemJson = itemInfoJson[item];
                    if (SWC_Utils.isEmpty(itemJson)) continue;
                    lineDetailJson.account = itemJson.expenseAccount; // 仓租费用明细.仓租费用_费用细项.费用科目
                    lineDetailJson.memo = itemJson.itemId; // 仓租费用明细.仓租费用_费用细项.货品名称/编号
                }

                // 更新转移单json
                let TOJson = recJson.transferOrder;
                let TOLineJson = TOJson.line;
                for (let TOLineKey in TOLineJson){
                    let TOLineDetailJson = TOLineJson[TOLineKey];
                    let item = TOLineDetailJson.item;
                    let itemJson = itemInfoJson[item];
                    if (SWC_Utils.isEmpty(itemJson)) continue;
                    TOLineDetailJson.islotitem = itemJson.islotitem; // 仓租费用明细.仓租费用_费用细项.已编批号
                }
            }
        }

        /**
         * 创建 账单/贷项
         * @param dataJson
         * @param type
         * @param sublistId
         * @returns {string}
         */
        function createExpensesRec(dataJson, type, sublistId){
            let billId = "";
            if (SWC_Utils.isEmpty(dataJson)) return billId;
            let recObj = record.create({type: type, isDynamic: true});
            let bodyJson = dataJson.body;
            let lineJson = dataJson.line;
            if (SWC_Utils.isEmpty(bodyJson) || SWC_Utils.isEmpty(lineJson)) return billId;
            setBodyValue(recObj, bodyJson);
            setLineValue(recObj, lineJson, sublistId, false);
            billId = recObj.save();
            return billId;
        }

        function setBodyValue(recObj, bodyJson){
            for (let fieldId in bodyJson){
                let value = bodyJson[fieldId];
                if (fieldId == "trandate") value = format.parse({value: value, type: format.Type.DATE});
                recObj.setValue({fieldId: fieldId, value: value});
            }
        }

        /**
         * 行字段赋值
         * 创建转移单时 判断是否为库存详细信息赋值
         * @param recObj
         * @param lineJson
         * @param sublistId
         * @param isTO
         */
        function setLineValue(recObj, lineJson, sublistId, isTO){
            for (let key in lineJson){
                let lineDetailJson = lineJson[key];
                recObj.selectNewLine({sublistId: sublistId});
                for (let fieldId in lineDetailJson){
                    if ((!isTO && fieldId == "item") || fieldId == "inventoryNum" || fieldId == "islotitem") continue;
                    let value = lineDetailJson[fieldId];
                    recObj.setCurrentSublistValue({sublistId: sublistId, fieldId: fieldId, value: value});
                }
                if (isTO && lineDetailJson.islotitem == "T"){ // 如果是TO可能存在批次号 并且是 已编批号的货品 设置库存详细信息
                    setInventoryDetail(recObj, lineDetailJson, sublistId);
                }
                recObj.commitLine({sublistId: sublistId});
            }
        }

        /**
         * 选择一个有库存 的 批次号并赋值
         * @param recObj
         * @param lineDetailJson
         * @param sublistId
         */
        function setInventoryDetail(recObj, lineDetailJson, sublistId){
            let subRecordObj = recObj.getCurrentSublistSubrecord({ sublistId: sublistId, fieldId: "inventorydetail"});
            let subRecordSublistId = "inventoryassignment";
            let inventoryNum = "";
            let quantity = lineDetailJson.quantity;
            // 创建第一个 转移单时, 未记录批次号, 选择其中随意一个可选的批次, 并记录在json, 创建第二个转移单时直接用记录的批次创建
            if (SWC_Utils.isEmpty(lineDetailJson.inventoryNum)){
                let objField = subRecordObj.getSublistField({sublistId: subRecordSublistId,fieldId: "issueinventorynumber",line: 0});
                if (objField.label){
                    var inventoryNumberOptions = objField.getSelectOptions();
                    if(inventoryNumberOptions && inventoryNumberOptions.length > 0){
                        for (let i = 0; i < inventoryNumberOptions.length; i++){
                            inventoryNum = inventoryNumberOptions[i].value;
                            subRecordObj.setCurrentSublistValue({sublistId: subRecordSublistId, fieldId: "issueinventorynumber", value: inventoryNum});
                            let quantityAvailable = subRecordObj.getCurrentSublistValue({sublistId: subRecordSublistId,fieldId: "quantityavailable"}) || 0;
                            if (quantityAvailable >= 1) { // 将可选的批次记录在json中
                                subRecordObj.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                                subRecordObj.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: quantity });
                                lineDetailJson.inventoryNum = inventoryNum;
                                break;
                            }
                        }
                    }
                }
            }else { // 创建第二个转移单时直接用记录的批次创建
                inventoryNum = lineDetailJson.inventoryNum;
                if (!SWC_Utils.isEmpty(inventoryNum)) {
                    subRecordObj.setCurrentSublistValue({sublistId: subRecordSublistId, fieldId: "issueinventorynumber", value: inventoryNum});
                    subRecordObj.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: 1 });
                    subRecordObj.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: quantity });
                }
            }
            subRecordObj.commitLine({sublistId: "inventoryassignment"});
        }

        /**
         * 将以创建的 单据id 记录在json中 用于异常后 删单
         * @param recId
         * @param recIdsJson
         * @param type
         */
        function setInRecIdsJson(recId, recIdsJson, type){
            let recIdsArr = recIdsJson[type] = recIdsJson[type] || [];
            if (!SWC_Utils.isEmpty(recId) && !recIdsArr.includes(recId)) recIdsArr.push(recId);
        }

        /**
         * 创建两个 转移单 和两个转移单 关联的 货品收据 货品履行
         * @param dataJson
         * @param recIdsJson
         * @param currency 创建货品收据时赋值
         */
        function createTOIRAndIf(dataJson, recIdsJson, currency){
            if (SWC_Utils.isEmpty(dataJson)) return;
            let bodyJson = dataJson.body;
            let lineJson = dataJson.line;
            let locationJson = dataJson.location;
            let locationA = locationJson.locationA;
            let locationB = locationJson.locationB;
            let wareHouseFeeId = bodyJson.custbody_swc_wc_fee2;
            // 创建第一组 转移单 库存履行 货品收据
            let TOAId = createTO(bodyJson, lineJson, locationA, locationB);
            if (!SWC_Utils.isEmpty(TOAId)) {
                setInRecIdsJson(TOAId, recIdsJson, record.Type.TRANSFER_ORDER);
                createIFAndIRByTO(TOAId, recIdsJson, dataJson, currency, wareHouseFeeId, true);
            }
            log.audit("after first time running createTO lineJson", JSON.stringify(lineJson));

            // 创建第二组 转移单 库存履行 货品收据
            let TOBId = createTO(bodyJson, lineJson, locationB, locationA);
            if (!SWC_Utils.isEmpty(TOBId)) {
                setInRecIdsJson(TOBId, recIdsJson, record.Type.TRANSFER_ORDER);
                createIFAndIRByTO(TOBId, recIdsJson, dataJson, currency, wareHouseFeeId, false);
            }
        }

        /**
         * 创建 转移单
         * @param bodyJson
         * @param lineJson
         * @param fromLocation
         * @param toLocation
         * @returns {string}
         */
        function createTO(bodyJson, lineJson, fromLocation, toLocation){
            let TOId = ""
            if (SWC_Utils.isEmpty(bodyJson) || SWC_Utils.isEmpty(lineJson)) return TOId;
            let recObj = record.create({type: record.Type.TRANSFER_ORDER, isDynamic: true});
            setBodyValue(recObj, bodyJson);
            recObj.setValue({fieldId: "location", value: fromLocation}); // 自地点
            recObj.setValue({fieldId: "transferlocation", value: toLocation}); // 至地点
            recObj.setValue({fieldId: "orderstatus", value: "B"}); // 状态 -- 待履行
            setLineValue(recObj, lineJson, "item", true);
            return recObj.save();
        }

        /**
         * 通过转移单 创建 货品履行 货品收据
         * @param TOId
         * @param recIdsJson
         * @param dataJson
         * @param currency 创建货品收据时赋值
         * @param wareHouseFeeId 创建自：尾程费用记录
         * @param setLandFee 判断是否设置到岸成本
         */
        function createIFAndIRByTO(TOId, recIdsJson, dataJson, currency, wareHouseFeeId, setLandFee){
            let bodyJson = dataJson.body;
            let lineJson = dataJson.line;
            let tranDateObj = format.parse({value: bodyJson.trandate, type: format.Type.DATE});
            // 创建 货品履行
            let fulfillmentRec = record.transform({fromType: record.Type.TRANSFER_ORDER, fromId: TOId, toType: record.Type.ITEM_FULFILLMENT, isDynamic: true});
            fulfillmentRec.setValue({fieldId: "shipstatus", value: "C"});
            fulfillmentRec.setValue({fieldId: "trandate", value: tranDateObj});
            fulfillmentRec.setValue({fieldId: "custbody_swc_wc_fee2", value: wareHouseFeeId}); // 创建自：尾程费用记录
            let fulfillmentId = fulfillmentRec.save();
            if (SWC_Utils.isEmpty(fulfillmentId)) return;
            setInRecIdsJson(fulfillmentId, recIdsJson, record.Type.ITEM_FULFILLMENT);

            // 创建 货品收据
            let receiptRec = record.transform({fromType: record.Type.TRANSFER_ORDER, fromId: TOId, toType: record.Type.ITEM_RECEIPT, isDynamic: true});
            receiptRec.setValue({fieldId: "trandate", value: tranDateObj});
            receiptRec.setValue({fieldId: "currency", value: currency});
            receiptRec.setValue({fieldId: "landedcostperline", value: true});
            receiptRec.setValue({fieldId: "custbody_swc_wc_fee2", value: wareHouseFeeId}); // 创建自：尾程费用记录
            if (setLandFee) setSublistLandCost(receiptRec, lineJson);
            let receiptId = receiptRec.save();
            if (!SWC_Utils.isEmpty(receiptId)) setInRecIdsJson(receiptId, recIdsJson, record.Type.ITEM_RECEIPT);
        }

        /**
         * 为到岸成本赋值
         * @param recObj
         * @param lineJson
         */
        function setSublistLandCost(recObj, lineJson){
            if (SWC_Utils.isEmpty(recObj) || SWC_Utils.isEmpty(lineJson)) return;
            let sublistId = "item";
            let subRecSublistId = "landedcostdata";
            let lineCount = recObj.getLineCount({sublistId: sublistId});
            let keyArr = Object.keys(lineJson);
            let landCostType = runtime.getCurrentScript().getParameter({name: "custscript_swc_mr_land_cost_type"}); // 成本类别
            for (let i = 0; i < lineCount; i++){
                let lineDetailJson = lineJson[keyArr[i]];
                if (SWC_Utils.isEmpty(lineDetailJson)) continue;
                recObj.selectLine({sublistId: sublistId, line: i});
                let landCostSubRec = recObj.getCurrentSublistSubrecord({sublistId: sublistId, fieldId: "landedcost"});
                if (!landCostSubRec) continue;
                landCostSubRec.selectNewLine({sublistId: subRecSublistId});
                landCostSubRec.setCurrentSublistValue({sublistId: subRecSublistId, fieldId: "costcategory", value: landCostType}); // 到岸成本-成本类别 -- 默认值【库内-仓租费（在库）】
                landCostSubRec.setCurrentSublistValue({sublistId: subRecSublistId, fieldId: "amount", value: lineDetailJson.amount});
                landCostSubRec.commitLine({sublistId: subRecSublistId});
                recObj.commitLine({sublistId: sublistId})
            }
        }

        /**
         * 回写
         * 账单/贷项 custrecord_swc_warehouse_transaction
         * 关联第一段转移单 custrecord_swc_warehouse_to1
         * 关联第二段转移单 custrecord_swc_warehouse_to2
         * @param recId
         * @param recIdsJson
         */
        function writeBackWarehouseRec(recId, recIdsJson){
            if (SWC_Utils.isEmpty(recId) || SWC_Utils.isEmpty(recIdsJson)) return;
            let expensesRecIds = recIdsJson[record.Type.VENDOR_BILL] || recIdsJson[record.Type.CREDIT_MEMO];
            let TOIds = recIdsJson[record.Type.TRANSFER_ORDER];
            record.submitFields({
                type: "customrecord_swc_warehouse",
                id: recId,
                values: {
                    custrecord_swc_warehouse_transaction: expensesRecIds[0],
                    custrecord_swc_warehouse_to1: TOIds[0],
                    custrecord_swc_warehouse_to2: TOIds[1],
                    custrecord_swc_warehouse_mistakememo: ""
                }
            });
        }

        /**
         * 创建过程中发生异常 删除已创建的记录
         * @param recIdsJson
         */
        function deleteRecs(recIdsJson){
            log.audit("deleteRecs recIdsJson", JSON.stringify(recIdsJson));
            if (SWC_Utils.isEmpty(recIdsJson)) return;
            let expensesKey = record.Type.VENDOR_BILL;
            if (SWC_Utils.isEmpty(recIdsJson[expensesKey])) expensesKey = record.Type.CREDIT_MEMO;
            let IFIds = recIdsJson[record.Type.ITEM_FULFILLMENT];
            let IRIds = recIdsJson[record.Type.ITEM_RECEIPT];
            let TOIds = recIdsJson[record.Type.TRANSFER_ORDER];
            let expensesRecIds = recIdsJson[record.Type.VENDOR_BILL] || recIdsJson[record.Type.CREDIT_MEMO];
            deleteRecsInArr(IRIds, record.Type.ITEM_RECEIPT);
            deleteRecsInArr(IFIds, record.Type.ITEM_FULFILLMENT);
            deleteRecsInArr(TOIds, record.Type.TRANSFER_ORDER);
            deleteRecsInArr(expensesRecIds, expensesKey);
        }

        /**
         * 根据数组里的id删除单据
         * @param ids
         * @param type
         */
        function deleteRecsInArr(ids, type){
            if (SWC_Utils.isEmpty(ids)) return;
            for (let index in ids){
                record.delete({type: type, id: ids[index]});
            }
        }

        return {
            getInputData,
            // map,
            reduce,
            summarize
        }

    });
