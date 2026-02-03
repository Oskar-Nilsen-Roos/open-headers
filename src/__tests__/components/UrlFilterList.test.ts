import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UrlFilterList from '@/components/UrlFilterList.vue'
import type { UrlFilter } from '@/types'

vi.mock('lucide-vue-next', () => ({
  Plus: { template: '<span>Plus</span>' },
  Trash2: { template: '<span>Trash2</span>' },
}))

describe('UrlFilterList', () => {
  const createFilter = (overrides: Partial<UrlFilter> = {}): UrlFilter => ({
    id: 'f1',
    enabled: true,
    type: 'include',
    matchType: 'host_equals',
    pattern: 'example.com',
    ...overrides,
  })

  const mountComponent = (filters: UrlFilter[]) => {
    return mount(UrlFilterList, {
      props: {
        filters,
        color: '#7c3aed',
      },
      global: {
        stubs: {
          Button: {
            template: '<button :disabled="disabled" @click="!disabled && $emit(\'click\')"><slot /></button>',
            props: ['disabled', 'variant', 'size', 'class'],
          },
          UrlFilterRow: {
            template: `
              <div>
                <button data-testid="row-update" @click="$emit('update', filter.id, { pattern: 'x' })">update</button>
                <button data-testid="row-remove" @click="$emit('remove', filter.id)">remove</button>
              </div>
            `,
            props: ['filter'],
          },
        },
      },
    })
  }

  it('emits addInclude and addExclude on button clicks', async () => {
    const wrapper = mountComponent([])
    const buttons = wrapper.findAll('button')

    const addInclude = buttons.find(b => b.text().includes('ADD INCLUDE'))
    const addExclude = buttons.find(b => b.text().includes('ADD EXCLUDE'))

    await addInclude?.trigger('click')
    await addExclude?.trigger('click')

    expect(wrapper.emitted('addInclude')).toBeTruthy()
    expect(wrapper.emitted('addExclude')).toBeTruthy()
  })

  it('emits clearAll when clear is clicked', async () => {
    const wrapper = mountComponent([createFilter()])
    const clearButton = wrapper.findAll('button').find(b => b.text().includes('CLEAR'))
    await clearButton?.trigger('click')

    expect(wrapper.emitted('clearAll')).toBeTruthy()
  })

  it('re-emits row update and remove events', async () => {
    const wrapper = mountComponent([createFilter()])

    await wrapper.find('[data-testid="row-update"]').trigger('click')
    await wrapper.find('[data-testid="row-remove"]').trigger('click')

    expect(wrapper.emitted('update')?.[0]).toEqual(['f1', { pattern: 'x' }])
    expect(wrapper.emitted('remove')?.[0]).toEqual(['f1'])
  })
})

