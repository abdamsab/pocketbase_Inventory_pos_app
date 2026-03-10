import { useState } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { ChevronDown, ChevronRight, AlertTriangle, Package, Search } from 'lucide-react';
import { pb } from '../../lib/pocketbase';

export function InventoryList() {
  const { data: inventory, isLoading, error } = useInventory();
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const toggleExpanded = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const filteredInventory = inventory?.filter(item =>
    item.product.name.toLowerCase().includes(search.toLowerCase()) ||
    item.product.sku.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-danger text-lg font-semibold mb-2">Error loading inventory</div>
          <div className="text-text-muted">{error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-main">Inventory</h2>
          <p className="text-text-muted">Stock levels across all locations</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-lg overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surfaceHighlight/30 text-xs uppercase text-text-muted font-medium">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Total Stock</th>
                <th className="px-6 py-4">Locations</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInventory?.map((item) => (
                <tr key={item.product.id} className="hover:bg-surfaceHighlight transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-surfaceHighlight flex items-center justify-center overflow-hidden">
                        {item.product.image ? (
                          <img src={pb.files.getUrl(item.product, item.product.image)} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} className="text-text-muted" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-text-main">{item.product.name}</h4>
                        <p className="text-xs text-text-muted">SKU: {item.product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-text-main">{item.totalStock} units</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleExpanded(item.product.id)}
                      className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                    >
                      {expandedProducts.has(item.product.id) ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                      <span className="text-sm">{item.locations.length} location{item.locations.length !== 1 ? 's' : ''}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    {item.lowStockLocations.length > 0 ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-danger/10 text-danger border border-danger/20">
                        <AlertTriangle size={12} />
                        Low stock ({item.lowStockLocations.length})
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20">
                        In stock
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {/* Expanded location details */}
              {filteredInventory?.map((item) =>
                expandedProducts.has(item.product.id) && (
                  <tr key={`${item.product.id}-details`} className="bg-surfaceHighlight/20">
                    <td colSpan={4} className="px-6 py-4">
                      <div className="space-y-3">
                        <h5 className="font-medium text-text-main text-sm">Stock by Location:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {item.locations.map((locData) => (
                            <div key={locData.inventoryId} className="bg-surface border border-border rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <h6 className="font-medium text-text-main text-sm">{locData.location.name}</h6>
                                {locData.quantity <= locData.reorder_point && (
                                  <AlertTriangle size={14} className="text-danger" />
                                )}
                              </div>
                              <div className="space-y-1 text-xs text-text-muted">
                                <div>Stock: <span className="font-medium text-text-main">{locData.quantity} units</span></div>
                                <div>Reorder Point: {locData.reorder_point} units</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {filteredInventory.length === 0 && (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-text-muted mb-4" />
            <h3 className="text-lg font-medium text-text-main mb-2">No inventory found</h3>
            <p className="text-text-muted">
              {search ? 'No products match your search.' : 'No inventory data available.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}