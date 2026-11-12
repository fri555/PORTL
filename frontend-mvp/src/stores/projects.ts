import { computed, reactive, ref, watch, type UnwrapNestedRefs } from 'vue'

/** 项目是组织容器：一个项目挂多个对话，这些对话共用同一批文件。本期共享范围只限本人。 */
export interface Project {
  id: string
  name: string
  sessionIds: string[]
  createdAt: string
  updatedAt: string
}

export type ArtifactScope = 'session' | 'project'
export type ArtifactKind = 'HTML' | 'XLSX' | 'PDF' | 'PPTX' | 'PNG'

export interface ArtifactFile {
  id: string
  name: string
  size: string
  kind: ArtifactKind
  scope: ArtifactScope
  sessionId?: string
  projectId?: string
  createdAt: string
  /** 预览内容（原型模拟），失效时为空 */
  preview?: string
  /** 报告型预览模板；有值时由产物栏生成完整报告版式，不把大段 HTML 写进本地存储 */
  template?: 'brand-daily'
  available?: boolean
}

const STORAGE_KEY = 'tianma.prototype.projects.v1'

function nowText(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function seedProjects(): Project[] {
  return [
    { id: 'project-top-products', name: '耶运动旗舰店经营分析', sessionIds: ['expert-top-status', 'expert-sales-change'], createdAt: '2026-08-26 09:12', updatedAt: '2026-08-27 13:10' },
    { id: 'project-weekly', name: '本周经营周报整理', sessionIds: ['daily-weekly', 'daily-summary'], createdAt: '2026-08-22 09:00', updatedAt: '2026-08-23 10:00' },
  ]
}

interface PersistedState {
  projects: Project[]
  files: ArtifactFile[]
}

function seedFiles(): ArtifactFile[] {
  return [
    { id: 'proj-top-xlsx', name: '天猫耶运动旗舰店_重点货号_20260819-20260825.xlsx', size: '42.0 KB', kind: 'XLSX', scope: 'project', projectId: 'project-top-products', createdAt: '2026-08-26 11:13', preview: '重点货号明细｜共 32 个 SKU｜按销售额倒序', available: true },
    { id: 'proj-top-html', name: 'TOP款现状分析报告.html', size: '293.6 KB', kind: 'HTML', scope: 'project', projectId: 'project-top-products', createdAt: '2026-08-26 11:13', preview: '<h2>TOP款经营分析</h2><p>共 32 个重点货号，头部 5 款贡献 61% 销售额。</p><p>建议关注退货率异常的 3 款。</p>', available: true },
    { id: 'proj-top-sales', name: '本月销售额环比拆解.xlsx', size: '96.8 KB', kind: 'XLSX', scope: 'project', projectId: 'project-top-products', createdAt: '2026-08-26 15:43', preview: '环比拆解｜流量 -3.2%｜转化 +1.1%｜客单价 -0.8%', available: true },
    { id: 'proj-week-pdf', name: '经营周报_第34周.pdf', size: '575.6 KB', kind: 'PDF', scope: 'project', projectId: 'project-weekly', createdAt: '2026-08-23 09:30', preview: '经营周报 第34周｜本周要点：库存周转、活动复盘、下周计划', available: true },
    { id: 'proj-week-doc', name: '会议待办汇总.md', size: '12.4 KB', kind: 'HTML', scope: 'project', projectId: 'project-weekly', createdAt: '2026-08-22 09:00', preview: '<h3>会议待办汇总</h3><ul><li>补齐库存周转口径</li><li>确认活动排期</li></ul>', available: true },
    { id: 'session-top-report', name: 'TOP款分析结论.pdf', size: '328.1 KB', kind: 'PDF', scope: 'session', sessionId: 'expert-top-status', createdAt: '2026-08-27 13:10', preview: 'TOP款分析结论｜头部集中度高｜建议优化长尾曝光', available: true },
    { id: 'session-top-table', name: 'TOP款明细.xlsx', size: '42.0 KB', kind: 'XLSX', scope: 'session', sessionId: 'expert-top-status', createdAt: '2026-08-27 13:10', preview: 'TOP款明细｜32 行', available: true },
    { id: 'session-default-html', name: '日程与待办汇总.html', size: '36.6 KB', kind: 'HTML', scope: 'session', sessionId: 'daily-default', createdAt: '2026-08-27 13:23', preview: '<h3>今日日程与待办</h3><p>已汇总授权范围内的 4 条日程与 6 条待办。</p>', available: true },
    { id: 'session-default-xlsx', name: '待办清单.xlsx', size: '18.2 KB', kind: 'XLSX', scope: 'session', sessionId: 'daily-default', createdAt: '2026-08-27 13:23', preview: '待办清单｜6 条', available: true },
    { id: 'session-query-brand-report', name: '2026-11-11 品牌中心销售日报.html', size: '293.6 KB', kind: 'HTML', scope: 'session', sessionId: 'query-brand-daily', createdAt: '2026-11-12 08:25', template: 'brand-daily', available: true },
    { id: 'session-query-brand-report-ko', name: '2026-11-11 브랜드센터 매출 일보.html', size: '291.2 KB', kind: 'HTML', scope: 'session', sessionId: 'query-brand-daily', createdAt: '2026-11-12 08:25', template: 'brand-daily', available: true },
    { id: 'proj-query-weekly-report', name: '11 月经营指标周报.html', size: '186.4 KB', kind: 'HTML', scope: 'project', projectId: 'project-weekly', createdAt: '2026-11-10 17:20', template: 'brand-daily', available: true },
    { id: 'session-broken', name: '历史对比草稿.pdf', size: '—', kind: 'PDF', scope: 'session', sessionId: 'daily-default', createdAt: '2026-08-26 10:00', available: false },
  ]
}

function load(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { projects: seedProjects(), files: seedFiles() }
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : seedProjects(),
      files: Array.isArray(parsed.files) ? parsed.files : seedFiles(),
    }
  } catch {
    return { projects: seedProjects(), files: seedFiles() }
  }
}

