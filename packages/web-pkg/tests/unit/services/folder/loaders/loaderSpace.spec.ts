import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { FolderLoaderSpace, type TaskContext } from '../../../../../src/services/folder'
import {
  useCapabilityStore,
  useConfigStore,
  useResourcesStore,
  useSharesStore,
  useSpacesStore,
  useUserStore,
  type AuthServiceInterface
} from '../../../../../src/composables'

describe('FolderLoaderSpace', () => {
  describe('share space', () => {
    it('sets the share space as remote item on the current folder and its children', async () => {
      const space = {
        id: 'share-space-id',
        driveType: 'share',
        graphPermissions: [],
        getDriveAliasAndItem: () => 'share/f1/k2'
      } as unknown as SpaceResource

      const { resourcesStore } = await loadFolder({ space, path: '/k2' })

      expect(resourcesStore.initResourceList).toHaveBeenCalledWith({
        currentFolder: expect.objectContaining({ id: 'k2', remoteItemId: 'share-space-id' }),
        resources: [expect.objectContaining({ id: 'j1', remoteItemId: 'share-space-id' })]
      })
    })
  })

  it('leaves the remote item unset outside of share spaces', async () => {
    const space = {
      id: 'personal-space-id',
      driveType: 'personal',
      getDriveAliasAndItem: () => 'personal/admin/k2'
    } as unknown as SpaceResource

    const { resourcesStore } = await loadFolder({ space, path: '/k2' })

    const { currentFolder } = vi.mocked(resourcesStore.initResourceList).mock.calls[0][0]
    expect(currentFolder.remoteItemId).toBeUndefined()
  })
})

async function loadFolder({ space, path }: { space: SpaceResource; path: string }) {
  const mocks = defaultComponentMocks()
  mocks.$clientService.webdav.listFiles.mockResolvedValue({
    resource: { id: 'k2', path: '/k2' } as Resource,
    children: [{ id: 'j1', path: '/k2/j1' } as Resource]
  })

  let resourcesStore!: ReturnType<typeof useResourcesStore>
  let task!: ReturnType<FolderLoaderSpace['getTask']>

  getComposableWrapper(
    () => {
      resourcesStore = useResourcesStore()
      const context: TaskContext = {
        router: mocks.$router,
        clientService: mocks.$clientService,
        resourcesStore,
        spacesStore: useSpacesStore(),
        sharesStore: useSharesStore(),
        configStore: useConfigStore(),
        userStore: useUserStore(),
        capabilityStore: useCapabilityStore(),
        authService: mock<AuthServiceInterface>()
      }
      task = new FolderLoaderSpace().getTask(context)
    },
    { mocks, provide: mocks }
  )

  // the folder service passes its own abort signal as first argument
  await task.perform(new AbortController().signal, space, path)

  return { resourcesStore }
}
