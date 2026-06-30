<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import QRCode from 'qrcode'
import { RefreshCw, CheckCircle2, Loader2, Smartphone } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'

const emit = defineEmits<{ success: [] }>()

const { status, scan, confirmMock, reset } = useAuth()
const qrDataUrl = ref('')

async function genQR() {
  const state = Math.random().toString(36).slice(2, 10)
  const url = `https://login.dingtalk.com/oauth2/auth?client_id=mock_tianma&redirect_uri=https://ai.tianma.com/auth/callback&response_type=code&scope=openid&prompt=consent&state=${state}`
  qrDataUrl.value = await QRCode.toDataURL(url, {
    width: 232,
    margin: 1,
    color: { dark: '#1f2937', light: '#ffffff' },
  })
}

function onQRClick() {
  if (status.value === 'pending') scan()
}

function onRefresh() {
  reset()
  genQR()
}

onMounted(genQR)

watch(status, (s) => {
  if (s === 'confirmed') {
    setTimeout(() => emit('success'), 500)
  }
})
</script>

<template>
  <div class="flex flex-col items-center">
    <div
      class="group relative cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition-all"
      :class="status === 'scanned' || status === 'confirmed' ? 'border-primary' : 'border-border hover:shadow-md'"
      @click="onQRClick"
    >
      <img v-if="qrDataUrl" :src="qrDataUrl" alt="钉钉登录二维码" class="h-[232px] w-[232px]" />
      <div v-else class="flex h-[232px] w-[232px] items-center justify-center">
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <!-- DingTalk logo overlay -->
      <div class="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-white shadow ring-1 ring-black/5">
        <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none">
          <path d="M12 2L3 13h6l-2 9 11-13h-6l2-7z" fill="#1677FF" />
        </svg>
      </div>

      <!-- scanned/confirmed overlay -->
      <div
        v-if="status === 'scanned' || status === 'confirmed'"
        class="absolute inset-3 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/85 backdrop-blur-sm"
      >
        <CheckCircle2 v-if="status === 'confirmed'" class="h-12 w-12 text-primary" />
        <Loader2 v-else class="h-12 w-12 animate-spin text-primary" />
        <p class="text-sm font-medium text-foreground">
          {{ status === 'confirmed' ? '登录成功' : '扫描成功' }}
        </p>
      </div>
    </div>

    <!-- status copy -->
    <div class="mt-5 flex items-center gap-2 text-sm">
      <Smartphone v-if="status === 'pending'" class="h-4 w-4 text-muted-foreground" />
      <Loader2 v-else-if="status === 'scanned'" class="h-4 w-4 animate-spin text-primary" />
      <CheckCircle2 v-else class="h-4 w-4 text-primary" />
      <span :class="status === 'pending' ? 'text-muted-foreground' : 'font-medium text-foreground'">
        <template v-if="status === 'pending'">请使用 钉钉 扫描二维码登录</template>
        <template v-else-if="status === 'scanned'">扫描成功，请在钉钉上确认</template>
        <template v-else>登录成功，正在跳转…</template>
      </span>
    </div>

    <!-- actions -->
    <div class="mt-4 flex items-center gap-3 text-xs">
      <button class="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground" @click="onRefresh">
        <RefreshCw class="h-3.5 w-3.5" /> 刷新二维码
      </button>
      <span class="text-muted-foreground/40">·</span>
      <button
        v-if="status === 'pending'"
        class="flex items-center gap-1 font-medium text-primary transition-colors hover:text-primary/80"
        @click="confirmMock"
      >
        模拟扫码登录
      </button>
      <span v-else class="text-muted-foreground/40">演示模式</span>
    </div>
  </div>
</template>
