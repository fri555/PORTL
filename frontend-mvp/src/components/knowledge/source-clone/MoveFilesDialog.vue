<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertTriangle, Check, Folder, X } from 'lucide-vue-next'
import type {
  DuplicatePolicy,
  MoveAnalysis,
  MoveRequest,
  MoveSelection,
  MoveTargetOption,
  VisibilityPolicy,
} from '@/composables/useKnowledgeMove'

const props = defineProps<{
  targets: MoveTargetOption[]
  selections: MoveSelection[]
  forbiddenIds: Set<string>
  analyze: (targetId: string) => MoveAnalysis
}>()

const emit = defineEmits<{
  close: []
  confirm: [request: MoveRequest]
}>()

type Step = 'pick' | 'confirm'
const step = ref<Step>('pick')
const targetId = ref('')
const policy = ref<VisibilityPolicy>('follow')
const duplicatePolicy = ref<DuplicatePolicy>('rename')
const acknowledged = ref(false)

/** 只列本人有写入权、且不是选中文件夹自身/子文件夹的位置 */
const availableTargets = computed(() =>
  props.targets.filter((target) => target.writable && !props.forbiddenIds.has(target.id)),
)
const analysis = computed(() => props.analyze(targetId.value))
const needsSecondConfirm = computed(
  () => analysis.value.crossSpace || analysis.value.independentCount > 0,
)
const canSubmit = computed(
  () => Boolean(targetId.value) && (!needsSecondConfirm.value || acknowledged.value),
)
const previewSelections = computed(() => props.selections.slice(0, 6))

function spaceLabel(space: MoveTargetOption['space']): string {
  return space === 'personal' ? '个人空间' : '公共空间'
}

function chooseTarget(id: string) {
  targetId.value = id
}

function goConfirm() {
  if (!targetId.value) return
  acknowledged.value = false
  step.value = 'confirm'
}

function backToPick() {
  step.value = 'pick'
}

function submit() {
  if (!canSubmit.value) return
  emit('confirm', {
    targetId: targetId.value,
    policy: policy.value,
    duplicatePolicy: duplicatePolicy.value,
  })
}
</script>

