<script setup lang="ts">
import { computed, ref, watch, type ComponentPublicInstance } from 'vue'
import type { HeaderRule, ValueSuggestion } from '@/types'
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
import { GripVertical, Copy, Trash2, X } from 'lucide-vue-next'
import { t } from '@/i18n'

const props = withDefaults(defineProps<{
  header: HeaderRule
  nameSuggestions?: string[]
  valueSuggestions?: ValueSuggestion[]
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

const valueInputRef = ref<ComponentPublicInstance | null>(null)
const commentInputRef = ref<ComponentPublicInstance | null>(null)

const nameDraft = ref(props.header.name)
const valueDraft = ref(props.header.value)
const commentDraft = ref(props.header.comment)
const lastCommittedName = ref(props.header.name)
const lastCommittedValue = ref(props.header.value)
const lastCommittedComment = ref(props.header.comment)

// Whether the user intends the popover to be open (input focused / typing)
const nameInputActive = ref(false)
const valueInputActive = ref(false)

// Whether the user has started typing since last focus — controls filtering.
// On focus: false (show all suggestions like a dropdown).
// On input: true (filter by what they're typing).
const nameIsSearching = ref(false)
const valueIsSearching = ref(false)

// Sync drafts when props change externally (undo/redo, etc.)
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
  const suggestions = props.nameSuggestions ?? []
  if (!nameIsSearching.value) return suggestions
  const search = nameDraft.value.trim().toLowerCase()
  return search
    ? suggestions.filter(s => s.toLowerCase().includes(search))
    : suggestions
})

const filteredValueSuggestions = computed(() => {
  const suggestions = props.valueSuggestions ?? []
  if (!valueIsSearching.value) return suggestions
  const search = valueDraft.value.trim().toLowerCase()
  return search
    ? suggestions.filter(s =>
        s.value.toLowerCase().includes(search) ||
        s.comment.toLowerCase().includes(search)
      )
    : suggestions
})

// Popover opens only when input is active AND there are suggestions to show.
// The setter handles Popover-initiated close (e.g. Escape key).
const namePopoverOpen = computed({
  get: () => nameInputActive.value && filteredNameSuggestions.value.length > 0,
  set: (val: boolean) => { nameInputActive.value = val },
})

