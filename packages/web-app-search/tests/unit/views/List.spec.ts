import List from '../../../src/views/List.vue'
import { defaultComponentMocks, mount } from '@opencloud-eu/web-test-helpers'
import { useAvailableProviders } from '../../../src/composables'
import { ref } from 'vue'
import { SearchProvider, queryItemAsString } from '@opencloud-eu/web-pkg'
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
    await (wrapper.vm as any).search('term')
    expect(mockProvider.listSearch.search).toHaveBeenCalledTimes(1)
  })
})

const getWrapper = ({ providerId = 'p1' }: { providerId?: string } = {}) => {
  const providerWithoutList = mock<SearchProvider>({ id: 'p0', available: true, listSearch: null })
  vi.mocked(useAvailableProviders).mockReturnValue(ref([providerWithoutList, mockProvider]))
  vi.mocked(queryItemAsString).mockReturnValue(providerId)
  const mocks = { ...defaultComponentMocks() }
  return {
    wrapper: mount(List, {
      global: { mocks }
    })
  }
}
