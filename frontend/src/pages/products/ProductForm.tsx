import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCategories } from '../../hooks/useCategories';
import { X, Upload, Loader2 } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import type { Product } from '../../types';

interface ProductFormProps {
    product?: Product;
    onClose: () => void;
    onSuccess: () => void;
}

export function ProductForm({ product, onClose, onSuccess }: ProductFormProps) {
    const queryClient = useQueryClient();
    const { data: categories, isLoading: categoriesLoading } = useCategories();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category: '',
        cost_price: '',
        sale_price: '',
        stock: '',
        reorder_point: '5',
    });
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                sku: product.sku,
                category: product.category,
                cost_price: product.cost_price.toString(),
                sale_price: product.sale_price.toString(),
                stock: product.stock.toString(),
                reorder_point: product.reorder_point.toString(),
            });
            if (product.image) {
                setPreview(pb.files.getUrl(product, product.image));
            }
        }
    }, [product]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                data.append(key, value);
            });
            if (image) {
                data.append('image', image);
            }

            if (product) {
                await pb.collection('products').update(product.id, data);
            } else {
                await pb.collection('products').create(data);
            }

            queryClient.invalidateQueries({ queryKey: ['products'] });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Product save error:', err);
            setError(err.message || 'Failed to save product. Please check all fields.');
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    if (categoriesLoading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-surface rounded-2xl p-8">
                    <div className="flex items-center gap-3 text-primary">
                        <Loader2 className="animate-spin" size={24} />
                        <span>Loading categories...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!categories || categories.length === 0) {
        const [creating, setCreating] = useState(false);

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-surface border border-border rounded-2xl p-8 max-w-md">
                    <h3 className="text-lg font-semibold text-text-main mb-4">No Categories Found</h3>
                    <p className="text-text-muted mb-6">
                        You need to create at least one category before adding products.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-text-main hover:bg-surfaceHighlight transition-colors font-medium"
                            disabled={creating}
                        >
                            Close
                        </button>
                        <button
                            onClick={async () => {
                                setCreating(true);
                                try {
                                    await pb.collection('categories').create({ name: 'General' });
                                    queryClient.invalidateQueries({ queryKey: ['categories'] });
                                    // The component will re-render with categories now available
                                } catch (err) {
                                    console.error('Failed to create category:', err);
                                    alert('Failed to create category. Please try again.');
                                } finally {
                                    setCreating(false);
                                }
                            }}
                            disabled={creating}
                            className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    Creating...
                                </>
                            ) : (
                                'Create Default Category'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-text-main">
                        {product ? 'Edit Product' : 'Add New Product'}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-main mb-2">Product Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                    placeholder="Enter product name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-main mb-2">SKU *</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                    placeholder="Enter SKU"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-main mb-2">Category *</label>
                                <select
                                    required
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                >
                                    <option value="">Select Category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-2">Cost Price *</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.cost_price}
                                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-2">Sale Price *</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.sale_price}
                                        onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-2">Stock</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-2">Reorder Point</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.reorder_point}
                                        onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                        placeholder="5"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">Product Image</label>
                            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                                {preview ? (
                                    <div className="relative">
                                        <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg mb-2" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setImage(null);
                                                setPreview(null);
                                            }}
                                            className="absolute top-2 right-2 p-1 bg-danger text-white rounded-full hover:bg-danger/80"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="py-8">
                                        <Upload className="mx-auto mb-2 text-text-muted" size={32} />
                                        <p className="text-sm text-text-muted mb-2">Click to upload image</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    id="image-upload"
                                />
                                <label
                                    htmlFor="image-upload"
                                    className="btn-secondary inline-block cursor-pointer"
                                >
                                    Choose Image
                                </label>
                            </div>
                        </div>
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
                                product ? 'Update Product' : 'Create Product'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
