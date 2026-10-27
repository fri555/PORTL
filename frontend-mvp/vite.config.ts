/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import { dwsWorkbenchPlugin } from './server/dws-workbench'
import { emailSummaryPlugin } from './server/email-summary'
import { todoExtractionPlugin } from './server/todo-extraction'
import { elementReplacementPlugin } from './server/element-replacement'
import { uploadElementReplacementMedia } from './server/element-replacement-media'

export default defineConfig(({ command, mode }) => {
  const frontendEnv = loadEnv(mode, __dirname, '')
  const backendEnv = loadEnv(mode, path.resolve(__dirname, '../backend'), '')
  return {
  base: frontendEnv.VITE_BASE_PATH || '/PORTL/',
  plugins: [
    vue(),
    dwsWorkbenchPlugin(),
    elementReplacementPlugin({
      storageDir: path.resolve(__dirname, '.local/element-replacement'),
      getConfig: () => {
        const local = loadEnv(mode, __dirname, '')
        const backend = loadEnv(mode, path.resolve(__dirname, '../backend'), '')
        const value = (key: string) => process.env[key] || local[key] || backend[key] || ''
        return {
          apiKey: value('LAS_API_KEY'),
          apiBase: value('LAS_API_BASE') || undefined,
          fileUploadUrl: value('LAS_FILE_UPLOAD_URL') || undefined,
          modelOverrides: {
            ...(value('LAS_MODEL_2_0') ? { 'seedance-2.0': value('LAS_MODEL_2_0') } : {}),
            ...(value('LAS_MODEL_2_0_FAST') ? { 'seedance-2.0-fast': value('LAS_MODEL_2_0_FAST') } : {}),
            ...(value('LAS_MODEL_2_0_MINI') ? { 'seedance-2.0-mini': value('LAS_MODEL_2_0_MINI') } : {}),
          },
        }
      },
      uploadMedia: (config, bytes, name, kind) => uploadElementReplacementMedia(config, bytes, name, kind),
    }),
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
