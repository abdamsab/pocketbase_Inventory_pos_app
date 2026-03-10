import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import { useAuthStore } from '../stores/authStore';
import type { Inventory } from '../types';

interface TransferData {
    sourceLocationId: string;
    destinationLocationId: string;
    items: {
        productId: string;
        quantity: number;
        productName: string; // for notes
    }[];
    notes?: string;
}

export function useStockTransfer() {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async (data: TransferData) => {
            if (!user) throw new Error("User not authenticated");

            // 1. Process each item
            for (const item of data.items) {
                // Determine Source Inventory
                let sourceInv: Inventory;
                try {
                    sourceInv = await pb.collection('inventory').getFirstListItem(`product="${item.productId}" && location="${data.sourceLocationId}"`) as Inventory;
                } catch (e) {
                    throw new Error(`Product ${item.productName} not found in source location.`);
                }

                if (sourceInv.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.productName}. Available: ${sourceInv.quantity}`);
                }

                // Determine Destination Inventory (Create if missing)
                let destInv: Inventory | null = null;
                try {
                    destInv = await pb.collection('inventory').getFirstListItem(`product="${item.productId}" && location="${data.destinationLocationId}"`) as Inventory;
                } catch (e) {
                    // Not found
                }

                // 2. Update Source
                await pb.collection('inventory').update(sourceInv.id, {
                    quantity: sourceInv.quantity - item.quantity
                });

                // 3. Update Destination
                if (destInv) {
                    await pb.collection('inventory').update(destInv.id, {
                        quantity: destInv.quantity + item.quantity
                    });
                } else {
                    await pb.collection('inventory').create({
                        product: item.productId,
                        location: data.destinationLocationId,
                        quantity: item.quantity,
                        reorder_point: sourceInv.reorder_point // Copy reorder point or default
                    });
                }

                // 4. Create Audit Entries (One for OUT, One for IN)
                const now = new Date().toISOString();

                // OUT Entry
                await pb.collection('inventory_entries').create({
                    product: item.productId,
                    location: data.sourceLocationId,
                    user: user.id,
                    type: 'transfer',
                    quantity: -item.quantity,
                    notes: `Transfer OUT to ${data.destinationLocationId} (ref: ${item.productName})`,
                    created: now,
                    updated: now
                });

                // IN Entry
                await pb.collection('inventory_entries').create({
                    product: item.productId,
                    location: data.destinationLocationId,
                    user: user.id,
                    type: 'transfer',
                    quantity: item.quantity,
                    notes: `Transfer IN from ${data.sourceLocationId} (ref: ${item.productName})`,
                    created: now,
                    updated: now
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-entries'] });
        }
    });
}
