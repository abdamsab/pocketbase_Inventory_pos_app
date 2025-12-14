import { useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '../utils/storage';
import { errorReporting } from '../utils/errorReporting';

export interface SyncItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingItems: SyncItem[];
  lastSyncTime: number | null;
  errors: string[];
}

export interface SyncOptions {
  autoSync?: boolean;
  syncInterval?: number;
  maxRetries?: number;
  onSyncStart?: () => void;
  onSyncComplete?: (success: boolean, syncedItems: number) => void;
  onSyncError?: (error: string) => void;
}

// Queue for pending sync operations
class SyncQueue {
  private queue: SyncItem[] = [];
  private readonly maxRetries: number;

  constructor(maxRetries = 3) {
    this.maxRetries = maxRetries;
    this.loadFromStorage();
  }

  async loadFromStorage() {
    try {
      const stored = storage.get<SyncItem[]>('sync_queue');
      if (stored.success && stored.data) {
        this.queue = stored.data.filter(item => item.retryCount < item.maxRetries);
        await this.saveToStorage();
      }
    } catch (error) {
      console.warn('Failed to load sync queue from storage:', error);
    }
  }

  async saveToStorage() {
    try {
      await storage.set('sync_queue', this.queue);
    } catch (error) {
      console.warn('Failed to save sync queue to storage:', error);
    }
  }

  add(item: Omit<SyncItem, 'retryCount' | 'maxRetries'>) {
    const syncItem: SyncItem = {
      ...item,
      retryCount: 0,
      maxRetries: this.maxRetries,
    };

    // Remove any existing item with same id and type
    this.queue = this.queue.filter(
      existing => !(existing.id === item.id && existing.type === item.type && existing.collection === item.collection)
    );

    this.queue.push(syncItem);
    this.saveToStorage();
  }

  getAll(): SyncItem[] {
    return [...this.queue];
  }

  remove(id: string) {
    this.queue = this.queue.filter(item => item.id !== id);
    this.saveToStorage();
  }

  updateRetryCount(id: string) {
    const item = this.queue.find(item => item.id === id);
    if (item) {
      item.retryCount++;
      this.saveToStorage();
    }
  }

  clear() {
    this.queue = [];
    this.saveToStorage();
  }

  hasItems(): boolean {
    return this.queue.length > 0;
  }
}

const syncQueue = new SyncQueue();

