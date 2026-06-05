/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @description 提交定时任务通用脚本
 */
define([ 'N/record', 'N/search', "../common/SWC_MAP_EWDUCE_UTIL"  ],

function(record, search ,mapReduceUtil) {

	/**
	 * Definition of the Suitelet script trigger point.
	 * 
	 * @param {Object}
	 *            context
	 * @param {ServerRequest}
	 *            context.request - Encapsulation of the incoming request
	 * @param {ServerResponse}
	 *            context.response - Encapsulation of the Suitelet response
	 * @Since 2015.2
	 */
	function onRequest(context) {
		var request = context.request;
		var response = context.response;
		var method = request.method;
		if (method == 'POST') {
			var msg = {
				status : true,
				message : ''
			};

			try {
				//设置map/reduce参数
				var scriptId = request.parameters.scriptId;
				var params = {
					custscript_price_notice_params : request.parameters.data
				};
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
	}

	return {
		onRequest : onRequest
	};

});
