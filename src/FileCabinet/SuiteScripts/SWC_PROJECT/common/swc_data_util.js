/**
 * 提供数据处理的公用方法
 * 
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define([ 'N/record', 'N/search' ],

function(record, search) {

	/**
	 * 验证期间是否关闭
	 */
	function validatePeriod(period) {
		var isClosed;
		var flag = false;
		var searchObj = search.create({
			type : 'accountingperiod',
			filters : [ {
				name : 'internalId',
				operator : 'is',
				values : [ period ]
			} ],
			columns : [ {
				name : 'closed'
			} ]
		});
		searchObj.run().each(function(result) {
			flag = true;
			isClosed = result.getValue({
				name : 'closed'
			});
		});
		if (!flag) {
			throw '期间未找到';
		}
		return isClosed;
	}

	/**
	 * 到指定列表中获取值
	 */
	function getValueFromList(listId) {
		var arys = [];
		var searchObj = search.create({
			type : listId,
			columns : [ {
				name : 'internalId'
			}, {
				name : 'name'
			} ]
		});
		searchObj.run().each(function(result) {
			var internalId = result.getValue({
				name : 'internalId'
			});
			var name = result.getValue({
				name : 'name'
			});
			arys.push({
				id : internalId,
				name : name
			});
			return true;
		});
		return arys;
	}

	return {
		validatePeriod : validatePeriod,
		getValueFromList:getValueFromList
	};

});
