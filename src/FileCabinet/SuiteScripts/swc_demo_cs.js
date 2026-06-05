/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', "N/url", "N/log", "N/https", "N/ui/dialog", "N/currentRecord",],
    /**
     * @param{record} record
     * @param{search} search
     */
    function (record, search, url, log, https, dialog, currentRecord) {

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
            log.debug('pageInit', '这是页面初始化')
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
            log.debug('fieldChanged', scriptContext)
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
            log.debug('postSourcing', scriptContext)
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
            log.debug('sublistChanged', scriptContext)
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
            log.debug('lineInit', scriptContext)
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
            log.debug('validateField', scriptContext)
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
            log.debug('validateLine', scriptContext)
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
            log.debug('validateInsert', scriptContext)
            
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
            log.debug('validateDelete', scriptContext)
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
            log.debug('saveRecord', scriptContext)
            return true
        }

        function CreateFulfillmentOrder(){
            console.log('进入CreateFulfillmentOrder');
    	log.audit('CreateFulfillmentOrder', 'CreateFulfillmentOrder');
        // return;
    	var rec = currentRecord.get();
        var link = url.resolveScript({
            scriptId: 'customscript_swc_demo_rl',
            deploymentId: 'customdeploy_swc_demo_rl',
            params: {
                to_id: rec.id,
                act: 'CreateFulfillmentOrder'
            }
        });
        log.debug('link post:',link);
        var header = {
 				"Content-Type":"application/json;charset=utf-8",
 				"Accept":"application/json"
 		};
        var body = {
            "so_id": rec.id,
            "so_act": 'CreateFulfillmentOrder'
        }
        var dataFromRestlet = https.post({
			url : link,
			body : body,
			headers : header
		});
        log.debug('dataFromRestlet',dataFromRestlet);
        
        var result_body = JSON.parse(dataFromRestlet.body);
        log.debug('result_body',result_body);
        log.debug('result_body.code',result_body.code);
        if(result_body.code == 'Success'){
        	var options = {
        			 title: "MCF CreateFulfillmentOrder Success",
        			 message: result_body.message
        			};
        			function success(result) { 
        			 console.log("Success with value " + result); 
        			}
        			function failure(reason) { 
        			 console.log("Failure: " + reason); 
        			}
        			dialog.confirm(options).then(success).catch(failure);
        }else{
        	var options = {
        			 title: "MCF CreateFulfillmentOrder Failure",
        			 message: result_body.message
        			};
        			function success(result) { 
        			 console.log("Success with value " + result); 
        			}
        			function failure(reason) { 
        			 console.log("Failure: " + reason); 
        			}
        			dialog.confirm(options).then(success).catch(failure);
        	
        }
    //    console.log(dataFromRestlet.body);
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
            saveRecord: saveRecord,
            CreateFulfillmentOrder: CreateFulfillmentOrder
        };

    });
