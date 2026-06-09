const DEFAULT_APPROVAL_CODE = '306C03CB-85B1-4E66-888C-093ED122FD97'

const FEISHU_WIDGET = {
    documentId: 'widget17803989748480001',
    recordId: process.env.FEISHU_RECORD_ID_WIDGET_ID || 'widget17806459138600001',
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

const RECORD_ID_CUSTOM_IDS = [
    'record_id',
    'ns_record_id',
    'internal_id',
    'internalid',
    'prepay_internal_id',
    'ns_prepay_record_id',
    'ns_prepay_internal_id'
]

const RECORD_ID_FIELD_NAMES = [
    'NS预付款申请单内部ID',
    'NS预付款申请单内部 ID',
    '预付款申请单内部ID',
    '预付款申请单内部 ID',
    '单据内部ID',
    '单据内部 ID',
    '内部ID',
    '内部 ID',
    'NetSuite内部ID',
    'NetSuite 内部 ID'
]

const WHOLE_ORDER_PREPAY_OPTION = {
    yes: 'mpy0ly9k-e01d8onmt9-0',
    no: 'mpy0ly9k-0n2qgzlu04ac-0'
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
        FEISHU_WIDGET.recordId
            ? {
                id: FEISHU_WIDGET.recordId,
                type: 'input',
                value: payload.record_id
            }
            : null,
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
            value: parseNumericValue(payload.all_quantity)
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
            value: normalizeRadioValue(payload.whole_order_prepay)
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
            value: payload.date || formatFeishuDate(new Date())
        }
    ]

    return form.filter(Boolean)
}

function normalizeFeishuEvent(body, instanceDetail) {
    const event = body.event || body
    const header = body.header || {}
    const operator = event.operator || event.user || event.task || {}
    const taskId = event.task_id
        || event.taskId
        || event.task && (event.task.id || event.task.task_id || event.task.taskId)
    const timelineEvent = findTimelineEvent(instanceDetail, taskId, event, operator)
    const timelineTaskId = getTimelineTaskId(timelineEvent)
    const instanceTask = findTaskFromInstance(instanceDetail, taskId || timelineTaskId)
    const instanceCode = event.instance_code
        || event.approval_instance_code
        || event.instanceCode
        || event.approvalInstanceCode
        || event.approval_instance && event.approval_instance.instance_code
        || event.instance && event.instance.instance_code
    const eventType = event.type
        || event.event_type
        || event.eventType
        || header.event_type
        || header.eventType
    const action = mapFirstAction([
        event.action,
        event.task_result,
        event.taskResult,
        event.task_status_name,
        event.taskStatusName,
        event.task_status,
        event.taskStatus,
        event.approval_status,
        event.approvalStatus,
        ...getActionValues(timelineEvent),
        event.status,
        instanceDetail && instanceDetail.status
    ], {
        eventType,
        instanceStatus: instanceDetail && instanceDetail.status
    })

    const instanceRecordId = extractRecordIdFromInstance(instanceDetail)
    const stableNodeId = getStableNodeId(event, instanceTask, timelineEvent, operator)
    const runtimeNodeId = getRuntimeNodeId(event, instanceTask, timelineEvent, operator)

    return {
        event_id: header.event_id || body.uuid || body.event_id || body.eventId || event.event_id || event.uuid || `local-${Date.now()}`,
        approval_code: event.approval_code || event.approvalCode || event.definition_code || event.definitionCode || '',
        instance_code: instanceCode,
        record_id: event.ns_record_id
            || event.nsRecordId
            || event.internal_id
            || event.internalId
            || event.record_internal_id
            || event.recordInternalId
            || instanceRecordId
            || event.record_id
            || event.recordId
            || '',
        node_id: stableNodeId || runtimeNodeId,
        raw_node_id: runtimeNodeId,
        node_name: getNodeName(event, instanceTask, timelineEvent, operator),
        node_code: getNodeCode(event, instanceTask, timelineEvent, operator),
        action,
        operator: {
            name: event.operator_name
                || event.user_name
                || event.approver
                || event.operator
                || event.user && (event.user.name || event.user.user_name)
                || operator.name
                || operator.user_name
                || timelineEvent && (timelineEvent.user_name || timelineEvent.userName || timelineEvent.name)
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
                || timelineEvent && (timelineEvent.user_id || timelineEvent.userId || timelineEvent.open_id || timelineEvent.openId)
                || ''
        },
        comment: event.comment || event.reason || operator.comment || operator.reason || timelineEvent && timelineEvent.comment || ''
    }
}