// Main sync hook
export function useOfflineSync(options: SyncOptions = {}) {
  const {
    autoSync = true,
    syncInterval = 30000, // 30 seconds
    onSyncStart,
    onSyncComplete,
    onSyncError,
  } = options;

  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingItems: [],
    lastSyncTime: null,
    errors: [],
  });

  const syncTimeoutRef = useRef<number | undefined>(undefined);
  const isMountedRef = useRef(true);

  // Update sync state
  const updateSyncState = useCallback((updates: Partial<SyncState>) => {
    if (!isMountedRef.current) return;

    setSyncState(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => updateSyncState({ isOnline: true });
    const handleOffline = () => updateSyncState({ isOnline: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial state
    updateSyncState({ isOnline: navigator.onLine });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateSyncState]);

  // Sync pending items
  const syncPendingItems = useCallback(async () => {
    if (!syncState.isOnline || syncState.isSyncing) return;

    const pendingItems = syncQueue.getAll();
    if (pendingItems.length === 0) return;

    updateSyncState({ isSyncing: true, errors: [] });
    onSyncStart?.();

    let syncedCount = 0;
    const errors: string[] = [];

    for (const item of pendingItems) {
      if (!isMountedRef.current) break;

      try {
        await performSyncOperation(item);
        syncQueue.remove(item.id);
        syncedCount++;
      } catch (error) {
        const errorMessage = `Failed to sync ${item.type} ${item.collection}/${item.id}: ${error}`;
        console.error(errorMessage);

        syncQueue.updateRetryCount(item.id);
        const updatedItem = syncQueue.getAll().find(i => i.id === item.id);

        if (updatedItem && updatedItem.retryCount >= updatedItem.maxRetries) {
          syncQueue.remove(item.id);
          errors.push(`${errorMessage} (max retries exceeded)`);
        } else {
          errors.push(errorMessage);
        }

        errorReporting.reportError(error instanceof Error ? error : new Error(errorMessage), undefined, {
          syncItem: item,
          context: 'offline_sync',
        });
      }
    }

    const success = errors.length === 0;
    updateSyncState({
      isSyncing: false,
      lastSyncTime: Date.now(),
      pendingItems: syncQueue.getAll(),
      errors,
    });

    onSyncComplete?.(success, syncedCount);
    if (!success && errors.length > 0) {
      onSyncError?.(errors[0]);
    }
  }, [syncState.isOnline, syncState.isSyncing, updateSyncState, onSyncStart, onSyncComplete, onSyncError]);

  // Perform individual sync operation
  const performSyncOperation = async (item: SyncItem) => {
    const { pb } = await import('../lib/pocketbase');

    switch (item.type) {
      case 'create':
        await pb.collection(item.collection).create(item.data);
        break;
      case 'update':
        await pb.collection(item.collection).update(item.id, item.data);
        break;
      case 'delete':
        await pb.collection(item.collection).delete(item.id);
        break;
      default:
        throw new Error(`Unknown sync operation type: ${item.type}`);
    }
  };

  // Add item to sync queue
  const addToSyncQueue = useCallback((item: Omit<SyncItem, 'timestamp' | 'retryCount' | 'maxRetries'>) => {
    const syncItem: Omit<SyncItem, 'retryCount' | 'maxRetries'> = {
      ...item,
      timestamp: Date.now(),
    };

    syncQueue.add(syncItem);
    updateSyncState({ pendingItems: syncQueue.getAll() });

    // Trigger immediate sync if online
    if (syncState.isOnline && autoSync) {
      syncPendingItems();
    }
  }, [syncState.isOnline, autoSync, updateSyncState, syncPendingItems]);

  // Manual sync trigger
  const triggerSync = useCallback(() => {
    syncPendingItems();
  }, [syncPendingItems]);

  // Clear sync queue
  const clearSyncQueue = useCallback(() => {
    syncQueue.clear();
    updateSyncState({ pendingItems: [], errors: [] });
  }, [updateSyncState]);

  // Auto-sync timer
  useEffect(() => {
    if (autoSync && syncState.isOnline) {
      syncTimeoutRef.current = setInterval(() => {
        if (syncQueue.hasItems()) {
          syncPendingItems();
        }
      }, syncInterval);
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
    };
  }, [autoSync, syncState.isOnline, syncInterval, syncPendingItems]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...syncState,
    addToSyncQueue,
    triggerSync,
    clearSyncQueue,
    hasPendingItems: syncQueue.hasItems(),
  };
}

// Hook for optimistic updates with offline sync
export function useOptimisticSync<T>(
  collection: string,
  options: SyncOptions & {
    onConflict?: (serverData: T, localData: T) => T;
  } = {}
) {
  const { ...syncOptions } = options;
  const sync = useOfflineSync(syncOptions);

  const optimisticCreate = useCallback(async (data: Partial<T>) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Optimistically add to sync queue
    sync.addToSyncQueue({
      id: tempId,
      type: 'create',
      collection,
      data,
    });

    return tempId;
  }, [sync, collection]);

  const optimisticUpdate = useCallback(async (id: string, data: Partial<T>) => {
    sync.addToSyncQueue({
      id,
      type: 'update',
      collection,
      data,
    });
  }, [sync, collection]);

  const optimisticDelete = useCallback(async (id: string) => {
    sync.addToSyncQueue({
      id,
      type: 'delete',
      collection,
      data: null,
    });
  }, [sync, collection]);

  return {
    ...sync,
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete,
  };
}

// Hook for monitoring sync conflicts
export function useSyncConflicts() {
  const [conflicts, setConflicts] = useState<Array<{
    id: string;
    collection: string;
    serverData: Record<string, unknown>;
    localData: Record<string, unknown>;
    timestamp: number;
  }>>([]);

  const addConflict = useCallback((conflict: typeof conflicts[0]) => {
    setConflicts(prev => [...prev, conflict]);
  }, []);

  const resolveConflict = useCallback((id: string, resolution: 'server' | 'local' | 'merge', mergeData?: Record<string, unknown>) => {
    setConflicts(prev => prev.filter(c => c.id !== id));

    // Here you would implement conflict resolution logic
    // For now, just log the resolution
    console.log(`Conflict resolved for ${id}: ${resolution}`, mergeData);
  }, []);

  const clearConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  return {
    conflicts,
    addConflict,
    resolveConflict,
    clearConflicts,
    hasConflicts: conflicts.length > 0,
  };
}

// Utility hook for sync status monitoring
export function useSyncStats() {
  const [stats, setStats] = useState({
    totalSynced: 0,
    totalErrors: 0,
    averageSyncTime: 0,
    lastSyncDuration: 0,
  });

  const updateStats = useCallback((synced: number, errors: number, duration: number) => {
    setStats(prev => ({
      totalSynced: prev.totalSynced + synced,
      totalErrors: prev.totalErrors + errors,
      lastSyncDuration: duration,
      averageSyncTime: ((prev.averageSyncTime * prev.totalSynced) + duration) / (prev.totalSynced + synced),
    }));
  }, []);

  return {
    ...stats,
    updateStats,
  };
}