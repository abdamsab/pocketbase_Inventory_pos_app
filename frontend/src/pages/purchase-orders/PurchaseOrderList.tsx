import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { useSuppliers } from '../../hooks/useSuppliers';
import { Plus, Search, Eye, Package, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export function PurchaseOrderList() {
    const { data: purchaseOrders, isLoading } = usePurchaseOrders();
    const { data: suppliers } = useSuppliers();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const getSupplierName = (supplierId: string) => {
        return suppliers?.find(s => s.id === supplierId)?.name || 'Unknown';
    };

    const filteredPOs = purchaseOrders?.filter(po => {
        const matchesSearch = po.po_number.toLowerCase().includes(search.toLowerCase()) ||
            getSupplierName(po.supplier).toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'partial': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'received': return 'bg-green-100 text-green-700 border-green-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'draft': return <Clock size={14} />;
            case 'sent': return <TrendingUp size={14} />;
            case 'partial': return <Package size={14} />;
            case 'received': return <CheckCircle size={14} />;
            default: return <Clock size={14} />;
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 text-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-text-main">Purchase Orders</h2>
                    <p className="text-text-muted">Manage inventory purchases and receiving</p>
                </div>
                <button
                    onClick={() => navigate('/purchase-orders/new')}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    New Purchase Order
                </button>
            </div>

            <div className="bg-surface border border-border rounded-2xl shadow-lg overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-border flex gap-4">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search PO number or supplier..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-surface border border-border rounded-lg px-4 py-2.5 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="partial">Partially Received</option>
                        <option value="received">Received</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-surfaceHighlight/30 text-xs uppercase text-text-muted font-medium">
                            <tr>
                                <th className="px-6 py-4">PO Number</th>
                                <th className="px-6 py-4">Supplier</th>
                                <th className="px-6 py-4">Order Date</th>
                                <th className="px-6 py-4">Expected Date</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredPOs?.map((po) => (
                                <tr key={po.id} className="hover:bg-surfaceHighlight transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-text-main">{po.po_number}</span>
                                    </td>
                                    <td className="px-6 py-4 text-text-muted">
                                        {getSupplierName(po.supplier)}
                                    </td>
                                    <td className="px-6 py-4 text-text-muted">
                                        {format(new Date(po.order_date), 'MMM dd, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 text-text-muted">
                                        {po.expected_date ? format(new Date(po.expected_date), 'MMM dd, yyyy') : '-'}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-text-main">
                                        ${po.total.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(po.status)}`}>
                                            {getStatusIcon(po.status)}
                                            {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => navigate(`/purchase-orders/${po.id}`)}
                                            className="inline-flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors text-sm font-medium opacity-0 group-hover:opacity-100"
                                        >
                                            <Eye size={14} />
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredPOs?.length === 0 && (
                    <div className="p-12 text-center text-text-muted">
                        <Package size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No purchase orders found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
