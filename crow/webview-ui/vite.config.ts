import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': `${__dirname}/src`,
    },
  },
  build: {
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/main.js',
        assetFileNames: `assets/[name].[ext]`,
      },
    },
    target: 'modules',
  },
  plugins: [react()],
});
