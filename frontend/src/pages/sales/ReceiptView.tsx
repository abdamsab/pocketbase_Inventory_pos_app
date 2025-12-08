import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { pb } from '../../lib/pocketbase';
import { ArrowLeft, Printer } from 'lucide-react';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import type { RecordModel } from 'pocketbase';

interface Sale extends RecordModel {
    sale_number: string;
    total: number;
    payment_method: string;
    created: string;
    updated: string;
    items?: any[];
    expand?: {
        user?: { name: string };
        'sales_items(sale)'?: any[];
    };
}

export function ReceiptView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const componentRef = useRef(null);

    const { data: sale, isLoading } = useQuery({
        queryKey: ['sale', id],
        queryFn: async () => {
            // Fetch sale with expanded items and user
            const record = await pb.collection('sales').getOne<Sale>(id!, {
                expand: 'user,sales_items(sale).product',
            });

            // Manually fetch items if expand doesn't work as expected (PocketBase limitation on deep expand sometimes)
            // But for now let's assume we can get items via a separate query if needed.
            // Actually, standard way is to query sales_items filtering by sale id
            const items = await pb.collection('sales_items').getFullList({
                filter: `sale="${id}"`,
                expand: 'product',
            });

            return { ...record, items };
        },
    });

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    });

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 text-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
        </div>
    );

    if (!sale) return <div>Sale not found</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Sales
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={() => handlePrint()}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Printer size={20} />
                        Print Receipt
                    </button>
                </div>
            </div>

            <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-lg" ref={componentRef}>
                <div className="text-center border-b border-slate-200 pb-6 mb-6">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">NexusPOS</h1>
                    <p className="text-slate-500">123 Store Street, City, Country</p>
                    <p className="text-slate-500">Tel: +1 234 567 890</p>
                </div>

                <div className="flex justify-between mb-8 text-sm">
                    <div>
                        <p className="text-slate-500">Receipt No:</p>
                        <p className="font-bold">{sale.sale_number}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-500">Date:</p>
                        <p className="font-bold">{new Date(sale.created).toLocaleDateString()}</p>
                        <p className="text-slate-500 mt-1">Time:</p>
                        <p className="font-bold">{new Date(sale.created).toLocaleTimeString()}</p>
                    </div>
                </div>

                <div className="mb-8">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200">
                            <tr>
                                <th className="py-2 font-bold text-slate-700">Item</th>
                                <th className="py-2 font-bold text-slate-700 text-center">Qty</th>
                                <th className="py-2 font-bold text-slate-700 text-right">Price</th>
                                <th className="py-2 font-bold text-slate-700 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sale.items?.map((item: any) => (
                                <tr key={item.id}>
                                    <td className="py-3 text-slate-900">{item.expand?.product?.name || 'Unknown Product'}</td>
                                    <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                                    <td className="py-3 text-right text-slate-600">${item.unit_price.toFixed(2)}</td>
                                    <td className="py-3 text-right font-medium text-slate-900">${item.line_total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-slate-200 pt-6 space-y-2">
                    <div className="flex justify-between text-slate-600">
                        <span>Subtotal</span>
                        <span>${sale.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>Tax (0%)</span>
                        <span>$0.00</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-slate-900 pt-4 border-t border-slate-200 mt-4">
                        <span>Total</span>
                        <span>${sale.total.toFixed(2)}</span>
                    </div>
                </div>

                <div className="mt-8 text-center text-sm text-slate-500">
                    <p>Payment Method: <span className="capitalize font-medium text-slate-700">{sale.payment_method}</span></p>
                    <p className="mt-4">Thank you for your business!</p>
                </div>
            </div>
        </div>
    );
}
