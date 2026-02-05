<script setup lang="ts">
import type { HeaderRule } from '@/types'
import HeaderRow from './HeaderRow.vue'
import DraggableList from './DraggableList.vue'
import { t } from '@/i18n'

const props = withDefaults(defineProps<{
  headers: HeaderRule[]
  nameSuggestions?: string[]
  getValueSuggestions?: (name: string) => string[]
}>(), {
  nameSuggestions: () => [],
})

const valueSuggestionsFor = (name: string) => {
  return props.getValueSuggestions ? props.getValueSuggestions(name) : []
}

const emit = defineEmits<{
  remove: [headerId: string]
  update: [headerId: string, updates: Partial<HeaderRule>]
  toggle: [headerId: string]
  duplicate: [headerId: string]
  reorder: [orderedIds: string[]]
}>()
</script>

<template>
  <div class="flex flex-col bg-background">
    <!-- Headers List -->
    <DraggableList :items="headers" @reorder="emit('reorder', $event)">
      <template #default="{ item }">
        <HeaderRow
          :header="item"
          :name-suggestions="props.nameSuggestions"
          :value-suggestions="valueSuggestionsFor(item.name)"
          @update="updates => emit('update', item.id, updates)"
          @remove="emit('remove', item.id)"
          @toggle="emit('toggle', item.id)"
          @duplicate="emit('duplicate', item.id)" />
      </template>
    </DraggableList>

    <!-- Empty state -->
    <div
      v-if="headers.length === 0"
      class="flex items-center justify-center py-6 text-sm text-muted-foreground bg-background">
      {{ t('headers_empty_state') }}
    </div>
  </div>
</template>
