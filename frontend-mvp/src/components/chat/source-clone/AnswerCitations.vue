<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  ArrowUpLeft,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe2,
  List,
  LoaderCircle,
  RefreshCw,
  X,
} from 'lucide-vue-next';
import {
  safeCitationUrl,
  type CitedParagraph,
  type CitationFragment,
  type CitationPreviewLoader,
  type CitationSource,
} from '@/types/citation';

const props = defineProps<{
  answerId: string;
  paragraphs: CitedParagraph[];
  sources: CitationSource[];
  loadPreview?: CitationPreviewLoader;
  demo?: boolean;
  streaming?: boolean;
}>();
const emit = defineEmits<{ 'panel-change': [open: boolean] }>();
// Reserve identifiers in stream order, independently of metadata arrival.
const sourceNumbers = ref(new Map<string, number>());
watch(() => [props.answerId, props.paragraphs] as const, ([answerId], previous) => {
  if (previous && answerId !== previous[0]) sourceNumbers.value = new Map();
  for (const paragraph of props.paragraphs) for (const citation of paragraph.citations) {
    if (!sourceNumbers.value.has(citation.sourceId)) sourceNumbers.value.set(citation.sourceId, sourceNumbers.value.size + 1);
  }
}, { immediate: true, deep: true });
const entries = computed(() => {
  const result: { source: CitationSource; number: number; anchor: string; fragmentId?: string }[] =
    [];
  props.paragraphs.forEach((paragraph, p) =>
    paragraph.citations.forEach((citation, c) => {
      const source = props.sources.find((item) => item.id === citation.sourceId);
      if (source && !result.some((item) => item.source.id === source.id))
        result.push({
          source,
          number: sourceNumbers.value.get(source.id)!,
          anchor: `${props.answerId}-cite-${p}-${c}`,
          fragmentId: citation.fragmentId,
        });
    }),
  );
  return result;
});
const entryFor = (id: string) => entries.value.find((entry) => entry.source.id === id);
const unresolvedCount = computed(() => new Set(props.paragraphs.flatMap(paragraph =>
  paragraph.citations.filter(citation => !entryFor(citation.sourceId)).map(citation => citation.sourceId),
)).size);
const expanded = ref(false);
const open = ref(false);
const activeId = ref('');
const activeFragment = ref('');
const activeAnchor = ref('');
const panelTab = ref<'preview' | 'all'>('preview');
const filter = ref<'all' | 'knowledge' | 'web'>('all');
const previewStatus = ref<'loading' | 'ready' | 'error'>('ready');
const fragments = ref<CitationFragment[]>([]);
const panelHeading = ref<HTMLElement | null>(null);
let returnFocus: HTMLElement | null = null;
let requestVersion = 0;
const active = computed(() => entryFor(activeId.value));
const activeIndex = computed(() =>
  entries.value.findIndex((entry) => entry.source.id === activeId.value),
);
const filtered = computed(() =>
  entries.value.filter((entry) => filter.value === 'all' || entry.source.type === filter.value),
);
const visible = computed(() => (expanded.value ? entries.value : entries.value.slice(0, 3)));
const canRead = computed(() => active.value?.source.access === 'allowed');
const originalUrl = computed(() => (active.value ? safeCitationUrl(active.value.source) : ''));
const counts = computed(() => ({
  knowledge: entries.value.filter((e) => e.source.type === 'knowledge').length,
  web: entries.value.filter((e) => e.source.type === 'web').length,
}));
const selectedText = computed(
  () =>
    props.paragraphs.find((p, index) =>
      p.citations.some(
        (c, offset) => `${props.answerId}-cite-${index}-${offset}` === activeAnchor.value,
      ),
    )?.text ?? '',
);
const sourceTitle = (source: CitationSource) =>
  source.title?.trim() || (source.type === 'web' ? (safeCitationUrl(source) ? new URL(safeCitationUrl(source)).hostname : '未提供标题的网页') : '未命名知识文件');
function sourceOrigin(source: CitationSource) {
  if (source.origin?.trim()) return source.origin.trim();
  const url = safeCitationUrl(source);
  if (source.type === 'web' && url) return new URL(url).hostname;
  return source.type === 'web' ? '站点未提供' : '知识库位置未提供';
}

