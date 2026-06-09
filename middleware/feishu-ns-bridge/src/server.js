require('dotenv').config()

const express = require('express')
const { createApprovalInstance, getApprovalInstance } = require('./feishuClient')
const { postApprovalCallback, postInstanceSync, postRestlet } = require('./netsuiteClient')
const {
    enqueueCallback,
    getQueueSummary,
    listPendingCallbacks,
    loadCallback,
    saveCallback,
    updateCallback
} = require('./callbackQueue')
const {
    getRegistrySummary,
    listPollableInstances,
    saveInstance,
    upsertInstance
} = require('./instanceRegistry')
const {
    buildApprovalForm,
    normalizeFeishuEvent,
    normalizeNsSubmit
} = require('./feishuMapper')

const app = express()

app.use(express.json({ limit: '2mb' }))

function safeStringify(value) {
    try {
        return JSON.stringify(value, null, 2)
    } catch (e) {
        return String(value)
    }
}

function parsePositiveInt(value, fallbackValue) {
    const parsed = Number(value)

    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallbackValue
}

const CALLBACK_QUEUE_ENABLED = process.env.FEISHU_CALLBACK_QUEUE_ENABLED !== 'false'
const CALLBACK_WORKER_ENABLED = process.env.FEISHU_CALLBACK_WORKER_ENABLED !== 'false'
const CALLBACK_WORKER_INTERVAL_MS = parsePositiveInt(process.env.FEISHU_CALLBACK_WORKER_INTERVAL_MS, 30 * 1000)
const CALLBACK_WORKER_BATCH_SIZE = parsePositiveInt(process.env.FEISHU_CALLBACK_WORKER_BATCH_SIZE, 10)
const CALLBACK_COMPENSATION_BASE_DELAY_MS = parsePositiveInt(process.env.FEISHU_CALLBACK_COMPENSATION_BASE_DELAY_MS, 60 * 1000)
const CALLBACK_COMPENSATION_MAX_DELAY_MS = parsePositiveInt(process.env.FEISHU_CALLBACK_COMPENSATION_MAX_DELAY_MS, 30 * 60 * 1000)
const CALLBACK_QUEUE_MAX_ATTEMPTS = parsePositiveInt(process.env.FEISHU_CALLBACK_QUEUE_MAX_ATTEMPTS, 20)
const INSTANCE_POLL_ENABLED = process.env.FEISHU_INSTANCE_POLL_ENABLED !== 'false'
const INSTANCE_POLL_INTERVAL_MS = parsePositiveInt(process.env.FEISHU_INSTANCE_POLL_INTERVAL_MS, 60 * 1000)
const INSTANCE_POLL_BATCH_SIZE = parsePositiveInt(process.env.FEISHU_INSTANCE_POLL_BATCH_SIZE, 20)
const INSTANCE_NEXT_POLL_DELAY_MS = parsePositiveInt(process.env.FEISHU_INSTANCE_NEXT_POLL_DELAY_MS, 60 * 1000)
let workerRunning = false
let instancePollRunning = false

function getNextRunAt(attempts) {
    const delay = Math.min(
        CALLBACK_COMPENSATION_BASE_DELAY_MS * Math.pow(2, Math.max(Number(attempts || 1) - 1, 0)),
        CALLBACK_COMPENSATION_MAX_DELAY_MS
    )

    return new Date(Date.now() + delay).toISOString()
}

function buildRequestMeta(req) {
    return {
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent') || ''
    }
}

app.use((req, res, next) => {
    if (req.path.includes('/feishu/approval')) {
        console.log('Incoming Feishu callback request:', safeStringify({
            method: req.method,
            path: req.path,
            query: req.query,
            body: req.body
        }))
    }

    next()
})

app.get('/health', (req, res) => {
    res.json({
        ok: true,
        callback_queue: getQueueSummary(),
        instance_registry: getRegistrySummary()
    })
})

