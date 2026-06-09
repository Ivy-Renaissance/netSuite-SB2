const path = require('path');
const fs = require('fs');
const vm = require('vm');

// SuiteScript 文件是 AMD define() 格式，本测试工具负责在 Jest 中加载它们。
const loadSuiteScriptModule = (relativePath, dependencyMap = {}) => {
    let loadedModule;
    const modulePath = path.resolve(__dirname, '..', relativePath);

    jest.resetModules();
    global.define = (dependencies, factory) => {
        loadedModule = factory(...dependencies.map((dependency) => {
            if (!(dependency in dependencyMap)) {
                throw new Error(`Missing mock for dependency: ${dependency}`);
            }

            return dependencyMap[dependency];
        }));
    };

    const source = fs.readFileSync(modulePath, 'utf8');
    vm.runInNewContext(source, { define: global.define }, { filename: modulePath });
    delete global.define;

    return loadedModule;
};

const loadConfig = () => loadSuiteScriptModule(
    'src/FileCabinet/SuiteScripts/SWC_PROJECT/common/SWC_Feishu_Approval_Demo_Config.js'
);

describe('Feishu prepayment approval demo config', () => {
    it('maps Feishu node approve/reject/return actions to NetSuite status internal IDs and text values', () => {
        const config = loadConfig();

        expect(config.getTargetStatus(config.FEISHU_NODE.departmentManager, config.ACTION.approve)).toBe(config.STATUS.pendingGeneralLedger);
        expect(config.getTargetStatus(config.FEISHU_NODE.generalLedger, config.ACTION.approve)).toBe(config.STATUS.pendingFinanceManager);
        expect(config.getTargetStatus(config.FEISHU_NODE.financeManager, config.ACTION.approve)).toBe(config.STATUS.pendingFinanceDirector);
        expect(config.getTargetStatus(config.FEISHU_NODE.financeDirector, config.ACTION.approve)).toBe(config.STATUS.pendingViceGeneralManager);
        expect(config.getTargetStatus(config.FEISHU_NODE.viceGeneralManager, config.ACTION.approve)).toBe(config.STATUS.pendingGeneralManager);
        expect(config.getTargetStatus(config.FEISHU_NODE.generalManager, config.ACTION.approve)).toBe(config.STATUS.approved);
        expect(config.getTargetStatus(config.FEISHU_NODE.financeManager, config.ACTION.reject)).toBe(config.STATUS.rejected);
        expect(config.getTargetStatus(config.FEISHU_NODE.financeManager, config.ACTION.return)).toBe(config.STATUS.returned);
        expect(config.getTargetStatusText(config.FEISHU_NODE.departmentManager, config.ACTION.approve)).toBe(config.STATUS_TEXT.pendingGeneralLedger);
        expect(config.getTargetStatusText(config.FEISHU_NODE.generalLedger, config.ACTION.approve)).toBe(config.STATUS_TEXT.pendingFinanceManager);
        expect(config.getTargetStatusText(config.FEISHU_NODE.financeManager, config.ACTION.approve)).toBe(config.STATUS_TEXT.pendingFinanceDirector);
        expect(config.getTargetStatusText(config.FEISHU_NODE.financeDirector, config.ACTION.approve)).toBe(config.STATUS_TEXT.pendingViceGeneralManager);
        expect(config.getTargetStatusText(config.FEISHU_NODE.viceGeneralManager, config.ACTION.approve)).toBe(config.STATUS_TEXT.pendingGeneralManager);
        expect(config.getTargetStatusText(config.FEISHU_NODE.generalManager, config.ACTION.approve)).toBe(config.STATUS_TEXT.approved);
        expect(config.getTargetStatusText(config.FEISHU_NODE.financeManager, config.ACTION.reject)).toBe(config.STATUS_TEXT.rejected);
        expect(config.getTargetStatusText(config.FEISHU_NODE.financeManager, config.ACTION.return)).toBe(config.STATUS_TEXT.returned);
    });

    it('maps NetSuite pending approval statuses to Feishu approval nodes in sequence', () => {
        const config = loadConfig();

        expect(config.getNodeIdByStatus(config.STATUS.pendingGeneralLedger)).toBe(config.FEISHU_NODE.generalLedger);
        expect(config.getNodeIdByStatus(config.STATUS.pendingFinanceManager)).toBe(config.FEISHU_NODE.financeManager);
        expect(config.getNodeSequenceIndex(config.FEISHU_NODE.generalLedger)).toBeLessThan(
            config.getNodeSequenceIndex(config.FEISHU_NODE.financeManager)
        );
    });

    it('resolves runtime approval node ids by the current NetSuite pending status', () => {
        const config = loadConfig();
        const runtimeNodeId = 'APPROVAL_782493_4614729';

        const node = config.resolveNode({
            nodeId: runtimeNodeId,
            currentStatus: config.STATUS.pendingGeneralLedger
        });

        expect(node.id).toBe(config.FEISHU_NODE.generalLedger);
        expect(config.getTargetStatus(node, config.ACTION.approve)).toBe(config.STATUS.pendingFinanceManager);
        expect(config.getTargetStatusText(node, config.ACTION.approve)).toBe(config.STATUS_TEXT.pendingFinanceManager);
    });
});

