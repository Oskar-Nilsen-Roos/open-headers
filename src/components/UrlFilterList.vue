<script setup lang="ts">
import type { UrlFilter } from '@/types'
import UrlFilterRow from './UrlFilterRow.vue'
import { t } from '@/i18n'

const props = defineProps<{
  filters: UrlFilter[]
}>()

const emit = defineEmits<{
  update: [filterId: string, updates: Partial<UrlFilter>]
  remove: [filterId: string]
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
    <div class="flex flex-col bg-background">
      <UrlFilterRow
        v-for="filter in filters"
        :key="filter.id"
        :filter="filter"
        @update="handleUpdate"
        @remove="handleRemove"
      />
    </div>

    <!-- Empty state -->
    <div
      v-if="filters.length === 0"
      class="flex items-center justify-center py-6 text-sm text-muted-foreground bg-background"
    >
      {{ t('url_filters_empty_state') }}
    </div>
  </div>
</template>
