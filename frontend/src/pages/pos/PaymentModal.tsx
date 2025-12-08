import { useState } from 'react';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { pb } from '../../lib/pocketbase';
import { X, Loader2, CheckCircle, CreditCard, Banknote } from 'lucide-react';

interface PaymentModalProps {
    onClose: () => void;
}

export function PaymentModal({ onClose }: PaymentModalProps) {
    const { items, total, clearCart } = useCartStore();
    const { user } = useAuthStore();
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const processSale = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const saleData = {
                sale_number: `SALE-${Date.now()}`,
                user: user.id,
                location: user.location,
                total: total(),
                payment_method: paymentMethod,
                status: 'completed',
            };
            const sale = await pb.collection('sales').create(saleData);

            for (const item of items) {
                await pb.collection('sales_items').create({
                    sale: sale.id,
                    product: item.id,
                    quantity: item.quantity,
                    unit_price: item.sale_price,
                    line_total: item.sale_price * item.quantity,
                });

                const newStock = item.stock - item.quantity;
                await pb.collection('products').update(item.id, {
                    stock: newStock >= 0 ? newStock : 0,
                });
            }

            await pb.collection('receipts').create({
                sale: sale.id,
                receipt_number: `REC-${Date.now()}`,
                content: { items, total: total(), date: new Date().toISOString() },
            });

            setSuccess(true);
            clearCart();

            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (error) {
            console.error('Sale failed:', error);
            alert('Failed to process sale. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-surface border border-white/10 p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full transform scale-100 transition-all">
                    <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-secondary" size={32} />
                    </div>
                    <h2 className="text-2xl font-heading font-bold text-white mb-2">Sale Completed!</h2>
                    <p className="text-text-muted">Receipt has been generated.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-surfaceHighlight/30">
                    <h2 className="text-xl font-heading font-bold text-white">Payment</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Total Display */}
                    <div className="text-center py-8 bg-background/50 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors"></div>
                        <p className="text-text-muted text-sm mb-2 relative z-10">Total Amount</p>
                        <p className="text-5xl font-heading font-bold text-white relative z-10 tracking-tight">
                            ${total().toFixed(2)}
                        </p>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-4">Select Payment Method</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ${paymentMethod === 'cash'
                                        ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10'
                                        : 'border-white/10 hover:border-white/20 text-text-muted hover:bg-white/5'
                                    }`}
                            >
                                <Banknote size={24} />
                                <span className="font-medium">Cash</span>
                            </button>
                            <button
                                onClick={() => setPaymentMethod('card')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ${paymentMethod === 'card'
                                        ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10'
                                        : 'border-white/10 hover:border-white/20 text-text-muted hover:bg-white/5'
                                    }`}
                            >
                                <CreditCard size={24} />
                                <span className="font-medium">Card</span>
                            </button>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={processSale}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-primaryHover text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={24} />
                                Processing...
                            </>
                        ) : (
                            `Pay $${total().toFixed(2)}`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
