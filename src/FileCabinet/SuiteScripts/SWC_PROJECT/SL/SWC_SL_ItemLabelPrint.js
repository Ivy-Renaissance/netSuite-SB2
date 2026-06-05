/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/render', 'N/file', 'N/log', 'N/record', 'N/runtime', '../common/SWC_Utils.js'],
    (serverWidget, search, render, file, log, record, runtime, SWC_Utils) => {
        const onRequest = (scriptContext) => {
            const { request, response } = scriptContext;

            if (request.method === 'GET') {
                const action = request.parameters.action;
                if (action === 'getItems') {
                    // API to get items for the selection list
                    getItems(request, response);
                    return;
                }
                // Default action: show UI
                showUI(request, response);
            } else {
                // POST: Generate PDF
                generatePDF(request, response);
            }
        };

        const showUI = (request, response) => {
            const form = serverWidget.createForm({ title: '货品标签打印系统' });
            const htmlField = form.addField({
                id: 'custpage_html_content',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'HTML Content'
            });

            // Load the HTML UI template
            try {
                const uiTemplate = file.load({ id: '/SuiteScripts/SWC_PROJECT/HTML/SWC_ItemLabelPrint_UI.html' });
                let htmlContent = uiTemplate.getContents();
                
                // Replace placeholders if any (e.g., suitelet URL)
                const suiteletUrl = runtime.getCurrentScript().id; // or use N/url
                // htmlContent = htmlContent.replace('{{SUITELET_URL}}', suiteletUrl);

                htmlField.defaultValue = htmlContent;
            } catch (e) {
                log.error('Error loading UI template', e);
                htmlField.defaultValue = '<h1>无法加载界面模板，请检查文件路径。</h1><p>' + e.message + '</p>';
            }

            response.writePage(form);
        };

        const getItems = (request, response) => {
            const filters = [
                ['isinactive', 'is', 'F']
            ];
            
            const searchParam = request.parameters.search;
            if (searchParam) {
                filters.push('AND');
                filters.push([
                    ['itemid', 'contains', searchParam], 'OR', 
                    ['displayname', 'contains', searchParam]
                ]);
            }

            const itemSearch = search.create({
                type: 'item',
                filters: filters,
                columns: [
                    'itemid',
                    'displayname',
                    'salesdescription',
                    'baseprice',
                    'custitem_swc_sku_category' // Example custom field
                ]
            });

            const results = [];
            itemSearch.run().each((result) => {
                results.push({
                    id: result.id,
                    sku: result.getValue('itemid'),
                    name: result.getValue('displayname'),
                    description: result.getValue('salesdescription'),
                    price: result.getValue('baseprice'),
                    category: result.getText('custitem_swc_sku_category')
                });
                return results.length < 100; // Limit for performance
            });

            response.write(JSON.stringify(results));
        };

        const generatePDF = (request, response) => {
            let data;
            try {
                log.debug('generatePDF - raw body', request.body);
                data = JSON.parse(request.body);
            } catch (e) {
                log.error('JSON Parse Error', e.message + ' | Body: ' + request.body);
                response.write('数据解析失败，请重试。');
                return;
            }

            const selectedItems = data.items; // Array of item objects { sku, name, qty, etc. }
            const config = data.config; // Label configuration { width, height, barcodeType, showPrice, etc. }

            if (!selectedItems || selectedItems.length === 0) {
                response.write('请先选择要打印的货品。');
                return;
            }

            try {
                const pdfTemplateFile = file.load({ id: '/SuiteScripts/SWC_PROJECT/HTML/SWC_ItemLabel_PDF.xml' });
                let xmlStr = pdfTemplateFile.getContents();

                // Build the data for rendering
                const renderData = {
                    items: [],
                    config: config
                };

                selectedItems.forEach(item => {
                    const qty = parseInt(item.qty) || 1;
                    for (let i = 0; i < qty; i++) {
                        renderData.items.push(item);
                    }
                });

                // Use N/render with custom data source
                const renderer = render.create();
                renderer.templateContent = xmlStr;
                renderer.addCustomDataSource({
                    format: render.DataSource.OBJECT,
                    alias: 'data',
                    data: renderData
                });

                const pdfFile = renderer.renderAsPdf();
                response.writeFile(pdfFile, true);
            } catch (e) {
                log.error('Error generating PDF', e);
                response.write('PDF 生成失败: ' + e.message);
            }
        };

        return { onRequest };
    });
