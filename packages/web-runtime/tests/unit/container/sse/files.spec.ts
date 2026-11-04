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
  onSSEItemTrashedEvent,
  onSSEProcessingFinishedEvent
} from '../../../../src/container/sse'
import { RouteLocation } from 'vue-router'
import { mock, mockDeep } from 'vitest-mock-extended'
import { Resource, SpaceResource, urlJoin } from '@opencloud-eu/web-client'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { createTestingPinia, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { Language } from 'vue3-gettext'
import PQueue from 'p-queue'
import { nextTick } from 'vue'

describe('file events', () => {
  describe('in an incoming share', () => {
    // share recipients don't have the space of the shared resource, only the share space
    const getShareMocks = (
      resources: Resource[] = [],
      currentFolder = mockDeep<Resource>({
        id: 'shareJail!share1',
        fileId: 'space1!sharedFolder',
        storageId: 'space1',
        path: '/',
        isFolder: true
      })
    ) => {
      const shareSpace = mockDeep<SpaceResource>({ id: 'shareJail!share1', driveType: 'share' })
      const mocks = getMocks({
        currentFolder,
        resources,
        spaces: [shareSpace],
        currentSpace: shareSpace
      })
      return { ...mocks, shareSpace }
    }

    // the resource is looked up by id first, then loaded via its path in the share
    const mockGetFileInfo = (
      mocks: ReturnType<typeof getShareMocks>,
      { id, name, parentFolderId }: { id: string; name: string; parentFolderId: string }
    ) => {
      mocks.clientService.webdav.getFileInfo.mockImplementation((space) =>
        Promise.resolve(
          space === mocks.shareSpace
            ? mock<Resource>({ id, name, parentFolderId, path: `/${name}` })
            : mock<Resource>({ id, name, parentFolderId })
        )
      )
    }

    it('adds a folder created in the share root', async () => {
      const mocks = getShareMocks()
      mockGetFileInfo(mocks, {
        id: 'space1!newFolder',
        name: 'newFolder',
        parentFolderId: 'space1!sharedFolder'
      })
      const sseData = mock<EventSchemaType>({
        itemid: 'space1!newFolder',
        spaceid: 'space1',
        parentitemid: 'space1!sharedFolder'
      })
      await onSSEFolderCreatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenLastCalledWith(mocks.shareSpace, {
        path: '/newFolder'
      })
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
    })
    it('updates a renamed resource', async () => {
      const resourceToRename = mock<Resource>({
        id: 'space1!folder1',
        name: 'folder1',
        path: '/folder1',
        storageId: 'space1',
        parentFolderId: 'space1!sharedFolder'
      })
      const mocks = getShareMocks([resourceToRename])
      mockGetFileInfo(mocks, {
        id: 'space1!folder1',
        name: 'renamed',
        parentFolderId: 'space1!sharedFolder'
      })
      const sseData = mock<EventSchemaType>({
        itemid: resourceToRename.id,
        spaceid: 'space1',
        parentitemid: resourceToRename.parentFolderId
      })
      await onSSEItemRenamedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenLastCalledWith(mocks.shareSpace, {
        path: '/renamed'
      })
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'renamed' })
      )
    })
    it('removes a resource that was moved out of the current folder', async () => {
      const resourceToMove = mock<Resource>({
        id: 'space1!folder1',
        storageId: 'space1',
        parentFolderId: 'space1!sharedFolder'
      })
      const mocks = getShareMocks([resourceToMove])
      // the new location is not accessible for the share recipient
      mocks.clientService.webdav.getFileInfo.mockRejectedValue(new Error('404'))
      const sseData = mock<EventSchemaType>({
        itemid: resourceToMove.id,
        spaceid: 'space1',
        parentitemid: 'space1!otherFolder'
      })
      await onSSEItemMovedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).toHaveBeenCalledWith([resourceToMove])
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
    it('adds a resource that was moved into the current folder', async () => {
      const mocks = getShareMocks()
      mockGetFileInfo(mocks, {
        id: 'space1!folder1',
        name: 'folder1',
        parentFolderId: 'space1!sharedFolder'
      })
      const sseData = mock<EventSchemaType>({
        itemid: 'space1!folder1',
        spaceid: 'space1',
        parentitemid: 'space1!sharedFolder'
      })
      await onSSEItemMovedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenLastCalledWith(mocks.shareSpace, {
        path: '/folder1'
      })
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
    it('does not add a moved resource if the user navigated away while loading it', async () => {
      const mocks = getShareMocks()
      mocks.clientService.webdav.getFileInfo.mockImplementation(() => {
        mocks.resourcesStore.currentFolder = mockDeep<Resource>({
          id: 'space1!otherFolder',
          fileId: 'space1!otherFolder',
          storageId: 'space1',
          path: '/otherFolder',
          isFolder: true
        })
        return Promise.resolve(
          mock<Resource>({
            id: 'space1!folder1',
            name: 'folder1',
            parentFolderId: 'space1!sharedFolder'
          })
        )
      })
      const sseData = mock<EventSchemaType>({
        itemid: 'space1!folder1',
        spaceid: 'space1',
        parentitemid: 'space1!sharedFolder'
      })
      await onSSEItemMovedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalledTimes(1)
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
    it('updates the current folder when it has been renamed', async () => {
      const currentFolder = mockDeep<Resource>({
        id: 'space1!subFolder',
        fileId: 'space1!subFolder',
        storageId: 'space1',
        path: '/subFolder',
        isFolder: true
      })
      const mocks = getShareMocks([], currentFolder)
      mockGetFileInfo(mocks, {
        id: 'space1!subFolder',
        name: 'renamed',
        parentFolderId: 'space1!sharedFolder'
      })
      const sseData = mock<EventSchemaType>({
        itemid: currentFolder.id,
        spaceid: 'space1',
        parentitemid: 'space1!sharedFolder'
      })
      await onSSEItemRenamedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenLastCalledWith(mocks.shareSpace, {
        path: '/renamed'
      })
      expect(mocks.resourcesStore.setCurrentFolder).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'renamed' })
      )
      expect(mocks.router.push).toHaveBeenCalled()
    })
    it('does not add a resource restored outside of the current folder', async () => {
      const mocks = getShareMocks()
      mockGetFileInfo(mocks, {
        id: 'space1!file1',
        name: 'file1',
        parentFolderId: 'space1!otherFolder'
      })
      const sseData = mock<EventSchemaType>({
        itemid: 'space1!file1',
        spaceid: 'space1',
        parentitemid: 'space1!otherFolder'
      })
      await onSSEItemRestoredEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalledTimes(1)
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalledWith(
        mocks.shareSpace,
        expect.anything()
      )
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
    it('updates a locked resource', async () => {
      const resourceToLock = mock<Resource>({
        id: 'space1!file1',
        storageId: 'space1',
        parentFolderId: 'space1!sharedFolder'
      })
      const mocks = getShareMocks([resourceToLock])
      mockGetFileInfo(mocks, {
        id: 'space1!file1',
        name: 'file1',
        parentFolderId: 'space1!sharedFolder'
      })
      const sseData = mock<EventSchemaType>({
        itemid: resourceToLock.id,
        spaceid: 'space1',
        parentitemid: resourceToLock.parentFolderId
      })
      await onSSEFileLockingEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenLastCalledWith(mocks.shareSpace, {
        path: '/file1'
      })
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/file1' })
      )
    })
    it('updates a resource when processing has finished', async () => {
      const processedResource = mock<Resource>({
        id: 'space1!file1',
        storageId: 'space1',
        parentFolderId: 'space1!sharedFolder',
        etag: 'oldEtag'
      })
      const mocks = getShareMocks([processedResource])
      mockGetFileInfo(mocks, {
        id: 'space1!file1',
        name: 'file1',
        parentFolderId: 'space1!sharedFolder'
      })
      const sseData = mock<EventSchemaType>({
        itemid: processedResource.id,
        spaceid: 'space1',
        parentitemid: processedResource.parentFolderId,
        etag: 'newEtag'
      })
      await onSSEProcessingFinishedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenLastCalledWith(mocks.shareSpace, {
        path: '/file1'
      })
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/file1' })
      )
      expect(mocks.previewService.loadPreview).toHaveBeenCalledWith(
        expect.objectContaining({ space: mocks.shareSpace })
      )
    })
    it('ignores events of other spaces', async () => {
      const mocks = getShareMocks()
      const sseData = mock<EventSchemaType>({
        itemid: 'space2!newFolder',
        spaceid: 'space2',
        parentitemid: 'space2!folder'
      })
      await onSSEFolderCreatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
    it('ignores events if the current space is not a share', async () => {
      const publicSpace = mockDeep<SpaceResource>({ id: 'publicToken', driveType: 'public' })
      const mocks = getMocks({
        currentFolder: mockDeep<Resource>({
          id: 'space1!sharedFolder',
          fileId: 'space1!sharedFolder',
          storageId: 'space1',
          path: '/',
          isFolder: true
        }),
        spaces: [publicSpace],
        currentSpace: publicSpace
      })
      const sseData = mock<EventSchemaType>({
        itemid: 'space1!newFolder',
        spaceid: 'space1',
        parentitemid: 'space1!sharedFolder'
      })
      await onSSEFolderCreatedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
  })
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
    it.each(['files-spaces-generic', 'files-public-link', 'files-guest-link'])(
      'calls "setCurrentFolder" and updates the "%s" route when resource is current folder and has been renamed',
      async (currentRouteName) => {
        const resourceToRename = mock<Resource>({
          id: 'currenFolder!currentFolder',
          storageId: 'space1',
          parentFolderId: 'space1'
        })
        const mocks = getMocks({ resources: [resourceToRename], currentRouteName })
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
        expect(mocks.router.push).toHaveBeenCalledWith(
          expect.objectContaining({ name: currentRouteName })
        )
        expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      }
    )
    it('keeps an app working with the new path when the folder of its file has been renamed', async () => {
      const space = mock<SpaceResource>({
        id: 'space1',
        webDavPath: '/spaces/space1',
        getDriveAliasAndItem: ({ path }: Resource) =>
          urlJoin('personal/admin', path, { leadingSlash: false })
      })
      const currentFolder = mock<Resource>({
        id: 'space1!pics',
        fileId: 'space1!pics',
        storageId: 'space1',
        path: '/pics',
        isFolder: true
      })
      const files = ['1.jpg', '3.jpg'].map(
        (name) =>
          ({
            id: `space1!${name}`,
            name,
            path: `/pics/${name}`,
            webDavPath: `/spaces/space1/pics/${name}`,
            downloadURL: `https://example.org/dav/spaces/space1/pics/${name}?signature`
          }) as Resource
      )
      const query = {
        fileId: 'space1!1.jpg',
        contextRouteName: 'files-spaces-generic',
        contextRouteParams: { driveAliasAndItem: 'personal/admin/pics' },
        contextRouteQuery: { fileId: 'space1!pics' }
      }
      const mocks = getMocks({
        currentFolder,
        resources: files,
        spaces: [space],
        currentRoute: mock<RouteLocation>({
          name: 'preview-media',
          params: { driveAliasAndItem: 'personal/admin/pics/1.jpg' },
          query: query as unknown as RouteLocation['query']
        })
      })
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...currentFolder, name: 'pics2', path: '/pics2' })
      )
      const sseData = mock<EventSchemaType>({
        itemid: currentFolder.id,
        spaceid: currentFolder.storageId,
        parentitemid: 'space1'
      })
      await onSSEItemRenamedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.setCurrentFolder).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'pics2' })
      )
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalledTimes(2)
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'space1!3.jpg',
          name: '3.jpg',
          path: '/pics2/3.jpg',
          webDavPath: '/spaces/space1/pics2/3.jpg',
          downloadURL: undefined
        })
      )
      expect(mocks.router.push).not.toHaveBeenCalled()
      expect(mocks.router.replace).toHaveBeenCalledWith({
        name: 'preview-media',
        params: { driveAliasAndItem: 'personal/admin/pics2/1.jpg' },
        query: { ...query, contextRouteParams: { driveAliasAndItem: 'personal/admin/pics2' } }
      })
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
    it('waits for a running folder load before updating the resource', async () => {
      const resourceToUnlock = mock<Resource>({
        id: 'file1',
        storageId: 'space1',
        parentFolderId: 'currenFolder!currentFolder'
      })
      const mocks = getMocks()
      vi.mocked(mocks.resourcesStore).resourcesLoading = true
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(
        mock<Resource>({ ...resourceToUnlock, locked: false })
      )
      const sseData = mock<EventSchemaType>({
        itemid: resourceToUnlock.id,
        spaceid: resourceToUnlock.storageId,
        parentitemid: resourceToUnlock.parentFolderId
      })

      const handled = onSSEFileLockingEvent({ sseData, ...mocks })
      await nextTick()
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()

      // the folder load finishes with the resource still being locked
      mocks.resourcesStore.resources = [mock<Resource>({ ...resourceToUnlock, locked: true })]
      vi.mocked(mocks.resourcesStore).resourcesLoading = false
      await handled

      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({ locked: false })
      )
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
    describe('in a trash bin', () => {
      const space = mockDeep<SpaceResource>({ id: 'storage$space1' })
      const sseData = mock<EventSchemaType>({
        itemid: 'storage$space1!node1',
        spaceid: 'storage$space1',
        parentitemid: 'storage$space1!parent'
      })

      function getTrashMocks() {
        const mocks = getMocks({
          currentSpace: space,
          spaces: [space],
          currentRouteName: 'files-trash-generic'
        })
        mocks.resourceQueue.add.mockImplementation((task) => Promise.resolve(task({})))
        return mocks
      }

      it('adds the trashed item to the trash bin of its space', async () => {
        const mocks = getTrashMocks()
        const trashItem = mock<Resource>({ id: 'node1' })
        mocks.clientService.webdav.getFileInfo.mockResolvedValue(trashItem)

        await onSSEItemTrashedEvent({ sseData, ...mocks })

        expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalledWith(
          space,
          { path: 'node1' },
          expect.objectContaining({ isTrash: true })
        )
        expect(mocks.resourceQueue.add).toHaveBeenCalledTimes(1)
        expect(mocks.resourcesStore.upsertResource).toHaveBeenCalledWith(trashItem)
      })
      it('does not add the trashed item if the space changes while it is loaded', async () => {
        const mocks = getTrashMocks()
        let resolveTrashItem: (resource: Resource) => void
        mocks.clientService.webdav.getFileInfo.mockReturnValue(
          new Promise((resolve) => {
            resolveTrashItem = resolve
          })
        )

        const handled = onSSEItemTrashedEvent({ sseData, ...mocks })
        await vi.waitFor(() => expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled())
        mocks.spacesStore.currentSpace = mockDeep<SpaceResource>({ id: 'space2' })
        resolveTrashItem(mock<Resource>({ id: 'node1' }))
        await handled

        expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      })
      it.each([
        { description: 'another space', currentRouteName: 'files-trash-generic', id: 'space2' },
        {
          description: 'a folder of the space',
          currentRouteName: 'files-spaces-generic',
          id: 'storage$space1'
        }
      ])('does not load the trashed item in $description', async ({ currentRouteName, id }) => {
        const currentSpace = mockDeep<SpaceResource>({ id })
        const mocks = getMocks({ currentSpace, spaces: [currentSpace], currentRouteName })

        await onSSEItemTrashedEvent({ sseData, ...mocks })

        expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
        expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      })
      it('does nothing if the trashed item cannot be loaded', async () => {
        const mocks = getTrashMocks()
        mocks.clientService.webdav.getFileInfo.mockRejectedValue(new Error('not found'))

        await onSSEItemTrashedEvent({ sseData, ...mocks })

        expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
        expect(mocks.messageStore.showMessage).not.toHaveBeenCalled()
      })
      it('marks the space as having trashed items in the trash overview', async () => {
        const mocks = getMocks({ spaces: [space], currentRouteName: 'files-trash-overview' })

        await onSSEItemTrashedEvent({ sseData, ...mocks })

        expect(mocks.spacesStore.updateSpaceField).toHaveBeenCalledWith({
          id: 'storage$space1',
          field: 'hasTrashedItems',
          value: true
        })
        expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      })
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
    describe('in a trash bin', () => {
      const trashItem = mock<Resource>({ id: 'node1' })
      const sseData = mock<EventSchemaType>({
        itemid: 'storage$space1!node1',
        spaceid: 'storage$space1',
        parentitemid: 'storage$space1!parent'
      })

      it('removes the restored item from the trash bin of its space', async () => {
        const space = mockDeep<SpaceResource>({ id: 'storage$space1' })
        const mocks = getMocks({
          currentSpace: space,
          spaces: [space],
          resources: [trashItem],
          currentRouteName: 'files-trash-generic'
        })

        mocks.resourcesStore.selectedIds = ['node1', 'node2']

        await onSSEItemRestoredEvent({ sseData, ...mocks })

        expect(mocks.resourcesStore.removeResources).toHaveBeenCalledWith([trashItem])
        expect(mocks.resourcesStore.setSelection).toHaveBeenCalledWith(['node2'])
        expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      })
      it('does not remove a trash item of another space', async () => {
        const space = mockDeep<SpaceResource>({ id: 'space2' })
        const mocks = getMocks({
          currentSpace: space,
          spaces: [space],
          resources: [trashItem],
          currentRouteName: 'files-trash-generic'
        })

        await onSSEItemRestoredEvent({ sseData, ...mocks })

        expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
      })
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
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
    })

    describe('in a flat list without a current folder', () => {
      it('updates the moved resource with its new location', async () => {
        const resourceToMove = mock<Resource>({
          id: 'file1',
          storageId: 'space1',
          path: '/src/fav.txt',
          parentFolderId: 'space1!src'
        })
        const mocks = getMocks({ currentFolder: null, resources: [resourceToMove] })
        const movedResource = mock<Resource>({
          ...resourceToMove,
          path: '/src/dest/fav.txt',
          parentFolderId: 'space1!dest'
        })
        mocks.clientService.webdav.getFileInfo.mockResolvedValue(movedResource)
        const sseData = mock<EventSchemaType>({
          itemid: resourceToMove.id,
          spaceid: resourceToMove.storageId,
          parentitemid: 'space1!dest'
        })
        await onSSEItemMovedEvent({ sseData, ...mocks })
        expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalledWith(
          mocks.spacesStore.spaces[0],
          {
            path: '',
            fileId: resourceToMove.id
          }
        )
        expect(mocks.resourcesStore.upsertResource).toHaveBeenCalledWith(movedResource)
        expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
      })
      it('removes the moved resource if it can not be loaded anymore', async () => {
        const resourceToMove = mock<Resource>({
          id: 'file1',
          storageId: 'space1',
          parentFolderId: 'space1!src'
        })
        const mocks = getMocks({ currentFolder: null, resources: [resourceToMove] })
        mocks.clientService.webdav.getFileInfo.mockRejectedValue(new Error('not found'))
        const sseData = mock<EventSchemaType>({
          itemid: resourceToMove.id,
          spaceid: resourceToMove.storageId,
          parentitemid: 'space1!dest'
        })
        await onSSEItemMovedEvent({ sseData, ...mocks })
        expect(mocks.resourcesStore.removeResources).toHaveBeenCalledWith([resourceToMove])
        expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      })
      it('removes the moved resource if its space is unknown', async () => {
        const resourceToMove = mock<Resource>({ id: 'file1', storageId: 'sharedSpace' })
        const mocks = getMocks({ currentFolder: null, resources: [resourceToMove] })
        const sseData = mock<EventSchemaType>({
          itemid: resourceToMove.id,
          spaceid: resourceToMove.storageId,
          parentitemid: 'sharedSpace!dest'
        })
        await onSSEItemMovedEvent({ sseData, ...mocks })
        expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
        expect(mocks.resourcesStore.removeResources).toHaveBeenCalledWith([resourceToMove])
        expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      })
      it('does not add the moved resource if the user navigated away while loading it', async () => {
        const resourceToMove = mock<Resource>({ id: 'file1', storageId: 'space1' })
        const mocks = getMocks({ currentFolder: null, resources: [resourceToMove] })
        mocks.clientService.webdav.getFileInfo.mockImplementation(() => {
          mocks.resourcesStore.resources = []
          return Promise.resolve(mock<Resource>({ ...resourceToMove }))
        })
        const sseData = mock<EventSchemaType>({
          itemid: resourceToMove.id,
          spaceid: resourceToMove.storageId,
          parentitemid: 'space1!dest'
        })
        await onSSEItemMovedEvent({ sseData, ...mocks })
        expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
      })
      it('does not add a moved resource that is not in the list', async () => {
        const mocks = getMocks({ currentFolder: null, resources: [] })
        const sseData = mock<EventSchemaType>({
          itemid: 'file1',
          spaceid: 'space1',
          parentitemid: 'space1!dest'
        })
        await onSSEItemMovedEvent({ sseData, ...mocks })
        expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
        expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
        expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
      })
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
        spaceid: favoritedResource.storageId
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
        spaceid: 'space1'
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
        spaceid: favoritedResource.storageId
      })
      await onSSEItemFavoriteAddedEvent({ sseData, ...mocks })
      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalledWith(favoritedResource)
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const favoritedResource = mock<Resource>({ id: 'file1', storageId: 'space1' })
      const mocks = getMocks({ resources: [favoritedResource] })
      const sseData = mock<EventSchemaType>({
        itemid: favoritedResource.id,
        spaceid: favoritedResource.storageId,
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
        spaceid: favoritedResource.storageId
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
        spaceid: favoritedResource.storageId
      })
      await onSSEItemFavoriteRemovedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.removeResources).toHaveBeenCalledWith([favoritedResource])
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
    })
    it('does not trigger any action when the resource is not loaded on the favorites view', async () => {
      const mocks = getMocks({ currentRouteName: 'files-common-favorites' })
      const sseData = mock<EventSchemaType>({ itemid: 'file1', spaceid: 'space1' })
      await onSSEItemFavoriteRemovedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
    it('does not trigger any action when initiator ids are identical', async () => {
      const favoritedResource = mock<Resource>({ id: 'file1', storageId: 'space1' })
      const mocks = getMocks({ resources: [favoritedResource] })
      const sseData = mock<EventSchemaType>({
        itemid: favoritedResource.id,
        spaceid: favoritedResource.storageId,
        initiatorid: 'local1'
      })
      await onSSEItemFavoriteRemovedEvent({ sseData, ...mocks })
      expect(mocks.resourcesStore.updateResourceField).not.toHaveBeenCalled()
    })
  })
  describe('during a running folder load', () => {
    it.each(
      [
        onSSEItemRenamedEvent,
        onSSEFileLockingEvent,
        onSSEProcessingFinishedEvent,
        onSSEItemTrashedEvent,
        onSSEItemRestoredEvent,
        onSSEItemMovedEvent,
        onSSEFileTouchedEvent,
        onSSEFolderCreatedEvent,
        onSSEItemFavoriteAddedEvent,
        onSSEItemFavoriteRemovedEvent
      ].map((handler) => ({ name: handler.name, handler }))
    )('$name waits for the load to finish', async ({ handler }) => {
      const currentFolderId = 'currenFolder!currentFolder'
      const resource = mock<Resource>({
        id: 'file1',
        storageId: 'space1',
        parentFolderId: currentFolderId
      })
      const mocks = getMocks({ resources: [resource] })
      vi.mocked(mocks.resourcesStore).resourcesLoading = true
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(mock<Resource>({ ...resource }))
      const sseData = mock<EventSchemaType>({
        itemid: resource.id,
        spaceid: resource.storageId,
        parentitemid: currentFolderId,
        etag: 'newEtag'
      })
      const { upsertResource, removeResources, updateResourceField } = mocks.resourcesStore

      const handled = handler({ sseData, ...mocks })
      await nextTick()
      expect(mocks.clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      for (const action of [upsertResource, removeResources, updateResourceField]) {
        expect(action).not.toHaveBeenCalled()
      }

      vi.mocked(mocks.resourcesStore).resourcesLoading = false
      await handled

      expect(
        [upsertResource, removeResources, updateResourceField].some(
          (action) => vi.mocked(action).mock.calls.length
        )
      ).toBe(true)
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
  currentSpace = undefined,
  currentRouteName = 'files-spaces-generic',
  currentRoute = mock<RouteLocation>({ name: currentRouteName })
}: {
  currentFolder?: Resource
  resources?: Resource[]
  spaces?: SpaceResource[]
  currentSpace?: SpaceResource
  currentRouteName?: string
  currentRoute?: RouteLocation
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
  userStore.user = mockDeep<User>({ id: '1' })
  const sharesStore = useSharesStore()
  const configStore = useConfigStore()
  const authStore = useAuthStore()
  const clientService = mockDeep<ClientService>({ initiatorId: 'local1' })
  const previewService = mockDeep<PreviewService>()
  const { $router: router } = defaultComponentMocks({ currentRoute })
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
