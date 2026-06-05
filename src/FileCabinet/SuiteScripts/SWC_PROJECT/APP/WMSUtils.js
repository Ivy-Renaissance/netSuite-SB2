/**
 * @NApiVersion 2.1
 * @NModuleScope public
 */
define(["N/runtime", "N/https", "N/url", "N/query", "N/record", "N/search", "N/format", "N/translation", "../lib/decimal.js", "../common/SWCUtils", "../common/SWCTransUtils"],
    function (runtime, https, url, query, record, search, format, translation, Decimal, SWCUtils, SWCTransUtils) {

        /**
         * 获取推荐储位
         */
        function getPrefBin(options){
            var loc = options.loc;
            var itemIds = options.itemIds.map(function(itemId){return itemId+""});
            var params = {loc:loc,itemIds:itemIds};
            var itemBinNumInfo = getItemBinNumbers(params);
            var remainItemIds = params.remainItemIds;
            var itemBinInfo = getPrefBinFromInvDetails({loc,itemIds:remainItemIds});
            remainItemIds = params.remainItemIds;
            var itemBinInfo2 = getPreBinByAttr({loc:loc,itemIds:remainItemIds});
            util.extend(itemBinNumInfo,itemBinInfo);//item 本身维护的bin 优先
            util.extend(itemBinNumInfo,itemBinInfo2);
            return itemBinNumInfo;
        }

        /**
         * 根据item中配置的binnumber 获取
         * @param item
         * @param location
         */
        function getItemBinNumbers(options){
            var {itemIds,loc} = options;
            if(!loc || !SWCUtils.hasResults(itemIds)){
                throw "mandatory fields:loc,itemIds";
            }
            var remainItemIds =  new Set(itemIds);
            var data = {};
            var binNumCol = {name: "binnumber",join: "binNumber"};
            var binIdCol = {name: "internalid",join: "binNumber"};
            var locCol = {name: "location",join: "binNumber"};
            var searchObj = search.create({
                type: "item",
                filters: [["internalid","anyof",itemIds],"and",["binNumber.location","anyof",loc]],
                columns:   [ "preferredbin", locCol,binIdCol,binNumCol]
            });
            SWCUtils.getAllResults({
                searchObj,
                cb:function(result){
                    var itemId = result.id;
                    data[itemId] = {
                        prefBinId : result.getValue(binIdCol),
                        prefBin : result.getValue(binNumCol)
                    }
                    remainItemIds.delete(itemId+"");
                }
            })
            options.remainItemIds = Array.from(remainItemIds);
            return data;
        }

        /**
         * 根据库存明细查询推荐储位
         * @param options
         */
        function getPrefBinFromInvDetails(options){
            var loc = options.loc;
            var itemIds = options.itemIds;
            var remainItemIds =  new Set(itemIds);
            if(!loc || !SWCUtils.hasResults(itemIds)){
                return {};
            }
            var data = {};
            var itemCol = search.createColumn({name: "item",summary: "GROUP"})
            var binCol = search.createColumn({name: "formulatext", summary: "MAX",formula: "{binnumber.internalid}||':'|| {binnumber}"})
            var searchObj = search.create({
                type: "inventorydetail",
                filters:
                    [
                        ["item","anyof",itemIds],
                        "AND",
                        ["location","anyof",loc],
                        "AND",
                        ["binnumber","noneof","@NONE@"]
                    ],
                columns:[itemCol,binCol]
            });
            SWCUtils.getAllResults({
                searchObj:searchObj,
                cb:function(result){
                    var itemId = result.getValue(itemCol);
                    var binStr = result.getValue(binCol);
                    var ary = binStr.split(":")
                    data[itemId] = {
                        prefBinId : ary[0],
                        prefBin : ary[1]
                    }
                    remainItemIds.delete(itemId+"");
                }
            })
            options.remainItemIds = Array.from(remainItemIds);

            return data;
        }

        /**
         * 根据储位属性推荐:例如，item有一个“宽度”属性为100，查找“宽度”属性为100的bin
         * @param options
         */
        function getPreBinByAttr(options){
            var loc = options.loc;
            var itemIds = options.itemIds;
            if(!loc || !SWCUtils.hasResults(itemIds)){
                return {};
            }

            var attrSet = new Set();
            var itemAttrFld = Constants.PREF_BIN_FIELD_MAP.ITEM_FLD;
            var binAttrFld = Constants.PREF_BIN_FIELD_MAP.BIN_FLD;

            //提取item信息
            var itemAttrInfo = SWCUtils.getAllResultsJson({
                type:"item",
                filters:["internalid","anyof",itemIds],
                columns:[itemAttrFld],
                cb:function(curData){
                    var attrId = curData[itemAttrFld];
                    if(!attrId){
                        return;
                    }
                    attrSet.add(attrId);
                }
                // key:"internalid"
            });
            //<attrid>:{binId:"",binNum:""}
            var attrBinInfo = {};
            //属性数组
            var attrAry = Array.from(attrSet);
            if(!SWCUtils.hasResults(attrAry)){
                return {};
            }
            var attrCol = search.createColumn({name: binAttrFld, summary: "GROUP"});
            var binIdCol = search.createColumn({name: "internalid",summary: "MAX"});
            var binNumCol = search.createColumn({ name: "formulatext", summary: "MAX",formula: "max({binnumber}) keep (dense_rank last order by {internalid})"})
            var columns = [attrCol,binIdCol,binNumCol];
            var filters = [["location","anyof",loc],"and",[binAttrFld,"anyof",attrAry]];

            var searchObj = search.create({
                type: "bin",
                filters:filters,
                columns:columns
            });

            SWCUtils.getAllResults({
                searchObj:searchObj,
                cb:function(result){
                    var attrId = result.getValue(attrCol);
                    attrBinInfo[attrId]={
                        binId:result.getValue(binIdCol),
                        binNum:result.getValue(binNumCol)
                    }
                }
            })

            //根据item 属性信息，匹配其对应的储位
            util.each(itemAttrInfo,function(itemJson,itemId){
                var attrId = itemJson[itemAttrFld];
                itemJson.prefBinId = attrBinInfo[attrId] && attrBinInfo[attrId].binId||"";
                itemJson.prefBin = attrBinInfo[attrId] && attrBinInfo[attrId].binNum||"";
            })

            return itemAttrInfo;
        }

        /**
         * 从parent中提取单价，品牌，类别
         * @param itemsInfo
         * @param itemId
         * @return {*}
         */
        function getCacheItemInfo(itemsInfo,itemId,BRAND_INFO,CLASS_INFO){
            var itemInfo = itemsInfo[itemId];
            //bc:brand_class,品牌_类别
            if(itemInfo && !itemInfo.bc ){
                if(itemInfo.p){
                    var parentInfo = itemsInfo[itemInfo.p];
                    if(parentInfo){
                        itemInfo.n = parentInfo.n;
                        itemInfo.rate = parentInfo.rate;
                        itemInfo.b = parentInfo.b;
                        itemInfo.c = parentInfo.c;
                    }
                }
                itemInfo.bc = itemInfo.b+"_"+itemInfo.c;
                //设置品牌名称
                if(BRAND_INFO) {
                    itemInfo.bName = BRAND_INFO[itemInfo.b] && BRAND_INFO[itemInfo.b].name || "";
                }
                //设置类别名称
                if(CLASS_INFO) {
                    itemInfo.cName = CLASS_INFO[itemInfo.c] && CLASS_INFO[itemInfo.c].name || "";
                }
            }
            return itemInfo;
        }

        /**
         * 从缓存读取item信息
         */
        function getCachedItemsInfo(){
            var itemCacheStr = SWCUtils.getCache({
                fldCount:Constants.CACHE_ITEM_FLDCOUNT, //存储item信息用到的字段个数
                cacheName: "ITEM"
            });
            var itemsInfo = JSON.parse(itemCacheStr);
            return itemsInfo;
        }

        /**
         * 推送消息
         * route:in,out,check,item,bin,unit
         */
        function doPush({taskRec,cids,taskId,route,loc}){
            if(!Constants.ENABLE_PUSH){
                return;
            }

            //推送消息
            if(cids.length){
                var data = {
                    "title": "",
                    "content": "",
                    "num":"",  //仓储任务编号
                    "taskId": "",
                    "picker": "",//接单人员ID（为空时是未接单状态）
                    "route": route,
                    "loc": ""
                }

                if(taskId || taskRec){
                    data.taskTypeName = taskRec.getText({fieldId:"custrecord_swt_wms_task_type"});
                    data.num = data.content = "WMS"+(taskId+"").padStart(Constants.TASK_NUM_MIN_DIGITS-3,"0");
                    data.loc = loc;
                    data.taskId = data.taskId;
                }else{
                    data.title="数据更新";
                    data.content="数据更新";
                }

                try{
                    Push.pushCids({cids,data});
                }catch(e){
                    log.error({title:"消息推送报错",details:e});
                }
            }
        }

        /**
         * 批量更新批号的“有退料”标识
         * usage: 每个批号更新需要5
         */
        function updateInventoryNumbers({ids,nums,count}){
            if(!SWCUtils.hasResults(ids) && !SWCUtils.hasResults(nums)){
                return;
            }

            var filters = ["custitemnumber_swms_returned","is","F"];
            if(ids.length){
                SWCUtils.addFilter(filters,["internalid","anyof",ids]);
            }else if(nums.length){
                SWCUtils.addFilter(filters,SWCUtils.buildNameFilter("number","number"));
            }

            var index = 0;
            var searchObj = search.create({
                type: "inventorynumber",
                filters:[["custitemnumber_swms_returned","is","F"],"and",["internalid","anyof",ids]],
                columns: ["internalid"]
            });
            searchObj.run().each(function(result){
                record.submitFields({type:"inventorynumber",id:result.id,
                    values:{"custitemnumber_swms_returned":true}});
                index ++;
                return index <count;
            })
            return;
        }

        /**
         * 根据需求信息，对实际信息进行分配
         * @param reqItems
         * @param allocExtraallocatePro
         */
        function allocatePro({reqItems,allocExtra,useLineKey,locInvInfo,outOfStockInfoByLoc}){
            util.each(reqItems,function(reqItemJson,itemLine){
                var item = useLineKey ? reqItemJson.item:itemLine;
                var reqQ = reqItemJson.q;

                if(SWCTransUtils.notEmptyJson(reqItemJson.nums)){
                    //先分配指定批号
                    for(var reqNum in reqItemJson.nums){
                        var reqNumJson = reqItemJson.nums[reqNum];
                        var reqNumQ = allocateV2(reqItemJson,locInvInfo,item,reqNumJson.q,outOfStockInfoByLoc,reqNum,reqNumJson.q);
                        if(reqNumQ -reqNumJson.q >=0 ){
                            break;
                        }
                    }
                }

                reqQ = sRound(reqItemJson.q - (reqItemJson.total||0));
                if(reqQ>0){
                    //如果还有需求量，则从pendAry 进行分配
                    allocateV2(reqItemJson,locInvInfo,item,reqQ,outOfStockInfoByLoc);
                }

            })
        }

        /**
         * 是否将实际剩余的信息增加到原需求，例如需求为10，实际为15，则将5增加到原需求
         */
        function allocateExtra({reqItems,useLineKey,locInvInfo}){
            //将实际添加到原需求(吸收实际)
            util.each(reqItems,function(reqItemJson,itemLine){
                var item = useLineKey ? reqItemJson.item:itemLine;
                var invInfo = locInvInfo[item];
                if(!invInfo ||!invInfo.total){
                    return;
                }

                var itemTotal = Number(invInfo.total||0);
                reqItemJson.total = sRound( reqItemJson.total + itemTotal);

                var pendMap = invInfo.pendMap;
                if(pendMap){
                    util.each(pendMap,function(numJson,num){
                        if(!numJson.total){
                            return;
                        }
                        var numTotal = Number(numJson.total||0);
                        var reqNums = reqItemJson.nums = reqItemJson.nums||{};
                        var reqNumJson = reqNums[num] = reqNums[num]||{total:0,bins:{}}
                        reqNumJson.total  = sRound(reqNumJson.total + numTotal);
                        SWCUtils.mergeQ(reqNumJson.bins,numJson.bins);
                    })
                }else{
                    var pendJson = invInfo.pendAry[0];
                    SWCUtils.mergeQ(reqItemJson.bins,pendJson.bins);
                }

                delete locInvInfo[item]
            })
        }

        /**
         * 库存分配
         * @param reqJson 需求信息
         * @param invInfo 库存信息
         * @param item 需求货品
         * @param reqQ 需求数量
         * @param outOfStockInfo 缺货信息
         * @param num 特定批号
         * @param numQ 特定批号数量
         */
        function allocateV2(reqJson,invInfo,item,reqQ,outOfStockInfo,reqNum,reqNumQ,recordLoc){
            var itemInvInfo = invInfo[item]||{};
            var q = itemInvInfo.total||0;
            //待分配数量
            var allocReqQ = Math.min(reqQ,q);
            if(reqQ-q > 0 ){
                //库存不足
                var outOfStockJson = outOfStockInfo.items[item] = outOfStockInfo.items[item]||{total:0,name:reqJson.name};
                outOfStockJson.total = sRound(reqQ-q+outOfStockJson.total);
                // return;
            }
            //直接将库存分配给reqJson
            var invJson = invInfo[item];
            if(!invJson){
                return;
            }

            //如果根据指定批号进行分配,则直接定位到numJson
            if(reqNum){
                //pendMap 是以批号为key的JSON {<num>:{num:"",total:10,bins:{}}}
                var pendMap = invJson.pendMap;
                var pendJson = pendMap[reqNum]||{total:0};
                var allocReqNumQ = Math.min(reqNumQ,pendJson.total);
                if(reqNumQ - pendJson.total > 0){
                    //记录不足信息
                    var outOfStockJson = outOfStockInfo.items[item] = outOfStockInfo.items[item]||{total:0,name:reqJson.name,nums:{}};
                    var outQ = sRound(reqNumQ - pendJson.total)
                    outOfStockJson.total = sRound(outOfStockJson.total + outQ);
                    outOfStockJson.nums = outOfStockJson.nums||{};
                    var outOfStockInfoByNum = outOfStockJson.nums[reqNum] = outOfStockJson.nums[reqNum]||{total:0}
                    outOfStockInfoByNum.total = sRound( outOfStockInfoByNum.total + outQ);
                    // return;
                }
                //进行分配
                var bins = pendJson.bins;
                var numReqJson = reqJson.nums[reqNum];
                numReqJson.bins = numReqJson.bins ||{};
                //此处是记录领料来源仓库和来源储位
                if(pendJson.fLoc){
                    numReqJson.fLoc = pendJson.fLoc;
                    numReqJson.fBin = pendJson.fBin;
                }
                //已分配数量
                var allocatedQ = 0;
                allocatedQ = allocateBinsV2(bins,allocReqNumQ,numReqJson,reqJson,pendJson,invJson,true);
                allocReqNumQ = sRound(allocReqNumQ - allocatedQ);
                if(pendJson.total <=0){
                    delete pendMap[reqNum];
                }
                if(allocReqNumQ <= 0){
                    return;
                }
            }else{
                //未指定批号时，自动分配批号
                var pendAry = invJson.pendAry;
                var length = pendAry.length;
                //已分配数量
                var allocatedQ = 0;
                for(var i=length-1;i>=0;i--){
                    var pendJson = pendAry[i];
                    if(pendJson.total<=0){
                        pendAry.pop();
                        continue;
                    }
                    var num = pendJson.num;
                    var bins = pendJson.bins;
                    if(num){
                        //添加num信息到reqJson
                        var nums = reqJson.nums = reqJson.nums||{};
                        var numReqJson = nums[num] = nums[num]||{total:0,bins:{}};
                        //此处是记录领料来源仓库和来源储位
                        if(pendJson.fLoc){
                            numReqJson.fLoc = pendJson.fLoc;
                            numReqJson.fBin = pendJson.fBin;
                        }
                        allocatedQ = allocateBinsV2(bins,allocReqQ,numReqJson,reqJson,pendJson,invJson,true)
                    }else{
                        reqJson.bins = reqJson.bins||{};
                        allocatedQ = allocateBinsV2(bins,allocReqQ,reqJson,reqJson,pendJson,invJson)
                    }
                    // reqQ-=allocatedQ;
                    allocReqQ = sRound(allocReqQ - allocatedQ);
                    if(pendJson.total <=0){
                        pendAry.pop();
                    }
                    if(allocReqQ <= 0){
                        break;
                    }
                }
            }
        }

        function allocateBinsV2(bins,reqQ,curReqJson,reqJson,pendJson,invJson,isNum){
            //分配数量
            var allocatedQ = 0;
            for(var binId in bins){
                var binJson = bins[binId];
                var aq = Number(Math.min(reqQ, binJson.q));
                var reqBinJson = curReqJson.bins[binId] =  curReqJson.bins[binId]||{q:0};
                if(isNum){
                    //对于有批号的，将批号总数增加
                    curReqJson.total = sRound(curReqJson.total + aq);
                }
                reqBinJson.q = sRound(reqBinJson.q + aq);
                reqJson.total =sRound(reqJson.total +aq);
                binJson.q = sRound(binJson.q -aq);
                if(binJson.q <=0){
                    delete bins[binId];
                }

                pendJson.total = sRound(pendJson.total -aq);
                invJson.total = sRound(invJson.total -aq);
                reqQ = sRound(reqQ -aq);
                allocatedQ =sRound(allocatedQ +aq);
                if(reqQ <= 0){
                    break;
                }
            }
            return allocatedQ;
        }

        function nowDate(timezone) {
            var newDate = getNowDate(timezone);
            var date = format.parse({value: newDate, type: format.Type.DATE});
            return date;
        }

        function getNowDate(timeZone) {
            var date = new Date();
            var utcTime = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
            var tzTime = utcTime + timeZone * 60 * 60 * 1000;
            return new Date(tzTime);
        }

        /**
         * 根据字符串长度求字号
         * @param str 字符串
         */
        function getFontSizeByLength(str) {
            var fontSize = Constants.DEFAULT_FONT_SIZE;
            var strlength = parseInt(str.length); // 总长度
            var chinese = cLength(str); // 中文字数
            var other = strlength - chinese; // 英文或者数字数
            var totalLength = chinese * 2 + other;//中文字权重*2 ，算比例
            if (totalLength >= Constants.MAX_DISPLAY_LENGTH) {
                fontSize = Constants.DEFAULT_FONT_SIZE / (totalLength / Constants.MAX_DISPLAY_LENGTH);
            }
            return Math.ceil(fontSize) || 1;
        }

        function cLength(str) {
            var reg = /[^\u4E00-\u9FA5\uf900-\ufa2d]/g;
            var temp = str.replace(reg, '');
            return temp.length;
        }

        function formatDateToBatch(date, formatNum) {
            var year = date.getFullYear();
            var month = to2Digits(Number(date.getMonth()) + 1);
            var day = to2Digits(date.getDate());
            var week = getWeekNumber(date);
            var str = formatNum && formatNum.replace("YYYY", year).replace("MM", month).replace("DD", day).replace("WW", week);
            return str;
        }

        /**
         * 可以用padStart 替代，例如 "1".padStart(2,"0")
         * @param num
         * @return {string}
         */
        function to2Digits(num) {
            return (num < 10 ? "0" : "") + num;
        }

        function getWeekNumber(today) {
            // 获取一年中的第一天
            var firstDayOfYear = new Date(today.getFullYear(), 0, 1);

            // 计算差距的天数
            var timeDiff = today - firstDayOfYear;

            // 计算相对周数（以周日为起始，每周算7天）
            var weekNumber = Math.ceil((timeDiff + 1) / (1000 * 60 * 60 * 24 * 7));

            return weekNumber;
        }

        function getTimeByTimeZone(timeZone){
            var d = new Date();
            var localTime = d.getTime();
            var localOffset = d.getTimezoneOffset()*60000; // 获得当地时间偏移的毫秒数,这里可能是负数
            var utc = localTime + localOffset; // utc即GMT时间
            var offset = timeZone; // 时区，北京市+8  美国华盛顿为 -5
            var localSecondTime = utc + (3600000*offset); // 本地对应的毫秒数
            return new Date(localSecondTime);
        }

        function getDateByUser({user, type}) {
            var timeZoneId = "";
            if (user) {
                var result = search.lookupFields({type: "customrecord_swms_user", columns: ["custrecord_su_timezone"], id: user});
                timeZoneId = result.custrecord_su_timezone;
            }
            return getDateByTimeZoneId({timeZoneId, type});
        }

        var timeZoneMappingObj = {
            "1": "ETC_GMT_PLUS_12",
            "2": "PACIFIC_SAMOA",
            "3": "PACIFIC_HONOLULU",
            "4": "AMERICA_ANCHORAGE",
            "5": "AMERICA_LOS_ANGELES",
            "6": "AMERICA_TIJUANA",
            "7": "AMERICA_DENVER",
            "8": "AMERICA_PHOENIX",
            "9": "AMERICA_CHIHUAHUA",
            "10": "AMERICA_CHICAGO",
            "11": "AMERICA_REGINA",
            "12": "AMERICA_GUATEMALA",
            "13": "AMERICA_MEXICO_CITY",
            "14": "AMERICA_NEW_YORK",
            "15": "US_EAST_INDIANA",
            "16": "AMERICA_BOGOTA",
            "17": "AMERICA_CARACAS",
            "18": "AMERICA_HALIFAX",
            "19": "AMERICA_LA_PAZ",
            "20": "AMERICA_MANAUS",
            "21": "AMERICA_SANTIAGO",
            "22": "AMERICA_ST_JOHNS",
            "23": "AMERICA_SAO_PAULO",
            "24": "AMERICA_BUENOS_AIRES",
            "25": "ETC_GMT_PLUS_3",
            "26": "AMERICA_GODTHAB",
            "27": "AMERICA_MONTEVVIDEO",
            "28": "AMERICA_NORONHA",
            "29": "ETC_GMT_PLUS_1",
            "30": "ATLANTIC_AZORES",
            "31": "EUROPE_LONDON",
            "32": "GMT",
            "33": "ATLANTIC_REYKJAVIK",
            "34": "EUROPE_WARSAW",
            "35": "EUROPE_PARIS",
            "36": "ETC_GMT_MINUS_1",
            "37": "EUROPE_AMSTERDAM",
            "38": "EUROPE_BUDAPEST",
            "39": "AFRICA_CAIRO",
            "40": "EUROPE_ISTANBUL",
            "41": "ASIA_JERUSALEM",
            "42": "ASIA_AMMAN",
            "43": "ASIA_BEIRUT",
            "44": "AFRICA_JOHANNESBURG",
            "45": "EUROPE_KIEV",
            "46": "EUROPE_MINSK",
            "47": "AFRICA_WINDHOEK",
            "48": "ASIA_RIYADH",
            "49": "EUROPE_MOSCOW",
            "50": "ASIA_BAGHDAD",
            "51": "AFRICA_NAIROBI",
            "52": "ASIA_TEHRAN",
            "53": "ASIA_MUSCAT",
            "54": "ASIA_BAKU",
            "55": "ASIA_YEREVAN",
            "56": "ETC_GMT_MINUS_3",
            "57": "ASIA_KABUL",
            "58": "ASIA_KARACHI",
            "59": "ASIA_YEKATERINBURG",
            "60": "ASIA_TASHKENT",
            "61": "ASIA_CALCUTTA",
            "62": "ASIA_KATMANDU",
            "63": "ASIA_ALMATY",
            "64": "ASIA_DHAKA",
            "65": "ASIA_RANGOON",
            "66": "ASIA_BANGKOK",
            "67": "ASIA_KRASNOYARSK",
            "68": "ASIA_HONG_KONG",
            "69": "ASIA_KUALA_LUMPUR",
            "70": "ASIA_TAIPEI",
            "71": "AUSTRALIA_PERTH",
            "72": "ASIA_IRKUTSK",
            "73": "ASIA_MANILA",
            "74": "ASIA_SEOUL",
            "75": "ASIA_TOKYO",
            "76": "ASIA_YAKUTSK",
            "77": "AUSTRALIA_DARWIN",
            "78": "AUSTRALIA_ADELAIDE",
            "79": "AUSTRALIA_SYDNEY",
            "80": "AUSTRALIA_BRISBANE",
            "81": "AUSTRALIA_HOBART",
            "82": "PACIFIC_GUAM",
            "83": "ASIA_VLADIVOSTOK",
            "84": "ASIA_MAGADAN",
            "85": "PACIFIC_KWAJALEIN",
            "86": "PACIFIC_AUCKLAND",
            "87": "PACIFIC_TONGATAPU"
        }
        function getDateByTimeZoneId({timeZoneId, type}) {
            var timeZone = timeZoneMappingObj[timeZoneId] || Constants.DEFAULT_TIMEZONE || "ASIA_HONG_KONG"; // 用户配置或统一配置或北京时区
            var datestr = format.format({value: new Date(), type: format.Type.DATETIMETZ, timezone: format.Timezone[timeZone]});
            return parseDateTime({str: datestr, type});
        }

        // D/M/YYYY
        function parseDateTime({str, type}){
            if (type == "datetime") {
                return str;
            } else {
                return str.split(" ")[0];
            }
            /*var dateTime = str.split(" ");
            var date = dateTime[0].split("/");
            var time = dateTime[1];
            var year = date[2];
            var month = date[1];
            var day = date[0];
            var res = year + "/" + month + "/" + day;
            if (type == "datetime") {
                res += " " + time;
            }
            return new Date(res);*/
        }

        /**
         * 获取WMS基础配置
         * @param {object} options - 配置参数对象
         * @param {string} options.subsidiary - 子公司ID
         * @param {string} options.location - 仓库ID
         * @returns {object} 包含WMS基础配置的字典对象，键为配置ID，值为配置对象
         */
        function getWMSBasicConfig({subsidiary, location}) {
            var config = {};
            // 初始化过滤条件数组
            var filters = [["isinactive","is","F"]];
            if (subsidiary) {
                if (filters.length != 0) filters.push("AND");
                filters.push(["custrecord_swbc_subsidiary", "anyof", subsidiary]);
            }
            if (location) {
                if (filters.length != 0) filters.push("AND");
                filters.push(["custrecord_swbc_location", "anyof", location]);
            }
            // 查询WMS基础配置
            var basicConfigSearchObj = search.create({
                type: "customrecord_swc_wms_basic_config",
                filters: filters,
                columns:
                    [
                        search.createColumn({name: "custrecord_swbc_subsidiary", label: "子公司"}),
                        search.createColumn({name: "custrecord_swbc_location", label: "仓库"}),
                        search.createColumn({name: "custrecord_swbc_role", label: "角色"}),
                        search.createColumn({name: "custrecord_swbc_one_world", label: "是否启用 [One World]"}),
                        search.createColumn({name: "custrecord_swbc_login", label: "是否单设备登录"}),
                        search.createColumn({name: "custrecord_swbc_timezone", label: "默认时区"}),
                        search.createColumn({name: "custrecord_swbc_iqc_mode", label: "默认质检模式"}),
                        search.createColumn({name: "custrecord_swbc_pdaprint", label: "是否启用PDA打印"}),
                        search.createColumn({name: "custrecord_swbc_bin_recommend", label: "首选库位字段ID"}),
                        search.createColumn({name: "custrecord_swbc_remind", label: "入库质检超时提醒（小时）"}),
                        search.createColumn({name: "custrecord_swbc_error_quantity", label: "误差库存数量"}),
                        search.createColumn({name: "custrecord_swbc_tagtable", label: "启用标签表"}),
                        search.createColumn({name: "custrecord_swbc_defective_other_r", label: "其他入库-不良品是否接收入库"}),
                        search.createColumn({name: "custrecord_swbc_turnover_other_r", label: "其他入库-任务部分完成可流转至后续节点"}),
                        search.createColumn({name: "custrecord_swbc_recive_other_r", label: "其他入库-启用[收货]"}),
                        search.createColumn({name: "custrecord_swbc_iqc_other_r", label: "其他入库-启用[质检]"}),
                        search.createColumn({name: "custrecord_swbc_print_other_r", label: "其他入库-是否PDA生成标签"}),
                        search.createColumn({name: "custrecord_swbc_mulputaway_other_r", label: "其他入库-是否允许多任务上架"}),
                        search.createColumn({name: "custrecord_swbc_item_receipts_other_r", label: "其他入库-生成货品收据节点"}),
                        search.createColumn({name: "custrecord_swbc_inconformity_other_f", label: "其他出库-是否允许拣货/发货批次号不一致"}),
                        search.createColumn({name: "custrecord_swbc_encasement_other_f", label: "其他出库-是否启用[装箱]"}),
                        search.createColumn({name: "custrecord_swbc_first_other_f", label: "其他出库-是否强制先进先出"}),
                        search.createColumn({name: "custrecord_swbc_defective_to_r", label: "调拨入库-不良品是否接收入库"}),
                        search.createColumn({name: "custrecord_swbc_turnover_to_r", label: "调拨入库-任务部分完成可流转至后续节点"}),
                        search.createColumn({name: "custrecord_swbc_recive_to_r", label: "调拨入库-启用[收货]"}),
                        search.createColumn({name: "custrecord_swbc_iqc_to_r", label: "调拨入库-启用[质检]"}),
                        search.createColumn({name: "custrecord_swbc_print_to_r", label: "调拨入库-是否PDA生成标签"}),
                        search.createColumn({name: "custrecord_swbc_item_receipts_to_r", label: "调拨入库-生成货品收据节点"}),
                        search.createColumn({name: "custrecord_swbc_inconformity_to_f", label: "调拨出库-是否允许拣货/发货批次号不一致"}),
                        search.createColumn({name: "custrecord_swbc_encasement_to_f", label: "调拨出库-是否启用[装箱]"}),
                        search.createColumn({name: "custrecord_swbc_first_to_f", label: "调拨出库-是否强制先进先出"}),
                        search.createColumn({name: "custrecord_swbc_turnover_materials_retur", label: "退料入库-任务部分完成可流转至后续节点"}),
                        search.createColumn({name: "custrecord_swbc_recive_materials_returne", label: "退料入库-启用[收货]"}),
                        search.createColumn({name: "custrecord_swbc_iqc_materials_returne", label: "退料入库-启用[质检]"}),
                        search.createColumn({name: "custrecord_swbc_it_materials_returne", label: "退料入库-生成库存转移节点"}),
                        search.createColumn({name: "custrecord_swbc_defective_ro", label: "采购入库-不良品是否接收入库"}),
                        search.createColumn({name: "custrecord_swbc_turnover_ro", label: "采购入库-任务部分完成可流转至后续节点"}),
                        search.createColumn({name: "custrecord_swbc_recive_ro", label: "采购入库-启用[收货]"}),
                        search.createColumn({name: "custrecord_swbc_iqc_ro", label: "采购入库-启用[质检]"}),
                        search.createColumn({name: "custrecord_swbc_print_ro", label: "采购入库-是否PDA生成标签"}),
                        search.createColumn({name: "custrecord_swbc_mulputaway_ro", label: "采购入库-是否允许多任务上架"}),
                        search.createColumn({name: "custrecord_swbc_receivetask_ro", label: "采购入库-是否启用[到货通知单]"}),
                        search.createColumn({name: "custrecord_swbc_item_receipts_ro", label: "采购入库-生成货品收据节点"}),
                        search.createColumn({name: "custrecord_swbc_inconformity_vra", label: "采购退货-是否允许拣货/发货批次号不一致"}),
                        search.createColumn({name: "custrecord_swbc_encasement_vra", label: "采购退货-是否启用[装箱]"}),
                        search.createColumn({name: "custrecord_swbc_first_vra", label: "采购退货-是否强制先进先出"}),
                        search.createColumn({name: "custrecord_swbc_inconformity_f", label: "销售出库-是否允许拣货/发货批次号不一致"}),
                        search.createColumn({name: "custrecord_swbc_deliverynotice_f", label: "销售出库-是否启用[发货通知单]"}),
                        search.createColumn({name: "custrecord_swbc_encasement_f", label: "销售出库-是否启用[装箱]"}),
                        search.createColumn({name: "custrecord_swbc_first_f", label: "销售出库-是否强制先进先出"}),
                        search.createColumn({name: "custrecord_swbc_shipqc_so", label: "销售出库-启用[质检]"}),
                        search.createColumn({name: "custrecord_swbc_defective_ra", label: "销售退货-不良品是否接收入库"}),
                        search.createColumn({name: "custrecord_swbc_turnover_ra", label: "销售退货-任务部分完成可流转至后续节点"}),
                        search.createColumn({name: "custrecord_swbc_recive_ra", label: "销售退货-启用[收货]"}),
                        search.createColumn({name: "custrecord_swbc_iqc_ra", label: "销售退货-启用[质检]"}),
                        search.createColumn({name: "custrecord_swbc_print_ra", label: "销售退货-是否PDA生成标签"}),
                        search.createColumn({name: "custrecord_swbc_item_receipts_ra", label: "销售退货-生成货品收据节点"}),
                        search.createColumn({name: "custrecord_swbc_first_material_requisiti", label: "领料出库-是否强制先进先出"}),
                        search.createColumn({name: "custrecord_swbc_turnover_finished", label: "完工入库-任务部分完成可流转至后续节点"}),
                        search.createColumn({name: "custrecord_swbc_recive_finished", label: "完工入库-启用[收货]"}),
                        search.createColumn({name: "custrecord_swbc_iqc_finished", label: "完工入库-启用[质检]"}),
                        search.createColumn({name: "custrecord_swbc_mulputaway_finished", label: "完工入库-是否允许多任务上架"}),
                        search.createColumn({name: "custrecord_swbc_it_finished", label: "完工入库-生成库存转移节点"}),
                        search.createColumn({name: "custrecord_swbc_autoship_vra", label: "采购退货-拣货后自动发货"}),
                        search.createColumn({name: "custrecord_swbc_autoship_f", label: "销售出库-拣货后自动发货"}),
                        search.createColumn({name: "custrecord_swbc_autoship_to_f", label: "调拨出库-拣货后自动发货"}),
                        search.createColumn({name: "custrecord_swbc_autoship_other_f", label: "其他出库-拣货后自动发货"}),
                        search.createColumn({name: "custrecord_swbc_autoship_material_req", label: "领料出库-拣货后自动发货"}),
                    ]
            });
            basicConfigSearchObj.run().each(function(result){
                var configId = result.id;
                var oneConfig = {id: configId, keys: {}};
                var subStr = result.getValue({name: "custrecord_swbc_subsidiary"});
                var subArr = subStr.split(",");
                oneConfig.subIds = subArr;
                var locStr = result.getValue({name: "custrecord_swbc_location"});
                var locArr = locStr.split(",");
                oneConfig.locIds = locArr;
                oneConfig.keys = {};
                for (var i in subArr) {
                    for (var j in locArr) {
                        var key = subArr[i] + "_" + locArr[j];
                        oneConfig.keys[key] = true;
                    }
                }
                oneConfig.oneWorld = result.getValue({name: "custrecord_swbc_one_world"});
                oneConfig.oneLogin = result.getValue({name: "custrecord_swbc_login"});
                oneConfig.timezone = result.getValue({name: "custrecord_swbc_timezone"});
                oneConfig.iqcMode = result.getValue({name: "custrecord_swbc_iqc_mode"});
                oneConfig.pdaPrint = result.getValue({name: "custrecord_swbc_pdaprint"});
                oneConfig.binRecommend = result.getValue({name: "custrecord_swbc_bin_recommend"});
                oneConfig.iqcRemind = result.getValue({name: "custrecord_swbc_remind"});
                oneConfig.errorQty = result.getValue({name: "custrecord_swbc_error_quantity"});
                oneConfig.useLabel = result.getValue({name: "custrecord_swbc_tagtable"});

                oneConfig.otherInDefIn = result.getValue({name: "custrecord_swbc_defective_other_r"});
                oneConfig.otherInTurn = result.getValue({name: "custrecord_swbc_turnover_other_r"});
                oneConfig.otherInRec = result.getValue({name: "custrecord_swbc_recive_other_r"});
                oneConfig.otherInIqc = result.getValue({name: "custrecord_swbc_iqc_other_r"});
                oneConfig.otherInPdaLabel = result.getValue({name: "custrecord_swbc_print_other_r"});
                oneConfig.otherInBinPutaway = result.getValue({name: "custrecord_swbc_mulputaway_other_r"});
                oneConfig.otherInIr = result.getValue({name: "custrecord_swbc_item_receipts_other_r"});

                oneConfig.otherOutShipScan = result.getValue({name: "custrecord_swbc_inconformity_other_f"});
                oneConfig.otherOutPack = result.getValue({name: "custrecord_swbc_encasement_other_f"});
                oneConfig.otherOutAutoShip = result.getValue({name: "custrecord_swbc_autoship_other_f"});
                oneConfig.otherOutFifo = result.getValue({name: "custrecord_swbc_first_other_f"});

                oneConfig.toInDefIn = result.getValue({name: "custrecord_swbc_defective_to_r"});
                oneConfig.toInTurn = result.getValue({name: "custrecord_swbc_turnover_to_r"});
                oneConfig.toInRec = result.getValue({name: "custrecord_swbc_recive_to_r"});
                oneConfig.toInIqc = result.getValue({name: "custrecord_swbc_iqc_to_r"});
                oneConfig.toInPdaLabel = result.getValue({name: "custrecord_swbc_print_to_r"});
                oneConfig.toInIr = result.getValue({name: "custrecord_swbc_item_receipts_to_r"});

                oneConfig.toOutShipScan = result.getValue({name: "custrecord_swbc_inconformity_to_f"});
                oneConfig.toOutPack = result.getValue({name: "custrecord_swbc_encasement_to_f"});
                oneConfig.toOutAutoShip = result.getValue({name: "custrecord_swbc_autoship_to_f"});
                oneConfig.toOutFifo = result.getValue({name: "custrecord_swbc_first_to_f"});

                oneConfig.remInTurn = result.getValue({name: "custrecord_swbc_turnover_materials_retur"});
                oneConfig.remInRec = result.getValue({name: "custrecord_swbc_recive_materials_returne"});
                oneConfig.remInIqc = result.getValue({name: "custrecord_swbc_iqc_materials_returne"});
                oneConfig.remInIt = result.getValue({name: "custrecord_swbc_it_materials_returne"});

                oneConfig.poInDefIn = result.getValue({name: "custrecord_swbc_defective_ro"});
                oneConfig.poInTurn = result.getValue({name: "custrecord_swbc_turnover_ro"});
                oneConfig.poInRec = result.getValue({name: "custrecord_swbc_recive_ro"});
                oneConfig.poInIqc = result.getValue({name: "custrecord_swbc_iqc_ro"});
                oneConfig.poInPdaLabel = result.getValue({name: "custrecord_swbc_print_ro"});
                oneConfig.poInBinPutaway = result.getValue({name: "custrecord_swbc_mulputaway_ro"});
                oneConfig.poInRecTask = result.getValue({name: "custrecord_swbc_receivetask_ro"});
                oneConfig.poInIr = result.getValue({name: "custrecord_swbc_item_receipts_ro"});

                oneConfig.poretOutShipScan = result.getValue({name: "custrecord_swbc_inconformity_vra"});
                oneConfig.poretOutPack = result.getValue({name: "custrecord_swbc_encasement_vra"});
                oneConfig.poretOutAutoShip = result.getValue({name: "custrecord_swbc_autoship_vra"});
                oneConfig.poretOutFifo = result.getValue({name: "custrecord_swbc_first_vra"});

                oneConfig.soOutShipScan = result.getValue({name: "custrecord_swbc_inconformity_f"});
                oneConfig.soOutDn = result.getValue({name: "custrecord_swbc_deliverynotice_f"});
                oneConfig.soOutPack = result.getValue({name: "custrecord_swbc_encasement_f"});
                oneConfig.soOutAutoShip = result.getValue({name: "custrecord_swbc_autoship_f"});
                oneConfig.soOutFifo = result.getValue({name: "custrecord_swbc_first_f"});
                oneConfig.soOutIqc = result.getValue({name: "custrecord_swbc_shipqc_so"}); // 增加出库质检 - 2025/02/10

                oneConfig.soretInDefIn = result.getValue({name: "custrecord_swbc_defective_ra"});
                oneConfig.soretInTurn = result.getValue({name: "custrecord_swbc_turnover_ra"});
                oneConfig.soretInRec = result.getValue({name: "custrecord_swbc_recive_ra"});
                oneConfig.soretInIqc = result.getValue({name: "custrecord_swbc_iqc_ra"});
                oneConfig.soretInPdaLabel = result.getValue({name: "custrecord_swbc_print_ra"});
                oneConfig.soretInIr = result.getValue({name: "custrecord_swbc_item_receipts_ra"});

                oneConfig.rawOutAutoShip = result.getValue({name: "custrecord_swbc_autoship_material_req"});
                oneConfig.rawOutFifo = result.getValue({name: "custrecord_swbc_first_material_requisiti"});

                oneConfig.fgInTurn = result.getValue({name: "custrecord_swbc_turnover_finished"});
                oneConfig.fgInRec = result.getValue({name: "custrecord_swbc_recive_finished"});
                oneConfig.fgInIqc = result.getValue({name: "custrecord_swbc_iqc_finished"});
                oneConfig.fgInBinPutaway = result.getValue({name: "custrecord_swbc_mulputaway_finished"});
                oneConfig.fgInIt = result.getValue({name: "custrecord_swbc_it_finished"});
                config[configId] = oneConfig;
                return true;
            });
            return config;
        }

        /**
         * 获取WMS翻译信息
         * @param {Object} options - 包含请求参数的对象
         * @param {string} options.type - 翻译的类型
         * @param {string} options.key - 需要翻译的键名
         * @returns {Promise<string>} 返回一个Promise，解析后得到翻译后的字符串
         * @description 通过给定的键名从翻译集合中获取翻译信息
         */
        function getWMSTranslation({type, key, langCode}) {
            var collection = type == "element" ? "custcollection_swms_element" : "custcollection_swms_prompt";
            if (langCode) return translation.get({collection: collection, key: key, locale: langCode})();
            return translation.get({collection: collection, key: key})();
        }

        /**
         * 获取WMS用户信息
         * @param param0 包含用户信息的对象
         * @param param0.userId 用户ID
         * @param param0.userName 用户名
         * @param param0.userPwd 用户密码
         * @returns 返回WMS用户信息的对象
         */
        function getWMSUserInfo({userId, userName, userPwd}) {
            var userInfo = {};
            var filters = [];
            if (userId) {
                SWCUtils.addFilter(filters, ["internalid", "anyof", userId])
            }
            if (userName) {
                SWCUtils.addFilter(filters, ["custentity_swc_wms_user", "is", userName])
            }
            if (userPwd) {
                SWCUtils.addFilter(filters, ["custentity_swc_wms_password", "is", userPwd])
            }
            var userSearchObj = search.create({
                type: "employee",
                filters: filters,
                columns: [
                    search.createColumn({name: "entityid", label: "名称"}),
                    search.createColumn({name: "custentity_swc_wms_user", label: "WMS用户名"}),
                    search.createColumn({name: "custentity_swc_wms_password", label: "WMS密码"}),
                    search.createColumn({name: "custentity_swc_wms_time_zone", label: "时区"}),
                    search.createColumn({name: "custrecord_swer_role", join: "CUSTRECORD_SWER_EMP", label: "WMS角色"})
                ]
            });
            userSearchObj.run().each(function (result) {
                userInfo.userId = Number(result.id);
                userInfo.userName = result.getValue({name: "custentity_swc_wms_user"});
                userInfo.timeZone = result.getValue({name: "custentity_swc_wms_time_zone"});
                var roleId = Number(result.getValue({name: "custrecord_swer_role", join: "CUSTRECORD_SWER_EMP"}));
                var roles = userInfo.roles = userInfo.roles || [];
                roleId && roles.push(roleId);
                return true;
            });
            return userInfo;
        }

        /**
         * 获取WMS角色信息
         * @param {Object} params 参数对象
         * @param {number} params.roleId 角色ID
         * @returns {Object} WMS角色信息对象
         */
        function getWMSRoleInfo({roleIds}) {
            var roleInfo = {};
            var filters = [["isinactive", "is", "F"]];
            if (roleIds) {
                SWCUtils.addFilter(filters, ["internalid", "anyof", roleIds])
            }
            var roleSearchObj = search.create({
                type: "customrecord_swc_wms_role",
                filters: filters,
                columns:
                    [
                        search.createColumn({name: "name", label: "名称"}),
                        search.createColumn({name: "custrecord_swr_subsidiary", label: "子公司"}),
                        search.createColumn({name: "custrecord_swr_location", label: "仓库"}),
                        search.createColumn({name: "custrecord_swr_feature", label: "功能"})
                    ]
            });
            roleSearchObj.run().each(function (result) {
                var roleId = result.id;
                roleInfo[roleId] = {
                    roleId: Number(roleId),
                    roleName: result.getValue({name: "name"}),
                    subsidiary: Number(result.getValue({name: "custrecord_swr_subsidiary"})),
                    subsidiaryName: result.getText({name: "custrecord_swr_subsidiary"}),
                    locations: result.getValue({name: "custrecord_swr_location"}).split(",") || [],
                    features: result.getValue({name: "custrecord_swr_feature"}).split(",") || []
                }
                return true;
            });
            return roleInfo;
        }

        /**
         * 获取位置信息
         * @param param0 包含位置ID的对象
         * @param param0.locIds 位置ID数组
         * @returns 返回位置信息的对象
         */
        function getLocInfo({locIds}) {
            var USEBIN = runtime.isFeatureInEffect({feature: "BINMANAGEMENT"});
            var locInfo = {};
            var filters = [["isinactive", "is", "F"]];
            if (locIds && locIds.length > 0) {
                SWCUtils.addFilter(filters, ["internalid", "anyof", locIds]);
            }
            var locationSearchObj = search.create({
                type: "location",
                filters: filters,
                columns: [
                    search.createColumn({name: "namenohierarchy", label: "名称（无层次结构）"}),
                    search.createColumn({name: "custrecord_swc_wms_defective", label: "WMS 不良品仓"}),
                    search.createColumn({name: "custrecord_swc_wms_defective_bin", label: "WMS 不良品库位"}),
                    search.createColumn({name: "custrecord_swc_wms_received", label: "WMS 收货仓"}),
                    search.createColumn({name: "custrecord_swc_wms_received_bin", label: "WMS 收货库位"}),
                    search.createColumn({name: "custrecord_swc_wms_to_received_bin", label: "WMS 调拨收货库位"}),
                    search.createColumn({name: "usesbins", label: "使用库位"})
                ]
            });
            locationSearchObj.run().each(function(result){
                var locId = result.id;
                if (locId) {
                    locInfo[locId] = {
                        locId: Number(locId),
                        locName: result.getValue({name: "namenohierarchy"}),
                        useBin: USEBIN ? result.getValue({name: "usesbins"}) : false,
                        defectiveLoc: Number(result.getValue({name: "custrecord_swc_wms_defective"})),
                        defectiveBin: Number(result.getValue({name: "custrecord_swc_wms_defective_bin"})),
                        receivedLoc: Number(result.getValue({name: "custrecord_swc_wms_received"})),
                        receivedBin: Number(result.getValue({name: "custrecord_swc_wms_received_bin"})),
                        toReceivedBin: Number(result.getValue({name: "custrecord_swc_wms_to_received_bin"}))
                    }
                }
                return true;
            });
            return locInfo;
        }


        /**
         * 将对象中的指定key对应的值（如果是对象）转换为数组形式。
         * @param obj 需要转换的对象。
         * @param keys 需要转换的key数组。
         * @returns 转换后的对象。
         */
        function transformObjToArr({obj, keys}) {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                if (keys.includes(key)) {
                    // 如果value是对象但不是数组，则转换为数组
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        result[key] = Object.keys(value).length === 0 ? [] : Object.values(transformObjToArr({obj:value, keys}));
                    } else if (Array.isArray(value)) {
                        // 如果value是数组，递归处理数组中的每个元素
                        result[key] = value.map(item => transformObjToArr({obj:value, keys}));
                    } else {
                        // 如果value不是对象或数组，则直接保留原值
                        result[key] = value;
                    }
                } else {
                    // 如果key不在keys中，直接复制键值对
                    if (typeof value === 'object' && value !== null) {
                        // 如果值是对象或数组，递归处理
                        result[key] = transformObjToArr({obj:value, keys});
                    } else {
                        // 如果值是基本类型，直接复制
                        result[key] = value;
                    }
                }
            }
            return result;
        }

        /**
         * 从搜索结果中获取分页信息
         * @param searchObj 搜索对象
         * @param page 页码
         * @param pagesize 每页大小，默认为20
         * @returns 返回分页结果
         */
        function getPageInfoFromSearch({searchObj, page, pageSize}) {
            // 每页大小，默认为20
            pageSize = pageSize || 20;
            var start = (Number(page) - 1) * Number(pageSize);
            var end = Number(start) + Number(pageSize);
            var resultset = searchObj.run();
            var results = resultset.getRange({
                start: start,
                end: end
            });
            return results;
        }

        /**
         * 根据数组、页数和每页大小获取分页信息
         * @param array 数组
         * @param page 页数
         * @param pageSize 每页大小，默认为20
         * @returns 返回分页信息
         */
        function getPageInfoFromArr({array, page, pageSize}) {
            // 每页大小，默认为20
            pageSize = pageSize || 20;
            // 计算起始索引
            let startIndex = (page - 1) * pageSize;
            // 计算结束索引（注意要包含当前页的最后一个元素）
            // 但不能超过数组的长度
            let endIndex = startIndex + pageSize - 1;
            endIndex = endIndex < array.length ? endIndex : array.length - 1;
            // 使用slice方法从数组中取出指定范围的元素
            return array.slice(startIndex, endIndex + 1);
        }

        /**
         * 获取WMS任务类型
         * @param {Object} options - 参数对象
         * @param {string} options.id - 任务类型ID
         * @param {string} options.taskType - 任务类型
         * @returns {Object} 返回WMS任务类型对象
         */
        function getWMSTaskType({id, taskType}) {
            var taskTypeObj = {};
            // 初始化过滤条件数组
            var filters = [["isinactive", "is", "F"]];
            if (id) {
                SWCUtils.addFilter(filters, ["internalid", "anyof", id]);
            }
            if (taskType) {
                SWCUtils.addFilter(filters, ["custrecord_swcm_encoding", "is", taskType]);
            }
            var taskTypeSearchObj = search.create({
                type: "customrecord_swc_wms_task_type",
                filters: filters,
                columns:
                    [
                        search.createColumn({name: "name", label: "名称"}),
                        search.createColumn({name: "custrecord_swcm_encoding", label: "类型编码"}),
                        search.createColumn({name: "custrecord_swcm_iconname", label: "图标名称"})
                    ]
            });
            taskTypeSearchObj.run().each(function(result){
                var id = result.id;
                var code = result.getValue({name: "custrecord_swcm_encoding"});
                taskTypeObj[code] = {
                    id: result.id,
                    code: code,
                    name: result.getValue({name: "name"}),
                    icon: result.getValue({name: "custrecord_swcm_iconname"})
                }
                taskTypeObj[id] = {
                    id: result.id,
                    code: code,
                    name: result.getValue({name: "name"}),
                    icon: result.getValue({name: "custrecord_swcm_iconname"})
                }
                return true;
            });
            return taskTypeObj;
        }

        /**
         * 获取子功能ID
         * @param options 包含任务类型和子功能参数的对象
         * @param options.taskType 任务类型
         * @param options.subFunction 子功能
         * @returns 返回子功能ID
         */
        function getSubFunction({taskType, subFunction}) {
            var subFunctionId = "";
            // 初始化过滤条件数组
            var filters = [["isinactive", "is", "F"]];
            if (taskType) {
                SWCUtils.addFilter(filters, ["custrecord_swf_type.custrecord_swcm_encoding", "is", taskType]);
            }
            if (subFunction) {
                SWCUtils.addFilter(filters, ["custrecord_swf_operation.custrecord_swpo_code", "is", subFunction]);
            }
            var functionauthoritySearchObj = search.create({
                type: "customrecord_swc_wms_functionauthority",
                filters: filters,
                columns: [search.createColumn({name: "custrecord_swf_operation", label: "操作"})]
            });
            functionauthoritySearchObj.run().each(function(result){
                subFunctionId = result.getValue({name: "custrecord_swf_operation"});
                return true;
            });
            return subFunctionId;
        }

        /**
         * 获取标签信息
         * @param param0 标签信息对象，包含标签ID和是否模糊查询
         * @param param0.labelId 标签ID
         * @param param0.fuzzy 是否进行模糊查询，默认为false
         * @returns 返回标签信息对象，键为标签ID，值为标签详情对象
         */
        function getLabelInfo({labelId, fuzzy, locs, isIn}) {
            var LOTNUMBER = runtime.isFeatureInEffect({feature: "LOTNUMBEREDINVENTORY"});
            var USEBIN = runtime.isFeatureInEffect({feature: "BINMANAGEMENT"});
            var link = fuzzy ? "contains" : "is";
            var labelInfo = {};
            var iqcMode = getIQCMode();
            // 初始化过滤条件数组
            var filters = [["isinactive", "is", "F"]];
            if (labelId) {
                SWCUtils.addFilter(filters, ["custrecord_swll_labelid", link, labelId]);
            }
            if (locs) {
                SWCUtils.addFilter(filters, ["custrecord_swll_location", "anyof", locs]);
            }
            if (isIn) {
                SWCUtils.addFilter(filters, ["custrecord_swll_out_time", "isempty", ""]);
            }
            var columns = [
                search.createColumn({name: "custrecord_swll_labelid", label: "标签ID"}),
                search.createColumn({name: "custrecord_swll_item", label: "货品"}),
                search.createColumn({name: "displayname", join: "CUSTRECORD_SWLL_ITEM", label: "显示名称"}),
                search.createColumn({name: "upccode", join: "CUSTRECORD_SWLL_ITEM", label: "UPC 代码"}),
                search.createColumn({name: "custitem_swc_old_material", join: "CUSTRECORD_SWLL_ITEM", label: "旧料号"}),
                search.createColumn({name: "custitem_swc_wms_iqc_mode", join: "CUSTRECORD_SWLL_ITEM", label: "WMS 质检模式"}),
                search.createColumn({name: "custrecord_swll_lotnumber_serialize", label: "序列号/批次"}),
                search.createColumn({name: "custrecord_swll_quantity", label: "数量"}),
                search.createColumn({name: "custrecord_swll_unit", label: "单位"}),
                search.createColumn({name: "custrecord_swll_location", label: "仓库"}),
                search.createColumn({name: "usesbins", join: "CUSTRECORD_SWLL_LOCATION", label: "使用库位"}),
                search.createColumn({name: "custrecord_swll_bin", label: "库位"}),
                search.createColumn({name: "custrecord_swll_print_user", label: "打印用户"}),
                search.createColumn({name: "custrecord_swll_in_time", label: "入库时间"}),
                search.createColumn({name: "custrecord_swll_in_user", label: "入库用户"}),
                search.createColumn({name: "custrecord_swll_out_time", label: "出库时间"}),
                search.createColumn({name: "custrecord_swll_out_user", label: "出库用户"}),
                search.createColumn({name: "custrecord_swll_task", label: "仓储任务"}),
                search.createColumn({name: "custrecord_swll_line", label: "行号"})
            ];
            if (LOTNUMBER) {
                columns.push(search.createColumn({name: "islotitem", join: "CUSTRECORD_SWLL_ITEM", label: "是批号管理货品"}));
                columns.push(search.createColumn({name: "isserialitem", join: "CUSTRECORD_SWLL_ITEM", label: "是序列号管理货品"}));
            }
            var labelSearchObj = search.create({
                type: "customrecord_swc_wms_label_list",
                filters: filters,
                columns: columns
            });
            SWCUtils.getAllResults({
                searchObj: labelSearchObj,
                cb: function (result) {
                    var labelId = result.getValue({name: "custrecord_swll_labelid"});
                    var iqc = result.getValue({name: "custitem_swc_wms_iqc_mode", join: "CUSTRECORD_SWLL_ITEM"});
                    labelInfo[labelId] = {
                        id: Number(result.id),
                        labelId: labelId,
                        item: Number(result.getValue({name: "custrecord_swll_item"})),
                        itemName: result.getValue({name: "displayname", join: "CUSTRECORD_SWLL_ITEM"}),
                        itemCode: result.getValue({name: "upccode", join: "CUSTRECORD_SWLL_ITEM"}),
                        oldItemCode: result.getValue({name: "custitem_swc_old_material", join: "CUSTRECORD_SWLL_ITEM"}),
                        isLot: LOTNUMBER ? result.getValue({name: "islotitem", join: "CUSTRECORD_SWLL_ITEM"}) : false,
                        isSerial: LOTNUMBER ? result.getValue({name: "isserialitem", join: "CUSTRECORD_SWLL_ITEM"}) : false,
                        skipQC: iqcMode?.[iqc]?.skipQC || false,
                        num: result.getValue({name: "custrecord_swll_lotnumber_serialize"}),
                        quantity: Number(result.getValue({name: "custrecord_swll_quantity"})),
                        unit: Number(result.getValue({name: "custrecord_swll_unit"})),
                        unitName: result.getText({name: "custrecord_swll_unit"}),
                        location: Number(result.getValue({name: "custrecord_swll_location"})),
                        locName: result.getText({name: "custrecord_swll_location"}),
                        locUseBin: USEBIN ? result.getValue({name: "usesbins", join: "CUSTRECORD_SWLL_LOCATION"}) : false,
                        bin: Number(result.getValue({name: "custrecord_swll_bin"})),
                        binName: result.getText({name: "custrecord_swll_bin"}),
                        printUser: Number(result.getValue({name: "custrecord_swll_print_user"})),
                        inTime: result.getValue({name: "custrecord_swll_in_time"}),
                        inUser: Number(result.getValue({name: "custrecord_swll_in_user"})),
                        outTime: result.getValue({name: "custrecord_swll_out_time"}),
                        outUser: Number(result.getValue({name: "custrecord_swll_out_user"})),
                        taskId: Number(result.getValue({name: "custrecord_swll_task"})),
                        lineId: Number(result.getValue({name: "custrecord_swll_line"}))
                    }
                }
            })
            return labelInfo;
        }

        /**
         * 获取货品信息
         * @param param0 货品信息对象，包含货品编码和是否模糊查询
         * @param param0.itemCode 货品编码
         * @param param0.fuzzy 是否进行模糊查询，默认为false
         * @returns 返回商品信息对象，键为商品编码，值为商品详情对象
         */
        function getItemInfo({itemCode, fuzzy, langCode}) {
            var LOTNUMBER = runtime.isFeatureInEffect({feature: "LOTNUMBEREDINVENTORY"});
            var USEBIN = runtime.isFeatureInEffect({feature: "BINMANAGEMENT"});
            var link = fuzzy ? "contains" : "is";
            var itemInfo = {};
            var iqcMode = getIQCMode();
            // 初始化过滤条件数组
            var filters = [["isinactive", "is", "F"]];
            if (langCode) {
                SWCUtils.addFilter(filters, ["language", "anyof", "@NONE@", langCode]);
            }
            if (itemCode) {
                SWCUtils.addFilter(filters, ["upccode", link, itemCode]);
            }
            var columns = [
                search.createColumn({name: "upccode", label: "UPC 代码"}),
                search.createColumn({name: "itemid", label: "名称"}),
                search.createColumn({name: "custitem_swc_old_material", label: "旧料号"}),
                search.createColumn({name: "displayname", label: "显示名称"}),
                search.createColumn({name: "displaynametranslated", label: "显示名称"}),
                search.createColumn({name: "unitstype", label: "主要单位类型"}),
                search.createColumn({name: "stockunit", label: "Primary Stock Unit"}),
                search.createColumn({name: "custitem_swc_wms_iqc_mode", label: "WMS Inspection Mode"})
            ]
            if (LOTNUMBER) {
                columns.push(search.createColumn({name: "islotitem", label: "是批号管理货品"}));
                columns.push(search.createColumn({name: "isserialitem", label: "是序列号管理货品"}));
            }
            if (USEBIN) {
                columns.push(search.createColumn({name: "usebins", label: "使用库位"}));
            }
            var itemSearchObj = search.create({
                type: "item",
                filters: filters,
                columns: columns
            });
            SWCUtils.getAllResults({
                searchObj: itemSearchObj,
                cb: function (result) {
                    var itemCode = result.getValue({name: "upccode"});
                    var iqc = result.getValue({name: "custitem_swc_wms_iqc_mode"});
                    itemInfo[itemCode] = {
                        id: Number(result.id),
                        code: itemCode,
                        oldCode: result.getValue({name: "custitem_swc_old_material"}),
                        name: result.getValue({name: "displaynametranslated"}) ||
                            result.getValue({name: "displayname"}) ||
                            result.getValue({name: "itemid"}),
                        isLot: LOTNUMBER ? result.getValue({name: "islotitem"}) : false,
                        isSerial: LOTNUMBER ? result.getValue({name: "isserialitem"}) : false,
                        useBin: USEBIN ? result.getValue({name: "usebins"}) : false,
                        unit: result.getValue({name: "unitstype"}),
                        stockUnit: Number(result.getValue({name: "stockunit"})),
                        stockUnitName: result.getText({name: "stockunit"}),
                        skipQC: iqcMode?.[iqc]?.skipQC || false
                    }
                }
            })
            return itemInfo;
        }


        /**
         * 获取库位信息
         * @param param0 库位信息对象
         * @param param0.binNum 库位号
         * @param param0.fuzzy 是否进行模糊查询，默认为false
         * @param param0.locs 地点列表，用于筛选库位所属地点
         * @returns 返回库位信息对象，键为库位ID，值为库位详情对象
         */
        function getBinInfo({bin, binNum, fuzzy, locs}) {
            var link = fuzzy ? "contains" : "is";
            var binInfo = {};
            // 初始化过滤条件数组
            var filters = [["inactive", "is", "F"]];
            if (bin) {
                SWCUtils.addFilter(filters, ["internalid", "anyof", bin]);
            }
            if (binNum) {
                SWCUtils.addFilter(filters, ["binnumber", link, binNum]);
            }
            if (locs) {
                SWCUtils.addFilter(filters, ["location", "anyof", locs]);
            }
            var binSearchObj = search.create({
                type: "bin",
                filters: filters,
                columns:
                    [
                        search.createColumn({name: "binnumber", label: "库位号"}),
                        search.createColumn({name: "location", label: "地点"}),
                        search.createColumn({name: "custrecord_swc_wms_zone", label: "WMS 区域"}),
                        search.createColumn({name: "custrecord_swc_wms_arrow_direction", label: "WMS 箭头方向"})
                    ]
            });
            SWCUtils.getAllResults({
                searchObj: binSearchObj,
                cb: function (result) {
                    var binId = result.id;
                    binInfo[binId] = {
                        bin: Number(result.id),
                        binName: result.getValue({name: "binnumber"}),
                        loc: Number(result.getValue({name: "location"})),
                        locName: result.getText({name: "location"}),
                        zone: result.getValue({name: "custrecord_swc_wms_zone"}),
                        arrow: result.getValue({name: "custrecord_swc_wms_arrow_direction"})
                    }
                }
            })
            return binInfo;
        }


        /**
         * 获取质检模式
         * @returns 返回IQC模式对象，包含id、名称和是否免检等属性
         */
        function getIQCMode() {
            var iqcMode = {};
            var customrecord_swc_wms_iqc_modeSearchObj = search.create({
                type: "customrecord_swc_wms_iqc_mode",
                filters: [["isinactive","is","F"]],
                columns:
                    [
                        search.createColumn({name: "name", label: "名称"}),
                        search.createColumn({name: "custrecord_swim_item_exemption", label: "是否免检"})
                    ]
            });
            customrecord_swc_wms_iqc_modeSearchObj.run().each(function(result){
                iqcMode[result.id] = {
                    id: result.id,
                    name: result.getValue({name: "name"}),
                    skipQC: result.getValue({name: "custrecord_swim_item_exemption"})
                }
                return true;
            });
            return iqcMode;
        }


        /**
         * 获取库存余额
         * @param {Object} params - 参数对象
         * @param {string} params.itemCode - 货品编码，支持模糊匹配
         * @param {boolean} params.fuzzy - 是否模糊匹配货品编码
         * @param {string[]} params.subs - 子公司数组
         * @param {string[]} params.locs - 地点数组
         * @returns {Object} 库存余额信息对象
         */
        function getInventoryBalance({itemCode, itemId, num, fuzzy, subs, locs, bins, langCode}) {
            var ADVMGMT = runtime.isFeatureInEffect({feature: "ADVBINSERIALLOTMGMT"});
            var link = fuzzy ? "contains" : "is";
            var inventoryInfo = {};
            var iqcMode = getIQCMode();
            if (ADVMGMT) {
                // 初始化过滤条件数组
                var LOTNUMBER = runtime.isFeatureInEffect({feature: "LOTNUMBEREDINVENTORY"});
                var USEBIN = runtime.isFeatureInEffect({feature: "BINMANAGEMENT"});
                var check = runtime.isFeatureInEffect({feature: "INVENTORYSTATUS"});
                var filters = [['available', 'greaterthan', '0']];
                if (check) {
                    SWCUtils.addFilter(filters, ["status", "anyof", "1"]);
                }
                /*if (langCode) {
                    SWCUtils.addFilter(filters, ["item.language", "anyof", "@NONE@", langCode]);
                }*/
                if (itemCode) {
                    SWCUtils.addFilter(filters, ["item.upccode", link, itemCode]);
                }
                if (itemId) {
                    SWCUtils.addFilter(filters, ["item", "anyof", itemId]);
                }
                if (LOTNUMBER && num) {
                    SWCUtils.addFilter(filters, ["inventorynumber.inventorynumber", "is", num]);
                }
                if (subs) {
                    SWCUtils.addFilter(filters, ["location.subsidiary", "anyof", subs]);
                }
                if (locs) {
                    SWCUtils.addFilter(filters, ["location", "anyof", locs]);
                }
                if (bins) {
                    SWCUtils.addFilter(filters, ["binnumber", "anyof", bins]);
                }
                var columns = [
                    search.createColumn({name: "location", label: "地点"}),
                    search.createColumn({name: "usesbins", join: "location", label: "使用库位"}),
                    search.createColumn({name: "item", label: "货品"}),
                    search.createColumn({name: "itemid", join: "item", label: "名称"}),
                    search.createColumn({name: "displayname", join: "item", label: "显示名称"}),
                    search.createColumn({name: "displaynametranslated", join: "item", label: "显示名称"}),
                    search.createColumn({name: "upccode", join: "item", label: "UPC 代码"}),
                    search.createColumn({name: "custitem_swc_old_material", join: "item", label: "旧料号"}),
                    search.createColumn({name: "custitem_swc_wms_iqc_mode", join: "item", label: "WMS 质检模式"}),
                    search.createColumn({name: "stockunit", join: "item", label: "主要库存单位"}),
                    search.createColumn({name: "inventorynumber", label: "库存编号"}),
                    search.createColumn({name: "binnumber", label: "库位号"}),
                    search.createColumn({name: "available", label: "可用"})
                ];
                if (LOTNUMBER) {
                    columns.push(search.createColumn({name: "islotitem", join: "item", label: "是批号管理货品"}));
                    columns.push(search.createColumn({name: "isserialitem", join: "item", label: "是序列号管理货品"}));
                }
                var inventorySearchObj = search.create({
                    type: "inventorybalance",
                    filters: filters,
                    columns: columns
                });
                SWCUtils.getAllResults({
                    searchObj: inventorySearchObj,
                    cb: function (result) {
                        var locId = Number(result.getValue({name: "location"}));
                        var locInfo = inventoryInfo[locId] = inventoryInfo[locId] || {};
                        locInfo.loc = locId;
                        locInfo.locName = result.getText({name: "location"});
                        locInfo.usesbins = USEBIN ? result.getValue({name: "usesbins", join: "location"}) : false;
                        locInfo.items = locInfo.items || {};
                        var itemId = Number(result.getValue({name: "item"}));
                        var itemInfo = locInfo.items[itemId] = locInfo.items[itemId] || {};
                        itemInfo.itemId = itemId;
                        itemInfo.itemName = result.getValue({name: "displaynametranslated", join: "item"}) ||
                            result.getValue({name: "displayname", join: "item"}) ||
                            result.getValue({name: "itemid", join: "item"});
                        itemInfo.itemCode = result.getValue({name: "upccode", join: "item"});
                        itemInfo.oldItemCode = result.getValue({name: "custitem_swc_old_material", join: "item"});
                        itemInfo.isLot = LOTNUMBER ? result.getValue({name: "islotitem", join: "item"}) : false;
                        itemInfo.isSerial = LOTNUMBER ? result.getValue({name: "isserialitem", join: "item"}) : false;
                        var iqc = result.getValue({name: "custitem_swc_wms_iqc_mode", join: "item"});
                        itemInfo.skipQC = iqcMode?.[iqc]?.skipQC || false;
                        itemInfo.unit = Number(result.getValue({name: "stockunit", join: "item"}));
                        itemInfo.unitName = result.getText({name: "stockunit", join: "item"});
                        var qty = Number(result.getValue({name: "available"}));
                        var itemQty = itemInfo.q = itemInfo.q || 0;
                        itemQty += qty;
                        itemInfo.q = itemQty;
                        itemInfo.nums = itemInfo.nums || {};
                        var num = result.getText({name: "inventorynumber"}) || "";
                        var numInfo = itemInfo.nums[num] = itemInfo.nums[num] || {};
                        numInfo.num = num;
                        var numQty = numInfo.q = numInfo.q || 0;
                        numQty += qty;
                        numInfo.q = numQty;
                        numInfo.bins = numInfo.bins || {};
                        var bin = Number(result.getValue({name: "binnumber"}));
                        var binInfo = numInfo.bins[bin] = numInfo.bins[bin] || {};
                        binInfo.bin = bin;
                        binInfo.binName = result.getText({name: "binnumber"});
                        var binQty = binInfo.q = binInfo.q || 0;
                        binQty += qty;
                        binInfo.q = binQty;
                        binInfo.tags = {};
                    }
                })
            } else {
                var filters = [];
                if (langCode) {
                    SWCUtils.addFilter(filters, ["language", "anyof", "@NONE@", langCode]);
                }
                if (itemCode) {
                    SWCUtils.addFilter(filters, ["upccode", link, itemCode]);
                }
                if (subs) {
                    SWCUtils.addFilter(filters, ["inventorylocation.subsidiary", "anyof", subs]);
                }
                if (locs) {
                    SWCUtils.addFilter(filters, ["inventorylocation", "anyof", locs]);
                }
                var columns = [
                    search.createColumn({name: "inventorylocation", label: "地点"}),
                    search.createColumn({name: "itemid", label: "名称"}),
                    search.createColumn({name: "displayname", label: "显示名称"}),
                    search.createColumn({name: "displaynametranslated", label: "显示名称"}),
                    search.createColumn({name: "upccode", label: "UPC 代码"}),
                    search.createColumn({name: "custitem_swc_old_material", label: "旧料号"}),
                    search.createColumn({name: "custitem_swc_wms_iqc_mode", label: "WMS 质检模式"}),
                    search.createColumn({name: "stockunit", label: "主要库存单位"}),
                    search.createColumn({name: "locationquantityavailable", label: "可用"})
                ];
                var itemSearchObj = search.create({
                    type: "item",
                    filters: filters,
                    columns: columns
                });
                SWCUtils.getAllResults({
                    searchObj: itemSearchObj,
                    cb: function (result) {
                        var locId = Number(result.getValue({name: "inventorylocation"}));
                        var locInfo = inventoryInfo[locId] = inventoryInfo[locId] || {};
                        locInfo.loc = locId;
                        locInfo.locName = result.getText({name: "inventorylocation"});
                        locInfo.usesbins = false;
                        locInfo.items = locInfo.items || {};
                        var itemId = Number(result.id);
                        var itemInfo = locInfo.items[itemId] = locInfo.items[itemId] || {};
                        itemInfo.itemId = itemId;
                        itemInfo.itemName = result.getValue({name: "displaynametranslated"}) ||
                            result.getValue({name: "displayname"}) ||
                            result.getValue({name: "itemid"});
                        itemInfo.itemCode = result.getValue({name: "upccode"});
                        itemInfo.oldItemCode = result.getValue({name: "custitem_swc_old_material"});
                        itemInfo.isLot = false;
                        itemInfo.isSerial = false;
                        var iqc = result.getValue({name: "custitem_swc_wms_iqc_mode"});
                        itemInfo.skipQC = iqcMode?.[iqc]?.skipQC || false;
                        itemInfo.unit = Number(result.getValue({name: "stockunit"}));
                        itemInfo.unitName = result.getText({name: "stockunit"});
                        var qty = Number(result.getValue({name: "locationquantityavailable"}));
                        var itemQty = itemInfo.q = itemInfo.q || 0;
                        itemQty += qty;
                        itemInfo.q = itemQty;
                        itemInfo.nums = itemInfo.nums || {};
                        var num = "";
                        var numInfo = itemInfo.nums[num] = itemInfo.nums[num] || {};
                        numInfo.num = num;
                        var numQty = numInfo.q = numInfo.q || 0;
                        numQty += qty;
                        numInfo.q = numQty;
                        numInfo.bins = numInfo.bins || {};
                        var bin = 0;
                        var binInfo = numInfo.bins[bin] = numInfo.bins[bin] || {};
                        binInfo.bin = bin;
                        binInfo.binName = "";
                        var binQty = binInfo.q = binInfo.q || 0;
                        binQty += qty;
                        binInfo.q = binQty;
                        binInfo.tags = {};
                    }
                })
            }
            return inventoryInfo;
        }

        /**
         * 创建或更新JSON记录
         * @param options 选项对象
         * @param options.jsonRecId JSON记录ID，若存在则更新记录，否则创建新记录
         * @param options.json JSON数据
         * @param options.userId 用户ID
         * @param options.taskType 任务类型
         * @param options.subFunction 子功能
         * @param options.saveOrSubmit 保存或提交，可选值为SAVE或SUBMIT
         */
        function createOrUpdateJsonRec(options) {
            var jsonRecId = options.jsonRecId;
            if (jsonRecId) {
                updateJsonRec(options);
            } else {
                jsonRecId = createJsonRec(options);
            }
            return jsonRecId;
        }

        /**
         * 更新JSON记录
         * @param options 选项对象
         * @param options.jsonRecId JSON记录ID
         * @param options.json JSON数据
         * @param options.userId 用户ID
         * @param options.saveOrSubmit 保存或提交，可选值为SAVE或SUBMIT
         */
        function updateJsonRec(options) {
            var {jsonRecId, json, userId, saveOrSubmit, externalId} = options;
            var jsonRec = record.load({type: "customrecord_swc_wms_json", id: jsonRecId, isDynamic: true});
            externalId && jsonRec.setValue({fieldId: "externalid", value: externalId});
            jsonRec.setValue({fieldId: "custrecord_swj_json", value: json});
            jsonRec.setValue({fieldId: "custrecord_swj_operator", value: userId});
            if (saveOrSubmit == "SAVE") {
                jsonRec.setValue({fieldId: "custrecord_swj_save_submit", value: 1}); // 保存
            } else {
                jsonRec.setValue({fieldId: "custrecord_swj_save_submit", value: 2}); // 提交
                jsonRec.setValue({fieldId: "custrecord_swj_status", value: 1}); // 待生成
            }
            jsonRec.save();
        }

        /**
         * 创建 JSON 记录
         * @param options 选项对象
         * @param options.taskId 任务ID
         * @param options.json JSON 数据
         * @param options.userId 用户ID
         * @param options.taskType 任务类型
         * @param options.subFunction 子功能
         * @param options.saveOrSubmit 保存或提交，可选值为SAVE或SUBMIT
         */
        function createJsonRec(options) {
            var {taskId, json, userId, taskType, subFunction, saveOrSubmit, externalId} = options;
            var jsonRec = record.create({type: "customrecord_swc_wms_json", isDynamic: true});
            externalId && jsonRec.setValue({fieldId: "externalid", value: externalId});
            taskId && jsonRec.setValue({fieldId: "custrecord_swj_task", value: taskId});
            json && jsonRec.setValue({fieldId: "custrecord_swj_json", value: json});
            userId && jsonRec.setValue({fieldId: "custrecord_swj_operator", value: userId});
            taskType && jsonRec.setValue({fieldId: "custrecord_swj_type", value: taskType});
            subFunction && jsonRec.setValue({fieldId: "custrecord_swj_operation", value: subFunction});
            if (saveOrSubmit == "SAVE") {
                jsonRec.setValue({fieldId: "custrecord_swj_save_submit", value: 1}); // 保存
            } else {
                jsonRec.setValue({fieldId: "custrecord_swj_save_submit", value: 2}); // 提交
                jsonRec.setValue({fieldId: "custrecord_swj_status", value: 1}); // 待生成
            }
            return jsonRec.save();
        }

        /**
         * 根据任务ID、任务类型、子功能及语言代码获取WMS任务信息
         * @param {object} param0 - 包含了任务ID、任务类型、子功能及语言代码的对象
         * @param {number} param0.taskId - 任务ID
         * @param {string} param0.taskType - 任务类型
         * @param {string} param0.subFunction - 子功能
         * @param {string} param0.langCode - 语言代码
         * @returns {object} - WMS任务信息
         */
        function getWMSTaskInfo({taskId, taskType, subFunction, langCode}) {
            var LOTNUMBER = runtime.isFeatureInEffect({feature: "LOTNUMBEREDINVENTORY"});
            var USEBIN = runtime.isFeatureInEffect({feature: "BINMANAGEMENT"});
            var taskInfo = {};
            var iqcMode = getIQCMode();
            var itemsInfo = {};
            // 初始化过滤条件数组
            var filters = [
                ["isinactive", "is", "F"],
                "AND",
                ["custrecord_swtd_task.custrecord_swt_status", "anyof", "2"],
                "AND",
                ["custrecord_swtd_closed", "is", "F"]
            ];
            // 语言代码
            /*if (langCode) {
                SWCUtils.addFilter(filters, ["custrecord_swtd_item_number.language", "anyof", "@NONE@", langCode]);
            }*/
            // 任务ID
            if (taskId) {
                SWCUtils.addFilter(filters, ["custrecord_swtd_task", "anyof", taskId]);
            }
            // 子功能
            if (subFunction) {
                if (subFunction == "REC") {
                    SWCUtils.addFilter(filters, ["custrecord_swtd_status_receive", "anyof", "1","2"]);
                } else if (subFunction == "IQC") {
                    SWCUtils.addFilter(filters, ["custrecord_swtd_status_iqc", "anyof", "1","2"]);
                } else if (subFunction == "TPUTAWAY") {
                    SWCUtils.addFilter(filters, ["custrecord_swtd_status_receive_pa", "anyof", "1","2"]);
                } else if (subFunction == "PICK") {
                    SWCUtils.addFilter(filters, ["custrecord_swtd_status_picked", "anyof", "1","2"]);
                } else if (subFunction == "SHIP") {
                    SWCUtils.addFilter(filters, ["custrecord_swtd_status_shipped", "anyof", "1","2"]);
                }
            }
            var columns = [
                search.createColumn({name: "custrecord_swtd_task", label: "仓储任务编号"}),
                search.createColumn({name: "custrecord_swt_type", join: "CUSTRECORD_SWTD_TASK", label: "任务类型"}),
                search.createColumn({name: "custrecord_swt_subsidiary", join: "CUSTRECORD_SWTD_TASK", label: "子公司"}),
                search.createColumn({name: "custrecord_swt_turnover_ro", join: "CUSTRECORD_SWTD_TASK", label: "任务部分完成可流转至后续节点"}),
                search.createColumn({name: "custrecord_swt_location", join: "CUSTRECORD_SWTD_TASK", label: "仓库"}),
                search.createColumn({name: "custrecord_swt_usebin", join: "CUSTRECORD_SWTD_TASK", label: "启用库位"}),
                search.createColumn({name: "custrecord_swtd_wo_location", label: "工单仓库"}),
                search.createColumn({name: "custrecord_swtd_wo_bins", label: "工单库位"}),
                search.createColumn({name: "id", label: "ID"}),
                search.createColumn({name: "tranid", join: "CUSTRECORD_SWTD_TRANSACTION_ID", label: "文档编号"}),
                search.createColumn({name: "custrecord_swtd_transaction_id", label: "事务处理编号"}),
                search.createColumn({name: "custrecord_swt_receivetask_id", join: "CUSTRECORD_SWTD_TASK", label: "到货任务单编号"}),
                search.createColumn({name: "custrecord_swt_deliverynotice_id", join: "CUSTRECORD_SWTD_TASK", label: "发货通知单编号"}),
                search.createColumn({name: "custrecord_swt_mrep_id", join: "CUSTRECORD_SWTD_TASK", label: "领料单编号"}),
                search.createColumn({name: "custrecord_swt_mret_id", join: "CUSTRECORD_SWTD_TASK", label: "退料单编号"}),
                search.createColumn({name: "custrecord_swt_otherid", join: "CUSTRECORD_SWTD_TASK", label: "其他出入库单编号"}),
                search.createColumn({name: "custrecord_swt_reportid", join: "CUSTRECORD_SWTD_TASK", label: "报工单编号"}),
                search.createColumn({name: "custrecord_swtd_receivetask_detailid", label: "到货任务明细编号"}),
                search.createColumn({name: "custrecord_swtd_deliverynotice_detailid", label: "发货通知明细编号"}),
                search.createColumn({name: "custrecord_swtd_mrep_detail_id", label: "工单领料明细编号"}),
                search.createColumn({name: "custrecord_swtd_mret_detail_id", label: "工单退料明细编号"}),
                search.createColumn({name: "custrecord_swtd_otherid", label: "其他出入库单编号"}),
                search.createColumn({name: "custrecord_swtd_reportid", label: "报工单编号"}),
                search.createColumn({name: "custrecord_swtd_line_number", label: "行号"}),
                search.createColumn({name: "custrecord_swtd_item_number", label: "货品名称/编号"}),
                search.createColumn({name: "itemid", join: "CUSTRECORD_SWTD_ITEM_NUMBER", label: "货品名称/编号"}),
                search.createColumn({name: "custitem_swc_old_material", join: "CUSTRECORD_SWTD_ITEM_NUMBER", label: "旧料号"}),
                search.createColumn({name: "displayname", join: "CUSTRECORD_SWTD_ITEM_NUMBER", label: "显示名称"}),
                search.createColumn({name: "displaynametranslated", join: "CUSTRECORD_SWTD_ITEM_NUMBER", label: "显示名称"}),
                search.createColumn({name: "upccode", join: "CUSTRECORD_SWTD_ITEM_NUMBER", label: "UPC 代码"}),
                search.createColumn({name: "custitem_swc_wms_iqc_mode", join: "CUSTRECORD_SWTD_ITEM_NUMBER", label: "WMS 质检模式"}),
                search.createColumn({name: "custitem_swc_co_consumption", join: "CUSTRECORD_SWTD_ITEM_NUMBER", label: "共耗料"}),
                search.createColumn({name: "custrecord_swtd_unit", label: "单位"}),
                search.createColumn({name: "custrecord_swtd_quantity_receive", label: "应收货数量"}),
                search.createColumn({name: "custrecord_swtd_actual_quantity_receive", label: "实际收货数量"}),
                search.createColumn({name: "custrecord_swtd_quantity_iqc", label: "应质检数量"}),
                search.createColumn({name: "custrecord_swtd_actual_quantity_iqc", label: "实际质检数量"}),
                search.createColumn({name: "custrecord_swtd_defective_quantity", label: "不良品数量"}),
                search.createColumn({name: "custrecord_swtd_quantity_pa", label: "应上架数量"}),
                search.createColumn({name: "custrecord_swtd_actual_quantity_pa", label: "实际上架数量"}),
                search.createColumn({name: "custrecord_swtd_quantity_picked", label: "应拣货数量"}),
                search.createColumn({name: "custrecord_swtd_actual_quantity_picked", label: "实际拣货数量"}),
                search.createColumn({name: "custrecord_swtd_quantity_shipped", label: "应发货数量"}),
                search.createColumn({name: "custrecord_swtd_actual_quantity_shipped", label: "实际发货数量"}),
                search.createColumn({name: "custrecord_swtd_detail_json", label: "详细信息JSON"}),
                search.createColumn({name: "custrecord_swtd_status_receive", label: "收货状态"}),
                search.createColumn({name: "custrecord_swtd_status_iqc", label: "质检状态"}),
                search.createColumn({name: "custrecord_swtd_status_receive_pa", label: "上架状态"}),
                search.createColumn({name: "custrecord_swtd_status_picked", label: "拣货状态"}),
                search.createColumn({name: "custrecord_swtd_status_shipped", label: "发货状态"})
            ]
            if (LOTNUMBER) {
                columns.push(search.createColumn({name: "islotitem", join: "CUSTRECORD_SWTD_ITEM_NUMBER", label: "是批号管理货品"}));
                columns.push(search.createColumn({name: "isserialitem", join: "CUSTRECORD_SWTD_ITEM_NUMBER", label: "是序列号管理货品"}));
            }
            var wmsTaskSearchObj = search.create({
                type: "customrecord_swc_wms_task_detail",
                filters: filters,
                columns: columns
            });
            var taskSkipQC = true;
            SWCUtils.getAllResults({
                searchObj: wmsTaskSearchObj,
                cb: function (result) {
                    taskInfo.taskId = Number(result.getValue({name: "custrecord_swtd_task"}));
                    taskInfo.taskType = taskType;
                    taskInfo.subsidiary = Number(result.getValue({name: "custrecord_swt_subsidiary", join: "CUSTRECORD_SWTD_TASK"}));
                    taskInfo.subsidiaryName = result.getText({name: "custrecord_swt_subsidiary", join: "CUSTRECORD_SWTD_TASK"});
                    var woBin = Number(result.getValue({name: "custrecord_swtd_wo_bins"}));
                    taskInfo.woBin = woBin;
                    taskInfo.woBinName = result.getText({name: "custrecord_swtd_wo_bins"});
                    var iqc = result.getValue({name: "custitem_swc_wms_iqc_mode", join: "CUSTRECORD_SWTD_ITEM_NUMBER"});
                    var itemSkipQC = iqcMode[iqc] ? iqcMode[iqc].skipQC : false;
                    if (!itemSkipQC) taskSkipQC = false;
                    taskInfo.parallel = result.getValue({name: "custrecord_swt_turnover_ro", join: "CUSTRECORD_SWTD_TASK"});
                    taskInfo.locs = taskInfo.locs || {};
                    var loc = Number(result.getValue({name: "custrecord_swt_location", join: "CUSTRECORD_SWTD_TASK"}));
                    var locName = result.getText({name: "custrecord_swt_location", join: "CUSTRECORD_SWTD_TASK"});
                    var locUseBin = USEBIN ? result.getValue({name: "custrecord_swt_usebin", join: "CUSTRECORD_SWTD_TASK"}) : false;
                    var woLoc = Number(result.getValue({name: "custrecord_swtd_wo_location"}));
                    var woLocName = result.getText({name: "custrecord_swtd_wo_location"});
                    var woLocUseBin = woBin ? true : false;
                    var {fromLoc, fromLocName, fromLocUseBin, toLoc, toLocName, toLocUseBin} = parseLocInfoByTaskType({loc, locName, locUseBin, woLoc, woLocName, woLocUseBin, taskType})
                    var locKey = `${fromLoc}_${toLoc}`;
                    var locInfo = taskInfo.locs[locKey] = taskInfo.locs[locKey] || {};
                    locInfo.fromLoc = fromLoc;
                    locInfo.fromLocName = fromLocName;
                    locInfo.fromLocUseBin = fromLocUseBin;
                    locInfo.toLoc = toLoc;
                    locInfo.toLocName = toLocName;
                    locInfo.toLocUseBin = toLocUseBin;
                    locInfo.lines = locInfo.lines || {};
                    var lineId = Number(result.getValue({name: "id"}));
                    var lineInfo = locInfo.lines[lineId] = locInfo.lines[lineId] || {};
                    lineInfo.lineId = lineId;
                    lineInfo.tranNum = result.getText({name: "custrecord_swt_receivetask_id", join: "CUSTRECORD_SWTD_TASK"}) ||
                        result.getText({name: "custrecord_swt_deliverynotice_id", join: "CUSTRECORD_SWTD_TASK"}) ||
                        result.getText({name: "custrecord_swt_mrep_id", join: "CUSTRECORD_SWTD_TASK"}) ||
                        result.getText({name: "custrecord_swt_mret_id", join: "CUSTRECORD_SWTD_TASK"}) ||
                        result.getText({name: "custrecord_swt_otherid", join: "CUSTRECORD_SWTD_TASK"}) ||
                        result.getText({name: "custrecord_swt_reportid", join: "CUSTRECORD_SWTD_TASK"}) ||
                        result.getValue({name: "tranid", join: "CUSTRECORD_SWTD_TRANSACTION_ID"});
                    lineInfo.tranId = Number(result.getValue({name: "custrecord_swt_receivetask_id", join: "CUSTRECORD_SWTD_TASK"}) ||
                        result.getValue({name: "custrecord_swt_deliverynotice_id", join: "CUSTRECORD_SWTD_TASK"}) ||
                        result.getValue({name: "custrecord_swt_mrep_id", join: "CUSTRECORD_SWTD_TASK"}) ||
                        result.getValue({name: "custrecord_swt_mret_id", join: "CUSTRECORD_SWTD_TASK"}) ||
                        result.getValue({name: "custrecord_swt_otherid", join: "CUSTRECORD_SWTD_TASK"}) ||
                        result.getValue({name: "custrecord_swt_reportid", join: "CUSTRECORD_SWTD_TASK"}) ||
                        result.getValue({name: "custrecord_swtd_transaction_id"}));
                    lineInfo.tranLineId = Number(result.getValue({name: "custrecord_swtd_receivetask_detailid"}) ||
                        result.getValue({name: "custrecord_swtd_deliverynotice_detailid"}) ||
                        result.getValue({name: "custrecord_swtd_mrep_detail_id"}) ||
                        result.getValue({name: "custrecord_swtd_mret_detail_id"}) ||
                        result.getValue({name: "custrecord_swtd_otherid"}) ||
                        result.getValue({name: "custrecord_swtd_reportid"}) ||
                        result.getValue({name: "custrecord_swtd_line_number"}));
                    var itemId = Number(result.getValue({name: "custrecord_swtd_item_number"}));
                    itemsInfo[itemId] = true;
                    lineInfo.itemId = itemId;
                    lineInfo.itemName = result.getValue({name: "displaynametranslated", join: "CUSTRECORD_SWTD_ITEM_NUMBER"}) ||
                        result.getValue({name: "displayname", join: "CUSTRECORD_SWTD_ITEM_NUMBER"}) ||
                        result.getValue({name: "itemid", join: "CUSTRECORD_SWTD_ITEM_NUMBER"});
                    lineInfo.itemCode = result.getValue({name: "upccode", join: "CUSTRECORD_SWTD_ITEM_NUMBER"});
                    lineInfo.oldItemCode = result.getValue({name: "custitem_swc_old_material", join: "CUSTRECORD_SWTD_ITEM_NUMBER"});
                    lineInfo.isLot = LOTNUMBER ? result.getValue({name: "islotitem", join: "CUSTRECORD_SWTD_ITEM_NUMBER"}) : false;
                    lineInfo.isSerial = LOTNUMBER ? result.getValue({name: "isserialitem", join: "CUSTRECORD_SWTD_ITEM_NUMBER"}) : false;
                    lineInfo.skipQC = itemSkipQC;
                    lineInfo.skipCheck = result.getValue({name: "custitem_swc_co_consumption", join: "CUSTRECORD_SWTD_ITEM_NUMBER"}) || false;
                    lineInfo.unitId = Number(result.getValue({name: "custrecord_swtd_unit"}));
                    lineInfo.unitName = result.getText({name: "custrecord_swtd_unit"});
                    var {qty, preSubFunction} = parseQtyAndPreSubFunction({result, subFunction});
                    lineInfo.q = qty;
                    lineInfo.preSubFunction = preSubFunction;
                    lineInfo.total = 0;
                    lineInfo.badTotal = 0;
                    lineInfo.curTotal = 0;
                    lineInfo.curBadTotal = 0;
                    var jsonStr = result.getValue({name: "custrecord_swtd_detail_json"}) || "[]";
                    lineInfo.nums = preSubFunction ? {} : parseNumsField(JSON.parse(jsonStr));
                }
            })
            taskInfo.skipQC = taskSkipQC;
            taskInfo.items = Object.keys(itemsInfo) || [];
            return taskInfo;
        }

        /**
         * 根据任务类型解析位置信息
         * @param loc 位置编号
         * @param locName 位置名称
         * @param locUseBin 是否启用库位
         * @param woLoc 工单位置编号
         * @param woLocName 工单位置名称
         * @param woLocUseBin 工单是否启用库位
         * @param taskType 任务类型
         * @returns 包含起始位置和终止位置信息的对象
         */
        function parseLocInfoByTaskType({loc, locName, locUseBin, woLoc, woLocName, woLocUseBin, taskType}) {
            var fromLoc = "";
            var fromLocName = "";
            var fromLocUseBin = false;
            var toLoc = "";
            var toLocName = "";
            var toLocUseBin = false;
            if (["PO_IN", "SORET_IN", "TO_IN", "IA_IN", "FG_IN", "REM_IN"].includes(taskType)) {
                fromLoc = woLoc;
                fromLocName = woLocName;
                fromLocUseBin = woLocUseBin;
                toLoc = loc;
                toLocName = locName;
                toLocUseBin = locUseBin;
            } else if (["PORET_OUT", "SO_OUT", "TO_OUT", "IA_OUT", "RAW_OUT", "INV_CHECK"].includes(taskType)) {
                fromLoc = loc;
                fromLocName = locName;
                fromLocUseBin = locUseBin;
                toLoc = woLoc;
                toLocName = woLocName;
                toLocUseBin = woLocUseBin;
            }
            return {fromLoc, fromLocName, fromLocUseBin, toLoc, toLocName, toLocUseBin};
        }

        /**
         * 解析数量和前置子功能
         * @param {Object} param0 - 参数对象
         * @param {Object} param0.result - 搜索结果对象
         * @param {string} param0.subFunction - 子功能
         * @returns {Object} - 包含数量和前置子功能的对象
         */
        function parseQtyAndPreSubFunction({result, subFunction}) {
            var qty = 0;
            var preSubFunction = "";
            if (subFunction === "REC") {
                // 不存在前置流程，直接取应收货数量
                qty = Number(result.getValue({name: "custrecord_swtd_quantity_receive"}));
            } else if (subFunction === "IQC") {
                if (result.getValue({name: "custrecord_swtd_quantity_receive"})) {
                    // 应收货数量存在则前置流程为收货
                    preSubFunction = "REC";
                    // 应质检数量等于实际收货数量
                    qty = Number(result.getValue({name: "custrecord_swtd_actual_quantity_receive"}));
                } else if (result.getValue({name: "custrecord_swtd_quantity_picked"})) { // 增加出库质检 - 2025/02/10
                    // 应拣货数量存在则前置流程为拣货
                    preSubFunction = "PICK";
                    // 应质检数量等于实际拣货数量
                    qty = Number(result.getValue({name: "custrecord_swtd_actual_quantity_picked"}));
                } else {
                    // 不存在前置流程，直接取应质检数量
                    qty = Number(result.getValue({name: "custrecord_swtd_quantity_iqc"}));
                }
            } else if (subFunction === "TPUTAWAY") {
                if (result.getValue({name: "custrecord_swtd_quantity_iqc"})) {
                    // 应质检数量存在则前置流程为质检
                    preSubFunction = "IQC";
                    // 应上架数量等于实际质检数量减不良品数量
                    qty = Number(result.getValue({name: "custrecord_swtd_actual_quantity_iqc"})) - Number(result.getValue({name: "custrecord_swtd_defective_quantity"}));
                } else if (result.getValue({name: "custrecord_swtd_quantity_receive"})) {
                    // 应收货数量存在则前置流程为收货
                    preSubFunction = "REC";
                    // 应上架数量等于实际收货数量
                    qty = Number(result.getValue({name: "custrecord_swtd_actual_quantity_receive"}));
                } else {
                    // 不存在前置流程，直接取应上架数量
                    qty = Number(result.getValue({name: "custrecord_swtd_quantity_pa"}));
                }
            } else if (subFunction === "PICK") {
                // 不存在前置流程，直接取应拣货数量
                qty = Number(result.getValue({name: "custrecord_swtd_quantity_picked"}));
            } else if (subFunction === "SHIP") {
                // 前置流程为拣货
                preSubFunction = "PICK";
                // 应质发货量等于实际拣货数量
                qty = Number(result.getValue({name: "custrecord_swtd_actual_quantity_picked"}));
            }
            return {qty, preSubFunction};
        }

        /**
         * 解析数字字段
         * @param numFld 数字字段对象
         * @returns 解析后的数字字段对象
         */
        function parseNumsField(numFld) {
            var result = {};
            for (var i in numFld) {
                var numJson = numFld[i];
                result[numJson.num] = numJson;
            }
            return result;
        }

        /**
         * 获取JSON记录信息
         * @param taskId 任务ID
         * @param subFunction 子功能
         * @returns JSON记录信息对象
         */
        function getJsonRecInfo({taskId, subFunction}) {
            var jsonRecInfo = {};
            var maxId = 0; // TODO
            var filters = [
                ["isinactive", "is", "F"],
                "AND",
                ["custrecord_swj_status", "noneof", "3"]
            ];
            if (taskId) {
                SWCUtils.addFilter(filters, ["custrecord_swj_task", "anyof", taskId]);
            }
            if (subFunction) {
                SWCUtils.addFilter(filters, ["custrecord_swj_operation.custrecord_swpo_code", "is", subFunction]);
            }
            var jsonSearchObj = search.create({
                type: "customrecord_swc_wms_json",
                filters: filters,
                columns:
                    [
                        search.createColumn({name: "custrecord_swj_operator", label: "用户"}),
                        search.createColumn({name: "custrecord_swpo_code", join: "CUSTRECORD_SWJ_OPERATION", label: "操作编码"}),
                        search.createColumn({name: "custrecord_swj_save_submit", label: "保存/提交"}),
                        search.createColumn({name: "custrecord_swj_json", label: "JSON"})
                    ]
            });
            jsonSearchObj.run().each(function(result){
                var subFunctions = result.getValue({name: "custrecord_swpo_code", join: "CUSTRECORD_SWJ_OPERATION"});
                var flag = result.getValue({name: "custrecord_swj_save_submit"});
                var json = transformTaskLocsToJson(JSON.parse(result.getValue({name: "custrecord_swj_json"})));
                var jsonRec = jsonRecInfo[subFunctions] = jsonRecInfo[subFunctions] || {};
                if (flag == 1) { // SAVE
                    jsonRec.saveJsonId = result.id;
                    jsonRec.saveUser = result.getValue({name: "custrecord_swj_operator"});
                    jsonRec.saveJson = json;
                } else if (flag == 2) { // SUBMIT
                    if (subFunctions == "SHIP") {
                        var id = Number(result.id);
                        if (id > maxId) {
                            maxId = id;
                            jsonRec.submitJson = SWCUtils.copyObject(json);
                        }
                    } else {
                        if (jsonRec.submitJson && Object.keys(jsonRec.submitJson).length > 0) {
                            jsonRec.submitJson = mergeJson(jsonRec.submitJson, json, ["total", "badTotal", "curTotal", "curBadTotal"], ["num", "tag", "badReasonMsg", "badMemo", "fromBinName", "toBinName"], ["fromLocUseBin", "toLocUseBin", "isLot", "isSerial", "skipQC", "skipCheck"]);
                        } else {
                            jsonRec.submitJson = SWCUtils.copyObject(json);
                        }
                    }
                }
                return true;
            });
            return jsonRecInfo;
        }


        /**
         * 将出入库任务中的locs数组转换为JSON对象
         * @param locs 包含locInfo对象的数组
         * @returns 转换后的JSON对象数组
         */
        function transformTaskLocsToJson(locs) {
            return locs.map(locInfo => {
                const locKey = `${locInfo.fromLoc}_${locInfo.toLoc}`;
                const lines = locInfo.lines.map(line => {
                    const lineKey = `${line.lineId}`;
                    const nums = line.nums.map(num => {
                        const numKey = `${num.num}`;
                        const bins = num.bins.map(bin => {
                            const binKey = `${bin.fromBin}_${bin.toBin}`;
                            const tags = bin.tags.map(tag => ({
                                [tag.tag]: tag
                            }));
                            return {[binKey]: {...bin, tags: Object.assign({}, ...tags)}};
                        });
                        return {[numKey]: {...num, bins: Object.assign({}, ...bins)}};
                    });
                    return {[lineKey]: {...line, nums: Object.assign({}, ...nums)}};
                });
                return {[locKey]: {...locInfo, lines: Object.assign({}, ...lines)}};
            })[0];
        }

        /**
         * 将库存任务中的locs数组转换为JSON对象
         * @param locs 包含locInfo对象的数组
         * @returns 转换后的JSON对象数组
         */
        function transformInvLocsToJson(locs) {
            return locs.map(locInfo => {
                const locKey = `${locInfo.fromLoc}_${locInfo.toLoc}`;
                const bins = locInfo.bins.map(bin => {
                    const binKey = `${bin.fromBin}_${bin.toBin}`;
                    const items = bin.items.map(item => {
                        const itemKey = `${item.itemId}`;
                        const nums = item.nums.map(num => {
                            const numKey = `${num.num}`;
                            const tags = num.tags.map(tag => ({
                                [tag.tag]: tag
                            }));
                            return {[numKey]: {...num, tags: Object.assign({}, ...tags)}};
                        });
                        return {[itemKey]: {...item, nums: Object.assign({}, ...nums)}};
                    });
                    return {[binKey]: {...bin, items: Object.assign({}, ...items)}};
                });
                return {[locKey]: {...locInfo, bins: Object.assign({}, ...bins)}};
            })[0];
        }


        /**
         * 合并两个JSON对象
         * @param obj1 第一个JSON对象
         * @param obj2 第二个JSON对象
         * @param totalFlds 需要合并的字段数组
         * @returns 合并后的JSON对象
         */
        function mergeJson(obj1, obj2, totalFlds, textFlds, boolFlds) {
            const result = {};
            for (const key in obj1) {
                if (obj2.hasOwnProperty(key)) {
                    if (typeof obj1[key] === 'object' && obj1[key] !== null && typeof obj2[key] === 'object' && obj2[key] !== null) {
                        result[key] = mergeJson(obj1[key], obj2[key], totalFlds, textFlds, boolFlds);
                    } else if (totalFlds.includes(key)) {
                        result[key] = Number(obj1[key]) + Number(obj2[key]);
                    } else {
                        if (obj1[key]) {
                            result[key] = obj1[key];
                        } else if (textFlds.includes(key)) {
                            result[key] = "";
                        } else if (boolFlds.includes(key)) {
                            result[key] = false;
                        } else {
                            result[key] = 0;
                        }
                    }
                } else {
                    result[key] = obj1[key];
                }
            }
            for (const key in obj2) {
                if (obj2.hasOwnProperty(key) && !(key in result)) {
                    result[key] = obj2[key];
                }
            }
            return result;
        }

        /**
         * 合并任务信息和Json信息
         * @param param0 合并任务信息和Json信息的参数对象
         * @param param0.subFunction 子功能名称
         * @param param0.taskInfo 任务信息
         * @param param0.jsonRecInfo Json记录信息
         * @returns 合并后的结果对象
         */
        function mergeTaskAndJson({subFunction, taskInfo, jsonRecInfo}) {
            var result = SWCUtils.copyObject(taskInfo);
            var saveJson = jsonRecInfo?.[subFunction]?.saveJson || {};
            var submitJson = jsonRecInfo?.[subFunction]?.submitJson || {};
            util.each(result.locs, function (locInfo, locKey) {
                util.each(locInfo.lines, function (lineInfo, lineId) {
                    var saveLineJson = saveJson?.[locKey]?.lines?.[lineId] || {};
                    var submitLineJson = submitJson?.[locKey]?.lines?.[lineId] || {};
                    if (subFunction == "SHIP") {
                        var preSubFunction = lineInfo.preSubFunction;
                        var preJson = jsonRecInfo?.[preSubFunction]?.submitJson || {};
                        var preLineJson = preJson?.[locKey]?.lines?.[lineId];
                        var lineQ = lineInfo.q - (submitLineJson.curTotal || 0);
                        lineInfo.q = lineQ;
                        lineInfo.total = 0;
                        lineInfo.curTotal = preLineJson.curTotal - (submitLineJson.curTotal || 0);
                        var preNums = preLineJson.nums;
                        util.each(preNums, function (preNumInfo, preNum) {
                            var submitNumJson = submitLineJson?.nums?.[preNum] || {};
                            util.each(preNumInfo.bins, function (preBinInfo, binKey) {
                                var submitBinJson = submitNumJson?.bins?.[binKey] || {};
                                var binQ = preBinInfo.curTotal - (submitBinJson.curTotal || 0);
                                if (binQ == 0) {
                                    delete preNumInfo.bins[binKey];
                                    return true;
                                }
                                preBinInfo.q = binQ;
                                preBinInfo.total = 0;
                                preBinInfo.curTotal = binQ;
                                util.each(preBinInfo.tags, function (preTagInfo, tag) {
                                    var submitTagJson = submitBinJson?.tags?.[tag] || {};
                                    var tagQ = preTagInfo.curTotal - (submitTagJson.curTotal || 0);
                                    if (tagQ == 0) {
                                        delete preBinInfo.tags[tag];
                                        return true;
                                    }
                                    preTagInfo.q = tagQ;
                                    preTagInfo.total = 0;
                                    preTagInfo.curTotal = 0;
                                })
                            })
                            var numQ = preNumInfo.curTotal - (submitNumJson.curTotal || 0);
                            if (lineInfo.isLot && numQ == 0) return true;
                            lineInfo.nums[preNum] = {
                                num: preNum,
                                q: numQ,
                                total: 0,
                                curTotal: numQ,
                                bins: preNumInfo.bins
                            }
                        })
                    } else {
                        lineInfo.total = submitLineJson.curTotal || 0;
                        lineInfo.badTotal = submitLineJson.curBadTotal || 0;
                        lineInfo.curTotal = saveLineJson.curTotal || 0;
                        lineInfo.curBadTotal = saveLineJson.curBadTotal || 0;
                        var preSubFunction = lineInfo.preSubFunction;
                        if (preSubFunction) {
                            var preJson = jsonRecInfo?.[preSubFunction]?.submitJson || {};
                            var preNums = preJson?.[locKey]?.lines?.[lineId]?.nums;
                            util.each(preNums, function (preNumInfo, preNum) {
                                util.each(preNumInfo.bins, function (preBinInfo) {
                                    var binQ = preSubFunction == "IQC" ? preBinInfo.curTotal - preBinInfo.curBadTotal : preBinInfo.curTotal;
                                    preBinInfo.q = binQ;
                                    preBinInfo.total = 0;
                                    preBinInfo.badTotal = 0;
                                    preBinInfo.curTotal = 0;
                                    preBinInfo.curBadTotal = 0;
                                    util.each(preBinInfo.tags, function (preTagInfo) {
                                        var tagQ = preSubFunction == "IQC" ? preTagInfo.curTotal - preTagInfo.curBadTotal : preTagInfo.curTotal;
                                        if (tagQ == 0) return true;
                                        preTagInfo.q = tagQ;
                                        preTagInfo.total = 0;
                                        preTagInfo.badTotal = 0;
                                        preTagInfo.curTotal = 0;
                                        preTagInfo.curBadTotal = 0;
                                    })
                                })
                                var numQ = preSubFunction == "IQC" ? preNumInfo.curTotal - preNumInfo.curBadTotal : preNumInfo.curTotal;
                                if (preSubFunction != "PICK" && subFunction != "IQC") {
                                    if (numQ == 0) return true;
                                }
                                lineInfo.nums[preNum] = {
                                    num: preNum,
                                    q: numQ,
                                    total: 0,
                                    badTotal: 0,
                                    curTotal: 0,
                                    curBadTotal: 0,
                                    bins: preNumInfo.bins
                                }
                            })
                        } else if (subFunction == "PICK") {
                            lineInfo.nums = saveLineJson.nums || submitLineJson.nums || {};
                        }
                        util.each(lineInfo.nums, function (numInfo, num) {
                            var saveNumJson = saveLineJson?.nums?.[num] || {};
                            var submitNumJson = submitLineJson?.nums?.[num] || {};
                            numInfo.total = submitNumJson.curTotal || 0;
                            numInfo.badTotal = submitNumJson.curBadTotal || 0;
                            numInfo.curTotal = saveNumJson.curTotal || 0;
                            numInfo.curBadTotal = saveNumJson.curBadTotal || 0;
                            numInfo.badReasonId = saveNumJson.badReasonId || submitNumJson.badReasonId || 0;
                            numInfo.badReasonMsg = saveNumJson.badReasonMsg || submitNumJson.badReasonMsg || "";
                            numInfo.badMemo = saveNumJson.badMemo || submitNumJson.badMemo || "";
                            numInfo.bins = saveNumJson.bins || submitNumJson.bins || numInfo.bins;
                            util.each(numInfo.bins, function (binInfo, binKey) {
                                var saveBinJson = saveNumJson?.bins?.[binKey] || {};
                                var submitBinJson = submitNumJson?.bins?.[binKey] || {};
                                binInfo.total = submitBinJson.curTotal || 0;
                                binInfo.badTotal = submitBinJson.curBadTotal || 0;
                                binInfo.curTotal = saveBinJson.curTotal || 0;
                                binInfo.curBadTotal = saveBinJson.curBadTotal || 0;
                                binInfo.tags = saveBinJson.tags || submitBinJson.tags || binInfo.tags;
                                util.each(binInfo.tags, function (tagInfo, tag) {
                                    var saveTagJson = saveBinJson?.tags?.[tag] || {};
                                    var submitTagJson = submitBinJson?.tags?.[tag] || {};
                                    tagInfo.total = submitTagJson.curTotal || 0;
                                    tagInfo.badTotal = submitTagJson.curBadTotal || 0;
                                    tagInfo.curTotal = saveTagJson.curTotal || 0;
                                    tagInfo.curBadTotal = saveTagJson.curBadTotal || 0;
                                })
                            })
                        })
                    }
                })
            })
            return result;
        }

        /**
         * 补充并转移任务信息
         * @param taskInfo 任务信息对象
         * @returns 转换后的任务信息数组
         */
        function complementAndTransferTaskInfo({taskInfo}) {
            delete taskInfo.items;
            util.each(taskInfo.locs, function (locInfo, locKey) {
                util.each(locInfo.lines, function (lineInfo, lineId) {
                    if (lineInfo.preSubFunction) taskInfo.isFirstFunc = false;
                    delete lineInfo.preSubFunction;
                    if (!lineInfo.prefBinId) lineInfo.prefBinId = 0;
                    if (!lineInfo.prefBinNum) lineInfo.prefBinNum = "";
                    if (!lineInfo.total) lineInfo.total = 0;
                    if (!lineInfo.badTotal) lineInfo.badTotal = 0;
                    if (!lineInfo.curTotal) lineInfo.curTotal = 0;
                    if (!lineInfo.curBadTotal) lineInfo.curBadTotal = 0;
                    if (!lineInfo.nums || Object.keys(lineInfo.nums).length == 0) {
                        lineInfo.nums = {};
                        lineInfo.nums[""] = {
                            "num": "",
                            "q": 0,
                            "total": 0,
                            "badTotal": 0,
                            "curTotal": 0,
                            "curBadTotal": 0,
                            "badReasonId": 0,
                            "badReasonMsg": "",
                            "badMemo": "",
                            "bins": {}
                        };
                    }
                    util.each(lineInfo.nums, function (numInfo, num) {
                        if (!numInfo.total) numInfo.total = 0;
                        if (!numInfo.badTotal) numInfo.badTotal = 0;
                        if (!numInfo.curTotal) numInfo.curTotal = 0;
                        if (!numInfo.curBadTotal) numInfo.curBadTotal = 0;
                        if (!numInfo.badReasonId) numInfo.badReasonId = 0;
                        if (!numInfo.badReasonMsg) numInfo.badReasonMsg = "";
                        if (!numInfo.badMemo) numInfo.badMemo = "";
                        if (!numInfo.bins || Object.keys(numInfo.bins).length == 0) {
                            numInfo.bins = {};
                            numInfo.bins["_"] = {
                                "fromBin": 0,
                                "fromBinName": "",
                                "toBin": 0,
                                "toBinName": "",
                                "total": 0,
                                "badTotal": 0,
                                "curTotal": 0,
                                "curBadTotal": 0,
                                "tags": {}
                            };
                        }
                        util.each(numInfo.bins, function (binInfo, binKey) {
                            if (!binInfo.total) binInfo.total = 0;
                            if (!binInfo.badTotal) binInfo.badTotal = 0;
                            if (!binInfo.curTotal) binInfo.curTotal = 0;
                            if (!binInfo.curBadTotal) binInfo.curBadTotal = 0;
                            if (!binInfo.tags || Object.keys(binInfo.tags).length == 0) binInfo.tags = {};
                            util.each(binInfo.tags, function (tagInfo, tag) {
                                if (!tagInfo.total) tagInfo.total = 0;
                                if (!tagInfo.badTotal) tagInfo.badTotal = 0;
                                if (!tagInfo.curTotal) tagInfo.curTotal = 0;
                                if (!tagInfo.curBadTotal) tagInfo.curBadTotal = 0;
                            })
                        })
                    })
                })
            })
            return transformObjToArr({obj: taskInfo, keys: ["locs", "lines", "nums", "bins", "tags"]});
        }

        /**
         * 解析标签配置
         * @param param0 包含任务类型和基础配置的对象
         * @param param0.taskType 任务类型
         * @param param0.basicConfig 基础配置对象
         * @returns 包含是否打印和是否创建标签的对象
         */
        function parseLabelConfig({taskType, basicConfig}) {
            var isPrint = basicConfig.pdaPrint;
            var isCreateLabel = false;
            var useLabel = basicConfig.useLabel;
            if (taskType == "PO_IN") {
                isCreateLabel = basicConfig.poInPdaLabel;
            } else if (taskType == "SORET_IN") {
                isCreateLabel = basicConfig.soretInPdaLabel;
            } else if ("TO_IN") {
                isCreateLabel = basicConfig.toInPdaLabel;
            } else if ("IA_IN") {
                isCreateLabel = basicConfig.otherInPdaLabel;
            }
            return {isPrint, isCreateLabel, useLabel}
        }

        /**
         * 获取差异信息
         * @param newJson 新的Json对象
         * @param oldJson 旧的Json对象
         * @returns 差异信息对象
         */
        function getDifferenceInfo(newJson, oldJson) {
            var differenceInfo = {};
            util.each(newJson, function (locInfo, locKey) {
                util.each(locInfo.lines, function (lineInfo, lineId) {
                    var saveLineJson = oldJson?.[locKey]?.lines?.[lineId] || {};
                    if (!saveLineJson || Object.keys(saveLineJson).length == 0) return;
                    var diffItemInfo = differenceInfo[lineId] = differenceInfo[lineId] || {};
                    diffItemInfo.itemName = lineInfo.itemName;
                    diffItemInfo.unitName = lineInfo.unitName;
                    if (lineInfo.isLot || lineInfo.isSerial) {
                        diffItemInfo.nums = diffItemInfo.nums || {};
                        util.each(lineInfo.nums, function (numInfo, num) {
                            var saveNumJson = saveLineJson.nums?.[num] || {};
                            if (!saveNumJson || Object.keys(saveNumJson).length == 0) return;
                            var diffNumCurTotal = Number(lineInfo.curTotal) - Number(saveLineJson.curTotal);
                            var diffNumCurBadTotal = Number(lineInfo.curBadTotal) - Number(saveLineJson.curBadTotal);
                            if (diffNumCurBadTotal < 0) {
                                diffItemInfo.nums[num] = Math.abs(diffNumCurBadTotal)
                            } else if (diffNumCurTotal < 0) {
                                diffItemInfo.nums[num] = Math.abs(diffNumCurTotal)
                            }
                        })
                        if (Object.keys(diffItemInfo.nums).length == 0) {
                            delete differenceInfo[lineId];
                            return;
                        } else {
                            var diffCurTotal = Number(lineInfo.curTotal) - Number(saveLineJson.curTotal);
                            var diffCurBadTotal = Number(lineInfo.curBadTotal) - Number(saveLineJson.curBadTotal);
                            if (diffCurBadTotal < 0) {
                                diffItemInfo.diffTotal = diffCurBadTotal
                            } else if (diffCurTotal < 0) {
                                diffItemInfo.diffTotal = diffCurTotal
                            }
                        }
                    } else {
                        var diffCurTotal = Number(lineInfo.curTotal) - Number(saveLineJson.curTotal);
                        var diffCurBadTotal = Number(lineInfo.curBadTotal) - Number(saveLineJson.curBadTotal);
                        if (diffCurBadTotal < 0) {
                            diffItemInfo.diffTotal = Math.abs(diffCurBadTotal)
                        } else if (diffCurTotal < 0) {
                            diffItemInfo.diffTotal = Math.abs(diffCurTotal)
                        } else {
                            delete differenceInfo[lineId];
                        }
                    }
                })
            })
            return differenceInfo;
        }

        //查询仓储任务中的仓库
        function getTaskLocation(id) {
            var location = "";
            const customrecordSwcWmsTaskSearchColYBQDK = search.createColumn({ name: 'custrecord_swt_location' });
            const customrecordSwcWmsTaskSearch = search.create({
                type: 'customrecord_swc_wms_task',
                filters: [
                    ['internalid', 'anyof', id]
                ],
                columns: [
                    customrecordSwcWmsTaskSearchColYBQDK,
                ],
            });
            customrecordSwcWmsTaskSearch.run().each(function(result){
                location = result.getValue({name: 'custrecord_swt_location'});
                // .run().each has a limit of 4,000 results
                return false;
            });
            return location;
        }

        /**
         * 获取单位转换率信息
         * @returns 返回一个包含单位转换信息的对象，其中键为内部id，值为查询结果
         */
        function getConversionrate() {
            let sql = `select * from unitsTypeUom `;
            var resultIterator = query.runSuiteQL({query: sql}).asMappedResults();
            var unitsJson = {};
            for (var i = 0; i < resultIterator.length; i++) {
                var internalid = resultIterator[i].internalid;
                unitsJson[internalid] = resultIterator[i];
            }
            return unitsJson;
        }

        /**
         * 处理标签记录
         * @param labelData 标签数据数组
         * @returns 返回一个对象，包含标签编号和标签ID的映射关系
         * @throws 如果标签数据为空或者数组长度为0，抛出MSG25的异常
         */
        function processLabelRecord(labelData) {
            if (!labelData || labelData.length == 0) throw getWMSTranslation({key: "MSG25"});
            // 根据处理类型进行分类
            var createLabelData = {};
            var createLabelNums = {};
            var updateLabelData = {};
            var updateFilters = [];
            var splitLabelData = {};
            var splitFilters = [];
            var numLabelIdObj = {};
            var unitObj = getConversionrate();
            labelData.forEach(function(labelInfo) {
                var type = labelInfo.type;
                if (type == "create") {
                    var num = labelInfo.num;
                    var wmsId = labelInfo.wmsId;
                    var line = labelInfo.line;
                    var key = num + "&" + wmsId + "&" + line;
                    createLabelData[key] = labelInfo;
                    createLabelNums[num] = createLabelNums[num] || 0;
                    createLabelNums[num] += 1;
                } else if (type == "update") {
                    var labelId = labelInfo.labelId;
                    updateLabelData[labelId] = labelInfo;
                    SWCUtils.addFilter(updateFilters, ["custrecord_swll_labelid", "is", labelId], true);
                } else if (type == "split") {
                    var labelId = labelInfo.labelId;
                    splitLabelData[labelId] = labelInfo;
                    SWCUtils.addFilter(splitFilters, ["custrecord_swll_labelid", "is", labelId], true);
                }
            });
            // 创建标签
            if (createLabelData && Object.keys(createLabelData).length > 0) {
                log.error("createLabelNums", createLabelNums);
                var response = https.requestSuitelet({
                    scriptId: "customscript_swc_sl_autoserialnumber",
                    deploymentId: "customdeploy_swc_sl_autoserialnumber",
                    body: JSON.stringify({
                        "type": "Label",
                        "obj": createLabelNums
                    })
                });
                var labelIdInfo = JSON.parse(response.body);
                util.each(createLabelData, function (labelInfo) {
                    var num = labelInfo.num;
                    var labelIdNum = labelIdInfo[num];
                    var labelId = num + "-" + ((Number(labelIdNum) + "").padStart(6, "0"));
                    labelIdInfo[num] += 1;
                    labelInfo.labelId = labelId;
                    var wmsId = labelInfo.wmsId;
                    var line = labelInfo.line;
                    var key = num + "&" + wmsId + "&" + line;
                    numLabelIdObj[key] = labelId;
                    createOrLoadLabel({labelInfo: labelInfo, type: "create", unitObj});
                });
            }
            // 更新标签
            if (updateLabelData && Object.keys(updateLabelData).length > 0) {
                var labelSearchObj = search.create({
                    type: "customrecord_swc_wms_label_list",
                    filters: updateFilters,
                    columns: [search.createColumn({name: "custrecord_swll_labelid", label: "标签ID"})]
                });
                labelSearchObj.run().each(function (result) {
                    var label = result.getValue({name: "custrecord_swll_labelid"});
                    if (updateLabelData[label]) updateLabelData[label].id = result.id;
                    return true;
                });
                util.each(updateLabelData, function (labelInfo) {
                    createOrLoadLabel({labelInfo: labelInfo, type: "update", unitObj});
                });
            }
            // 拆分标签
            if (splitLabelData && Object.keys(splitLabelData).length > 0) {
                var splitLabelNums = {}; // 记录需要拆分的标签批号与每个批号的数量
                var labelSearchObj = search.create({
                    type: "customrecord_swc_wms_label_list",
                    filters: splitFilters,
                    columns: [
                        search.createColumn({name: "custrecord_swll_labelid", label: "标签ID"}),
                        search.createColumn({name: "custrecord_swll_lotnumber_serialize", label: "批号"})
                    ]
                });
                labelSearchObj.run().each(function (result) {
                    var label = result.getValue({name: "custrecord_swll_labelid"});
                    var num = result.getValue({name: "custrecord_swll_lotnumber_serialize"});
                    if (splitLabelData[label]) {
                        splitLabelData[label].id = result.id; // 查询需要拆分的标签记录id
                        splitLabelData[label].num = num; // 保证批号字段有值
                        splitLabelNums[num] = splitLabelNums[num] || 0; // 记录批号数量
                        splitLabelNums[num] += 1;
                    }
                    return true;
                });
                var response = https.requestSuitelet({
                    scriptId: "customscript_swc_sl_autoserialnumber",
                    deploymentId: "customdeploy_swc_sl_autoserialnumber",
                    body: JSON.stringify({
                        "type": "Label",
                        "obj": splitLabelNums
                    })
                });
                var labelIdInfo = JSON.parse(response.body);

                util.each(splitLabelData, function (labelInfo) {
                    var num = labelInfo.num;
                    var labelIdNum = labelIdInfo[num]; // 根据批号获取当前批号起始值
                    var labelId = num + "-" + ((Number(labelIdNum) + "").padStart(6, "0")); // 生成新标签id
                    labelIdInfo[num] += 1; // 将起始值提高
                    numLabelIdObj[labelInfo.labelId] = labelId; // 记录原标签id与新标签id映射关系
                    labelInfo.labelId = labelId; // 将标签id更新为新标签id
                    createOrLoadLabel({labelInfo: labelInfo, type: "split", unitObj});
                });
            }

            return numLabelIdObj;
        }

        /**
         * 创建或加载标签
         * @param labelInfo 标签信息对象
         * @param type 标签处理类型，可选值为 "create" 或 "update"
         * @returns 无返回值
         */
        function createOrLoadLabel({labelInfo, type, unitObj}) {
            try {
                var labelRec = {};
                if (type == "create") {
                    labelRec = record.create({type: "customrecord_swc_wms_label_list", isDynamic: true});
                } else if (type == "update") {
                    labelRec = record.load({type: "customrecord_swc_wms_label_list", id: labelInfo.id, isDynamic: true});
                } else if (type == "split") {
                    // 更新原标签数量
                    var oldLabelRec = record.load({type: "customrecord_swc_wms_label_list", id: labelInfo.id, isDynamic: true});
                    var oldQ = Number(oldLabelRec.getValue({fieldId: "custrecord_swll_quantity"}));
                    oldLabelRec.setValue({fieldId: "custrecord_swll_quantity", value: oldQ - Number(labelInfo.q)});
                    oldLabelRec.save();
                    // 复制出新标签
                    labelRec = record.copy({type: "customrecord_swc_wms_label_list", id: labelInfo.id, isDynamic: true});
                }
                labelInfo.labelId && labelRec.setValue({fieldId: "custrecord_swll_labelid", value: labelInfo.labelId});
                labelInfo.itemId && labelRec.setValue({fieldId: "custrecord_swll_item", value: labelInfo.itemId});
                labelInfo.num && labelRec.setValue({fieldId: "custrecord_swll_lotnumber_serialize", value: labelInfo.num});
                if (labelInfo.taskType == "PICK" || labelInfo.taskType == "SHIP") {
                    var labelUnit = labelRec.getValue({fieldId: "custrecord_swll_unit"});
                    var taskUnit = labelInfo.unitId;
                    var oldQ = Number(labelRec.getValue({fieldId: "custrecord_swll_quantity"}));
                    if (taskUnit && labelUnit != taskUnit) {
                        var labelRate = unitObj[labelUnit].conversionrate;
                        var taskRate = unitObj[taskUnit].conversionrate;
                        oldQ = new Decimal(new Decimal(oldQ).mul(labelRate).toNumber()).div(taskRate).toNumber();
                    }
                    labelInfo.q && labelRec.setValue({fieldId: "custrecord_swll_quantity", value: oldQ - Number(labelInfo.q)});
                } else {
                    labelInfo.q && labelRec.setValue({fieldId: "custrecord_swll_quantity", value: Number(labelInfo.q)});
                }
                labelInfo.unitId && labelRec.setValue({fieldId: "custrecord_swll_unit", value: labelInfo.unitId});
                labelInfo.locId && labelRec.setValue({fieldId: "custrecord_swll_location", value: labelInfo.locId});
                labelInfo.binId && labelRec.setValue({fieldId: "custrecord_swll_bin", value: labelInfo.binId});
                labelInfo.userId && labelRec.setValue({fieldId: "custrecord_swll_print_user", value: labelInfo.userId});
                labelInfo.inTime && labelRec.setText({fieldId: "custrecord_swll_in_time", text: labelInfo.inTime});
                labelInfo.inUser && labelRec.setValue({fieldId: "custrecord_swll_in_user", value: labelInfo.inUser});
                labelInfo.outTime && labelRec.setText({fieldId: "custrecord_swll_out_time", text: labelInfo.outTime});
                labelInfo.outUser && labelRec.setValue({fieldId: "custrecord_swll_out_user", value: labelInfo.outUser});
                labelInfo.wmsId && labelRec.setValue({fieldId: "custrecord_swll_task", value: labelInfo.wmsId});
                labelInfo.line && labelRec.setValue({fieldId: "custrecord_swll_line", value: labelInfo.line});
                labelRec.save();
            } catch (e) {
                log.error("标签创建失败", e.message);
            }
        }

        /**
         * 批量处理标签
         * @param labelData 标签数据数组
         * @returns 无返回值
         */
        function batchProcessLabel({labelData}) {
            log.debug("labelData", labelData);
            var outdata = {
                code: "OK",
                msg: "成功"
            };
            try {
                // 将十个标签归为一组处理
                var dataAry = chunkArrayIntoPairs({arr: labelData, count: 10});

                // 业务方法脚本地址
                var actionUrl = url.resolveScript({
                    scriptId: "customscript_swc_sl_processlabel",
                    deploymentId: "customdeploy_swc_sl_processlabel",
                    returnExternalUrl: true
                });

                // 分裂脚本地址
                var batchUrl = url.resolveScript({
                    scriptId: "customscript_swc_sl_batch",
                    deploymentId: "customdeploy_swc_sl_batch",
                    returnExternalUrl: true
                });
                batchUrl += "&actionUrl=" + encodeURIComponent(actionUrl);
                var response = https.post({
                    url: batchUrl,
                    body: JSON.stringify(dataAry)
                })
                var result = JSON.parse(response.body);
                log.debug("result", result);
                var numLabelIdObj = {};
                var errorMsg = "";
                if (Array.isArray(result)) {
                    util.each(result, function (oneRes) {
                        if (oneRes.code == "OK") {
                            util.extend(numLabelIdObj, oneRes.data);
                        } else {
                            errorMsg += oneRes.data;
                        }
                    })
                } else {
                    if (result.code == "OK") {
                        util.extend(numLabelIdObj, result.data);
                    } else {
                        errorMsg += result.data;
                    }
                }
                outdata.data = numLabelIdObj;
            } catch (e) {
                log.error("e", e.message)
                outdata.code = "ERROR";
                outdata.msg = e.message;
            }
            return outdata;
        }

        /**
         * 将数组元素按照指定数量分组
         * @param arr 数组
         * @param count 每组的元素数量
         * @returns 返回分组后的二维数组
         */
        function chunkArrayIntoPairs({arr, count}) {
            return arr.reduce((acc, curr, index) => {
                if (index % count === 0) {
                    acc.push([curr]);
                } else {
                    acc[acc.length - 1].push(curr);
                }
                return acc;
            }, []);
        }

        //盘点任务创建仓储任务
        function taskCreate({taskInfo}) {
            var dataAry = chunkArrayIntoPairs({arr: taskInfo, count: 4});

            var actionUrl = url.resolveScript({
                scriptId: 'customscript_swc_sl_inventorycreatewms',
                deploymentId: 'customdeploy_swc_sl_inventorycreatewms',
                returnExternalUrl: true
            });

            // 分裂脚本地址
            var batchUrl = url.resolveScript({
                scriptId: "customscript_swc_sl_batch",
                deploymentId: "customdeploy_swc_sl_batch",
                returnExternalUrl: true
            });
            batchUrl += "&actionUrl=" + encodeURIComponent(actionUrl);
            https.post({
                url: batchUrl,
                body: JSON.stringify(dataAry)
            })

        }

        /**
         * 创建库存转移单
         * @param options 选项对象
         * @param options.taskId 任务ID
         * @param options.oneWorld 是否启用OneWorld
         * @param options.trandate 事务日期
         * @param options.subsidiary 子公司
         * @param options.fromLoc 起始位置
         * @param options.fromLocUseBin 起始位置是否使用货位
         * @param options.toLoc 目标位置
         * @param options.toLocUseBin 目标位置是否使用货位
         * @param options.bins 货位信息数组
         * @param options.bins.fromBin 起始货位
         * @param options.bins.toBin 目标货位
         * @param options.bins.items 物品信息数组
         * @param options.bins.items.itemId 物品ID
         * @param options.bins.items.unitId 单位ID
         * @param options.bins.items.isLot 是否是批次管理物品
         * @param options.bins.items.isSerial 是否是序列号管理物品
         * @param options.bins.items.nums 数量信息数组
         * @param options.bins.items.nums.num 数量
         * @param options.bins.items.nums.totalField 总数量字段名
         * @param options.lines 行信息数组
         * @param options.lines.itemId 物品ID
         * @param options.lines.unitId 单位ID
         * @param options.lines.isLot 是否是批次管理物品
         * @param options.lines.isSerial 是否是序列号管理物品
         * @param options.lines.nums 数量信息数组
         * @param options.lines.nums.num 数量
         * @param options.lines.nums.totalField 总数量字段名
         * @param options.lines.nums.bins 货位信息数组
         * @param options.lines.nums.bins.fromBin 起始货位
         * @param options.lines.nums.bins.toBin 目标货位
         * @param options.totalField 总数量字段名
         * @returns 返回库存转移单的记录ID
         */
        function createIT(options) {
            var {fields, taskId, oneWorld, trandate, subsidiary, fromLoc, fromBin, toLoc, toBin, bins, lines, totalField, badTotalField, status, toStatus, transferType} = options;
            var rec = record.create({type: "inventorytransfer", isDynamic: true, defaultValues: {customform: 119}}); // sb:122 pro:119
            oneWorld && rec.setValue({fieldId: "subsidiary", value: subsidiary});
            trandate && rec.setText({fieldId: "trandate", text: trandate});
            rec.setValue({fieldId: "location", value: fromLoc});
            rec.setValue({fieldId: "transferlocation", value: toLoc});
            taskId && rec.setValue({fieldId: "custbody_swc_wms_task_id", value: taskId});
            transferType && rec.setValue({fieldId: "custbody_swc_wms_transfer_type", value: transferType});

            // 辅助字段设置
            fields && fields.forEach(function (fldInfo) {
                rec.setValue(fldInfo);
            })

            var locIds = [];
            fromLoc && locIds.push(fromLoc);
            toLoc && locIds.push(toLoc);
            var locsInfo = getLocInfo({locIds});
            var fromLocUseBin = locsInfo?.[fromLoc]?.useBin || false;
            var toLocUseBin = locsInfo?.[toLoc]?.useBin || false;

            if (bins) {
                util.each(bins, function (binInfo) {
                    util.each(binInfo.items, function (itemInfo) {
                        rec.selectNewLine({sublistId: "inventory"});
                        rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "item", value: itemInfo.itemId});
                        rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "units", value: itemInfo.unitId});
                        rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "adjustqtyby", value: itemInfo[totalField]});
                        if (!fromLocUseBin && !toLocUseBin && !itemInfo.isLot && !itemInfo.isSerial) {
                            rec.commitLine({sublistId: "inventory"});
                            return true;
                        }
                        var subRec = rec.getCurrentSublistSubrecord({sublistId: "inventory", fieldId: "inventorydetail"});
                        removeLines(subRec, "inventoryassignment");
                        var numQty = 0;
                        if (!itemInfo.isLot && !itemInfo.isSerial) {
                            numQty = itemInfo[totalField];
                            setBinNumber({subRec, bin: fromBin || binInfo.fromBin, fromLocUseBin, toBin: toBin || binInfo.toBin, toLocUseBin, qty: numQty, status, toStatus});
                        }
                        util.each(itemInfo.nums, function (numInfo) {
                            numQty = numInfo[totalField];
                            setBinNumber({subRec, bin: fromBin || binInfo.fromBin, fromLocUseBin, toBin: toBin || binInfo.toBin, toLocUseBin, num: numInfo.num, numFld: "issueinventorynumber", qty: numQty, status, toStatus});
                        })
                        rec.commitLine({sublistId: "inventory"});
                    })
                })
            } else if (lines) {
                util.each(lines, function (lineInfo) {
                    var qty = Number(lineInfo[totalField]) - Number(lineInfo[badTotalField] || 0);
                    if (qty == 0) return true;
                    rec.selectNewLine({sublistId: "inventory"});
                    rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "item", value: lineInfo.itemId});
                    rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "units", value: lineInfo.unitId});
                    rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "adjustqtyby", value: qty});
                    if (!fromLocUseBin && !toLocUseBin && !lineInfo.isLot && !lineInfo.isSerial) {
                        rec.commitLine({sublistId: "inventory"});
                        return true;
                    }
                    var subRec = rec.getCurrentSublistSubrecord({sublistId: "inventory", fieldId: "inventorydetail"});
                    removeLines(subRec, "inventoryassignment");
                    util.each(lineInfo.nums, function (numInfo) {
                        util.each(numInfo.bins, function (binInfo) {
                            var numQty = Number(binInfo[totalField] || numInfo[totalField]) - Number(binInfo[badTotalField] || numInfo[badTotalField] || 0);
                            if (!lineInfo.isLot && !lineInfo.isSerial && !fromLocUseBin && !toLocUseBin) numQty = qty;
                            if (numQty == 0) return true;
                            setBinNumber({subRec, bin: fromBin || binInfo.fromBin, fromLocUseBin, toBin: toBin || binInfo.toBin, toLocUseBin, num: numInfo.num, numFld: "issueinventorynumber", qty: numQty, status, toStatus});
                        })
                    })
                    rec.commitLine({sublistId: "inventory"});
                })
            }
            var recId = "";
            if (rec.getLineCount({sublistId: "inventory"}) > 0) recId = rec.save({ignoreMandatoryFields: true});
            return recId;
        }

        /**
         * 设置库存分配中的货位信息
         * @param subRec 子记录对象
         * @param bin 起始货位
         * @param fromLocUseBin 是否使用起始货位
         * @param toBin 目标货位
         * @param toLocUseBin 是否使用目标货位
         * @param num 库存数量
         * @param numFld 库存数量字段
         * @param qty 分配数量
         * @param status 库存状态
         * @param toStatus 目标库存状态
         * @throws {Object} 当提交行时出错，抛出错误对象
         */
        function setBinNumber({subRec, bin, fromLocUseBin, toBin, toLocUseBin, num, numFld, qty, status, toStatus}) {
            if (!qty) return;
            try {
                subRec.selectNewLine({sublistId: "inventoryassignment"});
                if (num) subRec.setCurrentSublistText({sublistId: "inventoryassignment", fieldId: numFld, text: num});
                if (bin && fromLocUseBin) subRec.setCurrentSublistValue({sublistId: "inventoryassignment", fieldId: "binnumber", value: bin});
                if (toBin && toLocUseBin) subRec.setCurrentSublistValue({sublistId: "inventoryassignment", fieldId: "tobinnumber", value: toBin});
                if (status) subRec.setCurrentSublistValue({sublistId: "inventoryassignment", fieldId: "inventorystatus", value: status});
                if (toStatus) subRec.setCurrentSublistValue({sublistId: "inventoryassignment", fieldId: "toinventorystatus", value: toStatus});
                subRec.setCurrentSublistValue({sublistId: "inventoryassignment", fieldId: "quantity", value: qty})
                subRec.commitLine({sublistId: "inventoryassignment"});
            } catch (e) {
                log.error({title: "setBinNumber", details: {bin, fromLocUseBin, toBin, toLocUseBin, num, numFld, qty, status, toStatus, e}})
                throw {num, bin, toBin, qty, message: e.message, stack: e.stack, code: "COMMIT_LINE"};
            }
        }

        /**
         * 创建货位转移单
         * @param options 配置选项
         * @param options.taskId 任务ID
         * @param options.trandate 事务日期
         * @param options.fromLoc 起始位置
         * @param options.fromLocUseBin 是否使用起始货位
         * @param options.bins 货位信息数组
         * @param options.bins.items 物品信息数组
         * @param options.bins.items.itemId 物品ID
         * @param options.bins.items.unitId 单位ID
         * @param options.bins.items.totalField 总数量字段名
         * @param options.bins.items.nums 数量信息数组
         * @param options.bins.items.nums.num 数量
         * @param options.bins.fromBin 起始货位
         * @param options.lines 行信息数组
         * @param options.lines.itemId 物品ID
         * @param options.lines.unitId 单位ID
         * @param options.lines.totalField 总数量字段名
         * @param options.lines.nums 数量信息数组
         * @param options.lines.nums.num 数量
         * @param options.lines.nums.bins 货位信息数组
         * @param options.lines.nums.bins.fromBin 起始货位
         * @param options.totalField 总数量字段名
         * @returns 返回货位转移单的记录ID
         */
        function createBT(options) {
            var {taskId, trandate, fromLoc, fromBin, toBin, bins, lines, totalField, status, toStatus} = options;
            var rec = record.create({type: "bintransfer", isDynamic: true});
            trandate && rec.setText({fieldId: "trandate", text: trandate});
            rec.setValue({fieldId: "location", value: fromLoc});
            taskId && rec.setValue({fieldId: "custbody_swc_wms_task_id", value: taskId});
            if (bins) {
                util.each(bins, function (binInfo) {
                    util.each(binInfo.items, function (itemInfo) {
                        rec.selectNewLine({sublistId: "inventory"});
                        rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "item", value: itemInfo.itemId});
                        rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "itemunits", value: itemInfo.unitId});
                        rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "quantity", value: itemInfo[totalField]});
                        var subRec = rec.getCurrentSublistSubrecord({sublistId: "inventory", fieldId: "inventorydetail"});
                        removeLines(subRec, "inventoryassignment");
                        var numQty = 0;
                        if (!itemInfo.isLot && !itemInfo.isSerial) {
                            numQty = itemInfo[totalField];
                            setBinNumber({subRec, bin: fromBin || binInfo.fromBin, fromLocUseBin: true, toBin: toBin || binInfo.toBin, toLocUseBin: true, qty: numQty, status, toStatus});
                        }
                        util.each(itemInfo.nums, function (numInfo) {
                            numQty = numInfo[totalField];
                            setBinNumber({subRec, bin: fromBin || binInfo.fromBin, fromLocUseBin: true, toBin: toBin || binInfo.toBin, toLocUseBin: true, num: numInfo.num, numFld: "issueinventorynumber", qty: numQty, status, toStatus});
                        })
                        rec.commitLine({sublistId: "inventory"});
                    })
                })
            } else if (lines) {
                util.each(lines, function (lineInfo) {
                    if (lineInfo[totalField] == 0) return true;
                    rec.selectNewLine({sublistId: "inventory"});
                    rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "item", value: lineInfo.itemId});
                    rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "itemunits", value: lineInfo.unitId});
                    rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "quantity", value: lineInfo[totalField]});
                    var subRec = rec.getCurrentSublistSubrecord({sublistId: "inventory", fieldId: "inventorydetail"});
                    removeLines(subRec, "inventoryassignment");
                    util.each(lineInfo.nums, function (numInfo) {
                        util.each(numInfo.bins, function (binInfo) {
                            var numQty = binInfo[totalField] || numInfo[totalField];
                            if (!lineInfo.isLot && !lineInfo.isSerial) numQty = lineInfo[totalField];
                            setBinNumber({subRec, bin: fromBin || binInfo.fromBin, fromLocUseBin: true, toBin: toBin || binInfo.toBin, toLocUseBin: true, num: numInfo.num, numFld: "issueinventorynumber", qty: numQty, status, toStatus});
                        })
                    })
                    rec.commitLine({sublistId: "inventory"});
                })
            }
            var recId = "";
            if (rec.getLineCount({sublistId: "inventory"}) > 0) recId = rec.save({ignoreMandatoryFields: true});
            return recId;
        }

        /**
         * 创建物品接收单
         * @param options 配置参数
         * @param options.taskId 任务ID
         * @param options.tranType 事务类型
         * @param options.tranId 事务ID
         * @param options.trandate 事务日期
         * @param options.toLoc 目标位置
         * @param options.toBin 目标货位
         * @param options.lines 行信息数组
         * @param options.totalField 总数量字段名
         * @param options.status 状态
         * @returns 返回物品接收单的记录ID
         */
        function createIR(options) {
            var {taskId, tranType, tranId, trandate, toLoc, toBin, lines, totalField, badTotalField, status, restock} = options;
            var rec;
            try {
                rec = record.transform({fromType: tranType, fromId: tranId, toType: "itemreceipt", isDynamic: true});
            } catch (e) {
                log.error("创建失败", tranType + "-" + tranId + ":" + e.message);
                return;
            }
            trandate && rec.setText({fieldId: "trandate", text: trandate});
            taskId && rec.setValue({fieldId: "custbody_swc_wms_task_id", value: taskId});

            var locsInfo = getLocInfo({locIds: toLoc});
            var toLocUseBin = locsInfo[toLoc].useBin;

            var flag = false;
            var count = rec.getLineCount({sublistId: "item"});
            for (var i = 0; i < count; i++) {
                var line = rec.getSublistValue({sublistId: "item", fieldId: "line", line: i});
                rec.selectLine({sublistId: "item", line: i})
                var lineInfo = lines[line];
                if (!lineInfo) {
                    rec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive", value: false});
                    continue;
                }
                var qty = Number(lineInfo[totalField]) - Number(lineInfo[badTotalField] || 0);
                if (qty > 0) {
                    rec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive", value: true});
                    rec.setCurrentSublistValue({sublistId: "item", fieldId: "location", value: toLoc});
                    rec.setCurrentSublistValue({sublistId: "item", fieldId: "quantity", value: qty});
                    restock && rec.setCurrentSublistValue({sublistId: "item", fieldId: "restock", value: true});
                    lineInfo.unitCost && rec.setCurrentSublistValue({sublistId: "item", fieldId: "unitcostoverride", value: lineInfo.unitCost});
                    if (!toLocUseBin && !lineInfo.isLot && !lineInfo.isSerial) {
                        rec.commitLine({sublistId: "item"});
                        flag = true;
                        continue;
                    }
                    var subRec = rec.getCurrentSublistSubrecord({sublistId: "item", fieldId: "inventorydetail"});
                    removeLines(subRec, "inventoryassignment");
                    util.each(lineInfo.nums, function (numInfo) {
                        util.each(numInfo.bins, function (binInfo) {
                            var numQty = Number(binInfo[totalField] || numInfo[totalField]) - Number(binInfo[badTotalField] || numInfo[badTotalField] || 0);
                            if (!lineInfo.isLot && !lineInfo.isSerial) numQty = qty;
                            setBinNumber({subRec, bin: binInfo.toBin || toBin, fromLocUseBin: toLocUseBin, num: numInfo.num, numFld: "receiptinventorynumber", qty: numQty, status});
                        })
                    })
                    rec.commitLine({sublistId: "item"});
                    flag = true;
                } else {
                    rec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive", value: false});
                }
            }
            var id = "";
            if (flag) id = rec.save({ignoreMandatoryFields: true});
            return id;
        }

        /**
         * 移除指定子列表中的所有行
         * @param rec 记录对象
         * @param sublistId 子列表ID
         */
        function removeLines(rec, sublistId) {
            var count = rec.getLineCount({sublistId: sublistId});
            for (var i = 0; i < count; i++) {
                rec.removeLine({sublistId: sublistId, line: 0})
            }
        }

        /**
         * 创建库存调整单
         * @param options 配置参数
         * @param options.taskId 任务ID
         * @param options.oneWorld 是否启用OneWorld
         * @param options.trandate 事务日期
         * @param options.subsidiary 子公司
         * @param options.toLoc 目标位置
         * @param options.toLocUseBin 目标位置是否使用货位
         * @param options.lines 行信息数组
         * @param options.lines.itemId 物品ID
         * @param options.lines.unitId 单位ID
         * @param options.lines.nums 数量信息数组
         * @param options.lines.nums.num 数量
         * @param options.lines.nums.bins 货位信息数组
         * @param options.lines.nums.bins.fromBin 起始货位
         * @param options.totalField 总数量字段名
         * @param options.status 状态
         * @returns 返回库存调整单的记录ID
         */
        function createIA(options) {
            var {taskId, oneWorld, trandate, subsidiary, toLoc, toBin, lines, totalField, badTotalField, status} = options;
            var rec = record.create({type: "inventoryadjustment", isDynamic: true});
            oneWorld && rec.setValue({fieldId: "subsidiary", value: subsidiary});
            rec.setValue({fieldId: "adjlocation", value: toLoc});
            trandate && rec.setText({fieldId: "trandate", text: trandate});
            taskId && rec.setValue({fieldId: "custbody_swc_wms_task_id", value: taskId});

            var otherInfo = getOtherInfoByTask({taskId});
            rec.setValue({fieldId: "account", value: otherInfo.account});
            otherInfo.department && rec.setValue({fieldId: "department", value: otherInfo.department});
            otherInfo.memo && rec.setValue({fieldId: "memo", value: otherInfo.memo});
            otherInfo.woId && rec.setValue({fieldId: "custbody_swc_wo_link", value: otherInfo.woId});

            var locsInfo = getLocInfo({locIds: toLoc});
            var toLocUseBin = locsInfo[toLoc].useBin;

            var flag = false;
            util.each(lines, function (lineInfo) {
                var qty = Number(lineInfo[totalField]) - Number(lineInfo[badTotalField] || 0);
                if (qty <= 0) return true;
                rec.selectNewLine({sublistId: "inventory"});
                rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "item", value: lineInfo.itemId});
                rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "location", value: toLoc});
                rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "units", value: lineInfo.unitId});
                rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "adjustqtyby", value: otherInfo.otherType == 1 ? -lineInfo[totalField] : lineInfo[totalField]});
                lineInfo.unitCost && rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "unitcost", value: lineInfo.unitCost});
                otherInfo.noCost && rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "unitcost", value: 0});
                if (!toLocUseBin && !lineInfo.isLot && !lineInfo.isSerial) {
                    rec.commitLine({sublistId: "inventory"});
                    flag = true;
                    return true;
                }
                var subRec = rec.getCurrentSublistSubrecord({sublistId: "inventory", fieldId: "inventorydetail"});
                removeLines(subRec, "inventoryassignment");
                var numFld = otherInfo.otherType == 1 ? "issueinventorynumber" : "receiptinventorynumber";
                util.each(lineInfo.nums, function (numInfo) {
                    util.each(numInfo.bins, function (binInfo) {
                        var numQty = Number(numInfo[totalField]) - Number(numInfo[badTotalField] || 0);
                        numQty = otherInfo.otherType == 1 ? -numQty : numQty;
                        if (!lineInfo.isLot && !lineInfo.isSerial && !toLocUseBin) numQty = otherInfo.otherType == 1 ? -qty : qty;
                        if (numQty == 0) return true;
                        setBinNumber({subRec, bin: binInfo.fromBin || binInfo.toBin || toBin, fromLocUseBin: toLocUseBin, num: numInfo.num, numFld, qty: numQty, status});
                    })
                })
                rec.commitLine({sublistId: "inventory"});
                flag = true;
            })
            var id = "";
            if (flag) id = rec.save({ignoreMandatoryFields: true});
            return id;
        }

        /**
         * 根据任务ID获取其他信息
         * @param taskId 任务ID
         * @returns 返回包含科目和其他出入库类型的对象
         */
        function getOtherInfoByTask({taskId}) {
            var otherInfo = {};
            var customrecord_swc_other_inout_mastersSearchObj = search.create({
                type: "customrecord_swc_other_inout_masters",
                filters: [["custrecord_swt_otherid.internalid", "anyof", taskId]],
                columns: [
                    search.createColumn({name: "custrecord_sos_account", join: "CUSTRECORD_SOIM_SCENARIO", label: "科目"}),
                    search.createColumn({name: "custrecord_sos_type", join: "CUSTRECORD_SOIM_SCENARIO", label: "其他出入库类型"}),
                    search.createColumn({name: "custrecord_sos_no_cost", join: "CUSTRECORD_SOIM_SCENARIO", label: "零成本入库"}),
                    search.createColumn({name: "custrecord_soim_department", label: "部门"}),
                    search.createColumn({name: "custrecord_soim_memo", label: "备注"}),
                    search.createColumn({name: "custrecord_swc_work_order", label: "关联工单"}) // 定制开发
                ]
            });
            customrecord_swc_other_inout_mastersSearchObj.run().each(function(result){
                otherInfo.account = result.getValue({name: "custrecord_sos_account", join: "CUSTRECORD_SOIM_SCENARIO"});
                otherInfo.otherType = result.getValue({name: "custrecord_sos_type", join: "CUSTRECORD_SOIM_SCENARIO"});
                otherInfo.noCost = result.getValue({name: "custrecord_sos_no_cost", join: "CUSTRECORD_SOIM_SCENARIO"});
                otherInfo.department = result.getValue({name: "custrecord_soim_department"});
                otherInfo.memo = result.getValue({name: "custrecord_soim_memo"});
                otherInfo.woId = result.getValue({name: "custrecord_swc_work_order"});
                return true;
            });
            return otherInfo;
        }

        /**
         * 创建 IF
         * @param options 配置参数
         * @param options.taskId 任务ID
         * @param options.tranType 交易类型
         * @param options.tranId 交易ID
         * @param options.trandate 交易日期
         * @param options.fromLoc 来源仓位
         * @param options.fromBin 来源货位
         * @param options.lines 行信息
         * @param options.totalField 总数量字段
         * @param options.status 状态
         * @returns 返回创建的记录ID
         */
        function createIF(options) {
            var {taskId, tranType, tranId, trandate, fromLoc, fromBin, lines, totalField, badTotalField, status} = options;
            var rec = record.transform({fromType: tranType, fromId: tranId, toType: "itemfulfillment", isDynamic: true});
            rec.setValue({fieldId: "shipstatus", value: "C"});
            trandate && rec.setText({fieldId: "trandate", text: trandate});
            taskId && rec.setValue({fieldId: "custbody_swc_wms_task_id", value: taskId});

            var locsInfo = getLocInfo({locIds: fromLoc});
            var fromLocUseBin = locsInfo[fromLoc].useBin;

            var flag = false;
            var count = rec.getLineCount({sublistId: "item"});
            for (var i = 0; i < count; i++) {
                var line = rec.getSublistValue({sublistId: "item", fieldId: "line", line: i});
                rec.selectLine({sublistId: "item", line: i});
                var lineInfo = lines[line];
                if (!lineInfo) {
                    rec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive", value: false});
                    continue;
                }
                var qty = Number(lineInfo[totalField]) - Number(lineInfo[badTotalField] || 0);
                if (qty > 0) {
                    rec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive", value: true});
                    rec.setCurrentSublistValue({sublistId: "item", fieldId: "location", value: fromLoc});
                    rec.setCurrentSublistValue({sublistId: "item", fieldId: "quantity", value: qty});
                    if (!fromLocUseBin && !lineInfo.isLot && !lineInfo.isSerial && !status) {
                        rec.commitLine({sublistId: "item"});
                        flag = true;
                        continue;
                    }
                    var subRec = rec.getCurrentSublistSubrecord({sublistId: "item", fieldId: "inventorydetail"});
                    removeLines(subRec, "inventoryassignment");
                    util.each(lineInfo.nums, function (numInfo) {
                        util.each(numInfo.bins, function (binInfo) {
                            var num = numInfo.num;
                            var numQty = binInfo[totalField] || numInfo[totalField];
                            if (!lineInfo.isLot && !lineInfo.isSerial && !fromLocUseBin) {
                                num = null;
                                numQty = lineInfo[totalField];
                            }
                            if (numQty == 0) return true;
                            setBinNumber({subRec, bin: binInfo.fromBin || fromBin, fromLocUseBin: fromLocUseBin, num: num, numFld: "issueinventorynumber", qty: numQty, status});
                        })
                    })
                    rec.commitLine({sublistId: "item"});
                    flag = true;
                } else {
                    rec.setCurrentSublistValue({sublistId: "item", fieldId: "itemreceive", value: false});
                }
            }
            var id = "";
            if (flag) id = rec.save({ignoreMandatoryFields: true});
            return id;
        }

        function createISC(options) {
            var {taskId, oneWorld, trandate, subsidiary, iscLoc, locUsebin, lines, totalField, status, toStatus} = options;
            var rec = record.create({type: "inventorystatuschange", isDynamic: true});
            oneWorld && rec.setValue({fieldId: "subsidiary", value: subsidiary});
            trandate && rec.setText({fieldId: "trandate", text: trandate});
            rec.setValue({fieldId: "location", value: iscLoc});
            rec.setValue({fieldId: "previousstatus", value: status});
            rec.setValue({fieldId: "revisedstatus", value: toStatus});
            taskId && rec.setValue({fieldId: "custbody_swc_wms_task_id", value: taskId});

            util.each(lines, function (lineInfo) {
                var qty = Number(lineInfo[totalField]);
                if (qty == 0) return true;
                rec.selectNewLine({sublistId: "inventory"});
                rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "item", value: lineInfo.itemId});
                rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "itemunits", value: lineInfo.unitId});
                rec.setCurrentSublistValue({sublistId: "inventory", fieldId: "quantity", value: qty});
                if (!locUsebin && !lineInfo.isLot && !lineInfo.isSerial) {
                    rec.commitLine({sublistId: "inventory"});
                    return true;
                }
                var subRec = rec.getCurrentSublistSubrecord({sublistId: "inventory", fieldId: "inventorydetail"});
                removeLines(subRec, "inventoryassignment");
                util.each(lineInfo.nums, function (numInfo) {
                    util.each(numInfo.bins, function (binInfo) {
                        var numQty = Number(binInfo[totalField] || numInfo[totalField]);
                        if (!lineInfo.isLot && !lineInfo.isSerial && !locUsebin) numQty = qty;
                        if (numQty == 0) return true;
                        setBinNumber({subRec, bin: binInfo.fromBin, fromLocUseBin: locUsebin, num: numInfo.num, numFld: "issueinventorynumber", qty: numQty});
                    })
                })
                rec.commitLine({sublistId: "inventory"});
            })

            var recId = "";
            if (rec.getLineCount({sublistId: "inventory"}) > 0) recId = rec.save({ignoreMandatoryFields: true});
            return recId;
        }

        return {
            getPrefBin: getPrefBin,
            getCachedItemsInfo: getCachedItemsInfo,
            doPush: doPush,
            updateInventoryNumbers: updateInventoryNumbers,
            allocatePro: allocatePro,
            allocateExtra: allocateExtra,
            getItemBinNumbers: getItemBinNumbers,
            nowDate: nowDate,
            getFontSizeByLength: getFontSizeByLength,
            formatDateToBatch: formatDateToBatch,
            getTimeByTimeZone: getTimeByTimeZone,
            getDateByUser: getDateByUser,
            getDateByTimeZoneId: getDateByTimeZoneId,

            getWMSBasicConfig: getWMSBasicConfig,
            getWMSTranslation: getWMSTranslation,
            getWMSUserInfo: getWMSUserInfo,
            getWMSRoleInfo: getWMSRoleInfo,
            getLocInfo: getLocInfo,
            transformObjToArr: transformObjToArr,
            getPageInfoFromSearch: getPageInfoFromSearch,
            getPageInfoFromArr: getPageInfoFromArr,
            getWMSTaskType: getWMSTaskType,
            getSubFunction: getSubFunction,
            getLabelInfo: getLabelInfo,
            getItemInfo: getItemInfo,
            getBinInfo: getBinInfo,
            getIQCMode: getIQCMode,
            getInventoryBalance: getInventoryBalance,
            createOrUpdateJsonRec: createOrUpdateJsonRec,
            createJsonRec: createJsonRec,
            getWMSTaskInfo: getWMSTaskInfo,
            getJsonRecInfo: getJsonRecInfo,
            transformTaskLocsToJson: transformTaskLocsToJson,
            transformInvLocsToJson: transformInvLocsToJson,
            mergeJson: mergeJson,
            mergeTaskAndJson: mergeTaskAndJson,
            complementAndTransferTaskInfo: complementAndTransferTaskInfo,
            parseNumsField: parseNumsField,
            parseLabelConfig: parseLabelConfig,
            getDifferenceInfo: getDifferenceInfo,
            getTaskLocation:getTaskLocation,
            getConversionrate:getConversionrate,
            processLabelRecord: processLabelRecord,
            batchProcessLabel: batchProcessLabel,
            chunkArrayIntoPairs: chunkArrayIntoPairs,
            taskCreate: taskCreate,
            setBinNumber: setBinNumber,
            createIT: createIT,
            createBT: createBT,
            createIR: createIR,
            createIA: createIA,
            createIF: createIF,
            createISC: createISC
        }
    });
