import {
  ClientService,
  eventBus,
  PreviewService,
  useAuthStore,
  useConfigStore,
  useMessages,
  useResourcesStore,
  useSharesStore,
  useSpacesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import {
  EventSchemaType,
  onSSELinkCreatedEvent,
  onSSELinkRemovedEvent,
  onSSEShareCreatedEvent,
  onSSEShareRemovedEvent,
  onSSEShareUpdatedEvent,
  onSSESpaceMemberAddedEvent,
  onSSESpaceMemberRemovedEvent,
  onSSESpaceShareUpdatedEvent
} from '../../../../src/container/sse'
import { mock, mockDeep } from 'vitest-mock-extended'
import { DriveItem, User } from '@opencloud-eu/web-client/graph/generated'
import { ShareTypes, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { createTestingPinia, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { Language } from 'vue3-gettext'
import PQueue from 'p-queue'
import { RouteLocation } from 'vue-router'

describe('shares events', () => {
  describe('onSSESpaceMemberAddedEvent', () => {
    it('calls "upsertSpace" when space member has been added', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks({ currentRouteFilesSpacesGeneric: true })
      const sseData = mock<EventSchemaType>({
        itemid: space.id,
        spaceid: space.id
      })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)
      await onSSESpaceMemberAddedEvent({ sseData, ...mocks })
      expect(mocks.clientService.graphAuthenticated.drives.getDrive).toHaveBeenCalled()
      expect(mocks.spacesStore.upsertSpace).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
    it('calls "upsertResource" when space member has been added and current route equals "files-spaces-projects"', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks({ currentRouteFilesSpacesProjects: true })
      const sseData = mock<EventSchemaType>({
        itemid: space.id,
        spaceid: space.id
      })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)
      await onSSESpaceMemberAddedEvent({ sseData, ...mocks })
      expect(mocks.clientService.graphAuthenticated.drives.getDrive).toHaveBeenCalled()
      expect(mocks.spacesStore.upsertSpace).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks({ currentRouteFilesSpacesProjects: true })
      const sseData = mock<EventSchemaType>({
        itemid: space.id,
        spaceid: space.id,
        initiatorid: 'local1'
      })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)
      await onSSESpaceMemberAddedEvent({ sseData, ...mocks })
      expect(mocks.clientService.graphAuthenticated.drives.getDrive).not.toHaveBeenCalled()
      expect(mocks.spacesStore.upsertSpace).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
  })
  describe('onSSESpaceMemberRemovedEvent', () => {
    it('calls "upsertSpace" when space member has been removed and current user is not affected', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks()
      const sseData = mock<EventSchemaType>({
        itemid: space.id,
        spaceid: space.id,
        affecteduserids: ['2']
      })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)
      await onSSESpaceMemberRemovedEvent({ sseData, ...mocks })
      expect(mocks.clientService.graphAuthenticated.drives.getDrive).toHaveBeenCalled()
      expect(mocks.spacesStore.upsertSpace).toHaveBeenCalled()
      expect(mocks.spacesStore.removeSpace).not.toHaveBeenCalled()
      expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
    })
    it('calls "removeSpace" when space member has been removed and current user is affected', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks({ currentRouteFilesSpacesProjects: true, spaces: [space] })
      const sseData = mock<EventSchemaType>({
        itemid: space.id,
        spaceid: space.id,
        affecteduserids: ['1']
      })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)
      await onSSESpaceMemberRemovedEvent({ sseData, ...mocks })
      expect(mocks.clientService.graphAuthenticated.drives.getDrive).not.toHaveBeenCalled()
      expect(mocks.spacesStore.upsertSpace).not.toHaveBeenCalled()
      // the space itself still exists, e.g. for the admin settings
      expect(mocks.spacesStore.removeSpace).toHaveBeenCalledWith(space, { deleted: false })
      expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
    })
    it('calls "showMessage" when space member has been removed and current user is affected and navigated to space', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks({ currentRouteFilesSpacesGeneric: true, spaces: [space] })
      const sseData = mock<EventSchemaType>({
        itemid: space.id,
        spaceid: space.id,
        affecteduserids: ['1']
      })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)
      await onSSESpaceMemberRemovedEvent({ sseData, ...mocks })
      expect(mocks.clientService.graphAuthenticated.drives.getDrive).not.toHaveBeenCalled()
      expect(mocks.spacesStore.upsertSpace).not.toHaveBeenCalled()
      expect(mocks.spacesStore.removeSpace).toHaveBeenCalled()
      expect(mocks.messageStore.showMessage).toHaveBeenCalled()
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks({ currentRouteFilesSpacesProjects: true, spaces: [space] })
      const sseData = mock<EventSchemaType>({
        itemid: space.id,
        spaceid: space.id,
        affecteduserids: ['1'],
        initiatorid: 'local1'
      })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)
      await onSSESpaceMemberRemovedEvent({ sseData, ...mocks })
      expect(mocks.clientService.graphAuthenticated.drives.getDrive).not.toHaveBeenCalled()
      expect(mocks.spacesStore.upsertSpace).not.toHaveBeenCalled()
      expect(mocks.spacesStore.removeSpace).not.toHaveBeenCalled()
      expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
    })
  })
  describe('onSSESpaceShareUpdatedEvent', () => {
    it('calls "upsertSpace" when space share has been updated', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks()
      const sseData = mock<EventSchemaType>({
        itemid: space.id,
        spaceid: space.id,
        affecteduserids: ['2']
      })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)
      const busStub = vi.spyOn(eventBus, 'publish')
      await onSSESpaceShareUpdatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.graphAuthenticated.drives.getDrive).toHaveBeenCalled()
      expect(mocks.spacesStore.upsertSpace).toHaveBeenCalled()
      expect(busStub).not.toHaveBeenCalled()
    })
    it('calls "eventBus.publish" when space share has been updated and current user is affected and navigated to space', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks({ currentRouteFilesSpacesGeneric: true, spaces: [space] })
      const sseData = mock<EventSchemaType>({
        itemid: space.id,
        spaceid: space.id,
        affecteduserids: ['1']
      })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)
      const busStub = vi.spyOn(eventBus, 'publish')
      await onSSESpaceShareUpdatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.graphAuthenticated.drives.getDrive).toHaveBeenCalled()
      expect(mocks.spacesStore.upsertSpace).toHaveBeenCalled()
      expect(busStub).toHaveBeenCalled()
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks({ currentRouteFilesSpacesGeneric: true, spaces: [space] })
      const sseData = mock<EventSchemaType>({
        itemid: space.id,
        spaceid: space.id,
        affecteduserids: ['1'],
        initiatorid: 'local1'
      })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)
      const busStub = vi.spyOn(eventBus, 'publish')
      await onSSESpaceShareUpdatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.graphAuthenticated.drives.getDrive).not.toHaveBeenCalled()
      expect(mocks.spacesStore.upsertSpace).not.toHaveBeenCalled()
      expect(busStub).not.toHaveBeenCalled()
    })
  })
  describe('onSSEShareCreatedEvent', () => {
    it('calls "upsertResource" when resource has been shared and current user navigated to resource', async () => {
      const sharedResource = mock<Resource>({
        id: 'sharedResource',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const space = mock<SpaceResource>({ id: sharedResource.storageId })
      const mocks = getMocks({ currentRouteFilesSpacesGeneric: true, spaces: [space] })
      const sseData = mock<EventSchemaType>({
        itemid: sharedResource.id,
        spaceid: sharedResource.storageId,
        parentitemid: sharedResource.parentFolderId
      })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...sharedResource })
      )
      await onSSEShareCreatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
      expect(
        mocks.clientService.graphAuthenticated.driveItems.listSharedWithMe
      ).not.toHaveBeenCalled()
      expect(
        mocks.clientService.graphAuthenticated.driveItems.listSharedByMe
      ).not.toHaveBeenCalled()
    })

    it.each([
      { route: { currentRouteFilesSharesWithMe: true }, userId: '1' },
      {
        route: { currentRouteFilesGuestShares: true, guestEmail: 'guest@example.org' },
        userId: 'guest@example.org'
      }
    ])(
      'calls "upsertResource" when resource has been shared and current route is a shared with me route (%o)',
      async ({ route, userId }) => {
        const sharedDrive = mockDeep<DriveItem>({
          id: 'sharedDrive',
          name: 'trololo',
          remoteItem: {
            id: 'sharedResource',
            permissions: []
          }
        })
        const mocks = getMocks({
          ...route,
          currentFolder: null
        })
        const sseData = mock<EventSchemaType>({
          itemid: sharedDrive.remoteItem.id,
          affecteduserids: [userId]
        })
        mocks.clientService.graphAuthenticated.driveItems.listSharedWithMe.mockResolvedValue([
          sharedDrive
        ])
        await onSSEShareCreatedEvent({ sseData, ...mocks })
        expect(
          mocks.clientService.graphAuthenticated.driveItems.listSharedWithMe
        ).toHaveBeenCalled()
        expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
        expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
        expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
        expect(
          mocks.clientService.graphAuthenticated.driveItems.listSharedByMe
        ).not.toHaveBeenCalled()
      }
    )
    it('does not load the shared with me list when another user is affected', async () => {
      const mocks = getMocks({ currentRouteFilesSharesWithMe: true, currentFolder: null })
      const sseData = mock<EventSchemaType>({
        itemid: 'sharedResource',
        affecteduserids: ['2']
      })
      await onSSEShareCreatedEvent({ sseData, ...mocks })
      expect(
        mocks.clientService.graphAuthenticated.driveItems.listSharedWithMe
      ).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
    it('calls "upsertResource" when resource has been shared and current route equals "files-shares-with-others"', async () => {
      const sharedDrive = mockDeep<DriveItem>({
        id: 'sharedDrive',
        name: 'wololo',
        permissions: []
      })
      const mocks = getMocks({
        currentRouteFilesSharesWithOthers: true,
        currentFolder: null
      })
      const sseData = mock<EventSchemaType>({
        itemid: sharedDrive.id
      })
      mocks.clientService.graphAuthenticated.driveItems.listSharedByMe.mockResolvedValue([
        sharedDrive
      ])
      await onSSEShareCreatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.graphAuthenticated.driveItems.listSharedByMe).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(
        mocks.clientService.graphAuthenticated.driveItems.listSharedWithMe
      ).not.toHaveBeenCalled()
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const sharedResource = mock<Resource>({
        id: 'sharedResource',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const space = mock<SpaceResource>({ id: sharedResource.storageId })
      const mocks = getMocks({ currentRouteFilesSpacesGeneric: true, spaces: [space] })
      const sseData = mock<EventSchemaType>({
        itemid: sharedResource.id,
        spaceid: sharedResource.storageId,
        parentitemid: sharedResource.parentFolderId,
        initiatorid: 'local1'
      })
      await onSSEShareCreatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
      expect(
        mocks.clientService.graphAuthenticated.driveItems.listSharedWithMe
      ).not.toHaveBeenCalled()
      expect(
        mocks.clientService.graphAuthenticated.driveItems.listSharedByMe
      ).not.toHaveBeenCalled()
    })
  })
  describe('onSSEShareUpdatedEvent', () => {
    it('calls "eventBus.publish" when share has been updated and current user is affected and navigated to share', async () => {
      const sharedResource = mock<Resource>({
        id: 'sharedResource',
        storageId: 'space1',
        parentFolderId: 'space1'
      })
      const mocks = getMocks({ currentRouteFilesSpacesGeneric: true })
      const sseData = mock<EventSchemaType>({
        itemid: sharedResource.id,
        spaceid: sharedResource.storageId,
        affecteduserids: ['1']
      })
      const busStub = vi.spyOn(eventBus, 'publish')
      await onSSEShareUpdatedEvent({ sseData, ...mocks })
      expect(busStub).toHaveBeenCalled()
      expect(
        mocks.clientService.graphAuthenticated.driveItems.listSharedWithMe
      ).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
    it('calls "upsertResource" when share has been updated and current route equals "files-shares-with-me"', async () => {
      const sharedDrive = mockDeep<DriveItem>({
        id: 'sharedDrive',
        name: 'humpa',
        remoteItem: {
          id: 'sharedResource',
          permissions: []
        }
      })
      const mocks = getMocks({
        currentRouteFilesSharesWithMe: true,
        currentFolder: null
      })
      const sseData = mock<EventSchemaType>({
        itemid: sharedDrive.remoteItem.id,
        affecteduserids: ['1']
      })
      mocks.clientService.graphAuthenticated.driveItems.listSharedWithMe.mockResolvedValue([
        sharedDrive
      ])
      const busStub = vi.spyOn(eventBus, 'publish')
      await onSSEShareUpdatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.graphAuthenticated.driveItems.listSharedWithMe).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
      expect(busStub).not.toHaveBeenCalled()
    })
    it('resets the permissions of the share space and reloads the file list', async () => {
      const shareSpace = mock<SpaceResource>({ id: 'sharedResource', driveType: 'share' })
      const mocks = getMocks({
        currentRouteFilesSpacesGeneric: true,
        spaces: [shareSpace],
        currentSpace: shareSpace
      })
      const sseData = mock<EventSchemaType>({
        itemid: shareSpace.id,
        spaceid: 'space1',
        affecteduserids: ['1']
      })
      const busStub = vi.spyOn(eventBus, 'publish')
      await onSSEShareUpdatedEvent({ sseData, ...mocks })
      expect(mocks.spacesStore.updateSpaceField).toHaveBeenCalledWith({
        id: shareSpace.id,
        field: 'graphPermissions',
        value: undefined
      })
      expect(busStub).toHaveBeenCalledWith('app.files.list.load')
    })
    it('does not reload the file list when another share of the same space has been updated', async () => {
      const shareSpace = mock<SpaceResource>({ id: 'otherShare', driveType: 'share' })
      const mocks = getMocks({
        currentRouteFilesSpacesGeneric: true,
        spaces: [shareSpace],
        currentSpace: shareSpace
      })
      const sseData = mock<EventSchemaType>({
        itemid: 'sharedResource',
        spaceid: 'space1',
        affecteduserids: ['1']
      })
      const busStub = vi.spyOn(eventBus, 'publish')
      await onSSEShareUpdatedEvent({ sseData, ...mocks })
      expect(mocks.spacesStore.updateSpaceField).toHaveBeenCalledWith({
        id: 'sharedResource',
        field: 'graphPermissions',
        value: undefined
      })
      expect(busStub).not.toHaveBeenCalled()
    })
    it('does not trigger any action when another user is affected', async () => {
      const mocks = getMocks({ currentRouteFilesSpacesGeneric: true })
      const sseData = mock<EventSchemaType>({
        itemid: 'sharedResource',
        spaceid: 'space1',
        affecteduserids: ['2']
      })
      const busStub = vi.spyOn(eventBus, 'publish')
      await onSSEShareUpdatedEvent({ sseData, ...mocks })
      expect(busStub).not.toHaveBeenCalled()
      expect(mocks.spacesStore.updateSpaceField).not.toHaveBeenCalled()
      expect(
        mocks.clientService.graphAuthenticated.driveItems.listSharedWithMe
      ).not.toHaveBeenCalled()
    })
    describe('as a guest', () => {
      it('reloads the file list when the guest is affected and navigated to the share', async () => {
        const shareSpace = mock<SpaceResource>({ id: 'sharedResource', driveType: 'share' })
        const mocks = getMocks({
          currentRouteFilesGuestLink: true,
          spaces: [shareSpace],
          currentSpace: shareSpace,
          guestEmail: 'guest@example.org'
        })
        const sseData = mock<EventSchemaType>({
          itemid: shareSpace.id,
          spaceid: 'space1',
          affecteduserids: ['guest@example.org']
        })
        const busStub = vi.spyOn(eventBus, 'publish')
        await onSSEShareUpdatedEvent({ sseData, ...mocks })
        expect(busStub).toHaveBeenCalledWith('app.files.list.load')
      })
      it('upserts the share when the guest is affected and the guest shares are listed', async () => {
        const sharedDrive = mockDeep<DriveItem>({
          id: 'sharedDrive',
          name: 'humpa',
          remoteItem: { id: 'sharedResource', permissions: [] }
        })
        const mocks = getMocks({
          currentRouteFilesGuestShares: true,
          currentFolder: null,
          guestEmail: 'guest@example.org'
        })
        const sseData = mock<EventSchemaType>({
          itemid: sharedDrive.remoteItem.id,
          affecteduserids: ['guest@example.org']
        })
        mocks.clientService.graphAuthenticated.driveItems.listSharedWithMe.mockResolvedValue([
          sharedDrive
        ])
        const busStub = vi.spyOn(eventBus, 'publish')
        await onSSEShareUpdatedEvent({ sseData, ...mocks })
        expect(mocks.spacesStore.updateSpaceField).toHaveBeenCalledWith({
          id: sharedDrive.remoteItem.id,
          field: 'graphPermissions',
          value: undefined
        })
        expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
        expect(busStub).not.toHaveBeenCalled()
      })
      it.each([{ currentRouteFilesGuestLink: true }, { currentRouteFilesGuestShares: true }])(
        'does not trigger any action when another user is affected (%o)',
        async (route) => {
          const mocks = getMocks({ ...route, guestEmail: 'guest@example.org' })
          const sseData = mock<EventSchemaType>({
            itemid: 'sharedResource',
            spaceid: 'space1',
            affecteduserids: ['1']
          })
          const busStub = vi.spyOn(eventBus, 'publish')
          await onSSEShareUpdatedEvent({ sseData, ...mocks })
          expect(busStub).not.toHaveBeenCalled()
          expect(mocks.spacesStore.updateSpaceField).not.toHaveBeenCalled()
          expect(
            mocks.clientService.graphAuthenticated.driveItems.listSharedWithMe
          ).not.toHaveBeenCalled()
          expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
        }
      )
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const sharedResource = mock<Resource>({
        id: 'sharedResource',
        storageId: 'space1',
        parentFolderId: 'space1'
      })
      const mocks = getMocks({ currentRouteFilesSpacesGeneric: true })
      const sseData = mock<EventSchemaType>({
        itemid: sharedResource.id,
        spaceid: sharedResource.storageId,
        affecteduserids: ['1'],
        initiatorid: 'local1'
      })
      const busStub = vi.spyOn(eventBus, 'publish')
      await onSSEShareUpdatedEvent({ sseData, ...mocks })
      expect(busStub).not.toHaveBeenCalled()
      expect(
        mocks.clientService.graphAuthenticated.driveItems.listSharedWithMe
      ).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
  })
  describe('onSSEShareRemovedEvent', () => {
    it('calls "showMessage" when share has been removed and current user is affected and navigated to share', async () => {
      const mocks = getMocks({
        currentRouteFilesSpacesGeneric: true
      })
      const sseData = mock<EventSchemaType>({
        itemid: 'sharedResource',
        spaceid: 'space1',
        affecteduserids: ['1']
      })
      await onSSEShareRemovedEvent({ sseData, ...mocks })

      expect(mocks.messageStore.showMessage).toHaveBeenCalled()
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })

    it('calls "upsertResource" when share has been removed and current user is not affected and share is located in current folder', async () => {
      const sharedResource = mock<Resource>({
        id: 'sharedResource',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const space = mock<SpaceResource>({ id: sharedResource.storageId })
      const mocks = getMocks({ currentRouteFilesSpacesGeneric: true, spaces: [space] })
      const sseData = mock<EventSchemaType>({
        itemid: sharedResource.id,
        spaceid: sharedResource.storageId,
        parentitemid: sharedResource.parentFolderId,
        affecteduserids: ['2']
      })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...sharedResource })
      )
      await onSSEShareRemovedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
      expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
    it('calls "removeResources" when share has removed and current route equals "files-shared-with-others"', async () => {
      const sharedResource = mock<Resource>({
        id: 'sharedResource',
        storageId: 'space1',
        shareTypes: []
      })
      const space = mock<SpaceResource>({ id: sharedResource.storageId })
      const mocks = getMocks({
        currentRouteFilesSharesWithOthers: true,
        currentFolder: null,
        spaces: [space]
      })
      const sseData = mock<EventSchemaType>({
        itemid: sharedResource.id,
        spaceid: sharedResource.storageId,
        parentitemid: sharedResource.parentFolderId,
        affecteduserids: ['2']
      })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...sharedResource })
      )
      await onSSEShareRemovedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.removeResources).toHaveBeenCalled()
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
      expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
    })
    it('does not call "removeResources" when share has been removed and current route equals "files-shares-with-others but link shares are present"', async () => {
      const sharedResource = mock<Resource>({
        id: 'sharedResource',
        storageId: 'space1',
        shareTypes: [ShareTypes.group.value]
      })
      const space = mock<SpaceResource>({ id: sharedResource.storageId })
      const mocks = getMocks({
        currentRouteFilesSharesWithOthers: true,
        currentFolder: null,
        spaces: [space]
      })
      const sseData = mock<EventSchemaType>({
        itemid: sharedResource.id,
        spaceid: sharedResource.storageId,
        parentitemid: sharedResource.parentFolderId,
        affecteduserids: ['2']
      })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...sharedResource })
      )
      await onSSEShareRemovedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
      expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
    })
    it.each([{ currentRouteFilesSharesWithMe: true }, { currentRouteFilesGuestShares: true }])(
      'calls "removeResources" when share has removed and current route is a shared with me route (%o)',
      async (route) => {
        const sharedResource = mock<Resource>({
          id: 'sharedResource',
          fileId: 'sharedResource',
          storageId: 'space1'
        })
        const mocks = getMocks({
          ...route,
          currentFolder: null,
          resources: [sharedResource]
        })
        const sseData = mock<EventSchemaType>({
          itemid: sharedResource.id,
          spaceid: sharedResource.storageId,
          affecteduserids: ['1']
        })
        await onSSEShareRemovedEvent({ sseData, ...mocks })
        expect(mocks.resourcesStore.removeResources).toHaveBeenCalled()
        expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
        expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
        expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
        expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
      }
    )
    it('does not call "removeResources" on a shared with me route when another user is affected', async () => {
      const sharedResource = mock<Resource>({
        id: 'sharedResource',
        fileId: 'sharedResource',
        storageId: 'space1'
      })
      const mocks = getMocks({
        currentRouteFilesSharesWithMe: true,
        currentFolder: null,
        resources: [sharedResource]
      })
      const sseData = mock<EventSchemaType>({
        itemid: sharedResource.id,
        spaceid: sharedResource.storageId,
        affecteduserids: ['2']
      })
      await onSSEShareRemovedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
    describe('as a guest', () => {
      it('calls "showMessage" when the guest is affected and navigated to the share', async () => {
        const shareSpace = mock<SpaceResource>({ id: 'sharedResource', driveType: 'share' })
        const mocks = getMocks({
          currentRouteFilesGuestLink: true,
          spaces: [shareSpace],
          currentSpace: shareSpace,
          guestEmail: 'guest@example.org'
        })
        const sseData = mock<EventSchemaType>({
          itemid: shareSpace.id,
          spaceid: 'space1',
          affecteduserids: ['guest@example.org']
        })
        await onSSEShareRemovedEvent({ sseData, ...mocks })
        expect(mocks.messageStore.showMessage).toHaveBeenCalled()
      })
      it('does not call "showMessage" when another share of the same space has been removed', async () => {
        const shareSpace = mock<SpaceResource>({ id: 'otherShare', driveType: 'share' })
        const mocks = getMocks({
          currentRouteFilesGuestLink: true,
          spaces: [shareSpace],
          currentSpace: shareSpace,
          guestEmail: 'guest@example.org'
        })
        const sseData = mock<EventSchemaType>({
          itemid: 'sharedResource',
          spaceid: 'space1',
          parentitemid: 'otherFolder',
          affecteduserids: ['guest@example.org']
        })
        await onSSEShareRemovedEvent({ sseData, ...mocks })
        expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
      })
      it('calls "removeResources" when the guest is affected and the guest shares are listed', async () => {
        const sharedResource = mock<Resource>({
          id: 'sharedResource',
          fileId: 'sharedResource',
          storageId: 'space1'
        })
        const mocks = getMocks({
          currentRouteFilesGuestShares: true,
          currentFolder: null,
          resources: [sharedResource],
          guestEmail: 'guest@example.org'
        })
        const sseData = mock<EventSchemaType>({
          itemid: sharedResource.id,
          spaceid: sharedResource.storageId,
          affecteduserids: ['guest@example.org']
        })
        await onSSEShareRemovedEvent({ sseData, ...mocks })
        expect(mocks.resourcesStore.removeResources).toHaveBeenCalled()
        expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
      })
      it.each([{ currentRouteFilesGuestLink: true }, { currentRouteFilesGuestShares: true }])(
        'does not trigger any action when another user is affected (%o)',
        async (route) => {
          const sharedResource = mock<Resource>({
            id: 'sharedResource',
            fileId: 'sharedResource',
            storageId: 'space1'
          })
          const mocks = getMocks({
            ...route,
            resources: [sharedResource],
            guestEmail: 'guest@example.org'
          })
          const sseData = mock<EventSchemaType>({
            itemid: sharedResource.id,
            spaceid: sharedResource.storageId,
            parentitemid: 'otherFolder',
            affecteduserids: ['1']
          })
          await onSSEShareRemovedEvent({ sseData, ...mocks })
          expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
          expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
        }
      )
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const mocks = getMocks({
        currentRouteFilesSpacesGeneric: true
      })
      const sseData = mock<EventSchemaType>({
        itemid: 'sharedResource',
        spaceid: 'space1',
        affecteduserids: ['1'],
        initiatorid: 'local1'
      })
      await onSSEShareRemovedEvent({ sseData, ...mocks })
      expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
  })
  describe('onSSELinkCreatedEvent', () => {
    it('calls "upsertResource" when resource has been shared via link and current user navigated to resource', async () => {
      const sharedResource = mock<Resource>({
        id: 'sharedResource',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const space = mock<SpaceResource>({ id: sharedResource.storageId })
      const mocks = getMocks({ currentRouteFilesSpacesGeneric: true, spaces: [space] })
      const sseData = mock<EventSchemaType>({
        itemid: sharedResource.id,
        spaceid: sharedResource.storageId,
        parentitemid: sharedResource.parentFolderId
      })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...sharedResource })
      )
      await onSSELinkCreatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
      expect(
        mocks.clientService.graphAuthenticated.driveItems.listSharedByMe
      ).not.toHaveBeenCalled()
    })
    it('calls "upsertResource" when resource has been shared via link and current route equals "files-shares-via-link"', async () => {
      const sharedDrive = mockDeep<DriveItem>({
        id: 'sharedDrive',
        name: 'lumpa',
        permissions: []
      })
      const mocks = getMocks({
        currentRouteFilesSharesViaLink: true,
        currentFolder: null
      })
      const sseData = mock<EventSchemaType>({
        itemid: sharedDrive.id
      })
      mocks.clientService.graphAuthenticated.driveItems.listSharedByMe.mockResolvedValue([
        sharedDrive
      ])
      await onSSELinkCreatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.graphAuthenticated.driveItems.listSharedByMe).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const sharedResource = mock<Resource>({
        id: 'sharedResource',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const space = mock<SpaceResource>({ id: sharedResource.storageId })
      const mocks = getMocks({ currentRouteFilesSpacesGeneric: true, spaces: [space] })
      const sseData = mock<EventSchemaType>({
        itemid: sharedResource.id,
        spaceid: sharedResource.storageId,
        parentitemid: sharedResource.parentFolderId,
        initiatorid: 'local1'
      })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...sharedResource })
      )
      await onSSELinkCreatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
      expect(
        mocks.clientService.graphAuthenticated.driveItems.listSharedByMe
      ).not.toHaveBeenCalled()
    })
  })
  describe('onSSELinkRemovedEvent', () => {
    it('calls "upsertResource" when link share has been removed and resource is in current folder', async () => {
      const sharedResource = mock<Resource>({
        id: 'sharedResource',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const space = mock<SpaceResource>({ id: sharedResource.storageId })
      const mocks = getMocks({ currentRouteFilesSpacesGeneric: true, spaces: [space] })
      const sseData = mock<EventSchemaType>({
        itemid: sharedResource.id,
        spaceid: sharedResource.storageId,
        parentitemid: sharedResource.parentFolderId
      })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...sharedResource })
      )
      await onSSELinkRemovedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
    it('calls "removeResources" when link share has been removed and current route equals "files-shares-via-link"', async () => {
      const sharedResource = mock<Resource>({
        id: 'sharedResource',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder',
        shareTypes: []
      })
      const space = mock<SpaceResource>({ id: sharedResource.storageId })
      const mocks = getMocks({
        currentRouteFilesSharesViaLink: true,
        currentFolder: null,
        spaces: [space]
      })
      const sseData = mock<EventSchemaType>({
        itemid: sharedResource.id,
        spaceid: sharedResource.storageId,
        parentitemid: sharedResource.parentFolderId
      })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...sharedResource })
      )
      await onSSELinkRemovedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.removeResources).toHaveBeenCalled()
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
    })
    it('does not call "removeResources" when link share has been removed and current route equals "files-shares-via-link but other link shares are present"', async () => {
      const sharedResource = mock<Resource>({
        id: 'sharedResource',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder',
        shareTypes: [ShareTypes.link.value]
      })
      const space = mock<SpaceResource>({ id: sharedResource.storageId })
      const mocks = getMocks({
        currentRouteFilesSharesViaLink: true,
        currentFolder: null,
        spaces: [space]
      })
      const sseData = mock<EventSchemaType>({
        itemid: sharedResource.id,
        spaceid: sharedResource.storageId,
        parentitemid: sharedResource.parentFolderId
      })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...sharedResource })
      )
      await onSSELinkRemovedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const sharedResource = mock<Resource>({
        id: 'sharedResource',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const space = mock<SpaceResource>({ id: sharedResource.storageId })
      const mocks = getMocks({ currentRouteFilesSpacesGeneric: true, spaces: [space] })
      const sseData = mock<EventSchemaType>({
        itemid: sharedResource.id,
        spaceid: sharedResource.storageId,
        parentitemid: sharedResource.parentFolderId,
        initiatorid: 'local1'
      })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...sharedResource })
      )
      await onSSELinkRemovedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.not.toHaveBeenCalled()
    })
  })
})

