<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useShortcutsStore, SHORTCUT_DEFINITIONS } from '@/stores/shortcuts'
import { t } from '@/i18n'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const shortcutsStore = useShortcutsStore()

const isMac = computed(() => {
  if ((navigator as any).userAgentData?.platform) {
    return (navigator as any).userAgentData.platform === 'macOS'
  }
  return navigator.platform?.toUpperCase().includes('MAC') ?? false
})

/**
 * Convert a TanStack hotkey binding string (e.g. "Mod+Shift+Z") to display form.
 * Replaces "Mod" with ⌘/Ctrl and "Shift" with ⇧/Shift based on platform.
 */
function formatBinding(binding: string): string {
  if (!binding) return ''
  return binding
    .replace(/Mod/g, isMac.value ? '\u2318' : 'Ctrl')
    .replace(/Shift/g, isMac.value ? '\u21E7' : 'Shift')
    .replace(/\+/g, '')
}

interface Shortcut {
  keys: string[]
  label: string
}

interface ShortcutGroup {
  title: string
  shortcuts: Shortcut[]
}

const groups = computed<ShortcutGroup[]>(() => {
  const generalDefs = SHORTCUT_DEFINITIONS.filter(d => d.category === 'general')
  const generalShortcuts: Shortcut[] = generalDefs.map(def => ({
    keys: [formatBinding(shortcutsStore.getKey(def.id))],
    label: t(def.labelKey),
  }))
  // Add Escape (hardcoded, not customizable)
  generalShortcuts.push({ keys: ['Esc'], label: t('shortcut_close') })

  // Profiles: show as range "1 - 9" using first and last bindings
  const firstProfileKey = shortcutsStore.getKey('profile-1')
  const lastProfileKey = shortcutsStore.getKey('profile-9')

  // Chrome shortcuts: read live bindings
  const chromeShortcuts: Shortcut[] = SHORTCUT_DEFINITIONS
    .filter(d => d.category === 'chrome')
    .map(def => {
      const chromeKey = def.chromeCommand
        ? shortcutsStore.chromeCommands[def.chromeCommand] ?? ''
        : ''
      return {
        keys: chromeKey ? [chromeKey] : [t('settings_shortcuts_not_set')],
        label: def.labelKey === 'shortcut_chrome_profile_n'
          ? t('shortcut_chrome_profile_n', { number: def.id.replace('chrome-profile-', '') })
          : t(def.labelKey),
      }
    })

  return [
    { title: t('shortcuts_general'), shortcuts: generalShortcuts },
    {
      title: t('shortcuts_profiles'),
      shortcuts: [
        { keys: [firstProfileKey, '-', lastProfileKey], label: t('shortcut_switch_profile') },
      ],
    },
    { title: t('shortcuts_chrome'), shortcuts: chromeShortcuts },
  ]
})
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-xs p-5 gap-0">
      <DialogHeader class="pb-3">
        <DialogTitle class="text-base">{{ t('shortcuts_title') }}</DialogTitle>
        <DialogDescription class="sr-only">
          {{ t('shortcuts_title') }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div v-for="(group, gi) in groups" :key="gi">
          <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {{ group.title }}
          </h3>
          <div class="space-y-1.5">
            <div
              v-for="(shortcut, si) in group.shortcuts"
              :key="si"
              class="flex items-center justify-between gap-3"
            >
              <span class="text-sm text-foreground">{{ shortcut.label }}</span>
              <span class="flex items-center gap-0.5 shrink-0">
                <template v-for="(key, ki) in shortcut.keys" :key="ki">
                  <template v-if="key === '-'">
                    <span class="text-xs text-muted-foreground mx-0.5">{{ key }}</span>
                  </template>
                  <kbd
                    v-else
                    class="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono font-medium text-muted-foreground"
                  >
                    {{ key }}
                  </kbd>
                </template>
              </span>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
