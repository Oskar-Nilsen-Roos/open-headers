<script setup lang="ts">
import type { UrlFilter } from '@/types'
import UrlFilterRow from './UrlFilterRow.vue'
import DraggableList from './DraggableList.vue'
import { t } from '@/i18n'
import { Plus } from 'lucide-vue-next'

const props = defineProps<{
  filters: UrlFilter[]
  getPatternSuggestions?: (matchType: string) => string[]
}>()

const patternSuggestionsFor = (matchType: string) => {
  return props.getPatternSuggestions ? props.getPatternSuggestions(matchType) : []
}

const emit = defineEmits<{
  update: [filterId: string, updates: Partial<UrlFilter>]
  remove: [filterId: string]
  duplicate: [filterId: string]
  reorder: [orderedIds: string[]]
  add: []
  removePatternSuggestion: [matchType: string, pattern: string]
}>()

function handleUpdate(filterId: string, updates: Partial<UrlFilter>) {
  emit('update', filterId, updates)
}

function handleRemove(filterId: string) {
  emit('remove', filterId)
}
</script>

<template>
  <div class="flex flex-col bg-background">
    <!-- Filters List -->
    <DraggableList :items="filters" @reorder="emit('reorder', $event)">
      <template #default="{ item }">
        <UrlFilterRow
          :filter="item"
          :pattern-suggestions="patternSuggestionsFor(item.matchType ?? 'dnr_url_filter')"
          @update="handleUpdate"
          @remove="handleRemove"
          @duplicate="emit('duplicate', $event)"
          @remove-pattern-suggestion="(matchType, pattern) => emit('removePatternSuggestion', matchType, pattern)"
        />
      </template>
    </DraggableList>

    <!-- Add row -->
    <button
      type="button"
      class="w-full flex items-center gap-2 px-2 py-1.5 border-b border-dashed border-border/50 hover:border-border hover:bg-muted/20 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      :aria-label="t('tooltip_add_filter')"
      @click="emit('add')">
      <div class="shrink-0 flex items-center justify-center size-8">
        <Plus class="h-3.5 w-3.5" />
      </div>
      <span class="text-xs">{{ t('button_add') }}</span>
    </button>
  </div>
</template>
