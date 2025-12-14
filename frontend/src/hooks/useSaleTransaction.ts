import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pbValidated, pb } from '../lib/pocketbase';
import { useCartStore } from '../stores/cartStore';
import type { SaleCreateData } from '../lib/pocketbase';

// Transaction queue for failed operations
interface FailedTransaction {
  id: string;
  data: SaleCreateData;
  timestamp: number;
  retryCount: number;
  error?: string;
  expiresAt: number; // Add expiration timestamp
}

class TransactionQueue {
  private queue: FailedTransaction[] = [];
  private readonly MAX_RETRIES = 3;
  private readonly EXPIRATION_HOURS = 24; // Expire failed transactions after 24 hours

  add(transaction: Omit<FailedTransaction, 'id' | 'timestamp' | 'retryCount' | 'expiresAt'>) {
    const now = Date.now();
    const failedTx: FailedTransaction = {
      ...transaction,
      id: `failed_${now}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now,
      retryCount: 0,
      expiresAt: now + (this.EXPIRATION_HOURS * 60 * 60 * 1000), // Expire after 24 hours
    };

    this.queue.push(failedTx);
    this.saveToStorage();

    console.warn('Transaction queued for retry:', failedTx);
  }

  async retryFailedTransactions(): Promise<void> {
    // First, clean up expired transactions
    this.cleanupExpiredTransactions();

    // Filter for non-expired transactions that haven't exceeded max retries
    const pendingTransactions = this.queue.filter(tx =>
      tx.retryCount < this.MAX_RETRIES &&
      tx.expiresAt > Date.now()
    );

    for (const transaction of pendingTransactions) {
      try {
        // Check if a sale with this sale_number already exists to prevent duplicates
        if (transaction.data.sale_number) {
          try {
            const existingSales = await pb.collection('sales').getList(1, 1, {
              filter: `sale_number="${transaction.data.sale_number}"`,
            });

            if (existingSales.items.length > 0) {
              console.log(`Sale ${transaction.data.sale_number} already exists, removing from retry queue`);
              this.remove(transaction.id);
              continue;
            }
          } catch (checkError) {
            console.warn('Could not check for existing sale, proceeding with retry:', checkError);
          }
        }

        // Attempt to retry the transaction
        const result = await pbValidated.createSale(transaction.data);

        // If successful, remove from queue
        this.remove(transaction.id);
        console.log('Successfully retried transaction:', transaction.id);

        // Trigger any success callbacks (could emit events here)
        this.emitTransactionSuccess(transaction, result);

      } catch (error) {
        transaction.retryCount++;
        transaction.error = error instanceof Error ? error.message : 'Unknown error';

        if (transaction.retryCount >= this.MAX_RETRIES) {
          console.error('Transaction failed permanently:', transaction);
          // Could emit failure event or notify user
          this.emitTransactionFailed(transaction);
        } else {
          console.warn(`Transaction retry ${transaction.retryCount}/${this.MAX_RETRIES} failed:`, transaction);
        }
      }
    }

    this.saveToStorage();
  }

  // Public method to load from storage
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('failed_transactions');
      if (stored) {
        this.queue = JSON.parse(stored);
        // Clean up expired transactions when loading
        this.cleanupExpiredTransactions();
      }
    } catch (error) {
      console.error('Failed to load transaction queue from storage:', error);
      this.queue = [];
    }
  }

  // Clean up expired transactions
  private cleanupExpiredTransactions(): void {
    const now = Date.now();
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(tx => tx.expiresAt > now);

    if (this.queue.length < initialLength) {
      console.log(`Cleaned up ${initialLength - this.queue.length} expired transactions`);
      this.saveToStorage();
    }
  }

  private remove(id: string): void {
    this.queue = this.queue.filter(tx => tx.id !== id);
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('failed_transactions', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save transaction queue to storage:', error);
    }
  }

  private emitTransactionSuccess(transaction: FailedTransaction, result: unknown): void {
    // Emit custom event for transaction success
    const event = new CustomEvent('transactionSuccess', {
      detail: { transaction, result }
    });
    window.dispatchEvent(event);
  }

  private emitTransactionFailed(transaction: FailedTransaction): void {
    // Emit custom event for transaction failure
    const event = new CustomEvent('transactionFailed', {
      detail: { transaction }
    });
    window.dispatchEvent(event);
  }

  getQueue(): FailedTransaction[] {
    return [...this.queue];
  }

  clearQueue(): void {
    const clearedCount = this.queue.length;
    this.queue = [];
    this.saveToStorage();
    console.log(`Cleared ${clearedCount} failed transactions from queue`);
  }

  // Get statistics about the queue
  getStats() {
    const now = Date.now();
    const expired = this.queue.filter(tx => tx.expiresAt <= now).length;
    const pending = this.queue.filter(tx => tx.retryCount < this.MAX_RETRIES && tx.expiresAt > now).length;
    const permanent = this.queue.filter(tx => tx.retryCount >= this.MAX_RETRIES).length;

    return {
      total: this.queue.length,
      expired,
      pending,
      permanent,
    };
  }
}

// Global transaction queue instance
const transactionQueue = new TransactionQueue();

// Load queue from storage on initialization
transactionQueue.loadFromStorage();

// Periodically retry failed transactions (less aggressive)
setInterval(() => {
  transactionQueue.retryFailedTransactions();
}, 300000); // Retry every 5 minutes

export function useSaleTransaction() {
  const queryClient = useQueryClient();
  const { clearCart, createBackup, rollbackCart, items: cartItems } = useCartStore();

  const mutation = useMutation({
    mutationFn: async (saleData: SaleCreateData) => {
      try {
        // Create backup before clearing cart for rollback capability
        createBackup();

        // Optimistic update - clear cart immediately for better UX
        clearCart();

        // ----------------------------------------------------------------
        // CRITICAL STEP: PRE-VALIDATE STOCK
        // We must check stock availability BEFORE creating the sale record.
        // ----------------------------------------------------------------
        console.log('Validating stock levels before sale creation...');
        for (const cartItem of cartItems) {
          try {
            const product = await pb.collection('products').getOne(cartItem.id);
            if (product.stock < cartItem.quantity) {
              throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`);
            }
          } catch (err) {
            // If validation fails, we must restore the cart since we cleared it optimistically
            rollbackCart();
            throw err; // Re-throw to stop transaction
          }
        }
        console.log('Stock validation passed.');

        // Create sale record with validation
        const sale = await pbValidated.createSale(saleData);

        // Create sale items (line items) for each cart item
        try {
          for (const cartItem of cartItems) {
            const now = new Date().toISOString();
            await pb.collection('sales_items').create({
              sale: sale.id,
              product: cartItem.id,
              quantity: cartItem.quantity,
              unit_price: cartItem.sale_price,
              total: cartItem.sale_price * cartItem.quantity,
              created: now,
              updated: now,
            });
          }
        } catch (saleItemsError) {
          console.error('Failed to create sale items:', saleItemsError);
          // Sale record exists but line items failed - this is critical
          throw new Error(`Sale record created but failed to create line items: ${saleItemsError instanceof Error ? saleItemsError.message : 'Unknown error'}`);
        }

        // INVENTORY TRACKING: Update stock levels and create inventory entries
        try {
          console.log('Starting inventory tracking for sale:', sale.id, 'with items:', cartItems.length);
          for (const cartItem of cartItems) {
            console.log(`Processing cart item: ${cartItem.name} (ID: ${cartItem.id})`);

            // Get current product data to check stock
            const product = await pb.collection('products').getOne(cartItem.id);
            console.log(`Product ${cartItem.name} current stock: ${product.stock}`);

            // Validate sufficient stock
            if (product.stock < cartItem.quantity) {
              throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`);
            }

            // Update product stock level
            const newStock = product.stock - cartItem.quantity;
            console.log(`Updating ${cartItem.name} stock: ${product.stock} → ${newStock}`);
            await pb.collection('products').update(cartItem.id, {
              stock: newStock
            });

            // Create inventory entry for audit trail
            console.log(`Creating inventory entry for ${cartItem.name}`);
            const now = new Date().toISOString();
            await pb.collection('inventory_entries').create({
              product: cartItem.id,
              type: 'sale',
              quantity: -cartItem.quantity, // Negative for stock reduction
              reference_id: sale.sale_number, // Use readable sale number instead of UUID
              notes: `Sale ${sale.sale_number} - ${cartItem.name}`,
              created: now,
              updated: now,
            });

            console.log(`✅ Inventory updated for ${cartItem.name}: ${product.stock} → ${newStock}`);
          }
          console.log('✅ Inventory tracking completed successfully');
        } catch (inventoryError) {
          console.error('❌ Inventory update failed:', inventoryError);
          // Note: Sale record is already created, but inventory tracking failed
          // This is a business logic error that should be handled
          throw new Error(`Sale completed but inventory tracking failed: ${inventoryError instanceof Error ? inventoryError.message : 'Unknown error'}`);
        }

        // Log successful transaction
        console.log('Sale transaction completed successfully:', {
          id: sale.id,
          saleNumber: sale.sale_number,
          total: sale.total,
          inventoryUpdated: cartItems.length > 0,
          timestamp: new Date().toISOString()
        });

        return sale;

      } catch (error) {
        // Rollback cart to previous state on transaction failure
        rollbackCart();

        // Also invalidate queries as fallback
        queryClient.invalidateQueries({ queryKey: ['cart'] });

        // Queue transaction for retry
        transactionQueue.add({
          data: saleData,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Re-throw error for user feedback
        throw error;
      }
    },

    onSuccess: (data) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // For stock updates
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      // Emit success event
      const event = new CustomEvent('saleCompleted', {
        detail: { sale: data }
      });
      window.dispatchEvent(event);
    },

    onError: (error: Error) => {
      console.error('Sale transaction failed:', error);

      // Emit error event for UI feedback
      const event = new CustomEvent('saleFailed', {
        detail: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(event);
    },
  });

  return {
    ...mutation,
    // Additional methods for transaction management
    getFailedTransactions: () => transactionQueue.getQueue(),
    retryFailedTransactions: () => transactionQueue.retryFailedTransactions(),
    clearFailedTransactions: () => transactionQueue.clearQueue(),
    getTransactionStats: () => transactionQueue.getStats(),
  };
}

// Utility function to queue a failed transaction manually
export function queueFailedTransaction(saleData: SaleCreateData, error?: string): void {
  transactionQueue.add({
    data: saleData,
    error,
  });
}