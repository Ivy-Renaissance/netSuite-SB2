/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @description
 * 飞书审批与 NetSuite「预付款申请订单」审批流 demo 的集中配置。
 *
 * 流程说明：
 * 1. User Event 读取这里的记录类型、字段 ID、飞书控件 ID，创建飞书审批实例。
 * 2. 飞书审批节点回调 RESTlet 时，RESTlet 通过 node_id 找到当前节点配置。
 * 3. RESTlet 根据 APPROVE / REJECT / RETURN 计算要回填的 NetSuite 审批状态内部 ID。
 * 4. RESTlet 写入 custrecord_swc_advancepay_state，触发 NetSuite 工作流继续流转。
 */
define([], () => {
    // 预付款申请订单自定义记录类型。
    const RECORD_TYPE = 'customrecord_swc_advancepay_plateform'

    // 预付款申请订单上本 demo 会读取或回写的字段。
    const FIELD = {
        tranId: 'name',
        state: 'custrecord_swc_advancepay_state',
        totalAmount: 'custrecord_swc_advancepay_total_amount',
        memo: 'custrecord_swc_advancepay_memo',
        subsidiary: 'custrecord_swc_advancepay_subsidary',
        vendor: 'custrecord_swc_advancepay_vendor',
        po: 'custrecord_swc_advancepay_po',
        payDate: 'custrecord_swc_advancepay_paydate',
        feishuInstanceCode: 'custrecord_swc_feishu_instance_code',
        feishuSyncStatus: 'custrecord_swc_feishu_sync_status',
        feishuLastEventId: 'custrecord_swc_feishu_last_event_id',
        feishuLastSource: 'custrecord_swc_feishu_last_source'
    }

    // 飞书同步状态字段的 demo 枚举值。若账号里的自定义列表不同，只需要改这里。
    const SYNC_STATUS = {
        pending: 1,
        success: 2,
        failed: 3
    }

    // 标记最后一次同步来源，若字段是列表/记录类型，这里必须配置列表项内部 ID；留空则不写入。
    const SOURCE = {
        netsuite: '',
        feishu: ''
    }

    // custrecord_swc_advancepay_state 审批状态列表的内部 ID。
    const STATUS = {
        approved: 1,
        pendingApproval: 2,
        rejected: 3,
        pendingSubmit: 4,
        voided: 6,
        returned: 7,
        paid: 8,
        partiallyPaid: 9,
        confirmed: 10,
        pendingCollectionApproval: 12,
        pendingOperationManager: 14,
        pendingCashierConfirm: 15,
        pendingFinanceManager: 16,
        pendingFinanceDirector: 17,
        submitted: 21,
        pendingDepartmentManager: 22,
        pendingViceGeneralManager: 23,
        pendingGeneralManager: 24,
        pendingGeneralLedger: 25
    }

    // 状态中文名仅用于日志、返回值和测试文档；脚本实际回填使用 STATUS 内部 ID。
    const STATUS_TEXT = {
        pendingSubmit: '待提交',
        pendingDepartmentManager: '待部门经理审批',
        pendingGeneralLedger: '待总账审批',
        pendingFinanceManager: '待财务经理审批',
        pendingFinanceDirector: '待财务总监审批',
        pendingViceGeneralManager: '待副总经理审批',
        pendingGeneralManager: '待总经理审批',
        approved: '已批准',
        rejected: '已拒绝',
        returned: '已打回待再次提交',
        paid: '已支付',
        voided: '已作废'
    }

    // 预付款申请进入这个状态时，UE 发起飞书审批实例。
    const START_APPROVAL_STATUS = STATUS.pendingDepartmentManager

    // 飞书审批表单控件 ID，来自你提供的审批模板控件清单。
    const FEISHU_WIDGET = {
        documentId: 'widget17803989748480001',
        subsidiary: 'widget17804882691220001',
        vendor: 'widget17805552284650001',
        po: 'widget17804880175290001',
        allQuantity: 'widget17804879167890001',
        paymentTerms: 'widget17804878894070001',
        totalAmount: 'widget17804879695390001',
        wholeOrderPrepay: 'widget17804880426800001',
        wholeOrderPercent: 'widget17804880862390001',
        vendorBankAccount: 'widget17804881206240001',
        expectedPayDate: 'widget17804882408040001'
    }

    // 飞书审批节点 ID，来自你提供的飞书审批模板 node_list。
    const FEISHU_NODE = {
        financeManager: '032e071b465474bcef5ff15ca609dfb8',
        viceGeneralManager: '4c2f65d34aee5a52e15c4d60611ee1af',
        generalLedger: 'defad027b415025e926f95ef09696028',
        financeDirector: '87612fcac5f7018bdd926df682ec9376',
        departmentManager: '0dd172cb1ba54ea9a4e66e1eb91d3a3d',
        generalManager: '6dd278174fe179d6c1e9d21a7f684866',
        end: 'b1a326c06d88bf042f73d70f50197905',
        submit: 'b078ffd28db767c502ac367053f6e0ac'
    }

    // 节点映射表：飞书 node_id -> NetSuite 工作流节点与状态回填规则。
    // approveStatus 是“通过”后要写入的下一个 NS 审批状态。
    // rejectStatus 是“拒绝”后要写入的 NS 状态。
    // returnStatus 是“打回”后要写入的 NS 状态。
    const NODE_BY_ID = {
        [FEISHU_NODE.departmentManager]: {
            code: 'DEPARTMENT_MANAGER',
            name: '部门经理',
            approveStatus: STATUS.pendingGeneralLedger,
            approveStatusText: STATUS_TEXT.pendingGeneralLedger,
            rejectStatus: STATUS.rejected,
            rejectStatusText: STATUS_TEXT.rejected,
            returnStatus: STATUS.returned,
            returnStatusText: STATUS_TEXT.returned
        },
        [FEISHU_NODE.generalLedger]: {
            code: 'GENERAL_LEDGER',
            name: '总账审批',
            approveStatus: STATUS.pendingFinanceManager,
            approveStatusText: STATUS_TEXT.pendingFinanceManager,
            rejectStatus: STATUS.rejected,
            rejectStatusText: STATUS_TEXT.rejected,
            returnStatus: STATUS.returned,
            returnStatusText: STATUS_TEXT.returned
        },
        [FEISHU_NODE.financeManager]: {
            code: 'FINANCE_MANAGER',
            name: '财务经理审批',
            approveStatus: STATUS.pendingFinanceDirector,
            approveStatusText: STATUS_TEXT.pendingFinanceDirector,
            rejectStatus: STATUS.rejected,
            rejectStatusText: STATUS_TEXT.rejected,
            returnStatus: STATUS.returned,
            returnStatusText: STATUS_TEXT.returned
        },
        [FEISHU_NODE.financeDirector]: {
            code: 'FINANCE_DIRECTOR',
            name: '财务总监审批',
            approveStatus: STATUS.pendingViceGeneralManager,
            approveStatusText: STATUS_TEXT.pendingViceGeneralManager,
            rejectStatus: STATUS.rejected,
            rejectStatusText: STATUS_TEXT.rejected,
            returnStatus: STATUS.returned,
            returnStatusText: STATUS_TEXT.returned
        },
        [FEISHU_NODE.viceGeneralManager]: {
            code: 'VICE_GENERAL_MANAGER',
            name: '副总经理审批',
            approveStatus: STATUS.pendingGeneralManager,
            approveStatusText: STATUS_TEXT.pendingGeneralManager,
            rejectStatus: STATUS.rejected,
            rejectStatusText: STATUS_TEXT.rejected,
            returnStatus: STATUS.returned,
            returnStatusText: STATUS_TEXT.returned
        },
        [FEISHU_NODE.generalManager]: {
            code: 'GENERAL_MANAGER',
            name: '总经理审批',
            approveStatus: STATUS.approved,
            approveStatusText: STATUS_TEXT.approved,
            rejectStatus: STATUS.rejected,
            rejectStatusText: STATUS_TEXT.rejected,
            returnStatus: STATUS.returned,
            returnStatusText: STATUS_TEXT.returned
        }
    }

    // NS 待审批状态与飞书节点的对应关系。
    const STATUS_NODE = {
        [STATUS.pendingDepartmentManager]: FEISHU_NODE.departmentManager,
        [STATUS.pendingGeneralLedger]: FEISHU_NODE.generalLedger,
        [STATUS.pendingFinanceManager]: FEISHU_NODE.financeManager,
        [STATUS.pendingFinanceDirector]: FEISHU_NODE.financeDirector,
        [STATUS.pendingViceGeneralManager]: FEISHU_NODE.viceGeneralManager,
        [STATUS.pendingGeneralManager]: FEISHU_NODE.generalManager
    }

    // 审批节点顺序用于判断 NS 状态变更后，飞书应该前进还是回退。
    const APPROVAL_STATUS_SEQUENCE = [
        STATUS.pendingDepartmentManager,
        STATUS.pendingGeneralLedger,
        STATUS.pendingFinanceManager,
        STATUS.pendingFinanceDirector,
        STATUS.pendingViceGeneralManager,
        STATUS.pendingGeneralManager
    ]

    const APPROVAL_NODE_SEQUENCE = APPROVAL_STATUS_SEQUENCE.map((status) => STATUS_NODE[status])

    // RESTlet 支持的飞书动作。飞书回调字段可能不同，RESTlet 会统一归一化成这三个值。
    const ACTION = {
        approve: 'APPROVE',
        reject: 'REJECT',
        return: 'RETURN'
    }

    // 根据飞书 node_id 获取节点配置。
    const getNode = (nodeId) => NODE_BY_ID[nodeId] || null

    // 根据飞书节点与动作计算 NetSuite 审批状态内部 ID。
    const getTargetStatus = (nodeId, action) => {
        const normalizedAction = String(action || '').toUpperCase()

        const node = getNode(nodeId)

        if (!node) {
            return null
        }

        if (normalizedAction === ACTION.reject) {
            return node.rejectStatus
        }

        if (normalizedAction === ACTION.return) {
            return node.returnStatus
        }

        return node.approveStatus
    }

    // 根据飞书节点与动作获取目标状态中文名，仅用于日志和接口返回。
    const getTargetStatusText = (nodeId, action) => {
        const normalizedAction = String(action || '').toUpperCase()

        const node = getNode(nodeId)

        if (!node) {
            return null
        }

        if (normalizedAction === ACTION.reject) {
            return node.rejectStatusText
        }

        if (normalizedAction === ACTION.return) {
            return node.returnStatusText
        }

        return node.approveStatusText
    }

    const getNodeIdByStatus = (status) => STATUS_NODE[Number(status)] || null

    const getNodeSequenceIndex = (nodeId) => APPROVAL_NODE_SEQUENCE.indexOf(nodeId)

    return {
        RECORD_TYPE,
        FIELD,
        SYNC_STATUS,
        SOURCE,
        STATUS,
        STATUS_TEXT,
        START_APPROVAL_STATUS,
        FEISHU_WIDGET,
        FEISHU_NODE,
        NODE_BY_ID,
        STATUS_NODE,
        APPROVAL_STATUS_SEQUENCE,
        APPROVAL_NODE_SEQUENCE,
        ACTION,
        getNode,
        getTargetStatus,
        getTargetStatusText,
        getNodeIdByStatus,
        getNodeSequenceIndex
    }
})
