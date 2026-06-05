/**
 * @NApiVersion 2.1
 * @NModuleScope public
 * 业务相关共通方法
 */
define(["N/query","N/format","N/search","N/record","./SWCUtils"],

function(query,format,search,record,SWCUtils) {
    /**
     * 关闭SO
     * @param options.id 销售订单ID
     */
    function closeSO(options){
        var data = {};
        var id = options.id;
        //如果open不传或者为false，则isclosed为true；否则isclosed为false
        var isclosed = !options.open;
        var rec = record.load({type:"salesorder",id:id,isDynamic:true})
        var count = rec.getLineCount({sublistId:"item"});
        var itemsInfo = data.itemsInfo ={};
        for(var i =0;i<count;i++){
            rec.selectLine({sublistId:"item",line:i});
            var item = rec.getCurrentSublistValue({sublistId:"item",fieldId:"item"});
            var qty = rec.getCurrentSublistValue({sublistId:"item",fieldId:"quantity"});
            itemsInfo[item]= qty;
            rec.setCurrentSublistValue({sublistId:"item",fieldId:"isclosed",value:isclosed})
            rec.commitLine({sublistId:"item"});
        }
        rec.save({
            ignoreMandatoryFields:true
        });
        return data;
    }

    /**
     * 关闭业务单据，如TO
     * options.type recordType
     * options.id
     */
   function closeTrans(options){
       var type = options.type;
       var id = options.id;
       var data = {};
       //如果open不传或者为false，则isclosed为true；否则isclosed为false
       var isclosed = !options.open;
       var rec = record.load({type:type, id: id, isDynamic: true})
       var count = rec.getLineCount({sublistId: "item"});
       var itemsInfo = data.itemsInfo = {};
       for (var i = 0; i < count; i++) {
           rec.selectLine({sublistId: "item", line: i});
           var item = rec.getCurrentSublistValue({sublistId: "item", fieldId: "item"});
           var qty = rec.getCurrentSublistValue({sublistId: "item", fieldId: "quantity"});
           itemsInfo[item] = qty;
           rec.setCurrentSublistValue({sublistId: "item", fieldId: "isclosed", value: isclosed})
           rec.commitLine({sublistId: "item"});
       }
       rec.save({
           ignoreMandatoryFields: true
       });
       return data;
   }

    //库存调整默认科目
    // var AJ_ACCOUNT =  619; //待处理财产损益
    /**
     * 处理入库单
     */
    function processItemReceiptForPO(options){
        var type = options.type;
        var id = options.id;
        var items = options.items;
        var fields = options.fields;  //单据头字段值列表
        var loc = options.loc;
        var binnum = options.binnum;
        //收货汇总，po根据实际上架进行收货
        var recSummary = options.recSummary;
        var itemRcptRec = record.transform({
            fromType:type,
            fromId:id,
            toType:"itemreceipt",
            isDynamic:true
        });

        //头部字段设置
        if(fields && fields.length){
            fields.forEach(function(fieldJson){
                itemRcptRec.setValue(fieldJson)
            });
        }

        //item 设置
        var count = itemRcptRec.getLineCount({sublistId:"item"});
        for(var i =0;i<count;i++){
            var item = itemRcptRec.getSublistValue({sublistId:"item",fieldId:"item",line:i});
            itemRcptRec.selectLine({sublistId:"item",line:i})
            if(items[item]) {
                //未收货，或者实际收货数量为0，则跳过
                if(!recSummary[item] ||!recSummary[item].aq){
                    itemRcptRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value:false});
                    continue;
                }
                itemRcptRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value:true});
                //计算收货数量
                var qty = 0;
                var diff = recSummary[item].q;
                if(diff > 0){
                    //如果差异数量>0,则收货数量=单据数量+差异数量
                    qty = Number(items[item].q) + Number(diff);
                    //将差异清零
                    recSummary[item].q = 0;
                }else{
                    //收货数量= Min(单据数量，实收数量)
                    qty = Math.min(items[item].q,recSummary[item].aq);
                }
                //将实收数量扣减 收货数量
                recSummary[item].aq -= qty;

                if(loc){
                    itemRcptRec.setCurrentSublistValue({sublistId: "item", fieldId: "location",value:loc});
                }

                itemRcptRec.setCurrentSublistValue({sublistId: "item", fieldId: "quantity",value: qty});

                //设置储位
                if(binnum){
                    var subRec = itemRcptRec.getCurrentSublistSubrecord({sublistId:"item",fieldId:"inventorydetail"});
                    subRec.selectNewLine({sublistId:"inventoryassignment"});
                    // subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"binnumber",value:"1"});
                    subRec.setCurrentSublistText({sublistId:"inventoryassignment",fieldId:"binnumber",text:binnum})
                    subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"quantity",value:qty});
                    subRec.commitLine({sublistId:"inventoryassignment"});
                }

                itemRcptRec.commitLine({sublistId:"item"})
            }else{
                itemRcptRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value: false});
                // itemRcptRec.setCurrentSublistValue({sublistId:"item",fieldId:"quantity",value:null});
            }
        }

        itemRcptRec.save({ignoreMandatoryFields:true});

    }

    function processItemReceipt(options){
        var type = options.type;
        var id = options.id;
        var items = options.items;
        var fields = options.fields;  //单据头字段值列表
        var loc = options.loc;
        var binnum = options.binnum;
        var lineCB = options.lineCB;
        var bodyCB = options.bodyCB;
        var itemRcptRec = record.transform({
            fromType:type,
            fromId:id,
            toType:"itemreceipt",
            isDynamic:true
        });

        //头部字段设置
        if(fields && fields.length){
            fields.forEach(function(fieldJson){
                itemRcptRec.setValue(fieldJson)
            });
        }

        //item 设置
        var count = itemRcptRec.getLineCount({sublistId:"item"});
        for(var i =0;i<count;i++){
            var item = itemRcptRec.getSublistValue({sublistId:"item",fieldId:"item",line:i});
            itemRcptRec.selectLine({sublistId:"item",line:i})
            if(items[item]) {
                itemRcptRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value:true});
                if(loc){
                    itemRcptRec.setCurrentSublistValue({sublistId: "item", fieldId: "location",value:loc});
                }
                itemRcptRec.setCurrentSublistValue({sublistId: "item", fieldId: "quantity",value: items[item].q});

                //设置储位
                if(binnum){
                    var subRec = itemRcptRec.getCurrentSublistSubrecord({sublistId:"item",fieldId:"inventorydetail"});
                    subRec.selectNewLine({sublistId:"inventoryassignment"});
                    // subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"binnumber",value:"1"});
                    subRec.setCurrentSublistText({sublistId:"inventoryassignment",fieldId:"binnumber",text:binnum})
                    subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"quantity",value:items[item].q});
                    subRec.commitLine({sublistId:"inventoryassignment"});
                }

                if(lineCB){
                    lineCB(item,items[item].q,itemRcptRec);
                }

                itemRcptRec.commitLine({sublistId:"item"})
            }else{
                itemRcptRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value: false});
                // itemRcptRec.setCurrentSublistValue({sublistId:"item",fieldId:"quantity",value:null});
            }
        }

        if(bodyCB){
            bodyCB(itemRcptRec);
        }

        var id = itemRcptRec.save({ignoreMandatoryFields:true});
        return id;

    }



    /**
     * 处理出库单
     * @param options
     */
    function processItemFulfillment(options){
        var type = options.type;
        var id = options.id;
        var items = options.items;
        var fields = options.fields;  //单据头字段值列表
        var loc = options.loc||null;
        var binnum = options.binnumber;
        var destFulfillItems = options.destFulfillItems||{}; //目的地实际发货汇总信息（复核信息）
        var lineCB = options.lineCB;
        var bodyCB = options.bodyCB;

        var fulfillRec = record.transform({
            fromType:type,
            fromId:id,
            toType:"itemfulfillment",
            isDynamic:true
        });

        //头部字段设置
        if(fields && fields.length){
            fields.forEach(function(fieldJson){
                fulfillRec.setValue(fieldJson)
            });
        }

        //item 设置
        var count = fulfillRec.getLineCount({sublistId:"item"});
        for(var i =0;i<count;i++){
            var item = fulfillRec.getSublistValue({sublistId:"item",fieldId:"item",line:i});

            fulfillRec.selectLine({sublistId:"item",line:i})
            if(items[item] && destFulfillItems[item] && destFulfillItems[item].q > 0) {
                var qty = Math.min(items[item].q,destFulfillItems[item].q );
                destFulfillItems[item].q -= qty;

                fulfillRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value:true});
                if(loc){
                    fulfillRec.setCurrentSublistValue({sublistId: "item", fieldId: "location",value:loc});
                }
                fulfillRec.setCurrentSublistValue({sublistId: "item", fieldId: "quantity",value: qty});

                //设置储位
                if(binnum) {

                    var subRec = fulfillRec.getCurrentSublistSubrecord({sublistId: "item", fieldId: "inventorydetail"});
                    removeLines(subRec,"inventoryassignment")

                    subRec.selectNewLine({sublistId: "inventoryassignment"});
                    // subRec.setCurrentSublistValue({sublistId: "inventoryassignment", fieldId: "binnumber", value: "1"});
                    subRec.setCurrentSublistText({sublistId:"inventoryassignment",fieldId:"binnumber",text:binnum})

                    subRec.setCurrentSublistValue({sublistId: "inventoryassignment", fieldId: "quantity", value: qty});
                    subRec.commitLine({sublistId: "inventoryassignment"});
                }

                if(lineCB){
                    lineCB(item,qty,fulfillRec);
                }

                fulfillRec.commitLine({sublistId:"item"})
            }else{
                fulfillRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value: false});
            }
        }

        if(bodyCB){
            bodyCB(fulfillRec)
        }

        var fulfillId = fulfillRec.save({ignoreMandatoryFields:true});
        return fulfillId;

    }

    function removeLines(rec,sublistId){
        var count = rec.getLineCount({sublistId:sublistId});
        for(var i = 0;i<count;i++){
            rec.removeLine({sublistId:sublistId,line:0})
        }
    }

    /**
     * 处理出库单
     * @param options
     */
    function processItemFulfillmentV2(options){
        var type = options.type;
        var id = options.id;
        var items = options.items;
        var fields = options.fields;  //单据头字段值列表
        var loc = options.loc||null;
        var useLineAsKey = options.useLineAsKey;
        var binnumber = options.binnumber||null;
        var useBinNum = options.useBinNum;
        var bin = options.bin||null;
        var status = options.status;  //inventory status
        var lineCB = options.lineCB;
        var bodyCB = options.bodyCB;

        var fulfillRec = record.transform({
            fromType:type,
            fromId:id,
            toType:"itemfulfillment",
            isDynamic:true
        });

        //头部字段设置
        if(fields && fields.length){
            fields.forEach(function(fieldJson){
                fulfillRec.setValue(fieldJson)
            });
        }

        //item 设置
        var count = fulfillRec.getLineCount({sublistId:"item"});
        for(var i =0;i<count;i++){
            var item = fulfillRec.getSublistValue({sublistId:"item",fieldId:"item",line:i});
            var line = fulfillRec.getSublistValue({sublistId:"item",fieldId:"line",line:i});
            fulfillRec.selectLine({sublistId:"item",line:i})
            var key = useLineAsKey?line:item;
            var itemJson = items[key];
            var qty = itemJson.total;
            if( qty > 0) {
                fulfillRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value:true});
                if(loc){
                    fulfillRec.setCurrentSublistValue({sublistId: "item", fieldId: "location",value:loc});
                }
                fulfillRec.setCurrentSublistValue({sublistId: "item", fieldId: "quantity",value: qty});

                //如果item中未设置bin，并且item 无批号管理，则不创建inventory detail
                /*if(!itemJson.bins && !notEmptyJson(itemJson.nums)){
                    fulfillRec.commitLine({sublistId:"inventory"});
                    if(lineCB){
                        lineCB(item,qty,fulfillRec);
                    }
                    continue;
                }*/

                //设置inventory detail
                var subRec = fulfillRec.getCurrentSublistSubrecord({sublistId:"item",fieldId:"inventorydetail"});
                removeLines(subRec,"inventoryassignment");

                if(notEmptyJson(itemJson.nums)){
                    util.each(itemJson.nums,function(numJson,lotNum){
                        if(!numJson.bins){
                                setBinNumber(subRec,binnumber,bin,null,null,lotNum,"issueinventorynumber",numJson.total,status);
                            }else{
                                util.each(numJson.bins,function(binJson,binId){
                                setBinNumber(subRec,useBinNum?binId:null,binId,null,null,lotNum,"issueinventorynumber",binJson.q,status);
                            })
                        }
                    })
                }else{
                    if(!itemJson.bins){
                        setBinNumber(subRec,binnumber,bin,null,null,null,"issueinventorynumber",itemJson.total,status);
                    }else{
                        util.each(itemJson.bins,function(binJson,binId){
                            setBinNumber(subRec,useBinNum?binId:null,binId,null,null,null,"issueinventorynumber",binJson.q,status);
                        })
                    }
                }
                fulfillRec.commitLine({sublistId:"item"})
            }else{
                fulfillRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value: false});
            }
        }

        if(bodyCB){
            bodyCB(fulfillRec)
        }

        var fulfillId = fulfillRec.save({ignoreMandatoryFields:true});
        return fulfillId;

    }


    /**
     * 处理出库单(根据实际拣货设置inventory detail)
     * TODO 超发的情况
     * @param options
     */
    function processItemFulfillmentV3(options){
        var type = options.type;
        var id = options.id;
        var items = options.items;
        var actItems = options.actItems; //实际发货信息
        var fields = options.fields;  //单据头字段值列表
        var loc = options.loc||null;
        var useLineAsKey = options.useLineAsKey;
        var binnumber = options.binnumber||null;
        var useBinNum = options.useBinNum;
        var bin = options.bin||null;
        var status = options.status;  //inventory status
        var lineCB = options.lineCB;
        var bodyCB = options.bodyCB;
        var totalField = options.totalField||"total";
        //使用item_ut的模式，即通过item 和 单位 的组合唯一定位行，以支持多单位出库
        var useItemUt = options.useItemUt;
        //实际JSON的key，是否使用line进行标识，在无储位出库的情况使用
        var useLineAsActKey = options.useLineAsActKey;
        var fulfillRec = record.transform({
            fromType:type,
            fromId:id,
            toType:"itemfulfillment",
            isDynamic:true
        });

        //头部字段设置
        if(fields && fields.length){
            fields.forEach(function(fieldJson){
                fulfillRec.setValue(fieldJson)
            });
        }

        var hasLines = false;
        //item 设置
        var count = fulfillRec.getLineCount({sublistId:"item"});
        for(var i =0;i<count;i++){
            var item = fulfillRec.getSublistValue({sublistId:"item",fieldId:"item",line:i});
            var line = fulfillRec.getSublistValue({sublistId:"item",fieldId:"line",line:i});
            fulfillRec.selectLine({sublistId:"item",line:i})
            var key = useLineAsKey?line:item;
            //用于定位出库行
            var actItemKey = item;
            if(useItemUt){
                var ut = fulfillRec.getCurrentSublistValue({sublistId:"item",fieldId:"units"})||"";
                //log.audit({title:"ut",details:ut})
                actItemKey = actItemKey +"_"+ut;
            }
            if(useLineAsActKey){
                actItemKey = line;
            }
            var itemJson = items[key];
            //计划发货
            var qty = itemJson?.[totalField]||0;
            // var actItemJson = actItems[item];
            //实际发货
            var actItemJson = actItems[actItemKey];
            if(!actItemJson || !actItemJson.total ){
                fulfillRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value: false});
                continue;
            }
            var aq = Math.min(qty,actItemJson.total);
            if( aq > 0) {
                //记录实际发货数量
                itemJson.aq = aq;

                fulfillRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value:true});
                if(loc){
                    fulfillRec.setCurrentSublistValue({sublistId: "item", fieldId: "location",value:loc});
                }
                fulfillRec.setCurrentSublistValue({sublistId: "item", fieldId: "quantity",value: aq});

                //设置inventory detail
                // fulfillRec.removeCurrentSublistSubrecord({sublistId:"item",fieldId:"inventorydetail"})
                var subRec = fulfillRec.getCurrentSublistSubrecord({sublistId:"item",fieldId:"inventorydetail"});
                removeLines(subRec,"inventoryassignment");

                if(notEmptyJson(actItemJson.nums)){
                    //实际批号:数量
                    var actNums = itemJson.actNums = itemJson.actNums||{};
                    for(var lotNum in actItemJson.nums){
                        var numJson = actItemJson.nums[lotNum];
                        if(numJson.bins){
                            for(var binId in numJson.bins){
                                var binJson = numJson.bins[binId];
                                //当前subrecord 实际数量
                                var curq = Math.min(aq,binJson.q);
                                setBinNumber(subRec,useBinNum?binId:null,binId,null,null,lotNum,"issueinventorynumber",curq,status);
                                //记录实际发货批号20211110
                                actNums[lotNum] = sRound(Number(actNums[lotNum]||0) + Number(curq));

                                binJson.q = sRound(binJson.q -curq);
                                aq = sRound(aq -curq);
                                //numJson 的total 也扣减
                                numJson.total = sRound(numJson.total -curq);
                                //actItemJson 的total 也扣减
                                actItemJson.total = sRound(actItemJson.total -curq);
                                //如果把binJson的q吃掉了，则将bin移除
                                if(binJson.q <=0){
                                    delete numJson.bins[binId];
                                }
                                if(aq <= 0){
                                    break;
                                }
                            }
                        }else{
                            var curq = Math.min(aq,numJson.total);
                            aq = sRound(aq -curq);
                            numJson.total = sRound(numJson.total -curq);
                            actItemJson.total = sRound(actItemJson.total -curq);
                            setBinNumber(subRec,binnumber,bin,null,null,lotNum,"issueinventorynumber",curq,status);
                            //记录实际发货批号20211110
                            actNums[lotNum] = sRound(Number(actNums[lotNum]||0) + Number(curq));
                        }
                        if(numJson.total <=0){
                            delete actItemJson.nums[lotNum];
                        }
                        if(aq <= 0){
                            break;
                        }
                    }
                }else{
                    if(actItemJson.bins){
                        for(var binId in actItemJson.bins){
                            var binJson = actItemJson.bins[binId];
                            //当前subrecord 实际数量
                            var curq = Math.min(aq,binJson.q);
                            setBinNumber(subRec,useBinNum?binId:null,binId,null,null,null,"issueinventorynumber",curq,status);
                            binJson.q = sRound(binJson.q -curq);
                            aq = sRound(aq -curq);
                            //itemJson 的total 也扣减
                            actItemJson.total = sRound(actItemJson.total -curq);
                            //如果把binJson的q吃掉了，则将bin移除
                            if(binJson.q <=0){
                                delete actItemJson.bins[binId];
                            }
                            if(aq <= 0){
                                break;
                            }
                        }
                    }else{
                        actItemJson.total -= aq;
                        setBinNumber(subRec,binnumber,bin,null,null,null,"issueinventorynumber",aq,status);
                    }
                }

                if(actItemJson.total <= 0 ){
                    // delete actItems[item];
                    delete actItems[actItemKey];
                }
                hasLines = true;
                fulfillRec.commitLine({sublistId:"item"})
            }else{
                fulfillRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value: false});
            }
        }

        if(bodyCB){
            bodyCB(fulfillRec)
        }

        if(!hasLines){
            return;
        }

        var fulfillId = fulfillRec.save({ignoreMandatoryFields:true});
        return fulfillId;
    }


    /**
     * 处理入库单(根据实际拣货设置inventory detail)
     * TODO 超收的情况
     * @param options
     */
    function processItemReceiptV3(options){
        var type = options.type;
        var id = options.id;
        var items = options.items;
        var actItems = options.actItems; //实际收货信息
        var fields = options.fields;  //单据头字段值列表
        var loc = options.loc||null;
        var useLineAsKey = options.useLineAsKey;
        var binnumber = options.binnumber||null;
        var useBinNum = options.useBinNum;
        var bin = options.bin||null;
        var status = options.status;  //inventory status
        var lineCB = options.lineCB;
        var bodyCB = options.bodyCB;
        var totalFld = options.totalFld||"total";

        var receiptRec = record.transform({
            fromType:type,
            fromId:id,
            toType:"itemreceipt",
            isDynamic:true
        });

        //头部字段设置
        if(fields && fields.length){
            fields.forEach(function(fieldJson){
                receiptRec.setValue(fieldJson)
            });
        }

        //item 设置
        var count = receiptRec.getLineCount({sublistId:"item"});
        for(var i =0;i<count;i++){
            var item = receiptRec.getSublistValue({sublistId:"item",fieldId:"item",line:i});
            var line = receiptRec.getSublistValue({sublistId:"item",fieldId:"line",line:i});
            receiptRec.selectLine({sublistId:"item",line:i})
            var key = useLineAsKey?line:item;
            var itemJson = items[key];
            //计划收货
            var qty = itemJson.q;
            var actItemJson = actItems[item];
            if(!actItemJson || !actItemJson[totalFld] ){
                receiptRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value: false});
                continue;
            }
            var aq = Math.min(qty,actItemJson[totalFld]);
            if( aq > 0) {
                receiptRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value:true});
                if(loc){
                    receiptRec.setCurrentSublistValue({sublistId: "item", fieldId: "location",value:loc});
                }
                receiptRec.setCurrentSublistValue({sublistId: "item", fieldId: "quantity",value: aq});

                //设置inventory detail
                var subRec = receiptRec.getCurrentSublistSubrecord({sublistId:"item",fieldId:"inventorydetail"});
                removeLines(subRec,"inventoryassignment");

                if(notEmptyJson(actItemJson.nums)){
                    for(var lotNum in actItemJson.nums){
                        var numJson = actItemJson.nums[lotNum];
                        if(numJson.bins){
                            for(var binId in numJson.bins){
                                var binJson = numJson.bins[binId];
                                //当前subrecord 实际数量
                                var curq = Math.min(aq,binJson.q);
                                setBinNumber(subRec,useBinNum?binId:null,binId,null,null,lotNum,"receiptinventorynumber",curq,status);
                                binJson.q -= curq;
                                aq -= curq;
                                //numJson 的total 也扣减
                                numJson[totalFld] -= curq;
                                //actItemJson 的total 也扣减
                                actItemJson[totalFld] -= curq;
                                //如果把binJson的q吃掉了，则将bin移除
                                if(binJson.q <=0){
                                    delete numJson.bins[binId];
                                }
                                if(aq <= 0){
                                    break;
                                }
                            }
                        }else{
                            var curq = Math.min(aq,numJson[totalFld]);
                            aq -= curq;
                            numJson[totalFld] -= curq;
                            actItemJson[totalFld] -= curq;
                            setBinNumber(subRec,binnumber,bin,null,null,lotNum,"receiptinventorynumber",curq,status);
                        }
                        if(numJson[totalFld] <=0){
                            delete actItemJson.nums[lotNum];
                        }
                        if(aq <= 0){
                            break;
                        }
                    }
                }else{
                    if(actItemJson.bins){
                        for(var binId in actItemJson.bins){
                            var binJson = actItemJson.bins[binId];
                            //当前subrecord 实际数量
                            var curq = Math.min(aq,binJson.q);
                            setBinNumber(subRec,useBinNum?binId:null,binId,null,null,null,"receiptinventorynumber",curq,status);
                            binJson.q -= curq;
                            aq -= curq;
                            //itemJson 的total 也扣减
                            actItemJson[totalFld] -= curq;
                            //如果把binJson的q吃掉了，则将bin移除
                            if(binJson.q <=0){
                                delete actItemJson.bins[binId];
                            }
                            if(aq <= 0){
                                break;
                            }
                        }
                    }else{
                        actItemJson[totalFld] -= aq;
                        setBinNumber(subRec,binnumber,bin,null,null,null,"receiptinventorynumber",aq,status);
                    }
                }

                if(actItemJson[totalFld] <= 0 ){
                    delete actItems[item];
                }
                receiptRec.commitLine({sublistId:"item"})
            }else{
                receiptRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value: false});
            }
        }

        if(bodyCB){
            bodyCB(receiptRec)
        }

        var fulfillId = receiptRec.save({ignoreMandatoryFields:true});
        return fulfillId;

    }


    /**
     * 生成invoice
     * @param options
     */
    function processInvoice(options){
        var soId = options.soId;
        var tranDate = options.tranDate;
        var items = options.ifItems;
        //出库单ID
        var ifId = options.ifId;
        var invoiceRecord = record.transform({
            fromType: record.Type.SALES_ORDER,
            fromId: soId,
            toType: record.Type.INVOICE,
            isDynamic: true,
        });
        //自定义表格
        /*invoiceRecord.setValue({
            fieldId: 'customform',
            value: ''
        });*/
        if(tranDate){
            invoiceRecord.setValue({
                fieldId: 'trandate',
                value: tranDate
            });
        }
        invoiceRecord.setValue({
            fieldId: 'custbody_swc_relevance',
            value: ifId
        });

        var count = invoiceRecord.getLineCount({sublistId:"item"});
        for(var i = count-1;i>=0;i--){
            invoiceRecord.selectLine({sublistId:"item",line:i});
            var item = invoiceRecord.getCurrentSublistValue({sublistId:"item",fieldId:"item"});
            var qty = items[item] && items[item].q;
            if(!qty){
                invoiceRecord.removeLine({sublistId:"item",line:i});
            }else{
                invoiceRecord.setCurrentSublistValue({sublistId:"item",fieldId:"quantity",value:qty});
                invoiceRecord.commitLine({sublistId:"item"});
            }
        }

        var id = invoiceRecord.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });

        return id;
    }

    /**
     * 处理储位调整
     * { subsidiary:1, location:1,extras:[{fieldId:"",value:""}],direction:"one2many",bin:1,items:{<itemid>:{total:10,bins:{<bin>:10} } } }
     * @param options
     */
    function processBinTransfer(options){
        var id = options.id;
        var subsidiary = options.subsidiary;
        var location = options.location;
        var rec = null;
        if(id){
            rec = record.load({type:"bintransfer",id:id,isDynamic:true});
        }else{
            rec = record.create({type:"bintransfer",isDynamic:true});
            //设置头部
            subsidiary && rec.setValue({fieldId:"subsidiary",value:subsidiary});
            rec.setValue({fieldId:"location",value:location});
        }


        var fields = options.fields;
        fields && fields.forEach(function(fldInfo){
            rec.setValue(fldInfo);
        })
        //从一个bin，转到多个bins;many2one: 多个bins转到1个bin
        var direction = options.direction||"many2one";
        var bin = options.bin;
        var tobin = options.tobin;
        var binnumber = options.binnumber;
        var tobinnumber = options.tobinnumber;
        var items = options.items;
        for(var itemId in items){
            var itemJson = items[itemId];
            if(!itemJson.total){
                continue;
            }

            var bins = itemJson.bins;
            //设置item明细信息
            rec.selectNewLine({sublistId:"inventory"});
            rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"item",value:itemId});
            rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"quantity",value:itemJson.total})
            var subRec = rec.getCurrentSublistSubrecord({sublistId:"inventory",fieldId:"inventorydetail"});


            if(direction == "many2one"){
                for(var fromBin in bins){
                    subRec.selectNewLine({sublistId:"inventoryassignment"});
                    subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"binnumber",value:fromBin});
                    if(binnumber){
                        subRec.setCurrentSublistText({sublistId:"inventoryassignment",fieldId:"tobinnumber",text:binnumber});
                    }else{
                        subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"tobinnumber",value:bin});
                    }
                    subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"quantity",value:bins[fromBin]});
                    subRec.commitLine({sublistId:"inventoryassignment"})
                }

            }else if(direction == "one2many"){
                for(var toBin in bins){
                   // log.audit({title:"yyy",details:"yyy"+toBin+":"+itemId})
                    subRec.selectNewLine({sublistId:"inventoryassignment"});
                    if(binnumber){
                        subRec.setCurrentSublistText({sublistId:"inventoryassignment",fieldId:"binnumber",text:binnumber});
                    }else{
                        subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"binnumber",value:bin});
                    }
                    subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"tobinnumber",value:toBin});
                    subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"quantity",value:bins[toBin]});

                    subRec.commitLine({sublistId:"inventoryassignment"})
                }
            }else if(direction == "one2one"){
                subRec.selectNewLine({sublistId:"inventoryassignment"});
                //From bin
                if(binnumber){
                    subRec.setCurrentSublistText({sublistId:"inventoryassignment",fieldId:"binnumber",text:binnumber});
                }else{
                    subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"binnumber",value:bin});
                }

                //TO bin
                if(tobinnumber){
                    subRec.setCurrentSublistText({sublistId:"inventoryassignment",fieldId:"tobinnumber",text:tobinnumber});
                }else{
                    subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"tobinnumber",value:tobin});
                }
                subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"quantity",value:itemJson.total});
                subRec.commitLine({sublistId:"inventoryassignment"})
            }

            rec.commitLine({sublistId:"inventory"})

        }
        var recId = "";
        var count = rec.getLineCount({sublistId:"inventory"});
        if(count>0){
            recId = rec.save({
                ignoreMandatoryFields:true
            });
        }
        return recId;
    }

    /**
     * 检查是否是空JSON
     */
    function notEmptyJson(obj){
        return obj && Object.keys(obj).length;
    }

    /**
     * 处理储位调整
     * { subsidiary:1, location:1,extras:[{fieldId:"",value:""}],direction:"one2many",bin:1,items:{<itemid>:{total:10,nums:{},bins:{<bin>:{q:10}} } } }
     * @param options
     */
    function processBinTransferV2(options){
        var id = options.id;
        var subsidiary = options.subsidiary;
        var location = options.location;
        var totalFld = options.totalFld||"total";
        var useItemUt = options.useItemUt;
        var rec = null;
        if(id){
            rec = record.load({type:"bintransfer",id:id,isDynamic:true});
        }else{
            rec = record.create({type:"bintransfer",isDynamic:true});
            //设置头部
            // rec.setValue({fieldId:"subsidiary",value:subsidiary});
            rec.setValue({fieldId:"location",value:location});
        }

        var fields = options.fields;
        fields && fields.forEach(function(fldInfo){
            rec.setValue(fldInfo);
        })
        //从一个bin，转到多个bins;many2one: 多个bins转到1个bin
        var direction = options.direction||"many2one";
        var bin = options.bin;
        var tobin = options.tobin;
        var binnumber = options.binnumber;
        var tobinnumber = options.tobinnumber;
        var status = options.status;
        var toStatus = options.toStatus;
        var items = options.items;
        for(var itemId in items){
            var itemJson = items[itemId];
            if(!itemJson[totalFld]){
                continue;
            }
            if(useItemUt){
                itemId = itemId.split("_")[0];
            }

            //设置item明细信息
            rec.selectNewLine({sublistId:"inventory"});
            rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"item",value:itemId});
            var unit = itemJson.ut;
            if(unit){
                rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"itemunits",value:unit});
            }
            rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"quantity",value:itemJson[totalFld]})
            var subRec = rec.getCurrentSublistSubrecord({sublistId:"inventory",fieldId:"inventorydetail"});

            if(direction == "many2one"){
                if(notEmptyJson(itemJson.nums)){
                    util.each(itemJson.nums,function(numJson,lotNum){
                        util.each(numJson.bins,function(binJson,binId){
                            setBinNumber(subRec,null,binId,tobinnumber,tobin,lotNum,"issueinventorynumber",binJson.q,status,toStatus);
                        })
                    })
                }else{
                    util.each(itemJson.bins,function(binJson,binId){
                        setBinNumber(subRec,null,binId,tobinnumber,tobin,null,"issueinventorynumber",binJson.q,status,toStatus);
                    })
                }
            }else if(direction == "one2many"){
                if(notEmptyJson(itemJson.nums)){
                    util.each(itemJson.nums,function(numJson,lotNum){
                        util.each(numJson.bins,function(binJson,binId){
                            setBinNumber(subRec,binnumber,bin,null,binId,lotNum,"issueinventorynumber",binJson.q,status,toStatus);
                        })
                    })
                }else{
                    util.each(itemJson.bins,function(binJson,binId){
                        setBinNumber(subRec,binnumber,bin,null,binId,null,"issueinventorynumber",binJson.q,status,toStatus);
                    })
                }
            }else if(direction == "one2one"){
                //处理批号
                if(notEmptyJson(itemJson.nums)){
                    util.each(itemJson.nums,function(numJson,lotNum){
                        setBinNumber(subRec,binnumber,bin,tobinnumber,tobin,lotNum,"issueinventorynumber",numJson[totalFld],status,toStatus);
                    })
                }else{
                    setBinNumber(subRec,binnumber,bin,tobinnumber,tobin,null,null,itemJson[totalFld],status,toStatus);
                }
            }

            rec.commitLine({sublistId:"inventory"})

        }
        var recId = "";
        var count = rec.getLineCount({sublistId:"inventory"});
        if(count>0){
            recId = rec.save({
                ignoreMandatoryFields:true
            });
        }
        return recId;
    }

    /**
     * 设置inventory detail
     * @param subRec
     * @param binnumber 从储位
     * @param binId 从储位ID
     * @param tobinnumber 至储位
     * @param tobinId 至储位ID
     * @param lotNum 批号/序列号
     * @param qty 数量
     */
    function setBinNumber(subRec, binnumber, binId, tobinnumber, tobinId, lotNum, invNumFld, qty, status, toStatus, selectLine) {
        if (!qty) {
            return;
        }
        // status = status||1;

        try {
            if (selectLine) {
                var count = subRec.getLineCount({sublistId: "inventoryassignment"})
                if (count) {
                    subRec.selectLine({sublistId: "inventoryassignment", line: 0});
                } else {
                    subRec.selectNewLine({sublistId: "inventoryassignment"});
                }
            } else {
                subRec.selectNewLine({sublistId: "inventoryassignment"});
            }

            //批号/序列号
            if (lotNum) {
                // subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"issueinventorynumber",value:lotNum})
                subRec.setCurrentSublistText({sublistId: "inventoryassignment", fieldId: invNumFld, text: lotNum})
            }

            //储位
            if (binnumber) {
                var curBinNumber = subRec.getCurrentSublistText({
                    sublistId: "inventoryassignment",
                    fieldId: "binnumber"
                });
                // log.audit({title:"binnumber",details:curBinNumber+","+binnumber+","+lotNum})

                //储位下拉列表里已经有默认值，再次赋值会报错，此处判断即为了判断是否有默认值的情况(仍有一些情况会失效，最好全部是用id进行赋值)
                if (curBinNumber != binnumber) {
                    subRec.setCurrentSublistText({
                        sublistId: "inventoryassignment",
                        fieldId: "binnumber",
                        text: binnumber
                    });
                }
            } else if (binId) {
                subRec.setCurrentSublistValue({sublistId: "inventoryassignment", fieldId: "binnumber", value: binId});
            }

            if (tobinnumber) {
                subRec.setCurrentSublistText({
                    sublistId: "inventoryassignment",
                    fieldId: "tobinnumber",
                    text: tobinnumber
                });
            } else if (tobinId) {
                subRec.setCurrentSublistValue({
                    sublistId: "inventoryassignment",
                    fieldId: "tobinnumber",
                    value: tobinId
                });
            }

            if (status) {
                subRec.setCurrentSublistValue({
                    sublistId: "inventoryassignment",
                    fieldId: "inventorystatus",
                    value: status
                })
            }
            if (toStatus) {
                subRec.setCurrentSublistValue({
                    sublistId: "inventoryassignment",
                    fieldId: "toinventorystatus",
                    value: toStatus
                })
            }

            //数量
            subRec.setCurrentSublistValue({sublistId: "inventoryassignment", fieldId: "quantity", value: qty})
            subRec.commitLine({sublistId: "inventoryassignment"})
        } catch (e) {
            log.error({title: "setBinNumber", details: {num: lotNum, bin: binId, tobin: tobinId, qty, e}})
            throw {num: lotNum, bin: binId, tobin: tobinId, qty, msg: e.message, stack: e.stack, swcode: "COMMIT_LINE"};
        }
    }

    /**
     * 收集记录commitLine 的情况
     * @param subRec
     * @param sublistId
     * @param itemId
     * @param num
     * @param bin
     * @param binNum
     * @param qty
     */
    function commitLine({subRec,sublistId,itemId,num,bin,binNum,qty}){
        try{
            subRec.commitLine({sublistId});
        }catch(e){
            log.error({title:"commitLine",details:{itemId,num,bin,binNum,qty,e}})
            throw {itemId,num,bin,binNum,qty,msg:e.message,swcode:"COMMIT_LINE"};
        }
    }

    /**
     * 动态CRUD明细行（IT，BT）
     * @param recType 事务类型id
     * @param id 事务id
     * @param subsidiary
     * @param location
     * @param useLineAsKey 默认以itemid为key，如果useLineAsKey为true，则itemId = itemJson.item
     * @param useBinNum 使用储位编号作为key
     * @param deleteIfNoLines 如果为true，则当明细行为空的时候，删除当前record
     * @param totalFld total字段
     * @param useItemUt 是否启用item_ut作为可以
     * @param bin
     * @param binnumber
     * @param items
     * @param sublistId
     * @param direction
     * @return {string}
     */
    function processTrans({recType,id,subsidiary,location,transferlocation,useLineAsKey,useBinNum,deleteIfNoLines,totalFld="total",useItemUt,
        direction="one2one",qtyFldId="quantity",unitFld="itemunits",bin,binnumber,tobin,tobinnumber,items,sublistId="inventory",fields,status=1,toStatus=1 }){
        if(!id && (/*!subsidiary ||*/!location)){
            throw "mandatory fields:location";
        }

        if(recType == "inventorytransfer"){
            unitFld = "units";
        }

        var rec = null;
        if(id){
            rec = record.load({type:recType,id,isDynamic:true});
        }else{
            rec = record.create({type:recType,isDynamic:true});
            //设置头部
            subsidiary && rec.setValue({fieldId:"subsidiary",value:subsidiary});
            rec.setValue({fieldId:"location",value:location});
            if(transferlocation){
                rec.setValue({fieldId:"transferlocation",value:transferlocation});
            }
        }

        fields && fields.forEach(function(fldInfo){
            rec.setValue(fldInfo);
        })

        //遍历item，进行删改
        var count = rec.getLineCount({sublistId});
        for(var i = count-1;i>=0;i--){
            var item = rec.getSublistValue({sublistId,fieldId:"item",line:i});
            var itemKey = item;
            if(useItemUt){
                var ut = rec.getSublistValue({sublistId,fieldId:unitFld,line:i});
                itemKey = itemKey + "_" +ut;
            }

            var isLot = rec.getCurrentSublistValue({sublistId, fieldId: "isnumbered"});
            isLot = (isLot=="T" || isLot === true);
            // var itemJson = items[item];
            var itemJson = items[itemKey];
            //log.audit({title:"zzz",details:itemJson})
            if(!itemJson || !itemJson[totalFld] || itemJson[totalFld]<=0){
                //如果不存在，则删除
                rec.removeLine({sublistId,line:i});
                continue;
            }else{
                //更新quantiy
                rec.selectLine({sublistId,line:i});
                // rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"quantity",value:itemJson.total});
                //通过totalFld动态处理total key
                rec.setCurrentSublistValue({sublistId,fieldId:qtyFldId,value:itemJson[totalFld]});
                var subRec = rec.getCurrentSublistSubrecord({sublistId,fieldId:"inventorydetail"});
                //处理subrecord
                var subCount = subRec.getLineCount({sublistId:"inventoryassignment"});
                for(var j = subCount-1;j>=0;j--){
                    var num = subRec.getSublistText({sublistId:"inventoryassignment",fieldId:"issueinventorynumber",line:j});
                    var curBin = "";
                    if(direction == "many2one"){
                        curBin = subRec.getSublistValue({sublistId:"inventoryassignment",fieldId:"binnumber",line:j});
                    }else{
                        curBin = subRec.getSublistValue({sublistId:"inventoryassignment",fieldId:"tobinnumber",line:j});
                    }
                    // log.audit({title:"curBin",details:curBin})

                    var q = 0;
                    if(num){
                        if(curBin && itemJson.nums[num]?.bins){
                            q = itemJson.nums[num]?.bins?.[curBin]?.q||0;
                            if(q) delete  itemJson.nums[num].bins[curBin]
                        }else{
                            q = itemJson.nums[num]?.[totalFld]||0;
                            if(q) delete  itemJson.nums[num]
                        }
                    }else{
                        if(curBin && itemJson.bins){
                            q = itemJson.bins[curBin]?.q||0;
                            if(q) delete  itemJson.bins[curBin]
                        }else{
                            q = itemJson[totalFld]||0;
                            if(q) {
                                delete items[itemKey];
                                itemJson =null;
                            }
                        }
                    }

                    if(q){
                        subRec.selectLine({sublistId:"inventoryassignment",line:j});
                        //更新quantity 和 status
                        subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"quantity",value:q})
                        commitLine({subRec,sublistId:"inventoryassignment",itemId:item,num,bin:curBin,qty:q});
                        // subRec.commitLine({sublistId:"inventoryassignment"})
                    }else{
                        //删除当前行
                        subRec.removeLine({sublistId:"inventoryassignment",line:j})
                    }
                }
                // log.audit({title:item,details:itemJson})
                if(itemJson && (notEmptyJson(itemJson.bins) || notEmptyJson(itemJson.nums))){
                    //检查subrecord是否还有剩余，如有，则添加行
                    // log.audit({title:"processAddItemLine1",details:itemJson})
                    processAddItemLine({itemJson,subRec,direction,useBinNum,binnumber,bin,tobinnumber,tobin,totalFld,status,toStatus});
                }

                // delete items[item];
                delete items[itemKey];
                rec.commitLine({sublistId})
            }
        }

        //如果items 不为空，则添加item
        for(var line in items){
            var itemJson = items[line];
            var itemId = useLineAsKey ? itemJson.item:line;
            if(useItemUt){
                itemId = itemId.split("_")[0];
            }

            if(!itemJson[totalFld] || itemJson[totalFld]<=0){
                continue;
            }
            //设置item明细信息
            rec.selectNewLine({sublistId});
            rec.setCurrentSublistValue({sublistId,fieldId:"item",value:itemId});
            var isLot = rec.getCurrentSublistValue({sublistId, fieldId: "isnumbered"});
            isLot = (isLot=="T" || isLot === true);
            var unit = itemJson.ut;
            if(unit){
                rec.setCurrentSublistValue({sublistId,fieldId:unitFld,value:unit});
            }
            // rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"quantity",value:itemJson.total})
            rec.setCurrentSublistValue({sublistId,fieldId:qtyFldId,value:itemJson[totalFld]})
            //如果item中未设置bin，并且item 无批号管理，则不创建inventory detail
            // if(!itemJson.bins && !notEmptyJson(itemJson.nums)){
            //     rec.commitLine({sublistId});
            //     continue;
            // }

            var subRec = rec.getCurrentSublistSubrecord({sublistId,fieldId:"inventorydetail"});
            // log.audit({title:"processAddItemLine2",details:itemJson})
            processAddItemLine({itemJson,subRec,direction,useBinNum,binnumber,bin,tobinnumber,tobin,totalFld,status,toStatus,selectLine:!isLot});
            rec.commitLine({sublistId})

        }
        var recId = "";
        var count = rec.getLineCount({sublistId});
        if(count>0){
            recId = rec.save({
                ignoreMandatoryFields:true
            });
        }else if(id){
            record.delete({type:recType,id});
        }
        return recId;
    }

    /**
     * 添加一行货品
     * @param direction many2one : JSON中的bin是从储位，对于one2one和one2many，JSON中的bin是至储位
     */
    function processAddItemLine({itemJson,subRec,direction,useBinNum,binnumber,bin,tobinnumber,tobin,totalFld,status,toStatus,selectLine}){
        if(notEmptyJson(itemJson.nums)){
            util.each(itemJson.nums,function(numJson,lotNum){
                if(!numJson[totalFld]){
                    return;
                }
                if(!numJson.bins){
                    if(direction == "many2one"){
                        setBinNumber(subRec,null,null,tobinnumber,tobin,lotNum,"issueinventorynumber",numJson[totalFld],status,toStatus);
                    }else{
                        setBinNumber(subRec,binnumber,bin,tobinnumber,tobin,lotNum,"issueinventorynumber",numJson[totalFld],status,toStatus);
                    }
                }else if(notEmptyJson(numJson.bins)){
                    util.each(numJson.bins,function(binJson,binId){
                        if(direction == "many2one"){
                            setBinNumber(subRec,useBinNum?binId:null,useBinNum?null:binId,tobinnumber,tobin,lotNum,"issueinventorynumber",binJson.q,status,toStatus);
                        }else{
                            setBinNumber(subRec,binnumber,bin,useBinNum?binId:null,useBinNum?null:binId,lotNum,"issueinventorynumber",binJson.q,status,toStatus);
                        }
                    })
                }
            })
        }else{
            if(!itemJson[totalFld]){
                return;
            }
            if(!(itemJson.bins)){
                if(direction == "many2one"){
                    setBinNumber(subRec,null,null,tobinnumber,tobin,null,"issueinventorynumber",itemJson[totalFld],status,toStatus,selectLine);
                }else{
                    setBinNumber(subRec,binnumber,bin,tobinnumber,tobin,null,"issueinventorynumber",itemJson[totalFld],status,toStatus,selectLine);
                }
            }else if(notEmptyJson(itemJson.bins)){
                util.each(itemJson.bins,function(binJson,binId){
                    if(direction == "many2one"){
                        setBinNumber(subRec,useBinNum?binId:null,useBinNum?null:binId,tobinnumber,tobin,null,"issueinventorynumber",binJson.q,status,toStatus);
                    }else{
                        setBinNumber(subRec,binnumber,bin,useBinNum?binId:null,useBinNum?null:binId,null,"issueinventorynumber",binJson.q,status,toStatus);
                    }
                })
            }
        }
    }

    /**
     * 处理库存状态变更
     */
    function processInventoryStatusChange(options) {
        var id = options.id;
        var subsidiary = options.subsidiary;
        var location = options.location; //来源仓库
        var useLineAsKey = options.useLineAsKey; //默认以itemid为key，如果useLineAsKey为true，则itemId = itemJson.item
        var useBinNum = options.useBinNum; //使用储位编号作为key
        var fromStatus = options.fromStatus;
        var toStatus = options.toStatus;
        var items = options.items;
        var deleteIfNoLines = options.deleteIfNoLines; //如果为true，则当明细行为空的时候，删除当前record
        //total 字段对应的key
        var totalFld = options.totalFld || "total";
        var useItemUt = options.useItemUt;

        if (!id && (/*!subsidiary ||*/!location || !fromStatus || !toStatus)) {
            throw "mandatory fields:location,fromStatus,toStatus";
        }

        var rec = null;
        if (id) {
            rec = record.load({type: "inventorystatuschange", id: id, isDynamic: true});
            if (!rec.getValue({fieldId: "previousstatus"}) || rec.getValue({fieldId: "previousstatus"}) < 0) {
                rec.setValue({fieldId: "previousstatus", value: fromStatus});
                rec.setValue({fieldId: "revisedstatus", value: toStatus});
            }

        } else {
            rec = record.create({type: "inventorystatuschange", isDynamic: true});
            //设置头部
            subsidiary && rec.setValue({fieldId: "subsidiary", value: subsidiary});
            rec.setValue({fieldId: "location", value: location});
            //状态设置
            rec.setValue({fieldId: "previousstatus", value: fromStatus});
            rec.setValue({fieldId: "revisedstatus", value: toStatus});
        }

        var fields = options.fields;
        fields && fields.forEach(function (fldInfo) {
            rec.setValue(fldInfo);
        })
        var bin = options.bin;
        var binnumber = options.binnumber;

        var items = options.items;

        //遍历item，进行删改
        var count = rec.getLineCount({sublistId: "inventory"});
        for (var i = count - 1; i >= 0; i--) {
            var item = rec.getSublistValue({sublistId: "inventory", fieldId: "item", line: i});
            var itemKey = item;
            if (useItemUt) {
                var ut = rec.getSublistValue({sublistId: "inventory", fieldId: "itemunits", line: i});
                itemKey = itemKey + "_" + ut;
            }

            // var itemJson = items[item];
            var itemJson = items[itemKey];
            if (!itemJson || !itemJson[totalFld]) {
                //如果不存在，则删除
                rec.removeLine({sublistId: "inventory", line: i});
                continue;
            } else {
                //更新quantiy
                rec.selectLine({sublistId: "inventory", line: i});
                // rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"quantity",value:itemJson.total});
                //通过totalFld动态处理total key
                rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "quantity", value: itemJson[totalFld]});
                var subRec = rec.getCurrentSublistSubrecord({sublistId: "inventory", fieldId: "inventorydetail"});
                //处理subrecord
                var subCount = subRec.getLineCount({sublistId: "inventoryassignment"});
                for (var j = subCount - 1; j >= 0; j--) {

                    var num = subRec.getSublistText({
                        sublistId: "inventoryassignment",
                        fieldId: "issueinventorynumber",
                        line: j
                    });
                    var bin = subRec.getSublistValue({sublistId: "inventoryassignment", fieldId: "binnumber", line: j});
                    var q = 0;
                    if (num) {
                        if (bin) {
                            q = itemJson.nums[num] && itemJson.nums[num].bins[bin] && itemJson.nums[num].bins[bin].q || 0;
                            if (q) delete itemJson.nums[num].bins[bin]
                        } else {
                            // q = itemJson.nums[num] && itemJson.nums[num].total||0;
                            q = itemJson.nums[num] && itemJson.nums[num][totalFld] || 0;
                            if (q) delete itemJson.nums[num]
                        }
                    } else {
                        if (bin) {
                            q = itemJson.bins[bin] && itemJson.bins[bin].q || 0;
                            if (q) delete itemJson.bins[bin]
                        } else {
                            // q = itemJson.total||0;
                            q = itemJson[totalFld] || 0;
                            if (q) {
                                // delete items[item]
                                delete items[itemKey];
                                itemJson = null;
                            }
                        }
                    }

                    if (q) {
                        subRec.selectLine({sublistId: "inventoryassignment", line: j});
                        //更新quantity 和 status
                        subRec.setCurrentSublistValue({sublistId: "inventoryassignment", fieldId: "quantity", value: q})
                        commitLine({subRec, sublistId: "inventoryassignment", itemId: item, num, bin, qty: q});
                        // subRec.commitLine({sublistId:"inventoryassignment"})
                    } else {
                        //删除当前行
                        subRec.removeLine({sublistId: "inventoryassignment", line: j})
                    }
                }

                if (itemJson) {
                    //检查subrecord是否还有剩余，如有，则添加行
                    if ((itemJson.nums)) {
                        if (!notEmptyJson(itemJson.nums)) {
                            continue;
                        }
                        util.each(itemJson.nums, function (numJson, lotNum) {
                            if (!numJson.bins) {
                                // setBinNumber(subRec,binnumber,bin,null,null,lotNum,"issueinventorynumber",numJson.total);
                                setBinNumber(subRec, binnumber, bin, null, null, lotNum, "issueinventorynumber", numJson[totalFld]);
                            } else if (notEmptyJson(numJson.bins)) {
                                util.each(numJson.bins, function (binJson, binId) {
                                    setBinNumber(subRec, useBinNum ? binId : null, binId, null, null, lotNum, "issueinventorynumber", binJson.q);
                                })
                            }
                        })
                    } else {
                        if (!(itemJson.bins)) {
                            // setBinNumber(subRec,binnumber,bin,null,null,null,"issueinventorynumber",itemJson.total);
                            setBinNumber(subRec, binnumber, bin, null, null, null, "issueinventorynumber", itemJson[totalFld]);
                        } else if (notEmptyJson(itemJson.bins)) {
                            util.each(itemJson.bins, function (binJson, binId) {
                                setBinNumber(subRec, useBinNum ? binId : null, binId, null, null, null, "issueinventorynumber", binJson.q);
                            })
                        }
                    }
                }

                // delete items[item];
                delete items[itemKey];
                rec.commitLine({sublistId: "inventory"})
            }
        }

        //如果items 不为空，则添加item
        for (var line in items) {
            var itemJson = items[line];
            var itemId = useLineAsKey ? itemJson.item : line;
            if (useItemUt) {
                itemId = itemId.split("_")[0];
            }

            if (!itemJson[totalFld]) {
                continue;
            }
            //设置item明细信息
            rec.selectNewLine({sublistId: "inventory"});
            rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "item", value: itemId});
            var unit = itemJson.ut;
            if (unit) {
                rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "itemunits", value: unit});
            }
            // rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"quantity",value:itemJson.total})
            rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "quantity", value: itemJson[totalFld]})
            //如果item中未设置bin，并且item 无批号管理，则不创建inventory detail
            if (!itemJson.bins && !notEmptyJson(itemJson.nums)) {
                rec.commitLine({sublistId: "inventory"});
                continue;
            }

            var subRec = rec.getCurrentSublistSubrecord({sublistId: "inventory", fieldId: "inventorydetail"});
            if (notEmptyJson(itemJson.nums)) {
                util.each(itemJson.nums, function (numJson, lotNum) {
                    if (!numJson.bins) {
                        // setBinNumber(subRec,binnumber,bin,null,null,lotNum,"issueinventorynumber",numJson.total);
                        setBinNumber(subRec, binnumber, bin, null, null, lotNum, "issueinventorynumber", numJson[totalFld]);
                    } else {
                        util.each(numJson.bins, function (binJson, binId) {
                            setBinNumber(subRec, useBinNum ? binId : null, binId, null, null, lotNum, "issueinventorynumber", binJson.q);
                        })
                    }
                })
            } else {
                if (!itemJson.bins) {
                    // setBinNumber(subRec,binnumber,bin,null,null,null,"issueinventorynumber",itemJson.total);
                    setBinNumber(subRec, binnumber, bin, null, null, null, "issueinventorynumber", itemJson[totalFld]);
                } else {
                    util.each(itemJson.bins, function (binJson, binId) {
                        setBinNumber(subRec, useBinNum ? binId : null, binId, null, null, null, "issueinventorynumber", binJson.q);
                    })
                }
            }
            rec.commitLine({sublistId: "inventory"})

        }
        var recId = "";
        var count = rec.getLineCount({sublistId: "inventory"});
        if (count > 0 || !deleteIfNoLines) {
            recId = rec.save({
                ignoreMandatoryFields: true
            });
        } else if (id) {
            record.delete({type: "inventorystatuschange", id});
        }
        return recId;
    }

    /**
     * 根据实际调整subrecord
     * keepIfNotExist:如果为true，则当前行在实际中不存在时保留；否则删除
     */
    function adjSubRec({subRec,itemJson/*,actItems,item*/,totalFld="total",binnumber,frombin,useBinNum,keepIfNotExist,numFld="issueinventorynumber"}){
        var subCount = subRec.getLineCount({sublistId:"inventoryassignment"});
        for(var j = subCount-1;j>=0;j--){
            var num = subRec.getSublistText({sublistId:"inventoryassignment",fieldId:numFld,line:j});
            var bin = subRec.getSublistValue({sublistId:"inventoryassignment",fieldId:"binnumber",line:j});
            var q = 0;
            if(num){
                if(bin){
                    q = itemJson.nums[num] && itemJson.nums[num].bins && itemJson.nums[num].bins[bin] && itemJson.nums[num].bins[bin].q||0;
                    if(q) delete  itemJson.nums[num].bins[bin]
                }else{
                    q = itemJson.nums[num] && itemJson.nums[num][totalFld]||0;
                    if(q) delete  itemJson.nums[num]
                }
            }else{
                if(bin){
                    q = itemJson.bins[bin] &&itemJson.bins[bin].q||0;
                    if(q) delete  itemJson.bins[bin]
                }else{
                    q = itemJson[totalFld]||0;
                    if(q) {
                        // delete actItems[item]
                        itemJson =null;
                    }
                }
            }

            if(q){
                subRec.selectLine({sublistId:"inventoryassignment",line:j});
                //更新quantity 和 status
                subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"quantity",value:q})
                subRec.commitLine({sublistId:"inventoryassignment"})
            }else{
                if(!keepIfNotExist){
                    //删除当前行
                    subRec.removeLine({sublistId:"inventoryassignment",line:j})
                }
            }
        }

        if(itemJson){
            //检查subrecord是否还有剩余，如有，则添加行
            if((itemJson.nums)){
                if(!notEmptyJson(itemJson.nums)){
                    return;
                }
                util.each(itemJson.nums,function(numJson,lotNum){
                    if(!numJson.bins){
                        setBinNumber(subRec,binnumber,frombin,null,null,lotNum,numFld,numJson[totalFld]);
                    }else if(notEmptyJson(numJson.bins)){
                        util.each(numJson.bins,function(binJson,binId){
                            setBinNumber(subRec,useBinNum?binId:null,binId,null,null,lotNum,numFld,binJson.q);
                        })
                    }
                })
            }else{
                if(!(itemJson.bins)){
                    setBinNumber(subRec,binnumber,frombin,null,null,null,numFld,itemJson[totalFld]);
                }else if(notEmptyJson(itemJson.bins)){
                    util.each(itemJson.bins,function(binJson,binId){
                        setBinNumber(subRec,useBinNum?binId:null,binId,null,null,null,numFld,binJson.q);
                    })
                }
            }
        }
    }



    /**
     * 库存转移
     * { subsidiary:1, location:1,transferlocation:2,extras:[{fieldId:"",value:""}],direction:"one2many",bin:1,items:{<itemid>:{total:10,nums:{},bins:{<bin>:{q:10}} } } }
     * @param options
     */
    function processInventoryTransferV2(options){
        var id = options.id;
        var subsidiary = options.subsidiary;
        var location = options.location; //来源仓库
        var transferlocation = options.transferlocation;  //目标仓库
        var useLineAsKey = options.useLineAsKey; //默认以itemid为key，如果useLineAsKey为true，则itemId = itemJson.item
        var useBinNum = options.useBinNum; //使用储位编号作为key
        var status = options.status;
        var toStatus = options.toStatus;
        var totalFld = options.totalFld||"total";
        var useItemUt = options.useItemUt;
        // var locUseBins = options.locUseBins;  //来源仓库是否use bins
        // var transferlocUseBins = options.transferlocUseBins;//目标仓库是否use bins
        // //如果有一个仓库使用储位，则为true
        // var useBins =locUseBins ||transferlocUseBins;

        if((SWCUtils.isOneWorld() && !subsidiary) ||!location ||!transferlocation){
            throw "mandatory fields:subsidiary,location,transferlocation";
        }

        var rec = null;
        if(id){
            rec = record.load({type:"inventorytransfer",id:id,isDynamic:true});
        }else{
            rec = record.create({type:"inventorytransfer",isDynamic:true});
            //设置头部
            subsidiary && rec.setValue({fieldId:"subsidiary",value:subsidiary});
            rec.setValue({fieldId:"location",value:location});
            rec.setValue({fieldId:"transferlocation",value:transferlocation});
        }

        var fields = options.fields;
        fields && fields.forEach(function(fldInfo){
            rec.setValue(fldInfo);
        })
        //从一个bin，转到多个bins;many2one: 多个bins转到1个bin
        var direction = options.direction||"many2one";
        var bin = options.bin;
        var tobin = options.tobin;
        var binnumber = options.binnumber;
        var tobinnumber = options.tobinnumber;
        //只要有一个bin有值，useBins则为true
        var useBins = bin || tobin || binnumber || tobinnumber;
        var items = options.items;
        for(var line in items){
            var itemJson = items[line];
            var itemId = useLineAsKey ? itemJson.item:line;
            if(!itemJson[totalFld]){
                continue;
            }

            if(useItemUt){
                itemId = itemId.split("_")[0];
            }
            //设置item明细信息
            rec.selectNewLine({sublistId:"inventory"});
            rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"item",value:itemId});
            var unit = itemJson.ut;
            if(unit){
                rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"units",value:unit});
            }
            rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"adjustqtyby",value:itemJson[totalFld]})

            //如果item中未设置bin，并且item 无批号管理，则不创建inventory detail
            if(!useBins && (direction == "one2one" || !itemJson.bins)  && !notEmptyJson(itemJson.nums)){
                rec.commitLine({sublistId:"inventory"});
                continue;
            }

            var subRec = rec.getCurrentSublistSubrecord({sublistId:"inventory",fieldId:"inventorydetail"});

            if(direction == "many2one"){
                if(notEmptyJson(itemJson.nums)){
                    util.each(itemJson.nums,function(numJson,lotNum){
                        if(!numJson.bins){
                            setBinNumber(subRec,null,null,tobinnumber,tobin,lotNum,"issueinventorynumber",numJson[totalFld],status,toStatus);
                        }else{
                            util.each(numJson.bins,function(binJson,binId){
                                setBinNumber(subRec,useBinNum?binId:null,binId,tobinnumber,tobin,lotNum,"issueinventorynumber",binJson.q,status,toStatus);
                            })
                        }
                    })
                }else{
                    if(!itemJson.bins){
                        setBinNumber(subRec,null,null,tobinnumber,tobin,null,"issueinventorynumber",itemJson[totalFld],status,toStatus);
                    }else{
                        util.each(itemJson.bins,function(binJson,binId){
                            setBinNumber(subRec,useBinNum?binId:null,binId,tobinnumber,tobin,null,"issueinventorynumber",binJson.q,status,toStatus);
                        })
                    }
                }
            }else if(direction == "one2many"){
                if(notEmptyJson(itemJson.nums)){
                    util.each(itemJson.nums,function(numJson,lotNum){
                        if(!numJson.bins){
                            setBinNumber(subRec,binnumber,bin,null,null,lotNum,"issueinventorynumber",numJson[totalFld],status,toStatus);
                        }else{
                            util.each(numJson.bins,function(binJson,binId){
                                setBinNumber(subRec,binnumber,bin,useBinNum?binId:null,binId,lotNum,"issueinventorynumber",binJson.q,status,toStatus);
                            })
                        }
                    })
                }else{
                    if(!itemJson.bins){
                        setBinNumber(subRec,binnumber,bin,null,null,null,"issueinventorynumber",itemJson[totalFld],status,toStatus);
                    }else{
                        util.each(itemJson.bins,function(binJson,binId){
                            setBinNumber(subRec,binnumber,bin,useBinNum?binId:null,binId,null,"issueinventorynumber",binJson.q,status,toStatus);
                        })
                    }
                }
            }else if(direction == "one2one"){
                //处理批号
                if(notEmptyJson(itemJson.nums)){
                    util.each(itemJson.nums,function(numJson,lotNum){
                        setBinNumber(subRec,binnumber,bin,tobinnumber,tobin,lotNum,"issueinventorynumber",numJson[totalFld],status,toStatus);
                    })
                }else{
                    setBinNumber(subRec,binnumber,bin,tobinnumber,tobin,null,null,itemJson[totalFld],status,toStatus);
                }
            }

            rec.commitLine({sublistId:"inventory"})

        }
        var recId = "";
        var count = rec.getLineCount({sublistId:"inventory"});
        if(count>0){
            recId = rec.save({
                ignoreMandatoryFields:true
            });
        }
        return recId;
    }

    /**
     * 生成入库单
     * @param options
     * @return {number}
     */
    function processItemReceiptV2(options){
        var type = options.type;
        var id = options.id;
        var items = options.items;
        var fields = options.fields;  //单据头字段值列表
        var loc = options.loc;
        var useBinNum = options.useBinNum;  //如果为true，则使用储位编号进行赋值，否则使用储位内部id赋值
        var binnum = options.binnum;//全部上架到特定储位
        var binId = options.binId; //全部上架到特定储位
        var lineCB = options.lineCB;
        var bodyCB = options.bodyCB;
        var totalFld = options.totalFld||"total";
        var useLineAsKey = options.useLineAsKey;
        var useLineProp = options.useLineProp;
        var itemRcptRec = record.transform({
            fromType:type,
            fromId:id,
            toType:"itemreceipt",
            isDynamic:true
        });


        //头部字段设置
        if(fields && fields.length){
            fields.forEach(function(fieldJson){
                itemRcptRec.setValue(fieldJson)
            });
        }

        var selectedLines = false;
        //item 设置
        var count = itemRcptRec.getLineCount({sublistId:"item"});
        for(var i =0;i<count;i++){
            var line = itemRcptRec.getSublistValue({sublistId:"item",fieldId:"line",line:i});
            var item = itemRcptRec.getSublistValue({sublistId:"item",fieldId:"item",line:i});
            var lineid = useLineAsKey?line:item;
            itemRcptRec.selectLine({sublistId:"item",line:i})
            var itemQ = items[lineid]?.[totalFld];
            //当items存在,并且如果使用line属性进行区分时，需要保证line是匹配的
            if(items[lineid] && (!useLineProp || items[lineid].line == line) && itemQ>0) {
                itemRcptRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value:true});
                selectedLines = true;
                if(loc){
                    itemRcptRec.setCurrentSublistValue({sublistId: "item", fieldId: "location",value:loc});
                }
                itemRcptRec.setCurrentSublistValue({sublistId: "item", fieldId: "quantity",value: itemQ});

                //如果有批号，则遍历批号
                if(items[lineid].nums){
                    var nums = items[lineid].nums;
                    //获取subrecord
                    var subRec = itemRcptRec.getCurrentSublistSubrecord({sublistId:"item",fieldId:"inventorydetail"});
                    removeLines(subRec,"inventoryassignment");
                    util.each(nums,function(lotJson,lotNum){
                        var bins = lotJson.bins;
                        if(bins){
                            util.each(bins,function(binJson,bin){
                                if(binJson.q <= 0){
                                    return;
                                }
                                subRec.selectNewLine({sublistId:"inventoryassignment"});
                                if(useBinNum){
                                    subRec.setCurrentSublistText({sublistId:"inventoryassignment",fieldId:"binnumber",text:bin});
                                }else{
                                    subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"binnumber",value:bin})
                                }
                                subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"receiptinventorynumber",value:lotNum})
                                subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"quantity",value:binJson.q});
                                subRec.commitLine({sublistId:"inventoryassignment"});
                            })
                        }else{
                            //log.audit({title:"lotJson[totalFld]"+lotNum,details:lotJson[totalFld]})
                            if(!lotJson[totalFld] || lotJson[totalFld] <= 0){
                                return;
                            }
                            //log.audit({title:"lotJson[totalFld]2"+lotNum,details:lotJson[totalFld]})
                            subRec.selectNewLine({sublistId:"inventoryassignment"});
                            subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"receiptinventorynumber",value:lotNum})
                            subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"quantity",value:lotJson[totalFld]});
                            if(binnum){
                                subRec.setCurrentSublistText({sublistId:"inventoryassignment",fieldId:"binnumber",text:binnum})
                            }
                            subRec.commitLine({sublistId:"inventoryassignment"});
                        }
                    })
                }else if(items[lineid].bins){
                    //获取subrecord
                    var subRec = itemRcptRec.getCurrentSublistSubrecord({sublistId:"item",fieldId:"inventorydetail"});
                    removeLines(subRec,"inventoryassignment");
                    var bins = items[lineid].bins;
                    util.each(bins,function(binJson,bin){
                        if(binJson.q <= 0){
                            return;
                        }
                        subRec.selectNewLine({sublistId:"inventoryassignment"});
                        if(useBinNum){
                            subRec.setCurrentSublistText({sublistId:"inventoryassignment",fieldId:"binnumber",text:bin});
                        }else{
                            subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"binnumber",value:bin})
                        }
                        subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"quantity",value:binJson.q});
                        subRec.commitLine({sublistId:"inventoryassignment"});
                    })
                }

                if(lineCB){
                    lineCB(lineid,items[lineid].q,itemRcptRec);
                }

                itemRcptRec.commitLine({sublistId:"item"})
            }else{
                itemRcptRec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive",  value: false});
                // itemRcptRec.setCurrentSublistValue({sublistId:"item",fieldId:"quantity",value:null});
            }
        }

        if(bodyCB){
            bodyCB(itemRcptRec);
        }

        //如果没有勾选任何行，则不提交数据
        if(!selectedLines){
            return;
        }

        var id = itemRcptRec.save({ignoreMandatoryFields:true});
        return id;

    }

    /**
     * 库存调整：调整特定储位
     */
    function processAdjustmentV1(options){
        var subsidiary = options.subsidiary;
        var location = options.location;
        var account = options.account||Constants.AJ_ACCOUNT;
        var useBins = options.useBins;
        var bin = options.bin;
        var binnumber = options.binnumber;
        var items = options.items;

        var rec = record.create({
            type :"inventoryadjustment",
            isDynamic:true,
        });

        subsidiary && rec.setValue({fieldId:"subsidiary",value:subsidiary});
        rec.setValue({fieldId:"adjlocation",value:location});
        rec.setValue({fieldId:"account",value:account});
        //辅助字段设置
        var fields = options.fields;
        fields && fields.forEach(function(fldInfo){
            rec.setValue(fldInfo);
        })

        for(var itemId in items) {
            // if (useBins) {
                var qty = items[itemId].q;
                //如果调整数量为0，则跳过
                if(!qty){
                    continue;
                }
                if(useBins){
                    try{
                        var binsInfo = {};
                        binsInfo[binnumber] = qty;
                        addNewItemLine({
                            rec: rec,
                            itemId: itemId,
                            loc: location,
                            qty: qty,
                            binsInfo:binsInfo,
                            useBinNumber:true
                        });
                    }catch(e){
                        throw e + ","+itemId+","+qty
                    }

                }else{
                    addNewItemLine({
                        rec: rec,
                        itemId: itemId,
                        loc: location,
                        qty: qty
                    });
                }
            // }
        }

        //检查是否有调整货品行
        var count = rec.getLineCount({sublistId:"inventory"});
        if(count<=0){
            return;
        }

        var id = rec.save({ignoreMandatoryFields:true});
        return id;
    }

    function addNewItemLine(options){
        var rec = options.rec;
        var itemId = options.itemId;
        var qty = options.qty;
        var loc = options.loc;
        var binsInfo = options.binsInfo;
        var nums = options.nums;
        var useBinNumber = options.useBinNumber;  //使用bin number
        try{
            rec.selectNewLine({sublistId:"inventory"});
            rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"item",value:itemId});
            rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"location",value:loc });
            rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"adjustqtyby",value:qty });
            var cost = rec.getCurrentSublistValue({sublistId:"inventory",fieldId:"unitcost"});
            if(cost<0){
                //POSITIVE_UNITCOST_REQD 问题对应
                // rec.setCurrentSublistValue({sublistId:"inventory",fieldId:"unitcost",value:0 });
                //log.audit({title:"cost",details:itemId+":"+cost})
            }

            var subRec = null;
            if(binsInfo || nums ){
                subRec = rec.getCurrentSublistSubrecord({sublistId:"inventory", fieldId:"inventorydetail"  });
                if(notEmptyJson(nums)){
                    util.each(nums,function(numJson,lotNum){
                        if(numJson.bins){
                            util.each(numJson.bins,function(binJson,binId){
                                setBinNumber(subRec,null,binId,null,null,lotNum,"receiptinventorynumber",binJson.q);
                            })
                        }else{
                            setBinNumber(subRec,null,null,null,null,lotNum,"receiptinventorynumber",numJson.q);
                        }
                    })
                }else{
                    util.each(binsInfo,function(binJson,binId){
                        setBinNumber(subRec,null,binId,null,null,null,"receiptinventorynumber",binJson.q);
                    })
                }
            }
            rec.commitLine({
                sublistId:"inventory"
            });
        }catch(e){
            throw itemId+":"+e;
        }

    }

    /**
     * 处理库存调整(根据positive 和 negative 进行区分)
     */
    function processAdjustmentV2(options){
        var subsidiary = options.subsidiary;
        var location = options.location;
        var account = options.account||Constants.AJ_ACCOUNT;
        var useBins = options.useBins;
        var items = options.items;
        log.audit({title:"items",details:items})
        //<itemid>:{qty,positive,negative}

        var rec = record.create({
            type :"inventoryadjustment",
            isDynamic:true,
        });

        subsidiary && rec.setValue({fieldId:"subsidiary",value:subsidiary});
        rec.setValue({fieldId:"adjlocation",value:location});
        rec.setValue({fieldId:"account",value:account});
        //辅助字段设置
        var fields = options.fields;
        fields && fields.forEach(function(fldInfo){
            rec.setValue(fldInfo);
        })
        //{"1037":{"positive":{"q":15,"bins":{"17":{"q":9}}}},"1046":{"positive":{"q":19,"nums":{"A002":{"q":9,"bins":{"17":{"q":9}}}}},"negative":{"q":-50,"nums":{"A004":{"q":-4,"bins":{"17":{"q":-3}}}}}}}
        for(var itemId in items){
            //调增
            var positiveInfo = items[itemId].positive;
            if(positiveInfo && positiveInfo.q){
                addNewItemLine({
                    rec:rec,
                    itemId :itemId,
                    loc:location,
                    qty:positiveInfo.q,
                    binsInfo:positiveInfo.bins,
                    nums:positiveInfo.nums
                });
            }
            //调减
            var negativeInfo = items[itemId].negative;
            if(negativeInfo && negativeInfo.q){
                addNewItemLine({
                    rec:rec,
                    loc:location,
                    itemId :itemId,
                    qty:negativeInfo.q,
                    binsInfo:negativeInfo.bins,
                    nums:negativeInfo.nums
                });
            }

        }
        var id = "";
        if(rec.getLineCount({sublistId:"inventory"})){
            id = rec.save({ignoreMandatoryFields:true});
        }
        return id;
    }


    function addNewItemLineV3(options) {
        var rec = options.rec;
        var itemId = options.itemId;
        var qty = options.qty;
        var loc = options.loc;
        var itemJson = options.itemJson;
        var binsInfo = itemJson.bins;
        var nums = itemJson.nums;
        var useBinNumber = options.useBinNumber;  //使用bin number
        var status = options.status;
        var line = options.line;
        //如果qty>0，则为调增；否则为调减
        var invNumFld = qty > 0 ? "receiptinventorynumber" : "issueinventorynumber";

        try {
            rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "adjustqtyby", value: qty});
            var subRec = null;
            if (binsInfo || nums) {
                subRec = rec.getCurrentSublistSubrecord({sublistId: "inventory", fieldId: "inventorydetail"});
                /*removeLines(subRec, "inventorydetail");
                rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "adjustqtyby", value: "0"});
                rec.commitLine({sublistId: "inventory"});
                rec.selectLine({sublistId: "inventory", line: line});
                rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "adjustqtyby", value: qty});
                subRec = rec.getCurrentSublistSubrecord({sublistId: "inventory", fieldId: "inventorydetail"});*/
                if (notEmptyJson(nums)) {
                    util.each(nums, function (numJson, lotNum) {
                        if (numJson.bins) {
                            util.each(numJson.bins, function (binJson, binId) {
                                setBinNumber(subRec, null, binId, null, null, lotNum, invNumFld, binJson.q, status);
                            })
                        } else {
                            setBinNumber(subRec, null, null, null, null, lotNum, invNumFld, numJson.q, status);
                        }
                    })
                } else {
                    util.each(binsInfo, function (binJson, binId) {
                        setBinNumber(subRec, null, binId, null, null, null, invNumFld, binJson.q, status);
                    })
                }
            }
            rec.commitLine({
                sublistId: "inventory"
            });
        } catch (e) {
            throw itemId + ":" + e;
        }

    }



    /**
     * 处理库存调整(根据positive 和 negative 进行区分)
     */
    function processAdjustmentV3(options) {
        var subsidiary = options.subsidiary;
        var location = options.location;
        var account = options.account || Constants.AJ_ACCOUNT;
        var useBins = options.useBins;
        var items = options.items;
        var totalFld = options.totalFld;
        var useLineAsKey = options.useLineAsKey;
        var status = options.status;
        var useItemUt = options.useItemUt;
        //<itemid>:{qty,positive,negative}
        var id = options.id;
        var rec = null;
        if (id) {
            rec = record.load({
                type: "inventoryadjustment",
                id: id,
                isDynamic: true,
            });
        } else {
            rec = record.create({
                type: "inventoryadjustment",
                isDynamic: true,
            });
            subsidiary && rec.setValue({fieldId: "subsidiary", value: subsidiary});
            rec.setValue({fieldId: "adjlocation", value: location});
            rec.setValue({fieldId: "account", value: account});
        }
        //辅助字段设置
        var fields = options.fields;
        fields && fields.forEach(function (fldInfo) {
            rec.setValue(fldInfo);
        })

        //item 设置
        var sublistId = "inventory";
        var count = rec.getLineCount({sublistId});
        for (var i = 0; i < count; i++) {
            var item = rec.getSublistValue({sublistId, fieldId: "item", line: i});
            var line = rec.getSublistValue({sublistId, fieldId: "line", line: i});

            var key = useLineAsKey ? line : item;
            if (useItemUt) {
                var ut = rec.getSublistValue({sublistId, fieldId: "units", line: i});
                key = key + "_" + ut;
            }
            var itemJson = items[key];
            if (!itemJson || !itemJson[totalFld]) {
                continue;
            }
            var qty = itemJson[totalFld];
            rec.selectLine({sublistId, line: i});
            //addNewItemLineV3({rec, itemId: item, qty, itemJson, status, line: i});
            updateItemLine({rec, itemId: item, qty, itemJson, status});
        }

        //{"1037":{"positive":{"q":15,"bins":{"17":{"q":9}}}},"1046":{"positive":{"q":19,"nums":{"A002":{"q":9,"bins":{"17":{"q":9}}}}},"negative":{"q":-50,"nums":{"A004":{"q":-4,"bins":{"17":{"q":-3}}}}}}}

        var id = "";
        if (rec.getLineCount({sublistId: "inventory"})) {
            id = rec.save({ignoreMandatoryFields: true});
        }
        return id;
    }

    /**
     * 将数量取反，{<itemid>:{total:10}}  => {<itemid>:{total:-10}}
     * @param itemsInfo
     */
    function reverseItemsInfo({itemsInfo}){
        util.each(itemsInfo,function(itemJson){
            itemJson.total *=-1;
            if(itemJson.nums){
                util.each(itemJson.nums,function(numJson){
                    numJson.total *= -1;
                    util.each(numJson.bins,function(binJson){
                        binJson.q *= -1;
                    })
                })
            }else if(itemJson.bins){
                util.each(itemJson.bins,function(binJson){
                    binJson.q *= -1;
                })
            }
        })
    }

    function updateItemLine({rec, itemId, qty, itemJson, status}) {
        //如果qty>0，则为调增；否则为调减
        var invNumFld = qty > 0 ? "receiptinventorynumber" : "issueinventorynumber";
        try {
            rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "adjustqtyby", value: qty});
            var subRec = rec.getCurrentSublistSubrecord({sublistId: "inventory", fieldId: "inventorydetail"});
            adjSubRec({subRec, itemJson: itemJson, numFld: invNumFld});
            rec.commitLine({sublistId: "inventory"});
        } catch (e) {
            throw itemId + ":" + e;
        }
    }

    /**
     * 处理调拨单
     * @param options
     */
    function processTransferOrder(options){
        var id = options.id;
        var srcLoc = options.srcLoc;
        var tarLoc = options.tarLoc;
        var subsidiary = options.subsidiary;
        var items =JSON.parse(JSON.stringify(options.items));
        var fields = options.fields;
        var donotCommit = options.donotCommit;
        var invCommit = donotCommit?Constants.COMMIT_INVENTORY.DONOT_COMMIT:Constants.COMMIT_INVENTORY.AVAILABLE_QTY;
        var useItemUt = options.useItemUt;
        //创建调拨单
        var rec = null;
        if(id){
            rec = record.load({type:"transferorder",id:id,isDynamic:true});
        }else{
            rec = record.create({type:"transferorder",isDynamic:true});
        }

        subsidiary &&  rec.setValue({fieldId:"subsidiary",value:subsidiary});

        rec.setValue({fieldId:"location",value:srcLoc})
            .setValue({fieldId:"transferlocation",value:tarLoc})
            .setValue({fieldId:"orderstatus",value:"B" });

        //辅助字段设置
        fields && fields.forEach(function(fldInfo){
            rec.setValue(fldInfo);
        })

        var sublistId = "item";
        //先更改和删除
        var count = rec.getLineCount({sublistId:"item"});
        if(count>0){
            for(var i = count-1;i>=0;i--){
                var item = rec.getSublistValue({sublistId,fieldId:"item",line:i});
                var qty = rec.getSublistValue({sublistId,fieldId:"quantity",line:i});
                var itemKey = item;
                if(useItemUt){
                    var ut = rec.getSublistValue({sublistId,fieldId:"units",line:i});
                    itemKey = itemKey +"_"+ut;
                }
                if(items[itemKey]?.q > 0){
                    rec.selectLine({sublistId,line:i});
                    rec.setCurrentSublistValue({sublistId,fieldId:"quantity",value:items[itemKey]?.q});
                    rec.commitLine({sublistId});
                }else{
                    rec.removeLine({sublistId,line:i});
                }
                delete items[itemKey];
            }
        }

        //如果有剩余则新增货品明细行
        for(var itemId in items){
            rec.selectNewLine({sublistId:"item"});
            rec.setCurrentSublistValue({sublistId:"item",fieldId:"item",value:items[itemId].item})
                .setCurrentSublistValue({sublistId:"item",fieldId:"units",value:items[itemId].ut||null})
                .setCurrentSublistValue({sublistId:"item",fieldId:"quantity",value:items[itemId].q||1})
                .setCurrentSublistValue({sublistId:"item",fieldId:"commitinventory",value:invCommit});
            rec.commitLine({sublistId:"item"});
        }

        var recId = rec.save({ignoreMandatoryFields:true});
        return recId;
    }

    /**
     * 释放业务单据，如TO
     * options.type recordType
     * options.id
     */
    function releaseTrans(options) {
        var doDelete = options.doDelete; //删除单据
        var doClose = options.doClose; //关闭单据
        var type = options.type;
        var id = options.id;
        if (doDelete) {
            record.delete({type, id});
            return;
        }
        var donotCommit = options.donotCommit || true;
        var invCommit = donotCommit ? Constants.COMMIT_INVENTORY.DONOT_COMMIT : Constants.COMMIT_INVENTORY.AVAILABLE_QTY;
        var rec = record.load({type: type, id: id, isDynamic: true})
        var count = rec.getLineCount({sublistId: "item"});
        for (var i = 0; i < count; i++) {
            rec.selectLine({sublistId: "item", line: i});
            rec.setCurrentSublistValue({sublistId: "item", fieldId: "commitinventory", value: invCommit})
            if (doClose) {
                rec.setCurrentSublistValue({sublistId: "item", fieldId: "isclosed", value: true})
            }
            rec.commitLine({sublistId: "item"});
        }
        rec.save({
            ignoreMandatoryFields: true
        });
    }

    /**
     * 释放业务单据，如TO
     * options.type recordType
     * options.id
     */
    function releaseTransV2(options) {
        var type = options.type;
        var id = options.id;
        var useItemUt = options.useItemUt;
        var items = JSON.parse(JSON.stringify(options.items));

        var rec = record.load({type: type, id: id, isDynamic: true});

        var sublistId = "item";
        var count = rec.getLineCount({sublistId});
        if (count > 0) {
            for (var i = count - 1; i >= 0; i--) {
                var item = rec.getSublistValue({sublistId, fieldId: "item", line: i});
                var itemKey = item;
                if (useItemUt) {
                    var ut = rec.getSublistValue({sublistId, fieldId: "units", line: i});
                    itemKey = itemKey + "_" + ut;
                }
                if (!items[itemKey]) continue;
                var deTotal = Number(items[itemKey]?.total || 0) - Number(items[itemKey]?.ckTotal || 0);
                rec.selectLine({sublistId, line: i});
                if (deTotal > 0) {
                    rec.setCurrentSublistValue({sublistId, fieldId: "quantity", value: deTotal});
                } else {
                    rec.setCurrentSublistValue({sublistId, fieldId: "isclosed", value: true});
                }
                rec.commitLine({sublistId});
            }
        }

        rec.save({
            ignoreMandatoryFields: true
        });
    }

    /**
     * 释放业务单据，如TO
     * options.type recordType
     * options.id
     */
    function releaseTransV3(options) {
        var type = options.type;
        var id = options.id;
        var useItemUt = options.useItemUt;
        var items = JSON.parse(JSON.stringify(options.items));

        var rec = record.load({type: type, id: id, isDynamic: true});

        var sublistId = "item";
        var count = rec.getLineCount({sublistId});
        if (count > 0) {
            for (var i = count - 1; i >= 0; i--) {
                var item = rec.getSublistValue({sublistId, fieldId: "item", line: i});
                var itemKey = item;
                if (useItemUt) {
                    var ut = rec.getSublistValue({sublistId, fieldId: "units", line: i});
                    itemKey = itemKey + "_" + ut;
                }
                if (!items[itemKey]) continue;
                var deTotal = Number(items[itemKey]?.q || 0) - Number(items[itemKey]?.total || 0);
                rec.selectLine({sublistId, line: i});
                if (deTotal > 0) {
                    rec.setCurrentSublistValue({sublistId, fieldId: "quantity", value: deTotal});
                } else {
                    rec.setCurrentSublistValue({sublistId, fieldId: "isclosed", value: true});
                }
                rec.commitLine({sublistId});
            }
        }

        rec.save({
            ignoreMandatoryFields: true
        });
    }

    /////////////////////////////////////////调拨相关查询///////////////////////////////////////////////////////

    /**
     * 查询仓库/门店信息
     * @param options
     */
    function searchLocations(options){
        var data = {};
        var locAry = data.locAry = []; //[1,2,3]
        var locInfo = data.locInfo = {};//{<locid>:<name>}
        var filters = [["isinactive","is","F"]];
        log.audit({
            title:"searchLocations",
            details:options.filters
        })
        if(SWCUtils.hasResults(options.filters)){
            SWCUtils.addFilter(filters,options.filters);
        }


        log.audit({title:"filters",details:filters})

        var columns = options.columns;
        if(!columns){
            columns = [{name:"name"}]
        }

        var searchObj = search.create({
            type: "location",
            filters:filters,
            columns:columns
        });
        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var id = result.id;
                locAry.push(id);
                locInfo[id]=result.getValue({name:"name"});
            }
        });
        return data;
    }

    /**
     * 基于到货通知单查询商品明细
     * @param options
     */
    function searchItemInfoFromPOArr(options){
        var poArrivalId = options.poArrivalId;
        if(!poArrivalId){
            return {};
        }

        var itemNameCol = {"name":"formulatext","summary":"GROUP","label":"名称","formula":"nvl({custrecord_swc_item.parent},{custrecord_swc_item})"};
        var itemId2Col = {"name":"formulanumeric","summary":"GROUP","label":"名称id","formula":"nvl({custrecord_swc_item.parent.id},{custrecord_swc_item.id})"};
        var matrixCol = search.createColumn({"name":"formulatext","summary":"MAX","label":"MATRIX","formula":"{custrecord_swc_item.matrix}"})
        var upcCol = {"name":"formulatext","formula":"nvl({custrecord_swc_item.parent},{custrecord_swc_item})","summary":"MIN","label":"UPC"};
        var itemIdCol = {"name":"itemid",join: "custrecord_swc_item","summary":"MAX","label":"名称"};
        var itemCol = {"name":"parent",join: "custrecord_swc_item","summary":"GROUP","label":"父商品"};
        var imgCol =  {"name":"custitem_swc_imgurl",join: "custrecord_swc_item","summary":"MAX","label":"父商品图片"};
        var childCol = {"name":"formulatext","summary":"MAX","formula":"LISTAGG({custrecord_swc_item.internalid}||':'||{custrecord_swc_item.custitem_swc_itemsize},',') WITHIN group (order by {custrecord_swc_item.internalid},',')","label":"子商品明细"};
        var brandCol = {"name":"cseg1",join: "custrecord_swc_item","summary":"GROUP","label":"货品品牌"};
        var classCol = {"name":"custitem_swc_itemcategory",join: "custrecord_swc_item","summary":"GROUP","label":"货品类别"};
        var yearCol = {"name":"custitem_swc_year",join: "custrecord_swc_item","summary":"MAX","label":"年份"};
        var seasonCol = {"name":"custitem_swc_season",join: "custrecord_swc_item","summary":"MAX","label":"货品季节"};
        var prjCol = {"name":"custitem_swc_project",join: "custrecord_swc_item","summary":"MAX","label":"项目"};
        var genderCol = {"name":"custitem_swc_gender",join: "custrecord_swc_item","summary":"MAX","label":"性别"};
        var seriesCol = {"name":"custitem_swc_series",join: "custrecord_swc_item","summary":"MAX","label":"系列"};
        var styleCol = {"name":"custitem_swc_style",join: "custrecord_swc_item","summary":"MAX","label":"款型"};
        var abbrCol =  {"name":"custitem_swc_itemabbr",join: "custrecord_swc_item","summary":"MAX","label":"货品简称"};
        var priceCol = {"name":"custitem_swc_tagprice",join: "custrecord_swc_item","summary":"MAX","label":"吊牌价"};
        var columns = [/*itemIdCol,*/itemCol,itemId2Col,itemNameCol,upcCol,matrixCol,childCol,brandCol,classCol,yearCol,seasonCol,prjCol,genderCol,seriesCol,styleCol,abbrCol,priceCol];
        /*var filters = [
            ["custrecord_swc_pa_fk","anyof",poArrivalId],
            "AND",
            ["custrecord_swc_item.matrixchild","is","T"]
        ]*/
        var filters = [
            ["custrecord_swc_pa_fk","anyof",poArrivalId],
            "AND",
            ["custrecord_swc_item.matrix","is","F"]
        ]
        if(SWCUtils.hasResults(options.filters)){
            SWCUtils.addFilter(filters,options.filters);
        }
        var searchObj = search.create({
            type: "customrecord_swc_item",
            filters:filters,
            columns:columns
        });
        var data = processItemInfo({
            searchObj:searchObj,
            itemIdCol:itemIdCol,
            itemCol:itemCol,
            itemId2Col:itemId2Col,
            itemNameCol:itemNameCol,
            matrixCol:matrixCol,
            upcCol:upcCol,  //注意：直接定位不到parent的upc，使用name来代替
            // imgCol:imgCol,
            childCol:childCol,
            brandCol:brandCol,
            classCol:classCol,
            yearCol:yearCol,
            seasonCol:seasonCol,
            prjCol:prjCol,
            genderCol:genderCol,
            seriesCol:seriesCol,
            styleCol:styleCol,
            abbrCol:abbrCol,
            priceCol:priceCol,
            pageConfig:options.pageConfig
        });

        return data;
    }


    /**
     * 查询item
     * @param options
     */
    function processItemInfo(options){
        var data = {};
        var brandData =data.brandData= {};//品牌信息
        var itemData = data.itemData = {};//商品信息
        var searchObj = options.searchObj;
        var itemIdCol = options.itemIdCol;
        var matrixCol = options.matrixCol;
        var itemNameCol = options.itemNameCol;
        var itemId2Col = options.itemId2Col;
        var itemCol =  options.itemCol;
        var upcCol =  options.upcCol;
        // var imgCol =   options.imgCol;
        var childCol =   options.childCol;
        var brandCol = options.brandCol;
        var classCol =  options.classCol;
        var yearCol =  options.yearCol;
        var seasonCol =  options.seasonCol;
        var prjCol =  options.prjCol;
        var genderCol =  options.genderCol;
        var seriesCol = options.seriesCol;
        var styleCol =  options.styleCol;
        var abbrCol =   options.abbrCol;
        var priceCol =  options.priceCol;
        var pageConfig = options.pageConfig;
        // log.audit({title:"pageConfig",details:pageConfig})

        var funcName = (pageConfig&&pageConfig.usePages)?"getPagedResults":"getAllResults";
        //e.g. SWCUtils.getAllResults()
        var pageData = SWCUtils[funcName]({
            curPage:pageConfig && pageConfig.curPage,  //仅限分页情况使用
            pageSize:pageConfig && pageConfig.pageSize,
            searchObj:searchObj,
            cb:function (result) {
                var brand = result.getValue(brandCol);
                var brandTxt = result.getText(brandCol);
                var type = result.getValue(classCol);
                var upc = result.getValue(upcCol);
                var typeTxt = result.getText(classCol);
                var prod = result.getValue(itemId2Col); //父商品
                var prodTxt = result.getValue(itemNameCol); //父商品

                //matrix : F：非矩阵，T ：矩阵
                var matrix = result.getValue(matrixCol);
                //log.audit({title:"PROD",details:prod+","+prodTxt})

                var curId = result.id;
                //设置父商品
                if(!itemData[prod]){
                    itemData[prod]={
                        sum:1,
                        name:prodTxt,
                        brand:brand,
                        brandTxt:brandTxt,
                        type:type,
                        upc:upc,
                        typeTxt:typeTxt,
                        abbr:result.getValue(abbrCol),
                        // img:result.getValue(imgCol),
                        year:result.getValue(yearCol),
                        season:result.getValue(seasonCol),
                        prj:result.getValue(prjCol),
                        gender:result.getValue(genderCol),
                        series:result.getValue(seriesCol),
                        style:result.getValue(styleCol),
                        price:result.getValue(priceCol),
                        matrix:matrix
                    };
                }
                //封装iteminfo
                var itemStr = result.getValue(childCol);
                var sizes = getItemsDetail(itemStr,itemData,prod) ;

                //封装brandData
                var brandJson = brandData[brand] = brandData[brand]||{
                    first:1,
                    name:brandTxt,
                    count:0,
                    types:{}
                };

                var typesInfo = brandJson.types;
                var typeJson =typesInfo[type] = typesInfo[type]||{
                    first:1,
                    name:typeTxt,
                    count:0,
                    prods:{}
                }

                var prodsInfo = typeJson.prods;
                var prodJson = prodsInfo[prod] = prodsInfo[prod]||{
                    first:1,
                    name:prodTxt,//父商品
                    count:0,
                };
                prodJson.sizes = sizes;
                //把父商品添加到队首
                prodJson.sizes.unshift(prod);
                var itemCount = prodJson.sizes.length;
                brandJson.count+=itemCount;
                typeJson.count+=itemCount;
                prodJson.count+=itemCount;
            }
        })


        data.pageData = {
            totalCount:pageData.totalCount||0,
            totalPages:pageData.totalPages||0
        }

        log.audit({title:"data",details:data})

        return data;
    }



    /**
     * 查询商品信息
     * @param options
     */
    function searchItemInfo(options){
        var data = {};
        var brandData =data.brandData= {};//品牌信息
        var itemData = data.itemData = {};//商品信息
        var itemIdCol = {"name":"itemid","summary":"MAX","label":"名称"};
        var itemCol = {"name":"parent","summary":"GROUP","label":"父商品"};
        var itemNameCol = {"name":"formulatext","summary":"GROUP","label":"名称","formula":"nvl({parent},{itemid})"};
        var itemId2Col = {"name":"formulanumeric","summary":"GROUP","label":"名称id","formula":"nvl({parent.id},{internalid})"};
        var matrixCol = search.createColumn({"name":"formulatext","summary":"MAX","label":"MATRIX","formula":"{matrix}"})
        var upcCol = {"name":"formulatext","formula":"nvl({parent.upccode},{upccode})","summary":"MIN","label":"UPC"};
        // var imgCol =  {"name":"custitem_swc_imgurl","summary":"MAX","label":"父商品图片"};
        var childCol = {"name":"formulatext","summary":"MAX","formula":"LISTAGG({internalid}||':'||{custitem_swc_itemsize},',') WITHIN group (order by {internalid},',')","label":"子商品明细"};
        var brandCol = {"name":"cseg1","summary":"GROUP","label":"货品品牌"};
        var classCol = {"name":"custitem_swc_itemcategory","summary":"GROUP","label":"货品类别"};
        var yearCol = {"name":"custitem_swc_year","summary":"MAX","label":"年份"};
        var seasonCol = {"name":"custitem_swc_season","summary":"MAX","label":"货品季节"};
        var prjCol = {"name":"custitem_swc_project","summary":"MAX","label":"项目"};
        var genderCol = {"name":"custitem_swc_gender","summary":"MAX","label":"性别"};
        var seriesCol = {"name":"custitem_swc_series","summary":"MAX","label":"系列"};
        var styleCol = {"name":"custitem_swc_style","summary":"MAX","label":"款型"};
        var abbrCol =  {"name":"custitem_swc_itemabbr","summary":"MAX","label":"货品简称"};
        var priceCol = {"name":"custitem_swc_tagprice","summary":"MAX","label":"吊牌价"};
        var columns = [/*itemIdCol,*/itemCol,itemId2Col,itemNameCol,upcCol,matrixCol,childCol,brandCol,classCol,yearCol,seasonCol,prjCol,genderCol,seriesCol,styleCol,abbrCol,priceCol];

        // var filters = [["isinactive","is","F"],"and",["matrixchild","is","T"]];
        var filters = [["isinactive","is","F"],"and",["matrix","is","F"]];
        if(SWCUtils.hasResults(options.filters)){
            SWCUtils.addFilter(filters,options.filters);
        }
        var searchObj = search.create({
            type: "inventoryitem",
            filters: filters,
            columns:columns
        });

        var data = processItemInfo({
            searchObj:searchObj,
            itemIdCol:itemIdCol,
            itemCol:itemCol,
            itemNameCol:itemNameCol,
            itemId2Col:itemId2Col,
            upcCol:upcCol,
            matrixCol:matrixCol,
            // imgCol:imgCol,
            childCol:childCol,
            brandCol:brandCol,
            classCol:classCol,
            yearCol:yearCol,
            seasonCol:seasonCol,
            prjCol:prjCol,
            genderCol:genderCol,
            seriesCol:seriesCol,
            styleCol:styleCol,
            abbrCol:abbrCol,
            priceCol:priceCol,
            pageConfig:options.pageConfig
        });

        return data;
    }

    /**
     * 根据字符串规则，拆解属性值，并返回json
     * e.g  id:size=>{<id>:{size:1}}>}
     * @param str
     */
    function getItemsDetail(str,itemData,parent){
        var sizes = [];
        //[<id>:<size>,<id>:<size>,]
        var itemAry = str.split(",");
        itemAry.forEach(function(itemStr){
            var ary = itemStr.split(":");
            var id = ary[0];
            var size = ary[1];
            itemData[id] =itemData[id]|| {
                p:parent
            };
            itemData[id].p=parent; //非矩阵商品的p为自身
            itemData[id].size=size;
            if(!~sizes.indexOf(id) ){
              if(parent==id){
                  //非矩阵
                  sizes.push(id+"_");
              }else{
                  //矩阵
                  sizes.push(id);
              }
            }
        })
        return sizes;
    }

    /**
     * 查询商品库存信息
     */
    function searchItemInvInfo(options){
        var data = {};
        // var filters = [["matrixchild","is","T"],  "AND", ["locationquantityonhand","isnotempty",""]];
        var filters = [["matrix","is","F"],  "AND", ["locationquantityonhand","isnotempty",""]];

        if(SWCUtils.hasResults(options.filters)){
            SWCUtils.addFilter(filters,options.filters);
        }
        var searchObj = search.create({
            type: "item",
            filters:filters,
            columns:
                [{name: "internalid", summary: "GROUP"},
                // {name: "formulatext",summary: "MAX", formula: "'{'||listagg('\"'||{internalid}||'_'||{inventorylocation.id}||'\"'||':'||{locationquantityonhand},',')||'}'"}
                {name: "formulatext",summary: "MAX", formula: "'{'||listagg('\"'||{inventorylocation.id}||'\"'||':'||nvl({locationquantityonhand},0),',')||'}'"}
                ]
            });


        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var id = result.getValue({name:"internalid",summary:"group"});
                var str = result.getValue({name:"formulatext",summary:"max"});
                // log.audit({title:"str"+id,details:str})
                //str 的格式{<locid>:<onhand>}
                var itemInvData = JSON.parse(str);
                for(var locId in itemInvData){
                    data[id+"_"+locId] = {
                        loc:locId,
                        qty:itemInvData[locId]
                    }
                }
            }
        });
        return data;
    }

    /**
     * 查询商品库存信息
     */
    function searchItemInvInfoV2({locIds,itemIds,unitIds,itemUnitMap,UNITSMAP,doTrunc,doCommit}){
        var data = {};
        // var UNITSMAP = UNITSMAP ||{};
        if(itemUnitMap && !UNITSMAP){
            //查询计量单位
            UNITSMAP = getUnitsInfo({unitsTypeIds:unitIds})
        }
        var qtyField = doCommit ? "quantityavailable" : "locationquantityavailable";

        var filters = [["isinactive","is","F"],"AND",["type","anyof","Assembly","InvtPart"],"AND",["inventorylocation","anyof",locIds],"AND",
            ["internalid","anyof",itemIds], "AND",[qtyField,"greaterthan",0]];
        log.audit("filters",filters)
        var searchObj = search.create({
            type: "item",
            filters:filters,
            columns:[ "inventorylocation","locationquantityonhand",qtyField,"stockunit","itemid"]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var item = result.id;
                var loc = result.getValue({name:"inventorylocation"});
                var qty = result.getValue({name:qtyField});
                var unit = result.getValue({name:"stockunit"});
                var locInfo = data[loc] = data[loc]||{};
                //单位默认为库存单位
                locInfo[item] = {name:result.getValue({name:"itemid"}),ut:unit};

                if(itemUnitMap){
                    //如果有item 和 unit的映射关系，则进行单位转换
                    qty = toQty(qty,unit,itemUnitMap[item].ut,UNITSMAP);
                    //精度处理
                    if(doTrunc){
                        qty = sTrunc(qty);
                    }
                    //如果做了单位转换，则将ut设置为目标单位
                    locInfo[item].ut = itemUnitMap[item].ut;
                }
                locInfo[item].total=qty;
            }
        });
        return data;
    }

    /**
     * 查询销量信息
     * @param options
     */
    function searchSales(options){
        var data = {};

        // var filters = [["item.matrixchild","is","T"],"AND",["type","anyof","SalesOrd"]];
        var filters = [["item.matrix","is","F"],"AND",["type","anyof","SalesOrd"]];

        if(SWCUtils.hasResults(options.filters)){
            SWCUtils.addFilter(filters,options.filters);
        }

        log.audit({
            title:"salesfilters",
            details:filters
        })

        // var itemCol = {name: "parent",join: "item",summary: "GROUP"};
        var itemCol = {name: "formulanumeric",formula: "nvl({item.parent.id},{item.id})",summary: "GROUP"};
        var searchObj = search.create({
            type: "salesorder",
            filters:filters,
            columns:
                [itemCol,
                    {name: "location",summary: "GROUP"},
                    {name: "quantity",summary: "SUM"}]
        });
        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var id = result.getValue(itemCol);
                var loc = result.getValue({name: "location",summary: "GROUP"});
                var item_loc = id+"_"+loc;
                data[item_loc] = {
                    qty:result.getValue({name: "quantity",summary: "SUM"})
                }

            }
        })
        return data;
    }


    /**
     * 调拨单汇总
     * @param options
     */
    function searchTOSummary(options){
        var data = {};
        var poArrivalId = options.poArrivalId;
        if(!poArrivalId){
            return data;
        }
        var ids = options.exclIds;

        var filters = [["mainline","is","F"],"AND",["taxline","is","F"],"AND",["shipping","is","F"],"AND",["cogs","is","F"],
            "AND",["transactionlinetype","anyof","ITEM"],"and",["custbody_swc_toplan_summary","anyof","@NONE@"],"and",["status","anyof","TrnfrOrd:B"]];


        if(SWCUtils.hasResults(poArrivalId)){
            SWCUtils.addFilter(filters,["custbody_swc_relevance_porecord_to","anyof",poArrivalId]);
        }

        if(SWCUtils.hasResults(ids)){
            SWCUtils.addFilter(filters,["internalid","noneof",ids]);
        }

        log.audit({
            title:"filters",
            details:filters
        })

        var itemColumn = {
            name: "item",
            summary: "GROUP"
        };
        var qtyColumn = {
            name: "quantity",
            summary: "SUM",
            function:"absoluteValue"
        };

        var searchObj = search.create({
            type: "transferorder",
            filters:filters,
            columns: [ itemColumn,qtyColumn ]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var item = result.getValue(itemColumn);
                var qty = result.getValue(qtyColumn);
                data[item] ={qty:qty};
            }
        });
        return data;



    }



    /**
     * 获取到货通知单可用量信息
     * @param options
     */
    function getPOArrivalAva(options){
        var poArrivalId = options.poArrivalId;
        var exclToPlanIds = options.exclToPlanIds; //排除相应id的调拨计划
        var exclSoArrIds = options.exclSoArrIds;//排除相应id的出货单
        var toIds = options.toIds;//排除相应id的手动调拨单

        var callback = options.cb;
        var poArrData = searchPOArrivalSummary({
            poArrivalId:poArrivalId
        })
        log.audit({title:"poArrData",details:poArrData})
        var soArrData = searchSOArrivalSummary({
            poArrivalId:poArrivalId,
            exclIds:exclSoArrIds
        })
        log.audit({title:"soArrData",details:soArrData})
        var toPlanData = searchTOPlanSummary({
            poArrivalId:poArrivalId,
            exclIds:exclToPlanIds
        })
        log.audit({title:"toPlanData",details:toPlanData})
        //手动TO
        var toData = searchTOSummary({
            poArrivalId:poArrivalId,
            exclIds:toIds
        })
        log.audit({title:"toData",details:toData})
        var totalInfo = poArrData.totalInfo;
        log.audit({title:"totalInfo",details:totalInfo})

        for(var item in totalInfo){
            var poArrJson = totalInfo[item];
            var qty = poArrJson.qty;
            var soQty = soArrData[item] &&soArrData[item].qty||0;
            var toPlanQty = toPlanData[item] &&toPlanData[item].qty||0;
            var toQty = toData[item] &&toData[item].qty||0;
            poArrJson.qty = qty - soQty - toPlanQty-toQty;
            callback && callback(item,poArrJson.qty)
        }

        return totalInfo;
    }

    /**
     * 到货详细汇总
     * @param options
     */
    function searchPOArrivalSummary(options){
        var data = {};
        var poArrivalId = options.poArrivalId;
        if(!poArrivalId){
            return data;
        }
        var callback = options.cb;

        var itemIds = data.itemIds = [];
        var totalInfo = data.totalInfo = {};

        var filters = [["isinactive","is","F"]];
        var itemColumn = {name: "custrecord_swc_item",summary: "GROUP"};
        var qtyColumn = { name: "custrecord_swc_currentqty", summary: "SUM" };
        SWCUtils.addFilter(filters,["custrecord_swc_pa_fk","anyof",poArrivalId]);
        var searchObj = search.create({
            type: "customrecord_swc_item",
            filters: filters,
            columns:[itemColumn,qtyColumn]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                // var id = result.getValue({name: "internalid",summary: "GROUP"});
                var item = result.getValue({name: "custrecord_swc_item",summary: "GROUP"});
                var qty = result.getValue({name: "custrecord_swc_currentqty",summary: "SUM"});
                callback && callback(item,qty)
                totalInfo[item] = {qty:qty};
                itemIds.push(item);
            }
        });
        log.audit({title:"poArrivalId",details:data})
        return data;
    }

    /**
     * 出货单汇总
     * @param options
     */
    function searchSOArrivalSummary(options){
        var data = {};
        var poArrivalId = options.poArrivalId;
        if(!poArrivalId){
            return data;
        }

        var filters =  [["custrecord_swc_sfd_fulfilrec.custrecord_swc_sf_poarrival","anyof",poArrivalId]];
        //审批状态：已锁定（2），已生效（3），已审批（4）
        SWCUtils.addFilter(filters,["custrecord_swc_sfd_fulfilrec.custrecord_swc_sf_status","anyof",2,3,4]);
        if(options.exclIds &&options.exclIds.length){
            SWCUtils.addFilter(filters,["custrecord_swc_sfd_fulfilrec.internalid","noneof",options.exclIds]);
        }
        log.audit({
            title:"filters",
            details:filters
        })

        var itemColumn = {name: "custrecord_swc_sfd_item",summary: "GROUP"};
        var qtyColumn = { name: "custrecord_swc_sfd_num", summary: "SUM" };
        var searchObj = search.create({
            type: "customrecord_swc_sofulfil_details",
            filters:filters,
            columns: [ itemColumn,qtyColumn ]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var item = result.getValue({name: "custrecord_swc_sfd_item", summary: "GROUP"});
                var qty = result.getValue({name: "custrecord_swc_sfd_num", summary: "SUM"});
                data[item] ={qty:qty};
            }
        });
        return data;
    }


    /**
     * 查询调拨计划汇总
     * @param options
     */
    function searchTOPlanSummary(options){
        var data = {};
        var poArrivalId = options.poArrivalId;
        if(!poArrivalId){
            return data;
        }
        var callback = options.cb;

        var filters = [["custrecord_swctd_toplan.custrecord_swct_poarrival","anyof",poArrivalId]];
        if(options.exclIds &&options.exclIds.length){
            SWCUtils.addFilter(filters,["custrecord_swctd_toplan.internalid","noneof",options.exclIds]);
        }
        var itemColumn = {name: "custrecord_swctd_itemid",summary: "GROUP"};
        var qtyColumn = { name: "custrecord_swctd_qty", summary: "SUM" };
        var searchObj = search.create({
            type: "customrecord_swc_toplan_detail",
            filters:filters,
            columns:[itemColumn,qtyColumn]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var item = result.getValue(itemColumn);
                var qty = result.getValue(qtyColumn);
                data[item] = {qty:qty};
                if(callback){
                    callback(item,qty);
                }
            }
        });

        return data;
    }


    /**
     * 查询调拨汇总(非合并调拨生成，即手动创建或csv导入的TO)
     * @param options
     */
    function searchManualTOSummary(options){
        var data = {};
        var poArrivalId = options.poArrivalId;
        if(!poArrivalId){
            return data;
        }
        var callback = options.cb;

        var filters = [["type","anyof","TrnfrOrd"],"AND",["mainline","is","F"],"AND",["taxline","is","F"],"AND",["shipping","is","F"],"AND",["cogs","is","F"],
            "AND",["transactionlinetype","anyof","ITEM"],"AND",["custbody_swc_toplan_summary","anyof","@NONE@"]];
        if(options.exclIds &&options.exclIds.length){
            SWCUtils.addFilter(filters,["internalid","noneof",options.exclIds]);
        }
        SWCUtils.addFilter(filters,["custbody_swc_relevance_porecord_to","anyof",poArrivalId]);

        var itemColumn = {name: "item",summary: "GROUP"};
        var qtyColumn = { name: "quantity", summary: "SUM" ,function:"absoluteValue"};

        var searchObj = search.create({
            type: "transferorder",
            filters:filters,
            columns:[itemColumn,qtyColumn]
        });
        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var item = result.getValue(itemColumn);
                var qty = result.getValue(qtyColumn);
                data[item] = {qty:qty};
                if(callback){
                    callback(item,qty);
                }
            }
        });

        return data;
    }

    /**
     * 与到货通知单比对可用信息，即确认到货单的可用数量是否可以满足本次出货需求
     * @param otpions
     */
    function checkAvaWithPOArrival(options){
        var data = {};
        var poArrivalId = options.poArrivalId;
        //<itemid>:{qty:}
        var poArrivalInfo = options.poArrivalInfo;
        //<itemid>:{qty:}
        var reqInfo = options.reqInfo||{};
        if(!poArrivalId){
            throw "请传入poArrivalId";
            return data;
        }

        var passed = true;
        //获取到货单可用数量
        poArrivalInfo = getPOArrivalAva({
            poArrivalId :poArrivalId,
            exclToPlanIds:options.exclToPlanIds,//排除相应id的调拨计划
            exclSoArrIds:options.exclSoArrIds  //排除相应id的出货单
        });


        if(!Object.keys(poArrivalInfo).length){
            data.passed = false;
            return data;
        }

        //如果有差异，则diffInfo 显示差异货品的数量，负数代表可用数量不足；若无差异，diffInfo 为空json
        var diffInfo = {};
        //查找差异
        for(var item in poArrivalInfo){
            var poArrivalJson = poArrivalInfo[item];
            var reqJson = reqInfo[item]||{qty:0};
            var diff = poArrivalJson.qty - reqJson.qty
            log.audit({
                title:"poArrivalInfo",
                details:diff
            })
            if( diff< 0){
                diffInfo[item] = {diff:diff};
                passed = false;
            }
        }
        data.passed = passed;
        data.diffInfo = diffInfo;
        return data;

    }
    /////////////////////////////////基本信息查询////////////////////////////////////////
    /**
     * 加载barcode 与 itemid 的映射
     * @param options
     */
    function initBarcodes(options){
        var data = {barcodes:{},items:{}}
        var itemIds = options.itemIds;
        var searchObj = search.create({
            type:"inventoryitem",
            filters:["internalid","anyof",itemIds],
            columns:["upccode"]
        })
        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb : function(result){
                var upc = result.getValue({
                    name:"upccode"
                })
                data.barcodes[upc] = data.items[result.id] = {id:result.id,upc:upc};
            }
        })

        return data;
    }


    /**
     * 获取全部储位
     */
    function getAllBins(options){
        var loc = options.loc;
        //储位编号
        var binIds = options.binIds;
        var binNums = options.binNums;
        // var lastMod = options.lastMod;
        var data= {};
        var idNumInfo =data.idNumInfo = {};
        var numIdInfo =data.numIdInfo = {};
        var extraFilters = options.filters;
        var filters = [["inactive","is","F"]];
        if(loc){
            SWCUtils.addFilter(filters,["location","anyof",loc])
        }
        if(SWCUtils.hasResults(binIds)){
            SWCUtils.addFilter(filters,["internalid","anyof",binIds])
        }

        if(binNums && binNums.length){
            SWCUtils.addFilter(filters,SWCUtils.buildNameFilter("binnumber",binNums))
        }

        if(SWCUtils.hasResults(extraFilters)){
            SWCUtils.addFilter(filters,extraFilters)
        }

        var locData = getLocInfo(loc);

        var searchObj = search.create({
            type:"bin",
            filters:filters,
            columns:["binnumber","location"]
        })
        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb : function(result){
                var num = result.getValue({name:"binnumber"});
                var id = result.id;
                idNumInfo[id] = {num:num};
                if(!loc){
                    //如果未传入指定仓库，则在结果中记录储位对应的仓库
                    var nowloc = result.getValue({name:"location"});
                    idNumInfo[id].loc = nowloc;
                    idNumInfo[id].locNum = locData[nowloc] || "";
                }
                numIdInfo[num] = id;
            }
        })
        return data;
    }

    function getLocInfo(loc) {
        var data = {};
        var filters = [];
        if (loc) filters.push(["internalid","anyof",loc])
        var locationSearchObj = search.create({
            type: "location",
            filters: filters,
            columns: [search.createColumn({name: "custrecord_swms_loc_num", label: "仓库编码"})]
        });
        locationSearchObj.run().each(function(result){
            data[result.id] = result.getValue({name: "custrecord_swms_loc_num"})
            return true;
        });
        return data;
    }

    /**
     * 商品信息查询
     */
    function searchITEMS_INFO(options){
        //<parentitemid>:{n:"",dt:{<itemid>:{s:"sku",sz:"size"}}}
        var data = {};
        var filters = [];
        SWCUtils.addFilter(filters,["isinactive","is","F"]);
        SWCUtils.addFilter(filters,["matrix","is","F"]);
        SWCUtils.addFilter(filters,["upccode","isnotempty",""]);
        var itemIds = options.itemIds;
        if(SWCUtils.hasResults(itemIds)){
            SWCUtils.addFilter(filters,["internalid","anyof",itemIds])
        }
        var itemCol = {"name":"formulanumeric","summary":"GROUP","formula":"nvl({parent.id},{internalid})","label":"父商品"};
        var nameCol = search.createColumn({"name":"formulatext","summary":"MAX","formula":"nvl({parent.name},{name})","label":"名称"});
        var childCol =search.createColumn( {"name":"formulatext","summary":"MAX","formula":"listagg({internalid}||':'||{upccode}||':'||{custitem_swc_itemsize},',')","label":"子商品明细"});
        var columns = [itemCol,nameCol,childCol];
        //扩展字段column
        ////<prop>:<column>
        var extraColumns = options.extraColumns;
        if(extraColumns){
            util.each(extraColumns,function(col){
                columns.push(col)
            });
        }

        var searchObj = search.create({
            type:"inventoryitem",
            filters:filters,
            columns:columns
        })
        var itemsInfo = {};
        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb : function(result){
                var parent = result.getValue(itemCol);
                var name = result.getValue(nameCol);
                var childStr = result.getValue(childCol);
                var parentInfo = itemsInfo[parent] = {
                    n:name,
                    dt:getItemDetailForPDA(childStr)
                }

                //扩展字段处理
                util.each(extraColumns,function(col,prop){
                    parentInfo[prop] = result.getValue(col);
                });
            }
        });
        return itemsInfo;
    }

    function searchITEMS_INFO_V2_total(options){
        var filters = [];
        SWCUtils.addFilter(filters,["isinactive","is","F"]);
        SWCUtils.addFilter(filters,["matrix","is","F"]);
        SWCUtils.addFilter(filters,["upccode","isnotempty",""]);
        var itemIds = options.itemIds;
        if(SWCUtils.hasResults(itemIds)){
            SWCUtils.addFilter(filters,["internalid","anyof",itemIds])
        }
        var itemCol = {"name":"formulanumeric","summary":"COUNT","formula":"nvl({parent.id},{internalid})","label":"父商品"};
        var searchObj = search.create({
            type:"inventoryitem",
            filters:filters,
            columns:[itemCol]
        });
        var total = 0;
        var results = searchObj.run().getRange({start:0,end:1});
        if(SWCUtils.hasResults(results)){
            total = results[0].getValue(itemCol);
        }

        return total;
    }

    /**
     * 获取商品信息，父子的内部id为key，父商品记录商品详细，子item引用父商品id
     * {<parent>:{},<child>:{p:1}}
     * @param options
     * @return {{}}
     */
    function searchITEMS_INFO_V2(options){
        //<parentitemid>:{n:"",dt:{<itemid>:{s:"sku",sz:"size"}}}
        var data = {};
        var filters = [];
        SWCUtils.addFilter(filters,["isinactive","is","F"]);
        SWCUtils.addFilter(filters,["matrix","is","F"]);
        SWCUtils.addFilter(filters,["upccode","isnotempty",""]);
        var itemIds = options.itemIds;
        if(SWCUtils.hasResults(itemIds)){
            SWCUtils.addFilter(filters,["internalid","anyof",itemIds])
        }

        var skus = options.skus;
        if(SWCUtils.hasResults(skus)){
            SWCUtils.addFilter(filters,["externalid","anyof",skus])
        }

        var lastMod = options.lastMod;
        if(lastMod){
            SWCUtils.addFilter(filters,["lastmodifieddate","onorafter",lastMod]);
        }
        var itemCol = {"name":"formulanumeric","summary":"GROUP","formula":"nvl({parent.id},{internalid})","label":"父商品"};
        var nameCol = search.createColumn({"name":"formulatext","summary":"MAX","formula":"nvl({parent.name},{name})","label":"名称"});
        var childCol =search.createColumn( {"name":"formulatext","summary":"MAX","formula":"listagg({internalid}||':'||{upccode}||':'||{custitem_swc_itemsize},',')","label":"子商品明细"});
        var columns = [itemCol,nameCol,childCol];
        //扩展字段column
        ////<prop>:<column>
        var extraColumns = options.extraColumns;
        if(extraColumns){
            util.each(extraColumns,function(col){
                columns.push(col)
            });
        }
        //子id对应的json中，p对应的parentObj ，否则为parentId
        var parentObj = options.parentObj;
        var searchObj = search.create({
            type:"inventoryitem",
            filters:filters,
            columns:columns
        })

        //计算总记录数量
        var calcTotal = options.calcTotal;
        if(calcTotal){
            return searchObj.runPaged().count;
        }

        var itemsInfo = {};
        SWCUtils.getAllResultsByPage({
            searchObj:searchObj,
            donotStoreResults:true,
            startPage:options.startPage,
            pageCount:options.pageCount,
            cb : function(result){
                var parent = result.getValue(itemCol);
                var name = result.getValue(nameCol);
                var childStr = result.getValue(childCol);
                var parentInfo = itemsInfo[parent] = {
                    n:name,
                }

                //将子商品添加到itemsInfo
                getItemDetailForPDA(childStr,parent,parentInfo,parentObj,itemsInfo);

                //扩展字段添加到父商品
                util.each(extraColumns,function(col,prop){
                    parentInfo[prop] = result.getValue(col);
                });
            }
        });
        return itemsInfo;
    }

    /**
     * 从cache获取item info
     * 【Cache】内容 + 增量更新的内容
     * @param options
     */
    function getITEMS_INFO_Cache(options){
        var data = {};
        //上次更新日期如果有值，则只返回增量部分
        var lastSyncDate = options.lastSyncDate;
        var itemIds = options.itemIds;
        var skus = options.skus;
        if(lastSyncDate || itemIds ||skus){
            if(lastSyncDate){
                lastSyncDate = format.format({value:lastSyncDate,type:"date"});
            }
            //只取最新数据
            return searchITEMS_INFO_V2({
                lastMod:lastSyncDate,
                itemIds:options.itemIds,
                skus:options.skus,
            });
        }

        //返回【Cache】+增量部分
        var outputStr = SWCUtils.getCache({
            fldCount:Constants.CACHE_ITEM_FLDCOUNT, //存储item信息用到的字段个数
            cacheName: "ITEM", cb: function (str, lastMod,lastModDate) {
                if (str) {
                    util.extend(data, JSON.parse(str));
                }
                //缓存最后更新日期
                if(lastModDate){
                    options.cacheLastModDate = lastModDate;
                }
                //整合最新数据
                var itemsInfo = searchITEMS_INFO_V2({lastMod:lastMod});
                util.extend(data, itemsInfo);
                return JSON.stringify(data);
            }
        });
        //如果outputType 为JSON，则返回对象，否则返回字符串
        if(options && options.outputType == "JSON"){
            return data;
        }
        return outputStr;
    }


    /**
     * 持久化最新的item info 到cache
     * 【Cache】内容 + 增量更新部分
     * @param options
     */
    function saveITEMS_INFO_Cache(options){
        var data = {};
        var outputStr = SWCUtils.saveCache({
            cacheName: "ITEM",
            fldCount: Constants.CACHE_ITEM_FLDCOUNT,
            cb:function(str,lastMod){
                if(str){
                    data = JSON.parse(str);
                }
                //整合最新数据
                var itemsInfo = searchITEMS_INFO_V2({lastMod:lastMod,
                    extraColumns:{
                    rate:{"name":"custitem_swc_tagprice","summary":"GROUP","label":"吊牌价"},
                    b:{"name":"cseg1","summary":"GROUP","label":"品牌"},
                        c:{"name":"custitem_swc_itemcategory","summary":"GROUP","label":"类别"}
                    }
                });
                util.extend(data, itemsInfo);
                return JSON.stringify(data);
            }
        });
        return outputStr;
    }


    /**
     * 获取商品信息
     * {<itemid>:{}}
     * @param options
     * @return {{}}
     */
    function searchITEMS_INFO_Basic(options){
        var data = {};
        var useSKUKey = options.useSKUKey; //如果useSKUKey为true，则以upc作为key，否则以内部id作为key
        var filters = [];
        SWCUtils.addFilter(filters,["type","anyof","InvtPart","Assembly"]);
        SWCUtils.addFilter(filters,["isinactive","is","F"]);
        if(options.isLot){
            SWCUtils.addFilter(filters,["islotitem","is","T"]);
        }

        if(options.checkSkipSWMS){
            SWCUtils.addFilter(filters,["custitem_swms_skip_swms","is","F"]);
        }
        // SWCUtils.addFilter(filters,["upccode","isnotempty",""]);
        var itemIds = options.itemIds;
        if(SWCUtils.hasResults(itemIds)){
            SWCUtils.addFilter(filters,["internalid","anyof",itemIds])
        }

        var skus = options.skus;
        if(SWCUtils.hasResults(skus)){
            // SWCUtils.addFilter(filters, SWCUtils.buildNameFilter("upccode",skus));
            SWCUtils.addFilter(filters, SWCUtils.buildNameFilter(Constants.UPC_FLD,skus));
        }

        var lastMod = options.lastMod;
        if(lastMod){
            SWCUtils.addFilter(filters,["lastmodifieddate","onorafter",lastMod]);
        }
        var columns = ["itemid",Constants.UPC_FLD,"displayname"];
        //扩展字段column
        ////<prop>:<column>
        var extraColumns = options.extraColumns;
        if(extraColumns){
            util.each(extraColumns,function(col){
                columns.push(col)
            });
        }
        var searchObj = search.create({
            type:"item",
            filters:filters,
            columns:columns
        })

        //计算总记录数量
        var calcTotal = options.calcTotal;
        if(calcTotal){
            return searchObj.runPaged().count;
        }

        SWCUtils.getAllResultsByPage({
            searchObj:searchObj,
            donotStoreResults:true,
            startPage:options.startPage,
            pageCount:options.pageCount,
            cb : function(result){
                var upcCode = result.getValue({name:Constants.UPC_FLD});
                var key =useSKUKey?upcCode:result.id;
                data[key] = {
                    s:upcCode,
                    n:result.getValue({name:"itemid"}),
                    dn:result.getValue({name:"displayname"}),
                }

                //扩展字段添加到父商品
                util.each(extraColumns,function(col,prop){
                    data[key][prop] = result.getValue(col);
                });
                if(useSKUKey){
                    data[key].id = result.id;
                }
            }
        });
        return data;
    }

    /**
     * 从cache获取item info
     * 【Cache】内容 + 增量更新的内容
     * @param options
     */
    function getITEMS_INFO_Cache_Basic(options){
        var data = {};
        //上次更新日期如果有值，则只返回增量部分
        var lastSyncDate = options.lastSyncDate;
        var itemIds = options.itemIds;
        var skus = options.skus;
        if(lastSyncDate || itemIds ||skus){
            if(lastSyncDate){
                lastSyncDate = format.format({value:lastSyncDate,type:"date"});
            }
            //只取最新数据
            return searchITEMS_INFO_Basic({
                lastMod:lastSyncDate,
                itemIds:options.itemIds,
                skus:options.skus,
            });
        }

        //返回【Cache】+增量部分
        var outputStr = SWCUtils.getCache({
            fldCount:Constants.CACHE_ITEM_FLDCOUNT, //存储item信息用到的字段个数
            cacheName: "ITEM", cb: function (str, lastMod,lastModDate) {
                if (str) {
                    util.extend(data, JSON.parse(str));
                }
                //缓存最后更新日期
                if(lastModDate){
                    options.cacheLastModDate = lastModDate;
                }
                //整合最新数据
                var itemsInfo = searchITEMS_INFO_Basic({lastMod:lastMod});
                util.extend(data, itemsInfo);
                return JSON.stringify(data);
            }
        });
        //如果outputType 为JSON，则返回对象，否则返回字符串
        if(options && options.outputType == "JSON"){
            return data;
        }
        return outputStr;
    }


    /**
     * 持久化最新的item info 到cache
     * 【Cache】内容 + 增量更新部分
     * @param options
     */
    function saveITEMS_INFO_Cache_Basic(options){
        var data = {};
        var outputStr = SWCUtils.saveCache({
            cacheName: "ITEM",
            fldCount: Constants.CACHE_ITEM_FLDCOUNT,
            cb:function(str,lastMod){
                if(str){
                    data = JSON.parse(str);
                }
                //整合最新数据
                var itemsInfo = searchITEMS_INFO_Basic({/*lastMod:lastMod*/});
                util.extend(data, itemsInfo);
                return JSON.stringify(data);
            }
        });
        return outputStr;
    }

    /**
     * 将sku 替换为 内部id
     * 例如 {sku01 :{a:1}}  => { 123:{a:1}}
     * @param options
     */
    function replaceSKUWithId(options){
        var items = options.items;
        var itemSkus = Object.keys(items);
        var filters = [];
        SWCUtils.addFilter(filters,SWCUtils.buildNameFilter(Constants.UPC_FLD,itemSkus));
        SWCUtils.addFilter(filters,["isinactive","is","F"]);
        var itemSkuInfo = SWCUtils.getAllResultsJson({
            type:"item",
            filters:filters,
            columns:[Constants.UPC_FLD],
            key:Constants.UPC_FLD
        });
        var itemsNew = {};
        util.each(items,function(itemInfo,sku){
            var itemId = itemSkuInfo[sku] && itemSkuInfo[sku].id;
            if(!itemId){
                throw "SKU 不存在";
            }
            itemsNew[itemId] = items[sku];
        })
        return itemsNew;
    }

    /**
     * 将子itme表达式 转为json对象
     * <id>:<upc>:<size> =>  <id>:{s:<upc>:,sz:<size>}
     */
    function getItemDetailForPDA(str,parentId,parentObj,useParentObj,itemsInfo){

        var itemsAry = str.split(",");
        itemsAry.forEach(function(itemStr){
            var itemAry = itemStr.split(":");
            var id = itemAry[0];
            var upc = itemAry[1];
            var size = itemAry[2];
            var itemInfo = itemsInfo[id] = itemsInfo[id]||{}
            itemInfo.s = upc;
            itemInfo.sz = size;
            if(parentId == id){
                //如果当前商品为普通在库商品，则设置name
                itemInfo.n = parentObj.n;
            }else{
                //记录parent信息
                itemInfo.p = useParentObj?parentObj:parentId
            }
        })

    }

    function getEntityAddressByAddrId(options){
        //结构为{<addrId>:{}}
        var addrInfo = options.addrInfo;
        var ids = options.ids;
        // var addrCb = options.addrCb;

        if(!SWCUtils.hasResults(ids)){
            return addrInfo;
        }
        var filters = [["internalid","anyof",ids]];
        var addrIdcol = {name:"addressinternalid",join:"address"};
        var stateCol = {name:"state",join:"address"};
        var addr1Col = {name:"address1",join:"address"};
        var cityCol = {name:"city",join:"address"};
        var addr2Col = {name:"address2",join:"address"};
        var addr3Col = {name:"address3",join:"address"};
        var phoneCol = {name:"addressphone",join:"address"};
        var addreeCol = {name:"addressee",join:"address"};
        var attenCol = {name:"attention",join:"address"};
        var zipCol = {name:"zipcode",join:"address"};
        var ebossCol = {name:"custrecord_swc_eboss_storeid",join:"address"};
        var cfNumCol = {name:"custrecord_swc_cf_num",join:"address"};
        var cols = [addrIdcol,stateCol,addr1Col,cityCol,addr2Col,addr3Col,phoneCol,addreeCol,attenCol,zipCol,ebossCol,cfNumCol];
        var searchObj = search.create({
            type: "entity",
            filters: filters ,
            columns:cols
                // ["addressinternalid","state","address1","city", "address2","address3","addressphone","addressee","attention", "zipcode"]
        });
        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var addrId = result.getValue(addrIdcol);//result.getValue({name:"addressinternalid"});
                if(addrInfo[addrId]){
                    addrInfo[addrId].addrId = addrId;
                    addrInfo[addrId].ebossid = result.getValue(ebossCol);//result.getValue({name:"custrecord_swc_eboss_storeid"});
                    addrInfo[addrId].zip = result.getValue(zipCol);//result.getValue({name:"zipcode"});
                    addrInfo[addrId].state = result.getValue(stateCol);//result.getValue({name:"state"});
                    addrInfo[addrId].city = result.getValue(cityCol);//result.getValue({name:"city"});
                    addrInfo[addrId].addr1 = result.getValue(addr1Col);//result.getValue({name:"address1"});
                    addrInfo[addrId].addr2 = result.getValue(addr2Col);//result.getValue({name:"address2"});
                    addrInfo[addrId].addr3 = result.getValue(addr3Col);//result.getValue({name:"address3"});
                    addrInfo[addrId].addressee = result.getValue(addreeCol);//result.getValue({name:"addressee"});
                    addrInfo[addrId].attention = result.getValue(attenCol);//result.getValue({name:"attention"});
                    addrInfo[addrId].addrphone = result.getValue(phoneCol);//result.getValue({name:"addressphone"});
                    addrInfo[addrId].cfNum = result.getValue(cfNumCol);
                    //处理地址信息
                    addrInfo[addrId].addrText = getAddrText(addrInfo[addrId]);
                    // if(util.isFunction(addrCb)){
                    //     addrCb(addrInfo);
                    // }
                }
            }
        })
        return addrInfo;

    }

    /**
     * 获取Entity 基本信息
     * @param options
     */
    function getEntityInfo(options){
        var data = {info:{}};
        var ids = options.ids;
        if(!SWCUtils.hasResults(ids)){
            return data;
        }

        //使用播种位作为标识
        var useDest = options.useDest;
        var destIdMapping = null;
        var idDestMapping = null;
        if(useDest){
            destIdMapping = data.destIdMapping = {};
            idDestMapping = data.idDestMapping = {};
        }
        var filters = [];
        SWCUtils.addFilter(filters,["internalid","anyof",ids]);

        var searchObj = search.create({
            type: "entity",
            filters: filters,
            columns:["altname","shipzip","shipstate","shipcity","shipaddress1","shipaddress2",
                "shipaddress3","shipaddressee","shipattention","shipphone"]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result,index){
                var id = result.id;
                var key = id;
                if(useDest){
                    //获取播种位
                    key = numToDest(index);
                    idDestMapping[id] = key;
                    destIdMapping[key] = id;
                }

                data.info[key] = {
                    id:id,
                    name:result.getValue({name:"altname"}),
                    zip:result.getValue({name:"shipzip"}),
                    state:result.getValue({name:"shipstate"}),
                    city:result.getValue({name:"shipcity"}),
                    addr1:result.getValue({name:"shipaddress1"}),
                    addr2:result.getValue({name:"shipaddress2"}),
                    addr3:result.getValue({name:"shipaddress3"}),
                    addressee:result.getValue({name:"shipaddressee"}),
                    attention:result.getValue({name:"shipattention"}),
                    addrphone:result.getValue({name:"shipphone"}),

                }
                //处理地址信息
                data.info[key].addrText = getAddrText(data.info[key]);

                //通过default 设置默认值
                util.extend(data.info[key],options.default)
            }
        })


        return data;
    }

    /**
     * 获取仓库基本信息
     * @param options
     */
    function getLocationInfo(options){
        var data = {info:{}};
        var ids = options.ids;
        if(!SWCUtils.hasResults(ids)){
            return data;
        }

        //使用播种位作为标识
        var useDest = options.useDest;
        var destIdMapping = null;
        var idDestMapping = null;
        if(useDest){
            destIdMapping = data.destIdMapping = {};
            idDestMapping = data.idDestMapping = {};
        }

        var filters = [];
        SWCUtils.addFilter(filters,["internalid","anyof",ids]);

        var nameCol = {name:"name"};
        var zipCol = {name:"zip",join:"address"};
        var stateCol = {name:"state",join:"address"};
        var cityCol = {name:"city",join:"address"};
        var addr1Col = {name:"address1",join:"address"};
        var addr2Col = {name:"address2",join:"address"};
        var addr3Col = {name:"address3",join:"address"};
        var addresseeCol = {name:"addressee",join:"address"};
        var attentionCol = {name:"attention",join:"address"};
        var phoneCol = {name:"phone",join:"address"};
        var cfNumCol = {name:"custrecord_swc_cf_num",join:"address"};
        var columns = [nameCol,zipCol,stateCol,cityCol,addr1Col,addr2Col,addr3Col,addresseeCol,attentionCol,phoneCol,cfNumCol];

        var searchObj = search.create({
            type: "location",
            filters: filters,
            columns:columns
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result,index){
                var id = result.id;
                var key = id;
                if(useDest){
                    //获取播种位
                    key = numToDest(index);
                    idDestMapping[id] = key;
                    destIdMapping[key] = id;
                }

                data.info[key] = {
                    id:id,
                    name:result.getValue(nameCol),
                    zip:result.getValue(zipCol),
                    state:result.getValue(stateCol),
                    city:result.getValue(cityCol),
                    addr1:result.getValue(addr1Col),
                    addr2:result.getValue(addr2Col),
                    addr3:result.getValue(addr3Col),
                    addressee:result.getValue(addresseeCol),
                    attention:result.getValue(attentionCol),
                    addrphone:result.getValue(phoneCol),
                    cfNum:result.getValue(cfNumCol),
                }
                //处理地址信息
                data.info[key].addrText = getAddrText(data.info[key]);
                //通过default 设置默认值
                util.extend(data.info[key],options.default)
            }
        })


        return data;
    }


    /**
     * 获取单据基本信息
     * @param options
     */
    function getTransInfo(options){
        var data = {info:{}};
        var ids = options.ids;
        if(!SWCUtils.hasResults(ids)){
            return data;
        }

        var locIds = options.locIds||[];
        //使用播种位作为标识
        var useDest = options.useDest;
        var destIdMapping = null;
        var idDestMapping = null;
        if(useDest){
            destIdMapping = data.destIdMapping = {};
            idDestMapping = data.idDestMapping = {};
        }

        var useBinCol = {name:"custrecord_swc_use_bin",join:"location"}

        var filters = [];
        SWCUtils.addFilter(filters,["internalid","anyof",ids]);
        SWCUtils.addFilter(filters,["mainline","is","T"]);

        var searchObj = search.create({
            type: "transaction",
            filters: filters,
            columns:["class","cseg_swc_store","tranid","entity","shipzip","shipstate","shipcity","shipaddress1","shipaddress2","memo",{name:"custrecord_swc_cf_num",join:"shippingaddress"},
                "shipaddress3","shipaddressee","shippingattention","shipphone","custbody_swc_shipmethod","location","transferlocation"
                ,"custbody_swc_relevance_porecord_to","custbody_swc_delivery_code",useBinCol,"custbody_swc_so_class","custbody_swc_ecomm_platform",{name:"custrecord_swcm_code",join:"custbody_swc_vip"}]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result,index){
                var id = result.id;
                var key = id;
                if(useDest){
                    //获取播种位
                    key = numToDest(index);
                    idDestMapping[id] = key;
                    destIdMapping[key] = id;
                }

                data.info[key] = {
                    id:id,
                    // vipno:result.getValue({name:"custentity_swc_vipno",join:"customer"}),
                    vipno:result.getValue({name:"custrecord_swcm_code",join:"custbody_swc_vip"}),
                    num:result.getValue({name:"tranid"}),
                    // name:result.getText({name:"transferlocation"}),
                    zip:result.getValue({name:"shipzip"}),
                    state:result.getValue({name:"shipstate"}),
                    city:result.getValue({name:"shipcity"}),
                    addr1:result.getValue({name:"shipaddress1"}),
                    addr2:result.getValue({name:"shipaddress2"}),
                    addr3:result.getValue({name:"shipaddress3"}),
                    addressee:result.getValue({name:"shipaddressee"}),
                    attention:result.getValue({name:"shippingattention"}),
                    addrphone:result.getValue({name:"shipphone"}),
                    express:result.getValue({name:"custbody_swc_shipmethod"}),
                    tolocation:result.getText({name:"transferlocation"}),
                    poArrId:result.getValue({name:"custbody_swc_relevance_porecord_to"}),
                    sdoNum:result.getValue({name:"custbody_swc_delivery_code"})||"",  //发货单号
                    memo:result.getValue({name:"memo"})||"",
                    useBin:result.getValue(useBinCol)?"T":"F",
                    cfNum:result.getValue({name:"custrecord_swc_cf_num",join:"shippingaddress"})||"",
                    loc:result.getValue({name:"location"}),  //对于全渠道来说，loc是下单仓库
                    class:result.getValue({name:"class"}),//高氏子公司
                    store:result.getValue({name:"cseg_swc_store"}),//店铺资料
                }

                if(locIds){
                    locIds.push(result.getValue({name:"location"}))
                }

                //订单分类
                var soClass = data.info[key].soClass = result.getValue({name:"custbody_swc_so_class"});

                //门店全渠道取货 ： 订单分类=全渠道缺货 && 电商平台为空
                if(soClass == Constants.OMNIORDER && !result.getValue({name:"custbody_swc_ecomm_platform"})){
                    data.info[key].isOMNI = "T";
                }

                if(options.default &&  options.default.tranType == "TO"){
                    data.info[key].name = result.getText({name:"transferlocation"});
                }else{
                    data.info[key].name = result.getText({name:"entity"});
                }

                //处理地址信息
                data.info[key].addrText = getAddrText(data.info[key]);
                //通过default 设置默认值
                util.extend(data.info[key],options.default)
            }
        })


        return data;
    }

    /**
     * 查询仓库信息
     */
    function searchLocations(options){
        var ids = options.ids;
        var data = {};
        var isOneWorld = SWCUtils.isOneWorld();
        var queryObj = query.create({type:"location"});
        var idCol = queryObj.createColumn({fieldId:"id"});
        var nameCol = queryObj.createColumn({fieldId:"name"});
        var subsidiaryCol = queryObj.createColumn({fieldId:"subsidiary"});
        var usesbinsCol = queryObj.createColumn({fieldId:"usebins"});

        var conditions = [];
        conditions.push( queryObj.createCondition({
            fieldId:"isinactive",operator: query.Operator.IS,values:false}))
        if(SWCUtils.hasResults(ids)){
            conditions.push(queryObj.createCondition({
                fieldId:"id",operator: query.Operator.ANY_OF,values:ids}))
        }
        queryObj.condition = queryObj.and(conditions);
        queryObj.columns=[idCol,nameCol,usesbinsCol];

        if(isOneWorld){
            queryObj.columns.push(subsidiaryCol);
        }
        SWCUtils.getAllResultsQuery({queryObj:queryObj,cb:function(resultData){
                var result = resultData.values;
                var id = result[0];
                var name = result[1];
                var usesbins = result[2];
                var subsidiary = "";
                if(isOneWorld){
                    subsidiary = result[3]||"";
                }

                data[id] = {
                    name:name,
                    subsidiary:subsidiary||"",
                    usesbins:usesbins
                }
            }})

        return data;
    }

    /**
     * 获取计量单位信息
     * @param ids 计量单位id
     */
    function getUnitsInfo({unitsTypeIds,ids}){
        //{<id>:{isBase:"",rate:""}}
        var data = {};
        var queryObj = query.create({
            type:"unitstype",
        });

        var idCol = queryObj.createColumn({fieldId:"id"});
        var unitQueryObj = queryObj.join({fieldId:"uom"});
        var unitIdCol = unitQueryObj.createColumn({fieldId:"internalid"})
        var isBaseCol =  unitQueryObj.createColumn({fieldId:"baseunit"})
        var rateCol =  unitQueryObj.createColumn({fieldId:"conversionrate"})
        var nameCol =  unitQueryObj.createColumn({fieldId:"unitname"})

        queryObj.columns = [idCol,unitIdCol,isBaseCol,rateCol,nameCol]

        var conditions = [];
        /*var idCond = queryObj.createCondition({
            fieldId:"id",
            operator:query.Operator.ANY_OF,
            values:ids
        });*/

        if(SWCUtils.hasResults(ids)){
            var idCond = unitQueryObj.createCondition({
                fieldId:"internalid",
                operator:query.Operator.ANY_OF,
                values:ids
            });
            conditions.push(idCond);
        }

        if(SWCUtils.hasResults(unitsTypeIds)){
            var unitsTypeCond = queryObj.createCondition({
                fieldId:"id",
                operator:query.Operator.ANY_OF,
                values:unitsTypeIds
            });
            conditions.push(unitsTypeCond);
        }

        queryObj.condition = queryObj.and(conditions);
        SWCUtils.getAllResultsQuery({queryObj:queryObj,cb:function(result){
                var id = result.values[0];
                var utId = result.values[1];
                var isBase = result.values[2];
                var rate = result.values[3];
                var name = result.values[4];
                data[utId] = {isBase,rate,name};
            }});
        return data;
    }

    /**
     * 将当前单位数量，转换为目标单位的数量
     * @param qty
     * @param fromUnit
     * @param toUnit
     * @param UNITSMAP  {<unitId>:{rate:10}}
     * @return {number}
     */
    function toQty(qty,fromUnit,toUnit,UNITSMAP,doTrunc,digits,convertToBaseUT){
        if(!toUnit){
            throw "未选择目标计量单位";
        }

        //单位相同，则不转换
        if(fromUnit == toUnit){
            return qty;
        }
        var rate = 1;
        if(convertToBaseUT){
            //转为基本单位
            rate = UNITSMAP[fromUnit].rate;
        }else{
            //如果已经做过单位间转换，则将转换率添加到UNITSMAP
            var key = fromUnit+"_"+toUnit;
            rate = UNITSMAP[key] = UNITSMAP[key]||(UNITSMAP[fromUnit].rate/UNITSMAP[toUnit].rate);
        }

        //TODO 判断UNITSMAP[toUnit].rate是否可以被除尽
        qty = qty * rate;
        if(qty<Constants.MIN_DECIMAL){
            return 0;
        }
        qty = doTrunc ?  sTrunc(qty,digits??5) : sRound(qty,digits??5);
        // qty = doTrunc ?  sTrunc(qty * rate,digits??5) : sRound(qty * rate,digits??5);
        // qty = doTrunc ?  sTrunc(qty * rate,digits??8) : sRound(qty * rate,digits??8);
        //如果数量小于最小值，则返回0
        return (qty<Constants.MIN_DECIMAL)?0:qty;
    }

    /**
     * 获取最后一次上架日期
     * @param itemIds
     */
    function getLastPutawayInfo({itemIds,loc,cb}){
        if(!(SWCUtils.hasResults(itemIds) && loc)){
            throw "itemIds,loc is mandatory";
        }

        var itemBinInfo = {};
        var itemCol = search.createColumn({ name: "item",summary: "GROUP" });
        var binCol =  search.createColumn({ name: "formulanumeric",summary: "MAX",
            formula: "max({inventorydetail.binnumber.id}) keep (dense_rank first order by {trandate} DESC)" });
        var binNameCol = search.createColumn({ name: "formulatext", summary: "MAX",
            formula: "max({inventorydetail.binnumber}) keep (dense_rank first order by {trandate} DESC)"});

        var searchObj = search.create({
            type: "inventorytransfer",
            filters:
                [["type","anyof","InvTrnfr"], "AND",["inventorydetail.itemcount","greaterthan","0"],
                    "AND",["item","anyof",itemIds],"AND",["location","anyof",loc]],
            columns: [itemCol,binCol,binNameCol]
        });

        SWCUtils.getAllResults({
            searchObj,
            cb:function(result){
                var item = result.getValue(itemCol);
                var bin = result.getValue(binCol);
                if(!bin){
                    return;
                }
                var binName = result.getValue(binNameCol);
                itemBinInfo[item] = {bin,binName}
                if(cb){
                    cb({bin,binName});
                }
            }
        });
        return itemBinInfo;
    }

    /**
     * 获取出货单信息
     * @param options
     * @return {{info: {}}}
     */
    function getSOArrInfo(options){
        var data = {info:{}};
        var ids = options.ids;
        if(!SWCUtils.hasResults(ids)){
            return data;
        }

        //使用播种位作为标识
        var useDest = options.useDest;
        var destIdMapping = null;
        var idDestMapping = null;
        if(useDest){
            destIdMapping = data.destIdMapping = {};
            idDestMapping = data.idDestMapping = {};
        }

        //地址id 信息 ： {<addrId>:""}
        var addrInfo = {};
        //客户id
        var custIds = [];

        var filters = [];
        SWCUtils.addFilter(filters,["internalid","anyof",ids]);

        var searchObj = search.create({
            type: "customrecord_swc_so_fulfil",
            filters: filters,
            columns:["name","custrecord_swc_sf_createdfrom","custrecord_swc_sf_customer","custrecord_swc_sf_poarrival",{name:"altname",join:"custrecord_swc_sf_customer"},"custrecord_swc_sf_cusaddr"]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result,index){
                var id = result.id;
                var soId = result.getValue({name:"custrecord_swc_sf_createdfrom"});
                var key = soId+"_"+id;
                if(useDest){
                    //获取播种位
                    key = numToDest(index);
                    idDestMapping[id] = key;
                    destIdMapping[key] = id;
                }

                var addrId = result.getValue({name:"custrecord_swc_sf_cusaddr"});
                var custId = result.getValue({name:"custrecord_swc_sf_customer"})  //客户
                if(custId){
                    custIds.push(custId);
                }
                if(addrId){
                    addrInfo[addrId] = {};
                }

                data.info[key] = {
                    id:id,
                    soId:soId,
                    poArrId: result.getValue({name:"custrecord_swc_sf_poarrival"})||"",
                    num:result.getValue({name:"name"}),
                    name:result.getValue({name:"altname",join:"custrecord_swc_sf_customer"}),
                    addrId : addrId
                }

                //通过default 设置默认值
                util.extend(data.info[key],options.default)
            }
        })

        //根据客户和地址id获取地址信息
        getEntityAddressByAddrId({ids:custIds,addrInfo:addrInfo});
        util.each(data.info,function(destJson){
            var addrId = destJson.addrId;
            var addrJson = addrInfo[addrId];
            util.extend(destJson,addrJson);
        })
        return data;
    }






    ////////////////////////////////WMS查询///////////////////////////////////
    const ALPHABET = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
    function numToDest(num){
        var first = Math.floor(num/26);
        var second = num%26;
        return ALPHABET[first]+ALPHABET[second];
    }

    /**
     * 根据播种位计算下标
     * @param str
     * @return {number}
     */
    function destToNum(str){
        str = str.toUpperCase()
        var first = ALPHABET.indexOf(str[0]);
        var second =  ALPHABET.indexOf(str[1]);
        return first*26 + second;
    }


    /**
     * 根据数组生成播种位
     * startIndex : 开始下标，如2，标识从AC开始往后计算
     * @param options
     */
    function genDests(ary,startIndex,cb){
        var data = {};
        startIndex = startIndex||0;
        var destIdMapping = data.destIdMapping = {};
        var idDestMapping = data.idDestMapping = {};
        ary.forEach(function(val,index){
            //key 为计算得到的播种位
            var key = numToDest(Number(startIndex)+index);
            idDestMapping[val] = key;
            destIdMapping[key] = val;
            if(cb){
                cb(val,key);
            }
        });
        return data;
    }


    /**
     * 根据json字符串转为qty json {<itemid>:{q:10}}
     */
    function getQtyJson(str){
        if(!str){
            return;
        }
        var obj = JSON.parse(str);
        var data = {};
        for(var i in obj){
            data[i]={q:obj[i]};
        }
        return data;

    }


    /**
     * 根据字符串，拼接json
     * 输入字符串格式<itemid>:10,<itemid>:20
     * @param str
     */
    function getQtyJsonFromStr(str,simple){
        //如果最后一位不是}，表示数据量过大，没有全部获取到
        //则截取最后一个,号之前的数据，作为本次的库存信息
        if(str.charAt(str.length-1)!="}"){
            str = str.substring(0,str.lastIndexOf(",")) +"}";
        }
        eval("var obj="+str);
        if(simple){
            return obj;
        }
        var data = {};
        for(var i in obj){
            data[i]={q:obj[i]};
        }
        return data;
    }


    /**
     * 将如下字符串拆解为json (多个属性json化)
     * <itemid>:<qty>:<rate>,
     * {<itemid>:{q:10,ra:100}}>}
     */
    function getQtyJsonFromStrSplit(str,cb){
        var data = {};
        var strAry = str.split(",");
        strAry.forEach(function(itemStr){
            var itemStrAry = itemStr.split(":");
            var itemId = itemStrAry[0];
            var qty = Number(itemStrAry[1]||0);
            var rate = Number(itemStrAry[2]||0);
            data[itemId] = {q:qty,ra:rate};
            if(util.isFunction(cb)){
                cb(itemId,qty);
            }
        })
        return data;
    }


    /**
     * 采购到货汇总
     * @param options
     */
    function getPOArrivalsSummary(options){
        //<itemid>:{q:123}
        var data = {};
        var ids = options.ids;
        if(!SWCUtils.hasResults(ids)){
            return data;
        }

        var itemIds = options.itemIdsOut = options.itemIdsOut||[];
        var totalInfo =  options.totalInfo = options.totalInfo||{total:0}
        var filters = [["custrecord_swc_pa_fk.isinactive","is","F"],"and",["custrecord_swc_item","noneof","@NONE@"]];
        SWCUtils.addFilter(filters,["custrecord_swc_pa_fk","anyof",ids]);
        var itemCol = {
            name: "custrecord_swc_item",
            summary: "GROUP"
        };
        var qtyCol = {
            name: "custrecord_swc_currentqty",  //本次到货数量
            summary: "SUM"
        };
        var columns = [itemCol,qtyCol];

        var info = data;//data.purchaseorder = {};
        var searchObj = search.create({
            type: "customrecord_swc_item",
            filters:filters,
            columns: columns
        });
        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var item = result.getValue(itemCol);
                if(!item){
                    return;
                }
                var qty = result.getValue(qtyCol);
                //oq : original qty ,初始qty
                info[item] = {q:qty,oq:qty};
                totalInfo.total += Number(qty);
                addItemToAry(itemIds,item)
            }
        });
        return data;
    }

    /**
     * 获取到货单明细
     * @param options.ids
     * @param options.extraFilters
     * @param options.processCB
     *
     */
    function getPOArrivalsDetails(options){
        var data = options.data||{};
        var ids = options.ids;
        if(!SWCUtils.hasResults(ids)){
            return data;
        }

        //额外的过滤条件
        var extraFilters = options.extraFilters;

        //业务处理回调方法
        var processCB = options.processCB;

        var filters = [["custrecord_swc_pa_fk.isinactive","is","F"],"and",["custrecord_swc_currentqty","greaterthan",0]];
        SWCUtils.addFilter(filters,["custrecord_swc_pa_fk","anyof",ids]);
        SWCUtils.addFilter(filters,extraFilters);

        //采购订单
        var poCol = search.createColumn({
            name: "formulanumeric",
            summary: "GROUP",
            formula: "{custrecord_swc_pa_fk.custrecord_swc_po.id}"
        });

        //采购到货单
        var poArrCol = search.createColumn({
            name: "custrecord_swc_pa_fk",
            summary: "GROUP"
        });

        //父商品
        var itemCol = search.createColumn({
            name: "formulanumeric",
            summary: "GROUP",
            formula: "nvl({custrecord_swc_item.parent.id},{custrecord_swc_item.id})"
        });
        //子商品
        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "'{'||listagg('\"'||{custrecord_swc_item.id}||'\"'||':'||{custrecord_swc_currentqty},',')||'}'"
        });

        var info = data.purchaseorder = {};
        var itemsInfo =info.items;
        var columns = [];
        var searchObj = search.create({
            type: "customrecord_swc_item",
            filters:filters,
            columns: [poCol,poArrCol,itemCol,dataCol]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var poid = result.getValue(poCol);
                var poArrId = result.getValue(poArrCol);
                var items = getQtyJson(result.getValue(dataCol));
                //如果有扩展方法，则通过扩展方法进行处理，如果没有，则使用默认的处理方式
                if(util.isFunction(processCB)){
                    processCB({
                        poArrId :poArrId ,
                        poId:poid,
                        items:items
                    });

                }//else{
                    var key = poid+"_"+poArrId;
                    info[key] = info[key] ||{
                        items :{}
                    };
                    util.extend(info[key].items,items);
                // }

            }
        })

        return data;
    }

    /**
     * 根据外部id 查询内部id
     * @param options.recType
     * @param options.externalId
     */
    function getIdByExtId(options){
        var recType = options.recType;
        var externalId = options.externalId;
        if(!recType ||!externalId){
            return "";
        }
        var results = search.create({
            type:recType,
            filters:["externalid","anyof",externalId]
        }).run().getRange({start:0,end:1});
        return results && results[0] && results[0].id;
    }

    /**
     * 从sublist中提取item 批号信息
     * @param rec
     * @param useLineKey
     * @param sublistId
     * @param lineFld
     * @param invDetailFld
     * @param numFld
     * @return {{}}
     */
    function getItemsInfoFromSublist({rec,useLineKey,sublistId="item", lineFld="line",invDetailFld="inventorydetail",numFld="issueinventorynumber"}){
        //{<line>:{item:1037,q:10,nums:{A001:{q:5}}}}
        var itemsInfo = {}
        //解析sublist 数量
        var count = rec.getLineCount({sublistId:sublistId});
        for(var i=0;i<count;i++){
            var isNum = false;
            //对于assembly build ，只取itemsource 为 STOCK 行
            if(sublistId == "component"){
                var itemSource =  rec.getSublistValue({sublistId:sublistId,fieldId:"itemsource",line:i});
                if(itemSource != "STOCK"){
                    continue;
                }
                isNum = rec.getSublistValue({sublistId:sublistId,fieldId:"isnumbered",line:i})
            }
            var item = rec.getSublistValue({sublistId:sublistId,fieldId:"item",line:i});
            var line = rec.getSublistValue({sublistId:sublistId,fieldId:lineFld,line:i});
            var key = useLineKey?line:item;
            var qty = rec.getSublistValue({sublistId:sublistId,fieldId:"quantity",line:i});
            var itemJson = itemsInfo[key] = itemsInfo[key]||{item:item,q:qty,total:0};
            rec.selectLine({sublistId:sublistId,line:i});
            var subRec = rec.getCurrentSublistSubrecord({sublistId:sublistId,fieldId:invDetailFld});

            var subCount = subRec.getLineCount({sublistId:"inventoryassignment"})
            for(var j = 0;j<subCount;j++){
                var num = subRec.getSublistText({sublistId:"inventoryassignment",fieldId:numFld,line:j})
                if(!num){
                    continue;
                }
                var numQ = subRec.getSublistValue({sublistId:"inventoryassignment",fieldId:"quantity",line:j})
                itemJson.nums = itemJson.nums ||{};
                itemJson.nums[num] = {q:numQ,total:0};
            }
        }
        return itemsInfo;
    }

    /**
     * 创建工单
     * @param subsidiary
     * @param loc
     * @param item
     * @param bom
     * @param bomVersion
     * @param qty
     * @param fields
     * @return {number}
     */
    function processWorkOrder({subsidiary, loc, item, bom, bomVersion, qty, fields}) {
        var rec = record.create({
            type: "workorder",
            isDynamic: true
        });

        subsidiary && rec.setValue({fieldId: "subsidiary", value: subsidiary});
        rec.setValue({fieldId: "location", value: loc});
        //assembly item
        rec.setValue({fieldId: "assemblyitem", value: item});
        if (bom) {
            rec.setValue({fieldId: "billofmaterials", value: bom});
        }

        if (bomVersion) {
            rec.setValue({fieldId: "billofmaterialsrevision", value: bomVersion});
        }

        rec.setValue({fieldId: "quantity", value: qty})

        //辅助字段设置
        fields && fields.forEach(function (fldInfo) {
            rec.setValue(fldInfo);
        })
        var count = rec.getLineCount({sublistId: "item"});
        //log.audit({title: "count", details: count + "xx"});

        var id = rec.save({ignoreMandatoryFields: true})
        return id;
    }


    /**
     * 对processAB 的增强处理，因为NS原料明细存在精度问题，所以需要先将用料数量清0保存，之后再设置值
     * @param woId
     * @param abId
     * @param loc
     * @param buildItemInfo
     * @param actItems
     * @param bodyCB
     * @param abRec
     * @param fields
     * @param bin
     * @param rate
     */
    function processABV2({woId,abId,loc,buildItemInfo,actItems,bodyCB,abRec,fields,bin,rate}){
        //对actItems进行备份，以备用
        var actItems2 = JSON.parse(JSON.stringify(actItems));
        var buildItemInfo2 = JSON.parse(JSON.stringify(buildItemInfo));
        try{
            processAB({woId,abId,loc,buildItemInfo,actItems,bodyCB,abRec,fields,bin,rate})
        }catch (e) {
            if(e == "SWMS_AB_COMMIT_ERROR"){
                 abRec = null;
                 processAB({woId,abId,loc,buildItemInfo2,actItems:actItems2,bodyCB,abRec,fields,bin,rate})
            }else{
                throw e;
            }
        }
    }

    /**
     * 处理完工单
     * @param woId
     * @param abId
     * @param loc  工单loc
     * @param buildItemInfo 成品信息
     * @param actItems  原料信息
     * @param bodyCB
     * @param abRec
     * @param bin body item 完工的bin
     * @return {number|string|*|void}
     */
    function processAB({woId,abId,loc,buildItemInfo,actItems,bodyCB,abRec,fields,bin,rate}){
        var hasError = false;
        var errors = [];
        if(!abRec){
            if(abId){
                abRec = record.load({
                    type:"assemblybuild",
                    id:abId,
                    isDynamic:true
                })
            }else{
                abRec = record.transform({
                    fromType:"workorder",
                    fromId:woId,
                    toType:"assemblybuild",
                    isDynamic:true
                });
                //设置body信息
                var curLoc = abRec.getValue({fieldId:"location"});
                if(!curLoc){
                    abRec.setValue({fieldId:"location",value:loc});
                }
            }
        }

        if(!abId){
            //新建时，头部字段设置
            if(fields && fields.length){
                fields.forEach(function(fieldJson){
                    abRec.setValue(fieldJson)
                });
            }
        }

        if(buildItemInfo){
            abRec.setValue({fieldId:"quantity",value:buildItemInfo.q});
            //转成箱单位
            var rate = buildItemInfo.rate;
            if(rate){
                //生产箱数
                abRec.setValue({fieldId:Constants.WO_SUMMARY_FLDS.BODY_BOX_TOTAL,value:buildItemInfo.q/rate});
            }

            var bodySubRec = abRec.getSubrecord({fieldId:"inventorydetail"});
            //更新/添加批号
            adjSubRec({subRec:bodySubRec,itemJson:buildItemInfo,numFld:"receiptinventorynumber",totalFld:"q",frombin:bin})
        }

        //设置component信息
        var count = abRec.getLineCount({sublistId:"component"})
        for(var i=0;i<count;i++){
            var item = abRec.getSublistValue({sublistId:"component",fieldId:"item",line:i});
            var line = abRec.getSublistValue({sublistId:"component",fieldId:"linenumber",line:i});

            //跳过特定货品
            if(Constants.SKIP_ITEMS[item]){
                continue;
            }

            var qty = abRec.getSublistValue({sublistId:"component",fieldId:"quantity",line:i});
            var actItemJson = actItems[item];
            if(!actItemJson || !actItemJson.total ){
                abRec.selectLine({sublistId:"component",line:i})
                abRec.setCurrentSublistValue({sublistId: "component", fieldId: "quantity",value: "0"});
                abRec.commitLine({sublistId:"component"})
                continue;
            }
            var aq =  actItemJson.total ;
            // if( aq > 0) {
                abRec.selectLine({sublistId:"component",line:i})
                abRec.setCurrentSublistValue({sublistId: "component", fieldId: "quantity",value: aq});

                //设置inventory detail
                var subRec = abRec.getCurrentSublistSubrecord({sublistId:"component",fieldId:"componentinventorydetail"});
                try{
                    //log.audit({title:"item:"+item,details:actItemJson})
                    adjSubRec({subRec,itemJson:actItemJson/*,actItems,item:line,totalFld:"total"*/});
                    abRec.commitLine({sublistId:"component"})
                    delete actItems[item];
                }catch(e){
                    hasError = true;
                    log.error({title:"commit error:item:"+item,details:e})
                    log.audit({title:"item:"+item,details:actItemJson})
                    abRec.selectLine({sublistId:"component",line:i})
                    abRec.removeCurrentSublistSubrecord({sublistId:"component",fieldId:"componentinventorydetail"})
                    abRec.setCurrentSublistValue({sublistId: "component", fieldId: "quantity",value:  "0"});
                    abRec.commitLine({sublistId:"component"})
                    delete actItems[item];
                }

            // }
        }

        if(bodyCB){
            bodyCB(abRec)
        }

        var fulfillId = abRec.save({ignoreMandatoryFields:true});

        if(hasError){
            throw "SWMS_AB_COMMIT_ERROR";
        }
        return fulfillId;
    }

    /**
     * 处理发料单
     * @param woId
     * @param wiId
     * @param loc
     * @param actItems
     * @param bodyCB
     * @param wiRec
     * @param fields
     * @param bin
     * @param rate
     * @return {number|string|*|void}
     */
    function processWOIssue({woId,wiId,loc,actItems,bodyCB,wiRec,fields,startoperation,endoperation,operationIsTxt}){
        var hasError = false;
        var errors = [];
        if(!wiRec){
            if(wiId){
                wiRec = record.load({
                    type:"workorderissue",
                    id:wiId,
                    isDynamic:true
                })
            }else{
                wiRec = record.transform({
                    fromType:"workorder",
                    fromId:woId,
                    toType:"workorderissue",
                    isDynamic:true
                });
                //设置body信息
                var curLoc = wiRec.getValue({fieldId:"location"});
                if(!curLoc){
                    wiRec.setValue({fieldId:"location",value:loc});
                }
            }
        }

        if(!wiId){
            //新建时，头部字段设置
            if(fields && fields.length){
                fields.forEach(function(fieldJson){
                    wiRec.setValue(fieldJson)
                });
            }
        }

        //开始工序
        if(startoperation){
            if(operationIsTxt){
                wiRec.setText({fieldId:"startoperation",text:startoperation});
            }else{
                wiRec.setValue({fieldId:"startoperation",value:startoperation});
            }
        }

        //结束工序
        if(endoperation){
            if(operationIsTxt){
                wiRec.setText({fieldId:"endoperation",text:endoperation});
            }else{
                wiRec.setValue({fieldId:"endoperation",value:endoperation});
            }
        }

        processComponentSublist({rec:wiRec,actItems});

        var count = wiRec.getLineCount({sublistId:"component"})
        //如果明细行为空，则删除
        /*if(count <= 0){
            if(wiId){
                record.delete({type:"workorderissue",id:wiId});
            }else{
                return;
            }
        }*/
        if(bodyCB){
            bodyCB(wiRec)
        }

        var fulfillId = wiRec.save({ignoreMandatoryFields:true});

        if(hasError){
            throw "SWMS_AB_COMMIT_ERROR";
        }
        return fulfillId;
    }

    /**
     * 处理components子列表,例如AB，WI（work order issue）,WC（work order completion）
     */
    function processComponentSublist({rec,actItems}){
        var hasError = false;
        //设置component信息
        var count = rec.getLineCount({sublistId:"component"})
        for(var i=0;i<count;i++){
            var item = rec.getSublistValue({sublistId:"component",fieldId:"item",line:i});
            var line = rec.getSublistValue({sublistId:"component",fieldId:"linenumber",line:i});

            //跳过特定货品
            if(Constants.SKIP_ITEMS[item]){
                continue;
            }

            var qty = rec.getSublistValue({sublistId:"component",fieldId:"quantity",line:i});
            var actItemJson = actItems[item];
            if(!actItemJson || !actItemJson.total ){
                rec.selectLine({sublistId:"component",line:i})
                rec.setCurrentSublistValue({sublistId: "component", fieldId: "quantity",value: "0"});
                //添加此行，解决work order issue单中，数量设置为0，commit line报错的问题
                rec.removeCurrentSublistSubrecord({sublistId: "component", fieldId: "componentinventorydetail"});
                rec.commitLine({sublistId:"component"})
                continue;
            }
            var aq =  actItemJson.total ;
            // if( aq > 0) {
            rec.selectLine({sublistId:"component",line:i})
            rec.setCurrentSublistValue({sublistId: "component", fieldId: "quantity",value: aq});

            //设置inventory detail
            var subRec = rec.getCurrentSublistSubrecord({sublistId:"component",fieldId:"componentinventorydetail"});
            try{
                //log.audit({title:"item:"+item,details:actItemJson})
                adjSubRec({subRec,itemJson:actItemJson/*,actItems,item:line,totalFld:"total"*/});
                rec.commitLine({sublistId:"component"})
                delete actItems[item];
            }catch(e){
                hasError = true;
                log.error({title:"commit error:item:"+item,details:e})
                log.audit({title:"item:"+item,details:actItemJson})
                rec.selectLine({sublistId:"component",line:i})
                rec.removeCurrentSublistSubrecord({sublistId:"component",fieldId:"componentinventorydetail"})
                rec.setCurrentSublistValue({sublistId: "component", fieldId: "quantity",value:  "0"});
                rec.commitLine({sublistId:"component"})
                delete actItems[item];
            }

            // }
        }
    }


    /**
     * 一键收货
     * 根据原单据生成IR，并将status 设置为GOOD
     */
    function receiveTrans({fromType,fromId,loc,useBins}){
        var irRec = record.transform({fromType,fromId,toType:"itemreceipt",isDynamic:true});
        //遍历设值
        var count = irRec.getLineCount({sublistId:"item"});
        if(count <=0){
            throw "无可接收的货品行，请检查货品信息";
        }

        var sublistId = "item";
        for(var line=0;line<count;line++){
            irRec.selectLine({sublistId,line});
            irRec.setCurrentSublistValue({sublistId,fieldId:"itemreceive",value:true});
            var subRec = irRec.getCurrentSublistSubrecord({sublistId,fieldId:"inventorydetail"});
            var lineCount = subRec.getLineCount({sublistId:"inventoryassignment"});
            for(var j =0;j<lineCount;j++){
                subRec.selectLine({sublistId:"inventoryassignment",line:j});
                subRec.setCurrentSublistValue({sublistId:"inventoryassignment",fieldId:"inventorystatus",value:Constants.INV_STATUS_MAP.GOOD});
                if(useBins){
                    subRec.setCurrentSublistText({sublistId:"inventoryassignment",fieldId:"binnumber",text:"000000"});
                }
                subRec.commitLine({sublistId:"inventoryassignment"})
            }
            irRec.commitLine({sublistId});
        }
        if(count>0){
            irRec.save({ignoreMandatoryFields:true});
        }
    }

    /**
     * 检查TO是否可以执行入库操作
     * 状态=待入库 AND 目标仓库无储位
     */
    function checkCanReceiveTO({toId}) {
        var locFilters = [["tolocation.usesbins","is","F"]];
        if(Constants.ONEKEY_REC_LOCS_WITH_BINS.length){
            locFilters.push("or",["transferlocation","anyof",Constants.ONEKEY_REC_LOCS_WITH_BINS]);
        }
        var useBinCol = {name:"usesbins",join:"tolocation"};
        //pendig receipt 或 pending receipt/partially fulfilled
        var filters = [["status","anyof","TrnfrOrd:E","TrnfrOrd:F"],
            "AND", ["mainline","is","T"],"AND",locFilters,"AND",["internalid","is",toId]];

        var searchObj = search.create({
            type: "transferorder",
            filters:filters,
            columns:["transferlocation",useBinCol]
        });
        var data = {};
        var results = searchObj.run().getRange({start:0,end:1});
        if(SWCUtils.hasResults(results)){
            var result = results[0];
            data.count = 1;
            data.loc = result.getValue({name:"transferlocation"});
            data.useBins = result.getValue(useBinCol);
        }
        return data;
    }

    /**
     * 检查TO、SO是否可以执行出库操作
     * 状态=待出库 AND 仓库无储位
     */
    function checkCanFulfill({tranId}) {
        //pendig fulfillment
        var filters = [["status","anyof","SalesOrd:B","TrnfrOrd:B"],
            "AND", ["mainline","is","T"],"AND",["location.usesbins","is","F"],"AND",["internalid","is",tranId]];
        var searchObj = search.create({
            type: "transaction",
            filters:filters
        });
        var count = searchObj.runPaged().count;

        return count>0;
    }

    /**
     * 从transitems json中扣除已经处理的部分
     * 例如，对于IR，A货品已收货10，transitems中A货品15，则扣减之后，transitems中A货品为5
     * @param transItems
     * @param tranType
     * @param subTypes 具体的类型数组，比如["BinTrnfr","InvTrnfr"]
     * @param extIdPrfix
     * @param negativeItemCount为true，则对于IT/BT， 取item count为负数的行
     * @param useLineKey 如果为true，则itemInfo 使用 line作为key，否则使用item或item_ut作为key
     */
    function deductTransItems({groupByWO,minDate,notUseBin,transItems,tranType,subTypes,negativeItemCount,extraFilters,totalFld="total",useItemUnit,useLineKey,deductCB,useCreatedFromFld,errorMsg=true}){
        //{<item>:{total,aTotal,diff,nums:{<num>:{total,aTotal,bins:{<bin>:{q,aq,diff}}}}}}
        var errorInfo = {};
        //根据条件，查询已处理货品明细
        var itemCol = {name: "item",summary: "GROUP"};
        var unitCol = {name: "unit",summary: "GROUP"};
        var qtyCol = {name: "quantity",summary: "SUM",functionName:"absoluteValue"};
        var qtyUomCol = {name: "quantityuom",summary: "SUM",functionName:"absoluteValue"};
        var numCol = {name: "inventorynumber",join: "inventoryDetail", summary: "GROUP"};
        // var numCol = {name: "formulatext",formula:"nvl({inventorydetail.inventorynumber},'')", summary: "GROUP"};
        var binCol = {name: "binnumber",join: "inventoryDetail", summary: "GROUP"};
        var invQtyCol = {name: "quantity",join: "inventoryDetail", summary: "GROUP"};
        var invQtyUomCol = { name: "formulanumeric",summary: "SUM",
            formula: "{inventorydetail.quantity}*{quantityuom}/nullif({quantity},0)"};
        var lineCol =  {name: "line",join:"appliedtotransaction",summary: "GROUP"};
        var columns = [itemCol,unitCol, qtyCol,qtyUomCol,numCol, binCol, invQtyCol,invQtyUomCol];
        // if(useLineKey){
            columns.push(lineCol)
        // }

        //获取最早的trandate
        var tranDateCol = {name:"trandate",summary:"min"};
        if(minDate){
            columns.push(tranDateCol);
        }

        //使用createdfrom 字段
        var createdFromCol = null;
        if(useCreatedFromFld){
            createdFromCol = {name: "createdfrom",summary: "GROUP"};
            columns.push(createdFromCol);
        }
        //@@
        var createdFromWOCol = null;
        if(groupByWO){
            createdFromWOCol = {name: "specialorder",join:"appliedToTransaction",summary: "GROUP"};
            columns.push(createdFromWOCol);
        }

        var filters = [["taxline","is","F"], "AND",["cogs","is","F"],"AND",["shipping","is","F"]];
        if(tranType == "itemreceipt"){
            var irFilters =  [["mainline","is","F"],"AND",["transactionlinetype","anyof","@NONE@"]]
            SWCUtils.addFilter(filters,irFilters);
        }else if(tranType == "bintransfer"||tranType == "inventorytransfer"){
            var itFilters =  [["mainline","is","F"],"AND", ["inventorydetail.itemcount",negativeItemCount?"lessthan":"greaterthan","0"]]
            SWCUtils.addFilter(filters,itFilters);
        }else if(tranType == "itemfulfillment"){
            var ifFilters = [["shipping","is","F"], "AND", ["taxline","is","F"], "AND", ["cogs","is","F"]]
            SWCUtils.addFilter(filters,ifFilters);
        }else if(tranType == "transaction"){
            var itFilters =  [["type","anyof",subTypes],"and",["mainline","is","F"],"AND", ["inventorydetail.itemcount",negativeItemCount?"lessthan":"greaterthan","0"]]
            SWCUtils.addFilter(filters,itFilters);
        }

        if(extraFilters){
            SWCUtils.addFilter(filters,extraFilters);
        }

        var searchObj = search.create({
            type:tranType,
            filters,
            columns
        });
        var tranDate = null;
        var x  = SWCUtils.getAllResults({
            searchObj,
            cb:function(result){
                var item = result.getValue(itemCol);
                var itemName = result.getText(itemCol);
                var qty = result.getValue(qtyUomCol);
                var ut = result.getValue(unitCol);
                var itemKey = useItemUnit?item+"_"+ut:item;
                var line =  result.getValue(lineCol);

                var num = result.getValue(numCol);
                if(num){
                    num = result.getText(numCol);
                }
                var bin = result.getValue(binCol);
                var binNum = result.getText(binCol);
                var numQty = result.getValue(invQtyUomCol);

                var createdFrom = "";
                if(useCreatedFromFld){
                    createdFrom = result.getValue(createdFromCol);
                }
                if(minDate && !tranDate){
                    tranDate = result.getValue(tranDateCol);
                }

                //@@
                if(useLineKey){
                    itemKey = line;
                }else if(groupByWO){
                    var wo = result.getValue(createdFromWOCol);
                    if(wo){
                        itemKey += "$"+ createdFrom +"_"+ line;
                    }
                }

                if(deductCB){
                    deductCB({item,line,itemKey,qty,num,bin,numQty,ut,createdFrom,errorInfo,itemName,binNum});
                }else{
                    var itemJson = transItems[itemKey];
                    //log.audit({title:"x",details:{item,itemKey,itemJson,qty,num,bin,numQty,errorInfo,itemName,binNum}})
                    if(!itemJson){
                        //recordErrorInfo({itemKey,item,num,q:0,aq:numQty||qty,errorInfo,itemName});
                        return;
                    }

                    deductTransItem({notUseBin,totalFld,transItems,item,itemKey,itemJson,qty,num,bin,numQty,errorInfo,itemName,binNum});
                }
            }
        });

        if (errorMsg) {
            var msg = getErrorMsg({errorInfo});
            if(msg){
                throw msg;
            }
        }

        tranDate = tranDate?format.parse({value:tranDate,type:"date"}) :null;
        return {errorInfo,msg, tranDate};
    }

    function getErrorMsg({errorInfo,ITEMS_INFO}){
        //<itemName>:<num>:<bin> 差异数量：
        var ary = [];
        util.each(errorInfo,function(itemJson,itemKey){
            var itemName = itemJson.itemName || ITEMS_INFO[itemJson.item]?.s||"";
            var nums = itemJson.nums;
            if(nums){
                util.each(nums,function(numJson,num){
                    var bins = numJson.bins;
                    if(bins){
                        util.each(bins,function(binJson,bin){
                            ary.push(`${itemName} : ${num} : ${binJson.binNum} 差异 ${binJson.df}`);
                        })
                    }else{
                        ary.push(`${itemName} : ${num} 差异 ${numJson.df}`);
                    }
                })
            }else{
                ary.push(`${itemName} 差异 ${itemJson.df}`);
            }

        });
        return ary.join("\n");
    }

    /**
     * 记录异常信息 （当前JSON数量q 小于 单据数量aq）
     * @param itemKey
     * @param item
     * @param num
     * @param bin
     * @param q 本次数量
     * @param aq 单据数量
     * @param errorInfo
     */
    function recordErrorInfo({itemKey,item,num,bin,q,aq,errorInfo,itemName,binNum}){
        q = Number(q);
        aq = Number(aq);
       var itemJson = errorInfo[itemKey] = errorInfo[itemKey] ||{item,q:0,aq:0,df:0,itemName};
       if(num){
            var nums = itemJson.nums = itemJson.nums||{};
            var numJson = nums[num] = nums[num]||{q:0,aq:0,df:0};
            if(bin){
                var bins = numJson.bins = numJson.bins||{};
                bins[bin]= {binNum,q,aq,df:sRound(aq-q)};
            }
           numJson.q = sRound(numJson.q + q);
           numJson.aq = sRound(numJson.aq + aq);
           numJson.df = sRound(numJson.aq - numJson.q);
       }else {
            if(bin){
                var bins = itemJson.bins = itemJson.bins||{};
                bins[bin]=  {binNum,q,aq,df:sRound(aq-q)};
            }
       }

        itemJson.q = sRound(itemJson.q + q);
        itemJson.aq = sRound(itemJson.aq + aq);
        itemJson.df = sRound(itemJson.aq - itemJson.q);
    }

    /**
     * 扣减单个item
     * @param itemJson
     */
    function deductTransItem({notUseBin,totalFld="total",transItems,item,itemKey,itemJson,qty,num,bin,numQty,errorInfo,itemName,binNum}){
        var q = numQty||qty;
        if(num){

            var numJson = itemJson.nums[num];

            if(!numJson){

                recordErrorInfo({itemKey,item,num,q:0,aq:q,errorInfo,itemName});
                return;
            }
            if(!notUseBin && bin){
                var binJson = numJson.bins?.[bin]||{q:0};
                var origBinQ = binJson.q;
                binJson && (binJson.q = sRound(binJson.q - q));
                // log.audit({title:"bin",details:{itemKey,item,num,bin,q:origBinQ,aq:q}})
                if(binJson.q<=0){
                    if(binJson.q<0){

                        recordErrorInfo({itemKey,item,num,bin,q:origBinQ,aq:q,errorInfo,itemName,binNum});
                    }
                    numJson.bins && (delete numJson.bins[bin]);
                }
            }
            var origNumQ = numJson[totalFld]||0;
            numJson[totalFld] = sRound(numJson[totalFld] - q);
            if(numJson[totalFld] <=0){
                if(!bin && numJson[totalFld]<0){
                    recordErrorInfo({itemKey,item,num,q:origNumQ,aq:q,errorInfo,itemName,binNum});
                }
                delete itemJson.nums[num];
            }
        }else{
            if(!notUseBin && bin){
                var binJson = itemJson.bins?.[bin]||{q:0};
                var origBinQ = binJson?.q||0;
                binJson && (binJson.q = sRound(binJson.q - q));
                if(binJson.q<=0){
                    if(binJson.q<0){
                        recordErrorInfo({itemKey,item,num,bin,q:origBinQ,aq:q,errorInfo,itemName,binNum});
                    }
                    itemJson.bins &&(delete itemJson.bins[bin]);
                }
            }
        }
        var origItemQ = itemJson[totalFld]||0;
        itemJson[totalFld] = sRound(itemJson[totalFld] - q);
        if(itemJson[totalFld]<=0){
            if(!bin && !num && itemJson[totalFld]<0){
                recordErrorInfo({itemKey,item,q:origItemQ,aq:q,errorInfo,itemName,binNum});
            }
            // delete transItems[itemKey];
        }
    }

    /**
     * 获取客户退货汇总
     * @param options
     */
    function getCustRetSummary(options){
        //<itemid>:{q:123}
        var data = {};
        var ids = options.ids;

        if(!SWCUtils.hasResults(ids)){
            return data;
        }
        var itemIds = options.itemIdsOut = options.itemIdsOut||[];
        var totalInfo =  options.totalInfo = options.totalInfo||{total:0}
        var filters = [["mainline","is","F"], "AND",["taxline","is","F"],"AND",["shipping","is","F"],"AND",["cogs","is","F"]];
        SWCUtils.addFilter(filters,["internalid","anyof",ids]);
        var itemCol = {
            name: "item",
            summary: "GROUP"
        };
        var qtyCol = {
            name: "quantity",
            summary: "SUM",
            function:"absoluteValue"
        };
        var columns = [itemCol,qtyCol];
        var info = data;//data.returnauthorization = {};
        var searchObj = search.create({
            type: "returnauthorization",
            filters:filters,
            columns: columns
        });
        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var item = result.getValue(itemCol);
                info[item] = {q:result.getValue(qtyCol),oq:result.getValue(qtyCol)};
                totalInfo.total += Number(result.getValue(qtyCol));
                addItemToAry(itemIds,item)
            }
        });

        log.audit({title:"returnauthorization",details:data})
        return data;

    }

    /**
     * 获取客户退货明细
     * @param options
     */
    function getCustRetDetails(options){
        var data = options.data||{};
        var ids = options.ids;
        if(!SWCUtils.hasResults(ids)){
            return data;
        }

        //业务处理回调方法
        var processCB = options.processCB;

        var filters =  [["mainline","is","F"], "AND",["taxline","is","F"],"AND",["shipping","is","F"],"AND",["cogs","is","F"]];
        SWCUtils.addFilter(filters,["internalid","anyof",ids]);
        //采购订单
        var poCol = search.createColumn({
            name: "internalid",
            summary: "GROUP"
        });
        //父商品
        var itemCol = search.createColumn({
            name: "formulanumeric",
            summary: "GROUP",
            formula: "nvl({item.parent.id},{item.id})"
        });
        //子商品
        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "'{'||listagg('\"'||{item.id}||'\"'||':'||abs({quantity}),',')||'}'"
        });

        var info = data.returnauthorization = {};
        var columns = [];
        var searchObj = search.create({
            type: "returnauthorization",
            filters:filters,
            columns: [poCol,itemCol,dataCol]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var poid = result.getValue(poCol);
                var items = getQtyJson(result.getValue(dataCol))
                if(util.isFunction(processCB)){
                    processCB({
                        retId:poid,
                        items:items
                    });
                }//else{
                    info[poid] =info[poid] || {
                        items :{}
                    };
                    util.extend(info[poid].items,items)
                // }
            }
        })
        return data;
    }




    /**
     * 获取调拨出库汇总
     * @param options
     */
    function getTOFulfillSummary(options){
        //<itemid>:{q:123}
        var data = {};
        var ids = options.ids;
        if(!SWCUtils.hasResults(ids)){
            return data;
        }
        var itemIds = options.itemIdsOut = options.itemIdsOut||[];
        var totalInfo =  options.totalInfo = options.totalInfo||{total:0}
        var filters = [["mainline","is","F"], "AND",["taxline","is","F"],"AND",["shipping","is","F"],"AND",["cogs","is","F"],
            "AND",["applyingtransaction.type","anyof","ItemShip"]];
        SWCUtils.addFilter(filters,["applyingTransaction","anyof",ids]);
        var itemCol = {
            name: "item",
            summary: "GROUP"
        };
        var qtyCol = {
            name: "quantity",
            join: "applyingTransaction",
            summary: "SUM"
        };
        var columns = [itemCol,qtyCol];
        var info = data;//data.transferorder = {};
        var searchObj = search.create({
            type: "transferorder",
            filters:filters,
            columns: columns
        });
        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var item = result.getValue(itemCol);
                info[item] = {q:result.getValue(qtyCol),oq:result.getValue(qtyCol)};
                totalInfo.total += Number(result.getValue(qtyCol));
                addItemToAry(itemIds,item);
            }
        });
        return data;

    }

    /**
     * 添加元素到数组
     * @param itemIds
     * @param item
     */
    function addItemToAry(itemIds,item){
        if(itemIds && !~itemIds.indexOf(item)){
            itemIds.push(item);
        }
    }

    /**
     * 获取调拨出库明细
     * @param options
     */
    function getTOFulfillDetails(options){
        var data = options.data||{};
        var ids = options.ids;
        if(!SWCUtils.hasResults(ids)){
            return data;
        }

        var filters = [["mainline","is","F"], "AND",["taxline","is","F"],"AND",["shipping","is","F"],"AND",["cogs","is","F"],
            "AND",["applyingtransaction.type","anyof","ItemShip"]];
        SWCUtils.addFilter(filters,["applyingTransaction","anyof",ids]);
        //采购订单
        var toCol = search.createColumn({
            name: "internalid",
            summary: "GROUP"
        });
        //出库单
        var fulfillCol = search.createColumn({
            name: "applyingtransaction",
            summary: "GROUP"
        });
        //父商品
        var itemCol = search.createColumn({
            name: "formulanumeric",
            summary: "GROUP",
            formula: "nvl({item.parent.id},{item.id})"
        });
        //子商品
        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "'{'||listagg('\"'||{item.id}||'\"'||':'||abs({applyingtransaction.quantity}),',')||'}'"
        });

        var info = data.transferorder = {};
        var searchObj = search.create({
            type: "transferorder",
            filters:filters,
            columns: [toCol,fulfillCol,itemCol,dataCol]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var toid = result.getValue(toCol);
                var fulfillId = result.getValue(fulfillCol);
                var key = toid+"_"+fulfillId;
                //对于调拨出库，同一个to的每个出库，对应一次入库记录
                info[key] = info[key] ||{
                    items :{}
                };
                util.extend(info[key].items,getQtyJson(result.getValue(dataCol)))
            }
        })

        return data;
    }


    /**
     * 根据出货汇总，生成相应shipSummary 和 shipSummaryByDest
     * 可以实现合并，比如出货单 和 调拨单仓库相同，则进行合并
     * @param result
     * @param destCol
     * @param itemCol
     * @param qtyCol
     * @param shipSummaryByDest
     * @param shipSummary
     */
    function shipSummaryCB(result,destCol,itemCol,qtyCol,shipSummaryByDest,shipSummary,itemIds){
        var dest = result.getValue(destCol);
        var item = result.getValue(itemCol);
        if(itemIds && !~itemIds.indexOf(item)){
            itemIds.push(item);
        }
        var destInfo = shipSummaryByDest[dest] = shipSummaryByDest[dest]||{};
        var qty = Number(result.getValue(qtyCol)||0);
        var destJson = destInfo[item] = destInfo[item] || {q:0};
        destJson.q += qty;
        if(shipSummary){
            var itemInfo = shipSummary[item] = shipSummary[item]||{q:0,destInfo:{}};
            var itemDestJson = itemInfo.destInfo[dest] = itemInfo.destInfo[dest]|| {q:0};
            itemDestJson.q += qty;
            itemInfo.q = Number(itemInfo.q) + Number(qty);
        }
    }



    /**
     * 销售出货汇总
     * @param options
     */
    function getSOArrivalsSummary(options){
        var data = {};
        var ids = options.ids;
        //采购到货单ids
        var poArrivalsIds = options.poArrivalsIds;
        if(!SWCUtils.hasResults(ids) && !SWCUtils.hasResults(poArrivalsIds)){
            return data;
        }
        //shipSummaryByDest    <dest>:{<itemid>:{q:123}}
        var shipSummaryByDest = data.shipSummaryByDest= options.shipSummaryByDest||{};

        //shipSummary   <itemid>:{q:10,destInfo:{<dest>:{q:10}}}
        var shipSummary = data.shipSummary= options.shipSummary;

        var itemIds = options.itemIdsOut = options.itemIdsOut||[];

        var filters = [["custrecord_swc_sfd_fulfilrec.isinactive","is","F"]];
        if(SWCUtils.hasResults(ids)){
            SWCUtils.addFilter(filters,["custrecord_swc_sfd_fulfilrec","anyof",ids]);
        }
        if(SWCUtils.hasResults(poArrivalsIds)){
            SWCUtils.addFilter(filters,["custrecord_swc_sfd_fulfilrec.custrecord_swc_sf_poarrival","anyof",poArrivalsIds]);
        }

        var destCol = {
            name: "custrecord_swc_sf_location",  //接收门店
            join: "custrecord_swc_sfd_fulfilrec",
            summary: "GROUP"
        };

        var itemCol = {
            name: "custrecord_swc_sfd_item",
            summary: "GROUP"
        };
        var qtyCol = {
            name: "custrecord_swc_sfd_num",
            summary: "SUM"
        };

        var columns = [destCol,itemCol,qtyCol];
        // var info = data;//data.salesorder = {};

        var searchObj = search.create({
            type: "customrecord_swc_sofulfil_details",
            filters:filters,
            columns: columns
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                shipSummaryCB(result,destCol,itemCol,qtyCol,shipSummaryByDest,shipSummary,itemIds)
            }
        });
        return data;
    }


    /**
     * 销售出货汇总(根据transaction设置dest)
     * @param options
     */
    function getSOArrivalsSummaryByTran(options){
        var data = {};
        var ids = options.ids;
        //采购到货单ids
        var poArrivalsIds = options.poArrivalsIds;
        if(!SWCUtils.hasResults(ids) && !SWCUtils.hasResults(poArrivalsIds)){
            return data;
        }

        //shipSummaryByDest    <dest>:{<itemid>:{q:123}}
        var shipSummaryByDest = data.shipSummaryByDest= options.shipSummaryByDest||{};

        //shipSummary   <itemid>:{q:10,destInfo:{<dest>:{q:10}}}
        var shipSummary = data.shipSummary= options.shipSummary;

        var itemIds = options.itemIdsOut = options.itemIdsOut||[];

        var filters = [["custrecord_swc_sfd_fulfilrec.isinactive","is","F"],"and",["custrecord_swc_sfd_item","noneof","@NONE@"],
            "and",["custrecord_swc_sfd_num","greaterthan",0],
            "and",["custrecord_swc_sfd_fulfilrec.custrecord_swc_sf_status","anyof",Constants.SO_ARR_LOCK_APPROVED_STATUS]];

        if(SWCUtils.hasResults(ids)){
            SWCUtils.addFilter(filters,["custrecord_swc_sfd_fulfilrec","anyof",ids]);
        }
        if(SWCUtils.hasResults(poArrivalsIds)){
            SWCUtils.addFilter(filters,["custrecord_swc_sfd_fulfilrec.custrecord_swc_sf_poarrival","anyof",poArrivalsIds]);
        }

        //单据
        var tranCol = search.createColumn({
            name: "formulanumeric",
            summary: "GROUP",
            formula: "{custrecord_swc_sfd_fulfilrec.custrecord_swc_sf_createdfrom.id}"
        });

        //出货单据 （针对销售出货单情况）
        var soArrCol = search.createColumn({
            name: "custrecord_swc_sfd_fulfilrec",
            summary: "GROUP",
            // formula: "{custrecord_swcsad_so_arrival.custrecord_swcsa_so.id}"
        });

        //父商品
        var itemCol = search.createColumn({
            name: "formulanumeric",
            summary: "GROUP",
            formula: "nvl({custrecord_swc_sfd_item.parent.id},{custrecord_swc_sfd_item.id})"
        });
        //子商品
        /*var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "'{'||listagg('\"'||{custrecord_swc_sfd_item.id}||'\"'||':'|| {custrecord_swc_sfd_num},',')||'}'"
        });*/

        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "listagg({custrecord_swc_sfd_item.id}||':'|| {custrecord_swc_sfd_num}||':'||nvl({custrecord_swc_sfd_rate},0),',')"
        });

        var searchObj = search.create({
            type: "customrecord_swc_sofulfil_details",
            filters:filters,
            columns: [tranCol,soArrCol,itemCol,dataCol]
        });

        //出货单ID
        var soArrivalsIdsOut = options.soArrivalsIdsOut;
        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var tranid = result.getValue(tranCol);
                var soArrid = result.getValue(soArrCol);
                var dest = tranid+"_"+soArrid;
                // var dest = soArrid;
                if(soArrivalsIdsOut){
                    soArrivalsIdsOut.push(soArrid)
                }
                var destInfo = shipSummaryByDest[dest] = shipSummaryByDest[dest]||{};
                var itemJson = shipSummaryByTranCB(result,dataCol,dest,shipSummaryByDest,shipSummary,itemIds)
                util.extend(destInfo,itemJson);
            }
        })
        return data;
    }

    /**
     * 根据出货汇总，生成相应shipSummary 和 shipSummaryByDest
     * @param shipSummaryByDest
     * @param shipSummary
     */
    function shipSummaryByTranCB(result,dataCol,dest,shipSummaryByDest,shipSummary,itemIds){
        var itemJson = getQtyJsonFromStrSplit(result.getValue(dataCol),function(item,qty){
            if(item && itemIds && !~itemIds.indexOf(item)){
                itemIds.push(item);
            }
            // var destInfo = shipSummaryByDest[dest] = shipSummaryByDest[dest]||{};
            // var destJson = destInfo[item] = destInfo[item] || {q:0};
            // destJson.q += qty;
            if(shipSummary){
                var itemInfo = shipSummary[item] = shipSummary[item]||{q:0,destInfo:{}};
                var itemDestJson = itemInfo.destInfo[dest] = itemInfo.destInfo[dest]|| {q:0};
                itemDestJson.q += qty;
                itemInfo.q = Number(itemInfo.q) + Number(qty);
            }
        })
        return itemJson;
    }

    /**
     * 获取销售出库明细
     * @param options
     */
    function getSOArrivalsDetails(options){
        //<dest>:{<tranid>:{items:{<itemid>:{q:10}}}}
        var data = options.data||{};
        var ids = options.ids;
        //采购到货单ids
        var poArrivalsIds = options.poArrivalsIds;
        if(!SWCUtils.hasResults(ids) && !SWCUtils.hasResults(poArrivalsIds)){
            return data;
        }

        // var filters = [["custrecord_swc_sfd_fulfilrec.isinactive","is","F"],"and",["custrecord_swc_sfd_item","noneof","@NONE@"]];

        var filters = [["custrecord_swc_sfd_fulfilrec.isinactive","is","F"],"and",["custrecord_swc_sfd_item","noneof","@NONE@"],
            "and",["custrecord_swc_sfd_num","greaterthan",0],
            "and",["custrecord_swc_sfd_fulfilrec.custrecord_swc_sf_status","anyof",Constants.SO_ARR_LOCK_APPROVED_STATUS]];
        if(SWCUtils.hasResults(ids)){
            SWCUtils.addFilter(filters,["custrecord_swc_sfd_fulfilrec","anyof",ids]);
        }
        if(SWCUtils.hasResults(poArrivalsIds)){
            SWCUtils.addFilter(filters,["custrecord_swc_sfd_fulfilrec.custrecord_swc_sf_poarrival","anyof",poArrivalsIds]);
        }

        //目的地
        var destCol = search.createColumn({
            name: "formulanumeric",
            summary: "GROUP",
            formula: "{custrecord_swc_sfd_fulfilrec.custrecord_swc_sf_location.id}" //接收门店
        });
        //单据
        var tranCol = search.createColumn({
            name: "formulanumeric",
            summary: "GROUP",
            formula: "{custrecord_swc_sfd_fulfilrec.custrecord_swc_sf_createdfrom.id}"
        });

        //出货单据 （针对销售出货单情况）
        var soArrCol = search.createColumn({
            name: "custrecord_swc_sfd_fulfilrec",
            summary: "GROUP",
            // formula: "{custrecord_swcsad_so_arrival.custrecord_swcsa_so.id}"
        });

        //父商品
        var itemCol = search.createColumn({
            name: "formulanumeric",
            summary: "GROUP",
            formula: "nvl({custrecord_swc_sfd_item.parent.id},{custrecord_swc_sfd_item.id})"
        });
        //子商品
        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "'{'||listagg('\"'||{custrecord_swc_sfd_item.id}||'\"'||':'|| {custrecord_swc_sfd_num},',')||'}'"
        });

        var info = data.salesorder = {};

        var searchObj = search.create({
            type: "customrecord_swc_sofulfil_details",
            filters:filters,
            columns: [destCol,tranCol,soArrCol,itemCol,dataCol]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var dest = result.getValue(destCol);
                var tranid = result.getValue(tranCol);
                var soArrid = result.getValue(soArrCol);
                var destInfo = info[dest] = info[dest]||{};
                var tranInfo = destInfo[tranid+"_"+soArrid] =  destInfo[tranid+"_"+soArrid]||{};
                tranInfo.items = getQtyJson(result.getValue(dataCol));
            }
        })

        return data;
    }


    /**
     * 供应商退货汇总
     * @param options
     */
    function getVendRetSummary(options){
        //<dest>:{<itemid>:{q:123}}
        var data = {};
        var ids = options.ids;
        if(!SWCUtils.hasResults(ids)){
            return data;
        }

        //shipSummaryByDest    <dest>:{<itemid>:{q:123}}
        var shipSummaryByDest = data.shipSummaryByDest= options.shipSummaryByDest||{};

        //shipSummary   <itemid>:{q:10,destInfo:{<dest>:{q:10}}}
        var shipSummary = data.shipSummary= options.shipSummary;

        var itemIds = options.itemIdsOut = options.itemIdsOut||[];

        var filters = [["mainline","is","F"],"AND",["taxline","is","F"],"AND",["shipping","is","F"],"AND",["cogs","is","F"]];
        SWCUtils.addFilter(filters,["internalid","anyof",ids]);
        var destCol = {
            name: "entity",
            summary: "GROUP"
        };

        var itemCol = {
            name: "item",
            summary: "GROUP"
        };
        var qtyCol = {
            name: "quantity",
            summary: "SUM",
            function: "absoluteValue"
        };

        var columns = [destCol,itemCol,qtyCol];
        // var info = data;//data.vendorreturnauthorization = {};

        var searchObj = search.create({
            type: "vendorreturnauthorization",
            filters:filters,
            columns: columns
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                shipSummaryCB(result,destCol,itemCol,qtyCol,shipSummaryByDest,shipSummary,itemIds)
                // var dest = result.getValue(destCol);
                // var item = result.getValue(itemCol);
                // var destInfo = info[dest] = info[dest]||{};
                // destInfo[item] = {q:result.getValue(qtyCol)};
            }
        });
        return data;
    }


    /**
     * 获取供应商退货明细
     * @param options
     */
    function getVendRetDetails(options){
        //<dest>:{<tranid>:{items:{<itemid>:{q:10}}}}
        var data = options.data||{};
        var ids = options.ids;
        if(!SWCUtils.hasResults(ids)){
            return data;
        }

        var filters = [["item","noneof","@NONE@"],"AND",["mainline","is","F"],"AND",["taxline","is","F"],"AND",["shipping","is","F"],"AND",["cogs","is","F"]];
        SWCUtils.addFilter(filters,["internalid","anyof",ids]);
        //目的地
        var destCol = search.createColumn({
            name: "internalid",
            join: "vendor",
            summary: "GROUP"
        });
        //单据
        var tranCol = search.createColumn({
            name: "internalid",
            summary: "GROUP"
        });

        //父商品
        var itemCol = search.createColumn({
            name: "formulanumeric",
            summary: "GROUP",
            formula: "nvl({item.parent.id},{item.id})"
        });
        //子商品
        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "'{'||listagg('\"'||{item.id}||'\"'||':'||abs({quantity}),',')||'}'"
        });
        var info = data.vendorreturnauthorization = {};

        var searchObj = search.create({
            type: "vendorreturnauthorization",
            filters:filters,
            columns: [destCol,tranCol,itemCol,dataCol]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var dest = result.getValue(destCol);
                var tranid = result.getValue(tranCol);
                var destInfo = info[dest] = info[dest]||{};
                var tranInfo = destInfo[tranid] =  destInfo[tranid]||{};
                tranInfo.items = getQtyJson(result.getValue(dataCol));
            }
        })

        return data;
    }

    /**
     * 获取供应商退货明细
     * @param options
     */
    function getVendRetSummaryByTran(options){
        //<dest>:{<tranid>:{items:{<itemid>:{q:10}}}}
        var data = options.data||{};
        var ids = options.ids;
        if(!SWCUtils.hasResults(ids)){
            return data;
        }

        //shipSummaryByDest    <dest>:{<itemid>:{q:123}}
        var shipSummaryByDest = data.shipSummaryByDest= options.shipSummaryByDest||{};

        //shipSummary   <itemid>:{q:10,destInfo:{<dest>:{q:10}}}
        var shipSummary = data.shipSummary= options.shipSummary;
        var itemIds = options.itemIdsOut = options.itemIdsOut||[];

        var filters = [["item","noneof","@NONE@"],"AND",["mainline","is","F"],"AND",["taxline","is","F"],"AND",["shipping","is","F"],"AND",["cogs","is","F"]];
        SWCUtils.addFilter(filters,["internalid","anyof",ids]);
        //目的地
        // var destCol = search.createColumn({
        //     name: "internalid",
        //     join: "vendor",
        //     summary: "GROUP"
        // });
        //单据
        var tranCol = search.createColumn({
            name: "internalid",
            summary: "GROUP"
        });

        //父商品
        var itemCol = search.createColumn({
            name: "formulanumeric",
            summary: "GROUP",
            formula: "nvl({item.parent.id},{item.id})"
        });
        //子商品
        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "listagg({item.id}||':'||abs({quantity})||':'||0,',')"
        });
        // var info = data.vendorreturnauthorization = {};

        var searchObj = search.create({
            type: "vendorreturnauthorization",
            filters:filters,
            columns: [tranCol,itemCol,dataCol]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var dest = result.getValue(tranCol); //使用单据做dest
                var destInfo = shipSummaryByDest[dest] = shipSummaryByDest[dest]||{};
                var itemJson = shipSummaryByTranCB(result,dataCol,dest,shipSummaryByDest,shipSummary,itemIds)
                util.extend(destInfo,itemJson);
            }
        })
        log.audit({title:"itemids vendor return ",details:util.isArray(itemIds)+itemIds})

        return data;
    }



    /**
     * 调拨单汇总
     * @param options
     */
    function getTOSummary(options){
        //<dest>:{<itemid>:{q:123}}
        var data = {};
        var ids = options.ids;
        //采购到货单ids
        var poArrivalsIds = options.poArrivalsIds;
        if(!SWCUtils.hasResults(ids) && !SWCUtils.hasResults(poArrivalsIds)){
            return data;
        }

        //shipSummaryByDest    <dest>:{<itemid>:{q:123}}
        var shipSummaryByDest = data.shipSummaryByDest= options.shipSummaryByDest||{};

        //shipSummary   <itemid>:{q:10,destInfo:{<dest>:{q:10}}}
        var shipSummary = data.shipSummary= options.shipSummary;

        var itemIds = options.itemIdsOut = options.itemIdsOut||[];
        var filters = [["mainline","is","F"],"AND",["taxline","is","F"],"AND",["shipping","is","F"],"AND",["cogs","is","F"],
            "AND",["transactionlinetype","anyof","ITEM"],"and",["status","anyof","TrnfrOrd:B"]];

        if(SWCUtils.hasResults(ids)){
            SWCUtils.addFilter(filters,["internalid","anyof",ids]);
        }

        if(SWCUtils.hasResults(poArrivalsIds)){
            SWCUtils.addFilter(filters,["custbody_swc_relevance_porecord_to","anyof",poArrivalsIds]);
        }

        var destCol = {
            name: "transferlocation",
            summary: "GROUP"
        };

        //TODO 根据tranid 继续分组

        var itemCol = {
            name: "item",
            summary: "GROUP"
        };
        var qtyCol = {
            name: "quantity",
            summary: "SUM",
            function:"absoluteValue"
        };

        var columns = [destCol,itemCol,qtyCol];
        // var info = data;//data.transferorder = {};

        var searchObj = search.create({
            type: "transferorder",
            filters:filters,
            columns: columns
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                shipSummaryCB(result,destCol,itemCol,qtyCol,shipSummaryByDest,shipSummary,itemIds)
                // var dest = result.getValue(destCol);
                // var item = result.getValue(itemCol);
                // var destInfo = info[dest] = info[dest]||{};
                // destInfo[item] = {q:result.getValue(qtyCol)};
            }
        });
        return data;
    }

    /**
     * 获取调拨单明细
     * @param options
     */
    function getTODetails(options){
        //<dest>:{<tranid>:{items:{<itemid>:{q:10}}}}
        var data = options.data||{};
        var ids = options.ids;
        //采购到货单ids
        var poArrivalsIds = options.poArrivalsIds;
        if(!SWCUtils.hasResults(ids) && !SWCUtils.hasResults(poArrivalsIds)){
            return data;
        }


        var filters = [["mainline","is","F"],"AND",["taxline","is","F"],"AND",["shipping","is","F"],"AND",["cogs","is","F"],
            "AND",["transactionlinetype","anyof","ITEM"],"and",["status","anyof","TrnfrOrd:B"]];
        if(SWCUtils.hasResults(ids)){
            SWCUtils.addFilter(filters,["internalid","anyof",ids]);
        }

        if(SWCUtils.hasResults(poArrivalsIds)){
            SWCUtils.addFilter(filters,["custbody_swc_relevance_porecord_to","anyof",poArrivalsIds]);
        }
        //目的地
        var destCol = search.createColumn({
            name: "transferlocation",
            summary: "GROUP"
        });
        //单据
        var tranCol = search.createColumn({
            name: "internalid",
            summary: "GROUP"
        });

        //父商品
        var itemCol = search.createColumn({
            name: "formulanumeric",
            summary: "GROUP",
            formula: "nvl({item.parent.id},{item.id})"
        });
        //子商品
        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "'{'||listagg('\"'||{item.id}||'\"'||':'||abs({quantity}),',')||'}'"
        });

        var info = data.transferorder = {};

        var searchObj = search.create({
            type: "transferorder",
            filters:filters,
            columns: [destCol,tranCol,itemCol,dataCol]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var dest = result.getValue(destCol);
                var tranid = result.getValue(tranCol);
                var destInfo = info[dest] = info[dest]||{};
                var tranInfo = destInfo[tranid] =  destInfo[tranid]||{};
                tranInfo.items = getQtyJson(result.getValue(dataCol));
            }
        })

        return data;
    }


    /**
     * 获取调拨单明细(根据transaction作为dest)
     * @param options
     */
    function getTOSummaryByTran(options){
        //<dest>:{<tranid>:{items:{<itemid>:{q:10}}}}
        var data = options.data||{};
        var ids = options.ids;
        //采购到货单ids
        var poArrivalsIds = options.poArrivalsIds;
        if(!SWCUtils.hasResults(ids) && !SWCUtils.hasResults(poArrivalsIds)){
            return data;
        }
        //shipSummaryByDest    <dest>:{<itemid>:{q:123}}
        var shipSummaryByDest = data.shipSummaryByDest= options.shipSummaryByDest||{};

        //shipSummary   <itemid>:{q:10,destInfo:{<dest>:{q:10}}}
        var shipSummary = data.shipSummary= options.shipSummary;

        var itemIds = options.itemIdsOut = options.itemIdsOut||[];

        var filters = [["mainline","is","F"],"AND",["taxline","is","F"],"AND",["shipping","is","F"],"AND",["cogs","is","F"],
            "AND",["transactionlinetype","anyof","ITEM"],"and",["status","anyof","TrnfrOrd:B"]];
        if(SWCUtils.hasResults(ids)){
            SWCUtils.addFilter(filters,["internalid","anyof",ids]);
        }

        if(SWCUtils.hasResults(poArrivalsIds)){
            SWCUtils.addFilter(filters,["custbody_swc_relevance_porecord_to","anyof",poArrivalsIds]);
        }
        //目的地
        // var destCol = search.createColumn({
        //     name: "transferlocation",
        //     summary: "GROUP"
        // });
        //单据
        var tranCol = search.createColumn({
            name: "internalid",
            summary: "GROUP"
        });

        //父商品
        var itemCol = search.createColumn({
            name: "formulanumeric",
            summary: "GROUP",
            formula: "nvl({item.parent.id},{item.id})"
        });
        //子商品
        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "listagg({item.id}||':'||abs({quantity})||':'||0,',')"
        });

        // var info = data.transferorder = {};

        var searchObj = search.create({
            type: "transferorder",
            filters:filters,
            columns: [tranCol,itemCol,dataCol]
        });

        var toIdsOut = options.toIdsOut;
        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var dest = result.getValue(tranCol); //使用单据做dest
                if(toIdsOut){
                    toIdsOut.push(dest);
                }
                var destInfo = shipSummaryByDest[dest] = shipSummaryByDest[dest]||{};
                var itemJson = shipSummaryByTranCB(result,dataCol,dest,shipSummaryByDest,shipSummary,itemIds)
                util.extend(destInfo,itemJson);
            }
        })

        return data;
    }

    /**
     * 获取电商订单详细信息
     */
    function getECOrderDetails(options){
        var data = {};

        var extras = options.extras||{};

        var loc = options.loc;
        if(!loc){
            throw "请选择仓库";
        }
        // ["type", "anyof", "TrnfrOrd", "SalesOrd"]
        var filters = [["type", "anyof","SalesOrd","TrnfrOrd"],
            "AND",["custbody_swc_so_class","anyof",Constants.EC_ORDER_TYPES],
            "AND",["location","anyof",loc], //根据仓库筛选
            "AND", ["mainline", "is", "F"], "AND", ["taxline", "is", "F"], "AND", ["shipping", "is", "F"], "AND", ["cogs", "is", "F"],
            "AND", ["formulatext: case when {type.id}||''='SalesOrd' OR {transactionlinetype.id}||''='ITEM' then '1' end", "is", "1"],
            "AND", ["status", "anyof", "SalesOrd:B", "SalesOrd:D", "TrnfrOrd:B"],//SO:待发货,SO:部分发货，TO:待发货
            // "AND", ["sum(formulanumeric: nvl({quantitycommitted},0)-abs({quantity}))", "greaterthanorequalto", "0"]//可用库存
        ];

        //一次选取的订单数量
        var orderCount = options.orderCount||10;
        var ids = options.ids = options.ids||[];
        var srcSOIds = options.srcSOIds = options.srcSOIds||[];
        //如果手动选择了订单，则手选订单优先，否则根据单品/多品，以及订单数量进行查询
        if (SWCUtils.hasResults(ids)) {
            orderCount = ids.length;
            SWCUtils.addFilter(filters,["internalid","anyof",ids]);
        }else{
            var multi = options.multi; //多品
            if (multi) {
                //商品行数>1
                SWCUtils.addFilter(filters, ["count(item)", "greaterthan", "1"])
            } else {
                //商品行数=1
                SWCUtils.addFilter(filters, ["count(item)", "equalto", "1"])
            }

            SWCUtils.addFilter(filters, ["count(internalid)", "notgreaterthan",orderCount])
        }
        log.audit({title:"orderCount",details:orderCount})
        //下单时间从早到晚
        var dateCol = search.createColumn({
            name: "trandate",
            summary: "GROUP",
            sort:search.Sort.ASC
        });
        var idCol = search.createColumn({
            name: "internalid",
            summary: "GROUP"
        });
        var tranidCol = search.createColumn({
            name: "tranid",
            summary: "MAX"
        });
        var soIdCol = search.createColumn({
            name: "formulanumeric",
            summary: "MAX",
            formula: "case when {recordtype}='salesorder' then {internalid} else {custbody_swc_omni_so.id} end"
        });
        var toIdCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "case when {recordtype}='transferorder'  then {internalid} end"
        });
        /*var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "'{'||listagg({item.id}||':'||abs({quantity}),',')||'}'"
        });*/
        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "'{'||listagg({item.id}||':'||abs(nvl({custcol_swc_omni_fulfill_qty},{quantity})),',')||'}'"
        });

        var searchObj = search.create({
            type: "transaction",
            filters: filters,
            columns: [idCol, tranidCol,soIdCol, toIdCol,dataCol]
        });

        var results = searchObj.run().getRange({start:0,end:orderCount});
        if(SWCUtils.hasResults(results)){
            results.forEach(function (result) {
                var soId = result.getValue(soIdCol);
                var toId = result.getValue(toIdCol)||"";
                //记录来源订单ID
                srcSOIds.push(soId);
                var dataStr = result.getValue(dataCol);
                data[soId+"_"+toId] = getQtyJsonFromStr(dataStr);
                extras[soId+"_"+toId] = {tranid:result.getValue(tranidCol)}
            })
        }
       /* SWCUtils.getAllResults({
            searchObj: searchObj,
            cb: function (result) {
                var soId = result.getValue(soIdCol);
                ids.push(soId);
                var toId = result.getValue(toIdCol)||"";
                var dataStr = result.getValue(dataCol);
                data[soId+"_"+toId] = getQtyJsonFromStr(dataStr);
            }
        });*/

        return data;
    }

    /**
     * 获取库存信息
     * @param options
     */
    function getInvInfo(options){
        var data = {};
        var itemIds = options.itemIds;
        var loc = options.loc;
        if(!SWCUtils.hasResults(itemIds) ||!loc){
            return data;
        }
        var filters = [["binonhand.location","anyof",loc],"AND",
            ["internalid","anyof",itemIds],"AND",
            ["binonhand.quantityonhand","greaterthan","0"],"AND",
            ["formulatext: {binonhand.binnumber}","doesnotstartwith","000"], "and", //排除虚拟储位
            ["formulatext: {binonhand.binnumber}","doesnotstartwith","111"]
        ];
        var itemCol = search.createColumn({
            name: "internalid",
            summary: "GROUP"
        });
        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "'{'||listagg({binonhand.binnumber.id}||':'||nvl({binonhand.quantityavailable},0),',')  within group (order by {binonhand.quantityavailable} desc) ||'}'"
        });
        var totalCol = search.createColumn({
            name: "quantityavailable",
            join: "binOnHand",
            summary: "SUM"
        });


        var searchObj = search.create({
            type:"inventoryitem",
            filters:filters,
            columns:[itemCol,totalCol,dataCol]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb : function(result){
                var item = result.getValue(itemCol);
                var total = result.getValue(totalCol)||0;
                var dataStr = result.getValue(dataCol);
                data[item] = {
                    q:total, //总数量
                    bins:getQtyJsonFromStr(dataStr) //按储位细分
                };
            }
        });

        return data;
    }


    /**
     * 查询库存，只要itemIds 或loc 存在即可
     * @param options
     * @return {{}}
     */
    function getInvInfoV2(options){
        var data = {};
        var itemIds = options.itemIds;
        var loc = options.loc;
        var totalFld = options.totalFld||"q";
        if(!SWCUtils.hasResults(itemIds) && !loc){
            return data;
        }
        var filters = [
            ["binonhand.quantityonhand","greaterthan","0"],"AND",
            ["formulatext: {binonhand.binnumber}","doesnotstartwith","000"],  //排除虚拟储位
        ];

        if(loc){
            SWCUtils.addFilter(filters,["binonhand.location","anyof",loc])
        }

        if(SWCUtils.hasResults(itemIds)){
            SWCUtils.addFilter(filters,["internalid","anyof",itemIds])
        }

        var itemCol = search.createColumn({
            name: "internalid",
            summary: "GROUP"
        });
        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "'{'||listagg({binonhand.binnumber.id}||':'||nvl({binonhand.quantityavailable},0),',')  within group (order by {binonhand.quantityavailable} desc) ||'}'"
        });
        var totalCol = search.createColumn({
            name: "quantityavailable",
            join: "binOnHand",
            summary: "SUM"
        });


        var searchObj = search.create({
            type:"inventoryitem",
            filters:filters,
            columns:[itemCol,totalCol,dataCol]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb : function(result){
                var item = result.getValue(itemCol);
                var total = result.getValue(totalCol)||0;
                var dataStr = result.getValue(dataCol);
                data[item] = {
                    // q:total, //总数量
                    bins:getQtyJsonFromStr(dataStr,true)//按储位细分
                };
                data[item][totalFld] = total;
            }
        });
        //<itemid>:{q:10,bins:{<binid>:10}}
        return data;
    }

    /**
     * 查询子货品总数量（无储位仓库盘点）
     * @param options
     * @return {{}}
     */
    function getItemInvInfo(options){
        var data = {total:0,itemsInfo:{}};
        var loc = options.loc;
        if(!loc){
            throw "loc必填";
        }
        var filters = [["isinactive","is","F"],"AND",["matrix","is","F"],"AND",["locationquantityonhand","greaterthan","0"]];
        SWCUtils.addFilter(filters,["inventorylocation","anyof",loc])

        var itemCol = search.createColumn({
            name: "formulanumeric",
            summary: "GROUP",
            formula: "nvl({parent.id},{internalid})"
        });

        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "'{'||listagg({internalid}||':'||nvl({locationquantityonhand},0),',') ||'}'"
        });
        var totalCol = search.createColumn({
            name: "locationquantityonhand",
            summary: "sum",
        });

        var searchObj = search.create({
            type:"inventoryitem",
            filters:filters,
            columns:[itemCol,dataCol,totalCol]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb : function(result){
                var item = result.getValue(itemCol);
                var dataStr = result.getValue(dataCol);
                util.extend(data.itemsInfo,getQtyJsonFromStr(dataStr));
                data.total += Number(result.getValue(totalCol)||0);
            }
        });

        //{<itemid>:{q:10}}
        return data;
    }


    /**
     * 获取虚拟储位ids
     * @param options
     * @return {*[]}
     */
    function getVirtualBins(options){
        var loc = options.loc;
        var searchObj = search.create({
            type:"bin",
            filters:[["custrecord_swc_variety","noneof",Constants.INV_CHECK_BIN_TYPES],"and",["location","anyof",loc]]
        });
        var bins = SWCUtils.getAllResultIds({
            searchObj:searchObj
        })
        return bins;

    }



    /**
     * 查询储位货品总数量，以及货品明细
     * @param options
     * @return {{}}
     */
    function getBinInvInfo(options){
        var data = {};
        var loc = options.loc;
        if(!loc){
            throw "loc必填";
        }

        // var virtualBinIds = getVirtualBins({loc:loc});
        var virtualBinIds = [];

        // log.audit({title:"virtualBinIds",details:virtualBinIds})
        /*var filters = [
            ["binonhand.quantityonhand","greaterthan","0"],"AND",
            ["formulatext: {binonhand.binnumber}","doesnotstartwith","000"],  //排除虚拟储位
        ];*/
        var filters = [ ["binonhand.quantityonhand","greaterthan","0"]];
        //排除虚拟储位
        if(SWCUtils.hasResults(virtualBinIds)){
            SWCUtils.addFilter(filters,["binonhand.binnumber","noneof",virtualBinIds])
        }

        /*var filters = [
            ["binonhand.quantityonhand","greaterthan","0"]
        ];*/

        SWCUtils.addFilter(filters,["binonhand.location","anyof",loc])

        var binCol = search.createColumn({
            name: "binnumber",
            join: "binOnHand",
            summary: "GROUP"
        });
        var totalCol = search.createColumn({
            name: "quantityavailable",
            join: "binOnHand",
            summary: "SUM"
        });
        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "'{'||listagg({internalid}||':'||nvl({binonhand.quantityavailable},0),',') ||'}'"
        });

        var searchObj = search.create({
            type:"inventoryitem",
            filters:filters,
            columns:[binCol,totalCol,dataCol]
        });

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb : function(result){
                var bin = result.getValue(binCol);
                var total = result.getValue(totalCol)||0;
                var dataStr = result.getValue(dataCol);
                data[bin] = {
                    q:total, //总数量
                    d:getQtyJsonFromStr(dataStr)//按储位细分
                };
            }
        });

        //<itemid>:{q:10,d:{<binid>:q"{10}}}
        return data;
    }


    /**
     * 检查虚拟储位是否有库存
     */
    function checkVirtualBinInv(options){
        var loc = options.loc;
        // var filters = [["binonhand.location","anyof",loc],"and" ,
        //     ["binonhand.quantityonhand","greaterthan","0"],"AND",
        //     ["formulatext: {binonhand.binnumber}","startswith","000"]];

        var filters = [["binonhand.location","anyof",loc],"and" ,
            ["binonhand.quantityonhand","greaterthan","0"]];
        var binCol = search.createColumn({
            name: "binnumber",
            join: "binOnHand",
            summary: "GROUP",
            sort:"ASC"
        });
        var totalCol = search.createColumn({
            name: "quantityavailable",
            join: "binOnHand",
            summary: "SUM"
        });
        var searchObj = search.create({
            type:"inventoryitem",
            filters:filters,
            columns:[binCol,totalCol]
        });
        var data = {};

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var bin = result.getText(binCol);
                var total = result.getValue(totalCol);
                data[bin] = total;
            }
        })

        return data;
    }

    /**
     * 获取库存信息
     * @param options
     */
    function getInvInfoByPage(options){
        var data = {};
        var itemIds = options.itemIds;
        var loc = options.loc;
        var method = options.method;

        var filters = [
            ["binonhand.location","anyof",loc],"AND",
           ["binonhand.quantityonhand","greaterthan","0"],"AND",
            ["formulatext: {binonhand.binnumber}","doesnotstartwith","000"],  //排除虚拟储位
        ];
        if(SWCUtils.hasResults(itemIds)){
            SWCUtils.addFilter(filters,["internalid","anyof",itemIds])
        }

        var itemCol = search.createColumn({
            name: "internalid",
            summary: "GROUP"
        });
        var dataCol = search.createColumn({
            name: "formulatext",
            summary: "MAX",
            formula: "'{'||listagg({binonhand.binnumber.id}||':'||nvl({binonhand.quantityavailable},0),',')  within group (order by {binonhand.quantityavailable} desc) ||'}'"
        });
        var totalCol = search.createColumn({
            name: "quantityavailable",
            join: "binOnHand",
            summary: "SUM"
        });


        var searchObj = search.create({
            type:"inventoryitem",
            filters:filters,
            columns:[itemCol,totalCol,dataCol]
            // columns:[itemCol]
        });

        //SWCUtils.getAllResultsPro
        method({
            donotStoreResults: true,
            searchObj:searchObj,
            cb : function(result){
                var item = result.getValue(itemCol);
                var total = result.getValue(totalCol)||0;
                var dataStr = result.getValue(dataCol);
                data[item] = {
                    q:total, //总数量
                    bins:getQtyJsonFromStr(dataStr) //按储位细分
                };
            }
        });

        return data;
    }






    /**
     * 判断库存是否充足（一般出货）
     * return {hasStock:true,notEnoughStock:{}}
     */
    function checkStock(options) {
        //库存
        //{"item01":{q:10}}
        var invData = options.invData;
        //需求
        //{"X": {"item01": {q: 10}, "item02": {q: 2}}
        var reqData = options.reqData;

        var notEnoughStock = {};
        var hasStock = true;
        for (var dest in reqData) {
            var destInfo = reqData[dest];
            for (var item in destInfo) {
                var itemData = invData[item] = invData[item] || {q: 0};
                var itemData2 = destInfo[item];
                itemData.q -= itemData2.q;
                if (itemData.q < 0) {
                    hasStock = false;
                    notEnoughStock[item] = invData[item];
                }
            }
        }
        return {
            hasStock:hasStock,
            notEnoughStock:notEnoughStock,
        }
    }

    /**
     * 分配拣货储位(一般出货)
     * @param options
     */
    function allocatePickBins(options) {
        //需求信息 {<dest>:{<itemid>:{q:10}}}
        var reqData = options.reqData;
        var invData = options.invData;
        var invPendingAry = {};
        for(var item in invData){
            invPendingAry[item] = getPendingAry(invData[item].bins);
        }
        var destData = {};

        //item 对应的计划储位数量
        //{<itemid>:{total:10,bins:{<binid>:10}}}
        var itemBinAllocSummary = options.itemBinAllocSummary;

        for(var dest in reqData){ //dest 指目的地，如门店
            for(var item in reqData[dest]){
                var supplier = reqData[dest][item];
                var rq = allocate({
                    data :invData[item].bins,
                    pendingAry:invPendingAry[item],
                    supplier:supplier,
                    recordDest:true,
                    cb:function(bin,allocQty){
                        var destJson = destData[dest] = destData[dest]||{};
                        var binAllocJson = destJson[bin] = destJson[bin]||{q:0,items:{}};
                        binAllocJson.q += Number(allocQty);
                        var itemJson = binAllocJson.items[item]  = binAllocJson.items[item]||{q:0};
                        itemJson.q += Number(allocQty);

                        if(itemBinAllocSummary){
                            var itemBinAllocJson = itemBinAllocSummary[item] = itemBinAllocSummary[item]||{total:0,bins:{}};
                            var bins = itemBinAllocJson.bins;
                            itemBinAllocJson.total += Number(allocQty);
                            bins[bin] = Number(bins[bin]||0) + Number(allocQty);
                        }
                    }
                })
                //记录已分配数量
                // if(rq >0){
                    supplier.alq = supplier.q - (rq||0);
                // }
            }
        }
        return destData;
    }



