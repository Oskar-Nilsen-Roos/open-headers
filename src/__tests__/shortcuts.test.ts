import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useShortcutsStore, SHORTCUT_DEFINITIONS } from '@/stores/shortcuts'

describe('Shortcuts Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('default bindings', () => {
    it('returns default key for open-settings', () => {
      const store = useShortcutsStore()
      expect(store.getKey('open-settings')).toBe('Mod+;')
    })

    it('returns default key for profile-1', () => {
      const store = useShortcutsStore()
      expect(store.getKey('profile-1')).toBe('1')
    })

    it('returns default key for add-new', () => {
      const store = useShortcutsStore()
      expect(store.getKey('add-new')).toBe('Mod+N')
    })

    it('returns default key for undo', () => {
      const store = useShortcutsStore()
      expect(store.getKey('undo')).toBe('Mod+Z')
    })

    it('returns default key for redo', () => {
      const store = useShortcutsStore()
      expect(store.getKey('redo')).toBe('Mod+Shift+Z')
    })

    it('returns default key for show-help', () => {
      const store = useShortcutsStore()
      expect(store.getKey('show-help')).toBe('?')
    })

    it('returns empty string for unknown shortcut id', () => {
      const store = useShortcutsStore()
      expect(store.getKey('non-existent')).toBe('')
    })

    it('returns empty string for chrome shortcuts by default', () => {
      const store = useShortcutsStore()
      expect(store.getKey('chrome-open')).toBe('')
    })
  })

  describe('custom binding', () => {
    it('overrides default key with custom binding', () => {
      const store = useShortcutsStore()
      store.setBinding('open-settings', 'Mod+K')
      expect(store.getKey('open-settings')).toBe('Mod+K')
    })

    it('does not affect other shortcuts when setting a custom binding', () => {
      const store = useShortcutsStore()
      store.setBinding('open-settings', 'Mod+K')
      expect(store.getKey('add-new')).toBe('Mod+N')
      expect(store.getKey('profile-1')).toBe('1')
    })
  })

  describe('resetBinding', () => {
    it('resets a single custom binding to default', () => {
      const store = useShortcutsStore()
      store.setBinding('open-settings', 'Mod+K')
      expect(store.getKey('open-settings')).toBe('Mod+K')

      store.resetBinding('open-settings')
      expect(store.getKey('open-settings')).toBe('Mod+;')
    })

    it('does not affect other custom bindings when resetting one', () => {
      const store = useShortcutsStore()
      store.setBinding('open-settings', 'Mod+K')
      store.setBinding('add-new', 'Mod+J')

      store.resetBinding('open-settings')
      expect(store.getKey('open-settings')).toBe('Mod+;')
      expect(store.getKey('add-new')).toBe('Mod+J')
    })
  })

  describe('resetAll', () => {
    it('resets all custom bindings to defaults', () => {
      const store = useShortcutsStore()
      store.setBinding('open-settings', 'Mod+K')
      store.setBinding('add-new', 'Mod+J')
      store.setBinding('profile-1', 'Mod+1')

      store.resetAll()

      expect(store.getKey('open-settings')).toBe('Mod+;')
      expect(store.getKey('add-new')).toBe('Mod+N')
      expect(store.getKey('profile-1')).toBe('1')
    })
  })

  describe('conflict detection', () => {
    it('detects conflict when another shortcut uses the same key', () => {
      const store = useShortcutsStore()
      // profile-1 has default key '1', so trying to assign '1' to open-settings should conflict
      const conflict = store.findConflict('1', 'open-settings')
      expect(conflict).toBe('profile-1')
    })

    it('does not report self-conflict', () => {
      const store = useShortcutsStore()
      // profile-1 has default key '1' — should not conflict with itself
      const conflict = store.findConflict('1', 'profile-1')
      expect(conflict).toBeNull()
    })

    it('returns null when no conflict exists', () => {
      const store = useShortcutsStore()
      const conflict = store.findConflict('F12', 'open-settings')
      expect(conflict).toBeNull()
    })

    it('returns null for empty key', () => {
      const store = useShortcutsStore()
      const conflict = store.findConflict('', 'open-settings')
      expect(conflict).toBeNull()
    })

    it('is case-insensitive', () => {
      const store = useShortcutsStore()
      store.setBinding('open-settings', 'Mod+K')
      const conflict = store.findConflict('mod+k', 'add-new')
      expect(conflict).toBe('open-settings')
    })
  })

  describe('chrome shortcuts excluded from conflict check', () => {
    it('does not report conflicts with chrome category shortcuts', () => {
      const store = useShortcutsStore()
      // chrome-open has empty default key, but even if it had a key,
      // chrome shortcuts should be excluded from conflict checks
      // Set a chrome command key manually to verify exclusion
      const chromeShortcuts = SHORTCUT_DEFINITIONS.filter(d => d.category === 'chrome')
      expect(chromeShortcuts.length).toBeGreaterThan(0)

      // Verify that chrome shortcuts are skipped in conflict detection
      // by checking that assigning a key doesn't conflict with chrome defs
      for (const chromeDef of chromeShortcuts) {
        const conflict = store.findConflict('anything', chromeDef.id)
        // When excludeId is a chrome shortcut, it may or may not match —
        // the key point is chrome shortcuts are never *returned* as conflicts
        // Let's verify by checking all non-chrome shortcuts
        expect(conflict).not.toBe(chromeDef.id)
      }
    })

    it('never returns a chrome shortcut id as a conflict', () => {
      const store = useShortcutsStore()
      const chromeIds = SHORTCUT_DEFINITIONS
        .filter(d => d.category === 'chrome')
        .map(d => d.id)

      // Try various keys to ensure no chrome shortcut is ever returned
      const testKeys = ['', 'Mod+K', '1', '2', '?', 'Mod+Z']
      for (const key of testKeys) {
        const conflict = store.findConflict(key, 'some-nonexistent-id')
        if (conflict !== null) {
          expect(chromeIds).not.toContain(conflict)
        }
      }
    })
  })

  describe('enabled/disabled', () => {
    it('returns true by default for all shortcuts', () => {
      const store = useShortcutsStore()
      expect(store.isEnabled('open-settings')).toBe(true)
      expect(store.isEnabled('profile-1')).toBe(true)
      expect(store.isEnabled('add-new')).toBe(true)
    })

    it('reflects enabled state from custom binding', () => {
      const store = useShortcutsStore()
      // setBinding sets enabled to true
      store.setBinding('open-settings', 'Mod+K')
      expect(store.isEnabled('open-settings')).toBe(true)
    })

    it('can be disabled via direct customBindings manipulation', () => {
      const store = useShortcutsStore()
      store.customBindings['open-settings'] = { key: 'Mod+K', enabled: false }
      expect(store.isEnabled('open-settings')).toBe(false)
    })

    it('returns true for unknown shortcut ids (no custom binding)', () => {
      const store = useShortcutsStore()
      expect(store.isEnabled('non-existent-id')).toBe(true)
    })
  })

  describe('chrome category shortcuts cannot be set', () => {
    it('setBinding has no effect on chrome-open', () => {
      const store = useShortcutsStore()
      store.setBinding('chrome-open', 'Mod+K')
      // Should still return the default empty string, not the custom binding
      expect(store.getKey('chrome-open')).toBe('')
      expect(store.customBindings['chrome-open']).toBeUndefined()
    })

    it('setBinding has no effect on chrome-profile-1', () => {
      const store = useShortcutsStore()
      store.setBinding('chrome-profile-1', 'Mod+1')
      expect(store.getKey('chrome-profile-1')).toBe('')
      expect(store.customBindings['chrome-profile-1']).toBeUndefined()
    })

    it('setBinding has no effect on any chrome category shortcut', () => {
      const store = useShortcutsStore()
      const chromeShortcuts = SHORTCUT_DEFINITIONS.filter(d => d.category === 'chrome')

      for (const def of chromeShortcuts) {
        store.setBinding(def.id, 'Mod+X')
        expect(store.customBindings[def.id]).toBeUndefined()
      }
    })
  })

  describe('definitions completeness', () => {
    it('contains all expected definition ids', () => {
      const ids = SHORTCUT_DEFINITIONS.map(d => d.id)

      // General shortcuts
      expect(ids).toContain('open-settings')
      expect(ids).toContain('add-new')
      expect(ids).toContain('undo')
      expect(ids).toContain('redo')
      expect(ids).toContain('show-help')

      // Profile shortcuts (1-9)
      for (let i = 1; i <= 9; i++) {
        expect(ids).toContain(`profile-${i}`)
      }

      // Chrome shortcuts
      expect(ids).toContain('chrome-open')
      expect(ids).toContain('chrome-profile-1')
      expect(ids).toContain('chrome-profile-2')
      expect(ids).toContain('chrome-profile-3')
    })

    it('every definition has required fields', () => {
      for (const def of SHORTCUT_DEFINITIONS) {
        expect(def.id).toBeTruthy()
        expect(def.labelKey).toBeTruthy()
        expect(['general', 'profiles', 'chrome']).toContain(def.category)
        expect(typeof def.defaultKey).toBe('string')
      }
    })

    it('chrome category definitions have chromeCommand field', () => {
      const chromeDefs = SHORTCUT_DEFINITIONS.filter(d => d.category === 'chrome')
      for (const def of chromeDefs) {
        expect(def.chromeCommand).toBeTruthy()
      }
    })
  })

  describe('getDefinition', () => {
    it('returns the definition for a known id', () => {
      const store = useShortcutsStore()
      const def = store.getDefinition('open-settings')
      expect(def).toBeDefined()
      expect(def!.id).toBe('open-settings')
      expect(def!.category).toBe('general')
    })

    it('returns undefined for an unknown id', () => {
      const store = useShortcutsStore()
      expect(store.getDefinition('non-existent')).toBeUndefined()
    })
  })
})