const getMocks = ({
  currentFolder = mockDeep<Resource>({
    id: 'currenFolder!currentFolder',
    isFolder: true,
    storageId: 'space1'
  }),
  resources = [],
  spaces = [mockDeep<SpaceResource>({ id: 'space1' })],
  currentRouteFilesSpacesGeneric = false,
  currentRouteFilesSpacesProjects = false,
  currentRouteFilesSharesViaLink = false,
  currentRouteFilesSharesWithMe = false,
  currentRouteFilesSharesWithOthers = false,
  currentRouteFilesGuestShares = false,
  currentRouteFilesGuestLink = false,
  currentSpace = undefined,
  guestEmail = undefined
}: {
  currentFolder?: Resource
  resources?: Resource[]
  spaces?: SpaceResource[]
  currentSpace?: SpaceResource
  guestEmail?: string
  currentRouteFilesSpacesGeneric?: boolean
  currentRouteFilesSpacesProjects?: boolean
  currentRouteFilesSharesViaLink?: boolean
  currentRouteFilesSharesWithMe?: boolean
  currentRouteFilesSharesWithOthers?: boolean
  currentRouteFilesGuestShares?: boolean
  currentRouteFilesGuestLink?: boolean
} = {}) => {
  createTestingPinia()
  const resourcesStore = useResourcesStore()
  resourcesStore.currentFolder = currentFolder
  resourcesStore.resources = resources
  const spacesStore = useSpacesStore()
  spacesStore.spaces = spaces
  spacesStore.currentSpace = currentSpace
  const messageStore = useMessages()
  const userStore = useUserStore()
  const configStore = useConfigStore()
  const authStore = useAuthStore()
  if (guestEmail) {
    authStore.guestContextReady = true
    authStore.guestEmail = guestEmail
  } else {
    userStore.user = mockDeep<User>({ id: '1' })
  }
  const sharesStore = useSharesStore()
  const clientService = mockDeep<ClientService>({ initiatorId: 'local1' })
  const previewService = mockDeep<PreviewService>()

  const language = mockDeep<Language>({
    $gettext: vi.fn((m) => m)
  })
  const resourceQueue = mockDeep<PQueue>()

  let routeName = 'files-spaces-generic'
  if (currentRouteFilesSpacesGeneric) {
    routeName = 'files-spaces-generic'
  }
  if (currentRouteFilesSpacesProjects) {
    routeName = 'files-spaces-projects'
  }
  if (currentRouteFilesSharesViaLink) {
    routeName = 'files-shares-via-link'
  }
  if (currentRouteFilesSharesWithMe) {
    routeName = 'files-shares-with-me'
  }
  if (currentRouteFilesSharesWithOthers) {
    routeName = 'files-shares-with-others'
  }
  if (currentRouteFilesGuestShares) {
    routeName = 'files-guest-shares'
  }
  if (currentRouteFilesGuestLink) {
    routeName = 'files-guest-link'
  }

  const currentRoute = mock<RouteLocation>({ name: routeName })
  const { $router: router } = defaultComponentMocks({ currentRoute })

  return {
    resourcesStore,
    spacesStore,
    router,
    messageStore,
    userStore,
    sharesStore,
    configStore,
    authStore,
    clientService,
    previewService,
    resourceQueue,
    language
  }
}
