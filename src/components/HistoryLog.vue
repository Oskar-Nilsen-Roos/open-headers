<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { HistoryLogEntry } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Trash2, RefreshCw } from 'lucide-vue-next'
import { getReadableTextColor } from '@/lib/color'
import { t } from '@/i18n'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const entries = ref<HistoryLogEntry[]>([])
const loading = ref(false)

async function fetchLog() {
  loading.value = true
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_HISTORY_LOG' })
    entries.value = response?.entries ?? []
  } catch {
    entries.value = []
  } finally {
    loading.value = false
  }
}

async function clearLog() {
  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY_LOG' })
    entries.value = []
  } catch {
    // silently fail
  }
}

onMounted(() => {
  if (props.open) fetchLog()
})

function handleOpenChange(value: boolean) {
  emit('update:open', value)
  if (value) fetchLog()
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.host + u.pathname + u.search
  } catch {
    return url
  }
}

const groupedEntries = computed(() => {
  const groups: Array<{ url: string; entries: HistoryLogEntry[] }> = []
  let currentUrl = ''
  let currentGroup: HistoryLogEntry[] = []

  for (const entry of entries.value) {
    if (entry.url !== currentUrl) {
      if (currentGroup.length > 0) {
        groups.push({ url: currentUrl, entries: currentGroup })
      }
      currentUrl = entry.url
      currentGroup = [entry]
    } else {
      currentGroup.push(entry)
    }
  }
  if (currentGroup.length > 0) {
    groups.push({ url: currentUrl, entries: currentGroup })
  }

  return groups
})
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-h-[80vh] flex flex-col sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{{ t('history_log_title') }}</DialogTitle>
        <DialogDescription>{{ t('history_log_description') }}</DialogDescription>
      </DialogHeader>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="loading"
          @click="fetchLog"
        >
          <RefreshCw class="mr-1.5 h-3.5 w-3.5" :class="loading && 'animate-spin'" />
          {{ t('history_log_refresh') }}
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="entries.length === 0"
          class="border-destructive/25 text-destructive hover:bg-destructive/10 hover:border-destructive/35"
          @click="clearLog"
        >
          <Trash2 class="mr-1.5 h-3.5 w-3.5" />
          {{ t('history_log_clear') }}
        </Button>
      </div>

      <Separator />

      <div class="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
        <div
          v-if="entries.length === 0 && !loading"
          class="py-8 text-center text-sm text-muted-foreground"
        >
          {{ t('history_log_empty') }}
        </div>

        <div
          v-else-if="loading && entries.length === 0"
          class="py-8 text-center text-sm text-muted-foreground"
        >
          {{ t('app_loading') }}
        </div>

        <div v-else class="space-y-3 pb-2">
          <div
            v-for="group in groupedEntries"
            :key="group.url + group.entries[0]?.id"
            class="rounded-lg border border-border/70 bg-muted/30"
          >
            <div class="px-3 py-2 text-xs font-medium text-muted-foreground truncate border-b border-border/50">
              {{ formatUrl(group.url) }}
            </div>

            <div class="divide-y divide-border/40">
              <div
                v-for="entry in group.entries"
                :key="entry.id"
                class="px-3 py-2"
              >
                <div class="flex items-center gap-2 mb-1.5">
                  <span
                    class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                    :style="{
                      backgroundColor: entry.profileColor,
                      color: getReadableTextColor(entry.profileColor),
                    }"
                  >
                    {{ entry.profileName }}
                  </span>
                  <span class="text-[11px] text-muted-foreground tabular-nums">
                    {{ formatTime(entry.timestamp) }}
                  </span>
                  <span class="text-[11px] text-muted-foreground">
                    · {{ entry.headers.length }} {{ entry.headers.length === 1 ? 'header' : 'headers' }}
                  </span>
                </div>

                <div class="space-y-0.5">
                  <div
                    v-for="(header, i) in entry.headers"
                    :key="i"
                    class="flex items-baseline gap-1.5 text-xs font-mono"
                  >
                    <span
                      class="shrink-0 rounded px-1 py-px text-[10px] font-semibold uppercase"
                      :class="{
                        'bg-blue-500/10 text-blue-600 dark:text-blue-400': header.type === 'request',
                        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': header.type === 'response',
                      }"
                    >
                      {{ header.type === 'request' ? 'REQ' : 'RES' }}
                    </span>
                    <span
                      class="shrink-0 rounded px-1 py-px text-[10px] font-medium uppercase text-muted-foreground"
                    >
                      {{ header.operation }}
                    </span>
                    <span class="font-semibold text-foreground truncate">{{ header.name }}</span>
                    <span v-if="header.operation !== 'remove'" class="text-muted-foreground truncate">
                      {{ header.value }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
