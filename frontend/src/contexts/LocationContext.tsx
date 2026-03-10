import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { pb } from '../lib/pocketbase';
import type { Location } from '../types';
import { MapPin, Building, Globe } from 'lucide-react'; // Actually Loader2 is used? No, ID 7fc81a42 says unused.
// Wait, I see Loader2 imported. Let's check usages.
// Only imported at line 5. Not used in file content I saw earlier?
// Ah lines 1-109 I saw earlier.
// Line 20: `const [isLoading, setIsLoading] = useState(true);`
// Line 31: `setIsLoading(true);`
// Line 95: `isLoading` passed to provider.
// No JSX usage of `<Loader2 />`. Correct. 
// Replacing import with specific instruction to delete.

interface LocationContextType {
    activeLocation: Location | 'all' | null;
    availableLocations: Location[];
    isLoading: boolean;
    switchLocation: (locationId: string | 'all') => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isInitialized } = useAuthStore();
    const [activeLocation, setActiveLocationState] = useState<Location | 'all' | null>(null);
    const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch available locations for the user
    useEffect(() => {
        const fetchLocations = async () => {
            if (!user || !isInitialized) {
                setAvailableLocations([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                let locations: Location[] = [];

                if (user.superuser) {
                    // Superusers see all locations
                    const records = await pb.collection('locations').getFullList({ sort: 'name' });
                    locations = records as Location[];
                } else if (user.locations && user.locations.length > 0) {
                    // Filter based on assigned IDs
                    // Optimisation: If < 15 locations, string filter is fine.
                    // If user has many locations, this filter string might get too long, but for now it's acceptable.
                    const filter = user.locations.map(id => `id="${id}"`).join(' || ');
                    if (filter) {
                        const records = await pb.collection('locations').getFullList({ filter, sort: 'name' });
                        locations = records as Location[];
                    }
                } else {
                    console.warn('LocationContext: User has no locations assigned and is not a superuser.');
                }

                setAvailableLocations(locations);

                console.log('LocationContext: Initialized', {
                    userLocations: user.locations,
                    available: locations.map(l => l.name)
                });

                // Active location setting is handled by the dedicated useEffect


            } catch (e) {
                console.error("LocationContext: Failed to fetch locations", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLocations();
    }, [user, isInitialized]);

    const switchLocation = async (locationId: string | 'all') => {
        console.log('LocationContext: Switching to', locationId);

        if (locationId === 'all') {
            // Validate permission?
            setActiveLocationState('all');
            localStorage.setItem('active_location_preference', 'all');
        } else {
            const target = availableLocations.find(l => l.id === locationId);
            if (target) {
                setActiveLocationState(target);
                localStorage.setItem('active_location_preference', locationId);
            } else {
                console.warn(`LocationContext: Attempted to switch to invalid location ID: ${locationId}`);
            }
        }
    };

    return (
        <LocationContext.Provider value={{ activeLocation, availableLocations, isLoading, switchLocation }}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
};
