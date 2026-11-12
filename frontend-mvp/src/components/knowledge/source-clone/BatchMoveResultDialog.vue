<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, CircleSlash, RefreshCw, X, XCircle } from 'lucide-vue-next'
import type { MoveResult, MoveStatus } from '@/composables/useKnowledgeMove'

const props = defineProps<{
  results: MoveResult[]
  title: string
  targetName?: string
}>()

const emit = defineEmits<{
  close: []
  retry: [id: string]
}>()

interface ResultGroup {
  status: MoveStatus
  label: string
  items: MoveResult[]
}

const groups = computed<ResultGroup[]>(() => {
  const pick = (status: MoveStatus) => props.results.filter((result) => result.status === status)
  return [
    { status: 'success', label: '成功', items: pick('success') },
    { status: 'skipped', label: '跳过', items: pick('skipped') },
    { status: 'failed', label: '失败', items: pick('failed') },
  ]
})
const successCount = computed(() => props.results.filter((result) => result.status === 'success').length)
const skippedCount = computed(() => props.results.filter((result) => result.status === 'skipped').length)
const failedCount = computed(() => props.results.filter((result) => result.status === 'failed').length)
</script>

<template>
  <Teleport to="body">
    <div class="dialog-overlay" @mousedown.self="emit('close')">
      <section
        class="dialog-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-result-title"
        data-testid="batch-result-dialog"
      >
        <header class="dialog-header">
          <h2 id="batch-result-title">{{ title }}</h2>
          <button class="icon-button" type="button" aria-label="关闭结果弹窗" @click="emit('close')"><X :size="19" /></button>
        </header>

        <div class="result-body">
          <div class="result-overview">
            <span class="overview-item success"><CheckCircle2 :size="15" />成功 {{ successCount }}</span>
            <span class="overview-item skipped"><CircleSlash :size="15" />跳过 {{ skippedCount }}</span>
            <span class="overview-item failed"><XCircle :size="15" />失败 {{ failedCount }}</span>
          </div>
          <p v-if="targetName" class="result-target">目标位置：{{ targetName }}</p>

          <section v-for="group in groups" :key="group.status" v-show="group.items.length" class="result-group" :class="group.status">
            <h3><span class="group-dot" />{{ group.label }}（{{ group.items.length }}）</h3>
            <ul>
              <li v-for="item in group.items" :key="item.id">
                <span class="item-name">
                  {{ item.name }}
                  <small v-if="item.finalName">→ {{ item.finalName }}</small>
                </span>
                <span v-if="item.reason" class="item-reason">{{ item.reason }}</span>
                <button
                  v-if="group.status === 'failed'"
                  type="button"
                  class="retry-button"
                  :aria-label="`重试${item.name}`"
                  @click="emit('retry', item.id)"
                >
                  <RefreshCw :size="13" />重试
                </button>
              </li>
            </ul>
          </section>

          <p v-if="failedCount" class="partial-note">
            成功的项已照常生效，失败/跳过的项留在原地，不会整批回滚。可对失败项单独重试。
          </p>
          <p v-else class="partial-note">全部处理完成。</p>
        </div>

        <footer class="dialog-footer">
          <button class="button primary" type="button" @click="emit('close')">关闭</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: grid;
  place-items: center;
  padding: 12px;
  background: rgba(0, 0, 0, 0.4);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #111;
}
.dialog-surface {
  width: min(560px, calc(100vw - 24px));
  max-height: calc(100vh - 24px);
  overflow: auto;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.18);
}
.dialog-header {
  display: flex;
  min-height: 66px;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}
.dialog-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
}
.icon-button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #777;
  cursor: pointer;
}
.icon-button:hover {
  background: #f6f6f7;
  color: #111;
}
.result-body {
  padding: 0 24px;
}
.result-overview {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.overview-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 13px;
}
.overview-item.success {
  background: #eaf7f0;
  color: #238466;
}
.overview-item.skipped {
  background: #f2f3f5;
  color: #777;
}
.overview-item.failed {
  background: #fdeeee;
  color: #d92d20;
}
.result-target {
  margin: 12px 0 0;
  color: #666;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.result-group {
  margin-top: 18px;
}
.result-group h3 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
}
.group-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #bbb;
}
.result-group.success .group-dot {
  background: #2f9e73;
}
.result-group.skipped .group-dot {
  background: #9aa0a6;
}
.result-group.failed .group-dot {
  background: #e5484d;
}
.result-group ul {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid #eceef2;
  border-radius: 9px;
  overflow: hidden;
}
.result-group li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 12px;
  font-size: 13px;
  line-height: 20px;
}
.result-group li + li {
  border-top: 1px solid #f0f1f3;
}
.item-name {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
}
.item-name small {
  display: block;
  color: #238466;
  font-size: 11px;
}
.item-reason {
  min-width: 0;
  flex: 0 0 46%;
  color: #999;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.result-group.failed .item-reason {
  color: #d92d20;
}
.retry-button {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  border: 1px solid #d9dce1;
  border-radius: 6px;
  background: #fff;
  padding: 3px 9px;
  color: #1677ff;
  font-size: 12px;
  cursor: pointer;
}
.retry-button:hover {
  background: #f2f7ff;
}
.partial-note {
  margin: 16px 0 0;
  color: #8a94a6;
  font-size: 12px;
  line-height: 18px;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px 24px 24px;
}
.button {
  height: 34px;
  min-width: 72px;
  border: 1px solid #111;
  border-radius: 7px;
  padding: 0 16px;
  background: #111;
  color: #fff;
  font-size: 14px;
  line-height: 32px;
  cursor: pointer;
}
.button:hover {
  background: #292929;
}
</style>
