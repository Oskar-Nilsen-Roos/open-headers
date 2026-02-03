import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHeadersStore } from '../stores/headers'

// Mock chrome.storage
vi.stubGlobal('chrome', undefined)

describe('useHeadersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('initialization', () => {
    it('starts with empty state', () => {
      const store = useHeadersStore()

      expect(store.profiles).toEqual([])
      expect(store.activeProfileId).toBeNull()
      expect(store.isInitialized).toBe(false)
    })

    it('creates default profile on loadState when no profiles exist', async () => {
      const store = useHeadersStore()
      await store.loadState()

      expect(store.profiles.length).toBe(1)
      expect(store.profiles[0]?.name).toBe('Profile 1')
      expect(store.activeProfileId).toBe(store.profiles[0]?.id)
      expect(store.isInitialized).toBe(true)
    })
  })

  describe('profile management', () => {
    it('adds a new profile', async () => {
      const store = useHeadersStore()
      await store.loadState()

      const initialCount = store.profiles.length
      store.addProfile()

      expect(store.profiles.length).toBe(initialCount + 1)
      expect(store.activeProfileId).toBe(store.profiles[store.profiles.length - 1]?.id)
    })

    it('removes a profile', async () => {
      const store = useHeadersStore()
      await store.loadState()
      store.addProfile()

      const profileToRemove = store.profiles[1]
      if (!profileToRemove) throw new Error('No profile to remove')

      store.removeProfile(profileToRemove.id)

      expect(store.profiles.length).toBe(1)
      expect(store.profiles.find(p => p.id === profileToRemove.id)).toBeUndefined()
    })

    it('ensures at least one profile exists after removal', async () => {
      const store = useHeadersStore()
      await store.loadState()

      const profileId = store.profiles[0]?.id
      if (!profileId) throw new Error('No profile')

      store.removeProfile(profileId)

      expect(store.profiles.length).toBe(1)
    })

    it('duplicates a profile', async () => {
      const store = useHeadersStore()
      await store.loadState()

      const originalProfile = store.profiles[0]
      if (!originalProfile) throw new Error('No profile')

      store.duplicateProfile(originalProfile.id)

      expect(store.profiles.length).toBe(2)
      expect(store.profiles[1]?.name).toBe(`${originalProfile.name} (Copy)`)
      expect(store.profiles[1]?.id).not.toBe(originalProfile.id)
    })

    it('updates profile properties', async () => {
      const store = useHeadersStore()
      await store.loadState()

      const profile = store.profiles[0]
      if (!profile) throw new Error('No profile')

      store.updateProfile(profile.id, { name: 'New Name', color: '#ff0000' })

      expect(profile.name).toBe('New Name')
      expect(profile.color).toBe('#ff0000')
    })
  })

  describe('header management', () => {
    it('adds a request header', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')

      expect(store.requestHeaders.length).toBe(1)
      expect(store.requestHeaders[0]?.type).toBe('request')
    })

    it('adds a response header', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('response')

      expect(store.responseHeaders.length).toBe(1)
      expect(store.responseHeaders[0]?.type).toBe('response')
    })

    it('removes a header', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      const header = store.requestHeaders[0]
      if (!header) throw new Error('No header')

      store.removeHeader(header.id)

      expect(store.requestHeaders.length).toBe(0)
    })

    it('updates a header', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      const header = store.requestHeaders[0]
      if (!header) throw new Error('No header')

      store.updateHeader(header.id, { name: 'X-Custom-Header', value: 'test-value' })

      expect(header.name).toBe('X-Custom-Header')
      expect(header.value).toBe('test-value')
    })

    it('toggles header enabled state', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      const header = store.requestHeaders[0]
      if (!header) throw new Error('No header')

      expect(header.enabled).toBe(true)
      store.toggleHeader(header.id)
      expect(header.enabled).toBe(false)
    })

    it('clears all headers of a specific type', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      store.addHeader('request')
      store.addHeader('response')

      store.clearHeaders('request')

      expect(store.requestHeaders.length).toBe(0)
      expect(store.responseHeaders.length).toBe(1)
    })

    it('sorts headers by name', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      store.addHeader('request')
      store.addHeader('request')

      const headers = store.requestHeaders
      if (headers[0]) headers[0].name = 'Z-Header'
      if (headers[1]) headers[1].name = 'A-Header'
      if (headers[2]) headers[2].name = 'M-Header'

      store.sortHeaders('name', 'request')

      expect(store.requestHeaders[0]?.name).toBe('A-Header')
      expect(store.requestHeaders[1]?.name).toBe('M-Header')
      expect(store.requestHeaders[2]?.name).toBe('Z-Header')
    })

    it('reorders headers by drag and drop', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      store.addHeader('request')
      store.addHeader('request')

      const headers = store.requestHeaders
      if (headers[0]) store.updateHeader(headers[0].id, { name: 'First' })
      if (headers[1]) store.updateHeader(headers[1].id, { name: 'Second' })
      if (headers[2]) store.updateHeader(headers[2].id, { name: 'Third' })

      // Get current IDs
      const firstId = store.requestHeaders[0]!.id
      const secondId = store.requestHeaders[1]!.id
      const thirdId = store.requestHeaders[2]!.id

      // Reorder: Third, First, Second
      store.reorderHeaders([thirdId, firstId, secondId], 'request')

      expect(store.requestHeaders[0]?.name).toBe('Third')
      expect(store.requestHeaders[1]?.name).toBe('First')
      expect(store.requestHeaders[2]?.name).toBe('Second')
    })
  })

  describe('undo/redo', () => {
    it('can undo and redo actions', async () => {
      const store = useHeadersStore()
      await store.loadState()

      expect(store.canUndo).toBe(false)
      expect(store.canRedo).toBe(false)

      store.addHeader('request')
      expect(store.canUndo).toBe(true)
      expect(store.canRedo).toBe(false)
      expect(store.requestHeaders.length).toBe(1)

      store.undo()
      expect(store.canUndo).toBe(false)
      expect(store.canRedo).toBe(true)
      expect(store.requestHeaders.length).toBe(0)

      store.redo()
      expect(store.canUndo).toBe(true)
      expect(store.canRedo).toBe(false)
      expect(store.requestHeaders.length).toBe(1)
    })
  })

  describe('import/export', () => {
    it('exports profiles as JSON', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      const header = store.requestHeaders[0]
      if (header) {
        header.name = 'X-Test'
        header.value = 'test-value'
      }

      const exported = store.exportProfiles()
      const data = JSON.parse(exported)

      expect(data.version).toBe(1)
      expect(data.profiles).toBeDefined()
      expect(data.profiles.length).toBe(1)
      expect(data.exportedAt).toBeDefined()
    })

    it('imports profiles from JSON', async () => {
      const store = useHeadersStore()
      await store.loadState()

      const importData = JSON.stringify({
        version: 1,
        profiles: [
          {
            id: 'test-id',
            name: 'Imported Profile',
            color: '#ff0000',
            headers: [
              {
                id: 'header-id',
                name: 'X-Imported',
                value: 'imported-value',
                type: 'request',
                enabled: true,
                comment: '',
                operation: 'set',
              },
            ],
            urlFilters: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      })

      const result = store.importProfiles(importData)

      expect(result).toBe(true)
      expect(store.profiles.length).toBe(2) // Original + imported
      expect(store.profiles[1]?.name).toBe('Imported Profile')
    })

    it('rejects invalid import data', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const store = useHeadersStore()
      await store.loadState()

      const result = store.importProfiles('invalid json')

      expect(result).toBe(false)
      consoleSpy.mockRestore()
    })

    it('imports ModHeader format profiles', async () => {
      const store = useHeadersStore()
      await store.loadState()

      const modHeaderData = JSON.stringify([
        {
          title: 'ModHeader Profile',
          shortTitle: '1',
          headers: [
            {
              enabled: true,
              name: 'X-Custom-Header',
              value: 'custom-value',
            },
            {
              enabled: false,
              name: 'X-Append-Header',
              value: 'append-value',
              appendMode: true,
            },
          ],
          hideComment: false,
          version: 2,
        },
      ])

      const result = store.importProfiles(modHeaderData)

      expect(result).toBe(true)
      expect(store.profiles.length).toBe(2) // Original + imported
      const importedProfile = store.profiles[1]
      expect(importedProfile?.name).toBe('ModHeader Profile')
      expect(importedProfile?.headers.length).toBe(2)

      // Check first header (set operation)
      const header1 = importedProfile?.headers[0]
      expect(header1?.name).toBe('X-Custom-Header')
      expect(header1?.value).toBe('custom-value')
      expect(header1?.enabled).toBe(true)
      expect(header1?.operation).toBe('set')
      expect(header1?.type).toBe('request')

      // Check second header (append operation)
      const header2 = importedProfile?.headers[1]
      expect(header2?.name).toBe('X-Append-Header')
      expect(header2?.operation).toBe('append')
      expect(header2?.enabled).toBe(false)
    })

    it('imports ModHeader format with response headers', async () => {
      const store = useHeadersStore()
      await store.loadState()

      const modHeaderData = JSON.stringify([
        {
          title: 'Profile with Response Headers',
          headers: [
            { enabled: true, name: 'X-Request', value: 'req-value' },
          ],
          respHeaders: [
            { enabled: true, name: 'X-Response', value: 'resp-value' },
          ],
        },
      ])

      const result = store.importProfiles(modHeaderData)

      expect(result).toBe(true)
      const importedProfile = store.profiles[1]
      expect(importedProfile?.headers.length).toBe(2)

      const requestHeader = importedProfile?.headers.find(h => h.type === 'request')
      const responseHeader = importedProfile?.headers.find(h => h.type === 'response')

      expect(requestHeader?.name).toBe('X-Request')
      expect(responseHeader?.name).toBe('X-Response')
      expect(responseHeader?.type).toBe('response')
    })

    it('imports multiple ModHeader profiles with different colors', async () => {
      const store = useHeadersStore()
      await store.loadState()

      const modHeaderData = JSON.stringify([
        { title: 'Profile A', headers: [] },
        { title: 'Profile B', headers: [] },
        { title: 'Profile C', headers: [] },
      ])

      const result = store.importProfiles(modHeaderData)

      expect(result).toBe(true)
      expect(store.profiles.length).toBe(4) // Original + 3 imported

      // Each imported profile should have a different color
      const importedColors = store.profiles.slice(1).map(p => p.color)
      expect(new Set(importedColors).size).toBe(3)
    })
  })

  describe('dark mode', () => {
    it('defaults to system preference', async () => {
      const store = useHeadersStore()
      await store.loadState()

      expect(store.darkModePreference).toBe('system')
    })

    it('cycles through dark mode preferences: system -> dark -> light -> system', async () => {
      const store = useHeadersStore()
      await store.loadState()

      expect(store.darkModePreference).toBe('system')
      store.toggleDarkMode()
      expect(store.darkModePreference).toBe('dark')
      store.toggleDarkMode()
      expect(store.darkModePreference).toBe('light')
      store.toggleDarkMode()
      expect(store.darkModePreference).toBe('system')
    })

    it('sets dark mode preference directly', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.setDarkModePreference('dark')
      expect(store.darkModePreference).toBe('dark')
      expect(store.isDarkMode).toBe(true)

      store.setDarkModePreference('light')
      expect(store.darkModePreference).toBe('light')
      expect(store.isDarkMode).toBe(false)
    })

    it('respects manual dark mode override', async () => {
      const store = useHeadersStore()
      await store.loadState()

      // When preference is 'dark', isDarkMode should be true regardless of system
      store.setDarkModePreference('dark')
      expect(store.isDarkMode).toBe(true)

      // When preference is 'light', isDarkMode should be false regardless of system
      store.setDarkModePreference('light')
      expect(store.isDarkMode).toBe(false)
    })
  })

  describe('profile reordering', () => {
    it('reorders profiles by drag and drop', async () => {
      const store = useHeadersStore()
      await store.loadState()

      // Create 3 profiles
      store.addProfile()
      store.addProfile()

      // Update names for clarity
      store.updateProfile(store.profiles[0]!.id, { name: 'First' })
      store.updateProfile(store.profiles[1]!.id, { name: 'Second' })
      store.updateProfile(store.profiles[2]!.id, { name: 'Third' })

      const firstId = store.profiles[0]!.id
      const secondId = store.profiles[1]!.id
      const thirdId = store.profiles[2]!.id

      // Reorder: Third, First, Second
      store.reorderProfiles([thirdId, firstId, secondId])

      expect(store.profiles[0]?.name).toBe('Third')
      expect(store.profiles[1]?.name).toBe('First')
      expect(store.profiles[2]?.name).toBe('Second')
    })

    it('maintains profile data after reorder', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addProfile()

      // Add header to first profile
      store.setActiveProfile(store.profiles[0]!.id)
      store.addHeader('request')
      store.updateHeader(store.requestHeaders[0]!.id, { name: 'X-First' })

      // Add header to second profile
      store.setActiveProfile(store.profiles[1]!.id)
      store.addHeader('request')
      store.updateHeader(store.requestHeaders[0]!.id, { name: 'X-Second' })

      const firstId = store.profiles[0]!.id
      const secondId = store.profiles[1]!.id

      // Reorder
      store.reorderProfiles([secondId, firstId])

      // Verify headers are still associated correctly
      store.setActiveProfile(secondId)
      expect(store.requestHeaders[0]?.name).toBe('X-Second')

      store.setActiveProfile(firstId)
      expect(store.requestHeaders[0]?.name).toBe('X-First')
    })
  })

  describe('url filters', () => {
    it('adds a url filter', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addUrlFilter('include')

      expect(store.activeProfile?.urlFilters.length).toBe(1)
      expect(store.activeProfile?.urlFilters[0]?.type).toBe('include')
      expect(store.activeProfile?.urlFilters[0]?.matchType).toBe('host_equals')
    })

    it('adds an exclude filter', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addUrlFilter('exclude')

      expect(store.activeProfile?.urlFilters[0]?.type).toBe('exclude')
      expect(store.activeProfile?.urlFilters[0]?.matchType).toBe('host_equals')
    })

    it('removes a url filter', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addUrlFilter('include')
      const filterId = store.activeProfile?.urlFilters[0]?.id
      if (!filterId) throw new Error('No filter')

      store.removeUrlFilter(filterId)

      expect(store.activeProfile?.urlFilters.length).toBe(0)
    })

    it('updates a url filter', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addUrlFilter('include')
      const filterId = store.activeProfile?.urlFilters[0]?.id
      if (!filterId) throw new Error('No filter')

      store.updateUrlFilter(filterId, { pattern: '*.example.com/*', enabled: false })

      expect(store.activeProfile?.urlFilters[0]?.pattern).toBe('*.example.com/*')
      expect(store.activeProfile?.urlFilters[0]?.enabled).toBe(false)
    })

    it('clears all url filters', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addUrlFilter('include')
      store.addUrlFilter('exclude')
      expect(store.activeProfile?.urlFilters.length).toBe(2)

      store.clearUrlFilters()
      expect(store.activeProfile?.urlFilters.length).toBe(0)
    })
  })

  describe('header duplication', () => {
    it('duplicates a header with all properties', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      const original = store.requestHeaders[0]!
      store.updateHeader(original.id, {
        name: 'X-Original',
        value: 'original-value',
        comment: 'original comment',
        operation: 'append',
      })
      store.toggleHeader(original.id) // disable it

      store.duplicateHeader(original.id)

      expect(store.requestHeaders.length).toBe(2)
      const duplicate = store.requestHeaders[1]!
      expect(duplicate.id).not.toBe(original.id)
      expect(duplicate.name).toBe('X-Original')
      expect(duplicate.value).toBe('original-value')
      expect(duplicate.comment).toBe('original comment')
      expect(duplicate.operation).toBe('append')
      expect(duplicate.enabled).toBe(false)
    })

    it('inserts duplicate after original', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      store.addHeader('request')
      store.addHeader('request')

      store.updateHeader(store.requestHeaders[0]!.id, { name: 'First' })
      store.updateHeader(store.requestHeaders[1]!.id, { name: 'Second' })
      store.updateHeader(store.requestHeaders[2]!.id, { name: 'Third' })

      // Duplicate the second one
      store.duplicateHeader(store.requestHeaders[1]!.id)

      expect(store.requestHeaders.length).toBe(4)
      expect(store.requestHeaders[0]?.name).toBe('First')
      expect(store.requestHeaders[1]?.name).toBe('Second')
      expect(store.requestHeaders[2]?.name).toBe('Second') // duplicate
      expect(store.requestHeaders[3]?.name).toBe('Third')
    })
  })

  describe('persistence', () => {
    it('persists state to localStorage', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      store.updateHeader(store.requestHeaders[0]!.id, { name: 'X-Persisted' })

      // Check localStorage
      const stored = localStorage.getItem('openheaders_state')
      expect(stored).not.toBeNull()

      const parsed = JSON.parse(stored!)
      expect(parsed.profiles[0].headers[0].name).toBe('X-Persisted')
    })

    it('loads state from localStorage', async () => {
      // Pre-populate localStorage
      const state = {
        profiles: [{
          id: 'test-profile',
          name: 'Loaded Profile',
          color: '#ff0000',
          headers: [{
            id: 'test-header',
            name: 'X-Loaded',
            value: 'loaded-value',
            comment: '',
            type: 'request',
            operation: 'set',
            enabled: true,
          }],
          urlFilters: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }],
        activeProfileId: 'test-profile',
        darkModePreference: 'dark',
      }
      localStorage.setItem('openheaders_state', JSON.stringify(state))

      const store = useHeadersStore()
      await store.loadState()

      expect(store.profiles[0]?.name).toBe('Loaded Profile')
      expect(store.requestHeaders[0]?.name).toBe('X-Loaded')
      expect(store.darkModePreference).toBe('dark')
      expect(store.isDarkMode).toBe(true)
    })

    it('migrates old darkMode boolean to darkModePreference', async () => {
      // Pre-populate localStorage with old format
      const state = {
        profiles: [{
          id: 'test-profile',
          name: 'Migrated Profile',
          color: '#ff0000',
          headers: [],
          urlFilters: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }],
        activeProfileId: 'test-profile',
        darkMode: true, // Old format
      }
      localStorage.setItem('openheaders_state', JSON.stringify(state))

      const store = useHeadersStore()
      await store.loadState()

      // Should migrate true to 'dark'
      expect(store.darkModePreference).toBe('dark')
      expect(store.isDarkMode).toBe(true)
    })

    it('handles corrupted localStorage gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      localStorage.setItem('openheaders_state', 'not valid json')

      const store = useHeadersStore()
      await store.loadState()

      // Should create default profile
      expect(store.profiles.length).toBe(1)
      expect(store.isInitialized).toBe(true)
      consoleSpy.mockRestore()
    })
  })

  describe('undo/redo edge cases', () => {
    it('clears redo history when new action is performed', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      store.addHeader('request')

      expect(store.requestHeaders.length).toBe(2)

      store.undo() // Go back to 1 header
      expect(store.requestHeaders.length).toBe(1)
      expect(store.canRedo).toBe(true)

      // Perform new action - should clear redo history
      store.addHeader('response')
      expect(store.canRedo).toBe(false)
    })

    it('handles multiple undo operations', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      store.updateHeader(store.requestHeaders[0]!.id, { name: 'Step1' })
      store.updateHeader(store.requestHeaders[0]!.id, { name: 'Step2' })
      store.updateHeader(store.requestHeaders[0]!.id, { name: 'Step3' })

      expect(store.requestHeaders[0]?.name).toBe('Step3')

      store.undo()
      expect(store.requestHeaders[0]?.name).toBe('Step2')

      store.undo()
      expect(store.requestHeaders[0]?.name).toBe('Step1')

      store.undo()
      expect(store.requestHeaders[0]?.name).toBe('')

      store.undo()
      expect(store.requestHeaders.length).toBe(0)
    })

    it('does nothing when undo/redo not available', async () => {
      const store = useHeadersStore()
      await store.loadState()

      expect(store.canUndo).toBe(false)
      store.undo() // Should not throw
      expect(store.profiles.length).toBe(1)

      expect(store.canRedo).toBe(false)
      store.redo() // Should not throw
      expect(store.profiles.length).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('handles operations on non-existent profile', async () => {
      const store = useHeadersStore()
      await store.loadState()

      // These should not throw
      store.removeProfile('non-existent-id')
      store.updateProfile('non-existent-id', { name: 'Test' })
      store.duplicateProfile('non-existent-id')

      expect(store.profiles.length).toBe(1)
    })

    it('handles operations on non-existent header', async () => {
      const store = useHeadersStore()
      await store.loadState()

      // These should not throw
      store.removeHeader('non-existent-id')
      store.updateHeader('non-existent-id', { name: 'Test' })
      store.toggleHeader('non-existent-id')
      store.duplicateHeader('non-existent-id')

      expect(store.requestHeaders.length).toBe(0)
    })

    it('handles operations without active profile', async () => {
      const store = useHeadersStore()
      // Don't call loadState - no active profile

      // These should not throw
      store.addHeader('request')
      store.clearHeaders('request')

      expect(store.requestHeaders.length).toBe(0)
    })

    it('setActiveProfile ignores invalid profile IDs', async () => {
      const store = useHeadersStore()
      await store.loadState()

      const originalId = store.activeProfileId
      store.setActiveProfile('non-existent-id')

      expect(store.activeProfileId).toBe(originalId)
    })

    it('assigns cycling colors to new profiles', async () => {
      const store = useHeadersStore()
      await store.loadState()

      const colors: string[] = [store.profiles[0]!.color]

      for (let i = 0; i < 10; i++) {
        store.addProfile()
        colors.push(store.profiles[store.profiles.length - 1]!.color)
      }

      // Colors should cycle through DEFAULT_PROFILE_COLORS
      expect(colors.length).toBe(11)
      // First and 9th should be the same (8 colors in array)
      expect(colors[0]).toBe(colors[8])
    })

    it('clears all headers without type parameter', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      store.addHeader('request')
      store.addHeader('response')
      store.addHeader('response')

      store.clearHeaders()

      expect(store.requestHeaders.length).toBe(0)
      expect(store.responseHeaders.length).toBe(0)
    })

    it('sorts headers by value', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      store.addHeader('request')
      store.addHeader('request')

      store.updateHeader(store.requestHeaders[0]!.id, { value: 'zebra' })
      store.updateHeader(store.requestHeaders[1]!.id, { value: 'apple' })
      store.updateHeader(store.requestHeaders[2]!.id, { value: 'mango' })

      store.sortHeaders('value', 'request')

      expect(store.requestHeaders[0]?.value).toBe('apple')
      expect(store.requestHeaders[1]?.value).toBe('mango')
      expect(store.requestHeaders[2]?.value).toBe('zebra')
    })

    it('sorts headers by comment', async () => {
      const store = useHeadersStore()
      await store.loadState()

      store.addHeader('request')
      store.addHeader('request')
      store.addHeader('request')

      store.updateHeader(store.requestHeaders[0]!.id, { comment: 'z comment' })
      store.updateHeader(store.requestHeaders[1]!.id, { comment: 'a comment' })
      store.updateHeader(store.requestHeaders[2]!.id, { comment: 'm comment' })

      store.sortHeaders('comment', 'request')

      expect(store.requestHeaders[0]?.comment).toBe('a comment')
      expect(store.requestHeaders[1]?.comment).toBe('m comment')
      expect(store.requestHeaders[2]?.comment).toBe('z comment')
    })
  })

  describe('import edge cases', () => {
    it('rejects import without profiles array', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const store = useHeadersStore()
      await store.loadState()

      const result = store.importProfiles(JSON.stringify({ version: 1 }))
      expect(result).toBe(false)
      consoleSpy.mockRestore()
    })

    it('skips profiles without id or name', async () => {
      const store = useHeadersStore()
      await store.loadState()

      const importData = JSON.stringify({
        version: 1,
        profiles: [
          { name: 'NoId' }, // missing id
          { id: 'test-id' }, // missing name
          { id: 'valid-id', name: 'Valid Profile', color: '#000', headers: [], urlFilters: [] },
        ],
      })

      store.importProfiles(importData)

      // Only valid profile should be imported
      expect(store.profiles.length).toBe(2) // original + 1 valid import
      expect(store.profiles[1]?.name).toBe('Valid Profile')
    })

    it('handles import with missing headers/urlFilters gracefully', async () => {
      const store = useHeadersStore()
      await store.loadState()

      const importData = JSON.stringify({
        version: 1,
        profiles: [
          { id: 'test-id', name: 'Minimal Profile', color: '#000' },
        ],
      })

      const result = store.importProfiles(importData)

      expect(result).toBe(true)
      expect(store.profiles[1]?.headers).toEqual([])
      expect(store.profiles[1]?.urlFilters).toEqual([])
    })
  })

  describe('profile switching', () => {
    it('shows correct headers when switching between profiles', async () => {
      const store = useHeadersStore()
      await store.loadState()

      // Add a header to profile 1
      store.addHeader('request')
      const profile1Header = store.requestHeaders[0]
      if (!profile1Header) throw new Error('No header created')
      store.updateHeader(profile1Header.id, { name: 'X-Profile-1', value: 'value1' })

      // Verify profile 1 has the header
      expect(store.requestHeaders.length).toBe(1)
      expect(store.requestHeaders[0]?.name).toBe('X-Profile-1')

      // Create profile 2
      store.addProfile()
      const profile2Id = store.activeProfileId
      if (!profile2Id) throw new Error('No profile 2')

      // Profile 2 should have no headers
      expect(store.requestHeaders.length).toBe(0)

      // Add a header to profile 2
      store.addHeader('request')
      const profile2Header = store.requestHeaders[0]
      if (!profile2Header) throw new Error('No header created for profile 2')
      store.updateHeader(profile2Header.id, { name: 'X-Profile-2', value: 'value2' })

      // Verify profile 2 has its own header
      expect(store.requestHeaders.length).toBe(1)
      expect(store.requestHeaders[0]?.name).toBe('X-Profile-2')

      // Switch back to profile 1
      const profile1Id = store.profiles[0]?.id
      if (!profile1Id) throw new Error('No profile 1')
      store.setActiveProfile(profile1Id)

      // Profile 1 should show its header, not profile 2's
      expect(store.requestHeaders.length).toBe(1)
      expect(store.requestHeaders[0]?.name).toBe('X-Profile-1')

      // Switch to profile 2 again
      store.setActiveProfile(profile2Id)

      // Profile 2 should show its header
      expect(store.requestHeaders.length).toBe(1)
      expect(store.requestHeaders[0]?.name).toBe('X-Profile-2')
    })

    it('maintains header enabled state per profile', async () => {
      const store = useHeadersStore()
      await store.loadState()

      // Add and enable a header on profile 1
      store.addHeader('request')
      const profile1Header = store.requestHeaders[0]
      if (!profile1Header) throw new Error('No header')
      store.updateHeader(profile1Header.id, { name: 'X-Test', value: 'test' })
      expect(profile1Header.enabled).toBe(true)

      // Create profile 2
      store.addProfile()
      const profile2Id = store.activeProfileId

      // Profile 2 should have no headers
      expect(store.requestHeaders.length).toBe(0)

      // Switch back to profile 1
      const profile1Id = store.profiles[0]?.id
      if (!profile1Id) throw new Error('No profile 1')
      store.setActiveProfile(profile1Id)

      // Header should still be enabled
      expect(store.requestHeaders[0]?.enabled).toBe(true)
      expect(store.requestHeaders[0]?.name).toBe('X-Test')

      // Disable it
      store.toggleHeader(profile1Header.id)
      expect(store.requestHeaders[0]?.enabled).toBe(false)

      // Switch to profile 2 and back
      store.setActiveProfile(profile2Id!)
      store.setActiveProfile(profile1Id)

      // Should still be disabled
      expect(store.requestHeaders[0]?.enabled).toBe(false)
    })

    it('only active profile headers should be returned by requestHeaders', async () => {
      const store = useHeadersStore()
      await store.loadState()

      // Profile 1 - add a header
      store.addHeader('request')
      store.updateHeader(store.requestHeaders[0]!.id, { name: 'X-From-Profile-1', value: '1' })
      const profile1Id = store.activeProfileId!

      // Create Profile 2 and add a header
      store.addProfile()
      store.addHeader('request')
      store.updateHeader(store.requestHeaders[0]!.id, { name: 'X-From-Profile-2', value: '2' })

      // When on Profile 2, should only see Profile 2's headers
      expect(store.requestHeaders.length).toBe(1)
      expect(store.requestHeaders[0]?.name).toBe('X-From-Profile-2')

      // When switching to Profile 1, should only see Profile 1's headers
      store.setActiveProfile(profile1Id)
      expect(store.requestHeaders.length).toBe(1)
      expect(store.requestHeaders[0]?.name).toBe('X-From-Profile-1')

      // Profile 2's header should NOT appear in Profile 1's view
      expect(store.requestHeaders.some(h => h.name === 'X-From-Profile-2')).toBe(false)
    })
  })
})
