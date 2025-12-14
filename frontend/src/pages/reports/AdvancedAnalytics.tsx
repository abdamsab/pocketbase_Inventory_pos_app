import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package,
  BarChart3, Download, RefreshCw
} from 'lucide-react';
import { useAnalyticsDashboard } from '../../hooks/useAnalytics';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: React.ComponentType<{ size?: number }>;
  color: string;
}

const StatCard = ({ title, value, change, changeType, icon: Icon, color }: StatCardProps) => (
  <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-text-muted text-sm font-medium">{title}</p>
        <p className="text-3xl font-heading font-bold text-text-main mt-2">{value}</p>
        {change && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            changeType === 'positive' ? 'text-green-600' : 'text-red-600'
          }`}>
            {changeType === 'positive' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{change}</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl bg-${color}/10 text-${color}`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

export function AdvancedAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');

  const analytics = useAnalyticsDashboard();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'sales', label: 'Sales Trends', icon: TrendingUp },
    { id: 'products', label: 'Products', icon: Package },
  ];

  if (analytics.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-heading font-bold text-text-main">Advanced Analytics</h2>
            <p className="text-text-muted">Business intelligence dashboard</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-surfaceHighlight rounded mb-2"></div>
              <div className="h-8 bg-surfaceHighlight rounded mb-2"></div>
              <div className="h-3 bg-surfaceHighlight rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (analytics.error) {
    return (
      <div className="text-center py-12 text-danger">
        <p>Failed to load analytics data</p>
        <button
          onClick={analytics.refetch}
          className="mt-4 btn-secondary"
        >
          <RefreshCw size={16} className="mr-2" />
          Retry
        </button>
      </div>
    );
  }

  const recentTrends = analytics.salesTrends.slice(-7);
  const topProducts = analytics.productAnalytics.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-main">Advanced Analytics</h2>
          <p className="text-text-muted">Business intelligence and forecasting dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="px-3 py-2 border border-border rounded-lg bg-surface text-text-main"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button className="btn-secondary">
            <Download size={16} className="mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-main hover:border-border'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Revenue"
              value={`$${analytics.salesTrends.reduce((sum, day) => sum + day.revenue, 0).toFixed(2)}`}
              change="+12.5%"
              changeType="positive"
              icon={DollarSign}
              color="primary"
            />
            <StatCard
              title="Total Transactions"
              value={analytics.salesTrends.reduce((sum, day) => sum + day.transactions, 0)}
              change="+8.2%"
              changeType="positive"
              icon={ShoppingCart}
              color="secondary"
            />
            <StatCard
              title="Active Customers"
              value={analytics.customerAnalytics.totalCustomers}
              change="+5.1%"
              changeType="positive"
              icon={Users}
              color="accent"
            />
            <StatCard
              title="Low Stock Items"
              value={analytics.inventoryAnalytics.lowStockItems}
              change="-2.3%"
              changeType="positive"
              icon={Package}
              color="danger"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-text-main mb-4">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={recentTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top Products */}
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-text-main mb-4">Top Performing Products</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="revenue" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Sales Trends Tab */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-text-main mb-4">Sales Performance Trends</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={analytics.salesTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" />
                <YAxis yAxisId="left" stroke="var(--text-muted)" />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar yAxisId="left" dataKey="transactions" fill="var(--primary)" name="Transactions" />
                <Line yAxisId="right" type="monotone" dataKey="averageOrderValue" stroke="var(--secondary)" strokeWidth={3} name="Avg Order Value" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-text-main mb-4">Product Performance Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surfaceHighlight/30 text-xs uppercase text-text-muted font-medium">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Sold</th>
                    <th className="px-4 py-3">Revenue</th>
                    <th className="px-4 py-3">Profit Margin</th>
                    <th className="px-4 py-3">Turnover Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analytics.productAnalytics.map((product) => (
                    <tr key={product.id} className="hover:bg-surfaceHighlight transition-colors">
                      <td className="px-4 py-3 font-medium text-text-main">{product.name}</td>
                      <td className="px-4 py-3 text-text-muted">{product.category}</td>
                      <td className="px-4 py-3">{product.totalSold}</td>
                      <td className="px-4 py-3 font-medium">${product.revenue.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          product.profitMargin > 20 ? 'bg-green-100 text-green-800' :
                          product.profitMargin > 10 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {product.profitMargin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">{product.turnoverRate.toFixed(1)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Category Distribution */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-text-main mb-4">Revenue by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(
                    analytics.productAnalytics.reduce((acc, product) => {
                      acc[product.category] = (acc[product.category] || 0) + product.revenue;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([category, revenue]) => ({ name: category, value: revenue }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(
                    analytics.productAnalytics.reduce((acc, product) => {
                      acc[product.category] = (acc[product.category] || 0) + product.revenue;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}