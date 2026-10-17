import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { ApplicationInformation, SearchExtension } from '@opencloud-eu/web-pkg'
import { SearchResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { extensions } from '../../src/extensions'

describe('files app extensions', () => {
  describe('search provider', () => {
    it('does not cancel a running list search when a preview search starts', async () => {
      const mocks = defaultComponentMocks()
      const listResources = [mock<SearchResource>({ id: '1', name: 'foo' })]
      let resolveListRequest: (value: { resources: SearchResource[]; totalResults: number }) => void
      mocks.$clientService.webdav.search
        .mockImplementationOnce(() => new Promise((resolve) => (resolveListRequest = resolve)))
        .mockResolvedValue({ resources: [], totalResults: 0 })

      const wrapper = getComposableWrapper(
        () => {
          const searchExtension = unref(extensions(mock<ApplicationInformation>())).find(
            ({ type }) => type === 'search'
          ) as SearchExtension
          return { searchProvider: searchExtension.searchProvider }
        },
        { mocks, provide: mocks }
      )
      const { listSearch, previewSearch } = wrapper.vm.searchProvider

      const listResult = listSearch.search('foo')
      await previewSearch.search('foo')
      resolveListRequest({ resources: listResources, totalResults: 1 })

      await expect(listResult).resolves.toMatchObject({ totalResults: 1 })
    })
  })
})
