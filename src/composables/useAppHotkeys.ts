import type { Ref } from 'vue'
import { computed } from 'vue'
import { useHotkey } from '@tanstack/vue-hotkeys'
import { useHeadersStore } from '@/stores/headers'
import { useShortcutsStore } from '@/stores/shortcuts'
import type { HeaderType } from '@/types'
import type { RegisterableHotkey } from '@tanstack/hotkeys'

type MainTab = HeaderType | 'filters'

export interface AppHotkeyOptions {
  activeMainTab: Ref<MainTab>
  activeHeaderType: Ref<HeaderType>
  onOpenSettings: () => void
  onShowHelp: () => void
  onCloseModals: () => void
}

/**
 * Parses a hotkey string into a RegisterableHotkey.
 * Handles both simple keys like "1" and compound keys like "Mod+N".
 * For the object form with `mod: true`, we parse "Mod+" prefix.
 */
function parseHotkeyBinding(binding: string): RegisterableHotkey {
  if (!binding) return { key: '' }

  // Handle Mod+Shift+Key, Mod+Key patterns -> use object form with mod: true
  if (binding.startsWith('Mod+')) {
    const rest = binding.slice(4) // remove "Mod+"
    if (rest.startsWith('Shift+')) {
      const key = rest.slice(6)
      return { key, mod: true, shift: true }
    }
    return { key: rest, mod: true }
  }

  // Simple key (single character or "Escape", "?", etc.)
  return binding as RegisterableHotkey
}

/**
 * Registers global keyboard shortcuts for the app.
 *
 * Reads bindings from the shortcuts store, making them reactive.
 * Since `useHotkey` from TanStack accepts `MaybeRefOrGetter<RegisterableHotkey>`,
 * changes to bindings in the store take effect immediately.
 *
 * Single keys (1-9, ?) automatically ignore input elements via TanStack defaults.
 * Mod+ shortcuts explicitly set ignoreInputs: true so they don't fire when typing.
 * Escape keeps ignoreInputs: false (default) so it can close modals from any context.
 */
export function useAppHotkeys(options: AppHotkeyOptions) {
  const store = useHeadersStore()
  const shortcutsStore = useShortcutsStore()

  // Profile switching: 1-9 (reactive via shortcuts store)
  for (let i = 1; i <= 9; i++) {
    const hotkeyBinding = computed(() =>
      parseHotkeyBinding(shortcutsStore.getKey(`profile-${i}`))
    )
    const enabled = computed(() => shortcutsStore.isEnabled(`profile-${i}`))

    useHotkey(hotkeyBinding, () => {
      const profileIndex = i - 1
      if (profileIndex < store.profiles.length) {
        store.setActiveProfile(store.profiles[profileIndex]!.id)
      }
    }, { enabled })
  }

  // Open settings
  const openSettingsKey = computed(() =>
    parseHotkeyBinding(shortcutsStore.getKey('open-settings'))
  )
  const openSettingsEnabled = computed(() => shortcutsStore.isEnabled('open-settings'))

  useHotkey(
    openSettingsKey,
    (e) => {
      e.preventDefault()
      options.onOpenSettings()
    },
    computed(() => ({ ignoreInputs: true, enabled: openSettingsEnabled.value })),
  )

  // Add new item
  const addNewKey = computed(() =>
    parseHotkeyBinding(shortcutsStore.getKey('add-new'))
  )
  const addNewEnabled = computed(() => shortcutsStore.isEnabled('add-new'))

  useHotkey(
    addNewKey,
    (e) => {
      e.preventDefault()
      if (options.activeMainTab.value === 'filters') {
        store.addUrlFilter('include')
      } else {
        store.addHeader(options.activeHeaderType.value)
      }
    },
    computed(() => ({ ignoreInputs: true, enabled: addNewEnabled.value })),
  )

  // Undo
  const undoKey = computed(() =>
    parseHotkeyBinding(shortcutsStore.getKey('undo'))
  )
  const undoEnabled = computed(() => shortcutsStore.isEnabled('undo'))

  useHotkey(
    undoKey,
    (e) => {
      e.preventDefault()
      store.undo()
    },
    computed(() => ({ ignoreInputs: true, enabled: undoEnabled.value })),
  )

  // Redo
  const redoKey = computed(() =>
    parseHotkeyBinding(shortcutsStore.getKey('redo'))
  )
  const redoEnabled = computed(() => shortcutsStore.isEnabled('redo'))

  useHotkey(
    redoKey,
    (e) => {
      e.preventDefault()
      store.redo()
    },
    computed(() => ({ ignoreInputs: true, enabled: redoEnabled.value })),
  )

  // Show help
  const showHelpKey = computed(() =>
    parseHotkeyBinding(shortcutsStore.getKey('show-help'))
  )
  const showHelpEnabled = computed(() => shortcutsStore.isEnabled('show-help'))

  useHotkey(
    showHelpKey,
    () => {
      options.onShowHelp()
    },
    { enabled: showHelpEnabled },
  )

  // Close modals: Escape (always hardcoded, ignoreInputs defaults to false)
  useHotkey('Escape', () => {
    options.onCloseModals()
  })
}
