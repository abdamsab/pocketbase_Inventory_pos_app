import { useCreateSupplier, useUpdateSupplier } from '../../hooks/useSuppliers';
import { X } from 'lucide-react';
import { useState } from 'react';
import type { Supplier } from '../../types';

interface SupplierFormProps {
    supplier?: Supplier | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function SupplierForm({ supplier, onClose, onSuccess }: SupplierFormProps) {
    const createSupplier = useCreateSupplier();
    const updateSupplier = useUpdateSupplier();
    const [formData, setFormData] = useState({
        name: supplier?.name || '',
        email: supplier?.email || '',
        phone: supplier?.phone || '',
        contact_person: supplier?.contact_person || '',
        address: supplier?.address || '',
        payment_terms: supplier?.payment_terms || '',
        notes: supplier?.notes || '',
        active: supplier?.active ?? true,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (supplier) {
                await updateSupplier.mutateAsync({ id: supplier.id, data: formData });
            } else {
                await createSupplier.mutateAsync(formData);
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to save supplier:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-heading font-bold text-text-main">
                    {supplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 hover:bg-surfaceHighlight rounded-lg transition-colors text-text-muted hover:text-text-main"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-2">
                            Supplier Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            placeholder="Enter supplier name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-2">
                            Contact Person
                        </label>
                        <input
                            type="text"
                            value={formData.contact_person}
                            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                            className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            placeholder="Contact person name"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            placeholder="supplier@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-2">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                        Address
                    </label>
                    <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={2}
                        className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                        placeholder="Full address"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                        Payment Terms
                    </label>
                    <input
                        type="text"
                        value={formData.payment_terms}
                        onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                        className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        placeholder="e.g., Net 30, Net 60, COD"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                        Notes
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                        placeholder="Additional notes..."
                    />
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 text-primary bg-surface border-border rounded focus:ring-primary focus:ring-2"
                    />
                    <label htmlFor="active" className="text-sm font-medium text-text-main">
                        Active Supplier
                    </label>
                </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-border">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 border border-border rounded-lg text-text-main hover:bg-surfaceHighlight transition-colors font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={createSupplier.isPending || updateSupplier.isPending}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {createSupplier.isPending || updateSupplier.isPending ? 'Saving...' : supplier ? 'Update Supplier' : 'Create Supplier'}
                </button>
            </div>
        </form>
    );
}
