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
 * Handles simple keys ("1"), modifier combos ("Mod+N", "Shift+?", "Alt+K"),
 * and multi-modifier combos ("Mod+Shift+Z").
 * The recorder outputs "Mod+" for platform-appropriate modifier (Cmd on Mac, Ctrl elsewhere).
 */
function parseHotkeyBinding(binding: string): RegisterableHotkey {
  if (!binding) return { key: '' }

  const parts = binding.split('+')
  if (parts.length === 1) {
    // Simple key (single character, "Escape", "?", etc.)
    return binding as RegisterableHotkey
  }

  // Compound key — extract modifiers and the final key
  const key = parts[parts.length - 1]!
  const modifiers = new Set(parts.slice(0, -1).map(m => m.toLowerCase()))

  const result: { key: string; mod?: boolean; shift?: boolean; alt?: boolean; ctrl?: boolean; meta?: boolean } = { key }

  if (modifiers.has('mod')) result.mod = true
  if (modifiers.has('shift')) result.shift = true
  if (modifiers.has('alt')) result.alt = true
  if (modifiers.has('control')) result.ctrl = true
  if (modifiers.has('meta')) result.meta = true

  return result
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
