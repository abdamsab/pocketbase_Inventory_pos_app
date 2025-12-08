import { useState } from 'react';
import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';
import { PaymentModal } from './PaymentModal';

export function POS() {
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);

    return (
        <div className="flex h-full">
            <div className="flex-1 h-full overflow-hidden">
                <ProductGrid />
            </div>
            <div className="w-[400px] h-full shadow-xl z-10">
                <Cart onCheckout={() => setIsPaymentOpen(true)} />
            </div>

            {isPaymentOpen && (
                <PaymentModal onClose={() => setIsPaymentOpen(false)} />
            )}
        </div>
    );
}
