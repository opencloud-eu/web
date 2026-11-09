import List from '../../../src/views/List.vue'
import { flushPromises } from '@vue/test-utils'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { useAvailableProviders } from '../../../src/composables'
import { ref } from 'vue'
import { SearchProvider, SearchResult, queryItemAsString, useMessages } from '@opencloud-eu/web-pkg'
import { mock } from 'vitest-mock-extended'

const mockProvider = mock<SearchProvider>({
  id: 'p1',
  available: true,
  listSearch: {
    search: vi.fn()
  }
})

vi.mock('../../../src/composables/useAvailableProviders')
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteQuery: vi.fn(),
  queryItemAsString: vi.fn()
}))

describe('search result List view', () => {
  it('requests the listSearch from the current active provider', () => {
    const { wrapper } = getWrapper()
    expect((wrapper.vm as any).listSearch).toMatchObject(mockProvider.listSearch)
  })
  it.each([undefined, 'unknown'])(
    'falls back to the first provider with a listSearch for provider "%s"',
    (providerId) => {
      const { wrapper } = getWrapper({ providerId })
      expect((wrapper.vm as any).listSearch).toMatchObject(mockProvider.listSearch)
    }
  )
  it('by default loading is true', () => {
    const { wrapper } = getWrapper()
    expect((wrapper.vm as any).loading).toBeTruthy()
  })
  it('triggers the search', async () => {
    const { wrapper } = getWrapper()
    ;(wrapper.vm as any).search('term')
    await flushPromises()
    expect(mockProvider.listSearch.search).toHaveBeenCalledTimes(1)
  })
  describe('failed search', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    it('shows an error message and stops loading', async () => {
      const { wrapper } = getWrapper()
      vi.mocked(mockProvider.listSearch.search).mockRejectedValueOnce(new Error('500'))
      ;(wrapper.vm as any).search('term')
      await flushPromises()
      expect(useMessages().showErrorMessage).toHaveBeenCalledTimes(1)
      expect(useMessages().showErrorMessage).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Failed to search' })
      )
      expect((wrapper.vm as any).loading).toBe(false)
    })
    it('shows no error message for a cancelled search', async () => {
      const { wrapper } = getWrapper()
      vi.mocked(mockProvider.listSearch.search).mockRejectedValueOnce('cancel')
      ;(wrapper.vm as any).search('term')
      await flushPromises()
      expect(useMessages().showErrorMessage).not.toHaveBeenCalled()
    })
    it('shows no error message for a search that got replaced by a newer one', async () => {
      const { wrapper } = getWrapper()
      let failFirstSearch: (e: Error) => void
      let resolveSecondSearch: (result: SearchResult) => void
      vi.mocked(mockProvider.listSearch.search)
        .mockReturnValueOnce(new Promise((_, reject) => (failFirstSearch = reject)))
        .mockReturnValueOnce(new Promise((resolve) => (resolveSecondSearch = resolve)))
      ;(wrapper.vm as any).search('term')
      await flushPromises()
      ;(wrapper.vm as any).search('other term')
      await flushPromises()

      failFirstSearch(new Error('500'))
      await flushPromises()
      expect(useMessages().showErrorMessage).not.toHaveBeenCalled()
      expect((wrapper.vm as any).loading).toBe(true)

      resolveSecondSearch({ values: [], totalResults: 0 })
      await flushPromises()
      expect((wrapper.vm as any).loading).toBe(false)
    })
    it('shows no error message for a search that fails after leaving the page', async () => {
      const { wrapper } = getWrapper()
      let failSearch: (e: Error) => void
      vi.mocked(mockProvider.listSearch.search).mockReturnValueOnce(
        new Promise((_, reject) => (failSearch = reject))
      )
      ;(wrapper.vm as any).search('term')
      await flushPromises()
      wrapper.unmount()

      failSearch(new Error('500'))
      await flushPromises()
      expect(useMessages().showErrorMessage).not.toHaveBeenCalled()
    })
  })
})

const getWrapper = ({ providerId = 'p1' }: { providerId?: string } = {}) => {
  const providerWithoutList = mock<SearchProvider>({ id: 'p0', available: true, listSearch: null })
  vi.mocked(useAvailableProviders).mockReturnValue(ref([providerWithoutList, mockProvider]))
  vi.mocked(queryItemAsString).mockReturnValue(providerId)
  const mocks = { ...defaultComponentMocks() }
  return {
    wrapper: mount(List, {
      global: { mocks, plugins: [...defaultPlugins()] }
    })
  }
}
