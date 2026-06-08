# 飞书与 NetSuite 预付款审批 Demo 脚本配置部署文档

## 1. 文档范围

本文档用于部署预付款申请订单与飞书审批打通的 Demo 脚本，覆盖 NetSuite 脚本上传、脚本部署、脚本参数、字段准备、飞书回调配置和上线验证。

本 Demo 采用三段脚本：

| 用途 | 文件 |
|---|---|
| 公共配置 | `src/FileCabinet/SuiteScripts/SWC_PROJECT/common/SWC_Feishu_Approval_Demo_Config.js` |
| NetSuite 发起飞书审批 | `src/FileCabinet/SuiteScripts/SWC_PROJECT/UE/SWC_UE_FEISHU_PREPAY_APPROVAL_DEMO.js` |
| 飞书审批回写 NetSuite | `src/FileCabinet/SuiteScripts/SWC_PROJECT/RL/SWC_RL_FEISHU_PREPAY_CALLBACK_DEMO.js` |

整体流程：

1. NetSuite 预付款申请订单提交后，审批状态进入“待部门经理审批”。
2. User Event 脚本自动调用飞书接口创建审批实例。
3. 脚本把飞书 `instance_code` 回写到预付款申请订单。
4. 飞书审批节点通过、拒绝或退回后，由飞书或中间服务调用 RESTlet。
5. RESTlet 创建 NetSuite 审批意见，并回填预付款申请订单审批状态。
6. NetSuite 原审批工作流根据状态字段继续流转。
7. 已有飞书审批实例时，如果 NS 侧手工或工作流修改审批状态，User Event 会把飞书审批流同步到对应节点：向后变更时自动同意当前待办，向前变更时退回到目标节点重新审批。

## 2. 前置准备

### 2.1 NetSuite 记录类型

预付款申请订单记录类型：

```text
customrecord_swc_advancepay_plateform
```

审批意见记录类型：

```text
customrecord_swc_approval_comments_lib
```

### 2.2 预付款申请订单字段

确认 `customrecord_swc_advancepay_plateform` 上存在以下字段：

| 用途 | 字段 ID | 是否必需 |
|---|---|---|
| 单据编号 | `name` | 是 |
| 审批状态 | `custrecord_swc_advancepay_state` | 是 |
| 预付款总金额 | `custrecord_swc_advancepay_total_amount` | 是 |
| 备注 | `custrecord_swc_advancepay_memo` | 是 |
| 实际预付款日期 | `custrecord_swc_advancepay_paydate` | 是 |
| 飞书审批实例号 | `custrecord_swc_feishu_instance_code` | 是 |
| 飞书同步状态 | `custrecord_swc_feishu_sync_status` | 是 |
| 飞书最后事件 ID | `custrecord_swc_feishu_last_event_id` | 是 |
| 最后同步来源 | `custrecord_swc_feishu_last_source` | 可选 |

如果飞书相关字段不存在，需要先在预付款申请订单自定义记录上新增。

### 2.3 审批意见字段

确认 `customrecord_swc_approval_comments_lib` 上存在以下字段：

| 用途 | 字段 ID |
|---|---|
| 审批意见内容 | `custrecord_swc_approval_comments_content` |
| 所有者 | `owner`，RESTlet 按飞书审批人 `user_id` 匹配员工后写入 |
| 事务处理单据 | `custrecord_swc_approval_comments_tran`，本预付款 demo 不写 |
| 关联预付款申请单 | `custrecord_swc_approval_comments_prepay` |
| 关联付款申请单 | `custrecord_swc_approval_comments_payment`，本预付款 demo 不写 |

### 2.4 员工飞书信息

发起审批的 NetSuite 用户需要关联员工记录，并在员工记录上维护飞书用户 ID 和部门 open_department_id：

```text
custentity_feishu_user_id = 飞书 user_id
custentity_feishu_open_department_id = 飞书 open_department_id，例如 od-376b09168060bd5faddc660d3ea1126a
```

