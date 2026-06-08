# 飞书与 NetSuite 预付款申请审批 Demo 测试用例

## 目标

打通一条最小闭环：

1. NetSuite 预付款申请订单进入“待部门经理审批”状态。
2. User Event 创建飞书审批实例，并把实例号写回 NetSuite。
3. 飞书节点审批通过、拒绝或退回后，回调 RESTlet。
4. RESTlet 创建 NetSuite「审批意见」记录。
5. RESTlet 修改预付款申请订单状态字段 `custrecord_swc_advancepay_state`，由现有工作流继续流转。

## 本文档维护范围

这份文档对应 demo 脚本的测试说明。代码里的关键方法已经补充注释：

- `SWC_Feishu_Approval_Demo_Config.js`：集中说明字段、状态、飞书控件、飞书节点和状态流转映射。
- `SWC_UE_FEISHU_PREPAY_APPROVAL_DEMO.js`：说明 NS 发起飞书审批的触发条件、表单构造和回写流程。
- `SWC_RL_FEISHU_PREPAY_CALLBACK_DEMO.js`：说明飞书回调归一化、审批意见创建、状态回填和幂等流程。
- `feishu-prepay-approval-demo.test.js`：说明如何在 Jest 中加载 SuiteScript AMD 文件并验证映射与回写行为。

## Demo 脚本

- 公共配置：`src/FileCabinet/SuiteScripts/SWC_PROJECT/common/SWC_Feishu_Approval_Demo_Config.js`
- NS 发起飞书审批：`src/FileCabinet/SuiteScripts/SWC_PROJECT/UE/SWC_UE_FEISHU_PREPAY_APPROVAL_DEMO.js`
- 飞书回填 NS：`src/FileCabinet/SuiteScripts/SWC_PROJECT/RL/SWC_RL_FEISHU_PREPAY_CALLBACK_DEMO.js`
- 单元测试：`__tests__/feishu-prepay-approval-demo.test.js`

## 需要确认的 NetSuite 字段

预付款申请订单记录类型：

```text
customrecord_swc_advancepay_plateform
```

Demo 默认使用这些字段，以下 4 个业务字段已按你确认的信息更新：

| 用途 | 字段 ID |
|---|---|
| 审批状态 | `custrecord_swc_advancepay_state` |
| 预付款总金额，货币类型 | `custrecord_swc_advancepay_total_amount` |
| 备注，自由形式文本 | `custrecord_swc_advancepay_memo` |
| 实际预付款日期 | `custrecord_swc_advancepay_paydate` |
| 飞书审批实例号 | `custrecord_swc_feishu_instance_code` |
| 飞书同步状态 | `custrecord_swc_feishu_sync_status` |
| 飞书最后事件 ID | `custrecord_swc_feishu_last_event_id` |
| 最后同步来源 | `custrecord_swc_feishu_last_source`，可选；如果是列表/记录字段，需要在配置里填写列表项内部 ID |

如果后 4 个飞书字段还没有，需要先在预付款申请订单上新增。

审批意见记录类型：

```text
customrecord_swc_approval_comments_lib
```

Demo 默认写入：

| 用途 | 字段 ID |
|---|---|
| 审批意见 | `custrecord_swc_approval_comments_content` |
| 所有者 | `owner`，RESTlet 按飞书审批人 `user_id` 匹配员工后写入 |
| 事务处理单据 | `custrecord_swc_approval_comments_tran`，本预付款 demo 不写 |
| 关联预付款申请单 | `custrecord_swc_approval_comments_prepay` |
| 关联付款申请单 | `custrecord_swc_approval_comments_payment`，本预付款 demo 不写 |

## 飞书控件映射

User Event 创建审批实例前会读取当前飞书审批定义，再按控件名称或 `custom_id` 动态匹配实际控件 ID。测试时不要按旧的 `widget177993...` 控件 ID 排查；如果飞书返回 `60022` 且错误里出现 `widget177993...`，说明 NetSuite 仍在运行旧脚本、旧配置，或脚本参数里的 `approval_code` 指向了另一个审批定义。

建议审批定义中保留以下控件名称或等价 `custom_id`：

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

## 飞书节点映射

已写入配置文件：

| NS 节点 | 飞书节点名 | 飞书 node_id |
|---|---|---|
| 部门经理审批 | 部门经理 | `ae2614b5a61ef1011edfb1e7c318a1d6` |
| 总账审批 | 总账 | `570ea00b58e14b988f77a1ddccbbe7c2` |
| 财务经理审批 | 财务经理 | `23bfd95e67cbd975372181de9fb0905b` |
| 财务总监审批 | 财务总监 | `8b221d5e970ac2c52acd15c1f258f05d` |
| 副总经理审批 | 副总经理 | `79ed98950601bb9a0c23a3bc4eb8cc2d` |
| 总经理审批 | 总经理 | `908dbd756fb99d984422a1151b920709` |
| 出纳付款 | 出纳 | `ae35b8817053771cca78a3b5460fe63c` |

当前 demo 的状态回填策略已经按“系统预付款审批流”右侧输入配置改为内部 ID：

飞书撤回或撤销事件不再回写 NetSuite。本 demo 只处理通过、拒绝、退回三类审批动作。

