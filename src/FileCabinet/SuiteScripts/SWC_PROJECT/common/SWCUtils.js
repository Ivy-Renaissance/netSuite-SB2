/**
 * 共通方法
 * @NApiVersion 2.1
 * @NModuleScope public
 */
define(["N/https","N/record","N/search","N/url","N/task","N/runtime","N/email","N/util"],

    function (https,record,search,URL,task,runtime,email,util) {
       //子串的最大长度
        var MAX_PART_LENGTH = 1000000;
        //获取全部result的时候，每次抓取的条数
        const STEP = 1000;

        //每页默认条数
        const DEFAULT_PAGE_SIZE = 50;

        //当前页默认为第一页
        const DEFAULT_CUR_PAGE = 1;

        /**
         * 获取全部结果
         * @param options.searchObj search对象
         * @param options.cb 处理result的回调函数
         * @return {results:[]}
         */
        function getAllResults(options) {
            var data = {results: []};
            var searchObj = options.searchObj;

            var resultSet = searchObj.run();
            var results = null;
            var start = 0;
            var end = STEP;
            do {
                results = resultSet.getRange({start: start, end: end});
                if (results && results.length) {
                    data.results = data.results.concat(results);

                    //针对每条result 调用回调函数
                    var cb = options.cb;
                    results.forEach(function (result, index) {
                        if (typeof cb == "function") {
                            cb(result, index);
                        }
                    });
                }
                start += STEP;
                end += STEP;
            } while (results && results.length)
            return data;
        }

        /**
         * 获取全部结果(query方式)
         * @param options.queryObj query对象
         * @param options.cb 处理result的回调函数
         * @return {results:[]}
         */
        function getAllResultsQuery(options) {
            var data = {results: []};
            var queryObj = options.queryObj;
            var cb = options.cb;
            //通过runPaged 可以获取到全部数据
            var pagedData = queryObj.runPaged({pageSize:1000});
            pagedData.iterator().each(function(pageData){
                var page = pageData.value;
                var results = page.data.results;
                if(util.isFunction(cb)){
                    results && results.forEach(cb);
                }else{
                    data.results= data.results.concat(results);
                }
                return true;
            })
            return data;
        }


        function getAllResultsPro(options) {
            var data = {results: []};
            var searchObj = options.searchObj;

            //最大一个下标，例如start 为1000，endIndex为3000，表示只取1000~3000 范围内的数据
            var endIndex = options.endIndex;
            var resultSet = searchObj.run();
            var results = null;
            var start = options.start||0;
            var end = Number(start)+STEP;
            if(endIndex){
                end = Math.min(end,endIndex);
            }
            do {
                results = resultSet.getRange({start: start, end: end});
                if (results && results.length) {
                    data.results = data.results.concat(results);

                    //针对每条result 调用回调函数
                    var cb = options.cb;
                    results.forEach(function (result, index) {
                        if (typeof cb == "function") {
                            cb(result, index);
                        }
                    });
                }
                start += STEP;
                end += STEP;
                if(endIndex){
                    end = Math.min(end,endIndex);
                }
            } while (results && results.length)
            return data;
        }

        /**
         * 按页抓取全量数据
         * @param options
         * @return {{pageRanges: [], totalPages: number, totalCount: number, results: []}}
         */
        function getAllResultsByPage(options) {
            var data = {
                results: [],
                totalCount:0,
                pageRanges:[],
                totalPages:0
            };
            //不存储results[],以便节约空间
            var donotStoreResults = options.donotStoreResults;

            var searchObj = options.searchObj;
            var pagedData = searchObj.runPaged({pageSize: STEP});
            //记录总条数
            data.totalCount = pagedData.count;
            //如果没有结果，则直接返回
            if(!pagedData.count){
                return data;
            }
            data.pageRanges = pagedData.pageRanges;
            var totalPages = data.totalPages = data.pageRanges.length;
            var startPage = Number(options.startPage||0);
            var endPage = totalPages;
            //从startPage开始取N页
            if(options.pageCount){
                endPage = Math.min(totalPages,startPage + Number(options.pageCount));
            }

            for(var i =startPage;i<endPage;i++){
                //抓取指定页
                var page = pagedData.fetch({index: i});
                var results = page.data;
                if (results && results.length) {
                    if(!donotStoreResults){
                        data.results = data.results.concat(results);
                    }
                    //针对每条result 调用回调函数
                    var cb = options.cb;
                    results.forEach(function (result, index) {
                        if (util.isFunction(cb)) {
                            cb(result, index);
                        }
                    });
                }
            }

            return data;
        }


        /**
         * 分页共通
         * @param options.searchObj search对象
         * @param curPage 第几页
         * @param pageSize 每页数据条数
         * @param cb 处理result 回调函数
         * @return {results:[],pageSize:*,curPage:*,totalCount:*,totalPages:*,pageRanges:[{index:*,compoundLabel:*}]}
         */
        function getPagedResults(options) {
            var data = {
                results: [],
                totalCount:0,
                pageRanges:[],
                totalPages:0
            };

            var searchObj = options.searchObj;
            var pageSize = data.pageSize = options.pageSize || DEFAULT_PAGE_SIZE;
            var pagedData = searchObj.runPaged({pageSize: pageSize});


            //记录总条数
            data.totalCount = pagedData.count;

            //如果没有结果，则直接返回
            if(!pagedData.count){
                return data;
            }

            data.pageRanges = pagedData.pageRanges;
            data.totalPages = data.pageRanges.length;

            //当前页取“传入的当前页”与“实际总页数”的最小值
            var curPage = data.curPage = Math.min(options.curPage || DEFAULT_CUR_PAGE,data.totalPages);

            //抓取指定页
            var page = pagedData.fetch({index: curPage - 1});

            var results = page.data;
            if (results && results.length) {
                data.results = data.results.concat(results);
                //针对每条result 调用回调函数
                var cb = options.cb;
                results.forEach(function (result, index) {
                    if (typeof cb == "function") {
                        cb(result, index);
                    }
                });
            }
            return data;
        }

        /**
         * 获取全部结果并JSON化
         * @param options.searchObj search test
         */
        function getAllResultsV2(options) {
            var data = {results: [], resultsJsonAry: []};

            var searchObj = options.searchObj;
            var resultSet = searchObj.run();
            var results = null;
            var start = 0;
            var end = STEP;
            do {
                results = resultSet.getRange({start: start, end: end});
                if (results && results.length) {
                    // log.audit("results",util.isArray( results))
                    data.results = data.results.concat(results);
                    results.forEach(function (result, index) {
                        data.resultsJsonAry.push(JSON.parse(JSON.stringify(result)).values);
                        log.audit("result:" + index, JSON.stringify(result.values))
                    });
                }
                start += STEP;
                end += STEP;
            } while (results && results.length)
            return data;
        }

        /**
         * 返回结果键值对
         * <id>:{<columnName>:<value>}
         * 文本key在column name 末尾加$： employee$
         */
        function getAllResultsJson(options){
            var type = options.type;
            var filters = options.filters||null;
            var columns = options.columns;
            var key = options.key;
            var cb = options.cb;

            var searchObj = search.create({
                type:type,
                filters:filters,
                columns:columns
            });

            //返回结果
            var data = {};

            getAllResults({
                searchObj:searchObj,
                cb:function(result){
                    var id = key ? result.getValue(key) : result.id;
                    var curData = data[id]={};
                    columns && columns.forEach(function(col){
                        if(util.isString(col)){
                            curData[colName] = result.getValue(col);
                            var txt = result.getText(col);
                            if(txt){
                                curData[colName+"$"] = txt;
                            }
                        }else{
                            var colName = col.name;
                            curData[colName] = result.getValue(col)
                            var txt = result.getText(col);
                            if(txt){
                                curData[colName+"$"] = txt;
                            }
                        }
                    })

                    if(key){
                        data[id].id=result.id;
                    }

                    //处理curData
                    cb && cb(curData,id);
                }
            })

            return data;
        }

        /**
         * 结果集id 数组
         * @param options
         * @return {[]}
         */
        function getAllResultIds(options){
            var ids = [];
            getAllResults({
                searchObj:options.searchObj,
                cb:function (result) {
                    ids.push(result.id);
                }
            })
            return ids;
        }

        /**
         * 结果集id JSON
         * @param options
         * @return {[]}
         */
        function getAllResultIdsJson(options){
            var ids = [];
            getAllResults({
                searchObj:options.searchObj,
                cb:function (result) {
                    ids.push(result.id);
                }
            })
            return ids;
        }



        function hasResults(results){
            return results &&results.length;
        }

        function hasResultsV2(results){
            return results &&results.length && results[0];
        }


        /**
         * 拆解长字符串
         * 例如：字符串长20，每个小串3个字符，则一共拆解为7个小串
         * 如果传入回调方法，则最终返回的数组为空（考虑存储空间问题）
         *
         */
        function splitStr(options){
            //原始字符串
            var str = options.str;
            var length = str.length;
            //每个小串的长度
            var partLength = Number(options.partLen||MAX_PART_LENGTH);
            //回调方法
            var cb = options.cb;
            //小串构成的数组
            var strAry = [];
            for(var i=0,j=0;i<length;i+=partLength,j++){
                var part = str.substr(i,partLength);
                if(cb){
                    cb(part,j);
                }else{
                    strAry.push(part);
                }
            }
            return strAry;
        }

        /**
         * 根据filter config 创建filter expression
         * {name:"x",op:"",val:"",val2:""}
         */
        function buildFilter(options){
            var filter = [];
            if(!options.val){
                return;
            }
            if(options.val){
                filter.push(options.name,options.op,options.val);
                if(options.val2){
                    filter.push(options.val2);
                }
            }
            return filter;

        }

        /**
         * 添加filter到filters
         * @param filters
         * @param filter
         */
        function addFilter(filters,extrafilter,isOr){
            if(!hasResults(extrafilter)){
                return;
            }
            if(filters.length){
                filters.push(isOr?"or":"and");
            }

            filters.push(extrafilter);
        }

        /**
         * 创建超链接标签
         * @param options
         * @return {string}
         */
        function buildHref(options){
            var id = options.id;
            var label = options.label;
            var recType = options.recType;
            var url = URL.resolveRecord({recordType:recType,recordId:id});
            var href = "<a href='"+url+"' target='_blank'>"+label+"</a>";
            return href;
        }


        /**
         *
         */
        function buildNameFilter(fldId,ary){
            var filters = [];
            ary.map(function(val){
                addFilter(filters,[fldId,"is",val],true);
            })
            return filters;
        }


        /**
         * 获取可用的deployment
         * @param options
         * @return {*}
         */
        function getDeploymentsInQueue(options){
            var scriptId = options.scriptId; //e.g. customscript_swc_mr_toplan
            //查询队列中的deployment
            var scriptDeployInQueues = [];
            var insSearchObj = search.create({
                type: "scheduledscriptinstance",
                filters:
                    [
                        ["status","anyof","PENDING","PROCESSING","RESTART","RETRY"],
                        "AND",
                        ["script.scriptid","startswith",scriptId]
                    ],
                columns:
                    [{name: "internalid",join: "scriptDeployment"}]
            });
            getAllResults({
                searchObj:insSearchObj,
                cb:function(result){
                    var id = result.getValue({name: "internalid",join: "scriptDeployment"});
                    scriptDeployInQueues.push(id);
                }
            });
            return scriptDeployInQueues;


        }


        /**
         * 获取所有的deployments
         * @param options
         * @return {*}
         */
        function getDeployments(options){
            var ids =[];
            var scriptId = options.scriptId;
            //获取所有deployment
            var searchObj = search.create({
                type: "scriptdeployment",
                filters:  ["script.scriptid","is",scriptId],
                columns:["scriptid"]
            });
            var results = getAllResults({
                searchObj:searchObj,
                cb:function(result){
                    ids.push(result.getValue("scriptid"))
                }
            });
            return ids;
        }

        /**
         * 创建task
         * @param options
         */
        function createTask(options){
            var retryCount = options.retryCount||5;
            var ids = getDeployments(options);
            retryCount = Math.min(retryCount,ids.length);
            for(var i=0;i<retryCount;i++){
                try{
                    options.deploymentId = ids[i];
                    var taskRec = task.create(options);
                    var taskId = taskRec.submit();
                    return taskId;
                }catch(e){
                    log.error({title:"createTask:"+retryCount,details:e})
                }
            }
        }

        /**
         * 日期格式化
         * @param date
         * @param format
         * @return {nlobjCredentialBuilder|void|string|*}
         */
        function formatDate(date, format) {
            format = format.replace(/yyyy/g, date.getFullYear());
            format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
            format = format.replace(/dd/g, ('0' + date.getDate()).slice(-2));
            format = format.replace(/HH/g, ('0' + date.getHours()).slice(-2));
            format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
            format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
            format = format.replace(/SSS/g, ('00' + date.getMilliseconds()).slice(-3));
            return format;
        }

        /**
         * 将yyyymmdd转为date对象
         * @param yyyymmdd
         */
        function parseDate(str){
            var year = str.substr(0,4);
            var month = str.substr(4,2);
            var day = str.substr(6,2);
            return new Date(year,month-1,day)
        }

        /**
         * 将JSON对象转为字符串，设置到字段
         * @param options
         */
        function setJSONFieldValue(options){
            var rec = options.rec;
            var fieldId = options.fieldId;
            var obj = options.obj||{};
            rec.setValue({fieldId:fieldId,value:JSON.stringify(obj)})
        }

        /**
         * 将JSON字符串转为对象
         * @param options
         */
        function getJSONFieldValue(options){
            var rec = options.rec;
            var fieldId = options.fieldId;
            var str = rec.getValue({fieldId:fieldId})||"{}";
            return JSON.parse(str);
        }

        /**
         * 为big field 创建search columns
         * @param fieldId
         * @param count
         * @return {[]}
         */
        function createBigColumns({fieldId,count}){
            var cols = [];
            for(var i =0;i<count;i++){
                cols.push(fieldId+(i?i:""));
            }
            return cols;
        }

        /**
         * 读取
         * @param result
         * @param fieldId
         * @param count
         * @return {string}
         */
        function getBigColumnsValue({result,fieldId,count}){
            var str = "";
            for(var i =0;i<count;i++){
                var val = result.getValue({name:fieldId+(i?i:"")})||"";
                str += val;
            }
            return str;
        }

        /**
         * 设置大数据到字段里
         * @param options.rec
         * @param options.fieldId
         * @param options.str
         * @param options.fldCount  字段个数
         * @param options.partLen 分解后的每个字符串的长度
         */
        function setBigValue(options){
            var rec=options.rec;
            var fieldId=options.fieldId;
            var str=options.str;
            var fldCount =options.fldCount;
            var partLen = options.partLen||MAX_PART_LENGTH;
            //先清空所有字段
            for(var i=0;i<fldCount;i++){
                rec.setValue({fieldId:fieldId+(i?i:""),value:""});
            }

           var strAry = splitStr({str:str,partLen:partLen});
           strAry.forEach(function(partStr,index){
               rec.setValue({fieldId:fieldId+(index?index:""),value:partStr});
           });
        }


        /**
         * 将存储的值全部清空
         */
        function clearBigValues(options){
            var rec=options.rec;
            var fieldId=options.fieldId;
            var fldCount =options.fldCount;
            for(var i =0;i<fldCount;i++){
                rec.setValue({fieldId:fieldId+(i?i:""),value:null});
            }
        }



        /**
         * 获取大数据值
         * @param options.rec
         * @param options.fieldId
         * @param options.fldCount
         * @return {string}
         */
        function getBigValue(options){
            var rec=options.rec;
            var fieldId=options.fieldId;
            var fldCount =options.fldCount;
            var str = "";
            for(var i=0;i<fldCount;i++){
                var fldid = fieldId+(i?i:"");
                var partStr = rec.getValue({fieldId:fldid.toString()})||"";
                str += partStr;
            }
            return str;
        }


        /**
         * 根据特定大小进行拆分
         * @param total
         * @param size
         */
        function splitBigResultSetBySize(total,size){
            var data = {};
            var start = 0;
            var end = 0;
            do {
                end = start + Number(size);
                data[start] = end;
                start += Number(size);
            }while(end < total)
            return data;
        }
        /**
         * 根据记录总条数，以及并发数，拆分起始和截止下标
         * useMoreQueues :表示尽可能充分利用queue，比如总数2001，共2个queue，分配之后为 {0:1000,1000:2000,2000:3000}
         *                如果为false，则结果为{0:2000,2000:4000}
         */
        function splitBigResultSet(total,concurrentCount,useMoreQueues){
            //{start:end}
            var data = {};
            //按照1000进行分组
            var totalParts = Math.ceil(total/1000 );
            concurrentCount = Math.min(totalParts,concurrentCount);
            //useMoreQueues 为true向下取整，否则向上取整
            var batch =  useMoreQueues ? Math.floor(totalParts / concurrentCount):Math.ceil(totalParts / concurrentCount);
            var start = 0;
            var end = 0;
            do{
                end = start + batch*1000;
                data[start] = end;
                start += batch*1000;
            }while (end < total);
            return data;
        }


        /**
         * 拆分页码，比如，一共有5页，每次抓取2页，则返回的结果为[0,2,4],表示起始页分别为0,2,4
         * totalPages ： 总页数
         * pageCount ：显示N页
         *
         */
        function splitPages(totalPages,pageCount){
            //起始页码的数组
            var pages = [];
            for(var i =0;i<totalPages;i+=pageCount){
                pages.push(i);
            }
            return pages;
        }

        /**
         * 存储数据到cache
         * @param cacheName
         * @param str
         */
        function saveCache(options){
            var cacheName=options.cacheName;

            var fldCount = options.fldCount||1;

            var cacheId = Constants.CACHE_MAP[cacheName];
            if(!cacheId){
                return;
            }

            var cacheRec = record.load({type:"customrecord_swms_cache",id:cacheId});
            //获取日期字符串，用于search filter
            var lastMod = cacheRec.getText({fieldId:"custrecord_swmsc_last_mod"});

            var str = options.str||getBigValue({rec:cacheRec,fieldId:"custrecord_swmsc_data",fldCount:fldCount});

            //整合增量数据
            var cb = options.cb;
            if(util.isFunction(cb)){
                str = cb(str,lastMod);
            }

            clearBigValues({rec:cacheRec,fieldId:"custrecord_swmsc_data",fldCount:fldCount});
            setBigValue({rec:cacheRec,fieldId:"custrecord_swmsc_data",str:str});
            cacheRec.setValue({fieldId:"custrecord_swmsc_last_mod",value:new Date()})
            var id = cacheRec.save();
            return id;
        }

        /**
         * 获取缓存字符串
         * @param cacheName
         * @param fldCount
         */
        function getCache(options){
            var cacheName=options.cacheName;
            var fldCount = options.fldCount||1;

            var cacheId = Constants.CACHE_MAP[cacheName];
            if(!cacheId){
                return;
            }
            var cacheRec = record.load({type:"customrecord_swms_cache",id:cacheId});
            var lastMod = cacheRec.getText({fieldId:"custrecord_swmsc_last_mod"});
            var lastModDate = cacheRec.getValue({fieldId:"custrecord_swmsc_last_mod"});
            var str = getBigValue({rec:cacheRec,fieldId:"custrecord_swmsc_data",fldCount:fldCount});
            //整合增量数据
            var cb = options.cb;
            if(util.isFunction(cb)){
                str = cb(str,lastMod,lastModDate);
            }
            return str;
        }

        /**
         * MR 同步执行
         * @param options.params
         * @param options.getInputData
         * @param options.map
         * @param options.summarize
         */
        function  MRSync(options) {
            //输入参数
            var params = options.params;

            var getInputData = options.getInputData;
            var map = options.map;
            var summarize = options.summarize;

            //整理数据
            var inputData = {};
            var processResult = {};
            var errors = {};
            if(util.isFunction(getInputData)){
                inputData = getInputData(params);
            }
            if(inputData){
                util.each(inputData,function(value,key){
                    try{
                        //执行数据
                        var retVal = map({value:value,key:key,params:params});
                        if(retVal){
                            processResult[key] = retVal;
                        }
                    }catch(e){
                        errors[key] = e;
                    }
                });
            }

            //整合数据
            if(util.isFunction(summarize)){
                summarize({processResult:processResult,errors:errors,params:params});
            }
        }

        /**
         * 检查是否是MR 运行环境
         */
        function isMR(){
            return (runtime.executionContext == "MAPREDUCE");
        }


        /**
         * 重新调用当前MR
         * @param options.scriptId 为空则取当前scriptId
         * @param options.deploymentId 为空则取当前deploymentId
         * @param options.params
         */
        function rescheduleMR(options){
            var status = task.create({
                taskType:task.TaskType.MAP_REDUCE,
                scriptId:options.scriptId || runtime.getCurrentScript().id,
                deploymentId:options.deploymentId||runtime.getCurrentScript().deploymentId,
                params:options.params||null
            }).submit();
            return status;
        }

        /**
         * 获取script parameter
         */
        function getScriptParam(paramName){
            return runtime.getCurrentScript().getParameter({name:paramName});
        }

        /**
         * summary 阶段，整理errors和processResult
         * @param options.summaryContext
         *
         */
        function processSummary(options){
            var summaryContext = options.summaryContext;
            //异常
            var errors = {};
            summaryContext.mapSummary.errors.iterator().each(function(key,error){
                errors[key] = error;
                return true;
            });
            summaryContext.reduceSummary.errors.iterator().each(function(key,error){
                errors[key] = error;
                return true;
            });

            //处理结果
            var processResult = {}
            summaryContext.output.iterator().each(function(key,value){
                log.audit({title:"sum:"+key,details:value})
                //value 为字符串
                processResult[key] =  value;
                return true;
            });

            return {
                errors:errors,
                processResult:processResult
            }
        }

        /**
         * 根据externalid 查找
         * @param options.type
         * @param options.externalId
         */
        function getIdByExtId(options){
            var type = options.type;
            var extId = options.externalId;

            var results = search.create({
                type:type,
                filters:["externalid","anyof",extId],
            }).run().getRange({start:0,end:1});
            if(hasResults(results)){
                return results[0].id;
            }
        }

        /**
         * 根据外部id数组检索
         */
        function getByExtIds(options){
            var type = options.type;
            var externalIds = options.externalIds;
            var data = {};
            var searchObj = search.create({
                type:type,
                filters:["externalid","anyof",externalIds],
                columns:[{name:"externalid"}]
            });
            getAllResultsByPage({
                searchObj:searchObj,
                cb:function(result){
                    var extId = result.getValue({name:"externalid"});
                    data[extId] = result.id;
                }})
            return data;
        }

        /**
         * 判断对象中是否包含键值对
         * @param jsonObj
         * @return {boolean}
         */
        function isEmpty(jsonObj){
            return !Object.keys(jsonObj).length;
        }


        /**
         * 将JSON 数据按照指定key 进行排序，返回数组
         * @param info
         * @param key
         * @param desc
         */
        function getSortedAry(info,key,desc,cb){
            desc = desc?-1 :1;
            var ary = [];
            util.each(info,function(json,origKey){
                json["_key"] = origKey;
                if (util.isFunction(cb)){
                    cb(json);
                }
                ary.push(json);
            })
            ary.sort(function(v1,v2){
                if(v1[key] < v2[key]){
                    return -1*desc;
                }else{
                    return 1*desc;
                }
            });

            return ary;
        }


        /**
         * 导出csv
         * @param options
         */
        function exportCSV(options){
            var response = options.response;
            response.setHeader({name:"Content-Disposition",value:"attachment;filename="+options.title+".csv"})

            var headers = options.headers;
            var lines = options.lines;

            var headerStr = headers.map(function(val){
                return '"'+getCSVColVal(val)+'"';
            }).join(",");
            response.writeLine(headerStr);

            lines.forEach(function(line){
                var lineStr = line.map(function(val){
                    return '"'+getCSVColVal(val)+'"';
                }).join(",");
                response.writeLine(lineStr);
            });
        }

        /**
         * 导出csv v2
         * @param options
         */
        function exportCSVV2(options){
            var response = options.response;

            response.setHeader({name:"Content-Disposition",value:"attachment;filename="+options.title+".csv"})
            var headers = options.headers;
            var lines = options.lines;

            var headerStr = headers.map(function(val){
                return '"'+getCSVColVal(val.name)+'"';
            }).join(",");
            response.writeLine(headerStr);

            lines.forEach(function(line){
                var lineStr = headers.map(function(header){
                    return '"'+getCSVColVal(line[header.id])+'"';
                }).join(",");
                response.writeLine(lineStr);
            });
        }


        function getCSVColVal(val){
            return val&& (val+"").replace(/"/g,'""') || "";
        }

        /**
         * 发送邮件
         * @param options.title
         * @param options.details
         * @param options.sender
         * @param options.receivers
         * @param options.attachments
         */
        function sendEmail(options) {
            var title = options.title;
            var details = options.details;
            var sender = options.sender || Constants.EMAIL_SENDER;
            var timestamp = new Date().getTime();
            var receivers = options.receivers || Constants.EMAIL_RECEIVERS;
            if(!receivers || !receivers.length){
                return;
            }
            var attachments = options.attachments;
            try{
                email.send({
                    author:sender,
                    recipients:receivers,
                    subject:title+"("+timestamp+")",
                    body:util.isObject(details)?JSON.stringify(details):details,
                    attachments:attachments
                });
            }catch(e){
                log.error({title:"邮件发送失败："+title,details:details});
            }
        }


        /**
         * 向下拉列表字段添加options
         * @param options.fld
         * @param options.data {<id>:<text>}
         * @param options.noEmptyOption 不添加空白选项
         */
        function addSelectOptions(options){
            var fld = options.fld;
            var data = options.data;
            var noEmptyOption = options.noEmptyOption;
            var selected = options.selected;
            if(!noEmptyOption){
                fld.addSelectOption({value: "", text: ""});
            }

            if(util.isArray(data)){
                //data 是数组，e.g [10,20,30]
                util.each(data, function (text) {
                    fld.addSelectOption({value: text, text: text,isSelected:(selected == text)});
                });
            }else if(util.isObject(data)){
                //data 是object，e.g {1:"YY",2:"XX"}
                util.each(data, function (text, id) {
                    fld.addSelectOption({value: id, text: text,isSelected:(selected == id)});
                });
            }else if(util.isNumber(data)){
                //data 是数值
                for(var i = 1;i<=data;i++){
                    fld.addSelectOption({value: i, text: i,isSelected:(selected == i)});
                }
            }
        }

        /**
         * 绘制每页条数下拉列表
         * @param options
         */
        function addPageSizeFld(options){
            var totalCount = options.totalCount||0;
            var pageSizeData = [10,20,50,100];
            var form = options.form;
            var pageSize = options.pageSize||10;
            var fld = form.addField({id:"custpage_pagesize",label:"每页条数 (总数："+totalCount+")",type:"select"});
            addSelectOptions({fld:fld,data:pageSizeData,selected:pageSize,noEmptyOption:true});
        }

        /**
         * 绘制分页下拉列表
         * @param options
         */
        function addPagesFld(options){
            var curPage = options.curPage;
            var totalPages = options.totalPages;
            var form = options.form;
            var fld = form.addField({id:"custpage_pages",label:"页码",type:"select"});
            addSelectOptions({fld:fld,data:totalPages,selected:curPage,noEmptyOption:true});
        }


        /**
         * 计算差异
         * <item>:{q:10}
         * @param json1
         * @param json2
         */
        function calcJSONQtyDiff(json1,json2,qtyFld1,qtyFld2){
            qtyFld1 = qtyFld1||"q";
            qtyFld2 = qtyFld2||"q";
            util.each(json1,function(qtyJson,itemId){
                var qtyJson2 = json2[itemId]||{};
                qtyJson[qtyFld1] -= qtyJson2[qtyFld2]||0;
                if(qtyJson[qtyFld1] <=0){
                    delete json1[itemId];
                }
            })
        }

        /**
         * 计算差异（将原始数据扣除差异）
         * <item>：10
         * @param json1
         * @param json2
         */
        function calcJSONDiff(json1,json2){
            util.each(json1,function(qty,itemId){
                json1[itemId] -= (json2&&json2[itemId]||0);
                if(json1[itemId]<=0){
                    delete json1[itemId];
                }
            })
        }


        /**
         * 计算差异（将差异单据进行记录）
         * @param json1
         * @param json2
         */
        function calcJSONDiffCopy(json1,json2){
            var diffInfo = {};
            util.each(json1,function(qtyJson,itemId){
                var q = qtyJson - (json2&&json2[itemId]||0);
                if(q){
                    diffInfo[itemId] = q;
                }
            })
            return diffInfo;
        }


        /**
         * 统计总和
         * {a:{q:10}}  => 10
         */
        function calcQtyTotal(data,qtyFld){
            var total = 0;
            qtyFld = qtyFld||"q";
            util.each(data,function(curJson){
                total += Number(curJson[qtyFld]||0);
            })
            return total;
        }

        /**
         * 统计总和
         * {a:10}  => 10
         */
        function calcTotal(data){
            if(!data){
                return 0;
            }
            var total = 0;
            util.each(data,function(q){
                total += Number(q);
            })
            return total;
        }

        /**
         * 获取当用户
         * @return {number}
         */
        function getCurUserId(){
            return runtime.getCurrentUser().id;
        }

        /**
         * 占用资源并执行callback，执行后释放资源
         * @param key
         * @param callback
         */
        function hold(key,callback){
            var id = null;
            try{
                id = record.create({
                    type:"customrecord_swc_resource"
                }).setValue({fieldId:"externalid",value:key}).save();
                callback();
            }catch(e){
                log.error({title:"资源锁定与业务执行失败",details:"key:"+key});
                throw e;
            }finally{
                if(id){
                    try{
                        record.delete({type:"customrecord_swc_resource",id:id})
                    }catch(ex){
                        log.error({title:"资源释放失败",details:"key:"+key+",id:"+id});
                        sendEmail({title:"资源释放失败",details:"key:"+key+",id:"+id})
                    }
                }
            }
        }

        /**
         * 根据key的长度，拆解大JSON
         */
        function splitBigJson(info,keysCount){
            var ary =[];
            var keys = Object.keys(info);
            if(keys.length - keysCount <= 0){
                ary.push(info);
                return ary;
            }

            var count = 0;
            var curInfo = {};
            ary.push(curInfo);
            util.each(info,function(val,key){
                if(count == keysCount){
                    //如果超出了上线，则清零
                    count =  0;
                    curInfo = {};
                    ary.push(curInfo);
                }
                curInfo[key] = val;
                count++;
            })
            return ary;
        }

        function getDate(timeZone,date) {
            date = date ||new Date();
            var utcTime = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
            var tzTime = utcTime + timeZone * 60 * 60 * 1000;
            return new Date(tzTime);
        }

        // formatDate(now, "yyyy-MM-dd hh:mm:ss");
        function formatDate2(date, format) {
            var year = date.getFullYear();
            var month = to2Digits(Number(date.getMonth()) + 1);
            var day = to2Digits(date.getDate());
            var hours = to2Digits(date.getHours());
            var mins = to2Digits(date.getMinutes());
            var seconds = to2Digits(date.getSeconds());

            var str = format && format.replace("yyyy", year).replace("MM", month).replace("dd", day).replace("hh", hours).replace("mm", mins).replace("ss", seconds);
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

        function getCurYearMonth(date){
            date = date || new Date();
            var year = date.getFullYear();
            var month = to2Digits(Number(date.getMonth())+1);
            return year +month;
        }

        /**
         * YYYYMM -> date
         */
        function getDateFromYearMonth(yearMonth){
            var year = yearMonth.substring(0,4);
            var month = yearMonth.substring(4,6);
            // return new Date(year,Number(month)-1,1);
            var curDate = new Date();
            var monthEndDate = new Date(year,month,0);
            return getDate(8,curDate > monthEndDate ? monthEndDate : curDate);
        }

        /**
         * 累加两个对象中相同key的q
         * {a:{q:1}} ,{a:{q:2}}  => {a:{q:3}}
         * @param x
         * @param y
         * @param qKeyForY 来源q对应的key，例如y = {$q:10},将$q合并到x的q中
         */
        function mergeQ(x,y,qKeyForY){
            util.each(y,function(val,key){
                x[key] = x[key]||{q:0};
                // x[key].q = sRound(x[key].q + Number(val.q));
                x[key].q = sRound(x[key].q + Number((val[qKeyForY||"q"])||0));
            })
            return x;
        }

        /**
         * 累加两个对象中相同key
         * {a:1},{a:2} => {a:3}
         * @param x
         * @param y
         */
        function merge(x,y){
            util.each(y,function(val,key){
                x[key] = sRound((x[key]||0) + Number(val));
            })
            return x;
        }

        /**
         * 获取lookupfield 返回的结果值
         * @param result lookupfield 返回的json
         * @param fldId
         * @param type
         */
        function getLookupFieldValue(result,fldId,type,isText) {
            if(type == "select"){
                return result[fldId] && result[fldId][0] && (isText ? result[fldId][0].text:result[fldId][0].value);
            }
            if(type =="checkbox"){
                return result[fldId];
            }
            return result[fldId]||"";
        }

        /**
         * 判定字段值是否有变化
         */
        function hasFieldChanged({oldRec,newRec,fieldIds}){
            if(!hasResults(fieldIds)){
                return true;
            }

            return fieldIds.some(function(fieldId){
                var oldVal = oldRec.getValue({fieldId});
                var newVal = newRec.getValue({fieldId});
                if(oldVal != newVal){
                    // log.audit({title:fieldId,details:newVal})
                    return true;
                }
            });
        }

        /**
         * 截取数字，例如 1.2345 保留2位小数，则为1.23
         * @param num
         * @param n 保留小数位数
         * @return {number|*}
         */
        function trunc(num, n=globalThis.PRECISION??Constants.PRECISION) {
            //如果n为0 或 空，则直接转为整数
            if (n===0) {
                return Math.trunc(num)
            }

            var str = num + '';
            var index = str.indexOf(".");
            if (index < 0)
                return num;
            if (str.length - index - 1 <= n)
                return num;
            return Number(str.slice(0, index + n + 1))
        }


        function round(num,n=globalThis.PRECISION??Constants.PRECISION)
        {
            var str = num + '';
            if(str.indexOf('.') < 0)
                return num;
            if(str.length-str.indexOf('.')-1 <= n)
                return num;
            var b = Math.abs(num);
            b = b + 0.00000000000001;
            var factor = Math.pow(10,n);
            b = Math.floor((b * factor)+0.5) / factor;
            b = b * (num >= 0.0 ? 1.0 : -1.0);
            if( b == 0.0 )
                return 0.0;
            return b;
        }

        /**
         * 检查字段和值是否匹配
         */
        function checkFldsConditions({rec,fldConfig}){
            for(fieldId in fldConfig){
                var vals = fldConfig[fieldId];
                var curVal = rec.getValue({fieldId})+"";
                if(!~vals.indexOf(curVal)){
                    return false;
                }
            }
            return true;
        }

        function copyObject(obj){
            return JSON.parse(JSON.stringify(obj));
        }

        /**
         * 拆分数组，并发调用promise
         */
        function promiseAll({dataAry,maxCount,processUrl,cb}){
            var count = dataAry.length;
            var ary = [];
            for(var i =0;i<count;i+=maxCount){
                var dataPart = dataAry.slice(i,i+maxCount);
                ary.push(https.post({url:processUrl,body:JSON.stringify(dataPart)}));
            }

            Promise.all(ary).then(function(repAry){
                util.each(repAry,function(rep){
                    //通过回调处理返回结果
                    cb(rep);
                });
            })
            /*Promise.allSettled(ary).then(function(repAry){
                util.each(repAry,function(rep){
                    //通过回调处理返回结果
                    cb(rep.value);
                });
            })*/

        }

        function isOneWorld(){
            return runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
        }

        /**
         * 检查subsidiary 是否有值
         * @param subsidiary
         * @return {*}
         */
        function checkSubsidiary(subsidiary){
            return isOneWorld() && subsidiary;
        }

        // 注册到全局
        globalThis.sTrunc = trunc;
        globalThis.sRound = round;

        return {
            getAllResults: getAllResults,
            getPagedResults: getPagedResults,
            getAllResultsByPage: getAllResultsByPage,
            getAllResultsPro: getAllResultsPro,
            getAllResultIds:getAllResultIds,
            splitBigResultSet :splitBigResultSet,
            splitBigResultSetBySize :splitBigResultSetBySize,
            getAllResultsQuery:getAllResultsQuery,
            getAllResultsJson:getAllResultsJson,
            splitPages:splitPages,
            hasResults :hasResults,
            hasResultsV2:hasResultsV2,
            splitStr:splitStr,
            buildFilter:buildFilter,
            addFilter:addFilter,
            buildHref:buildHref,
            createTask:createTask,
            formatDate:formatDate,
            parseDate:parseDate,
            setBigValue:setBigValue,
            getBigValue:getBigValue,
            clearBigValues:clearBigValues,
            saveCache:saveCache,
            getCache:getCache,
            MRSync:MRSync,
            isMR:isMR,
            getDeploymentsInQueue:getDeploymentsInQueue,
            rescheduleMR:rescheduleMR,
            getScriptParam:getScriptParam,
            processSummary:processSummary,
            getIdByExtId:getIdByExtId,
            isEmpty:isEmpty,
            getByExtIds:getByExtIds,
            getSortedAry:getSortedAry,
            exportCSV:exportCSV,
            exportCSVV2:exportCSVV2,
            sendEmail:sendEmail,
            addSelectOptions:addSelectOptions,
            addPageSizeFld:addPageSizeFld,
            addPagesFld:addPagesFld,
            calcJSONQtyDiff:calcJSONQtyDiff,
            calcJSONDiff:calcJSONDiff,
            calcJSONDiffCopy:calcJSONDiffCopy,
            calcTotal:calcTotal,
            calcQtyTotal:calcQtyTotal,
            getCurUserId:getCurUserId,
            hold:hold,
            splitBigJson:splitBigJson,
            getDate:getDate,
            setJSONFieldValue:setJSONFieldValue,
            getJSONFieldValue:getJSONFieldValue,
            buildNameFilter:buildNameFilter,
            merge:merge,
            mergeQ:mergeQ,
            getLookupFieldValue:getLookupFieldValue,
            trunc:trunc,
            round:round,
            hasFieldChanged:hasFieldChanged,
            checkFldsConditions:checkFldsConditions,
            to2Digits:to2Digits,
            getCurYearMonth:getCurYearMonth,
            getDateFromYearMonth:getDateFromYearMonth,
            createBigColumns:createBigColumns,
            getBigColumnsValue:getBigColumnsValue,
            copyObject:copyObject,
            promiseAll:promiseAll,
            isOneWorld:isOneWorld,
            checkSubsidiary:checkSubsidiary
        };

    });
