/**
 * Fire-and-forget persistence for in-progress input drafts.
 *
 * When a user types in a header/filter field, the draft is written to
 * storage on every keystroke. If the popup is destroyed before blur
 * fires (e.g. Arc browser), the draft survives in storage and is
 * recovered on next load.
 *
 * This is a safety net — the primary save path is still the blur-based
 * commit in each row component.
 */

const DIRTY_KEY = 'openheaders_dirty_drafts'

export type DirtyDrafts = Record<string, Record<string, string>>

function getStorage() {
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    return {
      async get(): Promise<DirtyDrafts> {
        const result = await chrome.storage.local.get(DIRTY_KEY)
        return (result[DIRTY_KEY] as DirtyDrafts) ?? {}
      },
      set(drafts: DirtyDrafts) {
        chrome.storage.local.set({ [DIRTY_KEY]: drafts })
      },
      clear() {
        chrome.storage.local.remove(DIRTY_KEY)
      },
    }
  }
  return {
    async get(): Promise<DirtyDrafts> {
      try {
        const raw = localStorage.getItem(DIRTY_KEY)
        return raw ? JSON.parse(raw) : {}
      } catch {
        return {}
      }
    },
    set(drafts: DirtyDrafts) {
      localStorage.setItem(DIRTY_KEY, JSON.stringify(drafts))
    },
    clear() {
      localStorage.removeItem(DIRTY_KEY)
    },
  }
}

/**
 * Save a field draft for the given item. Fire-and-forget — errors are
 * silently swallowed because this is a best-effort safety net.
 */
export function saveDraft(itemId: string, field: string, value: string): void {
  try {
    const storage = getStorage()
    storage.get().then(drafts => {
      if (!drafts[itemId]) drafts[itemId] = {}
      drafts[itemId]![field] = value
      storage.set(drafts)
    })
  } catch { /* best effort */ }
}

/**
 * Clear all drafts for the given item (called on blur/commit).
 */
export function clearDraft(itemId: string): void {
  try {
    const storage = getStorage()
    storage.get().then(drafts => {
      delete drafts[itemId]
      storage.set(drafts)
    })
  } catch { /* best effort */ }
}

/**
 * Load and clear all dirty drafts. Called once during store init.
 * Returns the drafts so the store can apply them to headers/filters.
 */
export async function consumeDirtyDrafts(): Promise<DirtyDrafts> {
  try {
    const storage = getStorage()
    const drafts = await storage.get()
    if (Object.keys(drafts).length > 0) {
      storage.clear()
    }
    return drafts
  } catch {
    return {}
  }
}
