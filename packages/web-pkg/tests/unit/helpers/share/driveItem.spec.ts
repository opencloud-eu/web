import { mock, mockDeep } from 'vitest-mock-extended'
import { MountPointSpaceResource, SpaceResource } from '@opencloud-eu/web-client'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { getSharedDriveItem } from '../../../../src/helpers/share'
import { ClientService } from '../../../../src/services'
import { useAuthStore, useSpacesStore } from '../../../../src/composables/piniaStores'

describe('getSharedDriveItem', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  it('returns the shared drive item if found via matching mount point', async () => {
    const { graphAuthenticated: graphClient } = mockDeep<ClientService>()
    const spacesStore = useSpacesStore()
    const space = mock<SpaceResource>()

    const driveItem = mock<DriveItem>({ id: '1' })
    graphClient.driveItems.getDriveItem.mockResolvedValue(driveItem)
    const mountPoint = mock<MountPointSpaceResource>({ id: '1' })
    vi.mocked(spacesStore.getMountPointForSpace).mockResolvedValue(mountPoint)

    const sharedDriveItem = await getSharedDriveItem({ graphClient, spacesStore, space })
    expect(sharedDriveItem).toBe(driveItem)
  })

  it('returns the shared drive item via sharedWithMe if no matching mount point found', async () => {
    const { graphAuthenticated: graphClient } = mockDeep<ClientService>()
    const spacesStore = useSpacesStore()
    const space = mock<SpaceResource>({ id: 'share-id' })

    const driveItem = mock<DriveItem>({ remoteItem: { id: 'share-id' } })
    graphClient.driveItems.listSharedWithMe.mockResolvedValue([driveItem])
    vi.mocked(spacesStore.getMountPointForSpace).mockResolvedValue(null)

    const sharedDriveItem = await getSharedDriveItem({ graphClient, spacesStore, space })
    expect(sharedDriveItem).toBe(driveItem)
    expect(graphClient.driveItems.getDriveItem).not.toHaveBeenCalled()
  })

  it('returns the shared drive item via sharedWithMe if the mount point no longer exists', async () => {
    const { graphAuthenticated: graphClient } = mockDeep<ClientService>()
    const spacesStore = useSpacesStore()
    const space = mock<SpaceResource>({ id: 'share-id' })

    const driveItem = mock<DriveItem>({ remoteItem: { id: 'share-id' } })
    graphClient.driveItems.getDriveItem.mockRejectedValue({ response: { status: 404 } })
    graphClient.driveItems.listSharedWithMe.mockResolvedValue([driveItem])
    const mountPoint = mock<MountPointSpaceResource>({ id: 'sharejail!removed-share-id' })
    vi.mocked(spacesStore.getMountPointForSpace).mockResolvedValue(mountPoint)

    const sharedDriveItem = await getSharedDriveItem({ graphClient, spacesStore, space })
    expect(sharedDriveItem).toBe(driveItem)
    expect(spacesStore.removeSpace).toHaveBeenCalledWith(mountPoint, { deleted: false })
  })

  it('throws if loading the mount point drive item fails for other reasons', async () => {
    const { graphAuthenticated: graphClient } = mockDeep<ClientService>()
    const spacesStore = useSpacesStore()
    const space = mock<SpaceResource>({ id: 'share-id' })

    const error = { response: { status: 500 } }
    graphClient.driveItems.getDriveItem.mockRejectedValue(error)
    const mountPoint = mock<MountPointSpaceResource>({ id: 'sharejail!share-id' })
    vi.mocked(spacesStore.getMountPointForSpace).mockResolvedValue(mountPoint)

    await expect(getSharedDriveItem({ graphClient, spacesStore, space })).rejects.toBe(error)
    expect(graphClient.driveItems.listSharedWithMe).not.toHaveBeenCalled()
    expect(spacesStore.removeSpace).not.toHaveBeenCalled()
  })

  it('does not return a drive item if neither a mount point nor a shared drive item matches', async () => {
    const { graphAuthenticated: graphClient } = mockDeep<ClientService>()
    const spacesStore = useSpacesStore()
    const space = mock<SpaceResource>({ id: 'share-id' })

    graphClient.driveItems.listSharedWithMe.mockResolvedValue([
      mock<DriveItem>({ remoteItem: { id: 'other-share-id' } })
    ])
    vi.mocked(spacesStore.getMountPointForSpace).mockResolvedValue(null)

    const sharedDriveItem = await getSharedDriveItem({ graphClient, spacesStore, space })
    expect(sharedDriveItem).toBe(null)
  })

  it('returns the shared drive item via sharedWithMe in a guest context', async () => {
    const { graphAuthenticated: graphClient } = mockDeep<ClientService>()
    const spacesStore = useSpacesStore()
    const authStore = useAuthStore()
    authStore.guestContextReady = true
    const space = mock<SpaceResource>({ id: 'share-id' })

    const driveItem = mock<DriveItem>({ remoteItem: { id: 'share-id' } })
    graphClient.driveItems.listSharedWithMe.mockResolvedValue([
      mock<DriveItem>({ remoteItem: { id: 'other-share-id' } }),
      driveItem
    ])

    const sharedDriveItem = await getSharedDriveItem({ graphClient, spacesStore, space })
    expect(sharedDriveItem).toBe(driveItem)
    expect(spacesStore.getMountPointForSpace).not.toHaveBeenCalled()
  })
})
