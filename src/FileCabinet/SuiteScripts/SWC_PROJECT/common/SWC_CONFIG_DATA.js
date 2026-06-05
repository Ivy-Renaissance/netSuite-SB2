/**
 * @NApiVersion 2.0
 * @NModuleScope public
 */
define([],

    function () {

        var data = {};
        //子公司
        data.s_subsidiary_hnxlbbdzswyxgs = 64;//64	湖南小鹿奔奔电子商务有限公司
        data.ACCOUNT_ID = '11297254-sb1';//环境ID
        //记录ID
        data.DP_REC_ID = '38';//备货计划

        //采购订单类型
        // data.s_po_type_swcg = 1;//1	实物采购类
        // data.s_po_type_cgzf = 2;//2	采购杂费
        // data.s_po_type_gdzc = 5;//5	固定资产
        // data.s_po_type_cgdb = 4;//4	采购调拨费
        // data.s_po_type_wcfy_y = 6;//6	尾程费用预估
        // data.s_po_type_ggfy = 7;//7	广告费用
        // data.s_po_type_ggfy_s = 15;//15	广告费用-实际
        // data.s_po_type_ggfy_y = 16;//16	广告费用-预估
        data.s_po_type_swcg = 1;//1	实物采购类
        data.s_po_type_cgzf_y = 2;//2	采购杂费
        data.s_po_type_cgdbf_y = 4;//4   采购调拨费
        data.s_po_type_gdzc = 10;//10	固定资产
        // data.s_po_type_cgdb = 4;//4	采购调拨费
        // data.s_po_type_ggfy = 7;//7	广告费用
        data.s_po_type_wcfy_y = 6;//6	尾程费用预估
        data.s_po_type_cgzf_s = 11;//11	采购杂费
        data.s_po_type_cgdbf_s = 12;//12   采购调拨费
        data.s_po_type_ggfy_s = 14;//14	广告费用-实际
        data.s_po_type_ggfy_y = 15;//15	广告费用-预估
      

        //财务应付用审批状态
        data.s_pr_status_ypz = 1;//1	已批准
        data.s_pr_status_yjj = 3;//3	已拒绝
        data.s_pr_status_WTJ = 4;//4	未提交
        data.s_pr_status_yzf = 6;//6	已作废
        data.s_pr_status_ydh = 7;//7	已打回待再次提交
        data.s_pr_status_yqr = 10;//10	已确认
        data.s_pr_status_ytj = 21;//21	已提交

        //子公司 国内/国外
        data.s_subway_gn = 1;//1	国内
        data.s_subway_gw = 2;//2	国外

        //对账和付款的部门列表
        data.s_department_cgb = 1;//1	采购部
        data.s_department_wltc = 2;//2	物流部_头程
        data.s_department_wlwc = 3;//3	物流部_尾程
        data.s_department_qt = 4;//4	其他
        data.s_department_gg = 5;//5	广告
        data.s_department_xz = 6;//6	行政

        //仓库类型
        data.s_cktype_3pl = 1;//1	3PL
        data.s_cltype_fba = 2;//2	FBA
        data.s_cltype_cg = 3;//3	CG

        //bao仓库属性
        data.s_attribute_hwc = 6;//6	海外仓
        data.s_attribute_ptc = 7;//7	平台仓
        data.s_attribute_bsc = 11;//11	保税仓

        //货品
        data.s_item_wckcf = 4376;//尾程-卡车费（新）
        data.s_item_wcqtfyx = 4377;//尾程-其他费用项（新）

        //中国现金流量表项
        data.s_xjllb_gmsp = 4;    //4	购买商品、接受劳务支付的现金

        //尾程费用列表
        data.s_wclx_czfy = 5;//仓租费用（实际-预估）

        //付款模式
        data.s_fkms_qbzf = 1;//1	全部支付
        data.s_fkms_bfzf = 2;//2	部分支付

        //角色
        data.s_role_gly = 3;//3	管理员
        data.s_role_xlcn = 1074;//1074	XL_出纳

        //平台
        data.PLATFORM_AMAZON = 1;//亚马逊
        data.PLATFORM_WAYFAIR = 2;//Wayfair
        data.PLATFORM_HOMEDEPOT = 3;//Home Depot
        data.PLATFORM_LOWE = 4;//Lowe‘s
        data.PLATFORM_MANOMANO = 5;//Manomano
        data.PLATFORM_KAUFLAND = 6;//Kaufland
        data.PLATFORM_LEROYMERLIN = 7;//Leroy Merlin
        data.PLATFORM_RONA = 8;//Rona
        data.PLATFORM_SHOPIFY = 9;//Shopify
        data.PLATFORM_WALMART = 10;//Walmart
        data.PLATFORM_HOUZZ = 11;//Houzz
        data.PLATFORM_Macy = 12;//Macy's
        data.PLATFORM_OBERSTOCK = 13;//Overstock
        data.PLATFORM_TEMU = 14;//Temu
        data.PLATFORM_CDISCOUNT = 15;//Cdiscount
        data.PLATFORM_EBAY = 16;//ebay
        data.PLATFORM_OZON = 17;//Ozon
        data.PLATFORM_TIKTOK = 18;//Tiktok

        //科目
        data.S_ACCOUNT_YJSF_JXSEWKP = 126;//应交税费_应交增值税_进项税额-未开票
        data.ACCOUNT_YSZK_YFMXKHPGYS = 299;//应付账款_应付明细款-货物供应商
        data.S_ACCOUNT_YFZK_HWGYS = 901;//预付账款-货物供应商
        data.S_ACCOUNT_YFZK = 979;//应付账款
        data.S_ACCOUNT_YJSF_JXSE = 1298;//应交税费_应交增值税_进项税额
        data.S_ACCOUNT_YSZK = 566;//2203	预收账款

        //亚马逊
        data.TERMS_1 = 1;//30%定金，70%尾款到发货
        data.TERMS_2 = 2;//120天账期
        data.TERMS_3 = 3;//出货前付全款
        data.TERMS_4 = 4;//70天账期
        data.TERMS_5 = 5;//90天账期
        data.TERMS_6 = 6;//75天账期
        data.TERMS_7 = 7;//60天账期
        data.TERMS_8 = 8;//55天账期
        data.TERMS_9 = 9;//次月月底结算
        data.TERMS_10 = 10;//次月15号结算
        data.TERMS_11 = 11;//次月20号结算
        data.TERMS_12 = 12;//30%定金，70%到港前支付
        data.TERMS_13 = 13;//20%定金，80%到港前支付
        data.TERMS_14 = 14;//当月到港当月结
        data.TERMS_15 = 15;//预付30%，70%出货后30天结算
        data.TERMS_16 = 16;//30%定金，发货后次月20号前支付70%尾款
        data.TERMS_17 = 17;//当月到港月底结算
        data.TERMS_18 = 18;//预充值
        data.TERMS_19 = 19;//次月月结

        //自定义记录
        data.S_CUSTOMRECORD_YSKSQD = 590;//预收款申请单

        //表单
        data.FORM_PO = 100;//DeerValley_采购订单
        data.FORM_PO_FEE = 102;//DeerValley_采购订单_费用类

        //费用类型及货品相关
        data.FEE_TYPE_RKF = '101';//入库操作费，中类内部ID
        data.FEE_TYPE_BXF = '4';//海运保险费，中类内部ID
        data.FEE_TYPE_JKGS = '7';//目的国进口关税，中类内部ID
        data.FEE_TYPE_MDGQGF = '6';//目的港清关费，中类内部ID
        data.FEE_TYPE_MDGHDF = '8';//目的港货代费，中类内部ID
        data.FEE_TYPE_GS = '25';//关税，小类内部ID
        data.FEE_TYPE_MDGQGDLF = '24';//目的港清关代理费，小类内部ID

        //审批状态（采/物）
        data.spztcw_dtj = 1;//1	待提交

        data.feeItemByName = {
            '1': 3111, '2': 3112, '3': 3113, '4': 3114, '5': 3115,
            '6': 3116, '7': 3117, '8': 3118, '9': 3119, '101': 3447
        };
        data.actualFeeCfg = {
            '1': { amtField: 'custrecord_swc_wl_d_sj_trailer_fee', curField: 'custrecord_swc_wl_d_sj_trailer_fee_c' },
            '2': { amtField: 'custrecord_swc_wl_d_sj_cda_fee', curField: 'custrecord_swc_wl_d_sj_cda_fee_c' },
            '3': { amtField: 'custrecord_swc_wl_d_sj_ffc', curField: 'custrecord_swc_wl_d_sj_ffc_c' },
            '4': { amtField: 'custrecord_swc_wl_d_sj_bxf_fee', curField: 'custrecord_swc_wl_d_sj_bxf_fee_c' },
            '5': { amtField: 'custrecord_swc_actual_first_leg_cost', curField: 'custrecord_swc_actual_firs_leg_cost' },
            '6': { amtField: 'custrecord_swc_wl_d_sj_qgf_fee', curField: 'custrecord_swc_wl_d_sj_qgf_fee_c' },
            '7': { amtField: 'custrecord_swc_wl_d_sj_jkgs_fee', curField: 'custrecord_swc_wl_d_sj_jkgs_fee_c' },
            '8': { amtField: 'custrecord_swc_wl_d_sj_hdf_fee', curField: 'custrecord_swc_wl_d_sj_hdf_fee_c' },
            '9': { amtField: 'custrecord_swc_wl_d_sj_tcf_fee', curField: 'custrecord_swc_wl_d_sj_tcf_fee_c' },
            '101': { amtField: 'custrecord_swc_wl_d_sj_rkcz_fee', curField: 'custrecord_swc_wl_d_sj_rkcz_fee_c' }
        };
        data.FEE_CFG = {
            '1': { amtField: 'custrecord_swc_cg_d_em_trailer_fee', curField: 'custrecord_swc_cg_d_em_trailer_fee_c' },
            '2': { amtField: 'custrecord_swc_cg_d_em_cda_fee', curField: 'custrecord_swc_cg_d_em_cda_fee_c' },
            '3': { amtField: 'custrecord_swc_cg_d_em_ffc', curField: 'custrecord_swc_cg_d_em_ffc_c' },
            '4': { amtField: 'custrecord_swc_cg_d_em_bxf_fee', curField: 'custrecord_swc_cg_d_em_bxf_fee_c' },
            '5': { amtField: 'custrecord_swc_cg_d_em_hyf_fee', curField: 'custrecord_swc_cg_d_em_hyf_fee_c' },
            '6': { amtField: 'custrecord_swc_cg_d_em_qgf_fee', curField: 'custrecord_swc_cg_d_em_qgf_fee_c' },
            '7': { amtField: 'custrecord_swc_cg_d_em_jkgs_fee', curField: 'custrecord_swc_cg_d_em_jkgs_fee_c' },
            '8': { amtField: 'custrecord_swc_cg_d_em_hdf_fee', curField: 'custrecord_swc_cg_d_em_hdf_fee_c' },
            '9': { amtField: 'custrecord_swc_cg_d_em_tcf_fee', curField: 'custrecord_swc_cg_d_em_tcf_fee_c' },
            '101': { amtField: 'custrecord_swc_cg_d_em_rkcz_fee', curField: 'custrecord_swc_cg_d_em_rkcz_fee_c' }
        };

        // 当前批次脚本固定引用的 Client Script 路径
        data.CLIENT_SCRIPT_PATH_ESTIMATED_CABINET = 'SuiteScripts/SWC_PROJECT/CS/SWC_CS_ESTIMATED_CABINET.js';// 预排柜客户端脚本路径
        data.CLIENT_SCRIPT_PATH_ACTUAL_CABINET = '../CS/SWC_CS_ACTUAL_CABINET.js';// 真实排柜客户端脚本路径
        data.CLIENT_SCRIPT_PATH_LP_LOGSISTICPLAN = 'SuiteScripts/SWC_PROJECT/CS/SWC_CS_LP_LOGSISTICPLAN.js';// 物流计划平台客户端脚本路径

        // 物流发运/贸易条款 Suitelet 脚本与部署
        data.SCRIPT_ID_SL_WL_PLAN_ORDER = 'customscript_swc_sl_wl_plan_order';// 物流发运单 Suitelet Script ID
        data.DEPLOY_ID_SL_WL_PLAN_ORDER = 'customdeploy_swc_sl_wl_plan_order';// 物流发运单 Suitelet Deployment ID
        data.SCRIPT_ID_SL_TRADE_TERMS_V2 = 'customscript_sl_trade_terms_v2';// 贸易条款 V2 Suitelet Script ID
        data.DEPLOY_ID_SL_TRADE_TERMS_V2 = 'customdeploy_sl_trade_terms_v2';// 贸易条款 V2 Suitelet Deployment ID
        data.SCRIPT_ID_SL_SPLIT_PACK = 'customscript_swc_sl_split_pack';// 装箱单拆分 Suitelet Script ID
        data.DEPLOY_ID_SL_SPLIT_PACK = 'customdeploy_swc_sl_split_pack';// 装箱单拆分 Suitelet Deployment ID
        data.SCRIPT_ID_SL_HP_DELIVERY_NOTICE = 'customscript_hp_delivery_notice';// 发货通知 Suitelet Script ID
        data.DEPLOY_ID_SL_HP_DELIVERY_NOTICE = 'customdeploy_hp_delivery_notice';// 发货通知 Suitelet Deployment ID

        // Map/Reduce 脚本与部署
        data.SCRIPT_ID_MR_WL_PLAN_ORDER = 'customscript_swc_mr_wl_plan_order';// 物流发运生成 MR Script ID
        data.DEPLOY_ID_MR_WL_PLAN_ORDER = 'customdeploy_swc_mr_wl_plan_order';// 物流发运生成 MR Deployment ID
        data.SCRIPT_ID_MR_TRADE_TERMS_V2 = 'customscript_mr_trade_terms_v2';// 贸易条款 V2 转移单 MR Script ID
        data.DEPLOY_ID_MR_TRADE_TERMS_V2 = 'customdeploy_mr_trade_terms_v2';// 贸易条款 V2 转移单 MR Deployment ID
        data.SCRIPT_ID_MR_INTERCOMPANY_TRANSACTION_V2 = 'customscript_mr_intercompany_transact';// 贸易条款 V2 公司间交易 MR Script ID
        data.DEPLOY_ID_MR_INTERCOMPANY_TRANSACTION_V2 = 'customdeploy_mr_intercompany_transact';// 贸易条款 V2 公司间交易 MR Deployment ID
        data.SCRIPT_ID_MR_CG_SHIPMENT = 'customscript_swc_mr_cg_shipment';// CG 转移单 MR Script ID
        data.DEPLOY_ID_MR_CG_SHIPMENT = 'customdeploy_swc_mr_cg_shipment';// CG 转移单 MR Deployment ID
        data.SCRIPT_ID_MR_CG_IC_TRANSACTION = 'customscript_swc_mr_cg_ic_transaction';// CG 公司间交易 MR Script ID
        data.DEPLOY_ID_MR_CG_IC_TRANSACTION = 'customdeploy_swc_mr_cg_ic_transaction';// CG 公司间交易 MR Deployment ID
        data.SCRIPT_ID_MR_TRADE_TERMS_SHIPMENT_LEGACY = 'customscript_swc_mr_trade_terms_shipment';// 旧贸易条款转移单 MR Script ID
        data.DEPLOY_ID_MR_TRADE_TERMS_SHIPMENT_LEGACY = 'customdeploy_swc_mr_trade_terms_shipment';// 旧贸易条款转移单 MR Deployment ID
        data.SCRIPT_ID_MR_INTERCOMPANY_LEGACY = 'customscript_swc_mr_it';// 旧公司间交易 MR Script ID
        data.DEPLOY_ID_MR_INTERCOMPANY_LEGACY = 'customdeploy_swc_mr_it';// 旧公司间交易 MR Deployment ID

        // 贸易条款配置主表与子表
        data.RECORD_TYPE_TRADE_TERMS_CONFIG = 'customrecord_swc_transaction_link_config';// 贸易条款配置主表 script id
        data.SUBLIST_ID_TRADE_TERMS_CONFIG = 'recmachcustrecord_swc_main_config';// 贸易条款配置子表 script id

        // 物流发运单/公司间交易固定国家与子公司
        data.COUNTRY_ID_US = '230';// 美国内部ID
        data.COUNTRY_ID_GB = '77';// 英国内部ID
        data.SUBSIDIARY_ID_US_DEFAULT = 77;// Lettoi LLC 默认子公司内部ID
        data.SUBSIDIARY_ID_US_OLD = 81;// 历史美国子公司内部ID

        // 转移单/到岸成本特殊供应商
        data.VENDOR_ID_SKIP_TRANSFER_LANDED_COST = '1593';// 国内FOB跳过到岸成本的特殊供应商内部ID

        // 采购订单固定状态值
        data.PO_STATUS_APPROVED = 9;// 采购订单状态：已审核
        data.PO_STATUS_REJECTED = 13;// 采购订单状态：已驳回
        data.PO_APPROVALSTATUS_PENDING = 1;// 系统审批状态：待审批
        data.PO_APPROVALSTATUS_APPROVED = 2;// 系统审批状态：已批准
        data.DEFAULT_PAYMENT_CYCLE = 1;// 默认账期值
        data.COST_CATEGORY_CKMTS = 36;// 出口免退税成本类别
        data.COST_CATEGORY_CKMTS_2 = 38;// 出口免退税补充成本类别

        // 物流发运单差异账单费用货品映射
        data.feeItemByNameWlDiff = {
            '1': 3111, '2': 3112, '3': 3113, '4': 3114, '5': 3115,
            '6': 3116, '7': 3117, '8': 3118, '9': 3119, '101': 3447
        };// 物流发运单差异账单货品映射

        // 物流发运单预估/采购订单做成费用货品映射
        data.feeItemByNameWlEstimate = {
            '1': 3111, '2': 3112, '3': 3113, '4': 3114, '5': 3115,
            '6': 3116, '7': 3117, '8': 3118, '9': 3119
        };// 物流发运单预估费用货品映射
        data.ITEM_ID_WL_STORAGE_FEE_ESTIMATE = 3447;// 物流发运单入库操作费预估货品
        data.ITEM_ID_WL_STORAGE_FEE_PO = 4595;// 物流发运单入仓费采购订单货品
        data.CURRENCY_CODE_USD = 'USD';// 美元币种代码
        data.CURRENCY_CODE_CNY = 'CNY';// 人民币币种代码

        // 贸易条款路由配置
        data.TRADE_TERMS_ROUTE_CONFIG = {
            v2: {
                transfer: {
                    scriptId: 'customscript_mr_trade_terms_v2',
                    deploymentId: 'customdeploy_mr_trade_terms_v2'
                },
                intercompany: {
                    scriptId: 'customscript_mr_intercompany_transact',
                    deploymentId: 'customdeploy_mr_intercompany_transact'
                }
            },
            cg: {
                transfer: {
                    scriptId: 'customscript_swc_mr_cg_shipment',
                    deploymentId: 'customdeploy_swc_mr_cg_shipment'
                },
                intercompany: {
                    scriptId: 'customscript_swc_mr_cg_ic_transaction',
                    deploymentId: 'customdeploy_swc_mr_cg_ic_transaction'
                }
            }
        };// 贸易条款V2路由配置

        //================================================线上测试环境，线下生产环境=================================================================================================
        // data.CLIENT_SCRIPT_PATH_ESTIMATED_CABINET = 'SuiteScripts/SWC_PROJECT/CS/SWC_CS_ESTIMATED_CABINET.js';// 预排柜客户端脚本路径
        // data.CLIENT_SCRIPT_PATH_ACTUAL_CABINET = '../CS/SWC_CS_ACTUAL_CABINET.js';// 真实排柜客户端脚本路径
        // data.CLIENT_SCRIPT_PATH_LP_LOGSISTICPLAN = 'SuiteScripts/SWC_PROJECT/CS/SWC_CS_LP_LOGSISTICPLAN.js';// 物流计划平台客户端脚本路径
        // data.SCRIPT_ID_SL_WL_PLAN_ORDER = 'customscript_swc_sl_wl_plan_order';// 物流发运单 Suitelet Script ID TODO：需要更新为正式环境内部ID lxk -OK
        // data.DEPLOY_ID_SL_WL_PLAN_ORDER = 'customdeploy_swc_sl_wl_plan_order';// 物流发运单 Suitelet Deployment ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.SCRIPT_ID_SL_TRADE_TERMS_V2 = 'customscript_swc_sl_trade_terms_v2';// 贸易条款 V2 Suitelet Script ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.DEPLOY_ID_SL_TRADE_TERMS_V2 = 'customdeploy_swc_sl_trade_terms_v2';// 贸易条款 V2 Suitelet Deployment ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.SCRIPT_ID_SL_SPLIT_PACK = 'customscript_swc_sl_split_pack';// 装箱单拆分 Suitelet Script ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.DEPLOY_ID_SL_SPLIT_PACK = 'customdeploy_swc_sl_split_pack';// 装箱单拆分 Suitelet Deployment ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.SCRIPT_ID_SL_HP_DELIVERY_NOTICE = 'customscript_hp_delivery_notice';// 发货通知 Suitelet Script ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.DEPLOY_ID_SL_HP_DELIVERY_NOTICE = 'customdeploy_hp_delivery_notice';// 发货通知 Suitelet Deployment ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.SCRIPT_ID_MR_WL_PLAN_ORDER = 'customscript_swc_mr_wl_plan_order';// 物流发运生成 MR Script ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.DEPLOY_ID_MR_WL_PLAN_ORDER = 'customdeploy_swc_mr_wl_plan_order';// 物流发运生成 MR Deployment ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.SCRIPT_ID_MR_TRADE_TERMS_V2 = 'customscript_swc_mr_trade_terms_v2';// 贸易条款 V2 转移单 MR Script ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.DEPLOY_ID_MR_TRADE_TERMS_V2 = 'customdeploy_swc_mr_trade_terms_v2';// 贸易条款 V2 转移单 MR Deployment ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.SCRIPT_ID_MR_INTERCOMPANY_TRANSACTION_V2 = 'customscript_swc_mr_intercompany_transac';// 贸易条款 V2 公司间交易 MR Script ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.DEPLOY_ID_MR_INTERCOMPANY_TRANSACTION_V2 = 'customdeploy_swc_mr_intercompany_transac';// 贸易条款 V2 公司间交易 MR Deployment ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.SCRIPT_ID_MR_CG_SHIPMENT = 'customscript_swc_mr_cg_shipment';// CG 转移单 MR Script ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.DEPLOY_ID_MR_CG_SHIPMENT = 'customdeploy_swc_mr_cg_shipment';// CG 转移单 MR Deployment ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.SCRIPT_ID_MR_CG_IC_TRANSACTION = 'customscript_swc_mr_cg_ic_transaction';// CG 公司间交易 MR Script ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.DEPLOY_ID_MR_CG_IC_TRANSACTION = 'customdeploy_swc_mr_cg_ic_transaction';// CG 公司间交易 MR Deployment ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.PARAM_MR_TRADE_TERMS_V2_PAYLOAD = 'custscript_swc_trade_terms_v2_payload';// 贸易条款 V2 转移单 MR payload 参数
        // data.PARAM_MR_INTERCOMPANY_TRANSACTION_V2_PAYLOAD = 'custscript_swc_int_tra_v2_payload';// 贸易条款 V2 公司间交易 MR payload 参数
        // data.PARAM_MR_CG_SHIPMENT_PAYLOAD = 'custscript_swc_cg_shipment_payload';// CG 转移单 MR payload 参数
        // data.PARAM_MR_CG_INTERCOMPANY_PAYLOAD = 'custscript_swc_cg_ic_payload';// CG 公司间交易 MR payload 参数
        // data.SCRIPT_ID_MR_TRADE_TERMS_SHIPMENT_LEGACY = 'customscript_swc_mr_trade_terms_shipment';// 旧贸易条款转移单 MR Script ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.DEPLOY_ID_MR_TRADE_TERMS_SHIPMENT_LEGACY = 'customdeploy_swc_mr_trade_terms_shipment';// 旧贸易条款转移单 MR Deployment ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.SCRIPT_ID_MR_INTERCOMPANY_LEGACY = 'customscript_swc_mr_it';// 旧公司间交易 MR Script ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.DEPLOY_ID_MR_INTERCOMPANY_LEGACY = 'customdeploy_swc_mr_it';// 旧公司间交易 MR Deployment ID TODO：需要更新为正式环境内部ID lxk-OK
        // data.RECORD_TYPE_TRADE_TERMS_CONFIG = 'customrecord_swc_transaction_link_config';// 贸易条款配置主表 script id
        // data.SUBLIST_ID_TRADE_TERMS_CONFIG = 'recmachcustrecord_swc_main_config';// 贸易条款配置子表 script id
        // data.COUNTRY_ID_US = '230';// 美国内部ID TODO：需要更新为正式环境内部ID lxk - ok
        // data.COUNTRY_ID_GB = '77';// 英国内部ID TODO：需要更新为正式环境内部ID lxk - ok
        // data.SUBSIDIARY_ID_US_DEFAULT = 19;// Lettoi LLC 默认子公司内部ID TODO：需要更新为正式环境内部ID lxk - ok
        // data.SUBSIDIARY_ID_US_OLD = 20;// 历史美国子公司内部ID TODO：需要更新为正式环境内部ID lxk -Fax East Trading LLC
        // data.VENDOR_ID_SKIP_TRANSFER_LANDED_COST = '682';// 国内FOB跳过到岸成本的特殊供应商内部ID TODO：需要更新为正式环境内部ID lxk - ok
        // data.PO_STATUS_APPROVED = 9;// 采购订单状态：已审核 TODO：需要更新为正式环境内部ID lxk - ok
        // data.PO_STATUS_REJECTED = 13;// 采购订单状态：已驳回 TODO：需要更新为正式环境内部ID lxk - ok
        // data.PO_APPROVALSTATUS_PENDING = 1;// 系统审批状态：待审批
        // data.PO_APPROVALSTATUS_APPROVED = 2;// 系统审批状态：已批准
        // data.DEFAULT_PAYMENT_CYCLE = 1;// 默认账期值 TODO：需要更新为正式环境内部ID lxk -------------NO
        // data.COST_CATEGORY_CKMTS = 36;// 出口免退税成本类别 TODO：需要更新为正式环境内部ID lxk 采购杂费
        // data.COST_CATEGORY_CKMTS_2 = 38;// 出口免退税补充成本类别 TODO：需要更新为正式环境内部ID lxk 出口免退税
        // data.feeItemByNameWlDiff = {
        //     '1': 3730, '2': 3729, '3': 3731, '4': 3734, '5': 3733,
        //     '6': 3733, '7': 3735, '8': 3738, '9': 3736, '101': 3732
        // };// 物流发运单差异账单货品映射（正式环境）
        // data.feeItemByNameWlEstimate = {
        //     '1': 3730, '2': 3729, '3': 3731, '4': 3734, '5': 3733,
        //     '6': 3733, '7': 3735, '8': 3738, '9': 3736
        // };// 物流发运单预估费用货品映射（正式环境）
        // data.ITEM_ID_WL_STORAGE_FEE_ESTIMATE = 3732;// 物流发运单入库操作费预估货品（正式环境）
        // data.ITEM_ID_WL_STORAGE_FEE_PO = 3732;// 物流发运单入仓费采购订单货品（正式环境）
        // data.ITEM_ID_WL_PURCHASE_MISC_FEE = 3720;// 物流发运单采购杂费/费用类通用货品（正式环境）
        // data.ITEM_ID_TRANSFER_FEE_PO = 3721;// 调拨费费用类采购订单货品（正式环境）
        // data.ITEM_ID_HW_OUTBOUND_FEE_PO = 3739;// 海外仓出仓费采购订单货品（正式环境）
        // data.ITEM_ID_HW_TRUCKING_FEE_PO = 3728;// 海外仓卡车费采购订单货品（正式环境）
        // data.ACCOUNT_ID_WL_PURCHASE_MISC_VENDOR_BILL = 3109;// 采购杂费差异账单科目（正式环境）
        // data.ACCOUNT_ID_WL_PURCHASE_MISC_VENDOR_CREDIT = 58;// 采购杂费差异贷项科目（正式环境）
        // data.CURRENCY_CODE_USD = 'USD';// 美元币种代码
        // data.CURRENCY_CODE_CNY = 'CNY';// 人民币币种代码
        // data.LANDED_COST_CATEGORY_BY_FEE_FIELD = {
        //     trailer_fee: 27,
        //     cda_fee: 28,
        //     em_ffc: 29,
        //     bxf_fee: 30,
        //     hyf_fee: 31,
        //     qgf_fee: 32,
        //     jkgs_fee: 33,
        //     hdf_fee: 34,
        //     tcf_fee: 35,
        //     rkcz: 45
        // };// 贸易条款V2落地成本类别映射（正式环境）
        // data.TRADE_TERMS_ROUTE_CONFIG = {
        //     v2: {
        //         transfer: {
        //             scriptId: 'customscript_swc_mr_trade_terms_v2',
        //             deploymentId: 'customdeploy_swc_mr_trade_terms_v2'
        //         },
        //         intercompany: {
        //             scriptId: 'customscript_swc_mr_intercompany_transac',
        //             deploymentId: 'customdeploy_swc_mr_intercompany_transac'
        //         }
        //     },
        //     cg: {
        //         transfer: {
        //             scriptId: 'customscript_swc_mr_cg_shipment',
        //             deploymentId: 'customdeploy_swc_mr_cg_shipment'
        //         },
        //         intercompany: {
        //             scriptId: 'customscript_swc_mr_cg_ic_transaction',
        //             deploymentId: 'customdeploy_swc_mr_cg_ic_transaction'
        //         }
        //     }
        // };// 贸易条款V2路由配置（正式环境）
        // var data = {};
        // //子公司
        // data.s_subsidiary_hnxlbbdzswyxgs = 1;//1	湖南小鹿奔奔电子商务有限公司
        //
        // //采购订单类型
        // data.s_po_type_swcg = 1;//1	实物采购类
        // // data.s_po_type_cgzf = 2;//2	采购杂费
        // data.s_po_type_gdzc = 10;//10	固定资产
        // // data.s_po_type_cgdb = 4;//4	采购调拨费
        // // data.s_po_type_ggfy = 7;//7	广告费用
        // data.s_po_type_wcfy_y = 6;//6	尾程费用预估
        // data.s_po_type_ggfy_s = 14;//14	广告费用-实际
        // data.s_po_type_ggfy_y = 15;//15	广告费用-预估
        //
        // //财务应付用审批状态
        // data.s_pr_status_ypz = 4;//4	已批准
        // data.s_pr_status_yjj = 6;//6	已拒绝
        // data.s_pr_status_WTJ = 1;//1	未提交
        // data.s_pr_status_yzf = 2;//2	已作废
        // data.s_pr_status_ydh = 5;//5	已打回待再次提交
        // data.s_pr_status_yqr = 9;//9	已确认
        // data.s_pr_status_ytj = 19;//19	已提交
        //
        // //子公司 国内/国外
        // data.s_subway_gn = 1;//1	国内
        // data.s_subway_gw = 2;//2	国外
        //
        // //对账和付款的部门列表
        // data.s_department_cgb = 1;//1	采购部
        // data.s_department_wltc = 2;//2	物流部_头程
        // data.s_department_wlwc = 3;//3	物流部_尾程
        // data.s_department_qt = 4;//4	其他
        // data.s_department_gg = 5;//5	广告
        // data.s_department_xz = 6;//6	行政
        //
        // //仓库类型
        // data.s_cktype_3pl = 1;//1	3PL
        // data.s_cltype_fba = 2;//2	FBA
        // data.s_cltype_cg = 3;//3	CG
        //
        // //bao仓库属性
        // data.s_attribute_hwc = 6;//6	海外仓
        // data.s_attribute_ptc = 7;//7	平台仓
        // data.s_attribute_bsc = 11;//11	保税仓
        //
        // //货品
        // data.s_item_wckcf = 3728;//尾程-卡车费（新）
        // data.s_item_wcqtfyx = 4377;//尾程-其他费用项（新）
        data.s_item_czf = 4379;//仓租费
        //
        // //中国现金流量表项
        // data.s_xjllb_gmsp = 4;    //4	购买商品、接受劳务支付的现金
        //
        // //尾程费用列表
        // data.s_wclx_czfy = 5;//仓租费用（实际-预估）
        //
        // //付款模式
        // data.s_fkms_qbzf = 1;//1	全部支付
        // data.s_fkms_bfzf = 2;//2	部分支付
        //
        // //角色
        // data.s_role_gly = 3;//3	管理员
        // data.s_role_xlcn = 1011;//1011	XL_出纳
        //
        // //平台
        // data.PLATFORM_AMAZON = 1;//亚马逊
        // data.PLATFORM_WAYFAIR = 2;//Wayfair
        // data.PLATFORM_HOMEDEPOT = 3;//Home Depot
        // data.PLATFORM_LOWE = 4;//Lowe‘s
        // data.PLATFORM_MANOMANO = 5;//Manomano
        // data.PLATFORM_KAUFLAND = 6;//Kaufland
        // data.PLATFORM_LEROYMERLIN = 7;//Leroy Merlin
        // data.PLATFORM_RONA = 8;//Rona
        // data.PLATFORM_SHOPIFY = 9;//Shopify
        // data.PLATFORM_WALMART = 10;//Walmart
        // data.PLATFORM_HOUZZ = 11;//Houzz
        // data.PLATFORM_Macy = 12;//Macy's
        // data.PLATFORM_OBERSTOCK = 13;//Overstock
        // data.PLATFORM_TEMU = 14;//Temu
        // data.PLATFORM_CDISCOUNT = 15;//Cdiscount
        // data.PLATFORM_EBAY = 16;//ebay
        // data.PLATFORM_OZON = 17;//Ozon
        // data.PLATFORM_TIKTOK = 18;//Tiktok
        //
        // //科目
        // data.S_ACCOUNT_YJSF_JXSEWKP = 126;//应交税费_应交增值税_进项税额-未开票
        // data.ACCOUNT_YSZK_YFMXKHPGYS = 299;//应付账款_应付明细款-货物供应商
        // data.S_ACCOUNT_YFZK_HWGYS = 901;//预付账款-货物供应商
        // data.S_ACCOUNT_YFZK = 500;//应付账款
        // data.S_ACCOUNT_YJSF_JXSE = 629;//应交税费_应交增值税_进项税额
        // data.S_ACCOUNT_YSZK = 208;//2203	预收账款
        //
        // //亚马逊
        // data.TERMS_1 = 1;//30%定金，70%尾款到发货
        // data.TERMS_2 = 2;//120天账期
        // data.TERMS_3 = 3;//出货前付全款
        // data.TERMS_4 = 4;//70天账期
        // data.TERMS_5 = 5;//90天账期
        // data.TERMS_6 = 6;//75天账期
        // data.TERMS_7 = 7;//60天账期
        // data.TERMS_8 = 8;//55天账期
        // data.TERMS_9 = 9;//次月月底结算
        // data.TERMS_10 = 10;//次月15号结算
        // data.TERMS_11 = 11;//次月20号结算
        // data.TERMS_12 = 12;//30%定金，70%到港前支付
        // data.TERMS_13 = 13;//20%定金，80%到港前支付
        // data.TERMS_14 = 14;//当月到港当月结
        // data.TERMS_15 = 15;//预付30%，70%出货后30天结算
        // data.TERMS_16 = 16;//30%定金，发货后次月20号前支付70%尾款
        // data.TERMS_17 = 17;//当月到港月底结算
        // data.TERMS_18 = 18;//预充值
        // data.TERMS_19 = 19;//次月月结

        // // 审批状态（采/物）
        // data.spztcw_dtj = 1;//1	待提交
        //自定义记录
        //data.S_CUSTOMRECORD_YSKSQD = 300;//预收款申请单
        //
        // //表单
        // data.FORM_PO = 103;//DeerValley_采购订单
        // data.FORM_PO_FEE = 102;//DeerValley_采购订单_费用类
        //
        // //费用类型及货品相关
        // data.FEE_TYPE_RKF = 104;//入库操作费，中类内部ID
        // data.FEE_TYPE_BXF = 106;//海运保险费，中类内部ID
        // data.FEE_TYPE_JKGS = 107;//目的国进口关税，中类内部ID
        // data.FEE_TYPE_MDGQGF = 109;//目的港清关费，中类内部ID
        // data.FEE_TYPE_MDGHDF = 110;//目的港货代费，中类内部ID
        // data.FEE_TYPE_GS = 235;//关税，小类内部ID
        // data.FEE_TYPE_MDGQGDLF = 224;//目的港清关代理费，小类内部ID
        // data.feeItemByName = {
        //     '102': 3730, '101': 3729, '103': 3731, '106': 3734, '105': 3115,
        //     '109': 3733, '107': 3735, '110': 3738, '108': 3736, '104': 3732
        // };
        // data.actualFeeCfg = {
        //     '102': { amtField: 'custrecord_swc_wl_d_sj_trailer_fee', curField: 'custrecord_swc_wl_d_sj_trailer_fee_c' },
        //     '101': { amtField: 'custrecord_swc_wl_d_sj_cda_fee', curField: 'custrecord_swc_wl_d_sj_cda_fee_c' },
        //     '103': { amtField: 'custrecord_swc_wl_d_sj_ffc', curField: 'custrecord_swc_wl_d_sj_ffc_c' },
        //     '106': { amtField: 'custrecord_swc_wl_d_sj_bxf_fee', curField: 'custrecord_swc_wl_d_sj_bxf_fee_c' },
        //     '105': { amtField: 'custrecord_swc_actual_first_leg_cost', curField: 'custrecord_swc_actual_firs_leg_cost' },
        //     '109': { amtField: 'custrecord_swc_wl_d_sj_qgf_fee', curField: 'custrecord_swc_wl_d_sj_qgf_fee_c' },
        //     '107': { amtField: 'custrecord_swc_wl_d_sj_jkgs_fee', curField: 'custrecord_swc_wl_d_sj_jkgs_fee_c' },
        //     '110': { amtField: 'custrecord_swc_wl_d_sj_hdf_fee', curField: 'custrecord_swc_wl_d_sj_hdf_fee_c' },
        //     '108': { amtField: 'custrecord_swc_wl_d_sj_tcf_fee', curField: 'custrecord_swc_wl_d_sj_tcf_fee_c' },
        //     '104': { amtField: 'custrecord_swc_wl_d_sj_rkcz_fee', curField: 'custrecord_swc_wl_d_sj_rkcz_fee_c' }
        // };
        // data.FEE_CFG = {
        //     102: { amtField: 'custrecord_swc_cg_d_em_trailer_fee', curField: 'custrecord_swc_cg_d_em_trailer_fee_c' },
        //     101: { amtField: 'custrecord_swc_cg_d_em_cda_fee', curField: 'custrecord_swc_cg_d_em_cda_fee_c' },
        //     103: { amtField: 'custrecord_swc_cg_d_em_ffc', curField: 'custrecord_swc_cg_d_em_ffc_c' },
        //     106: { amtField: 'custrecord_swc_cg_d_em_bxf_fee', curField: 'custrecord_swc_cg_d_em_bxf_fee_c' },
        //     105: { amtField: 'custrecord_swc_cg_d_em_hyf_fee', curField: 'custrecord_swc_cg_d_em_hyf_fee_c' },
        //     109: { amtField: 'custrecord_swc_cg_d_em_qgf_fee', curField: 'custrecord_swc_cg_d_em_qgf_fee_c' },
        //     107: { amtField: 'custrecord_swc_cg_d_em_jkgs_fee', curField: 'custrecord_swc_cg_d_em_jkgs_fee_c' },
        //     110: { amtField: 'custrecord_swc_cg_d_em_hdf_fee', curField: 'custrecord_swc_cg_d_em_hdf_fee_c' },
        //     108: { amtField: 'custrecord_swc_cg_d_em_tcf_fee', curField: 'custrecord_swc_cg_d_em_tcf_fee_c' },
        //     104: { amtField: 'custrecord_swc_cg_d_em_rkcz_fee', curField: 'custrecord_swc_cg_d_em_rkcz_fee_c' }
        // };

        function configData() {
            return data;
        }

        return {
            configData: configData,
        };

    });