import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../types';
import { loadCartFromStorage } from '../utils/cartValidation';

export interface CartItem extends Product {
    quantity: number;
}

interface CartState {
    items: CartItem[];
    isLoading: boolean;
    error: string | null;
    lastValidation: Date | null;
    // Rollback functionality
    backupItems: CartItem[];
    createBackup: () => void;
    rollbackCart: () => void;
    addItem: (product: Product) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    total: () => number;
    validateCart: () => Promise<void>;
    recoverCart: () => Promise<void>;
    clearError: () => void;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            isLoading: false,
            error: null,
            lastValidation: null,
            backupItems: [],

            addItem: (product) => {
                const items = get().items;
                const existingItem = items.find((i) => i.id === product.id);
                if (existingItem) {
                    set({
                        items: items.map((i) =>
                            i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
                        ),
                    });
                } else {
                    set({ items: [...items, { ...product, quantity: 1 }] });
                }
                // Clear any previous errors when cart is modified
                set({ error: null });
            },

            removeItem: (productId) => {
                set({ items: get().items.filter((i) => i.id !== productId) });
                set({ error: null });
            },

            updateQuantity: (productId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(productId);
                    return;
                }
                set({
                    items: get().items.map((i) =>
                        i.id === productId ? { ...i, quantity } : i
                    ),
                });
                set({ error: null });
            },

            clearCart: () => {
                set({ items: [], error: null });
            },

            total: () => {
                return get().items.reduce((sum, item) => sum + item.sale_price * item.quantity, 0);
            },

            validateCart: async () => {
                const currentItems = get().items;
                if (currentItems.length === 0) return;

                set({ isLoading: true, error: null });

                try {
                    // Note: In a real implementation, you'd call the validation function
                    // For now, we'll just mark as validated
                    set({
                        lastValidation: new Date(),
                        isLoading: false
                    });
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Cart validation failed'
                    });
                }
            },

            recoverCart: async () => {
                set({ isLoading: true, error: null });

                try {
                    const { items, messages } = await loadCartFromStorage();

                    set({
                        items,
                        isLoading: false,
                        lastValidation: new Date(),
                    });

                    // Log any recovery messages
                    if (messages.length > 0) {
                        console.log('Cart recovery messages:', messages);
                        // You could show these to the user via a toast notification
                    }
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Cart recovery failed',
                        items: [], // Start with empty cart on failure
                    });
                }
            },

            createBackup: () => {
                const currentItems = get().items;
                set({ backupItems: [...currentItems] });
            },

            rollbackCart: () => {
                const backupItems = get().backupItems;
                if (backupItems.length > 0) {
                    set({ items: [...backupItems], error: null });
                }
            },

            clearError: () => {
                set({ error: null });
            },
        }),
        {
            name: 'pos-cart',
            version: 2, // Increment version for migration
            migrate: (persistedState: unknown, version: number) => {
                if (version < 2) {
                    // Migration from old format
                    const oldState = persistedState as { items?: CartItem[] };
                    return {
                        items: oldState?.items || [],
                        isLoading: false,
                        error: null,
                        lastValidation: null,
                    };
                }
                return persistedState as Partial<CartState>;
            },
        }
    )
);

// Initialize cart recovery on app start
if (typeof window !== 'undefined') {
    // Run recovery after a short delay to allow other stores to initialize
    setTimeout(() => {
        const store = useCartStore.getState();
        if (store.items.length === 0) {
            store.recoverCart().catch(console.error);
        }
    }, 100);
}
