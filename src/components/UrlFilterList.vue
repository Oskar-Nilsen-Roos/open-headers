<script setup lang="ts">
import { computed } from 'vue'
import type { UrlFilter } from '@/types'
import UrlFilterRow from './UrlFilterRow.vue'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-vue-next'

const props = defineProps<{
  filters: UrlFilter[]
  color?: string
}>()

const emit = defineEmits<{
  addInclude: []
  addExclude: []
  update: [filterId: string, updates: Partial<UrlFilter>]
  remove: [filterId: string]
}>()

const filterCount = computed(() => props.filters.length)
const activeCount = computed(() => props.filters.filter(f => f.enabled).length)
</script>

<template>
  <div class="flex flex-col">
    <!-- Section Header -->
    <div
      class="flex items-center justify-between px-3 py-2 text-primary-foreground"
      :style="{ backgroundColor: color || 'hsl(var(--primary))' }"
    >
      <div class="flex items-center gap-2">
        <span class="font-medium text-sm text-white">URL filters</span>
        <span v-if="filterCount > 0" class="text-xs opacity-80">
          ({{ activeCount }}/{{ filterCount }})
        </span>
      </div>

      <span class="text-xs text-white/80">Matched against current tab URL</span>
    </div>

    <!-- Filters list -->
    <div class="flex flex-col bg-background">
      <UrlFilterRow
        v-for="filter in filters"
        :key="filter.id"
        :filter="filter"
        @update="updates => emit('update', filter.id, updates)"
        @remove="emit('remove', filter.id)"
      />
    </div>

    <!-- Empty state -->
    <div
      v-if="filters.length === 0"
      class="flex items-center justify-center py-6 text-sm text-muted-foreground bg-background"
    >
      No URL filters. Add an include to limit where headers apply.
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
    </div>
  </div>
</template>

