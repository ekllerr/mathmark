import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // makes the app installable and usable without a connection
    VitePWA({
      // a new version waits until the reader agrees to reload: see UpdateNotice
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Mathmark',
        short_name: 'Mathmark',
        description: 'A math-first markdown editor: write notes, and the math in them is evaluated, rendered and plotted.',
        start_url: '/mathmark/',
        scope: '/mathmark/',
        display: 'standalone',
        background_color: '#0e0e14',
        theme_color: '#14141e',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // the app itself is stored when it is first opened; KaTeX ships each font in three formats, one is enough
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Plotly (about 5 MB) and the PDF code are stored the first time they are used instead
        globIgnores: ['**/plotly*.js', '**/exportPdf*.js', '**/html2canvas*.js', '**/purify*.js', '**/index.es*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes('/assets/'),
            handler: 'CacheFirst',
            options: { cacheName: 'mathmark-assets' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'mathmark-font-styles' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'mathmark-fonts', cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  base: "/mathmark/",
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
