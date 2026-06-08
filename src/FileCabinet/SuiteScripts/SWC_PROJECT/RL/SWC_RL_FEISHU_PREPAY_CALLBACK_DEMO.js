/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @description
 * Demo: 飞书审批动作回写 NetSuite 预付款申请订单。
 *
 * 回写流程：
 * 1. 中间 APP / Postman / 飞书回调调用本 RESTlet。
 * 2. normalizePayload() 把不同来源的回调字段统一成内部结构。
 * 3. lookupPrepay() 根据 record_id 或飞书 instance_code 找到预付款申请订单。
 * 4. createApprovalComment() 新增「审批意见」记录，保存审批意见并回写所有者。
 * 5. updatePrepayStatus() 写入 custrecord_swc_advancepay_state 内部 ID。
 * 6. NetSuite 工作流读取状态字段，自动进入下一个审批节点。
 * 7. 回写失败时，脚本重试 5 次；最终失败后通过飞书机器人推送预警到审批流群。
 */
define([
    'N/https',
    'N/record',
    'N/runtime',
    'N/search',
    'N/log',
    '../common/SWC_Feishu_Approval_Demo_Config'
], (https, record, runtime, search, log, config) => {
    const COMMENT_RECORD_TYPE = 'customrecord_swc_approval_comments_lib'
    const COMMENT_FIELD = {
        content: 'custrecord_swc_approval_comments_content',
        tran: 'custrecord_swc_approval_comments_tran',
        prepay: 'custrecord_swc_approval_comments_prepay',
        owner: 'owner'
    }
    const EMPLOYEE_FIELD = {
        feishuUserId: 'custentity_feishu_user_id'
    }
    const PARAM = {
        appId: 'custscript_fs_demo_app_id',
        appSecret: 'custscript_fs_demo_app_secret'
    }
    const DEFAULT_FEISHU_APP_ID = 'cli_aa9d2362783b5bd6'
    const FEISHU_OPEN_API_BASE_URL = 'https://open.feishu.cn/open-apis'
    const FEISHU_ALERT_CHAT_NAME = 'NS-飞书审批流'
    const WRITE_RETRY_TIMES = 5
    const WRITE_TOTAL_ATTEMPTS = WRITE_RETRY_TIMES + 1
    const FEISHU_ALERT_TEXT_LIMIT = 3000

    const pick = (...values) => {
        for (let i = 0; i < values.length; i += 1) {
            if (values[i] !== undefined && values[i] !== null && values[i] !== '') {
                return values[i]
            }
        }

        return ''
    }

    const getErrorMessage = (error) => {
        if (!error) {
            return ''
        }

        return error.message || String(error)
    }

    const truncateText = (text, limit) => {
        const value = String(text || '')

        if (!limit || value.length <= limit) {
            return value
        }

        return value.slice(0, limit - 3) + '...'
    }

    const getParameter = (name) => {
        try {
            return runtime.getCurrentScript().getParameter({ name }) || ''
        } catch (e) {
            log.error('读取飞书预付款审批回调脚本参数失败', {
                name,
                message: getErrorMessage(e)
            })

            return ''
        }
    }

    const parseFeishuResponse = (response, errorMessage) => {
        let body = {}

        try {
            body = JSON.parse(response.body || '{}')
        } catch (e) {
            throw new Error(errorMessage + '：飞书响应不是JSON，body=' + truncateText(response.body, 500))
        }

        if (body.code !== 0) {
            throw new Error(errorMessage + '：' + truncateText(response.body, 1000))
        }

        return body
    }

    const getTenantToken = (appId, appSecret) => {
        const response = https.post({
            url: FEISHU_OPEN_API_BASE_URL + '/auth/v3/tenant_access_token/internal',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                app_id: appId,
                app_secret: appSecret
            })
        })
        const body = parseFeishuResponse(response, '获取飞书 tenant_access_token 失败')

        return body.tenant_access_token
    }

    const searchFeishuAlertChat = (token, chatName) => {
        let pageToken = ''

        for (let pageIndex = 0; pageIndex < 10; pageIndex += 1) {
            let url = FEISHU_OPEN_API_BASE_URL
                + '/im/v1/chats/search?page_size=100&user_id_type=open_id&query='
                + encodeURIComponent(chatName)

            if (pageToken) {
                url += '&page_token=' + encodeURIComponent(pageToken)
            }

            const response = https.get({
                url,
                headers: {
                    Authorization: 'Bearer ' + token,
                    'Content-Type': 'application/json; charset=utf-8'
                }
            })
            const body = parseFeishuResponse(response, '搜索飞书预警群失败')
            const data = body.data || {}
            const items = Array.isArray(data.items) ? data.items : []
            const exactMatch = items.find((item) => item && item.name === chatName)

            if (exactMatch) {
                return exactMatch
            }

            if (!data.has_more || !data.page_token) {
                break
            }

            pageToken = data.page_token
        }

        return null
    }

    const sendFeishuTextMessage = (token, chatId, text) => {
        const response = https.post({
            url: FEISHU_OPEN_API_BASE_URL + '/im/v1/messages?receive_id_type=chat_id',
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                receive_id: chatId,
                msg_type: 'text',
                content: JSON.stringify({
                    text
                })
            })
        })

        return parseFeishuResponse(response, '发送飞书预警消息失败')
    }

    const buildFailureAlertText = (details) => {
        const error = details.error
        const payload = details.payload || {}
        const prepay = details.prepay || {}
        const node = details.node || {}
        const lines = [
            'NetSuite 飞书审批回写失败预警',
            '业务：预付款审批回调 RESTlet',
            '飞书应用：' + details.appId,
            '预警群：' + FEISHU_ALERT_CHAT_NAME,
            '事件ID：' + (payload.eventId || '-'),
            'NS记录ID：' + (prepay.id || payload.recordId || '-'),
            'NS单据号：' + (prepay.tranId || '-'),
            '飞书实例号：' + (payload.instanceCode || '-'),
            '飞书节点：' + (node.name || payload.nodeId || '-'),
            '回调动作：' + (payload.action || '-'),
            '失败阶段：' + (error && error.operation ? error.operation : '回调处理'),
            '尝试次数：' + (error && error.attempts ? error.attempts : 1) + ' 次',
            '错误信息：' + getErrorMessage(error),
            '发生时间：' + new Date().toISOString()
        ]

        if (details.targetStatusText || details.targetStatus) {
            lines.splice(10, 0, '目标状态：' + (details.targetStatusText || details.targetStatus))
        }

        return truncateText(lines.join('\n'), FEISHU_ALERT_TEXT_LIMIT)
    }

    const sendFailureAlert = (details) => {
        try {
            const appId = getParameter(PARAM.appId) || DEFAULT_FEISHU_APP_ID
            const appSecret = getParameter(PARAM.appSecret)

            if (!appSecret) {
                throw new Error('缺少飞书 App Secret 脚本参数：' + PARAM.appSecret)
            }

            const token = getTenantToken(appId, appSecret)
            const chat = searchFeishuAlertChat(token, FEISHU_ALERT_CHAT_NAME)

            if (!chat || !chat.chat_id) {
                throw new Error('未找到飞书预警群：' + FEISHU_ALERT_CHAT_NAME)
            }

            sendFeishuTextMessage(token, chat.chat_id, buildFailureAlertText(Object.assign({}, details, {
                appId
            })))

            log.audit('飞书预付款审批回写失败预警已发送', {
                appId,
                chatName: FEISHU_ALERT_CHAT_NAME,
                chatId: chat.chat_id,
                eventId: details.payload && details.payload.eventId
            })
        } catch (alertError) {
            log.error('发送飞书预付款审批回写失败预警失败', {
                originalError: getErrorMessage(details.error),
                alertError: getErrorMessage(alertError)
            })
        }
    }

    const retryWriteback = (operation, action) => {
        let lastError = null

        for (let attempt = 1; attempt <= WRITE_TOTAL_ATTEMPTS; attempt += 1) {
            try {
                const result = action()

                if (attempt > 1) {
                    log.audit('飞书预付款审批回写重试成功', {
                        operation,
                        attempt,
                        totalAttempts: WRITE_TOTAL_ATTEMPTS
                    })
                }

                return result
            } catch (e) {
                lastError = e
                log.error('飞书预付款审批回写尝试失败', {
                    operation,
                    attempt,
                    totalAttempts: WRITE_TOTAL_ATTEMPTS,
                    retryTimes: WRITE_RETRY_TIMES,
                    message: getErrorMessage(e)
                })
            }
        }

        const retryError = new Error(operation + '失败，已重试' + WRITE_RETRY_TIMES + '次：' + getErrorMessage(lastError))
        retryError.operation = operation
        retryError.attempts = WRITE_TOTAL_ATTEMPTS
        retryError.lastErrorMessage = getErrorMessage(lastError)

        throw retryError
    }

    const getTaskId = (event) => pick(
        event.task_id,
        event.taskId,
        event.task && pick(event.task.id, event.task.task_id, event.task.taskId)
    )

    const getTimelineTaskId = (event) => pick(
        event && event.task_id,
        event && event.taskId,
        event && event.task && pick(event.task.id, event.task.task_id, event.task.taskId)
    )

    const getNodeName = (value) => pick(
        value && value.node_name,
        value && value.nodeName,
        value && value.name,
        value && value.title,
        value && value.label,
        value && value.task_name,
        value && value.taskName,
        value && value.task && pick(value.task.node_name, value.task.nodeName, value.task.name)
    )

    const getNodeCode = (value) => pick(
        value && value.node_code,
        value && value.nodeCode,
        value && value.code,
        value && value.task_code,
        value && value.taskCode,
        value && value.task && pick(value.task.node_code, value.task.nodeCode, value.task.code)
    )

    const findTaskFromPayload = (context, event, taskId) => {
        const taskList = context.task_list
            || context.taskList
            || event.task_list
            || event.taskList
            || context.instance && (context.instance.task_list || context.instance.taskList)
            || event.instance && (event.instance.task_list || event.instance.taskList)
            || []

        if (!taskId || !Array.isArray(taskList)) {
            return null
        }

        return taskList.find((task) => String(pick(task.id, task.task_id, task.taskId)) === String(taskId)) || null
    }

    const findTimelineEvent = (context, event, taskId) => {
        const timeline = context.timeline
            || event.timeline
            || context.instance && context.instance.timeline
            || event.instance && event.instance.timeline
            || []

        if (!Array.isArray(timeline) || !timeline.length) {
            return null
        }

        if (taskId) {
            const matchedByTaskId = timeline
                .slice()
                .reverse()
                .find((item) => String(getTimelineTaskId(item)) === String(taskId))

            if (matchedByTaskId) {
                return matchedByTaskId
            }
        }

        return timeline[timeline.length - 1]
    }

    const getActionValues = (item) => {
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

    const isDoneApprovalFallback = (rawAction, options) => {
        const normalizedAction = String(rawAction || '').toUpperCase()

        return normalizedAction === 'DONE' && options && options.eventType === 'approval_task'
    }

    const mapFirstAction = (values, options) => {
        const list = Array.isArray(values) ? values : []
        let fallbackAction = ''

        for (let i = 0; i < list.length; i += 1) {
            const action = mapAction(list[i], options)

            if (action) {
                if (isDoneApprovalFallback(list[i], options)) {
                    fallbackAction = fallbackAction || action
                    continue
                }

                return action
            }
        }

        return fallbackAction
    }

    const mapAction = (rawAction, options) => {
        const normalizedAction = String(rawAction || '').toUpperCase()
        const compactAction = normalizedAction.replace(/[\s_\-]/g, '')

        if (normalizedAction === 'APPROVE'
            || normalizedAction === 'APPROVED'
            || normalizedAction === 'PASS'
            || normalizedAction === 'PASSED'
            || normalizedAction === 'AGREE'
            || normalizedAction === 'AGREED'
            || normalizedAction === '同意'
            || normalizedAction === '已同意'
            || normalizedAction === '通过'
            || normalizedAction === '已通过'
            || normalizedAction === '批准'
            || normalizedAction === '已批准') {
            return config.ACTION.approve
        }

        if (normalizedAction === 'DONE'
            && options
            && options.eventType === 'approval_task') {
            return config.ACTION.approve
        }

        if (normalizedAction === 'REJECTED'
            || normalizedAction === 'REJECT'
            || normalizedAction === 'REFUSE'
            || normalizedAction === 'REFUSED'
            || normalizedAction === '拒绝'
            || normalizedAction === '已拒绝'
            || normalizedAction === '驳回'
            || normalizedAction === '已驳回') {
            return config.ACTION.reject
        }

        if (normalizedAction === 'RETURNED'
            || normalizedAction === 'RETURN'
            || normalizedAction === 'BACK'
            || normalizedAction === 'ROLLBACK'
            || normalizedAction === 'ROLL_BACK'
            || normalizedAction === 'ROLLBACKED'
            || normalizedAction === 'ROLL_BACKED'
            || normalizedAction === 'SENT_BACK'
            || normalizedAction === 'SEND_BACK'
            || normalizedAction === '退回'
            || normalizedAction === '已退回'
            || normalizedAction === '打回'
            || normalizedAction === '已打回'
            || normalizedAction === '退回至提交'
            || normalizedAction === '退回到提交'
            || normalizedAction === '退回至发起人'
            || normalizedAction === '退回到发起人'
            || compactAction === 'ROLLBACK'
            || compactAction === 'ROLLBACKED'
            || compactAction === 'SENTBACK'
            || compactAction === 'SENDBACK'
            || normalizedAction.indexOf('退回') !== -1
            || normalizedAction.indexOf('打回') !== -1) {
            return config.ACTION.return
        }

        if (normalizedAction === 'CANCELED'
            || normalizedAction === 'CANCELLED'
            || normalizedAction === 'CANCEL'
            || normalizedAction === 'CANCELED_BY_USER'
            || normalizedAction === 'CANCELLED_BY_USER'
            || normalizedAction === '撤销'
            || normalizedAction === '已撤销'
            || normalizedAction === '撤回'
            || normalizedAction === '已撤回'
            || normalizedAction === 'WITHDRAW'
            || normalizedAction === 'WITHDRAWN'
            || normalizedAction === 'REVERT'
            || normalizedAction === 'REVERTED'
            || normalizedAction === 'RECALL'
            || normalizedAction === 'RECALLED') {
            return config.ACTION.cancel
        }

        return ''
    }

    const containsCancelSignal = (value, depth) => {
        if (value === null || value === undefined || depth > 4) {
            return false
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            const text = String(value).toUpperCase()

            return text.indexOf('撤回') !== -1
                || text.indexOf('撤销') !== -1
                || text.indexOf('CANCEL') !== -1
                || text.indexOf('WITHDRAW') !== -1
                || text.indexOf('REVERT') !== -1
                || text.indexOf('RECALL') !== -1
        }

        if (Array.isArray(value)) {
            return value.some((item) => containsCancelSignal(item, depth + 1))
        }

        if (typeof value === 'object') {
            return Object.keys(value).some((key) => {
                return containsCancelSignal(value[key], depth + 1)
            })
        }

        return false
    }

    /**
     * 将飞书或中间 APP 的回调 JSON 归一化。
     *
     * 这样 RESTlet 不依赖单一 payload 格式：
     * - 真实飞书回调可以放在 event 下；
     * - Postman 测试可以直接把字段放在根节点；
     * - action/status 会统一成 APPROVE、REJECT、RETURN。
     */
    const normalizePayload = (context) => {
        const event = context.event || context
        const operator = context.operator || event.operator || event.user || event.task || {}
        const taskId = getTaskId(event)
        const instanceTask = findTaskFromPayload(context, event, taskId)
        const timelineEvent = findTimelineEvent(context, event, taskId)
        const instanceCode = pick(
            context.instance_code,
            context.instanceCode,
            event.instance_code,
            event.instanceCode,
            event.approval_instance_code,
            event.approvalInstanceCode,
            event.approval_instance && event.approval_instance.instance_code,
            event.instance && event.instance.instance_code
        )
        const eventType = pick(
            context.type,
            context.event_type,
            context.eventType,
            event.type,
            event.event_type,
            event.eventType,
            context.header && pick(context.header.event_type, context.header.eventType)
        )
        const nodeId = pick(
            context.node_id,
            context.nodeId,
            context.node_key,
            context.nodeKey,
            event.node_id,
            event.nodeId,
            event.node_key,
            event.nodeKey,
            event.task_node_id,
            event.taskNodeId,
            instanceTask && instanceTask.node_id,
            instanceTask && instanceTask.nodeId,
            instanceTask && instanceTask.node_key,
            instanceTask && instanceTask.nodeKey,
            timelineEvent && timelineEvent.node_key,
            timelineEvent && timelineEvent.nodeKey,
            timelineEvent && timelineEvent.node_id,
            timelineEvent && timelineEvent.nodeId,
            event.task && pick(event.task.node_id, event.task.nodeId, event.task.node_key, event.task.nodeKey),
            operator.node_id,
            operator.nodeId,
            operator.node_key,
            operator.nodeKey
        )
        const nodeName = pick(
            context.node_name,
            context.nodeName,
            event.node_name,
            event.nodeName,
            event.task_node_name,
            event.taskNodeName,
            instanceTask && getNodeName(instanceTask),
            timelineEvent && getNodeName(timelineEvent),
            event.task && getNodeName(event.task),
            operator.node_name,
            operator.nodeName
        )
        const nodeCode = pick(
            context.node_code,
            context.nodeCode,
            event.node_code,
            event.nodeCode,
            event.task_node_code,
            event.taskNodeCode,
            instanceTask && getNodeCode(instanceTask),
            timelineEvent && getNodeCode(timelineEvent),
            event.task && getNodeCode(event.task),
            operator.node_code,
            operator.nodeCode
        )
        const action = containsCancelSignal(context, 0)
            ? config.ACTION.cancel
            : mapFirstAction([
                context.action,
                event.action,
                event.task_result,
                event.taskResult,
                event.task_status_name,
                event.taskStatusName,
                event.task_status,
                event.taskStatus,
                event.approval_status,
                event.approvalStatus
            ].concat(getActionValues(timelineEvent)).concat([
                event.status
            ]), {
                eventType
            })

        return {
            eventId: pick(context.event_id, context.eventId, event.event_id, event.uuid, event.log_id),
            instanceCode,
            recordId: pick(context.record_id, context.recordId, event.record_id, event.recordId),
            nodeId,
            nodeName,
            nodeCode,
            action,
            operatorName: pick(
                operator.name,
                operator.username,
                operator.user_name,
                context.operator_name,
                event.operator_name,
                context.user_name,
                event.user_name,
                context.approver,
                event.approver,
                typeof context.operator === 'string' ? context.operator : '',
                typeof event.operator === 'string' ? event.operator : ''
            ),
            operatorEmail: pick(operator.email, context.email, event.email),
            operatorFeishuId: pick(
                operator.user_id,
                operator.userId,
                operator.open_id,
                operator.openId,
                context.operator_user_id,
                event.operator_user_id,
                context.user_id,
                event.user_id,
                context.open_id,
                event.open_id
            ),
            comment: pick(context.comment, context.reason, event.comment, event.reason, operator.comment, operator.reason, timelineEvent && timelineEvent.comment),
            raw: context
        }
    }

    /**
     * 通过飞书审批实例号查找 NetSuite 预付款申请订单。
     *
     * 正式联调时，推荐优先使用 record_id；instance_code 查找用于飞书只返回实例号时兜底。
     */
    const findPrepay = (filters) => {
        if (!filters || !filters.length) {
            return null
        }

        let resultData = null

        search.create({
            type: config.RECORD_TYPE,
            filters,
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: config.FIELD.tranId }),
                search.createColumn({ name: config.FIELD.state }),
                search.createColumn({ name: config.FIELD.feishuLastEventId })
            ]
        }).run().each((result) => {
            resultData = {
                id: result.getValue({ name: 'internalid' }),
                tranId: result.getValue({ name: config.FIELD.tranId }) || result.getValue({ name: 'internalid' }),
                state: result.getValue({ name: config.FIELD.state }),
                lastEventId: result.getValue({ name: config.FIELD.feishuLastEventId })
            }

            return false
        })

        return resultData
    }

    const normalizeDocumentNo = (value) => {
        return String(value || '').trim()
    }

    const findPrepayByInstanceCode = (instanceCode) => {
        if (!instanceCode) {
            return null
        }

        return findPrepay([
            [config.FIELD.feishuInstanceCode, 'is', instanceCode]
        ])
    }

    const findPrepayByDocumentNo = (documentNo) => {
        const normalizedDocumentNo = normalizeDocumentNo(documentNo)

        if (!normalizedDocumentNo) {
            return null
        }

        const exactMatch = findPrepay([
            [config.FIELD.tranId, 'is', normalizedDocumentNo]
        ])

        if (exactMatch) {
            return exactMatch
        }

        return findPrepay([
            [config.FIELD.tranId, 'contains', normalizedDocumentNo]
        ])
    }

    /**
     * 定位预付款申请订单。
     *
     * 查找优先级：
     * 1. payload.recordId 为纯数字时按 internalid 查找。
     * 2. payload.instanceCode：通过 NS 字段 custrecord_swc_feishu_instance_code 反查。
     * 3. payload.recordId 非数字时按单据编号兜底查找。
     */
    const lookupPrepay = (payload) => {
        if (payload.recordId) {
            if (/^\d+$/.test(String(payload.recordId))) {
                try {
                    const fields = search.lookupFields({
                        type: config.RECORD_TYPE,
                        id: payload.recordId,
                        columns: [
                            config.FIELD.tranId,
                            config.FIELD.state,
                            config.FIELD.feishuLastEventId
                        ]
                    })

                    return {
                        id: payload.recordId,
                        tranId: fields[config.FIELD.tranId] || payload.recordId,
                        state: fields[config.FIELD.state] && fields[config.FIELD.state][0]
                            ? fields[config.FIELD.state][0].value
                            : fields[config.FIELD.state],
                        lastEventId: fields[config.FIELD.feishuLastEventId]
                    }
                } catch (e) {
                    log.audit('按internalid查找预付款申请失败，继续按单据编号查找', {
                        recordId: payload.recordId,
                        message: e.message
                    })
                }
            }
        }

        const prepayByInstanceCode = findPrepayByInstanceCode(payload.instanceCode)

        if (prepayByInstanceCode) {
            return prepayByInstanceCode
        }

        if (payload.recordId) {
            const prepayByDocumentNo = findPrepayByDocumentNo(payload.recordId)

            if (prepayByDocumentNo) {
                return prepayByDocumentNo
            }

            log.audit('按record_id查找预付款申请失败', {
                recordId: payload.recordId,
                instanceCode: payload.instanceCode,
                message: 'record_id不是有效internalid，且未能通过飞书实例号或单据编号定位'
            })
        }

        return null
    }

    /**
     * 通过飞书 user_id 匹配 NetSuite 员工。
     *
     * owner 是员工选择字段，写入时需要员工 internalid；entityid 仅用于日志核对。
     */
    const findEmployeeByFeishuUserId = (feishuUserId) => {
        const normalizedFeishuUserId = String(feishuUserId || '').trim()

        if (!normalizedFeishuUserId) {
            return null
        }

        let employee = null

        try {
            search.create({
                type: search.Type && search.Type.EMPLOYEE ? search.Type.EMPLOYEE : 'employee',
                filters: [
                    [EMPLOYEE_FIELD.feishuUserId, 'is', normalizedFeishuUserId]
                ],
                columns: [
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: 'entityid' })
                ]
            }).run().each((result) => {
                employee = {
                    id: result.getValue({ name: 'internalid' }),
                    entityId: result.getValue({ name: 'entityid' })
                }

                return false
            })
        } catch (e) {
            log.error('按飞书user_id匹配员工失败', {
                feishuUserId: normalizedFeishuUserId,
                message: e.message || e
            })

            return null
        }

        if (!employee || !employee.id) {
            log.audit('未匹配到飞书审批人对应员工', {
                feishuUserId: normalizedFeishuUserId
            })

            return null
        }

        log.audit('匹配到飞书审批人对应员工', {
            feishuUserId: normalizedFeishuUserId,
            employeeInternalId: employee.id,
            employeeId: employee.entityId
        })

        return employee
    }

    /**
     * 新增「审批意见」关联记录。
     *
     * 该记录会出现在预付款申请订单的「审批意见」子列表中，
     * 用于记录节点动作、审批意见，并用飞书 user_id 匹配员工回写所有者。
     */
    const createApprovalComment = (prepayId, payload, node) => {
        const actionText = payload.action === config.ACTION.reject
            ? '拒绝'
            : payload.action === config.ACTION.return
                ? '驳回'
                : payload.action === config.ACTION.cancel
                    ? '撤销'
                    : '通过'
        const approvalComment = payload.comment || '无审批意见'
        const content = '[' + node.name + actionText + ']：' + approvalComment
        const employee = findEmployeeByFeishuUserId(payload.operatorFeishuId)

        const commentRecord = record.create({
            type: COMMENT_RECORD_TYPE,
            isDynamic: true
        })

        commentRecord.setValue({
            fieldId: COMMENT_FIELD.content,
            value: content
        })
        commentRecord.setValue({
            fieldId: COMMENT_FIELD.prepay,
            value: prepayId
        })
        if (employee) {
            commentRecord.setValue({
                fieldId: COMMENT_FIELD.owner,
                value: employee.id
            })
        }

        return commentRecord.save({
            enableSourcing: false,
            ignoreMandatoryFields: true
        })
    }

    /**
     * 回填预付款申请订单审批状态。
     *
     * 这里使用内部 ID 写入 custrecord_swc_advancepay_state，比 setText 更稳定。
     * 写入后，现有 NetSuite 工作流会根据状态字段自动流转。
     */
    const updatePrepayStatus = (prepayId, targetStatus, payload) => {
        const values = {
            [config.FIELD.state]: targetStatus
        }

        if (payload.eventId) {
            values[config.FIELD.feishuLastEventId] = payload.eventId
        }

        if (payload.action === config.ACTION.return) {
            values[config.FIELD.feishuInstanceCode] = ''
        }

        if (config.SOURCE.feishu) {
            values[config.FIELD.feishuLastSource] = config.SOURCE.feishu
        }

        record.submitFields({
            type: config.RECORD_TYPE,
            id: prepayId,
            values,
            options: {
                enableSourcing: true,
                ignoreMandatoryFields: true
            }
        })
    }

    /**
     * RESTlet POST 入口。
     *
     * 关键顺序不能调整：
     * 先做幂等判断，再创建审批意见，再更新状态。
     * 如果先更新状态后创建审批意见，工作流流转成功但审批意见失败时会影响审计完整性。
     */
    const post = (context) => {
        log.audit('收到飞书预付款审批回调Demo请求', context)

        try {
            const payload = normalizePayload(context)
            const isCancelAction = payload.action === config.ACTION.cancel

            if (!payload.instanceCode && !payload.recordId) {
                throw new Error('缺少 instance_code 或 record_id，无法定位预付款申请单')
            }

            if (isCancelAction) {
                log.audit('飞书预付款审批撤回/撤销事件已忽略', {
                    eventId: payload.eventId,
                    recordId: payload.recordId,
                    instanceCode: payload.instanceCode
                })

                return {
                    code: 200,
                    success: true,
                    ignored: true,
                    message: '撤回/撤销事件已忽略',
                    data: {
                        event_id: payload.eventId,
                        record_id: payload.recordId,
                        instance_code: payload.instanceCode,
                        action: payload.action
                    }
                }
            }

            const prepay = lookupPrepay(payload)

            if (!prepay) {
                throw new Error('未找到对应预付款申请单，record_id=' + payload.recordId + ', instance_code=' + payload.instanceCode)
            }

            if (payload.eventId && prepay.lastEventId === payload.eventId) {
                return {
                    code: 200,
                    success: true,
                    duplicate: true,
                    message: '重复事件已忽略',
                    data: {
                        event_id: payload.eventId,
                        ns_record_id: prepay.id
                    }
                }
            }

            const node = config.resolveNode({
                nodeId: payload.nodeId,
                nodeName: payload.nodeName,
                nodeCode: payload.nodeCode,
                currentStatus: prepay.state
            })

            if (!node && !isCancelAction) {
                throw new Error('未配置的飞书节点：' + (payload.nodeId || payload.nodeName || payload.nodeCode || prepay.state || '-'))
            }

            const targetStatus = config.getTargetStatus(node, payload.action)
            const targetStatusText = config.getTargetStatusText(node, payload.action)

            if (!targetStatus) {
                throw new Error('无法根据节点和动作计算目标状态')
            }

            const fallbackNode = node || {
                name: '提交'
            }
            const alertDetails = {
                payload,
                prepay,
                node: fallbackNode,
                targetStatus,
                targetStatusText
            }
            let commentId = ''

            try {
                commentId = retryWriteback('创建审批意见', () => createApprovalComment(prepay.id, payload, fallbackNode))
                retryWriteback('更新预付款审批状态', () => updatePrepayStatus(prepay.id, targetStatus, payload))
            } catch (writebackError) {
                sendFailureAlert(Object.assign({}, alertDetails, {
                    error: writebackError
                }))
                throw writebackError
            }

            log.audit('飞书预付款审批回写成功', {
                prepayId: prepay.id,
                node: fallbackNode.name,
                action: payload.action,
                targetStatus,
                targetStatusText,
                commentId
            })

            return {
                code: 200,
                success: true,
                message: '回写成功',
                data: {
                    ns_record_id: prepay.id,
                    ns_tranid: prepay.tranId,
                    node_id: node && node.id || payload.nodeId,
                    raw_node_id: payload.nodeId,
                    node_name: fallbackNode.name,
                    action: payload.action,
                    target_status: targetStatus,
                    target_status_text: targetStatusText,
                    approval_comment_id: commentId
                }
            }
        } catch (e) {
            log.error('飞书预付款审批回写失败', e)

            return {
                code: 500,
                success: false,
                message: e.message
            }
        }
    }

    return {
        post
    }
})
