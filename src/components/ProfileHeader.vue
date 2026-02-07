<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { DEFAULT_PROFILE_COLORS, type Profile } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
  Pipette,
} from 'lucide-vue-next'
import { t } from '@/i18n'
import {
  type HsvColor,
  clamp,
  getReadableTextColor,
  hexToHsv,
  hsvToHex,
  parseColorInputToHex,
  toRgba,
} from '@/lib/color'

interface EyeDropperResult {
  sRGBHex: string
}

interface EyeDropperInstance {
  open: () => Promise<EyeDropperResult>
}

type EyeDropperConstructor = new () => EyeDropperInstance

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
  updateColor: [color: string]
}>()

const isEditing = ref(false)
const editName = ref('')
const isCanceling = ref(false)
const colorValueInput = ref('')
const colorInputInvalid = ref(false)

const profileColor = computed(() => {
  const normalized = parseColorInputToHex(props.profile?.color ?? '')
  return normalized ?? '#7c3aed'
})

const headerTextColor = computed(() => getReadableTextColor(profileColor.value))

const headerStyle = computed(() => ({
  backgroundColor: props.profile?.color ?? profileColor.value,
  color: headerTextColor.value,
  '--profile-header-fg': headerTextColor.value,
  '--profile-header-fg-muted': toRgba(headerTextColor.value, 0.82),
  '--profile-header-fg-soft': toRgba(headerTextColor.value, 0.14),
  '--profile-header-fg-soft-hover': toRgba(headerTextColor.value, 0.24),
  '--profile-header-fg-border': toRgba(headerTextColor.value, 0.42),
  '--profile-header-fg-input': toRgba(headerTextColor.value, 0.14),
  '--profile-header-fg-input-border': toRgba(headerTextColor.value, 0.38),
}))

const pickerColor = ref<HsvColor>(hexToHsv(profileColor.value))

const sliderTracks = computed(() => {
  const { h, s, v } = pickerColor.value
  return {
    hue: 'linear-gradient(90deg, #ff3b30 0%, #ff9500 17%, #ffcc00 33%, #34c759 50%, #00c7be 67%, #007aff 83%, #af52de 100%)',
    saturation: `linear-gradient(90deg, ${hsvToHex({ h, s: 0, v })} 0%, ${hsvToHex({ h, s: 100, v })} 100%)`,
    brightness: `linear-gradient(90deg, #09090b 0%, ${hsvToHex({ h, s, v: 100 })} 100%)`,
  }
})

