interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId: string | null;
  userRole?: string;
  additionalData?: Record<string, unknown>;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId: string | null;
  userRole?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent: string;
  sessionId?: string;
  complianceFlags?: string[]; // GDPR, SOX, HIPAA, etc.
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ErrorReportingConfig {
  enableConsoleLogging: boolean;
  enableExternalReporting: boolean;
  externalServiceUrl?: string;
  apiKey?: string;
}

class ErrorReportingService {
  private config: ErrorReportingConfig = {
    enableConsoleLogging: true,
    enableExternalReporting: false,
  };

  private errorQueue: ErrorReport[] = [];
  private auditLogQueue: AuditLogEntry[] = [];
  private isReporting = false;
  private isAuditing = false;

  configure(config: Partial<ErrorReportingConfig>) {
    this.config = { ...this.config, ...config };
  }

  reportError(
    error: Error,
    errorInfo?: { componentStack?: string },
    additionalData?: Record<string, unknown>
  ) {
    const { user } = this.getCurrentUser();

    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: user?.id || null,
      userRole: user?.role,
      additionalData,
    };

    // Add to queue for batch processing
    this.errorQueue.push(errorReport);

    // Log to console if enabled
    if (this.config.enableConsoleLogging) {
      console.error('Error Report:', errorReport);
    }

    // Report to external service if configured
    if (this.config.enableExternalReporting) {
      this.reportToExternalService(errorReport);
    }