describe('Feishu bridge mapper', () => {
    const {
        FEISHU_WIDGET,
        mapAction,
        normalizeFeishuEvent
    } = require('../middleware/feishu-ns-bridge/src/feishuMapper');

    it('ignores canceled and withdrawn Feishu actions', () => {
        expect(mapAction('CANCELED')).toBe('');
        expect(mapAction('WITHDRAWN')).toBe('');
        expect(mapAction('REVERTED')).toBe('');
        expect(mapAction('RECALL')).toBe('');
        expect(mapAction('已撤回')).toBe('');
        expect(mapAction('DONE', {
            eventType: 'approval_task',
            instanceStatus: 'CANCELED'
        })).toBe('');
    });

    it('maps rejected and returned Feishu actions to NetSuite callback actions', () => {
        expect(mapAction('已同意')).toBe('APPROVE');
        expect(mapAction('通过')).toBe('APPROVE');
        expect(mapAction('REJECTED')).toBe('REJECT');
        expect(mapAction('拒绝')).toBe('REJECT');
        expect(mapAction('驳回')).toBe('REJECT');
        expect(mapAction('RETURNED')).toBe('RETURN');
        expect(mapAction('退回')).toBe('RETURN');
        expect(mapAction('打回')).toBe('RETURN');
        expect(mapAction('ROLLBACK')).toBe('RETURN');
        expect(mapAction('SENT_BACK')).toBe('RETURN');
        expect(mapAction('退回至提交')).toBe('RETURN');
    });

    it('normalizes a canceled Feishu instance as an ignored callback action', () => {
        const result = normalizeFeishuEvent({
            header: {
                event_id: 'evt-bridge-cancel-1'
            },
            event: {
                type: 'approval_instance',
                instance_code: 'FEISHU-INSTANCE-CANCEL'
            }
        }, {
            status: 'CANCELED',
            form: JSON.stringify([
                {
                    id: FEISHU_WIDGET.documentId,
                    value: '1001'
                }
            ]),
            timeline: [
                {
                    type: 'CANCELED',
                    node_key: 'submit',
                    comment: '撤回审批申请'
                }
            ]
        });

        expect(result).toEqual(expect.objectContaining({
            event_id: 'evt-bridge-cancel-1',
            instance_code: 'FEISHU-INSTANCE-CANCEL',
            record_id: '1001',
            action: '',
            comment: '撤回审批申请'
        }));
    });

    it('normalizes a Feishu approval task DONE event from header.event_type as an approval', () => {
        const config = loadConfig();
        const result = normalizeFeishuEvent({
            header: {
                event_id: 'evt-bridge-gl-done-1',
                event_type: 'approval_task'
            },
            event: {
                instance_code: 'FEISHU-INSTANCE-GL',
                task_id: 'task-general-ledger',
                status: 'DONE',
                user: {
                    name: '总账审批人',
                    user_id: 'ou_general_ledger'
                }
            }
        }, {
            form: JSON.stringify([
                {
                    id: FEISHU_WIDGET.documentId,
                    value: '1001'
                }
            ]),
            task_list: [
                {
                    id: 'task-general-ledger',
                    node_key: config.FEISHU_NODE.generalLedger,
                    user_id: 'ou_general_ledger'
                }
            ]
        });

        expect(result).toEqual(expect.objectContaining({
            event_id: 'evt-bridge-gl-done-1',
            instance_code: 'FEISHU-INSTANCE-GL',
            record_id: '1001',
            node_id: config.FEISHU_NODE.generalLedger,
            action: 'APPROVE'
        }));
    });

    it('normalizes a general ledger approved Chinese action', () => {
        const config = loadConfig();
        const result = normalizeFeishuEvent({
            header: {
                event_id: 'evt-bridge-gl-agree-cn-1',
                event_type: 'approval_task'
            },
            event: {
                instance_code: 'FEISHU-INSTANCE-GL-AGREE-CN',
                task_id: 'task-general-ledger',
                task_result: '已同意',
                user: {
                    name: '总账审批人',
                    user_id: 'ou_general_ledger'
                }
            }
        }, {
            form: JSON.stringify([
                {
                    id: FEISHU_WIDGET.documentId,
                    value: '276'
                }
            ]),
            task_list: [
                {
                    id: 'task-general-ledger',
                    node_key: config.FEISHU_NODE.generalLedger,
                    user_id: 'ou_general_ledger'
                }
            ]
        });

        expect(result).toEqual(expect.objectContaining({
            event_id: 'evt-bridge-gl-agree-cn-1',
            instance_code: 'FEISHU-INSTANCE-GL-AGREE-CN',
            record_id: '276',
            node_id: config.FEISHU_NODE.generalLedger,
            action: 'APPROVE'
        }));
    });

    it('normalizes Feishu def_key as the callback node id', () => {
        const result = normalizeFeishuEvent({
            uuid: 'f476f0854058a033f4052757b8ec4f33',
            type: 'event_callback',
            event: {
                app_id: 'cli_aa9d2362783b5bd6',
                approval_code: '306C03CB-85B1-4E66-888C-093ED122FD97',
                def_key: 'APPROVAL_782493_4614729',
                instance_code: 'C1BA0E6E-8CD9-4C91-8166-A3A993724751',
                status: 'APPROVED',
                task_id: '17648920500399525058',
                user_id: 'eg2b8f4d'
            }
        });

        expect(result).toEqual(expect.objectContaining({
            event_id: 'f476f0854058a033f4052757b8ec4f33',
            instance_code: 'C1BA0E6E-8CD9-4C91-8166-A3A993724751',
            node_id: 'APPROVAL_782493_4614729',
            action: 'APPROVE'
        }));
    });

    it('prefers stable node_key and preserves runtime node_id for NetSuite callbacks', () => {
        const config = loadConfig();
        const result = normalizeFeishuEvent({
            header: {
                event_id: 'evt-bridge-gl-runtime-node-1',
                event_type: 'approval_task'
            },
            event: {
                instance_code: 'FEISHU-INSTANCE-GL-RUNTIME',
                task_id: 'task-general-ledger',
                node_id: 'APPROVAL_782493_4614729',
                task_result: '已同意',
                user: {
                    name: '总账审批人',
                    user_id: 'ou_general_ledger'
                }
            }
        }, {
            form: JSON.stringify([
                {
                    id: FEISHU_WIDGET.documentId,
                    value: '276'
                }
            ]),
            task_list: [
                {
                    id: 'task-general-ledger',
                    node_id: 'APPROVAL_782493_4614729',
                    node_key: config.FEISHU_NODE.generalLedger,
                    node_name: '总账审批',
                    user_id: 'ou_general_ledger'
                }
            ]
        });

        expect(result).toEqual(expect.objectContaining({
            event_id: 'evt-bridge-gl-runtime-node-1',
            instance_code: 'FEISHU-INSTANCE-GL-RUNTIME',
            record_id: '276',
            node_id: config.FEISHU_NODE.generalLedger,
            raw_node_id: 'APPROVAL_782493_4614729',
            node_name: '总账审批',
            action: 'APPROVE'
        }));
    });

    it('prefers the timeline return result over a DONE task status', () => {
        const config = loadConfig();
        const result = normalizeFeishuEvent({
            header: {
                event_id: 'evt-bridge-gl-return-1',
                event_type: 'approval_task'
            },
            event: {
                instance_code: 'FEISHU-INSTANCE-GL-RETURN',
                task_id: 'task-general-ledger',
                task_status: 'DONE',
                user: {
                    name: '总账审批人',
                    user_id: 'ou_general_ledger'
                }
            }
        }, {
            status: 'PENDING',
            form: JSON.stringify([
                {
                    id: FEISHU_WIDGET.documentId,
                    value: '273'
                }
            ]),
            task_list: [
                {
                    id: 'task-general-ledger',
                    node_id: config.FEISHU_NODE.generalLedger,
                    user_id: 'ou_general_ledger'
                }
            ],
            timeline: [
                {
                    type: 'RETURN',
                    task_id: 'task-general-ledger',
                    node_key: config.FEISHU_NODE.generalLedger,
                    user_id: 'ou_general_ledger',
                    comment: '打咩'
                }
            ]
        });

        expect(result).toEqual(expect.objectContaining({
            event_id: 'evt-bridge-gl-return-1',
            instance_code: 'FEISHU-INSTANCE-GL-RETURN',
            record_id: '273',
            node_id: config.FEISHU_NODE.generalLedger,
            action: 'RETURN',
            comment: '打咩'
        }));
    });

    it('normalizes a finance manager rollback timeline over a DONE task status', () => {
        const config = loadConfig();
        const result = normalizeFeishuEvent({
            header: {
                event_id: 'evt-bridge-fm-rollback-1',
                event_type: 'approval_task'
            },
            event: {
                instance_code: 'FEISHU-INSTANCE-FM-ROLLBACK',
                task_id: 'task-finance-manager',
                task_status: 'DONE',
                user: {
                    name: '财务经理',
                    user_id: 'ou_finance_manager'
                }
            }
        }, {
            status: 'PENDING',
            form: JSON.stringify([
                {
                    id: FEISHU_WIDGET.documentId,
                    value: '274'
                }
            ]),
            task_list: [
                {
                    id: 'task-finance-manager',
                    node_id: config.FEISHU_NODE.financeManager,
                    user_id: 'ou_finance_manager'
                }
            ],
            timeline: [
                {
                    action: 'ROLLBACK',
                    status: 'DONE',
                    task_id: 'task-finance-manager',
                    node_key: config.FEISHU_NODE.financeManager,
                    user_id: 'ou_finance_manager',
                    comment: 'dfdf'
                }
            ]
        });

        expect(result).toEqual(expect.objectContaining({
            event_id: 'evt-bridge-fm-rollback-1',
            instance_code: 'FEISHU-INSTANCE-FM-ROLLBACK',
            record_id: '274',
            node_id: config.FEISHU_NODE.financeManager,
            action: 'RETURN',
            comment: 'dfdf'
        }));
    });

    it('normalizes an approval instance event from the latest actionable timeline task', () => {
        const config = loadConfig();
        const result = normalizeFeishuEvent({
            header: {
                event_id: 'evt-bridge-fm-instance-1',
                event_type: 'approval_instance'
            },
            event: {
                type: 'approval_instance',
                instance_code: 'FEISHU-INSTANCE-FM',
                status: 'PENDING'
            }
        }, {
            status: 'PENDING',
            form: JSON.stringify([
                {
                    id: FEISHU_WIDGET.documentId,
                    value: 'PREPAY00271'
                },
                {
                    name: 'NS预付款申请单内部ID',
                    value: '271'
                }
            ]),
            task_list: [
                {
                    id: 'task-fm',
                    node_id: config.FEISHU_NODE.financeManager,
                    user_id: 'eg2b8f4d'
                },
                {
                    id: 'task-fd',
                    node_id: config.FEISHU_NODE.financeDirector,
                    status: 'PENDING',
                    user_id: 'ou_finance_director'
                }
            ],
            timeline: [
                {
                    type: 'PASS',
                    task_id: 'task-gl',
                    node_key: config.FEISHU_NODE.generalLedger,
                    user_id: 'eg2b8f4d',
                    comment: '1475'
                },
                {
                    type: 'PASS',
                    task_id: 'task-fm',
                    user_id: 'eg2b8f4d',
                    comment: 'popopo'
                },
                {
                    type: 'READ',
                    task_id: 'task-fd'
                }
            ]
        });

        expect(result).toEqual(expect.objectContaining({
            event_id: 'evt-bridge-fm-instance-1',
            instance_code: 'FEISHU-INSTANCE-FM',
            record_id: '271',
            node_id: config.FEISHU_NODE.financeManager,
            action: 'APPROVE',
            comment: 'popopo'
        }));
        expect(result.operator.user_id).toBe('eg2b8f4d');
    });

    it('extracts the NetSuite internal id from the configured record id widget even when Feishu form values have no name', () => {
        const result = normalizeFeishuEvent({
            header: {
                event_id: 'evt-bridge-record-id-widget-only'
            },
            event: {
                instance_code: 'FEISHU-INSTANCE-WIDGET-ID',
                task_id: 'task-gl',
                status: 'APPROVED'
            }
        }, {
            form: JSON.stringify([
                {
                    id: FEISHU_WIDGET.documentId,
                    value: 'PREPAY00286'
                },
                {
                    id: FEISHU_WIDGET.recordId,
                    value: '286'
                }
            ]),
            task_list: [
                {
                    id: 'task-gl',
                    node_key: loadConfig().FEISHU_NODE.generalLedger
                }
            ]
        });

        expect(result.record_id).toBe('286');
    });

    it('matches timeline comments by node when the callback has no task id', () => {
        const config = loadConfig();
        const result = normalizeFeishuEvent({
            header: {
                event_id: 'evt-bridge-fd-comment-by-node',
                event_type: 'approval_task'
            },
            event: {
                instance_code: 'FEISHU-INSTANCE-FD-COMMENT',
                node_id: config.FEISHU_NODE.financeDirector,
                status: 'APPROVED',
                user_id: 'eg2b8f4d'
            }
        }, {
            status: 'PENDING',
            form: JSON.stringify([
                {
                    id: FEISHU_WIDGET.recordId,
                    value: '289'
                }
            ]),
            timeline: [
                {
                    type: 'PASS',
                    node_key: config.FEISHU_NODE.generalLedger,
                    user_id: 'eg2b8f4d',
                    operate_time: '1780904919546334',
                    comment: '1'
                },
                {
                    type: 'PASS',
                    node_key: config.FEISHU_NODE.financeManager,
                    user_id: 'eg2b8f4d',
                    operate_time: '1780904920000000',
                    comment: '22'
                },
                {
                    type: 'PASS',
                    node_key: config.FEISHU_NODE.financeDirector,
                    node_name: '财务总监审批',
                    user_id: 'eg2b8f4d',
                    operate_time: '1780904930000000',
                    comment: '333'
                }
            ]
        });

        expect(result).toEqual(expect.objectContaining({
            event_id: 'evt-bridge-fd-comment-by-node',
            record_id: '289',
            node_id: config.FEISHU_NODE.financeDirector,
            node_name: '财务总监审批',
            action: 'APPROVE',
            comment: '333'
        }));
    });
});

