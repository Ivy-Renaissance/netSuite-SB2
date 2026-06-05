/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search','N/url','N/record',"N/currentRecord"],

    function(search,url,record,currentRecord) {
        (function () {
            var curRecord = currentRecord.get();
            if(curRecord.id) {
                jQuery('#tbl_newrecrecmachcustrecord_swc_wl_plan_order_id').hide();//新建请购信息按钮
                document.querySelector('#recmachcustrecord_swc_wl_plan_order_id_layer input#attach').style.display = 'none'//附件
                document.querySelector('#recmachcustrecord_swc_wl_plan_order_id_layer input#customize').style.display = 'none'//自定义视图

                //(平铺和切换)
                var index1 = this.jQuery('#recmachcustrecord_swc_wl_plan_order_id__tab tr>td[data-label=编辑]').index() + 1;
                var index2 = this.jQuery('#recmachcustrecord_swc_wl_plan_order_id__tab tr>td[data-label=删除]').index() + 1;
                this.jQuery("head").append("<style >#recmachcustrecord_swc_wl_plan_order_id__tab  tr td:nth-child("+index1+") {display:none;}</style>");
                this.jQuery("head").append("<style >#recmachcustrecord_swc_wl_plan_order_id__tab  tr td:nth-child("+index2+") {display:none;}</style>");

                //切换
                let elementToObserve = document.querySelector("#recmachcustrecord_swc_wl_plan_order_id_layer");
                let table = "recmachcustrecord_swc_wl_plan_order_id__tab";
                let observer = new MutationObserver(function(items) {
                    items.forEach((item) => {
                        console.log(item.target.nodeName)//注意：这里在不切换选项卡的场景下可能是table
                        if (item.target.nodeName == 'DIV') {

                            hideIregulaFields(table);
                        }
                    })
                })
                observer.observe(elementToObserve, {subtree: true, childList: true});
            }
            function hideIregulaFields(table){
                var $ = jQuery;
                var projectTable= $("#" + table );
                var editIndex = projectTable.find(".uir-list-headerrow td[data-label='编辑']").index();
                //var deleteIndex=projectTable.find(".uir-list-headerrow td[data-label='删除']").index();
                if (editIndex!=-1){
                    editIndex++;
                    projectTable.find("td:nth-child( "+editIndex+" )").hide();
                }
            }
        })();
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
        return {
            pageInit: pageInit,
        };

    });
