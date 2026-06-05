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
 */
define([
    'N/record',
    'N/search',
    'N/log',
    '../common/SWC_Feishu_Approval_Demo_Config'
], (record, search, log, config) => {
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

    const pick = (...values) => {
        for (let i = 0; i < values.length; i += 1) {
            if (values[i] !== undefined && values[i] !== null && values[i] !== '') {
                return values[i]
            }
        }

        return ''
    }

    const getTaskId = (event) => pick(
        event.task_id,
        event.taskId,
        event.task && pick(event.task.id, event.task.task_id, event.task.taskId)
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
            const matchedByTaskId = timeline.find((item) => String(pick(item.task_id, item.taskId)) === String(taskId))

            if (matchedByTaskId) {
                return matchedByTaskId
            }
        }

        return timeline[timeline.length - 1]
    }

    const mapAction = (rawAction) => {
        const normalizedAction = String(rawAction || '').toUpperCase()

        if (normalizedAction === 'REJECTED' || normalizedAction === 'REJECT') {
            return config.ACTION.reject
        }

        if (normalizedAction === 'RETURNED' || normalizedAction === 'RETURN' || normalizedAction === 'BACK') {
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

        return config.ACTION.approve
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
        const rawAction = pick(
            context.action,
            event.action,
            event.status,
            event.task_result,
            event.taskResult,
            event.task_status_name,
            event.taskStatusName,
            event.task_status,
            event.taskStatus,
            event.approval_status,
            event.approvalStatus,
            timelineEvent && timelineEvent.type
        )
        const action = containsCancelSignal(context, 0)
            ? config.ACTION.cancel
            : mapAction(rawAction)

        return {
            eventId: pick(context.event_id, context.eventId, event.event_id, event.uuid, event.log_id),
            instanceCode,
            recordId: pick(context.record_id, context.recordId, event.record_id, event.recordId),
            nodeId,
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
     * 1. payload.recordId：最准确，适合中间 APP 已维护映射表的场景。
     * 2. payload.instanceCode：通过 NS 字段 custrecord_swc_feishu_instance_code 反查。
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

            const prepayByDocumentNo = findPrepayByDocumentNo(payload.recordId)

            if (prepayByDocumentNo) {
                return prepayByDocumentNo
            }

            log.audit('按单据编号查找预付款申请失败，继续按飞书实例号查找', {
                recordId: payload.recordId,
                instanceCode: payload.instanceCode
            })
        }

        return findPrepayByInstanceCode(payload.instanceCode)
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
            ? '驳回'
            : payload.action === config.ACTION.return
                ? '打回'
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
            const node = config.getNode(payload.nodeId)
            const isCancelAction = payload.action === config.ACTION.cancel

            if (!payload.instanceCode && !payload.recordId) {
                throw new Error('缺少 instance_code 或 record_id，无法定位预付款申请单')
            }

            if ((!payload.nodeId || !node) && !isCancelAction) {
                throw new Error('未配置的飞书节点：' + payload.nodeId)
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

            const targetStatus = config.getTargetStatus(payload.nodeId, payload.action)
            const targetStatusText = config.getTargetStatusText(payload.nodeId, payload.action)

            if (!targetStatus) {
                throw new Error('无法根据节点和动作计算目标状态')
            }

            const commentId = createApprovalComment(prepay.id, payload, node || {
                name: '提交'
            })
            updatePrepayStatus(prepay.id, targetStatus, payload)

            log.audit('飞书预付款审批回写成功', {
                prepayId: prepay.id,
                node: node ? node.name : '提交',
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
                    node_id: payload.nodeId,
                    node_name: node ? node.name : '提交',
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
