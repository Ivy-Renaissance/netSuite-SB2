/**
 * 提供基础公用方法
 * 
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(
		[ 'N/search', 'N/format', 'N/runtime', 'N/record', './swc_data_util' ],

		function(search, format, runtime, record, dataUtil) {

			/**
			 * 关闭黑色等待罩
			 * 
			 * @returns
			 * @author tao.mei
			 */
			function endMask() {
				try {
					document.getElementById('cutomerModel').style.display = 'none';
				} catch (e) {

				}
			}

			/**
			 * 显示黑色等待罩
			 * 
			 * @param message
			 *            遮罩中显示的消息
			 * @returns
			 * @author tao.mei
			 */

			function startMask(message) {
				var cutomerModel = document.getElementById('cutomerModel');
				// if (cutomerModel == null) {
					var htmlText = "<div id ='cutomerModel' style=\"position: absolute;top: 0;left: 0;display: block;background-color: rgba(255, 255, 255, 0.4);width: 100%;height: 100%;z-index: 1000;text-align:center\"/>\n"
							+ "<img src=\"https://system.na2.netsuite.com/core/media/media.nl?id=3583&c=4890821&h=8dca27f2eedc57f9d2a1\" style=\"margin-top:20%;width:40px;\" /></br>\n"
							+ "<b style=\"margin-top:2%;color:#4682B4\">" + message + "</b>\n" + "</div>";
					insertHTML(document.body, 'beforeend', htmlText);
				// } else {
					document.getElementById('cutomerModel').style.display = 'block';
				// }
				// 计算窗体高度应用于遮罩
				pageH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
				pageH = pageH > 0 ? pageH : 600;
				document.getElementById('cutomerModel').style.height = pageH + "px";
			}

			/**
			 * 遮罩层工具类，往DOM中插入元素
			 * 
			 * @param el
			 * @param where
			 * @param html
			 * @returns
			 * @author tao.mei
			 */
			function insertHTML(el, where, html) {
				if (!el) {
					return false;
				}

				where = where.toLowerCase();

				if (el.insertAdjacentHTML) {// IE
					el.insertAdjacentHTML(where, html);
				} else {
					var range = el.ownerDocument.createRange(), frag = null;

					switch (where) {
					case "beforebegin":
						range.setStartBefore(el);
						frag = range.createContextualFragment(html);
						el.parentNode.insertBefore(frag, el);
						return el.previousSibling;
					case "afterbegin":
						if (el.firstChild) {
							range.setStartBefore(el.firstChild);
							frag = range.createContextualFragment(html);
							el.insertBefore(frag, el.firstChild);
						} else {
							el.innerHTML = html;
						}
						return el.firstChild;
					case "beforeend":
						if (el.lastChild) {
							range.setStartAfter(el.lastChild);
							frag = range.createContextualFragment(html);
							el.appendChild(frag);
						} else {
							el.innerHTML = html;
						}
						return el.lastChild;
					case "afterend":
						range.setStartAfter(el);
						frag = range.createContextualFragment(html);
						el.parentNode.insertBefore(frag, el.nextSibling);
						return el.nextSibling;
					}
				}
			}

			/**
			 * 判断数组中是否包含该元素
			 * 
			 * @param arr
			 *            数组
			 * @param obj
			 *            字符串
			 * @returns true/false
			 * @author guangyuan.tan
			 */
			function contains(arr, obj) {
				var i = arr.length;
				while (i--) {
					if (arr[i] === obj) {
						return true;
					}
				}
				return false;
			}

			/**
			 * 序列化url参数
			 * 
			 * @param obj
			 * @returns 序列化后的url
			 * @author guangyuan.tan
			 */
			function serializeURL(obj) {
				var str = [];
				for ( var p in obj)
					if (obj.hasOwnProperty(p)) {
						str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
					}
				return str.join("&");
			}

			/**
			 * 字符串前面用0补齐到指定位数
			 * 
			 * @param num
			 *            值
			 * @param ws
			 *            位数
			 * @returns 前面用0补齐后的值
			 * @author guangyuan.tan
			 */
			function addPreZero(num, ws) {
				var t = (num + '').length, s = '';

				for (var i = 0; i < ws - t; i++) {
					s += '0';
				}

				return s + num;
			}

			/**
			 * 获取下一个序列编号
			 * 
			 * @param docType
			 *            单据类型
			 * @param docPrefix
			 *            前缀
			 * @param seqLength
			 *            长度
			 * @param pk1
			 *            主键1
			 * @param pk2
			 *            主键2
			 * @param pk3
			 *            主键3
			 * @param pk4
			 *            主键4
			 * @param pk5
			 *            主键5
			 * @param initNumber
			 *            初始值
			 * @returns string 下一个序列编号
			 */
			function nextSeqNumber(docType, docPrefix, seqLength, pk1, pk2, pk3, pk4, pk5, initNumber) {
				var seq;
				var nextSeqNumber;
				var flag = false;

				var whereCondition = [];

				var myFilter = search.createFilter({
					name : 'custrecord_doc_type',
					operator : search.Operator.IS,
					values : [ docType ]
				});
				whereCondition.push(myFilter);

				// pk1
				if (pk1 != '' && pk1 != null) {
					myFilter = search.createFilter({
						name : 'custrecord_pk1_value',
						operator : search.Operator.IS,
						values : [ pk1 ]
					});
				} else {
					myFilter = search.createFilter({
						name : 'custrecord_pk1_value',
						operator : search.Operator.ISEMPTY
					});
				}
				whereCondition.push(myFilter);
				// pk2
				if (pk2 != '' && pk2 != null) {
					myFilter = search.createFilter({
						name : 'custrecord_pk2_value',
						operator : search.Operator.IS,
						values : [ pk2 ]
					});
				} else {
					myFilter = search.createFilter({
						name : 'custrecord_pk2_value',
						operator : search.Operator.ISEMPTY
					});
				}
				whereCondition.push(myFilter);
				// pk3
				if (pk3 != '' && pk3 != null) {
					myFilter = search.createFilter({
						name : 'custrecord_pk3_value',
						operator : search.Operator.IS,
						values : [ pk3 ]
					});
				} else {
					myFilter = search.createFilter({
						name : 'custrecord_pk3_value',
						operator : search.Operator.ISEMPTY
					});
				}
				whereCondition.push(myFilter);
				// pk4
				if (pk4 != '' && pk4 != null) {
					myFilter = search.createFilter({
						name : 'custrecord_pk4_value',
						operator : search.Operator.IS,
						values : [ pk4 ]
					});
				} else {
					myFilter = search.createFilter({
						name : 'custrecord_pk4_value',
						operator : search.Operator.ISEMPTY
					});
				}
				whereCondition.push(myFilter);
				// pk5
				if (pk5 != '' && pk5 != null) {
					myFilter = search.createFilter({
						name : 'custrecord_pk5_value',
						operator : search.Operator.IS,
						values : [ pk5 ]
					});
				} else {
					myFilter = search.createFilter({
						name : 'custrecord_pk5_value',
						operator : search.Operator.ISEMPTY
					});
				}
				whereCondition.push(myFilter);

				var searchObj = search.create({
					type : 'customrecord_doc_sequences',
					filters : whereCondition,
					columns : [ 'internalId', 'custrecord_next_number' ]
				});
				searchObj.run().each(function(result) {
					// 已存在，更新值
					var internalId = result.getValue({
						name : 'internalId'
					});
					var nextNumber = result.getValue({
						name : 'custrecord_next_number'
					});
					nextNumber = parseInt(nextNumber) + 1;
					record.submitFields({
						type : 'customrecord_doc_sequences',
						id : internalId,
						values : {
							'custrecord_next_number' : nextNumber
						},
						options: {ignoreMandatoryFields : true}
					});
					nextSeqNumber = nextNumber;
					flag = true;
				});

				if (!flag) {
					// 不存在，插入值
					nextSeqNumber = initNumber == '' ? 1 : initNumber;
					var rec = record.create({
						type : 'customrecord_doc_sequences'
					});
					rec.setValue({
						fieldId : 'custrecord_doc_type',
						value : docType
					});
					rec.setValue({
						fieldId : 'custrecord_pk1_value',
						value : pk1
					});
					rec.setValue({
						fieldId : 'custrecord_pk2_value',
						value : pk2
					});
					rec.setValue({
						fieldId : 'custrecord_pk3_value',
						value : pk3
					});
					rec.setValue({
						fieldId : 'custrecord_pk4_value',
						value : pk4
					});
					rec.setValue({
						fieldId : 'custrecord_pk5_value',
						value : pk5
					});
					rec.setValue({
						fieldId : 'custrecord_next_number',
						value : nextSeqNumber
					});
					rec.save({ignoreMandatoryFields: true});

				}

				if (seqLength == null || seqLength == 0) {
					seq = docPrefix + nextSeqNumber;
				} else {
					if (('' + nextSeqNumber).length >= seqLength) {
						seq = docPrefix + nextSeqNumber;
					} else {
						seq = docPrefix + addPreZero(nextSeqNumber, seqLength);
					}
				}

				return seq;

			}

			/**
			 * 数组去掉重复对象
			 * 
			 * @param ary
			 *            数组
			 * @returns 去重后的数组
			 * @author guangyuan.tan
			 */
			function removeDuplicate(ary) {
				var res = [];
				var json = {};
				for (var i = 0; i < ary.length; i++) {
					if (!json[ary[i]]) {
						res.push(ary[i]);
						json[ary[i]] = 1;
					}
				}
				return res;
			}

			/**
			 * 获取配置文件（记录类型：配置文件）的值
			 * 
			 * @param name
			 * @returns value
			 * @author guangyuan.tan
			 */
			function getConfigValue(name) {
				var value = '未配置值';
				try {
					var searchObj = search.create({
						type : 'customrecord_config',
						filters : [ {
							name : 'name',
							operator : 'is',
							values : [ name ]
						} ],
						columns : [ {
							name : 'custrecord_config_value'
						} ]
					});
					searchObj.run().each(function(result) {
						value = result.getValue({
							name : 'custrecord_config_value'
						});
					});

				} catch (e) {
					value = '未配置值';
				}
				return value;
			}

			/**
			 * 处理null值，如果a为空，则返回b，否则返回a
			 * 
			 * @param a
			 * @param b
			 * @returns
			 * @author guangyuan.tan
			 */
			function nvl(a, b) {
				var rtn;
				if (a == null || a == 'null') {
					rtn = b;
				} else {
					rtn = a;
				}
				return rtn;
			}

			/**
			 * 拆分数组到多个数组
			 * 
			 * @param ary
			 *            待拆分数组
			 * @param len
			 *            小数组包含多少个元素
			 * @returns {Array}
			 * @author guangyuan.tan
			 */
			function spiltAry(ary, len) {
				var aryLen = ary.length;
				var result = [];
				for (var i = 0; i < aryLen; i += len) {
					result.push(ary.slice(i, i + len));
				}
				return result;
			}

			/**
			 * 转意符换成普通字符
			 * 
			 * @param str
			 * @returns
			 * @author guangyuan.tan
			 */
			function escape2Html(str) {
				var arrEntities = {
					'lt' : '<',
					'gt' : '>',
					'nbsp' : ' ',
					'amp' : '&',
					'quot' : '"'
				};
				return str.replace(/&(lt|gt|nbsp|amp|quot);/ig, function(all, t) {
					return arrEntities[t];
				});
			}

			/**
			 * 初始化基于自定义列表的列表字段
			 */
			function initList(field, listId) {
				field.addSelectOption({
					value : '',
					text : ''
				});
				var arys = dataUtil.getValueFromList(listId);
				for (var i = 0; i < arys.length; i++) {
					field.addSelectOption({
						value : arys[i].id,
						text : arys[i].name
					});
				}
			}
			/**
			 * Post方式调用AJAX --by tao.mei@20171122
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

			/**
			 * 查询当前环境是否是One World环境
			 */
			function isOneWorldAccount() {
				var flag = false;
				try {
					var mySearch = search.create({
						type : "subsidiary"
					});
					mySearch.run().each(function(result) {
						flag = true;
						return false;
					});
				} catch (e) {
					flag = false;
				}
				return flag;
			}

			return {
				startMask : startMask,
				endMask : endMask,
				contains : contains,
				serializeURL : serializeURL,
				addPreZero : addPreZero,
				removeDuplicate : removeDuplicate,
				getConfigValue : getConfigValue,
				nvl : nvl,
				spiltAry : spiltAry,
				escape2Html : escape2Html,
				nextSeqNumber : nextSeqNumber,
				initList : initList,
				postAjax : postAjax,
				isOneWorldAccount : isOneWorldAccount
			};

		});
