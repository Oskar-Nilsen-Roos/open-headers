<script setup lang="ts">
import type { ListboxFilterProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { computed, watch } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { Search } from "lucide-vue-next"
import { ListboxFilter, useForwardProps } from "reka-ui"
import { cn } from "@/lib/utils"
import { useCommand } from "."

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<ListboxFilterProps & {
  class?: HTMLAttributes["class"]
  wrapperClass?: HTMLAttributes["class"]
  showIcon?: boolean
  unstyled?: boolean
}>(), {
  showIcon: true,
  unstyled: false,
  autoFocus: false,
})

const emits = defineEmits<{
  'update:modelValue': [value: string]
}>()

const delegatedProps = reactiveOmit(props, "class", "wrapperClass", "showIcon", "unstyled")

const forwardedProps = useForwardProps(delegatedProps)

const { filterState } = useCommand()

const isControlled = computed(() => props.modelValue !== undefined)

watch(() => props.modelValue, (value) => {
  if (value === undefined) return
  if (value !== filterState.search) {
    filterState.search = value
  }
}, { immediate: true })

watch(() => filterState.search, (value) => {
  if (isControlled.value && value === props.modelValue) return
  emits('update:modelValue', value)
})
</script>

<template>
  <div
    v-if="!props.unstyled"
    data-slot="command-input-wrapper"
    :class="cn('flex h-9 items-center gap-2 border-b px-3', props.wrapperClass)"
  >
    <Search v-if="props.showIcon" class="size-4 shrink-0 opacity-50" />
    <ListboxFilter
      v-bind="{ ...forwardedProps, ...$attrs }"
      v-model="filterState.search"
      data-slot="command-input"
      :auto-focus="props.autoFocus"
      :class="cn('placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50', props.class)"
    />
  </div>
  <ListboxFilter
    v-else
    v-bind="{ ...forwardedProps, ...$attrs }"
    v-model="filterState.search"
    data-slot="command-input"
    :auto-focus="props.autoFocus"
    :class="cn('placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50', props.class)"
  />
</template>
