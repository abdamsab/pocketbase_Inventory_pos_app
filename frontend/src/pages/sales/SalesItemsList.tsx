import { useState } from 'react';
import { useSalesItems } from '../../hooks/useSalesItems';
import { Search, Receipt, Package, DollarSign, Calendar } from 'lucide-react';

export function SalesItemsList() {
    const { data: salesItems, isLoading, error } = useSalesItems();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = salesItems?.filter(item => {
        const productName = item.expand?.product?.name || '';
        const saleNumber = item.expand?.sale?.sale_number || '';
        const searchLower = searchTerm.toLowerCase();

        return productName.toLowerCase().includes(searchLower) ||
            saleNumber.toLowerCase().includes(searchLower);
    }) || [];

    if (error) {
        return (
            <div className="p-4 bg-danger/10 text-danger rounded-lg border border-danger/20 flex items-center justify-center">
                <p>Error loading sales items: {error.message}</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-text-main">Sales Items</h2>
                    <p className="text-text-muted">View detailed sales transaction items</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
                <input
                    type="text"
                    placeholder="Search by product or sale number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-surface text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
            </div>

            {/* Sales Items List */}
            <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-surfaceHighlight/50 text-xs uppercase text-text-muted font-medium">
                            <tr>
                                <th className="px-6 py-4">Sale</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Quantity</th>
                                <th className="px-6 py-4">Unit Price</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-surfaceHighlight/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Receipt size={16} className="text-primary" />
                                            <div>
                                                <div className="font-medium text-text-main">
                                                    {item.expand?.sale?.sale_number || 'Unknown Sale'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Package size={16} className="text-secondary" />
                                            <div>
                                                <div className="font-medium text-text-main">
                                                    {item.expand?.product?.name || 'Unknown Product'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-text-main">{item.quantity}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            <DollarSign size={14} className="text-text-muted" />
                                            <span className="font-medium text-text-main">
                                                ${item.unit_price.toFixed(2)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            <DollarSign size={14} className="text-text-muted" />
                                            <span className="font-bold text-primary">
                                                ${item.total.toFixed(2)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-text-muted">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} />
                                            {(() => {
                                                if (!item.created) return 'Date not available';
                                                const date = new Date(item.created);
                                                return isNaN(date.getTime())
                                                    ? 'Invalid Date'
                                                    : `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                                            })()}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredItems.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                    <Receipt size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No sales items found</p>
                    <p className="text-sm">Sales transaction details will appear here</p>
                </div>
            )}

            {/* Summary Stats */}
            {filteredItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-surface border border-border rounded-xl p-4">
                        <div className="text-sm text-text-muted">Total Items</div>
                        <div className="text-2xl font-bold text-text-main">
                            {filteredItems.reduce((sum, item) => sum + item.quantity, 0)}
                        </div>
                    </div>
                    <div className="bg-surface border border-border rounded-xl p-4">
                        <div className="text-sm text-text-muted">Total Revenue</div>
                        <div className="text-2xl font-bold text-primary">
                            ${filteredItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                        </div>
                    </div>
                    <div className="bg-surface border border-border rounded-xl p-4">
                        <div className="text-sm text-text-muted">Unique Products</div>
                        <div className="text-2xl font-bold text-secondary">
                            {new Set(filteredItems.map(item => item.product)).size}
                        </div>
                    </div>
                    <div className="bg-surface border border-border rounded-xl p-4">
                        <div className="text-sm text-text-muted">Unique Sales</div>
                        <div className="text-2xl font-bold text-accent">
                            {new Set(filteredItems.map(item => item.sale)).size}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}