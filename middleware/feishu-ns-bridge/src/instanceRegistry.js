const fs = require('fs')
const path = require('path')

const DEFAULT_REGISTRY_DIR = path.resolve(__dirname, '..', 'data', 'instances')

function getRegistryDir() {
    return process.env.FEISHU_INSTANCE_REGISTRY_DIR || DEFAULT_REGISTRY_DIR
}

function ensureRegistryDir() {
    fs.mkdirSync(getRegistryDir(), {
        recursive: true
    })
}

function sanitizeId(value) {
    return String(value || '')
        .replace(/[^a-zA-Z0-9_.-]/g, '_')
        .slice(0, 160)
}

function getInstanceFile(instanceCode) {
    return path.join(getRegistryDir(), `${sanitizeId(instanceCode)}.json`)
}

function readJsonFile(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch (e) {
        return null
    }
}

function writeJsonFile(filePath, value) {
    ensureRegistryDir()

    const tmpFile = `${filePath}.${process.pid}.${Date.now()}.tmp`

    fs.writeFileSync(tmpFile, JSON.stringify(value, null, 2))
    fs.renameSync(tmpFile, filePath)
}

function upsertInstance(input) {
    if (!input || !input.instanceCode) {
        return null
    }

    ensureRegistryDir()

    const filePath = getInstanceFile(input.instanceCode)
    const existing = readJsonFile(filePath) || {}
    const now = new Date().toISOString()
    const record = {
        ...existing,
        instanceCode: input.instanceCode,
        recordId: input.recordId || existing.recordId || '',
        tranId: input.tranId || existing.tranId || '',
        approvalCode: input.approvalCode || existing.approvalCode || '',
        status: input.status || existing.status || 'ACTIVE',
        firstSeenAt: existing.firstSeenAt || now,
        updatedAt: now,
        nextPollAt: input.nextPollAt || existing.nextPollAt || now,
        lastPollAt: existing.lastPollAt || '',
        lastEventKey: input.lastEventKey || existing.lastEventKey || '',
        lastEventId: input.lastEventId || existing.lastEventId || '',
        lastError: input.lastError === undefined ? existing.lastError || '' : input.lastError
    }

    writeJsonFile(filePath, record)
    return record
}

function loadInstance(instanceCode) {
    if (!instanceCode) {
        return null
    }

    return readJsonFile(getInstanceFile(instanceCode))
}

function saveInstance(record) {
    writeJsonFile(getInstanceFile(record.instanceCode), record)
    return record
}

function listInstances() {
    ensureRegistryDir()

    return fs.readdirSync(getRegistryDir())
        .filter((fileName) => fileName.endsWith('.json'))
        .map((fileName) => readJsonFile(path.join(getRegistryDir(), fileName)))
        .filter(Boolean)
        .sort((a, b) => String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')))
}

function listPollableInstances(options = {}) {
    const now = options.now || new Date()
    const nowMs = now.getTime()

    return listInstances().filter((record) => {
        if (!record.instanceCode || record.status === 'DONE' || record.status === 'DISABLED') {
            return false
        }

        const nextPollAt = Date.parse(record.nextPollAt || record.updatedAt || 0)

        return !nextPollAt || nextPollAt <= nowMs
    })
}

function getRegistrySummary() {
    const records = listInstances()
    const summary = records.reduce((result, record) => {
        result[record.status] = (result[record.status] || 0) + 1
        return result
    }, {})

    return {
        total: records.length,
        summary,
        registryDir: getRegistryDir()
    }
}

module.exports = {
    getRegistrySummary,
    listInstances,
    listPollableInstances,
    loadInstance,
    saveInstance,
    upsertInstance
}
