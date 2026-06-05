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
        expect(mapAction('REJECTED')).toBe('REJECT');
        expect(mapAction('拒绝')).toBe('REJECT');
        expect(mapAction('驳回')).toBe('REJECT');
        expect(mapAction('RETURNED')).toBe('RETURN');
        expect(mapAction('退回')).toBe('RETURN');
        expect(mapAction('打回')).toBe('RETURN');
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
});

describe('Feishu prepayment approval User Event demo', () => {
    const createRecordMock = ({ id = '1001', state, oldState, instanceCode = 'FEISHU-INSTANCE-001' }) => ({
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
        type: 'edit',
        UserEventType: {
            CREATE: 'create',
            EDIT: 'edit'
        }
    });

    const loadUserEvent = (overrides = {}) => {
        const config = loadConfig();
        const record = {
            submitFields: jest.fn()
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
                EMPLOYEE: 'employee'
            },
            createColumn: jest.fn((column) => column),
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

    it('creates a new Feishu approval instance when a returned prepayment is submitted again', () => {
        const config = loadConfig();
        const https = {
            post: jest.fn()
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, tenant_access_token: 'tenant-token' }) })
                .mockReturnValueOnce({ body: JSON.stringify({ code: 0, data: { instance_code: 'FEISHU-INSTANCE-NEW' } }) }),
            get: jest.fn()
        };
        const { userEvent, record } = loadUserEvent({ https });

        userEvent.afterSubmit(createRecordMock({
            oldState: config.STATUS.returned,
            state: config.START_APPROVAL_STATUS,
            instanceCode: 'FEISHU-INSTANCE-OLD'
        }));

        expect(https.get).not.toHaveBeenCalled();
        expect(https.post).toHaveBeenNthCalledWith(2, expect.objectContaining({
            url: 'https://open.feishu.cn/open-apis/approval/v4/instances?user_id_type=user_id'
        }));
        expect(JSON.parse(https.post.mock.calls[1][0].body)).toEqual(expect.objectContaining({
            approval_code: 'approval-code',
            user_id: 'ou_creator'
        }));
        expect(record.submitFields).toHaveBeenLastCalledWith(expect.objectContaining({
            type: config.RECORD_TYPE,
            id: '1001',
            values: {
                [config.FIELD.feishuInstanceCode]: 'FEISHU-INSTANCE-NEW',
                [config.FIELD.feishuSyncStatus]: config.SYNC_STATUS.success
            }
        }));
    });
});

describe('Feishu prepayment approval callback RESTlet demo', () => {
    const loadRestlet = (overrides = {}) => {
        const config = loadConfig();
        const commentRecord = {
            setValue: jest.fn(),
            save: jest.fn().mockReturnValue('9001')
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
            lookupFields: jest.fn().mockReturnValue({
                [config.FIELD.tranId]: '1001',
                [config.FIELD.state]: [{ value: config.STATUS.submitted }],
                [config.FIELD.feishuLastEventId]: ''
            }),
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
                        each: jest.fn(() => true)
                    })
                };
            })
        };
        const log = {
            audit: jest.fn(),
            error: jest.fn()
        };

        const restlet = loadSuiteScriptModule(
            'src/FileCabinet/SuiteScripts/SWC_PROJECT/RL/SWC_RL_FEISHU_PREPAY_CALLBACK_DEMO.js',
            {
                'N/record': overrides.record || record,
                'N/search': overrides.search || search,
                'N/log': overrides.log || log,
                '../common/SWC_Feishu_Approval_Demo_Config': config
            }
        );

        return {
            restlet,
            config,
            record: overrides.record || record,
            search: overrides.search || search,
            commentRecord,
            log
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

    it('looks up prepayment by document number when record_id is not an internal id', () => {
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
            filters: [[config.FIELD.tranId, 'is', 'PREPAY00233']]
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

    it('keeps approval callback successful when Feishu approver cannot be matched to an employee', () => {
        const config = loadConfig();
        const commentRecord = {
            setValue: jest.fn(),
            save: jest.fn().mockReturnValue('9003')
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
            lookupFields: jest.fn().mockReturnValue({
                [config.FIELD.tranId]: '1001',
                [config.FIELD.state]: [{ value: config.STATUS.submitted }],
                [config.FIELD.feishuLastEventId]: ''
            }),
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
