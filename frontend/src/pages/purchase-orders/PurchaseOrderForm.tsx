import { useCreatePurchaseOrder } from '../../hooks/usePurchaseOrders';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useProducts } from '../../hooks/useProducts';
import { useAuthStore } from '../../stores/authStore';
import { X, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function PurchaseOrderForm() {
    const navigate = useNavigate();
    const createPO = useCreatePurchaseOrder();
    const { data: suppliers } = useSuppliers();
    const { data: products } = useProducts();
    const { user } = useAuthStore();

    const [formData, setFormData] = useState({
        supplier: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_date: '',
        notes: '',
    });

    const [items, setItems] = useState<Array<{
        product: string;
        quantity_ordered: number;
        unit_cost: number;
    }>>([]);

    const addItem = () => {
        setItems([...items, { product: '', quantity_ordered: 1, unit_cost: 0 }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0);
    };

    const generatePONumber = () => {
        const timestamp = Date.now().toString().slice(-6);
        return `PO-${timestamp}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (items.length === 0) {
            alert('Please add at least one item to the purchase order');
            return;
        }

        if (!formData.supplier) {
            alert('Please select a supplier');
            return;
        }

        try {
            const poData = {
                po_number: generatePONumber(),
                supplier: formData.supplier,
                order_date: formData.order_date,
                expected_date: formData.expected_date || undefined,
                received_date: undefined,
                status: 'draft' as const,
                total: calculateTotal(),
                notes: formData.notes,
                created_by: user?.id || '',
            };

            const poItems = items.map(item => ({
                product: item.product,
                quantity_ordered: item.quantity_ordered,
                quantity_received: 0,
                unit_cost: item.unit_cost,
                total: item.quantity_ordered * item.unit_cost,
            }));

            await createPO.mutateAsync({ po: poData, items: poItems });
            navigate('/purchase-orders');
        } catch (error) {
            console.error('Failed to create purchase order:', error);
            alert('Failed to create purchase order. Please try again.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-text-main">New Purchase Order</h2>
                    <p className="text-text-muted">Create a new purchase order for inventory</p>
                </div>
                <button
                    onClick={() => navigate('/purchase-orders')}
                    className="p-2 hover:bg-surfaceHighlight rounded-lg transition-colors text-text-muted hover:text-text-main"
                >
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* PO Details */}
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-text-main mb-4">Order Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">
                                Supplier *
                            </label>
                            <select
                                required
                                value={formData.supplier}
                                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            >
                                <option value="">Select Supplier</option>
                                {suppliers?.filter(s => s.active).map(supplier => (
                                    <option key={supplier.id} value={supplier.id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">
                                Order Date *
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.order_date}
                                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">
                                Expected Delivery Date
                            </label>
                            <input
                                type="date"
                                value={formData.expected_date}
                                onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                                placeholder="Additional notes..."
                            />
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-text-main">Line Items</h3>
                        <button
                            type="button"
                            onClick={addItem}
                            className="btn-primary flex items-center gap-2 text-sm"
                        >
                            <Plus size={16} />
                            Add Item
                        </button>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="flex gap-3 items-start p-3 bg-surfaceHighlight rounded-lg">
                                <div className="flex-1 grid grid-cols-4 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-text-muted mb-1">
                                            Product
                                        </label>
                                        <select
                                            required
                                            value={item.product}
                                            onChange={(e) => updateItem(index, 'product', e.target.value)}
                                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary"
                                        >
                                            <option value="">Select Product</option>
                                            {products?.map(product => (
                                                <option key={product.id} value={product.id}>
                                                    {product.name} ({product.sku})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-text-muted mb-1">
                                            Quantity
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={item.quantity_ordered}
                                            onChange={(e) => updateItem(index, 'quantity_ordered', parseInt(e.target.value) || 0)}
                                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-text-muted mb-1">
                                            Unit Cost
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={item.unit_cost}
                                            onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-xs text-text-muted">Total</span>
                                    <span className="font-semibold text-text-main">
                                        ${(item.quantity_ordered * item.unit_cost).toFixed(2)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="p-1.5 hover:bg-danger/10 text-danger rounded transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {items.length === 0 && (
                            <div className="text-center py-8 text-text-muted">
                                <p>No items added yet. Click "Add Item" to begin.</p>
                            </div>
                        )}
                    </div>

                    {items.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border flex justify-end">
                            <div className="text-right">
                                <p className="text-sm text-text-muted mb-1">Total Amount</p>
                                <p className="text-2xl font-heading font-bold text-primary">
                                    ${calculateTotal().toFixed(2)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={() => navigate('/purchase-orders')}
                        className="px-6 py-2.5 border border-border rounded-lg text-text-main hover:bg-surfaceHighlight transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={createPO.isPending}
                        className="btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {createPO.isPending ? 'Creating...' : 'Create Purchase Order'}
                    </button>
                </div>
            </form>
        </div>
    );
}
