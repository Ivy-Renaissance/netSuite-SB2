/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/ui/dialog'],function(dialog) {
    function myTwoScript(){
        var message = "这是我的第二个弹窗"
        dialog.alert({
            title:"小鹿奔奔",
            message:message
        });
    }
    return{
        pageInit:myTwoScript
    }

});
