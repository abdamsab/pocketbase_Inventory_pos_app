import { DollarSign, ShoppingBag, AlertTriangle, TrendingUp, Users, Clock, Calendar, Wifi, WifiOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { pb } from '../../lib/pocketbase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useRealtimeDashboard } from '../../hooks/useRealtimeSubscription';
import { DashboardSkeleton, EmptySales } from '../../components/common/LoadingStates';

const StatCard = ({ title, value, trend, icon: Icon, color }: any) => (
    <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-${color}`}>
            <Icon size={100} />
        </div>

        <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-${color}/10 text-${color}`}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <span className="flex items-center gap-1 text-xs font-medium text-secondary bg-secondary/10 px-2 py-1 rounded-full">
                        <TrendingUp size={12} />
                        {trend}
                    </span>
                )}
            </div>

            <h3 className="text-text-muted text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-heading font-bold text-text-main">{value}</p>
        </div>
    </div>
);

export function Dashboard() {
    const [currentTime, setCurrentTime] = useState(new Date());

    // Real-time updates
    const realtimeUpdates = useRealtimeDashboard((event) => {
        console.log('Real-time dashboard update:', event);
        // Trigger dashboard refresh when any data changes
    });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            let sales: any[] = [];
            let products: any[] = [];
            let users: any[] = [];

            try {
                sales = await pb.collection('sales').getFullList({
                    sort: '-created',
                    limit: 100,
                });
            } catch (e) {
                console.warn('Failed to fetch sales data', e);
            }

            try {
                products = await pb.collection('products').getFullList();
            } catch (e) {
                console.warn('Failed to fetch products data', e);
            }

            try {
                users = await pb.collection('users').getFullList();
            } catch (e) {
                console.warn('Failed to fetch users data', e);
            }

            const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
            const lowStockProducts = products.filter(p => p.stock <= (p.reorder_point || 5));

            // Get recent sales (last 5)
            const recentSales = sales.slice(0, 5).map(sale => ({
                ...sale,
                formattedDate: format(new Date(sale.created), 'MMM dd, HH:mm')
            }));

            // Get sales by day for chart (last 7 days)
            const salesByDay: Record<string, number> = {};
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                return format(date, 'MMM dd');
            });

            last7Days.forEach(day => {
                salesByDay[day] = 0;
            });

            sales.forEach(sale => {
                const day = format(new Date(sale.created), 'MMM dd');
                if (salesByDay[day] !== undefined) {
                    salesByDay[day] += sale.total;
                }
            });

            const chartData = Object.entries(salesByDay).map(([day, total]) => ({
                day,
                total: Math.round(total * 100) / 100
            }));

            return {
                totalRevenue,
                totalSales: sales.length,
                lowStockCount: lowStockProducts.length,
                totalProducts: products.length,
                totalUsers: users.length,
                recentSales,
                chartData,
            };
        },
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    if (isLoading) return <DashboardSkeleton />;

    if (error) return (
        <div className="text-center py-12 text-danger">
            Failed to load dashboard data
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header with Date/Time and Connection Status */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-text-main">Dashboard</h2>
                    <p className="text-text-muted">Welcome back! Here's what's happening today.</p>
                </div>
                <div className="text-right space-y-2">
                    {/* Connection Status */}
                    <div className="flex items-center justify-end gap-2">
                        {realtimeUpdates.isConnected ? (
                            <Wifi className="w-4 h-4 text-green-500" />
                        ) : (
                            <WifiOff className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className={`text-xs font-medium ${
                            realtimeUpdates.isConnected
                                ? 'text-green-600'
                                : 'text-yellow-600'
                        }`}>
                            {realtimeUpdates.isConnected
                                ? 'Real-time Active'
                                : 'Real-time Offline'}
                        </span>
                    </div>

                    {/* Date/Time */}
                    <div className="flex items-center gap-2 text-text-main font-semibold">
                        <Clock size={18} />
                        {format(currentTime, 'HH:mm:ss')}
                    </div>
                    <div className="flex items-center gap-2 text-text-muted text-sm">
                        <Calendar size={14} />
                        {format(currentTime, 'EEEE, MMMM dd, yyyy')}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={`$${stats?.totalRevenue?.toFixed(2) || '0.00'}`}
                    trend="+12.5%"
                    icon={DollarSign}
                    color="primary"
                />
                <StatCard
                    title="Total Sales"
                    value={stats?.totalSales || 0}
                    trend="+8.2%"
                    icon={ShoppingBag}
                    color="secondary"
                />
                <StatCard
                    title="Low Stock Items"
                    value={stats?.lowStockCount || 0}
                    trend={null}
                    icon={AlertTriangle}
                    color="danger"
                />
                <StatCard
                    title="Active Users"
                    value={stats?.totalUsers || 0}
                    trend={null}
                    icon={Users}
                    color="primary"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Chart */}
                <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-text-main mb-4">Sales Overview (Last 7 Days)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats?.chartData || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="day" stroke="var(--text-muted)" />
                            <YAxis stroke="var(--text-muted)" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                }}
                            />
                            <Bar dataKey="total" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent Sales */}
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-text-main mb-4">Recent Sales</h3>
                    <div className="space-y-3">
                        {stats?.recentSales && stats.recentSales.length > 0 ? (
                            stats.recentSales.map((sale: any) => (
                                <div key={sale.id} className="flex justify-between items-center p-3 bg-surfaceHighlight rounded-lg hover:bg-surfaceHighlight/80 transition-colors">
                                    <div>
                                        <p className="font-medium text-text-main text-sm">{sale.sale_number}</p>
                                        <p className="text-xs text-text-muted">{sale.formattedDate}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-primary">${sale.total.toFixed(2)}</p>
                                        <p className="text-xs text-text-muted capitalize">{sale.payment_method}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <EmptySales />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