/////////////////////////////////分配算法 START////////////////////////////////////

    /**
     * 分配数量
     * 目的：将一个数量分摊到不同的播种位,并返回剩余数量
     * A需要2个苹果，B需要3个苹果，我手头有3个箱子，分别装有1,3,3个苹果，需要将每箱的苹果进行分配，最终剩余（7-5=2个苹果）
     * 【扣减方/需方】 扣减 【被扣减方/供方】
     * q:qty,aq:allocateQty,rq:remainQty
     * @param options
     */

    function allocate(options) {
        var pendingAry = options.pendingAry;
        var data = options.data;//被扣减方
        var recordDest = options.recordDest||false;
        var cb = options.cb;//回调方法
        var qty = options.q;
        //如果记录分配详情，则需要传入扣减方需求
        var supplier = options.supplier;
        if(recordDest){
            qty = supplier.q;
        }

        do {
            pendingInfo = pendingAry[0];
            if (!pendingInfo || pendingInfo.q <= 0) {
                return qty;
            }

            var allocQty = Math.min(qty, pendingInfo.rq || pendingInfo.q);
            data[pendingInfo.dest].aq = pendingInfo.aq = Number(pendingInfo.aq || 0) + allocQty;
            data[pendingInfo.dest].rq = pendingInfo.rq = pendingInfo.q - pendingInfo.aq;

            //扣减方记录分配详情(每个目的地，分配的数量)
            if(recordDest){
                var dest = supplier.dest = supplier.dest||{};
                var destInfo = dest[pendingInfo.dest] = dest[pendingInfo.dest] ||{q:0};
                destInfo.q += Number(allocQty);
                if(cb){
                    cb(pendingInfo.dest,allocQty);
                }
            }

            if (pendingInfo.rq == 0) {
                pendingAry.shift();
            }
            qty -= allocQty;

        } while (qty > 0);

        return qty;
    }

    /**
     * 将pendingJson 转为pendingAry
     * @param pendingJson
     * @return {[]}
     */
    function getPendingAry(pendingJson){
        var ary = [];
        for(var dest in pendingJson){
            ary.push({
                dest:dest,
                aq:pendingJson[dest].aq||0,
                q:pendingJson[dest].q-(pendingJson[dest].aq||0)
            });
        }
        return ary;
    }


    /**
     * 内部id 与 播种位的映射，idKeyMap : {<destid>:"AA"}
     * @param pendingJson
     * @param idKeyMap
     * @return {{aq: number, q: number, dest}[]}
     */
    function getPendingArySorted(pendingJson,idKeyMap){
        var destAry = Object.keys(pendingJson);
        //先将destAry 进行排序，然后再生成pendingAry
        var ary = destAry.sort(function(v1,v2){
            //字符串升序
            return idKeyMap[v1] < idKeyMap[v2] ? -1:1;
        }).map(function(dest){
            return {
                dest:dest,
                aq:pendingJson[dest].aq||0,
                q:pendingJson[dest].q-(pendingJson[dest].aq||0)
            }
        });
        // log.audit({title:"destAry",details:destAry})
        return ary;
    }


