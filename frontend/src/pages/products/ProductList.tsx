import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { pb } from '../../lib/pocketbase';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, ScanBarcode } from 'lucide-react';
import { useState } from 'react';
import { ProductForm } from './ProductForm';
import { BarcodeModal } from './BarcodeModal';

export function ProductList() {
    const { data: products, isLoading, refetch } = useProducts();
    const { data: categories } = useCategories();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [viewBarcodeProduct, setViewBarcodeProduct] = useState<any>(null);
    const [search, setSearch] = useState('');

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this product?')) {
            await pb.collection('products').delete(id);
            refetch();
        }
    };

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 text-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-text-main">Inventory</h2>
                    <p className="text-text-muted">Manage your products and stock levels</p>
                </div>
                <button
                    onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    Add Product
                </button>
            </div>

            <div className="bg-surface border border-border rounded-2xl shadow-lg overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-border flex gap-4">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search products..."
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
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredProducts?.map((product) => (
                                <tr key={product.id} className="hover:bg-surfaceHighlight transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-surfaceHighlight flex items-center justify-center overflow-hidden border border-border">
                                                {product.image ? (
                                                    <img src={pb.files.getUrl(product, product.image)} alt={product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package size={20} className="text-text-muted" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-text-main">{product.name}</h4>
                                                <p className="text-xs text-text-muted">{product.sku}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-text-muted">
                                        {categories?.find(c => c.id === product.category)?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-text-main">
                                        ${product.sale_price.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${product.stock <= (product.reorder_point || 10)
                                            ? 'bg-danger/10 text-danger border-danger/20'
                                            : 'bg-secondary/10 text-secondary border-secondary/20'
                                            }`}>
                                            {product.stock <= (product.reorder_point || 10) && <AlertTriangle size={12} />}
                                            {product.stock} units
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}
                                                className="p-2 hover:bg-primary/10 text-text-muted hover:text-primary rounded-lg transition-colors"
                                                title="Edit Product"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => setViewBarcodeProduct(product)}
                                                className="p-2 hover:bg-accent/10 text-text-muted hover:text-accent rounded-lg transition-colors"
                                                title="View Barcode"
                                            >
                                                <ScanBarcode size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 hover:bg-danger/10 text-text-muted hover:text-danger rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isFormOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <ProductForm
                            product={editingProduct}
                            onClose={() => setIsFormOpen(false)}
                            onSuccess={() => { setIsFormOpen(false); refetch(); }}
                        />
                    </div>
                </div>
            )}

            {viewBarcodeProduct && (
                <BarcodeModal
                    product={viewBarcodeProduct}
                    onClose={() => setViewBarcodeProduct(null)}
                />
            )}
        </div>
    );
}
