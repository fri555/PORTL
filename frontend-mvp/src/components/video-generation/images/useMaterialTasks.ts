import { onBeforeUnmount, ref } from 'vue'

export type MaterialType = 'MODEL' | 'PRODUCT' | 'SCENE'
export type MaterialStatus = 'processing' | 'completed' | 'failed'
export interface MaterialImage { name: string; url: string }
export interface MaterialTask {
  id: string
  materialType: MaterialType
  materialName: string
  status: MaterialStatus
  createdAt: string
  images: MaterialImage[]
  goodsNo: string
  resultImage?: string
}
export interface MaterialInput {
  materialType: MaterialType
  materialName: string
  images: MaterialImage[]
  goodsNo: string
}
export const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: 'MODEL', label: '模特提取' },
  { value: 'PRODUCT', label: '商品提取' },
  { value: 'SCENE', label: '场景提取' },
]
export const MATERIAL_STATUSES: { value: '' | MaterialStatus; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'processing', label: '生成中' },
  { value: 'completed', label: '成功' },
  { value: 'failed', label: '失败' },
]
const STORAGE_KEY = 'tianma-video-materials-v1'
const materialTypes = new Set(MATERIAL_TYPES.map((type) => type.value))
const statuses = new Set(MATERIAL_STATUSES.map((status) => status.value))
const safeImage = (value: unknown): value is string => typeof value === 'string' && /^data:image\/(?:png|jpe?g|webp|svg\+xml)[;,]/i.test(value)

export function demoMaterialImage(type: MaterialType, name: string) {
  const escaped = name.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!)
  const shapes = {
    MODEL: '<circle cx="240" cy="148" r="48" fill="#b8c1d2"/><path d="M150 332v-72c0-72 180-72 180 0v72" fill="#b8c1d2"/><path d="M207 145q33 12 66 0" fill="none" stroke="#7c879c" stroke-width="3"/>',
    PRODUCT: '<path d="m115 245 54-92 75 46 93 23q30 8 28 42l-4 26H116z" fill="#c4ccd8" stroke="#8996aa" stroke-width="3"/><path d="M118 273h245M183 184l44 23m-56-5 44 23m-56-4 44 23" stroke="#fff" stroke-width="9"/>',
    SCENE: '<circle cx="330" cy="130" r="28" fill="#d9b887"/><path d="m67 280 115-144 89 112 50-62 97 94" fill="#a1b5ad"/><path d="M66 280h352v54H66z" fill="#bcced2"/><path d="m67 312 351-1" stroke="#e2ecee" stroke-width="4"/>',
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480"><rect width="480" height="480" rx="12" fill="#f2f4f7"/><rect x="24" y="24" width="432" height="342" rx="10" fill="#e9edf2"/>${shapes[type]}<text x="240" y="410" text-anchor="middle" fill="#384253" font-family="sans-serif" font-size="20">${escaped}</text><text x="240" y="444" text-anchor="middle" fill="#8a93a2" font-family="sans-serif" font-size="16">原型演示</text></svg>`)}`
}

export function useMaterialTasks() {
  const error = ref('')
  const tasks = ref<MaterialTask[]>([])
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (Array.isArray(saved)) {
      tasks.value = saved.filter((task): task is MaterialTask =>
        task && typeof task.id === 'string' && typeof task.materialName === 'string' &&
        materialTypes.has(task.materialType) && statuses.has(task.status) && task.status !== '' &&
        typeof task.createdAt === 'string' && Number.isFinite(new Date(task.createdAt).getTime()) &&
        Array.isArray(task.images) && task.images.every((image: MaterialImage) => image && typeof image.name === 'string' && safeImage(image.url)) &&
        (!task.resultImage || safeImage(task.resultImage)),
      ).map((task) => ({ ...task, goodsNo: typeof task.goodsNo === 'string' ? task.goodsNo : '' }))
    }
  } catch {
    error.value = '本地素材记录暂不可读取，可继续创建任务。'
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.value))
      return true
    } catch {
      error.value = '浏览器存储空间不足，本次修改仅在当前页面保留。请减少上传图片后重试。'
      return false
    }
  }

  function finishLater(task: MaterialTask) {
    timers.set(task.id, setTimeout(() => {
      timers.delete(task.id)
      const current = tasks.value.find((item) => item.id === task.id)
      if (!current || current.status !== 'processing') return
      current.resultImage = demoMaterialImage(current.materialType, current.materialName)
      current.status = 'completed'
      persist()
    }, 800))
  }

  function create(input: MaterialInput) {
    const name = input.materialName.trim()
    if (!name || name.length > 20 || (!input.images.length && !(input.materialType === 'PRODUCT' && input.goodsNo.trim()))) {
      error.value = '请填写 20 字以内的素材名称，并上传图片或填写商品货号。'
      return false
    }
    error.value = ''
    const task: MaterialTask = {
      id: `material-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      materialType: input.materialType,
      materialName: name,
      goodsNo: input.materialType === 'PRODUCT' ? input.goodsNo.trim() : '',
      images: input.images.map((image) => ({ ...image })),
      createdAt: new Date().toISOString(),
      status: 'processing',
    }
    tasks.value.unshift(task)
    persist()
    finishLater(task)
    return true
  }

  function remove(id: string) {
    const timer = timers.get(id)
    if (timer) clearTimeout(timer)
    timers.delete(id)
    tasks.value = tasks.value.filter((task) => task.id !== id)
    persist()
  }

  tasks.value.filter((task) => task.status === 'processing').forEach(finishLater)
  onBeforeUnmount(() => timers.forEach((timer) => clearTimeout(timer)))
  return { tasks, error, create, remove }
}
