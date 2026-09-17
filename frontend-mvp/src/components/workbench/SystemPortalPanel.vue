<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowUpRight, BriefcaseBusiness, Upload } from 'lucide-vue-next'
import WorkbenchBoardHeader from './WorkbenchBoardHeader.vue'
import { useAppStore } from '@/stores/app'
import { workbenchPortals } from '@/mock/workbench'
import type { WorkbenchPortal } from '@/types/workbench'

const store = useAppStore()
const router = useRouter()
const query = ref('')
const logoInput = ref<HTMLInputElement | null>(null)
const uploadingId = ref('')
const logos = ref<Record<string, string>>({})
const props = defineProps<{ refreshing?: boolean }>()
const emit = defineEmits<{ refresh: [] }>()

const filteredPortals = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return workbenchPortals
  return workbenchPortals.filter((portal) => [portal.name, portal.description, portal.department, portal.architecture, portal.url, portal.accessHint ?? ''].join(' ').toLowerCase().includes(keyword))
})

const abbreviations: Record<string, string> = {
  '自营系统': '自营', '自营第三方库存系统': '三方', '财务供销系统': '供销', '新运营系统': '运营', '自营api接口系统': 'API',
  '自营拼多多服务商第三方服务中转': '多多', '拼多多平台接口项目': '多多', '淘宝平台接口项目': '淘宝', '会员CDP': 'CDP', '直播系统': '直播',
  '数据驾驶舱/观远BI': '观远', '幸运叶子系统': '幸运', '工单系统': '工单', '盘古BI系统': '盘古', '天马运动管理端': '运动',
  '天马运动CRM': 'CRM', '天马运动SRM': 'SRM', '天马运动马达端PC': '马达', '天马运动马达端开放平台(旧版)': '马达', '天马运动马达端开放平台(新版)': '马达',
  '天马运动马达端APP': '马达', '天马运动马达端小程序': '马达', '天马运动供应商端': '货源', '天马运动供应商端开放平台': '货源', '天马论坛前台系统': '论坛',
  '天马论坛管理后台': '论坛', '大库存查询系统': '库存', '内容中心系统': '内容', '商品中心系统': '商品', '极光分析': '极光',
  '财务进销存系统': '财务', '仓储系统': 'WMS', '仓储代运营系统': 'WMS', '流星马管理端': '茵特', '流星马租户端': '茵特',
  '流星马POS端': '茵特', '流星马商户端': '茵特', '流星马代理端': '茵特', '流星马代理收银端': '茵特', '流星马自营和加盟端': '茵特',
  '流星马自营和加盟收银端': '茵特', '天马企微助手': '企微', '优选定制系统': '优选', '天团1号PC': '天团', '天团1号小程序': '天团',
  '短信平台': '短信', '团购平台': '团购', '团购小程序': '团购', '团购平台管理后台': '团购', '幸运叶子企微助手': '幸运',
  '幸运叶子小程序': '幸运', '幸运叶子APP': '幸运', '幸运叶子收银POS系统': 'POS', '幸运叶子移动收银APP': '收银', '幸运运动汇小程序/后台': '运动',
  '斑马邦H5商城': '斑马', '江苏跑团小程序': '跑团', '江苏跑团管理后台': '跑团', '中国龙协小程序': '龙协', '耶运动PC官网': '耶运',
  '耶运动官网CMS中心': '耶运', '集团官网': '官网', 'OA系统': 'OA', '禅道': '禅道', '禅道工时统计': '禅道',
  '需求管理系统': '需求', '垂钓平台代理端': '垂钓', '垂钓平台管理端': '垂钓', '垂钓APP后台管理': '垂钓', '钓愉APP': '钓愉',
  '响猫小程序': '响猫', '江苏主播人才库': '人才', '茵特加盟招商官网': '茵特', '订单中心': '订单', '天之捷商户服务': '技术',
  '老版本的crm_web': '旧版', '苏体项目': '苏体',
}

function portalAbbreviation(portal: WorkbenchPortal) {
  return abbreviations[portal.name] ?? portal.name.replace(/系统|平台|管理|后台|端/g, '').slice(0, 2).toUpperCase()
}

