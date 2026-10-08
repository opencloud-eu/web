import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import {
  type WebWorker,
  type WebWorkersStore,
  useDeleteWorker,
  useWebWorkersStore
} from '../../../../../src/composables'
import type { ClientService, LoadingService } from '../../../../../src/services'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'

describe('useDeleteWorker', () => {
  describe('method "startWorker"', () => {
    it('creates a worker instance and starts loading task', () => {
      getWrapper({
        setup: ({ startWorker }, { webWorkersStore, mocks }) => {
          startWorker(
            {
              topic: 'fileListDelete',
              space: mock<SpaceResource>(),
              resources: [mock<Resource>()]
            },
            () => undefined
          )
          expect(vi.mocked(webWorkersStore.createWorker)).toHaveBeenCalled()
          expect((mocks.$loadingService as LoadingService).addTask).toHaveBeenCalledTimes(1)
        }
      })
    })

    it.each([true, false])('posts withCredentials %s to the worker', (guestContextReady) => {
      getWrapper({
        guestContextReady,
        setup: ({ startWorker }, { workerMock }) => {
          startWorker(
            {
              topic: 'fileListDelete',
              space: mock<SpaceResource>(),
              resources: [mock<Resource>()]
            },
            () => undefined
          )
          const { data } = JSON.parse(vi.mocked(workerMock.post).mock.calls[0][0] as string)
          expect(data.withCredentials).toBe(guestContextReady)
        }
      })
    })
  })
})

function getWrapper({
  setup,
  guestContextReady = false
}: {
  guestContextReady?: boolean
  setup: (
    instance: ReturnType<typeof useDeleteWorker>,
    {
      webWorkersStore,
      workerMock
    }: { webWorkersStore: WebWorkersStore; workerMock: WebWorker; mocks: Record<string, unknown> }
  ) => void
}) {
  const mocks = { $loadingService: mock<LoadingService>(), $clientService: mock<ClientService>() }
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useDeleteWorker()

        const webWorkersStore = useWebWorkersStore()
        const workerMock = mock<WebWorker>()
        vi.mocked(webWorkersStore.createWorker).mockReturnValue(workerMock)

        setup(instance, { webWorkersStore, workerMock, mocks })
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { piniaOptions: { authState: { guestContextReady } } }
      }
    )
  }
}
