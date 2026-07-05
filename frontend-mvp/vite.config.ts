/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { codeInspectorPlugin } from 'code-inspector-plugin'

export default defineConfig({
  base: '/PORTL/',
  plugins: [
    vue(),
    codeInspectorPlugin({ bundler: 'vite' }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5176,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
