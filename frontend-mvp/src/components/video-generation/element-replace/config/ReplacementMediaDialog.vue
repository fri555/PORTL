<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, Film, ImageOff, Link, Search, X } from 'lucide-vue-next'
import { getReplacementMediaUrl, isReplacementRemoteReference, listReplacementMedia } from '@/composables/useElementReplacement'
import type { ReplacementMedia, ReplacementType } from '@/types/element-replacement'

const props = defineProps<{ kind: 'video' | 'image'; mode: 'url' | 'material'; type: ReplacementType; initialMedia?: ReplacementMedia | null }>()
const emit = defineEmits<{ select: [media: ReplacementMedia]; close: [] }>()
const dialog = ref<HTMLElement | null>(null)
const url = ref(props.initialMedia?.source === 'url' ? props.initialMedia.url : '')
const query = ref('')
const selectedId = ref('')
const error = ref('')
const failedMedia = ref(new Set<string>())
const materials = listReplacementMedia(props.kind, props.type)
const filtered = computed(() => materials.filter((item) => item.name.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())))
let previousFocus: HTMLElement | null = null

function confirmLink() {
  const value = url.value.trim()
  try {
    if (!isReplacementRemoteReference(value, props.kind)) throw new Error('reference')
    const pathName = value.split('/').filter(Boolean).pop()?.split('?')[0]
    const name = pathName ? decodeURIComponent(pathName) : props.kind === 'video' ? '链接视频' : '链接参考图'
    const media: ReplacementMedia = { id: `replacement-link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, kind: props.kind, source: 'url', url: value }
    emit('select', media)
  } catch { error.value = `请输入有效的 http/https、tos:// 或 asset:// 素材引用${props.kind === 'video' ? '，或视频素材 ID' : ''}` }
}
function confirmMaterial() {
  const selected = materials.find((item) => item.id === selectedId.value)
  if (selected) emit('select', { ...selected })
}
function materialKeydown(event: KeyboardEvent, identifier: string) {
  const index = filtered.value.findIndex((item) => item.id === identifier)
  let target = index
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = Math.min(filtered.value.length - 1, index + 1)
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = Math.max(0, index - 1)
  else if (event.key === 'Home') target = 0
  else if (event.key === 'End') target = filtered.value.length - 1
  else return
  event.preventDefault()
  const item = filtered.value[target]
  if (!item) return
  selectedId.value = item.id
  const controls = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[data-testid="material-choice"]')
  controls?.[target]?.focus()
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); emit('close') }
  if (event.key !== 'Tab' || !dialog.value) return
  const controls = Array.from(dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,[tabindex="0"]')).filter((item) => item.tabIndex >= 0)
  const first = controls[0]; const last = controls[controls.length - 1]
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
onMounted(async () => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  window.addEventListener('keydown', keydown)
  await nextTick()
  dialog.value?.querySelector<HTMLInputElement>('input')?.focus()
})
onBeforeUnmount(() => { window.removeEventListener('keydown', keydown); previousFocus?.focus() })
</script>

<template>
  <div class="media-dialog-mask" @click.self="emit('close')">
    <section ref="dialog" class="media-dialog" :class="{ 'media-dialog--link': mode === 'url' }" role="dialog" aria-modal="true" :aria-label="mode === 'url' ? kind === 'video' ? '视频链接' : '参考图链接' : '素材库'" tabindex="-1">
      <header><h2>{{ mode === 'url' ? kind === 'video' ? '视频链接' : '参考图链接' : kind === 'video' ? '从素材库选择视频' : '从素材库选择图片' }}</h2><button type="button" aria-label="关闭素材对话框" @click="emit('close')"><X :size="18" /></button></header>
      <div v-if="mode === 'url'" class="link-form">
        <label><span>{{ kind === 'video' ? '视频链接或素材引用' : '图片链接或素材引用' }}</span><div class="link-input"><Link :size="16" /><input v-model="url" aria-label="素材链接" placeholder="HTTP/HTTPS、tos:// 或 asset://" autocomplete="off" @input="error = ''" @keydown.enter.prevent="confirmLink" /></div></label>
        <p class="dialog-hint">{{ kind === 'video' ? '也可输入视频素材 ID。' : '' }}TOS、LAS 素材引用可保存，浏览器暂不支持直接预览。</p>
        <p v-if="error" class="dialog-error" role="alert">{{ error }}</p>
        <footer><button type="button" class="plain" @click="emit('close')">取消</button><button type="button" class="primary" data-testid="confirm-media-link" @click="confirmLink">确认使用</button></footer>
      </div>
      <template v-else>
        <div class="search-field"><Search :size="16" /><input v-model="query" aria-label="搜索素材库" placeholder="搜索素材名称" /></div>
        <div class="material-grid" role="listbox" aria-label="素材库">
          <button v-for="item in filtered" :key="item.id" type="button" class="material-option" :class="{ selected: selectedId === item.id }" :aria-selected="selectedId === item.id" role="option" data-testid="material-choice" :tabindex="selectedId === item.id || (!selectedId && item.id === filtered[0]?.id) ? 0 : -1" @keydown="materialKeydown($event, item.id)" @click="selectedId = item.id">
            <div class="material-image"><img v-if="(item.kind === 'image' || item.poster) && !failedMedia.has(item.id)" @error="failedMedia.add(item.id)" :src="item.kind === 'image' ? getReplacementMediaUrl(item) : item.poster" :alt="item.name" loading="lazy" /><ImageOff v-else-if="item.kind === 'image'" :size="29" :stroke-width="1.2" aria-label="图片暂时无法预览" /><Film v-else :size="32" :stroke-width="1.2" /><span v-if="selectedId === item.id" class="selection-mark"><Check :size="14" /></span></div>
            <span class="material-name">{{ item.name }}</span><small>{{ item.source === 'demo' ? '测试素材' : '素材库' }}</small>
          </button>
          <p v-if="!filtered.length" class="empty-materials">{{ query ? '暂无符合条件的素材' : '暂无可用素材，可上传或粘贴链接' }}</p>
        </div>
        <footer><button type="button" class="plain" @click="emit('close')">取消</button><button type="button" class="primary" data-testid="confirm-material" :disabled="!selectedId" @click="confirmMaterial">确认选择</button></footer>
      </template>
    </section>
  </div>
</template>

<style scoped>
.media-dialog-mask{position:fixed;inset:0;z-index:1600;display:flex;align-items:center;justify-content:center;background:#0006;padding:24px;box-sizing:border-box}.media-dialog{display:flex;flex-direction:column;width:min(760px,100%);max-height:85vh;padding:22px 24px;border:1px solid #e5e7eb;border-radius:14px;background:#fff;box-shadow:0 20px 70px #0002;color:#111;font-size:14px;outline:none;box-sizing:border-box}.media-dialog--link{width:min(520px,100%)}header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}h2{margin:0;font-size:18px;line-height:26px;font-weight:600}header>button{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:0;border-radius:6px;background:transparent;color:#666;cursor:pointer}header>button:hover{background:#f5f5f5}.link-form{display:flex;flex-direction:column;gap:12px}.link-form label{display:flex;flex-direction:column;gap:10px}.link-input,.search-field{display:flex;align-items:center;gap:9px;height:40px;padding:0 12px;border:1px solid #dfe2e8;border-radius:7px;color:#777}.link-input:focus-within,.search-field:focus-within{border-color:#777}.link-input input,.search-field input{width:100%;min-width:0;height:100%;border:0;outline:none;background:none;font:inherit;color:#111}.link-input input::placeholder,.search-field input::placeholder{color:#aaa}.dialog-hint{margin:0;font-size:12px;color:#999;line-height:20px}.dialog-error{margin:0;font-size:13px;line-height:20px;color:#d44848}footer{display:flex;justify-content:flex-end;align-items:center;gap:10px;padding-top:20px}footer button{height:34px;min-width:78px;padding:5px 14px;border:1px solid #dfe2e8;border-radius:7px;background:#fff;font:inherit;cursor:pointer}.primary{background:#171717!important;border-color:#171717!important;color:#fff}.primary:disabled{opacity:.35;cursor:not-allowed}.search-field{flex-shrink:0;margin-bottom:18px}.material-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;max-height:440px;overflow:auto;padding:1px}.material-option{display:flex;flex-direction:column;gap:6px;min-width:0;padding:8px;border:1px solid #e7e9ed;border-radius:9px;background:#fff;text-align:left;cursor:pointer}.material-option.selected{border-color:#111;background:#fafafa}.material-image{display:flex;align-items:center;justify-content:center;position:relative;width:100%;height:130px;border-radius:5px;overflow:hidden;background:#f4f5f6;color:#999}.material-image img{width:100%;height:100%;object-fit:cover}.selection-mark{position:absolute;right:7px;top:7px;display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#111;color:#fff}.material-name{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:#111}.material-option small{font-size:11px;color:#999}.empty-materials{grid-column:1/-1;margin:0;min-height:150px;display:flex;align-items:center;justify-content:center;color:#999;font-size:13px}@media(max-width:600px){.media-dialog-mask{padding:16px}.media-dialog{padding:18px}.material-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.material-image{height:115px}}
</style>
