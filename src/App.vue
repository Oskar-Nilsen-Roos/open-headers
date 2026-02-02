<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useHeadersStore } from '@/stores/headers'
import ProfileSidebar from '@/components/ProfileSidebar.vue'
import ProfileHeader from '@/components/ProfileHeader.vue'
import HeaderList from '@/components/HeaderList.vue'

const store = useHeadersStore()

// Initialize store on mount
onMounted(async () => {
  await store.loadState()
})

// Watch dark mode - uses computed isDarkMode which respects system preference
watch(
  () => store.isDarkMode,
  (isDark) => {
    document.documentElement.classList.toggle('dark', isDark)
  },
  { immediate: true }
)

// Computed values
const activeProfileIndex = computed(() => {
  if (!store.activeProfileId) return 0
  return store.profiles.findIndex(p => p.id === store.activeProfileId)
})

// Header actions
function handleAddHeader() {
  store.addHeader('request')
}

function handleRemoveHeader(headerId: string) {
  store.removeHeader(headerId)
}

function handleUpdateHeader(headerId: string, updates: Record<string, unknown>) {
  store.updateHeader(headerId, updates)
}

function handleToggleHeader(headerId: string) {
  store.toggleHeader(headerId)
}

function handleDuplicateHeader(headerId: string) {
  store.duplicateHeader(headerId)
}

function handleClearHeaders() {
  store.clearHeaders('request')
}

function handleReorderHeaders(orderedIds: string[]) {
  store.reorderHeaders(orderedIds, 'request')
}

// Profile actions
function handleRenameProfile(name: string) {
  if (store.activeProfileId) {
    store.updateProfile(store.activeProfileId, { name })
  }
}

function handleDeleteProfile() {
  if (store.activeProfileId) {
    store.removeProfile(store.activeProfileId)
  }
}

function handleDuplicateProfile() {
  if (store.activeProfileId) {
    store.duplicateProfile(store.activeProfileId)
  }
}

// Import/Export
function handleExport() {
  const data = store.exportProfiles()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'openheaders-profiles.json'
  a.click()
  URL.revokeObjectURL(url)
}

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      store.importProfiles(content)
    }
    reader.readAsText(file)
  }
  input.click()
}
</script>

<template>
  <div v-if="store.isInitialized" class="flex h-full bg-background">
    <!-- Profile Sidebar -->
    <ProfileSidebar
      :profiles="store.profiles"
      :active-profile-id="store.activeProfileId"
      @select="store.setActiveProfile"
      @add="store.addProfile"
      @reorder="store.reorderProfiles"
    />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Profile Header -->
      <ProfileHeader
        :profile="store.activeProfile"
        :profile-index="activeProfileIndex"
        :can-undo="store.canUndo"
        :can-redo="store.canRedo"
        :dark-mode-preference="store.darkModePreference"
        @undo="store.undo"
        @redo="store.redo"
        @add-header="handleAddHeader"
        @export="handleExport"
        @import="handleImport"
        @duplicate="handleDuplicateProfile"
        @delete="handleDeleteProfile"
        @rename="handleRenameProfile"
        @set-dark-mode="store.setDarkModePreference"
      />

      <!-- Headers Content -->
      <div class="flex-1 overflow-y-auto">
        <HeaderList
          title="Request headers"
          type="request"
          :headers="store.requestHeaders"
          :color="store.activeProfile?.color"
          @add="handleAddHeader"
          @remove="handleRemoveHeader"
          @update="handleUpdateHeader"
          @toggle="handleToggleHeader"
          @duplicate="handleDuplicateHeader"
          @clear="handleClearHeaders"
          @reorder="handleReorderHeaders"
        />
      </div>
    </div>
  </div>

  <!-- Loading State -->
  <div v-else class="flex items-center justify-center h-64 text-muted-foreground">
    Loading...
  </div>
</template>
