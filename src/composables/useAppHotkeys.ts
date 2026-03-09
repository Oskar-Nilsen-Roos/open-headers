import type { Ref } from 'vue'
import { useHotkey } from '@tanstack/vue-hotkeys'
import { useHeadersStore } from '@/stores/headers'
import type { HeaderType } from '@/types'

type MainTab = HeaderType | 'filters'

export interface AppHotkeyOptions {
  activeMainTab: Ref<MainTab>
  activeHeaderType: Ref<HeaderType>
  onOpenSettings: () => void
  onShowHelp: () => void
  onCloseModals: () => void
}

/**
 * Registers global keyboard shortcuts for the app.
 *
 * Single keys (1-9, ?) automatically ignore input elements via TanStack defaults.
 * Mod+ shortcuts explicitly set ignoreInputs: true so they don't fire when typing.
 * Escape keeps ignoreInputs: false (default) so it can close modals from any context.
 */
export function useAppHotkeys(options: AppHotkeyOptions) {
  const store = useHeadersStore()

  // Profile switching: 1-9
  for (let i = 1; i <= 9; i++) {
    const key = String(i) as '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
    useHotkey(key, () => {
      const profileIndex = i - 1
      if (profileIndex < store.profiles.length) {
        store.setActiveProfile(store.profiles[profileIndex]!.id)
      }
    })
  }

  // Open settings: Mod+;
  useHotkey(
    { key: ';', mod: true },
    (e) => {
      e.preventDefault()
      options.onOpenSettings()
    },
    { ignoreInputs: true },
  )

  // Add new item: Mod+N
  useHotkey(
    'Mod+N',
    (e) => {
      e.preventDefault()
      if (options.activeMainTab.value === 'filters') {
        store.addUrlFilter('include')
      } else {
        store.addHeader(options.activeHeaderType.value)
      }
    },
    { ignoreInputs: true },
  )

  // Undo: Mod+Z
  useHotkey(
    'Mod+Z',
    (e) => {
      e.preventDefault()
      store.undo()
    },
    { ignoreInputs: true },
  )

  // Redo: Mod+Shift+Z
  useHotkey(
    'Mod+Shift+Z',
    (e) => {
      e.preventDefault()
      store.redo()
    },
    { ignoreInputs: true },
  )

  // Show help: ? (Shift+/)
  useHotkey(
    { key: '?' },
    () => {
      options.onShowHelp()
    },
  )

  // Close modals: Escape (ignoreInputs defaults to false for Escape)
  useHotkey('Escape', () => {
    options.onCloseModals()
  })
}
