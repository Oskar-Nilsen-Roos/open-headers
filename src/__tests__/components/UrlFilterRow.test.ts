import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UrlFilterRow from '@/components/UrlFilterRow.vue'
import type { UrlFilter } from '@/types'

vi.mock('lucide-vue-next', () => ({
  MoreVertical: { template: '<span>MoreVertical</span>' },
  Trash2: { template: '<span>Trash2</span>' },
  GripVertical: { template: '<span>GripVertical</span>' },
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

  const mountComponent = (filter: UrlFilter) => {
    return mount(UrlFilterRow, {
      props: { filter },
      global: {
        stubs: {
          Checkbox: {
            template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', !modelValue)" />',
            props: ['modelValue'],
          },
          Input: {
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue', 'placeholder'],
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
          Button: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: { template: '<div><slot /></div>' },
          TooltipTrigger: { template: '<div><slot /></div>' },
          DropdownMenu: { template: '<div><slot /></div>' },
          DropdownMenuTrigger: { template: '<div><slot /></div>' },
          DropdownMenuContent: { template: '<div><slot /></div>' },
          DropdownMenuItem: {
            template: '<button data-testid="delete" @click="$emit(\'select\')"><slot /></button>',
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

  it('emits update when pattern changes', async () => {
    const wrapper = mountComponent(createFilter())
    const input = wrapper.find('input:not([type="checkbox"])')
    await input.setValue('example.com')

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')?.[0]).toEqual(['filter-1', { pattern: 'example.com' }])
  })

  it('emits remove when delete is selected', async () => {
    const wrapper = mountComponent(createFilter())

    await wrapper.find('[data-testid="delete"]').trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove')?.[0]).toEqual(['filter-1'])
  })
})
