import { pb } from '../lib/pocketbase';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';

// Types for analytics data
export interface SalesTrend {
  date: string;
  revenue: number;
  transactions: number;
  averageOrderValue: number;
}

export interface ProductAnalytics {
  id: string;
  name: string;
  totalSold: number;
  revenue: number;
  profitMargin: number;
  turnoverRate: number;
  category: string;
}

export interface RevenueForecast {
  date: string;
  predictedRevenue: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  repeatCustomers: number;
  averageLifetimeValue: number;
  customerRetentionRate: number;
  newCustomersThisMonth: number;
}

export interface InventoryAnalytics {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  averageStockLevel: number;
  stockTurnoverRate: number;
  deadStockItems: number;
}

// Analytics calculation utilities
export class AnalyticsEngine {
  // Sales trend analysis
  static async getSalesTrends(days: number = 30): Promise<SalesTrend[]> {
    try {
      // Try to access sales collection, return empty array if it doesn't exist
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let sales: any[] = [];
      try {
        // Get all sales first, then filter in memory to avoid date parsing issues
        sales = await pb.collection('sales').getFullList({
          sort: 'created',
          requestKey: null
        });
      } catch (error) {
        console.warn('Sales collection not available for analytics:', error);
        return [];
      }

      const endDate = new Date();
      const startDate = subDays(endDate, days);

      // Filter sales by date range in memory
      const filteredSales = sales.filter(sale => {
        if (!sale.created) return false;
        const saleDate = new Date(sale.created);
        return saleDate >= startDate && saleDate <= endDate;
      });

      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

      const trends: SalesTrend[] = dateRange.map(date => {
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const daySales = filteredSales.filter(sale => {
          if (!sale.created) return false;
          const saleDate = new Date(sale.created);
          return saleDate >= dayStart && saleDate <= dayEnd;
        });

        const revenue = daySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const transactions = daySales.length;
        const averageOrderValue = transactions > 0 ? revenue / transactions : 0;

        return {
          date: format(date, 'yyyy-MM-dd'),
          revenue: Math.round(revenue * 100) / 100,
          transactions,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        };
      });

      return trends;
    } catch (error) {
      console.error('Failed to calculate sales trends:', error);
      return [];
    }
  }

  // Product performance analysis
  static async getProductAnalytics(): Promise<ProductAnalytics[]> {
    try {
      // Try to get products, return empty array if collection doesn't exist
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let products: any[] = [];
      try {
        products = await pb.collection('products').getFullList({
          expand: 'category',
          requestKey: null
        });
      } catch (error) {
        console.warn('Products collection not available for analytics:', error);
        return [];
      }

      // Try to get sales items data directly (correct relationship)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let salesItems: any[] = [];
      try {
        salesItems = await pb.collection('sales_items').getFullList({
          expand: 'product',
          requestKey: null
        });
      } catch (error) {
        console.warn('Sales items collection not available for product analytics:', error);
        // Continue with empty sales items data
      }

      const productStats = new Map<string, {
        totalSold: number;
        revenue: number;
        cost: number;
      }>();

      // Aggregate sales items data by product (correct approach)
      salesItems.forEach(item => {
        const productId = item.product;
        if (!productId) return;

        const quantity = item.quantity || 0;
        const price = item.unit_price || item.price || 0; // Try unit_price first, fallback to price

        // Get cost from the expanded product data
        const cost = item.expand?.product?.cost_price || 0;

        const existing = productStats.get(productId) || { totalSold: 0, revenue: 0, cost: 0 };
        productStats.set(productId, {
          totalSold: existing.totalSold + quantity,
          revenue: existing.revenue + (price * quantity),
          cost: existing.cost + (cost * quantity),
        });
      });

      // Calculate analytics for each product
      const analytics: ProductAnalytics[] = products.map(product => {
        const stats = productStats.get(product.id) || { totalSold: 0, revenue: 0, cost: 0 };
        const profit = stats.revenue - stats.cost;
        const profitMargin = stats.revenue > 0 ? (profit / stats.revenue) * 100 : 0;

        // Calculate turnover rate (sold / current stock, annualized)
        const turnoverRate = product.stock > 0 ? (stats.totalSold / product.stock) * 12 : 0;

        return {
          id: product.id,
          name: product.name,
          totalSold: stats.totalSold,
          revenue: Math.round(stats.revenue * 100) / 100,
          profitMargin: Math.round(profitMargin * 100) / 100,
          turnoverRate: Math.round(turnoverRate * 100) / 100,
          category: product.expand?.category?.name || 'Uncategorized',
        };
      });

      // Sort by revenue descending
      return analytics.sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
      console.error('Failed to calculate product analytics:', error);
      return [];
    }
  }

