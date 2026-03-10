import { useState, useEffect } from 'react';
import { FileSpreadsheet, FileText, Download, Calendar, TrendingUp, Package, ShoppingCart, BarChart3, Search, ChevronRight, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { pb } from '../../lib/pocketbase';
import { exportData } from '../../utils/export';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useLocation } from '../../contexts/LocationContext';
import { useAuthStore } from '../../stores/authStore';

type ReportType = 'sales' | 'inventory' | 'purchase';

interface SummaryCardProps {
    title: string;
    value: string;
    description: string;
    icon: any;
    color: 'primary' | 'green' | 'red' | 'orange';
}

function SummaryCard({ title, value, description, icon: Icon, color }: SummaryCardProps) {
    const colorClasses = {
        primary: 'bg-primary/10 text-primary',
        green: 'bg-green-100 text-green-600',
        red: 'bg-red-100 text-red-600',
        orange: 'bg-orange-100 text-orange-600',
    };

    return (
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon size={24} />
                </div>
                <div>
                    <h3 className="text-sm font-medium text-text-muted">{title}</h3>
                    <p className="text-2xl font-bold text-text-main mt-1">{value}</p>
                    <p className="text-xs text-text-muted mt-1">{description}</p>
                </div>
            </div>
        </div>
    );
}

