import { useCartStore } from '../../stores/cartStore';
import { Plus, Minus, ShoppingCart, AlertTriangle } from 'lucide-react';

interface CartProps {
    onCheckout: () => void;
}

export function Cart({ onCheckout }: CartProps) {
    const { items, removeItem, updateQuantity, total, clearCart } = useCartStore();

    // Check if any item has insufficient stock
    const hasInsufficientStock = items.some(item => item.quantity > item.stock);

    return (
        <div className="flex flex-col h-full bg-surface border-l border-border shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg text-primary">
                        <ShoppingCart size={20} />
                    </div>
                    <h2 className="text-lg font-heading font-bold text-text-main">Current Order</h2>
                </div>
                <button
                    onClick={clearCart}
                    className="text-xs font-medium text-danger hover:bg-danger/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                    Clear All
                </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50">
                        <ShoppingCart size={48} strokeWidth={1} className="mb-4" />
                        <p>Cart is empty</p>
                        <p className="text-xs">Select items from the grid</p>
                    </div>
                ) : (
                    items.map((item) => {
                        const isLowStock = item.quantity > item.stock;
                        return (
                            <div key={item.id} className={`group flex justify-between items-center p-3 rounded-xl border transition-colors ${isLowStock
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-surfaceHighlight/30 border-border hover:border-primary/30'
                                }`}>
                                <div className="flex-1 min-w-0 mr-4">
                                    <h4 className="font-medium text-text-main line-clamp-1">{item.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-text-muted">${item.sale_price.toFixed(2)} / unit</p>
                                        {isLowStock && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                                                <AlertTriangle size={10} />
                                                Max: {item.stock}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-surface rounded-lg p-1 border border-border">
                                    <button
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-surfaceHighlight text-text-muted hover:text-text-main transition-colors"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className={`font-medium w-4 text-center text-sm ${isLowStock ? 'text-red-600' : 'text-text-main'}`}>
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-surfaceHighlight text-text-muted hover:text-text-main transition-colors"
                                        disabled={isLowStock} // Prevent adding more if already over stock (though user might want to fix it by removing) - actually let them click + but it will trigger validation again. Better to just let them click + effectively? No, maybe disable + if quantity >= stock.
                                    // Actually, updateQuantity handles logic. But here we just disable + if >= quantity to be safe? 
                                    // Let's keep it simple: allow +, but show warning.
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>

                                <div className="text-right min-w-[70px] ml-4">
                                    <p className="font-bold text-text-main">${(item.sale_price * item.quantity).toFixed(2)}</p>
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="text-[10px] text-danger opacity-0 group-hover:opacity-100 hover:underline transition-opacity"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-surface border-t border-border space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm text-text-muted">
                        <span>Subtotal</span>
                        <span>${total().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-text-muted">
                        <span>Tax (0%)</span>
                        <span>$0.00</span>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border">
                    <span className="text-lg font-bold text-text-main">Total</span>
                    <span className="text-2xl font-heading font-bold text-primary">${total().toFixed(2)}</span>
                </div>

                {hasInsufficientStock && (
                    <div className="bg-red-50 text-red-600 text-xs p-2 rounded flex items-center justify-center gap-1">
                        <AlertTriangle size={12} />
                        Some items exceed available stock
                    </div>
                )}

                <button
                    onClick={onCheckout}
                    className="w-full bg-gradient-to-r from-primary to-primaryHover text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                    disabled={items.length === 0 || hasInsufficientStock}
                >
                    {hasInsufficientStock ? 'Check Stock Needed' : 'Proceed to Payment'}
                </button>
            </div>
        </div>
    );
}