describe('Feishu prepayment approval User Event demo', () => {
    const createRecordMock = ({ id = '1001', state, oldState, instanceCode = 'FEISHU-INSTANCE-001', type = 'edit' }) => ({
        newRecord: {
            id,
            getValue: jest.fn(({ fieldId }) => {
                if (fieldId === 'custrecord_swc_advancepay_state') return state;
                if (fieldId === 'custrecord_swc_feishu_instance_code') return instanceCode;
                if (fieldId === 'name') return 'PREPAY001';
                if (fieldId === 'custrecord_swc_advancepay_total_amount') return 100;
                if (fieldId === 'custrecord_swc_advancepay_memo') return 'memo';
                if (fieldId === 'custrecord_swc_advancepay_paydate') return new Date('2026-06-03T00:00:00+08:00');
                return '';
            })
        },
        oldRecord: {
            getValue: jest.fn(({ fieldId }) => {
                if (fieldId === 'custrecord_swc_advancepay_state') return oldState;
                if (fieldId === 'custrecord_swc_feishu_instance_code') return instanceCode;
                return '';
            })
        },
        type,
        UserEventType: {
            CREATE: 'create',
            EDIT: 'edit',
            XEDIT: 'xedit'
        }
    });

    const loadUserEvent = (overrides = {}) => {
        const config = loadConfig();
        const record = {
            submitFields: jest.fn(),
            load: jest.fn()
        };
        const runtime = {
            executionContext: 'USERINTERFACE',
            ContextType: {
                RESTLET: 'RESTLET'
            },
            getCurrentScript: jest.fn().mockReturnValue({
                getParameter: jest.fn(({ name }) => {
                    if (name === 'custscript_fs_demo_app_id') return 'app-id';
                    if (name === 'custscript_fs_demo_app_secret') return 'app-secret';
                    if (name === 'custscript_fs_demo_approval_code') return 'approval-code';
                    if (name === 'custscript_fs_demo_department_id') return 'od-default';
                    return '';
                })
            }),
            getCurrentUser: jest.fn().mockReturnValue({ id: '501' })
        };
        const search = {
            Type: {
                EMPLOYEE: 'employee',
                CURRENCY: 'currency'
            },
            createColumn: jest.fn((column) => column),
            lookupFields: jest.fn(),
            create: jest.fn().mockReturnValue({
                run: jest.fn().mockReturnValue({
                    each: jest.fn((callback) => {
                        callback({
                            getValue: jest.fn(({ name }) => {
                                if (name === 'custentity_feishu_user_id') return 'ou_creator';
                                if (name === 'custentity_feishu_open_department_id') return 'od-creator';
                                return '';
                            })
                        });
                        return true;
                    })
                })
            })
        };
        const log = {
            audit: jest.fn(),
            error: jest.fn()
        };
        const https = overrides.https || {
            post: jest.fn().mockReturnValue({ body: JSON.stringify({ code: 0, tenant_access_token: 'tenant-token' }) }),
            get: jest.fn()
        };

        const userEvent = loadSuiteScriptModule(
            'src/FileCabinet/SuiteScripts/SWC_PROJECT/UE/SWC_UE_FEISHU_PREPAY_APPROVAL_DEMO.js',
            {
                'N/https': https,
                'N/record': overrides.record || record,
                'N/runtime': overrides.runtime || runtime,
                'N/search': overrides.search || search,
                'N/log': overrides.log || log,
                '../common/SWC_Feishu_Approval_Demo_Config': config
            }
        );

        return {
            userEvent,
            config,
            https,
            record: overrides.record || record,
            runtime: overrides.runtime || runtime,
            search: overrides.search || search,
            log
        };
    };

    it('advances Feishu approval to finance manager when NS status moves from general ledger to finance manager', () => {
        const config = loadConfig();
        const https = {
            post: jest.fn()
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, tenant_access_token: 'tenant-token' }) })
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, data: {} }) }),
            get: jest.fn()
                .mockReturnValueOnce({
                    body: JSON.stringify({
                        code: 0,
                        data: {
                            form: '[]',
                            task_list: [
                                {
                                    id: 'task-gl',
                                    status: 'PENDING',
                                    node_id: config.FEISHU_NODE.generalLedger,
                                    user_id: 'ou_general_ledger'
                                }
                            ]
                        }
                    })
                })
                .mockReturnValueOnce({
                    body: JSON.stringify({
                        code: 0,
                        data: {
                            form: '[]',
                            task_list: [
                                {
                                    id: 'task-fm',
                                    status: 'PENDING',
                                    node_id: config.FEISHU_NODE.financeManager,
                                    user_id: 'ou_finance_manager'
                                }
                            ]
                        }
                    })
                })
        };
        const { userEvent, record } = loadUserEvent({ https });

        userEvent.afterSubmit(createRecordMock({
            oldState: config.STATUS.pendingGeneralLedger,
            state: config.STATUS.pendingFinanceManager
        }));

        expect(https.post).toHaveBeenNthCalledWith(2, expect.objectContaining({
            url: 'https://open.feishu.cn/open-apis/approval/v4/tasks/approve?user_id_type=user_id',
            body: expect.stringContaining('"task_id":"task-gl"')
        }));
        expect(JSON.parse(https.post.mock.calls[1][0].body)).toEqual(expect.objectContaining({
            approval_code: 'approval-code',
            instance_code: 'FEISHU-INSTANCE-001',
            user_id: 'ou_general_ledger',
            task_id: 'task-gl'
        }));
        expect(record.submitFields).toHaveBeenLastCalledWith(expect.objectContaining({
            values: {
                [config.FIELD.feishuSyncStatus]: config.SYNC_STATUS.success
            }
        }));
    });

    it('syncs Feishu approval for XEDIT status changes when the event record omits the instance code', () => {
        const config = loadConfig();
        const https = {
            post: jest.fn()
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, tenant_access_token: 'tenant-token' }) })
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, data: {} }) }),
            get: jest.fn()
                .mockReturnValueOnce({
                    body: JSON.stringify({
                        code: 0,
                        data: {
                            form: '[]',
                            task_list: [
                                {
                                    id: 'task-gl',
                                    status: 'PENDING',
                                    node_id: config.FEISHU_NODE.generalLedger,
                                    user_id: 'ou_general_ledger'
                                }
                            ]
                        }
                    })
                })
                .mockReturnValueOnce({
                    body: JSON.stringify({
                        code: 0,
                        data: {
                            form: '[]',
                            task_list: [
                                {
                                    id: 'task-fm',
                                    status: 'PENDING',
                                    node_id: config.FEISHU_NODE.financeManager,
                                    user_id: 'ou_finance_manager'
                                }
                            ]
                        }
                    })
                })
        };
        const search = {
            Type: {
                EMPLOYEE: 'employee',
                CURRENCY: 'currency'
            },
            createColumn: jest.fn((column) => column),
            lookupFields: jest.fn().mockReturnValue({
                [config.FIELD.state]: [{ value: config.STATUS.pendingFinanceManager }],
                [config.FIELD.feishuInstanceCode]: 'FEISHU-XEDIT-001'
            }),
            create: jest.fn().mockReturnValue({
                run: jest.fn().mockReturnValue({
                    each: jest.fn(() => true)
                })
            })
        };
        const { userEvent, record } = loadUserEvent({ https, search });

        userEvent.afterSubmit(createRecordMock({
            oldState: config.STATUS.pendingGeneralLedger,
            state: config.STATUS.pendingFinanceManager,
            instanceCode: '',
            type: 'xedit'
        }));

        expect(search.lookupFields).toHaveBeenCalledWith({
            type: config.RECORD_TYPE,
            id: '1001',
            columns: [
                config.FIELD.state,
                config.FIELD.feishuInstanceCode
            ]
        });
        expect(JSON.parse(https.post.mock.calls[1][0].body)).toEqual(expect.objectContaining({
            approval_code: 'approval-code',
            instance_code: 'FEISHU-XEDIT-001',
            task_id: 'task-gl'
        }));
        expect(record.submitFields).toHaveBeenLastCalledWith(expect.objectContaining({
            values: {
                [config.FIELD.feishuSyncStatus]: config.SYNC_STATUS.success
            }
        }));
    });

    it('stops at finance manager when NS status moves from department manager to finance manager', () => {
        const config = loadConfig();
        const https = {
            post: jest.fn()
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, tenant_access_token: 'tenant-token' }) })
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, data: {} }) })
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, data: {} }) }),
            get: jest.fn()
                .mockReturnValueOnce({
                    body: JSON.stringify({
                        code: 0,
                        data: {
                            form: '[]',
                            task_list: [
                                {
                                    id: 'task-dm',
                                    status: 'PENDING',
                                    node_id: config.FEISHU_NODE.departmentManager,
                                    user_id: 'ou_department_manager'
                                }
                            ]
                        }
                    })
                })
                .mockReturnValueOnce({
                    body: JSON.stringify({
                        code: 0,
                        data: {
                            form: '[]',
                            task_list: [
                                {
                                    id: 'task-gl',
                                    status: 'PENDING',
                                    node_id: config.FEISHU_NODE.generalLedger,
                                    user_id: 'ou_general_ledger'
                                }
                            ]
                        }
                    })
                })
                .mockReturnValueOnce({
                    body: JSON.stringify({
                        code: 0,
                        data: {
                            form: '[]',
                            task_list: [
                                {
                                    id: 'task-fm',
                                    status: 'PENDING',
                                    node_id: config.FEISHU_NODE.financeManager,
                                    user_id: 'ou_finance_manager'
                                }
                            ]
                        }
                    })
                })
        };
        const { userEvent, record } = loadUserEvent({ https });

        userEvent.afterSubmit(createRecordMock({
            oldState: config.STATUS.pendingDepartmentManager,
            state: config.STATUS.pendingFinanceManager
        }));

        expect(https.post).toHaveBeenCalledTimes(3);
        expect(JSON.parse(https.post.mock.calls[1][0].body)).toEqual(expect.objectContaining({
            task_id: 'task-dm'
        }));
        expect(JSON.parse(https.post.mock.calls[2][0].body)).toEqual(expect.objectContaining({
            task_id: 'task-gl'
        }));
        expect(record.submitFields).toHaveBeenLastCalledWith(expect.objectContaining({
            values: {
                [config.FIELD.feishuSyncStatus]: config.SYNC_STATUS.success
            }
        }));
    });

    it('does not approve nodes after finance manager when the target node is skipped by Feishu', () => {
        const config = loadConfig();
        const https = {
            post: jest.fn()
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, tenant_access_token: 'tenant-token' }) })
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, data: {} }) })
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, data: {} }) }),
            get: jest.fn()
                .mockReturnValueOnce({
                    body: JSON.stringify({
                        code: 0,
                        data: {
                            form: '[]',
                            task_list: [
                                {
                                    id: 'task-dm',
                                    status: 'PENDING',
                                    node_id: config.FEISHU_NODE.departmentManager,
                                    user_id: 'ou_department_manager'
                                }
                            ]
                        }
                    })
                })
                .mockReturnValueOnce({
                    body: JSON.stringify({
                        code: 0,
                        data: {
                            form: '[]',
                            task_list: [
                                {
                                    id: 'task-gl',
                                    status: 'PENDING',
                                    node_id: config.FEISHU_NODE.generalLedger,
                                    user_id: 'ou_general_ledger'
                                }
                            ]
                        }
                    })
                })
                .mockReturnValueOnce({
                    body: JSON.stringify({
                        code: 0,
                        data: {
                            form: '[]',
                            task_list: [
                                {
                                    id: 'task-fd',
                                    status: 'PENDING',
                                    node_id: config.FEISHU_NODE.financeDirector,
                                    user_id: 'ou_finance_director'
                                }
                            ]
                        }
                    })
                })
        };
        const log = {
            audit: jest.fn(),
            error: jest.fn()
        };
        const { userEvent, record } = loadUserEvent({ https, log });

        userEvent.afterSubmit(createRecordMock({
            oldState: config.STATUS.pendingDepartmentManager,
            state: config.STATUS.pendingFinanceManager
        }));

        expect(https.post).toHaveBeenCalledTimes(3);
        expect(JSON.parse(https.post.mock.calls[1][0].body)).toEqual(expect.objectContaining({
            task_id: 'task-dm'
        }));
        expect(JSON.parse(https.post.mock.calls[2][0].body)).toEqual(expect.objectContaining({
            task_id: 'task-gl'
        }));
        expect(https.post.mock.calls.map((call) => call[0].body).join('\n')).not.toContain('task-fd');
        expect(log.error).toHaveBeenCalledWith(
            '预付款申请飞书审批节点同步失败',
            expect.objectContaining({
                message: expect.stringContaining('停止自动同意')
            })
        );
        expect(record.submitFields).toHaveBeenLastCalledWith(expect.objectContaining({
            values: {
                [config.FIELD.feishuSyncStatus]: config.SYNC_STATUS.failed
            }
        }));
    });

    it('rolls Feishu approval back to finance manager when NS status moves from finance director to finance manager', () => {
        const config = loadConfig();
        const https = {
            post: jest.fn()
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, tenant_access_token: 'tenant-token' }) })
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, data: {} }) }),
            get: jest.fn().mockReturnValue({
                body: JSON.stringify({
                    code: 0,
                    data: {
                        task_list: [
                            {
                                id: 'task-fm-approved',
                                status: 'APPROVED',
                                node_id: config.FEISHU_NODE.financeManager,
                                user_id: 'ou_finance_manager'
                            },
                            {
                                id: 'task-fd',
                                status: 'PENDING',
                                node_id: config.FEISHU_NODE.financeDirector,
                                user_id: 'ou_finance_director'
                            }
                        ],
                        timeline: [
                            {
                                task_id: 'task-fm-approved',
                                status: 'PASS',
                                node_key: 'finance-manager-node-key'
                            }
                        ]
                    }
                })
            })
        };
        const { userEvent, record } = loadUserEvent({ https });

        userEvent.afterSubmit(createRecordMock({
            oldState: config.STATUS.pendingFinanceDirector,
            state: config.STATUS.pendingFinanceManager
        }));

        expect(https.post).toHaveBeenNthCalledWith(2, expect.objectContaining({
            url: 'https://open.feishu.cn/open-apis/approval/v4/instances/specified_rollback?user_id_type=user_id'
        }));
        expect(JSON.parse(https.post.mock.calls[1][0].body)).toEqual(expect.objectContaining({
            user_id: 'ou_finance_director',
            task_id: 'task-fd',
            task_def_key_list: ['finance-manager-node-key']
        }));
        expect(record.submitFields).toHaveBeenLastCalledWith(expect.objectContaining({
            values: {
                [config.FIELD.feishuSyncStatus]: config.SYNC_STATUS.success
            }
        }));
    });

    it('does not sync back to Feishu when the NS status change is submitted by the Feishu RESTlet', () => {
        const config = loadConfig();
        const runtime = {
            executionContext: 'RESTLET',
            ContextType: {
                RESTLET: 'RESTLET'
            },
            getCurrentScript: jest.fn(),
            getCurrentUser: jest.fn()
        };
        const { userEvent, https, record } = loadUserEvent({ runtime });

        userEvent.afterSubmit(createRecordMock({
            oldState: config.STATUS.pendingGeneralLedger,
            state: config.STATUS.pendingFinanceManager
        }));

        expect(https.post).not.toHaveBeenCalled();
        expect(https.get).not.toHaveBeenCalled();
        expect(record.submitFields).not.toHaveBeenCalled();
    });

    it('creates a new Feishu approval instance with current approval definition widget ids when a returned prepayment is submitted again', () => {
        const config = loadConfig();
        const https = {
            post: jest.fn()
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, tenant_access_token: 'tenant-token' }) })
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, data: { instance_code: 'FEISHU-INSTANCE-NEW' } }) }),
            get: jest.fn().mockReturnValue({
                body: JSON.stringify({
                    code: 0,
                    data: {
                        form: JSON.stringify([
                            {
                                id: 'widget-current-tran-id',
                                type: 'input',
                                name: '单据号'
                            },
                            {
                                id: 'widget-current-record-id',
                                type: 'input',
                                name: 'NS预付款申请单内部ID'
                            }
                        ])
                    }
                })
            })
        };
        const { userEvent, record } = loadUserEvent({ https });

        userEvent.afterSubmit(createRecordMock({
            oldState: config.STATUS.returned,
            state: config.START_APPROVAL_STATUS,
            instanceCode: 'FEISHU-INSTANCE-OLD'
        }));

        expect(https.get).toHaveBeenCalledWith(expect.objectContaining({
            url: 'https://open.feishu.cn/open-apis/approval/v4/approvals/approval-code'
        }));
        expect(https.post).toHaveBeenNthCalledWith(2, expect.objectContaining({
            url: 'https://open.feishu.cn/open-apis/approval/v4/instances?user_id_type=user_id'
        }));
        const createPayload = JSON.parse(https.post.mock.calls[1][0].body);
        const createForm = JSON.parse(createPayload.form);

        expect(createPayload).toEqual(expect.objectContaining({
            approval_code: 'approval-code',
            user_id: 'ou_creator'
        }));
        expect(createForm).toEqual([
            {
                id: 'widget-current-tran-id',
                type: 'input',
                value: 'PREPAY001'
            },
            {
                id: 'widget-current-record-id',
                type: 'input',
                value: '1001'
            }
        ]);
        expect(createPayload.form).not.toContain('widget17803989748480001');
        expect(record.submitFields).toHaveBeenLastCalledWith(expect.objectContaining({
            type: config.RECORD_TYPE,
            id: '1001',
            values: {
                [config.FIELD.feishuInstanceCode]: 'FEISHU-INSTANCE-NEW',
                [config.FIELD.feishuLastEventId]: '',
                [config.FIELD.feishuSyncStatus]: config.SYNC_STATUS.success
            }
        }));
    });

    it('creates a fresh Feishu approval when a copied prepayment carries old Feishu fields', () => {
        const config = loadConfig();
        const https = {
            post: jest.fn()
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, tenant_access_token: 'tenant-token' }) })
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, data: { instance_code: 'FEISHU-INSTANCE-COPIED-NEW' } }) }),
            get: jest.fn().mockReturnValue({
                body: JSON.stringify({
                    code: 0,
                    data: {
                        form: JSON.stringify([
                            {
                                id: 'widget-current-tran-id',
                                type: 'input',
                                name: '单据号'
                            },
                            {
                                id: 'widget-current-record-id',
                                type: 'input',
                                name: 'NS预付款申请单内部ID'
                            }
                        ])
                    }
                })
            })
        };
        const { userEvent, record } = loadUserEvent({ https });

        userEvent.afterSubmit(createRecordMock({
            id: '2002',
            oldState: null,
            state: config.START_APPROVAL_STATUS,
            instanceCode: 'FEISHU-INSTANCE-COPIED-OLD',
            type: 'create'
        }));

        expect(https.post).toHaveBeenNthCalledWith(2, expect.objectContaining({
            url: 'https://open.feishu.cn/open-apis/approval/v4/instances?user_id_type=user_id'
        }));
        expect(record.submitFields).toHaveBeenNthCalledWith(1, expect.objectContaining({
            type: config.RECORD_TYPE,
            id: '2002',
            values: {
                [config.FIELD.feishuInstanceCode]: '',
                [config.FIELD.feishuLastEventId]: '',
                [config.FIELD.feishuSyncStatus]: config.SYNC_STATUS.pending
            }
        }));
        expect(record.submitFields).toHaveBeenLastCalledWith(expect.objectContaining({
            type: config.RECORD_TYPE,
            id: '2002',
            values: {
                [config.FIELD.feishuInstanceCode]: 'FEISHU-INSTANCE-COPIED-NEW',
                [config.FIELD.feishuLastEventId]: '',
                [config.FIELD.feishuSyncStatus]: config.SYNC_STATUS.success
            }
        }));
    });

    it('stops before creating a Feishu approval instance when the approval definition has no parsed controls', () => {
        const config = loadConfig();
        const https = {
            post: jest.fn()
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, tenant_access_token: 'tenant-token' }) }),
            get: jest.fn().mockReturnValue({
                body: JSON.stringify({
                    code: 0,
                    data: {
                        approval_name: '预付款审批'
                    }
                })
            })
        };
        const { userEvent, record, log } = loadUserEvent({ https });

        userEvent.afterSubmit(createRecordMock({
            oldState: config.STATUS.returned,
            state: config.START_APPROVAL_STATUS,
            instanceCode: 'FEISHU-INSTANCE-OLD'
        }));

        expect(https.post).toHaveBeenCalledTimes(1);
        expect(https.post.mock.calls[0][0].url).toBe('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal');
        expect(record.submitFields).toHaveBeenLastCalledWith(expect.objectContaining({
            type: config.RECORD_TYPE,
            id: '1001',
            values: {
                [config.FIELD.feishuSyncStatus]: config.SYNC_STATUS.failed
            }
        }));
        expect(log.error).toHaveBeenCalledWith(
            '预付款申请飞书审批创建失败',
            expect.objectContaining({
                message: expect.stringContaining('未解析到表单控件')
            })
        );
    });
});

