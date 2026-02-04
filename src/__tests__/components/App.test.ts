import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import App from '@/App.vue'
import { useHeadersStore } from '@/stores/headers'

// Ensure the store uses localStorage in tests
vi.stubGlobal('chrome', undefined)

const TabsStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `
    <div data-test="tabs">
      <button data-test="tab-request" @click="$emit('update:modelValue', 'request')">Request</button>
      <button data-test="tab-response" @click="$emit('update:modelValue', 'response')">Response</button>
      <button data-test="tab-filters" @click="$emit('update:modelValue', 'filters')">Filters</button>
    </div>
  `,
}

const ProfileHeaderStub = {
  emits: ['addHeader'],
  template: `<button data-test="profile-add" @click="$emit('addHeader')">+</button>`,
}

const HeaderListStub = {
  props: ['headers'],
  template: `
    <div
      data-test="header-list"
      :data-count="headers.length"
    >
    </div>
  `,
}

describe('App - Header Type Tabs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to request headers tab', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHeadersStore()
    await store.loadState()
    store.loadState = vi.fn(async () => {})

    const wrapper = mount(App, {
      global: {
        plugins: [pinia],
        stubs: {
          ProfileSidebar: { template: '<div />' },
          ProfileHeader: ProfileHeaderStub,
          HeaderList: HeaderListStub,
          Tabs: TabsStub,
          Button: {
            template: '<button v-bind="$attrs" :disabled="disabled"><slot /></button>',
            props: ['disabled', 'variant', 'size', 'class'],
          },
        },
      },
    })

    await nextTick()

    expect(store.requestHeaders.length).toBe(0)
    expect(store.responseHeaders.length).toBe(0)

    expect(wrapper.get('[data-test="header-list"]').attributes('data-count')).toBe('0')

    await wrapper.get('[data-testid="footer-add"]').trigger('click')
    await nextTick()
    expect(store.requestHeaders.length).toBe(1)
    expect(store.responseHeaders.length).toBe(0)
  })

  it('switches to response headers tab and targets actions to response', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHeadersStore()
    await store.loadState()
    store.loadState = vi.fn(async () => {})

    const wrapper = mount(App, {
      global: {
        plugins: [pinia],
        stubs: {
          ProfileSidebar: { template: '<div />' },
          ProfileHeader: ProfileHeaderStub,
          HeaderList: HeaderListStub,
          Tabs: TabsStub,
          Button: {
            template: '<button v-bind="$attrs" :disabled="disabled"><slot /></button>',
            props: ['disabled', 'variant', 'size', 'class'],
          },
        },
      },
    })

    await nextTick()

    // Switch to response tab
    await wrapper.get('[data-test="tab-response"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-test="header-list"]').attributes('data-count')).toBe('0')

    // Add via list action
    await wrapper.get('[data-testid="footer-add"]').trigger('click')
    await nextTick()

    expect(store.responseHeaders.length).toBe(1)
    expect(store.requestHeaders.length).toBe(0)
    expect(wrapper.get('[data-test="header-list"]').attributes('data-count')).toBe('1')

    // Switch back to request tab and verify isolation
    await wrapper.get('[data-test="tab-request"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-test="header-list"]').attributes('data-count')).toBe('0')

    // Add via profile header (+) while on request tab
    await wrapper.get('[data-test="profile-add"]').trigger('click')
    await nextTick()
    expect(store.requestHeaders.length).toBe(1)
  })
})
