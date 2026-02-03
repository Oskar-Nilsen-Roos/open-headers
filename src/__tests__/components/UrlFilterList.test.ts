import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UrlFilterList from '@/components/UrlFilterList.vue'
import type { UrlFilter } from '@/types'

vi.mock('lucide-vue-next', () => ({
  Plus: { template: '<span>Plus</span>' },
}))

describe('UrlFilterList', () => {
  const createFilter = (overrides: Partial<UrlFilter> = {}): UrlFilter => ({
    id: crypto.randomUUID(),
    enabled: true,
    type: 'include',
    matchType: 'host_equals',
    pattern: 'example.com',
    ...overrides,
  })

  it('renders counts', () => {
    const filters = [
      createFilter({ enabled: true }),
      createFilter({ enabled: false }),
    ]

    const wrapper = mount(UrlFilterList, {
      props: { filters, color: '#000000' },
      global: {
        stubs: {
          UrlFilterRow: { template: '<div />' },
          Button: { template: '<button><slot /></button>' },
        },
      },
    })

    expect(wrapper.text()).toContain('URL filters')
    expect(wrapper.text()).toContain('(1/2)')
  })

  it('emits addInclude and addExclude', async () => {
    const wrapper = mount(UrlFilterList, {
      props: { filters: [] },
      global: {
        stubs: {
          UrlFilterRow: { template: '<div />' },
          Button: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        },
      },
    })

    const buttons = wrapper.findAll('button')
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')

    expect(wrapper.emitted('addInclude')).toBeTruthy()
    expect(wrapper.emitted('addExclude')).toBeTruthy()
  })

  it('forwards update and remove from UrlFilterRow', async () => {
    const filter = createFilter({ id: 'f1' })

    const wrapper = mount(UrlFilterList, {
      props: { filters: [filter] },
      global: {
        stubs: {
          Button: { template: '<button><slot /></button>' },
          UrlFilterRow: {
            props: ['filter'],
            template: `
              <div>
                <button data-testid="update" @click="$emit('update', { pattern: 'x' })" />
                <button data-testid="remove" @click="$emit('remove')" />
              </div>
            `,
          },
        },
      },
    })

    await wrapper.find('button[data-testid="update"]').trigger('click')
    await wrapper.find('button[data-testid="remove"]').trigger('click')

    expect(wrapper.emitted('update')?.[0]).toEqual(['f1', { pattern: 'x' }])
    expect(wrapper.emitted('remove')?.[0]).toEqual(['f1'])
  })
})
