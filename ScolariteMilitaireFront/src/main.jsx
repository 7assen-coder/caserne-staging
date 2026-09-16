import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import './i18n';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';
import { LocaleProvider } from './context/LocaleContext.jsx';
import { queryClient } from './lib/queryClient';
import ErrorBoundary from './components/common/ErrorBoundary';
import StagingBanner from './components/common/StagingBanner';
import { initSentry } from './lib/sentry';

initSentry();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <StagingBanner />
                  <ErrorBoundary homeTo="/dashboard">
                    <App />
                  </ErrorBoundary>
                </ConfirmProvider>
              </ToastProvider>
            </AuthProvider>
            {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
          </QueryClientProvider>
        </ThemeProvider>
      </LocaleProvider>
    </BrowserRouter>
  </StrictMode>,
);
