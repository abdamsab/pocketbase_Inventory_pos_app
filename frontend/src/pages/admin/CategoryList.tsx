import { useState } from 'react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, type Category } from '../../hooks/useCategories';
import { useAuthStore } from '../../stores/authStore';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';

export function CategoryList() {
    const { user } = useAuthStore();
    const { data: categories, isLoading } = useCategories();
    const createCategory = useCreateCategory();
    const updateCategory = useUpdateCategory();
    const deleteCategory = useDeleteCategory();

    const [searchTerm, setSearchTerm] = useState('');
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({ name: '' });

    const canManage = user?.role === 'admin' || user?.role === 'manager';

    const filteredCategories = categories?.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await updateCategory.mutateAsync({ id: editingCategory.id, data: formData });
                setEditingCategory(null);
            } else {
                await createCategory.mutateAsync(formData);
                setIsCreating(false);
            }
            setFormData({ name: '' });
        } catch (error) {
            console.error('Failed to save category:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            try {
                await deleteCategory.mutateAsync(id);
            } catch (error) {
                console.error('Failed to delete category:', error);
            }
        }
    };

    const startEdit = (category: Category) => {
        setEditingCategory(category);
        setFormData({ name: category.name });
        setIsCreating(false);
    };

    const cancelEdit = () => {
        setEditingCategory(null);
        setIsCreating(false);
        setFormData({ name: '' });
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
                    <h2 className="text-2xl font-heading font-bold text-text-main">Categories</h2>
                    <p className="text-text-muted">Manage product categories</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="btn-primary"
                    >
                        <Plus size={16} className="mr-2" />
                        Add Category
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
                <input
                    type="text"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-surface text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
            </div>

            {/* Form Modal */}
            {(isCreating || editingCategory) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">
                                {editingCategory ? 'Edit Category' : 'Add Category'}
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
                                        Category Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ name: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        className="flex-1 btn-primary"
                                        disabled={createCategory.isPending || updateCategory.isPending}
                                    >
                                        {createCategory.isPending || updateCategory.isPending ? 'Saving...' : 'Save'}
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

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCategories.map((category) => (
                    <div key={category.id} className="bg-surface border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-text-main">{category.name}</h3>
                            {canManage && (
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => startEdit(category)}
                                        className="p-1 text-text-muted hover:text-primary transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(category.id)}
                                        className="p-1 text-text-muted hover:text-danger transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-text-muted mt-2">
                            ID: {category.id.slice(0, 8)}...
                        </p>
                    </div>
                ))}
            </div>

            {filteredCategories.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                    <p>No categories found</p>
                </div>
            )}
        </div>
    );
}