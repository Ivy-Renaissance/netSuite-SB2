/**
 * @NApiVersion 2.x
 * @NModuleScope public
 */
define(["N/runtime"],

    function (runtime) {

        var langObj = {
            "查询": {EN: "Query", CN: '查询'},
            "提交": {EN: "Submit", CN: '提交'},
            "筛选器": {EN: "Filter", CN: '筛选器'},
            "子公司": {EN: "Subsidiary", CN: '子公司'},
            "客户": {EN: "Customer No.", CN: '客户'},
            "账期": {EN: "Payment Terms", CN: '账期'},
            "货币": {EN: "Currency", CN: '货币'},
            "截至日期": {EN: "Date", CN: '截至日期'},
            "每页条数": {EN: "Items per page", CN: '每页条数'},
            "账龄金额": {EN: "Items per page", CN: '账龄金额'},
            "未到期金额": {EN: "Aging amount", CN: '未到期金额'},
            "全部勾选": {EN: "One click check", CN: '全部勾选'},
            "全部取消": {EN: "One click cancellation", CN: '全部取消'},
            "上一页": {EN: "Previous Page", CN: '上一页'},
            "下一页": {EN: "Next page", CN: '下一页'},
            "勾选框": {EN: "Check", CN: '勾选框'},
            "序号": {EN: "No.", CN: '序号'},
            "记账日期": {EN: "Date", CN: '记账日期'},
            "类型": {EN: "Doc.Type", CN: '类型'},
            "订单号": {EN: "Doc. No.", CN: '订单号'},
            "系统发票号": {EN: "PO Nbr", CN: '系统发票号'},
            "SKU数量": {EN: "SKU number", CN: 'SKU数量'},
            "SKU单价": {EN: "SKU price", CN: 'SKU单价'},
            "含税总额": {EN: "Amount", CN: '含税总额'},
            "已核销金额": {EN: "Payment Amount", CN: '已核销金额'},
            "未结金额": {EN: "Balance", CN: '未结金额'},
            "累计未结金额": {EN: "Running Balance", CN: '累计未结金额'},
            "逾期天数": {EN: "Days Overdue", CN: '逾期天数'},
            "到期日": {EN: "Due date", CN: '到期日'}
        };

        function translate(str) {
            var lang = runtime.getCurrentUser().getPreference({name: "LANGUAGE"});
            lang = lang == 'zh_CN' ? "CN" : "EN";
            return langObj[str] ? langObj[str][lang] : str;
        }

        return {
            translate: translate
        };


    });

