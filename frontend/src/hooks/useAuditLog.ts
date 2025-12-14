import { useState, useCallback } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import { errorReporting } from '../utils/errorReporting';

export interface AuditLogEntry {
  id: string;
  created: string;
  updated: string;
  action: string;
  resource: string;
  resource_id?: string;
  user_id?: string;
  user_role?: string;
  details?: Record<string, unknown>;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  compliance_flags?: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failure' | 'warning';
  error_message?: string;
  processing_time_ms?: number;
  business_impact?: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface AuditLogFilters {
  action?: string;
  resource?: string;
  userId?: string;
  severity?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  complianceFlag?: string;
  limit?: number;
}

export interface AuditLogStats {
  totalLogs: number;
  logsByAction: Record<string, number>;
  logsByResource: Record<string, number>;
  logsBySeverity: Record<string, number>;
  logsByStatus: Record<string, number>;
  complianceFlags: Record<string, number>;
  recentActivity: AuditLogEntry[];
}

// Hook for fetching audit logs with pagination
export function useAuditLog(options: {
  filters?: AuditLogFilters;
  limit?: number;
  enabled?: boolean;
} = {}) {
  const { filters = {}, limit = 50, enabled = true } = options;

  const query = useInfiniteQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const filterParts: string[] = [];

        if (filters.action) filterParts.push(`action = "${filters.action}"`);
        if (filters.resource) filterParts.push(`resource = "${filters.resource}"`);
        if (filters.userId) filterParts.push(`user_id = "${filters.userId}"`);
        if (filters.severity) filterParts.push(`severity = "${filters.severity}"`);
        if (filters.status) filterParts.push(`status = "${filters.status}"`);
        if (filters.startDate) filterParts.push(`created >= "${filters.startDate}"`);
        if (filters.endDate) filterParts.push(`created <= "${filters.endDate}"`);
        if (filters.complianceFlag) {
          filterParts.push(`compliance_flags ~ "${filters.complianceFlag}"`);
        }

        const filterString = filterParts.join(' && ');

        const result = await pb.collection('audit_logs').getList(pageParam, limit, {
          filter: filterString || undefined,
          sort: '-created',
          expand: 'user_id',
        });

        return {
          data: result.items as unknown as AuditLogEntry[],
          nextPage: result.page < result.totalPages ? result.page + 1 : null,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
        };
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        errorReporting.reportError(error instanceof Error ? error : new Error('Failed to fetch audit logs'));
        throw error;
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    enabled,
  });

  const auditLogs = query.data?.pages.flatMap(page => page.data) || [];
  const hasMore = query.hasNextPage;
  const loadMore = useCallback(() => {
    if (hasMore && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [hasMore, query]);

  return {
    auditLogs,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    error: query.error,
    loadMore,
    hasMore,
    refetch: query.refetch,
  };
}

// Hook for audit log statistics
export function useAuditLogStats(options: {
  enabled?: boolean;
} = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['audit-logs', 'stats'],
    queryFn: async (): Promise<AuditLogStats> => {
      try {
        // Get recent logs for stats
        const recentLogs = await pb.collection('audit_logs').getList(1, 1000, {
          sort: '-created',
          fields: 'action,resource,severity,status,compliance_flags,created',
        });

        const logs = recentLogs.items as unknown as AuditLogEntry[];

        const stats: AuditLogStats = {
          totalLogs: recentLogs.totalItems,
          logsByAction: {},
          logsByResource: {},
          logsBySeverity: {},
          logsByStatus: {},
          complianceFlags: {},
          recentActivity: logs.slice(0, 10),
        };

        logs.forEach(log => {
          // Count by action
          stats.logsByAction[log.action] = (stats.logsByAction[log.action] || 0) + 1;

          // Count by resource
          stats.logsByResource[log.resource] = (stats.logsByResource[log.resource] || 0) + 1;

          // Count by severity
          stats.logsBySeverity[log.severity] = (stats.logsBySeverity[log.severity] || 0) + 1;

          // Count by status
          stats.logsByStatus[log.status] = (stats.logsByStatus[log.status] || 0) + 1;

          // Count compliance flags
          if (log.compliance_flags) {
            log.compliance_flags.forEach(flag => {
              stats.complianceFlags[flag] = (stats.complianceFlags[flag] || 0) + 1;
            });
          }
        });

        return stats;
      } catch (error) {
        console.error('Failed to fetch audit log stats:', error);
        errorReporting.reportError(error instanceof Error ? error : new Error('Failed to fetch audit log stats'));
        throw error;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for creating audit log entries
export function useCreateAuditLog() {
  const createLog = useCallback(async (logData: Omit<AuditLogEntry, 'id' | 'created' | 'updated'>) => {
    try {
      const record = await pb.collection('audit_logs').create(logData);
      return record;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      errorReporting.reportError(error instanceof Error ? error : new Error('Failed to create audit log'));
      throw error;
    }
  }, []);

  return { createLog };
}

// Hook for audit log export functionality
export function useAuditLogExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportLogs = useCallback(async (
    format: 'csv' | 'json',
    filters: AuditLogFilters = {}
  ) => {
    setIsExporting(true);

    try {
      // Build filter string
      const filterParts: string[] = [];
      if (filters.action) filterParts.push(`action = "${filters.action}"`);
      if (filters.resource) filterParts.push(`resource = "${filters.resource}"`);
      if (filters.userId) filterParts.push(`user_id = "${filters.userId}"`);
      if (filters.severity) filterParts.push(`severity = "${filters.severity}"`);
      if (filters.status) filterParts.push(`status = "${filters.status}"`);
      if (filters.startDate) filterParts.push(`created >= "${filters.startDate}"`);
      if (filters.endDate) filterParts.push(`created <= "${filters.endDate}"`);

      const filterString = filterParts.join(' && ');

      // Fetch all matching logs
      const allLogs: AuditLogEntry[] = [];
      let page = 1;
      const perPage = 1000;

      while (true) {
        const result = await pb.collection('audit_logs').getList(page, perPage, {
          filter: filterString || undefined,
          sort: '-created',
        });

        allLogs.push(...(result.items as unknown as AuditLogEntry[]));

        if (page >= result.totalPages) break;
        page++;
      }

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `audit-logs-${timestamp}`;

      if (format === 'csv') {
        // Convert to CSV
        const headers = [
          'Timestamp',
          'Action',
          'Resource',
          'Resource ID',
          'User ID',
          'User Role',
          'Severity',
          'Status',
          'IP Address',
          'Compliance Flags',
          'Error Message',
        ];

        const rows = allLogs.map(log => [
          log.created,
          log.action,
          log.resource,
          log.resource_id || '',
          log.user_id || '',
          log.user_role || '',
          log.severity,
          log.status,
          log.ip_address || '',
          log.compliance_flags?.join('; ') || '',
          log.error_message || '',
        ]);

        // Create CSV content
        const csvContent = [headers, ...rows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

      } else if (format === 'json') {
        // Download JSON
        const jsonContent = JSON.stringify(allLogs, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

    } catch (error) {
      console.error('Failed to export audit logs:', error);
      errorReporting.reportError(error instanceof Error ? error : new Error('Failed to export audit logs'));
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportLogs, isExporting };
}

// Combined hook for audit log management
export function useAuditLogManagement(options: {
  filters?: AuditLogFilters;
  limit?: number;
  enabled?: boolean;
} = {}) {
  const auditLog = useAuditLog(options);
  const stats = useAuditLogStats({ enabled: options.enabled });
  const { createLog } = useCreateAuditLog();
  const { exportLogs, isExporting } = useAuditLogExport();

  return {
    // Data
    auditLogs: auditLog.auditLogs,
    stats: stats.data,

    // Loading states
    isLoading: auditLog.isLoading || stats.isLoading,
    isFetchingNextPage: auditLog.isFetchingNextPage,

    // Errors
    error: auditLog.error || stats.error,

    // Actions
    loadMore: auditLog.loadMore,
    hasMore: auditLog.hasMore,
    refetch: auditLog.refetch,
    createLog,
    exportLogs,
    isExporting,
  };
}