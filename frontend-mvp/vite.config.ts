/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { codeInspectorPlugin } from 'code-inspector-plugin'

export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE_PATH || '/PORTL/',
  plugins: [
    vue(),
    ...(command === 'serve' && !process.env.VITEST
      ? [codeInspectorPlugin({ bundler: 'vite' })]
      : []),
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
}))