/////////////////////////////////分配算法 END////////////////////////////////////
///////////////////////////////辅助方法 START//////////////////////////////////////
    /**
     * 获取地址串
     */
    function getAddrText(addrJson,doProcess){
       var state = addrJson.addr1;
       var city = addrJson.city;
       var area = addrJson.addr2;
       if(doProcess){
           processAddr(addrJson)
       }
       var detail = addrJson.addr3;
       return state+city+area+detail;
    }

    /**
     * 针对明细地址进行处理，替换省、市、区（主要针对京东导入地址的情况）
     * @param addrJson
     */
    function processAddr(addrJson){
        var state = addrJson.addr1; //省
        var city = addrJson.city; //市
        var area = addrJson.addr2;//区
        var detail = addrJson.addr3; //明细
        if(detail){
            //处理详细地址:将地址中 XX省XX市XX县 替换为空白
            detail = detail.replace(Constants.SPECIFIC_STATES_REGEX,"").replaceAll(state,"").replaceAll(city,"").replaceAll(area,"");
            addrJson.addr3 = detail;
        }
    }


    function searchInvBalanceForBinPutaway({loc}){
        var itemsInfo = {}
        var searchObj = search.create({
            type: 'inventorybalance',
            filters: [
                ['item.type', 'anyof', 'Assembly', 'InvtPart'],
                'AND',
                ['item.isinactive', 'is', 'F'],
                'AND',
                ['location', 'anyof', loc],
                "AND",
                ["binnumber","anyof","@NONE@"]
            ],
            columns:["item","inventorynumber","onhand","status"]
        })

        SWCUtils.getAllResults({
            searchObj:searchObj,
            cb:function(result){
                var item = result.getValue({name:"item"});
                var qty = Number(result.getValue({name:"onhand"}));
                var status = result.getValue({name:"status"});
                var itemJson = itemsInfo[item] = itemsInfo[item]|| {
                    total : 0,
                    nums:{}
                }

                var nums = itemJson.nums;
                var num = result.getText({name:"inventorynumber"});
                nums[num] =nums[num]|| {
                    q:0,
                    statuses:{}
                }
                nums[num].statuses[status]={q:qty}
                nums[num].q+= qty;
                itemJson.total += qty;
            }
        })
        return itemsInfo;

    }

    /**
     * 储位上架
     * @param loc
     * @param itemsInfo
     */
    function processWorkSheet({loc,binnumber}){
        var itemsInfo = searchInvBalanceForBinPutaway({loc});
        var binPutawayRec = record.create({ type:"binworksheet", isDynamic:true})
        binPutawayRec.setValue({fieldId:"location",value:loc});
        var sublistId = "item"
        var count = binPutawayRec.getLineCount({sublistId});
        for(var i=0;i<count;i++){
            binPutawayRec.selectLine({sublistId,line:i});
            var itemId = binPutawayRec.getCurrentSublistValue({sublistId,fieldId:"item"});
            var itemJson = itemsInfo[itemId];
            var total = itemJson.total||0;
            binPutawayRec.setCurrentSublistValue({sublistId,fieldId:"quantity",value:total});
            var subRec = binPutawayRec.getCurrentSublistSubrecord({sublistId,fieldId:"inventorydetail"})
            var nums = itemJson.nums;
            util.each(nums,function(numJson,num){
                //遍历状态
                util.each(numJson.statuses,function(statusJson,status){
                    setBinNumber(subRec,binnumber,null,null,null,num,"issueinventorynumber", statusJson.q,status,Constants.INV_STATUS_MAP.GOOD);
                })
            })
            binPutawayRec.commitLine({sublistId})
        }
        return binPutawayRec.save({ignoreMandatoryFields:true})
    }

    /**
     * 将某一状态的货品统一调整为另一个状态
     * @param subsidiary
     * @param loc
     * @param status
     * @param toStatus
     */
    function batchInventoryStatusChange({subsidiary,loc,status,toStatus}){
        //{1046:{total:1,nums:{ A001:{total:1,bins:{20:{q:1}}}}
        var itemsInfo = {};

        var searchObj = search.create({
            type: 'inventorybalance',
            filters: [
                ["location","anyof",loc],
                "AND",
                ['item.type', 'anyof', 'Assembly', 'InvtPart'],
                'AND',
                ['item.isinactive', 'is', 'F'],
                'AND',
                ['status', 'is', status]  //Good 状态
            ],
            columns: [
                "location",
                "item",
                "inventorynumber",
                "binnumber",
                "available",
                "onhand",
                "status"
            ],
        });
        searchObj.run().each(function(result){
            var item = result.getValue({name:"item"});
            var num = result.getText({name:"inventorynumber"});//批号
            var qty = Number(result.getValue({name:"onhand"}));
            var bin = result.getValue({name:"binnumber"});
            var status = result.getValue({name:"status"});

            var itemJson = itemsInfo[item] = itemsInfo[item]||{total:0};
            if(num){
                var nums = itemJson.nums = itemJson.nums || {};
                var numJson = nums[num] = nums[num]||{total:0};
                numJson.total = sRound(numJson.total + qty);
            }
            if(bin){
                var bins = null;
                if(num){
                    bins = numJson.bins = numJson.bins||{}
                }else{
                    bins = itemJson.bins = itemJson.bins||{}
                }
                bins[bin] = {q:qty};
            }
            itemJson.total = sRound(itemJson.total + qty);

            return true;
        })

        if(!Object.keys(itemsInfo).length){
            log.audit({title:"batchInventoryStatusChange",details:"无需处理"});
            return ;
        }

        // writeData(itemsInfo);
        // return;
        var id = processInventoryStatusChange({
            subsidiary,
            location:loc,
            fromStatus:status,
            toStatus:toStatus,
            items:itemsInfo
        });
        return id;
    }

    /**
     * 获取单位类型信息
     * {<unittype>:{<unitname>:<unitid>}}
     * @param unitsTypeIds
     * @param utName
     * @return {{}}
     */
    function getUnitTypesInfo({unitsTypeIds,utName}){
        var data = {};
        var queryObj = query.create({
            type:"unitstype",
        });

        var idCol = queryObj.createColumn({fieldId:"id"});
        var unitQueryObj = queryObj.join({fieldId:"uom"});
        var unitIdCol = unitQueryObj.createColumn({fieldId:"internalid"})
        var nameCol =  unitQueryObj.createColumn({fieldId:"unitname"})

        queryObj.columns = [idCol,unitIdCol,nameCol]

        var conditions = [];
        if(utName){
            var nameCond = unitQueryObj.createCondition({
                fieldId:"unitname",
                operator:query.Operator.IS,
                values:utName
            });
            conditions.push(nameCond);
        }

        if(unitsTypeIds){
            var unitsTypeCond = queryObj.createCondition({
                fieldId:"id",
                operator:query.Operator.ANY_OF,
                values:unitsTypeIds
            });
            conditions.push(unitsTypeCond);
        }

        queryObj.condition = queryObj.and(conditions);
        SWCUtils.getAllResultsQuery({queryObj:queryObj,cb:function(result){
                var id = result.values[0];
                var utId = result.values[1];
                var name = result.values[2];
                data[id] =data[id]|| {};
                data[id][name] = utId
            }});
        return data;
    }

    /**
     * 查询工艺路线信息
     */
    function getMFRoutingInfo({id}){
        var data = {components:{},operations:[]};
        if(!id){
            return data;
        }
        var rec = record.load({type:"manufacturingrouting",id});
        var sublistId = "routingcomponent";
        var count = rec.getLineCount({sublistId});
        var operations = new Set();
        for(var i = 0;i<count;i++){
            var item = rec.getSublistValue({sublistId,fieldId:"item",line:i});
            var op = rec.getSublistValue({sublistId,fieldId:"operationsequencenumber",line:i});
            var opName = rec.getSublistText({sublistId,fieldId:"operationdisplaytext",line:i});
            data.components[item] = {op,opName};
            if(op){
                operations.add(op);
            }
        }
        data.operations = Array.from(operations);
        data.operations.sort();
        //search 方式查询不到item id
        // var opStepCol = { name: "componentperroutingstep",  sort: search.Sort.ASC};
        // var searchObj = search.create({
        //     type: "manufacturingrouting",
        //     filters: [["internalid","anyof",id]],
        //     columns: [opStepCol, "componentline","component"]
        // });
        // SWCUtils.getAllResults({
        //     searchObj,
        //     cb:function(result){
        //         var opStep = result.getValue(opStepCol);
        //         var item = result.getValue({name:"component"});
        //         data.components[item] = {opStep};
        //     }
        // })
        return data;
    }

    /**
     * 查询工单的工序信息
     * @param woId
     */
    function getMFOperationTasks({woId}){
        var data = {};
        var opSeqCol = {name: "sequence",join: "manufacturingOperationTask"};
        var opTaskCol = {name: "internalid",join: "manufacturingOperationTask"};
        var searchObj = search.create({
            type: "workorder",
            filters:[["internalid","anyof",woId],"AND", ["mainline","is","T"]],
            columns:[ opSeqCol,opTaskCol ]
        });

        SWCUtils.getAllResults({
            searchObj,
            cb:function(result){
                var opSeq = result.getValue(opSeqCol);
                var id = result.getValue(opTaskCol);
                data[opSeq] = {id};
            }
        })

        return data;
    }

    /**
     * 获取wo的明细行信息
     * @param woId
     */
    function getWOSublistInfo({woId,origWORec,cf}){
        //获取原wo信息
        if(!origWORec){
            origWORec = record.load({type:"workorder",id:woId});
        }
        var origSub = origWORec.getValue({fieldId:"subsidiary"});
        var origLoc = origWORec.getValue({fieldId:"location"});
        var origAssemblyItem = origWORec.getValue({fieldId:"assemblyitem"});
        var origBom = origWORec.getValue({fieldId:"billofmaterials"});
        var origBomRevision = origWORec.getValue({fieldId:"billofmaterialsrevision"});
        var origQty = origWORec.getValue({fieldId:"quantity"});
        //<itemId>:{qty}
        var origItemsInfo = {};
        var count0 = origWORec.getLineCount({sublistId:"item"});
        for(var k = 0;k<count0;k++){
            var item = origWORec.getSublistValue({sublistId:"item",line:k,fieldId:"item"})
            var qty =  origWORec.getSublistValue({sublistId:"item",line:k,fieldId:"quantity"});
            var level =  origWORec.getSublistValue({sublistId:"item",line:k,fieldId:"assemblylevel"});
            var source = origWORec.getSublistValue({sublistId:"item",line:k,fieldId:"itemsource"})
            if(level == 1){
                //只记录第一层item
                origItemsInfo[item] = {qty,source};
            }
        }

        //新建wo
        var woRec = record.create({customform:cf,type:"workorder",isDynamic:true});
        origSub && woRec.setValue({fieldId:"subsidiary",value:origSub});
        origLoc && woRec.setValue({fieldId:"location",value:origLoc});
        woRec.setValue({fieldId:"assemblyitem",value:origAssemblyItem});
        origBom && woRec.setValue({fieldId:"billofmaterials",value:origBom});
        origBomRevision && woRec.setValue({fieldId:"billofmaterialsrevision",value:origBomRevision});
        woRec.setValue({fieldId:"quantity",value:origQty});
        //bom 展开
        woRec.setValue({fieldId:"expandassembly",value:true});

        log.audit("origItemsInfo",origItemsInfo)
        var count = woRec.getLineCount({sublistId:"item"});
        for(var i = count-1;i>=0;i--){
            var item = woRec.getSublistValue({sublistId:"item",line:i,fieldId:"item"})
            var source = woRec.getSublistValue({sublistId:"item",line:i,fieldId:"itemsource"})
            var qty =  woRec.getSublistValue({sublistId:"item",line:i,fieldId:"quantity"});
            var level =  woRec.getSublistValue({sublistId:"item",line:i,fieldId:"assemblylevel"});
            if(level == 1){
                var origQty = origItemsInfo[item]?.qty;
                if(origQty && qty != origQty){
                    woRec.selectLine({sublistId:"item",line:i});
                    woRec.setCurrentSublistValue({sublistId:"item",fieldId:"bomquantity",value:origQty});
                    woRec.commitLine({sublistId:"item"})
                }
                //当前行为assembly，bom中为STOCK，现在为phantom，则该assembly的子件不需要进行领料
                if(origItemsInfo[item]?.source == "STOCK" && source == "PHANTOM"){
                    woRec.selectLine({sublistId:"item",line:i});
                    woRec.setCurrentSublistValue({sublistId:"item",fieldId:"itemsource",value:"STOCK"});
                    woRec.commitLine({sublistId:"item"})
                }
            }
        }

        //重新读取item信息
        var itemsInfo = {};
        var count2 = woRec.getLineCount({sublistId:"item"});
        for(var j = 0;j<count2;j++){
            var item = woRec.getSublistValue({sublistId:"item",line:j,fieldId:"item"})
            var source = woRec.getSublistValue({sublistId:"item",line:j,fieldId:"itemsource"})
            var quantity =  woRec.getSublistValue({sublistId:"item",line:j,fieldId:"quantity"});
            var units =  woRec.getSublistValue({sublistId:"item",line:j,fieldId:"units"});
            var level =  woRec.getSublistValue({sublistId:"item",line:j,fieldId:"assemblylevel"});
            if(quantity <= 0){
                continue;
            }

            var itemJson = null;
            if(source == "STOCK"){
                if(itemsInfo[item]) {
                    if (itemsInfo[item].units != units) {
                        //同一个货品如果在工单中有多个计量单位，则领料会不支持
                        var itemTxt = woRec.getSublistText({sublistId: "item", line: j, fieldId: "item"})
                        throw `工单中货品${itemTxt}存在多个计量单位！`;
                    }
                }
                itemJson =itemsInfo[item] = itemsInfo[item] || {item,quantity:0,units};
                itemJson.quantity = sRound(Number(itemJson.quantity) + Number(quantity));
            }
        }
        return itemsInfo;
    }

