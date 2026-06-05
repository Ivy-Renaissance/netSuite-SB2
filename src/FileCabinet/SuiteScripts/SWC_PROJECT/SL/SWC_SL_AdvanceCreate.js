/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record','N/task'],
    (record,task) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {

            var request = scriptContext.request;
            var response = scriptContext.response;
            var parameters = request.parameters;
            var adData = JSON.parse(parameters["adData"]);
            var type = adData.type;
            var id = adData.id;
            var result = {code: 200, data: {}, msg: "执行成功"};

            if (parameters["flag"] == "create") {
                try {
                    //生成预付申请单
                    var taskId = createAdvance(adData);
                    // result["data"] = poId;
                    result["code"] = 200;
                    result["data"].taskId = taskId;
                } catch (e) {
                    result["code"] = 500;
                    result["msg"] = e.message;
                }
                response.write(JSON.stringify(result));
            } else if (parameters["flag"] == "check") {
                let adData2 = JSON.parse(parameters["adData"]);
                let taskId = adData2.taskId;
                var summary = task.checkStatus(taskId);
                result["code"] = 200;
                result.data.status = summary.status;
                response.write(JSON.stringify(result));
            }

        }

        function createAdvance(adData) {
            var mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE
            });

            //设置要执行的 Map/Reduce 脚本的部署ID
            mrTask.scriptId = 'customscript_swc_mr_advancecreate';
            //设置部署ID
            mrTask.deploymentId = 'customdeploy_swc_mr_advancecreate';

            //传递参数给 Map/Reduce 脚本
            mrTask.params = {
                // 这些参数可以在 Map/Reduce 脚本的 context.param1, context.param2 中获取
                'custscript_advance_json': adData,
            };

            var taskId = mrTask.submit();

            log.audit('taskId',taskId);
            return taskId;
        }

        return {onRequest}

    });
