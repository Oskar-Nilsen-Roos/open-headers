<script setup lang="ts">
import { ref } from 'vue'
import type { Profile } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Undo2,
  Redo2,
  Download,
} from 'lucide-vue-next'
import { t } from '@/i18n'

const props = defineProps<{
  profile: Profile | null
  profileIndex: number
  canUndo: boolean
  canRedo: boolean
}>()

const emit = defineEmits<{
  undo: []
  redo: []
  export: []
  rename: [name: string]
}>()

const isEditing = ref(false)
const editName = ref('')
const isCanceling = ref(false)

function startEditing() {
  if (!props.profile) return
  editName.value = props.profile.name
  isEditing.value = true
  isCanceling.value = false
}

function finishEditing() {
  if (isCanceling.value) {
    // Don't save if we're canceling via Escape
    isEditing.value = false
    isCanceling.value = false
    return
  }
  if (editName.value.trim()) {
    emit('rename', editName.value.trim())
  }
  isEditing.value = false
}

function cancelEditing() {
  isCanceling.value = true
  isEditing.value = false
}
</script>

<template>
  <TooltipProvider>
    <div
      class="flex items-center gap-2 px-3 py-2 text-white"
      :style="{ backgroundColor: profile?.color || 'hsl(var(--primary))' }"
    >
      <!-- Profile Number Badge -->
      <div class="flex items-center justify-center w-7 h-7 rounded-full border-2 border-white/50 text-sm font-medium">
        {{ profileIndex + 1 }}
      </div>

      <!-- Profile Name -->
      <div v-if="!isEditing" class="flex-1 font-medium cursor-pointer" @dblclick="startEditing">
        {{ profile?.name || t('profile_unnamed') }}
      </div>
      <Input
        v-else
        v-model="editName"
        class="flex-1 h-8 bg-white/20 border-white/30 text-white placeholder:text-white/50"
        @blur="finishEditing"
        @keyup.enter="finishEditing"
        @keyup.escape="cancelEditing"
        autofocus
      />

      <!-- Action Buttons -->
      <div class="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-white/80 hover:text-white hover:bg-white/10"
              :disabled="!canUndo"
              :aria-label="t('tooltip_undo')"
              @click="emit('undo')"
            >
              <Undo2 class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ t('tooltip_undo') }}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-white/80 hover:text-white hover:bg-white/10"
              :disabled="!canRedo"
              :aria-label="t('tooltip_redo')"
              @click="emit('redo')"
            >
              <Redo2 class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ t('tooltip_redo') }}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-white/80 hover:text-white hover:bg-white/10"
              :aria-label="t('tooltip_export_profile')"
              @click="emit('export')"
            >
              <Download class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ t('tooltip_export_profile') }}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  </TooltipProvider>
</template>
