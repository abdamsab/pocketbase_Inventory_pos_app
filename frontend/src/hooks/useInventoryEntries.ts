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

import { useLocation } from '../contexts/LocationContext';

export function useInventoryEntries() {
    const { activeLocation } = useLocation();

    return useQuery({
        queryKey: ['inventory-entries', activeLocation === 'all' ? 'all' : activeLocation?.id],
        queryFn: async () => {
            if (!activeLocation) return [];

            let filter = '';
            if (activeLocation !== 'all') {
                filter = `location="${activeLocation.id}"`;
            }

            const result = await pb.collection('inventory_entries').getList<InventoryEntry>(1, 100, {
                sort: '-created',
                expand: 'product,location,user',
                filter: filter,
            });
            return result.items;
        },
        enabled: !!activeLocation,
    });
}