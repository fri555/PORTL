<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChatController } from '@/composables/useWorkspaceChat'
import { CheckCircle2, Loader2, Plug2, QrCode, ShieldCheck, X } from 'lucide-vue-next'
import DingTalkQR from '@/components/auth/DingTalkQR.vue'

const chat = useChatController()

type DwsAuthStatus = 'unauthorized' | 'authorizing' | 'authorized'

const authStatus = ref<DwsAuthStatus>('unauthorized')
const showQrPopup = ref(false)

const statusLabel = computed(() => {
  const map: Record<DwsAuthStatus, string> = {
    unauthorized: '未授权',
    authorizing: '授权中',
    authorized: '已授权',
  }
  return map[authStatus.value]
})

const statusTone = computed(() => {
  const map: Record<DwsAuthStatus, string> = {
    unauthorized: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    authorizing: 'bg-amber-50 text-amber-700 border-amber-200',
    authorized: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }
  return map[authStatus.value]
})

function openAuth() {
  showQrPopup.value = true
  authStatus.value = 'authorizing'
}

function closeAuth() {
  showQrPopup.value = false
}

function onQrSuccess() {
  authStatus.value = 'authorized'
  showQrPopup.value = false
  // 自动发送授权完成消息到对话
  chat.handleSend('我已经完成dws扫码授权，继续任务')
}

function onAlreadyAuthorized() {
  authStatus.value = 'authorized'
  chat.handleSend('我已经完成dws扫码授权，继续任务')
}
</script>

<template>
  <!-- DWS 授权状态指示器 + 两个操作按钮 -->
  <div class="inline-flex items-center gap-1.5">
    <!-- 状态标识 -->
    <span
      class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
      :class="statusTone"
    >
      <Plug2 v-if="authStatus === 'unauthorized'" class="h-3 w-3" />
      <Loader2 v-else-if="authStatus === 'authorizing'" class="h-3 w-3 animate-spin" />
      <ShieldCheck v-else class="h-3 w-3" />
      {{ statusLabel }}
    </span>

    <!-- 去授权按钮 -->
    <button
      v-if="authStatus !== 'authorized'"
      type="button"
      class="inline-flex h-6 items-center gap-1 rounded-full border border-[#1769e0] bg-white px-2.5 text-[10px] font-medium text-[#1769e0] transition hover:bg-[#eef4ff]"
      @click="openAuth"
    >
      <QrCode class="h-3 w-3" />
      去授权
    </button>

    <!-- 已授权按钮 -->
    <button
      v-if="authStatus === 'authorizing'"
      type="button"
      class="inline-flex h-6 items-center gap-1 rounded-full bg-[#1769e0] px-2.5 text-[10px] font-medium text-white transition hover:bg-[#0f5fce]"
      @click="onAlreadyAuthorized"
    >
      <CheckCircle2 class="h-3 w-3" />
      已授权
    </button>
  </div>

  <!-- QR 扫码授权弹窗（子窗口） -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showQrPopup"
        class="fixed inset-0 z-[300] flex items-center justify-center"
        @click.self="closeAuth"
      >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div class="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <!-- 关闭按钮 -->
          <button
            type="button"
            class="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
            @click="closeAuth"
          >
            <X class="h-4 w-4" />
          </button>

          <!-- 标题 -->
          <div class="mb-5 text-center">
            <div class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf2ff] text-[#1769e0]">
              <Plug2 class="h-5 w-5" />
            </div>
            <h3 class="text-base font-semibold text-zinc-900">钉钉 DWS 授权</h3>
            <p class="mt-1 text-xs text-zinc-400">扫码授权后，Agent 可操作你的钉钉日程、待办、消息等</p>
          </div>

          <!-- QR 码区域 -->
          <DingTalkQR @success="onQrSuccess" />

          <!-- 底部提示 -->
          <div class="mt-4 rounded-lg bg-zinc-50 px-3 py-2 text-center text-[10px] leading-4 text-zinc-400">
            授权后 Token 将加密存储在服务端，30 天内无需重复授权
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
