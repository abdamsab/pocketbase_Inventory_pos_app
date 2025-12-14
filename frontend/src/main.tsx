import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { NotificationProvider } from './components/common/NotificationToast'
import { offlineManager } from './lib/offlineManager'

console.log('🚀 Main.tsx: Starting app initialization...');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

console.log('📱 Main.tsx: Creating React root...');
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Main.tsx: Root element not found!');
  throw new Error('Root element not found');
}

console.log('🔄 Main.tsx: Rendering app...');
createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)

console.log('📡 Main.tsx: Initializing offline capabilities...');
// Initialize offline capabilities
offlineManager.registerServiceWorker().catch(console.error);
