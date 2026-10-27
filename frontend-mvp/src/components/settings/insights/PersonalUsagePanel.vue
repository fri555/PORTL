<script setup lang="ts">
import type { Component } from 'vue'
import { Download } from 'lucide-vue-next'
import type { PersonalUsageRecord } from '@/types/settings-insights'
import { money } from '@/composables/settings/insights-helpers'

defineProps<{
  metrics: Array<{ label: string; value: string; note: string; icon: Component }>
  displayRate: number
  personalUsageRecords: PersonalUsageRecord[]
}>()
const startDate = defineModel<string>('startDate', { required: true })
const endDate = defineModel<string>('endDate', { required: true })
const personalPeriod = defineModel<'today' | '7d' | '30d' | 'custom'>('personalPeriod', {
  required: true,
})
const emit = defineEmits<{ choosePeriod: [period: 'today' | '7d' | '30d']; export: [] }>()
</script>

<template>
  <header class="personal-head">
    <div>
      <span class="personal-breadcrumb">我的用量</span>
      <h1>个人消耗明细</h1>
      <p>查看每次请求产生的费用与智能体消耗</p>
    </div>
    <div class="personal-actions">
      <div role="tablist" aria-label="个人明细时间范围" class="segmented">
        <button
          type="button"
          role="tab"
          :aria-selected="personalPeriod === 'today'"
          @click="emit('choosePeriod', 'today')"
        >
          今天</button
        ><button
          type="button"
          role="tab"
          :aria-selected="personalPeriod === '7d'"
          @click="emit('choosePeriod', '7d')"
        >
          7 天</button
        ><button
          type="button"
          role="tab"
          :aria-selected="personalPeriod === '30d'"
          @click="emit('choosePeriod', '30d')"
        >
          30 天
        </button>
      </div>
      <div class="personal-date">
        <input
          v-model="startDate"
          type="date"
          aria-label="开始日期"
          @change="personalPeriod = 'custom'"
        /><span>至</span
        ><input
          v-model="endDate"
          type="date"
          aria-label="结束日期"
          @change="personalPeriod = 'custom'"
        />
      </div>
      <button
        type="button"
        class="secondary-button"
        aria-label="导出个人消耗明细"
        @click="emit('export')"
      >
        <Download :size="15" />导出
      </button>
    </div>
  </header>
  <section class="metric-grid personal-metrics">
    <article
      v-for="item in metrics.slice(0, 3)"
      :key="item.label"
      class="metric-card"
      :class="{
        danger: item.label === '个人额度' && displayRate >= 90,
        warning: item.label === '个人额度' && displayRate >= 80 && displayRate < 90,
      }"
    >
      <div>
        <span>{{ item.label }}</span
        ><component :is="item.icon" :size="17" />
      </div>
      <strong>{{ item.value }}</strong
      ><small>{{ item.note }}</small>
    </article>
  </section>
  <section class="panel personal-ledger">
    <div class="table-scroll">
      <table aria-label="个人消耗明细">
        <thead>
          <tr>
            <th>时间</th>
            <th>请求</th>
            <th>模块</th>
            <th>智能体</th>
            <th>金额消耗</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in personalUsageRecords" :key="record.id">
            <td>{{ record.time }}</td>
            <td>
              <div class="request-cell">
                <strong>{{ record.request }}</strong
                ><small>{{ record.requestId }}</small>
              </div>
            </td>
            <td>{{ record.client }}</td>
            <td>{{ record.agent }}</td>
            <td>{{ money(record.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped src="./personal-usage.css"></style>
