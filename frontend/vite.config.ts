import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: true
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Installs vue-i18n into the global test-utils config so every spec can mount a
    // view that calls useI18n() without registering the plugin itself.
    setupFiles: ['./src/tests/setup.ts'],
  }
})
