<script setup lang="ts">
import { ref } from 'vue'
import { useChatController } from '@/composables/useWorkspaceChat'
import type { Expert } from '@/mock/experts'

const chat = useChatController()

// 当前进入「提示词案例列表」视图的专家；null 表示网格视图
const activeExpert = ref<Expert | null>(null)

/**
 * hover 展开方向（设计图3规格：前两列向右展开，第3列居中，第4列向左展开）
 */
function hoverAlign(idx: number): string {
  const col = idx % 4
  if (col === 3) return 'right-0'
  if (col === 2) return 'left-1/2 -translate-x-1/2'
  return 'left-0'
}

// 点击专家卡片 → 进入该专家的提示词案例列表
function enterExpert(expert: Expert) {
  activeExpert.value = expert
}

// 点击提示词案例 → 带入输入框并选中该专家（欢迎区自动切回对话输入）
function pickCase(expert: Expert, prompt: string) {
  chat.applyExpertPrompt(expert, prompt)
}
</script>

<template>
  <div>
    <!-- ============ 专家卡片网格视图 ============ -->
    <template v-if="!activeExpert">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div v-for="(expert, idx) in chat.experts" :key="expert.id" class="relative group">
          <!-- 基础卡片 -->
          <button
            type="button"
            class="flex w-full flex-col items-center rounded-xl border border-zinc-200 bg-white p-4 pt-5 text-left transition-all duration-200 hover:border-zinc-300 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
            @click="enterExpert(expert)"
          >
            <!-- 头像 + 角色标签 badge -->
            <div class="relative mb-3">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                :class="expert.avatarColor"
              >
                {{ expert.avatarEmoji }}
              </div>
              <span
                class="absolute -bottom-1.5 -right-2.5 whitespace-nowrap rounded-full border px-1.5 py-px text-[10px] font-medium leading-tight"
                :class="expert.tagColor"
              >
                {{ expert.name }}
              </span>
            </div>

            <!-- 花名 + 专家名称 -->
            <div class="w-full text-center text-sm font-semibold text-zinc-900">{{ expert.nickname }}</div>
            <div class="w-full text-center text-[11px] text-zinc-400">{{ expert.name }}</div>

            <!-- 描述（截断） -->
            <p class="mt-1.5 w-full text-center text-xs leading-relaxed text-zinc-400 line-clamp-2">{{ expert.desc }}</p>
          </button>

          <!-- hover 展开面板（方向性防溢出，显示完整 JD + 场景 + 能力） -->
          <div
            class="pointer-events-none absolute top-0 z-20 hidden w-[280px] rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] group-hover:block"
            :class="hoverAlign(idx)"
          >
            <div class="flex flex-col text-left">
              <!-- 头部 -->
              <div class="mb-2 flex items-center gap-2.5">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl"
                  :class="expert.avatarColor"
                >
                  {{ expert.avatarEmoji }}
                </div>
                <div>
                  <div class="text-sm font-semibold text-zinc-900">{{ expert.nickname }}</div>
                  <div class="text-[11px] text-zinc-400">{{ expert.name }} · {{ expert.gender }}</div>
                </div>
              </div>

              <!-- JD -->
              <p class="text-xs leading-relaxed text-zinc-500">{{ expert.desc }}</p>

              <!-- 场景 -->
              <div class="mt-3">
                <div class="mb-1 text-[11px] font-medium text-zinc-400">适用场景</div>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="s in expert.scenes"
                    :key="s"
                    class="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600"
                  >{{ s }}</span>
                </div>
              </div>

              <!-- 能力 -->
              <div class="mt-2.5">
                <div class="mb-1 text-[11px] font-medium text-zinc-400">具体能力</div>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="c in expert.capabilities"
                    :key="c"
                    class="rounded-md border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-600"
                  >{{ c }}</span>
                </div>
              </div>

              <!-- 提示文字 -->
              <div class="mt-3 text-[11px] font-medium text-indigo-400">点击查看提示词案例 →</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部提示（设计图3 红色提示文字） -->
      <p class="mt-4 text-center text-xs leading-relaxed text-rose-400">
        注：悬停显示展开对应专家卡片，前两列卡片向右展开，最后1列向左展开
      </p>
    </template>

    <!-- ============ 提示词案例列表视图 ============ -->
    <template v-else>
      <!-- 返回 + 头部 -->
      <button
        type="button"
        class="mb-4 flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-900"
        @click="activeExpert = null"
      >
        <span class="text-base leading-none">‹</span> 返回专家列表
      </button>

      <div class="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
          :class="activeExpert.avatarColor"
        >
          {{ activeExpert.avatarEmoji }}
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-base font-semibold text-zinc-900">{{ activeExpert.nickname }}</span>
            <span
              class="rounded-full border px-1.5 py-px text-[10px] font-medium leading-tight"
              :class="activeExpert.tagColor"
            >{{ activeExpert.name }}</span>
          </div>
          <p class="mt-0.5 truncate text-xs text-zinc-400">{{ activeExpert.desc }}</p>
        </div>
      </div>

      <!-- 场景 / 能力 概要 -->
      <div class="mt-3 flex flex-wrap gap-1.5">
        <span
          v-for="s in activeExpert.scenes"
          :key="s"
          class="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600"
        >{{ s }}</span>
        <span
          v-for="c in activeExpert.capabilities"
          :key="c"
          class="rounded-md border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-600"
        >{{ c }}</span>
      </div>

      <!-- 提示词案例列表 -->
      <div class="mt-4 text-xs font-medium text-zinc-400">提示词案例（点击带入对话）</div>
      <div class="mt-2 flex flex-col gap-2">
        <button
          v-for="(p, i) in activeExpert.promptCases"
          :key="i"
          type="button"
          class="group/case flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
          @click="pickCase(activeExpert, p)"
        >
          <span
            class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold"
            :class="activeExpert.tagColor"
          >{{ i + 1 }}</span>
          <span class="text-sm leading-relaxed text-zinc-700 group-hover/case:text-zinc-900">{{ p }}</span>
        </button>
      </div>
    </template>
  </div>
</template>
