import React, { useState } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useStockTransfer } from '../../hooks/useStockTransfer';
import { useLocation } from '../../contexts/LocationContext';
import { Search, ArrowRight, Truck, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export function StockTransfer() {
    const { data: products, isLoading: isLoadingProducts } = useProducts();
    const { activeLocation, availableLocations, isLoading: isLoadingLocations } = useLocation();
    const { mutate: transferStock, isPending: isTransferring } = useStockTransfer();
    const { user } = useAuthStore();

    const [destinationId, setDestinationId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [transferItems, setTransferItems] = useState<{ productId: string; quantity: number; name: string; max: number }[]>([]);
    const [notes, setNotes] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Filter products based on search
    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const addToTransfer = (product: any) => {
        // Check if already in list
        if (transferItems.find(i => i.productId === product.id)) return;

        // Default to 1 or max available if 0 (though button should be disabled)
        setTransferItems([...transferItems, {
            productId: product.id,
            quantity: 1,
            name: product.name,
            max: product.stock
        }]);
    };

    const removeFromTransfer = (id: string) => {
        setTransferItems(transferItems.filter(i => i.productId !== id));
    };

    const updateQuantity = (id: string, qty: number) => {
        setTransferItems(transferItems.map(i =>
            i.productId === id ? { ...i, quantity: Math.min(Math.max(1, qty), i.max) } : i
        ));
    };

    const handleTransfer = () => {
        setErrorMsg('');
        setSuccessMsg('');

        if (!destinationId) {
            setErrorMsg('Please select a destination location.');
            return;
        }
        if (transferItems.length === 0) {
            setErrorMsg('Please add items to transfer.');
            return;
        }

        transferStock({
            sourceLocationId: activeLocation!.id,
            destinationLocationId: destinationId,
            items: transferItems.map(i => ({
                productId: i.productId,
                quantity: i.quantity,
                productName: i.name
            })),
            notes
        }, {
            onSuccess: () => {
                setSuccessMsg('Transfer completed successfully!');
                setTransferItems([]);
                setNotes('');
                // Optional: clear success msg after 3s
                setTimeout(() => setSuccessMsg(''), 5000);
            },
            onError: (err) => {
                setErrorMsg(err.message || 'Transfer failed.');
            }
        });
    };

    if (isLoadingLocations) return <div className="p-8">Loading locations...</div>;

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col gap-6 p-6 bg-slate-50 overflow-hidden">

            {/* Header & Location Selection */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Truck className="h-6 w-6 text-indigo-600" />
                            Stock Transfer
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Move inventory between locations with audit tracking.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-100 p-3 rounded-lg">
                        <div className="flex flex-col">
                            <span className="text-xs uppercase text-slate-400 font-bold">Source (Active)</span>
                            <span className="font-semibold text-slate-700">{activeLocation?.name}</span>
                        </div>
                        <ArrowRight className="text-slate-400" />
                        <div className="flex flex-col min-w-[200px]">
                            <span className="text-xs uppercase text-slate-400 font-bold">Destination</span>
                            <select
                                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white py-1 px-2"
                                value={destinationId}
                                onChange={(e) => setDestinationId(e.target.value)}
                            >
                                <option value="">Select Destination...</option>
                                {availableLocations
                                    .filter(l => l.id !== activeLocation?.id)
                                    .map(l => (
                                        <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                                    ))}
                            </select>
                        </div>
                    </div>
                </div>

                {(successMsg || errorMsg) && (
                    <div className={`mt-4 p-4 rounded-lg flex items-center gap-2 ${successMsg ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {successMsg ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        <span>{successMsg || errorMsg}</span>
                    </div>
                )}
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">

                {/* Source Products Panel */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                        <Search className="h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search products by name or SKU..."
                            className="flex-1 border-none focus:ring-0 text-slate-700 placeholder:text-slate-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        {isLoadingProducts ? (
                            <div className="p-8 text-center text-slate-400">Loading products...</div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                    <tr>
                                        <th className="p-3 font-medium">Product</th>
                                        <th className="p-3 font-medium">SKU</th>
                                        <th className="p-3 font-medium text-right">Available</th>
                                        <th className="p-3 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredProducts.map(product => {
                                        const isAdded = transferItems.some(i => i.productId === product.id);
                                        const stock = (product as any).stock || 0;

                                        return (
                                            <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 font-medium text-slate-700">{product.name}</td>
                                                <td className="p-3 text-slate-500">{product.sku}</td>
                                                <td className={`p-3 text-right font-medium ${stock > 0 ? 'text-slate-700' : 'text-red-500'}`}>
                                                    {stock}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => addToTransfer(product)}
                                                        disabled={stock <= 0 || isAdded}
                                                        className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                                                    >
                                                        {isAdded ? 'Added' : 'Add'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Transfer Staging Panel */}
                <div className="w-[400px] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h2 className="font-semibold text-slate-800">Transfer Summary</h2>
                        <div className="text-xs text-slate-500 mt-1">{transferItems.length} items ready to move</div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {transferItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 mb-8">
                                <Truck className="h-12 w-12 mb-2 opacity-20" />
                                <p>No items added yet</p>
                            </div>
                        ) : (
                            transferItems.map(item => (
                                <div key={item.productId} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:shadow-sm transition-shadow">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-slate-800 truncate" title={item.name}>{item.name}</h4>
                                        <p className="text-xs text-slate-500">Max: {item.max}</p>
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        max={item.max}
                                        value={item.quantity}
                                        onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value))}
                                        className="w-20 rounded border-slate-200 py-1 px-2 text-sm text-center"
                                    />
                                    <button onClick={() => removeFromTransfer(item.productId)} className="text-slate-400 hover:text-red-500">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Notes (Optional)</label>
                            <textarea
                                className="w-full rounded-md border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                rows={2}
                                placeholder="Reason for transfer..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleTransfer}
                            disabled={transferItems.length === 0 || !destinationId || isTransferring}
                            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isTransferring ? 'Processing...' : 'Confirm Transfer'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
