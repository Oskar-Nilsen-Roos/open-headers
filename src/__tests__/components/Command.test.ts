import { describe, it, expect, beforeAll } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, defineComponent, ref } from 'vue'

// reka-ui's Listbox calls scrollIntoView which jsdom does not implement
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

// Helper: mount a full Command combobox with given items and props
function mountCommand(options: {
  items: string[]
  filterDisabled?: boolean
  initialSearch?: string
}) {
  const { items, filterDisabled = false, initialSearch = '' } = options

  const TestHost = defineComponent({
    components: { Command, CommandGroup, CommandInput, CommandItem, CommandList },
    setup() {
      const search = ref(initialSearch)
      return { search, items, filterDisabled }
    },
    template: `
      <Command unstyled :filter-disabled="filterDisabled">
        <CommandInput v-model="search" unstyled placeholder="Search..." />
        <CommandList>
          <CommandGroup>
            <CommandItem
              v-for="item in items"
              :key="item"
              :value="item"
            >
              {{ item }}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    `,
  })

  return mount(TestHost, {
    attachTo: document.body,
  })
}

describe('Command filterDisabled', () => {
  it('renders all items when filterDisabled is true and search is non-empty', async () => {
    // This is the critical bug scenario: when filterDisabled is true, typing
    // in the search field (or having a pre-filled value) should NOT hide items.
    // The Command component defers filtering to the consumer.
    const wrapper = mountCommand({
      items: ['Accept', 'Authorization', 'Cache-Control', 'Connection'],
      filterDisabled: true,
      initialSearch: 'Authorization',
    })

    await nextTick()
    await flushPromises()

    // All items should be visible even though search is "Authorization"
    const commandItems = wrapper.findAll('[data-slot="command-item"]')
    expect(commandItems.length).toBe(4)

    expect(wrapper.text()).toContain('Accept')
    expect(wrapper.text()).toContain('Authorization')
    expect(wrapper.text()).toContain('Cache-Control')
    expect(wrapper.text()).toContain('Connection')

    wrapper.unmount()
  })

  it('renders all items when filterDisabled is true and search changes', async () => {
    const wrapper = mountCommand({
      items: ['Accept', 'Authorization', 'Cache-Control'],
      filterDisabled: true,
      initialSearch: '',
    })

    await nextTick()
    await flushPromises()

    // Initially all items visible
    expect(wrapper.findAll('[data-slot="command-item"]').length).toBe(3)

    // Type something into search -- items should still all be visible
    const input = wrapper.find('input')
    await input.setValue('Auth')
    await nextTick()
    await flushPromises()

    const commandItems = wrapper.findAll('[data-slot="command-item"]')
    expect(commandItems.length).toBe(3)

    expect(wrapper.text()).toContain('Accept')
    expect(wrapper.text()).toContain('Authorization')
    expect(wrapper.text()).toContain('Cache-Control')

    wrapper.unmount()
  })

  it('filters items when filterDisabled is false (default)', async () => {
    const wrapper = mountCommand({
      items: ['Accept', 'Authorization', 'Cache-Control'],
      filterDisabled: false,
      initialSearch: '',
    })

    await nextTick()
    await flushPromises()

    // Initially all items visible
    expect(wrapper.findAll('[data-slot="command-item"]').length).toBe(3)

    // Type something -- only matching items should remain
    const input = wrapper.find('input')
    await input.setValue('Auth')
    await nextTick()
    await flushPromises()

    const visibleItems = wrapper.findAll('[data-slot="command-item"]')
    expect(visibleItems.length).toBe(1)
    expect(visibleItems[0]?.text()).toContain('Authorization')

    wrapper.unmount()
  })

  it('does not hide group when filterDisabled is true and search is non-empty', async () => {
    const wrapper = mountCommand({
      items: ['Accept', 'Authorization'],
      filterDisabled: true,
      initialSearch: 'ZZZ-No-Match',
    })

    await nextTick()
    await flushPromises()

    // The group should NOT have hidden attribute even though search doesn't match
    const group = wrapper.find('[data-slot="command-group"]')
    expect(group.exists()).toBe(true)
    expect(group.attributes('hidden')).toBeUndefined()

    // Items should still render
    const commandItems = wrapper.findAll('[data-slot="command-item"]')
    expect(commandItems.length).toBe(2)

    wrapper.unmount()
  })

  it('hides group when filterDisabled is false and search has no matches', async () => {
    const wrapper = mountCommand({
      items: ['Accept', 'Authorization'],
      filterDisabled: false,
      initialSearch: '',
    })

    await nextTick()
    await flushPromises()

    // Type something that matches nothing
    const input = wrapper.find('input')
    await input.setValue('ZZZ-No-Match')
    await nextTick()
    await flushPromises()

    // The group should be hidden
    const group = wrapper.find('[data-slot="command-group"]')
    expect(group.exists()).toBe(true)
    expect(group.attributes('hidden')).toBe('')

    wrapper.unmount()
  })
})
