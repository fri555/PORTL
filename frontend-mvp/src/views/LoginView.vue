<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { Zap, ShieldCheck, TrendingUp, Sparkles } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import DingTalkQR from '@/components/auth/DingTalkQR.vue'

const store = useAppStore()
const router = useRouter()
const route = useRoute()

function onSuccess() {
  store.login()
  const redirect = (route.query.redirect as string) || '/'
  router.replace(redirect)
}

const features = [
  { icon: TrendingUp, title: '业务价值驱动', desc: 'AI成果可视化，数据说话' },
  { icon: ShieldCheck, title: '知己知彼', desc: '竞对情报实时追踪' },
  { icon: Sparkles, title: '全员进化', desc: '培训+排名激发参与' },
]
</script>

<template>
  <div data-testid="login-screen" class="flex min-h-screen w-screen overflow-hidden bg-white">
    <!-- brand panel -->
    <div class="relative hidden w-[36vw] min-w-[360px] flex-col justify-between bg-gradient-to-br from-primary to-orange-600 p-10 text-white md:flex">
      <div class="flex items-center gap-2">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
          <Zap class="h-5 w-5" />
        </span>
        <span class="text-xl font-bold">天马AI</span>
      </div>

      <div>
        <h1 class="text-3xl font-bold leading-tight">AI 驱动<br />全员进化</h1>
        <p class="mt-3 text-sm text-white/80">南京天马集团 · 智能工作门户</p>

        <ul class="mt-8 space-y-4">
          <li v-for="f in features" :key="f.title" class="flex items-start gap-3">
            <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <component :is="f.icon" class="h-4 w-4" />
            </span>
            <div>
              <p class="text-sm font-semibold">{{ f.title }}</p>
              <p class="text-xs text-white/70">{{ f.desc }}</p>
            </div>
          </li>
        </ul>
      </div>

      <p class="text-xs text-white/60">© 2026 南京天马集团</p>
    </div>

    <!-- login panel -->
    <div class="flex min-w-0 flex-1 flex-col items-center justify-center px-8 py-12">
      <div class="mb-6 text-center md:hidden">
        <div class="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap class="h-6 w-6" />
        </div>
      </div>
      <h2 class="mb-1 text-xl font-bold">钉钉扫码登录</h2>
      <p class="mb-8 text-sm text-muted-foreground">使用钉钉 App 扫描下方二维码</p>

      <DingTalkQR @success="onSuccess" />

      <p class="mt-8 text-center text-xs text-muted-foreground">
        登录即同意<a class="text-primary hover:underline">《服务条款》</a>与<a class="text-primary hover:underline">《隐私政策》</a>
      </p>
      <p class="mt-1 text-center text-[11px] text-muted-foreground/60">Demo：点击二维码或"模拟扫码登录"即可进入</p>
    </div>
  </div>
</template>