describe('Feishu prepayment approval callback RESTlet demo', () => {
    const loadRestlet = (overrides = {}) => {
        const config = loadConfig();
        const commentRecord = {
            setValue: jest.fn(),
            save: jest.fn().mockReturnValue('9001')
        };
        const savedFields = {
            tranId: '1001',
            state: config.STATUS.submitted,
            lastEventId: ''
        };
        const record = {
            create: jest.fn().mockReturnValue(commentRecord),
            submitFields: jest.fn(({ values }) => {
                if (values && Object.prototype.hasOwnProperty.call(values, config.FIELD.state)) {
                    savedFields.state = values[config.FIELD.state];
                }

                if (values && Object.prototype.hasOwnProperty.call(values, config.FIELD.feishuLastEventId)) {
                    savedFields.lastEventId = values[config.FIELD.feishuLastEventId];
                }
            })
        };
        const search = {
            Type: {
                EMPLOYEE: 'employee'
            },
            createColumn: jest.fn((column) => column),
            lookupFields: jest.fn().mockImplementation(() => ({
                [config.FIELD.tranId]: savedFields.tranId,
                [config.FIELD.state]: [{ value: savedFields.state }],
                [config.FIELD.feishuLastEventId]: savedFields.lastEventId
            })),
            create: jest.fn(({ type }) => {
                if (type === 'employee') {
                    return {
                        run: jest.fn().mockReturnValue({
                            each: jest.fn((callback) => {
                                callback({
                                    getValue: jest.fn(({ name }) => {
                                        if (name === 'internalid') return '501';
                                        if (name === 'entityid') return 'EMP001';
                                        return '';
                                    })
                                });
                                return true;
                            })
                        })
                    };
                }

                return {
                    run: jest.fn().mockReturnValue({
                        each: jest.fn((callback) => {
                            callback({
                                getValue: jest.fn(({ name }) => {
                                    if (name === 'internalid') return '1001';
                                    if (name === config.FIELD.tranId) return 'PREPAY001';
                                    if (name === config.FIELD.state) return savedFields.state;
                                    if (name === config.FIELD.feishuLastEventId) return savedFields.lastEventId;
                                    return '';
                                })
                            });
                            return true;
                        })
                    })
                };
            })
        };
        const log = {
            audit: jest.fn(),
            error: jest.fn()
        };
        const https = {
            post: jest.fn(),
            get: jest.fn()
        };
        const runtime = {
            getCurrentScript: jest.fn().mockReturnValue({
                getParameter: jest.fn(({ name }) => {
                    if (name === 'custscript_fs_demo_app_id') return 'cli_aa9d2362783b5bd6';
                    if (name === 'custscript_fs_demo_app_secret') return 'app-secret';
                    return '';
                })
            })
        };

        const restlet = loadSuiteScriptModule(
            'src/FileCabinet/SuiteScripts/SWC_PROJECT/RL/SWC_RL_FEISHU_PREPAY_CALLBACK_DEMO.js',
            {
                'N/https': overrides.https || https,
                'N/record': overrides.record || record,
                'N/runtime': overrides.runtime || runtime,
                'N/search': overrides.search || search,
                'N/log': overrides.log || log,
                '../common/SWC_Feishu_Approval_Demo_Config': config
            }
        );

        return {
            restlet,
            config,
            https: overrides.https || https,
            record: overrides.record || record,
            runtime: overrides.runtime || runtime,
            search: overrides.search || search,
            commentRecord,
            log: overrides.log || log
        };
    };

    it('creates an approval comment and updates prepayment status for an approval callback', () => {
        const { restlet, config, record, commentRecord } = loadRestlet();

        const result = restlet.post({
            event_id: 'evt-approve-1',
            record_id: '1001',
            instance_code: 'FEISHU-INSTANCE-001',
            node_id: config.FEISHU_NODE.departmentManager,
            action: 'APPROVE',
            operator: {
                name: '张三',
                user_id: 'ou_demo_user'
            },
            comment: '同意预付款申请'
        });

        expect(result.success).toBe(true);
        expect(record.create).toHaveBeenCalledWith({
            type: 'customrecord_swc_approval_comments_lib',
            isDynamic: true
        });
        expect(commentRecord.setValue).toHaveBeenCalledWith(expect.objectContaining({
            fieldId: 'custrecord_swc_approval_comments_content',
            value: '[部门经理通过]：同意预付款申请'
        }));
        expect(commentRecord.setValue).toHaveBeenCalledWith({
            fieldId: 'custrecord_swc_approval_comments_prepay',
            value: '1001'
        });
        expect(commentRecord.setValue).toHaveBeenCalledWith({
            fieldId: 'owner',
            value: '501'
        });
        expect(record.submitFields).toHaveBeenCalledWith({
            type: config.RECORD_TYPE,
            id: '1001',
            values: {
                [config.FIELD.state]: config.STATUS.pendingGeneralLedger,
                [config.FIELD.feishuLastEventId]: 'evt-approve-1'
            },
            options: {
                enableSourcing: true,
                ignoreMandatoryFields: true
            }
        });
    });

    it('ignores duplicate Feishu event ids', () => {
        const config = loadConfig();
        const search = {
            Type: {
                EMPLOYEE: 'employee'
            },
            lookupFields: jest.fn().mockReturnValue({
                [config.FIELD.tranId]: '1001',
                [config.FIELD.state]: [{ value: config.STATUS.submitted }],
                [config.FIELD.feishuLastEventId]: 'evt-duplicate'
            })
        };
        const record = {
            create: jest.fn(),
            submitFields: jest.fn()
        };
        const { restlet } = loadRestlet({ search, record });

        const result = restlet.post({
            event_id: 'evt-duplicate',
            record_id: '1001',
            node_id: config.FEISHU_NODE.financeManager,
            action: 'APPROVE'
        });

        expect(result.success).toBe(true);
        expect(result.duplicate).toBe(true);
        expect(record.create).not.toHaveBeenCalled();
        expect(record.submitFields).not.toHaveBeenCalled();
    });

    it('repairs status for a duplicate event when the prior writeback did not apply', () => {
        const config = loadConfig();
        const savedFields = {
            state: config.STATUS.pendingDepartmentManager,
            lastEventId: 'evt-duplicate-unapplied'
        };
        const commentRecord = {
            setValue: jest.fn(),
            save: jest.fn().mockReturnValue('9007')
        };
        const record = {
            create: jest.fn().mockReturnValue(commentRecord),
            submitFields: jest.fn(({ values }) => {
                if (values && Object.prototype.hasOwnProperty.call(values, config.FIELD.state)) {
                    savedFields.state = values[config.FIELD.state];
                }

                if (values && Object.prototype.hasOwnProperty.call(values, config.FIELD.feishuLastEventId)) {
                    savedFields.lastEventId = values[config.FIELD.feishuLastEventId];
                }
            })
        };
        const search = {
            Type: {
                EMPLOYEE: 'employee'
            },
            lookupFields: jest.fn().mockImplementation(() => ({
                [config.FIELD.tranId]: '1001',
                [config.FIELD.state]: [{ value: savedFields.state }],
                [config.FIELD.feishuLastEventId]: savedFields.lastEventId
            })),
            createColumn: jest.fn((column) => column),
            create: jest.fn().mockReturnValue({
                run: jest.fn().mockReturnValue({
                    each: jest.fn(() => true)
                })
            })
        };
        const { restlet } = loadRestlet({ search, record });

        const result = restlet.post({
            event_id: 'evt-duplicate-unapplied',
            record_id: '1001',
            instance_code: 'FEISHU-INSTANCE-DUP-FIX',
            node_id: config.FEISHU_NODE.departmentManager,
            action: 'APPROVE',
            comment: '同意'
        });

        expect(result.success).toBe(true);
        expect(result.duplicate).toBeUndefined();
        expect(record.create).not.toHaveBeenCalled();
        expect(record.submitFields).toHaveBeenCalledWith(expect.objectContaining({
            values: expect.objectContaining({
                [config.FIELD.state]: config.STATUS.pendingGeneralLedger,
                [config.FIELD.feishuLastEventId]: 'evt-duplicate-unapplied'
            })
        }));
    });

    it('ignores stale replayed approval events when NetSuite has already advanced past that node', () => {
        const config = loadConfig();
        const record = {
            create: jest.fn(),
            submitFields: jest.fn()
        };
        const search = {
            Type: {
                EMPLOYEE: 'employee'
            },
            lookupFields: jest.fn().mockReturnValue({
                [config.FIELD.tranId]: 'PREPAY00289',
                [config.FIELD.state]: [{ value: config.STATUS.pendingGeneralLedger }],
                [config.FIELD.feishuLastEventId]: ''
            }),
            createColumn: jest.fn((column) => column),
            create: jest.fn().mockReturnValue({
                run: jest.fn().mockReturnValue({
                    each: jest.fn(() => true)
                })
            })
        };
        const { restlet } = loadRestlet({ search, record });

        const result = restlet.post({
            event_id: 'poll-replay-dept-manager',
            record_id: '289',
            instance_code: 'FEISHU-INSTANCE-REPLAY',
            node_id: config.FEISHU_NODE.departmentManager,
            action: 'APPROVE',
            comment: '11'
        });

        expect(result.success).toBe(true);
        expect(result.stale).toBe(true);
        expect(result.ignored).toBe(true);
        expect(record.create).not.toHaveBeenCalled();
        expect(record.submitFields).not.toHaveBeenCalled();
    });

    it('fails when status writeback does not persist after submitFields', () => {
        const config = loadConfig();
        const commentRecord = {
            setValue: jest.fn(),
            save: jest.fn().mockReturnValue('9008')
        };
        const record = {
            create: jest.fn().mockReturnValue(commentRecord),
            submitFields: jest.fn()
        };
        const search = {
            Type: {
                EMPLOYEE: 'employee'
            },
            lookupFields: jest.fn().mockReturnValue({
                [config.FIELD.tranId]: '1001',
                [config.FIELD.state]: [{ value: config.STATUS.pendingDepartmentManager }],
                [config.FIELD.feishuLastEventId]: ''
            }),
            createColumn: jest.fn((column) => column),
            create: jest.fn().mockReturnValue({
                run: jest.fn().mockReturnValue({
                    each: jest.fn(() => true)
                })
            })
        };
        const { restlet } = loadRestlet({ search, record });

        const result = restlet.post({
            event_id: 'evt-status-not-applied',
            record_id: '1001',
            instance_code: 'FEISHU-INSTANCE-NOT-APPLIED',
            node_id: config.FEISHU_NODE.departmentManager,
            action: 'APPROVE'
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain('预付款审批状态写入未生效');
        expect(record.submitFields).toHaveBeenCalledTimes(6);
    });

    it('looks up prepayment by Feishu instance code before document number when record_id is not an internal id', () => {
        const config = loadConfig();
        const commentRecord = {
            setValue: jest.fn(),
            save: jest.fn().mockReturnValue('9002')
        };
        const record = {
            create: jest.fn().mockReturnValue(commentRecord),
            submitFields: jest.fn()
        };
        const search = {
            Type: {
                EMPLOYEE: 'employee'
            },
            createColumn: jest.fn((column) => column),
            create: jest.fn(({ type }) => {
                if (type === 'employee') {
                    return {
                        run: jest.fn().mockReturnValue({
                            each: jest.fn((callback) => {
                                callback({
                                    getValue: jest.fn(({ name }) => {
                                        if (name === 'internalid') return '502';
                                        if (name === 'entityid') return 'EMP002';
                                        return '';
                                    })
                                });
                                return true;
                            })
                        })
                    };
                }

                return {
                    run: jest.fn().mockReturnValue({
                        each: jest.fn((callback) => {
                            callback({
                                getValue: jest.fn(({ name }) => {
                                    if (name === 'internalid') return '1001';
                                    if (name === config.FIELD.tranId) return 'PREPAY00233';
                                    if (name === config.FIELD.state) return config.STATUS.pendingDepartmentManager;
                                    if (name === config.FIELD.feishuLastEventId) return '';
                                    return '';
                                })
                            });
                            return true;
                        })
                    })
                };
            }),
            lookupFields: jest.fn()
        };
        const { restlet } = loadRestlet({ search, record });

        const result = restlet.post({
            event_id: 'evt-prepay-no-1',
            record_id: 'PREPAY00233',
            instance_code: 'FEISHU-INSTANCE-002',
            node_id: config.FEISHU_NODE.departmentManager,
            action: 'APPROVE',
            operator: {
                name: '李星月',
                user_id: 'ou_demo_user'
            },
            comment: '同意'
        });

        expect(result.success).toBe(true);
        expect(result.data.ns_record_id).toBe('1001');
        expect(search.create).toHaveBeenCalledWith(expect.objectContaining({
            type: config.RECORD_TYPE,
            filters: [[config.FIELD.feishuInstanceCode, 'is', 'FEISHU-INSTANCE-002']]
        }));
        expect(record.submitFields).toHaveBeenCalledWith(expect.objectContaining({
            type: config.RECORD_TYPE,
            id: '1001',
            values: expect.objectContaining({
                [config.FIELD.state]: config.STATUS.pendingGeneralLedger
            })
        }));
        expect(commentRecord.setValue).toHaveBeenCalledWith({
            fieldId: 'custrecord_swc_approval_comments_prepay',
            value: '1001'
        });
        expect(commentRecord.setValue).toHaveBeenCalledWith({
            fieldId: 'owner',
            value: '502'
        });
    });

    it('falls back to document number lookup when record_id is not an internal id and instance code is missing', () => {
        const config = loadConfig();
        const commentRecord = {
            setValue: jest.fn(),
            save: jest.fn().mockReturnValue('9005')
        };
        const record = {
            create: jest.fn().mockReturnValue(commentRecord),
            submitFields: jest.fn()
        };
        const search = {
            Type: {
                EMPLOYEE: 'employee'
            },
            createColumn: jest.fn((column) => column),
            create: jest.fn(({ type }) => {
                if (type === 'employee') {
                    return {
                        run: jest.fn().mockReturnValue({
                            each: jest.fn(() => true)
                        })
                    };
                }

                return {
                    run: jest.fn().mockReturnValue({
                        each: jest.fn((callback) => {
                            callback({
                                getValue: jest.fn(({ name }) => {
                                    if (name === 'internalid') return '1001';
                                    if (name === config.FIELD.tranId) return 'PREPAY00233';
                                    if (name === config.FIELD.state) return config.STATUS.pendingDepartmentManager;
                                    if (name === config.FIELD.feishuLastEventId) return '';
                                    return '';
                                })
                            });
                            return true;
                        })
                    })
                };
            }),
            lookupFields: jest.fn()
        };
        const { restlet } = loadRestlet({ search, record });

        const result = restlet.post({
            event_id: 'evt-prepay-no-no-instance',
            record_id: 'PREPAY00233',
            node_id: config.FEISHU_NODE.departmentManager,
            action: 'APPROVE'
        });

        expect(result.success).toBe(true);
        expect(result.data.ns_record_id).toBe('1001');
        expect(search.create).toHaveBeenCalledWith(expect.objectContaining({
            type: config.RECORD_TYPE,
            filters: [[config.FIELD.tranId, 'is', 'PREPAY00233']]
        }));
    });

    it('normalizes Feishu node id from a task list when callback event only has task_id', () => {
        const { restlet, config, record, commentRecord } = loadRestlet();

        const result = restlet.post({
            event_id: 'evt-task-list-1',
            event: {
                instance_code: 'FEISHU-INSTANCE-003',
                record_id: '1001',
                task_id: 'task-001',
                task_result: 'APPROVED',
                user: {
                    name: '李星月',
                    user_id: 'ou_demo_user'
                }
            },
            task_list: [
                {
                    id: 'task-001',
                    node_id: config.FEISHU_NODE.departmentManager
                }
            ]
        });

        expect(result.success).toBe(true);
        expect(result.data.node_id).toBe(config.FEISHU_NODE.departmentManager);
        expect(record.submitFields).toHaveBeenCalledWith(expect.objectContaining({
            values: expect.objectContaining({
                [config.FIELD.state]: config.STATUS.pendingGeneralLedger
            })
        }));
        expect(commentRecord.setValue).toHaveBeenCalledWith(expect.objectContaining({
            fieldId: 'custrecord_swc_approval_comments_content',
            value: '[部门经理通过]：无审批意见'
        }));
    });

    it('advances NetSuite from general ledger to finance manager for a Chinese approved callback', () => {
        const { restlet, config, record, commentRecord } = loadRestlet();

        const result = restlet.post({
            event_id: 'evt-gl-agree-cn-1',
            event_type: 'approval_task',
            event: {
                instance_code: 'FEISHU-INSTANCE-GL-AGREE-CN',
                record_id: '1001',
                task_id: 'task-general-ledger',
                task_result: '已同意',
                user: {
                    name: '李星月',
                    user_id: 'ou_demo_user'
                }
            },
            task_list: [
                {
                    id: 'task-general-ledger',
                    node_id: config.FEISHU_NODE.generalLedger
                }
            ]
        });

        expect(result.success).toBe(true);
        expect(result.data.action).toBe(config.ACTION.approve);
        expect(result.data.target_status).toBe(config.STATUS.pendingFinanceManager);
        expect(result.data.target_status_text).toBe(config.STATUS_TEXT.pendingFinanceManager);
        expect(commentRecord.setValue).toHaveBeenCalledWith(expect.objectContaining({
            fieldId: 'custrecord_swc_approval_comments_content',
            value: '[总账审批通过]：无审批意见'
        }));
        expect(record.submitFields).toHaveBeenCalledWith(expect.objectContaining({
            values: expect.objectContaining({
                [config.FIELD.state]: config.STATUS.pendingFinanceManager,
                [config.FIELD.feishuLastEventId]: 'evt-gl-agree-cn-1'
            })
        }));
    });

    it('advances NetSuite from general ledger when Feishu sends a runtime APPROVAL node id', () => {
        const config = loadConfig();
        const savedFields = {
            state: config.STATUS.pendingGeneralLedger,
            lastEventId: ''
        };
        const commentRecord = {
            setValue: jest.fn(),
            save: jest.fn().mockReturnValue('9006')
        };
        const record = {
            create: jest.fn().mockReturnValue(commentRecord),
            submitFields: jest.fn(({ values }) => {
                if (values && Object.prototype.hasOwnProperty.call(values, config.FIELD.state)) {
                    savedFields.state = values[config.FIELD.state];
                }

                if (values && Object.prototype.hasOwnProperty.call(values, config.FIELD.feishuLastEventId)) {
                    savedFields.lastEventId = values[config.FIELD.feishuLastEventId];
                }
            })
        };
        const search = {
            Type: {
                EMPLOYEE: 'employee'
            },
            createColumn: jest.fn((column) => column),
            lookupFields: jest.fn().mockImplementation(() => ({
                [config.FIELD.tranId]: '1001',
                [config.FIELD.state]: [{ value: savedFields.state }],
                [config.FIELD.feishuLastEventId]: savedFields.lastEventId
            })),
            create: jest.fn(({ type }) => {
                if (type === 'employee') {
                    return {
                        run: jest.fn().mockReturnValue({
                            each: jest.fn((callback) => {
                                callback({
                                    getValue: jest.fn(({ name }) => {
                                        if (name === 'internalid') return '501';
                                        if (name === 'entityid') return 'EMP001';
                                        return '';
                                    })
                                });
                                return true;
                            })
                        })
                    };
                }

                return {
                    run: jest.fn().mockReturnValue({
                        each: jest.fn((callback) => {
                            callback({
                                getValue: jest.fn(({ name }) => {
                                    if (name === 'internalid') return '1001';
                                    if (name === config.FIELD.tranId) return 'PREPAY001';
                                    if (name === config.FIELD.state) return savedFields.state;
                                    if (name === config.FIELD.feishuLastEventId) return savedFields.lastEventId;
                                    return '';
                                })
                            });
                            return true;
                        })
                    })
                };
            })
        };
        const { restlet } = loadRestlet({ search, record });

        const result = restlet.post({
            event_id: 'evt-gl-runtime-node-1',
            record_id: '1001',
            instance_code: 'FEISHU-INSTANCE-GL-RUNTIME',
            node_id: 'APPROVAL_782493_4614729',
            action: 'APPROVE',
            operator: {
                name: '李星月',
                user_id: 'ou_demo_user'
            },
            comment: '同意'
        });

        expect(result.success).toBe(true);
        expect(result.data.raw_node_id).toBe('APPROVAL_782493_4614729');
        expect(result.data.node_id).toBe(config.FEISHU_NODE.generalLedger);
        expect(result.data.node_name).toBe('总账审批');
        expect(result.data.target_status).toBe(config.STATUS.pendingFinanceManager);
        expect(result.data.target_status_text).toBe(config.STATUS_TEXT.pendingFinanceManager);
        expect(commentRecord.setValue).toHaveBeenCalledWith(expect.objectContaining({
            fieldId: 'custrecord_swc_approval_comments_content',
            value: '[总账审批通过]：同意'
        }));
        expect(record.submitFields).toHaveBeenCalledWith(expect.objectContaining({
            type: config.RECORD_TYPE,
            id: '1001',
            values: expect.objectContaining({
                [config.FIELD.state]: config.STATUS.pendingFinanceManager,
                [config.FIELD.feishuLastEventId]: 'evt-gl-runtime-node-1'
            })
        }));
    });

    it('advances NetSuite from general ledger when Feishu sends def_key as a runtime APPROVAL node id', () => {
        const config = loadConfig();
        const savedFields = {
            state: config.STATUS.pendingGeneralLedger,
            lastEventId: ''
        };
        const commentRecord = {
            setValue: jest.fn(),
            save: jest.fn().mockReturnValue('9009')
        };
        const record = {
            create: jest.fn().mockReturnValue(commentRecord),
            submitFields: jest.fn(({ values }) => {
                if (values && Object.prototype.hasOwnProperty.call(values, config.FIELD.state)) {
                    savedFields.state = values[config.FIELD.state];
                }

                if (values && Object.prototype.hasOwnProperty.call(values, config.FIELD.feishuLastEventId)) {
                    savedFields.lastEventId = values[config.FIELD.feishuLastEventId];
                }
            })
        };
        const search = {
            Type: {
                EMPLOYEE: 'employee'
            },
            createColumn: jest.fn((column) => column),
            lookupFields: jest.fn().mockImplementation(() => ({
                [config.FIELD.tranId]: '1001',
                [config.FIELD.state]: [{ value: savedFields.state }],
                [config.FIELD.feishuLastEventId]: savedFields.lastEventId
            })),
            create: jest.fn(({ type }) => {
                if (type === 'employee') {
                    return {
                        run: jest.fn().mockReturnValue({
                            each: jest.fn((callback) => {
                                callback({
                                    getValue: jest.fn(({ name }) => {
                                        if (name === 'internalid') return '501';
                                        if (name === 'entityid') return 'EMP001';
                                        return '';
                                    })
                                });
                                return true;
                            })
                        })
                    };
                }

                return {
                    run: jest.fn().mockReturnValue({
                        each: jest.fn((callback) => {
                            callback({
                                getValue: jest.fn(({ name }) => {
                                    if (name === 'internalid') return '1001';
                                    if (name === config.FIELD.tranId) return 'PREPAY001';
                                    if (name === config.FIELD.state) return savedFields.state;
                                    if (name === config.FIELD.feishuLastEventId) return savedFields.lastEventId;
                                    return '';
                                })
                            });
                            return true;
                        })
                    })
                };
            })
        };
        const { restlet } = loadRestlet({ search, record });

        const result = restlet.post({
            uuid: 'f476f0854058a033f4052757b8ec4f33',
            type: 'event_callback',
            event: {
                instance_code: 'C1BA0E6E-8CD9-4C91-8166-A3A993724751',
                def_key: 'APPROVAL_782493_4614729',
                status: 'APPROVED',
                task_id: '17648920500399525058',
                user_id: 'eg2b8f4d'
            }
        });

        expect(result.success).toBe(true);
        expect(result.data.raw_node_id).toBe('APPROVAL_782493_4614729');
        expect(result.data.node_id).toBe(config.FEISHU_NODE.generalLedger);
        expect(result.data.target_status).toBe(config.STATUS.pendingFinanceManager);
        expect(commentRecord.setValue).toHaveBeenCalledWith(expect.objectContaining({
            fieldId: 'custrecord_swc_approval_comments_content',
            value: '[总账审批通过]：无审批意见'
        }));
        expect(record.submitFields).toHaveBeenCalledWith(expect.objectContaining({
            type: config.RECORD_TYPE,
            id: '1001',
            values: expect.objectContaining({
                [config.FIELD.state]: config.STATUS.pendingFinanceManager,
                [config.FIELD.feishuLastEventId]: 'f476f0854058a033f4052757b8ec4f33'
            })
        }));
    });

    it('keeps approval callback successful when Feishu approver cannot be matched to an employee', () => {
        const config = loadConfig();
        const savedFields = {
            state: config.STATUS.submitted,
            lastEventId: ''
        };
        const commentRecord = {
            setValue: jest.fn(),
            save: jest.fn().mockReturnValue('9003')
        };
        const record = {
            create: jest.fn().mockReturnValue(commentRecord),
            submitFields: jest.fn(({ values }) => {
                if (values && Object.prototype.hasOwnProperty.call(values, config.FIELD.state)) {
                    savedFields.state = values[config.FIELD.state];
                }

                if (values && Object.prototype.hasOwnProperty.call(values, config.FIELD.feishuLastEventId)) {
                    savedFields.lastEventId = values[config.FIELD.feishuLastEventId];
                }
            })
        };
        const search = {
            Type: {
                EMPLOYEE: 'employee'
            },
            createColumn: jest.fn((column) => column),
            lookupFields: jest.fn().mockImplementation(() => ({
                [config.FIELD.tranId]: '1001',
                [config.FIELD.state]: [{ value: savedFields.state }],
                [config.FIELD.feishuLastEventId]: savedFields.lastEventId
            })),
            create: jest.fn().mockReturnValue({
                run: jest.fn().mockReturnValue({
                    each: jest.fn(() => true)
                })
            })
        };
        const log = {
            audit: jest.fn(),
            error: jest.fn()
        };
        const { restlet } = loadRestlet({ search, record, log });

        const result = restlet.post({
            event_id: 'evt-unmatched-approver',
            record_id: '1001',
            instance_code: 'FEISHU-INSTANCE-004',
            node_id: config.FEISHU_NODE.departmentManager,
            action: 'APPROVE',
            operator: {
                user_id: 'eg2b8f4d'
            },
            comment: '12121212'
        });

        expect(result.success).toBe(true);
        expect(commentRecord.setValue).toHaveBeenCalledWith({
            fieldId: 'custrecord_swc_approval_comments_content',
            value: '[部门经理通过]：12121212'
        });
        expect(commentRecord.setValue).not.toHaveBeenCalledWith(expect.objectContaining({
            fieldId: 'owner'
        }));
        expect(record.submitFields).toHaveBeenCalled();
    });

    it('creates a rejection approval comment and updates prepayment status to rejected', () => {
        const { restlet, config, record, commentRecord } = loadRestlet();

        const result = restlet.post({
            event_id: 'evt-reject-1',
            record_id: '1001',
            instance_code: 'FEISHU-INSTANCE-REJECT',
            node_id: config.FEISHU_NODE.departmentManager,
            action: 'REJECT',
            operator: {
                name: '张三',
                user_id: 'ou_demo_user'
            },
            comment: '不同意预付款申请'
        });

        expect(result.success).toBe(true);
        expect(result.data.action).toBe(config.ACTION.reject);
        expect(result.data.target_status).toBe(config.STATUS.rejected);
        expect(commentRecord.setValue).toHaveBeenCalledWith(expect.objectContaining({
            fieldId: 'custrecord_swc_approval_comments_content',
            value: '[部门经理拒绝]：不同意预付款申请'
        }));
        expect(record.submitFields).toHaveBeenCalledWith(expect.objectContaining({
            type: config.RECORD_TYPE,
            id: '1001',
            values: expect.objectContaining({
                [config.FIELD.state]: config.STATUS.rejected,
                [config.FIELD.feishuLastEventId]: 'evt-reject-1'
            })
        }));
    });

    it('creates a returned approval comment, updates status to returned, and clears old Feishu instance code', () => {
        const { restlet, config, record, commentRecord } = loadRestlet();

        const result = restlet.post({
            event_id: 'evt-return-1',
            record_id: '1001',
            instance_code: 'FEISHU-INSTANCE-RETURN',
            node_id: config.FEISHU_NODE.financeManager,
            action: 'RETURN',
            operator: {
                name: '李星月',
                user_id: 'ou_demo_user'
            },
            comment: '补充付款说明后再次提交'
        });

        expect(result.success).toBe(true);
        expect(result.data.action).toBe(config.ACTION.return);
        expect(result.data.target_status).toBe(config.STATUS.returned);
        expect(result.data.target_status_text).toBe(config.STATUS_TEXT.returned);
        expect(commentRecord.setValue).toHaveBeenCalledWith(expect.objectContaining({
            fieldId: 'custrecord_swc_approval_comments_content',
            value: '[财务经理审批驳回]：补充付款说明后再次提交'
        }));
        expect(record.submitFields).toHaveBeenCalledWith(expect.objectContaining({
            type: config.RECORD_TYPE,
            id: '1001',
            values: expect.objectContaining({
                [config.FIELD.state]: config.STATUS.returned,
                [config.FIELD.feishuInstanceCode]: '',
                [config.FIELD.feishuLastEventId]: 'evt-return-1'
            })
        }));
    });

    it('treats a finance manager rollback callback with DONE status as returned', () => {
        const { restlet, config, record, commentRecord } = loadRestlet();

        const result = restlet.post({
            event_id: 'evt-fm-rollback-1',
            event_type: 'approval_task',
            event: {
                instance_code: 'FEISHU-INSTANCE-FM-ROLLBACK',
                record_id: '1001',
                task_id: 'task-finance-manager',
                task_status: 'DONE',
                user: {
                    name: '李星月',
                    user_id: 'ou_demo_user'
                }
            },
            task_list: [
                {
                    id: 'task-finance-manager',
                    node_id: config.FEISHU_NODE.financeManager
                }
            ],
            timeline: [
                {
                    action: 'ROLLBACK',
                    status: 'DONE',
                    task_id: 'task-finance-manager',
                    node_key: config.FEISHU_NODE.financeManager,
                    comment: 'dfdf'
                }
            ]
        });

        expect(result.success).toBe(true);
        expect(result.data.action).toBe(config.ACTION.return);
        expect(result.data.target_status).toBe(config.STATUS.returned);
        expect(commentRecord.setValue).toHaveBeenCalledWith(expect.objectContaining({
            fieldId: 'custrecord_swc_approval_comments_content',
            value: '[财务经理审批驳回]：dfdf'
        }));
        expect(record.submitFields).toHaveBeenCalledWith(expect.objectContaining({
            values: expect.objectContaining({
                [config.FIELD.state]: config.STATUS.returned,
                [config.FIELD.feishuInstanceCode]: '',
                [config.FIELD.feishuLastEventId]: 'evt-fm-rollback-1'
            })
        }));
    });

    it('retries failed status writeback five times and sends a Feishu group alert', () => {
        const config = loadConfig();
        const commentRecord = {
            setValue: jest.fn(),
            save: jest.fn().mockReturnValue('9004')
        };
        const record = {
            create: jest.fn().mockReturnValue(commentRecord),
            submitFields: jest.fn(() => {
                throw new Error('submit fields failed');
            })
        };
        const https = {
            post: jest.fn()
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, tenant_access_token: 'tenant-token' }) })
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, data: { message_id: 'msg-001' } }) }),
            get: jest.fn().mockReturnValue({
                body: JSON.stringify({
                    code: 0,
                    data: {
                        items: [
                            {
                                name: 'NS-飞书审批流',
                                chat_id: 'oc_alert_chat'
                            }
                        ]
                    }
                })
            })
        };
        const { restlet } = loadRestlet({ record, https });

        const result = restlet.post({
            event_id: 'evt-retry-alert-1',
            record_id: '1001',
            instance_code: 'FEISHU-INSTANCE-ALERT',
            node_id: config.FEISHU_NODE.departmentManager,
            action: 'APPROVE',
            operator: {
                name: '张三',
                user_id: 'ou_demo_user'
            },
            comment: '同意'
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain('已重试5次');
        expect(record.create).toHaveBeenCalledTimes(1);
        expect(record.submitFields).toHaveBeenCalledTimes(6);
        expect(https.post).toHaveBeenNthCalledWith(1, expect.objectContaining({
            url: 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
            body: JSON.stringify({
                app_id: 'cli_aa9d2362783b5bd6',
                app_secret: 'app-secret'
            })
        }));
        expect(https.get).toHaveBeenCalledWith(expect.objectContaining({
            url: expect.stringContaining('/im/v1/chats/search')
        }));
        expect(https.post).toHaveBeenNthCalledWith(2, expect.objectContaining({
            url: 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id',
            body: expect.stringContaining('oc_alert_chat')
        }));
        expect(https.post.mock.calls[1][0].body).toContain('NetSuite 飞书审批回写失败预警');
        expect(https.post.mock.calls[1][0].body).toContain('submit fields failed');
    });

    it('ignores withdrawn Feishu callbacks without creating comments or updating status', () => {
        const { restlet, config, record } = loadRestlet();

        const result = restlet.post({
            event_id: 'evt-withdraw-1',
            record_id: '1001',
            instance_code: 'FEISHU-INSTANCE-WITHDRAW',
            node_id: config.FEISHU_NODE.departmentManager,
            action: '已撤回',
            operator: {
                name: '李星月',
                user_id: 'ou_demo_user'
            },
            comment: '撤回审批申请'
        });

        expect(result.success).toBe(true);
        expect(result.ignored).toBe(true);
        expect(record.create).not.toHaveBeenCalled();
        expect(record.submitFields).not.toHaveBeenCalled();
    });
});

