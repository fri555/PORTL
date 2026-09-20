<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookmarkPlus, X, Pencil, Trash2, Plus } from 'lucide-vue-next'

interface QuickPrompt {
  id: string
  scope: string
  title: string
  content: string
}

const props = defineProps<{ scope: string; scopeLabel: string; prompts: QuickPrompt[] }>()
const emit = defineEmits<{
  created: [prompt: QuickPrompt]
  updated: [prompt: QuickPrompt]
  deleted: [id: string]
}>()

type View = 'list' | 'form' | 'confirm-delete'
const open = ref(false)
const view = ref<View>('list')
const editingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const draftTitle = ref('')
const draftContent = ref('')
const canSave = computed(() => Boolean(draftTitle.value.trim() && draftContent.value.trim()))

const deletingItem = computed(() => props.prompts.find(p => p.id === deletingId.value))

function openPanel() {
  view.value = 'list'
  editingId.value = null
  deletingId.value = null
  open.value = true
}

function close() {
  open.value = false
  view.value = 'list'
  editingId.value = null
  deletingId.value = null
}

function goCreate() {
  editingId.value = null
  draftTitle.value = ''
  draftContent.value = ''
  view.value = 'form'
}

function goEdit(item: QuickPrompt) {
  editingId.value = item.id
  draftTitle.value = item.title
  draftContent.value = item.content
  view.value = 'form'
}

function goDelete(id: string) {
  deletingId.value = id
  view.value = 'confirm-delete'
}

function save() {
  if (!canSave.value) return
  if (editingId.value) {
    emit('updated', {
      id: editingId.value,
      scope: props.scope,
      title: draftTitle.value.trim(),
      content: draftContent.value.trim(),
    })
  } else {
    emit('created', {
      id: `quick-${Date.now()}`,
      scope: props.scope,
      title: draftTitle.value.trim(),
      content: draftContent.value.trim(),
    })
  }
  view.value = 'list'
  editingId.value = null
}

function confirmDelete() {
  if (deletingId.value) {
    emit('deleted', deletingId.value)
    deletingId.value = null
  }
  view.value = 'list'
}

function backToList() {
  view.value = 'list'
  editingId.value = null
  deletingId.value = null
}
</script>

<template>
  <div class="quick-wrap">
    <button type="button" class="trigger" aria-label="快捷提示语" title="管理快捷提示语" @click="openPanel"><BookmarkPlus :size="18" /></button>

    <Teleport to="body">
      <div v-if="open" class="modal-mask" @mousedown.self="close">
        <!-- 列表视图 -->
        <div v-if="view === 'list'" class="panel" role="dialog" aria-modal="true" aria-label="快捷提示语列表">
          <header>
            <div>
              <h2>快捷提示语</h2>
              <p>{{ scopeLabel }}专属 · 共 {{ prompts.length }} 条</p>
            </div>
            <button type="button" class="close-btn" aria-label="关闭" @click="close"><X :size="18" /></button>
          </header>

          <div class="panel__body">
            <ul v-if="prompts.length" class="prompt-list">
              <li v-for="item in prompts" :key="item.id" class="prompt-item">
                <div class="prompt-item__content">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.content }}</span>
                </div>
                <div class="prompt-item__actions">
                  <button type="button" class="action-btn" title="编辑" @click="goEdit(item)"><Pencil :size="14" /></button>
                  <button type="button" class="action-btn action-btn--danger" title="删除" @click="goDelete(item.id)"><Trash2 :size="14" /></button>
                </div>
              </li>
            </ul>
            <div v-else class="empty-state">
              <BookmarkPlus :size="32" />
              <p>暂无快捷提示语</p>
              <small>点击下方按钮创建第一条</small>
            </div>
          </div>

          <footer>
            <button type="button" class="create-btn" @click="goCreate"><Plus :size="15" />新建提示语</button>
          </footer>
        </div>

        <!-- 新建/编辑表单视图 -->
        <form v-else-if="view === 'form'" class="panel" role="dialog" aria-modal="true" :aria-label="editingId ? '编辑快捷提示语' : '新建快捷提示语'" @submit.prevent="save">
          <header>
            <div>
              <h2>{{ editingId ? '编辑提示语' : '新建提示语' }}</h2>
              <p>{{ scopeLabel }}专属，保存后展示在快捷开始最前面</p>
            </div>
            <button type="button" class="close-btn" aria-label="关闭" @click="close"><X :size="18" /></button>
          </header>

          <div class="panel__body">
            <label><span>提示语名称</span><input v-model="draftTitle" aria-label="提示语名称" maxlength="20" placeholder="例如：周报总结" autofocus /><small>{{ draftTitle.length }}/20</small></label>
            <label><span>提示语内容</span><textarea v-model="draftContent" aria-label="提示语内容" maxlength="500" rows="5" placeholder="输入需要快速复用的完整指令" /><small>{{ draftContent.length }}/500</small></label>
          </div>

          <footer>
            <button type="button" class="back-btn" @click="backToList">返回列表</button>
            <button type="submit" class="save-btn" :disabled="!canSave">{{ editingId ? '保存修改' : '保存' }}</button>
          </footer>
        </form>

        <!-- 删除确认视图 -->
        <div v-else-if="view === 'confirm-delete'" class="panel panel--sm" role="alertdialog" aria-modal="true" aria-label="确认删除">
          <header>
            <div><h2>确认删除</h2></div>
            <button type="button" class="close-btn" aria-label="关闭" @click="backToList"><X :size="18" /></button>
          </header>

          <div class="panel__body">
            <p class="confirm-text">确定要删除「<strong>{{ deletingItem?.title }}</strong>」吗？删除后无法恢复。</p>
          </div>

          <footer>
            <button type="button" class="back-btn" @click="backToList">取消</button>
            <button type="button" class="delete-btn" @click="confirmDelete">确认删除</button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.quick-wrap { position: relative }
