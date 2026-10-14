import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API runs on :3000 and requests to /api are passed
// through, so the client uses the same /api/v1 address as in production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
  build: {
    chunkSizeWarningLimit: 700,
    outDir: 'dist',
    rollupOptions: {
      output: {
        // the big libraries in their own files, so a code change does not bust them
        manualChunks: { antd: ['antd', '@ant-design/icons'], editor: ['react-quill'], react: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
});