describe('Feishu bridge NetSuite client', () => {
    const originalEnv = process.env;
    const axiosPath = require.resolve('../middleware/feishu-ns-bridge/node_modules/axios');

    beforeEach(() => {
        jest.resetModules();
        process.env = {
            ...originalEnv,
            NETSUITE_RESTLET_URL: 'https://example.restlet.test',
            NETSUITE_ACCOUNT_ID: 'test-account',
            NETSUITE_CONSUMER_KEY: 'consumer-key',
            NETSUITE_CONSUMER_SECRET: 'consumer-secret',
            NETSUITE_TOKEN_ID: 'token-id',
            NETSUITE_TOKEN_SECRET: 'token-secret',
            NETSUITE_CALLBACK_RETRY_ATTEMPTS: '3',
            NETSUITE_CALLBACK_RETRY_DELAY_MS: '1',
            FEISHU_CALLBACK_ALERT_WEBHOOK_URL: 'https://example.alert.test'
        };
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.dontMock(axiosPath);
    });

    it('retries failed NetSuite callback posts before returning success', async () => {
        const axios = {
            post: jest.fn()
                .mockRejectedValueOnce(new Error('temporary timeout'))
                .mockResolvedValueOnce({ data: { success: true } })
        };

        jest.doMock(axiosPath, () => axios);
        const { postApprovalCallback } = require('../middleware/feishu-ns-bridge/src/netsuiteClient');

        await expect(postApprovalCallback({
            event_id: 'evt-client-retry-ok',
            record_id: '1001'
        })).resolves.toEqual({ success: true });

        expect(axios.post).toHaveBeenCalledTimes(2);
        expect(axios.post.mock.calls[0][0]).toBe('https://example.restlet.test');
        expect(axios.post.mock.calls[1][0]).toBe('https://example.restlet.test');
    });

    it('sends a Feishu webhook alert after NetSuite callback retries are exhausted', async () => {
        const axios = {
            post: jest.fn()
                .mockRejectedValueOnce(new Error('ns timeout 1'))
                .mockRejectedValueOnce(new Error('ns timeout 2'))
                .mockRejectedValueOnce(new Error('ns timeout 3'))
                .mockResolvedValueOnce({ data: { code: 0 } })
        };

        jest.doMock(axiosPath, () => axios);
        const { postApprovalCallback } = require('../middleware/feishu-ns-bridge/src/netsuiteClient');

        await expect(postApprovalCallback({
            event_id: 'evt-client-retry-alert',
            instance_code: 'FEISHU-INSTANCE-ALERT',
            record_id: '1001',
            node_name: '总账审批',
            action: 'APPROVE'
        })).rejects.toThrow('ns timeout 3');

        expect(axios.post).toHaveBeenCalledTimes(4);
        expect(axios.post.mock.calls[3][0]).toBe('https://example.alert.test');
        expect(axios.post.mock.calls[3][1]).toEqual(expect.objectContaining({
            msg_type: 'text',
            content: expect.objectContaining({
                text: expect.stringContaining('evt-client-retry-alert')
            })
        }));
        expect(axios.post.mock.calls[3][1].content.text).toContain('总账审批');
    });
});

