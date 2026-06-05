const DEFAULT_APPROVAL_CODE = '306C03CB-85B1-4E66-888C-093ED122FD97'

const FEISHU_WIDGET = {
    documentId: 'widget17803989748480001',
    subsidiary: 'widget17804882691220001',
    vendor: 'widget17805552284650001',
    po: 'widget17804880175290001',
    allQuantity: 'widget17804879167890001',
    paymentTerms: 'widget17804878894070001',
    totalAmount: 'widget17804879695390001',
    wholeOrderPrepay: 'widget17804880426800001',
    wholeOrderPercent: 'widget17804880862390001',
    vendorBankAccount: 'widget17804881206240001',
    expectedPayDate: 'widget17804882408040001'
}

function normalizeNsSubmit(body) {
    const applicant = body.applicant || {}
    const recordId = body.record_id || body.recordId || body.ns_record_id
    const tranId = body.tranid || body.tran_id || body.document_no || recordId
    const feishuUserId = applicant.feishu_user_id
        || applicant.user_id
        || body.feishu_user_id
        || body.user_id

    return {
        event_id: body.event_id || body.eventId || `ns-submit-${recordId}-${Date.now()}`,
        record_id: String(recordId || ''),
        tranid: String(tranId || ''),
        record_type: body.record_type || body.recordType || 'customrecord_swc_advancepay_plateform',
        approval_code: body.approval_code || process.env.FEISHU_APPROVAL_CODE || DEFAULT_APPROVAL_CODE,
        applicant: {
            name: applicant.name || body.applicant_name || '',
            feishu_user_id: feishuUserId || ''
        },
        department_id: normalizeDepartmentInput(body.department_id || body.departmentId || process.env.FEISHU_DEPARTMENT_ID || ''),
        subsidiary: body.subsidiary || body.subsidiary_name || body.subsidiaryName || '',
        vendor: body.vendor || body.vendor_name || body.vendorName || '',
        po: body.po || body.purchase_order || body.purchaseOrder || '',
        all_quantity: body.all_quantity || body.allQuantity || body.quantity || '',
        payment_terms: body.payment_terms || body.paymentTerms || '',
        amount: body.amount || body.total_amount || body.totalAmount || 0,
        whole_order_prepay: body.whole_order_prepay || body.wholeOrderPrepay || '',
        whole_order_percent: body.whole_order_percent || body.wholeOrderPercent || '',
        vendor_bank_account: body.vendor_bank_account || body.vendorBankAccount || '',
        currency: body.currency || 'CNY',
        date: formatFeishuDate(body.date || body.pay_date || body.payDate || new Date()),
        memo: body.memo || body.comment || body.remark || ''
    }
}

function buildApprovalForm(payload) {
    const emptyValue = '--'

    const form = [
        {
            id: FEISHU_WIDGET.documentId,
            type: 'input',
            value: payload.tranid || payload.record_id
        },
        {
            id: FEISHU_WIDGET.subsidiary,
            type: 'input',
            value: payload.subsidiary || emptyValue
        },
        {
            id: FEISHU_WIDGET.vendor,
            type: 'input',
            value: payload.vendor || emptyValue
        },
        {
            id: FEISHU_WIDGET.po,
            type: 'input',
            value: payload.po || emptyValue
        },
        {
            id: FEISHU_WIDGET.allQuantity,
            type: 'number',
            value: payload.all_quantity || emptyValue
        },
        {
            id: FEISHU_WIDGET.paymentTerms,
            type: 'input',
            value: payload.payment_terms || emptyValue
        },
        {
            id: FEISHU_WIDGET.totalAmount,
            type: 'amount',
            value: payload.amount || 0
        },
        {
            id: FEISHU_WIDGET.wholeOrderPrepay,
            type: 'radioV2',
            value: payload.whole_order_prepay || emptyValue
        },
        {
            id: FEISHU_WIDGET.wholeOrderPercent,
            type: 'input',
            value: payload.whole_order_percent || emptyValue
        },
        {
            id: FEISHU_WIDGET.vendorBankAccount,
            type: 'input',
            value: payload.vendor_bank_account || emptyValue
        },
        {
            id: FEISHU_WIDGET.expectedPayDate,
            type: 'date',
            value: payload.date || emptyValue
        }
    ]

    return form
}

