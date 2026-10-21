<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronDown, ChevronRight, FileText, Search, UploadCloud, UserPlus, Users, X } from 'lucide-vue-next'
import KnowledgeDestinationSelect from './KnowledgeDestinationSelect.vue'
import { canChangeKnowledgeMember, canConfigureKnowledge, canGrantKnowledge, canRemoveKnowledgeMember, normalizeKnowledgeRole, knowledgeRoles, type KnowledgeRole } from '@/types/knowledge-permission'
import type { KnowledgeDestination, KnowledgeDialogKind, KnowledgeOwnershipTransfer, KnowledgePermissionSnapshot, KnowledgeSpace, SourceKnowledgeBase, SourceKnowledgeNode } from '@/types/knowledge-source'

type DialogKind = KnowledgeDialogKind | 'rename'

const props = defineProps<{
  kind: DialogKind
  target?: SourceKnowledgeBase | SourceKnowledgeNode | null | undefined
  destinations?: KnowledgeDestination[]
  actorRole?: KnowledgeRole
  systemAdmin?: boolean
}>()

const emit = defineEmits<{
  close: []
  create: [payload: { name: string; space: KnowledgeSpace }]
  folder: [payload: { name: string; kb: string }]
  upload: [files: File[], destinationId: string, options: { monthlyReport: boolean }]
  rename: [name: string]
  permission: [payload: { resourceId: string; members: string[]; inheritParent: boolean; revision: number; roles: Record<string, KnowledgeRole>; subjectKinds?: Record<string, 'person' | 'department'>; initialPermissionSubjects?: string[]; syncedRoles?: Record<string, KnowledgeRole>; owner: string; ownershipTransfer?: KnowledgeOwnershipTransfer }]
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
const permissionCache = ref<Record<string, KnowledgePermissionSnapshot>>({})
const members = ref<string[]>([...sourceMembers])
const roles = ref<Record<string, KnowledgeRole>>({})
const subjectKinds = ref<Record<string, 'person' | 'department'>>({})
const savedMemberRoles = ref<Record<string, KnowledgeRole>>({})
const initialPermissionSubjects = ref<string[]>([])
const owner = ref('')
const roleMenu = ref('')
const roleMenuStyle = ref<Record<string, string>>({})
function toggleRoleMenu(member: string, event: MouseEvent) {
  if (!mayChange(member)) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  roleMenuStyle.value = { position: 'fixed', left: Math.max(12, rect.right - 246) + 'px', top: Math.max(12, Math.min(rect.bottom + 4, window.innerHeight - 370)) + 'px', bottom: 'auto', right: 'auto', maxHeight: 'calc(100vh - 24px)', overflowY: 'auto' }
  roleMenu.value = roleMenu.value === member ? '' : member
}
const transferTarget = ref('')
const transferOpen = ref(false)
const transferPickerOpen = ref(false)
const transferSearch = ref('')
const ownershipTransferDraft = ref<KnowledgeOwnershipTransfer>()
const originalOwner = ref('')
const ownershipProjectionBase = ref<Record<string, { direct: boolean; role?: KnowledgeRole; initial: boolean }>>({})
const actor = computed(() => props.actorRole ?? 'MANAGER')
const mayConfigure = computed(() => props.systemAdmin || canConfigureKnowledge(actor.value))
const mayTransfer = computed(() => Boolean(props.systemAdmin))
const roleFor = (member: string): KnowledgeRole => normalizeKnowledgeRole(roles.value[member] ?? 'DOWNLOADER')
const roleLabel = (member: string) => knowledgeRoles.find(item => item.value === roleFor(member))?.label ?? '仅可查看'
const isDepartment = (member: string) => subjectKinds.value[member] === 'department' || departmentOptions.includes(member)
const mayChange = (member: string) => member !== owner.value && mayConfigure.value && !isInheritedMember(member) && canChangeKnowledgeMember(actor.value, roleFor(member), props.systemAdmin)
const mayGrant = (member: string, value: KnowledgeRole) => (!isDepartment(member) || normalizeKnowledgeRole(value) !== 'MANAGER') && canGrantKnowledge(actor.value, value, props.systemAdmin)
function setRole(member: string, value: KnowledgeRole) {
  if (!mayChange(member) || !mayGrant(member, value)) return
  roles.value = { ...roles.value, [member]: normalizeKnowledgeRole(value) }
  roleMenu.value = ''
}
function requestTransfer(member = '') {
  if (!mayTransfer.value) return
  transferTarget.value = personOptions.includes(member) && member !== originalOwner.value ? member : ownershipTransferDraft.value?.newOwner ?? ''
  transferPickerOpen.value = false
  transferSearch.value = ''
  transferOpen.value = true
  roleMenu.value = ''
}
function selectTransferPerson(person: string) {
  if (!personOptions.includes(person) || person === originalOwner.value) return
  transferTarget.value = person
  transferPickerOpen.value = false
  transferSearch.value = ''
}
function confirmTransfer() {
  if (!mayTransfer.value || !personOptions.includes(transferTarget.value) || transferTarget.value === originalOwner.value) return
  if (ownershipTransferDraft.value) {
    for (const person of [originalOwner.value, ownershipTransferDraft.value.newOwner]) {
      const baseline = ownershipProjectionBase.value[person]
      if (!baseline) continue
      members.value = members.value.filter(member => member !== person)
      if (baseline.direct) members.value.push(person)
      initialPermissionSubjects.value = initialPermissionSubjects.value.filter(subject => subject !== person)
      if (baseline.initial) initialPermissionSubjects.value.push(person)
      const restoredRoles = { ...roles.value }
      if (baseline.role) restoredRoles[person] = baseline.role
      else delete restoredRoles[person]
      roles.value = restoredRoles
    }
  }
  const previous = originalOwner.value
  ownershipProjectionBase.value = Object.fromEntries([previous, transferTarget.value].map(person => [person, { direct: members.value.includes(person), initial: initialPermissionSubjects.value.includes(person), ...(roles.value[person] ? { role: roles.value[person] } : {}) }]))
  owner.value = transferTarget.value
  initialPermissionSubjects.value = initialPermissionSubjects.value.filter(subject => subject !== owner.value && subject !== previous)
  const nextMembers = members.value.filter(item => item !== owner.value && item !== previous)
  const nextRoles = { ...roles.value }
  delete nextRoles[owner.value]
  delete nextRoles[previous]
  nextMembers.push(previous)
  nextRoles[previous] = 'DOWNLOADER'
  members.value = [...new Set(nextMembers)]
  roles.value = nextRoles
  ownershipTransferDraft.value = {
    previousOwner: previous,
    newOwner: owner.value,
  }
  transferOpen.value = false
  transferPickerOpen.value = false
}
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
const isSourceLinkedDocument = computed(() => Boolean(props.target && 'kind' in props.target && props.target.sourceDocumentId))
const transferPeople = computed(() => {
  const keyword = transferSearch.value.trim().toLowerCase()
  return personOptions.filter(person => person !== originalOwner.value && (!keyword || person.toLowerCase().includes(keyword)))
})
const inheritedMembers = computed(() => (
  isFineGrainedTarget.value && inheritParent.value ? inheritedSourceMembers : []
))
const effectiveMembers = computed(() => Array.from(new Set([...inheritedMembers.value, ...members.value])).filter(member => member !== owner.value))
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
const pickerSelectedCount = computed(() => pickerSelected.value.length)
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
    selectedKnowledgeBase.value = props.target && 'space' in props.target ? props.target.id : ''
    selectedUploadTarget.value = props.kind === 'upload' ? props.target?.id ?? '' : ''
    files.value = []
    uploadMessages.value = []
    monthlyReportParse.value = false
    memberSearch.value = ''
    const resourceId = props.target?.id ?? 'all'
    const fineGrained = isFineGrainedTarget.value
    const saved = props.target?.permission ?? permissionCache.value[resourceId] ?? {
      members: fineGrained ? [...defaultFineGrainedMembers] : [...sourceMembers],
      inheritParent: fineGrained,
      revision: 1,
    }
    subjectKinds.value = { ...saved.subjectKinds }
    members.value = [...new Set([...saved.members, ...Object.keys(saved.syncedRoles ?? {})])]
    roles.value = Object.fromEntries(members.value.map(member => {
      const direct = saved.roles?.[member]
      const synced = saved.syncedRoles?.[member]
      const merged = knowledgeRoles.find(option => option.value === normalizeKnowledgeRole(direct ?? synced ?? 'DOWNLOADER'))!.value
      const syncedRole = synced ? normalizeKnowledgeRole(synced) : undefined
      const role = direct && syncedRole && knowledgeRoles.findIndex(option => option.value === syncedRole) < knowledgeRoles.findIndex(option => option.value === merged) ? syncedRole : merged
      return [member, isDepartment(member) && role === 'MANAGER' ? 'DOWNLOADER' : role]
    }))
    savedMemberRoles.value = { ...roles.value }
    owner.value = saved.owner ?? props.target?.owner ?? '当前用户'
    initialPermissionSubjects.value = [...new Set([...(saved.initialPermissionSubjects ?? []), ...Object.keys(saved.syncedRoles ?? {})])].filter(subject => members.value.includes(subject) && subject !== owner.value)
    originalOwner.value = owner.value
    ownershipProjectionBase.value = {}
    roleMenu.value = ''
    transferOpen.value = false
    transferPickerOpen.value = false
    ownershipTransferDraft.value = undefined
    inheritParent.value = isSourceLinkedDocument.value ? false : saved.inheritParent
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
  if (!mayConfigure.value) return
  pickerDraft.value = new Set(members.value)
  pickerSearch.value = ''
  addMemberOpen.value = true
}

