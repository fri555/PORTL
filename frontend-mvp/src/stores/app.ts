import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MockUser } from '@/types/user'
import { mockUser } from '@/mock/user'

const LIKES_KEY = 'tianma_ai_likes'
const BOOKMARKS_KEY = 'tianma_ai_bookmarks'
const USER_KEY = 'tianma_ai_user'

export type TaskNotification = {
  id: string
  conversationId: string
  messageId?: string
  title: string
}

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...set]))
}

function loadUser(): MockUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as MockUser) : null
  } catch {
    return null
  }
}

export const useAppStore = defineStore('app', () => {
  const user = ref<MockUser | null>(loadUser())
  const likes = ref<Set<string>>(loadSet(LIKES_KEY))
  const bookmarks = ref<Set<string>>(loadSet(BOOKMARKS_KEY))
  const taskNotifications = ref<TaskNotification[]>([])

  function login(u: MockUser = mockUser) {
    user.value = u
    localStorage.setItem(USER_KEY, JSON.stringify(u))
  }

  function logout() {
    user.value = null
    localStorage.removeItem(USER_KEY)
  }

  function addTaskNotification(notification: Omit<TaskNotification, 'id'>) {
    taskNotifications.value = [
      { ...notification, id: `notice-${Date.now()}` },
      ...taskNotifications.value.filter((item) => item.conversationId !== notification.conversationId),
    ].slice(0, 5)
  }

  function dismissTaskNotification(id: string) {
    taskNotifications.value = taskNotifications.value.filter((item) => item.id !== id)
  }

  function clearConversationNotification(conversationId: string) {
    taskNotifications.value = taskNotifications.value.filter((item) => item.conversationId !== conversationId)
  }

  function updateUser(patch: Partial<Pick<MockUser, 'displayName' | 'department' | 'avatarUrl'>>) {
    if (!user.value) return
    user.value = { ...user.value, ...patch }
    localStorage.setItem(USER_KEY, JSON.stringify(user.value))
  }

  function toggleLike(id: string) {
    if (likes.value.has(id)) likes.value.delete(id)
    else likes.value.add(id)
    saveSet(LIKES_KEY, likes.value)
  }

  function toggleBookmark(id: string) {
    if (bookmarks.value.has(id)) bookmarks.value.delete(id)
    else bookmarks.value.add(id)
    saveSet(BOOKMARKS_KEY, bookmarks.value)
  }

  function isLiked(id: string): boolean {
    return likes.value.has(id)
  }

  function isBookmarked(id: string): boolean {
    return bookmarks.value.has(id)
  }

  return {
    user,
    likes,
    bookmarks,
    taskNotifications,
    login,
    logout,
    updateUser,
    addTaskNotification,
    dismissTaskNotification,
    clearConversationNotification,
    toggleLike,
    toggleBookmark,
    isLiked,
    isBookmarked,
  }
})
