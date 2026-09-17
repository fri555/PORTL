<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  ArrowUp,
  CalendarPlus,
  CalendarSearch,
  Check,
  ChevronDown,
  ClipboardCheck,
  Database,
  Globe2,
  Menu,
  MessageSquareText,
  PenLine,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-vue-next'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const prompt = ref('')
const productionHomeAssetBase = `${import.meta.env.BASE_URL}assets/production-home`
const expertAvatar = `${import.meta.env.BASE_URL}assets/agents-online/data-analysis.png`
const sidebarOpen = ref(false)
const searchOpen = ref(false)
const modeOpen = ref(false)
const selectedMode = ref('日常办公')
const messages = ref<Message[]>([])
const inputEl = ref<HTMLTextAreaElement | null>(null)
const nextId = ref(1)

const dailyHistories = [
  { title: '', time: '2026-08-11 15:19' },
  { title: '', time: '2026-08-11 15:19' },
  { title: '知识库中查下关于「鞋服配」的内容，并输出一份报告', time: '2026-08-11 14:54' },
  { title: '搜索知识库中关于鞋服配的内容', time: '2026-08-11 10:56' },
  { title: '给「朝暮」发条钉钉消息：「早上好」', time: '2026-08-11 10:48' },
]

const expertHistories = [
  { title: '经营数据分析', time: '2026-08-10 16:34' },
  { title: '需求池分析', time: '2026-08-10 16:10' },
  { title: '商品池分析', time: '2026-08-10 15:45' },
  { title: '分层盘点商品池动销、库存、毛利数据', time: '2026-08-10 12:14' },
  { title: '分析需求池数据表，制作可视化报告', time: '2026-08-10 12:12' },
]

const cases = [
  { title: '发消息', text: '给「花名」发条钉钉消息：「内容」（拼音模糊搜索）', icon: MessageSquareText },
  { title: '建待办', text: '给我建个钉钉待办：「标题」「内容」，「时间」前完成（拼音模糊搜索）', icon: ClipboardCheck },
  { title: '建日程', text: '跟「花名」约钉钉会议：「园区」空会议室，「时间时长」开「主题」会（拼音模糊搜索）', icon: CalendarPlus },
  { title: '查日程', text: '查下我今天的钉钉日程', icon: CalendarSearch },
  { title: '查知识库', text: '知识库中查下关于「关键词」的内容，并输出一份报告', icon: Database },
  { title: '网络查询', text: '网上查下关于「关键词」的内容，并生成一份报告', icon: Globe2 },
]

const hasConversation = computed(() => messages.value.length > 0)

function newConversation() {
  messages.value = []
  prompt.value = ''
  sidebarOpen.value = false
  nextTick(() => inputEl.value?.focus())
}

function useCase(text: string) {
  prompt.value = text
  nextTick(() => inputEl.value?.focus())
}

function send() {
  const content = prompt.value.trim()
  if (!content) return
  messages.value.push({ id: nextId.value++, role: 'user', content })
  prompt.value = ''
  window.setTimeout(() => {
    messages.value.push({
      id: nextId.value++,
      role: 'assistant',
      content: `已收到“${content}”。我会结合天马业务知识与当前上下文，为你整理一份可直接使用的结果。`,
    })
  }, 260)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    send()
  }
}
</script>