describe('Feishu callback local queue', () => {
    const originalEnv = process.env;
    let tempDir;

    beforeEach(() => {
        jest.resetModules();
        tempDir = fs.mkdtempSync(path.join(__dirname, 'tmp-callback-queue-'));
        process.env = {
            ...originalEnv,
            FEISHU_CALLBACK_QUEUE_DIR: tempDir,
            FEISHU_CALLBACK_QUEUE_MAX_ATTEMPTS: '5'
        };
    });

    afterEach(() => {
        process.env = originalEnv;
        fs.rmSync(tempDir, {
            recursive: true,
            force: true
        });
    });

    it('persists Feishu callbacks before processing and deduplicates by event id', () => {
        const {
            enqueueCallback,
            getQueueSummary,
            loadCallback
        } = require('../middleware/feishu-ns-bridge/src/callbackQueue');
        const body = {
            uuid: 'evt-queue-1',
            event: {
                instance_code: 'FEISHU-QUEUE-INSTANCE',
                def_key: 'APPROVAL_782493_4614729',
                status: 'APPROVED'
            }
        };

        const first = enqueueCallback(body, {
            path: '/api/feishu/approval/callback'
        });
        const duplicate = enqueueCallback(body, {
            path: '/api/feishu/approval/callback'
        });
        const saved = loadCallback(first.id);

        expect(first.id).toBe('evt-queue-1');
        expect(duplicate.id).toBe(first.id);
        expect(duplicate.duplicateCount).toBe(1);
        expect(saved.body).toEqual(body);
        expect(saved.instanceCode).toBe('FEISHU-QUEUE-INSTANCE');
        expect(getQueueSummary()).toEqual(expect.objectContaining({
            total: 1,
            summary: expect.objectContaining({
                RECEIVED: 1
            })
        }));
    });

    it('lists failed callbacks only after their next compensation time', () => {
        const {
            enqueueCallback,
            listPendingCallbacks,
            updateCallback
        } = require('../middleware/feishu-ns-bridge/src/callbackQueue');
        const queued = enqueueCallback({
            uuid: 'evt-queue-delay',
            event: {
                instance_code: 'FEISHU-QUEUE-DELAY'
            }
        });

        updateCallback(queued.id, {
            status: 'FAILED',
            attempts: 1,
            nextRunAt: '2026-06-08T10:00:00.000Z'
        });

        expect(listPendingCallbacks({
            now: new Date('2026-06-08T09:59:59.000Z')
        })).toEqual([]);
        expect(listPendingCallbacks({
            now: new Date('2026-06-08T10:00:00.000Z')
        }).map((record) => record.id)).toEqual(['evt-queue-delay']);
    });
});

