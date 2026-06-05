define([], function () {

	/**
	 * Module Description
	 * 
	 * Version    Date            Author           Remarks
	 * 1.00       26 Oct 2018     zyt
	 *
	 */
	/**
	 * 返回值
	 * 
	 * @param status
	 * @param info
	 * @returns json
	 */
	function custMsg(status, data) {
		this.status = status;
		this.data = data;
	}

	/**
	 * 打开遮罩
	 * 
	 * @param message
	 * @returns
	 */

	function startMask(message,type) {
		if(!type){
			type = "afterbegin"
		}
		var cutomerModel = document.getElementById('cutomerModel');
		// if (cutomerModel == null) {
			var htmlText = "<div id ='cutomerModel' style=\"position: absolute;top: 0;left: 0;display: block;background-color: rgba(9, 9, 9, 0.6);width: 100%;height: 100%;z-index: 1000;text-align:center\"/>\n" +
				"<img src=\"https://system.na2.netsuite.com/core/media/media.nl?id=3583&c=4890821&h=8dca27f2eedc57f9d2a1\" style=\"margin-top:20%;width:40px;\" /></br>\n" +
				"<b style=\"margin-top:2%;color:#fff\">" +
				message +
				"</b>\n" +
				"</div>";
			insertHTML(document.body, type, htmlText);
			console.log("insertHTML")
		// } else {
			document.getElementById('cutomerModel').style.display = 'block';
		// }
		pageH = Math.max(document.body.scrollHeight,
			document.documentElement.scrollHeight);
		pageH = pageH > 0 ? pageH : 600;
		console.log(message)
		document.getElementById('cutomerModel').style.height = pageH + "px";
		return true;
	}

	/**
	 * 插入html
	 * @param el
	 * @param where
	 * @param html
	 * @returns
	 */
	function insertHTML(el, where, html) {
		if (!el) {
			return false;
		}

		where = where.toLowerCase();

		if (el.insertAdjacentHTML) { // IE
			console.log("el.insertAdjacentHTML")
			el.insertAdjacentHTML(where, html);
		} else {
			var range = el.ownerDocument.createRange(),
				frag = null;

			switch (where) {
				case "beforebegin":
					range.setStartBefore(el);
					console.log(html)
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
	 * 去掉遮罩
	 */
	function endMask() {
		try {
			document.getElementById('cutomerModel').style.display = 'none';
		} catch (e) {

		}
	}

	/**
	 * 检查数组中是否包含某元素
	 * @param arr
	 * @param obj
	 * @returns true/false
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
	 * 序列化url
	 * 
	 * @param obj
	 * @returns
	 */
	function serializeURL(obj) {
		var str = [];
		for (var p in obj)
			if (obj.hasOwnProperty(p)) {
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
			}
		return str.join("&");
	}

	/**
	 * 给数字前面补0 
	 * @param num
	 * @param ws
	 *            濠电偠鎻徊鐣岀矓閻㈢ǹ姹查柨鐕傛嫹
	 * @returns
	 */
	function addPreZero(num, ws) {
		var t = (num + '').length,
			s = '';

		for (var i = 0; i < ws - t; i++) {
			s += '0';
		}

		return s + num;
	}


	/**
	 * 使用Handlebars渲染值到html
	 * @param html
	 * @param page_object
	 * @returns
	 */
	function renderPage(html, page_object) {
		var template = Handlebars.compile(html);
		return template(page_object);
	}

	/**
	 * a位空则返回b值
	 * @param a
	 * @param b
	 * @returns
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
	 * 客户化异常
	 * @returns
	 */
	function cuxException(message, code) {
		this.message = message;
		this.code = code;
	}

	/**
	 * 截取数组
	 * @param ary
	 * @param len
	 * @returns {Array}
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
	 * 替换特殊字符
	 * @param str
	 * @returns
	 */
	function escape2Html(str) {
		var arrEntities = {
			'lt': '<',
			'gt': '>',
			'nbsp': ' ',
			'amp': '&',
			'quot': '"'
		};
		return str.replace(/&(lt|gt|nbsp|amp|quot);/ig, function (all, t) {
			return arrEntities[t];
		});
	}

	return {
		custMsg: custMsg,
		startMask: startMask,
		insertHTML: insertHTML,
		endMask: endMask,
		contains: contains,
		serializeURL: serializeURL,
		addPreZero: addPreZero,
		renderPage: renderPage,
		nvl: nvl,
		cuxException: cuxException,
		spiltAry: spiltAry,
		escape2Html: escape2Html
	}
});