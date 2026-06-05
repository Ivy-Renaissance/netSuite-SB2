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

        // 暂定功能每月1日定时执行 取上个期间
        const getInputData = (inputContext) => {
            let dataJson = {};
            try {
                let getLastPeriodStart = new Date();
                let lastPeriodInfo = getLastPeriod();
                log.audit("lastPeriodInfo", JSON.stringify(lastPeriodInfo));
                log.audit("getLastPeriod running time", new Date() - getLastPeriodStart);
                if (SWC_Utils.isEmpty(lastPeriodInfo)) return {};

                // 尾程各类费用 检索
                let getLastMileFeesInfoStart = new Date();
                getLastMileFeesInfo(dataJson, lastPeriodInfo);
                log.audit("after getLastMileFeesInfo", JSON.stringify(dataJson));
                log.audit("getLastMileFeesInfo running time", new Date() - getLastMileFeesInfoStart);

                // 其他平台广告数据 检索
                let getOpAdvertisementInfoStart = new Date();
                getOpAdvertisementInfo(dataJson, lastPeriodInfo);
                log.audit("after getOpAdvertisementInfo", JSON.stringify(dataJson));
                log.audit("getOpAdvertisementInfo running time", new Date() - getOpAdvertisementInfoStart);

                // 积加 广告报告 检索
                let getJJAdvertisementReportInfoStart = new Date();
                getJJAdvertisementReportInfo(dataJson, lastPeriodInfo);
                log.audit("after getJJAdvertisementReportInfo", JSON.stringify(dataJson));
                log.audit("getJJAdvertisementReportInfo running time", new Date() - getJJAdvertisementReportInfoStart);

                // 小鹿结算报告-RPA 检索
                let getXLSettlementReportInfoStart = new Date();
                getXLSettlementReportInfo(dataJson, lastPeriodInfo);
                log.audit("after getXLSettlementReportInfo", JSON.stringify(dataJson));
                log.audit("getXLSettlementReportInfo running time", new Date() - getXLSettlementReportInfoStart);

                // 尾程费用-仓租 检索
                let getWareHouseInfoStart = new Date();
                getWareHouseInfo(dataJson, lastPeriodInfo);
                log.audit("after getWareHouseInfo", JSON.stringify(dataJson));
                log.audit("getWareHouseInfo running time", new Date() - getWareHouseInfoStart);

                // 成本还原-批次跟踪 检索
                let getBatchTrackInfoStart = new Date();
                getBatchTrackInfo(dataJson, lastPeriodInfo);
                log.audit("after getBatchTrackInfo", JSON.stringify(dataJson));
                log.audit("getBatchTrackInfo running time", new Date() - getBatchTrackInfoStart);
            }catch (e) {
                log.audit("getInputData error", JSON.stringify(e));
            }

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
            try {
                let key = mapContext.key;
                let value = mapContext.value;
                let dataJson = value? JSON.parse(value): {};
                createOrUpdateIncomeStatement(dataJson, key);
            }catch (e) {
                log.audit("map error", e);
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

        /**
         * 检索上一个期间
         * @returns {{}}
         */
        function getLastPeriod() {
            let periodInfo = {};
            let yesterdayObj = runtime.getCurrentScript().getParameter({name: "custscript_swc_mr_test_date"}); // test date
            let formatValue = yesterdayObj? yesterdayObj: SWC_Utils.getBeforeDate(1)
            let yesterdayStr = format.format({value: formatValue, type: format.Type.DATE});
            log.audit("yesterdayStr", yesterdayStr);
            let periodSql = `SELECT accountingPeriod.id AS id, accountingPeriod.enddate AS enddate, accountingPeriod.startdate AS startdate FROM accountingPeriod WHERE NVL(accountingPeriod.isquarter, 'F') = 'F'
                AND NVL(accountingPeriod.isyear, 'F') = 'F' AND accountingPeriod.enddate >= '${yesterdayStr}' AND accountingPeriod.startdate <= '${yesterdayStr}'`;
            let periodResults = SWC_Utils.getAllSqlResults(periodSql);
            if (SWC_Utils.isEmpty(periodResults) || periodResults.length <= 0) return periodInfo;
            let result = periodResults[0];
            periodInfo.id = result.id;
            periodInfo.endDate = result.enddate;
            periodInfo.startDate = result.startdate;
            return periodInfo;
        }

        /**
         * 尾程各类费用 检索
         * @param dataJson
         * @param lastPeriodInfo 为检索自定义记录追加时间的过滤条件
         */
        function getLastMileFeesInfo(dataJson, lastPeriodInfo) {
            if (SWC_Utils.isEmpty(lastPeriodInfo)) return;
            let periodId = lastPeriodInfo.id;
            let sql = `SELECT 
                CUSTOMRECORD_SWC_LASTMILE_FEES.id AS id /*内部id*/, 
                CUSTOMRECORD_SWC_LASTMILE_FEES.custrecord_swc_ilastmile_vendor AS custrecord_swc_ilastmile_vendor /*供应商*/, 
                CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_sku AS custrecord_swc_lastmile_sku /*尾程各类费用明细.尾程费用_SKU*/, 
                CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_amount AS custrecord_swc_lastmile_amount /*尾程各类费用明细.尾程费用_金额*/
                FROM 
                CUSTOMRECORD_SWC_LASTMILE_FEES
                left join CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS on CUSTOMRECORD_SWC_LASTMILE_FEES.id = CUSTOMRECORD_SWC_LASTMILE_FEES_DETAILS.custrecord_swc_lastmile_main
                WHERE 
                NVL(CUSTOMRECORD_SWC_LASTMILE_FEES.isinactive, 'F') = 'F' 
                AND CUSTOMRECORD_SWC_LASTMILE_FEES.custrecord_swc_lastmile_date BETWEEN '${lastPeriodInfo.startDate}' AND '${lastPeriodInfo.endDate}'`;
            let results = SWC_Utils.getAllSqlResults(sql);
            log.audit("尾程各类费用 检索 条数", results.length);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return;
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                let entity = result.custrecord_swc_ilastmile_vendor || "";
                let platForm = ""; // 暂时没字段
                let sku = result.custrecord_swc_lastmile_sku || "";
                let amount = result.custrecord_swc_lastmile_amount || 0;
                // 按 会计期间、SKU、平台、店铺 分组
                let key = periodId + "_" + sku + "_" + platForm + "_" + entity;
                let recJson = dataJson[key] = dataJson[key] || {};
                recJson.custrecordcustrecordcustrecord_income_pe = periodId; // 会计期间
                recJson.custrecordcustrecord_income_statement_pl = platForm; // 平台
                recJson.custrecord_income_statement_item = sku; // 货品
                recJson.custrecord_income_statement_customer = ""; // 店铺 (尾程各类费用 维护的为 供应商 暂时赋空)
                recJson.custrecord_income_platform_last_fee = SWC_Utils.addSumIsNumber(amount, recJson.custrecord_income_platform_last_fee || 0); // 平台-尾程费
            }
        }

        /**
         * 其他平台广告数据 检索
         * @param dataJson
         * @param lastPeriodInfo 为检索自定义记录追加时间的过滤条件
         */
        function getOpAdvertisementInfo(dataJson, lastPeriodInfo){
            if (SWC_Utils.isEmpty(lastPeriodInfo)) return;
            let periodId = lastPeriodInfo.id;
            let sql = `SELECT 
                CUSTOMRECORD_SWC_OP_ADVERTISEMENT.custrecord_swc_sku AS custrecord_swc_sku /*SKU*/, 
                CUSTOMRECORD_SWC_OP_ADVERTISEMENT.custrecord_swc_store AS custrecord_swc_store /*店铺*/, 
                CUSTOMRECORD_SWC_OP_ADVERTISEMENT.custrecord_swc_price AS custrecord_swc_price /*金额*/, 
                CUSTOMRECORD_SWC_OP_ADVERTISEMENT.custrecord_swc_op_platform AS custrecord_swc_op_platform /*平台*/
                FROM 
                CUSTOMRECORD_SWC_OP_ADVERTISEMENT
                WHERE 
                NVL(CUSTOMRECORD_SWC_OP_ADVERTISEMENT.isinactive, 'F') = 'F'
                AND CUSTOMRECORD_SWC_OP_ADVERTISEMENT.custrecord_swc_date BETWEEN '${lastPeriodInfo.startDate}' AND '${lastPeriodInfo.endDate}'
                AND CUSTOMRECORD_SWC_OP_ADVERTISEMENT.id IN ('3301')`;
            let results = SWC_Utils.getAllSqlResults(sql);
            log.audit("其他平台广告数据 检索 条数", results.length);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return;
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                let entity = result.custrecord_swc_store || "";
                let platForm = result.custrecord_swc_op_platform;
                let sku = result.custrecord_swc_sku || "";
                let amount = result.custrecord_swc_price || 0;
                // 按 会计期间、SKU、平台、店铺 分组
                let key = periodId + "_" + sku + "_" + platForm + "_" + entity;
                let recJson = dataJson[key] = dataJson[key] || {};
                recJson.custrecordcustrecordcustrecord_income_pe = periodId; // 会计期间
                recJson.custrecordcustrecord_income_statement_pl = platForm; // 平台
                recJson.custrecord_income_statement_item = sku; // 货品
                recJson.custrecord_income_statement_customer = entity; // 店铺
                recJson.custrecord_income_platform_advertis_fee = SWC_Utils.addSumIsNumber(amount, recJson.custrecord_income_platform_advertis_fee || 0); // 平台-广告费
            }
        }

        /**
         * 积加 广告报告 检索
         * @param dataJson
         * @param lastPeriodInfo 为检索自定义记录追加时间的过滤条件
         */
        function getJJAdvertisementReportInfo(dataJson, lastPeriodInfo){
            if (SWC_Utils.isEmpty(lastPeriodInfo)) return;
            let periodId = lastPeriodInfo.id;
            let sql = `SELECT 
                CUSTOMRECORD_SWC_JJ_ADVERTISEMENT_REPORT.custrecord_swc_jj_adv_store AS custrecord_swc_jj_adv_store /*店铺*/, 
                CUSTOMRECORD_SWC_JJ_ADVERTISEMENT_REPORT.custrecord_swc_jj_adv_cost AS custrecord_swc_jj_adv_cost /*cost*/
                FROM 
                CUSTOMRECORD_SWC_JJ_ADVERTISEMENT_REPORT
                WHERE 
                NVL(CUSTOMRECORD_SWC_JJ_ADVERTISEMENT_REPORT.isinactive, 'F') = 'F'
                
                AND CUSTOMRECORD_SWC_JJ_ADVERTISEMENT_REPORT.id IN ('697')`;
            // AND CUSTOMRECORD_SWC_JJ_ADVERTISEMENT_REPORT.custrecord_swc_jj_adv_createdate BETWEEN '${lastPeriodInfo.startDate}' AND '${lastPeriodInfo.endDate}'
            let results = SWC_Utils.getAllSqlResults(sql);
            log.audit("积加 广告报告 检索 条数", results.length);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return;
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                let entity = result.custrecord_swc_jj_adv_store || "";
                let platForm = ""; // 暂时没字段
                let sku = ""; // 暂时没字段
                let amount = result.custrecord_swc_jj_adv_cost || 0;
                // 按 会计期间、SKU、平台、店铺 分组
                let key = periodId + "_" + sku + "_" + platForm + "_" + entity;
                let recJson = dataJson[key] = dataJson[key] || {};
                recJson.custrecordcustrecordcustrecord_income_pe = periodId; // 会计期间
                recJson.custrecordcustrecord_income_statement_pl = platForm; // 平台
                recJson.custrecord_income_statement_item = sku; // 货品
                recJson.custrecord_income_statement_customer = entity; // 店铺
                recJson.custrecord_income_platform_advertis_fee = SWC_Utils.addSumIsNumber(amount, recJson.custrecord_income_platform_advertis_fee || 0); // 平台-广告费
            }
        }

        /**
         * 小鹿结算报告-RPA
         * @param dataJson
         * @param lastPeriodInfo 为检索自定义记录追加时间的过滤条件
         */
        function getXLSettlementReportInfo(dataJson, lastPeriodInfo){
            if (SWC_Utils.isEmpty(lastPeriodInfo)) return;
            let periodId = lastPeriodInfo.id;
            let sql = `SELECT 
                CUSTOMRECORD_SWC_XL_SETTLEMENREPORT.custrecord_swc_shop AS custrecord_swc_shop /*店铺*/, 
                CUSTOMRECORD_SWC_XL_SETTLEMENREPORT.custrecord_swc_platform AS custrecord_swc_platform /*平台*/, 
                CUSTOMRECORD_SWC_XL_SETTLEMENREPORT.custrecord_swc_ac_6601_01_02 AS custrecord_swc_ac_6601_01_02 /*卡车费*/, 
                CUSTOMRECORD_SWC_XL_SETTLEMENREPORT.custrecord_swc_ac_6601_01_01 AS custrecord_swc_ac_6601_01_01 /*快递费*/, 
                CUSTOMRECORD_SWC_XL_SETTLEMENREPORT.custrecord_swc_ac_6601_03 AS custrecord_swc_ac_6601_03 /*广告费*/, 
                CUSTOMRECORD_SWC_XL_SETTLEMENREPORT.custrecord_swc_ac_6601_05 AS custrecord_swc_ac_6601_05 /*订阅费*/, 
                CUSTOMRECORD_SWC_XL_SETTLEMENREPORT.custrecord_swc_ac_6601_08_02 AS custrecord_swc_ac_6601_08_02 /*处置费*/, 
                CUSTOMRECORD_SWC_XL_SETTLEMENREPORT.custrecord_swc_ac_6601_04 AS custrecord_swc_ac_6601_04 /*破损费*/, 
                CUSTOMRECORD_SWC_XL_SETTLEMENREPORT.custrecord_swc_ac_6601_11 AS custrecord_swc_ac_6601_11 /*其他费用*/, 
                CUSTOMRECORD_SWC_XL_SETTLEMENREPORT.custrecord_swc_ac_6601_06 AS custrecord_swc_ac_6601_06 /*操作手续费*/, 
                CUSTOMRECORD_SWC_XL_SETTLEMENREPORT.custrecord_swc_ac_6099 AS custrecord_swc_ac_6099 /*仓租费*/
                FROM 
                CUSTOMRECORD_SWC_XL_SETTLEMENREPORT
                WHERE 
                NVL(CUSTOMRECORD_SWC_XL_SETTLEMENREPORT.isinactive, 'F') = 'F'
                
                AND CUSTOMRECORD_SWC_XL_SETTLEMENREPORT.id IN ('221495')`;
            // AND CUSTOMRECORD_SWC_XL_SETTLEMENREPORT.custrecord_swc_orderdate BETWEEN '${lastPeriodInfo.startDate}' AND '${lastPeriodInfo.endDate}'
            let results = SWC_Utils.getAllSqlResults(sql);
            log.audit("小鹿结算报告-RPA 检索 条数", results.length);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return;
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                let entity = result.custrecord_swc_shop || "";
                let platForm = result.custrecord_swc_platform;
                let sku = ""; // 暂时没字段
                let truckFee = result.custrecord_swc_ac_6601_01_02 || 0; // 卡车费
                let deliveryFee = result.custrecord_swc_ac_6601_01_01 || 0; // 快递费
                let advertiseFee = result.custrecord_swc_ac_6601_03 || 0; // 广告费
                let subscriptFee = result.custrecord_swc_ac_6601_05 || 0; // 订阅费
                let disposalFee = result.custrecord_swc_ac_6601_08_02 || 0; // 处置费
                let brokenFee = result.custrecord_swc_ac_6601_04 || 0; // 破损费
                let otherFee = result.custrecord_swc_ac_6601_11 || 0; // 其他费用 (暂无对应字段)
                let operateFee = result.custrecord_swc_ac_6601_06 || 0; // 操作手续费 (暂无对应字段)
                let storageFee = result.custrecord_swc_ac_6099 || 0; // 仓租费
                // 按 会计期间、SKU、平台、店铺 分组
                let key = periodId + "_" + sku + "_" + platForm + "_" + entity;
                let recJson = dataJson[key] = dataJson[key] || {};
                recJson.custrecordcustrecordcustrecord_income_pe = periodId; // 会计期间
                recJson.custrecordcustrecord_income_statement_pl = platForm; // 平台
                recJson.custrecord_income_statement_item = sku; // 货品
                recJson.custrecord_income_statement_customer = entity; // 店铺
                recJson.custrecord_income_last_truck_fee = SWC_Utils.addSumIsNumber(truckFee, recJson.custrecord_income_last_truck_fee || 0); // 尾程-卡车费
                recJson.custrecord_income_last_delivery_fee = SWC_Utils.addSumIsNumber(deliveryFee, recJson.custrecord_income_last_delivery_fee || 0); // 尾程-快递费
                recJson.custrecord_income_platform_advertis_fee = SWC_Utils.addSumIsNumber(advertiseFee, recJson.custrecord_income_platform_advertis_fee || 0); // 平台-广告费
                recJson.custrecord_income_platform_subscript_fee = SWC_Utils.addSumIsNumber(subscriptFee, recJson.custrecord_income_platform_subscript_fee || 0); // 平台-订阅费
                recJson.custrecord_income_discard_disposal_fee = SWC_Utils.addSumIsNumber(disposalFee, recJson.custrecord_income_discard_disposal_fee || 0); // 弃置-处置费
                recJson.custrecord_income_platform_broken_fee = SWC_Utils.addSumIsNumber(brokenFee, recJson.custrecord_income_platform_broken_fee || 0); // 平台-破损费
                recJson.custrecord_income_ware_storage_fee = SWC_Utils.addSumIsNumber(storageFee, recJson.custrecord_income_ware_storage_fee || 0); // 库内-仓租费
            }
        }

        /**
         * 尾程费用-仓租 检索
         * @param dataJson
         * @param lastPeriodInfo 为检索自定义记录追加时间的过滤条件
         */
        function getWareHouseInfo(dataJson, lastPeriodInfo){
            if (SWC_Utils.isEmpty(lastPeriodInfo)) return;
            let periodId = lastPeriodInfo.id;
            let sql = `SELECT 
                CUSTOMRECORD_SWC_WAREHOUSE.custrecord_swc_warehouse_vendor AS custrecord_swc_warehouse_vendor /*供应商*/, 
                CUSTOMRECORD_SWC_WAREHOUSE_DETAILS.custrecord_swc_warehouse_sku AS custrecord_swc_warehouse_sku /*尾程费用-仓租明细*/, 
                CUSTOMRECORD_SWC_WAREHOUSE_DETAILS.custrecord_swc_warehouse_amount AS custrecord_swc_warehouse_amount /*尾程费用-仓租明细*/
                FROM 
                CUSTOMRECORD_SWC_WAREHOUSE
                left join CUSTOMRECORD_SWC_WAREHOUSE_DETAILS ON CUSTOMRECORD_SWC_WAREHOUSE.id = CUSTOMRECORD_SWC_WAREHOUSE_DETAILS.custrecord_swc_warehouse_main
                WHERE 
                NVL(CUSTOMRECORD_SWC_WAREHOUSE.isinactive, 'F') = 'F' 
                AND CUSTOMRECORD_SWC_WAREHOUSE.custrecord_swc_warehouse_date BETWEEN '${lastPeriodInfo.startDate}' AND '${lastPeriodInfo.endDate}'`;
            let results = SWC_Utils.getAllSqlResults(sql);
            log.audit("尾程费用-仓租 检索 条数", results.length);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return;
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                let entity = result.custrecord_swc_warehouse_vendor || "";
                let platForm = ""; // 暂时没字段
                let sku = result.custrecord_swc_warehouse_sku || "";
                let amount = result.custrecord_swc_warehouse_amount || 0;
                // 按 会计期间、SKU、平台、店铺 分组
                let key = periodId + "_" + sku + "_" + platForm + "_" + entity;
                let recJson = dataJson[key] = dataJson[key] || {};
                recJson.custrecordcustrecordcustrecord_income_pe = periodId; // 会计期间
                recJson.custrecordcustrecord_income_statement_pl = platForm; // 平台
                recJson.custrecord_income_statement_item = sku; // 货品
                recJson.custrecord_income_statement_customer = ""; // 店铺 (尾程费用-仓租 维护的为 供应商 暂时赋空)
                recJson.custrecord_income_platform_last_fee = SWC_Utils.addSumIsNumber(amount, recJson.custrecord_income_platform_last_fee || 0); // 平台-尾程费
            }
        }

        /**
         * 成本还原-批次跟踪 检索
         * @param dataJson
         * @param lastPeriodInfo 为检索自定义记录追加时间的过滤条件
         */
        function getBatchTrackInfo(dataJson, lastPeriodInfo){
            if (SWC_Utils.isEmpty(lastPeriodInfo)) return;
            let periodId = lastPeriodInfo.id;
            let sql = `SELECT 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_subsidiary AS custrecord_swc_bt_subsidiary /*公司*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_sku AS custrecord_swc_bt_sku /*SKU*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_batch AS custrecord_swc_bt_batch /*批次*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_export_tax_rebate AS custrecord_swc_bt_export_tax_rebate /*出口退税*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_po_transfer_fee AS custrecord_swc_bt_po_transfer_fee /*采购-调拨费*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_miscellaneous_expenses AS custrecord_swc_bt_miscellaneous_expenses /*采购-杂费*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_domestic_trailer_fee AS custrecord_swc_bt_domestic_trailer_fee /*头程-国内拖车费*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_customs_clearance_fee AS custrecord_swc_bt_customs_clearance_fee /*{头程-国内报关费}*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_domestic_port_charges AS custrecord_swc_bt_domestic_port_charges /*头程-国内港杂费*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_ocean_freight AS custrecord_swc_bt_ocean_freight /*头程-海运费*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_of_insurance_fee AS custrecord_swc_bt_of_insurance_fee /*头程-海运保险费*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_tariff AS custrecord_swc_bt_tariff /*头程-关税*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_clearance_fee AS custrecord_swc_bt_clearance_fee /*头程-清关手续费*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_port_miscellaneous AS custrecord_swc_bt_port_miscellaneous /*头程-目的港港杂费*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_port_trailer_fee AS custrecord_swc_bt_port_trailer_fee /*头程-目的港拖车费*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_abnormal_expenses AS custrecord_swc_bt_abnormal_expenses /*头程-异常费用*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_other_expenses AS custrecord_swc_bt_other_expenses /*头程-其他费用*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_storage_fee AS custrecord_swc_bt_storage_fee /*库内-入库费*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_rental_fee AS custrecord_swc_bt_rental_fee /*库内-仓租费（在库）*/, 
                CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_out_price AS custrecord_swc_bt_out_price /*出库成本*/
                FROM 
                CUSTOMRECORD_SWC_BATCH_TRACK
                WHERE 
                NVL(CUSTOMRECORD_SWC_BATCH_TRACK.isinactive, 'F') = 'F'
                
                AND CUSTOMRECORD_SWC_BATCH_TRACK.id IN ('917')`;
            // AND CUSTOMRECORD_SWC_BATCH_TRACK.custrecord_swc_bt_date BETWEEN '${lastPeriodInfo.startDate}' AND '${lastPeriodInfo.endDate}'
            let results = SWC_Utils.getAllSqlResults(sql);
            log.audit("成本还原-批次跟踪 检索 条数", results.length);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return;
            for (let i = 0; i < results.length; i++){
                let result = results[i];
                let entity = "";
                let platForm = ""; // 暂时没字段
                let sku = result.custrecord_swc_bt_sku || "";
                // 按 会计期间、SKU、平台、店铺 分组
                let key = periodId + "_" + sku + "_" + platForm + "_" + entity;
                let recJson = dataJson[key] = dataJson[key] || {};
                recJson.custrecordcustrecordcustrecord_income_pe = periodId; // 会计期间
                recJson.custrecordcustrecord_income_statement_pl = platForm; // 平台
                recJson.custrecord_income_statement_item = sku; // 货品
                recJson.custrecord_income_statement_customer = entity; // 店铺
                recJson.custrecord_income_statement_subsidiary = result.custrecord_swc_bt_subsidiary; // 公司
                recJson.custrecord_income_statement_batch = result.custrecord_swc_bt_batch; // 店铺

                recJson.custrecord_income_statement_export_tax = SWC_Utils.addSumIsNumber(recJson.custrecord_income_statement_export_tax || 0, result.custrecord_swc_bt_export_tax_rebate || 0); // 出口退税
                recJson.custrecord_income_statement_transfer_fee = SWC_Utils.addSumIsNumber(recJson.custrecord_income_statement_transfer_fee || 0, result.custrecord_swc_bt_po_transfer_fee || 0); // 采购调拨费
                recJson.custrecord_income_statement_pur_expenses = SWC_Utils.addSumIsNumber(recJson.custrecord_income_statement_pur_expenses || 0, result.custrecord_swc_bt_miscellaneous_expenses || 0); // 采购-杂费
                recJson.custrecord_income_head_d_trailer_fee = SWC_Utils.addSumIsNumber(recJson.custrecord_income_head_d_trailer_fee || 0, result.custrecord_swc_bt_domestic_trailer_fee || 0); // 头程-国内拖车费
                recJson.custrecord_income_head_d_declaration_fee = SWC_Utils.addSumIsNumber(recJson.custrecord_income_head_d_declaration_fee || 0, result.custrecord_swc_bt_customs_clearance_fee || 0); // 头程-国内报关费
                recJson.custrecord_income_head_d_port_fee = SWC_Utils.addSumIsNumber(recJson.custrecord_income_head_d_port_fee || 0, result.custrecord_swc_bt_domestic_port_charges || 0); // 头程-国内港杂费
                recJson.custrecord_income_head_ocean_freight_fee = SWC_Utils.addSumIsNumber(recJson.custrecord_income_head_ocean_freight_fee || 0, result.custrecord_swc_bt_ocean_freight || 0); // 头程-海运费
                recJson.custrecord_income_head_ocean_insuran_fee = SWC_Utils.addSumIsNumber(recJson.custrecord_income_head_ocean_insuran_fee || 0, result.custrecord_swc_bt_of_insurance_fee || 0); // 头程-海运保险费
                recJson.custrecord_income_head_tariff = SWC_Utils.addSumIsNumber(recJson.custrecord_income_head_tariff || 0, result.custrecord_swc_bt_tariff || 0); // 头程-关税
                recJson.custrecord_income_head_clearance_fee = SWC_Utils.addSumIsNumber(recJson.custrecord_income_head_clearance_fee || 0, result.custrecord_swc_bt_clearance_fee || 0); // 头程-清关手续费
                recJson.custrecord_income_head_des_port_fee = SWC_Utils.addSumIsNumber(recJson.custrecord_income_head_des_port_fee || 0, result.custrecord_swc_bt_port_miscellaneous || 0); // 头程-目的港港杂
                recJson.custrecord_income_head_des_port_tra_fee = SWC_Utils.addSumIsNumber(recJson.custrecord_income_head_des_port_tra_fee || 0, result.custrecord_swc_bt_port_trailer_fee || 0); // 头程-目的港拖车费
                recJson.custrecord_income_head_abnormal_fee = SWC_Utils.addSumIsNumber(recJson.custrecord_income_head_abnormal_fee || 0, result.custrecord_swc_bt_abnormal_expenses || 0); // 头程-异常费用
                recJson.custrecord_income_head_other_fee = SWC_Utils.addSumIsNumber(recJson.custrecord_income_head_other_fee || 0, result.custrecord_swc_bt_other_expenses || 0); // 头程-其他费用
                recJson.custrecord_income_ware_warehousing_fee = SWC_Utils.addSumIsNumber(recJson.custrecord_income_ware_warehousing_fee || 0, result.custrecord_swc_bt_storage_fee || 0); // 库内-入库费
                recJson.custrecord_income_ware_storage_fee = SWC_Utils.addSumIsNumber(recJson.custrecord_income_ware_storage_fee || 0, result.custrecord_swc_bt_rental_fee || 0); // 库内-仓租费
                recJson.custrecord_income_ware_outbound_fee = SWC_Utils.addSumIsNumber(recJson.custrecord_income_ware_outbound_fee || 0, result.custrecord_swc_bt_out_price || 0); // 库内-出库费
            }
        }

        /**
         * 创建 SKU利润表
         * @param dataJson
         * @param key
         */
        function createOrUpdateIncomeStatement(dataJson, key){
            let splitArr = key.split("_");
            if (SWC_Utils.isEmpty(dataJson)) return;
            let recId = searchIncomeStatement(splitArr);
            let recObj;
            if (SWC_Utils.isEmpty(recId)){
                recObj = record.create({type: "customrecord_swc_income_statement", isDynamic: true});
            }else {
                recObj = record.load({type: "customrecord_swc_income_statement", id: recId, isDynamic: true});
            }
            for (let fieldId in dataJson){
                let value = dataJson[fieldId];
                recObj.setValue({fieldId: fieldId, value: value});
            }
            recObj.save();
        }

        /**
         * 根据分组条件检索是否存在 存在则更新
         */
        function searchIncomeStatement(dataArr) {
            let recId = "";
            // 按 会计期间、SKU、平台、店铺 分组
            let sql = "SELECT CUSTOMRECORD_SWC_INCOME_STATEMENT.id AS id FROM CUSTOMRECORD_SWC_INCOME_STATEMENT WHERE ";
                // CUSTOMRECORD_SWC_INCOME_STATEMENT.custrecordcustrecordcustrecord_income_pe IN (${dataArr[0] || ''})
                // AND CUSTOMRECORD_SWC_INCOME_STATEMENT.custrecordcustrecord_income_statement_pl IN (${dataArr[2] || ''})
                // AND CUSTOMRECORD_SWC_INCOME_STATEMENT.custrecord_income_statement_item IN (${dataArr[1] || ''})
                // AND CUSTOMRECORD_SWC_INCOME_STATEMENT.custrecord_income_statement_customer IN (${dataArr[3] || ''});
            let periodFilter = "CUSTOMRECORD_SWC_INCOME_STATEMENT.custrecordcustrecordcustrecord_income_pe IN (" + dataArr[0] + ") ";
            let platformFilter = "AND CUSTOMRECORD_SWC_INCOME_STATEMENT.custrecordcustrecord_income_statement_pl IN (" + dataArr[2] + ") ";
            let itemFilter = "AND CUSTOMRECORD_SWC_INCOME_STATEMENT.custrecord_income_statement_item IN (" + dataArr[1] + ") ";
            let customerFilter = "AND CUSTOMRECORD_SWC_INCOME_STATEMENT.custrecord_income_statement_customer IN (" + dataArr[3] + ") ";
            if (SWC_Utils.isEmpty(dataArr[0])) periodFilter = "CUSTOMRECORD_SWC_INCOME_STATEMENT.custrecordcustrecordcustrecord_income_pe IS NULL ";
            if (SWC_Utils.isEmpty(dataArr[2])) platformFilter = "AND CUSTOMRECORD_SWC_INCOME_STATEMENT.custrecordcustrecord_income_statement_pl IS NULL ";
            if (SWC_Utils.isEmpty(dataArr[1])) itemFilter = "AND CUSTOMRECORD_SWC_INCOME_STATEMENT.custrecord_income_statement_item IS NULL ";
            if (SWC_Utils.isEmpty(dataArr[3])) customerFilter = "AND CUSTOMRECORD_SWC_INCOME_STATEMENT.custrecord_income_statement_customer IS NULL";
            let results = SWC_Utils.getAllSqlResults(sql + periodFilter + platformFilter + itemFilter + customerFilter);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return recId;
            return results[0].id;
        }

        return {getInputData, map, reduce, summarize}

    });
