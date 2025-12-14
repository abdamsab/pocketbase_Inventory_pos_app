import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import type { Product } from '../types';

export function useProducts() {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            // Use getList instead of getFullList to avoid parameter issues
            const result = await pb.collection('products').getList<Product>(1, 100, {
                sort: '-name', // Sort by name instead of created (created field doesn't exist)
            });
            return result.items;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: FormData) => {
            return await pb.collection('products').create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
            return await pb.collection('products').update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await pb.collection('products').delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });

    return {
        ...query,
        createProduct: createMutation.mutateAsync,
        updateProduct: updateMutation.mutateAsync,
        deleteProduct: deleteMutation.mutateAsync,
    };
}

// CORRECTED: Single inventory operation that handles both create and update based on SKU
export function useAddToInventory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            const sku = formData.get('sku')?.toString();
            if (!sku) throw new Error('SKU is required');

            const additionalStock = parseInt(formData.get('stock')?.toString() || '0');
            const costPrice = parseFloat(formData.get('cost_price')?.toString() || '0');
            const salePrice = parseFloat(formData.get('sale_price')?.toString() || '0');

            // Check if product exists by SKU
            const existingProducts = await pb.collection('products').getFullList({
                filter: `sku="${sku}"`
            });

            let product;
            let inventoryNotes;

            if (existingProducts.length > 0) {
                // UPDATE existing product
                const existingProduct = existingProducts[0];
                const newStock = existingProduct.stock + additionalStock;

                // Update product with new stock and prices
                const updateData: {
                    stock: number;
                    cost_price?: number;
                    sale_price?: number;
                } = { stock: newStock };
                if (costPrice > 0) updateData.cost_price = costPrice;
                if (salePrice > 0) updateData.sale_price = salePrice;

                product = await pb.collection('products').update(existingProduct.id, updateData);
                inventoryNotes = `Stock update: ${existingProduct.name} (+${additionalStock})`;
            } else {
                // CREATE new product
                product = await pb.collection('products').create(formData);
                inventoryNotes = `Initial stock for new product: ${formData.get('name')}`;
            }

            // Create inventory entry for audit trail (always positive for purchases)
            if (additionalStock > 0) {
                const now = new Date().toISOString();
                await pb.collection('inventory_entries').create({
                    product: product.id,
                    type: 'purchase',
                    quantity: additionalStock,  // Always positive for additions
                    reference_id: sku, // Use SKU for readable reference
                    notes: inventoryNotes,
                    created: now,
                    updated: now,
                });
            }

            return product;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-entries'] });
        },
    });
}
