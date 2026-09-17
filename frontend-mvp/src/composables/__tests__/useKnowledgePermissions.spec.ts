import { describe, expect, it } from 'vitest'
import {
  createKnowledgePermissions,
  type PermissionResourceSeed,
} from '../useKnowledgePermissions'

const seeds: PermissionResourceSeed[] = [
  {
    id: 'kb',
    parentId: null,
    level: 'knowledge-base',
    viewMode: 'break',
    viewSubjects: ['admin', 'analyst'],
    downloadMode: 'allow',
    revision: 3,
    canAdmin: true,
  },
  {
    id: 'folder-inherit',
    parentId: 'kb',
    level: 'folder',
    viewMode: 'inherit',
    viewSubjects: [],
    downloadMode: 'inherit',
    revision: 1,
    canAdmin: true,
  },
  {
    id: 'file-inherit',
    parentId: 'folder-inherit',
    level: 'file',
    viewMode: 'inherit',
    viewSubjects: [],
    downloadMode: 'inherit',
    revision: 1,
    canAdmin: true,
  },
  {
    id: 'folder-break',
    parentId: 'kb',
    level: 'folder',
    viewMode: 'break',
    viewSubjects: ['auditor'],
    downloadMode: 'deny',
    revision: 2,
    canAdmin: true,
  },
  {
    id: 'file-under-break',
    parentId: 'folder-break',
    level: 'file',
    viewMode: 'inherit',
    viewSubjects: [],
    downloadMode: 'inherit',
    revision: 1,
    canAdmin: true,
  },
]

function model() {
  return createKnowledgePermissions({ resources: seeds, currentSubjectId: 'admin' })
}

describe('knowledge permission transaction model', () => {
  it('resolves inherited subjects while a break fully replaces its parent', () => {
    const permissions = model()

    expect(permissions.effectiveFor('file-inherit').subjects).toEqual(['admin', 'analyst'])
    expect(permissions.effectiveFor('file-under-break').subjects).toEqual(['auditor'])

    permissions.syncPersisted({
      ...seeds[0],
      viewSubjects: ['admin', 'buyer'],
      revision: 4,
    })

    expect(permissions.effectiveFor('file-inherit').subjects).toEqual(['admin', 'buyer'])
    expect(permissions.effectiveFor('file-under-break').subjects).toEqual(['auditor'])
  })

  it('resolves download separately and still requires view authority', () => {
    const permissions = model()

    expect(permissions.downloadAccess('file-inherit', 'analyst')).toEqual({ allowed: true })
    expect(permissions.downloadAccess('file-inherit', 'stranger').allowed).toBe(false)
    expect(permissions.downloadAccess('file-under-break', 'auditor')).toEqual({
      allowed: false,
      reason: '你可以查看该文件，但当前没有下载权限',
    })
  })

  it('rolls back unconfirmed editor and member-picker changes', () => {
    const permissions = model()
    permissions.openEditor('folder-break')
    permissions.updateDraft({ viewSubjects: ['auditor', 'buyer'], downloadMode: 'allow' })
    permissions.openMemberPicker()
    permissions.togglePickerSubject('temporary')
    permissions.cancelMemberPicker()

    expect(permissions.draft.value?.viewSubjects).toEqual(['auditor', 'buyer'])
    expect(permissions.pickerDraft.value).toBeNull()

    permissions.cancelEditor()

    expect(permissions.draft.value).toBeNull()
    expect(permissions.persistedFor('folder-break').viewSubjects).toEqual(['auditor'])
    expect(permissions.persistedFor('folder-break').downloadMode).toBe('deny')
  })

  it('only applies member-picker selection to the editor draft after confirmation', () => {
    const permissions = model()
    permissions.openEditor('folder-break')
    permissions.openMemberPicker()
    permissions.togglePickerSubject('buyer')

    expect(permissions.draft.value?.viewSubjects).toEqual(['auditor'])
    expect(permissions.pickerDraft.value?.selected).toEqual(['auditor', 'buyer'])

    permissions.confirmMemberPicker()

    expect(permissions.draft.value?.viewSubjects).toEqual(['auditor', 'buyer'])
  })

  it('rejects a break draft without at least one view subject', () => {
    const permissions = model()
    permissions.openEditor('folder-break')
    permissions.updateDraft({ viewSubjects: [] })

    expect(permissions.requestSave()).toEqual({
      ok: false,
      error: '至少保留一个可查看对象',
    })
  })

  it('counts only descendants whose effective permission would change', () => {
    const permissions = model()
    permissions.openEditor('kb')
    permissions.updateDraft({ viewSubjects: ['admin', 'buyer'], downloadMode: 'deny' })

    const request = permissions.requestSave()

    expect(request).toMatchObject({
      ok: true,
      confirmation: {
        impactCount: 2,
        message: '本次变更将影响2个子资源的权限',
      },
    })

    permissions.cancelSaveConfirmation()
    expect(permissions.persistedFor('kb').viewSubjects).toEqual(['admin', 'analyst'])
    expect(permissions.draft.value?.viewSubjects).toEqual(['admin', 'buyer'])
  })

  it('rejects a stale save and refreshes the draft from the latest revision', () => {
    const permissions = model()
    permissions.openEditor('folder-break')
    permissions.updateDraft({ viewSubjects: ['auditor', 'buyer'] })
    permissions.requestSave()

    permissions.syncPersisted({
      ...seeds[3],
      viewSubjects: ['auditor', 'legal'],
      revision: 3,
    })

    expect(permissions.confirmSave()).toEqual({
      ok: false,
      error: '权限已被他人修改，请刷新后重试',
      action: 'refresh',
    })

    permissions.refreshDraft()
    expect(permissions.draft.value).toMatchObject({
      revision: 3,
      viewSubjects: ['auditor', 'legal'],
    })
  })

  it('rejects save when administrator authority is lost after editing begins', () => {
    const permissions = model()
    permissions.openEditor('folder-break')
    permissions.updateDraft({ downloadMode: 'allow' })
    permissions.requestSave()
    permissions.setAuthority('folder-break', false)

    expect(permissions.canEdit.value).toBe(false)
    expect(permissions.confirmSave()).toEqual({
      ok: false,
      error: '你已无权限编辑此资源权限',
    })
    expect(permissions.persistedFor('folder-break').downloadMode).toBe('deny')
  })
})