    // Process queue (with debouncing to avoid spam)
    this.processErrorQueue();
  }

  private async reportToExternalService(errorReport: ErrorReport) {
    if (!this.config.externalServiceUrl) return;

    try {
      const response = await fetch(this.config.externalServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(errorReport),
      });

      if (!response.ok) {
        console.warn('Failed to report error to external service:', response.statusText);
      }
    } catch (fetchError) {
      console.warn('Error reporting failed:', fetchError);
    }
  }

  private processErrorQueue() {
    if (this.isReporting || this.errorQueue.length === 0) return;

    this.isReporting = true;

    // Process errors in batches to avoid overwhelming external services
    setTimeout(() => {
      const batchSize = 5;
      this.errorQueue.splice(0, batchSize);

      // Here you could implement batch reporting to external services
      // For now, we'll just mark as processed

      this.isReporting = false;

      // Continue processing if more errors in queue
      if (this.errorQueue.length > 0) {
        this.processErrorQueue();
      }
    }, 1000); // Debounce for 1 second
  }

  private getCurrentUser(): { user: { id: string; role: string } | null } {
    // User information will be passed from ErrorBoundary component
    // to avoid circular dependencies with auth store
    return { user: null };
  }

  // Utility method to create user-friendly error messages
  static createUserFriendlyMessage(error: Error): string {
    // Map technical errors to user-friendly messages
    const errorMappings: Record<string, string> = {
      'NetworkError': 'Network connection failed. Please check your internet connection.',
      'TimeoutError': 'Request timed out. Please try again.',
      'ValidationError': 'Some information was entered incorrectly. Please check and try again.',
      'AuthenticationError': 'Authentication failed. Please log in again.',
      'AuthorizationError': 'You don\'t have permission to perform this action.',
    };

    // Check for common error patterns
    const lowerMessage = error.message.toLowerCase();

    for (const [key, message] of Object.entries(errorMappings)) {
      if (lowerMessage.includes(key.toLowerCase()) || error.name === key) {
        return message;
      }
    }

    // Check for HTTP status codes in message
    const statusMatch = error.message.match(/(\d{3})/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1]);
      switch (status) {
        case 400: return 'Invalid request. Please check your input.';
        case 401: return 'Authentication required. Please log in.';
        case 403: return 'Access denied. You don\'t have permission.';
        case 404: return 'The requested resource was not found.';
        case 429: return 'Too many requests. Please wait and try again.';
        case 500: return 'Server error. Please try again later.';
        case 503: return 'Service temporarily unavailable. Please try again later.';
      }
    }

    // Return original message if no mapping found
    return error.message || 'An unexpected error occurred. Please try again.';
  }

  // Get error statistics for debugging
  getErrorStats() {
    const stats = {
      totalErrors: this.errorQueue.length,
      errorsByType: {} as Record<string, number>,
      recentErrors: this.errorQueue.slice(-10), // Last 10 errors
    };

    this.errorQueue.forEach(error => {
      const errorType = error.message.split(':')[0] || 'Unknown';
      stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;
    });

    return stats;
  }

  // Clear error queue (useful for testing or manual cleanup)
  clearErrorQueue() {
    this.errorQueue = [];
  }

  // Audit logging methods
  logAuditEvent(
    action: string,
    resource: string,
    resourceId?: string,
    details: Record<string, unknown> = {},
    severity: AuditLogEntry['severity'] = 'low'
  ) {
    const { user } = this.getCurrentUser();

    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      action,
      resource,
      resourceId,
      userId: user?.id || null,
      userRole: user?.role,
      details,
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
      complianceFlags: this.determineComplianceFlags(action, resource),
      severity,
    };

    // Add to audit queue
    this.auditLogQueue.push(auditEntry);

    // Log to console if enabled
    if (this.config.enableConsoleLogging) {
      console.log('Audit Log:', auditEntry);
    }

    // Process audit queue
    this.processAuditQueue();
  }

  private determineComplianceFlags(action: string, resource: string): string[] {
    const flags: string[] = [];

    // GDPR compliance for personal data operations
    if (resource === 'users' || resource === 'customers') {
      if (['create', 'update', 'delete', 'view'].includes(action)) {
        flags.push('GDPR');
      }
    }

    // SOX compliance for financial operations
    if (resource === 'sales' || resource === 'financial_records') {
      if (['create', 'update', 'delete'].includes(action)) {
        flags.push('SOX');
      }
    }

    // General audit trail
    if (['create', 'update', 'delete'].includes(action) && resource !== 'logs') {
      flags.push('AUDIT');
    }

    // HIPAA for health-related data (if applicable)
    if (resource.includes('health') || resource.includes('medical')) {
      flags.push('HIPAA');
    }

    return flags;
  }

  private getClientIP(): string {
    // This is a simplified implementation
    // In a real application, you'd get this from the server
    return 'client-ip-not-available';
  }

  private getSessionId(): string {
    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  private processAuditQueue() {
    if (this.isAuditing || this.auditLogQueue.length === 0) return;

    this.isAuditing = true;

    // Process audit logs - store locally and optionally send to external service
    setTimeout(() => {
      const batchSize = 10;
      const batch = this.auditLogQueue.splice(0, batchSize);

      // Store in localStorage for persistence (in production, use IndexedDB)
      this.storeAuditLogsLocally(batch);

      // Send to external audit service if configured
      if (this.config.enableExternalReporting) {
        this.reportAuditLogsToExternalService(batch);
      }

      this.isAuditing = false;

      // Continue processing if more logs in queue
      if (this.auditLogQueue.length > 0) {
        this.processAuditQueue();
      }
    }, 500); // Process every 500ms
  }

  private storeAuditLogsLocally(logs: AuditLogEntry[]) {
    try {
      const existingLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
      const updatedLogs = [...existingLogs, ...logs];

      // Keep only last 1000 entries to prevent storage bloat
      if (updatedLogs.length > 1000) {
        updatedLogs.splice(0, updatedLogs.length - 1000);
      }

      localStorage.setItem('auditLogs', JSON.stringify(updatedLogs));
    } catch (error) {
      console.warn('Failed to store audit logs locally:', error);
    }
  }

  private async reportAuditLogsToExternalService(logs: AuditLogEntry[]) {
    if (!this.config.externalServiceUrl) return;

    try {
      const response = await fetch(`${this.config.externalServiceUrl}/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify({ logs }),
      });

      if (!response.ok) {
        console.warn('Failed to report audit logs to external service:', response.statusText);
      }
    } catch (error) {
      console.warn('Audit log reporting failed:', error);
    }
  }

  // Get audit logs for compliance and reporting
  getAuditLogs(options: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    action?: string;
    resource?: string;
    limit?: number;
  } = {}): AuditLogEntry[] {
    try {
      const allLogs: AuditLogEntry[] = JSON.parse(localStorage.getItem('auditLogs') || '[]');

      return allLogs.filter(log => {
        if (options.startDate && log.timestamp < options.startDate) return false;
        if (options.endDate && log.timestamp > options.endDate) return false;
        if (options.userId && log.userId !== options.userId) return false;
        if (options.action && log.action !== options.action) return false;
        if (options.resource && log.resource !== options.resource) return false;
        return true;
      }).slice(-(options.limit || 100)); // Return most recent logs
    } catch (error) {
      console.warn('Failed to retrieve audit logs:', error);
      return [];
    }
  }

  // Get audit statistics
  getAuditStats() {
    const logs = this.getAuditLogs();
    const stats = {
      totalLogs: logs.length,
      logsByAction: {} as Record<string, number>,
      logsByResource: {} as Record<string, number>,
      logsBySeverity: {} as Record<string, number>,
      complianceFlags: {} as Record<string, number>,
      recentActivity: logs.slice(-10),
    };

    logs.forEach(log => {
      stats.logsByAction[log.action] = (stats.logsByAction[log.action] || 0) + 1;
      stats.logsByResource[log.resource] = (stats.logsByResource[log.resource] || 0) + 1;
      stats.logsBySeverity[log.severity] = (stats.logsBySeverity[log.severity] || 0) + 1;

      if (log.complianceFlags) {
        log.complianceFlags.forEach(flag => {
          stats.complianceFlags[flag] = (stats.complianceFlags[flag] || 0) + 1;
        });
      }
    });

    return stats;
  }

  // Clear audit logs
  clearAuditLogs() {
    this.auditLogQueue = [];
    localStorage.removeItem('auditLogs');
  }
}

// Create singleton instance
export const errorReporting = new ErrorReportingService();

// Export types and utilities
export type { ErrorReport, ErrorReportingConfig, AuditLogEntry };
export { ErrorReportingService };

// Convenience function for quick error reporting
export const reportError = (
  error: Error,
  errorInfo?: { componentStack?: string },
  additionalData?: Record<string, unknown>
) => {
  errorReporting.reportError(error, errorInfo, additionalData);
};

// React error boundary integration
export const createErrorBoundaryHandler = (componentName: string) => {
  return (error: Error, errorInfo: React.ErrorInfo) => {
    reportError(error, { componentStack: errorInfo.componentStack || undefined }, {
      component: componentName,
      errorBoundary: true,
    });
  };
};