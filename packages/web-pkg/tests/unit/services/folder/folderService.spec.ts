import { mock } from 'vitest-mock-extended'
import { useTask } from 'vue-concurrency'
import { flushPromises } from '@vue/test-utils'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { SpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import {
  FolderLoaderFavorites,
  FolderLoaderSharedViaLink,
  FolderLoaderSharedWithMe,
  FolderLoaderSharedWithOthers,
  FolderLoaderSpace,
  FolderLoaderTrashbin,
  FolderService,
  type FolderLoader,
  type FolderLoaderTask
} from '../../../../src/services/folder'
import {
  useMessages,
  useResourcesStore,
  type AuthServiceInterface
} from '../../../../src/composables'

describe('FolderService', () => {
  describe('resources loading state', () => {
    it('is set while the load runs and reset after it succeeds', async () => {
      const { task, resourcesStore, pendingLoads } = getWrapper()

      task.perform()
      await flushPromises()
      expect(resourcesStore.resourcesLoading).toBe(true)

      pendingLoads[0].resolve()
      await flushPromises()
      expect(resourcesStore.resourcesLoading).toBe(false)
    })

    it('is reset after the load fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { task, resourcesStore, pendingLoads } = getWrapper()

      task.perform()
      await flushPromises()
      pendingLoads[0].reject(new Error('load failed'))
      await flushPromises()

      expect(resourcesStore.resourcesLoading).toBe(false)
    })

    it('cancels the inner load and resets the state when the task gets canceled', async () => {
      const { task, resourcesStore, innerTasks } = getWrapper()

      task.perform()
      await flushPromises()
      task.cancelAll()
      await flushPromises()

      expect(innerTasks[0].last.isCanceled).toBe(true)
      expect(resourcesStore.resourcesLoading).toBe(false)
    })

    it('stays set until a load started after a cancellation has finished', async () => {
      const { task, resourcesStore, pendingLoads } = getWrapper()

      task.perform()
      await flushPromises()
      task.cancelAll()
      task.perform()
      await flushPromises()
      expect(resourcesStore.resourcesLoading).toBe(true)

      pendingLoads[1].resolve()
      await flushPromises()
      expect(resourcesStore.resourcesLoading).toBe(false)
    })
  })

  describe('failed loads', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    it('shows an error message and flags the load as failed', async () => {
      const { task, resourcesStore, messagesStore, pendingLoads } = getWrapper()

      task.perform()
      await flushPromises()
      const error = Object.assign(new Error('Internal Server Error'), { statusCode: 500 })
      pendingLoads[0].reject(error)
      await flushPromises()

      expect(messagesStore.showErrorMessage).toHaveBeenCalledWith({
        title: 'Failed to load files',
        errors: [error]
      })
      expect(resourcesStore.resourcesLoadFailed).toBe(true)
    })

    it('resets the failed flag when the next load starts', async () => {
      const { task, resourcesStore, pendingLoads } = getWrapper()

      task.perform()
      await flushPromises()
      pendingLoads[0].reject(new Error('load failed'))
      await flushPromises()
      task.perform()
      await flushPromises()

      expect(resourcesStore.resourcesLoadFailed).toBe(false)
    })

    it('stays silent when the load gets canceled', async () => {
      const { task, resourcesStore, messagesStore, pendingLoads } = getWrapper()

      task.perform()
      await flushPromises()
      task.cancelAll()
      pendingLoads[0].reject(new DOMException('The operation was aborted.', 'AbortError'))
      await flushPromises()

      expect(messagesStore.showErrorMessage).not.toHaveBeenCalled()
      expect(resourcesStore.resourcesLoadFailed).toBe(false)
    })

    it('stays silent when an older load fails after a newer one succeeded', async () => {
      const { task, resourcesStore, messagesStore, pendingLoads } = getWrapper()

      task.perform()
      task.perform()
      await flushPromises()
      pendingLoads[1].resolve()
      await flushPromises()
      pendingLoads[0].reject(new Error('load failed'))
      await flushPromises()

      expect(messagesStore.showErrorMessage).not.toHaveBeenCalled()
      expect(resourcesStore.resourcesLoadFailed).toBe(false)
    })
  })

  describe('loaders', () => {
    const serverError = Object.assign(new Error('Internal Server Error'), { statusCode: 500 })
    const space = mock<SpaceResource>({ id: 'space-id', driveType: 'personal' })

    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    it.each([
      { loader: new FolderLoaderSpace(), request: listFiles },
      { loader: new FolderLoaderTrashbin(), request: listFiles },
      { loader: new FolderLoaderFavorites(), request: search },
      { loader: new FolderLoaderSharedWithMe(), request: listSharedWithMe },
      { loader: new FolderLoaderSharedWithOthers(), request: listSharedByMe },
      { loader: new FolderLoaderSharedViaLink(), request: listSharedByMe }
    ])(
      '$loader.constructor.name shows an error message instead of an empty list or "not found" when $request.name fails',
      async ({ loader, request }) => {
        const { task, resourcesStore, messagesStore, clientService } = getWrapperWithLoader(loader)
        request(clientService).mockRejectedValue(serverError)

        await task.perform(space, '/folder')

        expect(messagesStore.showErrorMessage).toHaveBeenCalledWith({
          title: 'Failed to load files',
          errors: [serverError]
        })
        expect(resourcesStore.resourcesLoadFailed).toBe(true)
        expect(resourcesStore.currentFolder).not.toBeNull()
      }
    )

    it('shows "not found" without an error message when the folder is missing', async () => {
      const { task, resourcesStore, messagesStore, clientService } = getWrapperWithLoader(
        new FolderLoaderSpace()
      )
      clientService.webdav.listFiles.mockRejectedValue(
        Object.assign(new Error('Not Found'), { statusCode: 404 })
      )

      await task.perform(space, '/missing')

      expect(resourcesStore.currentFolder).toBeNull()
      expect(resourcesStore.resourcesLoadFailed).toBe(false)
      expect(messagesStore.showErrorMessage).not.toHaveBeenCalled()
    })

    describe('failed authentication', () => {
      const davError = Object.assign(new Error('Unauthorized'), { statusCode: 401 })
      const graphError = Object.assign(new Error('Unauthorized'), { response: { status: 401 } })

      // the space loader handles a webdav 401 itself and shows the folder as not found
      it.each([
        {
          loader: new FolderLoaderSpace(),
          request: listFiles,
          kind: 'webdav',
          error: davError,
          loadFailed: false
        },
        {
          loader: new FolderLoaderSpace(),
          request: listFiles,
          kind: 'graph',
          error: graphError,
          loadFailed: true
        },
        {
          loader: new FolderLoaderFavorites(),
          request: search,
          kind: 'webdav',
          error: davError,
          loadFailed: true
        },
        {
          loader: new FolderLoaderSharedWithMe(),
          request: listSharedWithMe,
          kind: 'graph',
          error: graphError,
          loadFailed: true
        }
      ])(
        '$loader.constructor.name leaves a $kind 401 to the auth service once, without an error message',
        async ({ loader, request, error, loadFailed }) => {
          const { task, resourcesStore, messagesStore, clientService, authService } =
            getWrapperWithLoader(loader)
          request(clientService).mockRejectedValue(error)

          await task.perform(space, '/folder')

          expect(authService.handleAuthError).toHaveBeenCalledTimes(1)
          expect(authService.handleAuthError).toHaveBeenCalledWith(expect.anything(), error)
          expect(messagesStore.showErrorMessage).not.toHaveBeenCalled()
          expect(resourcesStore.resourcesLoadFailed).toBe(loadFailed)
        }
      )
    })
  })
})

