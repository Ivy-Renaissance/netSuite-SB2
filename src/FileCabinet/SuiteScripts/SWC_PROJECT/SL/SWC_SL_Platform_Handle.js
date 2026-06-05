/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/search", "../common/SWC_Utils.js"],
    
    (search, SWC_Utils) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            var responseJson = {};
            try {
                var request = scriptContext.request;
                var response = scriptContext.response;
                var actionType = request.parameters.actionType;
                var optionsStr = request.parameters.options;
                var options = {};
                var method = request.method;
                if (method == "GET"){
                    if (!SWC_Utils.isEmpty(optionsStr)) options = JSON.parse(optionsStr);
                }else {
                    var bodyJson = JSON.parse(decodeURIComponent(request.body));
                    actionType = bodyJson.actionType;
                    options = bodyJson.options;
                }
                log.audit("parameters", JSON.stringify({actionType, options}));
                if (actionType == "getEntityOptions") responseJson = getEntityOptions(options);
                log.audit(actionType + " :responseJson", JSON.stringify(responseJson));
            }catch (e) {
                responseJson = e;
            }
            response.write(JSON.stringify(responseJson));
        }

        /**
         * 根据 所选的子公司 获取 供应商字段的 下拉选项
         * @param options
         * @returns {[{text: string, value: string}]}
         */
        function getEntityOptions(options){
            let subsidiary = options.subsidiary;
            let filters = [
                ["vendor.isinactive", "is", "F"]
            ];
            if (subsidiary) {
                filters.push("AND", ["subsidiary", "anyof", subsidiary]);
            }
            var vendorSearchObj = search.create({
                type: "vendorsubsidiaryrelationship",
                filters: filters,
                columns:
                    [
                        search.createColumn({name: "internalid", join: "vendor", label: "内部ID"}),
                        search.createColumn({name: "entityid", join: "vendor", label: "ID"}),
                        // search.createColumn({name: "altname", join: "vendor", label: "名称"})
                    ]
            });
            var results = SWC_Utils.getAllResults(vendorSearchObj);
            var entityOptions = [];
            if (results.length > 0) {
                for (let i = 0; i < results.length; i++) {
                    let id = results[i].getValue({name: "internalid", join: "vendor"});
                    let entityId = results[i].getValue({name: "entityid", join: "vendor"});
                    // let altName = results[i].getValue({name: "altname", join: "vendor"});
                    entityOptions.push({
                        value: id,
                        // text: `${entityId} ${altName}`
                        text: `${entityId}`
                    });
                }
            }
            return entityOptions;
        }

        return {onRequest}

    });
