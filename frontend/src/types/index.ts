import type { RecordModel } from 'pocketbase';
import type { z } from 'zod';
import { ValidationSchemas } from './validationSchemas';

// Derive TypeScript types from Zod validation schemas for type synchronization
// This ensures frontend types stay in sync with validation schemas and backend structure

export type User = z.infer<typeof ValidationSchemas.User> & RecordModel;
export type AuthResponse = z.infer<typeof ValidationSchemas.AuthResponse>;
export type Location = z.infer<typeof ValidationSchemas.Location> & RecordModel;
export type Product = z.infer<typeof ValidationSchemas.Product> & RecordModel;
export type Sale = z.infer<typeof ValidationSchemas.Sale> & RecordModel;
export type SaleItem = z.infer<typeof ValidationSchemas.SaleItem> & RecordModel;
export type InventoryEntry = z.infer<typeof ValidationSchemas.InventoryEntry> & RecordModel;
export type Category = z.infer<typeof ValidationSchemas.Category> & RecordModel;
export type Supplier = z.infer<typeof ValidationSchemas.Supplier> & RecordModel;
export type PurchaseOrder = z.infer<typeof ValidationSchemas.PurchaseOrder> & RecordModel;
export type PurchaseOrderItem = z.infer<typeof ValidationSchemas.PurchaseOrderItem> & RecordModel;
export type StockAdjustment = z.infer<typeof ValidationSchemas.StockAdjustment> & RecordModel;
export type Settings = z.infer<typeof ValidationSchemas.Settings> & RecordModel;
export type Receipt = z.infer<typeof ValidationSchemas.Receipt> & RecordModel;
export type Customer = z.infer<typeof ValidationSchemas.Customer> & RecordModel;
export type Inventory = z.infer<typeof ValidationSchemas.Inventory> & RecordModel;

// List response types for pagination
export type ListResponse<T> = {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
};

// Error response types
export type ErrorResponse = z.infer<typeof ValidationSchemas.ErrorResponse>;

// Batch operation types
export type BatchRequest = z.infer<typeof ValidationSchemas.BatchRequest>;
export type BatchResponse = z.infer<typeof ValidationSchemas.BatchResponse>;

// File upload types
export type FileUploadResponse = z.infer<typeof ValidationSchemas.FileUploadResponse>;

// Re-export validation schemas for runtime validation
export { ValidationSchemas };

// Type guards for runtime type checking
export const isUser = (data: unknown): data is User => ValidationSchemas.User.safeParse(data).success;
export const isProduct = (data: unknown): data is Product => ValidationSchemas.Product.safeParse(data).success;
export const isSale = (data: unknown): data is Sale => ValidationSchemas.Sale.safeParse(data).success;
export const isPurchaseOrder = (data: unknown): data is PurchaseOrder => ValidationSchemas.PurchaseOrder.safeParse(data).success;
export const isSupplier = (data: unknown): data is Supplier => ValidationSchemas.Supplier.safeParse(data).success;
