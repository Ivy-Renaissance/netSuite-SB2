/**
 * @NApiVersion 2.x
 * @NModuleScope public
 */

define([ "N/task", "N/search", "N/record", 'N/url' ],

function(task, search, record, url) {
	// 提交请求
	function submitMapReduce(scriptId, params) {
		// 创建task并执行
		var taskId;
		do {
			try {
				var taskId = task.create({
					taskType : task.TaskType.MAP_REDUCE,
					scriptId : scriptId,
					params : params
				}).submit();
			} catch (e) {
				// 报错 脚本XXX没有可用空闲脚本部署
				if (e.name == "NO_DEPLOYMENTS_AVAILABLE") {
					// 创建脚本应用
					var id = createNewDeployment(scriptId);
					if (!id && isNaN(id)) {
						return null;
					}
				} else {
					throw e;
				}

			}
		} while (!taskId);
		return taskId;
	}

	function createNewDeployment(scriptId) {
		var filters = [];
		filters.push(search.createFilter({
			name : 'scriptid',
			join : "Script",
			operator : search.Operator.IS,
			values : scriptId
		}));
		var columns = [];
		columns.push(search.createColumn({
			name : 'internalid'
		}));
		columns.push(search.createColumn({
			name : 'scriptid'
		}));
		var mySearch = search.create({
			type : record.Type.SCRIPT_DEPLOYMENT,
			columns : columns,
			filters : filters
		});

		var id;
		var deployId;
		mySearch.run().each(function(result) {
			id = result.getValue({
				name : 'internalid'
			});
			deployId = result.getValue({
				name : 'scriptid'
			});
			return false;
		});

		if (id && deployId) {
			var newDeployId = deployId.substr(12, 15) + String((new Date()).getTime());
			var rec = record.copy({
				type : record.Type.SCRIPT_DEPLOYMENT,
				id : id
			});
			rec.setValue({
				fieldId : 'scriptid',
				value : newDeployId.trim().toLowerCase(),
				ignoreFieldChange : true
			});
			return rec.save();
		}

	}

	return {
		submitMapReduce : submitMapReduce
	};

});