import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { pb } from '../../lib/pocketbase';
import { ArrowLeft, Printer } from 'lucide-react';
import { useRef } from 'react';
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
        sales_items_via_sale?: any[];
    };
}

export function ReceiptView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const componentRef = useRef<HTMLDivElement>(null);

    const { data: sale, isLoading } = useQuery({
        queryKey: ['sale', id],
        queryFn: async () => {
            // Fetch sale with expanded items and user
            const record = await pb.collection('sales').getOne<Sale>(id!, {
                expand: 'user,sales_items_via_sale.product',
                fields: '*', // Include all fields including timestamps
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

    const handlePrint = () => {

        // Create a print-optimized version in a new window
        const printContent = componentRef.current?.innerHTML;

        if (printContent) {
            console.log('Opening print window...');
            const printWindow = window.open('', '_blank', 'width=400,height=600');
            console.log('Print window:', printWindow);

            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <title>Receipt - ${sale?.sale_number || 'N/A'}</title>
                            <style>
                                @page {
                                    size: 80mm auto;
                                    margin: 0;
                                }
                                body {
                                    font-family: 'Courier New', monospace;
                                    margin: 0;
                                    padding: 5mm;
                                    background: white;
                                    color: black;
                                    width: 80mm;
                                    box-sizing: border-box;
                                }
                                .receipt {
                                    width: 70mm; /* Content width to fit within 80mm page */
                                    font-size: 10px;
                                    line-height: 1.2;
                                    margin: 0;
                                }
                                .receipt * {
                                    box-sizing: border-box;
                                }
                                table {
                                    width: 100%;
                                    border-collapse: collapse;
                                    margin: 3mm 0;
                                    font-size: 9px;
                                }
                                th, td {
                                    padding: 2mm;
                                    text-align: left;
                                }
                                th {
                                    border-bottom: 1px solid #000;
                                    font-weight: bold;
                                    font-size: 9px;
                                }
                                .text-center {
                                    text-align: center;
                                }
                                .text-right {
                                    text-align: right;
                                }
                                .font-bold {
                                    font-weight: bold;
                                }
                                .border-t {
                                    border-top: 1px solid #000;
                                }
                                .mt-4 {
                                    margin-top: 4mm;
                                }
                                .mb-6 {
                                    margin-bottom: 6mm;
                                }
                                .pb-6 {
                                    padding-bottom: 6mm;
                                }
                                .pt-6 {
                                    padding-top: 6mm;
                                }
                                h1 {
                                    font-size: 14px;
                                    margin: 3mm 0;
                                }
                                p {
                                    margin: 2mm 0;
                                }
                                @media print {
                                    body {
                                        margin: 0;
                                        -webkit-print-color-adjust: exact;
                                        color-adjust: exact;
                                    }
                                    .receipt {
                                        width: 70mm;
                                    }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="receipt">
                                ${printContent}
                            </div>
                            <script>
                                window.onload = function() {
                                    window.print();
                                    setTimeout(function() {
                                        window.close();
                                    }, 100);
                                };
                            </script>
                        </body>
                    </html>
                `);
                printWindow.document.close();
            }
        }
    };

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
                                    <td className="py-3 text-right font-medium text-slate-900">${item.total.toFixed(2)}</td>
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