///////////////////////////////辅助方法 END//////////////////////////////////////
    return {
        closeSO:closeSO,
        processItemReceipt:processItemReceipt,
        processItemReceiptForPO:processItemReceiptForPO,
        processItemReceiptV2:processItemReceiptV2,
        processItemReceiptV3:processItemReceiptV3,
        processItemFulfillment:processItemFulfillment,
        processAdjustmentV1  :processAdjustmentV1 ,
        processAdjustmentV2  :processAdjustmentV2 ,
        processBinTransfer :processBinTransfer,
        processBinTransferV2 :processBinTransferV2,
        processTransferOrder :processTransferOrder,
        searchItemInfo :searchItemInfo,
        searchLocations :searchLocations,
        searchItemInvInfo :searchItemInvInfo,
        searchSales :searchSales,
        searchPOArrivalSummary:searchPOArrivalSummary,
        searchSOArrivalSummary :searchSOArrivalSummary,
        searchTOPlanSummary:searchTOPlanSummary,
        searchManualTOSummary:searchManualTOSummary,
        searchTOSummary:searchTOSummary,
        getPOArrivalAva:getPOArrivalAva,
        checkAvaWithPOArrival :checkAvaWithPOArrival,
        searchItemInfoFromPOArr :searchItemInfoFromPOArr,
        getPOArrivalsSummary:getPOArrivalsSummary,
        getPOArrivalsDetails:getPOArrivalsDetails,
        getCustRetSummary:getCustRetSummary,
        getCustRetDetails:getCustRetDetails,
        getTOFulfillSummary:getTOFulfillSummary,
        getTOFulfillDetails:getTOFulfillDetails,
        getSOArrivalsSummary:getSOArrivalsSummary,
        getSOArrivalsSummaryByTran:getSOArrivalsSummaryByTran,
        getTOSummaryByTran:getTOSummaryByTran,
        getVendRetSummaryByTran:getVendRetSummaryByTran,
        getSOArrivalsDetails:getSOArrivalsDetails,
        getVendRetSummary:getVendRetSummary,
        getVendRetDetails:getVendRetDetails,
        getTOSummary:getTOSummary,
        getTODetails:getTODetails,
        initBarcodes:initBarcodes,
        searchITEMS_INFO:searchITEMS_INFO,
        searchITEMS_INFO_V2:searchITEMS_INFO_V2,
        searchITEMS_INFO_V2_total:searchITEMS_INFO_V2_total,
        getITEMS_INFO_Cache:getITEMS_INFO_Cache,
        saveITEMS_INFO_Cache:saveITEMS_INFO_Cache,
        getEntityInfo:getEntityInfo,
        getLocationInfo:getLocationInfo,
        getTransInfo:getTransInfo,
        getInvInfo:getInvInfo,
        checkStock:checkStock,
        allocatePickBins:allocatePickBins,
        getECOrderDetails:getECOrderDetails,
        genDests:genDests,
        allocate:allocate,
        getPendingAry:getPendingAry,
        getPendingArySorted:getPendingArySorted,
        getAddrText:getAddrText,
        getEntityAddressByAddrId:getEntityAddressByAddrId,
        getSOArrInfo:getSOArrInfo,
        getIdByExtId:getIdByExtId,
        getInvInfoByPage:getInvInfoByPage,
        closeTrans:closeTrans,
        getInvInfoV2:getInvInfoV2,
        getBinInvInfo:getBinInvInfo,
        getItemInvInfo:getItemInvInfo,
        checkVirtualBinInv:checkVirtualBinInv,
        processInvoice:processInvoice,
        getAllBins:getAllBins,
        processInventoryTransferV2:processInventoryTransferV2,
        searchLocations:searchLocations,
        searchITEMS_INFO_Basic:searchITEMS_INFO_Basic,
        getITEMS_INFO_Cache_Basic:getITEMS_INFO_Cache_Basic,
        saveITEMS_INFO_Cache_Basic:saveITEMS_INFO_Cache_Basic,
        replaceSKUWithId:replaceSKUWithId,
        processItemFulfillmentV2:processItemFulfillmentV2,
        processItemFulfillmentV3:processItemFulfillmentV3,
        processInventoryStatusChange:processInventoryStatusChange,
        setBinNumber:setBinNumber,
        removeLines:removeLines,
        adjSubRec:adjSubRec,
        getItemsInfoFromSublist:getItemsInfoFromSublist,
        processABV2:processABV2,
        notEmptyJson:notEmptyJson,
        getUnitsInfo:getUnitsInfo,
        toQty:toQty,
        processWorkOrder:processWorkOrder,
        processAdjustmentV3:processAdjustmentV3,
        processWorkSheet:processWorkSheet,
        releaseTrans:releaseTrans,
        releaseTransV2:releaseTransV2,
        releaseTransV3:releaseTransV3,
        searchItemInvInfoV2:searchItemInvInfoV2,
        reverseItemsInfo:reverseItemsInfo,
        batchInventoryStatusChange:batchInventoryStatusChange,
        getUnitTypesInfo:getUnitTypesInfo,
        receiveTrans:receiveTrans,
        checkCanReceiveTO:checkCanReceiveTO,
        checkCanFulfill:checkCanFulfill,
        processTrans:processTrans,
        deductTransItems:deductTransItems,
        deductTransItem:deductTransItem,
        getLastPutawayInfo:getLastPutawayInfo,
        recordErrorInfo:recordErrorInfo,
        getErrorMsg:getErrorMsg,
        processWOIssue:processWOIssue,
        getMFRoutingInfo:getMFRoutingInfo,
        getMFOperationTasks:getMFOperationTasks,
        getWOSublistInfo:getWOSublistInfo ,
        addNewItemLineV3:addNewItemLineV3
    };
    
});


