import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { reportError } from '../utils/errorReporting';
import { PageErrorFallback } from './common/ErrorFallback';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; errorInfo?: React.ErrorInfo; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}


class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo);
  }

  reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Use the centralized error reporting service
    reportError(error, { componentStack: errorInfo.componentStack || undefined }, {
      userId: this.getCurrentUserId(),
      component: 'ErrorBoundary',
      url: window.location.href,
    });
  };

  getCurrentUserId = (): string | null => {
    // Access auth store to get current user ID
    try {
      const { user } = useAuthStore.getState();
      return user?.id || null;
    } catch {
      return null;
    }
  };

  handleRetry = () => {
    // Reset the error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo || undefined}
            retry={this.handleRetry}
          />
        );
      }

      // Use our new PageErrorFallback as the default
      return (
        <PageErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo || undefined}
          retry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}


export default ErrorBoundary;