/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @description
 * Demo: NetSuite 预付款申请订单进入审批流后，自动创建飞书审批实例，并同步 NS 侧状态变更到飞书审批流。
 *
 * 触发流程：
 * 1. 用户在 NetSuite 预付款申请订单上点击“提交”。
 * 2. NetSuite 工作流把 custrecord_swc_advancepay_state 改成“待部门经理审批”(内部 ID 22)。
 * 3. 本 User Event 在 afterSubmit 中识别状态变化。
 * 4. 脚本调用飞书审批 API 创建审批实例。
 * 5. 创建成功后，把飞书 instance_code 回写到 NetSuite 记录上。
 * 6. 已有飞书实例的单据在 NS 中修改审批状态时，脚本按节点顺序调用飞书任务同意或退回接口。
 */
define([
    'N/https',
    'N/record',
    'N/runtime',
    'N/search',
    'N/log',
    '../common/SWC_Feishu_Approval_Demo_Config'
], (https, record, runtime, search, log, config) => {
    const PARAM = {
        appId: 'custscript_fs_demo_app_id',
        appSecret: 'custscript_fs_demo_app_secret',
        approvalCode: 'custscript_fs_demo_approval_code',
        departmentId: 'custscript_fs_demo_department_id'
    }
    const EMPLOYEE_FIELD = {
        feishuUserId: 'custentity_feishu_user_id',
        feishuOpenDepartmentId: 'custentity_feishu_open_department_id'
    }
    const DEFAULT_FEISHU_APPROVAL_CODE = '306C03CB-85B1-4E66-888C-093ED122FD97'
    const EMPTY_FORM_VALUE = '--'
    const PREPAY_FORM_FIELD = {
        tranId: 'name',
        memo: 'custrecord_swc_advancepay_memo',
        subsidiary: 'custrecord_swc_advancepay_subsidary',
        vendor: 'custrecord_swc_advancepay_vendor',
        po: 'custrecord_swc_advancepay_po',
        allQuantity: 'custrecord_swc_advancepay_allquantity',
        paymentTerms: 'custrecord_swc_vendor_items',
        totalAmount: 'custrecord_swc_advancepay_total_amount',
        currency: 'custrecord_swc_advancepay_currency',
        wholeOrderPrepay: 'custrecord_swc_advancepay_whole_yes',
        wholeOrderPercent: 'custrecord_swc_advancepay_sum_percent1',
        vendorBankAccount: 'custrecord_vendor_bankaccounts2',
        expectedPayDate: 'custrecord_swc_advancepay_paydate2'
    }
    const PREPAY_FORM_WIDGET = {
        tranId: {
            id: 'widget17803989748480001',
            type: 'input',
            customIds: ['tran_id', 'document_id', 'document_no', 'prepay_no', 'prepay_tran_id'],
            names: ['单据号', '单据ID', '单据 ID', '单据编号', '预付款申请单号', '预付款单号', 'NS预付款申请工作流ID', 'NS预付款申请工作流 ID']
        },
        subsidiary: {
            id: 'widget17804882691220001',
            type: 'input',
            customIds: ['subsidiary', 'company', 'apply_company'],
            names: ['主体', '子公司', '公司', '申请公司']
        },
        vendor: {
            id: 'widget17805552284650001',
            type: 'input',
            customIds: ['vendor', 'supplier', 'payee'],
            names: ['供应商', '供应商名称', '收款方']
        },
        po: {
            id: 'widget17804880175290001',
            type: 'input',
            customIds: ['po', 'purchase_order', 'purchase_order_no'],
            names: ['采购订单', '采购订单号', 'PO']
        },
        allQuantity: {
            id: 'widget17804879167890001',
            type: 'number',
            customIds: ['all_quantity', 'quantity', 'total_quantity'],
            names: ['总数量', '全部数量', '数量']
        },
        paymentTerms: {
            id: 'widget17804878894070001',
            type: 'input',
            customIds: ['payment_terms', 'payment_term'],
            names: ['付款条款', '付款条件', '支付条款']
        },
        totalAmount: {
            id: 'widget17804879695390001',
            type: 'amount',
            customIds: ['total_amount', 'amount', 'payment_amount', 'prepay_amount'],
            names: ['总金额', '付款金额', '预付款金额', '金额']
        },
        wholeOrderPrepay: {
            id: 'widget17804880426800001',
            type: 'radioV2',
            customIds: ['whole_order_prepay', 'is_whole_order_prepay'],
            names: ['是否整单预付', '整单预付', '整单预付款']
        },
        wholeOrderPercent: {
            id: 'widget17804880862390001',
            type: 'input',
            customIds: ['whole_order_percent', 'prepay_percent'],
            names: ['整单预付比例', '预付比例', '比例']
        },
        vendorBankAccount: {
            id: 'widget17804881206240001',
            type: 'input',
            customIds: ['vendor_bank_account', 'bank_account', 'payee_bank_account'],
            names: ['供应商银行账号', '银行账号', '收款账号', '供应商收款账户']
        },
        expectedPayDate: {
            id: 'widget17804882408040001',
            type: 'date',
            customIds: ['expected_pay_date', 'pay_date', 'payment_date'],
            names: ['预计付款日期', '期望付款日期', '付款日期', '预计支付日期']
        },
        recordId: {
            id: '',
            type: 'input',
            required: true,
            customIds: ['record_id', 'ns_record_id', 'internal_id', 'internalid', 'prepay_internal_id', 'ns_prepay_record_id', 'ns_prepay_internal_id'],
            names: ['NS预付款申请单内部ID', 'NS预付款申请单内部 ID', '预付款申请单内部ID', '预付款申请单内部 ID', '单据内部ID', '单据内部 ID', '内部ID', '内部 ID', 'NetSuite内部ID', 'NetSuite 内部 ID']
        },
        detail: {
            id: '',
            type: 'textarea',
            customIds: ['detail', 'details', 'memo', 'remark'],
            names: ['明细', '明细文本', '明细文本1', '明细文本 1', '明细备注', '备注', '申请说明']
        }
    }
    const PREPAY_WHOLE_ORDER_OPTION = {
        yes: 'mpy0ly9k-e01d8onmt9-0',
        no: 'mpy0ly9k-0n2qgzlu04ac-0'
    }

    // 读取脚本部署参数，避免把飞书密钥和审批 code 写死在代码里。
    const getParameter = (name) => runtime.getCurrentScript().getParameter({ name })

    const getApprovalCode = () => getParameter(PARAM.approvalCode) || DEFAULT_FEISHU_APPROVAL_CODE

    /**
     * 获取飞书 tenant_access_token。
     *
     * 所有飞书审批 API 都需要 Bearer token；demo 每次触发时实时获取。
     * 生产版本可改成缓存 token，减少接口调用次数。
     */
    const getTenantToken = (appId, appSecret) => {
        const response = https.post({
            url: 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                app_id: appId,
                app_secret: appSecret
            })
        })

        const body = JSON.parse(response.body || '{}')

        if (body.code !== 0) {
            throw new Error('获取飞书 tenant_access_token 失败：' + response.body)
        }

        return body.tenant_access_token
    }

    const parseFeishuResponse = (response, errorMessage) => {
        const body = JSON.parse(response.body || '{}')

        if (body.code !== 0) {
            throw new Error(errorMessage + '：' + response.body)
        }

        return body
    }

    const postFeishu = (url, token, payload, errorMessage) => {
        const response = https.post({
            url,
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(payload || {})
        })

        return parseFeishuResponse(response, errorMessage)
    }

    const getFeishuApprovalInstance = (instanceCode, token) => {
        const response = https.get({
            url: 'https://open.feishu.cn/open-apis/approval/v4/instances/' + encodeURIComponent(instanceCode) + '?user_id_type=user_id',
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json; charset=utf-8'
            }
        })
        const body = parseFeishuResponse(response, '获取飞书审批实例详情失败')

        return body.data || {}
    }

    const getFeishuApprovalDefinition = (approvalCode, token) => {
        const response = https.get({
            url: 'https://open.feishu.cn/open-apis/approval/v4/approvals/' + encodeURIComponent(approvalCode),
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json; charset=utf-8'
            }
        })
        const body = parseFeishuResponse(response, '获取飞书审批定义详情失败')

        return body.data || {}
    }

    /**
     * 根据当前 NetSuite 员工内部 ID 查找飞书 user_id 和 open_department_id。
     *
     * 约定员工记录上维护：
     * - custentity_feishu_user_id：飞书 user_id。
     * - custentity_feishu_open_department_id：飞书部门 open_department_id，通常以 od- 开头。
     * 飞书创建审批实例时，user_id 必须是飞书用户 ID。
     */
    const findFeishuEmployeeInfo = (employeeId) => {
        const employeeInfo = {
            feishuUserId: '',
            openDepartmentId: ''
        }

        search.create({
            type: search.Type.EMPLOYEE,
            filters: [
                ['internalid', 'anyof', employeeId]
            ],
            columns: [
                search.createColumn({ name: EMPLOYEE_FIELD.feishuUserId }),
                search.createColumn({ name: EMPLOYEE_FIELD.feishuOpenDepartmentId })
            ]
        }).run().each((result) => {
            employeeInfo.feishuUserId = result.getValue({ name: EMPLOYEE_FIELD.feishuUserId }) || ''
            employeeInfo.openDepartmentId = result.getValue({ name: EMPLOYEE_FIELD.feishuOpenDepartmentId }) || ''
            return false
        })

        return employeeInfo
    }

    // 将 NetSuite 日期转换成飞书 date 控件要求的 ISO 日期时间。
    const formatDate = (value) => {
        if (!value) {
            return ''
        }

        const date = value instanceof Date ? value : new Date(value)

        if (isNaN(date.getTime())) {
            return ''
        }

        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')

        return `${date.getFullYear()}-${month}-${day}T00:00:00+08:00`
    }

    const isEmptyFormValue = (value) => {
        return value === null
            || value === undefined
            || value === ''
            || (Array.isArray(value) && !value.length)
    }

    const pickValue = (...values) => {
        for (let i = 0; i < values.length; i += 1) {
            if (!isEmptyFormValue(values[i])) {
                return values[i]
            }
        }

        return ''
    }

    const normalizeLookupValue = (value) => {
        if (Array.isArray(value)) {
            if (!value.length) {
                return ''
            }

            const firstValue = value[0]

            if (firstValue && typeof firstValue === 'object' && firstValue.value !== undefined) {
                return firstValue.value
            }

            return firstValue
        }

        return value
    }

    const normalizeInternalId = (value) => {
        const normalizedValue = normalizeLookupValue(value)

        if (isEmptyFormValue(normalizedValue)) {
            return null
        }

        const numberValue = Number(normalizedValue)

        return isNaN(numberValue) ? null : numberValue
    }

    const getRecordValue = (suiteRecord, fieldId) => {
        if (!suiteRecord) {
            return ''
        }

        try {
            return normalizeLookupValue(suiteRecord.getValue({ fieldId }))
        } catch (e) {
            return ''
        }
    }

    const isUserEventType = (context, eventTypeName) => {
        const eventType = context.UserEventType || {}

        return context.type === eventType[eventTypeName]
            || String(context.type || '').toUpperCase() === eventTypeName
    }

    const isXEdit = (context) => isUserEventType(context, 'XEDIT')

    const isCreate = (context) => isUserEventType(context, 'CREATE')

    const isSubmitIntoStartApproval = (context, stateInfo) => {
        const currentState = stateInfo.currentState
        const oldState = stateInfo.oldState

        if (currentState !== config.START_APPROVAL_STATUS || oldState === config.START_APPROVAL_STATUS) {
            return false
        }

        return isCreate(context)
            || oldState === null
            || oldState === config.STATUS.pendingSubmit
            || oldState === config.STATUS.submitted
            || oldState === config.STATUS.returned
    }

    const isOneOfEventTypes = (context, eventTypeNames) => {
        return eventTypeNames.some((eventTypeName) => isUserEventType(context, eventTypeName))
    }

    const lookupPrepaySyncFields = (recordId) => {
        if (!recordId) {
            return {}
        }

        try {
            const values = search.lookupFields({
                type: config.RECORD_TYPE,
                id: recordId,
                columns: [
                    config.FIELD.state,
                    config.FIELD.feishuInstanceCode
                ]
            })

            return {
                state: normalizeLookupValue(values[config.FIELD.state]),
                instanceCode: normalizeLookupValue(values[config.FIELD.feishuInstanceCode])
            }
        } catch (e) {
            log.audit('查询预付款申请飞书同步字段失败', {
                recordId,
                message: e.message
            })

            return {}
        }
    }

    const getPrepayStateInfo = (context) => {
        const newRecord = context.newRecord
        const oldRecord = context.oldRecord
        const stateField = config.FIELD.state
        const instanceField = config.FIELD.feishuInstanceCode
        const currentStateFromEvent = getRecordValue(newRecord, stateField)
        const oldStateFromEvent = getRecordValue(oldRecord, stateField)
        const instanceCodeFromNewRecord = getRecordValue(newRecord, instanceField)
        const instanceCodeFromOldRecord = getRecordValue(oldRecord, instanceField)
        const hasStateInEvent = !isEmptyFormValue(currentStateFromEvent) || !isEmptyFormValue(oldStateFromEvent)
        const shouldLookupSavedFields = isXEdit(context)
            && (hasStateInEvent || isEmptyFormValue(instanceCodeFromNewRecord))
        const savedFields = shouldLookupSavedFields ? lookupPrepaySyncFields(newRecord && newRecord.id) : {}

        return {
            currentState: normalizeInternalId(pickValue(currentStateFromEvent, savedFields.state)),
            oldState: isCreate(context) ? null : normalizeInternalId(oldStateFromEvent),
            existingInstanceCode: isCreate(context)
                ? ''
                : pickValue(
                    instanceCodeFromNewRecord,
                    savedFields.instanceCode,
                    instanceCodeFromOldRecord
                ),
            hasStateInEvent
        }
    }

    const getPrepayRecordForCreate = (context) => {
        if (!isXEdit(context)) {
            return context.newRecord
        }

        return record.load({
            type: config.RECORD_TYPE,
            id: context.newRecord.id,
            isDynamic: false
        })
    }

    const normalizeFormValue = (value) => {
        if (isEmptyFormValue(value)) {
            return EMPTY_FORM_VALUE
        }

        if (Array.isArray(value)) {
            const text = value
                .map((item) => String(item || '').trim())
                .filter((item) => item)
                .join(', ')

            return text || EMPTY_FORM_VALUE
        }

        return String(value)
    }

    const getFieldText = (prepayRecord, fieldId) => {
        try {
            return prepayRecord.getText({ fieldId })
        } catch (e) {
            return ''
        }
    }

    const getFieldFormValue = (prepayRecord, fieldId) => {
        const text = getFieldText(prepayRecord, fieldId)

        if (!isEmptyFormValue(text)) {
            return normalizeFormValue(text)
        }

        return normalizeFormValue(prepayRecord.getValue({ fieldId }))
    }

    const getNumberFormValue = (prepayRecord, fieldId) => {
        const value = prepayRecord.getValue({ fieldId })

        if (isEmptyFormValue(value)) {
            return 0
        }

        const numberValue = Number(value)

        return isNaN(numberValue) ? 0 : numberValue
    }

    const getDateFormValue = (prepayRecord, fieldId) => {
        const dateValue = formatDate(prepayRecord.getValue({ fieldId }))

        return dateValue || formatDate(new Date())
    }

    const extractCurrencyCode = (value) => {
        const text = String(value || '').trim().toUpperCase()

        if (/^[A-Z]{3}$/.test(text)) {
            return text
        }

        const matchedValue = text.match(/(?:^|[^A-Z])([A-Z]{3})(?=$|[^A-Z])/)

        return matchedValue ? matchedValue[1] : ''
    }

    const lookupCurrencyCode = (currencyId) => {
        if (isEmptyFormValue(currencyId)) {
            return ''
        }

        try {
            const currencyFields = search.lookupFields({
                type: search.Type.CURRENCY || 'currency',
                id: currencyId,
                columns: ['symbol']
            })

            return extractCurrencyCode(currencyFields.symbol)
        } catch (e) {
            log.audit('查询预付款申请货币代码失败', {
                currencyId,
                message: e.message
            })
            return ''
        }
    }

    const getCurrencyFormValue = (prepayRecord) => {
        const textCurrency = extractCurrencyCode(getFieldText(prepayRecord, PREPAY_FORM_FIELD.currency))

        if (textCurrency) {
            return textCurrency
        }

        const value = prepayRecord.getValue({ fieldId: PREPAY_FORM_FIELD.currency })
        const valueCurrency = extractCurrencyCode(value)

        return valueCurrency || lookupCurrencyCode(value)
    }

    const getOptionArray = (control) => {
        const raw = control && control.raw || {}
        const optionValue = raw.option || raw.options || raw.option_list || raw.optionList || raw.value_list || raw.valueList || []

        if (Array.isArray(optionValue)) {
            return optionValue
        }

        if (typeof optionValue === 'string') {
            const parsedOptions = parseJsonValue(optionValue, [])

            return Array.isArray(parsedOptions) ? parsedOptions : []
        }

        return []
    }

    const getOptionText = (option) => {
        return getTextValue(option && (
            option.text
            || option.name
            || option.label
            || option.value
            || option.title
        ))
    }

    const getOptionValue = (option) => {
        return option && (
            option.key
            || option.id
            || option.option_id
            || option.optionId
            || option.value
            || option.text
        )
    }

    const getOptionValueByText = (control, text) => {
        const normalizedTarget = normalizeMatchText(text)
        const options = getOptionArray(control)

        for (let i = 0; i < options.length; i += 1) {
            if (normalizeMatchText(getOptionText(options[i])) === normalizedTarget) {
                return getOptionValue(options[i])
            }
        }

        return ''
    }

    const getWholeOrderPrepayText = (prepayRecord) => {
        const value = prepayRecord.getValue({ fieldId: PREPAY_FORM_FIELD.wholeOrderPrepay })

        if (isEmptyFormValue(value)) {
            return '否'
        }

        if (value === true || value === 'T' || value === 'true' || value === '是') {
            return '是'
        }

        if (value === false || value === 'F' || value === 'false' || value === '否') {
            return '否'
        }

        return getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.wholeOrderPrepay)
    }

    const isRadioControl = (control) => {
        const type = String(control && control.type || '').toLowerCase()

        return type === 'radiov2' || type === 'radio' || type === 'radio_v2'
    }

    const getWholeOrderPrepayValue = (prepayRecord, control) => {
        const text = getWholeOrderPrepayText(prepayRecord)

        if (isRadioControl(control)) {
            const optionValue = getOptionValueByText(control, text)

            if (optionValue) {
                return optionValue
            }

            return text === '是'
                ? PREPAY_WHOLE_ORDER_OPTION.yes
                : PREPAY_WHOLE_ORDER_OPTION.no
        }

        return text
    }

    const buildAmountFormItem = (prepayRecord, control) => {
        const item = {
            id: control.id,
            type: control.type || PREPAY_FORM_WIDGET.totalAmount.type,
            value: getNumberFormValue(prepayRecord, PREPAY_FORM_FIELD.totalAmount)
        }
        const currency = getCurrencyFormValue(prepayRecord)

        if (currency) {
            item.currency = currency
        }

        return item
    }

    const buildDepartmentFormValue = (departmentId) => {
        const rawValue = String(departmentId || '').trim()

        if (!rawValue) {
            return null
        }

        if (rawValue.indexOf('oc_') === 0) {
            log.audit('跳过飞书申请部门控件', {
                departmentId: rawValue,
                message: 'oc_* 是群聊 chat_id，不是飞书部门 ID'
            })
            return null
        }

        if (rawValue.charAt(0) === '[') {
            try {
                const parsedValue = JSON.parse(rawValue)

                if (Array.isArray(parsedValue)) {
                    const values = parsedValue.map((value) => {
                        if (value && typeof value === 'object' && value.open_id) {
                            return { open_id: String(value.open_id) }
                        }

                        return { open_id: String(value) }
                    }).filter((value) => value.open_id && value.open_id.indexOf('oc_') !== 0)

                    return values.length ? values : null
                }
            } catch (e) {
                log.audit('解析飞书部门 ID 数组失败，按逗号分隔文本处理', {
                    departmentId: rawValue,
                    message: e.message
                })
            }
        }

        const values = rawValue
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value && value.indexOf('oc_') !== 0)
            .map((value) => ({ open_id: value }))

        return values.length ? values : null
    }

    const parseJsonValue = (value, fallbackValue) => {
        if (typeof value !== 'string') {
            return value === undefined || value === null ? fallbackValue : value
        }

        try {
            return JSON.parse(value)
        } catch (e) {
            return fallbackValue
        }
    }

    const getTextValue = (value) => {
        if (value === null || value === undefined) {
            return ''
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return String(value)
        }

        if (typeof value === 'object') {
            return getTextValue(
                value.zh_cn
                || value.zh
                || value['zh-CN']
                || value.en_us
                || value.en
                || value.text
                || value.name
                || value.label
                || value.value
            )
        }

        return ''
    }

    const getErrorMessage = (error) => {
        if (!error) {
            return ''
        }

        return error.message || String(error)
    }

    const truncateLogText = (value, limit) => {
        const text = String(value || '')

        if (!limit || text.length <= limit) {
            return text
        }

        return text.slice(0, limit - 3) + '...'
    }

    const normalizeMatchText = (value) => {
        return getTextValue(value)
            .toLowerCase()
            .replace(/[\s_\-:：,，.。()（）【】\[\]「」"'`]/g, '')
    }

    const getControlId = (control) => getTextValue(control && (
        control.id
        || control.widget_id
        || control.widgetId
        || control.field_id
        || control.fieldId
    ))

    const getControlName = (control) => getTextValue(control && (
        control.name
        || control.title
        || control.label
        || control.widget_name
        || control.widgetName
        || control.field_name
        || control.fieldName
    ))

    const getControlCustomId = (control) => getTextValue(control && (
        control.custom_id
        || control.customId
        || control.custom_key
        || control.customKey
        || control.external_id
        || control.externalId
    ))

    const getControlType = (control) => getTextValue(control && (
        control.type
        || control.widget_type
        || control.widgetType
        || control.component_type
        || control.componentType
    ))

    const flattenFormControls = (value, controls, seenIds) => {
        const parsedValue = typeof value === 'string' ? parseJsonValue(value, value) : value

        if (Array.isArray(parsedValue)) {
            parsedValue.forEach((item) => flattenFormControls(item, controls, seenIds))
            return
        }

        if (!parsedValue || typeof parsedValue !== 'object') {
            return
        }

        const controlId = getControlId(parsedValue)

        if (controlId && !seenIds[controlId]) {
            controls.push({
                id: controlId,
                type: getControlType(parsedValue),
                name: getControlName(parsedValue),
                customId: getControlCustomId(parsedValue),
                raw: parsedValue
            })
            seenIds[controlId] = true
        }

        Object.keys(parsedValue).forEach((key) => {
            if (key === 'option'
                || key === 'options'
                || key === 'option_list'
                || key === 'optionList') {
                return
            }

            flattenFormControls(parsedValue[key], controls, seenIds)
        })
    }

    const getDefinitionControls = (approvalDefinition) => {
        const formData = approvalDefinition && (
            approvalDefinition.form
            || approvalDefinition.form_content
            || approvalDefinition.formContent
            || approvalDefinition.form_data
            || approvalDefinition.formData
            || approvalDefinition.approval_form
            || approvalDefinition.approvalForm
            || approvalDefinition.form_list
            || approvalDefinition.formList
            || approvalDefinition.widgets
            || approvalDefinition.widget_list
            || approvalDefinition.widgetList
            || approvalDefinition
        )
        const controls = []

        flattenFormControls(parseJsonValue(formData, formData), controls, {})

        return controls
    }

    const getControlScore = (control, widgetConfig) => {
        let score = 0

        if (widgetConfig.id && control.id === widgetConfig.id) {
            score = Math.max(score, 1000)
        }

        const controlCustomId = normalizeMatchText(control.customId)
        const controlName = normalizeMatchText(control.name)
        const customIds = widgetConfig.customIds || []
        const names = widgetConfig.names || []

        customIds.forEach((customId) => {
            if (controlCustomId && controlCustomId === normalizeMatchText(customId)) {
                score = Math.max(score, 900)
            }
        })

        names.forEach((name) => {
            const candidateName = normalizeMatchText(name)

            if (!candidateName || !controlName) {
                return
            }

            if (controlName === candidateName) {
                score = Math.max(score, 800)
                return
            }

            if (controlName.indexOf(candidateName) !== -1) {
                score = Math.max(score, 500 + candidateName.length)
            }
        })

        if (score && widgetConfig.type && String(control.type || '').toLowerCase() === String(widgetConfig.type).toLowerCase()) {
            score += 20
        }

        return score
    }

    const findMatchedControl = (controls, widgetConfig, usedControlIds) => {
        let matchedControl = null
        let matchedScore = 0

        controls.forEach((control) => {
            if (usedControlIds[control.id]) {
                return
            }

            const score = getControlScore(control, widgetConfig)

            if (score > matchedScore) {
                matchedControl = control
                matchedScore = score
            }
        })

        if (!matchedControl) {
            return null
        }

        usedControlIds[matchedControl.id] = true

        return matchedControl
    }

    const getControlSummary = (controls) => {
        return controls.map((control) => {
            return {
                id: control.id,
                name: control.name,
                customId: control.customId,
                type: control.type
            }
        })
    }

    const resolveFormControls = (approvalDefinition) => {
        const controls = getDefinitionControls(approvalDefinition)
        const usedControlIds = {}
        const matchedControls = {}
        const unmatchedKeys = []
        const hasApprovalDefinition = !!approvalDefinition && Object.keys(approvalDefinition).length
        const hasDefinitionControls = !!controls.length

        if (!hasApprovalDefinition) {
            throw new Error('未获取到飞书审批定义详情，停止创建审批实例，避免提交旧控件 ID')
        }

        if (!hasDefinitionControls) {
            throw new Error('飞书审批定义详情中未解析到表单控件，请检查审批定义接口返回结构。字段=' + Object.keys(approvalDefinition).join(','))
        }

        Object.keys(PREPAY_FORM_WIDGET).forEach((key) => {
            const widgetConfig = PREPAY_FORM_WIDGET[key]
            const matchedControl = findMatchedControl(controls, widgetConfig, usedControlIds)

            if (matchedControl) {
                matchedControls[key] = {
                    id: matchedControl.id,
                    type: matchedControl.type || widgetConfig.type,
                    name: matchedControl.name,
                    customId: matchedControl.customId,
                    raw: matchedControl.raw || {}
                }
                return
            }

            unmatchedKeys.push(key)
        })

        if (hasDefinitionControls && unmatchedKeys.length) {
            log.audit('飞书审批定义未匹配到部分预付款控件，创建表单时将跳过这些字段', {
                unmatchedKeys,
                availableControls: getControlSummary(controls)
            })
        }

        const unmatchedRequiredKeys = unmatchedKeys.filter((key) => PREPAY_FORM_WIDGET[key] && PREPAY_FORM_WIDGET[key].required)

        if (unmatchedRequiredKeys.length) {
            throw new Error('飞书审批定义未匹配到必填预付款控件，停止创建审批实例。unmatchedRequiredKeys='
                + unmatchedRequiredKeys.join(',')
                + ', availableControls='
                + JSON.stringify(getControlSummary(controls)))
        }

        return matchedControls
    }

    const createFormItem = (control, value) => {
        if (!control || !control.id) {
            return null
        }

        const controlType = String(control.type || '').toLowerCase()

        if (controlType.indexOf('fieldlist') !== -1
            || controlType.indexOf('table') !== -1
            || controlType.indexOf('attachment') !== -1
            || controlType.indexOf('department') !== -1
            || controlType.indexOf('contact') !== -1) {
            return null
        }

        return {
            id: control.id,
            type: control.type || 'input',
            value
        }
    }

    const appendFormItem = (form, item) => {
        if (item && item.id) {
            form.push(item)
        }
    }

    const getFormItemSummary = (form) => {
        return form.map((item, index) => {
            return {
                index,
                id: item.id,
                type: item.type
            }
        })
    }

    const assertFormItemsInDefinition = (form, approvalDefinition) => {
        const controls = getDefinitionControls(approvalDefinition)
        const controlById = {}

        controls.forEach((control) => {
            controlById[control.id] = true
        })

        const invalidItems = form.filter((item) => item && item.id && !controlById[item.id])

        if (invalidItems.length) {
            throw new Error('飞书审批表单包含审批定义中不存在的控件，已停止创建审批实例。invalidItems='
                + JSON.stringify(getFormItemSummary(invalidItems))
                + ', availableControls='
                + JSON.stringify(getControlSummary(controls)))
        }
    }

    /**
     * 构造飞书审批表单数据。
     *
     * 字段来源为预付款申请单据字段；缺少内容时，飞书控件统一填充“--”。
     */
    const buildForm = (prepayRecord, approvalDefinition) => {
        const controls = resolveFormControls(approvalDefinition)
        const form = []

        appendFormItem(form, createFormItem(controls.tranId, getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.tranId)))
        appendFormItem(form, createFormItem(controls.recordId, String(prepayRecord.id || '')))
        appendFormItem(form, createFormItem(controls.subsidiary, getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.subsidiary)))
        appendFormItem(form, createFormItem(controls.vendor, getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.vendor)))
        appendFormItem(form, createFormItem(controls.po, getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.po)))
        appendFormItem(form, createFormItem(controls.allQuantity, getNumberFormValue(prepayRecord, PREPAY_FORM_FIELD.allQuantity)))
        appendFormItem(form, createFormItem(controls.paymentTerms, getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.paymentTerms)))
        appendFormItem(form, controls.totalAmount ? buildAmountFormItem(prepayRecord, controls.totalAmount) : null)
        appendFormItem(form, createFormItem(controls.wholeOrderPrepay, getWholeOrderPrepayValue(prepayRecord, controls.wholeOrderPrepay)))
        appendFormItem(form, createFormItem(controls.wholeOrderPercent, getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.wholeOrderPercent)))
        appendFormItem(form, createFormItem(controls.vendorBankAccount, getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.vendorBankAccount)))
        appendFormItem(form, createFormItem(controls.expectedPayDate, getDateFormValue(prepayRecord, PREPAY_FORM_FIELD.expectedPayDate)))
        appendFormItem(form, createFormItem(controls.detail, getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.memo)))

        if (!form.length) {
            throw new Error('未能从飞书审批定义匹配到任何可提交表单控件，请检查审批模板控件名称或 custom_id')
        }

        return form
    }

    const getTaskId = (task) => task && (task.id || task.task_id || task.taskId)

    const getTaskNodeId = (task) => task && (task.node_id || task.nodeId || task.node_key || task.nodeKey)

    const getTaskUserId = (task) => {
        if (!task) {
            return ''
        }

        if (Array.isArray(task.user_id_list) && task.user_id_list.length) {
            return task.user_id_list[0]
        }

        if (Array.isArray(task.userIdList) && task.userIdList.length) {
            return task.userIdList[0]
        }

        return task.user_id || task.userId || task.open_id || task.openId || ''
    }

    const isPendingTask = (task) => String(task && (task.status || task.task_status || task.taskStatus) || '').toUpperCase() === 'PENDING'

    const getPendingTasks = (instanceData) => {
        const taskList = instanceData.task_list || instanceData.taskList || []

        if (!Array.isArray(taskList)) {
            return []
        }

        return taskList.filter(isPendingTask)
    }

    const isPendingAtNode = (instanceData, nodeId) => getPendingTasks(instanceData).some((task) => getTaskNodeId(task) === nodeId)

    const getCurrentPendingNodeId = (instanceData) => {
        const pendingTask = getPendingTasks(instanceData)[0]

        return pendingTask ? getTaskNodeId(pendingTask) : ''
    }

    const buildTaskById = (instanceData) => {
        const taskList = instanceData.task_list || instanceData.taskList || []
        const taskById = {}

        if (!Array.isArray(taskList)) {
            return taskById
        }

        taskList.forEach((task) => {
            const taskId = getTaskId(task)

            if (taskId) {
                taskById[String(taskId)] = task
            }
        })

        return taskById
    }

    const findRollbackNodeKey = (instanceData, targetNodeId) => {
        const timeline = instanceData.timeline || []
        const taskById = buildTaskById(instanceData)

        if (!Array.isArray(timeline)) {
            return targetNodeId
        }

        for (let i = timeline.length - 1; i >= 0; i -= 1) {
            const item = timeline[i]
            const itemStatus = String(item.status || item.type || item.action || '').toUpperCase()
            const itemTask = taskById[String(item.task_id || item.taskId || '')]
            const itemNodeId = getTaskNodeId(itemTask) || item.node_id || item.nodeId || item.node_key || item.nodeKey

            if (itemNodeId === targetNodeId && (itemStatus === 'PASS' || itemStatus === 'APPROVED' || itemStatus === 'AUTO_PASS')) {
                return item.node_key || item.nodeKey || targetNodeId
            }
        }

        return targetNodeId
    }

    const markFeishuSyncStatus = (recordId, syncStatus) => {
        const values = {
            [config.FIELD.feishuSyncStatus]: syncStatus
        }

        if (syncStatus === config.SYNC_STATUS.success && config.SOURCE.netsuite) {
            values[config.FIELD.feishuLastSource] = config.SOURCE.netsuite
        }

        record.submitFields({
            type: config.RECORD_TYPE,
            id: recordId,
            values,
            options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
            }
        })
    }

    const markFeishuCreatePending = (recordId) => {
        record.submitFields({
            type: config.RECORD_TYPE,
            id: recordId,
            values: {
                [config.FIELD.feishuInstanceCode]: '',
                [config.FIELD.feishuLastEventId]: '',
                [config.FIELD.feishuSyncStatus]: config.SYNC_STATUS.pending
            },
            options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
            }
        })
    }

    const approveFeishuTask = (token, approvalCode, instanceCode, instanceData, task) => {
        const taskId = getTaskId(task)
        const userId = getTaskUserId(task)

        if (!taskId || !userId) {
            throw new Error('飞书待办任务缺少 task_id 或 user_id，无法自动同意')
        }

        const payload = {
            approval_code: approvalCode,
            instance_code: instanceCode,
            user_id: userId,
            task_id: taskId,
            comment: 'NetSuite审批状态调整，自动流转到目标节点'
        }

        if (instanceData.form) {
            payload.form = instanceData.form
        }

        return postFeishu(
            'https://open.feishu.cn/open-apis/approval/v4/tasks/approve?user_id_type=user_id',
            token,
            payload,
            '同意飞书审批任务失败'
        )
    }

    const rollbackFeishuTask = (token, instanceData, targetNodeId) => {
        const pendingTasks = getPendingTasks(instanceData)
        const task = pendingTasks[0]
        const taskId = getTaskId(task)
        const userId = getTaskUserId(task)

        if (!taskId || !userId) {
            throw new Error('飞书待办任务缺少 task_id 或 user_id，无法退回')
        }

        return postFeishu(
            'https://open.feishu.cn/open-apis/approval/v4/instances/specified_rollback?user_id_type=user_id',
            token,
            {
                user_id: userId,
                task_id: taskId,
                reason: 'NetSuite审批状态调整，退回到目标节点重新审批',
                task_def_key_list: [
                    findRollbackNodeKey(instanceData, targetNodeId)
                ]
            },
            '退回飞书审批任务失败'
        )
    }

    const advanceFeishuToNode = (token, approvalCode, instanceCode, targetNodeId, initialInstanceData) => {
        let instanceData = initialInstanceData || getFeishuApprovalInstance(instanceCode, token)
        const targetIndex = config.getNodeSequenceIndex(targetNodeId)

        if (targetIndex === -1) {
            throw new Error('无法判断飞书目标节点顺序，targetNodeId=' + targetNodeId)
        }

        for (let i = 0; i < 10; i += 1) {
            if (isPendingAtNode(instanceData, targetNodeId)) {
                return instanceData
            }

            const pendingTasks = getPendingTasks(instanceData)

            if (!pendingTasks.length) {
                throw new Error('飞书审批实例没有待办任务，无法前进到目标节点')
            }

            const currentNodeId = getTaskNodeId(pendingTasks[0])
            const currentIndex = config.getNodeSequenceIndex(currentNodeId)

            if (currentIndex === -1) {
                throw new Error('无法判断飞书当前节点顺序，currentNodeId=' + currentNodeId)
            }

            if (currentIndex >= targetIndex) {
                throw new Error('飞书审批流已到达或越过目标节点，停止自动同意，currentNodeId=' + currentNodeId + ', targetNodeId=' + targetNodeId)
            }

            const tasksToApprove = pendingTasks.filter((task) => getTaskNodeId(task) === currentNodeId)

            tasksToApprove.forEach((task) => {
                approveFeishuTask(token, approvalCode, instanceCode, instanceData, task)
            })

            instanceData = getFeishuApprovalInstance(instanceCode, token)
        }

        throw new Error('飞书审批流自动前进超过最大次数，已停止')
    }

    const syncFeishuApprovalNode = (recordId, instanceCode, targetStatus) => {
        const appId = getParameter(PARAM.appId)
        const appSecret = getParameter(PARAM.appSecret)
        const approvalCode = getApprovalCode()
        const targetNodeId = config.getNodeIdByStatus(targetStatus)

        if (!appId || !appSecret || !approvalCode) {
            throw new Error('缺少飞书脚本参数：App ID / App Secret')
        }

        if (!targetNodeId) {
            throw new Error('NS审批状态没有配置对应飞书节点：' + targetStatus)
        }

        markFeishuSyncStatus(recordId, config.SYNC_STATUS.pending)

        const token = getTenantToken(appId, appSecret)
        const instanceData = getFeishuApprovalInstance(instanceCode, token)
        const currentNodeId = getCurrentPendingNodeId(instanceData)

        if (!currentNodeId || currentNodeId === targetNodeId) {
            markFeishuSyncStatus(recordId, config.SYNC_STATUS.success)
            return {
                action: 'NO_CHANGE',
                currentNodeId,
                targetNodeId
            }
        }

        const currentIndex = config.getNodeSequenceIndex(currentNodeId)
        const targetIndex = config.getNodeSequenceIndex(targetNodeId)

        if (currentIndex === -1 || targetIndex === -1) {
            throw new Error('无法判断飞书节点顺序，currentNodeId=' + currentNodeId + ', targetNodeId=' + targetNodeId)
        }

        if (currentIndex < targetIndex) {
            advanceFeishuToNode(token, approvalCode, instanceCode, targetNodeId, instanceData)
            markFeishuSyncStatus(recordId, config.SYNC_STATUS.success)
            return {
                action: 'ADVANCE',
                currentNodeId,
                targetNodeId
            }
        }

        rollbackFeishuTask(token, instanceData, targetNodeId)
        markFeishuSyncStatus(recordId, config.SYNC_STATUS.success)

        return {
            action: 'ROLLBACK',
            currentNodeId,
            targetNodeId
        }
    }

    /**
     * 判断本次保存是否需要创建飞书审批实例。
     *
     * 只在状态进入“待部门经理审批”(内部 ID 22)时触发。
     * 普通提交流程要求记录上没有飞书 instance_code；被飞书退回后再次提交时，
     * 即使历史数据残留旧 instance_code，也创建新的飞书审批实例并覆盖旧实例号。
     */
    const shouldCreateFeishuApproval = (context, stateInfo) => {
        if (!isOneOfEventTypes(context, ['CREATE', 'EDIT', 'XEDIT'])) {
            return false
        }

        const currentState = stateInfo.currentState
        const oldState = stateInfo.oldState
        const isResubmitAfterReturn = oldState === config.STATUS.returned
            && currentState === config.START_APPROVAL_STATUS

        return currentState === config.START_APPROVAL_STATUS
            && stateInfo.hasStateInEvent
            && oldState !== config.START_APPROVAL_STATUS
            && (
                isSubmitIntoStartApproval(context, stateInfo)
                || !stateInfo.existingInstanceCode
                || isResubmitAfterReturn
            )
    }

    const isFromFeishuRestlet = () => {
        return runtime.ContextType
            && runtime.ContextType.RESTLET
            && runtime.executionContext === runtime.ContextType.RESTLET
    }

    /**
     * 判断本次保存是否需要把 NS 审批状态同步到已有飞书实例。
     */
    const shouldSyncFeishuApprovalNode = (context, stateInfo) => {
        if (!isOneOfEventTypes(context, ['EDIT', 'XEDIT'])) {
            return false
        }

        if (isFromFeishuRestlet()) {
            return false
        }

        const currentState = stateInfo.currentState
        const oldState = stateInfo.oldState
        const existingInstanceCode = stateInfo.existingInstanceCode

        if (oldState === config.STATUS.returned && currentState === config.START_APPROVAL_STATUS) {
            return false
        }

        if (isSubmitIntoStartApproval(context, stateInfo)) {
            return false
        }

        return !!existingInstanceCode
            && stateInfo.hasStateInEvent
            && currentState !== oldState
            && !!config.getNodeIdByStatus(currentState)
    }

    /**
     * User Event afterSubmit 入口。
     *
     * 成功时：
     * - 创建飞书审批实例；
     * - 回写飞书 instance_code；
     * - 标记同步成功。
     *
     * 失败时：
     * - 标记同步失败；
     * - 保留 NS 原审批状态，方便人工重试。
     */
    const afterSubmit = (context) => {
        const stateInfo = getPrepayStateInfo(context)
        const shouldSyncNode = shouldSyncFeishuApprovalNode(context, stateInfo)
        const shouldCreateApproval = shouldCreateFeishuApproval(context, stateInfo)

        if (!shouldCreateApproval && !shouldSyncNode) {
            return
        }

        let prepayRecord = context.newRecord
        const recordId = context.newRecord.id

        if (shouldSyncNode) {
            try {
                log.audit('预付款申请飞书审批节点同步开始', {
                    recordId,
                    instanceCode: stateInfo.existingInstanceCode,
                    oldState: stateInfo.oldState,
                    currentState: stateInfo.currentState,
                    targetNodeId: config.getNodeIdByStatus(stateInfo.currentState)
                })

                const result = syncFeishuApprovalNode(
                    recordId,
                    stateInfo.existingInstanceCode,
                    stateInfo.currentState
                )

                log.audit('预付款申请飞书审批节点同步成功', {
                    recordId,
                    instanceCode: stateInfo.existingInstanceCode,
                    result
                })
            } catch (e) {
                log.error('预付款申请飞书审批节点同步失败', {
                    recordId,
                    instanceCode: stateInfo.existingInstanceCode,
                    oldState: stateInfo.oldState,
                    currentState: stateInfo.currentState,
                    message: getErrorMessage(e),
                    reason: getErrorMessage(e)
                })
                markFeishuSyncStatus(recordId, config.SYNC_STATUS.failed)
            }

            return
        }

        try {
            const appId = getParameter(PARAM.appId)
            const appSecret = getParameter(PARAM.appSecret)
            const approvalCode = getApprovalCode()
            const currentUser = runtime.getCurrentUser()
            const employeeInfo = findFeishuEmployeeInfo(currentUser.id)
            const feishuUserId = employeeInfo.feishuUserId

            if (!appId || !appSecret || !approvalCode) {
                log.error('预付款申请飞书审批创建参数缺失', {
                    recordId,
                    hasAppId: !!appId,
                    hasAppSecret: !!appSecret,
                    hasApprovalCode: !!approvalCode
                })
                throw new Error('缺少飞书脚本参数：App ID / App Secret')
            }

            if (!feishuUserId) {
                log.error('预付款申请飞书审批创建参数缺失', {
                    recordId,
                    nsUserId: currentUser.id,
                    nsUserName: currentUser.name,
                    missingField: EMPLOYEE_FIELD.feishuUserId
                })
                throw new Error('当前NS用户未配置员工字段 ' + EMPLOYEE_FIELD.feishuUserId)
            }

            markFeishuCreatePending(recordId)

            log.audit('预付款申请飞书审批创建开始', {
                recordId,
                oldState: stateInfo.oldState,
                currentState: stateInfo.currentState,
                approvalCode,
                nsUserId: currentUser.id,
                feishuUserId,
                openDepartmentId: employeeInfo.openDepartmentId || getParameter(PARAM.departmentId) || '',
                inheritedInstanceCode: stateInfo.existingInstanceCode || ''
            })

            const token = getTenantToken(appId, appSecret)
            const approvalDefinition = getFeishuApprovalDefinition(approvalCode, token)
            prepayRecord = getPrepayRecordForCreate(context)
            const form = buildForm(prepayRecord, approvalDefinition)
            assertFormItemsInDefinition(form, approvalDefinition)

            log.audit('预付款申请飞书审批创建表单控件', {
                recordId,
                approvalCode,
                formItems: getFormItemSummary(form),
                availableControls: getControlSummary(getDefinitionControls(approvalDefinition))
            })

            const response = https.post({
                url: 'https://open.feishu.cn/open-apis/approval/v4/instances?user_id_type=user_id',
                headers: {
                    Authorization: 'Bearer ' + token,
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify({
                    approval_code: approvalCode,
                    user_id: feishuUserId,
                    form: JSON.stringify(form)
                })
            })

            const body = JSON.parse(response.body || '{}')

            if (body.code !== 0) {
                log.error('预付款申请飞书审批创建接口返回失败', {
                    recordId,
                    approvalCode,
                    feishuCode: body.code,
                    feishuMsg: body.msg || body.message || '',
                    responseBody: truncateLogText(response.body, 2000)
                })
                throw new Error('创建飞书审批实例失败：' + response.body)
            }

            const instanceCode = body.data && body.data.instance_code

            if (!instanceCode) {
                log.error('预付款申请飞书审批创建接口返回缺少实例号', {
                    recordId,
                    approvalCode,
                    responseBody: truncateLogText(response.body, 2000)
                })
                throw new Error('创建飞书审批实例返回缺少 instance_code：' + response.body)
            }

            log.audit('预付款申请飞书审批实例已创建', {
                recordId,
                approvalCode,
                instanceCode,
                feishuCode: body.code
            })

            const values = {
                [config.FIELD.feishuInstanceCode]: instanceCode,
                [config.FIELD.feishuLastEventId]: '',
                [config.FIELD.feishuSyncStatus]: config.SYNC_STATUS.success
            }

            if (config.SOURCE.netsuite) {
                values[config.FIELD.feishuLastSource] = config.SOURCE.netsuite
            }

            record.submitFields({
                type: config.RECORD_TYPE,
                id: recordId,
                values,
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            })

            log.audit('预付款申请飞书审批创建成功', {
                recordId,
                approvalCode,
                instanceCode,
                syncStatus: config.SYNC_STATUS.success
            })
        } catch (e) {
            log.error('预付款申请飞书审批创建失败', {
                recordId,
                oldState: stateInfo.oldState,
                currentState: stateInfo.currentState,
                inheritedInstanceCode: stateInfo.existingInstanceCode || '',
                message: getErrorMessage(e),
                reason: getErrorMessage(e)
            })

            markFeishuSyncStatus(recordId, config.SYNC_STATUS.failed)
        }
    }

    return {
        afterSubmit
    }
})
