import { computed, ref, type Ref } from 'vue'
import type {
  KnowledgeSpace,
  SourceKnowledgeBase,
  SourceKnowledgeNode,
} from '@/types/knowledge-source'
import type { KnowledgeRole } from '@/types/knowledge-permission'
import { canConfigureKnowledge } from '@/types/knowledge-permission'

/**
 * PRD M4：知识中心「移动文件 + 批量操作」的原型逻辑。
 * 数据直接落在视图持有的 items 树上（原地剪切），并用 localStorage 做浏览器持久化。
 * 权限判定复用项目的「继承上级」模型：canConfigureKnowledge(role) 即写入/管理权。
 */

// ─── 对外类型 ───────────────────────────────────────────────────────────────

export type MoveItemKind = 'kb' | 'folder' | 'file'
/** 移动后可见范围：跟随目标位置（继承上级） / 保留原单独设置 */
export type VisibilityPolicy = 'follow' | 'keep'
/** 目标位置已存在同名项时：自动加（2） / 跳过 */
export type DuplicatePolicy = 'rename' | 'skip'
export type MoveStatus = 'success' | 'skipped' | 'failed'

export interface MoveSelection {
  id: string
  name: string
  kind: MoveItemKind
  space: KnowledgeSpace
  kbName: string
  locationPath: string
  /** 是否取消继承、单独设过可见范围 */
  independentPermission: boolean
}

export interface MoveTargetOption {
  id: string
  name: string
  path: string
  space: KnowledgeSpace
  kind: 'kb' | 'folder'
  depth: number
  /** 本人是否有写入权 */
  writable: boolean
  kbId: string
}

export interface MoveAnalysis {
  count: number
  target: MoveTargetOption | null
  crossSpace: boolean
  independentCount: number
  duplicateNames: string[]
  visibilityChange: string
}

export interface MoveRequest {
  targetId: string
  policy: VisibilityPolicy
  duplicatePolicy: DuplicatePolicy
}

export interface MoveResult {
  id: string
  name: string
  status: MoveStatus
  reason?: string
  finalName?: string
  request: MoveRequest
}

export interface KnowledgeMoveOptions {
  items: Ref<SourceKnowledgeBase[]>
  /** 视图已有的 effectiveResourceRole，用来判定管理/写入权 */
  roleOf: (target: SourceKnowledgeBase | SourceKnowledgeNode) => KnowledgeRole | null
}

// ─── 持久化（浏览器原型；测试环境不读写，避免污染既有用例） ──────────────────

const STORAGE_KEY = 'tianma.prototype.knowledge-move.v1'

function storageScope(): string {
  try {
    const raw = localStorage.getItem('tianma_ai_user')
    const user: unknown = raw ? JSON.parse(raw) : null
    if (user && typeof user === 'object' && 'id' in user && typeof (user as { id: unknown }).id === 'string') {
      return (user as { id: string }).id
    }
  } catch { /* 原型环境下可能没有登录态 */ }
  return 'anonymous'
}

function storageKey(): string {
  return `${STORAGE_KEY}:${encodeURIComponent(storageScope())}`
}

function persistenceEnabled(): boolean {
  // vitest 下 MODE 为 'test'；即便判断失效，测试也不会触发 persist，读取时 localStorage 为空。
  return import.meta.env.MODE !== 'test'
}

/** 视图初始化时调用：读到合法快照才覆盖 mock 数据。 */
export function loadKnowledgeItems(): SourceKnowledgeBase[] | null {
  if (!persistenceEnabled()) return null
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    const valid = parsed.every((entry) => {
      if (!entry || typeof entry !== 'object') return false
      const item = entry as SourceKnowledgeBase
      return typeof item.id === 'string'
        && typeof item.name === 'string'
        && (item.space === 'public' || item.space === 'personal')
        && (item.nodes === undefined || Array.isArray(item.nodes))
    })
    return valid ? (parsed as SourceKnowledgeBase[]) : null
  } catch {
    return null
  }
}

// ─── 内部定位结构 ───────────────────────────────────────────────────────────