function iconTone(portal: WorkbenchPortal) {
  if (portal.architecture === 'B2C') return 'bg-[#fff1ed] text-[#e95432]'
  if (portal.architecture === 'B2B') return 'bg-[#edf3ff] text-[#1769e0]'
  if (portal.architecture === '中台') return 'bg-[#f1edff] text-[#7652d6]'
  return 'bg-[#eaf9f2] text-[#16845b]'
}

function openLogoUpload(portal: WorkbenchPortal) {
  uploadingId.value = portal.id
  logoInput.value?.click()
}

function handleLogoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file && uploadingId.value) logos.value = { ...logos.value, [uploadingId.value]: URL.createObjectURL(file) }
  input.value = ''
  uploadingId.value = ''
}

async function openPortal(portal: WorkbenchPortal) {
  if (!portal.url) return
  if (portal.url.startsWith('/')) return router.push(portal.url)
  const token = (store.user as Record<string, unknown> | null)?.token || ''
  const separator = portal.url.includes('?') ? '&' : '?'
  window.open(portal.ssoEnabled ? `${portal.url}${separator}token=${token}` : portal.url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <section data-testid="system-portal-panel" class="flex h-[316px] flex-col overflow-hidden rounded-[22px] border border-[#e7e9ee] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)]">
    <WorkbenchBoardHeader v-model:query="query" title="系统入口" search-label="搜索系统入口" test-id-prefix="portal" :refreshing="props.refreshing" @refresh="emit('refresh')" />

    <div data-testid="portal-scroll-area" class="elegant-scrollbar min-h-0 flex-1 overflow-y-auto p-4 pr-3">
      <input ref="logoInput" data-testid="portal-logo-input" type="file" accept="image/*" class="hidden" @change="handleLogoUpload" />
      <div v-if="filteredPortals.length" data-testid="portal-grid" class="grid auto-rows-[96px] gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <article v-for="portal in filteredPortals" :key="portal.id" class="group relative flex h-[96px] items-center rounded-2xl border border-[#eaecf0] bg-white transition hover:border-[#cbd3df] hover:shadow-[0_8px_22px_rgba(15,23,42,0.06)]">
          <button :data-testid="`portal-card-${portal.id}`" class="flex h-full min-w-0 flex-1 items-center gap-3 rounded-2xl py-3 pl-3 pr-12 text-left" @click="openPortal(portal)">
            <span v-if="logos[portal.id]" class="h-8 w-8 shrink-0 overflow-hidden rounded-xl border border-[#e6e8ec]"><img :src="logos[portal.id]" :alt="`${portal.name} logo`" class="h-full w-full object-cover" /></span>
            <span v-else :data-testid="`portal-monogram-${portal.id}`" class="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[10px] font-bold tracking-[-0.02em]" :class="iconTone(portal)">{{ portalAbbreviation(portal) }}</span>
            <span class="min-w-0 flex-1">
              <span class="flex min-w-0 items-center gap-1.5"><span class="workbench-item-title truncate text-[14px] font-semibold text-[#24272d]">{{ portal.name }}</span><span class="workbench-meta-copy shrink-0 rounded-md bg-[#f4f5f7] px-1.5 py-0.5 text-[10px] font-medium text-[#747b86]">{{ portal.architecture }}</span></span>
              <span class="workbench-meta-copy mt-1 block truncate text-[10px] text-[#9197a1]">{{ portal.description }}</span>
            </span>
          </button>
          <button :data-testid="`upload-logo-${portal.id}`" :aria-label="`上传 Logo：${portal.name}`" title="上传 Logo" class="absolute bottom-1.5 right-2 grid h-6 w-6 place-items-center rounded-lg text-[#a1a6af] opacity-0 transition hover:bg-[#f2f4f7] hover:text-[#555c66] group-hover:opacity-100 focus-visible:opacity-100" @click.stop="openLogoUpload(portal)"><Upload class="h-3 w-3" /></button>
          <ArrowUpRight :data-testid="`portal-arrow-${portal.id}`" class="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 -translate-x-1 translate-y-1 text-[#1769e0] opacity-0 transition group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
        </article>
      </div>
      <div v-else class="grid h-full place-items-center text-center"><div><BriefcaseBusiness class="mx-auto h-6 w-6 text-[#b2b7bf]" /><p class="mt-2 text-xs text-[#8b909a]">没有匹配的系统</p></div></div>
    </div>
  </section>
</template>
