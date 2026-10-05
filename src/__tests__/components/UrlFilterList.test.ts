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

  it('shows add button when no filters', () => {
    const wrapper = mountComponent([])
    expect(wrapper.text().toLowerCase()).toContain('add')
  })

  it('re-emits row update and remove events', async () => {
    const wrapper = mountComponent([createFilter()])

    await wrapper.find('[data-testid="row-update"]').trigger('click')
    await wrapper.find('[data-testid="row-remove"]').trigger('click')

    expect(wrapper.emitted('update')?.[0]).toEqual(['f1', { pattern: 'x' }])
    expect(wrapper.emitted('remove')?.[0]).toEqual(['f1'])
  })

  describe('scope warning', () => {
    it('warns that headers go to all requests when there are no filters', () => {
      const wrapper = mountComponent([])

      const warning = wrapper.find('[data-testid="url-filters-warning"]')
      expect(warning.exists()).toBe(true)
      expect(warning.text()).toContain('all requests')
      expect(wrapper.find('[data-testid="url-filters-help"]').exists()).toBe(false)
    })

    it('still warns when only exclude, disabled or blank filters exist', () => {
      const wrapper = mountComponent([
        createFilter({ id: 'a', type: 'exclude' }),
        createFilter({ id: 'b', enabled: false }),
        createFilter({ id: 'c', pattern: '' }),
      ])

      expect(wrapper.find('[data-testid="url-filters-warning"]').exists()).toBe(true)
    })

    it('shows the help text instead once an include filter limits the scope', () => {
      const wrapper = mountComponent([createFilter()])

      expect(wrapper.find('[data-testid="url-filters-warning"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="url-filters-help"]').text()).toContain('URL of each request')
    })
  })
})
