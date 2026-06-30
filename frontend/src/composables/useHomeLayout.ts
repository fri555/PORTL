import { ref, computed } from 'vue'
import type { HomeComponent, HomeComponentType, ComponentSize, GridPosition } from '@/types/home'
import { COMPONENT_META, SIZE_GRID } from '@/types/home'
import { ROLE_DEFAULT_LAYOUTS } from '@/mock/home-layout'

const STORAGE_KEY = 'tianma_home_layout_v10'
const ROLE_KEY = 'tianma_user_role'
const DEFAULT_GRID_COLS = 14

// Global state - shared across component instances
const components = ref<HomeComponent[]>([])
const currentRole = ref<string>(localStorage.getItem(ROLE_KEY) || 'employee')
const initialized = ref(false)

function generateId(): string {
  return `hc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(components.value))
  localStorage.setItem(ROLE_KEY, currentRole.value)
}

function loadFromStorage(): HomeComponent[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as HomeComponent[]
    return null
  } catch {
    return null
  }
}

function getDefaultLayout(): HomeComponent[] {
  const layout = ROLE_DEFAULT_LAYOUTS[currentRole.value]
  if (layout) return JSON.parse(JSON.stringify(layout))
  return JSON.parse(JSON.stringify(ROLE_DEFAULT_LAYOUTS.employee))
}

function rectOf(component: HomeComponent, position = component.layout) {
  const size = SIZE_GRID[component.size]
  return {
    x: position?.x ?? 0,
    y: position?.y ?? 0,
    w: size.cols,
    h: size.rows,
  }
}

function isGridComponent(component: HomeComponent) {
  return component.type !== 'global_search'
}

function overlaps(a: ReturnType<typeof rectOf>, b: ReturnType<typeof rectOf>) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function fits(position: GridPosition, size: ComponentSize, cols = DEFAULT_GRID_COLS) {
  const gridSize = SIZE_GRID[size]
  return position.x >= 0 && position.y >= 0 && position.x + gridSize.cols <= cols
}

function collides(position: GridPosition, size: ComponentSize, ignoredId?: string) {
  const candidate = {
    x: position.x,
    y: position.y,
    w: SIZE_GRID[size].cols,
    h: SIZE_GRID[size].rows,
  }
  return components.value.some((component) => isGridComponent(component) && component.id !== ignoredId && overlaps(candidate, rectOf(component)))
}

function findFreePosition(size: ComponentSize, ignoredId?: string, cols = DEFAULT_GRID_COLS): GridPosition {
  const gridSize = SIZE_GRID[size]
  const maxX = Math.max(0, cols - gridSize.cols)

  for (let y = 0; y < 24; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const position = { x, y }
      if (!collides(position, size, ignoredId)) return position
    }
  }

  return { x: 0, y: 24 }
}

function normalizeLayouts(cols = DEFAULT_GRID_COLS) {
  const placed: HomeComponent[] = []
  components.value
    .filter(isGridComponent)
    .sort((a, b) => a.order - b.order)
    .forEach((component, index) => {
      const meta = COMPONENT_META[component.type]
      if (!meta.allowedSizes.includes(component.size)) {
        component.size = meta.defaultSize
        component.layout = undefined
      }
      const size = SIZE_GRID[component.size]
      const desired = component.layout && fits(component.layout, component.size, cols)
        ? component.layout
        : findFreePosition(component.size, component.id, cols)
      const desiredRect = rectOf(component, desired)
      const hasCollision = placed.some((placedComponent) => overlaps(desiredRect, rectOf(placedComponent)))

      component.layout = hasCollision ? findFreePosition(component.size, component.id, cols) : desired
      if (component.layout.x + size.cols > cols) component.layout.x = Math.max(0, cols - size.cols)
      component.order = index
      placed.push(component)
    })
}

function resolveCollisions(priorityId: string, cols = DEFAULT_GRID_COLS) {
  const priority = components.value.find((component) => component.id === priorityId)
  if (!priority) return

  priority.layout = priority.layout && fits(priority.layout, priority.size, cols)
    ? priority.layout
    : findFreePosition(priority.size, priority.id, cols)

  const placed = [priority]
  components.value
    .filter((component) => component.id !== priorityId)
    .filter(isGridComponent)
    .sort((a, b) => a.order - b.order)
    .forEach((component) => {
      const position = component.layout && fits(component.layout, component.size, cols)
        ? component.layout
        : findFreePosition(component.size, component.id, cols)
      const candidateRect = rectOf(component, position)
      const hasCollision = placed.some((placedComponent) => overlaps(candidateRect, rectOf(placedComponent)))
      component.layout = hasCollision ? findFreePosition(component.size, component.id, cols) : position
      placed.push(component)
    })
}

function initLayout() {
  if (initialized.value) return
  const saved = loadFromStorage()
  if (saved) {
    components.value = saved
  } else {
    components.value = getDefaultLayout()
    saveToStorage()
  }
  normalizeLayouts()
  initialized.value = true
}

export function useHomeLayout() {
  initLayout()

  const sortedComponents = computed(() =>
    [...components.value].sort((a, b) => {
      const ay = a.layout?.y ?? 0
      const by = b.layout?.y ?? 0
      const ax = a.layout?.x ?? 0
      const bx = b.layout?.x ?? 0
      return ay - by || ax - bx || a.order - b.order
    }),
  )

  function addComponent(type: HomeComponentType, size?: ComponentSize) {
    const meta = COMPONENT_META[type]
    const newComp: HomeComponent = {
      id: generateId(),
      type,
      size: size || meta.defaultSize,
      order: components.value.length,
      layout: findFreePosition(size || meta.defaultSize),
      config: {},
    }
    components.value.push(newComp)
    saveToStorage()
  }

  function removeComponent(id: string) {
    components.value = components.value.filter((c) => c.id !== id)
    // Re-assign orders
    components.value.forEach((c, i) => (c.order = i))
    saveToStorage()
  }

  function updateSize(id: string, size: ComponentSize) {
    const comp = components.value.find((c) => c.id === id)
    if (comp) {
      comp.size = size
      if (!comp.layout || !fits(comp.layout, size)) {
        comp.layout = findFreePosition(size, id)
      }
      resolveCollisions(id)
      saveToStorage()
    }
  }

  function moveComponent(id: string, position: GridPosition, cols = DEFAULT_GRID_COLS) {
    const comp = components.value.find((c) => c.id === id)
    if (!comp) return
    const size = SIZE_GRID[comp.size]
    comp.layout = {
      x: Math.max(0, Math.min(position.x, cols - size.cols)),
      y: Math.max(0, position.y),
    }
    resolveCollisions(id, cols)
    saveToStorage()
  }

  function moveUp(id: string) {
    // Sort by order first so adjacent positions are correct
    components.value.sort((a, b) => a.order - b.order)
    const idx = components.value.findIndex((c) => c.id === id)
    if (idx <= 0) return
    const current = components.value[idx]
    const above = components.value[idx - 1]
    const tmpOrder = current.order
    current.order = above.order
    above.order = tmpOrder
    saveToStorage()
  }

  function moveDown(id: string) {
    // Sort by order first so adjacent positions are correct
    components.value.sort((a, b) => a.order - b.order)
    const idx = components.value.findIndex((c) => c.id === id)
    if (idx < 0 || idx >= components.value.length - 1) return
    const current = components.value[idx]
    const below = components.value[idx + 1]
    const tmpOrder = current.order
    current.order = below.order
    below.order = tmpOrder
    saveToStorage()
  }

  function reorder(fromId: string, toId: string) {
    const fromIdx = components.value.findIndex((c) => c.id === fromId)
    const toIdx = components.value.findIndex((c) => c.id === toId)
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
    // Remove from current position and insert at target position
    const [moved] = components.value.splice(fromIdx, 1)
    components.value.splice(toIdx, 0, moved)
    // Re-assign orders
    components.value.forEach((c, i) => (c.order = i))
    saveToStorage()
  }

  function setRole(role: string) {
    currentRole.value = role
    const layout = ROLE_DEFAULT_LAYOUTS[role]
    if (layout) {
      components.value = JSON.parse(JSON.stringify(layout))
    }
    saveToStorage()
  }

  function resetToDefault() {
    components.value = getDefaultLayout()
    saveToStorage()
  }

  return {
    components: sortedComponents,
    currentRole,
    addComponent,
    removeComponent,
    updateSize,
    moveUp,
    moveDown,
    reorder,
    moveComponent,
    setRole,
    resetToDefault,
  }
}
