import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import type { NotificationItem } from '../../hooks/useNotifications';

interface NotificationToastProps {
  notification: NotificationItem;
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

// Static icon mapping to avoid creating components during render
const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const getColors = (type: NotificationItem['type']) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-green-50 border-green-200',
        text: 'text-green-800',
        icon: 'text-green-600',
        progress: 'bg-green-500',
      };
    case 'error':
      return {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-800',
        icon: 'text-red-600',
        progress: 'bg-red-500',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-50 border-yellow-200',
        text: 'text-yellow-800',
        icon: 'text-yellow-600',
        progress: 'bg-yellow-500',
      };
    case 'info':
      return {
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-blue-800',
        icon: 'text-blue-600',
        progress: 'bg-blue-500',
      };
    default:
      return {
        bg: 'bg-gray-50 border-gray-200',
        text: 'text-gray-800',
        icon: 'text-gray-600',
        progress: 'bg-gray-500',
      };
  }
};

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  position = 'top-right',
}) => {
  const IconComponent = iconMap[notification.type] || iconMap.info;
  const colors = getColors(notification.type);

  // Auto-close animation (if autoHide is true)
  useEffect(() => {
    if (!notification.autoHide) return;

    const timer = setTimeout(() => {
      onClose(notification.id);
    }, notification.duration);

    return () => clearTimeout(timer);
  }, [notification, onClose]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <div
      className={`fixed ${getPositionClasses()} z-50 max-w-sm w-full animate-slide-in`}
      style={{ animation: 'slideIn 0.3s ease-out' }}
    >
      <div className={`${colors.bg} border ${colors.text} rounded-lg shadow-lg p-4 relative overflow-hidden`}>
        {/* Progress bar for auto-hide */}
        {notification.autoHide && (
          <div
            className={`absolute bottom-0 left-0 h-1 ${colors.progress} transition-all duration-75`}
            style={{
              width: '100%',
              animation: `shrink ${notification.duration}ms linear forwards`,
            }}
          />
        )}

        <div className="flex items-start gap-3">
           <div className={`${colors.icon} mt-0.5 flex-shrink-0`}>
             <IconComponent size={20} />
           </div>

          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-semibold ${colors.text} leading-tight`}>
              {notification.title}
            </h4>

            {notification.message && (
              <p className={`text-sm ${colors.text} opacity-90 mt-1 leading-relaxed`}>
                {notification.message}
              </p>
            )}

            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs ${colors.text} opacity-70`}>
                {notification.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>

          <button
            onClick={() => onClose(notification.id)}
            className={`${colors.text} hover:opacity-70 transition-opacity p-1 rounded-full hover:bg-black/5`}
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Animation styles are handled by Tailwind CSS animate-slide-in class */}
    </div>
  );
};

// Notification container component
interface NotificationContainerProps {
  notifications: NotificationItem[];
  onClose: (id: string) => void;
  position?: NotificationToastProps['position'];
}

// Notification Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <>
      {children}
      <NotificationContainer
        notifications={notifications}
        onClose={removeNotification}
        position="top-right"
      />
    </>
  );
};

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onClose,
  position = 'top-right',
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className="pointer-events-auto"
          style={{
            transform: `translateY(${index * 10}px)`,
            zIndex: 1000 - index,
          }}
        >
          <NotificationToast
            notification={notification}
            onClose={onClose}
            position={position}
          />
        </div>
      ))}
    </div>
  );
};