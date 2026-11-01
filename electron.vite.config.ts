import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: {},
  preload: {
    build: {
      rollupOptions: {
        input: { index: 'src/preload/index.ts', settings: 'src/preload/settings.ts' },
      },
    },
  },
  renderer: {
    plugins: [react()],
  },
});
