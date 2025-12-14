import { useState } from 'react';
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation, type Location } from '../../hooks/useLocations';
import { useAuthStore } from '../../stores/authStore';
import { Plus, Edit2, Trash2, Search, X, Building2, MapPin, Hash } from 'lucide-react';

export function LocationList() {
    const { user } = useAuthStore();
    const { data: locations, isLoading } = useLocations();
    const createLocation = useCreateLocation();
    const updateLocation = useUpdateLocation();
    const deleteLocation = useDeleteLocation();

    const [searchTerm, setSearchTerm] = useState('');
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        code: '',
        tax_rate: 0
    });

    const canManage = user?.role === 'admin' || user?.role === 'manager';

    const filteredLocations = locations?.filter(location =>
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (location.address && location.address.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingLocation) {
                await updateLocation.mutateAsync({ id: editingLocation.id, data: formData });
                setEditingLocation(null);
            } else {
                await createLocation.mutateAsync(formData);
                setIsCreating(false);
            }
            setFormData({ name: '', address: '', code: '', tax_rate: 0 });
        } catch (error) {
            console.error('Failed to save location:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this location?')) {
            try {
                await deleteLocation.mutateAsync(id);
            } catch (error) {
                console.error('Failed to delete location:', error);
            }
        }
    };

    const startEdit = (location: Location) => {
        setEditingLocation(location);
        setFormData({
            name: location.name,
            address: location.address || '',
            code: location.code,
            tax_rate: location.tax_rate || 0
        });
        setIsCreating(false);
    };

    const cancelEdit = () => {
        setEditingLocation(null);
        setIsCreating(false);
        setFormData({ name: '', address: '', code: '', tax_rate: 0 });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-text-main">Locations</h2>
                    <p className="text-text-muted">Manage store locations</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="btn-primary"
                    >
                        <Plus size={16} className="mr-2" />
                        Add Location
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
                <input
                    type="text"
                    placeholder="Search locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-surface text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
            </div>

            {/* Form Modal */}
            {(isCreating || editingLocation) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">
                                {editingLocation ? 'Edit Location' : 'Add Location'}
                            </h3>
                            <button
                                onClick={cancelEdit}
                                className="text-text-muted hover:text-text-main"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-2">
                                        Location Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-2">
                                        Location Code *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-2">
                                        Address
                                    </label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-2">
                                        Tax Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={formData.tax_rate}
                                        onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        className="flex-1 btn-primary"
                                        disabled={createLocation.isPending || updateLocation.isPending}
                                    >
                                        {createLocation.isPending || updateLocation.isPending ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="flex-1 btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Locations List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLocations.map((location) => (
                    <div key={location.id} className="bg-surface border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Building2 size={20} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-text-main">{location.name}</h3>
                                    <div className="flex items-center gap-1 text-sm text-text-muted">
                                        <Hash size={12} />
                                        {location.code}
                                    </div>
                                </div>
                            </div>
                            {canManage && (
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => startEdit(location)}
                                        className="p-1 text-text-muted hover:text-primary transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(location.id)}
                                        className="p-1 text-text-muted hover:text-danger transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            {location.address && (
                                <div className="flex items-start gap-2 text-sm text-text-muted">
                                    <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-2">{location.address}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-text-muted">Tax Rate:</span>
                                <span className="font-medium text-text-main">{location.tax_rate || 0}%</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredLocations.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                    <Building2 size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No locations found</p>
                    <p className="text-sm">Add your first store location</p>
                </div>
            )}
        </div>
    );
}