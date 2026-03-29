import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HeaderRow from '@/components/HeaderRow.vue'
import type { HeaderRule, ValueSuggestion } from '@/types'

// Mock lucide-vue-next icons
vi.mock('lucide-vue-next', () => ({
  GripVertical: { template: '<span>GripVertical</span>' },
  Copy: { template: '<span>Copy</span>' },
  Trash2: { template: '<span>Trash2</span>' },
  X: { template: '<span>X</span>' },
}))

describe('HeaderRow', () => {
  const createHeader = (overrides: Partial<HeaderRule> = {}): HeaderRule => ({
    id: 'test-header-id',
    enabled: true,
    name: 'X-Test-Header',
    value: 'test-value',
    comment: 'test comment',
    type: 'request',
    operation: 'set',
    ...overrides,
  })

  const mountComponent = (
    header: HeaderRule,
    props: Partial<{ nameSuggestions: string[]; valueSuggestions: ValueSuggestion[] }> = {}
  ) => {
    return mount(HeaderRow, {
      props: { header, ...props },
      global: {
        stubs: {
          Checkbox: {
            template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', !modelValue)" />',
            props: ['modelValue'],
          },
          Input: {
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @blur="$emit(\'blur\')" @focus="$emit(\'focus\')" />',
            props: ['modelValue', 'placeholder', 'disabled'],
          },
          Button: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          Popover: { template: '<div><slot /></div>' },
          PopoverAnchor: { template: '<div><slot /></div>' },
          PopoverTrigger: { template: '<div><slot /></div>' },
          PopoverContent: { template: '<div><slot /></div>' },
          Command: { template: '<div><slot /></div>' },
          CommandList: { template: '<div><slot /></div>' },
          CommandGroup: { template: '<div><slot /></div>' },
          CommandItem: { template: '<div><slot /></div>' },
          CommandInput: {
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @blur="$emit(\'blur\')" @focus="$emit(\'focus\')" />',
            props: ['modelValue', 'placeholder', 'disabled'],
          },
        },
      },
    })
  }

  describe('rendering', () => {
    it('renders header name in input', () => {
      const header = createHeader({ name: 'Authorization' })
      const wrapper = mountComponent(header)

      const inputs = wrapper.findAll('input')
      const nameInput = inputs[1] // First is checkbox, second is name
      expect(nameInput?.element.value).toBe('Authorization')
    })

    it('renders header value in input', () => {
      const header = createHeader({ value: 'Bearer token123' })
      const wrapper = mountComponent(header)

      const inputs = wrapper.findAll('input')
      const valueInput = inputs[2] // Third input is value
      expect(valueInput?.element.value).toBe('Bearer token123')
    })

    it('renders header comment in input', () => {
      const header = createHeader({ comment: 'Auth token' })
      const wrapper = mountComponent(header)

      const inputs = wrapper.findAll('input')
      const commentInput = inputs[3] // Fourth input is comment
      expect(commentInput?.element.value).toBe('Auth token')
    })

    it('renders suggestion items for name and value', () => {
      const header = createHeader({ name: '', value: '' })
      const wrapper = mountComponent(header, {
        nameSuggestions: ['Accept', 'Authorization'],
        valueSuggestions: [{ value: 'application/json', comment: '' }],
      })

      expect(wrapper.html()).toContain('Accept')
      expect(wrapper.html()).toContain('application/json')
    })

    it('renders comment text when value suggestion has a comment', () => {
      const header = createHeader({ name: 'Authorization', value: '' })
      const wrapper = mountComponent(header, {
        valueSuggestions: [{ value: 'Bearer token123', comment: 'Production API key' }],
      })

      // Comment should be displayed
      expect(wrapper.html()).toContain('Production API key')
      // Value should also be shown as secondary text
      expect(wrapper.html()).toContain('Bearer token123')
    })

    it('renders checkbox with correct state when enabled', () => {
      const header = createHeader({ enabled: true })
      const wrapper = mountComponent(header)

      const checkbox = wrapper.find('input[type="checkbox"]')
      expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    })

    it('renders checkbox with correct state when disabled', () => {
      const header = createHeader({ enabled: false })
      const wrapper = mountComponent(header)

      const checkbox = wrapper.find('input[type="checkbox"]')
      expect((checkbox.element as HTMLInputElement).checked).toBe(false)
    })
  })

  describe('events', () => {
    it('emits toggle when checkbox is clicked', async () => {
      const header = createHeader()
      const wrapper = mountComponent(header)

      const checkbox = wrapper.find('input[type="checkbox"]')
      await checkbox.trigger('change')

      expect(wrapper.emitted('toggle')).toBeTruthy()
      expect(wrapper.emitted('toggle')?.length).toBe(1)
    })

    it('emits update with name immediately on input', async () => {
      const header = createHeader({ name: '' })
      const wrapper = mountComponent(header)

      const nameInput = wrapper.findAll('input')[1]!
      await nameInput.setValue('New-Header-Name')

      expect(wrapper.emitted('update')).toBeTruthy()
      expect(wrapper.emitted('update')?.[0]).toEqual([{ name: 'New-Header-Name' }])
    })

    it('emits update with value immediately on input', async () => {
      const header = createHeader({ value: '' })
      const wrapper = mountComponent(header)

      const valueInput = wrapper.findAll('input')[2]!
      await valueInput.setValue('new-value')

      expect(wrapper.emitted('update')).toBeTruthy()
      expect(wrapper.emitted('update')?.[0]).toEqual([{ value: 'new-value' }])
    })

    it('auto-fills comment when value matches a known suggestion', async () => {
      const header = createHeader({ value: '' })
      const wrapper = mountComponent(header, {
        valueSuggestions: [{ value: 'Bearer token', comment: 'Prod key' }],
      })

      const valueInput = wrapper.findAll('input')[2]!
      await valueInput.setValue('Bearer token')

      const updates = wrapper.emitted('update')
      expect(updates).toBeTruthy()
      expect(updates?.[0]).toEqual([{ value: 'Bearer token', comment: 'Prod key' }])
    })

    it('emits update with comment immediately on input', async () => {
      const header = createHeader({ comment: '' })
      const wrapper = mountComponent(header)

      const commentInput = wrapper.findAll('input')[3]!
      await commentInput.setValue('new comment')

      expect(wrapper.emitted('update')).toBeTruthy()
      expect(wrapper.emitted('update')?.[0]).toEqual([{ comment: 'new comment' }])
    })

    it('does not emit update when value matches current prop', async () => {
      const header = createHeader({ name: 'Same' })
      const wrapper = mountComponent(header)

      const nameInput = wrapper.findAll('input')[1]!
      await nameInput.setValue('Same')

      expect(wrapper.emitted('update')).toBeFalsy()
    })

    it('emits duplicate when duplicate button is clicked', async () => {
      const header = createHeader()
      const wrapper = mountComponent(header)

      const buttons = wrapper.findAll('button')
      const duplicateButton = buttons.find(b => b.text().includes('Copy'))
      await duplicateButton?.trigger('click')

      expect(wrapper.emitted('duplicate')).toBeTruthy()
    })

    it('emits remove when delete button is clicked', async () => {
      const header = createHeader()
      const wrapper = mountComponent(header)

      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(b => b.text().includes('Trash2'))
      await deleteButton?.trigger('click')

      expect(wrapper.emitted('remove')).toBeTruthy()
    })
  })

  describe('drag handle', () => {
    it('renders drag handle with data-swapy-handle attribute', () => {
      const header = createHeader()
      const wrapper = mountComponent(header)

      const dragHandle = wrapper.find('[data-swapy-handle]')
      expect(dragHandle.exists()).toBe(true)
    })
  })

  describe('reactive persistence — no blur required (issue #51)', () => {
    it('persists name without blur (popup dismissal safe)', async () => {
      const header = createHeader({ name: '' })
      const wrapper = mountComponent(header)

      const nameInput = wrapper.findAll('input')[1]!
      await nameInput.setValue('X-Persisted')
      // No blur needed — update emitted immediately

      expect(wrapper.emitted('update')).toBeTruthy()
      expect(wrapper.emitted('update')?.[0]).toEqual([{ name: 'X-Persisted' }])
    })

    it('persists value without blur (popup dismissal safe)', async () => {
      const header = createHeader({ value: '' })
      const wrapper = mountComponent(header)

      const valueInput = wrapper.findAll('input')[2]!
      await valueInput.setValue('secret-token')

      expect(wrapper.emitted('update')).toBeTruthy()
      expect(wrapper.emitted('update')?.[0]).toEqual([{ value: 'secret-token' }])
    })

    it('persists comment without blur (popup dismissal safe)', async () => {
      const header = createHeader({ comment: '' })
      const wrapper = mountComponent(header)

      const commentInput = wrapper.findAll('input')[3]!
      await commentInput.setValue('important note')

      expect(wrapper.emitted('update')).toBeTruthy()
      expect(wrapper.emitted('update')?.[0]).toEqual([{ comment: 'important note' }])
    })

    it('emits multiple updates for sequential keystrokes', async () => {
      const header = createHeader({ name: '' })
      const wrapper = mountComponent(header)

      const nameInput = wrapper.findAll('input')[1]!
      await nameInput.setValue('A')
      await nameInput.setValue('AB')
      await nameInput.setValue('ABC')

      const updates = wrapper.emitted('update')
      expect(updates?.length).toBe(3)
      expect(updates?.[0]).toEqual([{ name: 'A' }])
      expect(updates?.[1]).toEqual([{ name: 'AB' }])
      expect(updates?.[2]).toEqual([{ name: 'ABC' }])
    })

    it('does not echo prop changes back as updates', async () => {
      const header = createHeader({ name: 'Original' })
      const wrapper = mountComponent(header)

      // Simulate external change (undo/redo) by updating the prop
      await wrapper.setProps({ header: { ...header, name: 'From-Undo' } })

      // Should NOT emit update (this was a prop sync, not user input)
      expect(wrapper.emitted('update')).toBeFalsy()
    })
  })
})
