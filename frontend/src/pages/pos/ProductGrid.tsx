import { useProducts } from '../../hooks/useProducts';
import { useCartStore } from '../../stores/cartStore';
import { pb } from '../../lib/pocketbase';
import { Search, Package, LayoutGrid, List } from 'lucide-react';
import { useState } from 'react';

export function ProductGrid() {
    const { data: products, isLoading } = useProducts();
    const addItem = useCartStore((state) => state.addItem);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) return (
        <div className="flex items-center justify-center h-full text-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Search Bar & Toggles */}
            <div className="p-6 pb-4 flex gap-4">
                <div className="relative group flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search products by name or SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl pl-12 pr-4 py-4 text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary shadow-lg transition-all"
                        autoFocus
                    />
                </div>

                {/* View Toggles */}
                <div className="flex bg-surface border border-border rounded-xl p-1 shadow-lg">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-3 rounded-lg transition-all ${viewMode === 'grid'
                            ? 'bg-primary text-white shadow-md'
                            : 'text-text-muted hover:text-text-main hover:bg-surfaceHighlight'
                            }`}
                        title="Grid View"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-3 rounded-lg transition-all ${viewMode === 'list'
                            ? 'bg-primary text-white shadow-md'
                            : 'text-text-muted hover:text-text-main hover:bg-surfaceHighlight'
                            }`}
                        title="List View"
                    >
                        <List size={20} />
                    </button>
                </div>
            </div>

            {/* Grid/List View */}
            <div className="flex-1 overflow-y-auto p-6 pt-0">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredProducts?.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => addItem(product)}
                                className="group bg-surface border border-border rounded-2xl p-3 shadow-lg hover:shadow-glow hover:border-primary/50 transition-all duration-300 flex flex-col text-left relative overflow-hidden"
                            >
                                {/* Image Area */}
                                <div className="aspect-square rounded-xl bg-surfaceHighlight mb-3 overflow-hidden relative">
                                    {product.image ? (
                                        <img
                                            src={pb.files.getUrl(product, product.image)}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                                            <Package size={32} strokeWidth={1.5} />
                                        </div>
                                    )}

                                    {/* Add Overlay */}
                                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="bg-surface text-primary font-bold px-3 py-1 rounded-full text-xs shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                            Add to Cart
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col">
                                    <h3 className="font-medium text-text-main line-clamp-2 mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                                    <p className="text-xs text-text-muted mb-2">{product.sku}</p>
                                    <div className="mt-auto flex items-center justify-between">
                                        <span className="font-heading font-bold text-lg text-text-main">${product.sale_price.toFixed(2)}</span>
                                        <span className="text-xs text-text-muted bg-surfaceHighlight px-2 py-1 rounded-md">
                                            Stock: {product.stock}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredProducts?.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => addItem(product)}
                                className="w-full group bg-surface border border-border rounded-xl p-3 hover:border-primary/50 hover:bg-surfaceHighlight/30 transition-all duration-200 flex items-center gap-4 text-left"
                            >
                                {/* Small Image */}
                                <div className="w-16 h-16 rounded-lg bg-surfaceHighlight overflow-hidden flex-shrink-0">
                                    {product.image ? (
                                        <img
                                            src={pb.files.getUrl(product, product.image)}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                                            <Package size={20} />
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-text-main truncate group-hover:text-primary transition-colors">{product.name}</h3>
                                    <p className="text-xs text-text-muted">{product.sku}</p>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-xs text-text-muted">Price</div>
                                        <div className="font-bold text-text-main">${product.sale_price.toFixed(2)}</div>
                                    </div>
                                    <div className="text-right w-16">
                                        <div className="text-xs text-text-muted">Stock</div>
                                        <div className={`font-medium ${product.stock < 10 ? 'text-danger' : 'text-text-main'}`}>
                                            {product.stock}
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="text-lg font-bold">+</div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
