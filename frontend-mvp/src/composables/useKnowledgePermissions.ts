import { computed, ref } from 'vue'

export type PermissionResourceLevel = 'knowledge-base' | 'folder' | 'file'
export type PermissionViewMode = 'inherit' | 'break'
export type PermissionDownloadMode = 'inherit' | 'allow' | 'deny'

export interface PermissionResourceSeed {
  id: string
  parentId: string | null
  level: PermissionResourceLevel
  viewMode: PermissionViewMode
  viewSubjects: string[]
  downloadMode: PermissionDownloadMode
  revision: number
  canAdmin: boolean
}

export interface KnowledgePermissionOptions {
  resources: PermissionResourceSeed[]
  currentSubjectId: string
}

export interface PermissionDraft {
  resourceId: string
  revision: number
  viewMode: PermissionViewMode
  viewSubjects: string[]
  downloadMode: PermissionDownloadMode
}

export interface MemberPickerDraft {
  selected: string[]
}

export interface EffectivePermission {
  subjects: string[]
  download: Exclude<PermissionDownloadMode, 'inherit'>
}

export interface SaveConfirmation {
  impactCount: number
  message: string
  summary: string[]
}

type SaveRequest =
  | { ok: false; error: string }
  | { ok: true; confirmation: SaveConfirmation }

type SaveResult =
  | { ok: true; revision: number }
  | { ok: false; error: string; action?: 'refresh' }

const cloneResource = (resource: PermissionResourceSeed): PermissionResourceSeed => ({
  ...resource,
  viewSubjects: [...resource.viewSubjects],
})

const cloneDraft = (resource: PermissionResourceSeed): PermissionDraft => ({
  resourceId: resource.id,
  revision: resource.revision,
  viewMode: resource.viewMode,
  viewSubjects: [...resource.viewSubjects],
  downloadMode: resource.downloadMode,
})

function sameSubjects(left: string[], right: string[]) {
  return [...new Set(left)].sort().join('\u0000') === [...new Set(right)].sort().join('\u0000')
}