async function load() {
  const source = active.value?.source;
  const request = ++requestVersion;
  fragments.value = [];
  // Web sources are metadata cards; they never request a webpage-body preview.
  if (!source || source.access !== 'allowed' || source.type === 'web') {
    previewStatus.value = 'ready';
    return;
  }
  previewStatus.value = 'loading';
  try {
    const content = await (props.loadPreview
      ? props.loadPreview(source)
      : Promise.resolve(source.fragments));
    if (request !== requestVersion || !open.value || activeId.value !== source.id || !canRead.value)
      return;
    fragments.value = content;
    previewStatus.value = content.length ? 'ready' : 'error';
    await nextTick();
    document
      .getElementById(`${props.answerId}-fragment-${activeFragment.value}`)
      ?.scrollIntoView?.({ block: 'nearest' });
  } catch {
    if (request === requestVersion && open.value) previewStatus.value = 'error';
  }
}
function selectSource(id: string, fragmentId?: string, anchor?: string, event?: Event) {
  const entry = entryFor(id);
  if (!entry) return;
  if (event?.currentTarget instanceof HTMLElement) returnFocus = event.currentTarget;
  activeId.value = id;
  activeFragment.value = entry.source.type === 'knowledge' ? fragmentId ?? entry.fragmentId ?? '' : '';
  activeAnchor.value = anchor ?? entry.anchor;
  panelTab.value = 'preview';
  open.value = true;
  window.dispatchEvent(new CustomEvent('tianma:open-citation', { detail: props.answerId }));
  emit('panel-change', true);
  nextTick(() => panelHeading.value?.focus({ preventScroll: true }));
  void load();
}
function openList(event: Event) {
  if (!entries.value.length) return;
  selectSource(active.value?.source.id || entries.value[0]!.source.id, undefined, undefined, event);
  filter.value = 'all';
  panelTab.value = 'all';
}
function closePanel(restore = true) {
  open.value = false;
  requestVersion++;
  fragments.value = [];
  emit('panel-change', false);
  if (restore)
    nextTick(() => returnFocus?.isConnected && returnFocus.focus({ preventScroll: true }));
}
function backToReference() {
  const anchor = document.getElementById(activeAnchor.value);
  anchor?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  anchor?.focus({ preventScroll: true });
  if (window.innerWidth < 1100) closePanel(false);
}
function move(step: number) {
  const next = entries.value[activeIndex.value + step];
  if (next) selectSource(next.source.id);
}
function onKey(event: KeyboardEvent) {
  if (open.value && event.key === 'Escape') {
    event.preventDefault();
    closePanel();
  }
}
function onOtherPanel(event: Event) {
  if ((event as CustomEvent).detail !== props.answerId && open.value) closePanel(false);
}
watch(
  () => props.answerId,
  () => {
    closePanel(false);
    activeId.value = '';
    expanded.value = false;
    filter.value = 'all';
  },
);
watch(() => active.value?.source, (source, previous) => {
  if (!source) {
    if (open.value) closePanel(false);
    activeId.value = '';
    activeFragment.value = '';
    activeAnchor.value = '';
  } else if (source.access !== 'allowed') {
    requestVersion++;
    fragments.value = [];
    previewStatus.value = 'ready';
  } else if (open.value && source.id === previous?.id) {
    // Late metadata for the selected snapshot must refresh the visible excerpts.
    void load();
  }
}, { deep: true });
onMounted(() => {
  window.addEventListener('keydown', onKey);
  window.addEventListener('tianma:open-citation', onOtherPanel);
});
onBeforeUnmount(() => {
  requestVersion++;
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('tianma:open-citation', onOtherPanel);
  emit('panel-change', false);
});
defineExpose({ closePanel });
</script>

