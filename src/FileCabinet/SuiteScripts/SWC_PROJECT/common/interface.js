/**
 *@NApiVersion 2.1
 *@NModuleScope public
 *@description  接口脚本
 *@name interface.min.js
 */
define(['N/record', 'N/search', 'N/format', './moment', 'N/runtime', 'N/config', 'N/email', 'N/error', 'N/https'],
    function (record, search, format, moment, runtime, config, email, error, https) {

        const fieldsMapping = {
            "_LIST_ORDERS_": {
                "record_type_id": 'salesorder',
                "mapping": {
                    "custbody_swc_platform_order_status": "platformOrderStatus",
                    "custbody_swc_order_status": "orderStatus",
                    "custbody_swc_order_type": "orderType",
                    "custbody_swc_platform_market_id": "platformMarketId",
                    "custbody_swc_platform_order_number": "platformOrderNumber",
                    "custbody_swc_lastupdate_date": "updateTime",
                    "custbody_swc_platform_code": "platformCode",
                }
            },
            "_LIST_ORDERS_WM_": {
                "record_type_id": 'salesorder',
                "mapping": {
                    "custbody_swc_platform_order_status": "lineStatus",
                    "custbody_swc_order_status": "lineStatus",
                    "custbody_swc_order_type": "orderType",
                    "custbody_swc_platform_market_id": "marketId",
                    "custbody_swc_platform_order_number": "customerOrderId",
                    "custbody_swc_lastupdate_date": "updateTime",
                }
            },
            "_LIST_ORDERS_AZ_": {
                "record_type_id": 'salesorder',
                "mapping": {
                    "custbody_swc_platform_order_status": "orderStatus",
                    "custbody_swc_order_status": "orderStatus",
                    "custbody_swc_order_type": "orderType",
                    "custbody_swc_platform_market_id": "marketId",
                    "custbody_swc_platform_order_number": "sellerOrderId",
                    "custbody_swc_lastupdate_date": "updateDate",
                }
            },
            "_LIST_ORDERS_MP_": {
                "record_type_id": 'salesorder',
                "mapping": {
                    "custbody_swc_platform_order_status": "platformOrderStatus",
                    "custbody_swc_order_type": "orderType",
                    "custbody_swc_platform_market_id": "marketPolymerizeId",
                    "custbody_swc_platform_order_number": "platformOrderNumber",
                    "custbody_swc_lastupdate_date": "updateTime",
                    "custbody_swc_platform_code": "platformId",
                    "custbody_swc_parentordernumber": "parentOrderNumber",
                    "custbody_swc_platformoriginorderstatus": "platformOriginOrderStatus",
                }
            },
            "_LIST_VCDF_ORDERS_": {
                "record_type_id": 'salesorder',
                "mapping": {
                    "custbody_swc_platform_order_status": "orderStatus",
                    "custbody_swc_order_status": "orderStatus",
                    "custbody_swc_platform_order_number": "customerOrderNumber",
                    "custbody_swc_platform_market_id": "marketId",
                    "custbody_swc_shiptopartyid": "shipToPartyId",
                    "custbody_swc_shipfrompartyid": "shipFromPartyId",
                    "custbody_swc_sellingpartyid": "sellingPartyId",
                    "custbody_swc_billtopartyid": "billToPartyId",
                    "custbody_swc_buyingpartyid": "buyingPartyId",
                    "custbody_swc_lastupdate_date": "updateTime",
                    "custbody_swc_ship_method": "shipMethod",
                }
            },
            "_LIST_VCPO_ORDERS_": {
                "record_type_id": 'salesorder',
                "mapping": {
                    "custbody_swc_platform_order_status": "purchaseOrderState",
                    "custbody_swc_order_status": "purchaseOrderState",
                    "custbody_swc_platform_order_number": "orderId",
                    "custbody_swc_platform_market_id": "marketId",
                    "custbody_swc_shiptopartyid": "shipToPartyId",
                    "custbody_swc_shipfrompartyid": "shipFromPartyId",
                    "custbody_swc_sellingpartyid": "sellingPartyId",
                    "custbody_swc_billtopartyid": "billToPartyId",
                    "custbody_swc_buyingpartyid": "buyingPartyId",
                    "custbody_swc_lastupdate_date": "updateTime",
                    "custbody_swc_ship_method": "shipType",
                }
            },
            "_LIST_ORDER_ITEMS_": {
                "record_type_id": 'item',
                "mapping": {
                    "custcol_swc_msku": "msku",
                    "custcol_swc_asin": "asin",
                    "custcol_swc_platform_line_id": "platformId",
                    "custcol_swc_ship_fulfillment": "shipFulfillment",
                    "custcol_swc_warehousecode": "warehouseCode",
                    "custcol_swc_lastupdate_date": "updateTime",
                    "custcol_swc_shiptax": "shippingTax",
                    "custcol_swc_shipcost": "shippingPrice",
                    "custcol_swc_shipdiscount": "shippingDiscount",
                    "custcol_swc_itemtax": "itemTax",
                    "custcol_swc_giftwraptax": "giftWrapTax",
                    "custcol_swc_giftwrapprice": "giftWrapPrice",
                    "custcol_swc_promotiondiscount": "promotionDiscount",
                    "custcol_swc_sellingprice": "sellingPrice",
                }
            },
            "_LIST_ORDER_ITEMS_WM_": {
                "record_type_id": 'item',
                "mapping": {
                    "custcol_swc_msku": "itemMsku",
                    "custcol_swc_platform_line_id": "lineNumber",
                    "custcol_swc_ship_fulfillment": "shippingMethodCode",
                    "custcol_swc_warehousecode": "platformWarehouseId",
                    "custcol_swc_lastupdate_date": "updateTime",
                    "custcol_swc_shipcost": "chargeShippingPrice",
                    "custcol_swc_itemtax": "taxAmount",
                }
            },
            "_LIST_ORDER_ITEMS_AZ_": {
                "record_type_id": 'item',
                "mapping": {
                    "custcol_swc_msku": "sellerSku",
                    "custcol_swc_asin": "asin",
                    "custcol_swc_platform_line_id": "itemId",
                    "custcol_swc_lastupdate_date": "updateTime",
                    "custcol_swc_shiptax": "shippingTax",
                    "custcol_swc_shipcost": "shippingPrice",
                    "custcol_swc_shipdiscount": "shippingDiscount",
                    "custcol_swc_itemtax": "itemTax",
                    "custcol_swc_giftwraptax": "giftWrapTax",
                    "custcol_swc_giftwrapprice": "giftWrapPrice",
                    "custcol_swc_promotiondiscount": "promotionDiscount",
                    "custcol_swc_sellingprice": "sellingPrice",
                }
            },
            "_LIST_ORDER_ITEMS_MP_": {
                "record_type_id": 'item',
                "mapping": {
                    "custcol_swc_msku": "msku",
                    "custcol_swc_platform_line_id": "platformOrderLineId",
                    "custcol_swc_ship_fulfillment": "buyerChooseLogistics",
                    "custcol_swc_warehousecode": "warehouseCode",
                }
            },
            "_LIST_VCDF_ORDER_ITEMS_": {
                "record_type_id": 'item',
                "mapping": {
                    "custcol_swc_msku": "msku",
                    "custcol_swc_asin": "asin",
                    "custcol_swc_platform_line_id": "itemSequenceNumber",
                    "custcol_swc_itemtax": "tax",
                }
            },
            "_LIST_VCPO_ORDER_ITEMS_": {
                "record_type_id": 'item',
                "mapping": {
                    "custcol_swc_msku": "msku",
                    "custcol_swc_asin": "asin",
                    "custcol_swc_platform_line_id": "itemSequenceNumber",
                    "custcol_swc_itemtax": "tax",
                }
            },
            "_FBA_SHIPMENT_": {
                "record_type_id": 'customrecord_swc_jj_fba_shipment',
                "mapping": {
                    "custrecord_swc_jj_fs_id": "id",
                    "custrecord_swc_jj_fs_marketid": "marketId",
                    "custrecord_swc_jj_fs_market_name": "marketName",
                    "custrecord_swc_jj_fs_order_id": "orderId",
                    "custrecord_swc_jj_fs_image_url": "imageUrl",
                    "custrecord_swc_jj_fs_listing_title": "listingTitle",
                    "custrecord_swc_jj_fs_produce_name": "produceName",
                    "custrecord_swc_jj_fs_seller_order_id": "sellerOrderId",
                    "custrecord_swc_jj_fs_shipment_id": "shipmentId",
                    "custrecord_swc_jj_fs_shipment_item_id": "shipmentItemId",
                    "custrecord_swc_jj_fs_order_item_id": "orderItemId",
                    "custrecord_swc_jj_fs_sku": "sku",
                    "custrecord_swc_jj_fs_buyer_email": "buyerEmail",
                    "custrecord_swc_jj_fs_buyer_name": "buyerName",
                    "custrecord_swc_jj_fs_mksu": "msku",
                    "custrecord_swc_jj_fs_quantity_shipped": "quantityShipped",
                    "custrecord_swc_jj_fs_sales_channel": "salesChannel",
                    "custrecord_swc_jj_fs_currency": "currency",
                    "custrecord_swc_jj_fs_item_price": "itemPrice",
                    "custrecord_swc_jj_fs_item_tax": "itemTax",
                    "custrecord_swc_jj_fs_shipping_price": "shippingPrice",
                    "custrecord_swc_jj_fs_gift_wrap_price": "giftWrapPrice",
                    "custrecord_swc_jj_fs_shipping_tax": "shippingTax",
                    "custrecord_swc_jj_fs_gift_wrap_tax": "giftWrapTax",
                    "custrecord_swc_jj_fs_item_pt_discount": "itemPromotionDiscount",
                    "custrecord_swc_jj_fs_ship_pt_discount": "shipPromotionDiscount",
                    "custrecord_swc_jj_fs_product_name": "productName",
                    "custrecord_swc_jj_fs_ship_service_level": "shipServiceLevel",
                    "custrecord_swc_jj_fs_recipient_name": "recipientName",
                    "custrecord_swc_jj_fs_ship_address_1": "shipAddress1",
                    "custrecord_swc_jj_fs_ship_address_2": "shipAddress2",
                    "custrecord_swc_jj_fs_ship_address_3": "shipAddress3",
                    "custrecord_swc_jj_fs_ship_city": "shipCity",
                    "custrecord_swc_jj_fs_ship_state": "shipState",
                    "custrecord_swc_jj_fs_ship_postal_code": "shipPostalCode",
                    "custrecord_swc_jj_fs_ship_country": "shipCountry",
                    "custrecord_swc_jj_fs_ship_phone_number": "shipPhoneNumber",
                    "custrecord_swc_jj_fs_carrier": "carrier",
                    "custrecord_swc_jj_fs_tracking_number": "trackingNumber",
                    "custrecord_swc_jj_fs_fulfillmentcenterid": "fulfillmentCenterId",
                    "custrecord_swc_jj_fs_purchase_date_text": "purchaseDate",
                    "custrecord_swc_jj_fs_purchase_date_zero": "purchaseDateZero",
                    "custrecord_swc_jj_fs_payments_date_text": "paymentsDate",
                    "custrecord_swc_jj_fs_payments_date_zero": "paymentsDateZero",
                    "custrecord_swc_jj_fs_shipment_date_text": "shipmentDate",
                    "custrecord_swc_jj_fs_shipment_date_zero": "shipmentDateZero",
                    "custrecord_swc_jj_fs_ea_date_text": "estimatedArrivalDate",
                    "custrecord_swc_jj_fs_ea_date_zero": "estimatedArrivalDateZero",
                    "custrecord_swc_jj_fs_update_date_text": "updateDate",
                    "custrecord_swc_jj_fs_sp_warehouse_id": "shipmentWarehouseId",
                    "custrecord_swc_jj_fs_sp_warehouse_name": "shipmentWarehouseName",
                    "custrecord_swc_jj_fs_order_type": "orderType",
                    "custrecord_swc_jj_fs_create_time_text": "createTime",
                    "custrecord_swc_jj_fs_update_time_text": "updateTime",
                }
            },
            "_ZFH_SHIPMENT_": {
                "record_type_id": 'customrecord_swc_jj_zfh_shipment',
                "mapping": {
                    "custrecord_swc_jj_zs_id": "id",
                    "custrecord_swc_jj_zs_access_mode": "accessMode",
                    "custrecord_swc_jj_zs_customer_package_no": "customerPackageNo",
                    "custrecord_swc_jj_zs_country_code": "countryCode",
                    "custrecord_swc_jj_zs_delivery_time": "deliveryTimeMarket",
                    "custrecord_swc_jj_zs_fo_order_no": "foOrderNo",
                    "custrecord_swc_jj_zs_fo_order_status": "foOrderStatus",
                    "custrecord_swc_jj_zs_order_type": "orderType",
                    "custrecord_swc_jj_zs_package_no": "packageNo",
                    "custrecord_swc_jj_zs_shop_id": "shopId",
                    "custrecord_swc_jj_zs_shop_name": "shopName",
                    "custrecord_swc_jj_zs_market_id": "marketId",
                    "custrecord_swc_jj_zs_so_order_no": "soOrderNo",
                    "custrecord_swc_jj_zs_source_channel": "sourceChannel",
                    "custrecord_swc_jj_zs_delivery_method": "deliveryMethod",
                    "custrecord_swc_jj_zs_source_order_no": "sourceOrderNo",
                    "custrecord_swc_jj_zs_warehouse_id": "warehouseId",
                    "custrecord_swc_jj_zs_warehouse_name": "warehouseName",
                    "custrecord_swc_jj_zs_fo_order_line_no": "foOrderLineNo",
                    "custrecord_swc_jj_zs_msku": "msku",
                    "custrecord_swc_jj_zs_quantity": "quantity",
                    "custrecord_swc_jj_zs_valid_quantity": "validQuantity",
                    "custrecord_swc_jj_zs_package_line_no": "packageLineNo",
                    "custrecord_swc_jj_zs_so_order_detail_id": "soOrderDetailId",
                    "custrecord_swc_jj_zs_source_line_no": "sourceLineNo",
                    "custrecord_swc_jj_zs_third_sku": "thirdSku",
                    "custrecord_swc_jj_zs_sku": "sku",
                    "custrecord_swc_jj_zs_detail_status": "detailStatus",
                    "custrecord_swc_jj_zs_erp_order_line_no": "erpOrderLineNo",
                }
            },
            "_STORAGE_FEE_": {
                "record_type_id": 'customrecord_swc_storage_fee_report',
                "mapping": {
                    "custrecord_swc_sfr_asinurl": "asinUrl",
                    "custrecord_swc_sfr_smallimageurl": "smallImageUrl",
                    "custrecord_swc_sfr_normalimageurl": "normalImageUrl",
                    "custrecord_swc_sfr_title": "title",
                    "custrecord_swc_sfr_id": "id",
                    "custrecord_swc_sfr_serverid": "serverId",
                    "custrecord_swc_sfr_asin": "asin",
                    "custrecord_swc_sfr_fnsku": "fnsku",
                    "custrecord_swc_sfr_sku": "sku",
                    "custrecord_swc_sfr_msku": "sellerSku",
                    "custrecord_swc_sfr_productname": "productName",
                    "custrecord_swc_sfr_fulfillmentcenter": "fulfillmentCenter",
                    "custrecord_swc_sfr_countrycode": "countryCode",
                    "custrecord_swc_sfr_longestside": "longestSide",
                    "custrecord_swc_sfr_medianside": "medianSide",
                    "custrecord_swc_sfr_shortestside": "shortestSide",
                    "custrecord_swc_sfr_measurementunits": "measurementUnits",
                    "custrecord_swc_sfr_weight": "weight",
                    "custrecord_swc_sfr_weightunits": "weightUnits",
                    "custrecord_swc_sfr_itemvolume": "itemVolume",
                    "custrecord_swc_sfr_volumeunits": "volumeUnits",
                    "custrecord_swc_sfr_productsizetier": "productSizeTier",
                    "custrecord_swc_sfr_averagequantityonhand": "averageQuantityOnHand",
                    "custrecord_swc_sfr_agqty_pendingremoval": "averageQuantityPendingRemoval",
                    "custrecord_swc_sfr_estimatedtotalitemvol": "estimatedTotalItemVolume",
                    "custrecord_swc_sfr_monthofcharge": "monthOfCharge",
                    "custrecord_swc_sfr_storagerate": "storageRate",
                    "custrecord_swc_sfr_currency": "currency",
                    "custrecord_swc_sfr_est_monthlystoragefee": "estimatedMonthlyStorageFee",
                    "custrecord_swc_sfr_marketid": "marketId",
                    "custrecord_swc_sfr_category": "category",
                    "custrecord_swc_sfr_brand": "brand",
                    "custrecord_swc_sfr_year": "year",
                    "custrecord_swc_sfr_month": "month",
                    "custrecord_swc_sfr_storagefee": "storageFee",
                }
            },
            "_STORAGE_LONG_FEE_": {
                "record_type_id": 'customrecord_swc_storage_fee_report',
                "mapping": {
                    "custrecord_swc_sfr_asinurl": "asinUrl",
                    "custrecord_swc_sfr_smallimageurl": "smallImageUrl",
                    "custrecord_swc_sfr_normalimageurl": "normalImageUrl",
                    "custrecord_swc_sfr_title": "title",
                    "custrecord_swc_sfr_serverid": "serverId",
                    "custrecord_swc_sfr_asin": "asin",
                    "custrecord_swc_sfr_fnsku": "fnsku",
                    "custrecord_swc_sfr_sku": "sku",
                    "custrecord_swc_sfr_productname": "productName",
                    "custrecord_swc_sfr_currency": "currency",
                    "custrecord_swc_sfr_marketid": "marketId",
                    "custrecord_swc_sfr_category": "category",
                    "custrecord_swc_sfr_brand": "brand",
                    "custrecord_swc_sfr_year": "year",
                    "custrecord_swc_sfr_month": "month",
                    "custrecord_swc_sfr_msku": "msku",
                    "custrecord_swc_sfr_condition": "condition",
                    "custrecord_swc_sfr_quantity12more": "quantity12More",
                    "custrecord_swc_sfr_storagefee12more": "storageFee12More",
                    "custrecord_swc_sfr_quantity6more": "quantity6More",
                    "custrecord_swc_sfr_storagefee6more": "storageFee6More",
                    "custrecord_swc_sfr_perunitvolume": "perUnitVolume",
                    "custrecord_swc_sfr_enrolledsmallandlight": "enrolledSmallAndLight",
                    "custrecord_swc_sfr_countrycode": "country",
                    "custrecord_swc_sfr_volumeunits": "volumeUnit",
                    "custrecord_swc_sfr_id": "id",
                }
            },
            "_FBM_RETURN_ORDERE_": {
                "record_type_id": 'customrecord_swc_jj_return_order_cache',
                "mapping": {
                    "custrecord_swc_jj_roc_id": "id",
                    "custrecord_swc_jj_roc_sourcechannel": "sourceChannel",
                    "custrecord_swc_jj_roc_sourcereturncode": "sourceReturnCode",
                    "custrecord_swc_jj_roc_sourcecode": "sourceCode",
                    "custrecord_swc_jj_roc_returncode": "returnCode",
                    "custrecord_swc_jj_roc_returnstatus": "returnStatus",
                    "custrecord_swc_jj_roc_accessmode": "accessMode",
                    "custrecord_swc_jj_roc_returntype": "returnType",
                    "custrecord_swc_jj_roc_returnreason": "returnReason",
                    "custrecord_swc_jj_roc_shopid": "shopId",
                    "custrecord_swc_jj_roc_marketid": "marketId",
                    "custrecord_swc_jj_roc_returnordertime": "returnOrderTime",
                    "custrecord_swc_jj_roc_expectedarrivaltim": "expectedArrivalTime",
                    "custrecord_swc_jj_roc_logisticstype": "logisticsType",
                    "custrecord_swc_jj_roc_logisticschannel": "logisticsChannel",
                    "custrecord_swc_jj_roc_logisticsno": "logisticsNo",
                    "custrecord_swc_jj_roc_returnwarehouseid": "returnWarehouseId",
                    "custrecord_swc_jj_roc_returnwarehousenam": "returnWarehouseName",
                    "custrecord_swc_jj_roc_actualinboundtime": "actualInboundTime",
                    "custrecord_swc_jj_roc_createtime": "createTime",
                    "custrecord_swc_jj_roc_updatetime": "updateTime",
                    "custrecord_swc_jj_roc_currency": "currency",
                    "custrecord_swc_jj_roc_returnamount": "returnAmount",
                    "custrecord_swc_jj_roc_returnquantity": "returnQuantity",
                    "custrecord_swc_jj_roc_sellerremark": "sellerRemark",
                }
            },
            "_ADVERTISEMENT_REPORT_": {
                "record_type_id": 'customrecord_swc_jj_advertisement_report',
                "mapping": {
                    "custrecord_swc_jj_adv_id": "id",
                    "custrecord_swc_jj_adv_hash": "hash",
                    "custrecord_swc_jj_adv_marketid": "marketId",
                    "custrecord_swc_jj_adv_portfolioid": "portfolioId",
                    "custrecord_swc_jj_adv_portfolioname": "portfolioName",
                    // "custrecord_swc_jj_adv_campaignid": "campaignId",
                    "custrecord_swc_jj_adv_campaignname": "campaignName",
                    "custrecord_swc_jj_adv_groupid": "groupId",
                    "custrecord_swc_jj_adv_groupname": "groupName",
                    "custrecord_swc_jj_adv_imageurl": "imageUrl",
                    "custrecord_swc_jj_adv_listingtitle": "listingTitle",
                    "custrecord_swc_jj_adv_adid": "adId",
                    "custrecord_swc_jj_adv_grouptargetingtype": "groupTargetingType",
                    "custrecord_swc_jj_adv_msku": "msku",
                    "custrecord_swc_jj_adv_asin": "asin",
                    "custrecord_swc_jj_adv_state": "state",
                    "custrecord_swc_jj_adv_servingstatus": "servingStatus",
                    "custrecord_swc_jj_adv_adstype": "adsType",
                    "custrecord_swc_jj_adv_budgettype": "budgetType",
                    "custrecord_swc_jj_adv_budget": "budget",
                    "custrecord_swc_jj_adv_placement": "placement",
                    "custrecord_swc_jj_adv_costtype": "costType",
                    "custrecord_swc_jj_adv_createdate_text": "createDate",
                    "custrecord_swc_jj_adv_startdate_text": "startDate",
                    "custrecord_swc_jj_adv_enddate_text": "endDate",
                    "custrecord_swc_jj_adv_impressions": "impressions",
                    "custrecord_swc_jj_adv_clicks": "clicks",
                    "custrecord_swc_jj_adv_cost": "cost",
                    "custrecord_swc_jj_adv_adsorders": "adsOrders",
                    "custrecord_swc_jj_adv_adssales": "adsSales",
                    "custrecord_swc_jj_adv_adsproductorders": "adsProductOrders",
                    "custrecord_swc_jj_adv_adsproductsales": "adsProductSales",
                    "custrecord_swc_jj_adv_otherproductsales": "otherProductSales",
                    "custrecord_swc_jj_adv_ctr": "ctr",
                    "custrecord_swc_jj_adv_cpc": "cpc",
                    "custrecord_swc_jj_adv_cvr": "cvr",
                    "custrecord_swc_jj_adv_cpa": "cpa",
                    "custrecord_swc_jj_adv_acos": "acos",
                    "custrecord_swc_jj_adv_roas": "roas",
                    "custrecord_swc_jj_adv_viewimpressions": "viewImpressions",
                    "custrecord_swc_jj_adv_cpv": "cpv",
                    "custrecord_swc_jj_adv_newbuyerorders": "newBuyerOrders",
                    "custrecord_swc_jj_adv_newbuyersales": "newBuyerSales",
                    "custrecord_swc_jj_adv_pageviews": "pageViews",
                    "custrecord_swc_jj_adv_newbuyerorderratio": "newBuyerOrderRatio",
                    "custrecord_swc_jj_adv_newbuyersaleratio": "newBuyerSaleRatio",
                    "custrecord_swc_jj_adv_vcpm": "vcpm",
                }
            },
            "_REMOVAL_ORDERE_": {
                "record_type_id": 'customrecord_swc_jj_removal_order',
                "mapping": {
                    "custrecord_swc_jj_ro_id": "id",
                    "custrecord_swc_jj_ro_orderid": "orderId",
                    "custrecord_swc_jj_ro_businesskey": "businessKey",
                    "custrecord_swc_jj_ro_closebutton": "closeButton",
                    "custrecord_swc_jj_ro_createway": "createWay",
                    "custrecord_swc_jj_ro_inventorybutton": "inventoryButton",
                    "custrecord_swc_jj_ro_marketid": "marketId",
                    "custrecord_swc_jj_ro_orderstatuskey": "orderStatusKey",
                    "custrecord_swc_jj_ro_orderstatusvalue": "orderStatusValue",
                    "custrecord_swc_jj_ro_ordertotalquantity": "orderTotalQuantity",
                    "custrecord_swc_jj_ro_otherquantity": "otherQuantity",
                    "custrecord_swc_jj_ro_pendingquantity": "pendingQuantity",
                    "custrecord_swc_jj_ro_cancelledquantity": "cancelledQuantity",
                    "custrecord_swc_jj_ro_shippedquantity": "shippedQuantity",
                    "custrecord_swc_jj_ro_removewaykey": "removeWayKey",
                    "custrecord_swc_jj_ro_removewayvalue": "removeWayValue",
                    "custrecord_swc_jj_ro_returnwarehouseid": "returnWarehouseId",
                    "custrecord_swc_jj_ro_returnwarehousename": "returnWarehouseName",
                    "custrecord_swc_jj_ro_shipwarehouseid": "shipWarehouseId",
                    "custrecord_swc_jj_ro_shipwarehousename": "shipWarehouseName",
                    "custrecord_swc_jj_ro_requesttime": "requestTime",
                    "custrecord_swc_jj_ro_updatetime": "updateTime",
                }
            },
            "_REMOVAL_ORDERE_DETAIL_": {
                "record_type_id": 'customrecord_swc_jj_removal_order_detail',
                "mapping": {
                    "custrecord_swc_jj_ord_id": "id",
                    "custrecord_swc_jj_ord_cancelledquantity": "cancelledQuantity",
                    "custrecord_swc_jj_ord_currency": "currency",
                    "custrecord_swc_jj_ord_disposedamount": "disposedAmount",
                    "custrecord_swc_jj_ord_disposedquantity": "disposedQuantity",
                    "custrecord_swc_jj_ord_disposition": "disposition",
                    "custrecord_swc_jj_ord_fnsku": "fnsku",
                    "custrecord_swc_jj_ord_img": "img",
                    "custrecord_swc_jj_ord_inprocessquantity": "inProcessQuantity",
                    "custrecord_swc_jj_ord_lastupdateddate": "lastUpdatedDate",
                    "custrecord_swc_jj_ord_listingtitle": "listingTitle",
                    "custrecord_swc_jj_ord_msku": "msku",
                    "custrecord_swc_jj_ord_orderid": "orderId",
                    "custrecord_swc_jj_ord_orderstatus": "orderStatus",
                    "custrecord_swc_jj_ord_ordertype": "orderType",
                    "custrecord_swc_jj_ord_quantity": "quantity",
                    "custrecord_swc_jj_ord_removalfee": "removalFee",
                    "custrecord_swc_jj_ord_removalfeeamount": "removalFeeAmount",
                    "custrecord_swc_jj_ord_removalfeeusd": "removalFeeUsd",
                    "custrecord_swc_jj_ord_removalfeeusdamoun": "removalFeeUsdAmount",
                    "custrecord_swc_jj_ord_requestdate": "requestDate",
                    "custrecord_swc_jj_ord_recorddate": "recordDate",
                    "custrecord_swc_jj_ord_requestedquantity": "requestedQuantity",
                    "custrecord_swc_jj_ord_shippedquantity": "shippedQuantity",
                    "custrecord_swc_jj_ord_sku": "sku",
                    "custrecord_swc_jj_ord_tz_requestdate": "timezoneRequestDate",
                    "custrecord_swc_jj_ord_totalcost": "totalCost",
                    "custrecord_swc_jj_ord_totalcostamount": "totalCostAmount",
                    "custrecord_swc_jj_ord_usdarrivecost": "usdArriveCost",
                    "custrecord_swc_jj_ord_usdarrivecostamoun": "usdArriveCostAmount",
                    "custrecord_swc_jj_ord_usdcost": "usdCost",
                    "custrecord_swc_jj_ord_usdcostamount": "usdCostAmount",
                    "custrecord_swc_jj_ord_warehouseid": "warehouseId",
                }
            },
            "_DATE_RANGE_REPORTS_": {
                "record_type_id": 'customrecord_swc_jj_date_range_reports',
                "mapping": {
                    "custrecord_swc_jj_drr_id": "id",
                    "custrecord_swc_jj_drr_marketid": "marketId",
                    "custrecord_swc_jj_drr_marketname": "marketName",
                    "custrecord_swc_jj_drr_currency": "currency",
                    "custrecord_swc_jj_drr_currencysymbol": "currencySymbol",
                    "custrecord_swc_jj_drr_createdate": "createDate",
                    "custrecord_swc_jj_drr_standarddate": "standardDate",
                    "custrecord_swc_jj_drr_marketdate": "marketDate",
                    "custrecord_swc_jj_drr_updatedate": "updateDate",
                    "custrecord_swc_jj_drr_zerodate": "zeroDate",
                    "custrecord_swc_jj_drr_settlementid": "settlementId",
                    "custrecord_swc_jj_drr_ordertype": "orderType",
                    "custrecord_swc_jj_drr_type": "type",
                    "custrecord_swc_jj_drr_feetype": "feeType",
                    "custrecord_swc_jj_drr_orderid": "orderId",
                    "custrecord_swc_jj_drr_saleordertype": "saleOrderType",
                    "custrecord_swc_jj_drr_testorder": "testOrder",
                    "custrecord_swc_jj_drr_testordername": "testOrderName",
                    "custrecord_swc_jj_drr_sku": "sku",
                    "custrecord_swc_jj_drr_originsku": "originSku",
                    "custrecord_swc_jj_drr_product": "product",
                    "custrecord_swc_jj_drr_description": "description",
                    "custrecord_swc_jj_drr_quantity": "quantity",
                    "custrecord_swc_jj_drr_marketplace": "marketplace",
                    "custrecord_swc_jj_drr_fulfillment": "fulfillment",
                    "custrecord_swc_jj_drr_countrycode": "countryCode",
                    "custrecord_swc_jj_drr_countryname": "countryName",
                    "custrecord_swc_jj_drr_ordercity": "orderCity",
                    "custrecord_swc_jj_drr_orderstate": "orderState",
                    "custrecord_swc_jj_drr_orderpostal": "orderPostal",
                    "custrecord_swc_jj_drr_taxcollectionmodel": "taxCollectionModel",
                    "custrecord_swc_jj_drr_productsales": "productSales",
                    "custrecord_swc_jj_drr_productsalestax": "productSalesTax",
                    "custrecord_swc_jj_drr_shippingcredits": "shippingCredits",
                    "custrecord_swc_jj_drr_shippingcreditstax": "shippingCreditsTax",
                    "custrecord_swc_jj_drr_giftwrapcredits": "giftWrapCredits",
                    "custrecord_swc_jj_drr_giftwrapcreditstax": "giftWrapCreditsTax",
                    "custrecord_swc_jj_drr_regulatoryfee": "regulatoryFee",
                    "custrecord_swc_jj_drr_regulatoryfeetax": "regulatoryFeeTax",
                    "custrecord_swc_jj_drr_promotionalrebates": "promotionalRebates",
                    "custrecord_swc_jj_drr_pmt_rebates_tax": "promotionalRebatesTax",
                    "custrecord_swc_jj_drr_pointsgranted": "pointsGranted",
                    "custrecord_swc_jj_drr_mp_withheld_tax": "marketplaceWithheldTax",
                    "custrecord_swc_jj_drr_sellingfees": "sellingFees",
                    "custrecord_swc_jj_drr_fbafees": "fbaFees",
                    "custrecord_swc_jj_drr_other_tsc_fee": "otherTransactionFees",
                    "custrecord_swc_jj_drr_other": "other",
                    "custrecord_swc_jj_drr_total": "total",
                    "custrecord_swc_jj_drr_tcscgst": "tcscgst",
                    "custrecord_swc_jj_drr_tcssgst": "tcssgst",
                    "custrecord_swc_jj_drr_tcsigst": "tcsigst",
                    "custrecord_swc_jj_drr_tds": "tds",
                }
            },
            "_VC_DF_ORDER_": {
                "record_type_id": 'customrecord_swc_jj_vc_df_order',
                "mapping": {
                    "custrecord_swc_jj_vcdf_abnormalinfo": "abnormalInfo",
                    "custrecord_swc_jj_vcdf_abnormallist": "abnormalList",
                    "custrecord_swc_jj_vcdf_billtopartyid": "billToPartyId",
                    "custrecord_swc_jj_vcdf_buyingpartyid": "buyingPartyId",
                    "custrecord_swc_jj_vcdf_customer_o_number": "customerOrderNumber",
                    "custrecord_swc_jj_vcdf_id": "id",
                    "custrecord_swc_jj_vcdf_isgift": "isGift",
                    "custrecord_swc_jj_vcdf_ispriorityshipmen": "isPriorityShipment",
                    "custrecord_swc_jj_vcdf_ispsliprequired": "isPslipRequired",
                    "custrecord_swc_jj_vcdf_is_sds": "isScheduledDeliveryShipment",
                    "custrecord_swc_jj_vcdf_labelprintstatus": "labelPrintStatus",
                    "custrecord_swc_jj_vcdf_labelreqstatus": "labelReqStatus",
                    "custrecord_swc_jj_vcdf_marketid": "marketId",
                    "custrecord_swc_jj_vcdf_od": "orderDate",
                    "custrecord_swc_jj_vcdf_ordererrorcode": "orderErrorCode",
                    "custrecord_swc_jj_vcdf_ordererrorname": "orderErrorCodeName",
                    "custrecord_swc_jj_vcdf_orderid": "orderId",
                    "custrecord_swc_jj_vcdf_orderstatus": "orderStatus",
                    "custrecord_swc_jj_vcdf_pdd": "promisedDeliveryDate",
                    "custrecord_swc_jj_vcdf_po_number": "purchaseOrderNumber",
                    "custrecord_swc_jj_vcdf_rsd": "requiredShipDate",
                    "custrecord_swc_jj_vcdf_sellingparty": "sellingParty",
                    "custrecord_swc_jj_vcdf_sellingpartyid": "sellingPartyId",
                    "custrecord_swc_jj_vcdf_shipfrompartyid": "shipFromPartyId",
                    "custrecord_swc_jj_vcdf_shipmethod": "shipMethod",
                    "custrecord_swc_jj_vcdf_shiptoparty": "shipToParty",
                    "custrecord_swc_jj_vcdf_shiptopartyid": "shipToPartyId",
                    "custrecord_swc_jj_vcdf_syncstatusname": "syncStatusName",
                    "custrecord_swc_jj_vcdf_updatetime": "updateTime",
                    "custrecord_swc_jj_vcdf_warehouseid": "warehouseId",
                }
            },
            "_VC_PO_ORDER_": {
                "record_type_id": 'customrecord_swc_jj_vc_po_order',
                "mapping": {
                    "custrecord_swc_jj_vcpo_acceptedquantity": "acceptedQuantity",
                    "custrecord_swc_jj_vcpo_ackstatus": "ackStatus",
                    "custrecord_swc_jj_vcpo_billtopartyid": "billToPartyId",
                    "custrecord_swc_jj_vcpo_buyingpartyid": "buyingPartyId",
                    "custrecord_swc_jj_vcpo_dealcode": "dealCode",
                    "custrecord_swc_jj_vcpo_deliverywindowend": "deliveryWindowEnd",
                    "custrecord_swc_jj_vcpo_deliverywindowsta": "deliveryWindowStart",
                    "custrecord_swc_jj_vcpo_id": "id",
                    "custrecord_swc_jj_vcpo_invoicestatus": "invoiceStatus",
                    "custrecord_swc_jj_vcpo_marketid": "marketId",
                    "custrecord_swc_jj_vcpo_orderid": "orderId",
                    "custrecord_swc_jj_vcpo_orderedquantity": "orderedQuantity",
                    "custrecord_swc_jj_vcpo_paymentmethod": "paymentMethod",
                    "custrecord_swc_jj_vcpo_prordertype": "prOrderType",
                    "custrecord_swc_jj_vcpo_pocd": "purchaseOrderChangedDate",
                    "custrecord_swc_jj_vcpo_pod": "purchaseOrderDate",
                    "custrecord_swc_jj_vcpo_po_number": "purchaseOrderNumber",
                    "custrecord_swc_jj_vcpo_po_state": "purchaseOrderState",
                    "custrecord_swc_jj_vcpo_po_type": "purchaseOrderType",
                    "custrecord_swc_jj_vcpo_receivedquantity": "receivedQuantity",
                    "custrecord_swc_jj_vcpo_sellingpartyid": "sellingPartyId",
                    "custrecord_swc_jj_vcpo_sellingparty": "sellingParty",
                    "custrecord_swc_jj_vcpo_shiptopartyid": "shipToPartyId",
                    "custrecord_swc_jj_vcpo_shiptoparty": "shipToParty",
                    "custrecord_swc_jj_vcpo_stp_country_code": "shipToPartyCountryCode",
                    "custrecord_swc_jj_vcpo_shiptype": "shipType",
                    "custrecord_swc_jj_vcpo_shipwindowend": "shipWindowEnd",
                    "custrecord_swc_jj_vcpo_shipwindowstart": "shipWindowStart",
                    "custrecord_swc_jj_vcpo_updatetime": "updateTime",
                    "custrecord_swc_jj_vcpo_warehousename": "warehouseName",
                }
            },
            "_VC_PO_SHIPMENT_": {
                "record_type_id": 'customrecord_swc_jj_vc_po_shipment',
                "mapping": {
                    "custrecord_swc_jj_vcps_abnormaltype": "abnormalType",
                    "custrecord_swc_jj_vcps_abnormaltypename": "abnormalTypeName",
                    "custrecord_swc_jj_vcps_arn": "amazonReferenceNumber",
                    "custrecord_swc_jj_vcps_amzshiptype": "amzShipType",
                    "custrecord_swc_jj_vcps_assembleorder": "assembleOrder",
                    "custrecord_swc_jj_vcps_bolattachid": "bolAttachId",
                    "custrecord_swc_jj_vcps_calspec": "calSpec",
                    "custrecord_swc_jj_vcps_createtime": "createTime",
                    "custrecord_swc_jj_vcps_errmsg": "errMsg",
                    "custrecord_swc_jj_vcps_est_deliverytime": "estimatedDeliveryTime",
                    "custrecord_swc_jj_vcps_estimatedvolume": "estimatedVolume",
                    "custrecord_swc_jj_vcps_estimatedweight": "estimatedWeight",
                    "custrecord_swc_jj_vcps_marketid": "marketId",
                    "custrecord_swc_jj_vcps_outboundorder": "outboundOrder",
                    "custrecord_swc_jj_vcps_outboundtime": "outboundTime",
                    "custrecord_swc_jj_vcps_referencenumber": "referenceNumber",
                    "custrecord_swc_jj_vcps_rp_time": "requestedPickupTime",
                    "custrecord_swc_jj_vcps_sf_terms": "shipmentFreightTerms",
                    "custrecord_swc_jj_vcps_shipmentid": "shipmentId",
                    "custrecord_swc_jj_vcps_ss_status": "shipmentShippingStatus",
                    "custrecord_swc_jj_vcps_ss_statusname": "shipmentShippingStatusName",
                    "custrecord_swc_jj_vcps_shipmentstatus": "shipmentStatus",
                    "custrecord_swc_jj_vcps_shipmentstatusnam": "shipmentStatusName",
                    "custrecord_swc_jj_vcps_shippedtime": "shippedTime",
                    "custrecord_swc_jj_vcps_shippinglabelid": "shippingLabelId",
                    "custrecord_swc_jj_vcps_totalcartonqty": "totalCartonQty",
                    "custrecord_swc_jj_vcps_tps": "totalPalletStackable",
                    "custrecord_swc_jj_vcps_volumeunit": "volumeUnit",
                    "custrecord_swc_jj_vcps_weightunit": "weightUnit",
                }
            },
            "_ZFH_LOGISTICS_COST_": {
                "record_type_id": 'customrecord_swc_jj_zfh_logistics_cost',
                "mapping": {
                    "custrecord_swc_jjzlc_relevancecode": "relevanceCode",
                    "custrecord_swc_jjzlc_foordercode": "foOrderCode",
                    "custrecord_swc_jjzlc_sourcecode": "sourceCode",
                    "custrecord_swc_jjzlc_platformsourcecode": "platformSourceCode",
                    "custrecord_swc_jjzlc_logisticstype": "logisticsType",
                    "custrecord_swc_jjzlc_platformid": "platformId",
                }
            },
            "_ZFH_LOGISTICS_COST_CS_": {
                "record_type_id": 'customrecord_swc_jj_zfh_lc_costsharevoli',
                "mapping": {
                    "custrecord_swc_jj_zlccs_asin": "asin",
                    "custrecord_swc_jj_zlccs_sku": "sku",
                    "custrecord_swc_jj_zlccs_skuname": "skuName",
                    "custrecord_swc_jj_zlccs_fnsku": "fnsku",
                    "custrecord_swc_jj_zlccs_msku": "msku",
                    "custrecord_swc_jj_zlccs_feeamount": "feeAmount",
                    "custrecord_swc_jj_zlccs_feeprice": "feePrice",
                    "custrecord_swc_jj_zlccs_quantity": "quantity",
                    "custrecord_swc_jj_zlccs_shippedquantity": "shippedquantity",
                    "custrecord_swc_jj_zlccs_feetype": "feeType",
                    "custrecord_swc_jj_zlccs_currency": "currency",
                    "custrecord_swc_jj_zlccs_currencysymbol": "currencySymbol",
                    "custrecord_swc_jj_zlccs_expenseshareway": "expenseShareWay",
                    "custrecord_swc_jj_zlccs_expensesharewayk": "expenseShareWaykey",
                    "custrecord_swc_jj_zlccs_createtime": "createTime",
                    "custrecord_swc_jj_zlccs_updatetime": "updateTime",
                }
            },
            "_ZFH_LOGISTICS_COST_CI_": {
                "record_type_id": 'customrecord_swc_jj_zfh_lc_costitemlist',
                "mapping": {
                    "custrecord_swc_jj_zlcci_dlbusinesscode": "dlBusinessCode",
                    "custrecord_swc_jj_zlcci_dlbusinessname": "dlBusinessName",
                    "custrecord_swc_jj_zlcci_expensetypekey": "expenseTypekey",
                    "custrecord_swc_jj_zlcci_expensetype": "expenseType",
                    "custrecord_swc_jj_zlcci_amount": "amount",
                    "custrecord_swc_jj_zlcci_currency": "currency",
                    "custrecord_swc_jj_zlcci_createdate": "createDate",
                    "custrecord_swc_jj_zlcci_feesubjectid": "feeSubjectId",
                    "custrecord_swc_jj_zlcci_feesubjectname": "feeSubjectName",
                }
            },
            "_ZFH_LOGISTICS_COST_CU_": {
                "record_type_id": 'customrecord_swc_jj_zfh_lc_unitlist',
                "mapping": {
                    "custrecordswc_jj_zlcu_unitcode": "unitCode",
                    "custrecord_swc_jj_zlcu_soordercode": "soOrderCode",
                    "custrecord_swc_jj_zlcu_shopid": "shopId",
                    "custrecord_swc_jj_zlcu_shopname": "shopName",
                    "custrecord_swc_jj_zlcu_estimatecost": "estimateCost",
                    "custrecord_swc_jj_zlcu_estimatecurrency": "estimateCurrency",
                    "custrecord_swc_jj_zlcu_unitdetailvolist": "unitDetailVOList",
                }
            },
            "_JJ_RETURN_ORDER_": {
                "record_type_id": 'customrecord_swc_amazon_returnorder',
                "mapping": {
                    "custrecord_swc_amz_rtid": "id",
                    "custrecord_swc_amz_rtmarketid": "marketId",
                    "custrecord_swc_amz_rtdate": "returnDate",
                    "custrecord_swc_amz_rtorderid": "orderId",
                    "custrecord_swc_amz_rtsalesorderid": "sellerOrderId",
                    "custrecord_swc_amz_rtpurchasedate": "purchaseDate",
                    "custrecord_swc_amz_rtitem": "sku",
                    "custrecord_swc_amz_rtquantity": "quantity",
                    "custrecord_swc_amz_rtlocation": "fulfillmentCenterId",
                    "custrecord_swc_amz_rtdisposition": "disposition",
                    "custrecord_swc_amz_rtreason": "reason",
                    "custrecord_swc_amz_rtstatus": "status",
                    "custrecord_swc_amz_rtcreatetime": "createTime",
                    "custrecord_swc_amz_rtupdatetime": "updateTime",
                }
            }
        }

        function SearchSalesOrder(acc_id, order_id, ship_flag, source_channel, billed) {
            var so = {};
            var filters = [
                { name: 'mainline', operator: 'is', values: true },
            ];
            if (ship_flag) {
                filters.push({ name: 'status', operator: 'anyof', values: ['SalesOrd:A', 'SalesOrd:B', 'SalesOrd:D'] });
            }
            if (billed) {
                filters.push({ name: 'status', operator: 'anyof', values: ['SalesOrd:G'] });
            }
            if (source_channel == 'GOFLOW' || source_channel == 'TEAPPLIX' || source_channel == 'SHOPIFY' || source_channel == 'SHOPLINE' || source_channel == 'OTTO' || source_channel == 'AfterSales') {
                filters.push({ name: 'custbody_swc_platform_order_number', operator: 'is', values: order_id });
            } else {
                filters.push({ name: 'poastext', operator: 'is', values: order_id });
            }
            if (acc_id) {
                filters.push({ name: 'name', operator: 'anyof', values: acc_id })
            }
            log.audit('SearchSalesOrder filters', filters);
            search.create({
                type: 'salesorder',
                filters: filters,
                columns: [
                    { name: 'subsidiary' },
                    { name: 'entity' },
                    { name: 'department' },
                    { name: 'currency' },
                    { name: 'statusref' },
                    { name: 'location' },
                    { name: 'otherrefnum' },
                ]
            }).run().each(function (rec) {
                so['so_id'] = rec.id;
                so['subsidiary'] = rec.getValue('subsidiary');
                so['entity'] = rec.getValue('entity');
                so['department'] = rec.getValue('department');
                so['currency'] = rec.getValue('currency');
                so['order_status'] = rec.getValue('statusref');
                so['location'] = rec.getValue('location');
                so['otherrefnum'] = rec.getValue('otherrefnum');
            });
            return so
        }

        function SearchItemInfo(so_id) {
            var so_items = [];
            search.create({
                type: 'salesorder',
                filters: [
                    { name: 'internalId', operator: 'is', values: so_id },
                    { name: 'mainline', operator: 'is', values: false },
                    { name: 'taxline', operator: 'is', values: false },
                    { name: 'shipping', operator: 'is', values: false },
                ],
                columns: [
                    { name: 'item' },
                    { name: 'location' },
                    { name: 'quantity' },
                    { name: 'quantityshiprecv' },
                    { name: 'quantitycommitted' },
                    { name: 'type', join: 'item' },
                    { name: 'custcol_swc_msku' },
                    { name: 'custcol_swc_line_no' },
                    { name: 'custcol_swc_platform_line_id' },
                    { name: 'custitem_swc_cplb', join: 'item' },
                ]
            }).run().each(function (rec) {
                so_items.push({
                    so_item_id: rec.getValue('item'),
                    so_item_location: rec.getValue('location'),
                    so_item_quantity: rec.getValue('quantity'),
                    so_item_quantityshiprecv: rec.getValue('quantityshiprecv'),
                    so_item_quantitycommitted: rec.getValue('quantitycommitted'),
                    so_item_type: rec.getValue({ name: 'type', join: 'item' }),
                    so_item_seller_sku: rec.getValue('custcol_swc_msku').trim(),
                    so_item_line_no: rec.getValue('custcol_swc_line_no'),
                    so_item_platform_line_id: rec.getValue('custcol_swc_platform_line_id'),
                    so_item_item_cplb: rec.getValue({ name: 'custitem_swc_cplb', join: 'item' }),
                })
                return true;
            });
            return so_items
        }

        function GetItemInfo(id, name) {
            var item_info = {};
            var filters = [
                ['isinactive', 'is', false]
            ];
            if (id) {
                filters.push('and', ['internalId', 'is', id]);
            }
            if (name) {
                filters.push('and', ['itemid', 'is', name]);
            }
            search.create({
                type: 'item',
                filters: filters,
                columns: [
                    { name: 'type' },
                    { name: 'name' },
                    { name: 'itemid' },
                    { name: 'islotitem' },
                    { name: 'isserialitem' },
                    { name: 'assetaccount' },
                ]
            }).run().each(function (rec) {
                item_info = {
                    id: rec.id,
                    recordType: rec.recordType,
                    type: rec.getValue('type'),
                    name: rec.getValue('name'),
                    itemid: rec.getValue('itemid'),
                    islotitem: rec.getValue('islotitem'),
                    isserialitem: rec.getValue('isserialitem'),
                    assetaccount: rec.getValue('assetaccount'),
                };
                return true;
            });
            return item_info
        }

        function JJDeveloperAccountAuth(id) {
            var auth = {};
            search.create({
                type: 'customrecord_swc_jj_developer_account',
                filters: [
                    { name: 'internalid', operator: 'anyof', values: id },
                ],
                columns: [
                    { name: 'custrecord_swc_jj_da_appid' },
                    { name: 'custrecord_swc_jj_da_appkey' },
                    { name: 'custrecord_swc_jj_da_service_address' },
                    { name: 'custrecord_swc_jj_da_accesstoken' },
                ]
            }).run().each(function (rec) {
                auth.id = rec.id;
                auth.appid = rec.getValue('custrecord_swc_jj_da_appid');
                auth.appkey = rec.getValue('custrecord_swc_jj_da_appkey');
                auth.service_address = rec.getValue('custrecord_swc_jj_da_service_address');
                auth.accesstoken = rec.getValue('custrecord_swc_jj_da_accesstoken');
                return true;
            });
            return auth;
        }

        function JJHttpsResponse(type, path, auth, body, params, headers) {
            try {
                log.audit('JJHttpResponse', {
                    type: type,
                    path: path,
                    auth: auth,
                    headers: headers,
                    params: params,
                    body: body,
                });
                link = auth.service_address + path;

                if (params) {
                    var query = {}
                    for (var key in params) {
                        if (params[key] != '') {
                            query[key] = params[key]
                        }
                    }
                    var keys = Object.keys(query)
                    keys.sort()
                    var queryString = keys.map(function (key) {
                        return key + '=' + query[key]
                    }).join('&')
                    link = link + '?' + queryString
                }

                if (!headers) {
                    headers = {
                        "Content-Type": "application/json;charset=utf-8",
                        "Accept": "application/json",
                        "accessToken": auth.accesstoken
                    }
                }
                log.audit('req link', link);
                log.audit('req body', body);
                log.audit('req headers', headers);
                var response;
                if (type == 'put') {
                    // link = link + '/' + body.ID;
                    log.audit('req link', link);
                    response = https.put({
                        url: link,
                        body: JSON.stringify(body),
                        headers: headers
                    });
                } else if (type == 'post') {
                    response = https.post({
                        url: link,
                        body: JSON.stringify(body),
                        headers: headers
                    });
                } else if (type == 'get') {
                    response = https.get({
                        url: link,
                    });
                    if (response.code == '200') {
                        return response.body
                    } else {
                        throw response.body
                    }
                } else if (type == 'delete') {
                    // link = link + '/' + body.ID;
                    response = https.delete({
                        url: link,
                    });
                }
                log.audit('response', response);
                if (response.code == '200') {
                    return JSON.parse(response.body)
                } else {
                    throw response.body
                }
            } catch (err) {
                log.audit('JJHttpResponse err', err);
                var e = err.message ? err.message : err;
                var code = err.name ? err.name : 'e400';
                throw error.create({
                    name: code,
                    message: e,
                    notifyOff: false
                });
            }

        }

        function getAccountList(ids, marketids) {
            var accounts = [], fils = [];
            fils = [
                ['isinactive', 'is', false], 'and',
                ['custentity_swc_jj_account', 'noneof', ['@NONE@']]
            ]
            if (ids) {
                fils.push('and', ['internalid', 'anyof', ids]);
            }
            if (marketids) {
                if (marketids.length) {
                    var fils_1 = [];
                    for (var j = 0; j < marketids.length; j++) {
                        if (fils_1.length > 0) {
                            fils_1.push('or');
                        }
                        fils_1.push(['custentity_swc_jj_marketid', 'is', marketids[j]]);
                    }
                    if (fils_1.length > 0) {
                        fils.push('and');
                        fils.push(fils_1)
                    }
                } else {
                    fils.push('and', ['custentity_swc_jj_marketid', 'isnotempty', '']);
                }
            } else {
                fils.push('and', ['custentity_swc_jj_marketid', 'isnotempty', '']);
            }
            log.audit('fils', fils);
            search.create({
                type: 'customer',
                filters: fils,
                columns: [
                    { name: 'entityid' },
                    { name: 'subsidiary' },
                    { name: 'currency' },
                    { name: 'custentity_swc_shipment_item_location' },
                    { name: 'custentity_swc_store_time_zone' },
                    { name: 'custentity_swc_payment_account' },
                    { name: 'custentity_swc_auto_offset_adv_bill' },
                    { name: 'custentity_swc_platform' },
                    { name: 'custentity_swc_tax_mode' },
                    { name: 'custentity_swc_plan_metrics' },
                    { name: 'custentity_swc_pj_plan_metrics' },
                    { name: 'custentity_swc_jsbg_credit' },
                    { name: 'custentity_swc_country' },
                    { name: 'custentity_swc_jj_marketid' },
                    { name: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_appid', join: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_appkey', join: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_service_address', join: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_accesstoken', join: 'custentity_swc_jj_account' },
                ]
            }).run().each(function (rec) {
                accounts.push({
                    id: rec.id,
                    entityid: rec.getValue('entityid'),
                    auth_meta: {
                        dev_account: rec.getValue('custentity_swc_jj_account'),
                        appid: rec.getValue({ name: 'custrecord_swc_jj_da_appid', join: 'custentity_swc_jj_account' }),
                        appkey: rec.getValue({ name: 'custrecord_swc_jj_da_appkey', join: 'custentity_swc_jj_account' }),
                        service_address: rec.getValue({ name: 'custrecord_swc_jj_da_service_address', join: 'custentity_swc_jj_account' }),
                        accesstoken: rec.getValue({ name: 'custrecord_swc_jj_da_accesstoken', join: 'custentity_swc_jj_account' }),
                    },
                    subsidiary: rec.getValue('subsidiary'),
                    currency: rec.getValue('currency'),
                    jj_marketid: rec.getValue('custentity_swc_jj_marketid'),
                    store_time_zone: rec.getValue('custentity_swc_store_time_zone'),
                    platform: rec.getValue('custentity_swc_platform'),
                    shipment_item_location: rec.getValue('custentity_swc_shipment_item_location'),
                    payment_account: rec.getValue('custentity_swc_payment_account'),
                    tax_mode: rec.getValue('custentity_swc_tax_mode'),
                    plan_metrics: rec.getValue('custentity_swc_plan_metrics'),
                    pj_plan_metrics: rec.getValue('custentity_swc_pj_plan_metrics'),
                    jsbg_credit: rec.getValue('custentity_swc_jsbg_credit'),
                    auto_offset_adv_bill: rec.getValue('custentity_swc_auto_offset_adv_bill'),
                    acc_country: rec.getText('custentity_swc_country'),
                });
                return true;
            })
            return accounts;
        }

        function GetAccountInfo(id, marketId, customerId, platformName) {
            var accounts = {}, fils = [];
            fils = [
                { name: 'isinactive', operator: 'is', values: false },
            ]
            if (id) {
                fils.push({ name: 'internalid', operator: 'anyof', values: id });
            }
            if (marketId) {
                fils.push({ name: 'custentity_swc_jj_marketid', operator: 'is', values: marketId });
            }
            if (customerId) {
                if (platformName == 'AmazonVC') {
                    fils.push({ name: 'custentity_swc_platform', operator: 'anyof', values: ['21'] });
                }
                fils.push({ name: 'custentity_swc_jj_customer_id', operator: 'is', values: customerId });
            }
            log.audit('fils', fils);
            search.create({
                type: 'customer',
                filters: fils,
                columns: [
                    { name: 'entityid' },
                    { name: 'subsidiary' },
                    { name: 'currency' },
                    { name: 'custentity_swc_shipment_item_location' },
                    { name: 'custentity_swc_store_time_zone' },
                    { name: 'custentity_swc_payment_account' },
                    { name: 'custentity_swc_auto_offset_adv_bill' },
                    { name: 'custentity_swc_platform' },
                    { name: 'custentity_swc_jj_customer_id' },
                    { name: 'custentity_swc_tax_mode' },
                    { name: 'custentity_swc_plan_metrics' },
                    { name: 'custentity_swc_pj_plan_metrics' },
                    { name: 'custentity_swc_jsbg_credit' },
                    { name: 'custentity_swc_country' },
                    { name: 'custentity_swc_jj_marketid' },
                    { name: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_appid', join: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_appkey', join: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_service_address', join: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_accesstoken', join: 'custentity_swc_jj_account' },
                ]
            }).run().each(function (rec) {
                accounts = {
                    id: rec.id,
                    entityid: rec.getValue('entityid'),
                    auth_meta: {
                        dev_account: rec.getValue('custentity_swc_jj_account'),
                        appid: rec.getValue({ name: 'custrecord_swc_jj_da_appid', join: 'custentity_swc_jj_account' }),
                        appkey: rec.getValue({ name: 'custrecord_swc_jj_da_appkey', join: 'custentity_swc_jj_account' }),
                        service_address: rec.getValue({ name: 'custrecord_swc_jj_da_service_address', join: 'custentity_swc_jj_account' }),
                        accesstoken: rec.getValue({ name: 'custrecord_swc_jj_da_accesstoken', join: 'custentity_swc_jj_account' }),
                    },
                    subsidiary: rec.getValue('subsidiary'),
                    currency: rec.getValue('currency'),
                    jj_marketid: rec.getValue('custentity_swc_jj_marketid'),
                    jj_customer_id: rec.getValue('custentity_swc_jj_customer_id'),
                    store_time_zone: rec.getValue('custentity_swc_store_time_zone'),
                    platform: rec.getValue('custentity_swc_platform'),
                    shipment_item_location: rec.getValue('custentity_swc_shipment_item_location'),
                    payment_account: rec.getValue('custentity_swc_payment_account'),
                    tax_mode: rec.getValue('custentity_swc_tax_mode'),
                    plan_metrics: rec.getValue('custentity_swc_plan_metrics'),
                    pj_plan_metrics: rec.getValue('custentity_swc_pj_plan_metrics'),
                    jsbg_credit: rec.getValue('custentity_swc_jsbg_credit'),
                    auto_offset_adv_bill: rec.getValue('custentity_swc_auto_offset_adv_bill'),
                    acc_country: rec.getText('custentity_swc_country'),
                };
                return true;
            })
            return accounts;
        }

        function GetVCAccountInfo(id, marketId) {
            var accounts = {}, fils = [];
            fils = [
                { name: 'isinactive', operator: 'is', values: false },
                { name: 'custentity_swc_platform', operator: 'anyof', values: ['21'] },
            ]
            if (id) {
                fils.push({ name: 'internalid', operator: 'anyof', values: id });
            }
            if (marketId) {
                fils.push({ name: 'custentity_swc_jj_customer_id', operator: 'is', values: marketId });
            }
            log.audit('fils', fils);
            search.create({
                type: 'customer',
                filters: fils,
                columns: [
                    { name: 'entityid' },
                    { name: 'subsidiary' },
                    { name: 'currency' },
                    { name: 'custentity_swc_shipment_item_location' },
                    { name: 'custentity_swc_store_time_zone' },
                    { name: 'custentity_swc_payment_account' },
                    { name: 'custentity_swc_auto_offset_adv_bill' },
                    { name: 'custentity_swc_platform' },
                    { name: 'custentity_swc_jj_marketid' },
                    { name: 'custentity_swc_tax_mode' },
                    { name: 'custentity_swc_plan_metrics' },
                    { name: 'custentity_swc_pj_plan_metrics' },
                    { name: 'custentity_swc_country' },
                    { name: 'custentity_swc_jj_customer_id' },
                    { name: 'custentity_swc_jsbg_credit' },
                    { name: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_appid', join: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_appkey', join: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_service_address', join: 'custentity_swc_jj_account' },
                    { name: 'custrecord_swc_jj_da_accesstoken', join: 'custentity_swc_jj_account' },
                ]
            }).run().each(function (rec) {
                accounts = {
                    id: rec.id,
                    entityid: rec.getValue('entityid'),
                    auth_meta: {
                        dev_account: rec.getValue('custentity_swc_jj_account'),
                        appid: rec.getValue({ name: 'custrecord_swc_jj_da_appid', join: 'custentity_swc_jj_account' }),
                        appkey: rec.getValue({ name: 'custrecord_swc_jj_da_appkey', join: 'custentity_swc_jj_account' }),
                        service_address: rec.getValue({ name: 'custrecord_swc_jj_da_service_address', join: 'custentity_swc_jj_account' }),
                        accesstoken: rec.getValue({ name: 'custrecord_swc_jj_da_accesstoken', join: 'custentity_swc_jj_account' }),
                    },
                    subsidiary: rec.getValue('subsidiary'),
                    currency: rec.getValue('currency'),
                    platform: rec.getValue('custentity_swc_platform'),
                    jj_marketid: rec.getValue('custentity_swc_jj_marketid'),
                    jj_customer_id: rec.getValue('custentity_swc_jj_customer_id'),
                    store_time_zone: rec.getValue('custentity_swc_store_time_zone'),
                    shipment_item_location: rec.getValue('custentity_swc_shipment_item_location'),
                    payment_account: rec.getValue('custentity_swc_payment_account'),
                    tax_mode: rec.getValue('custentity_swc_tax_mode'),
                    plan_metrics: rec.getValue('custentity_swc_plan_metrics'),
                    pj_plan_metrics: rec.getValue('custentity_swc_pj_plan_metrics'),
                    jsbg_credit: rec.getValue('custentity_swc_jsbg_credit'),
                    auto_offset_adv_bill: rec.getValue('custentity_swc_auto_offset_adv_bill'),
                    acc_country: rec.getText('custentity_swc_country'),
                };
                return true;
            })
            return accounts;
        }

        function JJListOrders(account, start_date, end_date, order_ids, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var orders = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    orders.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pageSize": pageSize,
            };
            body.marketIds = [account.jj_marketid];
            if (order_ids.length) {
                body.platformOrderList = order_ids;
            } else {
                body.startTime = start_date;
                body.endTime = end_date;
                // body.createStartTime = start_date;
                // body.createEndTime = end_date;
            }
            log.audit('body', body);
            var path = '/operation/order/centralPlatform/list';
            try {
                var response_body = JJHttpsResponse('post', path, account.auth_meta, body);
            } catch (e) {
                log.error("response_body error:", e)
                throw error.create({
                    name: '4001',
                    message: '店铺id:' + account.id + ',请求错误信息' + e,
                    notifyOff: false
                });
            }
            log.audit('listOrder-->response', response_body);

            if (response_body.code == '200') {
                var content = response_body.data;
                log.audit('content', content.length);
                if (content.length) {
                    content.map(function (node) {
                        orders.push(node);
                    });
                    if (Number(content.length) == Number(pageSize)) {
                        return JJListOrders(account, start_date, end_date, order_ids, Number(page) + 1, pageSize, orders);
                    } else {
                        return orders
                    }
                } else {
                    return orders
                }
            } else {
                log.error("拉单失败", JSON.stringify(response_body.body))
                throw error.create({
                    name: '4002',
                    message: '店铺id:' + account.id + ('拉单失败：' + JSON.stringify(response_body.body)),
                    notifyOff: false
                });
            }
        }

        function JJGetOrderItems(account, ids, platformCode, start_date, end_date, page, pageSize, data) {
            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }
            var orders = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    orders.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pageSize": pageSize,
            };
            if (platformCode) {
                body.platformCode = platformCode;
            }
            if (ids.length) {
                body.ids = ids;
            } else {
                body.startTime = start_date;
                body.endTime = end_date;
            }
            log.audit('body', body);
            var path = '/operation/order/centralPlatformItem/list';
            try {
                var response_body = JJHttpsResponse('post', path, account.auth_meta, body);
            } catch (e) {
                log.error("response_body error:", e)
                throw error.create({
                    name: '4001',
                    message: '店铺id:' + account.id + ',请求错误信息' + e,
                    notifyOff: false
                });
            }
            log.audit('getOrderItems-->response', response_body);

            if (response_body.code == '200') {
                var content = response_body.data;
                log.audit('content', content.length);
                if (content.length) {
                    content.map(function (node) {
                        orders.push(node);
                    });
                    if (Number(content.length) == Number(pageSize)) {
                        return getOrderItems(account, ids, platformCode, start_date, end_date, Number(page) + 1, pageSize, orders);
                    } else {
                        return orders
                    }
                } else {
                    return orders
                }
            } else {
                log.error("拉单失败", JSON.stringify(response_body.body))
                throw error.create({
                    name: '4002',
                    message: '店铺id:' + account.id + ('拉单失败：' + JSON.stringify(response_body.body)),
                    notifyOff: false
                });
            }
        }

        function JJGetAmazonMsku(auth, start_date, end_date, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var mskus = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    mskus.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };
            if (start_date && end_date) {
                body.startDate = start_date;
                body.endDate = end_date;
            }
            log.audit('body', body);
            var path = '/purchase/goods/amazonMsku/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
                throw '获取AmazonSKU信息失败:' + e
            }
            log.audit('JJGetAmazonMsku-->response', response_body);

            if (response_body.code == '200') {
                var rows = response_body.data.rows;
                var total = response_body.data.total;
                log.audit('rows', rows.length);
                if (rows.length) {
                    rows.map(function (node) {
                        mskus.push(node);
                    });
                    if (Number(total) == Number(mskus.length)) {
                        return mskus
                    } else {
                        return JJGetAmazonMsku(auth, start_date, end_date, Number(page) + 1, pageSize, mskus);
                    }
                } else {
                    return mskus
                }
            } else {
                log.error("获取AmazonSKU信息失败", JSON.stringify(response_body.body))
                // throw '获取AmazonSKU信息失败:' + JSON.stringify(response_body.body)
            }
        }

        function JJGetPlatformMsku(auth, skuType, platformIdList, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var mskus = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    mskus.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };
            if (skuType) {
                body.skuType = skuType;
            }
            if (platformIdList.length) {
                body.platformIdList = platformIdList;
            }
            log.audit('body', body);
            var path = '/platform/base/platformMsku/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
                throw '获取多平台SKU信息失败:' + e
            }
            log.audit('JJGetPlatformMsku-->response', response_body);

            if (response_body.code == '200') {
                var rows = response_body.data.rows;
                var total = response_body.data.total;
                if (Number(total) == '0') {
                    return mskus
                } else {
                    log.audit('rows', rows.length);
                    if (rows.length) {
                        rows.map(function (node) {
                            mskus.push(node);
                        });
                        if (Number(total) == Number(mskus.length)) {
                            return mskus
                        } else {
                            return JJGetPlatformMsku(auth, skuType, platformIdList, Number(page) + 1, pageSize, mskus);
                        }
                    } else {
                        return mskus
                    }
                }
            } else {
                log.error("获取多平台SKU信息失败", JSON.stringify(response_body.body))
                // throw '获取多平台SKU信息失败:' + JSON.stringify(response_body.body)
            }
        }

        function JJGetThirdProduct(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var mskus = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    mskus.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };
            if (params.skuList.length) {
                body.skuList = params.skuList;
            }
            if (params.thirdSkuList.length) {
                body.thirdSkuList = params.thirdSkuList;
            }
            if (params.spCodeList.length) {
                body.spCodeList = params.spCodeList;
            }
            if (params.thirdSkuStatusList.length) {
                body.thirdSkuStatusList = params.thirdSkuStatusList;
            }
            if (params.warehouseIds.length) {
                body.warehouseIds = params.warehouseIds;
            }
            if (params.matchStatus == '停用') {
                body.matchStatus = 0;
            } else if (params.matchStatus == '已配对') {
                body.matchStatus = 1;
            } else {

            }
            if (params.state == '未配对') {
                body.state = 0;
            } else if (params.state == '启用') {
                body.state = 1;
            } else {

            }
            log.audit('body', body);
            var path = '/purchase/goods/thirdProduct/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
                // throw '获取三方仓产品配对信息:' + e
            }
            log.audit('JJGetThirdProduct-->response', response_body);

            if (response_body.code == '200') {
                var rows = response_body.data.rows;
                var total = response_body.data.total;
                if (Number(total) == '0') {
                    return mskus
                } else {
                    log.audit('rows', rows.length);
                    if (rows.length) {
                        rows.map(function (node) {
                            mskus.push(node);
                        });
                        if (Number(total) == Number(mskus.length)) {
                            return mskus
                        } else {
                            return JJGetThirdProduct(auth, params, Number(page) + 1, pageSize, mskus);
                        }
                    } else {
                        return mskus
                    }
                }
            } else {
                log.error("获取三方仓产品配对信息", JSON.stringify(response_body.body))
                // throw '获取三方仓产品配对信息:' + JSON.stringify(response_body.body)
            }
        }

        function JJGetProductInfos(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var mskus = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    mskus.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };
            if (params.marketIdList.length) {
                body.marketIdList = params.marketIdList;
            }
            if (params.msku) {
                body.msku = params.msku;
            }
            if (params.asin) {
                body.asin = params.asin;
            }
            if (params.variationAsin) {
                body.variationAsin = params.variationAsin;
            }
            if (params.sku) {
                body.sku = params.sku;
            }
            if (params.spu) {
                body.spu = params.spu;
            }
            if (params.fulfillment) {
                body.fulfillment = params.fulfillment;
            }
            if (params.addStartDate) {
                body.addStartDate = params.addStartDate;
            }
            if (params.addEndDate) {
                body.addEndDate = params.addEndDate;
            }
            if (params.state == '在售') {
                body.state = 0;
            } else if (params.state == '停售') {
                body.state = 2;
            } else if (params.state == '不完整') {
                body.state = 3;
            } else if (params.state == '删除') {
                body.state = 4;
            } else {

            }

            log.audit('body', body);
            var path = '/operation/sale/selling/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
                // throw '获取三方仓产品配对信息:' + e
            }
            log.audit('JJGetThirdProduct-->response', response_body);

            if (response_body.code == '200') {
                var rows = response_body.data.rows;
                var total = response_body.data.total;
                if (Number(total) == '0') {
                    return mskus
                } else {
                    log.audit('rows', rows.length);
                    if (rows.length) {
                        rows.map(function (node) {
                            mskus.push(node);
                        });
                        if (Number(total) == Number(mskus.length)) {
                            return mskus
                        } else {
                            return JJGetProductInfos(auth, params, Number(page) + 1, pageSize, mskus);
                        }
                    } else {
                        return mskus
                    }
                }
            } else {
                log.error("获取三方仓产品配对信息", JSON.stringify(response_body.body))
                // throw '获取三方仓产品配对信息:' + JSON.stringify(response_body.body)
            }
        }

        function JJGetFbaShipment(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var fs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    fs_data.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };
            body.dateType = params.dateType;
            if (params.orderIds.length) {
                body.orderIds = params.orderIds;
            } else {
                if (params.marketIds.length) {
                    body.marketIds = params.marketIds;
                }
                if (params.orderTypes.length) {
                    body.orderTypes = params.orderTypes;
                }
                if (params.shipmentStartDate) {
                    body.shipmentStartDate = params.shipmentStartDate;
                }
                if (params.shipmentEndDate) {
                    body.shipmentEndDate = params.shipmentEndDate;
                }
                if (params.updateTimeBegin) {
                    body.updateTimeBegin = params.updateTimeBegin;
                }
                if (params.updateTimeEnd) {
                    body.updateTimeEnd = params.updateTimeEnd;
                }
            }
            log.audit('body', body);
            var path = '/operation/sale/fbaShipment/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
                throw '查询FBA配送信息列表:' + e
            }
            log.audit('GetFbaShipment-->response', response_body);

            if (response_body.code == '200') {
                var rows = response_body.data.rows;
                var total = response_body.data.total;
                if (Number(total) == '0') {
                    return fs_data
                } else {
                    log.audit('rows', rows.length);
                    if (rows.length) {
                        rows.map(function (node) {
                            fs_data.push(node);
                        });
                        if (Number(total) == Number(fs_data.length)) {
                            return fs_data
                        } else {
                            return JJGetFbaShipment(auth, params, Number(page) + 1, pageSize, fs_data);
                        }
                    } else {
                        return fs_data
                    }
                }
            } else {
                log.error("查询FBA配送信息列表", JSON.stringify(response_body.body))
                // throw '查询FBA配送信息列表:' + JSON.stringify(response_body.body)
            }
        }

        function JJGetZFHShipment(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };

            if (params.marketId.length) {
                body.marketId = params.marketId;
            }
            if (params.sourceChannel.length) {
                body.sourceChannel = params.sourceChannel;
            }
            if (params.sourceCode.length) {
                body.sourceCode = params.sourceCode;
            }
            if (params.shopId.length) {
                body.shopId = params.shopId;
            }
            if (params.shopName.length) {
                body.shopName = params.shopName;
            }
            if (params.customerPackageNoList.length) {
                body.customerPackageNoList = params.customerPackageNoList;
            }
            if (params.orderCodeList.length) {
                body.orderCodeList = params.orderCodeList;
            }
            if (params.foOrderStatus.length) {
                body.foOrderStatus = params.foOrderStatus;
            }
            if (params.shopCountry.length) {
                body.shopCountry = params.shopCountry;
            }
            if (params.warehouseId.length) {
                body.warehouseId = params.warehouseId;
            }
            if (params.orderType.length) {
                body.orderType = params.orderType;
            }
            if (params.syncDeliveryFlag.length) {
                body.syncDeliveryFlag = params.syncDeliveryFlag;
            }
            if (params.deliveryMethod.length) {
                body.deliveryMethod = params.deliveryMethod;
            }
            if (params.accessMode.length) {
                body.accessMode = params.accessMode;
            }
            if (params.bizStatusList.length) {
                body.bizStatusList = params.bizStatusList;
            }
            if (params.labelList.length) {
                body.labelList = params.labelList;
            }
            if (params.thirdWarehouseFlag) {
                body.thirdWarehouseFlag = params.thirdWarehouseFlag;
            }
            if (params.updateTimeAfter) {
                body.updateTimeAfter = params.updateTimeAfter;
            }
            if (params.updateTimeBefore) {
                body.updateTimeBefore = params.updateTimeBefore;
            }
            if (params.deliveryTimeAfter) {
                body.deliveryTimeAfter = params.deliveryTimeAfter;
            }
            if (params.deliveryTimeBefore) {
                body.deliveryTimeBefore = params.deliveryTimeBefore;
            }

            log.audit('body', body);

            var path = '/fulfillment/order/foOrder/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
                throw '查询自发货订单-配货单列表:' + e
            }
            log.audit('JJGetZFHShipment-->response', response_body);

            if (response_body.code == '200') {
                var rows = response_body.data.rows;
                var total = response_body.data.total;
                if (Number(total) == '0') {
                    return rs_data
                } else {
                    log.audit('rows', rows.length);
                    if (rows.length) {
                        rows.map(function (node) {
                            rs_data.push(node);
                        });
                        if (Number(total) == Number(rs_data.length)) {
                            return rs_data
                        } else {
                            return JJGetZFHShipment(auth, params, Number(page) + 1, pageSize, rs_data);
                        }
                    } else {
                        return rs_data
                    }
                }
            } else {
                log.error("查询自发货订单-配货单列表", JSON.stringify(response_body.body))
                // throw '查询自发货订单-配货单列表:' + JSON.stringify(response_body.body)
            }
        }

        function JJGetShipUnitsDetail(auth, params, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {};

            if (params.foOrderCodeList.length) {
                body.foOrderCodeList = params.foOrderCodeList;
            }
            if (params.unitCodeList.length) {
                body.unitCodeList = params.unitCodeList;
            }

            log.audit('body', body);

            var path = '/fulfillment/ship/units/detail';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
                throw '批量查询包裹单详情及费用:' + e
            }
            log.audit('JJGetShipUnitsDetail-->response', response_body);

            if (response_body.code == '200') {
                var body_data = response_body.data;
                if (body_data.length) {
                    body_data.map(function (node) {
                        rs_data.push(node);
                    });
                    return rs_data
                } else {
                    return rs_data
                }
            } else {
                log.error("批量查询包裹单详情及费用", JSON.stringify(response_body.body))
                // throw '批量查询包裹单详情及费用:' + JSON.stringify(response_body.body)
            }
        }

        function JJGetStorageFee(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };

            if (params.year) {
                body.year = params.year;
            }
            if (params.month) {
                body.month = params.month;
            }
            if (params.asin) {
                body.asin = params.asin;
            }
            if (params.sku) {
                body.sku = params.sku;
            }
            if (params.fnsku) {
                body.fnsku = params.fnsku;
            }
            if (params.brands.length) {
                body.brands = params.brands;
            }
            if (params.categorys.length) {
                body.categorys = params.categorys;
            }

            log.audit('body', body);

            var path = '/finance/asset/storageFee/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
                throw '查询月度仓储费:' + e
            }
            log.audit('JJGetStorageFee-->response', response_body);

            if (response_body.code == '200') {
                var rows = response_body.data.rows;
                var total = response_body.data.total;
                if (Number(total) == '0') {
                    return rs_data
                } else {
                    log.audit('rows', rows.length);
                    if (rows.length) {
                        rows.map(function (node) {
                            rs_data.push(node);
                        });
                        if (Number(total) == Number(rs_data.length)) {
                            return rs_data
                        } else {
                            return JJGetStorageFee(auth, params, Number(page) + 1, pageSize, rs_data);
                        }
                    } else {
                        return rs_data
                    }
                }
            } else {
                log.error("查询月度仓储费:", JSON.stringify(response_body.body))
                // throw '查询月度仓储费:' + JSON.stringify(response_body.body)
            }
        }

        function JJGetStorageLongFee(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };

            if (params.purchaseStartDate) {
                body.purchaseStartDate = params.purchaseStartDate;
            }
            if (params.purchaseEndDate) {
                body.purchaseEndDate = params.purchaseEndDate;
            }
            if (params.asin) {
                body.asin = params.asin;
            }
            if (params.sku) {
                body.skuList = params.sku;
            }
            if (params.fnsku) {
                body.fnsku = params.fnsku;
            }
            if (params.msku) {
                body.msku = params.msku;
            }
            if (params.brands.length) {
                body.brands = params.brands;
            }
            if (params.categorys.length) {
                body.categorys = params.categorys;
            }
            if (params.marketIds.length) {
                body.marketIds = params.marketIds;
            }

            log.audit('body', body);

            var path = '/finance/asset/storageLongFee/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
                throw '查询长期度仓储费:' + e
            }
            log.audit('JJGetStorageLongFee-->response', response_body);

            if (response_body.code == '200') {
                var rows = response_body.data.rows;
                var total = response_body.data.total;
                if (Number(total) == '0') {
                    return rs_data
                } else {
                    log.audit('rows', rows.length);
                    if (rows.length) {
                        rows.map(function (node) {
                            rs_data.push(node);
                        });
                        if (Number(total) == Number(rs_data.length)) {
                            return rs_data
                        } else {
                            return JJGetStorageLongFee(auth, params, Number(page) + 1, pageSize, rs_data);
                        }
                    } else {
                        return rs_data
                    }
                }
            } else {
                log.error("查询长期度仓储费:", JSON.stringify(response_body.body))
                // throw '查询长期度仓储费:' + JSON.stringify(response_body.body)
            }
        }

        function JJGetFbmReturnOrder(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };

            if (params.timeStart) {
                body.timeStart = params.timeStart;
            }
            if (params.timeEnd) {
                body.timeEnd = params.timeEnd;
            }
            if (params.timeRangeType) {
                body.timeRangeType = params.timeRangeType;
            }
            if (params.returnType) {
                body.returnType = params.returnType;
            }
            if (params.sourceReturnCodeList.length) {
                body.sourceReturnCodeList = params.sourceReturnCodeList;
            }
            if (params.returnStatusList.length) {
                body.returnStatusList = params.returnStatusList;
            }
            if (params.sourceChannelList.length) {
                body.sourceChannelList = params.sourceChannelList;
            }
            if (params.sourceCodeList.length) {
                body.sourceCodeList = params.sourceCodeList;
            }
            if (params.returnCodeList.length) {
                body.returnCodeList = params.returnCodeList;
            }
            if (params.accessModeList.length) {
                body.accessModeList = params.accessModeList;
            }
            if (params.returnWarehouseIdList.length) {
                body.returnWarehouseIdList = params.returnWarehouseIdList;
            }

            log.audit('body', body);

            var path = '/fulfillment/order/fbmReturnOrder/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
                // throw '查询销售退货单列表:' + e
            }
            log.audit('JJGetFbmReturnOrder-->response', response_body);

            if (response_body.code == '200') {
                var rows = response_body.data.rows;
                var total = response_body.data.total;
                if (Number(total) == '0') {
                    return rs_data
                } else {
                    log.audit('rows', rows.length);
                    if (rows.length) {
                        rows.map(function (node) {
                            rs_data.push(node);
                        });
                        if (Number(total) == Number(rs_data.length)) {
                            return rs_data
                        } else {
                            return JJGetFbmReturnOrder(auth, params, Number(page) + 1, pageSize, rs_data);
                        }
                    } else {
                        return rs_data
                    }
                }
            } else {
                log.error("查询销售退货单列表:", JSON.stringify(response_body.body))
                // throw '查询销售退货单列表:' + JSON.stringify(response_body.body)
            }
        }

        function JJGetAdsSpProduct(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "nextId": page,
                "count": pageSize,
            };

            if (params.startDate) {
                body.startDate = params.startDate;
            }
            if (params.endDate) {
                body.endDate = params.endDate;
            }
            if (params.startDataDate) {
                body.startDataDate = params.startDataDate;
            }
            if (params.endDataDate) {
                body.endDataDate = params.endDataDate;
            }
            if (params.marketId) {
                body.marketId = params.marketId;
            }

            log.audit('body', body);

            var path = '/operation/ads/adsSpProduct/query';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
                // throw '查询商品广告:' + e
            }
            log.audit('JJGetAdsSpProduct-->response', response_body);
            if (response_body) {
                if (response_body.code == '200') {
                    var extObj = response_body.extObj;
                    log.audit('extObj', extObj);
                    var body_data = response_body.data;
                    if (body_data.length) {
                        body_data.map(function (node) {
                            rs_data.push(node);
                        });
                        if (extObj) {
                            return JJGetAdsSpProduct(auth, params, extObj, pageSize, rs_data);
                        } else {
                            return rs_data
                        }
                    } else {
                        return rs_data
                    }
                } else {
                    log.error("查询商品广告:", JSON.stringify(response_body.body))
                    // throw '查询商品广告:' + JSON.stringify(response_body.body)
                }
            }
            return rs_data
        }

        function JJGetAdsSbCampaign(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "nextId": page,
                "count": pageSize,
            };

            if (params.startDate) {
                body.startDate = params.startDate;
            }
            if (params.endDate) {
                body.endDate = params.endDate;
            }
            if (params.startDataDate) {
                body.startDataDate = params.startDataDate;
            }
            if (params.endDataDate) {
                body.endDataDate = params.endDataDate;
            }
            if (params.marketId) {
                body.marketId = params.marketId;
            }

            log.audit('body', body);

            var path = '/operation/ads/adsSbCampaign/query';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
                // throw '查询品牌广告:' + e
            }
            log.audit('JJGetAdsSbCampaign-->response', response_body);
            if (response_body) {
                if (response_body.code == '200') {
                    var extObj = response_body.extObj;
                    log.audit('extObj', extObj);
                    var body_data = response_body.data;
                    if (body_data.length) {
                        body_data.map(function (node) {
                            rs_data.push(node);
                        });
                        if (extObj) {
                            return JJGetAdsSbCampaign(auth, params, extObj, pageSize, rs_data);
                        } else {
                            return rs_data
                        }
                    } else {
                        return rs_data
                    }
                } else {
                    log.error("查询品牌广告:", JSON.stringify(response_body.body))
                    // throw '查询品牌广告:' + JSON.stringify(response_body.body)
                }
            }
            return rs_data
        }

        function JJGetAdsSdProduct(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "nextId": page,
                "count": pageSize,
            };

            if (params.startDate) {
                body.startDate = params.startDate;
            }
            if (params.endDate) {
                body.endDate = params.endDate;
            }
            if (params.startDataDate) {
                body.startDataDate = params.startDataDate;
            }
            if (params.endDataDate) {
                body.endDataDate = params.endDataDate;
            }
            if (params.marketId) {
                body.marketId = params.marketId;
            }

            log.audit('body', body);

            var path = '/operation/ads/adsSdProduct/query';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
                // throw '查询展示广告:' + e
            }
            log.audit('JJGetAdsSdProduct-->response', response_body);
            if (response_body) {
                if (response_body.code == '200') {
                    var extObj = response_body.extObj;
                    log.audit('extObj', extObj);
                    var body_data = response_body.data;
                    if (body_data.length) {
                        body_data.map(function (node) {
                            rs_data.push(node);
                        });
                        if (extObj) {
                            return JJGetAdsSdProduct(auth, params, extObj, pageSize, rs_data);
                        } else {
                            return rs_data
                        }
                    } else {
                        return rs_data
                    }
                } else {
                    log.error("查询展示广告:", JSON.stringify(response_body.body))
                    // throw '查询展示广告:' + JSON.stringify(response_body.body)
                }
            }
            return rs_data
        }

        function JJGetRemovalOrder(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };

            if (params.updateTimeEnd) {
                body.updateTimeEnd = params.updateTimeEnd;
            }
            if (params.updateTimeBegin) {
                body.updateTimeBegin = params.updateTimeBegin;
            }
            if (params.requestDateBegin) {
                body.requestDateBegin = params.requestDateBegin;
            }
            if (params.requestDateEnd) {
                body.requestDateEnd = params.requestDateEnd;
            }
            if (params.createWay) {
                body.createWay = params.createWay;
            }
            if (params.orderTypeList.length) {
                body.orderTypeList = params.orderTypeList;
            }

            log.audit('body', body);

            var path = '/purchase/sale/storageRemovalOrder/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
            }
            log.audit('JJGetRemovalOrder-->response', response_body);
            if (response_body) {
                if (response_body.code == '200') {
                    var rows = response_body.data.rows;
                    var total = response_body.data.total;
                    if (Number(total) == '0') {
                        return rs_data
                    } else {
                        log.audit('rows', rows.length);
                        if (rows.length) {
                            rows.map(function (node) {
                                rs_data.push(node);
                            });
                            if (Number(total) == Number(rs_data.length)) {
                                return rs_data
                            } else {
                                return JJGetRemovalOrder(auth, params, Number(page) + 1, pageSize, rs_data);
                            }
                        } else {
                            return rs_data
                        }
                    }
                } else {
                    log.error("查询FBA移除订单列表:", JSON.stringify(response_body.body))
                    // throw '查询FBA移除订单列表:' + JSON.stringify(response_body.body)
                }
            }
            return rs_data
        }

        function JJGetRemovalOrderDetail(auth, params) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var body = {
                "orderId": params.orderId,
                "warehouseId": params.warehouseId,
            };

            log.audit('body', body);

            var path = '/purchase/sale/storageRemovalOrder/detail';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
            }
            log.audit('JJGetRemovalOrderDetail-->response', response_body);
            if (response_body) {
                if (response_body.code == '200') {
                    return response_body.data;
                } else {
                    log.error("查询FBA移除订单详情:", JSON.stringify(response_body.body))
                    // throw '查询FBA移除订单详情:' + JSON.stringify(response_body.body)
                }
            }
        }

        function JJGetDateRangeReports(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };

            if (params.purchaseStartDate) {
                body.purchaseStartDate = params.purchaseStartDate;
            }
            if (params.purchaseEndDate) {
                body.purchaseEndDate = params.purchaseEndDate;
            }
            if (params.orderType) {
                body.orderType = params.orderType;
            }
            if (params.orderId) {
                body.orderId = params.orderId;
            }
            if (params.feeTypes.length) {
                body.feeTypes = params.feeTypes;
            }
            if (params.marketIds.length) {
                body.marketIds = params.marketIds;
            }

            log.audit('body', body);

            var path = '/finance/asset/dateRangeReports/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
            }
            log.audit('JJGetDateRangeReports-->response', response_body);
            if (response_body) {
                if (response_body.code == '200') {
                    var rows = response_body.data.rows;
                    var total = response_body.data.total;
                    if (Number(total) == '0') {
                        return rs_data
                    } else {
                        log.audit('rows', rows.length);
                        if (rows.length) {
                            rows.map(function (node) {
                                rs_data.push(node);
                            });
                            if (Number(total) == Number(rs_data.length)) {
                                return rs_data
                            } else {
                                return JJGetDateRangeReports(auth, params, Number(page) + 1, pageSize, rs_data);
                            }
                        } else {
                            return rs_data
                        }
                    }
                } else {
                    log.error("查询日期范围报告:", JSON.stringify(response_body.body))
                    // throw '查询日期范围报告:' + JSON.stringify(response_body.body)
                }
            }
            return rs_data
        }

        function JJGetVCDFOrder(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };

            if (params.start_date && params.end_date) {
                var columnType = 'UPDATE_TIME';
                if (params.columnType) {
                    columnType = params.columnType
                }
                body.timeRangeList = [
                    {
                        "columnType": columnType,
                        "timeStart": params.start_date,
                        "timeEnd": params.end_date
                    }
                ]
                body.timeZoneType = 'market';//时区类型：utc-零时区（默认），market-市场时区、Asia/Shanghai-北京时区
            }
            if (params.asins.length) {
                body.asins = params.asins;
            }
            if (params.customerOrderNumbers.length) {
                body.customerOrderNumbers = params.customerOrderNumbers;
            }
            if (params.marketIds.length) {
                body.marketIds = params.marketIds;
            }
            if (params.mskus.length) {
                body.mskus = params.mskus;
            }
            if (params.orderStatus.length) {
                body.orderStatus = params.orderStatus;
            }
            if (params.purchaseOrderNumbers.length) {
                body.purchaseOrderNumbers = params.purchaseOrderNumbers;
            }
            if (params.skuList.length) {
                body.skuList = params.skuList;
            }

            log.audit('body', body);

            var path = '/operation/sale/vcDfOrder/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
            }
            log.audit('JJGetVCDFOrder-->response', response_body);
            if (response_body) {
                if (response_body.code == '200') {
                    var rows = response_body.data.rows;
                    var total = response_body.data.total;
                    if (Number(total) == '0') {
                        return rs_data
                    } else {
                        log.audit('rows', rows.length);
                        if (rows.length) {
                            rows.map(function (node) {
                                rs_data.push(node);
                            });
                            if (Number(total) == Number(rs_data.length)) {
                                return rs_data
                            } else {
                                return JJGetVCDFOrder(auth, params, Number(page) + 1, pageSize, rs_data);
                            }
                        } else {
                            return rs_data
                        }
                    }
                } else {
                    log.error("查询VC-DF订单列表:", JSON.stringify(response_body.body))
                    // throw '查询VC-DF订单列表:' + JSON.stringify(response_body.body)
                }
            }
            return rs_data
        }

        function JJGetVCPOOrder(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };

            if (params.start_date && params.end_date) {
                var columnType = 'UPDATE_TIME';
                if (params.columnType) {
                    columnType = params.columnType
                }
                body.timeRangeList = [
                    {
                        "columnType": columnType,
                        "timeStart": params.start_date,
                        "timeEnd": params.end_date
                    }
                ]
            }

            if (params.invoiceSubmitStatus) {
                body.invoiceSubmitStatus = params.invoiceSubmitStatus;
            }
            if (params.prOrderType) {
                body.prOrderType = params.prOrderType;
            }
            if (params.purchaseOrderState) {
                body.purchaseOrderState = params.purchaseOrderState;
            }
            if (params.sellingPartyId) {
                body.sellingPartyId = params.sellingPartyId;
            }
            if (params.shipType) {
                body.shipType = params.shipType;
            }
            if (params.ackStatusList.length) {
                body.ackStatusList = params.ackStatusList;
            }
            if (params.asins.length) {
                body.asins = params.asins;
            }
            if (params.dealCodes.length) {
                body.dealCodes = params.dealCodes;
            }
            if (params.eans.length) {
                body.eans = params.eans;
            }
            if (params.invoiceStatusList.length) {
                body.invoiceStatusList = params.invoiceStatusList;
            }
            if (params.marketIds.length) {
                body.marketIds = params.marketIds;
            }
            if (params.modelNumbers.length) {
                body.modelNumbers = params.modelNumbers;
            }
            if (params.mskus.length) {
                body.mskus = params.mskus;
            }
            if (params.purchaseOrderNumbers.length) {
                body.purchaseOrderNumbers = params.purchaseOrderNumbers;
            }
            if (params.purchaseOrderTypes.length) {
                body.purchaseOrderTypes = params.purchaseOrderTypes;
            }
            if (params.shipToCountryCodeList.length) {
                body.shipToCountryCodeList = params.shipToCountryCodeList;
            }
            if (params.shipToList.length) {
                body.shipToList = params.shipToList;
            }
            if (params.shipmentIds.length) {
                body.shipmentIds = params.shipmentIds;
            }
            if (params.shipmentStatusList.length) {
                body.shipmentStatusList = params.shipmentStatusList;
            }
            if (params.skuList.length) {
                body.skuList = params.skuList;
            }

            log.audit('body', body);

            var path = '/operation/sale/vcPoOrder/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
            }
            log.audit('JJGetVCPOOrder-->response', response_body);
            if (response_body) {
                if (response_body.code == '200') {
                    var rows = response_body.data.rows;
                    var total = response_body.data.total;
                    if (Number(total) == '0') {
                        return rs_data
                    } else {
                        log.audit('rows', rows.length);
                        if (rows.length) {
                            rows.map(function (node) {
                                rs_data.push(node);
                            });
                            if (Number(total) == Number(rs_data.length)) {
                                return rs_data
                            } else {
                                return JJGetVCPOOrder(auth, params, Number(page) + 1, pageSize, rs_data);
                            }
                        } else {
                            return rs_data
                        }
                    }
                } else {
                    log.error("查询VC-PO订单列表:", JSON.stringify(response_body.body))
                    // throw '查询VC-PO订单列表:' + JSON.stringify(response_body.body)
                }
            }
            return rs_data
        }

        function JJGetAfterSalesOrder(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };

            if (params.startDate) {
                body.startDate = params.startDate;
            }
            if (params.endDate) {
                body.endDate = params.endDate;
            }
            if (params.dateQueryType) {
                body.dateQueryType = params.dateQueryType;
            }

            if (params.polymerizeShopIds.length) {
                body.polymerizeShopIds = params.polymerizeShopIds;
            }
            if (params.orderIds.length) {
                body.orderIds = params.orderIds;
            }
            if (params.postSalesNumbers.length) {
                body.postSalesNumbers = params.postSalesNumbers;
            }
            if (params.postSalesStates.length) {
                body.postSalesStates = params.postSalesStates;
            }
            if (params.postSalesTypes.length) {
                body.postSalesTypes = params.postSalesTypes;
            }
            if (params.postSalesReasonIds.length) {
                body.postSalesReasonIds = params.postSalesReasonIds;
            }
            if (params.ticketIds.length) {
                body.ticketIds = params.ticketIds;
            }
            if (params.soSourceOrderCodes.length) {
                body.soSourceOrderCodes = params.soSourceOrderCodes;
            }
            if (params.sourceReturnCodes.length) {
                body.sourceReturnCodes = params.sourceReturnCodes;
            }
            if (params.creatorIds.length) {
                body.creatorIds = params.creatorIds;
            }

            log.audit('body', body);

            var path = '/operation/crm/postSale/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
            }
            log.audit('JJGetAfterSalesOrder-->response', response_body);
            if (response_body) {
                if (response_body.code == '200') {
                    var rows = response_body.data.rows;
                    var total = response_body.data.total;
                    if (Number(total) == '0') {
                        return rs_data
                    } else {
                        log.audit('rows', rows.length);
                        if (rows.length) {
                            rows.map(function (node) {
                                rs_data.push(node);
                            });
                            if (Number(total) == Number(rs_data.length)) {
                                return rs_data
                            } else {
                                return JJGetAfterSalesOrder(auth, params, Number(page) + 1, pageSize, rs_data);
                            }
                        } else {
                            return rs_data
                        }
                    }
                } else {
                    log.error("查询售后工单 :", JSON.stringify(response_body.body))
                    // throw '查询售后工单:' + JSON.stringify(response_body.body)
                }
            }
            return rs_data
        }

        function JJGetVCPOShipment(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };

            if (params.start_date && params.end_date) {
                body.timeRangeList = [
                    {
                        "columnType": "CREATE_TIME",
                        "timeStart": params.start_date,
                        "timeEnd": params.end_date
                    }
                ]
            }

            if (params.abnormalTypeList.length) {
                body.abnormalTypeList = params.abnormalTypeList;
            }
            if (params.amazonReferenceNumberList.length) {
                body.amazonReferenceNumberList = params.amazonReferenceNumberList;
            }
            if (params.amzShipType.length) {
                body.amzShipType = params.amzShipType;
            }
            if (params.asinList.length) {
                body.asinList = params.asinList;
            }
            if (params.marketIdList.length) {
                body.marketIdList = params.marketIdList;
            }
            if (params.mskuList.length) {
                body.mskuList = params.mskuList;
            }
            if (params.outboundOrderList.length) {
                body.outboundOrderList = params.outboundOrderList;
            }
            if (params.purchaseOrderNumberList.length) {
                body.purchaseOrderNumberList = params.purchaseOrderNumberList;
            }
            if (params.referenceNumberList.length) {
                body.referenceNumberList = params.referenceNumberList;
            }
            if (params.shipFromList.length) {
                body.shipFromList = params.shipFromList;
            }
            if (params.shipToList.length) {
                body.shipToList = params.shipToList;
            }
            if (params.shipmentShippingStatusList.length) {
                body.shipmentShippingStatusList = params.shipmentShippingStatusList;
            }
            if (params.shipmentStatusList.length) {
                body.shipmentStatusList = params.shipmentStatusList;
            }
            if (params.skuList.length) {
                body.skuList = params.skuList;
            }

            log.audit('body', body);

            var path = '/operation/sale/vcPoShipment/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
            }
            log.audit('JJGetVCPOShipment-->response', response_body);
            if (response_body) {
                if (response_body.code == '200') {
                    var rows = response_body.data.rows;
                    var total = response_body.data.total;
                    if (Number(total) == '0') {
                        return rs_data
                    } else {
                        log.audit('rows', rows.length);
                        if (rows.length) {
                            rows.map(function (node) {
                                rs_data.push(node);
                            });
                            if (Number(total) == Number(rs_data.length)) {
                                return rs_data
                            } else {
                                return JJGetVCPOShipment(auth, params, Number(page) + 1, pageSize, rs_data);
                            }
                        } else {
                            return rs_data
                        }
                    }
                } else {
                    log.error("查询VC-PO货件列表:", JSON.stringify(response_body.body))
                    // throw '查询VC-PO货件列表:' + JSON.stringify(response_body.body)
                }
            }
            return rs_data
        }

        function JJGetObdOutbound(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };

            if (params.createBeginTime) {
                body.createBeginTime = params.createBeginTime;
            }
            if (params.createEndTime) {
                body.createEndTime = params.createEndTime;
            }
            if (params.outBeginTime) {
                body.outBeginTime = params.outBeginTime;
            }
            if (params.outEndTime) {
                body.outEndTime = params.outEndTime;
            }
            if (params.cancelBeginTime) {
                body.cancelBeginTime = params.cancelBeginTime;
            }
            if (params.cancelEndTime) {
                body.cancelEndTime = params.cancelEndTime;
            }
            if (params.warehouseId) {
                body.warehouseId = params.warehouseId;
            }
            if (params.sourceOrderNos.length) {
                body.sourceOrderNos = params.sourceOrderNos;
            }
            if (params.waybillNos.length) {
                body.waybillNos = params.waybillNos;
            }
            if (params.orderNos.length) {
                body.orderNos = params.orderNos;
            }
            if (params.externalOrderNos.length) {
                body.externalOrderNos = params.externalOrderNos;
            }

            log.audit('body', body);

            var path = '/fulfillment/store/obdOutbound/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
            }
            log.audit('JJGetObdOutbound-->response', response_body);
            if (response_body) {
                if (response_body.code == '200') {
                    var rows = response_body.data.rows;
                    var total = response_body.data.total;
                    if (Number(total) == '0') {
                        return rs_data
                    } else {
                        log.audit('rows', rows.length);
                        if (rows.length) {
                            rows.map(function (node) {
                                rs_data.push(node);
                            });
                            if (Number(total) == Number(rs_data.length)) {
                                return rs_data
                            } else {
                                return JJGetObdOutbound(auth, params, Number(page) + 1, pageSize, rs_data);
                            }
                        } else {
                            return rs_data
                        }
                    }
                } else {
                    log.error("查询大货出库单:", JSON.stringify(response_body.body))
                    // throw '查询大货出库单:' + JSON.stringify(response_body.body)
                }
            }
            return rs_data
        }

        function JJGetLogisticsCostV2(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };


            if (params.sourceCodeList.length) {
                body.sourceCodeList = params.sourceCodeList;
            }
            if (params.startDate) {
                body.startDate = params.startDate;
            }
            if (params.endDate) {
                body.endDate = params.endDate;
            }
            if (params.beginCreateTime) {
                body.beginCreateTime = params.beginCreateTime;
            }
            if (params.endCreateTime) {
                body.endCreateTime = params.endCreateTime;
            }
            if (params.deliveryBeginTime) {
                body.deliveryBeginTime = params.deliveryBeginTime;
            }
            if (params.deliveryEndTime) {
                body.deliveryEndTime = params.deliveryEndTime;
            }

            log.audit('body', body);

            var path = '/fulfillment/ship/logisticsCostV2/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
            }
            log.audit('JJGetLogisticsCostV2-->response', response_body);
            if (response_body) {
                if (response_body.code == '200') {
                    if (response_body.data) {
                        var rows = response_body.data.rows;
                        var total = response_body.data.total;
                        if (Number(total) == '0') {
                            return rs_data
                        } else {
                            log.audit('rows', rows.length);
                            if (rows.length) {
                                rows.map(function (node) {
                                    rs_data.push(node);
                                });
                                if (Number(total) == Number(rs_data.length)) {
                                    return rs_data
                                } else {
                                    return JJGetLogisticsCostV2(auth, params, Number(page) + 1, pageSize, rs_data);
                                }
                            } else {
                                return rs_data
                            }
                        }
                    }
                } else {
                    log.error("分页查询自发货尾程物流费用:", JSON.stringify(response_body.body))
                    throw '分页查询自发货尾程物流费用:' + JSON.stringify(response_body.body)
                }
            }
            return rs_data
        }

        function GetLocationInfo(jj_id, id, acc_id, type, location_attribute) {
            try {
                var result = {};
                var filters = [{ name: 'isinactive', operator: 'is', values: false }];
                if (jj_id) {
                    filters.push({ name: 'custrecord_swc_jj_warehouse_id', operator: 'is', values: jj_id });
                    filters.push({ name: 'custrecord_swc_location_store', operator: 'anyof', values: acc_id });
                    if (location_attribute == '店铺虚拟仓') {
                        filters.push({ name: 'custrecord_swc_location_attribute', operator: 'anyof', values: '12' });//仓库属性-店铺虚拟仓
                    } else if (location_attribute == '海外仓') {
                        filters.push({ name: 'custrecord_swc_location_attribute', operator: 'anyof', values: '6' });//仓库属性-海外仓
                    } else if (location_attribute == '平台仓') {
                        filters.push({ name: 'custrecord_swc_location_attribute', operator: 'anyof', values: '7' });//仓库属性-平台仓
                    } else if (location_attribute == '平台仓海外仓') {
                        filters.push({ name: 'custrecord_swc_location_attribute', operator: 'anyof', values: ['6', '7'] });//仓库属性-平台仓\海外仓
                    }
                    // if (type == 'CG') {
                    //     filters.push({ name: 'custrecord_swc_location_type', operator: 'anyof', values: '3' });//仓库类型-CG
                    // } else if (type == 'Mano') {
                    //     filters.push({ name: 'custrecord_swc_location_type', operator: 'anyof', values: '4' });//仓库类型-Mano
                    // }
                }
                if (id) {
                    filters.push({ name: 'internalid', operator: 'is', values: id })
                }
                if (type == 'FBA') {
                    filters.push({ name: 'custrecord_swc_location_type', operator: 'anyof', values: '2' });//仓库类型-FBA
                    filters.push({ name: 'custrecord_swc_location_attribute', operator: 'anyof', values: '7' });//仓库属性-平台仓
                    filters.push({ name: 'custrecord_swc_location_store', operator: 'anyof', values: acc_id });
                } else if (type == 'CG') {
                    filters.push({ name: 'custrecord_swc_location_type', operator: 'anyof', values: '3' });//仓库类型-CG
                    filters.push({ name: 'custrecord_swc_location_store', operator: 'anyof', values: acc_id });
                    if (location_attribute == '店铺虚拟仓') {
                        filters.push({ name: 'custrecord_swc_location_attribute', operator: 'anyof', values: '12' });//仓库属性-店铺虚拟仓
                    } else if (location_attribute == '平台仓海外仓') {
                        filters.push({ name: 'custrecord_swc_location_attribute', operator: 'anyof', values: ['6', '7'] });//仓库属性-平台仓\海外仓
                    }
                } else if (type == 'Mano') {
                    filters.push({ name: 'custrecord_swc_location_type', operator: 'anyof', values: '4' });//仓库类型-Mano
                    filters.push({ name: 'custrecord_swc_location_store', operator: 'anyof', values: acc_id });
                    if (location_attribute == '店铺虚拟仓') {
                        filters.push({ name: 'custrecord_swc_location_attribute', operator: 'anyof', values: '12' });//仓库属性-店铺虚拟仓
                    } else if (location_attribute == '平台仓海外仓') {
                        filters.push({ name: 'custrecord_swc_location_attribute', operator: 'anyof', values: ['6', '7'] });//仓库属性-平台仓\海外仓
                    }
                }
                log.audit('filters', filters);
                search.create({
                    type: 'location',
                    filters: filters,
                }).run().each(function (rec) {
                    result.id = rec.id
                });
                log.audit('location_id', result.id);
                if (result.id) {
                    var rec = record.load({ type: 'location', id: result.id });
                    result.location_name = rec.getValue('name');
                    result.subsidiary = rec.getValue('subsidiary');
                    result.store_id = rec.getValue('custrecord_swc_location_store');
                    result.warehouse_id = rec.getValue('custrecord_swc_jj_warehouse_id');
                    result.warehouse_code = rec.getValue('custrecord_swc_warehouse_code');
                    result.location_type = rec.getValue('custrecord_swc_location_type');
                    result.location_attribute = rec.getValue('custrecord_swc_location_attribute');
                    result.subsidiary_text = rec.getText('subsidiary');
                    return result;
                } else {
                    throw '找不到系统仓库,请维护相应数据';
                }
            } catch (error) {
                log.audit('GetLocationInfo error', error);
                var e = error.message ? error.message : error;
                throw e;
            }
        }

        function GetJJPTLocationInfo(warehouseid) {
            try {
                var location_id, location_info;
                search.create({
                    type: 'customrecord_swc_jj_ptc',
                    filters: [
                        { name: 'custrecord_swc_location_id', operator: 'equalto', values: warehouseid },
                    ],
                    columns: [
                        { name: 'custrecord_swc_plocation' },
                    ]
                }).run().each(function (rec) {
                    location_id = rec.getValue('custrecord_swc_plocation');
                    return true;
                });
                if (location_id) {
                    location_info = GetLocationInfo('', location_id);
                    return location_info;
                } else {
                    throw '找不到仓库';

                }
            } catch (error) {
                log.error('GetLocationInfo error', error);
                throw error;
            }
        }

        function GetItemInfoByPSM(acc_id, msku) {
            try {
                var itemInfo = {};
                var filters = [
                    ['isinactive', 'is', false], 'and',
                    ['custrecord_swc_pt_sku_map_store', 'anyof', acc_id], 'and',
                    ['custrecord_swc_pt_sku_map_item', 'noneof', ['@NONE@']], 'and',
                    ['custrecord_swc_pt_sku_map_item.isinactive', 'is', false], 'and',
                    ['custrecord_swc_pt_sku_map_msku', 'is', msku]
                ]
                search.create({
                    type: 'customrecord_swc_platform_sku_mapping',
                    filters: filters,
                    columns: [
                        { name: 'custrecord_swc_pt_sku_map_item' },
                        { name: 'custrecord_swc_pt_sku_map_msku' },
                        { name: 'custitem_swc_cplb', join: 'custrecord_swc_pt_sku_map_item' },
                        { name: 'created', sort: search.Sort.DESC },
                    ]
                }).run().each(function (result) {
                    itemInfo.item_id = result.getValue('custrecord_swc_pt_sku_map_item');
                    itemInfo.item_text = result.getText('custrecord_swc_pt_sku_map_item');
                    itemInfo.msku = result.getValue('custrecord_swc_pt_sku_map_msku');
                    itemInfo.item_cplb = result.getValue({ name: 'custitem_swc_cplb', join: 'custrecord_swc_pt_sku_map_item' });
                    return false;
                });
                if (itemInfo.item_id) {
                    return itemInfo;
                } else {
                    throw '未匹配到对应NS货品';
                }
            } catch (error) {
                log.error('GetItemInfoByPSM error', error);
                var e = error.message ? error.message : error;
                throw e;
            }
        }



        function replaceToChinessChar(str) {

            var out = str.replace(/&#12290;/g, '。')
                .replace(/&#65311;/g, '？')
                .replace(/&#65281;/g, '！')
                .replace(/&#65292;/g, '，')
                .replace(/&#12289;/g, '、')
                .replace(/&#65307;/g, '；')
                .replace(/&#65306;/g, '：')
                .replace(/&#12300;/g, '「')
                .replace(/&#12301;/g, '」')
                .replace(/&#12302;/g, '『')
                .replace(/&#12303;/g, '』')
                .replace(/&#8216;/g, '‘')
                .replace(/&#8217;/g, '’')
                .replace(/&#8220;/g, '“')
                .replace(/&#8221;/g, '”')
                .replace(/&#65288;/g, '（')
                .replace(/&#65289;/g, '）')
                .replace(/&#12308;/g, '〔')
                .replace(/&#12309;/g, '〕')
                .replace(/&#12304;/g, '【')
                .replace(/&#12305;/g, '】')
                .replace(/&#8212;/g, '—')
                .replace(/&#8230;/g, '…')
                .replace(/&#8211;/g, '–')
                .replace(/&#65294;/g, '．')
                .replace(/&#12298;/g, '《')
                .replace(/&#12299;/g, '》')
                .replace(/&#12296;/g, '〈')
                .replace(/&#12297;/g, '〉')
                .replace(/&#12288;/g, ' ')
                .replace(/&#165;/g, '¥')
                .replace(/&#37;/g, '%')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&Acirc;&nbsp;/g, 'Â')
            return out;
        }

        function getFormatedDate(str, acc_timezone, time) {
            if (JSON.stringify(str).indexOf(',') > -1) {
                str = str.replace(/,/g, '.')
            }
            var strs = str.substring(0, 10)
            var ins = strs.split('.')[0].length
            var s_d = str
            if (ins < 4) {
                s_d = strs.split('.')[2] + '-' + strs.split('.')[1] + '-' + strs.split('.')[0] + ' ' + str.substring(11, 19)
            } else {
                s_d = str.substring(0, 19)
            }
            if (str.charAt(19) == '+' || str.charAt(19) == '-') {
                s_d = str.substring(0, 25)
            }
            var local_date_time = format.format({ value: moment.utc(s_d).toDate(), type: format.Type.DATETIMETZ, timezone: acc_timezone });
            if (time == 'time') {
                return local_date_time
            } else {
                s_d = format.parse({ value: local_date_time, type: 'date' })
                log.debug('s_d', s_d)
                return s_d
            }
        }

        function getDate(start_date, end_date, posted_date, deposit_date, acc_info) {
            log.debug('getDate', {
                start_date: start_date,
                end_date: end_date,
                posted_date: posted_date,
                deposit_date: deposit_date,
                acc_info: acc_info
            });
            var result = {};
            if (deposit_date) {
                // var deposit_date_time = format.format({ value: moment(deposit_date).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.timezone });
                deposit_date = format.parse({ value: deposit_date, type: 'date' });
                log.audit('deposit_date', deposit_date);
                var deposit_date_day = new Date(deposit_date).getDate();
                var deposit_date_month = new Date(deposit_date).getMonth() + 1;
                var deposit_date_year = new Date(deposit_date).getFullYear();
                result.date = deposit_date;
                result.day = deposit_date_day;
                result.month = deposit_date_month;
                result.year = deposit_date_year;
                return deposit_date
            } else {
                // var end_date_time = format.format({ value: moment(end_date).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.timezone });
                // var start_date_time = format.format({ value: moment(start_date).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.timezone });
                // var posted_date_time = format.format({ value: moment(posted_date).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.timezone });
                end_date = format.parse({ value: end_date, type: 'date' });
                start_date = format.parse({ value: start_date, type: 'date' });
                posted_date = format.parse({ value: posted_date, type: 'date' });

                var end_date_day = new Date(end_date).getDate()
                log.debug('end_date_day', end_date_day)
                var start_date_day = new Date(start_date).getDate()
                log.debug('start_date_day', start_date_day)
                var posted_date_day = new Date(posted_date).getDate()
                log.debug('posted_date_day', posted_date_day);
                var end_date_month = new Date(end_date).getMonth() + 1
                log.debug('end_date_month', end_date_month)
                var start_date_month = new Date(start_date).getMonth() + 1
                log.debug('start_date_month', start_date_month)
                var posted_date_month = new Date(posted_date).getMonth() + 1
                log.debug('posted_date_month', posted_date_month)

                if (end_date_day > acc_info.days_across_month && end_date_month > start_date_month) {
                    return end_date
                } else {
                    return posted_date
                }
            }
        }

        function getDateInfo(date, acc_info) {
            var result = {}
            date = format.format({ value: date, type: 'date' })
            // var date_day = new Date(date).getDate();
            // var date_month = new Date(date).getMonth() + 1;
            // var date_year = new Date(date).getFullYear();
            log.debug('date', date)
            var myDate = new Date(date.replace(/-/g, '/'));
            var date_day = myDate.getDate();
            var date_month = myDate.getMonth() + 1;
            var date_year = myDate.getFullYear();
            // var location_date_time = format.format({ value:  moment(date).toDate(), type: format.Type.DATETIMETZ, timezone: acc_info.timezone });
            // date = format.parse({ value: location_date_time, type: 'date' });
            result.date = date;
            result.day = date_day;
            result.month = date_month;
            result.year = date_year;
            return result
        }

        /**
         * 获取启用功能中是否启用 库位管理
         * @returns {boolean} true | false
         */
        function BinManagement() {
            var configRecObj = config.load({
                type: config.Type.FEATURES
            });
            /*  获取 是否启用库位管理  */
            var binmanagement = configRecObj.getValue('binmanagement');
            return binmanagement;
        }

        /**
         * 获取货品是否启动库位
         * @param {*} id
         * @returns {boolean} true | false
         */
        function GetItemBinManagement(id) {
            var item_bin;
            search.create({
                type: 'item',
                filters: [
                    { name: 'internalId', operator: 'is', values: id },
                ],
                columns: [
                    { name: 'usebins' }
                ]
            }).run().each(function (rec) {
                item_bin = rec.getValue('usebins');
            });
            return item_bin
        }

        /**
         * 获取地点是否启动库位
         * @param {*} id
         * @returns {boolean} true | false
         */
        function GetLocationBinManagement(id) {
            var location_bin;
            search.create({
                type: 'location',
                filters: [
                    { name: 'internalId', operator: 'is', values: id },
                ],
                columns: [
                    { name: 'usesbins' }
                ]
            }).run().each(function (rec) {
                location_bin = rec.getValue('usesbins');
            });
            return location_bin
        }

        /**
         * 获取启用功能中是否启用 发票审批
         * @returns {boolean} true | false
         */
        function GetInvoceApproval() {
            var configRecObj = config.load({
                type: config.Type.ACCOUNTING_PREFERENCES
            });
            /*  获取 是否启用发票审批  */
            var status = configRecObj.getValue('CUSTOMAPPROVALCUSTINVC');
            return status;
        }


        /**
         ** 加法函数，用来得到精确的加法结果
         ** 说明：javascript的加法结果会有误差，在两个浮点数相加的时候会比较明显。这个函数返回较为精确的加法结果。
         ** 调用：accAdd(arg1,arg2)
         ** 返回值：arg1加上arg2的精确结果
         **/
        function accAdd(arg1, arg2) {
            var r1, r2, m, c;
            try { r1 = arg1.toString().split(".")[1].length; } catch (e) { r1 = 0; }
            try { r2 = arg2.toString().split(".")[1].length; } catch (e) { r2 = 0; }
            c = Math.abs(r1 - r2);
            m = Math.pow(10, Math.max(r1, r2));
            if (c > 0) {
                var cm = Math.pow(10, c);
                if (r1 > r2) {
                    arg1 = Number(arg1.toString().replace(".", ""));
                    arg2 = Number(arg2.toString().replace(".", "")) * cm;
                } else {
                    arg1 = Number(arg1.toString().replace(".", "")) * cm;
                    arg2 = Number(arg2.toString().replace(".", ""));
                }
            } else {
                arg1 = Number(arg1.toString().replace(".", ""));
                arg2 = Number(arg2.toString().replace(".", ""));
            }
            return (arg1 + arg2) / m;
        }

        /**
         ** 减法函数，用来得到精确的减法结果
         ** 说明：javascript的减法结果会有误差，在两个浮点数相减的时候会比较明显。这个函数返回较为精确的减法结果。
         ** 调用：accSub(arg1,arg2)
         ** 返回值：arg1加上arg2的精确结果
         **/
        function accSub(arg1, arg2) {
            var r1, r2, m, n;
            try { r1 = arg1.toString().split(".")[1].length; } catch (e) { r1 = 0; }
            try { r2 = arg2.toString().split(".")[1].length; } catch (e) { r2 = 0; }
            m = Math.pow(10, Math.max(r1, r2)); //last modify by deeka //动态控制精度长度
            n = (r1 >= r2) ? r1 : r2;
            return ((arg1 * m - arg2 * m) / m).toFixed(n);
        }

        /**
         ** 乘法函数，用来得到精确的乘法结果
         ** 说明：javascript的乘法结果会有误差，在两个浮点数相乘的时候会比较明显。这个函数返回较为精确的乘法结果。
         ** 调用：accMul(arg1,arg2)
         ** 返回值：arg1乘以 arg2的精确结果
         **/
        function accMul(arg1, arg2) {
            var m = 0, s1 = arg1.toString(), s2 = arg2.toString();
            try { m += s1.split(".")[1].length; } catch (e) { }
            try { m += s2.split(".")[1].length; } catch (e) { }
            return Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m);
        }

        /**
         ** 除法函数，用来得到精确的除法结果
         ** 说明：javascript的除法结果会有误差，在两个浮点数相除的时候会比较明显。这个函数返回较为精确的除法结果。
         ** 调用：accDiv(arg1,arg2)
         ** 返回值：arg1除以arg2的精确结果
         **/
        function accDiv(arg1, arg2) {
            var t1 = 0, t2 = 0, r1, r2;
            try { t1 = arg1.toString().split(".")[1].length; } catch (e) { }
            try { t2 = arg2.toString().split(".")[1].length; } catch (e) { }
            r1 = Number(arg1.toString().replace(".", ""));
            r2 = Number(arg2.toString().replace(".", ""));
            return accMul((r1 / r2), Math.pow(10, t2 - t1));

        }

        /**
         * 拉取三方仓入库订单详情
         */
        function JJGetThirdInventory(auth, params) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 2000) {
                    break;
                }
            }

            var body = {
                "thirdWarehouseId": params.thirdWarehouseId,
                "wayBillNumberArr": [params.wayBillNumber],
                "shippingMethodCode": params.shippingMethodCode
            };

            log.audit('body', body);

            var path = '/warehouseCenter/ship/inboundOrder/detail';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
            }
            log.audit('JJGetThirdInventory-->response', response_body);
            if (response_body) {
                if (response_body.code == '200') {
                    return response_body.data;
                } else {
                    log.error("查询三方仓入库订单详情:", JSON.stringify(response_body.body))
                }
            }
        }


        /**
         * 根据sku名称查询类别
         */
        function SearchClassID(sku_name) {
            try {
                var class_id = '';
                search.create({
                    type: 'classification',
                    filters: [
                        { name: 'name', operator: 'is', values: sku_name },
                    ],
                }).run().each(function (rec) {
                    class_id = rec.id;
                });
                return class_id
            } catch (error) {
                log.error('SearchClassID error', error);
            }
        }

        /**
         * 根据sku名称查询类别
         */
        function SearchClassInfo(sku_info) {
            try {
                var result = [];
                var filters = [];
                for (var i = 0; i < sku_info.length; i++) {
                    if (filters.length) {
                        filters.push('or');
                    }
                    filters.push(['name', 'is', sku_info[i]])
                }
                var class_id = '';
                search.create({
                    type: 'classification',
                    filters: filters,
                    columns: [
                        { name: 'name' }
                    ]
                }).run().each(function (rec) {
                    result.push({
                        id: rec.id,
                        name: rec.getValue('name'),
                    })
                    return true
                });
                return result;
            } catch (error) {
                log.error('SearchClassInfo error', error);
            }
        }

        function JJGetReturnOrder(auth, params, page, pageSize, data) {

            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > 1000) {
                    break;
                }
            }

            var rs_data = [];
            if (data.length) {
                for (var i = 0; i < data.length; i++) {
                    rs_data.push(data[i]);
                }
            }
            var body = {
                "page": page,
                "pagesize": pageSize,
            };

            if (params.start_date && params.end_date) {
                body.createTimeBegin = params.start_date;
                body.createTimeEnd = params.end_date;
            }

            log.audit('body', body);

            var path = '/operation/sale/returnOrder/page';
            try {
                var response_body = JJHttpsResponse('post', path, auth, body);
            } catch (e) {
                log.error("response_body error:", e)
            }
            log.audit('JJGetReturnOrder-->response', response_body);
            if (response_body) {
                if (response_body.code == '200') {
                    var rows = response_body.data.rows;
                    var total = response_body.data.total;
                    if (Number(total) == '0') {
                        return rs_data
                    } else {
                        log.audit('rows', rows.length);
                        if (rows.length) {
                            rows.map(function (node) {
                                rs_data.push(node);
                            });
                            if (Number(total) == Number(rs_data.length)) {
                                return rs_data
                            } else {
                                return JJGetReturnOrder(auth, params, Number(page) + 1, pageSize, rs_data);
                            }
                        } else {
                            return rs_data
                        }
                    }
                } else {
                    log.error("查询退货订单订单列表:", JSON.stringify(response_body.body))
                    // throw '查询VC-DF订单列表:' + JSON.stringify(response_body.body)
                }
            }
            return rs_data
        }

        return {
            fieldsMapping: fieldsMapping,
            SearchSalesOrder: SearchSalesOrder,
            SearchItemInfo: SearchItemInfo,
            GetItemInfo: GetItemInfo,
            JJDeveloperAccountAuth: JJDeveloperAccountAuth,
            JJHttpsResponse: JJHttpsResponse,
            getAccountList: getAccountList,
            GetAccountInfo: GetAccountInfo,
            GetVCAccountInfo: GetVCAccountInfo,
            JJListOrders: JJListOrders,
            JJGetOrderItems: JJGetOrderItems,
            JJGetAmazonMsku: JJGetAmazonMsku,
            JJGetPlatformMsku: JJGetPlatformMsku,
            JJGetThirdProduct: JJGetThirdProduct,
            JJGetFbaShipment: JJGetFbaShipment,
            JJGetZFHShipment: JJGetZFHShipment,
            JJGetStorageFee: JJGetStorageFee,
            JJGetStorageLongFee: JJGetStorageLongFee,
            JJGetFbmReturnOrder: JJGetFbmReturnOrder,
            JJGetAdsSpProduct: JJGetAdsSpProduct,
            JJGetAdsSbCampaign: JJGetAdsSbCampaign,
            JJGetAdsSdProduct: JJGetAdsSdProduct,
            JJGetRemovalOrder: JJGetRemovalOrder,
            JJGetRemovalOrderDetail: JJGetRemovalOrderDetail,
            JJGetDateRangeReports: JJGetDateRangeReports,
            JJGetVCDFOrder: JJGetVCDFOrder,
            JJGetVCPOOrder: JJGetVCPOOrder,
            JJGetVCPOShipment: JJGetVCPOShipment,
            JJGetObdOutbound: JJGetObdOutbound,
            JJGetLogisticsCostV2: JJGetLogisticsCostV2,
            JJGetShipUnitsDetail: JJGetShipUnitsDetail,
            GetLocationInfo: GetLocationInfo,
            replaceToChinessChar: replaceToChinessChar,
            getFormatedDate: getFormatedDate,
            getDate: getDate,
            getDateInfo: getDateInfo,
            BinManagement: BinManagement,
            GetItemBinManagement: GetItemBinManagement,
            GetLocationBinManagement: GetLocationBinManagement,
            GetInvoceApproval: GetInvoceApproval,
            accAdd: accAdd,
            accSub: accSub,
            accMul: accMul,
            accDiv: accDiv,
            JJGetThirdInventory: JJGetThirdInventory,
            SearchClassID: SearchClassID,
            SearchClassInfo: SearchClassInfo,
            JJGetProductInfos: JJGetProductInfos,
            GetJJPTLocationInfo: GetJJPTLocationInfo,
            GetItemInfoByPSM: GetItemInfoByPSM,
            JJGetReturnOrder: JJGetReturnOrder,
            JJGetAfterSalesOrder: JJGetAfterSalesOrder,
        }
    });