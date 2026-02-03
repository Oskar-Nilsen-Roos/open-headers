<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Profile, DarkModePreference, LanguagePreference } from '@/types'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { t } from '@/i18n'

const props = defineProps<{
  profile: Profile | null
  profileIndex: number
  canUndo: boolean
  canRedo: boolean
  darkModePreference: DarkModePreference
  languagePreference: LanguagePreference
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
  setLanguage: [preference: LanguagePreference]
}>()

function handleThemeChange(value: DarkModePreference) {
  emit('setDarkMode', value)
}

function handleLanguageChange(value: LanguagePreference) {
  emit('setLanguage', value)
}

const languageValue = computed({
  get: () => props.languagePreference,
  set: (value: LanguagePreference) => handleLanguageChange(value),
})

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
        {{ profile?.name || t('profile_unnamed') }}
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
              :aria-label="t('tooltip_add_header')"
              @click="emit('addHeader')"
            >
              <Plus class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ t('tooltip_add_header') }}</TooltipContent>
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
              :aria-label="t('tooltip_export_profiles')"
              @click="emit('export')"
            >
              <Download class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ t('tooltip_export_profiles') }}</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-white/80 hover:text-white hover:bg-white/10"
              :aria-label="t('tooltip_more_actions')"
              :title="t('tooltip_more_actions')"
            >
              <MoreVertical class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @select="emit('import')">
              <Upload class="h-4 w-4 mr-2" />
              {{ t('menu_import_profiles') }}
            </DropdownMenuItem>
            <DropdownMenuItem @select="emit('duplicate')">
              <Copy class="h-4 w-4 mr-2" />
              {{ t('menu_duplicate_profile') }}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div class="px-2 py-2">
              <div class="flex gap-2 justify-center">
                <!-- System -->
                <div class="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    :aria-pressed="darkModePreference === 'system'"
                    :aria-label="t('theme_system')"
                    class="flex items-center justify-center w-16 h-12 rounded-xl transition-colors"
                    :class="darkModePreference === 'system'
                      ? 'bg-accent text-accent-foreground'
                      : 'border border-border hover:bg-accent/50'"
                    @click="handleThemeChange('system')"
                  >
                    <Contrast class="h-5 w-5" />
                  </button>
                  <span class="text-xs text-muted-foreground">{{ t('theme_system') }}</span>
                </div>
                <!-- Light -->
                <div class="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    :aria-pressed="darkModePreference === 'light'"
                    :aria-label="t('theme_light')"
                    class="flex items-center justify-center w-16 h-12 rounded-xl transition-colors"
                    :class="darkModePreference === 'light'
                      ? 'bg-accent text-accent-foreground'
                      : 'border border-border hover:bg-accent/50'"
                    @click="handleThemeChange('light')"
                  >
                    <Sun class="h-5 w-5" />
                  </button>
                  <span class="text-xs text-muted-foreground">{{ t('theme_light') }}</span>
                </div>
                <!-- Dark -->
                <div class="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    :aria-pressed="darkModePreference === 'dark'"
                    :aria-label="t('theme_dark')"
                    class="flex items-center justify-center w-16 h-12 rounded-xl transition-colors"
                    :class="darkModePreference === 'dark'
                      ? 'bg-accent text-accent-foreground'
                      : 'border border-border hover:bg-accent/50'"
                    @click="handleThemeChange('dark')"
                  >
                    <Moon class="h-5 w-5" />
                  </button>
                  <span class="text-xs text-muted-foreground">{{ t('theme_dark') }}</span>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <div class="px-2 py-2 space-y-2">
              <div class="text-xs text-muted-foreground">{{ t('language_label') }}</div>
              <Select v-model="languageValue">
                <SelectTrigger size="sm" class="w-full">
                  <SelectValue :placeholder="t('language_option_auto')" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="auto">{{ t('language_option_auto') }}</SelectItem>
                  <SelectItem value="en">{{ t('language_option_en') }}</SelectItem>
                  <SelectItem value="sv">{{ t('language_option_sv') }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="text-destructive" @select="showDeleteDialog = true">
              <Trash2 class="h-4 w-4 mr-2" />
              {{ t('menu_delete_profile') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('dialog_delete_profile_title') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('dialog_delete_profile_description', { name: profile?.name ?? '' }) }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('button_cancel') }}</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="emit('delete')"
          >
            {{ t('menu_delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </TooltipProvider>
</template>
