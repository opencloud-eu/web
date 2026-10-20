import { useRouteQuery } from '../../../src/composables/router/useRouteQuery'
import SearchBarFilter from '../../../src/components/SearchBarFilter.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { OcFilterChip } from '@opencloud-eu/design-system/components'
import { ref } from 'vue'
import { SearchLocationFilterConstants } from '../../../src/composables/search/constants'

vi.mock('../../../src/composables/router/useRouteQuery')

const selectors = {
  filterChipStub: 'oc-filter-chip-stub'
}

describe('SearchBarFilter', () => {
  describe('filter label', () => {
    it('shows "Location filter"', () => {
      const { wrapper } = getWrapper()
      const filterLabel = wrapper
        .findComponent<typeof OcFilterChip>(selectors.filterChipStub)
        .props('filterLabel')
      expect(filterLabel).toBe('Location filter')
    })
  })
  it('shows "All files" as default option', () => {
    const { wrapper } = getWrapper({ currentFolderAvailable: true })
    const filterLabel = wrapper
      .findComponent<typeof OcFilterChip>(selectors.filterChipStub)
      .props('selectedItemNames')[0]
    expect(filterLabel).toBe('All files')
  })
  it('shows "All files" as current option if no Current folder available', () => {
    const { wrapper } = getWrapper()
    const filterLabel = wrapper
      .findComponent<typeof OcFilterChip>(selectors.filterChipStub)
      .props('selectedItemNames')[0]
    expect(filterLabel).toBe('All files')
  })
  it('shows "Current folder" as current option if given via scope', () => {
    const { wrapper } = getWrapper({ useScope: 'true' })
    const filterLabel = wrapper
      .findComponent<typeof OcFilterChip>(selectors.filterChipStub)
      .props('selectedItemNames')[0]
    expect(filterLabel).toBe('Current folder')
  })
  it('synchronizes the initial route selection without emitting a user selection', () => {
    const { wrapper } = getWrapper({ useScope: 'true' })
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toMatchObject({
      value: { id: SearchLocationFilterConstants.currentFolder }
    })
    expect(wrapper.emitted('select')).toBeUndefined()
  })
  it('synchronizes query changes without emitting a user selection', async () => {
    const { wrapper, scopeQuery } = getWrapper({ currentFolderAvailable: true, useScope: 'true' })
    scopeQuery.value = 'false'
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(OcFilterChip).props('selectedItemNames')).toEqual(['All files'])
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toMatchObject({
      value: { id: SearchLocationFilterConstants.allFiles }
    })
    scopeQuery.value = 'true'
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(OcFilterChip).props('selectedItemNames')).toEqual([
      'Current folder'
    ])
    expect(wrapper.emitted('select')).toBeUndefined()
  })
  it('overrides a scoped deep link inside a vault even if the folder is unavailable', async () => {
    const { wrapper } = getWrapper({ useScope: 'true' })
    await wrapper.setProps({ currentFolderIsInVault: true })
    expect(wrapper.findComponent(OcFilterChip).props('selectedItemNames')).toEqual(['All files'])
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toMatchObject({
      value: { id: SearchLocationFilterConstants.allFiles }
    })
    expect(
      wrapper
        .find(`[data-test-id="${SearchLocationFilterConstants.currentFolder}"]`)
        .attributes('disabled')
    ).toBeDefined()
  })
  it('remembers an explicit selection while temporarily disabling scoped search', async () => {
    const { wrapper } = getWrapper({ currentFolderAvailable: true })
    await wrapper
      .find(`[data-test-id="${SearchLocationFilterConstants.currentFolder}"]`)
      .trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toMatchObject({
      value: { id: SearchLocationFilterConstants.currentFolder }
    })

    await wrapper.setProps({ currentFolderIsInVault: true })
    expect(wrapper.findComponent(OcFilterChip).props('selectedItemNames')).toEqual(['All files'])
    await wrapper.setProps({ currentFolderIsInVault: false })
    expect(wrapper.findComponent(OcFilterChip).props('selectedItemNames')).toEqual([
      'Current folder'
    ])

    await wrapper.setProps({ currentFolderAvailable: false })
    expect(wrapper.findComponent(OcFilterChip).props('selectedItemNames')).toEqual(['All files'])
    await wrapper.setProps({ currentFolderAvailable: true })
    expect(wrapper.findComponent(OcFilterChip).props('selectedItemNames')).toEqual([
      'Current folder'
    ])
    expect(wrapper.emitted('select')).toHaveLength(1)
  })
})

function getWrapper({
  currentFolderAvailable = false,
  currentFolderIsInVault = false,
  useScope = null
}: { currentFolderAvailable?: boolean; currentFolderIsInVault?: boolean; useScope?: string } = {}) {
  const scopeQuery = ref(useScope)
  vi.mocked(useRouteQuery).mockImplementationOnce(() => scopeQuery)

  const mocks = defaultComponentMocks()
  return {
    mocks,
    scopeQuery,
    wrapper: shallowMount(SearchBarFilter, {
      props: {
        currentFolderAvailable,
        currentFolderIsInVault
      },
      global: {
        plugins: [...defaultPlugins()],
        renderStubDefaultSlot: true,
        mocks,
        provide: mocks
      }
    })
  }
}
