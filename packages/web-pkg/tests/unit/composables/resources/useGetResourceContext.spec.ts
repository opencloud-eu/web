import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import {
  OCM_PROVIDER_ID,
  PersonalSpaceResource,
  Resource,
  ShareSpaceResource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { useGetResourceContext } from '../../../../src/composables/resources'
import { useSpacesStore } from '../../../../src/composables/piniaStores'

const shareSpace = mock<ShareSpaceResource>({ id: 'share-id', driveType: 'share' })
const otherSpace = mock<ShareSpaceResource>({ id: 'other-share-id', driveType: 'share' })

const driveItems = [
  mock<DriveItem>({ name: 'Shared folder', remoteItem: { id: 'share-id' } }),
  mock<DriveItem>({ name: 'Other folder', remoteItem: { id: 'other-share-id' } })
]

const buildResource = (attrs: Partial<Resource>) =>
  mock<Resource>({ storageId: 'storage-id', ...attrs })

describe('useGetResourceContext', () => {
  describe.each([
    { context: 'guest', isGuest: true },
    { context: 'user', isGuest: false }
  ])('in a $context context', ({ isGuest }) => {
    it('resolves the root of a share', async () => {
      const resource = buildResource({ id: 'share-id', name: 'Shared folder' })
      const { getResourceContext, loadMountPoints, getFileInfo } = getWrapper({
        isGuest,
        resources: [resource]
      })

      const context = await getResourceContext('share-id')

      expect(context).toEqual({ space: shareSpace, resource, path: '/', driveItem: driveItems[0] })
      expect(getFileInfo).toHaveBeenCalledTimes(1)
      expect(loadMountPoints).not.toHaveBeenCalled()
    })

    it('resolves the root of a share whose space is already loaded', async () => {
      const resource = buildResource({ id: 'share-id', name: 'Shared folder' })
      const { getResourceContext, getPathForFileId } = getWrapper({
        isGuest,
        resources: [resource],
        spaces: [shareSpace]
      })

      const context = await getResourceContext('share-id')

      expect(context).toEqual({ space: shareSpace, resource, path: '/', driveItem: driveItems[0] })
      expect(getPathForFileId).not.toHaveBeenCalled()
    })

    it('walks up to the root of a share', async () => {
      const resource = buildResource({ id: 'file-id', name: 'file.txt', parentFolderId: 'sub-id' })
      const { getResourceContext, loadMountPoints } = getWrapper({
        isGuest,
        resources: [
          resource,
          buildResource({ id: 'sub-id', name: 'sub', parentFolderId: 'share-id' }),
          buildResource({ id: 'share-id', name: 'Shared folder' })
        ]
      })

      const context = await getResourceContext('file-id')

      expect(context).toEqual({
        space: shareSpace,
        resource,
        path: '/sub/file.txt',
        driveItem: driveItems[0]
      })
      expect(loadMountPoints).not.toHaveBeenCalled()
    })

    it('resolves resources in other shares', async () => {
      const resource = buildResource({
        id: 'file-id',
        name: 'file.txt',
        parentFolderId: 'other-share-id'
      })
      const { getResourceContext } = getWrapper({
        isGuest,
        resources: [resource, buildResource({ id: 'other-share-id', name: 'Other folder' })]
      })

      const context = await getResourceContext('file-id')

      expect(context).toEqual({
        space: otherSpace,
        resource,
        path: '/file.txt',
        driveItem: driveItems[1]
      })
    })

    it('creates the share space if it is not loaded', async () => {
      const resource = buildResource({ id: 'file-id', name: 'file.txt', parentFolderId: 'new-id' })
      const newSpace = mock<ShareSpaceResource>({ id: 'new-id' })
      const driveItem = mock<DriveItem>({ name: 'New folder', remoteItem: { id: 'new-id' } })
      const { getResourceContext, createShareSpace } = getWrapper({
        isGuest,
        resources: [resource, buildResource({ id: 'new-id', name: 'New folder' })],
        driveItems: [driveItem]
      })
      createShareSpace.mockReturnValue(newSpace)

      const context = await getResourceContext('file-id')

      expect(context).toEqual({ space: newSpace, resource, path: '/file.txt', driveItem })
      expect(createShareSpace).toHaveBeenCalledWith({
        driveAliasPrefix: 'share',
        id: 'new-id',
        shareName: 'New folder'
      })
    })

    it('sets the share space permissions from the drive item', async () => {
      const resource = buildResource({ id: 'share-id', name: 'Shared folder' })
      const { getResourceContext, updateSpaceField } = getWrapper({
        isGuest,
        resources: [resource],
        driveItems: [
          mock<DriveItem>({
            name: 'Shared folder',
            remoteItem: {
              id: 'share-id',
              permissions: [{ '@libre.graph.permissions.actions': ['libre.graph/driveItem/read'] }]
            }
          })
        ]
      })

      await getResourceContext('share-id')

      expect(updateSpaceField).toHaveBeenCalledWith({
        id: 'share-id',
        field: 'graphPermissions',
        value: ['libre.graph/driveItem/read']
      })
    })

    it('fails for resources outside of the shares', async () => {
      const { getResourceContext } = getWrapper({
        isGuest,
        resources: [
          buildResource({ id: 'file-id', name: 'file.txt', parentFolderId: 'other-id' }),
          buildResource({ id: 'other-id', name: 'other', parentFolderId: undefined })
        ]
      })

      await expect(getResourceContext('file-id')).rejects.toThrow(
        'The resource is not part of a received share'
      )
    })

    it('fails for a parent chain that does not reach a share', async () => {
      const { getResourceContext } = getWrapper({
        isGuest,
        resources: [
          buildResource({ id: 'file-id', name: 'file.txt', parentFolderId: 'other-id' }),
          buildResource({ id: 'other-id', name: 'other', parentFolderId: 'file-id' })
        ]
      })

      await expect(getResourceContext('file-id')).rejects.toThrow(
        'The resource is not part of a received share'
      )
    })
  })

  describe('in a user context, own spaces and ocm', () => {
    it('resolves resources in own spaces', async () => {
      const personalSpace = mock<PersonalSpaceResource>({ id: 'storage$personal' })
      const resource = buildResource({ id: 'storage$personal!file-id', name: 'file.txt' })
      const { getResourceContext, getFileInfo, getPathForFileId, listSharedWithMe } = getWrapper({
        isGuest: false,
        resources: [],
        spaces: [personalSpace]
      })
      getPathForFileId.mockResolvedValue('/file.txt')
      getFileInfo.mockResolvedValue(resource)

      const context = await getResourceContext('storage$personal!file-id')

      expect(context).toEqual({ space: personalSpace, resource, path: '/file.txt' })
      expect(getFileInfo).toHaveBeenCalledWith(
        personalSpace,
        { path: '/file.txt' },
        expect.anything()
      )
      expect(listSharedWithMe).not.toHaveBeenCalled()
    })

    it('uses the ocm drive alias prefix for ocm shares', async () => {
      const resource = buildResource({
        id: 'new-id',
        name: 'Federated folder',
        storageId: `${OCM_PROVIDER_ID}$new-id`
      })
      const { getResourceContext, createShareSpace } = getWrapper({
        isGuest: false,
        resources: [resource],
        driveItems: [mock<DriveItem>({ name: 'Federated folder', remoteItem: { id: 'new-id' } })]
      })

      await getResourceContext('new-id')

      expect(createShareSpace).toHaveBeenCalledWith(
        expect.objectContaining({ driveAliasPrefix: 'ocm-share' })
      )
    })
  })
})

function getWrapper({
  isGuest,
  resources,
  driveItems: sharedDriveItems = driveItems,
  spaces = []
}: {
  isGuest: boolean
  resources: Resource[]
  driveItems?: DriveItem[]
  spaces?: SpaceResource[]
}) {
  const mocks = defaultComponentMocks()
  const getFileInfo = vi.mocked(mocks.$clientService.webdav.getFileInfo)
  getFileInfo.mockImplementation((_space, { fileId }) =>
    Promise.resolve(resources.find(({ id }) => id === fileId))
  )
  const listSharedWithMe = vi.mocked(
    mocks.$clientService.graphAuthenticated.driveItems.listSharedWithMe
  )
  listSharedWithMe.mockResolvedValue(sharedDriveItems)

  let getResourceContext: ReturnType<typeof useGetResourceContext>['getResourceContext']
  let spacesStore: ReturnType<typeof useSpacesStore>
  getComposableWrapper(
    () => {
      spacesStore = useSpacesStore()
      vi.mocked(spacesStore.getSpace).mockImplementation(
        (id) => [shareSpace, otherSpace].find((space) => space.id === id) as ShareSpaceResource
      )
      getResourceContext = useGetResourceContext().getResourceContext
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: {
          authState: isGuest ? { guestContextReady: true } : { userContextReady: true },
          spacesState: { spaces }
        }
      }
    }
  )

  return {
    getResourceContext,
    getFileInfo,
    getPathForFileId: vi.mocked(mocks.$clientService.webdav.getPathForFileId),
    listSharedWithMe,
    loadMountPoints: spacesStore.loadMountPoints,
    createShareSpace: vi.mocked(spacesStore.createShareSpace),
    updateSpaceField: vi.mocked(spacesStore.updateSpaceField)
  }
}
