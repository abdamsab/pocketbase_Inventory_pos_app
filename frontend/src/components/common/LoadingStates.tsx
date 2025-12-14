import React from 'react';
import { Loader2, ShoppingBag, Package, Users, AlertTriangle } from 'lucide-react';

// Skeleton loader components
export const Skeleton: React.FC<{
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
}> = ({ className = '', variant = 'rectangular' }) => {
  const baseClasses = 'animate-pulse bg-surfaceHighlight';

  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded',
    circular: 'rounded-full',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
};

// Card skeleton for dashboard stats
export const StatCardSkeleton: React.FC = () => (
  <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg">
    <div className="flex items-center justify-between mb-4">
      <Skeleton variant="circular" className="w-12 h-12" />
      <Skeleton className="w-12 h-4" />
    </div>
    <Skeleton className="h-8 w-16 mb-1" />
    <Skeleton className="h-4 w-20" />
  </div>
);

// Table skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4
}) => (
  <div className="space-y-4">
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-6 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// Product grid skeleton
export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-surface border border-border rounded-lg p-4">
        <Skeleton className="w-full h-32 mb-3" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-2" />
        <Skeleton className="h-6 w-1/4" />
      </div>
    ))}
  </div>
);

// Form skeleton
export const FormSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-24 w-full" />
    </div>
    <div className="flex space-x-4">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

// Loading spinner with message
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}> = ({ size = 'md', message, className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {message && (
        <p className="text-sm text-text-muted">{message}</p>
      )}
    </div>
  );
};

// Progress indicator
export const ProgressIndicator: React.FC<{
  progress: number; // 0-100
  label?: string;
  className?: string;
}> = ({ progress, label, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {label && (
      <div className="flex justify-between text-sm">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-main font-medium">{progress}%</span>
      </div>
    )}
    <div className="w-full bg-surfaceHighlight rounded-full h-2">
      <div
        className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

// Optimistic update indicator
export const OptimisticIndicator: React.FC<{
  isOptimistic: boolean;
  message?: string;
}> = ({ isOptimistic, message = 'Saving...' }) => (
  isOptimistic ? (
    <div className="flex items-center space-x-2 text-sm text-primary">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{message}</span>
    </div>
  ) : null
);

// Page loading overlay
export const PageLoadingOverlay: React.FC<{
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}> = ({ isLoading, message = 'Loading...', children }) => (
  <div className="relative">
    {children}
    {isLoading && (
      <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
        <LoadingSpinner size="lg" message={message} />
      </div>
    )}
  </div>
);

// Dashboard loading state
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>

    {/* Stats grid skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>

    {/* Charts and recent activity skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="w-full h-64" />
      </div>
      <div className="bg-surface border border-border rounded-2xl p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-surfaceHighlight rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Empty state components
export const EmptyState: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="p-4 bg-surfaceHighlight rounded-full mb-4">
      <Icon size={32} className="text-text-muted" />
    </div>
    <h3 className="text-lg font-semibold text-text-main mb-2">{title}</h3>
    <p className="text-text-muted mb-6 max-w-sm">{description}</p>
    {action}
  </div>
);

// Specific empty states
export const EmptyProducts = () => (
  <EmptyState
    icon={Package}
    title="No products found"
    description="Get started by adding your first product to the inventory."
  />
);

export const EmptySales = () => (
  <EmptyState
    icon={ShoppingBag}
    title="No sales yet"
    description="Your sales transactions will appear here once you start processing orders."
  />
);

export const EmptyUsers = () => (
  <EmptyState
    icon={Users}
    title="No users found"
    description="Add team members to help manage your business operations."
  />
);

export const EmptyAlerts = () => (
  <EmptyState
    icon={AlertTriangle}
    title="All good!"
    description="No low stock alerts at the moment. Your inventory is well stocked."
  />
);

// Loading button
export const LoadingButton: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}> = ({ loading, children, loadingText, className = '', disabled, onClick }) => (
  <button
    className={`inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
      disabled || loading
        ? 'bg-surfaceHighlight text-text-muted cursor-not-allowed'
        : 'bg-primary text-white hover:bg-primary/90'
    } ${className}`}
    disabled={disabled || loading}
    onClick={onClick}
  >
    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    <span>{loading && loadingText ? loadingText : children}</span>
  </button>
);