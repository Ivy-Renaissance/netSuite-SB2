const axios = require('axios')

const FEISHU_BASE_URL = process.env.FEISHU_BASE_URL || 'https://open.feishu.cn/open-apis'

let tokenCache = {
    token: '',
    expiresAt: 0
}

function requireEnv(name) {
    const value = process.env[name]

    if (!value) {
        throw new Error(`Missing required env ${name}`)
    }

    return value
}

async function getTenantAccessToken() {
    const now = Date.now()

    if (tokenCache.token && tokenCache.expiresAt > now + 60 * 1000) {
        return tokenCache.token
    }

    const res = await axios.post(`${FEISHU_BASE_URL}/auth/v3/tenant_access_token/internal`, {
        app_id: requireEnv('FEISHU_APP_ID'),
        app_secret: requireEnv('FEISHU_APP_SECRET')
    }, {
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        },
        timeout: 15000
    }).catch((e) => {
        throw formatAxiosError('Feishu tenant token request failed', e)
    })

    if (res.data.code !== 0) {
        throw new Error(`Feishu tenant token request failed: ${JSON.stringify(res.data)}`)
    }

    tokenCache = {
        token: res.data.tenant_access_token,
        expiresAt: now + Number(res.data.expire || 7200) * 1000
    }

    return tokenCache.token
}

async function feishuRequest(config) {
    const token = await getTenantAccessToken()
    const res = await axios({
        baseURL: FEISHU_BASE_URL,
        timeout: 20000,
        ...config,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
            ...(config.headers || {})
        }
    }).catch((e) => {
        throw formatAxiosError('Feishu API request failed', e)
    })

    if (res.data && typeof res.data.code !== 'undefined' && res.data.code !== 0) {
        throw new Error(`Feishu API request failed: ${JSON.stringify(res.data)}`)
    }

    return res.data
}

function formatAxiosError(prefix, e) {
    const status = e.response && e.response.status
    const responseBody = e.response && e.response.data
    const detail = responseBody ? `: ${JSON.stringify(responseBody)}` : ''

    return new Error(`${prefix}${status ? ` with status ${status}` : ''}${detail}`)
}

async function createApprovalInstance(payload) {
    const body = {
        approval_code: payload.approval_code,
        user_id: payload.user_id,
        form: JSON.stringify(payload.form || [])
    }

    if (payload.department_id) {
        body.department_id = payload.department_id
    }

    const data = await feishuRequest({
        method: 'POST',
        url: '/approval/v4/instances?user_id_type=user_id',
        data: body
    })

    const instanceCode = data.data && data.data.instance_code

    if (!instanceCode) {
        throw new Error(`Feishu approval instance response missing instance_code: ${JSON.stringify(data)}`)
    }

    return {
        raw: data,
        instance_code: instanceCode
    }
}

async function getApprovalInstance(instanceCode) {
    if (!instanceCode) {
        return null
    }

    const data = await feishuRequest({
        method: 'GET',
        url: `/approval/v4/instances/${encodeURIComponent(instanceCode)}?user_id_type=user_id`
    })

    return data.data || data
}

module.exports = {
    createApprovalInstance,
    getApprovalInstance,
    getTenantAccessToken
}
