/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 */
define([], () => {
    /**
     * @param {Object} context
     * @param {Portlet} context.portlet
     */
    const render = (context) => {
        const portlet = context.portlet;
        portlet.title = 'Sales Order Portlet';
        portlet.addLine({
            text: 'This is a custom Sales Order Portlet plugin.',
            url: 'https://www.netsuite.com'
        });
    };

    // ✅ 必须返回一个包含入口函数的对象
    return { render };
});