<template>
  <section class="cited-answer">
    <p v-if="demo" class="citation-demo">引用交互示例 · 知识内容、网页摘要与时间为演示数据</p>
    <div
      v-for="(paragraph, p) in paragraphs"
      :key="p"
      :id="`${answerId}-paragraph-${p}`"
      class="cited-paragraph"
    >
      <h2 v-if="paragraph.heading">{{ paragraph.heading }}</h2>
      <p>
        {{ paragraph.text
        }}<template v-for="(citation, c) in paragraph.citations" :key="`${citation.sourceId}-${c}`"
          ><button
            v-if="entryFor(citation.sourceId)"
            :id="`${answerId}-cite-${p}-${c}`"
            type="button"
            class="inline-citation"
            :class="{ selected: open && activeAnchor === `${answerId}-cite-${p}-${c}` }"
            :data-citation-number="entryFor(citation.sourceId)!.number"
            :title="`${entryFor(citation.sourceId)!.source.type === 'web' ? '网页' : '知识库'} · ${sourceTitle(entryFor(citation.sourceId)!.source)}`"
            :aria-label="`查看引用 ${entryFor(citation.sourceId)!.number}：${sourceTitle(entryFor(citation.sourceId)!.source)}`"
            @click="
              selectSource(
                citation.sourceId,
                citation.fragmentId,
                `${answerId}-cite-${p}-${c}`,
                $event,
              )
            "
          >
            {{ entryFor(citation.sourceId)!.number }}</button
          ><span v-else class="missing-reference" role="status">［{{ sourceNumbers.get(citation.sourceId) }}］{{ streaming ? '引用准备中' : '来源信息暂不可用' }}</span></template
        >
      </p>
    </div>
    <slot />
    <p v-if="unresolvedCount > 0" class="missing-reference">另有 {{ unresolvedCount }} 项来源{{ streaming ? '准备中' : '信息暂不可用' }}，其他编号保持不变。</p>
    <section v-if="entries.length" class="answer-sources" aria-label="回答引用来源">
      <header>
        <div>
          <strong
            >引用来源 <span>{{ entries.length }}</span></strong
          ><small>知识库 {{ counts.knowledge }} · 网页 {{ counts.web }}</small>
        </div>
        <button type="button" @click="openList"><List :size="14" />全部来源</button>
      </header>
      <button
        v-for="entry in visible"
        :key="entry.source.id"
        type="button"
        class="source-card"
        :class="{ active: open && activeId === entry.source.id }"
        :data-source-card="entry.number"
        :title="sourceTitle(entry.source)"
        @click="selectSource(entry.source.id, undefined, undefined, $event)"
      >
        <span class="source-number">{{ entry.number }}</span
        ><span class="source-card-copy"
          ><strong>{{ sourceTitle(entry.source) }}</strong
          ><small
            ><component :is="entry.source.type === 'web' ? Globe2 : BookOpen" :size="12" />{{
              entry.source.type === 'web' ? '网页' : '知识库'
            }}<template v-if="entry.source.access === 'allowed'">
              · {{ sourceOrigin(entry.source) }}</template
            ><em v-if="entry.source.access !== 'allowed'">{{
              entry.source.access === 'forbidden' ? '无权访问' : '已失效'
            }}</em
            ><em v-else-if="entry.source.type === 'knowledge' && entry.source.offline">离线快照</em></small
          ><span v-if="entry.source.type === 'web' && entry.source.access === 'allowed'" class="web-source-teaser"
            ><span>{{ entry.source.publishedAt?.trim() || '发布时间未提供' }}</span
            ><span>{{ entry.source.summary?.trim() || '摘要未提供' }}</span></span
          ></span
        ><ChevronRight :size="15" />
      </button>
      <button
        v-if="entries.length > 3"
        type="button"
        class="source-expand"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        {{ expanded ? '收起来源' : `展开全部 ${entries.length} 项来源`
        }}<ChevronDown :size="14" :class="{ rotated: expanded }" />
      </button>
    </section>
    <Teleport to="body">
      <aside
        v-if="open && active"
        class="citation-preview"
        data-testid="citation-preview"
        aria-label="引用来源预览"
      >
        <header class="preview-header">
          <div ref="panelHeading" tabindex="-1">
            <BookOpen :size="17" /><strong>引用来源</strong
            ><span>编号 {{ active.number }}</span>
          </div>
          <button type="button" aria-label="关闭引用预览" @click="closePanel()">
            <X :size="18" />
          </button>
        </header>
        <nav class="preview-tabs" aria-label="来源视图">
          <button
            type="button"
            :class="{ active: panelTab === 'preview' }"
            @click="panelTab = 'preview'"
          >
            {{ active.source.type === 'web' ? '来源信息' : '内容预览' }}</button
          ><button type="button" :class="{ active: panelTab === 'all' }" @click="panelTab = 'all'">
            全部来源 {{ entries.length }}
          </button>
        </nav>
        <div v-if="panelTab === 'all'" class="preview-scroll">
          <div class="source-filters" aria-label="来源类型">
            <button
              v-for="(name, key) in { all: '全部', knowledge: '知识库', web: '网页' }"
              :key="key"
              type="button"
              :aria-pressed="filter === key"
              @click="filter = key"
            >
              {{ name }}
            </button>
          </div>
          <button
            v-for="entry in filtered"
            :key="entry.source.id"
            type="button"
            class="source-card"
            :data-panel-source="entry.number"
            @click="selectSource(entry.source.id)"
          >
            <span class="source-number">{{ entry.number }}</span
            ><span class="source-card-copy"
              ><strong>{{ sourceTitle(entry.source) }}</strong
              ><small>{{
                entry.source.access === 'allowed' ? sourceOrigin(entry.source) : '当前不可访问'
              }}</small></span
            ><ChevronRight :size="14" />
          </button>
          <p v-if="!filtered.length" class="preview-muted">此回复没有使用这类来源。</p>
        </div>
        <div v-else class="preview-scroll" aria-live="polite">
          <div class="source-identity" :class="{ 'web-source-identity': active.source.type === 'web' && canRead }">
            <span class="source-kind"
              ><component :is="active.source.type === 'web' ? Globe2 : FileText" :size="14" />{{
                active.source.type === 'web' ? '网页来源' : '知识库文件'
              }}</span
            >
            <h2>{{ sourceTitle(active.source) }}</h2>
            <p v-if="canRead">{{ sourceOrigin(active.source) }}</p>
            <dl v-if="canRead">
              <template v-if="active.source.type === 'knowledge' && active.source.version"
                ><dt>引用版本</dt>
                <dd>{{ active.source.version }}</dd></template
              ><template v-if="active.source.type === 'web'"
                ><dt>发布时间</dt>
                <dd>{{ active.source.publishedAt?.trim() || '未提供' }}</dd></template
              >
              <dt>{{ active.source.type === 'web' ? '收录时间' : '同步时间' }}</dt>
              <dd>{{ active.source.capturedAt?.trim() || '未提供' }}</dd>
            </dl>
            <section v-if="canRead && active.source.type === 'web'" class="web-source-summary">
              <h3>网页摘要</h3>
              <p>{{ active.source.summary?.trim() || '该网页未提供摘要。' }}</p>
            </section>
          </div>
          <div v-if="!canRead" class="preview-state restricted">
            <BookOpen :size="28" />
            <h3>
              {{ active.source.access === 'forbidden' ? '当前无权查看该来源' : '该来源已失效' }}
            </h3>
            <p>保留历史引用编号，正文和原文入口已隐藏。</p>
          </div>
          <template v-else-if="active.source.type === 'knowledge'">
            <p v-if="active.source.offline" class="snapshot-notice">
              当前为离线快照，内容截至最后同步时间。
            </p>
            <div v-if="previewStatus === 'loading'" class="preview-state">
              <LoaderCircle class="spin" :size="24" />
              <p>正在加载引用片段…</p>
            </div>
            <div
              v-else-if="previewStatus === 'error'"
              class="preview-state"
              data-testid="preview-error"
            >
              <FileText :size="28" />
              <h3>暂时无法预览原文片段</h3>
              <p>可重试{{ originalUrl ? '，或打开原文件核对' : '' }}。这不会改变原回答。</p>
              <button type="button" @click="load"><RefreshCw :size="14" />重新加载</button>
            </div>
            <div v-else class="source-excerpts">
              <h3>
                引用片段 <small>{{ fragments.length }}</small>
              </h3>
              <p
                v-if="
                  activeFragment && !fragments.some((fragment) => fragment.id === activeFragment)
                "
                class="snapshot-notice"
              >
                暂未定位到原段落，以下为可用引用片段。
              </p>
              <section
                v-for="fragment in fragments"
                :id="`${answerId}-fragment-${fragment.id}`"
                :key="fragment.id"
                :class="{ 'matched-fragment': fragment.id === activeFragment }"
              >
                <header>
                  <span>{{ fragment.location }}</span
                  ><small v-if="fragment.id === activeFragment">当前引用</small>
                </header>
                <mark v-if="fragment.id === activeFragment">{{ fragment.text }}</mark>
                <p v-else>{{ fragment.text }}</p>
              </section>
            </div>
          </template>
          <section class="answer-context">
            <h3>对应回答</h3>
            <p>{{ selectedText }}</p>
            <button type="button" @click="backToReference">
              <ArrowUpLeft :size="14" />返回引用处
            </button>
          </section>
        </div>
        <footer class="preview-footer">
          <div>
            <button
              type="button"
              :disabled="activeIndex <= 0"
              aria-label="上一来源"
              @click="move(-1)"
            >
              <ChevronLeft :size="16" /></button
            ><button
              type="button"
              :disabled="activeIndex >= entries.length - 1"
              aria-label="下一来源"
              @click="move(1)"
            >
              <ChevronRight :size="16" />
            </button>
          </div>
          <a v-if="originalUrl" :href="originalUrl" target="_blank" rel="noopener noreferrer"
            >{{ active.source.type === 'web' ? '打开原网页' : '打开原文件'
            }}<ExternalLink :size="14" /></a
          ><span v-else class="preview-muted">{{ canRead ? '暂无原文链接' : '原文不可访问' }}</span>
        </footer>
      </aside>
    </Teleport>
  </section>
