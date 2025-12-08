import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';

interface Setting {
    id: string;
    key: string;
    value: any;
    description: string;
}

export function useSettings() {
    return useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const records = await pb.collection('settings').getFullList<Setting>();
            // Convert array to object for easier access
            const settings: Record<string, any> = {};
            records.forEach(record => {
                settings[record.key] = record.value;
            });
            return settings;
        },
    });
}

export function useSetting(key: string) {
    return useQuery({
        queryKey: ['settings', key],
        queryFn: async () => {
            const records = await pb.collection('settings').getFullList<Setting>({
                filter: `key="${key}"`,
            });
            return records[0]?.value || null;
        },
    });
}

export function useUpdateSetting() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ key, value }: { key: string; value: any }) => {
            // Try to find existing setting
            const existing = await pb.collection('settings').getFullList<Setting>({
                filter: `key="${key}"`,
            });

            if (existing.length > 0) {
                // Update existing
                return await pb.collection('settings').update(existing[0].id, { value });
            } else {
                // Create new
                return await pb.collection('settings').create({ key, value, description: '' });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });
}
