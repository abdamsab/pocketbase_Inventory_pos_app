import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer } from 'lucide-react';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

interface BarcodeModalProps {
    product: any;
    onClose: () => void;
}

export function BarcodeModal({ product, onClose }: BarcodeModalProps) {
    const printRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
    });

    if (!product) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="font-bold text-gray-900">Product Labels</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center gap-8" ref={printRef}>
                    {/* Barcode */}
                    <div className="text-center space-y-2">
                        <p className="text-sm font-medium text-gray-500">SKU Barcode</p>
                        <div className="border border-gray-200 p-4 rounded-xl inline-block bg-white">
                            <Barcode value={product.sku} width={2} height={60} fontSize={14} />
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="text-center space-y-2">
                        <p className="text-sm font-medium text-gray-500">Product QR Code</p>
                        <div className="border border-gray-200 p-4 rounded-xl inline-block bg-white">
                            <QRCodeSVG value={product.id} size={128} />
                        </div>
                    </div>

                    <div className="text-center">
                        <h4 className="font-bold text-lg text-gray-900">{product.name}</h4>
                        <p className="text-gray-500">${product.sale_price.toFixed(2)}</p>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button
                        onClick={() => handlePrint()}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Printer size={20} />
                        Print Labels
                    </button>
                </div>
            </div>
        </div>
    );
}