app.post('/api/ns/approval/submit', async (req, res) => {
    try {
        const payload = normalizeNsSubmit(req.body)

        if (!payload.record_id) {
            return res.status(400).json({ code: 400, success: false, message: 'record_id is required' })
        }

        if (!payload.applicant.feishu_user_id) {
            return res.status(400).json({ code: 400, success: false, message: 'applicant.feishu_user_id is required' })
        }

        const form = buildApprovalForm(payload)

        console.log('Creating Feishu approval:', JSON.stringify({
            record_id: payload.record_id,
            tranid: payload.tranid,
            approval_code: payload.approval_code,
            user_id: payload.applicant.feishu_user_id,
            department_id: payload.department_id,
            form
        }, null, 2))

        const feishuResult = await createApprovalInstance({
            approval_code: payload.approval_code,
            user_id: payload.applicant.feishu_user_id,
            department_id: payload.department_id,
            form
        })

        const syncPayload = {
            event_type: 'FEISHU_INSTANCE_CREATED',
            event_id: payload.event_id,
            record_id: payload.record_id,
            tranid: payload.tranid,
            record_type: payload.record_type,
            approval_code: payload.approval_code,
            instance_code: feishuResult.instance_code,
            sync_status: 'FEISHU_CREATED'
        }
        const nsSyncResult = await postInstanceSync(syncPayload)
        upsertInstance({
            instanceCode: feishuResult.instance_code,
            recordId: payload.record_id,
            tranId: payload.tranid,
            approvalCode: payload.approval_code,
            status: 'ACTIVE'
        })

        console.log('Feishu approval created:', JSON.stringify({
            record_id: payload.record_id,
            instance_code: feishuResult.instance_code,
            ns_sync: nsSyncResult.skipped ? nsSyncResult.message : 'done'
        }, null, 2))

        return res.json({
            code: 200,
            success: true,
            message: '飞书审批创建成功',
            data: {
                record_id: payload.record_id,
                tranid: payload.tranid,
                approval_code: payload.approval_code,
                instance_code: feishuResult.instance_code,
                ns_sync: nsSyncResult
            }
        })
    } catch (e) {
        console.error('submit approval error:', e)

        return res.status(500).json({
            code: 500,
            success: false,
            message: e.message
        })
    }
})

async function handleFeishuApprovalCallback(req, res) {
    try {
        const body = req.body

        // 飞书首次配置回调地址时会发 challenge。
        if (body.challenge) {
            console.log('Feishu callback challenge received')
            return res.json({ challenge: body.challenge })
        }

        // demo 阶段可先用 verification token 校验。
        const token = body.token || (body.header && body.header.token)
        if (process.env.FEISHU_VERIFICATION_TOKEN && token !== process.env.FEISHU_VERIFICATION_TOKEN) {
            return res.status(403).json({ code: 403, msg: 'invalid feishu token' })
        }

        if (!CALLBACK_QUEUE_ENABLED) {
            const result = await processFeishuCallbackBody(body)

            return res.json({
                code: 0,
                msg: result.ignored ? 'ignored' : 'success',
                data: result.nsResult || result.nsPayload
            })
        }

        const queueRecord = enqueueCallback(body, buildRequestMeta(req))
        setImmediate(() => {
            processQueuedCallback(queueRecord.id).catch((e) => {
                console.error('async callback queue processing error:', e)
            })
        })

        return res.json({
            code: 0,
            msg: 'queued',
            data: {
                queue_id: queueRecord.id,
                event_id: queueRecord.eventId,
                instance_code: queueRecord.instanceCode,
                status: queueRecord.status
            }
        })
    } catch (e) {
        console.error('callback error:', e)

        return res.status(500).json({
            code: 500,
            msg: e.message
        })
    }
}

async function processFeishuCallbackBody(body, existingInstanceDetail) {
    const preliminaryPayload = normalizeFeishuEvent(body)
    let instanceDetail = existingInstanceDetail || null

    if (!instanceDetail && preliminaryPayload.instance_code) {
        instanceDetail = await getApprovalInstance(preliminaryPayload.instance_code)
    }

    const nsPayload = normalizeFeishuEvent(body, instanceDetail)

    if (nsPayload.instance_code) {
        upsertInstance({
            instanceCode: nsPayload.instance_code,
            recordId: nsPayload.record_id,
            approvalCode: nsPayload.approval_code,
            status: 'ACTIVE'
        })
    }

    if (!nsPayload.action) {
        console.log('Feishu event ignored:', safeStringify(nsPayload))

        return {
            ignored: true,
            nsPayload
        }
    }

    console.log('Feishu event normalized:', JSON.stringify(nsPayload, null, 2))

    const nsResult = await postApprovalCallback(nsPayload)

    console.log('NetSuite RESTlet result:', JSON.stringify(nsResult, null, 2))

    if (nsResult && nsResult.success === false) {
        throw new Error(`NetSuite RESTlet callback failed: ${nsResult.message || safeStringify(nsResult)}`)
    }

    return {
        ignored: false,
        nsPayload,
        nsResult
    }
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

function mapCompensationAction(rawAction) {
    const value = String(rawAction || '').toUpperCase()
    const compactValue = value.replace(/[\s_\-]/g, '')

    if ([
        'APPROVE',
        'APPROVED',
        'PASS',
        'PASSED',
        'AGREE',
        'AGREED',
        'DONE',
        '同意',
        '已同意',
        '通过',
        '已通过',
        '批准',
        '已批准'
    ].includes(value)) {
        return 'APPROVE'
    }

    if (['REJECT', 'REJECTED', 'REFUSE', 'REFUSED', '拒绝', '已拒绝', '驳回', '已驳回'].includes(value)) {
        return 'REJECT'
    }

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
    ].includes(value)
        || ['ROLLBACK', 'ROLLBACKED', 'SENTBACK', 'SENDBACK'].includes(compactValue)
        || value.indexOf('退回') !== -1
        || value.indexOf('打回') !== -1) {
        return 'RETURN'
    }

    return ''
}

