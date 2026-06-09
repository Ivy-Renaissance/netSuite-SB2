const axios = require('axios')
const OAuth = require('oauth-1.0a')
const crypto = require('crypto')

function parsePositiveInt(value, fallbackValue) {
    const parsed = Number(value)

    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallbackValue
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function safeStringify(value) {
    try {
        return JSON.stringify(value)
    } catch (e) {
        return String(value)
    }
}

function getNetSuiteRealm() {
    return (process.env.NETSUITE_REALM || process.env.NETSUITE_ACCOUNT_ID || '')
        .trim()
        .replace(/-/g, '_')
        .toUpperCase()
}

function buildOAuthClient() {
    const signatureMethod = process.env.NETSUITE_SIGNATURE_METHOD || 'HMAC-SHA256'
    const hashAlgorithm = signatureMethod === 'HMAC-SHA1' ? 'sha1' : 'sha256'

    return OAuth({
        consumer: {
            key: process.env.NETSUITE_CONSUMER_KEY,
            secret: process.env.NETSUITE_CONSUMER_SECRET
        },
        signature_method: signatureMethod,
        hash_function(baseString, key) {
            return crypto.createHmac(hashAlgorithm, key).update(baseString).digest('base64')
        }
    })
}

async function postRestlet(payload, url = process.env.NETSUITE_RESTLET_URL) {
    if (!url) {
        throw new Error('Missing NetSuite RESTlet URL')
    }

    const realm = getNetSuiteRealm()
    const oauth = buildOAuthClient()

    const token = {
        key: process.env.NETSUITE_TOKEN_ID,
        secret: process.env.NETSUITE_TOKEN_SECRET
    }

    const requestData = {
        url,
        method: 'POST'
    }

    const oauthHeader = oauth.toHeader(oauth.authorize(requestData, token)).Authorization
    const authorization = `OAuth realm="${realm}",${oauthHeader.replace(/^OAuth\s*/, '')}`

    try {
        const res = await axios.post(url, payload, {
            headers: {
                Authorization: authorization,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        })

        return res.data
    } catch (e) {
        const status = e.response && e.response.status
        const responseBody = e.response && e.response.data
        const detail = responseBody ? `: ${JSON.stringify(responseBody)}` : ''
        const transportDetail = !responseBody && (e.code || e.message)
            ? `: ${[e.code, e.message].filter(Boolean).join(' ')}`
            : ''

        throw new Error(`NetSuite RESTlet request failed${status ? ` with status ${status}` : ''}${detail}${transportDetail}`)
    }
}

async function postApprovalCallback(payload) {
    const attempts = parsePositiveInt(process.env.NETSUITE_CALLBACK_RETRY_ATTEMPTS, 3)
    const baseDelayMs = parsePositiveInt(process.env.NETSUITE_CALLBACK_RETRY_DELAY_MS, 1000)
    let lastError = null

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const result = await postRestlet(payload, process.env.NETSUITE_RESTLET_URL)

            if (attempt > 1) {
                console.log(`NetSuite callback retry succeeded on attempt ${attempt}/${attempts}`)
            }

            return result
        } catch (e) {
            lastError = e
            console.error(`NetSuite callback attempt ${attempt}/${attempts} failed:`, e.message)

            if (attempt < attempts) {
                await sleep(baseDelayMs * Math.pow(2, attempt - 1))
            }
        }
    }

    await sendCallbackAlert(payload, lastError, attempts)
    throw lastError
}

async function postInstanceSync(payload) {
    const url = process.env.NETSUITE_INSTANCE_SYNC_RESTLET_URL
        || process.env.NETSUITE_SUBMIT_SYNC_RESTLET_URL

    if (!url) {
        return {
            skipped: true,
            message: 'NETSUITE_INSTANCE_SYNC_RESTLET_URL not configured',
            payload
        }
    }

    return postRestlet(payload, url)
}

module.exports = {
    postApprovalCallback,
    postInstanceSync,
    postRestlet
}

async function sendCallbackAlert(payload, error, attempts) {
    const webhookUrl = process.env.FEISHU_CALLBACK_ALERT_WEBHOOK_URL

    if (!webhookUrl) {
        console.error('NetSuite callback failed after retries and FEISHU_CALLBACK_ALERT_WEBHOOK_URL is not configured:', safeStringify({
            attempts,
            event_id: payload && payload.event_id,
            instance_code: payload && payload.instance_code,
            record_id: payload && payload.record_id,
            message: error && error.message
        }))
        return
    }

    const text = [
        'NetSuite 飞书审批回调转发失败预警',
        `事件ID：${payload && payload.event_id || '-'}`,
        `NS记录ID：${payload && payload.record_id || '-'}`,
        `飞书实例号：${payload && payload.instance_code || '-'}`,
        `节点：${payload && (payload.node_name || payload.node_id) || '-'}`,
        `动作：${payload && payload.action || '-'}`,
        `尝试次数：${attempts}`,
        `错误信息：${error && error.message || error || '-'}`,
        `发生时间：${new Date().toISOString()}`
    ].join('\n')

    try {
        await axios.post(webhookUrl, {
            msg_type: 'text',
            content: {
                text
            }
        }, {
            timeout: 10000
        })
    } catch (alertError) {
        console.error('Feishu callback alert webhook failed:', alertError.message)
    }
}
