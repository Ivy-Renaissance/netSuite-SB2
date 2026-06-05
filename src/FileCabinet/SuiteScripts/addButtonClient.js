/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/message'],

function(message) {
    
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

    function customButtonFunction(entityId,type){
        console.log('customButtonFunction');
        var  msg = message.create({
            title: '小鹿奔奔自定义按钮的提示',
            message: `小鹿奔奔的提示"${entityId}" and "${type}"`,

            type: message.Type.INFORMATION
        });
        msg.show();
    }



    return {
        pageInit: pageInit,
        customButtonFunction: customButtonFunction
    };
    
});
