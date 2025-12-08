import type { RecordModel } from 'pocketbase';

export interface User extends RecordModel {
    name: string;
    avatar: string;
    role: 'admin' | 'manager' | 'cashier';
    location: string; // Relation ID
}

export interface Location extends RecordModel {
    name: string;
    address: string;
    code: string;
    tax_rate: number;
}

export interface Product extends RecordModel {
    name: string;
    sku: string;
    barcode: string;
    category: string; // Relation ID
    cost_price: number;
    sale_price: number;
    stock: number;
    reorder_point: number;
    image: string;
}

export interface Sale extends RecordModel {
    sale_number: string;
    user: string; // Relation ID
    location: string; // Relation ID
    total: number;
    payment_method: 'cash' | 'card';
    status: 'completed' | 'voided';
}

export interface SaleItem extends RecordModel {
    sale: string; // Relation ID
    product: string; // Relation ID
    quantity: number;
    unit_price: number;
    line_total: number;
}

export interface InventoryEntry extends RecordModel {
    product: string; // Relation ID
    location: string; // Relation ID
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    reason: string;
}

export interface Category extends RecordModel {
    name: string;
}

export interface Supplier extends RecordModel {
    name: string;
    email: string;
    phone: string;
    contact_person: string;
    address: string;
    payment_terms: string;
    notes: string;
    active: boolean;
}

export interface PurchaseOrder extends RecordModel {
    po_number: string;
    supplier: string; // Relation ID
    order_date: string;
    expected_date: string;
    received_date: string;
    status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
    total: number;
    notes: string;
    created_by: string; // Relation ID
}

export interface PurchaseOrderItem extends RecordModel {
    purchase_order: string; // Relation ID
    product: string; // Relation ID
    quantity_ordered: number;
    quantity_received: number;
    unit_cost: number;
    total: number;
}

export interface StockAdjustment extends RecordModel {
    product: string; // Relation ID
    adjustment_type: 'increase' | 'decrease';
    quantity: number;
    reason: 'damage' | 'loss' | 'found' | 'correction' | 'return' | 'other';
    notes: string;
    adjusted_by: string; // Relation ID
    previous_stock: number;
    new_stock: number;
}
