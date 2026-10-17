import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation,
  useGetMatchingSpaceMock
} from '@opencloud-eu/web-test-helpers'
import { useFileActionsMove } from '../../../../../src/composables/actions/files'
import {
  ResourceTransfer,
  TransferType,
  useGetMatchingSpace,
  useMessages,
  useModals,
  usePasteWorker,
  useResourcesStore
} from '@opencloud-eu/web-pkg'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  usePasteWorker: vi.fn(),
  useGetMatchingSpace: vi.fn(),
  ResourceTransfer: vi.fn()
}))

type StartWorker = ReturnType<typeof usePasteWorker>['startWorker']
type WorkerCallback = (result: Parameters<Parameters<StartWorker>[1]>[0]) => Promise<void>

describe('useFileActionsMove', () => {
  describe('computed property "actions"', () => {
    describe('handler', () => {
      it('opens the location picker modal', () => {
        getWrapper({
          setup: ({ actions }) => {
            const { dispatchModal } = useModals()
            unref(actions)[0].handler({
              space: mock<SpaceResource>(),
              resources: [getResource({ id: '1', storageId: 'space-1' })]
            })
            expect(dispatchModal).toHaveBeenCalled()
          }
        })
      })

      it('shows warning if selected resources are already in destination', () => {
        getWrapper({
          setup: ({ actions }) => {
            const { dispatchModal } = useModals()
            const { showMessage } = useMessages()
            unref(actions)[0].handler({
              space: mock<SpaceResource>(),
              resources: [getResource({ id: '1', storageId: 'space-1' })]
            })

            const dispatchModalCall = vi.mocked(dispatchModal).mock.calls[0][0]
            const callbackFn = dispatchModalCall.customComponentAttrs().callbackFn as (
              resources: Resource[]
            ) => Promise<void>
            void callbackFn([
              getResource({ id: 'target-folder', path: '/source', storageId: 'space-1' })
            ])

            expect(showMessage).toHaveBeenCalledWith(
              expect.objectContaining({
                title: 'You cannot move resources into the same folder.'
              })
            )
          }
        })
      })
    })

    describe('worker callback', () => {
      it('navigates to the new location when the current folder is moved', async () => {
        const currentFolder = getResource({ id: 'cf-1', fileId: 'cf-1', path: '/source' })
        const { mocks, space, workerCallback } = await moveResources({
          currentFolder,
          transferType: TransferType.MOVE
        })

        await workerCallback({
          successful: [{ ...currentFolder, path: '/target/source' }],
          failed: []
        })

        expect(space.getDriveAliasAndItem).toHaveBeenCalledWith({ path: '/target/source' })
        expect(mocks.$router.push).toHaveBeenCalledWith({
          params: { driveAliasAndItem: 'personal/target/source' },
          query: { fileId: 'cf-1' }
        })
      })

      it('navigates to the new location when the current folder is moved to a project space root', async () => {
        const currentFolder = getResource({ id: 'cf-1', fileId: 'cf-1', path: '/parent/source' })
        // the location picker posts its target as plain JSON, so a space root arrives without methods
        const targetFolder = { id: 'space-1', driveType: 'project', path: '/' } as SpaceResource
        const { mocks, workerCallback } = await moveResources({
          currentFolder,
          targetFolder,
          transferType: TransferType.MOVE
        })

        await workerCallback({ successful: [{ ...currentFolder, path: '/source' }], failed: [] })

        expect(mocks.$router.push).toHaveBeenCalledWith({
          params: { driveAliasAndItem: 'personal/source' },
          query: { fileId: 'cf-1' }
        })
      })

      it('removes moved resources from the view if the current folder was not moved', async () => {
        const resource = getResource({ id: '1', path: '/source/folder-1' })
        const { mocks, workerCallback } = await moveResources({
          resources: [resource],
          transferType: TransferType.MOVE
        })

        await workerCallback({ successful: [resource], failed: [] })

        const { removeResources } = useResourcesStore()
        expect(removeResources).toHaveBeenCalledWith([resource])
        expect(mocks.$router.push).not.toHaveBeenCalled()
      })

      it('does not navigate when the current folder is copied into another space', async () => {
        const currentFolder = getResource({ id: 'cf-1', fileId: 'cf-1', path: '/source' })
        const { mocks, workerCallback } = await moveResources({
          currentFolder,
          transferType: TransferType.COPY
        })

        await workerCallback({ successful: [{ ...currentFolder, path: '/source' }], failed: [] })

        expect(mocks.$router.push).not.toHaveBeenCalled()
      })
    })

    describe('isVisible', () => {
      it('returns true for movable resources', () => {
        getWrapper({
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>(),
                resources: [getResource({ id: '1', storageId: 'space-1' })]
              })
            ).toBeTruthy()
          }
        })
      })

      it('returns false if the resource is locked', () => {
        getWrapper({
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>(),
                resources: [getResource({ id: '1', locked: true, storageId: 'space-1' })]
              })
            ).toBeFalsy()
          }
        })
      })
      it('returns false for trashed resources', () => {
        getWrapper({
          setup: ({ actions }) => {
            const resource = { ...getResource({ id: '1' }), ddate: '2026-01-01' } as Resource
            expect(
              unref(actions)[0].isVisible({ space: mock<SpaceResource>(), resources: [resource] })
            ).toBeFalsy()
          }
        })
      })
      it('returns false for share list entries', () => {
        getWrapper({
          currentFolder: null,
          setup: ({ actions }) => {
            const resource = { ...getResource({ id: '1' }), sharedWith: [] } as Resource
            expect(
              unref(actions)[0].isVisible({ space: mock<SpaceResource>(), resources: [resource] })
            ).toBeFalsy()
          }
        })
      })
      it('returns true for a share root browsed inside its space', () => {
        getWrapper({
          setup: ({ actions }) => {
            const resource = { ...getResource({ id: '1' }), sharedWith: [] } as Resource
            expect(
              unref(actions)[0].isVisible({ space: mock<SpaceResource>(), resources: [resource] })
            ).toBeTruthy()
          }
        })
      })
      it('returns false in search context when resources contain a project space', () => {
        getWrapper({
          searchLocation: true,
          setup: ({ actions }) => {
            const projectSpace = {
              ...getResource({ id: '1', storageId: 'space-1' }),
              type: 'space',
              driveType: 'project'
            } as Resource
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>(),
                resources: [projectSpace]
              })
            ).toBeFalsy()
          }
        })
      })
    })
  })
})

