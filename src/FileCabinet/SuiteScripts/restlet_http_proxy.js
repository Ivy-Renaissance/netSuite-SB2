/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/http', 'N/log'],
    /**
 * @param{http} http
 * @param{log} log
 */
    (http, log) => { /**
    /**
     * GET 转发逻辑
     * 调用方式示例：
     */
    const get = (context) => {
        try {
            const targetUrl = context.url;
            if (!targetUrl) {
                return { success: false, message: '缺少参数：url' };
            }
            // 拼接 query 参数
            const queryParams = [];
            for (let key in context) {
                if (key !== 'url') {
                    queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(context[key])}`);
                }
            }
            const finalUrl = queryParams.length ? `${targetUrl}?${queryParams.join('&')}` : targetUrl;
            log.debug('转发 GET 请求', finalUrl);
            // 使用 N/http 发 HTTP 请求（允许 http://）
            const response = http.get({
                url: finalUrl,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return {
                success: true,
                code: response.code,
                data: response.body
            };
        } catch (e) {
            log.error('HTTP GET 转发失败', e);
            return { success: false, error: e.message };
        }
    };

    return { get };
});