<template>
  <Teleport to="body">
    <div class="dialog-overlay" @mousedown.self="emit('close')">
      <section
        class="dialog-surface"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="step === 'pick' ? 'move-pick-title' : 'move-confirm-title'"
        data-testid="move-files-dialog"
      >
        <header class="dialog-header">
          <h2 :id="step === 'pick' ? 'move-pick-title' : 'move-confirm-title'">
            {{ step === 'pick' ? '移动文件' : '确认移动' }}
          </h2>
          <button class="icon-button" type="button" aria-label="关闭移动弹窗" @click="emit('close')"><X :size="19" /></button>
        </header>

        <!-- 第一步：选择目标位置 -->
        <div v-if="step === 'pick'" class="move-body">
          <p class="move-section-title">选择目标位置<small>已选 {{ selections.length }} 项</small></p>
          <div class="target-list" role="tree" aria-label="可写入的目标位置">
            <button
              v-for="target in availableTargets"
              :key="target.id"
              type="button"
              class="target-row"
              :class="{ 'is-active': targetId === target.id }"
              role="treeitem"
              :aria-selected="targetId === target.id"
              :style="{ paddingLeft: `${10 + target.depth * 18}px` }"
              @click="chooseTarget(target.id)"
            >
              <Folder :size="16" class="target-icon" />
              <span class="target-name">{{ target.path }}</span>
              <span class="space-tag" :class="target.space">{{ spaceLabel(target.space) }}</span>
              <Check v-if="targetId === target.id" :size="15" class="target-check" />
            </button>
            <p v-if="!availableTargets.length" class="target-empty">暂无你有写入权的目标位置</p>
          </div>
          <p class="move-hint">仅显示你有写入权的位置；不能移入所选文件夹自身或其子文件夹。</p>
          <footer class="dialog-footer">
            <button class="button secondary" type="button" @click="emit('close')">取消</button>
            <button class="button primary" type="button" :disabled="!targetId" @click="goConfirm">下一步</button>
          </footer>
        </div>

        <!-- 第二步：确认信息 / 二次确认 -->
        <div v-else class="move-body">
          <div class="move-summary">
            <div class="summary-row"><span>本次移动</span><strong>{{ analysis.count }} 项</strong></div>
            <div class="summary-row"><span>目标位置</span><strong>{{ analysis.target?.path || '—' }}</strong></div>
            <div class="summary-row"><span>可见范围变化</span><strong>{{ analysis.visibilityChange }}</strong></div>
          </div>

          <div v-if="previewSelections.length" class="move-item-preview">
            <span v-for="item in previewSelections" :key="item.id" class="move-item-chip">{{ item.name }}</span>
            <span v-if="selections.length > previewSelections.length" class="move-item-chip more">等 {{ selections.length }} 项</span>
          </div>

          <div v-if="needsSecondConfirm" class="move-warning">
            <p class="warning-title"><AlertTriangle :size="16" />本次移动会改变可见范围，请二次确认</p>
            <ul>
              <li v-if="analysis.crossSpace">涉及跨「个人空间 ↔ 公共空间」的移动</li>
              <li v-if="analysis.independentCount">有 {{ analysis.independentCount }} 项原文件取消继承、单独设过可见范围</li>
            </ul>
            <fieldset class="policy-fieldset">
              <legend>可见范围处理方式</legend>
              <label>
                <input v-model="policy" type="radio" value="follow" />
                <span><strong>跟随目标（推荐）</strong><small>移动后继承目标位置的可见范围</small></span>
              </label>
              <label>
                <input v-model="policy" type="radio" value="keep" />
                <span><strong>保留原设置</strong><small>沿用各自原有的可见范围</small></span>
              </label>
            </fieldset>
            <label class="ack-row">
              <input v-model="acknowledged" type="checkbox" />
              <span>我已了解以上可见范围变化，确认继续</span>
            </label>
          </div>

          <div v-if="analysis.duplicateNames.length" class="duplicate-block">
            <p class="duplicate-title">目标位置已存在 {{ analysis.duplicateNames.length }} 个同名项，不会覆盖</p>
            <div class="duplicate-names">{{ analysis.duplicateNames.join('、') }}</div>
            <fieldset class="policy-fieldset">
              <legend>同名处理</legend>
              <label>
                <input v-model="duplicatePolicy" type="radio" value="rename" />
                <span><strong>自动添加序号（2）</strong><small>如「报告（2）.pdf」</small></span>
              </label>
              <label>
                <input v-model="duplicatePolicy" type="radio" value="skip" />
                <span><strong>跳过同名项</strong><small>该项留在原地并标记跳过</small></span>
              </label>
            </fieldset>
          </div>

          <footer class="dialog-footer">
            <button class="button secondary" type="button" @click="backToPick">上一步</button>
            <button class="button primary" type="button" :disabled="!canSubmit" @click="submit">确认移动</button>
          </footer>
        </div>
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
  width: min(520px, calc(100vw - 24px));
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
.move-body {
  padding: 0 24px 24px;
}
.move-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 500;
}
.move-section-title small {
  color: #888;
  font-size: 12px;
  font-weight: 400;
}
.target-list {
  max-height: 300px;
  overflow: auto;
  border: 1px solid #e7e9ed;
  border-radius: 9px;
  padding: 6px 0;
}
.target-row {
  display: flex;
  width: 100%;
  min-height: 38px;
  align-items: center;
  gap: 9px;
  border: 0;
  background: transparent;
  padding-right: 10px;
  color: #222;
  font: 13px/20px inherit;
  text-align: left;
  cursor: pointer;
}
.target-row:hover {
  background: #f6f7f8;
}
.target-row.is-active {
  background: #f0f5ff;
}
.target-icon {
  flex: none;
  color: #d89614;
}
.target-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.space-tag {
  flex: none;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  line-height: 18px;
}
.space-tag.public {
  background: #eaf3ff;
  color: #1677ff;
}
.space-tag.personal {
  background: #eef8f1;
  color: #2f8a5b;
}
.target-check {
  flex: none;
  color: #1677ff;
}
.target-empty {
  padding: 24px 12px;
  color: #999;
  font-size: 13px;
  text-align: center;
}
.move-hint {
  margin: 10px 0 0;
  color: #8a94a6;
  font-size: 12px;
  line-height: 18px;
}
.move-summary {
  border: 1px solid #eceef2;
  border-radius: 9px;
  background: #fafbfc;
  padding: 6px 14px;
}
.summary-row {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  font-size: 13px;
  line-height: 20px;
}
.summary-row + .summary-row {
  border-top: 1px solid #eceef2;
}
.summary-row > span {
  flex: 0 0 88px;
  color: #888;
}
.summary-row > strong {
  min-width: 0;
  flex: 1;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.move-item-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.move-item-chip {
  max-width: 180px;
  overflow: hidden;
  border-radius: 5px;
  background: #f2f3f5;
  padding: 2px 8px;
  color: #555;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.move-item-chip.more {
  background: transparent;
  color: #999;
}
.move-warning {
  margin-top: 16px;
  border: 1px solid #f4d9a6;
  border-radius: 9px;
  background: #fffaf0;
  padding: 12px 14px;
}
.warning-title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: #a8640a;
  font-size: 13px;
  font-weight: 600;
}
.move-warning ul {
  margin: 8px 0 0;
  padding-left: 20px;
  color: #7a622f;
  font-size: 12px;
  line-height: 20px;
}
.policy-fieldset {
  margin: 14px 0 0;
  padding: 0;
  border: 0;
}
.policy-fieldset legend {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
}
.policy-fieldset label {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 8px;
  cursor: pointer;
}
.policy-fieldset input[type='radio'] {
  margin-top: 3px;
  accent-color: #1677ff;
}
.policy-fieldset strong {
  display: block;
  font-size: 13px;
  font-weight: 500;
}
.policy-fieldset small {
  display: block;
  margin-top: 2px;
  color: #999;
  font-size: 11px;
}
.ack-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  color: #555;
  font-size: 12px;
  cursor: pointer;
}
.ack-row input {
  accent-color: #1677ff;
}
.duplicate-block {
  margin-top: 16px;
  border: 1px solid #e7e9ed;
  border-radius: 9px;
  padding: 12px 14px;
}
.duplicate-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
}
.duplicate-names {
  margin-top: 6px;
  color: #888;
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
.button {
  height: 34px;
  min-width: 72px;
  border-radius: 7px;
  padding: 0 16px;
  font-size: 14px;
  line-height: 32px;
  cursor: pointer;
}
.button.secondary {
  border: 1px solid #d9dce1;
  background: #fff;
  color: #4e5969;
}
.button.primary {
  border: 1px solid #111;
  background: #111;
  color: #fff;
}
.button.primary:hover {
  background: #292929;
}
.button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
