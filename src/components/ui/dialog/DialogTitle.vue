<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { DialogTitle } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
  asChild?: boolean
}>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <DialogTitle
    data-slot="dialog-title"
    v-bind="delegatedProps"
    :class="cn('text-lg font-semibold leading-none tracking-tight', props.class)"
  >
    <slot />
  </DialogTitle>
</template>