User Event 创建飞书审批实例时，会读取当前 NetSuite 用户对应员工的 `custentity_feishu_user_id` 作为飞书审批发起人，读取 `custentity_feishu_open_department_id` 作为申请部门。RESTlet 收到飞书审批回调时，也会用审批人的飞书 `user_id` 匹配员工记录，并把匹配员工写入审批意见记录的 `owner`。

## 3. 配置文件确认

配置文件：

```text
src/FileCabinet/SuiteScripts/SWC_PROJECT/common/SWC_Feishu_Approval_Demo_Config.js
```

部署前重点确认以下配置与目标账号一致。

### 3.1 审批状态内部 ID

| 内部 ID | 状态名称 | Demo 用途 |
|---:|---|---|
| 1 | 已批准 | 总经理通过后回填 |
| 3 | 已拒绝 | 任意节点拒绝后回填 |
| 7 | 已打回待再次提交 | 任意节点退回后回填 |
| 8 | 已支付 | 出纳付款后回填 |
| 16 | 待财务经理审批 | 总账通过后回填 |
| 17 | 待财务总监审批 | 财务经理通过后回填 |
| 22 | 待部门经理审批 | User Event 发起飞书审批的触发状态 |
| 23 | 待副总经理审批 | 财务总监通过后回填 |
| 24 | 待总经理审批 | 副总经理通过后回填 |
| 25 | 待总账审批 | 部门经理通过后回填 |

如果目标账号中的审批状态列表内部 ID 不一致，需要修改配置文件中的 `STATUS`。

### 3.2 飞书同步状态

当前 Demo 默认值：

| 值 | 含义 |
|---:|---|
| 1 | 同步中 |
| 2 | 同步成功 |
| 3 | 同步失败 |

如果 `custrecord_swc_feishu_sync_status` 使用的自定义列表内部 ID 不同，需要修改配置文件中的 `SYNC_STATUS`。

### 3.3 最后同步来源

配置文件中默认：

```javascript
const SOURCE = {
    netsuite: '',
    feishu: ''
}
```

如果 `custrecord_swc_feishu_last_source` 是列表/记录字段，需要把 `netsuite`、`feishu` 配成对应列表项内部 ID；如果不需要写入来源，可以保持为空。

## 4. 飞书审批模板配置

### 4.1 表单控件匹配

User Event 创建飞书审批实例前会调用“查看指定审批定义”，读取当前审批定义的表单控件，再按控件名称或 `custom_id` 匹配当前控件 ID。因此飞书审批模板重新发布后，只要控件名称或 `custom_id` 保持可匹配，通常不需要手工更新 `widget...` 控件 ID。

建议在飞书审批模板中维护以下控件名称或等价 `custom_id`：

| NS 字段 | 建议控件名称 | 建议 custom_id |
|---|---|---|
| 单据号 | 单据号 / 单据ID / 单据编号 | `tran_id` / `document_no` |
| 子公司 | 主体 / 子公司 / 公司 | `subsidiary` |
| 供应商 | 供应商 / 供应商名称 / 收款方 | `vendor` |
| 采购订单 | 采购订单 / 采购订单号 / PO | `po` / `purchase_order_no` |
| 总数量 | 总数量 / 全部数量 / 数量 | `all_quantity` |
| 付款条款 | 付款条款 / 付款条件 | `payment_terms` |
| 总金额 | 总金额 / 付款金额 / 预付款金额 | `total_amount` |
| 是否整单预付 | 是否整单预付 / 整单预付 | `whole_order_prepay` |
| 整单预付比例 | 整单预付比例 / 预付比例 | `whole_order_percent` |
| 供应商银行账号 | 供应商银行账号 / 银行账号 / 收款账号 | `vendor_bank_account` |
| 预计付款日期 | 预计付款日期 / 付款日期 | `expected_pay_date` |

如果 UE 日志出现“飞书审批定义未匹配到部分预付款控件”，按日志里的 `availableControls` 调整控件名称或 `custom_id`。

### 4.2 审批节点 ID

Demo 已内置以下飞书节点 ID：

