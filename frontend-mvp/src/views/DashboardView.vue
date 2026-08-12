<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main class="min-h-[calc(100vh-57px)] bg-white px-6 py-7 md:px-[8.1vw]">
    <section class="max-w-[760px]">
      <h1 class="text-[18px] font-semibold text-[#111]">无访问权限</h1>
      <p class="mt-2 text-sm text-[#999]">当前账号无权打开该页面</p>

      <div class="mt-14 flex flex-wrap items-center gap-2 text-base text-[#666]">
        <span>如需访问，请联系管理员在权限中心配置菜单。</span>
        <span>原地址：</span>
        <code class="rounded-md bg-[#f6f6f6] px-3 py-2 text-sm text-[#333]">/dashboards</code>
      </div>

      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="rounded-lg bg-[#111] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2b2b2b]" @click="$router.go(0)">
          刷新权限并重试
        </button>
        <button type="button" class="rounded-lg border border-[#d9d9d9] bg-white px-5 py-2.5 text-sm font-medium text-[#222] hover:bg-[#fafafa]" @click="router.push('/')">
          返回可用页面
        </button>
      </div>
    </section>
  </main>
</template>
