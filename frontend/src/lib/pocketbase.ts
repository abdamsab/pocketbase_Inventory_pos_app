import PocketBase from 'pocketbase';
import { validateResponse, validateResponseArray, safeValidateResponse } from '../utils/typeValidation';
import { ValidationSchemas } from '../types/validationSchemas';

export const pb = new PocketBase('http://127.0.0.1:8090');

// Type definitions for PocketBase options
interface PocketBaseOptions {
  sort?: string;
  filter?: string;
  expand?: string;
  fields?: string;
}

interface ProductCreateData {
  name: string;
  sku: string;
  cost_price: number;
  sale_price: number;
  stock?: number;
  reorder_point?: number;
  category?: string;
  image?: File | string;
  barcode?: string;
}

interface SaleCreateData {
  sale_number: string;
  user: string;
  location?: string;
  customer?: string; // Add customer relation
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  payment_method: 'cash' | 'card' | 'mobile' | 'bank_transfer';
  status?: 'completed' | 'refunded' | 'cancelled';
  notes?: string;
  created?: string;
  updated?: string;
}

interface PurchaseOrderCreateData {
  po_number: string;
  supplier: string;
  order_date: string;
  expected_date?: string;
  status?: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
  total: number;
  notes?: string;
  created_by: string;
}

// Export types for use in other modules
export type { ProductCreateData, SaleCreateData, PurchaseOrderCreateData, PocketBaseOptions };

// Enhanced PocketBase client with type validation
export class ValidatedPocketBase {
  private pb: PocketBase;

  constructor(pb: PocketBase) {
    this.pb = pb;
  }

  // Auth methods with validation
  async authWithPassword(email: string, password: string) {
    const result = await this.pb.collection('users').authWithPassword(email, password);
    return validateResponse(result, ValidationSchemas.AuthResponse);
  }

  // Collection methods with validation
  async getProducts(options?: PocketBaseOptions) {
    const records = await this.pb.collection('products').getFullList(options);
    return validateResponseArray(records, ValidationSchemas.Product);
  }

  async getProduct(id: string) {
    const record = await this.pb.collection('products').getOne(id);
    return validateResponse(record, ValidationSchemas.Product);
  }

  async createProduct(data: ProductCreateData) {
    const record = await this.pb.collection('products').create(data);
    return validateResponse(record, ValidationSchemas.Product);
  }

  async updateProduct(id: string, data: Partial<ProductCreateData>) {
    const record = await this.pb.collection('products').update(id, data);
    return validateResponse(record, ValidationSchemas.Product);
  }

  async deleteProduct(id: string) {
    return await this.pb.collection('products').delete(id);
  }

  async getSales(options?: PocketBaseOptions) {
    const records = await this.pb.collection('sales').getFullList(options);
    return validateResponseArray(records, ValidationSchemas.Sale);
  }

  async getSale(id: string) {
    const record = await this.pb.collection('sales').getOne(id);
    return validateResponse(record, ValidationSchemas.Sale);
  }

  async createSale(data: SaleCreateData) {
    const record = await this.pb.collection('sales').create(data);
    return validateResponse(record, ValidationSchemas.Sale);
  }

  async getSuppliers(options?: PocketBaseOptions) {
    const records = await this.pb.collection('suppliers').getFullList(options);
    return validateResponseArray(records, ValidationSchemas.Supplier);
  }

  async getPurchaseOrders(options?: PocketBaseOptions) {
    const records = await this.pb.collection('purchase_orders').getFullList(options);
    return validateResponseArray(records, ValidationSchemas.PurchaseOrder);
  }

  async createPurchaseOrder(data: PurchaseOrderCreateData) {
    const record = await this.pb.collection('purchase_orders').create(data);
    return validateResponse(record, ValidationSchemas.PurchaseOrder);
  }

  // Paginated methods with validation
  async getProductsPaginated(page = 1, perPage = 50, options?: PocketBaseOptions) {
    const result = await this.pb.collection('products').getList(page, perPage, options);
    const validatedItems = validateResponseArray(result.items, ValidationSchemas.Product);
    return {
      ...result,
      items: validatedItems,
    };
  }

  async getSalesPaginated(page = 1, perPage = 50, options?: PocketBaseOptions) {
    const result = await this.pb.collection('sales').getList(page, perPage, options);
    const validatedItems = validateResponseArray(result.items, ValidationSchemas.Sale);
    return {
      ...result,
      items: validatedItems,
    };
  }

  // Safe validation methods (won't throw, returns validation result)
  safeValidateProduct(data: unknown) {
    return safeValidateResponse(data, ValidationSchemas.Product);
  }

  safeValidateSale(data: unknown) {
    return safeValidateResponse(data, ValidationSchemas.Sale);
  }

  // Access to raw PocketBase instance for advanced operations
  get raw() {
    return this.pb;
  }
}

// Create validated instance
export const pbValidated = new ValidatedPocketBase(pb);
