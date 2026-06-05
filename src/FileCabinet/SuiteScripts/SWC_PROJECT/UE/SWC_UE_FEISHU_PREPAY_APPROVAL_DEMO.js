/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @description
 * Demo: NetSuite 预付款申请订单进入审批流后，自动创建飞书审批实例，并同步 NS 侧状态变更到飞书审批流。
 *
 * 触发流程：
 * 1. 用户在 NetSuite 预付款申请订单上点击“提交”。
 * 2. NetSuite 工作流把 custrecord_swc_advancepay_state 改成“待部门经理审批”(内部 ID 22)。
 * 3. 本 User Event 在 afterSubmit 中识别状态变化。
 * 4. 脚本调用飞书审批 API 创建审批实例。
 * 5. 创建成功后，把飞书 instance_code 回写到 NetSuite 记录上。
 * 6. 已有飞书实例的单据在 NS 中修改审批状态时，脚本按节点顺序调用飞书任务同意或退回接口。
 */
define([
    'N/https',
    'N/record',
    'N/runtime',
    'N/search',
    'N/log',
    '../common/SWC_Feishu_Approval_Demo_Config'
], (https, record, runtime, search, log, config) => {
    const PARAM = {
        appId: 'custscript_fs_demo_app_id',
        appSecret: 'custscript_fs_demo_app_secret',
        approvalCode: 'custscript_fs_demo_approval_code',
        departmentId: 'custscript_fs_demo_department_id'
    }
    const EMPLOYEE_FIELD = {
        feishuUserId: 'custentity_feishu_user_id',
        feishuOpenDepartmentId: 'custentity_feishu_open_department_id'
    }
    const FEISHU_APPROVAL_CODE = '306C03CB-85B1-4E66-888C-093ED122FD97'
    const EMPTY_FORM_VALUE = '--'
    const PREPAY_FORM_FIELD = {
        tranId: 'name',
        subsidiary: 'custrecord_swc_advancepay_subsidary',
        vendor: 'custrecord_swc_advancepay_vendor',
        po: 'custrecord_swc_advancepay_po',
        allQuantity: 'custrecord_swc_advancepay_allquantity',
        paymentTerms: 'custrecord_swc_vendor_items',
        totalAmount: 'custrecord_swc_advancepay_total_amount',
        currency: 'custrecord_swc_advancepay_currency',
        wholeOrderPrepay: 'custrecord_swc_advancepay_whole_yes',
        wholeOrderPercent: 'custrecord_swc_advancepay_sum_percent1',
        vendorBankAccount: 'custrecord_vendor_bankaccounts2',
        expectedPayDate: 'custrecord_swc_advancepay_paydate2'
    }
    const PREPAY_FORM_WIDGET = {
        tranId: 'widget17803989748480001',
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
    const PREPAY_WHOLE_ORDER_OPTION = {
        yes: 'mpy0ly9k-e01d8onmt9-0',
        no: 'mpy0ly9k-0n2qgzlu04ac-0'
    }

    // 读取脚本部署参数，避免把飞书密钥和审批 code 写死在代码里。
    const getParameter = (name) => runtime.getCurrentScript().getParameter({ name })

    /**
     * 获取飞书 tenant_access_token。
     *
     * 所有飞书审批 API 都需要 Bearer token；demo 每次触发时实时获取。
     * 生产版本可改成缓存 token，减少接口调用次数。
     */
    const getTenantToken = (appId, appSecret) => {
        const response = https.post({
            url: 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                app_id: appId,
                app_secret: appSecret
            })
        })

        const body = JSON.parse(response.body || '{}')

        if (body.code !== 0) {
            throw new Error('获取飞书 tenant_access_token 失败：' + response.body)
        }

        return body.tenant_access_token
    }

    const parseFeishuResponse = (response, errorMessage) => {
        const body = JSON.parse(response.body || '{}')

        if (body.code !== 0) {
            throw new Error(errorMessage + '：' + response.body)
        }

        return body
    }

    const postFeishu = (url, token, payload, errorMessage) => {
        const response = https.post({
            url,
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(payload || {})
        })

        return parseFeishuResponse(response, errorMessage)
    }

    const getFeishuApprovalInstance = (instanceCode, token) => {
        const response = https.get({
            url: 'https://open.feishu.cn/open-apis/approval/v4/instances/' + encodeURIComponent(instanceCode) + '?user_id_type=user_id',
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json; charset=utf-8'
            }
        })
        const body = parseFeishuResponse(response, '获取飞书审批实例详情失败')

        return body.data || {}
    }

    /**
     * 根据当前 NetSuite 员工内部 ID 查找飞书 user_id 和 open_department_id。
     *
     * 约定员工记录上维护：
     * - custentity_feishu_user_id：飞书 user_id。
     * - custentity_feishu_open_department_id：飞书部门 open_department_id，通常以 od- 开头。
     * 飞书创建审批实例时，user_id 必须是飞书用户 ID。
     */
    const findFeishuEmployeeInfo = (employeeId) => {
        const employeeInfo = {
            feishuUserId: '',
            openDepartmentId: ''
        }

        search.create({
            type: search.Type.EMPLOYEE,
            filters: [
                ['internalid', 'anyof', employeeId]
            ],
            columns: [
                search.createColumn({ name: EMPLOYEE_FIELD.feishuUserId }),
                search.createColumn({ name: EMPLOYEE_FIELD.feishuOpenDepartmentId })
            ]
        }).run().each((result) => {
            employeeInfo.feishuUserId = result.getValue({ name: EMPLOYEE_FIELD.feishuUserId }) || ''
            employeeInfo.openDepartmentId = result.getValue({ name: EMPLOYEE_FIELD.feishuOpenDepartmentId }) || ''
            return false
        })

        return employeeInfo
    }

    // 将 NetSuite 日期转换成飞书 date 控件要求的 ISO 日期时间。
    const formatDate = (value) => {
        if (!value) {
            return ''
        }

        const date = value instanceof Date ? value : new Date(value)

        if (isNaN(date.getTime())) {
            return ''
        }

        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')

        return `${date.getFullYear()}-${month}-${day}T00:00:00+08:00`
    }

    const isEmptyFormValue = (value) => {
        return value === null
            || value === undefined
            || value === ''
            || (Array.isArray(value) && !value.length)
    }

    const normalizeFormValue = (value) => {
        if (isEmptyFormValue(value)) {
            return EMPTY_FORM_VALUE
        }

        if (Array.isArray(value)) {
            const text = value
                .map((item) => String(item || '').trim())
                .filter((item) => item)
                .join(', ')

            return text || EMPTY_FORM_VALUE
        }

        return String(value)
    }

    const getFieldText = (prepayRecord, fieldId) => {
        try {
            return prepayRecord.getText({ fieldId })
        } catch (e) {
            return ''
        }
    }

    const getFieldFormValue = (prepayRecord, fieldId) => {
        const text = getFieldText(prepayRecord, fieldId)

        if (!isEmptyFormValue(text)) {
            return normalizeFormValue(text)
        }

        return normalizeFormValue(prepayRecord.getValue({ fieldId }))
    }

    const getNumberFormValue = (prepayRecord, fieldId) => {
        const value = prepayRecord.getValue({ fieldId })

        if (isEmptyFormValue(value)) {
            return 0
        }

        const numberValue = Number(value)

        return isNaN(numberValue) ? 0 : numberValue
    }

    const getDateFormValue = (prepayRecord, fieldId) => {
        const dateValue = formatDate(prepayRecord.getValue({ fieldId }))

        return dateValue || formatDate(new Date())
    }

    const extractCurrencyCode = (value) => {
        const text = String(value || '').trim().toUpperCase()

        if (/^[A-Z]{3}$/.test(text)) {
            return text
        }

        const matchedValue = text.match(/(?:^|[^A-Z])([A-Z]{3})(?=$|[^A-Z])/)

        return matchedValue ? matchedValue[1] : ''
    }

    const lookupCurrencyCode = (currencyId) => {
        if (isEmptyFormValue(currencyId)) {
            return ''
        }

        try {
            const currencyFields = search.lookupFields({
                type: search.Type.CURRENCY || 'currency',
                id: currencyId,
                columns: ['symbol']
            })

            return extractCurrencyCode(currencyFields.symbol)
        } catch (e) {
            log.audit('查询预付款申请货币代码失败', {
                currencyId,
                message: e.message
            })
            return ''
        }
    }

    const getCurrencyFormValue = (prepayRecord) => {
        const textCurrency = extractCurrencyCode(getFieldText(prepayRecord, PREPAY_FORM_FIELD.currency))

        if (textCurrency) {
            return textCurrency
        }

        const value = prepayRecord.getValue({ fieldId: PREPAY_FORM_FIELD.currency })
        const valueCurrency = extractCurrencyCode(value)

        return valueCurrency || lookupCurrencyCode(value)
    }

    const getRadioOptionValue = (value, optionByText) => {
        const normalizedValue = normalizeFormValue(value)

        if (normalizedValue === EMPTY_FORM_VALUE) {
            return normalizedValue
        }

        if (optionByText[normalizedValue]) {
            return optionByText[normalizedValue]
        }

        return normalizedValue
    }

    const getWholeOrderPrepayValue = (prepayRecord) => {
        const value = prepayRecord.getValue({ fieldId: PREPAY_FORM_FIELD.wholeOrderPrepay })

        if (isEmptyFormValue(value)) {
            return PREPAY_WHOLE_ORDER_OPTION.no
        }

        if (value === true || value === 'T' || value === 'true' || value === '是') {
            return PREPAY_WHOLE_ORDER_OPTION.yes
        }

        if (value === false || value === 'F' || value === 'false' || value === '否') {
            return PREPAY_WHOLE_ORDER_OPTION.no
        }

        return getRadioOptionValue(getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.wholeOrderPrepay), {
            是: PREPAY_WHOLE_ORDER_OPTION.yes,
            否: PREPAY_WHOLE_ORDER_OPTION.no
        }) || PREPAY_WHOLE_ORDER_OPTION.no
    }

    const buildAmountFormItem = (prepayRecord) => {
        const item = {
            id: PREPAY_FORM_WIDGET.totalAmount,
            type: 'amount',
            value: getNumberFormValue(prepayRecord, PREPAY_FORM_FIELD.totalAmount)
        }
        const currency = getCurrencyFormValue(prepayRecord)

        if (currency) {
            item.currency = currency
        }

        return item
    }

    const buildDepartmentFormValue = (departmentId) => {
        const rawValue = String(departmentId || '').trim()

        if (!rawValue) {
            return null
        }

        if (rawValue.indexOf('oc_') === 0) {
            log.audit('跳过飞书申请部门控件', {
                departmentId: rawValue,
                message: 'oc_* 是群聊 chat_id，不是飞书部门 ID'
            })
            return null
        }

        if (rawValue.charAt(0) === '[') {
            try {
                const parsedValue = JSON.parse(rawValue)

                if (Array.isArray(parsedValue)) {
                    const values = parsedValue.map((value) => {
                        if (value && typeof value === 'object' && value.open_id) {
                            return { open_id: String(value.open_id) }
                        }

                        return { open_id: String(value) }
                    }).filter((value) => value.open_id && value.open_id.indexOf('oc_') !== 0)

                    return values.length ? values : null
                }
            } catch (e) {
                log.audit('解析飞书部门 ID 数组失败，按逗号分隔文本处理', {
                    departmentId: rawValue,
                    message: e.message
                })
            }
        }

        const values = rawValue
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value && value.indexOf('oc_') !== 0)
            .map((value) => ({ open_id: value }))

        return values.length ? values : null
    }

    /**
     * 构造飞书审批表单数据。
     *
     * 字段来源为预付款申请单据字段；缺少内容时，飞书控件统一填充“--”。
     */
    const buildForm = (prepayRecord) => {
        return [
            {
                id: PREPAY_FORM_WIDGET.tranId,
                type: 'input',
                value: getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.tranId)
            },
            {
                id: PREPAY_FORM_WIDGET.subsidiary,
                type: 'input',
                value: getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.subsidiary)
            },
            {
                id: PREPAY_FORM_WIDGET.vendor,
                type: 'input',
                value: getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.vendor)
            },
            {
                id: PREPAY_FORM_WIDGET.po,
                type: 'input',
                value: getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.po)
            },
            {
                id: PREPAY_FORM_WIDGET.allQuantity,
                type: 'number',
                value: getNumberFormValue(prepayRecord, PREPAY_FORM_FIELD.allQuantity)
            },
            {
                id: PREPAY_FORM_WIDGET.paymentTerms,
                type: 'input',
                value: getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.paymentTerms)
            },
            buildAmountFormItem(prepayRecord),
            {
                id: PREPAY_FORM_WIDGET.wholeOrderPrepay,
                type: 'radioV2',
                value: getWholeOrderPrepayValue(prepayRecord)
            },
            {
                id: PREPAY_FORM_WIDGET.wholeOrderPercent,
                type: 'input',
                value: getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.wholeOrderPercent)
            },
            {
                id: PREPAY_FORM_WIDGET.vendorBankAccount,
                type: 'input',
                value: getFieldFormValue(prepayRecord, PREPAY_FORM_FIELD.vendorBankAccount)
            },
            {
                id: PREPAY_FORM_WIDGET.expectedPayDate,
                type: 'date',
                value: getDateFormValue(prepayRecord, PREPAY_FORM_FIELD.expectedPayDate)
            }
        ]
    }

    const getTaskId = (task) => task && (task.id || task.task_id || task.taskId)

    const getTaskNodeId = (task) => task && (task.node_id || task.nodeId || task.node_key || task.nodeKey)

    const getTaskUserId = (task) => {
        if (!task) {
            return ''
        }

        if (Array.isArray(task.user_id_list) && task.user_id_list.length) {
            return task.user_id_list[0]
        }

        if (Array.isArray(task.userIdList) && task.userIdList.length) {
            return task.userIdList[0]
        }

        return task.user_id || task.userId || task.open_id || task.openId || ''
    }

    const isPendingTask = (task) => String(task && (task.status || task.task_status || task.taskStatus) || '').toUpperCase() === 'PENDING'

    const getPendingTasks = (instanceData) => {
        const taskList = instanceData.task_list || instanceData.taskList || []

        if (!Array.isArray(taskList)) {
            return []
        }

        return taskList.filter(isPendingTask)
    }

    const isPendingAtNode = (instanceData, nodeId) => getPendingTasks(instanceData).some((task) => getTaskNodeId(task) === nodeId)

    const getCurrentPendingNodeId = (instanceData) => {
        const pendingTask = getPendingTasks(instanceData)[0]

        return pendingTask ? getTaskNodeId(pendingTask) : ''
    }

    const buildTaskById = (instanceData) => {
        const taskList = instanceData.task_list || instanceData.taskList || []
        const taskById = {}

        if (!Array.isArray(taskList)) {
            return taskById
        }

        taskList.forEach((task) => {
            const taskId = getTaskId(task)

            if (taskId) {
                taskById[String(taskId)] = task
            }
        })

        return taskById
    }

    const findRollbackNodeKey = (instanceData, targetNodeId) => {
        const timeline = instanceData.timeline || []
        const taskById = buildTaskById(instanceData)

        if (!Array.isArray(timeline)) {
            return targetNodeId
        }

        for (let i = timeline.length - 1; i >= 0; i -= 1) {
            const item = timeline[i]
            const itemStatus = String(item.status || item.type || item.action || '').toUpperCase()
            const itemTask = taskById[String(item.task_id || item.taskId || '')]
            const itemNodeId = getTaskNodeId(itemTask) || item.node_id || item.nodeId || item.node_key || item.nodeKey

            if (itemNodeId === targetNodeId && (itemStatus === 'PASS' || itemStatus === 'APPROVED' || itemStatus === 'AUTO_PASS')) {
                return item.node_key || item.nodeKey || targetNodeId
            }
        }

        return targetNodeId
    }

    const markFeishuSyncStatus = (recordId, syncStatus) => {
        const values = {
            [config.FIELD.feishuSyncStatus]: syncStatus
        }

        if (syncStatus === config.SYNC_STATUS.success && config.SOURCE.netsuite) {
            values[config.FIELD.feishuLastSource] = config.SOURCE.netsuite
        }

        record.submitFields({
            type: config.RECORD_TYPE,
            id: recordId,
            values,
            options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
            }
        })
    }

    const approveFeishuTask = (token, approvalCode, instanceCode, instanceData, task) => {
        const taskId = getTaskId(task)
        const userId = getTaskUserId(task)

        if (!taskId || !userId) {
            throw new Error('飞书待办任务缺少 task_id 或 user_id，无法自动同意')
        }

        const payload = {
            approval_code: approvalCode,
            instance_code: instanceCode,
            user_id: userId,
            task_id: taskId,
            comment: 'NetSuite审批状态调整，自动流转到目标节点'
        }

        if (instanceData.form) {
            payload.form = instanceData.form
        }

        return postFeishu(
            'https://open.feishu.cn/open-apis/approval/v4/tasks/approve?user_id_type=user_id',
            token,
            payload,
            '同意飞书审批任务失败'
        )
    }

    const rollbackFeishuTask = (token, instanceData, targetNodeId) => {
        const pendingTasks = getPendingTasks(instanceData)
        const task = pendingTasks[0]
        const taskId = getTaskId(task)
        const userId = getTaskUserId(task)

        if (!taskId || !userId) {
            throw new Error('飞书待办任务缺少 task_id 或 user_id，无法退回')
        }

        return postFeishu(
            'https://open.feishu.cn/open-apis/approval/v4/instances/specified_rollback?user_id_type=user_id',
            token,
            {
                user_id: userId,
                task_id: taskId,
                reason: 'NetSuite审批状态调整，退回到目标节点重新审批',
                task_def_key_list: [
                    findRollbackNodeKey(instanceData, targetNodeId)
                ]
            },
            '退回飞书审批任务失败'
        )
    }

    const advanceFeishuToNode = (token, approvalCode, instanceCode, targetNodeId, initialInstanceData) => {
        let instanceData = initialInstanceData || getFeishuApprovalInstance(instanceCode, token)
        const targetIndex = config.getNodeSequenceIndex(targetNodeId)

        if (targetIndex === -1) {
            throw new Error('无法判断飞书目标节点顺序，targetNodeId=' + targetNodeId)
        }

        for (let i = 0; i < 10; i += 1) {
            if (isPendingAtNode(instanceData, targetNodeId)) {
                return instanceData
            }

            const pendingTasks = getPendingTasks(instanceData)

            if (!pendingTasks.length) {
                throw new Error('飞书审批实例没有待办任务，无法前进到目标节点')
            }

            const currentNodeId = getTaskNodeId(pendingTasks[0])
            const currentIndex = config.getNodeSequenceIndex(currentNodeId)

            if (currentIndex === -1) {
                throw new Error('无法判断飞书当前节点顺序，currentNodeId=' + currentNodeId)
            }

            if (currentIndex >= targetIndex) {
                throw new Error('飞书审批流已到达或越过目标节点，停止自动同意，currentNodeId=' + currentNodeId + ', targetNodeId=' + targetNodeId)
            }

            const tasksToApprove = pendingTasks.filter((task) => getTaskNodeId(task) === currentNodeId)

            tasksToApprove.forEach((task) => {
                approveFeishuTask(token, approvalCode, instanceCode, instanceData, task)
            })

            instanceData = getFeishuApprovalInstance(instanceCode, token)
        }

        throw new Error('飞书审批流自动前进超过最大次数，已停止')
    }

    const syncFeishuApprovalNode = (recordId, instanceCode, targetStatus) => {
        const appId = getParameter(PARAM.appId)
        const appSecret = getParameter(PARAM.appSecret)
        const approvalCode = getParameter(PARAM.approvalCode)
        const targetNodeId = config.getNodeIdByStatus(targetStatus)

        if (!appId || !appSecret || !approvalCode) {
            throw new Error('缺少飞书脚本参数：App ID / App Secret / Approval Code')
        }

        if (!targetNodeId) {
            throw new Error('NS审批状态没有配置对应飞书节点：' + targetStatus)
        }

        markFeishuSyncStatus(recordId, config.SYNC_STATUS.pending)

        const token = getTenantToken(appId, appSecret)
        const instanceData = getFeishuApprovalInstance(instanceCode, token)
        const currentNodeId = getCurrentPendingNodeId(instanceData)

        if (!currentNodeId || currentNodeId === targetNodeId) {
            markFeishuSyncStatus(recordId, config.SYNC_STATUS.success)
            return {
                action: 'NO_CHANGE',
                currentNodeId,
                targetNodeId
            }
        }

        const currentIndex = config.getNodeSequenceIndex(currentNodeId)
        const targetIndex = config.getNodeSequenceIndex(targetNodeId)

        if (currentIndex === -1 || targetIndex === -1) {
            throw new Error('无法判断飞书节点顺序，currentNodeId=' + currentNodeId + ', targetNodeId=' + targetNodeId)
        }

        if (currentIndex < targetIndex) {
            advanceFeishuToNode(token, approvalCode, instanceCode, targetNodeId, instanceData)
            markFeishuSyncStatus(recordId, config.SYNC_STATUS.success)
            return {
                action: 'ADVANCE',
                currentNodeId,
                targetNodeId
            }
        }

        rollbackFeishuTask(token, instanceData, targetNodeId)
        markFeishuSyncStatus(recordId, config.SYNC_STATUS.success)

        return {
            action: 'ROLLBACK',
            currentNodeId,
            targetNodeId
        }
    }

    /**
     * 判断本次保存是否需要创建飞书审批实例。
     *
     * 只在状态进入“待部门经理审批”(内部 ID 22)时触发。
     * 普通提交流程要求记录上没有飞书 instance_code；被飞书退回后再次提交时，
     * 即使历史数据残留旧 instance_code，也创建新的飞书审批实例并覆盖旧实例号。
     */
    const shouldCreateFeishuApproval = (context) => {
        if (![context.UserEventType.CREATE, context.UserEventType.EDIT].includes(context.type)) {
            return false
        }

        const newRecord = context.newRecord
        const oldRecord = context.oldRecord
        const stateField = config.FIELD.state
        const currentState = Number(newRecord.getValue({ fieldId: stateField }))
        const oldState = oldRecord ? Number(oldRecord.getValue({ fieldId: stateField })) : null
        const existingInstanceCode = newRecord.getValue({ fieldId: config.FIELD.feishuInstanceCode })
        const isResubmitAfterReturn = oldState === config.STATUS.returned
            && currentState === config.START_APPROVAL_STATUS

        return currentState === config.START_APPROVAL_STATUS
            && oldState !== config.START_APPROVAL_STATUS
            && (!existingInstanceCode || isResubmitAfterReturn)
    }

    const isFromFeishuRestlet = () => {
        return runtime.ContextType
            && runtime.ContextType.RESTLET
            && runtime.executionContext === runtime.ContextType.RESTLET
    }

    /**
     * 判断本次保存是否需要把 NS 审批状态同步到已有飞书实例。
     */
    const shouldSyncFeishuApprovalNode = (context) => {
        if (![context.UserEventType.EDIT].includes(context.type)) {
            return false
        }

        if (isFromFeishuRestlet()) {
            return false
        }

        const newRecord = context.newRecord
        const oldRecord = context.oldRecord
        const stateField = config.FIELD.state
        const currentState = Number(newRecord.getValue({ fieldId: stateField }))
        const oldState = oldRecord ? Number(oldRecord.getValue({ fieldId: stateField })) : null
        const existingInstanceCode = newRecord.getValue({ fieldId: config.FIELD.feishuInstanceCode })

        if (oldState === config.STATUS.returned && currentState === config.START_APPROVAL_STATUS) {
            return false
        }

        return !!existingInstanceCode
            && currentState !== oldState
            && !!config.getNodeIdByStatus(currentState)
    }

    /**
     * User Event afterSubmit 入口。
     *
     * 成功时：
     * - 创建飞书审批实例；
     * - 回写飞书 instance_code；
     * - 标记同步成功。
     *
     * 失败时：
     * - 标记同步失败；
     * - 保留 NS 原审批状态，方便人工重试。
     */
    const afterSubmit = (context) => {
        if (!shouldCreateFeishuApproval(context) && !shouldSyncFeishuApprovalNode(context)) {
            return
        }

        const prepayRecord = context.newRecord
        const recordId = prepayRecord.id

        if (shouldSyncFeishuApprovalNode(context)) {
            try {
                const result = syncFeishuApprovalNode(
                    recordId,
                    prepayRecord.getValue({ fieldId: config.FIELD.feishuInstanceCode }),
                    prepayRecord.getValue({ fieldId: config.FIELD.state })
                )

                log.audit('预付款申请飞书审批节点同步成功', {
                    recordId,
                    instanceCode: prepayRecord.getValue({ fieldId: config.FIELD.feishuInstanceCode }),
                    result
                })
            } catch (e) {
                log.error('预付款申请飞书审批节点同步失败', e)
                markFeishuSyncStatus(recordId, config.SYNC_STATUS.failed)
            }

            return
        }

        try {
            const appId = getParameter(PARAM.appId)
            const appSecret = getParameter(PARAM.appSecret)
            const approvalCode = FEISHU_APPROVAL_CODE
            const currentUser = runtime.getCurrentUser()
            const employeeInfo = findFeishuEmployeeInfo(currentUser.id)
            const feishuUserId = employeeInfo.feishuUserId

            if (!appId || !appSecret || !approvalCode) {
                throw new Error('缺少飞书脚本参数：App ID / App Secret / Approval Code')
            }

            if (!feishuUserId) {
                throw new Error('当前NS用户未配置员工字段 ' + EMPLOYEE_FIELD.feishuUserId)
            }

            markFeishuSyncStatus(recordId, config.SYNC_STATUS.pending)

            const token = getTenantToken(appId, appSecret)
            const form = buildForm(prepayRecord)
            const response = https.post({
                url: 'https://open.feishu.cn/open-apis/approval/v4/instances?user_id_type=user_id',
                headers: {
                    Authorization: 'Bearer ' + token,
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify({
                    approval_code: approvalCode,
                    user_id: feishuUserId,
                    form: JSON.stringify(form)
                })
            })

            const body = JSON.parse(response.body || '{}')

            if (body.code !== 0) {
                throw new Error('创建飞书审批实例失败：' + response.body)
            }

            const values = {
                [config.FIELD.feishuInstanceCode]: body.data.instance_code,
                [config.FIELD.feishuSyncStatus]: config.SYNC_STATUS.success
            }

            if (config.SOURCE.netsuite) {
                values[config.FIELD.feishuLastSource] = config.SOURCE.netsuite
            }

            record.submitFields({
                type: config.RECORD_TYPE,
                id: recordId,
                values,
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            })

            log.audit('预付款申请飞书审批创建成功', {
                recordId,
                instanceCode: body.data.instance_code
            })
        } catch (e) {
            log.error('预付款申请飞书审批创建失败', e)

            markFeishuSyncStatus(recordId, config.SYNC_STATUS.failed)
        }
    }

    return {
        afterSubmit
    }
})
