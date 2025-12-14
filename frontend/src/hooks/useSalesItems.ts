import { useQuery } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface SalesItem extends RecordModel {
    sale: string;
    product: string;
    quantity: number;
    unit_price: number;
    total: number;
}

export function useSalesItems() {
    return useQuery({
        queryKey: ['sales-items'],
        queryFn: async () => {
            const result = await pb.collection('sales_items').getList<SalesItem>(1, 100, {
                sort: '-created',
                expand: 'sale,product',
                fields: '*',
            });
            return result.items;
        },
    });
}