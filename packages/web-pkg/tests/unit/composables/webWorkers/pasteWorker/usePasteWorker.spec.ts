import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { shallowRef } from 'vue'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  type WebWorker,
  type WebWorkersStore,
  usePasteWorker,
  useVaultStore,
  useWebWorkersStore
} from '../../../../../src/composables'
import {
  TransferType,
  type TransferData
} from '../../../../../src/helpers/resource/conflictHandling'
import type { ClientService, LoadingService } from '../../../../../src/services'

describe('usePasteWorker', () => {
  describe('method "startWorker"', () => {
    it('creates a worker instance and starts loading task', () => {
      getWrapper({
        setup: ({ startWorker }, { webWorkersStore, mocks }) => {
          startWorker([mock<TransferData>()], () => undefined)
          expect(vi.mocked(webWorkersStore.createWorker)).toHaveBeenCalled()
          expect((mocks.$loadingService as LoadingService).addTask).toHaveBeenCalledTimes(1)
        }
      })
    })

    it.each([true, false])('posts withCredentials %s to the worker', (guestContextReady) => {
      getWrapper({
        guestContextReady,
        setup: ({ startWorker }, { workerMock }) => {
          startWorker([mock<TransferData>()], () => undefined)
          const { data } = JSON.parse(vi.mocked(workerMock.post).mock.calls[0][0] as string)
          expect(data.withCredentials).toBe(guestContextReady)
        }
      })
    })
  })

  describe('vault engines', () => {
    function getTransferData({
      id = '1',
      name = 'docs',
      transferType = TransferType.MOVE,
      overwrite = false
    }: { id?: string; name?: string; transferType?: TransferType; overwrite?: boolean } = {}) {
      return mock<TransferData>({
        resource: mock<Resource>({ id, name, path: `/${name}` }),
        sourceSpace: mock<SpaceResource>({ id: 'space-1' }),
        targetSpace: mock<SpaceResource>({ id: 'space-1' }),
        targetFolder: mock<Resource>({ path: '/archive' }),
        path: `/archive/${name}`,
        overwrite,
        transferType
      })
    }

    function finishWorker(workerMock: WebWorker, successful: Partial<Resource>[]) {
      workerMock.worker.value.onmessage(
        new MessageEvent('message', { data: JSON.stringify({ successful, failed: [] }) })
      )
    }

    it('re-files the engines of a moved resource under its new path', () => {
      getWrapper({
        setup: ({ startWorker }, { workerMock }) => {
          startWorker([getTransferData()], () => undefined)
          finishWorker(workerMock, [{ id: '1', path: '/archive/docs' }])

          const { clearEnginesUnder, moveEngine } = useVaultStore()
          expect(clearEnginesUnder).toHaveBeenCalledWith('space-1', '/archive/docs')
          expect(moveEngine).toHaveBeenCalledWith('space-1', '/docs', '/archive/docs')
        }
      })
    })

    it('leaves the engines of copied resources untouched', () => {
      getWrapper({
        setup: ({ startWorker }, { workerMock }) => {
          startWorker([getTransferData({ transferType: TransferType.COPY })], () => undefined)
          finishWorker(workerMock, [{ path: '/archive/docs' }])

          const { clearEnginesUnder, moveEngine } = useVaultStore()
          expect(clearEnginesUnder).not.toHaveBeenCalled()
          expect(moveEngine).not.toHaveBeenCalled()
        }
      })
    })

    it('drops the engines of a target replaced by a copy', () => {
      getWrapper({
        setup: ({ startWorker }, { workerMock }) => {
          startWorker(
            [getTransferData({ transferType: TransferType.COPY, overwrite: true })],
            () => undefined
          )
          finishWorker(workerMock, [{ path: '/archive/docs' }])

          const { clearEnginesUnder, moveEngine } = useVaultStore()
          expect(clearEnginesUnder).toHaveBeenCalledWith('space-1', '/archive/docs')
          expect(moveEngine).not.toHaveBeenCalled()
        }
      })
    })

    it('leaves the engines of a target untouched if replacing it by a copy failed', () => {
      getWrapper({
        setup: ({ startWorker }, { workerMock }) => {
          startWorker(
            [getTransferData({ transferType: TransferType.COPY, overwrite: true })],
            () => undefined
          )
          finishWorker(workerMock, [])

          expect(useVaultStore().clearEnginesUnder).not.toHaveBeenCalled()
        }
      })
    })

    it('leaves the engines of failed moves untouched', () => {
      getWrapper({
        setup: ({ startWorker }, { workerMock }) => {
          startWorker(
            [
              getTransferData({ id: '1', name: 'failed' }),
              getTransferData({ id: '2', name: 'moved' })
            ],
            () => undefined
          )
          finishWorker(workerMock, [{ id: '2', path: '/archive/moved' }])

          const { clearEnginesUnder, moveEngine } = useVaultStore()
          expect(moveEngine).toHaveBeenCalledTimes(1)
          expect(moveEngine).toHaveBeenCalledWith('space-1', '/moved', '/archive/moved')
          expect(clearEnginesUnder).toHaveBeenCalledTimes(1)
          expect(clearEnginesUnder).toHaveBeenCalledWith('space-1', '/archive/moved')
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
    instance: ReturnType<typeof usePasteWorker>,
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
        const instance = usePasteWorker()

        const webWorkersStore = useWebWorkersStore()
        const workerMock = mock<WebWorker>({ worker: shallowRef({} as Worker) })
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