function removeMember(member: string) {
  if (!canRemoveDirectMember(member)) return
  members.value = members.value.filter((item) => item !== member)
  initialPermissionSubjects.value = initialPermissionSubjects.value.filter(subject => subject !== member)
  const nextRoles = { ...roles.value }
  delete nextRoles[member]
  roles.value = nextRoles
  roleMenu.value = ''
}

function updateMemberSearch(event: Event) {
  memberSearch.value = (event.target as HTMLInputElement).value
}

function updateInheritance(event: Event) {
  if (isSourceLinkedDocument.value) {
    inheritParent.value = false
    return
  }
  if (!mayConfigure.value) return
  inheritParent.value = (event.target as HTMLInputElement).checked
}

function togglePickerItem(item: string) {
  if (isPickerSelected(item) && !canRemovePickerItem(item)) return
  const next = new Set(pickerDraft.value)
  if (next.has(item)) next.delete(item)
  else next.add(item)
  pickerDraft.value = next
}
function isPickerSelected(item: string) {
  return pickerDraft.value.has(item)
}

function canRemovePickerItem(item: string) {
  return !members.value.includes(item) || canRemoveDirectMember(item)
}

function removePickerItem(item: string) {
  if (!canRemovePickerItem(item)) return
  const next = new Set(pickerDraft.value)
  next.delete(item)
  pickerDraft.value = next
}

