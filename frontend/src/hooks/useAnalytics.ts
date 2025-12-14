import { useQuery } from '@tanstack/react-query';
// Fix: Import interfaces as types, classes as values
import { AnalyticsEngine } from '../utils/analytics';
// Types are available in analytics utils but not used directly in this file

// Hook for sales trends analytics
export function useSalesTrends(days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'sales-trends', days],
    queryFn: () => AnalyticsEngine.getSalesTrends(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Hook for product analytics
export function useProductAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'product-analytics'],
    queryFn: () => AnalyticsEngine.getProductAnalytics(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

// Hook for revenue forecast
export function useRevenueForecast(days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'revenue-forecast', days],
    queryFn: () => AnalyticsEngine.getRevenueForecast(days),
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });
}

// Hook for customer analytics
export function useCustomerAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'customer-analytics'],
    queryFn: () => AnalyticsEngine.getCustomerAnalytics(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

// Hook for inventory analytics
export function useInventoryAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'inventory-analytics'],
    queryFn: () => AnalyticsEngine.getInventoryAnalytics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Combined analytics hook for dashboard
export function useAnalyticsDashboard() {
  const salesTrends = useSalesTrends(30);
  const productAnalytics = useProductAnalytics();
  const customerAnalytics = useCustomerAnalytics();
  const inventoryAnalytics = useInventoryAnalytics();

  const isLoading = salesTrends.isLoading || productAnalytics.isLoading ||
                   customerAnalytics.isLoading || inventoryAnalytics.isLoading;

  const error = salesTrends.error || productAnalytics.error ||
               customerAnalytics.error || inventoryAnalytics.error;

  return {
    salesTrends: salesTrends.data || [],
    productAnalytics: productAnalytics.data || [],
    customerAnalytics: customerAnalytics.data || {
      totalCustomers: 0,
      repeatCustomers: 0,
      averageLifetimeValue: 0,
      customerRetentionRate: 0,
      newCustomersThisMonth: 0,
    },
    inventoryAnalytics: inventoryAnalytics.data || {
      totalProducts: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      averageStockLevel: 0,
      stockTurnoverRate: 0,
      deadStockItems: 0,
    },
    isLoading,
    error,
    refetch: () => {
      salesTrends.refetch();
      productAnalytics.refetch();
      customerAnalytics.refetch();
      inventoryAnalytics.refetch();
    },
  };
}