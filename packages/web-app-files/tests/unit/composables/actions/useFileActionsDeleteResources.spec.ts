import { useFileActionsDeleteResources } from '../../../../src/composables/actions/useFileActionsDeleteResources'
import { useFileActionsUndoDelete } from '../../../../src/composables/actions/files/useFileActionsUndoDelete'
import { mock, mockDeep } from 'vitest-mock-extended'
import { FolderResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  getComposableWrapper,
  useGetMatchingSpaceMock
} from '@opencloud-eu/web-test-helpers'
import {
  Action,
  useDeleteWorker,
  useGetMatchingSpace,
  useModals,
  useResourcesStore,
  useMessages,
  eventBus
} from '@opencloud-eu/web-pkg'
import { computed } from 'vue'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useDeleteWorker: vi.fn(),
  useGetMatchingSpace: vi.fn()
}))
vi.mock('../../../../src/composables/actions/files/useFileActionsUndoDelete')

const undoHandler = vi.fn()

const currentFolder = {
  id: '1',
  path: '/folder'
}

describe('deleteResources', () => {
  describe('method "displayDialog"', () => {
    it('shows a cancel action in the confirmation', () => {
      getWrapper({
        currentFolder,
        setup: ({ displayDialog }, { space }) => {
          displayDialog(space, [{ id: '2', type: 'file', name: 'file.txt' } as Resource])

          const { dispatchModal } = useModals()
          expect(dispatchModal).toHaveBeenCalledWith(
            expect.objectContaining({ showCancelAction: true })
          )
        }
      })
    })
  })
  describe('method "filesList_delete"', () => {
    it('should call the delete action on a resource in the file list', () => {
      const filesToDelete = [{ id: '2', path: '/folder/fileToDelete.txt' }]

      getWrapper({
        currentFolder,
        result: filesToDelete,
        setup: ({ filesList_delete }, { router }) => {
          filesList_delete(filesToDelete)

          expect(router.push).toHaveBeenCalledTimes(0)
        }
      })
    })

    it('should call the delete action on the current folder', async () => {
      const resourcesToDelete = [currentFolder]
      let pending: ReturnType<ReturnType<typeof useFileActionsDeleteResources>['filesList_delete']>
      let routerRef: ReturnType<typeof defaultComponentMocks>['$router']
      getWrapper({
        currentFolder,
        setup: ({ filesList_delete }, { router }) => {
          pending = filesList_delete(resourcesToDelete)
          routerRef = router
        }
      })
      await Promise.all(pending)
      expect(routerRef.push).toHaveBeenCalledTimes(1)
    })

    it('should push resources into delete queue', () => {
      const filesToDelete = [{ id: '2', path: '/folder/fileToDelete.txt' }]
      getWrapper({
        currentFolder,
        result: filesToDelete,
        setup: ({ filesList_delete }) => {
          filesList_delete(filesToDelete)
        }
      })

      const { addResourcesIntoDeleteQueue } = useResourcesStore()
      expect(addResourcesIntoDeleteQueue).toHaveBeenCalledWith(['2'])
    })

    it('should publish event "runtime.resource.deleted"', async () => {
      const filesToDelete = [{ id: '2', path: '/folder/fileToDelete.txt' }]
      const spyBus = vi.spyOn(eventBus, 'publish')

      let pending: ReturnType<ReturnType<typeof useFileActionsDeleteResources>['filesList_delete']>
      getWrapper({
        currentFolder,
        result: filesToDelete,
        setup: ({ filesList_delete }) => {
          pending = filesList_delete(filesToDelete)
        }
      })

      await Promise.all(pending)

      const { addResourcesIntoDeleteQueue } = useResourcesStore()
      expect(addResourcesIntoDeleteQueue).toHaveBeenCalledWith(['2'])
      expect(spyBus).toHaveBeenCalledWith('runtime.resource.deleted', filesToDelete)
    })

    describe('undo via Ctrl+Z', () => {
      const fileA = mock<Resource>({ id: 'a', path: '/folder/a.txt', storageId: 'space-1' })
      const fileB = mock<Resource>({ id: 'b', path: '/folder/b.txt', storageId: 'space-1' })

      beforeEach(() => {
        undoHandler.mockReset()
        vi.useFakeTimers()
      })
      afterEach(() => {
        vi.useRealTimers()
      })

      function pressCtrlZ() {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
      }

      async function deleteResources(
        resources: Resource[],
        {
          undoAvailable = true,
          finishedWorkers,
          result = resources
        }: { undoAvailable?: boolean; finishedWorkers?: (() => void)[]; result?: Resource[] } = {}
      ) {
        let pending: ReturnType<
          ReturnType<typeof useFileActionsDeleteResources>['filesList_delete']
        >
        let showMessage: ReturnType<typeof useMessages>['showMessage']
        getWrapper({
          currentFolder,
          result,
          undoAvailable,
          finishedWorkers,
          setup: ({ filesList_delete }) => {
            showMessage = useMessages().showMessage
            pending = filesList_delete(resources)
          }
        })
        await Promise.all(pending)
        const undoCallbacks = vi
          .mocked(showMessage)
          .mock.calls.map(([{ actionOptions }]) => actionOptions.callback as () => void)
        return { undoCallbacks, showMessage }
      }

      it('restores the cleartext resources when the worker reports encrypted vault paths', async () => {
        const encryptedFileA = { ...fileA, path: '/folder/l8pb6a0kl5f3c3h0u9hntntjso' } as Resource
        const spyBus = vi.spyOn(eventBus, 'publish')
        const { showMessage } = await deleteResources([fileA], { result: [encryptedFileA] })

        expect(showMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            actionOptions: expect.objectContaining({ resources: [fileA] })
          })
        )
        expect(spyBus).toHaveBeenCalledWith('runtime.resource.deleted', [fileA])

        pressCtrlZ()

        expect(undoHandler).toHaveBeenCalledWith(expect.objectContaining({ resources: [fileA] }))
      })

      it('only restores the latest deletion', async () => {
        await deleteResources([fileA])
        await deleteResources([fileB])

        pressCtrlZ()

        expect(undoHandler).toHaveBeenCalledTimes(1)
        expect(undoHandler).toHaveBeenCalledWith(expect.objectContaining({ resources: [fileB] }))
      })

      it('restores all spaces of the latest deletion', async () => {
        const fileC = mock<Resource>({ id: 'c', path: '/c.txt', storageId: 'space-2' })
        await deleteResources([fileA])
        await deleteResources([fileB, fileC])

        pressCtrlZ()

        expect(undoHandler).toHaveBeenCalledTimes(2)
        expect(undoHandler).not.toHaveBeenCalledWith(
          expect.objectContaining({ resources: [fileA] })
        )
      })

      it('does not restore an earlier deletion if the latest one can not be undone', async () => {
        await deleteResources([fileA])
        await deleteResources([fileB], { undoAvailable: false })

        pressCtrlZ()

        expect(undoHandler).not.toHaveBeenCalled()
      })

      it('keeps the undo of the latest deletion when the toast of an earlier one times out', async () => {
        await deleteResources([fileA])
        vi.advanceTimersByTime(4000)
        await deleteResources([fileB])
        vi.advanceTimersByTime(4000)

        pressCtrlZ()

        expect(undoHandler).toHaveBeenCalledTimes(1)
        expect(undoHandler).toHaveBeenCalledWith(expect.objectContaining({ resources: [fileB] }))
      })

      it('keeps the undo of the latest deletion when the earlier one is undone via its toast', async () => {
        const { undoCallbacks } = await deleteResources([fileA])
        await deleteResources([fileB])
        undoCallbacks[0]()

        pressCtrlZ()

        expect(undoHandler).toHaveBeenCalledTimes(1)
        expect(undoHandler).toHaveBeenCalledWith(expect.objectContaining({ resources: [fileB] }))
      })

      it('only restores the latest deletion if it finishes before an earlier one', async () => {
        const finishedWorkersA: (() => void)[] = []
        const finishedWorkersB: (() => void)[] = []
        await deleteResources([fileA], { finishedWorkers: finishedWorkersA })
        await deleteResources([fileB], { finishedWorkers: finishedWorkersB })
        finishedWorkersB.forEach((finish) => finish())
        finishedWorkersA.forEach((finish) => finish())

        pressCtrlZ()

        expect(undoHandler).toHaveBeenCalledTimes(1)
        expect(undoHandler).toHaveBeenCalledWith(expect.objectContaining({ resources: [fileB] }))
      })

      it('only restores the latest deletion if an earlier one in several spaces finishes around it', async () => {
        const fileC = mock<Resource>({ id: 'c', path: '/c.txt', storageId: 'space-2' })
        const finishedWorkersA: (() => void)[] = []
        const finishedWorkersB: (() => void)[] = []
        await deleteResources([fileA, fileC], { finishedWorkers: finishedWorkersA })
        await deleteResources([fileB], { finishedWorkers: finishedWorkersB })
        finishedWorkersA[0]()
        finishedWorkersB.forEach((finish) => finish())
        finishedWorkersA[1]()

        pressCtrlZ()

        expect(undoHandler).toHaveBeenCalledTimes(1)
        expect(undoHandler).toHaveBeenCalledWith(expect.objectContaining({ resources: [fileB] }))
      })

      it('removes the undo shortcut after the toast timed out', async () => {
        await deleteResources([fileA])
        vi.advanceTimersByTime(7000)

        pressCtrlZ()

        expect(undoHandler).not.toHaveBeenCalled()
      })
    })
  })
})

