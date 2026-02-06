import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfileHeader from '@/components/ProfileHeader.vue'
import type { Profile } from '@/types'

// Mock lucide-vue-next icons
vi.mock('lucide-vue-next', () => ({
  Undo2: { template: '<span>Undo2</span>' },
  Redo2: { template: '<span>Redo2</span>' },
  Download: { template: '<span>Download</span>' },
}))

describe('ProfileHeader', () => {
  const createProfile = (overrides: Partial<Profile> = {}): Profile => ({
    id: 'test-profile-id',
    name: 'Test Profile',
    color: '#7c3aed',
    headers: [],
    urlFilters: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  })

  const defaultProps = {
    profile: createProfile(),
    profileIndex: 0,
    canUndo: false,
    canRedo: false,
  }

  const mountComponent = (props = {}) => {
    return mount(ProfileHeader, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: {
          Button: {
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
            props: ['disabled', 'variant', 'size', 'class'],
          },
          Input: {
            template: '<input :value="modelValue" @blur="$emit(\'blur\')" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue'],
          },
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: { template: '<div><slot /></div>' },
          TooltipProvider: { template: '<div><slot /></div>' },
          TooltipTrigger: { template: '<div><slot /></div>' },
        },
      },
    })
  }

  describe('rendering', () => {
    it('displays profile name', () => {
      const wrapper = mountComponent({
        profile: createProfile({ name: 'My Profile' }),
      })

      expect(wrapper.text()).toContain('My Profile')
    })

    it('displays profile index + 1 as badge', () => {
      const wrapper = mountComponent({ profileIndex: 2 })

      expect(wrapper.text()).toContain('3')
    })

    it('applies profile color as background', () => {
      const wrapper = mountComponent({
        profile: createProfile({ color: '#ff0000' }),
      })

      const header = wrapper.find('[style]')
      expect(header.attributes('style')).toContain('background-color: rgb(255, 0, 0)')
    })
  })

  describe('button states', () => {
    it('disables undo button when canUndo is false', () => {
      const wrapper = mountComponent({ canUndo: false })

      const buttons = wrapper.findAll('button')
      const undoButton = buttons.find(b => b.text().includes('Undo2'))
      expect(undoButton?.attributes('disabled')).toBeDefined()
    })

    it('enables undo button when canUndo is true', () => {
      const wrapper = mountComponent({ canUndo: true })

      const buttons = wrapper.findAll('button')
      const undoButton = buttons.find(b => b.text().includes('Undo2'))
      expect(undoButton?.attributes('disabled')).toBeUndefined()
    })

    it('disables redo button when canRedo is false', () => {
      const wrapper = mountComponent({ canRedo: false })

      const buttons = wrapper.findAll('button')
      const redoButton = buttons.find(b => b.text().includes('Redo2'))
      expect(redoButton?.attributes('disabled')).toBeDefined()
    })

    it('enables redo button when canRedo is true', () => {
      const wrapper = mountComponent({ canRedo: true })

      const buttons = wrapper.findAll('button')
      const redoButton = buttons.find(b => b.text().includes('Redo2'))
      expect(redoButton?.attributes('disabled')).toBeUndefined()
    })
  })

  describe('events', () => {
    it('emits undo when undo button is clicked', async () => {
      const wrapper = mountComponent({ canUndo: true })

      const buttons = wrapper.findAll('button')
      const undoButton = buttons.find(b => b.text().includes('Undo2'))
      await undoButton?.trigger('click')

      expect(wrapper.emitted('undo')).toBeTruthy()
    })

    it('emits redo when redo button is clicked', async () => {
      const wrapper = mountComponent({ canRedo: true })

      const buttons = wrapper.findAll('button')
      const redoButton = buttons.find(b => b.text().includes('Redo2'))
      await redoButton?.trigger('click')

      expect(wrapper.emitted('redo')).toBeTruthy()
    })

    it('emits export when download button is clicked', async () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAll('button')
      const exportButton = buttons.find(b => b.text().includes('Download'))
      await exportButton?.trigger('click')

      expect(wrapper.emitted('export')).toBeTruthy()
    })
  })

  describe('inline editing', () => {
    it('shows input when profile name is double-clicked', async () => {
      const wrapper = mountComponent({
        profile: createProfile({ name: 'Test Profile' }),
      })

      const nameElement = wrapper.find('.cursor-pointer')
      await nameElement.trigger('dblclick')

      const input = wrapper.find('input')
      expect(input.exists()).toBe(true)
    })
  })

  describe('null profile handling', () => {
    it('shows default text when profile is null', () => {
      const wrapper = mountComponent({ profile: null })

      expect(wrapper.text()).toContain('Profile')
    })
  })
})
