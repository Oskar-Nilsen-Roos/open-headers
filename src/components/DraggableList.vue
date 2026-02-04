<script setup lang="ts" generic="T extends { id: string }">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { createSwapy, utils } from 'swapy'
import type { SlotItemMapArray, Swapy } from 'swapy'

const props = defineProps<{
  items: T[]
  autoAnimate?: boolean
}>()

const emit = defineEmits<{
  reorder: [orderedIds: string[]]
}>()

defineSlots<{
  default(props: { item: T }): any
}>()

// Swapy state
const container = ref<HTMLElement | null>(null)
const swapy = ref<Swapy | null>(null)
const autoAnimateEnabled = ref(true)

const autoAnimateSupported = typeof Element !== 'undefined'
  && typeof (Element.prototype as any).animate === 'function'

const autoAnimateBinding = computed(() => ({
  enabled: autoAnimateSupported && props.autoAnimate !== false && autoAnimateEnabled.value,
  options: {
    duration: 160,
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
}))

// Slot-item mapping for Swapy
const slotItemMap = ref<SlotItemMapArray>([...utils.initSlotItemMap(props.items, 'id')])

// Computed slotted items for rendering
const slottedItems = computed(() =>
  utils.toSlottedItems(props.items, 'id', slotItemMap.value)
)

function areIdArraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, idx) => id === b[idx])
}

function areIdSetsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setA = new Set(a)
  if (setA.size !== b.length) return false
  return b.every(id => setA.has(id))
}

// Watch for external changes:
// - Add/remove: let dynamicSwapy reconcile the slot map.
// - Reorder: reset slot map so list reflects the new order (supports undo/redo).
watch(
  () => props.items.map(item => item.id),
  (newIds, oldIds) => {
    const prevIds = oldIds ?? []

    const idsChanged = !areIdSetsEqual(newIds, prevIds)
    const orderChanged = !idsChanged && !areIdArraysEqual(newIds, prevIds)

    if (idsChanged) {
      if (!swapy.value) {
        slotItemMap.value = [...utils.initSlotItemMap(props.items, 'id')]
        return
      }

      nextTick(() => {
        utils.dynamicSwapy(
          swapy.value,
          props.items,
          'id',
          slotItemMap.value,
          (newMap: SlotItemMapArray) => {
            slotItemMap.value = newMap
          }
        )
      })
      return
    }

    if (orderChanged) {
      slotItemMap.value = [...utils.initSlotItemMap(props.items, 'id')]
      nextTick(() => swapy.value?.update())
    }
  }
)

// When an input loses focus, update Swapy to ensure it has fresh DOM state
function handleFocusOut(event: FocusEvent) {
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT') {
    nextTick(() => {
      swapy.value?.update()
    })
  }
}

onMounted(() => {
  if (!container.value) return

  container.value.addEventListener('focusout', handleFocusOut)

  swapy.value = createSwapy(container.value, {
    manualSwap: true,
    animation: 'dynamic',
    autoScrollOnDrag: true,
  })

  swapy.value.onSwapStart(() => {
    autoAnimateEnabled.value = false
  })

  // onSwap fires during drag - update slotItemMap for visual feedback
  swapy.value.onSwap(event => {
    requestAnimationFrame(() => {
      slotItemMap.value = event.newSlotItemMap.asArray
    })
  })

  // onSwapEnd fires when drag ends - persist to store and update Swapy
  swapy.value.onSwapEnd(event => {
    if (!event.hasChanged) {
      autoAnimateEnabled.value = true
      return
    }

    const newOrder = event.slotItemMap.asArray
      .map(({ item }) => item)
      .filter((id): id is string => id !== null)

    emit('reorder', newOrder)

    nextTick(() => {
      swapy.value?.update()
      autoAnimateEnabled.value = true
    })
  })
})

onUnmounted(() => {
  if (container.value) {
    container.value.removeEventListener('focusout', handleFocusOut)
  }
  swapy.value?.destroy()
})
</script>

<template>
  <div
    ref="container"
    v-delay-auto-animate="autoAnimateBinding"
    class="flex flex-col bg-background"
  >
    <div
      v-for="{ slotId, itemId, item } in slottedItems"
      :key="slotId"
      :data-swapy-slot="slotId"
    >
      <div v-if="item" :key="itemId" :data-swapy-item="itemId">
        <slot :item="item" />
      </div>
    </div>
  </div>
</template>
