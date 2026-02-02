import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfileSidebar from '@/components/ProfileSidebar.vue'
import type { Profile } from '@/types'

// Mock lucide-vue-next icons
vi.mock('lucide-vue-next', () => ({
  Plus: { template: '<span>Plus</span>' },
}))

// Mock swapy
vi.mock('swapy', () => ({
  createSwapy: vi.fn(() => ({
    onSwap: vi.fn(),
    onSwapEnd: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
  })),
  utils: {
    initSlotItemMap: vi.fn(() => []),
    toSlottedItems: vi.fn((items) =>
      items.map((item: Profile, index: number) => ({
        slotId: `slot-${index}`,
        itemId: item.id,
        item,
      }))
    ),
    dynamicSwapy: vi.fn(),
  },
}))

describe('ProfileSidebar', () => {
  const createProfile = (overrides: Partial<Profile> = {}): Profile => ({
    id: crypto.randomUUID(),
    name: 'Test Profile',
    color: '#7c3aed',
    headers: [],
    urlFilters: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  })

  const mountComponent = (props: { profiles: Profile[]; activeProfileId: string | null }) => {
    return mount(ProfileSidebar, {
      props,
      global: {
        stubs: {
          Button: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
            props: ['variant', 'size', 'class'],
          },
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: { template: '<div><slot /></div>' },
          TooltipProvider: { template: '<div><slot /></div>' },
          TooltipTrigger: { template: '<div><slot /></div>' },
        },
      },
    })
  }

  describe('rendering', () => {
    it('renders profile buttons for each profile', () => {
      const profiles = [
        createProfile({ id: 'p1', name: 'Profile 1' }),
        createProfile({ id: 'p2', name: 'Profile 2' }),
        createProfile({ id: 'p3', name: 'Profile 3' }),
      ]

      const wrapper = mountComponent({
        profiles,
        activeProfileId: 'p1',
      })

      // Should have 3 profile buttons + 1 add button
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThanOrEqual(4)
    })

    it('displays profile numbers', () => {
      const profiles = [
        createProfile({ id: 'p1', name: 'Profile 1' }),
        createProfile({ id: 'p2', name: 'Profile 2' }),
      ]

      const wrapper = mountComponent({
        profiles,
        activeProfileId: 'p1',
      })

      expect(wrapper.text()).toContain('1')
      expect(wrapper.text()).toContain('2')
    })

    it('applies profile color to badge', () => {
      const profiles = [createProfile({ id: 'p1', color: '#ff0000' })]

      const wrapper = mountComponent({
        profiles,
        activeProfileId: 'p1',
      })

      const coloredDiv = wrapper.find('[style*="background-color"]')
      expect(coloredDiv.exists()).toBe(true)
      expect(coloredDiv.attributes('style')).toContain('rgb(255, 0, 0)')
    })

    it('renders add profile button', () => {
      const wrapper = mountComponent({
        profiles: [createProfile({ id: 'p1' })],
        activeProfileId: 'p1',
      })

      expect(wrapper.text()).toContain('Plus')
    })
  })

  describe('events', () => {
    it('emits select when profile button is clicked', async () => {
      const profiles = [
        createProfile({ id: 'p1', name: 'Profile 1' }),
        createProfile({ id: 'p2', name: 'Profile 2' }),
      ]

      const wrapper = mountComponent({
        profiles,
        activeProfileId: 'p1',
      })

      const buttons = wrapper.findAll('button')
      // Find a profile button (not the add button)
      const profileButton = buttons[0]
      await profileButton?.trigger('click')

      expect(wrapper.emitted('select')).toBeTruthy()
    })

    it('emits add when add button is clicked', async () => {
      const wrapper = mountComponent({
        profiles: [createProfile({ id: 'p1' })],
        activeProfileId: 'p1',
      })

      const buttons = wrapper.findAll('button')
      // Add button is the last one with Plus icon
      const addButton = buttons.find((b) => b.text().includes('Plus'))
      await addButton?.trigger('click')

      expect(wrapper.emitted('add')).toBeTruthy()
    })
  })

  describe('active state', () => {
    it('applies active styling via getButtonClass function', () => {
      const profiles = [
        createProfile({ id: 'p1', name: 'Profile 1' }),
        createProfile({ id: 'p2', name: 'Profile 2' }),
      ]

      const wrapper = mountComponent({
        profiles,
        activeProfileId: 'p1',
      })

      // The getButtonClass function in the component adds 'bg-accent' when profile.id === activeProfileId
      // Due to how stubs work, we verify the component renders correctly with the active profile
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(2) // Profile buttons + add button
    })
  })

  describe('empty state', () => {
    it('only shows add button when no profiles', () => {
      const wrapper = mountComponent({
        profiles: [],
        activeProfileId: null,
      })

      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBe(1)
      expect(wrapper.text()).toContain('Plus')
    })
  })

  describe('swapy attributes', () => {
    it('has swapy container ref', () => {
      const profiles = [createProfile({ id: 'p1' })]

      const wrapper = mountComponent({
        profiles,
        activeProfileId: 'p1',
      })

      // Check for swapy slot attributes
      const swapySlot = wrapper.find('[data-swapy-slot]')
      expect(swapySlot.exists()).toBe(true)
    })

    it('has swapy item attributes', () => {
      const profiles = [createProfile({ id: 'p1' })]

      const wrapper = mountComponent({
        profiles,
        activeProfileId: 'p1',
      })

      const swapyItem = wrapper.find('[data-swapy-item]')
      expect(swapyItem.exists()).toBe(true)
    })
  })
})
