/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["require", "exports", "N/search", "N/record", "N/render", "N/file", "N/log", "N/https", "N/ui/serverWidget"],

    (require, exports, search, record, render, file, log, https, ui) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        function onRequest (ctx) {
            try {
                log.debug('params', ctx.request.parameters.sku_code)
                const TEMPLATE_FILE_ID = 3346;
                const sku_code = ctx.request.parameters.sku_code.split(',')
                let templateContent = file.load({ id: TEMPLATE_FILE_ID }).getContents();
                log.debug('templateContent', templateContent)
                var renderer = render.create();
                renderer.templateContent = templateContent;

                let contents_1 = [];
                contents_1.push("<?xml version=\"1.0\"?>")
                contents_1.push("<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">")
                contents_1.push("<pdfset>")
                for (const sku_item of sku_code) {
                    renderer.addCustomDataSource({
                        alias: 'params',
                        format: render.DataSource.OBJECT,
                        data: {
                            labelValue: sku_item,
                        }
                    });
                    contents_1.push(renderer.renderAsString())
                }
                contents_1.push("</pdfset>");
                ctx.response.writeFile({ file: render.xmlToPdf({ xmlString: contents_1.join('') }), isInline: true });
                log.debug('params', '执行完成')
            } catch (e) {
                log.debug('e', e);
            }
        }

        return {
            onRequest
        }
    });
