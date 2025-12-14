import { useState, useCallback, useEffect } from 'react';

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: Date;
  autoHide?: boolean;
  duration?: number;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const addNotification = useCallback((
    type: NotificationItem['type'],
    title: string,
    message?: string,
    options: { autoHide?: boolean; duration?: number } = {}
  ) => {
    const notification: NotificationItem = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: new Date(),
      autoHide: options.autoHide ?? true,
      duration: options.duration ?? 5000,
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-hide notification
    if (notification.autoHide) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, notification.duration);
    }

    return notification.id;
  }, [removeNotification]);

  // Keyboard shortcut to clear notifications (Escape key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && notifications.length > 0) {
        clearAllNotifications();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notifications.length, clearAllNotifications]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };
}