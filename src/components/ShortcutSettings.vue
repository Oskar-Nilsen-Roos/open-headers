<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useHotkeyRecorder, formatForDisplay } from '@tanstack/vue-hotkeys'
import { useShortcutsStore, SHORTCUT_DEFINITIONS, type ShortcutDefinition } from '@/stores/shortcuts'
import { t } from '@/i18n'
import type { Hotkey } from '@tanstack/hotkeys'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const shortcutsStore = useShortcutsStore()

// Recording state
const recordingId = ref<string | null>(null)
const conflictInfo = ref<{ shortcutId: string; newKey: string; conflictId: string } | null>(null)

const recorder = useHotkeyRecorder({
  onRecord: (hotkey: Hotkey) => {
    if (!recordingId.value) return

    const key = hotkey as string
    if (!key) {
      // Cleared via Backspace/Delete
      shortcutsStore.setBinding(recordingId.value, '')
      recordingId.value = null
      return
    }

    // Check for conflicts
    const conflictId = shortcutsStore.findConflict(key, recordingId.value)
    if (conflictId) {
      conflictInfo.value = { shortcutId: recordingId.value, newKey: key, conflictId }
    } else {
      shortcutsStore.setBinding(recordingId.value, key)
      recordingId.value = null
    }
  },
  onCancel: () => {
    recordingId.value = null
    conflictInfo.value = null
  },
})

// Cancel recording when dialog closes
watch(() => props.open, (isOpen) => {
  if (!isOpen && recorder.isRecording.value) {
    recorder.cancelRecording()
    recordingId.value = null
    conflictInfo.value = null
  }
})

// Group definitions by category
const generalShortcuts = computed(() =>
  SHORTCUT_DEFINITIONS.filter(d => d.category === 'general')
)
const profileShortcuts = computed(() =>
  SHORTCUT_DEFINITIONS.filter(d => d.category === 'profiles')
)
const chromeShortcuts = computed(() =>
  SHORTCUT_DEFINITIONS.filter(d => d.category === 'chrome')
)

function getLabel(def: ShortcutDefinition): string {
  if (def.labelKey === 'shortcut_profile_n') {
    const num = def.id.replace('profile-', '')
    return t('shortcut_profile_n', { number: num })
  }
  if (def.labelKey === 'shortcut_chrome_profile_n') {
    const num = def.id.replace('chrome-profile-', '')
    return t('shortcut_chrome_profile_n', { number: num })
  }
  return t(def.labelKey)
}

function getDisplayKey(def: ShortcutDefinition): string {
  if (def.category === 'chrome' && def.chromeCommand) {
    return shortcutsStore.chromeCommands[def.chromeCommand] || t('settings_shortcuts_not_set')
  }
  const key = shortcutsStore.getKey(def.id)
  if (!key) return t('settings_shortcuts_not_set')
  try {
    return formatForDisplay(key)
  } catch {
    return key
  }
}

function startRecording(id: string) {
  if (conflictInfo.value) return
  recordingId.value = id
  recorder.startRecording()
}

function confirmSwap() {
  if (!conflictInfo.value) return

  const { shortcutId, newKey, conflictId } = conflictInfo.value
  // Swap: give the conflicting shortcut the old key of the one being changed
  const oldKey = shortcutsStore.getKey(shortcutId)
  shortcutsStore.setBinding(conflictId, oldKey)
  shortcutsStore.setBinding(shortcutId, newKey)

  conflictInfo.value = null
  recordingId.value = null
}

function cancelConflict() {
  conflictInfo.value = null
  recordingId.value = null
}

function handleResetAll() {
  shortcutsStore.resetAll()
  recordingId.value = null
  conflictInfo.value = null
}

