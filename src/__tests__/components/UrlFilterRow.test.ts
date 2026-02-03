import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UrlFilterRow from '@/components/UrlFilterRow.vue'
import type { UrlFilter } from '@/types'

vi.mock('lucide-vue-next', () => ({
  Trash2: { template: '<span>Trash2</span>' },
}))

describe('UrlFilterRow', () => {
  const createFilter = (overrides: Partial<UrlFilter> = {}): UrlFilter => ({
    id: 'filter-id',
    enabled: true,
    type: 'include',
    matchType: 'host_equals',
    pattern: 'example.com',
    ...overrides,
  })

  const mountComponent = (filter: UrlFilter) => {
    return mount(UrlFilterRow, {
      props: { filter },
      global: {
        stubs: {
          Checkbox: {
            template:
              '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', !modelValue)" />',
            props: ['modelValue'],
          },
          Input: {
            template: '<input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue', 'placeholder'],
          },
          Button: {
            template: '<button v-bind="$attrs"><slot /></button>',
          },
        },
      },
    })
  }

  it('renders current filter values', () => {
    const wrapper = mountComponent(createFilter({ pattern: 'example.com' }))

    expect(wrapper.find('select[aria-label="Filter type"]').exists()).toBe(true)
    expect(wrapper.find('select[aria-label="Match type"]').exists()).toBe(true)
    expect(wrapper.find('input[placeholder="example.com"]').exists()).toBe(true)
  })

  it('emits update when enabled is toggled', async () => {
    const wrapper = mountComponent(createFilter({ enabled: true }))

    await wrapper.find('input[type="checkbox"]').trigger('change')

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')?.[0]).toEqual([{ enabled: false }])
  })

  it('emits update when type changes', async () => {
    const wrapper = mountComponent(createFilter({ type: 'include' }))

    await wrapper.find('select[aria-label="Filter type"]').setValue('exclude')

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')?.[0]).toEqual([{ type: 'exclude' }])
  })

  it('emits update when matchType changes', async () => {
    const wrapper = mountComponent(createFilter({ matchType: 'host_equals' }))

    await wrapper.find('select[aria-label="Match type"]').setValue('url_contains')

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')?.[0]).toEqual([{ matchType: 'url_contains' }])
  })

  it('emits update when pattern changes', async () => {
    const wrapper = mountComponent(createFilter({ pattern: 'example.com' }))

    await wrapper.find('input[placeholder="example.com"]').setValue('new.example.com')

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')?.[0]).toEqual([{ pattern: 'new.example.com' }])
  })

  it('emits remove when delete is clicked', async () => {
    const wrapper = mountComponent(createFilter())

    await wrapper.find('button[aria-label="Delete filter"]').trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove')?.length).toBe(1)
  })
})
