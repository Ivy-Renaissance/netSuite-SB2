/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/ui/serverWidget'],
    /**
 * @param{search} search
 */
    (search, record, serverWidget) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            var form = scriptContext.form;
            // form.getField({
            //     id: 'itemid'
            // }).updateDisplayType({
            //     displayType: serverWidget.FieldDisplayType.DISABLED
            // });


        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

            log.debug('scriptContext', scriptContext)
            log.debug('scriptContext.type', scriptContext.type)
            var newRecord = scriptContext.newRecord;
            // var update = newRecord.getValue('custitem1');
            if (scriptContext.type == 'create') {
                var itemid = newRecord.getValue('itemid');
                var externalid = newRecord.getValue('externalid');
                if (!externalid) {
                    newRecord.setValue({ fieldId: 'externalid', value: itemid })
                }
            }
            return;
            if (scriptContext.type == 'create') {
                // newRecord.setValue({ fieldId: 'custitem1', value: false })
                //各属性编码
                var cplb_code = '';//产品类别
                var brand_code = '';//品牌
                var region_code = '1';//区域 默认美国代码1
                var yjlm_code = '';//一级类目
                var ejlm_code = '';//二级类目
                var sjlm_code = '';//三级类目
                var version_code = '00';//版本
                var colour_code = '00';//颜色 默认无颜色代码00


                //各属性描述
                var cplb_desc = '';//产品类别
                var brand_desc = '';//品牌
                var region_desc = '';//区域
                var yjlm_desc = '';//一级类目
                var ejlm_desc = '';//二级类目
                var sjlm_desc = '';//三级类目
                var version_desc = '';//版本
                var colour_desc = '';//颜色

                var itemid_prefix = '';//生成的货品编码前缀
                var itemDescribe_prefix = '';//生成的货品描述前缀
                var itemid = '';//生成的货品编码
                var itemDescribe = '';//生成的货品描述

                var des_number = '';//描述流水号

                var cplb = newRecord.getValue('custitem_swc_cplb');
                var brand = newRecord.getValue('custitem_swc_brand');
                var yjlm = newRecord.getValue('custitem_swc_yjlm');
                var ejlm = newRecord.getValue('custitem_swc_ejlm');
                var sjlm = newRecord.getValue('custitem_swc_sjlm');
                var colour = newRecord.getValue('custitem_swc_colour');
                var version = newRecord.getValue('custitem_swc_sku_version');
                var region = newRecord.getValue('custitem_swc_sku_region');
                var itemDescribe_origin = newRecord.getValue('displayname')

                var main_sku = newRecord.getValue('custitem_swc_main_sku');//配件对应的主产品
                var flow_from_sku = newRecord.getValue('custitem_swc_flow_from');//流水号继承自
                var not_generate_flow = newRecord.getValue('custitem_swc_not_generate_flow');//不生成新流水

                if (main_sku) {
                    search.create({
                        type: 'item',
                        filters: [
                            { name: 'internalid', operator: search.Operator.IS, values: main_sku }
                        ],
                        columns: [
                            { name: 'itemid' },//主产品编码
                            { name: 'displayname' },//主产品描述
                        ]
                    }).run().each(function (rec) {
                        log.debug('主产品编码结果', rec)
                        itemid_prefix = rec.getValue(rec.columns[0])
                        itemDescribe_prefix = rec.getValue(rec.columns[1])
                        return false;
                    });
                    cplb && search.create({
                        type: 'customrecord_swc_cplb',
                        filters: [
                            { name: 'internalid', operator: search.Operator.IS, values: cplb }
                        ],
                        columns: [
                            { name: 'custrecord_swc_cplb_bmsx' },//编码缩写
                            { name: 'custrecord_swc_cplb_mssx' }//描述缩写
                        ]
                    }).run().each(function (rec) {
                        log.debug('产品类别结果', rec)
                        cplb_code = rec.getValue(rec.columns[0])
                        cplb_desc = rec.getValue(rec.columns[1])
                        // itemid = itemid + rec.getValue(rec.columns[0])
                        // itemDescribe = itemDescribe + rec.getValue(rec.columns[1])
                        return false;
                    });
                    itemid_prefix = cplb_code + itemid_prefix.substring(1, itemid_prefix.length)
                }

                //如果不需要生成产品描述流水号，则产品描述流水号取自流水号继承自SKU
                if (not_generate_flow && flow_from_sku) {
                    search.create({
                        type: 'item',
                        filters: [
                            { name: 'internalid', operator: search.Operator.IS, values: flow_from_sku }
                        ],
                        columns: [
                            { name: 'custitem_swc_desc_flow_number' },//产品描述流水号
                        ]
                    }).run().each(function (rec) {
                        log.debug('产品描述流水号结果', rec)
                        des_number = rec.getValue(rec.columns[0])
                        return false;
                    });
                }

                //需要产生编码流水号或者描述流水
                // if (!main_sku || !(not_generate_flow && flow_from_sku)) //不管继承不继承都需要搜索出描述编码
                {

                    cplb && search.create({
                        type: 'customrecord_swc_cplb',
                        filters: [
                            { name: 'internalid', operator: search.Operator.IS, values: cplb }
                        ],
                        columns: [
                            { name: 'custrecord_swc_cplb_bmsx' },//编码缩写
                            { name: 'custrecord_swc_cplb_mssx' }//描述缩写
                        ]
                    }).run().each(function (rec) {
                        log.debug('产品类别结果', rec)
                        cplb_code = rec.getValue(rec.columns[0])
                        cplb_desc = rec.getValue(rec.columns[1])
                        // itemid = itemid + rec.getValue(rec.columns[0])
                        // itemDescribe = itemDescribe + rec.getValue(rec.columns[1])
                        return false;
                    });
                    brand && search.create({
                        type: 'customrecord_swc_brand',
                        filters: [
                            { name: 'internalid', operator: search.Operator.IS, values: brand }
                        ],
                        columns: [
                            { name: 'custrecord_swc_brand_bmsx' },//编码缩写
                            { name: 'custrecord_swc_brand_mssx' }//描述缩写
                        ]
                    }).run().each(function (rec) {
                        log.debug('品牌结果', rec)
                        brand_code = rec.getValue(rec.columns[0])
                        brand_desc = rec.getValue(rec.columns[1])
                        // itemid = itemid + rec.getValue(rec.columns[0])
                        // itemDescribe = itemDescribe + rec.getValue(rec.columns[1])
                        return false;
                    });
                    region && search.create({
                        type: 'customrecord_swc_region',
                        filters: [
                            { name: 'internalid', operator: search.Operator.IS, values: region }
                        ],
                        columns: [
                            { name: 'custrecord_swc_region_bmsx' },//编码缩写
                            { name: 'custrecord_swc_region_mssx' }//描述缩写
                        ]
                    }).run().each(function (rec) {
                        log.debug('品牌结果', rec)
                        region_code = rec.getValue(rec.columns[0])
                        region_desc = rec.getValue(rec.columns[1])
                        // itemid = itemid + rec.getValue(rec.columns[0])
                        // itemDescribe = itemDescribe + rec.getValue(rec.columns[1])
                        return false;
                    });
                    yjlm && search.create({
                        type: 'customrecord_swc_yjlm',
                        filters: [
                            { name: 'internalid', operator: search.Operator.IS, values: yjlm }
                        ],
                        columns: [
                            { name: 'custrecord_swc_yjlm_bmsx' },//编码缩写
                            { name: 'custrecord_swc_yjlm_mssx' }//描述缩写
                        ]
                    }).run().each(function (rec) {
                        log.debug('产品一级类目结果', rec)
                        yjlm_code = rec.getValue(rec.columns[0])
                        yjlm_desc = rec.getValue(rec.columns[1])
                        // itemid = itemid + rec.getValue(rec.columns[0])
                        // itemDescribe = itemDescribe + rec.getValue(rec.columns[1])
                        return false;
                    });
                    ejlm && search.create({
                        type: 'customrecord_swc_ejlm',
                        filters: [
                            { name: 'internalid', operator: search.Operator.IS, values: ejlm }
                        ],
                        columns: [
                            { name: 'custrecord_swc_ejlm_bmsx' },//编码缩写
                            { name: 'custrecord_swc_ejlm_mssx' }//描述缩写
                        ]
                    }).run().each(function (rec) {
                        log.debug('产品二级类目结果', rec)
                        ejlm_code = rec.getValue(rec.columns[0])
                        ejlm_desc = rec.getValue(rec.columns[1])
                        // itemid = itemid + rec.getValue(rec.columns[0])
                        // itemDescribe = itemDescribe + rec.getValue(rec.columns[1])
                        return false;
                    });
                    sjlm && search.create({
                        type: 'customrecord_swc_sjlm',
                        filters: [
                            { name: 'internalid', operator: search.Operator.IS, values: sjlm }
                        ],
                        columns: [
                            { name: 'custrecord_swc_sjlm_bmsx' },//编码缩写
                            { name: 'custrecord_swc_sjlm_mssx' }//描述缩写
                        ]
                    }).run().each(function (rec) {
                        log.debug('产品三级类目结果', rec)
                        sjlm_code = rec.getValue(rec.columns[0])
                        sjlm_desc = rec.getValue(rec.columns[1])
                        // itemid = itemid + rec.getValue(rec.columns[0])
                        // itemDescribe = itemDescribe + rec.getValue(rec.columns[1])
                        return false;
                    });
                    version && search.create({
                        type: 'customrecord_swc_sku_version',
                        filters: [
                            { name: 'internalid', operator: search.Operator.IS, values: version }
                        ],
                        columns: [
                            { name: 'custrecord_swc_version_bmsx' },//编码缩写
                            { name: 'custrecord_swc_version_mssx' }//描述缩写
                        ]
                    }).run().each(function (rec) {
                        log.debug('产品版本结果', rec)
                        version_code = rec.getValue(rec.columns[0])
                        version_desc = rec.getValue(rec.columns[1])
                        // itemid = itemid + rec.getValue(rec.columns[0])
                        // itemDescribe = itemDescribe + rec.getValue(rec.columns[1])
                        return false;
                    });
                    colour && search.create({
                        type: 'customrecord_swc_sku_colour',
                        filters: [
                            { name: 'internalid', operator: search.Operator.IS, values: colour }
                        ],
                        columns: [
                            { name: 'custrecord_swc_colour_bmsx' },//编码缩写
                            { name: 'custrecord_swc_colour_mssx' }//描述缩写
                        ]
                    }).run().each(function (rec) {
                        log.debug('产品颜色结果', rec)
                        colour_code = rec.getValue(rec.columns[0])
                        colour_desc = rec.getValue(rec.columns[1])
                        // itemid = itemid + rec.getValue(rec.columns[0])
                        // itemDescribe = itemDescribe + rec.getValue(rec.columns[1])
                        return false;
                    });
                    if (!main_sku)
                        itemid_prefix = '' + cplb_code + brand_code + region_code + yjlm_code + ejlm_code + sjlm_code + version_code + colour_code;
                    if (!(not_generate_flow && flow_from_sku) && !itemDescribe_origin && !main_sku) {
                        des_number = getFlowNumber('itemDescribe', 5, true)
                    }

                }
                var len = 3;
                if (cplb_code == 2) {
                    len = 2;
                }
                log.debug('产品类别', cplb)
                var code_number = getFlowNumber(itemid_prefix, len, true)
                itemid = itemid_prefix + code_number;
                log.debug('产品编码', itemid)
                log.debug('产品描述', itemDescribe)
                log.debug('des_number', des_number)
                log.debug('itemDescribe_origin', itemDescribe_origin)
                newRecord.setValue({ fieldId: 'itemid', value: itemid })


                //描述为空的产品描述才根据规则生成
                if (!itemDescribe_origin) {
                    // var des_number = getFlowNumber('itemDescribe', 5, true)
                    if (!main_sku) {
                        itemDescribe = '' + cplb_desc + brand_desc + region_desc + yjlm_desc + ejlm_desc + sjlm_desc + des_number + colour_desc + version_desc;
                    }else{
                        des_number = getFlowNumber(itemDescribe_prefix, 3, true)
                        itemDescribe = '' + itemDescribe_prefix + des_number
                    }
                    
                    newRecord.setValue({ fieldId: 'displayname', value: itemDescribe })
                    newRecord.setValue({ fieldId: 'custitem_swc_desc_flow_number', value: des_number })
                }

            }



        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        function getFlowNumber(prefex, length, save) {
            log.debug('prefex', prefex);
            //流水号处理
            var recid, existWuliuNumber, finNumber, existZyNumber;
            search.create({
                type: 'customrecord_swc_item_flow_number',
                filters: [
                    { name: 'custrecord_swc_item_prefix', operator: 'is', values: prefex },
                ],
            }).run().each(function (result) {
                recid = result.id;
            });
            if (!recid) {
                log.debug('99:', 52555);
                existWuliuNumber = 1;
                var newRec = record.create({ type: 'customrecord_swc_item_flow_number', isDynamic: true });
                newRec.setValue({ fieldId: 'custrecord_swc_item_prefix', value: prefex });
                newRec.setValue({ fieldId: 'custrecord_swc_item_number', value: existWuliuNumber });
                if (save) {
                    newRec.save()
                }

                finNumber = polish(existWuliuNumber, length)


            } else {
                log.debug('112:', 112);
                var extRecord = record.load({ type: 'customrecord_swc_item_flow_number', id: recid });
                existZyNumber = Number(extRecord.getValue('custrecord_swc_item_number')) + 1;
                finNumber = polish(existZyNumber, length)
                extRecord.setValue({ fieldId: 'custrecord_swc_item_number', value: existZyNumber });
                if (save) {
                    extRecord.save()
                }

            }
            return finNumber;
        }
        function polish(num, n) {
            var len = num.toString().length;//num的值转换成字符串并且将它的长度赋值
            while (len < n) {//n是总位数
                num = "0" + num;
                len++;
            }
            return num;
        }

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
