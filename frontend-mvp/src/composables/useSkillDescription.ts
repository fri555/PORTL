import { computed, ref } from 'vue'
import { agents, dailyAssistant } from '@/mock/agents'

/**
 * 技能简介（SKILL.md 的 description）只读数据源。
 * 原型没有真实的 SKILL.md 文件，这里从 mock 数据 capabilities.skills[].description
 * 取一个稳定的字段作为「当前版本 SKILL.md description」的解析结果。
 */
export const SKILL_DESCRIPTION_MISSING_HINT = '请在 SKILL.md 中补充 description'

export interface SkillInfo {
  id: string
  name: string
  identifier: string
  /** 当前版本 SKILL.md 解析出的 description；为空表示缺失或解析失败 */
  description: string
  /** SKILL.md description 是否解析成功 */
  parseOk: boolean
}

export interface SkillActivation {
  enabled: boolean
  published: boolean
}

const ACTIVATION_KEY = 'tianma.prototype.skill-activations.v1'

/** 模拟解析 SKILL.md frontmatter 的 description 字段。 */
export function parseSkillDescription(raw: string): { description: string; parseOk: boolean } {
  const value = (raw ?? '').trim()
  if (!value) return { description: '', parseOk: false }
  // 原型：带显式失败标记时模拟解析失败
  if (/PARSE_ERROR|解析失败/i.test(value)) return { description: '', parseOk: false }
  const match = /^description\s*[:：]\s*(.+)$/im.exec(value)
  const description = (match?.[1] ?? value).trim()
  return { description, parseOk: description.length > 0 }
}

type MockSkill = { id: string; name: string; identifier: string; rawDescription: string }

/** 从 mock 数据聚合稳定的技能清单；额外补两条演示数据用于覆盖「缺失 / 解析失败」规则。 */
function collectSkills(): SkillInfo[] {
  const source: MockSkill[] = [dailyAssistant, ...agents].flatMap((agent) =>
    (agent.capabilities?.skills ?? []).map((skill) => ({
      id: skill.id,
      name: skill.name,
      identifier: skill.identifier ?? skill.id,
      rawDescription: skill.description ?? '',
    })),
  )
  // 原型演示：SKILL.md 未写 description / 解析失败，用于验证「允许保存但不得启用或发布」
  source.push({ id: 'skill-demo-missing', name: '示例技能（缺少简介）', identifier: 'DEMO-MISSING', rawDescription: '' })
  source.push({ id: 'skill-demo-broken', name: '示例技能（简介解析失败）', identifier: 'DEMO-BROKEN', rawDescription: 'PARSE_ERROR: frontmatter 损坏' })
  return source.map((item) => {
    const parsed = parseSkillDescription(item.rawDescription)
    return {
      id: item.id,
      name: item.name,
      identifier: item.identifier,
      description: parsed.description,
      parseOk: parsed.parseOk,
    }
  })
}

const skillList = collectSkills()

function loadActivations(): Record<string, SkillActivation> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(ACTIVATION_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const result: Record<string, SkillActivation> = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue
      const item = value as Partial<SkillActivation>
      result[id] = { enabled: item.enabled === true, published: item.published === true }
    }
    return result
  } catch {
    return {}
  }
}

const activations = ref<Record<string, SkillActivation>>(loadActivations())

function persistActivations() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(ACTIVATION_KEY, JSON.stringify(activations.value))
  } catch {
    // 原型：本地存储不可用时保留内存状态即可
  }
}

export function useSkillDescription() {
  const skills = computed(() => skillList)

  function activationOf(id: string): SkillActivation {
    return activations.value[id] ?? { enabled: false, published: false }
  }

  /** 简介缺失或解析失败时，技能不得启用或发布 */
  function canActivate(skill: SkillInfo): boolean {
    return skill.parseOk && skill.description.trim().length > 0
  }

  function blockedReason(skill: SkillInfo): string {
    return skill.parseOk
      ? SKILL_DESCRIPTION_MISSING_HINT
      : 'SKILL.md description 解析失败，请在 SKILL.md 中补充 description'
  }

  function setEnabled(skill: SkillInfo, enabled: boolean): string | null {
    if (enabled && !canActivate(skill)) return blockedReason(skill)
    const current = activationOf(skill.id)
    activations.value = {
      ...activations.value,
      [skill.id]: { enabled, published: enabled ? current.published : false },
    }
    persistActivations()
    return null
  }

  function setPublished(skill: SkillInfo, published: boolean): string | null {
    if (published && !canActivate(skill)) return blockedReason(skill)
    if (published && !activationOf(skill.id).enabled) return '请先启用该技能'
    const current = activationOf(skill.id)
    activations.value = { ...activations.value, [skill.id]: { ...current, published } }
    persistActivations()
    return null
  }

  /** 存在不可激活技能时，界面需要给出「可保存、不可启用/发布」的提示 */
  const blockedSkills = computed(() => skillList.filter((skill) => !canActivate(skill)))

  return {
    skills,
    activations,
    activationOf,
    canActivate,
    blockedReason,
    setEnabled,
    setPublished,
    blockedSkills,
  }
}
