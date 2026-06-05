/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/runtime', 'N/error', 'N/search', '../common/SWC_CONFIG_DATA'], function (runtime, error, search, SWC_CONFIG_DATA) {
    var CONFIG = SWC_CONFIG_DATA.configData();

    function beforeLoad(context) {
        try {
            var newRecord = context.newRecord, form = context.form;
            form.clientScriptModulePath = CONFIG.CLIENT_SCRIPT_PATH_ESTIMATED_CABINET;
            if (context.type == 'view') {
                var recordId = newRecord.id;
                var customrecord_swc_estimated_cabine_detailSearchObj = search.create({
                    type: "customrecord_swc_estimated_cabine_detail",
                    filters:
                        [
                            ["custrecord_swc_ecd_estimated_cabinet","anyof",recordId]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "custrecord_swc_ecd_quantity",
                                summary: "SUM",
                                label: "本次预排柜数量"
                            }),
                            search.createColumn({
                                name: "custrecord_swc_ecd_zs_qty",
                                summary: "SUM",
                                label: "真实排柜数量"
                            })
                        ]
                });

                var searchObj = getAllResults(customrecord_swc_estimated_cabine_detailSearchObj);
                if(searchObj && searchObj.length > 0){
                    var yg = searchObj[0].getValue({
                        name: "custrecord_swc_ecd_quantity",
                        summary: "SUM",
                        label: "本次预排柜数量"
                    });

                    var zs = searchObj[0].getValue({
                        name: "custrecord_swc_ecd_zs_qty",
                        summary: "SUM",
                        label: "真实排柜数量"
                    });

                    if(Number(yg) - Number(zs) > 0) {
                        form.addButton({
                            id: 'custpage_to_actual_cabinet',
                            label: '生成排柜单',
                            functionName: 'toActualCabinet()',
                        });
                    }
                }
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

function getAllResults(srch) {
    var results = srch.run();
    var searchResults = [];
    var searchid = 0;
    do {
        var resultslice = results.getRange({
            start: searchid,
            end: searchid + 1000
        });
        resultslice.forEach(function (slice) {
            searchResults.push(slice);
            searchid++;
        });

    } while (resultslice.length >= 1000);
    return searchResults;
}

    return {
        beforeLoad: beforeLoad,
    }
});
