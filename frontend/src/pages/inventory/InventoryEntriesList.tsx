import { useState } from 'react';
import { useInventoryEntries } from '../../hooks/useInventoryEntries';
import { Search, Package, Building2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function InventoryEntriesList() {
    const { data: entries, isLoading, error } = useInventoryEntries();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredEntries = entries?.filter(entry => {
        const productName = entry.expand?.product?.name || '';
        const locationName = entry.expand?.location?.name || '';
        const searchLower = searchTerm.toLowerCase();

        return productName.toLowerCase().includes(searchLower) ||
            locationName.toLowerCase().includes(searchLower) ||
            entry.type.toLowerCase().includes(searchLower);
    }) || [];

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'purchase':
                return <TrendingUp size={16} className="text-secondary" />;
            case 'sale':
                return <TrendingDown size={16} className="text-danger" />;
            case 'adjustment':
                return <Minus size={16} className="text-warning" />;
            case 'transfer':
                return <Package size={16} className="text-primary" />;
            default:
                return <Package size={16} className="text-text-muted" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'purchase':
                return 'bg-secondary/10 text-secondary';
            case 'sale':
                return 'bg-danger/10 text-danger';
            case 'adjustment':
                return 'bg-warning/10 text-warning';
            case 'transfer':
                return 'bg-primary/10 text-primary';
            default:
                return 'bg-surfaceHighlight text-text-muted';
        }
    };

    if (error) {
        return (
            <div className="p-4 bg-danger/10 text-danger rounded-lg border border-danger/20 flex items-center justify-center">
                <p>Error loading inventory entries: {(error as Error).message}</p>
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
                    <h2 className="text-2xl font-heading font-bold text-text-main">Inventory Entries</h2>
                    <p className="text-text-muted">View inventory movement history</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
                <input
                    type="text"
                    placeholder="Search by product, location, or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-surface text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
            </div>

            {/* Entries List */}
            <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-surfaceHighlight/50 text-xs uppercase text-text-muted font-medium">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Quantity</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Reference</th>
                                <th className="px-6 py-4">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredEntries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-surfaceHighlight/30 transition-colors">
                                    <td className="px-6 py-4 text-text-muted">
                                        {(() => {
                                            if (!entry.created) return '-';
                                            const date = new Date(entry.created);
                                            return isNaN(date.getTime())
                                                ? '-'
                                                : `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-text-main">
                                        <div className="flex items-center gap-2">
                                            <Package size={16} className="text-text-muted" />
                                            {entry.expand?.product?.name || 'Unknown Product'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getTypeIcon(entry.type)}
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(entry.type)}`}>
                                                {entry.type}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`font-medium ${entry.quantity > 0 ? 'text-secondary' :
                                            entry.quantity < 0 ? 'text-danger' : 'text-text-main'
                                            }`}>
                                            {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-text-main">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={16} className="text-text-muted" />
                                            {entry.expand?.location?.name || 'No Location'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-text-muted font-mono text-sm">
                                        {entry.reference_id || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-text-muted">
                                        {entry.notes || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredEntries.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No inventory entries found</p>
                    <p className="text-sm">Inventory movements will appear here</p>
                </div>
            )}
        </div>
    );
}