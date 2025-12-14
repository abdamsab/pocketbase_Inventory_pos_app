import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
  showSkeleton?: boolean;
  variant?: 'spinner' | 'progress' | 'pulse' | 'skeleton';
}

export interface LoadingOptions {
  showSkeleton?: boolean;
  variant?: LoadingState['variant'];
  initialMessage?: string;
  autoHideDelay?: number;
}

export interface LoadingActions {
  start: (message?: string) => void;
  stop: () => void;
  setProgress: (progress: number, message?: string) => void;
  updateMessage: (message: string) => void;
  reset: () => void;
}

// Global loading state manager for app-wide loading
class GlobalLoadingManager {
  private listeners = new Set<(state: LoadingState) => void>();
  private state: LoadingState = {
    isLoading: false,
    variant: 'spinner',
  };

  subscribe(listener: (state: LoadingState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setState(newState: Partial<LoadingState>) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(listener => listener(this.state));
  }

  getState() {
    return this.state;
  }
}

export const globalLoadingManager = new GlobalLoadingManager();

// Hook for component-level loading state
export function useLoadingState(initialOptions: LoadingOptions = {}): [LoadingState, LoadingActions] {
  const {
    showSkeleton = false,
    variant = 'spinner',
    initialMessage = '',
    autoHideDelay,
  } = initialOptions;

  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    showSkeleton,
    variant,
    message: initialMessage,
  });

  const timeoutRef = useRef<number | undefined>(undefined);

  const start = useCallback((message?: string) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      message: message || prev.message,
      progress: undefined,
    }));

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const stop = useCallback(() => {
    if (autoHideDelay) {
      timeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          isLoading: false,
          progress: undefined,
        }));
      }, autoHideDelay);
    } else {
      setState(prev => ({
        ...prev,
        isLoading: false,
        progress: undefined,
      }));
    }
  }, [autoHideDelay]);

  const setProgress = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
      message: message || prev.message,
    }));
  }, []);

  const updateMessage = useCallback((message: string) => {
    setState(prev => ({
      ...prev,
      message,
    }));
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState({
      isLoading: false,
      showSkeleton,
      variant,
      message: initialMessage,
      progress: undefined,
    });
  }, [showSkeleton, variant, initialMessage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const actions: LoadingActions = {
    start,
    stop,
    setProgress,
    updateMessage,
    reset,
  };

  return [state, actions];
}

// Hook for async operations with automatic loading state
export function useAsyncLoading<T>(
  asyncFn: () => Promise<T>,
  options: LoadingOptions & {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    enabled?: boolean;
  } = {}
) {
  const {
    onSuccess,
    onError,
    enabled = true,
    ...loadingOptions
  } = options;

  const [loadingState, loadingActions] = useLoadingState(loadingOptions);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    if (!enabled) return;

    loadingActions.start('Loading...');
    setError(null);

    try {
      const result = await asyncFn();
      setData(result);
      onSuccess?.(result);
      loadingActions.stop();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
      loadingActions.stop();
    }
  }, [asyncFn, enabled, loadingActions, onSuccess, onError]);

  return {
    data,
    error,
    loadingState,
    loadingActions,
    execute,
    isLoading: loadingState.isLoading,
  };
}

// Hook for global app loading state
export function useGlobalLoading() {
  const [state, setState] = useState(globalLoadingManager.getState());

  useEffect(() => {
    return globalLoadingManager.subscribe(setState);
  }, []);

  const actions: LoadingActions = {
    start: (message?: string) => globalLoadingManager.setState({
      isLoading: true,
      message,
      variant: 'spinner',
    }),
    stop: () => globalLoadingManager.setState({ isLoading: false }),
    setProgress: (progress: number, message?: string) => globalLoadingManager.setState({
      progress,
      message,
    }),
    updateMessage: (message: string) => globalLoadingManager.setState({ message }),
    reset: () => globalLoadingManager.setState({
      isLoading: false,
      progress: undefined,
      message: undefined,
    }),
  };

  return [state, actions] as const;
}

// Hook for managing multiple loading states
export function useMultiLoadingState(loaders: Record<string, LoadingState>) {
  const isAnyLoading = Object.values(loaders).some(loader => loader.isLoading);
  const overallProgress = Object.values(loaders).reduce((sum, loader) => {
    return sum + (loader.progress || 0);
  }, 0) / Object.keys(loaders).length;

  const messages = Object.values(loaders)
    .filter(loader => loader.message)
    .map(loader => loader.message);

  return {
    isLoading: isAnyLoading,
    progress: overallProgress,
    messages,
    loaders,
  };
}

// Loading context provider for complex loading hierarchies
export function useLoadingContext() {
  const [loadingStack, setLoadingStack] = useState<Array<{
    id: string;
    state: LoadingState;
  }>>([]);

  const pushLoading = useCallback((id: string, state: LoadingState) => {
    setLoadingStack(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing) {
        return prev.map(item =>
          item.id === id ? { ...item, state } : item
        );
      }
      return [...prev, { id, state }];
    });
  }, []);

  const popLoading = useCallback((id: string) => {
    setLoadingStack(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearLoading = useCallback(() => {
    setLoadingStack([]);
  }, []);

  const isLoading = loadingStack.some(item => item.state.isLoading);
  const currentMessage = loadingStack.find(item => item.state.message)?.state.message;

  return {
    loadingStack,
    isLoading,
    currentMessage,
    pushLoading,
    popLoading,
    clearLoading,
  };
}

// Utility function to wrap async operations with loading state
export function withLoading<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  loadingActions: LoadingActions,
  options: {
    message?: string;
    onSuccess?: (result: R) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  return async (...args: T): Promise<R> => {
    const { message = 'Loading...', onSuccess, onError } = options;

    loadingActions.start(message);

    try {
      const result = await fn(...args);
      onSuccess?.(result);
      loadingActions.stop();
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      loadingActions.stop();
      throw err;
    }
  };
}