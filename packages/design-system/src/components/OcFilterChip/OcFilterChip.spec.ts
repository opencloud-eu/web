import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import OcFilterChip from './OcFilterChip.vue'
import { useGettext } from 'vue3-gettext'

vi.mock('vue3-gettext', async (importOriginal) => {
  const original = await importOriginal<typeof import('vue3-gettext')>()
  return { ...original, useGettext: vi.fn(original.useGettext) }
})

const selectors = {
  filterChipBtn: '.oc-filter-chip-button',
  filterChipLabel: '.oc-filter-chip-label',
  filterChipDrop: '.oc-filter-chip-drop',
  filterChipBtnActive: '.oc-filter-chip-button-selected',
  clearBtn: '.oc-filter-chip-clear'
}

describe('OcFilterChip', () => {
  it('renders the filterLabel when no selected item has been given', () => {
    const filterLabel = 'Users'
    const { wrapper } = getWrapper({ props: { filterLabel } })
    expect(wrapper.find(selectors.filterChipLabel).text()).toEqual(filterLabel)
  })
  it('renders the first selected item name when selected items have been given', () => {
    const selectedItemNames = ['Einstein', 'Marie']
    const { wrapper } = getWrapper({ props: { selectedItemNames } })
    expect(wrapper.find(selectors.filterChipLabel).text()).toEqual(selectedItemNames[0])
  })
  it('emits the "clearFilter"-event when clicking the clear-button', async () => {
    const { wrapper } = getWrapper({ props: { selectedItemNames: ['Einstein', 'Marie'] } })
    await wrapper.find(selectors.clearBtn).trigger('click')
    expect(wrapper.emitted('clearFilter')).toBeTruthy()
  })
  it('moves the focus to the chip when the filter is cleared', async () => {
    const { wrapper } = getWrapper({
      props: { selectedItemNames: ['Einstein'] },
      attachTo: document.body
    })
    await wrapper.find(selectors.clearBtn).trigger('click')
    await wrapper.setProps({ selectedItemNames: [] })
    await flushPromises()

    expect(document.activeElement).toBe(wrapper.find(selectors.filterChipBtn).element)
    wrapper.unmount()
  })
  describe('accessible names', () => {
    it('names the chip after the filter and its selection', () => {
      const { wrapper } = getWrapper({ props: { selectedItemNames: ['Einstein', 'Marie'] } })
      expect(wrapper.find(selectors.filterChipBtn).attributes('aria-label')).toBe(
        'Users: Einstein +1'
      )
    })
    it('translates the chip name', () => {
      const $gettext = vi.fn((msg: string) => msg)
      vi.mocked(useGettext).mockReturnValueOnce({ $gettext } as any)
      getWrapper({ props: { selectedItemNames: ['Einstein'] } })
      expect($gettext).toHaveBeenCalledWith('%{filter}: %{selection}', {
        filter: 'Users',
        selection: 'Einstein'
      })
    })
    it('keeps the visible label as name without a selection', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find(selectors.filterChipBtn).attributes('aria-label')).toBeUndefined()
    })
    it('names the clear button after the filter', () => {
      const { wrapper } = getWrapper({ props: { selectedItemNames: ['Einstein'] } })
      expect(wrapper.find(selectors.clearBtn).attributes('aria-label')).toBe('Clear filter Users')
    })
  })
  describe('isToggle is true', () => {
    it('does not render a dropdown', () => {
      const { wrapper } = getWrapper({ props: { isToggle: true } })
      expect(wrapper.find(selectors.filterChipDrop).exists()).toBeFalsy()
    })
    it.each([true, false])('exposes the toggle state as pressed (%s)', (isToggleActive) => {
      const { wrapper } = getWrapper({ props: { isToggle: true, isToggleActive } })
      expect(wrapper.find(selectors.filterChipBtn).attributes('aria-pressed')).toBe(
        isToggleActive.toString()
      )
    })
    it('marks filter as active when isToggleActive is true', () => {
      const { wrapper } = getWrapper({ props: { isToggle: true, isToggleActive: true } })
      expect(wrapper.find(selectors.filterChipBtnActive).exists()).toBeTruthy()
    })
    it('emits the "toggleFilter"-event when clicking the button', async () => {
      const { wrapper } = getWrapper({ props: { isToggle: true } })
      await wrapper.find(selectors.filterChipBtn).trigger('click')
      expect(wrapper.emitted('toggleFilter')).toBeTruthy()
    })
  })
})

const getWrapper = ({
  props = {},
  attachTo = undefined
}: { props?: Record<string, unknown>; attachTo?: HTMLElement } = {}) => {
  return {
    wrapper: mount(OcFilterChip, {
      attachTo,
      props: { filterLabel: 'Users', selectedItemNames: [], ...props },
      global: { plugins: [...defaultPlugins()] }
    })
  }
}
