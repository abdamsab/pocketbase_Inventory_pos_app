import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import type { Supplier } from '../types';

export function useSuppliers() {
    return useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            return await pb.collection('suppliers').getFullList<Supplier>({
                sort: '-created',
            });
        },
    });
}

export function useSupplier(id: string) {
    return useQuery({
        queryKey: ['suppliers', id],
        queryFn: async () => {
            return await pb.collection('suppliers').getOne<Supplier>(id);
        },
        enabled: !!id,
    });
}

export function useCreateSupplier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<Supplier>) => {
            return await pb.collection('suppliers').create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        },
    });
}

export function useUpdateSupplier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Supplier> }) => {
            return await pb.collection('suppliers').update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        },
    });
}

export function useDeleteSupplier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            return await pb.collection('suppliers').delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        },
    });
}
