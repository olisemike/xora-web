import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import removeConsole from 'vite-plugin-remove-console';

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    mode === 'production' && removeConsole(),
  ].filter(Boolean),
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    hmr: {
      port: 3000,
      host: 'localhost',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        cookieDomainRewrite: {
          '*': '',
        },
        cookiePathRewrite: {
          '*': '/',
        },
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyRes', (proxyRes) => {
            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
              console.log('Cookies received from backend:', setCookie.length, 'cookies');
            }
          });
        },
      },
      '/notifications/stream': {
        target: 'ws://localhost:8787',
        ws: true,
        changeOrigin: true,
        headers: {
          Cookie: '',
        },
        configure: (proxy) => {
          proxy.on('proxyReqWs', (proxyReq, req) => {
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie);
            }
          });
        },
      },
      '/chat/global': {
        target: 'ws://localhost:8787',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 700,
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('i18next')) return 'vendor-i18n';
          if (id.includes('@sentry')) return 'vendor-sentry';
          return 'vendor-misc';
        },
      },
    },
  },
}));
