<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookmarkPlus, X } from 'lucide-vue-next'

const props = defineProps<{ scope: string; scopeLabel: string }>()
const emit = defineEmits<{
  created: [prompt: { id: string; scope: string; title: string; content: string }]
}>()

const open = ref(false)
const draftTitle = ref('')
const draftContent = ref('')
const canSave = computed(() => Boolean(draftTitle.value.trim() && draftContent.value.trim()))

function openCreate() {
  draftTitle.value = ''
  draftContent.value = ''
  open.value = true
}

function close() { open.value = false }

function save() {
  if (!canSave.value) return
  emit('created', {
    id: `quick-${Date.now()}`,
    scope: props.scope,
    title: draftTitle.value.trim(),
    content: draftContent.value.trim(),
  })
  close()
}
</script>

<template>
  <div class="quick-wrap">
    <button type="button" class="trigger" aria-label="快捷提示语" title="新建快捷提示语" :aria-expanded="open" @click="openCreate"><BookmarkPlus :size="18" /></button>
    <Teleport to="body">
      <div v-if="open" class="modal-mask" @mousedown.self="close">
        <form class="quick-modal" role="dialog" aria-modal="true" aria-label="新建快捷提示语" @submit.prevent="save">
          <header>
            <div><h2>新建快捷提示语</h2><p>{{ scopeLabel }}专属，保存后展示在快捷开始最前面</p></div>
            <button type="button" aria-label="关闭新建快捷提示语" @click="close"><X :size="18" /></button>
          </header>
          <label><span>提示语名称</span><input v-model="draftTitle" aria-label="提示语名称" maxlength="20" placeholder="例如：周报总结" autofocus /><small>{{ draftTitle.length }}/20</small></label>
          <label><span>提示语内容</span><textarea v-model="draftContent" aria-label="提示语内容" maxlength="500" rows="5" placeholder="输入需要快速复用的完整指令" /><small>{{ draftContent.length }}/500</small></label>
          <footer><button type="button" class="secondary" @click="close">取消</button><button type="submit" class="primary" :disabled="!canSave">保存</button></footer>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.quick-wrap{position:relative}.trigger{display:grid!important;width:34px!important;height:34px!important;place-items:center;border:0;border-radius:9px;background:transparent;color:#555;cursor:pointer}.trigger:hover{background:#f1f2f4}.modal-mask{position:fixed;z-index:1000;inset:0;display:grid;place-items:center;padding:20px;background:rgba(18,23,31,.36);font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.quick-modal{box-sizing:border-box;width:min(480px,calc(100vw - 32px));border-radius:16px;background:#fff;padding:0 24px 22px;box-shadow:0 24px 72px rgba(20,26,35,.2)}.quick-modal>header{display:flex;min-height:74px;align-items:center;justify-content:space-between;border-bottom:1px solid #eee}.quick-modal h2{margin:0;color:#111;font-size:18px;font-weight:600}.quick-modal p{margin:5px 0 0;color:#999;font-size:12px}.quick-modal header button{display:grid;width:30px;height:30px;place-items:center;border:0;border-radius:8px;background:transparent;color:#777;cursor:pointer}.quick-modal header button:hover{background:#f5f5f5}.quick-modal>label{position:relative;display:block;margin-top:18px}.quick-modal label>span{display:block;margin-bottom:8px;color:#333;font-size:14px}.quick-modal input,.quick-modal textarea{box-sizing:border-box;width:100%;border:1px solid #dedede;border-radius:8px;padding:10px 12px;outline:0;color:#222;font:14px/22px inherit}.quick-modal input{height:42px;padding-right:54px}.quick-modal textarea{min-height:126px;resize:none;padding-bottom:28px}.quick-modal input:focus,.quick-modal textarea:focus{border-color:#777;box-shadow:0 0 0 2px rgba(0,0,0,.05)}.quick-modal label>small{position:absolute;right:10px;bottom:8px;color:#aaa;font-size:11px}.quick-modal footer{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}.quick-modal footer button{height:34px;min-width:72px;border:1px solid #dedede;border-radius:8px;padding:0 16px;font:14px inherit;cursor:pointer}.quick-modal .secondary{background:#fff;color:#333}.quick-modal .primary{border-color:#111;background:#111;color:#fff}.quick-modal .primary:disabled{border-color:#eee;background:#eee;color:#aaa;cursor:not-allowed}@media(max-width:640px){.modal-mask{align-items:end;padding:0}.quick-modal{width:100%;border-radius:18px 18px 0 0;padding:0 18px 18px}}
</style>
