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
import PurchaseOrdersPage from "../pages/PurchaseOrders";
import BillingDashboardPage from "../pages/BillingDashboard";
import BillingCustomersPage from "../pages/BillingCustomers";
import BillingProductsPage from "../pages/BillingProducts";
import BillingNewInvoicePage from "../pages/BillingNewInvoice";
import BillingStockPage from "../pages/BillingStock";
import BillingInvoiceDetailPage from "../pages/BillingInvoiceDetail";
import BillingReportsPage from "../pages/BillingReports";
import BillingSettingsPage from "../pages/BillingSettings";
import BillingActivityPage from "../pages/BillingActivity";
import SyncAuditViewerPage from "../pages/SyncAuditViewer";
import BillingApp from "../BillingApp";
import { useSelector } from "react-redux";
import { UserSlicePath } from "./slice/user.slice";
import { Navigate } from "react-router-dom";

const getRoleFromStoredToken = () => {
    if (typeof window === 'undefined') return null;

    const token = window.localStorage.getItem('token');
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) return null;

    try {
        const base64 = parts[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
        const payload = JSON.parse(window.atob(base64));
        return typeof payload?.role === 'string' ? payload.role : null;
    } catch {
        return null;
    }
};

const RoleGuard = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
    const user = useSelector(UserSlicePath) as { role?: string } | null;
    const hasToken = typeof window !== 'undefined' ? Boolean(window.localStorage.getItem('token')) : false;
    const role = user?.role || getRoleFromStoredToken();

    if (!hasToken && !user) {
        return <Navigate to="/login" replace />;
    }

    if (!role) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.includes(role)) {
        return <>{children}</>;
    }

    // Redirect warehouse_staff to their designated landing page if they try to access a blocked route
    if (role === 'warehouse_staff') {
        return <Navigate to="/billing/new-invoice" replace />;
    }

    return <Navigate to="/" replace />;
};

export const Routes = createBrowserRouter([
    {
        path: '/',
        element: <RoleGuard allowedRoles={['admin', 'manager']}><App /></RoleGuard>,
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
                element: <WarehousePage />
            },
            {
                path: '/locations',
                element: <LocationsPage />
            },
            {
                path: '/stock-assign',
                element: <StockAssignPage />
            },
            {
                path: '/warehouse-stock',
                element: <WarehouseStockPage />
            },
            {
                path: '/picking',
                element: <PickingPage />
            },
            {
                path: '/shipments',
                element: <ShipmentsPage />
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
                path: '/purchase-orders',
                element: <RoleGuard allowedRoles={['admin', 'manager']}><PurchaseOrdersPage /></RoleGuard>
            },
            {
                path: '*',
                Component: ErrorPage
            }
        ]
    },
    {
        path: '/billing',
        Component: BillingApp,
        children: [
            {
                index: true,
                element: <RoleGuard allowedRoles={['admin', 'manager']}><BillingDashboardPage /></RoleGuard>
            },
            {
                path: 'customers',
                element: <RoleGuard allowedRoles={['admin', 'manager', 'warehouse_staff']}><BillingCustomersPage /></RoleGuard>
            },
            {
                path: 'products',
                element: <RoleGuard allowedRoles={['admin', 'manager', 'warehouse_staff']}><BillingProductsPage /></RoleGuard>
            },
            {
                path: 'new-invoice',
                element: <RoleGuard allowedRoles={['admin', 'manager', 'warehouse_staff']}><BillingNewInvoicePage /></RoleGuard>
            },
            {
                path: 'stock',
                element: <RoleGuard allowedRoles={['admin', 'manager']}><BillingStockPage /></RoleGuard>
            },
            {
                path: 'invoice/:id',
                element: <RoleGuard allowedRoles={['admin', 'manager', 'warehouse_staff']}><BillingInvoiceDetailPage /></RoleGuard>
            },
            {
                path: 'reports',
                element: <RoleGuard allowedRoles={['admin', 'manager']}><BillingReportsPage /></RoleGuard>
            },
            {
                path: 'settings',
                element: <RoleGuard allowedRoles={['admin', 'manager']}><BillingSettingsPage /></RoleGuard>
            },
            {
                path: 'activity',
                element: <RoleGuard allowedRoles={['admin']}><BillingActivityPage /></RoleGuard>
            },
            {
                path: 'admin',
                element: <RoleGuard allowedRoles={['admin', 'manager']}><BillingDashboardPage /></RoleGuard>
            },
            {
                path: 'admin/sync-audit',
                element: <RoleGuard allowedRoles={['admin', 'manager']}><SyncAuditViewerPage /></RoleGuard>
            },
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
