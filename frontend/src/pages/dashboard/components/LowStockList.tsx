import { AlertTriangle, MapPin } from 'lucide-react';
import { pb } from '../../../lib/pocketbase';

interface LowStockItem {
    id: string;
    product: string;
    quantity: number;
    reorder_point: number;
    location: string;
    expand?: {
        product?: {
            name: string;
            sku: string;
            image?: string;
        };
        location?: {
            name: string;
        };
    };
}

interface LowStockListProps {
    items: LowStockItem[];
}

export function LowStockList({ items }: LowStockListProps) {
    if (!items || items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-surfaceHighlight/30 rounded-lg border border-dashed border-border">
                <div className="p-3 bg-green-100 text-green-600 rounded-full mb-3">
                    <AlertTriangle size={24} className="opacity-50" />
                </div>
                <p className="text-text-main font-medium">Stock Levels Healthy</p>
                <p className="text-sm text-text-muted mt-1">No items are below reorder point.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 bg-surfaceHighlight/50 border border-border/50 rounded-lg hover:bg-surfaceHighlight transition-colors group">
                    {/* Image */}
                    <div className="w-12 h-12 rounded-md bg-white border border-border flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {item.expand?.product?.image ? (
                            <img
                                src={pb.files.getUrl(item.expand.product, item.expand.product.image)}
                                alt={item.expand.product.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <AlertTriangle size={20} className="text-orange-400" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <h4 className="font-medium text-text-main truncate pr-2" title={item.expand?.product?.name}>
                                {item.expand?.product?.name || 'Unknown Product'}
                            </h4>
                            <span className="text-xs font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                {item.quantity} / {item.reorder_point || 10}
                            </span>
                        </div>

                        <div className="flex justify-between items-end mt-1">
                            <p className="text-xs text-text-muted font-mono truncate">
                                {item.expand?.product?.sku}
                            </p>

                            {item.expand?.location && (
                                <div className="flex items-center gap-1 text-[10px] text-text-muted uppercase tracking-wide bg-background px-1.5 py-0.5 rounded border border-border">
                                    <MapPin size={10} />
                                    {item.expand.location.name}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
