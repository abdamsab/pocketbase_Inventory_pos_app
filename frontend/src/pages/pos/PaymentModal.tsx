import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useLocation } from '../../contexts/LocationContext';
import { useSaleTransaction } from '../../hooks/useSaleTransaction';
import { offlineManager } from '../../lib/offlineManager';
import { X, Loader2, CheckCircle, CreditCard, Banknote, AlertCircle, Wifi, WifiOff, Landmark, User, Search } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import type { Customer } from '../../types';

interface PaymentModalProps {
    onClose: () => void;
}

export function PaymentModal({ onClose }: PaymentModalProps) {
    const navigate = useNavigate();
    const { total } = useCartStore();
    const { user } = useAuthStore();
    const { activeLocation } = useLocation(); // Use active location context
    const createSale = useSaleTransaction();
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
    const offlineStatus = offlineManager.getStatus();

    // Customer State
    const [customerSearch, setCustomerSearch] = useState('');
    const [searchedCustomers, setSearchedCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

    // Search Customers
    const handleCustomerSearch = async (query: string) => {
        setCustomerSearch(query);
        if (query.length < 2) {
            setSearchedCustomers([]);
            return;
        }

        setIsSearchingCustomers(true);
        try {
            const result = await pb.collection('customers').getList<Customer>(1, 5, {
                filter: `name ~ "${query}" || email ~ "${query}" || phone ~ "${query}"`,
            });
            setSearchedCustomers(result.items);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearchingCustomers(false);
        }
    };

    const processSale = async () => {
        if (!user) return;
        if (!activeLocation) {
            alert("No active location selected. Cannot process sale.");
            return;
        }

        // Prepare sale data according to the expected format
        const now = new Date().toISOString();
        const saleData = {
            sale_number: `SALE-${Date.now()}`,
            user: user.id,
            location: activeLocation.id, // Correct: Use active location
            subtotal: total(), // Required field
            tax: 0, // Optional, default to 0
            discount: 0, // Optional, default to 0
            total: total(),
            payment_method: paymentMethod as 'cash' | 'card' | 'mobile',
            status: 'completed' as const,
            notes: undefined, // Optional
            customer: selectedCustomer?.id, // Add customer
            created: now, // Add timestamp
            updated: now, // Add timestamp
        };

        try {
            await createSale.mutateAsync(saleData);
            // Success is handled by the mutation
        } catch (error) {
            console.error('Sale transaction failed:', error);
        }
    };

    // Check if the transaction was successful
    const isSuccess = createSale.isSuccess;

    if (isSuccess) {
        // ... (Keep existing success UI)
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-surface border border-white/10 p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full transform scale-100 transition-all">
                    <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-secondary" size={32} />
                    </div>
                    <h2 className="text-2xl font-heading font-bold text-white mb-2">Sale Completed!</h2>
                    <p className="text-text-muted mb-6">Transaction processed successfully.</p>
                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                if (createSale.data) {
                                    onClose(); // Close modal first
                                    navigate(`/sales/${createSale.data.id}`);
                                }
                            }}
                            className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primaryHover transition-colors"
                        >
                            🖨️ Print Receipt
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full bg-surfaceHighlight text-text-main py-3 px-4 rounded-lg font-medium hover:bg-surface transition-colors"
                        >
                            Continue
                        </button>
                    </div>
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

                <div className="p-6 space-y-8 overflow-y-auto">

                    {/* Customer Selection */}
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-2">Customer (Optional)</label>
                        {selectedCustomer ? (
                            <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{selectedCustomer.name}</p>
                                        <p className="text-xs text-primary/80">{selectedCustomer.phone || selectedCustomer.email}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedCustomer(null)} className="text-text-muted hover:text-white">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search name, email or phone..."
                                    className="w-full bg-surfaceHighlight border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                                    value={customerSearch}
                                    onChange={(e) => handleCustomerSearch(e.target.value)}
                                />
                                {searchedCustomers.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-white/10 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                                        {searchedCustomers.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedCustomer(c);
                                                    setCustomerSearch('');
                                                    setSearchedCustomers([]);
                                                }}
                                                className="w-full text-left p-3 hover:bg-white/5 flex items-center justify-between border-b border-white/5 last:border-0"
                                            >
                                                <span className="text-sm text-white">{c.name}</span>
                                                <span className="text-xs text-text-muted">{c.phone}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Connection Status */}
                    <div className="flex items-center justify-center gap-2 py-2">
                        {offlineStatus.isOnline ? (
                            <>
                                <Wifi className="w-4 h-4 text-green-400" />
                                <span className="text-xs text-green-400">Online</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-4 h-4 text-yellow-400" />
                                <span className="text-xs text-yellow-400">Offline - Will sync when online</span>
                            </>
                        )}
                    </div>

                    {/* Total Display */}
                    <div className="text-center py-8 bg-background/50 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors"></div>
                        <p className="text-text-muted text-sm mb-2 relative z-10">Total Amount</p>
                        <p className="text-5xl font-heading font-bold text-primary relative z-10 tracking-tight">
                            ${total().toFixed(2)}
                        </p>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-4">Select Payment Method</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ${paymentMethod === 'cash'
                                    ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10'
                                    : 'border-white/10 hover:border-white/20 text-text-muted hover:bg-white/5'
                                    }`}
                            >
                                <Banknote size={24} />
                                <span className="font-medium text-sm">Cash</span>
                            </button>
                            <button
                                onClick={() => setPaymentMethod('card')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ${paymentMethod === 'card'
                                    ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10'
                                    : 'border-white/10 hover:border-white/20 text-text-muted hover:bg-white/5'
                                    }`}
                            >
                                <CreditCard size={24} />
                                <span className="font-medium text-sm">Card</span>
                            </button>
                            <button
                                onClick={() => setPaymentMethod('bank_transfer' as any)}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ${paymentMethod === 'bank_transfer'
                                    ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10'
                                    : 'border-white/10 hover:border-white/20 text-text-muted hover:bg-white/5'
                                    }`}
                            >
                                <Landmark size={24} />
                                <span className="font-medium text-sm">Bank</span>
                            </button>
                        </div>
                    </div>

                    {/* Error Display */}
                    {createSale.isError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center animate-shake">
                            <div className="flex flex-col items-center justify-center gap-2 text-danger">
                                <AlertCircle size={32} strokeWidth={2.5} />
                                <span className="font-bold text-lg">Transaction Failed</span>
                                <span className="text-sm font-medium">
                                    {(createSale.error as Error)?.message || 'Something went wrong. Please try again.'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={processSale}
                        disabled={createSale.isPending}
                        className="w-full bg-gradient-to-r from-primary to-primaryHover text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {createSale.isPending ? (
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