function pickText(...values) {
    for (let i = 0; i < values.length; i += 1) {
        if (values[i] !== undefined && values[i] !== null && values[i] !== '') {
            return values[i]
        }
    }

    return ''
}

function getTimelineTaskId(item) {
    return item && (item.task_id || item.taskId || item.task && (item.task.id || item.task.task_id || item.task.taskId)) || ''
}

function getTimelineEventKey(instanceCode, item, action) {
    return [
        instanceCode,
        getTimelineTaskId(item),
        pickText(item && item.node_key, item && item.nodeKey, item && item.def_key, item && item.defKey, item && item.node_id, item && item.nodeId),
        action,
        item && (item.create_time || item.createTime || item.operate_time || item.operateTime || item.time || item.update_time || item.updateTime)
    ].map((value) => String(value || '')).join('|')
}

function resolveInstanceCode(instanceRecord, instanceDetail) {
    return pickText(
        instanceRecord && instanceRecord.instanceCode,
        instanceDetail && instanceDetail.instance_code,
        instanceDetail && instanceDetail.instanceCode
    )
}

function getTimelineNodeKey(item) {
    return pickText(item && item.node_key, item && item.nodeKey, item && item.def_key, item && item.defKey)
}

function getTimelineNodeId(item) {
    return pickText(item && item.node_id, item && item.nodeId)
}

function getTimelineNodeName(item) {
    return pickText(item && item.node_name, item && item.nodeName, item && item.name, item && item.task_name, item && item.taskName)
}

function getTimelineUserId(item) {
    return pickText(item && item.user_id, item && item.userId, item && item.open_id, item && item.openId)
}

function getTimelineComment(item) {
    return item && item.comment || ''
}

function getTimelineAction(item) {
    return getActionValues(item).map(mapCompensationAction).find(Boolean)
}

function getTimelineEventTime(item) {
    return item && (item.create_time || item.createTime || item.operate_time || item.operateTime || item.time || item.update_time || item.updateTime)
}

function makeTimelineMatch(instanceCode, item) {
    const action = getTimelineAction(item)

    if (!action) {
        return null
    }

    const eventKey = getTimelineEventKey(instanceCode, item, action)

    if (!eventKey) {
        return null
    }

    return {
        item,
        action,
        eventKey
    }
}

function getOrderedTimelineMatches(instanceRecord, instanceDetail) {
    const timeline = instanceDetail && Array.isArray(instanceDetail.timeline) ? instanceDetail.timeline : []
    const instanceCode = resolveInstanceCode(instanceRecord, instanceDetail)
    const matches = timeline
        .map((item) => makeTimelineMatch(instanceCode, item))
        .filter(Boolean)

    if (!instanceRecord.lastEventKey) {
        return matches
    }

    const lastIndex = matches.findIndex((match) => match.eventKey === instanceRecord.lastEventKey)

    return lastIndex === -1 ? matches : matches.slice(lastIndex + 1)
}

