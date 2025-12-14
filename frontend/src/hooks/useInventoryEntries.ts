import { useQuery } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface InventoryEntry extends RecordModel {
    product: string;
    location?: string;
    type: 'purchase' | 'sale' | 'adjustment' | 'transfer';
    quantity: number;
    reference_id?: string;
    notes?: string;
    created: string;
    updated: string;
}

export function useInventoryEntries() {
    return useQuery({
        queryKey: ['inventory-entries'],
        queryFn: async () => {
            const result = await pb.collection('inventory_entries').getList<InventoryEntry>(1, 100, {
                sort: '-created',
                expand: 'product,location',
                fields: '*',
            });
            return result.items;
        },
    });
}