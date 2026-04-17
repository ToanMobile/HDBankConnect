import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { App } from './App';
import './styles/globals.css';

// Global TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30s before refetch
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof (error as { status: number }).status === 'number'
        ) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,  // avoid noisy refetches on focus
    },
    mutations: {
      retry: false,
    },
  },
});

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root not found in document');
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />

        {/* Global toast notifications */}
        <Toaster
          position="top-center"
          richColors
          expand
          closeButton
          toastOptions={{
            duration: 2500,
            style: {
              fontSize: '15px',
              padding: '16px 20px',
              minHeight: '64px',
              minWidth: '380px',
              borderRadius: '12px',
              fontWeight: 500,
              boxShadow:
                '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            },
            classNames: {
              toast: 'font-sans',
              title: 'text-[15px] font-semibold',
              description: 'text-sm',
            },
          }}
        />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