function buildCompensationCallbackBody(instanceRecord, instanceDetail, timelineMatch) {
    const item = timelineMatch.item
    const taskId = getTimelineTaskId(item)
    const instanceCode = resolveInstanceCode(instanceRecord, instanceDetail)
    const eventId = 'poll:' + Buffer.from(timelineMatch.eventKey).toString('base64').replace(/=+$/g, '')

    return {
        uuid: eventId,
        type: 'poll_compensation',
        event: {
            instance_code: instanceCode,
            approval_instance_code: instanceCode,
            approval_code: instanceRecord.approvalCode || instanceDetail.approval_code || instanceDetail.approvalCode || '',
            record_id: instanceRecord.recordId || '',
            task_id: taskId,
            node_id: pickText(item.node_id, item.nodeId),
            node_key: pickText(item.node_key, item.nodeKey, item.def_key, item.defKey),
            def_key: pickText(item.def_key, item.defKey, item.node_key, item.nodeKey),
            node_name: pickText(item.node_name, item.nodeName, item.name, item.task_name, item.taskName),
            action: timelineMatch.action,
            status: timelineMatch.action,
            user_id: pickText(item.user_id, item.userId, item.open_id, item.openId),
            operator_user_id: pickText(item.user_id, item.userId, item.open_id, item.openId),
            comment: item.comment || ''
        }
    }
}

async function pollFeishuInstance(instanceRecord) {
    const now = new Date().toISOString()

    try {
        const instanceDetail = await getApprovalInstance(instanceRecord.instanceCode)
        const instanceStatus = String(instanceDetail.status || '').toUpperCase()
        const timelineMatches = getOrderedTimelineMatches(instanceRecord, instanceDetail)
        let lastEventKey = instanceRecord.lastEventKey || ''
        let lastEventId = instanceRecord.lastEventId || ''
        let lastResult = null

        for (let i = 0; i < timelineMatches.length; i += 1) {
            const timelineMatch = timelineMatches[i]
            const body = buildCompensationCallbackBody(instanceRecord, instanceDetail, timelineMatch)
            lastResult = await processFeishuCallbackBody(body, instanceDetail)
            lastEventKey = timelineMatch.eventKey
            lastEventId = body.uuid
        }

        saveInstance({
            ...instanceRecord,
            status: ['APPROVED', 'REJECTED', 'CANCELED', 'CANCELLED'].includes(instanceStatus) ? 'DONE' : 'ACTIVE',
            lastPollAt: now,
            nextPollAt: new Date(Date.now() + INSTANCE_NEXT_POLL_DELAY_MS).toISOString(),
            lastEventKey,
            lastEventId,
            lastResult: lastResult && (lastResult.nsResult || lastResult.nsPayload) || instanceRecord.lastResult || null,
            lastError: ''
        })

        return lastResult
    } catch (e) {
        saveInstance({
            ...instanceRecord,
            status: 'ACTIVE',
            lastPollAt: now,
            nextPollAt: new Date(Date.now() + INSTANCE_NEXT_POLL_DELAY_MS).toISOString(),
            lastError: e.message
        })
        throw e
    }
}

async function runInstancePollerOnce() {
    if (instancePollRunning) {
        return
    }

    instancePollRunning = true

    try {
        const records = listPollableInstances().slice(0, INSTANCE_POLL_BATCH_SIZE)

        for (let i = 0; i < records.length; i += 1) {
            try {
                await pollFeishuInstance(records[i])
            } catch (e) {
                console.error('Feishu instance poll failed:', {
                    instanceCode: records[i].instanceCode,
                    recordId: records[i].recordId,
                    message: e.message
                })
            }
        }
    } finally {
        instancePollRunning = false
    }
}

async function processQueuedCallback(queueId) {
    const record = loadCallback(queueId)

    if (!record || record.status === 'SUCCESS' || record.status === 'IGNORED') {
        return record
    }

    if (Number(record.attempts || 0) >= CALLBACK_QUEUE_MAX_ATTEMPTS) {
        return updateCallback(queueId, {
            status: 'DEAD',
            message: `exceeded max attempts ${CALLBACK_QUEUE_MAX_ATTEMPTS}`
        })
    }

    const attempts = Number(record.attempts || 0) + 1

    saveCallback({
        ...record,
        status: 'PROCESSING',
        attempts,
        processingStartedAt: new Date().toISOString()
    })

    try {
        const instanceCode = record.instanceCode || normalizeFeishuEvent(record.body).instance_code
        const instanceDetail = instanceCode ? await getApprovalInstance(instanceCode) : null
        const result = await processFeishuCallbackBody(record.body, instanceDetail)

        return updateCallback(queueId, {
            status: result.ignored ? 'IGNORED' : 'SUCCESS',
            attempts,
            processedAt: new Date().toISOString(),
            nsPayload: result.nsPayload,
            nsResult: result.nsResult || null,
            error: ''
        })
    } catch (e) {
        const failedStatus = attempts >= CALLBACK_QUEUE_MAX_ATTEMPTS ? 'DEAD' : 'FAILED'

        console.error('queued Feishu callback processing failed:', {
            queueId,
            attempts,
            nextRunAt: failedStatus === 'FAILED' ? getNextRunAt(attempts) : '',
            message: e.message
        })

        return updateCallback(queueId, {
            status: failedStatus,
            attempts,
            nextRunAt: failedStatus === 'FAILED' ? getNextRunAt(attempts) : '',
            lastFailedAt: new Date().toISOString(),
            error: e.message
        })
    }
}

