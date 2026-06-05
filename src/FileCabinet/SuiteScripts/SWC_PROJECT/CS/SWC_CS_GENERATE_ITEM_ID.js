/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @description CS 生成产品编号
 * 
 */
define(['N/search', 'N/record'],

    function (search, record) {
        var mode;//操作模式

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

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            log.debug('pageInit scriptContext', scriptContext)
            mode = scriptContext.mode;
            if (mode == 'create') {
                var newRecord = scriptContext.currentRecord;
                newRecord.setValue('itemid', '1')
                newRecord.setValue('includechildren', true)
                newRecord.setValue('tracklandedcost', true)

            }

        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            // log.debug('fieldChanged mode', mode)
            // log.debug('scriptContext', scriptContext)
            // var newRecord = scriptContext.currentRecord;
            // if (mode == 'create' && (scriptContext.fieldId == 'custitem_swc_cplb'//产品类别
            //     || scriptContext.fieldId == 'custitem_swc_brand'//品牌
            //     || scriptContext.fieldId == 'custitem_swc_yjlm'//一级类目
            //     || scriptContext.fieldId == 'custitem_swc_ejlm'//二级类目
            //     || scriptContext.fieldId == 'custitem_swc_sjlm'//三级类目
            //     || scriptContext.fieldId == 'custitem_swc_colour'//颜色
            //     || scriptContext.fieldId == 'custitem_swc_size'//尺码
            //     || scriptContext.fieldId == 'custitem_swc_sku_version'//版本
            //     // || scriptContext.fieldId == 'custitem_swc_pjlx'//配件类型
            // )) {
            //     var cplb = newRecord.getValue('custitem_swc_cplb');
            //     var brand = newRecord.getValue('custitem_swc_brand');
            //     var yjlm = newRecord.getValue('custitem_swc_yjlm');
            //     var ejlm = newRecord.getValue('custitem_swc_ejlm');
            //     var sjlm = newRecord.getValue('custitem_swc_sjlm');
            //     var colour = newRecord.getValue('custitem_swc_colour');
            //     var size = newRecord.getValue('custitem_swc_size');
            //     var version = newRecord.getValue('custitem_swc_sku_version');
            //     // var pjlx = newRecord.getValue('custitem_swc_pjlx');
            //     // if (cplb && brand && yjlm&& ejlm&& sjlm&& colour&& size && version)
            //     {

            //         if (scriptContext.fieldId == 'custitem_swc_cplb') {
            //             if (cplb) {
            //                 search.create({
            //                     type: 'customrecord_swc_cplb',
            //                     filters: [
            //                         { name: 'internalid', operator: search.Operator.IS, values: cplb }
            //                     ],
            //                     columns: [
            //                         { name: 'custrecord_swc_cplb_bmsx' },//编码缩写
            //                         { name: 'custrecord_swc_cplb_mssx' }//描述缩写
            //                     ]
            //                 }).run().each(function (rec) {
            //                     log.debug('产品类别结果', rec)
            //                     cplb_code = rec.getValue(rec.columns[0])
            //                     cplb_desc = rec.getValue(rec.columns[1])
            //                     return false;
            //                 });
            //             } else {
            //                 cplb_code = ''
            //                 cplb_desc = ''
            //             }
            //         }
            //         if (scriptContext.fieldId == 'custitem_swc_brand') {
            //             if (brand) {
            //                 brand && search.create({
            //                     type: 'customrecord_swc_brand',
            //                     filters: [
            //                         { name: 'internalid', operator: search.Operator.IS, values: brand }
            //                     ],
            //                     columns: [
            //                         { name: 'custrecord_swc_brand_bmsx' },//编码缩写
            //                         { name: 'custrecord_swc_brand_mssx' }//描述缩写
            //                     ]
            //                 }).run().each(function (rec) {
            //                     log.debug('品牌结果', rec)
            //                     brand_code = rec.getValue(rec.columns[0])
            //                     brand_desc = rec.getValue(rec.columns[1])
            //                     return false;
            //                 });
            //             } else {
            //                 brand_code = ''
            //                 brand_desc = ''
            //             }

            //         }
            //         if (scriptContext.fieldId == 'custitem_swc_yjlm') {//一级类目
            //             if (yjlm) {
            //                 yjlm && search.create({
            //                     type: 'customrecord_swc_yjlm',
            //                     filters: [
            //                         { name: 'internalid', operator: search.Operator.IS, values: yjlm }
            //                     ],
            //                     columns: [
            //                         { name: 'custrecord_swc_yjlm_bmsx' },//编码缩写
            //                         { name: 'custrecord_swc_yjlm_mssx' }//描述缩写
            //                     ]
            //                 }).run().each(function (rec) {
            //                     log.debug('产品一级类目结果', rec)
            //                     yjlm_code = rec.getValue(rec.columns[0])
            //                     yjlm_desc = rec.getValue(rec.columns[1])
            //                     return false;
            //                 });
            //             } else {
            //                 yjlm_code = ''
            //                 yjlm_desc = ''
            //             }

            //         }
            //         if (scriptContext.fieldId == 'custitem_swc_ejlm') {//二级类目
            //             if (ejlm) {
            //                 ejlm && search.create({
            //                     type: 'customrecord_swc_ejlm',
            //                     filters: [
            //                         { name: 'internalid', operator: search.Operator.IS, values: ejlm }
            //                     ],
            //                     columns: [
            //                         { name: 'custrecord_swc_ejlm_bmsx' },//编码缩写
            //                         { name: 'custrecord_swc_ejlm_mssx' }//描述缩写
            //                     ]
            //                 }).run().each(function (rec) {
            //                     log.debug('产品二级类目结果', rec)
            //                     ejlm_code = rec.getValue(rec.columns[0])
            //                     ejlm_desc = rec.getValue(rec.columns[1])

            //                     return false;
            //                 });
            //             } else {
            //                 ejlm_code = ''
            //                 ejlm_desc = ''
            //             }

            //         }
            //         if (scriptContext.fieldId == 'custitem_swc_sjlm') {
            //             if (sjlm) {
            //                 sjlm && search.create({
            //                     type: 'customrecord_swc_sjlm',
            //                     filters: [
            //                         { name: 'internalid', operator: search.Operator.IS, values: sjlm }
            //                     ],
            //                     columns: [
            //                         { name: 'custrecord_swc_sjlm_bmsx' },//编码缩写
            //                         { name: 'custrecord_swc_sjlm_mssx' }//描述缩写
            //                     ]
            //                 }).run().each(function (rec) {
            //                     log.debug('产品三级类目结果', rec)
            //                     sjlm_code = rec.getValue(rec.columns[0])
            //                     sjlm_desc = rec.getValue(rec.columns[1])
            //                     return false;
            //                 });
            //             } else {
            //                 sjlm_code = ''
            //                 sjlm_desc = ''
            //             }

            //         }
            //         if (scriptContext.fieldId == 'custitem_swc_sku_version') {
            //             if (version) {
            //                 version && search.create({
            //                     type: 'customrecord_swc_sku_version',
            //                     filters: [
            //                         { name: 'internalid', operator: search.Operator.IS, values: version }
            //                     ],
            //                     columns: [
            //                         { name: 'custrecord_swc_version_bmsx' },//编码缩写
            //                         { name: 'custrecord_swc_version_mssx' }//描述缩写
            //                     ]
            //                 }).run().each(function (rec) {
            //                     log.debug('产品版本结果', rec)
            //                     version_code = rec.getValue(rec.columns[0])
            //                     version_desc = rec.getValue(rec.columns[1])
            //                     return false;
            //                 });
            //             } else {
            //                 version_code = ''
            //                 version_desc = ''
            //             }

            //         }
            //         if (scriptContext.fieldId == 'custitem_swc_colour') {
            //             if (colour) {
            //                 colour && search.create({
            //                     type: 'customrecord_swc_sku_colour',
            //                     filters: [
            //                         { name: 'internalid', operator: search.Operator.IS, values: colour }
            //                     ],
            //                     columns: [
            //                         { name: 'custrecord_swc_colour_bmsx' },//编码缩写
            //                         { name: 'custrecord_swc_colour_mssx' }//描述缩写
            //                     ]
            //                 }).run().each(function (rec) {
            //                     log.debug('产品颜色结果', rec)
            //                     colour_code = rec.getValue(rec.columns[0])
            //                     colour_desc = rec.getValue(rec.columns[1])
            //                     return false;
            //                 });
            //             } else {
            //                 colour_code = ''
            //                 colour_desc = ''
            //             }

            //         }

            //         itemid_prefix = '' + cplb_code + brand_code + yjlm_code + ejlm_code + sjlm_code + version_code + colour_code;
            //         itemDescribe_prefix = '' + cplb_desc + brand_desc + yjlm_desc + ejlm_desc + sjlm_desc + version_desc + colour_desc;
            //         itemid = '' + cplb_code + brand_code + yjlm_code + ejlm_code + sjlm_code + version_code + colour_code;
            //         itemDescribe = '' + cplb_desc + brand_desc + yjlm_desc + ejlm_desc + sjlm_desc + version_desc + colour_desc;
            //         log.debug('产品编码1', itemid_prefix)
            //         log.debug('产品描述1', itemDescribe_prefix)

            //         if (cplb && brand && yjlm && ejlm && sjlm && colour && size && version) {//选完之后再添加流水号
            //             var code_number = getFlowNumber(itemid_prefix, 2, false)
            //             var des_number = getFlowNumber('itemDescribe', 5, false)
            //             itemid = itemid_prefix + code_number;
            //             itemDescribe = '' + cplb_desc + brand_desc + yjlm_desc + ejlm_desc + sjlm_desc + des_number + version_desc + colour_desc;
            //         }
            //         log.debug('产品编码', itemid)
            //         log.debug('产品描述', itemDescribe)
            //         newRecord.setValue({ fieldId: 'itemid', value: itemid })
            //         newRecord.setValue({ fieldId: 'displayname', value: itemDescribe })
            //     }

            // }


        }

        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(scriptContext) {

        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {

        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(scriptContext) {

        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(scriptContext) {
            return true

        }

        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {
            return true
        }

        /**
         * Validation function to be executed when sublist line is inserted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateInsert(scriptContext) {
            return true
        }

        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {
            return true
        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {
            // log.debug('saveRecord mode', mode)
            // log.debug('saveRecord scriptContext', scriptContext)
            // log.debug('saveRecord scriptContext.mode', scriptContext.mode)
            // if (mode == 'create') {
            //     var newRecord = scriptContext.currentRecord;
            //     var newItemDescribe = newRecord.getValue('displayname');
            //     var code_number = getFlowNumber(itemid_prefix, 2, true)
            //     itemid = itemid_prefix + code_number;
            //     log.debug('产品编码', itemid)
            //     newRecord.setValue({ fieldId: 'itemid', value: itemid })

            //     if (newItemDescribe == itemDescribe) {//没有人为改过产品描述才用系统生成的描述，否则用人为改过的描述
            //         var des_number = getFlowNumber('itemDescribe', 5, true)
            //         itemDescribe = '' + cplb_desc + brand_desc + yjlm_desc + ejlm_desc + sjlm_desc + des_number + version_desc + colour_desc;
            //         log.debug('产品描述', itemDescribe)
            //         newRecord.setValue({ fieldId: 'displayname', value: itemDescribe })
            //     }
            // }
            return true
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

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            postSourcing: postSourcing,
            sublistChanged: sublistChanged,
            lineInit: lineInit,
            validateField: validateField,
            validateLine: validateLine,
            validateInsert: validateInsert,
            validateDelete: validateDelete,
            saveRecord: saveRecord
        };

    });
