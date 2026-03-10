import { useQuery } from '@tanstack/react-query';
import { pb } from '../../lib/pocketbase';
import { Calendar, User, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function SalesHistory() {
    const { activeLocation } = useAuthStore();

    const { data: sales, isLoading } = useQuery({
        queryKey: ['sales', activeLocation?.id],
        queryFn: async () => {
            if (!activeLocation) return [];

            const result = await pb.collection('sales').getList(1, 100, {
                sort: '-created', // Sort by created date (most recent first)
                filter: `location="${activeLocation.id}"`,
                expand: 'user',
                fields: '*', // Request all fields including system fields
            });
            return result.items;
        },
        enabled: !!activeLocation
    });

    // Sales history displays properly with created/updated fields added to schema

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 text-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-text-main">Sales History</h2>
                    <p className="text-text-muted">View and manage past transactions</p>
                </div>
            </div>

            <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-surfaceHighlight/50 text-xs uppercase text-text-muted font-medium">
                            <tr>
                                <th className="px-6 py-4">Sale ID</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Cashier</th>
                                <th className="px-6 py-4">Payment</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sales?.map((sale) => (
                                <tr key={sale.id} className="hover:bg-surfaceHighlight/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-text-main">
                                        {sale.sale_number}
                                    </td>
                                    <td className="px-6 py-4 text-text-muted">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} />
                                            {sale.created ?
                                                `${new Date(sale.created).toLocaleDateString()} ${new Date(sale.created).toLocaleTimeString()}` :
                                                'Date not available'
                                            }
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-text-main">
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-text-muted" />
                                            {sale.expand?.user?.name || sale.expand?.user?.email || 'Unknown'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${sale.payment_method === 'cash'
                                            ? 'bg-secondary/10 text-secondary'
                                            : 'bg-primary/10 text-primary'
                                            }`}>
                                            {sale.payment_method}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-text-main">
                                        ${sale.total.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            to={`/sales/${sale.id}`}
                                            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primaryHover transition-colors"
                                        >
                                            <FileText size={16} />
                                            View Receipt
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
