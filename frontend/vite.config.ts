/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import path from 'node:path'

export default defineConfig({
  base: '/PORTL/',
  plugins: [
    vue(),
    codeInspectorPlugin({ bundler: 'vite' }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
