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
        [ActivityLogApi.reducerPath]: ActivityLogApi.reducer
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
        ActivityLogApi.middleware
    )
})

setupListeners(store.dispatch)