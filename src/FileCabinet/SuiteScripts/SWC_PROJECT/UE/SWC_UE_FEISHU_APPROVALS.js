/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define([
    'N/https',
    'N/record',
    'N/log',
    'N/runtime',
    'N/search'
], (https, record, log, runtime, search) => {
    const PREPAY_RECORD_TYPE = 'customrecord_swc_advancepay_plateform'

    /**
     * 飞书同步状态
     * 1 = 待同步
     * 2 = 同步成功
     * 3 = 同步失败
     */
    const FEISHU_SYNC_STATUS = {
        PENDING: 1,
        SUCCESS: 2,
        FAILED: 3
    }

    /**
     * 飞书审批状态
     * 1 = 审批中
     * 2 = 已通过
     * 3 = 已拒绝
     * 4 = 已撤回
     * 5 = 已取消
     */
    const FEISHU_APPROVAL_STATUS = {
        PENDING: 1,
        APPROVED: 2,
        REJECTED: 3,
        WITHDRAWN: 4,
        CANCELED: 5
    }

    const afterSubmit = (context) => {

        if (context.type !== context.UserEventType.CREATE) {
            return
        }

        const newRecord = context.newRecord
        const recordId = newRecord.id

        if (newRecord.type === PREPAY_RECORD_TYPE) {
            log.audit('跳过旧飞书审批脚本', {
                recordType: newRecord.type,
                recordId,
                message: '预付款申请订单请使用 SWC_UE_FEISHU_PREPAY_APPROVAL_DEMO.js'
            })
            return
        }

        try {
            const script = runtime.getCurrentScript()

            const APP_ID = script.getParameter({
                name: 'custscript_feishu_app_id'
            })

            const APP_SECRET = script.getParameter({
                name: 'custscript_feishu_app_secret'
            })

            const APPROVAL_CODE = script.getParameter({
                name: 'custscript_feishu_approval_code'
            })

            log.debug('参数实际值', {
                APP_ID,
                APP_SECRET,
                APPROVAL_CODE
            })

            // 先标记为待同步
            record.submitFields({
                type: newRecord.type,
                id: recordId,
                values: {
                    custbody_feishu_sync_status: FEISHU_SYNC_STATUS.PENDING
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            })

            // 单据ID
            const tranId = newRecord.getValue({
                fieldId: 'tranid'
            })

            // 单据预付款总金额
            const totalAmount = newRecord.getValue({
                fieldId: 'custrecord_swc_advancepay_total_amount'
            })

            /**
             * 根据当前 NS 用户，查找员工记录上的飞书 UserID
             */
            const currentUser = runtime.getCurrentUser()

            let feishuUserId = ''

            const employeeSearch = search.create({
                type: search.Type.EMPLOYEE,
                filters: [
                    ['internalid', 'anyof', currentUser.id]
                ],
                columns: [
                    search.createColumn({
                        name: 'internalid'
                    }),
                    search.createColumn({
                        name: 'entityid'
                    }),
                    search.createColumn({
                        name: 'email'
                    }),
                    search.createColumn({
                        name: 'custentity_feishu_user_id'
                    })
                ]
            })

            employeeSearch.run().each((result) => {
                feishuUserId = result.getValue({
                    name: 'custentity_feishu_user_id'
                })

                log.debug('匹配到员工飞书UserID', {
                    nsUserId: currentUser.id,
                    nsUserName: currentUser.name,
                    nsUserEmail: currentUser.email,
                    employeeInternalId: result.getValue({
                        name: 'internalid'
                    }),
                    employeeId: result.getValue({
                        name: 'entityid'
                    }),
                    employeeEmail: result.getValue({
                        name: 'email'
                    }),
                    feishuUserId
                })

                return false
            })

            if (!feishuUserId) {
                throw new Error('未找到当前NS用户对应的飞书UserID，请检查员工记录 custentity_feishu_user_id')
            }

            log.debug('开始同步飞书审批', {
                recordId,
                tranId,
                hasAppId: !!APP_ID,
                hasAppSecret: !!APP_SECRET,
                hasApprovalCode: !!APPROVAL_CODE
            })

            const tokenRes = https.post({
                url: 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    app_id: APP_ID,
                    app_secret: APP_SECRET
                })
            })

            const tokenBody = JSON.parse(tokenRes.body)

            log.debug('token结果', tokenBody)

            if (tokenBody.code !== 0) {
                throw new Error('获取token失败：' + tokenRes.body)
            }

            const token = tokenBody.tenant_access_token

            const approvalRes = https.post({
                url: 'https://open.feishu.cn/open-apis/approval/v4/instances?user_id_type=user_id',
                headers: {
                    Authorization: 'Bearer ' + token,
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify({
                    approval_code: APPROVAL_CODE,

                    // 发起人，必须是飞书 user_id
                    user_id: feishuUserId,

                    form: JSON.stringify([
                        {
                            // 申请人 contact 控件
                            id: 'widget17799352112200001',
                            type: 'contact',
                            value: [feishuUserId]
                        },
                        {
                            // 单据ID
                            id: 'widget17799337158960001',
                            type: 'input',
                            value: String(tranId || recordId)
                        },
                        {
                            // 数字
                            id: 'widget17799345058410001',
                            type: 'number',
                            value: '100'
                        },
                        {
                            // 金额
                            id: 'widget17799345090550001',
                            type: 'amount',
                            value: String(totalAmount || 0)
                        }
                    ])
                })
            })

            const approvalBody = JSON.parse(approvalRes.body)

            log.debug('审批创建结果', approvalBody)

            if (approvalBody.code !== 0) {
                throw new Error('创建审批失败：' + approvalRes.body)
            }

            const approvalId = approvalBody.data.instance_code

            // 创建成功后，回写飞书审批信息
            record.submitFields({
                type: newRecord.type,
                id: recordId,
                values: {
                    custbody_feishu_approval_id: approvalId,
                    custbody_feishu_sync_status: FEISHU_SYNC_STATUS.SUCCESS,
                    custbody_feishu_approval_status: FEISHU_APPROVAL_STATUS.PENDING
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            })

            log.debug('飞书审批同步成功', {
                recordId,
                approvalId
            })

        } catch (e) {
            log.error('飞书同步失败', e)

            try {
                record.submitFields({
                    type: newRecord.type,
                    id: recordId,
                    values: {
                        custbody_feishu_sync_status: FEISHU_SYNC_STATUS.FAILED
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                })
            } catch (err) {
                log.error('更新失败状态异常', err)
            }
        }
    }

    return {
        afterSubmit
    }
})
