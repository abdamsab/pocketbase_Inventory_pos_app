import { indexedDB } from '../utils/indexedDB';
import { pbValidated } from './pocketbase';
import { errorReporting } from '../utils/errorReporting';

interface OfflineStatus {
  isOnline: boolean;
  isInitialized: boolean;
  lastSyncTime: number | null;
  pendingOperations: number;
}

class OfflineManager {
  private status: OfflineStatus = {
    isOnline: navigator.onLine,
    isInitialized: false,
    lastSyncTime: null,
    pendingOperations: 0,
  };

  private listeners: Set<(status: OfflineStatus) => void> = new Set();
  private syncInProgress = false;

  constructor() {
    this.init();
    this.setupEventListeners();
  }

  private async init() {
    try {
      await indexedDB.init();
      await this.loadSyncStatus();
      this.status.isInitialized = true;
      this.notifyListeners();
      console.log('[OfflineManager] Initialized');
    } catch (error) {
      console.error('[OfflineManager] Initialization failed:', error);
      errorReporting.reportError(
        error instanceof Error ? error : new Error('Offline manager initialization failed'),
        undefined,
        { context: 'offline-manager-init' }
      );
    }
  }

  private setupEventListeners() {
    const handleOnline = () => {
      console.log('[OfflineManager] Connection restored');
      this.status.isOnline = true;
      this.notifyListeners();
      // Auto-sync when coming back online
      this.syncPendingOperations();
    };

    const handleOffline = () => {
      console.log('[OfflineManager] Connection lost');
      this.status.isOnline = false;
      this.notifyListeners();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  private async loadSyncStatus() {
    try {
      const syncStatus = await indexedDB.getSyncStatus();
      const pendingOps = await indexedDB.getPendingOperations();

      this.status.lastSyncTime = Math.max(...Object.values(syncStatus.lastSync)) || null;
      this.status.pendingOperations = pendingOps.length;
    } catch (error) {
      console.error('[OfflineManager] Failed to load sync status:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.status }));
  }

  // Public API
  getStatus(): OfflineStatus {
    return { ...this.status };
  }

  subscribe(listener: (status: OfflineStatus) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current status
    listener({ ...this.status });

    return () => {
      this.listeners.delete(listener);
    };
  }

  async syncData(): Promise<void> {
    if (!this.status.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      console.log('[OfflineManager] Starting data sync...');

      // Sync essential data for offline use
      const [products, categories, suppliers] = await Promise.all([
        pbValidated.getProducts(),
        this.getCategories(),
        pbValidated.getSuppliers(),
      ]);

      await Promise.all([
        indexedDB.syncProducts(products.map(p => ({
          ...p,
          lastSync: Date.now(),
          stock: p.stock ?? 0,
          is_active: p.is_active ?? true
        }))),
        indexedDB.syncCategories(categories.map(c => ({ ...c, lastSync: Date.now() }))),
        indexedDB.syncSuppliers(suppliers.map(s => ({
          ...s,
          lastSync: Date.now(),
          active: s.active ?? true
        }))),
      ]);

      this.status.lastSyncTime = Date.now();
      localStorage.setItem('lastSync', this.status.lastSyncTime.toString());

      console.log('[OfflineManager] Data sync completed');
    } catch (error) {
      console.error('[OfflineManager] Data sync failed:', error);
      errorReporting.reportError(
        error instanceof Error ? error : new Error('Data sync failed'),
        undefined,
        { context: 'offline-sync' }
      );
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  async syncPendingOperations(): Promise<void> {
    if (!this.status.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      console.log('[OfflineManager] Syncing pending operations...');

      const pendingOps = await indexedDB.getPendingOperations();

      for (const operation of pendingOps) {
        try {
          await this.executePendingOperation(operation);
          await indexedDB.removePendingOperation(operation.id);
          console.log(`[OfflineManager] Processed operation ${operation.id}`);
        } catch (error) {
          console.error(`[OfflineManager] Failed to process operation ${operation.id}:`, error);
          // Increment retry count (max 3 retries)
          if (operation.retryCount < 3) {
            await indexedDB.updatePendingOperation(operation.id, {
              retryCount: operation.retryCount + 1,
              lastError: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      // Update pending operations count
      const remainingOps = await indexedDB.getPendingOperations();
      this.status.pendingOperations = remainingOps.length;

      console.log('[OfflineManager] Pending operations sync completed');
    } catch (error) {
      console.error('[OfflineManager] Pending operations sync failed:', error);
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async executePendingOperation(operation: { type: string; collection: string; data: Record<string, unknown> }) {
    switch (operation.type) {
      case 'create':
        await pbValidated.raw.collection(operation.collection).create(operation.data);
        break;
      case 'update':
        await pbValidated.raw.collection(operation.collection).update(operation.data.id as string, operation.data);
        break;
      case 'delete':
        await pbValidated.raw.collection(operation.collection).delete(operation.data.id as string);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  async queueOperation(
    type: 'create' | 'update' | 'delete',
    collection: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      await indexedDB.addPendingOperation({
        type,
        collection,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      });

      // Update pending operations count
      const pendingOps = await indexedDB.getPendingOperations();
      this.status.pendingOperations = pendingOps.length;
      this.notifyListeners();

      console.log(`[OfflineManager] Queued ${type} operation for ${collection}`);
    } catch (error) {
      console.error('[OfflineManager] Failed to queue operation:', error);
      throw error;
    }
  }


  // Categories helper (PocketBase doesn't have getCategories method)
  private async getCategories() {
    try {
      const records = await pbValidated.raw.collection('categories').getFullList();
      return records.map(record => ({
        id: record.id,
        name: record.name,
        collectionId: record.collectionId,
        collectionName: record.collectionName,
        created: record.created,
        updated: record.updated,
      }));
    } catch (error) {
      console.error('[OfflineManager] Failed to get categories:', error);
      return [];
    }
  }

  // Register service worker
  async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[OfflineManager] Service worker registered:', registration);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                console.log('[OfflineManager] New service worker available');
                // Could show user notification here
              }
            });
          }
        });
      } catch (error) {
        console.error('[OfflineManager] Service worker registration failed:', error);
      }
    }
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager();