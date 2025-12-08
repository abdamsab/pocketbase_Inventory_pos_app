import { useProducts } from '../../hooks/useProducts';
import { useCartStore } from '../../stores/cartStore';
import { pb } from '../../lib/pocketbase';
import { Search, Package } from 'lucide-react';
import { useState } from 'react';

export function ProductGrid() {
    const { data: products, isLoading } = useProducts();
    const addItem = useCartStore((state) => state.addItem);
    const [search, setSearch] = useState('');

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
            {/* Search Bar */}
            <div className="p-6 pb-4">
                <div className="relative group">
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
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6 pt-0">
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
            </div>
        </div>
    );
}