interface FoundNode {
  node: SourceKnowledgeNode
  siblings: SourceKnowledgeNode[]
  index: number
  parentChain: SourceKnowledgeNode[]
}

interface LocatedItem {
  id: string
  name: string
  kind: MoveItemKind
  kb: SourceKnowledgeBase
  space: KnowledgeSpace
  /** node 选中项时非空 */
  node: SourceKnowledgeNode | null
  /** kb 选中项时非空 */
  base: SourceKnowledgeBase | null
  /** node 所在的兄弟数组；kb 选中项为 null（用 items 本身） */
  siblings: SourceKnowledgeNode[] | null
  index: number
  locationPath: string
  independentPermission: boolean
}

function findNode(
  nodes: SourceKnowledgeNode[],
  id: string,
  parentChain: SourceKnowledgeNode[],
): FoundNode | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (node.id === id) return { node, siblings: nodes, index, parentChain }
    if (node.children?.length) {
      const found = findNode(node.children, id, [...parentChain, node])
      if (found) return found
    }
  }
  return null
}

function spaceLabel(space: KnowledgeSpace): string {
  return space === 'personal' ? '个人空间' : '公共空间'
}

/** 生成「名称（2）.扩展名」形式的不冲突名称 */
function uniqueName(name: string, existing: Set<string>): string {
  const dot = name.lastIndexOf('.')
  const hasExtension = dot > 0
  const stem = hasExtension ? name.slice(0, dot) : name
  const extension = hasExtension ? name.slice(dot) : ''
  let suffix = 2
  let candidate = `${stem}（${suffix}）${extension}`
  while (existing.has(candidate)) {
    suffix += 1
    candidate = `${stem}（${suffix}）${extension}`
  }
  return candidate
}

