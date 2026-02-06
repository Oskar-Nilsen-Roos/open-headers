<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Profile, DarkModePreference, LanguagePreference } from '@/types'
import { createSwapy, utils } from 'swapy'
import type { Swapy, SlotItemMapArray } from 'swapy'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, MoreVertical, Upload, Copy, Trash2, Moon, Sun, Contrast, Download } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'

const props = defineProps<{
  profiles: Profile[]
  activeProfileId: string | null
  activeProfile: Profile | null
  darkModePreference: DarkModePreference
  languagePreference: LanguagePreference
  autoAnimate?: boolean
}>()

const emit = defineEmits<{
  select: [profileId: string]
  add: []
  reorder: [orderedIds: string[]]
  import: []
  duplicate: []
  delete: []
  exportAll: []
  setDarkMode: [preference: DarkModePreference]
  setLanguage: [preference: LanguagePreference]
}>()

function handleThemeChange(value: DarkModePreference) {
  emit('setDarkMode', value)
}

function handleLanguageChange(value: LanguagePreference) {
  emit('setLanguage', value)
}

const languageValue = computed({
  get: () => props.languagePreference,
  set: (value: LanguagePreference) => handleLanguageChange(value),
})

const showDeleteDialog = ref(false)

// Swapy state
const container = ref<HTMLElement | null>(null)
const swapy = ref<Swapy | null>(null)
const items = ref<Profile[]>([])
const autoAnimateEnabled = ref(true)

const autoAnimateSupported = typeof Element !== 'undefined'
  && typeof (Element.prototype as any).animate === 'function'

