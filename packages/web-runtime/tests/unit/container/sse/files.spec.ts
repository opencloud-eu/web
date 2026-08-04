import {
  ClientService,
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
  onSSEFileLockingEvent,
  onSSEFileTouchedEvent,
  onSSEFolderCreatedEvent,
  onSSEItemFavoriteAddedEvent,
  onSSEItemFavoriteRemovedEvent,
  onSSEItemMovedEvent,
  onSSEItemRenamedEvent,
  onSSEItemRestoredEvent,
  onSSEItemTrashedEvent
} from '../../../../src/container/sse'
import { RouteLocation } from 'vue-router'
import { mock, mockDeep } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { createTestingPinia, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { Language } from 'vue3-gettext'
import PQueue from 'p-queue'

describe('file events', () => {
  describe('onSSEItemRenamedEvent', () => {
    it('calls "upsertResource" when resource has been renamed', async () => {
      const resourceToRename = mock<Resource>({
        id: 'file1',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const mocks = getMocks({ resources: [resourceToRename] })
      const sseData = mock<EventSchemaType>({
        itemid: resourceToRename.id,
        spaceid: resourceToRename.storageId,
        parentitemid: resourceToRename.parentFolderId
      })
      await onSSEItemRenamedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
      expect(mocks.resourcesStore.setCurrentFolder).not.toHaveBeenCalled()
    })
    it('calls "setCurrentFolder" when resource is current folder and has been renamed', async () => {
      const resourceToRename = mock<Resource>({
        id: 'currenFolder!currentFolder',
        storageId: 'space1',
        parentFolderId: 'space1'
      })
      const mocks = getMocks({ resources: [resourceToRename] })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...resourceToRename, name: 'folder2', parentFolderId: 'space1' })
      )
      const sseData = mock<EventSchemaType>({
        itemid: resourceToRename.id,
        spaceid: resourceToRename.storageId,
        parentitemid: resourceToRename.parentFolderId
      })
      await onSSEItemRenamedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.setCurrentFolder).toHaveBeenCalled()
      expect(mocks.router.push).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const resourceToRename = mock<Resource>({
        id: 'file1',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const mocks = getMocks({ resources: [resourceToRename] })
      const sseData = mock<EventSchemaType>({
        itemid: resourceToRename.id,
        spaceid: resourceToRename.storageId,
        parentitemid: resourceToRename.parentFolderId,
        initiatorid: 'local1'
      })
      await onSSEItemRenamedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.setCurrentFolder).not.toHaveBeenCalled()
      expect(mocks.router.push).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
  })
  describe('onSSEFileLockingEvent', () => {
    it('calls "upsertResource" when resource has been locked', async () => {
      const resourceToLock = mock<Resource>({
        id: 'file1',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const mocks = getMocks({ resources: [resourceToLock] })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...resourceToLock, locked: true })
      )
      const sseData = mock<EventSchemaType>({
        itemid: resourceToLock.id,
        spaceid: resourceToLock.storageId,
        parentitemid: resourceToLock.parentFolderId
      })
      await onSSEFileLockingEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
    })
    it('does not trigger any action when resource is not in store', async () => {
      const mocks = getMocks()
      const sseData = mock<EventSchemaType>({
        itemid: 'filesomewherelese',
        spaceid: 'space1',
        parentitemid: 'space1'
      })
      await onSSEFileLockingEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
  })
  describe('onSSEItemTrashedEvent', () => {
    it('calls "removeResources" when resource has been trashed', async () => {
      const resourceToTrash = mock<Resource>({
        id: 'file1',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const mocks = getMocks({ resources: [resourceToTrash] })
      const sseData = mock<EventSchemaType>({
        itemid: resourceToTrash.id,
        spaceid: resourceToTrash.storageId,
        parentitemid: resourceToTrash.parentFolderId
      })
      await onSSEItemTrashedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.removeResources).toHaveBeenCalled()
      expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
    })
    it('calls "showMessage" when resource is current folder and has been trashed', async () => {
      const resourceToTrash = mock<Resource>({
        id: 'currenFolder!currentFolder',
        storageId: 'space1',
        parentFolderId: 'space1'
      })
      const mocks = getMocks({ resources: [resourceToTrash] })
      const sseData = mock<EventSchemaType>({
        itemid: resourceToTrash.id,
        spaceid: resourceToTrash.storageId,
        parentitemid: resourceToTrash.parentFolderId
      })
      await onSSEItemTrashedEvent({ sseData, ...mocks })
      expect(mocks.messageStore.showMessage).toHaveBeenCalledWith({
        title:
          'The folder you were accessing has been removed. Please navigate to another location.'
      })
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
    it('does not trigger any action when resource is not in store', async () => {
      const mocks = getMocks()
      const sseData = mock<EventSchemaType>({
        itemid: 'filesomewherelese',
        spaceid: 'space1',
        parentitemid: 'space1'
      })
      await onSSEItemTrashedEvent({ sseData, ...mocks })
      expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const resourceToTrash = mock<Resource>({
        id: 'file1',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const mocks = getMocks({ resources: [resourceToTrash] })
      const sseData = mock<EventSchemaType>({
        itemid: resourceToTrash.id,
        spaceid: resourceToTrash.storageId,
        parentitemid: resourceToTrash.parentFolderId,
        initiatorid: 'local1'
      })
      await onSSEItemTrashedEvent({ sseData, ...mocks })
      expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
  })
  describe('onSSEItemRestoredEvent', () => {
    it('calls "upsertResource" when resource has been restored', async () => {
      const resourceToRestore = mock<Resource>({
        id: 'restoredFile1',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const mocks = getMocks()
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...resourceToRestore })
      )
      const sseData = mock<EventSchemaType>({
        itemid: resourceToRestore.id,
        spaceid: resourceToRestore.storageId,
        parentitemid: resourceToRestore.parentFolderId
      })
      await onSSEItemRestoredEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
    })
    it('does not trigger any action when resource is not in current folder', async () => {
      const resourceToRestore = mock<Resource>({
        id: 'somewherelese',
        storageId: 'space1',
        parentFolderId: 'folder2!folder2'
      })
      const mocks = getMocks()
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...resourceToRestore })
      )
      const sseData = mock<EventSchemaType>({
        itemid: resourceToRestore.id,
        spaceid: resourceToRestore.storageId,
        parentitemid: resourceToRestore.parentFolderId
      })
      await onSSEItemRestoredEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const mocks = getMocks()
      const sseData = mock<EventSchemaType>({
        itemid: 'restoredFile',
        spaceid: 'space1',
        parentitemid: 'currenFolder!currentFolder',
        initiatorid: 'local1'
      })
      await onSSEItemRestoredEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
  })
  describe('onSSEItemMovedEvent', () => {
    it('calls "upsertResource" when resource has been moved in current folder', async () => {
      const resourceToMove = mock<Resource>({
        id: 'file1',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const mocks = getMocks()
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...resourceToMove })
      )
      const sseData = mock<EventSchemaType>({
        itemid: resourceToMove.id,
        spaceid: resourceToMove.storageId,
        parentitemid: resourceToMove.parentFolderId
      })
      await onSSEItemMovedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
    it('calls "removeResource" when resource has been moved out of current folder', async () => {
      const resourceToMove = mock<Resource>({
        id: 'file1',
        storageId: 'space1',
        parentFolderId: 'space1'
      })
      const mocks = getMocks({ resources: [resourceToMove] })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...resourceToMove })
      )
      const sseData = mock<EventSchemaType>({
        itemid: resourceToMove.id,
        spaceid: resourceToMove.storageId,
        parentitemid: resourceToMove.parentFolderId
      })
      await onSSEItemMovedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
    })

    it('does not trigger any action when initiator ids are identical', async () => {
      const resourceToMove = mock<Resource>({
        id: 'file1',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const mocks = getMocks()
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...resourceToMove })
      )
      const sseData = mock<EventSchemaType>({
        itemid: resourceToMove.id,
        spaceid: resourceToMove.storageId,
        parentitemid: resourceToMove.parentFolderId,
        initiatorid: 'local1'
      })
      await onSSEItemMovedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
  })
  describe('onSSEFileTouchedEvent', () => {
    it('calls "upsertResource" when resource has been created', async () => {
      const resourceToCreate = mock<Resource>({
        id: 'newFile1',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const mocks = getMocks()
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...resourceToCreate })
      )
      const sseData = mock<EventSchemaType>({
        itemid: resourceToCreate.id,
        spaceid: resourceToCreate.storageId,
        parentitemid: resourceToCreate.parentFolderId
      })
      await onSSEFileTouchedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
    })
    it('does not trigger any action when resource is not in current folder', async () => {
      const resourceToCreate = mock<Resource>({
        id: 'somewherelese',
        storageId: 'space1',
        parentFolderId: 'folder2!folder2'
      })
      const mocks = getMocks()
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...resourceToCreate })
      )
      const sseData = mock<EventSchemaType>({
        itemid: resourceToCreate.id,
        spaceid: resourceToCreate.storageId,
        parentitemid: resourceToCreate.parentFolderId
      })
      await onSSEFileTouchedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const resourceToCreate = mock<Resource>({
        id: 'newFile1',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const mocks = getMocks()
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...resourceToCreate })
      )
      const sseData = mock<EventSchemaType>({
        itemid: resourceToCreate.id,
        spaceid: resourceToCreate.storageId,
        parentitemid: resourceToCreate.parentFolderId,
        initiatorid: 'local1'
      })
      await onSSEFileTouchedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
  })
  describe('onSSEFolderCreatedEvent', () => {
    it('calls "upsertResource" when folder resource has been created', async () => {
      const resourceToCreate = mock<Resource>({
        id: 'newFolder1',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const mocks = getMocks()
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...resourceToCreate })
      )
      const sseData = mock<EventSchemaType>({
        itemid: resourceToCreate.id,
        spaceid: resourceToCreate.storageId,
        parentitemid: resourceToCreate.parentFolderId
      })
      await onSSEFolderCreatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
    })
    it('does not trigger any action when folder resource is not in current folder', async () => {
      const resourceToCreate = mock<Resource>({
        id: 'somewherelesefolder',
        storageId: 'space1',
        parentFolderId: 'folder2!folder2'
      })
      const mocks = getMocks()
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...resourceToCreate })
      )
      const sseData = mock<EventSchemaType>({
        itemid: resourceToCreate.id,
        spaceid: resourceToCreate.storageId,
        parentitemid: resourceToCreate.parentFolderId
      })
      await onSSEFolderCreatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const resourceToCreate = mock<Resource>({
        id: 'newFolder1',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const mocks = getMocks()
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...resourceToCreate })
      )
      const sseData = mock<EventSchemaType>({
        itemid: resourceToCreate.id,
        spaceid: resourceToCreate.storageId,
        parentitemid: resourceToCreate.parentFolderId,
        initiatorid: 'local1'
      })
      await onSSEFolderCreatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
  })

  describe('onSSEItemFavoriteAddedEvent', () => {
    it('calls "updateResourceField" when resource has been marked as favorite', async () => {
      const favoritedResource = mock<Resource>({ id: 'file1', storageId: 'space1' })
      const mocks = getMocks({ resources: [favoritedResource] })
      const sseData = mock<EventSchemaType>({
        itemid: favoritedResource.id,
        spaceid: favoritedResource.storageId,
        affecteduserids: ['1']
      })
      await onSSEItemFavoriteAddedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.updateResourceField).toHaveBeenCalledWith({
        id: favoritedResource.id,
        field: 'starred',
        value: true
      })
    })
    it('calls "setCurrentFolder" when the current folder has been marked as favorite', async () => {
      const mocks = getMocks()
      const sseData = mock<EventSchemaType>({
        itemid: mocks.resourcesStore.currentFolder.id,
        spaceid: 'space1',
        affecteduserids: ['1']
      })
      await onSSEItemFavoriteAddedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.setCurrentFolder).toHaveBeenCalledWith(
        expect.objectContaining({ id: mocks.resourcesStore.currentFolder.id, starred: true })
      )
    })
    it('calls "upsertResource" when being on the favorites view', async () => {
      const favoritedResource = mock<Resource>({ id: 'file1', storageId: 'space1' })
      const mocks = getMocks({ currentRouteName: 'files-common-favorites' })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(favoritedResource)
      const sseData = mock<EventSchemaType>({
        itemid: favoritedResource.id,
        spaceid: favoritedResource.storageId,
        affecteduserids: ['1']
      })
      await onSSEItemFavoriteAddedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalledWith(favoritedResource)
    })
    it('does not trigger any action when the current user is not affected', async () => {
      const favoritedResource = mock<Resource>({ id: 'file1', storageId: 'space1' })
      const mocks = getMocks({ resources: [favoritedResource] })
      const sseData = mock<EventSchemaType>({
        itemid: favoritedResource.id,
        spaceid: favoritedResource.storageId,
        affecteduserids: ['2']
      })
      await onSSEItemFavoriteAddedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
    })
    it('does not trigger any action when no affected user ids are given', async () => {
      const favoritedResource = mock<Resource>({ id: 'file1', storageId: 'space1' })
      const mocks = getMocks({ resources: [favoritedResource] })
      const sseData = mock<EventSchemaType>({
        itemid: favoritedResource.id,
        spaceid: favoritedResource.storageId,
        affecteduserids: null
      })
      await onSSEItemFavoriteAddedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const favoritedResource = mock<Resource>({ id: 'file1', storageId: 'space1' })
      const mocks = getMocks({ resources: [favoritedResource] })
      const sseData = mock<EventSchemaType>({
        itemid: favoritedResource.id,
        spaceid: favoritedResource.storageId,
        affecteduserids: ['1'],
        initiatorid: 'local1'
      })
      await onSSEItemFavoriteAddedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
    })
  })

  describe('onSSEItemFavoriteRemovedEvent', () => {
    it('calls "updateResourceField" when resource has been unmarked as favorite', async () => {
      const favoritedResource = mock<Resource>({ id: 'file1', storageId: 'space1' })
      const mocks = getMocks({ resources: [favoritedResource] })
      const sseData = mock<EventSchemaType>({
        itemid: favoritedResource.id,
        spaceid: favoritedResource.storageId,
        affecteduserids: ['1']
      })
      await onSSEItemFavoriteRemovedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.updateResourceField).toHaveBeenCalledWith({
        id: favoritedResource.id,
        field: 'starred',
        value: false
      })
    })
    it('calls "removeResources" when being on the favorites view', async () => {
      const favoritedResource = mock<Resource>({ id: 'file1', storageId: 'space1' })
      const mocks = getMocks({
        resources: [favoritedResource],
        currentRouteName: 'files-common-favorites'
      })
      const sseData = mock<EventSchemaType>({
        itemid: favoritedResource.id,
        spaceid: favoritedResource.storageId,
        affecteduserids: ['1']
      })
      await onSSEItemFavoriteRemovedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.removeResources).toHaveBeenCalledWith([favoritedResource])
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
    })
    it('does not trigger any action when the resource is not loaded on the favorites view', async () => {
      const mocks = getMocks({ currentRouteName: 'files-common-favorites' })
      const sseData = mock<EventSchemaType>({
        itemid: 'file1',
        spaceid: 'space1',
        affecteduserids: ['1']
      })
      await onSSEItemFavoriteRemovedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
    it('does not trigger any action when the current user is not affected', async () => {
      const favoritedResource = mock<Resource>({ id: 'file1', storageId: 'space1' })
      const mocks = getMocks({ resources: [favoritedResource] })
      const sseData = mock<EventSchemaType>({
        itemid: favoritedResource.id,
        spaceid: favoritedResource.storageId,
        affecteduserids: ['2']
      })
      await onSSEItemFavoriteRemovedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const favoritedResource = mock<Resource>({ id: 'file1', storageId: 'space1' })
      const mocks = getMocks({ resources: [favoritedResource] })
      const sseData = mock<EventSchemaType>({
        itemid: favoritedResource.id,
        spaceid: favoritedResource.storageId,
        affecteduserids: ['1'],
        initiatorid: 'local1'
      })
      await onSSEItemFavoriteRemovedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
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
  currentRouteName = 'files-spaces-generic'
}: {
  currentFolder?: Resource
  resources?: Resource[]
  spaces?: SpaceResource[]
  currentRouteName?: string
} = {}) => {
  createTestingPinia()
  const resourcesStore = useResourcesStore()
  resourcesStore.currentFolder = currentFolder
  resourcesStore.resources = resources
  const spacesStore = useSpacesStore()
  spacesStore.spaces = spaces
  const messageStore = useMessages()
  const userStore = useUserStore()
  userStore.user = mockDeep<User>({ id: '1' })
  const sharesStore = useSharesStore()
  const configStore = useConfigStore()
  const authStore = useAuthStore()
  const clientService = mockDeep<ClientService>({ initiatorId: 'local1' })
  const previewService = mockDeep<PreviewService>()
  const { $router: router } = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: currentRouteName })
  })
  const language = mockDeep<Language>({
    $gettext: vi.fn((m) => m)
  })
  const resourceQueue = mockDeep<PQueue>()

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
