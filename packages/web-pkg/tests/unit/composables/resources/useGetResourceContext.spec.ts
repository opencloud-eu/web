import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource, ShareSpaceResource } from '@opencloud-eu/web-client'
import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { useGetResourceContext } from '../../../../src/composables/resources'
import { useSpacesStore } from '../../../../src/composables/piniaStores'

const guestSpace = mock<ShareSpaceResource>({ id: 'share-id', driveType: 'share' })
const otherSpace = mock<ShareSpaceResource>({ id: 'other-share-id', driveType: 'share' })

const driveItems = [
  mock<DriveItem>({ name: 'Invited folder', remoteItem: { id: 'share-id' } }),
  mock<DriveItem>({ name: 'Other folder', remoteItem: { id: 'other-share-id' } })
]

const buildResource = (attrs: Partial<Resource>) => mock<Resource>({ ...attrs })

describe('useGetResourceContext', () => {
  describe('in a guest context', () => {
    it('resolves the root of the guest share', async () => {
      const resource = buildResource({ id: 'share-id', name: 'Invited folder' })
      const { getResourceContext, loadMountPoints, getFileInfo } = getWrapper({
        resources: [resource]
      })

      const context = await getResourceContext('share-id')

      expect(context).toEqual({ space: guestSpace, resource, path: '/' })
      expect(getFileInfo).toHaveBeenCalledTimes(1)
      expect(loadMountPoints).not.toHaveBeenCalled()
    })

    it('walks up to the root of the guest share', async () => {
      const resource = buildResource({ id: 'file-id', name: 'file.txt', parentFolderId: 'sub-id' })
      const { getResourceContext, loadMountPoints } = getWrapper({
        resources: [
          resource,
          buildResource({ id: 'sub-id', name: 'sub', parentFolderId: 'share-id' }),
          buildResource({ id: 'share-id', name: 'Invited folder' })
        ]
      })

      const context = await getResourceContext('file-id')

      expect(context).toEqual({ space: guestSpace, resource, path: '/sub/file.txt' })
      expect(loadMountPoints).not.toHaveBeenCalled()
    })

    it('resolves resources in other shares of the guest', async () => {
      const resource = buildResource({
        id: 'file-id',
        name: 'file.txt',
        parentFolderId: 'other-share-id'
      })
      const { getResourceContext } = getWrapper({
        resources: [resource, buildResource({ id: 'other-share-id', name: 'Other folder' })]
      })

      const context = await getResourceContext('file-id')

      expect(context).toEqual({ space: otherSpace, resource, path: '/file.txt' })
    })

    it('creates the share space if it is not loaded', async () => {
      const resource = buildResource({ id: 'file-id', name: 'file.txt', parentFolderId: 'new-id' })
      const newSpace = mock<ShareSpaceResource>({ id: 'new-id' })
      const { getResourceContext, createShareSpace } = getWrapper({
        resources: [resource, buildResource({ id: 'new-id', name: 'New folder' })],
        driveItems: [mock<DriveItem>({ name: 'New folder', remoteItem: { id: 'new-id' } })]
      })
      createShareSpace.mockReturnValue(newSpace)

      const context = await getResourceContext('file-id')

      expect(context).toEqual({ space: newSpace, resource, path: '/file.txt' })
      expect(createShareSpace).toHaveBeenCalledWith({
        driveAliasPrefix: 'share',
        id: 'new-id',
        shareName: 'New folder'
      })
    })

    it('fails for resources outside of the guest shares', async () => {
      const { getResourceContext } = getWrapper({
        resources: [
          buildResource({ id: 'file-id', name: 'file.txt', parentFolderId: 'other-id' }),
          buildResource({ id: 'other-id', name: 'other', parentFolderId: undefined })
        ]
      })

      await expect(getResourceContext('file-id')).rejects.toThrow(
        'The resource is not part of a guest share'
      )
    })

    it('fails for a parent chain that does not reach a guest share', async () => {
      const { getResourceContext } = getWrapper({
        resources: [
          buildResource({ id: 'file-id', name: 'file.txt', parentFolderId: 'other-id' }),
          buildResource({ id: 'other-id', name: 'other', parentFolderId: 'file-id' })
        ]
      })

      await expect(getResourceContext('file-id')).rejects.toThrow(
        'The resource is not part of a guest share'
      )
    })
  })
})

function getWrapper({
  resources,
  driveItems: sharedDriveItems = driveItems
}: {
  resources: Resource[]
  driveItems?: DriveItem[]
}) {
  const mocks = defaultComponentMocks()
  const getFileInfo = vi.mocked(mocks.$clientService.webdav.getFileInfo)
  getFileInfo.mockImplementation((_space, { fileId }) =>
    Promise.resolve(resources.find(({ id }) => id === fileId))
  )
  mocks.$clientService.graphAuthenticated.driveItems.listSharedWithMe.mockResolvedValue(
    sharedDriveItems
  )

  let getResourceContext: ReturnType<typeof useGetResourceContext>['getResourceContext']
  let spacesStore: ReturnType<typeof useSpacesStore>
  getComposableWrapper(
    () => {
      spacesStore = useSpacesStore()
      vi.mocked(spacesStore.getSpace).mockImplementation(
        (id) => [guestSpace, otherSpace].find((space) => space.id === id) as ShareSpaceResource
      )
      getResourceContext = useGetResourceContext().getResourceContext
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: { authState: { guestContextReady: true } }
      }
    }
  )

  return {
    getResourceContext,
    getFileInfo,
    loadMountPoints: spacesStore.loadMountPoints,
    createShareSpace: vi.mocked(spacesStore.createShareSpace)
  }
}
