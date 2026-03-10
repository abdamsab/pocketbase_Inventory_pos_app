import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '../../lib/pocketbase';
import type { User, Location as LocationType } from '../../types';
import { useAuthStore } from '../../stores/authStore';

import { useState } from 'react';
import { UserForm } from './UserForm';
import { Plus, Search, Edit2, Trash2, Shield, MapPin, User as UserIcon } from 'lucide-react';

// Extended type for user with expanded relations
interface ExpandedUser extends User {
    expand?: {
        locations?: LocationType[];
    };
}

export function UserList() {
    const { user: currentUser } = useAuthStore(); // Keep currentUser for potential future checks or if it's implicitly used elsewhere
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const result = await pb.collection('users').getList<ExpandedUser>(1, 100, {
                sort: '-created',
                expand: 'locations', // Important: Fetch location details
            });
            return result.items;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await pb.collection('users').delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            await deleteMutation.mutateAsync(id);
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsFormOpen(true);
    };

    const filteredUsers = users?.filter(user =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    );

    const formatLocations = (user: ExpandedUser) => {
        if (user.superuser) return <span className="text-secondary font-medium">All Locations (Superuser)</span>;

        const locs = user.expand?.locations || [];
        if (locs.length === 0) return <span className="text-text-muted italic">No locations assigned</span>;
        if (locs.length === 1) return locs[0].name;
        if (locs.length <= 2) return locs.map(l => l.name).join(', ');
        return `${locs.length} assigned locations`;
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 text-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-text-main">User Management</h2>
                    <p className="text-text-muted">Manage system users, roles, and access permissions</p>
                </div>
                <button
                    onClick={() => {
                        setEditingUser(undefined);
                        setIsFormOpen(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    Add User
                </button>
            </div>

            <div className="bg-surface border border-border rounded-2xl shadow-lg overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-border">
                    <div className="relative max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-surfaceHighlight/30 text-xs uppercase text-text-muted font-medium">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Access Level</th>
                                <th className="px-6 py-4">Locations</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredUsers?.map((user) => (
                                <tr key={user.id} className="hover:bg-surfaceHighlight transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {user.avatar ? (
                                                    <img src={pb.files.getUrl(user, user.avatar)} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    <UserIcon size={20} />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-text-main">{user.name}</p>
                                                <p className="text-sm text-text-muted">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                            user.role === 'manager' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                'bg-gray-100 text-gray-700 border-gray-200'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.superuser ? (
                                            <div className="flex items-center gap-1.5 text-secondary font-medium text-sm">
                                                <Shield size={14} />
                                                Superuser
                                            </div>
                                        ) : (
                                            <span className="text-sm text-text-muted">Standard</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <MapPin size={14} className="text-text-muted" />
                                            <span className="text-text-main">{formatLocations(user as ExpandedUser)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                title="Edit User"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            {user.id !== currentUser?.id && (
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers?.length === 0 && (
                    <div className="p-12 text-center text-text-muted">
                        <UserIcon size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No users found matching your search</p>
                    </div>
                )}
            </div>

            {isFormOpen && (
                <UserForm
                    user={editingUser}
                    onClose={() => setIsFormOpen(false)}
                    onSuccess={() => {
                        setIsFormOpen(false); // Close modal on success
                    }}
                />
            )}
        </div>
    );
}
