import { mock } from 'vitest-mock-extended'
import { useTask } from 'vue-concurrency'
import { flushPromises } from '@vue/test-utils'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
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

    it('shows an error message', async () => {
      const { task, messagesStore, pendingLoads } = getWrapper()

      task.perform()
      await flushPromises()
      const error = Object.assign(new Error('Internal Server Error'), { statusCode: 500 })
      pendingLoads[0].reject(error)
      await flushPromises()

      expect(messagesStore.showErrorMessage).toHaveBeenCalledWith({
        title: 'Failed to load files',
        errors: [error]
      })
    })

    it('stays silent when the load gets canceled', async () => {
      const { task, messagesStore, pendingLoads } = getWrapper()

      task.perform()
      await flushPromises()
      task.cancelAll()
      pendingLoads[0].reject(new DOMException('The operation was aborted.', 'AbortError'))
      await flushPromises()

      expect(messagesStore.showErrorMessage).not.toHaveBeenCalled()
    })
  })

  describe('overlapping loads', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    it('cancels the running load when a new one starts', async () => {
      const { task, resourcesStore, pendingLoads, innerTasks } = getWrapper()

      const olderLoad = task.perform()
      task.perform()
      await flushPromises()
      expect(olderLoad.isCanceled).toBe(true)
      expect(innerTasks[0].last.isCanceled).toBe(true)
      expect(resourcesStore.resourcesLoading).toBe(true)

      pendingLoads[1].resolve()
      await flushPromises()
      expect(resourcesStore.resourcesLoading).toBe(false)
    })

    it('keeps the data of the newer load when the older one finishes later', async () => {
      const { task, resourcesStore, pendingLoads } = getWrapper()
      const newerResource = mock<Resource>({ id: 'newer', name: 'newer' })

      task.perform()
      task.perform()
      await flushPromises()
      pendingLoads[1].resolve([newerResource])
      await flushPromises()
      pendingLoads[0].resolve([mock<Resource>({ id: 'older', name: 'older' })])
      await flushPromises()

      expect(resourcesStore.resources).toEqual([newerResource])
    })

    it.each([
      { status: 500, error: Object.assign(new Error('load failed'), { statusCode: 500 }) },
      { status: 401, error: Object.assign(new Error('Unauthorized'), { statusCode: 401 }) }
    ])(
      'stays silent when the older load fails with $status after the newer one finished',
      async ({ error }) => {
        const { task, messagesStore, authService, pendingLoads } = getWrapper()

        task.perform()
        task.perform()
        await flushPromises()
        pendingLoads[1].resolve()
        await flushPromises()
        pendingLoads[0].reject(error)
        await flushPromises()

        expect(messagesStore.showErrorMessage).not.toHaveBeenCalled()
        expect(authService.handleAuthError).not.toHaveBeenCalled()
      }
    )
  })

  describe('loaders', () => {
    const space = mock<SpaceResource>({ id: 'space-id', driveType: 'personal' })
    const davError = (statusCode: number) => Object.assign(new Error(), { statusCode })
    const graphError = (status: number) => Object.assign(new Error(), { response: { status } })

    const loaders = [
      { loader: new FolderLoaderSpace(), request: listFiles, getError: davError },
      { loader: new FolderLoaderTrashbin(), request: listFiles, getError: davError },
      { loader: new FolderLoaderFavorites(), request: search, getError: davError },
      { loader: new FolderLoaderSharedWithMe(), request: listSharedWithMe, getError: graphError },
      {
        loader: new FolderLoaderSharedWithOthers(),
        request: listSharedByMe,
        getError: graphError
      },
      { loader: new FolderLoaderSharedViaLink(), request: listSharedByMe, getError: graphError }
    ]

    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    it.each(loaders)(
      '$loader.constructor.name shows an error message when $request.name fails',
      async ({ loader, request, getError }) => {
        const { task, messagesStore, clientService } = getWrapper(loader)
        const error = getError(500)
        request(clientService).mockRejectedValue(error)

        await task.perform(space, '/folder')

        expect(messagesStore.showErrorMessage).toHaveBeenCalledWith({
          title: 'Failed to load files',
          errors: [error]
        })
      }
    )

    it.each(loaders)(
      '$loader.constructor.name shows no error message when $request.name returns 404',
      async ({ loader, request, getError }) => {
        const { task, messagesStore, clientService } = getWrapper(loader)
        request(clientService).mockRejectedValue(getError(404))

        await task.perform(space, '/folder')

        expect(messagesStore.showErrorMessage).not.toHaveBeenCalled()
      }
    )

    it.each(loaders)(
      '$loader.constructor.name leaves a 401 of $request.name to the auth service once',
      async ({ loader, request, getError }) => {
        const { task, messagesStore, clientService, authService } = getWrapper(loader)
        const error = getError(401)
        request(clientService).mockRejectedValue(error)

        await task.perform(space, '/folder')

        expect(authService.handleAuthError).toHaveBeenCalledTimes(1)
        expect(authService.handleAuthError).toHaveBeenCalledWith(expect.anything(), error)
        expect(messagesStore.showErrorMessage).not.toHaveBeenCalled()
      }
    )

    describe('FolderLoaderSpace', () => {
      it.each([
        { statusCode: 401, authErrors: 1, errorMessages: 0 },
        { statusCode: 404, authErrors: 0, errorMessages: 0 },
        { statusCode: 500, authErrors: 0, errorMessages: 1 }
      ])(
        'shows the folder as not found when listing it fails with $statusCode',
        async ({ statusCode, authErrors, errorMessages }) => {
          const { task, resourcesStore, messagesStore, clientService, authService } = getWrapper(
            new FolderLoaderSpace()
          )
          listFiles(clientService).mockRejectedValue(davError(statusCode))

          await task.perform(space, '/folder')

          expect(resourcesStore.currentFolder).toBeNull()
          expect(authService.handleAuthError).toHaveBeenCalledTimes(authErrors)
          expect(messagesStore.showErrorMessage).toHaveBeenCalledTimes(errorMessages)
        }
      )

      it('keeps loading until the auth error is handled', async () => {
        const { task, resourcesStore, clientService, authService } = getWrapper(
          new FolderLoaderSpace()
        )
        let finishAuthHandling: () => void
        authService.handleAuthError.mockReturnValue(
          new Promise<void>((resolve) => (finishAuthHandling = resolve))
        )
        listFiles(clientService).mockRejectedValue(davError(401))

        task.perform(space, '/folder')
        await flushPromises()
        expect(authService.handleAuthError).toHaveBeenCalled()
        expect(resourcesStore.resourcesLoading).toBe(true)

        finishAuthHandling()
        await flushPromises()
        expect(resourcesStore.resourcesLoading).toBe(false)
      })

      it('finishes the load without an error message when handling the auth error fails', async () => {
        const { task, resourcesStore, messagesStore, clientService, authService } = getWrapper(
          new FolderLoaderSpace()
        )
        authService.handleAuthError.mockRejectedValue(new Error('auth handling failed'))
        listFiles(clientService).mockRejectedValue(davError(401))

        await expect(task.perform(space, '/folder')).resolves.toBeUndefined()

        expect(messagesStore.showErrorMessage).not.toHaveBeenCalled()
        expect(resourcesStore.resourcesLoading).toBe(false)
      })

      it('ignores a 401 of a superseded load', async () => {
        const { task, messagesStore, clientService, authService } = getWrapper(
          new FolderLoaderSpace()
        )
        let rejectFirstLoad: (e: Error) => void
        listFiles(clientService)
          .mockReturnValueOnce(new Promise((_, reject) => (rejectFirstLoad = reject)))
          .mockReturnValueOnce(new Promise(() => undefined))

        task.perform(space, '/old')
        task.perform(space, '/new')
        await flushPromises()
        rejectFirstLoad(davError(401))
        await flushPromises()

        expect(authService.handleAuthError).not.toHaveBeenCalled()
        expect(messagesStore.showErrorMessage).not.toHaveBeenCalled()
      })
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

function getPendingLoader() {
  const pendingLoads: {
    resolve: (resources?: Resource[]) => void
    reject: (e: Error) => void
  }[] = []
  const innerTasks: FolderLoaderTask[] = []

  const loader = mock<FolderLoader>({
    isEnabled: () => true,
    isActive: () => true,
    getTask: ({ resourcesStore }) => {
      const innerTask = useTask(function* () {
        const resources: Resource[] = yield new Promise((resolve, reject) =>
          pendingLoads.push({ resolve, reject })
        )
        if (resources) {
          resourcesStore.initResourceList({ currentFolder: null, resources })
        }
      })
      innerTasks.push(innerTask)
      return innerTask
    }
  })

  return { loader, pendingLoads, innerTasks }
}

function getWrapper(loader?: FolderLoader) {
  const pendingLoader = getPendingLoader()
  const activeLoader = loader || pendingLoader.loader
  vi.spyOn(activeLoader, 'isActive').mockReturnValue(true)
  const folderService = new FolderService()
  Reflect.set(folderService, 'loaders', [activeLoader])
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

  return {
    task,
    resourcesStore,
    messagesStore,
    authService,
    clientService: mocks.$clientService,
    pendingLoads: pendingLoader.pendingLoads,
    innerTasks: pendingLoader.innerTasks
  }
}
