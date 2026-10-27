<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { ChevronRight, Upload, X } from 'lucide-vue-next'
import { demoMaterialImage, MATERIAL_TYPES, type MaterialImage, type MaterialInput, type MaterialTask, type MaterialType } from './useMaterialTasks'

const props = defineProps<{ task?: MaterialTask | null; initialName?: string }>()
const emit = defineEmits<{ submit: [input: MaterialInput]; cancel: []; square: [] }>()
interface UploadImage extends MaterialImage { previewUrl?: string }
const materialType = ref<MaterialType>(props.task?.materialType ?? 'MODEL')
const name = ref(props.task?.materialName ?? props.initialName ?? '')
const goodsNo = ref(props.task?.goodsNo ?? '')
const images = ref<UploadImage[]>(props.task?.images.map((image) => ({ ...image })) ?? [])
const notice = ref('')
const reading = ref(false)
const dragging = ref(false)
let disposed = false
const readers = new Set<FileReader>()
const objectUrls = new Set<string>()
const placeholders = { MODEL: '请输入素材名称，如：亚洲薄肌青年男性', PRODUCT: '请输入素材名称，如：JH6206阿迪达斯男跑步鞋', SCENE: '请输入素材名称，如：湖边栏杆和远山水面' }
const valid = computed(() => !!name.value.trim() && name.value.trim().length <= 20 && !reading.value && (images.value.length > 0 || materialType.value === 'PRODUCT' && !!goodsNo.value.trim()))

function releaseImage(image: UploadImage) {
  if (image.previewUrl && objectUrls.has(image.previewUrl)) {
    URL.revokeObjectURL(image.previewUrl)
    objectUrls.delete(image.previewUrl)
  }
}
function removeImage(index: number) {
  const [image] = images.value.splice(index, 1)
  if (image) releaseImage(image)
}
function changeType(type: MaterialType) {
  if (type === materialType.value) return
  images.value.forEach(releaseImage)
  materialType.value = type
  name.value = ''
  goodsNo.value = ''
  images.value = []
  notice.value = ''
}
async function addFiles(files: FileList | File[] | null) {
  if (!files?.length || reading.value) return
  notice.value = ''
  const accepted: File[] = []
  for (const file of Array.from(files)) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) notice.value = '仅支持 JPG / JPEG / PNG / WEBP 格式'
    else if (file.size > 10 * 1024 * 1024) notice.value = '单个图片大小不能超过 10MB'
    else accepted.push(file)
  }
  reading.value = true
  const uploadType = materialType.value
  for (const file of accepted) {
    if (disposed) break
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        readers.add(reader)
        reader.onload = () => { readers.delete(reader); resolve(String(reader.result)) }
        reader.onerror = () => { readers.delete(reader); reject(new Error('read')) }
        reader.onabort = () => { readers.delete(reader); reject(new Error('aborted')) }
        reader.readAsDataURL(file)
      })
      if (disposed || materialType.value !== uploadType) continue
      let previewUrl: string | undefined
      if (typeof URL.createObjectURL === 'function') {
        previewUrl = URL.createObjectURL(file)
        objectUrls.add(previewUrl)
      }
      images.value.push({ name: file.name.replace(/\.[^.]+$/, ''), url: dataUrl, previewUrl })
    } catch {
      if (!disposed) notice.value = '图片读取失败，请重试'
    }
  }
  if (!disposed) reading.value = false
}
function uploadChanged(event: Event) {
  const input = event.target as HTMLInputElement
  void addFiles(input.files)
  input.value = ''
}
function pullDemo() {
  if (!goodsNo.value.trim()) return
  images.value.forEach(releaseImage)
  images.value = [{ name: `商品图 ${goodsNo.value.trim()}`, url: demoMaterialImage('PRODUCT', goodsNo.value.trim()) }]
  notice.value = '已载入商品图片占位示例（原型演示）'
}
function submit() {
  if (!valid.value) return
  emit('submit', { materialType: materialType.value, materialName: name.value.trim(), goodsNo: goodsNo.value.trim(), images: images.value.map(({ name, url }) => ({ name, url })) })
}
onBeforeUnmount(() => {
  disposed = true
  readers.forEach((reader) => reader.abort())
  objectUrls.forEach((url) => URL.revokeObjectURL(url))
})
</script>

