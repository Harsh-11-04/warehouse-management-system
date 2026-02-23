import BasicChart from "./components/Basic"
import PieChartDemo from "./components/Pie"
import { useGetDashboardStatsQuery } from '../../provider/queries/Report.query'
import { useNavigate } from 'react-router-dom'

const HomePage = () => {
    const { data: stats, isLoading } = useGetDashboardStatsQuery()
    const navigate = useNavigate()

    const formatCurrency = (val: number) => `₹${(val || 0).toLocaleString('en-IN')}`

    const statCards = [
        {
            label: 'Total Products',
            value: stats?.totalProducts || 0,
            icon: 'pi pi-box',
            color: 'from-blue-500 to-blue-600',
            bgLight: 'bg-blue-50',
            textColor: 'text-blue-700',
            onClick: () => navigate('/products')
        },
        {
            label: 'Total Units in Stock',
            value: (stats?.totalUnits || 0).toLocaleString(),
            icon: 'pi pi-database',
            color: 'from-green-500 to-green-600',
            bgLight: 'bg-green-50',
            textColor: 'text-green-700',
            onClick: () => navigate('/warehouse-stock')
        },
        {
            label: 'Inventory Value',
            value: formatCurrency(stats?.totalValue),
            icon: 'pi pi-indian-rupee',
            color: 'from-purple-500 to-purple-600',
            bgLight: 'bg-purple-50',
            textColor: 'text-purple-700',
            onClick: () => navigate('/reports')
        },
        {
            label: 'Low Stock Alerts',
            value: stats?.lowStockCount || 0,
            icon: 'pi pi-exclamation-triangle',
            color: 'from-orange-500 to-orange-600',
            bgLight: 'bg-orange-50',
            textColor: 'text-orange-700',
            onClick: () => navigate('/products')
        },
        {
            label: 'Warehouses',
            value: stats?.totalWarehouses || 0,
            icon: 'pi pi-building',
            color: 'from-cyan-500 to-cyan-600',
            bgLight: 'bg-cyan-50',
            textColor: 'text-cyan-700',
            onClick: () => navigate('/warehouses')
        },
        {
            label: 'Pending Shipments',
            value: stats?.pendingShipments || 0,
            icon: 'pi pi-truck',
            color: 'from-red-500 to-red-600',
            bgLight: 'bg-red-50',
            textColor: 'text-red-700',
            onClick: () => navigate('/shipments')
        },
        ...(stats?.pendingReorderCount ? [{
            label: 'Reorder Suggestions',
            value: stats.pendingReorderCount,
            icon: 'pi pi-shopping-cart',
            color: 'from-amber-500 to-amber-600',
            bgLight: 'bg-amber-50',
            textColor: 'text-amber-700',
            onClick: () => navigate('/reorder-suggestions')
        }] : [])
    ]

    return (
        <div className="p-4">
            {/* WMS Stats Cards */}
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Warehouse Overview</h2>
                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-gray-100 rounded-xl p-4 h-28 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {statCards.map((card, i) => (
                            <div key={i}
                                onClick={card.onClick}
                                className={`${card.bgLight} rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border border-transparent hover:border-gray-200`}>
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                                    <i className={`${card.icon} text-white text-lg`} />
                                </div>
                                <div className={`text-2xl font-bold ${card.textColor}`}>{card.value}</div>
                                <div className="text-xs text-gray-500 mt-1 font-medium">{card.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Shipments Table */}
            {stats?.recentShipments?.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Recent Shipments</h3>
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left p-3 font-medium text-gray-600">Type</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Product</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Qty</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Status</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentShipments.map((s: any, i: number) => (
                                    <tr key={i} className="border-t hover:bg-gray-50">
                                        <td className="p-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.type === 'Inbound'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                <i className={`pi ${s.type === 'Inbound' ? 'pi-download' : 'pi-upload'} text-[10px]`} />
                                                {s.type}
                                            </span>
                                        </td>
                                        <td className="p-3 font-medium">{s.product?.name || 'N/A'}</td>
                                        <td className="p-3">{s.quantity}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'Delivered' ? 'bg-green-100 text-green-700'
                                                : s.status === 'In Transit' ? 'bg-blue-100 text-blue-700'
                                                    : s.status === 'Cancelled' ? 'bg-red-100 text-red-700'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-500">
                                            {new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Existing Charts */}
            <h3 className="text-lg font-semibold text-gray-700 mb-3">IMS Analytics</h3>
            <div className="w-full flex flex-wrap">
                <BasicChart />
                <PieChartDemo />
            </div>
        </div>
    )
}

export default HomePage