async function runCallbackWorkerOnce() {
    if (workerRunning) {
        return
    }

    workerRunning = true

    try {
        const pendingRecords = listPendingCallbacks({
            maxAttempts: CALLBACK_QUEUE_MAX_ATTEMPTS
        }).slice(0, CALLBACK_WORKER_BATCH_SIZE)

        for (let i = 0; i < pendingRecords.length; i += 1) {
            await processQueuedCallback(pendingRecords[i].id)
        }
    } finally {
        workerRunning = false
    }
}

app.get('/api/feishu/approval/callback-queue', (req, res) => {
    res.json(getQueueSummary())
})

app.get('/api/feishu/approval/instances', (req, res) => {
    res.json(getRegistrySummary())
})

app.post('/api/feishu/approval/callback-queue/run', async (req, res) => {
    try {
        await runCallbackWorkerOnce()
        res.json({
            code: 0,
            msg: 'success',
            data: getQueueSummary()
        })
    } catch (e) {
        res.status(500).json({
            code: 500,
            msg: e.message
        })
    }
})

app.post('/api/feishu/approval/instances/poll', async (req, res) => {
    try {
        await runInstancePollerOnce()
        res.json({
            code: 0,
            msg: 'success',
            data: getRegistrySummary()
        })
    } catch (e) {
        res.status(500).json({
            code: 500,
            msg: e.message
        })
    }
})

app.post('/api/feishu/approval/callback', handleFeishuApprovalCallback)
app.post('/feishu/approval/callback', handleFeishuApprovalCallback)

// 本地模拟飞书事件，方便不用飞书也能测完整链路。
app.post('/mock/feishu/approval', async (req, res) => {
    try {
        const nsResult = await postRestlet(req.body)
        res.json(nsResult)
    } catch (e) {
        res.status(500).json({ success: false, message: e.message })
    }
})

app.post('/api/mock/feishu/approval', async (req, res) => {
    try {
        const nsResult = await postRestlet(req.body)
        res.json(nsResult)
    } catch (e) {
        res.status(500).json({ success: false, message: e.message })
    }
})

function startServer() {
    const port = Number(process.env.PORT || 3000)
    const host = process.env.HOST || '127.0.0.1'

    return app.listen(port, host, (error) => {
        if (error) {
            console.error(`Failed to start Feishu-NetSuite bridge at http://${host}:${port}:`, error)
            process.exitCode = 1
            return
        }

        console.log(`Feishu-NetSuite bridge running at http://${host}:${port}`)
        if (CALLBACK_QUEUE_ENABLED && CALLBACK_WORKER_ENABLED) {
            console.log(`Feishu callback queue worker enabled, interval ${CALLBACK_WORKER_INTERVAL_MS}ms`)
            setInterval(() => {
                runCallbackWorkerOnce().catch((e) => {
                    console.error('callback queue worker error:', e)
                })
            }, CALLBACK_WORKER_INTERVAL_MS)
        }
        if (INSTANCE_POLL_ENABLED) {
            console.log(`Feishu instance poller enabled, interval ${INSTANCE_POLL_INTERVAL_MS}ms`)
            setInterval(() => {
                runInstancePollerOnce().catch((e) => {
                    console.error('Feishu instance poller error:', e)
                })
            }, INSTANCE_POLL_INTERVAL_MS)
        }
    })
}

if (require.main === module) {
    startServer()
}

module.exports = {
    app,
    buildCompensationCallbackBody,
    getOrderedTimelineMatches,
    pollFeishuInstance,
    processFeishuCallbackBody,
    processQueuedCallback,
    runCallbackWorkerOnce,
    runInstancePollerOnce,
    startServer
}
