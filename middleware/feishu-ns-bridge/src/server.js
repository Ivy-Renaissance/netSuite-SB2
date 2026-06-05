require('dotenv').config()

const express = require('express')
const { createApprovalInstance, getApprovalInstance } = require('./feishuClient')
const { postApprovalCallback, postInstanceSync, postRestlet } = require('./netsuiteClient')
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
    res.json({ ok: true })
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

        const preliminaryPayload = normalizeFeishuEvent(body)
        let instanceDetail = null

        if (preliminaryPayload.instance_code && (!preliminaryPayload.record_id || !preliminaryPayload.node_id)) {
            instanceDetail = await getApprovalInstance(preliminaryPayload.instance_code)
        }

        const nsPayload = normalizeFeishuEvent(body, instanceDetail)

        if (!nsPayload.action) {
            console.log('Feishu event ignored:', safeStringify(nsPayload))

            return res.json({
                code: 0,
                msg: 'ignored',
                message: '未识别到审批通过/拒绝/打回动作，事件已忽略',
                data: nsPayload
            })
        }

        console.log('Feishu event normalized:', JSON.stringify(nsPayload, null, 2))

        const nsResult = await postApprovalCallback(nsPayload)

        console.log('NetSuite RESTlet result:', JSON.stringify(nsResult, null, 2))

        return res.json({
            code: 0,
            msg: 'success',
            data: nsResult
        })
    } catch (e) {
        console.error('callback error:', e)

        return res.status(500).json({
            code: 500,
            msg: e.message
        })
    }
}

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

const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '127.0.0.1'

app.listen(port, host, (error) => {
    if (error) {
        console.error(`Failed to start Feishu-NetSuite bridge at http://${host}:${port}:`, error)
        process.exitCode = 1
        return
    }

    console.log(`Feishu-NetSuite bridge running at http://${host}:${port}`)
})
