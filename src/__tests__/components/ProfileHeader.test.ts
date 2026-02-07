import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfileHeader from '@/components/ProfileHeader.vue'
import type { Profile } from '@/types'

vi.mock('lucide-vue-next', () => ({
  Undo2: { template: '<span>Undo2</span>' },
  Redo2: { template: '<span>Redo2</span>' },
  Download: { template: '<span>Download</span>' },
  Pipette: { template: '<span>Pipette</span>' },
}))

describe('ProfileHeader', () => {
  const createProfile = (overrides: Partial<Profile> = {}): Profile => ({
    id: 'profile-1',
    name: 'Profile 1',
    color: '#7c3aed',
    headers: [],
    urlFilters: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  })

  const mountComponent = (props: Partial<{
    profile: Profile | null
    profileIndex: number
    canUndo: boolean
    canRedo: boolean
  }> = {}) => {
    return mount(ProfileHeader, {
      props: {
        profile: createProfile(),
        profileIndex: 0,
        canUndo: false,
        canRedo: false,
        ...props,
      },
      global: {
        stubs: {
          Button: {
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
            props: ['disabled'],
          },
          Input: {
            template: `
              <input
                v-bind="$attrs"
                :value="modelValue"
                @blur="$emit('blur')"
                @input="$emit('update:modelValue', $event.target.value)"
                @keyup="onKeyup"
              >
            `,
            props: ['modelValue'],
            methods: {
              onKeyup(event: KeyboardEvent) {
                if (event.key === 'Enter') this.$emit('keyup.enter')
                if (event.key === 'Escape') this.$emit('keyup.escape')
              },
            },
          },
          Popover: { template: '<div><slot /></div>' },
          PopoverTrigger: { template: '<div><slot /></div>' },
          PopoverContent: { template: '<div><slot /></div>' },
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: { template: '<div><slot /></div>' },
          TooltipProvider: { template: '<div><slot /></div>' },
          TooltipTrigger: { template: '<div><slot /></div>' },
        },
      },
    })
  }

  it('renders profile name and index badge', () => {
    const wrapper = mountComponent({
      profile: createProfile({ name: 'My Profile' }),
      profileIndex: 2,
    })

    expect(wrapper.text()).toContain('My Profile')
    expect(wrapper.text()).toContain('3')
  })

  it('emits undo, redo and export actions', async () => {
    const wrapper = mountComponent({ canUndo: true, canRedo: true })
    const buttons = wrapper.findAll('button')

    const undoButton = buttons.find(b => b.text().includes('Undo2'))
    const redoButton = buttons.find(b => b.text().includes('Redo2'))
    const exportButton = buttons.find(b => b.text().includes('Download'))

    await undoButton?.trigger('click')
    await redoButton?.trigger('click')
    await exportButton?.trigger('click')

    expect(wrapper.emitted('undo')).toBeTruthy()
    expect(wrapper.emitted('redo')).toBeTruthy()
    expect(wrapper.emitted('export')).toBeTruthy()
  })

  it('emits rename when editing profile name and pressing enter', async () => {
    const wrapper = mountComponent({
      profile: createProfile({ name: 'Initial Name' }),
    })

    await wrapper.find('.flex-1.font-medium.cursor-pointer').trigger('dblclick')

    const textInput = wrapper.get('[data-testid="profile-name-input"]')
    await textInput.setValue('Renamed Profile')
    await textInput.trigger('keyup', { key: 'Enter' })

    const renameEvents = wrapper.emitted('rename')
    expect(renameEvents).toBeTruthy()
    expect(renameEvents?.[0]).toEqual(['Renamed Profile'])
  })

  it('emits updateColor when hue slider changes', async () => {
    const wrapper = mountComponent({
      profile: createProfile({ color: '#7c3aed' }),
    })

    const hueSlider = wrapper.get('[data-testid="profile-color-hue-slider"]')
    await hueSlider.setValue('120')

    const events = wrapper.emitted('updateColor')
    expect(events).toBeTruthy()
    const emittedColor = events?.[0]?.[0]
    expect(typeof emittedColor).toBe('string')
    expect(emittedColor).toMatch(/^#[0-9a-f]{6}$/)
    expect(emittedColor).not.toBe('#7c3aed')
  })

  it('emits updateColor when saturation slider changes', async () => {
    const wrapper = mountComponent({
      profile: createProfile({ color: '#7c3aed' }),
    })

    const saturationSlider = wrapper.get('[data-testid="profile-color-saturation-slider"]')
    await saturationSlider.setValue('30')

    const events = wrapper.emitted('updateColor')
    expect(events).toBeTruthy()
    const emittedColor = events?.[0]?.[0]
    expect(typeof emittedColor).toBe('string')
    expect(emittedColor).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('accepts rgb value in color input', async () => {
    const wrapper = mountComponent({
      profile: createProfile({ color: '#7c3aed' }),
    })

    const colorValueInput = wrapper.get('[data-testid="profile-color-value-input"]')
    await colorValueInput.setValue('rgb(255, 0, 153)')
    await colorValueInput.trigger('keyup', { key: 'Enter' })

    const events = wrapper.emitted('updateColor')
    expect(events).toBeTruthy()
    const lastEvent = events?.[events.length - 1]
    expect(lastEvent?.[0]).toBe('#ff0099')
  })

  it('disables color trigger when profile is null', () => {
    const wrapper = mountComponent({ profile: null })
    const trigger = wrapper.get('[data-testid="profile-color-trigger"]')

    expect(trigger.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Profile')
  })
})