function getWrapper({
  currentFolder,
  setup,
  result = [],
  undoAvailable = true,
  finishedWorkers
}: {
  currentFolder: FolderResource
  setup: (
    instance: ReturnType<typeof useFileActionsDeleteResources>,
    {
      space,
      router
    }: {
      space: SpaceResource
      router: ReturnType<typeof defaultComponentMocks>['$router']
    }
  ) => void
  result?: Resource[]
  undoAvailable?: boolean
  finishedWorkers?: (() => void)[]
}) {
  const mocks = {
    ...defaultComponentMocks(),
    space: mockDeep<SpaceResource>()
  }
  mocks.$clientService.webdav.deleteFile.mockResolvedValue(undefined)

  vi.mocked(useDeleteWorker).mockReturnValue({
    startWorker: vi.fn().mockImplementation((_, callback) => {
      // hold back the worker results to let the test decide in which order deletions finish
      if (finishedWorkers) {
        finishedWorkers.push(() => callback({ successful: result, failed: [] }))
        return
      }
      callback({ successful: result, failed: [] })
    })
  })

  vi.mocked(useGetMatchingSpace).mockImplementation(() =>
    useGetMatchingSpaceMock({
      getInternalSpace: () => mocks.space,
      getMatchingSpace: ({ storageId }) => mock<SpaceResource>({ id: storageId })
    })
  )

  vi.mocked(useFileActionsUndoDelete).mockReturnValue({
    actions: computed(() => [
      mock<Action>({ isVisible: () => undoAvailable, handler: undoHandler })
    ])
  })

  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsDeleteResources()
        setup(instance, { space: mocks.space, router: mocks.$router })
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { piniaOptions: { resourcesStore: { currentFolder } } }
      }
    )
  }
}
