import { computed, ref, watch, type UnwrapNestedRefs } from 'vue'
import type { AuditRecord } from '@/types/settings-insights'
import { actorDirectory, auditRecords } from '@/mock/settings-insights'
import { downloadCsv } from './insights-helpers'
import { auditCsvRows } from './insights-export'

export function useAuditInsights(showFeedback: (message: string) => void) {
  const selectedAudit = ref<AuditRecord | null>(null)
  const auditStart = ref('2026-09-01T00:00')
  const auditEnd = ref('2026-09-16T23:59')
  const actorQuery = ref('')
  const auditModule = ref('')
  const auditObjectQuery = ref('')
  const auditAction = ref('')
  const appliedAudit = ref({
    start: auditStart.value,
    end: auditEnd.value,
    actor: '',
    actorId: '',
    module: '',
    objectQuery: '',
    action: '',
  })

  const filteredAuditRecords = computed(() =>
    auditRecords
      .filter((record) => {
        const f = appliedAudit.value
        const time = new Date(record.createTime.replace(' ', 'T')).getTime()
        const objQ = f.objectQuery.trim().toLowerCase()
        return (
          (!f.start || time >= new Date(f.start).getTime()) &&
          (!f.end || time <= new Date(f.end).getTime()) &&
          (!f.actorId || record.createUserId === f.actorId) &&
          (!f.module || record.bizType === f.module) &&
          (!f.action || record.operationType === f.action) &&
          (!objQ ||
            record.bizName.toLowerCase().includes(objQ) ||
            record.bizId.toLowerCase().includes(objQ))
        )
      })
      .sort((a, b) => b.createTime.localeCompare(a.createTime)),
  )
  function applyAuditFilters() {
    const keyword = actorQuery.value.trim().toLowerCase()
    const selectedActor = actorDirectory.find(
      (actor) =>
        actor.label.toLowerCase() === keyword || actor.label.toLowerCase().includes(keyword),
    )
    appliedAudit.value = {
      start: auditStart.value,
      end: auditEnd.value,
      actor: actorQuery.value,
      actorId: keyword ? (selectedActor?.id ?? '__no_match__') : '',
      module: auditModule.value,
      objectQuery: auditObjectQuery.value,
      action: auditAction.value,
    }
    showFeedback(`筛选已应用，共 ${filteredAuditRecords.value.length} 条记录`)
  }
  function resetAuditFilters() {
    auditStart.value = '2026-09-01T00:00'
    auditEnd.value = '2026-09-16T23:59'
    actorQuery.value = ''
    auditModule.value = ''
    auditObjectQuery.value = ''
    auditAction.value = ''
    applyAuditFilters()
  }
  function exportAudit() {
    downloadCsv('日志管理.csv', auditCsvRows(filteredAuditRecords.value))
    showFeedback(`已导出 ${filteredAuditRecords.value.length} 条日志记录`)
  }

  // 分页
  const auditPageSize = 10
  const auditPage = ref(1)
  const paginatedAuditRecords = computed(() => {
    const start = (auditPage.value - 1) * auditPageSize
    return filteredAuditRecords.value.slice(start, start + auditPageSize)
  })
  const auditTotalPages = computed(() =>
    Math.max(1, Math.ceil(filteredAuditRecords.value.length / auditPageSize)),
  )
  watch(filteredAuditRecords, () => {
    auditPage.value = 1
  })

  return {
    selectedAudit,
    auditStart,
    auditEnd,
    actorQuery,
    auditModule,
    auditObjectQuery,
    auditAction,
    appliedAudit,
    filteredAuditRecords,
    applyAuditFilters,
    resetAuditFilters,
    exportAudit,
    auditPageSize,
    auditPage,
    paginatedAuditRecords,
    auditTotalPages,
  }
}

export type AuditInsightsState = UnwrapNestedRefs<ReturnType<typeof useAuditInsights>>
