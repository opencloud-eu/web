import FileSideBar from '../../../../src/components/SideBar/FileSideBar.vue'
import {
  CollaboratorShare,
  LinkShare,
  Resource,
  ShareRole,
  SpaceResource
} from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  defaultPlugins,
  RouteLocation,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import type { Mock } from 'vitest'
import { defineComponent, ref } from 'vue'
import { useSelectedResources } from '../../../../src/composables/selection'
import {
  useAppsStore,
  useExtensionRegistry,
  useMessages,
  useResourcesStore,
  useSharesStore,
  useSideBar
} from '../../../../src/composables/piniaStores'
import { AncestorMetaDataValue } from '../../../../src'
import { MESSAGE_TYPE } from '@opencloud-eu/web-client/sse'

const InnerSideBarComponent = defineComponent({
  props: { availablePanels: { type: Array, required: true } },
  template: '<div id="foo"><slot name="rootHeader"></slot></div>'
})

const { canListVersionsMock } = vi.hoisted(() => ({ canListVersionsMock: vi.fn() }))
vi.mock('../../../../src/composables/selection', () => ({ useSelectedResources: vi.fn() }))
vi.mock('../../../../src/composables/resources/useCanListVersions', () => ({
  useCanListVersions: () => ({ canListVersions: canListVersionsMock })
}))

const selectors = {
  sideBar: '.files-side-bar',
  fileInfoStub: 'file-info-stub',
  spaceInfoStub: 'space-info-stub'
}

