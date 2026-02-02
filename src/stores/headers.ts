import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Profile, HeaderRule, AppState, UrlFilter, HeaderType, DarkModePreference } from '../types'
import { createEmptyProfile, createEmptyHeader, DEFAULT_PROFILE_COLORS } from '../types'

const STORAGE_KEY = 'openheaders_state'
const MAX_HISTORY = 50

export const useHeadersStore = defineStore('headers', () => {
  // State
  const profiles = ref<Profile[]>([])
  const activeProfileId = ref<string | null>(null)
  const darkModePreference = ref<DarkModePreference>('system')
  const systemPrefersDark = ref(false)
  const history = ref<AppState[]>([])
  const historyIndex = ref(-1)
  const isInitialized = ref(false)

  // System dark mode detection
  let mediaQuery: MediaQueryList | null = null

  function initSystemDarkModeDetection(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemPrefersDark.value = mediaQuery.matches

      const handler = (e: MediaQueryListEvent) => {
        systemPrefersDark.value = e.matches
      }
      mediaQuery.addEventListener('change', handler)
    }
  }

  // Computed: actual dark mode state
  const isDarkMode = computed(() => {
    if (darkModePreference.value === 'system') {
      return systemPrefersDark.value
    }
    return darkModePreference.value === 'dark'
  })

  // Computed
  const activeProfile = computed(() => {
    if (!activeProfileId.value) return null
    return profiles.value.find(p => p.id === activeProfileId.value) ?? null
  })

  const requestHeaders = computed(() => {
    return activeProfile.value?.headers.filter(h => h.type === 'request') ?? []
  })

  const responseHeaders = computed(() => {
    return activeProfile.value?.headers.filter(h => h.type === 'response') ?? []
  })

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  // Helper to get current state
  function getState(): AppState {
    return {
      profiles: JSON.parse(JSON.stringify(profiles.value)),
      activeProfileId: activeProfileId.value,
      darkModePreference: darkModePreference.value,
    }
  }

  // Save state to history
  function saveToHistory(): void {
    // Remove any future history if we're not at the end
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    const state = getState()
    history.value.push(state)

    // Limit history size
    if (history.value.length > MAX_HISTORY) {
      history.value = history.value.slice(-MAX_HISTORY)
    }

    historyIndex.value = history.value.length - 1
  }

  // Restore state from history entry
  function restoreState(state: AppState): void {
    profiles.value = JSON.parse(JSON.stringify(state.profiles))
    activeProfileId.value = state.activeProfileId
    darkModePreference.value = state.darkModePreference
  }

  // Actions
  function undo(): void {
    if (!canUndo.value) return
    historyIndex.value--
    const state = history.value[historyIndex.value]
    if (state) {
      restoreState(state)
      persistState()
    }
  }

  function redo(): void {
    if (!canRedo.value) return
    historyIndex.value++
    const state = history.value[historyIndex.value]
    if (state) {
      restoreState(state)
      persistState()
    }
  }

  // Persist to chrome.storage
  async function persistState(): Promise<void> {
    const state = getState()
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ [STORAGE_KEY]: state })
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      }
    } catch (error) {
      console.error('Failed to persist state:', error)
    }
  }

  // Load from storage
  async function loadState(): Promise<void> {
    try {
      let state: AppState | null = null

      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(STORAGE_KEY)
        const stored = result[STORAGE_KEY]
        if (stored && typeof stored === 'object' && 'profiles' in stored) {
          state = stored as AppState
        }
      } else {
        const stored = localStorage.getItem(STORAGE_KEY)
        state = stored ? JSON.parse(stored) as AppState : null
      }

      if (state && state.profiles) {
        profiles.value = state.profiles
        activeProfileId.value = state.activeProfileId
        // Handle migration from old darkMode boolean to new darkModePreference
        if ('darkModePreference' in state) {
          darkModePreference.value = state.darkModePreference
        } else if ('darkMode' in state) {
          // Migrate from old format: if darkMode was true, set to 'dark', otherwise 'system'
          darkModePreference.value = (state as { darkMode?: boolean }).darkMode ? 'dark' : 'system'
        }
      }

      // Initialize system dark mode detection
      initSystemDarkModeDetection()

      // Create default profile if none exist
      if (profiles.value.length === 0) {
        const defaultProfile = createEmptyProfile('Profile 1')
        profiles.value.push(defaultProfile)
        activeProfileId.value = defaultProfile.id
      } else if (!activeProfileId.value && profiles.value.length > 0) {
        const firstProfile = profiles.value[0]
        activeProfileId.value = firstProfile ? firstProfile.id : null
      }

      // Initialize history
      history.value = [getState()]
      historyIndex.value = 0
      isInitialized.value = true
    } catch (error) {
      console.error('Failed to load state:', error)
      // Create default profile on error
      const defaultProfile = createEmptyProfile('Profile 1')
      profiles.value.push(defaultProfile)
      activeProfileId.value = defaultProfile.id
      history.value = [getState()]
      historyIndex.value = 0
      isInitialized.value = true
    }
  }

  // Profile actions
  function addProfile(): void {
    const profileNumber = profiles.value.length + 1
    const colorIndex = (profiles.value.length) % DEFAULT_PROFILE_COLORS.length
    const profile = createEmptyProfile(`Profile ${profileNumber}`)
    profile.color = DEFAULT_PROFILE_COLORS[colorIndex] ?? '#7c3aed'
    profiles.value.push(profile)
    activeProfileId.value = profile.id
    saveToHistory()
    persistState()
  }

  function removeProfile(profileId: string): void {
    const index = profiles.value.findIndex(p => p.id === profileId)
    if (index === -1) return

    profiles.value.splice(index, 1)

    if (activeProfileId.value === profileId) {
      activeProfileId.value = profiles.value[0]?.id ?? null
    }

    // Ensure at least one profile exists
    if (profiles.value.length === 0) {
      const defaultProfile = createEmptyProfile('Profile 1')
      profiles.value.push(defaultProfile)
      activeProfileId.value = defaultProfile.id
    }

    saveToHistory()
    persistState()
  }

  function duplicateProfile(profileId: string): void {
    const profile = profiles.value.find(p => p.id === profileId)
    if (!profile) return

    const newProfile: Profile = {
      ...JSON.parse(JSON.stringify(profile)),
      id: crypto.randomUUID(),
      name: `${profile.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    profiles.value.push(newProfile)
    activeProfileId.value = newProfile.id
    saveToHistory()
    persistState()
  }

  function setActiveProfile(profileId: string): void {
    if (profiles.value.some(p => p.id === profileId)) {
      activeProfileId.value = profileId
      persistState()
    }
  }

  function updateProfile(profileId: string, updates: Partial<Profile>): void {
    const profile = profiles.value.find(p => p.id === profileId)
    if (!profile) return

    Object.assign(profile, updates, { updatedAt: Date.now() })
    saveToHistory()
    persistState()
  }

  // Header actions
  function addHeader(type: HeaderType = 'request'): void {
    if (!activeProfile.value) return

    const header = createEmptyHeader(type)
    activeProfile.value.headers.push(header)
    activeProfile.value.updatedAt = Date.now()
    saveToHistory()
    persistState()
  }

  function removeHeader(headerId: string): void {
    if (!activeProfile.value) return

    const index = activeProfile.value.headers.findIndex(h => h.id === headerId)
    if (index === -1) return

    activeProfile.value.headers.splice(index, 1)
    activeProfile.value.updatedAt = Date.now()
    saveToHistory()
    persistState()
  }

  function duplicateHeader(headerId: string): void {
    if (!activeProfile.value) return

    const header = activeProfile.value.headers.find(h => h.id === headerId)
    if (!header) return

    const index = activeProfile.value.headers.findIndex(h => h.id === headerId)
    const newHeader: HeaderRule = {
      ...JSON.parse(JSON.stringify(header)),
      id: crypto.randomUUID(),
    }

    // Insert after the original header
    activeProfile.value.headers.splice(index + 1, 0, newHeader)
    activeProfile.value.updatedAt = Date.now()
    saveToHistory()
    persistState()
  }

  function updateHeader(headerId: string, updates: Partial<HeaderRule>): void {
    if (!activeProfile.value) return

    const header = activeProfile.value.headers.find(h => h.id === headerId)
    if (!header) return

    Object.assign(header, updates)
    activeProfile.value.updatedAt = Date.now()
    saveToHistory()
    persistState()
  }

  function toggleHeader(headerId: string): void {
    if (!activeProfile.value) return

    const header = activeProfile.value.headers.find(h => h.id === headerId)
    if (!header) return

    header.enabled = !header.enabled
    activeProfile.value.updatedAt = Date.now()
    saveToHistory()
    persistState()
  }

  function clearHeaders(type?: HeaderType): void {
    if (!activeProfile.value) return

    if (type) {
      activeProfile.value.headers = activeProfile.value.headers.filter(h => h.type !== type)
    } else {
      activeProfile.value.headers = []
    }
    activeProfile.value.updatedAt = Date.now()
    saveToHistory()
    persistState()
  }

  function sortHeaders(by: 'name' | 'value' | 'comment', type?: HeaderType): void {
    if (!activeProfile.value) return

    const headers = type
      ? activeProfile.value.headers.filter(h => h.type === type)
      : activeProfile.value.headers

    headers.sort((a, b) => {
      const aVal = a[by].toLowerCase()
      const bVal = b[by].toLowerCase()
      return aVal.localeCompare(bVal)
    })

    if (type) {
      const otherHeaders = activeProfile.value.headers.filter(h => h.type !== type)
      activeProfile.value.headers = [...otherHeaders, ...headers]
    }

    activeProfile.value.updatedAt = Date.now()
    saveToHistory()
    persistState()
  }

  function reorderHeaders(orderedIds: string[], type: HeaderType): void {
    if (!activeProfile.value) return

    const headersOfType = activeProfile.value.headers.filter(h => h.type === type)
    const otherHeaders = activeProfile.value.headers.filter(h => h.type !== type)

    // Reorder headers based on the new order
    const reordered = orderedIds
      .map(id => headersOfType.find(h => h.id === id))
      .filter((h): h is HeaderRule => h !== undefined)

    activeProfile.value.headers = [...otherHeaders, ...reordered]
    activeProfile.value.updatedAt = Date.now()
    saveToHistory()
    persistState()
  }

  function reorderProfiles(orderedIds: string[]): void {
    const reordered = orderedIds
      .map(id => profiles.value.find(p => p.id === id))
      .filter((p): p is Profile => p !== undefined)

    profiles.value = reordered
    saveToHistory()
    persistState()
  }

  // URL Filter actions
  function addUrlFilter(type: 'include' | 'exclude' = 'include'): void {
    if (!activeProfile.value) return

    const filter: UrlFilter = {
      id: crypto.randomUUID(),
      enabled: true,
      pattern: '',
      type,
    }
    activeProfile.value.urlFilters.push(filter)
    activeProfile.value.updatedAt = Date.now()
    saveToHistory()
    persistState()
  }

  function removeUrlFilter(filterId: string): void {
    if (!activeProfile.value) return

    const index = activeProfile.value.urlFilters.findIndex(f => f.id === filterId)
    if (index === -1) return

    activeProfile.value.urlFilters.splice(index, 1)
    activeProfile.value.updatedAt = Date.now()
    saveToHistory()
    persistState()
  }

  function updateUrlFilter(filterId: string, updates: Partial<UrlFilter>): void {
    if (!activeProfile.value) return

    const filter = activeProfile.value.urlFilters.find(f => f.id === filterId)
    if (!filter) return

    Object.assign(filter, updates)
    activeProfile.value.updatedAt = Date.now()
    saveToHistory()
    persistState()
  }

  // Import/Export
  function exportProfiles(): string {
    return JSON.stringify({
      version: 1,
      profiles: profiles.value,
      exportedAt: Date.now(),
    }, null, 2)
  }

  function importProfiles(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString)
      if (!data.profiles || !Array.isArray(data.profiles)) {
        throw new Error('Invalid format')
      }

      // Validate and add profiles
      for (const profile of data.profiles) {
        if (!profile.id || !profile.name) continue

        // Generate new IDs to avoid conflicts
        const newProfile: Profile = {
          ...profile,
          id: crypto.randomUUID(),
          headers: profile.headers?.map((h: HeaderRule) => ({
            ...h,
            id: crypto.randomUUID(),
          })) ?? [],
          urlFilters: profile.urlFilters?.map((f: UrlFilter) => ({
            ...f,
            id: crypto.randomUUID(),
          })) ?? [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        profiles.value.push(newProfile)
      }

      saveToHistory()
      persistState()
      return true
    } catch (error) {
      console.error('Failed to import profiles:', error)
      return false
    }
  }

  // Cycle dark mode preference: system → dark → light → system
  function toggleDarkMode(): void {
    const order: DarkModePreference[] = ['system', 'dark', 'light']
    const currentIndex = order.indexOf(darkModePreference.value)
    const nextIndex = (currentIndex + 1) % order.length
    darkModePreference.value = order[nextIndex] as DarkModePreference
    persistState()
  }

  // Set dark mode preference directly
  function setDarkModePreference(preference: DarkModePreference): void {
    darkModePreference.value = preference
    persistState()
  }

  return {
    // State
    profiles,
    activeProfileId,
    activeProfile,
    darkModePreference,
    isDarkMode,
    isInitialized,
    requestHeaders,
    responseHeaders,
    canUndo,
    canRedo,

    // Actions
    loadState,
    undo,
    redo,
    addProfile,
    removeProfile,
    duplicateProfile,
    setActiveProfile,
    updateProfile,
    addHeader,
    removeHeader,
    duplicateHeader,
    updateHeader,
    toggleHeader,
    clearHeaders,
    sortHeaders,
    reorderHeaders,
    reorderProfiles,
    addUrlFilter,
    removeUrlFilter,
    updateUrlFilter,
    exportProfiles,
    importProfiles,
    toggleDarkMode,
    setDarkModePreference,
  }
})
