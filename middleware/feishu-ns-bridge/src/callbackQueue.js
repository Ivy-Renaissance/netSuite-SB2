const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const DEFAULT_QUEUE_DIR = path.resolve(__dirname, '..', 'data', 'callback-queue')

function getQueueDir() {
    return process.env.FEISHU_CALLBACK_QUEUE_DIR || DEFAULT_QUEUE_DIR
}

function ensureQueueDir() {
    fs.mkdirSync(getQueueDir(), {
        recursive: true
    })
}

function safeString(value) {
    if (value === undefined || value === null || value === '') {
        return ''
    }

    return String(value)
}

function pick(...values) {
    for (let i = 0; i < values.length; i += 1) {
        if (values[i] !== undefined && values[i] !== null && values[i] !== '') {
            return values[i]
        }
    }

    return ''
}

function getEvent(body) {
    return body && (body.event || body) || {}
}

function getEventId(body) {
    const event = getEvent(body)
    const header = body && body.header || {}

    return pick(
        header.event_id,
        header.eventId,
        body && body.event_id,
        body && body.eventId,
        body && body.uuid,
        event.event_id,
        event.eventId,
        event.uuid,
        event.log_id,
        event.logId
    )
}

function getInstanceCode(body) {
    const event = getEvent(body)

    return pick(
        body && body.instance_code,
        body && body.instanceCode,
        event.instance_code,
        event.instanceCode,
        event.approval_instance_code,
        event.approvalInstanceCode,
        event.approval_instance && event.approval_instance.instance_code,
        event.instance && event.instance.instance_code
    )
}

function getQueueId(body) {
    const event = getEvent(body)
    const eventId = getEventId(body)

    if (eventId) {
        return sanitizeId(eventId)
    }

    const stableText = [
        getInstanceCode(body),
        pick(event.task_id, event.taskId, event.def_key, event.defKey, event.status),
        JSON.stringify(body || {})
    ].join('|')

    return crypto.createHash('sha256').update(stableText).digest('hex')
}

function sanitizeId(value) {
    const id = safeString(value).replace(/[^a-zA-Z0-9_.-]/g, '_')

    if (id) {
        return id.slice(0, 120)
    }

    return crypto.randomBytes(16).toString('hex')
}

function getQueueFile(id) {
    return path.join(getQueueDir(), `${sanitizeId(id)}.json`)
}

function readJsonFile(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch (e) {
        return null
    }
}

function writeJsonFile(filePath, value) {
    ensureQueueDir()

    const tmpFile = `${filePath}.${process.pid}.${Date.now()}.tmp`

    fs.writeFileSync(tmpFile, JSON.stringify(value, null, 2))
    fs.renameSync(tmpFile, filePath)
}

function enqueueCallback(body, meta = {}) {
    ensureQueueDir()

    const id = getQueueId(body)
    const filePath = getQueueFile(id)
    const now = new Date().toISOString()
    const existing = readJsonFile(filePath)

    if (existing) {
        const updated = {
            ...existing,
            duplicateCount: Number(existing.duplicateCount || 0) + 1,
            lastReceivedAt: now,
            lastMeta: meta
        }

        writeJsonFile(filePath, updated)
        return updated
    }

    const record = {
        id,
        status: 'RECEIVED',
        eventId: getEventId(body),
        instanceCode: getInstanceCode(body),
        attempts: 0,
        duplicateCount: 0,
        receivedAt: now,
        lastReceivedAt: now,
        nextRunAt: now,
        body,
        meta
    }

    writeJsonFile(filePath, record)
    return record
}

function loadCallback(id) {
    return readJsonFile(getQueueFile(id))
}

function saveCallback(record) {
    writeJsonFile(getQueueFile(record.id), record)
    return record
}

function updateCallback(id, patch) {
    const record = loadCallback(id)

    if (!record) {
        return null
    }

    return saveCallback({
        ...record,
        ...patch,
        updatedAt: new Date().toISOString()
    })
}

function listCallbacks() {
    ensureQueueDir()

    return fs.readdirSync(getQueueDir())
        .filter((fileName) => fileName.endsWith('.json'))
        .map((fileName) => readJsonFile(path.join(getQueueDir(), fileName)))
        .filter(Boolean)
        .sort((a, b) => safeString(a.receivedAt).localeCompare(safeString(b.receivedAt)))
}

function listPendingCallbacks(options = {}) {
    const now = options.now || new Date()
    const maxAttempts = Number(options.maxAttempts || process.env.FEISHU_CALLBACK_QUEUE_MAX_ATTEMPTS || 20)
    const processingTimeoutMs = Number(options.processingTimeoutMs || process.env.FEISHU_CALLBACK_PROCESSING_TIMEOUT_MS || 5 * 60 * 1000)
    const nowMs = now.getTime()

    return listCallbacks().filter((record) => {
        if (record.status === 'SUCCESS' || record.status === 'IGNORED') {
            return false
        }

        if (Number(record.attempts || 0) >= maxAttempts) {
            return false
        }

        if (record.status === 'PROCESSING') {
            const processingStartedAt = Date.parse(record.processingStartedAt || 0)

            return processingStartedAt && nowMs - processingStartedAt > processingTimeoutMs
        }

        const nextRunAt = Date.parse(record.nextRunAt || record.receivedAt || 0)

        return !nextRunAt || nextRunAt <= nowMs
    })
}

function getQueueSummary() {
    const records = listCallbacks()
    const summary = records.reduce((result, record) => {
        result[record.status] = (result[record.status] || 0) + 1
        return result
    }, {})

    return {
        total: records.length,
        summary,
        queueDir: getQueueDir()
    }
}

module.exports = {
    enqueueCallback,
    getEventId,
    getInstanceCode,
    getQueueDir,
    getQueueId,
    getQueueSummary,
    listCallbacks,
    listPendingCallbacks,
    loadCallback,
    saveCallback,
    updateCallback
}
