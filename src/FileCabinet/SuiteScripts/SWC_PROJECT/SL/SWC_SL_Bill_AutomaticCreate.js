/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/search', '../common/SWC_CONFIG_DATA'],
    (record, search,SWC_CONFIG_DATA) => {

        const onRequest = (context) => {
            log.audit('进入')
            const request = context.request;
            const response = context.response;
            log.audit('response',response);
            const parameters = request.body;
            log.audit('parameters',parameters);
            // 获取采购订单 ID（优先从 POST body 解析 JSON，其次从 URL 参数）
            var result = {code: 200, data: {}, msg: "执行成功"};


            try {
                //生成预付申请单
                log.audit("账单", parameters);
                let adData = JSON.parse(parameters)
                log.audit("adData", adData);
                var taskId = createBill(adData);
                log.audit("账单", taskId);
                // result["data"] = poId;
                result["code"] = 200;
                result["data"].id = taskId;
            } catch (e) {
                result["code"] = 500;
                result["msg"] = e.message;
                log.audit('e.message',e.message);
            }
            response.write(JSON.stringify(result));

        };

        function createBill(adData) {
            log.audit('adData',adData.purId);
            var purRec = record.transform({
                fromType: record.Type.PURCHASE_ORDER,
                fromId: adData.purId,
                toType: record.Type.VENDOR_BILL,
                isDynamic: true,
            });

            purRec.setValue({
                fieldId: 'account',
                value: adData.account
            });

            // var type = purRec.getValue({
            //     fieldId: 'custbody_swc_order_type2'
            // });

            // if (type != SWC_CONFIG_DATA.configData().s_po_type_ggfy_s && type != SWC_CONFIG_DATA.configData().s_po_type_ggfy_y) {
            //     purRec.setValue({
            //         fieldId: 'account',
            //         value: SWC_CONFIG_DATA.configData().S_ACCOUNT_YFZK
            //     });
            // }

            return purRec.save({ignoreMandatoryFields: true});
        }

        return { onRequest };
    });