/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', '../common/interface', 'N/runtime'], function (search, record, interface, runtime) {

    function getInputData() {
        try {
            var need_data = getNeedData();
            log.debug('need_data', need_data);
            log.debug('need_data.length', need_data.length);
            return need_data;
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getNeedData() {
        var list = [];
        var developer_id = runtime.getCurrentScript().getParameter({ name: 'custscript_swc_jj_interface_info' });
        var auth = interface.JJDeveloperAccountAuth(developer_id);
        log.debug('auth', auth);
        var path = '/purchase/store/multiTypeWarehouse/page';
        var need_body = {
            'model': {},
            'page': 1,
            'pagesize': 100
        };
        var response_body = interface.JJHttpsResponse('post', path, auth, need_body);
        log.debug('response_body', response_body);
        if (response_body.code == '200') {
            var loc_data = response_body.data.rows;
            log.debug('loc_data', loc_data);
            if (loc_data.length > 0) {
                for (var i = 0; i < loc_data.length; i++) {
                    if (loc_data[i].spwCode) {
                        list.push({
                            loc_id: loc_data[i].id,
                            loc_code: loc_data[i].spwCode,
                            loc_name: loc_data[i].name,
                            service_provider: loc_data[i].serviceProviderVO.spName
                        });
                    }
                }
            }
        } else {
            log.debug('error', '仓库列表获取失败');
        }
        return list;
    }

    function map(context) {
        try {
            var value = JSON.parse(context.value);
            log.debug('value', value);
            var loc_id = value.loc_id, loc_code = value.loc_code, loc_name = value.loc_name, service_provider = value.service_provider;
            //查询是否已经存在，存在进行更新
            var overseas_arehouse_id = getOverseasArehouseId(loc_code);
            var overseas_arehouse_info;
            if (overseas_arehouse_id) {
                overseas_arehouse_info = record.load({ type: 'customrecord_swc_overseas_arehouse_code', id: overseas_arehouse_id, isDynamic: true });
            } else {
                overseas_arehouse_info = record.create({ type: 'customrecord_swc_overseas_arehouse_code', isDynamic: true });
                overseas_arehouse_info.setValue('name', loc_code);
            }
            overseas_arehouse_info.setValue('custrecord_swc_loc_id', loc_id);
            overseas_arehouse_info.setValue('custrecord_swc_jj_loc_name', loc_name);
            overseas_arehouse_info.setText('custrecord_swc_service_provider', service_provider);
            var rec_id = overseas_arehouse_info.save({ ignoremandatoryfields: true });
            if (rec_id) {
                log.debug('success', '创建/更新积加仓库代码列表成功');
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    function getOverseasArehouseId(loc_code) {
        var rec_id;
        search.create({
            type: 'customrecord_swc_overseas_arehouse_code',
            filters: [
                ['name', 'is', loc_code],
                'AND',
                ['isinactive', 'is', false]
            ]
        }).run().each(function (rec) {
            rec_id = rec.id;
        });
        return rec_id;
    }

    function reduce(context) {

    }

    function summarize(summary) {
        log.debug('summary', summary);
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