function pick(...values) {
    for (let i = 0; i < values.length; i += 1) {
        if (values[i] !== undefined && values[i] !== null && values[i] !== '') {
            return values[i]
        }
    }

    return ''
}

function getStableNodeId(event, instanceTask, timelineEvent, operator) {
    return pick(
        getNodeKey(event),
        event && pick(event.def_key, event.defKey, event.task_node_key, event.taskNodeKey, event.task_def_key, event.taskDefKey),
        event && getNodeKey(event.task),
        getNodeKey(instanceTask),
        getNodeKey(timelineEvent),
        getNodeKey(operator)
    )
}

function getRuntimeNodeId(event, instanceTask, timelineEvent, operator) {
    return pick(
        event && pick(event.node_id, event.nodeId, event.task_node_id, event.taskNodeId),
        event && event.task && pick(event.task.node_id, event.task.nodeId, event.task.task_node_id, event.task.taskNodeId),
        instanceTask && pick(instanceTask.node_id, instanceTask.nodeId, instanceTask.task_node_id, instanceTask.taskNodeId),
        timelineEvent && pick(timelineEvent.node_id, timelineEvent.nodeId, timelineEvent.task_node_id, timelineEvent.taskNodeId),
        operator && pick(operator.node_id, operator.nodeId, operator.task_node_id, operator.taskNodeId)
    )
}

function getNodeKey(value) {
    return value && pick(
        value.node_key,
        value.nodeKey,
        value.def_key,
        value.defKey,
        value.task_node_key,
        value.taskNodeKey,
        value.task_def_key,
        value.taskDefKey
    )
}

function getNodeName(event, instanceTask, timelineEvent, operator) {
    return pick(
        event && pick(event.node_name, event.nodeName, event.task_node_name, event.taskNodeName),
        event && event.task && pick(event.task.node_name, event.task.nodeName, event.task.name, event.task.task_name, event.task.taskName),
        instanceTask && pick(instanceTask.node_name, instanceTask.nodeName, instanceTask.name, instanceTask.task_name, instanceTask.taskName),
        timelineEvent && pick(timelineEvent.node_name, timelineEvent.nodeName, timelineEvent.name, timelineEvent.task_name, timelineEvent.taskName),
        operator && pick(operator.node_name, operator.nodeName)
    )
}

function getNodeCode(event, instanceTask, timelineEvent, operator) {
    return pick(
        event && pick(event.node_code, event.nodeCode, event.task_node_code, event.taskNodeCode),
        event && event.task && pick(event.task.node_code, event.task.nodeCode, event.task.code, event.task.task_code, event.task.taskCode),
        instanceTask && pick(instanceTask.node_code, instanceTask.nodeCode, instanceTask.code, instanceTask.task_code, instanceTask.taskCode),
        timelineEvent && pick(timelineEvent.node_code, timelineEvent.nodeCode, timelineEvent.code, timelineEvent.task_code, timelineEvent.taskCode),
        operator && pick(operator.node_code, operator.nodeCode)
    )
}

function findTaskFromInstance(instanceDetail, taskId) {
    if (!instanceDetail || !taskId || !Array.isArray(instanceDetail.task_list)) {
        return null
    }

    return instanceDetail.task_list.find((task) => String(task.id || task.task_id || task.taskId || '') === String(taskId)) || null
}

