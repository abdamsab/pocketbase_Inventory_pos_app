import { useState, useMemo } from 'react';
import { useAuditLogManagement, type AuditLogEntry } from '../../hooks/useAuditLog';
import {
  Filter, Download, Eye, AlertTriangle, Shield,
  Activity, Database, X
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLogFilters {
  action?: string;
  resource?: string;
  userId?: string;
  severity?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  complianceFlag?: string;
}

const severityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const statusColors = {
  success: 'bg-green-100 text-green-800',
  failure: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
};

const actionIcons = {
  create: Database,
  update: Activity,
  delete: X,
  view: Eye,
  login: Shield,
  logout: Shield,
  export: Download,
  import: Download,
};

export function AuditLog() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const {
    auditLogs,
    isLoading,
    error,
    loadMore,
    hasMore,
    stats,
    exportLogs,
  } = useAuditLogManagement({
    filters,
    limit: 50,
  });

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (filters.action && log.action !== filters.action) return false;
      if (filters.resource && log.resource !== filters.resource) return false;
      if (filters.userId && log.user_id !== filters.userId) return false;
      if (filters.severity && log.severity !== filters.severity) return false;
      if (filters.status && log.status !== filters.status) return false;
      if (filters.complianceFlag && !log.compliance_flags?.includes(filters.complianceFlag)) return false;
      return true;
    });
  }, [auditLogs, filters]);

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleExport = async (format: 'csv' | 'json') => {
    await exportLogs(format, filters);
  };

  if (isLoading && auditLogs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-heading font-bold text-text-main">Audit Logs</h2>
            <p className="text-text-muted">Security and compliance audit trail</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-heading font-bold text-text-main">Audit Logs</h2>
            <p className="text-text-muted">Security and compliance audit trail</p>
          </div>
        </div>
        <div className="text-center py-12 text-danger">
          <AlertTriangle size={48} className="mx-auto mb-4" />
          <p>Failed to load audit logs</p>
          <p className="text-sm mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-main">Audit Logs</h2>
          <p className="text-text-muted">Security and compliance audit trail</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary"
          >
            <Filter size={16} className="mr-2" />
            Filters
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="btn-secondary"
          >
            <Download size={16} className="mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Database size={24} />
            </div>
            <div>
              <p className="text-text-muted text-sm">Total Logs</p>
              <p className="text-2xl font-bold text-text-main">{stats?.totalLogs || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <p className="text-text-muted text-sm">Success Rate</p>
              <p className="text-2xl font-bold text-text-main">
                {(stats?.totalLogs || 0) > 0
                  ? Math.round(((stats?.logsByStatus?.success || 0) / (stats?.totalLogs || 1)) * 100)
                  : 0
                }%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-text-muted text-sm">Warnings</p>
              <p className="text-2xl font-bold text-text-main">{stats?.logsByStatus?.warning || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-text-muted text-sm">Critical Events</p>
              <p className="text-2xl font-bold text-text-main">{stats?.logsBySeverity?.critical || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-text-main mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Action</label>
              <select
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-main"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="view">View</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Resource</label>
              <select
                value={filters.resource || ''}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-main"
              >
                <option value="">All Resources</option>
                <option value="products">Products</option>
                <option value="sales">Sales</option>
                <option value="users">Users</option>
                <option value="settings">Settings</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Severity</label>
              <select
                value={filters.severity || ''}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-main"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-main"
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="warning">Warning</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-text-muted hover:text-text-main"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surfaceHighlight/30 text-xs uppercase text-text-muted font-medium">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Resource</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log) => {
                const ActionIcon = actionIcons[log.action as keyof typeof actionIcons] || Activity;
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-surfaceHighlight transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-6 py-4 text-sm text-text-main">
                      {format(new Date(log.created), 'MMM dd, HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ActionIcon size={16} className="text-text-muted" />
                        <span className="text-sm font-medium capitalize">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-main">
                      {log.resource}
                      {log.resource_id && (
                        <span className="text-text-muted ml-1">({log.resource_id})</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-main">
                      {log.user_id ? `User ${log.user_id}` : 'System'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityColors[log.severity as keyof typeof severityColors]}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[log.status as keyof typeof statusColors]}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="text-primary hover:text-primaryHover"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="p-4 border-t border-border text-center">
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="btn-secondary"
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="text-xl font-heading font-bold text-text-main">Audit Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-text-muted hover:text-text-main"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted">Action</label>
                  <p className="text-text-main capitalize">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted">Resource</label>
                  <p className="text-text-main">{selectedLog.resource}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted">Timestamp</label>
                  <p className="text-text-main">{format(new Date(selectedLog.created), 'PPpp')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted">User</label>
                  <p className="text-text-main">{selectedLog.user_id || 'System'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted">Severity</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityColors[selectedLog.severity as keyof typeof severityColors]}`}>
                    {selectedLog.severity}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted">Status</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedLog.status as keyof typeof statusColors]}`}>
                    {selectedLog.status}
                  </span>
                </div>
              </div>

              {selectedLog.details && (
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Details</label>
                  <pre className="bg-surfaceHighlight p-3 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.compliance_flags && selectedLog.compliance_flags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Compliance Flags</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedLog.compliance_flags.map((flag: string) => (
                      <span key={flag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.error_message && (
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Error Message</label>
                  <p className="text-danger bg-danger/10 p-3 rounded-lg">{selectedLog.error_message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}