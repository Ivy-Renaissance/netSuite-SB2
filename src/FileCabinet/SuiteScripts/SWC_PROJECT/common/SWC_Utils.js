/**
 * @NApiVersion 2.1
 * @NModuleScope public
 */
define(['N/search', 'N/runtime', 'N/record','N/email','./decimal.js',"N/format", "N/query"],
    /**
     * @param{search} search
     */
    (search, runtime, record,email,decimal,format, query) => {
        /**
         * get search results
         * @param mySearch
         * @returns {[]}
         */
        const getAllResults = (mySearch) => {
            var resultSet = mySearch.run();
            var resultArr = [];
            var start = 0;
            var step = 1000;
            var results = resultSet.getRange({start: start, end: step});
            while (results && results.length > 0) {
                resultArr = resultArr.concat(results);
                start = Number(start) + Number(step);
                results = resultSet.getRange({start: start, end: Number(start) + Number(step)});
            }
            return resultArr;
        }

        function getBeforeDate(days) {
            var dataStrObj = getTodayDate();
            var now = new Date(Number(dataStrObj.year), (Number(dataStrObj.month) - 1), Number(dataStrObj.day));
            now.setDate(now.getDate() - (Number(days) || 0));
            return now;
        }

        function formatDate(isDate) {
            var userObj = runtime.getCurrentUser();
            var userFormat = userObj.getPreference({
                name: "DATEFORMAT"
            });
            userFormat = userFormat.replace(/YYYY/, isDate.getFullYear());
            if (userFormat.indexOf("MM") < 0 && userFormat.indexOf("M") >= 0) {
                userFormat = userFormat.replace(/M/, isDate.getMonth() + 1);
            } else {
                userFormat = userFormat.replace(/MM/, isDate.getMonth() + 1);
            }
            if (userFormat.indexOf("DD") < 0 && userFormat.indexOf("D") >= 0) {
                userFormat = userFormat.replace(/D/, isDate.getDate());
            } else {
                userFormat = userFormat.replace(/DD/, isDate.getDate());
            }
            return userFormat;
        }

        /**
         * 相当前用户发送电子邮件
         * @param strJson
         * options:{title:"",email:"",autho:""}
         * message:文本类型 邮件正文内容
         */
        function sendEmail(options,message) {
            var userObj = runtime.getCurrentUser();
            email.send({
                author: options.author || userObj.id,
                recipients: options.email || userObj.email,
                subject: options.title || "数据集合",
                body: message
            });
        }

        /**
         * 非空判断
         * @param obj 各种类型
         * @returns {boolean}
         */
        function isEmpty(obj) {
            if (obj === undefined || obj == null || obj === '') {
                return true;
            }
            if (obj.length && obj.length > 0) {
                return false;
            }
            if (obj.length === 0) {
                return true;
            }
            for ( var key in obj) {
                if (hasOwnProperty.call(obj, key)) {
                    return false;
                }
            }
            if (typeof (obj) == 'boolean') {
                return false;
            }
            if (typeof (obj) == 'number') {
                return false;
            }
            return true;
        }

        /**
         * 按页抓取全量数据
         * @param options
         * @return {{pageRanges: [], totalPages: number, totalCount: number, results: []}}
         */
        function getAllResultsByPage(options) {
            //获取全部result的时候，每次抓取的条数
            const STEP = 1000;
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
         *加法运算  add
         */
        function addSumIsNumber(number1, number2, decimalNumber) {
            // 返回2位小数
            if (decimalNumber) {
                return decimal(number1 || 0).add(number2 || 0).toFixed(decimalNumber);
            }
            return decimal(number1 || 0).add(number2 || 0).toNumber();
        }
        /**
         *减法运算  sub
         */
        function subSumIsNumber(number1, number2, decimalNumber) {
            // 返回2位小数
            if (decimalNumber) {
                return decimal(number1 || 0).sub(number2 || 0).toFixed(decimalNumber);
            }
            return decimal(number1 || 0).sub(number2 || 0).toNumber();
        }
        /**
         *乘法运算  mul
         */
        function mulSumIsNumber(number1, number2, decimalNumber) {
            // 返回2位小数
            if (decimalNumber) {
                return decimal(number1 || 0).mul(number2 || 0).toFixed(decimalNumber);
            }
            return decimal(number1 || 0).mul(number2 || 0).toNumber();
        }
        /**
         * 除法运算  div
         */
        function divSumIsNumber(number1, number2, decimalNumber) {
            // 返回2位小数
            if (decimalNumber) {
                return decimal(number1 || 0).div(number2 || 0).toFixed(decimalNumber);
            }
            return decimal(number1 || 0).div(number2 || 0).toNumber();
        }

        /**
         * 获取n月前的同一天
         */
        function getNMonthAgoToDate(monthNum){
            var today = new Date(getBeijingDate());
            var paramDate = runtime.getCurrentScript().getParameter({name: "custscript_swc_test_date"});
            if (paramDate) today = paramDate;
            today.setTime(today.getTime());
            var year = today.getFullYear(); // 获取当前日期的年份
            var month = today.getMonth() + 1; // 获取当前日期的月份
            var day = today.getDate(); // 获取当前日期的日
            var resultYear = year;
            var resultMonth = Number(month) - monthNum;
            if (resultMonth <= 0) {
                resultYear = resultYear - (Math.floor(Math.abs(resultMonth) / 12) + 1);
                resultMonth = 12 - (Math.abs(resultMonth) % 12);
            }
            var resultDay = day;
            var endDateOfResultMonth = new Date(resultYear, resultMonth, 0);
            var daysInResultMonth = endDateOfResultMonth.getDate();
            if (resultDay > daysInResultMonth) {
                resultDay = daysInResultMonth;
            }
            if (resultMonth < 10) {
                resultMonth = '0' + resultMonth;
            }
            return resultYear + '/' + resultMonth + '/' + resultDay;
        }

        function isNotNone(str){
            if (str == "- None -"){
                str = "";
            }
            return str;
        }

        function getBeijingDate(){
            let BeijingDateTimeStr = format.format({
                value : new Date(),
                type : format.Type.DATETIME,
                timezone : format.Timezone.ASIA_HONG_KONG
            });
            let parsedDate= format.parse({
                value: BeijingDateTimeStr,
                type: format.Type.DATE
            });
            var dd = parsedDate.getDate() < 10 ? "0" + parsedDate.getDate(): parsedDate.getDate();
            var mm = (parsedDate.getMonth() + 1) < 10 ? "0" + (parsedDate.getMonth() + 1): parsedDate.getMonth() + 1;
            var yyyy = parsedDate.getFullYear();
            let BeijingDateStr = yyyy + "/" + mm + "/" + dd;
            return BeijingDateStr;
        }

        /**
         * 例 将.06转换为0.06
         * @param str
         * @returns {string|*}
         */
        function formatNumberToStr(str){
            return str.startsWith('.') ? '0' + str : str;
        }

        /**
         * 根据 decimals 将数字类型 转换为字符串 并补0
         * @param num
         * @param decimals 小数后位数
         * @returns {string}
         */
        function formatAmountNumber(num, decimals) {
            // 将输入转换为字符串
            const str = num.toString();

            // 分离整数和小数部分
            const parts = str.split('.');
            let integerPart = parts[0];
            let decimalPart = parts[1] || '';

            // 处理小数部分
            if (decimals > 0) {
                // 如果小数部分长度不足，补零
                while (decimalPart.length < decimals) {
                    decimalPart += '0';
                }

                return integerPart + '.' + decimalPart;
            } else {
                // 如果没有小数部分，直接返回整数
                return integerPart;
            }
        }

        /**
         * 四舍五入
         * @param num
         * @param len
         * @returns {number}
         */
        function fixed(num, len) {
            return Math.round(num * Math.pow(10, len)) / Math.pow(10, len);
        }

        /**
         * 获取sql语句检索数据
         * @param sql
         * @returns {*[]}
         */
        function getAllSqlResults(sql){
            let countSql = `select count(1) as count from (${sql})`;// 查询总数sql语句
            var count = query.runSuiteQL({query: countSql}).asMappedResults();// 总数结果数组
            let countNum = count[0].count;// 总数
            let resultsDate = [];// 结果数组
            if (countNum <= 5000) {// 若总数小于等于5000
                resultsDate = query.runSuiteQL({query: sql}).asMappedResults();// 结果数组
            } else {// 若总数大于5000
                let num = Math.ceil(countNum / 5000);// 所需检索次数
                for (let i = 0; i < num; i++) {// 循环检索数据
                    let curLi = i * 5000;// 起始上限
                    let curOff = 5000 + i * 5000;// 结束下限
                    let sqlAround = `select * from (select *, ROWNUM AS rowno from (${sql}) where rownum <= ${curOff}) where rowno > ${curLi}`;// 限定范围检索sql语句
                    var resultIterator = query.runSuiteQL({query: sqlAround}).asMappedResults();// 结果数组
                    resultsDate = resultsDate.concat(resultIterator);// 数组拼接
                }
            }
            return resultsDate;// 返回结果数组
        }

        /**
         *  获取当前时间格式并返回
         */
        function getTodayDate() {
            var DateUtilRecord = record.create({
                type: "customrecord_swc_dateutil",
                isDynamic: true
            });
            var year = DateUtilRecord.getValue({fieldId: "custrecord_swc_current_year"});
            var month = DateUtilRecord.getValue({fieldId: "custrecord_swc_current_month"});
            var day = DateUtilRecord.getValue({fieldId: "custrecord_swc_current_day"});
            var hhmi = DateUtilRecord.getValue({fieldId: "custrecord_swc_currentdatetime"});
            var hh = hhmi.substring(0,2);
            var mi = hhmi.substring(2);
            return {year: year, month: month, day: day, hh: hh, mi: mi};
        }

        return{
            getAllResults,
            getBeforeDate,
            formatDate,
            sendEmail,
            isEmpty,
            getAllResultsByPage,
            addSumIsNumber,
            subSumIsNumber,
            mulSumIsNumber,
            divSumIsNumber,
            getNMonthAgoToDate,
            isNotNone,
            getBeijingDate,
            fixed,
            formatAmountNumber,
            getAllSqlResults,
            getTodayDate
        }
    });