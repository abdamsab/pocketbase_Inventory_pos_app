import type { CartItem } from '../stores/cartStore';
import { pbValidated } from '../lib/pocketbase';

export interface CartValidationResult {
  isValid: boolean;
  validItems: CartItem[];
  invalidItems: CartItem[];
  errors: string[];
  warnings: string[];
}

export interface CartRecoveryResult {
  recoveredCart: CartItem[];
  removedItems: CartItem[];
  messages: string[];
}

/**
 * Validates cart items against current product data
 * Checks for:
 * - Product existence
 * - Price changes
 * - Stock availability
 * - Data integrity
 */
export async function validateCartItems(items: CartItem[]): Promise<CartValidationResult> {
  const result: CartValidationResult = {
    isValid: true,
    validItems: [],
    invalidItems: [],
    errors: [],
    warnings: [],
  };

  if (!Array.isArray(items)) {
    result.isValid = false;
    result.errors.push('Cart data is not a valid array');
    return result;
  }

  // Process items in batches to avoid overwhelming the API
  const batchSize = 10;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(item => validateSingleCartItem(item))
    );

    batchResults.forEach((batchResult, batchIndex) => {
      const item = batch[batchIndex];

      if (batchResult.status === 'fulfilled') {
        const validation = batchResult.value;

        if (validation.isValid) {
          result.validItems.push(validation.item);
        } else {
          result.invalidItems.push(item);
          result.errors.push(...validation.errors);
          result.warnings.push(...validation.warnings);
          result.isValid = false;
        }
      } else {
        // API call failed
        result.invalidItems.push(item);
        result.errors.push(`Failed to validate item ${item.name}: ${batchResult.reason}`);
        result.isValid = false;
      }
    });
  }

  return result;
}

async function validateSingleCartItem(item: CartItem): Promise<{
  isValid: boolean;
  item: CartItem;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic structure validation
  if (!item.id || typeof item.id !== 'string') {
    errors.push(`Invalid item ID: ${item.id}`);
    return { isValid: false, item, errors, warnings };
  }

  if (!item.name || typeof item.name !== 'string') {
    errors.push(`Invalid item name for ${item.id}`);
    return { isValid: false, item, errors, warnings };
  }

  if (!item.quantity || item.quantity < 1 || !Number.isInteger(item.quantity)) {
    errors.push(`Invalid quantity for ${item.name}: ${item.quantity}`);
    return { isValid: false, item, errors, warnings };
  }

  if (typeof item.sale_price !== 'number' || item.sale_price < 0) {
    errors.push(`Invalid price for ${item.name}: ${item.sale_price}`);
    return { isValid: false, item, errors, warnings };
  }

  try {
    // Validate against current product data
    const currentProduct = await pbValidated.getProduct(item.id);

    // Check if product still exists and is active
    if (!currentProduct) {
      errors.push(`Product ${item.name} no longer exists`);
      return { isValid: false, item, errors, warnings };
    }

    // Check price changes
    if (Math.abs(currentProduct.sale_price - item.sale_price) > 0.01) {
      warnings.push(`Price changed for ${item.name}: was $${item.sale_price}, now $${currentProduct.sale_price}`);
      // Update the item with new price
      item.sale_price = currentProduct.sale_price;
    }

    // Check stock availability
    const availableStock = currentProduct.stock ?? 0;
    if (availableStock < item.quantity) {
      if (availableStock === 0) {
        errors.push(`${item.name} is out of stock`);
        return { isValid: false, item, errors, warnings };
      } else {
        warnings.push(`Reduced quantity for ${item.name} due to insufficient stock: requested ${item.quantity}, available ${availableStock}`);
        item.quantity = availableStock;
      }
    }

    // Check if product name changed
    if (currentProduct.name !== item.name) {
      warnings.push(`Product name updated: ${item.name} → ${currentProduct.name}`);
      item.name = currentProduct.name;
    }

  } catch (error) {
    errors.push(`Failed to validate ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, item, errors, warnings };
  }

  return { isValid: true, item, errors, warnings };
}

/**
 * Attempts to recover a corrupted cart by validating and cleaning items
 */
export async function recoverCart(cartData: unknown): Promise<CartRecoveryResult> {
  const result: CartRecoveryResult = {
    recoveredCart: [],
    removedItems: [],
    messages: [],
  };

  try {
    // Parse cart data if it's a string
    let items: CartItem[] = [];
    if (typeof cartData === 'string') {
      try {
        const parsed = JSON.parse(cartData);
        items = parsed?.state?.items || parsed?.items || [];
      } catch {
        items = [];
      }
    } else if (Array.isArray(cartData)) {
      items = cartData;
    } else if (typeof cartData === 'object' && cartData !== null) {
      // Handle zustand persist structure
      const data = cartData as Record<string, unknown>;
      items = (data.state as any)?.items || (data as any)?.items || [];
    }

    if (!Array.isArray(items)) {
      result.messages.push('Cart data is not in expected format, starting with empty cart');
      return result;
    }

    // Validate items
    const validation = await validateCartItems(items);

    result.recoveredCart = validation.validItems;
    result.removedItems = validation.invalidItems;

    // Collect messages
    validation.errors.forEach(error => result.messages.push(`Error: ${error}`));
    validation.warnings.forEach(warning => result.messages.push(`Warning: ${warning}`));

    if (result.recoveredCart.length > 0) {
      result.messages.push(`Recovered ${result.recoveredCart.length} valid items`);
    }

    if (result.removedItems.length > 0) {
      result.messages.push(`Removed ${result.removedItems.length} invalid items`);
    }

  } catch (error) {
    result.messages.push(`Cart recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.recoveredCart = [];
    result.removedItems = [];
  }

  return result;
}

/**
 * Safely loads cart from localStorage with validation and recovery
 */
export async function loadCartFromStorage(): Promise<{
  items: CartItem[];
  messages: string[];
}> {
  try {
    const stored = localStorage.getItem('pos-cart');
    if (!stored) {
      return { items: [], messages: [] };
    }

    const recovery = await recoverCart(stored);

    // Log recovery messages for debugging
    if (recovery.messages.length > 0) {
      console.log('Cart recovery messages:', recovery.messages);
    }

    return {
      items: recovery.recoveredCart,
      messages: recovery.messages,
    };

  } catch (error) {
    console.error('Failed to load cart from storage:', error);
    return {
      items: [],
      messages: ['Failed to load cart from storage, starting with empty cart'],
    };
  }
}