/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * 贸易条款 V2 入口脚本
 */
define(['N/search', 'N/log', 'N/record', '../common/SWC_CONFIG_DATA'], function (search, log, record, SWC_CONFIG_DATA) {
    var CONFIG = SWC_CONFIG_DATA.configData();

    const CLIENT_SCRIPT_PATH = CONFIG.CLIENT_SCRIPT_PATH_ESTIMATED_CABINET;
    const RECORD_TYPE_TRADE_CONFIG = CONFIG.RECORD_TYPE_TRADE_TERMS_CONFIG;
    const CONFIG_SUBLIST_ID = CONFIG.SUBLIST_ID_TRADE_TERMS_CONFIG;
    const FIELD_CURRENT_STEP = 'custrecord_swc_wl_mytk_zx_no';
    const FIELD_WL_PLAN_STATUS = 'custrecord_swc_wl_plan_status';
    const FIELD_TK_STATUS = 'custrecord_swc_wl_tk_status';
    const FIELD_MD_LOCATION = 'custrecord_swc_md_location';
    const FIELD_TRANSFER_WAY = 'custrecord_swc_wl_trasfer_way';
    const FIELD_CG_MAIN_ORDER_NUMBER = 'custrecord_swc_cg_main_order_number';
    const DETAIL_SUBLIST_ID = 'recmachcustrecord_swc_wl_plan_order_id';
    const FIELD_TERMS_OF_TRADE = 'custrecord_swc_wl_terms_of_trade';
    const FIELD_DESTINATION_COUNTRY = 'custrecord_swc_wl_county_lsit';
    const FIELD_PURCHASING_ENTITY = 'custrecord_swc_wl_po_zt';
    const FIELD_DETAIL_STORE = 'custrecord_swc_wl_d_customer';
    const FIELD_DETAIL_WAREHOUSE_TYPE = 'custrecord_swc_wl_d_location_type';
    const BUTTON_ID_PREFIX = 'custpage_swc_trade_terms_v2_btn_';
    const BUTTON_LABEL_SUFFIX = '-测试用，请勿点击';
    const ROUTE_BRANCH_V2 = 'v2';
    const ROUTE_BRANCH_CG = 'cg';
    const FIELD_ERROR_MESSAGE = 'custrecord_my_tk_error_message';

    const ROUTE_CONFIG = CONFIG.TRADE_TERMS_ROUTE_CONFIG;

    function beforeLoad(context) {
        if (!context.form || !context.newRecord) return;
        if (context.type !== context.UserEventType.VIEW && context.type !== context.UserEventType.EDIT) return;

        const form = context.form;
        const rec = context.newRecord;
        const recId = rec.id || '';
        if (!recId) return;

        try {
            // view 场景下 newRecord 的子列表数据可能不完整，这里统一重新 load 正式记录。
            const sourceRec = getSourceRecord(rec);
            const stepContext = buildCurrentStepContext(sourceRec);
            injectClientContext(form, stepContext);

            if (!stepContext || !stepContext.hasMatchedConfig || !stepContext.currentStepRows.length) {
                return;
            }

            if (stepContext.mode === 'manual' && stepContext.buttonLabel && shouldShowManualButton(stepContext)) {
                form.addButton({
                    id: BUTTON_ID_PREFIX + stepContext.currentStep,
                    // label: stepContext.buttonLabel + BUTTON_LABEL_SUFFIX,
                    label: stepContext.buttonLabel,
                    functionName: 'triggerTradeTermsV2Button'
                });
            } else if (stepContext.mode === 'auto') {
                injectAutoExecute(form);
            }
        } catch (e) {
            log.error('SWC_UE_TRADE_TERMS_V2 beforeLoad error', e);
        }
    }

    function buildCurrentStepContext(rec) {
        const recId = rec.id || '';
        const termsOfTrade = rec.getValue({ fieldId: FIELD_TERMS_OF_TRADE }) || '';
        const destinationCountry = mapDestinationCountryType(rec);
        const purchasingEntity = rec.getValue({ fieldId: FIELD_PURCHASING_ENTITY }) || '';
        const currentStep = normalizeExecutionOrder(rec.getValue({ fieldId: FIELD_CURRENT_STEP }) || '1');
        const routeBranch = rec.getValue({ fieldId: FIELD_CG_MAIN_ORDER_NUMBER }) ? ROUTE_BRANCH_CG : ROUTE_BRANCH_V2;
        const wlPlanStatus = String(rec.getValue({ fieldId: FIELD_WL_PLAN_STATUS }) || '0');
        const tkStatus = String(rec.getValue({ fieldId: FIELD_TK_STATUS }) || '');
        const mdLocation = String(rec.getValue({ fieldId: FIELD_MD_LOCATION }) || '');
        const transferWay = String(rec.getValue({ fieldId: FIELD_TRANSFER_WAY }) || '');
        const detailInfo = getDetailMatchInfo(rec);
        const storeIds = detailInfo.storeIds;
        const warehouseType = detailInfo.warehouseType;
        const errorMag = rec.getValue({ fieldId: FIELD_ERROR_MESSAGE });
        var queryFiltersSnapshot = [
            ['isinactive', 'is', 'F'],
            'AND',
            ['custrecord_swc_jy_trade_terms', 'anyof', termsOfTrade],
            'AND',
            ['custrecord_swc_destination_country', 'anyof', destinationCountry],
            'AND',
            ['custrecord_swc_purchasing_entity', 'anyof', purchasingEntity],
            'AND',
            ['custrecord_swc_store_entity', 'anyof', storeIds],
            'AND',
            ['custrecord_swcwarehouse_type', 'anyof', warehouseType]
        ];

        // 五个匹配维度里任意一项缺失，都直接视为当前步骤无法匹配配置。
        if (!termsOfTrade || !destinationCountry || !purchasingEntity || !warehouseType || !storeIds.length) {
            writeTradeTermsConfigMatchLog({
                recId: recId,
                recordType: rec.type || '',
                currentStep: currentStep,
                termsOfTrade: termsOfTrade,
                destinationCountry: destinationCountry,
                purchasingEntity: purchasingEntity,
                warehouseType: warehouseType,
                storeIds: storeIds || [],
                queryFilters: queryFiltersSnapshot,
                matchedConfigIds: [],
                matchedConfigNames: [],
                currentStepRows: [],
                hitMainConfig: false,
                hitCurrentStepConfig: false,
                reason: '主表匹配维度存在空值，未执行配置表检索'
            });
            return {
                recId: String(recId),
                currentStep,
                hasMatchedConfig: false,
                currentStepRows: [],
                mode: '',
                buttonLabel: '',
                flowType: '',
                routeBranch: routeBranch,
                routeConfig: ROUTE_CONFIG,
                selectedRoute: {},
                wlPlanStatus: wlPlanStatus,
                tkStatus: tkStatus,
                mdLocation: mdLocation,
                transferWay: transferWay,
                termsOfTrade: String(termsOfTrade || ''),
                destinationCountry: String(destinationCountry || ''),
                purchasingEntity: String(purchasingEntity || ''),
                warehouseType: String(warehouseType || ''),
                storeIds: storeIds
            };
        }
        const configSearch = search.create({
            type: RECORD_TYPE_TRADE_CONFIG,
            filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                ['custrecord_swc_jy_trade_terms', 'anyof', termsOfTrade],
                'AND',
                ['custrecord_swc_destination_country', 'anyof', destinationCountry],
                'AND',
                ['custrecord_swc_purchasing_entity', 'anyof', purchasingEntity],
                'AND',
                ['custrecord_swc_store_entity', 'anyof', storeIds],
                'AND',
                ['custrecord_swcwarehouse_type', 'anyof', warehouseType]
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'name' })
            ]
        });

        const configInfoList = [];
        configSearch.run().each(function (result) {
            const configId = result.getValue({ name: 'internalid' });
            if (!configId) return true;

            configInfoList.push({
                id: String(configId),
                name: String(result.getValue({ name: 'name' }) || '')
            });
            return true;
        });
        // 一个配置头下可能有多条执行顺序，这里只保留“当前步骤号”对应的子行。
        const currentStepRows = getCurrentStepRows(configInfoList, currentStep);
        writeTradeTermsConfigMatchLog({
            recId: recId,
            recordType: rec.type || '',
            currentStep: currentStep,
            termsOfTrade: termsOfTrade,
            destinationCountry: destinationCountry,
            purchasingEntity: purchasingEntity,
            warehouseType: warehouseType,
            storeIds: storeIds || [],
            queryFilters: queryFiltersSnapshot,
            matchedConfigIds: configInfoList.map(function (item) { return String(item.id || ''); }),
            matchedConfigNames: configInfoList.map(function (item) { return String(item.name || ''); }),
            currentStepRows: currentStepRows,
            hitMainConfig: configInfoList.length > 0,
            hitCurrentStepConfig: currentStepRows.length > 0,
            reason: configInfoList.length === 0
                ? '未命中贸易条款配置主表'
                : (currentStepRows.length === 0 ? '已命中主表，但当前步骤未命中配置子表' : '已命中主表和当前步骤配置子表')
        });

        const firstRow = currentStepRows[0] || {};
        const selectedFlowType = String(firstRow.flowType || '');
        const selectedRoute = getSelectedRoute(routeBranch, selectedFlowType);

        return {
            recId: String(recId),
            currentStep: currentStep,
            hasMatchedConfig: configInfoList.length > 0,
            matchedConfigIds: configInfoList.map(function (item) { return item.id; }),
            currentStepRows: currentStepRows,
            mode: !firstRow.isAuto ? 'manual' : errorMag ? 'manual' : 'auto',
            buttonLabel: String(firstRow.buttonText || ''),
            flowType: selectedFlowType,
            routeBranch: routeBranch,
            routeConfig: ROUTE_CONFIG,
            selectedRoute: selectedRoute,
            wlPlanStatus: wlPlanStatus,
            tkStatus: tkStatus,
            mdLocation: mdLocation,
            transferWay: transferWay,
            configId: String(firstRow.configId || ''),
            configName: String(firstRow.configName || ''),
            buttonId: String(firstRow.buttonId || ''),
            buttonText: String(firstRow.buttonText || ''),
            documentTypeId: String(firstRow.documentTypeId || ''),
            documentTypeText: String(firstRow.documentTypeText || ''),
            startingWarehouseAttribute: String(firstRow.startingWarehouseAttribute || ''),
            warehouseAttribute: String(firstRow.warehouseAttribute || ''),
            termsOfTrade: String(termsOfTrade),
            destinationCountry: String(destinationCountry),
            purchasingEntity: String(purchasingEntity),
            warehouseType: String(warehouseType),
            storeIds: storeIds
        };
    }

    function writeTradeTermsConfigMatchLog(info) {
        info = info || {};
        log.audit('贸易条款配置命中检查', {
            物流发运单ID: String(info.recId || ''),
            记录类型: String(info.recordType || ''),
            配置表ScriptId: RECORD_TYPE_TRADE_CONFIG,
            当前步骤号: String(info.currentStep || ''),
            是否命中主表: info.hitMainConfig ? '是' : '否',
            是否命中当前步骤子表: info.hitCurrentStepConfig ? '是' : '否',
            原因说明: String(info.reason || ''),
            成交方式: String(info.termsOfTrade || ''),
            运抵国: String(info.destinationCountry || ''),
            采购主体: String(info.purchasingEntity || ''),
            仓库类型: String(info.warehouseType || ''),
            店铺子公司列表: info.storeIds || [],
            主表查询条件: info.queryFilters || [],
            命中的主表内部ID: info.matchedConfigIds || [],
            命中的主表名称: info.matchedConfigNames || [],
            命中的当前步骤子表: (info.currentStepRows || []).map(function (row) {
                row = row || {};
                return {
                    配置主表ID: String(row.configId || ''),
                    配置主表名称: String(row.configName || ''),
                    执行顺序: String(row.executionOrder || ''),
                    按钮ID: String(row.buttonId || ''),
                    按钮文本: String(row.buttonText || ''),
                    流程类型: String(row.flowType || ''),
                    是否自动执行: row.isAuto ? '是' : '否'
                };
            })
        });
    }

    function getSelectedRoute(routeBranch, flowType) {
        if (!ROUTE_CONFIG[routeBranch] || !ROUTE_CONFIG[routeBranch][flowType]) {
            return {};
        }
        return ROUTE_CONFIG[routeBranch][flowType];
    }

    function shouldShowManualButton(stepContext) {
        const buttonLabel = String(stepContext.buttonLabel || '');
        if (buttonLabel.indexOf('供应商') === -1) {
            return true;
        }
        return canShowSupplierShippedBtnV1(stepContext);
    }

    function canShowSupplierShippedBtnV1(stepContext) {
        const tkStatus = String(stepContext.tkStatus || '');
        const wlPlanStatus = String(stepContext.wlPlanStatus || '');
        const mdLocation = String(stepContext.mdLocation || '');
        const transferWay = String(stepContext.transferWay || '');
        const skipFirstLegButtonFlow = mdLocation === '41'
            && transferWay !== '4'
            && transferWay !== '5';

        return tkStatus === ''
            && (wlPlanStatus === '10'
                || (skipFirstLegButtonFlow && (wlPlanStatus === '15' || wlPlanStatus === '10')));
    }

    function getDetailMatchInfo(rec) {
        const lineCount = rec.getLineCount({ sublistId: DETAIL_SUBLIST_ID }) || 0;
        const storeMap = {};
        const customerSubsidiaryCache = {};
        let warehouseType = '';

        for (let i = 0; i < lineCount; i++) {
            const storeId = rec.getSublistValue({
                sublistId: DETAIL_SUBLIST_ID,
                fieldId: FIELD_DETAIL_STORE,
                line: i
            }) || '';
            const locType = rec.getSublistValue({
                sublistId: DETAIL_SUBLIST_ID,
                fieldId: FIELD_DETAIL_WAREHOUSE_TYPE,
                line: i
            }) || '';

            if (storeId) {
                const storeSubId = getCustomerSubsidiary(storeId, customerSubsidiaryCache);
                if (storeSubId) {
                    storeMap[String(storeSubId)] = true;
                }
            }

            // 当前业务前提是“仓库类型只会有一个”，所以取第一条非空值即可。
            if (!warehouseType && locType) {
                warehouseType = String(locType);
            }
        }

        return {
            storeIds: Object.keys(storeMap),
            warehouseType: warehouseType
        };
    }

    function getCurrentStepRows(configInfoList, currentStep) {
        const currentStepRows = [];

        for (let i = 0; i < configInfoList.length; i++) {
            const configRec = record.load({
                type: RECORD_TYPE_TRADE_CONFIG,
                id: configInfoList[i].id,
                isDynamic: false
            });
            const shopSubId = configRec.getValue('custrecord_swc_store_entity');
            const subCount = configRec.getLineCount({ sublistId: CONFIG_SUBLIST_ID }) || 0;

            for (let line = 0; line < subCount; line++) {
                const executionOrder = normalizeExecutionOrder(configRec.getSublistValue({
                    sublistId: CONFIG_SUBLIST_ID,
                    fieldId: 'custrecord_swc_execution_order',
                    line: line
                }) || '');
                if (executionOrder !== currentStep) continue;

                const buttonId = configRec.getSublistValue({
                    sublistId: CONFIG_SUBLIST_ID,
                    fieldId: 'custrecord_swc_button',
                    line: line
                }) || '';
                const buttonText = configRec.getSublistText({
                    sublistId: CONFIG_SUBLIST_ID,
                    fieldId: 'custrecord_swc_button',
                    line: line
                }) || '';
                const documentTypeId = configRec.getSublistValue({
                    sublistId: CONFIG_SUBLIST_ID,
                    fieldId: 'custrecord_swc_jy_document_type',
                    line: line
                }) || '';
                const documentTypeText = configRec.getSublistText({
                    sublistId: CONFIG_SUBLIST_ID,
                    fieldId: 'custrecord_swc_jy_document_type',
                    line: line
                }) || '';
                const startingWarehouseAttribute = configRec.getSublistValue({
                    sublistId: CONFIG_SUBLIST_ID,
                    fieldId: 'custrecord_swc_starting_warehouse_ttrib',
                    line: line
                }) || '';
                const warehouseAttribute = configRec.getSublistValue({
                    sublistId: CONFIG_SUBLIST_ID,
                    fieldId: 'custrecord_swc_warehouse_attributes',
                    line: line
                }) || '';
                const isAuto = configRec.getSublistValue({
                    sublistId: CONFIG_SUBLIST_ID,
                    fieldId: 'custrecord_swc_is_auto',
                    line: line
                });
                const generatedAccording = configRec.getSublistValue({
                    sublistId: CONFIG_SUBLIST_ID,
                    fieldId: 'custrecord_swc_generated_according',
                    line: line
                });
                const startSubId = configRec.getSublistValue({
                    sublistId: CONFIG_SUBLIST_ID,
                    fieldId: 'custrecord_swc_purchase_order_subsidiary',
                    line: line
                }) || '';
                const startSubName = configRec.getSublistText({
                    sublistId: CONFIG_SUBLIST_ID,
                    fieldId: 'custrecord_swc_purchase_order_subsidiary',
                    line: line
                }) || '';
                const targetSubId = configRec.getSublistValue({
                    sublistId: CONFIG_SUBLIST_ID,
                    fieldId: 'custrecord_swc_target_company',
                    line: line
                }) || '';
                const targetSubName = configRec.getSublistText({
                    sublistId: CONFIG_SUBLIST_ID,
                    fieldId: 'custrecord_swc_target_company',
                    line: line
                }) || '';
                const price_factor = configRec.getSublistText({
                    sublistId: CONFIG_SUBLIST_ID,
                    fieldId: 'custrecord_swc_jy_price_factor',
                    line: line
                }) || 0;

                if (!generatedAccording) {//判断根据报告生成的执行顺序不需要处理
                    currentStepRows.push({
                        configId: configInfoList[i].id,
                        configName: configInfoList[i].name,
                        executionOrder: executionOrder,
                        buttonId: String(buttonId || ''),
                        buttonText: String(buttonText || ''),
                        documentTypeId: String(documentTypeId || ''),
                        documentTypeText: String(documentTypeText || ''),
                        startingWarehouseAttribute: String(startingWarehouseAttribute || ''),
                        warehouseAttribute: String(warehouseAttribute || ''),
                        flowType: resolveFlowType(documentTypeText),
                        isAuto: isAuto,
                        startSubId: startSubId,
                        startSubName: startSubName,
                        targetSubId: targetSubId,
                        targetSubName: targetSubName,
                        shopSubId: shopSubId,
                        price_factor: price_factor ? price_factor.replace('%', '') / 100 : 0
                    });
                }
            }
        }

        return currentStepRows;
    }

    function getSourceRecord(rec) {
        if (!rec || !rec.id) return rec;
        try {
            return record.load({
                type: rec.type,
                id: rec.id,
                isDynamic: false
            });
        } catch (e) {
            log.error('getSourceRecord error', {
                recordType: rec.type,
                recordId: rec.id,
                error: e
            });
            return rec;
        }
    }

    function resolveFlowType(documentTypeText) {
        const text = String(documentTypeText || '');
        if (text.indexOf('公司间交易') !== -1) return 'intercompany';
        if (text.indexOf('转移单') !== -1) return 'transfer';
        return '';
    }

    function normalizeExecutionOrder(value) {
        const text = String(value || '').replace(/\s+/g, '').trim();
        if (!text) return '';
        const numberText = text.match(/\d+/);
        return numberText && numberText[0] ? String(parseInt(numberText[0], 10)) : text;
    }

    function mapDestinationCountryType(rec) {
        // 配置表不是直接存国家，而是“美国/非美国”两类枚举值。
        const countryText = String(rec.getText({ fieldId: FIELD_DESTINATION_COUNTRY }) || '');
        if (!countryText) return '';
        return countryText.indexOf('美国') !== -1 ? '1' : '2';
    }

    function getCustomerSubsidiary(customerId, cache) {
        const key = String(customerId || '');
        if (!key) return '';
        cache = cache || {};
        if (Object.prototype.hasOwnProperty.call(cache, key)) {
            return cache[key];
        }

        let subsidiaryId = '';
        try {
            const customerInfo = search.lookupFields({
                type: 'customer',
                id: customerId,
                columns: ['subsidiary']
            }) || {};

            if (customerInfo.subsidiary && customerInfo.subsidiary[0] && customerInfo.subsidiary[0].value) {
                subsidiaryId = String(customerInfo.subsidiary[0].value);
            }
        } catch (e) {
            log.error('getCustomerSubsidiary error', { customerId: customerId, error: e });
        }

        cache[key] = subsidiaryId;
        return subsidiaryId;
    }

    function injectClientContext(form, stepContext) {
        const field = form.addField({
            id: 'custpage_swc_trade_terms_v2_ctx',
            type: 'inlinehtml',
            label: ' '
        });

        const payload = JSON.stringify(stepContext || {}).replace(/<\//g, '<\\/');
        field.defaultValue =
            '<script>' +
            'window.SWC_TRADE_TERMS_V2_CONTEXT=' + payload + ';' +
            'window.triggerTradeTermsV2Button=function(){' +
            'try{' +
            'require(["' + CLIENT_SCRIPT_PATH + '"], function(mod){' +
            'if(mod && mod.triggerTradeTermsV2Button){mod.triggerTradeTermsV2Button();}' +
            '});' +
            '}catch(e){console.log(e);}' +
            '};' +
            'window.autoExecuteTradeTermsV2=function(){' +
            'try{' +
            'require(["' + CLIENT_SCRIPT_PATH + '"], function(mod){' +
            'if(mod && mod.autoExecuteTradeTermsV2){mod.autoExecuteTradeTermsV2();}' +
            '});' +
            '}catch(e){console.log(e);}' +
            '};' +
            '</script>';
    }

    function injectAutoExecute(form) {
        const field = form.addField({
            id: 'custpage_swc_trade_terms_v2_auto',
            type: 'inlinehtml',
            label: ' '
        });

        // 无按钮步骤在页面加载后自动调用客户端方法，继续往 Suitelet / MR 路由。
        field.defaultValue =
            '<script>' +
            'setTimeout(function(){' +
            'try{' +
            'require(["' + CLIENT_SCRIPT_PATH + '"], function(mod){' +
            'if(mod && mod.autoExecuteTradeTermsV2){ mod.autoExecuteTradeTermsV2(); }' +
            '});' +
            '}catch(e){}' +
            '},600);' +
            '</script>';
    }

    return {
        beforeLoad: beforeLoad
    };
});
