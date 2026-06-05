/**
 * @NApiVersion 2.1
 * @NModuleScope public
 */

define([ "N/search", "N/record", 'N/url', './swc_common_util', './SWC_CONFIG_DATA' ],

function(search, record, url, commonUtil,SWC_CONFIG_DATA) {

	/**
	 * Client Script Use Only 显示Map/reduce脚本的运行状态
	 */
	function showProcess() {
		var eTaskId = document.getElementById("custpage_rtp_task_id");
		if (eTaskId) {
			// commonUtil.endMask();
			// commonUtil.startMask("请求正在执行中,请稍后...");
			window.taskId = eTaskId.value;
			window.reportProgress = document.getElementById("reportProgress");
			window.reportUrl = url.resolveScript({
				scriptId : "customscript_swc_task_util_sl",
				deploymentId : "customdeploy_swc_task_util_sl"
			});
			window.index = 0;
		}

		if (window.taskId && window.reportProgress && window.reportUrl) {
			window.reportUrl = window.reportUrl + "&action=getPercentageCompleted&taskId=" + window.taskId;
			window.processTimer = window.setInterval(function() {
				var req = getAjax(window.reportUrl).responseText;
				var taskStatus = JSON.parse(req);
				var status = taskStatus.status;
				var stage = taskStatus.stage;
				var percent = taskStatus.percent;
				var html = "";
				var endFlag = false;
				if (status == "PROCESSING") {
					// commonUtil.endMask();
					// commonUtil.startMask("请求正在执行中,请稍后...当前节点" + stage + ",进度  " + percent + "%");
					html = "请求正在执行中,请稍后...当前节点" + stage + ",进度  " + percent + "%";
				} else if (status == "COMPLETE") {
					//html = "请求执行完成";
					// commonUtil.endMask();
					html = "请求执行完成！点击查看 " + '<a href="' + getResultUrl()
							+ '" style="color:red;font-weight:normal;" target="view_window">执行结果</a>';

					endFlag = true;
				} else if (status == "FAILED") {
					// commonUtil.endMask();
					html = "请求执行失败，请联系管理员";
					endFlag = true;
				} else {
					// commonUtil.startMask("等待请求执行...");
					html = "等待请求执行...";
				}
				window.reportProgress.innerHTML = html;
				if (endFlag) {
					clearInterval(window.processTimer);
				} else {
					window.index++;
				}
			}, 1000);

		}
	}

	/**
	 * 获得运行结果页面URL
	 * 
	 */
	function getResultUrl() {
		// var timestamp = window.location.href.substr(-13, 13); //时间戳13位
		// var resultUrl = url.resolveScript({
		// 	scriptId : 'customscript_oiin_result_sl',
		// 	deploymentId : 'customdeploy_oiin_result_sl'
		// });

		// resultUrl = resultUrl + '&synctimestamp=' + timestamp;
		//TODO:生产环境ID
		var account_id = SWC_CONFIG_DATA.configData().ACCOUNT_ID;
		// var resultUrl = 'https://'+SWC_CONFIG_DATA.configData().ACCOUNT_ID+'.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype='+SWC_CONFIG_DATA.configData().DP_REC_ID;
		var resultUrl = `https://${SWC_CONFIG_DATA.configData().ACCOUNT_ID}.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=${SWC_CONFIG_DATA.configData().DP_REC_ID}`;
		return resultUrl;
	}
	/**
	 * 获得已排程运行脚本状态页URL
	 * 
	 * @param customdeployId
	 * @returns
	 */
	function getScheduledScriptStatusPage(customdeployId) {
		try {
			var filters = [];
			filters[0] = search.createFilter({
				name : 'scriptid',
				operator : search.Operator.IS,
				values : customdeployId
			});

			var columns = [];
			columns.push(search.createColumn({
				name : 'internalid'
			}));

			var scriptSearch = search.create({
				type : search.Type.SCRIPT_DEPLOYMENT,
				columns : columns,
				filters : filters
			});

			var pageUrl = "";
			scriptSearch.run().each(function(result) {
				var id = result.getValue({
					name : 'internalid'
				});
				var rec = record.load({
					type : record.Type.SCRIPT_DEPLOYMENT,
					id : id
				});
				pageUrl = rec.getValue({
					fieldId : 'instancestatuspage'
				});
				return false;
			});
			var scheme = 'https://';
			var host = url.resolveDomain({
				hostType : url.HostType.APPLICATION
			});
			pageUrl = pageUrl.replace("http://", "").replace("https://", "");
			return pageUrl;

		} catch (e) {
			return null;
		}
	}

	/**
	 * GET方式调用AJAX
	 * 
	 * @param url
	 * @returns
	 */
	function getAjax(url) {
		if (window.XMLHttpRequest) {
			var oAjax = new XMLHttpRequest();
		} else {
			var oAjax = new ActiveXObject("Microsoft.XMLHTTP");// IE6浏览器创建ajax对象
		}
		oAjax.open("GET", url, false);// 把要读取的参数的传过来
		oAjax.send(null);
		var rt = new Object();
		rt['status'] = oAjax.status;
		rt['responseText'] = oAjax.responseText;
		return rt;

	}

	/**
	 * Post方式调用AJAX
	 * 
	 * @param url
	 * @param params
	 *            格式 name=jack&age=18
	 * @returns
	 */
	function postAjax(url, params) {
		if (window.XMLHttpRequest) {
			var oAjax = new XMLHttpRequest();
		} else {
			var oAjax = new ActiveXObject("Microsoft.XMLHTTP");// IE6浏览器创建ajax对象
		}
		oAjax.open("POST", url, false);// 把要读取的参数的传过来
		oAjax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		oAjax.send(params);
		var rt = new Object();
		rt['status'] = oAjax.status;
		rt['responseText'] = oAjax.responseText;
		return rt;

	}
	return {
		showProcess : showProcess,
		getScheduledScriptStatusPage : getScheduledScriptStatusPage,
		getAjax : getAjax,
		postAjax : postAjax
	};

});