function confirmPicker() {
  const protectedMembers = members.value.filter(member => !canRemoveDirectMember(member))
  members.value = [...new Set([...pickerDraft.value, ...protectedMembers])].filter(member => member !== owner.value)
  initialPermissionSubjects.value = initialPermissionSubjects.value.filter(subject => members.value.includes(subject))
  roles.value = Object.fromEntries(members.value.map(member => [member, roles.value[member] ?? 'DOWNLOADER']))
  subjectKinds.value = Object.fromEntries(members.value.map(member => [member, isDepartment(member) ? 'department' : 'person']))
  permissionError.value = ''
  addMemberOpen.value = false
}

function requestPermissionSave() {
  if (!mayConfigure.value) return
  if (!owner.value.trim()) {
    permissionError.value = '必须保留创建者'
    return
  }
  permissionError.value = ''
  impactOpen.value = true
}

function confirmPermissionSave() {
  if (!mayConfigure.value || !impactOpen.value) return
  const resourceId = props.target?.id ?? 'all'
  const revision = baseRevision.value + 1
  const saved = {
    members: [...members.value],
    inheritParent: inheritParent.value,
    revision,
    roles: { ...roles.value },
    initialPermissionSubjects: initialPermissionSubjects.value.filter(subject => members.value.includes(subject) && subject !== owner.value),
    subjectKinds: Object.fromEntries(members.value.map(member => [member, isDepartment(member) ? 'department' as const : 'person' as const])),
    owner: owner.value,
  }
  permissionCache.value = { ...permissionCache.value, [resourceId]: saved }
  impactOpen.value = false
  emit('permission', { resourceId, ...saved, ...(ownershipTransferDraft.value ? { ownershipTransfer: { ...ownershipTransferDraft.value } } : {}) })
}

function isInheritedOnly(member: string) {
  return isInheritedMember(member) && !isDirectMember(member)
}

function isInheritedMember(member: string) {
  return isFineGrainedTarget.value
    && inheritParent.value
    && inheritedSourceMembers.includes(member)
}

function isInitialPermissionMember(member: string) {
  return initialPermissionSubjects.value.includes(member)
}

function isDirectMember(member: string) {
  return members.value.includes(member)
}