| 飞书节点 | node_id |
|---|---|
| 部门经理 | `ae2614b5a61ef1011edfb1e7c318a1d6` |
| 总账审批 | `570ea00b58e14b988f77a1ddccbbe7c2` |
| 财务经理审批 | `23bfd95e67cbd975372181de9fb0905b` |
| 财务总监审批 | `8b221d5e970ac2c52acd15c1f258f05d` |
| 副总经理审批 | `79ed98950601bb9a0c23a3bc4eb8cc2d` |
| 总经理审批 | `908dbd756fb99d984422a1151b920709` |
| 出纳付款 | `ae35b8817053771cca78a3b5460fe63c` |

如果飞书审批模板节点发生调整，需要同步更新配置文件中的 `FEISHU_NODE` 和 `NODE_BY_ID`。

## 5. NetSuite 脚本上传

上传以下 3 个文件到 File Cabinet，保持目录关系不变：

```text
SuiteScripts/SWC_PROJECT/common/SWC_Feishu_Approval_Demo_Config.js
SuiteScripts/SWC_PROJECT/UE/SWC_UE_FEISHU_PREPAY_APPROVAL_DEMO.js
SuiteScripts/SWC_PROJECT/RL/SWC_RL_FEISHU_PREPAY_CALLBACK_DEMO.js
```

注意：

- UE 和 RESTlet 都通过相对路径引用公共配置文件。
- 如果上传目录变化，需要同步调整脚本中的 `define()` 依赖路径。

## 6. User Event 脚本部署

### 6.1 创建脚本记录

在 NetSuite 创建 User Event Script：

| 配置项 | 值 |
|---|---|
| 脚本文件 | `SWC_UE_FEISHU_PREPAY_APPROVAL_DEMO.js` |
| Script Type | User Event |
| API Version | 2.1 |
| 入口函数 | `afterSubmit` |

### 6.2 部署记录

创建脚本部署：

| 配置项 | 值 |
|---|---|
| Applies To | `customrecord_swc_advancepay_plateform` |
| Status | Testing 或 Released |
| Event Type | Create、Edit、XEdit / Inline Edit |
| Execute As Role | 使用有权限访问预付款申请订单、员工、飞书字段的角色 |

同一个 `customrecord_swc_advancepay_plateform` 上只保留本 demo 的 `SWC_UE_FEISHU_PREPAY_APPROVAL_DEMO.js` 部署。不要同时启用旧脚本 `SWC_UE_FEISHU_APPROVALS.js`；该脚本使用旧的 `widget177993...` 控件 ID，若误部署到预付款申请订单，会触发飞书 `60022` 控件不存在错误。

### 6.3 脚本参数

在 User Event 脚本上新增并维护以下参数：

| 参数 ID | 参数类型 | 值 |
|---|---|---|
| `custscript_fs_demo_app_id` | Free-Form Text | 飞书 App ID |
| `custscript_fs_demo_app_secret` | Password 或 Free-Form Text | 飞书 App Secret |
| `custscript_fs_demo_approval_code` | Free-Form Text | 飞书审批定义 code |
| `custscript_fs_demo_department_id` | Free-Form Text | 兜底部门；员工 `custentity_feishu_open_department_id` 为空时才使用。必须是飞书部门 open_department_id（通常为 `od-...`），不能填群聊 `chat_id`（`oc_...`） |

User Event 创建飞书审批实例触发条件：

- 记录类型为 `customrecord_swc_advancepay_plateform`。
- 操作为 Create、Edit 或 XEdit / Inline Edit。
- `custrecord_swc_advancepay_state` 本次保存后变成 `22`，即“待部门经理审批”。
- 旧状态不是 `22`。
- `custrecord_swc_feishu_instance_code` 为空。

满足以上条件时，脚本会创建飞书审批实例；如果记录已经有 `instance_code`，不会重复创建。

User Event 同步已有飞书审批实例触发条件：

- 操作为 Edit 或 XEdit / Inline Edit。
- `custrecord_swc_feishu_instance_code` 不为空。
- `custrecord_swc_advancepay_state` 本次保存发生变化。
- 新状态已配置到飞书审批节点，例如 `25` 待总账审批、`16` 待财务经理审批、`17` 待财务总监审批。
- 执行上下文不是 RESTlet，避免飞书回调 NS 后再次反向调用飞书。

