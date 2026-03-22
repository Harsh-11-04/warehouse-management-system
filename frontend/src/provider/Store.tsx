import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { UserSlice } from "./slice/user.slice";
import { SidebarSlice } from "./slice/Sidebar.slice";
import { AuthApi } from "./queries/Auth.query";
import { UserApi } from "./queries/Users.query";
import { OrdersApi } from "./queries/Orders.query";
import { ProductApi } from "./queries/Product.query";
import { WarehouseApi } from "./queries/Warehouse.query";
import { StockLocationApi } from "./queries/StockLocation.query";
import { ShipmentApi } from "./queries/Shipment.query";
import { ReportApi } from "./queries/Report.query";
import { ActivityLogApi } from "./queries/ActivityLog.query";
import { ReorderSuggestionApi } from "./queries/ReorderSuggestion.query";
import { PurchaseOrderApi } from "./queries/PurchaseOrder.query";
import { BillingCustomerApi } from "./queries/BillingCustomer.query";
import { BillingProductApi } from "./queries/BillingProduct.query";
import { BillingInvoiceApi } from "./queries/BillingInvoice.query";
import BillingSettingsApi from "./queries/BillingSettings.query";
import { CloudAnalyticsApi } from "./queries/CloudAnalytics.query";
import { SyncApi } from "./queries/Sync.query";
import { CloudSyncAuditApi } from "./queries/CloudSyncAudit.query";

export const store = configureStore({
    reducer: {
        [UserSlice.name]: UserSlice.reducer,
        [SidebarSlice.name]: SidebarSlice.reducer,
        [AuthApi.reducerPath]: AuthApi.reducer,
        [UserApi.reducerPath]: UserApi.reducer,
        [OrdersApi.reducerPath]: OrdersApi.reducer,
        [ProductApi.reducerPath]: ProductApi.reducer,
        [WarehouseApi.reducerPath]: WarehouseApi.reducer,
        [StockLocationApi.reducerPath]: StockLocationApi.reducer,
        [ShipmentApi.reducerPath]: ShipmentApi.reducer,
        [ReportApi.reducerPath]: ReportApi.reducer,
        [ActivityLogApi.reducerPath]: ActivityLogApi.reducer,
        [ReorderSuggestionApi.reducerPath]: ReorderSuggestionApi.reducer,
        [PurchaseOrderApi.reducerPath]: PurchaseOrderApi.reducer,
        [BillingCustomerApi.reducerPath]: BillingCustomerApi.reducer,
        [BillingProductApi.reducerPath]: BillingProductApi.reducer,
        [BillingInvoiceApi.reducerPath]: BillingInvoiceApi.reducer,
        [BillingSettingsApi.reducerPath]: BillingSettingsApi.reducer,
        [CloudAnalyticsApi.reducerPath]: CloudAnalyticsApi.reducer,
        [SyncApi.reducerPath]: SyncApi.reducer,
        [CloudSyncAuditApi.reducerPath]: CloudSyncAuditApi.reducer
    },

    middleware: (d) => d().concat(
        AuthApi.middleware,
        UserApi.middleware,
        OrdersApi.middleware,
        ProductApi.middleware,
        WarehouseApi.middleware,
        StockLocationApi.middleware,
        ShipmentApi.middleware,
        ReportApi.middleware,
        ActivityLogApi.middleware,
        ReorderSuggestionApi.middleware,
        PurchaseOrderApi.middleware,
        BillingCustomerApi.middleware,
        BillingProductApi.middleware,
        BillingInvoiceApi.middleware,
        BillingSettingsApi.middleware,
        CloudAnalyticsApi.middleware,
        SyncApi.middleware,
        CloudSyncAuditApi.middleware
    )
})

setupListeners(store.dispatch)
