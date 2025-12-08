import { create } from 'zustand';
import { pb } from '../lib/pocketbase';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    isValid: boolean;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
    // Initialize from PocketBase store
    const initialUser = pb.authStore.model as User | null;
    const initialValid = pb.authStore.isValid;

    return {
        user: initialUser,
        isValid: initialValid,
        login: async (email, pass) => {
            await pb.collection('users').authWithPassword(email, pass);
        },
        logout: () => {
            pb.authStore.clear();
            set({ user: null, isValid: false });
        },
    };
});

// Sync PocketBase auth state with Zustand
pb.authStore.onChange((token, model) => {
    useAuthStore.setState({
        user: model as User | null,
        isValid: !!token,
    });
});
