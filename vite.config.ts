import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Smart Street - Vendor Sourcing Platform',
        short_name: 'Smart Street',
        description: 'Connect street food vendors with trusted suppliers for affordable raw materials',
        theme_color: '#f97316',
        background_color: '#fff7ed',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 3000000, // 3MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.convex\.cloud\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'convex-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],

  build: {
    target: 'es2020',
    // Emit source maps for error tracking without referencing them from the bundle
    sourcemap: 'hidden',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    rollupOptions: {
      output: {
        // Split large, rarely-changing libraries into their own cacheable chunks
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/convex/')) return 'convex-vendor';
          if (/node_modules\/(recharts|d3-|victory-vendor)/.test(id)) return 'charts-vendor';
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },

  // Development server optimizations
  server: {
    hmr: {
      overlay: false,
    },
  },

  // Dependency optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'convex/react'],
    exclude: ['@vite/client', '@vite/env'],
  },

  // Asset handling
  assetsInclude: ['**/*.woff2', '**/*.woff'],

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
