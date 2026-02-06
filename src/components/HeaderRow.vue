<script setup lang="ts">
import type { HeaderRule } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GripVertical, Copy, Trash2 } from 'lucide-vue-next'
import { t } from '@/i18n'

const props = defineProps<{
  header: HeaderRule
}>()

const emit = defineEmits<{
  update: [updates: Partial<HeaderRule>]
  remove: []
  toggle: []
  duplicate: []
}>()

function handleNameChange(value: string) {
  emit('update', { name: value })
}

function handleValueChange(value: string) {
  emit('update', { value: value })
}

function handleCommentChange(value: string) {
  emit('update', { comment: value })
}
</script>

<template>
  <div
    class="flex items-center gap-2 px-2 py-2 border-b border-border hover:bg-muted/30 group"
    data-testid="header-row"
  >
    <div
      data-swapy-handle
      class="shrink-0 flex items-center justify-center size-8 cursor-grab active:cursor-grabbing select-none text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 rounded-md transition-colors"
    >
      <GripVertical class="h-4 w-4" />
    </div>

    <div class="flex items-center justify-center size-8">
      <Checkbox
        :model-value="header.enabled"
        @update:model-value="emit('toggle')"
        class="shrink-0"
      />
    </div>

    <Input
      :model-value="header.name"
      @update:model-value="handleNameChange"
      :placeholder="t('placeholder_header_name')"
      class="flex-1 min-w-0 h-8 text-sm"
    />

    <Input
      :model-value="header.value"
      @update:model-value="handleValueChange"
      :placeholder="t('placeholder_value')"
      class="flex-1 min-w-0 h-8 text-sm"
      :disabled="header.operation === 'remove'"
    />

    <Input
      :model-value="header.comment"
      @update:model-value="handleCommentChange"
      :placeholder="t('placeholder_comment')"
      class="w-32 h-8 text-sm text-muted-foreground"
    />

    <div class="flex items-center -space-x-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        class="text-muted-foreground hover:text-foreground"
        :aria-label="t('menu_duplicate')"
        :title="t('menu_duplicate')"
        @click="emit('duplicate')"
      >
        <Copy class="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        class="text-muted-foreground hover:text-destructive"
        :aria-label="t('menu_delete')"
        :title="t('menu_delete')"
        @click="emit('remove')"
      >
        <Trash2 class="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
</template>
