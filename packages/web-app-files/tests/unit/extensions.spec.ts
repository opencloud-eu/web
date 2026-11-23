import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import {
  ApplicationInformation,
  FloatingActionButtonExtension,
  SearchExtension
} from '@opencloud-eu/web-pkg'
import {
  PublicSpaceResource,
  Resource,
  SearchResource,
  SharePermissionBit,
  SpaceResource
} from '@opencloud-eu/web-client'
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

  describe('floating action button', () => {
    function getIsDisabled({
      currentSpace,
      currentFolder
    }: {
      currentSpace?: SpaceResource
      currentFolder?: Resource
    }) {
      const mocks = defaultComponentMocks()
      const wrapper = getComposableWrapper(
        () => {
          const fab = unref(extensions(mock<ApplicationInformation>())).find(
            ({ type }) => type === 'floatingActionButton'
          ) as FloatingActionButtonExtension
          return { isDisabled: fab.isDisabled }
        },
        {
          mocks,
          provide: mocks,
          pluginOptions: {
            piniaOptions: {
              spacesState: { currentSpace },
              resourcesStore: { currentFolder }
            }
          }
        }
      )
      return wrapper.vm.isDisabled()
    }

    function getFolder(canUpload: boolean) {
      return mock<Resource>({ isFolder: true, canUpload: () => canUpload })
    }

    it('is enabled if the space allows uploads', () => {
      const currentSpace = mock<SpaceResource>({ driveType: 'project', canUpload: () => true })
      expect(getIsDisabled({ currentSpace, currentFolder: getFolder(false) })).toBe(false)
    })

    it('is enabled if only the current folder allows uploads', () => {
      const currentSpace = mock<SpaceResource>({ driveType: 'project', canUpload: () => false })
      expect(getIsDisabled({ currentSpace, currentFolder: getFolder(true) })).toBe(false)
    })

    it('is disabled if neither space nor current folder allow uploads', () => {
      const currentSpace = mock<SpaceResource>({ driveType: 'project', canUpload: () => false })
      expect(getIsDisabled({ currentSpace, currentFolder: getFolder(false) })).toBe(true)
    })

    it('is enabled if the public link allows creating', () => {
      const currentSpace = mock<PublicSpaceResource>({
        driveType: 'public',
        publicLinkPermission: SharePermissionBit.Create
      })
      expect(getIsDisabled({ currentSpace, currentFolder: getFolder(false) })).toBe(false)
    })

    it('is disabled if the public link does not allow creating', () => {
      const currentSpace = mock<PublicSpaceResource>({
        driveType: 'public',
        publicLinkPermission: SharePermissionBit.Read
      })
      expect(getIsDisabled({ currentSpace, currentFolder: getFolder(false) })).toBe(true)
    })
  })
})
