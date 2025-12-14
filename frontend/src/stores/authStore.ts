import { create } from 'zustand';
import { pbValidated } from '../lib/pocketbase';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    isValid: boolean;
    isLoading: boolean;
    isInitialized: boolean; // New: tracks if initial auth check is complete
    error: string | null;
    lastActivity: number; // New: track when auth was last validated
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
    validateAuth: () => Promise<void>; // New: validate current auth state
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
    // Initialize from PocketBase store with validation
    const initialUser = pbValidated.raw.authStore.model as User | null;
    const initialValid = pbValidated.raw.authStore.isValid;

    return {
        user: initialUser,
        isValid: initialValid,
        isLoading: false,
        isInitialized: initialValid, // If we start with valid auth, we're already initialized
        error: null,
        lastActivity: Date.now(),

        login: async (email: string, password: string) => {
            const currentState = get();
            if (currentState.isLoading) {
                console.warn('Login already in progress');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                // Use validated auth method
                const authResult = await pbValidated.authWithPassword(email, password);

                // Update state manually to ensure consistency (onChange will also trigger)
                set({
                    user: authResult.record,
                    isValid: true,
                    isLoading: false,
                    error: null,
                    lastActivity: Date.now(),
                    isInitialized: true
                });

                console.log('Login successful for user:', authResult.record.email);

            } catch (error) {
                const errorMessage = error instanceof Error
                    ? error.message
                    : 'Login failed. Please check your credentials.';

                set({
                    isLoading: false,
                    error: errorMessage,
                    user: null,
                    isValid: false
                });

                throw error; // Re-throw for component handling
            }
        },

        logout: async () => {
            const currentState = get();
            if (currentState.isLoading) {
                console.warn('Logout already in progress');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                // Clear PocketBase auth store first
                pbValidated.raw.authStore.clear();

                // Update local state (onChange will also trigger but we want immediate consistency)
                set({
                    user: null,
                    isValid: false,
                    isLoading: false,
                    error: null,
                    lastActivity: Date.now(),
                    isInitialized: true // Keep initialized true after logout
                });

                console.log('Logout successful');

            } catch (error) {
                const errorMessage = error instanceof Error
                    ? error.message
                    : 'Logout failed.';

                set({
                    isLoading: false,
                    error: errorMessage
                });

                console.error('Logout error:', error);
            }
        },

        refresh: async () => {
            const currentState = get();
            if (currentState.isLoading) {
                console.warn('Auth refresh already in progress');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                // Refresh the auth token
                await pbValidated.raw.collection('users').authRefresh();

                // State will be updated by the onChange listener
                console.log('Auth refresh successful');

            } catch (error) {
                const errorMessage = error instanceof Error
                    ? error.message
                    : 'Auth refresh failed.';

                set({
                    isLoading: false,
                    error: errorMessage,
                    user: null,
                    isValid: false
                });

                console.error('Auth refresh error:', error);
                throw error;
            }
        },

        validateAuth: async () => {
            const currentState = get();
            if (currentState.isLoading) return;

            set({ isLoading: true, error: null });

            try {
                // Check if we have a stored token
                if (pbValidated.raw.authStore.token) {
                    // Try to refresh to validate the token
                    await pbValidated.raw.collection('users').authRefresh();

                    // If successful, state will be updated by onChange listener
                    set({
                        isLoading: false,
                        lastActivity: Date.now(),
                        isInitialized: true
                    });
                } else {
                    // No token, ensure we're logged out
                    set({
                        user: null,
                        isValid: false,
                        isLoading: false,
                        isInitialized: true,
                        error: null
                    });
                }
            } catch (error) {
                // Token is invalid, clear auth state
                console.warn('Auth validation failed, clearing auth state:', error);

                pbValidated.raw.authStore.clear();

                set({
                    user: null,
                    isValid: false,
                    isLoading: false,
                    isInitialized: true,
                    error: null
                });
            }
        },

        clearError: () => {
            set({ error: null });
        },
    };
});

// Enhanced sync with PocketBase auth state changes
// Single consolidated listener to avoid race conditions
pbValidated.raw.authStore.onChange((token, model) => {
    const isValid = !!token;
    const user = model ? (model as User) : null;
    const now = Date.now();

    console.log('Auth state changed:', {
        hasToken: !!token,
        hasUser: !!user,
        userEmail: user?.email,
        timestamp: new Date(now).toISOString()
    });

    useAuthStore.setState({
        user,
        isValid,
        isLoading: false, // Always clear loading on auth state change
        error: null, // Clear errors on successful auth state changes
        lastActivity: now,
        isInitialized: true, // Mark as initialized once we get any auth state change
    });
});

// Initialize auth validation on app start
// This ensures stored auth is still valid when the app loads
if (typeof window !== 'undefined') {
    // Run validation after a short delay to allow other initialization
    setTimeout(() => {
        const store = useAuthStore.getState();
        // Only run validation if not initialized AND not already valid
        // This prevents interference with successful login flows
        if (!store.isInitialized && !store.isValid) {
            store.validateAuth().catch(console.error);
        }
    }, 100);
}
