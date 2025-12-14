import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import type { Supplier } from '../types';

// Match useProducts pattern - no auth guards, let PocketBase handle authentication
export function useSuppliers() {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            // Use getList like useProducts for consistency and pagination support
            const result = await pb.collection('suppliers').getList<Supplier>(1, 100, {
                sort: 'name', // Sort alphabetically by name
            });
            return result.items;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: Partial<Supplier>) => {
            return await pb.collection('suppliers').create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Supplier> }) => {
            return await pb.collection('suppliers').update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await pb.collection('suppliers').delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        },
    });

    return {
        ...query,
        createSupplier: createMutation.mutateAsync,
        updateSupplier: updateMutation.mutateAsync,
        deleteSupplier: deleteMutation.mutateAsync,
    };
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

// Backward compatibility exports for existing components
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
