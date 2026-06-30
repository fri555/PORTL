import { ref } from 'vue'

export type AuthStatus = 'pending' | 'scanned' | 'confirmed'

const status = ref<AuthStatus>('pending')
let timer: ReturnType<typeof setTimeout> | null = null

export function useAuth() {
  function scan() {
    if (status.value !== 'pending') return
    status.value = 'scanned'
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      status.value = 'confirmed'
      timer = null
    }, 1200)
  }

  function confirmMock() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    status.value = 'confirmed'
  }

  function reset() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    status.value = 'pending'
  }

  return { status, scan, confirmMock, reset }
}