<template>
  <main class="relative min-h-[calc(100vh-57px)] overflow-hidden bg-white text-[#111]">
    <img :src="`${productionHomeAssetBase}/welcome-glow-left.png`" alt="" class="pointer-events-none absolute bottom-0 left-0 w-[810px] opacity-45" />
    <img :src="`${productionHomeAssetBase}/welcome-glow-right.png`" alt="" class="pointer-events-none absolute bottom-0 right-0 w-[810px] opacity-45" />
    <aside
      v-if="sidebarOpen"
      class="absolute inset-y-0 left-0 z-20 w-[270px] overflow-hidden border-r border-[#ececec] bg-white"
      data-testid="home-sidebar-subheader"
    >
      <div class="flex h-[60px] items-center gap-0.5 px-4">
        <button aria-label="搜索" class="grid h-8 w-8 place-items-center rounded-lg hover:bg-[#f5f5f5]" @click="searchOpen = true"><Search class="h-[18px] w-[18px]" /></button>
        <button aria-label="折叠侧栏" class="grid h-8 w-8 place-items-center rounded-lg hover:bg-[#f5f5f5]" @click="sidebarOpen = false"><Menu class="h-[18px] w-[18px]" /></button>
      </div>
      <button aria-label="新对话" class="mx-3 flex h-9 w-[246px] items-center justify-center gap-2 rounded-lg bg-[#111] text-sm text-white" @click="newConversation">
        <PenLine class="h-4 w-4" />新对话
      </button>
      <div class="mt-4 h-[calc(100%-112px)] overflow-hidden px-3 pb-5">
        <button class="flex h-9 w-full items-center justify-between rounded-lg px-3 text-xs text-[#777] hover:bg-[#f6f6f6]"><span>日常办公</span><span class="text-[11px] text-[#aaa]">查看更多</span></button>
        <div v-for="(item, index) in dailyHistories" :key="`daily-${index}`" class="group flex h-16 items-center gap-2 rounded-lg px-2 hover:bg-[#f7f7f7]">
          <span class="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#ededed] bg-white text-[#888]"><MessageSquareText class="h-4 w-4" /><i class="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-[#75df51] ring-2 ring-white" /></span>
          <span class="min-w-0 flex-1"><strong class="block truncate text-sm font-normal text-[#333]">{{ item.title || ' ' }}</strong><small class="mt-1 block text-xs text-[#aaa]">{{ item.time }}</small></span>
          <button aria-label="更多" class="grid h-5 w-5 shrink-0 place-items-center text-[#999] opacity-0 group-hover:opacity-100">···</button>
        </div>
        <button class="mt-3 flex h-9 w-full items-center justify-between rounded-lg px-3 text-xs text-[#777] hover:bg-[#f6f6f6]"><span>专家模式</span><span class="text-[11px] text-[#aaa]">查看更多</span></button>
        <div v-for="item in expertHistories" :key="item.title" class="group flex h-16 items-center gap-2 rounded-lg px-2 hover:bg-[#f7f7f7]">
          <img :src="expertAvatar" alt="" class="h-10 w-10 shrink-0 rounded-full object-cover" />
          <span class="min-w-0 flex-1"><strong class="block truncate text-sm font-normal text-[#333]">{{ item.title }}</strong><small class="mt-1 block text-xs text-[#aaa]">{{ item.time }}</small></span>
          <button aria-label="更多" class="grid h-5 w-5 shrink-0 place-items-center text-[#999] opacity-0 group-hover:opacity-100">···</button>
        </div>
      </div>
    </aside>

    <div v-if="!sidebarOpen" class="absolute left-4 top-[15px] z-10 flex items-center gap-0.5" data-testid="home-side-dock">
      <button data-testid="home-sidebar-toggle" aria-label="展开历史对话栏" class="grid h-8 w-8 place-items-center rounded-lg hover:bg-[#f5f5f5]" @click="sidebarOpen = true"><Menu class="h-[18px] w-[18px]" /></button>
      <button aria-label="搜索对话" class="grid h-8 w-8 place-items-center rounded-lg hover:bg-[#f5f5f5]" @click="searchOpen = true"><Search class="h-[18px] w-[18px]" /></button>
      <button aria-label="新建对话" class="grid h-8 w-8 place-items-center rounded-lg hover:bg-[#f5f5f5]" @click="newConversation"><PenLine class="h-[18px] w-[18px]" /></button>
    </div>

    <section class="absolute inset-y-0 right-0 flex flex-col items-center pb-6 pt-[165px] transition-[left]" :class="sidebarOpen ? 'left-[270px]' : 'left-0'" data-testid="home-hero-section">
      <div class="flex w-[800px] max-w-[calc(100vw-32px)] flex-col">
      <template v-if="!hasConversation">
        <div class="relative text-center">
          <img :src="`${productionHomeAssetBase}/welcome-slogan.png`" alt="职场超能力，小马让你快人一步" class="mx-auto h-[42px] w-[420px] object-contain" />
          <img :src="`${productionHomeAssetBase}/mascot-xiaoma.png`" alt="小马智能助手" class="absolute right-3 -top-2 h-[100px] w-[100px] object-contain" />
        </div>
      </template>

      <div v-else class="mb-6 flex-1 space-y-6 overflow-y-auto px-2 md:px-10">
        <div v-for="message in messages" :key="message.id" class="flex" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
          <div v-if="message.role === 'assistant'" class="mr-3 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#111] text-white"><Sparkles class="h-4 w-4" /></div>
          <div class="max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6" :class="message.role === 'user' ? 'bg-[#f1f1f1] text-[#222]' : 'bg-white text-[#333]'">{{ message.content }}</div>
        </div>
      </div>

      <div class="relative mt-6" data-testid="hero-composer">
        <div class="rounded-[16px] border border-[#dedede] bg-white p-[11px] shadow-[0_10px_34px_rgba(0,0,0,.04)] focus-within:border-[#b7b7b7]">
          <textarea
            ref="inputEl"
            v-model="prompt"
            aria-label="向小马提问"
            rows="2"
            class="block h-[100px] min-h-0 w-full resize-none border-0 bg-transparent p-0 text-sm leading-6 outline-none placeholder:text-[#b8b8b8]"
            placeholder="小马在线，随时向我提问或上传文件..."
            @keydown="handleKeydown"
          />
          <div class="mt-3 flex h-9 items-center justify-between">
            <div class="flex items-center gap-2">
              <button aria-label="添加内容" class="grid h-8 w-8 place-items-center rounded-lg text-[#333] hover:bg-[#f5f5f5]"><Plus class="h-[19px] w-[19px]" /></button>
              <button aria-label="选择模式" class="flex h-8 w-28 items-center justify-center gap-1 rounded-lg text-xs text-[#555] hover:bg-[#f5f5f5]" @click="modeOpen = !modeOpen">
                <Sparkles class="h-4 w-4" />{{ selectedMode }}<ChevronDown class="h-3.5 w-3.5" />
              </button>
              <button class="flex h-8 w-24 items-center justify-center gap-1.5 rounded-lg bg-[#eef5ff] text-xs text-[#3b75d6]"><Globe2 class="h-4 w-4" />联网查询</button>
            </div>
            <button aria-label="发送给小马" class="grid h-9 w-9 place-items-center rounded-full bg-[#111] text-white transition disabled:bg-[#d7d7d7]" :disabled="!prompt.trim()" @click="send"><ArrowUp class="h-4 w-4" /></button>
          </div>
        </div>
        <div v-if="modeOpen" class="absolute bottom-[54px] left-10 z-20 w-[300px] rounded-xl border border-[#e7e7e7] bg-white p-2 shadow-xl">
          <button v-for="mode in [{ name: '日常办公', detail: '适合日常轻度办公任务' }, { name: '专家模式', detail: '处理复杂的专项任务' }]" :key="mode.name" class="flex w-full items-center rounded-lg px-3 py-2 text-left hover:bg-[#f6f6f6]" @click="selectedMode = mode.name; modeOpen = false">
            <span><strong class="block text-sm font-medium">{{ mode.name }}</strong><small class="mt-0.5 block text-[11px] text-[#999]">{{ mode.detail }}</small></span><Check v-if="selectedMode === mode.name" class="ml-auto h-4 w-4" />
          </button>
        </div>
      </div>

      <div v-if="!hasConversation" class="mx-[19px] mt-8 grid grid-cols-3 gap-3" data-testid="home-case-section">
        <button v-for="item in cases" :key="item.title" class="flex min-h-[74px] items-center gap-3 rounded-xl border border-[#ededed] bg-white px-4 py-3 text-left transition hover:border-[#d5d5d5] hover:shadow-sm" @click="useCase(item.text)">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f7f7f7]"><component :is="item.icon" class="h-[18px] w-[18px] text-[#333]" /></span>
          <span class="min-w-0"><span class="block text-sm font-medium">{{ item.title }}</span><span class="mt-1 block truncate text-xs text-[#999]">{{ item.text }}</span></span>
        </button>
      </div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="searchOpen" class="fixed inset-0 z-50 flex items-start justify-center bg-black/20 px-4 pt-[14vh]" @click.self="searchOpen = false">
        <div class="w-full max-w-xl rounded-2xl bg-white p-4 shadow-2xl">
          <div class="flex items-center gap-3 border-b border-[#eee] pb-3">
            <Search class="h-5 w-5 text-[#777]" />
            <input autofocus class="flex-1 border-0 text-sm outline-none" placeholder="搜索历史对话" />
            <button aria-label="关闭搜索" @click="searchOpen = false"><X class="h-4 w-4" /></button>
          </div>
          <div class="py-8 text-center text-sm text-[#aaa]">输入关键词查找历史对话</div>
        </div>
      </div>
    </Teleport>
  </main>
</template>
