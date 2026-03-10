import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pb } from '../../lib/pocketbase';
import { X, Loader2, MapPin } from 'lucide-react';
import type { User, Location } from '../../types';

interface UserFormProps {
    user?: User;
    onClose: () => void;
    onSuccess: () => void;
}

export function UserForm({ user, onClose, onSuccess }: UserFormProps) {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locations, setLocations] = useState<Location[]>([]);

    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        passwordConfirm: '',
        role: user?.role || 'cashier',
        items_per_page: user?.items_per_page?.toString() || '10',
        locations: Array.isArray(user?.locations) ? user.locations : (user?.locations ? [user.locations as unknown as string] : []),
        superuser: user?.superuser || false,
    });

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const records = await pb.collection('locations').getFullList<Location>({
                    sort: 'name',
                });
                setLocations(records);
            } catch (e) {
                console.error("Failed to fetch locations", e);
            }
        };
        fetchLocations();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLocationToggle = (locationId: string) => {
        setFormData(prev => {
            const current = prev.locations;
            if (current.includes(locationId)) {
                return { ...prev, locations: current.filter(id => id !== locationId) };
            } else {
                return { ...prev, locations: [...current, locationId] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password && formData.password !== formData.passwordConfirm) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            const data: any = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                items_per_page: parseInt(formData.items_per_page),
                locations: formData.locations,
                superuser: formData.superuser,
            };

            if (formData.password) {
                data.password = formData.password;
                data.passwordConfirm = formData.passwordConfirm;
            }

            // Important: emailVisibility is required by some PB versions, safest to set true
            data.emailVisibility = true;

            if (user) {
                await pb.collection('users').update(user.id, data);
            } else {
                await pb.collection('users').create(data);
            }

            queryClient.invalidateQueries({ queryKey: ['users'] });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('User save error:', err);
            setError(err.message || 'Failed to save user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-text-main">
                        {user ? 'Edit User' : 'Add New User'}
                    </h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">Full Name *</label>
                            <input
                                required
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">Email Address *</label>
                            <input
                                required
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                placeholder="john@example.com"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-main mb-2">Role *</label>
                                <select
                                    required
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                >
                                    <option value="cashier">Cashier</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-main mb-2">Items Per Page</label>
                                <select
                                    name="items_per_page"
                                    value={formData.items_per_page}
                                    onChange={handleChange}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                >
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-main mb-2">
                                    {user ? 'New Password' : 'Password *'}
                                </label>
                                <input
                                    required={!user}
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                    placeholder={user ? "Leave empty to keep" : "******"}
                                    minLength={8}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-main mb-2">Confirm Password</label>
                                <input
                                    required={!!formData.password}
                                    name="passwordConfirm"
                                    type="password"
                                    value={formData.passwordConfirm}
                                    onChange={handleChange}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                    placeholder="Confirm password"
                                />
                            </div>
                        </div>

                        {/* Superuser Toggle Removed - Backend Only Control */}
                        {/* 
                         * The superuser flag is now strictly managed by database administrators
                         * to prevent privilege escalation via the UI.
                         */}

                        {/* Location Selection */}
                        {!formData.superuser && (
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-medium text-text-main">
                                    <MapPin size={16} />
                                    Assigned Locations
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                    {locations.map(loc => (
                                        <label
                                            key={loc.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${formData.locations.includes(loc.id)
                                                ? 'bg-primary/10 border-primary/30'
                                                : 'bg-background border-border hover:border-primary/50'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-primary bg-background border-gray-300 rounded focus:ring-primary"
                                                checked={formData.locations.includes(loc.id)}
                                                onChange={() => handleLocationToggle(loc.id)}
                                            />
                                            <span className="text-sm text-text-main">{loc.name}</span>
                                        </label>
                                    ))}
                                    {locations.length === 0 && (
                                        <div className="col-span-2 text-center text-sm text-text-muted py-2">
                                            No locations found. Please create locations first.
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-text-muted">
                                    Select which locations this user is authorized to access.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-text-main hover:bg-surfaceHighlight transition-colors font-medium"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Saving...
                                </>
                            ) : (
                                user ? 'Update User' : 'Create User'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
