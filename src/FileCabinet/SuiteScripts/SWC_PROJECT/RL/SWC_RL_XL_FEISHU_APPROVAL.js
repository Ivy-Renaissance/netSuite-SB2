/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @description 飞书审批结果回写 NetSuite 单据
 */

define([
    'N/record',
    'N/search',
    'N/log'
], (record, search, log) => {

    /**
     * 飞书审批状态 → NS 自定义列表值
     *
     * 你的审批状态枚举：
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

    /**
     * 飞书同步状态
     *
     * 1 = 待同步
     * 2 = 成功
     * 3 = 失败
     */
    const FEISHU_SYNC_STATUS = {
        PENDING: 1,
        SUCCESS: 2,
        FAILED: 3
    }

    /**
     * 飞书状态映射
     */
    const mapFeishuStatusToNsStatus = (status) => {
        const statusMap = {
            PENDING: FEISHU_APPROVAL_STATUS.PENDING,
            APPROVED: FEISHU_APPROVAL_STATUS.APPROVED,
            REJECTED: FEISHU_APPROVAL_STATUS.REJECTED,
            CANCELED: FEISHU_APPROVAL_STATUS.CANCELED,
            CANCELLED: FEISHU_APPROVAL_STATUS.CANCELED,
            DELETED: FEISHU_APPROVAL_STATUS.WITHDRAWN,
            WITHDRAWN: FEISHU_APPROVAL_STATUS.WITHDRAWN
        }

        return statusMap[String(status || '').toUpperCase()]
    }

    /**
     * 根据飞书审批实例 ID 查找 NS 单据
     */
    // const findTransactionByInstanceCode = (instanceCode) => {
    //     let resultData = null
    //
    //     const transactionSearch = search.create({
    //         type: search.Type.TRANSACTION,
    //         filters: [
    //             ['mainline', 'is', 'T'],
    //             'AND',
    //             ['custbody_feishu_approval_id', 'is', instanceCode]
    //         ],
    //         columns: [
    //             search.createColumn({ name: 'internalid' }),
    //             search.createColumn({ name: 'recordtype' }),
    //             search.createColumn({ name: 'tranid' })
    //         ]
    //     })
    //
    //     transactionSearch.run().each((result) => {
    //         resultData = {
    //             id: result.getValue({ name: 'internalid' }),
    //             recordType: result.getValue({ name: 'recordtype' }),
    //             tranId: result.getValue({ name: 'tranid' })
    //         }
    //
    //         return false
    //     })
    //
    //     return resultData
    // }

    const findTransactionByInstanceCode = (instanceCode) => {
            let resultData = null

            const transactionSearch = search.create({
                // 供应商预付款
                type: 'vendorprepayment',
                filters: [
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['custbody_feishu_approval_id', 'is', instanceCode]
                ],
                columns: [
                    search.createColumn({
                        name: 'internalid'
                    }),
                    search.createColumn({
                        name: 'tranid'
                    })
                ]
            })

            transactionSearch.run().each((result) => {
                resultData = {
                    id: result.getValue({
                        name: 'internalid'
                    }),
                    recordType: 'vendorprepayment',
                    tranId: result.getValue({
                        name: 'tranid'
                    })
                }

                return false
            })

            return resultData
        }

    /**
     * POST 回写入口
     */
    const post = (context) => {
        log.debug('收到飞书审批回写请求', context)

        try {
            const instanceCode = context.instance_code || context.instanceCode
            const feishuStatus = context.status
            const approver = context.approver || ''
            const approveTime = context.approve_time || context.approveTime || ''
            const comment = context.comment || context.reason || ''

            if (!instanceCode) {
                throw new Error('缺少参数：instance_code')
            }

            if (!feishuStatus) {
                throw new Error('缺少参数：status')
            }

            const nsApprovalStatus = mapFeishuStatusToNsStatus(feishuStatus)

            if (!nsApprovalStatus) {
                throw new Error('无法识别的飞书审批状态：' + feishuStatus)
            }

            const transaction = findTransactionByInstanceCode(instanceCode)

            if (!transaction) {
                throw new Error('未找到对应 NS 单据，instance_code=' + instanceCode)
            }

            const values = {
                custbody_feishu_approval_status: nsApprovalStatus,
                custbody_feishu_sync_status: FEISHU_SYNC_STATUS.SUCCESS,
                custbody_feishu_approver: approver,
                custbody_feishu_reject_reason: comment
            }

            if (approveTime) {
                values.custbody_feishu_approve_time = new Date(approveTime)
            }

            record.submitFields({
                type: transaction.recordType,
                id: transaction.id,
                values,
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            })

            log.debug('飞书审批状态回写成功', {
                instanceCode,
                recordId: transaction.id,
                recordType: transaction.recordType,
                tranId: transaction.tranId,
                feishuStatus,
                nsApprovalStatus
            })

            return {
                code: 200,
                success: true,
                message: '回写成功',
                data: {
                    instance_code: instanceCode,
                    ns_record_id: transaction.id,
                    ns_record_type: transaction.recordType,
                    tranid: transaction.tranId,
                    feishu_status: feishuStatus,
                    ns_approval_status: nsApprovalStatus
                }
            }

        } catch (e) {
            log.error('飞书审批状态回写失败', e)

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