import { useQuery } from '@tanstack/react-query';
import { pb } from '../../lib/pocketbase';
import { Plus, Search, Edit, Trash2, Building2, Mail, Phone, User } from 'lucide-react';
import { useState } from 'react';
import { SupplierForm } from './SupplierForm';
import type { Supplier } from '../../types';

// EXACT replica of SalesHistory.tsx pattern
export function SupplierList() {
    const { data: suppliers, isLoading } = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const result = await pb.collection('suppliers').getList(1, 100, {
                sort: 'name',
            });
            return result.items;
        },
    });

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);
    const [search, setSearch] = useState('');

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this supplier?')) {
            await pb.collection('suppliers').delete(id);
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 text-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
        </div>
    );

    const filteredSuppliers = suppliers?.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-text-main">Suppliers</h2>
                    <p className="text-text-muted">Manage your supplier relationships</p>
                </div>
                <button
                    onClick={() => { setEditingSupplier(undefined); setIsFormOpen(true); }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    Add Supplier
                </button>
            </div>

            <div className="bg-surface border border-border rounded-2xl shadow-lg overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-border flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search suppliers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg pl-10 pr-10 py-2.5 text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <div className="text-sm text-text-muted">
                        {filteredSuppliers ? `${filteredSuppliers.length} supplier${filteredSuppliers.length !== 1 ? 's' : ''}` : 'Loading...'}
                        {search && suppliers && ` (filtered from ${suppliers.length})`}
                    </div>
                </div>

                {/* Grid View */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSuppliers?.map((supplier) => (
                        <div key={supplier.id} className="group bg-surfaceHighlight border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-text-main">{supplier.name}</h3>
                                        {supplier.contact_person && (
                                            <p className="text-xs text-text-muted flex items-center gap-1">
                                                <User size={12} />
                                                {supplier.contact_person}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${supplier.active ? 'bg-secondary/10 text-secondary' : 'bg-danger/10 text-danger'}`}>
                                    {supplier.active ? 'Active' : 'Inactive'}
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                {supplier.email && (
                                    <div className="flex items-center gap-2 text-sm text-text-muted">
                                        <Mail size={14} />
                                        <span className="truncate">{supplier.email}</span>
                                    </div>
                                )}
                                {supplier.phone && (
                                    <div className="flex items-center gap-2 text-sm text-text-muted">
                                        <Phone size={14} />
                                        <span>{supplier.phone}</span>
                                    </div>
                                )}
                                {supplier.payment_terms && (
                                    <div className="text-xs text-text-muted">
                                        Payment: {supplier.payment_terms}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => { setEditingSupplier(supplier as Supplier); setIsFormOpen(true); }}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Edit size={14} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(supplier.id)}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-danger/10 text-danger hover:bg-danger/20 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredSuppliers?.length === 0 && (
                    <div className="p-12 text-center text-text-muted">
                        <Building2 size={48} className="mx-auto mb-4 opacity-50" />
                        <p>{search ? 'No suppliers match your search' : 'No suppliers found'}</p>
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="mt-2 text-primary hover:text-primaryHover text-sm"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                )}
            </div>

            {isFormOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <SupplierForm
                            supplier={editingSupplier}
                            onClose={() => setIsFormOpen(false)}
                            onSuccess={() => { setIsFormOpen(false); }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
