import { unref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useMessages } from '@opencloud-eu/web-pkg'
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
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('stops the search progress when the search fails', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchResults = vi.fn().mockRejectedValue(new Error('403'))
    let autocomplete: ReturnType<typeof useCollaboratorAutocomplete>
    getComposableWrapper(() => {
      autocomplete = useCollaboratorAutocomplete('search-input', fetchResults)
    })

    autocomplete.onSearch('mary')
    expect(unref(autocomplete.searchInProgress)).toBe(true)
    vi.runAllTimers()
    vi.useRealTimers()
    await flushPromises()

    expect(fetchResults).toHaveBeenCalledWith('mary', expect.anything())
    expect(unref(autocomplete.searchInProgress)).toBe(false)
  })

  it('reports a failed search instead of showing it as having no results', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const error = new Error('500')
    const wrapper = createAutocompleteWrapper({ fetchResults: vi.fn().mockRejectedValue(error) })
    focusSearchInput('mary')

    wrapper.vm.onSearch('mary')
    vi.runAllTimers()
    vi.useRealTimers()
    await flushPromises()

    expect(wrapper.vm.searchFailed).toBe(true)
    expect(useMessages().showErrorMessage).toHaveBeenCalledWith({
      title: 'Failed to search for users and groups',
      errors: [error]
    })

    wrapper.vm.onSearch('mar')
    expect(wrapper.vm.searchFailed).toBe(false)
  })

  it('reports nothing for a search that a newer one cancelled', async () => {
    vi.useFakeTimers()
    const fetchResults = vi
      .fn()
      .mockImplementationOnce(
        (_query: string, signal: AbortSignal) =>
          new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('', 'AbortError')))
          })
      )
      .mockResolvedValue([])
    const wrapper = createAutocompleteWrapper({ fetchResults })
    focusSearchInput('mary')

    // e.g. a refetch after switching the share type
    wrapper.vm.onSearch('mary')
    vi.runAllTimers()
    wrapper.vm.onSearch('mary')
    vi.runAllTimers()
    vi.useRealTimers()
    await flushPromises()

    expect(fetchResults).toHaveBeenCalledTimes(2)
    expect(fetchResults.mock.calls[0][1].aborted).toBe(true)
    expect(wrapper.vm.searchFailed).toBe(false)
    expect(useMessages().showErrorMessage).not.toHaveBeenCalled()
  })

  it('drops results of a previous search that resolves after the term changed', async () => {
    vi.useFakeTimers()
    let resolveFirst: (results: unknown[]) => void
    const fetchResults = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
    let autocomplete: ReturnType<typeof useCollaboratorAutocomplete>
    getComposableWrapper(() => {
      autocomplete = useCollaboratorAutocomplete('search-input', fetchResults)
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

function focusSearchInput(value: string) {
  const input = document.createElement('input')
  input.id = 'search-input'
  input.value = value
  document.body.appendChild(input)
  input.focus()
}

function createAutocompleteWrapper({
  minSearchLength = 1,
  fetchResults = vi.fn().mockResolvedValue([])
} = {}) {
  const mocks = defaultComponentMocks()
  return getComposableWrapper(() => useCollaboratorAutocomplete('search-input', fetchResults), {
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
