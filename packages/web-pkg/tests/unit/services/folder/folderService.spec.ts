import { mock } from 'vitest-mock-extended'
import { useTask } from 'vue-concurrency'
import { flushPromises } from '@vue/test-utils'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import {
  FolderService,
  type FolderLoader,
  type FolderLoaderTask
} from '../../../../src/services/folder'
import { useResourcesStore } from '../../../../src/composables'

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
})

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

  getComposableWrapper(
    () => {
      resourcesStore = useResourcesStore()
      task = folderService.getTask()
    },
    { mocks, provide: mocks, pluginOptions: { piniaOptions: { stubActions: false } } }
  )

  return { task, resourcesStore, pendingLoads, innerTasks }
}
