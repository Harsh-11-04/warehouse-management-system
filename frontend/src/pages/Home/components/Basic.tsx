
import { useState, useEffect } from 'react';
import { Chart } from 'primereact/chart';
import { useDashboardDataQuery } from '../../../provider/queries/Users.query';
import Loader from '../../../components/Loader';
import { useLocation } from 'react-router-dom';

export default function BasicChart() {

    const { data, isError, isLoading, isFetching } = useDashboardDataQuery({})
    const location = useLocation()

    const [chartData, setChartData] = useState({});
    const [chartOptions, setChartOptions] = useState({});
    const [viewType, setViewType] = useState<'activity' | 'revenue'>('activity')

    useEffect(() => {
        if (!data) return;

        const isActivity = viewType === 'activity';

        const chartData = {
            labels: isActivity ? ['Total Users', 'Total Orders'] : ['Total Sales (Revenue)'],
            datasets: [
                {
                    label: isActivity ? 'Transaction Overview' : 'Financial Overview',
                    data: isActivity ? [data.consumers, data.orders] : [data.sell],
                    backgroundColor: isActivity
                        ? ['rgba(54, 162, 235, 0.5)', 'rgba(255, 159, 64, 0.5)']
                        : ['rgba(16, 185, 129, 0.5)'],
                    borderColor: isActivity
                        ? ['rgb(54, 162, 235)', 'rgb(255, 159, 64)']
                        : ['rgb(16, 185, 129)'],
                    borderWidth: 1,
                    borderRadius: 8,
                }
            ]
        };

        const options = {
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context: any) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += viewType === 'revenue' ? `₹${context.parsed.y.toLocaleString('en-IN')}` : context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function (value: any) {
                            return viewType === 'revenue' ? `₹${value.toLocaleString('en-IN')}` : value;
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        };

        setChartData(chartData);
        setChartOptions(options);
    }, [data, location, viewType]);

    if (isFetching || isLoading) return <Loader />
    if (isError) return <div className="p-4 text-red-500">Failed to load analytics</div>

    return (
        <div className="w-full lg:w-1/2 p-2">
            <div className="bg-white p-4 rounded-xl border shadow-sm h-[350px] relative">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-gray-600">
                        {viewType === 'activity' ? 'Users vs Orders' : 'Revenue Performance'}
                    </h4>
                    <button
                        onClick={() => setViewType(prev => prev === 'activity' ? 'revenue' : 'activity')}
                        className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded transition-colors flex items-center gap-1"
                    >
                        <i className="pi pi-sync text-[8px]" />
                        Shuffle View
                    </button>
                </div>
                <div className="h-[250px]">
                    <Chart type="bar" data={chartData} options={chartOptions} style={{ height: '100%' }} />
                </div>
            </div>
        </div>
    )
}

