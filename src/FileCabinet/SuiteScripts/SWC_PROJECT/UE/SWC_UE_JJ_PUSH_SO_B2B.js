/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @name SWC_UE_JJ_PUSH_SO_B2B.js
 * @author ZJG
 * @description NS B2B销售订单推送至积加
 */
define(['N/record', 'N/search', '../common/moment', '../common/interface', 'N/runtime', 'N/error', 'N/format'],

    function (record, search, moment, interface, runtime, error, format) {
        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        function beforeLoad(scriptContext) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {
            try {
                var developer_id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_so_developer_id' });
                if (!developer_id) {
                    log.audit('无账号', '无账号');
                    return
                }
                var newRecord = scriptContext.newRecord;
                var type = scriptContext.type;
                log.audit('type', type);
                log.audit('newRecordType', newRecord.type);

                if (type == 'delete') {

                } else {
                    var b2b = newRecord.getValue('custbody_swc_2b_so');// 2B销售订单
                    var preincome_status = newRecord.getValue('custbody_swc_advancerecep_status');// 预收款状态
                    var jj_so_create = newRecord.getValue('custbody_swc_jj_so_create');// 是否同步积加成功
                    log.audit('params', {
                        b2b: b2b,
                        preincome_status: preincome_status,
                        jj_so_create: jj_so_create,
                    });
                    if (!jj_so_create && b2b && preincome_status == '2') {
                        //销售订单
                        newRecord = record.load({ type: newRecord.type, id: newRecord.id });
                        var auth = interface.JJDeveloperAccountAuth(developer_id);
                        log.audit('auth', auth);
                        var body = GetBody(newRecord);
                        log.audit('body', body);

                        //创建接口
                        var path = '/fulfillment/order/mfnOrder/create/V2';
                        var response_body = interface.JJHttpsResponse('post', path, auth, body);
                        log.audit('response_body_item', response_body);
                        if (response_body.code == '200') {
                            newRecord.setValue({ fieldId: 'custbody_swc_jj_so_create', value: true });
                            newRecord.setValue({ fieldId: 'custbody_swc_jj_so_error', value: '' });
                            newRecord.setValue({ fieldId: 'custbody_swc_jj_so_newsourcecode', value: response_body.data.orderCode });
                            newRecord.save({ ignoreMandatoryFields: true });
                        } else {
                            newRecord.setValue({ fieldId: 'custbody_swc_jj_so_error', value: '创建同步失败:' + JSON.stringify(response_body.messages) });
                            newRecord.save({ ignoreMandatoryFields: true });
                        }

                    }
                }
            } catch (err) {
                log.error('afterSubmit error', err);
                var e = err.message ? err.message : err;
                log.audit('e', e);
                log.audit('1', newRecord.type);
                log.audit('2', newRecord.id);
                record.submitFields({
                    type: newRecord.type,
                    id: newRecord.id,
                    values: {
                        'custitem_swc_jj_item_error': e
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });

            }
        }

        function GetBody(rec) {
            log.audit('GetBody', rec);

            var shopId = '', items = [], addressObj = {};
            search.create({
                type: 'salesorder',
                filters: [
                    { name: 'internalId', operator: 'is', values: rec.id },
                    { name: 'mainline', operator: 'is', values: false },
                    { name: 'taxline', operator: 'is', values: false },
                    { name: 'shipping', operator: 'is', values: false },
                ],
                columns: [
                    { name: 'custentity_swc_jj_customer_id', join: 'customer' },
                    { name: 'item' },
                    { name: 'quantity' },
                    { name: 'fxrate' },
                    { name: 'fxamount' },
                    { name: 'custcol_swc_msku' },
                    { name: 'custcol_swc_line_no' },
                    { name: 'symbol', join: 'currency' },
                    { name: 'displayname', join: 'item' },
                    { name: 'custitem_swc_packagel', join: 'item' },
                    { name: 'custitem_swc_packagew', join: 'item' },
                    { name: 'custitem_swc_packageh', join: 'item' },
                    { name: 'custitem_swc_total_net_weight', join: 'item' },
                    { name: 'custitem_swc_total_gross_weight', join: 'item' },
                    { name: 'shipaddress1' },
                    { name: 'shipaddress2' },
                    { name: 'shipaddress3' },
                    { name: 'shipaddressee' },
                    { name: 'shippingattention' },
                    { name: 'shipcountrycode' },
                    { name: 'shipstate' },
                    { name: 'shipcity' },
                    { name: 'shipzip' },
                    { name: 'shipphone' },
                ]
            }).run().each(function (lrec) {
                if (!shopId) {
                    shopId = lrec.getValue({ name: 'custentity_swc_jj_customer_id', join: 'customer' });
                }
                if (Object.keys(addressObj).length == 0) {
                    addressObj.address = lrec.getValue('shipaddress1') + ' ' + lrec.getValue('shipaddress2') + ' ' + lrec.getValue('shipaddress3');
                    addressObj.shipaddressee = lrec.getValue('shipaddressee');
                    addressObj.shippingattention = lrec.getValue('shippingattention');
                    addressObj.shipcountrycode = lrec.getValue('shipcountrycode');
                    addressObj.shipstate = lrec.getValue('shipstate');
                    addressObj.shipcity = lrec.getValue('shipcity');
                    addressObj.shipzip = lrec.getValue('shipzip');
                    addressObj.shipphone = lrec.getValue('shipphone');
                }
                items.push({
                    "orderTotalAmountExcludingTax": Number(lrec.getValue('fxrate')),//商品售价（不含税,实际支付金额）
                    "amount": Number(lrec.getValue('fxamount')),//销售金额
                    "commodityName": lrec.getValue({ name: 'displayname', join: 'item' }),//商品名称
                    "currency": lrec.getValue({ name: 'symbol', join: 'currency' }),//币种
                    "grossWeight": Number(lrec.getValue({ name: 'custitem_swc_total_gross_weight', join: 'item' })),//毛重
                    "netWeight": Number(lrec.getValue({ name: 'custitem_swc_total_net_weight', join: 'item' })),//净重
                    "height": Number(lrec.getValue({ name: 'custitem_swc_packageh', join: 'item' })),//高
                    "length": Number(lrec.getValue({ name: 'custitem_swc_packagel', join: 'item' })),//长
                    "width": Number(lrec.getValue({ name: 'custitem_swc_packagew', join: 'item' })),//宽
                    "orderCode": rec.getValue('tranid'),//订单编号
                    "sku": lrec.getText('item'),//SKU
                    "validQuantity": lrec.getValue('quantity'),//有效数量(实际发货数量)
                    "erpOrderLineNo": lrec.getValue('custcol_swc_line_no'),//自定义订单明细行号
                    "others": '',//订单其他费用
                    "detailStatus": "VALID",
                    "expectedQuantity": lrec.getValue('quantity'),
                    "msku": lrec.getValue('custcol_swc_msku'),
                });
                return true;
            });
            log.audit('addressObj', addressObj);

            var body = {
                "orderType": "STANDARD",
                // "buyerEmail": "",//不知道取哪个值
                "sourceChannel": "CUSTOM",//默认?
                "accessMode": "INTERFACE",
                // "buyerName": "",//不知道取哪个值
                "receiverAddress": {
                    "address": addressObj.address,
                    "city": addressObj.shipcity,
                    "country": addressObj.shipcountrycode,
                    "countryCode": addressObj.shipcountrycode,
                    "province": addressObj.shipstate,
                    "provinceCode": addressObj.shipstate,
                    "receiveEmail": '',
                    "receiveFaxNum": '',
                    "receiveMobile": '',
                    "area": '',
                    "areaCode": '',
                    "houseNumber": '',
                    "street": '',
                    "cityCode": addressObj.shipcity,
                    "receivePhone": addressObj.shipphone,
                    "receiveName": addressObj.shippingattention,
                    "receivePostalCode": addressObj.shipzip,
                },
                // "orderTotalAmountExcludingTax": "",
                // "buyerRemark": "",
                "sourceCode": rec.getValue('otherrefnum') ? rec.getValue('otherrefnum') : rec.getValue('tranid'),
                "orderCode": rec.getValue('tranid'),
                "orderTime": moment(format.format({ value: rec.getValue('trandate'), type: 'date' }).replace(/([^\u0000-\u00FF])/g, '/')).format('YYYY-MM-DD HH:mm:ss'),
                "regionId": 200001,
                "marketId": 0,//客户对应的积加id
                // "shippingAmount": "",
                "shopId": shopId,
                "detailList": items,
            }
            return body
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });