import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
        manualChunks: { antd: ['antd', '@ant-design/icons'], editor: ['react-quill-new'], react: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
});