const autoAnimateBinding = computed(() => ({
  enabled: autoAnimateSupported && props.autoAnimate !== false && autoAnimateEnabled.value,
  options: {
    duration: 160,
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
}))

// Slot-item mapping for Swapy
const slotItemMap = ref<SlotItemMapArray>([])

// Computed slotted items for rendering
const slottedItems = computed(() => utils.toSlottedItems(items.value, 'id', slotItemMap.value))

// Helper to get set of IDs
const getIdSet = (profiles: Profile[]) => new Set(profiles.map(p => p.id))

// Track current item IDs to detect changes
const currentItemIds = ref<Set<string>>(new Set())

// Watch for external changes (add/remove from store)
watch(() => props.profiles, (newProfiles) => {
  const newIds = getIdSet(newProfiles)

  // Check if items were added or removed (not just reordered)
  const isAddOrRemove = newIds.size !== currentItemIds.value.size ||
    [...newIds].some(id => !currentItemIds.value.has(id)) ||
    [...currentItemIds.value].some(id => !newIds.has(id))

  if (isAddOrRemove) {
    items.value = [...newProfiles]
    slotItemMap.value = [...utils.initSlotItemMap(items.value, 'id')]
    currentItemIds.value = newIds
    nextTick(() => {
      swapy.value?.update()
    })
  }
}, { deep: true, immediate: true })

onMounted(() => {
  if (container.value) {
    swapy.value = createSwapy(container.value, {
      manualSwap: true,
      animation: 'dynamic',
    })

    swapy.value.onSwapStart(() => {
      autoAnimateEnabled.value = false
    })

    swapy.value.onSwap((event) => {
      requestAnimationFrame(() => {
        slotItemMap.value = event.newSlotItemMap.asArray
      })
    })

    swapy.value.onSwapEnd((event) => {
      if (!event.hasChanged) {
        autoAnimateEnabled.value = true
        return
      }

      const newOrder = event.slotItemMap.asArray
        .map(({ item }) => item)
        .filter((id): id is string => id !== null)
      emit('reorder', newOrder)

      nextTick(() => {
        swapy.value?.update()
        autoAnimateEnabled.value = true
      })
    })
  }
})

onUnmounted(() => {
  swapy.value?.destroy()
})

function getButtonClass(profile: Profile, activeProfileId: string | null): string {
  return cn(
    'relative',
    profile.id === activeProfileId && 'bg-accent'
  )
}
</script>

<template>
  <TooltipProvider>
    <div class="flex h-full flex-col gap-2 p-2 pb-3 bg-muted/50 border-r border-border">
      <div class="flex-1 flex flex-col gap-2">
        <!-- Profile Tabs -->
        <div
          ref="container"
          v-delay-auto-animate="autoAnimateBinding"
          class="flex flex-col gap-2"
        >
          <div
            v-for="{ slotId, itemId, item } in slottedItems"
            :key="slotId"
            :data-swapy-slot="slotId"
          >
            <div
              v-if="item"
              :key="itemId"
              :data-swapy-item="itemId"
              class="relative"
            >
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost"
                    size="icon"
                    :class="getButtonClass(item, activeProfileId)"
                    @click="emit('select', item.id)"
                    data-swapy-handle
                  >
                    <div
                      class="grid place-items-center size-6 rounded-full text-[11px] font-semibold leading-none tabular-nums text-white"
                      :style="{ backgroundColor: item.color }"
                    >
                      {{ slottedItems.findIndex(s => s.itemId === itemId) + 1 }}
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {{ item.name }}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <!-- Add Profile Button -->
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="border border-dashed border-muted-foreground/30"
              @click="emit('add')"
            >
              <Plus class="h-4 w-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{{ t('tooltip_add_profile') }}</TooltipContent>
        </Tooltip>
      </div>

      <!-- More Actions Menu -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="border border-border/60 mb-1"
            :aria-label="t('tooltip_more_actions')"
            :title="t('tooltip_more_actions')"
          >
            <MoreVertical class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="right" :side-offset="5" :align-offset="4">
          <DropdownMenuItem @select="emit('exportAll')">
            <Download class="h-4 w-4 mr-2" />
            {{ t('menu_export_all_profiles') }}
          </DropdownMenuItem>
          <DropdownMenuItem @select="emit('import')">
            <Upload class="h-4 w-4 mr-2" />
            {{ t('menu_import_profiles') }}
          </DropdownMenuItem>
          <DropdownMenuItem :disabled="!activeProfileId" @select="emit('duplicate')">
            <Copy class="h-4 w-4 mr-2" />
            {{ t('menu_duplicate_profile') }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div class="px-2 py-2">
            <div class="flex gap-2 justify-center">
              <!-- System -->
              <div class="flex flex-col items-center gap-2">
                <button
                  type="button"
                  :aria-pressed="darkModePreference === 'system'"
                  :aria-label="t('theme_system')"
                  class="flex items-center justify-center w-16 h-12 rounded-xl transition-colors"
                  :class="darkModePreference === 'system'
                    ? 'bg-accent text-accent-foreground'
                    : 'border border-border hover:bg-accent/50'"
                  @click="handleThemeChange('system')"
                >
                  <Contrast class="h-5 w-5" />
                </button>
                <span class="text-xs text-muted-foreground">{{ t('theme_system') }}</span>
              </div>
              <!-- Light -->
              <div class="flex flex-col items-center gap-2">
                <button
                  type="button"
                  :aria-pressed="darkModePreference === 'light'"
                  :aria-label="t('theme_light')"
                  class="flex items-center justify-center w-16 h-12 rounded-xl transition-colors"
                  :class="darkModePreference === 'light'
                    ? 'bg-accent text-accent-foreground'
                    : 'border border-border hover:bg-accent/50'"
                  @click="handleThemeChange('light')"
                >
                  <Sun class="h-5 w-5" />
                </button>
                <span class="text-xs text-muted-foreground">{{ t('theme_light') }}</span>
              </div>
              <!-- Dark -->
              <div class="flex flex-col items-center gap-2">
                <button
                  type="button"
                  :aria-pressed="darkModePreference === 'dark'"
                  :aria-label="t('theme_dark')"
                  class="flex items-center justify-center w-16 h-12 rounded-xl transition-colors"
                  :class="darkModePreference === 'dark'
                    ? 'bg-accent text-accent-foreground'
                    : 'border border-border hover:bg-accent/50'"
                  @click="handleThemeChange('dark')"
                >
                  <Moon class="h-5 w-5" />
                </button>
                <span class="text-xs text-muted-foreground">{{ t('theme_dark') }}</span>
              </div>
            </div>
          </div>
          <DropdownMenuSeparator />
          <div class="px-2 py-2 space-y-2">
            <div class="text-xs text-muted-foreground">{{ t('language_label') }}</div>
            <Select v-model="languageValue">
              <SelectTrigger size="sm" class="w-full">
                <SelectValue :placeholder="t('language_option_auto')" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="auto">{{ t('language_option_auto') }}</SelectItem>
                <SelectItem value="en">{{ t('language_option_en') }}</SelectItem>
                <SelectItem value="sv">{{ t('language_option_sv') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            class="text-destructive"
            :disabled="!activeProfileId"
            @select="showDeleteDialog = true"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            {{ t('menu_delete_profile') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('dialog_delete_profile_title') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('dialog_delete_profile_description', { name: activeProfile?.name ?? '' }) }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('button_cancel') }}</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="emit('delete')"
          >
            {{ t('menu_delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </TooltipProvider>
</template>