const valuePopoverOpen = computed({
  get: () => valueInputActive.value && filteredValueSuggestions.value.length > 0,
  set: (val: boolean) => { valueInputActive.value = val },
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

function handleNameBlur() {
  nameInputActive.value = false
  nameIsSearching.value = false
  commitName(nameDraft.value)
}

function syncCommentFromSuggestion(value: string) {
  const match = props.valueSuggestions.find(s => s.value === value)
  if (match) {
    commentDraft.value = match.comment
    commitComment(match.comment)
  }
}

function handleValueBlur() {
  valueInputActive.value = false
  valueIsSearching.value = false
  const changed = valueDraft.value !== lastCommittedValue.value
  commitValue(valueDraft.value)
  if (changed) {
    syncCommentFromSuggestion(valueDraft.value)
  }
}

function handleCommentBlur() {
  commitComment(commentDraft.value)
}

// Flag to prevent Enter keydown from blurring after a dropdown selection
// already moved focus to the next field.
let skipNextEnterBlur = false

function applyNameSuggestion(suggestion: string) {
  skipNextEnterBlur = true
  nameDraft.value = suggestion
  commitName(suggestion)
  nameInputActive.value = false
  nameIsSearching.value = false
  focusRef(valueInputRef)
}

function applyValueSuggestion(suggestion: ValueSuggestion) {
  skipNextEnterBlur = true
  valueDraft.value = suggestion.value
  commitValue(suggestion.value)
  commentDraft.value = suggestion.comment
  commitComment(suggestion.comment)
  valueInputActive.value = false
  valueIsSearching.value = false
  focusRef(commentInputRef)
}

function focusRef(r: typeof valueInputRef | typeof commentInputRef) {
  const el = r.value?.$el
  const input = el instanceof HTMLElement ? el.querySelector('input') ?? el : null
  if (input instanceof HTMLElement) input.focus()
}

function handleNameEnterKey() {
  if (skipNextEnterBlur) {
    skipNextEnterBlur = false
    return
  }
  focusRef(valueInputRef)
}

function handleValueEnterKey() {
  if (skipNextEnterBlur) {
    skipNextEnterBlur = false
    return
  }
  focusRef(commentInputRef)
}

function blurActiveElement() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
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

    <!-- Name combobox -->
    <Command unstyled filter-disabled class="flex-1 min-w-0">
      <Popover v-model:open="namePopoverOpen">
        <PopoverAnchor as-child>
          <CommandInput
            v-model="nameDraft"
            unstyled
            :placeholder="t('placeholder_header_name')"
            class="flex h-8 w-full min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            autocomplete="off"
            type="text"
            @focus="nameInputActive = true; nameIsSearching = false"
            @blur="handleNameBlur"
            @input="nameInputActive = true; nameIsSearching = true"
            @keydown.enter="handleNameEnterKey"
            @keydown.down="nameInputActive = true"
            @keydown.up="nameInputActive = true"
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          class="w-(--reka-popper-anchor-width) p-0"
          @open-auto-focus="(e: Event) => e.preventDefault()"
          @close-auto-focus="(e: Event) => e.preventDefault()"
          @interact-outside="(e: Event) => e.preventDefault()"
          @mousedown.prevent
        >
          <CommandList>
            <CommandGroup>
              <CommandItem
                v-for="suggestion in filteredNameSuggestions"
                :key="suggestion"
                :value="suggestion"
                class="group/suggestion cursor-pointer"
                @select="() => applyNameSuggestion(suggestion)"
              >
                <span class="flex-1 truncate">{{ suggestion }}</span>
                <button
                  type="button"
                  class="ml-2 inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity group-hover/suggestion:opacity-100 hover:text-foreground hover:bg-muted/70"
                  @click.stop="emit('removeNameSuggestion', suggestion)"
                  @mousedown.stop.prevent
                  @pointerdown.stop
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

    <!-- Value combobox -->
    <Command unstyled filter-disabled class="flex-1 min-w-0">
      <Popover v-model:open="valuePopoverOpen">
        <PopoverAnchor as-child>
          <CommandInput
            ref="valueInputRef"
            v-model="valueDraft"
            unstyled
            :placeholder="t('placeholder_value')"
            class="flex h-8 w-full min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="header.operation === 'remove'"
            autocomplete="off"
            type="text"
            @focus="valueInputActive = true; valueIsSearching = false"
            @blur="handleValueBlur"
            @input="valueInputActive = true; valueIsSearching = true"
            @keydown.enter="handleValueEnterKey"
            @keydown.down="valueInputActive = true"
            @keydown.up="valueInputActive = true"
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          class="w-(--reka-popper-anchor-width) p-0"
          @open-auto-focus="(e: Event) => e.preventDefault()"
          @close-auto-focus="(e: Event) => e.preventDefault()"
          @interact-outside="(e: Event) => e.preventDefault()"
          @mousedown.prevent
        >
          <CommandList>
            <CommandGroup>
              <CommandItem
                v-for="suggestion in filteredValueSuggestions"
                :key="suggestion.value"
                :value="suggestion.value"
                class="group/suggestion cursor-pointer"
                @select="() => applyValueSuggestion(suggestion)"
              >
                <span v-if="suggestion.comment" class="flex-1 min-w-0" :title="suggestion.value">
                  <span class="block truncate text-xs">{{ suggestion.value }}</span>
                  <span class="block font-mono truncate text-xs text-muted-foreground/60">{{ suggestion.comment }}</span>
                </span>
                <span v-else class="flex-1 truncate text-xs" :title="suggestion.value">{{ suggestion.value }}</span>
                <button
                  type="button"
                  class="ml-2 inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity group-hover/suggestion:opacity-100 hover:text-foreground hover:bg-muted/70"
                  @click.stop="emit('removeValueSuggestion', header.name, suggestion.value)"
                  @mousedown.stop.prevent
                  @pointerdown.stop
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
      ref="commentInputRef"
      v-model="commentDraft"
      :placeholder="t('placeholder_comment')"
      class="w-32 h-8 text-sm text-muted-foreground"
      @blur="handleCommentBlur"
      @keydown.enter="blurActiveElement"
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
