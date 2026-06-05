/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @name SWC_UE_JJ_PUSH_ITEM.js
 * @author ZJG
 * @description NS货品同步至积加
 */
define(['N/record', 'N/search', '../common/moment', '../common/interface', 'N/runtime', 'N/error'],

    function (record, search, moment, interface, runtime, error) {
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
                var developer_id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_item_developer_id' });

                var newRecord = scriptContext.newRecord;
                var type = scriptContext.type;
                log.audit('type', type);
                log.audit('newRecordType', newRecord.type);

                if (type == 'delete') {

                } else {
                    if (newRecord.type == 'lotnumberedinventoryitem' || newRecord.type == 'lotnumberedassemblyitem' || newRecord.type == 'kititem') {
                        //批号库存商品
                        newRecord = record.load({ type: newRecord.type, id: newRecord.id });
                        var auth = interface.JJDeveloperAccountAuth(developer_id);
                        log.audit('auth', auth);
                        var body = GetBody(newRecord);
                        log.audit('body', body);
                        var push_jj_pro = newRecord.getValue('custitem_swc_push_jj_pro');//是否要推送积家生产环境
                        if (!push_jj_pro) {
                            return
                        }

                        var jj_create = newRecord.getValue('custitem_swc_jj_create');//是否创建成功
                        if (jj_create) {
                            //更新接口
                            var path = '/purchase/goods/product/update';
                            var response_body = interface.JJHttpsResponse('post', path, auth, body);
                            log.audit('response_body_item', response_body);
                            if (response_body.code == '200') {
                                newRecord.setValue({ fieldId: 'custitem_swc_jj_item_error', value: '' });
                                newRecord.save({ ignoreMandatoryFields: true });
                            } else {
                                newRecord.setValue({ fieldId: 'custitem_swc_jj_item_error', value: '更新同步失败:' + JSON.stringify(response_body.messages) });
                                newRecord.save({ ignoreMandatoryFields: true });
                            }
                        } else {
                            //创建接口
                            var path = '/purchase/goods/product/create';
                            var response_body = interface.JJHttpsResponse('post', path, auth, body);
                            log.audit('response_body_item', response_body);
                            if (response_body.code == '200') {
                                newRecord.setValue({ fieldId: 'custitem_swc_jj_create', value: true });
                                newRecord.setValue({ fieldId: 'custitem_swc_jj_item_error', value: '' });
                                newRecord.save({ ignoreMandatoryFields: true });
                            } else {
                                newRecord.setValue({ fieldId: 'custitem_swc_jj_item_error', value: '创建同步失败:' + JSON.stringify(response_body.messages) });
                                newRecord.save({ ignoreMandatoryFields: true });
                            }
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
            var body = {}, product = {}, cplb_bmsx = '', yjlm_bmsx = '', ejlm_bmsx = '', sjlm_bmsx = '', jjbm = '';
            var developer_id = '', purchasing_manager = '';
            var developer_name = '', purchasing_manager_name = '';
            search.create({
                type: rec.type,
                filters: [
                    { name: 'internalId', operator: 'anyof', values: rec.id },
                ],
                columns: [
                    { name: 'custrecord_swc_cplb_bmsx', join: 'custitem_swc_cplb' },
                    { name: 'custitem_swc_packageL' },
                    { name: 'custitem_swc_packageW' },
                    { name: 'custitem_swc_packageH' },
                    { name: 'custitem_swc_packageweight' },
                    { name: 'custrecord_swc_yjlm_bmsx', join: 'custitem_swc_yjlm' },//一级类目 - 编码缩写
                    { name: 'custrecord_swc_ejlm_bmsx', join: 'custitem_swc_ejlm' },//二级类目 - 编码缩写
                    { name: 'custrecord_swc_sjlm_bmsx', join: 'custitem_swc_sjlm' },//三级类目 - 编码缩写
                    { name: 'custrecord_swc_sjlm_jjbm', join: 'custitem_swc_sjlm' },//三级类目 - 积加编码
                    { name: 'custrecord_swc_brand_bmsx', join: 'custitem_swc_brand' },//品牌编码
                    { name: 'custentity_swc_jj_user_name', join: 'custitem_swc_sku_developer'},//开发负责人
                    { name: 'custentity_swc_jj_userid', join: 'custitem_swc_sku_developer' },//开发负责人
                    { name: 'custentity_swc_jj_user_name', join: 'custitem_swc_purchasing_manager' },//采购负责人
                    { name: 'custentity_swc_jj_userid', join: 'custitem_swc_purchasing_manager' },//采购负责人
                ]
            }).run().each(function (a) {
                cplb_bmsx = a.getValue({ name: 'custrecord_swc_cplb_bmsx', join: 'custitem_swc_cplb' });
                // product.productType = a.getValue({ name: 'custrecord_swc_cplb_bmsx', join: 'custitem_swc_cplb' });
                product.packageL = a.getValue('custitem_swc_packageL') || 0;
                product.packageW = a.getValue('custitem_swc_packageW') || 0;
                product.packageH = a.getValue('custitem_swc_packageH') || 0;
                product.packageWeight = Number(a.getValue('custitem_swc_packageweight') || 0);
                product.packageWeightUnit = 'kg';
                product.brand = a.getValue({ name: 'custrecord_swc_brand_bmsx', join: 'custitem_swc_brand' });
                developer_name = a.getValue({ name: 'custentity_swc_jj_user_name', join: 'custitem_swc_sku_developer' });
                developer_id = a.getValue({ name: 'custentity_swc_jj_userid', join: 'custitem_swc_sku_developer' });// 开发负责人Id 
                purchasing_manager_name = a.getValue({ name: 'custentity_swc_jj_user_name', join: 'custitem_swc_purchasing_manager' });
                purchasing_manager = a.getValue({ name: 'custentity_swc_jj_userid', join: 'custitem_swc_purchasing_manager' });// 采购负责人Id 
                yjlm_bmsx = a.getValue({ name: 'custrecord_swc_yjlm_bmsx', join: 'custitem_swc_yjlm' });
                ejlm_bmsx = a.getValue({ name: 'custrecord_swc_ejlm_bmsx', join: 'custitem_swc_ejlm' });
                sjlm_bmsx = a.getValue({ name: 'custrecord_swc_sjlm_bmsx', join: 'custitem_swc_sjlm' });
                jjbm = a.getValue({ name: 'custrecord_swc_sjlm_jjbm', join: 'custitem_swc_sjlm' });
            });
            // if (!yjlm_bmsx) {
            //     throw '一级类目为空';
            // }
            // if (!ejlm_bmsx) {
            //     throw '二级类目为空';
            // }
            // if (!sjlm_bmsx) {
            //     throw '三级类目为空';
            // }
            if (!jjbm) {
                throw '三级类目积加编码为空';
            }
            // if (!developer_id) {
            //     throw '开发负责人 积加id为空';
            // }
            // if (!purchasing_manager) {
            //     throw '采购负责人 积加id为空';
            // }
            if (!developer_name) {
                throw '开发负责人 为空';
            }
            if (!purchasing_manager_name) {
                throw '采购负责人 为空';
            }

            product.sku = rec.getValue('itemid');
            product.name = rec.getValue('displayname');
            product.category = jjbm;//yjlm_bmsx + '_' + ejlm_bmsx + '_' + sjlm_bmsx;
            product.unit = rec.getText('stockunit');
            product.productDeliveryDays = rec.getValue('custitem_swc_productdeliverydays');
            product.chargedAttribute = rec.getValue('custitem_swc_contain_electricity');//带电属性
            var isinactive = rec.getValue('isinactive')
            product.state = isinactive ? '1' : '0';//产品状态 [0-正常，1-停用]

            if (rec.type == 'lotnumberedinventoryitem') {
                if (cplb_bmsx == '1') {
                    product.productType = 0;
                } else if (cplb_bmsx == '2') {
                    product.productType = 3;
                } else {
                    product.productType = '';
                }
            }
            else if (rec.type == 'lotnumberedassemblyitem') {
                product.productType = 0;
            }
            else if (rec.type == 'kititem') {
                product.productType = 2;
                product.unit = '个';
                product.estimatedAssemblyDays = '0';
                product.assemblyLaborCost = '0';

                var assembly = '';
                var member_info = [];
                search.create({
                    type: rec.type,
                    filters: [
                        { name: 'internalId', operator: 'anyof', values: rec.id },
                    ],
                    columns: [
                        { name: 'memberitem' },
                        { name: 'memberquantity' },
                    ]
                }).run().each(function (a) {
                    member_info.push({
                        item_id: a.getValue(a.columns[0]),
                        item_name: a.getText(a.columns[0]),
                        item_qty: a.getValue(a.columns[1]),
                    });
                    return true
                });

                for (let i = 0; i < member_info.length; i++) {
                    if (assembly) {
                        assembly = assembly + '{+}' + member_info[i].item_name + '{*}' + member_info[i].item_qty;
                    } else {
                        assembly = member_info[i].item_name + '{*}' + member_info[i].item_qty;
                    }
                }
                product.assembly = assembly;

            }

            product.purchaseAccount = purchasing_manager_name;//采购负责人
            product.productManagerAccount = developer_name;//产品负责人 为 开发产品人员
            // product.purchaseAccountId = purchasing_manager;//采购负责人
            // product.productManagerAccountId = developer_id;//产品负责人 为 开发产品人员
            product.smallImageUrl = '';
            product.purchase = '1';
            product.isInspection = '0';

            body.product = product;
            body.productMskus = [];
            return body
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });