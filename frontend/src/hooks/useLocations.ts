import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Location extends RecordModel {
    name: string;
    address?: string;
    code: string;
    tax_rate?: number;
}

export function useLocations() {
    return useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            return await pb.collection('locations').getFullList<Location>({
                sort: 'name',
            });
        },
    });
}

export function useCreateLocation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Omit<Location, keyof RecordModel>) => {
            return await pb.collection('locations').create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
    });
}

export function useUpdateLocation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Location, keyof RecordModel>> }) => {
            return await pb.collection('locations').update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
    });
}

export function useDeleteLocation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            return await pb.collection('locations').delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
    });
}