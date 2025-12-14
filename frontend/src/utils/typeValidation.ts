import { z } from 'zod';

// Generic validation function for API responses
export function validateResponse<T>(data: any, schema: z.ZodSchema<T>): T {
  try {
    const result = schema.safeParse(data);
    if (!result.success) {
      console.error('Type validation failed:', result.error);
      // Log detailed error information for debugging
      console.error('Validation errors:', result.error.errors);
      console.error('Received data:', data);

      throw new Error(`Invalid API response structure: ${result.error.message}`);
    }
    return result.data;
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error instanceof Error && error.message.includes('Invalid API response structure')) {
      throw error;
    }

    // Otherwise, wrap the error
    throw new Error(`Type validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Common validation schemas for PocketBase collections
export const ProductSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  collectionName: z.string(),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  cost_price: z.number().min(0, "Cost price must be non-negative"),
  sale_price: z.number().min(0, "Sale price must be non-negative"),
  stock: z.number().min(0, "Stock must be non-negative").default(0),
  reorder_point: z.number().min(0).optional(),
  category: z.string().optional(),
  image: z.string().optional(),
  barcode: z.string().optional(),
});

export const SaleSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  collectionName: z.string(),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  sale_number: z.string().min(1, "Sale number is required"),
  user: z.string(),
  location: z.string().optional(),
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  total: z.number().min(0),
  payment_method: z.enum(["cash", "card", "mobile"]),
  status: z.enum(["completed", "refunded", "cancelled"]),
  notes: z.string().optional(),
});

export const UserSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  collectionName: z.string(),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "manager", "cashier"]),
});

// Validation helper for arrays
export function validateResponseArray<T>(data: any, schema: z.ZodSchema<T>): T[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected array response but received non-array data');
  }

  return data.map((item, index) => {
    try {
      return validateResponse(item, schema);
    } catch (error) {
      console.error(`Validation failed for array item at index ${index}:`, item);
      throw error;
    }
  });
}

// Type-safe API response wrapper
export interface ValidatedApiResponse<T> {
  data: T;
  isValid: true;
}

// Error type for invalid responses
export interface InvalidApiResponse {
  error: string;
  isValid: false;
  originalData?: any;
}

export type ApiResponse<T> = ValidatedApiResponse<T> | InvalidApiResponse;

// Safe API response validator that returns typed results
export function safeValidateResponse<T>(
  data: any,
  schema: z.ZodSchema<T>
): ApiResponse<T> {
  try {
    const validatedData = validateResponse(data, schema);
    return {
      data: validatedData,
      isValid: true,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown validation error',
      isValid: false,
      originalData: data,
    };
  }
}