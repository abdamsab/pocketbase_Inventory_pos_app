import { z } from 'zod';

// Base PocketBase record schema with flexible datetime validation
const BaseRecordSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  collectionName: z.string(),
  created: z.string().optional(), // Make fully optional to handle invalid datetime data
  updated: z.string().optional(), // Make fully optional to handle invalid datetime data
});

// User/Auth schemas - only authentication data
export const UserRecordSchema = BaseRecordSchema.extend({
  email: z.string().email(),
  emailVisibility: z.boolean(),
  name: z.string().min(1),
  avatar: z.string().optional(),
  role: z.enum(["admin", "manager", "cashier"]),
  locations: z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return val ? [val] : [];
    return [];
  }, z.array(z.string())).default([]),
  superuser: z.boolean().default(false),
});

export const AuthResponseSchema = z.object({
  record: UserRecordSchema,
  token: z.string(),
  meta: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatar: z.string().optional(),
  }).optional(),
});

// Product schemas
export const CategorySchema = BaseRecordSchema.extend({
  name: z.string().min(1),
});

export const ProductSchema = BaseRecordSchema.extend({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  category: z.string().optional(), // relation ID
  cost_price: z.number().min(0),
  sale_price: z.number().min(0),
  stock: z.number().optional(), // Deprecated: use inventory collection
  reorder_point: z.number().optional(), // Deprecated: use inventory collection
  image: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Sales schemas
export const SaleItemSchema = BaseRecordSchema.extend({
  sale: z.string(), // relation ID
  product: z.string(), // relation ID
  quantity: z.number().min(1),
  unit_price: z.number().min(0),
  total: z.number().min(0),
  location: z.string(), // relation ID
  user: z.string(), // relation ID
});

export const SaleSchema = BaseRecordSchema.extend({
  sale_number: z.string().min(1),
  user: z.string(), // relation ID
  location: z.string(), // relation ID (Required now)
  customer: z.string().optional(), // relation ID
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  total: z.number().min(0),
  payment_method: z.enum(["cash", "card", "mobile", "bank_transfer"]),
  status: z.enum(["completed", "refunded", "cancelled"]),
  notes: z.string().optional(),
}).passthrough(); // Allow additional fields like created/updated during creation

// Supplier schemas
export const SupplierSchema = BaseRecordSchema.extend({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  contact_person: z.string().optional(),
  address: z.string().optional(),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().default(true),
});

// Customer schemas
export const CustomerSchema = BaseRecordSchema.extend({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  total_spent: z.number().min(0).default(0),
  last_visit: z.string().optional(), // Datetime string
});

// Purchase Order schemas
export const PurchaseOrderItemSchema = BaseRecordSchema.extend({
  purchase_order: z.string(), // relation ID
  product: z.string(), // relation ID
  quantity_ordered: z.number().min(1),
  quantity_received: z.number().min(0).default(0),
  unit_cost: z.number().min(0),
  total: z.number().min(0),
});

export const PurchaseOrderSchema = BaseRecordSchema.extend({
  po_number: z.string().min(1),
  supplier: z.string(), // relation ID
  location: z.string(), // relation ID
  order_date: z.string().datetime(),
  expected_date: z.string().datetime().optional(),
  status: z.enum(["draft", "sent", "partial", "received", "cancelled"]),
  total: z.number().min(0),
  notes: z.string().optional(),
  created_by: z.string(), // relation ID
});

// Inventory schemas
export const InventoryEntrySchema = BaseRecordSchema.extend({
  product: z.string(), // relation ID
  location: z.string(), // relation ID
  user: z.string(), // relation ID
  type: z.enum(["purchase", "sale", "adjustment", "transfer", "transfer_in", "transfer_out"]),
  quantity: z.number(),
  reference_id: z.string().optional(),
  notes: z.string().optional(),
});

export const InventorySchema = BaseRecordSchema.extend({
  product: z.string(),
  location: z.string(),
  quantity: z.number(),
  reorder_point: z.number().min(0).default(10),
});

// Location schemas
export const LocationSchema = BaseRecordSchema.extend({
  name: z.string().min(1),
  address: z.string().optional(),
  code: z.string().min(1),
  type: z.enum(["store", "warehouse"]).default("store"),
  timezone: z.string().default("Africa/Lagos"),
  tax_rate: z.number().min(0).default(0),
});

// Settings schemas
export const SettingsRecordSchema = BaseRecordSchema.extend({
  key: z.string().min(1),
  value: z.any(), // JSON field
  description: z.string().optional(),
});

// Receipt schemas
export const ReceiptSchema = BaseRecordSchema.extend({
  sale: z.string(), // relation ID
  receipt_number: z.string().min(1),
  receipt_data: z.any(), // JSON field for receipt content
});

// Stock Adjustment schemas
export const StockAdjustmentSchema = BaseRecordSchema.extend({
  product: z.string(), // relation ID
  adjustment_type: z.enum(["add", "remove", "set"]),
  quantity: z.number(),
  reason: z.string().min(1),
  adjusted_by: z.string(), // relation ID
  notes: z.string().optional(),
});

// List response schemas for pagination
export const ListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
  page: z.number(),
  perPage: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
  items: z.array(itemSchema),
});

// Error response schemas
export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.any().optional(),
});

// Batch request schemas
export const BatchRequestSchema = z.object({
  method: z.string(),
  url: z.string(),
  body: z.any().optional(),
  headers: z.record(z.string()).optional(),
});

export const BatchResponseSchema = z.object({
  status: z.number(),
  headers: z.record(z.array(z.string())),
  body: z.any(),
});

// File upload schemas
export const FileUploadResponseSchema = z.object({
  name: z.string(),
  size: z.number(),
  url: z.string(),
});

// Export all schemas for easy access
export const ValidationSchemas = {
  BaseRecord: BaseRecordSchema,
  User: UserRecordSchema,
  AuthResponse: AuthResponseSchema,
  Category: CategorySchema,
  Product: ProductSchema,
  SaleItem: SaleItemSchema,
  Sale: SaleSchema,
  Supplier: SupplierSchema,
  PurchaseOrderItem: PurchaseOrderItemSchema,
  PurchaseOrder: PurchaseOrderSchema,
  InventoryEntry: InventoryEntrySchema,
  Location: LocationSchema,
  Settings: SettingsRecordSchema,
  Receipt: ReceiptSchema,
  StockAdjustment: StockAdjustmentSchema,
  ErrorResponse: ErrorResponseSchema,
  BatchRequest: BatchRequestSchema,
  BatchResponse: BatchResponseSchema,
  FileUploadResponse: FileUploadResponseSchema,
  Inventory: InventorySchema,
  Customer: CustomerSchema,
} as const;