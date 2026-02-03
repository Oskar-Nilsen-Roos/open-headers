import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, nextTick } from 'vue'
import App from '@/App.vue'
import { useHeadersStore } from '@/stores/headers'

// App uses chrome.storage when available; tests should use localStorage.
vi.stubGlobal('chrome', undefined)

const ProfileSidebarStub = defineComponent({
  name: 'ProfileSidebar',
  template: '<div data-testid="profile-sidebar" />',
})

const ProfileHeaderStub = defineComponent({
  name: 'ProfileHeader',
  emits: ['addHeader'],
  template: '<button data-testid="profile-add" @click="$emit(\'addHeader\')">add</button>',
})

const HeaderListStub = defineComponent({
  name: 'HeaderList',
  props: {
    title: { type: String, required: true },
    type: { type: String, required: true },
    headers: { type: Array, required: true },
  },
  emits: ['add'],
  template: `
    <div data-testid="header-list">
      <div data-testid="header-list-title">{{ title }}</div>
      <div data-testid="header-list-type">{{ type }}</div>
      <div data-testid="header-list-count">{{ headers.length }}</div>
      <button data-testid="header-list-add" @click="$emit('add')">add</button>
    </div>
  `,
})

async function waitForStoreInit(store: ReturnType<typeof useHeadersStore>): Promise<void> {
  for (let i = 0; i < 25; i++) {
    if (store.isInitialized) return
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  throw new Error('Store did not initialize')
}

describe('App - Request/Response tabs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to request headers', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mount(App, {
      global: {
        plugins: [pinia],
        stubs: {
          ProfileSidebar: ProfileSidebarStub,
          ProfileHeader: ProfileHeaderStub,
          HeaderList: HeaderListStub,
        },
      },
    })

    const store = useHeadersStore()
    await waitForStoreInit(store)
    await nextTick()

    expect(wrapper.get('[data-testid="header-list-title"]').text()).toBe('Request headers')
    expect(wrapper.get('[data-testid="header-list-type"]').text()).toBe('request')
  })

  it('switches to response headers and adds response header', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mount(App, {
      global: {
        plugins: [pinia],
        stubs: {
          ProfileSidebar: ProfileSidebarStub,
          ProfileHeader: ProfileHeaderStub,
          HeaderList: HeaderListStub,
        },
      },
    })

    const store = useHeadersStore()
    await waitForStoreInit(store)
    await nextTick()

    const triggers = wrapper.findAll('[data-slot="tabs-trigger"]')
    const responseTrigger = triggers.find(t => t.text() === 'Response')
    expect(responseTrigger).toBeTruthy()
    // Reka UI activates tabs on mousedown.left (not click).
    await responseTrigger!.trigger('mousedown', { button: 0 })
    await nextTick()

    expect(wrapper.get('[data-testid="header-list-title"]').text()).toBe('Response headers')
    expect(wrapper.get('[data-testid="header-list-type"]').text()).toBe('response')

    expect(store.requestHeaders).toHaveLength(0)
    expect(store.responseHeaders).toHaveLength(0)

    await wrapper.get('[data-testid="header-list-add"]').trigger('click')
    await nextTick()

    expect(store.requestHeaders).toHaveLength(0)
    expect(store.responseHeaders).toHaveLength(1)
    expect(wrapper.get('[data-testid="header-list-count"]').text()).toBe('1')
  })
})
