<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronRight, FileText, Search, Trash2, UploadCloud, UserPlus, Users, X } from 'lucide-vue-next'
import type { KnowledgeDialogKind, KnowledgeSpace, SourceKnowledgeBase, SourceKnowledgeNode } from '@/types/knowledge-source'

type DialogKind = KnowledgeDialogKind | 'rename'

const props = defineProps<{
  kind: DialogKind
  target?: SourceKnowledgeBase | SourceKnowledgeNode | null | undefined
  destinations?: { id: string; name: string }[]
}>()

const emit = defineEmits<{
  close: []
  create: [payload: { name: string; space: KnowledgeSpace }]
  folder: [payload: { name: string; kb: string }]
  upload: [files: File[], destinationId: string, options: { monthlyReport: boolean }]
  rename: [name: string]
  permission: [payload: { resourceId: string; members: string[]; inheritParent: boolean; revision: number }]
  'confirm-delete': []
}>()

const name = ref('')
const space = ref<KnowledgeSpace>('public')
const selectedKnowledgeBase = ref('')
const selectedUploadTarget = ref('')
const files = ref<File[]>([])
const uploadMessages = ref<string[]>([])
const monthlyReportParse = ref(false)
const memberSearch = ref('')
const sourceMembers = [
  '管理层', '耶运动事业部', 'B2C线上', '数字营销中心', '天马运动平台部',
  '团购销售部', '人力资源中心', '商品运营中心', '财务管理中心', '品牌中心',
]
const inheritedSourceMembers = ['管理层', '耶运动事业部', 'B2C线上', '数字营销中心']
const defaultFineGrainedMembers = ['人力资源中心', '商品运营中心']
const selectedDepartments = ['管理层', '耶运动事业部', 'B2C线上', '数字营销中心', '人力资源中心', '商品运营中心']
const departmentOptions = [...selectedDepartments, '财务管理中心', '品牌中心', '仓储部', '行政部']
const personOptions = ['悠米', '清晖', '向阳', '朝暮', '希范', '专诸', '知夏', '临川']
const permissionCache = ref<Record<string, { members: string[]; inheritParent: boolean; revision: number }>>({})
const members = ref<string[]>([...sourceMembers])
const inheritParent = ref(false)
const addMemberOpen = ref(false)
const pickerTab = ref<'department' | 'person'>('department')
const pickerSearch = ref('')
const pickerDraft = ref(new Set<string>())
const permissionError = ref('')
const impactOpen = ref(false)
const baseRevision = ref(1)
const fileInput = ref<HTMLInputElement | null>(null)

const isCreateValid = computed(() => Boolean(name.value.trim()))
const isFolderValid = computed(() => Boolean(name.value.trim() && selectedKnowledgeBase.value))
const isRenameValid = computed(() => Boolean(name.value.trim()))
const isUploadValid = computed(() => Boolean(selectedUploadTarget.value && files.value.length > 0))
const hasExcelFiles = computed(() => files.value.some((file) => /\.xlsx?$/i.test(file.name)))
const uploadDestinations = computed(() => {
  if (props.destinations?.length) return props.destinations
  return props.target ? [{ id: props.target.id, name: props.target.name }] : []
})
const isFineGrainedTarget = computed(() => Boolean(props.target && 'kind' in props.target))
const inheritedMembers = computed(() => (
  isFineGrainedTarget.value && inheritParent.value ? inheritedSourceMembers : []
))
const effectiveMembers = computed(() => Array.from(new Set([...inheritedMembers.value, ...members.value])))
const filteredMembers = computed(() => {
  const keyword = memberSearch.value.trim().toLowerCase()
  return keyword ? effectiveMembers.value.filter((item) => item.toLowerCase().includes(keyword)) : effectiveMembers.value
})
const pickerOptions = computed(() => {
  const keyword = pickerSearch.value.trim().toLowerCase()
  const source = pickerTab.value === 'department' ? departmentOptions : personOptions
  return keyword ? source.filter((item) => item.toLowerCase().includes(keyword)) : source
})
const pickerSelected = computed(() => Array.from(pickerDraft.value))
const pickerSelectedCount = computed(() => pickerSelected.value.reduce((sum, item) => sum + (sourceMembers.includes(item) ? 15 : 1), 0))
const impactedChildren = computed(() => {
  const target = props.target
  if (!target) return 0
  if ('kind' in target) return target.children?.length ?? 0
  return target.count ?? target.nodes?.length ?? 0
})