function canRemoveDirectMember(member: string) {
  return members.value.includes(member) && mayChange(member) && canRemoveKnowledgeMember(actor.value, savedMemberRoles.value[member] ?? roleFor(member), props.systemAdmin)
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
          <KnowledgeDestinationSelect id="folder-kb" v-model="selectedKnowledgeBase" :destinations="uploadDestinations" label="所属知识库" root-only />
          <footer class="dialog-footer">
            <button class="button secondary" type="button" @click="close">取消</button>
            <button class="button primary" type="submit" :disabled="!isFolderValid">新建</button>
          </footer>
        </form>

        <form v-else-if="kind === 'upload'" class="dialog-form upload-form" @submit.prevent="submitUpload">
          <div class="upload-target-row">
            <label class="field-label" for="upload-target"><i>*</i>上传至</label>
            <KnowledgeDestinationSelect id="upload-target" v-model="selectedUploadTarget" :destinations="uploadDestinations" label="上传至" />
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
            <strong>全部成员</strong>
            <div class="permission-toolbar-actions">
              <label v-if="isFineGrainedTarget" class="inherit-toggle" :title="isSourceLinkedDocument ? '钉钉导入文档按来源权限独立设置，不继承上级权限' : '开启后，上级权限会随上级配置自动更新'">
                <input :checked="inheritParent" :disabled="!mayConfigure || isSourceLinkedDocument" type="checkbox" aria-label="继承上级权限" @input="updateInheritance" />
                <span>继承上级</span>
              </label>
              <button type="button" aria-label="添加成员" :disabled="!mayConfigure" @click="addMember"><UserPlus :size="15" />添加成员</button>
            </div>
          </div>
          <label class="search-field">
            <Search :size="16" />
            <input :value="memberSearch" aria-label="搜索部门/人员" placeholder="搜索部门/人员" @input="updateMemberSearch" @keydown.enter.prevent="addMember" />
          </label>
          <div class="member-area">
            <ul>
              <li class="permission-owner" data-testid="knowledge-owner-row">
                <span class="member-avatar">{{ owner.slice(0, 1) }}</span>
                <span class="member-name-wrap"><span class="member-name">{{ owner }}</span></span>
                <span class="creator-badge">创建者</span><span class="member-role owner-role">可管理</span>
                <button v-if="mayTransfer" type="button" class="owner-transfer" aria-label="转交所有权" @click="requestTransfer()">转交所有权</button>
              </li>
              <li v-for="member in filteredMembers" :key="member">
                <span class="member-avatar"><Users :size="15" /></span>
                <span class="member-name-wrap">
                  <span class="member-name">{{ member }}</span>
                  <span v-if="isInheritedMember(member)" class="inherit-badge">来自上级</span>
                  <span v-if="isInitialPermissionMember(member)" class="permission-source-badge" data-testid="permission-sync-origin">权限同步</span>
                  <span v-else-if="isDirectMember(member)" class="direct-badge">直接设置</span>
                </span>
                <div class="role-control">
                  <button type="button" class="member-role" :aria-label="`${member}权限`" :disabled="!mayChange(member)" :aria-expanded="roleMenu === member" @click="toggleRoleMenu(member, $event)">{{ roleLabel(member) }}<ChevronDown v-if="mayChange(member)" :size="13" /></button>
                  <div v-if="roleMenu === member" class="role-options" :style="roleMenuStyle" role="menu" :aria-label="`${member}权限选项`">
                    <button v-for="option in knowledgeRoles" :key="option.value" type="button" role="menuitem" :disabled="!mayGrant(member, option.value)" @click="setRole(member, option.value)"><span>{{ option.label }}<small>{{ option.description }}</small></span><Check v-if="roleFor(member) === option.value" :size="15" /></button>
                    <button v-if="mayTransfer && personOptions.includes(member)" type="button" role="menuitem" @click="requestTransfer(member)"><span>设为创建者<small>设置后，该成员成为创建者并获得可管理权限</small></span></button>
                    <button v-if="canRemoveDirectMember(member)" class="remove-member-option" type="button" role="menuitem" :aria-label="`移除${member}直接设置`" @click="removeMember(member)">移除</button>
                  </div>
                </div>
              </li>
            </ul>
            <p v-if="!filteredMembers.length && memberSearch">未找到匹配的成员</p>
          </div>
          <p v-if="permissionError" class="permission-error" role="alert">{{ permissionError }}</p>
          <footer class="dialog-footer">
            <button class="button secondary" type="button" @click="close">取消</button>
            <button class="button primary" type="submit" :disabled="!mayConfigure">保存</button>
          </footer>
        </form>

        <div v-if="kind === 'permission' && transferOpen" class="add-member-overlay">
          <section class="ownership-dialog" role="dialog" aria-modal="true" data-testid="ownership-transfer-dialog" aria-labelledby="ownership-title" @click="transferPickerOpen = false">
            <header class="ownership-header"><h2 id="ownership-title">转交「{{ target?.name }}」的所有权</h2><button type="button" class="icon-button" aria-label="关闭创建者转交" @click="transferOpen = false"><X :size="20" /></button></header>
            <div class="ownership-body">
              <p class="ownership-current">当前创建者：{{ originalOwner }}</p>
              <label id="transfer-owner-label" class="ownership-label">新创建者</label>
              <div class="ownership-picker" @keydown.esc.prevent.stop="transferPickerOpen = false">
                <button type="button" class="ownership-person-trigger" role="combobox" aria-label="新创建者" aria-haspopup="listbox" aria-controls="transfer-owner-options" :aria-expanded="transferPickerOpen" @click.stop="transferPickerOpen = !transferPickerOpen">
                  <span v-if="transferTarget" class="ownership-person-avatar">{{ transferTarget.slice(0, 1) }}</span>
                  <span :class="{ 'ownership-placeholder': !transferTarget }">{{ transferTarget || '请选择成员' }}</span>
                  <ChevronDown :size="16" />
                </button>
                <div v-if="transferPickerOpen" class="ownership-person-popover" @click.stop>
                  <label class="ownership-person-search"><Search :size="17" /><input v-model="transferSearch" type="text" aria-label="搜索新创建者" placeholder="搜索成员" autocomplete="off" /></label>
                  <ul id="transfer-owner-options" class="ownership-person-options" role="listbox" aria-label="可转交成员">
                    <li v-for="person in transferPeople" :key="person"><button type="button" role="option" :aria-label="`选择新创建者${person}`" :aria-selected="transferTarget === person" @click="selectTransferPerson(person)"><span class="ownership-person-avatar">{{ person.slice(0, 1) }}</span><span>{{ person }}</span><Check v-if="transferTarget === person" :size="17" /></button></li>
                    <li v-if="!transferPeople.length" class="ownership-person-empty">未找到匹配的成员</li>
                  </ul>
                </div>
              </div>
              <p class="ownership-fixed-result">转交后，原创建者的直接权限改为可查看。</p>
            </div>
            <footer class="ownership-footer"><button type="button" class="button secondary" @click="transferOpen = false">取消</button><button type="button" class="button primary" :disabled="!transferTarget" @click="confirmTransfer">确定</button></footer>
          </section>
        </div>

        <div v-if="kind === 'permission' && addMemberOpen" class="add-member-overlay">
          <section class="add-member-dialog" data-testid="add-member-dialog" role="dialog" aria-modal="true" aria-labelledby="add-member-title">
            <header class="dialog-header"><h2 id="add-member-title">添加成员 <small>选择部门或人员</small></h2><button class="icon-button" type="button" aria-label="关闭添加成员" @click="addMemberOpen = false"><X :size="19" /></button></header>
            <div class="member-picker-body">
              <div class="picker-left">
                <label class="search-field"><Search :size="16" /><input v-model="pickerSearch" :placeholder="pickerTab === 'department' ? '搜索部门...' : '搜索人员...'" /></label>
                <div class="picker-tabs"><button type="button" :class="{ active: pickerTab === 'department' }" @click="pickerTab = 'department'">部门</button><button type="button" :class="{ active: pickerTab === 'person' }" @click="pickerTab = 'person'">人员</button></div>
                <ul class="org-list">
                  <li v-if="pickerTab === 'department'" class="root-org"><span class="checkbox" />江苏天马网络科技集团有限公司<span class="lower">下级<ChevronRight :size="13" /></span></li>
                  <li v-for="item in pickerOptions" :key="item">
                    <button type="button" :aria-label="`${isPickerSelected(item) ? '取消选择' : '选择'}${item}`" :disabled="isPickerSelected(item) && !canRemovePickerItem(item)" @click="togglePickerItem(item)">
                      <span class="checkbox" :class="{ checked: isPickerSelected(item) }"><Check v-if="isPickerSelected(item)" :size="13" /></span>
                      <span class="member-avatar"><Users :size="14" /></span>{{ item }}
                      <span v-if="isInheritedOnly(item)" class="picker-inherited">已继承</span>
                    </button>
                  </li>
                </ul>
              </div>
              <div class="picker-right"><strong>已选：{{ pickerSelectedCount }}个</strong><ul><li v-for="item in pickerSelected" :key="item"><span class="member-avatar"><Users :size="14" /></span><span>{{ item }}</span><button type="button" :aria-label="`移除已选${item}`" :disabled="!canRemovePickerItem(item)" @click="removePickerItem(item)"><X :size="14" /></button></li></ul></div>
            </div>
            <footer class="dialog-footer picker-footer"><button class="button secondary" type="button" @click="addMemberOpen = false">取消</button><button class="button primary" type="button" @click="confirmPicker">确定</button></footer>
          </section>
        </div>

        <div v-if="kind === 'permission' && impactOpen" class="add-member-overlay">
          <section class="impact-dialog" data-testid="permission-impact-dialog" role="alertdialog" aria-modal="true" aria-labelledby="impact-title">
            <header class="dialog-header"><h2 id="impact-title">确认权限变更</h2><button class="icon-button" type="button" aria-label="关闭影响确认" @click="impactOpen = false"><X :size="19" /></button></header>
            <div class="impact-body">
              <strong>本次变更将影响{{ impactedChildren }}个子资源的权限</strong>
              <p v-if="ownershipTransferDraft" class="ownership-impact-count">本次仅转交当前资源的创建者身份</p>
              <p v-if="isFineGrainedTarget">{{ inheritParent ? '继续继承上级权限' : '停止继承上级权限' }}</p>
              <p>全部成员：{{ effectiveMembers.length + 1 }}项（含创建者）</p>
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
.role-options .remove-member-option{border-top:1px solid #eee;color:#d92d20}
.ownership-dialog{box-sizing:border-box;width:min(600px,calc(100vw - 32px));border-radius:14px;background:#fff;color:#1f2329;box-shadow:0 20px 64px #0003}
.ownership-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:24px 28px 0}
.ownership-header h2{min-width:0;margin:0;font-size:19px;font-weight:600;line-height:28px;overflow-wrap:anywhere}
.ownership-header .icon-button{flex:none}
.ownership-body{padding:10px 28px 0}
.ownership-current{margin:0 0 27px;color:#8f959e;font-size:13px;line-height:22px}
.ownership-label{display:block;margin-bottom:10px;font-size:14px;font-weight:500;line-height:22px}
.ownership-picker{position:relative}
.ownership-person-trigger{display:flex;align-items:center;gap:10px;box-sizing:border-box;width:100%;height:42px;border:1px solid #d9dce1;border-radius:7px;padding:0 12px;background:#fff;color:#1f2329;font:14px inherit;text-align:left;cursor:pointer}
.ownership-person-trigger:focus-visible,.ownership-person-trigger[aria-expanded=true]{border-color:#3370ff;outline:none;box-shadow:0 0 0 2px #3370ff15}
.ownership-person-trigger>svg{margin-left:auto;color:#8f959e}
.ownership-placeholder{color:#a8adb5}
.ownership-person-avatar{display:grid;place-items:center;flex:none;width:27px;height:27px;border-radius:50%;background:#edf2ff;color:#4466bc;font-size:12px}
.ownership-person-popover{position:absolute;z-index:8;top:calc(100% + 6px);left:0;right:0;box-sizing:border-box;border:1px solid #e7e9ed;border-radius:9px;padding:10px 0 6px;background:#fff;box-shadow:0 8px 30px #1f23292b}
.ownership-person-search{display:flex;align-items:center;gap:8px;height:35px;margin:0 11px 7px;border:1px solid #d9dce1;border-radius:5px;padding:0 10px;color:#8f959e}
.ownership-person-search input{min-width:0;width:100%;border:0;outline:0;background:transparent;color:#1f2329;font:13px inherit}
.ownership-person-options{max-height:240px;overflow:auto;margin:0;padding:0 5px;list-style:none}
.ownership-person-options li>button{display:flex;align-items:center;gap:10px;width:100%;height:44px;border:0;border-radius:5px;padding:0 10px;background:transparent;color:#1f2329;font:14px inherit;text-align:left;cursor:pointer}
.ownership-person-options li>button:hover,.ownership-person-options li>button[aria-selected=true]{background:#f2f6ff}
.ownership-person-options li>button>svg{margin-left:auto;color:#3370ff}
.ownership-person-empty{padding:24px 12px;text-align:center;color:#8f959e;font-size:13px}
.ownership-fixed-result{margin:22px 0 0;color:#8f959e;font-size:13px;line-height:22px}
.creator-badge{border-radius:4px;background:#edf2ff;padding:1px 5px;color:#315efb;font-size:11px;line-height:18px}
.ownership-footer{display:flex;justify-content:flex-end;gap:10px;padding:32px 28px 25px}
.ownership-footer .button{height:34px;min-width:72px;line-height:32px}
.ownership-footer .primary{background:#3370ff}
.ownership-footer .primary:disabled{background:#a6c1ff;color:#fff}
.ownership-footer .secondary{border-color:#d9dce1;color:#4e5969}
@media(max-width:640px){.ownership-header{padding:20px 20px 0}.ownership-header h2{font-size:17px}.ownership-body{padding:10px 20px 0}.ownership-footer{padding:28px 20px 20px}.ownership-retain-row{flex-wrap:wrap;gap:10px}}
.owner-transfer{flex:none;border:0;background:transparent;padding:0;color:#1677ff;font:12px/20px inherit;cursor:pointer}.owner-transfer:hover{text-decoration:underline}
.dialog-surface--permission .member-area:has(.role-options){overflow:auto}
.member-role.owner-role{margin-left:auto;cursor:default;color:#888}.role-control{position:relative;margin-left:auto}.member-role{display:flex;align-items:center;gap:5px;border:0;border-radius:5px;background:transparent;padding:6px;color:#333;font:13px inherit;cursor:pointer}.member-role:disabled{cursor:default;color:#888}.role-options{position:absolute;right:0;top:32px;z-index:4;width:246px;border:1px solid #eee;border-radius:9px;padding:5px;background:#fff;box-shadow:0 8px 28px #0002}.role-options button{display:flex;align-items:center;justify-content:space-between;width:100%;border:0;background:transparent;border-radius:5px;text-align:left;padding:9px 10px;color:#333;font:13px inherit;cursor:pointer}.role-options button:hover{background:#f6f7f9}.role-options button:disabled{color:#bbb;cursor:not-allowed}.role-options small{display:block;margin-top:4px;font-size:11px;color:#999}.permission-toolbar button:disabled{color:#aaa;cursor:not-allowed}.member-area li{position:relative}.member-area:has(.role-options){overflow:visible}.member-area:has(.role-options) li:nth-last-child(-n+4) .role-options{top:auto;bottom:30px}
.dialog-overlay{position:fixed;inset:0;z-index:500;display:grid;place-items:center;padding:12px;background:rgba(0,0,0,.4);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#111}.dialog-surface{width:min(480px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;border-radius:12px;background:#fff;box-shadow:0 20px 56px rgba(0,0,0,.18)}.dialog-surface--upload{width:min(740px,calc(100vw - 24px));height:min(806px,calc(100vh - 48px));overflow:hidden;border-radius:24px}.dialog-surface--permission{width:min(480px,calc(100vw - 24px))}.dialog-header{display:flex;min-height:66px;align-items:center;justify-content:space-between;padding:0 24px}.dialog-surface--upload>.dialog-header{min-height:58px;border-bottom:1px solid #f0f0f0}.dialog-header h2{margin:0;font-size:18px;font-weight:600;line-height:26px}.icon-button{display:grid;width:30px;height:30px;place-items:center;border:0;border-radius:7px;background:transparent;color:#777;cursor:pointer}.icon-button:hover{background:#f6f6f7;color:#111}.dialog-form,.rename-form{padding:4px 24px 24px}.field-label{display:block;margin:0 0 8px;font-size:14px;line-height:22px;color:#333}.field-label~.field-label{margin-top:20px}.field-label i{margin-right:4px;color:#f04438;font-style:normal}.text-field{box-sizing:border-box;width:100%;height:40px;border:1px solid #dedede;border-radius:7px;background:#fff;padding:0 12px;outline:none;font:14px/22px inherit;color:#111;transition:border-color .15s,box-shadow .15s}.text-field::placeholder{color:#aaa}.text-field:focus{border-color:#858585;box-shadow:0 0 0 2px rgba(0,0,0,.06)}.radio-fieldset{margin:20px 0 0;padding:0;border:0}.radio-fieldset legend{margin-bottom:10px}.radio-fieldset label{display:inline-flex;align-items:center;margin-right:28px;gap:7px;font-size:14px;cursor:pointer}.radio-fieldset input{width:16px;height:16px;margin:0;accent-color:#111}.dialog-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:28px}.button{height:32px;min-width:68px;border:1px solid transparent;border-radius:7px;padding:0 16px;font:14px/30px inherit;cursor:pointer}.button.secondary{border-color:#ddd;background:#fff;color:#333}.button.primary{background:#111;color:#fff}.button.danger{background:#df342e;color:#fff}.button:disabled{cursor:not-allowed;background:#ededed;color:#aaa}.upload-form{box-sizing:border-box;display:flex;height:calc(100% - 58px);min-height:0;flex-direction:column;padding:18px 24px 0}.upload-target-row{display:grid;flex:none;grid-template-columns:64px 1fr;align-items:center;gap:12px}.upload-target-row .field-label{margin:0}.upload-target-select{appearance:auto;color:#333}.drop-zone{box-sizing:border-box;display:flex;width:100%;height:148px;min-height:148px;margin-top:16px;flex:none;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px dashed #c8c8c8;border-radius:10px;background:#fafafa;color:#777;cursor:pointer}.drop-zone:hover{border-color:#888;background:#f8f8f8}.drop-zone strong{font-size:14px;font-weight:500;color:#333}.drop-zone span{font-size:12px;line-height:18px;color:#999}.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.upload-messages{flex:none;margin:8px 0 0;padding:0;list-style:none;color:#d92d20;font-size:12px;line-height:18px}.local-files{min-height:0;flex:1;margin-top:14px;overflow:auto;border:1px solid #eee;border-radius:8px;background:#fff}.empty-files{display:flex;height:100%;min-height:250px;align-items:center;justify-content:center;flex-direction:column;color:#b0b0b0}.empty-files strong{margin-top:12px;color:#666;font-size:14px;font-weight:500}.empty-files span{margin-top:5px;font-size:12px}.local-files ul,.member-area ul{margin:0;padding:8px 12px;list-style:none}.local-files li{display:flex;min-height:52px;align-items:center;gap:10px;border-bottom:1px solid #f3f3f3;font-size:13px}.local-files li:last-child{border-bottom:0}.local-files li button{display:grid;width:26px;height:26px;flex:none;place-items:center;border:0;border-radius:6px;background:transparent;color:#888;cursor:pointer}.local-files li button:hover{background:#f3f3f4;color:#333}.file-type-icon{display:grid;width:32px;height:32px;flex:none;place-items:center;border-radius:7px;background:#f4f5f7;color:#666}.file-detail{display:flex;min-width:0;flex:1;flex-direction:column;gap:2px}.file-detail strong{overflow:hidden;color:#333;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.file-detail small{color:#999;font-size:11px}.file-status{display:flex;flex:none;align-items:center;gap:3px;color:#47a76a;font-size:12px}.upload-footer{height:64px;min-height:64px;align-items:center;flex:none;margin:0 -24px;padding:0 24px;border-top:1px solid #f0f0f0}.permission-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.permission-toolbar strong{font-size:14px}.permission-toolbar button{display:flex;align-items:center;gap:5px;border:0;background:transparent;color:#1677ff;font:14px/22px inherit;cursor:pointer}.search-field{display:flex;height:38px;align-items:center;gap:8px;border:1px solid #dedede;border-radius:7px;padding:0 11px;color:#999}.search-field input{width:100%;border:0;outline:0;font:14px/22px inherit}.member-area{height:230px;margin-top:12px;overflow:auto;border:1px solid #eee;border-radius:8px}.member-area>p{display:grid;height:100%;margin:0;place-items:center;font-size:13px;color:#aaa}.member-area li{display:flex;height:42px;align-items:center;gap:10px;border-bottom:1px solid #f4f4f4;font-size:14px}.member-avatar{display:grid;width:28px;height:28px;place-items:center;border-radius:50%;background:#eee;font-size:12px}.delete-form p{margin:2px 0 8px;font-size:14px;line-height:24px;color:#555}.rename-panel{position:fixed;z-index:510;top:176px;right:32px;width:min(324px,calc(100vw - 24px));border:1px solid #ededed;border-radius:10px;background:#fff;box-shadow:0 12px 36px rgba(0,0,0,.15);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#111}.rename-panel .dialog-header{min-height:52px;padding:0 16px}.rename-panel .dialog-header h2{font-size:16px}.rename-form{padding:0 16px 16px}.rename-form textarea{box-sizing:border-box;width:100%;min-height:64px;resize:none;border:1px solid #ddd;border-radius:7px;padding:9px 10px;outline:none;font:14px/22px inherit}.rename-form textarea:focus{border-color:#888}.rename-form .dialog-footer{margin-top:14px}@media(max-width:640px){.dialog-header{padding:0 18px}.dialog-form{padding:4px 18px 18px}.dialog-surface--upload{height:min(760px,calc(100vh - 24px));border-radius:16px}.dialog-surface--upload>.dialog-header{min-height:54px}.upload-form{height:calc(100% - 54px);padding:14px 18px 0}.upload-target-row{grid-template-columns:1fr;gap:6px}.drop-zone{height:132px;min-height:132px;padding:0 12px;text-align:center}.drop-zone span{line-height:17px}.empty-files{min-height:170px}.upload-footer{margin:0 -18px;padding:0 18px}.rename-panel{top:76px;right:12px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
.member-area li{position:relative}.member-name-wrap{display:flex;min-width:0;flex:1;align-items:center;gap:7px}.member-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.inherit-badge{flex:none;border-radius:4px;background:#f0f5ff;padding:1px 5px;color:#315efb;font-size:11px;line-height:18px}.member-role{display:flex;align-items:center;gap:3px;border:0;background:transparent;color:#777;font:12px/20px inherit}.member-role.is-readonly{padding-right:3px;color:#999;cursor:default}.remove-direct-member{display:grid;width:26px;height:26px;flex:none;place-items:center;border:0;border-radius:6px;background:transparent;color:#aaa;cursor:pointer}.remove-direct-member:hover{background:#fff1f0;color:#d92d20}.add-member-overlay{position:fixed;z-index:620;inset:0;display:grid;place-items:center;padding:12px;background:rgba(0,0,0,.25)}.add-member-dialog{width:min(700px,calc(100vw - 24px));height:min(600px,calc(100vh - 24px));border-radius:12px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.2)}.add-member-dialog h2 small{margin-left:10px;color:#999;font-size:12px;font-weight:400}.member-picker-body{display:grid;height:450px;grid-template-columns:1fr 275px;border-top:1px solid #eee;border-bottom:1px solid #eee}.picker-left{padding:16px 18px;border-right:1px solid #eee}.picker-tabs{display:flex;gap:24px;margin-top:12px;border-bottom:1px solid #eee}.picker-tabs button{height:36px;border:0;border-bottom:2px solid transparent;background:#fff;color:#777}.picker-tabs button.active{border-color:#111;color:#111}.org-list,.picker-right ul{margin:0;padding:8px 0;overflow:auto;list-style:none}.org-list{height:340px}.org-list li{display:flex;height:40px;align-items:center;gap:9px;font-size:13px}.checkbox{display:grid;width:16px;height:16px;place-items:center;border:1px solid #c9c9c9;border-radius:3px}.checkbox.checked{border-color:#111;background:#111;color:#fff}.root-org{font-weight:500}.lower{display:flex;align-items:center;margin-left:auto;color:#888;font-size:12px}.picker-right{padding:18px}.picker-right>strong{font-size:14px}.picker-right ul{height:390px}.picker-right li{display:flex;height:42px;align-items:center;gap:9px;font-size:13px}.picker-right li svg:last-child{margin-left:auto;color:#aaa}.picker-footer{height:68px;margin:0;padding:17px 24px}@media(max-width:640px){.member-picker-body{grid-template-columns:1fr}.picker-right{display:none}}
.dialog-surface--permission{width:min(520px,calc(100vw - 24px))}.dialog-surface--permission .member-area{height:260px}.permission-toolbar-actions{display:flex;align-items:center;gap:18px}.permission-toolbar .inherit-toggle{display:flex;align-items:center;gap:6px;color:#555;font-size:13px;cursor:pointer}.inherit-toggle input{width:16px;height:16px;margin:0;accent-color:#1677ff}.permission-error{margin:8px 0 0;color:#d92d20;font-size:12px;line-height:18px}.permission-form>.dialog-footer{margin-top:18px}.org-list li>button{display:flex;width:100%;height:40px;align-items:center;gap:9px;border:0;background:transparent;padding:0;color:#333;font:13px/20px inherit;text-align:left;cursor:pointer}.org-list li>button:hover{background:#f7f7f9}.org-list li>button:disabled{color:#aaa;cursor:not-allowed}.org-list li>button:disabled:hover{background:transparent}.picker-inherited{margin-left:auto;border-radius:4px;background:#f0f5ff;padding:1px 5px;color:#315efb;font-size:11px;line-height:18px}.picker-right li>span:nth-child(2){min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.picker-right li>button{display:grid;width:24px;height:24px;place-items:center;border:0;border-radius:5px;background:transparent;color:#aaa;cursor:pointer}.picker-right li>button:hover{background:#f2f2f3;color:#333}.impact-dialog{width:min(420px,calc(100vw - 24px));border-radius:12px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.2)}.impact-body{padding:2px 24px 4px}.impact-body>strong{display:block;font-size:15px;line-height:24px}.impact-body p{margin:10px 0 0;color:#666;font-size:13px;line-height:20px}
.permission-source-badge{flex:none;border-radius:4px;background:#eaf7f2;padding:1px 5px;color:#238466;font-size:11px;line-height:18px}
.direct-badge{flex:none;border-radius:4px;background:#f3f0ff;padding:1px 5px;color:#6e43d6;font-size:11px;line-height:18px}
.special-parse-option{display:flex;flex:none;align-items:flex-start;gap:9px;margin-top:12px;border:1px solid #e5e7eb;border-radius:9px;background:#fafafa;padding:10px 12px;cursor:pointer}.special-parse-option>input{width:16px;height:16px;margin:2px 0 0;accent-color:#111}.special-parse-option>span,.special-parse-option strong,.special-parse-option small{display:block}.special-parse-option strong{color:#333;font-size:13px;font-weight:500}.special-parse-option small{margin-top:3px;color:#999;font-size:11px}
</style>