function findTimelineEvent(instanceDetail, taskId, event, operator) {
    if (!instanceDetail || !Array.isArray(instanceDetail.timeline)) {
        return null
    }

    if (taskId) {
        const matchedByTaskId = instanceDetail.timeline
            .slice()
            .reverse()
            .find((item) => String(getTimelineTaskId(item)) === String(taskId))

        if (matchedByTaskId) {
            return matchedByTaskId
        }
    }

    const matchedByNode = findTimelineEventByNode(instanceDetail.timeline, event, operator)

    if (matchedByNode) {
        return matchedByNode
    }

    if (taskId) {
        return null
    }

    return getLatestTimelineEvent(instanceDetail.timeline
        .filter((item) => isActionableTimelineEvent(item) || isCancelTimelineEvent(item)))
}

function getTimelineTaskId(item) {
    return item && (item.task_id || item.taskId || item.task && (item.task.id || item.task.task_id || item.task.taskId)) || ''
}

function getTimelineTime(item) {
    const rawValue = item && (
        item.operate_time
        || item.operateTime
        || item.create_time
        || item.createTime
        || item.update_time
        || item.updateTime
        || item.time
    )
    const numberValue = Number(rawValue)

    return Number.isFinite(numberValue) ? numberValue : 0
}

function getLatestTimelineEvent(items) {
    if (!Array.isArray(items) || !items.length) {
        return null
    }

    return items
        .map((item, index) => ({
            item,
            index,
            time: getTimelineTime(item)
        }))
        .sort((a, b) => {
            if (a.time || b.time) {
                return b.time - a.time
            }

            return b.index - a.index
        })[0].item
}

function findTimelineEventByNode(timeline, event, operator) {
    const nodeKeys = [
        getNodeKey(event),
        event && getNodeKey(event.task),
        getNodeKey(operator)
    ].filter(Boolean).map(String)
    const nodeIds = [
        event && pick(event.node_id, event.nodeId, event.task_node_id, event.taskNodeId),
        event && event.task && pick(event.task.node_id, event.task.nodeId, event.task.task_node_id, event.task.taskNodeId),
        operator && pick(operator.node_id, operator.nodeId, operator.task_node_id, operator.taskNodeId)
    ].filter(Boolean).map(String)
    const nodeNames = [
        getNodeName(event, null, null, null),
        event && event.task && getNodeName(event.task, null, null, null),
        operator && getNodeName(operator, null, null, null)
    ].filter(Boolean).map(normalizeMatchText)

    if (!nodeKeys.length && !nodeIds.length && !nodeNames.length) {
        return null
    }

    const matches = timeline.filter((item) => {
        const itemNodeKey = String(getNodeKey(item) || '')
        const itemNodeId = String(pick(item && item.node_id, item && item.nodeId, item && item.task_node_id, item && item.taskNodeId) || '')
        const itemNodeName = normalizeMatchText(getNodeName(null, null, item, null))

        return nodeKeys.indexOf(itemNodeKey) !== -1
            || nodeIds.indexOf(itemNodeId) !== -1
            || nodeNames.indexOf(itemNodeName) !== -1
    })

    return getLatestTimelineEvent(matches)
}

function isActionableTimelineEvent(item) {
    return !!mapFirstAction(getActionValues(item), {
        eventType: 'approval_task'
    })
}

function isCancelTimelineEvent(item) {
    const value = String(item && (item.type || item.action || item.status || item.task_result || item.taskResult) || '').toUpperCase()

    return [
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
    ].includes(value)
}

function extractRecordIdFromInstance(instanceDetail) {
    if (!instanceDetail) {
        return ''
    }

    const form = parseForm(instanceDetail.form || instanceDetail.form_data || instanceDetail.formData || [])
    const recordIdField = findRecordIdField(form)
    const recordIdValue = readFormValue(recordIdField)

    if (/^\d+$/.test(recordIdValue)) {
        return recordIdValue
    }

    const documentField = form.find((item) => item.id === FEISHU_WIDGET.documentId)
    const documentValue = readFormValue(documentField)

    if (/^\d+$/.test(documentValue)) {
        return documentValue
    }

    return documentValue
}

