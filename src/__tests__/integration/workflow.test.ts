import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHeadersStore } from '@/stores/headers'

// Mock chrome.storage
vi.stubGlobal('chrome', undefined)

/**
 * Integration tests for complete user workflows
 * These tests verify that multiple store operations work together correctly
 */
describe('Integration Workflows', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('Complete header management workflow', () => {
    it('creates profile, adds headers, modifies them, and exports', async () => {
      const store = useHeadersStore()
      await store.loadState()

      // 1. Rename the default profile
      const profileId = store.activeProfileId!
      store.updateProfile(profileId, { name: 'API Headers', color: '#2563eb' })
      expect(store.activeProfile?.name).toBe('API Headers')
      expect(store.activeProfile?.color).toBe('#2563eb')

      // 2. Add multiple headers
      store.addHeader('request')
      store.addHeader('request')
      store.addHeader('request')
      expect(store.requestHeaders.length).toBe(3)

      // 3. Configure headers
      const headers = store.requestHeaders
      store.updateHeader(headers[0]!.id, {
        name: 'Authorization',
        value: 'Bearer my-token',
        comment: 'Auth token',
      })
      store.updateHeader(headers[1]!.id, {
        name: 'X-API-Key',
        value: 'api-key-123',
        comment: 'API key',
      })
      store.updateHeader(headers[2]!.id, {
        name: 'Content-Type',
        value: 'application/json',
      })

      // 4. Toggle one header (starts disabled, becomes enabled)
      store.toggleHeader(headers[1]!.id)
      expect(headers[1]!.enabled).toBe(true)

      // 5. Reorder headers
      store.reorderHeaders(
        [headers[2]!.id, headers[0]!.id, headers[1]!.id],
        'request'
      )
      expect(store.requestHeaders[0]?.name).toBe('Content-Type')
      expect(store.requestHeaders[1]?.name).toBe('Authorization')
      expect(store.requestHeaders[2]?.name).toBe('X-API-Key')

      // 6. Export and verify
      const exported = store.exportProfiles()
      const data = JSON.parse(exported)
      expect(data.profiles.length).toBe(1)
      expect(data.profiles[0].name).toBe('API Headers')
      expect(data.profiles[0].headers.length).toBe(3)

      // 7. Undo reorder
      store.undo()
      expect(store.requestHeaders[0]?.name).toBe('Authorization')
    })
  })

  describe('Multi-profile workflow', () => {
    it('manages multiple profiles with different headers', async () => {
      const store = useHeadersStore()
      await store.loadState()

      // 1. Setup Development profile
      store.updateProfile(store.activeProfileId!, { name: 'Development' })
      store.addHeader('request')
      store.updateHeader(store.requestHeaders[0]!.id, {
        name: 'X-Environment',
        value: 'development',
      })
      const devProfileId = store.activeProfileId!

      // 2. Create and setup Production profile
      store.addProfile()
      const prodProfileId = store.activeProfileId!
      store.updateProfile(prodProfileId, { name: 'Production' })
      store.addHeader('request')
      store.updateHeader(store.requestHeaders[0]!.id, {
        name: 'X-Environment',
        value: 'production',
      })

      // 3. Create and setup Staging profile
      store.addProfile()
      const stagingProfileId = store.activeProfileId!
      store.updateProfile(stagingProfileId, { name: 'Staging' })
      store.addHeader('request')
      store.updateHeader(store.requestHeaders[0]!.id, {
        name: 'X-Environment',
        value: 'staging',
      })

      // 4. Verify profile count
      expect(store.profiles.length).toBe(3)

      // 5. Switch profiles and verify isolated headers
      store.setActiveProfile(devProfileId)
      expect(store.requestHeaders[0]?.value).toBe('development')

      store.setActiveProfile(prodProfileId)
      expect(store.requestHeaders[0]?.value).toBe('production')

      store.setActiveProfile(stagingProfileId)
      expect(store.requestHeaders[0]?.value).toBe('staging')

      // 6. Reorder profiles
      store.reorderProfiles([stagingProfileId, prodProfileId, devProfileId])
      expect(store.profiles[0]?.name).toBe('Staging')
      expect(store.profiles[1]?.name).toBe('Production')
      expect(store.profiles[2]?.name).toBe('Development')

      // 7. Delete middle profile
      store.removeProfile(prodProfileId)
      expect(store.profiles.length).toBe(2)
      expect(store.profiles.find(p => p.id === prodProfileId)).toBeUndefined()

      // 8. Duplicate remaining profile
      store.setActiveProfile(devProfileId)
      store.duplicateProfile(devProfileId)
      expect(store.profiles.length).toBe(3)
      expect(store.profiles[2]?.name).toBe('Development (Copy)')
    })
  })

  describe('Import/Export workflow', () => {
    it('exports profiles and imports them to a new store', async () => {
      // Setup source store
      const sourceStore = useHeadersStore()
      await sourceStore.loadState()

      sourceStore.updateProfile(sourceStore.activeProfileId!, {
        name: 'Exported Profile',
        color: '#dc2626',
      })
      sourceStore.addHeader('request')
      sourceStore.updateHeader(sourceStore.requestHeaders[0]!.id, {
        name: 'X-Exported',
        value: 'exported-value',
        comment: 'Exported header',
      })

      const exportedData = sourceStore.exportProfiles()

      // Clear and setup target store
      localStorage.clear()
      setActivePinia(createPinia())
      const targetStore = useHeadersStore()
      await targetStore.loadState()

      // Import
      const result = targetStore.importProfiles(exportedData)
      expect(result).toBe(true)

      // Verify import
      expect(targetStore.profiles.length).toBe(2) // Default + imported
      const importedProfile = targetStore.profiles[1]!
      expect(importedProfile.name).toBe('Exported Profile')
      expect(importedProfile.color).toBe('#dc2626')
      expect(importedProfile.headers.length).toBe(1)
      expect(importedProfile.headers[0]!.name).toBe('X-Exported')

      // Verify IDs are different (regenerated on import)
      expect(importedProfile.id).not.toBe(sourceStore.profiles[0]!.id)
    })
  })

  describe('Undo/Redo workflow', () => {
    it('supports complex undo/redo sequences', async () => {
      const store = useHeadersStore()
      await store.loadState()

      // Initial state - 0 headers
      expect(store.requestHeaders.length).toBe(0)
      expect(store.canUndo).toBe(false)

      // Add header - history: [initial, 1 header]
      store.addHeader('request')
      expect(store.requestHeaders.length).toBe(1)
      expect(store.canUndo).toBe(true)

      // Update header - history: [initial, 1 header, 1 header updated]
      store.updateHeader(store.requestHeaders[0]!.id, { name: 'Step1' })
      expect(store.requestHeaders[0]?.name).toBe('Step1')

      // Update again - history: [initial, 1 header, updated, updated again]
      store.updateHeader(store.requestHeaders[0]!.id, { name: 'Step2' })
      expect(store.requestHeaders[0]?.name).toBe('Step2')

      // Add another header
      store.addHeader('request')
      expect(store.requestHeaders.length).toBe(2)

      // Undo add
      store.undo()
      expect(store.requestHeaders.length).toBe(1)
      expect(store.canRedo).toBe(true)

      // Undo update
      store.undo()
      expect(store.requestHeaders[0]?.name).toBe('Step1')

      // Redo update
      store.redo()
      expect(store.requestHeaders[0]?.name).toBe('Step2')

      // New action clears redo history
      store.updateHeader(store.requestHeaders[0]!.id, { name: 'NewPath' })
      expect(store.canRedo).toBe(false)
      expect(store.requestHeaders[0]?.name).toBe('NewPath')

      // Multiple undos back to start
      store.undo() // NewPath -> Step2
      store.undo() // Step2 -> Step1
      store.undo() // Step1 -> empty name
      store.undo() // 1 header -> 0 headers
      expect(store.requestHeaders.length).toBe(0)
      expect(store.canUndo).toBe(false)
    })
  })

  describe('URL Filter workflow', () => {
    it('manages URL filters with headers', async () => {
      const store = useHeadersStore()
      await store.loadState()

      // Add headers
      store.addHeader('request')
      store.updateHeader(store.requestHeaders[0]!.id, {
        name: 'Authorization',
        value: 'Bearer token',
      })

      // Add include filter
      store.addUrlFilter('include')
      expect(store.activeProfile?.urlFilters.length).toBe(1)

      const filterId = store.activeProfile?.urlFilters[0]?.id!
      store.updateUrlFilter(filterId, {
        pattern: '*.api.example.com/*',
        enabled: true,
      })

      expect(store.activeProfile?.urlFilters[0]?.pattern).toBe('*.api.example.com/*')

      // Add another filter
      store.addUrlFilter('include')
      store.updateUrlFilter(store.activeProfile?.urlFilters[1]?.id!, {
        pattern: '*.staging.example.com/*',
      })

      expect(store.activeProfile?.urlFilters.length).toBe(2)

      // Disable first filter
      store.updateUrlFilter(filterId, { enabled: false })
      expect(store.activeProfile?.urlFilters[0]?.enabled).toBe(false)

      // Remove second filter
      store.removeUrlFilter(store.activeProfile?.urlFilters[1]?.id!)
      expect(store.activeProfile?.urlFilters.length).toBe(1)
    })
  })

  describe('Dark mode persistence', () => {
    it('persists dark mode preference across sessions', async () => {
      const store1 = useHeadersStore()
      await store1.loadState()

      expect(store1.darkModePreference).toBe('system')
      store1.toggleDarkMode() // system -> dark
      expect(store1.darkModePreference).toBe('dark')
      expect(store1.isDarkMode).toBe(true)

      // Simulate new session
      setActivePinia(createPinia())
      const store2 = useHeadersStore()
      await store2.loadState()

      expect(store2.darkModePreference).toBe('dark')
      expect(store2.isDarkMode).toBe(true)
    })

    it('persists light mode preference across sessions', async () => {
      const store1 = useHeadersStore()
      await store1.loadState()

      store1.setDarkModePreference('light')
      expect(store1.isDarkMode).toBe(false)

      // Simulate new session
      setActivePinia(createPinia())
      const store2 = useHeadersStore()
      await store2.loadState()

      expect(store2.darkModePreference).toBe('light')
      expect(store2.isDarkMode).toBe(false)
    })
  })

  describe('Header sorting workflow', () => {
    it('sorts headers by different fields', async () => {
      const store = useHeadersStore()
      await store.loadState()

      // Add headers with different names/values
      store.addHeader('request')
      store.addHeader('request')
      store.addHeader('request')

      store.updateHeader(store.requestHeaders[0]!.id, {
        name: 'Z-Header',
        value: 'apple',
        comment: 'third',
      })
      store.updateHeader(store.requestHeaders[1]!.id, {
        name: 'A-Header',
        value: 'cherry',
        comment: 'first',
      })
      store.updateHeader(store.requestHeaders[2]!.id, {
        name: 'M-Header',
        value: 'banana',
        comment: 'second',
      })

      // Sort by name
      store.sortHeaders('name', 'request')
      expect(store.requestHeaders.map(h => h.name)).toEqual([
        'A-Header',
        'M-Header',
        'Z-Header',
      ])

      // Sort by value
      store.sortHeaders('value', 'request')
      expect(store.requestHeaders.map(h => h.value)).toEqual([
        'apple',
        'banana',
        'cherry',
      ])

      // Sort by comment
      store.sortHeaders('comment', 'request')
      expect(store.requestHeaders.map(h => h.comment)).toEqual([
        'first',
        'second',
        'third',
      ])
    })
  })

  describe('Header duplication workflow', () => {
    it('duplicates and modifies headers correctly', async () => {
      const store = useHeadersStore()
      await store.loadState()

      // Create original header
      store.addHeader('request')
      store.updateHeader(store.requestHeaders[0]!.id, {
        name: 'X-Original',
        value: 'original-value',
        comment: 'Original header',
      })

      const originalId = store.requestHeaders[0]!.id

      // Duplicate
      store.duplicateHeader(originalId)
      expect(store.requestHeaders.length).toBe(2)

      // Verify duplicate is identical except ID
      const duplicate = store.requestHeaders[1]!
      expect(duplicate.id).not.toBe(originalId)
      expect(duplicate.name).toBe('X-Original')
      expect(duplicate.value).toBe('original-value')
      expect(duplicate.comment).toBe('Original header')

      // Modify duplicate
      store.updateHeader(duplicate.id, {
        name: 'X-Duplicate',
        value: 'duplicate-value',
      })

      // Verify original unchanged
      expect(store.requestHeaders[0]?.name).toBe('X-Original')
      expect(store.requestHeaders[0]?.value).toBe('original-value')

      // Verify duplicate changed
      expect(store.requestHeaders[1]?.name).toBe('X-Duplicate')
      expect(store.requestHeaders[1]?.value).toBe('duplicate-value')
    })
  })

  describe('Profile with all features', () => {
    it('creates a fully configured profile', async () => {
      const store = useHeadersStore()
      await store.loadState()

      // Configure profile
      store.updateProfile(store.activeProfileId!, {
        name: 'Full Featured Profile',
        color: '#059669',
      })

      // Add request headers
      store.addHeader('request')
      store.addHeader('request')
      store.updateHeader(store.requestHeaders[0]!.id, {
        name: 'Authorization',
        value: 'Bearer token',
        operation: 'set',
      })
      store.updateHeader(store.requestHeaders[1]!.id, {
        name: 'Cache-Control',
        value: '',
        operation: 'remove',
      })

      // Add response headers
      store.addHeader('response')
      store.updateHeader(store.responseHeaders[0]!.id, {
        name: 'X-Custom-Response',
        value: 'modified',
      })

      // Add URL filters
      store.addUrlFilter('include')
      store.updateUrlFilter(store.activeProfile?.urlFilters[0]?.id!, {
        pattern: '*.example.com/*',
      })

      // Verify complete configuration
      expect(store.activeProfile?.name).toBe('Full Featured Profile')
      expect(store.activeProfile?.color).toBe('#059669')
      expect(store.requestHeaders.length).toBe(2)
      expect(store.responseHeaders.length).toBe(1)
      expect(store.activeProfile?.urlFilters.length).toBe(1)

      // Export and verify structure
      const exported = JSON.parse(store.exportProfiles())
      const profile = exported.profiles[0]
      expect(profile.headers.filter((h: any) => h.type === 'request').length).toBe(2)
      expect(profile.headers.filter((h: any) => h.type === 'response').length).toBe(1)
      expect(profile.urlFilters.length).toBe(1)
    })
  })
})