| 当前飞书/NS节点 | 通过后回填 `custrecord_swc_advancepay_state` | 拒绝后回填 | 退回后回填 |
|---|---|---|---|
| 部门经理 | `25`，待总账审批 | `3`，已拒绝 | `7`，已打回待再次提交 |
| 总账 | `16`，待财务经理审批 | `3`，已拒绝 | `7`，已打回待再次提交 |
| 财务经理 | `17`，待财务总监审批 | `3`，已拒绝 | `7`，已打回待再次提交 |
| 财务总监 | `23`，待副总经理审批 | `3`，已拒绝 | `7`，已打回待再次提交 |
| 副总经理 | `24`，待总经理审批 | `3`，已拒绝 | `7`，已打回待再次提交 |
| 总经理 | `1`，已批准 | `3`，已拒绝 | `7`，已打回待再次提交 |
| 出纳付款 | `8`，已支付 | `3`，已拒绝 | `7`，已打回待再次提交 |

RESTlet 使用 `record.submitFields()` 写状态内部 ID，比写中文文本更稳定。

## 审批状态内部 ID

| 内部 ID | 名称 | 本 demo 是否使用 |
|---:|---|---|
| 1 | 已批准 | 是，总经理通过后 |
| 2 | 待审批 | 否 |
| 3 | 已拒绝 | 是，任意节点拒绝后 |
| 4 | 待提交 | 否，本 demo 不再由飞书撤回/撤销回写 |
| 6 | 已作废 | 否 |
| 7 | 已打回待再次提交 | 是，任意节点退回后 |
| 8 | 已支付 | 是，出纳付款后 |
| 9 | 部分支付 | 否 |
| 10 | 已确认 | 否 |
| 12 | 已收款待审 | 否 |
| 14 | 待运营经理审批 | 否 |
| 15 | 待出纳确认 | 否 |
| 16 | 待财务经理审批 | 是，总账通过后 |
| 17 | 待财务总监审批 | 是，财务经理通过后 |
| 21 | 已提交 | 否，保留兼容旧脚本 |
| 22 | 待部门经理审批 | 是，UE 以此作为发起飞书审批的触发状态 |
| 23 | 待副总经理审批 | 是，财务总监通过后 |
| 24 | 待总经理审批 | 是，副总经理通过后 |
| 25 | 待总账审批 | 是，部门经理通过后 |

## 部署步骤

1. 上传 3 个 SuiteScript 文件。
2. 部署 User Event 到 `customrecord_swc_advancepay_plateform`。
3. 给 User Event 配置脚本参数：

| 参数 ID | 值 |
|---|---|
| `custscript_fs_demo_app_id` | 飞书 App ID |
| `custscript_fs_demo_app_secret` | 飞书 App Secret |
| `custscript_fs_demo_approval_code` | 飞书审批定义 code |
| `custscript_fs_demo_department_id` | 兜底部门；员工 `custentity_feishu_open_department_id` 为空时才使用。必须是飞书部门 open_department_id（通常为 `od-...`），不能填群聊 `chat_id`（`oc_...`） |

4. 部署 RESTlet，并将外部 URL 配到飞书回调服务或你的中间 APP。
5. 确认发起人对应的 NetSuite 员工记录已维护：

```text
custentity_feishu_user_id = 飞书 user_id
custentity_feishu_open_department_id = 飞书 open_department_id，例如 od-376b09168060bd5faddc660d3ea1126a
```

## 测试用例 1：NS 创建飞书审批

前置条件：

- 新建或选择一张预付款申请订单。
- 状态不是“待部门经理审批”(内部 ID `22`)。
- 当前 NS 用户员工记录已维护飞书 `user_id`。

操作：

1. 点击 NS 工作流里的“提交”，让 `custrecord_swc_advancepay_state` 变为 `22`，待部门经理审批。
2. 保存记录。

预期：

- 飞书生成一张审批实例。
- NS 回写 `custrecord_swc_feishu_instance_code`。
- NS 回写 `custrecord_swc_feishu_sync_status = 2`。

## 测试用例 2：模拟飞书审批通过回填 NS

用 Postman 调 RESTlet：

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

预期：

- RESTlet 返回 `success: true`。
- 预付款申请订单的“审批意见”子列表新增 1 条记录。
- 审批意见内容为 `[部门经理通过]：同意预付款申请`。
- 如果员工记录 `custentity_feishu_user_id = ou_demo_user`，审批意见记录的所有者回写为该员工。
- 预付款申请订单状态回填为 `25`，待总账审批，工作流进入“总账审批”。

## 测试用例 3：模拟飞书拒绝

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

预期：

- 审批意见新增 1 条。
- 预付款申请订单状态改为 `3`，已拒绝。
- 工作流进入“已拒绝”节点。

## 测试用例 4：模拟飞书退回

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

预期：

- 审批意见新增 1 条。
- 预付款申请订单状态改为 `7`，已打回待再次提交。
- 工作流进入“已打回待再次提交”节点。
- 预付款申请订单上的旧飞书实例号清空，便于再次提交时重新创建飞书审批实例。

## 测试用例 5：退回后再次提交

操作：

1. 先执行测试用例 4，让单据状态进入 `7`，已打回待再次提交。
2. 在 NetSuite 单据页面点击“再次提交”，让状态重新进入 `22`，待部门经理审批。

预期：

- User Event 从头创建新的飞书审批实例。
- NS 回写新的 `custrecord_swc_feishu_instance_code`。
- 新飞书实例后续通过、拒绝、退回仍可同步回 NetSuite。

## 测试用例 6：重复回调幂等

重复发送测试用例 2 的 payload。

预期：

- RESTlet 返回 `duplicate: true`。
- 不新增审批意见。
- 不重复修改单据状态。

## 本地单元测试

```bash
npm test -- feishu-prepay-approval-demo
```

单元测试只验证映射、审批意见创建调用、状态回填调用和重复事件幂等；真实飞书 API 和 NetSuite 工作流流转仍需在 SB 环境联调。
