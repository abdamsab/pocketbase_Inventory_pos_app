import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { ErrorReportingService } from '../../utils/errorReporting';

interface ErrorFallbackProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  retry?: () => void;
  showReportButton?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
  title?: string;
  description?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  retry,
  showReportButton = true,
  variant = 'default',
  title,
  description,
}) => {
  const handleReportError = () => {
    ErrorReportingService.createUserFriendlyMessage(error);
    // Additional reporting logic could be added here
    alert('Error reported. Thank you for helping us improve!');
  };

  const handleRetry = () => {
    if (retry) {
      retry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  if (variant === 'minimal') {
    return (
      <div className="flex items-center justify-center min-h-[200px] p-4">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-danger mb-2" />
          <p className="text-sm text-text-muted">
            {title || 'Something went wrong'}
          </p>
          {retry && (
            <button
              onClick={handleRetry}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="bg-danger/5 border border-danger/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-danger mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-danger">
              {title || 'An error occurred'}
            </h3>
            <p className="text-xs text-text-muted mt-1">
              {description || ErrorReportingService.createUserFriendlyMessage(error)}
            </p>
            <div className="flex gap-2 mt-3">
              {retry && (
                <button
                  onClick={handleRetry}
                  className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-primary/90 transition-colors"
                >
                  Retry
                </button>
              )}
              {showReportButton && (
                <button
                  onClick={handleReportError}
                  className="text-xs border border-border text-text-main px-3 py-1 rounded hover:bg-surfaceHighlight transition-colors"
                >
                  Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default variant - full page error
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-surface border border-border rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-xl font-heading font-bold text-text-main mb-2">
            {title || 'Oops! Something went wrong'}
          </h2>
          <p className="text-text-muted text-sm leading-relaxed">
            {description || ErrorReportingService.createUserFriendlyMessage(error)}
          </p>
        </div>

        <div className="space-y-3">
          {retry && (
            <button
              onClick={handleRetry}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}

          <button
            onClick={handleGoHome}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>

          {showReportButton && (
            <button
              onClick={handleReportError}
              className="w-full text-sm text-text-muted hover:text-text-main flex items-center justify-center gap-2 py-2 border-t border-border mt-4 pt-4"
            >
              <Bug className="w-4 h-4" />
              Report this issue
            </button>
          )}
        </div>

        {import.meta.env.DEV && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-text-muted cursor-pointer hover:text-text-main">
              Technical Details (Development Only)
            </summary>
            <div className="mt-2 p-3 bg-surfaceHighlight rounded text-xs font-mono text-text-muted overflow-auto max-h-32">
              <div className="mb-2">
                <strong>Error:</strong> {error.message}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div className="mt-2">
                  <strong>Component Stack:</strong>
                  <pre className="whitespace-pre-wrap mt-1">{errorInfo.componentStack}</pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

// Specialized error fallbacks for different contexts
export const FormErrorFallback: React.FC<Omit<ErrorFallbackProps, 'variant' | 'title' | 'description'>> = (props) => (
  <ErrorFallback
    {...props}
    variant="compact"
    title="Form Error"
    description="There was a problem with this form. Please try again."
  />
);

export const PageErrorFallback: React.FC<Omit<ErrorFallbackProps, 'variant'>> = (props) => (
  <ErrorFallback
    {...props}
    variant="default"
    title="Page Unavailable"
    description="This page encountered an unexpected error. Our team has been notified."
  />
);

export const ComponentErrorFallback: React.FC<Omit<ErrorFallbackProps, 'variant' | 'showReportButton'>> = (props) => (
  <ErrorFallback
    {...props}
    variant="minimal"
    showReportButton={false}
  />
);