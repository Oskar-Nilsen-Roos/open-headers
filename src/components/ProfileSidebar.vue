<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Profile } from '@/types'
import { createSwapy, utils } from 'swapy'
import type { Swapy, SlotItemMapArray } from 'swapy'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'

const props = defineProps<{
  profiles: Profile[]
  activeProfileId: string | null
}>()

const emit = defineEmits<{
  select: [profileId: string]
  add: []
  reorder: [orderedIds: string[]]
}>()

// Swapy state
const container = ref<HTMLElement | null>(null)
const swapy = ref<Swapy | null>(null)
const items = ref<Profile[]>([])

// Slot-item mapping for Swapy
const slotItemMap = ref<SlotItemMapArray>([])

// Computed slotted items for rendering
const slottedItems = computed(() => utils.toSlottedItems(items.value, 'id', slotItemMap.value))

// Helper to get set of IDs
const getIdSet = (profiles: Profile[]) => new Set(profiles.map(p => p.id))

// Track current item IDs to detect changes
const currentItemIds = ref<Set<string>>(new Set())

// Watch for external changes (add/remove from store)
watch(() => props.profiles, (newProfiles) => {
  const newIds = getIdSet(newProfiles)

  // Check if items were added or removed (not just reordered)
  const isAddOrRemove = newIds.size !== currentItemIds.value.size ||
    [...newIds].some(id => !currentItemIds.value.has(id)) ||
    [...currentItemIds.value].some(id => !newIds.has(id))

  if (isAddOrRemove) {
    items.value = [...newProfiles]
    slotItemMap.value = [...utils.initSlotItemMap(items.value, 'id')]
    currentItemIds.value = newIds
    nextTick(() => {
      swapy.value?.update()
    })
  }
}, { deep: true, immediate: true })

onMounted(() => {
  if (container.value) {
    swapy.value = createSwapy(container.value, {
      manualSwap: true,
      animation: 'dynamic',
    })

    swapy.value.onSwap((event) => {
      requestAnimationFrame(() => {
        slotItemMap.value = event.newSlotItemMap.asArray
      })
    })

    swapy.value.onSwapEnd((event) => {
      if (!event.hasChanged) return

      const newOrder = event.slotItemMap.asArray
        .map(({ item }) => item)
        .filter((id): id is string => id !== null)
      emit('reorder', newOrder)

      nextTick(() => {
        swapy.value?.update()
      })
    })
  }
})

onUnmounted(() => {
  swapy.value?.destroy()
})

function getButtonClass(profile: Profile, activeProfileId: string | null): string {
  return cn(
    'relative',
    profile.id === activeProfileId && 'bg-accent'
  )
}
</script>

<template>
  <TooltipProvider>
    <div class="flex flex-col gap-1 p-2 bg-muted/50 border-r border-border">
      <!-- Profile Tabs -->
      <div ref="container" class="flex flex-col gap-1">
        <div
          v-for="{ slotId, itemId, item } in slottedItems"
          :key="slotId"
          :data-swapy-slot="slotId"
        >
          <div
            v-if="item"
            :key="itemId"
            :data-swapy-item="itemId"
            class="relative"
          >
            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon"
                  :class="getButtonClass(item, activeProfileId)"
                  @click="emit('select', item.id)"
                  data-swapy-handle
                >
                  <div
                    class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white"
                    :style="{ backgroundColor: item.color }"
                  >
                    {{ slottedItems.findIndex(s => s.itemId === itemId) + 1 }}
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {{ item.name }}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <!-- Add Profile Button -->
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="mt-1 border border-dashed border-muted-foreground/30"
            @click="emit('add')"
          >
            <Plus class="h-4 w-4 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{{ t('tooltip_add_profile') }}</TooltipContent>
      </Tooltip>
    </div>

  </TooltipProvider>
</template>
