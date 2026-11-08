<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'

interface ReferenceMaterial {
  name: string
  uri: string
  type?: string
}

const props = defineProps<{
  initialData?: Record<string, any>
  initialName?: string
  submitting?: boolean
}>()
const emit = defineEmits<{
  submit: [payload: Record<string, any>, name: string]
  'update-name': [name: string]
  back: []
}>()

const name = ref(String(props.initialName ?? '').slice(0, 20))
const model = ref(String(props.initialData?.model ?? 'seedance-2.0-mini'))
const mode = ref(String(props.initialData?.mode ?? 'multimodal-reference'))
const description = ref(String(props.initialData?.description ?? ''))
const resolution = ref(String(props.initialData?.resolution ?? '480p'))
const ratio = ref(String(props.initialData?.ratio ?? '9:16'))
const duration = ref(Number(props.initialData?.duration ?? 5))
const generateAudio = ref(
  typeof props.initialData?.generateAudio === 'boolean' ? props.initialData.generateAudio : true,
)
const materials = ref<ReferenceMaterial[]>(
  (Array.isArray(props.initialData?.materials) ? props.initialData.materials : [])
    .filter((item: any) => typeof item?.name === 'string' && typeof item?.uri === 'string')
    .map((item: any) => ({ name: item.name, uri: item.uri, type: item.type })),
)
const error = ref('')
const canSubmit = computed(
  () => Boolean(name.value.trim() && description.value.trim()) && !props.submitting,
)

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsDataURL(file)
  })
}

async function addMaterials(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  error.value = ''
  for (const file of files) {
    if (materials.value.length >= 9) {
      error.value = '参考素材最多 9 个'
      break
    }
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      error.value = '仅支持图片或视频素材'
      continue
    }
    try {
      materials.value.push({ name: file.name, uri: await readFile(file), type: file.type })
    } catch {
      error.value = `${file.name} 读取失败，请重新选择`
    }
  }
  input.value = ''
}

function submit() {
  const taskName = name.value.trim()
  if (!taskName || taskName.length > 20) {
    error.value = '请输入 20 个字符以内的任务名称'
    return
  }
  if (!description.value.trim()) {
    error.value = '请输入视频描述'
    return
  }
  error.value = ''
  emit(
    'submit',
    {
      model: model.value,
      mode: mode.value,
      description: description.value.trim(),
      materials: materials.value.map((item) => ({ ...item })),
      resolution: resolution.value,
      ratio: ratio.value,
      duration: duration.value,
      generateAudio: generateAudio.value,
    },
    taskName,
  )
}
</script>

<template>
  <form class="video-generate-config" @submit.prevent="submit">
    <section class="config-section">
      <h2>任务信息</h2>
      <label class="field">
        <span>任务名称</span>
        <input
          v-model="name"
          aria-label="任务名称"
          maxlength="20"
          placeholder="请输入任务名称"
          @input="emit('update-name', name); error = ''"
        />
      </label>
    </section>

    <section class="config-section two-columns">
      <label class="field">
        <span>模型选择</span>
        <select v-model="model" aria-label="模型选择">
          <option value="seedance-2.0-mini">Seedance 2.0 Mini</option>
          <option value="seedance-2.0-fast">Seedance 2.0 Fast</option>
          <option value="seedance-2.0">Seedance 2.0</option>
        </select>
      </label>
      <label class="field">
        <span>生成模式</span>
        <select v-model="mode" aria-label="生成模式">
          <option value="multimodal-reference">多模态参考</option>
        </select>
      </label>
    </section>

    <section class="config-section">
      <div class="section-heading">
        <h2>视频描述</h2>
      </div>
      <textarea
        v-model="description"
        rows="6"
        maxlength="32000"
        aria-label="视频描述"
        placeholder="描述主体、动作、场景、镜头和画面风格"
        @input="error = ''"
      />
    </section>

    <section class="config-section">
      <div class="section-heading">
        <h2>参考素材</h2>
        <label class="import-button">
          <Plus :size="15" />从素材库导入
          <input type="file" accept="image/*,video/*" multiple @change="addMaterials" />
        </label>
      </div>
      <div v-if="materials.length" class="material-grid">
        <article v-for="(item, index) in materials" :key="`${item.name}-${index}`">
          <img v-if="item.type?.startsWith('image/')" :src="item.uri" alt="" />
          <div v-else class="video-placeholder">视频</div>
          <span>{{ item.name }}</span>
          <button type="button" :aria-label="`移除素材 ${index + 1}`" @click="materials.splice(index, 1)">
            <Trash2 :size="14" />
          </button>
        </article>
      </div>
      <label v-else class="material-empty">
        <Plus :size="18" />添加参考素材
        <input type="file" accept="image/*,video/*" multiple @change="addMaterials" />
      </label>
    </section>

    <section class="config-section">
      <h2>输出参数</h2>
      <div class="three-columns">
        <label class="field">
          <span>分辨率</span>
          <select v-model="resolution" aria-label="分辨率">
            <option value="480p">480P</option>
            <option value="720p">720P</option>
            <option value="1080p">1080P</option>
          </select>
        </label>
        <label class="field">
          <span>画面比例</span>
          <select v-model="ratio" aria-label="画面比例">
            <option value="9:16">9:16</option>
            <option value="16:9">16:9</option>
            <option value="1:1">1:1</option>
          </select>
        </label>
        <label class="field">
          <span>视频时长</span>
          <select v-model="duration" aria-label="视频时长">
            <option :value="5">5 秒</option>
            <option :value="10">10 秒</option>
          </select>
        </label>
      </div>
      <label class="audio-option">
        <span><strong>生成同步音频</strong></span>
        <input
          v-model="generateAudio"
          type="checkbox"
          role="switch"
          aria-label="生成同步音频"
        />
      </label>
    </section>

    <p v-if="error" role="alert" class="form-error">{{ error }}</p>
    <footer>
      <button type="button" @click="emit('back')">取消</button>
      <button class="primary" type="submit" :disabled="!canSubmit">开始生成</button>
    </footer>
  </form>
