
import { useState, useEffect } from 'react';
import { Chart } from 'primereact/chart';
import { useDashboardDataQuery } from '../../../provider/queries/Users.query';
import { useLocation } from 'react-router-dom';
import Loader from '../../../components/Loader';

export default function PieChartDemo() {
    const [chartData, setChartData] = useState({});
    const [chartOptions, setChartOptions] = useState({});
    const { data, isError, isLoading, isFetching } = useDashboardDataQuery({})
    const location = useLocation()

    useEffect(() => {
        if (!data) return;

        const chartData = {
            labels: ['Revenue (Sales)', 'Order Activities', 'User Interactions'],
            datasets: [
                {
                    data: [data.sell, data.orders, data.consumers],
                    backgroundColor: [
                        '#10b981', // green-500 (Revenue)
                        '#3b82f6', // blue-500 (Orders)
                        '#f59e0b'  // amber-500 (Users)
                    ],
                    hoverBackgroundColor: [
                        '#059669',
                        '#2563eb',
                        '#d97706'
                    ]
                }
            ]
        }
        const options = {
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            maintainAspectRatio: false,
            cutout: '60%' // Make it a doughnut for a more modern look
        };

        setChartData(chartData);
        setChartOptions(options);
    }, [data, location]);

    if (isFetching || isLoading) return <Loader />
    if (isError) return <div className="p-4 text-red-500">Failed to load analytics</div>

    return (
        <div className="w-full lg:w-1/2 p-2">
            <div className="bg-white p-4 rounded-xl border shadow-sm h-[350px]">
                <h4 className="text-sm font-semibold text-gray-600 mb-4">Revenue & Activity</h4>
                <div className="flex justify-center h-[250px]">
                    <Chart type="doughnut" data={chartData} options={chartOptions} className="w-full max-w-[250px]" />
                </div>
            </div>
        </div>
    )
}
