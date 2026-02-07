<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useHeadersStore } from '@/stores/headers'
import ProfileSidebar from '@/components/ProfileSidebar.vue'
import ProfileHeader from '@/components/ProfileHeader.vue'
import HeaderList from '@/components/HeaderList.vue'
import UrlFilterList from '@/components/UrlFilterList.vue'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { t } from '@/i18n'
import type { HeaderType, UrlFilter } from '@/types'
import { Plus, Trash2 } from 'lucide-vue-next'

const store = useHeadersStore()
const activeHeaderType = ref<HeaderType>('request')
const isShowingFilters = ref(false)

type MainTab = HeaderType | 'filters'

const activeMainTab = computed<MainTab>({
  get: () => (isShowingFilters.value ? 'filters' : activeHeaderType.value),
  set: value => {
    if (value === 'filters') {
      isShowingFilters.value = true
      return
    }

    isShowingFilters.value = false
    activeHeaderType.value = value
  },
})

// Initialize store on mount
onMounted(async () => {
  await store.loadState()
})

// Watch dark mode - uses computed isDarkMode which respects system preference
watch(
  () => store.isDarkMode,
  isDark => {
    document.documentElement.classList.toggle('dark', isDark)
  },
  { immediate: true }
)

// Computed values
const activeProfileIndex = computed(() => {
  if (!store.activeProfileId) return 0
  return store.profiles.findIndex(p => p.id === store.activeProfileId)
})

const activeHeaders = computed(() => {
  return activeHeaderType.value === 'request'
    ? store.requestHeaders
    : store.responseHeaders
})

const headerNameSuggestions = computed(() => {
  return store.getHeaderNameSuggestions(activeHeaderType.value)
})

const getHeaderValueSuggestions = (name: string) => {
  return store.getHeaderValueSuggestions(name)
}

const canClearFooter = computed(() => {
  if (activeMainTab.value === 'filters') {
    return (store.activeProfile?.urlFilters.length ?? 0) > 0
  }

  return activeHeaders.value.length > 0
})

const requestHeaderEnabledCount = computed(
  () => store.requestHeaders.filter(h => h.enabled).length
)

const responseHeaderEnabledCount = computed(
  () => store.responseHeaders.filter(h => h.enabled).length
)

const urlFilterEnabledCount = computed(
  () => (store.activeProfile?.urlFilters ?? []).filter(f => f.enabled).length
)

const footerAddTooltip = computed(() => {
  if (activeMainTab.value === 'filters') return t('tooltip_add_filter')
  return t('tooltip_add_header')
})

const footerClearTooltip = computed(() => {
  if (activeMainTab.value === 'filters') return t('tooltip_clear_filters')
  return t('tooltip_clear_headers')
})

// Header actions
function handleAddHeader() {
  store.addHeader(activeHeaderType.value)
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
  store.clearHeaders(activeHeaderType.value)
}

function handleReorderHeaders(orderedIds: string[]) {
  store.reorderHeaders(orderedIds, activeHeaderType.value)
}

function handleRemoveHeaderNameSuggestion(name: string) {
  store.removeHeaderNameSuggestion(name)
}

function handleRemoveHeaderValueSuggestion(name: string, value: string) {
  store.removeHeaderValueSuggestion(name, value)
}

const getUrlPatternSuggestions = (matchType: string) => {
  return store.getUrlPatternSuggestions(matchType)
}

function handleRemoveUrlPatternSuggestion(matchType: string, pattern: string) {
  store.removeUrlPatternSuggestion(matchType, pattern)
}

function handleUpdateUrlFilter(filterId: string, updates: Partial<UrlFilter>) {
  store.updateUrlFilter(filterId, updates)
}

function handleRemoveUrlFilter(filterId: string) {
  store.removeUrlFilter(filterId)
}

function handleFooterAdd() {
  if (activeMainTab.value === 'filters') {
    store.addUrlFilter('include')
    return
  }

  handleAddHeader()
}

