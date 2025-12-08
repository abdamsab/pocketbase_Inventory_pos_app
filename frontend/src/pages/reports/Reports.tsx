import { useState } from 'react';
import { FileSpreadsheet, FileText, Download, Calendar, TrendingUp, Package, ShoppingCart } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { exportData } from '../../utils/export';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export function Reports() {
    const [reportType, setReportType] = useState<'sales' | 'inventory' | 'purchase'>('sales');
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [isGenerating, setIsGenerating] = useState(false);

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

    const generateSalesReport = async (exportFormat: 'excel' | 'csv' | 'pdf') => {
        setIsGenerating(true);
        try {
            const sales = await pb.collection('sales').getFullList({
                filter: `created >= "${startDate}" && created <= "${endDate} 23:59:59"`,
                expand: 'user,location',
                sort: '-created',
            });

            const salesItems = await Promise.all(
                sales.map(sale =>
                    pb.collection('sales_items').getFullList({
                        filter: `sale="${sale.id}"`,
                        expand: 'product',
                    })
                )
            );

            const headers = ['Date', 'Sale #', 'User', 'Location', 'Items', 'Payment', 'Total', 'Status'];
            const rows = sales.map((sale, index) => [
                format(new Date(sale.created), 'MMM dd, yyyy HH:mm'),
                sale.sale_number,
                (sale as any).expand?.user?.name || 'N/A',
                (sale as any).expand?.location?.name || 'N/A',
                salesItems[index]?.length || 0,
                sale.payment_method.toUpperCase(),
                `$${sale.total.toFixed(2)}`,
                sale.status,
            ]);

            // Add summary row
            const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
            rows.push(['', '', '', '', '', '', `Total: $${totalSales.toFixed(2)}`, '']);

            exportData({
                headers,
                rows,
                filename: `sales-report-${startDate}-to-${endDate}`,
                title: `Sales Report (${startDate} to ${endDate})`,
            }, exportFormat);
        } catch (error) {
            console.error('Failed to generate sales report:', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const generateInventoryReport = async (exportFormat: 'excel' | 'csv' | 'pdf') => {
        setIsGenerating(true);
        try {
            const products = await pb.collection('products').getFullList({
                expand: 'category',
                sort: 'name',
            });

            const headers = ['SKU', 'Product Name', 'Category', 'Stock', 'Reorder Point', 'Cost Price', 'Sale Price', 'Value', 'Status'];
            const rows = products.map(product => {
                const stockValue = product.stock * product.cost_price;
                const status = product.stock <= product.reorder_point ? 'LOW STOCK' : 'OK';

                return [
                    product.sku,
                    product.name,
                    (product as any).expand?.category?.name || 'N/A',
                    product.stock,
                    product.reorder_point || 0,
                    `$${product.cost_price.toFixed(2)}`,
                    `$${product.sale_price.toFixed(2)}`,
                    `$${stockValue.toFixed(2)}`,
                    status,
                ];
            });

            // Add summary
            const totalValue = products.reduce((sum, p) => sum + (p.stock * p.cost_price), 0);
            const lowStockCount = products.filter(p => p.stock <= p.reorder_point).length;
            rows.push(['', '', '', '', '', '', `Total Value: $${totalValue.toFixed(2)}`, '', `Low Stock Items: ${lowStockCount}`]);

            exportData({
                headers,
                rows,
                filename: `inventory-report-${format(new Date(), 'yyyy-MM-dd')}`,
                title: `Inventory Report (${format(new Date(), 'MMM dd, yyyy')})`,
            }, exportFormat);
        } catch (error) {
            console.error('Failed to generate inventory report:', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const generatePurchaseReport = async (exportFormat: 'excel' | 'csv' | 'pdf') => {
        setIsGenerating(true);
        try {
            const purchaseOrders = await pb.collection('purchase_orders').getFullList({
                filter: `created >= "${startDate}" && created <= "${endDate} 23:59:59"`,
                expand: 'supplier,created_by',
                sort: '-created',
            });

            const headers = ['Date', 'PO #', 'Supplier', 'Expected Date', 'Total', 'Status', 'Created By'];
            const rows = purchaseOrders.map(po => [
                format(new Date(po.order_date), 'MMM dd, yyyy'),
                po.po_number,
                (po as any).expand?.supplier?.name || 'N/A',
                po.expected_date ? format(new Date(po.expected_date), 'MMM dd, yyyy') : 'Not set',
                `$${po.total.toFixed(2)}`,
                po.status.toUpperCase(),
                (po as any).expand?.created_by?.name || 'N/A',
            ]);

            // Add summary
            const totalPurchases = purchaseOrders.reduce((sum, po) => sum + po.total, 0);
            const receivedCount = purchaseOrders.filter(po => po.status === 'received').length;
            rows.push(['', '', '', '', `Total: $${totalPurchases.toFixed(2)}`, `Received: ${receivedCount}/${purchaseOrders.length}`, '']);

            exportData({
                headers,
                rows,
                filename: `purchase-report-${startDate}-to-${endDate}`,
                title: `Purchase Orders Report (${startDate} to ${endDate})`,
            }, exportFormat);
        } catch (error) {
            console.error('Failed to generate purchase report:', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExport = (format: 'excel' | 'csv' | 'pdf') => {
        switch (reportType) {
            case 'sales':
                generateSalesReport(format);
                break;
            case 'inventory':
                generateInventoryReport(format);
                break;
            case 'purchase':
                generatePurchaseReport(format);
                break;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-heading font-bold text-text-main">Reports & Analytics</h2>
                <p className="text-text-muted">Generate and export business reports</p>
            </div>

            {/* Report Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => setReportType('sales')}
                    className={`p-6 rounded-2xl border-2 transition-all ${reportType === 'sales'
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-surface hover:border-primary/50'
                        }`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${reportType === 'sales' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                            <TrendingUp size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-text-main">Sales Report</h3>
                            <p className="text-sm text-text-muted">Transaction history</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setReportType('inventory')}
                    className={`p-6 rounded-2xl border-2 transition-all ${reportType === 'inventory'
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-surface hover:border-primary/50'
                        }`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${reportType === 'inventory' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                            <Package size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-text-main">Inventory Report</h3>
                            <p className="text-sm text-text-muted">Stock levels & value</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setReportType('purchase')}
                    className={`p-6 rounded-2xl border-2 transition-all ${reportType === 'purchase'
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-surface hover:border-primary/50'
                        }`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${reportType === 'purchase' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                            <ShoppingCart size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-text-main">Purchase Report</h3>
                            <p className="text-sm text-text-muted">Purchase orders</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Date Range Selection */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                    <Calendar size={20} />
                    Date Range
                </h3>

                <div className="flex flex-wrap gap-3 mb-4">
                    <button
                        onClick={() => setDateRange('today')}
                        className="px-4 py-2 bg-surfaceHighlight hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-sm font-medium text-text-main"
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setDateRange('week')}
                        className="px-4 py-2 bg-surfaceHighlight hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-sm font-medium text-text-main"
                    >
                        Last 7 Days
                    </button>
                    <button
                        onClick={() => setDateRange('month')}
                        className="px-4 py-2 bg-surfaceHighlight hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-sm font-medium text-text-main"
                    >
                        This Month
                    </button>
                    <button
                        onClick={() => setDateRange('quarter')}
                        className="px-4 py-2 bg-surfaceHighlight hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-sm font-medium text-text-main"
                    >
                        Last 3 Months
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-2">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-2">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Export Options */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                    <Download size={20} />
                    Export Report
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => handleExport('excel')}
                        disabled={isGenerating}
                        className="flex items-center justify-center gap-3 p-4 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <FileSpreadsheet className="text-green-600" size={24} />
                        <div className="text-left">
                            <p className="font-semibold text-green-900">Excel</p>
                            <p className="text-xs text-green-700">.xlsx format</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handleExport('csv')}
                        disabled={isGenerating}
                        className="flex items-center justify-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <FileText className="text-blue-600" size={24} />
                        <div className="text-left">
                            <p className="font-semibold text-blue-900">CSV</p>
                            <p className="text-xs text-blue-700">.csv format</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handleExport('pdf')}
                        disabled={isGenerating}
                        className="flex items-center justify-center gap-3 p-4 bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <FileText className="text-red-600" size={24} />
                        <div className="text-left">
                            <p className="font-semibold text-red-900">PDF</p>
                            <p className="text-xs text-red-700">.pdf format</p>
                        </div>
                    </button>
                </div>

                {isGenerating && (
                    <div className="mt-4 flex items-center justify-center gap-3 text-primary">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                        <span className="text-sm font-medium">Generating report...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