同步规则：

- 飞书当前待办节点在目标节点之前时，脚本调用飞书任务同意接口，让审批流前进到目标节点。
- 飞书当前待办节点在目标节点之后时，脚本调用飞书指定退回接口，退回到目标节点重新审批。
- 示例：`17` 待财务总监审批改为 `16` 待财务经理审批，会退回财务经理节点；`25` 待总账审批改为 `16` 待财务经理审批，会自动同意总账节点并流转到财务经理节点。

飞书应用权限需要包含审批定义读取、审批实例查询、审批任务同意、指定退回等审批任务操作权限；权限调整后需重新发布应用。

## 7. RESTlet 脚本部署

### 7.1 创建脚本记录

在 NetSuite 创建 RESTlet Script：

| 配置项 | 值 |
|---|---|
| 脚本文件 | `SWC_RL_FEISHU_PREPAY_CALLBACK_DEMO.js` |
| Script Type | RESTlet |
| API Version | 2.1 |
| 入口函数 | `post` |

### 7.2 部署记录

创建脚本部署：

| 配置项 | 值 |
|---|---|
| Status | Testing 或 Released |
| Log Level | Audit 或 Debug |
| Execute As Role | 使用有权限创建审批意见、更新预付款申请订单的角色 |

部署完成后，记录 RESTlet External URL。该 URL 后续配置到飞书回调服务或中间服务。

### 7.3 脚本参数与预警

RESTlet 回写失败时会先重试 5 次；重试后仍失败，会用当前飞书 App 机器人发送文本预警到群聊 `NS-飞书审批流`。RESTlet 部署需要维护以下脚本参数：

| 参数 ID | 值 |
|---|---|
| `custscript_fs_demo_app_id` | 飞书 App ID，当前使用 `cli_aa9d2362783b5bd6` |
| `custscript_fs_demo_app_secret` | 飞书 App Secret |

飞书应用权限需要允许获取 tenant token、搜索机器人可见群聊、向群聊发送消息；权限调整后需重新发布应用。机器人必须已经加入 `NS-飞书审批流` 群。

RESTlet 权限要求：

- 可读取和更新 `customrecord_swc_advancepay_plateform`。
- 可创建 `customrecord_swc_approval_comments_lib`。
- 可读取字段 `custrecord_swc_feishu_instance_code`、`custrecord_swc_feishu_last_event_id`。

User Event 反向同步权限要求：

- Execute As Role 可读取、更新 `customrecord_swc_advancepay_plateform` 的飞书同步字段。
- 飞书应用可调用审批实例详情、审批任务同意和指定退回接口。

## 8. 飞书或中间服务回调配置

### 8.1 回调目标

将 NetSuite RESTlet External URL 配置到飞书事件回调服务，或配置到中间服务，由中间服务再调用 RESTlet。

推荐使用中间服务处理：

- 飞书回调验签。
- 飞书 challenge 校验。
- 飞书事件字段转换。
- NetSuite Token Based Authentication。
- 错误重试和日志追踪。

### 8.2 RESTlet 支持的请求字段

RESTlet 可以接收字段在根节点，也可以接收在 `event` 节点下。

| 字段 | 说明 | 是否必需 |
|---|---|---|
| `event_id` / `eventId` | 飞书事件唯一 ID，用于幂等 | 建议 |
| `record_id` / `recordId` | NetSuite 预付款申请订单 internalid | 与 `instance_code` 二选一 |
| `instance_code` / `instanceCode` | 飞书审批实例号 | 与 `record_id` 二选一 |
| `node_id` / `nodeId` | 飞书审批节点 ID | 是 |
| `action` / `status` | 审批动作，支持 `APPROVE`、`REJECT`、`RETURN`；`拒绝`、`驳回` 会归一为 `REJECT`，`退回`、`打回` 会归一为 `RETURN` | 是 |
| `operator.name` | 审批人姓名 | 建议 |
| `operator.user_id` | 飞书审批人 user_id | 建议 |
| `comment` / `reason` | 审批意见 | 否 |

