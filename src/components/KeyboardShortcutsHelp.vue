<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { t } from '@/i18n'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isMac = computed(() => navigator.platform?.toUpperCase().includes('MAC'))

const mod = computed(() => (isMac.value ? '\u2318' : 'Ctrl'))
const shift = computed(() => (isMac.value ? '\u21E7' : 'Shift'))

interface Shortcut {
  keys: string[]
  label: () => string
}

interface ShortcutGroup {
  title: () => string
  shortcuts: Shortcut[]
}

const groups = computed<ShortcutGroup[]>(() => [
  {
    title: () => t('shortcuts_general'),
    shortcuts: [
      { keys: [`${mod.value};`], label: () => t('shortcut_open_settings') },
      { keys: [`${mod.value}N`], label: () => t('shortcut_add_new') },
      { keys: [`${mod.value}Z`], label: () => t('shortcut_undo') },
      { keys: [`${mod.value}${shift.value}Z`], label: () => t('shortcut_redo') },
      { keys: ['?'], label: () => t('shortcut_show_help') },
      { keys: ['Esc'], label: () => t('shortcut_close') },
    ],
  },
  {
    title: () => t('shortcuts_profiles'),
    shortcuts: [
      { keys: ['1', '-', '9'], label: () => t('shortcut_switch_profile') },
    ],
  },
  {
    title: () => t('shortcuts_chrome'),
    shortcuts: [
      { keys: [`${mod.value}${shift.value}H`], label: () => t('shortcut_open_extension') },
      { keys: [`${mod.value}${shift.value}1-3`], label: () => t('shortcut_switch_profile_chrome') },
    ],
  },
])
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
            {{ group.title() }}
          </h3>
          <div class="space-y-1.5">
            <div
              v-for="(shortcut, si) in group.shortcuts"
              :key="si"
              class="flex items-center justify-between gap-3"
            >
              <span class="text-sm text-foreground">{{ shortcut.label() }}</span>
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