</template>

<style scoped>
.video-generate-config{box-sizing:border-box;display:flex;width:min(880px,100%);flex-direction:column;gap:28px;padding:0 0 28px;color:#18181b;font-size:14px}.config-section{display:flex;flex-direction:column;gap:14px}.config-section h2{margin:0;font-size:14px;font-weight:600}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.two-columns,.three-columns{display:grid}.two-columns{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.three-columns{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.field{display:flex;min-width:0;flex-direction:column;gap:8px}.field input,.field select,.video-generate-config textarea{box-sizing:border-box;width:100%;border:1px solid #e4e4e7;border-radius:7px;background:#fff;padding:9px 11px;outline:none;font:inherit}.field input,.field select{height:38px}.video-generate-config textarea{min-height:130px;resize:vertical;line-height:1.7}.field input:focus,.field select:focus,.video-generate-config textarea:focus{border-color:#a1a1aa;box-shadow:0 0 0 2px #18181b09}.import-button,.material-empty{display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer}.import-button{height:32px;border:1px solid #e4e4e7;border-radius:7px;padding:0 10px;font-size:12px}.import-button input,.material-empty input{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.material-empty{min-height:96px;border:1px dashed #d4d4d8;border-radius:8px;color:#71717a}.material-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.material-grid article{position:relative;display:grid;grid-template-columns:48px minmax(0,1fr) 28px;align-items:center;gap:10px;border:1px solid #e4e4e7;border-radius:8px;padding:9px}.material-grid img,.video-placeholder{width:48px;height:48px;border-radius:6px;object-fit:cover;background:#f4f4f5}.video-placeholder{display:grid;place-items:center;color:#71717a;font-size:11px}.material-grid span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.material-grid button{display:grid;width:28px;height:28px;place-items:center;border:0;border-radius:5px;background:transparent;color:#71717a;cursor:pointer}.audio-option{display:flex;min-height:52px;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e4e4e7;border-radius:8px;padding:0 14px}.audio-option strong{font-weight:500}.audio-option input{position:relative;width:36px;height:20px;appearance:none;border-radius:999px;background:#d4d4d8;cursor:pointer}.audio-option input::after{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0003;content:'';transition:transform .16s}.audio-option input:checked{background:#18181b}.audio-option input:checked::after{transform:translateX(16px)}.form-error{margin:0;color:#dc2626;font-size:12px}.video-generate-config footer{display:flex;justify-content:flex-end;gap:10px}.video-generate-config footer button{height:36px;min-width:82px;border:1px solid #e4e4e7;border-radius:7px;background:#fff;font:inherit;cursor:pointer}.video-generate-config footer .primary{border-color:#18181b;background:#18181b;color:#fff}.video-generate-config footer button:disabled{cursor:not-allowed;opacity:.45}@media(max-width:760px){.two-columns,.three-columns,.material-grid{grid-template-columns:1fr}}
</style>
