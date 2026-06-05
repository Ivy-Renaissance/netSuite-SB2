/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/runtime', '../common/SWC_CONFIG_DATA','../common/MatchTool'],
    (record, search,runtime,SWC_CONFIG_DATA,MatchTool) => {
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
            //内部ID
            var id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_lostcost_id' });
            var data = getNeedData(id);
            log.audit('data',data);

            return data
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
            let key = mapContext.key;
            let value = JSON.parse(mapContext.value);
            log.audit('key', key);
            log.audit('value', value);

            let id = key.split('_')[0];
            let servicId = key.split('_')[1];
            let currency = key.split('_')[2];
            let noData = value['no'];
            let enoData = value['no'];

            try {
                // let key = mapContext.key;
                // let value = JSON.parse(mapContext.value);
                // log.audit('key', key);
                // log.audit('value', value);
                //
                // let id = key.split('_')[0];
                // let vendorId = key.split('_')[1];
                // let currency = key.split('_')[2];

                if (servicId == '' || servicId == 'null') {
                    throw new Error('地点档案信息维护有误！');
                }
                let vendorId = searchVendor(servicId);
                log.audit('vendorId', vendorId);
                if (!vendorId) {
                    throw new Error('供应商档案信息维护有误！');
                }
                let skuData = value['itemData'];
                let classObj = searchClass(skuData);
                log.audit('classObj', classObj);
                if (Object.keys(classObj).length <= 0) {
                    throw new Error('缺少对应货品类型！');
                }
                let termsData = searchBillTerms(vendorId);
                let terms;
                if (termsData.length > 0) {
                    terms = termsData[0];
                }

                let location = value['location'];
                let returnObj = {};

                delete value['itemData'];
                delete value['no'];
                delete value['location'];

                //检索该供应商下的尾程费用税率
                let taxObj = searchTax(vendorId);
                log.audit('taxObj',taxObj);

                var poRec = record.create({type: "purchaseorder", isDynamic: true});
                poRec.setValue({
                    fieldId: 'entity',
                    value: vendorId
                });

                var entity = poRec.getValue({fieldId: 'entity',});
                log.audit('entity',entity);

                //付款条件
                if (terms) {
                    poRec.setValue({fieldId: 'custbody_swc_vendor_payment_terms',value: terms});
                }

                //类型
                poRec.setValue({fieldId: 'custbody_swc_order_type2',value: SWC_CONFIG_DATA.configData().s_po_type_wcfy_y});//后续需调整 尾程费用类型
                //类型
                poRec.setValue({fieldId: 'custbody_swc_po_fee',value: SWC_CONFIG_DATA.configData().s_po_type_wcfy_y});//后续需调整 尾程费用类型

                //货币
                poRec.setValue({
                    fieldId: 'currency',
                    value: currency
                });

                poRec.setValue({
                    fieldId: 'custbody_swc_wchplv',
                    value: id
                });
                for (let lineKey in value) {
                    var lineObj = value[lineKey];
                    log.audit('lineObj',lineObj);

                    var item = lineKey.split('_')[0];
                    var platformNumber = lineKey.split('_')[1];
                    var trackNumber = lineKey.split('_')[2];

                    var lineItemName = lineObj.itemName;
                    var shipAmount = lineObj.ship_fee;
                    var otherAmount = lineObj.other_fee;

                    var LineClass;
                    if (lineItemName in classObj) {
                        LineClass = classObj[lineItemName];
                    }
                    log.audit('LineClass',LineClass);

                    var lineCount = poRec.getLineCount({
                        sublistId: 'item',
                    });
                    log.audit('lineCount',lineCount);
                    if (shipAmount) {
                        poRec.selectNewLine({
                            sublistId: 'item',
                        });
                        poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: SWC_CONFIG_DATA.configData().s_item_wckcf//4376
                        });
                        let tax = taxObj[SWC_CONFIG_DATA.configData().s_item_wckcf];
                        log.audit('tax',tax);

                        let amount = MatchTool.fixed(MatchTool.divN(shipAmount,MatchTool.addN(1,tax)),2);
                        let taxAmount = MatchTool.fixed(MatchTool.subN(shipAmount,amount),2);

                        log.audit('amount',amount);
                        log.audit('taxAmount',taxAmount);

                        poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: amount
                        });
                        poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'amount',
                            value: amount
                        });
                        poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'tax1amt',
                            value: taxAmount,
                        });
                        if (LineClass) poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'class',
                            value: LineClass
                        });
                        if (item) poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_swc_lastmile_sku1',
                            value: item
                        });
                        if (platformNumber) poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_swc_lastmile_receipt1',
                            value: platformNumber
                        });
                        if (trackNumber) poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_swc_lastmile_track1',
                            value: trackNumber
                        });
                        poRec.commitLine({
                            sublistId: 'item'
                        });
                    }

                    if (otherAmount) {
                        poRec.selectNewLine({
                            sublistId: 'item',
                        });
                        poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: SWC_CONFIG_DATA.configData().s_item_wcqtfyx
                        });
                        let tax = taxObj[SWC_CONFIG_DATA.configData().s_item_wckcf];
                        log.audit('tax',tax);

                        let amount = MatchTool.fixed(MatchTool.divN(shipAmount,MatchTool.addN(1,tax)),2);
                        let taxAmount = MatchTool.fixed(MatchTool.subN(shipAmount,amount),2);

                        log.audit('amount',amount);
                        log.audit('taxAmount',taxAmount);
                        poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: otherAmount
                        });
                        poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'amount',
                            value: otherAmount
                        });
                        poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'tax1amt',
                            value: taxAmount,
                        });
                        if (LineClass) poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'class',
                            value: LineClass
                        });
                        if (item) poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_swc_lastmile_sku1',
                            value: item
                        });
                        if (platformNumber) poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_swc_lastmile_receipt1',
                            value: platformNumber
                        });
                        if (trackNumber) poRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_swc_lastmile_track1',
                            value: trackNumber
                        });
                        poRec.commitLine({
                            sublistId: 'item'
                        });
                    }
                }

                var poId = poRec.save();
                log.audit('poId', poId);

                // let shipRec = record.transform(
                //     {fromType: 'purchaseorder', fromId: poId, toType: 'itemreceipt', isDynamic: true});

                // shipRec.setValue({fieldId: 'custbody_swc_fulfillment_flag',value: true});
                // var shipId = shipRec.save();
                // log.audit('shipId',shipId);

                // let billRec = record.transform(
                //     {fromType: 'purchaseorder', fromId: poId, toType: 'vendorbill', isDynamic: true});
                //
                // // billRec.setValue({
                // //     fieldId: 'custbody_swc_po_fee',
                // //     value: 6
                // // });
                //
                // var billId = billRec.save({ignoreMandatoryFields: true});
                // log.audit('billId', billId);
                //custbody_swc_fee_po_id
                returnObj[id] = {};
                returnObj[id][location] = {
                    "noData": noData,
                    "po": poId,
                    // "bill": billId
                }

                log.audit('returnObj', returnObj);

                for (let key in returnObj) {
                    mapContext.write({
                        key: 'itemfulfillment' + '_' + key, // 确保 key 为字符串
                        value: returnObj[key]
                    });
                }
            } catch (e) {
                var errorObj = {};
                errorObj[id] = {
                    lineId: enoData,
                    error: e.message
                }
                mapContext.write({
                    key: 'error' + '_'  + id, // 确保 key 为字符串
                    value: errorObj[id]
                });
                log.error('error',e.message)
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
            const key = reduceContext.key;
            log.audit('key', key);
            // const len = reduceContext.values.length;
            let type = key.split('_')[0];
            let id = key.split('_')[1];
            try {
                let value = mergeJSONStrings(reduceContext.values);
                log.audit('value', value);
                if (type == 'itemfulfillment') {
                    let adRec = record.load({
                        type: 'itemfulfillment',
                        id: id,
                        isDynamic: true
                    });
                    let lineCount = adRec.getLineCount({sublistId: 'item'});
                    log.audit('lineCount', lineCount);
                    adRec.setValue({
                        fieldId: 'custbody_swc_ful_lostfee_error',
                        value: ''
                    });
                    adRec.setValue({
                        fieldId: 'custbody_swc_ful_lostfee_flag',
                        value: true
                    })
                    if (lineCount) {
                        for (let i = 0; i < lineCount; i++) {
                            adRec.selectLine({
                                sublistId: 'item',
                                line: i
                            });
                            var location = adRec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'location'
                            });
                            log.audit('location', location);

                            if (location in value) {
                                var lineDataArray = value[location];
                                log.audit('lineDataArray', lineDataArray);
                                var no = adRec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_swc_line_no'
                                });
                                log.audit('no', no);
                                lineDataArray.forEach(lineData => {
                                    if (lineData.noData.indexOf(String(no)) !== -1) {
                                        adRec.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'custcol_swc_lost_po',
                                            value: lineData.po
                                        });
                                        // 注意：同一行可能匹配多个 po，这里后执行的会覆盖先执行的，如有需要请修改逻辑
                                    }
                                });
                            }
                            adRec.commitLine({sublistId: 'item'});
                        }
                    }
                    var adRecId = adRec.save();
                    log.audit('adRecId', adRecId);
                }
                if (type == 'error') {
                    // 直接构建错误数组
                    let errorList = [];
                    reduceContext.values.forEach(str => {
                        try {
                            let obj = JSON.parse(str);
                            errorList.push(obj);   // obj 格式：{ lineId: ["1"], error: "xxx" }
                        } catch (e) {
                            log.error('解析错误JSON失败', e);
                        }
                    });
                    log.audit('errorList', errorList);
                    let messageObj = {};
                    errorList.forEach(err => {
                        // err.lineId 是一个数组，例如 ["1"]，取第一个元素作为行号字符串
                        let lineId = Array.isArray(err.lineId) ? err.lineId[0] : err.lineId;
                        messageObj[lineId] = err.error;
                    });

                    let adRec = record.load({
                        type: 'itemfulfillment',
                        id: id,
                        isDynamic: true
                    });
                    // var message = {};
                    // for (let ekey in value) {
                    //     var lineData = value[ekey].lineId;
                    //     message[lineData] = value[ekey].error;
                    // }
                    adRec.setValue({
                        fieldId: 'custbody_swc_ful_lostfee_error',
                        value: JSON.stringify(message)
                    });
                    adRec.setValue({
                        fieldId: 'custbody_swc_ful_lostfee_flag',
                        value: false
                    });
                    var adRecId = adRec.save();
                    log.audit('adRecId', adRecId);
                }
            } catch (e) {
                log.error('error',e.message);
            }
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

        function mergeJSONStrings(jsonStrings) {
            const result = {};

            jsonStrings.forEach((str, index) => {
                try {
                    const obj = JSON.parse(str);
                    Object.keys(obj).forEach(key => {
                        if (result.hasOwnProperty(key)) {
                            // 如果已经是数组，直接 push
                            if (Array.isArray(result[key])) {
                                result[key].push(obj[key]);
                            } else {
                                // 理论上不会走到这里，但为了安全，将原值转为数组
                                result[key] = [result[key], obj[key]];
                            }
                        } else {
                            // 第一次出现，初始化为数组
                            result[key] = [obj[key]];
                        }
                    });
                } catch (e) {
                    log.error(`解析第 ${index} 个JSON字符串失败:`, e);
                }
            });

            return result;
        }

        function   getNeedData(id) {
            var filter = [
                ["type","anyof","ItemShip"],
                "AND",
                ["custbody_swc_ful_lostfee_flag","is","F"],
                "AND",
                [
                    ["custcol_swc_others_price_","isnotempty",""],
                    "OR",
                    ["custcol_swc_shipping_price_","isnotempty",""]
                ],
                // "AND",
                // ["internalid","anyof","4505"]
            ]
            if (id) {
                filter.push('AND');
                filter.push(["internalid","anyof",id]);
            }
            const itemfulfillmentSearchObj = search.create({
                type: "itemfulfillment",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                filter,
                columns:
                    [
                        search.createColumn({name: "item", label: "货品"}),
                        search.createColumn({name: "custcol_swc_others_price_", label: "尾程其他出库费"}),
                        search.createColumn({name: "custcol_swc_shipping_price_", label: "尾程运费"}),
                        search.createColumn({name: "locationnohierarchy", label: "地点（无层次结构）"}),
                        search.createColumn({
                            name: "custrecord_swc_overseas_warehouse_servic",
                            join: "location",
                            label: "海外仓服务商"
                        }),
                        search.createColumn({
                            name: "itemid",
                            join: "item",
                            label: "名称"
                        }),
                        search.createColumn({
                            name: "custcol_swc_line_no",
                            label: "NO"
                        }),
                        search.createColumn({
                            name: "custcol_swc_lastmile_receipt1",
                            label: "尾程费用_平台订单号"
                        }),
                        search.createColumn({
                            name: "custcol_swc_lastmile_track1",
                            label: "尾程费用_跟踪号"
                        }),
                        search.createColumn({
                            name: "custcol_swc_currency",
                            label: "货币"
                        }),
                    ]
            });

            var obj = {};
            var vendorObj = {};
            var results = getAllResults(itemfulfillmentSearchObj);
            log.audit('results',results);
            for (let i = 0;i < results.length;i++) {
                let result = results[i];
                let id = result.id;
                let item = result.getValue({name: "item", label: "货品"});
                let other_fee = result.getValue({name: "custcol_swc_others_price_", label: "尾程其他出库费"});
                if (other_fee) other_fee = Number(other_fee);
                let ship_fee = result.getValue({name: "custcol_swc_shipping_price_", label: "尾程运费"});
                if (ship_fee) ship_fee = Number(ship_fee);
                let location = result.getValue({name: "locationnohierarchy", label: "地点（无层次结构）"});
                let no = result.getValue({
                    name: "custcol_swc_line_no",
                    label: "NO"
                });
                let servic = result.getValue({
                    name: "custrecord_swc_overseas_warehouse_servic",
                    join: "location",
                    label: "海外仓服务商"
                });
                let itemName = result.getValue({
                    name: "itemid",
                    join: "item",
                    label: "名称"
                });
                let platformNumber = result.getValue({
                    name: "custcol_swc_lastmile_receipt1",
                    label: "尾程费用_出库单号"
                });
                let trackNumber = result.getValue({
                    name: "custcol_swc_lastmile_track1",
                    label: "尾程费用_跟踪号"
                });
                let currency = result.getValue({
                    name: "custcol_swc_currency",
                    label: "货币"
                });
                var key = id + '_' + servic + '_' + currency;
                // log.audit('key',key);

                if (!(key in obj)) {
                    obj[key] = {}
                    obj[key] = {
                        "itemData": [],
                        "no": [],
                        "location": location
                    }
                }

                var lineKey = item + '_' + platformNumber + '_' + trackNumber;
                // log.audit('lineKey',lineKey);
                if (!(lineKey in obj[key])) {
                    obj[key][lineKey] = {
                        item: item,
                        other_fee: other_fee,
                        ship_fee: ship_fee,
                        servic: servic,
                        itemName: itemName
                    }
                } else {
                    obj[key][lineKey].other_fee = obj[key][lineKey].other_fee + other_fee;
                    obj[key][lineKey].ship_fee = obj[key][lineKey].ship_fee + ship_fee;
                }
                obj[key]['no'].push(no);
                obj[key]['itemData'].push(itemName);
            }
            return obj
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

        function searchClass(itemData) {

            var filter = [];
            if (itemData.length) {

                for (let i = 0;i < itemData.length;i++) {
                    filter.push(["name", "startswith", itemData[i]]);
                    if (i != itemData.length - 1) {
                        filter.push('OR');
                    }
                }

                const classificationSearchObj = search.create({
                    type: "classification",
                    filters:
                        [
                            // ["subsidiary", "anyof", sub],
                            // 'AND',
                            filter
                        ],
                    columns:
                        [
                            search.createColumn({name: "name", label: "名称"}),
                            search.createColumn({name: "internalid", label: "内部 ID"})
                        ]
                });

                let results = getAllResults(classificationSearchObj);

                let obj = {};

                for (let i = 0; i < results.length;i++) {
                    let result = results[i];
                    let name = result.getValue({name: "name", label: "名称"});
                    let id = result.getValue({name: "internalid", label: "内部 ID"});

                    obj[name] = id;
                }

                return obj
            }
        }

        function searchBillTerms(vendor) {
            const vendorSearchObj = search.create({
                type: "vendor",
                filters:
                    [
                        ["internalid","anyof",vendor]
                    ],
                columns:
                    [
                        search.createColumn({name: "custentity_swc_payment_terms", label: "付款条件"})
                    ]
            });
            let results = getAllResults(vendorSearchObj);
            let accountArr ;
            let accountData = [];
            results.forEach(value => {
                accountArr =  value.getValue({name: "custentity_swc_payment_terms", label: "付款条件"})
            });

            if (accountArr) {
                if (typeof accountArr === 'string' && accountArr.trim() !== '') {
                    var ids = accountArr.split(',').map(function(id) {
                        return id.trim();
                    }).filter(function(id) {
                        return id !== '';
                    });

                    ids.forEach(function(id) {
                        accountData.push(id);
                    });
                } else if (Array.isArray(accountArr)) {
                    accountArr.forEach(function(item) {
                        accountData.push(item);
                    });
                } else if (accountArr != null) {
                    accountData.push(accountArr);
                }
            }

            return accountData
        }

        function searchVendor(servicId) {
            const vendorSearchObj = search.create({
                type: "vendor",
                filters:
                    [
                        ["custentity_swc_ow_servic_vendor","anyof",servicId]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });
            var vendorId;
            vendorSearchObj.run().each(function(result){
                vendorId = result.id;
                return true;
            });

            return vendorId
        }

        function searchTax(vendor) {
            const customrecord_lost_cost_taxSearchObj = search.create({
                type: "customrecord_lost_cost_tax",
                filters:
                    [
                        ["custrecord_lost_cost_tax_vendor","anyof",vendor],
                        "AND",
                        [
                            ["custrecord_lost_cost_tax_type","anyof",SWC_CONFIG_DATA.configData().s_item_wckcf],
                            "OR",
                            ["custrecord_lost_cost_tax_type","anyof",SWC_CONFIG_DATA.configData().s_item_wcqtfyx]
                        ]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"}),
                        search.createColumn({name: "custrecord_lost_cost_tax_sub", label: "子公司"}),
                        search.createColumn({name: "custrecord_lost_cost_tax_vendor", label: "供应商"}),
                        search.createColumn({name: "custrecord_lost_cost_tax_type", label: "服务类型"}),
                        search.createColumn({name: "custrecord_lost_cost_tax_tax", label: "税率"})
                    ]
            });

            let results = getAllResults(customrecord_lost_cost_taxSearchObj);

            let obj = {};
            results.forEach(value => {
                let type =  value.getValue({name: "custrecord_lost_cost_tax_type", label: "服务类型"});
                let tax =  value.getValue({name: "custrecord_lost_cost_tax_tax", label: "税率"});
                if (tax) tax = parseFloat(tax) / 100;
                obj[type] = tax;
            });

            return obj
        }

        return {getInputData, map, reduce, summarize}

    });