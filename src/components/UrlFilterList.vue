<script setup lang="ts">
import { computed } from 'vue'
import type { UrlFilter } from '@/types'
import UrlFilterRow from './UrlFilterRow.vue'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  filters: UrlFilter[]
  color?: string
}>()

const emit = defineEmits<{
  addInclude: []
  addExclude: []
  clearAll: []
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
          <span class="font-medium text-sm text-white">URL filters</span>
          <span v-if="filterCount > 0" class="text-xs opacity-80 text-white">
            ({{ enabledCount }}/{{ filterCount }})
          </span>
        </div>
        <span class="text-xs text-white/80">
          Matched against current tab URL (top-level site)
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
      No URL filters. Add an include/exclude filter to control where this profile applies.
    </div>

    <!-- Actions Bar -->
    <div class="flex items-center gap-1 px-2 py-1.5 border-t border-border bg-muted/30">
      <Button variant="ghost" size="sm" class="h-7 text-xs gap-1" @click="emit('addInclude')">
        <Plus class="h-3.5 w-3.5" />
        ADD INCLUDE
      </Button>

      <Button variant="ghost" size="sm" class="h-7 text-xs gap-1" @click="emit('addExclude')">
        <Plus class="h-3.5 w-3.5" />
        ADD EXCLUDE
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="h-7 text-xs gap-1 text-destructive hover:text-destructive"
        @click="emit('clearAll')"
        :disabled="filters.length === 0"
      >
        <Trash2 class="h-3.5 w-3.5" />
        CLEAR
      </Button>
    </div>
  </div>
</template>
