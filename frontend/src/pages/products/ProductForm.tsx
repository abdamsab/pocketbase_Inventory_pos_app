import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories } from '../../hooks/useCategories';
import { useProducts, useAddToInventory } from '../../hooks/useProducts';
import { useLocation } from '../../contexts/LocationContext';
import { useAuthStore } from '../../stores/authStore';
import { X, Upload, Loader2 } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import type { Product } from '../../types';

interface ProductFormProps {
    product?: Product;
    mode?: 'create' | 'add-stock' | 'edit-pricing'; // NEW: explicit mode control
    onClose: () => void;
    onSuccess: () => void;
}

export function ProductForm({ product, mode = 'create', onClose, onSuccess }: ProductFormProps) {
    const queryClient = useQueryClient();
    const { data: categories, isLoading: categoriesLoading } = useCategories();
    const { data: existingProducts } = useProducts();
    const addToInventory = useAddToInventory();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const { availableLocations } = useLocation();
    const { user } = useAuthStore();

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category: '',
        location: '',
        cost_price: '',
        sale_price: '',
        stock: '',
        reorder_point: '5',
    });
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    // Handle product selection for add-stock mode
    useEffect(() => {
        if (mode === 'add-stock' && selectedProductId && existingProducts) {
            const selectedProduct = existingProducts.find(p => p.id === selectedProductId);
            if (selectedProduct) {
                setFormData({
                    name: selectedProduct.name,
                    sku: selectedProduct.sku,
                    category: selectedProduct.category || '',
                    location: formData.location, // Preserve existing location selection
                    cost_price: selectedProduct.cost_price.toString(),
                    sale_price: selectedProduct.sale_price.toString(),
                    stock: '0', // Reset stock for additional quantity input
                    reorder_point: selectedProduct.reorder_point?.toString() || '5',
                });
                if (selectedProduct.image) {
                    setPreview(pb.files.getUrl(selectedProduct, selectedProduct.image));
                }
            }
        } else if (product && mode === 'edit-pricing') {
            setFormData({
                name: product.name,
                sku: product.sku,
                category: product.category || '',
                location: formData.location, // Preserve or empty
                cost_price: product.cost_price.toString(),
                sale_price: product.sale_price.toString(),
                stock: product.stock.toString(),
                reorder_point: product.reorder_point?.toString() || '5',
            });
            if (product.image) {
                setPreview(pb.files.getUrl(product, product.image));
            }
        }
    }, [product, mode, selectedProductId, existingProducts]);

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

            if (mode === 'create') {
                // Create new product with initial stock
                await addToInventory.mutateAsync(data);
            } else if (mode === 'add-stock') {
                // Add stock to existing product (or create if SKU doesn't exist)
                await addToInventory.mutateAsync(data);
            } else if (mode === 'edit-pricing' && product) {
                // Edit pricing and image only
                await pb.collection('products').update(product.id, {
                    cost_price: parseFloat(formData.cost_price),
                    sale_price: parseFloat(formData.sale_price),
                    image: image,
                });
            }

            queryClient.invalidateQueries({ queryKey: ['products'] });
            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error('Product save error:', err);
            setError(err instanceof Error ? err.message : 'Failed to save product. Please check all fields.');
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
                        {mode === 'create' && 'Add New Product'}
                        {mode === 'add-stock' && 'Add Product Stock'}
                        {mode === 'edit-pricing' && 'Edit Product Pricing'}
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

                    {/* Conditional notification */}
                    {mode === 'add-stock' && selectedProductId && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                                Adding stock to: <strong>{formData.name}</strong> (SKU: {formData.sku})
                            </p>
                        </div>
                    )}

                    {mode === 'edit-pricing' && product && (
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                            <p className="text-sm text-amber-800">
                                Editing pricing for: <strong>{product.name}</strong> (SKU: {product.sku})
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            {/* Product selector for add-stock mode */}
                            {mode === 'add-stock' && (
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-2">Select Product *</label>
                                    <select
                                        required
                                        value={selectedProductId}
                                        onChange={(e) => setSelectedProductId(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                    >
                                        <option value="">Choose product to add stock...</option>
                                        {existingProducts?.map((prod) => (
                                            <option key={prod.id} value={prod.id}>
                                                {prod.name} (SKU: {prod.sku})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Basic product fields - shown for all modes but readonly for edit-pricing */}
                            <div>
                                <label className="block text-sm font-medium text-text-main mb-2">Product Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={`w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none ${mode === 'edit-pricing' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    placeholder="Enter product name"
                                    readOnly={mode === 'edit-pricing'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-main mb-2">SKU *</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    className={`w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none ${mode === 'edit-pricing' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    placeholder="Enter SKU"
                                    readOnly={mode === 'edit-pricing'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-main mb-2">Category *</label>
                                <select
                                    required
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className={`w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none ${mode === 'edit-pricing' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    disabled={mode === 'edit-pricing'}
                                >
                                    <option value="">Select Category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Location field - required for create/add-stock modes */}
                            {(mode === 'create' || mode === 'add-stock') && (
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-2">Location *</label>
                                    <select
                                        required
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                    >
                                        <option value="">Select Location</option>
                                        {availableLocations?.map((location) => (
                                            <option key={location.id} value={location.id}>
                                                {location.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Stock field - readonly for edit-pricing mode */}
                            <div>
                                <label className="block text-sm font-medium text-text-main mb-2">
                                    {mode === 'add-stock' ? 'Additional Stock *' : mode === 'edit-pricing' ? 'Current Stock' : 'Initial Stock'}
                                </label>
                                <input
                                    required={mode !== 'edit-pricing'}
                                    type="number"
                                    min="0"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                    className={`w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none ${mode === 'edit-pricing' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    placeholder={mode === 'add-stock' ? "Additional stock to add" : mode === 'edit-pricing' ? "Current stock (readonly)" : "Initial stock"}
                                    readOnly={mode === 'edit-pricing'}
                                />
                            </div>

                            {/* Pricing fields - always shown for create/add-stock, editable for edit-pricing */}
                            {(mode === 'create' || mode === 'add-stock' || mode === 'edit-pricing') && (
                                <>
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
                                </>
                            )}

                            {/* Reorder point - readonly for edit-pricing mode */}
                            {(mode === 'create' || mode === 'edit-pricing') && (
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-2">Reorder Point</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.reorder_point}
                                        onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                                        className={`w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none ${mode === 'edit-pricing' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                        placeholder="5"
                                        readOnly={mode === 'edit-pricing'}
                                    />
                                </div>
                            )}
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
                                mode === 'create' ? 'Create Product' :
                                    mode === 'add-stock' ? 'Add Product' :
                                        mode === 'edit-pricing' ? 'Update Product' :
                                            'Save Product'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
