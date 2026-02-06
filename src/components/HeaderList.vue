<script setup lang="ts">
import type { HeaderRule } from '@/types'
import HeaderRow from './HeaderRow.vue'
import DraggableList from './DraggableList.vue'
import { t } from '@/i18n'
import { Plus } from 'lucide-vue-next'

defineProps<{
  headers: HeaderRule[]
}>()

const emit = defineEmits<{
  remove: [headerId: string]
  update: [headerId: string, updates: Partial<HeaderRule>]
  toggle: [headerId: string]
  duplicate: [headerId: string]
  reorder: [orderedIds: string[]]
  add: []
}>()
</script>

<template>
  <div class="flex flex-col bg-background">
    <!-- Headers List -->
    <DraggableList :items="headers" @reorder="emit('reorder', $event)">
      <template #default="{ item }">
        <HeaderRow
          :header="item"
          @update="updates => emit('update', item.id, updates)"
          @remove="emit('remove', item.id)"
          @toggle="emit('toggle', item.id)"
          @duplicate="emit('duplicate', item.id)" />
      </template>
    </DraggableList>

    <!-- Add row -->
    <button
      type="button"
      class="w-full flex items-center gap-2 px-2 py-1.5 border-b border-dashed border-border/50 hover:border-border hover:bg-muted/20 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      :aria-label="t('tooltip_add_header')"
      @click="emit('add')">
      <div class="shrink-0 flex items-center justify-center size-8">
        <Plus class="h-3.5 w-3.5" />
      </div>
      <span class="text-xs">{{ t('button_add') }}</span>
    </button>
  </div>
</template>
