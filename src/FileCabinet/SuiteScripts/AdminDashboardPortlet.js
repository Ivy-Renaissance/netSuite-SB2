// /**
//  * @NApiVersion 2.1
//  * @NScriptType Portlet
//  * @NModuleScope SameAccount
//  */
// define(['N/search', 'N/format', 'N/runtime'], (search, format, runtime) => {

//     /**
//      * 渲染首页 Portlet
//      * @param {Portlet} portlet
//      */
//     const render = (portlet) => {
//         try {
//             const user = runtime.getCurrentUser();
//             portlet.title = `管理员首页概览（${user.name}）`;

//             // =========================
//             // 一、统计今日订单数量与总额
//             // =========================
//             const today = new Date();
//             const formattedToday = format.format({ value: today, type: format.Type.DATE });

//             const salesOrderSearch = search.create({
//                 type: 'salesorder',
//                 filters: [
//                     ['mainline', 'is', 'T'],
//                     'and',
//                     ['datecreated', 'onorafter', formattedToday]
//                 ],
//                 columns: [
//                     search.createColumn({ name: 'tranid' }),
//                     search.createColumn({ name: 'total' })
//                 ]
//             });

//             let orderCount = 0;
//             let totalAmount = 0;

//             salesOrderSearch.run().each((result) => {
//                 orderCount++;
//                 totalAmount += parseFloat(result.getValue('total')) || 0;
//                 return true;
//             });

//             // =========================
//             // 二、统计近7天每日订单数量
//             // =========================
//             const dailyCounts = {};
//             for (let i = 6; i >= 0; i--) {
//                 const d = new Date();
//                 d.setDate(d.getDate() - i);
//                 const dateStr = format.format({ value: d, type: format.Type.DATE });
//                 dailyCounts[dateStr] = 0;
//             }

//             const weekSearch = search.create({
//                 type: 'salesorder',
//                 filters: [
//                     ['mainline', 'is', 'T'],
//                     'and',
//                     ['datecreated', 'onorafter', format.format({
//                         value: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
//                         type: format.Type.DATE
//                     })]
//                 ],
//                 columns: [
//                     search.createColumn({ name: 'datecreated' })
//                 ]
//             });

//             weekSearch.run().each((result) => {
//                 const createdDate = result.getValue('datecreated');
//                 const day = createdDate.split(' ')[0]; // yyyy-mm-dd
//                 if (dailyCounts[day] !== undefined) dailyCounts[day]++;
//                 return true;
//             });

//             // =========================
//             // 三、构建 Portlet HTML 内容
//             // =========================
//             let html = `
//                 <div style="font-family:Arial;padding:10px;">
//                     <h2 style="color:#3b7dd8;margin-bottom:5px;">📊 销售订单统计</h2>
//                     <p><b>今日订单数：</b>${orderCount}</p>
//                     <p><b>今日销售总额：</b>¥${totalAmount.toFixed(2)}</p>
//                     <hr>
//                     <h3 style="margin-top:10px;">近7天订单趋势：</h3>
//                     <ul style="line-height:1.6;">
//             `;

//             for (const [day, count] of Object.entries(dailyCounts)) {
//                 html += `<li>${day}：${count} 单</li>`;
//             }

//             html += `
//                     </ul>
//                     <hr>
//                     <p style="font-size:12px;color:#888;">数据来源：Sales Order Search</p>
//                 </div>
//             `;

//             portlet.html = html;

//         } catch (e) {
//             portlet.html = `<p style="color:red;">脚本执行出错：${e.message}</p>`;
//         }
//     };

//     return { render };
// });



/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 */
define([], () => {
    /**
     * 渲染 Portlet 主函数
     * @param {Portlet} portlet
     */
    const render = (portlet) => {
        try {
            portlet.title = '测试 Portlet';
            portlet.html = `
                <div style="padding:10px;font-family:Arial;">
                    <h2 style="color:#3b7dd8;">✅ Portlet 运行成功！</h2>
                    <p>如果你能看到这段文字，说明 SuiteScript 部署和类型都没问题。</p>
                </div>
            `;
        } catch (e) {
            portlet.html = `<p style="color:red;">❌ 执行出错：${e.message}</p>`;
        }
    };

    return { render };
});
