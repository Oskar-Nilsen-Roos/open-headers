<script setup lang="ts">
import { computed } from 'vue'
import type { UrlFilter, UrlFilterMatchType } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  filter: UrlFilter
}>()

const emit = defineEmits<{
  update: [filterId: string, updates: Partial<UrlFilter>]
  remove: [filterId: string]
}>()

const matchType = computed<UrlFilterMatchType>(() => props.filter.matchType ?? 'dnr_url_filter')

const patternPlaceholder = computed(() => {
  switch (matchType.value) {
    case 'host_equals':
    case 'host_ends_with':
      return 'example.com'
    case 'url_starts_with':
      return 'https://example.com/path'
    case 'url_contains':
      return 'api/v1'
    case 'regex':
      return 'https?://(www\\.)?example\\.com/.*'
    case 'dnr_url_filter':
    default:
      return '*.example.com/*'
  }
})

function handleEnabledChange(value: boolean | 'indeterminate') {
  emit('update', props.filter.id, { enabled: value === true })
}

function handleTypeChange(value: unknown) {
  if (value !== 'include' && value !== 'exclude') return
  emit('update', props.filter.id, { type: value })
}

function handleMatchTypeChange(value: unknown) {
  if (typeof value !== 'string') return
  const allowed: UrlFilterMatchType[] = [
    'host_equals',
    'host_ends_with',
    'url_starts_with',
    'url_contains',
    'dnr_url_filter',
    'regex',
  ]
  if (!allowed.includes(value as UrlFilterMatchType)) return
  emit('update', props.filter.id, { matchType: value as UrlFilterMatchType })
}

function handlePatternChange(value: string) {
  emit('update', props.filter.id, { pattern: value })
}
</script>

<template>
  <div
    data-testid="url-filter-row"
    class="flex items-center gap-2 pr-3 py-1.5 border-b border-border hover:bg-muted/30 group"
  >
    <Checkbox
      :model-value="filter.enabled"
      @update:model-value="handleEnabledChange"
      class="shrink-0"
    />

    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      :model-value="filter.type"
      @update:model-value="handleTypeChange"
    >
      <ToggleGroupItem value="include">
        Include
      </ToggleGroupItem>
      <ToggleGroupItem value="exclude">
        Exclude
      </ToggleGroupItem>
    </ToggleGroup>

    <Select
      :model-value="matchType"
      @update:model-value="handleMatchTypeChange"
    >
      <SelectTrigger size="sm" class="w-40 h-7 px-2">
        <SelectValue placeholder="Match type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="host_equals">Host equals</SelectItem>
        <SelectItem value="host_ends_with">Host ends with</SelectItem>
        <SelectItem value="url_starts_with">URL starts with</SelectItem>
        <SelectItem value="url_contains">URL contains</SelectItem>
        <SelectItem value="dnr_url_filter">Advanced (glob)</SelectItem>
        <SelectItem value="regex">Regex</SelectItem>
      </SelectContent>
    </Select>

    <Input
      :model-value="filter.pattern"
      @update:model-value="handlePatternChange"
      :placeholder="patternPlaceholder"
      class="flex-1 min-w-0 h-7 text-sm"
    />

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon-sm" class="text-muted-foreground hover:text-foreground">
          <MoreVertical class="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem class="text-destructive" @select="emit('remove', filter.id)">
          <Trash2 class="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