.trigger {
  display: grid !important; width: 34px !important; height: 34px !important;
  place-items: center; border: 0; border-radius: 9px;
  background: transparent; color: #555; cursor: pointer
}
.trigger:hover { background: #f1f2f4 }

/* 弹窗遮罩 */
.modal-mask {
  position: fixed; z-index: 1000; inset: 0;
  display: grid; place-items: center; padding: 20px;
  background: rgba(18,23,31,.36);
  font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif
}

/* 面板 */
.panel {
  box-sizing: border-box; width: min(520px, calc(100vw - 32px));
  border-radius: 16px; background: #fff;
  box-shadow: 0 24px 72px rgba(20,26,35,.2);
  display: flex; flex-direction: column; overflow: hidden
}
.panel--sm { width: min(400px, calc(100vw - 32px)) }

/* 头部 */
.panel > header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px; border-bottom: 1px solid #f0f0f0
}
.panel h2 { margin: 0; color: #111; font-size: 18px; font-weight: 600 }
.panel p { margin: 4px 0 0; color: #999; font-size: 12px }
.close-btn {
  display: grid; width: 30px; height: 30px; place-items: center;
  border: 0; border-radius: 8px; background: transparent; color: #777; cursor: pointer
}
.close-btn:hover { background: #f5f5f5 }

/* 内容区 */
.panel__body { padding: 16px 24px; flex: 1; overflow-y: auto; max-height: 400px }

/* 列表 */
.prompt-list { list-style: none; margin: 0; padding: 0 }
.prompt-item {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 0; border-bottom: 1px solid #f5f5f5
}
.prompt-item:last-child { border-bottom: none }
.prompt-item__content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px }
.prompt-item__content strong { font-size: 14px; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
.prompt-item__content span { font-size: 12px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
.prompt-item__actions { display: flex; gap: 4px; flex-shrink: 0 }
.action-btn {
  display: grid; width: 30px; height: 30px; place-items: center;
  border: 0; border-radius: 7px; background: transparent; color: #888; cursor: pointer; transition: all .15s
}
.action-btn:hover { background: #f0f1f3; color: #555 }
.action-btn--danger:hover { background: #fef2f2; color: #dc2626 }

/* 空状态 */
.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 40px 0; color: #ccc
}
.empty-state p { margin: 0; font-size: 14px; color: #999 }
.empty-state small { font-size: 12px; color: #bbb }

/* 底部 */
.panel > footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 24px 20px; border-top: 1px solid #f0f0f0
}
.create-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 36px; padding: 0 16px; border: 0; border-radius: 8px;
  background: #111; color: #fff; font: 14px inherit; cursor: pointer; transition: background .15s
}
.create-btn:hover { background: #333 }

/* 表单 */
.panel__body > label { position: relative; display: block; margin-top: 16px }
.panel__body > label:first-child { margin-top: 0 }
.panel__body label > span { display: block; margin-bottom: 8px; color: #333; font-size: 14px }
.panel__body input,
.panel__body textarea {
  box-sizing: border-box; width: 100%;
  border: 1px solid #dedede; border-radius: 8px;
  padding: 10px 12px; outline: 0; color: #222; font: 14px/22px inherit
}
.panel__body input { height: 42px; padding-right: 54px }
.panel__body textarea { min-height: 126px; resize: none; padding-bottom: 28px }
.panel__body input:focus,
.panel__body textarea:focus { border-color: #777; box-shadow: 0 0 0 2px rgba(0,0,0,.05) }
.panel__body label > small { position: absolute; right: 10px; bottom: 8px; color: #aaa; font-size: 11px }

/* 表单底部 */
.back-btn {
  height: 36px; padding: 0 16px; border: 1px solid #dedede; border-radius: 8px;
  background: #fff; color: #333; font: 14px inherit; cursor: pointer
}
.back-btn:hover { background: #f8f8f8 }
.save-btn {
  height: 36px; min-width: 80px; padding: 0 16px;
  border: 0; border-radius: 8px;
  background: #111; color: #fff; font: 14px inherit; cursor: pointer
}
.save-btn:disabled { background: #ddd; color: #aaa; cursor: not-allowed }

/* 删除确认 */
.confirm-text { margin: 0; font-size: 14px; color: #555; line-height: 1.6 }
.confirm-text strong { color: #111 }
.delete-btn {
  height: 36px; min-width: 80px; padding: 0 16px;
  border: 0; border-radius: 8px;
  background: #dc2626; color: #fff; font: 14px inherit; cursor: pointer
}
.delete-btn:hover { background: #b91c1c }

@media (max-width: 640px) {
  .modal-mask { align-items: end; padding: 0 }
  .panel, .panel--sm { width: 100%; border-radius: 18px 18px 0 0 }
}
</style>
