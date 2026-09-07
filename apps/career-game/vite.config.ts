import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://raaulc.com/career-game/ (static, no backend).
export default defineConfig({
  base: '/career-game/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