watch(
  () => [props.kind, props.target?.id] as const,
  () => {
    name.value = props.kind === 'rename' ? props.target?.name ?? '' : ''
    space.value = 'public'
    selectedKnowledgeBase.value = props.target?.name ?? ''
    selectedUploadTarget.value = props.kind === 'upload' ? props.target?.id ?? '' : ''
    files.value = []
    uploadMessages.value = []
    monthlyReportParse.value = false
    memberSearch.value = ''
    const resourceId = props.target?.id ?? 'all'
    const fineGrained = isFineGrainedTarget.value
    const saved = permissionCache.value[resourceId] ?? {
      members: fineGrained ? [...defaultFineGrainedMembers] : [...sourceMembers],
      inheritParent: fineGrained,
      revision: 1,
    }
    members.value = [...saved.members]
    inheritParent.value = saved.inheritParent
    baseRevision.value = saved.revision
    addMemberOpen.value = false
    pickerSearch.value = ''
    permissionError.value = ''
    impactOpen.value = false
  },
  { immediate: true },
)

watch(hasExcelFiles, (hasExcel) => {
  if (!hasExcel) monthlyReportParse.value = false
})

function close() {
  emit('close')
}

function submitCreate() {
  if (!isCreateValid.value) return
  emit('create', { name: name.value.trim(), space: space.value })
}

function submitFolder() {
  if (!isFolderValid.value) return
  emit('folder', { name: name.value.trim(), kb: selectedKnowledgeBase.value })
}

function submitRename() {
  if (!isRenameValid.value) return
  emit('rename', name.value.trim())
}

function submitUpload() {
  if (!isUploadValid.value) return
  emit('upload', files.value, selectedUploadTarget.value, { monthlyReport: monthlyReportParse.value })
}

function addFiles(next: FileList | File[]) {
  const allowedExtensions = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt', 'md'])
  const maxBytes = 50 * 1024 * 1024
  const existing = new Set(files.value.map(fileKey))
  const accepted: File[] = []
  const messages: string[] = []
  let duplicateCount = 0

  for (const file of Array.from(next)) {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    const key = fileKey(file)
    if (existing.has(key)) {
      duplicateCount += 1
      continue
    }
    if (!allowedExtensions.has(extension)) {
      messages.push(`“${file.name}”是不支持的文件格式`)
      continue
    }
    if (file.size > maxBytes) {
      messages.push(`“${file.name}”超过 50MB`)
      continue
    }
    if (files.value.length + accepted.length >= 100) {
      messages.push('单次最多上传 100 个文件')
      break
    }
    existing.add(key)
    accepted.push(file)
  }
  if (duplicateCount) messages.push(`已忽略 ${duplicateCount} 个重复文件`)
  files.value = [...files.value, ...accepted]
  uploadMessages.value = messages
}

function fileKey(file: File) {
  return `${file.name.toLowerCase()}::${file.size}::${file.lastModified}`
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function removeFile(index: number) {
  files.value.splice(index, 1)
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files) addFiles(input.files)
  input.value = ''
}

function onDrop(event: DragEvent) {
  if (event.dataTransfer?.files) addFiles(event.dataTransfer.files)
}

function onPaste(event: ClipboardEvent) {
  if (event.clipboardData?.files?.length) addFiles(event.clipboardData.files)
}

function addMember() {
  pickerDraft.value = new Set(members.value)
  pickerSearch.value = ''
  addMemberOpen.value = true
}

function removeMember(member: string) {
  members.value = members.value.filter((item) => item !== member)
}

function updateMemberSearch(event: Event) {
  memberSearch.value = (event.target as HTMLInputElement).value
}

function updateInheritance(event: Event) {
  inheritParent.value = (event.target as HTMLInputElement).checked
}

function togglePickerItem(item: string) {
  const next = new Set(pickerDraft.value)
  next.has(item) ? next.delete(item) : next.add(item)
  pickerDraft.value = next
}

function removePickerItem(item: string) {
  const next = new Set(pickerDraft.value)
  next.delete(item)
  pickerDraft.value = next
}