type ClientServiceMock = ReturnType<typeof defaultComponentMocks>['$clientService']

function listFiles(clientService: ClientServiceMock) {
  return clientService.webdav.listFiles
}

function search(clientService: ClientServiceMock) {
  return clientService.webdav.search
}

function listSharedWithMe(clientService: ClientServiceMock) {
  return clientService.graphAuthenticated.driveItems.listSharedWithMe
}

function listSharedByMe(clientService: ClientServiceMock) {
  return clientService.graphAuthenticated.driveItems.listSharedByMe
}

function getWrapperWithLoader(loader: FolderLoader) {
  vi.spyOn(loader, 'isActive').mockReturnValue(true)
  const folderService = new FolderService()
  Reflect.set(folderService, 'loaders', [loader])
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocationNormalizedLoaded>({ query: {} })
  })
  const authService = mock<AuthServiceInterface>()

  let task!: FolderLoaderTask
  let resourcesStore!: ReturnType<typeof useResourcesStore>
  let messagesStore!: ReturnType<typeof useMessages>

  getComposableWrapper(
    () => {
      resourcesStore = useResourcesStore()
      messagesStore = useMessages()
      vi.spyOn(messagesStore, 'showErrorMessage')
      task = folderService.getTask()
    },
    {
      mocks,
      provide: { ...mocks, $authService: authService },
      pluginOptions: { piniaOptions: { stubActions: false } }
    }
  )

  return { task, resourcesStore, messagesStore, clientService: mocks.$clientService, authService }
}

function getWrapper() {
  const pendingLoads: { resolve: () => void; reject: (e: Error) => void }[] = []
  const innerTasks: FolderLoaderTask[] = []

  const loader = mock<FolderLoader>({
    isEnabled: () => true,
    isActive: () => true,
    getTask: () => {
      const innerTask = useTask(function* () {
        yield new Promise<void>((resolve, reject) => pendingLoads.push({ resolve, reject }))
      })
      innerTasks.push(innerTask)
      return innerTask
    }
  })

  const folderService = new FolderService()
  Reflect.set(folderService, 'loaders', [loader])
  const mocks = defaultComponentMocks()

  let task!: FolderLoaderTask
  let resourcesStore!: ReturnType<typeof useResourcesStore>
  let messagesStore!: ReturnType<typeof useMessages>

  getComposableWrapper(
    () => {
      resourcesStore = useResourcesStore()
      messagesStore = useMessages()
      vi.spyOn(messagesStore, 'showErrorMessage')
      task = folderService.getTask()
    },
    { mocks, provide: mocks, pluginOptions: { piniaOptions: { stubActions: false } } }
  )

  return { task, resourcesStore, messagesStore, pendingLoads, innerTasks }
}