function openChromeShortcuts() {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })
  }
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-sm p-5 gap-0 max-h-[80vh] flex flex-col">
      <DialogHeader class="pb-3 shrink-0">
        <DialogTitle class="text-base">{{ t('settings_shortcuts_title') }}</DialogTitle>
        <DialogDescription class="sr-only">
          {{ t('settings_shortcuts_title') }}
        </DialogDescription>
      </DialogHeader>

      <div class="overflow-y-auto flex-1 min-h-0 space-y-4 pr-1">
        <!-- General shortcuts -->
        <div>
          <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {{ t('shortcuts_general') }}
          </h3>
          <div class="space-y-1.5">
            <div
              v-for="def in generalShortcuts"
              :key="def.id"
              class="flex items-center justify-between gap-3"
            >
              <span class="text-sm text-foreground">{{ getLabel(def) }}</span>
              <div class="flex items-center gap-1 shrink-0">
                <!-- Conflict warning -->
                <template v-if="conflictInfo?.shortcutId === def.id">
                  <span class="text-xs text-destructive mr-1">
                    {{ t('settings_shortcuts_conflict', { name: getLabel(shortcutsStore.getDefinition(conflictInfo.conflictId)!) }) }}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-6 px-2 text-xs"
                    @click="confirmSwap"
                  >
                    Swap
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-6 px-2 text-xs"
                    @click="cancelConflict"
                  >
                    {{ t('button_cancel') }}
                  </Button>
                </template>
                <template v-else>
                  <button
                    class="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer min-w-[3rem] text-center transition-colors"
                    :class="{ 'border-primary bg-primary/10 text-primary': recordingId === def.id }"
                    @click="startRecording(def.id)"
                  >
                    <template v-if="recordingId === def.id">
                      {{ t('settings_shortcuts_recording') }}
                    </template>
                    <template v-else>
                      {{ getDisplayKey(def) }}
                    </template>
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Profile shortcuts -->
        <div>
          <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {{ t('shortcuts_profiles') }}
          </h3>
          <div class="space-y-1.5">
            <div
              v-for="def in profileShortcuts"
              :key="def.id"
              class="flex items-center justify-between gap-3"
            >
              <span class="text-sm text-foreground">{{ getLabel(def) }}</span>
              <div class="flex items-center gap-1 shrink-0">
                <template v-if="conflictInfo?.shortcutId === def.id">
                  <span class="text-xs text-destructive mr-1">
                    {{ t('settings_shortcuts_conflict', { name: getLabel(shortcutsStore.getDefinition(conflictInfo.conflictId)!) }) }}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-6 px-2 text-xs"
                    @click="confirmSwap"
                  >
                    Swap
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-6 px-2 text-xs"
                    @click="cancelConflict"
                  >
                    {{ t('button_cancel') }}
                  </Button>
                </template>
                <template v-else>
                  <button
                    class="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer min-w-[3rem] text-center transition-colors"
                    :class="{ 'border-primary bg-primary/10 text-primary': recordingId === def.id }"
                    @click="startRecording(def.id)"
                  >
                    <template v-if="recordingId === def.id">
                      {{ t('settings_shortcuts_recording') }}
                    </template>
                    <template v-else>
                      {{ getDisplayKey(def) }}
                    </template>
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Chrome shortcuts -->
        <div>
          <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {{ t('shortcuts_chrome') }}
          </h3>
          <div class="space-y-1.5">
            <div
              v-for="def in chromeShortcuts"
              :key="def.id"
              class="flex items-center justify-between gap-3"
            >
              <span class="text-sm text-foreground">{{ getLabel(def) }}</span>
              <kbd
                class="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono font-medium text-muted-foreground min-w-[3rem] text-center"
              >
                {{ getDisplayKey(def) }}
              </kbd>
            </div>
          </div>
          <Button
            variant="link"
            size="sm"
            class="mt-2 h-auto p-0 text-xs"
            @click="openChromeShortcuts"
          >
            {{ t('settings_shortcuts_edit_chrome') }}
          </Button>
        </div>
      </div>

      <!-- Footer -->
      <div class="pt-3 mt-3 border-t border-border shrink-0">
        <Button
          variant="outline"
          size="sm"
          class="w-full"
          @click="handleResetAll"
        >
          {{ t('settings_shortcuts_reset_all') }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
