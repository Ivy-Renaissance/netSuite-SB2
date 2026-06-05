/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            try {
                if (scriptContext.type != 'delete') {
                    var curRec = scriptContext.newRecord;
                    var rec = record.load({
                        type: curRec.type,
                        id: curRec.id,
                        isDynamic: true
                    });
                    //货品SKU
                    var item = rec.getValue({ fieldId: 'custrecord_swc_item' });
                    if (item) {
                        var item_data = search.lookupFields({ type: 'item', id: item, columns: ['displayname'] });
                        rec.setValue({
                            fieldId: 'custrecord_swc_item_description',
                            value: item_data.displayname
                        });
                    }


                    //非USD
                    var tax_code1 = rec.getValue({ fieldId: 'custrecord_swc_tax_code' });
                    log.debug('tax_code1', tax_code1);
                    if (tax_code1) {
                        var tax_rate = getTaxRate(tax_code1);

                        var unit_price1 = rec.getValue({ fieldId: 'custrecord_swc_premium_unit_price' }) || 0;
                        var excluding_tax_amt1 = unit_price1 / (1 + Number(tax_rate));
                        log.debug('excluding_tax_amt1', excluding_tax_amt1);
                        rec.setValue({ fieldId: 'custrecord_swc_premium_excluding_tax', value: excluding_tax_amt1.toFixed(8) });

                        var unit_price2 = rec.getValue({ fieldId: 'custrecord_swc_good_unit_price' }) || 0;
                        var excluding_tax_amt2 = unit_price2 / (1 + Number(tax_rate));
                        log.debug('excluding_tax_amt2', excluding_tax_amt2);
                        rec.setValue({ fieldId: 'custrecord_swc_good_excluding_tax', value: excluding_tax_amt2.toFixed(8) });

                    }

                    //USD
                    var tax_code2 = rec.getValue({ fieldId: 'custrecord_swc_tax_code_usd' });
                    log.debug('tax_code2', tax_code2);
                    if (tax_code2) {
                        var tax_rate2 = getTaxRate(tax_code2);

                        var unit_price3 = rec.getValue({ fieldId: 'custrecord_swc_premium_unit_price_usd' }) || 0;
                        var excluding_tax_amt3 = unit_price3 / (1 + Number(tax_rate2));
                        log.debug('excluding_tax_amt3', excluding_tax_amt3);
                        rec.setValue({ fieldId: 'custrecord_swc_premium_excluding_tax_usd', value: excluding_tax_amt3.toFixed(8) });


                        var unit_price4 = rec.getValue({ fieldId: 'custrecord_swc_good_unit_price_usd' }) || 0;
                        var excluding_tax_amt4 = unit_price4 / (1 + Number(tax_rate2));
                        log.debug('excluding_tax_amt4', excluding_tax_amt4);
                        rec.setValue({ fieldId: 'custrecord_swc_good_excluding_tax_usd', value: excluding_tax_amt4.toFixed(8) });

                    }

                    rec.save();
                }
            } catch (e) {
                log.debug('e', e);
            }
        }

        function getTaxRate(tax_code) {
            var tax_rate = 0;
            if (tax_code) {
                search.create({
                    type: 'salestaxitem',
                    filters: [
                        ['internalid', 'anyof', tax_code],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        'rate'
                    ]
                }).run().each(function (result) {
                    tax_rate = result.getValue(result.columns[0]) ? result.getValue(result.columns[0]).replace('%', '') / 100 : 0;
                    return false;
                });
            }
            return tax_rate;
        }

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
