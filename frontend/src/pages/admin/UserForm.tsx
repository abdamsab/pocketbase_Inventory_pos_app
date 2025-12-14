import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '../../lib/pocketbase';
import { X, Save, User as UserIcon, Mail, Lock, Shield } from 'lucide-react';
import type { User } from '../../types';

interface UserFormProps {
    onClose: () => void;
    user?: User | null;
}

export function UserForm({ onClose, user }: UserFormProps) {
    const queryClient = useQueryClient();
    const isEditMode = !!user;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        passwordConfirm: '',
        role: 'cashier',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email,
                password: '',
                passwordConfirm: '',
                role: user.role,
            });
        }
    }, [user]);

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const payload: any = {
                name: data.name,
                email: data.email,
                role: data.role,
                emailVisibility: true,
            };

            // Only add password to payload if it's set (required for create, optional for update)
            if (data.password) {
                payload.password = data.password;
                payload.passwordConfirm = data.passwordConfirm;
            }

            if (isEditMode && user) {
                return await pb.collection('users').update(user.id, payload);
            } else {
                return await pb.collection('users').create(payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            onClose();
        },
        onError: (err: any) => {
            setError(err.message || `Failed to ${isEditMode ? 'update' : 'create'} user`);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.passwordConfirm) {
            setError('Passwords do not match');
            return;
        }

        if (!isEditMode && !formData.password) {
            setError('Password is required for new users');
            return;
        }

        mutation.mutate(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-border bg-surfaceHighlight/20">
                    <h2 className="text-xl font-heading font-bold text-text-main">
                        {isEditMode ? 'Edit User' : 'Add New User'}
                    </h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-main flex items-center gap-2">
                            <UserIcon size={16} /> Name
                        </label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main placeholder-text-muted focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                            placeholder="John Doe"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-main flex items-center gap-2">
                            <Mail size={16} /> Email
                        </label>
                        <input
                            required
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main placeholder-text-muted focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                            placeholder="john@example.com"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-main flex items-center gap-2">
                                <Lock size={16} /> Password
                            </label>
                            <input
                                required={!isEditMode}
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main placeholder-text-muted focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                placeholder={isEditMode ? "(Unchanged)" : "••••••••"}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-main flex items-center gap-2">
                                <Lock size={16} /> Confirm
                            </label>
                            <input
                                required={!isEditMode || !!formData.password}
                                type="password"
                                value={formData.passwordConfirm}
                                onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main placeholder-text-muted focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                placeholder={isEditMode ? "(Unchanged)" : "••••••••"}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-main flex items-center gap-2">
                            <Shield size={16} /> Role
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none appearance-none"
                        >
                            <option value="cashier">Cashier</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                        >
                            {mutation.isPending ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <Save size={20} />
                                    {isEditMode ? 'Update User' : 'Create User'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
