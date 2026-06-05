/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope public
 */
define(
	['N/search', 'N/url', 'N/currentRecord', '../common/swc_common_util',
		"../common/swc_client_util", '../common/jquery-3.2.1.min',
		'N/format', 'N/ui/dialog', 'N/runtime'],

	function (search, url, currentRec1, commonUtil, clientUtil, jquery,
		format, dialog, runtime) {

		/**
		 * Function to be executed when field is changed.
		 * 
		 * @param {Object}
		 *            scriptContext
		 * @param {Record}
		 *            scriptContext.currentRecord - Current form record
		 * @param {string}
		 *            scriptContext.sublistId - Sublist name
		 * @param {string}
		 *            scriptContext.fieldId - Field name
		 * @param {number}
		 *            scriptContext.lineNum - Line number. Will be undefined
		 *            if not a sublist or matrix field
		 * @param {number}
		 *            scriptContext.columnNum - Line number. Will be
		 *            undefined if not a matrix field
		 * 
		 * @since 2015.2
		 */
		var lines = [];// 行
		var targetUrl;
		var sublistId = 'custpage_demand_sublist';
		var gFlag = true;

		function pageInit(scriptContext) {
			// 方法添加到window对象
			var currentRec = scriptContext.currentRecord;
			targetUrl = url.resolveScript({
				scriptId: 'customscript_swc_sl_demand_plan_submit',
				deploymentId: 'customdeploy_swc_sl_demand_plan_submit'
			});
			console.info('pageInit:' + pageInit);
			clientUtil.showProcess();
		}
		/**
		 * Function to be executed when field is changed.
		 * 
		 * @param {Object}
		 *            scriptContext
		 * @param {Record}
		 *            scriptContext.currentRecord - Current form record
		 * @param {string}
		 *            scriptContext.sublistId - Sublist name
		 * @param {string}
		 *            scriptContext.fieldId - Field name
		 * @param {number}
		 *            scriptContext.lineNum - Line number. Will be undefined
		 *            if not a sublist or matrix field
		 * @param {number}
		 *            scriptContext.columnNum - Line number. Will be
		 *            undefined if not a matrix field
		 * 
		 * @since 2015.2
		 */
		function fieldChanged(scriptContext) {
		}
		/**
		 * Function to be executed when field is slaved.
		 * 
		 * @param {Object}
		 *            scriptContext
		 * @param {Record}
		 *            scriptContext.currentRecord - Current form record
		 * @param {string}
		 *            scriptContext.sublistId - Sublist name
		 * @param {string}
		 *            scriptContext.fieldId - Field name
		 * 
		 * @since 2015.2
		 */
		function postSourcing(scriptContext) {
			console.info('postSourcing scriptContext'
				+ scriptContext.fieldId);
		}
		/**
		 * Function to be executed after sublist is inserted, removed, or
		 * edited.
		 * 
		 * @param {Object}
		 *            scriptContext
		 * @param {Record}
		 *            scriptContext.currentRecord - Current form record
		 * @param {string}
		 *            scriptContext.sublistId - Sublist name
		 * 
		 * @since 2015.2
		 */
		function sublistChanged(scriptContext) {

		}
		/**
		 * Validation function to be executed when field is changed.
		 * 
		 * @param {Object}
		 *            scriptContext
		 * @param {Record}
		 *            scriptContext.currentRecord - Current form record
		 * @param {string}
		 *            scriptContext.sublistId - Sublist name
		 * @param {string}
		 *            scriptContext.fieldId - Field name
		 * @param {number}
		 *            scriptContext.lineNum - Line number. Will be undefined
		 *            if not a sublist or matrix field
		 * @param {number}
		 *            scriptContext.columnNum - Line number. Will be
		 *            undefined if not a matrix field
		 * 
		 * @returns {boolean} Return true if field is valid
		 * 
		 * @since 2015.2
		 */
		function validateField(scriptContext) {
			console.info('validateField.fieldId1:' + scriptContext.fieldId);

			return true;
		}

		/**
		 * Function to be executed after line is selected.
		 * 
		 * @param {Object}
		 *            scriptContext
		 * @param {Record}
		 *            scriptContext.currentRecord - Current form record
		 * @param {string}
		 *            scriptContext.sublistId - Sublist name
		 * 
		 * @since 2015.2
		 */
		function lineInit(scriptContext) {

		}

		/**
		 * Validation function to be executed when sublist line is
		 * committed.
		 * 
		 * @param {Object}
		 *            scriptContext
		 * @param {Record}
		 *            scriptContext.currentRecord - Current form record
		 * @param {string}
		 *            scriptContext.sublistId - Sublist name
		 * 
		 * @returns {boolean} Return true if sublist line is valid
		 * 
		 * @since 2015.2
		 */
		function validateLine(scriptContext) {
			console.info('validateLine mark all:' + 'checkbox');
			// log.debug('validateLine mark all', 'checkbox');
			return true;
		}
		/**
		 * Validation function to be executed when sublist line is inserted.
		 * 
		 * @param {Object}
		 *            scriptContext
		 * @param {Record}
		 *            scriptContext.currentRecord - Current form record
		 * @param {string}
		 *            scriptContext.sublistId - Sublist name
		 * 
		 * @returns {boolean} Return true if sublist line is valid
		 * 
		 * @since 2015.2
		 */
		function validateInsert(scriptContext) {
			return true;
		}

		/**
		 * Validation function to be executed when record is deleted.
		 * 
		 * @param {Object}
		 *            scriptContext
		 * @param {Record}
		 *            scriptContext.currentRecord - Current form record
		 * @param {string}
		 *            scriptContext.sublistId - Sublist name
		 * 
		 * @returns {boolean} Return true if sublist line is valid
		 * 
		 * @since 2015.2
		 */
		function validateDelete(scriptContext) {
			return true;
		}

		/**
		 * Validation function to be executed when record is saved.
		 * 
		 * @param {Object}
		 *            scriptContext
		 * @param {Record}
		 *            scriptContext.currentRecord - Current form record
		 * @returns {boolean} Return true if record is valid
		 * 
		 * @since 2015.2
		 */
		function saveRecord(scriptContext) {
			return true;
		}
		/**
		 * 查询
		 * 
		 * @returns
		 */
		function doSearch() {
			var currentRec = currentRec1.get();
			var pageSize = currentRec.getValue({
				fieldId: 'custpage_page_size'
			});

			var params = {
				action: 'search',
				nowPage: 1,
				pageSize: 800
			};

			// 筛选条件
			params = getFilters(currentRec, params, false);

			// 拼接参数
			window.onbeforeunload = null;
			window.location = targetUrl + '&'
				+ commonUtil.serializeURL(params);
		}
		/**
		 * 获取界面筛选条件
		 */
		function getFilters(currentRec, params, paged) {
			// 筛选条件后缀
			var fields = ['platform', 'sku', 'internalid', 'ejlm', 'location_type', 'country', 'recommendation', 'status', 'owner', 'planer', 'approver', 'batch', 'begin', 'end', 'reviewed','calculated'];

			for (var i in fields) {
				var currentField = currentRec.getValue('custpage_'
					+ fields[i]);
				if (currentField) {
					// 日期特殊处理
					if (fields[i] == 'begin' || fields[i] == 'end') {
						currentField = format.format({
							value: currentField,
							type: format.Type.DATE
						});
					}
					if (fields[i] == 'reviewed') {
						currentField = 'T'
					}
					if (fields[i] == 'calculated') {
						currentField = 'T'
					}
					params[fields[i]] = currentField;
				}
			}
			return params;
		}
		// https://7373203.app.netsuite.com/app/site/hosting/scriptlet.nl?script=153&deploy=1&compid=7373203&
		// action=price&
		// taskId=MAPREDUCETASK_0268697b146d120006150669027e735e5e67060c181368_a67dfe216185c9c6d3c6cf59e5f90296d3c06945&s
		// ynctimestamp=1647344232473
		/**
		 * 批量计算修正2
		 * 
		 * @returns
		 */
		function calculateCorrection() {
			var currentRec = currentRec1.get();
			log.debug('currentRec', JSON.stringify(currentRec))
			var rec_params = {
				action: 'calculateCorrection',
				nowPage: 1,
				pageSize: 1000
			};
			rec_params = getFilters(currentRec, rec_params, false);
			// Ext.MessageBox.wait('正在提交数据...');
			// commonUtil.startMask('正在提交数据...');
			var timestamp = new Date().getTime();
			console.info('timestamp:' + timestamp);
			var params = []; // 界面参数
			currentRec.getField({
				fieldId: 'custpage_btn_calculate'
			}).isDisabled = true;
			var count = currentRec.getLineCount(sublistId);
			for (var i = 0; i < count; i++) {
				var line = {};
				currentRec.selectLine({
					sublistId: sublistId,
					line: i
				});
				console.log('item', currentRec.getCurrentSublistValue(sublistId, 'custpage_line_sku'));
				if (currentRec.getCurrentSublistValue(sublistId, 'custpage_checkbox')) {

					line.timestamp = timestamp.toString();
					line.action = '1';//
					line.Id = currentRec.getCurrentSublistValue(sublistId, 'custpage_internalid');// 货品内部id
					params.push(line);

				}
			}
			log.debug('params', params);
			// console.log(params);
			if (params.length == 0) {
				// Ext.MessageBox.hide();
				// commonUtil.endMask();
				dialog.alert({
					title: '提示',
					message: '请至少选择一条数据！'
				});
				currentRec.getField({
					fieldId: 'custpage_btn_calculate'
				}).isDisabled = false;
				return;
			}
			commonUtil.startMask('正在提交数据...');

			// ajax执行map/reduce
			var executeUrl = url.resolveScript({
				// scriptId : 'customscript_swc_sl_submit_task',
				// deploymentId : 'customdeploy_swc_sl_submit_task'
				scriptId: 'customscript_swc_task_util_sl',
				deploymentId: 'customdeploy_swc_task_util_sl'
			});

			$.ajax({
				type: "POST",
				url: executeUrl,
				async: false,
				data: {
					data: JSON.stringify(params),
					paramsId: 'custscript_swc_mp_dp_deal_params',
					scriptId: 'customscript_swc_mp_demand_plan_deal'
				},
				success: function (result) {
					try {
						var rtn = JSON.parse(result);
						if (rtn.status) {
							// Ext.MessageBox.hide();
							// commonUtil.endMask();
							var taskId = rtn.message;
							// 执行成功，拼接参数刷新界面
							window.onbeforeunload = null;
							window.location = targetUrl
								+ '&action=calculateCorrection&taskId=' + taskId
								+ '&'
								+ commonUtil.serializeURL(rec_params)
								+ '&synctimestamp=' + timestamp;
						} else {
							commonUtil.endMask();
							alert('错误：' + JSON.stringify(rtn));
						}
					} catch (e) {
						alert('错误：' + result);
					}
				}
			});

		}
		/**
		 * 批量提交复核
		 * 
		 * @returns
		 */
		function submitReview() {
			var currentRec = currentRec1.get();
			log.debug('currentRec', JSON.stringify(currentRec))
			var rec_params = {
				action: 'calculateCorrection',
				nowPage: 1,
				pageSize: 1000
			};
			rec_params = getFilters(currentRec, rec_params, false);
			// Ext.MessageBox.wait('正在提交数据...');
			// commonUtil.startMask('正在提交数据...');
			var timestamp = new Date().getTime();
			console.info('timestamp:' + timestamp);
			var params = []; // 界面参数
			currentRec.getField({
				fieldId: 'custpage_btn_submit'
			}).isDisabled = true;
			var count = currentRec.getLineCount(sublistId);
			for (var i = 0; i < count; i++) {
				var line = {};
				currentRec.selectLine({
					sublistId: sublistId,
					line: i
				});
				var _review = currentRec.getCurrentSublistValue(sublistId, 'custpage_line_review')
				var _quantity = currentRec.getCurrentSublistValue(sublistId, 'custpage_line_quantity_')
				// console.log('_quantity', _quantity);
				// console.log('item', currentRec.getCurrentSublistValue(sublistId, 'custpage_line_sku'));
				// log.debug('_quantity'+i,_quantity)
				// log.debug('sku'+i,currentRec.getCurrentSublistValue(sublistId, 'custpage_line_sku'))
				if (currentRec.getCurrentSublistValue(sublistId, 'custpage_checkbox') && !_review && _quantity > 0) {

					// line.timestamp = timestamp.toString();
					line.action = '2';//
					line.Id = currentRec.getCurrentSublistValue(sublistId, 'custpage_internalid');// 货品内部id
					params.push(line);

				}
			}
			log.audit('params.length', params.length);
			// console.log('params.length',params.length);
			if (params.length == 0) {
				// Ext.MessageBox.hide();
				// commonUtil.endMask();
				dialog.alert({
					title: '提示',
					message: '请至少选择一条数据可提交数据！'
				});
				currentRec.getField({
					fieldId: 'custpage_btn_submit'
				}).isDisabled = false;
				return;
			}
			commonUtil.startMask('正在提交数据...');

			// ajax执行map/reduce
			var executeUrl = url.resolveScript({
				// scriptId : 'customscript_swc_sl_submit_task',
				// deploymentId : 'customdeploy_swc_sl_submit_task'
				scriptId: 'customscript_swc_task_util_sl',
				deploymentId: 'customdeploy_swc_task_util_sl'
			});

			$.ajax({
				type: "POST",
				url: executeUrl,
				async: false,
				data: {
					data: JSON.stringify(params),
					paramsId: 'custscript_swc_mp_dp_deal_params',
					scriptId: 'customscript_swc_mp_demand_plan_deal'
				},
				success: function (result) {
					try {
						var rtn = JSON.parse(result);
						if (rtn.status) {
							// Ext.MessageBox.hide();
							// commonUtil.endMask();
							var taskId = rtn.message;
							// 执行成功，拼接参数刷新界面
							window.onbeforeunload = null;
							window.location = targetUrl
								+ '&action=submitReview&taskId=' + taskId
								+ '&'
								+ commonUtil.serializeURL(rec_params)
								+ '&synctimestamp=' + timestamp;
						} else {
							commonUtil.endMask();
							alert('错误：' + JSON.stringify(rtn));
						}
					} catch (e) {
						alert('错误：' + result);
					}
				}
			});

		}
		return {
			pageInit: pageInit,
			fieldChanged: fieldChanged,
			postSourcing: postSourcing,
			validateField: validateField,
			sublistChanged: sublistChanged,
			lineInit: lineInit,
			validateLine: validateLine,
			validateInsert: validateInsert,
			validateDelete: validateDelete,
			saveRecord: saveRecord,
			doSearch: doSearch,
			calculateCorrection: calculateCorrection,
			submitReview: submitReview
		};

	});
