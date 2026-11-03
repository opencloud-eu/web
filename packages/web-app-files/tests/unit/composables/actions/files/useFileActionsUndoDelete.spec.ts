import {
  FileAction,
  CapabilityStore,
  VaultEngine,
  resolveVaultEngine,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import {
  useFileActionsRestore,
  useFileActionsUndoDelete
} from '../../../../../src/composables/actions'
import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { computed, unref } from 'vue'
import { Resource, SearchResource, SpaceResource } from '@opencloud-eu/web-client'
import { RouteLocation } from 'vue-router'

vi.mock('../../../../../src/composables/actions/files/useFileActionsRestore')
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  resolveVaultEngine: vi.fn()
}))

describe('undoDelete', () => {
  beforeEach(() => {
    vi.mocked(resolveVaultEngine).mockResolvedValue(null)
  })

  describe('isVisible', () => {
    it.each(['project', 'personal'])(
      'is true for %s spaces if trash bins are enabled via capabilities',
      (driveType) => {
        getWrapper({
          setup: ({ actions }) => {
            const space = mock<SpaceResource>({ driveType })
            const resources = [mock<Resource>({ id: '1' })]
            const isVisible = unref(actions)[0].isVisible({ space, resources })

            expect(isVisible).toBeTruthy()
          }
        })
      }
    )
    it('is false when trash bins are disabled via capabilities', () => {
      getWrapper({
        setup: ({ actions }) => {
          const space = mock<SpaceResource>({ driveType: 'project' })
          const resources = [mock<Resource>({ id: '1' })]
          const isVisible = unref(actions)[0].isVisible({ space, resources })

          expect(isVisible).toBeFalsy()
        },
        trashBinEnabled: false
      })
    })
    it.each(['share', 'public'])('is false for %s spaces', (driveType) => {
      getWrapper({
        setup: ({ actions }) => {
          const space = mock<SpaceResource>({ driveType })
          const resources = [mock<Resource>({ id: '1' })]
          const isVisible = unref(actions)[0].isVisible({ space, resources })

          expect(isVisible).toBeFalsy()
        }
      })
    })
  })
  describe('handler', () => {
    it('calls the restore file action and transforms the ids before', () => {
      getWrapper({
        setup: async ({ actions }, { restoreHandlerMock }) => {
          const space = mock<SpaceResource>()
          const callback = vi.fn()
          const resources = [{ id: '1$2!3' } as Resource]
          await unref(actions)[0].handler({ space, resources, callback })

          expect(restoreHandlerMock).toHaveBeenCalledWith({ space, resources: [{ id: '3' }] })
          expect(callback).toHaveBeenCalled()
        }
      })
    })
    it('decrypts the vault paths if the vault is unlocked', () => {
      getWrapper({
        setup: async ({ actions }, { restoreHandlerMock }) => {
          vi.mocked(resolveVaultEngine).mockResolvedValue(
            mock<VaultEngine>({
              vaultRoot: '/my.vault',
              decryptPath: (path) => Promise.resolve(path === 'enc' ? 'file.txt' : path)
            })
          )
          const space = mock<SpaceResource>()
          const resources = [{ id: '1$2!3', name: 'file.txt', path: '/my.vault/enc' } as Resource]
          await unref(actions)[0].handler({ space, resources, callback: vi.fn() })

          expect(restoreHandlerMock).toHaveBeenCalledWith({
            space,
            resources: [{ id: '3', name: 'file.txt', path: '/my.vault/file.txt' }]
          })
        }
      })
    })
    it('keeps the encrypted vault paths if the vault is locked', () => {
      getWrapper({
        setup: async ({ actions }, { restoreHandlerMock }) => {
          const space = mock<SpaceResource>()
          const resources = [{ id: '1$2!3', name: 'file.txt', path: '/my.vault/enc' } as Resource]
          await unref(actions)[0].handler({ space, resources, callback: vi.fn() })

          expect(restoreHandlerMock).toHaveBeenCalledWith({
            space,
            resources: [{ id: '3', name: 'file.txt', path: '/my.vault/enc' }]
          })
        }
      })
    })
  })
  describe('restore complete on the search results page', () => {
    it('adds the restored resources back by id, keeping same paths from other spaces', async () => {
      const otherSpaceFile = { id: 'other$space!1', path: '/file.txt' } as Resource
      const { mocks } = getWrapper({
        currentRouteName: 'files-common-search',
        stubActions: false,
        resources: [otherSpaceFile],
        setup: vi.fn()
      })
      const restoredResource = { id: '1$2!3', path: '/file.txt' } as Resource
      mocks.$clientService.webdav.getFileInfo.mockResolvedValue(restoredResource)
      const space = mock<SpaceResource>()
      const resources = [{ id: '3', path: '/file.txt', highlights: 'snippet' } as SearchResource]

      const { onRestoreComplete } = vi.mocked(useFileActionsRestore).mock.lastCall[0]
      await onRestoreComplete({ space, resources })

      expect(mocks.$clientService.webdav.getFileInfo).toHaveBeenCalledWith(space, {
        path: '/file.txt'
      })
      const resourcesStore = useResourcesStore()
      expect(resourcesStore.resources).toEqual([
        otherSpaceFile,
        { ...restoredResource, highlights: 'snippet' }
      ])
    })
    it('skips resources that could not be fetched', async () => {
      const { mocks } = getWrapper({ currentRouteName: 'files-common-search', setup: vi.fn() })
      const restoredResource = { id: '1$2!4', path: '/b.txt' } as Resource
      mocks.$clientService.webdav.getFileInfo.mockImplementation((_, { path }) =>
        path === '/a.txt' ? Promise.reject(new Error()) : Promise.resolve(restoredResource)
      )
      const resources = [
        { id: '3', path: '/a.txt', highlights: '' },
        { id: '4', path: '/b.txt', highlights: '' }
      ] as SearchResource[]

      const { onRestoreComplete } = vi.mocked(useFileActionsRestore).mock.lastCall[0]
      await onRestoreComplete({ space: mock<SpaceResource>(), resources })

      const { upsertResource } = useResourcesStore()
      expect(upsertResource).toHaveBeenCalledTimes(1)
      expect(upsertResource).toHaveBeenCalledWith(restoredResource)
    })
    it('does not add resources that were not deleted from the search results', async () => {
      const { mocks } = getWrapper({ currentRouteName: 'files-common-search', setup: vi.fn() })
      const resources = [{ id: '3', path: '/a.txt' } as Resource]

      const { onRestoreComplete } = vi.mocked(useFileActionsRestore).mock.lastCall[0]
      await onRestoreComplete({ space: mock<SpaceResource>(), resources })

      expect(mocks.$clientService.webdav.getFileInfo).not.toHaveBeenCalled()
      const { upsertResource } = useResourcesStore()
      expect(upsertResource).not.toHaveBeenCalled()
    })
  })
})

function getWrapper({
  trashBinEnabled = true,
  currentRouteName = '',
  stubActions = true,
  resources = [],
  setup
}: {
  trashBinEnabled?: boolean
  currentRouteName?: string
  stubActions?: boolean
  resources?: Resource[]
  setup: (
    instance: ReturnType<typeof useFileActionsUndoDelete>,
    mocks: {
      restoreHandlerMock: FileAction['handler']
    }
  ) => void
}) {
  const restoreHandlerMock = vi.fn()
  const useFileActionsRestoreMock = mock<ReturnType<typeof useFileActionsRestore>>()
  useFileActionsRestoreMock.actions = computed(() => [
    mock<FileAction>({ handler: restoreHandlerMock })
  ])
  vi.mocked(useFileActionsRestore).mockReturnValue(useFileActionsRestoreMock)

  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: currentRouteName })
  })
  const capabilities = {
    dav: { trashbin: trashBinEnabled ? '1.0' : undefined }
  } satisfies Partial<CapabilityStore['capabilities']>

  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsUndoDelete()
        setup(instance, {
          restoreHandlerMock
        })
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: {
          piniaOptions: {
            stubActions,
            capabilityState: { capabilities },
            resourcesStore: { resources }
          }
        }
      }
    )
  }
}
