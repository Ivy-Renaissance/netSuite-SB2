/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/currency', 'N/format', '../common/SWC_CONFIG_DATA'], function (search, record, currency, format, SWC_CONFIG_DATA) {
    var CONFIG = SWC_CONFIG_DATA.configData();
    var FEE_TYPE_RKF = String(CONFIG.FEE_TYPE_RKF || '');
    var FEE_TYPE_BXF = String(CONFIG.FEE_TYPE_BXF || '');
    var FEE_TYPE_JKGS = String(CONFIG.FEE_TYPE_JKGS || '');
    var FEE_TYPE_MDGQGF = String(CONFIG.FEE_TYPE_MDGQGF || '');
    var FEE_TYPE_GS = String(CONFIG.FEE_TYPE_GS || '');
    var FIRST_LEG_SUBLIST_ID = 'recmachcustrecord_swc_wl_first_leg_cost_id';
    var PLAN_DETAIL_SUBLIST_ID = 'recmachcustrecord_swc_wl_plan_order_id';
    var FIELD_FINANCE_CONFIRMED = 'custrecord_swc_finance_has_confirmed';
    var FIELD_FINANCE_REJECTED = 'custrecord_swc_finance_has_rejected';
    var FIELD_FIRST_LEG_ACTUAL_FEE = 'custrecord_swc_wl_flc_sj_fee';
    var FIELD_FIRST_LEG_ACTUAL_CURRENCY = 'custrecord_swc_wl_flc_sj_currency';
    var FIELD_FIRST_LEG_DIFF = 'custrecord_swc_wl_flc_sj_fee_cy';
    var FIELD_FIRST_LEG_BILL = 'custrecord_swc_wl_flc_sj_fee_bill';
    var FIELD_FIRST_LEG_FEE_TYPE_Z = 'custrecord_swc_flc_fee_type_z';
    var FIELD_FIRST_LEG_ALLOCATION_RULE = 'custrecord_swc_wl_flc_allocation_rules';
    var FIELD_FIRST_LEG_VENDOR = 'custrecord_swc_wl_flc_location';
    var FIELD_FIRST_LEG_PO_TYPE = 'custrecord_swc_wl_flc_po_type';
    var FIELD_FIRST_LEG_YG_FEE = 'custrecord_swc_wl_flc_yg_fee';
    var FIELD_FIRST_LEG_YG_CURRENCY = 'custrecord_swc_wl_flc_yg_currency';
    var FIELD_WL_TERMS_OF_TRADE = 'custrecord_swc_wl_terms_of_trade';
    var FIELD_WL_TOTAL_VOLUME = 'custrecord_swc_wl_total_volume';
    var FIELD_WL_PO_ZT = 'custrecord_swc_wl_po_zt';

    function beforeLoad(context) {
        try {
            var newRecord = context.newRecord;
            var form = context.form;

            form.clientScriptModulePath = CONFIG.CLIENT_SCRIPT_PATH_ESTIMATED_CABINET;

            // ===== 基础状态 =====
            var recordId = newRecord.id;

            // 物流发运单状态（先取当前值）
            var wlPlanStatus = newRecord.getValue({ fieldId: 'custrecord_swc_wl_plan_status' }) || '0';

            // 非活动
            var inactive = (newRecord.getValue({ fieldId: 'isinactive' }) === true
                || newRecord.getValue({ fieldId: 'isinactive' }) === 'T');

            // 采购杂费录入完成
            var cgZfCheck = newRecord.getValue({ fieldId: 'custrecord_swc_wl_cg_zf_check' }) === true
                || newRecord.getValue({ fieldId: 'custrecord_swc_wl_cg_zf_check' }) === 'T';

            // 真实头程录入完成
            var tcZfCheck = newRecord.getValue({ fieldId: 'custrecord_swc_wl_tc_zf_check' }) === true
                || newRecord.getValue({ fieldId: 'custrecord_swc_wl_tc_zf_check' }) === 'T';

            // 真实头程录入完成
            var wcZfCheck = newRecord.getValue({ fieldId: 'custrecord_swc_wl_wc_zf_check' }) === true
                || newRecord.getValue({ fieldId: 'custrecord_swc_wl_wc_zf_check' }) === 'T';

            // 头程分摊按钮
            var tcZfCheckBtn = newRecord.getValue({ fieldId: 'custrecord_swc_wl_tc_zf_check_btn' }) === true
                || newRecord.getValue({ fieldId: 'custrecord_swc_wl_tc_zf_check_btn' }) === 'T';

            var wcZfCheckBtn = newRecord.getValue({ fieldId: 'custrecord_swc_wl_wc_zf_check_btn' }) === true
                || newRecord.getValue({ fieldId: 'custrecord_swc_wl_wc_zf_check_btn' }) === 'T';


            var lc_number = newRecord.getValue({ fieldId: 'custrecord_swc_hw_lc_number' });
            var shipment_id = newRecord.getValue({ fieldId: 'custrecord_swc_shipment_id' });
            var cg_main_order_number = newRecord.getValue({ fieldId: 'custrecord_swc_cg_main_order_number' });
            var tk_status = newRecord.getValue({ fieldId: 'custrecord_swc_wl_tk_status' });
            var mdLocation = newRecord.getValue({ fieldId: 'custrecord_swc_md_location' });
            var transferWay = newRecord.getValue({ fieldId: 'custrecord_swc_wl_trasfer_way' });
            var wlApprovalStatus = String(newRecord.getValue({ fieldId: 'custrecord_swc_wl_approval_status' }) || '');

            var tot = newRecord.getValue({ fieldId: 'custrecord_swc_wl_terms_of_trade' });
            var skipFirstLegButtonFlow = String(mdLocation || '') === '41'
                && String(transferWay || '') !== '4'
                && String(transferWay || '') !== '5';
            var canShowSupplierShippedBtn = tk_status == ''
                && (String(wlPlanStatus) == '10'
                    || (skipFirstLegButtonFlow && String(wlPlanStatus) == '15'));

            log.audit('WL_PLAN_SUPPLIER_SHIPPED_BTN_CHECK', {
                contextType: context.type || '',
                recordId: recordId || '',
                wlPlanStatus: String(wlPlanStatus || ''),
                wlPlanStatusText: newRecord.getText({ fieldId: 'custrecord_swc_wl_plan_status' }) || '',
                tkStatus: String(tk_status || ''),
                tkStatusText: newRecord.getText({ fieldId: 'custrecord_swc_wl_tk_status' }) || '',
                mdLocation: String(mdLocation || ''),
                mdLocationText: newRecord.getText({ fieldId: 'custrecord_swc_md_location' }) || '',
                transferWay: String(transferWay || ''),
                transferWayText: newRecord.getText({ fieldId: 'custrecord_swc_wl_trasfer_way' }) || '',
                termsOfTrade: String(tot || ''),
                termsOfTradeText: newRecord.getText({ fieldId: 'custrecord_swc_wl_terms_of_trade' }) || '',
                cgMainOrderNumber: String(cg_main_order_number || ''),
                lcNumber: String(lc_number || ''),
                shipmentId: String(shipment_id || ''),
                inactive: inactive,
                skipFirstLegButtonFlow: skipFirstLegButtonFlow,
                canShowSupplierShippedBtn: canShowSupplierShippedBtn,
                supplierShippedBtnCodeEnabled: false,
                supplierShippedBtnCodeNote: 'current_button_block_is_commented_out'
            });




            // ===== 隐藏子表 =====
            if (wlPlanStatus != 0 && wlPlanStatus != 1 && wlPlanStatus != 2 && wlPlanStatus != 3) {
                injectRequireAndCall(
                    form,
                    'SuiteScripts/SWC_PROJECT/CS/SWC_CS_ESTIMATED_CABINET',
                    'hideRecmachSublistUI_SAFE',
                    ['recmachcustrecord_swc_wl_plan_order_id'],
                    '#recmachcustrecord_swc_wl_plan_order_id_layer'
                );
            }

            var PoCyVendBillFlage = isAllPoCyVendBillFilled(recordId);

            // ===== 仅 view 且非 inactive 才处理 =====
            if (context.type !== 'view' || inactive) {
                log.audit('WL_PLAN_SUPPLIER_SHIPPED_BTN_SKIP', {
                    recordId: recordId || '',
                    contextType: context.type || '',
                    inactive: inactive,
                    reason: context.type !== 'view' ? 'not_view_mode' : 'record_inactive'
                });
                return;
            }

            // view 模式下：如果 fee 子记录全部 fpo_type=2，则把父状态更新为 2
            // 只在当前不是2时才判断/更新，避免每次打开都跑一遍
            if (String(wlPlanStatus) == '1') {
                var shouldSetStatus = isAllFeeFpoType(recordId);

                if (shouldSetStatus != 1) {
                    record.submitFields({
                        type: newRecord.type, // 父记录类型
                        id: recordId,
                        values: { custrecord_swc_wl_plan_status: shouldSetStatus },
                        options: { enableSourcing: false, ignoreMandatoryFields: true }
                    });

                    wlPlanStatus = '2';

                    try {
                        newRecord.setValue({ fieldId: 'custrecord_swc_wl_plan_status', value: 2 });
                    } catch (eSet) { }
                }
            }

            function addBtn(id, label, fn) {
                form.addButton({
                    id: id,
                    label: label,
                    functionName: fn + '(' + recordId + ')'
                });
            }

            // ====== 子列表删除处理 ======
            var inline = form.addField({
                id: 'custpage_confirm_delete_js',
                type: 'inlinehtml',
                label: ' '
            });
            inline.defaultValue = deleteCss();

            // ===== 采购杂费差异账单 =====
            if (cgZfCheck && !PoCyVendBillFlage) {
                addBtn('custpage_fee_po', '采购杂费差异账单做成', 'poZfCy');
            }

            // ===== 采购杂费差异账单 =====
            if (tcZfCheck && !tcZfCheckBtn) {
                addBtn('custpage_fee_po_apportion_sj', '实际头程费用分摊', 'feeApportionSj');
            }

            // ===== 采购杂费差异账单 =====
            if (wcZfCheck && !wcZfCheckBtn) {
                addBtn('custpage_fee_po_apportion_sj_wc', '实际尾程费用分摊', 'feeApportionSjWc');
            }


            // // 测试用
            // addBtn('custpage_tests', '采购订单明细行更新', 'upDataPoSubListLine');
            // addBtn('custpage_fee_po_apportion', '头程预估费用分摊-测试', 'feeApportion');
            // addBtn('custpage_fee_po', '头程费用类型采购订单做成-测试', 'tcFeePoCreate');
            // addBtn('custpage_estimated_cost', '获取头程费用-测试用-请勿点击', 'feeEstimatedCos');

            // ===== 按状态显示按钮（会用上我们更新后的 wlPlanStatus）=====
            switch (String(wlPlanStatus)) {
                case '0':
                    addBtn('custpage_fee_po', '费用类型采购订单做成', 'feePoCreate');
                    // addBtn('custpage_fee_rm', '物流发运取消', 'wlRm');
                    break;

                case '1':
                    // addBtn('custpage_fee_rm', '物流发运取消', 'wlRm');
                    break;

                case '2': // 费用类型采购订单审核通过
                    addBtn('custpage_tests', '采购订单明细行更新', 'upDataPoSubListLine');
                    // addBtn('custpage_fee_rm', '物流发运取消', 'wlRm');
                    break;

                case '3':
                    // addBtn('custpage_fee_rm', '物流发运取消', 'wlRm');
                    addBtn('custpage_fee_sp', '重新审批', 'fee_po_sp');
                    break;

                case '4':
                    addBtn('custpage_create_if_record', '预估杂费分摊', 'createIfRecord');
                    break;

                case '5':
                    addBtn('custpage_create_if_record2', '采购订单入库', 'poToIf');
                    break;

                case '15':
                    addBtn('custpage_work_order_assembly', '工单组装', 'workOrderAssembly');
                    if (skipFirstLegButtonFlow) {
                        log.audit('WL_PLAN_SUPPLIER_SHIPPED_BTN_STATE_TRACE', {
                            recordId: recordId || '',
                            wlPlanStatus: String(wlPlanStatus || ''),
                            tkStatus: String(tk_status || ''),
                            skipFirstLegButtonFlow: skipFirstLegButtonFlow,
                            canShowSupplierShippedBtn: canShowSupplierShippedBtn,
                            branch: 'status_15_return_after_work_order_assembly'
                        });
                        return;
                    }
                    break;

                case '6':
                    if (wlApprovalStatus === '3') {
                        addBtn('custpage_estimated_cost', '获取头程费用', 'feeEstimatedCos');
                    }
                    break;

                case '7':
                    addBtn('custpage_fee_po', '头程费用类型采购订单做成', 'tcFeePoCreate');
                    break;

                case '9':
                    addBtn('custpage_fee_po_apportion', '头程预估费用分摊', 'feeApportion');
                    break;

                case '14':
                    addBtn('custpage_fee_sp_tc', '重新审批', 'fee_po_sp_tc');
                    break;


            }

            log.audit('WL_PLAN_SUPPLIER_SHIPPED_BTN_STATE_TRACE', {
                recordId: recordId || '',
                wlPlanStatus: String(wlPlanStatus || ''),
                tkStatus: String(tk_status || ''),
                mdLocation: String(mdLocation || ''),
                transferWay: String(transferWay || ''),
                termsOfTrade: String(tot || ''),
                cgMainOrderNumber: String(cg_main_order_number || ''),
                lcNumber: String(lc_number || ''),
                shipmentId: String(shipment_id || ''),
                skipFirstLegButtonFlow: skipFirstLegButtonFlow,
                canShowSupplierShippedBtn: canShowSupplierShippedBtn,
                supplierShippedBtnCodeEnabled: false,
                supplierShippedBtnCodeNote: 'current_button_block_is_commented_out',
                switchFinished: true
            });

            // // 贸易条款
            // // 1. 从发运单明细行读取已关联的 PO 单号； （会存在多个PO单号，做多个单据处理）
            // // 2. 依据 PO 单号关联子公司信息，识别采购主体为 “国内主体”；
            // var wlId = String(recordId) + '_wl';
            // var bgId = String(recordId) + '_bg';
            // var qgId;
            // if (shipment_id) {
            //     qgId = String(recordId) + '_fbaqg';
            // } else if (lc_number) {
            //     qgId = String(recordId) + '_qg';
            // }
            //
            // //CG上架到保税仓、保税仓调拨发运、上架到海外仓
            // if (cg_main_order_number) {
            //     wlId = String(recordId) + '_cgwl';
            //     bgId = String(recordId) + '_cgbg';
            //     qgId = String(recordId) + '_cgqg';
            //     if (canShowSupplierShippedBtn) {
            //         form.addButton({
            //             id: 'custpage_supplier_shipped_cn',
            //             label: '供应商已出货',
            //             functionName: "supplierShippedCn('" + wlId + "')"
            //         });
            //     } else if (tk_status == '1' && tot != 5) {
            //         form.addButton({
            //             id: 'custpage_customs_declared',
            //             label: '已报关',
            //             functionName: "customsDeclared('" + bgId + "')"
            //         });
            //     } else if ((tk_status == '2') || (tot == 5 && tk_status == '1')) {
            //         form.addButton({
            //             id: 'custpage_cleared_customs',
            //             label: '已清关',
            //             functionName: "clearedCustoms('" + qgId + "')"
            //         });
            //     }
            // } else if (lc_number || shipment_id) {
            //     if (canShowSupplierShippedBtn) {
            //         form.addButton({
            //             id: 'custpage_supplier_shipped_cn',
            //             label: '供应商已出货',
            //             functionName: "supplierShippedCn('" + wlId + "')"
            //         });
            //     } else if (tk_status == '1' && tot != 5) {
            //         form.addButton({
            //             id: 'custpage_customs_declared',
            //             label: '已报关',
            //             functionName: "customsDeclared('" + bgId + "')"
            //         });
            //     } else if ((tot == 2 && tk_status == '1') || (tot == 5 && tk_status == '1')) {
            //         form.addButton({
            //             id: 'custpage_cleared_customs',
            //             label: '已清关',
            //             functionName: "clearedCustoms('" + qgId + "')"
            //         });
            //     } else if (tk_status == '2') {
            //         form.addButton({
            //             id: 'custpage_cleared_customs',
            //             label: '已清关',
            //             functionName: "clearedCustoms('" + qgId + "')"
            //         });
            //     }
            // }
        } catch (e) {
            log.debug('beforeLoad error', e);
        }
    }

    /**
     * fee 子记录至少存在1行，且所有 custrecord_swc_wl_po_fee_fpo_type 都等于 2，则返回 true
     * 没有任何 fee 行时返回 false（避免把空当成“全部满足”）
     */
    function isAllFeeFpoType(parentId) {
        var CHILD_TYPE = 'customrecord_swc_wl_po_fee';
        var CHILD_PARENT_FLD = 'custrecord_swc_wl_po_fee_wl';
        var CHILD_TYPE_FLD = 'custrecord_swc_wl_po_fee_fpo_type';

        var total = 0;
        var allIs4 = true;
        var has3 = false;

        var s = search.create({
            type: CHILD_TYPE,
            filters: [[CHILD_PARENT_FLD, 'anyof', String(parentId)]],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: CHILD_TYPE_FLD })
            ]
        });

        s.run().each(function (r) {
            total++;

            var v = String(r.getValue({ name: CHILD_TYPE_FLD }) || '');

            if (v === '3') {
                has3 = true;
                // 不提前结束：后面可能还有不是4的情况，但规则里“有3就返回3”优先级最高
                return true;
            }

            if (v !== '4') {
                allIs4 = false;
                // 仍然继续，避免后面出现3却漏掉
                return true;
            }

            return true;
        });

        // 必须至少有一行；没有行按“其余”处理 => 1
        if (total === 0) return 1;

        // 有一个等于3 => 3（优先）
        if (has3) return 3;

        // 全部等于4 => 2
        if (allIs4) return 2;

        // 其余 => 1
        return 1;
    }


    function beforeSubmit(context) {
        try {
            log.audit('WL_PLAN_BEFORE_SUBMIT_START', buildSaveSyncLogContext(context));
            if (!shouldRunSaveSync(context.type, context.UserEventType)) {
                log.audit('WL_PLAN_BEFORE_SUBMIT_SKIP', buildSaveSyncLogContext(context));
                return;
            }
            normalizeFinanceConfirmationFlags(context.newRecord);
            log.audit('WL_PLAN_BEFORE_SUBMIT_DONE', buildSaveSyncLogContext(context));
        } catch (e) {
            log.error('WL_PLAN_BEFORE_SUBMIT_ERROR', buildSaveSyncErrorLogContext(context, e, 'normalizeFinanceConfirmationFlags'));
        }
    }

    function afterSubmit(context) {
        try {
            log.audit('WL_PLAN_AFTER_SUBMIT_START', buildSaveSyncLogContext(context));
            if (!shouldRunSaveSync(context.type, context.UserEventType)) {
                log.audit('WL_PLAN_AFTER_SUBMIT_SKIP', buildSaveSyncLogContext(context));
                return;
            }

            log.audit('WL_PLAN_AFTER_SUBMIT_STEP_START', buildSaveSyncStepLogContext(context, 'syncInboundOperationFeeLocation'));
            syncInboundOperationFeeLocation(context.newRecord.id);
            log.audit('WL_PLAN_AFTER_SUBMIT_STEP_DONE', buildSaveSyncStepLogContext(context, 'syncInboundOperationFeeLocation'));

            log.audit('WL_PLAN_AFTER_SUBMIT_STEP_START', buildSaveSyncStepLogContext(context, 'syncEstimatedFeeForInsuranceAndDuty'));
            syncEstimatedFeeForInsuranceAndDuty(context.newRecord.id);
            log.audit('WL_PLAN_AFTER_SUBMIT_STEP_DONE', buildSaveSyncStepLogContext(context, 'syncEstimatedFeeForInsuranceAndDuty'));

            log.audit('WL_PLAN_AFTER_SUBMIT_STEP_START', buildSaveSyncStepLogContext(context, 'syncDestinationPortCustomsClearanceFee'));
            syncDestinationPortCustomsClearanceFee(context.newRecord.id);
            log.audit('WL_PLAN_AFTER_SUBMIT_STEP_DONE', buildSaveSyncStepLogContext(context, 'syncDestinationPortCustomsClearanceFee'));

            log.audit('WL_PLAN_AFTER_SUBMIT_STEP_START', buildSaveSyncStepLogContext(context, 'processFinanceConfirmedFirstLegCost'));
            processFinanceConfirmedFirstLegCost(context);
            log.audit('WL_PLAN_AFTER_SUBMIT_STEP_DONE', buildSaveSyncStepLogContext(context, 'processFinanceConfirmedFirstLegCost'));
            log.audit('WL_PLAN_AFTER_SUBMIT_DONE', buildSaveSyncLogContext(context));
        } catch (e) {
            log.error('WL_PLAN_AFTER_SUBMIT_ERROR', buildSaveSyncErrorLogContext(context, e, 'afterSubmit'));
        }
    }

    function buildSaveSyncLogContext(context) {
        var rec = context && context.newRecord;
        return {
            eventType: String(context && context.type || ''),
            recordType: rec && rec.type || '',
            recordId: rec && rec.id || '',
            approvalStatus: rec ? rec.getValue({ fieldId: 'custrecord_swc_wl_approval_status' }) : '',
            planStatus: rec ? rec.getValue({ fieldId: 'custrecord_swc_wl_plan_status' }) : '',
            destinationWarehouse: rec ? rec.getValue({ fieldId: 'custrecord_swc_md_location' }) : '',
            transferWay: rec ? rec.getValue({ fieldId: 'custrecord_swc_wl_trasfer_way' }) : '',
            termsOfTrade: rec ? rec.getValue({ fieldId: 'custrecord_swc_wl_terms_of_trade' }) : '',
            actualCabinet: rec ? rec.getValue({ fieldId: 'custrecord_swc_wl_actual_cabinet' }) : ''
        };
    }

    function buildSaveSyncStepLogContext(context, stepName) {
        var base = buildSaveSyncLogContext(context);
        base.step = String(stepName || '');
        return base;
    }

    function buildSaveSyncErrorLogContext(context, e, stepName) {
        var base = buildSaveSyncStepLogContext(context, stepName);
        base.errorName = e && e.name || '';
        base.errorMessage = e && e.message || '';
        base.errorStack = e && e.stack || '';
        base.errorJson = safeStringifyError(e);
        return base;
    }

    function safeStringifyError(e) {
        try {
            return JSON.stringify(e);
        } catch (jsonError) {
            return String(e);
        }
    }

    function shouldRunSaveSync(contextType, userEventType) {
        var typeText = String(contextType || '').toLowerCase();
        return typeText === String(userEventType.CREATE || '').toLowerCase()
            || typeText === String(userEventType.EDIT || '').toLowerCase()
            || typeText === String(userEventType.XEDIT || '').toLowerCase()
            || typeText === String(userEventType.CSVIMPORT || '').toLowerCase();
    }

    function normalizeFinanceConfirmationFlags(planRecord) {
        if (!planRecord) return;
        var lineCount = planRecord.getLineCount({ sublistId: FIRST_LEG_SUBLIST_ID }) || 0;
        for (var i = 0; i < lineCount; i++) {
            var confirmed = isTruthy(planRecord.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FINANCE_CONFIRMED,
                line: i
            }));
            var rejected = isTruthy(planRecord.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FINANCE_REJECTED,
                line: i
            }));

            if (confirmed && rejected) {
                planRecord.setSublistValue({
                    sublistId: FIRST_LEG_SUBLIST_ID,
                    fieldId: FIELD_FINANCE_REJECTED,
                    line: i,
                    value: false
                });
                continue;
            }

            if (confirmed) {
                planRecord.setSublistValue({
                    sublistId: FIRST_LEG_SUBLIST_ID,
                    fieldId: FIELD_FINANCE_REJECTED,
                    line: i,
                    value: false
                });
            } else if (rejected) {
                planRecord.setSublistValue({
                    sublistId: FIRST_LEG_SUBLIST_ID,
                    fieldId: FIELD_FINANCE_CONFIRMED,
                    line: i,
                    value: false
                });
            }
        }
    }

    function processFinanceConfirmedFirstLegCost(context) {
        if (!context || !context.newRecord || !context.newRecord.id) return;
        var pendingLineIds = getPendingFinanceConfirmationLineIdsBySearch(context.newRecord.id);
        log.error('finance confirmed pending lines', {
            wlId: String(context.newRecord.id || ''),
            pendingLineIds: pendingLineIds
        });
        if (pendingLineIds.length === 0) {
            return;
        }

        processFinanceConfirmedFirstLegCostById(context.newRecord.id, pendingLineIds);
    }

    function getPendingFinanceConfirmationLineIds(planRecord) {
        var pending = [];
        if (!planRecord) return pending;

        var lineCount = planRecord.getLineCount({ sublistId: FIRST_LEG_SUBLIST_ID }) || 0;
        for (var i = 0; i < lineCount; i++) {
            var lineId = planRecord.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: 'id',
                line: i
            });
            var confirmed = isTruthy(planRecord.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FINANCE_CONFIRMED,
                line: i
            }));
            var rejected = isTruthy(planRecord.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FINANCE_REJECTED,
                line: i
            }));
            var poType = String(planRecord.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FIRST_LEG_PO_TYPE,
                line: i
            }) || '');
            var actualFeeRaw = planRecord.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FIRST_LEG_ACTUAL_FEE,
                line: i
            });

            if (!lineId || !confirmed || rejected || poType === '5') continue;
            if (actualFeeRaw === null || actualFeeRaw === '' || actualFeeRaw === undefined) continue;

            var actualFee = Number(actualFeeRaw);
            if (!isFinite(actualFee) || actualFee < 0) continue;

            pending.push(String(lineId));
        }
        return pending;
    }

    function getPendingFinanceConfirmationLineIdsBySearch(wlPlanOrderId) {
        var pending = [];
        if (!wlPlanOrderId) return pending;

        var lineSearch = search.create({
            type: 'customrecord_swc_wl_first_leg_cost',
            filters: [
                ['custrecord_swc_wl_first_leg_cost_id', 'anyof', String(wlPlanOrderId)],
                'AND',
                [FIELD_FINANCE_CONFIRMED, 'is', 'T']
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: FIELD_FINANCE_REJECTED }),
                search.createColumn({ name: FIELD_FIRST_LEG_ACTUAL_FEE }),
                search.createColumn({ name: FIELD_FIRST_LEG_BILL })
            ]
        });

        var results = getAllResults(lineSearch);
        for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var lineId = result.getValue({ name: 'internalid' });
            var rejected = result.getValue({ name: FIELD_FINANCE_REJECTED });
            var actualRaw = result.getValue({ name: FIELD_FIRST_LEG_ACTUAL_FEE });
            var billRaw = result.getValue({ name: FIELD_FIRST_LEG_BILL });
            log.error('finance confirmed line candidate', {
                wlId: String(wlPlanOrderId || ''),
                lineId: String(lineId || ''),
                rejected: String(rejected || ''),
                actualRaw: String(actualRaw || ''),
                billRaw: String(billRaw || '')
            });

            if (!lineId || isTruthy(rejected)) continue;
            if (billRaw !== null && billRaw !== undefined && String(billRaw) !== '') continue;
            if (actualRaw === null || actualRaw === undefined || String(actualRaw) === '') continue;

            var actualFee = Number(actualRaw);
            if (!isFinite(actualFee) || actualFee < 0) continue;

            pending.push(String(lineId));
        }

        return pending;
    }

    function processFinanceConfirmedFirstLegCostById(wlPlanOrderId, pendingLineIds) {
        var pendingLineIdMap = {};
        for (var i = 0; i < pendingLineIds.length; i++) {
            pendingLineIdMap[String(pendingLineIds[i] || '')] = true;
        }

        var rec = record.load({
            type: 'customrecord_swc_wl_plan_order',
            id: wlPlanOrderId,
            isDynamic: false
        });

        var termsOfTrade = rec.getValue({ fieldId: FIELD_WL_TERMS_OF_TRADE });
        var totalVolume = toNumber(rec.getValue({ fieldId: FIELD_WL_TOTAL_VOLUME }));
        var domesticSub = rec.getValue({ fieldId: FIELD_WL_PO_ZT }) || null;

        var feeItemByName = CONFIG.feeItemByName;
        var actualFeeCfg = CONFIG.actualFeeCfg || {};

        var cdMap = getFinanceBearerMapByTerms(termsOfTrade);
        var detailAmountContext = buildFinanceDetailAmountContext(rec);
        var pendingDocGroups = {};
        var allFeePoolMap = {};
        var legLineCount = rec.getLineCount({ sublistId: FIRST_LEG_SUBLIST_ID }) || 0;

        for (var line = 0; line < legLineCount; line++) {
            var lineId = String(rec.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: 'id',
                line: line
            }) || '');
            var confirmed = isTruthy(rec.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FINANCE_CONFIRMED,
                line: line
            }));
            var rejected = isTruthy(rec.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FINANCE_REJECTED,
                line: line
            }));
            var actualRaw = rec.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FIRST_LEG_ACTUAL_FEE,
                line: line
            });

            if (!confirmed || rejected || actualRaw === null || actualRaw === '' || actualRaw === undefined) continue;

            var actualFee = Number(actualRaw);
            if (!isFinite(actualFee) || actualFee < 0) continue;

            var feeTypeZ = String(rec.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FIRST_LEG_FEE_TYPE_Z,
                line: line
            }) || '');
            var allocationRule = String(rec.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FIRST_LEG_ALLOCATION_RULE,
                line: line
            }) || '');
            var actualCurrency = String(rec.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FIRST_LEG_ACTUAL_CURRENCY,
                line: line
            }) || '');
            var estimateFee = toNumber(rec.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FIRST_LEG_YG_FEE,
                line: line
            }));
            var diffAmt = round2(estimateFee - actualFee);
            var vendorId = rec.getSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FIRST_LEG_VENDOR,
                line: line
            }) || '';

            rec.setSublistValue({
                sublistId: FIRST_LEG_SUBLIST_ID,
                fieldId: FIELD_FIRST_LEG_DIFF,
                line: line,
                value: diffAmt
            });

            if (actualFeeCfg[feeTypeZ] && (allocationRule === '1' || allocationRule === '2')) {
                var poolKey = feeTypeZ + '_' + allocationRule;
                if (!allFeePoolMap[poolKey]) {
                    allFeePoolMap[poolKey] = {
                        feeTypeZ: feeTypeZ,
                        allocationRule: Number(allocationRule),
                        sumAmt: 0,
                        currency: '',
                        allocatedSum: 0
                    };
                }
                allFeePoolMap[poolKey].sumAmt = round2(allFeePoolMap[poolKey].sumAmt + actualFee);
                if (actualCurrency) {
                    if (allFeePoolMap[poolKey].currency && allFeePoolMap[poolKey].currency !== actualCurrency) {
                        throw new Error('同一费用中类存在多个实际费用币种，无法自动分摊。费用中类:' + feeTypeZ);
                    }
                    allFeePoolMap[poolKey].currency = actualCurrency;
                }
            }

            if (!pendingLineIdMap[lineId]) continue;

            if (!feeItemByName[feeTypeZ] || !vendorId || diffAmt === 0) continue;

            var bearer = String(cdMap[feeTypeZ] || '');
            var orderType2 = (feeTypeZ === FEE_TYPE_RKF) ? 8 : 10;
            var entries = buildFinanceDocEntries({
                diffAmt: diffAmt,
                bearer: bearer,
                vendorId: vendorId,
                orderType2: orderType2,
                itemId: feeItemByName[feeTypeZ],
                lineId: line,
                feeTypeZ: feeTypeZ,
                domesticSub: domesticSub,
                subVolMap: detailAmountContext.subVolMap,
                volTotal: detailAmountContext.volTotal
            });
            for (var e = 0; e < entries.length; e++) {
                var entry = entries[e];
                if (!pendingDocGroups[entry.groupKey]) {
                    pendingDocGroups[entry.groupKey] = {
                        vendorId: entry.vendorId,
                        subsidiaryId: entry.subsidiaryId,
                        orderType2: entry.orderType2,
                        lineIds: [],
                        VendorBill: [],
                        VendorCredit: []
                    };
                }
                pendingDocGroups[entry.groupKey].lineIds.push(line);
                if (entry.docType === 'bill') {
                    pendingDocGroups[entry.groupKey].VendorBill.push({
                        item: entry.itemId,
                        amount: entry.amount,
                        lineId: line,
                        orderType2: entry.orderType2
                    });
                } else if (entry.docType === 'credit') {
                    pendingDocGroups[entry.groupKey].VendorCredit.push({
                        item: entry.itemId,
                        amount: entry.amount,
                        lineId: line,
                        orderType2: entry.orderType2
                    });
                }
            }
        }

        var createdBillIds = [];
        var createdCreditIds = [];
        var pendingGroupKeys = Object.keys(pendingDocGroups);
        for (var g = 0; g < pendingGroupKeys.length; g++) {
            var group = pendingDocGroups[pendingGroupKeys[g]];
            if (group.VendorBill.length > 0) {
                var vbId = createFinanceVendorBill(group.vendorId, group.VendorBill, group.subsidiaryId, group.orderType2);
                if (vbId) {
                    createdBillIds.push(String(vbId));
                    writeBackFinanceTranToLines(rec, vbId, group.VendorBill);
                }
            }
            if (group.VendorCredit.length > 0) {
                var vcId = createFinanceVendorCredit(group.vendorId, group.VendorCredit, group.subsidiaryId, group.orderType2);
                if (vcId) {
                    createdCreditIds.push(String(vcId));
                    writeBackFinanceTranToLines(rec, vcId, group.VendorCredit);
                }
            }
        }

        applyFinanceActualAllocation(rec, allFeePoolMap, actualFeeCfg, detailAmountContext, totalVolume);
        rec.save({ ignoreMandatoryFields: true });

        log.error('finance confirmed first leg cost processed', {
            wlId: String(wlPlanOrderId || ''),
            pendingLineIds: pendingLineIds,
            createdBillIds: uniq(createdBillIds),
            createdCreditIds: uniq(createdCreditIds)
        });
    }

    function buildFinanceDocEntries(options) {
        var entries = [];
        var diffAmt = round2(options.diffAmt);
        if (!diffAmt) return entries;

        var vendorId = String(options.vendorId || '');
        var orderType2 = options.orderType2;
        var itemId = options.itemId;
        var feeTypeZ = String(options.feeTypeZ || '');
        var bearer = String(options.bearer || '');
        var domesticSub = options.domesticSub;
        var subVolMap = options.subVolMap || {};
        var volTotal = toNumber(options.volTotal);
        var docType = diffAmt < 0 ? 'bill' : 'credit';
        var absAmt = Math.abs(diffAmt);

        if (bearer === '3') {
            var domesticKey = String(domesticSub || '__NO_SUB__');
            entries.push({
                groupKey: vendorId + '|' + domesticKey + '|' + String(orderType2 || '') + '|' + feeTypeZ,
                vendorId: vendorId,
                subsidiaryId: domesticSub ? Number(domesticSub) : null,
                orderType2: orderType2,
                itemId: itemId,
                amount: absAmt,
                docType: docType
            });
            return entries;
        }

        var subKeys = Object.keys(subVolMap || {});
        if (bearer === '2' && subKeys.length > 0 && volTotal > 0) {
            subKeys.sort(function (a, b) { return Number(a) - Number(b); });
            var allocated = 0;
            for (var i = 0; i < subKeys.length; i++) {
                var subIdKey = subKeys[i];
                var isLast = (i === subKeys.length - 1);
                var ratio = toNumber(subVolMap[subIdKey]) / volTotal;
                var part = isLast ? round2(absAmt - allocated) : round2(absAmt * ratio);
                if (!isLast) {
                    allocated = round2(allocated + part);
                }
                if (part === 0) continue;
                entries.push({
                    groupKey: vendorId + '|' + String(subIdKey || '') + '|' + String(orderType2 || '') + '|' + feeTypeZ,
                    vendorId: vendorId,
                    subsidiaryId: Number(subIdKey) || null,
                    orderType2: orderType2,
                    itemId: itemId,
                    amount: part,
                    docType: docType
                });
            }
            return entries;
        }

        entries.push({
            groupKey: vendorId + '|__NO_SUB__|' + String(orderType2 || '') + '|' + feeTypeZ,
            vendorId: vendorId,
            subsidiaryId: null,
            orderType2: orderType2,
            itemId: itemId,
            amount: absAmt,
            docType: docType
        });
        return entries;
    }

    function applyFinanceActualAllocation(rec, feePoolMap, actualFeeCfg, detailAmountContext, totalVolume) {
        var planLineCount = rec.getLineCount({ sublistId: PLAN_DETAIL_SUBLIST_ID }) || 0;
        if (planLineCount <= 0) {
            throw new Error('实际费用分摊失败：没有物流发运明细行');
        }

        var hasVolumeRule = false;
        var hasAmountRule = false;
        var poolKeys = Object.keys(feePoolMap || {});
        for (var p = 0; p < poolKeys.length; p++) {
            var pool = feePoolMap[poolKeys[p]];
            if (!pool || !pool.sumAmt) continue;
            log.error('finance actual allocation pool', {
                poolKey: String(poolKeys[p] || ''),
                feeTypeZ: String(pool.feeTypeZ || ''),
                allocationRule: String(pool.allocationRule || ''),
                sumAmt: toNumber(pool.sumAmt),
                currency: String(pool.currency || '')
            });
            if (pool.allocationRule === 1) hasVolumeRule = true;
            if (pool.allocationRule === 2) hasAmountRule = true;
        }

        log.error('finance actual allocation basis summary', {
            lineCount: planLineCount,
            totalVolume: toNumber(totalVolume),
            totalAmount: toNumber(detailAmountContext.totalAmount),
            hasVolumeRule: hasVolumeRule,
            hasAmountRule: hasAmountRule
        });

        if (hasVolumeRule && totalVolume <= 0) {
            throw new Error('实际费用分摊失败：存在按体积分摊的数据，但总体积为0或为空');
        }
        if (hasAmountRule && detailAmountContext.totalAmount <= 0) {
            throw new Error('实际费用分摊失败：存在按金额分摊的数据，但总金额为0或为空');
        }

        clearFinanceActualDetailFields(rec, actualFeeCfg, planLineCount);

        for (var line = 0; line < planLineCount; line++) {
            var detailVolume = toNumber(rec.getSublistValue({
                sublistId: PLAN_DETAIL_SUBLIST_ID,
                fieldId: 'custrecord_swc_wl_d_total_volume',
                line: line
            }));
            var detailAmount = toNumber(detailAmountContext.detailAmountMap[line]);
            var isLast = (line === planLineCount - 1);

            for (var k = 0; k < poolKeys.length; k++) {
                var poolKey = poolKeys[k];
                var feePool = feePoolMap[poolKey];
                if (!feePool || !feePool.sumAmt) continue;

                var cfg = actualFeeCfg[String(feePool.feeTypeZ || '')];
                if (!cfg) continue;

                var ratio = 0;
                if (feePool.allocationRule === 1) {
                    ratio = totalVolume ? (detailVolume / totalVolume) : 0;
                } else if (feePool.allocationRule === 2) {
                    ratio = detailAmountContext.totalAmount ? (detailAmount / detailAmountContext.totalAmount) : 0;
                }

                if (feePool.currency) {
                    rec.setSublistValue({
                        sublistId: PLAN_DETAIL_SUBLIST_ID,
                        fieldId: cfg.curField,
                        line: line,
                        value: feePool.currency
                    });
                }

                var amountToSet = 0;
                if (isLast) {
                    amountToSet = round2(feePool.sumAmt - feePool.allocatedSum);
                } else {
                    amountToSet = round2(feePool.sumAmt * ratio);
                    feePool.allocatedSum = round2(feePool.allocatedSum + amountToSet);
                }

                var oldAmt = toNumber(rec.getSublistValue({
                    sublistId: PLAN_DETAIL_SUBLIST_ID,
                    fieldId: cfg.amtField,
                    line: line
                }));
                rec.setSublistValue({
                    sublistId: PLAN_DETAIL_SUBLIST_ID,
                    fieldId: cfg.amtField,
                    line: line,
                    value: round2(oldAmt + amountToSet)
                });
            }
        }
    }

    function clearFinanceActualDetailFields(rec, actualFeeCfg, planLineCount) {
        var feeKeys = Object.keys(actualFeeCfg || {});
        for (var line = 0; line < planLineCount; line++) {
            for (var i = 0; i < feeKeys.length; i++) {
                var cfg = actualFeeCfg[feeKeys[i]];
                rec.setSublistValue({
                    sublistId: PLAN_DETAIL_SUBLIST_ID,
                    fieldId: cfg.amtField,
                    line: line,
                    value: 0
                });
                try {
                    rec.setSublistValue({
                        sublistId: PLAN_DETAIL_SUBLIST_ID,
                        fieldId: cfg.curField,
                        line: line,
                        value: ''
                    });
                } catch (e) { }
            }
        }
    }

    function buildFinanceDetailAmountContext(rec) {
        var detailAmountMap = {};
        var totalAmount = 0;
        var volTotal = 0;
        var subVolMap = {};
        var poAmountIndexCache = {};
        var lineCount = rec.getLineCount({ sublistId: PLAN_DETAIL_SUBLIST_ID }) || 0;

        for (var line = 0; line < lineCount; line++) {
            var shopId = rec.getSublistValue({
                sublistId: PLAN_DETAIL_SUBLIST_ID,
                fieldId: 'custrecord_swc_wl_d_customer',
                line: line
            });
            var lineVolume = toNumber(rec.getSublistValue({
                sublistId: PLAN_DETAIL_SUBLIST_ID,
                fieldId: 'custrecord_swc_wl_d_total_volume',
                line: line
            }));
            var subId = getCustomerSubsidiary(shopId);
            if (subId && lineVolume > 0) {
                volTotal = round2(volTotal + lineVolume);
                subVolMap[String(subId)] = round2(toNumber(subVolMap[String(subId)]) + lineVolume);
            }

            var poId = rec.getSublistValue({
                sublistId: PLAN_DETAIL_SUBLIST_ID,
                fieldId: 'custrecord_swc_wl_d_po_num',
                line: line
            }) || '';
            var superiorQty = toNumber(rec.getSublistValue({
                sublistId: PLAN_DETAIL_SUBLIST_ID,
                fieldId: 'custrecord_swc_wl_d_superior_qty_z',
                line: line
            }));
            var goodQty = toNumber(rec.getSublistValue({
                sublistId: PLAN_DETAIL_SUBLIST_ID,
                fieldId: 'custrecord_swc_wl_d_good_qty_z',
                line: line
            }));
            var grade = superiorQty > 0 ? 1 : (goodQty > 0 ? 2 : '');
            if (!poId || !grade) {
                detailAmountMap[line] = 0;
                continue;
            }

            var amountKey = buildFinancePoAmountKey(
                rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_item', line: line }),
                rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_country', line: line }),
                rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_location_type', line: line }),
                rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_customer', line: line }),
                rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_region', line: line })
            ) + '_' + String(grade);

            if (!poAmountIndexCache[poId]) {
                var poRec = record.load({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    isDynamic: false
                });
                poAmountIndexCache[poId] = buildFinancePoAmountIndex(poRec);
            }

            var poLineAmount = toNumber(poAmountIndexCache[poId][amountKey]);
            log.error('finance actual allocation detail match', {
                line: line,
                poId: String(poId || ''),
                grade: String(grade || ''),
                amountKey: String(amountKey || ''),
                item: String(rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_item', line: line }) || ''),
                country: String(rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_country', line: line }) || ''),
                locationType: String(rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_location_type', line: line }) || ''),
                customer: String(rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_customer', line: line }) || ''),
                region: String(rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_region', line: line }) || ''),
                superiorQty: toNumber(rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: line })),
                goodQty: toNumber(rec.getSublistValue({ sublistId: PLAN_DETAIL_SUBLIST_ID, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: line })),
                matchedAmount: poLineAmount,
                hasMatch: poLineAmount > 0
            });
            detailAmountMap[line] = poLineAmount;
            totalAmount = round2(totalAmount + poLineAmount);
        }

        return {
            detailAmountMap: detailAmountMap,
            totalAmount: totalAmount,
            volTotal: volTotal,
            subVolMap: subVolMap
        };
    }

    function buildFinancePoAmountKey(itemId, country, locationType, customer, region) {
        return [
            String(itemId || ''),
            String(country || ''),
            String(locationType || ''),
            String(customer || ''),
            String(region || '')
        ].join('_');
    }

    function buildFinancePoAmountIndex(poRec) {
        var index = {};
        var poLineCount = poRec.getLineCount({ sublistId: 'item' }) || 0;
        for (var i = 0; i < poLineCount; i++) {
            var grade = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_grade', line: i });
            if (grade != 1 && grade != 2) continue;

            var key = buildFinancePoAmountKey(
                poRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }),
                poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_country_code', line: i }),
                poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_loc_type', line: i }),
                poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_store', line: i }),
                poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_us_districts', line: i })
            );
            index[key + '_' + String(grade)] = toNumber(poRec.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_swc_including_tax_amt',
                line: i
            }));
        }
        return index;
    }

    function getFinanceBearerMapByTerms(termsOfTrade) {
        var totFieldId = '';
        if (termsOfTrade == 1) totFieldId = 'custrecord_swc_cost_exw';
        else if (termsOfTrade == 2) totFieldId = 'custrecord_swc_cost_cn_fob';
        else if (termsOfTrade == 3) totFieldId = 'custrecord_swc_cost_ddp';
        else if (termsOfTrade == 4) totFieldId = 'custrecord_swc_cost_ddu';
        else if (termsOfTrade == 5) totFieldId = 'custrecord_swc_cost_hw_fob';

        var cdMap = {};
        if (!totFieldId) return cdMap;

        var ruleSearch = search.create({
            type: 'customrecord_swc_rule_mapping_table',
            filters: [],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'formulatext', 计算公式: '{' + totFieldId + '.id}' })
            ]
        });
        var ruleRows = getAllResults(ruleSearch);
        for (var i = 0; i < ruleRows.length; i++) {
            var cm = ruleRows[i].getValue({ name: 'internalid' });
            var gy = ruleRows[i].getValue({ name: 'formulatext', 计算公式: '{' + totFieldId + '.id}' });
            if (cm) cdMap[String(cm)] = String(gy || '');
        }
        return cdMap;
    }

    function createFinanceVendorBill(vendorId, data, subsidiaryId, orderType2) {
        var vendorbillRecord = record.create({ type: 'vendorbill', isDynamic: true });
        vendorbillRecord.setValue({ fieldId: 'entity', value: vendorId });
        applyVendorPaymentTerms(vendorbillRecord, vendorId);
        if (subsidiaryId && vendorbillRecord.getField({ fieldId: 'subsidiary' })) {
            vendorbillRecord.setValue({ fieldId: 'subsidiary', value: subsidiaryId });
        }
        if (orderType2) {
            vendorbillRecord.setValue({ fieldId: 'custbody_swc_order_type2', value: orderType2 });
        }
        for (var i = 0; i < data.length; i++) {
            var linejson = data[i];
            var amt = toNumber(linejson.amount);
            if (!linejson.item || amt <= 0) continue;
            vendorbillRecord.selectNewLine({ sublistId: 'item' });
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: linejson.item });
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
            vendorbillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: amt });
            vendorbillRecord.commitLine({ sublistId: 'item' });
        }
        return vendorbillRecord.save({ ignoreMandatoryFields: false });
    }

    function createFinanceVendorCredit(vendorId, data, subsidiaryId, orderType2) {
        var vendorcreditRecord = record.create({ type: 'vendorcredit', isDynamic: true });
        vendorcreditRecord.setValue({ fieldId: 'entity', value: vendorId });
        applyVendorPaymentTerms(vendorcreditRecord, vendorId);
        if (subsidiaryId && vendorcreditRecord.getField({ fieldId: 'subsidiary' })) {
            vendorcreditRecord.setValue({ fieldId: 'subsidiary', value: subsidiaryId });
        }
        if (orderType2) {
            vendorcreditRecord.setValue({ fieldId: 'custbody_swc_order_type2', value: orderType2 });
        }
        for (var i = 0; i < data.length; i++) {
            var linejson = data[i];
            var amt = Math.abs(toNumber(linejson.amount));
            if (!linejson.item || amt <= 0) continue;
            vendorcreditRecord.selectNewLine({ sublistId: 'item' });
            vendorcreditRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: linejson.item });
            vendorcreditRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
            vendorcreditRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: amt });
            vendorcreditRecord.commitLine({ sublistId: 'item' });
        }
        return vendorcreditRecord.save({ ignoreMandatoryFields: false });
    }

    function writeBackFinanceTranToLines(rec, tranId, lines) {
        for (var i = 0; i < (lines || []).length; i++) {
            var lineId = Number(lines[i].lineId);
            if (!isFinite(lineId)) continue;
            appendFinanceSublistMultiSelect(rec, FIRST_LEG_SUBLIST_ID, FIELD_FIRST_LEG_BILL, lineId, [tranId]);
        }
    }

    function appendFinanceSublistMultiSelect(rec, sublistId, fieldId, line, addIds) {
        var currentRaw = rec.getSublistValue({ sublistId: sublistId, fieldId: fieldId, line: line });
        var current = normalizeFinanceMultiSelectValue(currentRaw);
        var add = (addIds || []).map(function (x) { return String(x || '').trim(); }).filter(Boolean);
        var merged = uniq(current.concat(add));
        if (merged.length === 0) return;
        rec.setSublistValue({
            sublistId: sublistId,
            fieldId: fieldId,
            line: line,
            value: merged
        });
    }

    function normalizeFinanceMultiSelectValue(v) {
        if (v === null || v === undefined || v === '') return [];
        if (Array.isArray(v)) {
            return v.map(function (x) { return String(x || '').trim(); }).filter(Boolean);
        }
        if (typeof v === 'string') {
            if (v.indexOf('\u0005') !== -1) {
                return v.split('\u0005').map(function (x) { return String(x || '').trim(); }).filter(Boolean);
            }
            if (v.indexOf(',') !== -1) {
                return v.split(',').map(function (x) { return String(x || '').trim(); }).filter(Boolean);
            }
            return [v.trim()].filter(Boolean);
        }
        return [String(v)].filter(Boolean);
    }

    function uniq(arr) {
        var seen = {};
        var out = [];
        for (var i = 0; i < (arr || []).length; i++) {
            var value = String(arr[i] || '').trim();
            if (!value || seen[value]) continue;
            seen[value] = true;
            out.push(value);
        }
        return out;
    }

    function getCustomerSubsidiary(customerId) {
        if (!customerId) return '';
        var customerInfo = search.lookupFields({
            type: 'customer',
            id: customerId,
            columns: ['subsidiary']
        }) || {};
        var arr = customerInfo.subsidiary || [];
        return (arr[0] && arr[0].value) ? arr[0].value : '';
    }

    function getFirstVendorPaymentTerms(vendorId) {
        if (!vendorId) return '';
        var vendorInfo = search.lookupFields({
            type: search.Type.VENDOR,
            id: vendorId,
            columns: ['custentity_swc_payment_terms']
        }) || {};
        var termsValue = vendorInfo.custentity_swc_payment_terms;
        if (!termsValue) return '';
        if (Array.isArray(termsValue) && termsValue.length > 0) {
            return termsValue[0] && termsValue[0].value ? termsValue[0].value : '';
        }
        if (typeof termsValue === 'string') {
            var ids = termsValue.split(',').map(function (id) { return String(id || '').trim(); }).filter(Boolean);
            return ids.length > 0 ? ids[0] : '';
        }
        return '';
    }

    function applyVendorPaymentTerms(tranRec, vendorId) {
        if (!tranRec || !vendorId) return;
        if (!tranRec.getField({ fieldId: 'custbody_swc_vendor_payment_terms' })) return;
        var paymentTerms = getFirstVendorPaymentTerms(vendorId);
        if (paymentTerms) {
            tranRec.setValue({
                fieldId: 'custbody_swc_vendor_payment_terms',
                value: paymentTerms
            });
        }
    }

    function getAllResults(srch) {
        var out = [];
        var results = srch.run();
        var idx = 0;
        while (true) {
            var slice = results.getRange({ start: idx, end: idx + 1000 });
            if (!slice || slice.length === 0) break;
            for (var i = 0; i < slice.length; i++) out.push(slice[i]);
            idx += slice.length;
            if (slice.length < 1000) break;
        }
        return out;
    }

    function isTruthy(value) {
        return value === true || value === 'T';
    }

    /**
     * 我在编辑保存后，把“入库操作费(101)”对应的 location 按最新表头信息同步到头程费用子记录。
     * 处理规则与创建时保持一致：
     * 1. 只有物流发运单上存在运抵国时才处理
     * 2. 只处理 fee_type_z = 101 的子记录
     * 3. 用 运抵国 + 目的仓 去供应商里匹配，多个结果只取第一条
     * 4. 查到供应商后，回写 custrecord_swc_wl_flc_location
     * @param {string|number} wlPlanOrderId
     */
    function syncInboundOperationFeeLocation(wlPlanOrderId) {
        if (!wlPlanOrderId) return;

        var wlPlanRecord = record.load({
            type: 'customrecord_swc_wl_plan_order',
            id: wlPlanOrderId,
            isDynamic: false
        });

        var countyLsit = wlPlanRecord.getValue({ fieldId: 'custrecord_swc_wl_county_lsit' });
        var mdLocation = wlPlanRecord.getValue({ fieldId: 'custrecord_swc_md_location' });

        // 我只在运抵国存在时才做这次补偿处理，保持和当前创建逻辑一致。
        if (!countyLsit || !mdLocation) {
            return;
        }

        var matchedVendorId = getFirstVendorByCountryAndLocation(countyLsit, mdLocation);
        if (!matchedVendorId) {
            return;
        }

        var firstLegCostSearch = search.create({
            type: 'customrecord_swc_wl_first_leg_cost',
            filters: [
                ['custrecord_swc_wl_first_leg_cost_id', 'anyof', String(wlPlanOrderId)],
                'AND',
                ['custrecord_swc_flc_fee_type_z', 'anyof', FEE_TYPE_RKF]
            ],
            columns: [
                search.createColumn({ name: 'internalid' })
            ]
        });

        firstLegCostSearch.run().each(function (result) {
            var lineId = result.getValue({ name: 'internalid' });
            if (!lineId) {
                return true;
            }

            record.submitFields({
                type: 'customrecord_swc_wl_first_leg_cost',
                id: lineId,
                values: {
                    custrecord_swc_wl_flc_location: matchedVendorId
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            return true;
        });
    }

    /**
     * 我在编辑保存后，把海运保险费(4)和目的国进口关税(7)的预估费用按最新表头/明细重新同步。
     * 这里主要覆盖“运抵国后补录”的场景，避免创建时因为国家为空导致 7 没法计算。
     * 4 的口径：
     * 1. 取物流发运明细金额 custrecord_swc_wl_d_amount_total
     * 2. 乘对应数量（优品/良品，有值取对应值，否则回退 shipped qty）
     * 3. 再乘 1.1 和 0.005
     * 4. 如果对应 PO 币种是美元，再乘 7
     * 7 的口径：
     * 1. 按运抵国决定清关价字段
     *    US -> USD
     *    CA -> CAD
     *    DE/FR/IT/ES/NL -> EUR
     *    GB/UK -> GBP
     * 2. 按 SKU 去清关价明细和 SKU-HS 映射里取单价与税率
     * 3. 单价 * 数量 * 税率
     * 4. 美国(US)场合在总额基础上再加 40
     * @param {string|number} wlPlanOrderId
     */
    function syncEstimatedFeeForInsuranceAndDuty(wlPlanOrderId) {
        if (!wlPlanOrderId) {
            log.audit('syncEstimatedFeeForInsuranceAndDuty skipped', {
                reason: 'wlPlanOrderId_empty',
                wlPlanOrderId: wlPlanOrderId
            });
            return;
        }

        var wlPlanRecord = record.load({
            type: 'customrecord_swc_wl_plan_order',
            id: wlPlanOrderId,
            isDynamic: false
        });

        var countyLsit = wlPlanRecord.getValue({ fieldId: 'custrecord_swc_wl_county_lsit' });
        var countyLsitText = wlPlanRecord.getText({ fieldId: 'custrecord_swc_wl_county_lsit' });
        var mainStore = wlPlanRecord.getValue({ fieldId: 'custrecord_swc_wl_po_zt' });
        var createDate = wlPlanRecord.getValue({ fieldId: 'custrecord_swc_create_date' });
        var countryCode = normalizeCountryCode(countyLsit, countyLsitText);
        var termsOfTrade = wlPlanRecord.getValue({ fieldId: 'custrecord_swc_wl_terms_of_trade' });
        var clearancePriceFieldId = getClearancePriceFieldIdByCountry(countryCode);
        var dutyCurrency = getDutyCurrencyInternalIdByCountryCode(countryCode);
        var isUsCountry = String(countryCode || '').toUpperCase() === 'US';
        var detailLineList = getPlanDetailLineList(wlPlanRecord);
        log.audit('syncEstimatedFeeForInsuranceAndDuty params', {
            wlPlanOrderId: wlPlanOrderId,
            countyLsit: countyLsit,
            countyLsitText: countyLsitText,
            countryCode: countryCode,
            mainStore: mainStore || '',
            createDate: createDate || '',
            termsOfTrade: termsOfTrade || '',
            clearancePriceFieldId: clearancePriceFieldId || '',
            dutyCurrency: dutyCurrency || '',
            isUsCountry: isUsCountry,
            detailLineCount: detailLineList.length
        });
        if (!detailLineList.length) {
            log.audit('syncEstimatedFeeForInsuranceAndDuty skipped', {
                reason: 'detailLineList_empty',
                wlPlanOrderId: wlPlanOrderId,
                countryCode: countryCode
            });
            return;
        }

        var feeLineList = getInsuranceAndDutyFeeLines(wlPlanOrderId);
        if (!feeLineList.length) {
            log.audit('syncEstimatedFeeForInsuranceAndDuty skipped', {
                reason: 'feeLineList_empty',
                wlPlanOrderId: wlPlanOrderId,
                feeTypesExpected: [FEE_TYPE_BXF, FEE_TYPE_JKGS]
            });
            return;
        }

        var poCurrencyMap = getPurchaseOrderCurrencyMap(detailLineList);
        var insuranceResult = calculateInsuranceEstimatedFee(detailLineList, poCurrencyMap, termsOfTrade);
        var dutyResult = calculateImportDutyEstimatedFee(detailLineList, countryCode, clearancePriceFieldId, isUsCountry, poCurrencyMap, mainStore, createDate);
        log.audit('syncEstimatedFeeForInsuranceAndDuty result', {
            wlPlanOrderId: wlPlanOrderId,
            insuranceTotal: insuranceResult.total,
            dutyTotal: dutyResult.total,
            feeLineCount: feeLineList.length,
            poCurrencyMapKeys: Object.keys(poCurrencyMap || {}),
            feeLineList: feeLineList
        });

        for (var i = 0; i < feeLineList.length; i++) {
            var feeLine = feeLineList[i];
            var values = {};

            if (String(feeLine.feeTypeZ) === FEE_TYPE_BXF) {
                values.custrecord_swc_wl_flc_yg_fee = insuranceResult.total;
                values.custrecord_swc_wl_flc_yg_currency = 1;
            } else if (String(feeLine.feeTypeZ) === FEE_TYPE_JKGS && String(feeLine.feeTypeX) === FEE_TYPE_GS) {
                values.custrecord_swc_wl_flc_yg_fee = dutyResult.total;
                if (dutyCurrency) {
                    values.custrecord_swc_wl_flc_yg_currency = dutyCurrency;
                }
            } else {
                log.audit('syncEstimatedFeeForInsuranceAndDuty fee line skipped', {
                    wlPlanOrderId: wlPlanOrderId,
                    feeLineId: feeLine.id,
                    feeTypeZ: feeLine.feeTypeZ,
                    feeTypeX: feeLine.feeTypeX,
                    reason: 'fee_type_not_supported'
                });
                continue;
            }
            record.submitFields({
                type: 'customrecord_swc_wl_first_leg_cost',
                id: feeLine.id,
                values: values,
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            log.audit('syncEstimatedFeeForInsuranceAndDuty fee line updated', {
                wlPlanOrderId: wlPlanOrderId,
                feeLineId: feeLine.id,
                feeTypeZ: feeLine.feeTypeZ,
                feeTypeX: feeLine.feeTypeX,
                values: values
            });
        }

        insuranceResult.lineAmountMap = rebalanceLineAmountMap(insuranceResult.lineAmountMap, insuranceResult.total);
        dutyResult.lineAmountMap = rebalanceLineAmountMap(dutyResult.lineAmountMap, dutyResult.total);
        // 这里必须重新加载父单据。
        // 原因：上面已经先通过 submitFields 更新了头程费用子记录，
        // 如果继续保存最早加载的父单据对象，NetSuite 可能会把旧子表快照再次落库，覆盖刚写好的预估费用。
        var refreshedPlanRecord = record.load({
            type: 'customrecord_swc_wl_plan_order',
            id: wlPlanOrderId,
            isDynamic: false
        });
        applyInsuranceAndDutyToPlanDetail(refreshedPlanRecord, insuranceResult.lineAmountMap, dutyResult.lineAmountMap, countryCode);
        log.audit('syncEstimatedFeeForInsuranceAndDuty done', {
            wlPlanOrderId: wlPlanOrderId,
            insuranceLineAmountMap: insuranceResult.lineAmountMap,
            dutyLineAmountMap: dutyResult.lineAmountMap,
            countryCode: countryCode
        });
    }

    function getInsuranceAndDutyFeeLines(wlPlanOrderId) {
        var lineList = [];
        var feeSearch = search.create({
            type: 'customrecord_swc_wl_first_leg_cost',
            filters: [
                ['custrecord_swc_wl_first_leg_cost_id', 'anyof', String(wlPlanOrderId)],
                'AND',
                ['custrecord_swc_flc_fee_type_z', 'anyof', [FEE_TYPE_BXF, FEE_TYPE_JKGS]]
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'custrecord_swc_flc_fee_type_z' }),
                search.createColumn({ name: 'custrecord_swc_wl_flc_fee_type_x' })
            ]
        });

        feeSearch.run().each(function (result) {
            var lineInfo = {
                id: result.getValue({ name: 'internalid' }),
                feeTypeZ: result.getValue({ name: 'custrecord_swc_flc_fee_type_z' }),
                feeTypeX: result.getValue({ name: 'custrecord_swc_wl_flc_fee_type_x' })
            };
            lineList.push(lineInfo);
            return true;
        });

        return lineList;
    }

    function getPlanDetailLineList(planRec) {
        var lineList = [];
        var sublistId = 'recmachcustrecord_swc_wl_plan_order_id';
        var lineCount = planRec.getLineCount({ sublistId: sublistId }) || 0;

        for (var i = 0; i < lineCount; i++) {
            lineList.push({
                line: i,
                detailId: planRec.getSublistValue({ sublistId: sublistId, fieldId: 'id', line: i }),
                poId: planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_po_num', line: i }),
                itemId: planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_sku', line: i }),
                amountTotal: toNumber(planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_amount_total', line: i })),
                superiorQty: toNumber(planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_superior_qty_z', line: i })),
                goodQty: toNumber(planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_good_qty_z', line: i })),
                shippedQty: toNumber(planRec.getSublistValue({ sublistId: sublistId, fieldId: 'custrecord_swc_wl_d_shipped_qty', line: i }))
            });
        }

        return lineList;
    }

    function getPurchaseOrderCurrencyMap(detailLineList) {
        var poIdMap = {};
        for (var i = 0; i < detailLineList.length; i++) {
            if (detailLineList[i].poId) {
                poIdMap[String(detailLineList[i].poId)] = true;
            }
        }

        var poIds = Object.keys(poIdMap);
        var currencyMap = {};
        if (!poIds.length) {
            return currencyMap;
        }

        var poSearch = search.create({
            type: 'purchaseorder',
            filters: [
                ['internalid', 'anyof', poIds],
                'AND',
                ['mainline', 'is', 'T']
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'currency' }),
                search.createColumn({ name: 'trandate' })
            ]
        });

        poSearch.run().each(function (result) {
            var poId = result.getValue({ name: 'internalid' });
            currencyMap[String(poId)] = {
                id: result.getValue({ name: 'currency' }) || '',
                text: result.getText({ name: 'currency' }) || '',
                trandate: result.getValue({ name: 'trandate' }) || ''
            };
            return true;
        });

        return currencyMap;
    }

    /**
     * 我把海运保险费按物流发运明细逐行汇总。
     * 每一行的公式是：
     * custrecord_swc_wl_d_amount_total * 数量 * 1.1 * 0.0005
     * 如果 PO 币种是美元，再乘 7。
     */
    function calculateInsuranceEstimatedFee(detailLineList, poCurrencyMap, termsOfTrade) {
        var total = 0;
        var lineAmountMap = {};
        var summaryLines = [];
        for (var i = 0; i < detailLineList.length; i++) {
            var line = detailLineList[i];
            var qty = getPlanDetailLineQty(line);
            if (qty <= 0 || line.amountTotal <= 0) {
                lineAmountMap[String(line.line)] = 0;
                summaryLines.push({
                    物流发运明细ID: line.detailId,
                    采购订单ID: line.poId || '',
                    SKU: line.itemId || '',
                    金额: line.amountTotal,
                    数量: qty,
                    转换前币种: '',
                    汇率: 1,
                    汇率转换前金额: 0,
                    当前行计算结果: 0,
                    计算公式: '金额 * 数量 * 1.1 * 0.0005',
                    跳过原因: qty <= 0 ? '数量为空或0' : '金额为空或0'
                });
                continue;
            }

            var baseAmount = round2(line.amountTotal * qty * 1.1 * 0.0005);
            var poCurrencyInfo = poCurrencyMap[String(line.poId)] || {};
            var sourceCurrency = formatInsuranceCurrencyLog(poCurrencyInfo.text || poCurrencyInfo.id || '');
            var rateApplied = isInsuranceExchangeRateApplied(poCurrencyInfo);
            var exchangeRate = rateApplied ? getInsuranceExchangeRateToRmb(poCurrencyInfo) : 1;
            var lineAmount = round2(baseAmount * exchangeRate);
            lineAmountMap[String(line.line)] = lineAmount;
            summaryLines.push({
                物流发运明细ID: line.detailId,
                采购订单ID: line.poId || '',
                采购订单日期: poCurrencyInfo.trandate || '',
                采购订单币种ID: poCurrencyInfo.id || '',
                采购订单币种: poCurrencyInfo.text || '',
                目标币种ID: getCurrencyIdByDefaultCode('RMB') || '',
                SKU: line.itemId || '',
                金额: line.amountTotal,
                数量: qty,
                转换前币种: sourceCurrency,
                转换后币种: 'rmb',
                是否需要汇率: rateApplied ? '是' : '否',
                汇率: exchangeRate,
                汇率转换前金额: baseAmount,
                当前行计算结果: lineAmount,
                计算公式: buildInsuranceFormulaLog(line.amountTotal, qty, sourceCurrency, rateApplied),
                跳过原因: ''
            });

            total = round2(total + lineAmount);
        }
        logInsuranceEstimatedFeeSummary({
            成交方式: termsOfTrade || '',
            明细行数: detailLineList.length,
            目标币种: 'rmb',
            汇率缓存命中次数: insuranceExchangeRateStats.hit,
            汇率实际查询次数: insuranceExchangeRateStats.miss,
            汇率缓存Key数: Object.keys(insuranceExchangeRateCache).length,
            合计计算结果: total
        }, summaryLines);
        return {
            total: total,
            lineAmountMap: lineAmountMap
        };
    }

    function logInsuranceEstimatedFeeSummary(summary, calculatedLines) {
        calculatedLines = calculatedLines || [];
        var chunkSize = 10;
        log.audit('INSURANCE_ESTIMATED_FEE_SUMMARY', summary);
        for (var i = 0; i < calculatedLines.length; i += chunkSize) {
            log.audit('INSURANCE_ESTIMATED_FEE_LINES_' + (Math.floor(i / chunkSize) + 1), {
                起始序号: i + 1,
                结束序号: Math.min(i + chunkSize, calculatedLines.length),
                总行数: calculatedLines.length,
                合计计算结果: summary.合计计算结果,
                每行计算结果: calculatedLines.slice(i, i + chunkSize)
            });
        }
    }

    function isInsuranceExchangeRateApplied(poCurrencyInfo) {
        poCurrencyInfo = poCurrencyInfo || {};
        var poCurrencyText = poCurrencyInfo.text || '';
        return !isRmbCurrency(poCurrencyText);
    }

    function formatInsuranceCurrencyLog(currencyText) {
        var text = String(currencyText || '').toUpperCase();
        if (!text) return '';
        if (text.indexOf('USD') !== -1 || text.indexOf('美元') !== -1) return 'usd';
        if (text.indexOf('CNY') !== -1 || text.indexOf('RMB') !== -1 || text.indexOf('人民币') !== -1) return 'rmb';
        if (text.indexOf('CAD') !== -1) return 'cad';
        if (text.indexOf('EUR') !== -1) return 'eur';
        if (text.indexOf('GBP') !== -1) return 'gbp';
        return String(currencyText || '').toLowerCase();
    }

    function buildInsuranceFormulaLog(amountTotal, qty, sourceCurrency, rateApplied) {
        var baseFormula = String(amountTotal) + ' * ' + String(qty) + ' * 1.1 * 0.0005';
        if (rateApplied) {
            return baseFormula + '，并按' + sourceCurrency + '->rmb汇率转换';
        }
        return baseFormula;
    }

    function convertInsuranceAmountToRmb(amount, poCurrencyInfo) {
        amount = round2(amount);
        poCurrencyInfo = poCurrencyInfo || {};
        var poCurrencyText = poCurrencyInfo.text || '';
        var poCurrencyId = poCurrencyInfo.id || '';
        if (amount <= 0) {
            return amount;
        }

        if (isRmbCurrency(poCurrencyText) || !poCurrencyId) {
            return amount;
        }

        var rmbCurrencyId = getCurrencyIdByDefaultCode('RMB');
        if (!rmbCurrencyId || String(rmbCurrencyId) === String(poCurrencyId)) {
            return amount;
        }

        return round2(amount * getInsuranceExchangeRateToRmb(poCurrencyInfo));
    }

    function getInsuranceExchangeRateToRmb(poCurrencyInfo) {
        poCurrencyInfo = poCurrencyInfo || {};
        var poCurrencyText = poCurrencyInfo.text || '';
        var poCurrencyId = poCurrencyInfo.id || '';
        var poTranDate = poCurrencyInfo.trandate || '';
        if (isRmbCurrency(poCurrencyText) || !poCurrencyId) {
            return 1;
        }

        var rmbCurrencyId = getCurrencyIdByDefaultCode('RMB');
        if (!rmbCurrencyId || String(rmbCurrencyId) === String(poCurrencyId)) {
            return 1;
        }

        try {
            var sourceCurrencyCode = getCurrencyCodeFromCurrencyInfo(poCurrencyInfo);
            if (sourceCurrencyCode === 'USD') {
                return 7;
            }
            var cacheKey = [
                String(sourceCurrencyCode || ''),
                String(rmbCurrencyId || ''),
                formatSearchDate(poTranDate) || String(poTranDate || '')
            ].join('|');
            if (Object.prototype.hasOwnProperty.call(insuranceExchangeRateCache, cacheKey)) {
                insuranceExchangeRateStats.hit += 1;
                return insuranceExchangeRateCache[cacheKey];
            }

            insuranceExchangeRateStats.miss += 1;
            var exchangeRate = round6(getCurrencyRateBySourceCurrencyCode(sourceCurrencyCode, rmbCurrencyId, poTranDate));
            insuranceExchangeRateCache[cacheKey] = exchangeRate;
            return exchangeRate;
        } catch (e) {
            log.error('getInsuranceExchangeRateToRmb error', {
                poCurrencyId: poCurrencyId,
                poCurrencyText: poCurrencyText,
                poTranDate: poTranDate,
                errorName: e && e.name,
                errorMessage: e && e.message
            });
            return 1;
        }
    }

    function getCurrencyCodeFromCurrencyInfo(poCurrencyInfo) {
        var currencyText = String((poCurrencyInfo && poCurrencyInfo.text) || '').toUpperCase();
        if (currencyText.indexOf('USD') !== -1 || currencyText.indexOf('美元') !== -1) return 'USD';
        if (currencyText.indexOf('CNY') !== -1 || currencyText.indexOf('RMB') !== -1 || currencyText.indexOf('人民币') !== -1) return 'RMB';
        if (currencyText.indexOf('CAD') !== -1) return 'CAD';
        if (currencyText.indexOf('EUR') !== -1) return 'EUR';
        if (currencyText.indexOf('GBP') !== -1) return 'GBP';
        return '';
    }

    /**
     * 我把目的国进口关税按物流发运明细逐行汇总。
     * 计算公式是：
     * 清关价单价 * 数量 * 税率
     * 不做币种转换，直接按清关价字段原币种汇总。
     * 其中清关价字段由运抵国决定，美国(US)场合最后总额再加 40。
     */
    function calculateImportDutyEstimatedFee(detailLineList, countryCode, clearancePriceFieldId, isUsCountry, poCurrencyMap, mainStore, createDate) {
        var skuMap = {};
        for (var i = 0; i < detailLineList.length; i++) {
            if (detailLineList[i].itemId) {
                skuMap[String(detailLineList[i].itemId)] = true;
            }
        }

        var skuIds = Object.keys(skuMap);
        if (!skuIds.length || !countryCode || !clearancePriceFieldId) {
            return {
                total: 0,
                lineAmountMap: {}
            };
        }

        var clearancePriceMap = getClearancePriceMap(skuIds, clearancePriceFieldId, mainStore, createDate);
        var countryInternalId = getCountryInternalIdByCountryCode(countryCode);
        var taxRateMap = getSkuTaxRateMap(skuIds, countryInternalId);
        var dutyCurrencyCode = getDutyCurrencyCodeByCountry(countryCode);
        var total = 0;
        var lineAmountMap = {};
        var summaryLines = [];

        for (var j = 0; j < detailLineList.length; j++) {
            var line = detailLineList[j];
            var qty = getPlanDetailLineQty(line);
            if (qty <= 0 || !line.itemId) {
                lineAmountMap[String(line.line)] = 0;
                summaryLines.push({
                    物流发运明细ID: line.detailId,
                    SKU: line.itemId,
                    数量: qty,
                    清关价单价: 0,
                    税率: 0,
                    汇率: 1,
                    当前行计算结果: 0,
                    跳过原因: qty <= 0 ? '数量为空或0' : 'SKU为空'
                });
                continue;
            }

            var unitPrice = toNumber(clearancePriceMap[String(line.itemId)]);
            var taxRate = toNumber(taxRateMap[String(line.itemId)]);
            if (unitPrice <= 0) {
                lineAmountMap[String(line.line)] = 0;
                summaryLines.push({
                    物流发运明细ID: line.detailId,
                    SKU: line.itemId,
                    数量: qty,
                    清关价单价: unitPrice,
                    税率: taxRate,
                    汇率: 1,
                    当前行计算结果: 0,
                    跳过原因: '清关价为空或0'
                });
                continue;
            }

            var lineAmount = unitPrice * qty * taxRate;
            var exchangeRate = 1;
            lineAmount = round2(lineAmount);
            lineAmountMap[String(line.line)] = lineAmount;
            summaryLines.push({
                物流发运明细ID: line.detailId,
                SKU: line.itemId,
                数量: qty,
                清关价单价: unitPrice,
                税率: taxRate,
                汇率: exchangeRate,
                当前行计算结果: lineAmount,
                跳过原因: ''
            });

            total = round2(total + lineAmount);
        }

        var usSurcharge = 0;
        if (isUsCountry) {
            usSurcharge = 40;
            total = round2(total + 40);
        }
        logImportDutyEstimatedFeeSummary({
            运抵国代码: countryCode,
            清关价字段: clearancePriceFieldId,
            主店铺: mainStore || '',
            物流发运单创建日期: createDate || '',
            关税币种: dutyCurrencyCode,
            是否美国: isUsCountry,
            美国额外加40: usSurcharge,
            明细行数: detailLineList.length,
            合计计算结果: total
        }, summaryLines);
        return {
            total: total,
            lineAmountMap: lineAmountMap
        };
    }

    function logImportDutyEstimatedFeeSummary(summary, calculatedLines) {
        calculatedLines = calculatedLines || [];
        var chunkSize = 10;
        log.audit('IMPORT_DUTY_ESTIMATED_FEE_SUMMARY', summary);
        for (var i = 0; i < calculatedLines.length; i += chunkSize) {
            log.audit('IMPORT_DUTY_ESTIMATED_FEE_LINES_' + (Math.floor(i / chunkSize) + 1), {
                起始序号: i + 1,
                结束序号: Math.min(i + chunkSize, calculatedLines.length),
                总行数: calculatedLines.length,
                合计计算结果: summary.合计计算结果,
                每行计算结果: calculatedLines.slice(i, i + chunkSize)
            });
        }
    }

    function applyInsuranceAndDutyToPlanDetail(planRec, insuranceLineAmountMap, dutyLineAmountMap, countryCode) {
        var sublistId = 'recmachcustrecord_swc_wl_plan_order_id';
        var lineCount = planRec.getLineCount({ sublistId: sublistId }) || 0;
        var insuranceCurrency = 1;
        var dutyCurrency = getDutyCurrencyInternalIdByCountryCode(countryCode);
        var lineSummary = [];

        for (var i = 0; i < lineCount; i++) {
            var insuranceAmount = round2(toNumber((insuranceLineAmountMap || {})[String(i)]));
            var dutyAmount = round2(toNumber((dutyLineAmountMap || {})[String(i)]));

            planRec.setSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_swc_wl_d_em_bxf_fee',
                line: i,
                value: insuranceAmount
            });
            if (insuranceCurrency) {
                planRec.setSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_swc_wl_d_em_bxf_fee_c',
                    line: i,
                    value: insuranceCurrency
                });
            }

            planRec.setSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_swc_wl_d_em_jkgs_fee',
                line: i,
                value: dutyAmount
            });
            if (dutyCurrency) {
                planRec.setSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_swc_wl_d_em_jkgs_fee_c',
                    line: i,
                    value: dutyCurrency
                });
            }
            lineSummary.push({
                line: i,
                detailId: planRec.getSublistValue({ sublistId: sublistId, fieldId: 'id', line: i }),
                insuranceAmount: insuranceAmount,
                insuranceCurrency: insuranceCurrency,
                dutyAmount: dutyAmount,
                dutyCurrency: dutyCurrency || ''
            });
        }

        planRec.save({
            enableSourcing: false,
            ignoreMandatoryFields: true
        });
        log.audit('applyInsuranceAndDutyToPlanDetail saved', {
            recordId: planRec.id || '',
            countryCode: countryCode || '',
            lineCount: lineCount,
            lineSummary: lineSummary
        });
    }

    function syncDestinationPortCustomsClearanceFee(wlPlanOrderId) {
        if (!wlPlanOrderId) return;

        var wlPlanRecord = record.load({
            type: 'customrecord_swc_wl_plan_order',
            id: wlPlanOrderId,
            isDynamic: false
        });

        var mdLocation = wlPlanRecord.getValue({ fieldId: 'custrecord_swc_md_location' });
        var transferWay = wlPlanRecord.getValue({ fieldId: 'custrecord_swc_wl_trasfer_way' });
        var countryValue = wlPlanRecord.getValue({ fieldId: 'custrecord_swc_wl_county_lsit' });
        var countryText = wlPlanRecord.getText({ fieldId: 'custrecord_swc_wl_county_lsit' });
        var countryCode = normalizeCountryCode(countryValue, countryText);
        log.audit('syncDestinationPortCustomsClearanceFee params', {
            wlPlanOrderId: wlPlanOrderId,
            mdLocation: mdLocation,
            transferWay: transferWay,
            countryValue: countryValue,
            countryText: countryText,
            countryCode: countryCode
        });

        if (String(mdLocation || '') !== '41') {
            log.audit('syncDestinationPortCustomsClearanceFee skipped', {
                reason: 'mdLocation_not_41',
                mdLocation: mdLocation
            });
            return;
        }
        if (String(transferWay || '') !== '4' && String(transferWay || '') !== '5') {
            log.audit('syncDestinationPortCustomsClearanceFee skipped', {
                reason: 'transferWay_not_4_or_5',
                transferWay: transferWay
            });
            return;
        }

        var targetCurrencyCode = getDutyCurrencyCodeByCountry(countryCode);
        var targetCurrencyId = getDutyCurrencyInternalIdByCountryCode(countryCode);
        if (!targetCurrencyCode || !targetCurrencyId) {
            log.audit('syncDestinationPortCustomsClearanceFee skipped', {
                reason: 'currency_not_found',
                运抵国代码: countryCode,
                targetCurrencyCode: targetCurrencyCode,
                targetCurrencyId: targetCurrencyId
            });
            return;
        }

        var feeAmount = 90;
        var exchangeRate = 1;
        if (String(countryCode || '').toUpperCase() !== 'US') {
            exchangeRate = getCurrencyRateByCurrencyCodes('USD', targetCurrencyCode, new Date());
            feeAmount = round2(90 * exchangeRate);
        }
        log.audit('syncDestinationPortCustomsClearanceFee amount', {
            wlPlanOrderId: wlPlanOrderId,
            运抵国代码: countryCode,
            targetCurrencyCode: targetCurrencyCode,
            targetCurrencyId: targetCurrencyId,
            汇率: exchangeRate,
            feeAmount: feeAmount
        });

        var matchedLineCount = 0;
        var feeSearch = search.create({
            type: 'customrecord_swc_wl_first_leg_cost',
            filters: [
                ['custrecord_swc_wl_first_leg_cost_id', 'anyof', String(wlPlanOrderId)],
                'AND',
                ['custrecord_swc_flc_fee_type_z', 'anyof', FEE_TYPE_MDGQGF]
            ],
            columns: [
                search.createColumn({ name: 'internalid' })
            ]
        });

        feeSearch.run().each(function (result) {
            var lineId = result.getValue({ name: 'internalid' });
            if (!lineId) {
                return true;
            }
            matchedLineCount++;

            record.submitFields({
                type: 'customrecord_swc_wl_first_leg_cost',
                id: lineId,
                values: {
                    custrecord_swc_wl_flc_yg_fee: feeAmount,
                    custrecord_swc_wl_flc_yg_currency: Number(targetCurrencyId)
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            log.audit('syncDestinationPortCustomsClearanceFee updated', {
                wlPlanOrderId: wlPlanOrderId,
                lineId: lineId,
                feeAmount: feeAmount,
                currencyId: Number(targetCurrencyId)
            });
            return true;
        });
        if (!matchedLineCount) {
            log.audit('syncDestinationPortCustomsClearanceFee skipped', {
                reason: 'fee_type_6_not_found',
                wlPlanOrderId: wlPlanOrderId
            });
        }
    }

    function rebalanceLineAmountMap(lineAmountMap, targetTotal) {
        lineAmountMap = lineAmountMap || {};
        targetTotal = round2(toNumber(targetTotal));

        var keys = Object.keys(lineAmountMap);
        if (!keys.length) {
            return lineAmountMap;
        }

        var currentTotal = 0;
        var positiveKeys = [];
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = round2(toNumber(lineAmountMap[key]));
            lineAmountMap[key] = value;
            currentTotal = round2(currentTotal + value);
            if (value > 0) {
                positiveKeys.push(key);
            }
        }

        var diffCents = Math.round((targetTotal - currentTotal) * 100);
        if (diffCents === 0) {
            return lineAmountMap;
        }

        var allocKeys = positiveKeys.length ? positiveKeys : keys;
        var weightTotal = 0;
        var weights = [];
        for (var j = 0; j < allocKeys.length; j++) {
            var weight = round2(toNumber(lineAmountMap[allocKeys[j]]));
            if (weight <= 0) weight = 1;
            weights.push(weight);
            weightTotal += weight;
        }

        var allocated = new Array(allocKeys.length);
        var allocatedSum = 0;
        var sign = diffCents >= 0 ? 1 : -1;
        var absDiff = Math.abs(diffCents);
        var decimals = [];
        for (var k = 0; k < allocKeys.length; k++) {
            var raw = weights[k] * (absDiff / weightTotal);
            var base = Math.floor(raw);
            allocated[k] = base;
            allocatedSum += base;
            decimals[k] = raw - base;
        }

        var rest = absDiff - allocatedSum;
        while (rest > 0) {
            var maxIndex = 0;
            for (var m = 1; m < decimals.length; m++) {
                if (decimals[m] > decimals[maxIndex]) {
                    maxIndex = m;
                }
            }
            allocated[maxIndex] += 1;
            decimals[maxIndex] = -1;
            rest--;
        }

        for (var n = 0; n < allocKeys.length; n++) {
            var lineKey = allocKeys[n];
            lineAmountMap[lineKey] = round2(toNumber(lineAmountMap[lineKey]) + sign * allocated[n] / 100);
        }

        return lineAmountMap;
    }

    /**
     * 我按传入的清关价字段去取 SKU 对应单价。
     * 这个字段已经在外层根据运抵国换算好了，不在这里再做国家判断。
     */
    function getClearancePriceMap(skuIds, priceFieldId, mainStore, createDate) {
        var priceMap = {};
        if (!skuIds || !skuIds.length || !priceFieldId) {
            return priceMap;
        }

        var filters = [
            search.createFilter({
                name: 'isinactive',
                operator: search.Operator.IS,
                values: 'F'
            }),
            search.createFilter({
                name: 'custrecord_clearance_price_detail_sku',
                operator: search.Operator.ANYOF,
                values: skuIds
            })
        ];
        if (createDate) {
            filters.push(search.createFilter({
                name: 'custrecordcustrecord_swc_effective_date',
                operator: search.Operator.ONORBEFORE,
                values: formatSearchDate(createDate)
            }));
        }

        var priceSearch = search.create({
            type: 'customrecord_swc_clearance_price_detail',
            filters: filters,
            columns: [
                search.createColumn({ name: 'custrecord_clearance_price_detail_sku' }),
                search.createColumn({ name: priceFieldId }),
                search.createColumn({ name: 'custrecord_clearance_price_detail_main' }),
                search.createColumn({ name: 'custrecordcustrecord_swc_effective_date' })
            ]
        });

        var matchedRows = [];
        priceSearch.run().each(function (result) {
            var skuId = result.getValue({ name: 'custrecord_clearance_price_detail_sku' });
            var priceValue = toNumber(result.getValue({ name: priceFieldId }));
            priceMap[String(skuId)] = priceValue;
            matchedRows.push({
                SKU: skuId,
                清关价: priceValue,
                清关价主表ID: result.getValue({ name: 'custrecord_clearance_price_detail_main' }),
                生效日期: result.getValue({ name: 'custrecordcustrecord_swc_effective_date' })
            });
            return true;
        });
        log.audit('CLEARANCE_PRICE_SEARCH_SUMMARY', {
            SKU列表: skuIds,
            清关价字段: priceFieldId,
            主店铺: mainStore || '',
            是否使用子公司条件: false,
            物流发运单创建日期: createDate || '',
            格式化后创建日期: createDate ? formatSearchDate(createDate) : '',
            命中行数: matchedRows.length,
            命中明细: matchedRows.slice(0, 20),
            价格Map: priceMap
        });

        return priceMap;
    }

    function formatSearchDate(dateValue) {
        if (!dateValue) return dateValue;
        try {
            return format.format({
                value: dateValue,
                type: format.Type.DATE
            });
        } catch (e) {
            return dateValue;
        }
    }

    /**
     * 我把运抵国代码映射成清关价维护单的价格字段。
     * 支持的国家代码：
     * US -> USD
     * CA -> CAD
     * DE/FR/IT/ES/NL -> EUR
     * GB/UK -> GBP
     * 其余国家返回空，后续按 0 处理，不抛异常。
     */
    function getClearancePriceFieldIdByCountry(countryId) {
        var countryCode = String(countryId || '').toUpperCase();
        if (countryCode === 'US') return 'custrecord_clearance_price_detail_usd';
        if (countryCode === 'CA') return 'custrecord_clearance_price_detail_cad';
        if (countryCode === 'DE' || countryCode === 'FR' || countryCode === 'IT' || countryCode === 'ES' || countryCode === 'NL') {
            return 'custrecord_clearance_price_detail_eur';
        }
        if (countryCode === 'GB' || countryCode === 'UK') return 'custrecord_clearance_price_detail_gbp';
        return '';
    }

    function getDutyCurrencyCodeByCountry(countryId) {
        var countryCode = String(countryId || '').toUpperCase();
        if (countryCode === 'US') return 'USD';
        if (countryCode === 'CA') return 'CAD';
        if (countryCode === 'DE' || countryCode === 'FR' || countryCode === 'IT' || countryCode === 'ES' || countryCode === 'NL') {
            return 'EUR';
        }
        if (countryCode === 'GB' || countryCode === 'UK') return 'GBP';
        return '';
    }

    function getDutyCurrencyInternalIdByCountryCode(countryCode) {
        var dutyCurrencyCode = getDutyCurrencyCodeByCountry(countryCode);
        return getCurrencyIdByCurrencyCode(dutyCurrencyCode);
    }

    function getCountryInternalIdByCountryCode(countryCode) {
        countryCode = String(countryCode || '').toUpperCase();
        if (countryCode === 'US') return String(CONFIG.COUNTRY_ID_US);
        if (countryCode === 'CA') return '37';
        if (countryCode === 'DE') return '57';
        if (countryCode === 'FR') return '75';
        if (countryCode === 'IT') return '110';
        if (countryCode === 'ES') return '68';
        if (countryCode === 'NL') return '166';
        if (countryCode === 'GB' || countryCode === 'UK') return String(CONFIG.COUNTRY_ID_GB);
        return '';
    }

    function normalizeCountryCode(countryValue, countryText) {
        var rawValue = String(countryValue || '').trim();
        var rawText = String(countryText || '').trim();
        var upperValue = rawValue.toUpperCase();
        var upperText = rawText.toUpperCase();

        if (upperValue === 'US' || upperValue === 'CA' || upperValue === 'DE' || upperValue === 'FR'
            || upperValue === 'IT' || upperValue === 'ES' || upperValue === 'NL'
            || upperValue === 'GB' || upperValue === 'UK') {
            return upperValue;
        }

        if (upperText === 'US' || upperText === 'CA' || upperText === 'DE' || upperText === 'FR'
            || upperText === 'IT' || upperText === 'ES' || upperText === 'NL'
            || upperText === 'GB' || upperText === 'UK') {
            return upperText;
        }

        if (rawValue === String(CONFIG.COUNTRY_ID_US) || rawText.indexOf('美国') !== -1 || rawText.indexOf('美利坚') !== -1) return 'US';
        if (rawText.indexOf('加拿大') !== -1) return 'CA';
        if (rawText.indexOf('德国') !== -1) return 'DE';
        if (rawText.indexOf('法国') !== -1) return 'FR';
        if (rawText.indexOf('意大利') !== -1) return 'IT';
        if (rawText.indexOf('西班牙') !== -1) return 'ES';
        if (rawText.indexOf('荷兰') !== -1) return 'NL';
        if (rawText.indexOf('英国') !== -1) return 'GB';

        return upperValue;
    }

    function getSkuTaxRateMap(skuIds, countryId) {
        var taxRateMap = {};
        if (!skuIds || !skuIds.length || !countryId) {
            return taxRateMap;
        }

        var taxSearch = search.create({
            type: 'customrecord_swc_sku_hscode_ys',
            filters: [
                ['custrecord_swc_ys_country', 'anyof', countryId],
                'AND',
                ['custrecord_swc_ys_item', 'anyof', skuIds],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'custrecord_swc_ys_item' }),
                search.createColumn({ name: 'custrecord_swc_tax_rate' })
            ]
        });

        taxSearch.run().each(function (result) {
            var skuId = result.getValue({ name: 'custrecord_swc_ys_item' });
            var rawTaxRate = result.getValue({ name: 'custrecord_swc_tax_rate' });
            taxRateMap[String(skuId)] = parsePercentRate(rawTaxRate);
            return true;
        });

        return taxRateMap;
    }

    function getPlanDetailLineQty(line) {
        if (toNumber(line.superiorQty) > 0) return toNumber(line.superiorQty);
        if (toNumber(line.goodQty) > 0) return toNumber(line.goodQty);
        return toNumber(line.shippedQty);
    }

    function isUsdCurrency(currencyText) {
        currencyText = String(currencyText || '').toUpperCase();
        return currencyText.indexOf('USD') !== -1 || currencyText.indexOf('美元') !== -1;
    }

    function isRmbCurrency(currencyText) {
        currencyText = String(currencyText || '').toUpperCase();
        return currencyText.indexOf('CNY') !== -1
            || currencyText.indexOf('RMB') !== -1
            || currencyText.indexOf('人民币') !== -1;
    }

    function getDefaultCurrencyByFeeTypeAndTerms(feeTypeZ, termsOfTrade) {
        feeTypeZ = String(feeTypeZ || '');
        termsOfTrade = String(termsOfTrade || '');

        if (feeTypeZ === FEE_TYPE_BXF) {
            if (termsOfTrade === '3' || termsOfTrade === '4') return 'RMB';
            if (termsOfTrade === '1' || termsOfTrade === '2' || termsOfTrade === '5') return 'USD';
        }

        if (feeTypeZ === FEE_TYPE_JKGS) {
            if (termsOfTrade === '3') return 'RMB';
            if (termsOfTrade === '1' || termsOfTrade === '2' || termsOfTrade === '4' || termsOfTrade === '5') return 'USD';
        }

        return '';
    }

    function getDefaultCurrencyInternalIdByFeeTypeAndTerms(feeTypeZ, termsOfTrade) {
        var defaultCurrency = getDefaultCurrencyByFeeTypeAndTerms(feeTypeZ, termsOfTrade);
        var currencyId = getCurrencyIdByDefaultCode(defaultCurrency);
        return currencyId ? Number(currencyId) : '';
    }

    var currencyIdCache = {};
    var insuranceExchangeRateCache = {};
    var insuranceExchangeRateStats = { hit: 0, miss: 0 };
    var exchangeRateCache = {};

    function convertAmountByDefaultCurrency(amount, defaultCurrency, poCurrencyInfo) {
        amount = round2(amount);
        defaultCurrency = String(defaultCurrency || '').toUpperCase();
        poCurrencyInfo = poCurrencyInfo || {};
        var poCurrencyText = poCurrencyInfo.text || '';
        var poCurrencyId = poCurrencyInfo.id || '';
        var poTranDate = poCurrencyInfo.trandate || '';
        if (amount <= 0 || !defaultCurrency) {
            return amount;
        }

        if (defaultCurrency === 'RMB') {
            if (isUsdCurrency(poCurrencyText)) {
                var rmbConverted = round2(amount * getStandardCurrencyRate('RMB', poCurrencyId, poTranDate));
                return rmbConverted;
            }
            return amount;
        }

        if (defaultCurrency === 'USD') {
            if (isRmbCurrency(poCurrencyText)) {
                var usdConverted = round2(amount / getStandardCurrencyRate('USD', poCurrencyId, poTranDate));
                return usdConverted;
            }
            return amount;
        }

        return amount;
    }

    function getStandardCurrencyRate(defaultCurrency, targetCurrencyId, tranDate) {
        defaultCurrency = String(defaultCurrency || '').toUpperCase();
        targetCurrencyId = String(targetCurrencyId || '');
        if (!defaultCurrency || !targetCurrencyId) {
            return 1;
        }

        var sourceCurrencyId = getCurrencyIdByDefaultCode(defaultCurrency);
        if (!sourceCurrencyId || sourceCurrencyId === targetCurrencyId) {
            return 1;
        }

        try {
            var exchangeDate = toDateValue(tranDate) || new Date();
            return Number(currency.exchangeRate({
                source: Number(sourceCurrencyId),
                target: Number(targetCurrencyId),
                date: exchangeDate
            })) || 1;
        } catch (e) {
            log.error('getStandardCurrencyRate error', e);
            return 1;
        }
    }

    function getCurrencyRateBySourceCurrencyCode(sourceCurrencyCode, targetCurrencyId, tranDate) {
        sourceCurrencyCode = String(sourceCurrencyCode || '').toUpperCase();
        targetCurrencyId = String(targetCurrencyId || '');
        if (!sourceCurrencyCode || !targetCurrencyId) {
            return 1;
        }

        var sourceCurrencyId = getCurrencyIdByCurrencyCode(sourceCurrencyCode);
        if (!sourceCurrencyId || String(sourceCurrencyId) === targetCurrencyId) {
            return 1;
        }

        try {
            var exchangeDate = toDateValue(tranDate) || new Date();
            var cacheKey = ['SRC', sourceCurrencyId, targetCurrencyId, formatSearchDate(exchangeDate) || ''].join('|');
            if (Object.prototype.hasOwnProperty.call(exchangeRateCache, cacheKey)) {
                return exchangeRateCache[cacheKey];
            }
            var rate = Number(currency.exchangeRate({
                source: Number(sourceCurrencyId),
                target: Number(targetCurrencyId),
                date: exchangeDate
            })) || 1;
            exchangeRateCache[cacheKey] = rate;
            return rate;
        } catch (e) {
            log.error('getCurrencyRateBySourceCurrencyCode error', e);
            return 1;
        }
    }

    function getCurrencyRateByCurrencyCodes(sourceCurrencyCode, targetCurrencyCode, tranDate) {
        sourceCurrencyCode = String(sourceCurrencyCode || '').toUpperCase();
        targetCurrencyCode = String(targetCurrencyCode || '').toUpperCase();
        if (!sourceCurrencyCode || !targetCurrencyCode || sourceCurrencyCode === targetCurrencyCode) {
            return 1;
        }

        var sourceCurrencyId = getCurrencyIdByCurrencyCode(sourceCurrencyCode);
        var targetCurrencyId = getCurrencyIdByCurrencyCode(targetCurrencyCode);
        if (!sourceCurrencyId || !targetCurrencyId) {
            return 1;
        }

        try {
            return Number(currency.exchangeRate({
                source: Number(sourceCurrencyId),
                target: Number(targetCurrencyId),
                date: tranDate || new Date()
            })) || 1;
        } catch (e) {
            log.error('getCurrencyRateByCurrencyCodes error', e);
            return 1;
        }
    }

    function getCurrencyIdByDefaultCode(currencyCode) {
        currencyCode = String(currencyCode || '').toUpperCase();
        if (!currencyCode) return '';
        if (currencyIdCache[currencyCode]) return currencyIdCache[currencyCode];

        var keywordList = [];
        if (currencyCode === 'USD') {
            keywordList = ['USD', '美元'];
        } else if (currencyCode === 'RMB') {
            keywordList = ['CNY', 'RMB', '人民币'];
        }

        if (!keywordList.length) return '';

        var currencySearch = search.create({
            type: 'currency',
            filters: [
                ['isinactive', 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'name' }),
                search.createColumn({ name: 'symbol' })
            ]
        });

        var currencyId = '';
        currencySearch.run().each(function (result) {
            var name = String(result.getValue({ name: 'name' }) || '').toUpperCase();
            var symbol = String(result.getValue({ name: 'symbol' }) || '').toUpperCase();
            for (var i = 0; i < keywordList.length; i++) {
                var keyword = String(keywordList[i] || '').toUpperCase();
                if (name.indexOf(keyword) !== -1 || symbol.indexOf(keyword) !== -1) {
                    currencyId = result.getValue({ name: 'internalid' }) || '';
                    return false;
                }
            }
            return true;
        });

        currencyIdCache[currencyCode] = currencyId;
        return currencyId;
    }

    function getCurrencyIdByCurrencyCode(currencyCode) {
        currencyCode = String(currencyCode || '').toUpperCase();
        if (!currencyCode) return '';
        if (currencyIdCache[currencyCode]) return currencyIdCache[currencyCode];

        var currencySearch = search.create({
            type: 'currency',
            filters: [
                ['isinactive', 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'name' }),
                search.createColumn({ name: 'symbol' })
            ]
        });

        var currencyId = '';
        currencySearch.run().each(function (result) {
            var name = String(result.getValue({ name: 'name' }) || '').toUpperCase();
            var symbol = String(result.getValue({ name: 'symbol' }) || '').toUpperCase();
            if (name.indexOf(currencyCode) !== -1 || symbol.indexOf(currencyCode) !== -1) {
                currencyId = result.getValue({ name: 'internalid' }) || '';
                return false;
            }
            return true;
        });

        currencyIdCache[currencyCode] = currencyId;
        return currencyId;
    }

    function toDateValue(value) {
        if (!value) return null;
        if (Object.prototype.toString.call(value) === '[object Date]') {
            return isNaN(value.getTime()) ? null : value;
        }

        try {
            var parsedByFormat = format.parse({
                value: value,
                type: format.Type.DATE
            });
            if (parsedByFormat && !isNaN(parsedByFormat.getTime())) {
                return parsedByFormat;
            }
        } catch (e) {
            log.debug('toDateValue format.parse failed', {
                value: value,
                message: e && e.message
            });
        }

        var parsedByNative = new Date(value);
        if (!isNaN(parsedByNative.getTime())) {
            return parsedByNative;
        }

        return null;
    }

    function parsePercentRate(rateValue) {
        var rateText = String(rateValue || '').replace('%', '').trim();
        if (!rateText) return 0;

        var rate = Number(rateText);
        if (!isFinite(rate)) return 0;

        return rate > 1 ? rate / 100 : rate;
    }

    function toNumber(value) {
        var n = Number(value);
        return isFinite(n) ? n : 0;
    }

    function round2(n) {
        n = toNumber(n);
        return Math.round((n + Number.EPSILON) * 100) / 100;
    }

    function round6(n) {
        n = toNumber(n);
        return Math.round((n + Number.EPSILON) * 1000000) / 1000000;
    }

    /**
     * 我这里复用创建时的匹配规则，用运抵国 + 目的仓取第一个供应商。
     * @param {string|number} countyLsit
     * @param {string|number} mdLocation
     * @returns {string}
     */
    function getFirstVendorByCountryAndLocation(countyLsit, mdLocation) {
        if (!countyLsit || !mdLocation) return '';

        var vendorSearchObj = search.create({
            type: search.Type.VENDOR,
            filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                ['custentity_swc_destination_country', 'anyof', countyLsit],
                'AND',
                // 供应商目的仓字段是多选字段，用 anyof 匹配“包含当前目的仓”的供应商。
                ['custentity_swc_destination_arehouse_cod', 'anyof', [String(mdLocation)]]
            ],
            columns: [
                search.createColumn({ name: 'internalid', sort: search.Sort.ASC })
            ]
        });

        var result = vendorSearchObj.run().getRange({ start: 0, end: 1 });
        if (result && result.length > 0) {
            return result[0].getValue({ name: 'internalid' }) || '';
        }
        return '';
    }

    function isAllPoCyVendBillFilled(billId) {
        if (!billId) return false;

        var CHILD_RECORD_TYPE = 'customrecord_swc_wl_po_fee';
        var LINK_FIELD_ID = 'custrecord_swc_wl_po_fee_wl';
        var TARGET_FIELD_ID = 'custrecord_swc_wl_po_cy_vendbill';

        var hasAnyLine = false;
        var allFilled = true;

        var s = search.create({
            type: CHILD_RECORD_TYPE,
            filters: [
                [LINK_FIELD_ID, 'anyof', String(billId)]
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: TARGET_FIELD_ID })
            ]
        });

        s.run().each(function (r) {
            hasAnyLine = true;

            var v = r.getValue({ name: TARGET_FIELD_ID });
            if (v === null || v === '' || typeof v === 'undefined') {
                allFilled = false;
                return false;
            }
            return true;
        });

        if (!hasAnyLine) return false;

        return allFilled;
    }

    function deleteCss() {
        var cssDelete =
            '<script>' +
            '(function(){' +

            '  function findClosestA(el){' +
            '    while(el && el.tagName!=="A"){ el = el.parentElement; }' +
            '    return el;' +
            '  }' +

            '  function isDeleteLink(a){' +
            '    if(!a) return false;' +
            '    var text=(a.textContent||"").trim();' +
            '    var title=(a.getAttribute("title")||"").trim();' +
            '    var aria=(a.getAttribute("aria-label")||"").trim();' +
            '    var hit=(' +
            '      text==="删除"||title==="删除"||aria==="删除"||' +
            '      text==="Delete"||title==="Delete"||aria==="Delete"' +
            '    );' +
            '    if(!hit) return false;' +
            '    var href=a.getAttribute("href")||"";' +
            '    if(!href||href==="#") return false;' +
            '    return true;' +
            '  }' +

            '  function bindDeleteIntercept(doc){' +
            '    if(!doc) return;' +
            '    if(doc.__swc_delete_confirm_bound__) return;' +
            '    doc.__swc_delete_confirm_bound__=true;' +

            '    doc.addEventListener("click", function(e){' +
            '      var a = findClosestA(e.target);' +
            '      if(!isDeleteLink(a)) return;' +

            '      if(a.__swc_skip_once__){' +
            '        a.__swc_skip_once__=false;' +
            '        return;' +
            '      }' +

            '      e.preventDefault();' +
            '      e.stopPropagation();' +
            '      if(e.stopImmediatePropagation) e.stopImmediatePropagation();' +

            '      var win = doc.defaultView || window;' +
            '      var req = (win && win.require) ? win.require : (window && window.require ? window.require : null);' +

            '      if(req){' +
            '        req(["N/ui/dialog"], function(dialog){' +
            '          dialog.confirm({' +
            '            title: "确认",' +
            '            message: "确定要删除这一行吗？<br/>点击“确定”将删除，点击“取消”将保留。"' +
            '          })' +
            '          .then(function(result){' +
            '            if(result===false) return;' +
            '            try{' +
            '              a.__swc_skip_once__=true;' +
            '              a.click();' +
            '            }catch(err){' +
            '              try{' +
            '                var href=a.getAttribute("href")||"";' +
            '                if(/^javascript:/i.test(href)){' +
            '                  (new Function(href.replace(/^javascript:/i,"")))();' +
            '                }else if(href){' +
            '                  window.location.href=href;' +
            '                }' +
            '              }catch(e2){}' +
            '            }' +
            '          })' +
            '          .catch(function(){});' +
            '        });' +
            '      } else {' +
            '        var ok = window.confirm("确定要删除这一行吗？\\n删除后无法追回。");' +
            '        if(!ok) return;' +

            '        try{' +
            '          a.__swc_skip_once__=true;' +
            '          a.click();' +
            '        }catch(err2){' +
            '          try{' +
            '            var href2=a.getAttribute("href")||"";' +
            '            if(/^javascript:/i.test(href2)){' +
            '              (new Function(href2.replace(/^javascript:/i,"")))();' +
            '            }else if(href2){' +
            '              window.location.href=href2;' +
            '            }' +
            '          }catch(e3){}' +
            '        }' +
            '      }' +

            '      return false;' +
            '    }, true);' +
            '  }' +

            '  function bindMainAndIframe(){' +
            '    bindDeleteIntercept(document);' +

            '    var layer = document.querySelector("#recmachcustrecord_swc_wl_plan_order_id_layer");' +
            '    if(!layer) return;' +

            '    function tryBindIframe(){' +
            '      var ifr = layer.querySelector("iframe");' +
            '      if(!ifr) return;' +
            '      try{' +
            '        var idoc = ifr.contentDocument || (ifr.contentWindow && ifr.contentWindow.document);' +
            '        if(idoc) bindDeleteIntercept(idoc);' +
            '      }catch(e){}' +
            '    }' +

            '    tryBindIframe();' +

            '    var ifr2 = layer.querySelector("iframe");' +
            '    if(ifr2){' +
            '      ifr2.addEventListener("load", function(){ setTimeout(tryBindIframe, 50); });' +
            '    }' +

            '    var tries=0;' +
            '    var t=setInterval(function(){' +
            '      tries++;' +
            '      tryBindIframe();' +
            '      if(tries>=40) clearInterval(t);' +
            '    }, 250);' +
            '  }' +

            '  if(document.readyState==="loading"){' +
            '    document.addEventListener("DOMContentLoaded", bindMainAndIframe);' +
            '  }else{' +
            '    bindMainAndIframe();' +
            '  }' +

            '})();' +
            '</script>';

        return cssDelete;
    }

    function injectRequireAndCall(form, modulePath, fnName, fnArgs, readySelector) {
        modulePath = (modulePath || '').replace(/\.js$/i, '');

        var argsJson = JSON.stringify(fnArgs || []);
        var safeSelector = readySelector ? String(readySelector).replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';

        var code =
            "(function(){" +
            "  try{" +
            "    var modulePath='" + modulePath + "';" +
            "    var fnName='" + fnName + "';" +
            "    var args=" + argsJson + ";" +
            "    var readySel='" + safeSelector + "';" +
            "    function callIt(mod){" +
            "      try{" +
            "        if(!mod){console.log('[inject] module null:', modulePath);return;}" +
            "        var fn = mod[fnName];" +
            "        if(typeof fn !== 'function'){console.log('[inject] function not exported:', fnName, mod);return;}" +
            "        fn.apply(mod, args);" +
            "      }catch(e){console.log('[inject] call error', e);}" +
            "    }" +
            "    function waitDomThenCall(mod){" +
            "      if(!readySel){callIt(mod);return;}" +
            "      var tries=0;" +
            "      var t=setInterval(function(){" +
            "        tries++;" +
            "        if(document.querySelector(readySel)){" +
            "          clearInterval(t);" +
            "          callIt(mod);" +
            "          return;" +
            "        }" +
            "        if(tries>=30){clearInterval(t);console.log('[inject] DOM not ready:', readySel);}" +
            "      },300);" +
            "    }" +
            "    require([modulePath], function(mod){ waitDomThenCall(mod); }, function(err){ console.log('[inject] require failed', modulePath, err); });" +
            "  }catch(e){console.log('[inject] fatal', e);}" +
            "})();";

        var field = form.addField({
            id: 'custpage_inject_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
            label: ' ',
            type: 'INLINEHTML'
        });
        field.defaultValue = '<script>' + code + '</script>';
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