export function createKnowledgePermissions(options: KnowledgePermissionOptions) {
  const initial = Object.fromEntries(options.resources.map((resource) => [resource.id, cloneResource(resource)]))
  const persisted = ref<Record<string, PermissionResourceSeed>>(initial)
  const authority = ref<Record<string, boolean>>(
    Object.fromEntries(options.resources.map((resource) => [resource.id, resource.canAdmin])),
  )
  const draft = ref<PermissionDraft | null>(null)
  const pickerDraft = ref<MemberPickerDraft | null>(null)
  const saveConfirmation = ref<SaveConfirmation | null>(null)

  const canEdit = computed(() => {
    const resourceId = draft.value?.resourceId
    return Boolean(resourceId && authority.value[resourceId])
  })

  function resourceOrThrow(resourceId: string, resources = persisted.value) {
    const resource = resources[resourceId]
    if (!resource) throw new Error(`Unknown permission resource: ${resourceId}`)
    return resource
  }

  function effectiveFrom(
    resourceId: string,
    resources: Record<string, PermissionResourceSeed>,
    visited = new Set<string>(),
  ): EffectivePermission {
    if (visited.has(resourceId)) throw new Error(`Circular permission inheritance: ${resourceId}`)
    visited.add(resourceId)
    const resource = resourceOrThrow(resourceId, resources)

    const parentEffective = resource.parentId
      ? effectiveFrom(resource.parentId, resources, visited)
      : null
    const subjects = resource.viewMode === 'inherit' && parentEffective
      ? parentEffective.subjects
      : resource.viewSubjects
    const download = resource.downloadMode === 'inherit'
      ? parentEffective?.download ?? 'deny'
      : resource.downloadMode

    return { subjects: [...subjects], download }
  }

  function effectiveFor(resourceId: string) {
    return effectiveFrom(resourceId, persisted.value)
  }

  function persistedFor(resourceId: string) {
    const resource = resourceOrThrow(resourceId)
    return cloneResource({ ...resource, canAdmin: Boolean(authority.value[resourceId]) })
  }

  function syncPersisted(resource: PermissionResourceSeed) {
    persisted.value = { ...persisted.value, [resource.id]: cloneResource(resource) }
    authority.value = { ...authority.value, [resource.id]: resource.canAdmin }
  }

  function setAuthority(resourceId: string, canAdmin: boolean) {
    resourceOrThrow(resourceId)
    authority.value = { ...authority.value, [resourceId]: canAdmin }
  }

  function openEditor(resourceId: string) {
    const resource = resourceOrThrow(resourceId)
    draft.value = cloneDraft(resource)
    pickerDraft.value = null
    saveConfirmation.value = null
  }

  function updateDraft(update: {
    viewMode?: PermissionViewMode
    viewSubjects?: string[]
    downloadMode?: PermissionDownloadMode
  }) {
    if (!draft.value || !canEdit.value) return false
    draft.value = {
      ...draft.value,
      ...(update.viewMode ? { viewMode: update.viewMode } : {}),
      ...(update.viewSubjects ? { viewSubjects: [...new Set(update.viewSubjects)] } : {}),
      ...(update.downloadMode ? { downloadMode: update.downloadMode } : {}),
    }
    saveConfirmation.value = null
    return true
  }

  function cancelEditor() {
    draft.value = null
    pickerDraft.value = null
    saveConfirmation.value = null
  }

  function openMemberPicker() {
    if (!draft.value || !canEdit.value) return false
    pickerDraft.value = { selected: [...draft.value.viewSubjects] }
    return true
  }

  function togglePickerSubject(subjectId: string) {
    if (!pickerDraft.value || !canEdit.value) return false
    const selected = new Set(pickerDraft.value.selected)
    if (selected.has(subjectId)) selected.delete(subjectId)
    else selected.add(subjectId)
    pickerDraft.value = { selected: [...selected] }
    return true
  }

  function removePickerSubject(subjectId: string) {
    if (!pickerDraft.value || !canEdit.value) return false
    pickerDraft.value = {
      selected: pickerDraft.value.selected.filter((id) => id !== subjectId),
    }
    return true
  }

  function cancelMemberPicker() {
    pickerDraft.value = null
  }

  function confirmMemberPicker() {
    if (!draft.value || !pickerDraft.value || !canEdit.value) return false
    draft.value = { ...draft.value, viewSubjects: [...pickerDraft.value.selected] }
    pickerDraft.value = null
    saveConfirmation.value = null
    return true
  }

  function resourcesWithDraft(currentDraft: PermissionDraft) {
    const resource = resourceOrThrow(currentDraft.resourceId)
    return {
      ...persisted.value,
      [currentDraft.resourceId]: {
        ...resource,
        viewMode: currentDraft.viewMode,
        viewSubjects: [...currentDraft.viewSubjects],
        downloadMode: currentDraft.downloadMode,
      },
    }
  }

  function isDescendant(resourceId: string, ancestorId: string) {
    let parentId = persisted.value[resourceId]?.parentId ?? null
    const visited = new Set<string>()
    while (parentId) {
      if (parentId === ancestorId) return true
      if (visited.has(parentId)) return false
      visited.add(parentId)
      parentId = persisted.value[parentId]?.parentId ?? null
    }
    return false
  }

  function impactCount(currentDraft: PermissionDraft) {
    const nextResources = resourcesWithDraft(currentDraft)
    return Object.keys(persisted.value).filter((resourceId) => {
      if (!isDescendant(resourceId, currentDraft.resourceId)) return false
      const before = effectiveFrom(resourceId, persisted.value)
      const after = effectiveFrom(resourceId, nextResources)
      return !sameSubjects(before.subjects, after.subjects) || before.download !== after.download
    }).length
  }

  function changeSummary(currentDraft: PermissionDraft) {
    const resource = resourceOrThrow(currentDraft.resourceId)
    const summary: string[] = []
    if (resource.viewMode !== currentDraft.viewMode) {
      summary.push(currentDraft.viewMode === 'break' ? '查看权限改为单独设置' : '查看权限改为继承上级')
    }
    if (!sameSubjects(resource.viewSubjects, currentDraft.viewSubjects)) summary.push('查看对象已变更')
    if (resource.downloadMode !== currentDraft.downloadMode) summary.push('下载权限已变更')
    return summary
  }

  function requestSave(): SaveRequest {
    if (!draft.value) return { ok: false, error: '请先打开权限编辑器' }
    if (!canEdit.value) return { ok: false, error: '你已无权限编辑此资源权限' }
    if (draft.value.viewMode === 'break' && draft.value.viewSubjects.length === 0) {
      return { ok: false, error: '至少保留一个可查看对象' }
    }
    const count = impactCount(draft.value)
    saveConfirmation.value = {
      impactCount: count,
      message: `本次变更将影响${count}个子资源的权限`,
      summary: changeSummary(draft.value),
    }
    return { ok: true, confirmation: saveConfirmation.value }
  }

  function cancelSaveConfirmation() {
    saveConfirmation.value = null
  }

  function confirmSave(): SaveResult {
    if (!draft.value || !saveConfirmation.value) return { ok: false, error: '请先确认变更影响' }
    if (!canEdit.value) return { ok: false, error: '你已无权限编辑此资源权限' }
    const resource = resourceOrThrow(draft.value.resourceId)
    if (resource.revision !== draft.value.revision) {
      return { ok: false, error: '权限已被他人修改，请刷新后重试', action: 'refresh' }
    }
    const revision = resource.revision + 1
    persisted.value = {
      ...persisted.value,
      [resource.id]: {
        ...resource,
        viewMode: draft.value.viewMode,
        viewSubjects: [...draft.value.viewSubjects],
        downloadMode: draft.value.downloadMode,
        revision,
      },
    }
    draft.value = null
    pickerDraft.value = null
    saveConfirmation.value = null
    return { ok: true, revision }
  }

  function refreshDraft() {
    const resourceId = draft.value?.resourceId
    if (!resourceId) return false
    draft.value = cloneDraft(resourceOrThrow(resourceId))
    pickerDraft.value = null
    saveConfirmation.value = null
    return true
  }

  function downloadAccess(resourceId: string, subjectId: string) {
    const effective = effectiveFor(resourceId)
    if (!effective.subjects.includes(subjectId)) {
      return { allowed: false, reason: '你没有查看该文件的权限' } as const
    }
    if (effective.download === 'deny') {
      return { allowed: false, reason: '你可以查看该文件，但当前没有下载权限' } as const
    }
    return { allowed: true } as const
  }

  function hasLockMarker(resourceId: string) {
    return resourceOrThrow(resourceId).viewMode === 'break'
  }

  return {
    currentSubjectId: options.currentSubjectId,
    draft,
    pickerDraft,
    saveConfirmation,
    canEdit,
    persistedFor,
    effectiveFor,
    downloadAccess,
    hasLockMarker,
    syncPersisted,
    setAuthority,
    openEditor,
    updateDraft,
    cancelEditor,
    openMemberPicker,
    togglePickerSubject,
    removePickerSubject,
    cancelMemberPicker,
    confirmMemberPicker,
    requestSave,
    cancelSaveConfirmation,
    confirmSave,
    refreshDraft,
  }
}