function findRecordIdField(form) {
    if (!Array.isArray(form)) {
        return null
    }

    if (FEISHU_WIDGET.recordId) {
        const matchedById = form.find((item) => item && item.id === FEISHU_WIDGET.recordId)

        if (matchedById) {
            return matchedById
        }
    }

    return form.find(isRecordIdFormItem) || null
}

function isRecordIdFormItem(item) {
    if (!item) {
        return false
    }

    const customId = normalizeMatchText(
        item.custom_id
        || item.customId
        || item.custom_key
        || item.customKey
        || item.external_id
        || item.externalId
    )
    const name = normalizeMatchText(
        item.name
        || item.title
        || item.label
        || item.widget_name
        || item.widgetName
        || item.field_name
        || item.fieldName
    )

    if (RECORD_ID_CUSTOM_IDS.some((value) => customId && customId === normalizeMatchText(value))) {
        return true
    }

    return RECORD_ID_FIELD_NAMES.some((value) => name && name === normalizeMatchText(value))
}

function normalizeMatchText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[\s_\-:：,，.。()（）【】\[\]「」"'`]/g, '')
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

function getActionValues(item) {
    if (!item) {
        return []
    }

    return [
        item.action,
        item.task_result,
        item.taskResult,
        item.result,
        item.status,
        item.type
    ]
}

function mapFirstAction(values, context = {}) {
    const list = Array.isArray(values) ? values : []
    let fallbackAction = ''

    for (let i = 0; i < list.length; i += 1) {
        const action = mapAction(list[i], context)

        if (action) {
            if (isDoneApprovalFallback(list[i], context)) {
                fallbackAction = fallbackAction || action
                continue
            }

            return action
        }
    }

    return fallbackAction
}

function isDoneApprovalFallback(raw, context = {}) {
    const value = String(raw || '').toUpperCase()

    return value === 'DONE' && context.eventType === 'approval_task'
}

function mapAction(raw, context = {}) {
    const value = String(raw || '').toUpperCase()
    const compactValue = value.replace(/[\s_\-]/g, '')
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

    if ([
        'APPROVE',
        'APPROVED',
        'PASS',
        'PASSED',
        'AGREE',
        'AGREED',
        '同意',
        '已同意',
        '通过',
        '已通过',
        '批准',
        '已批准'
    ].includes(value)) return 'APPROVE'
    if (
        value === 'DONE'
        && context.eventType === 'approval_task'
        && instanceStatus !== 'CANCELED'
        && instanceStatus !== 'CANCELLED'
    ) {
        return 'APPROVE'
    }
    if (['REJECT', 'REJECTED', 'REFUSE', 'REFUSED', '拒绝', '已拒绝', '驳回', '已驳回'].includes(value)) return 'REJECT'
    if ([
        'RETURN',
        'RETURNED',
        'BACK',
        'ROLLBACK',
        'ROLL_BACK',
        'ROLLBACKED',
        'ROLL_BACKED',
        'SENT_BACK',
        'SEND_BACK',
        '退回',
        '已退回',
        '打回',
        '已打回',
        '退回至提交',
        '退回到提交',
        '退回至发起人',
        '退回到发起人'
    ].includes(value) || [
        'ROLLBACK',
        'ROLLBACKED',
        'SENTBACK',
        'SENDBACK'
    ].includes(compactValue) || value.includes('退回') || value.includes('打回')) return 'RETURN'

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

function normalizeRadioValue(value) {
    const textValue = String(value || '').trim()

    if (!textValue) {
        return WHOLE_ORDER_PREPAY_OPTION.no
    }

    if (textValue === WHOLE_ORDER_PREPAY_OPTION.yes || textValue === WHOLE_ORDER_PREPAY_OPTION.no) {
        return textValue
    }

    if (['true', 'T', 'yes', 'YES', '是'].includes(textValue)) {
        return WHOLE_ORDER_PREPAY_OPTION.yes
    }

    if (['false', 'F', 'no', 'NO', '否'].includes(textValue)) {
        return WHOLE_ORDER_PREPAY_OPTION.no
    }

    return WHOLE_ORDER_PREPAY_OPTION.no
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