export function Reports() {
    const { activeLocation } = useLocation();
    const [reportType, setReportType] = useState<ReportType>('sales');
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [isGenerating, setIsGenerating] = useState(false);

    // Report Data State
    const [reportData, setReportData] = useState<any[]>([]);
    const [summaryData, setSummaryData] = useState<any>(null);
    const [generatedType, setGeneratedType] = useState<ReportType | null>(null);

    // Reset data when location changes
    useEffect(() => {
        setReportData([]);
        setSummaryData(null);
        setGeneratedType(null);
    }, [activeLocation]);

    const setDateRange = (range: 'today' | 'week' | 'month' | 'quarter') => {
        const today = new Date();
        switch (range) {
            case 'today':
                setStartDate(format(today, 'yyyy-MM-dd'));
                setEndDate(format(today, 'yyyy-MM-dd'));
                break;
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - 7);
                setStartDate(format(weekStart, 'yyyy-MM-dd'));
                setEndDate(format(today, 'yyyy-MM-dd'));
                break;
            case 'month':
                setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
                setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
                break;
            case 'quarter':
                const quarterStart = subMonths(today, 3);
                setStartDate(format(quarterStart, 'yyyy-MM-dd'));
                setEndDate(format(today, 'yyyy-MM-dd'));
                break;
        }
    };

    const { user } = useAuthStore(); // Added import for user

    // Helper to get location filter
    const getLocationFilter = () => {
        if (!activeLocation) return 'location="invalid"';

        if (activeLocation === 'all') {
            if (user?.superuser) return ''; // No location filter = all

            // For regular managers with multiple locations:
            if (user?.locations && user.locations.length > 0) {
                return user.locations.map(id => `location="${id}"`).join(' || ');
            }
            return 'location="invalid"'; // Should not happen if they selected 'all'
        }

        // Specific location
        return `location="${activeLocation.id}"`;
    };

    const fetchSalesReport = async () => {
        if (!activeLocation) return;
        setIsGenerating(true);
        try {
            const locFilter = getLocationFilter();
            // Filter: Date range AND Location (if ref exists)
            // Note: If locFilter is empty (superuser all), we only filter by date.
            // If locFilter contains ORs, we need parenthesis: `created >= ... && (locA || locB)`

            let filter = `created >= "${startDate}" && created <= "${endDate} 23:59:59"`;
            if (locFilter) {
                filter += ` && (${locFilter})`;
            }

            const sales = await pb.collection('sales').getFullList({
                filter,
                expand: 'user,location',
                sort: '-created',
                requestKey: null
            });

            const salesItems = await Promise.all(
                sales.map(sale =>
                    pb.collection('sales_items').getFullList({
                        filter: `sale="${sale.id}"`,
                        expand: 'product',
                        requestKey: null
                    })
                )
            );

            const rows = sales.map((sale, index) => ({
                id: sale.id,
                date: sale.created,
                sale_number: sale.sale_number,
                user: sale.expand?.user?.name || 'N/A',
                location: sale.expand?.location?.name || 'N/A',
                items_count: salesItems[index]?.length || 0,
                payment_method: sale.payment_method,
                total: sale.total,
                status: sale.status,
            }));

            // Calculate Summary
            const totalSales = rows.reduce((sum, r) => sum + r.total, 0);
            const totalTransactions = rows.length;
            const avgTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

            setReportData(rows);
            setSummaryData({
                totalSales,
                totalTransactions,
                avgTransaction
            });
            setGeneratedType('sales');
        } catch (error) {
            console.error('Failed to fetch sales report:', error);
            alert('Failed to fetch report.');
        } finally {
            setIsGenerating(false);
        }
    };

    const fetchInventoryReport = async () => {
        if (!activeLocation) return;
        setIsGenerating(true);
        try {
            const locFilter = getLocationFilter();

            // Fetch Inventory
            const inventoryRecords = await pb.collection('inventory').getFullList({
                filter: locFilter, // Empty for superuser all, or (loc || loc)
                expand: 'product.category,location',
                sort: '-quantity', // Most stock first
                requestKey: null
            });

            const rows = inventoryRecords.map(inv => {
                const product = inv.expand?.product;
                if (!product) return null; // Should not happen

                return {
                    id: product.id,
                    sku: product.sku,
                    name: product.name,
                    category: product.expand?.category?.name || 'N/A',
                    stock: inv.quantity,
                    reorder_point: inv.reorder_point || 0,
                    cost_price: product.cost_price,
                    sale_price: product.sale_price,
                    value: inv.quantity * (product.cost_price || 0),
                    status: inv.quantity <= (inv.reorder_point || 0) ? 'LOW STOCK' : 'OK',
                    locationName: inv.expand?.location?.name || 'N/A' // Add location column possibility?
                };
            }).filter(Boolean); // Remove nulls

            // Summary
            const totalValue = rows.reduce((sum: number, r: any) => sum + r.value, 0);
            const lowStockCount = rows.filter((r: any) => r.status === 'LOW STOCK').length;
            const totalItems = rows.reduce((sum: number, r: any) => sum + r.stock, 0);

            setReportData(rows as any[]);
            setSummaryData({
                totalValue,
                lowStockCount,
                totalItems
            });
            setGeneratedType('inventory');
        } catch (error) {
            console.error('Failed to fetch inventory report:', error);
            alert('Failed to fetch report.');
        } finally {
            setIsGenerating(false);
        }
    };

    const fetchPurchaseReport = async () => {
        if (!activeLocation) return;
        setIsGenerating(true);
        try {
            const locFilter = getLocationFilter();

            let filter = `order_date >= "${startDate}" && order_date <= "${endDate} 23:59:59"`;
            if (locFilter) {
                filter += ` && (${locFilter})`;
            }

            const purchaseOrders = await pb.collection('purchase_orders').getFullList({
                filter,
                expand: 'supplier,created_by,location',
                sort: '-order_date',
                requestKey: null
            });

            const rows = purchaseOrders.map(po => ({
                id: po.id,
                date: po.order_date,
                po_number: po.po_number,
                supplier: po.expand?.supplier?.name || 'N/A',
                expected_date: po.expected_date || null,
                total: po.total,
                status: po.status,
                created_by: po.expand?.created_by?.name || 'N/A',
                location: po.expand?.location?.name || 'N/A',
            }));

            // Summary
            const totalPurchases = rows.reduce((sum, r) => sum + r.total, 0);
            const receivedCount = rows.filter(r => r.status === 'received').length;
            const pendingCount = rows.filter(r => r.status === 'ordered' || r.status === 'pending').length;

            setReportData(rows);
            setSummaryData({
                totalPurchases,
                receivedCount,
                pendingCount
            });
            setGeneratedType('purchase');
        } catch (error) {
            console.error('Failed to fetch purchase report:', error);
            alert('Failed to fetch report.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerate = () => {
        if (reportType === 'sales') fetchSalesReport();
        if (reportType === 'inventory') fetchInventoryReport();
        if (reportType === 'purchase') fetchPurchaseReport();
    };

    const handleExport = (formatType: 'excel' | 'csv' | 'pdf') => {
        if (!reportData.length) return;

        let headers: string[] = [];
        let rows: any[][] = [];
        let title = '';
        let filename = '';

        if (generatedType === 'sales') {
            headers = ['Date', 'Sale #', 'User', 'Location', 'Items', 'Payment', 'Total', 'Status'];
            rows = reportData.map(r => [
                format(new Date(r.date), 'MMM dd, yyyy HH:mm'),
                r.sale_number,
                r.user,
                r.location,
                r.items_count,
                r.payment_method.toUpperCase(),
                `$${r.total.toFixed(2)}`,
                r.status
            ]);
            // Summary row
            rows.push(['', '', '', '', '', '', `Total: $${summaryData.totalSales.toFixed(2)}`, '']);
            const locName = activeLocation === 'all' ? 'All Locations' : activeLocation?.name;
            title = `Sales Report (${startDate} to ${endDate}) - ${locName}`;
            filename = `sales-report-${startDate}-${endDate}`;
        } else if (generatedType === 'inventory') {
            headers = ['SKU', 'Product Name', 'Category', 'Stock', 'Reorder', 'Cost', 'Price', 'Value', 'Status'];
            rows = reportData.map(r => [
                r.sku,
                r.name,
                r.category,
                r.stock,
                r.reorder_point,
                `$${r.cost_price.toFixed(2)}`,
                `$${r.sale_price.toFixed(2)}`,
                `$${r.value.toFixed(2)}`,
                r.status
            ]);
            rows.push(['', '', '', '', '', '', '', `Total: $${summaryData.totalValue.toFixed(2)}`, '']);
            const locName = activeLocation === 'all' ? 'All Locations' : activeLocation?.name;
            title = `Inventory Report (${format(new Date(), 'MMM dd, yyyy')}) - ${locName}`;
            filename = `inventory-report-${format(new Date(), 'yyyy-MM-dd')}`;
        } else if (generatedType === 'purchase') {
            headers = ['Date', 'PO #', 'Supplier', 'Expected', 'Total', 'Status', 'Created By', 'Location'];
            rows = reportData.map(r => [
                format(new Date(r.date), 'MMM dd, yyyy'),
                r.po_number,
                r.supplier,
                r.expected_date ? format(new Date(r.expected_date), 'MMM dd, yyyy') : '-',
                `$${r.total.toFixed(2)}`,
                r.status.toUpperCase(),
                r.created_by,
                r.location
            ]);
            const locName = activeLocation === 'all' ? 'All Locations' : activeLocation?.name;
            title = `Purchase Orders Report (${startDate} to ${endDate}) - ${locName}`;
            filename = `po-report-${startDate}-${endDate}`;
        }

        exportData({
            headers,
            rows,
            filename,
            title
        }, formatType);
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-20">
            <div>
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-heading font-bold text-text-main">Reports & Analytics</h2>
                        <p className="text-text-muted">Generate and export business reports</p>
                    </div>
                    {activeLocation && (
                        <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium border border-indigo-100">
                            Viewing: {activeLocation === 'all' ? 'All Locations' : activeLocation.name}
                        </div>
                    )}
                </div>
            </div>

            {/* Controls Section */}
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">

                {/* 1. Report Type Selection */}
                <div className="flex flex-wrap gap-4">
                    {(['sales', 'inventory', 'purchase'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => {
                                setReportType(type);
                                setReportData([]); // Clear old data on switch
                                setGeneratedType(null);
                            }}
                            className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all min-w-[140px] ${reportType === type
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border bg-background hover:bg-surfaceHighlight text-text-muted hover:text-text-main'
                                }`}
                        >
                            {type === 'sales' && <TrendingUp size={24} />}
                            {type === 'inventory' && <Package size={24} />}
                            {type === 'purchase' && <ShoppingCart size={24} />}
                            <span className="font-medium capitalize">{type} Report</span>
                        </button>
                    ))}

                    {/* Advanced Analytics Link */}
                    <Link
                        to="/reports/advanced-analytics"
                        className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-surfaceHighlight text-text-muted hover:text-text-main transition-all min-w-[140px]"
                    >
                        <BarChart3 size={24} />
                        <span className="font-medium">Advanced</span>
                    </Link>
                </div>

                {/* 2. Filters & Actions */}
                <div className="flex flex-col lg:flex-row gap-6 items-end border-t border-border pt-6">
                    {/* Date Range - Only for Sales and Purchase */}
                    {reportType !== 'inventory' ? (
                        <div className="space-y-3 flex-1">
                            <label className="text-sm font-medium text-text-main flex items-center gap-2">
                                <Calendar size={16} /> Date Range
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(['today', 'week', 'month', 'quarter'] as const).map(range => (
                                    <button
                                        key={range}
                                        onClick={() => setDateRange(range)}
                                        className="px-3 py-1.5 text-xs bg-surfaceHighlight hover:bg-primary/10 hover:text-primary rounded-md transition-colors"
                                    >
                                        {range.charAt(0).toUpperCase() + range.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                />
                                <span className="text-text-muted">-</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                            <Package size={20} className="mr-3" />
                            <div>
                                <p className="font-medium">Current Stock Snapshot ({activeLocation === 'all' ? 'All Locations' : activeLocation?.name})</p>
                                <p className="text-xs opacity-80">This report displays real-time inventory levels for the active location.</p>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !activeLocation}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Search size={18} />
                                    Generate Report
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Content */}
            {generatedType && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

                    {/* Summary Cards */}
                    {generatedType === 'sales' && summaryData && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SummaryCard
                                title="Total Sales"
                                value={`$${summaryData.totalSales.toFixed(2)}`}
                                description={`${startDate} to ${endDate}`}
                                icon={DollarSign}
                                color="green"
                            />
                            <SummaryCard
                                title="Transactions"
                                value={summaryData.totalTransactions}
                                description="Total orders processed"
                                icon={FileText}
                                color="primary"
                            />
                            <SummaryCard
                                title="Avg. Transaction"
                                value={`$${summaryData.avgTransaction.toFixed(2)}`}
                                description="Average order value"
                                icon={TrendingUp}
                                color="orange"
                            />
                        </div>
                    )}

                    {generatedType === 'inventory' && summaryData && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SummaryCard
                                title="Total Stock Value"
                                value={`$${summaryData.totalValue.toFixed(2)}`}
                                description="Cost price valuation"
                                icon={DollarSign}
                                color="green"
                            />
                            <SummaryCard
                                title="Products"
                                value={summaryData.totalItems}
                                description="Total units in stock"
                                icon={Package}
                                color="primary"
                            />
                            <SummaryCard
                                title="Low Stock Alerts"
                                value={summaryData.lowStockCount}
                                description="Items below reorder point"
                                icon={AlertTriangle}
                                color="red"
                            />
                        </div>
                    )}

                    {generatedType === 'purchase' && summaryData && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SummaryCard
                                title="Total Spend"
                                value={`$${summaryData.totalPurchases.toFixed(2)}`}
                                description="Total Purchase Orders"
                                icon={DollarSign}
                                color="red"
                            />
                            <SummaryCard
                                title="Received POs"
                                value={summaryData.receivedCount}
                                description="Completed orders"
                                icon={CheckCircle}
                                color="green"
                            />
                            <SummaryCard
                                title="Pending POs"
                                value={summaryData.pendingCount}
                                description="Awaiting delivery"
                                icon={Calendar}
                                color="orange"
                            />
                        </div>
                    )}

                    {/* Data Table */}
                    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-background/50">
                            <h3 className="font-semibold text-text-main flex items-center gap-2">
                                <FileText size={18} className="text-primary" />
                                Report Data
                                <span className="text-xs font-normal text-text-muted bg-surfaceHighlight px-2 py-0.5 rounded-full">
                                    {reportData.length} rows
                                </span>
                            </h3>

                            {/* Export Actions */}
                            <div className="flex gap-2">
                                <button onClick={() => handleExport('excel')} className="p-2 hover:bg-surfaceHighlight rounded-lg text-green-600 transition-colors" title="Export Excel">
                                    <FileSpreadsheet size={20} />
                                </button>
                                <button onClick={() => handleExport('csv')} className="p-2 hover:bg-surfaceHighlight rounded-lg text-blue-600 transition-colors" title="Export CSV">
                                    <FileText size={20} />
                                </button>
                                <button onClick={() => handleExport('pdf')} className="p-2 hover:bg-surfaceHighlight rounded-lg text-red-600 transition-colors" title="Export PDF">
                                    <Download size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto max-h-[500px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-surfaceHighlight sticky top-0 z-10">
                                    <tr>
                                        {generatedType === 'sales' && (
                                            <>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Sale #</th>
                                                {/* <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider">User</th> */}
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Items</th>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Method</th>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Total</th>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                                            </>
                                        )}
                                        {generatedType === 'inventory' && (
                                            <>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider">SKU</th>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Product</th>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Category</th>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Stock</th>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Value</th>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                                            </>
                                        )}
                                        {generatedType === 'purchase' && (
                                            <>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider">PO #</th>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Supplier</th>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Total</th>
                                                <th className="p-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {reportData.length > 0 ? (
                                        reportData.map((row, i) => (
                                            <tr key={row.id || i} className="hover:bg-surfaceHighlight/50 transition-colors">
                                                {generatedType === 'sales' && (
                                                    <>
                                                        <td className="p-3 text-sm text-text-main">{format(new Date(row.date), 'MMM dd, HH:mm')}</td>
                                                        <td className="p-3 text-sm text-text-main font-mono">{row.sale_number}</td>
                                                        {/* <td className="p-3 text-sm text-text-muted">{row.user}</td> */}
                                                        <td className="p-3 text-sm text-text-main">{row.items_count}</td>
                                                        <td className="p-3 text-sm text-text-main capitalize">{row.payment_method?.replace('_', ' ')}</td>
                                                        <td className="p-3 text-sm text-text-main font-semibold text-right">${row.total.toFixed(2)}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-0.5 text-xs rounded-full ${row.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                    </>
                                                )}
                                                {generatedType === 'inventory' && (
                                                    <>
                                                        <td className="p-3 text-sm text-text-muted font-mono">{row.sku}</td>
                                                        <td className="p-3 text-sm text-text-main font-medium">{row.name}</td>
                                                        <td className="p-3 text-sm text-text-muted">{row.category}</td>
                                                        <td className="p-3 text-sm text-text-main text-right">{row.stock}</td>
                                                        <td className="p-3 text-sm text-text-main text-right">${row.value.toFixed(2)}</td>
                                                        <td className="p-3">
                                                            {row.status === 'LOW STOCK' ? (
                                                                <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">Low Stock</span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">OK</span>
                                                            )}
                                                        </td>
                                                    </>
                                                )}
                                                {generatedType === 'purchase' && (
                                                    <>
                                                        <td className="p-3 text-sm text-text-main">{format(new Date(row.date), 'MMM dd, yyyy')}</td>
                                                        <td className="p-3 text-sm text-text-main font-mono">{row.po_number}</td>
                                                        <td className="p-3 text-sm text-text-main">{row.supplier}</td>
                                                        <td className="p-3 text-sm text-text-main text-right">${row.total.toFixed(2)}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-0.5 text-xs rounded-full ${row.status === 'received' ? 'bg-green-100 text-green-700' :
                                                                row.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-text-muted">
                                                No records found for the selected period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