function getResource(resource: Partial<Resource>): Resource {
  return {
    ...mock<Resource>({
      path: '/source/folder-1',
      canBeDeleted: () => true,
      isReceivedShare: () => false,
      isMounted: () => false
    }),
    ...resource
  }
}

async function moveResources({
  currentFolder = mock<Resource>({ id: 'cf-1', path: '/source' }),
  resources = [currentFolder],
  targetFolder = getResource({ id: 'target', path: '/target' }),
  transferType
}: {
  currentFolder?: Resource
  resources?: Resource[]
  targetFolder?: Resource
  transferType: TransferType
}) {
  let workerCallback: WorkerCallback
  const startWorker = vi.fn<StartWorker>((_, callback) => {
    workerCallback = callback as WorkerCallback
  })
  vi.mocked(ResourceTransfer).mockImplementation(
    class {
      getTransferData = vi.fn().mockResolvedValue([{ transferType }])
      showResultMessage = vi.fn()
    } as unknown as typeof ResourceTransfer
  )

  let callbackFn: (resources: Resource[]) => Promise<void>
  const { mocks, space } = getWrapper({
    currentFolder,
    startWorker,
    setup: ({ actions }) => {
      const { dispatchModal } = useModals()
      unref(actions)[0].handler({ space: mock<SpaceResource>(), resources })
      callbackFn = vi.mocked(dispatchModal).mock.calls[0][0].customComponentAttrs()
        .callbackFn as typeof callbackFn
    }
  })

  await callbackFn([targetFolder])
  expect(startWorker).toHaveBeenCalled()

  return { mocks, space, workerCallback }
}

function getWrapper({
  currentFolder = mock<Resource>({ id: 'cf-1', path: '/source' }),
  searchLocation = false,
  startWorker = vi.fn(),
  setup
}: {
  currentFolder?: Resource
  searchLocation?: boolean
  startWorker?: StartWorker
  setup: (instance: ReturnType<typeof useFileActionsMove>) => Promise<void> | void
}) {
  const routeName = searchLocation ? 'files-common-search' : 'files-spaces-generic'

  const space = mock<SpaceResource>({ id: 'space-1' })
  space.getDriveAliasAndItem.mockImplementation(({ path }) => `personal${path}`)
  vi.mocked(useGetMatchingSpace).mockImplementation(() =>
    useGetMatchingSpaceMock({ getMatchingSpace: () => space })
  )
  vi.mocked(usePasteWorker).mockReturnValue({ startWorker })

  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: routeName })
    })
  }

  return {
    mocks,
    space,
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsMove()
        setup(instance)
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: {
          piniaOptions: {
            spacesState: { spaces: [mock<SpaceResource>({ id: 'space-1' })] },
            resourcesStore: { currentFolder }
          }
        }
      }
    )
  }
}
