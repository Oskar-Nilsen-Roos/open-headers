<script setup lang="ts">
import type { HeaderRule } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, GripVertical, Copy, Trash2 } from 'lucide-vue-next'
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
    class="flex items-center gap-2 pr-3 py-1.5 border-b border-border hover:bg-muted/30 group"
    data-testid="header-row"
  >
    <div
      data-swapy-handle
      class="shrink-0 self-stretch flex items-center px-3 -my-1.5 cursor-grab active:cursor-grabbing select-none text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
    >
      <GripVertical class="h-4 w-4" />
    </div>

    <Checkbox
      :model-value="header.enabled"
      @update:model-value="emit('toggle')"
      class="shrink-0"
    />

    <Input
      :model-value="header.name"
      @update:model-value="handleNameChange"
      :placeholder="t('placeholder_header_name')"
      class="flex-1 min-w-0 h-7 text-sm"
    />

    <Input
      :model-value="header.value"
      @update:model-value="handleValueChange"
      :placeholder="t('placeholder_value')"
      class="flex-1 min-w-0 h-7 text-sm"
      :disabled="header.operation === 'remove'"
    />

    <Input
      :model-value="header.comment"
      @update:model-value="handleCommentChange"
      :placeholder="t('placeholder_comment')"
      class="w-32 h-7 text-sm text-muted-foreground"
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
        <DropdownMenuItem @select="emit('duplicate')">
          <Copy class="h-4 w-4 mr-2" />
          {{ t('menu_duplicate') }}
        </DropdownMenuItem>
        <DropdownMenuItem class="text-destructive" @select="emit('remove')">
          <Trash2 class="h-4 w-4 mr-2" />
          {{ t('menu_delete') }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
