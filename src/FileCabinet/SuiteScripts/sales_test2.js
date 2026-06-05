/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 * @NModuleScope SameAccount
 */

define(['N/search', 'N/record', 'N/url', 'N/format'], 
function(search, record, url, format) {
   
    function render(params) {
        var portlet = params.portlet;
        portlet.title = "客户订单概览";
        
        // 构建完整的HTML内容
        var htmlContent = buildHTML();
        portlet.html = htmlContent;
    }
    
    function buildHTML() {
        var ordersData = loadOrderData();
        var statisticsData = getOrderStatistics();
        
        var html = `
            <style>
                .portlet-container {
                    font-family: Arial, sans-serif;
                    padding: 10px;
                }
                .order-item {
                    border-bottom: 1px solid #eee;
                    padding: 8px 0;
                }
                .order-number {
                    font-weight: bold;
                    color: #1e88e5;
                }
                .order-status {
                    padding: 2px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                    display: inline-block;
                    margin-top: 5px;
                }
                .status-pending { background: #fff3cd; color: #856404; }
                .status-approved { background: #d1ecf1; color: #0c5460; }
                .status-fulfilled { background: #d4edda; color: #155724; }
                .refresh-btn {
                    background: #007cbb;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 3px;
                    cursor: pointer;
                    margin-bottom: 10px;
                }
                .no-data {
                    color: #666;
                    font-style: italic;
                }
            </style>
            
            <div class="portlet-container">
                <button class="refresh-btn" onclick="refreshPortlet()">刷新数据</button>
                <div id="orders-content">
                    ${ordersData}
                </div>
                <div id="statistics-content">
                    ${statisticsData}
                </div>
            </div>
            
            <script>
                function refreshPortlet() {
                    // NetSuite portlet刷新方法
                    if (typeof nlapiRefreshPortlet === 'function') {
                        nlapiRefreshPortlet();
                    } else if (typeof window.parent.nlapiRefreshPortlet === 'function') {
                        window.parent.nlapiRefreshPortlet();
                    } else {
                        location.reload();
                    }
                }
                
                // 添加点击事件处理
                document.addEventListener('DOMContentLoaded', function() {
                    var refreshBtn = document.querySelector('.refresh-btn');
                    if (refreshBtn) {
                        refreshBtn.onclick = refreshPortlet;
                    }
                });
            </script>
        `;
        
        return html;
    }
    
    function loadOrderData() {
        try {
            var orderSearch = search.create({
                type: search.Type.SALES_ORDER,
                columns: [
                    'internalid',
                    'tranid',
                    'entity',
                    'total',
                    'status',
                    'trandate'
                ],
                filters: [
                    ['mainline', 'is', 'T']
                ],
                sort: [
                    ['trandate', 'desc']
                ]
            });
            
            var results = orderSearch.run().getRange(0, 5);
            
            if (results.length === 0) {
                return '<p class="no-data">暂无订单数据</p>';
            }
            
            var ordersHtml = '<h4>最近订单</h4>';
            
            results.forEach(function(result) {
                var orderId = result.getValue('internalid');
                var orderNumber = result.getValue('tranid');
                var customer = result.getValue('entity');
                var total = result.getValue('total');
                var status = result.getText('status');
                var date = result.getValue('trandate');
                
                var statusClass = getStatusClass(status);
                var formattedTotal = format.parse({
                    value: total || 0,
                    type: format.Type.CURRENCY
                });
                var formattedDate = format.parse({
                    value: date,
                    type: format.Type.DATE
                });
                
                ordersHtml += `
                    <div class="order-item">
                        <div class="order-number">
                            <a href="/app/accounting/transactions/salesord.nl?id=${orderId}" target="_blank">
                                ${orderNumber || 'N/A'}
                            </a>
                        </div>
                        <div>客户: ${customer || 'N/A'}</div>
                        <div>金额: ${formattedTotal}</div>
                        <div>日期: ${formattedDate}</div>
                        <span class="order-status ${statusClass}">${status || 'N/A'}</span>
                    </div>
                `;
            });
            
            return ordersHtml;
            
        } catch (e) {
            return '<p class="no-data">加载订单数据时出错: ' + e.message + '</p>';
        }
    }
    
    function getOrderStatistics() {
        try {
            var pendingSearch = search.create({
                type: search.Type.SALES_ORDER,
                columns: [
                    search.createColumn({
                        name: 'total',
                        summary: 'SUM'
                    })
                ],
                filters: [
                    ['status', 'anyof', 'SalesOrd:B'],
                    ['mainline', 'is', 'T']
                ]
            });
            
            var pendingResult = pendingSearch.run().getRange(0, 1);
            var pendingTotal = pendingResult.length > 0 ? pendingResult[0].getValue('total') : 0;
            
            var formattedTotal = format.parse({
                value: pendingTotal,
                type: format.Type.CURRENCY
            });
            
            return `
                <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                    <h4>订单统计</h4>
                    <div>待处理订单总额: ${formattedTotal}</div>
                </div>
            `;
        } catch (e) {
            return '<p class="no-data">统计信息加载失败</p>';
        }
    }
    
    function getStatusClass(status) {
        if (!status) return '';
        
        switch(status.toLowerCase()) {
            case 'pending approval':
            case 'pending fulfillment':
                return 'status-pending';
            case 'approved':
            case 'partially fulfilled':
                return 'status-approved';
            case 'fully fulfilled':
            case 'closed':
                return 'status-fulfilled';
            default:
                return '';
        }
    }
    
    return {
        render: render
    };
});