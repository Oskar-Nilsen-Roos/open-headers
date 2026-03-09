import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'openheaders_shortcuts'

export interface ShortcutDefinition {
  id: string
  labelKey: string
  category: 'general' | 'profiles' | 'chrome'
  defaultKey: string
  chromeCommand?: string
}

export interface ShortcutBinding {
  key: string
  enabled: boolean
}

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  { id: 'open-settings', labelKey: 'shortcut_open_settings', category: 'general', defaultKey: 'Mod+;' },
  { id: 'add-new', labelKey: 'shortcut_add_new', category: 'general', defaultKey: 'Mod+N' },
  { id: 'undo', labelKey: 'shortcut_undo', category: 'general', defaultKey: 'Mod+Z' },
  { id: 'redo', labelKey: 'shortcut_redo', category: 'general', defaultKey: 'Mod+Shift+Z' },
  { id: 'show-help', labelKey: 'shortcut_show_help', category: 'general', defaultKey: '?' },
  { id: 'profile-1', labelKey: 'shortcut_profile_n', category: 'profiles', defaultKey: '1' },
  { id: 'profile-2', labelKey: 'shortcut_profile_n', category: 'profiles', defaultKey: '2' },
  { id: 'profile-3', labelKey: 'shortcut_profile_n', category: 'profiles', defaultKey: '3' },
  { id: 'profile-4', labelKey: 'shortcut_profile_n', category: 'profiles', defaultKey: '4' },
  { id: 'profile-5', labelKey: 'shortcut_profile_n', category: 'profiles', defaultKey: '5' },
  { id: 'profile-6', labelKey: 'shortcut_profile_n', category: 'profiles', defaultKey: '6' },
  { id: 'profile-7', labelKey: 'shortcut_profile_n', category: 'profiles', defaultKey: '7' },
  { id: 'profile-8', labelKey: 'shortcut_profile_n', category: 'profiles', defaultKey: '8' },
  { id: 'profile-9', labelKey: 'shortcut_profile_n', category: 'profiles', defaultKey: '9' },
  { id: 'chrome-open', labelKey: 'shortcut_open_extension', category: 'chrome', chromeCommand: '_execute_action', defaultKey: '' },
  { id: 'chrome-profile-1', labelKey: 'shortcut_chrome_profile_n', category: 'chrome', chromeCommand: 'switch-profile-1', defaultKey: '' },
  { id: 'chrome-profile-2', labelKey: 'shortcut_chrome_profile_n', category: 'chrome', chromeCommand: 'switch-profile-2', defaultKey: '' },
  { id: 'chrome-profile-3', labelKey: 'shortcut_chrome_profile_n', category: 'chrome', chromeCommand: 'switch-profile-3', defaultKey: '' },
]

export const useShortcutsStore = defineStore('shortcuts', () => {
  // State: only stores overrides from defaults
  const customBindings = ref<Record<string, ShortcutBinding>>({})

  // Chrome command shortcuts (read from chrome.commands.getAll())
  const chromeCommands = ref<Record<string, string>>({})

  // Getters
  const getKey = computed(() => {
    return (id: string): string => {
      const custom = customBindings.value[id]
      if (custom) return custom.key

      const def = SHORTCUT_DEFINITIONS.find(d => d.id === id)
      return def?.defaultKey ?? ''
    }
  })

  const isEnabled = computed(() => {
    return (id: string): boolean => {
      const custom = customBindings.value[id]
      if (custom) return custom.enabled
      return true
    }
  })

  function getDefinition(id: string): ShortcutDefinition | undefined {
    return SHORTCUT_DEFINITIONS.find(d => d.id === id)
  }

  /**
   * Find a conflicting shortcut that already uses the given key.
   * Returns the definition id if conflict found, null otherwise.
   */
  function findConflict(key: string, excludeId: string): string | null {
    if (!key) return null
    const normalizedKey = key.toLowerCase()

    for (const def of SHORTCUT_DEFINITIONS) {
      if (def.id === excludeId) continue
      if (def.category === 'chrome') continue

      const currentKey = getKey.value(def.id)
      if (currentKey.toLowerCase() === normalizedKey) {
        return def.id
      }
    }
    return null
  }

  // Actions
  function setBinding(id: string, key: string): void {
    const def = SHORTCUT_DEFINITIONS.find(d => d.id === id)
    if (!def || def.category === 'chrome') return

    customBindings.value[id] = { key, enabled: true }
    persistBindings()
  }

  function resetBinding(id: string): void {
    delete customBindings.value[id]
    persistBindings()
  }

  function resetAll(): void {
    customBindings.value = {}
    persistBindings()
  }

  async function loadBindings(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(STORAGE_KEY)
        const stored = result[STORAGE_KEY]
        if (stored && typeof stored === 'object') {
          customBindings.value = stored as Record<string, ShortcutBinding>
        }
      } else {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          customBindings.value = JSON.parse(stored) as Record<string, ShortcutBinding>
        }
      }
    } catch (error) {
      console.error('Failed to load shortcut bindings:', error)
    }

    await loadChromeCommands()
  }

  async function persistBindings(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ [STORAGE_KEY]: customBindings.value })
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customBindings.value))
      }
    } catch (error) {
      console.error('Failed to persist shortcut bindings:', error)
    }
  }

  async function loadChromeCommands(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.commands?.getAll) {
        const commands = await chrome.commands.getAll()
        const result: Record<string, string> = {}
        for (const cmd of commands) {
          if (cmd.name && cmd.shortcut) {
            result[cmd.name] = cmd.shortcut
          }
        }
        chromeCommands.value = result
      }
    } catch (error) {
      console.error('Failed to load Chrome commands:', error)
    }
  }

  return {
    // State
    customBindings,
    chromeCommands,

    // Getters
    getKey,
    isEnabled,

    // Actions
    getDefinition,
    findConflict,
    setBinding,
    resetBinding,
    resetAll,
    loadBindings,
    persistBindings,
    loadChromeCommands,
  }
})