<template>
  <div class="extraction-form">
    <nav class="breadcrumb" aria-label="面包屑">
      <button type="button" @click="emit('square')">能力广场</button><ChevronRight :size="12" />
      <button type="button" @click="emit('cancel')">素材提取列表</button><ChevronRight :size="12" />
      <span>{{ task ? '重新编辑提取任务' : '新增素材提取任务' }}</span>
    </nav>
    <div class="type-tabs" role="tablist" aria-label="素材类型">
      <button v-for="type in MATERIAL_TYPES" :key="type.value" type="button" role="tab" :data-type="type.value" :aria-selected="materialType === type.value" :class="{ active: materialType === type.value }" @click="changeType(type.value)">{{ type.label }}</button>
    </div>
    <form class="form-fields" @submit.prevent="submit">
      <label class="field"> <span>素材名称<span class="required">*</span></span>
        <input v-model="name" data-testid="extract-name-input" maxlength="20" autocomplete="off" :placeholder="placeholders[materialType]" aria-label="素材名称" class="name-input" />
      </label>
      <div class="field">
        <template v-if="materialType === 'PRODUCT'">
          <label for="extract-goods-code">方式一：输入商品货号自动拉取</label>
          <div class="goods-code"><input id="extract-goods-code" v-model="goodsNo" data-testid="extract-item-code-input" placeholder="请输入商品货号" @keydown.enter.prevent="pullDemo" /><button type="button" class="dark" :disabled="!goodsNo.trim()" @click="pullDemo">拉取</button></div>
          <div class="or">或</div><span>方式二：手动上传商品图</span>
        </template>
        <span v-else>上传图片</span>
        <div class="dropzone" :class="{ dragging }" @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="dragging = false; addFiles($event.dataTransfer?.files ?? null)">
          <Upload :size="44" :stroke-width="1" />
          <strong>{{ reading ? '读取中...' : materialType === 'PRODUCT' ? '拖拽或点击上传商品图片' : '拖拽或点击上传图片' }}</strong>
          <span>支持 JPG / JPEG / PNG / WEBP，不超过 10MB</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="上传图片" data-testid="extract-file-input" :disabled="reading" @change="uploadChanged" />
        </div>
        <div v-if="images.length" class="source-images" data-testid="extract-image-list">
          <div v-for="(image, index) in images" :key="image.url + index" class="source-item" data-testid="source-image">
            <div class="source-frame"><img :src="image.previewUrl || image.url" :alt="`源图 ${index + 1}`" /><button type="button" :aria-label="`移除源图 ${index + 1}`" @click="removeImage(index)"><X :size="12" /></button></div>
            <span :title="image.name">{{ image.name }}</span>
          </div>
        </div>
        <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      </div>
      <div class="form-footer"><span class="demo-note">原型演示 · 提取结果仅供交互体验</span><button type="submit" class="dark" data-testid="extract-submit" :disabled="!valid">提交提炼任务</button></div>
    </form>
  </div>
</template>

<style scoped>
.extraction-form{height:100%;overflow-y:auto;padding:24px 24px 32px 32px;box-sizing:border-box;color:#111;font-size:14px}.breadcrumb{display:flex;align-items:center;gap:4px;height:22px;color:#999;margin-bottom:24px}.breadcrumb button{border:0;padding:0;background:none;color:#999;cursor:pointer}.breadcrumb span{color:#111;font-weight:500}.type-tabs{display:flex;gap:32px;border-bottom:1px solid #eaeaea;margin-bottom:24px}.type-tabs button{position:relative;height:40px;padding:0 2px;border:0;background:none;color:#666;cursor:pointer}.type-tabs button.active{color:#111;font-weight:500}.type-tabs button.active:after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;border-radius:2px;background:#111}.form-fields{display:flex;flex-direction:column;gap:24px}.field{display:flex;flex-direction:column;gap:8px}.required{color:#e14f4f;margin-left:2px}input:not([type=file]){height:32px;padding:5px 12px;border:1px solid #dce0e5;border-radius:6px;background:#fff;font:inherit;color:#111;box-sizing:border-box;outline:none}input:not([type=file]):focus{border-color:#111}input::placeholder{color:#b7b7b7}.name-input{width:400px;max-width:100%}.goods-code{display:flex;gap:8px}.goods-code input{width:288px;max-width:calc(100% - 88px)}.goods-code button{width:80px}.dark{height:32px;border:0;border-radius:6px;padding:5px 16px;background:#111;color:#fff;font:inherit;cursor:pointer}.dark:disabled{opacity:.35;cursor:not-allowed}.or{display:flex;align-items:center;gap:16px;color:#999;font-size:12px;margin:8px 0}.or:before,.or:after{content:'';flex:1;height:1px;background:#eaeaea}.dropzone{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:32px;border:1px dashed #dce0e5;border-radius:6px;cursor:pointer;background:#fff}.dropzone:hover,.dropzone.dragging{border-color:#111;background:#fafafa}.dropzone svg{margin-bottom:8px}.dropzone strong{font-weight:500}.dropzone>span{color:#999;font-size:12px}.dropzone input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}.source-images{display:flex;flex-wrap:wrap;gap:8px}.source-item{display:flex;flex-direction:column;gap:4px;width:96px}.source-frame{position:relative;height:96px;border-radius:6px;overflow:hidden;background:#f6f6f6}.source-frame img{width:100%;height:100%;object-fit:cover}.source-frame button{position:absolute;right:4px;top:4px;display:flex;align-items:center;justify-content:center;width:20px;height:20px;background:#1119;border:0;border-radius:50%;color:white;cursor:pointer}.source-item>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#666;font-size:12px}.notice{margin:0;color:#747b85;font-size:12px}.form-footer{display:flex;align-items:center;justify-content:space-between;padding-top:8px}.form-footer button{min-width:120px}.demo-note{font-size:12px;color:#999}@media(max-width:680px){.extraction-form{padding:20px 16px}.breadcrumb{font-size:12px}.form-footer{gap:12px}.demo-note{max-width:155px}.dropzone{padding:24px 12px}}
</style>
