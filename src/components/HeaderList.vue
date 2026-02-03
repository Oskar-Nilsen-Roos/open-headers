<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { HeaderRule, HeaderType } from '@/types'
import { createSwapy, utils } from 'swapy'
import type { Swapy, SlotItemMapArray } from 'swapy'
import HeaderRow from './HeaderRow.vue'
import { t } from '@/i18n'

const props = defineProps<{
  title: string
  type: HeaderType
  headers: HeaderRule[]
  color?: string
}>()

const emit = defineEmits<{
  add: []
  remove: [headerId: string]
  update: [headerId: string, updates: Partial<HeaderRule>]
  toggle: [headerId: string]
  duplicate: [headerId: string]
  clear: []
  reorder: [orderedIds: string[]]
}>()

const headerCount = computed(() => props.headers.length)
const activeCount = computed(() => props.headers.filter(h => h.enabled).length)

// Swapy state
const container = ref<HTMLElement | null>(null)
const swapy = ref<Swapy | null>(null)
const items = ref<HeaderRule[]>([...props.headers])

// Slot-item mapping for Swapy
const slotItemMap = ref<SlotItemMapArray>([...utils.initSlotItemMap(items.value, 'id')])

// Computed slotted items for rendering
const slottedItems = computed(() =>
  utils.toSlottedItems(items.value, 'id', slotItemMap.value)
)

// Helper to get set of IDs
const getIdSet = (headers: HeaderRule[]) => new Set(headers.map(h => h.id))

// Watch for external changes (add/remove from store)
// Only update items when headers are added or removed, not reordered
watch(
  () => props.headers,
  (newHeaders, oldHeaders) => {
    const newIds = getIdSet(newHeaders)
    const oldIds = getIdSet(oldHeaders || [])

    // Check if items were added or removed (not just reordered)
    const isAddOrRemove =
      newIds.size !== oldIds.size ||
      [...newIds].some(id => !oldIds.has(id)) ||
      [...oldIds].some(id => !newIds.has(id))

    if (isAddOrRemove) {
      items.value = [...newHeaders]
      // dynamicSwapy handles updating slotItemMap and calling swapy.update()
      nextTick(() => {
        utils.dynamicSwapy(
          swapy.value,
          items.value,
          'id',
          slotItemMap.value,
          (newMap: SlotItemMapArray) => {
            slotItemMap.value = newMap
          }
        )
      })
    }
  },
  { deep: true }
)

// When an input loses focus, update Swapy to ensure it has fresh DOM state
// This fixes drag issues after editing header fields
function handleFocusOut(event: FocusEvent) {
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT') {
    // Use nextTick to ensure Vue has finished any reactive updates
    nextTick(() => {
      swapy.value?.update()
    })
  }
}

onMounted(() => {
  if (container.value) {
    // Listen for focusout to update Swapy after editing inputs
    container.value.addEventListener('focusout', handleFocusOut)

    swapy.value = createSwapy(container.value, {
      manualSwap: true,
      animation: 'dynamic',
      autoScrollOnDrag: true,
    })

    // onSwap fires during drag - update slotItemMap for visual feedback
    swapy.value.onSwap(event => {
      requestAnimationFrame(() => {
        slotItemMap.value = event.newSlotItemMap.asArray
      })
    })

    // onSwapEnd fires when drag ends - persist to store and update Swapy
    swapy.value.onSwapEnd(event => {
      if (!event.hasChanged) return

      // Emit new order to store
      const newOrder = event.slotItemMap.asArray
        .map(({ item }) => item)
        .filter((id): id is string => id !== null)
      emit('reorder', newOrder)

      // Update Swapy after Vue re-renders
      nextTick(() => {
        swapy.value?.update()
      })
    })
  }
})

onUnmounted(() => {
  if (container.value) {
    container.value.removeEventListener('focusout', handleFocusOut)
  }
  swapy.value?.destroy()
})
</script>

<template>
  <div class="flex flex-col">
    <!-- Section Header -->
    <div
      class="flex items-center justify-between px-3 py-2 text-primary-foreground"
      :style="{ backgroundColor: color || 'hsl(var(--primary))' }">
      <div class="flex items-center gap-2">
        <span class="font-medium text-sm text-white">{{ title }}</span>
        <span v-if="headerCount > 0" class="text-xs opacity-80">
          ({{ activeCount }}/{{ headerCount }})
        </span>
      </div>
    </div>

    <!-- Optional controls (e.g., Request/Response tabs) -->
    <div v-if="$slots.tabs" class="px-3 py-2 bg-background border-b border-border/50">
      <slot name="tabs" />
    </div>

    <!-- Headers List -->
    <div ref="container" class="flex flex-col bg-background">
      <div
        v-for="{ slotId, itemId, item } in slottedItems"
        :key="slotId"
        :data-swapy-slot="slotId">
        <div v-if="item" :key="itemId" :data-swapy-item="itemId">
          <HeaderRow
            :header="item"
            @update="updates => emit('update', item.id, updates)"
            @remove="emit('remove', item.id)"
            @toggle="emit('toggle', item.id)"
            @duplicate="emit('duplicate', item.id)" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="items.length === 0"
      class="flex items-center justify-center py-6 text-sm text-muted-foreground bg-background">
      {{ t('headers_empty_state') }}
    </div>
  </div>
</template>
