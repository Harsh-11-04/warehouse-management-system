import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import Login from "../pages/Login";
import Register from "../pages/Register";
import HomePage from "../pages/Home";
import ErrorPage from "../pages/Error";
import Invoice from "../pages/Invoice";
import UserPage from "../pages/Users";
import OrdersPage from "../pages/Orders";
import ProductsPage from "../pages/Products";
import WarehousePage from "../pages/Warehouse";
import LocationsPage from "../pages/Locations";
import StockAssignPage from "../pages/StockAssign";
import WarehouseStockPage from "../pages/WarehouseStock";
import PickingPage from "../pages/Picking";
import ShipmentsPage from "../pages/Shipments";
import ReportsPage from "../pages/Reports";
import ActivityLogPage from "../pages/ActivityLogs";
import ReorderSuggestionPage from "../pages/ReorderSuggestion";
import { useSelector } from "react-redux";
import { UserSlicePath } from "./slice/user.slice";
import { Navigate } from "react-router-dom";

const RoleGuard = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
    const user = useSelector(UserSlicePath) as { role?: string } | null;
    const role = user?.role || 'warehouse_staff';

    if (allowedRoles.includes(role)) {
        return <>{children}</>;
    }

    return <Navigate to="/" replace />;
};

export const Routes = createBrowserRouter([
    {
        path: '/',
        Component: App,
        children: [
            {
                path: '/',
                Component: HomePage
            },
            {
                path: '/invoice',
                Component: Invoice
            },
            {
                path: '/user',
                element: <RoleGuard allowedRoles={['admin', 'manager']}><UserPage /></RoleGuard>
            },
            {
                path: '/orders',
                Component: OrdersPage
            },
            {
                path: '/products',
                Component: ProductsPage
            },
            {
                path: '/warehouses',
                element: <RoleGuard allowedRoles={['admin', 'manager']}><WarehousePage /></RoleGuard>
            },
            {
                path: '/locations',
                element: <RoleGuard allowedRoles={['admin', 'manager']}><LocationsPage /></RoleGuard>
            },
            {
                path: '/stock-assign',
                element: <RoleGuard allowedRoles={['admin', 'manager', 'warehouse_staff']}><StockAssignPage /></RoleGuard>
            },
            {
                path: '/warehouse-stock',
                element: <RoleGuard allowedRoles={['admin', 'manager', 'warehouse_staff']}><WarehouseStockPage /></RoleGuard>
            },
            {
                path: '/picking',
                element: <RoleGuard allowedRoles={['admin', 'manager', 'warehouse_staff']}><PickingPage /></RoleGuard>
            },
            {
                path: '/shipments',
                element: <RoleGuard allowedRoles={['admin', 'manager', 'warehouse_staff']}><ShipmentsPage /></RoleGuard>
            },
            {
                path: '/reports',
                element: <RoleGuard allowedRoles={['admin', 'manager']}><ReportsPage /></RoleGuard>
            },
            {
                path: '/activity-logs',
                element: <RoleGuard allowedRoles={['admin', 'manager']}><ActivityLogPage /></RoleGuard>
            },
            {
                path: '/reorder-suggestions',
                element: <RoleGuard allowedRoles={['admin', 'manager']}><ReorderSuggestionPage /></RoleGuard>
            },
            {
                path: '*',
                Component: ErrorPage
            }
        ]
    },
    {
        path: '/login',
        Component: Login,

    },
    {
        path: '/register',
        Component: Register
    }
])
