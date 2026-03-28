import './index.css';
import './styles/global.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import './i18n/config';
import { registerServiceWorker, unregisterServiceWorker, trackAppInstall } from './utils/pwa';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { AppDataProvider } from './contexts/AppDataContext';
import { ToastProvider } from './components/Toast';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { BlockProvider } from './contexts/BlockContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    sendDefaultPii: true,
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (import.meta.env.DEV) return null;
      return event;
    },
  });
}

if (import.meta.env.PROD) {
  registerServiceWorker();
} else {
  unregisterServiceWorker();
}

trackAppInstall();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <WebSocketProvider>
            <AppDataProvider>
              <BlockProvider>
                <ToastProvider>
                  <AccessibilityProvider>
                    <App />
                  </AccessibilityProvider>
                </ToastProvider>
              </BlockProvider>
            </AppDataProvider>
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
