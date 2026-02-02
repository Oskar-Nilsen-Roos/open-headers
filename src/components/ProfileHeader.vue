<script setup lang="ts">
import { ref } from 'vue'
import type { Profile, DarkModePreference } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Undo2,
  Redo2,
  Plus,
  Download,
  Upload,
  MoreVertical,
  Copy,
  Trash2,
  Moon,
  Sun,
  Contrast,
} from 'lucide-vue-next'

const props = defineProps<{
  profile: Profile | null
  profileIndex: number
  canUndo: boolean
  canRedo: boolean
  darkModePreference: DarkModePreference
}>()

const emit = defineEmits<{
  undo: []
  redo: []
  addHeader: []
  export: []
  import: []
  duplicate: []
  delete: []
  rename: [name: string]
  setDarkMode: [preference: DarkModePreference]
}>()

function handleThemeChange(value: DarkModePreference) {
  emit('setDarkMode', value)
}

const isEditing = ref(false)
const editName = ref('')
const showDeleteDialog = ref(false)
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
        {{ profile?.name || 'Profile' }}
      </div>
      <Input
        v-else
        v-model="editName"
        class="flex-1 h-7 bg-white/20 border-white/30 text-white placeholder:text-white/50"
        @blur="finishEditing"
        @keyup.enter="finishEditing"
        @keyup.escape="cancelEditing"
        autofocus
      />

      <!-- Action Buttons -->
      <div class="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-white/80 hover:text-white hover:bg-white/10"
              :disabled="!canUndo"
              @click="emit('undo')"
            >
              <Undo2 class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-white/80 hover:text-white hover:bg-white/10"
              @click="emit('addHeader')"
            >
              <Plus class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add header</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-white/80 hover:text-white hover:bg-white/10"
              :disabled="!canRedo"
              @click="emit('redo')"
            >
              <Redo2 class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-white/80 hover:text-white hover:bg-white/10"
              @click="emit('export')"
            >
              <Download class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export profiles</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-white/80 hover:text-white hover:bg-white/10"
            >
              <MoreVertical class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @select="emit('import')">
              <Upload class="h-4 w-4 mr-2" />
              Import profiles
            </DropdownMenuItem>
            <DropdownMenuItem @select="emit('duplicate')">
              <Copy class="h-4 w-4 mr-2" />
              Duplicate profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div class="px-2 py-2">
              <div class="flex gap-2 justify-center">
                <!-- System -->
                <div class="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    :aria-pressed="darkModePreference === 'system'"
                    class="flex items-center justify-center w-16 h-12 rounded-xl transition-colors"
                    :class="darkModePreference === 'system'
                      ? 'bg-accent text-accent-foreground'
                      : 'border border-border hover:bg-accent/50'"
                    @click="handleThemeChange('system')"
                  >
                    <Contrast class="h-5 w-5" />
                  </button>
                  <span class="text-xs text-muted-foreground">System</span>
                </div>
                <!-- Light -->
                <div class="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    :aria-pressed="darkModePreference === 'light'"
                    class="flex items-center justify-center w-16 h-12 rounded-xl transition-colors"
                    :class="darkModePreference === 'light'
                      ? 'bg-accent text-accent-foreground'
                      : 'border border-border hover:bg-accent/50'"
                    @click="handleThemeChange('light')"
                  >
                    <Sun class="h-5 w-5" />
                  </button>
                  <span class="text-xs text-muted-foreground">Light</span>
                </div>
                <!-- Dark -->
                <div class="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    :aria-pressed="darkModePreference === 'dark'"
                    class="flex items-center justify-center w-16 h-12 rounded-xl transition-colors"
                    :class="darkModePreference === 'dark'
                      ? 'bg-accent text-accent-foreground'
                      : 'border border-border hover:bg-accent/50'"
                    @click="handleThemeChange('dark')"
                  >
                    <Moon class="h-5 w-5" />
                  </button>
                  <span class="text-xs text-muted-foreground">Dark</span>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="text-destructive" @select="showDeleteDialog = true">
              <Trash2 class="h-4 w-4 mr-2" />
              Delete profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete profile?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{{ profile?.name }}". This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="emit('delete')"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </TooltipProvider>
</template>
