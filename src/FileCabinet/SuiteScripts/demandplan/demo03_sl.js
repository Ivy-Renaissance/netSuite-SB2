/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/email', 'N/runtime', 'N/ui/serverWidget','N/search'],

    (email, runtime, serverWidget, search) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            log.debug('scriptContext', scriptContext)
            log.debug('scriptContext.request', scriptContext.request)

            var sub_info = search.lookupFields({ type: 'subsidiary', id: '77', columns: ['representingvendor'] });
            log.audit('sub_info', sub_info);
            var representingvendor = sub_info['representingvendor'][0].value;
            log.audit('representingvendor', representingvendor);
            
            return
            if (scriptContext.request.method === 'GET') {
                let form = serverWidget.createForm({
                    title: 'Simple Form'
                });

                let field = form.addField({
                    id: 'textfield',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Text'
                });
                field.layoutType = serverWidget.FieldLayoutType.NORMAL;
                field.updateBreakType({
                    breakType: serverWidget.FieldBreakType.STARTCOL
                });

                form.addField({
                    id: 'datefield',
                    type: serverWidget.FieldType.DATE,
                    label: 'Date'
                });
                form.addField({
                    id: 'currencyfield',
                    type: serverWidget.FieldType.CURRENCY,
                    label: 'Currency'
                });

                let select = form.addField({
                    id: 'selectfield',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Select'
                });
                select.addSelectOption({
                    value: 'a',
                    text: 'Albert'
                });
                select.addSelectOption({
                    value: 'b',
                    text: 'Baron'
                });

                let sublist = form.addSublist({
                    id: 'sublist',
                    type: serverWidget.SublistType.INLINEEDITOR,
                    label: 'Inline Editor Sublist'
                });
                sublist.addField({
                    id: 'sublist1',
                    type: serverWidget.FieldType.DATE,
                    label: 'Date'
                });
                sublist.addField({
                    id: 'sublist2',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Text'
                });

                form.addSubmitButton({
                    label: 'Submit Button'
                });

                scriptContext.response.writePage(form);
            } else {
                const delimiter = /\u0001/;
                const textField = scriptContext.request.parameters.textfield;
                const dateField = scriptContext.request.parameters.datefield;
                const currencyField = scriptContext.request.parameters.currencyfield;
                const selectField = scriptContext.request.parameters.selectfield;
                const sublistData = scriptContext.request.parameters.sublistdata.split(delimiter);
                const sublistField1 = sublistData[0];
                const sublistField2 = sublistData[1];

                scriptContext.response.write(`You have entered: ${textField} ${dateField} ${currencyField} ${selectField} ${sublistField1} ${sublistField2}`);
            }
        }

        return { onRequest }

    });