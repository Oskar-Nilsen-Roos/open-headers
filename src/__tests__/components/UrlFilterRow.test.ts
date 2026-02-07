import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UrlFilterRow from '@/components/UrlFilterRow.vue'
import type { UrlFilter } from '@/types'

vi.mock('lucide-vue-next', () => ({
  Copy: { template: '<span>Copy</span>' },
  Trash2: { template: '<span>Trash2</span>' },
  GripVertical: { template: '<span>GripVertical</span>' },
  X: { template: '<span>X</span>' },
}))

describe('UrlFilterRow', () => {
  const createFilter = (overrides: Partial<UrlFilter> = {}): UrlFilter => ({
    id: 'filter-1',
    enabled: true,
    type: 'include',
    matchType: 'host_equals',
    pattern: '',
    ...overrides,
  })

  const mountComponent = (filter: UrlFilter, props: Partial<{ patternSuggestions: string[] }> = {}) => {
    return mount(UrlFilterRow, {
      props: { filter, ...props },
      global: {
        stubs: {
          Checkbox: {
            template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', !modelValue)" />',
            props: ['modelValue'],
          },
          ToggleGroup: {
            template: `
              <div>
                <button data-testid="type-include" @click="$emit('update:modelValue', 'include')">include</button>
                <button data-testid="type-exclude" @click="$emit('update:modelValue', 'exclude')">exclude</button>
                <slot />
              </div>
            `,
            props: ['modelValue', 'type', 'variant', 'size'],
          },
          ToggleGroupItem: {
            template: '<div><slot /></div>',
            props: ['value'],
          },
          Select: {
            template: `
              <div>
                <button data-testid="match-regex" @click="$emit('update:modelValue', 'regex')">regex</button>
                <slot />
              </div>
            `,
            props: ['modelValue'],
          },
          SelectTrigger: { template: '<div><slot /></div>' },
          SelectValue: { template: '<div><slot /></div>' },
          SelectContent: { template: '<div><slot /></div>' },
          SelectItem: { template: '<div><slot /></div>' },
          Button: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
            props: ['variant', 'size'],
          },
          Popover: { template: '<div><slot /></div>' },
          PopoverAnchor: { template: '<div><slot /></div>' },
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

  it('emits update when enabled changes', async () => {
    const wrapper = mountComponent(createFilter())
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.trigger('change')

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')?.[0]).toEqual(['filter-1', { enabled: false }])
  })

  it('emits update when type changes', async () => {
    const wrapper = mountComponent(createFilter())
    await wrapper.find('[data-testid="type-exclude"]').trigger('click')

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')?.[0]).toEqual(['filter-1', { type: 'exclude' }])
  })

  it('emits update when matchType changes', async () => {
    const wrapper = mountComponent(createFilter())
    await wrapper.find('[data-testid="match-regex"]').trigger('click')

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')?.[0]).toEqual(['filter-1', { matchType: 'regex' }])
  })

  it('emits update when pattern input blurs with changed value', async () => {
    const wrapper = mountComponent(createFilter())
    const inputs = wrapper.findAll('input')
    const patternInput = inputs[1]! // First is checkbox, second is pattern CommandInput
    await patternInput.setValue('example.com')
    expect(wrapper.emitted('update')).toBeFalsy()
    await patternInput.trigger('blur')

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')?.[0]).toEqual(['filter-1', { pattern: 'example.com' }])
  })

  it('emits remove when delete button is clicked', async () => {
    const wrapper = mountComponent(createFilter())

    const buttons = wrapper.findAll('button')
    const deleteButton = buttons.find(b => b.text().includes('Trash2'))
    await deleteButton?.trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove')?.[0]).toEqual(['filter-1'])
  })

  it('renders pattern suggestion items', () => {
    const wrapper = mountComponent(createFilter(), {
      patternSuggestions: ['example.com', 'api.test.com'],
    })

    expect(wrapper.html()).toContain('example.com')
    expect(wrapper.html()).toContain('api.test.com')
  })
})
