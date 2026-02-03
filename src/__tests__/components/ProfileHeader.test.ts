import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfileHeader from '@/components/ProfileHeader.vue'
import type { Profile } from '@/types'

// Mock lucide-vue-next icons
vi.mock('lucide-vue-next', () => ({
  Undo2: { template: '<span>Undo2</span>' },
  Redo2: { template: '<span>Redo2</span>' },
  Plus: { template: '<span>Plus</span>' },
  Download: { template: '<span>Download</span>' },
  Upload: { template: '<span>Upload</span>' },
  MoreVertical: { template: '<span>MoreVertical</span>' },
  Copy: { template: '<span>Copy</span>' },
  Trash2: { template: '<span>Trash2</span>' },
  Moon: { template: '<span>Moon</span>' },
  Sun: { template: '<span>Sun</span>' },
  Contrast: { template: '<span>Contrast</span>' },
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
    darkModePreference: 'system' as const,
    languagePreference: 'auto' as const,
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
            template: '<input :value="modelValue" @blur="$emit(\'blur\')" @keyup="handleKeyup" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue'],
            methods: {
              handleKeyup(e: KeyboardEvent) {
                if (e.key === 'Enter') this.$emit('keyup.enter')
                if (e.key === 'Escape') this.$emit('keyup.escape')
              },
            },
          },
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: { template: '<div><slot /></div>' },
          TooltipProvider: { template: '<div><slot /></div>' },
          TooltipTrigger: { template: '<div><slot /></div>' },
          DropdownMenu: { template: '<div><slot /></div>' },
          DropdownMenuTrigger: { template: '<div><slot /></div>' },
          DropdownMenuContent: { template: '<div><slot /></div>' },
          DropdownMenuItem: {
            template: '<div @click="$emit(\'select\')"><slot /></div>',
          },
          DropdownMenuSeparator: { template: '<hr />' },
          DropdownMenuLabel: { template: '<div><slot /></div>' },
          Select: { template: '<div><slot /></div>' },
          SelectTrigger: { template: '<div><slot /></div>' },
          SelectValue: { template: '<div><slot /></div>', props: ['placeholder'] },
          SelectContent: { template: '<div><slot /></div>' },
          SelectItem: { template: '<div><slot /></div>', props: ['value'] },
          AlertDialog: { template: '<div v-if="open"><slot /></div>', props: ['open'] },
          AlertDialogContent: { template: '<div><slot /></div>' },
          AlertDialogHeader: { template: '<div><slot /></div>' },
          AlertDialogTitle: { template: '<div><slot /></div>' },
          AlertDialogDescription: { template: '<div><slot /></div>' },
          AlertDialogFooter: { template: '<div><slot /></div>' },
          AlertDialogCancel: { template: '<button @click="$emit(\'click\')">Cancel</button>' },
          AlertDialogAction: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
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

    it('renders theme toggle group with all options', () => {
      const wrapper = mountComponent()

      expect(wrapper.text()).toContain('System')
      expect(wrapper.text()).toContain('Light')
      expect(wrapper.text()).toContain('Dark')
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

    it('emits addHeader when plus button is clicked', async () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAll('button')
      const addButton = buttons.find(b => b.text().includes('Plus'))
      await addButton?.trigger('click')

      expect(wrapper.emitted('addHeader')).toBeTruthy()
    })

    it('emits export when download button is clicked', async () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAll('button')
      const exportButton = buttons.find(b => b.text().includes('Download'))
      await exportButton?.trigger('click')

      expect(wrapper.emitted('export')).toBeTruthy()
    })

    it('renders import menu item', async () => {
      const wrapper = mountComponent()
      // Verify the menu item exists in the rendered output
      expect(wrapper.html()).toContain('Import')
    })

    it('renders duplicate menu item', async () => {
      const wrapper = mountComponent()
      // Verify the menu item exists in the rendered output
      expect(wrapper.html()).toContain('Duplicate')
    })

    it('renders theme toggle buttons in dropdown menu', async () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('System')
      expect(wrapper.text()).toContain('Light')
      expect(wrapper.text()).toContain('Dark')
    })

    it('renders delete menu item', async () => {
      const wrapper = mountComponent()
      // Verify the menu item exists in the rendered output
      expect(wrapper.html()).toContain('Delete profile')
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
