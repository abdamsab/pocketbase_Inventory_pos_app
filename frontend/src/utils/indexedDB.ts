interface DBSchema {
  products: Product;
  categories: Category;
  suppliers: Supplier;
  sales: Sale;
  pendingOperations: PendingOperation;
}

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  cost_price: number;
  sale_price: number;
  stock: number;
  reorder_point?: number;
  category?: string;
  image?: string;
  barcode?: string;
  is_active: boolean;
  lastSync: number;
}

interface Category {
  id: string;
  name: string;
  lastSync: number;
}

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  address?: string;
  payment_terms?: string;
  notes?: string;
  active: boolean;
  lastSync: number;
}

interface Sale {
  id: string;
  sale_number: string;
  user: string;
  location?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'mobile';
  status: 'completed' | 'refunded' | 'cancelled';
  notes?: string;
  items: SaleItem[];
  created: string;
  lastSync: number;
}

interface SaleItem {
  id: string;
  sale: string;
  product: string;
  quantity: number;
  unit_price: number;
  total: number;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'nexus-pos-db';
  private readonly dbVersion = 1;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB initialization failed');
        reject(new Error('Failed to initialize IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });
  }

  private createObjectStores(db: IDBDatabase): void {
    // Products store
    if (!db.objectStoreNames.contains('products')) {
      const productsStore = db.createObjectStore('products', { keyPath: 'id' });
      productsStore.createIndex('sku', 'sku', { unique: true });
      productsStore.createIndex('category', 'category', { unique: false });
      productsStore.createIndex('lastSync', 'lastSync', { unique: false });
    }

    // Categories store
    if (!db.objectStoreNames.contains('categories')) {
      const categoriesStore = db.createObjectStore('categories', { keyPath: 'id' });
      categoriesStore.createIndex('lastSync', 'lastSync', { unique: false });
    }

    // Suppliers store
    if (!db.objectStoreNames.contains('suppliers')) {
      const suppliersStore = db.createObjectStore('suppliers', { keyPath: 'id' });
      suppliersStore.createIndex('active', 'active', { unique: false });
      suppliersStore.createIndex('lastSync', 'lastSync', { unique: false });
    }

    // Sales store (for offline viewing)
    if (!db.objectStoreNames.contains('sales')) {
      const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
      salesStore.createIndex('user', 'user', { unique: false });
      salesStore.createIndex('status', 'status', { unique: false });
      salesStore.createIndex('created', 'created', { unique: false });
      salesStore.createIndex('lastSync', 'lastSync', { unique: false });
    }

    // Pending operations store (for sync queue)
    if (!db.objectStoreNames.contains('pendingOperations')) {
      const pendingStore = db.createObjectStore('pendingOperations', { keyPath: 'id' });
      pendingStore.createIndex('collection', 'collection', { unique: false });
      pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
      pendingStore.createIndex('retryCount', 'retryCount', { unique: false });
    }

    console.log('IndexedDB object stores created');
  }

  private ensureInit(): void {
    if (!this.isInitialized || !this.db) {
      throw new Error('IndexedDB not initialized. Call init() first.');
    }
  }

  // Generic CRUD operations
  async get<T extends keyof DBSchema>(
    storeName: T,
    id: string
  ): Promise<DBSchema[T] | null> {
    this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T extends keyof DBSchema>(
    storeName: T,
    indexName?: string,
    indexValue?: IDBValidKey | IDBKeyRange
  ): Promise<DBSchema[T][]> {
    this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);

      let request: IDBRequest;
      if (indexName && indexValue !== undefined) {
        const index = store.index(indexName);
        request = index.getAll(indexValue);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T extends keyof DBSchema>(
    storeName: T,
    data: DBSchema[T]
  ): Promise<void> {
    this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Bulk operations
  async putBulk<T extends keyof DBSchema>(
    storeName: T,
    data: DBSchema[T][]
  ): Promise<void> {
    this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      let completed = 0;
      const total = data.length;

      if (total === 0) {
        resolve();
        return;
      }

      const checkComplete = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      data.forEach(item => {
        const request = store.put(item);
        request.onsuccess = checkComplete;
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Specific methods for different data types
  async syncProducts(products: Product[]): Promise<void> {
    const productsWithSync = products.map(product => ({
      ...product,
      lastSync: Date.now(),
    }));

    await this.putBulk('products', productsWithSync);
  }

  async syncCategories(categories: Category[]): Promise<void> {
    const categoriesWithSync = categories.map(category => ({
      ...category,
      lastSync: Date.now(),
    }));

    await this.putBulk('categories', categoriesWithSync);
  }

  async syncSuppliers(suppliers: Supplier[]): Promise<void> {
    const suppliersWithSync = suppliers.map(supplier => ({
      ...supplier,
      lastSync: Date.now(),
    }));

    await this.putBulk('suppliers', suppliersWithSync);
  }

  async syncSales(sales: Sale[]): Promise<void> {
    const salesWithSync = sales.map(sale => ({
      ...sale,
      lastSync: Date.now(),
    }));

    await this.putBulk('sales', salesWithSync);
  }

  // Pending operations (for offline queue)
  async addPendingOperation(operation: Omit<PendingOperation, 'id'>): Promise<string> {
    const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pendingOp: PendingOperation = {
      id,
      ...operation,
    };

    await this.put('pendingOperations', pendingOp);
    return id;
  }

  async getPendingOperations(collection?: string): Promise<PendingOperation[]> {
    if (collection) {
      return this.getAll('pendingOperations', 'collection', collection);
    }
    return this.getAll('pendingOperations');
  }

  async removePendingOperation(id: string): Promise<void> {
    await this.delete('pendingOperations', id);
  }

  async updatePendingOperation(id: string, updates: Partial<PendingOperation>): Promise<void> {
    const operation = await this.get('pendingOperations', id);
    if (operation) {
      await this.put('pendingOperations', { ...operation, ...updates });
    }
  }

  // Sync status and utilities
  async getLastSyncTime(storeName: string): Promise<number> {
    const items = await this.getAll(storeName as keyof DBSchema);
    if (items.length === 0) return 0;

    return Math.max(...items.map(item => {
      const typedItem = item as { lastSync?: number };
      return typedItem.lastSync || 0;
    }));
  }

  async clearStore(storeName: string): Promise<void> {
    this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllData(): Promise<void> {
    const stores = ['products', 'categories', 'suppliers', 'sales', 'pendingOperations'];
    await Promise.all(stores.map(store => this.clearStore(store)));
  }

  // Storage quota and cleanup
  async getStorageEstimate(): Promise<{ quota?: number; usage?: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return navigator.storage.estimate();
    }
    return {};
  }

  async cleanupOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    // Remove data older than maxAge (default: 7 days)
    const cutoff = Date.now() - maxAge;
    const stores = ['products', 'categories', 'suppliers', 'sales'];

    for (const store of stores) {
      const items = await this.getAll(store as keyof DBSchema);
      const oldItems = items.filter(item => {
        const typedItem = item as { lastSync?: number };
        return (typedItem.lastSync || 0) < cutoff;
      });

      for (const item of oldItems) {
        const typedItem = item as { id: string };
        await this.delete(store, typedItem.id);
      }
    }

    console.log(`Cleaned up ${stores.length} stores, removed old data`);
  }

  // Connection and sync status
  isOnline(): boolean {
    return navigator.onLine;
  }

  async getSyncStatus(): Promise<{
    lastSync: { [store: string]: number };
    pendingOperations: number;
    isOnline: boolean;
  }> {
    const stores = ['products', 'categories', 'suppliers', 'sales'];
    const lastSync: { [store: string]: number } = {};
    const pendingOps = await this.getPendingOperations();

    for (const store of stores) {
      lastSync[store] = await this.getLastSyncTime(store);
    }

    return {
      lastSync,
      pendingOperations: pendingOps.length,
      isOnline: this.isOnline(),
    };
  }
}

// Create singleton instance
export const indexedDB = new IndexedDBManager();

// Export types
export type { DBSchema, PendingOperation, Product, Category, Supplier, Sale, SaleItem };