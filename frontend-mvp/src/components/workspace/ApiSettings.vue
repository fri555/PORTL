<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAIChat, type ModelProvider } from '@/composables/useAIChat'
import { Settings, X, Key, Server, Bot, Play } from 'lucide-vue-next'

const { config, updateConfig, isApiConfigured } = useAIChat()

const isOpen = ref(false)
const localConfig = ref({ ...config.value })

watch(() => config.value, (v) => { localConfig.value = { ...v } }, { deep: true })

function save() {
  updateConfig({
    provider: localConfig.value.provider,
    apiKey: localConfig.value.apiKey,
    apiBase: localConfig.value.apiBase,
    model: localConfig.value.model,
  })
  isOpen.value = false
}

const providers: { value: ModelProvider; label: string }[] = [
  { value: 'simulated', label: '模拟模式（演示用）' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'openai-compatible', label: '兼容 OpenAI 接口' },
]
</script>

<template>
  <!-- Trigger button -->
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition"
    :class="
      isApiConfigured()
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
    "
    :title="isApiConfigured() ? `已配置 API：${config.model}` : '点击配置 AI 接口'"
    @click="isOpen = true"
  >
    <Settings class="h-3.5 w-3.5" />
    {{ isApiConfigured() ? 'API' : '设置' }}
  </button>

  <!-- Dialog -->
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm"
      @click.self="isOpen = false"
    >
      <div class="w-full max-w-md rounded-2xl border border-white/40 bg-white shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div class="flex items-center gap-2.5">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Key class="h-4 w-4" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-zinc-950">AI 接口配置</h2>
              <p class="text-xs text-zinc-500">连接真实模型或使用模拟模式</p>
            </div>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            @click="isOpen = false"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Form -->
        <div class="space-y-4 px-5 py-4">
          <!-- Provider -->
          <label class="block">
            <span class="text-sm font-medium text-zinc-700">模型提供商</span>
            <select
              v-model="localConfig.provider"
              class="mt-1.5 block h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option v-for="p in providers" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </label>

          <template v-if="localConfig.provider !== 'simulated'">
            <!-- API Base -->
            <label class="block">
              <span class="flex items-center gap-1.5 text-sm font-medium text-zinc-700">
                <Server class="h-3.5 w-3.5" />
                API 地址
              </span>
              <input
                v-model="localConfig.apiBase"
                class="mt-1.5 block h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="https://api.anthropic.com/v1"
              />
            </label>

            <!-- API Key -->
            <label class="block">
              <span class="flex items-center gap-1.5 text-sm font-medium text-zinc-700">
                <Key class="h-3.5 w-3.5" />
                API Key
              </span>
              <input
                v-model="localConfig.apiKey"
                type="password"
                class="mt-1.5 block h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-mono"
                placeholder="sk-ant-... 或 sk-..."
              />
              <p class="mt-1 text-xs text-zinc-400">
                Key 仅保存在浏览器 localStorage，不会上传到服务器
              </p>
            </label>

            <!-- Model -->
            <label class="block">
              <span class="flex items-center gap-1.5 text-sm font-medium text-zinc-700">
                <Bot class="h-3.5 w-3.5" />
                模型
              </span>
              <input
                v-model="localConfig.model"
                class="mt-1.5 block h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="claude-sonnet-4-6"
              />
            </label>
          </template>

          <!-- Simulated mode note -->
          <div v-else class="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
            <p class="font-medium">📋 模拟模式</p>
            <p class="mt-1 leading-relaxed">
              使用预设的思考链和示例回复，适合演示和原型验证。切换为真实 API 后可连接您的模型。
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <button
            type="button"
            class="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            @click="isOpen = false"
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            @click="save"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
