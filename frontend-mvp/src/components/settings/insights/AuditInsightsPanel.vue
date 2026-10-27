<script setup lang="ts">
import { Download, RotateCcw } from 'lucide-vue-next'
import type { AuditInsightsState } from '@/composables/settings/useAuditInsights'
import { actorDirectory } from '@/mock/settings-insights'
import { actorDisplayName } from '@/composables/settings/insights-helpers'

defineProps<{ state: AuditInsightsState }>()
</script>

<template>
  <header class="page-head">
    <div>
      <span class="eyebrow">LOG MANAGEMENT</span>
      <h1>日志管理</h1>
      <p>查看新增、修改、删除操作的完整字段差异</p>
    </div>
    <button
      type="button"
      class="secondary-button"
      aria-label="导出当前筛选结果"
      @click="state.exportAudit"
    >
      <Download :size="16" />导出当前结果
    </button>
  </header>
  <section class="filter-panel audit-filters">
    <label
      ><span>开始时间</span
      ><input v-model="state.auditStart" aria-label="开始时间" type="datetime-local" /></label
    ><label
      ><span>结束时间</span
      ><input v-model="state.auditEnd" aria-label="结束时间" type="datetime-local" /></label
    ><label
      ><span>操作人员</span
      ><input
        v-model="state.actorQuery"
        list="audit-actor-options"
        aria-label="操作人员"
        placeholder="输入本名或花名"
      /><datalist id="audit-actor-options">
        <option v-for="actor in actorDirectory" :key="actor.id" :value="actor.label">
          {{ actor.label }} · {{ actor.department }}
        </option>
      </datalist></label
    ><label
      ><span>操作模块</span
      ><select v-model="state.auditModule" aria-label="操作模块" required>
        <option value="" disabled>请选择模块</option>
        <option value="智能体">智能体</option>
        <option>连接器</option>
        <option>技能</option>
        <option>模型</option>
        <option>模型供应商</option>
        <option>知识库</option>
        <option>知识文件夹</option>
        <option>知识文档</option>
      </select></label
    ><label
      ><span>操作对象</span
      ><input
        v-model="state.auditObjectQuery"
        aria-label="操作对象"
        placeholder="对象名称或 ID" /></label
    ><label
      ><span>操作类型</span
      ><select v-model="state.auditAction" aria-label="操作类型" required>
        <option value="" disabled>请选择类型</option>
        <option value="CREATE">新增</option>
        <option value="UPDATE">修改</option>
        <option value="DELETE">删除</option>
      </select></label
    >
    <div class="filter-actions">
      <button
        type="button"
        class="filter-reset"
        aria-label="清空审计筛选"
        @click="state.resetAuditFilters"
      >
        <RotateCcw :size="14" />清空</button
      ><button
        type="button"
        class="primary-button"
        aria-label="应用审计筛选"
        @click="state.applyAuditFilters"
      >
        查询
      </button>
    </div>
  </section>
  <section class="panel audit-panel">
    <div class="table-scroll">
      <table aria-label="日志列表">
        <thead>
          <tr>
            <th>时间</th>
            <th>人员</th>
            <th>模块</th>
            <th>对象</th>
            <th>描述</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="record in state.paginatedAuditRecords"
            :key="record.id"
            :data-testid="`audit-row-${record.id}`"
            class="clickable"
            tabindex="0"
            @click="state.selectedAudit = record"
            @keydown.enter="state.selectedAudit = record"
          >
            <td>{{ record.createTime }}</td>
            <td>{{ actorDisplayName(record) }}</td>
            <td>{{ record.bizType }}</td>
            <td>
              <strong>{{ record.bizName }}</strong>
            </td>
            <td>{{ record.operationDesc }}</td>
          </tr>
          <tr v-if="!state.paginatedAuditRecords.length">
            <td colspan="5" class="empty-cell">当前条件下暂无日志</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="state.auditTotalPages > 1" class="pagination">
      <span class="pagination-info"
        >共 {{ state.filteredAuditRecords.length }} 条，第 {{ state.auditPage }} /
        {{ state.auditTotalPages }} 页</span
      >
      <div class="pagination-btns">
        <button type="button" :disabled="state.auditPage <= 1" @click="state.auditPage--">
          上一页
        </button>
        <button
          v-for="p in state.auditTotalPages"
          :key="p"
          type="button"
          :class="{ active: p === state.auditPage }"
          @click="state.auditPage = p"
        >
          {{ p }}
        </button>
        <button
          type="button"
          :disabled="state.auditPage >= state.auditTotalPages"
          @click="state.auditPage++"
        >
          下一页
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped src="./audit-insights.css"></style>
