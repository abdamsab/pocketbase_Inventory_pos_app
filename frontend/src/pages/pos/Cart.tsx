import { useCartStore } from '../../stores/cartStore';
import { Plus, Minus, ShoppingCart } from 'lucide-react';

interface CartProps {
    onCheckout: () => void;
}

export function Cart({ onCheckout }: CartProps) {
    const { items, removeItem, updateQuantity, total, clearCart } = useCartStore();

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
                    items.map((item) => (
                        <div key={item.id} className="group flex justify-between items-center bg-surfaceHighlight/30 p-3 rounded-xl border border-border hover:border-primary/30 transition-colors">
                            <div className="flex-1 min-w-0 mr-4">
                                <h4 className="font-medium text-text-main line-clamp-1">{item.name}</h4>
                                <p className="text-xs text-text-muted">${item.sale_price.toFixed(2)} / unit</p>
                            </div>

                            <div className="flex items-center gap-3 bg-surface rounded-lg p-1 border border-border">
                                <button
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-surfaceHighlight text-text-muted hover:text-text-main transition-colors"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="font-medium text-text-main w-4 text-center text-sm">{item.quantity}</span>
                                <button
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-surfaceHighlight text-text-muted hover:text-text-main transition-colors"
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
                    ))
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

                <button
                    onClick={onCheckout}
                    className="w-full bg-gradient-to-r from-primary to-primaryHover text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    disabled={items.length === 0}
                >
                    Proceed to Payment
                </button>
            </div>
        </div>
    );
}
