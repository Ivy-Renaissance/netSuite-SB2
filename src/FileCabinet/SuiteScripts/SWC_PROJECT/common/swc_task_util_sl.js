/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope public
 */

define(
	["N/task", "N/search", "N/record", "./SWC_MAP_EWDUCE_UTIL"],

	function (task, search, record, mapReduceUtil) {

		/**
		 * Definition of the Suitelet script trigger point.
		 * 
		 * @param {Object}
		 *            context
		 * @param {ServerRequest}
		 *            context.request - Encapsulation of the incoming
		 *            request
		 * @param {ServerResponse}
		 *            context.response - Encapsulation of the Suitelet
		 *            response
		 * @Since 2015.2
		 */
		function onRequest(context) {
			var request = context.request;
			var response = context.response;
			if (request.method == "GET") {
				if (request.parameters.action == "getPercentageCompleted") {
					getPercentageCompleted(request, response);
				}
			} else if (request.method == "POST") {
				submitRequest(request, response);
			}

		}

		function submitRequest(request, response) {
			// var rt = new Object();
			// try {
			// 	var parameters = request.parameters;
			// 	var params = parameters.params;
			// 	var scriptId = parameters.scriptId;
			// 	var deploymentId = parameters.deploymentId;
			// 	var taskId = task.create({
			// 		taskType : task.TaskType.MAP_REDUCE,
			// 		scriptId : scriptId,
			// 		deploymentId : deploymentId,
			// 		params : JSON.parse(params)
			// 	}).submit();
			// 	rt["taskId"] = taskId;
			// } catch (e) {
			// 	rt["errMsg"] = e.message;
			// }
			// response.write(JSON.stringify(rt));
			var msg = {
				status: true,
				message: ''
			};

			try {
				//设置map/reduce参数
				var scriptId = request.parameters.scriptId;
				var paramsId = request.parameters.paramsId;
				var params = {};
				params[paramsId]= request.parameters.data
				log.debug('data', request.parameters.data);
				//执行map/reduce
				var taskId = mapReduceUtil.submitMapReduce(scriptId, params);
				if (taskId) {
					msg.message = taskId;
					response.write(JSON.stringify(msg));
				}
			} catch (e) {
				msg.status = false;
				msg.message = e.message;
				response.write(JSON.stringify(msg));
			}
		}

		/**
		 * 
		 */
		function getPercentageCompleted(request, response) {
			var taskId = request.parameters.taskId;
			var taskStatus = task.checkStatus(taskId);
			var status = taskStatus.status;
			var stage = taskStatus.stage;
			var percent = taskStatus.getPercentageCompleted();
			var rt = new Object();
			rt["status"] = status;
			rt["stage"] = stage;
			rt["percent"] = percent;
			response.write(JSON.stringify(rt));
		}
		return {
			onRequest: onRequest
		};

	});
