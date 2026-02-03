<script setup lang="ts">
import type { UrlFilter, UrlFilterMatchType } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-vue-next'
import { URL_FILTER_MATCH_TYPE_LABELS, URL_FILTER_MATCH_TYPE_PLACEHOLDERS } from '@/lib/urlFilters'

const props = defineProps<{
  filter: UrlFilter
}>()

const emit = defineEmits<{
  update: [updates: Partial<UrlFilter>]
  remove: []
}>()

const matchTypeOrder: UrlFilterMatchType[] = [
  'host_equals',
  'host_ends_with',
  'url_starts_with',
  'url_contains',
  'dnr_url_filter',
  'regex',
]

function handleEnabledChange(value: boolean | 'indeterminate') {
  emit('update', { enabled: value === true })
}

function handleTypeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as UrlFilter['type']
  emit('update', { type: value })
}

function handleMatchTypeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as UrlFilterMatchType
  emit('update', { matchType: value })
}

function handlePatternChange(value: string) {
  emit('update', { pattern: value })
}
</script>

<template>
  <div
    class="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/30"
    data-testid="url-filter-row"
  >
    <Checkbox
      :model-value="filter.enabled"
      @update:model-value="handleEnabledChange"
      class="shrink-0"
    />

    <select
      class="h-7 rounded-md border border-border bg-background px-2 text-sm"
      :value="filter.type"
      @change="handleTypeChange"
      aria-label="Filter type"
    >
      <option value="include">Include</option>
      <option value="exclude">Exclude</option>
    </select>

    <select
      class="h-7 w-44 rounded-md border border-border bg-background px-2 text-sm"
      :value="filter.matchType"
      @change="handleMatchTypeChange"
      aria-label="Match type"
    >
      <option v-for="matchType in matchTypeOrder" :key="matchType" :value="matchType">
        {{ URL_FILTER_MATCH_TYPE_LABELS[matchType] }}
      </option>
    </select>

    <Input
      :model-value="filter.pattern"
      @update:model-value="handlePatternChange"
      :placeholder="URL_FILTER_MATCH_TYPE_PLACEHOLDERS[filter.matchType]"
      class="flex-1 min-w-0 h-7 text-sm"
    />

    <Button
      variant="ghost"
      size="icon-sm"
      class="text-muted-foreground hover:text-destructive"
      @click="emit('remove')"
      aria-label="Delete filter"
    >
      <Trash2 class="h-4 w-4" />
    </Button>
  </div>
</template>