function createProjectsStore() {
  const initial = load()
  const projects = ref<Project[]>(initial.projects)
  const files = ref<ArtifactFile[]>(initial.files)
  const activeProjectId = ref('')

  watch([projects, files], () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects: projects.value, files: files.value })) } catch { /* 原型内存态 */ }
  }, { deep: true })

  const projectList = computed(() => [...projects.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))

  function projectOfSession(sessionId: string): Project | undefined {
    return projects.value.find(project => project.sessionIds.includes(sessionId))
  }

  function sessionFiles(sessionId: string): ArtifactFile[] {
    return files.value.filter(file => file.scope === 'session' && file.sessionId === sessionId)
  }

  function projectSharedFiles(projectId: string): ArtifactFile[] {
    return files.value.filter(file => file.scope === 'project' && file.projectId === projectId)
  }

  function artifactsForSession(sessionId: string): { session: ArtifactFile[]; project: ArtifactFile[]; projectName: string } {
    const project = projectOfSession(sessionId)
    return {
      session: sessionFiles(sessionId),
      project: project ? projectSharedFiles(project.id) : [],
      projectName: project?.name ?? '',
    }
  }

  function createProject(name: string): Project {
    const project: Project = {
      id: 'project-' + Date.now().toString(36),
      name: name.trim() || '未命名项目',
      sessionIds: [],
      createdAt: nowText(),
      updatedAt: nowText(),
    }
    projects.value = [project, ...projects.value]
    activeProjectId.value = project.id
    return project
  }

  function renameProject(id: string, name: string) {
    const project = projects.value.find(item => item.id === id)
    if (!project || !name.trim()) return
    project.name = name.trim()
    project.updatedAt = nowText()
  }

  /** 默认只解除组织关系，对话和文件保留。 */
  function removeProject(id: string) {
    projects.value = projects.value.filter(item => item.id !== id)
    if (activeProjectId.value === id) activeProjectId.value = ''
  }

  function addSessionToProject(sessionId: string, projectId: string) {
    projects.value.forEach(project => {
      project.sessionIds = project.sessionIds.filter(id => id !== sessionId)
    })
    const target = projects.value.find(project => project.id === projectId)
    if (!target) return
    target.sessionIds = [...target.sessionIds, sessionId]
    target.updatedAt = nowText()
  }

  function removeSessionFromProject(sessionId: string) {
    projects.value.forEach(project => {
      if (project.sessionIds.includes(sessionId)) {
        project.sessionIds = project.sessionIds.filter(id => id !== sessionId)
        project.updatedAt = nowText()
      }
    })
  }

  function addFileToProject(projectId: string, file: Omit<ArtifactFile, 'id' | 'scope' | 'projectId' | 'createdAt'>) {
    files.value = [{
      ...file,
      id: 'file-' + Date.now().toString(36),
      scope: 'project',
      projectId,
      createdAt: nowText(),
      available: file.available ?? true,
    }, ...files.value]
    const project = projects.value.find(item => item.id === projectId)
    if (project) project.updatedAt = nowText()
  }

  function defaultSessionArtifacts(sessionId: string) {
    if (sessionFiles(sessionId).length) return
    files.value = [
      { id: `session-${sessionId}-html`, name: '本次会话分析结果.html', size: '36.6 KB', kind: 'HTML', scope: 'session', sessionId, createdAt: nowText(), preview: '<h3>本次会话分析结果</h3><p>原型演示产物，可切换标签连续查看。</p>', available: true },
      { id: `session-${sessionId}-report`, name: '2026-11-11 品牌中心销售日报.html', size: '293.6 KB', kind: 'HTML', scope: 'session', sessionId, createdAt: '2026-11-12 08:25', template: 'brand-daily', available: true },
      { id: `session-${sessionId}-xlsx`, name: '本次会话数据明细.xlsx', size: '24.8 KB', kind: 'XLSX', scope: 'session', sessionId, createdAt: nowText(), preview: '本次会话数据明细｜原型演示产物', available: true },
      ...files.value,
    ]
  }

  return {
    projects, files, activeProjectId, projectList,
    projectOfSession, sessionFiles, projectSharedFiles, artifactsForSession,
    createProject, renameProject, removeProject,
    addSessionToProject, removeSessionFromProject, addFileToProject, defaultSessionArtifacts,
  }
}

type ProjectsStore = UnwrapNestedRefs<ReturnType<typeof createProjectsStore>>
let projectsInstance: ProjectsStore | null = null
/** 模块级单例：原型在无 Pinia 的测试环境里也能渲染。 */
export function useProjectsStore(): ProjectsStore {
  if (!projectsInstance) projectsInstance = reactive(createProjectsStore())
  return projectsInstance
}
