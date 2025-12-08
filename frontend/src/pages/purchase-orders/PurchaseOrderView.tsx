import { usePurchaseOrder, usePurchaseOrderItems, useReceivePurchaseOrder, useUpdatePurchaseOrder } from '../../hooks/usePurchaseOrders';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import type { PurchaseOrder } from '../../types';

export function PurchaseOrderView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: po, isLoading } = usePurchaseOrder(id!);
    const { data: items } = usePurchaseOrderItems(id!);
    const receivePO = useReceivePurchaseOrder();
    const updatePO = useUpdatePurchaseOrder();
    const [isReceiving, setIsReceiving] = useState(false);
    const [receivingQuantities, setReceivingQuantities] = useState<Record<string, number>>({});

    const handleReceive = async () => {
        if (!items) return;

        const itemsToReceive = items.map(item => ({
            id: item.id,
            quantityReceived: receivingQuantities[item.id] || 0,
        })).filter(item => item.quantityReceived > 0);

        if (itemsToReceive.length === 0) {
            alert('Please enter quantities to receive');
            return;
        }

        try {
            await receivePO.mutateAsync({ poId: id!, items: itemsToReceive });
            setIsReceiving(false);
            setReceivingQuantities({});
        } catch (error) {
            console.error('Failed to receive items:', error);
            alert('Failed to receive items. Please try again.');
        }
    };

    const handleStatusChange = async (newStatus: PurchaseOrder['status']) => {
        if (!po) return;
        try {
            await updatePO.mutateAsync({ id: po.id, data: { status: newStatus } });
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 text-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
        </div>
    );

    if (!po) return <div className="text-center py-12 text-text-muted">Purchase order not found</div>;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-gray-100 text-gray-700';
            case 'sent': return 'bg-blue-100 text-blue-700';
            case 'partial': return 'bg-yellow-100 text-yellow-700';
            case 'received': return 'bg-green-100 text-green-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/purchase-orders')}
                        className="p-2 hover:bg-surfaceHighlight rounded-lg transition-colors text-text-muted hover:text-text-main"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-heading font-bold text-text-main">{po.po_number}</h2>
                        <p className="text-text-muted">Purchase Order Details</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(po.status)}`}>
                        {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                    </div>
                    {po.status !== 'received' && po.status !== 'cancelled' && (
                        <button
                            onClick={() => setIsReceiving(!isReceiving)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Package size={18} />
                            {isReceiving ? 'Cancel Receiving' : 'Receive Items'}
                        </button>
                    )}
                </div>
            </div>

            {/* PO Information */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-text-main mb-4">Order Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-sm text-text-muted mb-1">Supplier</p>
                        <p className="font-medium text-text-main">{(po as any).expand?.supplier?.name || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-text-muted mb-1">Order Date</p>
                        <p className="font-medium text-text-main">{format(new Date(po.order_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                        <p className="text-sm text-text-muted mb-1">Expected Date</p>
                        <p className="font-medium text-text-main">
                            {po.expected_date ? format(new Date(po.expected_date), 'MMM dd, yyyy') : 'Not set'}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-text-muted mb-1">Total Amount</p>
                        <p className="text-xl font-heading font-bold text-primary">${po.total.toFixed(2)}</p>
                    </div>
                </div>
                {po.notes && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-text-muted mb-1">Notes</p>
                        <p className="text-text-main">{po.notes}</p>
                    </div>
                )}
            </div>

            {/* Line Items */}
            <div className="bg-surface border border-border rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-border">
                    <h3 className="text-lg font-semibold text-text-main">Line Items</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-surfaceHighlight/30 text-xs uppercase text-text-muted font-medium">
                            <tr>
                                <th className="px-6 py-4 text-left">Product</th>
                                <th className="px-6 py-4 text-center">Ordered</th>
                                <th className="px-6 py-4 text-center">Received</th>
                                {isReceiving && <th className="px-6 py-4 text-center">Receive Now</th>}
                                <th className="px-6 py-4 text-right">Unit Cost</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {items?.map((item) => {
                                const remaining = item.quantity_ordered - item.quantity_received;
                                const isComplete = item.quantity_received >= item.quantity_ordered;

                                return (
                                    <tr key={item.id} className="hover:bg-surfaceHighlight transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-text-main">
                                                    {(item as any).expand?.product?.name || 'Unknown'}
                                                </p>
                                                <p className="text-xs text-text-muted">
                                                    SKU: {(item as any).expand?.product?.sku || 'N/A'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-text-main">
                                            {item.quantity_ordered}
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-text-main">
                                            {item.quantity_received}
                                        </td>
                                        {isReceiving && (
                                            <td className="px-6 py-4">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={remaining}
                                                    value={receivingQuantities[item.id] || 0}
                                                    onChange={(e) => setReceivingQuantities({
                                                        ...receivingQuantities,
                                                        [item.id]: parseInt(e.target.value) || 0
                                                    })}
                                                    className="w-20 bg-surface border border-border rounded-lg px-3 py-1.5 text-center text-text-main focus:outline-none focus:border-primary"
                                                    disabled={isComplete}
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-right font-medium text-text-main">
                                            ${item.unit_cost.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-text-main">
                                            ${item.total.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isComplete ? (
                                                <div className="inline-flex items-center gap-1.5 text-secondary">
                                                    <CheckCircle size={16} />
                                                    <span className="text-xs font-medium">Complete</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-text-muted">
                                                    {remaining} remaining
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {isReceiving && (
                    <div className="p-6 border-t border-border bg-surfaceHighlight/30 flex justify-end gap-3">
                        <button
                            onClick={() => setIsReceiving(false)}
                            className="px-6 py-2.5 border border-border rounded-lg text-text-main hover:bg-surface transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleReceive}
                            disabled={receivePO.isPending}
                            className="btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {receivePO.isPending ? 'Receiving...' : 'Confirm Receipt'}
                        </button>
                    </div>
                )}
            </div>

            {/* Status Actions */}
            {po.status === 'draft' && (
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-text-main mb-4">Actions</h3>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleStatusChange('sent')}
                            className="btn-primary"
                        >
                            Mark as Sent
                        </button>
                        <button
                            onClick={() => handleStatusChange('cancelled')}
                            className="px-6 py-2.5 bg-danger/10 text-danger hover:bg-danger/20 rounded-lg transition-colors font-medium"
                        >
                            Cancel Order
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