export function useKnowledgeMove(options: KnowledgeMoveOptions) {
  const { items, roleOf } = options

  // ─── 选择状态（跨位置保留本批选择，只有显式清空才重置） ────────────────────
  const selectedIds = ref<Set<string>>(new Set<string>())

  function toggleSelect(id: string) {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }

  function setSelection(ids: string[], checked: boolean) {
    const next = new Set(selectedIds.value)
    for (const id of ids) {
      if (checked) next.add(id)
      else next.delete(id)
    }
    selectedIds.value = next
  }

  function replaceSelection(ids: string[]) {
    selectedIds.value = new Set(ids)
  }

  function clearSelection() {
    selectedIds.value = new Set<string>()
  }

  // ─── 定位 ────────────────────────────────────────────────────────────────
  function locate(id: string): LocatedItem | null {
    const baseIndex = items.value.findIndex((item) => item.id === id)
    if (baseIndex >= 0) {
      const base = items.value[baseIndex]
      return {
        id,
        name: base.name,
        kind: 'kb',
        kb: base,
        space: base.space,
        node: null,
        base,
        siblings: null,
        index: baseIndex,
        locationPath: base.name,
        independentPermission: base.permission?.inheritParent === false,
      }
    }
    for (const kb of items.value) {
      const found = findNode(kb.nodes ?? [], id, [])
      if (!found) continue
      return {
        id,
        name: found.node.name,
        kind: found.node.kind === 'folder' ? 'folder' : 'file',
        kb,
        space: kb.space,
        node: found.node,
        base: null,
        siblings: found.siblings,
        index: found.index,
        locationPath: [kb.name, ...found.parentChain.map((node) => node.name)].join(' / '),
        independentPermission: found.node.permission?.inheritParent === false,
      }
    }
    return null
  }

  function isWritable(target: SourceKnowledgeBase | SourceKnowledgeNode): boolean {
    const role = roleOf(target)
    return Boolean(role && canConfigureKnowledge(role))
  }

  /** 目标容器（知识库根 或 任意层级文件夹）的子节点数组 */
  function targetChildren(targetId: string): SourceKnowledgeNode[] | null {
    const base = items.value.find((item) => item.id === targetId)
    if (base) return base.nodes ?? (base.nodes = [])
    for (const kb of items.value) {
      const folder = findFolder(kb.nodes ?? [], targetId)
      if (folder) return folder.children ?? (folder.children = [])
    }
    return null
  }

  function findFolder(nodes: SourceKnowledgeNode[], id: string): SourceKnowledgeNode | null {
    for (const node of nodes) {
      if (node.kind === 'folder' && node.id === id) return node
      const nested = node.children ? findFolder(node.children, id) : null
      if (nested) return nested
    }
    return null
  }

  function removeLocated(loc: LocatedItem) {
    if (loc.siblings) loc.siblings.splice(loc.index, 1)
    else items.value.splice(loc.index, 1)
  }

  // ─── 目标位置树：全部知识库 + 全层级文件夹，标注写入权 ────────────────────
  const moveTargets = computed<MoveTargetOption[]>(() => {
    const list: MoveTargetOption[] = []
    const walk = (nodes: SourceKnowledgeNode[], kb: SourceKnowledgeBase, depth: number, parentPath: string) => {
      for (const node of nodes) {
        if (node.kind !== 'folder') continue
        const path = `${parentPath} / ${node.name}`
        list.push({
          id: node.id,
          name: node.name,
          path,
          space: kb.space,
          kind: 'folder',
          depth,
          writable: isWritable(node),
          kbId: kb.id,
        })
        walk(node.children ?? [], kb, depth + 1, path)
      }
    }
    for (const kb of items.value) {
      list.push({
        id: kb.id,
        name: kb.name,
        path: kb.name,
        space: kb.space,
        kind: 'kb',
        depth: 0,
        writable: isWritable(kb),
        kbId: kb.id,
      })
      walk(kb.nodes ?? [], kb, 1, kb.name)
    }
    return list
  })

  /** 选中文件夹（含知识库）自身及其所有后代，禁止作为移动目标，避免循环 */
  const forbiddenIds = computed<Set<string>>(() => {
    const forbidden = new Set<string>()
    const collect = (node: SourceKnowledgeNode) => {
      forbidden.add(node.id)
      node.children?.forEach(collect)
    }
    for (const id of selectedIds.value) {
      const loc = locate(id)
      if (!loc) continue
      if (loc.base) {
        forbidden.add(loc.base.id)
      } else if (loc.node?.kind === 'folder') {
        collect(loc.node)
      }
    }
    return forbidden
  })

  const selectedTargets = computed<MoveSelection[]>(() => {
    const list: MoveSelection[] = []
    for (const id of selectedIds.value) {
      const loc = locate(id)
      if (!loc) continue
      list.push({
        id,
        name: loc.name,
        kind: loc.kind,
        space: loc.space,
        kbName: loc.kb.name,
        locationPath: loc.locationPath,
        independentPermission: loc.independentPermission,
      })
    }
    return list
  })

  // ─── 提交前分析（驱动确认弹窗文案与二次确认） ─────────────────────────────
  function analyzeMove(targetId: string): MoveAnalysis {
    const target = moveTargets.value.find((item) => item.id === targetId) ?? null
    const selections = selectedTargets.value
    const crossSpace = Boolean(target && selections.some((item) => item.space !== target.space))
    const independentCount = selections.filter((item) => item.independentPermission).length
    const children = targetChildren(targetId)
    const occupied = new Set(children?.map((node) => node.name) ?? [])
    const duplicateNames = selections
      .filter((item) => {
        if (item.kind === 'kb' || !occupied.has(item.name)) return false
        // 源就是目标位置时属于「无需移动」，不算重名冲突
        const loc = locate(item.id)
        return loc?.siblings !== children
      })
      .map((item) => item.name)

    let visibilityChange = '尚未选择目标位置'
    if (target) {
      const from = [...new Set(selections.map((item) => spaceLabel(item.space)))].join('、')
      const to = spaceLabel(target.space)
      visibilityChange = crossSpace
        ? `可见范围将从「${from}」调整为「${to}」`
        : `可见范围保持在「${to}」，默认跟随目标位置`
    }
    return { count: selections.length, target, crossSpace, independentCount, duplicateNames, visibilityChange }
  }

  // ─── 执行移动（剪切；逐项成功/跳过/失败，不整批回滚） ─────────────────────
  function applyVisibility(node: SourceKnowledgeNode, policy: VisibilityPolicy) {
    if (policy === 'keep') return
    const previous = node.permission
    if (!previous) return // 无独立快照即天然继承上级
    node.permission = { ...previous, inheritParent: true, revision: previous.revision + 1 }
  }

  function moveOne(
    id: string,
    request: MoveRequest,
    target: MoveTargetOption | undefined,
    children: SourceKnowledgeNode[] | null,
  ): MoveResult {
    const loc = locate(id)
    const resultBase = { id, name: loc?.name ?? id, request }

    if (!loc) {
      return { ...resultBase, status: 'failed', reason: '该项已不在原位置，可能已被他人移动或删除（并发冲突），请刷新后重试' }
    }
    if (loc.base) {
      return { ...resultBase, status: 'skipped', reason: '知识库为顶层容器，不支持移动' }
    }
    const node = loc.node
    const siblings = loc.siblings
    if (!node || !siblings) {
      return { ...resultBase, status: 'failed', reason: '未能定位该项，请刷新后重试（并发冲突）' }
    }
    if (node.kind === 'folder' && forbiddenIds.value.has(request.targetId)) {
      return { ...resultBase, status: 'failed', reason: '不能移入自身或其子文件夹' }
    }
    if (!isWritable(node)) {
      return { ...resultBase, status: 'failed', reason: '你在源位置没有管理权限，该项留在原地' }
    }
    if (!target || !target.writable || !children) {
      return { ...resultBase, status: 'failed', reason: '目标位置不可写，或你的写入权限已变更' }
    }
    if (siblings === children) {
      return { ...resultBase, status: 'skipped', reason: '已在目标位置，无需移动' }
    }

    const occupied = new Set(children.map((child) => child.name))
    let finalName = node.name
    if (occupied.has(finalName)) {
      if (request.duplicatePolicy === 'skip') {
        return { ...resultBase, status: 'skipped', reason: '目标位置已存在同名项，已跳过（不覆盖）' }
      }
      finalName = uniqueName(finalName, occupied)
      occupied.add(finalName)
    }

    // 剪切：先从原位置移除，再放入目标容器
    siblings.splice(loc.index, 1)
    node.name = finalName
    applyVisibility(node, request.policy)
    children.push(node)

    return {
      ...resultBase,
      status: 'success',
      ...(finalName !== resultBase.name ? { finalName } : {}),
    }
  }

  function executeMove(request: MoveRequest, onlyIds?: string[]): MoveResult[] {
    const ids = onlyIds ?? [...selectedIds.value]
    const target = moveTargets.value.find((item) => item.id === request.targetId)
    const children = targetChildren(request.targetId)
    const results = ids.map((id) => moveOne(id, request, target, children))
    persist()
    return results
  }

  // ─── 批量删除 ────────────────────────────────────────────────────────────
  function executeDelete(onlyIds?: string[]): MoveResult[] {
    const ids = onlyIds ?? [...selectedIds.value]
    const request: MoveRequest = { targetId: '', policy: 'keep', duplicatePolicy: 'skip' }
    const results: MoveResult[] = []
    for (const id of ids) {
      const loc = locate(id)
      const name = loc?.name ?? id
      if (!loc) {
        results.push({ id, name, status: 'failed', reason: '该项已不在原位置（并发冲突），请刷新后重试', request })
        continue
      }
      const resource = loc.node ?? loc.base
      if (!resource || !isWritable(resource)) {
        results.push({ id, name, status: 'failed', reason: '你对该资源没有管理权限，无法删除', request })
        continue
      }
      removeLocated(loc)
      results.push({ id, name, status: 'success', request })
    }
    persist()
    return results
  }

  function persist() {
    if (!persistenceEnabled()) return
    try {
      localStorage.setItem(storageKey(), JSON.stringify(items.value))
    } catch { /* localStorage 不可用时退化为纯内存原型 */ }
  }

  return {
    selectedIds,
    toggleSelect,
    setSelection,
    replaceSelection,
    clearSelection,
    moveTargets,
    forbiddenIds,
    selectedTargets,
    analyzeMove,
    executeMove,
    executeDelete,
    persist,
  }
}