function normalizeFeishuEvent(body, instanceDetail) {
    const event = body.event || body
    const header = body.header || {}
    const operator = event.operator || event.user || event.task || {}
    const taskId = event.task_id
        || event.taskId
        || event.task && (event.task.id || event.task.task_id || event.task.taskId)
    const instanceTask = findTaskFromInstance(instanceDetail, taskId)
    const timelineEvent = findTimelineEvent(instanceDetail, taskId)
    const instanceCode = event.instance_code
        || event.approval_instance_code
        || event.instanceCode
        || event.approvalInstanceCode
        || event.approval_instance && event.approval_instance.instance_code
        || event.instance && event.instance.instance_code
    const rawAction = event.action
        || event.status
        || event.task_result
        || event.taskResult
        || event.task_status_name
        || event.taskStatusName
        || event.task_status
        || event.taskStatus
        || event.approval_status
        || event.approvalStatus
        || timelineEvent && timelineEvent.type
        || instanceDetail && instanceDetail.status
    const eventType = event.type
        || event.event_type
        || event.eventType
        || header.event_type
        || header.eventType
    const action = mapAction(rawAction, {
        eventType,
        instanceStatus: instanceDetail && instanceDetail.status
    })

    return {
        event_id: header.event_id || body.uuid || body.event_id || body.eventId || event.event_id || event.uuid || `local-${Date.now()}`,
        approval_code: event.approval_code || event.approvalCode || event.definition_code || event.definitionCode || '',
        instance_code: instanceCode,
        record_id: event.record_id || event.recordId || extractRecordIdFromInstance(instanceDetail) || '',
        node_id: event.node_id
            || event.nodeId
            || event.node_key
            || event.nodeKey
            || event.task_node_id
            || event.taskNodeId
            || instanceTask && instanceTask.node_id
            || instanceTask && instanceTask.nodeId
            || instanceTask && instanceTask.node_key
            || instanceTask && instanceTask.nodeKey
            || timelineEvent && timelineEvent.node_key
            || timelineEvent && timelineEvent.nodeKey
            || event.task && (event.task.node_id || event.task.nodeId || event.task.node_key || event.task.nodeKey)
            || operator.node_id
            || operator.nodeId
            || operator.node_key
            || operator.nodeKey,
        action,
        operator: {
            name: event.operator_name
                || event.user_name
                || event.approver
                || event.operator
                || event.user && (event.user.name || event.user.user_name)
                || operator.name
                || operator.user_name
                || '',
            user_id: event.operator_user_id
                || event.user_id
                || event.open_id
                || event.operator_id
                || event.operatorId
                || operator.user_id
                || operator.userId
                || operator.open_id
                || operator.openId
                || ''
        },
        comment: event.comment || event.reason || operator.comment || operator.reason || timelineEvent && timelineEvent.comment || ''
    }
}

function findTaskFromInstance(instanceDetail, taskId) {
    if (!instanceDetail || !taskId || !Array.isArray(instanceDetail.task_list)) {
        return null
    }

    return instanceDetail.task_list.find((task) => String(task.id || task.task_id || task.taskId || '') === String(taskId)) || null
}

function findTimelineEvent(instanceDetail, taskId) {
    if (!instanceDetail || !Array.isArray(instanceDetail.timeline)) {
        return null
    }

    if (taskId) {
        const matchedByTaskId = instanceDetail.timeline.find((item) => String(item.task_id || item.taskId || '') === String(taskId))

        if (matchedByTaskId) {
            return matchedByTaskId
        }
    }

    return taskId
        ? null
        : (instanceDetail.timeline.length ? instanceDetail.timeline[instanceDetail.timeline.length - 1] : null)
}

function extractRecordIdFromInstance(instanceDetail) {
    if (!instanceDetail) {
        return ''
    }

    const form = parseForm(instanceDetail.form || instanceDetail.form_data || instanceDetail.formData || [])
    const documentField = form.find((item) => item.id === FEISHU_WIDGET.documentId)
    const documentValue = readFormValue(documentField)

    if (/^\d+$/.test(documentValue)) {
        return documentValue
    }

    return documentValue
}

function readFormValue(field) {
    if (!field) {
        return ''
    }

    const value = field.value

    if (Array.isArray(value)) {
        return String(value[0] || '')
    }

    if (value && typeof value === 'object') {
        return String(value.value || value.text || '')
    }

    return String(value || '')
}

