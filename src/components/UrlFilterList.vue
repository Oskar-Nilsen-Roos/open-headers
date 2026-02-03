<script setup lang="ts">
import { computed } from 'vue'
import type { UrlFilter } from '@/types'
import UrlFilterRow from './UrlFilterRow.vue'
import { t } from '@/i18n'

const props = defineProps<{
  filters: UrlFilter[]
  color?: string
}>()

const emit = defineEmits<{
  update: [filterId: string, updates: Partial<UrlFilter>]
  remove: [filterId: string]
}>()

const filterCount = computed(() => props.filters.length)
const enabledCount = computed(() => props.filters.filter(f => f.enabled).length)

function handleUpdate(filterId: string, updates: Partial<UrlFilter>) {
  emit('update', filterId, updates)
}

function handleRemove(filterId: string) {
  emit('remove', filterId)
}
</script>

<template>
  <div class="flex flex-col">
    <!-- Section Header -->
    <div
      class="flex items-center justify-between px-3 py-2 text-primary-foreground"
      :style="{ backgroundColor: color || 'hsl(var(--primary))' }"
    >
      <div class="flex flex-col gap-0.5">
        <div class="flex items-center gap-2">
          <span class="font-medium text-sm text-white">{{ t('url_filters_title') }}</span>
          <span v-if="filterCount > 0" class="text-xs opacity-80 text-white">
            ({{ enabledCount }}/{{ filterCount }})
          </span>
        </div>
        <span class="text-xs text-white/80">
          {{ t('url_filters_help_text') }}
        </span>
      </div>
    </div>

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
