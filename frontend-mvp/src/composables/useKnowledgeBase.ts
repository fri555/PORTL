/**
 * useKnowledgeBase.ts — 知识中心核心状态与业务逻辑 composable
 *
 * 用途：替代 KnowledgeBaseView.vue 中的内联逻辑，作为唯一状态源
 * 设计：返回所有响应式状态、计算属性和操作方法
 */
import { computed, reactive, ref } from 'vue'
import type {
  KnowledgeBaseItem, DocItem, TreeNode,
  QaMessage, UploadTaskItem, TreeRow,
} from '@/types/knowledge'
import { useAppStore } from '@/stores/app'
import { knowledgeBases as rawKBs, allDocs as rawDocs, fileTrees } from '@/mock/knowledge-view'
import { mockUser as defaultUser } from '@/mock/user'

export function useKnowledgeBase() {
  const store = useAppStore()

  // 当前用户从 Pinia store 读取
  const currentUser = computed(() => store.user ?? defaultUser)
  const isAdmin = computed(() => store.user?.role === 'admin')

  // ═══════════════ 响应式状态 ═══════════════
  const sidebarVisible = ref(true)
  const activeSpace = ref<'public' | 'personal'>('public')
  const selectedKbId = ref<string | null>(null)
  const activeSpaceRoot = ref(true)
  const activeTreeId = ref('')
  const expandedTreeIds = ref<string[]>(['folder-shared', 'folder-solution-center'])
  const favoriteMenuKbId = ref('')
  const selectedFileIds = ref<string[]>([])

  // 创建
  const createMode = ref(false)
  const createKbName = ref('')
  const createFolderMode = ref(false)
  const createFolderName = ref('')
  const createFolderParentId = ref('')

  // 视图
  const fileView = ref<'list' | 'grid'>('grid')
  const kbView = ref<'list' | 'grid'>('list')
  const fileSearch = ref('')
  const kbSearch = ref('')
  const fileActionFeedback = ref('')
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined

  // 上传
  const uploadModalOpen = ref(false)
  const uploadFileNames = ref<string[]>([])
  const uploadTags = ref<string[]>([])
  const uploadTasks = ref<UploadTaskItem[]>([])

  // 预览与问答
  const previewDoc = ref<DocItem | null>(null)
  const previewTabs = ref<DocItem[]>([])
  const activeRightTab = ref('')
  const renamingDocName = ref('')
  const draftDocTitle = ref('')
  const renamingFolderId = ref('')
  const draftFolderTitle = ref('')
  const qaOpen = ref(false)
  const qaQuestion = ref('')
  const qaEditId = ref<number | null>(null)
  const qaEditDraft = ref('')
  const qaCopiedId = ref<number | null>(null)
  const qaMessages = ref<QaMessage[]>([])
  const qaMode = ref<'answer' | 'search'>('answer')
  const highlightedSection = ref<string | null>(null)
  let highlightTimer: ReturnType<typeof setTimeout> | null = null

  // 上下文菜单
  const contextMenu = ref<{ type: 'kb' | 'doc' | 'tree'; id: string; x: number; y: number } | null>(null)

  // 确认弹窗
  const confirmModal = ref<{
    show: boolean; title: string; message: string
    confirmText?: string; danger?: boolean; onConfirm: () => void
  }>({ show: false, title: '', message: '', onConfirm: () => {} })

  // ═══════════════ Mock 数据 ═══════════════
  const knowledgeBases = reactive(rawKBs.slice())
  const allDocs = reactive(structuredClone(rawDocs))
  const fileTree = reactive<Record<'public' | 'personal', TreeNode[]>>(
    JSON.parse(JSON.stringify(fileTrees)),
  )

  // ═══════════════ 计算属性 ═══════════════
  const currentSpaceItems = computed(() =>
    knowledgeBases.filter(kb => kb.space === activeSpace.value),
  )
  const selectedKb = computed(() =>
    currentSpaceItems.value.find(kb => kb.id === selectedKbId.value),
  )
  const displayedKnowledgeBases = computed(() => {
    const q = kbSearch.value.trim().toLowerCase()
    const all = currentSpaceItems.value
    return q
      ? all.filter(kb => `${kb.name}${kb.owner}${kb.department}`.toLowerCase().includes(q))
      : all
  })
  const docs = computed(() =>
    selectedKbId.value ? (allDocs[selectedKbId.value] ?? []) : [],
  )
  const filteredDocs = computed(() => {
    const q = fileSearch.value.trim().toLowerCase()
    if (!q) return docs.value
    return docs.value.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.tags?.some(t => t.toLowerCase().includes(q)),
    )
  })
  const pinnedKnowledgeBases = computed(() =>
    displayedKnowledgeBases.value.filter(kb => kb.pinned),
  )
  const activeNode = computed(() =>
    findTreeNode(currentFileTree.value, activeTreeId.value),
  )
  const currentFileTree = computed(() => fileTree[activeSpace.value])
  const hasKnowledgeItems = computed(() => filteredDocs.value.length > 0)
  const mainTitle = computed(() =>
    selectedKb.value?.name ?? activeNode.value?.label ?? '知识中心',
  )
  const rightPanelOpen = computed(() => qaOpen.value || previewTabs.value.length > 0)
  const activePreviewDoc = computed(() =>
    previewTabs.value.find(d => d.name === activeRightTab.value) ?? previewDoc.value,
  )

  // ═══════════════ 公共方法 ═══════════════

  function showToast(msg: string) {
    fileActionFeedback.value = msg
    if (feedbackTimer) clearTimeout(feedbackTimer)
    feedbackTimer = setTimeout(() => { fileActionFeedback.value = '' }, 3000)
  }

  function showConfirm(title: string, message: string, onConfirm: () => void, danger = true) {
    confirmModal.value = { show: true, title, message, confirmText: '确认', danger, onConfirm }
  }

  // ═══ 空间与导航 ═══
  function switchSpace(space: 'public' | 'personal') {
    activeSpace.value = space
    activeSpaceRoot.value = true
    selectedKbId.value = null
    selectedFileIds.value = []
    previewDoc.value = null
    previewTabs.value = []
    qaOpen.value = false
    qaMessages.value = []
    activeTreeId.value = ''
    expandedTreeIds.value = space === 'public'
      ? ['folder-shared', 'folder-solution-center', 'product']
      : ['personal-drafts']
  }

  function selectKb(id: string) {
    selectedKbId.value = id
    activeSpaceRoot.value = false
    selectedFileIds.value = []
    previewDoc.value = null
  }

  function deselectKb() {
    selectedKbId.value = null
    activeSpaceRoot.value = true
    activeTreeId.value = ''
    fileSearch.value = ''
  }

  // ═══ 文件树导航 ═══
  function openTreeRow(row: TreeRow) {
    activeTreeId.value = row.node.id
    if (row.node.type === 'file') {
      if (row.kbId) selectedKbId.value = row.kbId
      const doc = row.kbId ? (allDocs[row.kbId] ?? []).find(d => d.name === row.node.docName) : undefined
      if (doc) openPreview(doc)
      return
    }
    selectedKbId.value = row.kbId ?? null
  }

  function toggleTreeNode(node: TreeNode) {
    activeTreeId.value = node.id
    const kbId = getNodeKbId(node)
    if (node.type === 'file' && kbId) {
      selectedKbId.value = kbId
      const doc = (allDocs[kbId] ?? []).find(d => d.name === node.docName)
      if (doc) openPreview(doc)
      return
    }
    if (kbId) selectedKbId.value = kbId
    if (node.children?.length) {
      expandedTreeIds.value = expandedTreeIds.value.includes(node.id)
        ? expandedTreeIds.value.filter(id => id !== node.id)
        : [...expandedTreeIds.value, node.id]
    }
  }

  function findTreeNode(nodes: TreeNode[], id: string): TreeNode | undefined {
    for (const node of nodes) {
      if (node.id === id) return node
      const found = node.children ? findTreeNode(node.children, id) : undefined
      if (found) return found
    }
    return undefined
  }

  function getNodeKbId(node?: TreeNode, nodes?: TreeNode[]): string | undefined {
    if (!node) return undefined
    if (node.kbId) return node.kbId
    const searchNodes = nodes ?? currentFileTree.value
    for (const n of searchNodes) {
      const found = findTreeNodeKbId(n, node.id)
      if (found) return found
    }
    return undefined
  }

  function findTreeNodeKbId(node: TreeNode, targetId: string): string | undefined {
    if (node.id === targetId) return node.kbId
    return node.children?.reduce<string | undefined>(
      (found, child) => found ?? findTreeNodeKbId(child, targetId), undefined,
    )
  }

  // ═══ 知识库 CRUD ═══
  function createKnowledgeBase() {
    const name = (createKbName.value || '未命名知识库').trim()
    // 简单校验
    if (name.length > 64) { showToast('名称不能超过 64 个字符'); return }
    if (/[\\/:*?"<>|]/.test(name)) { showToast('名称不能包含特殊字符 \\/:*?"<>|'); return }
    if (knowledgeBases.some(kb => kb.name === name && kb.space === 'public')) {
      showToast('知识库名称已存在'); return
    }
    const newKb: KnowledgeBaseItem = {
      id: `kb-${activeSpace.value}-${Date.now()}`,
      name,
      docs: 0,
      owner: currentUser.value.displayName,
      department: activeSpace.value === 'public' ? '按角色授权' : '个人',
      visibility: activeSpace.value === 'public' ? '按角色授权' : '仅自己可见',
      space: activeSpace.value,
      canEdit: true,
      pinned: false,
      recent: '刚刚',
    }
    knowledgeBases.push(newKb)
    allDocs[newKb.id] = []
    const newNode: TreeNode = {
      id: `folder-${newKb.id}`, label: newKb.name,
      type: 'folder', kbId: newKb.id, isKnowledgeBase: true, children: [],
    }
    fileTree[activeSpace.value].push(newNode)
    createKbName.value = ''
    createMode.value = false
    selectedKbId.value = newKb.id
    activeTreeId.value = newNode.id
    activeSpaceRoot.value = false
    showToast(`已创建知识库「${name}」`)
  }

  function toggleKbPinned(kb: KnowledgeBaseItem) {
    kb.pinned = !kb.pinned
  }

  function deleteKb(kb: KnowledgeBaseItem) {
    if (!kb.canEdit) return
    showConfirm('确认删除', `确认删除知识库「${kb.name}」？其下文件夹和文件将一并删除。`, () => {
      const idx = knowledgeBases.findIndex(item => item.id === kb.id)
      if (idx >= 0) knowledgeBases.splice(idx, 1)
      removeTreeNodesByPredicate(fileTree[activeSpace.value], n => n.kbId === kb.id && n.type === 'folder')
      delete allDocs[kb.id]
      if (selectedKbId.value === kb.id) selectedKbId.value = null
      showToast(`已删除知识库：${kb.name}`)
    })
  }

  // ═══ 文件夹 CRUD ═══
  function openCreateFolderModal() {
    createFolderName.value = ''
    const parentNode = activeNode.value
    createFolderParentId.value = parentNode?.id ?? ''
    createFolderMode.value = true
  }

  function createFolder() {
    const name = createFolderName.value.trim() || '新建文件夹'
    const parent = createFolderParentId.value
      ? findTreeNode(currentFileTree.value, createFolderParentId.value)
      : undefined
    const node: TreeNode = {
      id: `folder-${Date.now()}`,
      label: name,
      type: 'folder',
      kbId: parent?.kbId,
      children: [],
    }
    if (parent) {
      parent.children = parent.children ?? []
      parent.children.push(node)
      expandedTreeIds.value = [...new Set([...expandedTreeIds.value, parent.id])]
      if (parent.kbId) selectedKbId.value = parent.kbId
    } else {
      fileTree[activeSpace.value].push(node)
    }
    showToast(`已新建文件夹：${name}`)
    createFolderMode.value = false
  }

  function deleteTreeFolder(node: TreeNode) {
    if (node.kbId && node.isKnowledgeBase) {
      const kb = knowledgeBases.find(k => k.id === node.kbId)
      if (kb) deleteKb(kb)
      return
    }
    showConfirm('确认删除', `确认删除文件夹「${node.label}」？`, () => {
      removeTreeNodesByPredicate(fileTree[activeSpace.value], n => n.id === node.id)
      if (activeTreeId.value === node.id) activeTreeId.value = ''
      showToast(`已删除文件夹：${node.label}`)
    })
  }

  function removeTreeNodesByPredicate(nodes: TreeNode[], pred: (n: TreeNode) => boolean): boolean {
    const idx = nodes.findIndex(pred)
    if (idx >= 0) { nodes.splice(idx, 1); return true }
    return nodes.some(n => n.children && removeTreeNodesByPredicate(n.children, pred))
  }

  function beginRenameFolder(node: TreeNode) {
    renamingFolderId.value = node.id
    draftFolderTitle.value = node.label
  }

  function commitRenameFolder(node: TreeNode) {
    const t = draftFolderTitle.value.trim()
    if (t) node.label = t
    renamingFolderId.value = ''
    draftFolderTitle.value = ''
  }

  // ═══ 文件操作 ═══
  function toggleFileSelect(name: string) {
    const i = selectedFileIds.value.indexOf(name)
    i >= 0 ? selectedFileIds.value.splice(i, 1) : selectedFileIds.value.push(name)
  }

  function selectAllFiles() {
    const names = filteredDocs.value.map(d => d.name)
    selectedFileIds.value = selectedFileIds.value.length === names.length ? [] : names
  }

  function deleteDoc(doc: DocItem) {
    if (!selectedKbId.value) return
    showConfirm('确认删除', `确认删除文件「${doc.name}」？`, () => {
      const list = allDocs[selectedKbId.value!] ?? []
      const idx = list.findIndex(d => d.name === doc.name)
      if (idx >= 0) list.splice(idx, 1)
      if (previewDoc.value?.name === doc.name) previewDoc.value = null
      previewTabs.value = previewTabs.value.filter(t => t.name !== doc.name)
      showToast(`已删除：${doc.name}`)
    })
  }

  function deleteSelectedDocs() {
    if (!selectedKbId.value || selectedFileIds.value.length === 0) return
    showConfirm('确认批量删除', `确认删除选中的 ${selectedFileIds.value.length} 个文件？`, () => {
      const set = new Set(selectedFileIds.value)
      const list = allDocs[selectedKbId.value!] ?? []
      const newList = list.filter(d => !set.has(d.name))
      allDocs[selectedKbId.value!] = newList
      if (previewDoc.value && set.has(previewDoc.value.name)) previewDoc.value = null
      previewTabs.value = previewTabs.value.filter(t => !set.has(t.name))
      showToast(`已删除 ${selectedFileIds.value.length} 个文件`)
      selectedFileIds.value = []
    })
  }

  // ═══ 上传 ═══
  function openUploadModal() {
    if (!selectedKb.value) { showToast('请先进入具体知识库后再上传文件'); return }
    uploadModalOpen.value = true
    uploadFileNames.value = []
    uploadTags.value = []
  }

  function handleUploadFiles(event: Event) {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    const allowed = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg']
    const valid = files.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ext && allowed.includes(ext)
    })
    // 限制 10 个（PRD 第 281 行）
    const limited = valid.slice(0, 10)
    if (valid.length > 10) showToast('单次最多选择 10 个文件')
    uploadFileNames.value = limited.map(f => f.name)
  }

  function confirmUpload() {
    const names = uploadFileNames.value.length
      ? uploadFileNames.value
      : ['方案补充资料.pdf', '客户需求表.xlsx']
    const tags = [...uploadTags.value]
    const tasks = names.map((name, idx) => {
      const format = (name.split('.').pop() ?? 'PDF').toUpperCase()
      const doc: DocItem = {
        name, format, status: '上传中', updatedAt: '刚刚',
        uploadedBy: currentUser.value.displayName,
        tags: tags.length ? tags : undefined,
      }
      const task: UploadTaskItem = {
        id: `upload-${Date.now()}-${idx}`, name,
        status: 'uploading', progress: 0, doc,
      }
      if (selectedKbId.value) {
        const kbDocs = allDocs[selectedKbId.value]
        if (kbDocs) kbDocs.unshift(doc)
      }
      // 模拟状态流转：uploading → processing → done
      setTimeout(() => { task.progress = 60; task.status = 'success'; doc.status = '已索引' }, 1200)
      setTimeout(() => { task.progress = 100; task.status = 'success'; doc.status = '已索引' }, 2400)
      return task
    })
    uploadTasks.value = [...tasks, ...uploadTasks.value].slice(0, 4)
    uploadModalOpen.value = false
    uploadFileNames.value = []
    uploadTags.value = []
  }

  function dismissUploadTask(id: string) {
    uploadTasks.value = uploadTasks.value.filter(t => t.id !== id)
  }

  // ═══ 预览 ═══
  // ─── 思考链路 ───
  const qaThinkingOpen = ref(false)
  const qaThinking = ref<{ id: string; label: string; detail?: string; status: 'pending' | 'running' | 'completed' | 'failed'; icon?: string }[]>([])

  function simulateThinking() {
    const steps = [
      { id: 't1', label: '解析问题意图', detail: '理解用户查询的意图和关键词', status: 'running' as const, icon: '✨' },
      { id: 't2', label: '检索知识库文档', detail: '搜索知识库中的相关文档片段', status: 'pending' as const, icon: '📄' },
      { id: 't3', label: '排序与过滤结果', detail: '按相关度排序并过滤低质量结果', status: 'pending' as const, icon: '🔍' },
      { id: 't4', label: '生成回答', detail: '基于检索结果生成完整的答案', status: 'pending' as const, icon: '🤖' },
    ]
    qaThinking.value = steps.map(s => ({ ...s }))
    qaThinkingOpen.value = true
    setTimeout(() => { qaThinking.value = qaThinking.value.map(s => s.id === 't1' ? { ...s, status: 'completed' as const } : s) }, 500)
    setTimeout(() => { qaThinking.value = qaThinking.value.map(s => s.id === 't2' ? { ...s, status: 'completed' as const } : s) }, 1000)
    setTimeout(() => { qaThinking.value = qaThinking.value.map(s => s.id === 't3' ? { ...s, status: 'completed' as const } : s) }, 1500)
    setTimeout(() => {
      qaThinking.value = qaThinking.value.map(s => s.id === 't4' ? { ...s, status: 'completed' as const } : s)
    }, 2000)
  }

  function toggleThinking() { qaThinkingOpen.value = !qaThinkingOpen.value }

  // ─── 预览 ───
  function openPreview(doc: DocItem) {
    previewDoc.value = doc
    previewTabs.value = [doc, ...previewTabs.value.filter(t => t.name !== doc.name)].slice(0, 5)
    activeRightTab.value = doc.name
  }

  function openQaPanel() { qaOpen.value = true }
  function closeRightTab(name: string) {
    previewTabs.value = previewTabs.value.filter(d => d.name !== name)
    if (previewDoc.value?.name === name) previewDoc.value = previewTabs.value[0] ?? null
    if (activeRightTab.value === name) activeRightTab.value = previewTabs.value[0]?.name ?? ''
  }
  function closePreviewPanel() { previewTabs.value = []; activeRightTab.value = ''; previewDoc.value = null; highlightedSection.value = null }
  function closeQaPanel() { qaOpen.value = false }

  // ═══ 重命名 ═══
  function beginRenameDoc(doc: DocItem) { renamingDocName.value = doc.name; draftDocTitle.value = doc.name }
  function commitRenameDoc(doc: DocItem) {
    const t = draftDocTitle.value.trim()
    if (t && selectedKbId.value) {
      const old = doc.name
      doc.name = t
      const list = allDocs[selectedKbId.value]
      if (list) { const idx = list.findIndex(d => d.name === old); if (idx >= 0) list[idx] = doc }
      const updateTreeLabel = (nodes: TreeNode[]) => {
        for (const n of nodes) {
          if (n.docName === old) n.docName = t
          if (n.label === old) n.label = t
          if (n.children) updateTreeLabel(n.children)
        }
      }
      updateTreeLabel(fileTree[activeSpace.value])
      if (previewDoc.value?.name === old) previewDoc.value = doc
      previewTabs.value = previewTabs.value.map(tab => tab.name === old ? doc : tab)
      if (activeRightTab.value === old) activeRightTab.value = t
    }
    renamingDocName.value = ''; draftDocTitle.value = ''
  }

  // ═══ 问答 ═══
  function parseQaContent(raw: string): { type: 'text' | 'ref'; text?: string; index?: number }[] {
    const parts: { type: 'text' | 'ref'; text?: string; index?: number }[] = []
    const re = /\[\[ref:(\d+)\]\]/g
    let last = 0, match: RegExpExecArray | null
    while ((match = re.exec(raw)) !== null) {
      if (match.index > last) parts.push({ type: 'text', text: raw.slice(last, match.index) })
      parts.push({ type: 'ref', index: parseInt(match[1], 10) })
      last = re.lastIndex
    }
    if (last < raw.length) parts.push({ type: 'text', text: raw.slice(last) })
    return parts
  }

  function askKnowledgeBase() {
    const text = qaQuestion.value.trim()
    if (!text) return
    qaMessages.value.push({ id: Date.now(), role: 'user', content: text })
    simulateThinking()
    const sourceDocs = filteredDocs.value.length ? filteredDocs.value : docs.value
    const citations = sourceDocs.slice(0, 3).map(s => s.name)
    qaMessages.value.push({
      id: Date.now() + 1, role: 'assistant',
      content: `已在「${selectedKb.value?.name ?? '当前知识库'}」中完成检索。根据[[ref:1]]，可查看相关方案的详细信息。如需进一步按行业场景适配，可参考[[ref:2]]和[[ref:3]]中的执行口径。`,
      citations: citations.length ? citations : undefined,
    })
    qaQuestion.value = ''
  }

  function openCitationRef(index: number, citations?: string[]) {
    const docName = citations?.[index - 1]
    if (!docName) return
    highlightedSection.value = null
    if (highlightTimer) clearTimeout(highlightTimer)
    highlightedSection.value = '方案摘要'
    for (const kbId of Object.keys(allDocs)) {
      const doc = allDocs[kbId].find(d => d.name === docName)
      if (doc) { openPreview(doc); return }
    }
  }

  function copyQaMessage(msg: QaMessage) {
    qaCopiedId.value = msg.id
    navigator.clipboard?.writeText(msg.content)
    setTimeout(() => { qaCopiedId.value = null }, 2000)
  }

  function beginEditQaMessage(msg: QaMessage) { qaEditId.value = msg.id; qaEditDraft.value = msg.content }
  function commitEditQaMessage(msg: QaMessage) {
    const text = qaEditDraft.value.trim()
    if (text) {
      msg.content = text
      qaMessages.value = qaMessages.value.slice(0, qaMessages.value.findIndex(m => m.id === msg.id) + 1)
      qaQuestion.value = text
      askKnowledgeBase()
    }
    qaEditId.value = null; qaEditDraft.value = ''
  }
  function retryQaMessage(msg: QaMessage) {
    qaMessages.value = qaMessages.value.slice(0, qaMessages.value.findIndex(m => m.id === msg.id))
    qaQuestion.value = msg.content
    askKnowledgeBase()
  }

  // ═══ 文件树工具函数 ═══
  function getKbTreeChildren(kbId: string): TreeNode[] {
    const root = findKbTreeNode(kbId)
    return root?.children ?? []
  }

  function findKbTreeNode(kbId: string): TreeNode | undefined {
    for (const node of flattenTree(currentFileTree.value)) {
      if (node.kbId === kbId && node.type === 'folder') return node
    }
    return undefined
  }

  function flattenTree(nodes: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = []
    for (const n of nodes) {
      result.push(n)
      if (n.children) result.push(...flattenTree(n.children))
    }
    return result
  }

  function getKbTreeRows(kbId: string): TreeRow[] {
    const root = findKbTreeNode(kbId)
    if (!root) return []
    const rows: TreeRow[] = []
    flattenTreeRows(root.children ?? [], 1, 'kb', kbId, rows)
    return rows
  }

  function flattenTreeRows(nodes: TreeNode[], depth: number, prefix: string, inheritedKbId: string, result: TreeRow[]) {
    for (const n of nodes) {
      const kbId = n.kbId ?? inheritedKbId
      result.push({ id: `${prefix}-${n.id}`, node: n, depth, kbId })
      if (n.type === 'folder' && expandedTreeIds.value.includes(n.id) && n.children) {
        flattenTreeRows(n.children, depth + 1, prefix, kbId, result)
      }
    }
  }

  function toggleKbTreeExpand(kbId: string) {
    const root = findKbTreeNode(kbId)
    if (root) toggleTreeNode(root)
  }

  function kbNodeHasFolderChildren(kbId: string): boolean {
    const children = getKbTreeChildren(kbId)
    return children.some(c => c.type === 'folder')
  }

  function getKbTreeRootId(kbId: string): string {
    return findKbTreeNode(kbId)?.id ?? kbId
  }

  function previewFileFromTree(row: TreeRow) {
    if (!row.kbId) return
    const docName = row.node.docName || row.node.label
    const doc = (allDocs[row.kbId] ?? []).find(d => d.name === docName)
    if (doc) {
      selectKb(row.kbId)
      openPreview(doc)
    }
  }

  function getTagStyle(_tagName: string): string {
    return 'bg-zinc-100 text-zinc-600'
  }

  // 清理
  function dispose() {
    if (feedbackTimer) clearTimeout(feedbackTimer)
    if (highlightTimer) clearTimeout(highlightTimer)
  }

  return {
    // 用户
    currentUser, isAdmin,
    // 状态
    sidebarVisible, activeSpace, selectedKbId, activeSpaceRoot, activeTreeId,
    expandedTreeIds, favoriteMenuKbId, selectedFileIds,
    createMode, createKbName, createFolderMode, createFolderName, createFolderParentId,
    fileView, kbView, fileSearch, kbSearch, fileActionFeedback,
    uploadModalOpen, uploadFileNames, uploadTags, uploadTasks,
    previewDoc, previewTabs, activeRightTab,
    renamingDocName, draftDocTitle, renamingFolderId, draftFolderTitle,
    qaOpen, qaQuestion, qaEditId, qaEditDraft, qaCopiedId, qaMessages, qaMode,
    qaThinkingOpen, qaThinking, toggleThinking, simulateThinking,
    highlightedSection,
    contextMenu, confirmModal,
    // 数据
    knowledgeBases, allDocs, fileTree,
    // 计算属性
    currentSpaceItems, selectedKb, displayedKnowledgeBases,
    docs, filteredDocs, pinnedKnowledgeBases,
    activeNode, currentFileTree, hasKnowledgeItems,
    mainTitle, rightPanelOpen, activePreviewDoc,
    // 方法
    showToast, showConfirm,
    switchSpace, selectKb, deselectKb,
    createKnowledgeBase, toggleKbPinned, deleteKb,
    openCreateFolderModal, createFolder, deleteTreeFolder,
    beginRenameFolder, commitRenameFolder,
    toggleFileSelect, selectAllFiles, deleteDoc, deleteSelectedDocs,
    openUploadModal, handleUploadFiles, confirmUpload, dismissUploadTask,
    openPreview, openQaPanel, closePreviewPanel, closeRightTab, closeQaPanel,
    beginRenameDoc, commitRenameDoc,
    parseQaContent, askKnowledgeBase, openCitationRef,
    copyQaMessage, beginEditQaMessage, commitEditQaMessage, retryQaMessage,
    openTreeRow, toggleTreeNode,
    getKbTreeChildren, getKbTreeRows, getKbTreeRootId,
    kbNodeHasFolderChildren, toggleKbTreeExpand,
    previewFileFromTree,
    getTagStyle,
    removeTreeNodesByPredicate,
    dispose,
  }
}
