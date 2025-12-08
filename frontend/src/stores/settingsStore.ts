import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
    companyName: string;
    address: string;
    taxRate: number;
    currency: string;
    updateSettings: (settings: Partial<Omit<SettingsState, 'updateSettings'>>) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            companyName: 'NexusPOS',
            address: '123 Store Street, City, Country',
            taxRate: 0.10,
            currency: 'USD',
            updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
        }),
        {
            name: 'settings-storage',
        }
    )
);
