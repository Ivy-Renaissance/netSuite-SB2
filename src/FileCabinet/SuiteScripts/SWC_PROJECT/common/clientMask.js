/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-11-20 11:27:57
 * @LastEditTime   : 2020-11-20 11:30:35
 * @LastEditors    : Li
 * @Description    : 客户端展示遮罩
 * @FilePath       : d:\Li.Tools\Tools\clientMask.js
 * @  DPS Oracle Netsuite
 */


/**
 *
 */
define([], function () {

    /**
     * 打开遮罩
     * @param message
     * @param type
     * @returns {boolean}
     */
    function startMask(message, type) {
        if (!type) {
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
        // console.log("insertHTML")
        // } else {
        document.getElementById('cutomerModel').style.display = 'block';
        // }
        var pageH = Math.max(document.body.scrollHeight,
            document.documentElement.scrollHeight);
        pageH = pageH > 0 ? pageH : 600;
        // console.log(message)
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
            // console.log("el.insertAdjacentHTML")
            el.insertAdjacentHTML(where, html);
        } else {
            var range = el.ownerDocument.createRange(),
                frag = null;
            switch (where) {
                case "beforebegin":
                    range.setStartBefore(el);
                    // console.log(html)
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
            console.log('去掉遮罩异常', e)
        }
    }


    return {
        startMask: startMask,
        insertHTML: insertHTML,
        endMask: endMask
    }
});

new Date().toISOString()