function confirmPicker() {
  members.value = Array.from(pickerDraft.value)
  permissionError.value = ''
  addMemberOpen.value = false
}

function requestPermissionSave() {
  if (effectiveMembers.value.length === 0) {
    permissionError.value = '至少保留一个可查看对象'
    return
  }
  permissionError.value = ''
  impactOpen.value = true
}

function confirmPermissionSave() {
  const resourceId = props.target?.id ?? 'all'
  const revision = baseRevision.value + 1
  const saved = {
    members: [...members.value],
    inheritParent: inheritParent.value,
    revision,
  }
  permissionCache.value = { ...permissionCache.value, [resourceId]: saved }
  emit('permission', { resourceId, ...saved })
  impactOpen.value = false
}

function isInheritedOnly(member: string) {
  return isInheritedMember(member) && !isDirectMember(member)
}

function isInheritedMember(member: string) {
  return isFineGrainedTarget.value
    && inheritParent.value
    && inheritedSourceMembers.includes(member)
}

function isDirectMember(member: string) {
  return isFineGrainedTarget.value && members.value.includes(member)
}

function canRemoveDirectMember(member: string) {
  return members.value.includes(member) && !isInheritedMember(member)
}
</script>

<template>
  <Teleport to="body">
    <section
      v-if="kind === 'rename'"
      data-testid="knowledge-rename-panel"
      class="rename-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="rename-title"
    >
      <header class="dialog-header">
        <h2 id="rename-title">重命名</h2>
        <button class="icon-button" type="button" aria-label="关闭重命名" @click="close"><X :size="18" /></button>
      </header>
      <form class="rename-form" @submit.prevent="submitRename">
        <textarea v-model="name" rows="2" maxlength="80" aria-label="知识库名称" autofocus />
        <footer class="dialog-footer">
          <button class="button secondary" type="button" @click="close">取消</button>
          <button class="button primary" type="submit" :disabled="!isRenameValid">确定</button>
        </footer>
      </form>
    </section>

    <div v-else-if="kind" class="dialog-overlay" @mousedown.self="close">
      <section
        class="dialog-surface"
        :class="{ 'dialog-surface--upload': kind === 'upload', 'dialog-surface--permission': kind === 'permission' }"
        :data-upload-layout="kind === 'upload' ? 'production' : undefined"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`${kind}-dialog-title`"
        @paste="kind === 'upload' && onPaste($event)"
      >
        <header class="dialog-header">
          <h2 :id="`${kind}-dialog-title`">
            <template v-if="kind === 'create'">新建知识库</template>
            <template v-else-if="kind === 'folder'">新建文件夹</template>
            <template v-else-if="kind === 'upload'">上传文件</template>
            <template v-else-if="kind === 'permission'">权限管理</template>
            <template v-else>删除知识库</template>
          </h2>
          <button class="icon-button" type="button" aria-label="关闭弹窗" @click="close"><X :size="19" /></button>
        </header>

        <form v-if="kind === 'create'" class="dialog-form" @submit.prevent="submitCreate">
          <label class="field-label" for="knowledge-name"><i>*</i>知识库名称</label>
          <input id="knowledge-name" v-model="name" class="text-field" maxlength="80" placeholder="请输入知识库名称" autofocus />

          <fieldset class="radio-fieldset">
            <legend class="field-label"><i>*</i>所属空间</legend>
            <label><input v-model="space" type="radio" value="public" /> <span>公共空间</span></label>
            <label><input v-model="space" type="radio" value="personal" /> <span>个人空间</span></label>
          </fieldset>

          <footer class="dialog-footer">
            <button class="button secondary" type="button" @click="close">取消</button>
            <button class="button primary" type="submit" :disabled="!isCreateValid">新建</button>
          </footer>
        </form>

        <form v-else-if="kind === 'folder'" class="dialog-form" @submit.prevent="submitFolder">
          <label class="field-label" for="folder-name"><i>*</i>文件名称</label>
          <input id="folder-name" v-model="name" class="text-field" maxlength="80" placeholder="请输入文件名称" autofocus />
          <label class="field-label" for="folder-kb"><i>*</i>所属知识库</label>
          <input id="folder-kb" v-model="selectedKnowledgeBase" class="text-field" placeholder="请选择知识库" />
          <footer class="dialog-footer">
            <button class="button secondary" type="button" @click="close">取消</button>
            <button class="button primary" type="submit" :disabled="!isFolderValid">新建</button>
          </footer>
        </form>

        <form v-else-if="kind === 'upload'" class="dialog-form upload-form" @submit.prevent="submitUpload">
          <div class="upload-target-row">
            <label class="field-label" for="upload-target"><i>*</i>上传至</label>
            <select
              id="upload-target"
              v-model="selectedUploadTarget"
              class="text-field upload-target-select"
              aria-required="true"
            >
              <option disabled value="">请选择知识库或文件夹</option>
              <option v-for="destination in uploadDestinations" :key="destination.id" :value="destination.id">
                {{ destination.name }}
              </option>
            </select>
          </div>
          <button
            class="drop-zone"
            type="button"
            @click="fileInput?.click()"
            @dragover.prevent
            @drop.prevent="onDrop"
          >
            <UploadCloud :size="32" stroke-width="1.4" />
            <strong>点击上传文件</strong>
            <span>也可将文件拖拽或粘贴到此处</span>
            <span>支持 pdf、doc、docx、xls、xlsx、ppt、pptx、csv、txt、md；单文件不超过 50MB；最多 100 个</span>
          </button>
          <input ref="fileInput" class="visually-hidden" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.md" multiple @change="onFileChange" />
          <label class="special-parse-option" :class="{ disabled: !hasExcelFiles }"><input v-model="monthlyReportParse" type="checkbox" aria-label="按月报模式解析" :disabled="!hasExcelFiles" /><span><strong>按月报模式解析</strong><small>仅对Excel文件生效</small></span></label>
          <ul v-if="uploadMessages.length" class="upload-messages" role="alert">
            <li v-for="message in uploadMessages" :key="message">{{ message }}</li>
          </ul>
          <div class="local-files">
            <div v-if="!files.length" class="empty-files">
              <FileText :size="42" stroke-width="1.2" />
              <strong>暂无本地文件</strong>
              <span>请在上方点击、拖拽或粘贴文件</span>
            </div>
            <ul v-else>
              <li v-for="(file, index) in files" :key="fileKey(file)" data-testid="upload-file-row">
                <span class="file-type-icon"><FileText :size="18" stroke-width="1.5" /></span>
                <span class="file-detail"><strong>{{ file.name }}</strong><small>{{ formatFileSize(file.size) }}</small></span>
                <span class="file-status"><Check :size="14" />可上传</span>
                <button type="button" :aria-label="`移除文件 ${file.name}`" @click="removeFile(index)"><X :size="15" /></button>
              </li>
            </ul>
          </div>
          <footer class="dialog-footer upload-footer">
            <button class="button secondary" type="button" @click="close">取消</button>
            <button class="button primary" type="submit" :disabled="!isUploadValid">确定</button>
          </footer>
        </form>

        <form v-else-if="kind === 'permission'" class="dialog-form permission-form" @submit.prevent="requestPermissionSave">
          <div class="permission-toolbar">
            <strong>可查看成员</strong>
            <div class="permission-toolbar-actions">
              <label v-if="isFineGrainedTarget" class="inherit-toggle" title="开启后，上级权限会随上级配置自动更新">
                <input :checked="inheritParent" type="checkbox" aria-label="继承上级权限" @input="updateInheritance" />
                <span>继承上级</span>
              </label>
              <button type="button" aria-label="添加成员" @click="addMember"><UserPlus :size="15" />添加成员</button>
            </div>
          </div>
          <label class="search-field">
            <Search :size="16" />
            <input :value="memberSearch" aria-label="搜索部门/人员..." placeholder="搜索部门/人员..." @input="updateMemberSearch" @keydown.enter.prevent="addMember" />
          </label>
          <div class="member-area">
            <p v-if="!filteredMembers.length">{{ memberSearch ? '未找到匹配的成员' : '暂无成员' }}</p>
            <ul v-else>
              <li v-for="member in filteredMembers" :key="member">
                <span class="member-avatar"><Users :size="15" /></span>
                <span class="member-name-wrap">
                  <span class="member-name">{{ member }}</span>
                  <span v-if="isInheritedMember(member)" class="inherit-badge">来自上级</span>
                  <span v-if="isDirectMember(member)" class="direct-badge">直接设置</span>
                </span>
                <span class="member-role is-readonly" title="权限固定为可查看">可查看</span>
                <button
                  v-if="canRemoveDirectMember(member)"
                  class="remove-direct-member"
                  type="button"
                  :aria-label="`移除${member}直接设置`"
                  title="移除本级直接设置"
                  @click="removeMember(member)"
                ><Trash2 :size="15" /></button>
              </li>
            </ul>
          </div>
          <p v-if="permissionError" class="permission-error" role="alert">{{ permissionError }}</p>
          <footer class="dialog-footer">
            <button class="button secondary" type="button" @click="close">取消</button>
            <button class="button primary" type="submit">保存</button>
          </footer>
        </form>

        <div v-if="kind === 'permission' && addMemberOpen" class="add-member-overlay">
          <section class="add-member-dialog" data-testid="add-member-dialog" role="dialog" aria-modal="true" aria-labelledby="add-member-title">
            <header class="dialog-header"><h2 id="add-member-title">添加成员 <small>按部门或人员选择</small></h2><button class="icon-button" type="button" aria-label="关闭添加成员" @click="addMemberOpen = false"><X :size="19" /></button></header>
            <div class="member-picker-body">
              <div class="picker-left">
                <label class="search-field"><Search :size="16" /><input v-model="pickerSearch" :placeholder="pickerTab === 'department' ? '搜索部门...' : '搜索人员...'" /></label>
                <div class="picker-tabs"><button type="button" :class="{ active: pickerTab === 'department' }" @click="pickerTab = 'department'">部门</button><button type="button" :class="{ active: pickerTab === 'person' }" @click="pickerTab = 'person'">人员</button></div>
                <ul class="org-list">
                  <li v-if="pickerTab === 'department'" class="root-org"><span class="checkbox" />江苏天马网络科技集团有限公司<span class="lower">下级<ChevronRight :size="13" /></span></li>
                  <li v-for="item in pickerOptions" :key="item">
                    <button type="button" :aria-label="`${pickerDraft.has(item) ? '取消选择' : '选择'}${item}`" @click="togglePickerItem(item)">
                      <span class="checkbox" :class="{ checked: pickerDraft.has(item) }"><Check v-if="pickerDraft.has(item)" :size="13" /></span>
                      <span class="member-avatar"><Users :size="14" /></span>{{ item }}
                      <span v-if="isInheritedOnly(item)" class="picker-inherited">已继承</span>
                    </button>
                  </li>
                </ul>
              </div>
              <div class="picker-right"><strong>已选：{{ pickerSelectedCount }}个</strong><ul><li v-for="item in pickerSelected" :key="item"><span class="member-avatar"><Users :size="14" /></span><span>{{ item }}</span><button type="button" :aria-label="`移除已选${item}`" @click="removePickerItem(item)"><X :size="14" /></button></li></ul></div>
            </div>
            <footer class="dialog-footer picker-footer"><button class="button secondary" type="button" @click="addMemberOpen = false">取消</button><button class="button primary" type="button" @click="confirmPicker">确定</button></footer>
          </section>
        </div>

        <div v-if="kind === 'permission' && impactOpen" class="add-member-overlay">
          <section class="impact-dialog" data-testid="permission-impact-dialog" role="alertdialog" aria-modal="true" aria-labelledby="impact-title">
            <header class="dialog-header"><h2 id="impact-title">确认权限变更</h2><button class="icon-button" type="button" aria-label="关闭影响确认" @click="impactOpen = false"><X :size="19" /></button></header>
            <div class="impact-body">
              <strong>本次变更将影响{{ impactedChildren }}个子资源的权限</strong>
              <p v-if="isFineGrainedTarget">{{ inheritParent ? '继续继承上级权限' : '停止继承上级权限' }}</p>
              <p>生效的可查看对象：{{ effectiveMembers.length }}个</p>
            </div>
            <footer class="dialog-footer picker-footer"><button class="button secondary" type="button" @click="impactOpen = false">取消</button><button class="button primary" type="button" @click="confirmPermissionSave">确认保存</button></footer>
          </section>
        </div>

        <div v-else-if="kind === 'delete'" class="dialog-form delete-form">
          <p>删除后，该资源及其下级内容将无法恢复，确定要删除“{{ target?.name }}”吗？</p>
          <footer class="dialog-footer">
            <button class="button secondary" type="button" @click="close">取消</button>
            <button class="button danger" type="button" @click="emit('confirm-delete')">确定</button>
          </footer>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-overlay{position:fixed;inset:0;z-index:500;display:grid;place-items:center;padding:12px;background:rgba(0,0,0,.4);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#111}.dialog-surface{width:min(480px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;border-radius:12px;background:#fff;box-shadow:0 20px 56px rgba(0,0,0,.18)}.dialog-surface--upload{width:min(740px,calc(100vw - 24px));height:min(806px,calc(100vh - 48px));overflow:hidden;border-radius:24px}.dialog-surface--permission{width:min(480px,calc(100vw - 24px))}.dialog-header{display:flex;min-height:66px;align-items:center;justify-content:space-between;padding:0 24px}.dialog-surface--upload>.dialog-header{min-height:58px;border-bottom:1px solid #f0f0f0}.dialog-header h2{margin:0;font-size:18px;font-weight:600;line-height:26px}.icon-button{display:grid;width:30px;height:30px;place-items:center;border:0;border-radius:7px;background:transparent;color:#777;cursor:pointer}.icon-button:hover{background:#f6f6f7;color:#111}.dialog-form,.rename-form{padding:4px 24px 24px}.field-label{display:block;margin:0 0 8px;font-size:14px;line-height:22px;color:#333}.field-label~.field-label{margin-top:20px}.field-label i{margin-right:4px;color:#f04438;font-style:normal}.text-field{box-sizing:border-box;width:100%;height:40px;border:1px solid #dedede;border-radius:7px;background:#fff;padding:0 12px;outline:none;font:14px/22px inherit;color:#111;transition:border-color .15s,box-shadow .15s}.text-field::placeholder{color:#aaa}.text-field:focus{border-color:#858585;box-shadow:0 0 0 2px rgba(0,0,0,.06)}.radio-fieldset{margin:20px 0 0;padding:0;border:0}.radio-fieldset legend{margin-bottom:10px}.radio-fieldset label{display:inline-flex;align-items:center;margin-right:28px;gap:7px;font-size:14px;cursor:pointer}.radio-fieldset input{width:16px;height:16px;margin:0;accent-color:#111}.dialog-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:28px}.button{height:32px;min-width:68px;border:1px solid transparent;border-radius:7px;padding:0 16px;font:14px/30px inherit;cursor:pointer}.button.secondary{border-color:#ddd;background:#fff;color:#333}.button.primary{background:#111;color:#fff}.button.danger{background:#df342e;color:#fff}.button:disabled{cursor:not-allowed;background:#ededed;color:#aaa}.upload-form{box-sizing:border-box;display:flex;height:calc(100% - 58px);min-height:0;flex-direction:column;padding:18px 24px 0}.upload-target-row{display:grid;flex:none;grid-template-columns:64px 1fr;align-items:center;gap:12px}.upload-target-row .field-label{margin:0}.upload-target-select{appearance:auto;color:#333}.drop-zone{box-sizing:border-box;display:flex;width:100%;height:148px;min-height:148px;margin-top:16px;flex:none;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px dashed #c8c8c8;border-radius:10px;background:#fafafa;color:#777;cursor:pointer}.drop-zone:hover{border-color:#888;background:#f8f8f8}.drop-zone strong{font-size:14px;font-weight:500;color:#333}.drop-zone span{font-size:12px;line-height:18px;color:#999}.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.upload-messages{flex:none;margin:8px 0 0;padding:0;list-style:none;color:#d92d20;font-size:12px;line-height:18px}.local-files{min-height:0;flex:1;margin-top:14px;overflow:auto;border:1px solid #eee;border-radius:8px;background:#fff}.empty-files{display:flex;height:100%;min-height:250px;align-items:center;justify-content:center;flex-direction:column;color:#b0b0b0}.empty-files strong{margin-top:12px;color:#666;font-size:14px;font-weight:500}.empty-files span{margin-top:5px;font-size:12px}.local-files ul,.member-area ul{margin:0;padding:8px 12px;list-style:none}.local-files li{display:flex;min-height:52px;align-items:center;gap:10px;border-bottom:1px solid #f3f3f3;font-size:13px}.local-files li:last-child{border-bottom:0}.local-files li button{display:grid;width:26px;height:26px;flex:none;place-items:center;border:0;border-radius:6px;background:transparent;color:#888;cursor:pointer}.local-files li button:hover{background:#f3f3f4;color:#333}.file-type-icon{display:grid;width:32px;height:32px;flex:none;place-items:center;border-radius:7px;background:#f4f5f7;color:#666}.file-detail{display:flex;min-width:0;flex:1;flex-direction:column;gap:2px}.file-detail strong{overflow:hidden;color:#333;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.file-detail small{color:#999;font-size:11px}.file-status{display:flex;flex:none;align-items:center;gap:3px;color:#47a76a;font-size:12px}.upload-footer{height:64px;min-height:64px;align-items:center;flex:none;margin:0 -24px;padding:0 24px;border-top:1px solid #f0f0f0}.permission-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.permission-toolbar strong{font-size:14px}.permission-toolbar button{display:flex;align-items:center;gap:5px;border:0;background:transparent;color:#1677ff;font:14px/22px inherit;cursor:pointer}.search-field{display:flex;height:38px;align-items:center;gap:8px;border:1px solid #dedede;border-radius:7px;padding:0 11px;color:#999}.search-field input{width:100%;border:0;outline:0;font:14px/22px inherit}.member-area{height:230px;margin-top:12px;overflow:auto;border:1px solid #eee;border-radius:8px}.member-area>p{display:grid;height:100%;margin:0;place-items:center;font-size:13px;color:#aaa}.member-area li{display:flex;height:42px;align-items:center;gap:10px;border-bottom:1px solid #f4f4f4;font-size:14px}.member-avatar{display:grid;width:28px;height:28px;place-items:center;border-radius:50%;background:#eee;font-size:12px}.delete-form p{margin:2px 0 8px;font-size:14px;line-height:24px;color:#555}.rename-panel{position:fixed;z-index:510;top:176px;right:32px;width:min(324px,calc(100vw - 24px));border:1px solid #ededed;border-radius:10px;background:#fff;box-shadow:0 12px 36px rgba(0,0,0,.15);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#111}.rename-panel .dialog-header{min-height:52px;padding:0 16px}.rename-panel .dialog-header h2{font-size:16px}.rename-form{padding:0 16px 16px}.rename-form textarea{box-sizing:border-box;width:100%;min-height:64px;resize:none;border:1px solid #ddd;border-radius:7px;padding:9px 10px;outline:none;font:14px/22px inherit}.rename-form textarea:focus{border-color:#888}.rename-form .dialog-footer{margin-top:14px}@media(max-width:640px){.dialog-header{padding:0 18px}.dialog-form{padding:4px 18px 18px}.dialog-surface--upload{height:min(760px,calc(100vh - 24px));border-radius:16px}.dialog-surface--upload>.dialog-header{min-height:54px}.upload-form{height:calc(100% - 54px);padding:14px 18px 0}.upload-target-row{grid-template-columns:1fr;gap:6px}.drop-zone{height:132px;min-height:132px;padding:0 12px;text-align:center}.drop-zone span{line-height:17px}.empty-files{min-height:170px}.upload-footer{margin:0 -18px;padding:0 18px}.rename-panel{top:76px;right:12px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
.member-area li{position:relative}.member-name-wrap{display:flex;min-width:0;flex:1;align-items:center;gap:7px}.member-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.inherit-badge{flex:none;border-radius:4px;background:#f0f5ff;padding:1px 5px;color:#315efb;font-size:11px;line-height:18px}.member-role{display:flex;align-items:center;gap:3px;border:0;background:transparent;color:#777;font:12px/20px inherit}.member-role.is-readonly{padding-right:3px;color:#999;cursor:default}.remove-direct-member{display:grid;width:26px;height:26px;flex:none;place-items:center;border:0;border-radius:6px;background:transparent;color:#aaa;cursor:pointer}.remove-direct-member:hover{background:#fff1f0;color:#d92d20}.add-member-overlay{position:fixed;z-index:620;inset:0;display:grid;place-items:center;padding:12px;background:rgba(0,0,0,.25)}.add-member-dialog{width:min(700px,calc(100vw - 24px));height:min(600px,calc(100vh - 24px));border-radius:12px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.2)}.add-member-dialog h2 small{margin-left:10px;color:#999;font-size:12px;font-weight:400}.member-picker-body{display:grid;height:450px;grid-template-columns:1fr 275px;border-top:1px solid #eee;border-bottom:1px solid #eee}.picker-left{padding:16px 18px;border-right:1px solid #eee}.picker-tabs{display:flex;gap:24px;margin-top:12px;border-bottom:1px solid #eee}.picker-tabs button{height:36px;border:0;border-bottom:2px solid transparent;background:#fff;color:#777}.picker-tabs button.active{border-color:#111;color:#111}.org-list,.picker-right ul{margin:0;padding:8px 0;overflow:auto;list-style:none}.org-list{height:340px}.org-list li{display:flex;height:40px;align-items:center;gap:9px;font-size:13px}.checkbox{display:grid;width:16px;height:16px;place-items:center;border:1px solid #c9c9c9;border-radius:3px}.checkbox.checked{border-color:#111;background:#111;color:#fff}.root-org{font-weight:500}.lower{display:flex;align-items:center;margin-left:auto;color:#888;font-size:12px}.picker-right{padding:18px}.picker-right>strong{font-size:14px}.picker-right ul{height:390px}.picker-right li{display:flex;height:42px;align-items:center;gap:9px;font-size:13px}.picker-right li svg:last-child{margin-left:auto;color:#aaa}.picker-footer{height:68px;margin:0;padding:17px 24px}@media(max-width:640px){.member-picker-body{grid-template-columns:1fr}.picker-right{display:none}}
.dialog-surface--permission{width:min(520px,calc(100vw - 24px))}.dialog-surface--permission .member-area{height:260px}.permission-toolbar-actions{display:flex;align-items:center;gap:18px}.permission-toolbar .inherit-toggle{display:flex;align-items:center;gap:6px;color:#555;font-size:13px;cursor:pointer}.inherit-toggle input{width:16px;height:16px;margin:0;accent-color:#1677ff}.permission-error{margin:8px 0 0;color:#d92d20;font-size:12px;line-height:18px}.permission-form>.dialog-footer{margin-top:18px}.org-list li>button{display:flex;width:100%;height:40px;align-items:center;gap:9px;border:0;background:transparent;padding:0;color:#333;font:13px/20px inherit;text-align:left;cursor:pointer}.org-list li>button:hover{background:#f7f7f9}.org-list li>button:disabled{color:#aaa;cursor:not-allowed}.org-list li>button:disabled:hover{background:transparent}.picker-inherited{margin-left:auto;border-radius:4px;background:#f0f5ff;padding:1px 5px;color:#315efb;font-size:11px;line-height:18px}.picker-right li>span:nth-child(2){min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.picker-right li>button{display:grid;width:24px;height:24px;place-items:center;border:0;border-radius:5px;background:transparent;color:#aaa;cursor:pointer}.picker-right li>button:hover{background:#f2f2f3;color:#333}.impact-dialog{width:min(420px,calc(100vw - 24px));border-radius:12px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.2)}.impact-body{padding:2px 24px 4px}.impact-body>strong{display:block;font-size:15px;line-height:24px}.impact-body p{margin:10px 0 0;color:#666;font-size:13px;line-height:20px}
.direct-badge{flex:none;border-radius:4px;background:#f3f0ff;padding:1px 5px;color:#6e43d6;font-size:11px;line-height:18px}
.special-parse-option{display:flex;flex:none;align-items:flex-start;gap:9px;margin-top:12px;border:1px solid #e5e7eb;border-radius:9px;background:#fafafa;padding:10px 12px;cursor:pointer}.special-parse-option>input{width:16px;height:16px;margin:2px 0 0;accent-color:#111}.special-parse-option>span,.special-parse-option strong,.special-parse-option small{display:block}.special-parse-option strong{color:#333;font-size:13px;font-weight:500}.special-parse-option small{margin-top:3px;color:#999;font-size:11px}
</style>
