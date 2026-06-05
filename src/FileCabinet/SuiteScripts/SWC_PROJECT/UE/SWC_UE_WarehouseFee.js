/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/search", "../common/SWC_Utils.js"],

    (search, SWC_Utils) => {

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            try {

                let curRec = scriptContext.newRecord;
                let type = scriptContext.type;
                log.audit("type", type);
                if (type != scriptContext.UserEventType.CREATE && type != scriptContext.UserEventType.EDIT) return;
                if (curRec.type == "customrecord_swc_warehouse") updateShipmentIdByline(curRec);
                updateShipment(curRec);

            }catch (e) {
                log.audit("beforeSubmit error", e);
            }
        }

        function getShipmentIdJson(orderNumArr) {
            let shipmentIdJson = {};
            log.audit("orderNumArr", JSON.stringify(orderNumArr));
            if (SWC_Utils.isEmpty(orderNumArr) || orderNumArr.length <= 0) return shipmentIdJson;
            let filters = [["isinactive","is","F"]]; // 非活动 F
            let orderNumFilters = [];
            for (let index in orderNumArr){
                let orderNum = orderNumArr[index];
                if (index == 0){
                    orderNumFilters.push(["custrecord_swc_hw_lc_number","is",orderNum]); // 海外仓入库单号
                }else {
                    orderNumFilters.push("OR",["custrecord_swc_hw_lc_number","is",orderNum]); // 海外仓入库单号
                }
            }
            filters.push("AND", orderNumFilters);
            var customrecord_swc_wl_plan_orderSearchObj = search.create({
                type: "customrecord_swc_wl_plan_order",
                filters: filters,
                columns: [search.createColumn({name: "custrecord_swc_hw_lc_number", label: "海外仓入库单号"})]
            });
            let results = SWC_Utils.getAllResults(customrecord_swc_wl_plan_orderSearchObj);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return shipmentIdJson;
            for (let i = 0; i < results.length; i++){
                let result = results[i];
                let incomeNum = result.getValue({name: "custrecord_swc_hw_lc_number"}); // 海外仓入库单号
                let shipmentId = result.id;
                let shipmentIdArr = shipmentIdJson[incomeNum] = shipmentIdJson[incomeNum] || [];
                if (!SWC_Utils.isEmpty(shipmentId) && !shipmentIdArr.includes(shipmentId)) shipmentIdArr.push(shipmentId);
            }
            return shipmentIdJson;
        }

        /**
         * 尾程费用-仓租 保存时更新 明细行 物流发运单
         * @param curRec
         */
        function updateShipmentIdByline(curRec){
            let sublistId = "recmachcustrecord_swc_warehouse_main";
            let lineCount = curRec.getLineCount({sublistId: sublistId});
            if (lineCount <= 0) return;
            let orderNumArr = [];
            for (let i = 0; i < lineCount; i++) {
                let orderNum = curRec.getSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_warehouse_input", line: i}); // 仓租费用_入库单号
                if (!SWC_Utils.isEmpty(orderNum) && !orderNumArr.includes(orderNum)) orderNumArr.push(orderNum);
            }
            let shipmentIdJson = getShipmentIdJson(orderNumArr); // 根据 子列表的仓租费用_入库单号 检索 物流发运单 关联到对应行上
            log.audit("shipmentIdJson", JSON.stringify(shipmentIdJson));
            if (SWC_Utils.isEmpty(shipmentIdJson)) return;
            for (let i = 0; i < lineCount; i++) {
                let orderNum = curRec.getSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_warehouse_input", line: i}); // 仓租费用_入库单号
                if (SWC_Utils.isEmpty(orderNum)) continue;
                let shipmentIdArr = shipmentIdJson[orderNum];
                if (SWC_Utils.isEmpty(shipmentIdArr) || shipmentIdArr.length <= 0) continue;
                curRec.setSublistValue({sublistId: sublistId, fieldId: "custrecord_swc_warehouse_shipment", value: shipmentIdArr, line: i}); // 物流发运单
            }
        }

        /**
         * 尾程费用-仓租明细 保存时更新 物流发运单
         * @param curRec
         */
        function updateShipment(curRec){
            let orderNum = curRec.getValue({fieldId: "custrecord_swc_warehouse_input"}); // 仓租费用_入库单号
            if (SWC_Utils.isEmpty(orderNum)) return;
            let shipmentIds = getShipmentIds(orderNum);
            if (SWC_Utils.isEmpty(shipmentIds) || shipmentIds.length <= 0) return;
            curRec.setValue({fieldId: "custrecord_swc_warehouse_shipment", value: shipmentIds}); // 物流发运单
        }

        function getShipmentIds(orderNum){
            let shipmentIds = [];
            if (SWC_Utils.isEmpty(orderNum)) return shipmentIds;
            var customrecord_swc_wl_plan_orderSearchObj = search.create({
                type: "customrecord_swc_wl_plan_order",
                filters:
                    [
                        ["isinactive","is","F"], // 非活动 F
                        "AND",
                        ["custrecord_swc_hw_lc_number","is",orderNum] // 海外仓入库单号
                    ],
                columns: []
            });
            let results = SWC_Utils.getAllResults(customrecord_swc_wl_plan_orderSearchObj);
            if (SWC_Utils.isEmpty(results) || results.length <= 0) return shipmentIds;
            for (let i = 0; i < results.length; i++){
                let shipmentId = results[i].id;
                if (!SWC_Utils.isEmpty(shipmentId) && !shipmentIds.includes(shipmentId)) shipmentIds.push(shipmentId);
            }
            return shipmentIds;
        }

        return {beforeSubmit}

    });
