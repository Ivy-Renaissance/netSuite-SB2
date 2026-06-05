/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/runtime'], (search, runtime) => {
    
    /**
     * 渲染 Portlet 的主函数
     * @param {Portlet} portlet - 系统传入的 Portlet 对象
     */
    const render = (portlet) => {
        // 设置组件标题
        portlet.title = '销售订单统计（管理员专用）';

        try {
            const user = runtime.getCurrentUser();

            // 判断是否为管理员（可选逻辑）
            if (user.role !== 3) { // role 3 = Administrator
                portlet.html = `<div style="padding:10px;color:#888;">
                    当前角色无权限查看销售统计。
                </div>`;
                return;
            }

            // 搜索过去30天的销售订单总额
            const salesSearch = search.create({
                type: 'salesorder',
                filters: [
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['trandate', 'within', 'last30days']
                ],
                columns: [
                    search.createColumn({ name: 'total', summary: search.Summary.SUM }),
                    search.createColumn({ name: 'entity', summary: search.Summary.COUNT })
                ]
            });

            const result = salesSearch.run().getRange({ start: 0, end: 1 })[0];

            const totalAmount = result?.getValue({ name: 'total', summary: search.Summary.SUM }) || 0;
            const orderCount = result?.getValue({ name: 'entity', summary: search.Summary.COUNT }) || 0;

            // 渲染 HTML 内容
            portlet.html = `
                <div style="padding:15px;font-family:Arial;">
                    <h3 style="color:#0070d2;margin-bottom:10px;">过去30天销售订单统计</h3>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:6px;border-bottom:1px solid #ddd;">订单总数：</td>
                            <td style="padding:6px;border-bottom:1px solid #ddd;"><b>${orderCount}</b></td>
                        </tr>
                        <tr>
                            <td style="padding:6px;">销售总额：</td>
                            <td style="padding:6px;"><b>$${Number(totalAmount).toFixed(2)}</b></td>
                        </tr>
                    </table>
                </div>
            `;
        } catch (e) {
            portlet.html = `<div style="color:red;padding:10px;">加载出错：${e.message}</div>`;
        }
    };

    return { render };
});