const canUseEyeDropper = computed(() => {
  if (typeof window === 'undefined') return false
  return Boolean((window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper)
})

watch(profileColor, (color) => {
  pickerColor.value = hexToHsv(color)
  colorValueInput.value = color.toUpperCase()
  colorInputInvalid.value = false
}, { immediate: true })

watch(colorValueInput, () => {
  if (colorInputInvalid.value) colorInputInvalid.value = false
})

function startEditing() {
  if (!props.profile) return
  editName.value = props.profile.name
  isEditing.value = true
  isCanceling.value = false
}

function finishEditing() {
  if (isCanceling.value) {
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

function emitColor(value: string) {
  if (!props.profile) return
  const normalized = parseColorInputToHex(value)
  if (!normalized) return
  emit('updateColor', normalized)
}

function updatePickerColor(updates: Partial<HsvColor>) {
  pickerColor.value = {
    ...pickerColor.value,
    ...updates,
  }
  emitColor(hsvToHex(pickerColor.value))
}

function handleHueInput(event: Event) {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  const value = Number(target.value)
  if (Number.isNaN(value)) return
  updatePickerColor({ h: clamp(value, 0, 360) })
}

function handleSaturationInput(event: Event) {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  const value = Number(target.value)
  if (Number.isNaN(value)) return
  updatePickerColor({ s: clamp(value, 0, 100) })
}

function handleBrightnessInput(event: Event) {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  const value = Number(target.value)
  if (Number.isNaN(value)) return
  updatePickerColor({ v: clamp(value, 0, 100) })
}

function applyColorValueInput() {
  if (!props.profile) return
  const normalized = parseColorInputToHex(colorValueInput.value)
  if (!normalized) {
    colorInputInvalid.value = true
    return
  }
  colorInputInvalid.value = false
  emit('updateColor', normalized)
}

async function pickColorFromScreen() {
  if (!canUseEyeDropper.value) return
  try {
    const EyeDropperClass = (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper
    if (!EyeDropperClass) return
    const eyeDropper = new EyeDropperClass()
    const result = await eyeDropper.open()
    emitColor(result.sRGBHex)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return
    console.error('EyeDropper failed:', error)
  }
}
</script>

<template>
  <TooltipProvider>
    <div
      class="profile-header flex items-center gap-2 px-3 py-2"
      :style="headerStyle"
    >
      <Popover>
        <PopoverTrigger as-child>
          <button
            type="button"
            class="profile-header-badge flex size-7 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60"
            :aria-label="t('tooltip_change_profile_color')"
            :disabled="!profile"
            data-testid="profile-color-trigger"
          >
            {{ profileIndex + 1 }}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          class="w-[19rem] rounded-2xl border-border/70 bg-popover/95 p-4 shadow-xl backdrop-blur-sm"
          data-testid="profile-color-popover"
        >
          <div class="grid gap-4">
            <div class="grid gap-2">
              <label class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
                {{ t('profile_color_input_label') }}
              </label>
              <div class="grid gap-2 rounded-xl border border-border/70 bg-background/90 p-3 shadow-sm">
                <div class="flex items-stretch gap-2">
                  <Input
                    v-model="colorValueInput"
                    :placeholder="t('profile_color_input_placeholder')"
                    class="h-10 rounded-xl bg-background/90 font-medium tracking-wide uppercase"
                    :class="colorInputInvalid ? 'border-destructive/60 focus-visible:ring-destructive/50' : 'border-border/70'"
                    data-testid="profile-color-value-input"
                    @blur="applyColorValueInput"
                    @keyup.enter="applyColorValueInput"
                  />
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        class="size-10 shrink-0 rounded-xl"
                        :disabled="!canUseEyeDropper"
                        :aria-label="canUseEyeDropper ? t('profile_color_eyedropper') : t('profile_color_eyedropper_unavailable')"
                        data-testid="profile-color-eyedropper"
                        @click="pickColorFromScreen"
                      >
                        <Pipette class="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {{ canUseEyeDropper ? t('profile_color_eyedropper') : t('profile_color_eyedropper_unavailable') }}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p
                  class="text-[11px] tracking-wide"
                  :class="colorInputInvalid ? 'text-destructive' : 'text-muted-foreground/90'"
                >
                  {{ colorInputInvalid ? t('profile_color_input_invalid') : t('profile_color_input_hint') }}
                </p>
              </div>
            </div>

            <div class="grid gap-2">
              <label class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
                {{ t('profile_color_picker_label') }}
              </label>
              <div class="grid gap-2 rounded-xl border border-border/70 bg-background/90 p-3 shadow-sm">
                <div class="grid gap-1">
                  <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
                    <span>{{ t('profile_color_hue_label') }}</span>
                    <span class="tabular-nums">{{ Math.round(pickerColor.h) }}°</span>
                  </div>
                  <input
                    :value="pickerColor.h"
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    class="color-slider"
                    :style="{ background: sliderTracks.hue }"
                    data-testid="profile-color-hue-slider"
                    @input="handleHueInput"
                  >
                </div>

                <div class="grid gap-1">
                  <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
                    <span>{{ t('profile_color_saturation_label') }}</span>
                    <span class="tabular-nums">{{ Math.round(pickerColor.s) }}%</span>
                  </div>
                  <input
                    :value="pickerColor.s"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    class="color-slider"
                    :style="{ background: sliderTracks.saturation }"
                    data-testid="profile-color-saturation-slider"
                    @input="handleSaturationInput"
                  >
                </div>

                <div class="grid gap-1">
                  <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
                    <span>{{ t('profile_color_brightness_label') }}</span>
                    <span class="tabular-nums">{{ Math.round(pickerColor.v) }}%</span>
                  </div>
                  <input
                    :value="pickerColor.v"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    class="color-slider"
                    :style="{ background: sliderTracks.brightness }"
                    data-testid="profile-color-brightness-slider"
                    @input="handleBrightnessInput"
                  >
                </div>
              </div>
            </div>

            <div class="grid gap-2">
              <div class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
                {{ t('profile_color_presets_label') }}
              </div>
              <div class="grid gap-2 rounded-xl border border-border/70 bg-background/90 p-3 shadow-sm">
                <div class="grid grid-cols-4 justify-items-center gap-2.5">
                  <button
                    v-for="color in DEFAULT_PROFILE_COLORS"
                    :key="color"
                    type="button"
                    class="relative size-9 rounded-lg border border-black/5 transition-all duration-150 hover:-translate-y-0.5 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                    :class="color === profileColor
                      ? 'ring-2 ring-primary/90 ring-offset-2 ring-offset-popover'
                      : 'hover:shadow-md'"
                    :style="{
                      backgroundColor: color,
                      color: getReadableTextColor(color),
                    }"
                    :aria-label="`${t('profile_color_preset')} ${color}`"
                    @click="emitColor(color)"
                  >
                    <span
                      v-if="color === profileColor"
                      class="absolute inset-0 grid place-items-center text-[10px] font-bold drop-shadow-sm"
                    >
                      ✓
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div v-if="!isEditing" class="flex-1 font-medium cursor-pointer" @dblclick="startEditing">
        {{ profile?.name || t('profile_unnamed') }}
      </div>
      <Input
        v-else
        v-model="editName"
        class="profile-header-name-input flex-1 h-8"
        data-testid="profile-name-input"
        @blur="finishEditing"
        @keyup.enter="finishEditing"
        @keyup.escape="cancelEditing"
        autofocus
      />

      <div class="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              class="profile-header-action"
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
              class="profile-header-action"
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
              class="profile-header-action"
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

<style scoped>
.profile-header {
  --profile-header-fg: #f8fafc;
  --profile-header-fg-muted: rgba(248, 250, 252, 0.82);
  --profile-header-fg-soft: rgba(248, 250, 252, 0.14);
  --profile-header-fg-soft-hover: rgba(248, 250, 252, 0.24);
  --profile-header-fg-border: rgba(248, 250, 252, 0.42);
  --profile-header-fg-input: rgba(248, 250, 252, 0.14);
  --profile-header-fg-input-border: rgba(248, 250, 252, 0.38);
}

.profile-header-badge {
  color: var(--profile-header-fg);
  border-color: var(--profile-header-fg-border);
  background: var(--profile-header-fg-soft);
}

.profile-header-badge:hover:not(:disabled) {
  border-color: var(--profile-header-fg);
  background: var(--profile-header-fg-soft-hover);
}

.profile-header-badge:focus-visible {
  box-shadow: 0 0 0 2px var(--profile-header-fg-soft-hover);
}

.profile-header-action {
  color: var(--profile-header-fg-muted);
}

.profile-header-action:hover:not(:disabled) {
  color: var(--profile-header-fg);
  background: var(--profile-header-fg-soft-hover);
}

.profile-header-name-input {
  color: var(--profile-header-fg);
  border-color: var(--profile-header-fg-input-border);
  background: var(--profile-header-fg-input);
}

.profile-header-name-input::placeholder {
  color: var(--profile-header-fg-muted);
}

.color-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 0.625rem;
  border-radius: 9999px;
  border: 1px solid hsl(var(--border) / 0.65);
  cursor: pointer;
}

.color-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 1rem;
  height: 1rem;
  border-radius: 9999px;
  background: #ffffff;
  border: 0;
  box-shadow: none;
}

.color-slider::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  border-radius: 9999px;
  background: #ffffff;
  border: 0;
  box-shadow: none;
}

.color-slider::-moz-range-track {
  height: 0.625rem;
  border-radius: 9999px;
  border: none;
  background: transparent;
}
</style>
