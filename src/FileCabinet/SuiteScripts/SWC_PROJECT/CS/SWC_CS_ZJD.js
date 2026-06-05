/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search'],

    function(search) {

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
            var curRec = scriptContext.currentRecord;
            var sublistId = scriptContext.sublistId;
            var fieldId = scriptContext.fieldId;

            if (fieldId == 'custrecord_swc_qc_subsidiary') {
                var search_vendor = curRec.getValue({fieldId: 'custrecord_swc_qc_vendor'});
                var search_sub_id = curRec.getValue({fieldId: 'custrecord_swc_qc_subsidiary'});
                var location  = getLocInfo(search_vendor, search_sub_id);
                if (location) {
                    curRec.setValue({
                        fieldId: 'custrecord_swc_qc_location',
                        value: location
                    })
                } else {
                    alert('未匹配到相应的仓库');
                }

            }
            // if (fieldId == 'custrecord_swc_qc_details_item') {
            //     var item = curRec.getCurrentSublistValue({
            //         sublistId: sublistId,
            //         fieldId: 'custrecord_swc_qc_details_item'
            //     });
            //
            //     if (item) {
            //         var zjbz = searchZjbz(item);
            //         if (zjbz) {
            //             curRec.setCurrentSublistValue({
            //                 sublistId: sublistId,
            //                 fieldId: 'custrecord_swc_qc_details_standard',
            //                 value: zjbz
            //             });
            //         }
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
        function saveRecord(scriptContext) {

        }

        function getLocInfo(search_vendor, search_sub_id) {
            var rec_search_obj = search.create({
                type: 'location',
                filters:
                    [
                        ['subsidiary', 'anyof', search_sub_id],
                        'AND',
                        ['custrecord_swc_vendor', 'anyof', search_vendor],
                        'AND',
                        ['isinactive', 'is', false]
                    ],
                columns:
                    [
                        'name'
                    ]
            });
            var results = getAllResults(rec_search_obj);
            var loc_id;
            if (results.length > 0) {
                loc_id = results[0].id;
            }
            return loc_id;
        }

        /**
         * 通用检索方法
         * @param mySearch
         * @returns {[]}
         */
        function getAllResults(mySearch) {
            var resultSet = mySearch.run();
            var resultArr = [];
            var start = 0;
            var step = 1000;
            var results = resultSet.getRange({
                start: start,
                end: step
            });
            while (results && results.length > 0) {
                resultArr = resultArr.concat(results);
                start = Number(start) + Number(step);
                results = resultSet.getRange({
                    start: start,
                    end: Number(start) + Number(step)
                });
            }
            return resultArr;
        }

        function  searchZjbz (item) {
            var rec_search_obj = search.create({
                type: 'customrecord_swc_qc_standard',
                filters:
                    [
                        ['custrecord_swc_qcs_item', 'anyof', item],
                    ],
                columns:
                    [
                        'name'
                    ]
            });
            var results = getAllResults(rec_search_obj);
            var loc_id;
            if (results.length > 0) {
                loc_id = results[0].id;
            }
            return loc_id;
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            // validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            // saveRecord: saveRecord
        };

    });