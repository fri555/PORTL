// 收藏功能已移除，相关测试延至v2
// import { mount, flushPromises } from '@vue/test-utils'
// import { defineComponent } from 'vue'
// import { afterEach, beforeEach, describe, expect, it } from 'vitest'
// import { useExpertCatalog, favoritesStorageKey } from '@/composables/useExpertCatalog'
// import { EXPERT_FAVORITE_ROLLOUT_IDS } from '@/utils/expertPrototypeStore'

// const wrappers: ReturnType<typeof mount>[] = []
// beforeEach(() => localStorage.clear())
// afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))
// async function catalog() {
//   let api!: ReturnType<typeof useExpertCatalog>
//   wrappers.push(mount(defineComponent({ setup() { api = useExpertCatalog(); return {} }, template: '<div />' })))
//   await flushPromises()
//   return api
// }
// describe('replacing the old default prototype catalog', () => {
//   it('replaces only the untouched nine-demo default favorites with the eighteen source experts', async () => {
//     const key = favoritesStorageKey('prototype')
//     localStorage.setItem(key, JSON.stringify({ initialized: true, ids: Array.from({ length: 9 }, (_, i) => 'ag0' + (i + 1)) }))
//     const api = await catalog()
//     expect(api.favoriteExperts.value.map(agent => agent.id)).toEqual(EXPERT_FAVORITE_ROLLOUT_IDS)
//     expect(api.favoriteExperts.value).toHaveLength(18)
//     expect(JSON.parse(localStorage.getItem(key)!).ids).toEqual(EXPERT_FAVORITE_ROLLOUT_IDS)
//   })
//   it.each([{ ids: [] }, { ids: ['ag01'] }, { ids: ['custom-kept', 'ag01'] }])('never refills a deliberately empty or changed favorite list $ids', async ({ ids }) => {
//     const key = favoritesStorageKey('prototype')
//     localStorage.setItem(key, JSON.stringify({ initialized: true, ids }))
//     const api = await catalog()
//     expect([...api.favoriteIds.value]).toEqual(ids)
//     expect(JSON.parse(localStorage.getItem(key)!).ids).toEqual(ids)
//   })
// })
