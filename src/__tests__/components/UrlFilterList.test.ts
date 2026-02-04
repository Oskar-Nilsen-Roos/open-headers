import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UrlFilterList from '@/components/UrlFilterList.vue'
import type { UrlFilter } from '@/types'

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
      },
      global: {
        stubs: {
          DraggableList: {
            template: '<div><slot v-for="item in items" :item="item" /></div>',
            props: ['items'],
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

  it('shows empty state when no filters', () => {
    const wrapper = mountComponent([])
    expect(wrapper.text()).toContain('No URL filters')
  })

  it('re-emits row update and remove events', async () => {
    const wrapper = mountComponent([createFilter()])

    await wrapper.find('[data-testid="row-update"]').trigger('click')
    await wrapper.find('[data-testid="row-remove"]').trigger('click')

    expect(wrapper.emitted('update')?.[0]).toEqual(['f1', { pattern: 'x' }])
    expect(wrapper.emitted('remove')?.[0]).toEqual(['f1'])
  })
})
