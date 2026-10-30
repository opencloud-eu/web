import { unref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import {
  useCollaboratorAutocomplete,
  useCollaboratorSearch
} from '../../../../src/composables/shares'

describe('useCollaboratorSearch', () => {
  describe('method "searchCollaborators"', () => {
    it('searches users and groups with the trimmed term', async () => {
      const mocks = defaultComponentMocks()
      mocks.$clientService.graphAuthenticated.users.listUsers.mockResolvedValue([])
      mocks.$clientService.graphAuthenticated.groups.listGroups.mockResolvedValue([])

      const wrapper = getComposableWrapper(() => useCollaboratorSearch(), {
        mocks,
        provide: mocks
      })
      await wrapper.vm.searchCollaborators(' mary ')

      expect(mocks.$clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: '"mary"' }),
        expect.anything()
      )
      expect(mocks.$clientService.graphAuthenticated.groups.listGroups).toHaveBeenCalledWith(
        expect.objectContaining({ search: '"mary"' }),
        expect.anything()
      )
    })
  })
})

describe('useCollaboratorAutocomplete', () => {
  it('stops the search progress when the search fails', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchResults = vi.fn().mockRejectedValue(new Error('403'))
    let autocomplete: ReturnType<typeof useCollaboratorAutocomplete>
    getComposableWrapper(() => {
      autocomplete = useCollaboratorAutocomplete(fetchResults)
    })

    autocomplete.onSearch('mary')
    expect(unref(autocomplete.searchInProgress)).toBe(true)
    vi.runAllTimers()
    vi.useRealTimers()
    await flushPromises()

    expect(fetchResults).toHaveBeenCalledWith('mary', expect.anything())
    expect(unref(autocomplete.searchInProgress)).toBe(false)
  })

  it('drops results of a previous search that resolves after the term changed', async () => {
    vi.useFakeTimers()
    let resolveFirst: (results: unknown[]) => void
    const fetchResults = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
    let autocomplete: ReturnType<typeof useCollaboratorAutocomplete>
    getComposableWrapper(() => {
      autocomplete = useCollaboratorAutocomplete(fetchResults)
    })

    autocomplete.onSearch('mar')
    vi.runAllTimers()
    autocomplete.onSearch('mary')
    resolveFirst([{ id: '1', displayName: 'Mark' }])
    vi.useRealTimers()
    await flushPromises()

    expect(unref(autocomplete.autocompleteResults)).toEqual([])
    expect(unref(autocomplete.searchInProgress)).toBe(true)
  })

  it('drops a pending search when the term falls below the minimum search length', async () => {
    vi.useFakeTimers()
    const fetchResults = vi.fn().mockResolvedValue([{ id: '1', displayName: 'Mark' }])
    const wrapper = createAutocompleteWrapper({ minSearchLength: 2, fetchResults })

    wrapper.vm.onSearch('mar')
    wrapper.vm.onSearch('m')
    vi.runAllTimers()
    vi.useRealTimers()
    await flushPromises()

    expect(fetchResults).not.toHaveBeenCalled()
    expect(wrapper.vm.autocompleteResults).toEqual([])
  })

  it('drops a pending search on unmount', () => {
    vi.useFakeTimers()
    const fetchResults = vi.fn().mockResolvedValue([])
    const wrapper = createAutocompleteWrapper({ fetchResults })

    wrapper.vm.onSearch('mary')
    wrapper.unmount()
    vi.runAllTimers()
    vi.useRealTimers()

    expect(fetchResults).not.toHaveBeenCalled()
  })

  describe('method "onSearch"', () => {
    it('does not count surrounding spaces towards the minimum search length', () => {
      const wrapper = createAutocompleteWrapper({ minSearchLength: 3 })
      wrapper.vm.onSearch('  ab  ')
      expect(wrapper.vm.searchInProgress).toBe(false)
    })
    it('searches once the trimmed term reaches the minimum search length', () => {
      const wrapper = createAutocompleteWrapper({ minSearchLength: 3 })
      wrapper.vm.onSearch(' abc')
      expect(wrapper.vm.searchInProgress).toBe(true)
    })
  })
})

function createAutocompleteWrapper({
  minSearchLength = 1,
  fetchResults = vi.fn().mockResolvedValue([])
} = {}) {
  const mocks = defaultComponentMocks()
  return getComposableWrapper(() => useCollaboratorAutocomplete(fetchResults), {
    mocks,
    provide: mocks,
    pluginOptions: {
      piniaOptions: {
        capabilityState: {
          capabilities: { files_sharing: { search_min_length: minSearchLength } }
        }
      }
    }
  })
}
