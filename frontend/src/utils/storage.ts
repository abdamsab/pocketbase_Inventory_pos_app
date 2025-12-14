// Enhanced storage utility with error handling, corruption recovery, and quota management

export type StorageType = 'localStorage' | 'sessionStorage';

export interface StorageOptions {
  type?: StorageType;
  compress?: boolean;
  maxRetries?: number;
  fallbackToMemory?: boolean;
}

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class StorageManager {
  private memoryStorage = new Map<string, string>();
  private readonly maxRetries: number;
  private readonly fallbackToMemory: boolean;

  constructor(options: StorageOptions = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.fallbackToMemory = options.fallbackToMemory ?? true;
  }

  private getStorage(type: StorageType): Storage | null {
    try {
      if (typeof window === 'undefined') return null;

      switch (type) {
        case 'localStorage':
          return window.localStorage;
        case 'sessionStorage':
          return window.sessionStorage;
        default:
          return null;
      }
    } catch (error) {
      console.warn(`Storage type ${type} not available:`, error);
      return null;
    }
  }

  private isQuotaExceeded(error: any): boolean {
    return error?.name === 'QuotaExceededError' ||
           error?.code === 22 ||
           error?.message?.includes('quota');
  }

  private compress(data: string): string {
    // Simple compression for large data (can be enhanced with proper compression library)
    try {
      return btoa(encodeURIComponent(data));
    } catch {
      return data;
    }
  }

  private decompress(data: string): string {
    try {
      return decodeURIComponent(atob(data));
    } catch {
      return data;
    }
  }

  private validateData(data: any): boolean {
    try {
      // Basic validation to prevent corruption
      if (data === null || data === undefined) return true;
      JSON.stringify(data);
      return true;
    } catch {
      return false;
    }
  }

  private cleanupStorage(type: StorageType): void {
    try {
      const storage = this.getStorage(type);
      if (!storage) return;

      const keys = Object.keys(storage);
      const now = Date.now();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

      keys.forEach(key => {
        try {
          const value = storage.getItem(key);
          if (!value) return;

          const parsed = JSON.parse(value);
          if (parsed._timestamp && (now - parsed._timestamp) > maxAge) {
            storage.removeItem(key);
          }
        } catch {
          // Remove corrupted entries
          storage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup storage:', error);
    }
  }

  async set<T>(key: string, data: T, options: StorageOptions = {}): Promise<StorageResult<T>> {
    const { type = 'localStorage', compress = false } = options;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (!this.validateData(data)) {
          return { success: false, error: 'Invalid data format' };
        }

        const storage = this.getStorage(type);

        if (!storage && !this.fallbackToMemory) {
          return { success: false, error: 'Storage not available' };
        }

        const payload = {
          data,
          _timestamp: Date.now(),
          _version: '1.0',
          _compressed: false,
        };

        let serialized = JSON.stringify(payload);

        if (compress && serialized.length > 1000) {
          serialized = this.compress(serialized);
          payload._compressed = true;
          // Re-serialize with compression flag
          serialized = this.compress(JSON.stringify(payload));
        }

        if (storage) {
          // Check quota before setting
          const testKey = `__test_${Date.now()}`;
          try {
            storage.setItem(testKey, 'test');
            storage.removeItem(testKey);
          } catch (error) {
            if (this.isQuotaExceeded(error)) {
              // Attempt cleanup and retry
              this.cleanupStorage(type);
              if (attempt === this.maxRetries) {
                throw error;
              }
              continue;
            }
          }

          storage.setItem(key, serialized);
        } else if (this.fallbackToMemory) {
          this.memoryStorage.set(key, serialized);
        }

        return { success: true, data };

      } catch (error) {
        console.warn(`Storage set attempt ${attempt} failed:`, error);

        if (attempt === this.maxRetries) {
          if (this.fallbackToMemory && !this.memoryStorage.has(key)) {
            try {
              this.memoryStorage.set(key, JSON.stringify({ data, _timestamp: Date.now() }));
              return { success: true, data };
            } catch {
              return { success: false, error: 'All storage methods failed' };
            }
          }
          return {
            success: false,
            error: this.isQuotaExceeded(error) ? 'Storage quota exceeded' : 'Storage operation failed'
          };
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  }

  get<T>(key: string, options: StorageOptions = {}): StorageResult<T> {
    const { type = 'localStorage' } = options;

    try {
      let serialized: string | null = null;
      const storage = this.getStorage(type);

      if (storage) {
        serialized = storage.getItem(key);
      } else if (this.fallbackToMemory) {
        serialized = this.memoryStorage.get(key) || null;
      }

      if (!serialized) {
        return { success: false, error: 'Key not found' };
      }

      let parsed: any;

      try {
        parsed = JSON.parse(serialized);

        // Check for compressed data
        if (parsed._compressed) {
          const decompressed = this.decompress(serialized);
          parsed = JSON.parse(decompressed);
        }
      } catch {
        return { success: false, error: 'Data corruption detected' };
      }

      // Validate data structure
      if (!parsed.data) {
        return { success: false, error: 'Invalid data structure' };
      }

      return { success: true, data: parsed.data };

    } catch (error) {
      console.warn('Storage get operation failed:', error);
      return { success: false, error: 'Storage operation failed' };
    }
  }

  remove(key: string, options: StorageOptions = {}): StorageResult<void> {
    const { type = 'localStorage' } = options;

    try {
      const storage = this.getStorage(type);

      if (storage) {
        storage.removeItem(key);
      }

      if (this.fallbackToMemory) {
        this.memoryStorage.delete(key);
      }

      return { success: true };

    } catch (error) {
      console.warn('Storage remove operation failed:', error);
      return { success: false, error: 'Storage operation failed' };
    }
  }

  clear(options: StorageOptions = {}): StorageResult<void> {
    const { type = 'localStorage' } = options;

    try {
      const storage = this.getStorage(type);

      if (storage) {
        storage.clear();
      }

      if (this.fallbackToMemory) {
        this.memoryStorage.clear();
      }

      return { success: true };

    } catch (error) {
      console.warn('Storage clear operation failed:', error);
      return { success: false, error: 'Storage operation failed' };
    }
  }

  getStats(options: StorageOptions = {}): { used: number; available: number; items: number } {
    const { type = 'localStorage' } = options;

    try {
      const storage = this.getStorage(type);
      if (!storage) {
        return { used: 0, available: 0, items: this.memoryStorage.size };
      }

      let used = 0;
      let items = 0;

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          const value = storage.getItem(key);
          if (value) {
            used += key.length + value.length;
            items++;
          }
        }
      }

      // Estimate available space (rough approximation)
      const available = Math.max(0, 5 * 1024 * 1024 - used); // Assume 5MB limit

      return { used, available, items };

    } catch (error) {
      console.warn('Failed to get storage stats:', error);
      return { used: 0, available: 0, items: 0 };
    }
  }
}

// Export singleton instance
export const storage = new StorageManager({
  maxRetries: 3,
  fallbackToMemory: true,
});

// Convenience functions for common operations
export const localStorage = {
  set: <T>(key: string, data: T) => storage.set(key, data, { type: 'localStorage' }),
  get: <T>(key: string) => storage.get<T>(key, { type: 'localStorage' }),
  remove: (key: string) => storage.remove(key, { type: 'localStorage' }),
  clear: () => storage.clear({ type: 'localStorage' }),
  getStats: () => storage.getStats({ type: 'localStorage' }),
};

export const sessionStorage = {
  set: <T>(key: string, data: T) => storage.set(key, data, { type: 'sessionStorage' }),
  get: <T>(key: string) => storage.get<T>(key, { type: 'sessionStorage' }),
  remove: (key: string) => storage.remove(key, { type: 'sessionStorage' }),
  clear: () => storage.clear({ type: 'sessionStorage' }),
  getStats: () => storage.getStats({ type: 'sessionStorage' }),
};