## 9. 状态回填规则

RESTlet 根据飞书节点和动作回填 `custrecord_swc_advancepay_state`。飞书撤回/撤销事件不再回写 NetSuite。

| 当前飞书节点 | 通过后状态 | 拒绝后状态 | 退回后状态 |
|---|---|---|---|
| 部门经理 | `25`，待总账审批 | `3`，已拒绝 | `7`，已打回待再次提交 |
| 总账审批 | `16`，待财务经理审批 | `3`，已拒绝 | `7`，已打回待再次提交 |
| 财务经理审批 | `17`，待财务总监审批 | `3`，已拒绝 | `7`，已打回待再次提交 |
| 财务总监审批 | `23`，待副总经理审批 | `3`，已拒绝 | `7`，已打回待再次提交 |
| 副总经理审批 | `24`，待总经理审批 | `3`，已拒绝 | `7`，已打回待再次提交 |
| 总经理审批 | `1`，已批准 | `3`，已拒绝 | `7`，已打回待再次提交 |
| 出纳付款 | `8`，已支付 | `3`，已拒绝 | `7`，已打回待再次提交 |

## 10. 验证步骤

### 10.1 验证 NetSuite 发起飞书审批

前置条件：

- 当前 NetSuite 用户员工记录已维护 `custentity_feishu_user_id`。
- User Event 脚本参数已配置完整。
- 预付款申请订单飞书实例号为空。

操作：

1. 新建或选择一张预付款申请订单。
2. 通过 NetSuite 工作流提交，让 `custrecord_swc_advancepay_state` 进入 `22`。
3. 保存记录。

预期结果：

- 飞书生成审批实例。
- 飞书审批单包含 NetSuite 单据内部 ID、单据 ID、提交人、预付款总金额和实际预付款日期。
- 预付款申请订单回写 `custrecord_swc_feishu_instance_code`。
- 预付款申请订单回写 `custrecord_swc_feishu_sync_status = 2`。
- 脚本执行日志出现“预付款申请飞书审批创建成功”。

### 10.2 验证飞书通过回写

调用 RESTlet 示例：

```json
{
  "event_id": "demo-event-approve-001",
  "record_id": "替换成预付款申请订单internalid",
  "instance_code": "替换成飞书instance_code",
  "node_id": "ae2614b5a61ef1011edfb1e7c318a1d6",
  "action": "APPROVE",
  "operator": {
    "name": "张三",
    "user_id": "ou_demo_user"
  },
  "comment": "同意预付款申请"
}
```

预期结果：

- RESTlet 返回 `success: true`。
- 审批意见新增一条记录。
- 预付款申请订单状态变为 `25`，待总账审批。

### 10.3 验证飞书拒绝回写

```json
{
  "event_id": "demo-event-reject-001",
  "record_id": "替换成预付款申请订单internalid",
  "instance_code": "替换成飞书instance_code",
  "node_id": "ae2614b5a61ef1011edfb1e7c318a1d6",
  "action": "REJECT",
  "operator": {
    "name": "李四",
    "user_id": "ou_demo_user_2"
  },
  "comment": "资料不完整，请补充合同附件"
}
```

预期结果：

- 审批意见新增一条记录。
- 预付款申请订单状态变为 `3`，已拒绝。

### 10.4 验证飞书打回回写

```json
{
  "event_id": "demo-event-return-001",
  "record_id": "替换成预付款申请订单internalid",
  "instance_code": "替换成飞书instance_code",
  "node_id": "ae2614b5a61ef1011edfb1e7c318a1d6",
  "action": "RETURN",
  "operator": {
    "name": "王五",
    "user_id": "ou_demo_user_3"
  },
  "comment": "请修改付款资料后重新提交"
}
```

预期结果：

- 审批意见新增一条记录。
- 预付款申请订单状态变为 `7`，已打回待再次提交。
- 预付款申请订单上的旧飞书 `instance_code` 被清空，方便再次提交时重新创建飞书审批实例。

