import { useEffect, useState, useCallback, useRef } from 'react';
import { pb } from '../lib/pocketbase';
import { errorReporting } from '../utils/errorReporting';
import { useNotifications } from './useNotifications';

export interface RealtimeEvent<T = Record<string, unknown>> {
  action: 'create' | 'update' | 'delete';
  record: T;
  oldRecord?: T;
}

interface SubscriptionData {
  action: string;
  record: Record<string, unknown>;
}

// WebSocket-based real-time updates using PocketBase subscriptions
export function useRealtimeUpdates<T = Record<string, unknown>>(
  collection: string,
  options: {
    filter?: string;
    expand?: string;
    onEvent?: (event: RealtimeEvent<T>) => void;
    fallbackPollInterval?: number; // Fallback to polling if WebSocket fails
  } = {}
) {
  const { filter, expand, onEvent, fallbackPollInterval = 30000 } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent<T> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const subscriptionRef = useRef<(() => void) | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const { addNotification } = useNotifications();

  // Fallback polling function
  const pollForUpdates = useCallback(async () => {
    try {
      const latestRecord = await pb.collection(collection).getList(1, 1, {
        sort: '-updated',
        fields: 'updated,id',
        filter,
      });

      if (latestRecord.items.length > 0) {
        const latestUpdate = new Date(latestRecord.items[0].updated);

        if (latestUpdate > lastUpdated) {
          const event: RealtimeEvent<T> = {
            action: 'update',
            record: latestRecord.items[0] as T,
          };

          setLastEvent(event);
          setLastUpdated(latestUpdate);
          onEvent?.(event);
        }
      }

      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Polling failed');
      console.error(`[Realtime] Polling failed for ${collection}:`, error);
      setError(error);
      setIsConnected(false);
      errorReporting.reportError(error, undefined, { collection, context: 'realtime-polling' });
    }
  }, [collection, filter, lastUpdated, onEvent]);

  // WebSocket subscription function
  const setupSubscription = useCallback(async () => {
    try {
      // Unsubscribe existing subscription
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }

      // Create new subscription
      subscriptionRef.current = await pb.collection(collection).subscribe('*', (data: SubscriptionData) => {
        const action = data.action as 'create' | 'update' | 'delete';
        const event: RealtimeEvent<T> = {
          action,
          record: data.record as T,
        };

        setLastEvent(event);
        setLastUpdated(new Date());
        setIsConnected(true);
        setError(null);

        // Trigger callback
        onEvent?.(event);

        // Show notification for important changes
        if (collection === 'products' && action === 'update') {
          const record = data.record as { name: string; stock: number; reorder_point?: number };
          if (record.stock <= (record.reorder_point || 5)) {
            addNotification('warning', 'Low Stock Alert', `${record.name} is running low (${record.stock} remaining)`, { duration: 5000 });
          }
        }

        if (collection === 'sales' && action === 'create') {
          const record = data.record as { sale_number: string };
          addNotification('success', 'New Sale', `Sale #${record.sale_number} completed`, { duration: 3000 });
        }
      }, {
        filter,
        expand,
      });

      console.log(`[Realtime] Subscribed to ${collection}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Subscription failed');
      console.error(`[Realtime] Subscription failed for ${collection}:`, error);
      setError(error);
      errorReporting.reportError(error, undefined, { collection, context: 'realtime-subscription' });

      // Fallback to polling
      console.log(`[Realtime] Falling back to polling for ${collection}`);
      pollIntervalRef.current = window.setInterval(pollForUpdates, fallbackPollInterval);
    }
  }, [collection, filter, expand, onEvent, addNotification, pollForUpdates, fallbackPollInterval]);

  // Setup subscription on mount
  useEffect(() => {
    const initializeSubscription = async () => {
      try {
        await setupSubscription();
        setIsConnected(true);
      } catch (err) {
        // Error already handled in setupSubscription
      }
    };

    initializeSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
      }
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [setupSubscription]);

  // Manual refresh function
  const checkNow = useCallback(() => {
    pollForUpdates();
  }, [pollForUpdates]);

  return {
    isConnected,
    lastEvent,
    error,
    lastUpdated,
    checkNow,
  };
}

// Hook for real-time inventory updates with notifications
export function useRealtimeInventory(onEvent?: (event: RealtimeEvent) => void) {
  return useRealtimeUpdates('products', {
    onEvent,
    fallbackPollInterval: 15000,
  });
}

// Hook for real-time sales updates with notifications
export function useRealtimeSales(onEvent?: (event: RealtimeEvent) => void) {
  return useRealtimeUpdates('sales', {
    onEvent,
    fallbackPollInterval: 10000,
  });
}

// Hook for dashboard real-time updates
export function useRealtimeDashboard(onEvent?: (event: RealtimeEvent) => void) {
  return useRealtimeUpdates('*', {
    onEvent,
    fallbackPollInterval: 20000,
  });
}