import {
  AuthStore,
  ClientService,
  ConfigStore,
  MessageStore,
  PreviewService,
  ResourcesStore,
  SharesStore,
  SpacesStore,
  useAuthStore,
  useConfigStore,
  useMessages,
  useResourcesStore,
  useSharesStore,
  useSpacesStore,
  useUserStore,
  UserStore
} from '@opencloud-eu/web-pkg'
import {
  EventSchemaType,
  onSSESpaceCreatedEvent,
  onSSESpaceDeletedEvent,
  onSSESpaceDisabledEvent,
  onSSESpaceEnabledEvent
} from '../../../../src/container/sse'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { createTestingPinia, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { mock, mockDeep } from 'vitest-mock-extended'
import { RouteLocation, Router } from 'vue-router'
import { Language } from 'vue3-gettext'
import PQueue from 'p-queue'

describe('spaces events', () => {
  describe('onSSESpaceCreatedEvent', () => {
    it('calls "upsertSpace" when space has been created', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks()
      const sseData = mock<EventSchemaType>({ spaceid: space.id })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)

      await onSSESpaceCreatedEvent({ sseData, ...mocks })

      expect(mocks.clientService.graphAuthenticated.drives.getDrive).toHaveBeenCalledWith(space.id)
      expect(mocks.spacesStore.upsertSpace).toHaveBeenCalledWith(space)
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })

    it('calls "upsertResource" when space has been created and current route equals "files-spaces-projects"', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks({ currentRouteFilesSpacesProjects: true })
      const sseData = mock<EventSchemaType>({ spaceid: space.id })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)

      await onSSESpaceCreatedEvent({ sseData, ...mocks })

      expect(mocks.clientService.graphAuthenticated.drives.getDrive).toHaveBeenCalledWith(space.id)
      expect(mocks.spacesStore.upsertSpace).toHaveBeenCalledWith(space)
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalledWith(space)
    })

    it('does not trigger any action when initiator ids are identical', async () => {
      const mocks = getMocks()
      const sseData = mock<EventSchemaType>({
        spaceid: 'space1',
        initiatorid: 'local1'
      })

      await onSSESpaceCreatedEvent({ sseData, ...mocks })

      expect(mocks.clientService.graphAuthenticated.drives.getDrive).not.toHaveBeenCalled()
      expect(mocks.spacesStore.upsertSpace).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
  })

  describe('onSSESpaceEnabledEvent', () => {
    it('calls "upsertSpace" and reloads the graph permissions when space has been enabled', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks()
      const sseData = mock<EventSchemaType>({ spaceid: space.id })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)

      await onSSESpaceEnabledEvent({ sseData, ...mocks })

      expect(mocks.clientService.graphAuthenticated.drives.getDrive).toHaveBeenCalledWith(space.id)
      expect(mocks.spacesStore.upsertSpace).toHaveBeenCalledWith(space)
      expect(mocks.spacesStore.loadGraphPermissions).toHaveBeenCalledWith({
        ids: [space.id],
        graphClient: mocks.clientService.graphAuthenticated,
        useCache: false
      })
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })

    it('calls "upsertResource" when space has been enabled and current route equals "files-spaces-projects"', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks({ currentRouteFilesSpacesProjects: true })
      const sseData = mock<EventSchemaType>({ spaceid: space.id })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)

      await onSSESpaceEnabledEvent({ sseData, ...mocks })

      expect(mocks.clientService.graphAuthenticated.drives.getDrive).toHaveBeenCalledWith(space.id)
      expect(mocks.spacesStore.upsertSpace).toHaveBeenCalledWith(space)
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalledWith(space)
    })

    it('does not trigger any action when initiator ids are identical', async () => {
      const mocks = getMocks()
      const sseData = mock<EventSchemaType>({
        spaceid: 'space1',
        initiatorid: 'local1'
      })

      await onSSESpaceEnabledEvent({ sseData, ...mocks })

      expect(mocks.clientService.graphAuthenticated.drives.getDrive).not.toHaveBeenCalled()
      expect(mocks.spacesStore.upsertSpace).not.toHaveBeenCalled()
      expect(mocks.spacesStore.loadGraphPermissions).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
  })

  describe('onSSESpaceDisabledEvent', () => {
    it('calls "upsertSpace" and reloads the graph permissions when space has been disabled', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks()
      const sseData = mock<EventSchemaType>({ spaceid: space.id })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)

      await onSSESpaceDisabledEvent({ sseData, ...mocks })

      expect(mocks.clientService.graphAuthenticated.drives.getDrive).toHaveBeenCalledWith(space.id)
      expect(mocks.spacesStore.upsertSpace).toHaveBeenCalledWith(space)
      expect(mocks.spacesStore.loadGraphPermissions).toHaveBeenCalledWith({
        ids: [space.id],
        graphClient: mocks.clientService.graphAuthenticated,
        useCache: false
      })
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })

    it('calls "upsertResource" when space has been disabled and current route equals "files-spaces-projects"', async () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks({ currentRouteFilesSpacesProjects: true })
      const sseData = mock<EventSchemaType>({ spaceid: space.id })
      mocks.clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(space)

      await onSSESpaceDisabledEvent({ sseData, ...mocks })

      expect(mocks.clientService.graphAuthenticated.drives.getDrive).toHaveBeenCalledWith(space.id)
      expect(mocks.spacesStore.upsertSpace).toHaveBeenCalledWith(space)
      expect(mocks.resourcesStore.upsertResource).toHaveBeenCalledWith(space)
    })

    it('does not trigger any action when initiator ids are identical', async () => {
      const mocks = getMocks()
      const sseData = mock<EventSchemaType>({
        spaceid: 'space1',
        initiatorid: 'local1'
      })

      await onSSESpaceDisabledEvent({ sseData, ...mocks })

      expect(mocks.clientService.graphAuthenticated.drives.getDrive).not.toHaveBeenCalled()
      expect(mocks.spacesStore.upsertSpace).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.upsertResource).not.toHaveBeenCalled()
    })
  })

  describe('onSSESpaceDeletedEvent', () => {
    it('calls "removeSpace" when space has been deleted', () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks({ spaces: [space] })
      const sseData = mock<EventSchemaType>({ spaceid: space.id })
      ;(mocks.spacesStore.getSpace as any).mockReturnValue(space)

      onSSESpaceDeletedEvent({ sseData, ...mocks })

      expect(mocks.spacesStore.removeSpace).toHaveBeenCalledWith(space)
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })

    it('calls "removeResources" when space has been deleted and current route equals "files-spaces-projects"', () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks({ spaces: [space], currentRouteFilesSpacesProjects: true })
      const sseData = mock<EventSchemaType>({ spaceid: space.id })
      ;(mocks.spacesStore.getSpace as any).mockReturnValue(space)

      onSSESpaceDeletedEvent({ sseData, ...mocks })

      expect(mocks.spacesStore.removeSpace).toHaveBeenCalledWith(space)
      expect(mocks.resourcesStore.removeResources).toHaveBeenCalledWith([space])
    })

    it('does not trigger any action when space does not exist', () => {
      const mocks = getMocks({ spaces: [] })
      const sseData = mock<EventSchemaType>({ spaceid: 'space1' })

      onSSESpaceDeletedEvent({ sseData, ...mocks })

      expect(mocks.spacesStore.removeSpace).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })

    it('does not trigger any action when initiator ids are identical', () => {
      const space = mock<SpaceResource>({ id: 'space1' })
      const mocks = getMocks({ spaces: [space] })
      const sseData = mock<EventSchemaType>({
        spaceid: space.id,
        initiatorid: 'local1'
      })

      onSSESpaceDeletedEvent({ sseData, ...mocks })

      expect(mocks.spacesStore.removeSpace).not.toHaveBeenCalled()
      expect(mocks.resourcesStore.removeResources).not.toHaveBeenCalled()
    })
  })
})

