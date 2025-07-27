import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
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
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
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
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 3
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  
  // Build optimizations
  build: {
    // Enable source maps for production debugging
    sourcemap: process.env.NODE_ENV === 'production' ? 'hidden' : true,
    
    // Target modern browsers for better optimization
    target: 'es2020',
    
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor'
            }
            if (id.includes('react-router')) {
              return 'router-vendor'
            }
            if (id.includes('@clerk/clerk-react')) {
              return 'clerk-vendor'
            }
            if (id.includes('convex')) {
              return 'convex-vendor'
            }
            if (id.includes('recharts')) {
              return 'charts-vendor'
            }
            return 'vendor'
          }
          
          // Feature-based chunks
          if (id.includes('/components/Supplier')) {
            return 'supplier-features'
          }
          if (id.includes('/components/Order')) {
            return 'order-features'
          }
          if (id.includes('/components/Group')) {
            return 'group-order-features'
          }
          if (id.includes('/components/Financial') || id.includes('/components/Analytics')) {
            return 'financial-features'
          }
          if (id.includes('/components/Message') || id.includes('/components/Communication')) {
            return 'communication-features'
          }
          
          // Core UI chunks
          if (id.includes('/components/Layout') || 
              id.includes('/components/ErrorBoundary') || 
              id.includes('/components/OfflineManager')) {
            return 'ui-core'
          }
        },
        
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          const info = (assetInfo.name || '').split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },
        
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js'
      }
    },
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log', 'console.info'] : []
      },
      mangle: {
        safari10: true
      }
    },
    
    // Asset optimization
    assetsInlineLimit: 4096, // 4kb
    chunkSizeWarningLimit: 500, // 500kb warning
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Enable CSS minification
    cssMinify: true,
    
    // Report compressed size
    reportCompressedSize: true,
    
    // Optimize for production
    ...(process.env.NODE_ENV === 'production' && {
      rollupOptions: {
        // ...(this.build?.rollupOptions || {}),
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false
        }
      }
    })
  },
  
  // Development server optimizations
  server: {
    hmr: {
      overlay: false
    }
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@clerk/clerk-react',
      'convex/react',
      'convex/react-clerk'
    ],
    exclude: ['@vite/client', '@vite/env']
  },
  
  // Asset handling
  assetsInclude: ['**/*.woff2', '**/*.woff'],
  
  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})
