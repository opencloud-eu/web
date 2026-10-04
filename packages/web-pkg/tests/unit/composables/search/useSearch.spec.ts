import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { CapabilityStore, useSearch } from '../../../../src/composables'
import { SearchResource, SpaceResource } from '@opencloud-eu/web-client'

describe('useSearch', () => {
  describe('method "search"', () => {
    it('can search', async () => {
      const files = [
        { id: 'foo', name: 'foo' },
        { id: 'bar', name: 'bar' },
        { id: 'baz', name: 'baz' }
      ] as SearchResource[]

      const wrapper = createWrapper({ resources: files })

      const noTermResult = await wrapper.vm.search('')
      expect(noTermResult).toEqual({ totalResults: null, values: [] })

      const withTermResult = await wrapper.vm.search('foo')
      expect(withTermResult.values.map((r) => r.data)).toMatchObject(files)
    })
    it('properly returns space resources', async () => {
      const files = [{ id: 'foo', name: 'foo', parentFolderId: '2' }] as SearchResource[]

      const wrapper = createWrapper({ resources: files })

      const withTerm = await wrapper.vm.search('foo')
      expect(withTerm.values.map((r) => r.data)[0].id).toEqual('2')
    })
  })
  describe('method "buildSearchTerm"', () => {
    it('matches the term against names, contents and tags', () => {
      const wrapper = createWrapper({ searchProperties: { content: true, tag: true } })
      expect(wrapper.vm.buildSearchTerm({ term: 'test' })).toBe(
        '(name:"*test*" OR content:"test" OR tag:"*test*")'
      )
    })
    it('does not match tags if the server does not support searching them', () => {
      const wrapper = createWrapper({ searchProperties: { content: true, tag: false } })
      expect(wrapper.vm.buildSearchTerm({ term: 'test' })).toBe('(name:"*test*" OR content:"test")')
    })
    it('only matches names in a title only search', () => {
      const wrapper = createWrapper({ searchProperties: { content: true, tag: true } })
      expect(wrapper.vm.buildSearchTerm({ term: 'test', isTitleOnlySearch: true })).toBe(
        'name:"*test*"'
      )
    })
  })
})

const createWrapper = ({
  resources = [],
  searchProperties = { content: false, tag: false }
}: {
  resources?: SearchResource[]
  searchProperties?: { content: boolean; tag: boolean }
} = {}) => {
  const spaces = [
    {
      id: '1',
      fileId: '1',
      driveType: 'personal',
      getDriveAliasAndItem: () => 'personal/admin'
    },
    {
      id: '2',
      driveType: 'project',
      name: 'New space',
      getDriveAliasAndItem: vi.fn()
    }
  ] as unknown as SpaceResource[]

  const mocks = defaultComponentMocks({})
  const capabilities = {
    spaces: { projects: true },
    search: {
      property: {
        content: { enabled: searchProperties.content },
        tag: { enabled: searchProperties.tag }
      }
    }
  } satisfies Partial<CapabilityStore['capabilities']>

  mocks.$clientService.webdav.search.mockResolvedValue({
    resources,
    totalResults: resources.length
  })

  return getComposableWrapper(
    () => {
      const { search, buildSearchTerm } = useSearch()

      return {
        search,
        buildSearchTerm
      }
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: { spacesState: { spaces }, capabilityState: { capabilities } }
      }
    }
  )
}