function getMocks({
  currentFolder = mockDeep<Resource>({
    id: 'currenFolder!currentFolder',
    isFolder: true,
    storageId: 'space1'
  }),
  resources = [],
  spaces = [mockDeep<SpaceResource>({ id: 'space1' })],
  currentRouteFilesSpacesProjects = false
}: {
  currentFolder?: Resource
  resources?: Resource[]
  spaces?: SpaceResource[]
  currentRouteFilesSpacesProjects?: boolean
} = {}) {
  createTestingPinia()

  const resourcesStore = useResourcesStore()
  resourcesStore.currentFolder = currentFolder
  resourcesStore.resources = resources

  const spacesStore = useSpacesStore()
  spacesStore.spaces = spaces

  const messageStore = useMessages()
  const userStore = useUserStore()
  const configStore = useConfigStore()
  const authStore = useAuthStore()
  const sharesStore = useSharesStore()
  const clientService = mockDeep<ClientService>({ initiatorId: 'local1' })
  const previewService = mockDeep<PreviewService>()
  const language = mockDeep<Language>({ $gettext: vi.fn((m) => m) })
  const resourceQueue = mockDeep<PQueue>()

  const currentRoute = mock<RouteLocation>({
    name: currentRouteFilesSpacesProjects ? 'files-spaces-projects' : 'files-spaces-generic'
  })
  const { $router: router } = defaultComponentMocks({ currentRoute })

  return {
    resourcesStore: resourcesStore as ResourcesStore,
    spacesStore: spacesStore as SpacesStore,
    router: router as Router,
    messageStore: messageStore as MessageStore,
    userStore: userStore as UserStore,
    sharesStore: sharesStore as SharesStore,
    configStore: configStore as ConfigStore,
    authStore: authStore as AuthStore,
    clientService,
    previewService,
    resourceQueue,
    language
  }
}