</template>

<style scoped>
.cited-answer {
  color: #293440;
  font-size: 14px;
  line-height: 1.9;
}
.citation-demo {
  font-size: 11px;
  color: #8b95a3;
  margin: 0 0 18px;
}
.cited-paragraph h2 {
  font-size: 17px;
  font-weight: 600;
  margin: 22px 0 8px;
}
.cited-paragraph p {
  margin: 8px 0 14px;
}
.inline-citation {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  margin-left: 5px;
  vertical-align: super;
  border: 0;
  border-radius: 6px;
  background: #eef2f6;
  color: #54708c;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}
.inline-citation:hover,
.inline-citation.selected {
  background: #e5efff;
  color: #1762c4;
}
.inline-citation:focus-visible,
.source-card:focus-visible {
  outline: 2px solid #6a9df0;
  outline-offset: 2px;
}
.missing-reference {
  font-size: 12px;
  color: #84909f;
}
.answer-sources {
  margin: 26px 0 18px;
  border-top: 1px solid #edf0f4;
  padding-top: 16px;
}
.answer-sources > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.answer-sources > header strong {
  font-size: 13px;
}
.answer-sources > header strong span {
  padding: 2px 6px;
  background: #f0f3f7;
  border-radius: 5px;
  margin-left: 4px;
  color: #687888;
}
.answer-sources > header small {
  display: block;
  color: #8a95a3;
  font-size: 11px;
  margin-top: 3px;
}
.answer-sources > header button,
.source-expand {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: #657689;
  font-size: 12px;
  cursor: pointer;
}
.source-card {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 10px;
  border: 1px solid #e9edf2;
  background: #fff;
  border-radius: 9px;
  padding: 11px 12px;
  text-align: left;
  margin: 7px 0;
  cursor: pointer;
  color: #637487;
}
.source-card:hover,
.source-card.active {
  background: #f7faff;
  border-color: #cfdff5;
}
.source-number {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 11px;
  width: 23px;
  height: 25px;
  border-radius: 5px;
  background: #f0f3f7;
  color: #62738a;
}
.source-card-copy {
  min-width: 0;
  flex: 1;
}
.source-card-copy strong {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 500;
  color: #2e3a48;
}
.source-card-copy small {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #8793a2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 3px;
}
.source-card-copy em {
  font-style: normal;
  color: #ad7e35;
  flex-shrink: 0;
  margin-left: 4px;
}
.source-expand {
  margin: 10px auto 0;
}
.rotated {
  transform: rotate(180deg);
}
.citation-preview {
  position: fixed;
  z-index: 180;
  top: 57px;
  right: 8px;
  bottom: 8px;
  width: 420px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e5eaf0;
  border-radius: 10px;
  box-shadow: -5px 0 20px #16334f08;
  box-sizing: border-box;
  color: #2c3b4d;
  font:
    13px/1.7 system-ui,
    -apple-system,
    'Microsoft YaHei',
    sans-serif;
}
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 17px 20px 13px;
  flex-shrink: 0;
}
.preview-header > div {
  display: flex;
  align-items: center;
  gap: 8px;
  outline: none;
}
.preview-header strong {
  font-size: 15px;
}
.preview-header span {
  font-size: 11px;
  color: #8a97a5;
  margin-left: 8px;
}
.preview-header button,
.preview-footer button {
  display: grid;
  place-items: center;
  border: 0;
  background: #f6f8fb;
  border-radius: 7px;
  padding: 6px;
  color: #778696;
  cursor: pointer;
}
.preview-tabs {
  display: flex;
  gap: 23px;
  padding: 0 20px;
  border-bottom: 1px solid #e8edf3;
  flex-shrink: 0;
}
.preview-tabs button {
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 10px 0;
  color: #87919e;
  font-size: 12px;
  cursor: pointer;
}
.preview-tabs button.active {
  color: #216bc8;
  border-bottom-color: #216bc8;
}
.preview-scroll {
  overflow: auto;
  min-height: 0;
  flex: 1;
  padding: 20px;
}
.source-kind {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #f0f5fb;
  border-radius: 5px;
  padding: 3px 7px;
  font-size: 11px;
  color: #63809d;
}
.source-identity h2 {
  font-size: 18px;
  line-height: 1.55;
  margin: 13px 0 7px;
  color: #243243;
}
.source-identity > p {
  color: #8492a2;
  font-size: 11px;
  margin: 0;
  overflow-wrap: anywhere;
}
.source-identity dl {
  display: grid;
  grid-template-columns: 62px 1fr;
  gap: 5px 13px;
  font-size: 11px;
  margin: 14px 0 20px;
}
.source-identity dt {
  color: #94a0ad;
}
.source-identity dd {
  margin: 0;
  color: #6d7d90;
}
.snapshot-note {
  font-size: 11px;
  color: #8591a1;
  line-height: 1.7;
  border-top: 1px solid #edf1f5;
  padding-top: 15px;
}
.snapshot-notice {
  font-size: 11px;
  color: #967b44;
  background: #fbf8f0;
  padding: 9px 10px;
  border-radius: 6px;
}
.source-excerpts > h3,
.answer-context h3 {
  font-size: 12px;
  font-weight: 600;
  color: #738196;
  margin: 22px 0 12px;
}
.source-excerpts > h3 small {
  color: #9aa5b2;
  margin-left: 5px;
}
.source-excerpts > section {
  border: 1px solid #e7ecf3;
  border-radius: 8px;
  margin: 10px 0;
  padding: 13px;
}
.source-excerpts > section.matched-fragment {
  border-color: #bfd5f2;
  background: #f6faff;
}
.source-excerpts header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 10px;
  color: #8a98a9;
  margin-bottom: 9px;
}
.source-excerpts header small {
  color: #3878c9;
  flex-shrink: 0;
}
.source-excerpts mark {
  background: #e5efff;
  color: #304e71;
  padding: 1px 0;
  font-size: 13px;
  line-height: 1.95;
}
.source-excerpts section p {
  font-size: 12px;
  color: #788a9b;
  margin: 0;
  white-space: pre-wrap;
}
.answer-context {
  margin-top: 28px;
  border-top: 1px solid #edf0f4;
}
.answer-context p {
  border-left: 2px solid #dfe7f0;
  padding-left: 12px;
  color: #7a8897;
  font-size: 12px;
}
.answer-context button {
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 0;
  padding: 0;
  color: #4078ba;
  font-size: 12px;
  cursor: pointer;
}
.preview-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 1px solid #e8edf3;
  background: #fff;
  border-radius: 0 0 10px 10px;
  flex-shrink: 0;
}
.preview-footer > div {
  display: flex;
  gap: 7px;
}
.preview-footer button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.preview-footer a {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #2871cc;
  text-decoration: none;
  font-size: 12px;
}
.preview-muted {
  color: #929eab;
  font-size: 12px;
}
.preview-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 12px;
  text-align: center;
  color: #9aa7b4;
}
.preview-state h3 {
  font-size: 14px;
  color: #53677b;
  margin: 14px 0 3px;
}
.preview-state p {
  font-size: 12px;
  line-height: 1.8;
}
.preview-state button {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 1px solid #d5dfec;
  background: #fff;
  border-radius: 7px;
  padding: 7px 12px;
  color: #4975aa;
  cursor: pointer;
}
.source-filters {
  display: flex;
  gap: 7px;
  margin-bottom: 18px;
}
.source-filters button {
  border: 0;
  background: #f5f7fa;
  padding: 6px 12px;
  border-radius: 6px;
  color: #7b8b9d;
  font-size: 12px;
  cursor: pointer;
}
.source-filters button[aria-pressed='true'] {
  background: #eaf2ff;
  color: #2871cc;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 1099px) {
  .citation-preview {
    width: min(420px, calc(100vw - 16px));
    box-shadow: -10px 0 36px #20375420;
  }
}
</style>

