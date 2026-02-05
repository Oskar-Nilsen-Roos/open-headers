<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { HeaderRule } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, GripVertical, Copy, Trash2, X } from 'lucide-vue-next'
import { t } from '@/i18n'

const props = withDefaults(defineProps<{
  header: HeaderRule
  nameSuggestions?: string[]
  valueSuggestions?: string[]
}>(), {
  nameSuggestions: () => [],
  valueSuggestions: () => [],
})

const emit = defineEmits<{
  update: [updates: Partial<HeaderRule>]
  remove: []
  toggle: []
  duplicate: []
  removeNameSuggestion: [name: string]
  removeValueSuggestion: [name: string, value: string]
}>()

const nameDraft = ref(props.header.name)
const valueDraft = ref(props.header.value)
const commentDraft = ref(props.header.comment)
const lastCommittedName = ref(props.header.name)
const lastCommittedValue = ref(props.header.value)
const lastCommittedComment = ref(props.header.comment)
const nameOpen = ref(false)
const valueOpen = ref(false)

watch(() => props.header.name, (value) => {
  nameDraft.value = value
  lastCommittedName.value = value
})

watch(() => props.header.value, (value) => {
  valueDraft.value = value
  lastCommittedValue.value = value
})

watch(() => props.header.comment, (value) => {
  commentDraft.value = value
  lastCommittedComment.value = value
})

const filteredNameSuggestions = computed(() => {
  const search = nameDraft.value.trim().toLowerCase()
  const suggestions = props.nameSuggestions ?? []
  const matches = search
    ? suggestions.filter(suggestion => suggestion.toLowerCase().includes(search))
    : suggestions
  return matches.slice(0, 5)
})

const filteredValueSuggestions = computed(() => {
  const search = valueDraft.value.trim().toLowerCase()
  const suggestions = props.valueSuggestions ?? []
  const matches = search
    ? suggestions.filter(suggestion => suggestion.toLowerCase().includes(search))
    : suggestions
  return matches.slice(0, 5)
})

function commitName(value: string) {
  if (value === lastCommittedName.value) return
  lastCommittedName.value = value
  emit('update', { name: value })
}

function commitValue(value: string) {
  if (value === lastCommittedValue.value) return
  lastCommittedValue.value = value
  emit('update', { value: value })
}

function commitComment(value: string) {
  if (value === lastCommittedComment.value) return
  lastCommittedComment.value = value
  emit('update', { comment: value })
}

function handleNameFocus() {
  nameOpen.value = true
}

function handleNameBlur() {
  commitName(nameDraft.value)
}

function handleValueFocus() {
  valueOpen.value = true
}

function handleValueBlur() {
  commitValue(valueDraft.value)
}

function handleCommentBlur() {
  commitComment(commentDraft.value)
}

function applyNameSuggestion(suggestion: string) {
  nameDraft.value = suggestion
  commitName(suggestion)
  nameOpen.value = false
}

function applyValueSuggestion(suggestion: string) {
  valueDraft.value = suggestion
  commitValue(suggestion)
  valueOpen.value = false
}

function handleNameInput() {
  nameOpen.value = true
}

function handleValueInput() {
  valueOpen.value = true
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

    <Command unstyled class="flex-1 min-w-0">
      <Popover v-model:open="nameOpen">
        <PopoverAnchor as-child>
          <CommandInput
            v-model="nameDraft"
            unstyled
            :placeholder="t('placeholder_header_name')"
            class="flex h-8 w-full min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            autocomplete="off"
            type="text"
            role="combobox"
            :aria-expanded="nameOpen"
            @focus="handleNameFocus"
            @blur="handleNameBlur"
            @click="nameOpen = true"
            @input="handleNameInput"
            @keydown.down="nameOpen = true"
            @keydown.up="nameOpen = true"
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          class="w-[--reka-popover-trigger-width] p-0"
          @open-auto-focus="event => event.preventDefault()"
        >
          <CommandList>
            <CommandGroup v-if="filteredNameSuggestions.length > 0">
              <CommandItem
                v-for="suggestion in filteredNameSuggestions"
                :key="suggestion"
                :value="suggestion"
                class="group"
                @select="() => applyNameSuggestion(suggestion)"
              >
                <span class="flex-1 truncate">{{ suggestion }}</span>
                <button
                  type="button"
                  class="ml-2 inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground hover:bg-muted/70"
                  @click.stop="emit('removeNameSuggestion', suggestion)"
                  @mousedown.stop
                  :aria-label="t('menu_delete')"
                >
                  <X class="h-3 w-3" />
                </button>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </PopoverContent>
      </Popover>
    </Command>

    <Command unstyled class="flex-1 min-w-0">
      <Popover v-model:open="valueOpen">
        <PopoverAnchor as-child>
          <CommandInput
            v-model="valueDraft"
            unstyled
            :placeholder="t('placeholder_value')"
            class="flex h-8 w-full min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="header.operation === 'remove'"
            autocomplete="off"
            type="text"
            role="combobox"
            :aria-expanded="valueOpen"
            @focus="handleValueFocus"
            @blur="handleValueBlur"
            @click="valueOpen = true"
            @input="handleValueInput"
            @keydown.down="valueOpen = true"
            @keydown.up="valueOpen = true"
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          class="w-[--reka-popover-trigger-width] p-0"
          @open-auto-focus="event => event.preventDefault()"
        >
          <CommandList>
            <CommandGroup v-if="filteredValueSuggestions.length > 0">
              <CommandItem
                v-for="suggestion in filteredValueSuggestions"
                :key="suggestion"
                :value="suggestion"
                class="group"
                @select="() => applyValueSuggestion(suggestion)"
              >
                <span class="flex-1 truncate">{{ suggestion }}</span>
                <button
                  type="button"
                  class="ml-2 inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground hover:bg-muted/70"
                  @click.stop="emit('removeValueSuggestion', header.name, suggestion)"
                  @mousedown.stop
                  :aria-label="t('menu_delete')"
                >
                  <X class="h-3 w-3" />
                </button>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </PopoverContent>
      </Popover>
    </Command>

    <Input
      v-model="commentDraft"
      :placeholder="t('placeholder_comment')"
      class="w-32 h-8 text-sm text-muted-foreground"
      @blur="handleCommentBlur"
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
