import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import type { RouteLocation } from 'vue-router'
import { SpaceResource } from '@opencloud-eu/web-client'
import { DriveItem, User } from '@opencloud-eu/web-client/graph/generated'
import { FolderLoaderSharedViaLink, type TaskContext } from '../../../../../src/services/folder'
import {
  useCapabilityStore,
  useConfigStore,
  useResourcesStore,
  useSharesStore,
  useSpacesStore,
  useUserStore,
  type AuthServiceInterface,
  type ExtensionRegistry
} from '../../../../../src/composables'

const link = { id: 'link', link: { '@libre.graph.displayName': 'Link' } }

describe('FolderLoaderSharedViaLink', () => {
  it('lists a link on a space root as the space', async () => {
    const space = { id: 'storage$space', name: 'Team', driveType: 'project' } as SpaceResource
    const { resources } = await loadLinks(
      [
        {
          id: 'storage$space!space',
          name: '.',
          root: {},
          parentReference: { driveId: 'storage$space', path: '.' },
          permissions: [link]
        }
      ],
      [space]
    )

    expect(resources).toHaveLength(1)
    expect(resources[0]).toMatchObject({ id: space.id, name: 'Team', driveType: 'project' })
    expect(resources[0].sharedWith).toEqual([expect.objectContaining({ id: 'link' })])
  })
  it('lists links on files and folders as they are', async () => {
    const { resources } = await loadLinks([
      {
        id: 'storage$space!file',
        name: 'file.txt',
        parentReference: { driveId: 'storage$space', path: '/' },
        permissions: [link]
      }
    ])

    expect(resources).toHaveLength(1)
    expect(resources[0]).toMatchObject({ id: 'storage$space!file', name: 'file.txt' })
  })
})

async function loadLinks(driveItems: DriveItem[], spaces: SpaceResource[] = []) {
  const mocks = defaultComponentMocks({
    currentRoute: { name: 'files-shares-via-link', query: {} } as unknown as RouteLocation
  })
  mocks.$clientService.graphAuthenticated.driveItems.listSharedByMe.mockResolvedValue(driveItems)

  let task!: ReturnType<FolderLoaderSharedViaLink['getTask']>
  let resourcesStore!: ReturnType<typeof useResourcesStore>

  getComposableWrapper(
    () => {
      resourcesStore = useResourcesStore()
      const spacesStore = useSpacesStore()
      spacesStore.spaces = spaces
      useUserStore().user = { id: 'user', displayName: 'User' } as User
      const context: TaskContext = {
        router: mocks.$router,
        clientService: mocks.$clientService,
        resourcesStore,
        spacesStore,
        sharesStore: useSharesStore(),
        configStore: useConfigStore(),
        userStore: useUserStore(),
        capabilityStore: useCapabilityStore(),
        authService: mock<AuthServiceInterface>(),
        extensionRegistry: mock<ExtensionRegistry>()
      }
      task = new FolderLoaderSharedViaLink().getTask(context)
    },
    { mocks, provide: mocks }
  )

  await task.perform(new AbortController().signal)
  const [{ resources }] = vi.mocked(resourcesStore.initResourceList).mock.calls[0]
  return { resources: resources as (SpaceResource & { sharedWith: unknown })[] }
}
