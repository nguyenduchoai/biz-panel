import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-semi': ['@douyinfe/semi-ui', '@douyinfe/semi-icons'],
          'vendor-query': ['@tanstack/react-query'],
          // Page chunks - lazy loaded
          'pages-core': [
            './src/pages/Dashboard.tsx',
            './src/pages/Websites.tsx',
            './src/pages/Databases.tsx',
          ],
          'pages-docker': [
            './src/pages/Docker.tsx',
            './src/pages/Projects.tsx',
          ],
          'pages-ops': [
            './src/pages/Files.tsx',
            './src/pages/Logs.tsx',
            './src/pages/Terminal.tsx',
            './src/pages/Cron.tsx',
          ],
          'pages-software': [
            './src/pages/Software.tsx',
            './src/pages/PHP.tsx',
            './src/pages/SSL.tsx',
            './src/pages/Services.tsx',
          ],
          'pages-extras': [
            './src/pages/Security.tsx',
            './src/pages/AppStore.tsx',
            './src/pages/Settings.tsx',
          ],
        },
      },
    },
    // Increase chunk size warning limit since we're manually chunking
    chunkSizeWarningLimit: 600,
  },
})
