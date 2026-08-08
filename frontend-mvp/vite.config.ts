/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import { dwsWorkbenchPlugin } from './server/dws-workbench'
import { emailSummaryPlugin } from './server/email-summary'
import { todoExtractionPlugin } from './server/todo-extraction'

export default defineConfig(({ command, mode }) => {
  const frontendEnv = loadEnv(mode, __dirname, '')
  const backendEnv = loadEnv(mode, path.resolve(__dirname, '../backend'), '')
  return {
  base: frontendEnv.VITE_BASE_PATH || '/PORTL/',
  plugins: [
    vue(),
    dwsWorkbenchPlugin(),
    todoExtractionPlugin({
      aiApiKey: frontendEnv.AI_API_KEY || backendEnv.AI_API_KEY,
      aiApiBase: frontendEnv.AI_API_BASE || backendEnv.AI_API_BASE,
      aiModel: frontendEnv.DEFAULT_AI_MODEL || backendEnv.DEFAULT_AI_MODEL,
    }),
    emailSummaryPlugin({
      host: frontendEnv.EXMAIL_IMAP_HOST,
      port: frontendEnv.EXMAIL_IMAP_PORT || frontendEnv.PORT,
      secure: frontendEnv.EXMAIL_IMAP_SECURE || frontendEnv.SECURE,
      username: frontendEnv.EXMAIL_IMAP_USERNAME || frontendEnv.USERNAME,
      password: frontendEnv.EXMAIL_IMAP_PASSWORD || frontendEnv.PASSWORD,
      mailbox: frontendEnv.EXMAIL_IMAP_MAILBOX || frontendEnv.MAILBOX,
      aiApiKey: frontendEnv.AI_API_KEY || backendEnv.AI_API_KEY,
      aiApiBase: frontendEnv.AI_API_BASE || backendEnv.AI_API_BASE,
      aiModel: frontendEnv.DEFAULT_AI_MODEL || backendEnv.DEFAULT_AI_MODEL,
    }),
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
  }
})