describe('FileSideBar', () => {
  describe('isOpen', () => {
    it.each([true, false])(
      'should show or hide the sidebar according to the isOpen prop',
      (isOpen) => {
        const { wrapper } = createWrapper({ isOpen })
        expect(wrapper.find(selectors.sideBar).exists()).toBe(isOpen)
      }
    )
  })
  describe('file info header', () => {
    it('should show when one resource selected', async () => {
      const item = mock<Resource>({ path: '/someFolder' })
      const { wrapper } = createWrapper({ item })
      ;(wrapper.vm as any).loadedResource = item
      await wrapper.vm.$nextTick()
      expect(wrapper.find(selectors.fileInfoStub).exists()).toBeTruthy()
    })
    it('not show when no resource selected', () => {
      const { wrapper } = createWrapper()
      expect(wrapper.find(selectors.fileInfoStub).exists()).toBeFalsy()
    })
    it('should not show when selected resource is a project space', async () => {
      const item = mock<SpaceResource>({ path: '/someFolder', driveType: 'project' })
      const { wrapper } = createWrapper({ item })
      ;(wrapper.vm as any).loadedResource = item
      await wrapper.vm.$nextTick()
      expect(wrapper.find(selectors.fileInfoStub).exists()).toBeFalsy()
    })
  })
  describe('space info header', () => {
    it('should show when one project space resource selected', async () => {
      const item = mock<SpaceResource>({ path: '/someFolder', driveType: 'project' })
      const { wrapper } = createWrapper({ item })
      ;(wrapper.vm as any).loadedResource = item
      await wrapper.vm.$nextTick()
      expect(wrapper.find(selectors.spaceInfoStub).exists()).toBeTruthy()
    })
    it('not show when no resource selected', () => {
      const { wrapper } = createWrapper()
      expect(wrapper.find(selectors.spaceInfoStub).exists()).toBeFalsy()
    })
    it('should not show when selected resource is not a project space', async () => {
      const item = mock<Resource>({ path: '/someFolder' })
      const { wrapper } = createWrapper({ item })
      ;(wrapper.vm as any).loadedResource = item
      await wrapper.vm.$nextTick()
      expect(wrapper.find(selectors.spaceInfoStub).exists()).toBeFalsy()
    })
  })
  describe('loadSharesTask', () => {
    it('sets the loading state correctly', async () => {
      const resource = mock<Resource>()
      const { wrapper, mocks } = createWrapper()

      mocks.$clientService.graphAuthenticated.permissions.listPermissions.mockResolvedValue({
        shares: [],
        allowedActions: [],
        allowedRoles: []
      })

      const { setLoading } = useSharesStore()
      await (wrapper.vm as any).loadSharesTask.perform({ resource })

      expect(setLoading).toHaveBeenCalledTimes(2)
    })
    it('sets direct collaborator and link shares', async () => {
      const resource = mock<Resource>()
      const { wrapper, mocks } = createWrapper()

      const collaboratorShare = { id: '1', role: {} } as unknown as CollaboratorShare
      const linkShare = { id: '2' } as unknown as LinkShare
      mocks.$clientService.graphAuthenticated.permissions.listPermissions.mockResolvedValue({
        shares: [collaboratorShare, linkShare],
        allowedActions: [],
        allowedRoles: []
      })

      const { setCollaboratorShares, setLinkShares } = useSharesStore()
      await (wrapper.vm as any).loadSharesTask.perform({ resource })

      expect(setCollaboratorShares).toHaveBeenCalledWith([expect.anything()])
      expect(setLinkShares).toHaveBeenCalledWith([expect.anything()])
    })
    it('sets indirect shares', async () => {
      const resource = mock<Resource>()
      const { wrapper, mocks } = createWrapper()

      mocks.$clientService.graphAuthenticated.permissions.listPermissions.mockResolvedValueOnce({
        shares: [],
        allowedActions: [],
        allowedRoles: []
      })

      const collaboratorShare = { id: '1', role: {} } as unknown as CollaboratorShare
      mocks.$clientService.graphAuthenticated.permissions.listPermissions.mockResolvedValueOnce({
        shares: [collaboratorShare],
        allowedActions: [],
        allowedRoles: []
      })

      const resourcesStore = useResourcesStore()
      resourcesStore.ancestorMetaData = { '/foo': mock<AncestorMetaDataValue>({ id: '1' }) }

      await (wrapper.vm as any).loadSharesTask.perform({ resource })

      expect(
        mocks.$clientService.graphAuthenticated.permissions.listPermissions
      ).toHaveBeenCalledTimes(2)
    })
    it('loads available external share roles if the ocm app is enabled', async () => {
      const resource = mock<Resource>()
      const { wrapper, mocks } = createWrapper()

      mocks.$clientService.graphAuthenticated.permissions.listPermissions.mockResolvedValue({
        shares: [],
        allowedActions: [],
        allowedRoles: []
      })

      const { isAppEnabled } = useAppsStore()
      vi.mocked(isAppEnabled).mockReturnValue(true)
      await (wrapper.vm as any).loadSharesTask.perform({ resource })

      expect(
        mocks.$clientService.graphAuthenticated.permissions.listPermissions
      ).toHaveBeenCalledTimes(2)
    })

    it('loads ancestor meta data when the current folder is not loaded', async () => {
      const resource = mock<Resource>()
      const { wrapper, mocks } = createWrapper({ currentFolder: null })
      const { loadAncestorMetaData } = useResourcesStore()

      mocks.$clientService.graphAuthenticated.permissions.listPermissions.mockResolvedValue({
        shares: [],
        allowedActions: [],
        allowedRoles: []
      })

      await (wrapper.vm as any).loadSharesTask.perform({ resource })
      expect(loadAncestorMetaData).toHaveBeenCalled()
    })
    it('does not load ancestor meta data when the current folder is loaded', async () => {
      const resource = mock<Resource>()
      const { wrapper, mocks } = createWrapper({ currentFolder: mock<Resource>() })
      const { loadAncestorMetaData } = useResourcesStore()

      mocks.$clientService.graphAuthenticated.permissions.listPermissions.mockResolvedValue({
        shares: [],
        allowedActions: [],
        allowedRoles: []
      })

      await (wrapper.vm as any).loadSharesTask.perform({ resource })
      expect(loadAncestorMetaData).not.toHaveBeenCalled()
    })

    it('loads inherited shares and project space members when explicitly requested', async () => {
      const space = mock<SpaceResource>({ id: 'space-id', driveType: 'project' })
      const resource = mock<Resource>({
        id: 'resource-id',
        fileId: 'resource-id',
        path: '/folder/document.md'
      })
      const { wrapper, mocks } = createWrapper({ space })
      const resourcesStore = useResourcesStore()

      mocks.$clientService.graphAuthenticated.permissions.listPermissions.mockResolvedValue({
        shares: [],
        allowedActions: [],
        allowedRoles: []
      })

      await (wrapper.vm as any).loadSharesTask.perform({
        space,
        resource,
        includeInheritedShares: true
      })

      expect(resourcesStore.loadAncestorMetaData).toHaveBeenCalledWith(
        expect.objectContaining({ folder: resource, space })
      )
      expect(
        mocks.$clientService.graphAuthenticated.permissions.listPermissions
      ).toHaveBeenCalledWith(space.id, space.id, expect.anything(), {}, expect.anything())
    })

    describe('cache', () => {
      it('is being used in non-flat file lists', async () => {
        const resource = mock<Resource>()
        const { wrapper, mocks } = createWrapper()

        mocks.$clientService.graphAuthenticated.permissions.listPermissions.mockResolvedValue({
          shares: [],
          allowedActions: [],
          allowedRoles: []
        })

        const sharesStore = useSharesStore()
        sharesStore.collaboratorShares = [mock<CollaboratorShare>()]

        await (wrapper.vm as any).loadSharesTask.perform({ resource })

        expect(sharesStore.setCollaboratorShares).toHaveBeenCalledWith([expect.anything()])
      })
      it('is not being used in flat file lists', async () => {
        const resource = mock<Resource>()
        const { wrapper, mocks } = createWrapper({ currentRouteName: 'files-shares-with-me' })

        mocks.$clientService.graphAuthenticated.permissions.listPermissions.mockResolvedValue({
          shares: [],
          allowedActions: [],
          allowedRoles: []
        })

        const sharesStore = useSharesStore()
        sharesStore.collaboratorShares = [mock<CollaboratorShare>()]

        await (wrapper.vm as any).loadSharesTask.perform({ resource })

        expect(sharesStore.setCollaboratorShares).toHaveBeenCalledWith([])
      })
      it('is not being used on projects overview', async () => {
        const resource = mock<Resource>()
        const { wrapper, mocks } = createWrapper({ currentRouteName: 'files-spaces-projects' })

        mocks.$clientService.graphAuthenticated.permissions.listPermissions.mockResolvedValue({
          shares: [],
          allowedActions: [],
          allowedRoles: []
        })

        const sharesStore = useSharesStore()
        sharesStore.collaboratorShares = [mock<CollaboratorShare>()]

        await (wrapper.vm as any).loadSharesTask.perform({ resource })

        expect(sharesStore.setCollaboratorShares).toHaveBeenCalledWith([])
      })
    })
    describe('when loading the shares fails', () => {
      it('shows an error message and allows reloading the shares', async () => {
        const resource = mock<Resource>({ id: 'resource-id', fileId: 'resource-id' })
        const listPermissions = vi.fn().mockRejectedValue(new Error('failed'))
        const { wrapper } = createWrapper({ item: resource, listPermissions })
        await flushPromises()

        const { showErrorMessage } = useMessages()
        expect(showErrorMessage).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Failed to load shares' })
        )
        expect(useSharesStore().setLoading).toHaveBeenLastCalledWith(false)

        listPermissions.mockResolvedValue({ shares: [], allowedActions: [], allowedRoles: [] })
        ;(wrapper.vm as any).loadShares(resource)
        await flushPromises()

        expect(listPermissions).toHaveBeenCalledTimes(2)
      })
      it('does not show an error message when the loading gets cancelled', async () => {
        const resource = mock<Resource>({ id: 'resource-id', fileId: 'resource-id' })
        const listPermissions = vi.fn().mockReturnValue(new Promise(() => {}))
        const { wrapper } = createWrapper({ item: resource, listPermissions })
        await flushPromises()

        ;(wrapper.vm as any).loadShares(
          mock<Resource>({ id: 'other-resource-id', fileId: 'other-resource-id' })
        )
        await flushPromises()

        expect(listPermissions).toHaveBeenCalledTimes(2)
        const { showErrorMessage } = useMessages()
        expect(showErrorMessage).not.toHaveBeenCalled()
      })
    })
    describe('when a disabled project space is selected', () => {
      it('does not load the shares and shows no error message', async () => {
        const space = mock<SpaceResource>({
          id: 'space-id',
          fileId: 'space-id',
          driveType: 'project',
          disabled: true
        })
        const listPermissions = vi.fn().mockRejectedValue(new Error('not found'))
        createWrapper({ item: space, listPermissions })
        await flushPromises()

        expect(listPermissions).not.toHaveBeenCalled()
        const { showErrorMessage } = useMessages()
        expect(showErrorMessage).not.toHaveBeenCalled()
      })
      it('loads the shares once the space gets enabled', async () => {
        const space = mock<SpaceResource>({
          id: 'space-id',
          fileId: 'space-id',
          driveType: 'project',
          disabled: true,
          mdate: 'Mon, 02 Nov 2026 10:00:00 GMT'
        })
        const listPermissions = vi
          .fn()
          .mockResolvedValue({ shares: [], allowedActions: [], allowedRoles: [] })
        createWrapper({ item: space, listPermissions })
        await flushPromises()
        expect(listPermissions).not.toHaveBeenCalled()

        const { selectedResources } = vi.mocked(useSelectedResources)()
        selectedResources.value = [
          { ...space, disabled: false, mdate: 'Mon, 02 Nov 2026 10:05:00 GMT' } as SpaceResource
        ]
        await flushPromises()

        expect(listPermissions).toHaveBeenCalled()
      })
    })
    describe('when another client changes the shares', () => {
      const emptyPermissions = {
        shares: [] as CollaboratorShare[],
        allowedActions: [] as string[],
        allowedRoles: [] as ShareRole[]
      }
      const collaboratorShare = {
        id: 'share-id',
        role: {},
        resourceId: 'file-id'
      } as unknown as CollaboratorShare

      function setup({
        items = [mock<Resource>({ id: 'file-id', fileId: 'file-id' })],
        isOpen = true,
        listPermissions = vi.fn().mockResolvedValue(emptyPermissions)
      } = {}) {
        const { emitSseEvent, ...rest } = createWrapper({ items, isOpen, listPermissions })
        return {
          ...rest,
          listPermissions,
          queueSseEvent: emitSseEvent,
          emitSseEvent(...args: Parameters<typeof emitSseEvent>) {
            emitSseEvent(...args)
            vi.runOnlyPendingTimers()
          }
        }
      }

      beforeEach(() => {
        vi.useFakeTimers()
      })
      afterEach(() => {
        vi.useRealTimers()
      })

      it('loads the shares of the shown resource again', async () => {
        const { emitSseEvent, listPermissions } = setup()
        await flushPromises()
        expect(listPermissions).toHaveBeenCalledTimes(1)

        listPermissions.mockResolvedValue({ ...emptyPermissions, shares: [collaboratorShare] })
        emitSseEvent(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
        await flushPromises()

        expect(listPermissions).toHaveBeenCalledTimes(2)
        expect(useSharesStore().setCollaboratorShares).toHaveBeenLastCalledWith([
          expect.objectContaining({ id: 'share-id' })
        ])
      })
      it.each([
        MESSAGE_TYPE.SHARE_CREATED,
        MESSAGE_TYPE.SHARE_UPDATED,
        MESSAGE_TYPE.SHARE_REMOVED,
        MESSAGE_TYPE.LINK_CREATED,
        MESSAGE_TYPE.LINK_UPDATED,
        MESSAGE_TYPE.LINK_REMOVED
      ])('reloads the shares on %s', async (topic) => {
        const { emitSseEvent, listPermissions } = setup()
        await flushPromises()

        emitSseEvent(topic, { itemid: 'file-id', initiatorid: 'other-tab' })
        await flushPromises()

        expect(listPermissions).toHaveBeenCalledTimes(2)
      })
      it('keeps the panel content in place while reloading', async () => {
        const { emitSseEvent } = setup()
        await flushPromises()
        const { setLoading } = useSharesStore()
        vi.mocked(setLoading).mockClear()

        emitSseEvent(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
        await flushPromises()

        expect(setLoading).not.toHaveBeenCalled()
      })
      it('restarts a running load including its loading state', async () => {
        const listPermissions = vi
          .fn()
          .mockReturnValueOnce(new Promise(() => {}))
          .mockResolvedValue(emptyPermissions)
        const { emitSseEvent } = setup({ listPermissions })
        await flushPromises()
        const sharesStore = useSharesStore()
        sharesStore.loading = true

        emitSseEvent(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
        await flushPromises()

        expect(listPermissions).toHaveBeenCalledTimes(2)
        expect(sharesStore.setLoading).toHaveBeenLastCalledWith(false)
      })
      it('shows an error when a reload that replaced a running load fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const listPermissions = vi
          .fn()
          .mockReturnValueOnce(new Promise(() => {}))
          .mockRejectedValue(new Error('failed'))
        const { emitSseEvent } = setup({ listPermissions })
        await flushPromises()
        useSharesStore().loading = true

        emitSseEvent(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
        await flushPromises()

        expect(useMessages().showErrorMessage).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Failed to load shares' })
        )
      })
      it('loads the shares of a parent folder again instead of taking them from the cache', async () => {
        const { emitSseEvent, listPermissions } = setup()
        await flushPromises()
        useResourcesStore().ancestorMetaData = {
          '/parent': mock<AncestorMetaDataValue>({ id: 'parent-id', path: '/parent' })
        }
        useSharesStore().collaboratorShares = [{ ...collaboratorShare, resourceId: 'parent-id' }]
        listPermissions.mockClear()

        emitSseEvent(MESSAGE_TYPE.LINK_CREATED, { itemid: 'parent-id', initiatorid: 'other-tab' })
        await flushPromises()

        expect(listPermissions).toHaveBeenCalledWith(
          undefined,
          'parent-id',
          expect.anything(),
          {},
          expect.anything()
        )
      })
      it('loads the shares once for a burst of changes', async () => {
        const { queueSseEvent, listPermissions } = setup()
        await flushPromises()
        useResourcesStore().ancestorMetaData = {
          '/parent': mock<AncestorMetaDataValue>({ id: 'parent-id', path: '/parent' })
        }
        listPermissions.mockClear()

        queueSseEvent(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
        queueSseEvent(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
        queueSseEvent(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
        queueSseEvent(MESSAGE_TYPE.LINK_CREATED, { itemid: 'parent-id', initiatorid: 'other-tab' })
        await flushPromises()

        expect(listPermissions).not.toHaveBeenCalled()

        vi.runOnlyPendingTimers()
        await flushPromises()

        expect(listPermissions).toHaveBeenCalledTimes(2)
        expect(listPermissions).toHaveBeenCalledWith(
          undefined,
          'file-id',
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
        expect(listPermissions).toHaveBeenCalledWith(
          undefined,
          'parent-id',
          expect.anything(),
          {},
          expect.anything()
        )
      })
      it('does not reload once another resource is shown when the changes settle', async () => {
        const { queueSseEvent, listPermissions, selectedResources } = setup()
        await flushPromises()

        queueSseEvent(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
        selectedResources.value = [mock<Resource>({ id: 'other-id', fileId: 'other-id' })]
        await flushPromises()
        listPermissions.mockClear()
        vi.runOnlyPendingTimers()
        await flushPromises()

        expect(listPermissions).not.toHaveBeenCalled()
      })
      it('drops a removed share of a resource that is also a parent folder', async () => {
        const { emitSseEvent } = setup()
        await flushPromises()
        useResourcesStore().ancestorMetaData = {
          '/folder': mock<AncestorMetaDataValue>({ id: 'file-id', path: '/folder' })
        }
        const sharesStore = useSharesStore()
        sharesStore.collaboratorShares = [collaboratorShare]
        vi.mocked(sharesStore.setCollaboratorShares).mockClear()

        emitSseEvent(MESSAGE_TYPE.SHARE_REMOVED, { itemid: 'file-id', initiatorid: 'other-tab' })
        await flushPromises()

        expect(sharesStore.setCollaboratorShares).toHaveBeenCalledExactlyOnceWith([])
      })
      it('reloads the shares of a project space on an event with the server id of its root', async () => {
        const space = mock<SpaceResource>({
          id: 'storage$space',
          fileId: 'storage$space',
          driveType: 'project',
          disabled: false
        })
        const { emitSseEvent, listPermissions } = setup({ items: [space] })
        await flushPromises()

        emitSseEvent(MESSAGE_TYPE.LINK_CREATED, {
          itemid: 'storage$space!space',
          initiatorid: 'other-tab'
        })
        await flushPromises()

        expect(listPermissions).toHaveBeenCalledTimes(2)
      })
      it('reloads the shares of an item inside a project space when the space links change', async () => {
        const { emitSseEvent, listPermissions } = setup({
          items: [mock<Resource>({ id: 'storage$space!file-id', fileId: 'storage$space!file-id' })]
        })
        await flushPromises()
        useResourcesStore().ancestorMetaData = {
          '/': mock<AncestorMetaDataValue>({ id: 'storage$space', path: '/' })
        }

        emitSseEvent(MESSAGE_TYPE.LINK_CREATED, {
          itemid: 'storage$space!space',
          initiatorid: 'other-tab'
        })
        await flushPromises()

        expect(listPermissions).toHaveBeenCalledWith(
          undefined,
          'storage$space',
          expect.anything(),
          {},
          expect.anything()
        )
      })
      it('keeps the shown shares and shows no error when reloading fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const resource = mock<Resource>({ id: 'file-id', fileId: 'file-id' })
        const { wrapper, emitSseEvent, listPermissions } = setup({ items: [resource] })
        await flushPromises()
        const sharesStore = useSharesStore()
        vi.mocked(sharesStore.setCollaboratorShares).mockClear()
        listPermissions.mockRejectedValueOnce(new Error('access revoked'))

        emitSseEvent(MESSAGE_TYPE.SHARE_REMOVED, { itemid: 'file-id', initiatorid: 'other-tab' })
        await flushPromises()

        expect(useMessages().showErrorMessage).not.toHaveBeenCalled()
        expect(sharesStore.setCollaboratorShares).not.toHaveBeenCalled()

        // a regular load works again afterwards
        ;(wrapper.vm as any).loadShares(resource)
        await flushPromises()
        expect(listPermissions).toHaveBeenCalledTimes(3)
      })
      it('drops the reloaded shares once the sidebar got closed meanwhile', async () => {
        const { emitSseEvent, listPermissions } = setup()
        await flushPromises()
        let resolvePermissions: (value: typeof emptyPermissions) => void
        listPermissions.mockReturnValueOnce(
          new Promise((resolve) => {
            resolvePermissions = resolve
          })
        )
        emitSseEvent(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
        await flushPromises()

        useSideBar().isSideBarOpen = false
        await flushPromises()
        const sharesStore = useSharesStore()
        vi.mocked(sharesStore.setCollaboratorShares).mockClear()
        resolvePermissions({ ...emptyPermissions, shares: [collaboratorShare] })
        await flushPromises()

        expect(sharesStore.setCollaboratorShares).not.toHaveBeenCalled()
      })
      it.each([
        ['another item', { itemid: 'other-id', initiatorid: 'other-tab' }],
        ['this tab', { itemid: 'file-id', initiatorid: 'own-tab' }]
      ])('ignores an event of %s', async (_, data) => {
        const { emitSseEvent, listPermissions } = setup()
        await flushPromises()

        emitSseEvent(MESSAGE_TYPE.SHARE_CREATED, data)
        await flushPromises()

        expect(listPermissions).toHaveBeenCalledTimes(1)
      })
      it('ignores events while the sidebar is closed', async () => {
        const { emitSseEvent, listPermissions } = setup({ isOpen: false })
        await flushPromises()

        emitSseEvent(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
        await flushPromises()

        expect(listPermissions).not.toHaveBeenCalled()
      })
      it('ignores events while multiple resources are selected', async () => {
        const { emitSseEvent, listPermissions } = setup({
          items: [
            mock<Resource>({ id: 'file-id', fileId: 'file-id' }),
            mock<Resource>({ id: 'other-id', fileId: 'other-id' })
          ]
        })
        await flushPromises()

        emitSseEvent(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
        await flushPromises()

        expect(listPermissions).not.toHaveBeenCalled()
      })
      it('stops listening on unmount', async () => {
        const { wrapper, emitSseEvent, listPermissions } = setup()
        await flushPromises()

        wrapper.unmount()
        emitSseEvent(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
        await flushPromises()

        expect(listPermissions).toHaveBeenCalledTimes(1)
      })
    })
    describe('loadVersionsTask', () => {
      beforeEach(() => {
        canListVersionsMock.mockReturnValue(true)
      })

      it('is called with the file id when resource is selected and sidebar is opened', () => {
        const resource = mock<Resource>({
          id: 'share-jail-id',
          fileId: 'some-image',
          path: '/someImage.jpg',
          isInVault: false
        })
        const { mocks } = createWrapper({
          item: resource
        })

        expect(mocks.$clientService.webdav.listFileVersions).toHaveBeenCalledWith('some-image', {
          signal: expect.any(AbortSignal)
        })
      })

      it('is not called if resource is selected and sidebar is not opened', () => {
        const resource = mock<Resource>({
          id: 'some-image',
          path: '/someImage.jpg',
          isInVault: false
        })
        const { mocks } = createWrapper({
          item: resource,
          isOpen: false
        })

        expect(mocks.$clientService.webdav.listFileVersions).not.toHaveBeenCalled()
      })
    })
  })
})

function createWrapper({
  item = undefined,
  items = item ? [item] : [],
  isOpen = true,
  currentRouteName = 'files-spaces-generic',
  currentFolder = undefined,
  space = undefined,
  listPermissions = undefined
}: {
  item?: Resource
  items?: Resource[]
  isOpen?: boolean
  currentRouteName?: string
  currentFolder?: Resource
  space?: SpaceResource
  listPermissions?: Mock
} = {}) {
  const plugins = defaultPlugins({
    piniaOptions: {
      authState: { accessToken: 'token' },
      capabilityState: { capabilities: { core: { 'support-sse': true } as any } }
    }
  })

  const resourcesStore = useResourcesStore()
  resourcesStore.currentFolder = currentFolder

  const { requestExtensions } = useExtensionRegistry()
  vi.mocked(requestExtensions).mockReturnValue([])

  const sideBarStore = useSideBar()
  sideBarStore.isSideBarOpen = isOpen

  const useSelectedResourcesMock = mock<ReturnType<typeof useSelectedResources>>()
  useSelectedResourcesMock.selectedResources = ref(items)
  vi.mocked(useSelectedResources).mockReturnValue(useSelectedResourcesMock)

  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: currentRouteName })
  })
  if (listPermissions) {
    mocks.$clientService.graphAuthenticated.permissions.listPermissions.mockImplementation(
      listPermissions
    )
  }

  const sseListeners = new Map<string, (msg: MessageEvent) => void>()
  Object.assign(mocks.$clientService, {
    initiatorId: 'own-tab',
    sseAuthenticated: {
      addEventListener: (topic: string, listener: (msg: MessageEvent) => void) => {
        sseListeners.set(topic, listener)
      },
      removeEventListener: (topic: string) => {
        sseListeners.delete(topic)
      }
    }
  })

  return {
    mocks,
    selectedResources: useSelectedResourcesMock.selectedResources,
    emitSseEvent(topic: MESSAGE_TYPE, data: Record<string, string>) {
      sseListeners.get(topic)?.({ data: JSON.stringify(data) } as MessageEvent)
    },
    wrapper: shallowMount(FileSideBar, {
      props: {
        space
      },
      global: {
        plugins,
        renderStubDefaultSlot: true,
        stubs: {
          InnerSideBar: InnerSideBarComponent
        },
        mocks,
        provide: mocks
      }
    })
  }
}