function parseForm(form) {
    if (typeof form === 'string') {
        try {
            return JSON.parse(form)
        } catch (e) {
            return []
        }
    }

    return Array.isArray(form) ? form : []
}

function mapAction(raw, context = {}) {
    const value = String(raw || '').toUpperCase()
    const instanceStatus = String(context.instanceStatus || '').toUpperCase()

    if ([
        'CANCEL',
        'CANCELED',
        'CANCELLED',
        'CANCELED_BY_USER',
        'CANCELLED_BY_USER',
        'WITHDRAW',
        'WITHDRAWN',
        'REVOKE',
        'REVOKED',
        'REVERT',
        'REVERTED',
        'RECALL',
        'RECALLED',
        '撤销',
        '已撤销',
        '撤回',
        '已撤回'
    ].includes(value) || instanceStatus === 'CANCELED' || instanceStatus === 'CANCELLED') {
        return ''
    }

    if (['APPROVE', 'APPROVED', 'PASS', 'PASSED', 'AGREE', 'AGREED'].includes(value)) return 'APPROVE'
    if (
        value === 'DONE'
        && context.eventType === 'approval_task'
        && instanceStatus !== 'CANCELED'
        && instanceStatus !== 'CANCELLED'
    ) {
        return 'APPROVE'
    }
    if (['REJECT', 'REJECTED', 'REFUSE', 'REFUSED', '拒绝', '已拒绝', '驳回', '已驳回'].includes(value)) return 'REJECT'
    if (['RETURN', 'RETURNED', 'BACK', '退回', '已退回', '打回', '已打回'].includes(value)) return 'RETURN'

    return ''
}

function formatFeishuDate(value) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return value
    }

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return `${value}T00:00:00${process.env.FEISHU_DATE_TIMEZONE || '+08:00'}`
    }

    const date = value instanceof Date ? value : new Date(value)

    if (isNaN(date.getTime())) {
        return ''
    }

    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${date.getFullYear()}-${month}-${day}T00:00:00${process.env.FEISHU_DATE_TIMEZONE || '+08:00'}`
}

function parseNumericValue(value) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
        return parsed
    }

    return 1
}

function normalizeDepartmentInput(value) {
    if (Array.isArray(value)) {
        return value.map((item) => {
            if (item && typeof item === 'object' && item.open_id) {
                const openId = String(item.open_id).trim()
                return openId && !openId.startsWith('oc_') ? { open_id: openId } : ''
            }

            const textValue = String(item || '').trim()
            return textValue && !textValue.startsWith('oc_') ? textValue : ''
        }).filter(Boolean)
    }

    const rawValue = String(value || '').trim()

    if (!rawValue || rawValue.startsWith('oc_')) {
        return ''
    }

    if (rawValue.charAt(0) === '[') {
        try {
            const parsedValue = JSON.parse(rawValue)

            if (Array.isArray(parsedValue)) {
                return normalizeDepartmentInput(parsedValue)
            }
        } catch (e) {
            // Fall back to comma-separated text below.
        }
    }

    const values = rawValue.split(',').map((item) => item.trim()).filter((item) => item && !item.startsWith('oc_'))
    return values.length > 1 ? values : (values[0] || '')
}

function buildDepartmentFormValue(value) {
    const normalizedValue = normalizeDepartmentInput(value)

    if (Array.isArray(normalizedValue)) {
        const values = normalizedValue
            .map(toDepartmentFormItem)
            .filter(Boolean)

        return values.length ? values : null
    }

    const item = toDepartmentFormItem(normalizedValue)
    return item ? [item] : null
}

function toDepartmentFormItem(value) {
    if (!value) {
        return null
    }

    if (value && typeof value === 'object' && value.open_id) {
        return String(value.open_id).startsWith('oc_')
            ? null
            : { open_id: String(value.open_id) }
    }

    const textValue = String(value).trim()

    if (!textValue || textValue.startsWith('oc_')) {
        return null
    }

    return { open_id: textValue }
}

module.exports = {
    FEISHU_WIDGET,
    buildApprovalForm,
    extractRecordIdFromInstance,
    mapAction,
    normalizeFeishuEvent,
    normalizeNsSubmit
}
