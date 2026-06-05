/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */

define([], function () {

    function fieldChanged(context) {

        var record = context.currentRecord;

        var fieldId = context.fieldId;

        if (
            fieldId !== 'custrecord_swc_st_map' &&
            fieldId !== 'custrecord_swc_st_bcp'
        ) {
            return;
        }

        var map = Number(record.getValue({
            fieldId: 'custrecord_swc_st_map'
        }));

        var bcp = Number(record.getValue({
            fieldId: 'custrecord_swc_st_bcp'
        })) || 0;

        var imu = 0;

        if (map && map !== 0) {

            imu = (map - bcp) / map * 100;

        }

        record.setValue({
            fieldId: 'custrecord_swc_st_imu',
            value: Number(imu.toFixed(2))
        });

    }

    return {

        fieldChanged: fieldChanged

    };

});