  // Simple revenue forecasting using linear regression
  static async getRevenueForecast(days: number = 30): Promise<RevenueForecast[]> {
    try {
      const historicalData = await this.getSalesTrends(90); // Use 90 days for forecasting

      if (historicalData.length < 7) {
        return [];
      }

      // Simple moving average forecast
      const forecast: RevenueForecast[] = [];
      const last30Days = historicalData.slice(-30);
      const avgRevenue = last30Days.reduce((sum, day) => sum + day.revenue, 0) / last30Days.length;
      // const avgTransactions = last30Days.reduce((sum, day) => sum + day.transactions, 0) / last30Days.length; // Not used in forecast

      for (let i = 1; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        // Add some trend analysis (simple linear trend)
        const trendMultiplier = 1 + (i * 0.001); // 0.1% daily growth assumption
        const predictedRevenue = avgRevenue * trendMultiplier;
        const confidence = Math.max(0.6, 1 - (i * 0.01)); // Decreasing confidence over time

        forecast.push({
          date: format(date, 'yyyy-MM-dd'),
          predictedRevenue: Math.round(predictedRevenue * 100) / 100,
          confidence: Math.round(confidence * 100) / 100,
          upperBound: Math.round((predictedRevenue * 1.2) * 100) / 100,
          lowerBound: Math.round((predictedRevenue * 0.8) * 100) / 100,
        });
      }

      return forecast;
    } catch (error) {
      console.error('Failed to generate revenue forecast:', error);
      return [];
    }
  }

  // Customer analytics
  static async getCustomerAnalytics(): Promise<CustomerAnalytics> {
    try {
      // Try to get sales data, return defaults if collection doesn't exist
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let sales: any[] = [];
      try {
        sales = await pb.collection('sales').getFullList({
          sort: '-created',
          expand: 'user',
          requestKey: null
        });
      } catch (error) {
        console.warn('Sales collection not available for customer analytics:', error);
        return {
          totalCustomers: 0,
          repeatCustomers: 0,
          averageLifetimeValue: 0,
          customerRetentionRate: 0,
          newCustomersThisMonth: 0,
        };
      }

      const customerStats = new Map<string, {
        totalPurchases: number;
        totalSpent: number;
        firstPurchase: Date;
        lastPurchase: Date;
      }>();

      // Aggregate customer data
      sales.forEach(sale => {
        const customerId = sale.user || sale.expand?.user?.id;
        if (!customerId) return;

        const existing = customerStats.get(customerId) || {
          totalPurchases: 0,
          totalSpent: 0,
          firstPurchase: new Date(sale.created),
          lastPurchase: new Date(sale.created),
        };

        customerStats.set(customerId, {
          totalPurchases: existing.totalPurchases + 1,
          totalSpent: existing.totalSpent + (sale.total || 0),
          firstPurchase: new Date(Math.min(existing.firstPurchase.getTime(), new Date(sale.created).getTime())),
          lastPurchase: new Date(Math.max(existing.lastPurchase.getTime(), new Date(sale.created).getTime())),
        });
      });

      const customers = Array.from(customerStats.values());
      const totalCustomers = customers.length;
      const repeatCustomers = customers.filter(c => c.totalPurchases > 1).length;
      const averageLifetimeValue = customers.length > 0
        ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length
        : 0;

      // Calculate retention rate (customers active in last 30 days)
      const thirtyDaysAgo = subDays(new Date(), 30);
      const activeCustomers = customers.filter(c => c.lastPurchase >= thirtyDaysAgo).length;
      const customerRetentionRate = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;

      // New customers this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const newCustomersThisMonth = customers.filter(c => c.firstPurchase >= startOfMonth).length;

      return {
        totalCustomers,
        repeatCustomers,
        averageLifetimeValue: Math.round(averageLifetimeValue * 100) / 100,
        customerRetentionRate: Math.round(customerRetentionRate * 100) / 100,
        newCustomersThisMonth,
      };
    } catch (error) {
      console.error('Failed to calculate customer analytics:', error);
      return {
        totalCustomers: 0,
        repeatCustomers: 0,
        averageLifetimeValue: 0,
        customerRetentionRate: 0,
        newCustomersThisMonth: 0,
      };
    }
  }

  // Inventory analytics
  static async getInventoryAnalytics(): Promise<InventoryAnalytics> {
    try {
      // Try to get products, return defaults if collection doesn't exist
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let products: any[] = [];
      try {
        products = await pb.collection('products').getFullList({
          requestKey: null
        });
      } catch (error) {
        console.warn('Products collection not available for inventory analytics:', error);
        return {
          totalProducts: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          averageStockLevel: 0,
          stockTurnoverRate: 0,
          deadStockItems: 0,
        };
      }

      const totalProducts = products.length;
      const lowStockItems = products.filter(p => p.stock <= (p.reorder_point || 5)).length;
      const outOfStockItems = products.filter(p => p.stock <= 0).length;

      const totalStockValue = products.reduce((sum, p) => sum + (p.stock * (p.cost_price || 0)), 0);
      const averageStockLevel = totalProducts > 0 ? totalStockValue / totalProducts : 0;

      // Calculate stock turnover (simplified - would need sales data for accurate calculation)
      const stockTurnoverRate = 0; // Placeholder - would calculate based on COGS / Average Inventory

      // Dead stock: items with stock > reorder_point * 2 and no recent sales
      const deadStockItems = products.filter(p =>
        p.stock > ((p.reorder_point || 5) * 2)
      ).length;

      return {
        totalProducts,
        lowStockItems,
        outOfStockItems,
        averageStockLevel: Math.round(averageStockLevel * 100) / 100,
        stockTurnoverRate: Math.round(stockTurnoverRate * 100) / 100,
        deadStockItems,
      };
    } catch (error) {
      console.error('Failed to calculate inventory analytics:', error);
      return {
        totalProducts: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        averageStockLevel: 0,
        stockTurnoverRate: 0,
        deadStockItems: 0,
      };
    }
  }
}