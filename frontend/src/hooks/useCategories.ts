import { useQuery } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Category extends RecordModel {
    name: string;
}

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            return await pb.collection('categories').getFullList<Category>({
                sort: 'name',
            });
        },
    });
}