function handleFooterClear() {
  if (activeMainTab.value === 'filters') {
    store.clearUrlFilters()
    return
  }

  handleClearHeaders()
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

function handleUpdateProfileColor(color: string) {
  if (store.activeProfileId) {
    store.updateProfile(store.activeProfileId, { color })
  }
}

// Import/Export
function downloadExport(data: string, filename: string) {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function handleExportProfile() {
  if (!store.activeProfileId) return
  const data = store.exportProfile(store.activeProfileId)
  downloadExport(data, t('export_profile_file_name'))
}

function handleExportAllProfiles() {
  const data = store.exportProfiles()
  downloadExport(data, t('export_profiles_file_name'))
}

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = e => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = event => {
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
      :active-profile="store.activeProfile"
      :dark-mode-preference="store.darkModePreference"
      :language-preference="store.languagePreference"
      @select="store.setActiveProfile"
      @add="store.addProfile"
      @reorder="store.reorderProfiles"
      @import="handleImport"
      @duplicate="handleDuplicateProfile"
      @delete="handleDeleteProfile"
      @export-all="handleExportAllProfiles"
      @set-dark-mode="store.setDarkModePreference"
      @set-language="store.setLanguagePreference" />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Profile Header -->
      <ProfileHeader
        :profile="store.activeProfile"
        :profile-index="activeProfileIndex"
        :can-undo="store.canUndo"
        :can-redo="store.canRedo"
        @undo="store.undo"
        @redo="store.redo"
        @export="handleExportProfile"
        @rename="handleRenameProfile"
        @update-color="handleUpdateProfileColor"
      />

      <div class="flex-1 flex flex-col min-h-0">
        <TooltipProvider>
          <!-- Main Tabs -->
          <div class="px-3 py-2 bg-background border-b border-border/50">
            <Tabs v-model="activeMainTab" class="w-full">
              <TabsList class="w-full">
                <TabsTrigger value="request">
                  <span class="inline-flex items-center gap-1">
                    <span>{{ t('tab_request') }}</span>
                    <span
                      class="inline-flex items-center justify-center rounded-md border border-foreground/10 bg-foreground/5 text-foreground/70 text-[9px] font-semibold h-4 min-w-4 px-1"
                    >
                      {{ requestHeaderEnabledCount }}
                    </span>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="response">
                  <span class="inline-flex items-center gap-1">
                    <span>{{ t('tab_response') }}</span>
                    <span
                      class="inline-flex items-center justify-center rounded-md border border-foreground/10 bg-foreground/5 text-foreground/70 text-[9px] font-semibold h-4 min-w-4 px-1"
                    >
                      {{ responseHeaderEnabledCount }}
                    </span>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="filters">
                  <span class="inline-flex items-center gap-1">
                    <span>{{ t('tab_filters') }}</span>
                    <span
                      class="inline-flex items-center justify-center rounded-md border border-foreground/10 bg-foreground/5 text-foreground/70 text-[9px] font-semibold h-4 min-w-4 px-1"
                    >
                      {{ urlFilterEnabledCount }}
                    </span>
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto min-h-0">
            <HeaderList
              v-if="activeMainTab !== 'filters'"
              :headers="activeHeaders"
              :name-suggestions="headerNameSuggestions"
              :get-value-suggestions="getHeaderValueSuggestions"
              @remove="handleRemoveHeader"
              @update="handleUpdateHeader"
              @toggle="handleToggleHeader"
              @duplicate="handleDuplicateHeader"
              @add="handleAddHeader"
              @reorder="handleReorderHeaders"
              @remove-name-suggestion="handleRemoveHeaderNameSuggestion"
              @remove-value-suggestion="handleRemoveHeaderValueSuggestion" />

            <UrlFilterList
              v-else
              :filters="store.activeProfile?.urlFilters ?? []"
              :get-pattern-suggestions="getUrlPatternSuggestions"
              @update="handleUpdateUrlFilter"
              @remove="handleRemoveUrlFilter"
              @duplicate="store.duplicateUrlFilter"
              @add="store.addUrlFilter('include')"
              @reorder="store.reorderUrlFilters"
              @remove-pattern-suggestion="handleRemoveUrlPatternSuggestion" />
          </div>

          <!-- Sticky Footer Actions -->
          <div
            class="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div class="flex items-center gap-2 px-3 py-2">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    data-testid="footer-add"
                    variant="secondary"
                    size="default"
                    class="flex-1 shadow-xs"
                    :aria-label="footerAddTooltip"
                    @click="handleFooterAdd">
                    <Plus class="h-4 w-4" />
                    <span class="sr-only">{{ t('button_add') }}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{{ footerAddTooltip }}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger as-child>
                  <span class="inline-flex">
                    <Button
                      data-testid="footer-clear"
                      variant="outline"
                      size="icon"
                      class="border-destructive/25 text-destructive hover:bg-destructive/10 hover:border-destructive/35"
                      :disabled="!canClearFooter"
                      :aria-label="footerClearTooltip"
                      @click="handleFooterClear">
                      <Trash2 class="h-4 w-4" />
                      <span class="sr-only">{{ t('button_clear') }}</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{{ footerClearTooltip }}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>
    </div>
  </div>

  <!-- Loading State -->
  <div v-else class="flex items-center justify-center h-64 text-muted-foreground">
    {{ t('app_loading') }}
  </div>
</template>
