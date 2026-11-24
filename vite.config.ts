import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://<user>.github.io/smart-transport-info-system/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/smart-transport-info-system/' : '/',
  plugins: [react()],
});