describe('Feishu instance polling compensation', () => {
    const originalEnv = process.env;
    let tempDir;

    beforeEach(() => {
        jest.resetModules();
        tempDir = fs.mkdtempSync(path.join(__dirname, 'tmp-instance-poll-'));
        process.env = {
            ...originalEnv,
            FEISHU_INSTANCE_REGISTRY_DIR: path.join(tempDir, 'instances'),
            FEISHU_CALLBACK_QUEUE_DIR: path.join(tempDir, 'queue'),
            FEISHU_INSTANCE_POLL_ENABLED: 'true',
            FEISHU_CALLBACK_WORKER_ENABLED: 'false'
        };
    });

    afterEach(() => {
        process.env = originalEnv;
        fs.rmSync(tempDir, {
            recursive: true,
            force: true
        });
        jest.dontMock('../middleware/feishu-ns-bridge/src/feishuClient');
        jest.dontMock('../middleware/feishu-ns-bridge/src/netsuiteClient');
    });

    it('polls a Feishu instance and compensates a missed finance manager approval callback', async () => {
        const config = loadConfig();
        const { FEISHU_WIDGET: bridgeWidget } = require('../middleware/feishu-ns-bridge/src/feishuMapper');
        const getApprovalInstance = jest.fn().mockResolvedValue({
            instance_code: 'FEISHU-POLL-INSTANCE',
            status: 'PENDING',
            form: JSON.stringify([
                {
                    id: bridgeWidget.documentId,
                    value: 'PREPAY00286'
                },
                {
                    id: bridgeWidget.recordId,
                    value: '286'
                }
            ]),
            timeline: [
                {
                    type: 'PASS',
                    task_id: 'task-gl',
                    node_key: config.FEISHU_NODE.generalLedger,
                    user_id: 'eg2b8f4d',
                    operate_time: '1780904919546334'
                },
                {
                    type: 'PASS',
                    task_id: 'task-fm',
                    node_key: config.FEISHU_NODE.financeManager,
                    node_name: '财务经理审批',
                    user_id: 'eg2b8f4d',
                    operate_time: '1780904950000000',
                    comment: '同意'
                }
            ],
            task_list: [
                {
                    id: 'task-fm',
                    node_key: config.FEISHU_NODE.financeManager,
                    node_name: '财务经理审批',
                    user_id: 'eg2b8f4d'
                }
            ]
        });
        const postApprovalCallback = jest.fn().mockResolvedValue({
            success: true,
            data: {
                ns_record_id: '286',
                target_status: config.STATUS.pendingFinanceDirector
            }
        });

        jest.doMock('../middleware/feishu-ns-bridge/src/feishuClient', () => ({
            createApprovalInstance: jest.fn(),
            getApprovalInstance
        }));
        jest.doMock('../middleware/feishu-ns-bridge/src/netsuiteClient', () => ({
            postApprovalCallback,
            postInstanceSync: jest.fn(),
            postRestlet: jest.fn()
        }));

        const { pollFeishuInstance } = require('../middleware/feishu-ns-bridge/src/server');
        const result = await pollFeishuInstance({
            instanceCode: 'FEISHU-POLL-INSTANCE',
            recordId: '286',
            approvalCode: '306C03CB-85B1-4E66-888C-093ED122FD97',
            status: 'ACTIVE',
            lastEventKey: ''
        });

        expect(result.ignored).toBe(false);
        expect(getApprovalInstance).toHaveBeenCalledWith('FEISHU-POLL-INSTANCE');
        expect(postApprovalCallback).toHaveBeenCalledTimes(2);
        expect(postApprovalCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({
            instance_code: 'FEISHU-POLL-INSTANCE',
            record_id: '286',
            node_id: config.FEISHU_NODE.generalLedger,
            action: 'APPROVE'
        }));
        expect(postApprovalCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({
            instance_code: 'FEISHU-POLL-INSTANCE',
            record_id: '286',
            node_id: config.FEISHU_NODE.financeManager,
            node_name: '财务经理审批',
            action: 'APPROVE',
            comment: '同意'
        }));
        expect(postApprovalCallback.mock.calls[0][0].event_id).toMatch(/^poll:/);
        expect(postApprovalCallback.mock.calls[1][0].event_id).toMatch(/^poll:/);
    });
});
