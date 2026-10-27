import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ImageMaterials from '../ImageMaterials.vue'

const STORAGE_KEY = 'tianma-video-materials-v1'
const wrappers: VueWrapper[] = []
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'

async function mountPage(path = '/video-gen/image-generate') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(ImageMaterials, { global: { plugins: [router] }, attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}

function seedMaterials() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([
    { id: 'model-1', materialType: 'MODEL', materialName: '人物素材', status: 'completed', createdAt: new Date().toISOString(), images: [{ name: '人物', url: image }], resultImage: image, goodsNo: '' },
    { id: 'product-1', materialType: 'PRODUCT', materialName: '跑步鞋', status: 'completed', createdAt: new Date().toISOString(), images: [{ name: '鞋', url: image }], resultImage: image, goodsNo: 'JH6206' },
    { id: 'scene-1', materialType: 'SCENE', materialName: '湖边场景', status: 'failed', createdAt: new Date().toISOString(), images: [], goodsNo: '' },
  ]))
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('图片素材提取原型', () => {
  it('shows the captured empty list and extraction fields', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('暂无素材提取任务')
    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual(['全部', '生成中', '成功', '失败'])
    await wrapper.get('[data-testid="new-extraction"]').trigger('click')
    expect(wrapper.text()).toContain('新增素材提取任务')
    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual(['模特提取', '商品提取', '场景提取'])
    expect(wrapper.get('[data-testid="extract-submit"]').attributes('disabled')).toBeDefined()
  })

  it('creates a validated product demo and restores its result after remount', async () => {
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="new-extraction"]').trigger('click')
    await wrapper.get('[data-type="PRODUCT"]').trigger('click')
    await wrapper.get('[data-testid="extract-name-input"]').setValue('跑步鞋素材')
    expect(wrapper.get('[data-testid="extract-submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="extract-item-code-input"]').setValue('JH6206')
    expect(wrapper.get('[data-testid="extract-submit"]').attributes('disabled')).toBeUndefined()
    vi.useFakeTimers()
    await wrapper.get('[data-testid="extract-submit"]').trigger('click')
    expect(wrapper.get('[data-testid="material-row"]').text()).toContain('生成中')
    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.get('[data-testid="material-row"]').text()).toContain('成功')
    expect(wrapper.get('[data-testid="material-row"]').text()).toContain('原型演示')
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ materialName: '跑步鞋素材', materialType: 'PRODUCT', status: 'completed' })
    wrapper.unmount()
    const restored = await mountPage()
    expect(restored.get('[data-testid="material-row"]').text()).toContain('跑步鞋素材')
    expect(restored.get('[aria-label="预览提取结果"]').attributes('disabled')).toBeUndefined()
  })

  it('applies type and name filters and resets the visible results', async () => {
    seedMaterials()
    const wrapper = await mountPage()
    expect(wrapper.findAll('[data-testid="material-row"]')).toHaveLength(3)
    await wrapper.get('[aria-label="素材类型"]').setValue('PRODUCT')
    await wrapper.get('[aria-label="素材名称"]').setValue('跑步')
    await wrapper.get('[data-testid="query-materials"]').trigger('click')
    expect(wrapper.findAll('[data-testid="material-row"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="material-row"]').text()).toContain('跑步鞋')
    await wrapper.get('[data-testid="reset-materials"]').trigger('click')
    await wrapper.get('[data-status="failed"]').trigger('click')
    expect(wrapper.findAll('[data-testid="material-row"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="material-row"]').text()).toContain('湖边场景')
  })

  it('opens an image preview, transforms it and closes with Escape', async () => {
    seedMaterials()
    const wrapper = await mountPage()
    await wrapper.findAll('[aria-label="预览提取结果"]')[0]!.trigger('click')
    const dialog = wrapper.get('[role="dialog"][aria-label="图片预览"]')
    expect(dialog.text()).toContain('原型演示')
    await dialog.get('[aria-label="放大"]').trigger('click')
    expect(dialog.get('[data-testid="preview-image"]').attributes('style')).toContain('scale(1.25)')
    await dialog.get('[aria-label="右旋转"]').trigger('click')
    expect(dialog.get('[data-testid="preview-image"]').attributes('style')).toContain('rotate(90deg)')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(wrapper.find('[role="dialog"][aria-label="图片预览"]').exists()).toBe(false)
  })

  it('opens local image actions and deletes only after confirmation', async () => {
    seedMaterials()
    const wrapper = await mountPage()
    await wrapper.findAll('[aria-label="预览提取结果"]')[0]!.trigger('contextmenu', { clientX: 40, clientY: 50 })
    expect(wrapper.get('[role="menu"]').text()).toContain('下载图片')
    await wrapper.findAll('[data-testid="delete-material"]')[0]!.trigger('click')
    expect(wrapper.findAll('[data-testid="material-row"]')).toHaveLength(3)
    await wrapper.get('[data-testid="confirm-delete-material"]').trigger('click')
    expect(wrapper.findAll('[data-testid="material-row"]')).toHaveLength(2)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')).toHaveLength(2)
  })

  it('rejects unsupported upload files without adding previews', async () => {
    const wrapper = await mountPage('/video-gen/image-generate?view=config&name=本地素材')
    expect(wrapper.get('[data-testid="extract-name-input"]').element).toHaveProperty('value', '本地素材')
    const input = wrapper.get('[data-testid="extract-file-input"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['text'], 'file.txt', { type: 'text/plain' })] })
    await input.trigger('change')
    await flushPromises()
    expect(wrapper.text()).toContain('仅支持 JPG / JPEG / PNG / WEBP 格式')
    expect(wrapper.findAll('[data-testid="source-image"]')).toHaveLength(0)
  })

  it('previews local uploads and releases their object URLs on removal and unmount', async () => {
    const createUrl = vi.fn().mockReturnValueOnce('blob:local-image-1').mockReturnValueOnce('blob:local-image-2')
    const revokeUrl = vi.fn()
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = createUrl
      static revokeObjectURL = revokeUrl
    })
    const wrapper = await mountPage('/video-gen/image-generate?view=config&name=上传图片')
    const input = wrapper.get('[data-testid="extract-file-input"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['local-image'], 'photo.png', { type: 'image/png' })] })
    await input.trigger('change')
    await vi.waitFor(() => expect(wrapper.findAll('[data-testid="source-image"]')).toHaveLength(1))
    expect(wrapper.get('[data-testid="source-image"] img').attributes('src')).toBe('blob:local-image-1')
    expect(wrapper.get('[data-testid="extract-submit"]').attributes('disabled')).toBeUndefined()
    await wrapper.get('[aria-label="移除源图 1"]').trigger('click')
    expect(revokeUrl).toHaveBeenCalledWith('blob:local-image-1')
    await input.trigger('change')
    await vi.waitFor(() => expect(wrapper.findAll('[data-testid="source-image"]')).toHaveLength(1))
    wrapper.unmount()
    expect(revokeUrl).toHaveBeenCalledWith('blob:local-image-2')
    vi.unstubAllGlobals()
  })
})
