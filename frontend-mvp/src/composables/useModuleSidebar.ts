import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { routeLocationKey } from 'vue-router'

/** Persistent desktop rail and opt-in mobile drawer shared by module navigation. */
export function useModuleSidebar() {
  const route = inject(routeLocationKey, undefined)
  const isMobile = ref(window.innerWidth <= 720)
  const sidebarOpen = ref(!isMobile.value)
  function closeMobileSidebar() { if (isMobile.value) sidebarOpen.value = false }
  function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }
  function updateViewport() {
    const mobile = window.innerWidth <= 720
    if (mobile !== isMobile.value) sidebarOpen.value = !mobile
    isMobile.value = mobile
  }
  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') closeMobileSidebar()
  }
  watch(() => route?.fullPath, closeMobileSidebar)
  onMounted(() => {
    window.addEventListener('tianma:toggle-sidebar', toggleSidebar)
    window.addEventListener('resize', updateViewport)
    window.addEventListener('keydown', onKeydown)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('tianma:toggle-sidebar', toggleSidebar)
    window.removeEventListener('resize', updateViewport)
    window.removeEventListener('keydown', onKeydown)
  })
  return { isMobile, sidebarOpen, closeMobileSidebar }
}
