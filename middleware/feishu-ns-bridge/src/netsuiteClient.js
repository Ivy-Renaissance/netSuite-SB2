const axios = require('axios')
const OAuth = require('oauth-1.0a')
const crypto = require('crypto')

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
    return postRestlet(payload, process.env.NETSUITE_RESTLET_URL)
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
