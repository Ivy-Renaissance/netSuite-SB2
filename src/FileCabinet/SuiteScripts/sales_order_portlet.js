/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 */
define(['N/runtime', 'N/search', 'N/log'], (runtime, search, log) => {

    /**
     * 渲染 Portlet 主函数
     * @param {Portlet} portlet
     */
    const render = (portlet) => {
        portlet.title = '销售订单统计（管理员专用）';

        try {
            const user = runtime.getCurrentUser();
            
            // 调试信息 - 查看当前用户角色
            log.debug('用户角色ID', user.role.id);
            log.debug('用户角色名称', user.role.name);
            log.debug('用户ID', user.id);

            // 更灵活的角色检查方式
            const userRoleId = parseInt(user.role.id);
            const isAdmin = userRoleId === 3; // 管理员角色ID为3
            
            log.debug('是否是管理员', isAdmin);

            // 非管理员提示信息
            if (!isAdmin) {
                portlet.html = `
                    <div style="font-family:Arial, sans-serif; padding:15px; text-align:center;">
                        <h3 style="color:#d00; margin:0 0 10px 0;">出现用户错误</h3>
                        <p style="color:#333; margin:0;">您没有浏览此页面的特权</p>
                        <p style="color:#666; font-size:12px; margin-top:10px;">
                            当前角色: ${user.role.name} (ID: ${userRoleId})
                        </p>
                    </div>
                `;
                return;
            }

            // 管理员权限下的内容渲染
            const salesOrderSearch = search.create({
                type: search.Type.SALES_ORDER,
                filters: [],
                columns: ['internalid']
            });

            const totalCount = salesOrderSearch.runPaged().count;

            const recentSearch = search.create({
                type: search.Type.SALES_ORDER,
                filters: [
                    ['datecreated', 'within', 'lastweek']
                ],
                columns: ['internalid']
            });

            const recentCount = recentSearch.runPaged().count;

            portlet.html = `
                <div style="font-family:Arial, sans-serif; padding:10px;">
                    <h3 style="color:#333;">销售订单统计</h3>
                    <p style="font-size:16px;">总订单数：<strong>${totalCount}</strong></p>
                    <p style="font-size:16px;">最近7天新增：<strong style="color:#0070d2;">${recentCount}</strong></p>
                    <p style="font-size:12px; color:#666;">仅管理员可见</p>
                </div>
            `;

        } catch (error) {
            // 使用 NetSuite 的日志模块输出错误
            log.error('Portlet 渲染错误', error);

            portlet.html = `
                <div style="font-family:Arial, sans-serif; padding:15px; text-align:center;">
                    <h3 style="color:#d00; margin:0 0 10px 0;">系统错误</h3>
                    <p style="color:#333; margin:0;">${error.toString()}</p>
                    <p style="color:#666; font-size:12px; margin-top:10px;">
                        请检查系统日志获取详细信息
                    </p>
                </div>
            `;
        }
    };

    return { render };
});
