import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource, ShareSpaceResource } from '@opencloud-eu/web-client'
import { useGetResourceContext } from '../../../../src/composables/resources'
import { useSpacesStore } from '../../../../src/composables/piniaStores'

const guestSpace = mock<ShareSpaceResource>({ id: 'share-id', driveType: 'share' })

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

    it('fails for resources outside of the guest share', async () => {
      const { getResourceContext } = getWrapper({
        resources: [
          buildResource({ id: 'file-id', name: 'file.txt', parentFolderId: 'other-id' }),
          buildResource({ id: 'other-id', name: 'other', parentFolderId: undefined })
        ]
      })

      await expect(getResourceContext('file-id')).rejects.toThrow(
        'The resource is not part of the guest share'
      )
    })

    it('fails for a parent chain that does not reach the guest share', async () => {
      const { getResourceContext } = getWrapper({
        resources: [
          buildResource({ id: 'file-id', name: 'file.txt', parentFolderId: 'other-id' }),
          buildResource({ id: 'other-id', name: 'other', parentFolderId: 'file-id' })
        ]
      })

      await expect(getResourceContext('file-id')).rejects.toThrow(
        'The resource is not part of the guest share'
      )
    })

    it('fails without a request if the guest share space is not loaded', async () => {
      const { getResourceContext, getFileInfo } = getWrapper({
        resources: [buildResource({ id: 'file-id', name: 'file.txt' })],
        guestSpaceId: 'unknown-id'
      })

      await expect(getResourceContext('file-id')).rejects.toThrow(
        'The guest share space is not loaded'
      )
      expect(getFileInfo).not.toHaveBeenCalled()
    })
  })
})

function getWrapper({
  resources,
  guestSpaceId = guestSpace.id
}: {
  resources: Resource[]
  guestSpaceId?: string
}) {
  const mocks = defaultComponentMocks()
  const getFileInfo = vi.mocked(mocks.$clientService.webdav.getFileInfo)
  getFileInfo.mockImplementation((_space, { fileId }) =>
    Promise.resolve(resources.find(({ id }) => id === fileId))
  )

  let getResourceContext: ReturnType<typeof useGetResourceContext>['getResourceContext']
  let loadMountPoints: ReturnType<typeof useSpacesStore>['loadMountPoints']
  getComposableWrapper(
    () => {
      const spacesStore = useSpacesStore()
      vi.mocked(spacesStore.getSpace).mockImplementation((id) =>
        id === guestSpace.id ? guestSpace : undefined
      )
      loadMountPoints = spacesStore.loadMountPoints
      getResourceContext = useGetResourceContext().getResourceContext
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: { authState: { guestContextReady: true, guestSpaceId } }
      }
    }
  )

  return { getResourceContext, loadMountPoints, getFileInfo }
}