### 10.5 验证退回后再次提交

操作：

1. 在飞书任意节点执行退回，让 NS 状态变为 `7`。
2. 在 NetSuite 单据页面点击“再次提交”，让状态重新进入 `22`，待部门经理审批。

预期结果：

- User Event 从头创建新的飞书审批实例。
- 预付款申请订单回写新的 `custrecord_swc_feishu_instance_code`。
- 后续飞书审批继续通过 RESTlet 同步回 NetSuite。

### 10.6 验证重复回调幂等

重复发送同一个 `event_id` 的 RESTlet 请求。

预期结果：

- RESTlet 返回 `duplicate: true`。
- 不重复新增审批意见。
- 不重复修改预付款申请订单状态。

## 11. 常见问题排查

| 问题 | 可能原因 | 处理方式 |
|---|---|---|
| UE 未创建飞书审批 | 状态没有从非 `22` 变为 `22` | 检查工作流是否正确写入 `custrecord_swc_advancepay_state` |
| UE 报缺少飞书参数 | 脚本部署参数为空 | 检查 App ID、App Secret、Approval Code |
| UE 报当前 NS 用户未配置飞书用户 | 员工字段 `custentity_feishu_user_id` 为空 | 在员工记录上维护飞书 user_id |
| 飞书创建实例失败 | App 权限、审批 code、控件匹配或发起人异常 | 查看 UE 执行日志中的飞书返回 body；如出现 `60022`，确认应用可读取审批定义，并检查控件名称或 `custom_id` 是否可匹配 |
| `60022` 中出现 `widget177993...` 旧控件 | NetSuite 仍在运行旧部署、旧脚本文件，或 `SWC_UE_FEISHU_APPROVALS.js` 误部署到预付款申请订单 | 重新上传并部署 `SWC_UE_FEISHU_PREPAY_APPROVAL_DEMO.js`，停用旧 UE 部署；在执行日志中确认出现“预付款申请飞书审批创建表单控件”，且 `formItems` 不含 `widget177993...` |
| NS 状态变更后飞书未同步节点 | 记录没有 `instance_code`、新状态未配置飞书节点、或执行上下文是 RESTlet | 检查实例号、`STATUS_NODE` 配置和 UE 日志 |
| 飞书节点同步失败 | 飞书任务已结束、当前节点无法判断、或 App 缺少任务同意/指定退回权限 | 查看 UE 日志中的飞书返回 body，并确认飞书审批实例仍在审批中 |
| RESTlet 返回未找到预付款申请单 | `record_id` 错误或 `instance_code` 未回写 | 优先传 `record_id`，并检查飞书实例号字段 |
| RESTlet 返回未配置节点 | `node_id` 不在配置文件中 | 更新 `FEISHU_NODE` 和 `NODE_BY_ID` |
| 状态回填后工作流未流转 | 工作流条件与状态字段不一致 | 检查工作流节点条件是否读取 `custrecord_swc_advancepay_state` |

## 12. 上线检查清单

- [ ] 3 个脚本文件已上传到正确目录。
- [ ] 公共配置中的字段 ID、状态内部 ID、飞书节点 ID 已确认，飞书控件名称或 `custom_id` 可被 UE 匹配。
- [ ] User Event 已部署到 `customrecord_swc_advancepay_plateform`。
- [ ] `customrecord_swc_advancepay_plateform` 上没有启用旧 `SWC_UE_FEISHU_APPROVALS.js` 部署。
- [ ] User Event 脚本参数已配置。
- [ ] RESTlet 已部署并取得 External URL。
- [ ] 飞书或中间服务已配置回调到 RESTlet。
- [ ] 发起审批的员工记录已维护 `custentity_feishu_user_id`。
- [ ] 使用一张测试预付款申请单验证“创建飞书审批实例”成功。
- [ ] 使用 RESTlet 测试通过、拒绝、退回和重复事件幂等。
- [ ] 检查 NetSuite 工作流能按回填状态继续流转。
