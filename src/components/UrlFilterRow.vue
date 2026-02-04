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
import { MoreVertical, Trash2, GripVertical } from 'lucide-vue-next'
import { t } from '@/i18n'

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
    class="flex items-center gap-2 px-2 py-2 border-b border-border hover:bg-muted/30 group"
  >
    <div
      data-swapy-handle
      class="shrink-0 flex items-center justify-center size-8 cursor-grab active:cursor-grabbing select-none text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 rounded-md transition-colors"
    >
      <GripVertical class="h-4 w-4" />
    </div>

    <div class="flex items-center justify-center size-8">
      <Checkbox
        :model-value="filter.enabled"
        @update:model-value="handleEnabledChange"
        class="shrink-0"
      />
    </div>

    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      :model-value="filter.type"
      @update:model-value="handleTypeChange"
    >
      <ToggleGroupItem value="include">
        {{ t('url_filters_type_include') }}
      </ToggleGroupItem>
      <ToggleGroupItem value="exclude">
        {{ t('url_filters_type_exclude') }}
      </ToggleGroupItem>
    </ToggleGroup>

    <Select
      :model-value="matchType"
      @update:model-value="handleMatchTypeChange"
    >
      <SelectTrigger size="sm" class="w-40 h-8 px-2">
        <SelectValue :placeholder="t('url_filters_match_type_placeholder')" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="host_equals">{{ t('url_filters_match_host_equals') }}</SelectItem>
        <SelectItem value="host_ends_with">{{ t('url_filters_match_host_ends_with') }}</SelectItem>
        <SelectItem value="url_starts_with">{{ t('url_filters_match_url_starts_with') }}</SelectItem>
        <SelectItem value="url_contains">{{ t('url_filters_match_url_contains') }}</SelectItem>
        <SelectItem value="dnr_url_filter">{{ t('url_filters_match_glob') }}</SelectItem>
        <SelectItem value="regex">{{ t('url_filters_match_regex') }}</SelectItem>
      </SelectContent>
    </Select>

    <Input
      :model-value="filter.pattern"
      @update:model-value="handlePatternChange"
      :placeholder="patternPlaceholder"
      class="flex-1 min-w-0 h-8 text-sm"
    />

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="ghost"
          size="icon-sm"
          class="text-muted-foreground hover:text-foreground"
          :aria-label="t('tooltip_more_actions')"
          :title="t('tooltip_more_actions')"
        >
          <MoreVertical class="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem class="text-destructive" @select="emit('remove', filter.id)">
          <Trash2 class="h-4 w-4 mr-2" />
          {{ t('menu_delete') }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
